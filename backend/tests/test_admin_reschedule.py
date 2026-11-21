"""แอดมินเลื่อนวัน/เวลานัดให้ลูกค้า (ข้อ 2.7–2.8)"""

from conftest import book, closed_tuesday, open_date


def _reschedule(client, headers, booking_id, day, time):
    return client.patch(
        f"/api/admin/bookings/{booking_id}/reschedule",
        headers=headers,
        json={"booking_date": day.isoformat(), "booking_time": time},
    )


def test_admin_moves_a_booking_and_keeps_its_status(client, services, owner_headers, phone):
    day, new_day = open_date(120), open_date(121)
    created = book(client, services["ทำสีเจล"], day, "10:00", phone).json()
    client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": "confirmed"})

    r = _reschedule(client, owner_headers, created["id"], new_day, "15:00")
    assert r.status_code == 200
    body = r.json()
    assert (body["booking_date"], body["booking_time"], body["status"]) == (new_day.isoformat(), "15:00", "confirmed")
    assert "เลื่อนนัดโดยร้าน" in body["admin_note"] and f"{day.isoformat()} 10:00" in body["admin_note"]
    # เวลาเดิมว่างแล้ว คนอื่นจองได้
    assert book(client, services["ทำสีเจล"], day, "10:00", phone + "9").status_code == 201


def test_admin_cannot_move_into_a_full_slot_a_holiday_or_after_closing(client, services, owner_headers, phone):
    day = open_date(122)
    first = book(client, services["ตัดผม"], day, "10:00", phone).json()
    second = book(client, services["ตัดผม"], day, "13:00", phone + "1").json()
    assert _reschedule(client, owner_headers, second["id"], day, "10:00").status_code == 409
    assert _reschedule(client, owner_headers, second["id"], closed_tuesday(140), "10:00").status_code == 400
    assert _reschedule(client, owner_headers, second["id"], day, "23:00").status_code == 409
    # เลื่อนไปเวลาใกล้ ๆ ที่ทับกับตัวเองเดิมได้ (ไม่นับคิวเดิมของตัวเองเป็นคิวชน)
    assert _reschedule(client, owner_headers, first["id"], day, "11:00").status_code == 200


def test_finished_bookings_cannot_be_moved_and_admin_login_is_required(client, services, owner_headers, phone):
    day = open_date(123)
    created = book(client, services["ทำสีเจล"], day, "11:00", phone).json()
    client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": "completed"})
    assert _reschedule(client, owner_headers, created["id"], open_date(124), "11:00").status_code == 400
    assert _reschedule(client, {}, created["id"], open_date(125), "11:00").status_code in (401, 403)
    assert _reschedule(client, owner_headers, "no-such-id", open_date(126), "11:00").status_code == 404


def test_rescheduling_resets_the_reminder_so_the_new_date_gets_one(client, services, owner_headers, phone):
    from app.database import SessionLocal
    from app.models import Booking

    created = book(client, services["ทำสีเจล"], open_date(127), "10:00", phone).json()
    with SessionLocal() as db:
        db.get(Booking, created["id"]).reminder_sent = True
        db.commit()
    assert _reschedule(client, owner_headers, created["id"], open_date(128), "10:00").status_code == 200
    with SessionLocal() as db:
        assert db.get(Booking, created["id"]).reminder_sent is False
