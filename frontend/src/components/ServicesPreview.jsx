import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getServices } from '../api/client.js'
import ServiceArt from './ServiceArt.jsx'
import { Bone } from './Skeleton.jsx'
import Icon from './Icon.jsx'
import { Star } from './Stars.jsx'

// การ์ด "บริการของเรา" ข้างการ์ดลายเล็บในหน้าแรก (ตามภาพดีไซน์ใหม่)
// โชว์บริการ 4 รายการ (ทำเล็บก่อน) พร้อมราคาเริ่มต้น แตะแล้วไปหน้าจองพร้อมเลือกบริการนั้น
// รายการทั้งหมดอยู่ในส่วน "บริการของร้าน" ด้านล่าง (#services) — ข้อมูลจาก API เท่านั้น ไม่มีราคาตัวอย่าง
const fmtPrice = (p) => Number(p).toLocaleString('th-TH', { maximumFractionDigits: 0 })

export default function ServicesPreview() {
  const [items, setItems] = useState(null) // null = กำลังโหลด, [] = ไม่มี/โหลดไม่ได้

  useEffect(() => {
    getServices()
      .then((list) => {
        const active = (list || []).filter((s) => s.active !== false)
        const ordered = [...active.filter((s) => s.category_id === 'nail'), ...active.filter((s) => s.category_id !== 'nail')]
        setItems(ordered.slice(0, 4))
      })
      .catch(() => setItems([]))
  }, [])

  if (items && items.length === 0) return null

  return (
    <section aria-labelledby="services-preview-title" className="glass relative min-w-0 rounded-[30px] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="services-preview-title" className="flex items-center gap-2.5 text-2xl font-semibold text-[#2E1F26]">
          <Star className="h-6 w-6" />
          บริการของเรา
        </h2>
        <a href="#services" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#FFEAF2] px-4 text-sm font-medium text-[#C2185B] hover:bg-[#FFDDE9]">
          ดูทั้งหมด <Icon name="arrow" className="h-4 w-4" />
        </a>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {!items &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} aria-hidden="true" className="flex items-center gap-3 rounded-[18px] border border-[#2E1F26]/[0.06] p-2">
              <Bone className="h-16 w-16 shrink-0 !rounded-[12px]" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/3" />
              </div>
            </li>
          ))}
        {(items || []).map((s) => (
          <li key={s.id}>
            <Link
              to={`/booking?service=${encodeURIComponent(s.id)}`}
              aria-label={`จอง ${s.name} เริ่มต้น ${fmtPrice(s.price)} บาท`}
              className="group flex items-center gap-3 rounded-[18px] border border-[#2E1F26]/[0.06] bg-white p-2 pr-3 transition-colors hover:border-[#F3B4CB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
            >
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-[#FFF1F6]">
                {s.image_url ? (
                  <img src={s.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <ServiceArt name={s.name} categoryId={s.category_id} className="h-full w-full" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-[#2E1F26]">{s.name.trim()}</span>
                <span className="block text-sm text-[#6B5560]">
                  เริ่มต้น <span className="font-semibold text-[#C2185B] tabular-nums">{fmtPrice(s.price)} บาท</span>
                </span>
              </span>
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-[#C2185B] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
