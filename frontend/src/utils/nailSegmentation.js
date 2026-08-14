// สร้าง "มาสก์รูปทรงเล็บ" ของแต่ละนิ้วแบบอัตโนมัติเต็มรูปแบบ (ไม่ต้องลากปรับเอง)
//
// หมายเหตุ: เคยลองเพิ่ม GrabCut ผ่าน OpenCV.js เป็นชั้นตรวจจับหลักมาก่อน แต่ไฟล์ OpenCV.js มีขนาด
// ใหญ่มาก (หลาย MB) การโหลด+แปลงเป็น WebAssembly ตอนเปิดหน้าทำให้เบราว์เซอร์หน่วง/ค้างได้ในบางเครื่อง
// จึงตัดออก เหลือเฉพาะวิธีที่เบากว่าและเสถียรกว่าด้านล่างนี้แทน (ยังคงไม่ต้องลากปรับเอง):
//
//   1) Region-growing ทีละก้าว — ไล่สีจากจุดกึ่งกลางเล็บที่ประมาณไว้ (จาก AI ตรวจจับมือ) ออกไป
//      เทียบสีแบบ "ทีละก้าวกับพิกเซลข้างเคียงที่ยอมรับแล้ว" (ไม่ใช่เทียบกับจุดเริ่มต้นจุดเดียวตายตัว)
//      เพื่อให้ทนต่อแสงสะท้อน/เงาไล่สีบนหน้าเล็บซึ่งเป็นเรื่องปกติของรูปถ่ายจริง แล้ววัด "ขอบเขตจริง"
//      (ตำแหน่ง/ความยาว/ความกว้าง) ของเล็บนั้นจากผลที่ไล่สีได้
//   2) ประมาณการตามสัดส่วนกายวิภาค (วงรีตามตำแหน่งข้อนิ้ว) — ใช้เป็นค่าตั้งต้นเสมอ และเป็นทางเลือก
//      สุดท้ายเมื่อ region-growing ล้มเหลว (เช่น เล็บกับผิวสีใกล้กันมากจนแยกไม่ออก)
//
// ผลลัพธ์ของขั้นตอนนี้คือ "prior" ของแต่ละนิ้ว (ตำแหน่งศูนย์กลาง/ทิศทาง/ความยาว-กว้างของเล็บจริง
// ที่ตรวจพบในรูปนั้นๆ) เท่านั้น — ยังไม่ใช่มาสก์สุดท้าย เพราะ "ทรงเล็บ" ที่จะวาด (มน/เหลี่ยม/อัลมอนด์ ฯลฯ)
// เป็นสิ่งที่ผู้ใช้เลือกเองได้ต่างหาก ไม่เกี่ยวกับตำแหน่งเล็บจริงที่ตรวจเจอ การแยกสองส่วนนี้ออกจากกัน
// ทำให้สลับทรงเล็บได้ทันที (แค่วาดมาสก์ใหม่จาก prior เดิม) โดยไม่ต้องรัน AI ตรวจจับมือซ้ำ

const FINGERS = [
  { id: 'thumb', label: 'โป้ง', tip: 4, joint: 3 },
  { id: 'index', label: 'ชี้', tip: 8, joint: 7 },
  { id: 'middle', label: 'กลาง', tip: 12, joint: 11 },
  { id: 'ring', label: 'นาง', tip: 16, joint: 15 },
  { id: 'pinky', label: 'ก้อย', tip: 20, joint: 19 },
]

// สัดส่วนเล็บเทียบกับความยาวข้อนิ้วสุดท้าย (joint ถึง tip) จากกายวิภาคทั่วไป — ค่าประมาณการเริ่มต้น
// (จุดเริ่มค้นหา ไม่ใช่คำตอบสุดท้าย — region-growing ด้านล่างจะปรับตำแหน่ง/ขนาดจริงจากรูปอีกที)
//
// ค่าที่ใช้ก่อนหน้านี้ (CENTER_T=0.68, LENGTH_RATIO=0.34) ทำให้เล็บที่ประมาณไว้ยาวคลุมเกือบเต็มข้อนิ้ว
// สุดท้าย (ตั้งแต่ 34% ถึง 102% ของความยาว joint-to-tip คือยาวเลยปลายนิ้วไปด้วยซ้ำ) ซึ่งยาวเกินจริงมาก
// เทียบกับเล็บจริง (เล็บส่วนที่มองเห็นได้มักอยู่แค่ราวครึ่งหลังของปลายนิ้ว ตั้งแต่ประมาณ 50% ถึง 95%
// ของความยาวข้อนิ้วสุดท้าย) ปรับใหม่ให้สอดคล้องสัดส่วนจริงมากขึ้น (ตรวจสอบด้วยรูปสังเคราะห์ที่รู้ตำแหน่ง
// เล็บล่วงหน้าใน accuracy_test — ดูหมายเหตุท้ายไฟล์)
const CENTER_T = 0.725
const LENGTH_RATIO = 0.225
const WIDTH_RATIO = 0.85

// กรอบค้นหา (ROI) รอบเล็บแต่ละนิ้ว
const ROI_BACK = 0.55
const ROI_FORWARD = 1.9
const ROI_HALF_WIDTH = 1.8

// region-growing — ค่าเดิม (30, 95) หลวมเกินไป: ขอบเล็บ-ผิวหนังจริงมักมีแถบไล่สีเบลอบางๆ 1-2 พิกเซล
// (กล้องเบลอ/แสงไล่ระดับ/ความโค้งเล็บ) ทำให้ก้าวสั้นๆ ทีละพิกเซลผ่านแถบเบลอนั้นแอบ "รั่ว" จากเล็บไปยัง
// ผิวหนังได้ทั้งที่ผลรวมสีต่างกันชัดเจน (ตรวจพบจากการทดสอบด้วยรูปสังเคราะห์ที่รู้คำตอบล่วงหน้า) ทำให้
// ไล่สีจนกลายเป็นก้อนผิวหนังขนาดใหญ่ผิดตำแหน่ง ปรับให้เข้มงวดขึ้นมากเพื่อกันการรั่วนี้
const LOCAL_STEP_THRESHOLD = 18
const ABS_SEED_THRESHOLD = 48
// เพดานจำนวนพิกเซลสูงสุดที่ยอมให้ไล่สีได้ (เทียบกับพื้นที่วงรีเล็บที่คาดไว้) กันไว้อีกชั้นเผื่อธรณีประตู
// สีข้างต้นยังไม่พอ ถ้าไล่จนเกินนี้แปลว่าหลุดออกนอกเล็บแน่ๆ ตัดทิ้งทันทีแทนที่จะปล่อยให้ไล่ต่อจนเต็ม ROI
const MAX_FILL_AREA_MULTIPLIER = 5

// เกณฑ์ความน่าเชื่อถือของขอบเขตที่ตรวจพบ
const MIN_POINTS = 25
const TRIM_PERCENT = 0.03
// ระยะขยายผลไล่สีดิบ แยกตามแกนความยาว/ความกว้าง — ทิศทางความยาว (ปลายเล็บ-โคนเล็บ) มักถูกไล่สีตัด
// สั้นกว่าจริงมากกว่าทิศทางความกว้าง (เพราะไฮไลท์/เงามักเรียงตามแนวยาวนิ้วตามแสงที่ตกกระทบ) จึงต้อง
// ขยายชดเชยมากกว่า
const EXTENT_MARGIN_L = 1.55
const EXTENT_MARGIN_W = 1.15
const MIN_SCALE = 0.4
const MAX_SCALE = 2.3
// น้ำหนักของผลไล่สีเทียบกับค่าประมาณการกายวิภาค ตอนผสมเป็นค่าสุดท้าย (1 = เชื่อผลไล่สีล้วนๆ,
// 0 = ใช้ค่ากายวิภาคล้วนๆ) ดูหมายเหตุที่ extentsFromPoints() — แยกน้ำหนักตามแกน เพราะความน่าเชื่อถือ
// ของค่าประมาณการกายวิภาคไม่เท่ากันทุกแกน: ตำแหน่ง/ความยาวคำนวณจากจุดข้อต่อ+สัดส่วนที่ปรับเทียบไว้
// พอเชื่อถือได้ระดับหนึ่ง แต่ "ความกว้าง" ประมาณจากความยาวเล็บคูณอัตราส่วนคงที่ (ไม่ได้วัดความกว้าง
// นิ้วจริงจาก landmark) จึงแม่นน้อยกว่าอีก 2 แกน ควรเชื่อผลไล่สีที่วัดความกว้างจริงจากรูปมากกว่า
const BLEND_WEIGHT_CENTER = 0.7
const BLEND_WEIGHT_LENGTH = 0.6
const BLEND_WEIGHT_WIDTH = 0.85

// จุดเริ่ม (seed) หลายจุดตามแนวยาวเล็บที่ประมาณไว้ (สัดส่วนของ L จากจุดกึ่งกลาง) — ลองมากกว่า 1 จุด
// เผื่อจุดกึ่งกลางที่ประมาณจากกายวิภาคไม่ได้ตกอยู่บนเล็บจริงเป๊ะ (นิ้วโค้งงอ/ถ่ายเอียง/สัดส่วนคนไม่ตรง
// ค่าเฉลี่ย) ถ้าลองแค่จุดเดียวแล้วจุดนั้นดันตกบนผิวหนังแทน จะไล่สีลามไปเป็นก้อนผิวหนังผิดๆ ที่ใหญ่/
// เพี้ยนตำแหน่งไปเลย (นี่คือสาเหตุหลักที่เคยทำให้ตำแหน่ง/ขนาดเล็บไม่ตรงรูปจริง)
const SEED_OFFSETS = [0, 0.35, -0.35, 0.65]

// เกณฑ์แยก "เล็บจริง" ออกจากผิวหนังรอบๆ — ถ้าสีของก้อนที่ไล่ได้กับสีผิวรอบๆ ใกล้กันเกินไป (ต่ำกว่าค่านี้)
// แปลว่าไล่สีหลุดไปโดนผิวหนังแทนเล็บ (หรือเล็บเปล่าไม่มีสีทาแยกไม่ออกจริงๆ) ไม่นำผลนั้นมาใช้
const MIN_NAIL_SKIN_CONTRAST = 16

// ถ้าขอบเขตที่ไล่สีได้ชนขอบเขต ROI เกือบเต็ม (ไม่ได้หยุดเพราะเจอขอบสีจริง แต่เพราะชนกำแพงค้นหา)
// แปลว่าไล่สีลามออกไปแบบไม่หยุด (มักเกิดตอนเผลอไล่เข้าไปในผิวหนังเป็นบริเวณกว้าง) ไม่น่าเชื่อถือ
const WALL_CLIP_RATIO = 0.92

// ===== นิยาม "ทรงเล็บ" ที่เลือกได้ =====
// lengthRatio  : ยืดปลายเล็บ (ด้านหัวนิ้ว) ออกจากตำแหน่งเล็บจริงเท่าไร (จำลองเล็บต่อ/เล็บยาว)
//                ด้านโคนเล็บ (ใต้ผิวหนัง) ไม่ยืด เพื่อไม่ให้ทาสีล้ำเข้าไปในตำแหน่งที่ควรเป็นผิวหนัง
// tipWidthRatio: ความกว้างที่ปลายเล็บเทียบกับความกว้างที่โคนเล็บ (1 = กว้างเท่าเดิมตลอด, น้อยกว่า 1 = โค้งเรียวเข้า)
// shapePower   : ความเร็วในการโค้งเรียว (น้อยกว่า 1 = กว้างไว้เกือบตลอดความยาวแล้วโค้งหุบเร็วช่วงปลายสุด
//                คล้ายทรงวงรี, ประมาณ 1 = เรียวเป็นเส้นตรงคล้ายทรงกรวย)
// tipCornerFrac: ความโค้งมนของมุมปลายเล็บ (สัดส่วนของ tipWidthRatio, 1 = มนเต็มที่แบบครึ่งวงกลม,
//                ค่าน้อย = ปลายตัดตรงมีมุมมนเล็กน้อยเท่านั้น) มีผลจริงเฉพาะทรงที่ปลายยังกว้างพอสมควร
export const NAIL_SHAPES = [
  { id: 'round', label: 'มน (Round)', lengthRatio: 1.0, tipWidthRatio: 1.0, shapePower: 1, tipCornerFrac: 1.0 },
  { id: 'oval', label: 'ไข่ (Oval)', lengthRatio: 1.16, tipWidthRatio: 0.6, shapePower: 0.45, tipCornerFrac: 1.0 },
  { id: 'square', label: 'เหลี่ยม (Square)', lengthRatio: 1.05, tipWidthRatio: 1.0, shapePower: 1, tipCornerFrac: 0.16 },
  { id: 'squoval', label: 'เหลี่ยมมน (Squoval)', lengthRatio: 1.08, tipWidthRatio: 1.0, shapePower: 1, tipCornerFrac: 0.58 },
  { id: 'almond', label: 'อัลมอนด์ (Almond)', lengthRatio: 1.32, tipWidthRatio: 0.05, shapePower: 0.4, tipCornerFrac: 1.0 },
  { id: 'coffin', label: 'บัลเลริน่า (Coffin)', lengthRatio: 1.38, tipWidthRatio: 0.5, shapePower: 0.5, tipCornerFrac: 0.38 },
  { id: 'stiletto', label: 'สไตเลตโต้ (Stiletto)', lengthRatio: 1.6, tipWidthRatio: 0.02, shapePower: 1, tipCornerFrac: 1.0 },
]

export const DEFAULT_SHAPE_ID = 'round'

function estimatePrior(p1, p2) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const segLen = Math.hypot(dx, dy) || 1
  const ux = dx / segLen
  const uy = dy / segLen
  const vx = -uy
  const vy = ux
  const cx = p1.x + dx * CENTER_T
  const cy = p1.y + dy * CENTER_T
  const L = segLen * LENGTH_RATIO
  const W = L * WIDTH_RATIO
  return { cx, cy, ux, uy, vx, vy, L, W }
}

function roiBounds(prior, imgW, imgH) {
  const { cx, cy, ux, uy, vx, vy, L, W } = prior
  const backD = -L * ROI_BACK
  const fwdD = L * ROI_FORWARD
  const halfW = W * ROI_HALF_WIDTH
  const corners = [
    [backD, -halfW], [backD, halfW], [fwdD, -halfW], [fwdD, halfW],
  ].map(([du, dv]) => [cx + ux * du + vx * dv, cy + uy * du + vy * dv])
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of corners) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  minX = Math.max(0, Math.floor(minX)); minY = Math.max(0, Math.floor(minY))
  maxX = Math.min(imgW - 1, Math.ceil(maxX)); maxY = Math.min(imgH - 1, Math.ceil(maxY))
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1, backD, fwdD, halfW }
}

function percentileTrimmedRange(values, trim) {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const lo = sorted[Math.floor(n * trim)]
  const hi = sorted[Math.ceil(n * (1 - trim)) - 1] ?? sorted[n - 1]
  return [lo, hi]
}

// จากรายการจุด (u,v) ที่ถูกจัดว่าเป็น "เล็บ" คำนวณศูนย์กลาง/ความยาว/ความกว้างที่แท้จริง
// พร้อมตรวจสอบว่าอยู่ในช่วงที่สมเหตุสมผลเทียบกับค่าประมาณการทางกายวิภาคหรือไม่ และไม่ได้ชนขอบ ROI
// (ถ้าชนขอบ ROI เกือบเต็มแปลว่าไล่สีลามออกไปแบบไม่หยุด ไม่ใช่เจอขอบเขตสีจริงของเล็บ)
function extentsFromPoints(us, vs, prior, roi) {
  if (us.length < MIN_POINTS) return null
  const [uMin, uMax] = percentileTrimmedRange(us, TRIM_PERCENT)
  const [vMin, vMax] = percentileTrimmedRange(vs, TRIM_PERCENT)
  const centerU = (uMin + uMax) / 2
  const centerV = (vMin + vMax) / 2
  const rawL = ((uMax - uMin) / 2) * EXTENT_MARGIN_L
  const rawW = ((vMax - vMin) / 2) * EXTENT_MARGIN_W
  const { L, W, cx, cy, ux, uy, vx, vy } = prior
  if (rawL < L * MIN_SCALE || rawL > L * MAX_SCALE || rawW < W * MIN_SCALE || rawW > W * MAX_SCALE) {
    return null
  }
  const roiSpanU = roi.fwdD - roi.backD
  const roiSpanV = roi.halfW * 2
  if (uMax - uMin > roiSpanU * WALL_CLIP_RATIO || vMax - vMin > roiSpanV * WALL_CLIP_RATIO) {
    return null
  }
  // ผสมผลที่ไล่สีวัดได้เข้ากับค่าประมาณการทางกายวิภาค (ไม่ใช้ค่าที่ไล่สีได้ดิบๆ ทั้งหมด) เพราะแสง
  // สะท้อน/เงาบนเล็บมันวาวจริงยังทำให้ไล่สีคลาดเคลื่อนได้ทั้งสองทาง (เล็ก/ใหญ่กว่าจริง) แม้ผ่านเกณฑ์
  // ข้างต้นแล้วก็ตาม การถ่วงน้ำหนักกับค่าประมาณการที่ปรับเทียบไว้แล้ว (BLEND_WEIGHT) ช่วยลดความ
  // คลาดเคลื่อนสุดโต่งลงได้มาก โดยยังปรับตำแหน่ง/ขนาดตามรูปจริงได้อยู่ (ไม่ใช่ใช้ค่ากายวิภาคเฉยๆ)
  const newL = rawL * BLEND_WEIGHT_LENGTH + L * (1 - BLEND_WEIGHT_LENGTH)
  const newW = rawW * BLEND_WEIGHT_WIDTH + W * (1 - BLEND_WEIGHT_WIDTH)
  const blendedCenterU = centerU * BLEND_WEIGHT_CENTER
  const blendedCenterV = centerV * BLEND_WEIGHT_CENTER
  return {
    cx: cx + ux * blendedCenterU + vx * blendedCenterV,
    cy: cy + uy * blendedCenterU + vy * blendedCenterV,
    ux, uy, vx, vy,
    L: Math.max(newL, L * MIN_SCALE),
    W: Math.max(newW, W * MIN_SCALE),
  }
}

function samplePixel(imgData, imgW, imgH, x, y) {
  const xi = Math.round(x)
  const yi = Math.round(y)
  if (xi < 0 || yi < 0 || xi >= imgW || yi >= imgH) return null
  const idx = (yi * imgW + xi) * 4
  return [imgData.data[idx], imgData.data[idx + 1], imgData.data[idx + 2]]
}

function averageColorAt(imgData, imgW, imgH, points) {
  let r = 0, g = 0, b = 0, n = 0
  for (const [x, y] of points) {
    const c = samplePixel(imgData, imgW, imgH, x, y)
    if (!c) continue
    r += c[0]; g += c[1]; b += c[2]; n++
  }
  if (!n) return null
  return [r / n, g / n, b / n]
}

// วัด "ความต่างสี" ระหว่างด้านในขอบเขตที่ตรวจพบ กับผิวหนังบริเวณรอบนอกขอบเขตนั้นทันที ถ้าต่างกันน้อย
// เกินไปแปลว่านี่คือก้อนผิวหนังที่ไล่สีหลุดเข้าไปโดน ไม่ใช่เล็บที่มีสี/ความมันวาวต่างจากผิวจริงๆ
function measureNailSkinContrast(imgData, imgW, imgH, ext) {
  const { cx, cy, ux, uy, vx, vy, L, W } = ext
  const insidePts = []
  for (const fu of [-0.4, 0, 0.4]) {
    for (const fv of [-0.4, 0, 0.4]) {
      insidePts.push([cx + ux * L * fu + vx * W * fv, cy + uy * L * fu + vy * W * fv])
    }
  }
  const outsidePts = []
  for (const fu of [-0.3, 0, 0.3, 0.6]) {
    for (const fv of [-1.5, 1.5]) {
      outsidePts.push([cx + ux * L * fu + vx * W * fv, cy + uy * L * fu + vy * W * fv])
    }
  }
  outsidePts.push([cx + ux * L * 1.6, cy + uy * L * 1.6])
  outsidePts.push([cx - ux * L * 1.4, cy - uy * L * 1.4])

  const inside = averageColorAt(imgData, imgW, imgH, insidePts)
  const outside = averageColorAt(imgData, imgW, imgH, outsidePts)
  if (!inside || !outside) return 0
  return Math.hypot(inside[0] - outside[0], inside[1] - outside[1], inside[2] - outside[2])
}

// ระยะห่างของสี 2 จุด แบบ "แยกโทนสีออกจากความสว่าง" — เล็บจริง (โดยเฉพาะทาสีเจล/มันวาว) มักมีจุด
// ไฮไลท์สว่างจ้ากับเงามืดบนหน้าเล็บเดียวกันตามความโค้งของนิ้วและมุมแสง (ความสว่างต่างกันได้เยอะมาก)
// แต่ "โทนสี" (สัดส่วน R:G:B เทียบกัน ไม่สนความสว่างรวม) ยังใกล้เคียงเดิม ถ้าเทียบสีแบบ RGB
// ตรงๆ (เดิม) ความสว่างที่ต่างกันมากจากไฮไลท์/เงาจะถูกตีความว่าเป็น "สีอื่น" ทำให้ไล่สีหยุดก่อนถึง
// ขอบเล็บจริง (เล็บที่ตรวจจับได้เล็ก/แคบกว่าเล็บจริงในรูป มีช่องว่างเห็นเล็บเดิมโผล่ตามขอบ) จึงแยก
// น้ำหนักการเทียบ: เน้นโทนสี (chroma, ทนต่อแสงเงา) เป็นหลัก ให้น้ำหนักความสว่างแค่เล็กน้อย
// พิกเซลที่ "สุดขั้ว" ใกล้ขาวจ้าหรือดำสนิท (ไฮไลท์แสงสะท้อน/เงามืดจัด) มักไม่เหลือโทนสีเดิมให้เทียบ
// ได้แม่นแล้ว (สีจางลงจนเกือบไร้สี) แต่ก็ยังเป็นพื้นผิวเดิมอยู่ ไม่ใช่วัสดุอื่น — คืนค่า 0-1 บอกว่า
// พิกเซลนี้ "สุดขั้ว" แค่ไหน (0 = สีปกติ, 1 = ขาว/ดำเต็มขั้น) ใช้ลดน้ำหนักการเทียบโทนสีตามสัดส่วนนี้
// ต้องดู "ความอิ่มตัวของสี" ประกอบด้วยเสมอ ไม่ใช่แค่ความสว่างเฉยๆ เพราะวัสดุที่เป็นสีอ่อนโดยธรรมชาติ
// (เช่นเล็บสีนู้ด/ชมพูอ่อน) ก็สว่างได้โดยไม่ได้แปลว่าเป็นไฮไลท์แสงสะท้อน — ไฮไลท์จริงจะสว่างจ้า "และ"
// จางเกือบไร้สี (อิ่มตัวต่ำ) พร้อมกันทั้งสองอย่าง
function extremeness(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max > 0 ? (max - min) / max : 0
  const desaturation = Math.max(0, 1 - saturation / 0.3) // 1 เมื่อจืดสนิท, 0 เมื่ออิ่มตัว >= 0.3
  const brightFactor = Math.max(0, Math.min(1, (max - 190) / 65))
  const darkFactor = Math.max(0, Math.min(1, (45 - min) / 45))
  return Math.max(brightFactor, darkFactor) * desaturation
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const s1 = r1 + g1 + b1 + 3
  const s2 = r2 + g2 + b2 + 3
  const chromaDist = Math.hypot(r1 / s1 - r2 / s2, g1 / s1 - g2 / s2, b1 / s1 - b2 / s2)
  const brightDist = Math.abs(s1 - s2) / 3
  const extreme = Math.max(extremeness(r1, g1, b1), extremeness(r2, g2, b2))
  // ยิ่งสุดขั้ว (ไฮไลท์/เงาจัด) ยิ่งลดน้ำหนักผลต่างโทนสีลง เพราะโทนสีที่เหลืออยู่ไม่น่าเชื่อถือแล้ว
  const chromaWeight = 260 * (1 - extreme * 0.92)
  const brightWeight = 0.35 * (1 - extreme * 0.6)
  return chromaDist * chromaWeight + brightDist * brightWeight
}

// region-growing ทีละก้าวจากจุดเริ่ม (seedX, seedY) หนึ่งจุด — ไล่สีเทียบแบบทีละก้าวกับพิกเซล
// ข้างเคียงที่ยอมรับแล้ว (ไม่ใช่เทียบกับจุดเริ่มต้นจุดเดียวตายตัว) ทนต่อแสงสะท้อน/เงาไล่สีบนหน้าเล็บ
function regionGrowFrom(imgData, imgW, imgH, prior, roi, seedX, seedY) {
  const { cx, cy, ux, uy, vx, vy } = prior
  const { minX, minY, w: roiW, h: roiH, backD, fwdD, halfW } = roi
  if (roiW <= 2 || roiH <= 2) return null

  function inRotatedRect(x, y) {
    const du = (x - cx) * ux + (y - cy) * uy
    const dv = (x - cx) * vx + (y - cy) * vy
    return du >= backD - 2 && du <= fwdD + 2 && dv >= -halfW - 2 && dv <= halfW + 2
  }

  const data = imgData.data
  const x0 = Math.round(seedX), y0 = Math.round(seedY)
  let sr = 0, sg = 0, sb = 0, sn = 0
  for (let y = y0 - 2; y <= y0 + 2; y++) {
    if (y < 0 || y >= imgH) continue
    for (let x = x0 - 2; x <= x0 + 2; x++) {
      if (x < 0 || x >= imgW) continue
      const idx = (y * imgW + x) * 4
      sr += data[idx]; sg += data[idx + 1]; sb += data[idx + 2]; sn++
    }
  }
  if (!sn) return null
  const seedR = sr / sn, seedG = sg / sn, seedB = sb / sn

  const visited = new Uint8Array(roiW * roiH)
  const startLx = x0 - minX
  const startLy = y0 - minY
  if (startLx < 0 || startLy < 0 || startLx >= roiW || startLy >= roiH) return null

  const stack = [[startLx, startLy, seedR, seedG, seedB]]
  visited[startLy * roiW + startLx] = 1
  const us = []
  const vs = []
  const maxFillPoints = Math.max(400, Math.PI * prior.L * prior.W * MAX_FILL_AREA_MULTIPLIER)

  while (stack.length) {
    const [lx, ly, refR, refG, refB] = stack.pop()
    const gx = lx + minX, gy = ly + minY
    if (!inRotatedRect(gx, gy)) continue
    const idx = (gy * imgW + gx) * 4
    const r = data[idx], g = data[idx + 1], b = data[idx + 2]
    const localDist = colorDistance(r, g, b, refR, refG, refB)
    const seedDist = colorDistance(r, g, b, seedR, seedG, seedB)
    if (localDist > LOCAL_STEP_THRESHOLD || seedDist > ABS_SEED_THRESHOLD) continue

    us.push((gx - cx) * ux + (gy - cy) * uy)
    vs.push((gx - cx) * vx + (gy - cy) * vy)
    // ไล่สีลามเกินพื้นที่ที่เป็นไปได้ของเล็บไปมากแล้ว แปลว่าหลุดออกนอกเล็บแน่ๆ เลิกไล่ต่อ (ผลนี้ใช้ไม่ได้)
    if (us.length > maxFillPoints) return null

    const neighbors = [[lx + 1, ly], [lx - 1, ly], [lx, ly + 1], [lx, ly - 1]]
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= roiW || ny >= roiH) continue
      const vIdx = ny * roiW + nx
      if (visited[vIdx]) continue
      visited[vIdx] = 1
      stack.push([nx, ny, r, g, b])
    }
  }

  return { us, vs }
}

// ลองไล่สีจากหลายจุดเริ่ม (seed) ตามแนวยาวเล็บที่ประมาณไว้ แล้วเลือกผลที่ "ดูเป็นเล็บจริง" ที่สุด
// ในบรรดาจุดที่ผ่านเกณฑ์ทั้งหมด (ขนาดสมเหตุสมผล/ไม่ชนขอบ ROI/มีความต่างสีกับผิวรอบๆ ชัดเจนพอ)
// เลือกตัวที่มี "พื้นที่ใหญ่ที่สุด" ไม่ใช่ตัวที่ "contrast สูงสุด" — เพราะจุดเริ่มที่บังเอิญไล่สีได้
// แค่บริเวณเล็กๆ ที่คมชัดจัด (เช่นโซนเงามืดจุดเดียวบนเล็บ) มักวัด contrast ได้สูงกว่าขอบเขตเล็บ
// เต็มพื้นที่จริง (ที่มีทั้งโซนไฮไลท์สว่างซึ่งดึง contrast เฉลี่ยลงมาบ้าง) ถ้าเลือกตาม contrast
// สูงสุดจะได้เล็บที่เล็ก/แคบกว่าจริงเสมอ เลือกตามพื้นที่ใหญ่สุด (ในกลุ่มที่ผ่านเกณฑ์แล้วเท่านั้น)
// จึงสะท้อนขอบเขตเล็บจริงได้แม่นกว่า
function floodFillExtents(imgData, imgW, imgH, prior) {
  const roi = roiBounds(prior, imgW, imgH)
  if (roi.w <= 2 || roi.h <= 2) return null

  let best = null
  let bestArea = -1
  for (const t of SEED_OFFSETS) {
    const seedX = prior.cx + prior.ux * prior.L * t
    const seedY = prior.cy + prior.uy * prior.L * t
    const grown = regionGrowFrom(imgData, imgW, imgH, prior, roi, seedX, seedY)
    if (!grown) continue
    const ext = extentsFromPoints(grown.us, grown.vs, prior, roi)
    if (!ext) continue
    const contrast = measureNailSkinContrast(imgData, imgW, imgH, ext)
    if (contrast < MIN_NAIL_SKIN_CONTRAST) continue
    const area = ext.L * ext.W
    if (area > bestArea) {
      bestArea = area
      best = ext
    }
  }
  return best
}

// ปล่อยคืนการควบคุมให้เบราว์เซอร์สักครู่ (ให้ทันวาดหน้าจอ/ตอบสนองการคลิกระหว่างประมวลผลแต่ละนิ้ว)
function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// working canvas: ใช้ระบุขนาด (กว้าง/สูง) ที่พิกัด landmark (normalized 0-1) จะถูกแปลงกลับเป็นพิกเซลจริง
// landmarks: จุดข้อต่อ 21 จุดจาก MediaPipe Hand Landmarker (normalized 0-1)
// คืนค่าเฉพาะ "prior" ของแต่ละนิ้ว (ตำแหน่ง/ทิศทาง/ขนาดเล็บจริงที่ตรวจพบ) — ยังไม่สร้างมาสก์
export async function segmentNailsFromCanvas(workingCanvas, landmarks) {
  const w = workingCanvas.width
  const h = workingCanvas.height
  const ctx = workingCanvas.getContext('2d')
  const imgData = ctx.getImageData(0, 0, w, h)

  const results = []
  for (const { id, label, tip, joint } of FINGERS) {
    const p1 = { x: landmarks[joint].x * w, y: landmarks[joint].y * h }
    const p2 = { x: landmarks[tip].x * w, y: landmarks[tip].y * h }
    const prior = estimatePrior(p1, p2)

    const refined = floodFillExtents(imgData, w, h, prior)
    const finalPrior = refined || prior

    results.push({ id, label, prior: finalPrior, matched: !!refined })

    // คืนการควบคุมให้เบราว์เซอร์ระหว่างนิ้ว กันหน้าเว็บค้างระหว่างประมวลผลในเครื่องที่ช้ากว่า
    await yieldToBrowser()
  }

  return results
}

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

// "ระยะห่างจากขอบทรงเล็บ" (แนวคิดคล้าย signed distance field) ของจุด (u,v) หนึ่งจุด โดย u คือระยะ
// ตามแนวยาวเล็บ (ลบ = ไปทางโคนเล็บ, บวก = ไปทางปลายเล็บ) และ v คือระยะตามแนวขวาง จากศูนย์กลาง (0,0)
// ค่า <= 0 หมายถึง "อยู่ในเล็บ", ค่า > 0 หมายถึงอยู่นอกเล็บ (หน่วยเป็นพิกเซลโดยประมาณ ใช้ทำขอบเนียนได้ตรงๆ)
function nailBoundaryDistance(u, v, p) {
  const av = Math.abs(v)

  // โคนเล็บ (ใต้แนวหนังกำพร้า) โค้งมนเป็นทรงครึ่งวงกลมเสมอ ไม่ว่าจะเลือกทรงปลายเล็บแบบไหน
  if (u < -p.Lback) {
    return Math.hypot(u + p.Lback, av) - p.baseHalfWidth
  }

  // ปลายเล็บที่ยังมีความกว้างเหลืออยู่พอสมควร (เหลี่ยม/เหลี่ยมมน/บัลเลริน่า) ต้องมนมุมปลายด้วย
  // สูตรมุมมนแบบมาตรฐาน (rounded-box distance) ใช้ได้ถูกต้องทั้งในและนอกทรงเล็บ (รวมถึงจุดที่ไกล
  // เลยปลายเล็บออกไปด้วย) จึงตรวจโซนนี้ก่อนเป็นอันดับแรกเสมอเมื่อทรงนั้นมีมุมมนจริง (r มีนัยสำคัญ)
  const r = Math.min(p.tipHalfWidth * p.tipCornerFrac, p.tipHalfWidth)
  if (r > 0.6 && u > p.Lfront - r) {
    const t = clamp01((u + p.Lback) / (p.Lback + p.Lfront))
    const hw = p.tipHalfWidth + (p.baseHalfWidth - p.tipHalfWidth) * Math.pow(1 - t, p.shapePower)
    const cu = u - (p.Lfront - r)
    const cv = av - (hw - r)
    const qx = Math.max(cu, 0)
    const qy = Math.max(cv, 0)
    return Math.hypot(qx, qy) + Math.min(Math.max(cu, cv), 0) - r
  }

  // เลยความยาวปลายเล็บไปแล้ว (พ้นทรงเล็บทั้งหมด) และไม่ใช่กรณีปลายมนด้านบน -> ระยะห่างนับจาก
  // "จุดปลายเล็บ" (รัศมีเล็กเท่าความกว้างปลายเล็บ) ป้องกันไม่ให้ทรงเล็บยื่นเป็นเส้นเรียวไม่จบ
  // ไปเรื่อยๆ ตามแนวยาว (เคยเป็นบั๊กทำให้ทรงแหลม เช่น สไตเลตโต้ มีเส้นขนแมวโผล่เลยปลายแหลมไป)
  if (u > p.Lfront) {
    return Math.hypot(u - p.Lfront, av) - p.tipHalfWidth
  }

  const t = (u + p.Lback) / (p.Lback + p.Lfront)
  const hw = p.tipHalfWidth + (p.baseHalfWidth - p.tipHalfWidth) * Math.pow(1 - t, p.shapePower)
  return av - hw
}

// สร้าง canvas มาสก์ (ขาว + alpha) ของทรงเล็บที่เลือก จาก prior (ตำแหน่ง/ทิศทาง/ขนาดเล็บจริงที่ตรวจพบ)
// ด้านโคนเล็บอ้างอิงตำแหน่งจริงเสมอ ส่วนด้านปลายเล็บจะถูกยืด/บีบตามทรงที่เลือก (lengthRatio, tipWidthRatio)
export function buildNailMask(prior, shape) {
  const Lback = prior.L
  const Lfront = prior.L * (shape.lengthRatio ?? 1)
  const baseHalfWidth = prior.W
  const tipHalfWidth = prior.W * (shape.tipWidthRatio ?? 1)
  const shapePower = shape.shapePower ?? 1
  const tipCornerFrac = shape.tipCornerFrac ?? 1
  const p = { Lback, Lfront, baseHalfWidth, tipHalfWidth, shapePower, tipCornerFrac }

  const maxL = Math.max(Lback, Lfront)
  const halfDiag = Math.ceil(Math.sqrt(maxL * maxL + baseHalfWidth * baseHalfWidth) * 1.1)
  const size = Math.max(4, halfDiag * 2)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(size, size)
  const originX = prior.cx - halfDiag
  const originY = prior.cy - halfDiag
  const feather = 1.4 // px — ระยะเนียนขอบ ให้คมกริบเหมือนขอบเล็บทาสีจริง (ไม่ฟุ้งเหมือนก่อนหน้านี้)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ox = originX + x - prior.cx
      const oy = originY + y - prior.cy
      const u = ox * prior.ux + oy * prior.uy
      const v = ox * prior.vx + oy * prior.vy
      const d = nailBoundaryDistance(u, v, p)
      const a = clamp01(0.5 - d / feather)
      const idx = (y * size + x) * 4
      imageData.data[idx] = 255
      imageData.data[idx + 1] = 255
      imageData.data[idx + 2] = 255
      imageData.data[idx + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return {
    maskCanvas: canvas,
    x: Math.round(originX),
    y: Math.round(originY),
    w: size,
    h: size,
    ux: prior.ux,
    uy: prior.uy,
  }
}
