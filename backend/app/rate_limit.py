"""จำกัดจำนวนครั้งที่เรียก endpoint ต่อ IP ต่อช่วงเวลา ป้องกัน brute-force รหัสผ่านแอดมิน และ
สแปมจองคิว/endpoint AI ที่ใช้ compute เยอะ -- ใช้ storage แบบ in-memory (พอสำหรับ backend ที่รันเป็น
process เดียวอย่างที่นี่ ไม่ต้องพึ่ง Redis) เชื่อมกับ FastAPI app จริงใน main.py
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
