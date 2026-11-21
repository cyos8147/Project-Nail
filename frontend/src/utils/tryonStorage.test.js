import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HISTORY_KEY, HISTORY_MAX, addEntry, clearHistory, loadHistory, loadSkinResult, lookKey, removeEntry,
  sanitizeEntry, saveHistory, saveSkinResult, thaiDateTime, toggleFavorite,
} from './tryonStorage.js'

// storage ปลอมในหน่วยความจำ จำกัดขนาดรวมได้เพื่อจำลอง quota เต็ม
function fakeStorage(limitChars = Infinity) {
  const data = new Map()
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem(k, v) {
      const others = [...data.entries()].filter(([key]) => key !== k).reduce((n, [, val]) => n + val.length, 0)
      if (others + String(v).length > limitChars) throw new DOMException('quota', 'QuotaExceededError')
      data.set(k, String(v))
    },
    removeItem: (k) => data.delete(k),
  }
}

const look = (hex, extra = {}) => ({
  colors: [{ hex, name: 'สี ' + hex, finish: 'creamy', finishLabel: 'ครีมมี่' }],
  lengthKey: 'natural', lengthLabel: 'ธรรมชาติ', tipShape: 'round', tipLabel: 'มน', thumb: null, ...extra,
})

test('addEntry: ลุคใหม่ขึ้นบนสุด และลุคซ้ำไม่เพิ่มซ้ำแต่คงสถานะชอบ', () => {
  let list = []
  list = addEntry(list, look('#D23B4E'))
  list = addEntry(list, look('#93273F'))
  assert.deepEqual(list.map((e) => e.colors[0].hex), ['#93273F', '#D23B4E'])
  list = toggleFavorite(list, list[1].id)
  list = addEntry(list, look('#d23b4e')) // ตัวพิมพ์เล็กก็ต้องนับว่าซ้ำ
  assert.equal(list.length, 2)
  assert.equal(list[0].colors[0].hex, '#D23B4E')
  assert.equal(list[0].favorite, true)
})

test('addEntry: เกินจำนวนสูงสุดตัดอันเก่าสุดที่ไม่ชอบก่อน', () => {
  let list = []
  for (let i = 0; i < HISTORY_MAX; i++) list = addEntry(list, look('#' + (0x100000 + i).toString(16).padStart(6, '0')))
  const oldest = list[list.length - 1]
  list = toggleFavorite(list, oldest.id) // อันเก่าสุดแต่ชอบ ต้องรอด
  list = addEntry(list, look('#ABCDEF'))
  assert.equal(list.length, HISTORY_MAX)
  assert.ok(list.some((e) => e.id === oldest.id))
  assert.equal(list[0].colors[0].hex, '#ABCDEF')
})

test('หลายสีบนมือเดียว: ลำดับนิ้วไม่ทำให้ลุคซ้ำหลุดการเทียบ', () => {
  const a = { colors: [{ hex: '#111111', finish: 'matte' }, { hex: '#222222', finish: 'creamy' }] }
  const b = { colors: [{ hex: '#222222', finish: 'creamy' }, { hex: '#111111', finish: 'matte' }] }
  assert.equal(lookKey(a), lookKey(b))
  assert.notEqual(lookKey(a), lookKey({ ...a, lengthKey: 'long' }))
})

test('sanitizeEntry: ข้อมูลเสีย/ถูกแก้ ไม่หลุดเข้ามา', () => {
  assert.equal(sanitizeEntry(null), null)
  assert.equal(sanitizeEntry({ colors: [{ hex: 'red' }] }), null)
  assert.equal(sanitizeEntry({ colors: [] }), null)
  const e = sanitizeEntry({ colors: [{ hex: '#aabbcc', name: 'x'.repeat(500) }], thumb: 'javascript:alert(1)', favorite: 'yes' })
  assert.equal(e.colors[0].name.length, 40)
  assert.equal(e.thumb, null) // รับเฉพาะ data:image
  assert.equal(e.favorite, false)
})

test('saveHistory/loadHistory: เก็บและอ่านกลับได้ และเวอร์ชันแปลกหรือ JSON เสียคืนค่าว่าง', () => {
  const s = fakeStorage()
  const { list, ok } = saveHistory(s, addEntry([], look('#D23B4E', { thumb: 'data:image/jpeg;base64,AAAA' })))
  assert.ok(ok)
  assert.equal(loadHistory(s).length, 1)
  assert.equal(loadHistory(s)[0].thumb, list[0].thumb)
  s.setItem(HISTORY_KEY, '{not json')
  assert.deepEqual(loadHistory(s), [])
  s.setItem(HISTORY_KEY, JSON.stringify({ v: 99, items: [look('#D23B4E')] }))
  assert.deepEqual(loadHistory(s), [])
})

test('saveHistory: quota เต็ม → ตัดรูปย่อของอันเก่าก่อน แล้วยังเก็บสีไว้ครบ', () => {
  const big = 'data:image/jpeg;base64,' + 'A'.repeat(4000)
  let list = []
  for (let i = 0; i < 6; i++) list = addEntry(list, look('#' + (0x200000 + i).toString(16), { thumb: big }))
  const s = fakeStorage(15000) // พอใส่รูปได้ไม่ถึงครึ่ง
  const res = saveHistory(s, list)
  assert.ok(res.ok)
  assert.equal(res.list.length, 6) // สีครบ
  assert.ok(res.list.filter((e) => e.thumb).length < 6) // แต่รูปย่อบางอันถูกตัด
  assert.equal(res.list[0].thumb, big) // อันใหม่สุดต้องมีรูปเสมอ
  assert.deepEqual(loadHistory(s).map((e) => e.id), res.list.map((e) => e.id))
})

test('saveHistory: storage ใช้ไม่ได้ (null) ไม่ throw', () => {
  const res = saveHistory(null, addEntry([], look('#D23B4E')))
  assert.equal(res.ok, false)
  assert.deepEqual(loadHistory(null), [])
  assert.deepEqual(clearHistory(null), [])
})

test('removeEntry', () => {
  let list = addEntry(addEntry([], look('#111111')), look('#222222'))
  list = removeEntry(list, list[0].id)
  assert.equal(list.length, 1)
  assert.equal(list[0].colors[0].hex, '#111111')
})

test('ผลวิเคราะห์สีผิว: บันทึก อ่าน และตัดข้อมูลไม่ถูกต้อง', () => {
  const s = fakeStorage()
  assert.equal(loadSkinResult(s), null)
  assert.equal(saveSkinResult(s, { hex: 'zzz', undertone: 'warm' }), null)
  assert.equal(saveSkinResult(s, { hex: '#c89a7a', undertone: 'sparkly' }), null)
  const saved = saveSkinResult(s, {
    hex: '#c89a7a', depthKey: 'tan', depthLabel: 'ผิวแทน', undertone: 'warm', confidence: 'precise',
    recommended: [{ hex: '#d23b4e', name: 'แดงเชอร์รี่' }, { hex: 'bad' }],
  })
  assert.equal(saved.recommended.length, 1)
  const back = loadSkinResult(s)
  assert.equal(back.hex, '#C89A7A')
  assert.equal(back.confidence, 'precise')
  assert.equal(back.recommended[0].name, 'แดงเชอร์รี่')
})

test('thaiDateTime: แสดงเวลาไทยไม่ขึ้นกับเขตเวลาเครื่อง', () => {
  assert.equal(thaiDateTime('2026-11-21T07:05:00Z'), '21 พ.ย. 69 · 14:05 น.')
  assert.equal(thaiDateTime('2026-12-31T20:00:00Z'), '1 ม.ค. 70 · 03:00 น.')
  assert.equal(thaiDateTime('not a date'), '')
})
