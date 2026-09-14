"""ส่งข้อความแจ้งเตือนผ่าน LINE Official Account (LINE Messaging API)
ถ้ายังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN จะข้ามการส่งเงียบๆ (log ไว้เฉยๆ) เพื่อไม่ให้การจองคิว
ล้มเหลวไปด้วยตอน dev/ทดสอบที่ยังไม่ได้ผูก LINE จริง — ดูขั้นตอนตั้งค่าใน docs/05_LINE_INTEGRATION.md
"""

from __future__ import annotations

from ..config import get_settings

settings = get_settings()

STATUS_LABEL_TH = {
    "pending": "รอยืนยัน",
    "confirmed": "ยืนยันแล้ว",
    "completed": "เสร็จสิ้น",
    "cancelled": "ยกเลิกแล้ว",
    "no_show": "ไม่มาตามนัด",
}


def _client():
    if not settings.line_channel_access_token:
        return None
    from linebot.v3.messaging import ApiClient, Configuration, MessagingApi

    config = Configuration(access_token=settings.line_channel_access_token)
    return ApiClient(config)


def push_text_message(line_user_id: str, text: str) -> bool:
    """ส่งข้อความหา LINE userId ที่ผูกไว้แล้ว (ได้จาก webhook ตอนลูกค้าเพิ่มเพื่อน/ทักแชท)"""
    client = _client()
    if client is None or not line_user_id:
        return False
    from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage

    with client as api_client:
        api = MessagingApi(api_client)
        api.push_message(
            PushMessageRequest(to=line_user_id, messages=[TextMessage(text=text)])
        )
    return True


def build_booking_confirmation_text(booking) -> str:
    return (
        f"✅ จองคิว {STATUS_LABEL_TH.get(booking.status, booking.status)}\n"
        f"รหัสคิว: {booking.booking_code}\n"
        f"บริการ: {booking.service_name}\n"
        f"วันที่: {booking.booking_date}  เวลา: {booking.booking_time} น.\n"
        f"ราคา: {booking.price:.0f} บาท\n"
        f"ตรวจสอบสถานะได้ที่หน้าเว็บด้วยรหัสคิวนี้ได้ตลอดเวลา"
    )


def build_status_update_text(booking) -> str:
    return (
        f"📢 อัปเดตสถานะคิว {booking.booking_code}\n"
        f"สถานะล่าสุด: {STATUS_LABEL_TH.get(booking.status, booking.status)}\n"
        f"บริการ: {booking.service_name}  วันที่ {booking.booking_date} เวลา {booking.booking_time} น."
    )


def notify_booking_created(booking, line_user_id: str | None) -> None:
    if line_user_id:
        push_text_message(line_user_id, build_booking_confirmation_text(booking))


def notify_status_changed(booking, line_user_id: str | None) -> None:
    if line_user_id:
        push_text_message(line_user_id, build_status_update_text(booking))
    if booking.status == "completed" and line_user_id:
        push_text_message(
            line_user_id,
            f"🌟 ขอบคุณที่ใช้บริการนะคะ! ช่วยให้คะแนนรีวิวร้านของเราได้ที่หน้าเว็บ "
            f"ด้วยรหัสคิว {booking.booking_code} ค่ะ",
        )


def build_reminder_text(booking) -> str:
    return (
        f"⏰ แจ้งเตือนคิวพรุ่งนี้!\n"
        f"รหัสคิว: {booking.booking_code}\n"
        f"บริการ: {booking.service_name}\n"
        f"วันที่: {booking.booking_date}  เวลา: {booking.booking_time} น.\n"
        f"อย่าลืมมาตามนัดนะคะ 🌸 หากไม่สะดวกกรุณาแจ้งยกเลิก/เลื่อนคิวล่วงหน้าที่หน้าเว็บได้เลยค่ะ"
    )


def notify_appointment_reminder(booking, line_user_id: str | None) -> bool:
    if not line_user_id:
        return False
    return push_text_message(line_user_id, build_reminder_text(booking))


def build_shop_new_booking_text(booking) -> str:
    return (
        f"🔔 มีการจองใหม่เข้ามา!\n"
        f"ลูกค้า: {booking.customer_name} ({booking.customer_phone})\n"
        f"บริการ: {booking.service_name}\n"
        f"วันที่: {booking.booking_date}  เวลา: {booking.booking_time} น.\n"
        f"รหัสคิว: {booking.booking_code}\n"
        f"เข้าไปยืนยันได้ที่หน้าแอดมิน"
    )


def build_shop_cancelled_text(booking) -> str:
    return (
        f"❌ ลูกค้ายกเลิกคิว\n"
        f"ลูกค้า: {booking.customer_name} ({booking.customer_phone})\n"
        f"บริการ: {booking.service_name}\n"
        f"วันที่เดิม: {booking.booking_date}  เวลา: {booking.booking_time} น.\n"
        f"รหัสคิว: {booking.booking_code}"
    )


def build_shop_rescheduled_text(booking) -> str:
    return (
        f"🔄 ลูกค้าแก้ไขวันเวลาการจอง\n"
        f"ลูกค้า: {booking.customer_name} ({booking.customer_phone})\n"
        f"บริการ: {booking.service_name}\n"
        f"วันเวลาใหม่: {booking.booking_date}  เวลา: {booking.booking_time} น.\n"
        f"รหัสคิว: {booking.booking_code}\n"
        f"สถานะกลับเป็น \"รอยืนยัน\" กรุณายืนยันเวลาใหม่อีกครั้ง"
    )


def notify_shop_new_booking(booking, owner_line_user_id: str | None) -> None:
    if owner_line_user_id:
        push_text_message(owner_line_user_id, build_shop_new_booking_text(booking))


def notify_shop_booking_cancelled(booking, owner_line_user_id: str | None) -> None:
    if owner_line_user_id:
        push_text_message(owner_line_user_id, build_shop_cancelled_text(booking))


def notify_shop_booking_rescheduled(booking, owner_line_user_id: str | None) -> None:
    if owner_line_user_id:
        push_text_message(owner_line_user_id, build_shop_rescheduled_text(booking))
