import logging
import threading
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from .ai import segmentation
from .config import get_settings
from .database import Base, SessionLocal, engine
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


def _warm_up_detector():
    try:
        segmentation.warm_up_detector()
    except Exception:
        logging.getLogger("uvicorn.error").exception("โหลดโมเดลตรวจเล็บล่วงหน้าไม่สำเร็จ (จะโหลดตอนมีคนใช้ครั้งแรกแทน)")


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
    # โหลดโมเดลตรวจเล็บทิ้งไว้ก่อนใน thread แยก (เซิร์ฟเวอร์ไม่ต้องเริ่มช้าลง) ผู้ใช้คนแรกจะได้ไม่ต้องรอโหลดโมเดล
    if settings.ai_warm_up:
        threading.Thread(target=_warm_up_detector, daemon=True).start()


@app.on_event("shutdown")
def on_shutdown():
    scheduler = getattr(app.state, "scheduler", None)
    if scheduler:
        scheduler.shutdown(wait=False)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}
