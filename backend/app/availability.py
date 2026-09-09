from datetime import date, datetime, time, timedelta

from sqlalchemy import and_
from sqlalchemy.orm import Session

from .models import Booking, ShopHoliday, ShopSettings

ACTIVE_STATUSES = ("pending", "confirmed")


def _time_to_minutes(value) -> int:
    # Postgres (Supabase) ส่ง Time column กลับมาเป็น datetime.time ส่วน SQLite (dev)
    # มักได้เป็น string "HH:MM" ตรงๆ รองรับทั้งสองแบบ
    if isinstance(value, time):
        return value.hour * 60 + value.minute
    h, m = value.split(":")
    return int(h) * 60 + int(m)


def _minutes_to_time(total: int) -> str:
    return f"{total // 60:02d}:{total % 60:02d}"


def get_shop_settings(db: Session) -> ShopSettings:
    settings = db.get(ShopSettings, 1)
    if settings is None:
        settings = ShopSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def is_shop_open(db: Session, target_date: date) -> bool:
    settings = get_shop_settings(db)
    # python date.weekday(): 0=จันทร์..6=อาทิตย์ ส่วนฝั่ง frontend ใช้แบบ JS: 0=อาทิตย์..6=เสาร์
    js_weekday = (target_date.weekday() + 1) % 7
    if js_weekday in (settings.closed_weekdays or []):
        return False
    holiday = db.query(ShopHoliday).filter(ShopHoliday.holiday_date == target_date).first()
    return holiday is None


def compute_available_slots(
    db: Session, target_date: date, duration_minutes: int, exclude_booking_id: str | None = None
) -> list[dict]:
    settings = get_shop_settings(db)
    if not is_shop_open(db, target_date) or duration_minutes <= 0:
        return []

    open_min = _time_to_minutes(settings.opening_time)
    close_min = _time_to_minutes(settings.closing_time)
    step = settings.slot_interval_minutes or 60

    existing_query = db.query(Booking).filter(
        and_(
            Booking.booking_date == target_date,
            Booking.status.in_(ACTIVE_STATUSES),
        )
    )
    # ตอนแก้ไขวันเวลาการจองเดิม ต้องไม่นับคิวเดิมของตัวเองเป็นช่วงเวลาที่ถูกจองไปแล้ว
    # ไม่งั้นลูกค้าจะไม่เห็นแม้แต่เวลาเดิมของตัวเองเป็นตัวเลือกว่าง
    if exclude_booking_id:
        existing_query = existing_query.filter(Booking.id != exclude_booking_id)
    existing = existing_query.all()
    busy_ranges = []
    for b in existing:
        start = _time_to_minutes(b.booking_time)
        busy_ranges.append((start, start + (b.estimated_duration_minutes or 60)))

    now = datetime.now()
    is_today = target_date == now.date()
    now_minutes = now.hour * 60 + now.minute

    slots = []
    t = open_min
    while t + duration_minutes <= close_min:
        available = True
        if is_today and t <= now_minutes:
            available = False
        for busy_start, busy_end in busy_ranges:
            if t < busy_end and (t + duration_minutes) > busy_start:
                available = False
                break
        slots.append({"time": _minutes_to_time(t), "available": available})
        t += step

    return slots
