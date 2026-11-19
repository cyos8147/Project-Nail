// ตัวช่วยจัดรูปแบบตัวเลขในแดชบอร์ดแอดมิน (แยกออกมาเพื่อทดสอบได้โดยไม่ต้องเปิดหน้าเว็บ)

export const WEEKDAY_LABELS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']

export function baht(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('th-TH')} ฿`
}

/**
 * เปลี่ยนแปลงเทียบช่วงก่อนหน้า
 * - ช่วงก่อนเป็น 0 และตอนนี้มีค่า → 'new' (เทียบเป็น % ไม่ได้ แต่ไม่ควรโชว์ว่า "ไม่เปลี่ยน")
 * - ทั้งคู่เป็น 0 → 'flat'
 */
export function compare(value, previous) {
  const v = Number(value) || 0
  const p = Number(previous) || 0
  if (p === 0 && v === 0) return { kind: 'flat', percent: 0 }
  if (p === 0) return { kind: 'new', percent: null }
  const percent = ((v - p) / Math.abs(p)) * 100
  if (Math.abs(percent) < 0.05) return { kind: 'flat', percent: 0 }
  return { kind: percent > 0 ? 'up' : 'down', percent }
}

export function deltaLabel(cmp) {
  if (cmp.kind === 'new') return 'ใหม่ (ช่วงก่อนไม่มีข้อมูล)'
  if (cmp.kind === 'flat') return 'เท่าเดิม'
  const sign = cmp.kind === 'up' ? '▲' : '▼'
  return `${sign} ${Math.abs(cmp.percent).toFixed(1)}%`
}

/** สีของการเปลี่ยนแปลง: ค่าใช้จ่ายขึ้น = ไม่ดี (invert) */
export function deltaTone(cmp, invert = false) {
  if (cmp.kind === 'flat' || cmp.kind === 'new') return 'neutral'
  const good = invert ? cmp.kind === 'down' : cmp.kind === 'up'
  return good ? 'good' : 'bad'
}

export function percentText(ratio) {
  return `${((Number(ratio) || 0) * 100).toFixed(1)}%`
}

const THAI_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

/** '2033-03-05' → '5 มี.ค.' (ไม่ผ่าน Date กันเลื่อนวันตามเขตเวลา) */
export function shortDate(iso) {
  const [, m, d] = String(iso).split('-')
  return `${Number(d)} ${THAI_MONTHS[Number(m)] || ''}`
}

/** '2033-03-01' → 'มี.ค. 33' สำหรับกราฟรายเดือน */
export function monthLabel(iso) {
  const [y, m] = String(iso).split('-')
  return `${THAI_MONTHS[Number(m)] || ''} ${String((Number(y) + 543) % 100).padStart(2, '0')}`
}

/** '2033-03-05' → '5 มี.ค. 76' (มีปี พ.ศ. 2 หลัก ใช้ตอนต้องแยกช่วงปีนี้/ปีก่อน) */
export function fullDate(iso) {
  const [y, m, d] = String(iso).split('-')
  return `${Number(d)} ${THAI_MONTHS[Number(m)] || ''} ${String((Number(y) + 543) % 100).padStart(2, '0')}`
}

/** วันที่ปัจจุบันตามเวลาไทย (UTC+7) รูป YYYY-MM-DD — ไม่ใช้ toISOString ตรง ๆ เพราะตี 0–7 โมงไทยจะได้วันเมื่อวาน */
export function thaiTodayIso(nowMs = Date.now()) {
  return new Date(nowMs + 7 * 3600 * 1000).toISOString().slice(0, 10)
}

export function shiftIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
