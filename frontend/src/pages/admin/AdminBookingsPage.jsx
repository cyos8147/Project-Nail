import { useEffect, useState } from 'react'
import { adminListBookings, adminUpdateBooking } from '../../api/client.js'

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
const STATUS_LABEL = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิกแล้ว', no_show: 'ไม่มาตามนัด',
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [filters, setFilters] = useState({ status: '', search: '', date_from: '', date_to: '' })
  const [loading, setLoading] = useState(false)
  const [noteDraft, setNoteDraft] = useState({})

  function load() {
    setLoading(true)
    adminListBookings(filters)
      .then(setBookings)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleStatusChange(booking, status) {
    const updated = await adminUpdateBooking(booking.id, { status })
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? updated : b)))
  }

  async function handleSaveNote(booking) {
    const admin_note = noteDraft[booking.id] ?? booking.admin_note
    const updated = await adminUpdateBooking(booking.id, { status: booking.status, admin_note })
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? updated : b)))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">การจองคิว</h1>
        <p className="text-gray-500 text-sm mt-1">ยืนยัน เลื่อน หรือยกเลิกคิว และดูรูปภาพที่ลูกค้าแนบมา</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">ค้นหา (ชื่อ/เบอร์/รหัสคิว)</label>
          <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">สถานะ</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm">
            <option value="">ทั้งหมด</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">จากวันที่</label>
          <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">ถึงวันที่</label>
          <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        </div>
        <button onClick={load} className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-xl">ค้นหา</button>
      </div>

      {loading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}

      <div className="space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-800">{b.customer_name} · {b.customer_phone}</p>
                <p className="text-xs text-gray-400 mt-0.5">{b.booking_code} · {b.service_name} · {b.booking_date} {b.booking_time} น. · {b.price} บาท</p>
                {b.shade_name && <p className="text-xs text-gray-400">โทนสี: {b.shade_name}</p>}
                {b.ai_style_tag && <p className="text-xs text-gray-400">AI style: {b.ai_style_tag} (+{b.ai_extra_minutes} นาที)</p>}
              </div>
              <select
                value={b.status}
                onChange={(e) => handleStatusChange(b, e.target.value)}
                className="rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>

            {b.reference_image_url && (
              <img src={b.reference_image_url} alt="รูปที่ลูกค้าแนบ" className="mt-3 w-20 h-20 rounded-lg object-cover" />
            )}

            <div className="mt-3 flex gap-2">
              <input
                value={noteDraft[b.id] ?? b.admin_note}
                onChange={(e) => setNoteDraft({ ...noteDraft, [b.id]: e.target.value })}
                placeholder="หมายเหตุจากร้าน (ลูกค้าเห็นได้ตอนตรวจสอบสถานะ)"
                className="flex-1 rounded-xl border border-blush-200 px-3 py-2 text-xs"
              />
              <button onClick={() => handleSaveNote(b)} className="text-xs font-semibold text-rose-600 hover:bg-blush-100 px-3 rounded-xl">บันทึก</button>
            </div>
          </div>
        ))}
        {!loading && bookings.length === 0 && <p className="text-sm text-gray-400 text-center py-10">ไม่พบรายการจอง</p>}
      </div>
    </div>
  )
}
