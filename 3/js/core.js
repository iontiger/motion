'use strict';
/* ============================================================
   CORE — timing, bright palette, math, text & shape primitives
   ============================================================ */
const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
const BPM = 120, SPB = 60 / BPM;             // 0.5 s per beat, 2 s per bar
const TOTAL_BEATS = 322;                     // 80 bars + 2 beats of ring-out
const DUR = TOTAL_BEATS * SPB;               // 161 s
const TAU = Math.PI * 2;

const C = {
  paper: '#F7F5F0', white: '#FFFFFF',
  ink: '#16204A', inkD: 'rgba(22,32,74,0.62)', inkS: 'rgba(22,32,74,0.38)', inkF: 'rgba(22,32,74,0.10)',
  blue: '#2F5BFF', blueL: '#DCE5FF', sky: '#6EC3FF', skyL: '#DDF1FF',
  coral: '#FF5C3A', coralL: '#FFE2D9',
  yellow: '#FFC22E', yellowL: '#FFF1C4',
  mint: '#10B981', mintL: '#D2F5E7',
  pink: '#FF5FA2', pinkL: '#FFE0EE',
  violet: '#7C5CFF', violetL: '#E9E2FF',
  orange: '#FF8A1F', orangeL: '#FFE8D2',
  teal: '#0EA5B7', tealL: '#D3F3F6',
  red: '#F0384B', redL: '#FFE0E3',
  gray: '#C9CEDB',
};
const SH = 'rgba(22,32,74,0.14)';             // soft navy shadow

/* chapters (shared by scenes + UI) */
const CH = [
  { n: '01', b: 64, e: 96, name: '실적', sub: '숫자는 여전히 강하다', col: C.mint, soft: C.mintL },
  { n: '02', b: 96, e: 136, name: '금리와 FOMC', sub: '10월 동결이 기본 시나리오, 진짜 승부는 12월', col: C.blue, soft: C.blueL },
  { n: '03', b: 136, e: 168, name: '중간선거', sub: '불안은 쌓여도, 끝나면 돈은 돌아온다', col: C.violet, soft: C.violetL },
  { n: '04', b: 168, e: 208, name: '블루웨이브와 데이터센터', sub: '리스크는 진짜지만, 새로운 것도 정당의 문제도 아니다', col: C.orange, soft: C.orangeL },
  { n: '05', b: 208, e: 232, name: '중국', sub: '바닥론에 귀 기울일 때', col: C.red, soft: C.redL },
  { n: '06', b: 232, e: 272, name: '코스피', sub: '배신감은 크지만, 원래 그런 시장이다', col: C.teal, soft: C.tealL },
  { n: '07', b: 272, e: 304, name: '체크할 리스크', sub: '그래도 확인해야 할 것들', col: C.yellow, soft: C.yellowL, ink: true },
];

/* ---------------- math ---------------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const pr = (x, a, b) => clamp((x - a) / (b - a));
const fract = (x) => x - Math.floor(x);
const rnd = (a, b = 0) => fract(Math.sin(a * 127.1 + b * 311.7 + 0.123) * 43758.5453);
const vnoise = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i, s), rnd(i + 1, s), u) * 2 - 1; };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const Ease = {
  lin: (x) => x,
  inQuad: (x) => x * x, outQuad: (x) => 1 - (1 - x) * (1 - x),
  inCubic: (x) => x * x * x, outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
};
// pop-in 0→1 with overshoot
const popE = (B, b0, dur = 0.5, s = 2.2) => { const p = pr(B, b0, b0 + dur); return p <= 0 ? 0 : Ease.outBack(p, s); };
// eased in/out window: 0 before a, 1 between a+din and z-dout, 0 after z
const win = (B, a, z, din = 0.5, dout = 0.5) => Math.min(Ease.outCubic(pr(B, a, a + din)), 1 - Ease.inCubic(pr(B, z - dout, z)));

/* ---------------- fonts (Pretendard only: gothic throughout) ---------------- */
let g = null; // active 2D context (set by engine)
const SANS = '"PretendardV","Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
let _font = '', _ls = 0;
function setFont(size, w = 800, ls = null) {
  const fs = `${w} ${size}px ${SANS}`;
  g.font = fs; _font = fs;
  const l = ls == null ? -size * (w >= 700 ? 0.03 : 0.015) : ls;
  _ls = l;
  g.letterSpacing = l + 'px';
}
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
  if (_LC.size > 6000) _LC.clear();
  _LC.set(key, L);
  return L;
}
function textW(s, size, w = 800, ls = null) { setFont(size, w, ls); return layout(s).w; }

// simple text. o: size,w,ls,align,base,color,alpha
function text(s, x, y, o = {}) {
  setFont(o.size || 40, o.w || 800, o.ls);
  g.textAlign = o.align || 'center';
  g.textBaseline = o.base || 'middle';
  const a0 = g.globalAlpha;
  if (o.alpha != null) g.globalAlpha = a0 * o.alpha;
  if (o.outline) { g.lineJoin = 'round'; g.lineWidth = o.outline; g.strokeStyle = o.ocol || C.white; g.strokeText(s, x, y); }
  g.fillStyle = o.color || C.ink; g.fillText(s, x, y);
  g.globalAlpha = a0;
  return layout(s).w;
}

// per-character renderer. fx(i, n, ch) -> {x,y,s,sy,r,a,c} | false
function chars(s, x, y, o, fx) {
  setFont(o.size, o.w || 800, o.ls);
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
    g.translate(cx + ((t && t.x) || 0), y + ((t && t.y) || 0));
    if (t && t.r) g.rotate(t.r);
    if (sc !== 1 || sy !== 1) g.scale(sc, sy);
    g.globalAlpha = a0 * a;
    g.fillStyle = (t && t.c) || (o.colorFn ? o.colorFn(i, ch) : null) || o.color || C.ink;
    g.fillText(ch, 0, 0);
    g.restore();
  }
  g.letterSpacing = ls + 'px';
  return { x0, w: L.w };
}

// mask-reveal from below, per char stagger
function revealUp(s, x, y, o, B, b0, dur = 0.6, stagger = 0.03) {
  if (B < b0) return 0;
  setFont(o.size, o.w || 800, o.ls);
  const L = layout(s);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.w : x - L.w / 2;
  const sz = o.size;
  g.save();
  g.beginPath(); g.rect(x0 - sz, y - sz * 0.75, L.w + sz * 2, sz * 1.5); g.clip();
  chars(s, x, y, o, (i) => {
    const p = Ease.outExpo(pr(B, b0 + i * stagger, b0 + i * stagger + dur));
    if (p <= 0) return false;
    return { y: (1 - p) * sz * 1.3 };
  });
  g.restore();
  return L.w;
}
// soft rise + fade per char
function rise(s, x, y, o, B, b0, dur = 0.6, stagger = 0.025) {
  if (B < b0) return 0;
  return chars(s, x, y, o, (i) => {
    const p = pr(B, b0 + i * stagger, b0 + i * stagger + dur);
    if (p <= 0) return false;
    const e = Ease.outCubic(p);
    return { y: (1 - e) * o.size * 0.45, a: e };
  }).w;
}
// slam-in: chars drop from big scale
function slam(s, x, y, o, B, b0, dur = 0.35, stagger = 0.05, from = 2.4) {
  if (B < b0) return 0;
  return chars(s, x, y, o, (i) => {
    const lp = pr(B, b0 + i * stagger, b0 + i * stagger + dur);
    if (lp <= 0) return false;
    return { s: lerp(from, 1, Ease.outExpo(lp)), a: Math.min(1, lp * 5) };
  }).w;
}
// pop: chars scale from 0 with back ease
function popChars(s, x, y, o, B, b0, dur = 0.45, stagger = 0.04) {
  if (B < b0) return 0;
  return chars(s, x, y, o, (i) => {
    const lp = pr(B, b0 + i * stagger, b0 + i * stagger + dur);
    if (lp <= 0) return false;
    return { s: Ease.outBack(lp, 2.2), a: Math.min(1, lp * 4) };
  }).w;
}
// shaky text that locks still at bLock (the "흔들리지 말자" motif)
function shaky(s, x, y, o, B, b0, bLock, amp = 1) {
  return chars(s, x, y, o, (i) => {
    const p = pr(B, b0 + i * 0.03, b0 + i * 0.03 + 0.35);
    if (p <= 0) return false;
    const k = B < bLock ? 1 : Math.exp(-(B - bLock) * SPB * 30);
    const a = amp * k * o.size;
    const tt = B * SPB;
    return {
      x: vnoise(tt * 18 + i * 3.1, 1) * a * 0.06,
      y: vnoise(tt * 18 + i * 2.3, 2) * a * 0.08 + (1 - Ease.outCubic(p)) * o.size * 0.4,
      r: vnoise(tt * 14 + i * 1.7, 3) * 0.12 * amp * k,
      a: Ease.outCubic(p),
    };
  }).w;
}

// fixed-width digit text (for counters). returns width
const _DW = new Map();
function numText(s, x, y, o) {
  setFont(o.size, o.w || 800, o.ls != null ? o.ls : -o.size * 0.02);
  const key = _font;
  let dw = _DW.get(key);
  if (!dw) { g.letterSpacing = '0px'; dw = Math.max(...'0123456789'.split('').map((d) => g.measureText(d).width)); _DW.set(key, dw); }
  const ls = _ls;
  g.letterSpacing = '0px';
  const ws = [];
  let tot = 0;
  for (const ch of s) { const w = /[0-9]/.test(ch) ? dw : g.measureText(ch).width; ws.push(w); tot += w + ls; }
  tot -= ls;
  if (o.measure) { g.letterSpacing = ls + 'px'; return tot; }
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - tot : x - tot / 2;
  g.textAlign = 'center';
  g.textBaseline = o.base || 'alphabetic';
  g.fillStyle = o.color || C.ink;
  const a0 = g.globalAlpha;
  if (o.alpha != null) g.globalAlpha = a0 * o.alpha;
  let i = 0;
  for (const ch of s) { g.fillText(ch, cx + ws[i] / 2, y); cx += ws[i] + ls; i++; }
  g.globalAlpha = a0;
  g.letterSpacing = ls + 'px';
  return tot;
}
// number + unit, baseline aligned. returns total width
function numUnit(num, unit, x, y, o) {
  const ns = o.size, us = o.unitSize || ns * 0.4, gap = o.gap != null ? o.gap : ns * 0.05;
  const nw = numText(num, 0, 0, { size: ns, w: o.w || 900, measure: true });
  const uw = unit ? textW(unit, us, o.uw || 800) : 0;
  const tot = nw + (unit ? gap + uw : 0);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - tot : x - tot / 2;
  numText(num, x0, y, { size: ns, w: o.w || 900, align: 'left', color: o.color, alpha: o.alpha });
  if (unit) text(unit, x0 + nw + gap, y, { size: us, w: o.uw || 800, align: 'left', base: 'alphabetic', color: o.unitColor || o.color, alpha: o.alpha });
  return tot;
}
const fmt = (n, d = 0) => (d ? n.toFixed(d) : Math.round(n).toLocaleString('en-US'));

// colorFn that highlights substrings
function hl(str, subs, col) {
  const marks = new Array(str.length).fill(false);
  for (const sub of [].concat(subs)) { const i = str.indexOf(sub); if (i >= 0) for (let k = i; k < i + sub.length; k++) marks[k] = true; }
  return (i) => (marks[i] ? col : null);
}
// x-range of a substring inside a laid-out string (for underlines / markers)
function subRange(str, sub, x, o) {
  setFont(o.size, o.w || 800, o.ls);
  const L = layout(str), i = str.indexOf(sub);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.w : x - L.w / 2;
  if (i < 0) return [x0, x0 + L.w];
  const j = i + sub.length - 1;
  return [x0 + L.xs[i], x0 + L.xs[j] + L.ws[j] - _ls];
}

/* ---------------- shapes ---------------- */
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function fillAll(col) { g.fillStyle = col; g.fillRect(-400, -400, W + 800, H + 800); }
function circle(x, y, r, col) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); g.fillStyle = col; g.fill(); }
function line(x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function arcStroke(x, y, r, a0, a1, col, lw, cap = 'round') { g.beginPath(); g.arc(x, y, r, a0, a1); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = cap; g.stroke(); g.lineCap = 'butt'; }

// white card with soft shadow
function panel(x, y, w, h, o = {}) {
  const r = o.r != null ? o.r : 28;
  g.fillStyle = o.sh || SH; rr(x, y + (o.lift != null ? o.lift : 10), w, h, r); g.fill();
  g.fillStyle = o.fill || C.white; rr(x, y, w, h, r); g.fill();
  if (o.stroke) { g.lineWidth = o.lw || 3; g.strokeStyle = o.stroke; rr(x, y, w, h, r); g.stroke(); }
}
// scale-in transform helper around a pivot; returns false if invisible
function scaled(px, py, s, fn) {
  if (s <= 0.001) return;
  g.save(); g.translate(px, py); g.scale(s, s); g.translate(-px, -py); fn(); g.restore();
}

// draw polyline up to fraction p; returns head point
function polyPartial(pts, p, stroke = true) {
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
    else { const f = l > 0 ? rem / l : 0; head = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; g.lineTo(head[0], head[1]); break; }
  }
  if (stroke) g.stroke();
  return head;
}
// polyline head index by x (for line charts where x is monotonic)
function polyUpToX(pts, xMax) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] <= xMax) out.push(pts[i]);
    else { const a = pts[i - 1], b = pts[i], f = (xMax - a[0]) / (b[0] - a[0]); out.push([xMax, lerp(a[1], b[1], f)]); break; }
  }
  return out;
}

// pill / chip label. o: size,w,fill,color,align,padX,dot,stroke,h
function pill(s, x, y, o = {}) {
  const size = o.size || 30;
  setFont(size, o.w || 700, o.ls);
  const L = layout(s);
  const padX = o.padX != null ? o.padX : size * 0.75, h = o.h || size * 1.8;
  const dotW = o.dot ? size * 0.85 : 0;
  const w = L.w + padX * 2 + dotW;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  if (o.shadow) { g.fillStyle = o.shadow === true ? SH : o.shadow; rr(x0, y - h / 2 + 5, w, h, h / 2); g.fill(); }
  rr(x0, y - h / 2, w, h, h / 2);
  if (o.fill !== false) { g.fillStyle = o.fill || C.white; g.fill(); }
  if (o.stroke) { g.lineWidth = o.lw || 3; g.strokeStyle = o.stroke; g.stroke(); }
  if (o.dot) circle(x0 + padX + size * 0.22, y, size * 0.22, o.dot);
  text(s, x0 + padX + dotW, y + 1, { size, w: o.w || 700, ls: o.ls, color: o.color || C.ink, align: 'left' });
  return w;
}

// geometric confetti burst (deterministic)
function confetti(B, b0, x, y, o = {}) {
  const dt = (B - b0) * SPB, life = o.life || 1.4;
  if (dt < 0 || dt > life) return;
  const n = o.n || 40, seed = o.seed || 1, k = o.drag || 2.8;
  const cols = o.cols || [C.blue, C.yellow, C.coral, C.mint, C.pink, C.violet, C.sky];
  const a0 = g.globalAlpha;
  for (let i = 0; i < n; i++) {
    const a = o.a0 != null ? o.a0 + (rnd(i, seed) - 0.5) * (o.spread || TAU) : rnd(i, seed) * TAU;
    const sp = lerp(o.v0 || 400, o.v1 || 1500, Math.pow(rnd(i, seed + 1), 1.4));
    const d = (sp * (1 - Math.exp(-k * dt))) / k;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + (o.grav || 420) * dt * dt;
    const lf = dt / (life * lerp(0.55, 1, rnd(i, seed + 3)));
    if (lf >= 1) continue;
    const sz = lerp(o.s0 || 8, o.s1 || 20, rnd(i, seed + 2));
    g.globalAlpha = a0 * Math.min(1, (1 - lf) * 1.8);
    const col = cols[i % cols.length], rot = dt * (3 + rnd(i, seed + 4) * 6) + i;
    g.save(); g.translate(px, py); g.rotate(rot);
    const kind = i % 4;
    if (kind === 0) { g.fillStyle = col; g.fillRect(-sz * 0.5, -sz * 0.22, sz, sz * 0.44); }
    else if (kind === 1) circle(0, 0, sz * 0.38, col);
    else if (kind === 2) { g.fillStyle = col; g.beginPath(); g.moveTo(0, -sz * 0.5); g.lineTo(sz * 0.45, sz * 0.35); g.lineTo(-sz * 0.45, sz * 0.35); g.closePath(); g.fill(); }
    else { g.strokeStyle = col; g.lineWidth = sz * 0.22; g.beginPath(); g.arc(0, 0, sz * 0.36, 0, TAU); g.stroke(); }
    g.restore();
  }
  g.globalAlpha = a0;
}
// expanding ring
function ring(B, b0, x, y, o = {}) {
  const dt = (B - b0) * SPB, life = o.life || 0.8;
  if (dt < 0 || dt > life) return;
  const p = dt / life, a0 = g.globalAlpha;
  const r = (o.r0 || 20) + (o.r || 500) * Ease.outCubic(p);
  g.globalAlpha = a0 * (1 - p) * (o.alpha || 0.8);
  g.strokeStyle = o.col || C.white;
  g.lineWidth = (o.lw || 10) * (1 - p) + 1;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.globalAlpha = a0;
}

// icons -------------------------------------------------------
function checkMark(x, y, s, col, p = 1, lw = null) {
  if (p <= 0) return;
  g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
  g.strokeStyle = col; g.lineWidth = lw || 7; g.lineCap = 'round'; g.lineJoin = 'round';
  polyPartial([[-14, 1], [-4, 11], [15, -10]], p);
  g.restore(); g.lineCap = 'butt'; g.lineJoin = 'miter';
}
function crossMark(x, y, s, col, p = 1) {
  if (p <= 0) return;
  g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
  g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round';
  const a = clamp(p * 2), b = clamp(p * 2 - 1);
  if (a > 0) line(-12, -12, -12 + 24 * a, -12 + 24 * a);
  if (b > 0) line(12, -12, 12 - 24 * b, -12 + 24 * b);
  g.restore(); g.lineCap = 'butt';
}
function arrow(x1, y1, x2, y2, col, lw = 8, head = 22, p = 1) {
  if (p <= 0) return;
  const ex = lerp(x1, x2, p), ey = lerp(y1, y2, p), a = Math.atan2(y2 - y1, x2 - x1);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw; g.lineCap = 'round';
  line(x1, y1, ex - Math.cos(a) * head * 0.6, ey - Math.sin(a) * head * 0.6);
  g.beginPath(); g.moveTo(ex, ey);
  g.lineTo(ex - Math.cos(a - 0.5) * head, ey - Math.sin(a - 0.5) * head);
  g.lineTo(ex - Math.cos(a + 0.5) * head, ey - Math.sin(a + 0.5) * head);
  g.closePath(); g.fill(); g.lineCap = 'butt';
}
function plusSign(x, y, s, col, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col;
  g.fillRect(-s / 2, -s / 7, s, (s * 2) / 7); g.fillRect(-s / 7, -s / 2, (s * 2) / 7, s);
  g.restore();
}
// person glyph (head + shoulders)
function person(x, y, s, col) {
  circle(x, y - s * 0.32, s * 0.24, col);
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y + s * 0.38, s * 0.42, s * 0.34, 0, Math.PI, TAU); g.fill();
}
// donut / ring gauge. p = 0..1
function donut(x, y, r, lw, p, col, bg = C.inkF, a0 = -Math.PI / 2) {
  arcStroke(x, y, r, 0, TAU, bg, lw, 'butt');
  if (p > 0.001) arcStroke(x, y, r, a0, a0 + TAU * p, col, lw, 'round');
}
// semicircle gauge with needle. p = 0..1
function gauge(x, y, r, p, col, o = {}) {
  arcStroke(x, y, r, Math.PI, TAU, o.bg || C.inkF, o.lw || 46, 'round');
  if (p > 0.001) arcStroke(x, y, r, Math.PI, Math.PI + Math.PI * p, col, o.lw || 46, 'round');
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI + (Math.PI * k) / 10, r1 = r - (o.lw || 46) / 2 - 16, r2 = r1 - (k % 5 ? 12 : 24);
    g.strokeStyle = C.inkS; g.lineWidth = k % 5 ? 3 : 5;
    line(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * r2, y + Math.sin(a) * r2);
  }
  const a = Math.PI + Math.PI * p;
  g.strokeStyle = C.ink; g.lineWidth = 10; g.lineCap = 'round';
  line(x, y, x + Math.cos(a) * (r - 70), y + Math.sin(a) * (r - 70));
  g.lineCap = 'butt';
  circle(x, y, 20, C.ink); circle(x, y, 8, C.white);
}
