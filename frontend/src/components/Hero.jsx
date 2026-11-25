import { Link } from 'react-router-dom'
import PopularStylesCard from './PopularStylesCard.jsx'
import Icon from './Icon.jsx'

// Hero แบบแบ่งซ้าย/ขวา: ข้อความบอกสิ่งที่ร้านทำจริง + การ์ดลายเล็บ 3D (จุดเด่นของหน้า)
// ลอยขึ้นครั้งเดียวตอนเปิดหน้า เหลื่อมกันทีละนิด (stagger 60ms)
export default function Hero() {
  return (
    <section id="home" className="relative">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-center lg:text-left">
          <p className="lucky-fade-up text-sm text-gray-600">Lucky Salon · ร้านทำผม ทำเล็บ</p>
          <h1 style={{ animationDelay: '0.06s' }} className="lucky-fade-up mt-4 font-display text-4xl/[1.4] sm:text-5xl/[1.4] font-semibold text-gray-800 text-balance">
            ลองสีเล็บบนมือคุณ
            <br />
            แล้วจองคิวได้ทันที
          </h1>
          <p style={{ animationDelay: '0.12s' }} className="lucky-fade-up mt-2 font-script text-5xl sm:text-6xl text-rose-500 leading-tight">It's your style</p>
          <p style={{ animationDelay: '0.18s' }} className="lucky-fade-up mt-4 max-w-[36rem] mx-auto lg:mx-0 text-gray-600 text-lg leading-8">
            ดูราคาบริการ เลือกเวลาที่ว่าง และลองสีเล็บบนรูปมือของคุณเองได้ในเว็บเดียว
          </p>

          <div style={{ animationDelay: '0.24s' }} className="lucky-fade-up mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
            <Link to="/booking" className="btn-candy px-8 py-3.5 text-base">
              <Icon name="calendar" /> จองคิวออนไลน์
            </Link>
            <a href="#popular" className="btn-candy-soft px-8 py-3.5 text-base">
              ดูลายเล็บยอดนิยม
            </a>
          </div>
        </div>

        <div style={{ animationDelay: '0.18s' }} className="lucky-fade-up relative">
          <PopularStylesCard />
        </div>
      </div>
    </section>
  )
}
