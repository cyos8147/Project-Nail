import { useCallback, useEffect, useRef, useState } from 'react'
import { getNailDesigns } from '../api/client.js'
import { Bone } from './Skeleton.jsx'

// การ์ดลายเล็บยอดนิยม (หน้าแรก) แบบสไลด์โชว์
// - เปลี่ยนภาพเองทุก SLIDE_MS: ภาพใหม่ค่อย ๆ จางเข้า + ซูมช้า ๆ + แสงสะท้อนวิ่งผ่านหนึ่งครั้ง
// - กดลูกศร กดจุด หรือปัดซ้าย/ขวาเพื่อเปลี่ยนเอง (ตั้งเวลานับใหม่ทุกครั้ง)
// - หยุดเลื่อนเองเมื่อเมาส์/นิ้ว/คีย์บอร์ดอยู่บนการ์ด หรือเมื่อแท็บถูกซ่อน
// - เครื่องที่ตั้ง "ลดการเคลื่อนไหว": ไม่เลื่อนเอง ไม่มีแอนิเมชัน (กดเปลี่ยนเองได้ตามปกติ)
const SLIDE_MS = 4000
const SWIPE_PX = 40

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function PopularStylesCard() {
  const [designs, setDesigns] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false) // เมาส์/นิ้วอยู่บนการ์ด
  const [focused, setFocused] = useState(false) // คีย์บอร์ดโฟกัสอยู่ในการ์ด (แยกจากเมาส์ ไม่ให้ล้างกันเอง)
  const [hidden, setHidden] = useState(false)
  const [reduced] = useState(prefersReducedMotion)
  const pointerX = useRef(null)
  const tiltRef = useRef(null)

  useEffect(() => {
    getNailDesigns()
      .then((data) => setDesigns((data || []).filter((d) => d.image_url).slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const count = designs.length
  const current = count ? designs[index % count] : null
  const playing = count > 1 && !reduced && !hovering && !focused && !hidden

  const go = useCallback((next) => count && setIndex(((next % count) + count) % count), [count])
  const step = (delta) => go(index + delta)

  // ตั้งเวลาใหม่ทุกครั้งที่เปลี่ยนภาพ จึงไม่ข้ามภาพหลังจากกดเปลี่ยนเอง
  useEffect(() => {
    if (!playing) return undefined
    const t = setTimeout(() => go(index + 1), SLIDE_MS)
    return () => clearTimeout(t)
  }, [playing, index, go])

  function onPointerDown(e) {
    pointerX.current = e.clientX
  }
  function onPointerUp(e) {
    if (pointerX.current == null) return
    const dx = e.clientX - pointerX.current
    pointerX.current = null
    if (Math.abs(dx) >= SWIPE_PX) step(dx < 0 ? 1 : -1)
  }

  // เอียงการ์ดแบบ 3D ตามเมาส์ (เฉพาะเมาส์จริง ไม่ทำกับนิ้ว/ปากกา และไม่ทำเมื่อลดการเคลื่อนไหว)
  function onTiltMove(e) {
    if (reduced || e.pointerType !== 'mouse' || !tiltRef.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    tiltRef.current.style.transform = `rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg)`
  }
  function resetTilt() {
    if (tiltRef.current) tiltRef.current.style.transform = ''
  }

  return (
    <div className="lucky-3d relative mx-auto w-full max-w-sm" onPointerMove={onTiltMove} onPointerLeave={resetTilt}>
      <div
        ref={tiltRef}
        role="region"
        aria-roledescription="สไลด์โชว์"
        aria-label="ลายเล็บยอดนิยม"
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovering(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHovering(false)}
        onFocus={(e) => e.target.matches?.(':focus-visible') && setFocused(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
        className="lucky-3d-inner relative rounded-[24px] border border-white bg-white/75 p-5 sm:p-6 shadow-lift backdrop-blur-md"
      >
        <div className="lucky-z1 flex items-baseline justify-between gap-2">
          <p className="font-script text-3xl text-rose-500">Popular Styles</p>
          {count > 1 && (
            <span className="text-xs text-gray-500 tabular-nums">
              {index + 1} / {count}
            </span>
          )}
        </div>

        <div
          className="lucky-z2 relative mt-4 aspect-[4/3] rounded-2xl overflow-hidden bg-rose-50 select-none shadow-soft"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (pointerX.current = null)}
        >
          {count === 0 && !loaded && <Bone className="absolute inset-0 !rounded-2xl" />}
          {count === 0 && loaded && <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">ลายเล็บยอดนิยม</div>}

          {/* ทุกภาพซ้อนกันอยู่ ภาพที่แสดงพลิกเข้ามาแบบ 3D ภาพอื่นจางออก */}
          {designs.map((d, i) => {
            const active = i === index
            return (
              <div
                key={d.id}
                aria-hidden={!active}
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: active ? 1 : 0, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              >
                <img
                  key={active ? `on-${index}` : 'off'}
                  src={d.image_url}
                  alt={active ? d.name : ''}
                  draggable="false"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`w-full h-full object-cover ${active ? 'lucky-flip-in' : ''}`}
                />
              </div>
            )
          })}

          {/* แสงสะท้อนกระจก วิ่งผ่านหนึ่งครั้งเมื่อเปลี่ยนภาพ */}
          {count > 0 && (
            <span
              key={`sweep-${index}`}
              aria-hidden="true"
              className="lucky-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          )}
        </div>

        {/* จุดบอกลำดับ: จุดปัจจุบันมีแถบนับเวลาไปภาพถัดไป */}
        {count > 1 && (
          <div className="lucky-z1 mt-4 flex items-center justify-center gap-1.5">
            {designs.map((d, i) => {
              const active = i === index
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`ดูลายที่ ${i + 1}: ${d.name}`}
                  aria-current={active}
                  className={`relative h-2 rounded-full overflow-hidden transition-[width,background-color] duration-300 ${active ? 'w-8 bg-rose-100' : 'w-2 bg-gray-300/70 hover:bg-gray-400/70'}`}
                >
                  {active && (
                    <span
                      key={`p-${index}`}
                      className={`absolute inset-0 rounded-full bg-rose-500 ${playing ? 'lucky-progress' : ''}`}
                      style={playing ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="lucky-z1 mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => step(-1)} disabled={count < 2} aria-label="ลายก่อนหน้า" className="btn-candy-soft w-9 h-9 !p-0 text-lg">
            ‹
          </button>
          <p key={`name-${index}`} aria-live={playing ? 'off' : 'polite'} className="lucky-fade-up font-display font-semibold text-gray-800 truncate">
            {current?.name || ''}
          </p>
          <button type="button" onClick={() => step(1)} disabled={count < 2} aria-label="ลายถัดไป" className="btn-candy-soft w-9 h-9 !p-0 text-lg">
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
