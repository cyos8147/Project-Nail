import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminMe, getAdminToken, setAdminToken } from '../../api/client.js'

const NAV = [
  { to: '/admin', label: '📊 ภาพรวม', end: true },
  { to: '/admin/bookings', label: '📅 การจอง' },
  { to: '/admin/customers', label: '👥 ลูกค้า' },
  { to: '/admin/services', label: '💇 บริการ' },
  { to: '/admin/designs', label: '💅 ลายเล็บ' },
  { to: '/admin/reviews', label: '⭐ รีวิว' },
  { to: '/admin/settings', label: '⚙️ ตั้งค่าร้าน' },
]

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
    <div className="min-h-screen bg-blush-50 flex">
      <aside className="w-60 bg-white border-r border-blush-200 flex-shrink-0 hidden md:flex flex-col">
        <div className="px-6 py-5 border-b border-blush-100">
          <p className="font-display text-xl font-bold text-rose-600">
            Nail<span className="text-gray-800">Glow</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">แผงควบคุมเจ้าของร้าน</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-rose-500 text-white' : 'text-gray-600 hover:bg-blush-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-blush-100">
          <p className="text-xs text-gray-500 mb-2">{admin?.full_name} ({admin?.role})</p>
          <button
            onClick={handleLogout}
            className="w-full text-sm font-semibold text-rose-600 hover:bg-blush-100 rounded-xl py-2 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden bg-white border-b border-blush-200 px-4 py-3 flex items-center justify-between">
          <p className="font-display text-lg font-bold text-rose-600">NailGlow Admin</p>
          <button onClick={handleLogout} className="text-xs font-semibold text-rose-600">ออกจากระบบ</button>
        </header>
        <nav className="md:hidden bg-white border-b border-blush-200 px-4 py-2 flex gap-2 overflow-x-auto">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="text-xs font-medium text-gray-600 whitespace-nowrap px-3 py-1.5 rounded-full bg-blush-100">
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="p-4 sm:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
