import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getServiceCategories, getServices } from '../api/client.js'

const FALLBACK_CATEGORIES = [
  { id: 'hair', name: 'ทำผม', icon: '💇‍♀️' },
  { id: 'nail', name: 'ทำเล็บ', icon: '💅' },
]

const FALLBACK_SERVICES = [
  { id: 'f1', category_id: 'nail', name: 'ทำสีเจล', description: 'สีเจลคุณภาพ ทนนาน เงางาม', price: 350, duration_minutes: 60 },
  { id: 'f2', category_id: 'nail', name: 'เพ้นท์ลาย', description: 'ลายมือ ลายสติกเกอร์ ลายพิเศษ', price: 200, duration_minutes: 45 },
  { id: 'f3', category_id: 'nail', name: 'ต่อเล็บ PVC / เจล', description: 'ต่อเล็บทรงสวย เหมาะกับทุกมือ', price: 600, duration_minutes: 90 },
  { id: 'f4', category_id: 'nail', name: 'ดูแลผิวมือ & เท้า', description: 'ขัดผิว พอกมือ ผ่อนคลาย', price: 300, duration_minutes: 30 },
]

// หมวดที่รายการเยอะมากจะโชว์แค่ส่วนแรก แล้วให้กดดูทั้งหมดเอง
const COLLAPSE_OVER = 10
const COLLAPSED_COUNT = 8

function formatPrice(price) {
  return Number(price).toLocaleString('th-TH', { maximumFractionDigits: 2 })
}

function formatDuration(minutes) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} นาที`
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}

function Thumb({ src, icon, name }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex h-20 w-20 sm:h-28 sm:w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-rose-100 via-pink-100 to-white text-3xl ring-1 ring-white/80">
      {src && !failed ? (
        <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{icon}</span>
      )}
    </div>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ServiceRow({ service, icon }) {
  const name = service.name.trim()
  const description = service.description?.trim()
  const duration = formatDuration(service.duration_minutes)
  return (
    <li className="group flex items-center gap-3 sm:gap-4 rounded-[1.75rem] border border-white/80 bg-white/60 p-2.5 pr-3 sm:p-3 sm:pr-4 shadow-[0_12px_30px_-16px_rgba(217,59,114,0.45)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/80">
      <Thumb src={service.image_url} icon={icon} name={name} />
      <div className="min-w-0 flex-1">
        <h3 className="font-bold leading-snug text-gray-800 line-clamp-2 sm:text-lg">{name}</h3>
        {description && description !== name && (
          <p className="mt-0.5 line-clamp-2 text-xs sm:text-sm text-gray-500">{description}</p>
        )}
        {duration && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
            <ClockIcon />
            {duration}
          </p>
        )}
        <p className="mt-1.5 sm:hidden text-sm text-gray-500">
          เริ่มต้น <span className="text-lg font-bold text-rose-600">{formatPrice(service.price)}</span>
          <span className="ml-0.5 text-xs font-semibold text-rose-600">บาท</span>
        </p>
      </div>
      <div className="hidden sm:block shrink-0 text-right">
        <p className="text-[11px] leading-none text-gray-500">เริ่มต้น</p>
        <p className="mt-1 font-bold leading-none text-rose-600 text-lg sm:text-2xl">
          {formatPrice(service.price)}
          <span className="ml-0.5 text-xs sm:text-sm font-semibold">บาท</span>
        </p>
      </div>
      <Link
        to={`/booking?service=${encodeURIComponent(service.id)}`}
        aria-label={`จอง ${name}`}
        className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-pink-200 text-rose-600 shadow-sm ring-1 ring-white transition group-hover:from-rose-500 group-hover:to-pink-500 group-hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </li>
  )
}

export default function Services() {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [services, setServices] = useState(FALLBACK_SERVICES)
  const [activeId, setActiveId] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const tabRefs = useRef({})

  useEffect(() => {
    let alive = true
    // ถ้าเรียก backend ไม่สำเร็จ ใช้ข้อมูลตั้งต้นด้านบนต่อไป
    Promise.allSettled([getServiceCategories(), getServices()]).then(([cats, svcs]) => {
      if (!alive) return
      if (cats.status === 'fulfilled' && cats.value?.length) setCategories(cats.value)
      if (svcs.status === 'fulfilled' && svcs.value?.length) setServices(svcs.value)
    })
    return () => {
      alive = false
    }
  }, [])

  const tabs = categories
    .map((c) => ({ ...c, items: services.filter((s) => s.category_id === c.id) }))
    .filter((t) => t.items.length > 0)
  const active = tabs.find((t) => t.id === activeId) || tabs[0]
  if (!active) return null

  const collapsible = active.items.length > COLLAPSE_OVER
  const visible = collapsible && !expanded ? active.items.slice(0, COLLAPSED_COUNT) : active.items

  function selectTab(id) {
    setActiveId(id)
    setExpanded(false)
  }

  function onTabKeyDown(e, index) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = tabs[(index + step + tabs.length) % tabs.length]
    selectTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <section id="services" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
      <div className="text-center mb-8">
        <p className="font-serif italic text-2xl text-rose-700">Our Services</p>
        <h2 className="font-display text-3xl font-bold text-gray-800 mt-1">บริการของร้าน</h2>
        <p className="text-gray-500 mt-2">เลือกหมวดที่สนใจ แล้วจองคิวได้ทันที</p>
      </div>

      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label="หมวดบริการ"
          className="mx-auto mb-8 flex w-full max-w-lg gap-1.5 rounded-full border border-white/80 bg-white/60 p-2 shadow-card backdrop-blur-sm"
        >
          {tabs.map((t, i) => {
            const selected = t.id === active.id
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el
                }}
                type="button"
                role="tab"
                id={`services-tab-${t.id}`}
                aria-selected={selected}
                aria-controls="services-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(t.id)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-base font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                  selected ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-card' : 'text-gray-700 hover:bg-white/70'
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.name}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    selected ? 'bg-white/25 text-white' : 'bg-blush-100 text-rose-600'
                  }`}
                >
                  {t.items.length}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div id="services-panel" role="tabpanel" aria-labelledby={`services-tab-${active.id}`}>
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((s) => (
            <ServiceRow key={s.id} service={s} icon={active.icon} />
          ))}
        </ul>

        {collapsible && (
          <div className="mt-6 text-center">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-6 py-2.5 text-sm font-semibold text-rose-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              {expanded ? 'ย่อรายการ' : `ดูทั้งหมด ${active.items.length} รายการ`}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/booking"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-10 py-3.5 text-lg font-bold text-white shadow-[0_14px_30px_-12px_rgba(217,59,114,0.7)] ring-4 ring-white/60 transition-colors hover:from-rose-600 hover:to-pink-600"
        >
          <span aria-hidden="true">📅</span>
          จองคิวเลย
          <span aria-hidden="true">›</span>
        </Link>
      </div>
    </section>
  )
}
