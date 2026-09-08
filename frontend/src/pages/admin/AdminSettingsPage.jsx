import { useEffect, useState } from 'react'
import {
  adminAddHoliday,
  adminChangePassword,
  adminDeleteHoliday,
  adminListHolidays,
  adminUpdateShopSettings,
  getShopSettings,
} from '../../api/client.js'

const WEEKDAYS = [
  { id: 0, label: 'อาทิตย์' }, { id: 1, label: 'จันทร์' }, { id: 2, label: 'อังคาร' }, { id: 3, label: 'พุธ' },
  { id: 4, label: 'พฤหัสบดี' }, { id: 5, label: 'ศุกร์' }, { id: 6, label: 'เสาร์' },
]

export default function AdminSettingsPage() {
  const [form, setForm] = useState(null)
  const [holidays, setHolidays] = useState([])
  const [newHoliday, setNewHoliday] = useState({ holiday_date: '', note: '' })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState(null)

  function load() {
    getShopSettings().then(setForm)
    adminListHolidays().then(setHolidays)
  }
  useEffect(load, [])

  function toggleClosedDay(dayId) {
    const set = new Set(form.closed_weekdays)
    if (set.has(dayId)) set.delete(dayId)
    else set.add(dayId)
    setForm({ ...form, closed_weekdays: [...set] })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    try {
      const updated = await adminUpdateShopSettings(form)
      setForm(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddHoliday(e) {
    e.preventDefault()
    if (!newHoliday.holiday_date) return
    await adminAddHoliday(newHoliday)
    setNewHoliday({ holiday_date: '', note: '' })
    load()
  }

  async function handleDeleteHoliday(id) {
    await adminDeleteHoliday(id)
    load()
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError(null)
    if (pwForm.new_password.length < 8) {
      setPwError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน')
      return
    }
    try {
      await adminChangePassword(pwForm.current_password, pwForm.new_password)
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 2500)
    } catch (err) {
      setPwError(err.message)
    }
  }

  if (!form) return <p className="text-gray-400">กำลังโหลด...</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">ตั้งค่าร้าน</h1>
        <p className="text-gray-500 text-sm mt-1">เวลาทำการ วันหยุดประจำสัปดาห์ และข้อมูลติดต่อ</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <p className="font-medium text-gray-700 mb-3">เปลี่ยนรหัสผ่านแอดมิน</p>
        <form onSubmit={handleChangePassword} className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">รหัสผ่านเดิม</label>
            <input
              type="password"
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">รหัสผ่านใหม่ (8 ตัวขึ้นไป)</label>
            <input
              type="password"
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
              className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
              เปลี่ยนรหัสผ่าน
            </button>
            {pwSaved && <span className="text-sm text-green-600">✅ เปลี่ยนรหัสผ่านแล้ว</span>}
            {pwError && <span className="text-sm text-red-500">{pwError}</span>}
          </div>
        </form>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">ชื่อร้าน</label>
            <input value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">เบอร์โทรร้าน</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">ที่อยู่</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">LINE OA Basic ID</label>
            <input value={form.line_oa_basic_id} onChange={(e) => setForm({ ...form, line_oa_basic_id: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" placeholder="@nailglow" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">ช่วงเวลาต่อคิว (นาที)</label>
            <input type="number" value={form.slot_interval_minutes} onChange={(e) => setForm({ ...form, slot_interval_minutes: Number(e.target.value) })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">เวลาเปิด</label>
            <input type="time" value={form.opening_time} onChange={(e) => setForm({ ...form, opening_time: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">เวลาปิด</label>
            <input type="time" value={form.closing_time} onChange={(e) => setForm({ ...form, closing_time: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-2">วันหยุดประจำสัปดาห์</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleClosedDay(d.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                  form.closed_weekdays.includes(d.id) ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 border border-blush-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
          บันทึกการตั้งค่า
        </button>
        {saved && <span className="text-sm text-green-600 ml-3">✅ บันทึกแล้ว</span>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <p className="font-medium text-gray-700 mb-3">วันหยุดพิเศษ</p>
        <form onSubmit={handleAddHoliday} className="flex flex-wrap gap-2 mb-4">
          <input type="date" value={newHoliday.holiday_date} onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
          <input type="text" placeholder="หมายเหตุ" value={newHoliday.note} onChange={(e) => setNewHoliday({ ...newHoliday, note: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm flex-1" />
          <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-xl">+ เพิ่ม</button>
        </form>
        <div className="space-y-1.5">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm py-1.5 border-b border-blush-50">
              <span className="text-gray-600">{h.holiday_date} {h.note && `· ${h.note}`}</span>
              <button onClick={() => handleDeleteHoliday(h.id)} className="text-gray-300 hover:text-red-500">✕</button>
            </div>
          ))}
          {holidays.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีวันหยุดพิเศษ</p>}
        </div>
      </div>
    </div>
  )
}
