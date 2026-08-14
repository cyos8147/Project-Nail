import { getRankedDesigns } from '../data/nailCatalog.js'
import NailThumb from './NailThumb.jsx'

const TONE_LABEL = { warm: 'Warm Tone', cool: 'Cool Tone', neutral: 'Neutral Tone' }
const ACCENTS = ['#EC4C82', '#D4AF37', '#6B3FA0', '#8B5E3C', '#3B8FA6']

export default function NailRecommendation({ skinTone }) {
  const designs = getRankedDesigns(skinTone, 5)
  const isPersonalized = !!skinTone

  return (
    <section id="ai-recommend" className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-4">
        <span className="inline-block bg-blush-100 text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          AI แนะนำลายเล็บ
        </span>
        <h2 className="font-display text-3xl font-bold text-gray-800">
          {isPersonalized ? `ลายเล็บที่เหมาะกับคุณ (${TONE_LABEL[skinTone]})` : 'ลายเล็บยอดนิยม'}
        </h2>
        <p className="text-gray-500 mt-2">
          {isPersonalized
            ? 'จัดอันดับความเหมาะสมจากผลวิเคราะห์สีผิวของคุณ พร้อมราคาและระยะเวลาทำ'
            : 'วิเคราะห์สีผิวก่อน เพื่อให้ AI จัดอันดับลายที่เหมาะกับคุณโดยเฉพาะ'}
        </p>
        {!isPersonalized && (
          <a
            href="#ai-skin"
            className="inline-block mt-4 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-card transition-colors"
          >
            วิเคราะห์สีผิวของฉัน
          </a>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
        {designs.map((d, i) => (
          <div
            key={d.id}
            className="bg-white rounded-2xl shadow-card overflow-hidden relative hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
          >
            {isPersonalized && i === 0 && (
              <span className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                แนะนำที่สุด
              </span>
            )}
            <div className="aspect-square">
              <NailThumb label={d.name} accent={ACCENTS[i % ACCENTS.length]} />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-gray-800 text-sm">{d.name}</p>
                <span className="text-xs font-bold text-rose-600">{d.matchScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-blush-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-rose-400 rounded-full" style={{ width: `${d.matchScore}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{d.duration} นาที</span>
                <span className="font-medium text-gray-600">{d.price} บาท</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
