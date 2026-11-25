import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

// ส่วน "ลองสี" ในหน้าแรก: เลือกสีจากแผงปลายเล็บ แล้วเห็นเล็บ 3D เปลี่ยนสีตาม
// กดปุ่มเพื่อไปลองสีบนรูปมือของตัวเองที่หน้า AI (ปลายทางเดิม)
const SWATCHES = [
  { name: 'Rose', th: 'ชมพูกุหลาบ', hex: '#EC4C82' },
  { name: 'Blush', th: 'ชมพูอ่อน', hex: '#F7B6CC' },
  { name: 'Nude', th: 'นู้ด', hex: '#E8C39E' },
  { name: 'Mocha', th: 'มอคค่า', hex: '#8B5E3C' },
  { name: 'Plum', th: 'พลัม', hex: '#6B3FA0' },
  { name: 'Lavender', th: 'ลาเวนเดอร์', hex: '#B9A6E0' },
  { name: 'Sky', th: 'ฟ้า', hex: '#9CC9E8' },
  { name: 'Pearl', th: 'ขาวมุก', hex: '#F4EFF1' },
]

// ปรับความสว่างของสี hex (+ สว่างขึ้น, - เข้มขึ้น)
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))))
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ปลายนิ้วกับเล็บ วาดด้วย SVG: เนื้อสีไล่ แสงสะท้อนเงา เงาโคนเล็บ
function Nail3D({ hex }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox="0 0 200 260" className="w-40 sm:w-48 h-auto drop-shadow-[0_18px_24px_rgba(31,27,22,0.18)]" role="img" aria-label="ตัวอย่างสีบนเล็บ">
      <defs>
        <linearGradient id={`skin${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#EBC3AC" />
          <stop offset="0.45" stopColor="#F8D9C6" />
          <stop offset="1" stopColor="#E2B49B" />
        </linearGradient>
        <linearGradient id={`nail${id}`} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stopColor={shade(hex, -0.28)} />
          <stop offset="0.38" stopColor={shade(hex, 0.12)} />
          <stop offset="0.7" stopColor={hex} />
          <stop offset="1" stopColor={shade(hex, -0.32)} />
        </linearGradient>
        <linearGradient id={`gloss${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* นิ้ว */}
      <path d="M38 260 V120 C38 62 66 30 100 30 C134 30 162 62 162 120 V260 Z" fill={`url(#skin${id})`} />
      <path d="M52 250 V130" stroke="#fff" strokeOpacity="0.25" strokeWidth="8" strokeLinecap="round" />
      {/* เล็บ */}
      <path d="M60 150 V92 C60 54 78 34 100 34 C122 34 140 54 140 92 V150 C140 160 128 166 100 166 C72 166 60 160 60 150 Z" fill={`url(#nail${id})`} />
      {/* เงาโคนเล็บ */}
      <path d="M62 150 C62 160 74 166 100 166 C126 166 138 160 138 150" fill="none" stroke={shade(hex, -0.45)} strokeOpacity="0.35" strokeWidth="5" />
      {/* แสงสะท้อน */}
      <path d="M76 140 V96 C76 72 84 56 94 50 C88 66 88 82 88 100 V140 Z" fill={`url(#gloss${id})`} />
      <ellipse cx="117" cy="70" rx="5" ry="9" fill="#fff" opacity="0.55" />
    </svg>
  )
}

function TipSwatch({ s, active, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={s.th}
      title={s.th}
      onClick={() => onSelect(s)}
      className={`group relative flex h-14 w-10 items-end justify-center rounded-xl transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 ${
        active ? '-translate-y-1.5' : 'hover:-translate-y-0.5'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      <svg viewBox="0 0 40 56" className="h-full w-full" aria-hidden="true">
        <path d="M6 54 V22 C6 10 12 2 20 2 C28 2 34 10 34 22 V54 Z" fill={s.hex} stroke="rgba(31,27,22,0.08)" />
        <path d="M11 44 V22 C11 14 14 9 18 7 C16 13 16 18 16 24 V44 Z" fill="#fff" opacity="0.5" />
      </svg>
      {active && <span className="absolute -bottom-2 h-1 w-5 rounded-full bg-rose-500" />}
    </button>
  )
}

export default function TryOnColorCard() {
  const [selected, setSelected] = useState(SWATCHES[0])

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="grid md:grid-cols-2 gap-8 items-center rounded-[24px] border border-[#1f1b16]/[0.06] bg-white/85 p-6 sm:p-10 shadow-soft">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-gray-800">ลองเลือกสีที่ชอบ</h2>
          <p className="mt-2 text-gray-600">แตะสีด้านล่างเพื่อดูบนเล็บ แล้วไปลองบนรูปมือของคุณเองที่หน้า AI</p>

          <div role="radiogroup" aria-label="เลือกสีเล็บ" className="mt-8 flex flex-wrap gap-x-3 gap-y-4">
            {SWATCHES.map((s) => (
              <TipSwatch key={s.hex} s={s} active={s.hex === selected.hex} onSelect={setSelected} />
            ))}
          </div>
        </div>

        <div className="lucky-3d flex flex-col items-center text-center gap-4 rounded-[20px] bg-gradient-to-b from-rose-50 to-white p-6">
          <div key={selected.hex} className="lucky-nail-turn" style={{ transformStyle: 'preserve-3d' }}>
            <Nail3D hex={selected.hex} />
          </div>
          <p className="text-gray-600">
            สีที่เลือก <span className="font-semibold text-gray-800">{selected.th}</span>
          </p>
          <Link to="/ai" className="btn-candy px-7 py-3">
            <Icon name="hand" /> ลองสีนี้บนมือคุณ
          </Link>
        </div>
      </div>
    </section>
  )
}
