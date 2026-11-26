import ZoomableImage from '../ZoomableImage.jsx'
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function formatDateKey(dateKey) {
  if (!dateKey) return ''
  const [y, m, d] = dateKey.split('-').map(Number)
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`
}

export default function ContactForm({
  chain = null,
  category,
  service,
  selectedShade,
  referenceImage,
  durationMinutes,
  selectedDate,
  selectedTime,
  form,
  onChange,
  errors,
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-gray-800 text-center mb-1">ข้อมูลติดต่อ</h2>
      <p className="text-gray-500 text-center text-sm mb-8">อีกขั้นเดียวก็จองเสร็จแล้วค่ะ</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Summary */}
        <div className="bg-blush-50 border border-blush-200 rounded-2xl p-5 space-y-3 h-fit">
          <p className="font-display font-semibold text-gray-800 mb-2">ตรวจสอบการจอง</p>
          {referenceImage && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">รูปที่แนบไปกับการจอง</p>
              <ZoomableImage
                src={referenceImage}
                alt="รูปที่แนบไปกับการจอง"
                className="block w-full h-56 rounded-xl bg-white border border-blush-200"
              />
              <p className="text-[11px] text-gray-400 mt-1">กดที่รูปเพื่อดูเต็มจอ</p>
            </div>
          )}
          {chain ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">บริการ (ทำต่อกันตามลำดับ)</p>
              {chain.map((c, i) => (
                <div key={c.service.id} className="flex justify-between gap-2 text-sm bg-white rounded-xl border border-blush-200 px-3 py-2">
                  <span className="font-medium text-gray-800">{i + 1}. {c.service.name}</span>
                  <span className="text-gray-600 whitespace-nowrap">{c.start}–{c.end} น.</span>
                </div>
              ))}
            </div>
          ) : (
          <>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">หมวดหมู่</span>
            <span className="font-medium text-gray-800">{category === 'hair' ? 'ทำผม' : 'ทำเล็บ'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">บริการ</span>
            <span className="font-medium text-gray-800">{service?.name}</span>
          </div>
          </>
          )}
          {selectedShade && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">โทนสี</span>
              <span className="font-medium text-gray-800 flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10"
                  style={{ backgroundColor: selectedShade.hex }}
                />
                {selectedShade.name}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">วันที่</span>
            <span className="font-medium text-gray-800">{formatDateKey(selectedDate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">เวลา</span>
            <span className="font-medium text-gray-800">{selectedTime} น.</span>
          </div>
          {durationMinutes ? (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">เวลาโดยประมาณ</span>
              <span className="font-medium text-gray-800">{durationMinutes} นาที</span>
            </div>
          ) : null}
          <div className="border-t border-blush-200 pt-3 flex justify-between text-sm">
            <span className="text-gray-500">ราคาโดยประมาณ</span>
            <span className="font-semibold text-berry">{chain ? chain.reduce((n, c) => n + c.price, 0) : service?.price} บาท</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            เช็กบริการ สี และรูปอีกครั้งนะคะ ถ้าอยากแก้ กด “ย้อนกลับ” ได้เลย
          </p>
        </div>

        {/* Contact fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อ-นามสกุล</label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={onChange}
              placeholder="เช่น สมหญิง ใจดี"
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300 transition-shadow ${
                errors.name ? 'border-red-300' : 'border-blush-200'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={onChange}
              placeholder="เช่น 0812345678"
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300 transition-shadow ${
                errors.phone ? 'border-red-300' : 'border-blush-200'
              }`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ไอดีไลน์ (Line ID)</label>
            <input
              name="lineId"
              type="text"
              value={form.lineId}
              onChange={onChange}
              placeholder="เช่น somying_jaidee"
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300 transition-shadow ${
                errors.lineId ? 'border-red-300' : 'border-blush-200'
              }`}
            />
            {errors.lineId && <p className="text-xs text-red-500 mt-1">{errors.lineId}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
