import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { adminCreateExpense, adminDashboardReport, adminDeleteExpense, adminListExpenses, getLastBackupAt } from '../../api/client.js'
import { WEEKDAY_LABELS, baht, compare, deltaLabel, deltaTone, fullDate, monthLabel, percentText, shiftIso, shortDate, thaiTodayIso } from '../../utils/dashboardFormat.js'

const TONE_CLASS = {
  good: 'bg-green-50 text-green-700',
  bad: 'bg-red-50 text-red-600',
  neutral: 'bg-gray-100 text-gray-500',
}

// ตัวเลขหลัก + ลูกศรเทียบช่วงก่อนหน้า (invert = ค่าที่ "ลดลงคือดี" เช่น ค่าใช้จ่าย)
function KpiTile({ label, kpi, format = baht, accent = 'text-gray-800', invert = false, hint }) {
  const cmp = compare(kpi.value, kpi.previous)
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${accent}`}>{format(kpi.value)}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${TONE_CLASS[deltaTone(cmp, invert)]}`}>{deltaLabel(cmp)}</span>
        <span className="text-[11px] text-gray-400">ก่อนหน้า {format(kpi.previous)}</span>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function SmallTile({ label, value, sub, accent = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function Card({ title, note, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <div className="mb-3">
        <p className="font-medium text-gray-700">{title}</p>
        {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
      </div>
      {children}
    </div>
  )
}

// กราฟแท่งรายได้ พร้อมเส้นระดับและวันที่กำกับ (รายวันถ้าช่วงสั้น รายเดือนถ้าช่วงยาว)
function RevenueChart({ trend, unit }) {
  const max = Math.max(1, ...trend.map((t) => t.revenue))
  const width = 600
  const height = 140
  const barWidth = width / Math.max(trend.length, 1)
  const label = (t) => (unit === 'month' ? monthLabel(t.date) : shortDate(t.date))
  const mid = trend[Math.floor(trend.length / 2)]

  return (
    <div>
      <div className="flex justify-between text-[11px] text-gray-400 mb-1">
        <span>เส้นบน = {baht(max)} · เส้นกลาง = {baht(max / 2)}</span>
        <span>ชี้ที่แท่งเพื่อดูยอด{unit === 'month' ? 'ของเดือน' : 'ของวัน'}นั้น</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
        <line x1="0" y1="10" x2={width} y2="10" stroke="#F3D2DE" strokeWidth="1" />
        <line x1="0" y1={height - (height - 10) / 2} x2={width} y2={height - (height - 10) / 2} stroke="#F3D2DE" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1={height} x2={width} y2={height} stroke="#E8C3D2" strokeWidth="1" />
        {trend.map((t) => {
          const i = trend.indexOf(t)
          const h = (t.revenue / max) * (height - 10)
          return (
            <rect key={t.date} x={i * barWidth + 1} y={height - h} width={Math.max(1, barWidth - 2)} height={h} fill="#EC4C82" opacity={t.revenue > 0 ? 0.85 : 0.15}>
              <title>{label(t)}: {baht(t.revenue)} · {t.bookings} คิว</title>
            </rect>
          )
        })}
      </svg>
      <div className="flex justify-between text-[11px] text-gray-400 mt-1">
        <span>{trend.length > 0 && label(trend[0])}</span>
        <span>{trend.length > 6 && label(mid)}</span>
        <span>{trend.length > 0 && label(trend[trend.length - 1])}</span>
      </div>
    </div>
  )
}

// แถบแนวนอนเทียบสัดส่วน (ใช้ซ้ำกับบริการ หมวดค่าใช้จ่าย ฯลฯ)
function HBars({ rows, valueKey = 'revenue', format = baht, color = 'bg-rose-400', empty = 'ยังไม่มีข้อมูลในช่วงนี้' }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]))
  if (rows.length === 0) return <p className="text-sm text-gray-400">{empty}</p>
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{r.label}{r.count ? <span className="text-gray-400"> ({r.count})</span> : null}</span>
            <span className="font-medium text-gray-800">{format(r[valueKey])}</span>
          </div>
          <div className="h-2 rounded-full bg-blush-100 mt-1 overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(r[valueKey] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const STATUS_META = [
  { key: 'completed', label: 'เสร็จแล้ว', color: 'bg-green-400' },
  { key: 'confirmed', label: 'ยืนยันแล้ว', color: 'bg-sky-400' },
  { key: 'pending', label: 'รอยืนยัน', color: 'bg-amber-300' },
  { key: 'cancelled', label: 'ยกเลิก', color: 'bg-gray-300' },
  { key: 'no_show', label: 'ไม่มา', color: 'bg-red-400' },
]

function StatusBar({ counts }) {
  const total = STATUS_META.reduce((acc, s) => acc + (counts[s.key] || 0), 0)
  if (total === 0) return <p className="text-sm text-gray-400">ยังไม่มีคิวในช่วงนี้</p>
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden bg-blush-100">
        {STATUS_META.map((s) => (counts[s.key] ? <div key={s.key} className={s.color} style={{ width: `${(counts[s.key] / total) * 100}%` }} title={`${s.label} ${counts[s.key]}`} /> : null))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-sm">
        {STATUS_META.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600"><span className={`inline-block w-2.5 h-2.5 rounded-full ${s.color}`} />{s.label}</span>
            <span className="font-medium text-gray-800">{counts[s.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// แท่งแนวตั้งเล็ก ๆ: ช่วงเวลา/วันไหนลูกค้าเยอะ (ไม่นับคิวที่ยกเลิก)
function ColumnBars({ items, getLabel, getValue, highlight = true }) {
  const max = Math.max(1, ...items.map(getValue))
  const top = highlight ? Math.max(...items.map(getValue)) : -1
  return (
    <div className="flex items-end gap-1.5 h-32">
      {items.map((it, i) => {
        const v = getValue(it)
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <span className="text-[11px] text-gray-500 mb-0.5">{v || ''}</span>
            <div className={`w-full rounded-t ${v === top && v > 0 ? 'bg-rose-500' : 'bg-rose-300'}`} style={{ height: `${Math.max((v / max) * 100, v > 0 ? 4 : 1)}%`, opacity: v > 0 ? 1 : 0.25 }} />
            <span className="text-[11px] text-gray-400 mt-1">{getLabel(it)}</span>
          </div>
        )
      })}
    </div>
  )
}

const BACKUP_REMINDER_DAYS = 30

// เตือนเจ้าของร้านให้สำรองข้อมูล (นับจากไฟล์สำรองล่าสุดที่ดาวน์โหลดจากเครื่อง/เบราว์เซอร์นี้)
function BackupReminder() {
  const last = getLastBackupAt()
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null
  if (days !== null && days < BACKUP_REMINDER_DAYS) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
      <p className="text-sm text-amber-800">
        {days === null
          ? '💾 ยังไม่เคยสำรองข้อมูลร้านจากเครื่องนี้ ฐานข้อมูลออนไลน์ไม่มีระบบสำรองให้อัตโนมัติ'
          : `💾 ไม่ได้สำรองข้อมูลร้านมา ${days} วันแล้ว`}
      </p>
      <Link to="/admin/settings#backup" className="text-sm font-semibold text-amber-900 underline whitespace-nowrap">
        สำรองข้อมูลเลย
      </Link>
    </div>
  )
}

const PERIODS = [
  { key: '7d', label: '7 วัน' },
  { key: '30d', label: '30 วัน' },
  { key: 'month', label: 'เดือนนี้' },
  { key: 'year', label: 'ปีนี้' },
  { key: 'custom', label: 'กำหนดเอง' },
]

const todayIso = thaiTodayIso
const emptyExpense = () => ({ expense_date: todayIso(), category: 'อื่นๆ', amount: '', note: '' })

export default function DashboardPage() {
  const { admin } = useOutletContext()
  const [period, setPeriod] = useState('30d')
  const [range, setRange] = useState(() => {
    const to = thaiTodayIso()
    return { from: shiftIso(to, -29), to }
  })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [expenseForm, setExpenseForm] = useState(emptyExpense)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    // custom: รอจนเลือกวันครบและถูกต้อง ไม่ยิงคำขอครึ่งๆ กลางๆ
    if (period === 'custom' && (!range.from || !range.to || range.from > range.to)) return
    const params = period === 'custom' ? { period, date_from: range.from, date_to: range.to } : { period }
    setLoading(true)
    adminDashboardReport(params)
      .then((data) => { setReport(data); setError(null) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    adminListExpenses().then(setExpenses).catch(() => {})
  }, [period, range.from, range.to])

  useEffect(reload, [reload])

  async function handleAddExpense(e) {
    e.preventDefault()
    try {
      await adminCreateExpense({ ...expenseForm, amount: Number(expenseForm.amount) })
      setExpenseForm(emptyExpense())
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteExpense(id) {
    await adminDeleteExpense(id)
    reload()
  }

  if (!report) return error ? <p className="text-sm text-red-500">{error}</p> : <p className="text-gray-400">กำลังโหลด...</p>

  const w = report.window
  const resolved = report.status_counts.completed + report.status_counts.cancelled + report.status_counts.no_show
  const dayRevenue = report.trend_unit === 'day' && report.trend.length > 0 ? report.revenue.value / report.trend.length : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">ภาพรวมร้าน</h1>
        <p className="text-gray-500 text-sm mt-1">รายได้นับจากคิวที่ "เสร็จแล้ว" ตามวันนัด · ลูกศรเทียบกับช่วงก่อนหน้า</p>
      </div>

      {admin?.role === 'owner' && <BackupReminder />}

      <div className="bg-white rounded-2xl shadow-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="ช่วงเวลาของรายงาน">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${period === p.key ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-600 border-blush-200 hover:bg-blush-50'}`}
            >
              {p.label}
            </button>
          ))}
          {loading && <span className="text-xs text-gray-400 ml-1">กำลังอัปเดต...</span>}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-gray-500" htmlFor="range-from">ตั้งแต่</label>
            <input id="range-from" type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-1.5" />
            <label className="text-gray-500" htmlFor="range-to">ถึง</label>
            <input id="range-to" type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-1.5" />
            <span className="text-xs text-gray-400">เลือกได้ไม่เกิน 366 วัน</span>
          </div>
        )}
        <p className="text-xs text-gray-500">
          กำลังดู <b className="text-gray-700">{w.label}</b> ({fullDate(w.start)} – {fullDate(w.end)}) เทียบกับ {fullDate(w.previous_start)} – {fullDate(w.previous_end)}
        </p>
      </div>

      <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <KpiTile label="รายได้" kpi={report.revenue} accent="text-rose-600" hint={dayRevenue !== null ? `เฉลี่ย ${baht(dayRevenue)} ต่อวัน` : undefined} />
          <KpiTile label="คิวที่เสร็จ" kpi={report.completed_bookings} format={(v) => `${Math.round(v)} คิว`} />
          <KpiTile label="ยอดเฉลี่ยต่อคิว" kpi={report.average_ticket} />
          <KpiTile label="ค่าใช้จ่าย" kpi={report.expenses} invert />
          <KpiTile label="กำไรสุทธิ" kpi={report.net_profit} accent={report.net_profit.value >= 0 ? 'text-green-600' : 'text-red-500'} />
          <SmallTile
            label="ลูกค้าที่ให้บริการ"
            value={`${report.customers_served} คน`}
            sub={report.customers_served > 0 ? `กลับมาซ้ำ ${report.returning_customers} คน (${Math.round((report.returning_customers / report.customers_served) * 100)}%) · ใหม่ ${report.customers_served - report.returning_customers} คน` : 'ยังไม่มีลูกค้าในช่วงนี้'}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SmallTile
            label="รายได้ที่กำลังจะเข้า (คิวที่รอทำตั้งแต่วันนี้)"
            value={baht(report.upcoming_value)}
            sub={`${report.upcoming_count} คิว · รอยืนยันหรือยืนยันแล้ว ยังไม่นับเป็นรายได้จนกว่าจะกด "เสร็จแล้ว"`}
            accent="text-sky-600"
          />
          <SmallTile
            label="คิวของวันนี้ที่ยังไม่ได้ปิด"
            value={`${report.today_pending_count} คิว · ${baht(report.today_pending_value)}`}
            sub={report.today_pending_count > 0 ? 'อย่าลืมกด "เสร็จแล้ว" เมื่อทำเสร็จ ตัวเลขรายได้ถึงจะอัปเดต' : 'ไม่มีคิวค้างของวันนี้'}
            accent={report.today_pending_count > 0 ? 'text-amber-600' : 'text-gray-800'}
          />
        </div>

        <Card title={report.trend_unit === 'month' ? 'รายได้รายเดือน' : 'รายได้รายวัน'}>
          <RevenueChart trend={report.trend} unit={report.trend_unit} />
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="สถานะคิวในช่วงนี้" note={resolved > 0 ? 'อัตราคิดจากคิวที่ปิดสถานะแล้ว (เสร็จ + ยกเลิก + ไม่มา)' : undefined}>
            <StatusBar counts={report.status_counts} />
            {resolved > 0 && (
              <div className="flex gap-3 mt-4">
                <span className="text-xs rounded-full px-3 py-1 bg-gray-100 text-gray-600">ยกเลิก {percentText(report.cancel_rate)}</span>
                <span className={`text-xs rounded-full px-3 py-1 ${report.no_show_rate > 0.1 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>ไม่มา {percentText(report.no_show_rate)}</span>
              </div>
            )}
          </Card>
          <Card title="รายได้แยกตามหมวด" note="เฉพาะคิวที่เสร็จแล้ว">
            <HBars rows={report.by_category} color="bg-rose-400" />
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="วันไหนลูกค้าเยอะ" note="จำนวนคิวต่อวันในสัปดาห์ (ไม่นับคิวที่ยกเลิก) · แท่งเข้ม = เยอะที่สุด">
            <ColumnBars items={report.by_weekday} getLabel={(d) => WEEKDAY_LABELS[d.weekday]} getValue={(d) => d.bookings} />
          </Card>
          <Card title="ช่วงเวลาไหนลูกค้าเยอะ" note="จำนวนคิวตามเวลาเริ่ม (ไม่นับคิวที่ยกเลิก)">
            {report.by_hour.length > 0 ? (
              <ColumnBars items={report.by_hour} getLabel={(h) => `${h.hour}:00`} getValue={(h) => h.bookings} />
            ) : (
              <p className="text-sm text-gray-400">ยังไม่มีข้อมูลในช่วงนี้</p>
            )}
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="บริการที่สร้างรายได้สูงสุด" note="แสดงรายได้ และ (จำนวนคิว)">
            <HBars rows={report.top_services} color="bg-rose-400" />
          </Card>
          <Card title="ค่าใช้จ่ายแยกตามหมวด">
            <HBars rows={report.expenses_by_category} color="bg-amber-400" empty="ยังไม่มีค่าใช้จ่ายในช่วงนี้" />
          </Card>
        </div>

        <SmallTile label="คะแนนรีวิวเฉลี่ย (คิวในช่วงนี้)" value={report.review_count > 0 ? `${report.average_rating} ★ จาก ${report.review_count} รีวิว` : 'ยังไม่มีรีวิวในช่วงนี้'} />
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <p className="font-medium text-gray-700 mb-3">ค่าใช้จ่ายของร้าน</p>
        <form onSubmit={handleAddExpense} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <input type="date" aria-label="วันที่ค่าใช้จ่าย" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          <input type="text" placeholder="หมวดหมู่" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          <input type="number" placeholder="จำนวนเงิน" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" required />
          <input type="text" placeholder="หมายเหตุ" value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
          <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-xl py-2">+ เพิ่มรายการ</button>
        </form>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b border-blush-50">
              <span className="text-gray-500">{e.expense_date} · {e.category} {e.note && `· ${e.note}`}</span>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-800">{Number(e.amount).toLocaleString()} ฿</span>
                <button onClick={() => handleDeleteExpense(e.id)} className="text-gray-300 hover:text-red-500" aria-label="ลบรายการ">✕</button>
              </div>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีรายการค่าใช้จ่าย</p>}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
