"""ตัวช่วยกลางของชุดทดสอบ: ฐานข้อมูล SQLite ชั่วคราว, TestClient, token แอดมิน, ตัวช่วยหาวันที่ร้านเปิด

ต้องตั้งค่า environment ก่อน import แอปเสมอ (แอปอ่านค่าตั้งต้นตอน import) ชุดทดสอบจึงไม่แตะฐานข้อมูลจริงและไม่ส่ง LINE จริง
"""

import os
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

TMP = Path(tempfile.mkdtemp(prefix="luckysalon-tests-"))
os.environ.update(
    DATABASE_URL=f"sqlite:///{TMP / 'test.db'}",
    JWT_SECRET="test-secret-not-for-production",
    SEED_ADMIN_USERNAME="owner",
    SEED_ADMIN_PASSWORD="test-admin-pass-123",
    LINE_CHANNEL_ACCESS_TOKEN="",
    LINE_CHANNEL_SECRET="",
    AI_WARM_UP="false",
    ENVIRONMENT="test",
)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import storage  # noqa: E402
from app.main import app  # noqa: E402
from app.rate_limit import limiter  # noqa: E402

storage.LOCAL_UPLOAD_DIR = TMP / "uploads"  # รูปที่ทดสอบอัปโหลดไปอยู่ในโฟลเดอร์ชั่วคราว ไม่ปนกับ backend/static
storage.LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

OWNER = {"username": "owner", "password": "test-admin-pass-123"}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    """ตัวกันกดถี่นับในหน่วยความจำ รีเซ็ตทุกเทสต์ไม่ให้เทสต์หนึ่งไปทำให้อีกเทสต์โดนบล็อก"""
    limiter.reset()
    yield


@pytest.fixture(scope="session")
def owner_headers(client):
    limiter.reset()
    token = client.post("/api/admin/login", json=OWNER).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def services(client):
    """บริการตั้งต้นจาก seed แยกตามชื่อ"""
    return {s["name"]: s for s in client.get("/api/services").json()}


_phone_counter = iter(range(1, 10**6))


@pytest.fixture
def phone():
    """เบอร์โทรไม่ซ้ำกันในแต่ละเทสต์ (ลูกค้าแยกกัน ไม่ชนกัน)"""
    return f"08{next(_phone_counter):08d}"


_used_days: set[date] = set()


def open_date(offset_days: int) -> date:
    """วันที่ร้านเปิดวันแรกที่ offset_days วันนับจากวันนี้ (ข้ามวันอังคารที่ร้านปิดประจำ) และไม่ซ้ำกับวันที่เทสต์อื่นเคยขอไปแล้ว
    จึงไม่แย่งคิวกัน (แต่ละหมวดรับได้ทีละคิวต่อช่วงเวลา)"""
    d = date.today() + timedelta(days=offset_days)
    while d.weekday() == 1 or d in _used_days:  # วันอังคาร = ร้านปิด
        d += timedelta(days=1)
    _used_days.add(d)
    return d


def closed_tuesday(offset_days: int = 14) -> date:
    """วันอังคารแรกที่ offset_days วันนับจากวันนี้ (ร้านปิดประจำทุกวันอังคาร)"""
    d = date.today() + timedelta(days=offset_days)
    while d.weekday() != 1:
        d += timedelta(days=1)
    return d


def book(client, service, day, time, phone, name="ลูกค้าทดสอบ", **extra):
    return client.post(
        "/api/bookings",
        json={
            "category_id": service["category_id"],
            "service_id": service["id"],
            "booking_date": day.isoformat(),
            "booking_time": time,
            "customer_name": name,
            "customer_phone": phone,
            **extra,
        },
    )
