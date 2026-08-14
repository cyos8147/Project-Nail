// แคตตาล็อกลายเล็บ — ใช้เป็นฐานข้อมูลกลางสำหรับระบบแนะนำลาย, ประเมินเวลาทำ,
// และจับคู่ลายจากรูปอ้างอิงในอนาคต
//
// toneFit: คะแนนความเข้ากันได้กับแต่ละโทนผิว (0-100) ใช้ตอนคำนวณ % ความเหมาะสม
// popularity: คะแนนความนิยมพื้นฐาน (0-100) ใช้ตอนยังไม่มีผลวิเคราะห์สีผิว
// complexity: ระดับความซับซ้อนของลาย ใช้คำนวณเวลาทำเพิ่มเติมจากบริการพื้นฐาน (ข้อ 5)

export const nailDesigns = [
  {
    id: 'minimal-nude',
    name: 'Minimal Nude',
    price: 350,
    duration: 45,
    complexity: 'simple',
    styleTag: 'minimal',
    toneFit: { warm: 96, cool: 55, neutral: 85 },
    popularity: 92,
  },
  {
    id: 'french-classic',
    name: 'French Classic',
    price: 400,
    duration: 60,
    complexity: 'simple',
    styleTag: 'classic',
    toneFit: { warm: 80, cool: 78, neutral: 88 },
    popularity: 88,
  },
  {
    id: 'korean-pink',
    name: 'Korean Pink',
    price: 380,
    duration: 60,
    complexity: 'medium',
    styleTag: 'classic',
    toneFit: { warm: 60, cool: 94, neutral: 75 },
    popularity: 84,
  },
  {
    id: 'cat-eye',
    name: 'Cat Eye',
    price: 450,
    duration: 60,
    complexity: 'medium',
    styleTag: 'bold',
    toneFit: { warm: 82, cool: 70, neutral: 78 },
    popularity: 70,
  },
  {
    id: 'marble',
    name: 'Marble',
    price: 500,
    duration: 75,
    complexity: 'complex',
    styleTag: 'bold',
    toneFit: { warm: 68, cool: 74, neutral: 80 },
    popularity: 65,
  },
  {
    id: 'glitter-gold',
    name: 'Glitter Gold',
    price: 480,
    duration: 75,
    complexity: 'complex',
    styleTag: 'bold',
    toneFit: { warm: 92, cool: 45, neutral: 70 },
    popularity: 60,
  },
  {
    id: 'berry-jelly',
    name: 'Berry Jelly',
    price: 420,
    duration: 60,
    complexity: 'medium',
    styleTag: 'classic',
    toneFit: { warm: 40, cool: 90, neutral: 68 },
    popularity: 55,
  },
  {
    id: 'terracotta-swirl',
    name: 'Terracotta Swirl',
    price: 460,
    duration: 75,
    complexity: 'complex',
    styleTag: 'bold',
    toneFit: { warm: 85, cool: 50, neutral: 90 },
    popularity: 58,
  },
]

export const STYLE_LABEL = { minimal: 'Minimal', classic: 'Classic', bold: 'Bold / Colorful' }

// ข้อ 5: เวลาที่ต้องเพิ่มจากบริการพื้นฐาน ตามความซับซ้อนของสไตล์ลายที่วิเคราะห์ได้จากรูปอ้างอิง
export const STYLE_EXTRA_MINUTES = { minimal: 0, classic: 15, bold: 30 }

// ข้อ 4: หาลายในร้านที่ใกล้เคียงกับสไตล์ที่วิเคราะห์ได้จากรูปอ้างอิง
export function getDesignsByStyle(styleTag, limit = 3) {
  return [...nailDesigns]
    .filter((d) => d.styleTag === styleTag)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
}

// คำนวณ % ความเหมาะสมของลายกับโทนผิวที่เลือก โดยผสมกับคะแนนความนิยมเล็กน้อย
// เพื่อไม่ให้ลายที่ไม่ค่อยมีคนทำแซงลายยอดนิยมง่ายเกินไป
export function scoreDesignForTone(design, tone) {
  if (!tone) return design.popularity
  const toneScore = design.toneFit[tone] ?? 50
  const blended = toneScore * 0.75 + design.popularity * 0.25
  return Math.round(Math.min(99, blended))
}

export function getRankedDesigns(tone, limit = 5) {
  return [...nailDesigns]
    .map((d) => ({ ...d, matchScore: scoreDesignForTone(d, tone) }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
}

// ข้อ 5: AI ประเมินเวลาการทำ — เวลารวม = เวลาบริการพื้นฐาน + เวลาเพิ่มจากความซับซ้อนของลายที่เลือก
export const COMPLEXITY_EXTRA_MINUTES = { simple: 0, medium: 15, complex: 30 }
export const COMPLEXITY_LABEL = { simple: 'เรียบง่าย', medium: 'ปานกลาง', complex: 'ซับซ้อน' }

export function estimateDesignDuration(baseServiceDuration, design) {
  if (!design) return baseServiceDuration
  const extra = COMPLEXITY_EXTRA_MINUTES[design.complexity] ?? 0
  return baseServiceDuration + extra
}

// เมื่อยังไม่ได้เลือกลายที่แน่ชัด แต่รู้แค่สไตล์ (เช่น จากการวิเคราะห์รูปอ้างอิง) ให้ประเมินจากสไตล์แทน
export function estimateStyleDuration(baseServiceDuration, styleTag) {
  const extra = STYLE_EXTRA_MINUTES[styleTag] ?? 15
  return baseServiceDuration + extra
}
