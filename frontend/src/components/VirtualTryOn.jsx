import { useEffect, useMemo, useRef, useState } from 'react'
import { TONE_INFO } from '../data/skinTones.js'
import { detectHandLandmarks, preloadHandLandmarker } from '../utils/handDetection.js'
import { segmentNailsFromCanvas, buildNailMask, NAIL_SHAPES, DEFAULT_SHAPE_ID } from '../utils/nailSegmentation.js'

const baseNailColors = [
  { name: 'Nude', hex: '#E8C39E' },
  { name: 'Pink', hex: '#F2A6C0' },
  { name: 'Red', hex: '#C0392B' },
  { name: 'Coral', hex: '#FF7F6B' },
  { name: 'Wine', hex: '#6E1F2A' },
  { name: 'Black', hex: '#2B2620' },
  { name: 'Sky Blue', hex: '#8FC1E3' },
  { name: 'Mint', hex: '#9FD8C8' },
]

const styleOptions = [
  { id: 'solid', label: 'สีพื้น' },
  { id: 'french', label: 'French Tip' },
  { id: 'glitter', label: 'กากเพชร' },
  { id: 'ombre', label: 'ไล่เฉด' },
]

const NATURAL_NAIL = '#F0CBAE'
const MAX_WORKING_DIM = 900 // จำกัดความละเอียดของ canvas ที่ใช้ประมวลผล เพื่อความไว ไม่กระทบความแม่นยำตำแหน่ง

// ===== ภาพประกอบมือ (โหมดไม่มีรูปจริง) =====
const ILLUSTRATION_NAILS = [
  { id: 'thumb', cx: 34, cy: 168, rx: 13, ry: 17, rotate: -35 },
  { id: 'index', cx: 79, cy: 78, rx: 12, ry: 16, rotate: 0 },
  { id: 'middle', cx: 111, cy: 56, rx: 12, ry: 17, rotate: 0 },
  { id: 'ring', cx: 143, cy: 66, rx: 12, ry: 16, rotate: 0 },
  { id: 'pinky', cx: 172, cy: 92, rx: 10, ry: 14, rotate: 0 },
]

// ความกว้างครึ่งหนึ่ง (v บวก) ของทรงเล็บที่ตำแหน่ง u (ระยะตามแนวยาวจากศูนย์กลาง) — สูตรเดียวกับ
// nailBoundaryDistance ใน nailSegmentation.js แต่คลี่ออกมาเป็น "เส้นขอบ" ตรงๆ สำหรับวาด SVG path
function nailHalfWidthAt(u, p) {
  if (u < -p.Lback) return 0
  const t = Math.max(0, Math.min(1, (u + p.Lback) / (p.Lback + p.Lfront)))
  const hw = p.tipHalfWidth + (p.baseHalfWidth - p.tipHalfWidth) * Math.pow(1 - t, p.shapePower)
  const r = Math.min(p.tipHalfWidth * p.tipCornerFrac, p.tipHalfWidth)
  if (r > 0.6 && u > p.Lfront - r) {
    const cu = u - (p.Lfront - r)
    const cv = Math.sqrt(Math.max(0, r * r - cu * cu))
    return hw - r + cv
  }
  return hw
}

// สร้างเส้นขอบทรงเล็บ (SVG path) จากค่าพารามิเตอร์ทรงเดียวกับที่ใช้วาดบนรูปจริง (nailSegmentation.js)
// เพื่อให้ภาพประกอบมือแสดงทรงเล็บ (มน/เหลี่ยม/อัลมอนด์ ฯลฯ) ตรงกับที่จะเห็นในโหมด "รูปของฉัน"
function illustrationNailPath(cx, cy, rx, ry, shapeId) {
  const shape = NAIL_SHAPES.find((s) => s.id === shapeId) ?? NAIL_SHAPES[0]
  const p = {
    Lback: ry * 0.85,
    Lfront: ry * (shape.lengthRatio ?? 1),
    baseHalfWidth: rx,
    tipHalfWidth: rx * (shape.tipWidthRatio ?? 1),
    shapePower: shape.shapePower ?? 1,
    tipCornerFrac: shape.tipCornerFrac ?? 1,
  }
  const steps = 20
  const rightPts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = -p.Lback + t * (p.Lback + p.Lfront)
    rightPts.push([cx + nailHalfWidthAt(u, p), cy - u])
  }
  const leftPts = rightPts.map(([x, y]) => [cx - (x - cx), y]).reverse()
  return (
    [...rightPts, ...leftPts]
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ') + ' Z'
  )
}

function IllustrationNail({ id, cx, cy, rx, ry, rotate = 0, color, shapeId }) {
  const transform = rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined
  const d = illustrationNailPath(cx, cy, rx, ry, shapeId)
  if (color.style === 'french') {
    return (
      <g transform={transform}>
        <clipPath id={`clip-${id}`}>
          <path d={d} />
        </clipPath>
        <path d={d} fill="#F5DFC8" />
        <rect x={cx - rx} y={cy - ry * (NAIL_SHAPES.find((s) => s.id === shapeId)?.lengthRatio ?? 1)} width={rx * 2} height={ry * 0.6} fill="white" clipPath={`url(#clip-${id})`} />
      </g>
    )
  }
  if (color.style === 'ombre') {
    return <path d={d} fill="url(#ombreGradient)" transform={transform} />
  }
  if (color.style === 'glitter') {
    return (
      <g transform={transform}>
        <path d={d} fill={color.hex} />
        <circle cx={cx - rx * 0.4} cy={cy - ry * 0.3} r={1.3} fill="white" opacity="0.9" />
        <circle cx={cx + rx * 0.3} cy={cy + ry * 0.2} r={1.1} fill="white" opacity="0.8" />
        <circle cx={cx} cy={cy + ry * 0.5} r={1} fill="white" opacity="0.75" />
        <circle cx={cx + rx * 0.4} cy={cy - ry * 0.45} r={1} fill="white" opacity="0.85" />
      </g>
    )
  }
  return <path d={d} fill={color.hex} transform={transform} />
}

function HandIllustration({ showAfter, selectedColor, selectedStyle, selectedShape }) {
  const activeColor = showAfter ? { hex: selectedColor, style: selectedStyle } : { hex: NATURAL_NAIL, style: 'solid' }
  return (
    <svg viewBox="0 0 240 300" className="w-full max-w-[260px] mx-auto">
      <defs>
        <linearGradient id="ombreGradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={selectedColor} />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
      </defs>
      <rect x="58" y="150" width="126" height="128" rx="46" fill="#F6D8BC" />
      <rect x="14" y="128" width="42" height="92" rx="21" fill="#F6D8BC" transform="rotate(-35 35 168)" />
      <rect x="64" y="62" width="30" height="98" rx="15" fill="#F6D8BC" />
      <rect x="96" y="40" width="30" height="118" rx="15" fill="#F6D8BC" />
      <rect x="128" y="50" width="30" height="108" rx="15" fill="#F6D8BC" />
      <rect x="158" y="76" width="27" height="82" rx="13.5" fill="#F6D8BC" />
      {ILLUSTRATION_NAILS.map((n) => (
        <IllustrationNail key={n.id} {...n} color={activeColor} shapeId={selectedShape} />
      ))}
    </svg>
  )
}

// ===== เรนเดอร์สีลงบน "มาสก์เล็บจริง" ที่ตรวจจับได้อัตโนมัติ (ไม่ใช่วงรีตายตัว ไม่ต้องลากปรับเอง) =====

function directionalGradient(ctx, w, h, ux, uy, stops) {
  const cx = w / 2
  const cy = h / 2
  const len = Math.max(w, h)
  const x0 = cx - ux * (len / 2)
  const y0 = cy - uy * (len / 2)
  const x1 = cx + ux * (len / 2)
  const y1 = cy + uy * (len / 2)
  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const [offset, col] of stops) grad.addColorStop(offset, col)
  return grad
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// วาดสีลงบนเล็บนิ้วเดียว โดย clip ด้วยมาสก์รูปทรงเล็บจริงที่ตรวจจับได้ (destination-in)
//
// จุดสำคัญของความสมจริง: แทนที่จะทาสีทึบแบนๆ ทับเล็บไปเลย เราทาสีพื้นทึบตามที่เลือกก่อน แล้วเอา
// พิกเซลเล็บจริงจากรูปถ่าย (ทำให้ขาวดำ + ลดคอนทราสต์ด้วย ctx.filter ก่อน) มาผสมทับแบบ
// globalCompositeOperation = 'hard-light' ผลคือบริเวณที่เล็บจริงมีแสงสะท้อน/ไฮไลท์จะทำให้สีที่ทาสว่างขึ้น
// เล็กน้อย และบริเวณเงา/ความโค้งนิ้วจะทำให้สีเข้มขึ้นเล็กน้อยตามจริง เหมือนสีถูก "เคลือบ" บนหน้าเล็บจริง
// ที่มีมิติ ไม่ใช่สติกเกอร์แบนแปะทับ — ลดคอนทราสต์ของภาพเงาก่อนผสม (contrast 0.55) เพื่อไม่ให้แสงสะท้อน
// จ้าๆ ในรูป (เช่นไฟในร้าน, พื้นกระเบื้อง) ทำให้สีที่เลือกไว้จางลงเป็นสีอ่อนเกินจริง สีเข้มที่เลือกไว้
// (เช่นแดงเข้ม/ไวน์/ดำ) จะยังคงเข้มใกล้เคียงของจริงที่เลือก ไม่ใช่แค่คงสี "ไม่จางเป็นเทา" แบบเดิม
function drawStyledNail(ctx, nail, color, style, sourceCanvas) {
  const { w, h, x, y, ux, uy, maskCanvas } = nail
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext('2d')

  // สไตล์ French Tip ใช้สีที่ผู้ใช้เลือกเป็นพื้นเสมอ (ไม่ล็อกเป็นสีนู้ดตายตัว) แล้วค่อยเติมปลายขาวทับ
  tctx.fillStyle = color
  tctx.fillRect(0, 0, w, h)

  if (sourceCanvas) {
    tctx.save()
    tctx.filter = 'grayscale(1) contrast(0.55) brightness(1.05)'
    tctx.globalCompositeOperation = 'hard-light'
    tctx.globalAlpha = 0.85
    tctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h)
    tctx.restore()
  }

  if (style === 'french') {
    tctx.fillStyle = directionalGradient(tctx, w, h, ux, uy, [
      [0, 'rgba(255,255,255,0)'],
      [0.58, 'rgba(255,255,255,0)'],
      [0.64, 'rgba(255,255,255,0.95)'],
      [1, 'rgba(255,255,255,0.95)'],
    ])
    tctx.fillRect(0, 0, w, h)
  } else if (style === 'ombre') {
    tctx.fillStyle = directionalGradient(tctx, w, h, ux, uy, [
      [0, hexToRgba(color, 0)],
      [1, 'rgba(255,255,255,0.8)'],
    ])
    tctx.fillRect(0, 0, w, h)
  } else if (style === 'glitter') {
    tctx.fillStyle = 'rgba(255,255,255,0.92)'
    const dots = [
      [0.32, 0.28],
      [0.62, 0.52],
      [0.36, 0.72],
      [0.66, 0.3],
    ]
    for (const [fx, fy] of dots) {
      tctx.beginPath()
      tctx.arc(fx * w, fy * h, Math.max(1, w * 0.07), 0, Math.PI * 2)
      tctx.fill()
    }
  }

  // เคลือบมันเงาบางๆ ทับอีกชั้น (นอกเหนือจากมิติที่ได้จาก hard-light blend ด้านบนแล้ว)
  tctx.fillStyle = directionalGradient(tctx, w, h, ux, uy, [
    [0, 'rgba(255,255,255,0.12)'],
    [0.5, 'rgba(255,255,255,0)'],
    [1, 'rgba(0,0,0,0.06)'],
  ])
  tctx.fillRect(0, 0, w, h)

  // ตัดรูปทรงตามมาสก์เล็บจริง (ทำให้สีไปอยู่แค่บริเวณหน้าเล็บ ไม่ล้นออกไปโดนผิวหนัง)
  tctx.globalCompositeOperation = 'destination-in'
  tctx.drawImage(maskCanvas, 0, 0)

  ctx.drawImage(tmp, x, y)
}

function buildWorkingCanvas(img) {
  const scale = Math.min(1, MAX_WORKING_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  return canvas
}

function ensureImageLoaded(img) {
  return new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) return resolve()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('image-load-failed'))
  })
}

export default function VirtualTryOn({ skinTone, uploadedPhoto, tryOnRequestId }) {
  const recommended = skinTone ? TONE_INFO[skinTone].colors : []
  const recommendedHexes = new Set(recommended.map((c) => c.hex))
  const nailColors = [
    ...recommended.map((c) => ({ ...c, recommended: true })),
    ...baseNailColors.filter((c) => !recommendedHexes.has(c.hex)),
  ]

  const [selectedColor, setSelectedColor] = useState(nailColors[0].hex)
  const [selectedStyle, setSelectedStyle] = useState('solid')
  const [selectedShape, setSelectedShape] = useState(DEFAULT_SHAPE_ID)
  const [showAfter, setShowAfter] = useState(true) // ใช้กับโหมดภาพประกอบเท่านั้น (โหมดรูปจริงใช้สไลเดอร์ก่อน/หลังแทน)
  const [comparePos, setComparePos] = useState(55) // % ตำแหน่งเส้นแบ่งก่อน/หลังในโหมดรูปจริง
  const [savedLooks, setSavedLooks] = useState([])
  const [mode, setMode] = useState('illustration') // illustration | photo
  const [localPhoto, setLocalPhoto] = useState(null)
  const [imgAspect, setImgAspect] = useState(null)
  const [detection, setDetection] = useState({ status: 'idle', nails: [], canvasW: 0, canvasH: 0 })
  // ตำแหน่ง/ขนาด/ทิศทางเล็บที่ผู้ใช้ปรับเองทับผล AI ตรวจจับ (คีย์ด้วย finger id) — เผื่อ AI เดาไม่ตรง
  // เป๊ะกับรูปจริง ผู้ใช้ลากแก้ไขเองได้เสมอ ไม่ต้องพึ่งความแม่นยำของ AI ล้วนๆ
  const [manualPriors, setManualPriors] = useState({})
  const [adjustMode, setAdjustMode] = useState(false)

  const imgRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const previewBoxRef = useRef(null)
  const detectedForRef = useRef(null)
  const lastRequestId = useRef(tryOnRequestId)
  const sourceCanvasRef = useRef(null)

  const activePhoto = localPhoto || uploadedPhoto

  // เตรียม AI ตรวจจับมือ (MediaPipe) ไว้ล่วงหน้าตั้งแต่เปิดหน้านี้
  useEffect(() => {
    preloadHandLandmarker()
  }, [])

  async function runDetection() {
    const img = imgRef.current
    if (!img) return
    setDetection({ status: 'detecting', nails: [], canvasW: 0, canvasH: 0 })
    try {
      await ensureImageLoaded(img)
      setImgAspect(`${img.naturalWidth} / ${img.naturalHeight}`)
      const landmarks = await detectHandLandmarks(img)
      if (!landmarks) {
        setDetection({ status: 'no-hand', nails: [], canvasW: 0, canvasH: 0 })
        return
      }
      const workingCanvas = buildWorkingCanvas(img)
      sourceCanvasRef.current = workingCanvas
      const nails = await segmentNailsFromCanvas(workingCanvas, landmarks)
      setManualPriors({})
      setAdjustMode(false)
      setDetection({ status: 'done', nails, canvasW: workingCanvas.width, canvasH: workingCanvas.height })
    } catch (err) {
      setDetection({ status: 'error', nails: [], canvasW: 0, canvasH: 0 })
    }
  }

  // ตรวจจับอัตโนมัติทันทีที่เข้าโหมด "รูปของฉัน" (แคชผลไว้ ไม่ตรวจซ้ำถ้ารูปเดิม)
  useEffect(() => {
    if (mode !== 'photo' || !activePhoto) return
    if (detectedForRef.current === activePhoto) return
    detectedForRef.current = activePhoto
    runDetection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activePhoto])

  function handleRedetect() {
    detectedForRef.current = activePhoto
    runDetection()
  }

  function handleLocalPhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalPhoto(URL.createObjectURL(file))
    setMode('photo')
  }

  // กด "ลองสีเล็บกับรูปนี้เลย" จากผลวิเคราะห์สีผิว -> สลับมาโหมดรูปจริง + เลือกสีแนะนำอันดับ 1 ให้อัตโนมัติ
  useEffect(() => {
    if (tryOnRequestId && tryOnRequestId !== lastRequestId.current) {
      lastRequestId.current = tryOnRequestId
      if (uploadedPhoto || localPhoto) setMode('photo')
      if (recommended.length > 0) setSelectedColor(recommended[0].hex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tryOnRequestId])

  // สร้างมาสก์ทรงเล็บใหม่ทุกครั้งที่เปลี่ยน "ทรงเล็บ" หรือมีผลตรวจจับตำแหน่งเล็บชุดใหม่ (ไม่ต้องรัน AI
  // ตรวจจับมือซ้ำ แค่คำนวณ mask จาก prior เดิม จึงสลับทรงเล็บได้ทันที) ถ้าผู้ใช้ลากปรับตำแหน่ง/ขนาด/
  // ทิศทางเล็บนิ้วไหนเองแล้ว (manualPriors) ใช้ค่าที่ปรับแทนค่าที่ AI ตรวจจับได้สำหรับนิ้วนั้น
  const nailMasks = useMemo(() => {
    if (detection.status !== 'done') return []
    const shape = NAIL_SHAPES.find((s) => s.id === selectedShape) ?? NAIL_SHAPES[0]
    return detection.nails.map((n) => {
      const prior = manualPriors[n.id] || n.prior
      return { ...n, prior, ...buildNailMask(prior, shape) }
    })
  }, [detection, selectedShape, manualPriors])

  // ---- ลากปรับตำแหน่ง/ขนาด/ทิศทางเล็บเอง (เผื่อ AI ตรวจจับไม่ตรงกับรูปจริงเป๊ะ) ----
  // แปลงพิกัดเมาส์/นิ้วบนหน้าจอ ให้เป็นพิกัดพิกเซลในระบบเดียวกับ workingCanvas ที่ตรวจจับเล็บไว้
  function clientToCanvasPoint(clientX, clientY) {
    const rect = previewBoxRef.current.getBoundingClientRect()
    const scaleX = detection.canvasW / rect.width
    const scaleY = detection.canvasH / rect.height
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  // kind: 'move' ลากจุดกึ่งกลางเพื่อขยับตำแหน่ง, 'resize' ลากจุดปลายเล็บเพื่อปรับขนาด+ทิศทางพร้อมกัน
  function startNailDrag(fingerId, kind) {
    function onMove(e) {
      const pt = clientToCanvasPoint(e.clientX, e.clientY)
      const baseNail = detection.nails.find((n) => n.id === fingerId)
      if (!baseNail) return
      setManualPriors((prev) => {
        const current = prev[fingerId] || baseNail.prior
        if (kind === 'move') {
          return { ...prev, [fingerId]: { ...current, cx: pt.x, cy: pt.y } }
        }
        const dx = pt.x - current.cx
        const dy = pt.y - current.cy
        const dist = Math.max(4, Math.hypot(dx, dy))
        const ux = dx / dist
        const uy = dy / dist
        const aspect = baseNail.prior.W / baseNail.prior.L
        return { ...prev, [fingerId]: { ...current, ux, uy, vx: -uy, vy: ux, L: dist, W: dist * aspect } }
      })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function handleResetAdjustments() {
    setManualPriors({})
  }

  // วาดสีทับมาสก์เล็บจริงใหม่ทุกครั้งที่เปลี่ยนสี/สไตล์/ทรง/ผลตรวจจับ — วาด "หลัง" ไว้เต็มภาพเสมอ
  // ส่วนการเทียบก่อน/หลังในโหมดรูปจริงทำผ่านสไลเดอร์ (clip-path) ที่ระดับ JSX แทน ไม่ต้องเคลียร์ทิ้ง
  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas || mode !== 'photo' || detection.status !== 'done') return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const nail of nailMasks) {
      drawStyledNail(ctx, nail, selectedColor, selectedStyle, sourceCanvasRef.current)
    }
  }, [mode, nailMasks, selectedColor, selectedStyle, detection.status])

  // ลากเส้นแบ่งก่อน/หลังในโหมดรูปจริง (คล้าย before/after slider ทั่วไป)
  function startCompareDrag() {
    function onMove(e) {
      const rect = previewBoxRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setComparePos(Math.max(0, Math.min(100, pct)))
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function handleDownloadResult() {
    const src = sourceCanvasRef.current
    const overlay = overlayCanvasRef.current
    if (!src || !overlay) return
    const out = document.createElement('canvas')
    out.width = src.width
    out.height = src.height
    const octx = out.getContext('2d')
    octx.drawImage(src, 0, 0)
    octx.drawImage(overlay, 0, 0)
    const link = document.createElement('a')
    link.href = out.toDataURL('image/png')
    link.download = 'nailglow-try-on.png'
    link.click()
  }

  const currentColorName = nailColors.find((c) => c.hex === selectedColor)?.name ?? 'กำหนดเอง'
  const currentStyleLabel = styleOptions.find((s) => s.id === selectedStyle)?.label ?? ''
  const currentShapeLabel = NAIL_SHAPES.find((s) => s.id === selectedShape)?.label ?? ''

  function handleSaveLook() {
    setSavedLooks((prev) => {
      const exists = prev.some((l) => l.color === selectedColor && l.style === selectedStyle && l.shape === selectedShape)
      if (exists) return prev
      return [
        ...prev,
        { id: `${selectedColor}-${selectedStyle}-${selectedShape}-${Date.now()}`, color: selectedColor, style: selectedStyle, shape: selectedShape },
      ]
    })
  }

  function handleRemoveLook(id) {
    setSavedLooks((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <section id="try-on" className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-4">
        <span className="inline-block bg-blush-100 text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          Virtual Nail Try-On
        </span>
        <h2 className="font-display text-3xl font-bold text-gray-800">ลองสีและลายเล็บก่อนจองจริง</h2>
        <p className="text-gray-500 mt-2">
          AI จะตรวจจับรูปทรงเล็บจริงในรูปของคุณ แล้วลงสีเต็มหน้าเล็บให้อัตโนมัติ ไม่ต้องลากปรับเอง
        </p>
      </div>

      {skinTone && (
        <div className="max-w-2xl mx-auto mt-6 bg-white border border-blush-200 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-card">
          <span className="text-xl">✨</span>
          <p className="text-sm text-gray-600">
            จากผลวิเคราะห์สีผิว: <span className="font-semibold text-rose-600">{TONE_INFO[skinTone].label}</span> เราเลือกสีที่แนะนำไว้ให้ก่อนแล้ว
            สังเกตป้าย "แนะนำ" บนสีด้านล่าง
          </p>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-card p-6 sm:p-10 mt-8">
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex bg-blush-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => setMode('illustration')}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-colors ${
                mode === 'illustration' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              ภาพประกอบ
            </button>
            <button
              type="button"
              onClick={() => activePhoto && setMode('photo')}
              disabled={!activePhoto}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === 'photo' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
              }`}
              title={activePhoto ? 'ใช้รูปมือของคุณ' : 'อัปโหลดรูปมือก่อน'}
            >
              รูปของฉัน (AI ตรวจจับเล็บ) {!activePhoto && '🔒'}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {/* Preview */}
          <div className="bg-blush-50 rounded-2xl flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center justify-center p-8">
              {mode === 'illustration' ? (
                <HandIllustration
                  showAfter={showAfter}
                  selectedColor={selectedColor}
                  selectedStyle={selectedStyle}
                  selectedShape={selectedShape}
                />
              ) : (
                <div
                  ref={previewBoxRef}
                  className={`relative w-full rounded-2xl overflow-hidden ${adjustMode ? '' : 'select-none'}`}
                  style={{ aspectRatio: imgAspect || '3 / 4' }}
                >
                  <img
                    ref={imgRef}
                    src={activePhoto}
                    alt="รูปมือของคุณ"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                  {/* เผยเฉพาะฝั่งขวาของเส้นแบ่งเป็น "หลัง" (สีที่ทาแล้ว) ฝั่งซ้ายเป็นรูปเดิมเปล่าๆ */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ clipPath: `inset(0 0 0 ${comparePos}%)` }}
                  >
                    <canvas
                      ref={overlayCanvasRef}
                      width={detection.canvasW || 1}
                      height={detection.canvasH || 1}
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>

                  {detection.status === 'done' && (
                    <>
                      <div
                        className="absolute top-0 bottom-0 w-[3px] bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] cursor-ew-resize touch-none"
                        style={{ left: `${comparePos}%`, transform: 'translateX(-50%)' }}
                        onPointerDown={(e) => {
                          e.preventDefault()
                          startCompareDrag()
                        }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center text-rose-500 text-xs">
                          ⇔
                        </div>
                      </div>
                      <span className="absolute top-3 left-3 bg-black/40 text-white text-[10px] font-semibold px-2 py-1 rounded-full pointer-events-none">
                        ก่อน
                      </span>
                      <span className="absolute top-3 right-3 bg-rose-500/90 text-white text-[10px] font-semibold px-2 py-1 rounded-full pointer-events-none">
                        หลัง
                      </span>
                    </>
                  )}

                  {adjustMode && detection.status === 'done' && (
                    <svg
                      viewBox={`0 0 ${detection.canvasW} ${detection.canvasH}`}
                      className="absolute inset-0 w-full h-full touch-none"
                    >
                      {nailMasks.map((n) => {
                        const tipX = n.prior.cx + n.prior.ux * n.prior.L
                        const tipY = n.prior.cy + n.prior.uy * n.prior.L
                        return (
                          <g key={n.id}>
                            <line
                              x1={n.prior.cx}
                              y1={n.prior.cy}
                              x2={tipX}
                              y2={tipY}
                              stroke="white"
                              strokeWidth={Math.max(1, detection.canvasW * 0.002)}
                              strokeDasharray="4 3"
                              opacity={0.85}
                            />
                            <circle
                              cx={n.prior.cx}
                              cy={n.prior.cy}
                              r={Math.max(6, detection.canvasW * 0.014)}
                              fill="rgba(236,76,130,0.9)"
                              stroke="white"
                              strokeWidth={2}
                              className="cursor-move"
                              onPointerDown={(e) => {
                                e.preventDefault()
                                startNailDrag(n.id, 'move')
                              }}
                            />
                            <circle
                              cx={tipX}
                              cy={tipY}
                              r={Math.max(5, detection.canvasW * 0.011)}
                              fill="white"
                              stroke="rgba(236,76,130,0.9)"
                              strokeWidth={2}
                              className="cursor-nwse-resize"
                              onPointerDown={(e) => {
                                e.preventDefault()
                                startNailDrag(n.id, 'resize')
                              }}
                            />
                          </g>
                        )
                      })}
                    </svg>
                  )}

                  {detection.status === 'detecting' && (
                    <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 text-center px-6">
                      <div className="w-10 h-10 border-4 border-blush-200 border-t-rose-500 rounded-full animate-spin" />
                      <p className="text-sm text-gray-600">AI กำลังตรวจจับรูปทรงเล็บ... (ครั้งแรกอาจใช้เวลาสักครู่)</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* แถบล่างของพรีวิว: สลับก่อน/หลัง (ภาพประกอบ) หรือสไลด์เทียบก่อน/หลัง (รูปจริง) + สถานะการตรวจจับ */}
            <div className="border-t border-blush-200/70 bg-white/50 px-6 py-4">
              {mode === 'illustration' && (
                <div className="flex items-center justify-center gap-4">
                  <span className={`w-9 text-right text-sm font-medium ${!showAfter ? 'text-rose-600' : 'text-gray-400'}`}>ก่อน</span>
                  <button
                    type="button"
                    onClick={() => setShowAfter((v) => !v)}
                    className="relative w-14 h-8 rounded-full bg-rose-200 transition-colors flex-shrink-0"
                    aria-label="สลับดูก่อน/หลัง"
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-rose-500 shadow-sm transition-transform ${
                        showAfter ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`w-9 text-left text-sm font-medium ${showAfter ? 'text-rose-600' : 'text-gray-400'}`}>หลัง</span>
                </div>
              )}

              {mode === 'illustration' ? (
                <label
                  htmlFor="tryOnPhotoInput"
                  className="block mt-3 text-center text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  📷 อัปโหลดรูปมือของฉันเพื่อลองสีบนรูปจริง
                </label>
              ) : (
                <div className="flex flex-col items-center gap-2 mt-3">
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    {detection.status === 'no-hand' && (
                      <p className="text-xs text-amber-600">AI ตรวจไม่พบมือในรูปนี้ ลองรูปที่เห็นฝ่ามือ/นิ้วชัดเจน</p>
                    )}
                    {detection.status === 'error' && <p className="text-xs text-red-500">เกิดข้อผิดพลาดระหว่างตรวจจับเล็บ</p>}
                    {(detection.status === 'no-hand' || detection.status === 'error' || detection.status === 'done') && (
                      <button type="button" onClick={handleRedetect} className="text-xs font-semibold text-gray-400 hover:text-rose-500">
                        ↻ ตรวจจับใหม่
                      </button>
                    )}
                    <label htmlFor="tryOnPhotoInput" className="text-xs font-semibold text-gray-400 hover:text-rose-500 cursor-pointer">
                      📷 เปลี่ยนรูป
                    </label>
                    {detection.status === 'done' && (
                      <button
                        type="button"
                        onClick={() => setAdjustMode((v) => !v)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                          adjustMode ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-rose-500'
                        }`}
                      >
                        ✋ {adjustMode ? 'เสร็จแล้ว' : 'ปรับตำแหน่ง/ขนาดเล็บเอง'}
                      </button>
                    )}
                    {adjustMode && Object.keys(manualPriors).length > 0 && (
                      <button type="button" onClick={handleResetAdjustments} className="text-xs font-semibold text-gray-400 hover:text-rose-500">
                        ⟲ รีเซ็ตเป็นค่า AI
                      </button>
                    )}
                    {detection.status === 'done' && (
                      <button type="button" onClick={handleDownloadResult} className="text-xs font-semibold text-gray-400 hover:text-rose-500">
                        💾 บันทึกรูป
                      </button>
                    )}
                  </div>
                  {adjustMode && (
                    <p className="text-[11px] text-gray-400 text-center px-4">
                      ลากจุดสีชมพูกลางเล็บเพื่อขยับตำแหน่ง ลากจุดขาวที่ปลายเล็บเพื่อปรับขนาด/ทิศทางให้พอดีกับเล็บจริงทีละนิ้ว
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <input id="tryOnPhotoInput" type="file" accept="image/*" onChange={handleLocalPhotoChange} className="hidden" />

          {/* Controls */}
          <div className="bg-blush-50/60 rounded-2xl p-6 sm:p-7 flex flex-col">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">เลือกสี</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-x-2 gap-y-4">
                {nailColors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className={`relative flex flex-col items-center gap-1.5 ${selectedColor === c.hex ? '' : 'opacity-80'}`}
                  >
                    {c.recommended && (
                      <span className="absolute -top-1.5 -right-0.5 z-10 bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        แนะนำ
                      </span>
                    )}
                    <span
                      className={`w-10 h-10 rounded-full border shadow-sm transition-transform ${
                        selectedColor === c.hex ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-blush-50 scale-105' : 'border-black/10'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[10px] text-gray-500 text-center leading-tight">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">เลือกสไตล์</p>
              <div className="flex flex-wrap gap-2">
                {styleOptions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStyle(s.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedStyle === s.id ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 hover:bg-blush-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">เลือกทรงเล็บ</p>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {NAIL_SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedShape(s.id)}
                    title={s.label}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors ${
                      selectedShape === s.id ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-blush-200 text-gray-500 hover:bg-blush-100'
                    }`}
                  >
                    <svg viewBox="0 0 32 44" className="w-4 h-6" aria-hidden="true">
                      <path
                        d={illustrationNailPath(16, 28, 9, 13, s.id)}
                        fill={selectedShape === s.id ? '#ffffff' : '#c48a94'}
                      />
                    </svg>
                    <span className="text-[9px] leading-tight text-center">{s.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-7">
              <div className="flex items-center justify-center mb-4">
                <span className="inline-flex items-center gap-1.5 bg-white text-xs text-gray-500 px-3 py-1.5 rounded-full border border-blush-200">
                  กำลังดู <span className="font-semibold text-gray-700">{currentColorName} · {currentStyleLabel} · {currentShapeLabel}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSaveLook}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-full shadow-card transition-colors"
              >
                ♡ บันทึกลายที่ชอบ
              </button>

              {savedLooks.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">ลายที่บันทึกไว้</p>
                  <div className="flex flex-wrap gap-2">
                    {savedLooks.map((look) => {
                      const styleLabel = styleOptions.find((s) => s.id === look.style)?.label
                      const shapeLabel = NAIL_SHAPES.find((s) => s.id === look.shape)?.label.split(' ')[0]
                      return (
                        <div key={look.id} className="flex items-center gap-2 bg-white border border-blush-200 rounded-full pl-1.5 pr-3 py-1.5">
                          <span className="w-6 h-6 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: look.color }} />
                          <span className="text-xs text-gray-600">{styleLabel} · {shapeLabel}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLook(look.id)}
                            className="text-gray-400 hover:text-rose-500 text-xs ml-1"
                            aria-label="ลบลายนี้"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-6 text-center">
          * ตรวจจับรูปทรงเล็บจริงจากพิกเซลในรูปด้วย AI (MediaPipe) ประมวลผลบนเบราว์เซอร์ของคุณทั้งหมด ไม่มีการอัปโหลดรูปไปเซิร์ฟเวอร์
        </p>
      </div>
    </section>
  )
}
