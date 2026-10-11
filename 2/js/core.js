'use strict';
/* ============================================================
   CORE — timing, pastel palette, math, text & image primitives
   ============================================================ */
const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
const BPM = 100, SPB = 60 / BPM;             // seconds per beat (0.6 s)
const TOTAL_BEATS = 146;                     // 36 bars + 2 beats of ring-out
const DUR = TOTAL_BEATS * SPB;               // 87.6 s
const TAU = Math.PI * 2;

const C = {
  cream: '#FFF8EF', paper: '#FFFDF8', white: '#FFFFFF',
  ink: '#3E3558', inkD: 'rgba(62,53,88,0.62)', inkF: 'rgba(62,53,88,0.12)',
  pink: '#FFD3E0', pink2: '#FFA8C2', coral: '#FF7E96',
  peach: '#FFDCC4', peach2: '#FFB38A', butter: '#FFEFB0', yellow: '#FFCB57',
  mint: '#C6F1E0', mint2: '#86DDBD', teal: '#36B394',
  sky: '#CFE8FF', sky2: '#93CBFA', blue: '#5B9CE6',
  lav: '#E4DAFF', lav2: '#BCA8FF', purple: '#8C70E0',
  brown: '#6A4630',
};
const SH = 'rgba(96,66,128,0.24)';            // soft plum shadow

/* the four games (shared by scenes + UI) */
const GAMES = [
  { n: '01', name: 'DentPhoto 마을', kind: '3D 산책 · 미니게임', col: C.teal, soft: C.mint, url: 'iontiger.github.io/asset/3d' },
  { n: '02', name: '바람을 따라', kind: '3D 스쿠터 배달', col: '#F08A4B', soft: C.peach, url: 'iontiger.github.io/asset/3d/ride' },
  { n: '03', name: '달빛의 받아치기', kind: '횡스크롤 액션 로그라이트', col: C.purple, soft: C.lav, url: 'iontiger.github.io/Caf' },
  { n: '04', name: '덴포토 치과 경쟁', kind: '턴제 전략', col: C.coral, soft: C.pink, url: 'iontiger.github.io/asset/civil' },
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
  outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1),
};
// bouncy pop-in 0→1 (overshoots)
const popE = (B, b0, dur = 0.5, s = 2.2) => { const p = pr(B, b0, b0 + dur); return p <= 0 ? 0 : Ease.outBack(p, s); };

/* ---------------- fonts ---------------- */
let g = null; // active 2D context (set by engine)
const FONT = {
  kr: '"Jua","PretendardV","Apple SD Gothic Neo","Noto Sans KR",sans-serif',
  sans: '"PretendardV","Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif',
  round: '"Fredoka","Jua","PretendardV",sans-serif',
};
let _font = '', _ls = 0;
function setFont(size, w = 700, f = 'sans', ls = null) {
  const fam = FONT[f] || FONT.sans;
  const fs = `${f === 'kr' ? 400 : w} ${size}px ${fam}`;
  g.font = fs; _font = fs;
  const l = ls == null ? (f === 'round' ? -size * 0.01 : f === 'kr' ? -size * 0.01 : -size * 0.02) : ls;
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
  if (_LC.size > 4000) _LC.clear();
  _LC.set(key, L);
  return L;
}
function textW(s, size, w = 700, f = 'sans', ls = null) { setFont(size, w, f, ls); return layout(s).w; }

// simple text. o: size,w,f,ls,align,base,color,alpha,outline,ocol,shadow
function text(s, x, y, o = {}) {
  setFont(o.size || 40, o.w || 700, o.f, o.ls);
  g.textAlign = o.align || 'center';
  g.textBaseline = o.base || 'middle';
  const a0 = g.globalAlpha;
  if (o.alpha != null) g.globalAlpha = a0 * o.alpha;
  g.lineJoin = 'round';
  if (o.shadow) { g.fillStyle = o.shadow; g.fillText(s, x, y + (o.size || 40) * 0.07); if (o.outline) { g.lineWidth = o.outline; g.strokeStyle = o.shadow; g.strokeText(s, x, y + (o.size || 40) * 0.07); } }
  if (o.outline) { g.lineWidth = o.outline; g.strokeStyle = o.ocol || C.white; g.strokeText(s, x, y); }
  g.fillStyle = o.color || C.ink; g.fillText(s, x, y);
  g.globalAlpha = a0;
  return layout(s).w;
}

// per-character renderer. fx(i, n, ch) -> {x,y,s,sy,r,a,c} | false
function chars(s, x, y, o, fx) {
  setFont(o.size, o.w || 700, o.f, o.ls);
  const L = layout(s);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.w : x - L.w / 2;
  const ls = _ls;
  g.letterSpacing = '0px';
  g.textAlign = 'center';
  g.textBaseline = o.base || 'middle';
  g.lineJoin = 'round';
  const a0 = g.globalAlpha;
  const passes = [];
  if (o.shadow) passes.push('shadow');
  if (o.outline) passes.push('outline');
  passes.push('fill');
  const T = [];
  for (let i = 0; i < s.length; i++) T.push(s[i] === ' ' ? false : fx ? fx(i, s.length, s[i]) : null);
  for (const pass of passes) {
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], t = T[i];
      if (t === false) continue;
      const cx = x0 + L.xs[i] + (L.ws[i] - ls) / 2;
      const sc = t && t.s != null ? t.s : 1;
      const sy = t && t.sy != null ? t.sy : sc;
      const a = (o.alpha != null ? o.alpha : 1) * (t && t.a != null ? t.a : 1);
      if (a <= 0.001 || sc <= 0.001) continue;
      g.save();
      g.translate(cx + ((t && t.x) || 0), y + ((t && t.y) || 0) + (pass === 'shadow' ? o.size * 0.08 : 0));
      if (t && t.r) g.rotate(t.r);
      if (sc !== 1 || sy !== 1) g.scale(sc, sy);
      g.globalAlpha = a0 * a;
      const col = (t && t.c) || (o.colorFn ? o.colorFn(i, ch) : null) || o.color || C.ink;
      if (pass === 'shadow') { g.fillStyle = o.shadow; if (o.outline) { g.lineWidth = o.outline; g.strokeStyle = o.shadow; g.strokeText(ch, 0, 0); } g.fillText(ch, 0, 0); }
      else if (pass === 'outline') { g.lineWidth = o.outline; g.strokeStyle = o.ocol || C.white; g.strokeText(ch, 0, 0); }
      else { g.fillStyle = col; g.fillText(ch, 0, 0); }
      g.restore();
    }
  }
  g.letterSpacing = ls + 'px';
  return { x0, w: L.w };
}

// soft rise + fade per char
function rise(s, x, y, o, B, b0, dur = 0.6, stagger = 0.03) {
  if (B < b0) return 0;
  return chars(s, x, y, o, (i) => {
    const p = pr(B, b0 + i * stagger, b0 + i * stagger + dur);
    if (p <= 0) return false;
    const e = Ease.outCubic(p);
    return { y: (1 - e) * o.size * 0.5, a: e };
  }).w;
}
// bouncy per-char pop (jelly)
function jelly(s, x, y, o, B, b0, dur = 0.5, stagger = 0.06) {
  if (B < b0) return 0;
  return chars(s, x, y, o, (i) => {
    const p = pr(B, b0 + i * stagger, b0 + i * stagger + dur);
    if (p <= 0) return false;
    const e = Ease.outBack(p, 2.6);
    const sq = Math.sin(p * Math.PI) * 0.18;
    return { s: e, sy: e * (1 + sq), y: (1 - Math.min(1, e)) * o.size * 0.4, a: Math.min(1, p * 4) };
  }).w;
}
// typewriter with caret
function typeOn(s, x, y, o, B, b0, cps = 10) {
  if (B < b0) return;
  const n = Math.min(s.length, Math.floor((B - b0) * SPB * cps));
  const caret = n < s.length || Math.floor(B * 2) % 2 === 0 ? '|' : '';
  const w = textW(s, o.size, o.w, o.f, o.ls);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  text(s.slice(0, n), x0, y, Object.assign({}, o, { align: 'left' }));
  const w2 = textW(s.slice(0, n), o.size, o.w, o.f, o.ls);
  if (caret && n < s.length + 1) text(caret, x0 + w2 + 4, y, Object.assign({}, o, { align: 'left', alpha: (o.alpha ?? 1) * 0.7 }));
}

// fixed-width digit text (for counters). returns width
const _DW = new Map();
function numText(s, x, y, o) {
  setFont(o.size, o.w || 700, o.f || 'round', o.ls != null ? o.ls : 0);
  let dw = _DW.get(_font);
  if (!dw) { g.letterSpacing = '0px'; dw = Math.max(...'0123456789'.split('').map((d) => g.measureText(d).width)); _DW.set(_font, dw); }
  g.letterSpacing = '0px';
  const ws = [];
  let tot = 0;
  for (const ch of s) { const w = /[0-9]/.test(ch) ? dw : g.measureText(ch).width; ws.push(w); tot += w; }
  if (o.measure) return tot;
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - tot : x - tot / 2;
  g.textAlign = 'center';
  g.textBaseline = o.base || 'alphabetic';
  g.lineJoin = 'round';
  const a0 = g.globalAlpha;
  if (o.alpha != null) g.globalAlpha = a0 * o.alpha;
  let i = 0;
  for (const ch of s) {
    if (o.outline) { g.lineWidth = o.outline; g.strokeStyle = o.ocol || C.white; g.strokeText(ch, cx + ws[i] / 2, y); }
    g.fillStyle = o.color || C.ink; g.fillText(ch, cx + ws[i] / 2, y);
    cx += ws[i]; i++;
  }
  g.globalAlpha = a0;
  return tot;
}
const fmt = (n, d = 0) => (d ? n.toFixed(d) : Math.round(n).toLocaleString('en-US'));

// colorFn that highlights substrings
function hl(str, subs, col) {
  const marks = new Array(str.length).fill(false);
  for (const sub of [].concat(subs)) { const i = str.indexOf(sub); if (i >= 0) for (let k = i; k < i + sub.length; k++) marks[k] = true; }
  return (i) => (marks[i] ? col : null);
}

/* ---------------- shapes ---------------- */
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function fillAll(col) { g.fillStyle = col; g.fillRect(-400, -400, W + 800, H + 800); }
function circle(x, y, r, col) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); g.fillStyle = col; g.fill(); }

// pill / sticker label. o: size,f,w,fill,color,outline(white border px),align,padX,shadow
function pill(s, x, y, o = {}) {
  const size = o.size || 30;
  setFont(size, o.w || 700, o.f || 'kr', o.ls);
  const L = layout(s);
  const padX = o.padX != null ? o.padX : size * 0.75, h = o.h || size * 1.75;
  const w = L.w + padX * 2 + (o.dot ? size * 0.9 : 0);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  if (o.shadow !== false) { g.fillStyle = o.shadow || SH; rr(x0, y - h / 2 + 6, w, h, h / 2); g.fill(); }
  rr(x0, y - h / 2, w, h, h / 2);
  g.fillStyle = o.fill || C.white; g.fill();
  if (o.border !== 0) { g.lineWidth = o.border || 4; g.strokeStyle = o.bcol || C.white; g.stroke(); }
  let tx = x0 + padX;
  if (o.dot) { circle(x0 + padX + size * 0.25, y, size * 0.22, o.dot); tx += size * 0.9; }
  text(s, tx, y + (o.f === 'sans' ? 1 : 2), { size, w: o.w || 700, f: o.f || 'kr', ls: o.ls, color: o.color || C.ink, align: 'left' });
  return w;
}

// 4-point sparkle
function sparkle(x, y, r, col, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    g.quadraticCurveTo(0, 0, Math.cos(a + TAU / 8) * r * 0.18, Math.sin(a + TAU / 8) * r * 0.18);
    g.quadraticCurveTo(0, 0, Math.cos(a + TAU / 4) * r, Math.sin(a + TAU / 4) * r);
  }
  g.closePath(); g.fillStyle = col; g.fill();
  g.restore();
}
function heart(x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s / 20, s / 20);
  g.beginPath(); g.moveTo(0, 6);
  g.bezierCurveTo(-14, -4, -8, -16, 0, -8); g.bezierCurveTo(8, -16, 14, -4, 0, 6);
  g.fillStyle = col; g.fill(); g.restore();
}
function petal(x, y, s, rot, col) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.7, 0, s); g.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.9, -s * 0.6, 0, -s);
  g.fillStyle = col; g.fill(); g.restore();
}

// soft expanding ring
function ring(B, b0, x, y, o = {}) {
  const dt = (B - b0) * SPB, life = o.life || 0.9;
  if (dt < 0 || dt > life) return;
  const p = dt / life;
  const r = (o.r0 || 20) + (o.r || 600) * Ease.outCubic(p);
  g.globalAlpha = (1 - p) * (o.alpha || 0.8);
  g.strokeStyle = o.col || C.white;
  g.lineWidth = (o.lw || 10) * (1 - p) + 1;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.globalAlpha = 1;
}
// confetti / petal burst (deterministic)
function confetti(B, b0, x, y, o = {}) {
  const dt = (B - b0) * SPB;
  const life = o.life || 1.6;
  if (dt < 0 || dt > life) return;
  const n = o.n || 40, seed = o.seed || 1, k = o.drag || 2.6;
  const cols = o.cols || [C.pink2, C.yellow, C.mint2, C.sky2, C.lav2, C.coral];
  for (let i = 0; i < n; i++) {
    const a = o.a0 != null ? o.a0 + (rnd(i, seed) - 0.5) * (o.spread || TAU) : rnd(i, seed) * TAU;
    const sp = lerp(o.v0 || 300, o.v1 || 1300, Math.pow(rnd(i, seed + 1), 1.4));
    const d = (sp * (1 - Math.exp(-k * dt))) / k;
    const px = x + Math.cos(a) * d + Math.sin(dt * 3 + i) * 12, py = y + Math.sin(a) * d + (o.grav || 380) * dt * dt;
    const lf = dt / (life * lerp(0.6, 1, rnd(i, seed + 3)));
    if (lf >= 1) continue;
    const sz = lerp(o.s0 || 6, o.s1 || 14, rnd(i, seed + 2));
    g.globalAlpha = Math.min(1, (1 - lf) * 1.6);
    const col = cols[i % cols.length], rot = dt * (4 + rnd(i, seed + 4) * 6) + i;
    const kind = i % 3;
    if (kind === 0) petal(px, py, sz * 0.8, rot, col);
    else if (kind === 1) { g.save(); g.translate(px, py); g.rotate(rot); g.fillStyle = col; g.fillRect(-sz * 0.5, -sz * 0.3, sz, sz * 0.6); g.restore(); }
    else circle(px, py, sz * 0.4, col);
  }
  g.globalAlpha = 1;
}

/* ---------------- images ---------------- */
const IMG = {};
const IMG_LIST = [
  'splash.jpg', 'village-real.jpg', 'ride-title.jpg', 'night-title.jpg', 'cliffs.jpg', 'skies.jpg',
  'v-yacht.jpg', 'v-dental.jpg', 'v-rush.jpg', 'v-walk.jpg', 'v-ui.jpg',
  'r-lm5.jpg', 'r-lm4.jpg', 'r-lm6.jpg', 'r-lm7.jpg',
  'c-fight.jpg', 'c-hub.jpg', 'c-act2.jpg', 'c-talk.jpg', 'c-talk2.jpg',
  'civ-map.jpg', 'civ-wide.jpg', 'civ-city.jpg', 'civ-title.jpg',
  'scooter.webp', 'vl-kettle.webp', 'vl-postman.webp', 'vl-mechanic.webp', 'vl-sailor.webp', 'vl-illusionist.webp', 'vl-photographer.webp', 'vl-hero.webp',
];
function loadImages(onProgress = () => {}) {
  let done = 0;
  return Promise.all(IMG_LIST.map((f) => new Promise((res) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { IMG[f.replace(/\.\w+$/, '')] = im; onProgress(++done / IMG_LIST.length); res(); }); };
    im.onerror = () => { console.warn('image failed', f); onProgress(++done / IMG_LIST.length); res(); };
    im.src = 'assets/' + f;
  })));
}
// draw image covering box (x,y,w,h) with zoom and focus point
function drawCover(name, x, y, w, h, zoom = 1, fx = 0.5, fy = 0.5) {
  const im = IMG[name];
  if (!im) { g.fillStyle = C.lav; g.fillRect(x, y, w, h); return; }
  const iw = im.naturalWidth, ih = im.naturalHeight;
  const sc = Math.max(w / iw, h / ih) * zoom;
  const sw = w / sc, sh = h / sc;
  const sx = clamp((iw - sw) * fx, 0, iw - sw), sy = clamp((ih - sh) * fy, 0, ih - sh);
  g.drawImage(im, sx, sy, sw, sh, x, y, w, h);
}
// draw sprite (cutout) by height, anchored at bottom-center
function sprite(name, x, y, h, o = {}) {
  const im = IMG[name];
  if (!im) return 0;
  const w = (im.naturalWidth / im.naturalHeight) * h;
  g.save();
  g.translate(x, y);
  if (o.rot) g.rotate(o.rot);
  g.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (o.shadow !== false) { g.save(); g.globalAlpha *= 0.18; g.fillStyle = C.ink; g.beginPath(); g.ellipse(0, -2, w * 0.36, h * 0.035, 0, 0, TAU); g.fill(); g.restore(); }
  if (o.outline) { // sticker edge: draw offset copies tinted white
    const k = o.outline;
    if (!sprite._tint) sprite._tint = new Map();
    let tc = sprite._tint.get(name);
    if (!tc) { tc = document.createElement('canvas'); tc.width = im.naturalWidth; tc.height = im.naturalHeight; const x2 = tc.getContext('2d'); x2.drawImage(im, 0, 0); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = '#fff'; x2.fillRect(0, 0, tc.width, tc.height); sprite._tint.set(name, tc); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.drawImage(tc, -w / 2 + Math.cos(a) * k, -h + Math.sin(a) * k, w, h); }
  }
  g.drawImage(im, -w / 2, -h, w, h);
  g.restore();
  return w;
}

// polaroid-style card centered at (x,y). o: rot,s,alpha,border,r,zoom,fx,fy,cap,capCol,tape,wash,washA,lift
function card(name, x, y, w, h, o = {}) {
  const b = o.border != null ? o.border : 14, r = o.r != null ? o.r : 22;
  const capH = o.cap ? (o.capH || 64) : 0;
  const s = o.s != null ? o.s : 1;
  if (s <= 0.001 || o.alpha === 0) return;
  g.save();
  g.translate(x, y);
  if (o.rot) g.rotate(o.rot);
  g.scale(s, s);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  const ox = -w / 2 - b, oy = -h / 2 - b, ow = w + b * 2, oh = h + b * 2 + capH;
  // shadow
  g.fillStyle = o.sh || SH;
  rr(ox + 4, oy + 16 + (o.lift || 0), ow, oh, r + b); g.fill();
  // frame
  rr(ox, oy, ow, oh, r + b);
  g.fillStyle = o.frame || C.white; g.fill();
  // photo
  g.save();
  rr(-w / 2, -h / 2, w, h, r); g.clip();
  drawCover(name, -w / 2, -h / 2, w, h, o.zoom || 1, o.fx != null ? o.fx : 0.5, o.fy != null ? o.fy : 0.5);
  if (o.wash) { g.globalAlpha = o.washA || 0.18; g.fillStyle = o.wash; g.fillRect(-w / 2, -h / 2, w, h); g.globalAlpha = 1; }
  g.restore();
  if (o.cap) text(o.cap, 0, h / 2 + b + capH / 2 - 2, { size: o.capSize || 34, f: 'kr', color: o.capCol || C.ink });
  if (o.tape) {
    g.save(); g.translate(o.tapeX || 0, oy + 4); g.rotate(o.tapeRot != null ? o.tapeRot : -0.06);
    g.globalAlpha *= 0.86; g.fillStyle = o.tape; g.fillRect(-70, -20, 140, 40);
    g.globalAlpha *= 0.5; g.fillStyle = C.white; for (let k = -60; k < 70; k += 22) g.fillRect(k, -20, 9, 40);
    g.restore();
  }
  g.restore();
}

// pre-rendered cloud sprites
let CLOUDS = null;
function makeClouds() {
  const out = [];
  const R = mulberry32(31);
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = 560; c.height = 260;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    const n = 6 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) {
      const cx = 90 + (i / (n - 1)) * 380 + (R() - 0.5) * 30;
      const r = 50 + Math.sin((i / (n - 1)) * Math.PI) * 60 + R() * 20;
      x.beginPath(); x.arc(cx, 200 - r * 0.75, r, 0, TAU); x.fill();
    }
    x.fillRect(80, 160, 400, 80);
    x.beginPath(); x.roundRect(60, 170, 440, 70, 35); x.fill();
    out.push(c);
  }
  return out;
}
