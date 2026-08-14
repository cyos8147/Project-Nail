export const categories = [
  { id: 'hair', label: 'ทำผม', icon: '💇‍♀️' },
  { id: 'nail', label: 'ทำเล็บ', icon: '💅' },
]

export const servicesByCategory = {
  hair: [
    { id: 'wash-blow', name: 'สระ + ไดร์', duration: 45, price: 250, isColor: false },
    { id: 'haircut', name: 'ตัดผม', duration: 60, price: 350, isColor: false },
    { id: 'hair-color', name: 'ทำสีผม', duration: 150, price: 1500, isColor: true },
    { id: 'perm', name: 'ยืด / ดัดผม', duration: 180, price: 1800, isColor: false },
    { id: 'treatment', name: 'ทรีทเมนต์บำรุงผม', duration: 60, price: 500, isColor: false },
  ],
  nail: [
    { id: 'gel-color', name: 'ทำสีเจล', duration: 60, price: 350 },
    { id: 'nail-art', name: 'เพ้นท์ลาย', duration: 45, price: 200 },
    { id: 'extension', name: 'ต่อเล็บ PVC / เจล', duration: 90, price: 600 },
    { id: 'hand-care', name: 'ดูแลผิวมือ & เท้า', duration: 30, price: 300 },
  ],
}

export const colorShades = [
  { id: 'golden-brown', name: 'น้ำตาลอมทอง', hex: '#B5793A' },
  { id: 'chocolate', name: 'น้ำตาลช็อกโกแลต', hex: '#5B3A29' },
  { id: 'ash-blonde', name: 'บลอนด์หม่น', hex: '#C9B48A' },
  { id: 'wine-red', name: 'แดงไวน์', hex: '#6E1F2A' },
  { id: 'smoky-grey', name: 'เทาหม่น', hex: '#8A8A8E' },
  { id: 'natural-black', name: 'ดำธรรมชาติ', hex: '#2B2620' },
]

// เวลาทำการของร้าน — ใช้เจนช่วงเวลาให้เลือกในแต่ละวัน
export const timeSlots = [
  '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
]

// จำลองคิวที่ถูกจองไปแล้ว โดยอิงจากวันที่ (deterministic เพื่อไม่ให้เปลี่ยนทุกครั้งที่ render)
export function getBookedSlots(dateKey) {
  let hash = 0
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 997
  }
  const bookedCount = 2 + (hash % 3) // 2-4 คิวที่ถูกจองแล้ว
  const booked = new Set()
  const n = timeSlots.length
  // ไล่ index แบบมีขอบเขตแน่นอน (สูงสุด n รอบ) แทนการวนแบบ while เดิมที่เคยมีบั๊ก
  // ทำให้บางวันที่คำนวณแล้วค่าเข้ารูปแบบวนซ้ำจุดเดิมไม่รู้จบ (หน้าเว็บค้าง) — step*4 กับ n=9
  // ไม่มีตัวหารร่วมกัน จึงไล่ครบทุก index ภายใน n รอบเสมอ รับประกันว่าลูปจบแน่นอน
  for (let step = 0; step < n && booked.size < bookedCount; step++) {
    const idx = (hash + step * 4) % n
    booked.add(timeSlots[idx])
  }
  return booked
}

export const CLOSED_WEEKDAY = 2 // ร้านหยุดทุกวันอังคาร (0 = อาทิตย์)
