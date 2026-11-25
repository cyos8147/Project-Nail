import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'

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

function NavIcon({ name, className = 'h-[18px] w-[18px]' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d={ICON_PATHS[name]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  const linkClass = (active) =>
    `relative py-2 transition-colors ${active ? 'text-rose-600 font-bold' : 'text-gray-700 hover:text-rose-600'}`

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#1f1b16]/[0.06] shadow-hair">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <a href="/#home" className="pt-2" aria-label="Lucky Salon หน้าแรก">
          <BrandLogo />
        </a>

        {/* เมนูใหญ่บนเดสก์ท็อป เด่นชัด เป็นแคปซูลสีชมพู */}
        <nav aria-label="เมนูหลัก" className="hidden lg:flex order-last basis-full justify-center min-[1150px]:order-none min-[1150px]:basis-auto">
          <div className="flex items-center gap-0.5 bg-white/70 rounded-full border border-[#1f1b16]/[0.06] px-1 py-1 text-sm min-[1150px]:text-[13px] font-display font-semibold whitespace-nowrap">
          {navItems.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`${linkClass(pathname === item.to)} inline-flex items-center gap-1 px-3 min-[1150px]:px-2.5 rounded-full hover:bg-rose-50`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className={`${linkClass(false)} inline-flex items-center gap-1 px-3 min-[1150px]:px-2.5 rounded-full hover:bg-rose-50`}>
                <NavIcon name={item.icon} />
                {item.label}
              </a>
            ),
          )}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/history"
            className={`hidden md:inline-flex px-2 py-2 text-sm font-display font-semibold transition-colors ${pathname === '/history' ? 'text-rose-600' : 'text-gray-600 hover:text-rose-600'}`}
          >
            ประวัติของฉัน
          </Link>
          <Link
            to="/ai"
            className="hidden sm:inline-flex px-2 py-2 text-sm font-display font-semibold text-gray-600 hover:text-rose-600 transition-colors"
          >
            AI วิเคราะห์ลายเล็บ
          </Link>
          <Link
            to="/booking"
            className="btn-candy text-sm min-[1150px]:text-[13px] px-4 py-2.5"
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
                <NavIcon name={item.icon} className="h-[18px] w-[18px] text-gray-500" />
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 border-b border-rose-50 hover:text-rose-600">
                <NavIcon name={item.icon} className="h-[18px] w-[18px] text-gray-500" />
                {item.label}
              </a>
            ),
          )}
          <Link to="/history" onClick={() => setMenuOpen(false)} className="py-3 border-b border-rose-50 hover:text-rose-600 md:hidden">
            ประวัติของฉัน
          </Link>
          <Link to="/ai" onClick={() => setMenuOpen(false)} className="py-3 hover:text-rose-600 sm:hidden">
            AI วิเคราะห์ลายเล็บ
          </Link>
        </nav>
      )}
    </header>
  )
}
