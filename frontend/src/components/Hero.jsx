import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNailDesigns } from '../api/client.js'

// การ์ดลายเล็บที่เลื่อนดูได้ด้วยลูกศร (ใช้ข้อมูลลายจริงจากแอดมิน)
function PopularStylesCard() {
  const [designs, setDesigns] = useState([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    getNailDesigns()
      .then((data) => setDesigns((data || []).filter((d) => d.image_url).slice(0, 6)))
      .catch(() => {})
  }, [])

  const count = designs.length
  const current = count ? designs[index % count] : null
  const step = (delta) => count && setIndex((i) => (i + delta + count) % count)

  return (
    <div className="relative mx-auto w-full max-w-sm -rotate-3 bg-white/70 backdrop-blur-md rounded-[2rem] border border-white shadow-card p-5 sm:p-6">
      <div className="absolute -top-4 -right-3 text-4xl drop-shadow" aria-hidden="true">🎀</div>
      <p className="font-script text-3xl text-rose-500">Popular Styles</p>

      <div className="relative mt-4 aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-200">
        {current ? (
          <img src={current.image_url} alt={current.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-rose-400 text-sm">ลายเล็บยอดนิยม</div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={count < 2}
          aria-label="ลายก่อนหน้า"
          className="btn-candy-soft w-9 h-9 !p-0 text-lg"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-gray-700 truncate">{current?.name || ''}</p>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={count < 2}
          aria-label="ลายถัดไป"
          className="btn-candy-soft w-9 h-9 !p-0 text-lg"
        >
          ›
        </button>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section id="home" className="relative">
      {/* ของตกแต่ง: ไม่มีปุ่มหรือการโต้ตอบ (พื้นหลังหลักอยู่ใน DreamyBackground) */}
      <span aria-hidden="true" className="pointer-events-none absolute top-16 left-[46%] text-2xl text-rose-300 animate-float">✦</span>
      <span aria-hidden="true" className="pointer-events-none absolute bottom-10 right-[42%] text-xl text-rose-300 animate-float">♡</span>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-16 sm:pb-16 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        <div className="text-center lg:text-left">
          <p className="lucky-fade-up text-xs sm:text-sm tracking-[0.35em] uppercase text-rose-500" style={{ animationDelay: '0.1s' }}>Welcome to Lucky Salon</p>
          <h1 style={{ animationDelay: '0.25s' }} className="lucky-fade-up mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-gray-800 leading-[1.1] text-balance">
            More than just nails,
          </h1>
          <p style={{ animationDelay: '0.45s' }} className="lucky-fade-up mt-1 font-script text-5xl sm:text-6xl lg:text-7xl text-rose-500 leading-tight">It's your style ♡</p>
          <p style={{ animationDelay: '0.6s' }} className="lucky-fade-up mt-5 text-gray-600 text-base sm:text-lg">สวยได้ในแบบที่เป็นคุณ กับบริการทำเล็บคุณภาพ</p>

          <div style={{ animationDelay: '0.75s' }} className="lucky-fade-up mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
            <Link
              to="/booking"
              className="btn-candy px-8 py-3.5 text-base"
            >
              <span aria-hidden="true">📅</span> จองคิวออนไลน์
            </Link>
            <a
              href="#popular"
              className="btn-candy-soft px-8 py-3.5 text-base"
            >
              ดูลายเล็บยอดนิยม
            </a>
          </div>
        </div>

        <div style={{ animationDelay: '0.5s' }} className="lucky-fade-up relative pt-4">
          <PopularStylesCard />
        </div>
      </div>
    </section>
  )
}
