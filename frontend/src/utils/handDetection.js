// ตรวจจับตำแหน่งมือ/นิ้วแบบ client-side ด้วย MediaPipe Hand Landmarker
// โมเดล + wasm โหลดจาก CDN สาธารณะของ Google ตอนใช้งานครั้งแรก (แคชไว้ในเบราว์เซอร์หลังจากนั้น)
// รูปภาพของผู้ใช้ไม่ถูกอัปโหลดหรือส่งออกไปที่ไหน — mediapipe ประมวลผลบนเครื่องผู้ใช้ทั้งหมด (on-device inference)

const VISION_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

let landmarkerPromise = null

async function createLandmarker(delegate) {
  const vision = await import(/* @vite-ignore */ VISION_MODULE_URL)
  const { HandLandmarker, FilesetResolver } = vision
  const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE_URL)
  return HandLandmarker.createFromOptions(filesetResolver, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'IMAGE',
    numHands: 1,
  })
}

function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker('GPU').catch(() => createLandmarker('CPU'))
  }
  return landmarkerPromise
}

// เรียกใช้งานล่วงหน้าได้ (เช่นตอนเปิดหน้าทดลองสีเล็บ) เพื่อให้โมเดลพร้อมก่อนผู้ใช้กดตรวจจับจริง
export function preloadHandLandmarker() {
  loadLandmarker().catch(() => {})
}

// รับ HTMLImageElement ที่โหลดเสร็จแล้ว คืนค่า landmark 21 จุด (นิ้วโป้ง-ก้อย) ของมือที่มั่นใจที่สุด หรือ null ถ้าไม่พบมือ
export async function detectHandLandmarks(imageElement) {
  const landmarker = await loadLandmarker()
  const result = landmarker.detect(imageElement)
  if (!result?.landmarks?.length) return null
  return result.landmarks[0]
}
