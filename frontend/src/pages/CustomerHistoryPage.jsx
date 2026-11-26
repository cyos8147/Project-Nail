import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'
import usePageTitle from '../components/usePageTitle.js'
import {
  cancelBooking,
  createReview,
  fileToBase64,
  getCustomerHistory,
  getSavedBookingCode,
  getSavedPhone,
  getShopSettings,
  saveBookingCode,
  savePhone,
} from '../api/client.js'
import { isTooLateToChange } from '../utils/cancelPolicy.js'
import ZoomableImage from '../components/ZoomableImage.jsx'
import Stars, { Star } from '../components/Stars.jsx'

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
      <p className="text-xs font-medium text-[#3A2A31] mb-2">ให้คะแนนบริการนี้</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} ดาว`} aria-pressed={n <= rating} className="rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400">
            <Star filled={n <= rating} className="h-7 w-7" />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="ชอบตรงไหน หรืออยากให้ร้านปรับอะไร เล่าให้ฟังได้เลยค่ะ"
        className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 mb-2"
        rows={2}
      />
      <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="text-xs mb-3" />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="btn-candy text-xs px-4 py-2"
      >
        {submitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}

export default function CustomerHistoryPage() {
  usePageTitle('ประวัติของฉัน | Lucky Salon')
  const [phone, setPhone] = useState(getSavedPhone())
  const [bookingCode, setBookingCode] = useState(getSavedBookingCode())
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [reviewingBookingId, setReviewingBookingId] = useState(null)
  const [shop, setShop] = useState(null) // เวลาล่วงหน้าที่ร้านกำหนดสำหรับยกเลิก/เลื่อนคิว + เบอร์ร้าน

  useEffect(() => {
    getShopSettings().then(setShop).catch(() => {})
  }, [])

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
    if (!window.confirm('แน่ใจนะคะว่าจะยกเลิกคิวนี้?')) return
    try {
      await cancelBooking(booking.id, phone.trim())
      load(phone.trim(), bookingCode.trim())
    } catch (err) {
      setError(err.message || 'ยกเลิกไม่สำเร็จ')
    }
  }

  const reviewedBookingIds = new Set((data?.reviews || []).map((r) => r.booking_id))

  return (
    <div className="relative isolate min-h-screen text-[#2E1F26] overflow-x-clip">
      <DreamyBackground />
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-[#2E1F26]">ประวัติของฉัน</h1>
          <p className="text-[#6B5560] mt-2">
            ใส่เบอร์โทรที่ใช้จอง จะเห็นคิวทั้งหมดของคุณค่ะ ถ้าใส่รหัสคิวด้วย จะเลื่อนนัด ยกเลิก หรือรีวิวได้เลย
          </p>
        </div>

        <form onSubmit={handleSearch} className="glass-solid rounded-[24px] p-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-[#3A2A31]">
            เบอร์โทรที่ใช้จอง
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 0812345678"
              inputMode="tel"
              autoComplete="tel"
              className="rounded-xl border border-blush-200 px-4 py-3 text-sm font-normal placeholder:text-[#7A6670] outline-none focus:ring-2 focus:ring-rose-300"
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-[#3A2A31]">
            <span>รหัสคิว <span className="font-normal text-[#6B5560]">(ไม่บังคับ)</span></span>
            <input
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              placeholder="เช่น NG-20260807-0001"
              autoCapitalize="characters"
              className="rounded-xl border border-blush-200 px-4 py-3 text-sm font-normal placeholder:text-[#7A6670] outline-none focus:ring-2 focus:ring-rose-300"
            />
          </label>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-candy px-6 py-3 whitespace-nowrap"
          >
            {status === 'loading' ? 'กำลังค้นหา...' : 'ดูประวัติ'}
          </button>
          <p className="text-xs text-[#6B5560] sm:col-span-3">
            รหัสคิวอยู่ในหน้าจองสำเร็จ และในแชท LINE ของร้าน ถ้าจองจากเครื่องนี้ เว็บจำไว้ให้แล้วค่ะ
          </p>
        </form>
        {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

        {data && !data.verified && (
          <p className="text-xs text-gold bg-gold/10 border border-gold/30 rounded-xl px-4 py-2.5 mt-3 text-center">
            <Icon name="lock" className="inline h-4 w-4 -mt-0.5 mr-1" />นี่คือสรุปแบบย่อ ใส่รหัสคิวด้านบนด้วย จะเห็นเวลา ราคา รูปที่แนบ และเลื่อนนัด ยกเลิก หรือรีวิวได้ค่ะ
          </p>
        )}

        {data && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#2E1F26] mb-4">ประวัติการจอง ({data.bookings.length})</h2>
              <div className="space-y-3">
                {data.bookings.length === 0 && <p className="text-sm text-[#6B5560]">ยังไม่เจอคิวของเบอร์นี้นะคะ</p>}
                {!data.verified && data.bookings.map((b, i) => (
                  <div key={i} className="glass-solid rounded-[24px] p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-[#2E1F26]">{b.service_name}</p>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blush-100 text-berry">
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B5560]">{b.booking_date}</p>
                  </div>
                ))}
                {data.verified && data.bookings.map((b) => (
                  <div key={b.id} className="glass-solid rounded-[24px] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-[#2E1F26]">{b.service_name}</p>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blush-100 text-berry">
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B5560]">
                      {b.booking_code} · {b.booking_date} {b.booking_time} น. · {b.price} บาท
                    </p>
                    {b.reference_image_url && (
                      <ZoomableImage src={b.reference_image_url} alt="รูปที่แนบ" caption={b.service_name} className="mt-2 block w-20 h-20 rounded-lg" />
                    )}
                    {b.admin_note && (
                      <p className="text-xs text-[#6B5560] mt-2 pt-2 border-t border-blush-100">
                        หมายเหตุจากร้าน: {b.admin_note}
                      </p>
                    )}

                    {['pending', 'confirmed'].includes(b.status) && isTooLateToChange(b, shop?.cancel_cutoff_hours) && (
                      <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        ใกล้เวลานัดแล้ว (ร้านให้ยกเลิก/เลื่อนผ่านเว็บได้ล่วงหน้าอย่างน้อย {shop.cancel_cutoff_hours} ชั่วโมง)
                        ถ้ามาไม่ได้ ทักหรือโทรบอกร้านได้เลยนะคะ{shop.phone ? ` โทร ${shop.phone}` : ''}
                      </p>
                    )}
                    {['pending', 'confirmed'].includes(b.status) && !isTooLateToChange(b, shop?.cancel_cutoff_hours) && (
                      <div className="mt-3 flex items-center gap-4">
                        <Link
                          to={`/booking/edit?code=${encodeURIComponent(b.booking_code)}&phone=${encodeURIComponent(phone.trim())}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-berry hover:underline"
                        >
                          <Icon name="edit" className="h-4 w-4" /> แก้ไขวันเวลา
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCancel(b)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline"
                        >
                          <Icon name="x" className="h-4 w-4" /> ยกเลิกคิวนี้
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
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-berry hover:underline"
                        >
                          <Icon name="star" className="h-4 w-4" /> ให้คะแนนบริการนี้
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            {data.tryon_history.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-[#2E1F26] mb-4">ประวัติการทดลองลายเล็บ (AI)</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {data.tryon_history.map((t) => (
                    <div key={t.id} className="glass-solid rounded-2xl overflow-hidden">
                      {t.result_image_url && <img loading="lazy" decoding="async" src={t.result_image_url} alt="ผลลัพธ์ AI" className="w-full aspect-square object-cover" />}
                      <div className="p-2">
                        <p className="text-xs text-[#6B5560]">{t.pattern} · {t.nail_shape}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.reviews.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-[#2E1F26] mb-4">รีวิวที่เคยให้</h2>
                <div className="space-y-3">
                  {data.reviews.map((r) => (
                    <div key={r.id} className="glass-solid rounded-[24px] p-4">
                      <Stars count={r.rating} />
                      {r.comment && <p className="text-sm text-[#5B4650] mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
