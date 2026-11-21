import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminMe, getAdminToken, setAdminToken } from '../../api/client.js'

// เมนูแบ่งเป็น 2 กลุ่ม: งานประจำวัน กับ ข้อมูลร้าน
const NAV = [
  { group: 'งานประจำวัน', items: [
    { to: '/admin', icon: '📊', label: 'ภาพรวม', end: true },
    { to: '/admin/bookings', icon: '📅', label: 'การจองคิว' },
    { to: '/admin/customers', icon: '👥', label: 'ลูกค้า' },
  ] },
  { group: 'ข้อมูลร้าน', items: [
    { to: '/admin/services', icon: '💇', label: 'บริการ' },
    { to: '/admin/designs', icon: '💅', label: 'ลายเล็บ' },
    { to: '/admin/reviews', icon: '⭐', label: 'รีวิว' },
    { to: '/admin/settings', icon: '⚙️', label: 'ตั้งค่าร้าน' },
  ] },
]
const ALL_ITEMS = NAV.flatMap((g) => g.items)
const ROLE_LABEL = { owner: 'เจ้าของร้าน', staff: 'พนักงาน' }

function todayThai() {
  return new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' })
}

export default function AdminLayout() {
  const [authState, setAuthState] = useState('checking') // checking | ok | fail
  const [admin, setAdmin] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!getAdminToken()) {
      setAuthState('fail')
      return
    }
    adminMe()
      .then((me) => {
        setAdmin(me)
        setAuthState('ok')
      })
      .catch(() => setAuthState('fail'))
  }, [])

  const isActive = (item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))
  const current = ALL_ITEMS.find(isActive)

  function handleLogout() {
    setAdminToken(null)
    navigate('/admin/login')
  }

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-blush-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blush-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    )
  }
  if (authState === 'fail') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blush-50 via-white to-violet-50/40 flex">
      <aside className="w-64 flex-shrink-0 hidden md:flex flex-col sticky top-0 h-screen bg-white/80 backdrop-blur border-r border-blush-200/70">
        <div className="px-6 pt-6 pb-5">
          <p className="flex items-center gap-2.5 font-display text-xl font-bold text-rose-600">
            <img src="/logo.jpg" alt="Lucky Salon" className="w-10 h-10 rounded-2xl object-cover shadow-card" />
            <span>Lucky<span className="text-gray-800"> Salon</span></span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1.5 tracking-wide">แผงควบคุมเจ้าของร้าน</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5" aria-label="เมนูแอดมิน">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold text-gray-400 tracking-wide">{g.group}</p>
              <div className="space-y-1">
                {g.items.map((item) => {
                  const active = isActive(item)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-[0_8px_18px_-8px_rgba(236,76,130,0.7)]'
                          : 'text-gray-600 hover:bg-blush-100 hover:text-rose-600'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${active ? 'bg-white/20' : 'bg-blush-50'}`} aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="m-3 p-3 rounded-2xl bg-gradient-to-br from-blush-50 to-violet-50 border border-blush-100">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-violet-400 text-white font-bold flex items-center justify-center">
              {(admin?.full_name || admin?.username || 'A').slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-700 truncate">{admin?.full_name || admin?.username}</p>
              <p className="text-[11px] text-gray-400">{ROLE_LABEL[admin?.role] || admin?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-sm font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-blush-200 rounded-xl py-2 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* มือถือ: แถบบนติดจอ + เมนูเลื่อนข้างที่บอกว่ากำลังอยู่หน้าไหน */}
        <div className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-blush-200/70">
          <header className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-rose-600">
              <img src="/logo.jpg" alt="" className="w-7 h-7 rounded-lg object-cover" />
              {current ? <span className="text-gray-800">{current.label}</span> : 'Lucky Salon'}
            </p>
            <button onClick={handleLogout} className="text-xs font-semibold text-rose-600 border border-blush-200 rounded-full px-3 py-1.5">ออกจากระบบ</button>
          </header>
          <nav className="px-3 pb-2.5 flex gap-1.5 overflow-x-auto" aria-label="เมนูแอดมิน">
            {ALL_ITEMS.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`text-xs font-semibold whitespace-nowrap px-3 py-2 rounded-full transition-colors ${
                    active ? 'bg-rose-500 text-white shadow' : 'bg-blush-50 text-gray-600'
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <main className="p-4 sm:p-8 max-w-6xl mx-auto">
          <p className="hidden md:block text-xs text-gray-400 mb-4">📆 {todayThai()}</p>
          <Outlet context={{ admin }} />
        </main>
      </div>
    </div>
  )
}
