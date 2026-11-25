import { useEffect, useState } from 'react'
import { getNailDesigns } from '../../api/client.js'

// รูปย่อของลายที่ลูกค้าเลือกมาจากหน้าแรก/แกลเลอรี (แสดงผลอย่างเดียว ไม่แตะข้อมูลการจอง)
// หารูปไม่เจอหรือโหลดไม่ได้: ใช้สีของลายแทน
export default function CarriedDesignThumb({ designId, name, fallbackHex }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let alive = true
    getNailDesigns()
      .then((list) => {
        const d = (list || []).find((x) => String(x.id) === String(designId))
        if (alive && d?.image_url) setSrc(d.image_url)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [designId])

  return src ? (
    <img src={src} alt={name ? `ลาย ${name}` : 'ลายที่เลือก'} className="h-16 w-16 flex-shrink-0 rounded-xl border-2 border-white object-cover shadow-[0_8px_16px_-10px_rgba(150,40,85,0.6)]" />
  ) : (
    <span className="h-14 w-14 flex-shrink-0 rounded-xl border border-black/10" style={{ backgroundColor: fallbackHex || '#F4C6CE' }} />
  )
}
