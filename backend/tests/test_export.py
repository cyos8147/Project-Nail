"""ส่งออก/สำรองข้อมูล: CSV เปิดใน Excel ได้, เฉพาะ owner, และกันสูตร Excel ที่ลูกค้าพิมพ์แทรกมา"""

import csv
import io
import zipfile

import pytest

from conftest import book, open_date

BOM = b"\xef\xbb\xbf"
TABLES = ["bookings", "customers", "expenses", "reviews", "services", "nail-designs"]


def _rows(response):
    return list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))


@pytest.mark.parametrize("name", TABLES)
def test_each_table_downloads_as_utf8_csv_with_a_header_row(client, owner_headers, name):
    r = client.get(f"/api/admin/export/{name}.csv", headers=owner_headers)
    assert r.status_code == 200
    assert r.content.startswith(BOM)  # ให้ Excel อ่านภาษาไทยถูก
    assert r.headers["content-type"].startswith("text/csv")
    assert f"luckysalon-{name}-" in r.headers["content-disposition"] and r.headers["content-disposition"].startswith("attachment")
    assert len(_rows(r)[0]) >= 4


def test_bookings_csv_has_thai_status_and_the_right_values(client, services, owner_headers, phone):
    day = open_date(90)
    created = book(client, services["ทำสีเจล"], day, "11:00", phone, name="สมศรี").json()
    client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": "confirmed"})
    rows = _rows(client.get("/api/admin/export/bookings.csv", headers=owner_headers))
    header, mine = rows[0], next(r for r in rows[1:] if r[0] == created["booking_code"])
    assert mine[header.index("สถานะ")] == "ยืนยันแล้ว"
    assert mine[header.index("ชื่อลูกค้า")] == "สมศรี" and mine[header.index("เบอร์โทร")] == phone
    assert mine[header.index("วันที่นัด")] == day.isoformat() and mine[header.index("ราคา (บาท)")] == "350"


def test_text_that_looks_like_a_spreadsheet_formula_is_defused(client, services, owner_headers, phone):
    book(client, services["ทำสีเจล"], open_date(91), "11:00", phone, name='=HYPERLINK("http://evil.example","คลิก")')
    rows = _rows(client.get("/api/admin/export/customers.csv", headers=owner_headers))
    cell = next(r[0] for r in rows[1:] if r[1] == phone)
    assert cell.startswith("'=")  # นำหน้าด้วย ' เพื่อไม่ให้ Excel รันเป็นสูตร


def test_admin_note_and_expense_text_are_defused_too(client, services, owner_headers, phone):
    created = book(client, services["ทำสีเจล"], open_date(92), "11:00", phone).json()
    client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": "confirmed", "admin_note": "@SUM(1+1)"})
    rows = _rows(client.get("/api/admin/export/bookings.csv", headers=owner_headers))
    note = next(r for r in rows[1:] if r[0] == created["booking_code"])[rows[0].index("หมายเหตุจากร้าน")]
    assert note == "'@SUM(1+1)"


def test_customers_csv_summarises_visits_and_spend(client, services, owner_headers, phone):
    first = book(client, services["ทำสีเจล"], open_date(93), "10:00", phone, name="ลูกค้าประจำ").json()
    book(client, services["เพ้นท์ลาย"], open_date(94), "10:00", phone, name="ลูกค้าประจำ")
    client.patch(f"/api/admin/bookings/{first['id']}", headers=owner_headers, json={"status": "completed"})
    rows = _rows(client.get("/api/admin/export/customers.csv", headers=owner_headers))
    h, mine = rows[0], next(r for r in rows[1:] if r[1] == phone)
    assert mine[h.index("จำนวนคิวทั้งหมด")] == "2" and mine[h.index("คิวที่เสร็จสิ้น")] == "1" and mine[h.index("ยอดรวมที่เสร็จสิ้น (บาท)")] == "350"


def test_zip_contains_every_table_and_an_explanation(client, owner_headers):
    r = client.get("/api/admin/export/all.zip", headers=owner_headers)
    assert r.status_code == 200 and r.headers["content-type"] == "application/zip"
    archive = zipfile.ZipFile(io.BytesIO(r.content))
    assert sorted(archive.namelist()) == sorted([f"{n}.csv" for n in TABLES] + ["README.txt"])
    readme = archive.read("README.txt").decode("utf-8-sig")
    assert "สำรองข้อมูล Lucky Salon" in readme and "ห้ามส่งต่อ" in readme
    assert archive.read("services.csv").startswith(BOM)


def test_export_is_for_the_owner_only(client, owner_headers):
    client.post("/api/admin/users", headers=owner_headers, json={"username": "staff_export", "password": "staff-pass-123", "role": "staff"})
    staff = {"Authorization": "Bearer " + client.post("/api/admin/login", json={"username": "staff_export", "password": "staff-pass-123"}).json()["access_token"]}
    assert client.get("/api/admin/export/customers.csv", headers=staff).status_code == 403
    assert client.get("/api/admin/export/all.zip", headers=staff).status_code == 403
    assert client.get("/api/admin/export/customers.csv").status_code == 401


def test_unknown_table_is_a_404(client, owner_headers):
    assert client.get("/api/admin/export/admin_users.csv", headers=owner_headers).status_code == 404
