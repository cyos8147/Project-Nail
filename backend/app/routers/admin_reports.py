"""หน้ารายงานรายได้ (ส่วนที่ 5): เลือกช่วงวันที่เอง ดูแยกรายวัน/รายเดือน/รายปี และดูรายการคิวทีละรายการ

ตัวเลขทั้งหมดนับจากคิวที่ "เสร็จแล้ว" ตามวันนัด รายได้ = ยอดรับจริงถ้ากรอกไว้ ไม่งั้นใช้ราคาบริการ (ข้อ 5.7)
ค่าใช้จ่ายนับตามวันที่บันทึกค่าใช้จ่าย
"""

from collections import defaultdict
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..models import booking_revenue
from ..rate_limit import limiter
from ..security import get_current_admin
from ..timeutil import today_th
from .admin_export import _csv_bytes, _download, _filename

router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])

MAX_RANGE_DAYS = 1100  # ~3 ปี: รายปีต้องดูได้ย้อนหลังหลายปี แต่กันการดึงข้อมูลทั้งประวัติในครั้งเดียว
MAX_DETAIL_ROWS = 1000  # รายการคิวในหน้าเว็บแสดงสูงสุดเท่านี้ (ไฟล์ CSV ไม่จำกัด)
THAI_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


def _resolve(date_from: date | None, date_to: date | None) -> tuple[date, date]:
    today = today_th()
    start = date_from or today.replace(day=1)
    end = date_to or today
    if start > end:
        raise HTTPException(422, "วันเริ่มต้องไม่เกินวันสิ้นสุด")
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        raise HTTPException(422, f"เลือกช่วงได้ไม่เกิน {MAX_RANGE_DAYS} วัน")
    return start, end


def _group_key(d: date, group: str) -> str:
    if group == "year":
        return f"{d.year}"
    if group == "month":
        return f"{d.year}-{d.month:02d}"
    return d.isoformat()


def _group_label(key: str, group: str) -> str:
    if group == "year":
        return f"ปี {int(key) + 543}"
    if group == "month":
        y, m = key.split("-")
        return f"{THAI_MONTHS[int(m)]} {int(y) + 543}"
    y, m, d = key.split("-")
    return f"{int(d)} {THAI_MONTHS[int(m)]} {int(y) + 543}"


def _auto_group(start: date, end: date) -> str:
    days = (end - start).days + 1
    if days <= 62:
        return "day"
    if days <= 730:
        return "month"
    return "year"


def _collect(db: Session, start: date, end: date, group: str):
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.status == "completed", models.Booking.booking_date.between(start, end))
        .order_by(models.Booking.booking_date, models.Booking.booking_time)
        .all()
    )
    expenses = db.query(models.Expense).filter(models.Expense.expense_date.between(start, end)).all()

    groups: dict[str, dict] = defaultdict(lambda: {"count": 0, "revenue": 0.0, "list_price": 0.0, "expenses": 0.0})
    for b in bookings:
        g = groups[_group_key(b.booking_date, group)]
        g["count"] += 1
        g["revenue"] += booking_revenue(b)
        g["list_price"] += float(b.price or 0)
    for e in expenses:
        groups[_group_key(e.expense_date, group)]["expenses"] += float(e.amount or 0)

    totals = {
        "count": len(bookings),
        "revenue": sum(booking_revenue(b) for b in bookings),
        "list_price": sum(float(b.price or 0) for b in bookings),
        "expenses": sum(float(e.amount or 0) for e in expenses),
    }
    totals["profit"] = totals["revenue"] - totals["expenses"]
    totals["adjusted"] = totals["revenue"] - totals["list_price"]  # ส่วนต่างจากราคาตั้ง (บวก = รับเกินราคา)

    rows = []
    for key in sorted(groups):
        g = groups[key]
        rows.append({
            "key": key,
            "label": _group_label(key, group),
            "count": g["count"],
            "revenue": round(g["revenue"], 2),
            "expenses": round(g["expenses"], 2),
            "profit": round(g["revenue"] - g["expenses"], 2),
        })
    return bookings, rows, totals


def _booking_row(b: models.Booking) -> dict:
    return {
        "id": b.id,
        "booking_code": b.booking_code,
        "booking_date": b.booking_date.isoformat(),
        "booking_time": b.booking_time,
        "customer_name": b.customer_name,
        "service_name": b.service_name,
        "list_price": float(b.price or 0),
        "paid_amount": float(b.paid_amount) if b.paid_amount is not None else None,
        "revenue": booking_revenue(b),
    }


@router.get("/revenue")
@limiter.limit("60/minute")
def revenue_report(
    request: Request,
    date_from: date | None = None,
    date_to: date | None = None,
    group: Literal["auto", "day", "month", "year"] = "auto",
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    start, end = _resolve(date_from, date_to)
    grouping = _auto_group(start, end) if group == "auto" else group
    bookings, rows, totals = _collect(db, start, end, grouping)
    return {
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
        "group": grouping,
        "totals": totals,
        "groups": rows,
        "bookings": [_booking_row(b) for b in bookings[:MAX_DETAIL_ROWS]],
        "bookings_truncated": len(bookings) > MAX_DETAIL_ROWS,
    }


@router.get("/revenue.csv")
@limiter.limit("20/minute")
def revenue_report_csv(
    request: Request,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    start, end = _resolve(date_from, date_to)
    bookings, _rows, totals = _collect(db, start, end, "day")
    headers = ["วันที่นัด", "เวลา", "รหัสคิว", "ชื่อลูกค้า", "บริการ", "ราคาตั้ง (บาท)", "ยอดรับจริง (บาท)", "รายได้ที่นับ (บาท)"]
    rows = [
        [b.booking_date.isoformat(), b.booking_time, b.booking_code, b.customer_name, b.service_name,
         float(b.price or 0), float(b.paid_amount) if b.paid_amount is not None else "", booking_revenue(b)]
        for b in bookings
    ]
    rows.append(["รวม", "", "", "", f"{totals['count']} คิว", totals["list_price"], "", totals["revenue"]])
    name = _filename(f"revenue-{start.isoformat()}-to-{end.isoformat()}", "csv")
    return _download(_csv_bytes(headers, rows), name, "text/csv; charset=utf-8")
