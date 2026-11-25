import { Link } from 'react-router-dom'

// การ์ดทางลัด 2 ใบ (จองคิว / ลองลายเล็บด้วย AI) — ปลายทางเหมือนเดิม เปลี่ยนแค่หน้าตาให้เข้าธีมแก้วชมพู
const CARDS = [
  {
    to: '/booking',
    eyebrow: 'Book Online',
    title: 'จองคิวออนไลน์',
    sub: 'เลือกบริการ เลือกวันเวลาที่ว่าง จองเสร็จในไม่กี่ขั้นตอน',
    icon: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 14l2 2 4-4',
    tone: 'from-rose-100 to-pink-200',
  },
  {
    to: '/ai',
    eyebrow: 'Beauty Studio',
    title: 'ลองลายเล็บด้วย AI',
    sub: 'อัปโหลดรูปมือ ลองสีและลายเล็บก่อนตัดสินใจจองจริง',
    icon: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
    tone: 'from-pink-100 to-violet-100',
  },
]

export default function FeatureHighlights() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative flex items-center gap-4 sm:gap-5 rounded-[2rem] border-2 border-white/90 p-5 sm:p-7 shadow-[0_14px_32px_-16px_rgba(217,59,114,0.55)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-rose-300"
            style={{ background: 'linear-gradient(135deg, rgba(255,244,248,0.88), rgba(252,220,233,0.6))' }}
          >
            <span aria-hidden="true" className={`flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${c.tone} text-rose-500 ring-2 ring-white shadow-sm`}>
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path d={c.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-script text-2xl leading-none text-rose-400">{c.eyebrow}</p>
              <p className="font-display text-lg sm:text-xl font-bold text-gray-800 mt-1">{c.title}</p>
              <p className="text-gray-500 text-sm mt-1">{c.sub}</p>
            </div>
            <span aria-hidden="true" className="btn-candy-soft h-10 w-10 shrink-0 !p-0 transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
