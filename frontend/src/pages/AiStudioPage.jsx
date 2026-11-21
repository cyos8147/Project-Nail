import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NailRecommendation from '../components/NailRecommendation.jsx'
import AdvancedRecommend from '../components/AdvancedRecommend.jsx'
import NailTryOn from '../components/NailTryOn/NailTryOn.jsx'
import Footer from '../components/Footer.jsx'
import { saveCarryDesign } from '../utils/carryDesign.js'

export default function AiStudioPage() {
  const navigate = useNavigate()
  // โทนผิวจากการวิเคราะห์ (สดหรือที่จำไว้ในเครื่อง) ส่งต่อให้ส่วนแนะนำลายจัดอันดับให้ตรงกับลูกค้า
  const [skin, setSkin] = useState(null)

  // รูป + สี/พื้นผิว/ความยาวที่ลูกค้าลอง ไปหน้าจองพร้อมกัน (meta มาจากหน้าลองสี)
  function handleBookDesign(dataUrl, meta = {}) {
    saveCarryDesign({ ...meta, reference_image_base64: dataUrl })
    navigate('/booking')
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blush-50 via-white to-blush-50 text-gray-800 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 -right-32 w-[28rem] h-[28rem] bg-peach/50 rounded-full blur-3xl" />
        <div className="absolute top-[45%] -left-40 w-[26rem] h-[26rem] bg-rose-200/40 rounded-full blur-3xl" />
        <div className="absolute top-[85%] right-0 w-[24rem] h-[24rem] bg-blush-200/60 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-50 bg-white/75 backdrop-blur-md border-b border-blush-200/70 shadow-[0_6px_24px_-16px_rgba(217,59,114,0.35)]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-rose-600 whitespace-nowrap">
              <img src="/logo.jpg" alt="Lucky Salon" className="w-8 h-8 rounded-full object-cover" />
              Lucky<span className="text-gray-800"> Salon</span>
            </p>
            <p className="text-sm font-medium text-gray-500 hidden sm:block">✨ AI Beauty Studio</p>
            <Link
              to="/"
              className="bg-white hover:bg-blush-100 text-rose-600 text-sm font-semibold px-4 py-2.5 rounded-full border border-blush-200 transition-colors whitespace-nowrap"
            >
              ← กลับหน้าแรก
            </Link>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-6 pt-14 pb-10 text-center">
          <span className="inline-flex items-center gap-2 bg-white/90 text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full shadow-card border border-blush-200 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Lucky Salon AI Beauty Studio
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-gray-800 leading-[1.15] tracking-tight">
            ให้ AI ช่วยหา
            <span className="bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">ลุคเล็บที่ใช่</span>
            <br className="hidden sm:block" />สำหรับคุณ
          </h1>
          <p className="text-gray-500 mt-5 max-w-xl mx-auto text-base leading-relaxed">
            วิเคราะห์สีผิว ลองสีเล็บบนรูปมือจริงของคุณ และรับคำแนะนำลายที่เหมาะกับคุณ แล้วจองคิวต่อได้ทันที
          </p>

          <ol className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            {[
              ['🎨', 'วิเคราะห์สีผิว', 'รู้โทนผิวและสีที่เข้ากับคุณ'],
              ['💅', 'ลองสีเล็บ', 'ลงสีบนรูปมือจริงของคุณ'],
              ['✨', 'รับคำแนะนำ', 'AI จัดอันดับลายที่ใช่'],
              ['📅', 'จองคิว', 'ส่งสีที่ชอบไปจองต่อได้เลย'],
            ].map(([icon, title, sub]) => (
              <li key={title} className="bg-white/80 backdrop-blur rounded-2xl border border-white shadow-card px-4 py-3.5 flex flex-col gap-1">
                <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
                <span className="font-semibold text-sm text-gray-800 mt-1">{title}</span>
                <span className="text-xs text-gray-500 leading-snug">{sub}</span>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-xs text-gray-400 flex items-center justify-center gap-1.5 flex-wrap">
            <span aria-hidden="true">🔒</span>
            รูปที่คุณอัปโหลดส่งไปประมวลผลชั่วคราวเท่านั้น ไม่ถูกเก็บไว้บนเซิร์ฟเวอร์ (เว้นแต่คุณกดจองคิวพร้อมรูป) ·{' '}
            <Link to="/privacy" className="underline hover:text-rose-600">
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>
        </section>

        <NailTryOn onBookDesign={handleBookDesign} onSkinAnalyzed={setSkin} />
        <NailRecommendation skinTone={skin?.undertone ?? null} />
        <AdvancedRecommend skinTone={skin?.undertone ?? null} />

        <Footer />
      </div>
    </div>
  )
}
