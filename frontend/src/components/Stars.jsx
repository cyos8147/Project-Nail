// ดาวรีวิวแบบทึบ (SVG) ใช้แทนตัวอักษร ★ ให้หน้าตาเหมือนกันทุกเครื่อง
const STAR = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z'

export function Star({ filled = true, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${filled ? 'text-rose-500' : 'text-rose-200'}`} aria-hidden="true">
      <path d={STAR} fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  )
}

export default function Stars({ count, className = 'h-4 w-4' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${count} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= count} className={className} />
      ))}
    </span>
  )
}
