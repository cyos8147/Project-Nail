from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..storage import decode_and_validate_image, upload_bytes

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=list[schemas.ReviewOut])
def list_reviews(limit: int = 20, db: Session = Depends(get_db)):
    reviews = (
        db.query(models.Review)
        .order_by(models.Review.created_at.desc())
        .limit(limit)
        .all()
    )
    out = []
    for r in reviews:
        booking = db.get(models.Booking, r.booking_id)
        out.append(
            schemas.ReviewOut(
                id=r.id,
                booking_id=r.booking_id,
                rating=r.rating,
                comment=r.comment,
                photo_url=r.photo_url,
                created_at=r.created_at,
                customer_name=booking.customer_name if booking else None,
                service_name=booking.service_name if booking else None,
            )
        )
    return out


@router.post("", response_model=schemas.ReviewOut, status_code=201)
@limiter.limit("10/minute")
def create_review(request: Request, payload: schemas.ReviewCreate, db: Session = Depends(get_db)):
    booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.booking_code == payload.booking_code,
            models.Booking.customer_phone == payload.customer_phone,
        )
        .first()
    )
    if booking is None:
        raise HTTPException(404, "ไม่พบข้อมูลการจอง กรุณาตรวจสอบรหัสคิวและเบอร์โทร")
    if booking.status != "completed":
        raise HTTPException(400, "รีวิวได้หลังจากบริการเสร็จสิ้นแล้วเท่านั้น")
    if booking.review is not None:
        raise HTTPException(400, "คิวนี้มีรีวิวแล้ว")

    photo_url = None
    if payload.photo_base64:
        try:
            raw, content_type = decode_and_validate_image(payload.photo_base64)
        except ValueError as e:
            raise HTTPException(400, str(e))
        photo_url = upload_bytes(raw, "review.jpg", "review-photos", content_type)

    review = models.Review(
        booking_id=booking.id,
        customer_id=booking.customer_id,
        rating=payload.rating,
        comment=payload.comment,
        photo_url=photo_url,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return schemas.ReviewOut(
        id=review.id,
        booking_id=review.booking_id,
        rating=review.rating,
        comment=review.comment,
        photo_url=review.photo_url,
        created_at=review.created_at,
        customer_name=booking.customer_name,
        service_name=booking.service_name,
    )
