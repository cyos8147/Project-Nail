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

function Thumb({ src, icon }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blush-100 to-peach/60 text-2xl">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{icon}</span>
      )}
    </div>
  )
}

function ServiceRow({ service, icon }) {
  const name = service.name.trim()
  const description = service.description?.trim()
  const duration = formatDuration(service.duration_minutes)
  return (
    <li className="flex items-center gap-4 rounded-2xl bg-white p-3 pr-5 shadow-card ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-blush-200">
      <Thumb src={service.image_url} icon={icon} />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug text-gray-800">{name}</h3>
        {description && description !== name && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{description}</p>
        )}
        {duration && (
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {duration}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] leading-none text-gray-400">เริ่มต้น</p>
        <p className="mt-1 font-bold leading-none text-rose-600">
          {formatPrice(service.price)}
          <span className="ml-0.5 text-xs font-medium">บาท</span>
        </p>
      </div>
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
    <section id="services" className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-gray-800">บริการของร้าน</h2>
        <p className="text-gray-500 mt-2">เลือกหมวดที่สนใจ แล้วจองคิวได้ทันที</p>
      </div>

      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label="หมวดบริการ"
          className="mx-auto mb-8 flex w-full max-w-md gap-1 rounded-full border border-blush-200 bg-white p-1.5 shadow-card"
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
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                  selected ? 'bg-rose-500 text-white shadow-card' : 'text-gray-600 hover:bg-blush-100'
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
        <ul className="grid gap-3 md:grid-cols-2">
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
              className="inline-flex items-center gap-2 rounded-full border border-blush-200 bg-white px-6 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-blush-100"
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
          className="inline-block rounded-full bg-rose-500 px-8 py-3 font-semibold text-white shadow-card transition-colors hover:bg-rose-600"
        >
          จองคิวเลย
        </Link>
      </div>
    </section>
  )
}
