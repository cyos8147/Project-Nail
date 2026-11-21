import test from 'node:test'
import assert from 'node:assert/strict'
import { CARRY_DESIGN_KEY, pickNailService, sanitizeCarry, saveCarryDesign, shadeFromCarry, shadeLabel, takeCarryDesign } from './carryDesign.js'

function fakeStorage(limit = Infinity) {
  const m = new Map()
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    removeItem: (k) => m.delete(k),
    setItem(k, v) {
      if (String(v).length > limit) throw new DOMException('quota', 'QuotaExceededError')
      m.set(k, String(v))
    },
  }
}

const tryon = (extra = {}) => ({
  source: 'tryon',
  colors: [{ hex: '#d23b4e', name: 'แดงเชอร์รี่', finish: 'creamy', finishLabel: 'ครีมมี่' }],
  lengthKey: 'natural', lengthLabel: 'ธรรมชาติ', tipShape: 'round', tipLabel: '',
  reference_image_base64: 'data:image/jpeg;base64,AAAA', ...extra,
})

const services = [
  { id: '1', name: 'ดูแลผิวมือ & เท้า' },
  { id: '2', name: 'ต่อเล็บ PVC / เจล' },
  { id: '3', name: 'ทำสีเจล' },
  { id: '4', name: 'เพ้นท์ลาย' },
]

test('เลือกบริการ: ลองสีเฉยๆ → ทำสีเจล, ต่อความยาว → ต่อเล็บ', () => {
  assert.equal(pickNailService(services, tryon()).name, 'ทำสีเจล')
  assert.equal(pickNailService(services, tryon({ lengthKey: 'long', lengthLabel: 'ยาว' })).name, 'ต่อเล็บ PVC / เจล')
})

test('เลือกบริการ: ไม่มีคำที่ตรงเลย ใช้บริการแรก และรายการว่างไม่พัง', () => {
  const odd = [{ id: 'a', name: 'ทำเล็บแบบพิเศษ' }, { id: 'b', name: 'อื่นๆ' }]
  assert.equal(pickNailService(odd, tryon()).id, 'a')
  assert.equal(pickNailService([], tryon()), null)
  assert.equal(pickNailService(null, tryon()), null)
  // ต่อความยาวแต่ร้านไม่มีบริการต่อเล็บ → ตกไปทำสีเจล
  assert.equal(pickNailService(services.filter((s) => s.id !== '2'), tryon({ lengthKey: 'long' })).name, 'ทำสีเจล')
})

test('ข้อความสีในใบจอง: ชื่อสี · พื้นผิว · ความยาว/ทรง และไม่เกิน 100 ตัวอักษร (คอลัมน์รับ 120)', () => {
  const c = sanitizeCarry(tryon({ lengthKey: 'long', lengthLabel: 'ยาว', tipShape: 'almond', tipLabel: 'อัลมอนด์' }))
  assert.equal(shadeLabel(c), 'แดงเชอร์รี่ · ครีมมี่ · ต่อเล็บยาว ทรงอัลมอนด์')
  const long = sanitizeCarry(tryon({ colors: Array.from({ length: 5 }, (_, i) => ({ hex: '#11111' + i, name: 'ชื่อสีที่ยาวมากๆ ' + i })) }))
  assert.ok(shadeLabel(long).length <= 100)
  assert.deepEqual(shadeFromCarry(c), { id: 'ai-d23b4e', name: shadeLabel(c), hex: '#D23B4E' })
  assert.equal(shadeFromCarry(null), null)
})

test('sanitizeCarry: ไม่เชื่อข้อมูลใน storage', () => {
  assert.equal(sanitizeCarry(null), null)
  assert.equal(sanitizeCarry({ summary: 'ไม่มีอะไรให้ส่ง' }), null)
  const c = sanitizeCarry({ ...tryon(), reference_image_base64: 'http://evil.example/x.png', source: 'hack', colors: [{ hex: 'red' }, ...tryon().colors] })
  assert.equal(c.reference_image_base64, null)
  assert.equal(c.source, 'tryon')
  assert.equal(c.colors.length, 1)
  // ลายจากแคตตาล็อก (ไม่มีรูป ไม่มีสี) ต้องผ่าน
  assert.ok(sanitizeCarry({ nail_design_id: 'abc', nail_design_name: 'Marble', color_hex: '#9C6B7A' }))
})

test('saveCarryDesign/takeCarryDesign: เก็บ อ่านครั้งเดียว แล้วลบ', () => {
  const s = fakeStorage()
  assert.deepEqual(saveCarryDesign(tryon(), s), { ok: true, imageDropped: false })
  assert.ok(s.m.has(CARRY_DESIGN_KEY))
  assert.equal(takeCarryDesign(s).colors[0].hex, '#D23B4E')
  assert.equal(takeCarryDesign(s), null) // ใช้แล้วหมด
})

test('saveCarryDesign: quota เต็ม → ทิ้งรูปแต่ส่งสีต่อ และบอกว่ารูปไม่ได้ไป', () => {
  const s = fakeStorage(600)
  const big = tryon({ reference_image_base64: 'data:image/jpeg;base64,' + 'A'.repeat(5000) })
  assert.deepEqual(saveCarryDesign(big, s), { ok: true, imageDropped: true })
  const back = takeCarryDesign(s)
  assert.equal(back.reference_image_base64, null)
  assert.equal(back.imageDropped, true)
  assert.equal(back.colors[0].name, 'แดงเชอร์รี่')
})

test('saveCarryDesign: ไม่มี storage หรือข้อมูลว่าง ไม่ throw', () => {
  assert.equal(saveCarryDesign({}, fakeStorage()).ok, false)
  const broken = { setItem() { throw new Error('blocked') }, getItem() { throw new Error('blocked') }, removeItem() {} }
  assert.equal(saveCarryDesign(tryon(), broken).ok, false)
  assert.equal(takeCarryDesign(broken), null)
})
