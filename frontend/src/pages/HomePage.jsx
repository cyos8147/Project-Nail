import Header from '../components/Header.jsx'
import Hero from '../components/Hero.jsx'
import Services from '../components/Services.jsx'
import PopularNails from '../components/PopularNails.jsx'
import Promotions from '../components/Promotions.jsx'
import Reviews from '../components/Reviews.jsx'
import BookingWizard from '../components/booking/BookingWizard.jsx'
import Footer from '../components/Footer.jsx'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-blush-50 text-gray-800">
      <Header />
      <Hero />
      <Services />
      <PopularNails />
      <Promotions />
      <Reviews />
      <BookingWizard />
      <Footer />
    </div>
  )
}
