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
    <div className="flex h-20 w-24 sm:h-24 sm:w-32 lg:h-28 lg:w-36 shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-rose-100 via-pink-50 to-white text-3xl ring-2 ring-white shadow-[0_6px_14px_-8px_rgba(217,59,114,0.5)]">
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
  const price = (
    <>
      <span className="font-display font-bold text-rose-500">{formatPrice(service.price)}</span>
      <span className="ml-1 text-sm font-semibold text-rose-500">บาท</span>
    </>
  )
  return (
    <li
      className="group relative flex items-center gap-3 sm:gap-4 rounded-[1.6rem] border-2 border-white/90 p-2.5 pr-3 sm:p-3 sm:pr-4 shadow-[0_12px_28px_-14px_rgba(217,59,114,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm transition-transform hover:-translate-y-0.5"
      style={{ background: 'linear-gradient(135deg, rgba(255,244,248,0.85) 0%, rgba(252,220,233,0.6) 100%)' }}
    >
      <Thumb src={service.image_url} icon={icon} name={name} />
      <div className="min-w-0 flex-1">
        <h3 className="font-display font-bold leading-snug text-gray-800 line-clamp-2 text-base sm:text-lg">{name}</h3>
        {description && description !== name && (
          <p className="mt-0.5 line-clamp-2 text-xs sm:text-sm text-gray-500">{description}</p>
        )}
        {duration && (
          <p className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm text-gray-500">
            <ClockIcon />
            {duration}
          </p>
        )}
        <p className="mt-1 lg:hidden text-xs text-gray-500">
          เริ่มต้น <span className="text-lg">{price}</span>
        </p>
      </div>
      <div className="hidden lg:block shrink-0 text-right">
        <p className="text-xs leading-none text-gray-500">เริ่มต้น</p>
        <p className="mt-1.5 whitespace-nowrap leading-none text-2xl">{price}</p>
      </div>
      <Link
        to={`/booking?service=${encodeURIComponent(service.id)}`}
        aria-label={`จอง ${name}`}
        className="btn-candy-soft h-10 w-10 shrink-0 !p-0"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
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
    <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
      <div className="text-center mb-8">
        <p className="font-script text-4xl text-rose-500">Our Services</p>
        <h2 className="font-display text-3xl font-bold text-gray-800 mt-1">บริการของร้าน</h2>
        <p className="text-gray-500 mt-2">เลือกหมวดที่สนใจ แล้วจองคิวได้ทันที</p>
      </div>

      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label="หมวดบริการ"
          className="mx-auto mb-8 flex w-full max-w-lg gap-2 rounded-full border-2 border-white bg-white/55 p-2 shadow-[0_8px_24px_-12px_rgba(217,59,114,0.5)] backdrop-blur-sm"
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
                className={`flex-1 px-4 py-2.5 text-base ${
                  selected ? 'btn-candy' : 'btn-candy-soft !border-transparent !shadow-none !bg-transparent hover:!bg-white/70 !text-gray-700'
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
              className="btn-candy-soft px-6 py-2.5 text-sm"
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
          className="btn-candy px-10 py-3.5 text-lg"
        >
          <span aria-hidden="true">📅</span>
          จองคิวเลย
          <span aria-hidden="true">›</span>
        </Link>
      </div>
    </section>
  )
}
