from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..availability import compute_available_slots, get_shop_settings
from ..database import get_db

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
    return get_shop_settings(db)


@router.get("/availability", response_model=schemas.AvailabilityOut)
def availability(
    target_date: date = Query(..., alias="date"),
    duration_minutes: int = Query(60, ge=15, le=480),
    exclude_booking_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    from ..availability import is_shop_open

    return {
        "date": target_date,
        "is_open": is_shop_open(db, target_date),
        "slots": compute_available_slots(db, target_date, duration_minutes, exclude_booking_id=exclude_booking_id),
    }
