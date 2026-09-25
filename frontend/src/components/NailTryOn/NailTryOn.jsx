import { useEffect, useRef, useState } from 'react';
import './NailTryOn.css';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/ai/detect-nails`;

const PALETTE = [
  { hex: '#D23B4E', name: 'แดงเชอร์รี่', undertone: 'warm' }, { hex: '#93273F', name: 'แดงไวน์', undertone: 'cool' }, { hex: '#B33A5E', name: 'แดงเบอร์รี่', undertone: 'cool' },
  { hex: '#E8899D', name: 'ชมพูหวาน', undertone: 'cool' }, { hex: '#F4C6CE', name: 'ชมพูพีช', undertone: 'warm' }, { hex: '#E67A52', name: 'ส้มคาราเมล', undertone: 'warm' },
  { hex: '#E2A13D', name: 'เหลืองน้ำผึ้ง', undertone: 'warm' }, { hex: '#E5C452', name: 'เหลืองมะนาว', undertone: 'warm' }, { hex: '#B08A5E', name: 'น้ำตาลลาเต้', undertone: 'warm' },
  { hex: '#7A5233', name: 'น้ำตาลช็อกโกแลต', undertone: 'warm' }, { hex: '#3D4A87', name: 'น้ำเงินเข้ม', undertone: 'cool' }, { hex: '#5C5FA6', name: 'ม่วงลาเวนเดอร์', undertone: 'cool' },
  { hex: '#93B7D6', name: 'ฟ้าหมอก', undertone: 'cool' }, { hex: '#4C93C9', name: 'ฟ้าทะเล', undertone: 'cool' }, { hex: '#52B4BF', name: 'เขียวเทอร์ควอยซ์', undertone: 'cool' },
  { hex: '#4C9868', name: 'เขียวมรกต', undertone: 'neutral' }, { hex: '#7FC28D', name: 'เขียวมิ้นต์', undertone: 'cool' }, { hex: '#4B7A5C', name: 'เขียวป่า', undertone: 'neutral' },
  { hex: '#6B7A4C', name: 'เขียวมะกอก', undertone: 'warm' }, { hex: '#37472A', name: 'เขียวเข้ม', undertone: 'neutral' },
];

const FINISHES = [
  { key: 'creamy', label: 'ครีมมี่' }, { key: 'jelly', label: 'เจลลี่' }, { key: 'sheer', label: 'เชียร์' },
  { key: 'matte', label: 'แมท' }, { key: 'metallic', label: 'เมทัลลิก' }, { key: 'pearl', label: 'มุก' },
  { key: 'texture', label: 'พื้นผิว' }, { key: 'glitter', label: 'ประกาย' },
];

const FINISH_ALPHA = {
  creamy: 0.93, jelly: 0.75, sheer: 0.4, matte: 0.95,
  metallic: 0.9, pearl: 0.68, texture: 0.9, glitter: 0.9,
};

const TIPS_DISMISSED_KEY = 'nailTipsDismissed';

// ---------- pure helpers (no React state, just canvas/geometry math) ----------

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function clamp255(x) { return Math.max(0, Math.min(255, Math.round(x))); }
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return `#${[r, g, b].map((c) => clamp255(c + amt).toString(16).padStart(2, '0')).join('')}`;
}
function swatchGradient(hex) {
  return `radial-gradient(circle at 32% 26%, ${shade(hex, 60)}, ${hex} 55%, ${shade(hex, -35)} 100%)`;
}

// Chaikin's corner-cutting: rounds a raw ~30-point mask polygon's corners.
function chaikinSmooth(points, iterations = 2) {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % n];
      next.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25]);
      next.push([p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]);
    }
    pts = next;
  }
  return pts;
}

function polygonBBox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
}

// Traces a smoothed outline through the polygon points using quadratic
// curves through each edge's midpoint, instead of straight lineTo segments.
function tracePolygon(ctx, points) {
  const n = points.length;
  if (n < 3) {
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    return;
  }
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = midpoint(points[n - 1], points[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const next = points[(i + 1) % n];
    const m = midpoint(points[i], next);
    ctx.quadraticCurveTo(points[i][0], points[i][1], m[0], m[1]);
  }
  ctx.closePath();
}

// Recolors within the real nail polygon (opaque tint + 'hue' blend so some of
// the original highlights/shadows stay visible without washing the color
// out), then layers finish-specific effects, then a soft blurred edge stroke
// so the polish blends into the skin instead of looking cut out.
function paintNail(ctx, polygon, hex, finish) {
  const bbox = polygonBBox(polygon);
  const w = Math.max(bbox.w, 4), h = Math.max(bbox.h, 4);

  ctx.save();
  ctx.beginPath();
  tracePolygon(ctx, polygon);
  ctx.clip();
  ctx.translate(bbox.cx, bbox.cy);

  const alpha = FINISH_ALPHA[finish] ?? 0.8;

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = hex;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.globalAlpha = 1;

  ctx.globalCompositeOperation = 'hue';
  ctx.fillStyle = hex;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.globalCompositeOperation = 'source-over';

  // soft dome shading -- a real nail bed is a curved surface, so light
  // catches a soft highlight near the upper-center and gently falls off
  // toward the edges. Applied under every finish so even plain creamy
  // polish reads as a rounded 3D surface instead of a flat color fill.
  ctx.globalCompositeOperation = 'screen';
  const domeLight = ctx.createRadialGradient(-w * 0.08, -h * 0.3, 0, -w * 0.08, -h * 0.3, Math.max(w, h) * 0.85);
  domeLight.addColorStop(0, 'rgba(255,255,255,0.32)');
  domeLight.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  domeLight.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = domeLight;
  ctx.fillRect(-w, -h, w * 2, h * 2);

  ctx.globalCompositeOperation = 'multiply';
  const domeShade = ctx.createRadialGradient(w * 0.05, h * 0.25, Math.max(w, h) * 0.25, w * 0.05, h * 0.25, Math.max(w, h));
  domeShade.addColorStop(0, 'rgba(40,20,25,0)');
  domeShade.addColorStop(1, 'rgba(40,20,25,0.16)');
  ctx.fillStyle = domeShade;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.globalCompositeOperation = 'source-over';

  if (finish === 'matte') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.globalAlpha = 1;
  }

  if (finish === 'metallic' || finish === 'jelly') {
    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createLinearGradient(-w * 0.4, -h, w * 0.15, h);
    const peak = finish === 'metallic' ? 0.85 : 0.45;
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.45, `rgba(255,255,255,${peak})`);
    grad.addColorStop(0.62, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-w, -h, w * 2, h * 2);
  }

  if (finish === 'pearl') {
    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h));
    grad.addColorStop(0, 'rgba(255,255,255,.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-w, -h, w * 2, h * 2);
  }

  if (finish === 'glitter') {
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 26; i++) {
      const gx = (Math.random() * 2 - 1) * w * 0.85;
      const gy = (Math.random() * 2 - 1) * h * 0.85;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.5})`;
      ctx.arc(gx, gy, 0.6 + Math.random() * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (finish === 'texture') {
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 40; i++) {
      const gx = (Math.random() * 2 - 1) * w * 0.9;
      const gy = (Math.random() * 2 - 1) * h * 0.9;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.08})`;
      ctx.arc(gx, gy, 1.2 + Math.random() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.strokeStyle = hex;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  tracePolygon(ctx, polygon);
  ctx.stroke();
  ctx.restore();
}

// ---------- skin tone science (approximate, client-side estimate) ----------
//
// Samples skin color, converts to CIE Lab, then derives two cosmetics-
// industry metrics: ITA° (Individual Typology Angle) for skin *depth*, and
// hue angle in the a*/b* plane for *undertone* (warm/cool/neutral).

const SKIN_DEPTHS = [
  { key: 'verylight', label: 'ผิวขาวมาก', minIta: 55 },
  { key: 'light', label: 'ผิวขาว', minIta: 41 },
  { key: 'lightmedium', label: 'ผิวสองสี', minIta: 28 },
  { key: 'tan', label: 'ผิวแทน', minIta: 10 },
  { key: 'deep', label: 'ผิวเข้ม', minIta: -Infinity },
];

const SKIN_DEPTH_SWATCHES = [
  { hex: '#F6DFD2', label: 'ขาวมาก' },
  { hex: '#EAC2A4', label: 'ขาว' },
  { hex: '#CE9977', label: 'สองสี' },
  { hex: '#A66F4C', label: 'แทน' },
  { hex: '#6B4226', label: 'เข้ม' },
];

const UNDERTONE_LABELS = {
  warm: 'โทนอุ่น (Warm)',
  cool: 'โทนเย็น (Cool)',
  neutral: 'โทนกลาง (Neutral)',
};

function rgbToLab(r, g, b) {
  let [rl, gl, bl] = [r, g, b].map((c) => {
    c /= 255;
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  });
  rl *= 100; gl *= 100; bl *= 100;
  const x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;
  const refX = 95.047, refY = 100.0, refZ = 108.883;
  const f = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const xn = f(x / refX), yn = f(y / refY), zn = f(z / refZ);
  return { L: 116 * yn - 16, a: 500 * (xn - yn), b: 200 * (yn - zn) };
}

function depthFromIta(ita) {
  return SKIN_DEPTHS.find((d) => ita >= d.minIta) || SKIN_DEPTHS[SKIN_DEPTHS.length - 1];
}

function undertoneFromHueAngle(hueAngle) {
  if (hueAngle > 55) return 'warm';
  if (hueAngle < 35) return 'cool';
  return 'neutral';
}

// point-in-polygon test (ray casting) -- excludes the nail itself when
// sampling the skin around it
function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function medianOf(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// primary sampling method: anchors on the trained nail detector's real hand
// localization instead of guessing a blind center crop. Samples a padded
// ring around each detected nail (excluding the nail itself), skipping
// shadow/highlight outliers, then takes the per-channel MEDIAN across all
// fingers -- more robust than a single mean against uneven hand lighting.
function sampleSkinNearNails(ctx, w, h, nailPolygons) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const samples = [];
  nailPolygons.forEach((polygon) => {
    const bbox = polygonBBox(polygon);
    const padX = bbox.w * 0.7, padY = bbox.h * 0.7;
    const x0 = Math.max(0, Math.floor(bbox.minX - padX));
    const x1 = Math.min(w, Math.ceil(bbox.maxX + padX));
    const y0 = Math.max(0, Math.floor(bbox.minY - padY));
    const y1 = Math.min(h, Math.ceil(bbox.maxY + padY));
    const step = 3;
    for (let y = y0; y < y1; y += step) {
      for (let x = x0; x < x1; x += step) {
        if (pointInPolygon(x, y, polygon)) continue; // skip the nail itself
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 35 || lum > 250) continue;
        samples.push([r, g, b]);
      }
    }
  });
  if (samples.length === 0) return null;
  return [
    medianOf(samples.map((s) => s[0])),
    medianOf(samples.map((s) => s[1])),
    medianOf(samples.map((s) => s[2])),
  ];
}

// fallback sampling: a blind center-crop average, used only when the nail
// detector is unreachable or finds no nails in frame (e.g. a non-hand photo)
function sampleAverageColor(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const x0 = Math.floor(w * 0.3), x1 = Math.floor(w * 0.7);
  const y0 = Math.floor(h * 0.3), y1 = Math.floor(h * 0.7);
  const step = Math.max(2, Math.floor(Math.min(w, h) / 80));
  let rs = 0, gs = 0, bs = 0, n = 0;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (Math.floor(y) * w + Math.floor(x)) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 35 || lum > 250) continue;
      rs += r; gs += g; bs += b; n++;
    }
  }
  if (n === 0) return [200, 160, 140];
  return [rs / n, gs / n, bs / n];
}

function analyzeSkinTone([r, g, b]) {
  const lab = rgbToLab(r, g, b);
  const ita = Math.atan2(lab.L - 50, lab.b) * 180 / Math.PI;
  const hueAngle = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  const hex = `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, '0')).join('')}`;
  return { hex, depth: depthFromIta(ita), undertone: undertoneFromHueAngle(hueAngle) };
}

function getRecommendedColors(undertone) {
  if (undertone === 'neutral') {
    const neutrals = PALETTE.filter((c) => c.undertone === 'neutral');
    const warms = PALETTE.filter((c) => c.undertone === 'warm');
    const cools = PALETTE.filter((c) => c.undertone === 'cool');
    const picks = [...neutrals];
    let i = 0;
    while (picks.length < 8 && (warms[i] || cools[i])) {
      if (warms[i]) picks.push(warms[i]);
      if (cools[i] && picks.length < 8) picks.push(cools[i]);
      i++;
    }
    return picks.slice(0, 8);
  }
  return PALETTE.filter((c) => c.undertone === undertone).slice(0, 8);
}

// draws a small round-swatch "card" so the booking handoff can reuse the
// same data-URL contract as the try-on page's booking flow
function colorCardDataUrl(hex, name) {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 300;
  const cctx = c.getContext('2d');
  cctx.fillStyle = '#fff';
  cctx.fillRect(0, 0, 300, 300);
  cctx.fillStyle = hex;
  cctx.beginPath();
  cctx.arc(150, 130, 90, 0, Math.PI * 2);
  cctx.fill();
  cctx.fillStyle = '#241F2E';
  cctx.font = '600 22px "IBM Plex Sans Thai", sans-serif';
  cctx.textAlign = 'center';
  cctx.fillText(name, 150, 260);
  return c.toDataURL('image/png');
}

// ---------- icons ----------

const Icon = {
  Close: () => <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  Camera: () => <svg viewBox="0 0 48 48" fill="none"><rect x="6" y="14" width="36" height="26" rx="6" stroke="currentColor" strokeWidth="2.2" /><circle cx="24" cy="27" r="7" stroke="currentColor" strokeWidth="2.2" /><path d="M17 14l2.2-4h9.6l2.2 4" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>,
  CameraSmall: () => <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="13.5" r="3.4" stroke="currentColor" strokeWidth="1.8" /><path d="M8 7l1.2-2.2h5.6L16 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>,
  Reset: () => <svg viewBox="0 0 24 24" fill="none"><path d="M20 11a8 8 0 10-2.34 5.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M20 5v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  ZoomIn: () => <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  ZoomOut: () => <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.3-4.3M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v13m0 0l-4.5-4.5M12 16l4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 19.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  Sparkle: () => <svg className="title-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" /><path d="M19 14l.9 2.8L22.7 18l-2.8.9L19 21.7l-.9-2.8-2.8-.9 2.8-.9L19 14z" /></svg>,
  DecoStar: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" /></svg>,
  DecoHeart: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.7-9.8-9.1C.7 8.4 2 5 5.4 5c2 0 3.4 1.1 4.1 2.2C10.2 6.1 11.6 5 13.6 5c3.4 0 4.7 3.4 3.2 6.4C14.5 15.8 12 20.5 12 20.5z" /></svg>,
  HeartOutline: () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 20.5s-7.5-4.7-9.8-9.1C.7 8.4 2 5 5.4 5c2 0 3.4 1.1 4.1 2.2C10.2 6.1 11.6 5 13.6 5c3.4 0 4.7 3.4 3.2 6.4C14.5 15.8 12 20.5 12 20.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>,
  Bottle: () => <svg viewBox="0 0 24 32" fill="none"><rect x="9" y="2" width="6" height="5" rx="1" fill="currentColor" /><path d="M8 7h8l2 4v16a3 3 0 01-3 3H9a3 3 0 01-3-3V11l2-4z" fill="currentColor" opacity=".9" /><rect x="6" y="15" width="12" height="9" rx="2" fill="#fff" opacity=".25" /></svg>,
  DecoBow: () => <svg viewBox="0 0 32 20" fill="currentColor"><path d="M15 10L2 2v16l13-8z" /><path d="M17 10l13-8v16l-13-8z" /><rect x="13" y="6" width="6" height="8" rx="2" /></svg>,
  DecoMagnifier: () => <svg viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" /><path d="M15 15l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  DecoPalette: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20c1.4 0 2-1 2-2 0-.6-.3-1-.6-1.4-.3-.4-.5-.7-.5-1.2 0-.8.7-1.4 1.5-1.4H16c3 0 6-2 6-6 0-4.4-4.5-8-10-8z" /><circle cx="7.5" cy="10.5" r="1.4" fill="#fff" /><circle cx="10.5" cy="7" r="1.4" fill="#fff" /><circle cx="15" cy="7.5" r="1.4" fill="#fff" /><circle cx="17.5" cy="11.5" r="1.4" fill="#fff" /></svg>,
  Palm: () => <svg viewBox="0 0 48 48" fill="none"><path d="M24 6C14 6 8 16 8 24s6 18 16 18 16-8 16-18S34 6 24 6z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /><circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2.2" /></svg>,
  Expand: () => <svg viewBox="0 0 24 24" fill="none"><path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  CompareArrows: () => <svg viewBox="0 0 24 24" fill="none"><path d="M8 7l-4 5 4 5M16 7l4 5-4 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

// shared decorative sparkle/heart cluster for a viewer-stage background --
// `extraDots`/`extraIcons` let a page (e.g. skin analysis) layer on a few
// more accents than the baseline set
function DecoCluster({ extraDots = [], extraIcons = [] }) {
  return (
    <>
      <div className="deco deco-1 deco-float" aria-hidden="true"><Icon.DecoStar /></div>
      <div className="deco deco-2 deco-float" aria-hidden="true"><Icon.DecoHeart /></div>
      <div className="deco deco-3 deco-float" aria-hidden="true"><Icon.DecoStar /></div>
      <div className="deco deco-4 deco-float" aria-hidden="true"><Icon.DecoHeart /></div>
      <div className="deco deco-5 deco-float" aria-hidden="true"><Icon.DecoStar /></div>
      <div className="deco deco-6 deco-float" aria-hidden="true"><Icon.DecoHeart /></div>
      <div className="deco deco-7 deco-float" aria-hidden="true"><Icon.DecoStar /></div>
      <div className="deco deco-8 deco-float" aria-hidden="true"><Icon.DecoStar /></div>
      <div className="deco deco-9 deco-float" aria-hidden="true"><Icon.DecoHeart /></div>
      <div className="deco deco-10 deco-float" aria-hidden="true"><Icon.DecoStar /></div>
      <div className="deco deco-11 deco-float" aria-hidden="true"><Icon.DecoHeart /></div>
      <div className="deco deco-12 deco-float" aria-hidden="true"><Icon.DecoStar /></div>
      <div className="deco-dot a" aria-hidden="true" />
      <div className="deco-dot b" aria-hidden="true" />
      <div className="deco-dot c" aria-hidden="true" />
      <div className="deco-dot d" aria-hidden="true" />
      {extraDots.map((letter) => <div className={`deco-dot ${letter}`} key={letter} aria-hidden="true" />)}
      {extraIcons.map(({ cls, icon: IconComp }) => (
        <div className={`deco ${cls} deco-float`} key={cls} aria-hidden="true"><IconComp /></div>
      ))}
      <div className="deco-bottle" aria-hidden="true"><Icon.Bottle /></div>
      <div className="deco deco-bow" aria-hidden="true"><Icon.DecoBow /></div>
      <div className="deco-glow" aria-hidden="true" />
    </>
  );
}

const SKIN_EXTRA_DECOS = [
  { cls: 'deco-13', icon: Icon.DecoMagnifier },
  { cls: 'deco-14', icon: Icon.DecoPalette },
];

const TIPS_CONTENT = {
  tryon: {
    heading: 'ถ่ายรูปให้ได้ผลลัพธ์สวยที่สุด',
    items: [
      'วางมือให้ราบขนานกับพื้น ถ่ายจากมุมตั้งฉากกับมือ',
      'แสงสว่างเพียงพอ หลีกเลี่ยงเงาบังเล็บ',
      'กางนิ้วให้เห็นเล็บครบทุกนิ้วชัดเจน',
      'พื้นหลังเรียบ สีทึบ ไม่รกตา',
    ],
  },
  skin: {
    heading: 'ถ่ายรูปให้วิเคราะห์สีผิวได้แม่นยำ',
    items: [
      'ถ่ายในที่แสงธรรมชาติ หลีกเลี่ยงแสงไฟสีเหลือง/ส้ม',
      'ไม่ใส่ฟิลเตอร์หรือปรับสีภาพก่อนอัปโหลด',
      'ถ่ายผิวหรือมือให้เต็มเฟรม ไม่มีเสื้อผ้าบังมากเกินไป',
      'พื้นหลังไม่มีสีจัดที่อาจสะท้อนแสงลงบนผิว',
    ],
  },
};

// ---------- component ----------

// Pass onBookDesign(dataUrl) once merged into the real app to navigate to
// the actual booking page instead of the localStorage-handoff placeholder.
export default function NailTryOn({ onBookDesign } = {}) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const baseImageRef = useRef(null);
  const workSizeRef = useRef({ w: 0, h: 0 });
  const nailRegionsRef = useRef([]); // [[[x,y],...]] pixel-space polygons, not rendered directly so kept out of state
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const compareWrapRef = useRef(null);
  const compareHandleRef = useRef(null);
  const compareDividerRef = useRef(null);
  const comparePosRef = useRef(50); // 0-100, kept in a ref so dragging doesn't re-render every pixel
  const isDraggingCompareRef = useRef(false);
  const redrawRef = useRef(() => {});
  const pendingUploadActionRef = useRef(null); // 'file' | 'camera'
  const toastTimerRef = useRef(null);

  const [page, setPage] = useState('tryon'); // 'tryon' | 'skin'
  const [hasImage, setHasImage] = useState(false);
  const [statusText, setStatusText] = useState(null);
  const [errorText, setErrorText] = useState(null);
  const [mode, setMode] = useState('single');
  const [activeFinish, setActiveFinish] = useState('creamy');
  const [selectedFinger, setSelectedFinger] = useState(null);
  const [selectedHex, setSelectedHex] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [nailColors, setNailColors] = useState([]); // [{hex,finish}|null]
  const [isDragging, setIsDragging] = useState(false);
  const [shakeHint, setShakeHint] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState([]); // [{dataUrl}]
  const [bookHintVisible, setBookHintVisible] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tipsContext, setTipsContext] = useState('tryon'); // which page's tips to show
  const [tipsDontShow, setTipsDontShow] = useState(false);
  const [toast, setToast] = useState(null); // {text, leaving}
  const [compareVisible, setCompareVisible] = useState(false);

  // ---- skin-analysis page state ----
  const skinCanvasRef = useRef(null);
  const skinFileInputRef = useRef(null);
  const skinBaseImageRef = useRef(null);
  const skinWorkSizeRef = useRef({ w: 0, h: 0 });
  const skinVideoRef = useRef(null);
  const skinCameraStreamRef = useRef(null);

  const [skinHasImage, setSkinHasImage] = useState(false);
  const [skinCameraOpen, setSkinCameraOpen] = useState(false);
  const [skinStatusText, setSkinStatusText] = useState(null);
  const [skinErrorText, setSkinErrorText] = useState(null);
  const [skinAnalysis, setSkinAnalysis] = useState(null); // {hex, depth, undertone, confidence}
  const [skinSelectedColor, setSkinSelectedColor] = useState(null); // {hex, name}
  const [skinBookHintVisible, setSkinBookHintVisible] = useState(false);

  const hasAnyColor = nailColors.some((c) => c);

  // ---------- redraw the canvas whenever anything that affects pixels changes ----------
  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = workSizeRef.current;
    const img = baseImageRef.current;
    ctx.clearRect(0, 0, w, h);
    if (!img) return;

    if (!hasAnyColor) {
      ctx.drawImage(img, 0, 0, w, h);
      setCompareVisible(false);
    } else {
      ctx.drawImage(img, 0, 0, w, h);
      nailRegionsRef.current.forEach((polygon, i) => {
        const applied = nailColors[i];
        if (applied) paintNail(ctx, polygon, applied.hex, applied.finish);
      });
      const splitX = (comparePosRef.current / 100) * w;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, h);
      ctx.clip();
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
      setCompareVisible(true);
      if (compareHandleRef.current) compareHandleRef.current.style.left = `${comparePosRef.current}%`;
      if (compareDividerRef.current) compareDividerRef.current.style.left = `${comparePosRef.current}%`;
    }

    if (mode === 'multi' && selectedFinger !== null) {
      const polygon = nailRegionsRef.current[selectedFinger];
      if (polygon) {
        ctx.save();
        ctx.strokeStyle = '#FF4B82';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        tracePolygon(ctx, polygon);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  useEffect(() => { redraw(); });
  useEffect(() => { redrawRef.current = redraw; });

  // attach the compare-slider drag listeners once (uses redrawRef so it
  // always calls the latest closure without needing to re-attach)
  useEffect(() => {
    const handle = compareHandleRef.current;
    if (!handle) return;
    function onDown(e) {
      isDraggingCompareRef.current = true;
      handle.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      if (!isDraggingCompareRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      comparePosRef.current = pct;
      redrawRef.current();
    }
    function onUp(e) {
      isDraggingCompareRef.current = false;
      if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    }
    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    return () => {
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };
  }, []);

  function showToast(text) {
    clearTimeout(toastTimerRef.current);
    setToast({ text, leaving: false });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => (t ? { ...t, leaving: true } : t));
      setTimeout(() => setToast(null), 250);
    }, 1800);
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  }

  function resetToUpload() {
    stopCamera();
    setCameraOpen(false);
    setHasImage(false);
    setErrorText(null);
    setStatusText(null);
    setNailColors([]);
    setSelectedFinger(null);
    setSelectedHex(null);
    setBookHintVisible(false);
    setZoom(1);
    comparePosRef.current = 50;
    baseImageRef.current = null;
    nailRegionsRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (compareWrapRef.current) compareWrapRef.current.style.transform = 'scale(1)';
  }

  async function startCamera() {
    setErrorText(null);
    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    } catch (err) {
      console.error(err);
      setErrorText('เปิดกล้องไม่สำเร็จ ตรวจสอบว่าอนุญาตให้เว็บนี้ใช้กล้องแล้วหรือยัง');
      return;
    }
    setCameraOpen(true);
    requestAnimationFrame(() => {
      if (videoRef.current) videoRef.current.srcObject = cameraStreamRef.current;
    });
  }

  function cancelCamera() {
    stopCamera();
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const off = document.createElement('canvas');
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    off.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    setCameraOpen(false);
    off.toBlob((blob) => {
      if (!blob) return;
      processFile(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  function tipsPreviouslyDismissed() {
    try { return localStorage.getItem(TIPS_DISMISSED_KEY) === '1'; } catch { return false; }
  }

  function requestUploadAction(context, action) {
    if (tipsPreviouslyDismissed()) {
      runUploadActionFor(context, action);
      return;
    }
    pendingUploadActionRef.current = action;
    setTipsContext(context);
    setTipsOpen(true);
  }

  function runUploadActionFor(context, action) {
    if (context === 'tryon') runUploadAction(action);
    else runSkinUploadAction(action);
  }

  function runUploadAction(action) {
    if (action === 'file') fileInputRef.current.click();
    else if (action === 'camera') startCamera();
  }

  function handleTipsContinue() {
    if (tipsDontShow) {
      try { localStorage.setItem(TIPS_DISMISSED_KEY, '1'); } catch (err) { console.error(err); }
    }
    setTipsOpen(false);
    const action = pendingUploadActionRef.current;
    pendingUploadActionRef.current = null;
    if (action) runUploadActionFor(tipsContext, action);
  }

  function canvasToBlob() {
    return new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/jpeg', 0.92));
  }

  async function detectAndRender() {
    setStatusText('กำลังตรวจจับตำแหน่งเล็บ...');
    const blob = await canvasToBlob();
    const formData = new FormData();
    formData.append('file', blob, 'photo.jpg');

    let data;
    try {
      const resp = await fetch(API_URL, { method: 'POST', body: formData });
      if (!resp.ok) {
        const detail = await resp.json().catch(() => null);
        throw new Error(detail?.detail || `API error ${resp.status}`);
      }
      data = await resp.json();
    } catch (err) {
      console.error(err);
      setStatusText(null);
      setErrorText('เชื่อมต่อ AI backend ไม่สำเร็จ ตรวจสอบว่า server รันอยู่ที่ localhost:8000');
      return;
    }

    if (!data.nails || data.nails.length === 0) {
      setStatusText(null);
      setErrorText('ไม่พบมือในภาพ กรุณาอัปโหลดรูปที่เห็นมือและเล็บครบทุกนิ้ว แสงสว่างเพียงพอ');
      return;
    }

    const { w, h } = workSizeRef.current;
    // 3 smoothing passes (up from 2) for a noticeably rounder, more natural
    // nail-tip shape
    nailRegionsRef.current = data.nails.map((polygon) =>
      chaikinSmooth(polygon.map(([x, y]) => [x * w, y * h]), 3)
    );
    setNailColors(Array.from({ length: nailRegionsRef.current.length }, () => null));
    setSelectedFinger(null);
    setStatusText(null);
  }

  function processFile(file) {
    if (!file.type.startsWith('image/')) {
      setErrorText('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }
    setErrorText(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      baseImageRef.current = img;
      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      workSizeRef.current = { w, h };
      setZoom(1);
      comparePosRef.current = 50;
      setBookHintVisible(false);
      setHasImage(true);
      // the canvas only mounts once hasImage flips true above -- defer
      // touching canvasRef until after that render has committed. setTimeout
      // (a macrotask) rather than requestAnimationFrame, since rAF can be
      // suspended entirely in a backgrounded/hidden tab
      setTimeout(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = w;
        canvas.height = h;
        if (compareWrapRef.current) compareWrapRef.current.style.transform = 'scale(1)';
        // draw immediately so the photo is visible while detection runs
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        await detectAndRender();
        URL.revokeObjectURL(url);
      }, 0);
    };
    img.onerror = () => setErrorText('เปิดไฟล์รูปภาพไม่ได้ ลองใหม่อีกครั้ง');
    img.src = url;
  }

  function onFileInputChange(e) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }

  function applyColor(hex) {
    if (nailRegionsRef.current.length === 0) {
      setErrorText('ยังไม่พบตำแหน่งเล็บในรูปนี้ กรุณาอัปโหลดรูปมือให้เห็นเล็บชัดเจนก่อนเลือกสี');
      return;
    }
    if (mode === 'single') {
      setNailColors(nailRegionsRef.current.map(() => ({ hex, finish: activeFinish })));
    } else {
      if (selectedFinger === null) {
        setShakeHint(false);
        requestAnimationFrame(() => setShakeHint(true));
        return;
      }
      setNailColors((prev) => {
        const next = [...prev];
        next[selectedFinger] = { hex, finish: activeFinish };
        return next;
      });
    }
    setSelectedHex(hex);
  }

  function onCanvasClick(e) {
    if (mode !== 'multi' || nailRegionsRef.current.length === 0) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    let closest = null, closestDist = Infinity;
    nailRegionsRef.current.forEach((polygon, i) => {
      const bbox = polygonBBox(polygon);
      const dist = Math.hypot(x - bbox.cx, y - bbox.cy);
      const hitRadius = Math.max(bbox.w, bbox.h) * 0.8;
      if (dist < hitRadius && dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    if (closest !== null) setSelectedFinger(closest);
  }

  function handleReset() {
    setNailColors(Array.from({ length: nailRegionsRef.current.length }, () => null));
    setSelectedFinger(null);
    setSelectedHex(null);
    showToast('รีเซ็ตสีเล็บแล้ว');
  }

  function handleZoom(delta) {
    setZoom((z) => {
      const next = Math.max(0.7, Math.min(2, z + delta));
      if (compareWrapRef.current) compareWrapRef.current.style.transform = `scale(${next})`;
      return next;
    });
  }

  function downloadDataUrl(url, filename, revoke) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) URL.revokeObjectURL(url);
  }

  function handleDownload() {
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      downloadDataUrl(URL.createObjectURL(blob), 'nail-tryon-result.png', true);
    });
    showToast('ดาวน์โหลดรูปแล้ว');
  }

  function saveCurrentDesign() {
    if (!baseImageRef.current) return null;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setSavedDesigns((prev) => [...prev, { dataUrl }]);
    return dataUrl;
  }

  function handleSaveDesign() {
    if (!saveCurrentDesign()) return;
    showToast('บันทึกลายนี้แล้ว');
  }

  // The booking system itself isn't built yet -- this saves the chosen look
  // and hands it off via localStorage (or the onBookDesign prop, once the
  // parent app wires up real navigation) so the real booking page can pick
  // it up after the two projects are merged.
  function handleBookDesign() {
    const dataUrl = saveCurrentDesign();
    if (!dataUrl) return;
    if (onBookDesign) {
      onBookDesign(dataUrl);
    } else {
      try { localStorage.setItem('nailDesignForBooking', dataUrl); } catch (err) { console.error(err); }
    }
    setBookHintVisible(true);
    showToast('ส่งลายนี้ไปหน้าจองคิวแล้ว');
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      canvasRef.current.closest('.viewer-stage')?.requestFullscreen().catch((err) => console.error(err));
    }
  }

  // ---------- skin-analysis page logic ----------

  function stopSkinCamera() {
    if (skinCameraStreamRef.current) {
      skinCameraStreamRef.current.getTracks().forEach((t) => t.stop());
      skinCameraStreamRef.current = null;
    }
  }

  function resetSkinToUpload() {
    stopSkinCamera();
    setSkinCameraOpen(false);
    setSkinHasImage(false);
    setSkinErrorText(null);
    setSkinStatusText(null);
    setSkinAnalysis(null);
    setSkinSelectedColor(null);
    setSkinBookHintVisible(false);
    skinBaseImageRef.current = null;
    if (skinFileInputRef.current) skinFileInputRef.current.value = '';
  }

  async function startSkinCamera() {
    setSkinErrorText(null);
    try {
      skinCameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    } catch (err) {
      console.error(err);
      setSkinErrorText('เปิดกล้องไม่สำเร็จ ตรวจสอบว่าอนุญาตให้เว็บนี้ใช้กล้องแล้วหรือยัง');
      return;
    }
    setSkinCameraOpen(true);
    requestAnimationFrame(() => {
      if (skinVideoRef.current) skinVideoRef.current.srcObject = skinCameraStreamRef.current;
    });
  }

  function cancelSkinCamera() {
    stopSkinCamera();
    setSkinCameraOpen(false);
  }

  function captureSkinPhoto() {
    const video = skinVideoRef.current;
    const off = document.createElement('canvas');
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    off.getContext('2d').drawImage(video, 0, 0);
    stopSkinCamera();
    setSkinCameraOpen(false);
    off.toBlob((blob) => {
      if (!blob) return;
      processSkinFile(new File([blob], 'skin-photo.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  function runSkinUploadAction(action) {
    if (action === 'file') skinFileInputRef.current.click();
    else if (action === 'camera') startSkinCamera();
  }

  function skinCanvasToBlob() {
    return new Promise((resolve) => skinCanvasRef.current.toBlob(resolve, 'image/jpeg', 0.92));
  }

  // reuses the same trained nail-detection endpoint the try-on page calls --
  // its polygons anchor where real finger skin is, instead of guessing
  async function detectSkinNailPolygons() {
    const blob = await skinCanvasToBlob();
    const formData = new FormData();
    formData.append('file', blob, 'skin-photo.jpg');
    const resp = await fetch(API_URL, { method: 'POST', body: formData });
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    const data = await resp.json();
    if (!data.nails) return [];
    const { w, h } = skinWorkSizeRef.current;
    return data.nails.map((polygon) =>
      chaikinSmooth(polygon.map(([x, y]) => [x * w, y * h]), 2)
    );
  }

  async function analyzeSkinAndRender() {
    setSkinStatusText('กำลังวิเคราะห์โทนสีผิว...');
    let confidence = 'approximate';
    let rgb = null;
    const ctx = skinCanvasRef.current.getContext('2d');
    const { w, h } = skinWorkSizeRef.current;

    try {
      const polygons = await detectSkinNailPolygons();
      if (polygons.length > 0) {
        rgb = sampleSkinNearNails(ctx, w, h, polygons);
        if (rgb) confidence = 'precise';
      }
    } catch (err) {
      console.error(err);
      // backend unreachable or detection failed -- fall through to the
      // blind-crop estimate below instead of hard-failing the whole feature
    }
    if (!rgb) rgb = sampleAverageColor(ctx, w, h);

    try {
      const result = analyzeSkinTone(rgb);
      result.confidence = confidence;
      setSkinAnalysis(result);
      setSkinSelectedColor(null);
    } catch (err) {
      console.error(err);
      setSkinErrorText('วิเคราะห์ภาพไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSkinStatusText(null);
    }
  }

  function processSkinFile(file) {
    if (!file.type.startsWith('image/')) {
      setSkinErrorText('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }
    setSkinErrorText(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      skinBaseImageRef.current = img;
      const maxDim = 700;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      skinWorkSizeRef.current = { w, h };
      setSkinAnalysis(null);
      setSkinHasImage(true);
      // the canvas only mounts once skinHasImage flips true above -- defer
      // touching skinCanvasRef until after that render has committed.
      // setTimeout rather than requestAnimationFrame, since rAF can be
      // suspended entirely in a backgrounded/hidden tab
      setTimeout(async () => {
        const canvas = skinCanvasRef.current;
        if (!canvas) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        await analyzeSkinAndRender();
        URL.revokeObjectURL(url);
      }, 0);
    };
    img.onerror = () => setSkinErrorText('เปิดไฟล์รูปภาพไม่ได้ ลองใหม่อีกครั้ง');
    img.src = url;
  }

  function onSkinFileInputChange(e) {
    const f = e.target.files?.[0];
    if (f) processSkinFile(f);
  }

  function handleSkinDownload() {
    if (!skinBaseImageRef.current) return;
    skinCanvasRef.current.toBlob((blob) => {
      if (!blob) return;
      downloadDataUrl(URL.createObjectURL(blob), 'skin-tone-photo.png', true);
    });
    showToast('ดาวน์โหลดรูปแล้ว');
  }

  // "try this on my hand photo" -- crosses over to the try-on page and
  // applies the recommended color directly if a hand photo is already loaded
  function handleSkinTryOn() {
    if (!skinSelectedColor) return;
    const { hex } = skinSelectedColor;
    if (nailRegionsRef.current.length === 0) {
      setPage('tryon');
      showToast('อัปโหลดรูปมือก่อน เพื่อลองสีนี้');
      return;
    }
    setPage('tryon');
    applyColor(hex);
    showToast('ใช้สีที่แนะนำกับรูปมือแล้ว');
  }

  function handleSkinBook() {
    if (!skinSelectedColor) return;
    const dataUrl = colorCardDataUrl(skinSelectedColor.hex, skinSelectedColor.name);
    if (onBookDesign) {
      onBookDesign(dataUrl);
    } else {
      try { localStorage.setItem('nailDesignForBooking', dataUrl); } catch (err) { console.error(err); }
    }
    setSkinBookHintVisible(true);
    showToast('ส่งสีนี้ไปหน้าจองคิวแล้ว');
  }

  const skinRecommendations = skinAnalysis ? getRecommendedColors(skinAnalysis.undertone) : [];

  return (
    <div className="page">
      <div className="blob-peach" />
      <div className="card">
       <div className="card-inner">

        <div className="topbar">
          <div className="brand">
            <Icon.Sparkle />
            <div className="brand-text">
              <span className="brand-name">ลองเล็บเสมือนจริง</span>
              <span className="brand-sub">AI Virtual Nail Try-On</span>
            </div>
          </div>
          <div className="page-nav">
            <button type="button" className={`page-nav-btn ${page === 'tryon' ? 'active' : ''}`} onClick={() => setPage('tryon')}>ลองเล็บ</button>
            <button type="button" className={`page-nav-btn ${page === 'skin' ? 'active' : ''}`} onClick={() => setPage('skin')}>วิเคราะห์สีผิว</button>
          </div>
          <button className="icon-btn" onClick={() => (page === 'tryon' ? resetToUpload() : resetSkinToUpload())} aria-label="ปิด" type="button"><Icon.Close /></button>
        </div>

        {/* ================= page 1: nail try-on ================= */}
        <div className="layout" hidden={page !== 'tryon'}>

          <div className="col col-controls">
            <div className="section-label">สี</div>
            <div className="mode-toggle">
              <button type="button" className={`mode-btn ${mode === 'single' ? 'active' : ''}`} onClick={() => { setMode('single'); setSelectedFinger(null); }}>สีเดียว</button>
              <button type="button" className={`mode-btn ${mode === 'multi' ? 'active' : ''}`} onClick={() => { setMode('multi'); setSelectedFinger(null); }}>หลายสี</button>
            </div>
            {mode === 'multi' && (
              <p className={`multi-hint ${shakeHint ? 'shake' : ''}`} onAnimationEnd={() => setShakeHint(false)}>
                แตะที่เล็บในรูปที่ต้องการก่อน แล้วค่อยเลือกสีด้านล่าง
              </p>
            )}

            <div className="swatch-grid">
              {PALETTE.map(({ hex, name }) => (
                <button
                  key={hex}
                  type="button"
                  className={`swatch-item ${selectedHex === hex ? 'selected' : ''}`}
                  onClick={() => applyColor(hex)}
                >
                  <span className="swatch-dot" style={{ background: swatchGradient(hex) }} />
                  <span className="swatch-label">{name}</span>
                </button>
              ))}
            </div>

            <div className="section-label">พื้นผิว</div>
            <div className="finish-grid">
              {FINISHES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`finish-chip ${activeFinish === key ? 'active' : ''}`}
                  onClick={() => setActiveFinish(key)}
                >
                  <span className={`finish-preview ${key}`} />
                  <span className="finish-label">{label}</span>
                </button>
              ))}
            </div>

            {hasImage && (
              <button className="btn-book" type="button" onClick={handleBookDesign}>
                <Icon.DecoHeart />
                จองลายนี้
              </button>
            )}
            {bookHintVisible && <p className="book-hint">บันทึกลายนี้ไว้แล้ว พร้อมส่งต่อไปหน้าจองคิว</p>}
          </div>

          <div className="col col-viewer">
            <div className="viewer-stage">
              <DecoCluster />

              {hasImage && (
                <button className="expand-btn" title="ขยายเต็มจอ" type="button" onClick={toggleFullscreen}><Icon.Expand /></button>
              )}

              {!hasImage && !cameraOpen && (
                <div
                  className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={onDrop}
                >
                  <div className="upload-icon"><Icon.Camera /></div>
                  <p className="upload-title">อัปโหลดรูปมือของคุณ</p>
                  <p className="upload-hint">ถ่ายรูปฝ่ามือหรือหลังมือให้เห็นเล็บครบ แสงสว่างเพียงพอ พื้นหลังไม่รก</p>
                  <div className="upload-actions">
                    <button className="btn-primary" type="button" onClick={() => requestUploadAction('tryon', 'file')}>เลือกรูปภาพ</button>
                    <button className="btn-secondary" type="button" onClick={() => requestUploadAction('tryon', 'camera')}><Icon.CameraSmall />ถ่ายรูป</button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileInputChange} />
                </div>
              )}

              {cameraOpen && (
                <div className="camera-view">
                  <video ref={videoRef} autoPlay playsInline muted />
                  <button className="icon-btn camera-cancel" type="button" onClick={cancelCamera} aria-label="ปิดกล้อง"><Icon.Close /></button>
                  <button className="capture-btn" type="button" onClick={capturePhoto} aria-label="ถ่ายรูป" />
                </div>
              )}

              {hasImage && (
                <div className="canvas-wrap">
                  <div className="compare-wrap" ref={compareWrapRef}>
                    <canvas className="result-canvas" ref={canvasRef} onClick={onCanvasClick} />
                    <div className="compare-label label-before" hidden={!compareVisible}>BEFORE</div>
                    <div className="compare-label label-after" hidden={!compareVisible}>AFTER</div>
                    <div className="compare-divider" ref={compareDividerRef} hidden={!compareVisible} />
                    <div className="compare-handle" ref={compareHandleRef} hidden={!compareVisible}>
                      <Icon.CompareArrows />
                    </div>
                  </div>
                </div>
              )}

              {statusText && (
                <div className="status-overlay">
                  <div className="spinner" />
                  <p>{statusText}</p>
                </div>
              )}

              {errorText && (
                <div className="error-banner">
                  <p>{errorText}</p>
                  <button className="btn-secondary" type="button" onClick={() => { setErrorText(null); fileInputRef.current.click(); }}>
                    ลองใหม่อีกครั้ง
                  </button>
                </div>
              )}
            </div>

            {hasImage && (
              <div className="tool-rail">
                <button className="tool-btn" type="button" onClick={handleSaveDesign} title="บันทึกลายนี้"><Icon.HeartOutline /></button>
                <button className="tool-btn" type="button" onClick={handleReset} title="รีเซ็ต"><Icon.Reset /></button>
                <button className="tool-btn" type="button" onClick={() => handleZoom(0.15)} title="ซูมเข้า"><Icon.ZoomIn /></button>
                <button className="tool-btn" type="button" onClick={() => handleZoom(-0.15)} title="ซูมออก"><Icon.ZoomOut /></button>
                <button className="tool-btn" type="button" onClick={handleDownload} title="ดาวน์โหลดผลลัพธ์"><Icon.Download /></button>
              </div>
            )}
          </div>

          <div className="col col-saved">
            <div className="section-label">ลายที่บันทึกไว้</div>
            {savedDesigns.length > 0 && (
              <div className="saved-grid">
                {savedDesigns.map((d, i) => (
                  <div className="saved-thumb" key={i}>
                    <img src={d.dataUrl} alt="ลายที่บันทึกไว้" />
                    <button
                      className="saved-download"
                      type="button"
                      aria-label="ดาวน์โหลดลายนี้"
                      onClick={() => downloadDataUrl(d.dataUrl, 'nail-design.png', false)}
                    >
                      <Icon.Download />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {savedDesigns.length === 0 && (
              <p className="saved-empty">ยังไม่มีลายที่บันทึกไว้<br />กดไอคอนหัวใจตอนได้ลายที่ถูกใจ</p>
            )}
          </div>

        </div>

        {/* ================= page 2: skin tone analysis ================= */}
        <div className="layout" hidden={page !== 'skin'}>

          <div className="col col-controls">
            <div className="section-label">วิธีใช้งาน</div>
            <ol className="steps-list">
              <li>ถ่ายรูปหรืออัปโหลดรูปมือ/ผิวของคุณ</li>
              <li>ระบบวิเคราะห์โทนสีผิวให้อัตโนมัติ</li>
              <li>รับคำแนะนำสีเล็บที่เข้ากับผิวคุณที่สุด</li>
            </ol>

            <div className="section-label">โทนสีผิว</div>
            <div className="tone-legend">
              {SKIN_DEPTH_SWATCHES.map(({ hex, label }) => (
                <div className="tone-chip" key={hex}>
                  <span className="tone-dot" style={{ background: hex }} />
                  <span className="tone-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col col-viewer">
            <div className="viewer-stage">
              <DecoCluster extraDots={['e', 'f']} extraIcons={SKIN_EXTRA_DECOS} />

              {!skinHasImage && !skinCameraOpen && (
                <div className="upload-zone">
                  <div className="upload-icon">
                    <div className="scan-ring" aria-hidden="true" />
                    <Icon.Palm />
                  </div>
                  <p className="upload-title">อัปโหลดรูปผิวหรือมือของคุณ</p>
                  <p className="upload-hint">ถ่ายในที่แสงธรรมชาติ ไม่ใส่ฟิลเตอร์ เพื่อผลวิเคราะห์ที่แม่นยำ</p>
                  <div className="upload-actions">
                    <button className="btn-primary" type="button" onClick={() => requestUploadAction('skin', 'file')}>เลือกรูปภาพ</button>
                    <button className="btn-secondary" type="button" onClick={() => requestUploadAction('skin', 'camera')}><Icon.CameraSmall />ถ่ายรูป</button>
                  </div>
                  <input ref={skinFileInputRef} type="file" accept="image/*" hidden onChange={onSkinFileInputChange} />
                </div>
              )}

              {skinCameraOpen && (
                <div className="camera-view">
                  <video ref={skinVideoRef} autoPlay playsInline muted />
                  <button className="icon-btn camera-cancel" type="button" onClick={cancelSkinCamera} aria-label="ปิดกล้อง"><Icon.Close /></button>
                  <button className="capture-btn" type="button" onClick={captureSkinPhoto} aria-label="ถ่ายรูป" />
                </div>
              )}

              {skinHasImage && (
                <div className="canvas-wrap">
                  <div className="skin-photo-wrap">
                    <canvas className="result-canvas" ref={skinCanvasRef} />
                    {skinAnalysis && (
                      <div className="skin-result-badge">
                        <span className="skin-result-swatch" style={{ background: skinAnalysis.hex }} />
                        <div className="skin-result-text">
                          <strong>{skinAnalysis.depth.label}</strong>
                          <span>{UNDERTONE_LABELS[skinAnalysis.undertone]}</span>
                          <span className={`skin-result-confidence ${skinAnalysis.confidence === 'precise' ? 'precise' : ''}`}>
                            {skinAnalysis.confidence === 'precise'
                              ? 'แม่นยำ: วิเคราะห์จากตำแหน่งเล็บจริง'
                              : 'ประมาณการ: ไม่พบตำแหน่งเล็บชัดเจน'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {skinStatusText && (
                <div className="status-overlay">
                  <div className="spinner" />
                  <p>{skinStatusText}</p>
                </div>
              )}

              {skinErrorText && (
                <div className="error-banner">
                  <p>{skinErrorText}</p>
                  <button className="btn-secondary" type="button" onClick={() => { setSkinErrorText(null); skinFileInputRef.current.click(); }}>
                    ลองใหม่อีกครั้ง
                  </button>
                </div>
              )}
            </div>

            {skinHasImage && (
              <div className="tool-rail">
                <button className="tool-btn" type="button" onClick={() => { resetSkinToUpload(); showToast('เริ่มวิเคราะห์ใหม่'); }} title="วิเคราะห์รูปใหม่"><Icon.Reset /></button>
                <button className="tool-btn" type="button" onClick={handleSkinDownload} title="ดาวน์โหลดผลลัพธ์"><Icon.Download /></button>
              </div>
            )}
          </div>

          <div className="col col-saved">
            <div className="section-label">สีเล็บที่แนะนำสำหรับคุณ</div>
            {skinAnalysis && (
              <div className="swatch-grid">
                {skinRecommendations.map(({ hex, name }) => (
                  <button
                    key={hex}
                    type="button"
                    className={`swatch-item ${skinSelectedColor?.hex === hex ? 'selected' : ''}`}
                    onClick={() => { setSkinSelectedColor({ hex, name }); setSkinBookHintVisible(false); }}
                  >
                    <span className="swatch-dot" style={{ background: swatchGradient(hex) }} />
                    <span className="swatch-label">{name}</span>
                  </button>
                ))}
              </div>
            )}
            {!skinAnalysis && (
              <p className="saved-empty">วิเคราะห์รูปก่อน เพื่อดูสีเล็บที่เหมาะกับคุณ</p>
            )}

            {skinSelectedColor && (
              <div className="skin-actions">
                <button className="btn-secondary" type="button" onClick={handleSkinTryOn}>ลองสีนี้ในหน้าลองเล็บ</button>
                <button className="btn-book" type="button" onClick={handleSkinBook}>
                  <Icon.DecoHeart />
                  จองคิวเลย
                </button>
              </div>
            )}
            {skinBookHintVisible && <p className="book-hint">ส่งสีนี้ไปหน้าจองคิวแล้ว</p>}
          </div>

        </div>

        {toast && (
          <div className={`toast ${toast.leaving ? 'leaving' : ''}`}>{toast.text}</div>
        )}

        {tipsOpen && (
          <div className="tips-overlay">
            <div className="tips-card">
              <div className="tips-icon"><Icon.CameraSmall /></div>
              <h2>{TIPS_CONTENT[tipsContext].heading}</h2>
              <ul className="tips-list">
                {TIPS_CONTENT[tipsContext].items.map((tip) => (
                  <li key={tip}><Icon.Check />{tip}</li>
                ))}
              </ul>
              <label className="tips-dontshow">
                <input type="checkbox" checked={tipsDontShow} onChange={(e) => setTipsDontShow(e.target.checked)} />
                ไม่ต้องแสดงข้อความนี้อีก
              </label>
              <button className="btn-primary tips-continue" type="button" onClick={handleTipsContinue}>เข้าใจแล้ว เริ่มเลย</button>
            </div>
          </div>
        )}

       </div>
      </div>
    </div>
  );
}
