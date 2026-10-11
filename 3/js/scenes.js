'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   B = t / SPB (time in beats). Cue sheet is shared with music.js
   ============================================================ */
let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };
const BREAKS = [16, 50, 128, 156, 204, 252, 304];               // drops after a half-beat of silence
const inBreak = (B) => BREAKS.some((b) => B >= b - 0.5 && B < b);

const SECT = [
  { b: 0, top: '#F7F5F0', bot: '#E8EEFF', cols: [C.blue, C.yellow, C.coral] },
  { b: 16, top: '#F7F5F0', bot: '#E6ECFF', cols: [C.blue, C.yellow, C.coral, C.mint] },
  { b: 32, top: '#F7F5F0', bot: '#FFF1DC', cols: [C.yellow, C.coral, C.blue] },
  { b: 64, top: '#F3FBF7', bot: '#DDF6EB', cols: [C.mint, C.yellow, C.sky] },
  { b: 96, top: '#F4F6FF', bot: '#E0E8FF', cols: [C.blue, C.sky, C.coral] },
  { b: 136, top: '#F7F4FF', bot: '#EAE3FF', cols: [C.violet, C.pink, C.mint] },
  { b: 168, top: '#FFF8F1', bot: '#FFE9D5', cols: [C.orange, C.blue, C.red] },
  { b: 208, top: '#FFF6F6', bot: '#FFE4E7', cols: [C.red, C.pink, C.yellow] },
  { b: 232, top: '#F1FBFC', bot: '#D9F3F6', cols: [C.teal, C.mint, C.sky] },
  { b: 272, top: '#FFFCF0', bot: '#FFF0C4', cols: [C.yellow, C.coral, C.blue] },
  { b: 304, top: '#F7F5F0', bot: '#E6ECFF', cols: [C.blue, C.yellow, C.coral, C.mint, C.violet] },
];
const sectAt = (B) => { let s = SECT[0]; for (const x of SECT) if (B >= x.b) s = x; return s; };

/* ---------------- background ---------------- */
let GRID = null;
function makeGrid() {
  const c = document.createElement('canvas'); c.width = W + 180; c.height = H + 180;
  const x = c.getContext('2d');
  x.strokeStyle = 'rgba(22,32,74,0.055)'; x.lineWidth = 2;
  for (let i = 0; i <= c.width; i += 90) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, c.height); x.stroke(); }
  for (let j = 0; j <= c.height; j += 90) { x.beginPath(); x.moveTo(0, j); x.lineTo(c.width, j); x.stroke(); }
  x.fillStyle = 'rgba(22,32,74,0.09)';
  for (let i = 0; i <= c.width; i += 90) for (let j = 0; j <= c.height; j += 90) x.fillRect(i - 3, j - 3, 6, 6);
  return c;
}
const SHAPES = Array.from({ length: 16 }, (_, i) => {
  const side = i % 4;
  const u = rnd(i, 3), v = rnd(i, 4);
  const x = side === 0 ? u * 260 : side === 1 ? W - u * 260 : 200 + v * (W - 400);
  const y = side === 2 ? u * 170 : side === 3 ? H - u * 170 : 150 + v * (H - 300);
  return { x, y, k: i % 5, s: 18 + rnd(i, 5) * 34, sp: 0.2 + rnd(i, 6) * 0.5, ph: rnd(i, 7) * TAU };
});
function shapes(t, cols, alpha, kick) {
  const a0 = g.globalAlpha;
  SHAPES.forEach((p, i) => {
    const x = p.x + Math.sin(t * p.sp + p.ph) * 40, y = p.y + Math.cos(t * p.sp * 0.8 + p.ph) * 30;
    const s = p.s * (1 + kick * 0.12), col = cols[i % cols.length], rot = t * p.sp * 0.6 + p.ph;
    g.globalAlpha = a0 * alpha;
    if (p.k === 0) circle(x, y, s * 0.5, col);
    else if (p.k === 1) { g.strokeStyle = col; g.lineWidth = s * 0.2; g.beginPath(); g.arc(x, y, s * 0.6, 0, TAU); g.stroke(); }
    else if (p.k === 2) plusSign(x, y, s, col, rot);
    else if (p.k === 3) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.beginPath(); g.moveTo(0, -s * 0.6); g.lineTo(s * 0.55, s * 0.4); g.lineTo(-s * 0.55, s * 0.4); g.closePath(); g.fill(); g.restore(); }
    else { g.save(); g.translate(x, y); g.rotate(rot * 0.5); g.strokeStyle = col; g.lineWidth = s * 0.18; g.lineCap = 'round'; g.beginPath(); for (let k = 0; k <= 12; k++) { const xx = -s + (k / 12) * s * 2, yy = Math.sin(k / 12 * TAU) * s * 0.3; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); g.restore(); g.lineCap = 'butt'; }
  });
  g.globalAlpha = a0;
}
function background(B, t, F) {
  const s = sectAt(B);
  const gr = g.createLinearGradient(0, 0, W * 0.3, H);
  gr.addColorStop(0, s.top); gr.addColorStop(1, s.bot);
  fillAll(gr);
  // soft color glows
  for (let i = 0; i < 3; i++) {
    const x = (0.15 + 0.35 * i) * W + Math.sin(t * 0.17 + i * 2) * 140, y = (i % 2 ? 0.85 : 0.2) * H + Math.cos(t * 0.13 + i) * 90;
    const r = 520 + 80 * F.kick;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, s.cols[i % s.cols.length] + '33'); rg.addColorStop(1, s.cols[i % s.cols.length] + '00');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.drawImage(GRID, -((t * 10) % 90) - 90, -((t * 6) % 90) - 90);
  const busy = B >= 64 && B < 304 ? 0.2 : 0.38;
  shapes(t, s.cols, busy, F.kick);
}

/* ---------------- camera & post ---------------- */
function camera(B, t) {
  const kick = env(KICKS, t, 10), imp = impactEnv(t, 5);
  let amp = imp * 7;
  let z = 1 + kick * 0.005 + imp * 0.008;
  let sx = Math.sin(t * 0.31) * 6, sy = Math.cos(t * 0.23) * 4;
  for (const b of BREAKS) { // tension: slow push-in during the riser, freeze in the gap
    if (B >= b - 3.5 && B < b) z += Ease.inQuad(pr(B, b - 3.5, b - 0.5)) * 0.025;
  }
  if (inBreak(B)) { amp = 0; sx *= 0.3; sy *= 0.3; }
  sx += vnoise(t * 16, 1) * amp; sy += vnoise(t * 16, 2) * amp;
  const r = vnoise(t * 8, 3) * amp * 0.0005;
  return { sx, sy, r, z };
}
const FLASHES = [[16, 0.9], [50, 0.7], [64, 0.3], [96, 0.25], [128, 0.8], [136, 0.25], [156, 0.9], [168, 0.25], [204, 0.75], [208, 0.2], [232, 0.25], [252, 0.8], [272, 0.25], [304, 0.9], [316, 0.45]];
function postParams(B, t) {
  const kick = env(KICKS, t, 12), imp = impactEnv(t, 4.5);
  let flash = 0;
  for (const [fb, s] of FLASHES) { const d = (B - fb) * SPB; if (d >= 0 && d < 0.8) flash = Math.max(flash, s * Math.exp(-d * 7)); }
  return { ca: 0.05 + imp * 0.4 + kick * 0.05, flash, bloom: 0.22, grain: 0.022, vig: 0.4, warm: 0.4 };
}

/* ---------------- layout helpers ---------------- */
// fade/slide group in at a, out at z
function group(B, a, z, fn, o = {}) {
  if (B < a || B >= z) return;
  const ein = Ease.outExpo(pr(B, a, a + (o.din || 0.7)));
  const eout = Ease.inCubic(pr(B, z - (o.dout || 0.45), z));
  g.save();
  g.globalAlpha *= Math.min(1, ein * 1.4) * (1 - eout);
  g.translate((1 - ein) * (o.dx || 0) + eout * (o.dxo || 0), (1 - ein) * (o.dy != null ? o.dy : 70) - eout * (o.dyo != null ? o.dyo : 40));
  fn(ein, eout);
  g.restore();
}
function fitSize(s, maxW, maxSize, w = 900) { return Math.min(maxSize, (maxW / textW(s, 100, w)) * 100); }
// "개념도" tag for illustrative charts
function conceptTag(x, y, a = 1) { pill('개념도', x, y, { size: 20, w: 700, fill: C.inkF, color: C.inkD, align: 'right', h: 34, padX: 14 }); }
// marker highlight behind a substring (draw before the text)
function marker(str, sub, x, y, o, p, col = C.yellow) {
  if (p <= 0) return;
  const [a, b] = subRange(str, sub, x, o);
  g.fillStyle = col; g.globalAlpha *= 0.85;
  rr(a - 8, y - o.size * 0.08, (b - a + 16) * Ease.outCubic(p), o.size * 0.5, 6); g.fill();
  g.globalAlpha /= 0.85;
}
// wrapped text (word wrap on spaces)
function wrapText(s, x, y, maxW, o, lh = 1.3) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (textW(tst, o.size, o.w || 800) > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => text(l, x, y + i * o.size * lh, Object.assign({ align: 'left' }, o)));
  return lines.length;
}

/* ---------------- transitions ---------------- */
// diagonal colour bands sweeping across (cover at b)
function bandsIn(B, b, cols, dur = 0.8) {
  if (B < b - dur || B >= b) return;
  cols.forEach((c, k) => {
    const p = Ease.inOutCubic(pr(B, b - dur + k * 0.12, b - 0.04 - (cols.length - 1 - k) * 0.02));
    if (p <= 0) return;
    const x = lerp(W + 500, -500, p);
    g.fillStyle = c;
    g.beginPath(); g.moveTo(x, -50); g.lineTo(W + 600, -50); g.lineTo(W + 600, H + 50); g.lineTo(x - 360, H + 50); g.closePath(); g.fill();
  });
}

/* ---------------- chapter card + header ---------------- */
function chapterCard(B, k) {
  const c = CH[k], b = c.b;
  if (B < b - 0.9 || B >= b + 4.4) return;
  const fg = c.ink ? C.ink : C.white;
  if (B < b) { bandsIn(B, b, [C.white, c.ink ? C.coral : C.yellow, c.col], 0.9); return; }
  const out = Ease.inOutCubic(pr(B, b + 3.5, b + 4.3));
  g.save();
  g.translate(0, -out * (H + 200));
  fillAll(c.col);
  // diagonal stripes texture
  g.save(); g.globalAlpha = 0.08; g.fillStyle = fg;
  for (let i = -4; i < 14; i++) { const x = i * 200 + ((B * SPB * 40) % 200); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x - 330, H); g.lineTo(x - 400, H); g.closePath(); g.fill(); }
  g.restore();
  // giant number
  const np = Ease.outExpo(pr(B, b, b + 0.8));
  text(c.n, W - 110 + (1 - np) * 300, CY + 60, { size: 600, w: 900, color: fg, alpha: 0.16 * np, align: 'right', ls: -30 });
  // shapes
  for (let i = 0; i < 6; i++) {
    const p = popE(B, b + 0.2 + i * 0.12, 0.5, 2);
    if (p <= 0) continue;
    const x = 1200 + rnd(i, 61) * 600, y = 140 + rnd(i, 62) * 800, s = (24 + rnd(i, 63) * 30) * p;
    g.globalAlpha = 0.35;
    if (i % 3 === 0) plusSign(x, y, s, fg, B * 0.3 + i); else if (i % 3 === 1) { g.strokeStyle = fg; g.lineWidth = s * 0.2; g.beginPath(); g.arc(x, y, s * 0.6, 0, TAU); g.stroke(); } else circle(x, y, s * 0.35, fg);
    g.globalAlpha = 1;
  }
  revealUp(`10월 시장 점검  ·  PART ${c.n}`, 160, 330, { size: 30, w: 700, color: fg, align: 'left', ls: 2 }, B, b + 0.05, 0.6, 0.01);
  const ts = fitSize(c.name, 1500, 190);
  slam(c.name, 160, 495, { size: ts, w: 900, color: fg, align: 'left' }, B, b + 0.15, 0.4, 0.05, 1.8);
  const lw = textW(c.name, ts, 900);
  const lp = Ease.outExpo(pr(B, b + 0.6, b + 1.3));
  g.fillStyle = fg; g.fillRect(160, 495 + ts * 0.5 + 18, lw * lp, 10);
  const ss = fitSize(c.sub, 1560, 64, 700);
  revealUp(c.sub, 160, 495 + ts * 0.5 + 100, { size: ss, w: 700, color: fg, align: 'left' }, B, b + 0.9, 0.7, 0.012);
  g.restore();
}
function chapterHeader(B, k) {
  const c = CH[k];
  if (B < c.b + 3.6 || B >= c.e) return;
  const ein = Ease.outBack(pr(B, c.b + 3.6, c.b + 4.3), 1.6), eout = Ease.inCubic(pr(B, c.e - 0.4, c.e));
  g.save();
  g.globalAlpha = clamp(ein) * (1 - eout);
  g.translate(-(1 - ein) * 80, 0);
  circle(118, 100, 38, c.col);
  text(c.n, 118, 102, { size: 32, w: 900, color: c.ink ? C.ink : C.white, ls: -1 });
  text(c.name, 176, 84, { size: 40, w: 900, align: 'left' });
  const ss = Math.min(27, fitSize(c.sub, 1250, 27, 600));
  text(c.sub, 177, 128, { size: ss, w: 600, color: C.inkD, align: 'left' });
  g.restore();
}

/* ---------------- HUD + tracker ---------------- */
function drawHUD(B) {
  if (B < 16.5 || B >= 318) return;
  const a = win(B, 16.5, 318, 0.6, 1);
  g.save(); g.globalAlpha = a;
  text('10월 시장 점검', W - 92, 78, { size: 24, w: 800, align: 'right' });
  text('2026.10 · 흔들리지 말아야 할 이유', W - 92, 110, { size: 18, w: 600, color: C.inkD, align: 'right' });
  const cols = [C.blue, C.yellow, C.coral, C.mint];
  cols.forEach((c, i) => circle(W - 92 - i * 16, 140, 4.5, c));
  g.restore();
}
const TRK = ['실적', '금리·FOMC', '중간선거', '데이터센터', '중국', '코스피', '리스크'];
function drawTracker(B) {
  if (B < 64 || B >= 304.5) return;
  const inA = Ease.outCubic(pr(B, 64, 65)), out = Ease.inCubic(pr(B, 303.5, 304.5));
  const segW = 200, gap = 14, tot = segW * 7 + gap * 6, x0 = CX - tot / 2, y = 1044 + (1 - inA) * 60 + out * 60;
  g.save();
  g.globalAlpha = 1 - out;
  for (let i = 0; i < 7; i++) {
    const c = CH[i], x = x0 + i * (segW + gap);
    const fp = clamp((B - c.b) / (c.e - c.b)), active = B >= c.b && B < c.e;
    rr(x, y - 5, segW, 10, 5); g.fillStyle = 'rgba(22,32,74,0.10)'; g.fill();
    if (fp > 0) { rr(x, y - 5, Math.max(10, segW * fp), 10, 5); g.fillStyle = c.col; g.fill(); }
    text(TRK[i], x + 2, y - 22, { size: 18, w: active ? 800 : 600, color: active ? C.ink : C.inkS, align: 'left' });
  }
  g.restore();
}

/* ---------------- shared drawings ---------------- */
// tear-off desk calendar page
function calPage(pg, w, h) {
  g.fillStyle = C.white; rr(-w / 2, -h / 2, w, h, 34); g.fill();
  g.save(); rr(-w / 2, -h / 2, w, h, 34); g.clip(); g.fillStyle = pg.col; g.fillRect(-w / 2, -h / 2, w, 150); g.restore();
  text(pg.head, 0, -h / 2 + 90, { size: 38, w: 800, color: C.white, ls: 6 });
  text(pg.big, 0, 46, { size: pg.bigSize || 270, w: 900, color: pg.bigCol || C.ink, ls: -8 });
  if (pg.small) text(pg.small, 0, h / 2 - 66, { size: 38, w: 700, color: C.inkD });
}
// pages: [old, new]; flipP 0..1 = old page flying away
function deskCal(cx, cy, s, pages, flipP = 0, rot = 0) {
  const w = 520, h = 600;
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(s, s);
  g.fillStyle = SH; rr(-w / 2 + 8, -h / 2 + 26, w, h, 34); g.fill();
  g.fillStyle = '#E4E2DC'; rr(-w / 2, -h / 2 + 12, w, h, 34); g.fill();
  if (pages[1] && flipP > 0) calPage(pages[1], w, h);
  if (flipP < 1) {
    g.save();
    const e = Ease.inCubic(flipP);
    g.translate(e * 260, -e * 520); g.rotate(-e * 0.9); g.globalAlpha *= 1 - Ease.inQuad(flipP);
    calPage(pages[0], w, h);
    g.restore();
  }
  g.fillStyle = C.ink; rr(-w / 2 + 40, -h / 2 - 22, w - 80, 44, 22); g.fill();
  [-140, 140].forEach((x) => { circle(x, -h / 2 - 1, 15, '#F7F5F0'); });
  g.restore();
}
// month grid inside a panel. first = weekday of day 1 (0 = Sun)
function monthGrid(o) {
  const cw = (o.w - 60) / 7, x0 = o.x + 30, hy = o.y + 138, gy = hy + 34, ch = o.ch || 110;
  const cell = (d) => { const idx = o.first + d - 1; return { cx: x0 + cw * ((idx % 7) + 0.5), cy: gy + ch * (Math.floor(idx / 7) + 0.5), cw, ch }; };
  return { cell, cw, ch, x0, hy, gy };
}
function drawMonth(B, o) {
  panel(o.x, o.y, o.w, o.h);
  text(o.title, o.x + 40, o.y + 72, { size: o.ts || 52, w: 900, align: 'left' });
  if (o.sub) text(o.sub, o.x + o.w - 40, o.y + 74, { size: 26, w: 700, color: C.inkD, align: 'right' });
  const M = monthGrid(o);
  ['일', '월', '화', '수', '목', '금', '토'].forEach((d, i) => text(d, M.x0 + M.cw * (i + 0.5), M.hy, { size: 26, w: 700, color: i === 0 ? C.red : i === 6 ? C.blue : C.inkS }));
  for (let d = 1; d <= o.days; d++) {
    const c = M.cell(d), col = (o.first + d - 1) % 7, row = Math.floor((o.first + d - 1) / 7);
    const ap = o.appear ? o.appear(d, row, col) : 1;
    if (ap <= 0) continue;
    const fill = o.fill ? o.fill(d) : null;
    g.save(); g.translate(c.cx, c.cy); g.scale(ap, ap);
    if (fill) { g.fillStyle = fill; rr(-c.cw / 2 + 5, -c.ch / 2 + 5, c.cw - 10, c.ch - 10, 16); g.fill(); }
    text(String(d), 0, 0, { size: o.ds || 40, w: 700, color: col === 0 ? C.red : col === 6 ? C.blue : C.ink, ls: -1 });
    g.restore();
  }
  return M;
}
// callout pin: a label card pointing at (px,py)
function callout(px, py, x, y, title, sub, col, p, link = true) {
  if (p <= 0) return;
  g.save(); g.globalAlpha *= clamp(p * 2);
  if (link) {
    g.strokeStyle = col; g.lineWidth = 4; g.setLineDash([8, 8]);
    line(px, py, lerp(px, x, Ease.outCubic(clamp(p * 1.5))), lerp(py, y, Ease.outCubic(clamp(p * 1.5))));
    g.setLineDash([]);
  }
  const s = Ease.outBack(clamp(p), 2);
  g.translate(x, y); g.scale(s, s);
  const tw = Math.max(textW(title, 44, 900), sub ? textW(sub, 26, 700) : 0) + 56, th = sub ? 124 : 80;
  panel(-tw / 2, -th / 2, tw, th, { r: 22 });
  g.fillStyle = col; rr(-tw / 2, -th / 2, 12, th, 6); g.fill();
  text(title, 6, sub ? -20 : 2, { size: 44, w: 900, color: col });
  if (sub) text(sub, 6, 30, { size: 26, w: 700, color: C.inkD });
  g.restore();
}
// rounded data-center building
function dataCenter(x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s, s);
  panel(-150, -120, 300, 240, { r: 24, fill: C.white, stroke: col, lw: 6 });
  for (let r = 0; r < 3; r++) {
    g.fillStyle = col + '22'; rr(-120, -95 + r * 72, 240, 52, 10); g.fill();
    for (let k = 0; k < 4; k++) circle(-95 + k * 22, -69 + r * 72, 6, k % 2 ? C.mint : col);
    g.fillStyle = col; g.fillRect(20, -76 + r * 72, 80, 6); g.fillRect(20, -64 + r * 72, 56, 6);
  }
  g.restore();
}
function ballot(x, y, s, col, tick) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = SH; rr(-30, -18, 60, 52, 10); g.fill();
  g.fillStyle = col; rr(-30, -24, 60, 52, 10); g.fill();
  g.fillStyle = C.white; rr(-14, -46, 28, 32, 4); g.fill();
  g.fillStyle = C.ink; g.fillRect(-20, -20, 40, 6);
  if (tick) checkMark(0, -32, 18, col, 1, 9);
  g.restore();
}
function coin(x, y, r, col) {
  circle(x, y, r, col); circle(x, y, r * 0.72, C.white + '55');
  text('$', x, y + 1, { size: r * 1.15, w: 900, color: C.white });
}

/* ============================================================
   INTRO (B0–16): tear-off calendar, topics orbit in, break
   ============================================================ */
const TOPICS = [
  { s: '실적시즌', col: C.mint, x: 420, y: 300, b: 6 },
  { s: '10년물 5.3%', col: C.coral, x: 1500, y: 290, b: 7 },
  { s: 'FOMC 10.28', col: C.blue, x: 370, y: 640, b: 8 },
  { s: '중간선거 11.3', col: C.violet, x: 1560, y: 630, b: 9 },
  { s: '중국 바닥론', col: C.red, x: 600, y: 900, b: 10 },
  { s: '코스피', col: C.teal, x: 1340, y: 900, b: 11 },
];
function sIntro(B, t, F) {
  // marquee ghost text
  const mq = 'S&P500  ·  미 10년물  ·  FOMC  ·  중간선거  ·  데이터센터  ·  상하이종합  ·  코스피  ·  ';
  const mw = textW(mq, 130, 900);
  for (let r = 0; r < 2; r++) {
    const off = ((t * (r ? -60 : 50)) % mw + mw) % mw;
    for (let k = -1; k < 2; k++) text(mq, -off + k * mw, r ? 980 : 110, { size: 130, w: 900, color: C.ink, alpha: 0.05, align: 'left' });
  }
  const pull = Ease.inCubic(pr(B, 12.5, 15.5));
  const sIn = popE(B, 0, 0.7, 1.6);
  const tick = Math.floor(B), sw = (tick % 2 ? 1 : -1) * Math.exp(-(B - tick) * 5) * 0.025;
  const shake = B >= 12 && B < 15.5 ? vnoise(t * 30, 9) * pr(B, 12, 15.5) * 0.04 : 0;
  const flipP = pr(B, 3.5, 4.6);
  const pages = [
    { head: 'SEPTEMBER 2026', col: C.inkS, big: '30', small: '9월 · 수요일', bigSize: 280 },
    { head: 'OCTOBER 2026', col: C.blue, big: '10월', small: '실적시즌 · FOMC · 중간선거', bigCol: C.blue, bigSize: 230 },
  ];
  deskCal(CX, CY + 10, sIn * (1 + pull * 0.16), pages, flipP, B < 15.5 ? sw + shake : 0);
  ring(B, 4, CX, CY, { col: C.blue, r: 600, lw: 14, alpha: 0.4 });
  for (const tp of TOPICS) {
    const p = popE(B, tp.b, 0.5, 2.4);
    if (p <= 0) continue;
    const bob = Math.sin(t * 2.2 + tp.x) * 8;
    const x = lerp(tp.x, CX, pull * 0.4), y = lerp(tp.y + bob, CY, pull * 0.4);
    g.save(); g.translate(x, y); g.scale(p * (1 - pull * 0.4), p * (1 - pull * 0.4)); g.rotate(Math.sin(tp.b) * 0.05); g.globalAlpha *= 1 - pull * 0.85;
    pill(tp.s, 0, 0, { size: 40, w: 800, dot: tp.col, shadow: true, align: 'center' });
    g.restore();
    ring(B, tp.b, x, y, { col: tp.col, r: 160, lw: 8, life: 0.5, alpha: 0.5 });
  }
}

/* ============================================================
   TITLE (B16–32)
   ============================================================ */
const AGENDA = [['01', '실적'], ['02', '금리와 FOMC'], ['03', '중간선거'], ['04', '블루웨이브와 데이터센터'], ['05', '중국'], ['06', '코스피'], ['07', '체크할 리스크']];
function sTitle(B, t, F) {
  group(B, 16, 24.6, () => {
    // right composition: big blue disc with rotating ring text
    const cx = 1510, cy = 540, R = 330 * popE(B, 16, 0.6, 1.5) * (1 + F.kick * 0.015);
    if (R > 1) {
      circle(cx + 14, cy + 22, R, SH);
      circle(cx, cy, R, C.blue);
      g.strokeStyle = C.white; g.globalAlpha *= 0.35; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * 0.8, 0, TAU); g.stroke(); g.globalAlpha /= 0.35;
      const ringTxt = 'OCTOBER 2026 · MARKET CHECK · OCTOBER 2026 · MARKET CHECK · ';
      setFont(30, 800, 4);
      g.save(); g.translate(cx, cy); g.rotate(t * 0.25);
      g.letterSpacing = '0px'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.white;
      for (let i = 0; i < ringTxt.length; i++) { const a = (i / ringTxt.length) * TAU; g.save(); g.rotate(a); g.translate(0, -R * 0.89); g.fillText(ringTxt[i], 0, 0); g.restore(); }
      g.restore();
      slam('10', cx, cy + 20, { size: 380 * (R / 330), w: 900, color: C.white, ls: -20 }, B, 16.2, 0.4, 0.08, 1.6);
      circle(cx + R * 0.78, cy - R * 0.72, 46 * popE(B, 17, 0.5), C.yellow);
      circle(cx - R * 0.9, cy + R * 0.6, 26 * popE(B, 17.5, 0.5), C.coral);
      plusSign(cx + R * 0.95, cy + R * 0.55, 50 * popE(B, 18, 0.5), C.mint, t);
    }
    // left text
    slam('10월,', 150, 300, { size: 250, w: 900, color: C.blue, align: 'left', ls: -10 }, B, 16, 0.4, 0.06, 2.2);
    shaky('흔들리지 말아야 할 이유와', 154, 515, { size: 88, w: 900, align: 'left' }, B, 16.5, 20, 1.2);
    const l3 = { size: 88, w: 900, align: 'left' };
    marker('확인해야 할 것들', '확인', 154, 645, l3, pr(B, 22, 22.5));
    revealUp('확인해야 할 것들', 154, 645, l3, B, 17.5, 0.7, 0.04);
    const ew = textW('확인해야 할 것들', 88, 900);
    if (B >= 22) { circle(154 + ew + 64, 645, 42 * popE(B, 22, 0.4), C.mint); checkMark(154 + ew + 64, 647, 50, C.white, pr(B, 22.1, 22.6), 8); }
    ring(B, 20, 560, 515, { col: C.blue, r: 500, lw: 10, alpha: 0.4 });
    revealUp('실적 · 금리 · 선거 · 데이터센터 · 중국 · 코스피', 156, 770, { size: 34, w: 700, color: C.inkD, align: 'left' }, B, 19, 0.7, 0.01);
  }, { dy: 0, dxo: -200, dout: 0.6 });
  // agenda
  group(B, 24, 32, () => {
    revealUp('오늘 짚어볼 것', 150, 250, { size: 64, w: 900, align: 'left' }, B, 24, 0.6, 0.03);
    text('7 POINTS', W - 150, 254, { size: 30, w: 800, color: C.blue, align: 'right', ls: 4, alpha: pr(B, 24.3, 25) });
    const gap = 28, ws = AGENDA.map(([, s]) => textW(s, 40, 800) + 170);
    AGENDA.forEach(([n, s], i) => {
      const row = i < 4 ? 0 : 1, idx = row ? [4, 5, 6] : [0, 1, 2, 3];
      const tot = idx.reduce((a, k) => a + ws[k], 0) + gap * (idx.length - 1);
      let x = CX - tot / 2;
      for (const k of idx) { if (k === i) break; x += ws[k] + gap; }
      const cw = ws[i], y = row === 0 ? 400 : 590;
      const p = popE(B, 24.5 + i * 0.5, 0.5, 1.8);
      if (p <= 0) return;
      g.save(); g.translate(x + cw / 2, y + 75); g.scale(p, p); g.translate(-(x + cw / 2), -(y + 75));
      panel(x, y, cw, 150, { r: 26 });
      circle(x + 72, y + 75, 40, CH[i].col);
      text(n, x + 72, y + 77, { size: 32, w: 900, color: CH[i].ink ? C.ink : C.white });
      text(s, x + 132, y + 76, { size: 40, w: 800, align: 'left' });
      g.restore();
    });
    revealUp('불안해도 흔들리지 않으려면, 무엇을 보고 무엇을 확인할지부터.', 150, 870, { size: 36, w: 700, color: C.inkD, align: 'left' }, B, 28, 0.7, 0.008);
  }, { dy: 40 });
}

/* ============================================================
   SETUP (B32–64): 기대 vs 금리, 10년물 5.3%, 이벤트 캘린더
   ============================================================ */
const YIELD = (() => {
  const R = mulberry32(5), pts = [];
  for (let i = 0; i < 64; i++) {
    const p = i / 63;
    const base = p < 0.84 ? lerp(4.1, 5.31, Math.pow(p / 0.84, 1.7)) : lerp(5.31, 5.17, (p - 0.84) / 0.16);
    pts.push(Math.min(5.27, base + (R() - 0.5) * 0.08 + Math.sin(i * 0.9) * 0.025));
  }
  pts[53] = 5.31;
  return pts;
})();
function sSetup(B, t, F) {
  // A · split screen (B32–40)
  if (B < 40.2) {
    const ein = Ease.outExpo(pr(B, 32, 32.8)), eout = Ease.inCubic(pr(B, 39.6, 40.2));
    g.save(); g.globalAlpha *= 1 - eout;
    g.fillStyle = C.yellowL; g.fillRect(-(1 - ein) * 960, 0, 960, H);
    g.fillStyle = C.coralL; g.fillRect(960 + (1 - ein) * 960, 0, 960, H);
    // left
    pill('기대', 480, 250, { size: 32, w: 800, fill: C.yellow, align: 'center', dot: C.white });
    revealUp('실적시즌 개막', 480, 380, { size: 104, w: 900 }, B, 32.5, 0.6, 0.04);
    rise('실적 · 가이던스 서프라이즈 기대', 480, 480, { size: 38, w: 700, color: C.inkD }, B, 33.5);
    for (let i = 0; i < 4; i++) {
      const h = (100 + i * 70) * Ease.outBack(pr(B, 33.5 + i * 0.25, 34.3 + i * 0.25), 1.8);
      if (h <= 0) continue;
      g.fillStyle = i === 3 ? C.yellow : '#FFE08A'; rr(330 + i * 80, 900 - h, 60, h, 12); g.fill();
    }
    arrow(330, 860, 650, 590, C.ink, 10, 34, Ease.outCubic(pr(B, 34.5, 35.3)));
    // right
    pill('부담', 1440, 250, { size: 32, w: 800, fill: C.coral, color: C.white, align: 'center', dot: C.white });
    revealUp('금리 부담은 여전', 1440, 380, { size: 104, w: 900 }, B, 34.5, 0.6, 0.04);
    rise('기대 앞을 막아선 무거운 숫자', 1440, 480, { size: 38, w: 700, color: C.inkD }, B, 35.5);
    const dropP = Ease.outBack(pr(B, 35.5, 36.1), 1.2);
    if (B >= 35.5) {
      const ky = lerp(560, 690, dropP), squash = B > 36 ? 1 + Math.exp(-(B - 36) * 8) * 0.08 : 1;
      g.fillStyle = C.ink; rr(1240, 880, 400, 22, 11); g.fill();
      g.save(); g.translate(1440, ky + 100); g.scale(squash, 1 / squash);
      g.strokeStyle = C.coral; g.lineWidth = 26; g.beginPath(); g.arc(0, -150, 60, Math.PI, TAU); g.stroke();
      circle(0, -40, 120, C.coral);
      text('금리', 0, -36, { size: 60, w: 900, color: C.white });
      g.restore();
    }
    // centre
    const vp = popE(B, 36, 0.5, 2.4);
    if (vp > 0) { g.save(); g.translate(CX, 640); g.scale(vp, vp); circle(0, 8, 92, SH); circle(0, 0, 92, C.white); text('하지만', 0, 2, { size: 40, w: 900 }); g.restore(); }
    g.restore();
  }
  // B · Fed hike stamp + 10Y chart (B40–52)
  group(B, 40, 52.2, () => {
    const sp = Ease.outExpo(pr(B, 40, 40.35));
    if (sp > 0) {
      const tw = Math.max(textW('연준, 9월 금리 인상', 52, 900), textW('2023년 이후 처음', 28, 700)) + 64;
      g.save(); g.translate(130 + tw / 2, 215); g.rotate(-0.04); g.scale(lerp(1.8, 1, sp), lerp(1.8, 1, sp)); g.globalAlpha *= Math.min(1, sp * 3);
      g.strokeStyle = C.coral; g.lineWidth = 7; rr(-tw / 2, -66, tw, 132, 18); g.stroke();
      text('연준, 9월 금리 인상', -tw / 2 + 32, -14, { size: 52, w: 900, color: C.coral, align: 'left' });
      text('2023년 이후 처음', -tw / 2 + 32, 36, { size: 28, w: 700, color: C.coral, align: 'left' });
      g.restore();
    }
    const x = 110, y = 330, w = 1700, h = 640;
    const pin = Ease.outExpo(pr(B, 41, 41.8));
    g.save(); g.translate(0, (1 - pin) * 200); g.globalAlpha *= pin;
    panel(x, y, w, h);
    text('미국 10년물 국채금리', x + 44, y + 62, { size: 40, w: 900, align: 'left' });
    conceptTag(x + w - 40, y + 62);
    const px0 = x + 150, px1 = x + w - 90, py0 = y + 140, py1 = y + h - 60;
    const vy = (v) => py1 - ((v - 3.9) / (5.6 - 3.9)) * (py1 - py0);
    for (const v of [4.0, 4.5, 5.0, 5.5]) {
      g.strokeStyle = C.inkF; g.lineWidth = 2; line(px0, vy(v), px1, vy(v));
      text(v.toFixed(1) + '%', px0 - 24, vy(v), { size: 26, w: 700, color: C.inkS, align: 'right' });
    }
    const pts = YIELD.map((v, i) => [px0 + (i / 63) * (px1 - px0), vy(v)]);
    const peakX = pts[53][0];
    const drawX = B < 50 ? lerp(px0, peakX, Ease.inOutSine(pr(B, 42, 49.5))) : lerp(peakX, px1, Ease.outCubic(pr(B, 50.5, 51.8)));
    const vis = polyUpToX(pts, drawX);
    // area
    g.beginPath(); g.moveTo(vis[0][0], py1); vis.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(vis[vis.length - 1][0], py1); g.closePath();
    const ag = g.createLinearGradient(0, py0, 0, py1); ag.addColorStop(0, C.coral + '55'); ag.addColorStop(1, C.coral + '00');
    g.fillStyle = ag; g.fill();
    g.strokeStyle = C.coral; g.lineWidth = 8; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); vis.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    g.lineJoin = 'miter'; g.lineCap = 'butt';
    const hd = vis[vis.length - 1];
    const blink = B >= 49.5 && B < 50 ? (Math.floor(B * 8) % 2 ? 0.4 : 1) : 1;
    circle(hd[0], hd[1], 16 * blink, C.coral); circle(hd[0], hd[1], 7, C.white);
    // 5.3% peak
    if (B >= 50) {
      const lp = Ease.outExpo(pr(B, 50, 50.8));
      g.strokeStyle = C.coral; g.lineWidth = 3; g.setLineDash([12, 10]); line(px0, vy(5.31), lerp(px0, px1, lp), vy(5.31)); g.setLineDash([]);
      text('24년 만의 최고', px0 + 16, vy(5.31) - 26, { size: 26, w: 800, color: C.coral, align: 'left', alpha: lp });
      ring(B, 50, peakX, vy(5.31), { col: C.coral, r: 420, lw: 16, alpha: 0.6 });
      confetti(B, 50, peakX, vy(5.31), { n: 36, seed: 4, v1: 1300 });
      const lx = px0 + 40, ly = vy(5.31) + 125;
      slam('5.3%', lx, ly, { size: 180, w: 900, color: C.coral, align: 'left', ls: -6 }, B, 50, 0.35, 0.05, 2.6);
      const lw = textW('5.3%', 180, 900, -6);
      const pp = popE(B, 50.6, 0.5);
      if (pp > 0) { g.save(); g.translate(lx + lw + 36, ly + 10); g.scale(pp, pp); pill('이달 초 · 24년 만의 최고치', 0, 0, { size: 30, w: 800, fill: C.coral, color: C.white, align: 'left' }); g.restore(); }
    }
    g.restore();
  }, { dy: 0, dout: 0.5 });
  // C · event calendar (B52–64)
  group(B, 52, 64.2, () => {
    const oct = { x: 100, y: 190, w: 1010, h: 790, title: '2026년 10월', sub: '1일 목요일', first: 4, days: 31, ch: 112 };
    const nP = Ease.outExpo(pr(B, 58, 58.9));
    const shiftL = 0;
    g.save(); g.translate(shiftL, 0);
    const M = drawMonth(B, Object.assign({}, oct, {
      appear: (d, row, col) => Ease.outBack(pr(B, 52 + row * 0.5 + col * 0.05, 52.4 + row * 0.5 + col * 0.05), 2),
      fill: (d) => (d >= 12 && B >= 54.5 + (d - 12) * 0.04 ? C.yellowL : null),
    }));
    // today
    const td = M.cell(11);
    if (B >= 54) { g.strokeStyle = C.ink; g.lineWidth = 4; g.setLineDash([6, 6]); g.beginPath(); g.arc(td.cx, td.cy - 4, 36, 0, TAU); g.stroke(); g.setLineDash([]); g.save(); g.globalAlpha *= pr(B, 54, 54.5); pill('오늘', td.cx, td.cy + 40, { size: 18, w: 800, fill: C.ink, color: C.white, align: 'center', h: 28, padX: 10 }); g.restore(); }
    // earnings season tag
    const ep = popE(B, 54.75, 0.5, 2);
    if (ep > 0) { const c = M.cell(12); g.save(); g.translate(c.cx - c.cw / 2 + 6, c.cy - c.ch / 2 - 6); g.scale(ep, ep); pill('실적시즌 ▶', 0, 0, { size: 24, w: 800, fill: C.yellow, align: 'left', h: 40 }); g.restore(); }
    // FOMC 28 (+29 KST)
    const c28 = M.cell(28), c29 = M.cell(29);
    const fp = popE(B, 56, 0.45, 2.4);
    if (fp > 0) { circle(c28.cx, c28.cy, 46 * fp, C.coral); text('28', c28.cx, c28.cy, { size: 40, w: 800, color: C.white, alpha: clamp(fp) }); ring(B, 56, c28.cx, c28.cy, { col: C.coral, r: 200, lw: 10 }); }
    if (B >= 57) { g.strokeStyle = C.coral; g.lineWidth = 4; g.setLineDash([7, 7]); g.beginPath(); g.arc(c29.cx, c29.cy, 44 * clamp(popE(B, 57, 0.4)), 0, TAU); g.stroke(); g.setLineDash([]); }
    const e0 = M.cell(1);
    callout(0, 0, M.x0 + M.cw * 2, e0.cy, 'FOMC 10/28 (수)', '한국시간 29일 새벽', C.coral, pr(B, 56.2, 57), false);
    g.restore();
    // November
    if (nP > 0) {
      g.save(); g.translate((1 - nP) * 900, 0);
      const nov = { x: 1150, y: 190, w: 670, h: 790, title: '11월', sub: '', first: 0, days: 30, ch: 112, ds: 34, ts: 52 };
      const N = drawMonth(B, Object.assign({}, nov, { appear: () => 1 }));
      const c3 = N.cell(3);
      const vp = popE(B, 59, 0.45, 2.4);
      if (vp > 0) { circle(c3.cx, c3.cy, 40 * vp, C.violet); text('3', c3.cx, c3.cy, { size: 34, w: 800, color: C.white, alpha: clamp(vp) }); ring(B, 59, c3.cx, c3.cy, { col: C.violet, r: 200, lw: 10 }); }
      const e30 = N.cell(30);
      callout(0, 0, N.x0 + N.cw * 4.5, e30.cy, '미국 중간선거', '11월 3일 (화)', C.violet, pr(B, 59.2, 60), false);
      g.restore();
    }
    // stamp
    const sp = Ease.outExpo(pr(B, 60, 60.35));
    if (sp > 0) {
      g.save(); g.translate(CX + 30, 112); g.rotate(-0.03); g.scale(lerp(1.8, 1, sp), lerp(1.8, 1, sp)); g.globalAlpha *= Math.min(1, sp * 3);
      g.fillStyle = C.ink; rr(-250, -48, 500, 96, 48); g.fill();
      text('줄줄이 대기 중', 0, 2, { size: 50, w: 900, color: C.yellow });
      g.restore();
    }
  }, { dy: 60 });
}

/* ============================================================
   CH1 실적 (B64–96)
   ============================================================ */
function sEarnings(B, t, F) {
  const M = C.mint;
  group(B, 67.6, 88.3, () => {
    // left: S&P500 Q3 expected EPS growth
    const x = 110, y = 190, w = 840, h = 780;
    panel(x, y, w, h);
    text('S&P500 3분기 예상 이익성장률', x + 44, y + 64, { size: 38, w: 900, align: 'left' });
    text('전년 대비', x + 44, y + 110, { size: 26, w: 700, color: C.inkD, align: 'left' });
    const by = y + h - 90, sc = 11; // px per %
    for (const v of [0, 10, 20, 30]) { g.strokeStyle = C.inkF; g.lineWidth = 2; line(x + 140, by - v * sc, x + w - 60, by - v * sc); text(v + '%', x + 120, by - v * sc, { size: 24, w: 700, color: C.inkS, align: 'right' }); }
    const bx = x + 200, bw = 220;
    const gp = Ease.outCubic(pr(B, 68, 71));
    const bh = 30 * sc * gp;
    // ghost (35%+)
    const gh = Ease.outExpo(pr(B, 76, 77));
    if (gh > 0) {
      const top = by - (30 + 6 * gh) * sc;
      g.fillStyle = C.mintL; rr(bx, top, bw, by - top, 18); g.fill();
      g.strokeStyle = M; g.lineWidth = 5; g.setLineDash([14, 10]); rr(bx, top, bw, by - top, 18); g.stroke(); g.setLineDash([]);
      arrow(bx + bw + 40, by - 30 * sc, bx + bw + 40, top + 8, M, 7, 24, gh);
    }
    const gr = g.createLinearGradient(0, by - bh, 0, by); gr.addColorStop(0, '#2FD3A0'); gr.addColorStop(1, M);
    g.fillStyle = gr; rr(bx, by - bh, bw, bh, 18); g.fill();
    if (B >= 68) {
      const v = Math.round(30 * gp);
      const lbl = gh > 0.5 ? '35%+' : `${v}%`;
      const topY = by - Math.max(bh, gh * 36 * sc);
      numUnit(lbl.replace('%+', '').replace('%', ''), gh > 0.5 ? '%+' : '%', bx + bw / 2, topY - 30, { size: 104, w: 900, color: gh > 0.5 ? C.ink : M, unitSize: 52 });
      text(gh > 0.5 ? "예상을 웃돌면" : "안팎", bx + bw / 2, topY - 142, { size: 30, w: 800, color: C.inkD });
    }
    text('3분기 예상', bx + bw / 2, by + 44, { size: 28, w: 800, color: C.inkD });
    ring(B, 71, bx + bw / 2, by - bh, { col: M, r: 260, lw: 10 });
    confetti(B, 76, bx + bw / 2, by - 36 * sc, { n: 30, seed: 7, cols: [M, C.yellow, C.sky, C.white], v1: 900 });
    // annotation on the right side of the left panel
    const ap = Ease.outExpo(pr(B, 72, 72.6));
    if (ap > 0) {
      g.save(); g.globalAlpha *= ap;
      text('최근 4개 분기', x + 560, y + 250, { size: 32, w: 900, align: 'left' });
      text('실제 > 예상', x + 560, y + 292, { size: 26, w: 700, color: C.inkD, align: 'left' });
      for (let i = 0; i < 4; i++) {
        const p = popE(B, 72 + i, 0.45, 2.4);
        if (p <= 0) continue;
        const cy = y + 370 + i * 92;
        g.save(); g.translate(x + 620, cy); g.scale(p, p);
        circle(0, 0, 32, M); checkMark(0, 2, 40, C.white, pr(B, 72.1 + i, 72.5 + i), 7);
        g.restore();
        text(['4분기 전', '3분기 전', '2분기 전', '직전 분기'][i], x + 672, cy + 2, { size: 28, w: 800, align: 'left', alpha: clamp(p) });
      }
      g.restore();
    }
  }, { dy: 80 });
  // right: streak → 35% / waffle
  group(B, 75.5, 80.3, () => {
    const x = 990, y = 190, w = 820, h = 780;
    panel(x, y, w, h, { fill: C.mint });
    revealUp('이번에도 웃돈다면', x + 60, y + 150, { size: 64, w: 900, color: C.white, align: 'left' }, B, 75.6, 0.6, 0.03);
    const p = Ease.outExpo(pr(B, 76, 76.6));
    numUnit('35', '%+', x + 60, y + 470, { size: 300 * (0.6 + 0.4 * p), w: 900, color: C.white, align: 'left', unitSize: 120 });
    rise('3분기 이익성장률, 35%를 넘길 수도', x + 60, y + 600, { size: 36, w: 700, color: C.white, align: 'left' }, B, 77);
    text('최근 4개 분기 패턴이 반복된다면', x + 60, y + 660, { size: 28, w: 600, color: C.white, align: 'left', alpha: pr(B, 77.5, 78.2) * 0.85 });
  }, { dx: 120, dy: 0 });
  group(B, 80, 88.3, () => {
    const x = 990, y = 190, w = 820, h = 780;
    panel(x, y, w, h);
    text('긍정적 가이던스를 낸 기업 비율', x + 44, y + 64, { size: 36, w: 900, align: 'left' });
    text('S&P500 · 이번 분기', x + 44, y + 108, { size: 24, w: 700, color: C.inkD, align: 'left' });
    const cs = 46, gp = 7, gx = x + 50, gy = y + 160;
    let lit = 0;
    for (let i = 0; i < 100; i++) {
      const r = 9 - Math.floor(i / 10), c = i % 10;
      const cx = gx + c * (cs + gp), cy = gy + r * (cs + gp);
      const on = i < 62 && B >= 80 + (i / 62) * 3;
      if (on) lit++;
      const pp = on ? Ease.outBack(pr(B, 80 + (i / 62) * 3, 80.3 + (i / 62) * 3), 2.5) : 1;
      g.fillStyle = on ? M : 'rgba(22,32,74,0.08)';
      g.save(); g.translate(cx + cs / 2, cy + cs / 2); g.scale(pp, pp); rr(-cs / 2, -cs / 2, cs, cs, 10); g.fill(); g.restore();
    }
    // long-term average line at 40%
    const lp = Ease.outExpo(pr(B, 84, 84.8));
    if (lp > 0) {
      const ly = gy + 6 * (cs + gp) - gp / 2;
      g.strokeStyle = C.ink; g.lineWidth = 5; g.setLineDash([14, 10]); line(gx - 10, ly, gx + (10 * (cs + gp) + 20) * lp, ly); g.setLineDash([]);
      const nx2 = gx + 10 * (cs + gp) + 30;
      text('장기 평균', nx2, ly - 18, { size: 22, w: 800, color: C.inkD, align: 'left', alpha: lp });
      text('약 40%', nx2, ly + 16, { size: 32, w: 900, align: 'left', alpha: lp });
    }
    const nx = gx + 10 * (cs + gp) + 26;
    numUnit(String(Math.min(62, lit)), '%', nx, y + 380, { size: 104, w: 900, color: M, align: 'left', unitSize: 48 });
    text('긍정적', nx + 4, y + 260, { size: 28, w: 800, color: C.inkD, align: 'left' });
    const pp = popE(B, 84, 0.5);
    if (pp > 0) { g.save(); g.translate(nx + 4, y + 590); g.scale(pp, pp); pill('+22%p', 0, 0, { size: 34, w: 900, fill: C.yellow, align: 'left' }); g.restore(); }
    text('평균보다', nx + 4, y + 660, { size: 26, w: 700, color: C.inkD, align: 'left', alpha: pr(B, 84.3, 85) });
    text('크게 웃돈다', nx + 4, y + 696, { size: 26, w: 700, color: C.inkD, align: 'left', alpha: pr(B, 84.3, 85) });
  }, { dx: 120, dy: 0 });
  // statement (B88–96)
  group(B, 88, 96.2, () => {
    rise('시장이 금리를 걱정하는 동안,', 150, 360, { size: 60, w: 800, color: C.inkD, align: 'left' }, B, 88.2);
    revealUp('기업들은 조용히', 150, 500, { size: 120, w: 900, align: 'left' }, B, 89, 0.6, 0.04);
    const l3 = { size: 120, w: 900, align: 'left', colorFn: hl('이익을 쌓고 있다.', '이익', M) };
    revealUp('이익을 쌓고 있다.', 150, 650, l3, B, 89.6, 0.6, 0.04);
    // bricks
    const bx = 1500, base = 900;
    g.fillStyle = C.ink; rr(bx - 230, base, 460, 18, 9); g.fill();
    for (let i = 0; i < 4; i++) {
      const b0 = 90 + i, p = pr(B, b0 - 0.35, b0);
      if (p <= 0) continue;
      const yy = base - 104 * (i + 0.5) - (1 - Ease.inQuad(p)) * 700;
      const sq = B >= b0 ? 1 + Math.exp(-(B - b0) * SPB * 14) * 0.12 : 1;
      g.save(); g.translate(bx + (i % 2 ? 26 : -18), yy); g.rotate((i % 2 ? 1 : -1) * 0.02); g.scale(sq, 1 / sq);
      panel(-180, -46, 360, 92, { r: 18, fill: M });
      text('이익', -40, 2, { size: 44, w: 900, color: C.white });
      plusSign(90, 0, 36, C.white, 0);
      g.restore();
    }
    // worried cloud
    const cp = popE(B, 88.5, 0.5);
    if (cp > 0) {
      g.save(); g.translate(1640, 270 + Math.sin(t * 2) * 10); g.scale(cp, cp);
      [[-60, 10, 54], [0, -14, 70], [64, 8, 52], [0, 30, 56]].forEach(([dx, dy, r]) => circle(dx, dy, r, C.coralL));
      text('금리…?', 0, 12, { size: 40, w: 900, color: C.coral });
      g.restore();
    }
  }, { dy: 50 });
}

/* ============================================================
   CH2 금리와 FOMC (B96–136)
   ============================================================ */
const REASONS = [
  { b: 106, t: '9월 고용 +2.9만 명', s: '크게 둔화', ic: 'job' },
  { b: 108, t: '물가', s: '예상보다 낮게 나왔다', ic: 'cpi' },
  { b: 110, t: '장기금리', s: '고점에서 한 발 물러났다', ic: 'yld' },
];
function sFomc(B, t, F) {
  const BL = C.blue;
  // A · gauge + reasons (B100–116)
  group(B, 99.6, 116.3, () => {
    const x = 110, y = 190, w = 820, h = 780;
    panel(x, y, w, h);
    text('10월 FOMC 동결 확률', x + 44, y + 64, { size: 40, w: 900, align: 'left' });
    text('시장 가격 기준', x + 44, y + 108, { size: 26, w: 700, color: C.inkD, align: 'left' });
    const p = 0.8 * Ease.inOutCubic(pr(B, 100, 103));
    gauge(x + w / 2, y + 560, 280, p, BL);
    numUnit(String(Math.round(p * 100)), '%', x + w / 2, y + 690, { size: 110, w: 900, color: BL, unitSize: 52 });
    text('약', x + w / 2 - 150, y + 664, { size: 34, w: 800, color: C.inkD, alpha: pr(B, 100, 101) });
    const pp = popE(B, 103, 0.5);
    if (pp > 0) { g.save(); g.translate(x + w / 2, y + 205); g.scale(pp, pp); pill('10월 동결 = 기본 시나리오', 0, 0, { size: 32, w: 800, fill: BL, color: C.white, align: 'center' }); g.restore(); ring(B, 103, x + w / 2, y + 560, { col: BL, r: 300, lw: 12 }); }
    // reasons
    revealUp('왜 동결인가', 990, 230, { size: 44, w: 900, align: 'left' }, B, 104.5, 0.6, 0.04);
    REASONS.forEach((r, i) => {
      const p2 = Ease.outExpo(pr(B, r.b, r.b + 0.6));
      if (p2 <= 0) return;
      const cy = 300 + i * 225;
      g.save(); g.translate((1 - p2) * 300, 0); g.globalAlpha *= p2;
      panel(990, cy, 820, 195, { r: 26 });
      circle(1085, cy + 97, 56, C.blueL);
      if (r.ic === 'job') { person(1070, cy + 104, 56, BL); arrow(1112, cy + 70, 1112, cy + 128, C.coral, 7, 20); }
      else if (r.ic === 'cpi') { text('%', 1072, cy + 100, { size: 58, w: 900, color: BL }); arrow(1112, cy + 70, 1112, cy + 128, C.mint, 7, 20); }
      else { g.strokeStyle = BL; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); g.moveTo(1050, cy + 130); g.lineTo(1075, cy + 90); g.lineTo(1095, cy + 72); g.lineTo(1122, cy + 100); g.stroke(); circle(1095, cy + 72, 7, C.coral); }
      text(r.t, 1170, cy + 72, { size: 44, w: 900, align: 'left' });
      text(r.s, 1170, cy + 130, { size: 32, w: 700, color: C.inkD, align: 'left' });
      g.restore();
    });
  }, { dy: 80 });
  // B · 다만 — 16 of 18, December 70% (B116–124)
  group(B, 116, 124.3, () => {
    slam('다만,', 150, 250, { size: 96, w: 900, color: C.coral, align: 'left' }, B, 116, 0.35, 0.06, 2);
    const x = 110, y = 330, w = 1060, h = 560;
    panel(x, y, w, h);
    for (let i = 0; i < 18; i++) {
      const r = Math.floor(i / 6), c = i % 6;
      const cx = x + 140 + c * 156, cy = y + 110 + r * 150;
      const on = i < 16 && B >= 117 + i * 0.25;
      const pp = on ? Ease.outBack(pr(B, 117 + i * 0.25, 117.3 + i * 0.25), 3) : popE(B, 116.2 + i * 0.03, 0.4);
      g.save(); g.translate(cx, cy); g.scale(pp, pp);
      circle(0, 0, 58, on ? C.coral : 'rgba(22,32,74,0.08)');
      person(0, 6, 64, on ? C.white : C.inkS);
      g.restore();
    }
    const lit = clamp(Math.floor((B - 117) / 0.25) + 1, 0, 16);
    numUnit(String(lit), '명', x + 150, y + h - 46, { size: 64, w: 900, color: C.coral, align: 'left', unitSize: 34 });
    text('/ 18명', x + 150 + numText(String(lit), 0, 0, { size: 64, w: 900, measure: true }) + 60, y + h - 64, { size: 34, w: 800, color: C.inkD, align: 'left', base: 'alphabetic' });
    text('연준 위원 중 연내 추가 인상 가능성 열어둠', x + w - 40, y + h - 66, { size: 30, w: 700, color: C.inkD, align: 'right' });
    // December probability
    const dx = 1220, dw = 590;
    panel(dx, y, dw, h);
    text('12월 인상 확률', dx + 40, y + 64, { size: 38, w: 900, align: 'left' });
    const dp = 0.7 * Ease.inOutCubic(pr(B, 121, 122.5));
    donut(dx + dw / 2, y + 300, 150, 44, dp, C.coral);
    numUnit(String(Math.round(dp * 100)), '%', dx + dw / 2, y + 335, { size: 88, w: 900, color: C.coral, unitSize: 40 });
    text('여전히 약', dx + dw / 2, y + 245, { size: 26, w: 700, color: C.inkD, alpha: pr(B, 121, 121.6) });
    text('인상 속도는 둔화, 하락 전환엔 시간 필요', CX, 960, { size: 32, w: 700, color: C.inkD, alpha: pr(B, 122, 122.8) });
  }, { dy: 60 });
  // C · BREAK — calendar flips to December (B124–128)
  if (B >= 124 && B < 129.2) {
    const pg = [
      { head: 'OCTOBER', col: C.blue, big: '10월', bigSize: 230, small: 'FOMC 10/28' },
      { head: 'NOVEMBER', col: C.violet, big: '11월', bigSize: 230, small: '중간선거 11/3' },
      { head: 'DECEMBER', col: C.coral, big: '12월', bigSize: 230, bigCol: C.coral, small: 'FOMC · 인상?' },
    ];
    const k = B < 125 ? 0 : B < 126 ? 1 : 2;
    const fp = k === 0 ? 0 : pr(B, k === 1 ? 125 : 126, (k === 1 ? 125 : 126) + 0.6);
    const pIn = popE(B, 124, 0.5, 1.6);
    const toLeft = Ease.inOutExpo(pr(B, 128, 128.8));
    const sw = B < 127.5 ? (Math.floor(B) % 2 ? 1 : -1) * Math.exp(-(B - Math.floor(B)) * 5) * 0.02 : 0;
    deskCal(lerp(CX, 520, toLeft), lerp(CY + 20, CY + 40, toLeft), pIn * lerp(1.12, 0.92, toLeft), [pg[Math.max(0, k - 1)], pg[k]], k === 0 ? 1 : fp, sw);
    if (B < 128) {
      const ta = pr(B, 124.3, 124.9);
      text('10월 FOMC 다음은?', CX, 120, { size: 44, w: 900, alpha: ta });
    }
  }
  // D · DROP: 진짜 승부는 12월 + 워시의 힌트 (B128–136)
  group(B, 128, 136.2, () => {
    slam('진짜 승부는', 1300, 270, { size: 96, w: 900 }, B, 128, 0.35, 0.05, 2.2);
    slam('12월', 1300, 500, { size: 300, w: 900, color: C.coral, ls: -10 }, B, 128.25, 0.35, 0.08, 2.6);
    confetti(B, 128.25, 1300, 480, { n: 50, seed: 12, v1: 1600 });
    ring(B, 128.25, 1300, 480, { col: C.coral, r: 700, lw: 18, alpha: 0.5 });
    const cp = Ease.outExpo(pr(B, 129.5, 130.2));
    if (cp > 0) {
      g.save(); g.globalAlpha *= cp; g.translate(0, (1 - cp) * 60);
      panel(860, 690, 900, 260, { r: 30 });
      text('10월 FOMC, 결과보다 중요한 건', 910, 742, { size: 32, w: 700, color: C.inkD, align: 'left' });
      const o = { size: 66, w: 900, align: 'left' };
      marker('워시 의장의 ‘12월 힌트’', '‘12월 힌트’', 910, 830, o, pr(B, 130, 130.6));
      text('워시 의장의 ‘12월 힌트’', 910, 830, o);
      text('파월 이후 첫 매파 의장', 910, 905, { size: 28, w: 700, color: C.inkD, align: 'left', alpha: pr(B, 131, 131.6) });
      // magnifier
      const mx = 1660, my = 800;
      g.strokeStyle = C.blue; g.lineWidth = 12; g.beginPath(); g.arc(mx, my, 44, 0, TAU); g.stroke();
      g.lineCap = 'round'; line(mx + 32, my + 32, mx + 70, my + 70); g.lineCap = 'butt';
      g.restore();
    }
  }, { dy: 0 });
}

/* ============================================================
   CH3 중간선거 (B136–168)
   ============================================================ */
const MIDTERMS = Array.from({ length: 20 }, (_, i) => 1946 + i * 4);
function sElection(B, t, F) {
  const V = C.violet;
  // A · anxiety bricks + presidential cycle (B140–148)
  group(B, 139.6, 148.3, () => {
    const x = 110, y = 190, w = 820, h = 780;
    panel(x, y, w, h);
    text('선거가 다가올수록', x + 44, y + 64, { size: 36, w: 800, color: C.inkD, align: 'left' });
    text('불안이 겹겹이', x + 44, y + 120, { size: 52, w: 900, align: 'left' });
    const base = y + h - 70, bx = x + w / 2;
    g.fillStyle = C.ink; rr(bx - 250, base, 500, 16, 8); g.fill();
    for (let i = 0; i < 4; i++) {
      const b0 = 140 + i, p = pr(B, b0 - 0.35, b0);
      if (p <= 0) continue;
      const yy = base - 100 * (i + 0.5) - (1 - Ease.inQuad(p)) * 600;
      const wob = B >= b0 ? Math.sin((B - b0) * 9) * Math.exp(-(B - b0) * 2) * 0.06 : 0;
      g.save(); g.translate(bx + [-20, 30, -40, 25][i], yy); g.rotate([-0.04, 0.05, -0.03, 0.07][i] + wob);
      panel(-170, -44, 340, 88, { r: 18, fill: [C.violetL, '#D8CCFF', '#C6B5FF', V][i] });
      text('불안', 0, 2, { size: 42, w: 900, color: i === 3 ? C.white : V });
      g.restore();
    }
    // presidential cycle
    const px = 990, pw = 820;
    panel(px, y, pw, h);
    text('대통령 임기 4년 주기 · 증시', px + 44, y + 64, { size: 36, w: 900, align: 'left' });
    text('중간선거가 있는 해, 평균적으로 가장 약했다', px + 44, y + 112, { size: 26, w: 700, color: C.inkD, align: 'left', alpha: pr(B, 146, 146.6) });
    conceptTag(px + pw - 40, y + 64);
    const H4 = [0.55, 0.22, 0.95, 0.62], L4 = ['1년차', '2년차', '3년차', '4년차'];
    const by = y + h - 120;
    g.strokeStyle = C.inkF; g.lineWidth = 3; line(px + 60, by, px + pw - 60, by);
    for (let i = 0; i < 4; i++) {
      const gp = Ease.outBack(pr(B, 144 + i * 0.5, 144.6 + i * 0.5), 1.6);
      const bw = 130, cx = px + 140 + i * 180, bh = H4[i] * 420 * gp;
      if (gp > 0) { g.fillStyle = i === 1 ? V : 'rgba(22,32,74,0.16)'; rr(cx - bw / 2, by - bh, bw, bh, 16); g.fill(); }
      text(L4[i], cx, by + 40, { size: 30, w: 800, color: i === 1 ? V : C.inkD });
      if (i === 1) text('중간선거', cx, by + 78, { size: 24, w: 800, color: V });
    }
    const lp = popE(B, 146, 0.5);
    if (lp > 0) { g.save(); g.translate(px + 320, by - 0.22 * 420 - 70); g.scale(lp, lp); pill('가장 약했다', 0, 0, { size: 30, w: 800, fill: V, color: C.white, align: 'center' }); g.restore(); }
  }, { dy: 80 });
  // B · 20 midterms, zero negatives (B148–158)
  group(B, 148, 158.3, () => {
    revealUp('1946년 이후, 중간선거 다음 1년 수익률', CX, 245, { size: 58, w: 900 }, B, 148, 0.6, 0.02);
    const cw = 150, gap = 18, x0 = (W - (10 * cw + 9 * gap)) / 2;
    MIDTERMS.forEach((yr, i) => {
      const r = Math.floor(i / 10), c = i % 10;
      const x = x0 + c * (cw + gap), y = 360 + r * 118;
      const fb = 149 + i * 0.25, on = B >= fb;
      const ap = popE(B, 148.3 + i * 0.02, 0.4);
      const fl = on ? pr(B, fb, fb + 0.25) : 0;
      const sy = on ? Math.abs(Math.cos(fl * Math.PI)) : 1;
      const face = on && fl > 0.5;
      g.save(); g.translate(x + cw / 2, y + 48); g.scale(ap, ap * Math.max(0.05, sy));
      g.fillStyle = SH; rr(-cw / 2, -40, cw, 96, 20); g.fill();
      g.fillStyle = face ? C.mint : C.white; rr(-cw / 2, -48, cw, 96, 20); g.fill();
      text(String(yr), face ? -14 : 0, 0, { size: 32, w: 800, color: face ? C.white : C.inkD, ls: 0 });
      if (face) plusSign(46, 0, 26, C.white);
      g.restore();
    });
    // slot counter → 0
    text('마이너스를 기록한 해', CX, 660, { size: 44, w: 800, color: C.inkD, alpha: pr(B, 150, 150.8) });
    if (B >= 150.5) {
      let s = B < 156 ? String(Math.floor(rnd(Math.floor(B * 8), 3) * 9) + 1) : '0';
      if (B >= 155.5 && B < 156) s = '?';
      const sl = B >= 156 ? Ease.outExpo(pr(B, 156, 156.35)) : 1;
      const col = B >= 156 ? V : C.inkS;
      g.save(); g.translate(CX - 40, 870); g.scale(lerp(2.4, 1, sl), lerp(2.4, 1, sl));
      numUnit(s, '번', 0, 0, { size: 250, w: 900, color: col, unitSize: 90 });
      g.restore();
      if (B >= 156) {
        ring(B, 156, CX, 790, { col: V, r: 800, lw: 20, alpha: 0.5 });
        confetti(B, 156, CX, 780, { n: 60, seed: 15, v1: 1800 });
        const pp = popE(B, 156.6, 0.5);
        if (pp > 0) { g.save(); g.translate(CX + 330, 820); g.scale(pp, pp); g.rotate(-0.06); pill('단 한 번도 없었다', 0, 0, { size: 40, w: 900, fill: V, color: C.white, align: 'left' }); g.restore(); }
      }
    }
  }, { dy: 50 });
  // C · money comes back + 흔들리지 말 것 (B158–168)
  group(B, 158, 168.2, () => {
    rise('선거가 끝나면', 150, 300, { size: 60, w: 800, color: C.inkD, align: 'left' }, B, 158);
    const o2 = { size: 110, w: 900, align: 'left', colorFn: hl('증시로 돈이 돌아온다', '돈', V) };
    revealUp('증시로 돈이 돌아온다', 150, 430, o2, B, 158.6, 0.6, 0.04);
    rise('선거 종료 후 자금 복귀가 빨라지는 건, 수십 년간 목격된 사실', 152, 530, { size: 32, w: 700, color: C.inkD, align: 'left' }, B, 159.5);
    // coin flow into box
    const bxp = popE(B, 159, 0.5);
    if (bxp > 0) {
      g.save(); g.translate(1560, 380); g.scale(bxp, bxp);
      panel(-150, -110, 300, 220, { r: 30, fill: V });
      text('증시', 0, 4, { size: 70, w: 900, color: C.white });
      g.restore();
      for (let i = 0; i < 9; i++) {
        const u = fract((B - 159) * 0.45 + i / 9);
        if (B < 159 + i * 0.12) continue;
        const xx = lerp(1050, 1500, Ease.inQuad(u)), yy = 380 + Math.sin(u * Math.PI) * -110 + (i % 3 - 1) * 26;
        g.globalAlpha *= 1 - Ease.inQuad(u) * 0.6; coin(xx, yy, 26, C.yellow); g.globalAlpha /= 1 - Ease.inQuad(u) * 0.6;
      }
    }
    // final statement
    const o = { size: 92, w: 900, align: 'center' };
    if (B >= 162) {
      panel(160, 690, W - 320, 220, { r: 36, fill: C.white });
      shaky('절대 불안감에 흔들려서는 안 된다', CX, 800, o, B, 162, 164, 1.3);
      if (B >= 164) { g.fillStyle = V; const k = Ease.outExpo(pr(B, 164, 164.6)); rr(CX - 600 * k, 868, 1200 * k, 10, 5); g.fill(); ring(B, 164, CX, 800, { col: V, r: 700, lw: 12, alpha: 0.4 }); }
    }
  }, { dy: 50 });
}

/* ============================================================
   CH4 블루웨이브 · 데이터센터 (B168–208)
   ============================================================ */
function sDataCenter(B, t, F) {
  const O = C.orange;
  // A · exaggerated / state-local decision (B172–180)
  group(B, 171.6, 180.3, () => {
    const x = 110, y = 190, w = 820, h = 780;
    panel(x, y, w, h);
    text('블루웨이브가 오면', x + 44, y + 64, { size: 36, w: 800, color: C.inkD, align: 'left' });
    text('데이터센터 건립 지연?', x + 44, y + 124, { size: 56, w: 900, align: 'left' });
    dataCenter(x + w / 2, y + 450, 1.15 * popE(B, 172.3, 0.6, 1.6), O);
    // blue wave
    g.save(); g.beginPath(); rr(x, y, w, h, 28); g.clip();
    const wp = Ease.outCubic(pr(B, 172.5, 173.5));
    for (let k = 0; k < 2; k++) {
      g.fillStyle = k ? C.blue : C.sky; g.globalAlpha *= 0.85;
      g.beginPath(); g.moveTo(x, y + h);
      for (let xx = x; xx <= x + w; xx += 20) g.lineTo(xx, y + h - 130 * wp + k * 40 + Math.sin(xx * 0.012 + t * 2.4 + k * 2) * 22);
      g.lineTo(x + w, y + h); g.closePath(); g.fill(); g.globalAlpha /= 0.85;
    }
    g.restore();
    const sp = Ease.outExpo(pr(B, 174, 174.35));
    if (sp > 0) {
      g.save(); g.translate(x + w / 2, y + 470); g.rotate(-0.12); g.scale(lerp(2, 1, sp), lerp(2, 1, sp)); g.globalAlpha *= Math.min(1, sp * 3);
      g.fillStyle = C.white; rr(-290, -70, 580, 140, 20); g.fill();
      g.strokeStyle = C.coral; g.lineWidth = 9; rr(-290, -70, 580, 140, 20); g.stroke();
      text('상당히 과장됐다', 0, 3, { size: 66, w: 900, color: C.coral });
      g.restore();
    }
    // right: permits + power prices → states
    const px = 990, pw = 820;
    panel(px, y, pw, h);
    revealUp('인허가와 전기요금 결정권은', px + 44, y + 80, { size: 40, w: 800, color: C.inkD, align: 'left' }, B, 176, 0.6, 0.015);
    const o = { size: 60, w: 900, align: 'left', colorFn: hl('이미 주·지방정부 손에', '주·지방정부', O) };
    revealUp('이미 주·지방정부 손에', px + 44, y + 160, o, B, 176.5, 0.6, 0.03);
    const ip = popE(B, 177, 0.5), ip2 = popE(B, 177.4, 0.5), cp = popE(B, 178, 0.6, 1.8);
    const iy = y + 470;
    if (ip > 0) { g.save(); g.translate(px + 150, iy - 90); g.scale(ip, ip); panel(-80, -70, 160, 140, { r: 24, fill: C.orangeL }); text('인허가', 0, 4, { size: 36, w: 900, color: O }); g.restore(); }
    if (ip2 > 0) { g.save(); g.translate(px + 150, iy + 90); g.scale(ip2, ip2); panel(-80, -70, 160, 140, { r: 24, fill: C.orangeL }); text('전기요금', 0, 4, { size: 32, w: 900, color: O }); g.restore(); }
    arrow(px + 250, iy - 90, px + 430, iy - 10, C.ink, 7, 24, Ease.outCubic(pr(B, 177.6, 178.2)));
    arrow(px + 250, iy + 90, px + 430, iy + 10, C.ink, 7, 24, Ease.outCubic(pr(B, 177.8, 178.4)));
    if (cp > 0) {
      g.save(); g.translate(px + 600, iy); g.scale(cp, cp);
      // capitol dome
      g.fillStyle = O; g.beginPath(); g.arc(0, -40, 70, Math.PI, TAU); g.fill();
      g.fillRect(-110, -40, 220, 22);
      for (let k = 0; k < 5; k++) g.fillRect(-96 + k * 44, -18, 18, 100);
      g.fillRect(-130, 82, 260, 24);
      g.fillRect(-4, -150, 8, 44); g.fillStyle = C.coral; g.fillRect(4, -150, 34, 22);
      g.restore();
      text('주 정부 · 지방정부', px + 600, iy + 170, { size: 34, w: 900, alpha: clamp(cp) });
    }
  }, { dy: 80 });
  // B · opposition across both parties (B180–192)
  group(B, 180, 192.3, () => {
    const cards = [
      { b: 180, tag: '텍사스 · 공화당 주', body: ['애벗 주지사, 신규 데이터센터', '전력망 연결을 멈춰 세웠다'], foot: '트럼프 대통령은 이를 공개 비판', ic: 'plug' },
      { b: 183, tag: '텍사스 공화당 지지층', body: ['지역 내 데이터센터 금지에', '찬성'], foot: '절반 가까이', ic: 'donut' },
      { b: 186, tag: '미시간 · 공화당 상원 후보', body: ['데이터센터', '모라토리엄 지지'], foot: '', ic: 'pause' },
    ];
    cards.forEach((c, i) => {
      const p = Ease.outExpo(pr(B, c.b, c.b + 0.6));
      if (p <= 0) return;
      const x = 110 + i * 580, y = 190, w = 540, h = 520;
      g.save(); g.translate(0, (1 - p) * 120); g.globalAlpha *= p;
      panel(x, y, w, h);
      pill(c.tag, x + 36, y + 60, { size: 26, w: 800, fill: C.redL, color: C.red, align: 'left', dot: C.red });
      const icx = x + w / 2, icy = y + 230;
      if (c.ic === 'plug') {
        g.fillStyle = C.ink; rr(icx - 50, icy - 50, 100, 70, 18); g.fill(); g.fillRect(icx - 34, icy - 90, 14, 44); g.fillRect(icx + 20, icy - 90, 14, 44);
        g.strokeStyle = C.ink; g.lineWidth = 12; g.lineCap = 'round'; line(icx, icy + 20, icx, icy + 70); g.lineCap = 'butt';
        circle(icx + 70, icy + 40, 40, C.red); crossMark(icx + 70, icy + 40, 44, C.white, pr(B, c.b + 0.3, c.b + 0.8));
      } else if (c.ic === 'donut') {
        const dp = 0.47 * Ease.inOutCubic(pr(B, c.b + 0.2, c.b + 1.4));
        donut(icx, icy, 92, 36, dp, C.red);
        text('절반', icx, icy - 14, { size: 42, w: 900, color: C.red }); text('가까이', icx, icy + 30, { size: 26, w: 800, color: C.red });
      } else {
        circle(icx, icy, 92, C.red); g.fillStyle = C.white; rr(icx - 36, icy - 46, 24, 92, 8); g.fill(); rr(icx + 12, icy - 46, 24, 92, 8); g.fill();
      }
      c.body.forEach((l, k) => text(l, x + w / 2, y + 380 + k * 52, { size: 38, w: 900 }));
      if (c.foot) text(c.foot, x + w / 2, y + 480, { size: 26, w: 700, color: C.inkD });
      g.restore();
    });
    // balance
    const bp = Ease.outExpo(pr(B, 188, 188.7));
    if (bp > 0) {
      g.save(); g.globalAlpha *= bp; g.translate(0, (1 - bp) * 80);
      panel(110, 750, 1700, 210, { r: 34 });
      const sx = 380, sy = 820, tilt = Math.sin((B - 188) * 6) * Math.exp(-(B - 188) * 1.6) * 0.18;
      g.fillStyle = C.ink; rr(sx - 8, sy - 10, 16, 120, 8); g.fill(); rr(sx - 60, sy + 104, 120, 16, 8); g.fill();
      g.save(); g.translate(sx, sy); g.rotate(tilt);
      g.fillStyle = C.ink; rr(-190, -6, 380, 12, 6); g.fill();
      [[-170, C.blue, '민주'], [170, C.red, '공화']].forEach(([dx, col, lb]) => {
        g.save(); g.translate(dx, 0); g.rotate(-tilt);
        g.strokeStyle = C.inkS; g.lineWidth = 3; line(0, 0, -40, 60); line(0, 0, 40, 60);
        g.fillStyle = col; g.beginPath(); g.ellipse(0, 64, 64, 18, 0, 0, TAU); g.fill();
        text(lb, 0, 100, { size: 24, w: 900, color: col });
        g.restore();
      });
      g.restore();
      const o = { size: 56, w: 900, align: 'left', colorFn: hl('반대 여론은 양당에 고르게 퍼져 있다', '양당에 고르게', O) };
      revealUp('반대 여론은 양당에 고르게 퍼져 있다', 640, 820, o, B, 188.3, 0.6, 0.02);
      rise('이번 선거가 건립 지연에 새롭고 충격적인 변수를 더하는 건 아니다', 642, 895, { size: 30, w: 700, color: C.inkD, align: 'left' }, B, 189.5);
      g.restore();
    }
  }, { dy: 0, dout: 0.5 });
  // C · 34 ballots (B192–199.5)
  group(B, 192, 199.6, () => {
    slam('다만 하나는 짚어두자', 150, 230, { size: 50, w: 900, color: C.coral, align: 'left' }, B, 192, 0.35, 0.03, 1.8);
    revealUp('11월, 데이터센터 관련 주·지방 주민투표', 150, 320, { size: 52, w: 900, align: 'left' }, B, 192.5, 0.6, 0.015);
    const cols = 17, cw = 92, x0 = CX - (cols * cw) / 2 + cw / 2;
    let n = 0;
    for (let i = 0; i < 34; i++) {
      const c = Math.floor(i / 2), r = i % 2;
      const b0 = 193 + c * 0.25;
      const p = popE(B, b0, 0.4, 2.6);
      if (p <= 0) continue;
      n++;
      ballot(x0 + c * cw, 470 + r * 110, 1.15 * p, O, B >= b0 + 0.3);
    }
    const cp = B >= 193 ? 1 : 0;
    if (cp) numUnit(String(n), '건', 1600, 330, { size: 150, w: 900, color: O, unitSize: 64 });
    // what to watch
    const wp = Ease.outExpo(pr(B, 197.5, 198.1));
    if (wp > 0) {
      g.save(); g.globalAlpha *= wp; g.translate(0, (1 - wp) * 50);
      text('봐야 할 것은', CX, 720, { size: 36, w: 800, color: C.inkD });
      const ap = popE(B, 198, 0.45), bpp = popE(B, 199, 0.45, 2.6);
      if (ap > 0) {
        g.save(); g.translate(CX - 380, 840); g.scale(ap, ap);
        panel(-310, -70, 620, 140, { r: 70, fill: C.white });
        text('의회 다수당', 30, 2, { size: 52, w: 900, color: C.inkS });
        g.strokeStyle = C.inkS; g.lineWidth = 6; line(-150, 2, 200 * Ease.outCubic(pr(B, 198.2, 198.6)) + -150 + 160, 2);
        circle(-220, 0, 44, C.inkS); crossMark(-220, 0, 44, C.white, pr(B, 198.1, 198.5));
        g.restore();
      }
      if (bpp > 0) {
        g.save(); g.translate(CX + 380, 840); g.scale(bpp, bpp);
        panel(-310, -70, 620, 140, { r: 70, fill: O });
        text('지역 단위 결과', 30, 2, { size: 52, w: 900, color: C.white });
        circle(-230, 0, 44, C.white); checkMark(-230, 2, 50, O, pr(B, 199.1, 199.5), 8);
        g.restore();
      }
      g.restore();
    }
  }, { dy: 50, dout: 0.35 });
  // D · capex bars (B199.5–204) then the drop statement (B204–208)
  group(B, 199.5, 204.1, () => {
    revealUp('그럼에도 하이퍼스케일러 설비투자는', CX, 230, { size: 54, w: 900 }, B, 199.5, 0.5, 0.015);
    const base = 900, bars = [{ b: 200, v: 0.7, l: '올해', n: '7,000억 달러+' }, { b: 201.5, v: 1, l: '내년', n: '1조 달러 가까이' }];
    g.fillStyle = C.ink; rr(560, base, 800, 14, 7); g.fill();
    bars.forEach((br, i) => {
      const p = Ease.outBack(pr(B, br.b, br.b + 0.8), 1.4);
      if (p <= 0) return;
      const cx = 760 + i * 400, bh = br.v * 480 * p;
      const gr = g.createLinearGradient(0, base - bh, 0, base); gr.addColorStop(0, '#FFB15C'); gr.addColorStop(1, O);
      g.fillStyle = gr; rr(cx - 120, base - bh, 240, bh, 20); g.fill();
      text(br.l, cx, base + 44, { size: 32, w: 800, color: C.inkD });
      text(br.n, cx, base - bh - 50, { size: 50, w: 900, color: O, alpha: clamp(p) });
    });
  }, { dy: 60, dout: 0.25 });
  group(B, 204, 208.2, () => {
    slam('일부 지역의 제동은', CX, 300, { size: 60, w: 800, color: C.inkD }, B, 204, 0.3, 0.03, 1.6);
    const o1 = { size: 100, w: 900, colorFn: hl('‘어디에 짓느냐’의 문제이지', '‘어디에 짓느냐’', O) };
    slam('‘어디에 짓느냐’의 문제이지', CX, 470, o1, B, 204, 0.35, 0.035, 2.2);
    const o2 = { size: 100, w: 900, color: C.ink };
    slam('‘짓느냐 마느냐’가 아니다', CX, 640, o2, B, 204.6, 0.35, 0.035, 2.2);
    if (B >= 205.2) { const [a, b] = subRange('‘짓느냐 마느냐’가 아니다', '‘짓느냐 마느냐’', CX, o2); g.strokeStyle = C.coral; g.lineWidth = 12; g.lineCap = 'round'; line(a, 640, lerp(a, b, Ease.outCubic(pr(B, 205.2, 205.7))), 640); g.lineCap = 'butt'; }
    dataCenter(CX - 520, 860, 0.6 * popE(B, 205, 0.5), O);
    dataCenter(CX, 860, 0.6 * popE(B, 205.25, 0.5), O);
    dataCenter(CX + 520, 860, 0.6 * popE(B, 205.5, 0.5), O);
    confetti(B, 204, CX, 470, { n: 44, seed: 21, v1: 1500 });
  }, { dy: 0, din: 0.2 });
}

/* ============================================================
   CH5 중국 (B208–232)
   ============================================================ */
const CN = (() => {
  const mk = (seed, a, b, n = 34) => { const R = mulberry32(seed), out = []; for (let i = 0; i < n; i++) { const p = i / (n - 1); out.push(lerp(a, b, Math.pow(p, 1.25)) + (R() - 0.5) * 0.07 + Math.sin(i * 0.7 + seed) * 0.03); } out[n - 1] = b; return out; };
  const sh = mk(3, 0.3, 0.62), sz = mk(9, 0.22, 0.82);
  for (let i = 0; i < sh.length - 1; i++) { sh[i] = Math.min(sh[i], 0.6); sz[i] = Math.min(sz[i], 0.8); }
  return { sh, sz };
})();
function sChina(B, t, F) {
  const Rd = C.red;
  group(B, 211.6, 232.2, () => {
    const x = 110, y = 190, w = 960, h = 780;
    panel(x, y, w, h);
    text('중국 증시, 저점까지 밀렸다', x + 44, y + 64, { size: 40, w: 900, align: 'left' });
    conceptTag(x + w - 40, y + 64);
    const px0 = x + 70, px1 = x + w - 70, py0 = y + 150, py1 = y + h - 90;
    const dx = px0 + (px1 - px0) * 0.72; // end of decline
    const yv = (v) => lerp(py0, py1, v);
    // floor + bounce (B226+)
    const bp = Ease.inOutCubic(pr(B, 226, 228.5));
    const series = [[CN.sh, Rd, '상하이종합'], [CN.sz, C.pink, '선전성분']];
    series.forEach(([arr, col, nm], si) => {
      const pts = arr.map((v, i) => [px0 + (i / (arr.length - 1)) * (dx - px0), yv(v)]);
      const last = pts[pts.length - 1];
      if (bp > 0) for (let k = 1; k <= 8; k++) { const u = k / 8; pts.push([lerp(dx, px1 - 20, u), last[1] - Math.sin(u * 1.2) * (130 + si * 30) + (k === 1 ? 6 : 0)]); }
      const xmax = B < 226 ? lerp(px0, dx, Ease.inOutSine(pr(B, 212 + si * 0.4, 215.6 + si * 0.4))) : lerp(dx, px1 - 20, bp);
      const vis = polyUpToX(pts, xmax);
      g.strokeStyle = col; g.lineWidth = 8; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); vis.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      g.lineJoin = 'miter'; g.lineCap = 'butt';
      const hd = vis[vis.length - 1]; circle(hd[0], hd[1], 12, col);
      text(nm, px0 + 10, yv(arr[0]) + (si ? -40 : 46), { size: 26, w: 800, color: col, align: 'left', alpha: pr(B, 212.5 + si * 0.4, 213.2 + si * 0.4) });
    });
    // low markers
    const lows = [[CN.sh, Rd, '두 달여 만의 저점', 216], [CN.sz, C.pink, '10개월여 만의 저점', 217]];
    lows.forEach(([arr, col, lb, b0], i) => {
      const p = popE(B, b0, 0.5, 2.2);
      if (p <= 0) return;
      const ly = yv(arr[arr.length - 1]);
      ring(B, b0, dx, ly, { col, r: 140, lw: 8 });
      const fo = 1 - pr(B, 225.5, 226);
      if (fo > 0) { g.save(); g.globalAlpha *= fo; g.translate(dx + 30, ly); g.scale(p, p); pill(lb, 0, 0, { size: 26, w: 800, fill: col, color: C.white, align: 'left' }); g.restore(); }
    });
    if (B >= 226) {
      const fy = yv(CN.sz[CN.sz.length - 1]) + 22;
      g.strokeStyle = C.ink; g.lineWidth = 4; g.setLineDash([12, 10]); line(px0, fy, lerp(px0, px1, Ease.outCubic(pr(B, 226, 227))), fy); g.setLineDash([]);
      text('바닥?', px0 + 10, fy + 30, { size: 28, w: 900, align: 'left', alpha: pr(B, 226.3, 227) });
      const pp = popE(B, 228, 0.5, 2);
      if (pp > 0) { g.save(); g.translate(px1 - 30, py0 + 40); g.scale(pp, pp); pill('바닥론, 슬슬 확산', 0, 0, { size: 36, w: 900, fill: C.ink, color: C.white, align: 'right' }); g.restore(); }
    }
  }, { dy: 80 });
  // right: rumor + precedents
  group(B, 217.6, 232.2, () => {
    const x = 1110, w = 700;
    const rp = popE(B, 218, 0.5, 2);
    if (rp > 0) {
      g.save(); g.translate(x + w / 2, 330); g.scale(rp, rp);
      panel(-w / 2, -130, w, 250, { r: 40 });
      g.fillStyle = C.white; g.beginPath(); g.moveTo(-160, 118); g.lineTo(-210, 175); g.lineTo(-100, 118); g.fill();
      circle(-w / 2 + 100, -10, 60, C.redL); text('?', -w / 2 + 100, -6, { size: 80, w: 900, color: Rd });
      text('주식 매도에 리밋?', -w / 2 + 190, -36, { size: 50, w: 900, align: 'left' });
      pill('소문 · 아직 공식 확인 안 됨', -w / 2 + 190, 40, { size: 24, w: 800, fill: C.inkF, color: C.inkD, align: 'left', h: 42 });
      g.restore();
    }
    text('전례가 있다', x + 10, 530, { size: 36, w: 900, align: 'left', alpha: pr(B, 219.5, 220.1) });
    const items = [
      { b: 220, d: '작년 4월', s: '헤지펀드 일일 순매도에 상한' },
      { b: 222, d: '올해 7월', s: '국가대표팀 600억 위안 투입' },
      { b: 224, d: '+ 부양책', s: '주택담보대출 보조금 등' },
    ];
    g.strokeStyle = 'rgba(22,32,74,0.15)'; g.lineWidth = 6;
    const lp = Ease.outCubic(pr(B, 220, 224.5));
    if (lp > 0) line(x + 40, 600, x + 40, 600 + 300 * lp);
    items.forEach((it, i) => {
      const p = Ease.outExpo(pr(B, it.b, it.b + 0.6));
      if (p <= 0) return;
      const yy = 610 + i * 130;
      g.save(); g.globalAlpha *= p; g.translate((1 - p) * 80, 0);
      circle(x + 40, yy, 20, i === 2 ? C.yellow : Rd); circle(x + 40, yy, 8, C.white);
      text(it.d, x + 84, yy - 18, { size: 28, w: 800, color: i === 2 ? '#C98A00' : Rd, align: 'left' });
      text(it.s, x + 84, yy + 24, { size: 38, w: 900, align: 'left' });
      g.restore();
    });
  }, { dy: 60 });
}

/* ============================================================
   CH6 코스피 (B232–272)
   ============================================================ */
const KOSPI_PTS = [[0, 0.22], [0.06, 0.3], [0.1, 0.2], [0.16, 0.28], [0.21, 0.36], [0.26, 0.62], [0.3, 0.52], [0.34, 0.6], [0.39, 0.5], [0.44, 0.58], [0.49, 0.49], [0.54, 0.57], [0.58, 0.5], [0.62, 0.4], [0.67, 0.55], [0.71, 0.74], [0.75, 0.64], [0.8, 0.7], [0.85, 0.58], [0.9, 0.86], [0.95, 0.7], [1, 0.62]];
const US_PTS = [[0, 0.12], [0.2, 0.22], [0.4, 0.3], [0.55, 0.42], [0.62, 0.5], [0.7, 0.58], [0.8, 0.7], [0.9, 0.82], [1, 0.9]];
function smoothPts(pts, n = 160, seed = 1) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1);
    let i = 0; while (i < pts.length - 2 && pts[i + 1][0] < u) i++;
    const a = pts[i], b = pts[i + 1], f = Ease.inOutSine(clamp((u - a[0]) / (b[0] - a[0])));
    out.push([u, lerp(a[1], b[1], f) + vnoise(k * 0.35, seed) * 0.018]);
  }
  return out;
}
const KOSPI_S = smoothPts(KOSPI_PTS, 160, 4), US_S = smoothPts(US_PTS, 160, 8);
function sKospi(B, t, F) {
  const Tl = C.teal;
  // A · 30 years (B236–244)
  group(B, 235.6, 244.3, () => {
    const x = 110, y = 190, w = 1700, h = 560;
    panel(x, y, w, h);
    text('30년을 지켜보면', x + 44, y + 64, { size: 40, w: 900, align: 'left' });
    conceptTag(x + w - 40, y + 64);
    const px0 = x + 60, px1 = x + w - 60, py0 = y + 130, py1 = y + h - 50;
    const map = (p) => [lerp(px0, px1, p[0]), lerp(py1, py0, p[1])];
    const dp = Ease.inOutSine(pr(B, 236, 240));
    // box range
    const bxp = Ease.outExpo(pr(B, 240, 240.7));
    if (bxp > 0) {
      const [ax, ay] = map([0.27, 0.65]), [bx, by] = map([0.6, 0.45]);
      g.fillStyle = C.yellow + '55'; rr(ax, ay, (bx - ax) * bxp, by - ay, 16); g.fill();
      g.strokeStyle = '#E0A800'; g.lineWidth = 4; g.setLineDash([10, 8]); rr(ax, ay, (bx - ax) * bxp, by - ay, 16); g.stroke(); g.setLineDash([]);
      text('급등 후 수년간 박스권', ax + 20, ay - 30, { size: 30, w: 900, color: '#B98500', align: 'left', alpha: bxp });
    }
    const usp = Ease.inOutSine(pr(B, 241.5, 243));
    if (usp > 0) {
      const pts = US_S.slice(0, Math.max(2, Math.floor(US_S.length * usp))).map(map);
      g.strokeStyle = C.inkS; g.lineWidth = 6; g.setLineDash([3, 12]); g.lineCap = 'round';
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
      const e = pts[pts.length - 1]; text('미국', e[0] - 10, e[1] - 30, { size: 26, w: 800, color: C.inkD, align: 'right' });
      const pp = popE(B, 242.5, 0.5);
      if (pp > 0) { const [mx, my] = map([0.62, 0.3]); g.save(); g.translate(mx, my); g.scale(pp, pp); pill('미국과 따로 움직이기도', 0, 0, { size: 28, w: 800, fill: C.ink, color: C.white, align: 'center' }); g.restore(); }
    }
    const pts = KOSPI_S.slice(0, Math.max(2, Math.floor(KOSPI_S.length * dp))).map(map);
    g.strokeStyle = Tl; g.lineWidth = 8; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    g.lineJoin = 'miter'; g.lineCap = 'butt';
    const hd = pts[pts.length - 1]; circle(hd[0], hd[1], 13, Tl);
    text('코스피', hd[0] + 26, hd[1], { size: 28, w: 900, color: Tl, align: 'left', alpha: dp });
    revealUp('코스피는 원래 사람 속을 뒤집는 경우가 많다', 150, 840, { size: 60, w: 900, align: 'left' }, B, 238, 0.6, 0.02);
    rise('배신감은 클 것이다. 하지만 원래 그런 시장이다.', 152, 925, { size: 34, w: 700, color: C.inkD, align: 'left' }, B, 239.5);
  }, { dy: 70 });
  // B · foreign selling + ownership (B244–252)
  group(B, 244, 252, () => {
    const x = 110, y = 190, w = 820, h = 780;
    panel(x, y, w, h);
    text('올해 외국인 누적 순매도', x + 44, y + 64, { size: 38, w: 900, align: 'left' });
    const cp = Ease.outCubic(pr(B, 244, 246));
    const nw = numUnit(String(Math.round(200 * cp)), '조원', x + 44, y + 260, { size: 150, w: 900, color: Tl, align: 'left', unitSize: 60 });
    text('안팎', x + 44 + nw + 14, y + 260, { size: 34, w: 800, color: C.inkD, align: 'left', base: 'alphabetic', alpha: cp });
    const sp = Ease.outExpo(pr(B, 244.5, 244.85));
    if (sp > 0) { g.save(); g.translate(x + 660, y + 140); g.rotate(-0.14); g.scale(lerp(2, 1, sp), lerp(2, 1, sp)); g.globalAlpha *= Math.min(1, sp * 3); g.strokeStyle = C.coral; g.lineWidth = 7; rr(-110, -44, 220, 88, 14); g.stroke(); text('사상 최대', 0, 2, { size: 42, w: 900, color: C.coral }); g.restore(); }
    // falling bar
    g.fillStyle = 'rgba(22,32,74,0.08)'; rr(x + 44, y + 320, w - 88, 30, 15); g.fill();
    g.fillStyle = Tl; rr(x + 44, y + 320, (w - 88) * cp, 30, 15); g.fill();
    const tp = Ease.outExpo(pr(B, 246.5, 247.1));
    if (tp > 0) {
      g.save(); g.globalAlpha *= tp;
      text('오히려 긍정적 신호일 수 있다', x + 44, y + 450, { size: 42, w: 900, align: 'left' });
      text('금융위기급 매도가', x + 44, y + 530, { size: 34, w: 700, color: C.inkD, align: 'left' });
      text('이미 소화됐다는 뜻이기 때문', x + 44, y + 578, { size: 34, w: 700, color: C.inkD, align: 'left' });
      checkMark(x + w - 100, y + 540, 80, Tl, pr(B, 247, 247.5), 8);
      g.restore();
    }
    // ownership donut
    const px = 990, pw = 820;
    const dpp = Ease.outExpo(pr(B, 248, 248.6));
    if (dpp > 0) {
      g.save(); g.globalAlpha *= dpp; g.translate((1 - dpp) * 120, 0);
      panel(px, y, pw, h);
      text('외국인 코스피 보유 비중', px + 44, y + 64, { size: 38, w: 900, align: 'left' });
      const dv = 0.4 * Ease.inOutCubic(pr(B, 248, 249.4));
      donut(px + pw / 2, y + 330, 165, 52, dv, Tl);
      numUnit(String(Math.round(dv * 100)), '%', px + pw / 2, y + 360, { size: 96, w: 900, color: Tl, unitSize: 44 });
      text('가까이 유지', px + pw / 2, y + 420, { size: 28, w: 800, color: C.inkD });
      const r1 = popE(B, 249.5, 0.45), r2 = popE(B, 250, 0.45);
      if (r1 > 0) { g.save(); g.translate(px + pw / 2, y + 590); g.scale(r1, r1); text('팔고 떠났다', 40, 0, { size: 40, w: 900, color: C.inkS }); circle(-140, 0, 30, C.inkS); crossMark(-140, 0, 34, C.white, 1); g.restore(); }
      if (r2 > 0) { g.save(); g.translate(px + pw / 2, y + 680); g.scale(r2, r2); pill('급등한 반도체 비중 조절', 30, 0, { size: 38, w: 900, fill: Tl, color: C.white, align: 'center' }); circle(-250, 0, 30, Tl); checkMark(-250, 2, 36, C.white, 1, 7); g.restore(); }
      g.restore();
    }
  }, { dy: 70, dout: 0.3 });
  // C · DROP: Samsung 107조 (B252–256) then what the market watches (B256–260)
  group(B, 252, 256.3, () => {
    text('삼성전자 3분기 영업이익', CX, 260, { size: 56, w: 900, alpha: pr(B, 252, 252.3) });
    const cp = Ease.outExpo(pr(B, 252, 253));
    const s = lerp(1.6, 1, Ease.outExpo(pr(B, 252, 252.4)));
    g.save(); g.translate(CX, 560); g.scale(s, s);
    numUnit(String(Math.round(107 * cp)), '조원', 0, 0, { size: 320, w: 900, color: Tl, unitSize: 120 });
    g.restore();
    ring(B, 252, CX, 460, { col: Tl, r: 900, lw: 22, alpha: 0.5 });
    confetti(B, 252, CX, 450, { n: 60, seed: 31, v1: 1800 });
    const bp = popE(B, 253, 0.5, 2.2);
    if (bp > 0) { g.save(); g.translate(CX, 700); g.scale(bp, bp); pill('국내 기업 최초 · 분기 영업이익 100조원 돌파', 0, 0, { size: 38, w: 900, fill: C.yellow, align: 'center' }); g.restore(); }
    const o = { size: 56, w: 900, colorFn: hl('그런데 외국인은 그 직후에도 팔았다', '팔았다', C.coral) };
    rise('그런데 외국인은 그 직후에도 팔았다', CX, 860, o, B, 254.6);
  }, { dy: 0, din: 0.15, dout: 0.3 });
  group(B, 256, 260.3, () => {
    revealUp('시장이 보는 것은 숫자 자체가 아니다', CX, 230, { size: 56, w: 900 }, B, 256, 0.5, 0.015);
    const nodes = [
      { b: 256, t: '메모리', s: '삼성전자 · SK하이닉스', col: C.inkS },
      { b: 257, t: '사가는 쪽', s: '미국 하이퍼스케일러 · 파운데이션 모델 기업', col: Tl },
      { b: 258, t: '실적 · 설비투자 전망', s: '이달 말 빅테크 실적 · 내년 투자 가이던스', col: C.blue },
    ];
    nodes.forEach((n, i) => {
      const p = popE(B, n.b + 0.2, 0.5, 2);
      if (p <= 0) return;
      const cx = 360 + i * 600, cy = 520;
      g.save(); g.translate(cx, cy); g.scale(p, p);
      panel(-270, -150, 540, 300, { r: 30, fill: i === 1 ? Tl : C.white });
      text(n.t, 0, -40, { size: 52, w: 900, color: i === 1 ? C.white : n.col });
      const fs = Math.min(30, fitSize(n.s, 480, 30, 700));
      text(n.s, 0, 40, { size: fs, w: 700, color: i === 1 ? C.white : C.inkD });
      g.restore();
      if (i > 0) arrow(cx - 600 + 280, cy, cx - 285, cy, C.ink, 8, 26, Ease.outCubic(pr(B, n.b, n.b + 0.5)));
    });
    const o = { size: 50, w: 900, colorFn: hl('이것이 코스피의 방향을 결정한다', '코스피의 방향', Tl) };
    rise('이것이 코스피의 방향을 결정한다', CX, 820, o, B, 258.8);
  }, { dy: 50, dout: 0.3 });
  // D · cheap valuation, calm (B260–272)
  group(B, 260, 272.2, () => {
    const x = 110, y = 190, w = 860, h = 780;
    panel(x, y, w, h);
    text('코스피 12개월 선행 PER', x + 44, y + 64, { size: 38, w: 900, align: 'left' });
    conceptTag(x + w - 40, y + 64);
    const base = y + h - 130;
    g.strokeStyle = C.inkF; g.lineWidth = 3; line(x + 80, base, x + w - 80, base);
    const b1 = Ease.outBack(pr(B, 261, 262), 1.4), b2 = Ease.outBack(pr(B, 262, 263), 1.4);
    if (b1 > 0) { g.fillStyle = 'rgba(22,32,74,0.18)'; rr(x + 170, base - 430 * b1, 220, 430 * b1, 18); g.fill(); }
    if (b2 > 0) { g.fillStyle = Tl; rr(x + 470, base - 330 * b2, 220, 330 * b2, 18); g.fill(); }
    text('금융위기 저점', x + 280, base + 44, { size: 30, w: 800, color: C.inkD });
    text('최근 (한때)', x + 580, base + 44, { size: 30, w: 800, color: Tl });
    if (b2 > 0.3) numUnit('5~6', '배', x + 580, base - 330 * b2 + 100, { size: 76, w: 900, color: C.white, unitSize: 36, alpha: pr(b2, 0.3, 0.8) });
    if (B >= 264.5) {
      const lp = Ease.outExpo(pr(B, 264.5, 265.2));
      g.strokeStyle = C.coral; g.lineWidth = 4; g.setLineDash([12, 10]); line(x + 150, base - 430, lerp(x + 150, x + w - 80, lp), base - 430); g.setLineDash([]);
      pill('금융위기 저점보다도 낮아졌다', x + w - 90, base - 500, { size: 28, w: 800, fill: C.coral, color: C.white, align: 'right' });
    }
    // right column text
    revealUp('숫자는 정직하다', 1030, 330, { size: 84, w: 900, align: 'left' }, B, 261, 0.6, 0.04);
    rise('지금 꽤 저렴하다면,', 1032, 470, { size: 44, w: 800, color: C.inkD, align: 'left' }, B, 264);
    rise('때가 되면 결국 그 대가를 받게 된다', 1032, 535, { size: 44, w: 800, color: C.inkD, align: 'left' }, B, 264.6);
    const pp = Ease.outExpo(pr(B, 266, 267));
    if (pp > 0) {
      g.save(); g.globalAlpha *= pp; g.translate(0, (1 - pp) * 40);
      panel(1030, 650, 780, 190, { r: 95, fill: Tl });
      text('느긋한 마음으로 접근하자', 1420 + 40, 745, { size: 52, w: 900, color: C.white });
      // calm sun / clock
      const cx = 1120, cy = 745;
      circle(cx, cy, 50, C.white);
      g.strokeStyle = Tl; g.lineWidth = 7; g.lineCap = 'round';
      const a = t * 0.6; line(cx, cy, cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); line(cx, cy, cx + Math.cos(a * 0.08 - 1) * 20, cy + Math.sin(a * 0.08 - 1) * 20);
      g.lineCap = 'butt';
      g.restore();
    }
    if (B >= 268) checkMark(1740, 560, 80, Tl, pr(B, 268, 268.6), 8);
  }, { dy: 60 });
}

/* ============================================================
   RISKS (B272–304)
   ============================================================ */
const RISKS = [
  { b: 276, t: '12월 추가 인상 · 장기금리 재상승', s: '10년물이 다시 5.3%를 넘으면 밸류에이션 부담↑' },
  { b: 282, t: '미·이란 전쟁 → 유가 · 원/달러 환율', s: '외국인 수급과 직결' },
  { b: 288, t: '삼성전자·SK하이닉스 자사주 매입 종료', s: '이후 생길 수 있는 수급 공백' },
  { b: 294, t: '11월 데이터센터 주민투표 결과', s: '빅테크의 2027년 설비투자 가이던스' },
];
function riskVisual(k, B, t, x, y, w, h) {
  const Y = '#E0A400';
  if (k === 0) {
    text('미국 10년물', x + 40, y + 60, { size: 30, w: 900, align: 'left' });
    const px0 = x + 50, px1 = x + w - 50, py0 = y + 140, py1 = y + h - 80;
    const vy = (v) => lerp(py1, py0, (v - 4.8) / 0.7);
    g.fillStyle = C.coral + '22'; g.fillRect(px0, py0, px1 - px0, vy(5.3) - py0);
    g.strokeStyle = C.coral; g.lineWidth = 4; g.setLineDash([12, 10]); line(px0, vy(5.3), px1, vy(5.3)); g.setLineDash([]);
    text('5.3%', px1, vy(5.3) - 28, { size: 34, w: 900, color: C.coral, align: 'right' });
    text('부담 구간', px1, py0 + 30, { size: 24, w: 800, color: C.coral, align: 'right' });
    const pts = []; for (let i = 0; i < 40; i++) { const u = i / 39; pts.push([lerp(px0, px1 - 40, u), vy(5.08 + Math.sin(u * 5) * 0.09 + u * 0.16 + vnoise(i * 0.6, 2) * 0.03)]); }
    const vis = polyUpToX(pts, lerp(px0, px1 - 40, Ease.inOutSine(pr(B, 276.5, 279))));
    g.strokeStyle = C.blue; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); vis.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.lineJoin = 'miter';
    const hd = vis[vis.length - 1]; circle(hd[0], hd[1], 11, C.blue);
    text('?', hd[0] + 30, hd[1] - 30, { size: 48, w: 900, color: C.coral, alpha: pr(B, 279, 279.5) });
  } else if (k === 1) {
    const cx = x + w / 2;
    // oil drop
    g.save(); g.translate(cx - 140, y + 260 + Math.sin(t * 2) * 8);
    g.fillStyle = C.ink; g.beginPath(); g.moveTo(0, -110); g.bezierCurveTo(70, -20, 90, 30, 0, 90); g.bezierCurveTo(-90, 30, -70, -20, 0, -110); g.fill();
    circle(-22, 20, 14, 'rgba(255,255,255,0.5)');
    g.restore();
    text('유가', cx - 140, y + 400, { size: 34, w: 900 });
    circle(cx + 140, y + 260, 90, C.yellow);
    text('₩/$', cx + 140, y + 262, { size: 52, w: 900 });
    text('환율', cx + 140, y + 400, { size: 34, w: 900 });
    const ap = Ease.outCubic(pr(B, 283, 283.8));
    arrow(cx - 140, y + 470, cx - 10, y + 560, C.coral, 7, 22, ap);
    arrow(cx + 140, y + 470, cx + 10, y + 560, C.coral, 7, 22, ap);
    pill('외국인 수급', cx, y + 600, { size: 34, w: 900, fill: C.coral, color: C.white, align: 'center' });
  } else if (k === 2) {
    const cx = x + w / 2;
    pill('삼성전자', cx - 150, y + 150, { size: 32, w: 900, fill: C.blueL, color: C.blue, align: 'center' });
    pill('SK하이닉스', cx + 150, y + 150, { size: 32, w: 900, fill: C.redL, color: C.red, align: 'center' });
    text('자사주 매입 종료 이후', cx, y + 250, { size: 32, w: 800, color: C.inkD });
    const p = Ease.outCubic(pr(B, 289, 290.5));
    g.fillStyle = C.blue; rr(cx - 220, y + 320, 140, 260, 16); g.fill();
    g.strokeStyle = C.coral; g.lineWidth = 6; g.setLineDash([14, 10]); rr(cx - 60, y + 320 + 260 * (1 - p) * 0.3, 140, 260, 16); g.stroke(); g.setLineDash([]);
    text('?', cx + 10, y + 455, { size: 80, w: 900, color: C.coral, alpha: p });
    g.fillStyle = 'rgba(22,32,74,0.14)'; rr(cx + 100, y + 400, 140, 180, 16); g.fill();
    text('수급 공백', cx + 10, y + 640, { size: 38, w: 900, color: C.coral, alpha: p });
  } else {
    const cx = x + w / 2;
    for (let i = 0; i < 6; i++) ballot(cx - 200 + (i % 3) * 200 - (i >= 3 ? -100 : 0) - (i >= 3 ? 100 : 0), y + 200 + Math.floor(i / 3) * 110, 1.2 * popE(B, 294.2 + i * 0.08, 0.4), C.orange, true);
    text('11월 주민투표 34건', cx, y + 410, { size: 34, w: 900, color: C.orange });
    const bars = [0.5, 0.75, 1];
    bars.forEach((v, i) => { const p = Ease.outBack(pr(B, 295 + i * 0.3, 295.8 + i * 0.3), 1.5); if (p <= 0) return; g.fillStyle = i === 2 ? C.blue : C.blueL; rr(cx - 160 + i * 120, y + 680 - 180 * v * p, 90, 180 * v * p, 12); g.fill(); });
    text('2027?', cx + 80, y + 680 - 180 - 40, { size: 30, w: 900, color: C.blue, alpha: pr(B, 296, 296.5) });
    text('빅테크 설비투자 가이던스', cx, y + 720, { size: 28, w: 800, color: C.inkD });
  }
}
function sRisk(B, t, F) {
  group(B, 275.5, 304.2, () => {
    const x = 110, y = 190, w = 1050;
    const act = B < 282 ? 0 : B < 288 ? 1 : B < 294 ? 2 : 3;
    const allDone = B >= 297;
    RISKS.forEach((r, i) => {
      const p = Ease.outExpo(pr(B, r.b - 0.5, r.b + 0.1));
      if (p <= 0) return;
      const ry = y + i * 196, active = i === act && !allDone;
      g.save(); g.globalAlpha *= p * (active || allDone ? 1 : 0.6); g.translate((1 - p) * -120, 0);
      const sc = active ? 1.02 : 1;
      g.translate(x + w / 2, ry + 85); g.scale(sc, sc); g.translate(-(x + w / 2), -(ry + 85));
      panel(x, ry, w, 170, { r: 28 });
      if (active) { g.fillStyle = C.yellow; rr(x, ry, 16, 170, 8); g.fill(); }
      // checkbox
      g.lineWidth = 6; g.strokeStyle = C.ink; rr(x + 50, ry + 52, 66, 66, 14); g.stroke();
      if (B >= r.b) { g.fillStyle = C.yellow; rr(x + 50, ry + 52, 66, 66, 14); g.fill(); g.stroke(); checkMark(x + 83, ry + 86, 60, C.ink, pr(B, r.b, r.b + 0.4), 8); }
      const ts = Math.min(42, fitSize(r.t, w - 220, 42, 900));
      text(r.t, x + 160, ry + 62, { size: ts, w: 900, align: 'left' });
      text(r.s, x + 160, ry + 118, { size: 30, w: 700, color: C.inkD, align: 'left' });
      g.restore();
    });
    // right visual
    const vx = 1210, vw = 600, vh = 776;
    const vp = Ease.outExpo(pr(B, 276, 276.7));
    if (vp > 0) {
      g.save(); g.globalAlpha *= vp; g.translate((1 - vp) * 120, 0);
      panel(vx, y, vw, vh);
      const k = allDone ? -1 : act;
      if (k >= 0) {
        const kb = RISKS[k].b;
        const sw = Ease.outExpo(pr(B, kb, kb + 0.6)), so = k < 3 ? Ease.inCubic(pr(B, kb + 5.6, kb + 6)) : Ease.inCubic(pr(B, 296.6, 297));
        g.save(); g.beginPath(); rr(vx, y, vw, vh, 28); g.clip();
        g.globalAlpha *= sw * (1 - so); g.translate((1 - sw) * 60, 0);
        text(String(k + 1).padStart(2, '0'), vx + vw - 40, y + 64, { size: 34, w: 900, color: '#E0A400', align: 'right' });
        riskVisual(k, B, t, vx, y, vw, vh);
        g.restore();
      } else {
        const p = popE(B, 297, 0.6, 1.8);
        g.save(); g.translate(vx + vw / 2, y + vh / 2 - 40); g.scale(p, p);
        circle(0, 0, 150, C.yellow); checkMark(0, 6, 190, C.ink, pr(B, 297.2, 297.8), 9);
        g.restore();
        text('4가지만 체크', vx + vw / 2, y + vh / 2 + 200, { size: 50, w: 900, alpha: pr(B, 297.5, 298) });
        text('흔들림은 줄고, 판단은 선명해진다', vx + vw / 2, y + vh / 2 + 262, { size: 28, w: 700, color: C.inkD, alpha: pr(B, 298, 298.6) });
      }
      g.restore();
    }
  }, { dy: 60, dout: 0.4 });
}

/* ============================================================
   OUTRO (B304–322)
   ============================================================ */
const NEXT = [
  { s: '10/28 FOMC', col: C.coral },
  { s: '11/3 중간선거', col: C.violet },
  { s: '11월 주민투표 34건', col: C.orange },
  { s: '12월 FOMC', col: C.blue },
];
function sunburst(x, y, r, n, cols, rot, alpha) {
  const a0 = g.globalAlpha;
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * TAU;
    g.globalAlpha = a0 * alpha; g.fillStyle = cols[k % cols.length];
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a, a + (TAU / n) * 0.5); g.closePath(); g.fill();
  }
  g.globalAlpha = a0;
}
function sOutro(B, t, F) {
  const fade = Ease.inOutSine(pr(B, 319, 321.5));
  const sb = Ease.outExpo(pr(B, 304, 305.2));
  sunburst(CX, 400, 1500 * sb, 28, [C.blue, C.yellow, C.coral, C.mint, C.violet, C.sky, C.pink], t * 0.06, 0.08 * (1 - fade) * (1 + F.kick * 0.3));
  g.save(); g.globalAlpha *= 1 - fade * 0.85;
  const o1 = { size: 210, w: 900, color: C.blue, ls: -8 };
  shaky('흔들리지 말자.', CX, 350, o1, B, 304, 305, 1.4);
  ring(B, 305, CX, 350, { col: C.blue, r: 900, lw: 16, alpha: 0.4 });
  confetti(B, 304, CX, 340, { n: 70, seed: 41, v1: 1900 });
  const o2 = { size: 120, w: 900 };
  if (B >= 308) {
    marker('다만, 확인하자.', '확인', CX - 40, 590, o2, pr(B, 308.6, 309.2));
    revealUp('다만, 확인하자.', CX - 40, 590, o2, B, 308, 0.6, 0.05);
    const ew = textW('다만, 확인하자.', 120, 900);
    const cp = popE(B, 309, 0.45);
    if (cp > 0) { circle(CX - 40 + ew / 2 + 90, 590, 60 * cp, C.mint); checkMark(CX - 40 + ew / 2 + 90, 593, 70, C.white, pr(B, 309.1, 309.6), 9); }
  }
  if (B >= 311.5) {
    text('다음 체크포인트', CX, 760, { size: 32, w: 800, color: C.inkD, alpha: pr(B, 311.5, 312) });
    const ws = NEXT.map((n) => textW(n.s, 38, 900) + 38 * 1.5 + 38 * 0.85);
    const tot = ws.reduce((a, b) => a + b, 0) + 30 * (NEXT.length - 1);
    let xx = CX - tot / 2;
    NEXT.forEach((n, i) => {
      const p = popE(B, 312 + i * 0.5, 0.45, 2.4);
      if (p > 0) { g.save(); g.translate(xx + ws[i] / 2, 850); g.scale(p, p); pill(n.s, 0, 0, { size: 38, w: 900, dot: n.col, shadow: true, align: 'center' }); g.restore(); }
      xx += ws[i] + 30;
    });
  }
  g.restore();
  const da = pr(B, 316.5, 317.5);
  if (da > 0) {
    text('본 영상은 정보 제공용 콘텐츠이며 특정 자산의 매수·매도를 권유하지 않습니다. 일부 차트는 흐름을 보여주는 개념도입니다.', CX, 985, { size: 22, w: 600, color: C.inkD, alpha: da });
    text('투자 판단과 그에 따른 책임은 투자자 본인에게 있습니다.', CX, 1020, { size: 22, w: 600, color: C.inkD, alpha: da });
  }
}

/* ============================================================
   COMPOSITION
   ============================================================ */
const SCENES = [
  { b0: 0, b1: 16, f: sIntro },
  { b0: 16, b1: 32, f: sTitle },
  { b0: 32, b1: 64.2, f: sSetup },
  { b0: 67.5, b1: 96.2, f: sEarnings },
  { b0: 99.5, b1: 136.2, f: sFomc },
  { b0: 139.5, b1: 168.2, f: sElection },
  { b0: 171.5, b1: 208.2, f: sDataCenter },
  { b0: 211.5, b1: 232.2, f: sChina },
  { b0: 235.5, b1: 272.2, f: sKospi },
  { b0: 275.5, b1: 304.2, f: sRisk },
  { b0: 304, b1: TOTAL_BEATS + 1, f: sOutro },
];
function drawFrame(t) {
  const B = t / SPB;
  const F = { kick: env(KICKS, t, 9), energy: energyAt(t) };
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.setLineDash([]); g.lineCap = 'butt'; g.lineJoin = 'miter';
  background(B, t, F);
  const cam = camera(B, t);
  g.save();
  g.translate(CX + cam.sx, CY + cam.sy); g.rotate(cam.r); g.scale(cam.z, cam.z); g.translate(-CX, -CY);
  for (const s of SCENES) if (B >= s.b0 && B < s.b1) s.f(B, t, F);
  for (let k = 0; k < CH.length; k++) chapterHeader(B, k);
  g.restore();
  drawTracker(B);
  drawHUD(B);
  // transitions (screen space)
  bandsIn(B, 32, [C.white, C.yellow, C.blue], 0.9);
  if (B >= 32 && B < 32.7) { const p = Ease.outCubic(pr(B, 32, 32.7)); g.fillStyle = C.blue; g.fillRect(-100, -100 + p * (H + 200), W + 200, H + 200); }
  for (let k = 0; k < CH.length; k++) chapterCard(B, k);
  return postParams(B, t);
}
