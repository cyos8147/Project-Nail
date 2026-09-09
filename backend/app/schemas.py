from datetime import date, datetime
from datetime import time as time_type
from typing import Annotated, Optional
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, Field


def _uuid_to_str(value):
    if value is None:
        return value
    return str(value) if isinstance(value, UUID) else value


def _time_to_str(value):
    if value is None:
        return value
    return value.strftime("%H:%M") if isinstance(value, time_type) else value


UUIDStr = Annotated[str, BeforeValidator(_uuid_to_str)]
OptionalUUIDStr = Annotated[Optional[str], BeforeValidator(_uuid_to_str)]
TimeStr = Annotated[str, BeforeValidator(_time_to_str)]


class ServiceCategoryOut(BaseModel):
    id: str
    name: str
    icon: str
    sort_order: int

    class Config:
        from_attributes = True


class ServiceOut(BaseModel):
    id: UUIDStr
    category_id: str
    name: str
    description: str
    price: float
    duration_minutes: int
    is_color_service: bool
    active: bool

    class Config:
        from_attributes = True


class ServiceIn(BaseModel):
    category_id: str
    name: str
    description: str = ""
    price: float
    duration_minutes: int
    is_color_service: bool = False
    active: bool = True
    sort_order: int = 0


class NailDesignOut(BaseModel):
    id: UUIDStr
    name: str
    price: float
    duration_minutes: int
    complexity: str
    style_tag: str
    color_hex: str
    tone_fit: dict
    popularity: int
    image_url: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True


class NailDesignIn(BaseModel):
    name: str
    price: float
    duration_minutes: int
    complexity: str = "simple"
    style_tag: str = "classic"
    color_hex: str = "#B5793A"
    tone_fit: dict = Field(default_factory=lambda: {"warm": 70, "cool": 70, "neutral": 70})
    popularity: int = 50
    image_url: Optional[str] = None
    active: bool = True


class ShopSettingsOut(BaseModel):
    shop_name: str
    phone: str
    address: str
    line_oa_basic_id: str
    opening_time: TimeStr
    closing_time: TimeStr
    slot_interval_minutes: int
    closed_weekdays: list[int]


class ShopSettingsIn(BaseModel):
    shop_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    line_oa_basic_id: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    slot_interval_minutes: Optional[int] = None
    closed_weekdays: Optional[list[int]] = None


class HolidayOut(BaseModel):
    id: UUIDStr
    holiday_date: date
    note: str

    class Config:
        from_attributes = True


class HolidayIn(BaseModel):
    holiday_date: date
    note: str = ""


class BookingCreate(BaseModel):
    category_id: str
    service_id: str
    shade_id: Optional[str] = None
    shade_name: Optional[str] = None
    nail_design_id: Optional[str] = None
    reference_image_base64: Optional[str] = None
    ai_style_tag: Optional[str] = None
    ai_extra_minutes: int = 0
    booking_date: date
    booking_time: str
    customer_name: str
    customer_phone: str
    line_id: str = ""


class BookingOut(BaseModel):
    id: UUIDStr
    booking_code: str
    category_id: str
    service_id: OptionalUUIDStr
    service_name: str
    price: float
    shade_id: Optional[str]
    shade_name: Optional[str]
    nail_design_id: OptionalUUIDStr
    reference_image_url: Optional[str]
    ai_style_tag: Optional[str]
    ai_extra_minutes: int
    estimated_duration_minutes: int
    booking_date: date
    booking_time: TimeStr
    customer_name: str
    customer_phone: str
    line_id: str
    status: str
    admin_note: str
    created_at: datetime

    class Config:
        from_attributes = True


class BookingStatusUpdate(BaseModel):
    status: str
    admin_note: Optional[str] = None


class BookingReschedule(BaseModel):
    phone: str
    booking_date: date
    booking_time: str


class AvailabilityOut(BaseModel):
    date: date
    is_open: bool
    slots: list[dict]


class ReviewCreate(BaseModel):
    booking_code: str
    customer_phone: str
    rating: int = Field(ge=1, le=5)
    comment: str = ""
    photo_base64: Optional[str] = None


class ReviewOut(BaseModel):
    id: UUIDStr
    booking_id: UUIDStr
    rating: int
    comment: str
    photo_url: Optional[str]
    created_at: datetime
    customer_name: Optional[str] = None
    service_name: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerHistoryOut(BaseModel):
    customer: dict
    bookings: list[BookingOut]
    reviews: list[ReviewOut]
    tryon_history: list[dict]


class AdminLoginIn(BaseModel):
    username: str
    password: str


class AdminLoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    full_name: str
    role: str


class AdminChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class SegmentRequest(BaseModel):
    image_base64: str


class SegmentResult(BaseModel):
    finger: str
    matched: bool
    center: dict
    length: float
    width: float
    angle_deg: float


class SegmentResponse(BaseModel):
    image_width: int
    image_height: int
    skin_tone: str
    nails: list[SegmentResult]
    engine: str


class TryOnRequest(BaseModel):
    image_base64: str
    color_hex: str = "#B5793A"
    pattern: str = "solid"
    nail_shape: str = "round"
    save: bool = False
    customer_phone: Optional[str] = None


class TryOnResponse(BaseModel):
    result_image_base64: str
    skin_tone: str
    nails_detected: int
    engine: str
    history_id: OptionalUUIDStr = None


class RecommendRequest(BaseModel):
    skin_tone: str
    nail_shape: str
    nail_length: str
    style_preference: str
    occasion: str
    customer_phone: Optional[str] = None


class RecommendItem(BaseModel):
    design: NailDesignOut
    match_score: float


class RecommendResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    log_id: UUIDStr
    recommendations: list[RecommendItem]
    model_metrics: dict


class ReferenceStyleRequest(BaseModel):
    image_base64: str


class ReferenceStyleResponse(BaseModel):
    style_tag: str
    saturation: float
    variance: float
    extra_minutes: int
    similar_designs: list[NailDesignOut]


class ExpenseIn(BaseModel):
    expense_date: date
    category: str = "อื่นๆ"
    amount: float
    note: str = ""


class ExpenseOut(ExpenseIn):
    id: UUIDStr

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    revenue_today: float
    revenue_month: float
    revenue_year: float
    bookings_count_month: int
    top_services: list[dict]
    expenses_month: float
    net_profit_month: float
    revenue_trend: list[dict]
    popular_services_report: list[dict]
    average_rating: float
    review_count: int
