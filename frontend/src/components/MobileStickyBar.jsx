import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

// แถบล่างบนมือถือ: ประวัติของฉัน (ลูกค้าประจำ) · ลองลายด้วย AI · จองคิว (ปุ่มหลักปุ่มเดียว)
export default function MobileStickyBar() {
  const side = 'glass-btn flex-shrink-0 h-12 flex-col gap-0.5 px-3 text-xs font-display font-semibold leading-none'
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#2E1F26]/[0.06] px-3 py-2.5 flex items-center gap-2"
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      <Link to="/history" className={side}>
        <Icon name="clock" className="h-5 w-5" />
        ประวัติ
      </Link>
      <Link to="/ai" aria-label="ลองสีบนมือคุณ" className={side}>
        <Icon name="hand" className="h-5 w-5" />
        ลองสี
      </Link>
      <Link to="/booking" className="btn-candy flex-1 py-3">
        <Icon name="calendar" className="h-5 w-5" />
        จองคิวเลย
      </Link>
    </div>
  )
}
