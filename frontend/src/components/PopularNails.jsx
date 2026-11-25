import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNailDesigns } from '../api/client.js'
import NailThumb from './NailThumb.jsx'
import { Bone } from './Skeleton.jsx'
import Icon from './Icon.jsx'

const fallbackNails = [
  { id: 'f1', name: 'Minimal Nude', accent: '#E8C39E' },
  { id: 'f2', name: 'Korean Pink', accent: '#F2A6C0' },
  { id: 'f3', name: 'French Classic', accent: '#D93B72' },
  { id: 'f4', name: 'Cat Eye', accent: '#6B3FA0' },
  { id: 'f5', name: 'Marble', accent: '#9C6B7A' },
]

export default function PopularNails() {
  const [nails, setNails] = useState(null) // null = กำลังโหลด

  useEffect(() => {
    getNailDesigns()
      .then((data) => setNails(data?.length ? data.slice(0, 8) : fallbackNails))
      .catch(() => setNails(fallbackNails)) // ใช้ข้อมูลตัวอย่างเมื่อโหลดไม่สำเร็จเท่านั้น
  }, [])

  return (
    <section id="popular" className="py-16 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-3xl font-semibold text-gray-800">ลายเล็บยอดนิยม</h2>
            <p className="text-gray-600 mt-2">ผลงานจากร้านของเรา แตะเพื่อดูทั้งหมดในแกลเลอรี</p>
          </div>
          <Link to="/gallery" className="btn-candy-soft px-5 py-2.5 text-sm">
            ดูผลงานทั้งหมด <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        {/* แถบรูปย่อเรียงแนวนอน (ไม่ซ้ำกับการ์ดใหญ่ใน Hero) เลื่อนด้วยนิ้วได้บนมือถือ */}
        <ul className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]">
          {!nails &&
            Array.from({ length: 6 }, (_, i) => (
              <li key={i} aria-hidden="true" className="w-36 sm:w-40 shrink-0 space-y-2">
                <Bone className="aspect-square !rounded-2xl" />
                <Bone className="h-4 w-3/4" />
              </li>
            ))}
          {(nails || []).map((n) => (
            <li key={n.id} className="w-36 sm:w-40 shrink-0 snap-start">
              <Link to="/gallery" className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-400 rounded-2xl">
                <div className="aspect-square overflow-hidden rounded-2xl bg-rose-50 shadow-soft">
                  {n.image_url ? (
                    <img loading="lazy" decoding="async" src={n.image_url} alt={n.name} className="w-full h-full object-cover transition-opacity duration-150 group-hover:opacity-90" />
                  ) : (
                    <NailThumb label={n.name} accent={n.accent || n.color_hex || '#E8C39E'} />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-800 truncate">{n.name}</p>
                {n.price != null && <p className="text-xs text-gray-500 tabular-nums">{Number(n.price).toLocaleString('th-TH')} บาท</p>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
