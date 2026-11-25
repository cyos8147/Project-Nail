"""สำรองและกู้คืนข้อมูลแบบครบถ้วน (ส่วนที่ 6)

ทำไมไม่ใช้ CSV: ไฟล์ CSV ใน export.py ออกแบบให้คนอ่านและเปิดใน Excel ไม่มีรหัสภายในของแถว
กู้คืนจาก CSV จึงเดาความสัมพันธ์ระหว่างตาราง (ลูกค้า บริการ คิว รีวิว) ได้ไม่ครบและผิดได้ง่าย

ไฟล์สำรองแบบกู้คืนได้ = zip ที่มี backup.json ตัวเดียว เก็บทุกคอลัมน์ของตารางหลักพร้อมรหัสเดิม
- ก่อนกู้คืนระบบตรวจไฟล์ก่อน (preview) และไม่แตะฐานข้อมูลจนกว่าผู้ใช้จะยืนยัน
- การกู้คืนทำในธุรกรรมเดียว ถ้ามีข้อผิดพลาดกลางทางจะย้อนกลับทั้งหมด ข้อมูลเดิมไม่หาย
- ตารางผู้ดูแลระบบ (admin_users) ไม่รวมในไฟล์ และไม่ถูกแตะตอนกู้คืน เพื่อไม่ให้เจ้าของร้านล็อกตัวเองออก
- ตารางประวัติ AI และ log ไม่รวม เมื่อกู้คืน ลิงก์จากตารางเหล่านั้นไปยังคิว/ลูกค้า จะถูกตัดออกเพื่อให้ผ่านข้อจำกัดของฐานข้อมูล
"""

import base64
import binascii
import io
import json
import zipfile
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy import Date, DateTime, Numeric, delete, update
from sqlalchemy.orm import Session

from . import models

FORMAT = "luckysalon-full-backup"
VERSION = 1
MAX_ZIP_BYTES = 20 * 1024 * 1024  # ไฟล์ที่อัปโหลดกลับมาได้ไม่เกิน 20 MB
MAX_JSON_BYTES = 100 * 1024 * 1024  # ขนาดหลังแตกไฟล์ ป้องกันไฟล์ zip ที่ย่อขนาดไว้แต่แตกเป็นก้อนใหญ่
CONFIRM_PHRASE = "กู้คืน"

# ตารางที่รวมในไฟล์สำรอง เรียงจาก "พ่อแม่" ไป "ลูก" (ใช้เป็นลำดับการเขียนกลับ ส่วนการลบใช้ลำดับย้อนกลับ)
TABLES: list[tuple[str, type]] = [
    ("shop_settings", models.ShopSettings),
    ("shop_holidays", models.ShopHoliday),
    ("shop_line_recipients", models.ShopLineRecipient),
    ("service_categories", models.ServiceCategory),
    ("services", models.Service),
    ("nail_designs", models.NailDesign),
    ("customers", models.Customer),
    ("bookings", models.Booking),
    ("reviews", models.Review),
    ("expenses", models.Expense),
]
REQUIRED = {"shop_settings", "service_categories", "services", "customers", "bookings"}


class BackupError(ValueError):
    """ไฟล์สำรองใช้ไม่ได้ พร้อมข้อความอธิบายภาษาไทยให้แอดมินเห็น"""


def _to_json_value(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def _from_column(column, value):
    """แปลงค่า JSON กลับเป็นชนิดของคอลัมน์ (วันที่ ทศนิยม) ตามที่ฐานข้อมูลคาดหวัง"""
    if value is None:
        return None
    if isinstance(column.type, DateTime):
        return datetime.fromisoformat(value)
    if isinstance(column.type, Date):
        return date.fromisoformat(value)
    if isinstance(column.type, Numeric):
        return Decimal(str(value))
    return value


def export_rows(db: Session) -> dict:
    data = {}
    for name, model in TABLES:
        cols = [c.key for c in model.__table__.columns]
        rows = []
        for obj in db.query(model).all():
            rows.append({key: _to_json_value(getattr(obj, key)) for key in cols})
        data[name] = rows
    return {
        "format": FORMAT,
        "version": VERSION,
        "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "counts": {name: len(rows) for name, rows in data.items()},
        "tables": data,
    }


def _json_default(value):
    """ค่าที่ json มาตรฐานแปลงเองไม่ได้ (ทศนิยม วันเวลา ไบต์ ฯลฯ) -- กันไม่ให้การสำรองทั้งก้อนล้มเพราะค่าเดียว"""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (bytes, bytearray)):
        return base64.b64encode(bytes(value)).decode("ascii")
    if isinstance(value, (set, tuple)):
        return list(value)
    return str(value)


def build_zip(payload: dict) -> bytes:
    buffer = io.BytesIO()
    body = json.dumps(payload, ensure_ascii=False, indent=1, default=_json_default).encode("utf-8")
    readme = (
        "ไฟล์สำรองข้อมูล Lucky Salon (กู้คืนได้)\n"
        "เก็บไฟล์นี้ไว้ในที่ปลอดภัย ไฟล์มีชื่อและเบอร์โทรลูกค้า ห้ามเผยแพร่\n"
        "ใช้กู้คืนได้ที่หน้าแอดมิน > ตั้งค่าร้าน > สำรองข้อมูล\n"
        "ไฟล์ .csv จากเมนูดาวน์โหลดทีละตาราง ใช้เปิดใน Excel เท่านั้น กู้คืนจากไฟล์นั้นไม่ได้\n"
    ).encode("utf-8")
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("backup.json", body)
        archive.writestr("README.txt", readme)
    return buffer.getvalue()


def read_zip(file_base64: str) -> dict:
    """อ่านไฟล์สำรองจาก base64 แล้วคืน payload ที่ตรวจโครงสร้างเบื้องต้นแล้ว"""
    try:
        raw = base64.b64decode(file_base64, validate=True)
    except (binascii.Error, ValueError):
        raise BackupError("ไฟล์ไม่ถูกต้อง อัปโหลดใหม่อีกครั้ง")
    if len(raw) > MAX_ZIP_BYTES:
        raise BackupError("ไฟล์ใหญ่เกิน 20 MB ไม่ใช่ไฟล์สำรองของร้านหรือเปล่า")
    try:
        archive = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        raise BackupError("ไฟล์นี้ไม่ใช่ไฟล์ .zip ที่สำรองจากระบบ")
    names = archive.namelist()
    if "backup.json" not in names:
        if any(n.endswith(".csv") for n in names):
            raise BackupError(
                "นี่คือไฟล์สำรองแบบ CSV (ไว้เปิดดูใน Excel) กู้คืนไม่ได้ "
                "ให้ใช้ไฟล์ที่ดาวน์โหลดจากปุ่ม 'สำรองข้อมูลแบบกู้คืนได้'"
            )
        raise BackupError("ไม่พบไฟล์ backup.json ในไฟล์ที่อัปโหลด")
    info = archive.getinfo("backup.json")
    if info.file_size > MAX_JSON_BYTES:
        raise BackupError("ข้อมูลในไฟล์ใหญ่เกินที่รองรับ")
    try:
        payload = json.loads(archive.read("backup.json").decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise BackupError("ไฟล์ backup.json เสียหาย อ่านไม่ได้")
    if not isinstance(payload, dict) or payload.get("format") != FORMAT:
        raise BackupError("ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Lucky Salon")
    if payload.get("version") != VERSION:
        raise BackupError(f"ไฟล์นี้เป็นรุ่น {payload.get('version')} ระบบรองรับเฉพาะรุ่น {VERSION}")
    tables = payload.get("tables")
    if not isinstance(tables, dict):
        raise BackupError("โครงสร้างไฟล์สำรองไม่ถูกต้อง")
    missing = REQUIRED - set(tables)
    if missing:
        raise BackupError("ไฟล์สำรองไม่ครบตาราง: " + ", ".join(sorted(missing)))
    return payload


def _check_rows(name: str, model, rows) -> tuple[list[dict], list[str]]:
    """แปลงแถวของตารางหนึ่งเป็นค่าพร้อมเขียน และคืนรายการปัญหาที่พบ (สูงสุด 5 ข้อต่อตาราง)"""
    problems: list[str] = []
    columns = {c.key: c for c in model.__table__.columns}
    required = {k for k, c in columns.items() if not c.nullable and c.default is None and c.server_default is None}
    clean: list[dict] = []
    if not isinstance(rows, list):
        return [], [f"{name}: รูปแบบข้อมูลไม่ถูกต้อง"]
    seen_pk: set = set()
    pk = next(iter(model.__table__.primary_key.columns)).key
    for i, row in enumerate(rows, start=1):
        if len(problems) >= 5:
            problems.append(f"{name}: มีปัญหาอีกหลายแถว (แสดงแค่ 5 ข้อแรก)")
            break
        if not isinstance(row, dict):
            problems.append(f"{name} แถวที่ {i}: รูปแบบไม่ถูกต้อง")
            continue
        absent = required - set(row)
        if absent:
            problems.append(f"{name} แถวที่ {i}: ขาดข้อมูล {', '.join(sorted(absent))}")
            continue
        try:
            values = {k: _from_column(columns[k], row[k]) for k in columns if k in row}
        except (ValueError, TypeError, InvalidOperation):
            problems.append(f"{name} แถวที่ {i}: รูปแบบวันที่หรือตัวเลขผิด")
            continue
        if values.get(pk) in seen_pk:
            problems.append(f"{name} แถวที่ {i}: รหัสซ้ำกับแถวอื่น")
            continue
        seen_pk.add(values.get(pk))
        clean.append(values)
    return clean, problems


def validate(payload: dict) -> dict:
    """ตรวจไฟล์ทั้งหมดโดยยังไม่แตะฐานข้อมูล คืน {ok, counts, problems, created_at, parsed}"""
    problems: list[str] = []
    parsed: dict[str, list[dict]] = {}
    counts: dict[str, int] = {}
    for name, model in TABLES:
        rows = payload["tables"].get(name, [])
        clean, errs = _check_rows(name, model, rows)
        parsed[name] = clean
        counts[name] = len(clean)
        problems.extend(errs)

    # ความสัมพันธ์ระหว่างตาราง: ทุกลิงก์ต้องชี้ไปยังแถวที่มีอยู่ในไฟล์เดียวกัน
    ids = {name: {r[next(iter(model.__table__.primary_key.columns)).key] for r in parsed[name]} for name, model in TABLES}
    links = [
        ("services", "category_id", "service_categories"),
        ("bookings", "customer_id", "customers"),
        ("bookings", "category_id", "service_categories"),
        ("bookings", "service_id", "services"),
        ("bookings", "nail_design_id", "nail_designs"),
        ("reviews", "booking_id", "bookings"),
        ("reviews", "customer_id", "customers"),
    ]
    for table, column, target in links:
        broken = [r for r in parsed[table] if r.get(column) is not None and r[column] not in ids[target]]
        if broken:
            problems.append(f"{table}: {len(broken)} แถวอ้างอิงข้อมูลที่ไม่มีในไฟล์ ({column} → {target})")

    created = payload.get("created_at")
    return {
        "ok": not problems,
        "counts": counts,
        "problems": problems[:20],
        "created_at": created,
        "parsed": parsed,
    }


def restore(db: Session, parsed: dict[str, list[dict]]) -> dict[str, int]:
    """ทับข้อมูลทั้งหมดด้วยข้อมูลจากไฟล์ ในธุรกรรมเดียว (ล้มเหลวแล้วย้อนกลับทั้งหมด)"""
    models_by_name = dict(TABLES)
    try:
        # ตัดลิงก์จากตารางที่ไม่ได้อยู่ในไฟล์สำรอง เพื่อให้ลบตารางหลักได้
        db.execute(update(models.AiTryonHistory).values(booking_id=None, customer_id=None, nail_design_id=None))
        db.execute(update(models.AiRecommendLog).values(customer_id=None, recommended_design_id=None))
        db.execute(update(models.LineNotifyLog).values(booking_id=None))
        # ลบจากลูกไปพ่อ
        for name, model in reversed(TABLES):
            if name == "shop_settings":
                continue  # ตั้งค่าร้านเป็นแถวเดียว (id=1) จะอัปเดตทับด้านล่าง
            db.execute(delete(model))
        # เขียนจากพ่อไปลูก
        counts = {}
        for name, model in TABLES:
            rows = parsed[name]
            counts[name] = len(rows)
            if name == "shop_settings":
                for values in rows:
                    existing = db.get(model, values["id"])
                    if existing is None:
                        db.add(model(**values))
                    else:
                        for key, value in values.items():
                            setattr(existing, key, value)
                continue
            for values in rows:
                db.add(model(**values))
            db.flush()
        db.commit()
        return counts
    except Exception:
        db.rollback()
        raise
