'use strict';
/* ============================================================
   CORE — timing, palette, math, text & shape primitives
   ============================================================ */
const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
const BPM = 96.5004, SPB = 60 / BPM;          // song tempo (beat grid fitted to the drums)
const BEAT0 = 0.730;                          // time of beat 0 (a downbeat)
const DUR = 119.48;                           // length of audio/song.mp3 as decoded
const TAU = Math.PI * 2;

// KADA logo letters (K blue, A pink, D yellow, A teal) + the poster's navy, ice and title teal
const C = {
  white: '#FFFFFF', black: '#000000', ink: '#13264F', paper: '#F2F6FB',
  k: '#2C6A9C', a: '#D44C7C', d: '#E4B43C', a2: '#3C9C8C',
  navy: '#13264F', blue: '#2A64B0', sky: '#7FB2E8', teal: '#0E8C8C', purple: '#6B44A8', ice: '#E3EDF8',
  red: '#D44C7C', yellow: '#E4B43C', pink: '#D44C7C', mint: '#3C9C8C',
};
const KADA4 = [C.k, C.a, C.d, C.a2];

/* ---------------- beat sync helpers ---------------- */
function lastBefore(arr, t) {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
  return ans;
}
function env(arr, t, k = 10) { const i = lastBefore(arr, t); if (i < 0) return 0; return Math.exp(-(t - arr[i]) * k); }
// per-frame RMS energy (0..1) for visuals
function analyzeEnergy(buf, fps = 60) {
  const sr = buf.sampleRate, hop = Math.floor(sr / fps);
  const L = buf.getChannelData(0), Rr = buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0);
  const n = Math.ceil(L.length / hop), out = new Float32Array(n);
  let mx = 0;
  for (let f = 0; f < n; f++) {
    let s = 0; const a = f * hop, b = Math.min(L.length, a + hop);
    for (let i = a; i < b; i++) { const m = (L[i] + Rr[i]) * 0.5; s += m * m; }
    out[f] = Math.sqrt(s / Math.max(1, b - a)); if (out[f] > mx) mx = out[f];
  }
  for (let f = 0; f < n; f++) out[f] /= mx || 1;
  return out;
}

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

/* ---------------- fonts: Pretendard (body), Black Han Sans (display), Nanum Myeongjo (serif), Anton (latin/numbers) ---------------- */
let g = null; // active 2D context (set by engine)
const SANS = '"PretendardV","Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
const DISP = '"BlackHanSans",' + SANS;
const SERIF = '"NanumMyeongjoEB","Nanum Myeongjo",serif';
const NUMF = '"Anton","BlackHanSans",' + SANS;
const FONTS = { disp: (s) => `400 ${s}px ${DISP}`, num: (s) => `400 ${s}px ${NUMF}`, serif: (s) => `800 ${s}px ${SERIF}` };
let _font = '', _ls = 0;
function setFont(size, w = 800, ls = null, f = null) {
  const fs = FONTS[f] ? FONTS[f](size) : `${w} ${size}px ${SANS}`;
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
function textW(s, size, w = 800, ls = null, f = null) { setFont(size, w, ls, f); return layout(s).w; }

// simple text. o: size,w,ls,align,base,color,alpha
function text(s, x, y, o = {}) {
  setFont(o.size || 40, o.w || 800, o.ls, o.f);
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
  setFont(o.size, o.w || 800, o.ls, o.f);
  const L = layout(s);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.w : x - L.w / 2;
  const ls = _ls;
  g.letterSpacing = '0px';
  g.textAlign = 'center';
  g.textBaseline = o.base || 'middle';
  const a0 = g.globalAlpha;
  const grad = o.grad ? (() => { const gr = g.createLinearGradient(0, -o.size * 0.42, 0, o.size * 0.42); o.grad.forEach((c, k) => gr.addColorStop(k / (o.grad.length - 1), c)); return gr; })() : null;
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
    if (o.ext) { g.fillStyle = o.ext.col; for (let k = o.ext.n; k >= 1; k--) g.fillText(ch, k * o.ext.dx, k * o.ext.dy); }
    if (o.rgb) {
      const d = o.rgb * ((t && t.rgb) != null ? t.rgb : 1);
      if (d > 0.3) { g.globalAlpha = a0 * a * 0.85; g.fillStyle = C.mint; g.fillText(ch, -d, 0); g.fillStyle = C.pink; g.fillText(ch, d, 0); g.globalAlpha = a0 * a; }
    }
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || 34; }
    g.fillStyle = (t && t.c) || (o.colorFn ? o.colorFn(i, ch) : null) || grad || o.color || C.ink;
    g.fillText(ch, 0, 0);
    if (o.stroke) { g.shadowBlur = 0; g.lineJoin = 'round'; g.lineWidth = o.sw || 3; g.strokeStyle = o.stroke; g.strokeText(ch, 0, 0); }
    g.restore();
  }
  g.letterSpacing = ls + 'px';
  return { x0, w: L.w };
}

// mask-reveal from below, per char stagger
function revealUp(s, x, y, o, B, b0, dur = 0.6, stagger = 0.03) {
  if (B < b0) return 0;
  setFont(o.size, o.w || 800, o.ls, o.f);
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
// fixed-width digit text (for counters). returns width
const _DW = new Map();
function numText(s, x, y, o) {
  setFont(o.size, o.w || 800, o.ls != null ? o.ls : -o.size * 0.02, o.f);
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
  const nw = numText(num, 0, 0, { size: ns, w: o.w || 900, f: o.f, measure: true });
  const uw = unit ? textW(unit, us, o.uw || 800, null, o.uf) : 0;
  const tot = nw + (unit ? gap + uw : 0);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - tot : x - tot / 2;
  numText(num, x0, y, { size: ns, w: o.w || 900, f: o.f, align: 'left', color: o.color, alpha: o.alpha });
  if (unit) text(unit, x0 + nw + gap, y, { size: us, w: o.uw || 800, f: o.uf, align: 'left', base: 'alphabetic', color: o.unitColor || o.color, alpha: o.alpha });
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
  setFont(o.size, o.w || 800, o.ls, o.f);
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

// scale transform around a pivot
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
// geometric confetti burst (deterministic)
function confetti(B, b0, x, y, o = {}) {
  const dt = (B - b0) * SPB, life = o.life || 1.4;
  if (dt < 0 || dt > life) return;
  const n = o.n || 40, seed = o.seed || 1, k = o.drag || 2.8;
  const cols = o.cols || [C.k, C.a, C.d, C.a2, C.sky];
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
