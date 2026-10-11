'use strict';
/* ============================================================
   CORE — timing, palette, data, math, drawing primitives
   ============================================================ */
const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
const BPM = 128, SPB = 60 / BPM;            // seconds per beat
const TOTAL_BEATS = 172;                     // 43 bars
const DUR = TOTAL_BEATS * SPB;               // 80.625 s
const TAU = Math.PI * 2;

const C = {
  bg0: '#04060D', bg1: '#0A1430',
  ink: '#F4F1EA', inkD: 'rgba(244,241,234,0.58)', inkF: 'rgba(244,241,234,0.16)',
  black: '#07080C',
  orange: '#FF5A1F', orange2: '#FF8A3D',
  red: '#FF3352', blue: '#3A72FF', cyan: '#45D6FF',
  gold: '#FFC53D', mint: '#22D98F', navy: '#0B1B4A',
};

/* ---------------- DATA (2026.10.08 종가 기준, 사용자 제공) ---------------- */
const D = {
  name: '현대해상', code: '001450', price: 46900,
  per: 3.6, pbr: 0.57, perPct: 14, pbrPct: 38,
  roe: [7.38, 15.75, 20.60], roePct: 6,
  ni: [5744, 8505, 10198, 11495], years: ['2023', '2024', '2025', '2026E'],
  eps: [6426, 13025],
  ret6m: 54.0, hi52: 54700, lo52: 26100,
  foreign: [['10/1', 40895], ['10/2', 77005], ['10/6', 52682], ['10/7', 64003], ['10/8', 47291]],
  inst: [-48950, -38160, -44952, -32239, -47085],
  own: 39.58, div2023: 2063,
  scores: [['가치', 14.8, 25], ['수익성', 16.4, 20], ['성장성', 7.6, 15], ['추세', 17.3, 20], ['수급', 4.9, 10], ['타이밍', 2, 10], ['감점', -3, 0]],
  reports: [
    ['놀라운 변화!', '대신증권', '2026.08.19'],
    ['NDR 후기 – 해준금 제도 완화의 최대 수혜주', '하나증권', '2026.08.24'],
    ['잠재적인 가능성으로는 가장 높은 매력', 'iM증권', '2026.08.25'],
  ],
};

/* ---------------- math ---------------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const pr = (x, a, b) => clamp((x - a) / (b - a));
const fract = (x) => x - Math.floor(x);
const rnd = (a, b = 0) => fract(Math.sin(a * 127.1 + b * 311.7 + 0.123) * 43758.5453);
const vnoise = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i, s), rnd(i + 1, s), u) * 2 - 1; };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const fmt = (n) => Math.round(n).toLocaleString('en-US');

const Ease = {
  lin: (x) => x,
  inQuad: (x) => x * x, outQuad: (x) => 1 - (1 - x) * (1 - x),
  inCubic: (x) => x * x * x, outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x) => 1 - Math.pow(1 - x, 4), inQuart: (x) => x * x * x * x,
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1),
};

/* ---------------- candle data (90 거래일, 스크린샷 형태 재구성) ---------------- */
const CANDLES = (() => {
  const A = [[0, 35200], [2, 34300], [4, 34500], [6, 35000], [7, 34600], [8, 37800], [10, 39500], [12, 41800], [13, 42400], [14, 41000], [15, 40400], [17, 37500], [19, 35900], [21, 34500], [22, 35000], [24, 35400], [26, 36600], [28, 37600], [30, 37200], [32, 38200], [33, 36800], [35, 38100], [37, 37600], [39, 40800], [40, 41600], [41, 39800], [42, 40200], [44, 38700], [45, 40800], [46, 39200], [47, 38200], [48, 37500], [49, 36900], [50, 37400], [52, 38900], [53, 39700], [54, 41500], [55, 43200], [56, 42000], [57, 43100], [58, 44800], [59, 48100], [60, 49300], [61, 48600], [62, 49200], [63, 48900], [64, 49800], [65, 50300], [66, 50700], [67, 48600], [68, 51500], [69, 52100], [70, 53000], [71, 52400], [72, 50600], [73, 50400], [74, 49900], [75, 49100], [76, 50700], [77, 50200], [78, 49000], [79, 48300], [80, 49200], [81, 48600], [82, 47800], [83, 48300], [84, 47900], [85, 47400], [86, 47650], [87, 46800], [88, 48050], [89, 46900]];
  const R = mulberry32(1450);
  const close = [];
  for (let d = 0; d < 90; d++) {
    let k = 0; while (k < A.length - 1 && A[k + 1][0] <= d) k++;
    const [d0, v0] = A[k], [d1, v1] = A[Math.min(k + 1, A.length - 1)];
    const exact = d === d0;
    const v = exact ? v0 : lerp(v0, v1, (d - d0) / (d1 - d0)) * (1 + (R() - 0.5) * 0.012);
    close.push(Math.round(v / 50) * 50);
  }
  const out = [];
  for (let d = 0; d < 90; d++) {
    const c = close[d];
    const o = d === 0 ? c * 0.995 : Math.round(close[d - 1] * (1 + (R() - 0.5) * 0.012) / 50) * 50;
    const span = c * (0.006 + R() * 0.014);
    let h = Math.max(o, c) + span * R(), l = Math.min(o, c) - span * R();
    if (d === 70) h = 54700;
    out.push({ o, h: Math.round(h / 50) * 50, l: Math.round(l / 50) * 50, c });
  }
  return out;
})();

/* ---------------- canvas helpers ---------------- */
let g = null; // active 2D context (set by engine)
const SANS = '"PretendardV","Pretendard Variable","Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,monospace';

let _font = '', _ls = 0;
function setFont(size, w = 800, mono = false, ls = null) {
  const f = `${w} ${size}px ${mono ? MONO : SANS}`;
  g.font = f; _font = f;
  const l = ls == null ? (mono ? 0 : -size * 0.025) : ls;
  _ls = l;
  g.letterSpacing = l + 'px';
}
function resetFontCache() { _font = ''; }

const _LC = new Map();
function layout(s) {
  const key = _font + '|' + _ls + '|' + s;
  let L = _LC.get(key);
  if (L) return L;
  const xs = [], ws = [];
  let prev = 0;
  for (let i = 0; i < s.length; i++) {
    const w = g.measureText(s.slice(0, i + 1)).width;
    xs.push(prev); ws.push(w - prev); prev = w;
  }
  L = { xs, ws, w: prev - _ls };
  if (_LC.size > 4000) _LC.clear();
  _LC.set(key, L);
  return L;
}
function textW(s, size, w = 800, mono = false, ls = null) { setFont(size, w, mono, ls); return layout(s).w; }

// simple text
function text(s, x, y, o = {}) {
  setFont(o.size || 40, o.w || 800, o.mono, o.ls);
  g.textAlign = o.align || 'center';
  g.textBaseline = o.base || 'middle';
  const a0 = g.globalAlpha;
  if (o.alpha != null) g.globalAlpha = a0 * o.alpha;
  if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.color || C.ink; g.strokeText(s, x, y); }
  else { g.fillStyle = o.color || C.ink; g.fillText(s, x, y); }
  g.globalAlpha = a0;
  return layout(s).w;
}

// per-character renderer. fx(i, n, ch) -> {x,y,s,sy,r,a,c} | false
function chars(s, x, y, o, fx) {
  setFont(o.size, o.w || 900, o.mono, o.ls);
  const L = layout(s);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.w : x - L.w / 2;
  const ls = _ls;
  g.letterSpacing = '0px';
  g.textAlign = 'center';
  g.textBaseline = o.base || 'middle';
  const a0 = g.globalAlpha;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ' ') continue;
    const t = fx ? fx(i, s.length, ch) : null;
    if (t === false) continue;
    const cx = x0 + L.xs[i] + (L.ws[i] - ls) / 2;
    const sc = t && t.s != null ? t.s : 1;
    const sy = t && t.sy != null ? t.sy : sc;
    const a = (o.alpha != null ? o.alpha : 1) * (t && t.a != null ? t.a : 1);
    if (a <= 0.001 || sc <= 0.001) continue;
    g.save();
    g.translate(cx + (t && t.x || 0), y + (t && t.y || 0));
    if (t && t.r) g.rotate(t.r);
    if (sc !== 1 || sy !== 1) g.scale(sc, sy);
    g.globalAlpha = a0 * a;
    const col = (t && t.c) || (o.colorFn ? o.colorFn(i, ch) : null) || o.color || C.ink;
    if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = col; g.strokeText(ch, 0, 0); }
    else { g.fillStyle = col; g.fillText(ch, 0, 0); }
    g.restore();
  }
  g.letterSpacing = ls + 'px';
  return { x0, w: L.w };
}

// mask-reveal from below, per char stagger
function revealUp(s, x, y, o, B, b0, dur = 0.6, stagger = 0.035) {
  if (B < b0) return 0;
  setFont(o.size, o.w || 900, o.mono, o.ls);
  const L = layout(s);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.w : x - L.w / 2;
  const sz = o.size;
  g.save();
  g.beginPath();
  g.rect(x0 - sz, y - sz * 0.72, L.w + sz * 2, sz * 1.44);
  g.clip();
  chars(s, x, y, o, (i) => {
    const p = Ease.outExpo(pr(B, b0 + i * stagger, b0 + i * stagger + dur));
    if (p <= 0) return false;
    return { y: (1 - p) * sz * 1.25 };
  });
  g.restore();
  return L.w;
}

// slam-in: chars fall from big scale with ghost trail
function slam(s, x, y, o, B, b0, dur = 0.38, stagger = 0.06, from = 2.6) {
  const fx = (ghost) => (i) => {
    const lp = pr(B, b0 + i * stagger, b0 + i * stagger + dur);
    if (lp <= 0) return false;
    const e = Ease.outExpo(lp);
    if (ghost) {
      if (lp > 0.6) return false;
      return { s: lerp(from, 1, e) * 1.18, a: 0.22 * (1 - lp / 0.6) };
    }
    return { s: lerp(from, 1, e), a: Math.min(1, lp * 5) };
  };
  chars(s, x, y, o, fx(true));
  return chars(s, x, y, o, fx(false));
}

// pop: chars scale from 0 with back ease
function pop(s, x, y, o, B, b0, dur = 0.45, stagger = 0.05) {
  return chars(s, x, y, o, (i) => {
    const lp = pr(B, b0 + i * stagger, b0 + i * stagger + dur);
    if (lp <= 0) return false;
    return { s: Ease.outBack(lp, 2.2), a: Math.min(1, lp * 4) };
  });
}

// fixed-width digit text (for counters). returns width
const _DW = new Map();
function numText(s, x, y, o) {
  setFont(o.size, o.w || 900, o.mono, o.ls != null ? o.ls : -o.size * 0.03);
  const key = _font;
  let dw = _DW.get(key);
  if (!dw) { g.letterSpacing = '0px'; dw = Math.max(...'0123456789'.split('').map((d) => g.measureText(d).width)); _DW.set(key, dw); }
  const ls = _ls;
  g.letterSpacing = '0px';
  const ws = [];
  let tot = 0;
  for (const ch of s) {
    const w = /[0-9]/.test(ch) ? dw : g.measureText(ch).width;
    ws.push(w); tot += w + ls;
  }
  tot -= ls;
  if (o.measure) { g.letterSpacing = ls + 'px'; return tot; }
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - tot : x - tot / 2;
  g.textAlign = 'center';
  g.textBaseline = o.base || 'alphabetic';
  g.fillStyle = o.color || C.ink;
  const a0 = g.globalAlpha;
  if (o.alpha != null) g.globalAlpha = a0 * o.alpha;
  let i = 0;
  for (const ch of s) {
    g.fillText(ch, cx + ws[i] / 2, y);
    cx += ws[i] + ls; i++;
  }
  g.globalAlpha = a0;
  g.letterSpacing = ls + 'px';
  return tot;
}

// scramble string toward target
const HANG = '가나다라마바사아자차카타파하현대해상순이익배당성장추세';
function scramble(s, B, b0, dur, rate = 16) {
  const p = pr(B, b0, b0 + dur);
  if (p >= 1) return s;
  const lock = Math.floor(p * s.length);
  const tick = Math.floor(B * rate);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (i < lock || ' .,%+-·/×'.includes(ch)) out += ch;
    else if (/[0-9]/.test(ch)) out += String(Math.floor(rnd(i, tick) * 10));
    else if (/[가-힣]/.test(ch)) out += HANG[Math.floor(rnd(i, tick + 9) * HANG.length)];
    else out += ch;
  }
  return out;
}

/* ---------------- shapes ---------------- */
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function fillAll(col) { g.fillStyle = col; g.fillRect(-300, -300, W + 600, H + 600); }
function line(x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

// draw polyline up to fraction p; returns head point
function polyPartial(pts, p) {
  let total = 0;
  const segs = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
  let rem = total * clamp(p);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  let head = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const l = segs[i - 1];
    if (rem >= l) { g.lineTo(pts[i][0], pts[i][1]); head = pts[i]; rem -= l; }
    else { const f = rem / l; head = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; g.lineTo(head[0], head[1]); break; }
  }
  g.stroke();
  return head;
}

// rounded-rect outline drawn on progressively (perimeter fraction)
function rectDraw(x, y, w, h, p) {
  const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  return polyPartial(pts, p);
}

// pill label
function pill(s, x, y, o, alpha = 1) {
  setFont(o.size || 28, o.w || 700, o.mono, o.ls);
  const L = layout(s);
  const padX = o.padX || (o.size || 28) * 0.7, h = (o.size || 28) * 1.8;
  const w = L.w + padX * 2;
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * alpha;
  rr(x0, y - h / 2, w, h, h / 2);
  if (o.fill) { g.fillStyle = o.fill; g.fill(); }
  if (o.strokeCol) { g.lineWidth = 2; g.strokeStyle = o.strokeCol; g.stroke(); }
  text(s, x0 + w / 2, y + 1, { size: o.size || 28, w: o.w || 700, mono: o.mono, ls: o.ls, color: o.color || C.ink });
  g.globalAlpha = a0;
  return w;
}

// deterministic particle burst
function burst(B, b0, x, y, o) {
  const dt = (B - b0) * SPB;
  const life = o.life || 1.2;
  if (dt < 0 || dt > life) return;
  const n = o.n || 60, seed = o.seed || 1, k = o.drag || 3.2;
  const cols = o.cols || [C.orange, C.ink, C.gold];
  for (let i = 0; i < n; i++) {
    const a = (o.a0 != null ? o.a0 + (rnd(i, seed) - 0.5) * (o.spread || TAU) : rnd(i, seed) * TAU);
    const sp = lerp(o.v0 || 300, o.v1 || 1600, Math.pow(rnd(i, seed + 1), 1.6));
    const d = sp * (1 - Math.exp(-k * dt)) / k;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + (o.grav || 300) * dt * dt;
    const lf = dt / (life * lerp(0.5, 1, rnd(i, seed + 3)));
    if (lf >= 1) continue;
    const vv = sp * Math.exp(-k * dt);
    const len = Math.max(2, vv * 0.018) * (o.streak || 1);
    const sz = lerp(o.s0 || 2, o.s1 || 6, rnd(i, seed + 2));
    g.globalAlpha = (1 - lf) * (o.alpha || 1);
    g.strokeStyle = cols[i % cols.length];
    g.lineWidth = sz * (1 - lf * 0.6);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px - Math.cos(a) * len, py - Math.sin(a) * len);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.lineCap = 'butt';
}

function ring(B, b0, x, y, o = {}) {
  const dt = (B - b0) * SPB, life = o.life || 0.9;
  if (dt < 0 || dt > life) return;
  const p = dt / life;
  const r = (o.r0 || 20) + (o.r || 900) * Ease.outExpo(p);
  g.globalAlpha = (1 - p) * (o.alpha || 0.9);
  g.strokeStyle = o.col || C.ink;
  g.lineWidth = (o.lw || 10) * (1 - p) + 0.5;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.globalAlpha = 1;
}

// stamp: rotated bordered word that slams in
function stamp(s, x, y, B, b0, o = {}) {
  const lp = pr(B, b0, b0 + 0.35);
  if (lp <= 0) return;
  const e = Ease.outExpo(lp);
  const sc = lerp(2.4, 1, e);
  setFont(o.size || 90, 900);
  const w = layout(s).w + (o.size || 90) * 0.8, h = (o.size || 90) * 1.45;
  g.save();
  g.translate(x, y); g.rotate(o.rot != null ? o.rot : -0.16); g.scale(sc, sc);
  g.globalAlpha = Math.min(1, lp * 4) * (o.alpha != null ? o.alpha : 1);
  g.lineWidth = (o.size || 90) * 0.08;
  g.strokeStyle = o.col || C.red;
  rr(-w / 2, -h / 2, w, h, 14); g.stroke();
  text(s, 0, 4, { size: o.size || 90, w: 900, color: o.col || C.red });
  g.restore();
}

// fit a string to a max width; returns font size
function fitSize(s, maxW, maxSize, w = 900) {
  const ww = textW(s, 100, w);
  return Math.min(maxSize, (maxW / ww) * 100);
}

// number + unit group (baseline aligned). returns total width
function numUnit(num, unit, x, y, o) {
  const ns = o.size, us = o.unitSize || ns * 0.36, gap = o.gap != null ? o.gap : ns * 0.04;
  const nw = numText(num, 0, 0, { size: ns, w: o.w || 900, measure: true });
  const uw = unit ? textW(unit, us, o.uw || 900) : 0;
  const tot = nw + (unit ? gap + uw : 0);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - tot : x - tot / 2;
  numText(num, x0, y, { size: ns, w: o.w || 900, align: 'left', color: o.color, alpha: o.alpha });
  if (unit) text(unit, x0 + nw + gap, y, { size: us, w: o.uw || 900, align: 'left', base: 'alphabetic', color: o.unitColor || o.color, alpha: o.alpha });
  return tot;
}
// colorFn that highlights a substring
function hl(str, subs, col) {
  const marks = new Array(str.length).fill(false);
  for (const sub of [].concat(subs)) { const i = str.indexOf(sub); if (i >= 0) for (let k = i; k < i + sub.length; k++) marks[k] = true; }
  return (i) => (marks[i] ? col : null);
}
