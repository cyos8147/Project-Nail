import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { Sparkle } from './Decor.jsx'

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
    <svg viewBox="0 0 200 260" className="w-full h-auto drop-shadow-[0_18px_24px_rgba(31,27,22,0.18)]" role="img" aria-label="ตัวอย่างสีบนเล็บ">
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

// ปุ่มสีกลมเงาเหมือนหยดยาทาเล็บ
function DropSwatch({ s, active, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={s.th}
      title={s.th}
      onClick={() => onSelect(s)}
      className={`relative h-11 w-11 shrink-0 rounded-full transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 ${
        active ? 'scale-110 ring-[3px] ring-white shadow-[0_0_0_5px_rgba(236,76,130,0.45),0_8px_14px_-6px_rgba(150,40,85,0.6)]' : 'hover:-translate-y-0.5 shadow-[0_6px_12px_-6px_rgba(150,40,85,0.55)]'
      }`}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.95) 0 9%, ${shade(s.hex, 0.25)} 22%, ${s.hex} 55%, ${shade(s.hex, -0.3)} 100%)`,
      }}
    />
  )
}

export default function TryOnColorCard() {
  const [selected, setSelected] = useState(SWATCHES[0])
  const randomize = () => {
    const rest = SWATCHES.filter((s) => s.hex !== selected.hex)
    setSelected(rest[Math.floor(Math.random() * rest.length)])
  }

  return (
    <div className="glass relative min-w-0 rounded-[30px] p-5 sm:p-6 flex flex-col">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-[#4A2A37]">
        <Sparkle className="h-6 w-6 text-rose-400" />
        ลองเลือกสีที่ชอบ
      </h2>
      <p className="mt-1 text-sm text-[#7A4A5E]">แตะสีเพื่อดูบนเล็บ แล้วไปลองบนรูปมือของคุณเองได้เลย</p>

      <div role="radiogroup" aria-label="เลือกสีเล็บ" className="mt-4 flex flex-wrap gap-2.5 py-2">
        {SWATCHES.map((s) => (
          <DropSwatch key={s.hex} s={s} active={s.hex === selected.hex} onSelect={setSelected} />
        ))}
      </div>

      {/* กรอบตัวอย่าง: รูปมือจริงเป็นฉาก + เล็บ 3D แสดงสีที่เลือก + ปุ่มเครื่องมือด้านขวา */}
      <div className="relative mt-3 flex-1 min-h-[220px] overflow-hidden rounded-[22px] border-[5px] border-white/90 shadow-[0_14px_30px_-18px_rgba(150,40,85,0.6)]">
        <img src="/photos/tryon-hand.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[60%_55%] saturate-50 blur-[2px]" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#FFF3F7]/95 via-[#FFF3F7]/75 to-[#FFF3F7]/35" />

        <div className="lucky-3d relative flex h-full items-center gap-3 p-4">
          <div key={selected.hex} className="lucky-nail-turn w-24 sm:w-28 shrink-0" style={{ transformStyle: 'preserve-3d' }}>
            <Nail3D hex={selected.hex} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#7A4A5E]">สีที่เลือก</p>
            <p className="font-display text-lg font-semibold text-[#4A2A37]">{selected.th}</p>
          </div>
        </div>

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {[{ onClick: randomize, icon: 'repeat', label: 'สุ่มสี' }].map((t) => {
            const inner = (
              <>
                <span className="glass-btn h-11 w-11"><Icon name={t.icon} /></span>
                <span className="text-[11px] font-display font-semibold leading-none text-[#4A2A37]">{t.label}</span>
              </>
            )
            const cls = 'flex flex-col items-center gap-1 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400'
            return t.to ? (
              <Link key={t.label} to={t.to} className={cls}>{inner}</Link>
            ) : (
              <button key={t.label} type="button" onClick={t.onClick} className={cls}>{inner}</button>
            )
          })}
        </div>
      </div>

      <Link to="/ai" className="btn-candy mt-5 self-start px-7 py-3">
        <Icon name="hand" /> ลองสีบนมือคุณ
      </Link>
    </div>
  )
}
