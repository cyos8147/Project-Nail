import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { createPortal } from 'react-dom'
import { assetUrl } from '../api/client.js'

// รูปย่อที่กดแล้วเปิดดูเต็มจอได้ (รูปที่ลูกค้าแนบตอนจอง / รูปลองสีจาก AI)
// ปิดได้ด้วยปุ่ม ✕ กดพื้นหลัง หรือปุ่ม Esc และคืนโฟกัสให้รูปย่อเดิมหลังปิด
export default function ZoomableImage({ src: rawSrc, alt, className = '', caption }) {
  const src = assetUrl(rawSrc)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      triggerRef.current?.focus()
    }
  }, [open])

  if (!src) return null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative overflow-hidden cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${className}`}
        title="กดเพื่อดูรูปเต็ม"
        aria-label={`ดูรูปเต็ม: ${alt}`}
      >
        <img loading="lazy" decoding="async" src={src} alt={alt} className="w-full h-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-lg" aria-hidden="true">⤢</span>
        </span>
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-soft transition-colors hover:bg-white"
            aria-label="ปิดรูป"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[82vh] rounded-2xl shadow-2xl object-contain bg-white"
            onClick={(e) => e.stopPropagation()}
          />
          {caption && <p className="mt-3 text-sm text-white/90 text-center max-w-lg">{caption}</p>}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 text-xs text-white/80 underline hover:text-white"
          >
            เปิดรูปในแท็บใหม่
          </a>
        </div>,
        document.body
      )}
    </>
  )
}
