import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNailDesigns } from '../api/client.js'
import { saveCarryDesign } from '../utils/carryDesign.js'

// มือถือ: แถวรูปผลงานเล็บใต้หัวข้อ ให้ลูกค้าใหม่ที่มาเพราะรูปผลงานเห็นงานจริงตั้งแต่จอแรก
// แตะรูปไหนก็จองลายนั้นได้เลย (เหมือนการ์ดลายเล็บด้านล่าง) ไม่มีรูปจริงก็ไม่แสดง
export default function HeroDesignStrip({ className = '' }) {
  const [designs, setDesigns] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getNailDesigns()
      .then((list) => setDesigns((list || []).filter((d) => d.image_url && d.active !== false).slice(0, 6)))
      .catch(() => {})
  }, [])

  if (!designs.length) return null

  function book(d) {
    saveCarryDesign({ source: 'design', nail_design_id: d.id, nail_design_name: d.name, color_hex: d.color_hex, summary: d.name })
    navigate('/booking')
  }

  return (
    <ul aria-label="ผลงานเล็บของร้าน" className={`-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 snap-x [scrollbar-width:none] ${className}`}>
      {designs.map((d) => (
        <li key={d.id} className="w-[30%] max-w-[7.5rem] shrink-0 snap-start">
          <button type="button" onClick={() => book(d)} aria-label={`จองลาย ${d.name}`} className="block w-full rounded-[16px] bg-white/85 p-1 text-left shadow-[0_10px_20px_-14px_rgba(150,40,85,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400">
            <img src={d.image_url} alt="" loading="lazy" decoding="async" className="aspect-square w-full rounded-[12px] object-cover" />
            <span className="block truncate px-1 pt-1 text-xs font-medium text-[#4A2A37]">{d.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
