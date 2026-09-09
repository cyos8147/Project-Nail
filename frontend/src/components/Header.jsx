import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { label: 'บริการ', href: '/#services' },
    { label: 'ลายเล็บยอดนิยม', href: '/#popular' },
    { label: 'โปรโมชั่น', href: '/#promotions' },
    { label: 'รีวิว', href: '/#reviews' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-blush-50/90 backdrop-blur border-b border-blush-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <a href="/#home" className="font-display text-2xl font-bold text-rose-600 whitespace-nowrap">
          Nail<span className="text-gray-800">Glow</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-rose-600 transition-colors">
              {link.label}
            </a>
          ))}
          <Link to="/status" className="hover:text-rose-600 transition-colors">ตรวจสอบคิว</Link>
          <Link to="/history" className="hover:text-rose-600 transition-colors">ประวัติของฉัน</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/ai"
            className="hidden sm:inline-flex items-center gap-1.5 bg-white hover:bg-blush-100 text-rose-600 text-sm font-semibold px-4 py-2.5 rounded-full border border-blush-200 transition-colors whitespace-nowrap"
          >
            ✨ AI วิเคราะห์ลายเล็บ
          </Link>
          <Link
            to="/booking"
            className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-card transition-colors whitespace-nowrap"
          >
            จองคิวเลย
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="เปิดเมนู"
            aria-expanded={menuOpen}
            className="md:hidden w-9 h-9 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-full hover:bg-blush-100 transition-colors"
          >
            <span className={`block w-4 h-0.5 bg-gray-600 rounded-full transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block w-4 h-0.5 bg-gray-600 rounded-full transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-4 h-0.5 bg-gray-600 rounded-full transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-blush-200 bg-blush-50 px-6 py-4 flex flex-col gap-1 text-sm font-medium text-gray-600">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="py-2.5 hover:text-rose-600 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link to="/status" onClick={() => setMenuOpen(false)} className="py-2.5 hover:text-rose-600 transition-colors">
            ตรวจสอบคิว
          </Link>
          <Link to="/history" onClick={() => setMenuOpen(false)} className="py-2.5 hover:text-rose-600 transition-colors">
            ประวัติของฉัน
          </Link>
          <Link to="/ai" onClick={() => setMenuOpen(false)} className="py-2.5 hover:text-rose-600 transition-colors sm:hidden">
            ✨ AI วิเคราะห์ลายเล็บ
          </Link>
        </nav>
      )}
    </header>
  )
}
