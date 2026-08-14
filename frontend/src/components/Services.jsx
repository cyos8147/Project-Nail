const services = [
  { icon: '💅', title: 'ทำสีเจล', desc: 'สีเจลคุณภาพ ทนนาน เงางาม', price: 'เริ่มต้น 350 บาท' },
  { icon: '🎨', title: 'เพ้นท์ลาย', desc: 'ลายมือ ลายสติกเกอร์ ลายพิเศษ', price: 'เริ่มต้น 200 บาท' },
  { icon: '✨', title: 'ต่อเล็บ PVC / เจล', desc: 'ต่อเล็บทรงสวย เหมาะกับทุกมือ', price: 'เริ่มต้น 600 บาท' },
  { icon: '🧴', title: 'ดูแลผิวมือ & เท้า', desc: 'ขัดผิว พอกมือ ผ่อนคลาย', price: 'เริ่มต้น 300 บาท' },
]

export default function Services() {
  return (
    <section id="services" className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl font-bold text-gray-800">บริการของร้าน</h2>
        <p className="text-gray-500 mt-2">เลือกบริการที่ใช่ แล้วจองคิวได้ทันที</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
        {services.map((s) => (
          <div
            key={s.title}
            className="bg-white rounded-2xl shadow-card p-6 text-center hover:-translate-y-1 transition-transform"
          >
            <div className="text-3xl mb-3">{s.icon}</div>
            <h3 className="font-display font-semibold text-gray-800">{s.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
            <p className="text-rose-600 text-sm font-semibold mt-3">{s.price}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
