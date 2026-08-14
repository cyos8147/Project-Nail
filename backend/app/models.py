import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), default="")
    role: Mapped[str] = mapped_column(String(16), default="owner")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ShopSettings(Base):
    __tablename__ = "shop_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    shop_name: Mapped[str] = mapped_column(String(120), default="NailGlow")
    phone: Mapped[str] = mapped_column(String(32), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    line_oa_basic_id: Mapped[str] = mapped_column(String(64), default="")
    opening_time: Mapped[str] = mapped_column(String(8), default="10:00")
    closing_time: Mapped[str] = mapped_column(String(8), default="19:00")
    slot_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    closed_weekdays: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShopHoliday(Base):
    __tablename__ = "shop_holidays"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    holiday_date: Mapped[Date] = mapped_column(Date, unique=True, nullable=False)
    note: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # 'hair' | 'nail'
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    icon: Mapped[str] = mapped_column(String(16), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    services: Mapped[list["Service"]] = relationship(back_populates="category")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    category_id: Mapped[str] = mapped_column(ForeignKey("service_categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_color_service: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category: Mapped[ServiceCategory] = relationship(back_populates="services")


class NailDesign(Base):
    __tablename__ = "nail_designs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    complexity: Mapped[str] = mapped_column(String(16), default="simple")  # simple|medium|complex
    style_tag: Mapped[str] = mapped_column(String(16), default="classic")  # minimal|classic|bold
    color_hex: Mapped[str] = mapped_column(String(16), default="#B5793A")
    tone_fit: Mapped[dict] = mapped_column(JSON, default=lambda: {"warm": 70, "cool": 70, "neutral": 70})
    popularity: Mapped[int] = mapped_column(Integer, default=50)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    phone: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), default="")
    line_id: Mapped[str] = mapped_column(String(64), default="")
    line_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="customer")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    booking_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False)
    category_id: Mapped[str] = mapped_column(ForeignKey("service_categories.id"), nullable=False)
    service_id: Mapped[str | None] = mapped_column(ForeignKey("services.id"), nullable=True)
    service_name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    shade_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    shade_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    nail_design_id: Mapped[str | None] = mapped_column(ForeignKey("nail_designs.id"), nullable=True)
    reference_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_style_tag: Mapped[str | None] = mapped_column(String(16), nullable=True)
    ai_extra_minutes: Mapped[int] = mapped_column(Integer, default=0)
    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    booking_date: Mapped[Date] = mapped_column(Date, nullable=False)
    booking_time: Mapped[str] = mapped_column(String(8), nullable=False)  # 'HH:MM'
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    line_id: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(16), default="pending")
    admin_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer: Mapped[Customer] = relationship(back_populates="bookings")
    review: Mapped["Review"] = relationship(back_populates="booking", uselist=False)


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), unique=True, nullable=False)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str] = mapped_column(Text, default="")
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    booking: Mapped[Booking] = relationship(back_populates="review")


class AiTryonHistory(Base):
    __tablename__ = "ai_tryon_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    customer_id: Mapped[str | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    nail_design_id: Mapped[str | None] = mapped_column(ForeignKey("nail_designs.id"), nullable=True)
    color_hex: Mapped[str | None] = mapped_column(String(16), nullable=True)
    pattern: Mapped[str | None] = mapped_column(String(32), nullable=True)
    nail_shape: Mapped[str | None] = mapped_column(String(32), nullable=True)
    skin_tone: Mapped[str | None] = mapped_column(String(16), nullable=True)
    segmentation_engine: Mapped[str] = mapped_column(String(32), default="mediapipe+opencv")
    booking_id: Mapped[str | None] = mapped_column(ForeignKey("bookings.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AiRecommendLog(Base):
    __tablename__ = "ai_recommend_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    customer_id: Mapped[str | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    skin_tone: Mapped[str] = mapped_column(String(16), nullable=False)
    nail_shape: Mapped[str] = mapped_column(String(32), nullable=False)
    nail_length: Mapped[str] = mapped_column(String(16), nullable=False)
    style_preference: Mapped[str] = mapped_column(String(16), nullable=False)
    occasion: Mapped[str] = mapped_column(String(32), nullable=False)
    recommended_design_id: Mapped[str | None] = mapped_column(ForeignKey("nail_designs.id"), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    expense_date: Mapped[Date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="อื่นๆ")
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LineNotifyLog(Base):
    __tablename__ = "line_notify_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    booking_id: Mapped[str | None] = mapped_column(ForeignKey("bookings.id"), nullable=True)
    message_type: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="sent")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
