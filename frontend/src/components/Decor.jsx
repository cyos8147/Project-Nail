import { useId } from 'react'

// ของตกแต่งของร้าน (วาดด้วย SVG ทั้งหมด ไม่มีรูปภาพ): โบว์ซาติน หัวใจแก้ว ประกาย ริบบิ้น ขวดยาทาเล็บ น้องหมีมงกุฎ
// ทุกชิ้นเป็นของตกแต่งล้วน ซ่อนจากโปรแกรมอ่านหน้าจอ

const uid = (raw) => raw.replace(/[^a-zA-Z0-9]/g, '')

export function SatinBow({ className = '', style }) {
  const id = uid(useId())
  return (
    <svg viewBox="0 0 200 170" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`bw${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE0EC" />
          <stop offset="0.5" stopColor="#F9A9C8" />
          <stop offset="1" stopColor="#EC6F9E" />
        </linearGradient>
        <linearGradient id={`bt${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7A1C2" />
          <stop offset="1" stopColor="#F3C4D7" />
        </linearGradient>
      </defs>
      {/* หางโบว์ */}
      <path d="M93 74 C 84 102 70 128 54 156 L 74 151 L 82 166 C 94 136 101 106 102 76 Z" fill={`url(#bt${id})`} />
      <path d="M107 74 C 116 102 130 128 146 156 L 126 151 L 118 166 C 106 136 99 106 98 76 Z" fill={`url(#bt${id})`} />
      <path d="M95 82 C 88 106 78 128 66 150" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* ห่วงโบว์ */}
      <path d="M100 64 C 72 18 16 14 18 58 C 20 96 74 92 100 64 Z" fill={`url(#bw${id})`} />
      <path d="M100 64 C 128 18 184 14 182 58 C 180 96 126 92 100 64 Z" fill={`url(#bw${id})`} />
      {/* รอยพับด้านใน */}
      <path d="M100 64 C 80 46 50 44 44 60 C 54 74 82 74 100 64 Z" fill="#D9487F" opacity="0.32" />
      <path d="M100 64 C 120 46 150 44 156 60 C 146 74 118 74 100 64 Z" fill="#D9487F" opacity="0.32" />
      {/* แสงซาติน */}
      <path d="M94 56 C 76 30 42 26 32 46" stroke="#fff" strokeOpacity="0.85" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M106 56 C 124 30 158 26 168 46" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* ปม */}
      <rect x="88" y="50" width="24" height="30" rx="10" fill={`url(#bw${id})`} stroke="#E6679A" strokeOpacity="0.4" />
      <path d="M94 56 C 96 54 104 54 106 56" stroke="#fff" strokeOpacity="0.9" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function GlassHeart({ className = '', style }) {
  const id = uid(useId())
  return (
    <svg viewBox="0 0 64 58" className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id={`gh${id}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#FFF4F8" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#F9B4CE" stopOpacity="0.8" />
          <stop offset="1" stopColor="#EA5F92" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <path
        d="M32 56 C 14 42 2 32 2 18 C 2 8 10 2 18 2 C 24 2 29 5 32 10 C 35 5 40 2 46 2 C 54 2 62 8 62 18 C 62 32 50 42 32 56 Z"
        fill={`url(#gh${id})`}
        stroke="#fff"
        strokeOpacity="0.9"
        strokeWidth="1.5"
      />
      <ellipse cx="17" cy="14" rx="7" ry="3.6" fill="#fff" fillOpacity="0.9" transform="rotate(-32 17 14)" />
      <circle cx="47" cy="12" r="2" fill="#fff" fillOpacity="0.8" />
    </svg>
  )
}

export function Sparkle({ className = '', style }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path d="M12 0 C 13 8 16 11 24 12 C 16 13 13 16 12 24 C 11 16 8 13 0 12 C 8 11 11 8 12 0 Z" fill="currentColor" />
    </svg>
  )
}

export function RibbonSwoosh({ className = '', flip = false, style }) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      aria-hidden="true"
      style={{ ...(flip ? { transform: 'scaleX(-1)' } : null), ...style }}
    >
      <g fill="none" strokeLinecap="round">
        <path d="M-20 260 C 80 180 120 40 240 60 S 380 200 420 120" stroke="#EE8FB4" strokeOpacity="0.55" strokeWidth="34" />
        <path d="M-20 260 C 80 180 120 40 240 60 S 380 200 420 120" stroke="#F9BFD5" strokeOpacity="0.9" strokeWidth="28" />
        <path d="M-20 260 C 80 180 120 40 240 60 S 380 200 420 120" stroke="#FFE3EE" strokeOpacity="0.95" strokeWidth="12" />
        <path d="M-20 260 C 80 180 120 40 240 60 S 380 200 420 120" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="3" />
      </g>
    </svg>
  )
}

export function PolishBottle({ className = '', style }) {
  const id = uid(useId())
  return (
    <svg viewBox="0 0 120 200" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`pg${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D9487F" />
          <stop offset="0.35" stopColor="#F48DB3" />
          <stop offset="0.75" stopColor="#E86A9B" />
          <stop offset="1" stopColor="#C23A6E" />
        </linearGradient>
        <linearGradient id={`pc${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3A1F2B" />
          <stop offset="0.4" stopColor="#6E3A50" />
          <stop offset="1" stopColor="#2A1520" />
        </linearGradient>
      </defs>
      {/* หยดสีที่หก */}
      <ellipse cx="74" cy="190" rx="40" ry="8" fill="#F48DB3" opacity="0.85" />
      <ellipse cx="66" cy="188" rx="12" ry="2.5" fill="#fff" opacity="0.6" />
      {/* ฝา */}
      <rect x="40" y="6" width="40" height="70" rx="8" fill={`url(#pc${id})`} />
      <rect x="47" y="12" width="6" height="56" rx="3" fill="#fff" opacity="0.28" />
      {/* ขวด */}
      <path d="M22 96 C 22 82 32 76 46 76 H 74 C 88 76 98 82 98 96 V 168 C 98 180 90 186 78 186 H 42 C 30 186 22 180 22 168 Z" fill={`url(#pg${id})`} />
      <path d="M32 98 C 32 90 36 86 42 86 V 172 C 36 172 32 168 32 162 Z" fill="#fff" opacity="0.45" />
      <path d="M86 100 V 160" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function CrownBear({ className = '', style }) {
  const id = uid(useId())
  return (
    <svg viewBox="0 0 200 180" className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id={`bf${id}`} cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.7" stopColor="#FFF0F5" />
          <stop offset="1" stopColor="#F7D3E1" />
        </radialGradient>
        <linearGradient id={`cr${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE6F0" />
          <stop offset="1" stopColor="#F4A3C3" />
        </linearGradient>
      </defs>
      {/* หู */}
      <circle cx="48" cy="62" r="26" fill={`url(#bf${id})`} stroke="#F3C6D8" strokeWidth="2" />
      <circle cx="152" cy="62" r="26" fill={`url(#bf${id})`} stroke="#F3C6D8" strokeWidth="2" />
      <circle cx="48" cy="62" r="13" fill="#F9C9DA" />
      <circle cx="152" cy="62" r="13" fill="#F9C9DA" />
      {/* หัว */}
      <ellipse cx="100" cy="118" rx="80" ry="66" fill={`url(#bf${id})`} stroke="#F3C6D8" strokeWidth="2" />
      {/* มงกุฎ */}
      <path d="M72 58 L 78 26 L 92 44 L 100 18 L 108 44 L 122 26 L 128 58 Z" fill={`url(#cr${id})`} stroke="#E889AF" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="78" cy="24" r="4" fill="#F48DB3" />
      <circle cx="100" cy="16" r="4.5" fill="#F48DB3" />
      <circle cx="122" cy="24" r="4" fill="#F48DB3" />
      <path d="M76 50 H 124" stroke="#fff" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" />
      {/* หน้า: หลับตายิ้ม */}
      <path d="M62 112 C 68 104 78 104 84 112" stroke="#5A2B3E" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M116 112 C 122 104 132 104 138 112" stroke="#5A2B3E" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="58" cy="130" rx="12" ry="7" fill="#F7A8C4" opacity="0.6" />
      <ellipse cx="142" cy="130" rx="12" ry="7" fill="#F7A8C4" opacity="0.6" />
      <ellipse cx="100" cy="126" rx="6" ry="4.5" fill="#5A2B3E" />
      <path d="M92 136 C 96 142 100 140 100 136 C 100 140 104 142 108 136" stroke="#5A2B3E" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// มงกุฎเล็ก (ใช้แทนตัวอักษร ♛ ในโลโก้และหน้าเปิด)
export function Crown({ className = '', style }) {
  return (
    <svg viewBox="0 0 40 28" className={className} style={style} aria-hidden="true">
      <path d="M4 24 L 2 6 L 12 14 L 20 2 L 28 14 L 38 6 L 36 24 Z" fill="currentColor" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="2" cy="6" r="2.4" fill="currentColor" />
      <circle cx="20" cy="2" r="2.4" fill="currentColor" />
      <circle cx="38" cy="6" r="2.4" fill="currentColor" />
      <path d="M7 20 H 33" stroke="#fff" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// หัวใจทึบเล็ก (ใช้แทนตัวอักษร ♥)
export function SolidHeart({ className = '', style }) {
  return (
    <svg viewBox="0 0 24 22" className={className} style={style} aria-hidden="true">
      <path d="M12 21C5 16 1 12 1 7.2 1 3.8 3.6 1.5 6.6 1.5c2.1 0 3.9 1.1 5.4 3 1.5-1.9 3.3-3 5.4-3 3 0 5.6 2.3 5.6 5.7C23 12 19 16 12 21z" fill="currentColor" />
    </svg>
  )
}
