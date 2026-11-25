import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

export default function MobileStickyBar() {
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-md border-t border-[#1f1b16]/[0.06] px-4 py-3 flex items-center gap-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <Link
        to="/ai"
        aria-label="ลองลายเล็บด้วย AI"
        className="btn-candy-soft flex-shrink-0 w-12 h-12 !p-0"
      >
        <Icon name="hand" className="h-5 w-5" />
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
