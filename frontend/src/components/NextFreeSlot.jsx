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

export default function NextFreeSlot({ className = '', bare = false }) {
  const [items, setItems] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([getServiceCategories(), getServices()])
      .then(async ([cats, services]) => {
        // ทำเล็บขึ้นก่อน เพราะเป็นงานหลักของร้าน
        const ordered = [...(cats || [])].sort((a, b) => (a.id === 'nail' ? -1 : b.id === 'nail' ? 1 : 0))
        const found = await Promise.all(
          ordered.map(async (c) => {
            const list = (services || []).filter((s) => s.category_id === c.id && s.duration_minutes)
            if (!list.length) return null
            const shortest = list.reduce((a, b) => (b.duration_minutes < a.duration_minutes ? b : a))
            // API คิวว่างรับขั้นต่ำ 15 นาที
            const when = await findNext(c.id, Math.max(15, shortest.duration_minutes)).catch(() => null)
            return when ? { id: c.id, name: c.name, when, serviceId: shortest.id, serviceName: shortest.name } : null
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

  // แต่ละหมวดเป็นลิงก์ของตัวเอง และบอกชื่อบริการที่ใช้คำนวณเวลา (ไม่สัญญาเกินกว่าที่หน้าจองเลือกให้)
  // bare (การ์ดเวลาทำการหน้าแรก): จุดเขียวบอกว่าเป็นคิวว่างจริงจากระบบ กะพริบ 3 รอบแล้วนิ่ง
  // และเวลาเลื่อนขึ้นตอนข้อมูลมาถึง (แสดงเฉพาะเมื่อเจอคิวว่างจริง ไม่มีก็ไม่แสดงทั้งแถว)
  const list = (
    <ul>
      {items.map((it) => (
        <li key={it.id}>
          <Link
            to={`/booking?service=${encodeURIComponent(it.serviceId)}`}
            className="group inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-full text-[#5B4650] hover:text-[#C2185B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
          >
            <span className="min-w-0">
              {bare && <span aria-hidden="true" className="lucky-live-dot mr-1.5 inline-block h-[7px] w-[7px] rounded-full bg-[#2F9E6B] align-middle" />}
              <span className={`font-semibold text-[#C2185B] tabular-nums${bare ? ' lucky-slot-rise' : ''}`}>{it.when}</span> · {it.serviceName}
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#FFEAF2] px-2 py-0.5 text-xs font-medium text-[#C2185B] group-hover:bg-[#FFDDE9]">
              จองเลย
              <Icon name="chevronRight" className="lucky-slot-arrow h-3 w-3" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )

  // bare: ใช้ซ้อนในการ์ดอื่น (เช่นการ์ดเวลาทำการในหน้าแรก) ไม่วาดกรอบซ้ำ
  if (bare) {
    return (
      <div className={`text-sm leading-snug ${className}`}>
        <p className="font-medium text-[#2E1F26]">ว่างเร็วสุด</p>
        {list}
      </div>
    )
  }

  return (
    <div className={`glass inline-flex max-w-full items-start gap-3 rounded-[22px] py-2.5 pl-2.5 pr-3 text-left ${className}`}>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFEAF2] text-[#C2185B]">
        <Icon name="clock" className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 text-sm leading-snug">
        <p className="font-medium text-[#2E1F26]">ว่างเร็วสุด</p>
        {list}
      </div>
    </div>
  )
}
