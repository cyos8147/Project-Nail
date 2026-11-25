import { useEffect, useState } from 'react'

// โครงจำลองระหว่างโหลด: กล่องสีชมพูจางที่มีแสงวิ่ง (หยุดวิ่งเมื่อตั้งค่าลดการเคลื่อนไหว)
export function Bone({ className = '' }) {
  return <span aria-hidden="true" className={`lucky-skeleton block rounded-xl ${className}`} />
}

// true เมื่อยังโหลดไม่เสร็จนานเกิน ms (เซิร์ฟเวอร์ฟรีของ Render อาจใช้เวลาตื่น ~50 วินาที)
export function useSlow(loading, ms = 5000) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!loading) {
      setSlow(false)
      return undefined
    }
    const t = setTimeout(() => setSlow(true), ms)
    return () => clearTimeout(t)
  }, [loading, ms])
  return slow
}

export function SlowNote({ show }) {
  if (!show) return null
  return (
    <p role="status" className="mt-4 text-center text-sm text-rose-500">
      กำลังโหลดข้อมูลร้าน… ครั้งแรกอาจใช้เวลาสักครู่
    </p>
  )
}
