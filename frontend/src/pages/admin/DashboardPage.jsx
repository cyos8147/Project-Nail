import { useEffect, useState } from 'react'
import { adminCreateExpense, adminDashboardSummary, adminDeleteExpense, adminListExpenses } from '../../api/client.js'

function StatTile({ label, value, accent = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  )
}

function RevenueChart({ trend }) {
  const max = Math.max(1, ...trend.map((t) => t.revenue))
  const width = 600
  const height = 140
  const barWidth = width / trend.length

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36" preserveAspectRatio="none">
      {trend.map((t, i) => {
        const h = (t.revenue / max) * (height - 10)
        return (
          <rect
            key={t.date}
            x={i * barWidth + 1}
            y={height - h}
            width={Math.max(1, barWidth - 2)}
            height={h}
            fill="#EC4C82"
            opacity={t.revenue > 0 ? 0.85 : 0.15}
          >
            <title>{t.date}: {t.revenue.toLocaleString()} บาท</title>
          </rect>
        )
      })}
    </svg>
  )
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [expenseForm, setExpenseForm] = useState({ expense_date: new Date().toISOString().slice(0, 10), category: 'อื่นๆ', amount: '', note: '' })
  const [error, setError] = useState(null)

  function reload() {
    adminDashboardSummary().then(setSummary).catch((e) => setError(e.message))
    adminListExpenses().then(setExpenses).catch(() => {})
  }

  useEffect(reload, [])

  async function handleAddExpense(e) {
    e.preventDefault()
    try {
      await adminCreateExpense({ ...expenseForm, amount: Number(expenseForm.amount) })
      setExpenseForm({ expense_date: new Date().toISOString().slice(0, 10), category: 'อื่นๆ', amount: '', note: '' })
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteExpense(id) {
    await adminDeleteExpense(id)
    reload()
  }

  if (!summary) return <p className="text-gray-400">กำลังโหลด...</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">ภาพรวมร้าน</h1>
        <p className="text-gray-500 text-sm mt-1">สรุปรายได้ ค่าใช้จ่าย และผลประกอบการ</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="รายได้วันนี้" value={`${summary.revenue_today.toLocaleString()} ฿`} accent="text-rose-600" />
        <StatTile label="รายได้เดือนนี้" value={`${summary.revenue_month.toLocaleString()} ฿`} accent="text-rose-600" />
        <StatTile label="รายได้ปีนี้" value={`${summary.revenue_year.toLocaleString()} ฿`} />
        <StatTile label="คิวที่เสร็จ (เดือนนี้)" value={summary.bookings_count_month} />
        <StatTile label="ค่าใช้จ่ายเดือนนี้" value={`${summary.expenses_month.toLocaleString()} ฿`} />
        <StatTile label="กำไรสุทธิเดือนนี้" value={`${summary.net_profit_month.toLocaleString()} ฿`} accent={summary.net_profit_month >= 0 ? 'text-green-600' : 'text-red-500'} />
        <StatTile label="คะแนนเฉลี่ย" value={`${summary.average_rating || '-'} ★`} />
        <StatTile label="จำนวนรีวิว" value={summary.review_count} />
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <p className="font-medium text-gray-700 mb-3">รายได้ย้อนหลัง 30 วัน</p>
        <RevenueChart trend={summary.revenue_trend} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <p className="font-medium text-gray-700 mb-3">บริการที่สร้างรายได้สูงสุด (เดือนนี้)</p>
          <div className="space-y-2">
            {summary.top_services.map((s) => (
              <div key={s.service_name} className="flex justify-between text-sm">
                <span className="text-gray-600">{s.service_name} ({s.count})</span>
                <span className="font-medium text-rose-600">{s.revenue.toLocaleString()} ฿</span>
              </div>
            ))}
            {summary.top_services.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีข้อมูล</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <p className="font-medium text-gray-700 mb-3">บริการยอดนิยม (ตลอดเวลา)</p>
          <div className="space-y-2">
            {summary.popular_services_report.map((s) => (
              <div key={s.service_name} className="flex justify-between text-sm">
                <span className="text-gray-600">{s.service_name}</span>
                <span className="font-medium text-gray-800">{s.count} ครั้ง</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <p className="font-medium text-gray-700 mb-3">ค่าใช้จ่ายของร้าน</p>
        <form onSubmit={handleAddExpense} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} className="rounded-xl border border-blush-200 px-3 py-2 text-sm" />
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
                <button onClick={() => handleDeleteExpense(e.id)} className="text-gray-300 hover:text-red-500">✕</button>
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
