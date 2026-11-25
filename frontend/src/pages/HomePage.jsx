import Header from '../components/Header.jsx'
import Hero from '../components/Hero.jsx'
import TryOnColorCard from '../components/TryOnColorCard.jsx'
import Services from '../components/Services.jsx'
import PopularNails from '../components/PopularNails.jsx'
import Reviews from '../components/Reviews.jsx'
import ShopInfo from '../components/ShopInfo.jsx'
import Footer from '../components/Footer.jsx'
import MobileStickyBar from '../components/MobileStickyBar.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'
import Reveal from '../components/Reveal.jsx'
import Icon from '../components/Icon.jsx'
import { CrownBear, PolishBottle } from '../components/Decor.jsx'

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
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
      <ul className="glass rounded-[28px] lg:rounded-full px-4 py-4 lg:px-6 grid grid-cols-2 lg:grid-cols-4 gap-y-4 lg:divide-x lg:divide-white/90">
        {HIGHLIGHTS.map((h) => (
          <li key={h.title} className="flex items-center gap-3 px-2 lg:px-4">
            <span className="glass-btn h-11 w-11 shrink-0 !cursor-default hover:!transform-none">
              <Icon name={h.icon} className="h-5 w-5" />
            </span>
            <span className="text-left leading-snug">
              <span className="block text-sm font-display font-semibold text-[#4A2A37]">{h.title}</span>
              <span className="block text-xs text-[#7A4A5E]">{h.sub}</span>
            </span>
          </li>
        ))}
      </ul>
      {/* น้องหมีมงกุฎนั่งท้ายแถบ (เหมือนภาพตัวอย่าง) */}
      <CrownBear className="pointer-events-none hidden xl:block absolute -right-28 -bottom-6 w-32 xl:w-36" />
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="relative isolate min-h-screen text-gray-800 pb-20 md:pb-0 overflow-x-clip">
      <DreamyBackground variant="full" />
      <Header />
      <Hero />
      <Reveal>
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 grid gap-6 lg:grid-cols-[5fr_7fr] items-stretch">
          <TryOnColorCard />
          <PopularNails />
          <PolishBottle className="pointer-events-none hidden xl:block absolute -left-20 bottom-[-28px] w-24 -rotate-[8deg]" />
        </section>
      </Reveal>
      <Reveal><HighlightBar /></Reveal>
      <Reveal><Services /></Reveal>
      <Reveal>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid gap-14 lg:gap-8 lg:grid-cols-2 items-start">
          <Reviews embedded />
          <ShopInfo embedded />
        </div>
      </Reveal>
      <Footer />
      <MobileStickyBar />
    </div>
  )
}
