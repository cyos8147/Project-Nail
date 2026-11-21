import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNailDesigns } from '../api/client.js'
import { nailDesigns as catalog } from '../data/nailCatalog.js'
import { percentToScore, scoreLabel } from '../utils/recommendScore.js'
import { saveCarryDesign } from '../utils/carryDesign.js'
import NailThumb from './NailThumb.jsx'

const TONE_LABEL = { warm: 'โทนอุ่น', cool: 'โทนเย็น', neutral: 'โทนกลาง' }
const ACCENTS = ['#EC4C82', '#D4AF37', '#6B3FA0', '#8B5E3C', '#3B8FA6']

// ลายของร้านจากฐานข้อมูล (มี id จริงไว้ส่งไปจองและมีรูปที่ร้านอัปโหลด) ถ้าโหลดไม่ได้ใช้แคตตาล็อกในเว็บแทน
function fromCatalog() {
  return catalog.map((d) => ({
    id: null, name: d.name, price: d.price, duration_minutes: d.duration, color_hex: null, image_url: null,
    tone_fit: d.toneFit, popularity: d.popularity,
  }))
}

// คะแนนเข้ากับโทนผิว 0–100 (ผสมความนิยมเล็กน้อย ไม่ให้ลายที่ไม่ค่อยมีคนทำแซงลายยอดนิยมง่ายเกินไป)
function percentFor(design, tone) {
  if (!tone) return design.popularity
  const fit = design.tone_fit?.[tone] ?? 50
  return Math.min(99, fit * 0.75 + design.popularity * 0.25)
}

export default function NailRecommendation({ skinTone }) {
  const navigate = useNavigate()
  const [designs, setDesigns] = useState(fromCatalog)
  const personalized = !!skinTone

  useEffect(() => {
    let alive = true
    getNailDesigns()
      .then((list) => { if (alive && Array.isArray(list) && list.length) setDesigns(list) })
      .catch(() => { /* ใช้แคตตาล็อกในเว็บต่อไป */ })
    return () => { alive = false }
  }, [])

  const ranked = useMemo(
    () => designs
      .map((d) => ({ ...d, score: percentToScore(percentFor(d, skinTone)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    [designs, skinTone]
  )

  function handleBook(d) {
    saveCarryDesign({ source: 'design', nail_design_id: d.id, nail_design_name: d.name, color_hex: d.color_hex, summary: d.name })
    navigate('/booking')
  }

  return (
    <section id="ai-recommend" className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-4">
        <span className="inline-block bg-white text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 border border-blush-200 shadow-card">
          {personalized ? 'AI จัดอันดับให้คุณ' : 'ลายเล็บยอดนิยม'}
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-800 tracking-tight">
          {personalized ? `ลายเล็บที่เหมาะกับผิว${TONE_LABEL[skinTone]}ของคุณ` : 'ลายเล็บยอดนิยมของร้าน'}
        </h2>
        <p className="text-gray-500 mt-2">
          {personalized
            ? 'AI จัดอันดับจากผลวิเคราะห์สีผิวของคุณ พร้อมราคาและเวลาที่ใช้ทำ'
            : 'ลายที่ลูกค้าเลือกมากที่สุด วิเคราะห์สีผิวด้านบนเพื่อให้ AI จัดอันดับลายที่เหมาะกับคุณโดยเฉพาะ'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
        {ranked.map((d, i) => (
          <div
            key={d.id ?? d.name}
            className="group bg-white rounded-3xl border border-blush-100 shadow-card overflow-hidden relative flex flex-col hover:-translate-y-1.5 hover:shadow-[0_22px_40px_-18px_rgba(217,59,114,0.4)] transition-all duration-300"
          >
            {personalized && i === 0 && (
              <span className="absolute top-3 left-3 z-10 bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md">
                แนะนำที่สุด
              </span>
            )}
            <div className="aspect-square overflow-hidden">
              {d.image_url ? (
                <img loading="lazy" decoding="async" src={d.image_url} alt={d.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <NailThumb label={d.name} accent={d.color_hex || ACCENTS[i % ACCENTS.length]} />
              )}
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1">
              <p className="font-semibold text-gray-800 text-sm">{d.name}</p>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-gray-400">{personalized ? 'คะแนนที่ AI แนะนำ' : 'คะแนนความนิยม'}</span>
                  <span className="text-sm font-bold text-rose-600">
                    ★ {scoreLabel(d.score)}<span className="text-[11px] font-medium text-gray-400">/10</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-blush-100 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-gradient-to-r from-rose-400 to-fuchsia-400 rounded-full" style={{ width: `${d.score * 10}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{d.duration_minutes} นาที</span>
                <span className="font-medium text-gray-600">{Math.round(d.price)} บาท</span>
              </div>
              {d.id && (
                <button
                  type="button"
                  onClick={() => handleBook(d)}
                  className="mt-auto text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 rounded-full py-2.5 transition-colors"
                >
                  จองลายนี้
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
