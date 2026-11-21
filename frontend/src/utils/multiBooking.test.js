import test from 'node:test'
import assert from 'node:assert/strict'
import { addableServices, buildChain, chainParam, chainTotals, formatMinutes, MAX_SERVICES } from './multiBooking.js'

const hair = { id: 'h1', category_id: 'hair', name: 'ตัดผม', duration_minutes: 60, price: '350.00' }
const wash = { id: 'h2', category_id: 'hair', name: 'สระ + ไดร์', duration_minutes: 45, price: 250 }
const nail = { id: 'n1', category_id: 'nail', name: 'ทำสีเจล', duration_minutes: 60, price: 350 }
const paint = { id: 'n2', category_id: 'nail', name: 'เพ้นท์ลาย', duration_minutes: 45, price: 200 }

test('buildChain: บริการถัดไปเริ่มตอนบริการก่อนหน้าเสร็จ (ตรงกับ backend)', () => {
  const chain = buildChain(paint, [wash, hair], '13:00')
  assert.deepEqual(chain.map((c) => [c.service.id, c.start, c.end]), [
    ['n2', '13:00', '13:45'],
    ['h2', '13:45', '14:30'],
    ['h1', '14:30', '15:30'],
  ])
})

test('buildChain: เวลาที่ AI ประเมินเพิ่มบวกเฉพาะบริการหลัก และยังไม่เลือกเวลาก็คำนวณได้', () => {
  const chain = buildChain(nail, [hair], null, 15)
  assert.deepEqual(chain.map((c) => [c.duration, c.start]), [[75, null], [60, null]])
  assert.equal(chainParam(chain), 'nail:75,hair:60')
  assert.deepEqual(chainTotals(chain), { minutes: 135, price: 700 })
  assert.deepEqual(buildChain(null, [hair]), [])
})

test('addableServices: ไม่ให้เลือกซ้ำและไม่เกินจำนวนสูงสุด', () => {
  const all = [hair, wash, nail, paint]
  assert.deepEqual(addableServices(all, hair, []).map((s) => s.id), ['h2', 'n1', 'n2'])
  assert.deepEqual(addableServices(all, hair, [nail]).map((s) => s.id), ['h2', 'n2'])
  assert.equal(MAX_SERVICES, 3)
  assert.deepEqual(addableServices(all, hair, [nail, paint]), [])
  assert.deepEqual(addableServices(all, null, []), [])
})

test('formatMinutes', () => {
  assert.equal(formatMinutes(45), '45 นาที')
  assert.equal(formatMinutes(120), '2 ชม.')
  assert.equal(formatMinutes(135), '2 ชม. 15 นาที')
})
