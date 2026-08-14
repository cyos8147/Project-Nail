from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..availability import get_shop_settings
from ..database import get_db
from ..security import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin-catalog"])


# --- Services -----------------------------------------------------------
@router.get("/services", response_model=list[schemas.ServiceOut])
def admin_list_services(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    return db.query(models.Service).order_by(models.Service.category_id, models.Service.sort_order).all()


@router.post("/services", response_model=schemas.ServiceOut, status_code=201)
def create_service(
    payload: schemas.ServiceIn, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    service = models.Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.put("/services/{service_id}", response_model=schemas.ServiceOut)
def update_service(
    service_id: str,
    payload: schemas.ServiceIn,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    service = db.get(models.Service, service_id)
    if service is None:
        raise HTTPException(404, "ไม่พบบริการนี้")
    for key, value in payload.model_dump().items():
        setattr(service, key, value)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/services/{service_id}", status_code=204)
def delete_service(
    service_id: str, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    service = db.get(models.Service, service_id)
    if service is None:
        raise HTTPException(404, "ไม่พบบริการนี้")
    service.active = False
    db.commit()


# --- Nail designs ---------------------------------------------------------
@router.get("/nail-designs", response_model=list[schemas.NailDesignOut])
def admin_list_designs(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    return db.query(models.NailDesign).order_by(models.NailDesign.popularity.desc()).all()


@router.post("/nail-designs", response_model=schemas.NailDesignOut, status_code=201)
def create_design(
    payload: schemas.NailDesignIn, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    design = models.NailDesign(**payload.model_dump())
    db.add(design)
    db.commit()
    db.refresh(design)
    return design


@router.put("/nail-designs/{design_id}", response_model=schemas.NailDesignOut)
def update_design(
    design_id: str,
    payload: schemas.NailDesignIn,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    design = db.get(models.NailDesign, design_id)
    if design is None:
        raise HTTPException(404, "ไม่พบลายเล็บนี้")
    for key, value in payload.model_dump().items():
        setattr(design, key, value)
    db.commit()
    db.refresh(design)
    return design


@router.delete("/nail-designs/{design_id}", status_code=204)
def delete_design(
    design_id: str, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    design = db.get(models.NailDesign, design_id)
    if design is None:
        raise HTTPException(404, "ไม่พบลายเล็บนี้")
    design.active = False
    db.commit()


# --- Shop settings + holidays --------------------------------------------
@router.put("/shop-settings", response_model=schemas.ShopSettingsOut)
def update_shop_settings(
    payload: schemas.ShopSettingsIn,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    settings = get_shop_settings(db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/holidays", response_model=list[schemas.HolidayOut])
def list_holidays(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    return db.query(models.ShopHoliday).order_by(models.ShopHoliday.holiday_date).all()


@router.post("/holidays", response_model=schemas.HolidayOut, status_code=201)
def add_holiday(
    payload: schemas.HolidayIn, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    holiday = models.ShopHoliday(**payload.model_dump())
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


@router.delete("/holidays/{holiday_id}", status_code=204)
def delete_holiday(
    holiday_id: str, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    holiday = db.get(models.ShopHoliday, holiday_id)
    if holiday is None:
        raise HTTPException(404, "ไม่พบวันหยุดนี้")
    db.delete(holiday)
    db.commit()
