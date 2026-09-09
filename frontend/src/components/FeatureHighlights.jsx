import { Link } from 'react-router-dom'

export default function FeatureHighlights() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-10 sm:py-14">
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <Link
          to="/booking"
          className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-3xl shadow-card p-6 sm:p-8 flex items-center gap-4 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 transition-all duration-200"
        >
          <span className="text-4xl sm:text-5xl">📅</span>
          <div className="flex-1">
            <p className="font-display text-lg sm:text-xl font-bold">จองคิวออนไลน์</p>
            <p className="text-rose-100 text-sm mt-1">เลือกบริการ เลือกวันเวลาที่ว่าง จองเสร็จในไม่กี่ขั้นตอน</p>
          </div>
          <span className="text-2xl flex-shrink-0 group-hover:translate-x-1 transition-transform">→</span>
        </Link>

        <Link
          to="/ai"
          className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-3xl shadow-card p-6 sm:p-8 flex items-center gap-4 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 transition-all duration-200"
        >
          <span className="text-4xl sm:text-5xl">✨</span>
          <div className="flex-1">
            <p className="font-display text-lg sm:text-xl font-bold">ลองลายเล็บด้วย AI</p>
            <p className="text-violet-100 text-sm mt-1">อัปโหลดรูปมือ ลองสีและลายเล็บก่อนตัดสินใจจองจริง</p>
          </div>
          <span className="text-2xl flex-shrink-0 group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>
    </section>
  )
}
