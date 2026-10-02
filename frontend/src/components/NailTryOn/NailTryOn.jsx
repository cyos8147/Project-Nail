import { useEffect, useRef, useState } from 'react';
import './NailTryOn.css';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/ai/detect-nails`;
// เผื่อเวลาเซิร์ฟเวอร์ฟรีตื่นจากหลับ + โหลดโมเดลครั้งแรก แต่ไม่ให้หน้าเว็บรอไม่รู้จบถ้าเซิร์ฟเวอร์ไม่ตอบ
const DETECT_TIMEOUT_MS = 60000;
// เซิร์ฟเวอร์ฟรีจะรีสตาร์ตตัวเองเมื่อแรมเต็ม/เพิ่งตื่นจากหลับ ช่วงนั้นคำขอแรกล้มเหลวแต่ลองซ้ำแล้วผ่านได้ --
// เลยให้หน้าเว็บลองซ้ำเองสูงสุดเท่านี้ครั้ง (รอนานขึ้นทุกครั้ง) แทนที่จะให้ลูกค้าเห็นข้อความ error ทันที
const DETECT_ATTEMPTS = 3;
const DETECT_RETRY_DELAYS_MS = [3500, 9000];

async function postImageForNails(blob, filename) {
  const formData = new FormData();
  formData.append('file', blob, filename);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DETECT_TIMEOUT_MS);
  try {
    const resp = await fetch(API_URL, { method: 'POST', body: formData, signal: controller.signal });
    if (!resp.ok) {
      const detail = await resp.json().catch(() => null);
      const err = new Error(typeof detail?.detail === 'string' ? detail.detail : `API error ${resp.status}`);
      err.status = resp.status;
      throw err;
    }
    return await resp.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('ระบบ AI ใช้เวลานานเกินไป รอสักครู่แล้วกดตรวจจับอีกครั้ง');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ล้มเหลวแบบชั่วคราวที่ลองซ้ำแล้วมีโอกาสผ่าน: เน็ตหลุด (fetch โยน TypeError) หรือเซิร์ฟเวอร์ตอบ 5xx
// (หมดเวลารอ 60 วินาทีไม่นับ เพราะรอมานานแล้ว ให้ผู้ใช้กดลองเองดีกว่า)
function isTransientDetectError(err) {
  return err.name === 'TypeError' || err.status >= 500;
}

function detectErrorMessage(err) {
  if (err.name === 'TypeError') return 'เชื่อมต่อระบบ AI ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วกดตรวจจับอีกครั้ง';
  if (err.message && !err.message.startsWith('API error')) return err.message;
  return 'ระบบ AI ไม่ตอบสนองชั่วคราว รอสักครู่แล้วกดตรวจจับอีกครั้ง';
}

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

// how far a nail extends past its real detected tip, as a fraction of its own
// half-length (0 = natural length, no extension) -- 1.6 is a free edge about
// 80% as long as the nail itself, an extra-long set
const LENGTH_PRESETS = [
  { key: 'natural', label: 'ธรรมชาติ', frac: 0 },
  { key: 'medium', label: 'กลาง', frac: 0.5 },
  { key: 'long', label: 'ยาว', frac: 1.0 },
  { key: 'veryLong', label: 'ยาวมาก', frac: 1.6 },
];

const TIP_SHAPES = [
  { key: 'round', label: 'มน' },
  { key: 'square', label: 'เหลี่ยม' },
  { key: 'almond', label: 'อัลมอนด์' },
  { key: 'squoval', label: 'สควอย์' },
];

// opacity: how much polish covers the nail; lightTransfer: how much of the real
// nail's light/shadow shows through; curvature: darkening toward the side walls
// (a nail is curved across its width); gloss/glossWidth: the shine streak
const FINISH_STYLE = {
  creamy:   { opacity: 0.96, lightTransfer: 0.35, curvature: 0.22, gloss: 0.75, glossWidth: 0.16 },
  jelly:    { opacity: 0.78, lightTransfer: 0.45, curvature: 0.16, gloss: 0.95, glossWidth: 0.14 },
  sheer:    { opacity: 0.42, lightTransfer: 0.60, curvature: 0.10, gloss: 0.70, glossWidth: 0.16 },
  matte:    { opacity: 0.97, lightTransfer: 0.25, curvature: 0.14, gloss: 0.00, glossWidth: 0.30 },
  metallic: { opacity: 0.97, lightTransfer: 0.20, curvature: 0.22, gloss: 1.00, glossWidth: 0.10 },
  pearl:    { opacity: 0.88, lightTransfer: 0.35, curvature: 0.16, gloss: 0.80, glossWidth: 0.22 },
  texture:  { opacity: 0.95, lightTransfer: 0.30, curvature: 0.18, gloss: 0.35, glossWidth: 0.20 },
  glitter:  { opacity: 0.94, lightTransfer: 0.30, curvature: 0.18, gloss: 0.65, glossWidth: 0.16 },
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

// Andrew's monotone chain. A nail is convex, so the hull drops the dents and
// jaggies of the pixel-mask outline the model returns.
function convexHull(points) {
  if (points.length < 4) return points;
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function resampleClosed(points, count) {
  const n = points.length;
  const seg = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push(len);
    total += len;
  }
  if (total === 0) return points.slice();
  const out = [];
  let i = 0, acc = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    while (i < n - 1 && acc + seg[i] < target) { acc += seg[i]; i++; }
    const t = seg[i] ? (target - acc) / seg[i] : 0;
    const a = points[i], b = points[(i + 1) % n];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

// Nail frame for a given length axis (ax, ay): centre, half-length along the
// finger, half-width across it. The width axis always points to the lower-right
// half-plane so the shine lands on the same side of every nail, like one light
// source from the upper-left; lightEnd says which end of the nail faces it.
function frameFromAxis(points, ax, ay) {
  let bx = -ay, by = ax;
  if (bx + by < 0) { bx = -bx; by = -by; }
  let mx = 0, my = 0;
  points.forEach(([x, y]) => { mx += x; my += y; });
  mx /= points.length;
  my /= points.length;
  let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
  points.forEach(([x, y]) => {
    const pa = (x - mx) * ax + (y - my) * ay;
    const pb = (x - mx) * bx + (y - my) * by;
    minA = Math.min(minA, pa); maxA = Math.max(maxA, pa);
    minB = Math.min(minB, pb); maxB = Math.max(maxB, pb);
  });
  const ca = (minA + maxA) / 2, cb = (minB + maxB) / 2;
  return {
    cx: mx + ax * ca + bx * cb,
    cy: my + ay * ca + by * cb,
    ax, ay, bx, by,
    halfLen: Math.max((maxA - minA) / 2, 1),
    halfWid: Math.max((maxB - minB) / 2, 1),
    lightEnd: ax + ay < 0 ? 1 : -1,
  };
}

// Which way the finger runs from the nail: sample a ring around the nail for
// skin-coloured pixels (YCrCb skin range) -- the finger side is skin, past the
// fingertip is background. Returns the unit vector toward the finger base, or
// null when the ring is almost all skin or almost none (e.g. skin-toned
// background, fingers pressed together) so the caller can fall back.
function fingerDirection(imageData, cx, cy, radius) {
  const { data, width, height } = imageData;
  let sx = 0, sy = 0, skin = 0, total = 0;
  for (let k = 0; k < 36; k++) {
    const ang = (k / 36) * Math.PI * 2;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    for (const f of [1.5, 1.9, 2.3]) {
      const x = Math.round(cx + ux * radius * f), y = Math.round(cy + uy * radius * f);
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      total++;
      if (isSkinAt(data, (y * width + x) * 4)) {
        skin++;
        sx += ux;
        sy += uy;
      }
    }
  }
  if (!total) return null;
  const len = Math.hypot(sx, sy);
  const fraction = skin / total;
  if (fraction < 0.15 || fraction > 0.85 || len / total < 0.15) return null;
  return [sx / len, sy / len];
}

// The nail outline's own principal axis, as a unit vector with no direction.
// Only a fallback: short nails are often wider than they are long.
function outlineAxis(points) {
  let mx = 0, my = 0;
  points.forEach(([x, y]) => { mx += x; my += y; });
  mx /= points.length;
  my /= points.length;
  let sxx = 0, syy = 0, sxy = 0;
  points.forEach(([x, y]) => {
    const dx = x - mx, dy = y - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  });
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return [Math.cos(theta), Math.sin(theta)];
}

// The finger's long axis as a line (which end is the tip comes later). A
// finger's silhouette edges run along the finger, so the dominant edge
// direction in a ring around the nail gives its axis -- for a short round nail
// too, and on any background colour (a fixed skin-colour test is fooled by
// wood, skin-toned and dark surfaces). Null when the ring holds no real edges.
function edgeAxis(imageData, polygon, cx, cy, rMax) {
  const { data, width, height } = imageData;
  const R = Math.ceil(3.4 * rMax);
  const x0 = Math.max(1, Math.floor(cx - R)), x1 = Math.min(width - 2, Math.ceil(cx + R));
  const y0 = Math.max(1, Math.floor(cy - R)), y1 = Math.min(height - 2, Math.ceil(cy + R));
  const row = 4 * width;
  let jxx = 0, jyy = 0, jxy = 0, energy = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < 1.15 * rMax || d > 3.4 * rMax) continue;
      if (pointInPolygon(x, y, polygon)) continue;
      // weight peaks about 1.9 nail-radii out: past the nail, before the neighbouring fingers
      const wgt = Math.exp(-((d - 1.9 * rMax) ** 2) / (2 * (0.9 * rMax) ** 2));
      for (let c = 0; c < 3; c++) {
        const i = (y * width + x) * 4 + c;
        const gx = (data[i + 4 - row] + 2 * data[i + 4] + data[i + 4 + row]) - (data[i - 4 - row] + 2 * data[i - 4] + data[i - 4 + row]);
        const gy = (data[i - 4 + row] + 2 * data[i + row] + data[i + 4 + row]) - (data[i - 4 - row] + 2 * data[i - row] + data[i + 4 - row]);
        const m = gx * gx + gy * gy;
        if (m < 900) continue; // texture noise, not an edge
        jxx += wgt * gx * gx; jyy += wgt * gy * gy; jxy += wgt * gx * gy; energy += wgt * m;
      }
    }
  }
  if (energy < 1) return null;
  // the gradient points across an edge, so the finger runs 90deg from it
  const theta = 0.5 * Math.atan2(2 * jxy, jxx - jyy) + Math.PI / 2;
  const coherence = Math.hypot(jxx - jyy, 2 * jxy) / (jxx + jyy + 1e-9);
  return { dx: Math.cos(theta), dy: Math.sin(theta), coherence };
}

// How sharp an edge ACROSS the finger lies just past one end of the nail
// (sgn = +1 / -1 along the axis). Where the finger ends there is one coherent
// step from finger to background; toward the knuckle there is only more skin.
function stepEdge(imageData, frame, ax, ay, sgn) {
  const { data, width, height } = imageData;
  const { cx, cy, halfLen, halfWid } = frame;
  const bx = -ay, by = ax;
  const at = (x, y, c) => data[(Math.round(y) * width + Math.round(x)) * 4 + c];
  const profile = [];
  for (let d = halfLen * 0.9; d <= halfLen * 3.6; d += 1) {
    const sum = [0, 0, 0];
    let n = 0;
    for (let t = -0.85; t <= 0.86; t += 0.17) {
      const px = cx + sgn * ax * d + bx * t * halfWid, py = cy + sgn * ay * d + by * t * halfWid;
      const fx = px + sgn * ax * 2.5, fy = py + sgn * ay * 2.5, gx = px - sgn * ax * 2.5, gy = py - sgn * ay * 2.5;
      if (Math.min(fx, fy, gx, gy) < 1 || fx >= width - 1 || gx >= width - 1 || fy >= height - 1 || gy >= height - 1) continue;
      for (let c = 0; c < 3; c++) sum[c] += at(fx, fy, c) - at(gx, gy, c);
      n++;
    }
    profile.push(n >= 4 ? Math.hypot(sum[0] / n, sum[1] / n, sum[2] / n) : 0);
  }
  let best = 0;
  for (let i = 1; i < profile.length - 1; i++) best = Math.max(best, (profile[i - 1] + profile[i] + profile[i + 1]) / 3);
  return best;
}

// Least-squares point where lines [{cx, cy, dx, dy, w}] meet: the palm, which
// the finger axes fan out from. Null when the lines are (nearly) parallel.
function meetingPoint(lines) {
  let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
  lines.forEach(({ cx, cy, dx, dy, w }) => {
    const m11 = 1 - dx * dx, m12 = -dx * dy, m22 = 1 - dy * dy;
    a11 += w * m11; a12 += w * m12; a22 += w * m22;
    b1 += w * (m11 * cx + m12 * cy);
    b2 += w * (m12 * cx + m22 * cy);
  });
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 1e-6) return null;
  return [(a22 * b1 - a12 * b2) / det, (-a12 * b1 + a11 * b2) / det];
}

// Same, but a line that misses the common point (one finger measured badly) is
// progressively down-weighted so it can't drag the palm away from the others.
function robustMeetingPoint(lines, weights) {
  let w = weights.slice();
  let point = null;
  for (let pass = 0; pass < 6; pass++) {
    point = meetingPoint(lines.map((l, i) => ({ ...l, w: w[i] })));
    if (!point) return null;
    w = lines.map((l, i) => {
      const vx = point[0] - l.cx, vy = point[1] - l.cy;
      const miss = Math.abs(vx * l.dy - vy * l.dx) / (Math.hypot(vx, vy) + 1); // sine of the angle by which the line misses
      return weights[i] / (1 + (miss / 0.18) ** 2);
    });
  }
  return point;
}

// Long axis (along the finger, +a toward the fingertip) and size of every nail.
// The axis line comes from the edges around the nail (edgeAxis). Which end is
// the fingertip is decided by several weak clues added together, none of which
// is reliable alone: the fingers fan out from the palm so the tips are on the
// far side of it; skin on the finger side against background past the tip; the
// step where the finger ends (stepEdge); and hands in photos mostly point up.
// With near-parallel fingers or only a few nails, the clues of all the nails
// are pooled, since they all point the same way. On a plain background the
// skin ring is the most exact measure of the angle, but on wood, skin-toned or
// dark surfaces it can be wildly wrong -- so it only fine-tunes the answer
// where it agrees with the edge-based one (see SKIN_TRUST_ANGLE).
const SKIN_TRUST_ANGLE = 25 * (Math.PI / 180);

function nailFrames(polygons, imageData) {
  const n = polygons.length;
  if (!n) return [];
  const deg = Math.PI / 180;
  const nails = polygons.map((poly) => {
    const pts = resampleClosed(poly, 48);
    const box = frameFromAxis(pts, 1, 0);
    const edge = imageData && edgeAxis(imageData, poly, box.cx, box.cy, Math.max(box.halfLen, box.halfWid));
    const [dx, dy] = edge ? [edge.dx, edge.dy] : outlineAxis(pts);
    return { pts, frame: frameFromAxis(pts, dx, dy), coherence: edge ? edge.coherence : 0.1 };
  });

  // one shared reference direction (circular mean of the doubled angles), and
  // every axis oriented to point along it so they can be compared
  let sx = 0, sy = 0;
  nails.forEach(({ frame }) => {
    const t = Math.atan2(frame.ay, frame.ax);
    sx += Math.cos(2 * t);
    sy += Math.sin(2 * t);
  });
  const meanAngle = 0.5 * Math.atan2(sy, sx);
  const mean = [Math.cos(meanAngle), Math.sin(meanAngle)];
  const axes = nails.map(({ frame }) => (frame.ax * mean[0] + frame.ay * mean[1] < 0 ? [-frame.ax, -frame.ay] : [frame.ax, frame.ay]));

  // how far apart the finger directions are: fanned-out fingers give a palm
  // point worth trusting, near-parallel ones do not
  let spread = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dot = Math.max(-1, Math.min(1, axes[i][0] * axes[j][0] + axes[i][1] * axes[j][1]));
      spread = Math.max(spread, Math.acos(dot));
    }
  }
  const palm = n >= 3 && spread > 18 * deg
    ? robustMeetingPoint(
      nails.map(({ frame }, i) => ({ cx: frame.cx, cy: frame.cy, dx: axes[i][0], dy: axes[i][1] })),
      nails.map(({ coherence }) => Math.min(1, coherence * 2))
    )
    : null;
  const palmWeight = palm ? 1.5 * Math.min(1, spread / (30 * deg)) : 0;

  // score > 0: the fingertip is on the + side of this nail's axis
  const skinTips = []; // per nail: the fingertip direction according to the skin ring, or null
  const scores = nails.map(({ frame }, i) => {
    const [ax, ay] = axes[i];
    let score = 0;
    if (palm) {
      const awayX = frame.cx - palm[0], awayY = frame.cy - palm[1];
      score += palmWeight * ((awayX * ax + awayY * ay) / (Math.hypot(awayX, awayY) || 1));
    }
    if (imageData) {
      const towardBase = fingerDirection(imageData, frame.cx, frame.cy, Math.max(frame.halfLen, frame.halfWid));
      skinTips[i] = towardBase ? [-towardBase[0], -towardBase[1]] : null;
      if (towardBase) score -= 0.6 * (towardBase[0] * ax + towardBase[1] * ay);
      const tip = stepEdge(imageData, frame, ax, ay, 1);
      const knuckle = stepEdge(imageData, frame, ax, ay, -1);
      score += 0.85 * (tip - knuckle) / (tip + knuckle + 12);
    }
    score -= 0.15 * ay; // y grows downward, so a positive ay points down the photo
    return score;
  });

  // no palm point: fingers that (nearly) agree share one verdict, otherwise
  // (e.g. thumb + finger) each nail decides for itself
  const pooled = !palm && spread < 80 * deg;
  const total = scores.reduce((a, b) => a + b, 0);
  return nails.map(({ pts }, i) => {
    const sign = (pooled ? total : scores[i]) >= 0 ? 1 : -1;
    let ax = sign * axes[i][0], ay = sign * axes[i][1];
    const skin = skinTips[i];
    if (skin && ax * skin[0] + ay * skin[1] > Math.cos(SKIN_TRUST_ANGLE)) [ax, ay] = skin;
    return frameFromAxis(pts, ax, ay);
  });
}

// Rebuilds a nail outline as a smooth rounded curve. Works in the nail's own
// frame scaled to its length/width, where any nail is roughly a unit circle:
// the radius at each angle is low-pass filtered there (keeping the egg-like
// difference between cuticle and tip), so corners and flat runs from the pixel
// mask become a rounded edge -- and long thin nails don't get pinched into a
// peanut shape the way filtering the raw radius would.
function roundNailShape(polygon, frame) {
  const N = 72, K = 3;
  const { cx, cy, ax, ay, bx, by, halfLen, halfWid } = frame;
  const local = polygon.map(([x, y]) => [
    ((x - cx) * bx + (y - cy) * by) / halfWid,
    ((x - cx) * ax + (y - cy) * ay) / halfLen,
  ]);
  const radii = new Array(N).fill(0);
  const n = local.length;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (let j = 0; j < n; j++) {
      const [x1, y1] = local[j];
      const [x2, y2] = local[(j + 1) % n];
      const ex = x2 - x1, ey = y2 - y1;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = (x1 * ey - y1 * ex) / den;
      const s = (x1 * dy - y1 * dx) / den;
      if (t > radii[i] && s >= 0 && s <= 1) radii[i] = t;
    }
  }
  const ca = [], sa = [];
  for (let k = 0; k <= K; k++) {
    let c = 0, s = 0;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      c += radii[i] * Math.cos(k * ang);
      s += radii[i] * Math.sin(k * ang);
    }
    ca.push(((k === 0 ? 1 : 2) * c) / N);
    sa.push((2 * s) / N);
  }
  const out = [];
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2;
    let r = ca[0];
    for (let k = 1; k <= K; k++) r += ca[k] * Math.cos(k * ang) + sa[k] * Math.sin(k * ang);
    r = 0.75 * r + 0.25 * radii[i];
    const u = Math.cos(ang) * r * halfWid, v = Math.sin(ang) * r * halfLen;
    out.push([cx + bx * u + ax * v, cy + by * u + ay * v]);
  }
  return out;
}

function projectUV(point, frame) {
  const { cx, cy, ax, ay, bx, by, halfLen, halfWid } = frame;
  const dx = point[0] - cx, dy = point[1] - cy;
  return [(dx * bx + dy * by) / halfWid, (dx * ax + dy * ay) / halfLen];
}

function fromUV(u, v, frame) {
  const { cx, cy, ax, ay, bx, by, halfLen, halfWid } = frame;
  const upx = u * halfWid, vpx = v * halfLen;
  return [cx + bx * upx + ax * vpx, cy + by * upx + ay * vpx];
}

// ---------- long nails ----------
//
// A real nail plate is close to a rounded rectangle: its sidewalls run straight
// along the finger, and a long nail simply carries them on past the fingertip
// before the end is filed to shape. The detected outline is egg-shaped instead
// (a short nail's free edge follows the round fingertip), so stretching it
// gives a round blob with a narrower stick stuck on the end. Instead the
// outline is kept from the cuticle to where it's widest, the sidewalls carry
// on straight from there, and the tip shape goes on the end -- sized from the
// nail's real width, the way a nail tech files it, not from its length.

// Where the line at height v crosses an outline given in the nail's (u, v)
// frame: [leftmost u, rightmost u], or null if the line misses it.
function crossSection(uv, v) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0, n = uv.length; i < n; i++) {
    const [u1, v1] = uv[i];
    const [u2, v2] = uv[(i + 1) % n];
    if (v1 === v2 || (v1 - v) * (v2 - v) > 0) continue;
    const u = u1 + ((u2 - u1) * (v - v1)) / (v2 - v1);
    if (u < lo) lo = u;
    if (u > hi) hi = u;
  }
  return lo <= hi ? [lo, hi] : null;
}

// Tip outlines are [half-width, distance past where the tip starts] in pixels,
// running from the full-width start (w, 0) to the very end (0, length).
// round/squoval/square are superellipse caps: n = 2 is a true semicircle, and
// the higher n, the flatter the end and the tighter its corners. `height` is
// how far the cap reaches, in half-widths.
const TIP_CAPS = {
  round: { n: 2, height: 1.0 },
  squoval: { n: 3.6, height: 0.55 },
  square: { n: 9, height: 0.26 },
};

function capOutline(w, length, n, count = 24) {
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const th = (i / count) * (Math.PI / 2);
    pts.push([w * Math.pow(Math.cos(th), 2 / n), length * Math.pow(Math.sin(th), 2 / n)]);
  }
  pts[count][0] = 0;
  return pts;
}

// Almond: two arcs that leave the sidewalls tangentially and meet on the axis
// (an ogive), with the point rounded off the way a filed almond is.
function almondOutline(w, length, count = 28) {
  const R = (w * w + length * length) / (2 * w);
  const r = 0.28 * Math.min(w, length);
  const ox = w - R; // centre of the right-hand arc, level with the tip's start
  if (R - r <= Math.abs(ox) + 1e-6) return capOutline(w, length, 2, count);
  const yc = Math.sqrt((R - r) ** 2 - ox * ox); // centre of the rounded point
  const k = R / (R - r);
  const tx = ox - ox * k, ty = yc * k; // where the arc hands over to the rounded point
  const arcEnd = Math.atan2(ty, tx - ox);
  const tipStart = Math.atan2(ty - yc, tx);
  const nArc = Math.round(count * 0.7);
  const pts = [];
  for (let i = 0; i <= nArc; i++) {
    const a = (arcEnd * i) / nArc;
    pts.push([ox + R * Math.cos(a), R * Math.sin(a)]);
  }
  for (let i = 1; i <= count - nArc; i++) {
    const a = tipStart + ((Math.PI / 2 - tipStart) * i) / (count - nArc);
    pts.push([r * Math.cos(a), yc + r * Math.sin(a)]);
  }
  // rounding the point shortened it -- stretch back to the length asked for
  const s = length / (yc + r);
  return pts.map(([x, y]) => [Math.max(0, x), y * s]);
}

// Skin test in YCrCb (robust to lighting): shared by the finger-direction and
// pose checks.
function isSkinAt(data, o) {
  const r = data[o], g = data[o + 1], b = data[o + 2];
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const cr = (r - lum) * 0.713 + 128, cb = (b - lum) * 0.564 + 128;
  return cr >= 133 && cr <= 178 && cb >= 77 && cb <= 127;
}

// A nail seen side-on (usually the thumb) looks narrow for its length, and its
// long free edge then shows only as a thin band that curves toward the finger
// pad. The pad is on whichever side of the nail has more skin beside it, since
// the nail itself sits on the back of the finger.
function nailPose(imageData, frame) {
  const sideness = smoothstep(0.62, 0.42, frame.halfWid / frame.halfLen);
  if (!imageData || sideness <= 0) return { sideness, palmSide: 0 };
  const { data, width, height } = imageData;
  let plus = 0, minus = 0, total = 0;
  for (const v of [-0.5, -0.2, 0.1, 0.4]) {
    for (const k of [1.6, 2.2, 2.8, 3.4]) {
      for (const s of [1, -1]) {
        const [x, y] = fromUV(s * k, v, frame);
        const xi = Math.round(x), yi = Math.round(y);
        if (xi < 0 || yi < 0 || xi >= width || yi >= height) continue;
        total++;
        if (isSkinAt(data, (yi * width + xi) * 4)) {
          if (s > 0) plus++;
          else minus++;
        }
      }
    }
  }
  const diff = plus - minus;
  return { sideness, palmSide: Math.abs(diff) >= Math.max(3, total * 0.15) ? Math.sign(diff) : 0 };
}

const PROFILE_BINS = 160;

function profileBin(geo, v) {
  const b = Math.round(((v - geo.vLo) / (geo.vTip - geo.vLo)) * (PROFILE_BINS - 1));
  return b < 0 ? 0 : b >= PROFILE_BINS ? PROFILE_BINS - 1 : b;
}

// Builds a long nail from the detected (rounded) outline. Returns the new
// outline plus what the painter needs to shade it as one continuous nail: its
// centre line and half-width along its length (uc/hw, per v bin), where the
// real nail ends (vHi) and where the drawn one ends (vTip). null when there's
// nothing sensible to build (tiny or degenerate outline).
function buildExtendedNail(baseShape, frame, extendFrac, tipShape, pose) {
  const { halfLen, halfWid } = frame;
  if (extendFrac <= 0.001 || halfLen < 4 || halfWid < 3) return null;
  const uv = baseShape.map((p) => projectUV(p, frame));
  let vLo = Infinity, vHi = -Infinity;
  uv.forEach(([, v]) => {
    if (v < vLo) vLo = v;
    if (v > vHi) vHi = v;
  });
  const span = vHi - vLo;
  if (!(span > 0.2)) return null;
  const vCut = vLo + 0.3 * span; // below this the outline (cuticle end) is kept as detected
  const vTip = vHi + extendFrac;

  const side = pose?.sideness || 0;
  const palm = pose?.palmSide || 0;
  const vFree = vHi - 0.35; // about where the stress points are: the free edge leaves the finger there
  const freeLen = vTip - vFree;

  // Seen from above: the widest extent so far, walking from vCut toward the
  // tip -- follows the outline while it widens, then holds, i.e. straight
  // sidewalls from the widest point on. Seen side-on, a nail's outline
  // narrows as it curves over the fingertip, so there it's followed as
  // detected up to the stress points and held from there instead.
  const K = 36;
  const runV = [], runL = [], runR = [], rawL = [], rawR = [];
  let lo = Infinity, hi = -Infinity, last = null;
  for (let k = 0; k <= K; k++) {
    const v = vCut + ((vHi - vCut) * k) / K;
    const cs = crossSection(uv, Math.min(v, vHi - 1e-6)) || last;
    if (cs) {
      last = cs;
      if (cs[0] < lo) lo = cs[0];
      if (cs[1] > hi) hi = cs[1];
    }
    runV.push(v);
    runL.push(lo);
    runR.push(hi);
    rawL.push(cs ? cs[0] : lo);
    rawR.push(cs ? cs[1] : hi);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi - lo < 1e-3 || !Number.isFinite(runL[0])) return null;
  let kWide = K;
  for (let k = 0; k <= K; k++) {
    if (runR[k] - runL[k] >= 0.97 * (hi - lo)) {
      kWide = k;
      break;
    }
  }
  const vWide = runV[kWide];
  const lookup = (arr, v) => {
    const t = Math.min(K, Math.max(0, ((v - vCut) / (vHi - vCut)) * K));
    const k = Math.min(K - 1, Math.floor(t));
    return arr[k] + (arr[k + 1] - arr[k]) * (t - k);
  };
  const vHold = Math.max(vCut, vFree);
  const sidewallsAt = (v) => {
    const top = [lookup(runL, v), lookup(runR, v)];
    if (side <= 0) return top;
    const sv = Math.min(v, vHold);
    const s = [lookup(rawL, sv), lookup(rawR, sv)];
    return [top[0] + (s[0] - top[0]) * side, top[1] + (s[1] - top[1]) * side];
  };
  // a side-on nail's free edge also bends toward the finger pad (a long nail
  // curves down along its length -- seen from above that's invisible), and
  // shows only the thin edge of the nail, so it narrows; both grow smoothly
  // from the fingertip on
  const bendU = (palm * side * 0.2 * (vTip - vHi) * halfLen) / halfWid;
  const pastTip = (v) => Math.min(1, Math.max(0, (v - vHi) / (vTip - vHi)));
  const centreAt = (v) => {
    const [l, r] = sidewallsAt(v);
    const q = pastTip(v);
    return (l + r) / 2 + bendU * q * q;
  };
  const halfAt = (v) => {
    const [l, r] = sidewallsAt(v);
    const q = Math.min(1, Math.max(0, (v - vFree) / freeLen));
    // from above: the detected outline takes in the skin folds beside the
    // nail, and a long nail pinches in slightly along its free edge -- so a
    // gentle taper from the widest point on
    const taper = (0.09 * smoothstep(vWide, vHi + 0.6, v) + 0.04 * q) * (1 - side);
    return ((r - l) / 2) * (1 - taper - 0.3 * side * smoothstep(0, 1, pastTip(v)));
  };

  const minCap = Math.max(vWide + (vHold - vWide) * side, vCut + 0.05);
  let vCap, cap;
  if (tipShape === 'almond') {
    vCap = Math.min(Math.max(vHi - 0.45, minCap), vTip - 0.15);
    cap = almondOutline(halfAt(vCap) * halfWid, (vTip - vCap) * halfLen);
  } else {
    const spec = TIP_CAPS[tipShape] || TIP_CAPS.round;
    let wPx = halfAt(vHi) * halfWid;
    vCap = vTip;
    // the tip's width depends a little on where it starts; settle it in two passes
    for (let pass = 0; pass < 2; pass++) {
      vCap = Math.max(minCap, Math.min(vTip - 0.05, vTip - (spec.height * wPx) / halfLen));
      wPx = halfAt(vCap) * halfWid;
    }
    cap = capOutline(wPx, (vTip - vCap) * halfLen, spec.n);
  }

  // outline in (u, v): up the right sidewall, round the tip, down the left
  // one, then back round the cuticle end of the detected outline
  const right = [], left = [];
  const nStraight = Math.max(8, Math.ceil((vCap - vCut) / 0.03));
  for (let k = 0; k <= nStraight; k++) {
    const v = vCut + ((vCap - vCut) * k) / nStraight;
    const c = centreAt(v), h = halfAt(v);
    right.push([c + h, v]);
    left.push([c - h, v]);
  }
  for (let k = 1; k < cap.length; k++) {
    const v = vCap + cap[k][1] / halfLen;
    const c = centreAt(v), h = cap[k][0] / halfWid;
    right.push([c + h, v]);
    if (k < cap.length - 1) left.push([c - h, v]); // the last point is the tip itself, shared
  }
  const n = uv.length;
  let start = -1;
  for (let i = 0; i < n; i++) {
    if (uv[i][1] < vCut && uv[(i - 1 + n) % n][1] >= vCut) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const cuticle = [];
  for (let j = 0; j < n; j++) {
    const p = uv[(start + j) % n];
    if (p[1] >= vCut) break;
    cuticle.push(p);
  }
  if (cuticle.length && cuticle[0][0] > cuticle[cuticle.length - 1][0]) cuticle.reverse();
  const polygon = [...right, ...left.reverse(), ...cuticle].map(([u, v]) => fromUV(u, v, frame));

  const uc = new Float32Array(PROFILE_BINS), hw = new Float32Array(PROFILE_BINS);
  for (let b = 0; b < PROFILE_BINS; b++) {
    const v = vLo + ((vTip - vLo) * b) / (PROFILE_BINS - 1);
    if (v < vCut) {
      const cs = crossSection(uv, Math.max(v, vLo + 1e-4));
      uc[b] = cs ? (cs[0] + cs[1]) / 2 : centreAt(vCut);
      hw[b] = cs ? Math.max(0.02, (cs[1] - cs[0]) / 2) : 0.02;
    } else if (v <= vCap) {
      uc[b] = centreAt(v);
      hw[b] = halfAt(v);
    } else {
      const y = (v - vCap) * halfLen;
      let x = 0;
      for (let k = 1; k < cap.length; k++) {
        if (cap[k][1] >= y) {
          const [xa, ya] = cap[k - 1], [xb, yb] = cap[k];
          x = xa + (xb - xa) * (yb > ya ? (y - ya) / (yb - ya) : 1);
          break;
        }
      }
      uc[b] = centreAt(v);
      hw[b] = Math.max(0.02, x / halfWid);
    }
  }
  const freeHalf = Math.max(0.05, halfAt(vCap));
  return { polygon, basePolygon: baseShape, vLo, vHi, vTip, uc, hw, freeHalf, freeHalfPx: freeHalf * halfWid };
}

function readPixels(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  return g.getImageData(0, 0, w, h);
}

function boxBlur(src, w, h, r) {
  const size = 2 * r + 1;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const at = (arr, row, x) => arr[row + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += at(src, row, x);
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / size;
      acc += at(src, row, x + r + 1) - at(src, row, x - r);
    }
  }
  for (let x = 0; x < w; x++) {
    const col = (y) => tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += col(y);
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / size;
      acc += col(y + r + 1) - col(y - r);
    }
  }
  return out;
}

// stable per-pixel noise so glitter/texture don't reshuffle on every redraw
// (e.g. while dragging the compare slider)
function hash2(x, y, seed) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.0137) * 43758.5453;
  return s - Math.floor(s);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// anti-aliased coverage of the nail shape + a softened copy used to darken the
// polish toward its edge; cached per polygon since only the colors change
const nailMaskCache = new WeakMap();
function nailMask(polygon, frame, canvasW, canvasH) {
  const cached = nailMaskCache.get(polygon);
  if (cached) return cached;
  const pad = 4;
  const bb = polygonBBox(polygon);
  const x0 = Math.max(0, Math.floor(bb.minX) - pad), y0 = Math.max(0, Math.floor(bb.minY) - pad);
  const x1 = Math.min(canvasW, Math.ceil(bb.maxX) + pad), y1 = Math.min(canvasH, Math.ceil(bb.maxY) + pad);
  const bw = x1 - x0, bh = y1 - y0;
  if (bw <= 0 || bh <= 0) return null;
  const c = document.createElement('canvas');
  c.width = bw;
  c.height = bh;
  const g = c.getContext('2d');
  g.translate(-x0, -y0);
  g.fillStyle = '#fff';
  g.beginPath();
  tracePolygon(g, polygon);
  g.fill();
  const px = g.getImageData(0, 0, bw, bh).data;
  const alpha = new Float32Array(bw * bh);
  for (let i = 0; i < alpha.length; i++) alpha[i] = px[i * 4 + 3] / 255;
  const rimRadius = Math.max(1, Math.round(Math.min(frame.halfWid, frame.halfLen) * 0.22));
  const mask = { x0, y0, bw, bh, alpha, rim: boxBlur(alpha, bw, bh, rimRadius) };
  nailMaskCache.set(polygon, mask);
  return mask;
}

function drawGlints(ctx, polygon, frame, seed, geo = null) {
  const rand = mulberry32(seed);
  const { cx, cy, ax, ay, bx, by, halfLen, halfWid } = frame;
  ctx.save();
  ctx.beginPath();
  tracePolygon(ctx, polygon);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  // a long nail has more surface, so proportionally more sparkles spread along all of it
  const lengthScale = geo ? (geo.vTip - geo.vLo) / 2 : 1;
  const count = Math.round((5 + Math.round(Math.min(halfLen, halfWid) / 6)) * lengthScale);
  for (let k = 0; k < count; k++) {
    let u, v;
    if (geo) {
      v = geo.vLo + (geo.vTip - geo.vLo) * (0.08 + 0.84 * rand());
      const bin = profileBin(geo, v);
      u = geo.uc[bin] + (rand() * 2 - 1) * 0.8 * geo.hw[bin];
    } else {
      const ang = rand() * Math.PI * 2, rad = Math.sqrt(rand()) * 0.8;
      u = Math.cos(ang) * rad;
      v = Math.sin(ang) * rad;
    }
    const x = cx + bx * u * halfWid + ax * v * halfLen;
    const y = cy + by * u * halfWid + ay * v * halfLen;
    const size = halfWid * (0.12 + rand() * 0.14);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = Math.max(0.6, size * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size); ctx.lineTo(x, y + size);
    ctx.stroke();
  }
  ctx.restore();
}

// Soft shadow under the part of a long nail that sticks out past the finger --
// a free edge is a solid thing held a little above whatever is behind it, and
// without one it reads as a sticker. Light from the upper left, like the gloss.
// Cached per outline: only colours change between redraws.
const nailShadowCache = new WeakMap();
function nailShadow(polygon, frame, geo) {
  const cached = nailShadowCache.get(polygon);
  if (cached) return cached;
  const size = geo.freeHalfPx;
  const blur = Math.max(2, size * 0.55);
  const offX = size * 0.16, offY = size * 0.3;
  const pad = Math.ceil(blur * 2 + Math.max(offX, offY) + 2);
  const bb = polygonBBox(polygon);
  const x0 = Math.floor(bb.minX) - pad, y0 = Math.floor(bb.minY) - pad;
  const w = Math.ceil(bb.w) + 2 * pad, h = Math.ceil(bb.h) + 2 * pad;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  // the shape is drawn far off-canvas so only its blurred shadow lands here
  // (shadowBlur works in every browser; ctx.filter doesn't)
  const far = 2 * (w + h);
  g.save();
  g.shadowColor = 'rgba(70, 42, 52, 1)';
  g.shadowBlur = blur;
  g.shadowOffsetX = far + offX;
  g.shadowOffsetY = offY;
  g.translate(-x0 - far, -y0);
  g.fillStyle = '#000';
  g.beginPath();
  tracePolygon(g, polygon);
  g.fill();
  // restore drops the shadow settings too -- left on, the fade below would
  // cast its own shadow off-canvas and destination-in would wipe everything
  g.restore();
  // none over the real nail (it lies on the finger), full past the fingertip
  const [p0x, p0y] = fromUV(0, geo.vHi - 0.3, frame);
  const [p1x, p1y] = fromUV(0, geo.vHi + 0.15, frame);
  const fade = g.createLinearGradient(p0x - x0, p0y - y0, p1x - x0, p1y - y0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = fade;
  g.fillRect(0, 0, w, h);
  const out = { canvas: c, x0, y0 };
  nailShadowCache.set(polygon, out);
  return out;
}

function drawNailShadow(ctx, polygon, frame, geo) {
  const s = nailShadow(polygon, frame, geo);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.28;
  ctx.drawImage(s.canvas, s.x0, s.y0);
  ctx.restore();
}

// What paintNail needs to light a long nail as one piece. Past the fingertip
// the photo only has background, so the light there comes from the real
// nail: its average brightness across the width (the curve of the nail, as
// the camera saw it) is carried on down the whole length. Also the real nail
// bed's colour, which a see-through polish shows there instead of background.
const LIGHT_BINS = 17;
const longNailLightingCache = new WeakMap(); // per geo: depends only on the photo and shape
function longNailLighting(geo, frame, photo, canvasW, canvasH) {
  const cached = longNailLightingCache.get(geo);
  if (cached) return cached;
  const base = nailMask(geo.basePolygon, frame, canvasW, canvasH);
  const lumSum = new Float32Array(LIGHT_BINS), lumCnt = new Float32Array(LIGHT_BINS);
  let lSum = 0, lCount = 0, cr = 0, cg = 0, cb = 0, cCount = 0;
  const { cx, cy, ax, ay, bx, by, halfLen, halfWid } = frame;
  // the middle of the nail bed: clear of the cuticle and of the whiter free edge
  const vA = geo.vLo + 0.25 * (geo.vHi - geo.vLo), vB = geo.vHi - 0.3 * (geo.vHi - geo.vLo);
  if (base && photo) {
    const pd = photo.data, pw = photo.width;
    for (let py = 0; py < base.bh; py++) {
      for (let px = 0; px < base.bw; px++) {
        const a = base.alpha[py * base.bw + px];
        if (a < 0.5) continue;
        const X = base.x0 + px, Y = base.y0 + py;
        const o = (Y * pw + X) * 4;
        const lum = 0.299 * pd[o] + 0.587 * pd[o + 1] + 0.114 * pd[o + 2];
        lSum += lum;
        lCount++;
        if (a < 0.95) continue;
        const dx = X + 0.5 - cx, dy = Y + 0.5 - cy;
        const v = (dx * ax + dy * ay) / halfLen;
        if (v < vA || v > vB) continue;
        const bin = profileBin(geo, v);
        const uRel = ((dx * bx + dy * by) / halfWid - geo.uc[bin]) / geo.freeHalf;
        const k = Math.round(((uRel + 1.2) / 2.4) * (LIGHT_BINS - 1));
        if (k < 0 || k >= LIGHT_BINS) continue;
        lumSum[k] += lum;
        lumCnt[k]++;
        cr += pd[o];
        cg += pd[o + 1];
        cb += pd[o + 2];
        cCount++;
      }
    }
  }
  const lMean = lCount ? lSum / lCount : 128;
  const raw = new Float32Array(LIGHT_BINS);
  for (let k = 0; k < LIGHT_BINS; k++) {
    if (lumCnt[k]) {
      raw[k] = lumSum[k] / lumCnt[k];
      continue;
    }
    // empty bin (past the real nail's edge): borrow the nearest filled one
    let best = -1;
    for (let dk = 1; dk < LIGHT_BINS && best < 0; dk++) {
      if (k - dk >= 0 && lumCnt[k - dk]) best = k - dk;
      else if (k + dk < LIGHT_BINS && lumCnt[k + dk]) best = k + dk;
    }
    raw[k] = best >= 0 ? lumSum[best] / lumCnt[best] : lMean;
  }
  const prof = new Float32Array(LIGHT_BINS);
  for (let k = 0; k < LIGHT_BINS; k++) {
    prof[k] = 0.25 * raw[Math.max(0, k - 1)] + 0.5 * raw[k] + 0.25 * raw[Math.min(LIGHT_BINS - 1, k + 1)];
  }
  // the real nail bed's own colour (paintNail pales it toward the tip)
  const under = cCount ? [cr / cCount, cg / cCount, cb / cCount] : [226, 190, 180];
  const out = { base, lMean, prof, under };
  if (photo) longNailLightingCache.set(geo, out);
  return out;
}

// Paints polish over one nail, pixel by pixel in the nail's own frame
// (u = across the width, v = along the finger): the original nail's light and
// shadow carry through so the polish sits in the photo's lighting, the sides
// darken because a nail curves across its width, the edge darkens slightly so
// the polish looks seated rather than stuck on, and a soft shine streak runs
// along the nail like on real gloss. `geo` (from buildExtendedNail) marks a
// long nail; `photo` is the untouched photo, for the real nail's light.
function paintNail(ctx, polygon, frame, hex, finish, seed, geo = null, photo = null) {
  const style = FINISH_STYLE[finish] || FINISH_STYLE.creamy;
  const canvasW = ctx.canvas.width, canvasH = ctx.canvas.height;
  const mask = nailMask(polygon, frame, canvasW, canvasH);
  if (!mask) return;
  const { x0, y0, bw, bh, alpha, rim } = mask;
  const image = ctx.getImageData(x0, y0, bw, bh);
  const d = image.data;
  const [pr, pg, pb] = hexToRgb(hex);
  const { cx, cy, ax, ay, bx, by, halfLen, halfWid, lightEnd } = frame;
  const lit = geo ? longNailLighting(geo, frame, photo, canvasW, canvasH) : null;

  let lMean;
  if (lit) {
    lMean = lit.lMean;
  } else {
    let lSum = 0, lCount = 0;
    for (let i = 0; i < alpha.length; i++) {
      if (alpha[i] > 0.5) {
        lSum += 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
        lCount++;
      }
    }
    lMean = lCount ? lSum / lCount : 128;
  }

  // long-nail constants: where the real nail ends (vHi) and the drawn one does
  // (vTip); the shine runs the full length and its hot spot sits on the side of
  // the nail facing the light, measured along the whole nail
  const vLo = geo ? geo.vLo : -1, vHi = geo ? geo.vHi : 1, vTip = geo ? geo.vTip : 1;
  const totalLen = vTip - vLo;
  const vSpot = geo ? (vLo + vTip) / 2 + 0.3 * lightEnd * (totalLen / 2) : 0.35 * lightEnd;
  const spotLen = geo ? 0.16 * Math.sqrt(totalLen / 2) : 0.16;
  const base = lit?.base;
  const pd = photo?.data, pw = photo?.width;

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const i = py * bw + px;
      const cover = alpha[i];
      if (cover <= 0) continue;
      const o = i * 4;
      const X = x0 + px, Y = y0 + py;
      const dx = X + 0.5 - cx, dy = Y + 0.5 - cy;
      const v = (dx * ax + dy * ay) / halfLen;
      const u = (dx * bx + dy * by) / halfWid;

      let lum, uShade, uShine, along, endDark, underR = d[o], underG = d[o + 1], underB = d[o + 2];
      if (!geo) {
        lum = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
        uShade = u;
        uShine = u;
        along = 1 - smoothstep(0.35, 0.85, Math.abs(v + 0.1));
        endDark = 0.05 * Math.min(v, 1.15) ** 4;
      } else {
        const bin = profileBin(geo, v);
        const ucv = geo.uc[bin], hwv = geo.hw[bin];
        // across-the-nail position relative to the (possibly bent) centre line:
        // against the full free-edge width (where the nail's curve is) and
        // against the width right here (so shading follows a narrowing tip).
        // Over the cuticle half it stays the plain u a natural nail uses.
        const uRel = (u - ucv) / geo.freeHalf;
        const uLoc = (u - ucv) / Math.max(hwv, 0.02);
        const distal = smoothstep(vHi - 0.5, vHi + 0.1, v);
        uShade = u + ((uRel + uLoc) * 0.5 - u) * distal;
        uShine = u + ((0.15 * uRel + 0.85 * uLoc) - u) * distal;

        let bAlpha = 0, bRim = 0;
        if (base) {
          const bxp = X - base.x0, byp = Y - base.y0;
          if (bxp >= 0 && byp >= 0 && bxp < base.bw && byp < base.bh) {
            const j = byp * base.bw + bxp;
            bAlpha = base.alpha[j];
            bRim = base.rim[j];
          }
        }
        // the photo's own light, but only well inside the real nail and only
        // over its cuticle half: its outline and whiter free edge would show
        // through as a seam across the long nail. Everywhere else the real
        // nail's carried-on light takes over, smoothly
        const photoWeight = smoothstep(0.72, 0.98, bRim) * (1 - smoothstep(vHi - 1.0, vHi - 0.4, v));
        const po = (Y * pw + X) * 4;
        const photoLum = pd ? 0.299 * pd[po] + 0.587 * pd[po + 1] + 0.114 * pd[po + 2] : lMean;
        const kb = Math.round(((uRel + 1.2) / 2.4) * (LIGHT_BINS - 1));
        const carried = lit.prof[kb < 0 ? 0 : kb >= LIGHT_BINS ? LIGHT_BINS - 1 : kb];
        lum = carried + (photoLum - carried) * photoWeight;

        // under a see-through polish: the real nail bed near the cuticle,
        // turning gradually into a paler free edge toward the tip -- blended
        // softly so the real nail's outline doesn't show as a nail inside a nail
        const realNail = smoothstep(0.55, 0.95, bRim) * (1 - smoothstep(vHi - 0.7, vHi - 0.15, v));
        const pale = 0.4 * smoothstep(vHi - 0.4, vTip, v);
        const fr = lit.under[0] + (245 - lit.under[0]) * pale;
        const fg = lit.under[1] + (236 - lit.under[1]) * pale;
        const fb = lit.under[2] + (230 - lit.under[2]) * pale;
        underR = fr + (d[o] - fr) * realNail;
        underG = fg + (d[o + 1] - fg) * realNail;
        underB = fb + (d[o + 2] - fb) * realNail;

        along = smoothstep(vLo + 0.1 * totalLen, vLo + 0.3 * totalLen, v) *
          (1 - smoothstep(vTip - 0.22 * totalLen, vTip - 0.02 * totalLen, v));
        // the free edge curves down and away toward its end, catching a little less light
        endDark = 0.05 * Math.min(Math.max(-v, 0), 1) ** 4 + 0.07 * smoothstep(vHi, vTip, v) ** 1.5;
      }

      const light = Math.min(1.35, Math.max(0.65, 1 + style.lightTransfer * (lum - lMean) / 128));
      const curve = 1 - style.curvature * uShade * uShade - endDark;
      const edge = 1 - 0.2 * (1 - rim[i]);
      // polish pools slightly thicker/darker along the cuticle (v -> -1)
      const cuticle = 1 - 0.08 * smoothstep(0.55, 1.0, -v);
      const k = light * curve * edge * cuticle;
      let r = pr * k, g = pg * k, b = pb * k;

      if (finish === 'metallic') {
        const band = 0.8 + 0.3 * Math.cos(uShade * 2.4 + 0.5);
        r *= band; g *= band; b *= band;
      } else if (finish === 'matte') {
        const grey = 0.3 * r + 0.59 * g + 0.11 * b;
        r = r * 0.85 + grey * 0.15 + 8; g = g * 0.85 + grey * 0.15 + 8; b = b * 0.85 + grey * 0.15 + 8;
      } else if (finish === 'pearl') {
        const sheen = 0.16 * (0.5 + 0.5 * Math.sin(v * 3.2 + uShade * 1.8));
        r += (255 - r) * sheen; g += (236 - g) * sheen; b += (250 - b) * sheen;
      } else if (finish === 'texture') {
        const grain = 1 + 0.2 * (hash2(X >> 1, Y >> 1, seed) - 0.5);
        r *= grain; g *= grain; b *= grain;
      } else if (finish === 'glitter') {
        const n = hash2(X, Y, seed);
        if (n > 0.88) {
          const s = ((n - 0.88) / 0.12) * 0.8;
          r += (255 - r) * s; g += (255 - g) * s; b += (255 - b) * s;
        } else {
          const t = 0.9 + 0.2 * n;
          r *= t; g *= t; b *= t;
        }
      }

      if (style.gloss > 0) {
        const du = (uShine + 0.32) / style.glossWidth;
        const streak = Math.exp(-du * du) * along;
        const su = (uShine + 0.32) / 0.14, sv = (v - vSpot) / spotLen;
        const spot = Math.exp(-(su * su + sv * sv));
        // a long nail also shows a crisp core down its shine line (a hard gel
        // reflects the light source sharply) and a dimmer, broader reflection
        // on its far side
        let extra = 0;
        if (geo) {
          const dc = (uShine + 0.32) / (style.glossWidth * 0.32);
          const dv = (uShine - 0.48) / 0.28;
          extra = 0.3 * Math.exp(-dc * dc) * along + 0.14 * Math.exp(-dv * dv) * along;
        }
        const shine = Math.min(1, style.gloss * (0.5 * streak + 0.55 * spot + extra));
        r = 255 - (255 - r) * (1 - shine);
        g = 255 - (255 - g) * (1 - shine);
        b = 255 - (255 - b) * (1 - shine);
      }

      // polish over what's under it (on a long nail's drawn part, a pale nail),
      // then that layer over the photo by how much of the pixel the nail covers
      const a = style.opacity;
      d[o] = d[o] * (1 - cover) + (underR * (1 - a) + clamp255(r) * a) * cover;
      d[o + 1] = d[o + 1] * (1 - cover) + (underG * (1 - a) + clamp255(g) * a) * cover;
      d[o + 2] = d[o + 2] * (1 - cover) + (underB * (1 - a) + clamp255(b) * a) * cover;
    }
  }
  ctx.putImageData(image, x0, y0);

  if (finish === 'glitter') drawGlints(ctx, polygon, frame, seed, geo);
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
  Swap: () => <svg viewBox="0 0 24 24" fill="none"><path d="M7 4v16M7 4L3.5 7.5M7 4l3.5 3.5M17 20V4M17 20l-3.5-3.5M17 20l3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
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
  const nailRegionsRef = useRef([]); // [[[x,y],...]] real detected pixel-space polygons, kept out of state
  const nailFramesRef = useRef([]); // per-nail axis/size (see nailFrames), computed once per photo
  const renderRegionsRef = useRef([]); // nailRegionsRef stretched to the chosen length/shape (see redraw)
  const renderGeoRef = useRef([]); // per nail: buildExtendedNail result, or null at natural length
  const renderRegionsSigRef = useRef('');
  const nailPosesRef = useRef([]); // per nail: side-on or not (see nailPose), computed once per photo
  const photoPixelsRef = useRef(null); // the untouched photo's pixels, for the real nails' light
  const detectionGenRef = useRef(0); // bumped on every successful detection, to invalidate the cache above
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const compareWrapRef = useRef(null);
  const compareHandleRef = useRef(null);
  const compareDividerRef = useRef(null);
  const comparePosRef = useRef(50); // 0-100, kept in a ref so dragging doesn't re-render every pixel
  const isDraggingCompareRef = useRef(false);
  const detectingRef = useRef(false);
  const detectRunRef = useRef(0); // bumped when a photo is replaced/closed, so a slow answer for the old photo is ignored
  const detectFailureRef = useRef(null); // why the last detection found nothing (server trouble vs no nails in the photo)
  const redrawRef = useRef(() => {});
  const pendingUploadActionRef = useRef(null); // 'file' | 'camera'
  const toastTimerRef = useRef(null);

  const [page, setPage] = useState('tryon'); // 'tryon' | 'skin'
  const [hasImage, setHasImage] = useState(false);
  const [statusText, setStatusText] = useState(null);
  const [errorText, setErrorText] = useState(null);
  const [mode, setMode] = useState('single');
  const [activeFinish, setActiveFinish] = useState('creamy');
  const [lengthPreset, setLengthPreset] = useState('natural');
  const [tipShape, setTipShape] = useState('round');
  const [lengthFlipped, setLengthFlipped] = useState(false); // the user swapped which end of each nail is the tip
  const [detectFailed, setDetectFailed] = useState(false); // the photo is up but no nails were found on it
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

    // outlines at the chosen length/shape -- rebuilt here even before any
    // colour is on, so tap-to-select and the selection ring match them
    const frames = nailFramesRef.current;
    const sig = `${detectionGenRef.current}|${lengthPreset}|${tipShape}`;
    if (renderRegionsSigRef.current !== sig) {
      const extendFrac = LENGTH_PRESETS.find((p) => p.key === lengthPreset)?.frac || 0;
      const geos = nailRegionsRef.current.map((shape, i) =>
        extendFrac > 0 ? buildExtendedNail(shape, frames[i], extendFrac, tipShape, nailPosesRef.current[i]) : null
      );
      renderGeoRef.current = geos;
      renderRegionsRef.current = geos.map((geo, i) => (geo ? geo.polygon : nailRegionsRef.current[i]));
      renderRegionsSigRef.current = sig;
    }

    if (!hasAnyColor) {
      ctx.drawImage(img, 0, 0, w, h);
      setCompareVisible(false);
    } else {
      ctx.drawImage(img, 0, 0, w, h);
      const regions = renderRegionsRef.current;
      const geos = renderGeoRef.current;
      // every shadow before any nail, so no nail ends up under a neighbour's shadow
      regions.forEach((polygon, i) => {
        if (nailColors[i] && geos[i]) drawNailShadow(ctx, polygon, frames[i], geos[i]);
      });
      regions.forEach((polygon, i) => {
        const applied = nailColors[i];
        if (applied) {
          const seed = i * 7919 + parseInt(applied.hex.slice(1), 16);
          paintNail(ctx, polygon, frames[i], applied.hex, applied.finish, seed, geos[i], photoPixelsRef.current);
        }
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
      const polygon = renderRegionsRef.current[selectedFinger] || nailRegionsRef.current[selectedFinger];
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

  // attach the compare-slider drag listeners (uses redrawRef so it always calls
  // the latest closure). The handle only mounts once a photo is loaded, so this
  // must re-run on hasImage -- with [] it ran at mount, found no handle, and the
  // slider was never draggable.
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
  }, [hasImage]);

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
    detectRunRef.current += 1;
    detectingRef.current = false;
    detectFailureRef.current = null;
    setDetectFailed(false);
    setLengthFlipped(false);
    baseImageRef.current = null;
    nailRegionsRef.current = [];
    nailFramesRef.current = [];
    nailPosesRef.current = [];
    photoPixelsRef.current = null;
    renderRegionsRef.current = [];
    renderGeoRef.current = [];
    renderRegionsSigRef.current = '';
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
    if (!canvasRef.current) return;
    const run = ++detectRunRef.current;
    const replaced = () => run !== detectRunRef.current; // another photo (or closing the tool) took over meanwhile
    setStatusText('กำลังตรวจจับตำแหน่งเล็บ...');
    setErrorText(null);
    setDetectFailed(false);
    detectingRef.current = true;
    const blob = await canvasToBlob();

    let data = null;
    let failure = null;
    for (let attempt = 1; attempt <= DETECT_ATTEMPTS && !data; attempt++) {
      try {
        data = await postImageForNails(blob, 'photo.jpg');
      } catch (err) {
        console.error(err);
        failure = err;
        if (replaced() || attempt === DETECT_ATTEMPTS || !isTransientDetectError(err)) break;
        setStatusText(`ระบบ AI กำลังเตรียมตัว รอสักครู่... (ครั้งที่ ${attempt + 1}/${DETECT_ATTEMPTS})`);
        await new Promise((resolve) => setTimeout(resolve, DETECT_RETRY_DELAYS_MS[attempt - 1]));
        if (replaced()) break;
      }
    }
    if (replaced()) return;
    detectingRef.current = false;
    setStatusText(null);

    const message = !data
      ? detectErrorMessage(failure)
      : data.nails?.length
        ? null
        : 'ไม่พบเล็บในรูปนี้ ลองถ่ายให้เห็นมือและเล็บชัดขึ้น (ใกล้ขึ้น แสงสว่าง พื้นหลังเรียบ) แล้วกดตรวจจับอีกครั้ง หรือเลือกรูปใหม่';
    detectFailureRef.current = message;
    if (message) {
      setDetectFailed(true);
      setErrorText(message);
      return;
    }

    const { w, h } = workSizeRef.current;
    // a nail is convex, so the hull removes dents/jaggies of the pixel-mask
    // outline; then each outline is rebuilt as a rounded curve in its own frame
    const hulls = data.nails.map((polygon) => convexHull(polygon.map(([x, y]) => [x * w, y * h])));
    const pixels = readPixels(baseImageRef.current, w, h);
    const hullFrames = nailFrames(hulls, pixels);
    const shapes = hulls.map((hull, i) => roundNailShape(hull, hullFrames[i]));
    nailRegionsRef.current = shapes;
    nailFramesRef.current = shapes.map((shape, i) => frameFromAxis(shape, hullFrames[i].ax, hullFrames[i].ay));
    nailPosesRef.current = nailFramesRef.current.map((frame) => nailPose(pixels, frame));
    photoPixelsRef.current = pixels;
    detectionGenRef.current += 1;
    setLengthFlipped(false);
    setNailColors(Array.from({ length: nailRegionsRef.current.length }, () => null));
    setSelectedFinger(null);
    setErrorText(null);
  }

  // The AI can't always tell which end of a finger is the tip from the photo
  // alone, and the extended part of a nail grows toward it. This swaps every
  // nail's direction (the button is only shown once a length is chosen).
  function flipNailDirection() {
    const pixels = photoPixelsRef.current;
    nailFramesRef.current = nailFramesRef.current.map((f, i) => frameFromAxis(nailRegionsRef.current[i], -f.ax, -f.ay));
    nailPosesRef.current = nailFramesRef.current.map((frame) => nailPose(pixels, frame));
    detectionGenRef.current += 1;
    setLengthFlipped((v) => !v);
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
    e.target.value = ''; // so picking the same file again still counts as a change
    if (f) processFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }

  function applyColor(hex) {
    if (detectingRef.current) {
      showToast('AI กำลังหาตำแหน่งเล็บ รอสักครู่แล้วค่อยเลือกสี');
      return;
    }
    if (nailRegionsRef.current.length === 0) {
      // say why (server trouble vs. no nails in the photo) instead of blaming the photo every time
      setErrorText(detectFailureRef.current || 'ยังไม่พบตำแหน่งเล็บในรูปนี้ กรุณาอัปโหลดรูปมือให้เห็นเล็บชัดเจนก่อนเลือกสี');
      return;
    }
    setErrorText(null);
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
    const regions = renderRegionsRef.current.length ? renderRegionsRef.current : nailRegionsRef.current;
    regions.forEach((polygon, i) => {
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
    const data = await postImageForNails(blob, 'skin-photo.jpg');
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

            <div className="section-label">ความยาวเล็บ</div>
            <div className="length-grid">
              {LENGTH_PRESETS.map(({ key, label }, i) => (
                <button
                  key={key}
                  type="button"
                  className={`length-chip ${lengthPreset === key ? 'active' : ''}`}
                  onClick={() => setLengthPreset(key)}
                >
                  <span className="length-preview"><span className={`length-nail len-${i}`} /></span>
                  <span className="length-label">{label}</span>
                </button>
              ))}
            </div>

            {lengthPreset !== 'natural' && (
              <>
                <div className="section-label">ทรงปลายเล็บ</div>
                <div className="shape-grid">
                  {TIP_SHAPES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`shape-chip ${tipShape === key ? 'active' : ''}`}
                      onClick={() => setTipShape(key)}
                    >
                      <span className="shape-preview"><span className={`shape-nail shape-${key}`} /></span>
                      <span className="shape-label">{label}</span>
                    </button>
                  ))}
                </div>
                {hasImage && nailColors.length > 0 && (
                  <button type="button" className={`flip-btn ${lengthFlipped ? 'active' : ''}`} onClick={flipNailDirection}>
                    <Icon.Swap />
                    เล็บที่ต่อชี้ผิดทิศ? กดสลับ
                  </button>
                )}
              </>
            )}

            <div className="section-label">สี</div>
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
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileInputChange} />

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
                  <div className="error-actions">
                    {hasImage && detectFailed && (
                      <button className="btn-primary" type="button" onClick={detectAndRender}>
                        ตรวจจับอีกครั้ง
                      </button>
                    )}
                    <button className="btn-secondary" type="button" onClick={() => { setErrorText(null); fileInputRef.current.click(); }}>
                      เลือกรูปใหม่
                    </button>
                  </div>
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
