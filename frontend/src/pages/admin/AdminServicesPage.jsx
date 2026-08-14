import { useEffect, useState } from 'react'
import { adminCreateService, adminDeleteService, adminListServices, adminUpdateService } from '../../api/client.js'

const emptyForm = { category_id: 'hair', name: '', description: '', price: '', duration_minutes: '', is_color_service: false, active: true, sort_order: 0 }

export default function AdminServicesPage() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    adminListServices().then(setServices)
  }
  useEffect(load, [])

  function startEdit(s) {
    setEditingId(s.id)
    setForm({
      category_id: s.category_id, name: s.name, description: s.description, price: s.price,
      duration_minutes: s.duration_minutes, is_color_service: s.is_color_service, active: s.active, sort_order: 0,
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = { ...form, price: Number(form.price), duration_minutes: Number(form.duration_minutes) }
      if (editingId) await adminUpdateService(editingId, payload)
      else await adminCreateService(payload)
      resetForm()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('ปิดการใช้งานบริการนี้หรือไม่?')) return
    await adminDeleteService(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">จัดการบริการ</h1>
        <p className="text-gray-500 text-sm mt-1">ราคา ระยะเวลา และหมวดหมู่ของบริการทั้งหมด</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 grid sm:grid-cols-2 gap-3">
        <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm">
          <option value="hair">ทำผม</option>
          <option value="nail">ทำเล็บ</option>
        </select>
        <input placeholder="ชื่อบริการ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        <input type="number" placeholder="ราคา (บาท)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        <input type="number" placeholder="ระยะเวลา (นาที)" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        <input placeholder="คำอธิบาย" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.is_color_service} onChange={(e) => setForm({ ...form, is_color_service: e.target.checked })} />
          เป็นบริการทำสี (ให้ลูกค้าเลือกโทนสีได้)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          เปิดใช้งาน
        </label>
        <div className="sm:col-span-2 flex gap-2">
          <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-xl">
            {editingId ? 'บันทึกการแก้ไข' : '+ เพิ่มบริการ'}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:bg-blush-100 px-4 rounded-xl">ยกเลิก</button>}
        </div>
        {error && <p className="text-sm text-red-500 sm:col-span-2">{error}</p>}
      </form>

      <div className="bg-white rounded-2xl shadow-card divide-y divide-blush-50">
        {services.map((s) => (
          <div key={s.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{s.name} {!s.active && <span className="text-[10px] text-gray-400">(ปิดใช้งาน)</span>}</p>
              <p className="text-xs text-gray-400">{s.category_id === 'hair' ? 'ทำผม' : 'ทำเล็บ'} · {s.duration_minutes} นาที · {s.price} บาท</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(s)} className="text-xs font-semibold text-rose-600 hover:bg-blush-100 px-3 py-1.5 rounded-full">แก้ไข</button>
              <button onClick={() => handleDelete(s.id)} className="text-xs font-semibold text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-full">ปิดใช้งาน</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
