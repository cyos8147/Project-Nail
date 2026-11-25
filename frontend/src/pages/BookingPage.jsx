import { Link } from 'react-router-dom'
import BookingWizard from '../components/booking/BookingWizard.jsx'
import Footer from '../components/Footer.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'

export default function BookingPage() {
  return (
    <div className="relative isolate min-h-screen text-gray-800 overflow-x-clip">
      <DreamyBackground />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/70 shadow-[0_8px_30px_-18px_rgba(217,59,114,0.45)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-baseline gap-1 whitespace-nowrap" aria-label="Lucky Salon หน้าแรก">
              <span className="font-script text-4xl leading-none text-rose-600">Lucky Salon</span>
            </Link>
            <p className="text-sm font-semibold text-rose-600 hidden sm:block">📅 จองคิวออนไลน์</p>
            <Link
              to="/"
              className="bg-white hover:bg-rose-50 text-rose-600 text-sm font-semibold px-4 py-2.5 rounded-full border border-rose-200 transition-colors whitespace-nowrap"
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
