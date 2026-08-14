import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="relative bg-white border-t border-blush-200 py-8">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 via-peach to-rose-400" />
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <p className="font-display font-bold text-rose-600">
          Nail<span className="text-gray-800">Glow</span>
        </p>
        <p>© 2026 NailGlow Salon. สงวนลิขสิทธิ์.</p>
        <div className="flex items-center gap-4">
          <span>Line: @nailglow</span>
          <span>โทร: 02-123-4567</span>
          <Link to="/admin/login" className="text-gray-300 hover:text-rose-500 transition-colors">
            สำหรับเจ้าของร้าน
          </Link>
        </div>
      </div>
    </footer>
  )
}
