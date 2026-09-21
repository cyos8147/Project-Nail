from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..availability import compute_available_slots, is_shop_open
from ..database import get_db
from ..security import get_current_admin
from ..services import line_notify
from ..utils import generate_booking_code
from .bookings import MAX_BOOKING_ATTEMPTS, SLOT_TAKEN_MESSAGE, _get_or_create_customer

router = APIRouter(prefix="/admin/bookings", tags=["admin-bookings"])

VALID_STATUSES = {"pending", "confirmed", "completed", "cancelled", "no_show"}


@router.get("", response_model=list[schemas.BookingOut])
def list_bookings(
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    search: str | None = Query(None, description="ค้นหาจากชื่อ เบอร์โทร หรือรหัสคิว"),
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    q = db.query(models.Booking)
    if date_from:
        q = q.filter(models.Booking.booking_date >= date_from)
    if date_to:
        q = q.filter(models.Booking.booking_date <= date_to)
    if status:
        q = q.filter(models.Booking.status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                models.Booking.customer_name.ilike(like),
                models.Booking.customer_phone.ilike(like),
                models.Booking.booking_code.ilike(like),
            )
        )
    return q.order_by(models.Booking.created_at.desc()).all()


@router.post("", response_model=schemas.BookingOut, status_code=201)
def create_booking_by_admin(
    payload: schemas.AdminBookingCreate,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    """แอดมินจองคิวแทนลูกค้า (โทรจอง/walk-in) ใช้กลไกกันจองซ้อน/รหัสชนกันแบบเดียวกับที่ลูกค้าจองเอง
    ผ่านเว็บ (ดู routers/bookings.py create_booking) เพราะแอดมินก็อาจแย่งเวลาเดียวกันกับลูกค้าที่กำลัง
    จองผ่านเว็บพร้อมๆ กันได้เหมือนกัน"""
    service = db.get(models.Service, payload.service_id)
    if service is None or not service.active:
        raise HTTPException(404, "ไม่พบบริการนี้ในระบบ")
    if payload.status not in VALID_STATUSES:
        raise HTTPException(400, f"สถานะไม่ถูกต้อง ต้องเป็นหนึ่งใน {sorted(VALID_STATUSES)}")
    if not is_shop_open(db, payload.booking_date):
        raise HTTPException(400, "ร้านปิดในวันที่เลือก กรุณาเลือกวันอื่น")

    estimated_duration = service.duration_minutes

    for _attempt in range(MAX_BOOKING_ATTEMPTS):
        slots = compute_available_slots(db, payload.booking_date, estimated_duration)
        chosen = next((s for s in slots if s["time"] == payload.booking_time), None)
        if chosen is None or not chosen["available"]:
            raise HTTPException(409, SLOT_TAKEN_MESSAGE)

        customer = _get_or_create_customer(db, payload.customer_phone, payload.customer_name, payload.line_id)
        booking = models.Booking(
            booking_code=generate_booking_code(db, payload.booking_date),
            customer_id=customer.id,
            category_id=payload.category_id,
            service_id=service.id,
            service_name=service.name,
            price=service.price,
            estimated_duration_minutes=estimated_duration,
            booking_date=payload.booking_date,
            booking_time=payload.booking_time,
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
            line_id=payload.line_id,
            status=payload.status,
            admin_note=payload.admin_note,
        )
        db.add(booking)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue
        db.refresh(booking)
        break
    else:
        raise HTTPException(409, SLOT_TAKEN_MESSAGE)

    line_notify.notify_booking_created(booking, customer.line_user_id)
    return booking


@router.get("/{booking_id}", response_model=schemas.BookingOut)
def get_booking(
    booking_id: str, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    booking = db.get(models.Booking, booking_id)
    if booking is None:
        raise HTTPException(404, "ไม่พบข้อมูลการจอง")
    return booking


@router.patch("/{booking_id}", response_model=schemas.BookingOut)
def update_booking_status(
    booking_id: str,
    payload: schemas.BookingStatusUpdate,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    booking = db.get(models.Booking, booking_id)
    if booking is None:
        raise HTTPException(404, "ไม่พบข้อมูลการจอง")
    if payload.status not in VALID_STATUSES:
        raise HTTPException(400, f"สถานะไม่ถูกต้อง ต้องเป็นหนึ่งใน {sorted(VALID_STATUSES)}")

    booking.status = payload.status
    if payload.admin_note is not None:
        booking.admin_note = payload.admin_note
    db.commit()
    db.refresh(booking)

    customer = db.get(models.Customer, booking.customer_id)
    line_notify.notify_status_changed(booking, customer.line_user_id if customer else None)
    return booking


@router.delete("/{booking_id}", status_code=204)
def delete_booking(
    booking_id: str, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    booking = db.get(models.Booking, booking_id)
    if booking is None:
        raise HTTPException(404, "ไม่พบข้อมูลการจอง")

    # ลบ/ตัดการอ้างอิงถึงคิวนี้ก่อน ไม่งั้นจะติด foreign key constraint ตอนลบ
    # (รีวิวที่ผูกกับคิวนี้ลบไปด้วยเลย ส่วนประวัติ AI/ไลน์ที่เคยอ้างอิงคิวนี้ยังเก็บไว้ แค่ตัดการเชื่อมโยง)
    db.query(models.Review).filter(models.Review.booking_id == booking_id).delete()
    db.query(models.AiTryonHistory).filter(models.AiTryonHistory.booking_id == booking_id).update(
        {models.AiTryonHistory.booking_id: None}
    )
    db.query(models.LineNotifyLog).filter(models.LineNotifyLog.booking_id == booking_id).update(
        {models.LineNotifyLog.booking_id: None}
    )
    db.delete(booking)
    db.commit()
