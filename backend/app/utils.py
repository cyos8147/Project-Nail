from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import Booking


def generate_booking_code(db: Session, booking_date: date) -> str:
    prefix = f"NG-{booking_date.strftime('%Y%m%d')}"
    count_today = (
        db.query(func.count(Booking.id))
        .filter(Booking.booking_code.like(f"{prefix}-%"))
        .scalar()
        or 0
    )
    return f"{prefix}-{count_today + 1:04d}"
