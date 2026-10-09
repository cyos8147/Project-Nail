"""นโยบายยกเลิก/เลื่อนคิว: ลูกค้าแก้คิวผ่านเว็บได้ล่วงหน้าอย่างน้อย N ชั่วโมง (ตั้งในหน้าแอดมิน) และการเพิ่มคอลัมน์ใหม่ให้ฐานข้อมูลเดิมอัตโนมัติ"""

from datetime import datetime, timedelta
from unittest import mock

import pytest
from sqlalchemy import create_engine, inspect, text

from app import migrations
from app.services import line_notify
from conftest import book, open_date


@pytest.fixture
def cutoff(client, owner_headers):
    """ตั้ง cancel_cutoff_hours ชั่วคราว แล้วคืนค่าเดิม (0) หลังเทสต์"""
    def set_hours(hours):
        r = client.put("/api/admin/shop-settings", headers=owner_headers, json={"cancel_cutoff_hours": hours})
        assert r.status_code == 200, r.text
        return r.json()
    yield set_hours
    client.put("/api/admin/shop-settings", headers=owner_headers, json={"cancel_cutoff_hours": 0})


def _at(day, hour, minute=0):
    return datetime(day.year, day.month, day.day, hour, minute)


def test_default_is_no_limit_and_public_settings_expose_it(client, cutoff):
    assert client.get("/api/shop-settings").json()["cancel_cutoff_hours"] == 0
    assert cutoff(6)["cancel_cutoff_hours"] == 6
    assert client.get("/api/shop-settings").json()["cancel_cutoff_hours"] == 6


@pytest.mark.parametrize("bad", [-1, 169, 1000])
def test_out_of_range_values_are_rejected(client, owner_headers, bad):
    assert client.put("/api/admin/shop-settings", headers=owner_headers, json={"cancel_cutoff_hours": bad}).status_code == 422


def test_saving_other_settings_does_not_disturb_the_cutoff(client, owner_headers, cutoff):
    cutoff(3)
    current = client.get("/api/shop-settings").json()
    saved = client.put("/api/admin/shop-settings", headers=owner_headers, json=current)  # หน้าแอดมินส่งทุกช่องกลับมาเสมอ
    assert saved.status_code == 200 and saved.json()["cancel_cutoff_hours"] == 3


def test_cancel_is_refused_inside_the_window_and_allowed_outside(client, services, phone, cutoff):
    cutoff(6)
    day = open_date(70)
    near = book(client, services["ทำสีเจล"], day, "10:00", phone).json()
    far = book(client, services["ทำสีเจล"], day, "16:00", phone).json()
    # 07:00 -> นัด 10:00 อีก 3 ชม. (น้อยกว่า 6) ยกเลิกไม่ได้ / นัด 16:00 อีก 9 ชม. ยกเลิกได้
    with mock.patch("app.policy.now_th", lambda: _at(day, 7)):
        refused = client.patch(f"/api/bookings/{near['id']}/cancel", params={"phone": phone})
        assert refused.status_code == 400
        assert "6 ชั่วโมง" in refused.json()["detail"] and "ติดต่อร้าน" in refused.json()["detail"]
        assert client.patch(f"/api/bookings/{far['id']}/cancel", params={"phone": phone}).status_code == 200


def test_the_shop_phone_is_named_in_the_refusal(client, services, owner_headers, phone, cutoff):
    cutoff(6)
    client.put("/api/admin/shop-settings", headers=owner_headers, json={"phone": "081-234-5678"})
    try:
        day = open_date(71)
        near = book(client, services["ทำสีเจล"], day, "10:00", phone).json()
        with mock.patch("app.policy.now_th", lambda: _at(day, 9)):
            detail = client.patch(f"/api/bookings/{near['id']}/cancel", params={"phone": phone}).json()["detail"]
        assert "081-234-5678" in detail
    finally:
        client.put("/api/admin/shop-settings", headers=owner_headers, json={"phone": ""})


def test_reschedule_follows_the_same_rule(client, services, phone, cutoff):
    cutoff(24)
    day, later = open_date(72), open_date(75)
    booking = book(client, services["ทำสีเจล"], day, "10:00", phone).json()
    body = {"phone": phone, "booking_date": later.isoformat(), "booking_time": "11:00"}
    with mock.patch("app.policy.now_th", lambda: _at(day, 8)):
        assert client.patch(f"/api/bookings/{booking['id']}/reschedule", json=body).status_code == 400
    with mock.patch("app.policy.now_th", lambda: _at(day - timedelta(days=2), 8)):
        assert client.patch(f"/api/bookings/{booking['id']}/reschedule", json=body).status_code == 200


def test_an_appointment_that_already_started_cannot_be_cancelled_online(client, services, phone, cutoff):
    cutoff(1)
    day = open_date(73)
    booking = book(client, services["ทำสีเจล"], day, "10:00", phone).json()
    with mock.patch("app.policy.now_th", lambda: _at(day, 12)):
        assert client.patch(f"/api/bookings/{booking['id']}/cancel", params={"phone": phone}).status_code == 400


def test_no_limit_means_cancel_any_time(client, services, phone):
    day = open_date(74)
    booking = book(client, services["ทำสีเจล"], day, "10:00", phone).json()
    with mock.patch("app.policy.now_th", lambda: _at(day, 9, 59)):
        assert client.patch(f"/api/bookings/{booking['id']}/cancel", params={"phone": phone}).status_code == 200


def test_admin_is_not_bound_by_the_customer_window(client, services, owner_headers, phone, cutoff):
    cutoff(24)
    day = open_date(76)
    booking = book(client, services["ทำสีเจล"], day, "10:00", phone).json()
    with mock.patch("app.policy.now_th", lambda: _at(day, 9)):
        r = client.patch(f"/api/admin/bookings/{booking['id']}", headers=owner_headers, json={"status": "cancelled"})
    assert r.status_code == 200 and r.json()["status"] == "cancelled"


def test_line_texts_mention_the_window_only_when_one_is_set(client):
    class B:
        status, booking_code, service_name, booking_date, booking_time, price = "pending", "NG-20261010-0001", "ทำสีเจล", "2026-10-10", "10:00", 350

    assert "6 ชั่วโมง" in line_notify.build_booking_confirmation_text(B, 6)
    assert "ชั่วโมงก่อนเวลานัด" not in line_notify.build_booking_confirmation_text(B, 0)
    assert "6 ชั่วโมง" in line_notify.build_reminder_text(B, 6)
    assert "ล่วงหน้าที่หน้าเว็บ" in line_notify.build_reminder_text(B, 0)


# ---------------------------------------------------------------- การเพิ่มคอลัมน์ให้ฐานข้อมูลเดิมอัตโนมัติ
def _legacy_engine(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE shop_settings (id INTEGER PRIMARY KEY, shop_name TEXT)"))
        conn.execute(text("INSERT INTO shop_settings (id, shop_name) VALUES (1, 'Lucky Salon')"))
    return engine


def test_migration_adds_the_missing_column_and_keeps_existing_rows(tmp_path):
    engine = _legacy_engine(tmp_path)
    assert migrations.ensure_columns(engine) == ["shop_settings.cancel_cutoff_hours"]
    assert "cancel_cutoff_hours" in {c["name"] for c in inspect(engine).get_columns("shop_settings")}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT shop_name, cancel_cutoff_hours FROM shop_settings")).one() == ("Lucky Salon", 0)


def test_migration_is_idempotent_and_skips_missing_tables(tmp_path):
    engine = _legacy_engine(tmp_path)
    migrations.ensure_columns(engine)
    assert migrations.ensure_columns(engine) == []
    assert migrations.ensure_columns(create_engine(f"sqlite:///{tmp_path / 'empty.db'}")) == []


def test_a_failed_migration_does_not_crash_startup(tmp_path):
    engine = _legacy_engine(tmp_path)
    with mock.patch.object(migrations, "COLUMN_ADDITIONS", [("shop_settings", "x", "THIS IS NOT SQL")]):
        assert migrations.ensure_columns(engine) == []  # log แล้วไปต่อ ไม่โยน error
