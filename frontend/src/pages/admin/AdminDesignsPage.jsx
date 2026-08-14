import { useEffect, useState } from 'react'
import { adminCreateDesign, adminDeleteDesign, adminListDesigns, adminUpdateDesign } from '../../api/client.js'

const emptyForm = {
  name: '', price: '', duration_minutes: '', complexity: 'simple', style_tag: 'classic',
  color_hex: '#B5793A', popularity: 50, active: true,
  tone_fit: { warm: 70, cool: 70, neutral: 70 },
}

export default function AdminDesignsPage() {
  const [designs, setDesigns] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    adminListDesigns().then(setDesigns)
  }
  useEffect(load, [])

  function startEdit(d) {
    setEditingId(d.id)
    setForm({ ...d, tone_fit: d.tone_fit || { warm: 70, cool: 70, neutral: 70 } })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
        popularity: Number(form.popularity),
        tone_fit: {
          warm: Number(form.tone_fit.warm), cool: Number(form.tone_fit.cool), neutral: Number(form.tone_fit.neutral),
        },
      }
      if (editingId) await adminUpdateDesign(editingId, payload)
      else await adminCreateDesign(payload)
      resetForm()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('ปิดการใช้งานลายนี้หรือไม่?')) return
    await adminDeleteDesign(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">จัดการลายเล็บ</h1>
        <p className="text-gray-500 text-sm mt-1">แคตตาล็อกที่ใช้ในระบบแนะนำลาย (AI) และ Virtual Try-On</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 grid sm:grid-cols-3 gap-3">
        <input placeholder="ชื่อลาย" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        <input type="number" placeholder="ราคา" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
        <input type="number" placeholder="ระยะเวลา (นาที)" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />

        <select value={form.complexity} onChange={(e) => setForm({ ...form, complexity: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm">
          <option value="simple">เรียบง่าย (simple)</option>
          <option value="medium">ปานกลาง (medium)</option>
          <option value="complex">ซับซ้อน (complex)</option>
        </select>
        <select value={form.style_tag} onChange={(e) => setForm({ ...form, style_tag: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm">
          <option value="minimal">Minimal</option>
          <option value="classic">Classic</option>
          <option value="bold">Bold</option>
        </select>
        <input type="color" value={form.color_hex} onChange={(e) => setForm({ ...form, color_hex: e.target.value })} className="rounded-xl border border-blush-200 h-10" />

        <div>
          <label className="text-xs text-gray-500">เข้ากับผิวโทนอุ่น (0-100)</label>
          <input type="number" value={form.tone_fit.warm} onChange={(e) => setForm({ ...form, tone_fit: { ...form.tone_fit, warm: e.target.value } })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">เข้ากับผิวโทนเย็น (0-100)</label>
          <input type="number" value={form.tone_fit.cool} onChange={(e) => setForm({ ...form, tone_fit: { ...form.tone_fit, cool: e.target.value } })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">เข้ากับผิวโทนกลาง (0-100)</label>
          <input type="number" value={form.tone_fit.neutral} onChange={(e) => setForm({ ...form, tone_fit: { ...form.tone_fit, neutral: e.target.value } })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs text-gray-500">คะแนนความนิยม (0-100)</label>
          <input type="number" value={form.popularity} onChange={(e) => setForm({ ...form, popularity: e.target.value })} className="w-full rounded-xl border border-blush-200 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 mt-5">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          เปิดใช้งาน
        </label>

        <div className="sm:col-span-3 flex gap-2">
          <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-xl">
            {editingId ? 'บันทึกการแก้ไข' : '+ เพิ่มลายเล็บ'}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:bg-blush-100 px-4 rounded-xl">ยกเลิก</button>}
        </div>
        {error && <p className="text-sm text-red-500 sm:col-span-3">{error}</p>}
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {designs.map((d) => (
          <div key={d.id} className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: d.color_hex }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{d.name} {!d.active && <span className="text-[10px] text-gray-400">(ปิด)</span>}</p>
                <p className="text-xs text-gray-400">{d.style_tag} · {d.complexity} · {d.price} บาท</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => startEdit(d)} className="text-xs font-semibold text-rose-600 hover:bg-blush-100 px-3 py-1.5 rounded-full">แก้ไข</button>
              <button onClick={() => handleDelete(d.id)} className="text-xs font-semibold text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-full">ปิดใช้งาน</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
