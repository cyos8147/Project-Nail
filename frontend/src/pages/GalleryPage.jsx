import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import MobileStickyBar from '../components/MobileStickyBar.jsx'
import DreamyBackground from '../components/DreamyBackground.jsx'
import NailThumb from '../components/NailThumb.jsx'
import { Bone, SlowNote, useSlow } from '../components/Skeleton.jsx'
import { getNailDesigns } from '../api/client.js'
import { saveCarryDesign } from '../utils/carryDesign.js'
import Icon from '../components/Icon.jsx'

// หน้าแกลเลอรีผลงานลายเล็บทั้งหมดของร้าน (ข้อมูลจากหน้าแอดมิน "ลายเล็บ")
// กดการ์ดเพื่อดูเต็มจอ เลื่อนด้วยลูกศร/คีย์บอร์ด/ปัด และกด "จองลายนี้" ไปหน้าจองพร้อมลายที่เลือก

const STYLE_LABEL = { minimal: 'มินิมอล', classic: 'คลาสสิก', bold: 'โดดเด่น' }
const SWIPE_PX = 50

const formatPrice = (p) => Number(p).toLocaleString('th-TH', { maximumFractionDigits: 0 })
function formatMinutes(m) {
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} นาที`
  return r ? `${h} ชม. ${r} นาที` : `${h} ชม.`
}

function DesignImage({ design, className = '' }) {
  return design.image_url ? (
    <img src={design.image_url} alt={design.name} loading="lazy" decoding="async" draggable="false" className={`object-cover ${className}`} />
  ) : (
    <div className={className}>
      <NailThumb label={design.name} accent={design.color_hex || '#F9A8C9'} />
    </div>
  )
}

function Lightbox({ designs, index, onClose, onStep, onBook }) {
  const closeRef = useRef(null)
  const startX = useRef(null)
  const d = designs[index]

  useEffect(() => {
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // ล็อกการเลื่อนหน้าข้างหลัง
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onStep(1)
      else if (e.key === 'ArrowLeft') onStep(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, onStep])

  if (!d) return null
  const many = designs.length > 1

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`ลายเล็บ ${d.name}`}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
      style={{ background: 'radial-gradient(60rem 40rem at 50% 30%, rgba(74,23,48,0.82), rgba(40,10,26,0.92))' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-3xl">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="ปิด" className="btn-candy-soft absolute -top-3 -right-1 sm:-right-3 z-10 w-11 h-11 !p-0 text-xl">
          ✕
        </button>

        <div
          className="relative overflow-hidden rounded-[2rem] border-4 border-white bg-rose-50 shadow-2xl select-none"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={(e) => (startX.current = e.clientX)}
          onPointerUp={(e) => {
            if (startX.current == null) return
            const dx = e.clientX - startX.current
            startX.current = null
            if (Math.abs(dx) >= SWIPE_PX) onStep(dx < 0 ? 1 : -1)
          }}
        >
          <div key={d.id} className="lucky-flip-in">
            <DesignImage design={d} className="block w-full max-h-[62vh] aspect-[4/3] h-auto" />
          </div>
          {many && (
            <span className="absolute top-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs font-display font-semibold text-rose-600 tabular-nums">
              {index + 1} / {designs.length}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white/95 p-4 sm:px-6">
          <div className="min-w-0">
            <p className="font-display text-lg sm:text-xl font-semibold text-gray-800 truncate">{d.name}</p>
            <p className="text-sm text-gray-500">
              {STYLE_LABEL[d.style_tag] || d.style_tag} · {formatMinutes(d.duration_minutes)} ·{' '}
              <span className="font-display font-semibold text-rose-600 tabular-nums">{formatPrice(d.price)} บาท</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {many && (
              <button type="button" onClick={() => onStep(-1)} aria-label="ลายก่อนหน้า" className="btn-candy-soft w-11 h-11 !p-0 text-xl">
                ‹
              </button>
            )}
            <button type="button" onClick={() => onBook(d)} className="btn-candy px-6 py-3">
              <Icon name="calendar" /> จองลายนี้
            </button>
            {many && (
              <button type="button" onClick={() => onStep(1)} aria-label="ลายถัดไป" className="btn-candy-soft w-11 h-11 !p-0 text-xl">
                ›
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function GalleryPage() {
  const navigate = useNavigate()
  const [designs, setDesigns] = useState(null) // null = กำลังโหลด
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState('all')
  const [openIndex, setOpenIndex] = useState(null)
  const lastTrigger = useRef(null)
  const slow = useSlow(designs === null)

  useEffect(() => {
    document.title = 'แกลเลอรีลายเล็บ | Lucky Salon'
    getNailDesigns()
      .then((data) => setDesigns((data || []).filter((d) => d.active !== false)))
      .catch(() => {
        setFailed(true)
        setDesigns([])
      })
    return () => {
      document.title = 'Lucky Salon | จองคิวร้านเสริมสวย'
    }
  }, [])

  const tags = useMemo(() => [...new Set((designs || []).map((d) => d.style_tag).filter(Boolean))], [designs])
  const shown = useMemo(
    () => (designs || []).filter((d) => filter === 'all' || d.style_tag === filter).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)),
    [designs, filter],
  )

  const open = (i, el) => {
    lastTrigger.current = el
    setOpenIndex(i)
  }
  const close = useCallback(() => {
    setOpenIndex(null)
    lastTrigger.current?.focus() // คืนโฟกัสให้การ์ดที่กดเปิด
  }, [])
  const step = useCallback((delta) => setOpenIndex((i) => (i == null ? i : (i + delta + shown.length) % shown.length)), [shown.length])

  function book(d) {
    saveCarryDesign({ source: 'design', nail_design_id: d.id, nail_design_name: d.name, color_hex: d.color_hex, summary: d.name })
    navigate('/booking')
  }

  return (
    <div className="relative isolate min-h-screen text-gray-800 pb-20 md:pb-0 overflow-x-clip">
      <DreamyBackground />
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center">
          <h1 className="lucky-fade-up font-display text-3xl/[1.4] sm:text-4xl/[1.4] font-semibold text-gray-800">
            ผลงานลายเล็บของร้าน
          </h1>
          <p className="lucky-fade-up text-gray-600 mt-2" style={{ animationDelay: '0.06s' }}>
            กดที่รูปเพื่อดูเต็มจอ ชอบลายไหนกดจองได้เลย
          </p>
        </div>

        {tags.length > 1 && (
          <div role="group" aria-label="กรองตามสไตล์" className="mt-8 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap sm:justify-center pb-1 [scrollbar-width:none]">
            {['all', ...tags].map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={filter === t}
                onClick={() => setFilter(t)}
                className={`shrink-0 px-5 py-2 text-sm ${filter === t ? 'btn-candy' : 'btn-candy-soft'}`}
              >
                {t === 'all' ? `ทั้งหมด (${designs.length})` : STYLE_LABEL[t] || t}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5" aria-busy={designs === null}>
          {designs === null &&
            Array.from({ length: 8 }, (_, i) => (
              <div key={i} aria-hidden="true" className="rounded-[24px] glass p-2">
                <Bone className="aspect-square !rounded-[1.2rem]" />
                <div className="p-2 space-y-2">
                  <Bone className="h-4 w-3/4" />
                  <Bone className="h-3 w-1/3" />
                </div>
              </div>
            ))}

          {shown.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={(e) => open(i, e.currentTarget)}
              aria-label={`ดูลาย ${d.name} เต็มจอ`}
              className="lucky-fade-up group text-left rounded-[24px] glass p-2 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-rose-300"
              style={{ animationDelay: `${Math.min(i, 5) * 0.06}s` }}
            >
              <div className="relative aspect-square overflow-hidden rounded-[12px]">
                <DesignImage design={d} className="w-full h-full transition-opacity duration-150 group-hover:opacity-90" />
                <span aria-hidden="true" className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-display font-semibold text-rose-600 opacity-0 transition-opacity group-hover:opacity-100">
                  ดูเต็มจอ ⤢
                </span>
              </div>
              <div className="px-2 pt-2.5 pb-1">
                <p className="font-display font-semibold text-gray-800 truncate">{d.name}</p>
                <p className="text-sm">
                  <span className="text-gray-500">{STYLE_LABEL[d.style_tag] || d.style_tag}</span>
                  <span className="float-right font-display font-semibold text-rose-600 tabular-nums">{formatPrice(d.price)} บาท</span>
                </p>
              </div>
            </button>
          ))}
        </div>

        <SlowNote show={slow} />
        {designs && designs.length === 0 && (
          <p className="mt-10 text-center text-gray-500">
            {failed ? 'โหลดผลงานไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง' : 'ยังไม่มีผลงานในแกลเลอรี'}
          </p>
        )}

        <div className="mt-12 text-center">
          <Link to="/booking" className="btn-candy px-10 py-3.5 text-lg">
            <Icon name="calendar" /> จองคิวเลย
          </Link>
        </div>
      </main>

      <Footer />
      <MobileStickyBar />

      {openIndex != null && <Lightbox designs={shown} index={openIndex} onClose={close} onStep={step} onBook={book} />}
    </div>
  )
}
