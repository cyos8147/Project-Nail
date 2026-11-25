import { Link } from 'react-router-dom'
import BookingWizard from '../components/booking/BookingWizard.jsx'
import Footer from '../components/Footer.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import Icon from '../components/Icon.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'

export default function BookingPage() {
  return (
    <div className="relative isolate min-h-screen text-gray-800 overflow-x-clip">
      <DreamyBackground />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-[#1f1b16]/[0.06] shadow-hair">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="pt-2" aria-label="Lucky Salon หน้าแรก">
              <BrandLogo />
            </Link>
            <p className="text-sm font-semibold text-gray-600 hidden sm:flex items-center gap-2"><Icon name="calendar" /> จองคิวออนไลน์</p>
            <Link
              to="/"
              className="btn-candy-soft text-sm px-4 py-2"
            >
              ← กลับหน้าแรก
            </Link>
          </div>
        </header>

        <BookingWizard />

        <Footer />
      </div>
    </div>
  )
}
