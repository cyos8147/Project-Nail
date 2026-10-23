from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings

settings = get_settings()

# PostgreSQL: ถ้าต่อ Supabase ไม่ได้ (เช่น โปรเจกต์ถูกพัก) ให้ล้มภายใน 10 วินาที แทนที่จะค้างจนหน้าเว็บรอไม่รู้จบ
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {"connect_timeout": 10}
# pool_pre_ping: เช็กการเชื่อมต่อเก่าในพูลก่อนใช้ หลัง Supabase รีสตาร์ตหรือกู้คืน คำขอแรกจะได้ไม่ error
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
