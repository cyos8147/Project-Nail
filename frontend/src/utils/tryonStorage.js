// ที่เก็บ "ประวัติลองสีเล็บ" และ "ผลวิเคราะห์สีผิวล่าสุด" ไว้ในเครื่องของลูกค้าเอง (localStorage)
//
// ตัดสินใจแล้วว่าไม่เก็บขึ้นเซิร์ฟเวอร์: ใช้เซิร์ฟเวอร์ฟรีที่พื้นที่จำกัด และไม่ต้องเก็บรูปมือของลูกค้า
// ลูกค้าแต่ละคนใช้เครื่องตัวเอง จึงเห็นเฉพาะสีที่ตัวเองลองไว้โดยไม่ต้องล็อกอิน
// ข้อจำกัดที่ต้องบอกลูกค้า: ล้างข้อมูลเบราว์เซอร์/เปลี่ยนเครื่องแล้วประวัติหาย และเครื่องที่ใช้ร่วมกันจะเห็นประวัติปนกัน
//
// ทุกฟังก์ชันเป็นฟังก์ชันล้วน ๆ รับ storage เข้ามา (ใช้ window.localStorage จริงหรือของปลอมในเทสต์ก็ได้)
// และต้องไม่ throw เมื่อ storage ถูกปิด (โหมดส่วนตัว/ถูกบล็อก) หรือเต็ม — แอปต้องใช้งานได้ต่อโดยแค่ไม่มีประวัติ

export const HISTORY_KEY = 'luckysalon_tryon_history_v1'
export const SKIN_RESULT_KEY = 'luckysalon_skin_result_v1'
export const HISTORY_MAX = 20
const MAX_COLORS_PER_LOOK = 5

export function getStorage() {
  try {
    const s = window.localStorage
    // บางเบราว์เซอร์เข้าถึง property ได้แต่เขียนไม่ได้ จึงลองเขียนจริงหนึ่งครั้ง
    s.setItem('__luckysalon_probe', '1')
    s.removeItem('__luckysalon_probe')
    return s
  } catch {
    return null
  }
}

function readJson(storage, key) {
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(storage, key, value) {
  if (!storage) return false
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

function cleanColor(c) {
  if (!c || !isHex(c.hex)) return null
  return {
    hex: c.hex.toUpperCase(),
    name: typeof c.name === 'string' ? c.name.slice(0, 40) : '',
    finish: typeof c.finish === 'string' ? c.finish.slice(0, 20) : 'creamy',
    finishLabel: typeof c.finishLabel === 'string' ? c.finishLabel.slice(0, 20) : '',
  }
}

/** กุญแจระบุ "ลุคเดียวกัน": สีทุกสี + พื้นผิว + ความยาว + ทรงปลาย (เรียงสีเพื่อไม่ให้ลำดับนิ้วทำให้ซ้ำไม่ออก) */
export function lookKey(look) {
  const colors = (look.colors || [])
    .map((c) => `${String(c.hex).toUpperCase()}:${c.finish}`)
    .sort()
    .join('+')
  return `${colors}|${look.lengthKey || 'natural'}|${look.tipShape || 'round'}`
}

/** ทำให้ข้อมูลจากภายนอก (storage ที่อาจถูกแก้/เวอร์ชันเก่า) อยู่ในรูปที่ปลอดภัย หรือคืน null ถ้าใช้ไม่ได้ */
export function sanitizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const colors = (Array.isArray(raw.colors) ? raw.colors : []).map(cleanColor).filter(Boolean).slice(0, MAX_COLORS_PER_LOOK)
  if (colors.length === 0) return null
  const entry = {
    id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: typeof raw.at === 'string' && !Number.isNaN(Date.parse(raw.at)) ? raw.at : new Date().toISOString(),
    colors,
    lengthKey: typeof raw.lengthKey === 'string' ? raw.lengthKey.slice(0, 20) : 'natural',
    lengthLabel: typeof raw.lengthLabel === 'string' ? raw.lengthLabel.slice(0, 20) : '',
    tipShape: typeof raw.tipShape === 'string' ? raw.tipShape.slice(0, 20) : 'round',
    tipLabel: typeof raw.tipLabel === 'string' ? raw.tipLabel.slice(0, 20) : '',
    thumb: typeof raw.thumb === 'string' && raw.thumb.startsWith('data:image/') ? raw.thumb : null,
    favorite: raw.favorite === true,
  }
  entry.key = lookKey(entry)
  return entry
}

export function loadHistory(storage) {
  const data = readJson(storage, HISTORY_KEY)
  if (!data || data.v !== 1 || !Array.isArray(data.items)) return []
  return data.items.map(sanitizeEntry).filter(Boolean).slice(0, HISTORY_MAX)
}

/**
 * เพิ่มลุคใหม่ไว้บนสุด
 * - ลุคซ้ำ (กุญแจเดียวกัน) ไม่เพิ่มซ้ำ แต่ย้ายขึ้นบนและอัปเดตรูป โดยคงสถานะ "ชอบ" เดิมไว้
 * - เกินจำนวนสูงสุดให้ตัดอันเก่าสุดที่ไม่ได้กดชอบก่อน ถ้าทุกอันเป็นที่ชอบค่อยตัดอันเก่าสุด
 */
export function addEntry(list, look, max = HISTORY_MAX) {
  const entry = sanitizeEntry(look)
  if (!entry) return list
  const previous = list.find((e) => e.key === entry.key)
  if (previous) entry.favorite = previous.favorite || entry.favorite
  const next = [entry, ...list.filter((e) => e.key !== entry.key)]
  while (next.length > max) {
    let drop = -1
    for (let i = next.length - 1; i >= 0; i--) {
      if (!next[i].favorite) { drop = i; break }
    }
    next.splice(drop === -1 ? next.length - 1 : drop, 1)
  }
  return next
}

export function toggleFavorite(list, id) {
  return list.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e))
}

export function removeEntry(list, id) {
  return list.filter((e) => e.id !== id)
}

/**
 * บันทึกประวัติ ถ้า storage เต็มให้ลดทอนทีละขั้นจนเขียนได้: ตัดรูปย่อของอันเก่า ๆ ก่อน แล้วค่อยตัดรายการเก่าสุด
 * คืน { list, ok } โดย list คือสิ่งที่บันทึกได้จริง เพื่อให้หน้าจอแสดงตรงกับที่เก็บไว้
 */
export function saveHistory(storage, list) {
  let working = list.slice(0, HISTORY_MAX)
  if (writeJson(storage, HISTORY_KEY, { v: 1, items: working })) return { list: working, ok: true }
  if (!storage) return { list: working, ok: false }
  // ขั้นที่ 1: ตัดรูปย่อจากอันเก่าสุดไล่ขึ้นมา (ยังเก็บสีไว้)
  for (let i = working.length - 1; i >= 1; i--) {
    if (working[i].thumb) {
      working = working.map((e, idx) => (idx === i ? { ...e, thumb: null } : e))
      if (writeJson(storage, HISTORY_KEY, { v: 1, items: working })) return { list: working, ok: true }
    }
  }
  // ขั้นที่ 2: ตัดรายการเก่าสุด (ที่ไม่ได้ชอบก่อน) ทีละอัน
  while (working.length > 1) {
    let drop = -1
    for (let i = working.length - 1; i >= 1; i--) {
      if (!working[i].favorite) { drop = i; break }
    }
    working = working.filter((_, idx) => idx !== (drop === -1 ? working.length - 1 : drop))
    if (writeJson(storage, HISTORY_KEY, { v: 1, items: working })) return { list: working, ok: true }
  }
  return { list: working, ok: false }
}

export function clearHistory(storage) {
  try {
    storage?.removeItem(HISTORY_KEY)
  } catch {
    /* ไม่มีอะไรต้องทำ */
  }
  return []
}

// ---------- ผลวิเคราะห์สีผิวล่าสุด ----------

const UNDERTONES = ['warm', 'cool', 'neutral']

export function sanitizeSkinResult(raw) {
  if (!raw || typeof raw !== 'object' || !isHex(raw.hex) || !UNDERTONES.includes(raw.undertone)) return null
  const recommended = (Array.isArray(raw.recommended) ? raw.recommended : [])
    .map((c) => (c && isHex(c.hex) ? { hex: c.hex.toUpperCase(), name: typeof c.name === 'string' ? c.name.slice(0, 40) : '' } : null))
    .filter(Boolean)
    .slice(0, 12)
  return {
    at: typeof raw.at === 'string' && !Number.isNaN(Date.parse(raw.at)) ? raw.at : new Date().toISOString(),
    hex: raw.hex.toUpperCase(),
    depthKey: typeof raw.depthKey === 'string' ? raw.depthKey.slice(0, 20) : '',
    depthLabel: typeof raw.depthLabel === 'string' ? raw.depthLabel.slice(0, 30) : '',
    undertone: raw.undertone,
    confidence: raw.confidence === 'precise' ? 'precise' : 'approximate',
    recommended,
  }
}

export function loadSkinResult(storage) {
  const data = readJson(storage, SKIN_RESULT_KEY)
  if (!data || data.v !== 1) return null
  return sanitizeSkinResult(data.result)
}

export function saveSkinResult(storage, result) {
  const clean = sanitizeSkinResult(result)
  if (!clean) return null
  writeJson(storage, SKIN_RESULT_KEY, { v: 1, result: clean })
  return clean
}

export function clearSkinResult(storage) {
  try {
    storage?.removeItem(SKIN_RESULT_KEY)
  } catch {
    /* ไม่มีอะไรต้องทำ */
  }
}

const THAI_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

/** '2026-11-21T07:05:00Z' → '21 พ.ย. 69 · 14:05 น.' (แสดงเป็นเวลาไทย ไม่ขึ้นกับเขตเวลาเครื่อง) */
export function thaiDateTime(iso) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const d = new Date(t + 7 * 3600 * 1000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth() + 1]} ${String((d.getUTCFullYear() + 543) % 100).padStart(2, '0')} · ${hh}:${mm} น.`
}
