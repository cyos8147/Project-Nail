// นโยบายยกเลิก/เลื่อนคิวผ่านเว็บ: ลูกค้าทำได้ล่วงหน้าอย่างน้อย N ชั่วโมงก่อนเวลานัด (N ตั้งในแอดมิน, 0 = ไม่จำกัด)
// ฝั่ง backend เป็นผู้ตัดสินจริง (policy.py) ที่นี่แค่ซ่อน/ปิดปุ่มและอธิบายให้ลูกค้าเข้าใจก่อนกดแล้วเจอ error

// เวลานัดเก็บเป็นเวลาไทยเสมอ จึงใส่ +07:00 ให้เทียบถูกไม่ว่าเครื่องลูกค้าจะอยู่เขตเวลาไหน
export function isTooLateToChange(booking, cutoffHours, nowMs = Date.now()) {
  if (!booking || !cutoffHours || cutoffHours <= 0) return false
  const start = new Date(`${booking.booking_date}T${booking.booking_time}:00+07:00`).getTime()
  return start - nowMs < cutoffHours * 3600 * 1000
}
