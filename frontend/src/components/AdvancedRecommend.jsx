// AI แนะนำลายเล็บ (โมเดล XGBoost จากฝั่งเซิร์ฟเวอร์) — ต่างจาก NailRecommendation.jsx (ซึ่งจัดอันดับ
// จากผลวิเคราะห์สีผิวอย่างเดียวแบบ heuristic บนเบราว์เซอร์) ส่วนนี้ส่ง 5 ปัจจัยไปให้โมเดล XGBoost ที่เทรน
// ไว้แล้วบน backend ทำนาย (ดู backend/ml/train_xgboost_recommender.py) ใช้โชว์ผลลัพธ์จริงจากโมเดล ML
// พร้อมค่าความแม่นยำของโมเดลจากชุดทดสอบ (Accuracy/Precision/Recall/F1)

import { useState } from 'react'
import { aiRecommend, aiRecommendAccept, getSavedPhone } from '../api/client.js'
import NailThumb from './NailThumb.jsx'

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
  { id: 'minimal', label: 'มินิมอล' }, { id: 'classic', label: 'คลาสสิก' }, { id: 'bold', label: 'จัดจ้าน' },
]
const OCCASIONS = [
  { id: 'daily', label: 'ใช้ชีวิตประจำวัน' }, { id: 'work', label: 'ทำงาน' },
  { id: 'wedding', label: 'งานแต่งงาน' }, { id: 'party', label: 'ปาร์ตี้' }, { id: 'date', label: 'เดต' },
]
const ACCENTS = ['#EC4C82', '#D4AF37', '#6B3FA0', '#8B5E3C', '#3B8FA6']

function Field({ label, options, value, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
              value === o.id ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 border border-blush-200 hover:bg-blush-100'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AdvancedRecommend() {
  const [form, setForm] = useState({
    skin_tone: 'warm', nail_shape: 'round', nail_length: 'medium', style_preference: 'classic', occasion: 'daily',
  })
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  function set(key, value) {
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
      setError(err.message || 'เรียกโมเดลแนะนำไม่สำเร็จ')
      setStatus('error')
    }
  }

  function handleBookThis(design) {
    if (result?.log_id) aiRecommendAccept(result.log_id).catch(() => {})
    localStorage.setItem(
      'nailglow_carry_design',
      JSON.stringify({ nail_design_id: design.id, nail_design_name: design.name, color_hex: design.color_hex })
    )
    window.location.href = '/#booking'
  }

  const usingModel = result && !result.model_metrics?.note

  return (
    <section id="ai-advanced-recommend" className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-4">
        <span className="inline-block bg-blush-100 text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          AI แนะนำลาย (XGBoost Model)
        </span>
        <h2 className="font-display text-3xl font-bold text-gray-800">ตอบ 5 คำถาม ให้โมเดล ML แนะนำลายที่ใช่</h2>
        <p className="text-gray-500 mt-2">
          ผลลัพธ์คำนวณจากโมเดล XGBoost ที่เทรนบนฝั่งเซิร์ฟเวอร์ (backend/ml/train_xgboost_recommender.py)
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-card p-6 sm:p-10 grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <Field label="โทนสีผิว" options={SKIN_TONES} value={form.skin_tone} onChange={(v) => set('skin_tone', v)} />
          <Field label="รูปทรงเล็บ" options={NAIL_SHAPES} value={form.nail_shape} onChange={(v) => set('nail_shape', v)} />
          <Field label="ความยาวเล็บ" options={NAIL_LENGTHS} value={form.nail_length} onChange={(v) => set('nail_length', v)} />
          <Field label="สไตล์ที่ชอบ" options={STYLE_PREFS} value={form.style_preference} onChange={(v) => set('style_preference', v)} />
          <Field label="โอกาสที่จะใช้" options={OCCASIONS} value={form.occasion} onChange={(v) => set('occasion', v)} />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'loading'}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 text-white font-semibold py-3 rounded-full shadow-card transition-colors"
          >
            {status === 'loading' ? 'กำลังให้ AI คำนวณ...' : '🤖 ให้ AI แนะนำลาย'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div>
          {status !== 'done' && (
            <div className="h-full min-h-[220px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
              เลือกตัวเลือกด้านซ้ายให้ครบ แล้วกด "ให้ AI แนะนำลาย"
            </div>
          )}
          {status === 'done' && result && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-700">ลายที่โมเดลแนะนำ</p>
                {usingModel ? (
                  <span className="text-[11px] text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
                    ใช้โมเดลที่เทรนแล้ว · Accuracy {(result.model_metrics.accuracy * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                    ใช้กฎ fallback (ยังไม่ได้เทรนโมเดล)
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {result.recommendations.map((r, i) => (
                  <div key={r.design.id} className="flex items-center gap-3 border border-blush-200 rounded-xl p-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <NailThumb label="" accent={ACCENTS[i % ACCENTS.length]} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">{r.design.name}</p>
                        <span className="text-xs font-bold text-rose-600">{r.match_score.toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-gray-400">{r.design.duration_minutes} นาที · {r.design.price} บาท</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookThis(r.design)}
                      className="text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 px-3 py-2 rounded-full whitespace-nowrap"
                    >
                      จองลายนี้
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
