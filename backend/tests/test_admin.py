"""แอดมิน: ล็อกอิน สิทธิ์ owner/staff จัดการคิว กรอง/เรียง ค่าใช้จ่าย และ dashboard"""

from datetime import date
from unittest import mock

import pytest

from conftest import OWNER, book, open_date


def _login(client, username, password):
    return client.post("/api/admin/login", json={"username": username, "password": password})


def _headers(client, username, password):
    return {"Authorization": f"Bearer {_login(client, username, password).json()['access_token']}"}


def test_login_succeeds_with_the_right_password_only(client):
    assert _login(client, OWNER["username"], "wrong").status_code == 401
    assert _login(client, "nobody", OWNER["password"]).status_code == 401
    ok = _login(client, **OWNER)
    assert ok.status_code == 200 and ok.json()["role"] == "owner"


def test_admin_endpoints_need_a_valid_token(client):
    for path in ("/api/admin/me", "/api/admin/bookings", "/api/admin/customers", "/api/admin/dashboard/summary", "/api/admin/dashboard/report"):
        assert client.get(path).status_code == 401
    assert client.get("/api/admin/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_five_wrong_passwords_then_the_sixth_attempt_is_blocked(client):
    codes = [_login(client, OWNER["username"], "wrong").status_code for _ in range(6)]
    assert codes == [401] * 5 + [429]


def test_staff_can_work_but_cannot_manage_accounts(client, owner_headers):
    created = client.post("/api/admin/users", headers=owner_headers, json={"username": "staff_a", "password": "staff-pass-123", "full_name": "พนักงาน", "role": "staff"})
    assert created.status_code == 201
    staff = _headers(client, "staff_a", "staff-pass-123")
    assert client.get("/api/admin/bookings", headers=staff).status_code == 200
    assert client.post("/api/admin/users", headers=staff, json={"username": "x", "password": "abcdefgh1", "role": "staff"}).status_code == 403
    assert client.get("/api/admin/users", headers=staff).status_code == 403
    assert client.delete(f"/api/admin/users/{created.json()['id']}", headers=owner_headers).status_code == 204


def test_the_last_owner_cannot_be_removed(client, owner_headers):
    me = client.get("/api/admin/me", headers=owner_headers).json()
    owner = next(u for u in client.get("/api/admin/users", headers=owner_headers).json() if u["username"] == me["username"])
    assert client.delete(f"/api/admin/users/{owner['id']}", headers=owner_headers).status_code in (400, 403)


def test_password_change_needs_the_current_password(client, owner_headers):
    client.post("/api/admin/users", headers=owner_headers, json={"username": "staff_b", "password": "old-pass-1234", "role": "staff"})
    staff = _headers(client, "staff_b", "old-pass-1234")
    assert client.put("/api/admin/password", headers=staff, json={"current_password": "nope", "new_password": "new-pass-1234"}).status_code in (400, 401, 403)
    assert client.put("/api/admin/password", headers=staff, json={"current_password": "old-pass-1234", "new_password": "new-pass-1234"}).status_code == 200
    assert _login(client, "staff_b", "old-pass-1234").status_code == 401
    assert _login(client, "staff_b", "new-pass-1234").status_code == 200


def test_admin_can_create_a_booking_for_a_phone_in_customer(client, services, owner_headers, phone):
    day = open_date(80)
    r = client.post("/api/admin/bookings", headers=owner_headers, json={
        "category_id": "nail", "service_id": services["ทำสีเจล"]["id"], "booking_date": day.isoformat(), "booking_time": "11:00",
        "customer_name": "ลูกค้าโทรจอง", "customer_phone": phone, "status": "confirmed"})
    assert r.status_code == 201 and r.json()["status"] == "confirmed"
    clash = client.post("/api/admin/bookings", headers=owner_headers, json={
        "category_id": "nail", "service_id": services["ทำสีเจล"]["id"], "booking_date": day.isoformat(), "booking_time": "11:00",
        "customer_name": "อีกคน", "customer_phone": phone + "1"})
    assert clash.status_code == 409


def test_list_filters_and_both_sort_orders(client, services, owner_headers, phone):
    day = open_date(81)
    for t, extra in (("15:00", "0"), ("10:00", "1"), ("12:00", "2")):  # จองสลับเวลา เพื่อดูว่าเรียงตามเวลานัดจริง
        assert book(client, services["ทำสีเจล"], day, t, phone + extra, name=f"คุณ{t}").status_code == 201
    mine = lambda rows: [b for b in rows if b["customer_phone"].startswith(phone)]  # noqa: E731
    by_time = client.get("/api/admin/bookings", headers=owner_headers, params={"date_from": day.isoformat(), "date_to": day.isoformat(), "sort": "appointment"}).json()
    assert [b["booking_time"] for b in mine(by_time)] == ["10:00", "12:00", "15:00"]
    newest_first = client.get("/api/admin/bookings", headers=owner_headers, params={"sort": "created", "search": phone}).json()
    assert [b["booking_time"] for b in newest_first] == ["12:00", "10:00", "15:00"]  # ลูกค้าที่กดจองล่าสุดก่อน
    assert len(client.get("/api/admin/bookings", headers=owner_headers, params={"search": "คุณ10:00"}).json()) >= 1
    assert client.get("/api/admin/bookings", headers=owner_headers, params={"status": "completed", "search": phone}).json() == []
    assert client.get("/api/admin/bookings", headers=owner_headers, params={"sort": "banana"}).status_code == 422


def test_status_note_and_delete(client, services, owner_headers, phone):
    booking = book(client, services["ทำสีเจล"], open_date(82), "10:00", phone).json()
    updated = client.patch(f"/api/admin/bookings/{booking['id']}", headers=owner_headers, json={"status": "confirmed", "admin_note": "ลูกค้าแพ้อะซิโตน"})
    assert updated.status_code == 200 and updated.json()["admin_note"] == "ลูกค้าแพ้อะซิโตน"
    assert client.patch(f"/api/admin/bookings/{booking['id']}", headers=owner_headers, json={"status": "not-a-status"}).status_code in (400, 422)
    assert client.delete(f"/api/admin/bookings/{booking['id']}", headers=owner_headers).status_code == 204
    assert client.get(f"/api/admin/bookings/{booking['id']}", headers=owner_headers).status_code == 404


def test_dashboard_counts_completed_revenue_and_expenses(client, services, owner_headers, phone):
    fixed_today = date(2031, 3, 15)  # วันที่ตายตัวกันผลเพี้ยนตามวันที่รันเทสต์
    booking = book(client, services["ทำสีเจล"], date(2031, 3, 14), "10:00", phone).json()
    client.patch(f"/api/admin/bookings/{booking['id']}", headers=owner_headers, json={"status": "completed"})
    expense = client.post("/api/admin/expenses", headers=owner_headers, json={"expense_date": "2031-03-10", "category": "วัสดุ", "amount": 120, "note": "ทดสอบ"})
    assert expense.status_code == 201
    with mock.patch("app.routers.admin_dashboard.today_th", lambda: fixed_today):
        summary = client.get("/api/admin/dashboard/summary", headers=owner_headers).json()
    assert summary["revenue_month"] == 350 and summary["revenue_today"] == 0
    assert summary["expenses_month"] == 120 and summary["net_profit_month"] == 230
    assert client.delete(f"/api/admin/expenses/{expense.json()['id']}", headers=owner_headers).status_code == 204


def test_customer_search_and_edit(client, services, owner_headers, phone):
    book(client, services["ทำสีเจล"], open_date(83), "10:00", phone, name="ค้นหาฉันสิ")
    found = client.get("/api/admin/customers", headers=owner_headers, params={"q": "ค้นหาฉันสิ"}).json()
    assert any(c["phone"] == phone for c in found)


# ---------------------------------------------------------------------------
# รายงานแดชบอร์ดแบบเลือกช่วงเวลา
# ---------------------------------------------------------------------------

REPORT_TODAY = date(2033, 3, 15)  # ปีที่ไม่มีเทสต์อื่นใช้ ตัวเลขจึงไม่ปนกัน


def _set_status(client, headers, booking, status):
    r = client.patch(f"/api/admin/bookings/{booking['id']}", headers=headers, json={"status": status})
    assert r.status_code == 200, r.text


def _report(client, headers, **params):
    with mock.patch("app.routers.admin_dashboard.today_th", lambda: REPORT_TODAY):
        return client.get("/api/admin/dashboard/report", headers=headers, params=params)


@pytest.fixture
def report_data(client, services, owner_headers, phone):
    """ข้อมูลตัวอย่างเดือนมี.ค.-ก.พ. 2033: ลูกค้า A กลับมาซ้ำ ลูกค้า B มาครั้งแรก มีคิวยกเลิก/ไม่มา/รอทำ และค่าใช้จ่ายสองหมวด"""
    phone_b = "09" + phone[2:]
    gel, extension = services["ทำสีเจล"], services["ต่อเล็บ PVC / เจล"]
    made = []
    prev = book(client, gel, date(2033, 2, 10), "10:00", phone, name="ลูกค้า A").json()
    _set_status(client, owner_headers, prev, "completed")
    a = book(client, gel, date(2033, 3, 10), "10:00", phone, name="ลูกค้า A").json()
    _set_status(client, owner_headers, a, "completed")
    b = book(client, extension, date(2033, 3, 12), "14:00", phone_b, name="ลูกค้า B").json()
    _set_status(client, owner_headers, b, "completed")
    cancelled = book(client, gel, date(2033, 3, 12), "10:00", phone_b, name="ลูกค้า B").json()
    _set_status(client, owner_headers, cancelled, "cancelled")
    no_show = book(client, gel, date(2033, 3, 14), "10:00", phone_b, name="ลูกค้า B").json()
    _set_status(client, owner_headers, no_show, "no_show")
    upcoming = book(client, gel, date(2033, 3, 16), "10:00", phone_b, name="ลูกค้า B").json()
    made += [prev, a, b, cancelled, no_show, upcoming]
    expenses = [
        client.post("/api/admin/expenses", headers=owner_headers, json={"expense_date": d, "category": cat, "amount": amt}).json()
        for d, cat, amt in (("2033-03-11", "วัสดุ", 100), ("2033-03-12", "ค่าเช่า", 200), ("2033-02-05", "วัสดุ", 50))
    ]
    yield
    for e in expenses:
        client.delete(f"/api/admin/expenses/{e['id']}", headers=owner_headers)
    for bk in made:
        client.delete(f"/api/admin/bookings/{bk['id']}", headers=owner_headers)


def test_report_month_compares_with_the_same_days_last_month(client, owner_headers, report_data):
    r = _report(client, owner_headers, period="month")
    assert r.status_code == 200, r.text
    rep = r.json()
    assert rep["window"]["start"] == "2033-03-01" and rep["window"]["end"] == "2033-03-15"
    assert rep["window"]["previous_start"] == "2033-02-01" and rep["window"]["previous_end"] == "2033-02-15"
    assert rep["revenue"] == {"value": 950, "previous": 350}
    assert rep["completed_bookings"] == {"value": 2, "previous": 1}
    assert rep["average_ticket"]["value"] == 475 and rep["average_ticket"]["previous"] == 350
    assert rep["expenses"] == {"value": 300, "previous": 50}
    assert rep["net_profit"] == {"value": 650, "previous": 300}


def test_report_status_rates_customers_and_pipeline(client, owner_headers, report_data):
    rep = _report(client, owner_headers, period="month").json()
    assert rep["status_counts"]["completed"] == 2 and rep["status_counts"]["cancelled"] == 1 and rep["status_counts"]["no_show"] == 1
    assert rep["cancel_rate"] == 0.25 and rep["no_show_rate"] == 0.25  # จาก 4 คิวที่ปิดสถานะแล้ว
    assert rep["customers_served"] == 2 and rep["returning_customers"] == 1  # A เคยมาก่อนเดือนนี้ B ใหม่
    assert rep["upcoming_count"] == 1 and rep["upcoming_value"] == 350  # คิว 16 มี.ค. ยังรอทำ (อยู่นอกช่วง แต่นับเป็นรายได้ที่กำลังจะเข้า)
    assert rep["today_pending_count"] == 0


def test_report_breakdowns_exclude_cancelled_from_demand(client, owner_headers, report_data):
    rep = _report(client, owner_headers, period="month").json()
    assert [(c["label"], c["revenue"], c["count"]) for c in rep["by_category"]] == [("ทำเล็บ", 950, 2)]
    assert [(s["label"], s["revenue"]) for s in rep["top_services"]] == [("ต่อเล็บ PVC / เจล", 600), ("ทำสีเจล", 350)]
    assert {(e["label"], e["revenue"]) for e in rep["expenses_by_category"]} == {("วัสดุ", 100), ("ค่าเช่า", 200)}
    weekday = {w["weekday"]: w for w in rep["by_weekday"]}
    assert weekday[3]["bookings"] == 1 and weekday[3]["revenue"] == 350  # พฤ. 10 มี.ค.
    assert weekday[5]["bookings"] == 1 and weekday[5]["revenue"] == 600  # ส. 12 มี.ค. (คิวที่ยกเลิกไม่นับ)
    assert weekday[0]["bookings"] == 1 and weekday[0]["revenue"] == 0  # จ. 14 มี.ค. ไม่มา = มีความต้องการแต่ไม่มีรายได้
    hours = {h["hour"]: h["bookings"] for h in rep["by_hour"]}
    assert hours == {10: 2, 14: 1}
    assert rep["trend_unit"] == "day" and len(rep["trend"]) == 15
    assert sum(t["revenue"] for t in rep["trend"]) == 950


def test_report_long_range_switches_to_monthly_trend(client, owner_headers, report_data):
    rep = _report(client, owner_headers, period="custom", date_from="2033-01-01", date_to="2033-12-31").json()
    assert rep["trend_unit"] == "month" and len(rep["trend"]) == 12
    by_month = {t["date"][:7]: t["revenue"] for t in rep["trend"]}
    assert by_month["2033-03"] == 950 and by_month["2033-02"] == 350 and by_month["2033-01"] == 0


def test_report_rejects_bad_ranges(client, owner_headers):
    assert _report(client, owner_headers, period="custom").status_code == 422  # ไม่ระบุวัน
    assert _report(client, owner_headers, period="custom", date_from="2033-03-10", date_to="2033-03-01").status_code == 422
    assert _report(client, owner_headers, period="custom", date_from="2030-01-01", date_to="2032-01-01").status_code == 422  # ยาวเกิน 366 วัน
    assert _report(client, owner_headers, period="forever").status_code == 422
    assert _report(client, owner_headers, period="7d").status_code == 200


def test_report_empty_period_has_no_division_errors(client, owner_headers):
    rep = _report(client, owner_headers, period="custom", date_from="2040-05-01", date_to="2040-05-07").json()
    assert rep["revenue"]["value"] == 0 and rep["average_ticket"]["value"] == 0
    assert rep["cancel_rate"] == 0 and rep["customers_served"] == 0 and rep["by_hour"] == []


def test_report_window_edges():
    from app.routers.admin_dashboard import resolve_window

    # 31 มี.ค. เทียบกับ ก.พ. ทั้งเดือน (ไม่ล้นไปเป็นมี.ค.)
    _, _, ps, pe, _ = resolve_window("month", date(2033, 3, 31), None, None)
    assert (ps, pe) == (date(2033, 2, 1), date(2033, 2, 28))
    # 29 ก.พ. ปีอธิกสุรทิน เทียบกับ 28 ก.พ. ปีก่อน
    _, _, ps, pe, _ = resolve_window("year", date(2032, 2, 29), None, None)
    assert (ps, pe) == (date(2031, 1, 1), date(2031, 2, 28))
    # 7 วัน เทียบกับ 7 วันก่อนหน้าติดกัน
    s, e, ps, pe, _ = resolve_window("7d", date(2033, 3, 15), None, None)
    assert (s, e, ps, pe) == (date(2033, 3, 9), date(2033, 3, 15), date(2033, 3, 2), date(2033, 3, 8))
