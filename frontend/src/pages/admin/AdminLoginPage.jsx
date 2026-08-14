import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin, setAdminToken } from '../../api/client.js'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await adminLogin(username, password)
      setAdminToken(res.access_token)
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-blush-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-card p-8">
        <p className="font-display text-2xl font-bold text-rose-600 text-center mb-1">
          Nail<span className="text-gray-800">Glow</span>
        </p>
        <p className="text-center text-sm text-gray-500 mb-6">เข้าสู่ระบบสำหรับเจ้าของร้าน</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อผู้ใช้</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-blush-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-blush-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 text-white font-semibold py-3 rounded-full shadow-card transition-colors"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </form>
        <p className="text-[11px] text-gray-400 text-center mt-5">
          บัญชีเริ่มต้น: owner / changeme123 (ตั้งค่าได้ใน backend/.env — ดู docs/01_SETUP.md)
        </p>
      </div>
    </div>
  )
}
