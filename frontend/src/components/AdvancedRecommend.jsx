// แนะนำลายเล็บด้วย AI: ลูกค้าตอบไม่กี่ข้อ ระบบส่งให้โมเดลบนเซิร์ฟเวอร์ (XGBoost) จัดอันดับลายของร้านที่เหมาะที่สุด
// ข้อมูลทางเทคนิคของโมเดล (ความแม่นยำ ชื่อไฟล์) ไม่แสดงให้ลูกค้า — อยู่ในเอกสารโครงงานและสไลด์แล้ว

import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { useNavigate } from 'react-router-dom'
import { aiRecommend, aiRecommendAccept, getSavedPhone } from '../api/client.js'
import { toRecommendScores, scoreLabel } from '../utils/recommendScore.js'
import { saveCarryDesign } from '../utils/carryDesign.js'
import NailThumb from './NailThumb.jsx'
import { Star } from './Stars.jsx'

const SKIN_TONES = [
  { id: 'warm', label: 'ผิวโทนอุ่น' },
  { id: 'cool', label: 'ผิวโทนเย็น' },
  { id: 'neutral', label: 'ผิวโทนกลาง' },
]
const NAIL_SHAPES = [
  { id: 'round', label: 'มน' }, { id: 'oval', label: 'ไข่' }, { id: 'square', label: 'เหลี่ยม' },
  { id: 'squoval', label: 'เหลี่ยมมน' }, { id: 'almond', label: 'อัลมอนด์' },
  { id: 'coffin', label: 'บัลเลริน่า' }, { id: 'stiletto', label: 'สไตเลตโต้' },
]
const NAIL_LENGTHS = [
  { id: 'short', label: 'สั้น' }, { id: 'medium', label: 'ปานกลาง' }, { id: 'long', label: 'ยาว' },
]
const STYLE_PREFS = [
  { id: 'minimal', label: 'เรียบง่าย' }, { id: 'classic', label: 'คลาสสิก' }, { id: 'bold', label: 'โดดเด่น' },
]
const OCCASIONS = [
  { id: 'daily', label: 'ใช้ทุกวัน' }, { id: 'work', label: 'ไปทำงาน' },
  { id: 'wedding', label: 'งานแต่งงาน' }, { id: 'party', label: 'ปาร์ตี้' }, { id: 'date', label: 'เดต' },
]
const ACCENTS = ['#EC4C82', '#D4AF37', '#6B3FA0', '#8B5E3C', '#3B8FA6']

function Field({ label, hint, options, value, onChange }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      {hint && <p className="text-xs text-green-600 mt-0.5">{hint}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors duration-150 ${
              value === o.id ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white text-gray-600 border-[#1f1b16]/10 hover:border-rose-300 hover:text-rose-600'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AdvancedRecommend({ skinTone = null }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    skin_tone: skinTone || 'warm', nail_shape: 'round', nail_length: 'medium', style_preference: 'classic', occasion: 'daily',
  })
  const [skinFromAnalysis, setSkinFromAnalysis] = useState(!!skinTone)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // วิเคราะห์สีผิวเสร็จทีหลัง (หรือโหลดผลที่จำไว้) → เติมโทนผิวให้เอง ถ้าลูกค้ายังไม่ได้เลือกเอง
  useEffect(() => {
    if (skinTone) {
      setForm((f) => ({ ...f, skin_tone: skinTone }))
      setSkinFromAnalysis(true)
    }
  }, [skinTone])

  function set(key, value) {
    if (key === 'skin_tone') setSkinFromAnalysis(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    setStatus('loading')
    setError(null)
    try {
      const phone = getSavedPhone()
      const res = await aiRecommend({ ...form, customer_phone: phone || undefined })
      setResult(res)
      setStatus('done')
    } catch (err) {
      setError('ตอนนี้ระบบแนะนำลายไม่ตอบสนอง รอสักครู่แล้วลองอีกครั้ง')
      console.error(err)
      setStatus('error')
    }
  }

  function handleBookThis(design) {
    if (result?.log_id) aiRecommendAccept(result.log_id).catch(() => {})
    saveCarryDesign({
      source: 'design', nail_design_id: design.id, nail_design_name: design.name, color_hex: design.color_hex, summary: design.name,
    })
    navigate('/booking')
  }

  const scores = result ? toRecommendScores(result.recommendations.map((r) => r.match_score)) : []

  return (
    <section id="ai-advanced-recommend" className="max-w-5xl mx-auto px-6 py-20">
      <div className="text-center mb-4">
        <h2 className="font-display text-3xl/[1.4] sm:text-4xl/[1.4] font-semibold text-gray-800">ให้ AI เลือกลายที่ใช่ให้คุณ</h2>
        <p className="text-gray-500 mt-2">ตอบไม่กี่ข้อ แล้วดูลายที่เหมาะกับคุณที่สุดจากลายของร้าน</p>
      </div>

      <div className="glass-solid rounded-[24px] p-6 sm:p-10 grid md:grid-cols-2 gap-8 mt-8">
        <div className="space-y-6">
          <Field
            label="โทนสีผิวของคุณ"
            hint={skinFromAnalysis ? 'เลือกให้แล้วจากผลวิเคราะห์สีผิวของคุณ' : null}
            options={SKIN_TONES}
            value={form.skin_tone}
            onChange={(v) => set('skin_tone', v)}
          />
          <Field label="ชอบสไตล์ไหน" options={STYLE_PREFS} value={form.style_preference} onChange={(v) => set('style_preference', v)} />
          <Field label="จะไปใช้ตอนไหน" options={OCCASIONS} value={form.occasion} onChange={(v) => set('occasion', v)} />

          <details className="group rounded-2xl border border-blush-200 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-600 list-none flex items-center justify-between">
              ปรับแต่งเพิ่มเติม (ทรงและความยาวเล็บ)
              <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="space-y-5 mt-4">
              <Field label="ทรงเล็บ" options={NAIL_SHAPES} value={form.nail_shape} onChange={(v) => set('nail_shape', v)} />
              <Field label="ความยาวเล็บ" options={NAIL_LENGTHS} value={form.nail_length} onChange={(v) => set('nail_length', v)} />
            </div>
          </details>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'loading'}
            className="btn-candy w-full py-3.5"
          >
            {status === 'loading' ? 'AI กำลังเลือกลายให้คุณ...' : 'ดูลายที่เหมาะกับฉัน'}
          </button>
          {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        </div>

        <div aria-live="polite">
          {status !== 'done' && (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-sm text-gray-500 text-center px-6 gap-3 rounded-[20px] border-2 border-dashed border-[#1f1b16]/10 bg-rose-50/50">
              <span className="text-rose-400" aria-hidden="true"><Icon name="brush" className="h-8 w-8" /></span>
              ลายที่ AI เลือกให้จะแสดงที่นี่
            </div>
          )}
          {status === 'done' && result && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-4">ลายที่เหมาะกับคุณที่สุด 5 อันดับ</p>
              <div className="space-y-3">
                {result.recommendations.map((r, i) => (
                  <div
                    key={r.design.id}
                    className={`rounded-2xl p-3 flex items-center gap-3 border transition-colors duration-150 ${i === 0 ? 'border-rose-300 bg-rose-50/60' : 'border-blush-200 bg-white'}`}
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      {r.design.image_url ? (
                        <img loading="lazy" decoding="async" src={r.design.image_url} alt={r.design.name} className="w-full h-full object-cover" />
                      ) : (
                        <NailThumb label="" accent={r.design.color_hex || ACCENTS[i % ACCENTS.length]} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {i === 0 && <span className="inline-block bg-rose-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1">แนะนำที่สุด</span>}
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.design.name}</p>
                      <p className="text-xs text-gray-400">{r.design.duration_minutes} นาที · {Math.round(r.design.price)} บาท</p>
                      <p className="text-xs mt-0.5">
                        <span className="text-gray-400">คะแนนที่ AI แนะนำ </span>
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600"><Star className="h-3.5 w-3.5" /> {scoreLabel(scores[i])}</span>
                        <span className="text-gray-400">/10</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookThis(r.design)}
                      className="btn-candy text-xs px-3.5 py-2 whitespace-nowrap"
                    >
                      จองลายนี้
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-3">คะแนนเทียบกับลายที่เหมาะที่สุดของคุณในรอบนี้ (ลายอันดับ 1 = 10.0)</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
