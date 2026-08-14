import { useState } from 'react'
import { colorShades } from '../../data/bookingData.js'
import { aiAnalyzeStyle, fileToBase64 } from '../../api/client.js'

export default function ServiceDetails({
  category,
  service,
  selectedShade,
  setSelectedShade,
  imagePreview,
  imageName,
  imageFile,
  onImageChange,
  carriedDesign,
  onClearCarriedDesign,
  onAiAnalyzed,
}) {
  const isHairColor = category === 'hair' && service?.isColor
  const isNail = category === 'nail'
  const [aiStatus, setAiStatus] = useState('idle')
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState(null)

  async function handleAnalyze() {
    if (!imageFile) return
    setAiStatus('loading')
    setAiError(null)
    try {
      const base64 = await fileToBase64(imageFile)
      const res = await aiAnalyzeStyle(base64)
      setAiResult(res)
      setAiStatus('done')
      onAiAnalyzed?.({ styleTag: res.style_tag, extraMinutes: res.extra_minutes })
    } catch (err) {
      setAiError(err.message || 'วิเคราะห์ไม่สำเร็จ ลองรูปอื่นดูนะคะ')
      setAiStatus('error')
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-gray-800 text-center mb-1">
        {isHairColor ? 'เลือกโทนสีที่ต้องการ' : 'แนบรูปลายเล็บที่อยากได้'}
      </h2>
      <p className="text-gray-500 text-center text-sm mb-8">
        {isHairColor
          ? 'เลือกโทนสีคร่าวๆ และแนบรูปตัวอย่างเพิ่มเติมได้ (ไม่บังคับ)'
          : 'แนบรูปตัวอย่างลายเล็บที่อยากทำ เพื่อให้ช่างเตรียมงานได้ตรงใจที่สุด (ไม่บังคับ)'}
      </p>

      {isNail && carriedDesign && (
        <div className="mb-6 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <span className="w-10 h-10 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: carriedDesign.color_hex }} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">ลายที่เลือกจาก AI: {carriedDesign.nail_design_name}</p>
            <p className="text-xs text-gray-400">จะแนบไปกับการจองคิวนี้โดยอัตโนมัติ</p>
          </div>
          <button type="button" onClick={onClearCarriedDesign} className="text-xs text-gray-400 hover:text-rose-500">
            ✕ ล้าง
          </button>
        </div>
      )}

      {isHairColor && (
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-700 mb-3">โทนสียอดนิยม</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {colorShades.map((shade) => {
              const isSelected = selectedShade?.id === shade.id
              return (
                <button
                  key={shade.id}
                  type="button"
                  onClick={() => setSelectedShade(shade)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-colors ${
                    isSelected ? 'bg-rose-50 ring-2 ring-rose-300' : 'hover:bg-blush-100'
                  }`}
                >
                  <span
                    className="w-10 h-10 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: shade.hex }}
                  />
                  <span className="text-[11px] text-gray-600 text-center leading-tight">{shade.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          {isNail ? 'รูปลายเล็บที่อยากทำ' : 'รูปตัวอย่างสีผมที่ต้องการ (ถ้ามี)'}
        </p>
        <label
          htmlFor="refImage"
          className="flex items-center gap-4 border border-dashed border-blush-200 rounded-xl px-4 py-4 cursor-pointer hover:bg-blush-50 transition-colors"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="ตัวอย่างที่แนบ" className="w-16 h-16 object-cover rounded-lg" />
          ) : (
            <span className="w-16 h-16 rounded-lg bg-blush-100 flex items-center justify-center text-xl">📷</span>
          )}
          <span className="text-sm text-gray-500">{imageName || 'คลิกเพื่ออัปโหลดรูปภาพ (JPG, PNG)'}</span>
        </label>
        <input id="refImage" type="file" accept="image/*" onChange={onImageChange} className="hidden" />
      </div>

      {isNail && imageFile && (
        <div className="mt-5 bg-blush-50 border border-blush-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700">ให้ AI วิเคราะห์ลายจากรูปนี้ และประเมินเวลาทำเพิ่มเติม</p>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={aiStatus === 'loading'}
              className="text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 px-4 py-2 rounded-full whitespace-nowrap"
            >
              {aiStatus === 'loading' ? 'กำลังวิเคราะห์...' : '🤖 วิเคราะห์ลาย'}
            </button>
          </div>
          {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
          {aiStatus === 'done' && aiResult && (
            <p className="text-xs text-gray-600 mt-3">
              สไตล์ที่ตรวจพบ: <span className="font-medium text-rose-600">{aiResult.style_tag}</span> ·
              เวลาทำเพิ่มเติมโดยประมาณ +{aiResult.extra_minutes} นาที
            </p>
          )}
        </div>
      )}
    </div>
  )
}
