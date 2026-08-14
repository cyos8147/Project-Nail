import { useEffect, useState } from 'react'
import { adminCustomerDetail, adminSearchCustomers } from '../../api/client.js'

export default function AdminCustomersPage() {
  const [q, setQ] = useState('')
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  function load() {
    setLoading(true)
    adminSearchCustomers(q).then(setCustomers).finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function openDetail(customer) {
    const detail = await adminCustomerDetail(customer.id)
    setSelected(detail)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">ลูกค้า</h1>
        <p className="text-gray-500 text-sm mt-1">ค้นหาลูกค้าจากชื่อหรือเบอร์โทร ดูประวัติการใช้บริการทั้งหมด</p>
      </div>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="ค้นหาชื่อหรือเบอร์โทร"
          className="flex-1 rounded-xl border border-blush-200 px-4 py-2.5 text-sm"
        />
        <button onClick={load} className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 rounded-xl">ค้นหา</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card divide-y divide-blush-50 max-h-[560px] overflow-y-auto">
          {loading && <p className="text-sm text-gray-400 p-4">กำลังโหลด...</p>}
          {!loading && customers.length === 0 && <p className="text-sm text-gray-400 p-4">ไม่พบลูกค้า</p>}
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => openDetail(c)}
              className={`w-full text-left p-4 hover:bg-blush-50 transition-colors ${selected?.customer.id === c.id ? 'bg-blush-50' : ''}`}
            >
              <div className="flex justify-between items-center">
                <p className="font-medium text-gray-800 text-sm">{c.name || '(ไม่ระบุชื่อ)'}</p>
                {c.line_linked && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full">LINE เชื่อมแล้ว</span>}
              </div>
              <p className="text-xs text-gray-400">{c.phone} · จองแล้ว {c.booking_count} ครั้ง</p>
            </button>
          ))}
        </div>

        <div>
          {!selected && <p className="text-sm text-gray-400 p-4">เลือกลูกค้าทางซ้ายเพื่อดูรายละเอียด</p>}
          {selected && (
            <div className="bg-white rounded-2xl shadow-card p-5 space-y-5">
              <div>
                <p className="font-display text-lg font-bold text-gray-800">{selected.customer.name || '(ไม่ระบุชื่อ)'}</p>
                <p className="text-sm text-gray-500">{selected.customer.phone} · Line: {selected.customer.line_id || '-'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">ประวัติการจอง ({selected.bookings.length})</p>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selected.bookings.map((b) => (
                    <div key={b.id} className="text-xs border-b border-blush-50 pb-2">
                      <p className="text-gray-700">{b.service_name} · {b.booking_date} · {b.status}</p>
                      {b.reference_image_url && <img src={b.reference_image_url} className="w-12 h-12 rounded mt-1 object-cover" alt="" />}
                    </div>
                  ))}
                  {selected.bookings.length === 0 && <p className="text-xs text-gray-400">ยังไม่มีประวัติ</p>}
                </div>
              </div>

              {selected.tryon_history.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">ประวัติทดลองลายเล็บ (AI)</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.tryon_history.map((t) => (
                      t.result_image_url && <img key={t.id} src={t.result_image_url} className="w-14 h-14 rounded-lg object-cover" alt="" />
                    ))}
                  </div>
                </div>
              )}

              {selected.reviews.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">รีวิวที่เคยให้</p>
                  {selected.reviews.map((r) => (
                    <p key={r.id} className="text-xs text-gray-600">{'★'.repeat(r.rating)} {r.comment}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
