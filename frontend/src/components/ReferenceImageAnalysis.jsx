import { useRef, useState } from 'react'
import { analyzeReferenceStyle } from '../utils/imageAnalysis.js'
import { getDesignsByStyle, STYLE_LABEL, estimateStyleDuration } from '../data/nailCatalog.js'
import NailThumb from './NailThumb.jsx'

const STEPS = ['อัปโหลดรูปอ้างอิง', 'วิเคราะห์ลาย', 'ผลลัพธ์']
const ACCENTS = ['#EC4C82', '#D4AF37', '#6B3FA0']

export default function ReferenceImageAnalysis() {
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [status, setStatus] = useState('idle')
  const [styleTag, setStyleTag] = useState(null)
  const timeoutRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setStatus('idle')
    setStyleTag(null)
  }

  async function handleAnalyze() {
    if (!imageFile) return
    setStatus('analyzing')
    try {
      const [result] = await Promise.all([
        analyzeReferenceStyle(imageFile),
        new Promise((r) => (timeoutRef.current = setTimeout(r, 1200))),
      ])
      setStyleTag(result.styleTag)
      setStatus('done')
    } catch (err) {
      setStatus('error')
    }
  }

  function handleReset() {
    clearTimeout(timeoutRef.current)
    setImageFile(null)
    setImagePreview(null)
    setStatus('idle')
    setStyleTag(null)
  }

  const currentStepIndex = status === 'done' ? 3 : status === 'analyzing' ? 2 : imagePreview ? 1 : 0
  const matches = styleTag ? getDesignsByStyle(styleTag, 3) : []
  const estimatedMinutes = styleTag ? estimateStyleDuration(60, styleTag) : null

  return (
    <section id="ai-reference" className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-4">
        <span className="inline-block bg-blush-100 text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          วิเคราะห์ลายเล็บจากรูปอ้างอิง
        </span>
        <h2 className="font-display text-3xl font-bold text-gray-800">มีรูปในใจอยู่แล้ว? ให้ AI ช่วยหาลายที่ใกล้เคียง</h2>
        <p className="text-gray-500 mt-2">อัปโหลดรูปที่เซฟไว้จาก Pinterest, Instagram หรือ Facebook แล้วให้ AI แนะนำลายที่ร้านทำได้</p>
      </div>

      <div className="flex items-center justify-center gap-2 my-8 flex-wrap">
        {STEPS.map((s, i) => {
          const isDone = i < currentStepIndex
          const isActive = i === currentStepIndex
          return (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isDone ? 'bg-rose-500 text-white' : isActive ? 'bg-rose-500 text-white ring-4 ring-rose-100' : 'bg-blush-100 text-gray-400'
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
          <div>
            <label
              htmlFor="refStyleImage"
              className="block aspect-square rounded-2xl border-2 border-dashed border-blush-200 hover:bg-blush-50 transition-colors cursor-pointer overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="รูปอ้างอิง" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                  <span className="text-4xl">🖼️</span>
                  <p className="text-sm text-gray-500">คลิกเพื่ออัปโหลดรูปลายเล็บที่ถูกใจ</p>
                  <p className="text-xs text-gray-400">รองรับรูปที่เซฟมาจากแอปโซเชียลต่างๆ</p>
                </div>
              )}
            </label>
            <input id="refStyleImage" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!imageFile || status === 'analyzing'}
                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full shadow-card transition-colors"
              >
                {status === 'analyzing' ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ลายเล็บ'}
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
            <p className="text-[11px] text-gray-400 mt-3">* รูปภาพถูกประมวลผลบนเบราว์เซอร์ของคุณเท่านั้น ไม่ถูกส่งหรือบันทึกไปที่ไหน</p>
          </div>

          <div>
            {status === 'idle' && !imagePreview && (
              <div className="h-full min-h-[220px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
                อัปโหลดรูปอ้างอิงด้านซ้าย แล้วกด "วิเคราะห์ลายเล็บ"
              </div>
            )}
            {status === 'idle' && imagePreview && (
              <div className="h-full min-h-[220px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
                พร้อมแล้ว กด "วิเคราะห์ลายเล็บ" เพื่อให้ AI ประมวลผล
              </div>
            )}
            {status === 'analyzing' && (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="w-10 h-10 border-4 border-blush-200 border-t-rose-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-500">กำลังวิเคราะห์สไตล์ลายเล็บ...</p>
              </div>
            )}
            {status === 'error' && (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-2 text-center px-6">
                <p className="text-sm text-red-500">ไม่สามารถวิเคราะห์รูปนี้ได้ ลองใช้รูปอื่นดูนะคะ</p>
              </div>
            )}
            {status === 'done' && styleTag && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎨</span>
                  <p className="font-display text-xl font-bold text-gray-800">สไตล์ {STYLE_LABEL[styleTag]}</p>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                  ใช้เวลาทำโดยประมาณ <span className="font-semibold text-rose-600">{estimatedMinutes} นาที</span> (รวมบริการพื้นฐาน)
                </p>

                <p className="text-sm font-medium text-gray-700 mb-2">ลายที่ใกล้เคียงภายในร้าน</p>
                <div className="space-y-3">
                  {matches.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 border border-blush-200 rounded-xl p-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <NailThumb label="" accent={ACCENTS[i % ACCENTS.length]} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.duration} นาที · {m.price} บาท</p>
                      </div>
                    </div>
                  ))}
                </div>

                <a
                  href="/booking"
                  className="inline-block mt-5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-card transition-colors"
                >
                  จองคิวทำลายนี้
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
