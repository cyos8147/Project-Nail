import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import {
  cancelBooking,
  createReview,
  fileToBase64,
  getCustomerHistory,
  getSavedBookingCode,
  getSavedPhone,
  saveBookingCode,
  savePhone,
} from '../api/client.js'

const STATUS_LABEL = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิกแล้ว', no_show: 'ไม่มาตามนัด',
}

function ReviewForm({ booking, phone, onSubmitted }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const photoBase64 = photoFile ? await fileToBase64(photoFile) : null
      await createReview({
        booking_code: booking.booking_code,
        customer_phone: phone,
        rating,
        comment,
        photo_base64: photoBase64,
      })
      onSubmitted()
    } catch (err) {
      setError(err.message || 'ส่งรีวิวไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 bg-blush-50 border border-blush-200 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-700 mb-2">ให้คะแนนบริการนี้</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? 'text-gold' : 'text-blush-200'}`}>
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="เล่าประสบการณ์การใช้บริการ..."
        className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 mb-2"
        rows={2}
      />
      <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="text-xs mb-3" />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 px-4 py-2 rounded-full"
      >
        {submitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}

export default function CustomerHistoryPage() {
  const [phone, setPhone] = useState(getSavedPhone())
  const [bookingCode, setBookingCode] = useState(getSavedBookingCode())
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [reviewingBookingId, setReviewingBookingId] = useState(null)

  async function load(p, code) {
    setStatus('loading')
    setError(null)
    try {
      const res = await getCustomerHistory(p, code)
      setData(res)
      savePhone(p)
      if (res.verified) saveBookingCode(code)
      setStatus('done')
    } catch (err) {
      setError(err.message || 'ค้นหาไม่สำเร็จ')
      setStatus('error')
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    if (phone.trim()) load(phone.trim(), bookingCode.trim())
  }

  async function handleCancel(booking) {
    if (!window.confirm('ยืนยันยกเลิกคิวนี้หรือไม่?')) return
    try {
      await cancelBooking(booking.id, phone.trim())
      load(phone.trim(), bookingCode.trim())
    } catch (err) {
      setError(err.message || 'ยกเลิกไม่สำเร็จ')
    }
  }

  const reviewedBookingIds = new Set((data?.reviews || []).map((r) => r.booking_id))

  return (
    <div className="min-h-screen bg-blush-50 text-gray-800">
      <Header />
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800">ประวัติของฉัน</h1>
          <p className="text-gray-500 mt-2">
            กรอกเบอร์โทรเพื่อดูสรุปคิวที่เคยจอง หรือใส่รหัสคิวด้วยเพื่อดูรายละเอียด แก้ไข ยกเลิก และให้รีวิว
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-card p-6 flex flex-col sm:flex-row gap-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="เบอร์โทรศัพท์"
            className="flex-1 rounded-xl border border-blush-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
            required
          />
          <input
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value)}
            placeholder="รหัสคิว (ไม่บังคับ) เช่น NG-20260807-0001"
            className="flex-1 rounded-xl border border-blush-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 text-white font-semibold px-6 py-3 rounded-full shadow-card transition-colors whitespace-nowrap"
          >
            {status === 'loading' ? 'กำลังค้นหา...' : 'ดูประวัติ'}
          </button>
        </form>
        {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

        {data && !data.verified && (
          <p className="text-xs text-gold bg-gold/10 border border-gold/30 rounded-xl px-4 py-2.5 mt-3 text-center">
            🔒 นี่คือสรุปแบบย่อ — กรอก "รหัสคิว" ในช่องด้านบนด้วย เพื่อดูเวลา/ราคา/แก้ไข/ยกเลิก/ให้รีวิว/รูป AI
          </p>
        )}

        {data && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-800 mb-4">ประวัติการจอง ({data.bookings.length})</h2>
              <div className="space-y-3">
                {data.bookings.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีประวัติการจอง</p>}
                {!data.verified && data.bookings.map((b, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-card p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-800">{b.service_name}</p>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blush-100 text-rose-600">
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{b.booking_date}</p>
                  </div>
                ))}
                {data.verified && data.bookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl shadow-card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-800">{b.service_name}</p>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blush-100 text-rose-600">
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {b.booking_code} · {b.booking_date} {b.booking_time} น. · {b.price} บาท
                    </p>
                    {b.reference_image_url && (
                      <img src={b.reference_image_url} alt="รูปที่แนบ" className="mt-2 w-16 h-16 rounded-lg object-cover" />
                    )}
                    {b.admin_note && (
                      <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-blush-100">
                        หมายเหตุจากร้าน: {b.admin_note}
                      </p>
                    )}

                    {['pending', 'confirmed'].includes(b.status) && (
                      <div className="mt-3 flex items-center gap-4">
                        <Link
                          to={`/booking/edit?code=${encodeURIComponent(b.booking_code)}&phone=${encodeURIComponent(phone.trim())}`}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          ✏️ แก้ไขวันเวลา
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCancel(b)}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          ✕ ยกเลิกคิวนี้
                        </button>
                      </div>
                    )}

                    {b.status === 'completed' && !reviewedBookingIds.has(b.id) && (
                      reviewingBookingId === b.id ? (
                        <ReviewForm
                          booking={b}
                          phone={phone.trim()}
                          onSubmitted={() => {
                            setReviewingBookingId(null)
                            load(phone.trim(), bookingCode.trim())
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewingBookingId(b.id)}
                          className="mt-3 text-xs font-semibold text-rose-600 hover:underline"
                        >
                          ⭐ ให้คะแนนบริการนี้
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            {data.tryon_history.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-gray-800 mb-4">ประวัติการทดลองลายเล็บ (AI)</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {data.tryon_history.map((t) => (
                    <div key={t.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                      {t.result_image_url && <img src={t.result_image_url} alt="ผลลัพธ์ AI" className="w-full aspect-square object-cover" />}
                      <div className="p-2">
                        <p className="text-[11px] text-gray-500">{t.pattern} · {t.nail_shape}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.reviews.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-gray-800 mb-4">รีวิวที่เคยให้</h2>
                <div className="space-y-3">
                  {data.reviews.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl shadow-card p-4">
                      <p className="text-gold text-sm">{'★'.repeat(r.rating)}<span className="text-blush-200">{'★'.repeat(5 - r.rating)}</span></p>
                      {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      <Footer />
    </div>
  )
}
