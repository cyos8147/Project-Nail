import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NailRecommendation from '../components/NailRecommendation.jsx'
import AdvancedRecommend from '../components/AdvancedRecommend.jsx'
import NailTryOn from '../components/NailTryOn/NailTryOn.jsx'
import Footer from '../components/Footer.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'
import Reveal from '../components/Reveal.jsx'
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
    <div className="relative isolate min-h-screen text-gray-800 overflow-x-clip">
      <DreamyBackground />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/70 shadow-[0_8px_30px_-18px_rgba(217,59,114,0.45)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="pt-2" aria-label="Lucky Salon หน้าแรก">
              <BrandLogo subtitle={'AI Beauty Studio'} />
            </Link>
            <Link
              to="/"
              className="btn-candy-soft text-sm px-4 py-2"
            >
              ← กลับหน้าแรก
            </Link>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-10 text-center">
          <p className="lucky-fade-up text-xs tracking-[0.35em] uppercase text-rose-500" style={{ animationDelay: '0.1s' }}>Lucky Salon AI Beauty Studio</p>
          <h1 style={{ animationDelay: '0.25s' }} className="lucky-fade-up mt-4 font-serif text-5xl sm:text-6xl font-semibold text-gray-800 leading-[1.1] text-balance">
            Find your perfect look,
            <span className="block font-script text-6xl sm:text-7xl text-rose-500 leading-[1.15] mt-1 pb-1">with AI ♡</span>
          </h1>
          <p style={{ animationDelay: '0.4s' }} className="lucky-fade-up text-gray-500 mt-5 max-w-xl mx-auto text-base leading-relaxed">
            วิเคราะห์สีผิว ลองสีเล็บบนรูปมือจริงของคุณ และรับคำแนะนำลายที่เหมาะกับคุณ แล้วจองคิวต่อได้ทันที
          </p>

          <ol style={{ animationDelay: '0.55s' }} className="lucky-fade-up mt-9 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            {[
              ['🎨', 'วิเคราะห์สีผิว', 'รู้โทนผิวและสีที่เข้ากับคุณ'],
              ['💅', 'ลองสีเล็บ', 'ลงสีบนรูปมือจริงของคุณ'],
              ['✨', 'รับคำแนะนำ', 'AI จัดอันดับลายที่ใช่'],
              ['📅', 'จองคิว', 'ส่งสีที่ชอบไปจองต่อได้เลย'],
            ].map(([icon, title, sub]) => (
              <li key={title} className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/80 shadow-card px-4 py-3.5 flex flex-col gap-1">
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
        <Reveal><NailRecommendation skinTone={skin?.undertone ?? null} /></Reveal>
        <Reveal><AdvancedRecommend skinTone={skin?.undertone ?? null} /></Reveal>

        <Footer />
      </div>
    </div>
  )
}
