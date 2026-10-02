"""จำกัดจำนวนครั้งที่เรียก endpoint ต่อ IP ต่อช่วงเวลา ป้องกัน brute-force รหัสผ่านแอดมิน และ
สแปมจองคิว/endpoint AI ที่ใช้ compute เยอะ -- ใช้ storage แบบ in-memory (พอสำหรับ backend ที่รันเป็น
process เดียวอย่างที่นี่ ไม่ต้องพึ่ง Redis) เชื่อมกับ FastAPI app จริงใน main.py

IP ของลูกค้า: บน Render คำขอวิ่งผ่านระบบกลางของ Render (อยู่หลัง Cloudflare) ก่อนถึงแอป ผู้ที่ต่อเข้ามาตรงๆ จึงเป็นเครื่อง
ภายในของ Render ไม่ใช่ลูกค้า ถ้านับตามนั้น ลูกค้าทุกคนจะถูกนับเป็นคนเดียวกัน (จำลองแล้ว: 8 คนคนละเครื่อง คนที่ 6 เป็นต้นไปโดนบล็อก
เหมือนคนเดียว) ทำให้เวลามีคนใช้พร้อมกัน AI/จองคิวขึ้น "ถี่เกินไป" และคนเดารหัสแอดมินทำให้เจ้าของล็อกอินไม่ได้ จึงอ่าน IP จริงจาก header
ที่ระบบกลางใส่มา -- แต่เชื่อ header เฉพาะเมื่อผู้ต่อโดยตรงเป็นเครือข่ายภายใน (เครื่องข้างนอกต่อตรงเข้ามาที่แอปไม่ได้) ถ้าเป็น IP สาธารณะ
จะไม่เชื่อ header ใดๆ กันคนปลอม header มาหลบ limit
"""

import ipaddress
import logging

from fastapi import Request
from slowapi import Limiter

from .config import get_settings

log = logging.getLogger("uvicorn.error")  # logger ตัวนี้ uvicorn ตั้งให้พิมพ์ขึ้น Render Logs อยู่แล้ว
_debug_lines_left = 6  # พิมพ์ header ที่ได้รับ 6 ครั้งแรกหลังเซิร์ฟเวอร์เริ่ม ไว้ตรวจใน Logs ว่าอ่าน IP ถูก (ไม่ใช่ทุกคำขอ)


def _is_internal(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    # ไม่ใช่ IP สาธารณะ = วงภายใน (10.x, 192.168.x, 127.x, 100.64.x ของ carrier-grade NAT ฯลฯ) ซึ่งแพลตฟอร์มโฮสต์ใช้ต่อเข้ามาหาแอป
    return not ip.is_global


def _clean_ip(value: str) -> str | None:
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


def client_ip(request: Request) -> str:
    """IP ของลูกค้าจริงสำหรับนับ rate limit"""
    global _debug_lines_left
    peer = (request.client.host if request.client else None) or "127.0.0.1"
    if not _is_internal(peer):
        return peer

    cf = _clean_ip(request.headers.get("cf-connecting-ip", ""))
    forwarded = [part.strip() for part in request.headers.get("x-forwarded-for", "").split(",") if part.strip()]
    hops = get_settings().trusted_proxy_hops

    chosen = None
    if hops > 0 and len(forwarded) >= hops:
        chosen = _clean_ip(forwarded[-hops])
    if chosen is None:
        chosen = cf

    if _debug_lines_left > 0:
        _debug_lines_left -= 1
        log.info(
            "rate-limit client key: peer=%s cf-connecting-ip=%s x-forwarded-for=%s trusted_proxy_hops=%d -> %s",
            peer, cf, forwarded, hops, chosen or peer,
        )
    return chosen or peer


limiter = Limiter(key_func=client_ip)
