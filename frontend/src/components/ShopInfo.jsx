import { useEffect, useState } from 'react'
import { getPublicHolidays, getShopSettings } from '../api/client.js'
import { longDate } from '../utils/dashboardFormat.js'
import { toWeekRows } from '../utils/shopHours.js'
import SectionTitle from './SectionTitle.jsx'
import { SatinBow } from './Decor.jsx'

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

// รวมวันที่ติดกันและเวลาเหมือนกัน (หรือหยุดเหมือนกัน) เป็นบรรทัดเดียว เช่น "จันทร์ – ศุกร์ 10:00 – 19:00"
// เวลาแยกรายวันมาจาก weekly_hours (ข้อ 4.2) วันที่ไม่ได้ตั้งใช้เวลาเริ่มต้นของร้าน
function groupDays(settings) {
  const rows = toWeekRows(settings)
  const groups = []
  DAYS_MON_FIRST.forEach((d) => {
    const r = rows[d.js]
    const hours = r.open ? `${r.openTime} – ${r.closeTime} น.` : null
    const last = groups[groups.length - 1]
    if (last && last.hours === hours) last.days.push(d.name)
    else groups.push({ closed: !r.open, hours, days: [d.name] })
  })
  return groups.map((g) => ({
    closed: g.closed,
    hours: g.hours,
    label:
      g.days.length === 7 ? 'ทุกวัน' : g.days.length === 1 ? g.days[0] : `${g.days[0]} – ${g.days[g.days.length - 1]}`,
  }))
}


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

const ContactHeading = () => <SectionTitle title="ที่ตั้งและเวลาทำการ" sub="แวะมาหาเราได้เลย หรือทักไลน์ถามก่อนก็ได้" />

export default function ShopInfo({ embedded = false }) {
  const sectionCls = embedded ? 'scroll-mt-24' : 'max-w-6xl mx-auto px-6 py-16 scroll-mt-16'
  const [settings, setSettings] = useState(null)
  const [failed, setFailed] = useState(false)
  const [holidays, setHolidays] = useState([]) // วันหยุดพิเศษที่ยังไม่ถึง (โหลดไม่ได้ก็ไม่เป็นไร แค่ไม่แสดงส่วนนี้)

  useEffect(() => {
    let alive = true
    getShopSettings()
      .then((s) => {
        if (alive) setSettings(s)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    getPublicHolidays()
      .then((list) => {
        if (alive && Array.isArray(list)) setHolidays(list)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // เปิดลิงก์ /#contact มาจากหน้าอื่น: ตอนเบราว์เซอร์หาหมวดนี้ หมวดด้านบนยังโหลดข้อมูลไม่เสร็จ ตำแหน่งจึงเลื่อนไป
  // พอข้อมูลร้านมาแล้วจึงเลื่อนลงมาที่นี่อีกครั้ง
  useEffect(() => {
    if ((settings || failed) && window.location.hash === '#contact') {
      document.getElementById('contact')?.scrollIntoView({ block: 'start' })
    }
  }, [settings, failed])

  // ยังไม่มีข้อมูลก็ต้องมีหมวดนี้ไว้ก่อน ไม่อย่างนั้นเมนู "ติดต่อ" กดแล้วไม่ไปไหน -- แต่ไม่เดาเวลาเปิด-ปิดให้
  // เพราะอาจไม่ตรงกับจริง
  if (!settings) {
    return (
      <section id="contact" className={sectionCls}>
        <ContactHeading />
        <p className="mx-auto max-w-md rounded-[24px] glass-solid p-6 text-center text-gray-500">
          {failed ? 'โหลดเวลาทำการไม่สำเร็จ รีเฟรชหน้านี้อีกครั้ง' : 'กำลังโหลดเวลาทำการและช่องทางติดต่อ...'}
        </p>
      </section>
    )
  }

  const address = settings.address?.trim()
  const phone = settings.phone?.trim()
  const lineId = settings.line_oa_basic_id?.trim()
  const hasContact = Boolean(address || phone || lineId || SOCIAL_LINKS.length)

  const groups = groupDays(settings)
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null
  const telUrl = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null
  const lineUrl = lineId
    ? `https://line.me/R/ti/p/${encodeURIComponent(lineId.startsWith('@') ? lineId : `@${lineId}`)}`
    : null

  return (
    <section id="contact" className={sectionCls}>
      <ContactHeading />

      <div className={hasContact ? `grid gap-5 ${embedded ? '' : 'md:grid-cols-2'}` : embedded ? '' : 'mx-auto max-w-md'}>
        <div className="relative rounded-[24px] glass-solid p-6">
          <SatinBow className="pointer-events-none absolute -top-7 -right-5 w-20 rotate-[16deg]" />
          <h3 className="flex items-center gap-2 font-semibold text-gray-800">
            <span className="text-rose-500">
              <ClockIcon />
            </span>
            เวลาทำการ
          </h3>
          <ul className="mt-4 divide-y divide-blush-100">
            {groups.map((g, i) => (
              <li key={`${g.label}-${i}`} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-gray-600">{g.label}</span>
                {g.closed ? (
                  <span className="rounded-full bg-blush-100 px-3 py-0.5 text-sm font-semibold text-rose-600">หยุด</span>
                ) : (
                  <span className="font-semibold tabular-nums text-gray-800">{g.hours}</span>
                )}
              </li>
            ))}
          </ul>
          {holidays.length > 0 && (
            <div className="mt-5 rounded-xl bg-blush-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">วันหยุดพิเศษที่ร้านแจ้งไว้</p>
              <ul className="mt-2 space-y-1.5">
                {holidays.slice(0, 8).map((h) => (
                  <li key={h.holiday_date} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium tabular-nums text-gray-700">{longDate(h.holiday_date)}</span>
                    <span className="text-right text-gray-500">{h.note || 'ร้านหยุด'}</span>
                  </li>
                ))}
              </ul>
              {holidays.length > 8 && <p className="mt-2 text-xs text-gray-500">และอีก {holidays.length - 8} วัน</p>}
              <p className="mt-2 text-xs text-gray-500">วันเหล่านี้จองคิวออนไลน์ไม่ได้</p>
            </div>
          )}
        </div>

        {hasContact && (
          <div className="rounded-[24px] glass-solid p-6">
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
                  className="btn-candy gap-1.5 px-5 py-2.5 text-sm"
                >
                  <PinIcon />
                  เปิดแผนที่
                </a>
              )}
              {telUrl && (
                <a
                  href={telUrl}
                  className="btn-candy-soft gap-1.5 px-5 py-2.5 text-sm"
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
                  className="btn-candy btn-line gap-1.5 px-5 py-2.5 text-sm"
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
