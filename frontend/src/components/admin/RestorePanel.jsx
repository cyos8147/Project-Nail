import { useState } from 'react'
import { adminApplyRestore, adminDownloadFile, adminPreviewRestore, dataUrlToBase64, fileToBase64, getLastBackupAt } from '../../api/client.js'

// ส่วนที่ 6: สำรองและกู้คืนข้อมูลแบบครบถ้วน (เจ้าของร้านเท่านั้น)
// ลำดับที่บังคับ: 1) สำรองข้อมูลปัจจุบันก่อน 2) เลือกไฟล์แล้วดูตัวอย่าง 3) พิมพ์ "กู้คืน" เพื่อยืนยัน

const CONFIRM_WORD = 'กู้คืน'

const TABLE_LABEL = {
  shop_settings: 'ตั้งค่าร้าน',
  shop_holidays: 'วันหยุดพิเศษ',
  shop_line_recipients: 'ผู้รับแจ้งเตือน LINE',
  service_categories: 'หมวดหมู่บริการ',
  services: 'บริการและราคา',
  nail_designs: 'ลายเล็บ',
  customers: 'ลูกค้า',
  bookings: 'คิวทั้งหมด',
  reviews: 'รีวิว',
  expenses: 'ค่าใช้จ่าย',
}

const thaiStamp = (ms) =>
  new Date(ms).toLocaleString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })

function fileDate(iso) {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : thaiStamp(t)
}

export default function RestorePanel() {
  const [lastBackup, setLastBackup] = useState(() => getLastBackupAt())
  const [busy, setBusy] = useState(null) // 'backup' | 'preview' | 'restore'
  const [message, setMessage] = useState(null)
  const [backupDone, setBackupDone] = useState(false) // ทำให้ขั้นที่ 3 ปลดล็อกได้ก็ต่อเมื่อสำรองแล้วในหน้านี้
  const [file, setFile] = useState(null) // { name, base64 }
  const [preview, setPreview] = useState(null)
  const [confirmText, setConfirmText] = useState('')

  async function downloadFullBackup() {
    setBusy('backup')
    setMessage(null)
    try {
      const name = `luckysalon-restorable-${new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16).replace(/[:T]/g, '-')}.zip`
      await adminDownloadFile('/admin/backup/full.zip', name)
      setLastBackup(getLastBackupAt())
      setBackupDone(true)
      setMessage({ ok: true, text: 'สำรองข้อมูลปัจจุบันแล้ว เก็บไฟล์นี้ไว้ในที่ปลอดภัย' })
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    } finally {
      setBusy(null)
    }
  }

  async function chooseFile(e) {
    const picked = e.target.files?.[0]
    e.target.value = ''
    setPreview(null)
    setConfirmText('')
    setMessage(null)
    if (!picked) return
    if (!picked.name.toLowerCase().endsWith('.zip')) {
      setMessage({ ok: false, text: 'ต้องเป็นไฟล์ .zip ที่ดาวน์โหลดจากปุ่มสำรองแบบกู้คืนได้' })
      return
    }
    setBusy('preview')
    try {
      const base64 = dataUrlToBase64(await fileToBase64(picked))
      setFile({ name: picked.name, base64 })
      setPreview(await adminPreviewRestore(base64))
    } catch (err) {
      setFile(null)
      setMessage({ ok: false, text: err.message })
    } finally {
      setBusy(null)
    }
  }

  async function restore() {
    if (!file || !preview?.ok || confirmText.trim() !== CONFIRM_WORD) return
    setBusy('restore')
    setMessage(null)
    try {
      const result = await adminApplyRestore(file.base64, CONFIRM_WORD)
      setMessage({ ok: true, text: `กู้คืนสำเร็จ: คิว ${result.counts.bookings} รายการ ลูกค้า ${result.counts.customers} คน รีวิว ${result.counts.reviews} รายการ` })
      setFile(null)
      setPreview(null)
      setConfirmText('')
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    } finally {
      setBusy(null)
    }
  }

  const canRestore = Boolean(file && preview?.ok && backupDone && confirmText.trim() === CONFIRM_WORD && busy === null)

  return (
    <div className="space-y-5">
      {/* ขั้นที่ 1: สำรองข้อมูลปัจจุบัน */}
      <div className="rounded-2xl border border-blush-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-800">① สำรองข้อมูลปัจจุบัน</p>
            <p className="text-sm text-gray-500 mt-1">ไฟล์นี้กู้คืนได้ครบ ทั้งลูกค้า คิว รีวิว บริการ และการตั้งค่าร้าน แนะนำให้ทำทุกเดือน และทำก่อนกู้คืนทุกครั้ง</p>
          </div>
          <button
            type="button"
            onClick={downloadFullBackup}
            disabled={busy !== null}
            className="bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 text-white text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap"
          >
            {busy === 'backup' ? 'กำลังเตรียมไฟล์...' : '⬇ สำรองข้อมูล (.zip)'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {lastBackup ? `สำรองล่าสุดจากเครื่องนี้: ${thaiStamp(lastBackup)}` : 'เครื่องนี้ยังไม่เคยสำรองข้อมูล'}
        </p>
      </div>

      {/* ขั้นที่ 2: เลือกไฟล์และดูตัวอย่าง */}
      <div className="rounded-2xl border border-blush-200 bg-white p-5 space-y-3">
        <div>
          <p className="font-semibold text-gray-800">② เลือกไฟล์สำรองที่จะกู้คืน</p>
          <p className="text-sm text-gray-500 mt-1">ระบบจะตรวจไฟล์และแสดงจำนวนข้อมูลให้ดูก่อน ยังไม่แก้ไขข้อมูลใดๆ จนกว่าจะยืนยันในขั้นที่ 3</p>
        </div>
        <label className="block w-full max-w-full cursor-pointer rounded-xl border border-dashed border-blush-200 px-4 py-3 hover:bg-blush-50">
          <input type="file" accept=".zip,application/zip" onChange={chooseFile} disabled={busy !== null} className="block w-full max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blush-100 file:px-3 file:py-1.5 file:text-rose-600" />
        </label>

        {busy === 'preview' && <p className="text-sm text-gray-400">กำลังตรวจไฟล์...</p>}

        {preview && (
          <div className={`rounded-xl border p-4 space-y-3 ${preview.ok ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'}`}>
            <p className="text-sm font-semibold text-gray-800">
              {preview.ok ? '✅ ไฟล์ถูกต้อง พร้อมกู้คืน' : '⛔ ไฟล์มีปัญหา กู้คืนไม่ได้'}
              {file && <span className="font-normal text-gray-500"> · {file.name}</span>}
            </p>
            {fileDate(preview.created_at) && <p className="text-xs text-gray-500">สำรองเมื่อ {fileDate(preview.created_at)}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(preview.counts).map(([key, n]) => (
                <div key={key} className="flex justify-between gap-2 text-xs bg-white rounded-lg border border-blush-100 px-3 py-1.5">
                  <span className="text-gray-600">{TABLE_LABEL[key] || key}</span>
                  <span className="font-semibold text-gray-800">{n}</span>
                </div>
              ))}
            </div>
            {preview.problems.length > 0 && (
              <ul className="text-xs text-red-600 list-disc pl-5 space-y-0.5">
                {preview.problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ขั้นที่ 3: ยืนยันและกู้คืน */}
      <div className="rounded-2xl border border-red-200 bg-red-50/30 p-5 space-y-3">
        <div>
          <p className="font-semibold text-red-700">③ กู้คืนข้อมูล (แทนที่ข้อมูลทั้งหมดในระบบ)</p>
          <p className="text-sm text-gray-600 mt-1">
            ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่ด้วยข้อมูลในไฟล์ ข้อมูลที่เพิ่มหลังวันที่สำรองจะหายไป ถ้าพลาดให้กู้คืนจากไฟล์สำรองขั้นที่ 1
          </p>
        </div>
        {!backupDone && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ต้องสำรองข้อมูลปัจจุบันในขั้นที่ 1 ก่อน จึงจะกู้คืนได้
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`พิมพ์ "${CONFIRM_WORD}" เพื่อยืนยัน`}
            aria-label="คำยืนยันการกู้คืน"
            disabled={!preview?.ok || !backupDone}
            className="rounded-xl border border-red-200 px-3 py-2 text-sm w-full sm:w-56 disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={restore}
            disabled={!canRestore}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            {busy === 'restore' ? 'กำลังกู้คืน...' : 'กู้คืนข้อมูลจากไฟล์นี้'}
          </button>
        </div>
      </div>

      {message && <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-500'}`} role="status">{message.ok ? '✅ ' : ''}{message.text}</p>}
    </div>
  )
}
