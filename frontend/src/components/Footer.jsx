import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getShopSettings } from '../api/client.js'
import BrandLogo from './BrandLogo.jsx'
import Icon from './Icon.jsx'
import { RibbonSwoosh } from './Decor.jsx'

const QUICK_LINKS = [
  { label: 'จองคิว', to: '/booking', icon: 'calendar' },
  { label: 'แกลเลอรี', to: '/gallery', icon: 'palette' },
  { label: 'ประวัติของฉัน', to: '/history', icon: 'clock' },
  { label: 'ติดต่อร้าน', href: '/#contact', icon: 'chat' },
]

export default function Footer() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getShopSettings().then(setSettings).catch(() => {})
  }, [])

  const lineId = settings?.line_oa_basic_id?.trim()
  const phone = settings?.phone?.trim()
  const linkCls = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[#6E4255] transition-colors hover:bg-white/70 hover:text-rose-600'

  return (
    <footer className="relative mt-12 overflow-hidden border-t border-white/80 bg-[#FFF5F8]/65 backdrop-blur-md">
      {/* ริบบิ้นบาง ๆ คั่นด้านบนของท้ายเว็บ */}
      <RibbonSwoosh className="pointer-events-none absolute -top-24 left-1/2 w-[46rem] -translate-x-1/2 opacity-45" style={{ rotate: '180deg' }} />
      <div className="relative max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex flex-col items-center md:items-start gap-2">
          <BrandLogo size="sm" />
          <p className="text-sm text-[#7A4A5E]">ร้านทำผม ทำเล็บ จองคิวออนไลน์ได้ตลอด</p>
        </div>

        <nav aria-label="ลิงก์ท้ายเว็บ" className="flex flex-wrap justify-center md:justify-end gap-1 text-sm font-display font-semibold">
          {QUICK_LINKS.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className={linkCls}>
                <Icon name={l.icon} className="h-4 w-4 text-rose-400" /> {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} className={linkCls}>
                <Icon name={l.icon} className="h-4 w-4 text-rose-400" /> {l.label}
              </a>
            ),
          )}
        </nav>
      </div>

      <div className="relative border-t border-white/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#7A4A5E]">
          <p>
            © 2026 Lucky Salon ·{' '}
            <Link to="/privacy" className="underline decoration-rose-200 underline-offset-2 hover:text-rose-600 transition-colors">
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>
          {(lineId || phone) && (
            <p className="flex items-center gap-4 tabular-nums">
              {lineId && <span>LINE {lineId}</span>}
              {phone && <span>โทร {phone}</span>}
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}
