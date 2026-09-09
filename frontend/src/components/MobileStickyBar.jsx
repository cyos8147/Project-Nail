import { Link } from 'react-router-dom'

export default function MobileStickyBar() {
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-blush-200 px-4 py-3 flex items-center gap-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <Link
        to="/ai"
        aria-label="ลองลายเล็บด้วย AI"
        className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-blush-100 text-xl"
      >
        ✨
      </Link>
      <Link
        to="/booking"
        className="flex-1 text-center bg-rose-500 active:bg-rose-600 text-white font-semibold py-3 rounded-full shadow-card transition-colors"
      >
        จองคิวเลย
      </Link>
    </div>
  )
}
