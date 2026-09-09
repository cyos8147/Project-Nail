import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import DateTimePicker from '../components/booking/DateTimePicker.jsx'
import { getBookingStatus, getSavedPhone, rescheduleBooking, savePhone } from '../api/client.js'

export default function EditBookingPage() {
  const [searchParams] = useSearchParams()
  const [bookingCode, setBookingCode] = useState(searchParams.get('code') || '')
  const [phone, setPhone] = useState(searchParams.get('phone') || getSavedPhone())
  const [booking, setBooking] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  async function lookup(code, ph) {
    setStatus('loading')
    setError(null)
    try {
      const res = await getBookingStatus(code.trim().toUpperCase(), ph.trim())
      if (!['pending', 'confirmed'].includes(res.status)) {
        setError(`คิวนี้ไม่สามารถแก้ไขวันเวลาได้แล้ว (สถานะปัจจุบัน: ${res.status})`)
        setStatus('error')
        return
      }
      setBooking(res)
      savePhone(ph.trim())
      setStatus('done')
    } catch (err) {
      setError(err.message || 'ไม่พบข้อมูลการจอง')
      setStatus('error')
    }
  }

  useEffect(() => {
    const c = searchParams.get('code')
    const p = searchParams.get('phone')
    if (c && p) lookup(c, p)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    if (bookingCode.trim() && phone.trim()) lookup(bookingCode, phone)
  }

  async function handleSave() {
    if (!booking || !selectedDate || !selectedTime) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await rescheduleBooking(booking.id, phone.trim(), selectedDate, selectedTime)
      setBooking(updated)
      setSaved(true)
    } catch (err) {
      setSaveError(err.message || 'แก้ไขวันเวลาไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-blush-50 text-gray-800">
      <Header />
      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800">แก้ไขวันเวลาการจอง</h1>
          <p className="text-gray-500 mt-2">กรอกรหัสคิวและเบอร์โทรที่ใช้ตอนจอง</p>
        </div>

        {!booking && (
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
              {status === 'loading' ? 'กำลังค้นหา...' : 'ค้นหาคิวของฉัน'}
            </button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </form>
        )}

        {booking && !saved && (
          <div className="bg-white rounded-3xl shadow-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-blush-100">
              <div>
                <p className="font-display text-xl font-bold text-gray-800">{booking.booking_code}</p>
                <p className="text-sm text-gray-500 mt-1">{booking.service_name}</p>
              </div>
              <div className="text-right text-sm text-gray-400">
                <p>เดิม: {booking.booking_date}</p>
                <p>{booking.booking_time} น.</p>
              </div>
            </div>

            <DateTimePicker
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              serviceDurationMinutes={booking.estimated_duration_minutes}
              excludeBookingId={booking.id}
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedDate || !selectedTime || saving}
              className="w-full mt-8 bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full shadow-card transition-colors"
            >
              {saving ? 'กำลังบันทึก...' : 'ยืนยันวันเวลาใหม่'}
            </button>
            {saveError && <p className="text-sm text-red-500 text-center mt-3">{saveError}</p>}
            <p className="text-xs text-gray-400 text-center mt-4">
              เมื่อยืนยันแล้ว สถานะคิวจะกลับเป็น "รอยืนยัน" อีกครั้ง ทางร้านจะติดต่อยืนยันเวลาใหม่ให้เร็วที่สุด
            </p>
          </div>
        )}

        {saved && (
          <div className="bg-white rounded-3xl shadow-card p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-display text-xl font-bold text-gray-800">แก้ไขวันเวลาสำเร็จ</h2>
            <p className="text-gray-500 mt-2">
              {booking.booking_code} วันที่ {booking.booking_date} เวลา {booking.booking_time} น.
            </p>
            <Link
              to="/status"
              className="inline-block mt-6 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              ตรวจสอบสถานะคิว
            </Link>
          </div>
        )}
      </section>
      <Footer />
    </div>
  )
}
