import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

// เมนูหลัก: ทุกลิงก์ชี้ไปที่เดิมเหมือนก่อนเปลี่ยนดีไซน์
const navItems = [
  { label: 'หน้าแรก', href: '/#home' },
  { label: 'จองคิว', to: '/booking' },
  { label: 'ลายเล็บ', href: '/#popular' },
  { label: 'บริการ', href: '/#services' },
  { label: 'รีวิว', href: '/#reviews' },
  { label: 'ติดต่อ', href: '/#contact' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  const linkClass = (active) =>
    `relative py-2 transition-colors ${active ? 'text-rose-600 font-bold' : 'text-gray-700 hover:text-rose-600'}`

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100 shadow-[0_8px_30px_-18px_rgba(217,59,114,0.45)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <a href="/#home" className="flex items-baseline gap-1 whitespace-nowrap" aria-label="Lucky Salon หน้าแรก">
          <span className="font-script text-4xl leading-none text-rose-600">Lucky Salon</span>
                  </a>

        {/* เมนูใหญ่บนเดสก์ท็อป เด่นชัด เป็นแคปซูลสีชมพู */}
        <nav
          aria-label="เมนูหลัก"
          className="hidden lg:flex items-center gap-1 bg-white rounded-full border border-rose-100 shadow-card px-2 py-1.5 text-[15px] font-semibold"
        >
          {navItems.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`${linkClass(pathname === item.to)} px-4 rounded-full`}
              >
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className={`${linkClass(false)} px-4 rounded-full hover:bg-rose-50`}>
                {item.label}
              </a>
            ),
          )}
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
            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-card transition-colors whitespace-nowrap"
          >
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
              <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className="py-3 border-b border-rose-50 hover:text-rose-600">
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="py-3 border-b border-rose-50 hover:text-rose-600">
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
