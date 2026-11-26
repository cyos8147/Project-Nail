import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import DreamyBackground from '../components/DreamyBackground.jsx'
import { CrownBear } from '../components/Decor.jsx'

export default function NotFoundPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'ไม่พบหน้านี้ | Lucky Salon'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-x-clip px-6 text-center text-[#3D2230]">
      <DreamyBackground />
      <CrownBear className="w-36 sm:w-44" />
      <p className="mt-2 font-display text-6xl font-semibold text-rose-500 [text-shadow:0_3px_0_#fff]">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold">ไม่พบหน้าที่คุณกำลังหา</h1>
      <p className="mt-3 max-w-sm text-[#7A4A5E]">
        ลิงก์อาจพิมพ์ไม่ครบ หรือหน้านี้ย้ายไปแล้วค่ะ กลับไปหน้าแรก หรือจองคิวต่อได้เลยนะคะ
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="btn-candy px-7 py-3"
        >
          กลับหน้าแรก
        </Link>
        <Link
          to="/booking"
          className="glass inline-flex items-center rounded-full px-7 py-3 font-display font-semibold text-berry"
        >
          จองคิว
        </Link>
      </div>
    </div>
  )
}
