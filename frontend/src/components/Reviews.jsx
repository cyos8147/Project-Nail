import { useEffect, useState } from 'react'
import { getReviews } from '../api/client.js'

const fallbackReviews = [
  { name: 'Maylada', rating: 5, text: 'AI แนะนำสีให้ตรงใจมาก ทำเล็บออกมาสวยตามที่ดูตัวอย่างเลยค่ะ' },
  { name: 'Panita', rating: 5, text: 'จองคิวง่าย ไม่ต้องโทรถาม ช่างทำเล็บเนี้ยบมากทุกครั้ง' },
  { name: 'Benyapa', rating: 4, text: 'บริการดี ร้านสะอาด ราคาคุ้มค่า จะกลับมาใช้บริการอีกแน่นอน' },
]

function Stars({ count }) {
  return (
    <div className="text-gold text-sm">
      {'★'.repeat(count)}
      <span className="text-blush-200">{'★'.repeat(5 - count)}</span>
    </div>
  )
}

export default function Reviews() {
  const [reviews, setReviews] = useState(fallbackReviews)

  useEffect(() => {
    getReviews(6)
      .then((data) => {
        if (data?.length) {
          setReviews(
            data.map((r) => ({
              name: r.customer_name || 'ลูกค้า NailGlow',
              rating: r.rating,
              text: r.comment || r.service_name || '',
              photo_url: r.photo_url,
            }))
          )
        }
      })
      .catch(() => {
        /* ใช้ fallbackReviews ต่อไปถ้าเรียก backend ไม่สำเร็จ */
      })
  }, [])

  return (
    <section id="reviews" className="bg-blush-100/60 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold text-gray-800">รีวิวจากลูกค้า</h2>
          <p className="text-gray-500 mt-2">เสียงตอบรับจริงจากลูกค้าที่ใช้บริการ</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div key={`${r.name}-${i}`} className="bg-white rounded-2xl shadow-card p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center font-display font-bold text-rose-600">
                  {r.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{r.name}</p>
                  <Stars count={r.rating} />
                </div>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">{r.text}</p>
              {r.photo_url && (
                <img src={r.photo_url} alt="ผลงานจากรีวิว" className="mt-3 rounded-xl w-full h-32 object-cover" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
