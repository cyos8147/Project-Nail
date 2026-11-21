"""ข้อมูลร้านที่ลูกค้าเห็น: วันหยุดพิเศษที่ยังไม่ถึง และข้อมูลสีที่แนบมากับการจองจากหน้า AI"""

from datetime import date
from unittest import mock

from conftest import book, open_date

TODAY = date(2041, 6, 15)  # วันที่ตายตัว ปีที่ไม่มีเทสต์อื่นใช้


def _add_holiday(client, owner_headers, day, note):
    r = client.post("/api/admin/holidays", headers=owner_headers, json={"holiday_date": day, "note": note})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _public_holidays(client):
    with mock.patch("app.routers.meta.today_th", lambda: TODAY):
        r = client.get("/api/holidays")
    assert r.status_code == 200, r.text
    return r.json()


def test_public_holidays_show_only_upcoming_days_in_order_without_internal_ids(client, owner_headers):
    ids = [
        _add_holiday(client, owner_headers, "2041-06-10", "ผ่านมาแล้ว"),  # ก่อนวันนี้ ต้องไม่โผล่
        _add_holiday(client, owner_headers, "2041-12-31", "ปิดสิ้นปี"),
        _add_holiday(client, owner_headers, "2041-06-15", "วันนี้พอดี"),  # รวมวันนี้
        _add_holiday(client, owner_headers, "2041-07-04", "ลาพักร้อน"),
    ]
    try:
        rows = [r for r in _public_holidays(client) if r["holiday_date"].startswith("2041")]
        assert [(r["holiday_date"], r["note"]) for r in rows] == [
            ("2041-06-15", "วันนี้พอดี"),
            ("2041-07-04", "ลาพักร้อน"),
            ("2041-12-31", "ปิดสิ้นปี"),
        ]
        assert all(set(r) == {"holiday_date", "note"} for r in rows)  # ไม่เปิดเผย id
    finally:
        for hid in ids:
            client.delete(f"/api/admin/holidays/{hid}", headers=owner_headers)


def test_public_holidays_need_no_login_and_the_deleted_one_disappears(client, owner_headers):
    hid = _add_holiday(client, owner_headers, "2041-08-12", "วันแม่")
    assert any(r["holiday_date"] == "2041-08-12" for r in _public_holidays(client))
    assert client.delete(f"/api/admin/holidays/{hid}", headers=owner_headers).status_code == 204
    assert not any(r["holiday_date"] == "2041-08-12" for r in _public_holidays(client))


def test_booking_accepts_the_longest_colour_label_but_rejects_longer(client, services, phone):
    nail = services["ทำสีเจล"]
    too_long = book(client, nail, open_date(95), "10:00", phone, shade_name="ก" * 121)
    assert too_long.status_code == 422  # ไม่ใช่ 500 จากฐานข้อมูล PostgreSQL
    bad_id = book(client, nail, open_date(95), "10:00", phone, shade_id="a" * 65)
    assert bad_id.status_code == 422
    ok = book(client, nail, open_date(96), "10:00", phone, shade_id="ai-d23b4e", shade_name="แดงเชอร์รี่ · ครีมมี่ " + "ก" * 90)
    assert ok.status_code == 201, ok.text
    assert ok.json()["shade_name"].startswith("แดงเชอร์รี่")
