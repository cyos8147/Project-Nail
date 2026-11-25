// เลือก "ภาพประกอบ" ให้บริการจากชื่อบริการ (ใช้เมื่อแอดมินยังไม่ได้อัปโหลดรูปจริง)
// ตรวจตามลำดับ: คำที่เจาะจงกว่าต้องมาก่อน เช่น "แต่งหน้า - ทำผม" ควรเป็นแต่งหน้า
// "ยืดโคนดัดปลาย" ควรเป็นยืด และ "ทำสีผม" ต้องไม่ถูกนับเป็นทำสีเล็บ

const HAIR_RULES = [
  ['makeup', /แต่งหน้า|เมคอัพ|makeup/i],
  ['brow', /คิ้ว|brow/i],
  ['hairColor', /ทำสี|ไฮไลท์|บลีช|กัดสี|ombre|color|highlight/i],
  ['straighten', /ยืด|เคราติน|keratin|rebond/i],
  ['perm', /ดัด|วอลลุ่ม|ลอน|perm|volume/i],
  ['treatment', /ทรีทเมนต์|บำรุง|หมัก|สปาผม|treatment/i],
  ['wash', /สระ|ไดร์|เป่า|เซ็ท|wash|blow/i],
  ['cut', /ตัด|ซอย|เล็ม|cut|trim/i],
]

const NAIL_RULES = [
  ['remove', /ถอด|ล้าง|remove/i],
  ['extension', /ต่อเล็บ|ต่อ|pvc|อะคริลิค|acrylic|extension/i],
  ['spa', /มือ|เท้า|สปา|ขัด|หนัง|พาราฟิน|นวด|spa|pedi|mani/i],
  ['nailArt', /เพ้นท์|เพ้น|ลาย|อะไหล่|กากเพชร|ออมเบร|แมว|art|paint/i],
  ['polish', /สี|เจล|ทา|gel|polish/i],
]

const OTHER_RULES = [...HAIR_RULES.slice(0, 2), ...NAIL_RULES, ...HAIR_RULES.slice(2)]

/**
 * คืนชื่อภาพประกอบสำหรับบริการ
 * @param {string} name ชื่อบริการ
 * @param {string} categoryId หมวด ('hair' | 'nail' | อื่น ๆ)
 */
export function pickServiceMotif(name, categoryId) {
  const text = String(name || '')
  const rules = categoryId === 'hair' ? HAIR_RULES : categoryId === 'nail' ? NAIL_RULES : OTHER_RULES
  for (const [motif, re] of rules) if (re.test(text)) return motif
  if (categoryId === 'hair') return 'hair'
  if (categoryId === 'nail') return 'polish'
  return 'sparkle'
}
