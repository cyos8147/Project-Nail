"""Webhook รับ event จาก LINE Official Account

ทำไมต้องมี webhook: LINE Messaging API ส่ง push message หา "ผู้ใช้คนไหน" ได้ด้วย LINE userId
เท่านั้น (ไม่ใช่ชื่อ LINE ID ที่ลูกค้าพิมพ์ตอนจองคิว) ต้องได้ userId มาจาก event ที่ LINE ส่งเข้า webhook
นี้ก่อนเท่านั้น (ตอนลูกค้าเพิ่มเพื่อน หรือทักแชทมา) ระบบนี้จึงใช้วิธี "ผูกบัญชี": ให้ลูกค้าเพิ่มเพื่อน OA
ของร้าน แล้วพิมพ์ "เบอร์โทรศัพท์" หรือ "รหัสคิว" ที่ใช้ตอนจองส่งมาในแชท -> ระบบจะจับคู่ userId เข้ากับ
ลูกค้าคนนั้นในฐานข้อมูลอัตโนมัติ ตั้งแต่นั้นระบบจะส่งแจ้งเตือนสถานะคิวผ่าน LINE ให้อัตโนมัติ
(ดูขั้นตอนตั้งค่า channel ทั้งหมดใน docs/05_LINE_INTEGRATION.md)
"""

import re

from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import SessionLocal
from ..models import Booking, Customer

router = APIRouter(prefix="/line", tags=["line"])
settings = get_settings()

BOOKING_CODE_RE = re.compile(r"^NG-\d{8}-\d{4}$")
PHONE_RE = re.compile(r"^0\d{8,9}$")


def _link_customer(db: Session, user_id: str, text: str) -> str | None:
    text = text.strip()
    customer = None
    if PHONE_RE.match(text):
        customer = db.query(Customer).filter(Customer.phone == text).first()
    elif BOOKING_CODE_RE.match(text.upper()):
        booking = db.query(Booking).filter(Booking.booking_code == text.upper()).first()
        if booking:
            customer = db.get(Customer, booking.customer_id)

    if customer is None:
        return None
    customer.line_user_id = user_id
    db.commit()
    return customer.name or customer.phone


@router.post("/webhook")
async def line_webhook(request: Request, x_line_signature: str = Header(default="")):
    if not settings.line_channel_secret or not settings.line_channel_access_token:
        return {"status": "ignored", "reason": "LINE ยังไม่ได้ตั้งค่า channel secret / access token"}

    body = await request.body()

    from linebot.v3 import WebhookParser
    from linebot.v3.exceptions import InvalidSignatureError
    from linebot.v3.messaging import ApiClient, Configuration, MessagingApi, ReplyMessageRequest, TextMessage
    from linebot.v3.webhooks import FollowEvent, MessageEvent, TextMessageContent

    parser = WebhookParser(settings.line_channel_secret)
    try:
        events = parser.parse(body.decode("utf-8"), x_line_signature)
    except InvalidSignatureError:
        raise HTTPException(400, "ลายเซ็นไม่ถูกต้อง (invalid signature)")

    config = Configuration(access_token=settings.line_channel_access_token)
    db = SessionLocal()
    try:
        with ApiClient(config) as api_client:
            api = MessagingApi(api_client)
            for event in events:
                user_id = getattr(event.source, "user_id", None)
                if not user_id:
                    continue

                if isinstance(event, FollowEvent):
                    reply = (
                        "🌸 ยินดีต้อนรับสู่ NailGlow!\n"
                        "พิมพ์ \"เบอร์โทรศัพท์\" หรือ \"รหัสคิว\" ที่ใช้ตอนจองคิว เพื่อผูกบัญชีไลน์ "
                        "ระบบจะได้ส่งแจ้งเตือนสถานะคิวให้อัตโนมัติค่ะ"
                    )
                    api.reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text=reply)]))

                elif isinstance(event, MessageEvent) and isinstance(event.message, TextMessageContent):
                    linked_name = _link_customer(db, user_id, event.message.text)
                    if linked_name:
                        reply = f"✅ ผูกบัญชีไลน์กับข้อมูลคุณ {linked_name} สำเร็จแล้วค่ะ จะแจ้งเตือนสถานะคิวให้ทางนี้นะคะ"
                    else:
                        reply = "พิมพ์เบอร์โทรศัพท์ (เช่น 0812345678) หรือรหัสคิว (เช่น NG-20260807-0001) เพื่อผูกบัญชีนะคะ"
                    api.reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text=reply)]))
    finally:
        db.close()

    return {"status": "ok"}
