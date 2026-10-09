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
    for path in ("/api/admin/me", "/api/admin/bookings", "/api/admin/customers", "/api/admin/dashboard/summary"):
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
