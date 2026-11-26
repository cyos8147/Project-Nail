import { useEffect, useState } from 'react'
import { getPublicHolidays, getShopSettings } from '../api/client.js'
import { DAY_SHORT, toWeekRows } from '../utils/shopHours.js'
import Icon from './Icon.jsx'
import NextFreeSlot from './NextFreeSlot.jsx'

// การ์ด "ช่วงเวลาทำการ" ใต้ปุ่มในหน้าแรก (ตามภาพดีไซน์ใหม่)
// อ่านเวลาเปิด-ปิดและวันหยุดจากการตั้งค่าร้านจริงเท่านั้น (ไม่เดาเวลา) + รวมป้าย "ว่างเร็วสุด" ไว้ในการ์ดเดียวกัน
// โหลดไม่ได้: ไม่แสดงการ์ด

const pad = (n) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function status(settings, holidays) {
  const now = new Date()
  const row = toWeekRows(settings)[now.getDay()]
  const isHoliday = (holidays || []).some((h) => h.holiday_date === todayIso())
  if (!row.open || isHoliday) return { line: `วันนี้ (${DAY_SHORT[now.getDay()]}) ร้านหยุด`, badge: 'วันนี้หยุด', open: false }
  const mins = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = row.openTime.split(':').map(Number)
  const [ch, cm] = row.closeTime.split(':').map(Number)
  const openNow = mins >= oh * 60 + om && mins < ch * 60 + cm
  return {
    line: `วันนี้ (${DAY_SHORT[now.getDay()]}) ${row.openTime} – ${row.closeTime} น.`,
    badge: openNow ? 'เปิดให้บริการ' : mins < oh * 60 + om ? 'ยังไม่เปิด' : 'ปิดแล้ววันนี้',
    open: openNow,
  }
}

export default function HoursCard({ className = '' }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([getShopSettings(), getPublicHolidays().catch(() => [])])
      .then(([settings, holidays]) => alive && setData(status(settings, holidays)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!data) return null

  return (
    <div className={`glass max-w-full rounded-[22px] px-5 py-4 text-left ${className}`}>
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#D6336C]">
          <Icon name="clock" className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-[#2E1F26]">ช่วงเวลาทำการ</span>
            <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${data.open ? 'bg-[#FFEAF2] text-[#C2185B]' : 'bg-[#F4EEF1] text-[#6B5560]'}`}>
              {data.badge}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-[#5B4650] tabular-nums">{data.line}</p>
        </div>
      </div>
      <NextFreeSlot bare className="mt-3 border-t border-[#2E1F26]/[0.06] pt-3" />
    </div>
  )
}
