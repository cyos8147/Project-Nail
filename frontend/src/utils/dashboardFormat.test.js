import test from 'node:test'
import assert from 'node:assert/strict'
import { baht, compare, deltaLabel, deltaTone, percentText, shortDate, monthLabel, fullDate, thaiTodayIso, shiftIso, longDate } from './dashboardFormat.js'

test('compare: เพิ่ม ลด เท่าเดิม และช่วงก่อนเป็นศูนย์', () => {
  assert.deepEqual(compare(950, 350), { kind: 'up', percent: ((950 - 350) / 350) * 100 })
  assert.equal(compare(100, 200).kind, 'down')
  assert.equal(compare(100, 200).percent, -50)
  assert.deepEqual(compare(0, 0), { kind: 'flat', percent: 0 })
  assert.deepEqual(compare(500, 0), { kind: 'new', percent: null })
  assert.equal(compare(100, 100).kind, 'flat')
})

test('compare: ช่วงก่อนติดลบ (กำไรขาดทุน) ไม่กลับเครื่องหมาย', () => {
  // ขาดทุน -100 → กำไร +50 ต้องเป็น "ขึ้น"
  assert.equal(compare(50, -100).kind, 'up')
  // กำไร 50 → ขาดทุน -100 ต้องเป็น "ลง"
  assert.equal(compare(-100, 50).kind, 'down')
})

test('deltaLabel และ deltaTone: ค่าใช้จ่ายที่ลดลงคือข่าวดี', () => {
  assert.equal(deltaLabel(compare(150, 100)), '▲ 50.0%')
  assert.equal(deltaLabel(compare(50, 100)), '▼ 50.0%')
  assert.match(deltaLabel(compare(5, 0)), /ใหม่/)
  assert.equal(deltaTone(compare(150, 100)), 'good')
  assert.equal(deltaTone(compare(150, 100), true), 'bad') // ค่าใช้จ่ายเพิ่ม
  assert.equal(deltaTone(compare(50, 100), true), 'good') // ค่าใช้จ่ายลด
  assert.equal(deltaTone(compare(5, 0)), 'neutral')
})

test('รูปแบบตัวเลขและวันที่', () => {
  assert.equal(baht(1234.4), '1,234 ฿')
  assert.equal(baht(null), '0 ฿')
  assert.equal(percentText(0.25), '25.0%')
  assert.equal(shortDate('2033-03-05'), '5 มี.ค.')
  assert.equal(monthLabel('2033-03-01'), 'มี.ค. 76')
})

test('วันที่ไทย: ตี 1 เวลาไทยต้องเป็นวันใหม่ ไม่ใช่เมื่อวานตาม UTC', () => {
  // 2033-03-14 18:00 UTC = 2033-03-15 01:00 เวลาไทย
  assert.equal(thaiTodayIso(Date.UTC(2033, 2, 14, 18, 0)), '2033-03-15')
  assert.equal(thaiTodayIso(Date.UTC(2033, 2, 15, 10, 0)), '2033-03-15')
  assert.equal(shiftIso('2033-03-01', -29), '2033-01-31')
  assert.equal(fullDate('2033-03-05'), '5 มี.ค. 76')
})

test('longDate: วันในสัปดาห์ถูกต้องและไม่เพี้ยนตามเขตเวลาเครื่อง', () => {
  assert.equal(longDate('2033-03-05'), 'ส. 5 มี.ค. 2576')
  assert.equal(longDate('2026-12-31'), 'พฤ. 31 ธ.ค. 2569')
  assert.equal(longDate('2026-01-01'), 'พฤ. 1 ม.ค. 2569')
  assert.equal(longDate(''), '')
})
