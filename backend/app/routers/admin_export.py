"""ส่งออกข้อมูลร้านเป็นไฟล์ CSV (เปิดใน Excel/Google Sheets ได้) -- ใช้เป็นสำเนาสำรองข้อมูลและทำบัญชี

ทำไมต้องมี: ข้อมูลทั้งหมดอยู่ในฐานข้อมูล Supabase แผนฟรีซึ่งไม่มีสำรองอัตโนมัติให้ดาวน์โหลด ถ้ามีใครลบผิดหรือโปรเจกต์มีปัญหา
จะไม่มีสำเนาเลย เจ้าของร้านกดดาวน์โหลดเดือนละครั้งเก็บไว้ได้ (หน้าแอดมิน ตั้งค่าร้าน > สำรองข้อมูล) ไฟล์มีชื่อ-เบอร์โทรลูกค้า
จึงให้เฉพาะ owner ดาวน์โหลด (staff ทำงานประจำวันได้ แต่ดึงข้อมูลลูกค้าทั้งหมดไม่ได้)
"""

import csv
import io
import zipfile
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..rate_limit import limiter
from ..security import require_owner
from ..services.line_notify import STATUS_LABEL_TH
from ..timeutil import now_th

router = APIRouter(prefix="/admin/export", tags=["admin-export"])

BOM = "﻿"  # ให้ Excel เปิดไฟล์ UTF-8 แล้วอ่านภาษาไทยถูก
_FORMULA_STARTS = ("=", "+", "-", "@", "\t", "\r")


def _cell(value):
    """แปลงค่าเป็นช่อง CSV ข้อความที่ขึ้นต้นด้วย = + - @ จะถูกนำหน้าด้วย ' กันสูตรใน Excel (CSV injection):
    ลูกค้าพิมพ์ชื่อ/หมายเหตุอะไรก็ได้ ถ้าเป็นสูตร Excel จะรันตอนเจ้าของร้านเปิดไฟล์"""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "ใช่" if value else "ไม่ใช่"
    if isinstance(value, Decimal):
        value = float(value)
    if isinstance(value, float):
        return int(value) if value == int(value) else round(value, 2)
    if isinstance(value, int):
        return value
    text = str(value)
    return "'" + text if text.startswith(_FORMULA_STARTS) else text


def _thai_time(value: datetime | None) -> str:
    """เวลาที่เก็บในฐานข้อมูลเป็น UTC -> แสดงเป็นเวลาไทย"""
    return (value + timedelta(hours=7)).strftime("%Y-%m-%d %H:%M") if value else ""


def _csv_bytes(headers: list[str], rows: list[list]) -> bytes:
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([_cell(v) for v in row])
    return (BOM + out.getvalue()).encode("utf-8")


# ---------------------------------------------------------------------------
# แต่ละตาราง: (หัวคอลัมน์ภาษาไทย, ฟังก์ชันดึงแถวจากฐานข้อมูล)
# ---------------------------------------------------------------------------
def _bookings(db: Session):
    categories = {c.id: c.name for c in db.query(models.ServiceCategory).all()}
    headers = ["รหัสคิว", "วันที่นัด", "เวลานัด", "สถานะ", "ชื่อลูกค้า", "เบอร์โทร", "LINE ID", "หมวด", "บริการ", "ราคา (บาท)",
               "ระยะเวลา (นาที)", "โทนสี/เฉดสี", "หมายเหตุจากร้าน", "ส่งแจ้งเตือนแล้ว", "สร้างเมื่อ (เวลาไทย)", "ลิงก์รูปอ้างอิง"]
    rows = [
        [b.booking_code, b.booking_date.isoformat(), b.booking_time, STATUS_LABEL_TH.get(b.status, b.status), b.customer_name,
         b.customer_phone, b.line_id, categories.get(b.category_id, b.category_id), b.service_name, b.price,
         b.estimated_duration_minutes, b.shade_name, b.admin_note, b.reminder_sent, _thai_time(b.created_at), b.reference_image_url]
        for b in db.query(models.Booking).order_by(models.Booking.booking_date, models.Booking.booking_time).all()
    ]
    return headers, rows


def _customers(db: Session):
    totals = dict(db.query(models.Booking.customer_id, func.count(models.Booking.id)).group_by(models.Booking.customer_id).all())
    # จำนวนที่เสร็จสิ้น/ยอดรวมที่เสร็จสิ้น นับแยกอีกรอบ (เขียนให้ใช้ได้ทั้ง SQLite และ Postgres โดยไม่พึ่งฟังก์ชันเฉพาะค่าย)
    done = {
        customer_id: (count, revenue)
        for customer_id, count, revenue in db.query(
            models.Booking.customer_id, func.count(models.Booking.id), func.coalesce(func.sum(models.Booking.price), 0)
        ).filter(models.Booking.status == "completed").group_by(models.Booking.customer_id)
    }
    headers = ["ชื่อ", "เบอร์โทร", "LINE ID", "ผูก LINE รับแจ้งเตือนแล้ว", "จำนวนคิวทั้งหมด", "คิวที่เสร็จสิ้น", "ยอดรวมที่เสร็จสิ้น (บาท)", "สร้างเมื่อ (เวลาไทย)"]
    rows = []
    for c in db.query(models.Customer).order_by(models.Customer.created_at).all():
        total = totals.get(c.id, 0)
        done_count, done_revenue = done.get(c.id, (0, 0))
        rows.append([c.name, c.phone, c.line_id, bool(c.line_user_id), total, done_count, done_revenue, _thai_time(c.created_at)])
    return headers, rows


def _expenses(db: Session):
    headers = ["วันที่", "หมวด", "จำนวนเงิน (บาท)", "หมายเหตุ"]
    rows = [[e.expense_date.isoformat(), e.category, e.amount, e.note] for e in db.query(models.Expense).order_by(models.Expense.expense_date).all()]
    return headers, rows


def _reviews(db: Session):
    headers = ["วันที่รีวิว (เวลาไทย)", "รหัสคิว", "ชื่อลูกค้า", "บริการ", "คะแนน", "ความคิดเห็น", "ลิงก์รูป"]
    rows = []
    for r in db.query(models.Review).order_by(models.Review.created_at).all():
        b = db.get(models.Booking, r.booking_id)
        rows.append([_thai_time(r.created_at), b.booking_code if b else "", b.customer_name if b else "", b.service_name if b else "",
                     r.rating, r.comment, r.photo_url])
    return headers, rows


def _services(db: Session):
    categories = {c.id: c.name for c in db.query(models.ServiceCategory).all()}
    headers = ["หมวด", "ชื่อบริการ", "รายละเอียด", "ราคา (บาท)", "ระยะเวลา (นาที)", "เปิดให้จองอยู่", "ลิงก์รูป"]
    rows = [
        [categories.get(s.category_id, s.category_id), s.name, s.description, s.price, s.duration_minutes, s.active, s.image_url]
        for s in db.query(models.Service).order_by(models.Service.category_id, models.Service.sort_order).all()
    ]
    return headers, rows


def _nail_designs(db: Session):
    headers = ["ชื่อลาย", "ราคา (บาท)", "ระยะเวลา (นาที)", "ความซับซ้อน", "สไตล์", "สี (hex)", "คะแนนความนิยม", "เปิดใช้อยู่", "ลิงก์รูป"]
    rows = [
        [d.name, d.price, d.duration_minutes, d.complexity, d.style_tag, d.color_hex, d.popularity, d.active, d.image_url]
        for d in db.query(models.NailDesign).order_by(models.NailDesign.name).all()
    ]
    return headers, rows


TABLES = {
    "bookings": ("คิวทั้งหมด", _bookings),
    "customers": ("ลูกค้า", _customers),
    "expenses": ("ค่าใช้จ่าย", _expenses),
    "reviews": ("รีวิว", _reviews),
    "services": ("บริการและราคา", _services),
    "nail-designs": ("ลายเล็บ", _nail_designs),
}


def _filename(name: str, extension: str) -> str:
    return f"luckysalon-{name}-{now_th():%Y-%m-%d}.{extension}"


def _download(content: bytes, filename: str, media_type: str) -> Response:
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"},
    )


@router.get("/all.zip")
@limiter.limit("10/minute")
def export_all(request: Request, db: Session = Depends(get_db), owner: models.AdminUser = Depends(require_owner)):
    """ไฟล์ zip เดียวมี CSV ครบทุกตาราง + ไฟล์อธิบาย -- ปุ่ม 'สำรองข้อมูลทั้งหมด' ในหน้าตั้งค่า"""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        lines = [f"สำรองข้อมูล Lucky Salon เมื่อ {now_th():%Y-%m-%d %H:%M} (เวลาไทย)", "", "ไฟล์ในนี้เปิดด้วย Excel หรือ Google Sheets ได้:"]
        for name, (title, build) in TABLES.items():
            headers, rows = build(db)
            archive.writestr(f"{name}.csv", _csv_bytes(headers, rows))
            lines.append(f"- {name}.csv : {title} ({len(rows)} แถว)")
        lines += [
            "",
            "คำแนะนำ: ดาวน์โหลดเดือนละครั้งแล้วเก็บไว้ในที่ปลอดภัย (เช่น Google Drive ส่วนตัว)",
            "ไฟล์มีชื่อและเบอร์โทรลูกค้า ห้ามส่งต่อหรือโพสต์ที่สาธารณะ",
            "นี่คือสำเนาข้อมูล ไม่ใช่ตัวกู้คืนอัตโนมัติ ถ้าต้องกู้ข้อมูลให้แจ้งผู้ดูแลระบบ",
        ]
        archive.writestr("README.txt", BOM + "\n".join(lines) + "\n")
    return _download(buffer.getvalue(), _filename("backup", "zip"), "application/zip")


@router.get("/{name}.csv")
@limiter.limit("30/minute")
def export_table(request: Request, name: str, db: Session = Depends(get_db), owner: models.AdminUser = Depends(require_owner)):
    if name not in TABLES:
        raise HTTPException(404, "ไม่พบข้อมูลที่ขอส่งออก")
    headers, rows = TABLES[name][1](db)
    return _download(_csv_bytes(headers, rows), _filename(name, "csv"), "text/csv; charset=utf-8")
