import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  adminAddHoliday,
  adminChangePassword,
  adminCreateUser,
  adminDeleteHoliday,
  adminDeleteUser,
  adminDownloadFile,
  adminListHolidays,
  adminListUsers,
  adminScheduleConflicts,
  adminUpdateHoliday,
  adminUpdateCategoryStaffCount,
  adminUpdateShopSettings,
  getLastBackupAt,
  getServiceCategories,
  getShopSettings,
} from '../../api/client.js'
import { DAY_NAMES, DISPLAY_ORDER, fromWeekRows, toWeekRows, validateRows } from '../../utils/shopHours.js'
import RestorePanel from '../../components/admin/RestorePanel.jsx'

const ROLE_LABEL = { owner: 'เจ้าของร้าน', staff: 'พนักงาน' }

const CANCEL_CUTOFF_OPTIONS = [0, 1, 2, 3, 6, 12, 24, 48]

// สำรองข้อมูล: ฐานข้อมูล Supabase แผนฟรีไม่มีสำรองอัตโนมัติ จึงให้เจ้าของร้านโหลดสำเนาเก็บไว้เองเป็นระยะ (เฉพาะ owner)
const BACKUP_TABLES = [
  { name: 'bookings', label: 'คิวทั้งหมด' },
  { name: 'customers', label: 'ลูกค้า' },
  { name: 'expenses', label: 'ค่าใช้จ่าย' },
  { name: 'reviews', label: 'รีวิว' },
  { name: 'services', label: 'บริการและราคา' },
  { name: 'nail-designs', label: 'ลายเล็บ' },
]

function backupFileName(name, extension) {
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)
  return `luckysalon-${name}-${today}.${extension}`
}

function BackupSection() {
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)
  const [lastBackup, setLastBackup] = useState(() => getLastBackupAt())

  async function download(path, filename, label) {
    setBusy(filename)
    setMessage(null)
    try {
      await adminDownloadFile(path, filename)
      setLastBackup(getLastBackupAt())
      setMessage({ ok: true, text: `ดาวน์โหลด${label}แล้ว ดูในโฟลเดอร์ Downloads ของเครื่อง` })
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div id="backup" className="scroll-mt-24 bg-white rounded-2xl shadow-card p-6 space-y-4">
      <div>
        <p className="font-medium text-gray-700">สำรองข้อมูลร้าน</p>
        <p className="text-sm text-gray-500 mt-1">
          ข้อมูลคิว ลูกค้า และรายรับทั้งหมดอยู่ในฐานข้อมูลออนไลน์ที่ไม่มีระบบสำรองให้อัตโนมัติ แนะนำให้ดาวน์โหลดเดือนละครั้งเก็บไว้ในที่ปลอดภัย
          (เช่น Google Drive ส่วนตัว) ไฟล์เปิดด้วย Excel หรือ Google Sheets ได้ และใช้ทำบัญชีรายเดือนได้ด้วย
        </p>
      </div>
      <RestorePanel />

      <div>
        <p className="text-xs text-gray-500 mb-2">ไฟล์ CSV สำหรับเปิดดูและทำบัญชีใน Excel (กู้คืนจากไฟล์เหล่านี้ไม่ได้)</p>
        <div className="flex flex-wrap gap-2">
          {BACKUP_TABLES.map((t) => (
            <button
              key={t.name}
              type="button"
              disabled={busy !== null}
              onClick={() => download(`/admin/export/${t.name}.csv`, backupFileName(t.name, 'csv'), t.label)}
              className="text-xs font-medium px-3.5 py-2 rounded-full border border-blush-200 text-gray-600 hover:bg-blush-100 disabled:opacity-50"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {message && <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-500'}`}>{message.ok ? '✅ ' : ''}{message.text}</p>}
      <p className="text-xs text-gray-400">ไฟล์มีชื่อและเบอร์โทรลูกค้า ห้ามส่งต่อหรือโพสต์ที่สาธารณะ</p>
    </div>
  )
}

function CategoryStaffSection() {
  const [categories, setCategories] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    getServiceCategories().then(setCategories).catch((err) => setError(err.message))
  }
  useEffect(load, [])

  function setCount(id, value) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, staff_count: value } : c)))
  }

  async function handleSave(category) {
    setError(null)
    try {
      await adminUpdateCategoryStaffCount(category.id, Number(category.staff_count) || 1)
      setSavedId(category.id)
      setTimeout(() => setSavedId(null), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!categories) return null

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <p className="font-medium text-gray-700 mb-1">จำนวนช่างต่อหมวดหมู่</p>
      <p className="text-xs text-gray-400 mb-4">
        แต่ละหมวดมีช่างคนละคนกัน กำหนดไว้ว่าหมวดนั้นทำพร้อมกันได้กี่คิวในเวลาเดียวกัน (คนละหมวดไม่แย่งคิวกัน
        เช่น จองตัดผมกับจองทำเล็บเวลาเดียวกันได้ตามปกติ)
      </p>
      <div className="space-y-2.5">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 flex-1">{c.name}</span>
            <input
              type="number"
              min={1}
              max={50}
              value={c.staff_count}
              onChange={(e) => setCount(c.id, e.target.value)}
              className="w-20 rounded-xl border border-blush-200 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => handleSave(c)}
              className="text-xs font-semibold text-rose-600 hover:bg-blush-100 px-3 py-1.5 rounded-xl"
            >
              บันทึก
            </button>
            {savedId === c.id && <span className="text-xs text-green-600">✅</span>}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}

function AdminUsersSection() {
  const [users, setUsers] = useState(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', full_name: '', role: 'staff' })
  const [error, setError] = useState(null)

  function load() {
    adminListUsers().then(setUsers).catch((err) => setError(err.message))
  }
  useEffect(load, [])

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)
    try {
      await adminCreateUser(newUser)
      setNewUser({ username: '', password: '', full_name: '', role: 'staff' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`ลบบัญชี "${user.username}" หรือไม่?`)) return
    setError(null)
    try {
      await adminDeleteUser(user.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!users) return null

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <p className="font-medium text-gray-700 mb-3">จัดการบัญชีแอดมิน</p>
      <div className="space-y-1.5 mb-4">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between text-sm py-1.5 border-b border-blush-50">
            <span className="text-gray-600">{u.username} · {u.full_name || '-'} · <span className="text-xs text-gray-400">{ROLE_LABEL[u.role] || u.role}</span></span>
            <button onClick={() => handleDelete(u)} className="text-gray-300 hover:text-red-500">✕</button>
          </div>
        ))}
      </div>
      <form onSubmit={handleCreate} className="grid sm:grid-cols-4 gap-2">
        <input placeholder="ชื่อผู้ใช้" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        <input placeholder="รหัสผ่าน (8 ตัวขึ้นไป)" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        <input placeholder="ชื่อเต็ม" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm">
          <option value="staff">พนักงาน</option>
          <option value="owner">เจ้าของร้าน</option>
        </select>
        <button type="submit" className="sm:col-span-4 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-xl">+ เพิ่มบัญชีแอดมิน</button>
      </form>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}

// ตารางเวลาเปิด-ปิด 7 วัน (ข้อ 4.2): สวิตช์เปิด/ปิดแทนปุ่มวันหยุดประจำสัปดาห์เดิม และตั้งเวลาแยกแต่ละวันได้
function WeekHoursTable({ rows, setRows }) {
  const update = (day, patch) => setRows(rows.map((r) => (r.day === day ? { ...r, ...patch } : r)))
  const firstOpen = DISPLAY_ORDER.map((d) => rows[d]).find((r) => r.open)
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-xs text-gray-500">เวลาเปิด-ปิดแต่ละวัน · ปิดสวิตช์ = วันหยุดประจำสัปดาห์</p>
        {firstOpen && (
          <button
            type="button"
            onClick={() => setRows(rows.map((r) => ({ ...r, openTime: firstOpen.openTime, closeTime: firstOpen.closeTime })))}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            ใช้เวลาของวัน{DAY_NAMES[firstOpen.day]} กับทุกวัน
          </button>
        )}
      </div>
      <div className="rounded-2xl border border-blush-200 divide-y divide-blush-100 overflow-hidden">
        {DISPLAY_ORDER.map((day) => {
          const r = rows[day]
          const bad = r.open && r.closeTime <= r.openTime
          return (
            <div key={day} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${r.open ? 'bg-white' : 'bg-gray-50'}`}>
              <label className="flex items-center gap-3 w-36 cursor-pointer">
                <input
                  type="checkbox"
                  role="switch"
                  checked={r.open}
                  onChange={(e) => update(day, { open: e.target.checked })}
                  className="peer sr-only"
                  aria-label={`เปิดร้านวัน${DAY_NAMES[day]}`}
                />
                <span className="relative w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-rose-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-300" />
                <span className={`text-sm font-medium ${r.open ? 'text-gray-800' : 'text-gray-400'}`}>{DAY_NAMES[day]}</span>
              </label>
              {r.open ? (
                <div className="flex items-center gap-2">
                  <input type="time" value={r.openTime} onChange={(e) => update(day, { openTime: e.target.value })} aria-label={`เวลาเปิดวัน${DAY_NAMES[day]}`} className={`rounded-xl border px-3 py-1.5 text-sm ${bad ? 'border-red-300' : 'border-blush-200'}`} />
                  <span className="text-gray-400">–</span>
                  <input type="time" value={r.closeTime} onChange={(e) => update(day, { closeTime: e.target.value })} aria-label={`เวลาปิดวัน${DAY_NAMES[day]}`} className={`rounded-xl border px-3 py-1.5 text-sm ${bad ? 'border-red-300' : 'border-blush-200'}`} />
                  {bad && <span className="text-xs text-red-500">เวลาปิดต้องหลังเวลาเปิด</span>}
                </div>
              ) : (
                <span className="text-sm text-gray-400">ปิดร้าน (หยุดประจำ)</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// คิวที่ยังรอทำแต่ตรงวันหยุด/นอกเวลาทำการใหม่ -- ระบบไม่ยกเลิกให้เอง แอดมินต้องโทรคุยกับลูกค้า
function ConflictsPanel({ conflicts }) {
  if (!conflicts?.length) return null
  return (
    <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <p className="font-semibold text-amber-900">⚠️ มี {conflicts.length} คิวที่ตรงกับวันหยุดหรืออยู่นอกเวลาทำการใหม่</p>
      <p className="text-xs text-amber-800 mt-1">ระบบไม่ได้ยกเลิกหรือย้ายคิวให้ กรุณาโทรแจ้งลูกค้า แล้วเลื่อนหรือยกเลิกคิวในหน้า "การจองคิว"</p>
      <ul className="mt-3 space-y-1.5">
        {conflicts.map((c) => (
          <li key={c.id} className="text-sm bg-white rounded-xl border border-amber-200 px-3 py-2 flex flex-wrap justify-between gap-2">
            <span><b>{c.booking_date} {c.booking_time} น.</b> · {c.customer_name} · {c.service_name}</span>
            <span className="text-amber-700">{c.reason} · <a href={`tel:${c.customer_phone}`} className="underline">{c.customer_phone}</a></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AdminSettingsPage() {
  const { admin } = useOutletContext()
  const [form, setForm] = useState(null)
  const [holidays, setHolidays] = useState([])
  const [newHoliday, setNewHoliday] = useState({ holiday_date: '', note: '' })
  const [weekRows, setWeekRows] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [holidayError, setHolidayError] = useState(null)
  const [editingHoliday, setEditingHoliday] = useState(null) // { id, holiday_date, note }
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState(null)

  function refreshConflicts() {
    adminScheduleConflicts().then(setConflicts).catch(() => {})
  }

  function load() {
    getShopSettings().then((s) => {
      setForm(s)
      setWeekRows(toWeekRows(s))
    })
    adminListHolidays().then(setHolidays)
    refreshConflicts()
  }
  useEffect(load, [])

  // มาจากลิงก์เตือนสำรองข้อมูล (#backup) -> เลื่อนไปที่การ์ดสำรองข้อมูลหลังหน้าโหลดเสร็จ
  useEffect(() => {
    if (form && window.location.hash === '#backup') document.getElementById('backup')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [form])

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    const rowsError = validateRows(weekRows)
    if (rowsError) {
      setError(rowsError)
      return
    }
    try {
      const updated = await adminUpdateShopSettings({ ...form, ...fromWeekRows(weekRows) })
      setForm(updated)
      setWeekRows(toWeekRows(updated))
      refreshConflicts()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddHoliday(e) {
    e.preventDefault()
    if (!newHoliday.holiday_date) return
    setHolidayError(null)
    try {
      await adminAddHoliday(newHoliday)
      setNewHoliday({ holiday_date: '', note: '' })
      load()
    } catch (err) {
      setHolidayError(err.message)
    }
  }

  async function handleSaveHolidayEdit(e) {
    e.preventDefault()
    setHolidayError(null)
    try {
      await adminUpdateHoliday(editingHoliday.id, { holiday_date: editingHoliday.holiday_date, note: editingHoliday.note })
      setEditingHoliday(null)
      load()
    } catch (err) {
      setHolidayError(err.message)
    }
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

  if (!form || !weekRows) return <p className="text-gray-400">กำลังโหลด...</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">ตั้งค่าร้าน</h1>
        <p className="text-gray-500 text-sm mt-1">เวลาทำการ วันหยุดประจำสัปดาห์ และข้อมูลติดต่อ</p>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 -mt-4" aria-label="ไปยังหัวข้อ">
        {[
          ['#shop', '🏪 ข้อมูลร้านและเวลาทำการ'],
          ['#holidays', '📅 วันหยุดพิเศษ'],
          ['#staff', '💇 จำนวนช่าง'],
          ...(admin?.role === 'owner' ? [['#backup', '💾 สำรองข้อมูล'], ['#users', '👤 บัญชีแอดมิน']] : []),
          ['#password', '🔒 รหัสผ่าน'],
        ].map(([href, label]) => (
          <a key={href} href={href} className="whitespace-nowrap text-xs font-semibold text-gray-600 bg-white border border-blush-200 hover:border-rose-300 hover:text-rose-600 rounded-full px-3.5 py-2 shadow-sm">
            {label}
          </a>
        ))}
      </nav>

      <ConflictsPanel conflicts={conflicts} />

      <form id="shop" onSubmit={handleSave} className="scroll-mt-24 bg-white rounded-2xl shadow-card p-6 space-y-4">
        <p className="font-medium text-gray-700">🏪 ข้อมูลร้านและเวลาทำการ</p>
        <div className="grid sm:grid-cols-2 gap-4">
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
            <input value={form.line_oa_basic_id} onChange={(e) => setForm({ ...form, line_oa_basic_id: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" placeholder="@luckysalon" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">ช่วงเวลาต่อคิว (นาที)</label>
            <input type="number" value={form.slot_interval_minutes} onChange={(e) => setForm({ ...form, slot_interval_minutes: Number(e.target.value) })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label htmlFor="cancel-cutoff" className="text-xs text-gray-500 block mb-1">ลูกค้ายกเลิก/เลื่อนคิวผ่านเว็บได้ล่วงหน้าอย่างน้อย</label>
          <select
            id="cancel-cutoff"
            value={form.cancel_cutoff_hours ?? 0}
            onChange={(e) => setForm({ ...form, cancel_cutoff_hours: Number(e.target.value) })}
            className="w-full sm:w-64 rounded-xl border border-blush-200 px-3 py-2 text-sm"
          >
            {[...new Set([...CANCEL_CUTOFF_OPTIONS, form.cancel_cutoff_hours ?? 0])].sort((a, b) => a - b).map((h) => (
              <option key={h} value={h}>{h === 0 ? 'ไม่จำกัด (ยกเลิกได้ตลอด)' : `${h} ชั่วโมงก่อนเวลานัด`}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            ช่วยลดคนเบี้ยวนัด: ถ้าใกล้เวลานัดกว่านี้ ลูกค้าต้องติดต่อร้านเอง ส่วนแอดมินจัดการคิวได้ตลอด
            ข้อความนี้จะขึ้นให้ลูกค้าเห็นตอนจองและในข้อความ LINE ด้วย
          </p>
        </div>

        <WeekHoursTable rows={weekRows} setRows={setWeekRows} />

        <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
          บันทึกการตั้งค่า
        </button>
        {saved && <span className="text-sm text-green-600 ml-3">✅ บันทึกแล้ว</span>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      <div id="holidays" className="scroll-mt-24 bg-white rounded-2xl shadow-card p-6">
        <p className="font-medium text-gray-700 mb-3">📅 วันหยุดพิเศษ</p>
        <form onSubmit={handleAddHoliday} className="flex flex-wrap gap-2 mb-4">
          <input type="date" value={newHoliday.holiday_date} onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
          <input type="text" placeholder="หมายเหตุ" value={newHoliday.note} onChange={(e) => setNewHoliday({ ...newHoliday, note: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm flex-1" />
          <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-xl">+ เพิ่ม</button>
        </form>
        {holidayError && <p className="text-sm text-red-500 mb-2" role="alert">{holidayError}</p>}
        <div className="space-y-1.5">
          {holidays.map((h) => (
            editingHoliday?.id === h.id ? (
              <form key={h.id} onSubmit={handleSaveHolidayEdit} className="flex flex-wrap items-center gap-2 py-2 border-b border-blush-50">
                <input type="date" value={editingHoliday.holiday_date} onChange={(e) => setEditingHoliday({ ...editingHoliday, holiday_date: e.target.value })} className="rounded-xl border border-rose-300 px-3 py-1.5 text-sm" required aria-label="วันที่ใหม่" />
                <input type="text" value={editingHoliday.note} onChange={(e) => setEditingHoliday({ ...editingHoliday, note: e.target.value })} className="rounded-xl border border-rose-300 px-3 py-1.5 text-sm flex-1 min-w-[8rem]" placeholder="หมายเหตุ" aria-label="หมายเหตุ" />
                <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-4 py-2 rounded-xl">บันทึก</button>
                <button type="button" onClick={() => setEditingHoliday(null)} className="text-xs text-gray-500 px-2 py-2">ยกเลิก</button>
              </form>
            ) : (
              <div key={h.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-blush-50">
                <span className="text-gray-600">{h.holiday_date} {h.note && `· ${h.note}`}</span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => { setHolidayError(null); setEditingHoliday({ id: h.id, holiday_date: h.holiday_date, note: h.note || '' }) }} className="text-xs font-semibold text-rose-600 hover:bg-blush-100 rounded-lg px-2.5 py-1.5">แก้ไข</button>
                  <button type="button" onClick={() => handleDeleteHoliday(h.id)} aria-label={`ลบวันหยุด ${h.holiday_date}`} className="text-gray-300 hover:text-red-500 px-2 py-1.5">✕</button>
                </span>
              </div>
            )
          ))}
          {holidays.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีวันหยุดพิเศษ</p>}
        </div>
      </div>

      <div id="staff" className="scroll-mt-24"><CategoryStaffSection /></div>

      {admin?.role === 'owner' && <BackupSection />}

      {admin?.role === 'owner' && <div id="users" className="scroll-mt-24"><AdminUsersSection /></div>}

      <div id="password" className="scroll-mt-24 bg-white rounded-2xl shadow-card p-6">
        <p className="font-medium text-gray-700 mb-3">🔒 เปลี่ยนรหัสผ่านแอดมิน</p>
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
    </div>
  )
}
