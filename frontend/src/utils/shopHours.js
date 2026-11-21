// เวลาเปิด-ปิดแยกรายวัน (ข้อ 4.2) -- แปลงระหว่างการตั้งค่าร้านจาก API กับตาราง 7 วันในหน้าแอดมิน
// และสรุปเป็นข้อความสั้น ๆ ให้ลูกค้าอ่าน ใช้เลขวันแบบ JavaScript: 0=อาทิตย์ ... 6=เสาร์ (ตรงกับ backend)

export const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
export const DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
// แสดงเริ่มวันจันทร์ ตามที่คนไทยอ่านตารางร้านทั่วไป
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const hhmm = (t) => String(t || '').slice(0, 5)
const toMin = (t) => {
  const [h, m] = hhmm(t).split(':').map(Number)
  return h * 60 + m
}

/** การตั้งค่าร้าน → แถว 7 วัน { day, open, openTime, closeTime } */
export function toWeekRows(settings) {
  const closed = new Set(settings?.closed_weekdays || [])
  const weekly = settings?.weekly_hours || {}
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: !closed.has(day),
    openTime: hhmm(weekly[day]?.open || settings?.opening_time || '10:00'),
    closeTime: hhmm(weekly[day]?.close || settings?.closing_time || '19:00'),
  }))
}

/** ข้อความผิดพลาดของตาราง (ไม่มี = null) */
export function validateRows(rows) {
  const openRows = rows.filter((r) => r.open)
  if (openRows.length === 0) return 'ต้องเปิดร้านอย่างน้อย 1 วันต่อสัปดาห์'
  const bad = openRows.find((r) => !/^\d\d:\d\d$/.test(r.openTime) || !/^\d\d:\d\d$/.test(r.closeTime) || toMin(r.closeTime) <= toMin(r.openTime))
  return bad ? `วัน${DAY_NAMES[bad.day]}: เวลาปิดต้องหลังเวลาเปิด` : null
}

/**
 * แถว 7 วัน → ค่าที่ส่งให้ API
 * เวลาที่ใช้บ่อยที่สุดเป็นเวลาเริ่มต้นของร้าน (opening/closing) ส่วน weekly_hours เก็บเฉพาะวันที่ต่างจากนั้น
 * ถ้าทุกวันเวลาเดียวกัน weekly_hours ว่าง = ทำงานแบบเดิมทุกอย่าง
 */
export function fromWeekRows(rows) {
  const openRows = rows.filter((r) => r.open)
  const counts = new Map()
  for (const r of openRows) {
    const key = `${r.openTime}-${r.closeTime}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  let common = openRows[0] ? `${openRows[0].openTime}-${openRows[0].closeTime}` : '10:00-19:00'
  for (const [key, n] of counts) if (n > (counts.get(common) || 0)) common = key
  const [opening_time, closing_time] = common.split('-')
  const weekly_hours = {}
  for (const r of openRows) {
    if (r.openTime !== opening_time || r.closeTime !== closing_time) weekly_hours[String(r.day)] = { open: r.openTime, close: r.closeTime }
  }
  return {
    closed_weekdays: rows.filter((r) => !r.open).map((r) => r.day),
    opening_time,
    closing_time,
    weekly_hours,
  }
}

function dayRange(days) {
  // days เรียงตาม DISPLAY_ORDER แล้ว ติดกันตั้งแต่ 2 วันย่อเป็น "จ.–ศ." / "ส.–อา."
  const idx = days.map((d) => DISPLAY_ORDER.indexOf(d))
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1)
  if (consecutive && days.length >= 2) return `${DAY_SHORT[days[0]]}–${DAY_SHORT[days[days.length - 1]]}`
  return days.map((d) => DAY_SHORT[d]).join(' ')
}

/** สรุปเวลาทำการให้ลูกค้า เช่น [{ days: 'จ.–ศ.', hours: '10:00–19:00 น.' }, { days: 'อ.', hours: 'ปิด', closed: true }] */
export function summarizeHours(settings) {
  const rows = toWeekRows(settings)
  const byDay = Object.fromEntries(rows.map((r) => [r.day, r]))
  const groups = []
  for (const day of DISPLAY_ORDER) {
    const r = byDay[day]
    const hours = r.open ? `${r.openTime}–${r.closeTime} น.` : 'ปิด'
    const last = groups[groups.length - 1]
    if (last && last.hours === hours && DISPLAY_ORDER.indexOf(last.days[last.days.length - 1]) === DISPLAY_ORDER.indexOf(day) - 1) last.days.push(day)
    else groups.push({ days: [day], hours, closed: !r.open })
  }
  // รวมกลุ่มที่เวลาเดียวกันแต่ไม่ติดกัน (เช่น จ. กับ พ.) ให้อยู่บรรทัดเดียว
  const merged = []
  for (const g of groups) {
    const same = merged.find((m) => m.hours === g.hours)
    if (same) same.parts.push(g.days)
    else merged.push({ hours: g.hours, closed: g.closed, parts: [g.days] })
  }
  return merged.map((m) => ({ days: m.parts.map(dayRange).join(', '), hours: m.hours, closed: m.closed }))
}
