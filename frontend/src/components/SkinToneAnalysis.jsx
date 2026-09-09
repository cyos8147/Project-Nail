import { useRef, useState } from 'react'
import { analyzeAverageColor, classifySkinTone } from '../utils/imageAnalysis.js'
import { getRankedDesigns } from '../data/nailCatalog.js'
import { TONE_INFO } from '../data/skinTones.js'
import NailThumb from './NailThumb.jsx'

const STEPS = ['อัปโหลดภาพ', 'วิเคราะห์สีผิว', 'ผลลัพธ์']
const ACCENTS = ['#EC4C82', '#D4AF37', '#6B3FA0']

export default function SkinToneAnalysis({ onAnalyzed, onReset, onTryOn }) {
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [status, setStatus] = useState('idle') // idle | analyzing | done | error
  const [tone, setTone] = useState(null)
  const timeoutRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setStatus('idle')
    setTone(null)
  }

  async function handleAnalyze() {
    if (!imageFile) return
    setStatus('analyzing')
    try {
      // หน่วงเล็กน้อยให้ดูเป็นขั้นตอนการวิเคราะห์ (การประมวลผลจริงทำงานบนเบราว์เซอร์ทั้งหมด ไม่ส่งรูปออกไปไหน)
      const [result] = await Promise.all([
        analyzeAverageColor(imageFile),
        new Promise((r) => (timeoutRef.current = setTimeout(r, 1200))),
      ])
      const toneResult = classifySkinTone(result)
      setTone(toneResult)
      setStatus('done')
      onAnalyzed?.({ tone: toneResult, image: imagePreview })
    } catch (err) {
      setStatus('error')
    }
  }

  function handleReset() {
    clearTimeout(timeoutRef.current)
    setImageFile(null)
    setImagePreview(null)
    setStatus('idle')
    setTone(null)
    onReset?.()
  }

  const currentStepIndex = status === 'done' ? 3 : status === 'analyzing' ? 2 : imagePreview ? 1 : 0
  const info = tone ? TONE_INFO[tone] : null
  const topDesigns = tone ? getRankedDesigns(tone, 3) : []

  return (
    <section id="ai-skin" className="bg-blush-100/60 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-4">
          <span className="inline-block bg-white text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full shadow-card mb-4">
            AI วิเคราะห์สีผิว
          </span>
          <h2 className="font-display text-3xl font-bold text-gray-800">AI วิเคราะห์สีผิว + แนะนำสีเล็บที่ใช่</h2>
          <p className="text-gray-500 mt-2">อัปโหลดรูปมือ แล้วให้ AI บอกโทนสีผิว พร้อมแนะนำสีและลายเล็บที่เหมาะกับคุณที่สุด</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2 my-8 flex-wrap">
          {STEPS.map((s, i) => {
            const isDone = i < currentStepIndex
            const isActive = i === currentStepIndex
            return (
              <div key={s} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      isDone ? 'bg-rose-500 text-white' : isActive ? 'bg-rose-500 text-white ring-4 ring-rose-100' : 'bg-white text-gray-400'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${isActive ? 'text-rose-600' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-6 sm:w-10 h-px bg-blush-200" />}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-3xl shadow-card p-6 sm:p-10">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left: upload / preview */}
            <div>
              <label
                htmlFor="skinImage"
                className="block aspect-square rounded-2xl border-2 border-dashed border-blush-200 hover:bg-blush-50 transition-colors cursor-pointer overflow-hidden"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="รูปมือที่อัปโหลด" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                    <span className="text-4xl">🖐️</span>
                    <p className="text-sm text-gray-500">คลิกเพื่ออัปโหลดรูปมือของคุณ</p>
                    <p className="text-xs text-gray-400">แนะนำถ่ายในที่แสงธรรมชาติ เห็นผิวมือชัดเจน</p>
                  </div>
                )}
              </label>
              <input id="skinImage" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!imageFile || status === 'analyzing'}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full shadow-card transition-colors"
                >
                  {status === 'analyzing' ? 'กำลังวิเคราะห์...' : 'วิเคราะห์สีผิว'}
                </button>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-3 rounded-full text-sm font-semibold text-gray-500 hover:bg-blush-100 transition-colors"
                  >
                    เริ่มใหม่
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                * รูปภาพถูกประมวลผลบนเบราว์เซอร์ของคุณเท่านั้น ไม่ถูกส่งหรือบันทึกไปที่ไหน
              </p>
            </div>

            {/* Right: result */}
            <div>
              {status === 'idle' && !imagePreview && (
                <div className="h-full min-h-[220px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
                  อัปโหลดรูปมือด้านซ้าย แล้วกด “วิเคราะห์สีผิว” เพื่อดูผลลัพธ์
                </div>
              )}

              {status === 'idle' && imagePreview && (
                <div className="h-full min-h-[220px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
                  พร้อมแล้ว กด “วิเคราะห์สีผิว” เพื่อให้ AI ประมวลผล
                </div>
              )}

              {status === 'analyzing' && (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 text-center px-6">
                  <div className="w-10 h-10 border-4 border-blush-200 border-t-rose-500 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">กำลังวิเคราะห์โทนสีผิวของคุณ...</p>
                </div>
              )}

              {status === 'error' && (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-2 text-center px-6">
                  <p className="text-sm text-red-500">ไม่สามารถวิเคราะห์รูปนี้ได้ ลองใช้รูปอื่นดูนะคะ</p>
                </div>
              )}

              {status === 'done' && info && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">☀️</span>
                    <p className="font-display text-xl font-bold text-gray-800">{info.label}</p>
                  </div>
                  <p className="text-sm text-gray-500 mb-5">{info.desc}</p>

                  <p className="text-sm font-medium text-gray-700 mb-2">สีที่เหมาะกับคุณ</p>
                  <div className="flex flex-wrap gap-3 mb-5">
                    {info.colors.map((c) => (
                      <div key={c.name} className="flex flex-col items-center gap-1.5 w-14">
                        <span className="w-10 h-10 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: c.hex }} />
                        <span className="text-[11px] text-gray-600 text-center leading-tight">{c.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blush-50 border border-blush-200 rounded-xl p-4 flex gap-2">
                    <span className="text-lg">💡</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{info.tip}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {status === 'done' && topDesigns.length > 0 && (
            <div className="mt-8 pt-8 border-t border-blush-100">
              <p className="text-sm font-medium text-gray-700 mb-4">ลายเล็บที่แนะนำสำหรับคุณ</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {topDesigns.map((d, i) => (
                  <div
                    key={d.id}
                    className="bg-blush-50 border border-blush-200 rounded-2xl overflow-hidden relative hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                  >
                    {i === 0 && (
                      <span className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        แนะนำที่สุด
                      </span>
                    )}
                    <div className="aspect-[4/3]">
                      <NailThumb label={d.name} accent={ACCENTS[i % ACCENTS.length]} />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-800 text-sm">{d.name}</p>
                        <span className="text-xs font-bold text-rose-600">{d.matchScore}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{d.duration} นาที</span>
                        <span className="font-medium text-gray-600">{d.price} บาท</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <a
                  href="#try-on"
                  onClick={() => onTryOn?.({ tone, image: imagePreview })}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-card transition-colors"
                >
                  ลองสีเล็บกับรูปนี้เลย
                </a>
                <a
                  href="#ai-recommend"
                  className="bg-white hover:bg-blush-100 text-rose-600 text-sm font-semibold px-6 py-2.5 rounded-full border border-blush-200 transition-colors"
                >
                  ดูลายทั้งหมดที่เหมาะกับฉัน
                </a>
                <a
                  href="/booking"
                  className="bg-white hover:bg-blush-100 text-rose-600 text-sm font-semibold px-6 py-2.5 rounded-full border border-blush-200 transition-colors"
                >
                  จองคิวทำเล็บเลย
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
