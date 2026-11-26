import { useEffect, useState } from 'react'
import { getAvailability, getChainAvailability } from '../../api/client.js'
import { CLOSED_WEEKDAY } from '../../data/bookingData.js'
import Icon from '../Icon.jsx'

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
  categoryId,
  closedWeekdays,
  excludeBookingId,
  chainParam = null, // จองหลายบริการต่อกัน: "hair:60,nail:45" → ใช้คิวว่างของทั้งชุด
  chainPreview = null, // (time) => [{service, start, end}] แสดงตารางเวลาของแต่ละบริการเมื่อเลือกเวลา
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
    if (!selectedDate || !categoryId) return
    let cancelled = false
    setLoadingSlots(true)
    setSlotsError(null)
    const req = chainParam
      ? getChainAvailability(selectedDate, chainParam)
      : getAvailability(selectedDate, serviceDurationMinutes, categoryId, excludeBookingId)
    req
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
  }, [selectedDate, serviceDurationMinutes, categoryId, excludeBookingId, chainParam])

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-gray-800 text-center mb-1">เลือกวันและเวลา</h2>
      <p className="text-gray-500 text-center text-sm mb-8">เลือกวันที่สะดวก แล้วเลือกเวลาที่ยังว่างอยู่ค่ะ</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="glass-solid rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrevMonth}
              disabled={isBeforeCurrentMonth}
              aria-label="เดือนก่อนหน้า"
              className="glass-btn w-9 h-9"
            >
              <Icon name="chevronLeft" />
            </button>
            <p className="font-display font-semibold text-gray-800">
              {THAI_MONTHS[viewMonth]} {viewYear + 543}
            </p>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="เดือนถัดไป"
              className="glass-btn w-9 h-9"
            >
              <Icon name="chevronRight" />
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

          <p className="text-[11px] text-gray-400 mt-4">* วันที่กดไม่ได้ คือวันที่ร้านหยุดหรือเลยมาแล้วค่ะ</p>
        </div>

        {/* Time slots */}
        <div className="glass-solid rounded-2xl p-5">
          <p className="font-display font-semibold text-gray-800 mb-4">
            {selectedDate ? 'ช่วงเวลาที่ว่าง' : 'กรุณาเลือกวันที่ก่อน'}
          </p>

          {!selectedDate && (
            <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-gray-400">
              เลือกวันจากปฏิทินก่อนนะคะ
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
                <p className="col-span-3 text-sm text-gray-400 text-center py-8">วันนี้คิวเต็มแล้ว ลองเลือกวันอื่นดูนะคะ</p>
              )}
              {slots.map((s) => {
                const isSelected = selectedTime === s.time
                return (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setSelectedTime(s.time)}
                    className={`py-2.5 text-sm ${
                      isSelected
                        ? 'btn-candy'
                        : !s.available
                        ? 'rounded-full font-medium bg-blush-100 text-gray-300 line-through cursor-not-allowed'
                        : 'btn-candy-soft'
                    }`}
                  >
                    {s.time}
                  </button>
                )
              })}
            </div>
          )}

          {selectedDate && selectedTime && chainPreview && (
            <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3">
              <p className="text-xs font-semibold text-rose-700 mb-1.5">ตารางเวลาของคุณ</p>
              <ol className="space-y-1">
                {chainPreview(selectedTime).map((c, i) => (
                  <li key={c.service.id} className="flex justify-between gap-3 text-xs text-gray-700">
                    <span>{i + 1}. {c.service.name}</span>
                    <span className="font-semibold whitespace-nowrap">{c.start}–{c.end} น.</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {selectedDate && (
            <p className="text-[11px] text-gray-400 mt-4">
              * ช่วงเวลาที่มีเส้นขีดคือคิวที่ถูกจองแล้ว{chainParam ? ' (เวลาที่เลือกได้คือเวลาที่ทุกบริการในชุดว่างต่อกันพอดี)' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
