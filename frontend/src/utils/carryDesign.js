// ส่งต่อสี/ลาย/รูปจากหน้า AI ไปหน้าจองคิว ผ่าน localStorage ก้อนเดียว (หน้าจองอ่านแล้วลบทิ้งทันที)
//
// รูปจากหน้าลองสีเป็น data URL ที่ใหญ่ ถ้า localStorage เต็มห้ามให้การกด "จอง" เงียบหาย
// จึงลองเก็บทั้งก้อนก่อน ถ้าไม่ได้ให้ทิ้งแค่รูปแล้วส่งข้อมูลสีไปแทน และบอกผู้เรียกว่ารูปไม่ได้ไปด้วย

export const CARRY_DESIGN_KEY = 'nailglow_carry_design'

const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
const SOURCES = ['tryon', 'skin', 'design']

/** ตัดเฉพาะฟิลด์ที่รู้จักและจำกัดความยาว (ข้อมูลใน storage แก้ได้เอง จึงไม่เชื่อทั้งก้อน) */
export function sanitizeCarry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const colors = (Array.isArray(raw.colors) ? raw.colors : [])
    .filter((c) => c && isHex(c.hex))
    .slice(0, 5)
    .map((c) => ({ hex: c.hex.toUpperCase(), name: text(c.name, 40), finish: text(c.finish, 20), finishLabel: text(c.finishLabel, 20) }))
  const image = typeof raw.reference_image_base64 === 'string' && raw.reference_image_base64.startsWith('data:image/') ? raw.reference_image_base64 : null
  const out = {
    source: SOURCES.includes(raw.source) ? raw.source : colors.length ? 'tryon' : 'design',
    colors,
    lengthKey: text(raw.lengthKey, 20) || 'natural',
    lengthLabel: text(raw.lengthLabel, 20),
    tipShape: text(raw.tipShape, 20),
    tipLabel: text(raw.tipLabel, 20),
    summary: text(raw.summary, 120),
    reference_image_base64: image,
    nail_design_id: typeof raw.nail_design_id === 'string' ? raw.nail_design_id.slice(0, 40) : null,
    nail_design_name: text(raw.nail_design_name, 80),
    color_hex: isHex(raw.color_hex) ? raw.color_hex : null,
    imageDropped: raw.imageDropped === true,
  }
  if (!out.reference_image_base64 && !out.nail_design_id && out.colors.length === 0) return null
  return out
}

/** เก็บเพื่อส่งต่อ: คืน { ok, imageDropped } */
export function saveCarryDesign(payload, storage = window.localStorage) {
  const clean = sanitizeCarry(payload)
  if (!clean) return { ok: false, imageDropped: false }
  try {
    storage.setItem(CARRY_DESIGN_KEY, JSON.stringify(clean))
    return { ok: true, imageDropped: false }
  } catch {
    if (!clean.reference_image_base64) return { ok: false, imageDropped: false }
    try {
      storage.setItem(CARRY_DESIGN_KEY, JSON.stringify({ ...clean, reference_image_base64: null, imageDropped: true }))
      return { ok: true, imageDropped: true }
    } catch {
      return { ok: false, imageDropped: true }
    }
  }
}

/** อ่านแล้วลบทันที (ใช้ครั้งเดียว) คืนข้อมูลที่ผ่านการตรวจแล้วหรือ null */
export function takeCarryDesign(storage = window.localStorage) {
  try {
    const raw = storage.getItem(CARRY_DESIGN_KEY)
    if (!raw) return null
    storage.removeItem(CARRY_DESIGN_KEY)
    return sanitizeCarry(JSON.parse(raw))
  } catch {
    return null
  }
}

/** ข้อความสรุปสีสั้น ๆ ที่เก็บในใบจอง (คอลัมน์ shade_name ยาวได้ 120 ตัวอักษร) */
export function shadeLabel(carry) {
  if (!carry) return ''
  const colorText = carry.colors.length === 1 ? carry.colors[0].name : carry.colors.map((c) => c.name).join(' + ')
  const parts = [colorText || carry.nail_design_name, carry.colors[0]?.finishLabel]
  if (carry.lengthKey && carry.lengthKey !== 'natural') parts.push(`ต่อเล็บ${carry.lengthLabel}${carry.tipLabel ? ` ทรง${carry.tipLabel}` : ''}`)
  return parts.filter(Boolean).join(' · ').slice(0, 100)
}

/** สีที่จะแสดงเป็นตัวอย่างในหน้าจอง (ใช้ shape เดียวกับ shade ของผมที่หน้าจองใช้อยู่: { id, name, hex }) */
export function shadeFromCarry(carry) {
  if (!carry) return null
  const hex = carry.colors[0]?.hex || carry.color_hex
  const name = shadeLabel(carry)
  if (!hex || !name) return null
  return { id: `ai-${hex.slice(1).toLowerCase()}`, name, hex }
}

/**
 * เลือกบริการทำเล็บที่เกี่ยวข้องกับลุคที่ลูกค้าลอง (ชื่อบริการแอดมินแก้ได้ จึงจับด้วยคำสำคัญ ไม่ผูกกับ id):
 * ต่อความยาว → บริการ "ต่อเล็บ", นอกนั้น → บริการทาสีเจล, ถ้าไม่เจอทั้งคู่ใช้บริการแรกของหมวด
 */
export function pickNailService(nailServices, carry) {
  if (!Array.isArray(nailServices) || nailServices.length === 0) return null
  const has = (needle) => nailServices.find((s) => typeof s.name === 'string' && s.name.includes(needle))
  if (carry && carry.lengthKey && carry.lengthKey !== 'natural') {
    const extension = has('ต่อเล็บ')
    if (extension) return extension
  }
  return has('สีเจล') || has('เจล') || nailServices[0]
}
