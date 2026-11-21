"""กราฟแบบ RRD (Round Robin Database) สำหรับแดชบอร์ดรายได้

แนวคิดแบบ RRDtool: แต่ละความละเอียด (รายวัน/สัปดาห์/เดือน/ปี) มี "จำนวนช่องคงที่" ช่องใหม่สุดอยู่ขวาสุด
เลื่อนดูย้อนหลังทีละหน้าต่าง และสรุปค่า ล่าสุด/เฉลี่ย/สูงสุด/ต่ำสุด ใต้กราฟ

ต่างจาก RRDtool จริงตรงที่ไม่ได้สร้างตารางวงกลมเก็บค่าไว้ แต่คำนวณสดจากรายการจองทุกครั้ง
(ร้านมีข้อมูลไม่มาก และใช้ฐานข้อมูลฟรีที่พื้นที่จำกัด จึงไม่ควรเก็บข้อมูลซ้ำ) ผลจึงตรงกับรายการจองเสมอ
"""

import calendar
from dataclasses import dataclass
from datetime import date, timedelta

BUCKETS = {"day": 30, "week": 12, "month": 12, "year": 5}
THAI_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


@dataclass
class Bucket:
    start: date
    end: date  # รวมวันสุดท้าย
    label: str


def _add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    return date(d.year + m // 12, m % 12 + 1, 1)


def _bucket_for(resolution: str, d: date) -> Bucket:
    if resolution == "day":
        return Bucket(d, d, f"{d.day} {THAI_MONTHS[d.month]}")
    if resolution == "week":
        start = d - timedelta(days=d.weekday())  # สัปดาห์เริ่มวันจันทร์
        end = start + timedelta(days=6)
        return Bucket(start, end, f"{start.day} {THAI_MONTHS[start.month]}")
    if resolution == "month":
        start = d.replace(day=1)
        end = start.replace(day=calendar.monthrange(start.year, start.month)[1])
        return Bucket(start, end, f"{THAI_MONTHS[start.month]} {str(start.year + 543)[-2:]}")
    if resolution == "year":
        return Bucket(date(d.year, 1, 1), date(d.year, 12, 31), str(d.year + 543))
    raise ValueError(resolution)


def _previous_start(resolution: str, b: Bucket) -> date:
    if resolution == "day":
        return b.start - timedelta(days=1)
    if resolution == "week":
        return b.start - timedelta(days=7)
    if resolution == "month":
        return _add_months(b.start, -1)
    return date(b.start.year - 1, 1, 1)


def buckets(resolution: str, today: date, offset: int = 0) -> list[Bucket]:
    """ช่องของหน้าต่างที่ offset (0 = หน้าต่างล่าสุดที่จบที่ช่องของวันนี้, 1 = หน้าต่างก่อนหน้า ฯลฯ)
    เรียงจากเก่าไปใหม่ จำนวนช่องคงที่ตาม BUCKETS"""
    n = BUCKETS[resolution]
    current = _bucket_for(resolution, today)
    for _ in range(offset * n):  # ย้อนกลับทีละช่องจนถึงช่องขวาสุดของหน้าต่างที่ต้องการ
        current = _bucket_for(resolution, _previous_start(resolution, current))
    out = [current]
    while len(out) < n:
        out.append(_bucket_for(resolution, _previous_start(resolution, out[-1])))
    return list(reversed(out))


def summarize(values: list[float], usable: list[bool]) -> dict:
    """ล่าสุด/เฉลี่ย/สูงสุด/ต่ำสุด แบบ RRDtool (LAST/AVERAGE/MAX/MIN) นับเฉพาะช่องที่ร้านเปิด
    คืน index ของช่องสูงสุด/ต่ำสุดไว้ให้หน้าเว็บไฮไลต์"""
    idx = [i for i, ok in enumerate(usable) if ok]
    if not idx:
        return {"last": 0.0, "average": 0.0, "max": 0.0, "min": 0.0, "max_index": None, "min_index": None, "last_index": None}
    max_i = max(idx, key=lambda i: (values[i], i))
    min_i = min(idx, key=lambda i: (values[i], -i))
    return {
        "last": values[idx[-1]],
        "average": round(sum(values[i] for i in idx) / len(idx), 2),
        "max": values[max_i],
        "min": values[min_i],
        "max_index": max_i,
        "min_index": min_i,
        "last_index": idx[-1],
    }
