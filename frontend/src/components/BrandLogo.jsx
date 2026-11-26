// โลโก้ร้าน: ตราจริงของร้าน (ผู้หญิงผมยาวในวงกลมใบไม้ สีทอง) + ชื่อ Lucky Salon ตัวเขียน + บรรทัดรอง
// ใช้ร่วมกันทุกหน้า (หัวกระดาษ ท้ายเว็บ) จะได้หน้าตาเหมือนกันทั้งเว็บ
// ไฟล์ตรา: public/logo-mark.png (ตัดพื้นหลังแล้ว) และ public/logo-full.png (มีชื่อร้านด้านล่าง)
export default function BrandLogo({ subtitle = 'Hair & Nail Salon', size = 'md' }) {
  const word = size === 'sm' ? 'text-[1.9rem]' : 'text-[1.8rem] sm:text-[2.2rem]'
  const mark = size === 'sm' ? 'h-12 w-12' : 'h-12 w-12 sm:h-14 sm:w-14'
  return (
    <span className="inline-flex items-center gap-2 leading-none select-none">
      <img src="/logo-mark.png" alt="" aria-hidden="true" width="56" height="56" className={`${mark} shrink-0 drop-shadow-[0_2px_4px_rgba(255,255,255,0.9)]`} />
      <span className="inline-flex flex-col items-start">
        <span className={`font-script ${word} text-[#D6336C] drop-shadow-[0_2px_0_rgba(255,255,255,0.9)]`}>Lucky Salon</span>
        {subtitle && (
          <span className="mt-0.5 ml-auto pr-1 text-[11px] text-[#7A4A5E] whitespace-nowrap">{subtitle}</span>
        )}
      </span>
    </span>
  )
}
