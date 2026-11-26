import { useEffect, useState } from 'react'
import { SolidHeart } from './Decor.jsx'

// ฉากเปิดเว็บ: ชื่อร้านค่อย ๆ เขียนออกมา มีมงกุฎและหัวใจลอย แล้วจางหายไปเอง (~2.2 วินาที)
// - แสดงครั้งเดียวต่อการเปิดเว็บ (จำใน sessionStorage) จะได้ไม่รำคาญเวลาเปลี่ยนหน้า
// - แตะหรือกดปุ่มใดก็ได้เพื่อข้าม
// - ไม่แสดงเลยถ้าเครื่องตั้งค่า "ลดการเคลื่อนไหว"
const SEEN_KEY = 'luckysalon_splash_seen'
const TOTAL_MS = 2250

function shouldShow() {
  // หน้าแอดมินไม่ต้องมีฉากเปิด (และไม่นับว่าเคยเห็นแล้ว)
  if (window.location.pathname.startsWith('/admin')) return false
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    if (window.sessionStorage.getItem(SEEN_KEY)) return false
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // เก็บไม่ได้ (โหมดส่วนตัว ฯลฯ) ก็ยังแสดงได้ตามปกติ
  }
  return true
}

// ตัดสินใจครั้งเดียวตอนโหลดเว็บ (ไม่ทำใน render เพราะ StrictMode อาจเรียกซ้ำ)
const SHOW_ON_LOAD = typeof window !== 'undefined' && shouldShow()

const HEARTS = [
  { left: '18%', delay: '0.2s', size: 'text-2xl' },
  { left: '32%', delay: '0.55s', size: 'text-xl' },
  { left: '50%', delay: '0.35s', size: 'text-3xl' },
  { left: '66%', delay: '0.7s', size: 'text-xl' },
  { left: '80%', delay: '0.25s', size: 'text-2xl' },
]

export default function SplashIntro() {
  const [visible, setVisible] = useState(SHOW_ON_LOAD)

  useEffect(() => {
    if (!visible) return undefined
    const timer = setTimeout(() => setVisible(false), TOTAL_MS)
    const skip = () => setVisible(false)
    window.addEventListener('keydown', skip)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', skip)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      onClick={() => setVisible(false)}
      className="lucky-splash fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      style={{ background: 'radial-gradient(40rem 30rem at 50% 40%, #FFE4EE, #FBCFE0 55%, #F7B6CC)' }}
    >
      {HEARTS.map((h, i) => (
        <span
          key={i}
          className={`lucky-splash__heart absolute bottom-[22%] ${h.size} text-white drop-shadow`}
          style={{ left: h.left, animationDelay: h.delay }}
        >
          <SolidHeart className="w-[1em]" />
        </span>
      ))}

      <img src="/logo-mark-320.png" alt="" aria-hidden="true" className="lucky-splash__crown h-28 w-28 sm:h-36 sm:w-36 drop-shadow-[0_6px_18px_rgba(255,255,255,0.9)]" />
      <p className="lucky-splash__word mt-1 font-script text-6xl sm:text-8xl text-berry leading-tight px-4 pb-2 drop-shadow-[0_4px_12px_rgba(255,255,255,0.8)]">
        Lucky Salon
      </p>
      <p className="lucky-splash__tag mt-2 text-sm sm:text-base text-[#7A4A5E]">
        Hair &amp; Nail Salon
      </p>
    </div>
  )
}
