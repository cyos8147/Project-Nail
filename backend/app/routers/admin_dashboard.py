from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin-dashboard"])

COMPLETED = "completed"


def _revenue_between(db: Session, start: date, end: date) -> float:
    total = (
        db.query(func.coalesce(func.sum(models.Booking.price), 0))
        .filter(models.Booking.status == COMPLETED, models.Booking.booking_date.between(start, end))
        .scalar()
    )
    return float(total or 0)


@router.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    today = date.today()
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
