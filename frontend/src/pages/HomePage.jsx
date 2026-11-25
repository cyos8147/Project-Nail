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
      <ul className="bg-white/80 backdrop-blur rounded-full border border-white shadow-card px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x md:divide-rose-100">
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
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50/60 to-rose-50 text-gray-800 pb-20 md:pb-0 overflow-x-clip">
      <Header />
      <Hero />
      <TryOnColorCard />
      <HighlightBar />
      <FeatureHighlights />
      <Services />
      <PopularNails />
      <Reviews />
      <ShopInfo />
      <Footer />
      <MobileStickyBar />
    </div>
  )
}
