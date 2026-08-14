import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { cancelBooking, getBookingStatus, getSavedPhone, savePhone } from '../api/client.js'

const STATUS_LABEL = {
  pending: { text: 'รอยืนยัน', color: 'bg-amber-100 text-amber-700' },
  confirmed: { text: 'ยืนยันแล้ว', color: 'bg-blue-100 text-blue-700' },
  completed: { text: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700' },
  cancelled: { text: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500' },
  no_show: { text: 'ไม่มาตามนัด', color: 'bg-red-100 text-red-600' },
}

export default function BookingStatusPage() {
  const [bookingCode, setBookingCode] = useState('')
  const [phone, setPhone] = useState(getSavedPhone())
  const [booking, setBooking] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    try {
      const res = await getBookingStatus(bookingCode.trim().toUpperCase(), phone.trim())
      setBooking(res)
      savePhone(phone.trim())
      setStatus('done')
    } catch (err) {
      setError(err.message || 'ไม่พบข้อมูลการจอง')
      setStatus('error')
    }
  }

  async function handleCancel() {
    if (!booking) return
    if (!window.confirm('ยืนยันยกเลิกคิวนี้หรือไม่?')) return
    try {
      const updated = await cancelBooking(booking.id, phone.trim())
      setBooking(updated)
    } catch (err) {
      setError(err.message || 'ยกเลิกไม่สำเร็จ')
    }
  }

  const label = booking ? STATUS_LABEL[booking.status] : null

  return (
    <div className="min-h-screen bg-blush-50 text-gray-800">
      <Header />
      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800">ตรวจสอบสถานะคิว</h1>
          <p className="text-gray-500 mt-2">กรอกรหัสคิวและเบอร์โทรที่ใช้ตอนจอง</p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-card p-6 sm:p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสคิว</label>
            <input
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              placeholder="เช่น NG-20260807-0001"
              className="w-full rounded-xl border border-blush-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812345678"
              className="w-full rounded-xl border border-blush-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 text-white font-semibold py-3 rounded-full shadow-card transition-colors"
          >
            {status === 'loading' ? 'กำลังค้นหา...' : 'ตรวจสอบสถานะ'}
          </button>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </form>

        {booking && (
          <div className="bg-white rounded-3xl shadow-card p-6 sm:p-8 mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-xl font-bold text-gray-800">{booking.booking_code}</p>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${label.color}`}>{label.text}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">บริการ</span><span className="font-medium">{booking.service_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">วันที่</span><span className="font-medium">{booking.booking_date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">เวลา</span><span className="font-medium">{booking.booking_time} น.</span></div>
              <div className="flex justify-between"><span className="text-gray-500">ราคา</span><span className="font-medium text-rose-600">{booking.price} บาท</span></div>
              {booking.admin_note && (
                <div className="pt-2 border-t border-blush-100">
                  <span className="text-gray-500">หมายเหตุจากร้าน: </span>
                  <span>{booking.admin_note}</span>
                </div>
              )}
            </div>
            {['pending', 'confirmed'].includes(booking.status) && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full mt-6 bg-white hover:bg-red-50 text-red-500 font-semibold py-3 rounded-full border border-red-200 transition-colors"
              >
                ยกเลิกคิวนี้
              </button>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          ดูประวัติการจองและรีวิวทั้งหมดของคุณได้ที่ <Link to="/history" className="text-rose-600 font-medium">หน้าประวัติของฉัน</Link>
        </p>
      </section>
      <Footer />
    </div>
  )
}
