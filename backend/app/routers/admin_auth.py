from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..security import create_access_token, get_current_admin, hash_password, require_owner, verify_password

router = APIRouter(prefix="/admin", tags=["admin-auth"])


@router.post("/login", response_model=schemas.AdminLoginOut)
@limiter.limit("5/minute")
def login(request: Request, payload: schemas.AdminLoginIn, db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.username == payload.username).first()
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    token = create_access_token(admin.id)
    return schemas.AdminLoginOut(access_token=token, full_name=admin.full_name, role=admin.role)


@router.get("/me")
def me(admin: models.AdminUser = Depends(get_current_admin)):
    return {"username": admin.username, "full_name": admin.full_name, "role": admin.role}


@router.put("/password")
def change_password(
    payload: schemas.AdminChangePasswordIn,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(401, "รหัสผ่านเดิมไม่ถูกต้อง")
    admin.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"success": True}


@router.get("/users", response_model=list[schemas.AdminUserOut])
def list_admin_users(db: Session = Depends(get_db), admin: models.AdminUser = Depends(require_owner)):
    return db.query(models.AdminUser).order_by(models.AdminUser.created_at).all()


@router.post("/users", response_model=schemas.AdminUserOut, status_code=201)
def create_admin_user(
    payload: schemas.AdminUserCreate,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(require_owner),
):
    if payload.role not in ("owner", "staff"):
        raise HTTPException(400, "role ต้องเป็น owner หรือ staff เท่านั้น")
    exists = db.query(models.AdminUser).filter(models.AdminUser.username == payload.username).first()
    if exists:
        raise HTTPException(409, "มีชื่อผู้ใช้นี้อยู่แล้ว")
    user = models.AdminUser(
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_admin_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(require_owner),
):
    if user_id == admin.id:
        raise HTTPException(400, "ลบบัญชีตัวเองไม่ได้")
    user = db.get(models.AdminUser, user_id)
    if user is None:
        raise HTTPException(404, "ไม่พบผู้ใช้นี้")
    # ต้องมี owner เหลืออย่างน้อย 1 คนเสมอ ไม่งั้นจะไม่มีใครจัดการบัญชีแอดมินได้อีกเลย
    if user.role == "owner":
        remaining_owners = (
            db.query(models.AdminUser)
            .filter(models.AdminUser.role == "owner", models.AdminUser.id != user_id)
            .count()
        )
        if remaining_owners == 0:
            raise HTTPException(400, "ต้องมีเจ้าของร้าน (owner) เหลืออย่างน้อย 1 คนเสมอ")
    db.delete(user)
    db.commit()
