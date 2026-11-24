import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminDownloadFile, adminRevenueReport } from '../../api/client.js'
import { baht, shiftIso, thaiTodayIso } from '../../utils/dashboardFormat.js'

// หน้ารายงานรายได้ (ส่วนที่ 5): เลือกช่วงวันที่เอง ดูแยกรายวัน/เดือน/ปี และดูรายการคิวทีละรายการ
// ตัวเลขนับจากคิวที่ "เสร็จแล้ว" รายได้ใช้ยอดรับจริงถ้ากรอกไว้ ไม่งั้นใช้ราคาบริการ

const QUICK = [
  { key: 'today', label: 'วันนี้', range: () => [thaiTodayIso(), thaiTodayIso()] },
  { key: '7d', label: '7 วันล่าสุด', range: () => [shiftIso(thaiTodayIso(), -6), thaiTodayIso()] },
  { key: 'month', label: 'เดือนนี้', range: () => { const t = thaiTodayIso(); return [`${t.slice(0, 8)}01`, t] } },
  { key: 'year', label: 'ปีนี้', range: () => { const t = thaiTodayIso(); return [`${t.slice(0, 4)}-01-01`, t] } },
]
const GROUPS = [
  { key: 'auto', label: 'อัตโนมัติ' },
  { key: 'day', label: 'รายวัน' },
  { key: 'month', label: 'รายเดือน' },
  { key: 'year', label: 'รายปี' },
]
const PAGE = 50

function Stat({ label, value, sub, tone = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function SegmentedTabs({ items, value, onChange, label }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-blush-50 border border-blush-200 p-1" role="tablist" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={value === it.key}
          onClick={() => onChange(it.key)}
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition ${value === it.key ? 'bg-rose-500 text-white shadow' : 'text-gray-600 hover:text-rose-600'}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export default function AdminReportsPage() {
  const { admin } = useOutletContext() || {}
  const [from, setFrom] = useState(() => QUICK[2].range()[0])
  const [to, setTo] = useState(() => thaiTodayIso())
  const [quick, setQuick] = useState('month')
  const [group, setGroup] = useState('auto')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(PAGE)
  const [downloading, setDownloading] = useState(false)

  const invalid = from > to

  useEffect(() => {
    if (invalid) return undefined
    let alive = true
    setLoading(true)
    setError(null)
    adminRevenueReport({ date_from: from, date_to: to, group })
      .then((d) => { if (alive) { setData(d); setShown(PAGE) } })
      .catch((e) => alive && setError(e.message || 'โหลดรายงานไม่สำเร็จ'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [from, to, group, invalid])

  function pickQuick(key) {
    const [a, b] = QUICK.find((q) => q.key === key).range()
    setQuick(key)
    setFrom(a)
    setTo(b)
  }

  function changeDate(setter) {
    return (e) => {
      setQuick('custom')
      setter(e.target.value)
    }
  }

  async function downloadCsv() {
    setDownloading(true)
    try {
      await adminDownloadFile(`/admin/reports/revenue.csv?date_from=${from}&date_to=${to}`, `luckysalon-revenue-${from}-to-${to}.csv`)
    } catch (e) {
      setError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const totals = data?.totals
  const maxRevenue = useMemo(() => Math.max(1, ...(data?.groups || []).map((g) => g.revenue)), [data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">รายงานรายได้</h1>
          <p className="text-gray-500 text-sm mt-1">
            นับจากคิวที่เสร็จแล้ว ตามวันนัด รายได้ใช้ยอดรับจริงถ้ากรอกไว้ ไม่งั้นใช้ราคาบริการ
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="text-sm font-semibold text-rose-600 bg-white border border-blush-200 hover:bg-blush-50 rounded-xl px-4 py-2">
            🖨 พิมพ์รายงาน
          </button>
          <button type="button" onClick={downloadCsv} disabled={downloading || invalid} className="text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 rounded-xl px-4 py-2">
            {downloading ? 'กำลังเตรียม...' : '⬇ ดาวน์โหลด CSV'}
          </button>
        </div>
      </div>

      {/* ตัวเลือกช่วงวันที่ (5.1, 5.2) */}
      <div className="bg-white rounded-2xl shadow-card p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap gap-2" role="group" aria-label="ช่วงที่ใช้บ่อย">
          {QUICK.map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={() => pickQuick(q.key)}
              aria-pressed={quick === q.key}
              className={`whitespace-nowrap text-sm font-semibold px-4 py-2 rounded-full border transition ${quick === q.key ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-rose-600 border-blush-200 hover:bg-blush-50'}`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="rep-from" className="text-xs text-gray-500 block mb-1">ตั้งแต่วันที่</label>
            <input id="rep-from" type="date" value={from} max={to} onChange={changeDate(setFrom)} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="rep-to" className="text-xs text-gray-500 block mb-1">ถึงวันที่</label>
            <input id="rep-to" type="date" value={to} min={from} onChange={changeDate(setTo)} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">แสดงผลแยกตาม</p>
            <SegmentedTabs items={GROUPS} value={group} onChange={setGroup} label="การแยกกลุ่มผล" />
          </div>
        </div>
        {invalid && <p className="text-sm text-red-500">วันเริ่มต้องไม่เกินวันสิ้นสุด</p>}
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
      </div>

      {/* พิมพ์ได้: หัวรายงาน */}
      {data && (
        <p className="hidden print:block text-sm">
          Lucky Salon · รายงานรายได้ {data.date_from} ถึง {data.date_to} · พิมพ์เมื่อ {new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
          {admin?.full_name ? ` · โดย ${admin.full_name}` : ''}
        </p>
      )}

      <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {totals && (
          <>
            {/* สรุปยอด (5.3) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Stat label="รายได้ที่นับ" value={baht(totals.revenue)} tone="text-rose-600" sub={`ราคาตั้งรวม ${baht(totals.list_price)}`} />
              <Stat label="คิวที่เสร็จ" value={`${totals.count} คิว`} />
              <Stat
                label="ส่วนต่างจากราคาตั้ง"
                value={`${totals.adjusted > 0 ? '+' : ''}${baht(totals.adjusted)}`}
                tone={totals.adjusted >= 0 ? 'text-green-600' : 'text-amber-600'}
                sub="ยอดรับจริงเทียบราคาตั้ง"
              />
              <Stat label="ค่าใช้จ่าย" value={baht(totals.expenses)} />
              <Stat label="กำไร (รายได้ − ค่าใช้จ่าย)" value={baht(totals.profit)} tone={totals.profit >= 0 ? 'text-green-600' : 'text-red-500'} />
            </div>

            {/* ตารางแยกกลุ่ม (5.4, 5.5) */}
            <div className="bg-white rounded-2xl shadow-card p-5 overflow-x-auto">
              <p className="font-medium text-gray-700 mb-3">
                สรุปแยก{data.group === 'year' ? 'รายปี' : data.group === 'month' ? 'รายเดือน' : 'รายวัน'}
              </p>
              {data.groups.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">ไม่มีคิวที่เสร็จแล้วในช่วงนี้</p>
              ) : (
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-blush-100">
                      <th className="py-2 font-medium">ช่วง</th>
                      <th className="py-2 font-medium text-right">คิว</th>
                      <th className="py-2 font-medium text-right">รายได้</th>
                      <th className="py-2 font-medium text-right">ค่าใช้จ่าย</th>
                      <th className="py-2 font-medium text-right">กำไร</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {data.groups.map((g) => (
                      <tr key={g.key} className="border-b border-blush-50">
                        <td className="py-2">
                          <div className="text-gray-700">{g.label}</div>
                          <div className="h-1.5 mt-1 w-full max-w-[220px] rounded-full bg-blush-100 overflow-hidden">
                            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(g.revenue / maxRevenue) * 100}%` }} />
                          </div>
                        </td>
                        <td className="py-2 text-right">{g.count}</td>
                        <td className="py-2 text-right font-medium">{baht(g.revenue)}</td>
                        <td className="py-2 text-right text-gray-500">{baht(g.expenses)}</td>
                        <td className={`py-2 text-right font-medium ${g.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{baht(g.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold text-gray-800">
                      <td className="pt-3">รวมทั้งช่วง</td>
                      <td className="pt-3 text-right">{totals.count}</td>
                      <td className="pt-3 text-right">{baht(totals.revenue)}</td>
                      <td className="pt-3 text-right">{baht(totals.expenses)}</td>
                      <td className="pt-3 text-right">{baht(totals.profit)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* รายการคิวทีละรายการ (5.4) */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <p className="font-medium text-gray-700 mb-3">รายการคิวที่เสร็จแล้ว</p>
              {data.bookings.length === 0 ? (
                <p className="text-sm text-gray-400">ยังไม่มีรายการ</p>
              ) : (
                <>
                  <ul className="divide-y divide-blush-50">
                    {data.bookings.slice(0, shown).map((b) => (
                      <li key={b.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="text-gray-800 truncate">{b.customer_name} · {b.service_name}</p>
                          <p className="text-xs text-gray-400">{b.booking_date} {b.booking_time} น. · {b.booking_code}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="font-semibold text-gray-800">{baht(b.revenue)}</p>
                          <p className="text-[11px] text-gray-400">
                            {b.paid_amount !== null ? `รับจริง · ราคาตั้ง ${baht(b.list_price)}` : 'ตามราคาบริการ'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs text-gray-500 print:hidden">
                    <span>แสดง {Math.min(shown, data.bookings.length)} จาก {data.bookings.length} รายการ{data.bookings_truncated ? ' · ดาวน์โหลด CSV เพื่อดูทั้งหมด' : ''}</span>
                    {shown < data.bookings.length && (
                      <button type="button" onClick={() => setShown(shown + PAGE)} className="font-semibold text-rose-600 hover:underline">แสดงเพิ่ม</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
