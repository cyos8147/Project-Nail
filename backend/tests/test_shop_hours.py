"""ส่วนที่ 4: เวลาเปิด-ปิดแยกรายวัน (4.2), แก้ไขวันหยุดพิเศษ (4.6) และการเตือนคิวที่ชนกับวันหยุด/เวลาทำการใหม่"""

from datetime import date, timedelta

import pytest

from conftest import book, open_date


def _settings(client):
    return client.get("/api/shop-settings").json()


@pytest.fixture
def restore_settings(client, owner_headers):
    """เทสต์ในไฟล์นี้แก้การตั้งค่าร้าน -- คืนค่าเดิมทุกครั้ง ไม่ให้กระทบเทสต์อื่น"""
    before = _settings(client)
    yield
    client.put(
        "/api/admin/shop-settings",
        headers=owner_headers,
        json={k: before[k] for k in ("opening_time", "closing_time", "closed_weekdays", "weekly_hours")},
    )


def _put(client, headers, **data):
    return client.put("/api/admin/shop-settings", headers=headers, json=data)


def _next(weekday: int, offset_days: int) -> date:
    """วันแรกที่เป็น weekday (Python: 0=จันทร์) ตั้งแต่ offset_days วันข้างหน้า และไม่ซ้ำกับวันที่เทสต์อื่นใช้"""
    d = open_date(offset_days)
    while d.weekday() != weekday:
        d = open_date((d - date.today()).days + 1)
    return d


def _slots(client, day, minutes=60, category="hair"):
    r = client.get("/api/availability", params={"date": day.isoformat(), "duration_minutes": minutes, "category_id": category})
    return {s["time"]: s["available"] for s in r.json()["slots"]}


def test_each_weekday_can_have_its_own_hours(client, services, owner_headers, phone, restore_settings):
    r = _put(client, owner_headers, weekly_hours={"6": {"open": "08:00", "close": "12:00"}})  # เสาร์ (แบบ JS)
    assert r.status_code == 200 and r.json()["weekly_hours"] == {"6": {"open": "08:00", "close": "12:00"}}

    saturday, monday = _next(5, 200), _next(0, 200)
    sat = _slots(client, saturday)
    assert min(sat) == "08:00" and max(sat) == "11:00"  # 60 นาที ต้องเสร็จก่อน 12:00
    mon = _slots(client, monday)
    assert min(mon) == "10:00" and max(mon) == "18:00"  # วันที่ไม่ได้ตั้ง ใช้เวลาเริ่มต้นเดิม

    assert book(client, services["ตัดผม"], saturday, "13:00", phone).status_code == 409
    assert book(client, services["ตัดผม"], saturday, "08:00", phone).status_code == 201

    chain = client.get("/api/availability/chain", params={"date": saturday.isoformat(), "items": "hair:60,nail:60"}).json()
    assert max(s["time"] for s in chain["slots"]) == "10:00"  # ทั้งชุดต้องเสร็จก่อน 12:00


def test_clearing_weekly_hours_goes_back_to_one_time_for_every_day(client, owner_headers, restore_settings):
    _put(client, owner_headers, weekly_hours={"6": {"open": "08:00", "close": "12:00"}})
    assert _put(client, owner_headers, weekly_hours={}).json()["weekly_hours"] == {}
    assert min(_slots(client, _next(5, 210))) == "10:00"


@pytest.mark.parametrize(
    "data",
    [
        {"opening_time": "19:00", "closing_time": "10:00"},
        {"closed_weekdays": [0, 1, 2, 3, 4, 5, 6]},
        {"closed_weekdays": [9]},
        {"weekly_hours": {"1": {"open": "18:00", "close": "09:00"}}},
        {"weekly_hours": {"8": {"open": "09:00", "close": "18:00"}}},
        {"weekly_hours": {"1": {"open": "9am", "close": "18:00"}}},
    ],
)
def test_bad_hours_are_refused(client, owner_headers, restore_settings, data):
    before = _settings(client)
    assert _put(client, owner_headers, **data).status_code == 422
    after = _settings(client)
    assert {k: after[k] for k in ("opening_time", "closing_time", "closed_weekdays", "weekly_hours")} == {
        k: before[k] for k in ("opening_time", "closing_time", "closed_weekdays", "weekly_hours")
    }


def test_broken_stored_hours_fall_back_instead_of_crashing(client, restore_settings):
    from app.database import SessionLocal
    from app.models import ShopSettings

    with SessionLocal() as db:
        db.get(ShopSettings, 1).weekly_hours = {"6": {"open": "nonsense"}, "x": 5}
        db.commit()
    assert _settings(client)["weekly_hours"] == {}
    assert min(_slots(client, _next(5, 220))) == "10:00"


# ---------------------------------------------------------------- 4.6 วันหยุดพิเศษ

def _holiday(client, headers, day, note=""):
    return client.post("/api/admin/holidays", headers=headers, json={"holiday_date": day.isoformat(), "note": note})


def test_holiday_can_be_edited_and_duplicates_are_refused(client, owner_headers):
    a, b = date(2044, 1, 5), date(2044, 1, 6)
    first = _holiday(client, owner_headers, a, "ปิดซ่อมร้าน").json()
    _holiday(client, owner_headers, b, "สัมมนา")
    assert _holiday(client, owner_headers, a).status_code == 409  # ซ้ำ ไม่ใช่ 500

    moved = client.patch(f"/api/admin/holidays/{first['id']}", headers=owner_headers, json={"holiday_date": "2044-01-07", "note": "เลื่อนปิดซ่อม"})
    assert moved.status_code == 200 and (moved.json()["holiday_date"], moved.json()["note"]) == ("2044-01-07", "เลื่อนปิดซ่อม")
    clash = client.patch(f"/api/admin/holidays/{first['id']}", headers=owner_headers, json={"holiday_date": b.isoformat(), "note": ""})
    assert clash.status_code == 409
    assert client.patch("/api/admin/holidays/nope", headers=owner_headers, json={"holiday_date": "2044-02-01"}).status_code == 404
    assert client.patch(f"/api/admin/holidays/{first['id']}", json={"holiday_date": "2044-02-01"}).status_code in (401, 403)


def test_conflicts_list_bookings_hit_by_a_new_holiday_or_shorter_hours(client, services, owner_headers, phone, restore_settings):
    day = _next(3, 230)  # วันพฤหัส (JS 4)
    late = book(client, services["ตัดผม"], day, "17:00", phone).json()
    holiday_day = open_date(240)
    on_holiday = book(client, services["ทำสีเจล"], holiday_day, "10:00", phone + "1").json()

    assert all(c["id"] not in (late["id"], on_holiday["id"]) for c in client.get("/api/admin/schedule-conflicts", headers=owner_headers).json())

    _put(client, owner_headers, weekly_hours={"4": {"open": "10:00", "close": "16:00"}})
    h = _holiday(client, owner_headers, holiday_day, "งานบวช").json()
    try:
        conflicts = {c["id"]: c for c in client.get("/api/admin/schedule-conflicts", headers=owner_headers).json()}
        assert conflicts[late["id"]]["reason"] == "อยู่นอกเวลาทำการของวันนั้น"
        assert conflicts[on_holiday["id"]]["reason"] == "ตรงกับวันหยุดพิเศษ (งานบวช)"
        # ระบบเตือนเฉย ๆ ไม่ยกเลิกคิวให้เอง
        assert client.get("/api/bookings/status", params={"booking_code": late["booking_code"], "phone": phone}).json()["status"] == "pending"
    finally:
        client.delete(f"/api/admin/holidays/{h['id']}", headers=owner_headers)
