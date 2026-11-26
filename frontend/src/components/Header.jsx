import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import Icon from './Icon.jsx'

// เมนูหลัก: ทุกลิงก์ชี้ไปที่เดิมเหมือนก่อนเปลี่ยนดีไซน์
const navItems = [
  { label: 'หน้าหลัก', href: '/#home', icon: 'home', match: '/' },
  { label: 'จองคิว', to: '/booking', icon: 'calendar', match: '/booking' },
  { label: 'ลายเล็บ', href: '/#popular', icon: 'image', match: '/gallery' },
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

function NavLink({ item, active, className, children, onClick }) {
  const props = { className, onClick, 'aria-current': active ? 'page' : undefined }
  return item.to ? (
    <Link to={item.to} {...props}>
      {children}
    </Link>
  ) : (
    <a href={item.href} {...props}>
      {children}
    </a>
  )
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtnRef = useRef(null)

  // กด Esc ปิดเมนูมือถือ แล้วคืนโฟกัสให้ปุ่มเมนู
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuBtnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#2E1F26]/[0.06]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <a href="/#home" className="shrink-0" aria-label="Lucky Salon หน้าหลัก">
          <BrandLogo />
        </a>

        {/* เมนูหลัก: ตัวหนังสือล้วนในกรอบมนบาง ๆ เมนูที่อยู่ตอนนี้เป็นสีชมพูมีเส้นใต้ */}
        <nav aria-label="เมนูหลัก" className="hidden xl:flex">
          <div className="flex items-center gap-1 rounded-full border border-[#2E1F26]/[0.07] bg-white px-3 py-1 whitespace-nowrap">
            {navItems.map((item) => {
              const active = item.match === pathname
              return (
                <NavLink
                  key={item.label}
                  item={item}
                  active={active}
                  className={`relative px-4 py-2.5 text-[15px] transition-colors ${active ? 'text-[#C2185B] font-semibold' : 'text-[#3A2A31] hover:text-[#C2185B]'}`}
                >
                  {item.label}
                  {active && <span aria-hidden="true" className="absolute left-3 right-3 -bottom-px h-[2px] rounded-full bg-[#D6336C]" />}
                </NavLink>
              )
            })}
          </div>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/history"
            className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm transition-colors ${pathname === '/history' ? 'border-[#F3B4CB] text-[#C2185B]' : 'border-[#2E1F26]/[0.1] text-[#3A2A31] hover:border-[#F3B4CB] hover:text-[#C2185B]'}`}
          >
            <Icon name="sparkle" className="h-4 w-4 text-[#E2A93B]" />
            ประวัติของฉัน
          </Link>
          <Link to="/booking" className="btn-candy hidden md:inline-flex text-sm px-6 py-3">
            <NavIcon name="calendar" />
            จองคิวเลย
          </Link>
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={menuOpen}
            className="w-11 h-11 flex-shrink-0 inline-flex flex-col items-center justify-center gap-1.5 rounded-full hover:bg-[#FFF1F6] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#F9A8C9]"
          >
            <span className={`block w-6 h-0.5 bg-[#D6336C] rounded-full transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#D6336C] rounded-full transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#D6336C] rounded-full transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <button type="button" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 cursor-default bg-[#2E1F26]/10" />
      )}
      {menuOpen && (
        <nav aria-label="เมนูมือถือ" className="glass-solid absolute right-4 left-4 sm:left-auto sm:w-80 top-full z-50 mt-2 rounded-[24px] px-4 py-2 flex flex-col text-[15px] text-[#3A2A31]">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              active={item.match === pathname}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 py-3 border-b border-[#2E1F26]/[0.06] last:border-0 hover:text-[#C2185B] ${item.match === pathname ? 'text-[#C2185B] font-semibold' : ''}`}
            >
              <NavIcon name={item.icon} className="h-[18px] w-[18px] text-[#E0457E]" />
              {item.label}
            </NavLink>
          ))}
          <Link to="/ai" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 border-t border-[#2E1F26]/[0.06] hover:text-[#C2185B]">
            <Icon name="hand" className="h-[18px] w-[18px] text-[#E0457E]" />
            ลองสีบนมือคุณ
          </Link>
          <Link to="/history" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 border-t border-[#2E1F26]/[0.06] hover:text-[#C2185B] md:hidden">
            <Icon name="clock" className="h-[18px] w-[18px] text-[#E0457E]" />
            ประวัติของฉัน
          </Link>
        </nav>
      )}
    </header>
  )
}
