import { MAX_SERVICES, addableServices, buildChain, chainTotals, formatMinutes } from '../../utils/multiBooking.js'
import Icon from '../Icon.jsx'

const CATEGORY_LABEL = { hair: 'ทำผม', nail: 'ทำเล็บ' }

// "ทำต่อเลยไหม" -- เพิ่มบริการที่ทำต่อจากบริการหลักในวันเดียวกัน (ทำทีละอย่าง ไม่ใช่พร้อมกัน)
export default function ExtraServicesPicker({ main, extras, setExtras, allServices, categories, mainExtraMinutes = 0 }) {
  if (!main) return null
  const options = addableServices(allServices, main, extras)
  const chain = buildChain(main, extras, null, mainExtraMinutes)
  const totals = chainTotals(chain)
  const catName = (id) => categories?.find((c) => c.id === id)?.name || CATEGORY_LABEL[id] || id

  const move = (idx, dir) => {
    const next = [...extras]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setExtras(next)
  }

  return (
    <div className="mt-8 rounded-2xl border border-blush-200 bg-gradient-to-br from-blush-50 to-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display font-semibold text-gray-800">อยากทำบริการอื่นต่อเลยไหม? <span className="text-xs font-normal text-gray-400">(ไม่บังคับ)</span></p>
        <p className="text-xs text-gray-500">ทำต่อกันทีละอย่าง สูงสุด {MAX_SERVICES} บริการ</p>
      </div>

      <ol className="mt-4 space-y-2">
        {chain.map((c, i) => (
          <li key={c.service.id} className="flex items-center gap-3 bg-white rounded-xl border border-blush-200 px-3 py-2.5">
            <span className="w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{c.service.name}</p>
              <p className="text-xs text-gray-400">{catName(c.categoryId)} · {formatMinutes(c.duration)} · {c.price} บาท</p>
            </div>
            {i > 0 && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i - 1, -1)} disabled={i === 1} aria-label={`เลื่อน ${c.service.name} ขึ้น`} className="glass-btn w-9 h-9"><Icon name="arrowUp" className="h-4 w-4" /></button>
                <button type="button" onClick={() => move(i - 1, 1)} disabled={i === chain.length - 1} aria-label={`เลื่อน ${c.service.name} ลง`} className="glass-btn w-9 h-9"><Icon name="arrowDown" className="h-4 w-4" /></button>
                <button type="button" onClick={() => setExtras(extras.filter((s) => s.id !== c.service.id))} aria-label={`เอา ${c.service.name} ออก`} className="glass-btn w-9 h-9 hover:!text-red-500"><Icon name="x" className="h-4 w-4" /></button>
              </div>
            )}
            {i === 0 && <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-1 rounded-full">บริการหลัก</span>}
          </li>
        ))}
      </ol>

      {extras.length > 0 && (
        <p className="mt-3 text-sm text-gray-600">
          รวม <b>{chain.length} บริการ</b> · ใช้เวลาประมาณ <b>{formatMinutes(totals.minutes)}</b> · ราคาประมาณ <b className="text-rose-600">{totals.price} บาท</b>
        </p>
      )}

      {options.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">กดเพื่อเพิ่มบริการที่ทำต่อ</p>
          <div className="flex flex-wrap gap-2">
            {options.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setExtras([...extras, s])}
                className="btn-candy-soft text-sm px-3.5 py-2"
              >
                + {s.name} <span className="text-xs text-gray-400">({catName(s.category_id)} {formatMinutes(Number(s.duration_minutes))})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
