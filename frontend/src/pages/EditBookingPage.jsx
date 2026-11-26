import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'
import DateTimePicker from '../components/booking/DateTimePicker.jsx'
import CancelPolicyNote from '../components/CancelPolicyNote.jsx'
import { getBookingStatus, getSavedPhone, getShopSettings, rescheduleBooking, savePhone } from '../api/client.js'
import { isTooLateToChange } from '../utils/cancelPolicy.js'

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
  const [shop, setShop] = useState(null) // เวลาล่วงหน้าที่ร้านกำหนด + เบอร์ร้าน (ไม่ได้ก็ข้ามไป เซิร์ฟเวอร์ยังตรวจให้อยู่ดี)

  useEffect(() => {
    getShopSettings().then(setShop).catch(() => {})
  }, [])

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
    <div className="relative isolate min-h-screen text-[#2E1F26] overflow-x-clip">
      <DreamyBackground />
      <Header />
      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-[#2E1F26]">แก้ไขวันเวลาการจอง</h1>
          <p className="text-[#6B5560] mt-2">ใส่รหัสคิวกับเบอร์โทรที่ใช้ตอนจองนะคะ</p>
        </div>

        {!booking && (
          <form onSubmit={handleSearch} className="glass-solid rounded-[24px] p-6 sm:p-8 space-y-4">
            <div>
              <label htmlFor="edit-code" className="block text-sm font-medium text-[#3A2A31] mb-1.5">รหัสคิว</label>
              <input
                id="edit-code"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value)}
                placeholder="เช่น NG-20260807-0001"
                className="w-full rounded-xl border border-blush-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-phone" className="block text-sm font-medium text-[#3A2A31] mb-1.5">เบอร์โทรศัพท์</label>
              <input
                id="edit-phone"
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
              className="btn-candy w-full py-3"
            >
              {status === 'loading' ? 'กำลังค้นหา...' : 'ค้นหาคิวของฉัน'}
            </button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </form>
        )}

        {booking && !saved && isTooLateToChange(booking, shop?.cancel_cutoff_hours) && (
          <div className="glass-solid rounded-[24px] p-6 sm:p-8 text-center space-y-3">
            <div className="text-4xl">⏳</div>
            <h2 className="font-display text-xl font-semibold text-[#2E1F26]">ใกล้เวลานัดแล้ว เลื่อนคิวผ่านเว็บไม่ได้</h2>
            <p className="text-sm text-[#6B5560]">
              คิว {booking.booking_code} นัดวันที่ {booking.booking_date} เวลา {booking.booking_time} น.
              ร้านกำหนดให้เลื่อนหรือยกเลิกผ่านเว็บได้ล่วงหน้าอย่างน้อย {shop.cancel_cutoff_hours} ชั่วโมง
            </p>
            <p className="text-sm text-[#3A2A31] font-medium">
              รบกวนติดต่อร้านโดยตรงนะคะ{shop.phone ? ` โทร ${shop.phone}` : ' ทาง LINE หรือโทรหาร้าน'}
            </p>
            <Link to="/history" className="inline-block text-sm font-semibold text-berry hover:underline">ดูประวัติของฉัน</Link>
          </div>
        )}

        {booking && !saved && !isTooLateToChange(booking, shop?.cancel_cutoff_hours) && (
          <div className="glass-solid rounded-[24px] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-blush-100">
              <div>
                <p className="font-display text-xl font-semibold text-[#2E1F26]">{booking.booking_code}</p>
                <p className="text-sm text-[#6B5560] mt-1">{booking.service_name}</p>
              </div>
              <div className="text-right text-sm text-[#6B5560]">
                <p>เดิม: {booking.booking_date}</p>
                <p>{booking.booking_time} น.</p>
              </div>
            </div>

            <CancelPolicyNote hours={shop?.cancel_cutoff_hours || 0} className="mb-6" />

            <DateTimePicker
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              serviceDurationMinutes={booking.estimated_duration_minutes}
              categoryId={booking.category_id}
              excludeBookingId={booking.id}
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedDate || !selectedTime || saving}
              className="btn-candy w-full mt-8 py-3"
            >
              {saving ? 'กำลังบันทึก...' : 'ยืนยันวันเวลาใหม่'}
            </button>
            {saveError && <p className="text-sm text-red-500 text-center mt-3">{saveError}</p>}
            <p className="text-xs text-[#6B5560] text-center mt-4">
              เมื่อยืนยันแล้ว สถานะคิวจะกลับเป็น "รอยืนยัน" อีกครั้ง แล้วร้านจะรีบยืนยันเวลาใหม่ให้นะคะ
            </p>
          </div>
        )}

        {saved && (
          <div className="glass-solid rounded-[24px] p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-berry">
              <Icon name="check" className="h-7 w-7" strokeWidth={2} />
            </div>
            <h2 className="font-display text-xl font-semibold text-[#2E1F26]">แก้ไขวันเวลาสำเร็จ</h2>
            <p className="text-[#6B5560] mt-2">
              {booking.booking_code} วันที่ {booking.booking_date} เวลา {booking.booking_time} น.
            </p>
            <Link
              to="/history"
              className="btn-candy mt-6 px-6 py-3"
            >
              ดูประวัติของฉัน
            </Link>
          </div>
        )}
      </section>
      <Footer />
    </div>
  )
}
