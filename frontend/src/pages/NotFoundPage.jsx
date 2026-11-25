import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import DreamyBackground from '../components/DreamyBackground.jsx'

export default function NotFoundPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'ไม่พบหน้านี้ | Lucky Salon'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-x-clip px-6 text-center text-gray-800">
      <DreamyBackground />
      <img src="/logo.jpg" alt="Lucky Salon" className="h-20 w-20 rounded-full object-cover shadow-soft" />
      <p className="mt-6 font-display text-6xl font-semibold text-rose-500">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold">ไม่พบหน้าที่คุณกำลังหา</h1>
      <p className="mt-3 max-w-sm text-gray-500">
        ลิงก์อาจพิมพ์ไม่ครบหรือหน้านี้ถูกย้ายไปแล้ว ลองกลับไปหน้าแรก หรือจองคิวได้เลย
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
          className="btn-candy-soft px-7 py-3"
        >
          จองคิว
        </Link>
      </div>
    </div>
  )
}
