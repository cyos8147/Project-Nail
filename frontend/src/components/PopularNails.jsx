import NailThumb from './NailThumb.jsx'

const nails = [
  { name: 'Minimal Nude', likes: '1.2k', accent: '#E8C39E' },
  { name: 'Korean Pink', likes: '987', accent: '#F2A6C0' },
  { name: 'French Classic', likes: '1.1k', accent: '#D93B72' },
  { name: 'Cat Eye', likes: '832', accent: '#6B3FA0' },
  { name: 'Marble', likes: '764', accent: '#9C6B7A' },
]

export default function PopularNails() {
  return (
    <section id="popular" className="bg-blush-100/60 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-gray-800">ลายเล็บยอดนิยม</h2>
            <p className="text-gray-500 mt-2">แรงบันดาลใจลายเล็บที่ลูกค้าเลือกมากที่สุด</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {nails.map((n) => (
            <div
              key={n.name}
              className="bg-white rounded-2xl shadow-card overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
            >
              <div className="aspect-square">
                <NailThumb label={n.name} accent={n.accent} />
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-800 text-sm">{n.name}</p>
                <p className="text-xs text-gray-400 mt-1">♡ {n.likes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
