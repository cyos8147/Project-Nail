"""เวลาไทยและช่วงเวลาที่จองได้: เซิร์ฟเวอร์จริง (Render) ใช้นาฬิกา UTC ช้ากว่าไทย 7 ชม. ระบบต้องไม่เปิดให้จองรอบที่ผ่านไปแล้ว"""

import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock

from conftest import book, closed_tuesday, open_date

BACKEND = str(Path(__file__).resolve().parent.parent)


def _slots(client, day, category="nail", duration=60):
    r = client.get("/api/availability", params={"date": day.isoformat(), "duration_minutes": duration, "category_id": category})
    assert r.status_code == 200
    return r.json()


def _free_times(client, day, **kw):
    return [s["time"] for s in _slots(client, day, **kw)["slots"] if s["available"]]


def test_thai_time_does_not_depend_on_server_timezone():
    code = f"import sys; sys.path.insert(0, {BACKEND!r}); from app.timeutil import now_th; print(now_th().isoformat())"
    seen = {}
    for tz in ("UTC", "Asia/Bangkok", "America/Los_Angeles"):
        out = subprocess.run([sys.executable, "-c", code], env=dict(os.environ, TZ=tz), capture_output=True, text=True, check=True)
        seen[tz] = datetime.fromisoformat(out.stdout.strip())
    assert max(seen.values()) - min(seen.values()) < timedelta(seconds=5)
    utc_now = datetime.now(tz=__import__("datetime").timezone.utc).replace(tzinfo=None)
    assert abs((seen["UTC"] - utc_now) - timedelta(hours=7)) < timedelta(seconds=10)


def test_slots_that_already_passed_today_are_not_offered(client):
    day = open_date(30)
    with mock.patch("app.availability.now_th", lambda: datetime(day.year, day.month, day.day, 14, 0)):
        assert _free_times(client, day) == ["15:00", "16:00", "17:00", "18:00"]
    with mock.patch("app.availability.now_th", lambda: datetime(day.year, day.month, day.day, 17, 30)):
        assert _free_times(client, day) == ["18:00"]


def test_every_slot_is_offered_before_opening_and_on_other_days(client):
    day = open_date(31)
    with mock.patch("app.availability.now_th", lambda: datetime(day.year, day.month, day.day, 9, 0)):
        assert len(_free_times(client, day)) == 9
    with mock.patch("app.availability.now_th", lambda: datetime(day.year, day.month, day.day, 17, 30)):
        assert len(_free_times(client, day + timedelta(days=1 if (day + timedelta(days=1)).weekday() != 1 else 2))) == 9


def test_booking_a_passed_slot_is_refused_but_a_future_one_works(client, services, phone):
    day = open_date(32)
    with mock.patch("app.availability.now_th", lambda: datetime(day.year, day.month, day.day, 14, 0)):
        assert book(client, services["ทำสีเจล"], day, "10:00", phone).status_code == 409
        assert book(client, services["ทำสีเจล"], day, "16:00", phone).status_code == 201


def test_closed_weekday_and_special_holiday(client, owner_headers):
    tuesday = closed_tuesday(40)
    assert _slots(client, tuesday)["is_open"] is False
    assert _slots(client, tuesday)["slots"] == []

    day = open_date(41)
    assert _slots(client, day)["is_open"] is True
    created = client.post("/api/admin/holidays", headers=owner_headers, json={"holiday_date": day.isoformat(), "note": "หยุดพิเศษ"})
    assert created.status_code == 201
    assert _slots(client, day)["is_open"] is False
    assert client.delete(f"/api/admin/holidays/{created.json()['id']}", headers=owner_headers).status_code == 204
    assert _slots(client, day)["is_open"] is True


def test_long_service_blocks_the_slots_it_overlaps(client, services, phone):
    day = open_date(42)
    long_service = services["ต่อเล็บ PVC / เจล"]  # 90 นาที
    assert book(client, long_service, day, "10:00", phone).status_code == 201
    free = _free_times(client, day, category="nail", duration=60)
    assert "10:00" not in free and "11:00" not in free  # 10:00-11:30 ทับสองรอบ
    assert "12:00" in free
