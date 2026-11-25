"""ส่วนที่ 6: สำรองและกู้คืนข้อมูลแบบครบถ้วน (แทนที่ทั้งหมด พร้อมตรวจก่อน และย้อนกลับเมื่อพลาด)"""

import base64
import io
import json
import zipfile

from app import backup
from conftest import book, open_date


def _download(client, headers):
    r = client.get("/api/admin/backup/full.zip", headers=headers)
    assert r.status_code == 200, r.text
    assert "attachment" in r.headers["content-disposition"]
    return r.content


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def _payload(raw: bytes) -> dict:
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        return json.loads(z.read("backup.json"))


def _rebuild(raw: bytes, mutate) -> bytes:
    """แก้ไข backup.json แล้วสร้าง zip ใหม่ (ใช้ทดสอบไฟล์ที่ผิด)"""
    data = _payload(raw)
    mutate(data)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("backup.json", json.dumps(data, ensure_ascii=False))
    return buf.getvalue()


def _count_bookings(client, headers):
    return len(client.get("/api/admin/bookings", headers=headers, params={"sort": "created"}).json())


def test_full_backup_contains_every_main_table_with_original_ids(client, services, owner_headers, phone):
    created = book(client, services["ตัดผม"], open_date(300), "10:00", phone).json()
    raw = _download(client, owner_headers)
    data = _payload(raw)
    assert data["format"] == "luckysalon-full-backup" and data["version"] == 1
    assert set(data["tables"]) >= {"shop_settings", "services", "customers", "bookings", "reviews", "expenses"}
    assert data["counts"]["bookings"] == len(data["tables"]["bookings"]) >= 1
    assert created["id"] in {b["id"] for b in data["tables"]["bookings"]}  # รหัสเดิมถูกเก็บไว้
    assert "admin_users" not in data["tables"]  # บัญชีแอดมินไม่รวม


def test_preview_reports_counts_and_changes_nothing(client, services, owner_headers, phone):
    raw = _download(client, owner_headers)
    before = _count_bookings(client, owner_headers)
    r = client.post("/api/admin/backup/restore/preview", headers=owner_headers, json={"file_base64": _b64(raw)})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and body["problems"] == [] and body["counts"]["bookings"] >= 0
    assert _count_bookings(client, owner_headers) == before


def test_restore_puts_back_the_backed_up_state_and_drops_newer_bookings(client, services, owner_headers, phone):
    keep = book(client, services["ตัดผม"], open_date(301), "10:00", phone).json()
    raw = _download(client, owner_headers)
    later = book(client, services["ตัดผม"], open_date(302), "11:00", phone).json()  # เกิดหลังสำรอง
    assert later["id"]

    r = client.post(
        "/api/admin/backup/restore",
        headers=owner_headers,
        json={"file_base64": _b64(raw), "confirm": "กู้คืน"},
    )
    assert r.status_code == 200, r.text
    ids = {b["id"] for b in client.get("/api/admin/bookings", headers=owner_headers, params={"sort": "created"}).json()}
    assert keep["id"] in ids
    assert later["id"] not in ids  # คิวที่เพิ่งสร้างหลังสำรองหายไป ตามที่ตั้งใจ (กู้คืนทับทั้งหมด)
    # ระบบยังใช้งานได้ปกติหลังกู้คืน
    assert book(client, services["ตัดผม"], open_date(303), "12:00", phone + "5").status_code == 201


def test_restore_needs_the_confirm_word_and_an_owner(client, owner_headers, phone):
    raw = _download(client, owner_headers)
    no_confirm = client.post("/api/admin/backup/restore", headers=owner_headers, json={"file_base64": _b64(raw)})
    assert no_confirm.status_code == 400
    wrong = client.post("/api/admin/backup/restore", headers=owner_headers, json={"file_base64": _b64(raw), "confirm": "ok"})
    assert wrong.status_code == 400
    anonymous = client.post("/api/admin/backup/restore", json={"file_base64": _b64(raw), "confirm": "กู้คืน"})
    assert anonymous.status_code in (401, 403)


def test_bad_files_are_refused_with_a_clear_message(client, owner_headers):
    def post(raw, path="/api/admin/backup/restore/preview"):
        return client.post(path, headers=owner_headers, json={"file_base64": _b64(raw)})

    assert post(b"not base64 at all!!").status_code == 422
    assert "ไม่ใช่ไฟล์ .zip" in post(b"hello world").json()["detail"]

    csv_only = io.BytesIO()
    with zipfile.ZipFile(csv_only, "w") as z:
        z.writestr("bookings.csv", "a,b\n1,2\n")
    assert "กู้คืนไม่ได้" in post(csv_only.getvalue()).json()["detail"]

    raw = _download(client, owner_headers)
    wrong_format = _rebuild(raw, lambda d: d.update(format="something-else"))
    assert "ไม่ใช่ไฟล์สำรองของ Lucky Salon" in post(wrong_format).json()["detail"]
    future = _rebuild(raw, lambda d: d.update(version=99))
    assert "รุ่น 99" in post(future).json()["detail"]
    missing = _rebuild(raw, lambda d: d["tables"].pop("bookings"))
    assert "ไม่ครบตาราง" in post(missing).json()["detail"]


def test_broken_links_are_reported_and_never_applied(client, services, owner_headers, phone):
    book(client, services["ตัดผม"], open_date(304), "10:00", phone)
    raw = _download(client, owner_headers)

    def orphan(d):
        d["tables"]["bookings"][0]["customer_id"] = "ไม่มีลูกค้าคนนี้"

    bad = _rebuild(raw, orphan)
    preview = client.post("/api/admin/backup/restore/preview", headers=owner_headers, json={"file_base64": _b64(bad)}).json()
    assert preview["ok"] is False and any("อ้างอิงข้อมูลที่ไม่มีในไฟล์" in p for p in preview["problems"])

    before = _count_bookings(client, owner_headers)
    r = client.post("/api/admin/backup/restore", headers=owner_headers, json={"file_base64": _b64(bad), "confirm": "กู้คืน"})
    assert r.status_code == 422
    assert _count_bookings(client, owner_headers) == before


def test_a_failure_in_the_middle_rolls_everything_back(client, services, owner_headers, phone):
    """รหัสคิวซ้ำกันจะทำให้ฐานข้อมูลปฏิเสธตอนเขียน -- ต้องย้อนกลับทั้งหมด ข้อมูลเดิมยังอยู่ครบ"""
    book(client, services["ตัดผม"], open_date(305), "10:00", phone)
    raw = _download(client, owner_headers)
    dup = _rebuild(raw, lambda d: d["tables"]["bookings"].extend([dict(d["tables"]["bookings"][0], id="ซ้ำ-รหัสเดียวกัน")]))
    before_ids = {b["id"] for b in client.get("/api/admin/bookings", headers=owner_headers, params={"sort": "created"}).json()}
    r = client.post("/api/admin/backup/restore", headers=owner_headers, json={"file_base64": _b64(dup), "confirm": "กู้คืน"})
    assert r.status_code == 500 and "ข้อมูลเดิมยังอยู่ครบ" in r.json()["detail"]
    after_ids = {b["id"] for b in client.get("/api/admin/bookings", headers=owner_headers, params={"sort": "created"}).json()}
    assert after_ids == before_ids


def test_zip_builds_even_with_unusual_value_types():
    """ค่าที่ไม่ใช่ชนิดมาตรฐานต้องไม่ทำให้การสร้างไฟล์สำรองล้ม (เคยพบบน Render เป็น 500)"""
    from decimal import Decimal
    from datetime import datetime

    payload = {
        "format": "luckysalon-full-backup", "version": 1, "created_at": "x", "counts": {},
        "tables": {"t": [{"amount": Decimal("12.50"), "when": datetime(2030, 1, 2, 3, 4), "raw": b"ab", "tags": {"a", "b"}}]},
    }
    raw = backup.build_zip(payload)
    data = json.loads(zipfile.ZipFile(io.BytesIO(raw)).read("backup.json"))
    row = data["tables"]["t"][0]
    assert row["amount"] == "12.50" and row["when"].startswith("2030-01-02") and row["raw"] == "YWI="
    assert sorted(row["tags"]) == ["a", "b"]
