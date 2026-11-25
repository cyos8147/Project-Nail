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

// จุดเด่นของร้าน (ข้อความอย่างเดียว ไม่มีปุ่ม)
// ไอคอนเส้นวาดเอง (แทนอีโมจิ ซึ่งแสดงต่างกันในแต่ละเครื่องและดูไม่เป็นแบรนด์)
const ICONS = {
  gem: 'M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l-2 6 5 12 5-12-2-6',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  heart: 'M12 20s-7.5-4.6-9.2-9.2C1.5 7 3.8 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.2 0 5.5 3 4.2 6.8C19.5 15.4 12 20 12 20z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2',
}
const HIGHLIGHTS = [
  { icon: 'gem', title: 'Premium Quality', sub: 'คุณภาพพรีเมียม' },
  { icon: 'shield', title: 'Hygienic & Safe', sub: 'สะอาด ปลอดภัย' },
  { icon: 'heart', title: 'Professional Staff', sub: 'ช่างมืออาชีพ' },
  { icon: 'clock', title: 'Easy Booking', sub: 'จองง่าย สะดวก' },
]

function HighlightBar() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
      <ul className="bg-white/60 backdrop-blur-sm rounded-[2rem] md:rounded-full border border-white/80 shadow-card px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x md:divide-rose-100">
        {HIGHLIGHTS.map((h) => (
          <li key={h.title} className="flex items-center gap-3 justify-center px-3">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-50 to-pink-100 text-rose-500 ring-2 ring-white">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d={ICONS[h.icon]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
