"""ข้อมูลตั้งต้น — รันอัตโนมัติตอนเริ่มเซิร์ฟเวอร์ครั้งแรก (เฉพาะตารางที่ยังว่างอยู่เท่านั้น)
ค่าบริการ/แคตตาล็อกลายเล็บชุดนี้อ้างอิงจากชุดข้อมูล demo เดิมของฝั่ง frontend
(src/data/bookingData.js, src/data/nailCatalog.js) เพื่อให้ผลลัพธ์หน้าเว็บตรงกันตั้งแต่วันแรกที่เชื่อม API
"""

from sqlalchemy.orm import Session

from .models import AdminUser, NailDesign, Service, ServiceCategory, ShopSettings
from .security import hash_password
from .config import get_settings

settings = get_settings()

CATEGORIES = [
    {"id": "hair", "name": "ทำผม", "icon": "💇‍♀️", "sort_order": 1},
    {"id": "nail", "name": "ทำเล็บ", "icon": "💅", "sort_order": 2},
]

SERVICES = [
    {"category_id": "hair", "name": "สระ + ไดร์", "duration_minutes": 45, "price": 250, "is_color_service": False},
    {"category_id": "hair", "name": "ตัดผม", "duration_minutes": 60, "price": 350, "is_color_service": False},
    {"category_id": "hair", "name": "ทำสีผม", "duration_minutes": 150, "price": 1500, "is_color_service": True},
    {"category_id": "hair", "name": "ยืด / ดัดผม", "duration_minutes": 180, "price": 1800, "is_color_service": False},
    {"category_id": "hair", "name": "ทรีทเมนต์บำรุงผม", "duration_minutes": 60, "price": 500, "is_color_service": False},
    {"category_id": "nail", "name": "ทำสีเจล", "duration_minutes": 60, "price": 350, "is_color_service": False},
    {"category_id": "nail", "name": "เพ้นท์ลาย", "duration_minutes": 45, "price": 200, "is_color_service": False},
    {"category_id": "nail", "name": "ต่อเล็บ PVC / เจล", "duration_minutes": 90, "price": 600, "is_color_service": False},
    {"category_id": "nail", "name": "ดูแลผิวมือ & เท้า", "duration_minutes": 30, "price": 300, "is_color_service": False},
]

NAIL_DESIGNS = [
    {"name": "Minimal Nude", "price": 350, "duration_minutes": 45, "complexity": "simple", "style_tag": "minimal",
     "color_hex": "#D9B99B", "tone_fit": {"warm": 96, "cool": 55, "neutral": 85}, "popularity": 92},
    {"name": "French Classic", "price": 400, "duration_minutes": 60, "complexity": "simple", "style_tag": "classic",
     "color_hex": "#F1D9C0", "tone_fit": {"warm": 80, "cool": 78, "neutral": 88}, "popularity": 88},
    {"name": "Korean Pink", "price": 380, "duration_minutes": 60, "complexity": "medium", "style_tag": "classic",
     "color_hex": "#F4A6C6", "tone_fit": {"warm": 60, "cool": 94, "neutral": 75}, "popularity": 84},
    {"name": "Cat Eye", "price": 450, "duration_minutes": 60, "complexity": "medium", "style_tag": "bold",
     "color_hex": "#4A4A52", "tone_fit": {"warm": 82, "cool": 70, "neutral": 78}, "popularity": 70},
    {"name": "Marble", "price": 500, "duration_minutes": 75, "complexity": "complex", "style_tag": "bold",
     "color_hex": "#EDEAE4", "tone_fit": {"warm": 68, "cool": 74, "neutral": 80}, "popularity": 65},
    {"name": "Glitter Gold", "price": 480, "duration_minutes": 75, "complexity": "complex", "style_tag": "bold",
     "color_hex": "#D4AF37", "tone_fit": {"warm": 92, "cool": 45, "neutral": 70}, "popularity": 60},
    {"name": "Berry Jelly", "price": 420, "duration_minutes": 60, "complexity": "medium", "style_tag": "classic",
     "color_hex": "#7A2048", "tone_fit": {"warm": 40, "cool": 90, "neutral": 68}, "popularity": 55},
    {"name": "Terracotta Swirl", "price": 460, "duration_minutes": 75, "complexity": "complex", "style_tag": "bold",
     "color_hex": "#C1633D", "tone_fit": {"warm": 85, "cool": 50, "neutral": 90}, "popularity": 58},
]


def run_seed(db: Session) -> None:
    if db.query(ServiceCategory).count() == 0:
        for c in CATEGORIES:
            db.add(ServiceCategory(**c))
        db.flush()

    if db.query(Service).count() == 0:
        for s in SERVICES:
            db.add(Service(**s))

    if db.query(NailDesign).count() == 0:
        for d in NAIL_DESIGNS:
            db.add(NailDesign(**d))

    if db.query(ShopSettings).count() == 0:
        db.add(ShopSettings(id=1, closed_weekdays=[2]))  # ร้านหยุดทุกวันอังคาร

    if db.query(AdminUser).count() == 0:
        db.add(
            AdminUser(
                username=settings.seed_admin_username,
                password_hash=hash_password(settings.seed_admin_password),
                full_name="เจ้าของร้าน",
                role="owner",
            )
        )

    db.commit()
