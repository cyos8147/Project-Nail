import { Link } from 'react-router-dom'
import DreamyBackground from '../components/DreamyBackground.jsx'
import Header from '../components/Header.jsx'
import { CrownBear } from '../components/Decor.jsx'
import usePageTitle from '../components/usePageTitle.js'

export default function NotFoundPage() {
  usePageTitle('ไม่พบหน้านี้ | Lucky Salon')

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip text-[#2E1F26]">
      <DreamyBackground />
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <CrownBear className="w-36 sm:w-44" />
        <p className="mt-2 font-display text-6xl font-semibold text-[#C2185B]">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">ไม่พบหน้าที่คุณกำลังหา</h1>
        <p className="mt-3 max-w-sm text-[#5B4650]">
          ลิงก์อาจพิมพ์ไม่ครบ หรือหน้านี้ย้ายไปแล้วค่ะ กลับไปหน้าแรก หรือจองคิวต่อได้เลยนะคะ
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-candy px-7 py-3">
            กลับหน้าแรก
          </Link>
          <Link to="/booking" className="btn-candy-soft px-7 py-3">
            จองคิว
          </Link>
        </div>
      </main>
    </div>
  )
}
