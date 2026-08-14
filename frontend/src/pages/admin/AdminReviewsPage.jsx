import { useEffect, useState } from 'react'
import { getReviews } from '../../api/client.js'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    getReviews(100).then(setReviews)
  }, [])

  const average = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(2) : '-'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">รีวิวจากลูกค้า</h1>
        <p className="text-gray-500 text-sm mt-1">คะแนนเฉลี่ย {average} ★ จากทั้งหมด {reviews.length} รีวิว</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-800">{r.customer_name || 'ลูกค้า'}</p>
              <p className="text-gold text-sm">{'★'.repeat(r.rating)}<span className="text-blush-200">{'★'.repeat(5 - r.rating)}</span></p>
            </div>
            <p className="text-xs text-gray-400 mb-2">{r.service_name}</p>
            {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
            {r.photo_url && <img src={r.photo_url} alt="ผลงาน" className="mt-3 w-full h-32 rounded-xl object-cover" />}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีรีวิว</p>}
      </div>
    </div>
  )
}
