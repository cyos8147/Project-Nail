import { Link } from 'react-router-dom'
import PopularStylesCard from './PopularStylesCard.jsx'
import Icon from './Icon.jsx'
import HoursCard from './HoursCard.jsx'
import HeroDesignStrip from './HeroDesignStrip.jsx'
import useGloss from './useGloss.js'

// Hero ดีไซน์ใหม่ (ขาวสะอาด): รูปมือทำเล็บเต็มพื้นที่ จางเป็นขาวทางซ้าย · ข้อความวางบนส่วนที่จาง ·
// การ์ดสไลด์ลายเล็บสีขาวเอียงทางขวา · ใต้ปุ่มเป็นการ์ดเวลาทำการ (รวมว่างเร็วสุด)
// รูปเป็นรูปชั่วคราว (public/photos/hero-white.webp) เปลี่ยนเป็นผลงานจริงได้โดยใช้ชื่อไฟล์เดิม
export default function Hero() {
  const glossRef = useGloss()
  return (
    <section id="home" className="relative scroll-mt-24 overflow-hidden">
      {/* รูปมือ: จอใหญ่อยู่ครึ่งขวาเต็มความสูง จางเข้าหาข้อความ / มือถืออยู่ด้านบน จางลงล่าง */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[300px] sm:h-[380px] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[64%]">
        <img
          src="/photos/hero-white.webp"
          alt=""
          width="1800"
          height="1800"
          fetchpriority="high"
          className="h-full w-full object-cover object-[50%_45%] lg:object-[40%_50%] [mask-image:linear-gradient(180deg,#000_55%,transparent)] lg:[mask-image:linear-gradient(90deg,transparent_0%,#000_38%)]"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-[220px] sm:pt-[290px] pb-10 lg:pt-16 lg:pb-20 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)] lg:min-h-[620px]">
        <div className="relative z-10 min-w-0 text-center lg:text-left">
          <h1 className="lucky-fade-up text-[2.1rem]/[1.35] sm:text-5xl/[1.3] xl:text-[3.4rem]/[1.25] font-bold text-[#2E1F26] text-balance">
            <span className="sm:whitespace-nowrap">ลองสีเล็บบนมือคุณ</span>
            <br />
            <span className="sm:whitespace-nowrap">แล้วจองคิวได้ทันที</span>
          </h1>
          <p style={{ animationDelay: '0.08s' }} className="lucky-fade-up mt-1 font-script text-[3rem] sm:text-6xl xl:text-7xl text-[#D6336C] leading-tight">
            It's your style
            <Icon name="heart" className="ml-2 inline-block h-8 w-8 sm:h-10 sm:w-10 -translate-y-2 text-[#D6336C]" strokeWidth={1.4} />
          </p>
          <p style={{ animationDelay: '0.16s' }} className="lucky-fade-up mt-3 max-w-[30rem] mx-auto lg:mx-0 text-[#4B3A42] text-lg leading-8">
            เลือกสีที่ชอบ ลองบนรูปมือตัวเองก่อน ถูกใจแล้วค่อยจองเวลาที่สะดวกได้เลยค่ะ
          </p>

          <HeroDesignStrip className="lucky-fade-up mt-6 sm:hidden" />

          <div style={{ animationDelay: '0.24s' }} className="lucky-fade-up mt-8 hidden sm:flex flex-row items-center justify-center lg:justify-start gap-3">
            <Link ref={glossRef} to="/booking" className="btn-candy lucky-gloss px-8 py-3.5 text-base">
              <Icon name="calendar" /> จองคิวเลย
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <a href="#services" className="btn-candy-soft px-8 py-3.5 text-base">
              ดูบริการและราคา
            </a>
          </div>

          <div style={{ animationDelay: '0.32s' }} className="lucky-fade-up mt-6 flex justify-center lg:justify-start">
            <HoursCard className="w-full sm:w-auto sm:min-w-[26rem]" />
          </div>
        </div>

        <div style={{ animationDelay: '0.18s' }} className="lucky-fade-up relative z-10 hidden sm:block">
          <PopularStylesCard />
        </div>
      </div>
    </section>
  )
}
