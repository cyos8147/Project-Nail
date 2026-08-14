from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    app_name: str = "NailGlow Booking API"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Database ---
    # ปล่อยว่างไว้ = ใช้ SQLite ในเครื่อง (backend/nailglow.db) สำหรับ dev/test
    # ใน production ให้ตั้งเป็น Postgres connection string ของ Supabase
    # (Project Settings > Database > Connection string > URI ในหน้าเว็บ Supabase)
    database_url: str = "sqlite:///./nailglow.db"

    # --- Supabase (ใช้สำหรับ Storage เป็นหลัก — DB ต่อผ่าน database_url ด้านบน) ---
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_bucket_booking_refs: str = "booking-references"
    supabase_bucket_tryon: str = "tryon-results"
    supabase_bucket_reviews: str = "review-photos"

    # --- Auth ---
    jwt_secret: str = "change-this-secret-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12

    # --- Seed admin account (สร้างอัตโนมัติตอนเริ่มระบบครั้งแรกถ้ายังไม่มี admin ในระบบ) ---
    seed_admin_username: str = "owner"
    seed_admin_password: str = "changeme123"

    # --- LINE Messaging API ---
    line_channel_access_token: str = ""
    line_channel_secret: str = ""

    # --- AI ---
    yolo_nail_seg_weights: str = "ml/models/yolov8_nail_seg.pt"
    xgboost_model_path: str = "ml/models/nail_recommender.json"
    xgboost_encoders_path: str = "ml/models/nail_recommender_encoders.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
