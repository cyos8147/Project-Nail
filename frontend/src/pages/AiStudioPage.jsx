import { useState } from 'react'
import { Link } from 'react-router-dom'
import SkinToneAnalysis from '../components/SkinToneAnalysis.jsx'
import NailRecommendation from '../components/NailRecommendation.jsx'
import AdvancedRecommend from '../components/AdvancedRecommend.jsx'
import VirtualTryOn from '../components/VirtualTryOn.jsx'
import ServerTryOn from '../components/ServerTryOn.jsx'
import ReferenceImageAnalysis from '../components/ReferenceImageAnalysis.jsx'
import Footer from '../components/Footer.jsx'

export default function AiStudioPage() {
  const [skinTone, setSkinTone] = useState(null)
  const [uploadedPhoto, setUploadedPhoto] = useState(null)
  const [tryOnRequestId, setTryOnRequestId] = useState(0)

  function handleAnalyzed({ tone, image }) {
    setSkinTone(tone)
    if (image) setUploadedPhoto(image)
  }

  function handleTryOn({ tone, image }) {
    if (tone) setSkinTone(tone)
    if (image) setUploadedPhoto(image)
    setTryOnRequestId((id) => id + 1)
    document.getElementById('try-on')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blush-50 via-white to-blush-50 text-gray-800 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 -right-32 w-[28rem] h-[28rem] bg-peach/50 rounded-full blur-3xl" />
        <div className="absolute top-[45%] -left-40 w-[26rem] h-[26rem] bg-rose-200/40 rounded-full blur-3xl" />
        <div className="absolute top-[85%] right-0 w-[24rem] h-[24rem] bg-blush-200/60 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-50 bg-blush-50/80 backdrop-blur border-b border-blush-200">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <p className="font-display text-2xl font-bold text-rose-600 whitespace-nowrap">
              Nail<span className="text-gray-800">Glow</span>
            </p>
            <p className="text-sm font-medium text-gray-500 hidden sm:block">✨ AI Beauty Studio</p>
            <Link
              to="/"
              className="bg-white hover:bg-blush-100 text-rose-600 text-sm font-semibold px-4 py-2.5 rounded-full border border-blush-200 transition-colors whitespace-nowrap"
            >
              ← กลับหน้าแรก
            </Link>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
          <span className="inline-block bg-white text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full shadow-card mb-5">
            NailGlow AI Beauty Studio
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-800 leading-tight">
            ให้ AI ช่วยหา<span className="text-rose-500">ลุคเล็บที่ใช่</span>สำหรับคุณ
          </h1>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            วิเคราะห์สีผิว รับคำแนะนำลายจากโมเดล Machine Learning ลองสีบนรูปจริง และหาลายที่ใกล้เคียงจากรูปที่ถูกใจ
            — ครบในที่เดียว
          </p>
        </section>

        <SkinToneAnalysis onAnalyzed={handleAnalyzed} onReset={() => setSkinTone(null)} onTryOn={handleTryOn} />
        <NailRecommendation skinTone={skinTone} />
        <AdvancedRecommend />
        <VirtualTryOn skinTone={skinTone} uploadedPhoto={uploadedPhoto} tryOnRequestId={tryOnRequestId} />
        <ServerTryOn />
        <ReferenceImageAnalysis />

        <Footer />
      </div>
    </div>
  )
}
