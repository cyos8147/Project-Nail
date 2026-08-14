// การ์ดตัวอย่างลายเล็บแบบยังไม่มีรูปถ่ายจริง (รอทีมใส่รูปจริงภายหลังตามที่ระบุใน README)
// แทนที่จะโชว์กล่องไล่สีเปล่าๆ พร้อมข้อความ ใช้ไอคอนขวดยาทาเล็บ + สีเน้นที่ต่างกันต่อลาย
// ให้ดูเป็นชิ้นงานที่ตั้งใจออกแบบ ไม่ใช่ placeholder ที่ยังไม่เสร็จ
export default function NailThumb({ label, accent = '#EC4C82' }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2"
      style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}0d)` }}
    >
      <svg viewBox="0 0 40 56" className="w-9 h-12 drop-shadow-sm">
        <rect x="13" y="2" width="14" height="9" rx="2" fill="white" stroke={accent} strokeOpacity="0.25" />
        <path
          d="M11 13 Q11 9 15 9 L25 9 Q29 9 29 13 L31.5 43 Q31.5 53 20 53 Q8.5 53 8.5 43 Z"
          fill={accent}
          opacity="0.85"
        />
        <ellipse cx="15.5" cy="21" rx="3.4" ry="6.5" fill="white" opacity="0.3" />
      </svg>
      <span className="text-[11px] font-medium px-3 text-center leading-tight" style={{ color: accent }}>
        {label}
      </span>
    </div>
  )
}
