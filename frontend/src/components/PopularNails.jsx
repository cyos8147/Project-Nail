import { useEffect, useState } from 'react'
import { getNailDesigns } from '../api/client.js'
import NailThumb from './NailThumb.jsx'

const fallbackNails = [
  { id: 'f1', name: 'Minimal Nude', likes: '1.2k', accent: '#E8C39E' },
  { id: 'f2', name: 'Korean Pink', likes: '987', accent: '#F2A6C0' },
  { id: 'f3', name: 'French Classic', likes: '1.1k', accent: '#D93B72' },
  { id: 'f4', name: 'Cat Eye', likes: '832', accent: '#6B3FA0' },
  { id: 'f5', name: 'Marble', likes: '764', accent: '#9C6B7A' },
]

export default function PopularNails() {
  const [nails, setNails] = useState(fallbackNails)

  useEffect(() => {
    getNailDesigns()
      .then((data) => {
        if (data?.length) setNails(data.slice(0, 5))
      })
      .catch(() => {
        /* ใช้ fallbackNails ต่อไปถ้าเรียก backend ไม่สำเร็จ */
      })
  }, [])

  return (
    <section id="popular" className="bg-blush-100/60 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-gray-800">ลายเล็บยอดนิยม</h2>
            <p className="text-gray-500 mt-2">แรงบันดาลใจลายเล็บที่ลูกค้าเลือกมากที่สุด</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {nails.map((n) => (
            <div
              key={n.id}
              className="bg-white rounded-2xl shadow-card overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
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
