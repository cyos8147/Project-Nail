// พื้นหลังของทุกหน้าลูกค้า: ขาวอมชมพูอ่อนมาก เรียบ ๆ ให้รูปผลงานกับการ์ดเป็นตัวเด่น (ดีไซน์ใหม่ ขาวสะอาด)
// - fixed อยู่หลังเนื้อหาทั้งหมด (ต้องอยู่ใน container ที่มี class "isolate")
// - ของตกแต่งล้วน ไม่รับการแตะ และซ่อนจากโปรแกรมอ่านหน้าจอ
// - variant ยังรับไว้เหมือนเดิม (full = หน้าแรก มีแสงชมพูจาง ๆ มุมบนมากกว่านิดหนึ่ง)
export default function DreamyBackground({ variant = 'calm' }) {
  const full = variant === 'full'
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: [
          `radial-gradient(60rem 30rem at 85% -5%, rgba(249, 200, 220, ${full ? 0.35 : 0.25}), transparent 70%)`,
          'radial-gradient(50rem 30rem at -10% 110%, rgba(252, 220, 232, 0.35), transparent 70%)',
          'linear-gradient(180deg, #FFFAFB 0%, #FFF6F9 100%)',
        ].join(','),
      }}
    />
  )
}
