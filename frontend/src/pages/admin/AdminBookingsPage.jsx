import { useEffect, useState } from 'react'
import {
  adminCreateBooking,
  adminDeleteBooking,
  adminListBookings,
  adminUpdateBooking,
  getServiceCategories,
  getServices,
  getShopSettings,
} from '../../api/client.js'
import DateTimePicker from '../../components/booking/DateTimePicker.jsx'

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
const STATUS_LABEL = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิกแล้ว', no_show: 'ไม่มาตามนัด',
}

// คิวที่เลยเวลานัดไปแล้วแต่ยังไม่ถูกปิดสถานะ (pending/confirmed ค้างอยู่) -- แค่จุดสังเกตให้แอดมินเห็นง่าย
// ว่าควรตามเรื่อง ไม่ได้เปลี่ยนสถานะให้อัตโนมัติ (แอดมินเป็นคนตัดสินใจเองว่าลูกค้ามาจริงหรือไม่มา)
function isOverdue(b) {
  if (!['pending', 'confirmed'].includes(b.status)) return false
  const start = new Date(`${b.booking_date}T${b.booking_time}:00+07:00`) // เวลานัดเป็นเวลาไทยเสมอ ไม่ขึ้นกับเขตเวลาของเครื่องที่เปิดหน้านี้
  const end = new Date(start.getTime() + (b.estimated_duration_minutes || 60) * 60000)
  return end < new Date()
}

const initialNewBooking = { category_id: '', service_id: '', customer_name: '', customer_phone: '', line_id: '', status: 'confirmed', admin_note: '' }

function CreateBookingForm({ onCreated, onCancel }) {
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [closedWeekdays, setClosedWeekdays] = useState(null)
  const [form, setForm] = useState(initialNewBooking)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getServiceCategories().then((list) => {
      setCategories(list)
      if (list[0]) setForm((f) => ({ ...f, category_id: list[0].id }))
    })
    getShopSettings().then((s) => setClosedWeekdays(s.closed_weekdays))
  }, [])

  useEffect(() => {
    if (!form.category_id) return
    setServices([])
    setForm((f) => ({ ...f, service_id: '' }))
    getServices(form.category_id).then((list) => {
      setServices(list)
      if (list[0]) setForm((f) => ({ ...f, service_id: list[0].id }))
    })
  }, [form.category_id])

  const selectedService = services.find((s) => s.id === form.service_id)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedDate || !selectedTime) {
      setError('กรุณาเลือกวันและเวลา')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await adminCreateBooking({
        ...form,
        booking_date: selectedDate,
        booking_time: selectedTime,
      })
      onCreated(created)
    } catch (err) {
      setError(err.message || 'จองคิวไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 space-y-4">
      <p className="font-medium text-gray-700">เพิ่มคิวใหม่ (ลูกค้าโทรจอง / walk-in)</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">หมวดหมู่</label>
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">บริการ</label>
          <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm">
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.price} บาท)</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">ชื่อลูกค้า</label>
          <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">เบอร์โทร</label>
          <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">ไอดีไลน์ (ไม่บังคับ)</label>
          <input value={form.line_id} onChange={(e) => setForm({ ...form, line_id: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">สถานะเริ่มต้น</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
      </div>

      {selectedService && closedWeekdays !== null && (
        <DateTimePicker
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          serviceDurationMinutes={selectedService.duration_minutes}
          categoryId={form.category_id}
          closedWeekdays={closedWeekdays}
        />
      )}

      <div>
        <label className="text-xs text-gray-500 block mb-1">หมายเหตุ (ไม่บังคับ)</label>
        <input value={form.admin_note} onChange={(e) => setForm({ ...form, admin_note: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
          {submitting ? 'กำลังบันทึก...' : 'บันทึกคิว'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">ยกเลิก</button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </form>
  )
}

// วันที่ตามเวลาไทย (YYYY-MM-DD) offsetDays วันจากวันนี้ -- บวก 7 ชม. แล้วอ่านเป็น UTC จึงไม่ขึ้นกับเขตเวลาของเครื่อง
function thaiDate(offsetDays = 0) {
  return new Date(Date.now() + 7 * 3600 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10)
}

function dateHeading(dateStr) {
  const text = new Date(`${dateStr}T12:00:00+07:00`).toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  })
  if (dateStr === thaiDate(0)) return `วันนี้ · ${text}`
  if (dateStr === thaiDate(1)) return `พรุ่งนี้ · ${text}`
  return text
}

// ปุ่มลัดดูคิวตามช่วงวัน: ช่วงวันจะเรียงตามเวลานัด (เช้า -> เย็น) ส่วน "ทั้งหมด" เรียงตามเวลาที่ลูกค้ากดจอง (ใหม่สุดก่อน) เหมือนเดิม
const QUICK_FILTERS = [
  { key: 'today', label: 'วันนี้', range: () => [thaiDate(0), thaiDate(0)] },
  { key: 'tomorrow', label: 'พรุ่งนี้', range: () => [thaiDate(1), thaiDate(1)] },
  { key: 'week', label: '7 วันข้างหน้า', range: () => [thaiDate(0), thaiDate(6)] },
  { key: 'all', label: 'ทั้งหมด', range: () => ['', ''] },
]

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [quick, setQuick] = useState('week') // ปุ่มลัดที่เลือกอยู่ ('custom' = กำหนดวันที่เอง)
  const [filters, setFilters] = useState(() => {
    const [from, to] = QUICK_FILTERS.find((f) => f.key === 'week').range()
    return { status: '', search: '', date_from: from, date_to: to }
  })
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [noteDraft, setNoteDraft] = useState({})
  const [showCreateForm, setShowCreateForm] = useState(false)

  // มีช่วงวันที่ -> เรียงตามเวลานัด, ไม่มี -> ใหม่สุดก่อน
  const byAppointment = Boolean(filters.date_from || filters.date_to)

  function load(next = filters) {
    setLoading(true)
    setLoadError(null)
    adminListBookings({ ...next, sort: next.date_from || next.date_to ? 'appointment' : 'created' })
      .then(setBookings)
      .catch((err) => setLoadError(err.message || 'โหลดรายการจองไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }

  useEffect(() => load(), [])

  function applyQuick(key) {
    const [from, to] = QUICK_FILTERS.find((f) => f.key === key).range()
    const next = { ...filters, date_from: from, date_to: to }
    setQuick(key)
    setFilters(next)
    load(next)
  }

  function handleSearch() {
    // ค้นหาด้วยชื่อ/เบอร์/รหัสคิว ต้องค้นทุกวัน ไม่งั้นลูกค้าเก่าที่นัดไว้นอกช่วงที่เลือกอยู่จะหาไม่เจอ
    if (filters.search.trim() && quick !== 'custom') {
      const next = { ...filters, date_from: '', date_to: '' }
      setQuick('all')
      setFilters(next)
      load(next)
    } else {
      load()
    }
  }

  function setDateFilter(field, value) {
    setQuick('custom')
    setFilters({ ...filters, [field]: value })
  }

  async function handleStatusChange(booking, status) {
    const updated = await adminUpdateBooking(booking.id, { status })
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? updated : b)))
  }

  async function handleSaveNote(booking) {
    const admin_note = noteDraft[booking.id] ?? booking.admin_note
    const updated = await adminUpdateBooking(booking.id, { status: booking.status, admin_note })
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? updated : b)))
  }

  async function handleDelete(booking) {
    if (!window.confirm(`ลบคิว ${booking.booking_code} (${booking.customer_name}) ถาวรเลยหรือไม่? กู้คืนไม่ได้`)) return
    await adminDeleteBooking(booking.id)
    setBookings((prev) => prev.filter((b) => b.id !== booking.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">การจองคิว</h1>
          <p className="text-gray-500 text-sm mt-1">ยืนยัน เลื่อน หรือยกเลิกคิว และดูรูปภาพที่ลูกค้าแนบมา</p>
        </div>
        {!showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap"
          >
            + เพิ่มคิวใหม่
          </button>
        )}
      </div>

      {showCreateForm && (
        <CreateBookingForm
          onCreated={() => {
            setShowCreateForm(false)
            applyQuick('all') // ดูทั้งหมด (ใหม่สุดก่อน) คิวที่เพิ่งเพิ่มจะขึ้นบนสุดเสมอ ไม่ว่าวันนัดจะอยู่นอกช่วงที่เลือกอยู่หรือไม่
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="เลือกช่วงวันที่ของคิว">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => applyQuick(f.key)}
              aria-pressed={quick === f.key}
              className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
                quick === f.key ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-rose-600 border-blush-200 hover:bg-blush-100'
              }`}
            >
              {f.label}
            </button>
          ))}
          {quick === 'custom' && <span className="text-xs text-gray-400">กำหนดวันที่เอง</span>}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="bk-search" className="text-xs text-gray-500 block mb-1">ค้นหา (ชื่อ/เบอร์/รหัสคิว)</label>
            <input
              id="bk-search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="rounded-xl border border-blush-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="bk-status" className="text-xs text-gray-500 block mb-1">สถานะ</label>
            <select id="bk-status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm">
              <option value="">ทั้งหมด</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bk-from" className="text-xs text-gray-500 block mb-1">จากวันที่</label>
            <input id="bk-from" type="date" value={filters.date_from} onChange={(e) => setDateFilter('date_from', e.target.value)} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="bk-to" className="text-xs text-gray-500 block mb-1">ถึงวันที่</label>
            <input id="bk-to" type="date" value={filters.date_to} onChange={(e) => setDateFilter('date_to', e.target.value)} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <button type="button" onClick={handleSearch} className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-xl">ค้นหา</button>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}
      {loadError && <p className="text-sm text-red-500">{loadError}</p>}
      {!loading && !loadError && bookings.length > 0 && <p className="text-sm text-gray-500">พบ {bookings.length} คิว</p>}

      <div className="space-y-3">
        {bookings.map((b, index) => (
          <div key={b.id} className="space-y-3">
          {byAppointment && (index === 0 || bookings[index - 1].booking_date !== b.booking_date) && (
            <h2 className="pt-2 font-display text-base font-bold text-gray-700">
              {dateHeading(b.booking_date)}
              <span className="ml-2 text-xs font-normal text-gray-400">
                {bookings.filter((x) => x.booking_date === b.booking_date).length} คิว
              </span>
            </h2>
          )}
          <div className={`bg-white rounded-2xl shadow-card p-5 ${isOverdue(b) ? 'ring-1 ring-amber-300' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-800">
                  {b.customer_name} · {b.customer_phone}
                  {isOverdue(b) && (
                    <span className="ml-2 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full align-middle">
                      ⚠️ เลยเวลานัดแล้ว
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{b.booking_code} · {b.service_name} · {b.booking_date} {b.booking_time} น. · {b.price} บาท</p>
                {b.shade_name && <p className="text-xs text-gray-400">โทนสี: {b.shade_name}</p>}
                {b.ai_style_tag && <p className="text-xs text-gray-400">AI style: {b.ai_style_tag} (+{b.ai_extra_minutes} นาที)</p>}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={b.status}
                  onChange={(e) => handleStatusChange(b, e.target.value)}
                  className="rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(b)}
                  title="ลบคิวนี้ถาวร"
                  className="text-gray-300 hover:text-red-500 text-lg leading-none px-1.5 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {b.reference_image_url && (
              <img loading="lazy" decoding="async" src={b.reference_image_url} alt="รูปที่ลูกค้าแนบ" className="mt-3 w-20 h-20 rounded-lg object-cover" />
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
          </div>
        ))}
        {!loading && !loadError && bookings.length === 0 && (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm text-gray-400">
              {quick === 'today' ? 'วันนี้ยังไม่มีคิว' : quick === 'tomorrow' ? 'พรุ่งนี้ยังไม่มีคิว' : quick === 'week' ? 'ยังไม่มีคิวในช่วง 7 วันข้างหน้า' : 'ไม่พบรายการจอง'}
            </p>
            {quick !== 'all' && (
              <button type="button" onClick={() => applyQuick('all')} className="text-sm font-semibold text-rose-600 hover:underline">
                ดูคิวทั้งหมด
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
