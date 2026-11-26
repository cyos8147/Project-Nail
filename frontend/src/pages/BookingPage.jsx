import BookingWizard from '../components/booking/BookingWizard.jsx'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'
import usePageTitle from '../components/usePageTitle.js'

// หัวเว็บใช้ตัวเดียวกับทุกหน้า (เมนู "จองคิว" ขึ้นเป็นหน้าปัจจุบัน)
export default function BookingPage() {
  usePageTitle('จองคิว | Lucky Salon')
  return (
    <div className="relative isolate min-h-screen text-[#2E1F26] overflow-x-clip">
      <DreamyBackground />

      <div className="relative z-10">
        <Header />
        <main>
          <BookingWizard />
        </main>
        <Footer />
      </div>
    </div>
  )
}
