from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..availability import ACTIVE_STATUSES, _time_to_minutes, day_hours, get_shop_settings, get_weekly_hours
from ..database import get_db
from ..policy import get_cancel_cutoff_hours, shop_settings_out
from ..security import get_current_admin
from ..storage import CATALOG_PHOTO_MAX_SIDE, decode_and_validate_image, upload_photo
from ..timeutil import today_th

router = APIRouter(prefix="/admin", tags=["admin-catalog"])

# bucket เดียวใช้ร่วมกันสำหรับรูปบริการ + ลายเล็บ (ต้องสร้าง public bucket นี้ใน Supabase Storage ก่อนใช้งาน)
CATALOG_PHOTOS_BUCKET = "catalog-photos"


def _uploaded_image_url(image_base64: str | None) -> str | None:
    """ตรวจสอบ+อัปโหลดรูป ถ้ามีการส่ง image_base64 มา คืนค่า None ถ้าไม่ได้ส่งมา (ไม่แตะ image_url เดิม)"""
    if not image_base64:
        return None
    try:
        raw, _content_type = decode_and_validate_image(image_base64)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return upload_photo(raw, CATALOG_PHOTOS_BUCKET, CATALOG_PHOTO_MAX_SIDE)


# --- Services -----------------------------------------------------------
@router.get("/services", response_model=list[schemas.ServiceOut])
def admin_list_services(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    return db.query(models.Service).order_by(models.Service.category_id, models.Service.sort_order).all()


@router.post("/services", response_model=schemas.ServiceOut, status_code=201)
def create_service(
    payload: schemas.ServiceIn, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    data = payload.model_dump(exclude={"image_base64"})
    uploaded_url = _uploaded_image_url(payload.image_base64)
    if uploaded_url:
        data["image_url"] = uploaded_url
    service = models.Service(**data)
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
    data = payload.model_dump(exclude={"image_base64"})
    uploaded_url = _uploaded_image_url(payload.image_base64)
    if uploaded_url:
        data["image_url"] = uploaded_url
    for key, value in data.items():
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
    data = payload.model_dump(exclude={"image_base64"})
    uploaded_url = _uploaded_image_url(payload.image_base64)
    if uploaded_url:
        data["image_url"] = uploaded_url
    design = models.NailDesign(**data)
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
    data = payload.model_dump(exclude={"image_base64"})
    uploaded_url = _uploaded_image_url(payload.image_base64)
    if uploaded_url:
        data["image_url"] = uploaded_url
    for key, value in data.items():
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


# --- Service categories (จำนวนช่างต่อหมวดหมู่) ---------------------------
@router.patch("/service-categories/{category_id}", response_model=schemas.ServiceCategoryOut)
def update_category_staff_count(
    category_id: str,
    payload: schemas.ServiceCategoryStaffUpdate,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    category = db.get(models.ServiceCategory, category_id)
    if category is None:
        raise HTTPException(404, "ไม่พบหมวดหมู่นี้")
    category.staff_count = payload.staff_count
    db.commit()
    db.refresh(category)
    return category


# --- Shop settings + holidays --------------------------------------------
@router.put("/shop-settings", response_model=schemas.ShopSettingsOut)
def update_shop_settings(
    payload: schemas.ShopSettingsIn,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    settings = get_shop_settings(db)
    data = payload.model_dump(exclude_unset=True)

    # ตรวจก่อนบันทึก: เวลาปิดต้องหลังเวลาเปิด และต้องเปิดอย่างน้อย 1 วัน (ไม่งั้นลูกค้าจองไม่ได้เลยทั้งสัปดาห์)
    open_t = data.get("opening_time", settings.opening_time)
    close_t = data.get("closing_time", settings.closing_time)
    try:
        if _time_to_minutes(open_t) >= _time_to_minutes(close_t):
            raise HTTPException(422, "เวลาปิดต้องหลังเวลาเปิด")
    except (ValueError, AttributeError):
        raise HTTPException(422, "รูปแบบเวลาไม่ถูกต้อง ใช้ HH:MM")
    closed = data.get("closed_weekdays", settings.closed_weekdays or [])
    if any(d not in range(7) for d in closed):
        raise HTTPException(422, "วันหยุดประจำสัปดาห์ต้องเป็นเลข 0–6")
    if len(set(closed)) >= 7:
        raise HTTPException(422, "ต้องเปิดร้านอย่างน้อย 1 วันต่อสัปดาห์")
    if "weekly_hours" in data and data["weekly_hours"] is not None:
        weekly = {}
        for key, hours in data["weekly_hours"].items():
            if key not in {str(i) for i in range(7)}:
                raise HTTPException(422, "วันในตารางเวลาต้องเป็น 0–6")
            if _time_to_minutes(hours["open"]) >= _time_to_minutes(hours["close"]):
                raise HTTPException(422, "เวลาปิดของแต่ละวันต้องหลังเวลาเปิด")
            weekly[key] = {"open": hours["open"], "close": hours["close"]}
        data["weekly_hours"] = weekly

    for key, value in data.items():
        if key == "cancel_cutoff_hours" and value == get_cancel_cutoff_hours(db):
            continue  # หน้าตั้งค่าส่งทุกช่องมาเสมอ ไม่แตะคอลัมน์ใหม่ถ้าค่าไม่เปลี่ยน (ฐานข้อมูลที่ยังไม่มีคอลัมน์นี้จะยังบันทึกช่องอื่นได้)
        if key == "weekly_hours" and (value or {}) == get_weekly_hours(db, settings):
            continue  # เหตุผลเดียวกัน
        setattr(settings, key, value)
    try:
        db.commit()
    except (OperationalError, ProgrammingError):
        # คอลัมน์ที่เพิ่มใหม่ยังไม่มีในฐานข้อมูล (migrations.py เพิ่มให้ไม่สำเร็จ) -- ดู Render Logs หา "migration:"
        db.rollback()
        raise HTTPException(503, "บันทึกการตั้งค่านี้ไม่ได้ เพราะฐานข้อมูลยังไม่รองรับ (ดูวิธีแก้ใน Render Logs ที่ขึ้นต้นว่า migration)")
    db.refresh(settings)
    return shop_settings_out(db, settings)


@router.get("/schedule-conflicts", response_model=list[schemas.ScheduleConflict])
def schedule_conflicts(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    """คิวที่ยังรอทำ (ตั้งแต่วันนี้) แต่ตรงกับวันหยุด หรืออยู่นอกเวลาทำการตามการตั้งค่าปัจจุบัน
    ใช้เตือนแอดมินหลังเปลี่ยนเวลา/เพิ่มวันหยุด -- ระบบไม่ยกเลิกหรือย้ายคิวให้เอง เพราะต้องคุยกับลูกค้าก่อน"""
    settings = get_shop_settings(db)
    weekly = get_weekly_hours(db, settings)
    closed = set(settings.closed_weekdays or [])
    holidays = {h.holiday_date: h.note for h in db.query(models.ShopHoliday).filter(models.ShopHoliday.holiday_date >= today_th()).all()}
    rows = (
        db.query(models.Booking)
        .filter(models.Booking.status.in_(ACTIVE_STATUSES), models.Booking.booking_date >= today_th())
        .order_by(models.Booking.booking_date, models.Booking.booking_time)
        .all()
    )
    out = []
    for b in rows:
        reason = None
        if b.booking_date in holidays:
            reason = f"ตรงกับวันหยุดพิเศษ{(' (' + holidays[b.booking_date] + ')') if holidays[b.booking_date] else ''}"
        elif (b.booking_date.weekday() + 1) % 7 in closed:
            reason = "ตรงกับวันหยุดประจำสัปดาห์"
        else:
            open_min, close_min = day_hours(db, b.booking_date, settings, weekly)
            start = _time_to_minutes(b.booking_time)
            end = start + (b.estimated_duration_minutes or 60)
            if start < open_min or end > close_min:
                reason = "อยู่นอกเวลาทำการของวันนั้น"
        if reason:
            out.append(schemas.ScheduleConflict(
                id=b.id, booking_code=b.booking_code, customer_name=b.customer_name, customer_phone=b.customer_phone,
                service_name=b.service_name, booking_date=b.booking_date, booking_time=b.booking_time, reason=reason,
            ))
    return out


@router.get("/holidays", response_model=list[schemas.HolidayOut])
def list_holidays(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    return db.query(models.ShopHoliday).order_by(models.ShopHoliday.holiday_date).all()


DUPLICATE_HOLIDAY = "วันนี้เป็นวันหยุดพิเศษอยู่แล้ว"


@router.post("/holidays", response_model=schemas.HolidayOut, status_code=201)
def add_holiday(
    payload: schemas.HolidayIn, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    if db.query(models.ShopHoliday).filter(models.ShopHoliday.holiday_date == payload.holiday_date).first():
        raise HTTPException(409, DUPLICATE_HOLIDAY)
    holiday = models.ShopHoliday(**payload.model_dump())
    db.add(holiday)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, DUPLICATE_HOLIDAY)
    db.refresh(holiday)
    return holiday


@router.patch("/holidays/{holiday_id}", response_model=schemas.HolidayOut)
def update_holiday(
    holiday_id: str,
    payload: schemas.HolidayIn,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    """แก้วันที่/หมายเหตุของวันหยุดพิเศษ (ข้อ 4.6) -- เดิมต้องลบแล้วเพิ่มใหม่"""
    holiday = db.get(models.ShopHoliday, holiday_id)
    if holiday is None:
        raise HTTPException(404, "ไม่พบวันหยุดนี้")
    clash = db.query(models.ShopHoliday).filter(
        models.ShopHoliday.holiday_date == payload.holiday_date, models.ShopHoliday.id != holiday_id
    ).first()
    if clash:
        raise HTTPException(409, DUPLICATE_HOLIDAY)
    holiday.holiday_date = payload.holiday_date
    holiday.note = payload.note
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, DUPLICATE_HOLIDAY)
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
