import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveCarryDesign } from '../utils/carryDesign.js'
import { getNailDesigns } from '../api/client.js'
import { Bone } from './Skeleton.jsx'
import Icon from './Icon.jsx'
import { GlassHeart, SatinBow } from './Decor.jsx'

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
  const navigate = useNavigate()
  function bookCurrent() {
    if (!current) return
    saveCarryDesign({ source: 'design', nail_design_id: current.id, nail_design_name: current.name, color_hex: current.color_hex, summary: current.name })
    navigate('/booking')
  }

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
    <div className="relative mx-auto w-full max-w-sm md:max-w-md lg:max-w-none lg:rotate-[4deg]">
      {/* โบว์ซาตินที่มุมการ์ด */}
      <div className="lucky-bow-pop pointer-events-none absolute -top-16 -right-10 z-20 w-28 xl:w-36"><SatinBow className="w-full rotate-[18deg]" /></div>
      <GlassHeart className="pointer-events-none absolute -top-5 -left-3 z-20 w-10 -rotate-12" />
      <div className="lucky-3d" onPointerMove={onTiltMove} onPointerLeave={resetTilt}>
      <div
        ref={tiltRef}
        role="region"
        aria-roledescription="สไลด์โชว์"
        aria-label="ลายเล็บยอดนิยม"
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovering(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHovering(false)}
        onFocus={(e) => e.target.matches?.(':focus-visible') && setFocused(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
        className="lucky-3d-inner glass relative rounded-[30px] p-5 sm:p-6"
      >
        <div className="lucky-z1 flex items-center justify-between gap-2 pl-1">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-[#4A2A37]">
            <Icon name="heart" className="h-5 w-5 text-rose-400" />
            ลายเล็บยอดนิยม
          </h2>
        </div>

        <div className="lucky-z2 relative mt-4">
          <div
            className="relative aspect-[4/3] rounded-[20px] overflow-hidden bg-rose-50 select-none border-[5px] border-white/90 shadow-[0_14px_30px_-18px_rgba(150,40,85,0.6)]"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (pointerX.current = null)}
          >
            {count === 0 && !loaded && <Bone className="absolute inset-0 !rounded-none" />}
            {count === 0 && loaded && <div className="w-full h-full flex items-center justify-center text-[#7A4A5E] text-sm">ลายเล็บยอดนิยม</div>}

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

          {/* ลูกศรวงกลมกระจกคร่อมขอบรูป */}
          <button type="button" onClick={() => step(-1)} disabled={count < 2} aria-label="ลายก่อนหน้า" className="glass-btn absolute -left-3 top-1/2 -translate-y-1/2 h-11 w-11">
            <Icon name="chevronLeft" />
          </button>
          <button type="button" onClick={() => step(1)} disabled={count < 2} aria-label="ลายถัดไป" className="glass-btn absolute -right-3 top-1/2 -translate-y-1/2 h-11 w-11">
            <Icon name="chevronRight" />
          </button>
        </div>

        <div className="lucky-z1 mt-3 flex items-center justify-between gap-3 pl-1">
          <p key={`name-${index}`} aria-live={playing ? 'off' : 'polite'} className="lucky-fade-up min-w-0 font-display font-semibold text-[#4A2A37] truncate">
            {current?.name || '\u00a0'}
          </p>
          {current && (
            <button type="button" onClick={bookCurrent} className="btn-candy shrink-0 px-4 py-2 text-sm">
              <Icon name="calendar" className="h-4 w-4" /> จองลายนี้
            </button>
          )}
        </div>

        {/* จุดบอกลำดับ: จุดปัจจุบันมีแถบนับเวลาไปภาพถัดไป */}
        {count > 1 && (
          <div className="lucky-z1 -mb-2 flex items-center justify-center">
            {designs.map((d, i) => {
              const active = i === index
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`ดูลายที่ ${i + 1}: ${d.name}`}
                  aria-current={active}
                  className="group/dot flex h-11 items-center justify-center px-1"
                >
                  <span className={`relative block h-2.5 rounded-full overflow-hidden border border-white transition-[width,background-color] duration-300 ${active ? 'w-9 bg-rose-100' : 'w-2.5 bg-white/80 group-hover/dot:bg-rose-100'}`}>
                    {active && (
                      <span
                        key={`p-${index}`}
                        className={`absolute inset-0 rounded-full bg-berry ${playing ? 'lucky-progress' : ''}`}
                        style={playing ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
                      />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
