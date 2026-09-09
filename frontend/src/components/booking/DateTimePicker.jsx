import { useEffect, useState } from 'react'
import { getAvailability } from '../../api/client.js'
import { CLOSED_WEEKDAY } from '../../data/bookingData.js'

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const THAI_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function startOfToday() {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

export default function DateTimePicker({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  serviceDurationMinutes = 60,
  closedWeekdays,
  excludeBookingId,
}) {
  const today = startOfToday()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState(null)

  const closedDays = closedWeekdays?.length ? closedWeekdays : [CLOSED_WEEKDAY]

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const isBeforeCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  function goPrevMonth() {
    if (isBeforeCurrentMonth) return
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear
    setViewYear(newYear)
    setViewMonth(newMonth)
  }

  function goNextMonth() {
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear
    setViewYear(newYear)
    setViewMonth(newMonth)
  }

  function isDayDisabled(day) {
    const date = new Date(viewYear, viewMonth, day)
    if (date < today) return true
    if (closedDays.includes(date.getDay())) return true
    return false
  }

  function handleSelectDay(day) {
    if (isDayDisabled(day)) return
    const dateKey = toDateKey(viewYear, viewMonth, day)
    setSelectedDate(dateKey)
    setSelectedTime(null)
  }

  useEffect(() => {
    if (!selectedDate) return
    let cancelled = false
    setLoadingSlots(true)
    setSlotsError(null)
    getAvailability(selectedDate, serviceDurationMinutes, excludeBookingId)
      .then((res) => {
        if (!cancelled) setSlots(res.slots || [])
      })
      .catch((err) => {
        if (!cancelled) setSlotsError(err.message || 'โหลดช่วงเวลาว่างไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedDate, serviceDurationMinutes, excludeBookingId])

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-gray-800 text-center mb-1">เลือกวันและเวลา</h2>
      <p className="text-gray-500 text-center text-sm mb-8">ดูปฏิทินวันที่จองได้ และเลือกช่วงเวลาที่ว่าง</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrevMonth}
              disabled={isBeforeCurrentMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-blush-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ‹
            </button>
            <p className="font-display font-semibold text-gray-800">
              {THAI_MONTHS[viewMonth]} {viewYear + 543}
            </p>
            <button
              type="button"
              onClick={goNextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-blush-100"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
            {THAI_WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const dateKey = toDateKey(viewYear, viewMonth, day)
              const disabled = isDayDisabled(day)
              const isSelected = selectedDate === dateKey
              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDay(day)}
                  className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-rose-500 text-white font-semibold'
                      : disabled
                      ? 'text-gray-300 line-through'
                      : 'text-gray-700 hover:bg-blush-100'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-gray-400 mt-4">* วันหยุดร้านตั้งค่าได้จากหน้าแอดมิน</p>
        </div>

        {/* Time slots */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="font-display font-semibold text-gray-800 mb-4">
            {selectedDate ? 'ช่วงเวลาที่ว่าง' : 'กรุณาเลือกวันที่ก่อน'}
          </p>

          {!selectedDate && (
            <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-gray-400">
              เลือกวันที่จากปฏิทินด้านซ้าย
            </div>
          )}

          {selectedDate && loadingSlots && (
            <div className="h-full min-h-[180px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blush-200 border-t-rose-500 rounded-full animate-spin" />
            </div>
          )}

          {selectedDate && !loadingSlots && slotsError && (
            <p className="text-sm text-red-500 text-center py-8">{slotsError}</p>
          )}

          {selectedDate && !loadingSlots && !slotsError && (
            <div className="grid grid-cols-3 gap-2">
              {slots.length === 0 && (
                <p className="col-span-3 text-sm text-gray-400 text-center py-8">ไม่มีช่วงเวลาว่างในวันนี้</p>
              )}
              {slots.map((s) => {
                const isSelected = selectedTime === s.time
                return (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setSelectedTime(s.time)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-rose-500 text-white'
                        : !s.available
                        ? 'bg-blush-100 text-gray-300 line-through cursor-not-allowed'
                        : 'bg-blush-50 text-gray-600 hover:bg-blush-100 border border-blush-200'
                    }`}
                  >
                    {s.time}
                  </button>
                )
              })}
            </div>
          )}

          {selectedDate && <p className="text-[11px] text-gray-400 mt-4">* ช่วงเวลาที่มีเส้นขีดคือคิวที่ถูกจองแล้ว</p>}
        </div>
      </div>
    </div>
  )
}
