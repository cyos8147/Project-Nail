import base64

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..availability import compute_available_slots, is_shop_open
from ..database import get_db
from ..services import line_notify
from ..storage import upload_bytes
from ..utils import generate_booking_code

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _get_or_create_customer(db: Session, phone: str, name: str, line_id: str) -> models.Customer:
    customer = db.query(models.Customer).filter(models.Customer.phone == phone).first()
    if customer is None:
        customer = models.Customer(phone=phone, name=name, line_id=line_id)
        db.add(customer)
        db.flush()
    else:
        customer.name = name or customer.name
        customer.line_id = line_id or customer.line_id
    return customer


@router.post("", response_model=schemas.BookingOut, status_code=201)
def create_booking(payload: schemas.BookingCreate, db: Session = Depends(get_db)):
    service = db.get(models.Service, payload.service_id)
    if service is None or not service.active:
        raise HTTPException(404, "ไม่พบบริการนี้ในระบบ")
    if not is_shop_open(db, payload.booking_date):
        raise HTTPException(400, "ร้านปิดในวันที่เลือก กรุณาเลือกวันอื่น")

    estimated_duration = service.duration_minutes + max(0, payload.ai_extra_minutes)
    slots = compute_available_slots(db, payload.booking_date, estimated_duration)
    chosen = next((s for s in slots if s["time"] == payload.booking_time), None)
    if chosen is None or not chosen["available"]:
        raise HTTPException(409, "ช่วงเวลานี้ถูกจองไปแล้วหรือไม่เปิดให้จอง กรุณาเลือกเวลาอื่น")

    reference_image_url = None
    if payload.reference_image_base64:
        raw = payload.reference_image_base64
        if "," in raw and raw.strip().startswith("data:"):
            raw = raw.split(",", 1)[1]
        reference_image_url = upload_bytes(
            base64.b64decode(raw), "reference.jpg", "booking-references", "image/jpeg"
        )

    customer = _get_or_create_customer(db, payload.customer_phone, payload.customer_name, payload.line_id)

    booking = models.Booking(
        booking_code=generate_booking_code(db, payload.booking_date),
        customer_id=customer.id,
        category_id=payload.category_id,
        service_id=service.id,
        service_name=service.name,
        price=service.price,
        shade_id=payload.shade_id,
        shade_name=payload.shade_name,
        nail_design_id=payload.nail_design_id,
        reference_image_url=reference_image_url,
        ai_style_tag=payload.ai_style_tag,
        ai_extra_minutes=max(0, payload.ai_extra_minutes),
        estimated_duration_minutes=estimated_duration,
        booking_date=payload.booking_date,
        booking_time=payload.booking_time,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        line_id=payload.line_id,
        status="pending",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    line_notify.notify_booking_created(booking, customer.line_user_id)
    return booking


@router.get("/status", response_model=schemas.BookingOut)
def check_status(booking_code: str, phone: str, db: Session = Depends(get_db)):
    booking = (
        db.query(models.Booking)
        .filter(models.Booking.booking_code == booking_code, models.Booking.customer_phone == phone)
        .first()
    )
    if booking is None:
        raise HTTPException(404, "ไม่พบข้อมูลการจอง กรุณาตรวจสอบรหัสคิวและเบอร์โทรอีกครั้ง")
    return booking


@router.get("/history", response_model=schemas.CustomerHistoryOut)
def customer_history(phone: str, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.phone == phone).first()
    if customer is None:
        return {"customer": {"phone": phone, "name": ""}, "bookings": [], "reviews": [], "tryon_history": []}

    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.customer_id == customer.id)
        .order_by(models.Booking.booking_date.desc(), models.Booking.booking_time.desc())
        .all()
    )
    reviews = db.query(models.Review).filter(models.Review.customer_id == customer.id).all()
    tryon = (
        db.query(models.AiTryonHistory)
        .filter(models.AiTryonHistory.customer_id == customer.id)
        .order_by(models.AiTryonHistory.created_at.desc())
        .all()
    )
    return {
        "customer": {"phone": customer.phone, "name": customer.name, "line_id": customer.line_id},
        "bookings": bookings,
        "reviews": reviews,
        "tryon_history": [
            {
                "id": t.id,
                "result_image_url": t.result_image_url,
                "color_hex": t.color_hex,
                "pattern": t.pattern,
                "nail_shape": t.nail_shape,
                "skin_tone": t.skin_tone,
                "created_at": t.created_at.isoformat(),
            }
            for t in tryon
        ],
    }


@router.patch("/{booking_id}/reschedule", response_model=schemas.BookingOut)
def reschedule_booking(booking_id: str, payload: schemas.BookingReschedule, db: Session = Depends(get_db)):
    booking = db.get(models.Booking, booking_id)
    if booking is None or booking.customer_phone != payload.phone:
        raise HTTPException(404, "ไม่พบข้อมูลการจอง")
    if booking.status not in ("pending", "confirmed"):
        raise HTTPException(400, "ไม่สามารถแก้ไขคิวนี้ได้แล้ว")
    if not is_shop_open(db, payload.booking_date):
        raise HTTPException(400, "ร้านปิดในวันที่เลือก กรุณาเลือกวันอื่น")

    slots = compute_available_slots(
        db, payload.booking_date, booking.estimated_duration_minutes, exclude_booking_id=booking_id
    )
    chosen = next((s for s in slots if s["time"] == payload.booking_time), None)
    if chosen is None or not chosen["available"]:
        raise HTTPException(409, "ช่วงเวลานี้ถูกจองไปแล้วหรือไม่เปิดให้จอง กรุณาเลือกเวลาอื่น")

    booking.booking_date = payload.booking_date
    booking.booking_time = payload.booking_time
    # ให้ทางร้านยืนยันเวลาที่แก้ไขใหม่อีกครั้งเสมอ แม้คิวเดิมจะเคย "ยืนยันแล้ว" ก็ตาม
    booking.status = "pending"
    db.commit()
    db.refresh(booking)
    customer = db.get(models.Customer, booking.customer_id)
    line_notify.notify_status_changed(booking, customer.line_user_id if customer else None)
    return booking


@router.patch("/{booking_id}/cancel", response_model=schemas.BookingOut)
def cancel_booking(booking_id: str, phone: str, db: Session = Depends(get_db)):
    booking = db.get(models.Booking, booking_id)
    if booking is None or booking.customer_phone != phone:
        raise HTTPException(404, "ไม่พบข้อมูลการจอง")
    if booking.status in ("completed", "cancelled"):
        raise HTTPException(400, "ไม่สามารถยกเลิกคิวนี้ได้แล้ว")
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    customer = db.get(models.Customer, booking.customer_id)
    line_notify.notify_status_changed(booking, customer.line_user_id if customer else None)
    return booking
