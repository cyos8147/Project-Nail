import { useId } from 'react'
import { pickServiceMotif } from '../utils/serviceMotif.js'

// ภาพประกอบของบริการ (วาดด้วย SVG) ใช้เมื่อแอดมินยังไม่ได้อัปโหลดรูปจริง
// ขนาดภาพ 160×120 ยืดเต็มกรอบที่ใส่ (slice) จึงใช้ได้ทั้งการ์ดเล็กและใหญ่

const PINK = '#EC4C82'
const DEEP = '#C9336A'
const SOFT = '#F9A8C9'
const BLUSH = '#FFE3EE'
const PEACH = '#FFD9C7'
const LILAC = '#CDB6FF'
const PLUM = '#8E5BD6'
const SKIN = '#F8D3BF'
const STEEL = '#B9B4C7'

const TONES = {
  pink: ['#FFF1F6', '#FBC9DB'],
  peach: ['#FFF4EE', '#FFD3C2'],
  lilac: ['#F7F1FF', '#DCCBFF'],
}

const MOTIF_TONE = {
  wash: 'lilac', cut: 'peach', hairColor: 'lilac', straighten: 'peach', perm: 'pink', treatment: 'lilac',
  makeup: 'pink', brow: 'peach', hair: 'peach',
  polish: 'pink', nailArt: 'peach', extension: 'lilac', spa: 'peach', remove: 'pink', sparkle: 'pink',
}

const Heart = ({ x, y, s = 1, fill = '#fff', o = 0.9 }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 3 C0 -1 5 -2 6 2 C7 -2 12 -1 12 3 C12 7 6 10 6 11 C6 10 0 7 0 3Z"
    fill={fill}
    opacity={o}
  />
)

const Spark = ({ x, y, s = 1, fill = '#fff' }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -6 C0.6 -1.2 1.2 -0.6 6 0 C1.2 0.6 0.6 1.2 0 6 C-0.6 1.2 -1.2 0.6 -6 0 C-1.2 -0.6 -0.6 -1.2 0 -6Z" fill={fill} />
)

const MOTIFS = {
  // ไดร์เป่าผม + หยดน้ำ
  wash: (
    <g>
      <circle cx="44" cy="36" r="4" fill="#9CC9E8" />
      <circle cx="34" cy="50" r="3" fill="#9CC9E8" />
      <rect x="82" y="44" width="40" height="20" rx="7" fill={PINK} />
      <circle cx="74" cy="54" r="24" fill={PINK} />
      <circle cx="74" cy="54" r="11" fill={BLUSH} />
      <circle cx="74" cy="54" r="5" fill={SOFT} />
      <rect x="64" y="72" width="17" height="36" rx="8" fill={DEEP} transform="rotate(-8 72 90)" />
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <path d="M128 48h12" />
        <path d="M128 56h18" />
        <path d="M128 64h10" />
      </g>
    </g>
  ),
  // กรรไกร + หวี
  cut: (
    <g>
      <rect x="30" y="86" width="96" height="12" rx="4" fill={SOFT} />
      <g fill={SOFT}>
        {Array.from({ length: 11 }, (_, i) => (
          <rect key={i} x={34 + i * 8.4} y="96" width="4" height="10" rx="2" />
        ))}
      </g>
      <path d="M70 58 L124 24" stroke={STEEL} strokeWidth="8" strokeLinecap="round" />
      <path d="M70 50 L124 84" stroke="#D6D2E0" strokeWidth="8" strokeLinecap="round" />
      <circle cx="56" cy="66" r="13" fill="none" stroke={PINK} strokeWidth="7" />
      <circle cx="56" cy="40" r="13" fill="none" stroke={PINK} strokeWidth="7" />
      <circle cx="80" cy="54" r="4" fill={DEEP} />
    </g>
  ),
  // ถ้วยผสมสี + แปรงทาสีผม
  hairColor: (
    <g>
      <path d="M36 62 h70 a35 28 0 0 1 -70 0z" fill={PLUM} />
      <ellipse cx="71" cy="62" rx="35" ry="8" fill={LILAC} />
      <path d="M48 62 c8 -6 20 -6 28 0 s20 6 28 0" fill="none" stroke={PLUM} strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <rect x="96" y="22" width="9" height="56" rx="4" fill={PINK} transform="rotate(32 100 50)" />
      <rect x="112" y="14" width="18" height="12" rx="3" fill="#4A3557" transform="rotate(32 121 20)" />
      <path d="M44 74 q27 16 54 0" fill="none" stroke="#fff" strokeWidth="3" opacity=".5" />
    </g>
  ),
  // เครื่องหนีบผม + ผมเส้นตรง
  straighten: (
    <g>
      <g stroke="#E0A06E" strokeWidth="4" strokeLinecap="round">
        <path d="M34 22v80" />
        <path d="M44 22v80" />
        <path d="M54 22v80" />
      </g>
      <rect x="66" y="26" width="16" height="74" rx="7" fill={PINK} transform="rotate(10 74 63)" />
      <rect x="86" y="26" width="16" height="74" rx="7" fill={DEEP} transform="rotate(18 94 63)" />
      <rect x="70" y="30" width="6" height="34" rx="3" fill={BLUSH} transform="rotate(10 74 63)" />
      <circle cx="86" cy="96" r="7" fill="#4A3557" />
    </g>
  ),
  // ลอนผมดัด
  perm: (
    <g fill="none" strokeLinecap="round">
      <path d="M40 20 c18 0 18 16 0 16 s-18 16 0 16 s18 16 0 16 s-18 16 0 16" stroke="#E0A06E" strokeWidth="8" />
      <path d="M80 16 c18 0 18 16 0 16 s-18 16 0 16 s18 16 0 16 s-18 16 0 16" stroke="#C98552" strokeWidth="8" />
      <path d="M120 22 c18 0 18 16 0 16 s-18 16 0 16 s18 16 0 16 s-18 16 0 16" stroke="#E0A06E" strokeWidth="8" />
    </g>
  ),
  // ขวดทรีทเมนต์ + หยด + ใบไม้
  treatment: (
    <g>
      <rect x="62" y="16" width="22" height="16" rx="4" fill={DEEP} />
      <rect x="52" y="30" width="42" height="74" rx="14" fill={PLUM} />
      <rect x="60" y="54" width="26" height="26" rx="6" fill="#fff" opacity=".9" />
      <Heart x={67} y={61} s={1} fill={PINK} o={1} />
      <rect x="58" y="36" width="7" height="58" rx="3.5" fill="#fff" opacity=".3" />
      <path d="M112 44 c-10 12 -10 22 0 22 s10 -10 0 -22z" fill="#9CC9E8" />
      <path d="M104 90 c10 -24 30 -26 36 -24 c-2 16 -16 28 -36 24z" fill="#9BD3A6" />
      <path d="M106 88 c10 -8 18 -14 30 -20" stroke="#fff" strokeWidth="2" fill="none" />
    </g>
  ),
  // ลิปสติก + แปรงแต่งหน้า
  makeup: (
    <g>
      <rect x="46" y="62" width="30" height="44" rx="5" fill="#4A3557" />
      <rect x="48" y="48" width="26" height="18" rx="3" fill="#E8B84B" />
      <path d="M50 48 v-22 l22 -10 v32z" fill={PINK} />
      <path d="M53 46 v-17 l5 -2 v19z" fill="#fff" opacity=".45" />
      <rect x="96" y="40" width="10" height="66" rx="5" fill={SOFT} transform="rotate(-18 101 73)" />
      <path d="M96 40 c-6 -18 4 -28 14 -28 c6 10 4 22 -4 30z" fill={DEEP} transform="rotate(-18 101 73)" />
    </g>
  ),
  // คิ้ว + ดวงตา
  brow: (
    <g fill="none" strokeLinecap="round">
      <path d="M36 50 q40 -26 88 -4" stroke="#6B4A3A" strokeWidth="10" />
      <path d="M46 80 q34 20 70 0" stroke="#4A3557" strokeWidth="5" />
      <g stroke="#4A3557" strokeWidth="3">
        <path d="M54 86 l-4 8" />
        <path d="M68 91 l-2 9" />
        <path d="M82 92 l1 9" />
        <path d="M96 90 l3 8" />
        <path d="M108 85 l5 7" />
      </g>
    </g>
  ),
  // ศีรษะผู้หญิง (ภาพเริ่มต้นหมวดผม)
  hair: (
    <g>
      <path d="M44 106 c-6 -46 10 -84 36 -84 s42 38 36 84z" fill="#C98552" />
      <circle cx="80" cy="56" r="22" fill={SKIN} />
      <path d="M56 54 c0 -22 14 -30 26 -30 c14 0 24 10 24 26 c-14 0 -30 -8 -36 -16 c-4 10 -8 16 -14 20z" fill="#C98552" />
      <circle cx="72" cy="62" r="2.5" fill="#4A3557" />
      <circle cx="88" cy="62" r="2.5" fill="#4A3557" />
      <path d="M75 70 q5 4 10 0" stroke={PINK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  ),
  // ขวดยาทาเล็บ
  polish: (
    <g>
      <rect x="68" y="12" width="24" height="30" rx="5" fill="#4A3557" />
      <rect x="72" y="16" width="5" height="22" rx="2.5" fill="#fff" opacity=".3" />
      <rect x="54" y="40" width="52" height="64" rx="16" fill={PINK} />
      <rect x="61" y="48" width="9" height="46" rx="4.5" fill="#fff" opacity=".45" />
      <rect x="70" y="62" width="30" height="22" rx="5" fill="#fff" opacity=".92" />
      <Heart x={79} y={67} s={1} fill={PINK} o={1} />
      <circle cx="122" cy="84" r="9" fill={SOFT} />
      <circle cx="122" cy="84" r="4" fill="#fff" opacity=".6" />
    </g>
  ),
  // นิ้วกับเล็บเพ้นท์ลายดอกไม้
  nailArt: (
    <g>
      <rect x="56" y="36" width="48" height="96" rx="24" fill={SKIN} />
      <rect x="62" y="22" width="36" height="52" rx="18" fill={SOFT} />
      <rect x="66" y="27" width="7" height="36" rx="3.5" fill="#fff" opacity=".45" />
      <g transform="translate(82 46)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-7" rx="4.5" ry="7" fill="#fff" transform={`rotate(${a})`} />
        ))}
        <circle r="3.5" fill="#E8B84B" />
      </g>
      <Spark x={28} y={44} s={1.2} fill={PINK} />
    </g>
  ),
  // เล็บต่อทรงอัลมอนด์ 3 นิ้ว
  extension: (
    <g>
      <path d="M80 10 c13 22 15 50 0 84 c-15 -34 -13 -62 0 -84z" fill={PINK} />
      <path d="M48 26 c13 22 15 48 0 80 c-15 -32 -13 -58 0 -80z" fill={SOFT} transform="rotate(-18 48 66)" />
      <path d="M112 26 c13 22 15 48 0 80 c-15 -32 -13 -58 0 -80z" fill={PLUM} opacity=".85" transform="rotate(18 112 66)" />
      <path d="M76 22 c4 10 5 22 3 34" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
      <Spark x={80} y={70} s={1} />
    </g>
  ),
  // อ่างสปามือ + ฟองน้ำ + กลีบดอก
  spa: (
    <g>
      <path d="M28 64 h104 a52 34 0 0 1 -104 0z" fill="#fff" />
      <ellipse cx="80" cy="64" rx="52" ry="10" fill="#BFE3F5" />
      <path d="M68 60 c4 -8 12 -8 16 0 c-4 4 -12 4 -16 0z" fill={PINK} />
      <path d="M78 56 c6 -6 14 -4 14 4 c-6 2 -12 0 -14 -4z" fill={SOFT} />
      <circle cx="46" cy="40" r="8" fill="#fff" opacity=".85" />
      <circle cx="60" cy="28" r="5" fill="#fff" opacity=".85" />
      <circle cx="112" cy="36" r="7" fill="#fff" opacity=".85" />
      <path d="M40 100 q40 10 80 0" stroke={SOFT} strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  ),
  // สำลีถอดเล็บ + ขวดน้ำยา
  remove: (
    <g>
      <rect x="96" y="30" width="30" height="64" rx="8" fill="#BFE3F5" />
      <rect x="102" y="18" width="18" height="14" rx="3" fill={PLUM} />
      <rect x="101" y="38" width="6" height="46" rx="3" fill="#fff" opacity=".5" />
      <circle cx="62" cy="70" r="28" fill="#fff" />
      <circle cx="62" cy="70" r="20" fill="none" stroke={BLUSH} strokeWidth="3" strokeDasharray="2 5" strokeLinecap="round" />
      <circle cx="54" cy="64" r="4" fill={PINK} opacity=".6" />
    </g>
  ),
  sparkle: (
    <g>
      <Spark x={80} y={60} s={4} fill={PINK} />
      <Spark x={48} y={36} s={1.6} fill="#fff" />
      <Spark x={116} y={86} s={2} fill="#fff" />
    </g>
  ),
}

export default function ServiceArt({ name, categoryId, className = '' }) {
  const motif = pickServiceMotif(name, categoryId)
  const [from, to] = TONES[MOTIF_TONE[motif] || 'pink']
  const gid = `sa${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={name}>
      <defs>
        <radialGradient id={gid} cx="35%" cy="25%" r="90%">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </radialGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#${gid})`} />
      <circle cx="140" cy="18" r="30" fill="#fff" opacity=".35" />
      {MOTIFS[motif]}
      <Spark x={22} y={18} s={1} />
      <Spark x={142} y={104} s={0.8} />
      <Heart x={128} y={12} s={0.8} fill="#fff" o={0.8} />
    </svg>
  )
}
