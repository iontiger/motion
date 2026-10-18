'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   B = t / SPB (time in beats). Cue sheet is shared with music.js
   ============================================================ */
let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };
const BREAKS = [16, 64, 92, 120, 184, 240];                    // drops after a half-beat of silence
const inBreak = (B) => BREAKS.some((b) => B >= b - 0.5 && B < b);

const SECT = [
  { b: 0, tint: '#0B1430', cols: [C.cyan, C.pink, C.ewt] },
  { b: 16, tint: '#2A0B26', cols: [C.pink, C.yellow, C.cyan] },
  { b: 32, tint: '#0A1A33', cols: [C.cyan, C.ewt, C.ewy] },
  { b: 64, tint: '#2B1206', cols: [C.ewy, C.red, C.yellow] },
  { b: 92, tint: '#2A0B26', cols: [C.pink, C.violet, C.cyan] },
  { b: 100, tint: '#22091A', cols: [C.pink, C.tsmc, C.samsung] },
  { b: 140, tint: '#150C33', cols: [C.violet, C.cyan, C.hynix] },
  { b: 168, tint: '#071A36', cols: [C.ewt, C.candle, C.mint] },
  { b: 200, tint: '#231A05', cols: [C.gold, C.mint, C.red] },
  { b: 240, tint: '#2A0B26', cols: [C.pink, C.yellow, C.cyan, C.ewy, C.mint] },
];
const sectAt = (B) => { let s = SECT[0]; for (const x of SECT) if (B >= x.b) s = x; return s; };

/* ---------------- background ---------------- */
let GRID = null;
function makeGrid() {
  const c = document.createElement('canvas'); c.width = W + 240; c.height = H + 240;
  const x = c.getContext('2d');
  x.strokeStyle = 'rgba(120,170,255,0.06)'; x.lineWidth = 1.5;
  for (let i = 0; i <= c.width; i += 60) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, c.height); x.stroke(); }
  for (let j = 0; j <= c.height; j += 60) { x.beginPath(); x.moveTo(0, j); x.lineTo(c.width, j); x.stroke(); }
  x.fillStyle = 'rgba(120,170,255,0.16)';
  for (let i = 0; i <= c.width; i += 240) for (let j = 0; j <= c.height; j += 240) x.fillRect(i - 2, j - 2, 4, 4);
  return c;
}
// faint background candles drifting left
const BGC = Array.from({ length: 64 }, (_, i) => ({ o: rnd(i, 11), c: rnd(i, 12), h: rnd(i, 13) }));
function bgCandles(t, alpha) {
  if (alpha <= 0) return;
  const a0 = g.globalAlpha, sp = 34, off = (t * 40) % sp;
  let v = 0.5;
  for (let i = 0; i < BGC.length; i++) {
    const k = BGC[i];
    const x = i * sp - off - 60;
    const o = v, c = clamp(v + (k.c - 0.5) * 0.18, 0.1, 0.9); v = c;
    const y0 = H * 0.78 - o * 520, y1 = H * 0.78 - c * 520;
    const up = c >= o;
    g.globalAlpha = a0 * alpha;
    g.strokeStyle = up ? 'rgba(244,246,255,0.55)' : C.candle; g.lineWidth = 2;
    line(x, Math.min(y0, y1) - k.h * 30, x, Math.max(y0, y1) + k.h * 26);
    if (up) { g.strokeRect(x - 9, Math.min(y0, y1), 18, Math.max(3, Math.abs(y1 - y0))); }
    else { g.fillStyle = C.candle; g.fillRect(x - 9, Math.min(y0, y1), 18, Math.max(3, Math.abs(y1 - y0))); }
  }
  g.globalAlpha = a0;
}
function background(B, t, F) {
  const s = sectAt(B);
  const gr = g.createLinearGradient(0, 0, W * 0.4, H);
  gr.addColorStop(0, C.bg); gr.addColorStop(1, s.tint);
  fillAll(gr);
  // neon glows
  for (let i = 0; i < 3; i++) {
    const x = (0.12 + 0.38 * i) * W + Math.sin(t * 0.21 + i * 2) * 160, y = (i % 2 ? 0.85 : 0.18) * H + Math.cos(t * 0.17 + i) * 100;
    const r = 560 + 120 * F.kick;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, s.cols[i % s.cols.length] + '30'); rg.addColorStop(1, s.cols[i % s.cols.length] + '00');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.drawImage(GRID, -((t * 24) % 60) - 120, -((t * 8) % 60) - 120);
  bgCandles(t, B < 16 ? 0.35 : B >= 240 ? 0.16 : 0.07);
  // beat floor line
  const k = F.kick;
  g.fillStyle = s.cols[0]; g.globalAlpha = 0.08 + k * 0.18; g.fillRect(0, H - 6, W, 6); g.globalAlpha = 1;
}

/* ---------------- camera & post ---------------- */
function camera(B, t) {
  const kick = env(KICKS, t, 10), imp = impactEnv(t, 5);
  let amp = imp * 9;
  let z = 1 + kick * 0.008 + imp * 0.012;
  let sx = Math.sin(t * 0.31) * 6, sy = Math.cos(t * 0.23) * 4;
  for (const b of BREAKS) { // tension: push-in during the riser, freeze in the gap
    const len = b === 240 ? 7.5 : 3.5;
    if (B >= b - len && B < b) z += Ease.inQuad(pr(B, b - len, b - 0.5)) * 0.045;
  }
  if (inBreak(B)) { amp = 0; sx *= 0.3; sy *= 0.3; }
  sx += vnoise(t * 16, 1) * amp; sy += vnoise(t * 16, 2) * amp;
  const r = vnoise(t * 8, 3) * amp * 0.0006;
  return { sx, sy, r, z };
}
const FLASHES = [[16, 0.85], [32, 0.25], [64, 0.7], [92, 0.7], [100, 0.25], [120, 0.7], [140, 0.2], [168, 0.25], [184, 0.7], [200, 0.25], [240, 0.9], [268, 0.6]];
const GLITCHES = [[8.5, 0.5], [9, 0.35], [16, 1], [20, 0.6], [32, 0.4], [64, 0.8], [84, 0.9], [92, 1], [100, 0.4], [120, 0.8], [168, 0.4], [184, 0.8], [200, 0.4], [240, 1], [240.5, 0.6], [268, 0.7]];
function postParams(B, t) {
  const kick = env(KICKS, t, 12), imp = impactEnv(t, 4.5);
  let flash = 0, glitch = 0;
  for (const [fb, s] of FLASHES) { const d = (B - fb) * SPB; if (d >= 0 && d < 0.8) flash = Math.max(flash, s * Math.exp(-d * 8)); }
  for (const [gb, s] of GLITCHES) { const d = (B - gb) * SPB; if (d >= 0 && d < 0.5) glitch = Math.max(glitch, s * Math.exp(-d * 9)); }
  return { ca: 0.15 + imp * 0.9 + kick * 0.25 + glitch * 1.5, flash, bloom: 0.55 + kick * 0.2, grain: 0.03, vig: 0.75, glitch };
}

/* ---------------- layout helpers ---------------- */
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
function fitSize(s, maxW, maxSize, w = 900, f = null) { return Math.min(maxSize, (maxW / textW(s, 100, w, null, f)) * 100); }
function tag(s, x, y) { pill(s, x, y, { size: 20, w: 700, fill: 'rgba(244,246,255,0.1)', color: C.inkD, align: 'right', h: 34, padX: 14 }); }
function marker(str, sub, x, y, o, p, col = C.yellow) {
  if (p <= 0) return;
  const [a, b] = subRange(str, sub, x, o);
  g.fillStyle = col; g.globalAlpha *= 0.9;
  rr(a - 8, y - o.size * 0.02, (b - a + 16) * Ease.outCubic(p), o.size * 0.42, 6); g.fill();
  g.globalAlpha /= 0.9;
}
function glowPath(pts, col, lw, blur = 22) {
  if (pts.length < 2) return;
  g.save();
  g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
  g.shadowColor = col; g.shadowBlur = blur;
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.restore();
}
function dashed(x1, y1, x2, y2, col, lw = 3, d = [10, 8]) { g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(d); line(x1, y1, x2, y2); g.setLineDash([]); }
// glowing vertical bracket with arrow head at the bottom
function dropBracket(x, y0, y1, col, p) {
  if (p <= 0) return;
  const ye = lerp(y0, y1, Ease.outCubic(p));
  g.save(); g.shadowColor = col; g.shadowBlur = 16;
  g.strokeStyle = col; g.lineWidth = 4;
  line(x - 14, y0, x + 14, y0); line(x, y0, x, ye);
  if (p > 0.95) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y1 + 4); g.lineTo(x - 13, y1 - 18); g.lineTo(x + 13, y1 - 18); g.closePath(); g.fill(); }
  g.restore();
}
// the "쫄지마세요" logotype: extruded, gradient filled, neon glow, rgb split
function logo(s, x, y, size, B, b0, o = {}) {
  const st = { size, f: 'disp', ls: -size * 0.02, grad: o.grad || [C.yellow, C.ewy, C.pink], glow: o.glow || C.pink, blur: o.blur || 40, ext: { col: o.ext || '#5A0F3C', n: Math.round(size / 22), dx: size * 0.012, dy: size * 0.018 }, rgb: o.rgb != null ? o.rgb : size * 0.03, align: o.align };
  return chars(s, x, y, st, (i, n) => {
    const lp = pr(B, b0 + i * 0.06, b0 + i * 0.06 + 0.4);
    if (lp <= 0) return false;
    const e = Ease.outExpo(lp), k = Math.exp(-(B - b0 - i * 0.06) * SPB * 6);
    return { s: lerp(2.4, 1, e), a: Math.min(1, lp * 5), y: vnoise(B * 3 + i, 4) * 6, r: (rnd(i, 9) - 0.5) * 0.3 * (1 - e), rgb: 0.25 + k * 2 };
  });
}
// scrolling ticker tape
const TAPE = [['EWY', '150.44', -3.70], ['EWT', '106.26', -2.64], ['TSMC', '10월', -6], ['삼성전자', '10월', -20], ['SK하이닉스', '10월', -33], ['NCLD', '10월', -32], ['MAGS', '10월', -4]];
function tape(y, t, speed, alpha = 1, h = 64) {
  const a0 = g.globalAlpha; g.globalAlpha = a0 * alpha;
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(-40, y - h / 2, W + 80, h);
  g.fillStyle = C.ewy; g.fillRect(-40, y - h / 2, W + 80, 2); g.fillRect(-40, y + h / 2 - 2, W + 80, 2);
  const items = TAPE.map(([n, p, c]) => ({ n, p, c, w: textW(n, 30, 900) + textW(p, 30, 400, null, 'num') + textW(`${c > 0 ? '+' : '−'}${Math.abs(c)}%`, 30, 400, null, 'num') + 120 }));
  const tot = items.reduce((s, it) => s + it.w, 0);
  let x = -((t * speed) % tot);
  while (x < W) {
    for (const it of items) {
      if (x > W) break;
      if (x + it.w > -40) {
        let xx = x + 30;
        xx += text(it.n, xx, y + 1, { size: 30, w: 900, align: 'left' }) + 16;
        xx += text(it.p, xx, y + 3, { size: 30, f: 'num', color: C.inkD, align: 'left', ls: 1 }) + 16;
        const col = it.c < 0 ? C.candle : C.red;
        g.fillStyle = col; g.beginPath(); g.moveTo(xx, y - 8); g.lineTo(xx + 16, y - 8); g.lineTo(xx + 8, y + 6); g.closePath(); g.fill();
        text(`${it.c > 0 ? '+' : '−'}${Math.abs(it.c)}%`, xx + 24, y + 3, { size: 30, f: 'num', color: col, align: 'left', ls: 1 });
      }
      x += it.w;
    }
  }
  g.globalAlpha = a0;
}

/* ---------------- transitions ---------------- */
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
  const fg = c.ink ? '#160E00' : C.white;
  if (B < b) { if (!BREAKS.includes(b)) bandsIn(B, b, [C.pink, C.yellow, c.col], 0.9); return; }
  const out = Ease.inOutCubic(pr(B, b + 3.5, b + 4.3));
  g.save();
  g.translate(0, -out * (H + 200));
  fillAll(c.col);
  const vg = g.createRadialGradient(CX, CY, 200, CX, CY, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = 0.1; g.fillStyle = fg;
  for (let i = -4; i < 14; i++) { const x = i * 200 + ((B * SPB * 60) % 200); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x - 330, H); g.lineTo(x - 400, H); g.closePath(); g.fill(); }
  g.restore();
  // giant outlined number
  const np = Ease.outExpo(pr(B, b, b + 0.8));
  g.save(); g.globalAlpha *= np;
  chars(c.n, W - 110 + (1 - np) * 300, CY + 40, { size: 640, f: 'num', color: 'rgba(0,0,0,0)', stroke: fg, sw: 6, align: 'right', ls: 10 });
  g.restore();
  revealUp(`쫄지마세요  ·  PART ${c.n}`, 160, 330, { size: 30, w: 800, color: fg, align: 'left', ls: 3 }, B, b + 0.05, 0.6, 0.01);
  const ts = fitSize(c.name, 1450, 210, 400, 'disp');
  slam(c.name, 160, 500, { size: ts, f: 'disp', color: fg, align: 'left', ext: { col: 'rgba(0,0,0,0.35)', n: 8, dx: 2, dy: 3 } }, B, b + 0.15, 0.4, 0.05, 1.8);
  const lw = textW(c.name, ts, 400, null, 'disp');
  const lp = Ease.outExpo(pr(B, b + 0.6, b + 1.3));
  g.fillStyle = fg; g.fillRect(160, 500 + ts * 0.5 + 18, lw * lp, 10);
  const ss = fitSize(c.sub, 1560, 64, 800);
  revealUp(c.sub, 160, 500 + ts * 0.5 + 100, { size: ss, w: 800, color: fg, align: 'left' }, B, b + 0.9, 0.7, 0.012);
  g.restore();
}
function chapterHeader(B, k) {
  const c = CH[k];
  if (B < c.b + 3.6 || B >= c.e) return;
  const ein = Ease.outBack(pr(B, c.b + 3.6, c.b + 4.3), 1.6), eout = Ease.inCubic(pr(B, c.e - 0.4, c.e));
  g.save();
  g.globalAlpha = clamp(ein) * (1 - eout);
  g.translate(-(1 - ein) * 80, 0);
  g.save(); g.shadowColor = c.col; g.shadowBlur = 24; circle(118, 100, 38, c.col); g.restore();
  text(c.n, 118, 103, { size: 36, f: 'num', color: c.ink ? '#160E00' : C.white, ls: 1 });
  text(c.name, 176, 86, { size: 42, f: 'disp', align: 'left' });
  const ss = Math.min(26, fitSize(c.sub, 1150, 26, 600));
  text(c.sub, 177, 130, { size: ss, w: 600, color: C.inkD, align: 'left' });
  g.restore();
}

/* ---------------- HUD + tracker ---------------- */
function drawHUD(B) {
  if (B < 16.5 || B >= 266) return;
  const a = win(B, 16.5, 266, 0.6, 1);
  g.save(); g.globalAlpha = a;
  text('쫄지마세요', W - 92, 82, { size: 30, f: 'disp', align: 'right', color: C.pink });
  text('EWY vs EWT · 2026.10', W - 92, 116, { size: 18, w: 700, color: C.inkD, align: 'right', ls: 1 });
  const k = env(KICKS, B * SPB, 10);
  [C.ewy, C.ewt, C.pink, C.yellow].forEach((c, i) => circle(W - 92 - i * 16, 144, 4.5 + (i === 0 ? k * 2 : 0), c));
  g.restore();
}
const TRK = ['같은 잣대', '고점 대비', '지수 비중', '메모리', '미국', '마무리'];
function drawTracker(B) {
  if (B < 32 || B >= 240.5) return;
  const inA = Ease.outCubic(pr(B, 32, 33)), out = Ease.inCubic(pr(B, 239.5, 240.5));
  const segW = 240, gap = 14, n = CH.length, tot = segW * n + gap * (n - 1), x0 = CX - tot / 2, y = 1046 + (1 - inA) * 60 + out * 60;
  g.save();
  g.globalAlpha = 1 - out;
  for (let i = 0; i < n; i++) {
    const c = CH[i], x = x0 + i * (segW + gap);
    const fp = clamp((B - c.b) / (c.e - c.b)), active = B >= c.b && B < c.e;
    rr(x, y - 4, segW, 8, 4); g.fillStyle = 'rgba(244,246,255,0.10)'; g.fill();
    if (fp > 0) { g.save(); if (active) { g.shadowColor = c.col; g.shadowBlur = 14; } rr(x, y - 4, Math.max(8, segW * fp), 8, 4); g.fillStyle = c.col; g.fill(); g.restore(); }
    text(TRK[i], x + 2, y - 20, { size: 18, w: active ? 800 : 600, color: active ? C.ink : C.inkS, align: 'left' });
  }
  g.restore();
}

/* ============================================================
   INTRO (B0–16): ticker tape, "시장이 흔들립니다", break
   ============================================================ */
const SCARE = [
  { s: '−21%', x: 380, y: 300, b: 8, col: C.ewy, r: -0.12 },
  { s: '−33%', x: 1540, y: 320, b: 8.5, col: C.hynix, r: 0.1 },
  { s: '−32%', x: 300, y: 820, b: 9, col: C.candle, r: 0.08 },
  { s: '−20%', x: 1600, y: 800, b: 9.5, col: C.samsung, r: -0.09 },
  { s: '−10%', x: 960, y: 930, b: 10, col: C.ewt, r: 0.04 },
];
function sIntro(B, t, F) {
  const fade = Ease.inCubic(pr(B, 14, 15.5));
  g.save(); g.globalAlpha *= 1 - fade * 0.8;
  tape(150, t, 160, Ease.outCubic(pr(B, 0, 1.5)));
  SCARE.forEach((s) => {
    const p = popE(B, s.b, 0.4, 2.4);
    if (p <= 0) return;
    g.save(); g.translate(s.x + vnoise(t * 9, s.b) * 6, s.y + vnoise(t * 9, s.b + 1) * 6); g.rotate(s.r); g.scale(p, p); g.globalAlpha *= 0.85;
    chars(s.s, 0, 0, { size: 150, f: 'num', color: s.col, glow: s.col, blur: 30, rgb: 6 });
    g.restore();
  });
  rise('10월 고점 이후,', CX, 380, { size: 52, w: 800, color: C.inkD }, B, 2, 0.6, 0.03);
  shaky('시장이 흔들립니다', CX, 540, { size: 170, f: 'disp', color: C.ink, glow: C.cyan, blur: 26, rgb: 5 }, B, 4, 13.5, 1.8);
  if (B >= 12) rise('그런데 정말, 겁먹을 일일까?', CX, 710, { size: 50, w: 800, color: C.yellow }, B, 12, 0.6, 0.02);
  g.restore();
}

/* ============================================================
   TITLE (B16–32): 쫄지마세요 drop, subtitle, agenda
   ============================================================ */
const AGENDA = CH.map((c) => [c.n, c.name, c.col]);
function sTitle(B, t, F) {
  const up = Ease.inOutCubic(pr(B, 25.5, 26.5));
  const ty = lerp(430, 300, up), sz = lerp(300, 220, up);
  // sunburst behind
  const sb = Ease.outExpo(pr(B, 16, 17));
  g.save(); g.globalAlpha *= 0.07 * (1 + F.kick * 0.5);
  for (let k = 0; k < 24; k++) { const a = t * 0.08 + (k / 24) * TAU; g.fillStyle = k % 2 ? C.pink : C.yellow; g.beginPath(); g.moveTo(CX, ty); g.arc(CX, ty, 1600 * sb, a, a + TAU / 48); g.closePath(); g.fill(); }
  g.restore();
  logo('쫄지마세요', CX, ty, sz, B, 16);
  ring(B, 16, CX, ty, { col: C.pink, r: 1000, lw: 24, alpha: 0.6 });
  confetti(B, 16, CX, ty, { n: 70, seed: 3, v1: 1900 });
  group(B, 19, 25.6, () => {
    const y = 680;
    const w1 = textW('한국', 56, 900) + textW('−21%', 96, 400, null, 'num') + 60;
    const w2 = textW('대만', 56, 900) + textW('−10%', 96, 400, null, 'num') + 60;
    const gap = 180, x0 = CX - (w1 + w2 + gap) / 2;
    let x = x0;
    x += text('한국', x, y, { size: 56, w: 900, align: 'left' }) + 22;
    chars('−21%', x, y + 6, { size: 96, f: 'num', color: C.ewy, glow: C.ewy, blur: 24, align: 'left' });
    text('vs', CX + (w1 - w2) / 2 - 0, y, { size: 44, f: 'num', color: C.inkS });
    x = x0 + w1 + gap;
    x += text('대만', x, y, { size: 56, w: 900, align: 'left' }) + 22;
    chars('−10%', x, y + 6, { size: 96, f: 'num', color: C.ewt, glow: C.ewt, blur: 24, align: 'left' });
    revealUp('같은 반도체 강국, 왜 두 배 차이가 났을까', CX, 820, { size: 50, w: 800, color: C.inkD }, B, 21, 0.6, 0.015);
  }, { dy: 50 });
  // agenda chips
  if (B >= 26) {
    const ws = AGENDA.map(([n, s]) => textW(s, 34, 800) + 34 * 1.5 + 50);
    const rows = [[0, 1, 2], [3, 4, 5]];
    rows.forEach((row, ri) => {
      const tot = row.reduce((a, i) => a + ws[i], 0) + 26 * (row.length - 1);
      let xx = CX - tot / 2;
      row.forEach((i) => {
        const p = popE(B, 26.4 + i * 0.45, 0.45, 2.4);
        if (p > 0) {
          g.save(); g.translate(xx + ws[i] / 2, 600 + ri * 110); g.scale(p, p);
          const w = ws[i];
          g.save(); g.shadowColor = AGENDA[i][2]; g.shadowBlur = 18; rr(-w / 2, -36, w, 72, 36); g.fillStyle = C.panel2; g.fill(); g.restore();
          g.lineWidth = 3; g.strokeStyle = AGENDA[i][2]; rr(-w / 2, -36, w, 72, 36); g.stroke();
          text(AGENDA[i][0], -w / 2 + 40, 3, { size: 34, f: 'num', color: AGENDA[i][2] });
          text(AGENDA[i][1], -w / 2 + 72, 1, { size: 34, w: 800, align: 'left' });
          g.restore();
        }
        xx += ws[i] + 26;
      });
    });
  }
}

/* ============================================================
   01 같은 잣대로 (B32–64): EWY vs EWT cards, 6-month chart
   ============================================================ */
// digitised from the attached 6-month chart (x in screenshot px, y px; 0% at 347, 5 px per 1%)
const EWT_RAW = [[25, 337], [45, 335], [60, 330], [70, 307], [85, 312], [105, 296], [125, 295], [135, 285], [150, 267], [165, 268], [175, 255], [185, 272], [205, 262], [215, 287], [232, 297], [250, 272], [262, 255], [272, 220], [290, 215], [300, 213], [312, 192], [325, 190], [337, 195], [348, 245], [360, 232], [375, 245], [385, 218], [395, 218], [405, 195], [418, 205], [432, 172], [442, 163], [452, 202], [470, 205], [482, 215], [500, 180], [512, 198], [528, 190], [538, 222], [550, 210], [568, 195], [578, 222], [595, 220], [610, 240], [625, 258], [632, 232], [645, 225], [660, 242], [675, 248], [690, 298], [700, 272], [712, 252], [727, 222], [742, 222], [760, 215], [775, 210], [790, 190], [805, 188], [820, 190], [835, 210], [852, 208], [868, 205], [882, 195], [895, 183], [910, 185], [920, 177], [935, 175], [950, 160], [965, 162], [975, 178], [988, 163], [1000, 190], [1010, 192], [1022, 175], [1035, 165], [1045, 137], [1058, 142], [1072, 155], [1085, 140], [1100, 147], [1115, 155], [1130, 130], [1142, 122], [1158, 130], [1170, 152], [1185, 147], [1200, 152], [1210, 168], [1225, 194]];
const EWY_RAW = [[25, 333], [40, 352], [52, 320], [65, 338], [80, 322], [92, 328], [105, 303], [125, 293], [140, 258], [150, 232], [158, 248], [168, 205], [180, 195], [185, 240], [195, 210], [205, 205], [215, 243], [235, 258], [250, 225], [268, 168], [280, 175], [290, 150], [300, 148], [310, 115], [325, 128], [335, 155], [345, 255], [355, 220], [365, 225], [380, 175], [395, 175], [405, 130], [418, 150], [428, 155], [435, 105], [445, 195], [460, 180], [470, 155], [480, 180], [495, 160], [510, 220], [520, 238], [538, 232], [555, 225], [565, 250], [578, 282], [590, 260], [605, 295], [620, 298], [635, 262], [648, 272], [658, 262], [670, 300], [680, 335], [690, 360], [700, 300], [712, 315], [725, 295], [735, 268], [750, 292], [760, 285], [775, 295], [790, 248], [805, 238], [815, 222], [825, 270], [845, 245], [855, 245], [868, 262], [880, 238], [893, 240], [905, 232], [915, 252], [930, 238], [945, 212], [965, 205], [975, 230], [990, 210], [1000, 252], [1010, 250], [1020, 255], [1028, 230], [1040, 232], [1050, 210], [1060, 195], [1072, 225], [1085, 215], [1100, 213], [1112, 228], [1130, 198], [1140, 200], [1150, 218], [1160, 230], [1175, 270], [1190, 285], [1205, 308], [1218, 320], [1225, 337]];
const toPct = (raw, endPct) => raw.map(([x, y], i) => [(x - 25) / 1200, i === raw.length - 1 ? endPct : (347 - y) / 5]);
const EWT6 = toPct(EWT_RAW, 30.62), EWY6 = toPct(EWY_RAW, 2.01);
const MONTHS = [[113, '5월'], [305, '6월'], [505, '7월'], [715, '8월'], [917, '9월'], [1115, '10월']];
const peakAfter = (d, u0) => d.filter((p) => p[0] >= u0).reduce((a, b) => (b[1] > a[1] ? b : a));
function sSame(B, t, F) {
  // A · the two tickers (B36–44)
  group(B, 35.6, 44.3, () => {
    revealUp('미국에 상장된 · 달러 기준 ETF끼리', CX, 250, { size: 54, w: 900 }, B, 36, 0.6, 0.015);
    const cards = [
      { x: 520, tk: 'EWY', nm: 'iShares MSCI South Korea', ct: '한국', col: C.ewy, b: 36.5, px: '150.44' },
      { x: 1400, tk: 'EWT', nm: 'iShares MSCI Taiwan', ct: '대만', col: C.ewt, b: 37.5, px: '106.26' },
    ];
    cards.forEach((c) => {
      const p = popE(B, c.b, 0.5, 1.8);
      if (p <= 0) return;
      g.save(); g.translate(c.x, 560); g.scale(p, p);
      g.save(); g.shadowColor = c.col; g.shadowBlur = 40; rr(-330, -200, 660, 400, 36); g.fillStyle = C.panel; g.fill(); g.restore();
      g.lineWidth = 4; g.strokeStyle = c.col; rr(-330, -200, 660, 400, 36); g.stroke();
      pill(c.ct, -290, -140, { size: 34, w: 900, fill: c.col, color: '#0A0A0A', align: 'left' });
      text('$' + c.px, 290, -140, { size: 40, f: 'num', color: C.inkD, align: 'right', ls: 1 });
      chars(c.tk, 0, 40, { size: 200, f: 'num', color: C.white, glow: c.col, blur: 40, ls: 8, ext: { col: c.col, n: 6, dx: 2, dy: 3 } });
      text(c.nm, 0, 150, { size: 28, w: 700, color: C.inkD });
      g.restore();
    });
    const vp = popE(B, 38.5, 0.4, 2.6);
    if (vp > 0) { g.save(); g.translate(CX, 560); g.scale(vp, vp); g.rotate(-0.08); chars('VS', 0, 0, { size: 130, f: 'num', color: C.yellow, glow: C.pink, blur: 30, rgb: 5 }); g.restore(); }
    rise('통화 효과까지 같은 잣대로 놓고 비교', CX, 880, { size: 42, w: 800, color: C.inkD }, B, 40);
  }, { dy: 60, dout: 0.35 });
  // B · 6-month chart (B44–64)
  group(B, 44, 64.2, () => {
    const x = 110, y = 190, w = 1700, h = 790;
    panel(x, y, w, h, { r: 30 });
    text('최근 6개월 수익률', x + 44, y + 60, { size: 40, f: 'disp', align: 'left' });
    tag('첨부 차트 재현 · 달러 기준', x + w - 40, y + 60);
    // legend
    [[C.ewt, 'EWT 대만'], [C.ewy, 'EWY 한국']].forEach(([c, s], i) => { circle(x + 60, y + 120 + i * 40, 10, c); text(s, x + 82, y + 121 + i * 40, { size: 26, w: 800, align: 'left' }); });
    const px0 = x + 70, px1 = x + w - 420, py0 = y + 190, py1 = y + h - 90;
    const lo = -8, hi = 55;
    const mx = (u) => lerp(px0, px1, u), my = (v) => lerp(py1, py0, (v - lo) / (hi - lo));
    // grid
    [0, 25, 50].forEach((v) => {
      dashed(px0, my(v), px1, my(v), 'rgba(244,246,255,0.12)', 2, [4, 8]);
      text(`${v > 0 ? '+' : ''}${v}%`, px1 + 16, my(v) - 18, { size: 22, f: 'num', color: C.inkS, align: 'left', ls: 1 });
    });
    MONTHS.forEach(([xx, m]) => { const u = (xx - 25) / 1200; g.fillStyle = 'rgba(244,246,255,0.06)'; g.fillRect(mx(u) - 1, py0 - 20, 2, py1 - py0 + 20); text(m, mx(u), py1 + 40, { size: 26, w: 700, color: C.inkS }); });
    const dp = Ease.inOutSine(pr(B, 44.5, 54));
    const xc = mx(dp);
    const map = (d) => d.map(([u, v]) => [mx(u), my(v)]);
    const ewy = polyUpToX(map(EWY6), xc), ewt = polyUpToX(map(EWT6), xc);
    glowPath(ewy, C.ewy, 5, 18);
    glowPath(ewt, C.ewt, 8, 26);
    const hy = ewy[ewy.length - 1], ht = ewt[ewt.length - 1];
    if (dp < 1) { circle(hy[0], hy[1], 9, C.ewy); circle(ht[0], ht[1], 11, C.ewt); }
    // end labels like the reference
    const lp = popE(B, 54.3, 0.45, 2);
    if (lp > 0) {
      [[ht, '+30.62%', C.ewt], [hy, '+2.01%', C.ewy]].forEach(([p, s, c]) => {
        g.save(); g.translate(p[0] + 18, p[1]); g.scale(lp, lp);
        g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.lineTo(18, -26); g.lineTo(18 + textW(s, 34, 400, null, 'num') + 28, -26); g.lineTo(18 + textW(s, 34, 400, null, 'num') + 28, 26); g.lineTo(18, 26); g.closePath(); g.fill();
        text(s, 32, 3, { size: 34, f: 'num', color: '#0A0A0A', align: 'left', ls: 1 });
        g.restore();
      });
    }
    // October highs → brackets
    if (B >= 56) {
      const pk = [[peakAfter(EWT6, 0.88), EWT6[EWT6.length - 1], C.ewt, '−10%', px1 + 250], [peakAfter(EWY6, 0.88), EWY6[EWY6.length - 1], C.ewy, '−21%', px1 + 350]];
      pk.forEach(([p, e, c, s, bx], i) => {
        const b0 = 56 + i * 1.2;
        const a = pr(B, b0, b0 + 0.3);
        if (a <= 0) return;
        const [ppx, ppy] = [mx(p[0]), my(p[1])], ey = my(e[1]);
        g.save(); g.shadowColor = c; g.shadowBlur = 20; circle(ppx, ppy, 12 * popE(B, b0, 0.4), c); g.restore();
        text('10월 고점', ppx, ppy - 34, { size: 22, w: 800, color: c, alpha: a });
        dashed(ppx, ppy, lerp(ppx, bx, Ease.outCubic(pr(B, b0, b0 + 0.6))), ppy, c, 3);
        if (B >= b0 + 0.5) dashed(Math.min(e[0] === 1 ? mx(1) : mx(1), bx), ey, bx, ey, c, 3);
        dropBracket(bx, ppy, ey, c, pr(B, b0 + 0.5, b0 + 1.1));
        const sp = popE(B, b0 + 1, 0.45, 2.4);
        if (sp > 0) { g.save(); g.translate(bx, (ppy + ey) / 2); g.scale(sp, sp); g.save(); g.shadowColor = c; g.shadowBlur = 22; rr(-74, -32, 148, 64, 32); g.fillStyle = C.bg; g.fill(); g.restore(); g.lineWidth = 3; g.strokeStyle = c; rr(-74, -32, 148, 64, 32); g.stroke(); text(s, 0, 3, { size: 40, f: 'num', color: c, ls: 1 }); g.restore(); }
      });
    }
    if (B >= 59.5) {
      const o = { size: 46, w: 900, colorFn: hl('10월 고점에서 꺾인 폭이 다르다', '꺾인 폭', C.yellow) };
      rise('10월 고점에서 꺾인 폭이 다르다', x + 640, y + 128, Object.assign({ align: 'left' }, o), B, 59.5);
    }
  }, { dy: 60, dout: 0.3 });
}

/* ============================================================
   02 10월 고점 대비 (B64–100): drawdown bars, "2배", 왜?
   ============================================================ */
const DD = [
  { tk: 'EWY', s: '한국 · 달러 기준', v: 21, col: C.ewy, b: 69.5 },
  { tk: 'EWT', s: '대만 · 달러 기준', v: 10, col: C.ewt, b: 74 },
  { tk: 'TWSE', s: '대만 지수 · 대만달러 기준', v: 5, col: C.cyan, b: 77.5, dash: true },
];
function sDrop(B, t, F) {
  group(B, 67.6, 84.3, () => {
    const base = 330, sc = 24;
    text('10월 고점 = 0%', 150, base - 30, { size: 26, w: 800, color: C.inkD, align: 'left' });
    dashed(140, base, W - 140, base, 'rgba(244,246,255,0.4)', 3, [12, 10]);
    DD.forEach((d, i) => {
      const cx = 520 + i * 440, bw = 230;
      const lp = popE(B, d.b - 1.5, 0.5, 1.8);
      if (lp <= 0) return;
      g.save(); g.globalAlpha *= clamp(lp);
      chars(d.tk, cx, base - 120, { size: 84, f: 'num', color: C.white, glow: d.col, blur: 26, ls: 4 });
      text(d.s, cx, base - 56, { size: 24, w: 700, color: C.inkD });
      g.restore();
      const p = Ease.outCubic(pr(B, d.b, d.b + (d.v > 15 ? 3.5 : 2)));
      if (p <= 0) return;
      const hh = d.v * sc * p;
      const gr = g.createLinearGradient(0, base, 0, base + d.v * sc);
      gr.addColorStop(0, d.col + '22'); gr.addColorStop(1, d.col);
      g.save(); g.shadowColor = d.col; g.shadowBlur = 30 * p;
      rr(cx - bw / 2, base + 4, bw, hh, [0, 0, 18, 18]); g.fillStyle = gr; g.fill();
      g.restore();
      if (d.dash) { g.strokeStyle = d.col; g.lineWidth = 3; g.setLineDash([8, 8]); rr(cx - bw / 2, base + 4, bw, hh, [0, 0, 18, 18]); g.stroke(); g.setLineDash([]); }
      const v = (d.v * p).toFixed(0);
      chars(`−${v}%`, cx, base + hh + 90, { size: 120, f: 'num', color: d.col, glow: d.col, blur: 26, rgb: p < 1 ? 4 : 0 });
    });
    const tp = popE(B, 80, 0.5, 2.2);
    if (tp > 0) {
      g.save(); g.translate(740, 760); g.scale(tp, tp); g.rotate(-0.06);
      g.save(); g.shadowColor = C.yellow; g.shadowBlur = 24; rr(-120, -46, 240, 92, 46); g.fillStyle = C.yellow; g.fill(); g.restore();
      text('약 2배', 0, 4, { size: 48, f: 'disp', color: '#1A1000' });
      g.restore();
      arrow(860, 760, 900, 650, C.yellow, 6, 20, pr(B, 80.3, 80.8));
    }
    if (B >= 78.5) rise('TWSE 지수 자체는 대만달러 기준으로 −5%', 1400, 920, { size: 24, w: 700, color: C.inkS }, B, 78.5);
  }, { dy: 50, dout: 0.3 });
  // "같은 달러 기준인데, 한국이 2배 더 빠졌다" (B84–92)
  group(B, 84, 92, () => {
    rise('같은 달러 기준인데,', CX, 360, { size: 56, w: 800, color: C.inkD }, B, 84);
    const o = { size: 170, f: 'disp', colorFn: hl('한국이 2배 더 빠졌다', '2배', C.yellow), glow: C.ewy, blur: 22, rgb: 4 };
    slam('한국이 2배 더 빠졌다', CX, 560, o, B, 84.6, 0.35, 0.05, 2);
    const bar = pr(B, 86, 87);
    if (bar > 0) {
      const [a, b] = subRange('한국이 2배 더 빠졌다', '2배', CX, o);
      g.fillStyle = C.yellow; g.fillRect(a, 660, (b - a) * Ease.outExpo(bar), 12);
    }
    rise('−21% vs −10%', CX, 780, { size: 64, f: 'num', color: C.ink, ls: 2 }, B, 86.5);
  }, { dy: 0, din: 0.2, dout: 0.25 });
  // DROP: 왜? (B92–100)
  group(B, 92, 99.3, () => {
    const s = lerp(1.8, 1, Ease.outExpo(pr(B, 92, 92.5)));
    g.save(); g.translate(CX, 470); g.scale(s, s); g.rotate(vnoise(t * 3, 5) * 0.03);
    chars('왜?', 0, 0, { size: 420, f: 'disp', grad: [C.white, C.pink], glow: C.pink, blur: 50, rgb: 10, ext: { col: '#3B0A2A', n: 16, dx: 4, dy: 6 } });
    g.restore();
    ring(B, 92, CX, 470, { col: C.pink, r: 1100, lw: 26, alpha: 0.6 });
    confetti(B, 92, CX, 470, { n: 50, seed: 17, v1: 1700, cols: [C.pink, C.yellow, C.cyan] });
    revealUp('왜 한국만 이렇게 더 빠졌을까', CX, 800, { size: 60, w: 900 }, B, 93.5, 0.6, 0.02);
    rise('답은 지수 안의 “무게”에 있다', CX, 890, { size: 40, w: 800, color: C.yellow }, B, 96);
  }, { dy: 0, din: 0.1 });
}

/* ============================================================
   03 지수 안의 무게 (B100–140): TSMC 20% vs 삼전+닉스 60%
   ============================================================ */
function hbar(x, y, w, v, maxV, col, label, p, valTxt) {
  text(label, x, y - 36, { size: 30, w: 800, align: 'left' });
  g.fillStyle = 'rgba(244,246,255,0.08)'; rr(x, y - 14, w, 28, 14); g.fill();
  const ww = Math.max(28, (w * v * p) / maxV);
  if (p > 0) { g.save(); g.shadowColor = col; g.shadowBlur = 20; g.fillStyle = col; rr(x, y - 14, ww, 28, 14); g.fill(); g.restore(); }
  text(valTxt || `−${Math.round(v * p)}%`, x + ww + 16, y + 4, { size: 48, f: 'num', color: col, align: 'left', ls: 1 });
}
function sWeight(B, t, F) {
  group(B, 103.6, 140.2, () => {
    const y = 180, h = 690;
    // Taiwan
    {
      const x = 110, w = 830, cx = x + 250, cy = y + 330;
      panel(x, y, w, h, { r: 30 });
      text('대만 지수', x + 44, y + 64, { size: 48, f: 'disp', align: 'left' });
      pill('EWT', x + w - 40, y + 62, { size: 26, f: 'num', fill: C.ewt, color: '#0A0A0A', align: 'right', ls: 2 });
      const dp = 0.2 * Ease.inOutCubic(pr(B, 105, 107));
      arcStroke(cx, cy, 170, 0, TAU, 'rgba(244,246,255,0.1)', 64, 'butt');
      if (dp > 0) { g.save(); g.shadowColor = C.tsmc; g.shadowBlur = 30; arcStroke(cx, cy, 170, -Math.PI / 2, -Math.PI / 2 + TAU * dp, C.tsmc, 64, 'butt'); g.restore(); }
      numUnit(String(Math.round(dp * 100)), '%', cx, cy + 34, { size: 110, f: 'num', color: C.white, unitSize: 54, uf: 'num' });
      text('TSMC 비중', cx, cy + 82, { size: 26, w: 800, color: C.inkD });
      const lp = popE(B, 106.5, 0.45);
      if (lp > 0) { g.save(); g.translate(x + 600, y + 230); g.scale(lp, lp); text('TSMC', 0, 0, { size: 64, f: 'num', color: C.tsmc, ls: 3 }); text('대만 반도체 · 파운드리', 0, 52, { size: 24, w: 700, color: C.inkD }); g.restore(); }
      const bp = Ease.outCubic(pr(B, 110, 111.5));
      if (B >= 109.5) hbar(x + 520, y + 400, 150, 6, 33, C.tsmc, '10월 낙폭', bp);
      if (B >= 113) rise('덜 빠진 종목의 비중 20%', x + 44, y + h - 70, { size: 38, w: 900, color: C.ink, align: 'left', colorFn: hl('덜 빠진 종목의 비중 20%', '20%', C.tsmc) }, B, 113);
    }
    // Korea
    {
      const x = 980, w = 830, cx = x + 250, cy = y + 330;
      const ap = B < 120 ? 0.45 : 1;
      g.save(); g.globalAlpha *= ap;
      panel(x, y, w, h, { r: 30, stroke: B >= 120 ? C.pink : null, lw: 3 });
      text('한국 지수', x + 44, y + 64, { size: 48, f: 'disp', align: 'left' });
      pill('EWY', x + w - 40, y + 62, { size: 26, f: 'num', fill: C.ewy, color: '#0A0A0A', align: 'right', ls: 2 });
      arcStroke(cx, cy, 170, 0, TAU, 'rgba(244,246,255,0.1)', 64, 'butt');
      if (B < 120) text('?', cx, cy + 10, { size: 160, f: 'disp', color: C.inkS, alpha: 0.5 + 0.5 * Math.sin(t * 8) });
      g.restore();
      if (B >= 120) {
        const dp = 0.6 * Ease.outExpo(pr(B, 120, 121.2));
        const a0 = -Math.PI / 2, mid = a0 + TAU * 0.3;
        g.save(); g.shadowColor = C.samsung; g.shadowBlur = 30;
        arcStroke(cx, cy, 170, a0, a0 + TAU * Math.min(dp, 0.3), C.samsung, 64, 'butt');
        if (dp > 0.3) { g.shadowColor = C.hynix; arcStroke(cx, cy, 170, mid, a0 + TAU * dp, C.hynix, 64, 'butt'); }
        g.restore();
        const s = lerp(1.6, 1, Ease.outExpo(pr(B, 120, 120.5)));
        g.save(); g.translate(cx, cy + 34); g.scale(s, s);
        numUnit(String(Math.round(dp * 100)), '%', 0, 0, { size: 110, f: 'num', color: C.white, unitSize: 54, uf: 'num' });
        g.restore();
        text('삼전 + 닉스 비중', cx, cy + 82, { size: 26, w: 800, color: C.inkD });
        ring(B, 120, cx, cy, { col: C.pink, r: 600, lw: 18, alpha: 0.6 });
        const lp = popE(B, 121, 0.45);
        if (lp > 0) { g.save(); g.translate(x + 610, y + 210); g.scale(lp, lp); text('삼성전자', 0, 0, { size: 40, w: 900, color: C.samsung }); text('+', 0, 44, { size: 34, w: 900, color: C.inkD }); text('SK하이닉스', 0, 88, { size: 40, w: 900, color: C.hynix }); g.restore(); }
        if (B >= 123.5) hbar(x + 520, y + 400, 150, 33, 33, C.hynix, 'SK하이닉스 10월', Ease.outCubic(pr(B, 124, 125.2)));
        if (B >= 125.5) hbar(x + 520, y + 530, 150, 20, 33, C.samsung, '삼성전자 10월', Ease.outCubic(pr(B, 126, 127)));
        if (B >= 128) rise('크게 빠진 두 종목이 60%', x + 44, y + h - 70, { size: 38, w: 900, color: C.ink, align: 'left', colorFn: hl('크게 빠진 두 종목이 60%', '60%', C.pink) }, B, 128);
      }
    }
    if (B >= 131) {
      const o = { size: 50, f: 'disp', colorFn: hl('무거운 종목이 더 빠지면, 지수도 더 빠진다', '지수도 더 빠진다', C.yellow) };
      revealUp('무거운 종목이 더 빠지면, 지수도 더 빠진다', CX, 950, o, B, 131, 0.6, 0.015);
    }
  }, { dy: 60, dout: 0.35 });
}

/* ============================================================
   04 메모리 vs 파운드리 (B140–168): volatility waves (hypothesis)
   ============================================================ */
function wave(x0, x1, yc, amp, freq, ph, p, col, lw) {
  const pts = [], n = 160, xe = lerp(x0, x1, p);
  for (let k = 0; k <= n; k++) {
    const x = lerp(x0, x1, k / n); if (x > xe) break;
    const u = (x - x0) / (x1 - x0);
    pts.push([x, yc - Math.sin(u * TAU * freq + ph) * amp * (0.75 + 0.25 * Math.sin(u * 9 + ph))]);
  }
  glowPath(pts, col, lw, 24);
  return pts[pts.length - 1];
}
function sMemory(B, t, F) {
  group(B, 143.6, 168.2, () => {
    const x = 110, y = 180, w = 1700, h = 540;
    panel(x, y, w, h, { r: 30 });
    tag('개념도', x + w - 40, y + h - 36);
    const x0 = x + 380, x1 = x + w - 60;
    const p = Ease.inOutSine(pr(B, 145, 149)), ph = t * 1.6;
    // memory
    const my = y + 170, fy = y + 410;
    dashed(x0, my, x1, my, 'rgba(244,246,255,0.1)', 2, [4, 8]); dashed(x0, fy, x1, fy, 'rgba(244,246,255,0.1)', 2, [4, 8]);
    const hm = wave(x0, x1, my, 105, 2.2, ph, p, C.hynix, 8);
    const hf = wave(x0, x1, fy, 22, 2.2, ph + 0.6, Ease.inOutSine(pr(B, 146, 150)), C.cyan, 8);
    if (hm) circle(hm[0], hm[1], 11, C.hynix);
    if (hf && B >= 146) circle(hf[0], hf[1], 11, C.cyan);
    const l1 = popE(B, 145, 0.45), l2 = popE(B, 146, 0.45);
    if (l1 > 0) { g.save(); g.translate(x + 50, my); g.scale(l1, l1); text('메모리', 0, -22, { size: 56, f: 'disp', color: C.hynix, align: 'left' }); text('삼성전자 · SK하이닉스', 0, 30, { size: 24, w: 700, color: C.inkD, align: 'left' }); g.restore(); }
    if (l2 > 0) { g.save(); g.translate(x + 50, fy); g.scale(l2, l2); text('파운드리', 0, -22, { size: 56, f: 'disp', color: C.cyan, align: 'left' }); text('TSMC', 0, 30, { size: 26, f: 'num', color: C.inkD, align: 'left', ls: 2 }); g.restore(); }
    const a1 = popE(B, 151, 0.45, 2.4), a2 = popE(B, 152, 0.45, 2.4);
    if (a1 > 0) { g.save(); g.translate(x1 - 120, y + 50); g.scale(a1, a1); pill('변동성 큼', 0, 0, { size: 30, w: 900, fill: C.hynix, color: '#120400', align: 'center' }); g.restore(); }
    if (a2 > 0) { g.save(); g.translate(x1 - 120, fy - 70); g.scale(a2, a2); pill('상대적으로 안정', 0, 0, { size: 30, w: 900, fill: C.cyan, color: '#001218', align: 'center' }); g.restore(); }
    // hypothesis
    if (B >= 155.6) {
      const hp = popE(B, 156, 0.45, 2.4);
      if (hp > 0) { g.save(); g.translate(x + 40, 800); g.scale(hp, hp); pill('가설', 0, 0, { size: 32, w: 900, fill: C.violet, color: C.white, align: 'left' }); g.restore(); }
      const o = { size: 60, f: 'disp', colorFn: hl('시장은 메모리를 시클리컬 원자재로 본다?', '시클리컬 원자재', C.hynix), align: 'left' };
      revealUp('시장은 메모리를 시클리컬 원자재로 본다?', x + 180, 800, o, B, 156, 0.6, 0.015);
    }
    if (B >= 160) {
      rise('그래서 같은 하락장에서도 출렁임이 더 크다', x + 44, 905, { size: 40, w: 800, color: C.inkD, align: 'left' }, B, 160);
      const cp = popE(B, 162, 0.45, 2.2), cq = popE(B, 163, 0.45, 2.2);
      if (cp > 0) { g.save(); g.translate(1330, 905); g.scale(cp, cp); pill('닉스 −33%', 0, 0, { size: 34, w: 900, fill: C.hynix, color: '#120400', align: 'center' }); g.restore(); }
      if (cq > 0) { g.save(); g.translate(1640, 905); g.scale(cq, cq); pill('TSMC −6%', 0, 0, { size: 34, w: 900, fill: C.cyan, color: '#001218', align: 'center' }); g.restore(); }
    }
  }, { dy: 60, dout: 0.35 });
}

/* ============================================================
   05 미국도 같은 그림 (B168–200): NCLD vs MAGS candles
   ============================================================ */
const NCLD_C = [23.2, 23.4, 22.6, 22.8, 25.4, 26.8, 26.9, 27.0, 25.0, 23.8, 23.6, 23.0, 23.6, 23.2, 22.2, 21.6, 21.2, 21.0, 22.8, 25.6, 26.2, 24.0, 23.8, 22.4, 22.3, 23.4, 23.9, 24.6, 25.0, 24.7, 24.0, 23.6, 23.8, 23.2, 24.0, 24.2, 24.4, 23.6, 22.0, 21.6, 21.2, 20.0, 18.4, 17.0, 16.6];
const MAGS_C = [68.0, 69.5, 68.6, 69.0, 69.3, 68.4, 67.8, 67.2, 66.8, 67.0, 67.2, 67.4, 67.6, 68.2, 68.6, 69.4, 70.0, 69.2, 68.8, 69.0, 69.6, 69.8, 69.4, 70.4, 70.8, 73.0, 72.6, 72.2, 72.4, 71.8, 71.4, 71.6, 72.0, 72.6, 73.6, 74.0, 73.8, 73.4, 73.8, 74.2, 74.6, 73.0, 72.2, 71.6];
function mkCandles(cl, seed, vol) {
  return cl.map((c, i) => {
    const o = i ? cl[i - 1] + (rnd(i, seed) - 0.5) * vol * 0.6 : c - vol * 0.3;
    return { o, c, h: Math.max(o, c) + rnd(i, seed + 1) * vol * 0.7, l: Math.min(o, c) - rnd(i, seed + 2) * vol * 0.7 };
  });
}
const NCLD = mkCandles(NCLD_C, 21, 0.9), MAGS = mkCandles(MAGS_C, 31, 0.6);
function candleChart(x, y, w, h, data, lo, hi, step, p, o) {
  g.fillStyle = '#000'; rr(x, y, w, h, 18); g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(244,246,255,0.1)'; rr(x, y, w, h, 18); g.stroke();
  const ax = x + w - 110, py0 = y + 90, py1 = y + h - 50;
  const my = (v) => lerp(py1, py0, (v - lo) / (hi - lo));
  g.fillStyle = 'rgba(244,246,255,0.5)'; g.fillRect(ax, py0 - 30, 2, py1 - py0 + 50);
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { g.fillRect(ax, my(v) - 1, 10, 2); text(v.toFixed(2), ax + 18, my(v), { size: 20, f: 'num', color: C.inkD, align: 'left', ls: 1 }); }
  text(o.tk, x + 30, y + 46, { size: 44, f: 'num', color: C.white, align: 'left', ls: 2 });
  text(o.nm, x + 40 + textW(o.tk, 44, 400, 2, 'num'), y + 48, { size: 24, w: 800, color: C.inkD, align: 'left' });
  const n = data.length, cw = (ax - x - 50) / n, shown = n * p;
  for (let i = 0; i < n; i++) {
    const a = clamp(shown - i);
    if (a <= 0) break;
    const d = data[i], cx = x + 30 + cw * (i + 0.5), up = d.c >= d.o;
    const top = my(Math.max(d.o, d.c)), bot = my(Math.min(d.o, d.c));
    g.save(); g.globalAlpha *= a; g.translate(0, (1 - a) * 20);
    g.strokeStyle = up ? '#CFD6E6' : C.candle; g.lineWidth = 2;
    line(cx, my(d.h), cx, my(d.l));
    const bw = cw * 0.62;
    if (up) { g.fillStyle = '#000'; g.fillRect(cx - bw / 2, top, bw, Math.max(2, bot - top)); g.strokeRect(cx - bw / 2, top, bw, Math.max(2, bot - top)); }
    else { g.save(); g.shadowColor = C.candle; g.shadowBlur = 10; g.fillStyle = C.candle; g.fillRect(cx - bw / 2, top, bw, Math.max(2, bot - top)); g.restore(); }
    g.restore();
  }
  return { my, cx: (i) => x + 30 + cw * (i + 0.5), ax };
}
function usBracket(B, b0, ch, data, col, label) {
  if (B < b0) return;
  let pi = 0; data.forEach((d, i) => { if (i >= data.length * 0.6 && d.c > data[pi].c) pi = i; });
  if (pi === 0) pi = data.length - 6;
  const last = data.length - 1, ppy = ch.my(data[pi].c), ey = ch.my(data[last].c), bx = ch.cx(last) + 30;
  const lp = Ease.outCubic(pr(B, b0, b0 + 0.6));
  dashed(ch.cx(pi), ppy, lerp(ch.cx(pi), bx + 20, lp), ppy, col, 2, [5, 5]);
  dashed(ch.cx(pi) - 40, ey, lerp(ch.cx(pi) - 40, bx + 20, lp), ey, col, 2, [5, 5]);
  dropBracket(bx, ppy, ey, col, pr(B, b0 + 0.4, b0 + 1.1));
  const sp = popE(B, b0 + 1, 0.45, 2.4);
  if (sp > 0) {
    g.save(); g.translate(bx - 34, (ppy + ey) / 2); g.scale(sp, sp);
    const lw = textW(label, 64, 400, 1, 'num');
    g.fillStyle = 'rgba(0,0,0,0.8)'; rr(-lw - 18, -42, lw + 30, 84, 14); g.fill();
    chars(label, 0, 4, { size: 64, f: 'num', color: col, glow: col, blur: 22, align: 'right', ls: 1 });
    g.restore();
  }
}
function sUS(B, t, F) {
  group(B, 171.6, 200.2, () => {
    const y = 200, h = 640;
    const ch1 = candleChart(110, y, 830, h, NCLD, 15.5, 28.5, 2, Ease.inOutSine(pr(B, 172, 178.5)), { tk: 'NCLD', nm: '라운드힐 네오클라우드 ETF' });
    usBracket(B, 178.5, ch1, NCLD, C.red, '−32%');
    const ap = Ease.outCubic(pr(B, 183.6, 184.2));
    g.save(); g.globalAlpha *= 0.35 + 0.65 * ap;
    const ch2 = candleChart(980, y, 830, h, MAGS, 65.5, 75.5, 1, Ease.outCubic(pr(B, 184, 188)), { tk: 'MAGS', nm: '라운드힐 매그니피센트7 ETF' });
    g.restore();
    if (B >= 184) ring(B, 184, 1395, 520, { col: C.mint, r: 700, lw: 18, alpha: 0.5 });
    usBracket(B, 189, ch2, MAGS, C.mint, '−4%');
    tag('첨부 차트 재현', 1810, y + h + 32);
    if (B >= 192) {
      const o = { size: 50, f: 'disp', colorFn: hl('하이퍼스케일러와 초대형 성장기업은 견조', '견조', C.mint) };
      revealUp('하이퍼스케일러와 초대형 성장기업은 견조', CX, 920, o, B, 192, 0.6, 0.015);
      rise('흔들린 건 일부 네오클라우드', CX, 990, { size: 32, w: 800, color: C.inkD }, B, 194);
    } else if (B >= 180) {
      rise('네오클라우드는 10월 고점에서 −32%', 525, 920, { size: 38, w: 900, color: C.red }, B, 180);
      if (B >= 189.5) rise('매그니피센트7은 단지 −4%', 1395, 920, { size: 38, w: 900, color: C.mint }, B, 189.5);
    }
  }, { dy: 60, dout: 0.35 });
}

/* ============================================================
   06 마무리 (B200–240): scoreboard, doubts, rates, 심리
   ============================================================ */
const SOLID = [['매그니피센트7', '−4%', 205.5], ['TSMC', '−6%', 207.5]];
const SHAKY = [['네오클라우드 (코어위브 등)', '−32%', 209.5], ['메모리 (SK하이닉스)', '−33%', 211.5]];
function sClose(B, t, F) {
  group(B, 203.6, 216.3, () => {
    revealUp('숫자로 확인되는 AI 펀더멘탈은 여전히 견조', CX, 240, { size: 56, f: 'disp', colorFn: hl('숫자로 확인되는 AI 펀더멘탈은 여전히 견조', '견조', C.mint) }, B, 204, 0.6, 0.012);
    const cols = [[SOLID, C.mint, '견조', 110], [SHAKY, C.red, '흔들린 곳', 990]];
    cols.forEach(([rows, col, head, x], ci) => {
      const hp = popE(B, 204.8 + ci * 4, 0.5, 1.8);
      if (hp <= 0) return;
      g.save(); g.globalAlpha *= clamp(hp);
      panel(x, 330, 820, 580, { r: 30, stroke: col, lw: 3 });
      g.save(); g.shadowColor = col; g.shadowBlur = 20; pill(head, x + 40, 400, { size: 38, f: 'disp', fill: col, color: '#08090C', align: 'left' }); g.restore();
      rows.forEach(([n, v, b], i) => {
        const p = popE(B, b, 0.45, 2);
        if (p <= 0) return;
        const yy = 540 + i * 190;
        g.save(); g.translate(x + 60, yy); g.scale(1, p);
        text(n, 0, 0, { size: fitSize(n, 340, 40, 900), w: 900, align: 'left' });
        chars(v, 670, 4, { size: 100, f: 'num', color: col, glow: col, blur: 24, align: 'right', ls: 1 });
        g.restore();
        if (ci === 0) checkMark(x + 760, yy, 54, col, pr(B, b + 0.2, b + 0.6), 9);
      });
      g.restore();
    });
  }, { dy: 60, dout: 0.3 });
  // doubts land at once (B216–228)
  group(B, 216, 228.3, () => {
    revealUp('흔들리는 곳엔 의심이 한꺼번에 반영됐다', CX, 250, { size: 54, f: 'disp' }, B, 216, 0.5, 0.012);
    ['이자부담', '현금흐름', '수요의 지속성'].forEach((s, i) => {
      const b = 216 + i, p = Ease.outExpo(pr(B, b, b + 0.35));
      if (p <= 0) return;
      const cx = 420 + i * 540, cy = 480;
      g.save(); g.translate(cx, cy - (1 - p) * 300); g.rotate((i - 1) * 0.05 * (1 - p) + (i - 1) * 0.02); g.globalAlpha *= Math.min(1, p * 3);
      g.save(); g.shadowColor = C.red; g.shadowBlur = 30; rr(-240, -90, 480, 180, 26); g.fillStyle = C.panel2; g.fill(); g.restore();
      g.lineWidth = 4; g.strokeStyle = C.red; rr(-240, -90, 480, 180, 26); g.stroke();
      text(s, 0, 4, { size: fitSize(s, 400, 72, 400, 'disp'), f: 'disp', color: C.white });
      g.restore();
    });
    if (B >= 219.5) rise('→ 그래서 낙폭이 커졌다', CX, 650, { size: 44, w: 900, color: C.red }, B, 219.5);
    if (B >= 222) {
      revealUp('일부의 불안으로', CX, 790, { size: 56, w: 900 }, B, 222, 0.5, 0.02);
      const o = { size: 72, f: 'disp', colorFn: hl('AI 산업 전체를 판단해선 안 된다', '안 된다', C.yellow) };
      slam('AI 산업 전체를 판단해선 안 된다', CX, 890, o, B, 223, 0.35, 0.03, 1.8);
    }
  }, { dy: 0, din: 0.3, dout: 0.3 });
  // rates peaked, it's psychology (B228–240)
  group(B, 228, 239.7, () => {
    const x = 160, y = 230, w = 760, h = 420;
    panel(x, y, w, h, { r: 30 });
    text('금리', x + 40, y + 56, { size: 44, f: 'disp', align: 'left' });
    tag('개념도', x + w - 30, y + 56);
    const pts = [];
    for (let k = 0; k <= 80; k++) { const u = k / 80; pts.push([x + 50 + u * (w - 100), y + h - 60 - (Math.sin(Math.min(u * 1.25, 1) * Math.PI * 0.95) * 230 + vnoise(k * 0.6, 7) * 10) + (u > 0.8 ? (u - 0.8) * 300 : 0)]); }
    const dp = Ease.inOutSine(pr(B, 228.5, 231));
    const sh = pts.slice(0, Math.max(2, Math.floor(pts.length * dp)));
    glowPath(sh, C.gold, 7, 22);
    const pk = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
    if (dp > 0.6) { circle(pk[0], pk[1], 12 * popE(B, 230, 0.4), C.gold); text('정점', pk[0], pk[1] - 36, { size: 28, w: 900, color: C.gold, alpha: pr(B, 230, 230.4) }); }
    const e = sh[sh.length - 1];
    if (dp >= 1) arrow(e[0] - 40, e[1] - 40, e[0] + 10, e[1] + 10, C.mint, 7, 22, pr(B, 231, 231.5));
    revealUp('금리도 정점을 지나', 1000, 330, { size: 60, w: 900, align: 'left' }, B, 229, 0.6, 0.02);
    revealUp('꺾이기 시작했다', 1000, 420, { size: 60, w: 900, align: 'left', color: C.mint }, B, 230, 0.6, 0.02);
    if (B >= 232) {
      text('이번 급락은', CX, 780, { size: 48, w: 800, color: C.inkD, alpha: pr(B, 232, 232.5) });
      const o = { size: 120, f: 'disp', colorFn: hl('펀더멘탈보다 심리', '심리', C.pink), glow: C.pink, blur: 18 };
      slam('펀더멘탈보다 심리', CX, 910, o, B, 233, 0.35, 0.05, 2);
    }
  }, { dy: 50, dout: 0.25 });
}

/* ============================================================
   OUTRO (B240–274): 쫄지마세요 + 숫자 + GRIT
   ============================================================ */
function sOutro(B, t, F) {
  const fade = Ease.inOutSine(pr(B, 270, 273.5));
  const sb = Ease.outExpo(pr(B, 240, 241.2));
  g.save(); g.globalAlpha *= 0.13 * (1 - fade) * (1 + F.kick * 0.5);
  for (let k = 0; k < 28; k++) { const a = -t * 0.07 + (k / 28) * TAU; g.fillStyle = [C.pink, C.yellow, C.cyan, C.ewy][k % 4]; g.beginPath(); g.moveTo(CX, 330); g.arc(CX, 330, 1700 * sb, a, a + TAU / 56); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalAlpha *= 1 - fade * 0.85;
  tape(1000, t, -200, pr(B, 242, 244) * (1 - pr(B, 260.5, 261.5)) * 0.9, 56);
  const up = Ease.inOutCubic(pr(B, 243, 244));
  logo('쫄지마세요', CX, lerp(470, 280, up), lerp(320, 200, up), B, 240);
  ring(B, 240, CX, 470, { col: C.yellow, r: 1100, lw: 28, alpha: 0.6 });
  confetti(B, 240, CX, 470, { n: 90, seed: 41, v1: 2100 });
  if (B >= 244) {
    rise('시장은 언제든 흔들릴 수 있다. 그럴 때 기댈 곳은', CX, 450, { size: 40, w: 800, color: C.inkD }, B, 244, 0.6, 0.012);
    const p1 = popE(B, 248, 0.5, 2), p2 = popE(B, 249, 0.5, 2), pp = popE(B, 248.6, 0.4, 3);
    const y = 610;
    if (p1 > 0) {
      g.save(); g.translate(CX - 400, y); g.scale(p1, p1);
      g.save(); g.shadowColor = C.cyan; g.shadowBlur = 30; rr(-300, -95, 600, 190, 40); g.fillStyle = C.panel2; g.fill(); g.restore();
      g.lineWidth = 4; g.strokeStyle = C.cyan; rr(-300, -95, 600, 190, 40); g.stroke();
      text('숫자에 대한 믿음', 0, -18, { size: 58, f: 'disp', color: C.white });
      text('= 펀더멘탈', 0, 48, { size: 32, w: 800, color: C.cyan });
      g.restore();
    }
    if (pp > 0) { g.save(); g.translate(CX, y); g.scale(pp, pp); g.rotate((1 - clamp(pp)) * 1.5); plusSign(0, 0, 70, C.yellow); g.restore(); }
    if (p2 > 0) {
      g.save(); g.translate(CX + 400, y); g.scale(p2, p2);
      g.save(); g.shadowColor = C.gold; g.shadowBlur = 40; rr(-300, -95, 600, 190, 40); g.fillStyle = C.panel2; g.fill(); g.restore();
      g.lineWidth = 4; g.strokeStyle = C.gold; rr(-300, -95, 600, 190, 40); g.stroke();
      chars('GRIT', 0, -12, { size: 110, f: 'num', grad: [C.white, C.gold], glow: C.gold, blur: 30, ls: 8 });
      text('남들이 불안할 때 버티는 배짱', 0, 62, { size: 28, w: 800, color: C.gold });
      g.restore();
    }
  }
  if (B >= 252) {
    revealUp('이 두 가지로 차분하게 대응하는 것,', CX, 800, { size: 46, w: 800 }, B, 252, 0.6, 0.012);
    const o = { size: 50, w: 900, colorFn: hl('그게 이번 변동성을 지나는 가장 현명한 길', '가장 현명한 길', C.yellow) };
    revealUp('그게 이번 변동성을 지나는 가장 현명한 길', CX, 870, o, B, 253.5, 0.6, 0.012);
  }
  g.restore();
  const da = pr(B, 262, 263);
  if (da > 0) {
    g.save(); g.globalAlpha *= 1 - fade * 0.5;
    text('본 영상은 정보 제공용 콘텐츠이며 특정 자산의 매수·매도를 권유하지 않습니다. 차트는 첨부 자료를 재현한 것으로 실제와 차이가 있을 수 있습니다.', CX, 975, { size: 21, w: 600, color: C.inkD, alpha: da });
    text('투자 판단과 그에 따른 책임은 투자자 본인에게 있습니다.', CX, 1010, { size: 21, w: 600, color: C.inkD, alpha: da });
    g.restore();
  }
}

/* ============================================================
   COMPOSITION
   ============================================================ */
const SCENES = [
  { b0: 0, b1: 16, f: sIntro },
  { b0: 16, b1: 32, f: sTitle },
  { b0: 35.5, b1: 64.2, f: sSame },
  { b0: 67.5, b1: 100.2, f: sDrop },
  { b0: 103.5, b1: 140.2, f: sWeight },
  { b0: 143.5, b1: 168.2, f: sMemory },
  { b0: 171.5, b1: 200.2, f: sUS },
  { b0: 203.5, b1: 240.2, f: sClose },
  { b0: 240, b1: TOTAL_BEATS + 1, f: sOutro },
];
function drawFrame(t) {
  const B = t / SPB;
  const F = { kick: env(KICKS, t, 9), energy: energyAt(t) };
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.setLineDash([]); g.lineCap = 'butt'; g.lineJoin = 'miter'; g.shadowBlur = 0;
  background(B, t, F);
  const cam = camera(B, t);
  g.save();
  g.translate(CX + cam.sx, CY + cam.sy); g.rotate(cam.r); g.scale(cam.z, cam.z); g.translate(-CX, -CY);
  for (const s of SCENES) if (B >= s.b0 && B < s.b1) s.f(B, t, F);
  for (let k = 0; k < CH.length; k++) chapterHeader(B, k);
  g.restore();
  drawTracker(B);
  drawHUD(B);
  for (let k = 0; k < CH.length; k++) chapterCard(B, k);
  return postParams(B, t);
}
