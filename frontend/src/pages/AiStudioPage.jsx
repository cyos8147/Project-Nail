import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NailRecommendation from '../components/NailRecommendation.jsx'
import AdvancedRecommend from '../components/AdvancedRecommend.jsx'
import NailTryOn from '../components/NailTryOn/NailTryOn.jsx'
import Footer from '../components/Footer.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'
import Reveal from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'
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
        <header className="sticky top-0 z-50 bg-[#FCE6EE]/55 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="pt-2" aria-label="Lucky Salon หน้าแรก">
              <BrandLogo subtitle={'AI Beauty Studio'} />
            </Link>
            <Link
              to="/"
              className="glass-btn gap-1.5 text-sm font-display font-semibold px-4 py-2"
            >
              <Icon name="chevronLeft" className="h-4 w-4" /> กลับหน้าแรก
            </Link>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-10 text-center">
          <p className="lucky-fade-up text-sm text-gray-600">Lucky Salon · AI Beauty Studio</p>
          <h1 style={{ animationDelay: '0.06s' }} className="lucky-fade-up mt-4 font-display text-4xl/[1.4] sm:text-5xl/[1.4] font-semibold text-gray-800 text-balance">
            ลองสีเล็บบนรูปมือของคุณ
            <br />
            แล้วให้ AI ช่วยเลือกลาย
          </h1>
          <p style={{ animationDelay: '0.12s' }} className="lucky-fade-up text-gray-600 mt-5 max-w-xl mx-auto text-lg leading-8">
            วิเคราะห์สีผิว ลองสีเล็บบนรูปมือจริง รับคำแนะนำลายที่เหมาะกับคุณ แล้วจองคิวต่อได้ทันที
          </p>

          {/* 4 ขั้นตอนจริงของหน้านี้ ตามลำดับ จึงมีตัวเลข */}
          <ol style={{ animationDelay: '0.18s' }} className="lucky-fade-up mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            {[
              ['palette', 'วิเคราะห์สีผิว', 'รู้โทนผิวและสีที่เข้ากับคุณ'],
              ['hand', 'ลองสีเล็บ', 'ลงสีบนรูปมือจริงของคุณ'],
              ['wand', 'รับคำแนะนำ', 'AI จัดอันดับลายที่ใช่'],
              ['calendar', 'จองคิว', 'ส่งสีที่ชอบไปจองต่อได้เลย'],
            ].map(([icon, title, sub], i) => (
              <li key={title} className="rounded-[24px] glass p-4 flex flex-col gap-1">
                <span className="flex items-center justify-between text-rose-600">
                  <Icon name={icon} />
                  <span className="text-xs text-gray-500 tabular-nums">{i + 1}</span>
                </span>
                <span className="font-display font-semibold text-sm text-gray-800 mt-2">{title}</span>
                <span className="text-xs text-gray-600 leading-snug">{sub}</span>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-xs text-gray-500 flex items-center justify-center gap-1.5 flex-wrap">
            <Icon name="lock" className="h-4 w-4" />
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
