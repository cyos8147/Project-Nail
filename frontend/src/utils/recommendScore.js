// แปลงผลจัดอันดับของ AI เป็น "คะแนนแนะนำ" เต็ม 10 ที่ลูกค้าอ่านเข้าใจ (แทนเปอร์เซ็นต์ความน่าจะเป็นดิบ)
//
// ที่มาของปัญหา: โมเดล XGBoost แจกความน่าจะเป็นให้ทุกลาย (รวม 100%) อันดับ 1 อาจได้แค่ 40–60% และอันดับ 5 ได้ไม่ถึง 5%
// ถ้าโชว์ตรง ๆ ลูกค้าจะเห็น "3.1% " แล้วคิดว่าไม่เหมาะ ทั้งที่เป็นลายที่ AI เลือกมาให้
// จึงจัดคะแนนตามอันดับเทียบกับลายที่ดีที่สุดในรอบนั้น: ที่ 1 = 10.0 ที่เหลือลดลงตามสัดส่วนความน่าจะเป็น แต่ไม่ต่ำกว่า 6.0
// (ทุกลายที่ติด 5 อันดับแรกคือลายที่เหมาะอยู่แล้ว) คะแนนจึงบอก "เหมาะแค่ไหนเมื่อเทียบกับตัวเลือกที่ดีที่สุด"

export const SCORE_FLOOR = 6
export const SCORE_MAX = 10

/** probabilities: ตัวเลขดิบของแต่ละลาย (ตามลำดับอะไรก็ได้) → คะแนนในลำดับเดิม ปัดเป็นทศนิยม 1 ตำแหน่ง */
export function toRecommendScores(probabilities) {
  const values = probabilities.map((p) => Math.max(0, Number(p) || 0))
  const best = Math.max(0, ...values)
  if (best === 0) return values.map(() => SCORE_FLOOR)
  return values.map((v) => {
    const relative = v / best // 0–1 เทียบกับอันดับ 1
    return Math.round((SCORE_FLOOR + (SCORE_MAX - SCORE_FLOOR) * relative) * 10) / 10
  })
}

/** ใช้กับคะแนนความเข้ากันที่เป็น 0–100 อยู่แล้ว (แคตตาล็อกฝั่งเว็บ) → เต็ม 10 */
export function percentToScore(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0))
  return Math.round(p) / 10
}

export function scoreLabel(score) {
  return `${Number(score).toFixed(1)}`
}
