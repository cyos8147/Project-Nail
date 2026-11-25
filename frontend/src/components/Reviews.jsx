import { useEffect, useState } from 'react'
import { getReviews } from '../api/client.js'
import { Link } from 'react-router-dom'
import { Bone } from './Skeleton.jsx'

// แสดงเฉพาะรีวิวจริงจากระบบ (ไม่มีรีวิวตัวอย่างที่แต่งขึ้น)

function Stars({ count }) {
  return (
    <div className="text-gold text-sm">
      {'★'.repeat(count)}
      <span className="text-blush-200">{'★'.repeat(5 - count)}</span>
    </div>
  )
}

export default function Reviews() {
  const [reviews, setReviews] = useState(null) // null = กำลังโหลด

  useEffect(() => {
    getReviews(6)
      .then((data) => {
        if (!data?.length) {
          setReviews([])
        } else {
          setReviews(
            data.map((r) => ({
              name: r.customer_name || 'ลูกค้า Lucky Salon',
              rating: r.rating,
              text: r.comment || r.service_name || '',
              photo_url: r.photo_url,
            }))
          )
        }
      })
      .catch(() => setReviews([]))
  }, [])

  return (
    <section id="reviews" className="py-16 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-semibold text-gray-800">รีวิวจากลูกค้า</h2>
          <p className="text-gray-600 mt-2">จากลูกค้าที่ใช้บริการและรีวิวผ่านเว็บนี้</p>
        </div>

        {reviews && reviews.length === 0 && (
          <div className="mx-auto max-w-md rounded-[24px] glass p-8 text-center">
            <p className="font-display font-semibold text-gray-800">ยังไม่มีรีวิว</p>
            <p className="mt-2 text-sm text-gray-600">ใช้บริการแล้ว รีวิวได้ที่หน้าประวัติของฉัน</p>
            <Link to="/history" className="btn-candy-soft mt-5 px-5 py-2.5 text-sm">
              ไปที่ประวัติของฉัน
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6" aria-busy={!reviews}>
          {!reviews &&
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} aria-hidden="true" className="rounded-[24px] glass p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Bone className="w-10 h-10 !rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-4 w-1/2" />
                    <Bone className="h-3 w-1/3" />
                  </div>
                </div>
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-4/5" />
              </div>
            ))}
          {(reviews || []).map((r, i) => (
            <div key={`${r.name}-${i}`} className="rounded-[24px] glass p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center font-display font-semibold text-rose-600">
                  {r.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{r.name}</p>
                  <Stars count={r.rating} />
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{r.text}</p>
              {r.photo_url && (
                <img loading="lazy" decoding="async" src={r.photo_url} alt="ผลงานจากรีวิว" className="mt-3 rounded-xl w-full h-32 object-cover" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
