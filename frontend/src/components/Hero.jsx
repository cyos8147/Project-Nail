import { Link } from 'react-router-dom'

const swatches = [
  { color: '#EC4C82', label: 'Rose', top: '14%', left: '18%', delay: '0s' },
  { color: '#E8C39E', label: 'Nude', top: '58%', left: '10%', delay: '0.4s' },
  { color: '#8B5E3C', label: 'Brown', top: '30%', left: '68%', delay: '0.8s' },
  { color: '#6B3FA0', label: 'Plum', top: '68%', left: '62%', delay: '1.2s' },
]

const stats = [
  { value: '500+', label: 'ลูกค้าพึงพอใจ' },
  { value: '4.9', label: 'คะแนนรีวิวเฉลี่ย' },
  { value: '8', label: 'ปีที่เปิดให้บริการ' },
]

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-peach/60 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-rose-200/60 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block bg-white text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full shadow-card mb-5">
            ร้านเสริมสวยเล็บ อันดับ 1 ในใจลูกค้า
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-800 leading-tight">
            สวยครบ<br />จบที่ <span className="text-rose-500">NailGlow</span>
          </h1>
          <p className="mt-5 text-gray-500 leading-relaxed max-w-md">
            เลือกลายเล็บที่ใช่ จองคิวได้ในไม่กี่ขั้นตอน พร้อมทีมช่างมืออาชีพดูแลคุณทุกรายละเอียด
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/booking"
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-7 py-3 rounded-full shadow-card transition-colors"
            >
              จองคิวออนไลน์
            </Link>
            <a
              href="#popular"
              className="bg-white hover:bg-blush-100 text-rose-600 font-semibold px-7 py-3 rounded-full border border-blush-200 transition-colors"
            >
              ดูลายเล็บยอดนิยม
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-bold text-rose-500">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative aspect-[4/3] rounded-3xl bg-gradient-to-br from-rose-100 via-blush-100 to-peach/60 shadow-card overflow-hidden">
          {swatches.map((s) => (
            <div
              key={s.label}
              className="absolute flex flex-col items-center gap-2 animate-float"
              style={{ top: s.top, left: s.left, animationDelay: s.delay }}
            >
              <span
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-card border-2 border-white/70"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[11px] font-medium text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">{s.label}</span>
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-display text-rose-400/50 text-sm px-6 text-center">
              รูปภาพร้าน / ผลงานลายเล็บ
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
