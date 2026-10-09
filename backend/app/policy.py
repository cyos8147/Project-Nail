"""นโยบายยกเลิก/เลื่อนคิวของร้าน: ลูกค้าแก้คิวผ่านเว็บได้ล่วงหน้าอย่างน้อยกี่ชั่วโมงก่อนเวลานัด (ตั้งในหน้าแอดมิน ตั้งค่าร้าน)

0 = ไม่จำกัด (ค่าเริ่มต้น เหมือนเดิมทุกอย่างจนกว่าเจ้าของร้านจะตั้งเอง) กฎนี้ใช้กับลูกค้าที่ยกเลิก/เลื่อนผ่านเว็บเท่านั้น
แอดมินยังจัดการคิวได้ตลอด (เช่นลูกค้าโทรมายกเลิกกะทันหัน)
"""

from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import schemas
from .availability import get_shop_settings
from .timeutil import now_th


def get_cancel_cutoff_hours(db: Session) -> int:
    """อ่านค่า cancel_cutoff_hours ถ้าคอลัมน์ยังไม่มีในฐานข้อมูล (migration ไม่สำเร็จ) ให้ถือว่าไม่จำกัด แทนที่จะทำให้เว็บพัง"""
    try:
        return max(0, int(get_shop_settings(db).cancel_cutoff_hours or 0))
    except Exception:
        db.rollback()
        return 0


def shop_settings_out(db: Session, settings) -> schemas.ShopSettingsOut:
    return schemas.ShopSettingsOut(
        shop_name=settings.shop_name,
        phone=settings.phone,
        address=settings.address,
        line_oa_basic_id=settings.line_oa_basic_id,
        opening_time=settings.opening_time,
        closing_time=settings.closing_time,
        slot_interval_minutes=settings.slot_interval_minutes,
        closed_weekdays=list(settings.closed_weekdays or []),
        cancel_cutoff_hours=get_cancel_cutoff_hours(db),
    )


def appointment_start(booking) -> datetime:
    hour, minute = str(booking.booking_time).split(":")[:2]
    return datetime(booking.booking_date.year, booking.booking_date.month, booking.booking_date.day, int(hour), int(minute))


def ensure_online_change_allowed(db: Session, booking) -> None:
    """โยน HTTP 400 ถ้าใกล้เวลานัดเกินกว่าที่ร้านกำหนดสำหรับการยกเลิก/เลื่อนผ่านเว็บ"""
    hours = get_cancel_cutoff_hours(db)
    if hours <= 0:
        return
    if appointment_start(booking) - now_th() >= timedelta(hours=hours):
        return
    phone = (get_shop_settings(db).phone or "").strip()
    contact = f" ที่เบอร์ {phone}" if phone else " ทาง LINE หรือโทรหาร้าน"
    raise HTTPException(
        400,
        f"ยกเลิกหรือเลื่อนคิวผ่านเว็บได้ล่วงหน้าอย่างน้อย {hours} ชั่วโมงก่อนเวลานัด "
        f"ตอนนี้เหลือเวลาน้อยกว่านั้นแล้ว กรุณาติดต่อร้านโดยตรง{contact}",
    )
