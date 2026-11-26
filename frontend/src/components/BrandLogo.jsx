// โลโก้ร้าน: ตราจริงของร้าน (สีทอง) + ชื่อ "Lucky" สีชมพู "Salon" สีเข้ม + บรรทัดรอง (ดีไซน์ใหม่ ขาวสะอาด)
// ใช้ร่วมกันทุกหน้า (หัวกระดาษ ท้ายเว็บ) ไฟล์ตรา: public/logo-mark-160.png (ย่อจาก logo-mark.png ต้นฉบับ 512px)
export default function BrandLogo({ subtitle = 'Hair & Nail Salon', size = 'md' }) {
  const word = size === 'sm' ? 'text-[1.45rem]' : 'text-[1.35rem] sm:text-[1.7rem]'
  const mark = size === 'sm' ? 'h-12 w-12' : 'h-11 w-11 sm:h-14 sm:w-14'
  return (
    <span className="inline-flex items-center gap-2.5 leading-none select-none">
      <img src="/logo-mark-160.png" alt="" aria-hidden="true" width="56" height="56" className={`${mark} shrink-0`} />
      <span className="inline-flex flex-col items-start gap-1">
        <span className={`font-semibold tracking-tight ${word}`}>
          <span className="text-[#D6336C]">Lucky</span> <span className="text-[#2E1F26]">Salon</span>
        </span>
        {subtitle && <span className="text-[12px] text-[#6B5560] whitespace-nowrap">{subtitle}</span>}
      </span>
    </span>
  )
}
