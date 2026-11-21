import test from 'node:test'
import assert from 'node:assert/strict'
import { fromWeekRows, summarizeHours, toWeekRows, validateRows } from './shopHours.js'

const base = { opening_time: '10:00', closing_time: '19:00', closed_weekdays: [2], weekly_hours: {} }

test('toWeekRows/fromWeekRows: ทุกวันเวลาเดียวกัน = weekly_hours ว่าง (ทำงานแบบเดิม)', () => {
  const rows = toWeekRows(base)
  assert.equal(rows.length, 7)
  assert.equal(rows[2].open, false)
  assert.deepEqual(fromWeekRows(rows), { closed_weekdays: [2], opening_time: '10:00', closing_time: '19:00', weekly_hours: {} })
})

test('fromWeekRows: เวลาที่ใช้บ่อยสุดเป็นค่าเริ่มต้น เก็บเฉพาะวันที่ต่าง', () => {
  const rows = toWeekRows(base).map((r) => (r.day === 6 || r.day === 0 ? { ...r, openTime: '09:00', closeTime: '20:00' } : r))
  const out = fromWeekRows(rows)
  assert.equal(out.opening_time, '10:00')
  assert.deepEqual(out.weekly_hours, { 0: { open: '09:00', close: '20:00' }, 6: { open: '09:00', close: '20:00' } })
  // อ่านกลับแล้วได้ตารางเดิม
  assert.deepEqual(toWeekRows({ ...base, ...out }), rows)
})

test('validateRows', () => {
  const rows = toWeekRows(base)
  assert.equal(validateRows(rows), null)
  assert.match(validateRows(rows.map((r) => ({ ...r, open: false }))), /อย่างน้อย 1 วัน/)
  assert.match(validateRows(rows.map((r) => (r.day === 1 ? { ...r, closeTime: '09:00' } : r))), /วันจันทร์/)
})

test('summarizeHours: ย่อวันที่ติดกัน และแยกวันปิด', () => {
  assert.deepEqual(summarizeHours(base), [
    { days: 'จ., พ.–อา.', hours: '10:00–19:00 น.', closed: false },
    { days: 'อ.', hours: 'ปิด', closed: true },
  ])
  const weekend = { ...base, closed_weekdays: [], weekly_hours: { 6: { open: '09:00', close: '20:00' }, 0: { open: '09:00', close: '20:00' } } }
  assert.deepEqual(summarizeHours(weekend), [
    { days: 'จ.–ศ.', hours: '10:00–19:00 น.', closed: false },
    { days: 'ส.–อา.', hours: '09:00–20:00 น.', closed: false },
  ])
})
