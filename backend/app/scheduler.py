"""งานตามกำหนดเวลา: ส่งแจ้งเตือน LINE เตือนลูกค้าก่อนถึงคิว 1 วัน

ทำไมทำแบบนี้: เซิร์ฟเวอร์นี้รันเป็น process เดียวตลอด (ไม่ได้ปิดๆ เปิดๆ ทุกครั้งที่มี request)
จึงใช้ APScheduler ตั้งงานให้รันเองทุกวันเวลา 18:00 (เวลาไทย) ได้เลยโดยไม่ต้องพึ่งบริการภายนอก
ข้อควรรู้: ถ้าใช้ Render free tier และเซิร์ฟเวอร์หลับไปพอดีช่วง 18:00 งานนี้จะไม่ทำงานในรอบนั้น
(แก้ได้ด้วยการตั้ง uptime pinger ให้เซิร์ฟเวอร์ไม่หลับ ดู docs/06_DEPLOYMENT.md)
"""

from __future__ import annotations

from datetime import date, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from . import models
from .database import SessionLocal
from .services import line_notify

THAILAND_TZ = timezone(timedelta(hours=7))
REMINDER_STATUSES = ("confirmed",)


def send_appointment_reminders() -> int:
    """หาคิวที่นัดพรุ่งนี้ (สถานะยืนยันแล้ว ยังไม่เคยส่งเตือน) แล้วส่ง LINE เตือน คืนค่าจำนวนที่ส่งสำเร็จ"""
    tomorrow = date.today() + timedelta(days=1)
    db = SessionLocal()
    sent_count = 0
    try:
        bookings = (
            db.query(models.Booking)
            .filter(
                models.Booking.booking_date == tomorrow,
                models.Booking.status.in_(REMINDER_STATUSES),
                models.Booking.reminder_sent.is_(False),
            )
            .all()
        )
        for booking in bookings:
            customer = db.get(models.Customer, booking.customer_id)
            line_user_id = customer.line_user_id if customer else None
            if line_notify.notify_appointment_reminder(booking, line_user_id):
                sent_count += 1
            # ทำเครื่องหมายว่าประมวลผลคิวนี้แล้วเสมอ ไม่ว่าจะส่งสำเร็จหรือไม่ (เช่น ลูกค้ายังไม่ผูก LINE)
            # ป้องกันไม่ให้ระบบพยายามส่งซ้ำคิวเดิมทุกวันจนกว่าจะถึงวันนัดจริง
            booking.reminder_sent = True
        db.commit()
    finally:
        db.close()
    return sent_count


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone=THAILAND_TZ)
    scheduler.add_job(
        send_appointment_reminders,
        trigger=CronTrigger(hour=18, minute=0, timezone=THAILAND_TZ),
        id="send_appointment_reminders",
        replace_existing=True,
    )
    scheduler.start()
    return scheduler
