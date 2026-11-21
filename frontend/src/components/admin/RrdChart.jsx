import { useEffect, useState } from 'react'
import { adminDashboardRrd } from '../../api/client.js'
import { baht } from '../../utils/dashboardFormat.js'

// กราฟแท่งแบบ RRD (Round Robin Database) ตามแนว RRDtool:
// เลือกความละเอียดได้ 4 แบบ จำนวนแท่งคงที่ เลื่อนดูย้อนหลังทีละหน้าต่าง ช่องที่ร้านปิดเป็นสีเทา
// และสรุป ล่าสุด / เฉลี่ย / สูงสุด / ต่ำสุด ใต้กราฟ -- คำนวณสดจากรายการจอง (ดู backend app/rrd.py)

const RESOLUTIONS = [
  { key: 'day', label: 'รายวัน', span: '30 วัน' },
  { key: 'week', label: 'รายสัปดาห์', span: '12 สัปดาห์' },
  { key: 'month', label: 'รายเดือน', span: '12 เดือน' },
  { key: 'year', label: 'รายปี', span: '5 ปี' },
]
const METRICS = [
  { key: 'revenue', label: 'รายได้', format: baht },
  { key: 'bookings', label: 'จำนวนคิว', format: (v) => `${Math.round(v * 10) / 10} คิว` },
]
const THAI_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function thaiDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${THAI_MONTHS[m]} ${String(y + 543).slice(-2)}`
}

function rangeText(b, resolution) {
  if (resolution === 'day') return thaiDate(b.start)
  if (resolution === 'year') return `ปี ${b.label}`
  return `${thaiDate(b.start)} – ${thaiDate(b.end)}`
}

// ค่าสเกลแกน Y ที่อ่านง่าย (1, 2, 2.5, 5 × 10^n)
function niceMax(v) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p
  return 10 * p
}

export default function RrdChart() {
  const [resolution, setResolution] = useState('day')
  const [metric, setMetric] = useState('revenue')
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    adminDashboardRrd({ resolution, offset })
      .then((d) => { if (alive) { setData(d); setError(null) } })
      .catch((e) => alive && setError(e.message || 'โหลดกราฟไม่สำเร็จ'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [resolution, offset])

  const m = METRICS.find((x) => x.key === metric)
  const buckets = data?.buckets ?? []
  const summary = data?.summary?.[metric]
  const top = niceMax(Math.max(0, ...buckets.map((b) => b[metric])))

  const W = 960
  const H = 250
  const padL = 56
  const padB = 28
  const padT = 10
  const plotW = W - padL - 8
  const plotH = H - padB - padT
  const slot = plotW / Math.max(buckets.length, 1)
  const barW = Math.max(3, slot * 0.68)
  const y = (v) => padT + plotH - (v / top) * plotH
  const labelEvery = buckets.length > 14 ? Math.ceil(buckets.length / 8) : 1
  const shown = hover !== null ? buckets[hover] : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex max-w-full overflow-x-auto rounded-full bg-blush-50 border border-blush-200 p-1" role="tablist" aria-label="ความละเอียดของกราฟ">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={resolution === r.key}
              onClick={() => { setResolution(r.key); setOffset(0); setHover(null) }}
              className={`whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${resolution === r.key ? 'bg-rose-500 text-white shadow' : 'text-gray-600 hover:text-rose-600'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-full bg-gray-50 border border-gray-200 p-1" role="tablist" aria-label="ค่าที่แสดง">
          {METRICS.map((x) => (
            <button
              key={x.key}
              role="tab"
              aria-selected={metric === x.key}
              onClick={() => setMetric(x.key)}
              className={`whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${metric === x.key ? 'bg-white text-gray-800 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => { setOffset(offset + 1); setHover(null) }}
          disabled={!data?.has_older || loading}
          className="w-10 h-10 rounded-full border border-blush-200 text-rose-600 hover:bg-blush-50 disabled:opacity-30"
          aria-label="ย้อนหลัง"
        >
          ‹
        </button>
        <p className="text-sm text-center text-gray-600">
          {data ? <>{thaiDate(data.start)} – {thaiDate(data.end)} <span className="text-gray-400">· {RESOLUTIONS.find((r) => r.key === resolution).span}</span></> : '…'}
          {offset > 0 && (
            <button type="button" onClick={() => { setOffset(0); setHover(null) }} className="ml-2 text-xs font-semibold text-rose-600 underline">
              กลับไปล่าสุด
            </button>
          )}
        </p>
        <button
          type="button"
          onClick={() => { setOffset(Math.max(0, offset - 1)); setHover(null) }}
          disabled={offset === 0 || loading}
          className="w-10 h-10 rounded-full border border-blush-200 text-rose-600 hover:bg-blush-50 disabled:opacity-30"
          aria-label="ถัดไป"
        >
          ›
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className={`relative overflow-x-auto transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px] h-auto max-h-80" role="img" aria-label={`กราฟ${m.label}${RESOLUTIONS.find((r) => r.key === resolution).label}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={padL} x2={W - 8} y1={y(top * f)} y2={y(top * f)} stroke={f === 0 ? '#E8C3D2' : '#F6E3EA'} strokeDasharray={f === 0 ? '' : '3 4'} />
              <text x={padL - 6} y={y(top * f) + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">
                {metric === 'revenue' ? (top * f >= 1000 ? `${Math.round((top * f) / 100) / 10}k` : Math.round(top * f)) : Math.round(top * f * 10) / 10}
              </text>
            </g>
          ))}
          {summary && summary.average > 0 && (
            <g>
              <line x1={padL} x2={W - 8} y1={y(summary.average)} y2={y(summary.average)} stroke="#8B5CF6" strokeWidth="1.2" strokeDasharray="6 4" />
              <text x={padL + 4} y={y(summary.average) - 4} textAnchor="start" fontSize="11" fontWeight="600" fill="#7C3AED">เฉลี่ย</text>
            </g>
          )}
          {buckets.map((b, i) => {
            const v = b[metric]
            const x = padL + i * slot + (slot - barW) / 2
            const isMax = summary?.max_index === i && v > 0
            const fill = b.closed ? '#D1D5DB' : isMax ? '#E11D48' : b.partial ? '#F9A8C4' : '#EC4C82'
            const h = b.closed ? plotH * 0.06 : Math.max(v > 0 ? 2 : 0, (v / top) * plotH)
            return (
              <g key={b.start} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
                <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill={hover === i ? '#FDF2F6' : 'transparent'} />
                <rect x={x} y={padT + plotH - h} width={barW} height={h} rx={Math.min(4, barW / 3)} fill={fill} opacity={hover === null || hover === i ? 1 : 0.55}>
                  <title>{rangeText(b, resolution)}: {b.closed ? 'ร้านปิด' : m.format(v)}</title>
                </rect>
                {i % labelEvery === 0 || i === buckets.length - 1 ? (
                  <text x={padL + i * slot + slot / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#9CA3AF">{b.label}</text>
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="min-h-[1.5rem] text-sm text-center" aria-live="polite">
        {shown ? (
          <span className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
            <b className="text-gray-700">{rangeText(shown, resolution)}</b>
            {shown.closed ? <span className="text-gray-500">ร้านปิด</span> : (
              <span className="text-gray-600">{baht(shown.revenue)} · {shown.bookings} คิว{shown.partial ? ' · ยังไม่จบช่วง' : ''}</span>
            )}
          </span>
        ) : (
          <span className="text-xs text-gray-400">ชี้หรือแตะที่แท่งเพื่อดูตัวเลข</span>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['ล่าสุด', summary.last, summary.last_index, 'text-gray-800'],
            ['เฉลี่ย', summary.average, null, 'text-violet-600'],
            ['สูงสุด', summary.max, summary.max_index, 'text-rose-600'],
            ['ต่ำสุด', summary.min, summary.min_index, 'text-gray-600'],
          ].map(([label, v, idx, tone]) => (
            <div key={label} className="rounded-xl bg-blush-50/60 border border-blush-100 px-3 py-2">
              <p className="text-[11px] text-gray-500">{label}</p>
              <p className={`font-display text-lg font-bold ${tone}`}>{m.format(v)}</p>
              {idx !== null && idx !== undefined && buckets[idx] && <p className="text-[10px] text-gray-400 truncate">{rangeText(buckets[idx], resolution)}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#EC4C82]" />มีรายได้</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#E11D48]" />สูงสุดในหน้านี้</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F9A8C4]" />ช่วงปัจจุบัน (ยังไม่จบ)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300" />ร้านปิด (ไม่นับในเฉลี่ย/ต่ำสุด)</span>
        <span>นับเฉพาะคิวที่ "เสร็จแล้ว"</span>
      </div>
    </div>
  )
}
