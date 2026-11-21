// จองหลายบริการต่อกัน (ทำทีละอย่าง บริการถัดไปเริ่มทันทีที่บริการก่อนหน้าเสร็จ) -- ตรงกับ backend
// availability.chain_start_times / routers/bookings.create_multi_booking

export const MAX_SERVICES = 3

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

export const serviceDuration = (s) => Number(s?.duration_minutes ?? s?.duration ?? 60)

/**
 * รายการบริการตามลำดับที่ทำ พร้อมเวลาเริ่ม-เสร็จของแต่ละบริการ
 * main = บริการหลัก (ใช้เวลาเพิ่มจาก AI ได้), extras = บริการที่ทำต่อตามลำดับที่ลูกค้าเลือก
 */
export function buildChain(main, extras = [], startTime = null, mainExtraMinutes = 0) {
  if (!main) return []
  const list = [
    { service: main, duration: serviceDuration(main) + Math.max(0, mainExtraMinutes || 0) },
    ...extras.map((s) => ({ service: s, duration: serviceDuration(s) })),
  ]
  let t = startTime ? toMinutes(startTime) : null
  return list.map(({ service, duration }) => {
    const item = {
      service,
      categoryId: service.category_id ?? service.categoryId,
      duration,
      price: Number(service.price) || 0,
      start: t === null ? null : toHHMM(t),
      end: t === null ? null : toHHMM(t + duration),
    }
    if (t !== null) t += duration
    return item
  })
}

/** พารามิเตอร์ items ของ GET /availability/chain เช่น "hair:60,nail:45" */
export function chainParam(chain) {
  return chain.map((c) => `${c.categoryId}:${c.duration}`).join(',')
}

export const chainTotals = (chain) => ({
  minutes: chain.reduce((n, c) => n + c.duration, 0),
  price: chain.reduce((n, c) => n + c.price, 0),
})

/** บริการที่ยังเพิ่มต่อได้: ไม่ซ้ำกับที่เลือกแล้ว และรวมแล้วไม่เกิน MAX_SERVICES */
export function addableServices(allServices, main, extras) {
  if (!main || extras.length >= MAX_SERVICES - 1) return []
  const taken = new Set([main.id, ...extras.map((s) => s.id)])
  return allServices.filter((s) => !taken.has(s.id))
}

/** "75 นาที" / "2 ชม. 15 นาที" */
export function formatMinutes(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m} นาที`
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}
