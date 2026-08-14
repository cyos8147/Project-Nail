const promotions = [
  {
    title: 'ลูกค้าใหม่ลด 15%',
    desc: 'สำหรับการจองครั้งแรกทุกบริการ',
    tag: 'New Member',
  },
  {
    title: 'พาเพื่อนมาลด 100 บาท',
    desc: 'จองคู่กับเพื่อน รับส่วนลดทั้งสองคน',
    tag: 'Friend Get Friend',
  },
  {
    title: 'แพ็กเกจสี + ลาย 990.-',
    desc: 'ทำสีเจลพร้อมเพ้นท์ลาย ประหยัดกว่าปกติ',
    tag: 'Best Deal',
  },
]

export default function Promotions() {
  return (
    <section id="promotions" className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl font-bold text-gray-800">โปรโมชั่นล่าสุด</h2>
        <p className="text-gray-500 mt-2">อัปเดตโปรโมชั่นพิเศษประจำเดือนนี้</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {promotions.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-400 text-white p-6 shadow-card hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
          >
            <span className="inline-block bg-white/20 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {p.tag}
            </span>
            <h3 className="font-display text-xl font-bold">{p.title}</h3>
            <p className="text-white/85 text-sm mt-2">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
