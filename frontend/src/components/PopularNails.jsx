import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNailDesigns } from '../api/client.js'
import NailThumb from './NailThumb.jsx'
import { Bone } from './Skeleton.jsx'

const fallbackNails = [
  { id: 'f1', name: 'Minimal Nude', likes: '1.2k', accent: '#E8C39E' },
  { id: 'f2', name: 'Korean Pink', likes: '987', accent: '#F2A6C0' },
  { id: 'f3', name: 'French Classic', likes: '1.1k', accent: '#D93B72' },
  { id: 'f4', name: 'Cat Eye', likes: '832', accent: '#6B3FA0' },
  { id: 'f5', name: 'Marble', likes: '764', accent: '#9C6B7A' },
]

export default function PopularNails() {
  const [nails, setNails] = useState(null) // null = กำลังโหลด

  useEffect(() => {
    getNailDesigns()
      .then((data) => setNails(data?.length ? data.slice(0, 5) : fallbackNails))
      .catch(() => setNails(fallbackNails)) // ใช้ข้อมูลตัวอย่างเมื่อโหลดไม่สำเร็จเท่านั้น
  }, [])

  return (
    <section id="popular" className="py-16 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-script text-4xl text-rose-500">Our Nails</p>
            <h2 className="font-display text-3xl font-bold text-gray-800 mt-1">ลายเล็บยอดนิยม</h2>
            <p className="text-gray-500 mt-2">ผลงานของเรา ที่พร้อมให้คุณเลือกชม</p>
          </div>
          <Link to="/gallery" className="btn-candy-soft px-5 py-2.5 text-sm">
            ดูผลงานทั้งหมด <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {!nails &&
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} aria-hidden="true" className="rounded-3xl border border-white bg-white/50 overflow-hidden">
                <Bone className="aspect-square !rounded-none" />
                <div className="p-3 space-y-2">
                  <Bone className="h-4 w-3/4" />
                  <Bone className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          {(nails || []).map((n) => (
            <div
              key={n.id}
              className="bg-white rounded-3xl border border-white shadow-card overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
            >
              <div className="aspect-square">
                {n.image_url ? (
                  <img loading="lazy" decoding="async" src={n.image_url} alt={n.name} className="w-full h-full object-cover" />
                ) : (
                  <NailThumb label={n.name} accent={n.accent || n.color_hex || '#E8C39E'} />
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-800 text-sm">{n.name}</p>
                <p className="text-xs text-gray-400 mt-1">{n.likes ? `♡ ${n.likes}` : `${n.price} บาท`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
