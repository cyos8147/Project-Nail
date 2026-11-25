import { GlassHeart, RibbonSwoosh, SatinBow, Sparkle } from './Decor.jsx'

// พื้นหลังของทุกหน้าลูกค้า: รูปร้านโทนชมพูเบลอ ๆ + ม่านชมพู + โบว์ ริบบิ้น หัวใจแก้ว ประกาย (ตามภาพตัวอย่างของร้าน)
// - fixed อยู่หลังเนื้อหาทั้งหมด (ต้องอยู่ใน container ที่มี class "isolate")
// - ของตกแต่งล้วน: ไม่รับการแตะ และซ่อนจากโปรแกรมอ่านหน้าจอ
// - รูปพื้นหลังเป็นรูปชั่วคราว (public/photos) เปลี่ยนเป็นรูปร้านจริงได้โดยใช้ชื่อไฟล์เดิม

const HEARTS = [
  { top: '14%', left: '3%', w: 'w-12 sm:w-16' },
  { top: '9%', right: '24%', w: 'w-10 sm:w-14', desktop: true },
  { top: '44%', right: '2%', w: 'w-10 sm:w-14' },
  { top: '62%', left: '2%', w: 'w-9 sm:w-12', desktop: true },
  { top: '84%', right: '18%', w: 'w-10 sm:w-12' },
  { top: '90%', left: '30%', w: 'w-8 sm:w-10', desktop: true },
]

const SPARKLES = [
  { top: '8%', left: '20%', w: 'w-4', c: 'text-white' },
  { top: '20%', right: '12%', w: 'w-5', c: 'text-white' },
  { top: '36%', left: '9%', w: 'w-3', c: 'text-white' },
  { top: '30%', left: '52%', w: 'w-4', c: 'text-white', desktop: true },
  { top: '56%', right: '9%', w: 'w-5', c: 'text-white' },
  { top: '70%', left: '16%', w: 'w-4', c: 'text-white' },
  { top: '78%', left: '62%', w: 'w-3', c: 'text-white', desktop: true },
  { top: '94%', right: '40%', w: 'w-4', c: 'text-white' },
]

// variant="full" หน้าแรก: ตกแต่งเต็มเหมือนภาพตัวอย่าง
// variant="calm" หน้าอื่น: ชุดเดียวกันแต่น้อยลง ให้ฟอร์มและข้อมูลเด่น
export default function DreamyBackground({ variant = 'calm' }) {
  const full = variant === 'full'
  const hearts = full ? HEARTS : HEARTS.filter((_, i) => i % 2 === 0)
  const sparkles = full ? SPARKLES : SPARKLES.filter((_, i) => i % 2 === 1)

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none bg-[#FBE3EC]">
      {/* รูปร้านเป็นฉากหลัง ย้อมชมพูและเบลอเล็กน้อยให้ตัวหนังสือชัด */}
      <div
        className="absolute -inset-4 bg-cover bg-center"
        style={{ backgroundImage: 'url(/photos/salon-backdrop.webp)', filter: 'blur(5px) saturate(0.9)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(70rem 40rem at 50% -10%, rgba(255,244,248,0.55), transparent 70%)',
            'radial-gradient(40rem 30rem at 100% 100%, rgba(244,143,180,0.35), transparent 70%)',
            `linear-gradient(180deg, rgba(251,214,228,${full ? 0.72 : 0.8}) 0%, rgba(250,205,222,${full ? 0.8 : 0.86}) 55%, rgba(252,222,233,0.9) 100%)`,
          ].join(','),
        }}
      />

      {/* ริบบิ้นซาตินพาดมุม */}
      <RibbonSwoosh className="absolute -top-16 -left-40 w-[28rem] sm:w-[38rem] opacity-80" style={{ rotate: '-8deg' }} />
      <RibbonSwoosh flip className="absolute -bottom-10 -right-40 w-[28rem] sm:w-[40rem] opacity-75" />
      {full && <RibbonSwoosh className="hidden lg:block absolute bottom-[8%] -left-48 w-[30rem] opacity-60" style={{ rotate: '24deg' }} />}

      {/* โบว์มุมบน */}
      <SatinBow className={`absolute -top-3 -left-6 w-28 sm:w-40 ${full ? '' : 'opacity-90'}`} style={{ rotate: '-14deg' }} />
      <SatinBow className="hidden md:block absolute top-16 -right-4 w-32 lg:w-40" style={{ rotate: '16deg' }} />

      {hearts.map((h, i) => (
        <GlassHeart
          key={i}
          className={`absolute ${h.w} opacity-90 ${h.desktop ? 'hidden md:block' : ''}`}
          style={{ top: h.top, left: h.left, right: h.right, rotate: `${(i % 2 ? 1 : -1) * (8 + i * 3)}deg` }}
        />
      ))}

      {sparkles.map((s, i) => (
        <Sparkle
          key={i}
          className={`absolute ${s.w} ${s.c} drop-shadow-[0_0_6px_rgba(255,255,255,0.9)] ${s.desktop ? 'hidden md:block' : ''}`}
          style={{ top: s.top, left: s.left, right: s.right }}
        />
      ))}
    </div>
  )
}
