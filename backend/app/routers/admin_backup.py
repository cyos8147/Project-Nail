"""สำรองและกู้คืนข้อมูลแบบครบถ้วน (ดู app/backup.py) -- เฉพาะเจ้าของร้าน (owner)"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import backup, models
from ..database import get_db
from ..rate_limit import limiter
from ..security import require_owner
from ..timeutil import now_th

router = APIRouter(prefix="/admin/backup", tags=["admin-backup"])


class RestoreIn(BaseModel):
    file_base64: str
    confirm: str | None = None


@router.get("/full.zip")
@limiter.limit("10/minute")
def download_full_backup(request: Request, db: Session = Depends(get_db), owner: models.AdminUser = Depends(require_owner)):
    payload = backup.export_rows(db)
    return Response(
        content=backup.build_zip(payload),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="luckysalon-restorable-{now_th():%Y-%m-%d-%H%M}.zip"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/restore/preview")
@limiter.limit("20/minute")
def preview_restore(request: Request, payload: RestoreIn, owner: models.AdminUser = Depends(require_owner)):
    """ตรวจไฟล์สำรองโดยไม่แตะฐานข้อมูล ให้แอดมินเห็นจำนวนแถวและปัญหาก่อนตัดสินใจ"""
    try:
        data = backup.read_zip(payload.file_base64)
    except backup.BackupError as e:
        raise HTTPException(422, str(e))
    result = backup.validate(data)
    return {k: result[k] for k in ("ok", "counts", "problems", "created_at")}


@router.post("/restore")
@limiter.limit("3/minute")
def apply_restore(request: Request, payload: RestoreIn, db: Session = Depends(get_db), owner: models.AdminUser = Depends(require_owner)):
    """กู้คืนข้อมูลทับของเดิมทั้งหมด ต้องพิมพ์คำยืนยันให้ตรง และไฟล์ต้องผ่านการตรวจ"""
    if (payload.confirm or "").strip() != backup.CONFIRM_PHRASE:
        raise HTTPException(400, f"พิมพ์คำว่า '{backup.CONFIRM_PHRASE}' ให้ตรงเพื่อยืนยัน")
    try:
        data = backup.read_zip(payload.file_base64)
    except backup.BackupError as e:
        raise HTTPException(422, str(e))
    result = backup.validate(data)
    if not result["ok"]:
        raise HTTPException(422, "ไฟล์มีปัญหา ยังกู้คืนไม่ได้: " + " · ".join(result["problems"][:3]))
    try:
        counts = backup.restore(db, result["parsed"])
    except Exception:
        raise HTTPException(500, "กู้คืนไม่สำเร็จ ข้อมูลเดิมยังอยู่ครบ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบ")
    return {"ok": True, "counts": counts}
