import { Star } from './Stars.jsx'

// หัวข้อของแต่ละส่วนในหน้าลูกค้า: ดาวชมพูทึบหน้าหัวข้อ (ดีไซน์ใหม่ ขาวสะอาด)
export default function SectionTitle({ title, sub, className = 'mb-8' }) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="inline-flex items-center gap-3 text-3xl/[1.35] font-semibold text-[#2E1F26]">
        <Star className="h-7 w-7 shrink-0" />
        {title}
      </h2>
      {sub && <p className="mt-1 text-[#5B4650]">{sub}</p>}
    </div>
  )
}
