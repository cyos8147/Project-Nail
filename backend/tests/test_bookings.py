"""ขั้นตอนจองคิวของลูกค้า: จอง ตรวจสถานะ ประวัติ เลื่อน ยกเลิก และกันจองซ้อนตามจำนวนช่างของแต่ละหมวด"""

import re

from conftest import book, closed_tuesday, open_date


def test_create_booking_returns_a_code_and_starts_pending(client, services, phone):
    r = book(client, services["ทำสีเจล"], open_date(50), "10:00", phone, name="สมหญิง ใจดี")
    assert r.status_code == 201
    body = r.json()
    assert re.fullmatch(r"NG-\d{8}-\d{4}", body["booking_code"])
    assert body["status"] == "pending"
    assert body["customer_name"] == "สมหญิง ใจดี"
    assert body["price"] == 350


def test_codes_are_unique_for_the_same_day(client, services):
    day = open_date(51)
    codes = {book(client, services["ทำสีเจล"], day, t, f"0811{i:06d}").json()["booking_code"] for i, t in enumerate(["10:00", "11:00", "12:00"])}
    assert len(codes) == 3


def test_same_slot_twice_is_refused_when_the_category_has_one_stylist(client, services, phone):
    day = open_date(52)
    assert book(client, services["ตัดผม"], day, "10:00", phone).status_code == 201
    second = book(client, services["ตัดผม"], day, "10:00", phone + "1")
    assert second.status_code == 409
    assert "ถูกจอง" in second.json()["detail"]


def test_hair_and_nail_at_the_same_time_do_not_clash(client, services, phone):
    day = open_date(53)
    assert book(client, services["ตัดผม"], day, "10:00", phone).status_code == 201
    assert book(client, services["ทำสีเจล"], day, "10:00", phone + "1").status_code == 201


def test_more_stylists_allow_more_overlapping_bookings(client, services, owner_headers, phone):
    day = open_date(54)
    assert client.patch("/api/admin/service-categories/hair", headers=owner_headers, json={"staff_count": 2}).status_code == 200
    try:
        assert book(client, services["ตัดผม"], day, "13:00", phone).status_code == 201
        assert book(client, services["ตัดผม"], day, "13:00", phone + "1").status_code == 201
        assert book(client, services["ตัดผม"], day, "13:00", phone + "2").status_code == 409
    finally:
        client.patch("/api/admin/service-categories/hair", headers=owner_headers, json={"staff_count": 1})


def test_closed_day_is_refused(client, services, phone):
    r = book(client, services["ทำสีเจล"], closed_tuesday(55), "10:00", phone)
    assert r.status_code == 400


def test_unknown_service_and_missing_fields(client, services, phone):
    bad = client.post("/api/bookings", json={"category_id": "nail", "service_id": "00000000-0000-0000-0000-000000000000",
                                              "booking_date": open_date(56).isoformat(), "booking_time": "10:00",
                                              "customer_name": "x", "customer_phone": phone})
    assert bad.status_code == 404
    assert client.post("/api/bookings", json={"category_id": "nail"}).status_code == 422


def test_status_lookup_needs_code_and_matching_phone(client, services, phone):
    code = book(client, services["ทำสีเจล"], open_date(57), "10:00", phone).json()["booking_code"]
    ok = client.get("/api/bookings/status", params={"booking_code": code, "phone": phone})
    assert ok.status_code == 200 and ok.json()["booking_code"] == code
    assert client.get("/api/bookings/status", params={"booking_code": code, "phone": "0999999999"}).status_code == 404


def test_history_is_a_summary_until_the_booking_code_is_given(client, services, phone):
    code = book(client, services["ทำสีเจล"], open_date(58), "10:00", phone).json()["booking_code"]
    summary = client.get("/api/bookings/history", params={"phone": phone}).json()
    assert summary["bookings"] and "id" not in summary["bookings"][0] and "booking_time" not in summary["bookings"][0]
    full = client.get("/api/bookings/history", params={"phone": phone, "booking_code": code}).json()
    assert full["verified"] is True and full["bookings"][0]["booking_time"] == "10:00"
    wrong = client.get("/api/bookings/history", params={"phone": phone, "booking_code": "NG-20200101-0001"}).json()
    assert not wrong.get("verified")


def test_reschedule_moves_the_booking_back_to_pending(client, services, owner_headers, phone):
    day, new_day = open_date(59), open_date(60)
    created = book(client, services["ทำสีเจล"], day, "10:00", phone).json()
    client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": "confirmed"})
    r = client.patch(f"/api/bookings/{created['id']}/reschedule", json={"phone": phone, "booking_date": new_day.isoformat(), "booking_time": "14:00"})
    assert r.status_code == 200
    assert (r.json()["booking_date"], r.json()["booking_time"], r.json()["status"]) == (new_day.isoformat(), "14:00", "pending")


def test_reschedule_into_a_taken_slot_or_by_someone_else_is_refused(client, services, phone):
    day = open_date(61)
    first = book(client, services["ตัดผม"], day, "10:00", phone).json()
    second = book(client, services["ตัดผม"], day, "11:00", phone + "1").json()
    taken = client.patch(f"/api/bookings/{second['id']}/reschedule", json={"phone": phone + "1", "booking_date": day.isoformat(), "booking_time": "10:00"})
    assert taken.status_code == 409
    stranger = client.patch(f"/api/bookings/{first['id']}/reschedule", json={"phone": "0999999999", "booking_date": day.isoformat(), "booking_time": "15:00"})
    assert stranger.status_code == 404


def test_cancel_once_then_it_cannot_be_cancelled_again(client, services, phone):
    created = book(client, services["ทำสีเจล"], open_date(62), "10:00", phone).json()
    assert client.patch(f"/api/bookings/{created['id']}/cancel", params={"phone": "0999999999"}).status_code == 404
    first = client.patch(f"/api/bookings/{created['id']}/cancel", params={"phone": phone})
    assert first.status_code == 200 and first.json()["status"] == "cancelled"
    assert client.patch(f"/api/bookings/{created['id']}/cancel", params={"phone": phone}).status_code == 400


def test_a_cancelled_booking_frees_its_slot(client, services, phone):
    day = open_date(63)
    created = book(client, services["ตัดผม"], day, "10:00", phone).json()
    assert book(client, services["ตัดผม"], day, "10:00", phone + "1").status_code == 409
    client.patch(f"/api/bookings/{created['id']}/cancel", params={"phone": phone})
    assert book(client, services["ตัดผม"], day, "10:00", phone + "1").status_code == 201


def test_completed_booking_cannot_be_cancelled_by_the_customer(client, services, owner_headers, phone):
    created = book(client, services["ทำสีเจล"], open_date(64), "10:00", phone).json()
    client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": "completed"})
    assert client.patch(f"/api/bookings/{created['id']}/cancel", params={"phone": phone}).status_code == 400


def test_review_only_after_the_service_is_completed(client, services, owner_headers, phone):
    created = book(client, services["ทำสีเจล"], open_date(65), "10:00", phone).json()
    payload = {"booking_code": created["booking_code"], "customer_phone": phone, "rating": 5, "comment": "ดีมาก"}
    assert client.post("/api/reviews", json=payload).status_code == 400  # ยังไม่เสร็จสิ้น
    client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": "completed"})
    assert client.post("/api/reviews", json={**payload, "customer_phone": "0999999999"}).status_code == 404
    ok = client.post("/api/reviews", json=payload)
    assert ok.status_code == 201
    assert client.post("/api/reviews", json=payload).status_code == 400  # รีวิวซ้ำไม่ได้
    assert any(r["booking_id"] == created["id"] for r in client.get("/api/reviews").json())
