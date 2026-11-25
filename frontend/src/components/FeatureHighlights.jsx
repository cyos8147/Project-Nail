import { Link } from 'react-router-dom'

// การ์ดทางลัด 2 ใบ (จองคิว / ลองลายเล็บด้วย AI) — ปลายทางเหมือนเดิม เปลี่ยนแค่หน้าตาให้เข้าธีมแก้วชมพู
const CARDS = [
  {
    to: '/booking',
    title: 'จองคิวออนไลน์',
    sub: 'เลือกบริการ เลือกวันเวลาที่ว่าง จองเสร็จในไม่กี่ขั้นตอน',
    icon: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 14l2 2 4-4',
  },
  {
    to: '/ai',
    title: 'ลองลายเล็บด้วย AI',
    sub: 'อัปโหลดรูปมือ ลองสีและลายเล็บก่อนตัดสินใจจองจริง',
    icon: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  },
]

export default function FeatureHighlights() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative flex items-center gap-4 sm:gap-5 rounded-[24px] glass p-5 sm:p-6 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-rose-300"
          >
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
                <path d={c.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg sm:text-xl font-semibold text-gray-800">{c.title}</p>
              <p className="text-gray-500 text-sm mt-1">{c.sub}</p>
            </div>
            <span aria-hidden="true" className="btn-candy-soft h-10 w-10 shrink-0 !p-0">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
