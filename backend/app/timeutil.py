"""เวลาไทยสำหรับทั้งระบบ

เซิร์ฟเวอร์ (Render) ตั้งนาฬิกาเป็น UTC ซึ่งช้ากว่าไทย 7 ชั่วโมง แต่เวลาเปิดร้าน/รอบจองทั้งหมดเป็นเวลาไทย
ถ้าใช้ datetime.now() / date.today() ตรงๆ จะได้เวลา UTC ทำให้ตอนบ่าย 2 โมงระบบยังเปิดให้จองรอบ 10 โมงเช้าของวันนี้ได้
จึงให้ทุกที่ที่ต้องรู้ "ตอนนี้กี่โมง/วันนี้วันที่เท่าไหร่" เรียกจากไฟล์นี้แทน (ไทยไม่มี daylight saving เลยใช้ offset +7 ตายตัวได้
ไม่ต้องพึ่งฐานข้อมูล timezone ในระบบ)
"""

from datetime import date, datetime, timedelta, timezone

THAILAND_TZ = timezone(timedelta(hours=7))


def now_th() -> datetime:
    """เวลาปัจจุบันตามเวลาไทย (ไม่มี tzinfo ติดมา เทียบกับเวลารอบจองที่เก็บเป็น 'HH:MM' ได้ตรงๆ)"""
    return datetime.now(THAILAND_TZ).replace(tzinfo=None)


def today_th() -> date:
    return now_th().date()
