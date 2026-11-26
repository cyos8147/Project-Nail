import { useEffect, useRef } from 'react'

// แสงเงาวาบผ่านปุ่มจอง (เหมือนเล็บที่เพิ่งทาท็อปโค้ต) ใช้กับปุ่มที่มีคลาส lucky-gloss
// วาบครั้งแรกหลังเปิดหน้า 1.2 วิ แล้ววาบซ้ำทุก 7 วิ อีกไม่เกิน 3 ครั้ง
// หยุดทันทีเมื่อผู้ใช้แตะ/พิมพ์/เลื่อนหน้า หรือสลับแท็บ และไม่ทำงานเลยถ้าเครื่องตั้งค่าลดการเคลื่อนไหว
// ตอนชี้เมาส์ (เฉพาะคอม) CSS จะวาบเองผ่าน :hover
const FIRST_MS = 1200
const EVERY_MS = 7000
const REPEATS = 3

export default function useGloss(enabled = true) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el || typeof window === 'undefined') return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    const timers = []
    const shine = () => {
      el.classList.remove('is-shining')
      void el.offsetWidth // เริ่มแอนิเมชันใหม่
      el.classList.add('is-shining')
    }
    const onEnd = (e) => {
      if (e.animationName === 'lucky-gloss') el.classList.remove('is-shining')
    }
    const stop = () => {
      timers.forEach(clearTimeout)
      timers.length = 0
    }
    const onVisibility = () => document.hidden && stop()

    // ครั้งแรกวาบเสมอ (แค่ครั้งเดียว) ส่วนครั้งที่วาบซ้ำจะยกเลิกเมื่อผู้ใช้เริ่มใช้งานหน้า
    const first = setTimeout(shine, FIRST_MS)
    for (let i = 1; i <= REPEATS; i++) timers.push(setTimeout(shine, FIRST_MS + i * EVERY_MS))

    el.addEventListener('animationend', onEnd)
    const opts = { once: true, passive: true }
    window.addEventListener('pointerdown', stop, opts)
    window.addEventListener('keydown', stop, opts)
    window.addEventListener('scroll', stop, opts)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimeout(first)
      stop()
      el.removeEventListener('animationend', onEnd)
      el.classList.remove('is-shining')
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('scroll', stop)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])

  return ref
}
