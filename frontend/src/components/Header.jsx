import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import Icon from './Icon.jsx'

// เมนูหลัก: ทุกลิงก์ชี้ไปที่เดิมเหมือนก่อนเปลี่ยนดีไซน์
const navItems = [
  { label: 'หน้าแรก', href: '/#home', icon: 'home', match: '/' },
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
  const { pathname } = useLocation()
  const pill = 'inline-flex items-center gap-1.5 rounded-full px-4 xl:px-3 py-2 text-sm xl:text-[13px] font-display font-semibold whitespace-nowrap transition-colors'

  return (
    <header className="sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* ม่านกระจกบาง ๆ ให้เมนูอ่านออกเมื่อเลื่อนทับเนื้อหา */}
      <div aria-hidden="true" className="absolute inset-0 bg-[#FCE6EE]/55 backdrop-blur-md [mask-image:linear-gradient(180deg,#000_70%,transparent)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap xl:flex-nowrap items-center justify-between gap-x-3 gap-y-2">
        <a href="/#home" className="pt-2 shrink-0" aria-label="Lucky Salon หน้าแรก">
          <BrandLogo />
        </a>

        {/* เมนูแคปซูลกระจก เมนูที่อยู่ตอนนี้เป็นปุ่มชมพูเต็ม */}
        <nav aria-label="เมนูหลัก" className="hidden lg:flex order-last basis-full justify-center xl:order-none xl:basis-auto">
          <div className="glass flex items-center gap-0.5 rounded-full p-1 whitespace-nowrap">
            {navItems.map((item) => {
              const active = item.match === pathname
              return (
                <NavLink
                  key={item.label}
                  item={item}
                  active={active}
                  className={`${pill} ${active ? 'text-white bg-gradient-to-b from-[#F88AB0] to-[#EC4C82] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_14px_-6px_rgba(201,51,106,0.7)]' : 'text-[#6E4255] hover:bg-white/70 hover:text-rose-600'}`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/history"
            className={`glass hidden md:inline-flex ${pill} ${pathname === '/history' ? 'text-rose-600' : 'text-[#6E4255] hover:text-rose-600'}`}
          >
            ประวัติของฉัน
          </Link>
          <Link
            to="/ai"
            className={`glass hidden sm:inline-flex ${pill} ${pathname === '/ai' ? 'text-rose-600' : 'text-[#6E4255] hover:text-rose-600'}`}
          >
            <Icon name="sparkle" className="h-4 w-4 text-rose-500" />
            AI วิเคราะห์ลายเล็บ
          </Link>
          <Link to="/booking" className="btn-candy text-sm xl:text-[13px] px-5 xl:px-4 py-2.5">
            <NavIcon name="calendar" />
            จองคิวเลย
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="เปิดเมนู"
            aria-expanded={menuOpen}
            className="glass-btn lg:hidden w-10 h-10 flex-shrink-0 flex-col gap-1.5"
          >
            <span className={`block w-4 h-0.5 bg-rose-600 rounded-full transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block w-4 h-0.5 bg-rose-600 rounded-full transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-4 h-0.5 bg-rose-600 rounded-full transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="เมนูมือถือ" className="glass-solid relative lg:hidden mx-4 mb-2 rounded-[24px] px-4 py-2 flex flex-col text-[15px] font-display font-semibold text-[#4A2A37]">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              active={item.match === pathname}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 py-3 border-b border-rose-100/80 last:border-0 hover:text-rose-600"
            >
              <NavIcon name={item.icon} className="h-[18px] w-[18px] text-rose-400" />
              {item.label}
            </NavLink>
          ))}
          <Link to="/history" onClick={() => setMenuOpen(false)} className="py-3 border-t border-rose-100/80 hover:text-rose-600 md:hidden">
            ประวัติของฉัน
          </Link>
          <Link to="/ai" onClick={() => setMenuOpen(false)} className="py-3 border-t border-rose-100/80 hover:text-rose-600 sm:hidden">
            AI วิเคราะห์ลายเล็บ
          </Link>
        </nav>
      )}
    </header>
  )
}
