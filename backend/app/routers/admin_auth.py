from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import create_access_token, get_current_admin, verify_password

router = APIRouter(prefix="/admin", tags=["admin-auth"])


@router.post("/login", response_model=schemas.AdminLoginOut)
def login(payload: schemas.AdminLoginIn, db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.username == payload.username).first()
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    token = create_access_token(admin.id)
    return schemas.AdminLoginOut(access_token=token, full_name=admin.full_name, role=admin.role)


@router.get("/me")
def me(admin: models.AdminUser = Depends(get_current_admin)):
    return {"username": admin.username, "full_name": admin.full_name, "role": admin.role}
