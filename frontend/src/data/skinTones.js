// ข้อมูลโทนผิว + สีเล็บแนะนำ — ใช้ร่วมกันระหว่าง SkinToneAnalysis และ VirtualTryOn
// แยกออกมาเป็นไฟล์กลาง เพื่อให้ผลวิเคราะห์สีผิวส่งต่อไปแนะนำสีในหน้าทดลองเล็บได้ตรงกัน

export const TONE_INFO = {
  warm: {
    label: 'Warm Tone',
    desc: 'โทนผิวอุ่น อมเหลือง/ทอง',
    colors: [
      { name: 'Nude', hex: '#E8C39E' },
      { name: 'Brown', hex: '#8B5E3C' },
      { name: 'Coral', hex: '#FF7F6B' },
      { name: 'Peach', hex: '#FFCBA4' },
      { name: 'Rose Gold', hex: '#B76E79' },
    ],
    tip: 'ผิวโทนอุ่นเข้ากับสีโทนทอง น้ำตาล ส้ม พีชได้ดีเป็นพิเศษ ควรเลี่ยงสีเย็นจัด เช่น ฟ้าสดใสหรือม่วงเข้ม',
  },
  cool: {
    label: 'Cool Tone',
    desc: 'โทนผิวเย็น อมชมพู/ฟ้า',
    colors: [
      { name: 'Berry', hex: '#8E3B60' },
      { name: 'Plum', hex: '#6B3FA0' },
      { name: 'Icy Pink', hex: '#F3C6D6' },
      { name: 'Lavender', hex: '#B9A6DC' },
      { name: 'Silver', hex: '#C7CCD1' },
    ],
    tip: 'ผิวโทนเย็นเข้ากับสีโทนชมพู ม่วง ฟ้าได้ดีเป็นพิเศษ ควรเลี่ยงสีส้มสดหรือเหลืองทองจัด',
  },
  neutral: {
    label: 'Neutral Tone',
    desc: 'โทนผิวกลาง เข้าได้หลายสี',
    colors: [
      { name: 'Mauve', hex: '#9C6B7A' },
      { name: 'Terracotta', hex: '#C1613B' },
      { name: 'Soft Red', hex: '#C24D4D' },
      { name: 'Taupe', hex: '#8B7D6B' },
      { name: 'Gold', hex: '#D4AF37' },
    ],
    tip: 'ผิวโทนกลางเข้ากับสีได้เกือบทุกโทน ลองเล่นสีได้หลากหลายตามสไตล์ที่ชอบ',
  },
}
