import { useEffect, useState } from 'react'
import { getServices } from '../api/client.js'

const CATEGORY_ICON = { hair: '💇‍♀️', nail: '💅' }

const fallbackServices = [
  { id: 'f1', icon: '💅', name: 'ทำสีเจล', description: 'สีเจลคุณภาพ ทนนาน เงางาม', price: 350 },
  { id: 'f2', icon: '🎨', name: 'เพ้นท์ลาย', description: 'ลายมือ ลายสติกเกอร์ ลายพิเศษ', price: 200 },
  { id: 'f3', icon: '✨', name: 'ต่อเล็บ PVC / เจล', description: 'ต่อเล็บทรงสวย เหมาะกับทุกมือ', price: 600 },
  { id: 'f4', icon: '🧴', name: 'ดูแลผิวมือ & เท้า', description: 'ขัดผิว พอกมือ ผ่อนคลาย', price: 300 },
]

export default function Services() {
  const [services, setServices] = useState(fallbackServices)

  useEffect(() => {
    getServices()
      .then((data) => {
        if (data?.length) setServices(data)
      })
      .catch(() => {
        /* ใช้ fallbackServices ต่อไปถ้าเรียก backend ไม่สำเร็จ */
      })
  }, [])

  return (
    <section id="services" className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl font-bold text-gray-800">บริการของร้าน</h2>
        <p className="text-gray-500 mt-2">เลือกบริการที่ใช่ แล้วจองคิวได้ทันที</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-2xl shadow-card overflow-hidden text-center hover:-translate-y-1 transition-transform"
          >
            {s.image_url ? (
              <img src={s.image_url} alt={s.name} className="w-full h-32 object-cover" />
            ) : (
              <div className="text-3xl pt-6">{s.icon || CATEGORY_ICON[s.category_id] || '✨'}</div>
            )}
            <div className="p-5 pt-3">
              <h3 className="font-display font-semibold text-gray-800">{s.name}</h3>
              {s.description && <p className="text-sm text-gray-500 mt-1">{s.description}</p>}
              <p className="text-rose-600 text-sm font-semibold mt-3">เริ่มต้น {s.price} บาท</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
