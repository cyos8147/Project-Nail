import { categories as fallbackCategories, servicesByCategory as fallbackServices } from '../../data/bookingData.js'

export default function ServiceSelector({ category, setCategory, service, setService, categories, servicesByCategory }) {
  const cats = categories?.length ? categories : fallbackCategories
  const services = (servicesByCategory?.[category]?.length ? servicesByCategory[category] : fallbackServices[category]) || []

  function handleCategoryChange(id) {
    setCategory(id)
    setService(null)
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-gray-800 text-center mb-1">เลือกบริการ</h2>
      <p className="text-gray-500 text-center text-sm mb-6">เลือกหมวดหมู่ก่อน แล้วค่อยเลือกบริการที่ต้องการ</p>

      {/* Category tabs */}
      <div className="flex justify-center gap-3 mb-8">
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleCategoryChange(c.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-colors ${
              category === c.id
                ? 'bg-rose-500 text-white shadow-card'
                : 'bg-white text-gray-500 border border-blush-200 hover:bg-blush-100'
            }`}
          >
            <span className="text-lg">{c.icon}</span>
            {c.name || c.label}
          </button>
        ))}
      </div>

      {/* Service cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {services.map((s) => {
          const isSelected = service?.id === s.id
          const duration = s.duration_minutes ?? s.duration
          const isColor = s.is_color_service ?? s.isColor
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setService(s)}
              className={`text-left rounded-2xl border p-5 transition-colors ${
                isSelected
                  ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200'
                  : 'border-blush-200 bg-white hover:border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-1">ใช้เวลาประมาณ {duration} นาที</p>
                  {category === 'hair' && isColor && (
                    <span className="inline-block mt-2 text-[11px] font-medium text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                      เลือกโทนสีได้
                    </span>
                  )}
                </div>
                <p className="text-rose-600 font-semibold text-sm whitespace-nowrap">{s.price} บาท</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
