"""อัปโหลดไฟล์รูปภาพ — ใช้ Supabase Storage เมื่อตั้งค่า SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ไว้แล้ว
มิฉะนั้น fallback มาเก็บไฟล์ไว้ในเครื่อง (backend/static/uploads) เพื่อให้ dev/ทดสอบได้ทันทีโดยไม่ต้องมี
บัญชี Supabase ก่อน — สลับไปใช้ Supabase จริงตอน deploy ได้แค่ใส่ env var (ไม่ต้องแก้โค้ด)
"""

import os
import uuid
from pathlib import Path

from .config import get_settings

settings = get_settings()

LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads"
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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
