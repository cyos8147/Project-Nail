"""ข้อ 5.7: ยอดรับจริงของคิวที่เสร็จแล้ว ใช้แทนราคาบริการในรายได้ทุกที่ ถ้าไม่กรอกใช้ราคาบริการเหมือนเดิม"""

from datetime import date
from unittest import mock

from conftest import book, open_date

TODAY_TH = date(2045, 5, 10)


def _complete(client, headers, booking_id, paid=None):
    client.patch(f"/api/admin/bookings/{booking_id}", headers=headers, json={"status": "completed"})
    return client.patch(f"/api/admin/bookings/{booking_id}/paid", headers=headers, json={"paid_amount": paid})


def _report(client, headers, day):
    with mock.patch("app.routers.admin_dashboard.today_th", lambda: TODAY_TH):
        return client.get("/api/admin/dashboard/report", headers=headers, params={"period": "custom", "date_from": day.isoformat(), "date_to": day.isoformat()}).json()


def test_paid_amount_replaces_price_in_revenue_and_reverts_when_cleared(client, services, owner_headers, phone):
    day = open_date(400)
    created = book(client, services["ทำสีเจล"], day, "10:00", phone).json()  # ราคา 350
    assert created["paid_amount"] is None

    done = _complete(client, owner_headers, created["id"], paid=300)
    assert done.status_code == 200 and done.json()["paid_amount"] == 300
    assert _report(client, owner_headers, day)["revenue"]["value"] == 300

    cleared = client.patch(f"/api/admin/bookings/{created['id']}/paid", headers=owner_headers, json={"paid_amount": None})
    assert cleared.json()["paid_amount"] is None
    assert _report(client, owner_headers, day)["revenue"]["value"] == 350


def test_only_completed_bookings_accept_an_actual_amount(client, services, owner_headers, phone):
    created = book(client, services["ตัดผม"], open_date(401), "10:00", phone).json()
    r = client.patch(f"/api/admin/bookings/{created['id']}/paid", headers=owner_headers, json={"paid_amount": 200})
    assert r.status_code == 400
    assert client.patch(f"/api/admin/bookings/{created['id']}/paid", json={"paid_amount": 200}).status_code in (401, 403)
    assert client.patch(f"/api/admin/bookings/nope/paid", headers=owner_headers, json={"paid_amount": 1}).status_code == 404


def test_negative_or_absurd_amounts_are_refused(client, services, owner_headers, phone):
    created = book(client, services["ตัดผม"], open_date(402), "10:00", phone).json()
    _complete(client, owner_headers, created["id"])
    for bad in (-1, 5_000_000):
        assert client.patch(f"/api/admin/bookings/{created['id']}/paid", headers=owner_headers, json={"paid_amount": bad}).status_code == 422


def test_customer_detail_and_export_show_the_actual_amount(client, services, owner_headers, phone):
    day = open_date(403)
    created = book(client, services["ทำสีเจล"], day, "11:00", phone).json()
    _complete(client, owner_headers, created["id"], paid=280)
    found = client.get("/api/admin/customers", headers=owner_headers, params={"q": phone}).json()
    customer_id = next(c["id"] for c in found if c["phone"] == phone)
    detail = client.get(f"/api/admin/customers/{customer_id}", headers=owner_headers)
    assert detail.status_code == 200
    assert any(b["paid_amount"] == 280 for b in detail.json()["bookings"])
    export = client.get("/api/admin/export/bookings.csv", headers=owner_headers)
    assert export.status_code == 200
    header = export.text.splitlines()[0]
    assert "ยอดรับจริง (บาท)" in header
    assert any(line.endswith(",280") or ",280," in line for line in export.text.splitlines() if created["booking_code"] in line)
