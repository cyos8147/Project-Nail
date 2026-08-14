// Virtual Try-On แบบประมวลผลบนเซิร์ฟเวอร์ (FastAPI + MediaPipe Hands + OpenCV / YOLOv8-Seg)
// ต่างจาก VirtualTryOn.jsx (ประมวลผลบนเบราว์เซอร์ล้วนๆ) — เวอร์ชันนี้ส่งรูปไปให้ backend วิเคราะห์และ
// วาดสีทับให้ ทำให้บันทึกผลลัพธ์ลงประวัติผู้ใช้งานในฐานข้อมูลได้จริง (ตรงตามขอบเขตโครงงานข้อ "บันทึกและ
// ดาวน์โหลดรูปผลลัพธ์" / "ประวัติการทดลองลายเล็บ")

import { useState } from 'react'
import { aiTryOn, fileToBase64, getSavedPhone, savePhone } from '../api/client.js'

const COLORS = [
  { name: 'Nude', hex: '#E8C39E' }, { name: 'Pink', hex: '#F2A6C0' }, { name: 'Red', hex: '#C0392B' },
  { name: 'Coral', hex: '#FF7F6B' }, { name: 'Wine', hex: '#6E1F2A' }, { name: 'Black', hex: '#2B2620' },
  { name: 'Gold', hex: '#D4AF37' }, { name: 'Mint', hex: '#9FD8C8' },
]
const PATTERNS = [
  { id: 'solid', label: 'สีพื้น' }, { id: 'french', label: 'French Tip' }, { id: 'glitter', label: 'กากเพชร' },
]
const SHAPES = [
  { id: 'round', label: 'มน' }, { id: 'oval', label: 'ไข่' }, { id: 'square', label: 'เหลี่ยม' },
  { id: 'almond', label: 'อัลมอนด์' }, { id: 'coffin', label: 'บัลเลริน่า' }, { id: 'stiletto', label: 'สไตเลตโต้' },
]

export default function ServerTryOn() {
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [color, setColor] = useState(COLORS[0].hex)
  const [pattern, setPattern] = useState('solid')
  const [shape, setShape] = useState('round')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [phone, setPhone] = useState(getSavedPhone())
  const [saved, setSaved] = useState(false)

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setResult(null)
    setStatus('idle')
    setSaved(false)
  }

  async function runTryOn(save) {
    if (!imageFile) return
    setStatus('loading')
    setError(null)
    try {
      const base64 = await fileToBase64(imageFile)
      const res = await aiTryOn({
        image_base64: base64,
        color_hex: color,
        pattern,
        nail_shape: shape,
        save,
        customer_phone: save ? phone : undefined,
      })
      setResult(res)
      setStatus('done')
      if (save) {
        savePhone(phone)
        setSaved(true)
      }
    } catch (err) {
      setError(err.message || 'ประมวลผลไม่สำเร็จ ลองรูปที่เห็นมือชัดเจนกว่านี้')
      setStatus('error')
    }
  }

  return (
    <section id="server-try-on" className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-4">
        <span className="inline-block bg-blush-100 text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          Virtual Try-On (เซิร์ฟเวอร์ AI)
        </span>
        <h2 className="font-display text-3xl font-bold text-gray-800">ทดลองสีเล็บบนรูปจริง แล้วบันทึกเก็บไว้ได้</h2>
        <p className="text-gray-500 mt-2">
          ประมวลผลด้วย MediaPipe Hands + OpenCV (หรือ YOLOv8-Seg ถ้าเทรนโมเดลไว้แล้ว) ฝั่งเซิร์ฟเวอร์ —
          บันทึกผลลัพธ์ลงประวัติของคุณเพื่อดูย้อนหลังหรือแนบไปกับการจองคิวได้
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-card p-6 sm:p-10 grid md:grid-cols-2 gap-8 items-start">
        <div>
          <label
            htmlFor="tryonImage"
            className="block aspect-square rounded-2xl border-2 border-dashed border-blush-200 hover:bg-blush-50 transition-colors cursor-pointer overflow-hidden"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="รูปมือที่อัปโหลด" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <span className="text-4xl">📷</span>
                <p className="text-sm text-gray-500">คลิกเพื่ออัปโหลดรูปมือของคุณ</p>
                <p className="text-xs text-gray-400">ถ่ายให้เห็นเล็บทุกนิ้วชัดเจน แสงสว่างเพียงพอ</p>
              </div>
            )}
          </label>
          <input id="tryonImage" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">สี</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`w-8 h-8 rounded-full border transition-transform ${color === c.hex ? 'ring-2 ring-rose-400 ring-offset-2 scale-110' : 'border-black/10'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">ลวดลาย</p>
              <div className="flex flex-wrap gap-2">
                {PATTERNS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPattern(p.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${pattern === p.id ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 border border-blush-200 hover:bg-blush-100'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">ทรงเล็บ</p>
              <div className="flex flex-wrap gap-2">
                {SHAPES.map((s) => (
                  <button key={s.id} type="button" onClick={() => setShape(s.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${shape === s.id ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 border border-blush-200 hover:bg-blush-100'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => runTryOn(false)}
            disabled={!imageFile || status === 'loading'}
            className="w-full mt-5 bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 text-white font-semibold py-3 rounded-full shadow-card transition-colors"
          >
            {status === 'loading' ? 'กำลังประมวลผล...' : '✨ ทดลองสีเล็บ'}
          </button>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        <div>
          {!result && (
            <div className="h-full min-h-[260px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
              ผลลัพธ์จะแสดงที่นี่หลังกด "ทดลองสีเล็บ"
            </div>
          )}
          {result && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">ผลลัพธ์ ({result.nails_detected} นิ้วที่ตรวจพบ · engine: {result.engine})</p>
              <img
                src={`data:image/png;base64,${result.result_image_base64}`}
                alt="ผลลัพธ์การทดลองสีเล็บ"
                className="w-full rounded-2xl border border-blush-200"
              />
              <p className="text-xs text-gray-400 mt-2">โทนผิวที่ตรวจพบ: {result.skin_tone}</p>

              <div className="mt-4 bg-blush-50 border border-blush-200 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">บันทึกผลลัพธ์ลงประวัติของฉัน</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เบอร์โทรศัพท์"
                    className="flex-1 rounded-xl border border-blush-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <button
                    type="button"
                    onClick={() => runTryOn(true)}
                    disabled={!phone || status === 'loading'}
                    className="text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 px-4 py-2 rounded-full whitespace-nowrap"
                  >
                    บันทึก
                  </button>
                </div>
                {saved && <p className="text-xs text-green-600 mt-2">✅ บันทึกแล้ว ดูได้ที่หน้า "ประวัติของฉัน"</p>}
              </div>

              <a
                href={`data:image/png;base64,${result.result_image_base64}`}
                download="nailglow-tryon.png"
                className="inline-block mt-4 text-sm font-semibold text-rose-600 hover:underline"
              >
                ⬇ ดาวน์โหลดรูปผลลัพธ์
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
