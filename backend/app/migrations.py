"""เพิ่มคอลัมน์ใหม่ให้ตารางที่มีอยู่แล้วโดยอัตโนมัติตอนเริ่มเซิร์ฟเวอร์

Base.metadata.create_all() สร้างเฉพาะ "ตารางที่ยังไม่มี" ไม่เพิ่มคอลัมน์ให้ตารางเดิม ถ้าเพิ่มฟิลด์ใหม่ในโมเดลแล้ว deploy ขึ้น
ฐานข้อมูลจริง (Supabase) ที่มีตารางอยู่แล้ว ทุกคำสั่งที่อ่านตารางนั้นจะพังจนกว่าจะมีคนไปรัน ALTER TABLE เอง
(คอลัมน์ก่อนหน้านี้ต้องให้เจ้าของโปรเจกต์รัน SQL เองใน Supabase ดูหมายเหตุใน schema.sql) ไฟล์นี้ทำขั้นตอนนั้นให้อัตโนมัติ:
ตรวจว่าคอลัมน์มีหรือยัง ถ้ายังไม่มีก็ ALTER TABLE ... ADD COLUMN ... DEFAULT ... ให้ ซึ่งปลอดภัยกับข้อมูลเดิม (แถวเดิมได้ค่า default)
และรันซ้ำกี่ครั้งก็ไม่เกิดอะไร ถ้าเพิ่มไม่สำเร็จ (เช่นสิทธิ์ฐานข้อมูลไม่พอ) จะ log ไว้แล้วไปต่อ ไม่ให้เซิร์ฟเวอร์ล้ม
"""

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

log = logging.getLogger("uvicorn.error")

# (ตาราง, คอลัมน์, นิยามคอลัมน์) -- เพิ่มรายการใหม่ต่อท้ายเมื่อมีคอลัมน์ใหม่ในโมเดล ใช้ SQL มาตรฐานที่ทั้ง Postgres และ SQLite รับได้
COLUMN_ADDITIONS = [
    ("shop_settings", "cancel_cutoff_hours", "INTEGER NOT NULL DEFAULT 0"),
]


def ensure_columns(engine: Engine) -> list[str]:
    """เพิ่มคอลัมน์ที่ขาดอยู่ คืนรายชื่อ 'ตาราง.คอลัมน์' ที่เพิ่งเพิ่ม"""
    added: list[str] = []
    inspector = inspect(engine)
    for table, column, definition in COLUMN_ADDITIONS:
        if not inspector.has_table(table):
            continue  # ตารางยังไม่มี create_all จะสร้างให้ครบทุกคอลัมน์เอง
        if column in {c["name"] for c in inspector.get_columns(table)}:
            continue
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
            added.append(f"{table}.{column}")
            log.info("migration: added column %s.%s", table, column)
        except Exception:
            log.exception(
                "migration: เพิ่มคอลัมน์ %s.%s ไม่สำเร็จ -- ฟีเจอร์ที่ใช้คอลัมน์นี้จะยังไม่ทำงาน "
                "แก้ได้โดยรันใน Supabase SQL editor: ALTER TABLE %s ADD COLUMN IF NOT EXISTS %s %s;",
                table, column, table, column, definition,
            )
    return added
