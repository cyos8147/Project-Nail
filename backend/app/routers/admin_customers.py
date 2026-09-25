from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_admin

router = APIRouter(prefix="/admin/customers", tags=["admin-customers"])


def _customer_out(customer: models.Customer) -> dict:
    return {
        "id": customer.id,
        "phone": customer.phone,
        "name": customer.name,
        "line_id": customer.line_id,
        "line_linked": bool(customer.line_user_id),
        "created_at": customer.created_at.isoformat(),
    }


@router.get("")
def search_customers(
    q: str | None = None,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    query = db.query(models.Customer)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(models.Customer.name.ilike(like), models.Customer.phone.ilike(like)))
    customers = query.order_by(models.Customer.updated_at.desc()).limit(100).all()

    result = []
    for c in customers:
        booking_count = db.query(models.Booking).filter(models.Booking.customer_id == c.id).count()
        result.append(
            {
                "id": c.id,
                "phone": c.phone,
                "name": c.name,
                "line_id": c.line_id,
                "line_linked": bool(c.line_user_id),
                "booking_count": booking_count,
                "created_at": c.created_at.isoformat(),
            }
        )
    return result


@router.get("/{customer_id}")
def customer_detail(
    customer_id: str, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(404, "ไม่พบข้อมูลลูกค้า")

    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.customer_id == customer.id)
        .order_by(models.Booking.booking_date.desc())
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
        "customer": _customer_out(customer),
        "bookings": [
            {
                "id": b.id,
                "booking_code": b.booking_code,
                "service_name": b.service_name,
                "price": float(b.price),
                "booking_date": b.booking_date.isoformat(),
                "booking_time": b.booking_time,
                "status": b.status,
                "reference_image_url": b.reference_image_url,
            }
            for b in bookings
        ],
        "reviews": [
            {"id": r.id, "rating": r.rating, "comment": r.comment, "photo_url": r.photo_url,
             "created_at": r.created_at.isoformat()}
            for r in reviews
        ],
        "tryon_history": [
            {
                "id": t.id,
                "result_image_url": t.result_image_url,
                "color_hex": t.color_hex,
                "pattern": t.pattern,
                "created_at": t.created_at.isoformat(),
            }
            for t in tryon
        ],
    }


@router.patch("/{customer_id}")
def update_customer(
    customer_id: str,
    payload: schemas.AdminCustomerUpdate,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    """แก้ไขชื่อ/เบอร์โทร/LINE ID ของลูกค้า (เช่น พิมพ์เบอร์ผิดตอนจอง) -- ไม่ย้อนแก้ชื่อ/เบอร์ที่บันทึก
    ไว้ในคิวเก่าที่เคยจองแล้ว (เป็น snapshot ณ ตอนจอง เหมือนราคา/ชื่อบริการ) แก้แค่ข้อมูลลูกค้าปัจจุบัน"""
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(404, "ไม่พบข้อมูลลูกค้า")

    if payload.phone and payload.phone != customer.phone:
        exists = (
            db.query(models.Customer)
            .filter(models.Customer.phone == payload.phone, models.Customer.id != customer_id)
            .first()
        )
        if exists:
            raise HTTPException(409, "เบอร์โทรนี้มีลูกค้าอื่นในระบบใช้อยู่แล้ว")
        customer.phone = payload.phone
    if payload.name is not None:
        customer.name = payload.name
    if payload.line_id is not None:
        customer.line_id = payload.line_id

    db.commit()
    db.refresh(customer)
    return _customer_out(customer)
