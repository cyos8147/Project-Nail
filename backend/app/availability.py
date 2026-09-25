from datetime import date, datetime, time, timedelta

from sqlalchemy import and_, text
from sqlalchemy.orm import Session

from .models import Booking, ServiceCategory, ShopHoliday, ShopSettings

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
    db: Session,
    target_date: date,
    duration_minutes: int,
    category_id: str,
    exclude_booking_id: str | None = None,
) -> list[dict]:
    """คิวว่างนับแยกตามหมวดหมู่บริการ (ไม่รวมทั้งร้าน) เพราะแต่ละหมวดมีช่างคนละคนกัน
    (เช่น หมวดผม=แม่ 1 คน หมวดเล็บ=พี่สาว 1 คน) จองผมกับจองเล็บเวลาเดียวกันจึงไม่ชนกัน
    ความจุ (จองซ้อนกันได้กี่คิว/ช่วงเวลา) มาจาก service_categories.staff_count ของหมวดนั้นๆ"""
    settings = get_shop_settings(db)
    if not is_shop_open(db, target_date) or duration_minutes <= 0:
        return []

    category = db.get(ServiceCategory, category_id)
    capacity = category.staff_count if category else 0

    open_min = _time_to_minutes(settings.opening_time)
    close_min = _time_to_minutes(settings.closing_time)
    step = settings.slot_interval_minutes or 60

    existing_query = db.query(Booking).filter(
        and_(
            Booking.booking_date == target_date,
            Booking.category_id == category_id,
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
        is_past = is_today and t <= now_minutes
        overlapping = sum(
            1
            for busy_start, busy_end in busy_ranges
            if t < busy_end and (t + duration_minutes) > busy_start
        )
        available = not is_past and overlapping < capacity
        slots.append({"time": _minutes_to_time(t), "available": available})
        t += step

    return slots


def lock_slot(db: Session, category_id: str, target_date: date, target_time: str) -> None:
    """ล็อกช่วงเวลานี้ไว้ชั่วคราวระหว่างเช็ค+สร้าง/แก้ไขคิว กันแย่งกันจองพร้อมกันเป๊ะๆ แล้วนับ
    จำนวนคิวที่ทับกันผิด (ดู routers/bookings.py create_booking) ทำงานเฉพาะบน Postgres เท่านั้น
    (advisory lock ผูกกับ transaction ปัจจุบัน ปล่อยเองอัตโนมัติตอน commit/rollback) -- SQLite (dev)
    ข้ามไปเพราะไม่รองรับฟังก์ชันนี้ และไม่มีการยิงพร้อมกันจริงอยู่แล้วตอนรันเซิร์ฟเวอร์ dev คนเดียว"""
    if db.get_bind().dialect.name != "postgresql":
        return
    key = f"{category_id}|{target_date.isoformat()}|{target_time}"
    db.execute(text("select pg_advisory_xact_lock(hashtext(:key))"), {"key": key})
