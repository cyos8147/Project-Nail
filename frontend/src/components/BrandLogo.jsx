// โลโก้ร้าน: ชื่อ Lucky Salon ตัวเขียน มีมงกุฎเล็ก ๆ และบรรทัดรองด้านล่าง
// ใช้ร่วมกันทุกหน้า (หัวกระดาษ ท้ายเว็บ) จะได้หน้าตาเหมือนกันทั้งเว็บ
export default function BrandLogo({ subtitle = 'Nail & Hair Salon', size = 'md' }) {
  const word = size === 'sm' ? 'text-[2rem]' : 'text-[1.9rem] sm:text-[2.3rem]'
  return (
    <span className="relative inline-flex flex-col items-start leading-none select-none">
      <span aria-hidden="true" className="absolute -top-2.5 left-[62%] text-[0.9rem] text-rose-400 rotate-[8deg]">
        ♛
      </span>
      <span className={`font-script ${word} text-rose-500 drop-shadow-[0_2px_0_rgba(255,255,255,0.9)]`}>Lucky Salon</span>
      {subtitle && (
        <span className="mt-0.5 ml-auto pr-1 text-[11px] text-gray-500 whitespace-nowrap">
          {subtitle}
        </span>
      )}
    </span>
  )
}
