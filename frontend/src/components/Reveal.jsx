import { useEffect, useRef, useState } from 'react'

// ให้ส่วนต่าง ๆ ค่อย ๆ ลอยขึ้นมาเมื่อเลื่อนหน้าลงมาถึง
// ปลอดภัยไว้ก่อน: เริ่มต้น "มองเห็น" เสมอ จะซ่อนเฉพาะส่วนที่อยู่ใต้จอตอนโหลดเท่านั้น
// ถ้าเบราว์เซอร์ไม่รองรับ หรือเครื่องตั้ง "ลดการเคลื่อนไหว" ก็แสดงตามปกติไม่มีแอนิเมชัน
// หลังแสดงแล้วจะไม่เหลือ transform ค้าง (กันปัญหากับ position: fixed ของลูกข้างใน)
export default function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [phase, setPhase] = useState('static') // static | hidden | shown

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    if (el.getBoundingClientRect().top < window.innerHeight) return undefined // อยู่บนจอแล้ว ไม่ต้องซ่อน

    setPhase('hidden')
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase('shown')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    // กันพลาด: ถ้าผ่านไปนานแล้วยังไม่ถูกเรียก ให้แสดงเลย
    const fallback = setTimeout(() => setPhase((p) => (p === 'hidden' ? 'shown' : p)), 8000)
    return () => {
      io.disconnect()
      clearTimeout(fallback)
    }
  }, [])

  const style =
    phase === 'hidden'
      ? { opacity: 0, transform: 'translateY(28px)' }
      : phase === 'shown'
        ? { opacity: 1, transform: 'none', transition: `opacity 0.8s ease-out ${delay}ms, transform 0.8s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms` }
        : undefined

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}
