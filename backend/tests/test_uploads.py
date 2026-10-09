"""รูปที่อัปโหลด: ตรวจว่าเป็นรูปจริง ย่อ/บีบอัด ตัด EXIF (พิกัด GPS) และหมุนให้ตั้งตรงก่อนเก็บ"""

import base64
import io

import numpy as np
import pytest
from PIL import Image

from app import storage
from app.storage import CATALOG_PHOTO_MAX_SIDE, optimize_photo, validate_image_bytes
from conftest import book, open_date


def _noise_photo(width, height, *, orientation=None, gps=False, fmt="JPEG", quality=92):
    rng = np.random.default_rng(1)
    y, x = np.mgrid[0:height, 0:width]
    base = np.stack([x / width * 200 + 30, y / height * 160 + 40, (x + y) / (width + height) * 180 + 20], -1)
    img = Image.fromarray(np.clip(base + rng.normal(0, 14, base.shape), 0, 255).astype("uint8"))
    exif = Image.Exif()
    if orientation:
        exif[0x0112] = orientation
    if gps:
        exif[0x010F] = "FakePhone"
        exif[0x8825] = {1: "N", 2: (13.0, 45.0, 0.0), 3: "E", 4: (100.0, 30.0, 0.0)}
    buf = io.BytesIO()
    img.save(buf, fmt, quality=quality, exif=exif if fmt == "JPEG" else None)
    return buf.getvalue()


def _data_url(raw, mime="image/jpeg"):
    return f"data:{mime};base64," + base64.b64encode(raw).decode()


def _stored(url):
    """อ่านไฟล์ที่เก็บไว้จาก URL (โหมดทดสอบเก็บในโฟลเดอร์ชั่วคราว)"""
    assert url.startswith("/static/uploads/")
    return (storage.LOCAL_UPLOAD_DIR / url.removeprefix("/static/uploads/")).read_bytes()


# ---------------------------------------------------------------- ตรวจไฟล์
def test_valid_formats_are_accepted():
    assert validate_image_bytes(_noise_photo(200, 100)) == "image/jpeg"
    png = io.BytesIO(); Image.new("RGB", (50, 50)).save(png, "PNG")
    assert validate_image_bytes(png.getvalue()) == "image/png"


@pytest.mark.parametrize("raw", [b"", b"not an image", b"\xff\xd8garbage", b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"])
def test_fake_images_are_rejected(raw):
    with pytest.raises(ValueError):
        validate_image_bytes(raw)


def test_too_big_files_and_unsupported_formats_are_rejected():
    with pytest.raises(ValueError, match="8MB"):
        validate_image_bytes(b"0" * (8 * 1024 * 1024 + 1))
    gif = io.BytesIO(); Image.new("RGB", (10, 10)).save(gif, "GIF")
    with pytest.raises(ValueError, match="JPEG"):
        validate_image_bytes(gif.getvalue())


# ---------------------------------------------------------------- ย่อ/บีบอัด
def test_a_phone_sized_photo_is_shrunk_and_loses_its_gps():
    raw = _noise_photo(4000, 3000, gps=True)
    assert len(raw) > 3_000_000 and Image.open(io.BytesIO(raw)).getexif().get_ifd(0x8825)
    data, content_type, ext = optimize_photo(raw, CATALOG_PHOTO_MAX_SIDE)
    result = Image.open(io.BytesIO(data))
    assert (content_type, ext) == ("image/jpeg", ".jpg")
    assert result.size == (1200, 900) and len(data) < len(raw) / 10
    assert len(result.getexif()) == 0 and not result.getexif().get_ifd(0x8825)


def test_orientation_is_applied_before_the_metadata_is_dropped():
    data, _, _ = optimize_photo(_noise_photo(1600, 1200, orientation=6), 1200)  # เก็บเป็นแนวนอน แต่ต้องแสดงเป็นแนวตั้ง
    assert Image.open(io.BytesIO(data)).size == (900, 1200)


def test_small_photos_are_not_enlarged():
    data, _, _ = optimize_photo(_noise_photo(600, 400), 1200)
    assert Image.open(io.BytesIO(data)).size == (600, 400)


def test_transparent_png_keeps_its_transparency_and_opaque_becomes_jpeg():
    rgba = Image.new("RGBA", (300, 300), (255, 0, 0, 0)); buf = io.BytesIO(); rgba.save(buf, "PNG")
    data, content_type, ext = optimize_photo(buf.getvalue(), 1200)
    assert (content_type, ext) == ("image/png", ".png")
    assert Image.open(io.BytesIO(data)).getpixel((10, 10))[3] == 0
    opaque = io.BytesIO(); Image.new("RGB", (300, 300), (10, 20, 30)).save(opaque, "PNG")
    assert optimize_photo(opaque.getvalue(), 1200)[1] == "image/jpeg"


# ---------------------------------------------------------------- ผ่าน API จริงทั้ง 3 ทาง
def test_service_photo_uploaded_by_admin_is_stored_small(client, owner_headers):
    svc = client.get("/api/admin/services", headers=owner_headers).json()[0]
    payload = {k: svc[k] for k in ("category_id", "name", "description", "duration_minutes", "price") if k in svc}
    payload["image_base64"] = _data_url(_noise_photo(4000, 3000, gps=True))
    r = client.put(f"/api/admin/services/{svc['id']}", headers=owner_headers, json=payload)
    assert r.status_code == 200
    stored = _stored(r.json()["image_url"])
    image = Image.open(io.BytesIO(stored))
    assert max(image.size) == 1200 and len(stored) < 300_000 and len(image.getexif()) == 0


def test_booking_reference_photo_is_stored_small(client, services, phone):
    r = book(client, services["ทำสีเจล"], open_date(95), "10:00", phone, reference_image_base64=_data_url(_noise_photo(4000, 3000, gps=True)))
    assert r.status_code == 201
    stored = _stored(r.json()["reference_image_url"])
    image = Image.open(io.BytesIO(stored))
    assert max(image.size) == 1600 and len(stored) < 400_000 and len(image.getexif()) == 0


def test_review_photo_is_stored_small(client, services, owner_headers, phone):
    created = book(client, services["ทำสีเจล"], open_date(96), "10:00", phone).json()
    client.patch(f"/api/admin/bookings/{created['id']}", headers=owner_headers, json={"status": "completed"})
    r = client.post("/api/reviews", json={"booking_code": created["booking_code"], "customer_phone": phone, "rating": 5,
                                          "comment": "สวย", "photo_base64": _data_url(_noise_photo(3000, 2000, gps=True))})
    assert r.status_code == 201
    stored = _stored(r.json()["photo_url"])
    assert max(Image.open(io.BytesIO(stored)).size) == 1200 and len(stored) < 300_000


def test_the_api_refuses_a_fake_image(client, owner_headers):
    svc = client.get("/api/admin/services", headers=owner_headers).json()[0]
    payload = {k: svc[k] for k in ("category_id", "name", "description", "duration_minutes", "price") if k in svc}
    payload["image_base64"] = _data_url(b"definitely not a picture")
    assert client.put(f"/api/admin/services/{svc['id']}", headers=owner_headers, json=payload).status_code == 400
