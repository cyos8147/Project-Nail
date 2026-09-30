import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'ไม่พบหน้านี้ | Lucky Salon'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-blush-50 px-6 text-center text-gray-800">
      <img src="/logo.jpg" alt="Lucky Salon" className="h-20 w-20 rounded-full object-cover shadow-card" />
      <p className="mt-6 font-display text-6xl font-bold text-rose-500">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold">ไม่พบหน้าที่คุณกำลังหา</h1>
      <p className="mt-3 max-w-sm text-gray-500">
        ลิงก์อาจพิมพ์ไม่ครบหรือหน้านี้ถูกย้ายไปแล้ว ลองกลับไปหน้าแรก หรือจองคิวได้เลย
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-rose-500 px-7 py-3 font-semibold text-white shadow-card transition-colors hover:bg-rose-600"
        >
          กลับหน้าแรก
        </Link>
        <Link
          to="/booking"
          className="rounded-full border border-blush-200 bg-white px-7 py-3 font-semibold text-rose-600 transition-colors hover:bg-blush-100"
        >
          จองคิว
        </Link>
      </div>
    </div>
  )
}
