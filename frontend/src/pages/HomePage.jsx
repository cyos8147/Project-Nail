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
const HIGHLIGHTS = [
  { icon: '💎', title: 'Premium Quality', sub: 'คุณภาพพรีเมียม' },
  { icon: '🛡️', title: 'Hygienic & Safe', sub: 'สะอาด ปลอดภัย' },
  { icon: '♡', title: 'Professional Staff', sub: 'ช่างมืออาชีพ' },
  { icon: '⏱️', title: 'Easy Booking', sub: 'จองง่าย สะดวก' },
]

function HighlightBar() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
      <ul className="bg-white/60 backdrop-blur-sm rounded-[2rem] md:rounded-full border border-white/80 shadow-card px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x md:divide-rose-100">
        {HIGHLIGHTS.map((h) => (
          <li key={h.title} className="flex items-center gap-3 justify-center px-3">
            <span aria-hidden="true" className="text-2xl">{h.icon}</span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-semibold text-gray-800">{h.title}</span>
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
      <DreamyBackground />
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
