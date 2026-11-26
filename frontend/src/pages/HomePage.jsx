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
import ServicesPreview from '../components/ServicesPreview.jsx'

// จุดเด่นของร้าน (ข้อความอย่างเดียว ไม่มีปุ่ม)
// ไอคอนเส้นวาดเอง (แทนอีโมจิ ซึ่งแสดงต่างกันในแต่ละเครื่องและดูไม่เป็นแบรนด์)
// สิ่งที่เว็บนี้ทำได้จริง (ตรวจสอบได้จากฟีเจอร์ ไม่ใช่คำโฆษณากว้าง ๆ)
const HIGHLIGHTS = [
  { icon: 'calendar', title: 'จองออนไลน์ได้ตลอด', sub: 'ไม่ต้องรอร้านรับสาย เลือกเวลาเองได้เลย' },
  { icon: 'clock', title: 'ราคาและเวลาชัดเจน', sub: 'รู้ราคาเริ่มต้นและใช้เวลานานแค่ไหนก่อนจอง' },
  { icon: 'repeat', title: 'เลื่อนหรือยกเลิกนัดเอง', sub: 'ติดธุระกะทันหัน เลื่อนเองได้ที่ประวัติของฉัน' },
  { icon: 'bell', title: 'แจ้งเตือนผ่าน LINE', sub: 'ร้านยืนยันคิวและเตือนก่อนถึงวันนัดให้' },
]

function HighlightBar() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
      <ul className="glass rounded-[28px] xl:rounded-full px-4 py-4 xl:px-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-y-4 xl:divide-x xl:divide-[#2E1F26]/[0.06]">
        {HIGHLIGHTS.map((h) => (
          <li key={h.title} className="flex items-center gap-3 px-2 xl:px-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFEAF2] text-[#C2185B]">
              <Icon name={h.icon} className="h-5 w-5" />
            </span>
            <span className="text-left leading-snug">
              <span className="block text-sm font-semibold text-[#2E1F26]">{h.title}</span>
              <span className="block text-xs text-[#6B5560]">{h.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="relative isolate min-h-screen text-[#2E1F26] pb-20 md:pb-0 overflow-x-clip">
      <DreamyBackground variant="full" />
      <Header />
      <Hero />
      <Reveal>
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 grid gap-6 lg:grid-cols-2 items-start">
          <PopularNails />
          <ServicesPreview />
        </section>
      </Reveal>
      <Reveal>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <TryOnColorCard />
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
