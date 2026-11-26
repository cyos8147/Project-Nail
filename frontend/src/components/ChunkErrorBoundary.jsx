import { Component } from 'react'

// หน้าแอดมินโหลดเป็นไฟล์แยก ถ้าเพิ่ง deploy เวอร์ชันใหม่ แท็บที่เปิดค้างไว้จะหาไฟล์เดิมไม่เจอ
// ตัวนี้จับข้อผิดพลาดนั้นแล้วโหลดหน้าใหม่ให้ (ไม่เกินครั้งละ 30 วินาที กันวนรีโหลดด้วย sessionStorage)
// ถ้าไม่ใช่ปัญหาโหลดไฟล์ หรือรีโหลดแล้วยังพัง จะโชว์ข้อความพร้อมปุ่มโหลดใหม่แทนหน้าขาว
const KEY = 'luckysalon_chunk_reload'

function isChunkError(error) {
  const msg = String(error?.message || error || '')
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|Loading chunk/i.test(msg)
}

export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (!isChunkError(error)) return
    let recent = true
    try {
      const last = Number(sessionStorage.getItem(KEY) || 0)
      recent = Date.now() - last < 30000
      if (!recent) sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      recent = true
    }
    if (!recent) window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center text-[#2E1F26]">
        <p className="font-display text-lg font-semibold">โหลดหน้านี้ไม่สำเร็จ</p>
        <p className="max-w-sm text-sm text-[#5B4650]">อาจมีการอัปเดตเว็บไซต์ระหว่างที่เปิดหน้าค้างไว้ ลองโหลดหน้าใหม่อีกครั้งนะคะ</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-candy px-6 py-2.5 text-sm">
          โหลดหน้าใหม่
        </button>
      </div>
    )
  }
}
