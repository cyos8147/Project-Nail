import test from 'node:test'
import assert from 'node:assert/strict'
import { pickServiceMotif } from './serviceMotif.js'

test('บริการทำผมได้ภาพตรงประเภท', () => {
  const cases = {
    'สระ + ไดร์': 'wash',
    'สระ ซอย ไดร์': 'wash',
    'ตัดผม': 'cut',
    'ทำสีผม': 'hairColor',
    'ยืด / ดัดผม': 'straighten',
    'ยืดโคนดัดปลาย': 'straighten',
    'ยืดเคราติน': 'straighten',
    'ดัดวอลลุ่ม': 'perm',
    'ทรีทเมนต์บำรุงผม': 'treatment',
    'แต่งหน้า - ทำผม': 'makeup',
    'กันคิ้ว': 'brow',
  }
  for (const [name, motif] of Object.entries(cases)) assert.equal(pickServiceMotif(name, 'hair'), motif, name)
})

test('บริการทำเล็บได้ภาพตรงประเภท และ "ทำสี" ในหมวดเล็บคือทาสีเล็บ', () => {
  const cases = {
    'ทำสีเจล': 'polish',
    'เพ้นท์ลาย': 'nailArt',
    'ต่อเล็บ PVC / เจล': 'extension',
    'ดูแลผิวมือ & เท้า': 'spa',
    'ถอดเล็บเจล': 'remove',
    'ทาสีธรรมดา': 'polish',
  }
  for (const [name, motif] of Object.entries(cases)) assert.equal(pickServiceMotif(name, 'nail'), motif, name)
})

test('ชื่อที่ไม่รู้จักใช้ภาพตามหมวด', () => {
  assert.equal(pickServiceMotif('บริการพิเศษ', 'hair'), 'hair')
  assert.equal(pickServiceMotif('บริการพิเศษ', 'nail'), 'polish')
  assert.equal(pickServiceMotif('', 'other'), 'sparkle')
  assert.equal(pickServiceMotif(null, undefined), 'sparkle')
})
