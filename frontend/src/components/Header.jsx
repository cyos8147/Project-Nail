import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

// เมนูหลัก: ทุกลิงก์ชี้ไปที่เดิมเหมือนก่อนเปลี่ยนดีไซน์
const navItems = [
  { label: 'หน้าแรก', href: '/#home', icon: 'home' },
  { label: 'จองคิว', to: '/booking', icon: 'calendar' },
  { label: 'ลายเล็บ', href: '/#popular', icon: 'image' },
  { label: 'บริการ', href: '/#services', icon: 'star' },
  { label: 'รีวิว', href: '/#reviews', icon: 'chat' },
  { label: 'ติดต่อ', href: '/#contact', icon: 'pin' },
]

const ICON_PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  calendar: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  chat: 'M4 5h16v11H9l-5 4z',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
}

function NavIcon({ name, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d={ICON_PATHS[name]} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  const linkClass = (active) =>
    `relative py-2 transition-colors ${active ? 'text-rose-600 font-bold' : 'text-gray-700 hover:text-rose-600'}`

  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/70 shadow-[0_8px_30px_-18px_rgba(217,59,114,0.45)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <a href="/#home" className="flex items-baseline gap-1 whitespace-nowrap" aria-label="Lucky Salon หน้าแรก">
          <span className="font-script text-4xl leading-none text-rose-600">Lucky Salon</span>
                  </a>

        {/* เมนูใหญ่บนเดสก์ท็อป เด่นชัด เป็นแคปซูลสีชมพู */}
        <nav aria-label="เมนูหลัก" className="hidden lg:flex order-last basis-full justify-center">
          <div className="flex items-center gap-1 bg-white/90 rounded-full border border-white shadow-card px-2 py-1.5 text-[15px] font-semibold whitespace-nowrap">
          {navItems.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`${linkClass(pathname === item.to)} inline-flex items-center gap-1.5 px-3.5 rounded-full hover:bg-rose-50`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className={`${linkClass(false)} inline-flex items-center gap-1.5 px-3.5 rounded-full hover:bg-rose-50`}>
                <NavIcon name={item.icon} />
                {item.label}
              </a>
            ),
          )}
          </div>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/history"
            className={`hidden md:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full border transition-colors whitespace-nowrap ${
              pathname === '/history'
                ? 'bg-rose-500 border-rose-500 text-white'
                : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50'
            }`}
          >
            ประวัติของฉัน
          </Link>
          <Link
            to="/ai"
            className="hidden sm:inline-flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-600 text-sm font-semibold px-4 py-2.5 rounded-full border border-rose-200 transition-colors whitespace-nowrap"
          >
            ✨ AI วิเคราะห์ลายเล็บ
          </Link>
          <Link
            to="/booking"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-card ring-2 ring-white/70 transition-colors whitespace-nowrap"
          >
            <NavIcon name="calendar" />
            จองคิวเลย
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="เปิดเมนู"
            aria-expanded={menuOpen}
            className="lg:hidden w-10 h-10 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-full bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <span className={`block w-4 h-0.5 bg-rose-600 rounded-full transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block w-4 h-0.5 bg-rose-600 rounded-full transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-4 h-0.5 bg-rose-600 rounded-full transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="เมนูมือถือ" className="lg:hidden border-t border-rose-100 bg-white px-4 py-3 flex flex-col text-[15px] font-semibold text-gray-700">
          {navItems.map((item) =>
            item.to ? (
              <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 border-b border-rose-50 hover:text-rose-600">
                <NavIcon name={item.icon} className="h-5 w-5 text-rose-500" />
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 border-b border-rose-50 hover:text-rose-600">
                <NavIcon name={item.icon} className="h-5 w-5 text-rose-500" />
                {item.label}
              </a>
            ),
          )}
          <Link to="/history" onClick={() => setMenuOpen(false)} className="py-3 border-b border-rose-50 hover:text-rose-600 md:hidden">
            ประวัติของฉัน
          </Link>
          <Link to="/ai" onClick={() => setMenuOpen(false)} className="py-3 text-rose-600 sm:hidden">
            ✨ AI วิเคราะห์ลายเล็บ
          </Link>
        </nav>
      )}
    </header>
  )
}
