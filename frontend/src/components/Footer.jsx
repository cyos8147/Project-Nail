import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getShopSettings } from '../api/client.js'

export default function Footer() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getShopSettings().then(setSettings).catch(() => {})
  }, [])

  return (
    <footer className="relative bg-white/70 backdrop-blur-sm border-t border-white/80 py-8">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 via-peach to-rose-400" />
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <p className="font-script text-3xl leading-none text-rose-600">Lucky Salon</p>
        <p className="text-center">
          © 2026 Lucky Salon. สงวนลิขสิทธิ์. ·{' '}
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
