from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_admin
from ..services import line_notify

router = APIRouter(prefix="/admin/bookings", tags=["admin-bookings"])


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
    return q.order_by(models.Booking.booking_date.desc(), models.Booking.booking_time.desc()).all()


@router.get("/{booking_id}", response_model=schemas.BookingOut)
def get_booking(
    booking_id: str, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    booking = db.get(models.Booking, booking_id)
    if booking is None:
        raise HTTPException(404, "ไม่พบข้อมูลการจอง")
    return booking


VALID_STATUSES = {"pending", "confirmed", "completed", "cancelled", "no_show"}


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
