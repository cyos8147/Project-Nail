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
      <p className="font-serif italic text-xl text-rose-700">Popular Styles</p>

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
          className="w-9 h-9 rounded-full bg-white shadow-card text-rose-600 disabled:opacity-40 hover:bg-rose-50"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-gray-700 truncate">{current?.name || ''}</p>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={count < 2}
          aria-label="ลายถัดไป"
          className="w-9 h-9 rounded-full bg-white shadow-card text-rose-600 disabled:opacity-40 hover:bg-rose-50"
        >
          ›
        </button>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden">
      {/* ของตกแต่งพื้นหลัง: ไม่มีปุ่มหรือการโต้ตอบ */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 w-[28rem] h-[28rem] rounded-full bg-rose-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-1/2 -left-32 w-[24rem] h-[24rem] rounded-full bg-pink-200/50 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute top-16 left-[46%] text-2xl text-rose-300 animate-float">✦</span>
      <span aria-hidden="true" className="pointer-events-none absolute bottom-10 right-[42%] text-xl text-rose-300 animate-float">♡</span>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-16 sm:pb-16 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        <div className="text-center lg:text-left">
          <p className="text-xs sm:text-sm tracking-[0.35em] uppercase text-rose-500">Welcome to Nailly</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-gray-800 leading-[1.1] text-balance">
            More than just nails,
          </h1>
          <p className="mt-1 font-script text-5xl sm:text-6xl lg:text-7xl text-rose-500 leading-tight">It's your style ♡</p>
          <p className="mt-5 text-gray-600 text-base sm:text-lg">สวยได้ในแบบที่เป็นคุณ กับบริการทำเล็บคุณภาพ</p>

          <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
            <Link
              to="/booking"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold px-8 py-3.5 rounded-full shadow-card transition-colors"
            >
              จองคิวออนไลน์ →
            </Link>
            <a
              href="#popular"
              className="inline-flex items-center justify-center bg-white hover:bg-rose-50 text-rose-600 font-semibold px-8 py-3.5 rounded-full border border-rose-200 transition-colors"
            >
              ดูลายเล็บยอดนิยม
            </a>
          </div>
        </div>

        <div className="relative pt-4">
          <PopularStylesCard />
        </div>
      </div>
    </section>
  )
}
