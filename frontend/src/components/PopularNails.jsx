import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { saveCarryDesign } from '../utils/carryDesign.js'
import { getNailDesigns } from '../api/client.js'
import NailThumb from './NailThumb.jsx'
import { Bone } from './Skeleton.jsx'
import Icon from './Icon.jsx'
import { Star } from './Stars.jsx'

const fallbackNails = [
  { id: 'f1', name: 'Minimal Nude', sample: true, accent: '#E8C39E' },
  { id: 'f2', name: 'Korean Pink', sample: true, accent: '#F2A6C0' },
  { id: 'f3', name: 'French Classic', sample: true, accent: '#D93B72' },
  { id: 'f4', name: 'Cat Eye', sample: true, accent: '#6B3FA0' },
  { id: 'f5', name: 'Marble', sample: true, accent: '#9C6B7A' },
]

// การ์ด "ลายเล็บยอดนิยม" (Our Nails ในภาพตัวอย่าง): แถวรูปผลงาน เลื่อนด้วยลูกศรหรือปัดนิ้ว
export default function PopularNails() {
  const [nails, setNails] = useState(null) // null = กำลังโหลด
  const rowRef = useRef(null)
  const navigate = useNavigate()

  // แตะลายไหนก็จองลายนั้นได้เลย: ส่งลายไปหน้าจองแบบเดียวกับปุ่ม "จองลายนี้" ในแกลเลอรี
  function book(n) {
    // ลายตัวอย่าง (ใช้ตอนโหลดไม่สำเร็จ) ไม่มีในระบบ จึงไม่ส่งต่อ ส่วนลายจริงส่งทุกลาย
    if (!n.sample) {
      saveCarryDesign({ source: 'design', nail_design_id: n.id, nail_design_name: n.name, color_hex: n.color_hex, summary: n.name })
    }
    navigate('/booking')
  }

  useEffect(() => {
    getNailDesigns()
      .then((data) => {
        if (!data?.length) return setNails(fallbackNails)
        // สไลด์ด้านบนโชว์ 6 ลายแรกที่มีรูปแล้ว แถวนี้เลยเริ่มจากลายอื่นก่อน ไม่ให้เห็นซ้ำติดกัน
        const inCarousel = new Set(data.filter((d) => d.image_url).slice(0, 6).map((d) => d.id))
        const rest = data.filter((d) => !inCarousel.has(d.id))
        setNails([...rest, ...data.filter((d) => inCarousel.has(d.id))].slice(0, 8))
      })
      .catch(() => setNails(fallbackNails)) // ใช้ข้อมูลตัวอย่างเมื่อโหลดไม่สำเร็จเท่านั้น
  }, [])

  const scroll = (dir) => {
    const el = rowRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section id="popular" className="glass relative min-w-0 rounded-[30px] p-5 sm:p-6 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-[#4A2A37]">
            <Star className="h-6 w-6" />
            ลายเล็บของร้าน
          </h2>
          <p className="mt-1 text-sm text-[#7A4A5E]">ชอบลายไหน แตะที่รูปแล้วจองลายนั้นได้เลยค่ะ</p>
        </div>
        <Link to="/gallery" className="glass-btn min-h-[44px] gap-1.5 px-4 py-2 text-sm font-display font-semibold">
          ดูทั้งหมด <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative mt-5">
        <ul ref={rowRef} className="-mx-1 px-1 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]">
          {!nails &&
            Array.from({ length: 4 }, (_, i) => (
              <li key={i} aria-hidden="true" className="w-[44%] sm:w-[30%] lg:w-[31%] shrink-0 space-y-2">
                <Bone className="aspect-[4/5] !rounded-2xl" />
                <Bone className="h-4 w-3/4" />
              </li>
            ))}
          {(nails || []).map((n) => (
            <li key={n.id} className="w-[44%] sm:w-[30%] lg:w-[31%] shrink-0 snap-start">
              <button
                type="button"
                onClick={() => book(n)}
                aria-label={`จองลาย ${n.name}`}
                className="group block w-full text-left rounded-[18px] bg-white/85 p-1.5 shadow-[0_12px_24px_-16px_rgba(150,40,85,0.6)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[13px] bg-rose-50">
                  {n.image_url ? (
                    <img loading="lazy" decoding="async" src={n.image_url} alt={n.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <NailThumb label={n.name} accent={n.accent || n.color_hex || '#E8C39E'} />
                  )}
                  <span aria-hidden="true" className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-display font-semibold text-berry shadow-[0_6px_12px_-8px_rgba(150,40,85,0.7)]">
                    <Icon name="calendar" className="h-3.5 w-3.5" /> จองลายนี้
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 px-1.5 pt-2 pb-1">
                  <p className="text-sm font-medium leading-snug text-[#4A2A37] line-clamp-2">{n.name}</p>
                  {n.price != null && <p className="shrink-0 text-xs font-semibold text-berry tabular-nums">{Number(n.price).toLocaleString('th-TH')} บาท</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
        {nails && nails.length > 2 && (
          <>
            <button type="button" onClick={() => scroll(-1)} aria-label="เลื่อนไปทางซ้าย" className="glass-btn hidden sm:inline-flex absolute -left-4 top-[42%] -translate-y-1/2 h-10 w-10">
              <Icon name="chevronLeft" />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="เลื่อนไปทางขวา" className="glass-btn hidden sm:inline-flex absolute -right-4 top-[42%] -translate-y-1/2 h-10 w-10">
              <Icon name="chevronRight" />
            </button>
          </>
        )}
      </div>
    </section>
  )
}
