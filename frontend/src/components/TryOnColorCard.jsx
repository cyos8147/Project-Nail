import { useState } from 'react'
import { Link } from 'react-router-dom'

// สีที่ให้ลูกค้าเลือกดูก่อนไปลองจริงที่หน้า AI (เลือกสีแล้วกดปุ่มจะไปหน้า AI)
const SWATCHES = [
  { name: 'Rose', hex: '#EC4C82' },
  { name: 'Blush', hex: '#F7B6CC' },
  { name: 'Nude', hex: '#E8C39E' },
  { name: 'Mocha', hex: '#8B5E3C' },
  { name: 'Plum', hex: '#6B3FA0' },
  { name: 'Lavender', hex: '#B9A6E0' },
  { name: 'Sky', hex: '#9CC9E8' },
  { name: 'Pearl', hex: '#F4EFF1' },
]

export default function TryOnColorCard() {
  const [selected, setSelected] = useState(SWATCHES[0])

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] border border-white/80 shadow-card p-6 sm:p-10 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="font-script text-4xl text-rose-500">Try On Color</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-gray-800">ลองเลือกสีที่ชอบ</h2>
          <p className="mt-2 text-gray-500">เลือกสีด้านล่าง แล้วไปลองสีบนรูปมือของคุณเองที่หน้า AI</p>

          <div role="radiogroup" aria-label="เลือกสีเล็บ" className="mt-6 flex flex-wrap gap-3">
            {SWATCHES.map((s) => {
              const active = s.hex === selected.hex
              return (
                <button
                  key={s.hex}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={s.name}
                  title={s.name}
                  onClick={() => setSelected(s)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 shadow-sm transition-transform hover:scale-110 ${
                    active ? 'border-rose-500 ring-2 ring-rose-200 scale-110' : 'border-white'
                  }`}
                  style={{ backgroundColor: s.hex }}
                />
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-center text-center gap-4 bg-rose-50/70 rounded-3xl p-6">
          <div
            aria-hidden="true"
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-card"
            style={{ backgroundColor: selected.hex }}
          />
          <p className="font-semibold text-gray-800">
            สีที่เลือก: <span className="text-rose-600">{selected.name}</span>
          </p>
          <Link
            to="/ai"
            className="btn-candy px-7 py-3"
          >
            ✨ ลองสีนี้ด้วย AI
          </Link>
        </div>
      </div>
    </section>
  )
}
