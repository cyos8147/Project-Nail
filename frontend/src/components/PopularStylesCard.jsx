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

function Heart({ className = '', style }) {
  return (
    <svg viewBox="0 0 24 22" className={className} style={style} aria-hidden="true">
      <path d="M12 21 C4 15 1 11 1 6.5 C1 3 3.6 1 6.4 1 C8.6 1 10.6 2.3 12 4.3 C13.4 2.3 15.4 1 17.6 1 C20.4 1 23 3 23 6.5 C23 11 20 15 12 21Z" fill="currentColor" />
      <ellipse cx="7" cy="6" rx="2.6" ry="1.6" fill="#fff" opacity="0.75" transform="rotate(-30 7 6)" />
    </svg>
  )
}

function Spark({ className = '', style }) {
  return (
    <svg viewBox="-6 -6 12 12" className={className} style={style} aria-hidden="true">
      <path d="M0 -6 C0.6 -1.2 1.2 -0.6 6 0 C1.2 0.6 0.6 1.2 0 6 C-0.6 1.2 -1.2 0.6 -6 0 C-1.2 -0.6 -0.6 -1.2 0 -6Z" fill="currentColor" />
    </svg>
  )
}

export default function PopularStylesCard() {
  const [designs, setDesigns] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false) // เมาส์/นิ้วอยู่บนการ์ด
  const [focused, setFocused] = useState(false) // คีย์บอร์ดโฟกัสอยู่ในการ์ด (แยกจากเมาส์ ไม่ให้ล้างกันเอง)
  const [hidden, setHidden] = useState(false)
  const [reduced] = useState(prefersReducedMotion)
  const pointerX = useRef(null)

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

  return (
    // ชั้นนอกลอยขึ้นลง ชั้นในเอียง (แยกกันเพราะ transform ของสองอย่างจะทับกัน)
    <div className="relative mx-auto w-full max-w-sm motion-safe:animate-float hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]" style={{ animationDuration: '6s' }}>
      {/* ของตกแต่งรอบการ์ด */}
      <Heart className="absolute -left-5 top-1/3 z-10 w-8 text-pink-300 drop-shadow motion-safe:animate-float" style={{ animationDelay: '0.8s' }} />
      <Heart className="absolute -right-4 bottom-16 z-10 w-6 text-rose-300 drop-shadow motion-safe:animate-float" style={{ animationDelay: '1.6s' }} />
      <Spark className="lucky-twinkle absolute -left-2 -top-2 z-10 w-5 text-white" />
      <Spark className="lucky-twinkle absolute right-10 -bottom-3 z-10 w-4 text-rose-300" style={{ animationDelay: '1.2s' }} />
      <Spark className="lucky-twinkle absolute -right-3 top-1/2 z-10 w-3 text-white" style={{ animationDelay: '0.6s' }} />

      <div
        role="region"
        aria-roledescription="สไลด์โชว์"
        aria-label="ลายเล็บยอดนิยม"
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovering(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHovering(false)}
        onFocus={(e) => e.target.matches?.(':focus-visible') && setFocused(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
        className="relative -rotate-3 bg-white/70 backdrop-blur-md rounded-[2rem] border-2 border-white shadow-[0_24px_50px_-22px_rgba(217,59,114,0.6)] p-5 sm:p-6"
      >
        <div className="absolute -top-4 -right-3 text-4xl drop-shadow motion-safe:animate-float" aria-hidden="true" style={{ animationDuration: '3s' }}>
          🎀
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-script text-3xl text-rose-500">Popular Styles</p>
          {count > 1 && (
            <span className="text-xs font-display font-semibold text-rose-400 tabular-nums">
              {index + 1} / {count}
            </span>
          )}
        </div>

        <div
          className="relative mt-4 aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-200 ring-2 ring-white select-none"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (pointerX.current = null)}
        >
          {count === 0 && !loaded && <Bone className="absolute inset-0 !rounded-2xl" />}
          {count === 0 && loaded && <div className="w-full h-full flex items-center justify-center text-rose-400 text-sm">ลายเล็บยอดนิยม</div>}

          {/* ทุกภาพซ้อนกันอยู่ ภาพที่แสดงจะจางเข้า ภาพอื่นจางออก */}
          {designs.map((d, i) => {
            const active = i === index
            return (
              <div
                key={d.id}
                aria-hidden={!active}
                className="absolute inset-0 transition-opacity duration-700 ease-out"
                style={{ opacity: active ? 1 : 0 }}
              >
                <img
                  key={active ? `on-${index}` : 'off'}
                  src={d.image_url}
                  alt={active ? d.name : ''}
                  draggable="false"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`w-full h-full object-cover ${active ? 'lucky-kenburns' : ''}`}
                />
              </div>
            )
          })}

          {/* แสงสะท้อนกระจก วิ่งผ่านหนึ่งครั้งเมื่อเปลี่ยนภาพ */}
          {count > 0 && (
            <span
              key={`sweep-${index}`}
              aria-hidden="true"
              className="lucky-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
            />
          )}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-rose-900/15 via-transparent to-white/10" />
        </div>

        {/* จุดบอกลำดับ: จุดปัจจุบันมีแถบนับเวลาไปภาพถัดไป */}
        {count > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {designs.map((d, i) => {
              const active = i === index
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`ดูลายที่ ${i + 1}: ${d.name}`}
                  aria-current={active}
                  className={`relative h-2.5 rounded-full overflow-hidden transition-all duration-300 ${active ? 'w-8 bg-rose-200' : 'w-2.5 bg-rose-200/70 hover:bg-rose-300'}`}
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

        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => step(-1)} disabled={count < 2} aria-label="ลายก่อนหน้า" className="btn-candy-soft w-9 h-9 !p-0 text-lg">
            ‹
          </button>
          <p key={`name-${index}`} aria-live={playing ? 'off' : 'polite'} className="lucky-fade-up font-display font-semibold text-gray-700 truncate">
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
