import { Link } from 'react-router-dom'
import BookingWizard from '../components/booking/BookingWizard.jsx'
import Footer from '../components/Footer.jsx'

export default function BookingPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blush-50 via-white to-blush-50 text-gray-800 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 -right-32 w-[28rem] h-[28rem] bg-peach/50 rounded-full blur-3xl" />
        <div className="absolute top-[60%] -left-40 w-[26rem] h-[26rem] bg-rose-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-50 bg-blush-50/80 backdrop-blur border-b border-blush-200">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <p className="font-display text-2xl font-bold text-rose-600 whitespace-nowrap">
              Nail<span className="text-gray-800">Glow</span>
            </p>
            <p className="text-sm font-medium text-gray-500 hidden sm:block">📅 จองคิวออนไลน์</p>
            <Link
              to="/"
              className="bg-white hover:bg-blush-100 text-rose-600 text-sm font-semibold px-4 py-2.5 rounded-full border border-blush-200 transition-colors whitespace-nowrap"
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
