import logging
import threading
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.orm import Session

from .ai import recommend as recommend_ai
from .ai import segmentation
from .config import get_settings
from .database import Base, SessionLocal, engine, get_db
from .migrations import ensure_columns
from .rate_limit import limiter
from .scheduler import start_scheduler
from .routers import (
    admin_auth,
    admin_bookings,
    admin_catalog,
    admin_customers,
    admin_dashboard,
    admin_export,
    ai,
    bookings,
    line,
    meta,
    reviews,
)
from .seed import run_seed

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    # ใช้ key "detail" (ไม่ใช่ "error" แบบ default ของ slowapi) ให้ตรงกับที่ frontend/api/client.js
    # อ่านข้อความ error จาก response ทุก endpoint อยู่แล้ว ลูกค้า/แอดมินจะได้เห็นข้อความไทยที่เข้าใจง่าย
    return JSONResponse(status_code=429, content={"detail": "มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).resolve().parent.parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.include_router(meta.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(line.router, prefix="/api")
app.include_router(admin_auth.router, prefix="/api")
app.include_router(admin_bookings.router, prefix="/api")
app.include_router(admin_customers.router, prefix="/api")
app.include_router(admin_catalog.router, prefix="/api")
app.include_router(admin_dashboard.router, prefix="/api")
app.include_router(admin_export.router, prefix="/api")


def _warm_up_models():
    log = logging.getLogger("uvicorn.error")
    try:
        segmentation.warm_up_detector()
    except Exception:
        log.exception("โหลดโมเดลตรวจเล็บล่วงหน้าไม่สำเร็จ (จะโหลดตอนมีคนใช้ครั้งแรกแทน)")
    try:
        # import xgboost ดึง scikit-learn, scipy และ pandas มาด้วย (แรม +130 MB) ซึ่งช้ามากบน CPU ของ Render ฟรี
        # ถ้ารอไปโหลดตอนลูกค้ากด "ให้ AI แนะนำลาย" ครั้งแรก หน้าเว็บจะค้างที่ "กำลังให้ AI คำนวณ..."
        recommend_ai.is_model_ready()
    except Exception:
        log.exception("โหลดโมเดลแนะนำลายล่วงหน้าไม่สำเร็จ (จะโหลดตอนมีคนใช้ครั้งแรกแทน)")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_columns(engine)  # คอลัมน์ใหม่ของตารางเดิม (create_all ไม่เพิ่มให้) -- ดู migrations.py
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
    app.state.scheduler = start_scheduler()
    # โหลดโมเดลตรวจเล็บและโมเดลแนะนำลายทิ้งไว้ก่อนใน thread แยก (เซิร์ฟเวอร์ไม่ต้องเริ่มช้าลง)
    # ผู้ใช้คนแรกจะได้ไม่ต้องรอโหลดโมเดล
    if settings.ai_warm_up:
        threading.Thread(target=_warm_up_models, daemon=True).start()


@app.on_event("shutdown")
def on_shutdown():
    scheduler = getattr(app.state, "scheduler", None)
    if scheduler:
        scheduler.shutdown(wait=False)


# UptimeRobot รุ่นฟรีเรียกด้วย HEAD (ไม่ใช่ GET) ถ้ารับแค่ GET จะตอบ 405 แล้ว UptimeRobot ขึ้นว่าเซิร์ฟเวอร์ล่ม
# รับที่ "/" ด้วย เผื่อตั้ง monitor ไว้ที่ที่อยู่หลักของเซิร์ฟเวอร์ ซึ่งเดิมตอบ 404
@app.api_route("/api/health", methods=["GET", "HEAD"])
@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def health(db: Session = Depends(get_db)):
    # แตะฐานข้อมูลทุกครั้งที่ UptimeRobot เรียก (ทุก 5 นาที) เพราะ Supabase รุ่นฟรีพักโปรเจกต์ที่ฐานข้อมูลไม่ถูกใช้
    # ราว 1 สัปดาห์ แล้วเซิร์ฟเวอร์จะเริ่มทำงานไม่ได้ (Render แจ้ง "Exited with status 3") -- ถ้าต่อฐานข้อมูลไม่ได้
    # ตอบ 503 ให้ UptimeRobot แจ้งเตือน แทนที่จะขึ้นว่าปกติ
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        logging.getLogger("uvicorn.error").exception("health check: ต่อฐานข้อมูลไม่ได้")
        return JSONResponse(status_code=503, content={"status": "database_unavailable", "app": settings.app_name})
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}
