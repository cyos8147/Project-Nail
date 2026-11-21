from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..availability import compute_available_slots, get_shop_settings
from ..database import get_db
from ..policy import shop_settings_out
from ..timeutil import today_th

router = APIRouter(tags=["meta"])


@router.get("/service-categories", response_model=list[schemas.ServiceCategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.ServiceCategory).order_by(models.ServiceCategory.sort_order).all()


@router.get("/services", response_model=list[schemas.ServiceOut])
def list_services(category_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Service).filter(models.Service.active == True)  # noqa: E712
    if category_id:
        q = q.filter(models.Service.category_id == category_id)
    return q.order_by(models.Service.sort_order).all()


@router.get("/nail-designs", response_model=list[schemas.NailDesignOut])
def list_nail_designs(style_tag: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.NailDesign).filter(models.NailDesign.active == True)  # noqa: E712
    if style_tag:
        q = q.filter(models.NailDesign.style_tag == style_tag)
    return q.order_by(models.NailDesign.popularity.desc()).all()


@router.get("/shop-settings", response_model=schemas.ShopSettingsOut)
def shop_settings(db: Session = Depends(get_db)):
    return shop_settings_out(db, get_shop_settings(db))


@router.get("/holidays", response_model=list[schemas.PublicHolidayOut])
def upcoming_holidays(db: Session = Depends(get_db)):
    """วันหยุดพิเศษที่ยังไม่ถึง (รวมวันนี้) สำหรับแสดงให้ลูกค้าเห็นล่วงหน้า วันที่ผ่านไปแล้วไม่ส่ง"""
    return (
        db.query(models.ShopHoliday)
        .filter(models.ShopHoliday.holiday_date >= today_th())
        .order_by(models.ShopHoliday.holiday_date)
        .limit(60)
        .all()
    )


@router.get("/availability", response_model=schemas.AvailabilityOut)
def availability(
    target_date: date = Query(..., alias="date"),
    duration_minutes: int = Query(60, ge=15, le=480),
    category_id: str = Query(...),
    exclude_booking_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    from ..availability import is_shop_open

    return {
        "date": target_date,
        "is_open": is_shop_open(db, target_date),
        "slots": compute_available_slots(
            db, target_date, duration_minutes, category_id, exclude_booking_id=exclude_booking_id
        ),
    }


@router.get("/availability/chain", response_model=schemas.AvailabilityOut)
def availability_chain(
    target_date: date = Query(..., alias="date"),
    items: str = Query(..., description="หมวด:นาที ตามลำดับที่ทำ คั่นด้วยจุลภาค เช่น hair:60,nail:45"),
    db: Session = Depends(get_db),
):
    """เวลาเริ่มที่ว่างสำหรับจองหลายบริการต่อกัน (ดู availability.compute_chain_slots)"""
    from fastapi import HTTPException

    from ..availability import MAX_CHAIN_ITEMS, compute_chain_slots, is_shop_open

    chain = []
    for part in items.split(","):
        category_id, _, minutes = part.partition(":")
        if not category_id or not minutes.isdigit() or not 15 <= int(minutes) <= 480:
            raise HTTPException(422, "รูปแบบ items ไม่ถูกต้อง")
        chain.append((category_id, int(minutes)))
    if not 1 <= len(chain) <= MAX_CHAIN_ITEMS:
        raise HTTPException(422, f"เลือกได้ 1–{MAX_CHAIN_ITEMS} บริการ")
    return {"date": target_date, "is_open": is_shop_open(db, target_date), "slots": compute_chain_slots(db, target_date, chain)}
