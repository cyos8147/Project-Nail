import test from 'node:test'
import assert from 'node:assert/strict'
import { toRecommendScores, percentToScore, scoreLabel, SCORE_FLOOR } from './recommendScore.js'

test('อันดับ 1 ได้ 10.0 เสมอ แม้ความน่าจะเป็นดิบจะต่ำ', () => {
  const scores = toRecommendScores([41.2, 30, 15, 8, 3])
  assert.equal(scores[0], 10)
})

test('ลายที่ติดอันดับไม่เคยต่ำกว่าเกณฑ์ขั้นต่ำ และเรียงตามอันดับ', () => {
  const scores = toRecommendScores([60, 25, 10, 4, 0.5])
  assert.ok(scores.every((s) => s >= SCORE_FLOOR && s <= 10))
  assert.deepEqual([...scores].sort((a, b) => b - a), scores)
  assert.ok(scores[4] >= SCORE_FLOOR && scores[4] < 7) // อันดับท้ายยังเห็นว่าด้อยกว่า
})

test('คะแนนเท่ากันเมื่อความน่าจะเป็นเท่ากัน และไม่หารศูนย์เมื่อข้อมูลเป็น 0 ทั้งหมด', () => {
  assert.deepEqual(toRecommendScores([20, 20, 20]), [10, 10, 10])
  assert.deepEqual(toRecommendScores([0, 0]), [SCORE_FLOOR, SCORE_FLOOR])
  assert.deepEqual(toRecommendScores([]), [])
  assert.deepEqual(toRecommendScores([NaN, 'x', null]), [SCORE_FLOOR, SCORE_FLOOR, SCORE_FLOOR])
})

test('percentToScore: 0–100 → เต็ม 10 และกันค่านอกช่วง', () => {
  assert.equal(percentToScore(96), 9.6)
  assert.equal(percentToScore(55), 5.5)
  assert.equal(percentToScore(130), 10)
  assert.equal(percentToScore(-5), 0)
  assert.equal(scoreLabel(9), '9.0')
})
