import Header from '../components/Header.jsx'
import Hero from '../components/Hero.jsx'
import FeatureHighlights from '../components/FeatureHighlights.jsx'
import Services from '../components/Services.jsx'
import PopularNails from '../components/PopularNails.jsx'
import Promotions from '../components/Promotions.jsx'
import Reviews from '../components/Reviews.jsx'
import Footer from '../components/Footer.jsx'
import MobileStickyBar from '../components/MobileStickyBar.jsx'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-blush-50 text-gray-800 pb-20 md:pb-0">
      <Header />
      <Hero />
      <FeatureHighlights />
      <Services />
      <PopularNails />
      <Promotions />
      <Reviews />
      <Footer />
      <MobileStickyBar />
    </div>
  )
}
