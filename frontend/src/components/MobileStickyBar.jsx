import { Link } from 'react-router-dom'

export default function MobileStickyBar() {
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-t-2 border-white px-4 py-3 flex items-center gap-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <Link
        to="/ai"
        aria-label="ลองลายเล็บด้วย AI"
        className="btn-candy-soft flex-shrink-0 w-12 h-12 !p-0 text-xl"
      >
        ✨
      </Link>
      <Link
        to="/booking"
        className="btn-candy flex-1 py-3"
      >
        จองคิวเลย
      </Link>
    </div>
  )
}
