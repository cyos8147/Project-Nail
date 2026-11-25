import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAvailability, getServiceCategories, getServices } from '../api/client.js'
import Icon from './Icon.jsx'

// "คิวว่างถัดไป" ของแต่ละหมวด (ทำเล็บ / ทำผม) สำหรับลูกค้าประจำที่อยากรู้เร็ว ๆ ว่าว่างเมื่อไหร่
// อ่านอย่างเดียวจาก API คิวว่างตัวเดียวกับหน้าจอง (ใช้บริการที่สั้นที่สุดของหมวดเป็นตัวตั้ง)
// โหลดไม่ได้หรือไม่เจอคิวใน 7 วัน: ไม่แสดงอะไร (ไม่เดาเวลาให้)

const DAYS_AHEAD = 7
const pad = (n) => String(n).padStart(2, '0')
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function dayLabel(offset, d) {
  if (offset === 0) return 'วันนี้'
  if (offset === 1) return 'พรุ่งนี้'
  return `${TH_DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

async function findNext(categoryId, duration) {
  const today = new Date()
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    const res = await getAvailability(isoDate(d), duration, categoryId)
    const slot = (res?.slots || []).find((s) => s.available)
    if (slot) return `${dayLabel(i, d)} ${slot.time.slice(0, 5)} น.`
  }
  return null
}

export default function NextFreeSlot({ className = '' }) {
  const [items, setItems] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([getServiceCategories(), getServices()])
      .then(async ([cats, services]) => {
        // ทำเล็บขึ้นก่อน เพราะเป็นงานหลักของร้าน
        const ordered = [...(cats || [])].sort((a, b) => (a.id === 'nail' ? -1 : b.id === 'nail' ? 1 : 0))
        const found = await Promise.all(
          ordered.map(async (c) => {
            const durations = (services || []).filter((s) => s.category_id === c.id).map((s) => s.duration_minutes)
            if (!durations.length) return null
            const when = await findNext(c.id, Math.min(...durations)).catch(() => null)
            return when ? { id: c.id, name: c.name, when } : null
          }),
        )
        if (alive) setItems(found.filter(Boolean))
      })
      .catch(() => alive && setItems([]))
    return () => {
      alive = false
    }
  }, [])

  if (!items?.length) return null

  return (
    <Link
      to="/booking"
      className={`glass group inline-flex max-w-full items-center gap-3 rounded-full py-2 pl-2 pr-4 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-rose-300 ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-berry">
        <Icon name="clock" className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 text-sm leading-snug">
        <span className="block font-display font-semibold text-[#4A2A37]">คิวว่างถัดไป</span>
        <span className="block truncate text-[#6E4255] tabular-nums">
          {items.map((it, i) => (
            <span key={it.id}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              {it.name} {it.when}
            </span>
          ))}
        </span>
      </span>
      <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-berry transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
