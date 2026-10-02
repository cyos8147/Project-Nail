"""อัปโหลดไฟล์รูปภาพ — ใช้ Supabase Storage เมื่อตั้งค่า SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ไว้แล้ว
มิฉะนั้น fallback มาเก็บไฟล์ไว้ในเครื่อง (backend/static/uploads) เพื่อให้ dev/ทดสอบได้ทันทีโดยไม่ต้องมี
บัญชี Supabase ก่อน — สลับไปใช้ Supabase จริงตอน deploy ได้แค่ใส่ env var (ไม่ต้องแก้โค้ด)
"""

import base64
import io
import os
import uuid
from pathlib import Path

from PIL import Image, ImageOps

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


# รูปที่ลูกค้า/แอดมินอัปโหลดมักเป็นรูปจากกล้องมือถือ 3-8MB แต่ในเว็บแสดงเป็นรูปเล็ก (ราว 64-400px)
# เดิมเก็บไฟล์ต้นฉบับตรงๆ ทำให้ทุกคนที่เปิดหน้าแรกต้องโหลดรูปเต็มขนาด (วัดจริง: รูปเดียว 5.5MB ทำให้หน้าแรกหนักขึ้นจาก 0.6MB
# เป็น 6.1MB) จึงย่อ+บีบอัดก่อนเก็บ และการเซฟใหม่ยังตัดข้อมูลแฝงของรูป (EXIF เช่นพิกัด GPS/รุ่นมือถือ) ออกด้วย
# เพราะ bucket เป็นสาธารณะ ใครมีลิงก์ก็ดึงไฟล์ไปอ่านได้
PHOTO_QUALITY = 82
CATALOG_PHOTO_MAX_SIDE = 1200  # รูปบริการ/ลายเล็บที่โชว์ในหน้าเว็บ (การ์ดใหญ่สุดราว 350px x2 สำหรับจอ retina)
REVIEW_PHOTO_MAX_SIDE = 1200
REFERENCE_PHOTO_MAX_SIDE = 1600  # รูปตัวอย่างที่ลูกค้าแนบ ร้านต้องซูมดูลายละเอียด จึงให้ใหญ่กว่า


def optimize_photo(raw: bytes, max_side: int) -> tuple[bytes, str, str]:
    """ย่อรูปให้ด้านยาวไม่เกิน max_side บีบอัด และตัด EXIF ออก คืนค่า (bytes, content-type, นามสกุลไฟล์)
    หมุนรูปตามที่ถ่ายมาก่อนตัด EXIF (ไม่งั้นรูปแนวตั้งจากมือถือจะกลายเป็นนอนข้าง) รูปที่มีพื้นโปร่งใสเก็บเป็น PNG
    นอกนั้นเป็น JPEG  ต้องเรียกหลัง validate_image_bytes เท่านั้น"""
    img = Image.open(io.BytesIO(raw))
    if img.format == "JPEG":
        img.draft("RGB", (max_side, max_side))  # ถอดรหัส JPEG แบบย่อส่วน ประหยัดแรมกับรูป 12MP
    img = ImageOps.exif_transpose(img)
    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    img.thumbnail((max_side, max_side), Image.LANCZOS)  # ย่อเฉพาะรูปที่ใหญ่เกิน ไม่ขยายรูปเล็ก

    out = io.BytesIO()
    if has_alpha:
        img.convert("RGBA").save(out, "PNG", optimize=True)
        return out.getvalue(), "image/png", ".png"
    img.convert("RGB").save(out, "JPEG", quality=PHOTO_QUALITY, optimize=True, progressive=True)
    return out.getvalue(), "image/jpeg", ".jpg"


def upload_photo(raw: bytes, bucket: str, max_side: int) -> str:
    """ย่อรูปด้วย optimize_photo แล้วอัปโหลด คืนค่า URL สาธารณะ (ใช้กับรูปที่ผู้ใช้อัปโหลดทุกชนิด)"""
    data, content_type, ext = optimize_photo(raw, max_side)
    return upload_bytes(data, f"photo{ext}", bucket, content_type)


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
