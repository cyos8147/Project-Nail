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
    <div className="relative min-h-screen bg-gradient-to-b from-rose-50 via-pink-50/60 to-rose-50 text-gray-800 overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-clip">
        <div className="absolute top-0 -right-32 w-[28rem] h-[28rem] bg-rose-200/50 rounded-full blur-3xl" />
        <div className="absolute top-[45%] -left-40 w-[26rem] h-[26rem] bg-pink-200/40 rounded-full blur-3xl" />
        <div className="absolute top-[85%] right-0 w-[24rem] h-[24rem] bg-rose-100/70 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100 shadow-[0_8px_30px_-18px_rgba(217,59,114,0.45)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-baseline gap-1 whitespace-nowrap" aria-label="Lucky Salon หน้าแรก">
              <span className="font-script text-4xl leading-none text-rose-600">Lucky Salon</span>
              <span className="hidden sm:inline text-[11px] tracking-[0.2em] uppercase text-gray-500">AI Beauty Studio</span>
            </Link>
            <Link
              to="/"
              className="bg-white hover:bg-rose-50 text-rose-600 text-sm font-semibold px-4 py-2.5 rounded-full border border-rose-200 transition-colors whitespace-nowrap"
            >
              ← กลับหน้าแรก
            </Link>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-10 text-center">
          <p className="text-xs tracking-[0.35em] uppercase text-rose-500">Lucky Salon AI Beauty Studio</p>
          <h1 className="mt-4 font-serif text-5xl sm:text-6xl font-semibold text-gray-800 leading-[1.1] text-balance">
            Find your perfect look,
            <span className="block font-script text-6xl sm:text-7xl text-rose-500 leading-[1.15] mt-1 pb-1">with AI ♡</span>
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
