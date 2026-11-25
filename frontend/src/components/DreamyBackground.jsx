// พื้นหลังตกแต่งแบบ "ฝันหวานสีชมพู" ใช้ร่วมกันทั้งหน้าแรกและหน้า AI
// - วางแบบ fixed อยู่หลังเนื้อหาทั้งหมด (ต้องอยู่ใน container ที่มี class "isolate")
// - เป็นของตกแต่งล้วน: ไม่มีปุ่ม ไม่รับการแตะ (pointer-events-none) และซ่อนจากโปรแกรมอ่านหน้าจอ
// - ใช้ radial-gradient แทน blur ขนาดใหญ่ เพื่อไม่ให้ไอแพด/มือถือเลื่อนหน้าช้า
// - เคลื่อนไหวเฉพาะเมื่อเครื่องไม่ได้ตั้ง "ลดการเคลื่อนไหว" (motion-safe)

function GlassHeart({ className = '', style }) {
  return (
    <svg viewBox="0 0 64 58" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="gh-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE4EE" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#F9A8C9" stopOpacity="0.75" />
          <stop offset="1" stopColor="#EC4C82" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        d="M32 56 C 14 42 2 32 2 18 C 2 8 10 2 18 2 C 24 2 29 5 32 10 C 35 5 40 2 46 2 C 54 2 62 8 62 18 C 62 32 50 42 32 56 Z"
        fill="url(#gh-fill)"
        stroke="#ffffff"
        strokeOpacity="0.9"
        strokeWidth="1.5"
      />
      <ellipse cx="18" cy="14" rx="7" ry="4" fill="#ffffff" fillOpacity="0.85" transform="rotate(-30 18 14)" />
    </svg>
  )
}

function Sparkle({ className = '', style }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path d="M12 0 C 13 8 16 11 24 12 C 16 13 13 16 12 24 C 11 16 8 13 0 12 C 8 11 11 8 12 0 Z" fill="currentColor" />
    </svg>
  )
}

function RibbonSwoosh({ className = '', flip = false }) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      {/* ริบบิ้นซาติน: ขอบเข้ม → เนื้อชมพู → แถบแสงกลาง → เส้นเงา */}
      <g fill="none" strokeLinecap="round">
        <path d="M-20 260 C 80 180 120 40 240 60 S 380 200 420 120" stroke="#EE8FB4" strokeOpacity="0.55" strokeWidth="34" />
        <path d="M-20 260 C 80 180 120 40 240 60 S 380 200 420 120" stroke="#F9BFD5" strokeOpacity="0.85" strokeWidth="28" />
        <path d="M-20 260 C 80 180 120 40 240 60 S 380 200 420 120" stroke="#FFE3EE" strokeOpacity="0.9" strokeWidth="12" />
        <path d="M-20 260 C 80 180 120 40 240 60 S 380 200 420 120" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="3" />
      </g>
    </svg>
  )
}

const HEARTS = [
  { top: '12%', left: '4%', size: 'w-12 sm:w-16', delay: '0s' },
  { top: '30%', right: '6%', size: 'w-10 sm:w-14', delay: '1.1s' },
  { top: '58%', left: '7%', size: 'w-9 sm:w-12', delay: '0.6s', desktopOnly: true },
  { top: '74%', right: '10%', size: 'w-12 sm:w-16', delay: '1.6s' },
  { top: '88%', left: '38%', size: 'w-8 sm:w-10', delay: '2s', desktopOnly: true },
  { top: '6%', right: '30%', size: 'w-8 sm:w-10', delay: '0.3s', desktopOnly: true },
]

const SPARKLES = [
  { top: '9%', left: '22%', size: 'w-4', color: 'text-white' },
  { top: '18%', right: '18%', size: 'w-5', color: 'text-rose-300' },
  { top: '42%', left: '15%', size: 'w-3', color: 'text-white' },
  { top: '50%', right: '22%', size: 'w-4', color: 'text-white' },
  { top: '66%', left: '28%', size: 'w-5', color: 'text-rose-300' },
  { top: '82%', right: '28%', size: 'w-3', color: 'text-white' },
  { top: '35%', left: '48%', size: 'w-3', color: 'text-rose-200' },
]

export default function DreamyBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      {/* พื้นชมพูไล่เฉด + แสงฟุ้ง */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(60rem 40rem at 85% -10%, rgba(249,168,201,0.55), transparent 60%)',
            'radial-gradient(50rem 36rem at -10% 40%, rgba(252,205,224,0.7), transparent 60%)',
            'radial-gradient(40rem 30rem at 70% 105%, rgba(244,114,160,0.28), transparent 60%)',
            'linear-gradient(180deg, #FFF1F6 0%, #FCE4EE 45%, #FDEAF2 100%)',
          ].join(','),
        }}
      />

      {/* ริบบิ้นสองมุม */}
      <RibbonSwoosh className="absolute -top-10 -left-24 w-[26rem] sm:w-[34rem] opacity-80" />
      <RibbonSwoosh flip className="absolute bottom-0 -right-24 w-[26rem] sm:w-[34rem] opacity-70" />

      {/* โบว์มุมบน */}
      <span className="absolute top-20 left-3 sm:left-8 text-4xl sm:text-5xl opacity-90 rotate-[-18deg]">🎀</span>
      <span className="absolute top-24 right-3 sm:right-10 text-3xl sm:text-5xl opacity-90 rotate-[14deg] hidden sm:block">🎀</span>

      {/* หัวใจแก้วลอย */}
      {HEARTS.map((h, i) => (
        <GlassHeart
          key={i}
          className={`absolute ${h.size} ${h.desktopOnly ? 'hidden md:block' : ''} drop-shadow-[0_6px_12px_rgba(236,76,130,0.25)] motion-safe:animate-float`}
          style={{ top: h.top, left: h.left, right: h.right, animationDelay: h.delay }}
        />
      ))}

      {/* ประกายดาว */}
      {SPARKLES.map((s, i) => (
        <Sparkle
          key={i}
          className={`absolute ${s.size} ${s.color} motion-safe:animate-pulse`}
          style={{ top: s.top, left: s.left, right: s.right, animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </div>
  )
}
