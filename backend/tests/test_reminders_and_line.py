"""แจ้งเตือนคิวล่วงหน้า 1 วัน และ webhook ผูกบัญชี LINE"""

import base64
import hashlib
import hmac
import json
from datetime import timedelta
from unittest import mock

import pytest

from app import models, scheduler
from app.config import get_settings
from app.database import SessionLocal
from app.timeutil import today_th
from conftest import book, open_date


# ---------------------------------------------------------------- เตือนคิวพรุ่งนี้
def _link_line(phone, line_user_id):
    db = SessionLocal()
    try:
        db.query(models.Customer).filter(models.Customer.phone == phone).update({"line_user_id": line_user_id})
        db.commit()
    finally:
        db.close()


def test_only_confirmed_bookings_for_tomorrow_get_a_reminder_once(client, services, owner_headers, phone):
    target = open_date(100)  # วันนัดที่ร้านเปิด ให้ "วันนี้สมมติ" คือวันก่อนหน้า 1 วัน (พรุ่งนี้อาจตรงวันอังคารที่ร้านปิด)
    fake_today = target - timedelta(days=1)

    def make(service, day, who, status):
        created = book(client, services[service], day, "10:00", phone + who).json()
        client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": status})
        _link_line(phone + who, f"U{phone}{who}")
        return created["booking_code"]

    confirmed = make("ทำสีเจล", target, "1", "confirmed")            # นัดพรุ่งนี้ + ยืนยันแล้ว -> ต้องได้รับ
    unconfirmed = make("ตัดผม", target, "2", "pending")              # นัดพรุ่งนี้ แต่ยังรอยืนยัน -> ไม่เตือน
    other_day = make("ทำสีเจล", open_date(101), "3", "confirmed")    # นัดวันอื่น -> ไม่เตือน

    sent = []

    def record(booking, line_user_id, cutoff_hours=0):
        sent.append(booking.booking_code)
        return True

    with mock.patch.object(scheduler, "today_th", lambda: fake_today), mock.patch.object(scheduler.line_notify, "notify_appointment_reminder", record):
        first = scheduler.send_appointment_reminders()
        second = scheduler.send_appointment_reminders()

    assert confirmed in sent and unconfirmed not in sent and other_day not in sent
    assert first >= 1 and second == 0 and sent.count(confirmed) == 1  # เตือนรอบเดียว ไม่ส่งซ้ำ


def test_the_reminder_job_runs_at_18_00_thai_time():
    s = scheduler.start_scheduler()
    try:
        job = s.get_job("send_appointment_reminders")
        assert str(job.trigger.fields[5]) == "18" and str(job.trigger.fields[6]) == "0"  # hour, minute
        assert str(job.trigger.timezone) == "UTC+07:00"
    finally:
        s.shutdown(wait=False)


# ---------------------------------------------------------------- LINE webhook
SECRET = "line-test-secret"


def _signed(body: dict):
    raw = json.dumps(body).encode()
    sig = base64.b64encode(hmac.new(SECRET.encode(), raw, hashlib.sha256).digest()).decode()
    return raw, {"X-Line-Signature": sig, "Content-Type": "application/json"}


def _text_event(user_id, text):
    return {"destination": "Uxxxx", "events": [{
        "type": "message", "mode": "active", "timestamp": 1700000000000, "webhookEventId": "01TEST", "replyToken": "reply-token",
        "deliveryContext": {"isRedelivery": False}, "source": {"type": "user", "userId": user_id},
        "message": {"type": "text", "id": "1", "quoteToken": "q", "text": text}}]}


@pytest.fixture
def line_configured():
    settings = get_settings()
    with mock.patch.object(settings, "line_channel_secret", SECRET), mock.patch.object(settings, "line_channel_access_token", "token"), \
            mock.patch("linebot.v3.messaging.MessagingApi.reply_message") as reply:
        yield reply


def test_webhook_is_inert_until_line_is_configured(client):
    r = client.post("/api/line/webhook", content=b"{}", headers={"Content-Type": "application/json"})
    assert r.status_code == 200 and r.json()["status"] == "ignored"


def test_webhook_rejects_a_bad_signature(client, line_configured):
    raw, _ = _signed(_text_event("Ubad", "hi"))
    r = client.post("/api/line/webhook", content=raw, headers={"X-Line-Signature": "AAAA", "Content-Type": "application/json"})
    assert r.status_code == 400


def test_typing_the_booking_code_links_the_customer_but_a_phone_number_does_not(client, services, phone, line_configured):
    code = book(client, services["ทำสีเจล"], open_date(102), "10:00", phone, name="ผูกไลน์").json()["booking_code"]
    raw, headers = _signed(_text_event("Ulinked", phone))  # เบอร์โทรไม่ใช่ความลับ ห้ามใช้ผูกบัญชี
    assert client.post("/api/line/webhook", content=raw, headers=headers).status_code == 200
    db = SessionLocal()
    try:
        assert db.query(models.Customer).filter(models.Customer.phone == phone).one().line_user_id is None
        raw, headers = _signed(_text_event("Ulinked", code))
        assert client.post("/api/line/webhook", content=raw, headers=headers).status_code == 200
        db.expire_all()
        assert db.query(models.Customer).filter(models.Customer.phone == phone).one().line_user_id == "Ulinked"
    finally:
        db.close()
    assert line_configured.called  # ตอบกลับลูกค้าทุกครั้ง


def test_only_the_secret_phrase_links_a_shop_recipient(client, line_configured):
    settings = get_settings()
    db = SessionLocal()
    try:
        raw, headers = _signed(_text_event("Ustranger", "ขอแจ้งเตือนของร้านด้วย"))
        client.post("/api/line/webhook", content=raw, headers=headers)
        assert db.query(models.ShopLineRecipient).filter_by(line_user_id="Ustranger").first() is None
        raw, headers = _signed(_text_event("Uowner", settings.shop_owner_link_phrase))
        client.post("/api/line/webhook", content=raw, headers=headers)
        assert db.query(models.ShopLineRecipient).filter_by(line_user_id="Uowner").first() is not None
    finally:
        db.close()
