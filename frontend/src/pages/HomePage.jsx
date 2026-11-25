import Header from '../components/Header.jsx'
import Hero from '../components/Hero.jsx'
import TryOnColorCard from '../components/TryOnColorCard.jsx'
import FeatureHighlights from '../components/FeatureHighlights.jsx'
import Services from '../components/Services.jsx'
import PopularNails from '../components/PopularNails.jsx'
import Reviews from '../components/Reviews.jsx'
import ShopInfo from '../components/ShopInfo.jsx'
import Footer from '../components/Footer.jsx'
import MobileStickyBar from '../components/MobileStickyBar.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'
import Reveal from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'

// จุดเด่นของร้าน (ข้อความอย่างเดียว ไม่มีปุ่ม)
// ไอคอนเส้นวาดเอง (แทนอีโมจิ ซึ่งแสดงต่างกันในแต่ละเครื่องและดูไม่เป็นแบรนด์)
// สิ่งที่เว็บนี้ทำได้จริง (ตรวจสอบได้จากฟีเจอร์ ไม่ใช่คำโฆษณากว้าง ๆ)
const HIGHLIGHTS = [
  { icon: 'calendar', title: 'จองออนไลน์ได้ตลอด', sub: 'เลือกบริการและเวลาที่ว่างเอง' },
  { icon: 'hand', title: 'ลองสีบนรูปมือก่อนจอง', sub: 'เห็นสีบนเล็บของคุณจริง' },
  { icon: 'repeat', title: 'เลื่อนหรือยกเลิกนัดเอง', sub: 'จัดการได้ที่ประวัติของฉัน' },
  { icon: 'bell', title: 'แจ้งเตือนผ่าน LINE', sub: 'ยืนยันคิวและเตือนก่อนนัด' },
]

function HighlightBar() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
      <ul className="rounded-[20px] border border-[#1f1b16]/[0.06] bg-white/85 shadow-soft px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-5 md:divide-x md:divide-[#1f1b16]/[0.06]">
        {HIGHLIGHTS.map((h) => (
          <li key={h.title} className="flex items-start gap-3 px-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Icon name={h.icon} />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-display font-semibold text-gray-800">{h.title}</span>
              <span className="block text-xs text-gray-500">{h.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="relative isolate min-h-screen text-gray-800 pb-20 md:pb-0 overflow-x-clip">
      <DreamyBackground variant="full" />
      <Header />
      <Hero />
      <Reveal><TryOnColorCard /></Reveal>
      <Reveal><HighlightBar /></Reveal>
      <Reveal><FeatureHighlights /></Reveal>
      <Reveal><Services /></Reveal>
      <Reveal><PopularNails /></Reveal>
      <Reveal><Reviews /></Reveal>
      <Reveal><ShopInfo /></Reveal>
      <Footer />
      <MobileStickyBar />
    </div>
  )
}
