'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   B = t / SPB (time in beats, 4 per bar, 108 BPM).
   hits() registers each on-screen entrance; music.js turns the
   same list into brass stabs, pops and booms, so type and sound
   land together.
   ============================================================ */
const HITS = [];
const hits = (kind, ...bs) => bs.forEach((b) => HITS.push(Array.isArray(b) ? { b: b[0], kind, v: 1, d: b[1] } : { b, kind, v: 1 }));

let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };
const BREAKS = [16, 64, 144, 192];                     // drops after a half-beat of air
const inBreak = (B) => BREAKS.some((b) => B >= b - 0.5 && B < b);

/* chapters */
const CH = [
  { n: '01', b: 32, e: 64, name: '상장', sub: '숫자로 보는 앤트로픽 IPO', bg: C.mustard, fg: C.ink, acc: C.orange },
  { n: '02', b: 64, e: 96, name: '지수', sub: '200일선 공방', bg: C.teal, fg: C.cream, acc: C.mustard },
  { n: '03', b: 96, e: 144, name: '엔비디아와 수혜주', sub: '한쪽은 빠지고, 한쪽은 뛴다', bg: C.orange, fg: C.cream, acc: C.mustard },
  { n: '04', b: 144, e: 192, name: '삼성전자', sub: '또 다른 수혜주', bg: C.blue, fg: C.cream, acc: C.mustard },
];
hits('whoosh', [35.2, 0.8], [67.2, 0.8], [99.2, 0.8], [147.2, 0.8]);

/* section looks: background, ray tint, foreground */
const SECT = [
  { b: 0, bg: C.plum, ray: '#371A59', dot: C.orange, fg: C.cream },
  { b: 32, bg: C.mustard, ray: '#FBC93F', dot: C.orange, fg: C.ink },
  { b: 64, bg: C.teal, ray: '#16A9A3', dot: C.mustard, fg: C.cream },
  { b: 96, bg: C.orange, ray: '#F66A40', dot: C.mustard, fg: C.cream },
  { b: 112, bg: C.green, ray: '#2CB36B', dot: C.mustard, fg: C.cream },
  { b: 128, bg: C.violet, ray: '#7A4BDD', dot: C.mustard, fg: C.cream },
  { b: 136, bg: C.red, ray: '#EA4350', dot: C.mustard, fg: C.cream },
  { b: 144, bg: C.blue, ray: '#2E64EA', dot: C.mustard, fg: C.cream },
  { b: 192, bg: C.plum, ray: '#371A59', dot: C.orange, fg: C.cream },
];
const sectAt = (B) => { let s = SECT[0]; for (const x of SECT) if (B >= x.b) s = x; return s; };
let FG = C.cream;                                      // current foreground (set per frame)

/* ---------------- background: sunburst + halftone ---------------- */
function background(B, t, F) {
  const s = sectAt(B);
  FG = s.fg;
  fillAll(s.bg);
  // rays turn a notch on every snare, breathe on the kick
  const snIdx = lastBefore(SNARES, t) + 1;
  const rot = t * 0.05 + (snIdx - F.snare) * (TAU / 48);
  const cx = CX, cy = H * 1.05, R = 2300, n = 24;
  g.fillStyle = s.ray;
  g.globalAlpha = 0.85;
  for (let i = 0; i < n; i += 2) {
    const a0 = rot + (i / n) * TAU, a1 = a0 + TAU / n;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); g.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
  // halftone corners
  g.fillStyle = s.dot;
  const step = 34;
  for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) {
    const d = (i + j) / 14, r = Math.max(0, (1 - d * 1.5)) * 12 * (1 + F.kick * 0.25);
    if (r < 0.6) continue;
    g.globalAlpha = 0.5;
    g.beginPath(); g.arc(W - 26 - i * step, 26 + j * step, r, 0, TAU); g.fill();
    g.beginPath(); g.arc(26 + i * step, H - 26 - j * step, r, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

/* ---------------- camera & post ---------------- */
function camera(B, t) {
  const kick = env(KICKS, t, 10), imp = impactEnv(t, 5);
  let amp = imp * 8;
  let z = 1 + kick * 0.006 + imp * 0.01;
  let sx = Math.sin(t * 0.31) * 5, sy = Math.cos(t * 0.23) * 3 + kick * 3;
  for (const b of BREAKS) if (B >= b - 2 && B < b) z += Ease.inQuad(pr(B, b - 2, b - 0.5)) * 0.03;
  if (inBreak(B)) { amp = 0; sx *= 0.3; sy *= 0.3; }
  sx += vnoise(t * 16, 1) * amp; sy += vnoise(t * 16, 2) * amp;
  const r = vnoise(t * 8, 3) * amp * 0.0005 + env(SNARES, t, 9) * 0.0016 * (lastBefore(SNARES, t) % 2 ? 1 : -1);
  return { sx, sy, r, z };
}
const FLASHES = [[16, 0.8], [32, 0.25], [64, 0.7], [96, 0.7], [108, 0.5], [112, 0.3], [120, 0.5], [128, 0.25], [136, 0.25], [144, 0.7], [184, 0.4], [192, 0.8], [208, 0.5]];
function postParams(B, t) {
  const kick = env(KICKS, t, 12), imp = impactEnv(t, 4.5);
  let flash = 0;
  for (const [fb, s] of FLASHES) { const d = (B - fb) * SPB; if (d >= 0 && d < 0.8) flash = Math.max(flash, s * Math.exp(-d * 7)); }
  return { ca: 0.08 + imp * 0.5 + kick * 0.06, flash, bloom: 0.1, grain: 0.035, vig: 0.5, warm: 0.3 };
}

/* ---------------- type helpers ---------------- */
function fitSize(s, maxW, maxSize, w = 900, f = null) { return Math.min(maxSize, (maxW / textW(s, 100, w, null, f)) * 100); }
// poster text: hard offset shadow. o as text() + sh (shadow colour), sd (offset)
function ptext(s, x, y, o = {}) {
  const sd = o.sd != null ? o.sd : Math.max(3, (o.size || 40) * 0.06);
  if (o.sh !== false) text(s, x + sd, y + sd, Object.assign({}, o, { color: o.sh || C.ink, alpha: (o.alpha != null ? o.alpha : 1) * (o.sa != null ? o.sa : 1) }));
  return text(s, x, y, o);
}
// whole string slams in from big (on b0), with a squash on landing
function slamIn(s, x, y, o, B, b0, from = 2.2) {
  if (B < b0) return 0;
  const p = pr(B, b0, b0 + 0.4), e = Ease.outExpo(p);
  const sc = lerp(from, 1, e) * (1 + 0.06 * Math.sin(clamp((B - b0) / 0.6) * Math.PI) * (1 - clamp((B - b0) / 1.2)));
  g.save(); g.translate(x, y); g.scale(sc, sc); g.rotate((1 - e) * (o.rot0 || -0.06));
  g.globalAlpha *= Math.min(1, p * 5);
  const w = ptext(s, 0, 0, o);
  g.restore();
  return w;
}
// pop in with overshoot
function popIn(s, x, y, o, B, b0, dur = 0.45) {
  if (B < b0) return 0;
  const sc = Ease.outBack(pr(B, b0, b0 + dur), 2.4);
  g.save(); g.translate(x, y); g.scale(sc, sc);
  g.globalAlpha *= Math.min(1, pr(B, b0, b0 + dur) * 4);
  const w = (o.plain ? text : ptext)(s, 0, 0, o);
  g.restore();
  return w;
}
// rise + fade
function riseIn(s, x, y, o, B, b0, dur = 0.5) {
  if (B < b0) return 0;
  const e = Ease.outCubic(pr(B, b0, b0 + dur));
  return text(s, x, y + (1 - e) * (o.size || 40) * 0.5, Object.assign({}, o, { alpha: (o.alpha != null ? o.alpha : 1) * e }));
}
// sticker: text on a tilted colour block with a hard shadow. returns width
function sticker(s, x, y, o, B, b0) {
  if (B != null && B < b0) return 0;
  const size = o.size || 44, f = o.f || 'han';
  const tw = textW(s, size, o.w || 800, o.ls, f), padX = o.padX != null ? o.padX : size * 0.5, h = o.h || size * 1.55, w = tw + padX * 2;
  const p = B == null ? 1 : pr(B, b0, b0 + 0.4), sc = B == null ? 1 : Ease.outBack(p, 2.6);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  g.save();
  g.translate(x0 + w / 2, y); g.rotate((o.rot || 0) + (1 - Ease.outExpo(p)) * 0.2); g.scale(sc, sc);
  g.globalAlpha *= Math.min(1, p * 4);
  const sd = o.sd != null ? o.sd : 8;
  g.fillStyle = o.sh || C.ink; rr(-w / 2 + sd, -h / 2 + sd, w, h, o.r != null ? o.r : 10); g.fill();
  g.fillStyle = o.fill || C.cream; rr(-w / 2, -h / 2, w, h, o.r != null ? o.r : 10); g.fill();
  if (o.stroke) { g.lineWidth = 4; g.strokeStyle = o.stroke; rr(-w / 2, -h / 2, w, h, o.r != null ? o.r : 10); g.stroke(); }
  text(s, 0, f === 'han' ? size * 0.04 : 2, { size, w: o.w || 800, ls: o.ls, f, color: o.color || C.ink });
  g.restore();
  return w;
}
// fade/slide group in at a, out at z
function group(B, a, z, fn, o = {}) {
  if (B < a || B >= z) return;
  const ein = Ease.outExpo(pr(B, a, a + (o.din || 0.6)));
  const eout = Ease.inCubic(pr(B, z - (o.dout || 0.4), z));
  g.save();
  g.globalAlpha *= Math.min(1, ein * 1.5) * (1 - eout);
  g.translate((1 - ein) * (o.dx || 0) + eout * (o.dxo || 0), (1 - ein) * (o.dy != null ? o.dy : 60) - eout * (o.dyo != null ? o.dyo : 40));
  fn(ein, eout);
  g.restore();
}
function conceptTag(x, y) { pill('개념도', x, y, { size: 20, w: 700, fill: C.inkF, color: C.inkD, align: 'right', h: 34, padX: 14 }); }
// card with hard poster shadow, popping in at b0
function card(x, y, w, h, B, b0, fn, o = {}) {
  if (B < b0) return;
  const p = pr(B, b0, b0 + 0.5), sc = lerp(0.86, 1, Ease.outBack(p, 2));
  g.save();
  g.translate(x + w / 2, y + h / 2); g.scale(sc, sc); g.rotate((1 - Ease.outExpo(p)) * (o.rot0 != null ? o.rot0 : -0.04)); g.translate(-(x + w / 2), -(y + h / 2));
  g.globalAlpha *= Math.min(1, p * 4);
  panel(x, y, w, h, { r: o.r != null ? o.r : 26, lift: o.lift != null ? o.lift : 14, fill: o.fill, stroke: C.ink, lw: 5 });
  fn();
  g.restore();
}

/* ---------------- stock chart ---------------- */
const DAY0 = Date.UTC(2026, 7, 28), DAYN = 76;         // 8/28 … 11/12
const dayOf = (md) => (Date.UTC(2026, +md.slice(0, 2) - 1, +md.slice(3)) - DAY0) / 864e5;
const mdK = (md) => `${+md.slice(0, 2)}/${+md.slice(3)}`;
const fmtV = (v, u) => u === '$' ? '$' + v.toFixed(2) : u === 'W' ? Math.round(v).toLocaleString('en-US') + '원' : u === 'Y' ? v.toFixed(0) + '위안' : v >= 5000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2);
const fmtAx = (v, u) => u === '$' ? '$' + Math.round(v) : u === 'W' ? (v >= 1e6 ? (v / 1e4).toFixed(0) : (v / 1e4).toFixed(1)) + '만' : u === 'Y' ? Math.round(v) + '' : Math.round(v).toLocaleString('en-US');
const _SER = new Map();
function series(key) {
  let s = _SER.get(key);
  if (s) return s;
  const rows = PX[key], v = rows.map((r) => r[1]);
  let iMax = 0, iMin = 0;
  v.forEach((x, i) => { if (x > v[iMax]) iMax = i; if (x < v[iMin]) iMin = i; });
  s = { rows, v, d: rows.map((r) => dayOf(r[0])), iMax, iMin, n: rows.length };
  _SER.set(key, s);
  return s;
}
/* o: key,x,y,w,h,b0,dur,col,name,tick,u, marks:[{at,b,text,dx,dy}], extra:{md,v,b,text}, note, start (b for card) */
function stockChart(B, o) {
  const S = series(o.key), { x, y, w, h } = o;
  const px = x + 96, py = y + 116, pw = w - 150, ph = h - 196;
  const ex = o.extra;
  let lo = Math.min(...S.v, ex ? ex.v : Infinity), hi = Math.max(...S.v);
  const pad = (hi - lo) * 0.1; lo -= pad; hi += pad * 1.3;
  const X = (d) => px + (d / DAYN) * pw, Y = (v) => py + ph - ((v - lo) / (hi - lo)) * ph;
  const pts = S.v.map((v, i) => [X(S.d[i]), Y(v)]);
  // header
  text(o.name, x + 36, y + 56, { size: 46, f: 'han', align: 'left', color: C.ink });
  const nw = textW(o.name, 46, 800, null, 'han');
  text(o.tick, x + 36 + nw + 16, y + 62, { size: 24, w: 700, align: 'left', color: C.inkD });
  // grid
  g.lineWidth = 2;
  for (let k = 0; k <= 3; k++) {
    const v = lo + ((hi - lo) * (k + 0.35)) / 3.7, yy = Y(v);
    g.strokeStyle = C.inkF; line(px, yy, px + pw, yy);
    text(fmtAx(v, o.u), px - 12, yy, { size: 24, w: 700, align: 'right', color: C.inkS });
  }
  [['09-01', '9월'], ['10-01', '10월'], ['11-01', '11월']].forEach(([md, l]) => {
    const xx = X(dayOf(md));
    g.strokeStyle = C.inkF; line(xx, py, xx, py + ph);
    text(l, xx + 8, py + ph + 26, { size: 24, w: 700, align: 'left', color: C.inkS });
  });
  g.strokeStyle = C.inkS; g.lineWidth = 3; line(px, py + ph, px + pw, py + ph);
  if (o.note) text(o.note, x + w - 30, y + h - 28, { size: 22, w: 700, align: 'right', color: C.inkD });
  const lastX = pts[pts.length - 1][0];
  if (DAYN - S.d[S.n - 1] > 4 && B >= o.b0 + o.dur) {               // no closes for the last stretch
    const a = Ease.outCubic(pr(B, o.b0 + o.dur, o.b0 + o.dur + 0.5));
    g.save(); g.globalAlpha *= a;
    g.fillStyle = C.inkF; g.fillRect(lastX + 14, py, px + pw - lastX - 14, ph);
    g.beginPath(); g.rect(lastX + 14, py, px + pw - lastX - 14, ph); g.clip();
    g.strokeStyle = 'rgba(36,18,58,0.14)'; g.lineWidth = 3;
    for (let k = -ph; k < pw; k += 22) line(lastX + 14 + k, py + ph, lastX + 14 + k + ph, py);
    g.restore();
    if (px + pw - lastX > 150) text('이후 시세 미확보', (lastX + 14 + px + pw) / 2, py + 30, { size: 22, w: 800, color: C.inkD, alpha: a });
  }
  // line
  const p = Ease.inOutCubic(pr(B, o.b0, o.b0 + o.dur));
  if (p > 0) {
    const xMax = lerp(pts[0][0], pts[pts.length - 1][0], p);
    const part = polyUpToX(pts, xMax), head = part[part.length - 1];
    const gr = g.createLinearGradient(0, py, 0, py + ph);
    gr.addColorStop(0, o.col + '55'); gr.addColorStop(1, o.col + '05');
    g.beginPath(); g.moveTo(part[0][0], py + ph); part.forEach((q) => g.lineTo(q[0], q[1])); g.lineTo(head[0], py + ph); g.closePath(); g.fillStyle = gr; g.fill();
    g.strokeStyle = o.col; g.lineWidth = 7; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); part.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke();
    g.lineJoin = 'miter'; g.lineCap = 'butt';
    if (!ex || B < ex.b) { circle(head[0], head[1], 13, C.ink); circle(head[0], head[1], 7, o.col); }
  }
  // projected / quoted point beyond the last close
  if (ex && B >= ex.b) {
    const a = pts[pts.length - 1], e = [X(dayOf(ex.md)), Y(ex.v)], q = Ease.outCubic(pr(B, ex.b, ex.b + 0.5));
    g.setLineDash([10, 9]); g.strokeStyle = C.ink; g.lineWidth = 5;
    line(a[0], a[1], lerp(a[0], e[0], q), lerp(a[1], e[1], q)); g.setLineDash([]);
    circle(a[0], a[1], 9, o.col);
    const pu = 1 + 0.25 * Math.sin(B * Math.PI);
    circle(e[0], e[1], 16 * q * pu, C.ink); circle(e[0], e[1], 9 * q, C.mustard);
    sticker(ex.text, e[0] + (ex.dx != null ? ex.dx : -20), e[1] + (ex.dy != null ? ex.dy : 62), { size: 30, f: 'sans', w: 800, fill: C.ink, color: C.cream, align: 'right', sd: 0, r: 8, h: 50, padX: 16 }, B, ex.b + 0.1);
  }
  // marks
  for (const m of o.marks || []) {
    if (B < m.b) continue;
    const i = m.at === 'max' ? S.iMax : m.at === 'min' ? S.iMin : m.at === 'last' ? S.n - 1 : m.at;
    const q = pts[i], sc = Ease.outBack(pr(B, m.b, m.b + 0.4), 2.5);
    circle(q[0], q[1], 15 * sc, C.ink); circle(q[0], q[1], 8 * sc, m.col || C.mustard);
    const tx = q[0] + (m.dx || 0), ty = q[1] + (m.dy != null ? m.dy : -52);
    g.strokeStyle = C.ink; g.lineWidth = 3; line(q[0], q[1], tx, ty);
    sticker(m.text, tx, ty, { size: 30, f: 'sans', w: 800, fill: m.fill || C.ink, color: m.color || C.cream, sd: 0, r: 8, h: 50, padX: 16, align: m.align }, B, m.b);
  }
  return { X, Y, pts, S };
}

/* 200-day-line concept diagram. mode: 'above' (back over the line) | 'near' (2% below) */
function maConcept(B, x, y, w, h, b0, mode, bMark) {
  const px = x + 50, pw = w - 100, py = y + 96, ph = h - 150;
  text('200일 이동평균선', x + 34, y + 50, { size: 34, f: 'han', align: 'left', color: C.ink });
  conceptTag(x + w - 26, y + 48);
  const ma = (u) => py + ph * (0.5 - 0.1 * u);
  const off = mode === 'above'
    ? (u) => lerp(lerp(0.28, -0.3, Ease.inOutSine(pr(u, 0, 0.62))), 0.17, Ease.inOutSine(pr(u, 0.62, 1)))
    : (u) => lerp(lerp(0.3, -0.34, Ease.inOutSine(pr(u, 0, 0.6))), -0.075, Ease.inOutSine(pr(u, 0.6, 1)));
  const price = (u) => ma(u) - ph * (off(u) + 0.035 * Math.sin(u * 23) * (1 - u * 0.6));
  // MA line
  g.setLineDash([14, 10]); g.strokeStyle = C.orange; g.lineWidth = 6;
  line(px, ma(0), px + pw, ma(1)); g.setLineDash([]);
  text('200일선', px + 6, ma(0) + 30, { size: 24, w: 800, align: 'left', color: C.orange });
  const p = Ease.inOutCubic(pr(B, b0, b0 + 1.6));
  if (p <= 0) return;
  g.strokeStyle = C.ink; g.lineWidth = 7; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath();
  const n = 90;
  for (let i = 0; i <= n * p; i++) { const u = i / n; i ? g.lineTo(px + u * pw, price(u)) : g.moveTo(px, price(0)); }
  g.stroke(); g.lineJoin = 'miter'; g.lineCap = 'butt';
  const hx = px + p * pw, hy = price(p);
  circle(hx, hy, 14, C.ink); circle(hx, hy, 8, mode === 'above' ? C.green : C.mustard);
  text('지수', px + 6, price(0) - 30, { size: 24, w: 800, align: 'left', color: C.ink });
  if (B >= bMark) {
    if (mode === 'above') {
      ring(B, bMark, hx, hy, { col: C.green, r: 120, lw: 12 });
      sticker('재돌파', hx - 30, hy - 60, { size: 34, fill: C.green, color: C.cream, align: 'right', rot: -0.05 }, B, bMark);
    } else {
      const q = Ease.outCubic(pr(B, bMark, bMark + 0.4)), yy = ma(1);
      g.strokeStyle = C.ink; g.lineWidth = 5;
      const bx = hx + 26;
      line(bx - 10, yy, bx + 10, yy); line(bx - 10, hy, bx + 10, hy); line(bx, hy, bx, lerp(hy, yy, q));
      sticker('+2%', hx - 34, (hy + yy) / 2 + 66, { size: 40, f: 'ant', fill: C.mustard, color: C.ink, align: 'right', rot: 0.04 }, B, bMark);
    }
  }
}

/* ---------------- chapter card + header ---------------- */
function chapterCard(B, k) {
  const c = CH[k], b = c.b;
  if (B < b || B >= b + 4) return;
  const out = Ease.inOutCubic(pr(B, b + 3.2, b + 4));
  g.save();
  g.translate(0, -out * (H + 80));
  g.fillStyle = C.plum; g.fillRect(-100, -100, W + 200, H + 200);
  // stripes
  [c.bg, C.cream, c.acc].forEach((col, i) => {
    const p = Ease.outExpo(pr(B, b + i * 0.12, b + 0.7 + i * 0.12));
    g.fillStyle = col; g.fillRect(0, H * 0.74 + i * 36, W * p, 26);
  });
  slamIn(c.n, 250, 470, { size: 420, f: 'ant', color: c.bg, sh: C.cream, sd: 10 }, B, b);
  const ns = fitSize(c.name, 1180, 200, 800, 'han');
  if (B >= b + 0.75) {
    const e = Ease.outExpo(pr(B, b + 0.75, b + 1.3));
    text(c.name, 520 + (1 - e) * 300, 430, { size: ns, f: 'han', align: 'left', color: C.cream, alpha: e });
  }
  riseIn(c.sub, 526, 430 + ns * 0.72, { size: 52, w: 700, align: 'left', color: c.acc }, B, b + 1.5);
  g.restore();
}
function drawHUD(B, t, F) {
  if (B < 32 || B >= 208) return;
  const a = Math.min(pr(B, 32, 33), 1 - pr(B, 206, 208));
  g.save(); g.globalAlpha = a;
  const k = CH.findIndex((c) => B >= c.b && B < c.e);
  const fg = sectAt(B).fg;
  text('11월 빅 이벤트 · 앤트로픽 상장', 56, 50, { size: 26, w: 800, align: 'left', color: fg, alpha: 0.85 });
  if (k >= 0 && B >= CH[k].b + 4) {
    const c = CH[k], e = Ease.outExpo(pr(B, c.b + 4, c.b + 4.6));
    g.globalAlpha = a * e;
    const tw = textW(c.name, 30, 800, null, 'han');
    text(c.n, W - 56 - tw - 14, 50, { size: 34, f: 'ant', align: 'right', color: fg, alpha: 0.7 });
    text(c.name, W - 56, 52, { size: 30, f: 'han', align: 'right', color: fg });
  }
  g.restore();
}
// beat lights + progress
function drawBeatBar(B) {
  if (B >= TOTAL_BEATS - 4) return;
  const fg = sectAt(B).fg, y = H - 30;
  g.save();
  g.globalAlpha = 0.22; g.fillStyle = fg; g.fillRect(56, y - 2, W - 112, 4);
  g.globalAlpha = 0.9; g.fillRect(56, y - 2, (W - 112) * clamp(B / (TOTAL_BEATS - 8)), 4);
  const beat = Math.floor(B) % 4, fr = B - Math.floor(B);
  for (let i = 0; i < 4; i++) {
    const on = i === beat && B >= 0;
    const s = on ? 1 + 0.6 * Math.exp(-fr * 6) : 1;
    g.globalAlpha = on ? 1 : 0.3;
    g.fillStyle = on && i === 0 ? C.mustard : fg;
    g.beginPath(); g.arc(W / 2 - 39 + i * 26, y - 22, 6 * s, 0, TAU); g.fill();
  }
  g.restore();
}

/* ============================================================
   0–16  INTRO
   ============================================================ */
hits('stab', 0, 1.5, 2.5, 8, 9.5, 10.5);
hits('pop', 4, 4.75, 5.5, 6.5, 12, 12.75);
function sIntro(B, t, F) {
  const out = B >= 14 ? Ease.inCubic(pr(B, 15.2, 15.6)) : 0;
  g.save(); g.globalAlpha = 1 - out;
  // "11월 / 빅 / 이벤트" on the bass riff
  const y0 = B < 8 ? 440 : lerp(440, 250, Ease.inOutCubic(pr(B, 7.4, 8.2)));
  const sc = B < 8 ? 1 : lerp(1, 0.52, Ease.inOutCubic(pr(B, 7.4, 8.2)));
  g.save(); g.translate(CX, y0); g.scale(sc, sc);
  slamIn('11월', -520, 0, { size: 250, f: 'han', color: C.mustard, sh: C.orange, sd: 12 }, B, 0);
  slamIn('빅', -130, 0, { size: 250, f: 'han', color: C.cream, sh: C.orange, sd: 12 }, B, 1.5);
  slamIn('이벤트', 370, 0, { size: 250, f: 'han', color: C.cream, sh: C.orange, sd: 12 }, B, 2.5);
  g.restore();
  // a question strip
  if (B >= 4 && B < 8) {
    const words = [['월가가', 4], ['기다린', 4.75], ['그', 5.5], ['이름', 6.5]];
    let x = CX - 520;
    words.forEach(([wd, b], i) => { const w = textW(wd, 120, 800, null, 'han'); popIn(wd, x + w / 2, 740, { size: 120, f: 'han', color: i === 3 ? C.mustard : C.cream, sh: C.ink, sd: 6 }, B, b); x += w + 50; });
  }
  if (B >= 8) {
    slamIn('역대', CX - 470, 560, { size: 200, f: 'han', color: C.cream, sh: C.pink, sd: 10 }, B, 8);
    slamIn('최대', CX - 60, 560, { size: 200, f: 'han', color: C.mustard, sh: C.pink, sd: 10 }, B, 9.5);
    slamIn('IPO', CX + 400, 566, { size: 250, f: 'ant', color: C.cream, sh: C.pink, sd: 10 }, B, 10.5);
    sticker('스페이스X 기록을 넘는다', CX - 290, 810, { size: 64, fill: C.orange, color: C.cream, rot: -0.03 }, B, 12);
    sticker('최대 904억 달러', CX + 430, 820, { size: 64, fill: C.cream, color: C.ink, rot: 0.03 }, B, 12.75);
  }
  g.restore();
}

/* ============================================================
   16–32  TITLE
   ============================================================ */
hits('pop', 20, 21.5, 24, 25.5, 26.5, 28);
hits('stab', 22.5, 29.5, 30.5);
function sTitle(B, t, F) {
  const up = Ease.inOutCubic(pr(B, 23.3, 24.1));
  g.save();
  g.translate(CX, lerp(430, 250, up)); g.scale(lerp(1, 0.6, up), lerp(1, 0.6, up));
  // 앤트로픽 / 상장
  const bounce = 1 + F.kick * 0.02;
  g.scale(bounce, bounce);
  chars('앤트로픽', -250, 0, { size: 330, f: 'han', color: C.ink }, (i) => { const p = pr(B, 16 + i * 0.06, 16.4 + i * 0.06); return p <= 0 ? false : { x: 14, y: 14, s: lerp(2.6, 1, Ease.outExpo(p)), a: Math.min(1, p * 5), c: C.orange }; });
  chars('앤트로픽', -250, 0, { size: 330, f: 'han', color: C.cream }, (i) => { const p = pr(B, 16 + i * 0.06, 16.4 + i * 0.06); return p <= 0 ? false : { s: lerp(2.6, 1, Ease.outExpo(p)), a: Math.min(1, p * 5) }; });
  if (B >= 16.5) {
    const p = pr(B, 16.5, 16.95), sc = Ease.outBack(p, 2.4);
    g.save(); g.translate(600, 6); g.rotate(-0.07 + (1 - Ease.outExpo(p)) * 0.5); g.scale(sc, sc);
    g.fillStyle = C.ink; rr(-212 + 14, -170 + 14, 424, 340, 30); g.fill();
    g.fillStyle = C.mustard; rr(-212, -170, 424, 340, 30); g.fill();
    text('상장', 0, 14, { size: 250, f: 'han', color: C.ink });
    g.restore();
  }
  if (B >= 18) {
    const e = Ease.outExpo(pr(B, 18, 18.7));
    text('ANTHROPIC  IPO', 0, 270, { size: 92, f: 'ant', color: C.mustard, ls: lerp(60, 22, e), alpha: e });
  }
  g.restore();
  if (B < 23.7) {
    g.save(); g.globalAlpha = 1 - pr(B, 23.2, 23.7);
    sticker('11/18 공모가 결정', CX - 300, 850, { size: 52, fill: C.orange, color: C.cream, rot: -0.03 }, B, 20);
    sticker('11/19 거래 개시', CX + 320, 850, { size: 52, fill: C.pink, color: C.cream, rot: 0.03 }, B, 21.5);
    if (B >= 22.5) { ring(B, 22.5, CX - 300, 850, { col: C.mustard, r: 260, lw: 10 }); ring(B, 22.5, CX + 320, 850, { col: C.mustard, r: 260, lw: 10 }); }
    g.restore();
  }
  // agenda
  if (B >= 24) {
    const items = [['01', '상장', '904억 달러 · 1.4조 달러', C.mustard, 24], ['02', '지수', '나스닥 100 · 반도체', C.teal, 25.5], ['03', '엔비디아와 수혜주', 'AMD · 브로드컴 · 캠브리콘', C.orange, 26.5], ['04', '삼성전자', '지분 · HBM · AMD', C.blue, 28]];
    items.forEach(([n, name, sub, col, b], i) => {
      if (B < b) return;
      const x = 130 + i * 425, y = 520, w = 395, h = 360;
      card(x, y, w, h, B, b, () => {
        g.fillStyle = col; rr(x, y, w, 120, 26); g.fill(); g.fillRect(x, y + 60, w, 60);
        g.strokeStyle = C.ink; g.lineWidth = 5; rr(x, y, w, h, 26); g.stroke(); line(x, y + 120, x + w, y + 120);
        text(n, x + 30, y + 64, { size: 84, f: 'ant', align: 'left', color: col === C.mustard ? C.ink : C.cream });
        text(name, x + 30, y + 196, { size: fitSize(name, w - 60, 62, 800, 'han'), f: 'han', align: 'left', color: C.ink });
        text(sub, x + 30, y + 280, { size: fitSize(sub, w - 60, 30, 700), w: 700, align: 'left', color: C.inkD });
      }, { rot0: i % 2 ? 0.06 : -0.06 });
    });
    if (B >= 29.5) {
      slamIn('이틀이', CX - 250, 960, { size: 76, f: 'han', color: C.mustard, sh: C.ink, sd: 6 }, B, 29.5);
      slamIn('분위기를 가른다', CX + 190, 960, { size: 76, f: 'han', color: C.cream, sh: C.ink, sd: 6 }, B, 30.5);
    }
  }
}

/* ============================================================
   32–64  ① 상장
   ============================================================ */
hits('run', [36, 1.5], [44, 1.5]);
hits('big', 37.5, 45.5);
hits('whoosh', [40, 1], [53.5, 0.8]);
hits('stab', 41.5, 48, 52, 57.5, 58.5);
hits('thud', 42.5, 55.5);
hits('pop', 49.5, 50.5, 54.5, 56, 56.25, 56.5, 56.75, 57);
hits('clav', 60, 61.5);
function sIPO(B, t, F) {
  // --- 조달 규모 (36–44)
  group(B, 36, 44, () => {
    sticker('조달 규모', 150, 200, { size: 46, fill: C.ink, color: C.mustard, align: 'left', rot: -0.02 }, B, 36);
    riseIn('최대', 420, 204, { size: 60, f: 'han', align: 'left', color: C.ink }, B, 36.3);
    const v = B < 37.5 ? Math.round(lerp(0, 904, Ease.outCubic(pr(B, 36, 37.5)))) : 904;
    const lock = B >= 37.5 ? 1 + 0.12 * Math.exp(-(B - 37.5) * 4) : 1;
    g.save(); g.translate(150, 470); g.scale(lock, lock);
    numUnit(String(v), '억 달러', 4 + 8, 120 + 8, { size: 330, f: 'ant', unitSize: 110, uf: 'han', align: 'left', color: C.cream, gap: 20 });
    numUnit(String(v), '억 달러', 4, 120, { size: 330, f: 'ant', unitSize: 110, uf: 'han', align: 'left', color: C.ink, unitColor: C.orange, gap: 20 });
    g.restore();
    // bars vs SpaceX
    const bx = 150, bw = 1500, by = 700;
    if (B >= 40) {
      const p1 = Ease.outExpo(pr(B, 40, 41)), p2 = Ease.outExpo(pr(B, 41.5, 42.3));
      const w1 = bw * (862 / 904) * p1, w2 = bw * p2;
      text('스페이스X', bx, by, { size: 36, f: 'han', align: 'left', color: C.ink });
      g.fillStyle = C.ink; rr(bx + 8, by + 34 + 8, Math.max(20, w1), 62, 12); g.fill();
      g.fillStyle = C.cream; rr(bx, by + 34, Math.max(20, w1), 62, 12); g.fill();
      text('862억 달러', bx + Math.max(20, w1) - 22, by + 67, { size: 38, f: 'han', align: 'right', color: C.ink, alpha: pr(p1, 0.6, 1) });
      if (B >= 41.5) {
        text('앤트로픽', bx, by + 140, { size: 36, f: 'han', align: 'left', color: C.ink });
        g.fillStyle = C.ink; rr(bx + 8, by + 174 + 8, Math.max(20, w2), 62, 12); g.fill();
        g.fillStyle = C.orange; rr(bx, by + 174, Math.max(20, w2), 62, 12); g.fill();
        text('904억 달러', bx + Math.max(20, w2) - 22, by + 207, { size: 38, f: 'han', align: 'right', color: C.cream, alpha: pr(p2, 0.6, 1) });
      }
    }
    if (B >= 42.5) {
      const p = pr(B, 42.5, 42.85), sc = lerp(3, 1, Ease.outExpo(p));
      g.save(); g.translate(1500, 420); g.rotate(-0.12); g.scale(sc, sc); g.globalAlpha *= Math.min(1, p * 4);
      g.strokeStyle = C.red; g.lineWidth = 12; rr(-250, -120, 500, 240, 24); g.stroke();
      g.lineWidth = 4; rr(-232, -102, 464, 204, 16); g.stroke();
      text('역대 최대', 0, -32, { size: 100, f: 'han', color: C.red });
      text('IPO 조달 규모', 0, 58, { size: 50, f: 'han', color: C.red });
      g.restore();
    }
  });
  // --- 밸류에이션 (44–56)
  group(B, 44, 56, () => {
    const sh = Ease.inOutCubic(pr(B, 47.4, 48.1));                 // shrink the number to make room
    sticker('밸류에이션 · 완전 희석 기준', 150, 200, { size: 46, fill: C.ink, color: C.mustard, align: 'left', rot: -0.02 }, B, 44);
    const v = B < 45.5 ? lerp(0, 1.4, Ease.outCubic(pr(B, 44, 45.5))) : 1.4;
    const lock = B >= 45.5 ? 1 + 0.12 * Math.exp(-(B - 45.5) * 4) : 1;
    g.save(); g.translate(150, lerp(540, 400, sh)); g.scale(lock * lerp(1, 0.56, sh), lock * lerp(1, 0.56, sh));
    numUnit(v.toFixed(1), '조 달러', 8, 120 + 8, { size: 400, f: 'ant', unitSize: 130, uf: 'han', align: 'left', color: C.cream, gap: 20 });
    numUnit(v.toFixed(1), '조 달러', 0, 120, { size: 400, f: 'ant', unitSize: 130, uf: 'han', align: 'left', color: C.ink, unitColor: C.orange, gap: 20 });
    g.restore();
    if (B >= 48 && B < 52) {
      g.save(); g.globalAlpha *= 1 - pr(B, 51.6, 52);
      slamIn('상장 즉시 미국 시총 10위권', 150 + 520, 640, { size: 88, f: 'han', color: C.ink, sh: C.cream, sd: 6 }, B, 48, 1.6);
      // same weight class
      const cy = 850;
      [['테슬라', 1100, C.cream, 49.5], ['앤트로픽', 1400, C.orange, 48.6], ['메타', 1700, C.cream, 50.5]].forEach(([nm, x, col, b]) => {
        if (B < b) return;
        const sc = Ease.outBack(pr(B, b, b + 0.45), 2.4), r = 118 * sc * (nm === '앤트로픽' ? 1 + F.kick * 0.04 : 1);
        circle(x + 8, cy + 8, r, C.ink); circle(x, cy, r, col);
        g.strokeStyle = C.ink; g.lineWidth = 5; g.beginPath(); g.arc(x, cy, r, 0, TAU); g.stroke();
        if (sc > 0.5) text(nm, x, cy + 4, { size: nm === '앤트로픽' ? 46 : 52, f: 'han', color: col === C.orange ? C.cream : C.ink });
      });
      riseIn('비슷한 체급', 1400, 1000, { size: 40, f: 'han', color: C.ink }, B, 50.5);
      if (B >= 50.5) { g.strokeStyle = C.ink; g.lineWidth = 5; g.setLineDash([8, 8]); line(1222, 850, 1278, 850); line(1522, 850, 1578, 850); g.setLineDash([]); }
      g.restore();
    }
    if (B >= 52) {
      slamIn('원화로 약 1,800조 원', 1300, 330, { size: 96, f: 'han', color: C.ink, sh: C.cream, sd: 6 }, B, 52, 1.6);
      const by = 900, bw = 250, mx = 520;
      const hA = mx * Ease.outExpo(pr(B, 53.5, 54.3)), hS = mx * (1200 / 1800) * Ease.outExpo(pr(B, 54.5, 55.2));
      [[980, hA, C.orange, '앤트로픽', '1,800조 원', 53.5], [1320, hS, C.blue, '삼성전자', '1,200조 원', 54.5]].forEach(([x, hh, col, nm, val, b]) => {
        if (B < b) return;
        g.fillStyle = C.ink; rr(x + 8, by - hh + 8, bw, Math.max(8, hh), 14); g.fill();
        g.fillStyle = col; rr(x, by - hh, bw, Math.max(8, hh), 14); g.fill();
        g.strokeStyle = C.ink; g.lineWidth = 5; rr(x, by - hh, bw, Math.max(8, hh), 14); g.stroke();
        text(nm, x + bw / 2, by + 44, { size: 42, f: 'han', color: C.ink });
        if (hh > 120) text(val, x + bw / 2, by - hh + 60, { size: 40, f: 'han', color: C.cream });
      });
      g.strokeStyle = C.ink; g.lineWidth = 5; line(940, by, 1610, by);
      sticker('삼성전자의 1.5배', 1740, 640, { size: 48, fill: C.ink, color: C.mustard, rot: 0.06 }, B, 55.5);
    }
  });
  // --- 일정 (56–64)
  group(B, 56, 64, () => {
    sticker('일정', 150, 200, { size: 46, fill: C.ink, color: C.mustard, align: 'left', rot: -0.02 }, B, 56);
    text('2026년 11월', 330, 204, { size: 44, f: 'han', align: 'left', color: C.ink });
    const days = [['월', 16], ['화', 17], ['수', 18], ['목', 19], ['금', 20]];
    days.forEach(([dw, d], i) => {
      const b = 56 + i * 0.25;
      if (B < b) return;
      const hot = (d === 18 && B >= 57.5) || (d === 19 && B >= 58.5), hb = d === 18 ? 57.5 : 58.5;
      const x = 150 + i * 330, y = 290, w = 300, h = hot ? 400 : 330;
      const sc = Ease.outBack(pr(B, b, b + 0.4), 2.2) * (hot ? 1 + 0.08 * Math.exp(-(B - hb) * 4) : 1);
      g.save(); g.translate(x + w / 2, y + 165); g.scale(sc, sc); g.rotate(hot ? (d === 18 ? -0.03 : 0.03) : 0); g.translate(-(x + w / 2), -(y + 165));
      const col = hot ? (d === 18 ? C.orange : C.pink) : C.paper;
      g.fillStyle = C.ink; rr(x + 10, y + 10, w, h, 22); g.fill();
      g.fillStyle = col; rr(x, y, w, h, 22); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 5; rr(x, y, w, h, 22); g.stroke();
      text(dw, x + 28, y + 46, { size: 36, f: 'han', align: 'left', color: hot ? C.cream : C.inkD });
      text(String(d), x + w / 2, y + 190, { size: 210, f: 'ant', color: hot ? C.cream : C.ink, alpha: hot || B < 57.5 ? 1 : 0.35 });
      if (hot) text(d === 18 ? '공모가 결정' : '거래 개시', x + w / 2, y + 340, { size: 50, f: 'han', color: C.cream, alpha: pr(B, hb, hb + 0.3) });
      g.restore();
    });
    if (B >= 60) {
      slamIn('이 이틀의 결과가', CX - 400, 830, { size: 96, f: 'han', color: C.ink, sh: C.cream, sd: 6 }, B, 60, 1.6);
      slamIn('AI 센티먼트를 가른다', CX + 400, 830, { size: 96, f: 'han', color: C.orange, sh: C.ink, sd: 6 }, B, 61.5, 1.6);
      riseIn('AI 주식과 섹터 전반에 미칠 영향이 크다', CX, 960, { size: 40, w: 700, color: C.ink }, B, 62);
    }
  }, { dout: 0.3 });
}

/* ============================================================
   64–96  ② 지수
   ============================================================ */
hits('pop', 68, 72, 73.5, 80, 84, 92, 93.5);
hits('whoosh', [68.5, 2.5], [80.5, 2.5]);
hits('big', 76, 88);
hits('stab', 74.5, 85.5, 90);
hits('flip', 79.6);
function sIndex(B, t, F) {
  // --- 나스닥 100 (68–80)
  group(B, 68, 80, () => {
    card(90, 150, 1020, 620, B, 68, () => {
      stockChart(B, { key: 'QQQ', x: 90, y: 150, w: 1020, h: 620, b0: 68.5, dur: 3, col: C.teal, name: '나스닥 100', tick: 'QQQ ETF 기준', u: '$', note: '일별 종가 · 8/28~11/6', marks: [{ at: 'last', b: 71.6, text: '11/6 종가', dy: 60, dx: -90 }] });
    });
    card(1160, 150, 670, 620, B, 72, () => maConcept(B, 1160, 150, 670, 620, 72.2, 'above', 73.5), { rot0: 0.04 });
    if (B >= 74.5) {
      const p = Ease.outBack(pr(B, 74.5, 74.95), 2.4);
      circle(1750, 700, 56 * p, C.ink); circle(1744, 694, 56 * p, C.green); checkMark(1744, 694, 60 * p, C.cream, pr(B, 74.6, 75), 9);
    }
    if (B >= 76) {
      slamIn('200일선', CX - 520, 900, { size: 150, f: 'han', color: C.mustard, sh: C.ink, sd: 9 }, B, 76);
      slamIn('다시 상회', CX + 130, 900, { size: 150, f: 'han', color: C.cream, sh: C.ink, sd: 9 }, B, 76.5);
      sticker('나스닥 100', CX + 660, 880, { size: 44, fill: C.cream, color: C.ink, rot: 0.05 }, B, 77.5);
    }
  });
  // --- 필라델피아 반도체 (80–96)
  group(B, 80, 96, () => {
    card(90, 150, 1020, 620, B, 80, () => {
      stockChart(B, { key: 'SOX', x: 90, y: 150, w: 1020, h: 620, b0: 80.5, dur: 3, col: C.violet, name: '필라델피아 반도체', tick: 'SOX 지수', u: '', note: '일별 종가 · 8/28~10/30' });
    });
    card(1160, 150, 670, 620, B, 84, () => maConcept(B, 1160, 150, 670, 620, 84.2, 'near', 85.5), { rot0: 0.04 });
    if (B >= 88 && B < 92) {
      g.save(); g.globalAlpha *= 1 - pr(B, 91.6, 92);
      slamIn('2%', CX - 640, 905, { size: 210, f: 'ant', color: C.mustard, sh: C.ink, sd: 9 }, B, 88);
      slamIn('더 오르면 200일선 안착', CX + 150, 900, { size: 120, f: 'han', color: C.cream, sh: C.ink, sd: 8 }, B, 88.5);
      g.restore();
    }
    if (B >= 90 && B < 92) {                                        // distance meter
      const p = Ease.outExpo(pr(B, 90, 90.8));
      g.save(); g.globalAlpha *= p * (1 - pr(B, 91.6, 92));
      g.restore();
    }
    if (B >= 92) {
      const rows = [['나스닥 100', '200일선 위', C.green, 92], ['필라델피아 반도체', '200일선까지 +2%', C.mustard, 93.5]];
      rows.forEach(([a, b2, col, b], i) => {
        if (B < b) return;
        const x = 150 + i * 840, y = 900, e = Ease.outBack(pr(B, b, b + 0.45), 2);
        g.save(); g.translate(x + 390, y); g.scale(e, e); g.translate(-(x + 390), -y);
        g.fillStyle = C.ink; rr(x + 8, y - 62 + 8, 780, 124, 62); g.fill();
        g.fillStyle = C.cream; rr(x, y - 62, 780, 124, 62); g.fill();
        circle(x + 62, y, 40, col);
        if (i === 0) checkMark(x + 62, y, 44, C.cream, 1, 8); else text('+2', x + 62, y + 2, { size: 36, f: 'ant', color: C.ink });
        text(a, x + 122, y - 22, { size: 30, w: 800, align: 'left', color: C.inkD });
        text(b2, x + 122, y + 24, { size: 50, f: 'han', align: 'left', color: C.ink });
        g.restore();
      });
    }
  });
}

/* ============================================================
   96–144  ③ 엔비디아와 수혜주
   ============================================================ */
hits('pop', 100, 104, 116, 117.5, 126, 127.5, 131.5, 138, 139.5);
hits('down', [100.5, 3]);
hits('stab', 105.5, 110, 122.5, 128, 136);
hits('boom', 108, 120);
hits('big', 112, 132, 140.5);
hits('run', [112.5, 3], [128.5, 2], [124, 2]);
hits('whoosh', [136.5, 1.5]);
// NVDA vs AMD, indexed to the 11/5 close
const IDX = (() => {
  const from = (key) => { const r = PX[key], i = r.findIndex((x) => x[0] === '11-05'); return r.slice(i).map((x) => [x[0], (x[1] / r[i][1]) * 100]); };
  return { nv: from('NVDA'), amd: from('AMD') };
})();
function sChips(B, t, F) {
  // --- 엔비디아 (100–112)
  group(B, 100, 112, () => {
    card(90, 140, 1120, 700, B, 100, () => {
      stockChart(B, {
        key: 'NVDA', x: 90, y: 140, w: 1120, h: 700, b0: 100.5, dur: 3, col: C.red, name: '엔비디아', tick: 'NVDA', u: '$', note: '일별 종가 · 8/31~11/11',
        marks: [{ at: 'max', b: 104, text: '고점 $239.24 (10/6)', dy: -50, dx: 0 }],
        extra: { md: '11-12', v: 160, b: 105.5, text: '애프터마켓 160달러', dx: -34, dy: 0 },
      });
    });
    if (B >= 108) {
      const sh = (1 - pr(B, 108, 109.5)) * 14;
      g.save(); g.translate(vnoise(t * 30, 5) * sh, vnoise(t * 30, 6) * sh);
      slamIn('-33%', 1565, 420, { size: 250, f: 'ant', color: C.cream, sh: C.ink, sd: 14 }, B, 108, 3);
      g.restore();
      riseIn('고점 대비', 1560, 200, { size: 64, f: 'han', color: C.mustard }, B, 108.3);
      sticker('30% 넘게 하락', 1560, 640, { size: 60, fill: C.ink, color: C.cream, rot: -0.04 }, B, 110);
      riseIn('11월 12일 애프터마켓 160달러 기준', 1560, 760, { size: 30, w: 700, color: C.cream }, B, 110.5);
    } else if (B >= 104) {
      riseIn('10월 6일 고점', 1560, 330, { size: 64, f: 'han', color: C.cream }, B, 104);
      popIn('$239', 1560, 480, { size: 210, f: 'ant', color: C.mustard, sh: C.ink, sd: 10 }, B, 104);
      if (B >= 105.5) { arrow(1560, 600, 1560, 760, C.cream, 16, 44, Ease.outCubic(pr(B, 105.5, 106.2))); }
    }
    if (B >= 110) slamIn('스캔들에 흔들린 대장주', CX - 300, 950, { size: 84, f: 'han', color: C.cream, sh: C.ink, sd: 6 }, B, 110.75, 1.5);
  });
  // --- AMD (112–128)
  group(B, 112, 124, () => {
    card(90, 140, 1120, 700, B, 112, () => {
      stockChart(B, {
        key: 'AMD', x: 90, y: 140, w: 1120, h: 700, b0: 112.5, dur: 3, col: C.green, name: 'AMD', tick: 'AMD', u: '$', note: '일별 종가 · 8/28~11/11',
        marks: [{ at: 'min', b: 116, text: '저점 $404.40 (11/5)', dy: 56, dx: -150 }, { at: 'last', b: 117.5, text: '$552.92 (11/11)', dy: -58, dx: -110 }],
      });
    }, { rot0: 0.05 });
    if (B >= 120) {
      slamIn('+38%', 1565, 420, { size: 250, f: 'ant', color: C.mustard, sh: C.ink, sd: 14 }, B, 120, 3);
      riseIn('저점 대비', 1560, 200, { size: 64, f: 'han', color: C.cream }, B, 120.3);
      sticker('급등', 1560, 640, { size: 90, fill: C.cream, color: C.green, rot: 0.04 }, B, 120.75);
      confetti(B, 120, 1560, 420, { n: 46, v1: 1200 });
    } else if (B >= 116) {
      riseIn('11월 5일 저점에서', 1560, 330, { size: 60, f: 'han', color: C.cream }, B, 116);
      if (B >= 117.5) arrow(1560, 760, 1560, 440, C.mustard, 18, 50, Ease.outCubic(pr(B, 117.5, 118.3)));
    }
    if (B >= 122.5) slamIn('엔비디아 반사 수혜주로 부각', CX - 300, 950, { size: 84, f: 'han', color: C.cream, sh: C.ink, sd: 6 }, B, 122.5, 1.5);
  });
  group(B, 124, 128, () => {
    // diverging lines since 11/5
    const x = 240, y = 170, w = 1440, h = 640;
    card(x, y, w, h, B, 124, () => {
      text('11월 5일 종가 = 100', x + 40, y + 58, { size: 44, f: 'han', align: 'left', color: C.ink });
      text('엔비디아와 AMD, 같은 날에서 갈라지다', x + w - 40, y + 60, { size: 28, w: 700, align: 'right', color: C.inkD });
      const px = x + 110, pw = w - 420, py = y + 120, ph = h - 200;
      const X = (i) => px + (i / 4) * pw, Y = (v) => py + ph - ((v - 82) / (142 - 82)) * ph;
      g.strokeStyle = C.inkS; g.lineWidth = 3; g.setLineDash([8, 8]); line(px, Y(100), px + pw, Y(100)); g.setLineDash([]);
      text('100', px - 14, Y(100), { size: 24, w: 700, align: 'right', color: C.inkS });
      IDX.amd.forEach((r, i) => text(mdK(r[0]), X(i), py + ph + 34, { size: 24, w: 700, color: C.inkS }));
      const p = Ease.inOutCubic(pr(B, 124.2, 126));
      [[IDX.amd, C.green], [IDX.nv, C.red]].forEach(([ser, col]) => {
        const pts = ser.map((r, i) => [X(i), Y(r[1])]);
        g.strokeStyle = col; g.lineWidth = 10; g.lineJoin = 'round'; g.lineCap = 'round';
        const hd = polyPartial(pts, p); g.lineJoin = 'miter'; g.lineCap = 'butt';
        circle(hd[0], hd[1], 16, C.ink); circle(hd[0], hd[1], 9, col);
      });
      const la = IDX.amd[IDX.amd.length - 1][1], ln = IDX.nv[IDX.nv.length - 1][1];
      sticker('AMD 상승', px + pw + 150, Y(la), { size: 46, fill: C.green, color: C.cream, rot: -0.03 }, B, 126);
      sticker('엔비디아 하락', px + pw + 160, Y(ln), { size: 46, fill: C.red, color: C.cream, rot: 0.03 }, B, 127.5);
    });
    riseIn('한쪽이 흔들리면, 돈은 옆자리로 옮겨 간다', CX, 920, { size: 60, f: 'han', color: C.cream }, B, 126);
  });
  // --- 브로드컴 (128–136)
  group(B, 128, 136, () => {
    card(90, 140, 1120, 700, B, 128, () => {
      stockChart(B, {
        key: 'AVGO', x: 90, y: 140, w: 1120, h: 700, b0: 128.5, dur: 2, col: C.violet, name: '브로드컴', tick: 'AVGO', u: '$', note: '일별 종가 · 8/28~11/10',
        marks: [{ at: 'min', b: 131.5, text: '저점 $291.53 (11/5)', dy: 56, dx: -150 }, { at: 'last', b: 131.5, text: '$331.98 (11/10)', dy: -58, dx: -110 }],
      });
    });
    riseIn('브로드컴도', 1560, 300, { size: 80, f: 'han', color: C.cream }, B, 130.5);
    if (B >= 132) {
      slamIn('스캔들', 1560, 470, { size: 170, f: 'han', color: C.mustard, sh: C.ink, sd: 10 }, B, 132);
      slamIn('수혜주', 1560, 660, { size: 170, f: 'han', color: C.cream, sh: C.ink, sd: 10 }, B, 132.75);
    }
    if (B >= 134) slamIn('엔비디아 스캔들의 반사이익', CX - 300, 950, { size: 84, f: 'han', color: C.cream, sh: C.ink, sd: 6 }, B, 134, 1.5);
  });
  // --- 캠브리콘 (136–144)
  group(B, 136, 144, () => {
    card(90, 140, 1000, 640, B, 136, () => {
      stockChart(B, { key: 'CAMB', x: 90, y: 140, w: 1000, h: 640, b0: 136.5, dur: 1.5, col: C.red, name: '캠브리콘', tick: '688256 · 상하이', u: 'Y', note: '일별 종가(위안) · 8/28~10/20' });
    });
    const steps = [['엔비디아 수출 통제', C.cream, C.ink, 138], ['중국 내 반도체 수요 증가 기대', C.mustard, C.ink, 139.5], ['캠브리콘 급등', C.ink, C.cream, 140.5]];
    steps.forEach(([s, fill, col, b], i) => {
      sticker(s, 1500, 250 + i * 200, { size: i === 2 ? 76 : fitSize(s, 620, 54, 800, 'han'), fill, color: col, rot: i % 2 ? 0.03 : -0.03 }, B, b);
      if (i < 2 && B >= steps[i + 1][3]) arrow(1500, 315 + i * 200, 1500, 375 + i * 200, C.cream, 12, 30, pr(B, steps[i + 1][3], steps[i + 1][3] + 0.3));
    });
    riseIn('중국 본토의 AI 반도체 대표주', CX - 370, 900, { size: 60, f: 'han', color: C.cream }, B, 137);
  }, { dout: 0.3 });
}

/* ============================================================
   144–192  ④ 삼성전자
   ============================================================ */
hits('pop', 148, 156, 157.5, 158.5, 164, 165.5, 169.5, 170.5, 172, 173.5, 176, 177.5);
hits('stab', 149.5, 160, 166.5, 168, 174.5, 180, 186.5);
hits('thud', 152, 188);
hits('whoosh', [148.5, 2.5], [182, 1]);
hits('clav', 153.5, 161.5, 162.5);
hits('run', [182.5, 1.5]);
hits('boom', 184);
function chip(x, y, s, col) {                                       // little IC glyph
  g.fillStyle = C.ink;
  for (let i = -2; i <= 2; i++) { g.fillRect(x + i * s * 0.2 - s * 0.04, y - s * 0.62, s * 0.08, s * 1.24); g.fillRect(x - s * 0.62, y + i * s * 0.2 - s * 0.04, s * 1.24, s * 0.08); }
  g.fillStyle = C.ink; rr(x - s * 0.5, y - s * 0.5, s, s, s * 0.14); g.fill();
  g.fillStyle = col; rr(x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8, s * 0.08); g.fill();
}
function spark(key, x, y, w, h, col) {                           // small price line, 8/28 → last close
  const S = series(key), lo = Math.min(...S.v), hi = Math.max(...S.v);
  g.strokeStyle = col; g.lineWidth = 5; g.lineJoin = 'round';
  g.beginPath(); S.v.forEach((v, i) => { const xx = x + (S.d[i] / DAYN) * w, yy = y + h - ((v - lo) / (hi - lo)) * h; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }); g.stroke(); g.lineJoin = 'miter';
  text('주가 8/28~' + mdK(S.rows[S.n - 1][0]), x, y + h + 26, { size: 22, w: 700, align: 'left', color: C.inkS });
}
function sSamsung(B, t, F) {
  // --- 차트 + 지분 (148–156)
  group(B, 148, 156, () => {
    card(90, 140, 1060, 680, B, 148, () => {
      stockChart(B, { key: 'SEC', x: 90, y: 140, w: 1060, h: 680, b0: 148.5, dur: 2.5, col: C.blue, name: '삼성전자', tick: '005930', u: 'W', note: '일별 종가 · 8/28~11/6' });
    });
    riseIn('또 다른 수혜주', 1540, 250, { size: 70, f: 'han', color: C.mustard }, B, 148);
    slamIn('삼성전자', 1540, 420, { size: 170, f: 'han', color: C.cream, sh: C.ink, sd: 10 }, B, 149.5);
    if (B >= 152) {
      const p = pr(B, 152, 152.35), sc = lerp(3, 1, Ease.outExpo(p));
      g.save(); g.translate(1540, 670); g.rotate(-0.08); g.scale(sc, sc); g.globalAlpha *= Math.min(1, p * 4);
      g.fillStyle = C.ink; rr(-280 + 10, -100 + 10, 560, 200, 24); g.fill();
      g.fillStyle = C.mustard; rr(-280, -100, 560, 200, 24); g.fill();
      text('앤트로픽', 0, -36, { size: 56, f: 'han', color: C.ink });
      text('지분 보유', 0, 42, { size: 84, f: 'han', color: C.ink });
      g.restore();
    }
    riseIn('상장하는 회사의 주주라는 것', CX - 380, 930, { size: 60, f: 'han', color: C.cream }, B, 153.5);
  });
  // --- 체인 (156–164)
  group(B, 156, 164, () => {
    text('앤트로픽에서 삼성전자까지', CX, 200, { size: 80, f: 'han', color: C.cream });
    const nodes = [['앤트로픽', 'Claude', C.orange, C.cream, 156], ['구글 TPU', 'AI 가속기', C.cream, C.ink, 157.5], ['HBM', '고대역폭 메모리', C.mustard, C.ink, 158.5], ['삼성전자', '공급 비중 높음', C.plum, C.cream, 160]];
    const links = [['TPU 의존도 높음', 157.5], ['TPU에 탑재', 158.5], ['삼성 비중 높음', 160]];
    nodes.forEach(([nm, sub, col, fc, b], i) => {
      if (B < b) return;
      const x = 270 + i * 460, y = 520, sc = Ease.outBack(pr(B, b, b + 0.45), 2.4) * (1 + (B >= 161.5 ? 0.06 * Math.exp(-((B - 161.5 - i * 0.25) % 1 + 1) % 1 * 5) : 0));
      const big = i === 3;
      g.save(); g.translate(x, y); g.scale(sc, sc);
      const r = big ? 190 : 160;
      circle(10, 10, r, C.ink); circle(0, 0, r, col);
      g.strokeStyle = C.ink; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      if (i === 2) chip(0, -70, 70, C.cream);
      text(nm, 0, i === 2 ? 30 : -14, { size: big ? 76 : fitSize(nm, r * 1.6, 70, 800, 'han'), f: 'han', color: fc });
      text(sub, 0, i === 2 ? 90 : 50, { size: 28, w: 700, color: fc, alpha: 0.85 });
      g.restore();
    });
    links.forEach(([lb, b], i) => {
      if (B < b) return;
      const x0 = 270 + i * 460 + 170, x1 = 270 + (i + 1) * 460 - (i === 2 ? 200 : 170), p = Ease.outCubic(pr(B, b - 0.0, b + 0.4));
      arrow(x0, 520, x1, 520, C.cream, 12, 30, p);
      sticker(lb, (x0 + x1) / 2 + 0, 300 + (i % 2) * 0, { size: 32, f: 'sans', w: 800, fill: C.ink, color: C.cream, sd: 0, h: 54, rot: i % 2 ? 0.03 : -0.03 }, B, b + 0.1);
      g.strokeStyle = C.cream; g.lineWidth = 3; g.setLineDash([6, 6]); line((x0 + x1) / 2, 330, (x0 + x1) / 2, 505); g.setLineDash([]);
    });
    if (B >= 161.5) {
      slamIn('앤트로픽이 클수록', CX - 400, 880, { size: 96, f: 'han', color: C.cream, sh: C.ink, sd: 7 }, B, 161.5, 1.6);
      slamIn('삼성 HBM도 큰다', CX + 420, 880, { size: 96, f: 'han', color: C.mustard, sh: C.ink, sd: 7 }, B, 162.5, 1.6);
    }
  });
  // --- 리사 수 (164–172)
  group(B, 164, 172, () => {
    text('2026', 150, 210, { size: 120, f: 'ant', align: 'left', color: C.cream });
    text('삼성전자 × AMD CEO 리사 수', 420, 214, { size: 64, f: 'han', align: 'left', color: C.cream });
    for (let m = 1; m <= 12; m++) {
      const hot = (m === 3 && B >= 164) || (m === 10 && B >= 165.5), hb = m === 3 ? 164 : 165.5;
      const x = 150 + (m - 1) * 136, y = 330, w = 120, h = hot ? 250 : 150;
      const sc = hot ? Ease.outBack(pr(B, hb, hb + 0.4), 2.6) : 1;
      g.save(); g.translate(x + w / 2, y + 75); g.scale(lerp(1, sc, hot ? 1 : 0), lerp(1, sc, hot ? 1 : 0)); g.rotate(hot ? (m === 3 ? -0.04 : 0.04) : 0); g.translate(-(x + w / 2), -(y + 75));
      g.fillStyle = C.ink; rr(x + 7, y + 7, w, h, 16); g.fill();
      g.fillStyle = hot ? C.mustard : 'rgba(246,234,208,0.85)'; rr(x, y, w, h, 16); g.fill();
      text(m + '월', x + w / 2, y + 74, { size: hot ? 56 : 44, f: 'han', color: C.ink, alpha: hot ? 1 : 0.55 });
      if (hot) { text('미팅', x + w / 2, y + 160, { size: 46, f: 'han', color: C.orange }); text(m === 3 ? '1차' : '2차', x + w / 2, y + 214, { size: 26, w: 800, color: C.inkD }); }
      g.restore();
    }
    if (B >= 166.5) {
      const e = Ease.outExpo(pr(B, 166.5, 167.1));
      const xa = lerp(200, 430, e), xb = lerp(1720, 1490, e), y = 800;
      g.strokeStyle = C.cream; g.lineWidth = 8; g.setLineDash([4, 16]); g.lineCap = 'round'; line(xa + 130, y, xb - 130, y); g.setLineDash([]); g.lineCap = 'butt';
      circle(xa + 8, y + 8, 120, C.ink); circle(xa, y, 120, C.cream); text('삼성전자', xa, y + 4, { size: 48, f: 'han', color: C.blue });
      circle(xb + 8, y + 8, 120, C.ink); circle(xb, y, 120, C.cream); text('AMD', xb, y + 6, { size: 76, f: 'ant', color: C.ink });
      if (B >= 168) {
        slamIn('협업 모색', CX, 690, { size: 120, f: 'han', color: C.mustard, sh: C.ink, sd: 8 }, B, 168);
        sticker('메모리', CX - 170, 880, { size: 70, fill: C.cream, color: C.ink, rot: -0.04 }, B, 169.5);
        sticker('파운드리', CX + 180, 880, { size: 70, fill: C.orange, color: C.cream, rot: 0.04 }, B, 170.5);
      }
    }
  });
  // --- 하이닉스 vs 삼성 (172–180)
  group(B, 172, 180, () => {
    const dim = B >= 176 ? Ease.outCubic(pr(B, 176, 176.6)) : 0;
    // left: SK hynix
    card(110, 170, 780, 700, B, 172, () => {
      g.save(); g.globalAlpha *= 1 - dim * 0.35;
      text('SK하이닉스', 150, 240, { size: 76, f: 'han', align: 'left', color: C.ink });
      text('고객 축', 150, 330, { size: 34, w: 800, align: 'left', color: C.inkD });
      sticker('엔비디아', 150, 420, { size: 80, fill: C.red, color: C.cream, align: 'left', sd: 6 }, null);
      text('의존도 높음', 150, 540, { size: 60, f: 'han', align: 'left', color: C.ink });
      spark('HYNIX', 150, 610, 480, 110, C.red);
      g.restore();
      if (B >= 176) { arrow(720, 640, 720, 800, C.red, 22, 56, Ease.outCubic(pr(B, 176, 176.6))); text('엔비디아와 함께 흔들림', 150, 800, { size: 38, f: 'han', align: 'left', color: C.red, alpha: pr(B, 176, 176.5) }); }
    }, { rot0: -0.05 });
    // right: Samsung
    card(1030, 170, 780, 700, B, 173.5, () => {
      text('삼성전자', 1070, 240, { size: 76, f: 'han', align: 'left', color: C.ink });
      text('고객 축', 1070, 330, { size: 34, w: 800, align: 'left', color: C.inkD });
      sticker('AMD', 1070, 420, { size: 80, f: 'ant', fill: C.green, color: C.cream, align: 'left', sd: 6 }, null);
      sticker('구글 TPU', 1310, 420, { size: 72, fill: C.mustard, color: C.ink, align: 'left', sd: 6 }, null);
      text('쪽에 강점', 1070, 540, { size: 60, f: 'han', align: 'left', color: C.ink });
      spark('SEC', 1070, 610, 480, 110, C.blue);
      if (B >= 177.5) { arrow(1640, 800, 1640, 640, C.green, 22, 56, Ease.outCubic(pr(B, 177.5, 178.1))); text('수혜주 쪽에 서 있다', 1070, 800, { size: 38, f: 'han', align: 'left', color: C.green, alpha: pr(B, 177.5, 178) }); }
    }, { rot0: 0.05 });
    if (B >= 174.5) {
      const sc = Ease.outBack(pr(B, 174.5, 174.95), 2.6);
      g.save(); g.translate(CX, 520); g.scale(sc, sc); g.rotate(-0.08);
      circle(8, 8, 96, C.ink); circle(0, 0, 96, C.orange); text('VS', 0, 8, { size: 110, f: 'ant', color: C.cream });
      g.restore();
    }
    riseIn('같은 메모리, 다른 줄', CX, 960, { size: 64, f: 'han', color: C.cream }, B, 178.5);
  });
  // --- 평가차익 (180–192)
  group(B, 180, 192, () => {
    slamIn('5월 시리즈H에 1조 원을 넣었다면?', CX, 210, { size: 100, f: 'han', color: C.cream, sh: C.ink, sd: 7 }, B, 180, 1.5);
    sticker('가정', 1750, 120, { size: 40, fill: C.mustard, color: C.ink, rot: 0.08 }, B, 180.5);
    const bx = 200, by = 420, bh = 190, unit = 760;                   // 1조 = 760px
    if (B >= 182) {
      const p1 = Ease.outExpo(pr(B, 182, 182.8));
      g.fillStyle = C.ink; rr(bx + 10, by + 10, unit * p1, bh, 20); g.fill();
      g.fillStyle = C.cream; rr(bx, by, unit * p1, bh, 20); g.fill();
      if (p1 > 0.7) { text('투자 원금', bx + 40, by + 60, { size: 40, f: 'han', align: 'left', color: C.inkD }); text('1조 원', bx + 40, by + 130, { size: 84, f: 'han', align: 'left', color: C.ink }); }
      const p2 = B < 184 ? Ease.inQuad(pr(B, 182.5, 184)) : 1, gw = unit * 0.5 * p2;
      if (p2 > 0) {
        g.fillStyle = C.ink; rr(bx + unit + 10, by + 10, gw, bh, 20); g.fill();
        g.fillStyle = C.mustard; rr(bx + unit, by, gw, bh, 20); g.fill();
        g.strokeStyle = C.ink; g.lineWidth = 5; rr(bx + unit, by, gw, bh, 20); g.stroke();
      }
      if (B >= 184) { text('평가차익', bx + unit + 30, by + 60, { size: 40, f: 'han', align: 'left', color: C.inkD }); text('+5,000억', bx + unit + 30, by + 130, { size: 76, f: 'han', align: 'left', color: C.ink }); }
    }
    if (B >= 182.5) {
      const v = B < 184 ? Math.round(lerp(0, 5000, Ease.inQuad(pr(B, 182.5, 184))) / 100) * 100 : 5000;
      const lock = B >= 184 ? 1 + 0.14 * Math.exp(-(B - 184) * 4) : 1;
      g.save(); g.translate(CX, 800); g.scale(lock, lock);
      text('평가차익 약', -640, 20, { size: 80, f: 'han', align: 'left', color: C.cream });
      numUnit(fmt(v), '억 원', -180 + 8, 90 + 8, { size: 260, f: 'ant', unitSize: 110, uf: 'han', align: 'left', color: C.ink, gap: 18 });
      numUnit(fmt(v), '억 원', -180, 90, { size: 260, f: 'ant', unitSize: 110, uf: 'han', align: 'left', color: C.mustard, unitColor: C.cream, gap: 18 });
      g.restore();
      if (B >= 184) confetti(B, 184, CX + 200, 760, { n: 60, v1: 1500 });
    }
    sticker('1조 원 투자 기준 추정', 1590, 330, { size: 44, fill: C.ink, color: C.cream, rot: -0.04 }, B, 186.5);
    if (B >= 188) {
      const p = pr(B, 188, 188.35), sc = lerp(3, 1, Ease.outExpo(p));
      g.save(); g.translate(1640, 690); g.rotate(0.1); g.scale(sc, sc); g.globalAlpha *= Math.min(1, p * 4);
      g.strokeStyle = C.mustard; g.lineWidth = 10; rr(-170, -70, 340, 140, 18); g.stroke();
      text('지분 가치 ↑', 0, 4, { size: 60, f: 'han', color: C.mustard });
      g.restore();
    }
  }, { dout: 0.3 });
}

/* ============================================================
   192–220  OUTRO
   ============================================================ */
hits('stab', 193.5, 205.5);
hits('pop', 196, 198, 200, 202);
hits('big', 204);
function sOutro(B, t, F) {
  const up = Ease.inOutCubic(pr(B, 195.3, 196.1));
  const fin = B >= 208;
  // the two days
  g.save();
  const finUp = fin ? Ease.outExpo(pr(B, 208, 208.6)) : 0;
  g.translate(CX, lerp(lerp(470, 215, up), 370, finUp)); g.scale(lerp(lerp(1, 0.5, up), 0.8, finUp), lerp(lerp(1, 0.5, up), 0.8, finUp));
  [[18, '공모가 결정', C.orange, 192, -330], [19, '거래 개시', C.pink, 193.5, 330]].forEach(([d, lb, col, b, dx]) => {
    if (B < b) return;
    const p = pr(B, b, b + 0.4), sc = lerp(2.4, 1, Ease.outExpo(p)) * (1 + F.kick * 0.02);
    g.save(); g.translate(dx, 0); g.rotate(dx < 0 ? -0.04 : 0.04); g.scale(sc, sc); g.globalAlpha *= Math.min(1, p * 5);
    g.fillStyle = C.cream; rr(-280 + 14, -300 + 14, 560, 600, 36); g.fill();
    g.fillStyle = col; rr(-280, -300, 560, 600, 36); g.fill();
    g.fillStyle = C.ink; rr(-280, -300, 560, 110, 36); g.fill(); g.fillRect(-280, -240, 560, 50);
    text('11월', 0, -240, { size: 64, f: 'han', color: C.cream });
    text(String(d), 0, 20, { size: 380, f: 'ant', color: C.cream });
    text(lb, 0, 232, { size: 76, f: 'han', color: C.ink });
    g.restore();
  });
  g.restore();
  // recap
  if (B >= 196 && B < 208) {
    g.save(); g.globalAlpha *= 1 - pr(B, 207.5, 208);
    const rows = [
      ['01', '904억 달러 조달 · 1.4조 달러, 역대 최대 상장', C.mustard, 196],
      ['02', '나스닥 100은 200일선 위, 반도체 지수는 2% 남았다', C.teal, 198],
      ['03', '엔비디아 -30%대, AMD · 브로드컴 · 캠브리콘은 반사 수혜', C.orange, 200],
      ['04', '삼성전자: 지분 + TPU용 HBM + AMD 협업', C.blue, 202],
    ];
    rows.forEach(([n, s, col, b], i) => {
      if (B < b) return;
      const y = 430 + i * 104, e = Ease.outExpo(pr(B, b, b + 0.5));
      g.save(); g.translate((1 - e) * -500, 0); g.globalAlpha *= e;
      g.fillStyle = C.ink; rr(190 + 7, y - 42 + 7, 1540, 84, 42); g.fill();
      g.fillStyle = C.cream; rr(190, y - 42, 1540, 84, 42); g.fill();
      circle(232, y, 34, col); text(n, 232, y + 3, { size: 34, f: 'ant', color: col === C.mustard ? C.ink : C.cream });
      text(s, 290, y + 2, { size: fitSize(s, 1400, 42, 800, 'han'), f: 'han', align: 'left', color: C.ink });
      g.restore();
    });
    if (B >= 204) {
      slamIn('이틀의 결과가', CX, 868, { size: 80, f: 'han', color: C.cream, sh: C.orange, sd: 8 }, B, 204, 1.6);
      slamIn('AI 섹터의 온도를 정한다', CX, 968, { size: 100, f: 'han', color: C.mustard, sh: C.orange, sd: 8 }, B, 205.5, 1.6);
    }
    g.restore();
  }
  if (fin) {
    const a = 1 - pr(B, 217, 219.5);
    g.save(); g.globalAlpha *= a;
    slamIn('앤트로픽 상장', CX, 770, { size: 150, f: 'han', color: C.cream, sh: C.orange, sd: 10 }, B, 208, 1.8);
    riseIn('11월 18일 · 19일, 이틀을 지켜보자', CX, 905, { size: 56, f: 'han', color: C.mustard }, B, 209.5);
    riseIn('정보 제공용 콘텐츠이며 투자 권유가 아닙니다 · 주가 출처 stockanalysis.com 외', CX, 985, { size: 24, w: 600, color: C.cream, alpha: 0.7 }, B, 211);
    g.restore();
    if (B >= 216.5) { g.fillStyle = C.plum; g.globalAlpha = pr(B, 216.5, 219.5); g.fillRect(-100, -100, W + 200, H + 200); g.globalAlpha = 1; }
  }
}

/* ---------------- engine ---------------- */
const SCENES = [
  { b0: 0, b1: 16, f: sIntro },
  { b0: 16, b1: 32, f: sTitle },
  { b0: 36, b1: 64, f: sIPO },
  { b0: 68, b1: 96, f: sIndex },
  { b0: 100, b1: 144, f: sChips },
  { b0: 148, b1: 192, f: sSamsung },
  { b0: 192, b1: TOTAL_BEATS, f: sOutro },
];
function drawFrame(t) {
  const B = t / SPB;
  const F = { kick: env(KICKS, t, 9), snare: env(SNARES, t, 8), energy: energyAt(t) };
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.setLineDash([]); g.lineCap = 'butt'; g.lineJoin = 'miter';
  background(B, t, F);
  const cam = camera(B, t);
  g.save();
  g.translate(CX + cam.sx, CY + cam.sy); g.rotate(cam.r); g.scale(cam.z, cam.z); g.translate(-CX, -CY);
  for (const s of SCENES) if (B >= s.b0 && B < s.b1) s.f(B, t, F);
  g.restore();
  drawHUD(B, t, F);
  for (let k = 0; k < CH.length; k++) chapterCard(B, k);
  drawBeatBar(B);
  return postParams(B, t);
}
