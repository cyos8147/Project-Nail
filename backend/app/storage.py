"""อัปโหลดไฟล์รูปภาพ — ใช้ Supabase Storage เมื่อตั้งค่า SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ไว้แล้ว
มิฉะนั้น fallback มาเก็บไฟล์ไว้ในเครื่อง (backend/static/uploads) เพื่อให้ dev/ทดสอบได้ทันทีโดยไม่ต้องมี
บัญชี Supabase ก่อน — สลับไปใช้ Supabase จริงตอน deploy ได้แค่ใส่ env var (ไม่ต้องแก้โค้ด)
"""

import base64
import io
import os
import uuid
from pathlib import Path

from PIL import Image

from .config import get_settings

settings = get_settings()

LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads"
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8MB -- พอสำหรับรูปถ่ายมือถือทั่วไป กันไฟล์ใหญ่ผิดปกติ/โจมตี DoS
MAX_IMAGE_DIMENSION = 4000  # กันรูป resolution สูงเกินจำเป็น เปลืองแรงประมวลผล/พื้นที่เก็บโดยใช่เหตุ
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_image_bytes(raw: bytes) -> str:
    """ตรวจสอบว่า raw bytes เป็นรูปจริง ขนาดไม่ใหญ่ผิดปกติ และเป็นชนิดไฟล์ที่รองรับ
    คืนค่า content-type หรือโยน ValueError (ข้อความภาษาไทย) ถ้าไม่ผ่าน"""
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("ไฟล์รูปภาพมีขนาดใหญ่เกินไป (จำกัดไม่เกิน 8MB)")

    try:
        Image.open(io.BytesIO(raw)).verify()
        img = Image.open(io.BytesIO(raw))  # verify() ปิด stream ไปแล้ว ต้องเปิดใหม่ถึงจะอ่านค่าต่อได้
    except Exception:
        raise ValueError("ไฟล์นี้ไม่ใช่รูปภาพที่เปิดได้ กรุณาลองไฟล์อื่น")

    if img.format not in ALLOWED_IMAGE_FORMATS:
        raise ValueError("รองรับเฉพาะไฟล์ JPEG, PNG, WEBP เท่านั้น")
    if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
        raise ValueError(f"ขนาดรูปภาพใหญ่เกินไป (ไม่เกิน {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION} พิกเซล)")

    return Image.MIME.get(img.format, "image/jpeg")


def decode_and_validate_image(image_base64: str) -> tuple[bytes, str]:
    """ถอดรหัสรูปที่ลูกค้า/แอดมินอัปโหลดมาเป็น base64 พร้อมตรวจสอบ (ดู _validate_image_bytes)
    -- กันไฟล์ปลอมที่ไม่ใช่รูป (สวมนามสกุล) และกันไฟล์ใหญ่ผิดปกติที่เคยไม่มีการตรวจสอบมาก่อนเลย
    คืนค่า (raw bytes, content-type) หรือโยน ValueError (ข้อความภาษาไทย) ถ้าไม่ผ่าน"""
    raw_str = image_base64
    if "," in raw_str and raw_str.strip().startswith("data:"):
        raw_str = raw_str.split(",", 1)[1]

    # เช็คคร่าวๆ จากความยาว string ก่อน decode จริง (base64 ยาวกว่าไฟล์จริงราว 4/3 เท่า) ถูกกว่าการ
    # decode ไฟล์ใหญ่ๆ ออกมาก่อนแล้วค่อยเจอว่าเกินขนาดทีหลัง
    if len(raw_str) > MAX_IMAGE_BYTES * 4 // 3:
        raise ValueError("ไฟล์รูปภาพมีขนาดใหญ่เกินไป (จำกัดไม่เกิน 8MB)")

    try:
        raw = base64.b64decode(raw_str, validate=True)
    except Exception:
        raise ValueError("ข้อมูลรูปภาพไม่ถูกต้อง")

    return raw, validate_image_bytes(raw)

_supabase_client = None


def _get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    from supabase import create_client

    _supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase_client


def upload_bytes(data: bytes, filename: str, bucket: str, content_type: str = "image/png") -> str:
    """อัปโหลดไฟล์และคืนค่า URL สาธารณะที่ใช้แสดงผลได้ทันที"""
    ext = Path(filename).suffix or ".png"
    key = f"{uuid.uuid4().hex}{ext}"

    client = _get_supabase_client()
    if client is not None:
        client.storage.from_(bucket).upload(
            key, data, {"content-type": content_type}
        )
        return client.storage.from_(bucket).get_public_url(key)

    # local fallback
    bucket_dir = LOCAL_UPLOAD_DIR / bucket
    bucket_dir.mkdir(parents=True, exist_ok=True)
    (bucket_dir / key).write_bytes(data)
    return f"/static/uploads/{bucket}/{key}"
