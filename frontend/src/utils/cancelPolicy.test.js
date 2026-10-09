// รันด้วย: npm test  (ใช้ตัวรันทดสอบที่มากับ Node ไม่ต้องติดตั้งอะไรเพิ่ม)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isTooLateToChange } from './cancelPolicy.js'

// คิววันที่ 10 ต.ค. 2026 เวลา 10:00 (เวลาไทย) = 03:00 UTC
const booking = { booking_date: '2026-10-10', booking_time: '10:00' }
const at = (iso) => new Date(iso).getTime()

test('ไม่ได้ตั้งเวลาล่วงหน้า (0 หรือไม่มีค่า) = ไม่เคยถือว่าสายเกินไป แม้เลยเวลานัดไปแล้ว', () => {
  assert.equal(isTooLateToChange(booking, 0, at('2026-10-10T20:00:00Z')), false)
  assert.equal(isTooLateToChange(booking, undefined, at('2026-10-10T20:00:00Z')), false)
  assert.equal(isTooLateToChange(null, 6), false)
})

test('ตั้ง 6 ชั่วโมง: เหลือ 9 ชม. ยังทำได้ เหลือ 3 ชม. ทำไม่ได้', () => {
  assert.equal(isTooLateToChange(booking, 6, at('2026-10-09T18:00:00Z')), false) // 01:00 น. ไทย = ก่อนนัด 9 ชม.
  assert.equal(isTooLateToChange(booking, 6, at('2026-10-10T00:00:00Z')), true) //  07:00 น. ไทย = ก่อนนัด 3 ชม.
})

test('เส้นแบ่งพอดี: เหลือเวลาเท่ากับที่กำหนดพอดียังทำได้ ขาดไปหนึ่งนาทีทำไม่ได้', () => {
  assert.equal(isTooLateToChange(booking, 6, at('2026-10-09T21:00:00Z')), false) // 04:00 น. ไทย = ก่อนนัด 6 ชม. พอดี
  assert.equal(isTooLateToChange(booking, 6, at('2026-10-09T21:01:00Z')), true)
})

test('เลยเวลานัดไปแล้วถือว่าสายเกินไป (เมื่อมีการตั้งกฎ)', () => {
  assert.equal(isTooLateToChange(booking, 1, at('2026-10-10T05:00:00Z')), true)
})

test('คิดเป็นเวลาไทยเสมอ ไม่ขึ้นกับเขตเวลาของเครื่อง', () => {
  const original = process.env.TZ
  for (const tz of ['UTC', 'Asia/Bangkok', 'America/Los_Angeles']) {
    process.env.TZ = tz
    assert.equal(isTooLateToChange(booking, 6, at('2026-10-10T00:00:00Z')), true, tz)
    assert.equal(isTooLateToChange(booking, 6, at('2026-10-09T18:00:00Z')), false, tz)
  }
  process.env.TZ = original
})
