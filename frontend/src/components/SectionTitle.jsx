import { Sparkle } from './Decor.jsx'

// หัวข้อของแต่ละส่วนในหน้าแรก: ประกายชมพูหน้า-หลังหัวข้อ เข้าชุดกับการ์ด "ลองเลือกสีที่ชอบ"
export default function SectionTitle({ title, sub, className = 'mb-8' }) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="inline-flex items-center gap-2.5 font-display text-3xl/[1.4] font-semibold text-[#4A2A37] [text-shadow:0_2px_0_rgba(255,255,255,0.7)]">
        <Sparkle className="h-6 w-6 shrink-0 text-rose-400" />
        {title}
        <Sparkle className="h-4 w-4 shrink-0 -translate-y-2 text-rose-300" />
      </h2>
      {sub && <p className="mt-1 text-[#7A4A5E]">{sub}</p>}
    </div>
  )
}
