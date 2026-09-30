import { useEffect, useState } from 'react'
import { getShopSettings } from '../api/client.js'

// ลิงก์โซเชียลของร้าน ใส่เพิ่มได้ตรงนี้ เช่น { label: 'Facebook', href: 'https://facebook.com/ชื่อเพจ' }
// ถ้าปล่อยว่างไว้จะไม่แสดงส่วนนี้
const SOCIAL_LINKS = []

// closed_weekdays ใช้เลขแบบ JavaScript: 0=อาทิตย์ 1=จันทร์ ... 6=เสาร์ (ตรงกับหน้าตั้งค่าแอดมิน)
const DAYS_MON_FIRST = [
  { js: 1, name: 'จันทร์' },
  { js: 2, name: 'อังคาร' },
  { js: 3, name: 'พุธ' },
  { js: 4, name: 'พฤหัสบดี' },
  { js: 5, name: 'ศุกร์' },
  { js: 6, name: 'เสาร์' },
  { js: 0, name: 'อาทิตย์' },
]

// รวมวันที่ติดกันและเปิด/หยุดเหมือนกันเป็นบรรทัดเดียว เช่น "พุธ – อาทิตย์"
function groupDays(closedWeekdays) {
  const groups = []
  DAYS_MON_FIRST.forEach((d) => {
    const closed = closedWeekdays.includes(d.js)
    const last = groups[groups.length - 1]
    if (last && last.closed === closed) last.days.push(d.name)
    else groups.push({ closed, days: [d.name] })
  })
  return groups.map((g) => ({
    closed: g.closed,
    label:
      g.days.length === 7 ? 'ทุกวัน' : g.days.length === 1 ? g.days[0] : `${g.days[0]} – ${g.days[g.days.length - 1]}`,
  }))
}

const formatTime = (t) => String(t || '').slice(0, 5)

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      {children}
    </svg>
  )
}

const stroke = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ClockIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" {...stroke} />
    <path d="M12 7v5l3 2" {...stroke} />
  </Icon>
)
const PinIcon = () => (
  <Icon>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0C18.5 15.4 12 21 12 21z" {...stroke} />
    <circle cx="12" cy="10" r="2.3" {...stroke} />
  </Icon>
)
const PhoneIcon = () => (
  <Icon>
    <path
      d="M5 4h3l1.5 4-2 1.3a11 11 0 005.2 5.2L14 12.5l4 1.5v3a2 2 0 01-2 2A13 13 0 013 6a2 2 0 012-2z"
      {...stroke}
    />
  </Icon>
)
const ChatIcon = () => (
  <Icon>
    <path d="M4 5h16v11H9l-5 4V5z" {...stroke} />
  </Icon>
)

export default function ShopInfo() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let alive = true
    getShopSettings()
      .then((s) => {
        if (alive) setSettings(s)
      })
      .catch(() => {
        /* โหลดข้อมูลร้านไม่ได้ก็ไม่แสดงส่วนนี้ ดีกว่าโชว์เวลาเปิด-ปิดที่อาจไม่ตรงกับจริง */
      })
    return () => {
      alive = false
    }
  }, [])

  if (!settings) return null

  const address = settings.address?.trim()
  const phone = settings.phone?.trim()
  const lineId = settings.line_oa_basic_id?.trim()
  const hasContact = Boolean(address || phone || lineId || SOCIAL_LINKS.length)

  const groups = groupDays(settings.closed_weekdays || [])
  const hours = `${formatTime(settings.opening_time)} – ${formatTime(settings.closing_time)} น.`
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null
  const telUrl = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null
  const lineUrl = lineId
    ? `https://line.me/R/ti/p/${encodeURIComponent(lineId.startsWith('@') ? lineId : `@${lineId}`)}`
    : null

  return (
    <section id="contact" className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl font-bold text-gray-800">ที่ตั้งและเวลาทำการ</h2>
        <p className="text-gray-500 mt-2">แวะมาหาเราได้เลย หรือทักไลน์ถามก่อนก็ได้</p>
      </div>

      <div className={hasContact ? 'grid gap-5 md:grid-cols-2' : 'mx-auto max-w-md'}>
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <h3 className="flex items-center gap-2 font-semibold text-gray-800">
            <span className="text-rose-500">
              <ClockIcon />
            </span>
            เวลาทำการ
          </h3>
          <ul className="mt-4 divide-y divide-blush-100">
            {groups.map((g) => (
              <li key={g.label} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-gray-600">{g.label}</span>
                {g.closed ? (
                  <span className="rounded-full bg-blush-100 px-3 py-0.5 text-sm font-semibold text-rose-600">หยุด</span>
                ) : (
                  <span className="font-semibold tabular-nums text-gray-800">{hours}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {hasContact && (
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <span className="text-rose-500">
                <PinIcon />
              </span>
              ติดต่อและที่ตั้ง
            </h3>

            {address && <p className="mt-4 whitespace-pre-line leading-relaxed text-gray-600">{address}</p>}
            {phone && (
              <p className="mt-3 flex items-center gap-2 text-gray-600">
                <span className="text-rose-500">
                  <PhoneIcon />
                </span>
                {phone}
              </p>
            )}
            {lineId && (
              <p className="mt-2 flex items-center gap-2 text-gray-600">
                <span className="text-rose-500">
                  <ChatIcon />
                </span>
                LINE: {lineId}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-rose-600"
                >
                  <PinIcon />
                  เปิดแผนที่
                </a>
              )}
              {telUrl && (
                <a
                  href={telUrl}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-blush-100"
                >
                  <PhoneIcon />
                  โทรเลย
                </a>
              )}
              {lineUrl && (
                <a
                  href={lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#06C755] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#05b34c]"
                >
                  <ChatIcon />
                  ทักไลน์
                </a>
              )}
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-blush-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-blush-100"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
