"""กราฟแบบ RRD ในแดชบอร์ด (ส่วนที่ 3): จำนวนช่องคงที่ เลื่อนย้อนหลัง วันปิดร้าน และค่าสรุป"""

from datetime import date
from unittest import mock

import pytest

from app import rrd

TODAY = date(2043, 3, 18)  # วันพุธ ปีที่ไม่มีเทสต์อื่นใช้


# ---------- ช่องเวลา (ฟังก์ชันล้วน) ----------

def test_daily_window_has_30_days_ending_today_and_offset_moves_a_whole_window():
    w = rrd.buckets("day", TODAY)
    assert len(w) == 30 and w[-1].start == TODAY and w[0].start == date(2043, 2, 17)
    older = rrd.buckets("day", TODAY, offset=1)
    assert older[-1].start == date(2043, 2, 16)  # ติดกับหน้าต่างล่าสุดพอดี ไม่ซ้ำไม่ข้าม


def test_weeks_start_on_monday():
    w = rrd.buckets("week", TODAY)
    assert len(w) == 12
    assert all(b.start.weekday() == 0 and (b.end - b.start).days == 6 for b in w)
    assert w[-1].start == date(2043, 3, 16) <= TODAY <= w[-1].end


def test_months_cross_the_year_boundary_and_years_count_back():
    w = rrd.buckets("month", TODAY)
    assert len(w) == 12
    assert (w[0].start, w[-1].start) == (date(2042, 4, 1), date(2043, 3, 1))
    assert w[-2].end == date(2043, 2, 28)
    assert rrd.buckets("month", TODAY, 1)[-1].start == date(2042, 3, 1)
    years = rrd.buckets("year", TODAY)
    assert [b.label for b in years] == ["2582", "2583", "2584", "2585", "2586"]


def test_summary_ignores_closed_buckets_like_rrdtool():
    s = rrd.summarize([100.0, 0.0, 300.0, 50.0], [True, False, True, True])
    assert (s["last"], s["max"], s["min"], s["average"]) == (50.0, 300.0, 50.0, 150.0)
    assert (s["max_index"], s["min_index"], s["last_index"]) == (2, 3, 3)
    assert rrd.summarize([0.0], [False])["max_index"] is None


# ---------- endpoint ----------

@pytest.fixture(scope="module")
def rrd_data(client, owner_headers):
    from app.database import SessionLocal
    from app.models import Booking, Customer

    with SessionLocal() as db:
        customer = Customer(phone="0890043000", name="ลูกค้า RRD")
        db.add(customer)
        db.flush()
        rows = [
            ("2043-03-18", 500, "completed"),
            ("2043-03-16", 300, "completed"),
            ("2043-03-16", 200, "completed"),
            ("2043-03-13", 999, "cancelled"),  # ยกเลิก ไม่นับ
            ("2043-02-20", 700, "completed"),
            ("2042-12-01", 1000, "completed"),
        ]
        for i, (d, price, status) in enumerate(rows):
            db.add(Booking(
                booking_code=f"RRD-{i}", customer_id=customer.id, category_id="nail", service_name="ทำสีเจล",
                price=price, estimated_duration_minutes=60, booking_date=date.fromisoformat(d), booking_time="10:00",
                customer_name="ลูกค้า RRD", customer_phone="0890043000", status=status,
            ))
        db.commit()
    client.post("/api/admin/holidays", headers=owner_headers, json={"holiday_date": "2043-03-12", "note": "หยุดพิเศษ"})
    with mock.patch("app.routers.admin_dashboard.today_th", lambda: TODAY):
        yield lambda **params: client.get("/api/admin/dashboard/rrd", headers=owner_headers, params=params)


def test_daily_values_closed_days_and_summary(rrd_data):
    body = rrd_data(resolution="day").json()
    by_day = {b["start"]: b for b in body["buckets"]}
    assert len(body["buckets"]) == 30
    assert (by_day["2043-03-16"]["revenue"], by_day["2043-03-16"]["bookings"]) == (500.0, 2)
    assert by_day["2043-03-13"]["revenue"] == 0.0  # คิวยกเลิกไม่นับ
    assert by_day["2043-03-17"]["closed"] is True  # วันอังคาร ร้านหยุดประจำ
    assert by_day["2043-03-12"]["closed"] is True  # วันหยุดพิเศษ
    assert by_day["2043-03-18"]["closed"] is False and by_day["2043-03-18"]["partial"] is False
    s = body["summary"]["revenue"]
    assert (s["last"], s["max"], s["min"]) == (500.0, 700.0, 0.0)
    assert body["buckets"][s["max_index"]]["start"] == "2043-02-20"


def test_weekly_and_monthly_totals_and_partial_current_bucket(rrd_data):
    weeks = rrd_data(resolution="week").json()["buckets"]
    assert weeks[-1]["start"] == "2043-03-16" and weeks[-1]["revenue"] == 1000.0 and weeks[-1]["partial"] is True
    months = {b["start"]: b for b in rrd_data(resolution="month").json()["buckets"]}
    assert months["2043-03-01"]["revenue"] == 1000.0
    assert months["2043-02-01"]["revenue"] == 700.0
    assert months["2042-12-01"]["revenue"] == 1000.0
    years = {b["label"]: b for b in rrd_data(resolution="year").json()["buckets"]}
    assert years["2586"]["revenue"] == 1700.0 and years["2585"]["revenue"] == 1000.0


def test_paging_back_and_bad_input(rrd_data, client):
    older = rrd_data(resolution="month", offset=1).json()
    assert older["end"] == "2042-03-31"
    assert rrd_data(resolution="day", offset=-1).status_code == 422
    assert rrd_data(resolution="hour").status_code == 422
    assert client.get("/api/admin/dashboard/rrd").status_code in (401, 403)
