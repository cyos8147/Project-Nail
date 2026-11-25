import { Link } from 'react-router-dom'
import PopularStylesCard from './PopularStylesCard.jsx'
import Icon from './Icon.jsx'
import { GlassHeart, Sparkle } from './Decor.jsx'

// Hero ตามภาพตัวอย่าง: ข้อความซ้าย · รูปมือทำเล็บกลาง (มีวงโคจรประกาย) · การ์ดลายเล็บยอดนิยมขวา
// รูปมือเป็นรูปชั่วคราว (public/photos/hero-hand.webp) เปลี่ยนเป็นผลงานจริงได้โดยใช้ชื่อไฟล์เดิม

function HeroHand() {
  return (
    <div aria-hidden="true" className="relative h-[520px] xl:h-[580px] -mx-16 xl:-mx-24 pointer-events-none select-none">
      <img
        src="/photos/hero-hand.webp"
        alt=""
        width="1000"
        height="1498"
        fetchpriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[50%_62%]"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse 46% 52% at 50% 56%, #000 52%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 46% 52% at 50% 56%, #000 52%, transparent 100%)',
        }}
      />
      {/* วงโคจรเส้นแสงรอบมือ */}
      <svg viewBox="0 0 600 300" className="absolute left-[-6%] top-[44%] w-[112%] -rotate-[14deg]" fill="none">
        <ellipse cx="300" cy="150" rx="292" ry="96" stroke="#fff" strokeOpacity="0.9" strokeWidth="2.5" />
        <ellipse cx="300" cy="150" rx="292" ry="96" stroke="#F9B4CE" strokeOpacity="0.6" strokeWidth="7" />
      </svg>
      <Sparkle className="absolute left-[14%] top-[64%] w-9 text-white drop-shadow-[0_0_10px_rgba(255,255,255,1)]" />
      <Sparkle className="absolute right-[18%] top-[14%] w-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]" />
      <GlassHeart className="absolute right-[12%] top-[2%] w-20 rotate-12" />
      <GlassHeart className="absolute left-[30%] bottom-[4%] w-10 -rotate-12" />
    </div>
  )
}

export default function Hero() {
  return (
    <section id="home" className="relative scroll-mt-24">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pt-10 lg:pt-2 lg:pb-6 grid items-center gap-10 md:grid-cols-2 lg:grid-cols-[1.1fr_0.8fr_1fr] lg:gap-6">
        <div className="relative z-10 text-center md:text-left">
          <h1 className="lucky-fade-up font-display text-[2.15rem]/[1.4] sm:text-5xl/[1.4] lg:text-[2.4rem]/[1.4] xl:text-[2.75rem]/[1.4] font-semibold text-[#3D2230] text-balance [text-shadow:0_2px_0_rgba(255,255,255,0.7)]">
            <span className="sm:whitespace-nowrap">ลองสีเล็บบนมือคุณ</span>
            <br />
            <span className="sm:whitespace-nowrap">แล้วจองคิวได้ทันที</span>
          </h1>
          <p style={{ animationDelay: '0.08s' }} className="lucky-fade-up mt-1 font-script text-[3.2rem] sm:text-6xl xl:text-7xl text-rose-500 leading-tight [text-shadow:0_2px_0_rgba(255,255,255,0.8)]">
            It's your style
            <Icon name="heart" className="ml-2 inline-block h-8 w-8 sm:h-10 sm:w-10 -translate-y-2 text-rose-400" strokeWidth={1.5} />
          </p>
          <p style={{ animationDelay: '0.16s' }} className="lucky-fade-up mt-3 max-w-[30rem] mx-auto md:mx-0 text-[#6E4255] text-lg leading-8">
            ดูราคาบริการ เลือกเวลาที่ว่าง และลองสีเล็บบนรูปมือของคุณเองได้ในเว็บเดียว
          </p>

          <div style={{ animationDelay: '0.24s' }} className="lucky-fade-up mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-start gap-3">
            <Link to="/booking" className="btn-candy px-9 py-3.5 text-base">
              <Icon name="calendar" /> จองคิวออนไลน์
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <a href="#popular" className="glass inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-3.5 font-display font-semibold text-rose-600 hover:text-rose-700">
              ดูลายเล็บยอดนิยม
            </a>
          </div>
        </div>

        <div className="hidden lg:block lucky-fade-up" style={{ animationDelay: '0.1s' }}>
          <HeroHand />
        </div>

        <div style={{ animationDelay: '0.18s' }} className="lucky-fade-up relative z-10">
          <PopularStylesCard />
        </div>
      </div>
    </section>
  )
}
