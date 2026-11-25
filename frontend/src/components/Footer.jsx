import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getShopSettings } from '../api/client.js'
import BrandLogo from './BrandLogo.jsx'

export default function Footer() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getShopSettings().then(setSettings).catch(() => {})
  }, [])

  return (
    <footer className="relative mt-8 border-t border-white/80 bg-[#FFF5F8]/60 backdrop-blur-md py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#7A4A5E]">
        <BrandLogo size="sm" />
        <p className="text-center">
          © 2026 Lucky Salon. สงวนลิขสิทธิ์. ·{' '}
          <Link to="/gallery" className="underline decoration-blush-200 underline-offset-2 hover:text-rose-600 transition-colors">
            แกลเลอรี
          </Link>{' '}
          ·{' '}
          <Link to="/privacy" className="underline decoration-blush-200 underline-offset-2 hover:text-rose-600 transition-colors">
            นโยบายความเป็นส่วนตัว
          </Link>
        </p>
        <div className="flex items-center gap-4">
          {settings?.line_oa_basic_id && <span>Line: {settings.line_oa_basic_id}</span>}
          {settings?.phone && <span>โทร: {settings.phone}</span>}
        </div>
      </div>
    </footer>
  )
}
