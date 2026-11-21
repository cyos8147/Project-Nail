import calendar
from collections import defaultdict
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from .. import rrd
from ..availability import get_shop_settings
from ..database import get_db
from ..security import get_current_admin
from ..timeutil import today_th

router = APIRouter(prefix="/admin", tags=["admin-dashboard"])

COMPLETED = "completed"
OPEN_STATUSES = ("pending", "confirmed")
CLOSED_STATUSES = ("completed", "cancelled", "no_show")
STATUS_KEYS = ("pending", "confirmed", "completed", "cancelled", "no_show")
MAX_CUSTOM_DAYS = 366
DAILY_TREND_MAX_DAYS = 62  # ยาวกว่านี้สรุปรายเดือนแทน ไม่งั้นแท่งแน่นอ่านไม่ออก


def _revenue_between(db: Session, start: date, end: date) -> float:
    total = (
        db.query(func.coalesce(func.sum(models.Booking.price), 0))
        .filter(models.Booking.status == COMPLETED, models.Booking.booking_date.between(start, end))
        .scalar()
    )
    return float(total or 0)


@router.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    today = today_th()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    revenue_today = _revenue_between(db, today, today)
    revenue_month = _revenue_between(db, month_start, today)
    revenue_year = _revenue_between(db, year_start, today)

    bookings_count_month = (
        db.query(func.count(models.Booking.id))
        .filter(models.Booking.status == COMPLETED, models.Booking.booking_date.between(month_start, today))
        .scalar()
        or 0
    )

    top_services_rows = (
        db.query(models.Booking.service_name, func.sum(models.Booking.price).label("revenue"), func.count(models.Booking.id).label("count"))
        .filter(models.Booking.status == COMPLETED, models.Booking.booking_date.between(month_start, today))
        .group_by(models.Booking.service_name)
        .order_by(func.sum(models.Booking.price).desc())
        .limit(5)
        .all()
    )
    top_services = [{"service_name": r[0], "revenue": float(r[1]), "count": r[2]} for r in top_services_rows]

    expenses_month = float(
        db.query(func.coalesce(func.sum(models.Expense.amount), 0))
        .filter(models.Expense.expense_date.between(month_start, today))
        .scalar()
        or 0
    )

    trend_start = today - timedelta(days=29)
    trend_rows = (
        db.query(models.Booking.booking_date, func.sum(models.Booking.price))
        .filter(models.Booking.status == COMPLETED, models.Booking.booking_date.between(trend_start, today))
        .group_by(models.Booking.booking_date)
        .all()
    )
    trend_map = {d.isoformat(): float(v) for d, v in trend_rows}
    revenue_trend = [
        {"date": (trend_start + timedelta(days=i)).isoformat(), "revenue": trend_map.get((trend_start + timedelta(days=i)).isoformat(), 0.0)}
        for i in range(30)
    ]

    popular_rows = (
        db.query(models.Booking.service_name, func.count(models.Booking.id).label("count"))
        .filter(models.Booking.status == COMPLETED)
        .group_by(models.Booking.service_name)
        .order_by(func.count(models.Booking.id).desc())
        .limit(10)
        .all()
    )
    popular_services_report = [{"service_name": r[0], "count": r[1]} for r in popular_rows]

    rating_stats = db.query(func.avg(models.Review.rating), func.count(models.Review.id)).first()
    average_rating = round(float(rating_stats[0] or 0), 2)
    review_count = int(rating_stats[1] or 0)

    return schemas.DashboardSummary(
        revenue_today=revenue_today,
        revenue_month=revenue_month,
        revenue_year=revenue_year,
        bookings_count_month=bookings_count_month,
        top_services=top_services,
        expenses_month=expenses_month,
        net_profit_month=revenue_month - expenses_month,
        revenue_trend=revenue_trend,
        popular_services_report=popular_services_report,
        average_rating=average_rating,
        review_count=review_count,
    )


@router.get("/expenses", response_model=list[schemas.ExpenseOut])
def list_expenses(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    q = db.query(models.Expense)
    if date_from:
        q = q.filter(models.Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(models.Expense.expense_date <= date_to)
    return q.order_by(models.Expense.expense_date.desc()).all()


@router.post("/expenses", response_model=schemas.ExpenseOut, status_code=201)
def create_expense(
    payload: schemas.ExpenseIn, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    expense = models.Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(
    expense_id: str, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)
):
    expense = db.get(models.Expense, expense_id)
    if expense is not None:
        db.delete(expense)
        db.commit()


# ---------------------------------------------------------------------------
# รายงานแบบเลือกช่วงเวลา + เทียบช่วงก่อนหน้า
# ---------------------------------------------------------------------------

THAI_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


def _shift_year(d: date, years: int) -> date:
    try:
        return d.replace(year=d.year + years)
    except ValueError:  # 29 ก.พ.
        return d.replace(year=d.year + years, day=28)


def resolve_window(period: str, today: date, date_from: date | None, date_to: date | None):
    """คืน (start, end, previous_start, previous_end, label)

    เดือนนี้/ปีนี้เทียบกับ "ช่วงเดียวกันของเดือน/ปีก่อน" (วันที่ 1 ถึงวันที่เท่ากัน) ไม่ใช่ช่วงที่เลื่อนลอย
    7/30 วันและกำหนดเองเทียบกับช่วงก่อนหน้าที่ยาวเท่ากันติดกัน
    """
    if period == "custom":
        if date_from is None or date_to is None:
            raise HTTPException(status_code=422, detail="ช่วงกำหนดเองต้องระบุทั้ง date_from และ date_to")
        if date_from > date_to:
            raise HTTPException(status_code=422, detail="วันเริ่มต้องไม่เกินวันสิ้นสุด")
        if (date_to - date_from).days + 1 > MAX_CUSTOM_DAYS:
            raise HTTPException(status_code=422, detail=f"เลือกช่วงได้ไม่เกิน {MAX_CUSTOM_DAYS} วัน")
        start, end = date_from, date_to
        label = "ช่วงที่เลือก"
    elif period == "7d":
        start, end, label = today - timedelta(days=6), today, "7 วันล่าสุด"
    elif period == "30d":
        start, end, label = today - timedelta(days=29), today, "30 วันล่าสุด"
    elif period == "month":
        start, end, label = today.replace(day=1), today, f"{THAI_MONTHS[today.month]} {today.year + 543} (ถึงวันนี้)"
        prev_last = start - timedelta(days=1)
        prev_start = prev_last.replace(day=1)
        prev_end = min(prev_start + timedelta(days=today.day - 1), prev_last)
        return start, end, prev_start, prev_end, label
    elif period == "year":
        start, end, label = today.replace(month=1, day=1), today, f"ปี {today.year + 543} (ถึงวันนี้)"
        return start, end, _shift_year(start, -1), _shift_year(end, -1), label
    else:  # pragma: no cover - Literal กันไว้แล้ว
        raise HTTPException(status_code=422, detail="period ไม่ถูกต้อง")
    days = (end - start).days + 1
    return start, end, start - timedelta(days=days), start - timedelta(days=1), label


def _aggregate(db: Session, start: date, end: date) -> tuple[float, int, float]:
    revenue, completed = (
        db.query(func.coalesce(func.sum(models.Booking.price), 0), func.count(models.Booking.id))
        .filter(models.Booking.status == COMPLETED, models.Booking.booking_date.between(start, end))
        .one()
    )
    expenses = (
        db.query(func.coalesce(func.sum(models.Expense.amount), 0))
        .filter(models.Expense.expense_date.between(start, end))
        .scalar()
    )
    return float(revenue or 0), int(completed or 0), float(expenses or 0)


def _rows_sorted(bucket: dict[str, dict]) -> list[schemas.ReportBreakdownRow]:
    rows = [schemas.ReportBreakdownRow(key=k, **v) for k, v in bucket.items()]
    return sorted(rows, key=lambda r: (-r.revenue, -r.count, r.label))


@router.get("/dashboard/report", response_model=schemas.DashboardReport)
def dashboard_report(
    period: Literal["7d", "30d", "month", "year", "custom"] = "30d",
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    today = today_th()
    start, end, prev_start, prev_end, label = resolve_window(period, today, date_from, date_to)

    revenue, completed_count, expenses = _aggregate(db, start, end)
    prev_revenue, prev_completed, prev_expenses = _aggregate(db, prev_start, prev_end)

    rows = (
        db.query(
            models.Booking.booking_date,
            models.Booking.booking_time,
            models.Booking.status,
            models.Booking.price,
            models.Booking.category_id,
            models.Booking.service_name,
            models.Booking.customer_id,
        )
        .filter(models.Booking.booking_date.between(start, end))
        .all()
    )

    status_counts = {k: 0 for k in STATUS_KEYS}
    by_day_revenue: dict[date, float] = defaultdict(float)
    by_day_count: dict[date, int] = defaultdict(int)
    weekday_demand = [0] * 7
    weekday_revenue = [0.0] * 7
    hour_demand: dict[int, int] = defaultdict(int)
    category_totals: dict[str, dict] = {}
    service_totals: dict[str, dict] = {}
    served_ids: set[str] = set()

    category_names = {c.id: c.name for c in db.query(models.ServiceCategory).all()}

    for booking_date, booking_time, status, price, category_id, service_name, customer_id in rows:
        status_counts[status] = status_counts.get(status, 0) + 1
        price = float(price or 0)
        if status != "cancelled":  # คิวที่ถูกยกเลิกไม่นับเป็นความต้องการจริง
            weekday_demand[booking_date.weekday()] += 1
            try:
                hour_demand[int(booking_time.split(":")[0])] += 1
            except (ValueError, AttributeError):
                pass
        if status == COMPLETED:
            by_day_revenue[booking_date] += price
            by_day_count[booking_date] += 1
            weekday_revenue[booking_date.weekday()] += price
            served_ids.add(customer_id)
            cat = category_totals.setdefault(category_id, {"label": category_names.get(category_id, category_id), "revenue": 0.0, "count": 0})
            cat["revenue"] += price
            cat["count"] += 1
            svc = service_totals.setdefault(service_name, {"label": service_name, "revenue": 0.0, "count": 0})
            svc["revenue"] += price
            svc["count"] += 1

    returning = 0
    if served_ids:
        earlier = {
            r[0]
            for r in db.query(models.Booking.customer_id)
            .filter(models.Booking.status == COMPLETED, models.Booking.booking_date < start)
            .distinct()
            .all()
        }
        returning = len(served_ids & earlier)

    resolved = sum(status_counts[k] for k in CLOSED_STATUSES)
    cancel_rate = round(status_counts["cancelled"] / resolved, 4) if resolved else 0.0
    no_show_rate = round(status_counts["no_show"] / resolved, 4) if resolved else 0.0

    # แนวโน้ม: รายวันถ้าช่วงสั้น รายเดือนถ้ายาว
    span_days = (end - start).days + 1
    if span_days <= DAILY_TREND_MAX_DAYS:
        trend_unit = "day"
        trend = [
            {"date": (start + timedelta(days=i)).isoformat(), "revenue": by_day_revenue.get(start + timedelta(days=i), 0.0), "bookings": by_day_count.get(start + timedelta(days=i), 0)}
            for i in range(span_days)
        ]
    else:
        trend_unit = "month"
        monthly: dict[tuple[int, int], dict] = {}
        cursor = start.replace(day=1)
        while cursor <= end:
            monthly[(cursor.year, cursor.month)] = {"date": cursor.isoformat(), "revenue": 0.0, "bookings": 0}
            cursor = cursor.replace(day=1) + timedelta(days=calendar.monthrange(cursor.year, cursor.month)[1])
        for d, v in by_day_revenue.items():
            monthly[(d.year, d.month)]["revenue"] += v
            monthly[(d.year, d.month)]["bookings"] += by_day_count[d]
        trend = list(monthly.values())

    expense_rows = (
        db.query(models.Expense.category, func.sum(models.Expense.amount), func.count(models.Expense.id))
        .filter(models.Expense.expense_date.between(start, end))
        .group_by(models.Expense.category)
        .all()
    )
    expense_buckets = {(c or "อื่นๆ"): {"label": c or "อื่นๆ", "revenue": float(total or 0), "count": int(n)} for c, total, n in expense_rows}

    upcoming_value, upcoming_count = (
        db.query(func.coalesce(func.sum(models.Booking.price), 0), func.count(models.Booking.id))
        .filter(models.Booking.status.in_(OPEN_STATUSES), models.Booking.booking_date >= today)
        .one()
    )
    today_value, today_count = (
        db.query(func.coalesce(func.sum(models.Booking.price), 0), func.count(models.Booking.id))
        .filter(models.Booking.status.in_(OPEN_STATUSES), models.Booking.booking_date == today)
        .one()
    )

    # คะแนนรีวิวของคิวในช่วงนี้ (ผูกกับวันที่ของคิว)
    rating_stats = (
        db.query(func.avg(models.Review.rating), func.count(models.Review.id))
        .join(models.Booking, models.Booking.id == models.Review.booking_id)
        .filter(models.Booking.booking_date.between(start, end))
        .first()
    )

    average_ticket = revenue / completed_count if completed_count else 0.0
    prev_average_ticket = prev_revenue / prev_completed if prev_completed else 0.0

    return schemas.DashboardReport(
        window=schemas.ReportWindow(start=start, end=end, previous_start=prev_start, previous_end=prev_end, label=label),
        revenue=schemas.ReportKpi(value=revenue, previous=prev_revenue),
        completed_bookings=schemas.ReportKpi(value=completed_count, previous=prev_completed),
        average_ticket=schemas.ReportKpi(value=round(average_ticket, 2), previous=round(prev_average_ticket, 2)),
        expenses=schemas.ReportKpi(value=expenses, previous=prev_expenses),
        net_profit=schemas.ReportKpi(value=revenue - expenses, previous=prev_revenue - prev_expenses),
        status_counts=status_counts,
        cancel_rate=cancel_rate,
        no_show_rate=no_show_rate,
        customers_served=len(served_ids),
        returning_customers=returning,
        upcoming_count=int(upcoming_count or 0),
        upcoming_value=float(upcoming_value or 0),
        today_pending_count=int(today_count or 0),
        today_pending_value=float(today_value or 0),
        trend_unit=trend_unit,
        trend=trend,
        by_category=_rows_sorted(category_totals),
        top_services=_rows_sorted(service_totals)[:8],
        expenses_by_category=_rows_sorted(expense_buckets),
        by_weekday=[{"weekday": i, "bookings": weekday_demand[i], "revenue": weekday_revenue[i]} for i in range(7)],
        by_hour=[{"hour": h, "bookings": hour_demand[h]} for h in sorted(hour_demand)],
        average_rating=round(float(rating_stats[0] or 0), 2) if rating_stats else 0.0,
        review_count=int(rating_stats[1] or 0) if rating_stats else 0,
    )


# ---------------------------------------------------------------------------
# กราฟแบบ RRD (ดู app/rrd.py)
# ---------------------------------------------------------------------------

MAX_RRD_OFFSET = 520  # ย้อนได้ไกลสุด ~10 ปีในมุมมองรายสัปดาห์ กันค่าผิดปกติ


@router.get("/dashboard/rrd")
def dashboard_rrd(
    resolution: Literal["day", "week", "month", "year"] = "day",
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: models.AdminUser = Depends(get_current_admin),
):
    """รายได้และจำนวนคิวที่เสร็จแล้ว แบ่งเป็นช่องตามความละเอียด จำนวนช่องคงที่ เลื่อนย้อนหลังด้วย offset

    ช่องที่ร้านปิดทั้งช่อง (วันหยุดประจำสัปดาห์ตามการตั้งค่าปัจจุบัน หรือวันหยุดพิเศษ) ติดธง closed
    ไม่นับในค่าเฉลี่ย/ต่ำสุด ช่องปัจจุบันที่ยังไม่จบติดธง partial ช่องอนาคตไม่มี (หน้าต่างล่าสุดจบที่วันนี้)
    """
    if not 0 <= offset <= MAX_RRD_OFFSET:
        raise HTTPException(status_code=422, detail="offset ไม่ถูกต้อง")
    today = today_th()
    window = rrd.buckets(resolution, today, offset)
    start, end = window[0].start, window[-1].end

    rows = (
        db.query(models.Booking.booking_date, models.Booking.price)
        .filter(models.Booking.status == COMPLETED, models.Booking.booking_date.between(start, end))
        .all()
    )
    settings = get_shop_settings(db)
    closed_weekdays = set(settings.closed_weekdays or [])  # แบบ JS: 0=อาทิตย์
    holidays = {
        h.holiday_date
        for h in db.query(models.ShopHoliday).filter(models.ShopHoliday.holiday_date.between(start, end)).all()
    }

    def is_closed(d: date) -> bool:
        return (d.weekday() + 1) % 7 in closed_weekdays or d in holidays

    out, revenue_values, count_values, usable = [], [], [], []
    for b in window:
        revenue = sum(float(p or 0) for d, p in rows if b.start <= d <= b.end)
        count = sum(1 for d, _p in rows if b.start <= d <= b.end)
        last_day = min(b.end, today)
        days = [b.start + timedelta(days=i) for i in range((last_day - b.start).days + 1)] if b.start <= today else []
        open_days = sum(1 for d in days if not is_closed(d))
        closed = bool(days) and open_days == 0 and count == 0
        out.append({
            "start": b.start.isoformat(),
            "end": b.end.isoformat(),
            "label": b.label,
            "revenue": revenue,
            "bookings": count,
            "open_days": open_days,
            "closed": closed,
            "partial": b.start <= today < b.end,
        })
        revenue_values.append(revenue)
        count_values.append(float(count))
        usable.append(not closed)

    return {
        "resolution": resolution,
        "offset": offset,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "buckets": out,
        "summary": {"revenue": rrd.summarize(revenue_values, usable), "bookings": rrd.summarize(count_values, usable)},
        "has_older": offset < MAX_RRD_OFFSET,
    }
