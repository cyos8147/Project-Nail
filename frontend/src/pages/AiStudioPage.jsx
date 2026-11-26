import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NailRecommendation from '../components/NailRecommendation.jsx'
import AdvancedRecommend from '../components/AdvancedRecommend.jsx'
import NailTryOn from '../components/NailTryOn/NailTryOn.jsx'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import usePageTitle from '../components/usePageTitle.js'
import DreamyBackground from '../components/DreamyBackground.jsx'
import Reveal from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'
import { saveCarryDesign } from '../utils/carryDesign.js'

export default function AiStudioPage() {
  usePageTitle('ลองสีบนมือคุณ | Lucky Salon')
  const navigate = useNavigate()
  // โทนผิวจากการวิเคราะห์ (สดหรือที่จำไว้ในเครื่อง) ส่งต่อให้ส่วนแนะนำลายจัดอันดับให้ตรงกับลูกค้า
  const [skin, setSkin] = useState(null)

  // รูป + สี/พื้นผิว/ความยาวที่ลูกค้าลอง ไปหน้าจองพร้อมกัน (meta มาจากหน้าลองสี)
  function handleBookDesign(dataUrl, meta = {}) {
    saveCarryDesign({ ...meta, reference_image_base64: dataUrl })
    navigate('/booking')
  }

  return (
    <div className="relative isolate min-h-screen text-[#2E1F26] overflow-x-clip">
      <DreamyBackground />

      <div className="relative z-10">
        <Header />

        <main>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-10 text-center">
          {/* แต่ละท่อนไม่ตัดกลางคำ (ภาษาไทยไม่มีช่องว่าง เบราว์เซอร์เลยตัด "ลาย" ไปไว้บรรทัดเดียว) */}
          <h1 className="lucky-fade-up font-display text-[2rem]/[1.4] sm:text-5xl/[1.4] font-semibold text-[#2E1F26]">
            <span className="inline-block">ลองสีเล็บบนรูปมือของคุณ</span>{' '}
            <span className="inline-block">แล้วให้ AI ช่วยเลือกลาย</span>
          </h1>
          <p style={{ animationDelay: '0.12s' }} className="lucky-fade-up text-[#5B4650] mt-5 max-w-xl mx-auto text-lg leading-8">
            ถ่ายหรืออัปโหลดรูปมือ แล้วลองสีเล็บได้ตามใจ AI จะช่วยดูโทนผิวและแนะนำลายที่น่าจะเข้ากับคุณค่ะ
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
                <span className="flex items-center justify-between text-berry">
                  <Icon name={icon} />
                  <span className="text-xs text-[#6B5560] tabular-nums">{i + 1}</span>
                </span>
                <span className="font-display font-semibold text-sm text-[#2E1F26] mt-2">{title}</span>
                <span className="text-xs text-[#5B4650] leading-snug">{sub}</span>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-xs text-[#6B5560] flex items-center justify-center gap-1.5 flex-wrap">
            <Icon name="lock" className="h-4 w-4" />
            รูปมือของคุณใช้แค่ตอนลองสีเท่านั้น ร้านไม่ได้เก็บไว้ (ยกเว้นตอนที่คุณกดจองพร้อมแนบรูป) ·{' '}
            <Link to="/privacy" className="underline hover:text-berry">
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>
        </section>

        <NailTryOn onBookDesign={handleBookDesign} onSkinAnalyzed={setSkin} />
        <Reveal><NailRecommendation skinTone={skin?.undertone ?? null} /></Reveal>
        <Reveal><AdvancedRecommend skinTone={skin?.undertone ?? null} /></Reveal>
        </main>

        <Footer />
      </div>
    </div>
  )
}
