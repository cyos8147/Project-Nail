import { useEffect, useState } from 'react'
import { getReviews } from '../api/client.js'
import { Link } from 'react-router-dom'
import { Bone } from './Skeleton.jsx'
import StarRow from './Stars.jsx'
import SectionTitle from './SectionTitle.jsx'
import Icon from './Icon.jsx'
import { SatinBow } from './Decor.jsx'

// แสดงเฉพาะรีวิวจริงจากระบบ (ไม่มีรีวิวตัวอย่างที่แต่งขึ้น)

function Stars({ count }) {
  return (
    <StarRow count={count} />
  )
}

export default function Reviews({ embedded = false }) {
  const [reviews, setReviews] = useState(null) // null = กำลังโหลด

  useEffect(() => {
    getReviews(6)
      .then((data) => {
        if (!data?.length) {
          setReviews([])
        } else {
          setReviews(
            data.map((r) => ({
              name: r.customer_name || 'ลูกค้า Lucky Salon',
              rating: r.rating,
              text: r.comment || r.service_name || '',
              photo_url: r.photo_url,
            }))
          )
        }
      })
      .catch(() => setReviews([]))
  }, [])

  return (
    <section id="reviews" className={`scroll-mt-24 ${embedded ? '' : 'py-16'}`}>
      <div className={embedded ? '' : 'max-w-6xl mx-auto px-4 sm:px-6'}>
        <SectionTitle title="รีวิวจากลูกค้า" sub="จากลูกค้าที่ใช้บริการและรีวิวผ่านเว็บนี้" />

        {reviews && reviews.length === 0 && (
          <div className={`relative rounded-[24px] glass p-8 text-center ${embedded ? '' : 'mx-auto max-w-md'}`}>
            <SatinBow className="pointer-events-none absolute -top-7 -right-5 w-20 rotate-[16deg]" />
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-rose-400 shadow-[inset_0_1px_0_#fff,0_8px_18px_-10px_rgba(150,40,85,0.55)]">
              <Icon name="heart" className="h-7 w-7" />
            </span>
            <p className="font-display text-lg font-semibold text-[#4A2A37]">ยังไม่มีรีวิว</p>
            <p className="mt-1 text-sm text-[#7A4A5E]">ใช้บริการแล้ว มาเล่าให้เราฟังได้ที่หน้าประวัติของฉัน</p>
            <Link to="/history" className="btn-candy-soft mt-5 px-5 py-2.5 text-sm">
              ไปที่ประวัติของฉัน
            </Link>
          </div>
        )}

        <div className={`grid gap-5 ${embedded ? 'sm:grid-cols-2' : 'md:grid-cols-3'}`} aria-busy={!reviews}>
          {!reviews &&
            Array.from({ length: embedded ? 2 : 3 }, (_, i) => (
              <div key={i} aria-hidden="true" className="rounded-[24px] glass p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Bone className="w-10 h-10 !rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-4 w-1/2" />
                    <Bone className="h-3 w-1/3" />
                  </div>
                </div>
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-4/5" />
              </div>
            ))}
          {(reviews || []).map((r, i) => (
            <div key={`${r.name}-${i}`} className="rounded-[24px] glass p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center font-display font-semibold text-berry">
                  {r.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-[#4A2A37] text-sm">{r.name}</p>
                  <Stars count={r.rating} />
                </div>
              </div>
              <p className="text-[#7A4A5E] text-sm leading-relaxed">{r.text}</p>
              {r.photo_url && (
                <img loading="lazy" decoding="async" src={r.photo_url} alt="ผลงานจากรีวิว" className="mt-3 rounded-xl w-full h-32 object-cover" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
