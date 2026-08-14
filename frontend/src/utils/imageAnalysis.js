// ยูทิลิตี้วิเคราะห์รูปภาพแบบ client-side ล้วนๆ (ไม่มีการส่งรูปออกจากเบราว์เซอร์)
// ใช้ทั้งกับ AI วิเคราะห์สีผิว และ AI วิเคราะห์ลายเล็บจากรูปอ้างอิง

function loadImagePixels(file, size = 60) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, size, size)
      let data
      try {
        data = ctx.getImageData(0, 0, size, size).data
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
        return
      }
      URL.revokeObjectURL(url)
      resolve(data)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image-load-failed'))
    }
    img.src = url
  })
}

// วิเคราะห์สีผิวเฉลี่ย — ใช้ใน SkinToneAnalysis
export async function analyzeAverageColor(file) {
  const data = await loadImagePixels(file, 60)
  let r = 0, g = 0, b = 0, count = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count++
  }
  if (count === 0) throw new Error('no-pixels')
  return { r: r / count, g: g / count, b: b / count }
}

export function classifySkinTone({ r, g, b }) {
  const warmth = (r - b) / 255
  if (warmth > 0.12) return 'warm'
  if (warmth < 0.04) return 'cool'
  return 'neutral'
}

// วิเคราะห์ "สไตล์" ของลายเล็บจากรูปอ้างอิง — ใช้ใน ReferenceStyleAnalysis
// อิงจากความอิ่มตัวของสีเฉลี่ย (saturation) และความหลากหลายของความสว่างในภาพ (variance)
// เป็น heuristic ง่ายๆ ไม่ใช่การรู้จำลวดลายจริง เหมาะสำหรับ demo
export async function analyzeReferenceStyle(file) {
  const data = await loadImagePixels(file, 60)
  let count = 0
  let sumSat = 0
  const lightnessValues = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    sumSat += sat
    lightnessValues.push((r + g + b) / 3)
    count++
  }
  if (count === 0) throw new Error('no-pixels')

  const avgSaturation = sumSat / count
  const meanLightness = lightnessValues.reduce((a, v) => a + v, 0) / count
  const variance = lightnessValues.reduce((a, v) => a + (v - meanLightness) ** 2, 0) / count
  const normVariance = Math.min(1, Math.sqrt(variance) / 128)

  let styleTag
  if (avgSaturation < 0.28 && normVariance < 0.22) styleTag = 'minimal'
  else if (avgSaturation > 0.5 || normVariance > 0.4) styleTag = 'bold'
  else styleTag = 'classic'

  return { styleTag, saturation: avgSaturation, variance: normVariance }
}
