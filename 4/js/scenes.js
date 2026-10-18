'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   B = t / SPB (time in beats). Each lyric line has its own graphic,
   cued to the words it is about; the karaoke line at the bottom is
   driven by the per-character times in lyrics.js.
   ============================================================ */
let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };
const KICKS = BEATS;
const SB = (sec) => sec / SPB;
const LB = (i) => SB(LYRICS[i].t0);            // line start, in beats
const LE = (i) => SB(LYRICS[i].t1);            // line leaves
// beat at which word `w` of line i is sung
const CW = (i, w) => { const L = LYRICS[i], j = L.text.indexOf(w); return SB(j < 0 ? L.t0 : L.ct[j]); };
const C2 = SB(LYRICS[22].t0 - LYRICS[8].t0);   // chorus 2 = chorus 1 shifted
const DROPS = [LYRICS[8].t0, LYRICS[22].t0];   // chorus drops (s)
const IMPACTS = [[0.74, 0.6], [18.44, 0.5], [29.04, 1.1], [57.64, 0.6], [77.96, 0.5], [97.34, 1.1], [128.1, 0.7], [147.05, 0.7], [165.4, 0.9]];
function impactEnv(t, k = 4) {
  let s = 0;
  for (const [it, v] of IMPACTS) { if (it > t) break; const dt = t - it; if (dt < 2) s += v * Math.exp(-dt * k); }
  return s;
}

/* song sections: header, background tint, lyric colour, progress bar */
const SECTS = [
  { t: 0, name: 'VERSE 1', sub: '달러로 본 두 시장', col: C.cyan, tint: '#0A1A33' },
  { t: 18.1, name: 'PRE-CHORUS', sub: '축과 파도', col: C.violet, tint: '#150C33' },
  { t: 28.9, name: 'CHORUS', sub: '비중과 사이클', col: C.pink, tint: '#2A0B26' },
  { t: 56.6, name: 'VERSE 2', sub: '기둥과 무게', col: C.ewy, tint: '#2B1206' },
  { t: 77.7, name: 'PRE-CHORUS', sub: '수요와 재고', col: C.violet, tint: '#150C33' },
  { t: 97.2, name: 'CHORUS', sub: '비중과 사이클', col: C.pink, tint: '#2A0B26' },
  { t: 124.7, name: 'BRIDGE', sub: '구성과 환율', col: C.mint, tint: '#06231C' },
  { t: 146.95, name: 'OUTRO', sub: '서로 다른 계절', col: C.gold, tint: '#231A05' },
  { t: 165.5, name: '', sub: '', col: C.pink, tint: '#2A0B26' },
];
const sectAt = (t) => { let s = SECTS[0]; for (const x of SECTS) if (t >= x.t) s = x; return s; };
const SCOLS = { 'VERSE 1': [C.cyan, C.ewt, C.ewy], 'PRE-CHORUS': [C.violet, C.cyan, C.hynix], CHORUS: [C.pink, C.yellow, C.cyan], 'VERSE 2': [C.ewy, C.red, C.samsung], BRIDGE: [C.mint, C.cyan, C.gold], OUTRO: [C.gold, C.pink, C.ewt], '': [C.pink, C.yellow, C.cyan] };

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
const BGC = Array.from({ length: 64 }, (_, i) => ({ c: rnd(i, 12), h: rnd(i, 13) }));
function bgCandles(t, alpha) {
  if (alpha <= 0) return;
  const a0 = g.globalAlpha, sp = 34, off = (t * 40) % sp;
  let v = 0.5;
  for (let i = 0; i < BGC.length; i++) {
    const k = BGC[i], x = i * sp - off - 60;
    const o = v, c = clamp(v + (k.c - 0.5) * 0.18, 0.1, 0.9); v = c;
    const y0 = H * 0.7 - o * 480, y1 = H * 0.7 - c * 480, up = c >= o;
    g.globalAlpha = a0 * alpha;
    g.strokeStyle = up ? 'rgba(244,246,255,0.55)' : C.candle; g.lineWidth = 2;
    line(x, Math.min(y0, y1) - k.h * 30, x, Math.max(y0, y1) + k.h * 26);
    if (up) g.strokeRect(x - 9, Math.min(y0, y1), 18, Math.max(3, Math.abs(y1 - y0)));
    else { g.fillStyle = C.candle; g.fillRect(x - 9, Math.min(y0, y1), 18, Math.max(3, Math.abs(y1 - y0))); }
  }
  g.globalAlpha = a0;
}
function background(B, t, F) {
  const s = sectAt(t), cols = SCOLS[s.name];
  const gr = g.createLinearGradient(0, 0, W * 0.4, H);
  gr.addColorStop(0, C.bg); gr.addColorStop(1, s.tint);
  fillAll(gr);
  for (let i = 0; i < 3; i++) {
    const x = (0.12 + 0.38 * i) * W + Math.sin(t * 0.21 + i * 2) * 160, y = (i % 2 ? 0.8 : 0.18) * H + Math.cos(t * 0.17 + i) * 100;
    const r = 560 + 140 * F.kick * F.energy, col = cols[i % cols.length];
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col + '30'); rg.addColorStop(1, col + '00');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.drawImage(GRID, -((t * 24) % 60) - 120, -((t * 8) % 60) - 120);
  bgCandles(t, s.name === '' ? 0.16 : 0.06);
}

/* ---------------- camera & post ---------------- */
function camera(B, t) {
  const kick = env(KICKS, t, 10) * (0.4 + 0.6 * energyAt(t)), imp = impactEnv(t, 5);
  const amp = imp * 9;
  let z = 1 + kick * 0.008 + imp * 0.012;
  for (const d of DROPS) if (t >= d - 2.4 && t < d) z += Ease.inQuad(pr(t, d - 2.4, d - 0.15)) * 0.04;
  const sx = Math.sin(t * 0.31) * 6 + vnoise(t * 16, 1) * amp, sy = Math.cos(t * 0.23) * 4 + vnoise(t * 16, 2) * amp;
  return { sx, sy, r: vnoise(t * 8, 3) * amp * 0.0006, z };
}
const FLASHES = [[29.04, 0.8], [97.34, 0.8], [57.64, 0.3], [128.1, 0.35], [147.05, 0.35], [165.4, 0.6]];
const GLITCHES = [[0.74, 0.5], [9.6, 0.5], [29.04, 1], [41.8, 0.6], [51.9, 0.5], [68.64, 0.6], [97.34, 1], [110.1, 0.6], [120.2, 0.5], [128.1, 0.5], [165.4, 0.8]];
function postParams(B, t) {
  const kick = env(KICKS, t, 12) * energyAt(t), imp = impactEnv(t, 4.5);
  let flash = 0, glitch = 0;
  for (const [ft, s] of FLASHES) { const d = t - ft; if (d >= 0 && d < 0.8) flash = Math.max(flash, s * Math.exp(-d * 8)); }
  for (const [gt, s] of GLITCHES) { const d = t - gt; if (d >= 0 && d < 0.5) glitch = Math.max(glitch, s * Math.exp(-d * 9)); }
  return { ca: 0.15 + imp * 0.8 + kick * 0.3 + glitch * 1.5, flash, bloom: 0.55 + kick * 0.2, grain: 0.03, vig: 0.75, glitch };
}

/* ---------------- layout helpers ---------------- */
function group(B, a, z, fn, o = {}) {
  if (B < a || B >= z) return;
  const ein = Ease.outExpo(pr(B, a, a + (o.din || 0.7)));
  const eout = Ease.inCubic(pr(B, z - (o.dout || 0.45), z));
  g.save();
  g.globalAlpha *= Math.min(1, ein * 1.4) * (1 - eout);
  g.translate((1 - ein) * (o.dx || 0), (1 - ein) * (o.dy != null ? o.dy : 60) - eout * (o.dyo != null ? o.dyo : 40));
  fn(ein, eout);
  g.restore();
}
function fitSize(s, maxW, maxSize, w = 900, f = null) { return Math.min(maxSize, (maxW / textW(s, 100, w, null, f)) * 100); }
function tag(s, x, y) { pill(s, x, y, { size: 20, w: 700, fill: 'rgba(244,246,255,0.1)', color: C.inkD, align: 'right', h: 34, padX: 14 }); }
function glowPath(pts, col, lw, blur = 22) {
  if (pts.length < 2) return;
  g.save();
  g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
  g.shadowColor = col; g.shadowBlur = blur;
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.restore();
}
function dashed(x1, y1, x2, y2, col, lw = 3, d = [10, 8]) { g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(d); line(x1, y1, x2, y2); g.setLineDash([]); }
function dropBracket(x, y0, y1, col, p) {
  if (p <= 0) return;
  const ye = lerp(y0, y1, Ease.outCubic(p));
  g.save(); g.shadowColor = col; g.shadowBlur = 16; g.strokeStyle = col; g.lineWidth = 4;
  line(x - 14, y0, x + 14, y0); line(x, y0, x, ye);
  if (p > 0.95) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y1 + 4); g.lineTo(x - 13, y1 - 18); g.lineTo(x + 13, y1 - 18); g.closePath(); g.fill(); }
  g.restore();
}
function neonBox(x, y, w, h, col, r = 30, fill = C.panel) {
  g.save(); g.shadowColor = col; g.shadowBlur = 30; rr(x, y, w, h, r); g.fillStyle = fill; g.fill(); g.restore();
  g.lineWidth = 3; g.strokeStyle = col; rr(x, y, w, h, r); g.stroke();
}
function bigNum(s, x, y, size, col, o = {}) { return chars(s, x, y, Object.assign({ size, f: 'num', color: col, glow: col, blur: 26, ls: 1 }, o)).w; }
// pop a drawing in at (x, y) with a back-eased scale
function popAt(B, b0, x, y, fn, dur = 0.45, s = 2.2) {
  const p = popE(B, b0, dur, s);
  if (p <= 0) return;
  g.save(); g.translate(x, y); g.scale(p, p); fn(p); g.restore();
}
// the title logotype: extruded, gradient filled, neon glow, rgb split
function logo(s, x, y, size, B, b0, o = {}) {
  const st = { size, f: 'disp', ls: -size * 0.02, grad: o.grad || [C.yellow, C.ewy, C.pink], glow: o.glow || C.pink, blur: o.blur || 40, ext: { col: o.ext || '#5A0F3C', n: Math.round(size / 22), dx: size * 0.012, dy: size * 0.018 }, rgb: o.rgb != null ? o.rgb : size * 0.03, align: o.align };
  return chars(s, x, y, st, (i) => {
    const lp = pr(B, b0 + i * 0.06, b0 + i * 0.06 + 0.4);
    if (lp <= 0) return false;
    const e = Ease.outExpo(lp), k = Math.exp(-(B - b0 - i * 0.06) * SPB * 6);
    return { s: lerp(2.4, 1, e), a: Math.min(1, lp * 5), y: vnoise(B * 3 + i, 4) * 6, r: (rnd(i, 9) - 0.5) * 0.3 * (1 - e), rgb: 0.25 + k * 2 };
  });
}
// graphics live in y 170–830; the lyric band is below
const SY0 = 170;

/* ---------------- shared drawings ---------------- */
// digitised from the attached 6-month chart (x in screenshot px, y px; 0% at 347, 5 px per 1%)
const EWT_RAW = [[25, 337], [45, 335], [60, 330], [70, 307], [85, 312], [105, 296], [125, 295], [135, 285], [150, 267], [165, 268], [175, 255], [185, 272], [205, 262], [215, 287], [232, 297], [250, 272], [262, 255], [272, 220], [290, 215], [300, 213], [312, 192], [325, 190], [337, 195], [348, 245], [360, 232], [375, 245], [385, 218], [395, 218], [405, 195], [418, 205], [432, 172], [442, 163], [452, 202], [470, 205], [482, 215], [500, 180], [512, 198], [528, 190], [538, 222], [550, 210], [568, 195], [578, 222], [595, 220], [610, 240], [625, 258], [632, 232], [645, 225], [660, 242], [675, 248], [690, 298], [700, 272], [712, 252], [727, 222], [742, 222], [760, 215], [775, 210], [790, 190], [805, 188], [820, 190], [835, 210], [852, 208], [868, 205], [882, 195], [895, 183], [910, 185], [920, 177], [935, 175], [950, 160], [965, 162], [975, 178], [988, 163], [1000, 190], [1010, 192], [1022, 175], [1035, 165], [1045, 137], [1058, 142], [1072, 155], [1085, 140], [1100, 147], [1115, 155], [1130, 130], [1142, 122], [1158, 130], [1170, 152], [1185, 147], [1200, 152], [1210, 168], [1225, 194]];
const EWY_RAW = [[25, 333], [40, 352], [52, 320], [65, 338], [80, 322], [92, 328], [105, 303], [125, 293], [140, 258], [150, 232], [158, 248], [168, 205], [180, 195], [185, 240], [195, 210], [205, 205], [215, 243], [235, 258], [250, 225], [268, 168], [280, 175], [290, 150], [300, 148], [310, 115], [325, 128], [335, 155], [345, 255], [355, 220], [365, 225], [380, 175], [395, 175], [405, 130], [418, 150], [428, 155], [435, 105], [445, 195], [460, 180], [470, 155], [480, 180], [495, 160], [510, 220], [520, 238], [538, 232], [555, 225], [565, 250], [578, 282], [590, 260], [605, 295], [620, 298], [635, 262], [648, 272], [658, 262], [670, 300], [680, 335], [690, 360], [700, 300], [712, 315], [725, 295], [735, 268], [750, 292], [760, 285], [775, 295], [790, 248], [805, 238], [815, 222], [825, 270], [845, 245], [855, 245], [868, 262], [880, 238], [893, 240], [905, 232], [915, 252], [930, 238], [945, 212], [965, 205], [975, 230], [990, 210], [1000, 252], [1010, 250], [1020, 255], [1028, 230], [1040, 232], [1050, 210], [1060, 195], [1072, 225], [1085, 215], [1100, 213], [1112, 228], [1130, 198], [1140, 200], [1150, 218], [1160, 230], [1175, 270], [1190, 285], [1205, 308], [1218, 320], [1225, 337]];
const toPct = (raw, endPct) => raw.map(([x, y], i) => [(x - 25) / 1200, i === raw.length - 1 ? endPct : (347 - y) / 5]);
const EWT6 = toPct(EWT_RAW, 30.62), EWY6 = toPct(EWY_RAW, 2.01);
const MONTHS = [[113, '5월'], [305, '6월'], [505, '7월'], [715, '8월'], [917, '9월'], [1115, '10월']];
const peakAfter = (d, u0) => d.filter((p) => p[0] >= u0).reduce((a, b) => (b[1] > a[1] ? b : a));

// 6-month line chart. dp = draw progress; bps = [EWT, EWY] beats where the October drops show (or null)
function etfChart(B, x, y, w, h, dp, bps) {
  panel(x, y, w, h, { r: 30 });
  text('최근 6개월 · 달러 기준 수익률', x + 40, y + 52, { size: 32, f: 'disp', align: 'left' });
  tag('첨부 차트 재현', x + w - 36, y + 52);
  [[C.ewt, 'EWT 대만'], [C.ewy, 'EWY 한국']].forEach(([c, s], i) => { circle(x + 52 + i * 190, y + 104, 9, c); text(s, x + 72 + i * 190, y + 105, { size: 24, w: 800, align: 'left' }); });
  const px0 = x + 60, px1 = x + w - 360, py0 = y + 150, py1 = y + h - 60;
  const lo = -8, hi = 52;
  const mx = (u) => lerp(px0, px1, u), my = (v) => lerp(py1, py0, (v - lo) / (hi - lo));
  [0, 25, 50].forEach((v) => {
    dashed(px0, my(v), px1, my(v), 'rgba(244,246,255,0.12)', 2, [4, 8]);
    text(`${v > 0 ? '+' : ''}${v}%`, px1 + 14, my(v) - 16, { size: 20, f: 'num', color: C.inkS, align: 'left', ls: 1 });
  });
  MONTHS.forEach(([xx, m]) => text(m, mx((xx - 25) / 1200), py1 + 32, { size: 22, w: 700, color: C.inkS }));
  const xc = mx(dp), map = (d) => d.map(([u, v]) => [mx(u), my(v)]);
  const ewy = polyUpToX(map(EWY6), xc), ewt = polyUpToX(map(EWT6), xc);
  glowPath(ewy, C.ewy, 5, 18); glowPath(ewt, C.ewt, 7, 26);
  const hy = ewy[ewy.length - 1], ht = ewt[ewt.length - 1];
  if (dp < 1) { circle(hy[0], hy[1], 9, C.ewy); circle(ht[0], ht[1], 11, C.ewt); }
  else [[ht, '+30.62%', C.ewt], [hy, '+2.01%', C.ewy]].forEach(([p, s, c]) => {
    const fa = bps ? 1 - pr(B, bps[0], bps[0] + 0.5) : 1;
    if (fa <= 0) return;
    g.save(); g.globalAlpha *= fa;
    const tw = textW(s, 28, 400, null, 'num') + 26;
    g.fillStyle = c; g.beginPath(); g.moveTo(p[0] + 10, p[1]); g.lineTo(p[0] + 26, p[1] - 22); g.lineTo(p[0] + 26 + tw, p[1] - 22); g.lineTo(p[0] + 26 + tw, p[1] + 22); g.lineTo(p[0] + 26, p[1] + 22); g.closePath(); g.fill();
    text(s, p[0] + 38, p[1] + 3, { size: 28, f: 'num', color: '#0A0A0A', align: 'left', ls: 1 });
    g.restore();
  });
  if (!bps) return;
  [[peakAfter(EWT6, 0.88), EWT6[EWT6.length - 1], C.ewt, '−10%', px1 + 220, bps[0]], [peakAfter(EWY6, 0.88), EWY6[EWY6.length - 1], C.ewy, '−21%', px1 + 310, bps[1]]].forEach(([p, e, c, s, bx, b0]) => {
    const a = pr(B, b0, b0 + 0.3);
    if (a <= 0) return;
    const ppx = mx(p[0]), ppy = my(p[1]), ey = my(e[1]);
    g.save(); g.shadowColor = c; g.shadowBlur = 20; circle(ppx, ppy, 11 * popE(B, b0, 0.4), c); g.restore();
    text('10월 고점', ppx, ppy - 30, { size: 20, w: 800, color: c, alpha: a });
    dashed(ppx, ppy, lerp(ppx, bx, Ease.outCubic(pr(B, b0, b0 + 0.6))), ppy, c, 3);
    if (B >= b0 + 0.5) dashed(mx(1) + 16, ey, bx, ey, c, 3);
    dropBracket(bx, ppy, ey, c, pr(B, b0 + 0.5, b0 + 1.1));
    popAt(B, b0 + 1, bx, (ppy + ey) / 2, () => { neonBox(-66, -28, 132, 56, c, 28, C.bg); text(s, 0, 3, { size: 34, f: 'num', color: c, ls: 1 }); });
  });
}
// vertical drawdown bars hanging from a "10월 고점" baseline
function ddBars(B, items, x0, gap, base, sc, o = {}) {
  const bw = o.bw || 170, xl = x0 - bw / 2 - 24, xr = x0 + gap * (items.length - 1) + bw / 2 + 24;
  text(o.label || '10월 고점 = 0%', xl - 16, base, { size: 22, w: 800, color: C.inkD, align: 'right' });
  dashed(xl, base, xr, base, 'rgba(244,246,255,0.4)', 3, [12, 10]);
  items.forEach((d, i) => {
    const cx = x0 + i * gap;
    const lp = popE(B, d.b - 0.8, 0.5, 1.8);
    if (lp <= 0) return;
    g.save(); g.globalAlpha *= clamp(lp);
    chars(d.tk, cx, base - 92, { size: 60, f: d.f || 'num', color: C.white, glow: d.col, blur: 24, ls: d.f ? 0 : 3 });
    if (d.s) text(d.s, cx, base - 44, { size: 22, w: 700, color: C.inkD });
    g.restore();
    const p = Ease.outCubic(pr(B, d.b, d.b + (d.v > 15 ? 2.2 : 1.4)));
    if (p <= 0) return;
    const hh = d.v * sc * p, gr = g.createLinearGradient(0, base, 0, base + d.v * sc);
    gr.addColorStop(0, d.col + '22'); gr.addColorStop(1, d.col);
    g.save(); g.shadowColor = d.col; g.shadowBlur = 30 * p; rr(cx - bw / 2, base + 4, bw, hh, [0, 0, 16, 16]); g.fillStyle = gr; g.fill(); g.restore();
    bigNum(`−${Math.round(d.v * p)}%`, cx, base + hh + 62, o.ns || 84, d.col, { rgb: p < 1 ? 4 : 0 });
  });
}
function donutW(B, cx, cy, r, b0, segs, sub) {
  arcStroke(cx, cy, r, 0, TAU, 'rgba(244,246,255,0.1)', r * 0.36, 'butt');
  const sum = segs.reduce((s, x) => s + x[0], 0), p = Ease.inOutCubic(pr(B, b0, b0 + 1.4));
  let a0 = -Math.PI / 2, tot = 0;
  segs.forEach(([v, col]) => {
    const vv = clamp(p * sum - tot, 0, v); tot += v;
    if (vv > 0) { g.save(); g.shadowColor = col; g.shadowBlur = 28; arcStroke(cx, cy, r, a0, a0 + TAU * vv, col, r * 0.36, 'butt'); g.restore(); }
    a0 += TAU * v;
  });
  numUnit(String(Math.round(sum * p * 100)), '%', cx, cy + r * 0.2, { size: r * 0.62, f: 'num', color: C.white, unitSize: r * 0.3, uf: 'num' });
  text(sub, cx, cy + r * 0.48, { size: Math.min(24, r * 0.14), w: 800, color: C.inkD });
}
function wavePts(x0, x1, yc, amp, freq, ph, p) {
  const pts = [], n = 140, xe = lerp(x0, x1, p);
  for (let k = 0; k <= n; k++) {
    const x = lerp(x0, x1, k / n); if (x > xe) break;
    const u = (x - x0) / (x1 - x0);
    pts.push([x, yc - Math.sin(u * TAU * freq + ph) * amp * (0.75 + 0.25 * Math.sin(u * 9 + ph))]);
  }
  return pts;
}
function chip(x, y, s, col, label) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = col; g.lineWidth = 6; g.lineCap = 'round';
  for (let k = -2; k <= 2; k++) { line(k * 22, -78, k * 22, -96); line(k * 22, 78, k * 22, 96); line(-78, k * 22, -96, k * 22); line(78, k * 22, 96, k * 22); }
  g.lineCap = 'butt';
  g.save(); g.shadowColor = col; g.shadowBlur = 30; rr(-78, -78, 156, 156, 18); g.fillStyle = C.panel2; g.fill(); g.restore();
  g.lineWidth = 5; rr(-78, -78, 156, 156, 18); g.stroke();
  rr(-46, -46, 92, 92, 10); g.fillStyle = col + '33'; g.fill();
  if (label) text(label, 0, 2, { size: 28, f: 'num', color: col, ls: 1 });
  g.restore();
}
// a turning season dial: an arc with an arrow head that keeps rotating
function cycleDial(x, y, r, col, rot, label, sub) {
  arcStroke(x, y, r, 0, TAU, 'rgba(244,246,255,0.08)', 22, 'butt');
  g.save(); g.shadowColor = col; g.shadowBlur = 24;
  arcStroke(x, y, r, rot, rot + Math.PI * 1.4, col, 22, 'round');
  const a = rot + Math.PI * 1.4, hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r;
  g.fillStyle = col; g.beginPath(); g.moveTo(hx + Math.cos(a) * 26, hy + Math.sin(a) * 26); g.lineTo(hx - Math.cos(a) * 26, hy - Math.sin(a) * 26); g.lineTo(hx + Math.cos(a + Math.PI / 2) * 30, hy + Math.sin(a + Math.PI / 2) * 30); g.closePath(); g.fill();
  g.restore();
  text(label, x, y - 8, { size: 48, f: 'disp', color: col });
  text(sub, x, y + 40, { size: 24, w: 800, color: C.inkD });
}

/* ============================================================
   VERSE 1 (0–17.5 s)
   ============================================================ */
function sVerse1(B, t, F) {
  // the title, over the first words
  const tp = 1 - Ease.inOutCubic(pr(t, 2.0, 2.8));
  if (tp > 0) {
    g.save(); g.globalAlpha *= tp;
    logo('반도체의 계절', CX, 400 - (1 - tp) * 100, 200, B, 0);
    text('EWY vs EWT · 달러 기준으로 본 한국과 대만', CX, 560, { size: 36, w: 800, color: C.inkD, alpha: pr(t, 0.5, 1.2) });
    g.restore();
  }
  // L0–L1: "두 장의 차트" draws, then the October highs split
  group(B, SB(2.0), LB(2) + 0.3, () => {
    etfChart(B, 160, SY0, 1600, 640, Ease.inOutSine(pr(t, 2.3, 4.6)), [CW(1, '꼭대기'), CW(1, '갈라진') - 0.4]);
  }, { dy: 80, dout: 0.35 });
  // L2: 한국은 스물하나, 대만은 열
  group(B, LB(2), LB(3) + 0.2, () => {
    ddBars(B, [{ tk: 'EWY', s: '한국 · 달러 기준', v: 21, col: C.ewy, b: CW(2, '스물') - 0.4 }, { tk: 'EWT', s: '대만 · 달러 기준', v: 10, col: C.ewt, b: CW(2, '대만은') }], 660, 600, 330, 17, { ns: 96 });
    popAt(B, CW(2, '열') + 0.6, 960, 560, () => { neonBox(-110, -40, 220, 80, C.yellow, 40, C.yellow); text('약 2배', 0, 4, { size: 44, f: 'disp', color: '#1A1000' }); });
  }, { dy: 50, dout: 0.3 });
  // L3: 숫자 사이로 다른 무게가 보여 — the balance tips toward Korea
  group(B, LB(3), SB(17.9), () => {
    const tilt = 0.2 * Ease.outBack(pr(B, CW(3, '무게'), CW(3, '무게') + 1.5), 1.6);
    const cx = CX, cy = 380;
    g.fillStyle = 'rgba(244,246,255,0.5)'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 60, 760); g.lineTo(cx + 60, 760); g.closePath(); g.fill();
    g.save(); g.translate(cx, cy); g.rotate(tilt);
    g.save(); g.shadowColor = C.cyan; g.shadowBlur = 20; g.fillStyle = C.ink; rr(-560, -10, 1120, 20, 10); g.fill(); g.restore();
    [[-500, C.ewt, '대만', 'TSMC 20%', 0.55, LB(3) + 0.4], [500, C.ewy, '한국', '삼전+닉스 60%', 1, CW(3, '다른')]].forEach(([px, col, nm, w, s, b0]) => {
      g.save(); g.translate(px, 0); g.rotate(-tilt);
      g.strokeStyle = 'rgba(244,246,255,0.5)'; g.lineWidth = 3; line(0, 0, -110, 170); line(0, 0, 110, 170);
      g.fillStyle = col; rr(-150, 170, 300, 26, 13); g.fill();
      popAt(B, b0, 0, 170, () => {
        const bw = 120 + 100 * s, bh = 140 * s;
        g.save(); g.shadowColor = col; g.shadowBlur = 30; rr(-bw / 2, -bh, bw, bh, 16); g.fillStyle = col; g.fill(); g.restore();
        text(w, 0, -bh / 2, { size: px < 0 ? 22 : 25, w: 900, color: '#0A0A0A' });
      }, 0.5, 2);
      text(nm, 0, 250, { size: 44, f: 'disp', color: col });
      g.restore();
    });
    g.restore();
    circle(cx, cy, 16, C.yellow);
  }, { dy: 50 });
}

/* ============================================================
   PRE-CHORUS 1 (18.4–28.7 s)
   ============================================================ */
function sPre1(B, t, F) {
  // L4: 큰 파운드리의 단단한 축 — the TSMC pillar
  group(B, LB(4), LB(5) + 0.3, () => {
    const p = Ease.outExpo(pr(B, LB(4), LB(4) + 1.5));
    const x = 620, base = 790, hgt = 500 * p;
    g.save(); g.shadowColor = C.tsmc; g.shadowBlur = 40;
    const gr = g.createLinearGradient(0, base - 500, 0, base); gr.addColorStop(0, '#FF6B6B'); gr.addColorStop(1, '#7A0F16');
    g.fillStyle = gr; rr(x - 110, base - hgt, 220, hgt, 14); g.fill(); g.restore();
    for (let k = 1; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 110, base - hgt + (k * hgt) / 6, 220, 3); }
    g.fillStyle = C.ink; rr(x - 170, base, 340, 22, 8); g.fill(); rr(x - 150, base - hgt - 22, 300, 22, 8); g.fill();
    revealUp('TSMC', x, base - hgt - 72, { size: 70, f: 'num', color: C.tsmc, ls: 4 }, B, LB(4) + 0.8, 0.5, 0.05);
    revealUp('파운드리', 1000, 380, { size: 120, f: 'disp', color: C.white, align: 'left', glow: C.tsmc, blur: 20 }, B, CW(4, '파운드리') - 0.2, 0.5, 0.05);
    rise('= 단단한 축', 1010, 510, { size: 60, w: 900, color: C.tsmc, align: 'left' }, B, CW(4, '단단한'));
    rise('10월 −6%에 그친 대만의 중심', 1010, 590, { size: 30, w: 700, color: C.inkD, align: 'left' }, B, CW(4, '단단한') + 1);
  }, { dy: 60, dout: 0.3 });
  // L5: 메모리의 긴 파도
  group(B, LB(5), LB(6) + 0.1, () => {
    const p = Ease.inOutSine(pr(B, CW(5, '메모리') - 0.6, CW(5, '파도') + 1.2));
    const pts = wavePts(120, 1800, 610, 190, 1.6, t * 2.2, p);
    glowPath(pts.map(([x, y]) => [x, y + 60]), C.hynix + '66', 5, 10);
    glowPath(pts, C.hynix, 14, 40);
    revealUp('메모리', 180, 250, { size: 110, f: 'disp', color: C.white, align: 'left', glow: C.hynix, blur: 22 }, B, CW(5, '메모리'), 0.5, 0.05);
    rise('긴 파도를 타는 업황', 190, 340, { size: 38, w: 800, color: C.hynix, align: 'left' }, B, CW(5, '파도'));
  }, { dy: 0, dout: 0.4 });
  // L6: 같은 반도체란 이름 아래 — one chip, two halves
  group(B, LB(6), LB(7) + 0.4, () => {
    const s = popE(B, LB(6), 0.5, 2);
    const sp = Ease.outBack(pr(B, CW(6, '아래') - 0.3, CW(6, '아래') + 0.8), 1.4) * 260;
    g.save(); g.beginPath(); g.rect(0, 0, CX, H); g.clip(); chip(CX - sp, 470, s * 1.6, C.cyan, ''); g.restore();
    g.save(); g.beginPath(); g.rect(CX, 0, CX, H); g.clip(); chip(CX + sp, 470, s * 1.6, C.hynix, ''); g.restore();
    if (sp < 30) text('반도체', CX, 472, { size: 52, f: 'disp', color: C.white, alpha: pr(B, CW(6, '반도체'), CW(6, '반도체') + 0.4) });
    else { text('파운드리', CX - sp, 472, { size: 44, f: 'disp', color: C.cyan }); text('메모리', CX + sp, 472, { size: 44, f: 'disp', color: C.hynix }); }
    rise('같은 이름', CX, 250, { size: 44, f: 'disp', color: C.inkD }, B, CW(6, '이름'));
  }, { dy: 40, dout: 0.3 });
  // L7: 서로 다른 계절 — two season dials at different speeds
  group(B, LB(7), SB(29.1), () => {
    popAt(B, LB(7), 560, 490, () => cycleDial(0, 0, 220, C.cyan, t * 0.9, '파운드리', '완만한 주기'), 0.5, 2);
    popAt(B, CW(7, '다른'), 1360, 490, () => cycleDial(0, 0, 220, C.hynix, t * 3.2, '메모리', '빠르고 큰 주기'), 0.5, 2);
  }, { dy: 40, dout: 0.15 });
}

/* ============================================================
   CHORUS (29.0–56.3 s, again at +68.3 s). B is chorus-1 time.
   ============================================================ */
const COMM = [['WTI', '원유'], ['COPPER', '구리'], ['DRAM', 'D램'], ['NAND', '낸드']];
function sChorus(B, t, F, v2) {
  const tc = B * SPB; // chorus-1 seconds
  // the drop
  if (tc >= 29.0 && tc < 29.95) {
    g.save(); g.globalAlpha *= 1 - pr(tc, 29.6, 29.95);
    chars('CHORUS', CX, 480, { size: 220, f: 'num', color: 'rgba(0,0,0,0)', stroke: v2 ? C.yellow : C.pink, sw: 5, ls: 20 });
    g.restore();
    ring(B, LB(8), CX, 480, { col: v2 ? C.yellow : C.pink, r: 1100, lw: 26, alpha: 0.6 });
    confetti(B, LB(8), CX, 480, { n: 70, seed: v2 ? 9 : 3, v1: 1900 });
  }
  // L8: 비중이 만든 기울기, 사이클이 만든 파장
  group(B, SB(29.95), LB(9) + 0.3, () => {
    const tilt = 0.28 * Ease.outBack(pr(B, CW(8, '기울기'), CW(8, '기울기') + 1.4), 1.8);
    g.save(); g.translate(520, 560); g.rotate(tilt);
    g.save(); g.shadowColor = C.yellow; g.shadowBlur = 24; g.fillStyle = C.yellow; rr(-330, -12, 660, 24, 12); g.fill(); g.restore();
    g.fillStyle = C.ewt; rr(-320, -82, 70, 70, 10); g.fill();
    g.fillStyle = C.ewy; rr(160, -162, 150, 150, 14); g.fill();
    text('비중', 235, -88, { size: 40, f: 'disp', color: '#120400' });
    g.restore();
    g.fillStyle = 'rgba(244,246,255,0.6)'; g.beginPath(); g.moveTo(520, 572); g.lineTo(470, 680); g.lineTo(570, 680); g.closePath(); g.fill();
    text('비중', 520, 380, { size: 30, w: 800, color: C.inkD, alpha: pr(B, LB(8) + 0.4, LB(8) + 0.8) });
    revealUp('기울기', 520, 300, { size: 84, f: 'disp', color: C.yellow, glow: C.yellow, blur: 18 }, B, CW(8, '기울기'), 0.5, 0.06);
    const wp = Ease.inOutSine(pr(B, CW(8, '사이클'), CW(8, '파장') + 0.6));
    glowPath(wavePts(1000, 1780, 560, 150, 2, t * 3, wp), C.pink, 10, 30);
    text('사이클', 1390, 380, { size: 30, w: 800, color: C.inkD, alpha: pr(B, CW(8, '사이클'), CW(8, '사이클') + 0.4) });
    revealUp('파장', 1390, 300, { size: 84, f: 'disp', color: C.pink, glow: C.pink, blur: 18 }, B, CW(8, '파장'), 0.5, 0.06);
  }, { dy: 60, dout: 0.3 });
  // L9: 한 종목의 무게가 지수를 흔들어
  group(B, LB(9), LB(10) + 0.3, () => {
    const b1 = CW(9, '흔들어'), shake = B > b1 ? Math.exp(-((B - b1) % 1) * 3) : 0;
    g.save(); g.translate(560, 500);
    donutW(B, 0, 0, 200, LB(9), [[0.2, C.tsmc]], 'TSMC 비중');
    text('대만 지수', 0, -280, { size: 44, f: 'disp' });
    g.restore();
    g.save(); g.translate(1360 + vnoise(t * 22, 3) * 22 * shake, 500 + vnoise(t * 22, 4) * 14 * shake); g.rotate(vnoise(t * 18, 5) * 0.06 * shake);
    donutW(B, 0, 0, 200, CW(9, '무게') - 0.4, [[0.3, C.samsung], [0.3, C.hynix]], '삼전 + 닉스 비중');
    text('한국 지수', 0, -280, { size: 44, f: 'disp' });
    g.restore();
  }, { dy: 60, dout: 0.3 });
  // L10–L11: TSMC stops at −6%, Samsung and Hynix go deeper
  group(B, LB(10), LB(12) + 0.3, () => {
    ddBars(B, [
      { tk: 'TSMC', s: '대만', v: 6, col: C.tsmc, b: CW(10, '여섯') - 0.3 },
      { tk: '삼성전자', f: 'disp', s: '한국', v: 20, col: C.samsung, b: CW(11, '삼성') - 0.2 },
      { tk: 'SK하이닉스', f: 'disp', s: '한국', v: 33, col: C.hynix, b: CW(11, '하이닉스') - 0.2 },
    ], 560, 420, 300, 13, { ns: 76 });
    popAt(B, CW(10, '그치고'), 560, 500, () => text('여기서 그침', 0, 0, { size: 34, f: 'disp', color: C.tsmc }));
  }, { dy: 60, dout: 0.3 });
  // L12: 원자재처럼 사고파는 기억의 칩들 — a commodity board with memory chips on it
  group(B, LB(12), LB(13) + 0.3, () => {
    neonBox(260, SY0 + 20, 1400, 620, C.gold, 30, '#0B0B08');
    text('COMMODITY BOARD', 320, SY0 + 76, { size: 34, f: 'num', color: C.gold, align: 'left', ls: 6 });
    pill('가설', 1600, SY0 + 76, { size: 26, w: 900, fill: C.violet, color: C.white, align: 'right' });
    COMM.forEach(([en, ko], i) => {
      const mem = i >= 2, y = SY0 + 160 + i * 110;
      const p = popE(B, mem ? CW(12, '기억의') - 0.6 + (i - 2) * 0.5 : CW(12, '원자재') + 0.3 + i * 0.7, 0.45, 1.6);
      if (p <= 0) return;
      g.save(); g.globalAlpha *= clamp(p); g.translate((1 - clamp(p)) * 80, 0);
      g.fillStyle = mem ? 'rgba(255,90,54,0.12)' : 'rgba(244,246,255,0.04)'; rr(300, y - 46, 1320, 92, 14); g.fill();
      if (mem) chip(360, y, 0.28, C.hynix, '');
      text(en, mem ? 420 : 330, y + 3, { size: 46, f: 'num', color: mem ? C.hynix : C.ink, align: 'left', ls: 3 });
      text(ko, 640, y + 2, { size: 34, w: 900, color: C.inkD, align: 'left' });
      // flickering quotes
      const fl = Math.floor(t * 12 + i * 7);
      const v = (mem ? 10 + (fl % 9) : 2 + (fl % 3)) * (Math.sin(t * 3 + i) > 0 ? 1 : -1);
      const col = v < 0 ? C.candle : C.red;
      text(v < 0 ? '▼' : '▲', 1330, y + 2, { size: 30, w: 900, color: col });
      text(`${v < 0 ? '−' : '+'}${Math.abs(v)}.${(fl * 7) % 10}%`, 1580, y + 3, { size: 46, f: 'num', color: col, align: 'right', ls: 2 });
      g.restore();
    });
    rise('기억의 칩도 원자재처럼 사고판다?', CX, SY0 + 590, { size: 40, w: 900, color: C.gold }, B, CW(12, '칩들'));
  }, { dy: 60, dout: 0.3 });
  // L13: 이번 낙폭엔 그 차이가 비쳤나 봐
  group(B, LB(13), SB(56.6), () => {
    const y = 470;
    popAt(B, LB(13) + 0.2, 560, y, () => { text('한국 EWY', 0, -150, { size: 40, f: 'disp', color: C.ewy }); bigNum('−21%', 0, 10, 220, C.ewy, { rgb: 6 }); });
    popAt(B, CW(13, '낙폭'), 1360, y, () => { text('대만 EWT', 0, -150, { size: 40, f: 'disp', color: C.ewt }); bigNum('−10%', 0, 10, 220, C.ewt, { rgb: 6 }); });
    const lp = Ease.outExpo(pr(B, CW(13, '차이'), CW(13, '차이') + 0.8));
    if (lp > 0) {
      g.save(); g.shadowColor = C.yellow; g.shadowBlur = 20; g.strokeStyle = C.yellow; g.lineWidth = 6;
      line(CX - 200 * lp, y + 160, CX + 200 * lp, y + 160); line(CX - 200 * lp, y + 140, CX - 200 * lp, y + 180); line(CX + 200 * lp, y + 140, CX + 200 * lp, y + 180); g.restore();
      text('그 차이 = 지수 안의 무게', CX, y + 220, { size: 40, f: 'disp', color: C.yellow, alpha: lp });
    }
  }, { dy: 60, dout: 0.3 });
}

/* ============================================================
   VERSE 2 (57.6–77.6 s)
   ============================================================ */
const HYNIX = (() => { const c = []; let v = 100; for (let i = 0; i < 34; i++) { v *= i < 22 ? 1 + (rnd(i, 51) - 0.35) * 0.05 : 1 - 0.022 - rnd(i, 52) * 0.02; c.push(v); } return c; })();
const HY_LO = Math.min(...HYNIX) - 6, HY_HI = Math.max(...HYNIX) + 6;
function sVerse2(B, t, F) {
  // L14–L15: the big pillar (20%) and the combined weight (60%)
  group(B, LB(14), LB(16) + 0.3, () => {
    g.save(); g.translate(560, 480);
    text('대만 지수', 0, -290, { size: 48, f: 'disp' });
    donutW(B, 0, 0, 220, CW(14, '스무') - 0.4, [[0.2, C.tsmc]], 'TSMC 한 종목');
    g.restore();
    popAt(B, CW(14, '기둥'), 560, 780, () => pill('큰 기둥', 0, 0, { size: 30, w: 900, fill: C.tsmc, color: C.white, align: 'center' }));
    const on = B >= CW(15, '둘이') - 0.4;
    g.save(); g.translate(1360, 480); g.globalAlpha *= B >= LB(15) - 0.3 ? 1 : 0.3;
    text('한국 지수', 0, -290, { size: 48, f: 'disp' });
    if (on) donutW(B, 0, 0, 220, CW(15, '둘이') - 0.4, [[0.3, C.samsung], [0.3, C.hynix]], '삼성전자 + SK하이닉스');
    else { arcStroke(0, 0, 220, 0, TAU, 'rgba(244,246,255,0.1)', 80, 'butt'); text('?', 0, 20, { size: 140, f: 'disp', color: C.inkS }); }
    g.restore();
    ring(B, CW(15, '예순'), 1360, 480, { col: C.ewy, r: 500, lw: 16, alpha: 0.5 });
    popAt(B, CW(15, '예순') + 0.3, 1360, 780, () => pill('둘이 합쳐 60%의 무게', 0, 0, { size: 30, w: 900, fill: C.ewy, color: '#120400', align: 'center' }));
  }, { dy: 60, dout: 0.3 });
  // L16: 십 월 이후 하이닉스 서른셋 아래 — falling candles
  group(B, LB(16), LB(17) + 0.3, () => {
    const x = 160, y = SY0 + 10, w = 1000, h = 630;
    g.fillStyle = '#000'; rr(x, y, w, h, 20); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(244,246,255,0.12)'; rr(x, y, w, h, 20); g.stroke();
    text('SK하이닉스', x + 30, y + 46, { size: 34, f: 'disp', color: C.hynix, align: 'left' });
    tag('개념도', x + w - 24, y + 46);
    const my = (v) => lerp(y + h - 40, y + 90, (v - HY_LO) / (HY_HI - HY_LO));
    const shown = HYNIX.length * Ease.inOutSine(pr(B, LB(16), CW(16, '서른셋') + 0.6));
    const cw = (w - 60) / HYNIX.length;
    for (let i = 0; i < shown; i++) {
      const c = HYNIX[i], o = i ? HYNIX[i - 1] : 99, up = c >= o, cx = x + 30 + cw * (i + 0.5);
      g.strokeStyle = up ? '#CFD6E6' : C.candle; g.lineWidth = 2; line(cx, my(Math.max(o, c) + 1.2), cx, my(Math.min(o, c) - 1.2));
      if (up) g.strokeRect(cx - cw * 0.3, my(c), cw * 0.6, Math.max(2, my(o) - my(c)));
      else { g.save(); g.shadowColor = C.candle; g.shadowBlur = 10; g.fillStyle = C.candle; g.fillRect(cx - cw * 0.3, my(o), cw * 0.6, Math.max(2, my(c) - my(o))); g.restore(); }
    }
    const pk = Math.max(...HYNIX.slice(0, 23));
    if (B >= CW(16, '하이닉스')) { dashed(x + 30, my(pk), x + w - 30, my(pk), C.hynix, 2, [6, 6]); text('10월 고점', x + 40, my(pk) - 20, { size: 22, w: 800, color: C.hynix, align: 'left' }); }
    popAt(B, CW(16, '서른셋'), 1490, 470, () => { text('10월 이후', 0, -150, { size: 40, w: 900, color: C.inkD }); bigNum('−33%', 0, 20, 230, C.hynix, { rgb: 6 }); });
  }, { dy: 60, dout: 0.3 });
  // L17: 삼성은 스무 걸음 뒤로 물러섰네 — 20 footsteps backwards
  group(B, LB(17), SB(77.9), () => {
    const n = Math.floor(20 * pr(B, CW(17, '스무'), CW(17, '물러섰네') + 0.8));
    // twenty chevrons pointing back, lit one per step
    for (let i = 0; i < 20; i++) {
      const on = i < n, x = 1600 - i * 66, k = on ? popE(B, CW(17, '스무') + (i / 20) * (CW(17, '물러섰네') + 0.8 - CW(17, '스무')), 0.3, 2) : 1;
      g.save(); g.translate(x, 610); g.scale(k, k);
      g.strokeStyle = on ? C.samsung : 'rgba(244,246,255,0.12)'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round';
      if (on) { g.shadowColor = C.samsung; g.shadowBlur = 18; }
      g.beginPath(); g.moveTo(14, -34); g.lineTo(-16, 0); g.lineTo(14, 34); g.stroke();
      g.restore();
    }
    text('0', 1630, 690, { size: 26, f: 'num', color: C.inkS });
    text('−20', 1600 - 19 * 66, 690, { size: 26, f: 'num', color: n >= 20 ? C.samsung : C.inkS });
    rise('삼성전자', CX, 290, { size: 84, f: 'disp', color: C.white, glow: C.samsung, blur: 20 }, B, LB(17));
    bigNum(`−${n}%`, CX, 440, 150, C.samsung);
    rise('스무 걸음 뒤로', CX, 760, { size: 36, w: 900, color: C.samsung }, B, CW(17, '물러섰네'));
  }, { dy: 50, dout: 0.3 });
}

/* ============================================================
   PRE-CHORUS 2 (78.0–96.9 s)
   ============================================================ */
function sPre2(B, t, F) {
  // L18: 수요가 식을 때 재고는 쌓이고
  group(B, LB(18), LB(19) + 0.3, () => {
    const cool = Ease.inOutSine(pr(B, CW(18, '식을') - 0.4, CW(18, '식을') + 2));
    const tx = 560, ty = 230;
    rr(tx - 40, ty, 80, 420, 40); g.fillStyle = C.panel2; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(244,246,255,0.3)'; g.stroke();
    const lv = lerp(380, 90, cool), col = cool > 0.5 ? C.cyan : C.red;
    g.save(); g.shadowColor = col; g.shadowBlur = 24; g.fillStyle = col; rr(tx - 22, ty + 410 - lv, 44, lv, 22); g.fill(); circle(tx, ty + 440, 60, col); g.restore();
    text('수요', tx, ty - 50, { size: 56, f: 'disp' });
    text(cool > 0.5 ? '식는 중' : '뜨거움', tx, ty + 550, { size: 34, w: 900, color: col });
    const b0 = CW(18, '재고') - 0.5;
    for (let i = 0; i < 12; i++) {
      const p = Ease.outBack(pr(B, b0 + i * 0.3, b0 + i * 0.3 + 0.4), 1.4);
      if (p <= 0) break;
      const cc = i % 4, row = Math.floor(i / 4), bx = 1060 + cc * 150, by = 700 - row * 130 - (1 - p) * 300;
      g.save(); g.globalAlpha *= clamp(p * 2); g.fillStyle = '#B7793B'; rr(bx, by - 120, 140, 120, 8); g.fill();
      g.fillStyle = '#8E5A26'; g.fillRect(bx + 55, by - 120, 30, 120); text('DRAM', bx + 70, by - 50, { size: 18, f: 'num', color: '#3A2208', ls: 2 }); g.restore();
    }
    text('재고', 1360, 220, { size: 56, f: 'disp', alpha: pr(B, b0, b0 + 0.4) });
  }, { dy: 60, dout: 0.3 });
  // L19: 메모리 가격은 먼저 흔들릴 수 있어
  group(B, LB(19), LB(20) + 0.3, () => {
    const x = 160, y = SY0 + 20, w = 1600, h = 600;
    panel(x, y, w, h, { r: 30 });
    tag('개념도', x + w - 30, y + 46);
    const p = Ease.inOutSine(pr(B, LB(19), CW(19, '흔들릴') + 2)), xs = x + 60, xe = x + w - 260;
    const mem = [], fdy = [];
    for (let k = 0; k <= 120; k++) {
      const u = k / 120; if (u > p) break;
      const X = lerp(xs, xe, u);
      mem.push([X, y + 220 + (u > 0.45 ? (u - 0.45) * 520 : 0) + Math.sin(u * 60) * 14 * u + vnoise(u * 30, 2) * 18]);
      fdy.push([X, y + 300 + (u > 0.7 ? (u - 0.7) * 90 : 0) + vnoise(u * 20, 5) * 6]);
    }
    glowPath(fdy, C.cyan, 6, 18); glowPath(mem, C.hynix, 7, 22);
    if (mem.length) { const m = mem[mem.length - 1], f = fdy[fdy.length - 1]; text('메모리 가격', m[0] + 20, m[1], { size: 30, w: 900, color: C.hynix, align: 'left' }); text('파운드리', f[0] + 20, f[1], { size: 30, w: 900, color: C.cyan, align: 'left' }); }
    if (p > 0.45) { const X = lerp(xs, xe, 0.45); dashed(X, y + 120, X, y + h - 40, C.yellow, 3); popAt(B, CW(19, '먼저'), X, y + 90, () => pill('먼저 흔들린다', 0, 0, { size: 30, w: 900, fill: C.yellow, color: '#1A1000', align: 'center' })); }
  }, { dy: 60, dout: 0.3 });
  // L20: 파운드리와 다른 리듬을 타는 이유 — two equalisers
  group(B, LB(20), LB(21) + 0.3, () => {
    const k = env(KICKS, t, 6);
    [[560, C.cyan, '파운드리', 0.35, 1.2], [1360, C.hynix, '메모리', 1, 3.4]].forEach(([cx, col, nm, amp, sp]) => {
      text(nm, cx, 260, { size: 60, f: 'disp', color: col });
      for (let i = 0; i < 9; i++) {
        const hh = 40 + 380 * amp * (0.5 + 0.5 * Math.sin(t * sp * 2 + i * 0.9)) * (0.7 + 0.3 * k);
        g.save(); g.shadowColor = col; g.shadowBlur = 16; g.fillStyle = col; rr(cx - 300 + i * 68, 760 - hh, 48, hh, 10); g.fill(); g.restore();
      }
    });
    rise('다른 리듬', CX, 470, { size: 40, f: 'disp', color: C.inkD }, B, CW(20, '리듬'));
  }, { dy: 60, dout: 0.3 });
  // L21: 그 가설을 숫자에 겹쳐 보네
  group(B, LB(21), SB(97.3), () => {
    [['SK하이닉스', '−33%', C.hynix], ['삼성전자', '−20%', C.samsung], ['TSMC', '−6%', C.tsmc]].forEach(([nm, v, col], i) => {
      popAt(B, CW(21, '가설') + i * 0.5, 460 + i * 500, 470, () => { text(nm, 0, -130, { size: 38, f: 'disp', color: col }); bigNum(v, 0, 20, 170, col); });
    });
    const sp = Ease.outExpo(pr(B, CW(21, '겹쳐'), CW(21, '겹쳐') + 0.4));
    if (sp > 0) {
      g.save(); g.translate(CX, 650); g.rotate(-0.1); g.scale(lerp(2.4, 1, sp), lerp(2.4, 1, sp)); g.globalAlpha *= Math.min(1, sp * 3);
      g.strokeStyle = C.violet; g.lineWidth = 10; g.shadowColor = C.violet; g.shadowBlur = 30; rr(-230, -90, 460, 180, 20); g.stroke();
      g.shadowBlur = 0; g.fillStyle = 'rgba(6,8,15,0.7)'; rr(-225, -85, 450, 170, 18); g.fill();
      text('가설', 0, 6, { size: 120, f: 'disp', color: C.violet });
      g.restore();
    }
  }, { dy: 60, dout: 0.15 });
}

/* ============================================================
   INTERLUDE + BRIDGE (124.6–146.9 s)
   ============================================================ */
const TAPE = [['EWY', '한국', -21], ['EWT', '대만', -10], ['TSMC', '대만', -6], ['삼성전자', '한국', -20], ['SK하이닉스', '한국', -33]];
function tape(y, t, speed, alpha = 1, h = 60) {
  const a0 = g.globalAlpha; g.globalAlpha = a0 * alpha;
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(-40, y - h / 2, W + 80, h);
  g.fillStyle = C.ewy; g.fillRect(-40, y - h / 2, W + 80, 2); g.fillRect(-40, y + h / 2 - 2, W + 80, 2);
  const items = TAPE.map(([n, p, c]) => ({ n, p, c, w: textW(n, 28, 900) + textW(p, 24, 700) + textW(`▼ −${Math.abs(c)}%`, 28, 400, null, 'num') + 120 }));
  const tot = items.reduce((s, it) => s + it.w, 0);
  let x = -((((t * speed) % tot) + tot) % tot);
  while (x < W) {
    for (const it of items) {
      if (x > W) break;
      if (x + it.w > -40) {
        let xx = x + 30;
        xx += text(it.n, xx, y + 1, { size: 28, w: 900, align: 'left' }) + 14;
        xx += text(it.p, xx, y + 2, { size: 24, w: 700, color: C.inkD, align: 'left' }) + 14;
        text(`▼ −${Math.abs(it.c)}%`, xx, y + 3, { size: 28, f: 'num', color: C.candle, align: 'left', ls: 1 });
      }
      x += it.w;
    }
  }
  g.globalAlpha = a0;
}
function sBridge(B, t, F) {
  // interlude: the title again over a tape of the numbers
  group(B, SB(124.75), LB(28) + 0.2, () => {
    logo('반도체의 계절', CX, 400, 150, B, SB(124.9), { grad: [C.white, C.mint], glow: C.mint, ext: '#06352A' });
    tape(600, t, 180, 1, 56);
    rise('10월 고점 대비 · 달러 기준', CX, 720, { size: 34, w: 800, color: C.inkD }, B, SB(126.0));
  }, { dy: 0, dout: 0.3 });
  // L28: 다만 두 ETF의 구성과 환율도
  group(B, LB(28), LB(29) + 0.3, () => {
    text('ETF 구성', 300, SY0 + 40, { size: 44, f: 'disp', align: 'left', alpha: pr(B, CW(28, 'ETF'), CW(28, 'ETF') + 0.4) });
    [['EWT', [[0.2, C.tsmc, 'TSMC 20%'], [0.8, 'rgba(244,246,255,0.18)', '기타 80%']], C.ewt], ['EWY', [[0.6, C.ewy, '삼전+닉스 60%'], [0.4, 'rgba(244,246,255,0.18)', '기타 40%']], C.ewy]].forEach(([tk, segs, col], i) => {
      const b0 = CW(28, 'ETF') + i * 0.6, y = SY0 + 140 + i * 150, p = Ease.outCubic(pr(B, b0, b0 + 1.2));
      if (p <= 0) return;
      text(tk, 300, y + 40, { size: 50, f: 'num', color: col, align: 'left', ls: 3 });
      let x = 440;
      segs.forEach(([v, c, lab]) => {
        const w = 780 * v * p;
        g.fillStyle = c; rr(x, y, Math.max(0, w - 6), 80, 10); g.fill();
        if (p > 0.9) text(lab, x + w / 2, y + 42, { size: 24, w: 900, color: c.startsWith('rgba') ? C.inkD : '#0A0A0A' });
        x += w;
      });
    });
    text('환율', 1360, SY0 + 40, { size: 44, f: 'disp', align: 'left', alpha: pr(B, CW(28, '환율') - 0.3, CW(28, '환율')) });
    [['USD/KRW', '원화', C.ewy], ['USD/TWD', '대만달러', C.ewt]].forEach(([pair, ko, col], i) => {
      popAt(B, CW(28, '환율') + i * 0.5, 1520, SY0 + 180 + i * 150, () => {
        neonBox(-180, -55, 360, 110, col, 24);
        text(pair, -150, -8, { size: 40, f: 'num', color: col, align: 'left', ls: 2 });
        text(ko, -150, 32, { size: 22, w: 800, color: C.inkD, align: 'left' });
        const up = Math.sin(t * 2 + i * 2) > 0; text(up ? '▲' : '▼', 130, 2, { size: 40, w: 900, color: up ? C.red : C.candle });
      });
    });
    rise('구성과 환율도 결과를 바꾼다', CX, SY0 + 560, { size: 40, w: 900, color: C.mint }, B, CW(28, '환율') + 2);
  }, { dy: 60, dout: 0.3 });
  // L29: 같은 그림을 다르게 만들 수 있어 — one path, two lenses
  group(B, LB(29), LB(30) + 0.3, () => {
    const pts = []; for (let k = 0; k <= 80; k++) { const u = k / 80; pts.push([u, Math.sin(u * 5) * 0.3 + u * 0.4 + vnoise(k * 0.5, 3) * 0.08]); }
    [[180, C.ewy, '원화로 보면', LB(29) + 0.2], [1000, C.ewt, '달러로 보면', CW(29, '다르게')]].forEach(([x, col, lab, b0], i) => {
      const p = popE(B, b0, 0.5, 1.6);
      if (p <= 0) return;
      g.save(); g.globalAlpha *= clamp(p);
      neonBox(x, SY0 + 40, 740, 520, col, 30);
      text(lab, x + 40, SY0 + 96, { size: 40, f: 'disp', color: col, align: 'left' });
      const sk = i ? 0.75 : 1.15;
      glowPath(pts.map(([u, v]) => [x + 50 + u * 640, SY0 + 420 - v * 260 * sk - (i ? u * 40 : 0)]), col, 6, 18);
      g.restore();
    });
    tag('개념도', 1740, SY0 + 600);
    rise('같은 그림, 다른 모양', CX, SY0 + 610, { size: 38, w: 900, color: C.inkD }, B, CW(29, '다르게') + 1.5);
  }, { dy: 60, dout: 0.3 });
  // L30: 하나의 설명으로 결론 내리기보다
  group(B, LB(30), LB(31) + 0.3, () => {
    popAt(B, LB(30) + 0.2, 560, 480, () => { neonBox(-240, -70, 480, 140, C.inkS, 70); text('하나의 설명', 0, 4, { size: 54, f: 'disp' }); }, 0.45, 2);
    const x = Ease.outExpo(pr(B, CW(30, '결론'), CW(30, '결론') + 0.4));
    if (x > 0) { g.save(); g.strokeStyle = C.red; g.lineWidth = 12; g.lineCap = 'round'; g.shadowColor = C.red; g.shadowBlur = 20; line(330, 400, 330 + 460 * x, 400 + 160 * x); g.restore(); }
    [['비중', C.pink], ['업황', C.hynix], ['환율', C.ewt], ['구성', C.mint]].forEach(([s, col], i) => {
      const b0 = CW(30, '내리기') + i * 0.45, ap = Ease.outCubic(pr(B, b0, b0 + 0.5));
      if (ap <= 0) return;
      const ty = 270 + i * 140;
      g.save(); g.globalAlpha *= ap;
      g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.moveTo(820, 480); g.bezierCurveTo(980, 480, 1040, ty, lerp(820, 1200, ap), ty); g.stroke();
      pill(s, 1210, ty, { size: 44, f: 'disp', fill: col, color: '#0A0A0A', align: 'left' });
      g.restore();
    });
  }, { dy: 60, dout: 0.3 });
  // L31: 비중과 업황을 함께 살펴보자
  group(B, LB(31), SB(147.0), () => {
    [['비중', '지수 안의 무게', C.pink, CW(31, '비중')], ['업황', '사이클의 위치', C.hynix, CW(31, '업황')]].forEach(([s, sub, col, b0], i) => {
      popAt(B, b0, 560 + i * 800, 480, () => {
        neonBox(-300, -200, 600, 400, col, 40);
        text(s, 0, -30, { size: 130, f: 'disp', color: col });
        text(sub, 0, 90, { size: 34, w: 800, color: C.inkD });
        circle(220, -140, 44, col); checkMark(220, -136, 54, '#0A0A0A', pr(B, b0 + 0.6, b0 + 1.2), 9);
      });
    });
    popAt(B, CW(31, '살펴') - 0.6, CX, 480, () => plusSign(0, 0, 70, C.yellow));
  }, { dy: 60, dout: 0.3 });
}

/* ============================================================
   OUTRO (147.0–165.4 s) + ENDING (165.4–182 s)
   ============================================================ */
function sOutro(B, t, F) {
  // L32: 달러 기준 두 시장, 숫자는 말해
  group(B, LB(32), LB(33) + 0.3, () => {
    [['EWY', '한국', '−21%', C.ewy, 560, LB(32) + 0.2], ['EWT', '대만', '−10%', C.ewt, 1360, CW(32, '두 시장')]].forEach(([tk, ct, v, col, x, b0]) => {
      popAt(B, b0, x, 470, () => {
        neonBox(-320, -230, 640, 460, col, 36);
        pill(ct, -280, -170, { size: 32, w: 900, fill: col, color: '#0A0A0A', align: 'left' });
        text('USD', 280, -170, { size: 30, f: 'num', color: C.inkD, align: 'right', ls: 2 });
        chars(tk, 0, -30, { size: 150, f: 'num', color: C.white, glow: col, blur: 30, ls: 8 });
        if (B >= CW(32, '숫자는')) bigNum(v, 0, 140, 110, col);
      }, 0.5, 1.8);
    });
  }, { dy: 60, dout: 0.3 });
  // L33: 메모리의 파도는 더 높을 수 있다고
  group(B, LB(33), LB(34) + 0.3, () => {
    const grow = Ease.inOutSine(pr(B, CW(33, '파도'), CW(33, '파도') + 4));
    glowPath(wavePts(160, 1760, 400, 60 + 140 * grow, 1.8, t * 2.4, 1), C.hynix, 12, 34);
    glowPath(wavePts(160, 1760, 690, 40, 1.8, t * 1.4 + 1, 1), C.cyan, 8, 22);
    text('메모리', 180, 210, { size: 54, f: 'disp', color: C.hynix, align: 'left' });
    text('파운드리', 180, 600, { size: 44, f: 'disp', color: C.cyan, align: 'left' });
    popAt(B, CW(33, '더 높을'), 1560, 210, () => pill('더 높을 수 있다', 0, 0, { size: 34, w: 900, fill: C.hynix, color: '#120400', align: 'center' }));
  }, { dy: 0, dout: 0.3 });
  // L34: 가설을 남기고 다음 장을 기다려 — a note, and a page that turns
  group(B, LB(34), LB(35) + 0.3, () => {
    popAt(B, CW(34, '가설'), 560, 470, () => {
      g.rotate(-0.05);
      g.fillStyle = '#FFE98A'; rr(-260, -230, 520, 460, 12); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-260, -230, 520, 50);
      text('가설', 0, -110, { size: 90, f: 'disp', color: '#3B2B00' });
      text('메모리는', 0, 0, { size: 38, w: 900, color: '#3B2B00' });
      text('시클리컬 원자재처럼', 0, 56, { size: 38, w: 900, color: '#3B2B00' });
      text('더 크게 흔들린다?', 0, 112, { size: 38, w: 900, color: '#3B2B00' });
    }, 0.5, 1.6);
    const fp = Ease.inOutCubic(pr(B, CW(34, '다음 장'), CW(34, '다음 장') + 1.2));
    g.save(); g.translate(1360, 470);
    neonBox(-260, -230, 520, 460, C.gold, 24);
    text('NEXT', 0, -20, { size: 120, f: 'num', color: C.gold, ls: 10 });
    text('다음 장', 0, 90, { size: 40, f: 'disp' });
    if (fp < 1) {
      // the cover page folds toward its left edge
      g.save(); g.translate(-260, 0); g.scale(1 - fp, 1); g.translate(260, 0);
      g.fillStyle = C.panel2; rr(-260, -230, 520, 460, 24); g.fill();
      g.lineWidth = 3; g.strokeStyle = 'rgba(244,246,255,0.15)'; rr(-260, -230, 520, 460, 24); g.stroke();
      text('10월', 0, 10, { size: 140, f: 'disp', color: C.inkS });
      g.restore();
    }
    g.restore();
  }, { dy: 60, dout: 0.3 });
  // L35: 서로 다른 반도체의 계절을 — the two seasons, side by side
  group(B, LB(35), SB(165.6), () => {
    const sp = Ease.outExpo(pr(B, LB(35), LB(35) + 1.2));
    g.save(); g.globalAlpha *= 0.85;
    g.fillStyle = C.cyan + '22'; g.fillRect(0, 0, CX * sp, H);
    g.fillStyle = C.hynix + '22'; g.fillRect(W - CX * sp, 0, CX * sp, H);
    g.restore();
    popAt(B, LB(35), 560, 480, () => cycleDial(0, 0, 200, C.cyan, t * 0.9, '파운드리', '대만 · TSMC'), 0.5, 2);
    popAt(B, CW(35, '다른'), 1360, 480, () => cycleDial(0, 0, 200, C.hynix, t * 3.2, '메모리', '한국 · 삼전·닉스'), 0.5, 2);
    ring(B, CW(35, '계절'), 560, 480, { col: C.cyan, r: 420, lw: 12, alpha: 0.6 });
    ring(B, CW(35, '계절'), 1360, 480, { col: C.hynix, r: 420, lw: 12, alpha: 0.6 });
  }, { dy: 40, dout: 0.3 });
}
function sEnding(B, t, F) {
  const b0 = SB(165.4), fade = Ease.inOutSine(pr(t, 179, 182));
  const sb = Ease.outExpo(pr(B, b0, b0 + 1.2));
  g.save(); g.globalAlpha *= 0.06 * (1 - fade) * (1 + F.kick * 0.5);
  for (let k = 0; k < 28; k++) { const a = -t * 0.07 + (k / 28) * TAU; g.fillStyle = [C.pink, C.yellow, C.cyan, C.ewy][k % 4]; g.beginPath(); g.moveTo(CX, 380); g.arc(CX, 380, 1700 * sb, a, a + TAU / 56); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalAlpha *= 1 - fade * 0.9;
  logo('반도체의 계절', CX, 380, 230, B, b0);
  ring(B, b0, CX, 380, { col: C.yellow, r: 1100, lw: 28, alpha: 0.6 });
  confetti(B, b0, CX, 380, { n: 90, seed: 41, v1: 2100 });
  rise('달러 기준 · 한국 EWY −21% vs 대만 EWT −10%', CX, 560, { size: 38, w: 800, color: C.inkD }, B, b0 + 2, 0.6, 0.01);
  popAt(B, SB(169.5), CX, 690, () => {
    g.rotate(-0.04);
    neonBox(-260, -60, 520, 120, C.pink, 60, C.panel2);
    chars('쫄지마세요', 0, 6, { size: 72, f: 'disp', grad: [C.white, C.pink], glow: C.pink, blur: 24 });
  }, 0.5, 2);
  tape(850, t, -160, pr(t, 166, 167) * 0.9, 52);
  const da = pr(t, 172, 173);
  if (da > 0) {
    text('본 영상은 정보 제공용 콘텐츠이며 특정 자산의 매수·매도를 권유하지 않습니다. 차트는 첨부 자료를 재현했거나 흐름을 보여주는 개념도입니다.', CX, 962, { size: 21, w: 600, color: C.inkD, alpha: da });
    text('투자 판단과 그에 따른 책임은 투자자 본인에게 있습니다.  ·  음악: 반도체의 계절 (iontiger)', CX, 998, { size: 21, w: 600, color: C.inkD, alpha: da });
  }
  g.restore();
}

/* ============================================================
   LYRICS — karaoke line at the bottom, lit per character
   ============================================================ */
function lyricLine(L, t, y, aIn, aOut) {
  const col = sectAt(L.t0 + 0.1).col;
  const size = Math.min(72, fitSize(L.text, 1600, 72, 400, 'disp')), n = L.text.length;
  const o = { size, f: 'disp', ls: 1 };
  g.save(); g.globalAlpha *= 1 - aOut; g.translate(0, -aOut * 36);
  // pass 1: the whole line, dim, rising in
  chars(L.text, CX, y, Object.assign({ color: 'rgba(244,246,255,0.34)', stroke: 'rgba(0,0,0,0.55)', sw: 2 }, o), (i) => {
    const p = pr(aIn, (i / n) * 0.5, (i / n) * 0.5 + 0.5);
    return { y: (1 - Ease.outCubic(p)) * 30, a: p };
  });
  // pass 2: sung characters light up with a bounce
  const gr = g.createLinearGradient(0, -size * 0.42, 0, size * 0.42);
  gr.addColorStop(0, C.white); gr.addColorStop(1, col);
  chars(L.text, CX, y, Object.assign({ glow: col, blur: 20 }, o), (i) => {
    const ct = L.ct[i];
    if (t < ct) return false;
    const bump = Math.sin(pr(t, ct, ct + 0.22) * Math.PI);
    return { c: gr, s: 1 + bump * 0.22, y: -bump * 12 };
  });
  g.restore();
}
// when each line fades in and out, so neighbouring lines never share the screen
const LYR_IN = [], LYR_OUT = [];
LYRICS.forEach((L, i) => {
  const nx = LYRICS[i + 1];
  LYR_OUT[i] = nx ? Math.min(L.t1, Math.max(nx.t0 - 0.42, L.end + 0.12)) : L.t1;
  LYR_IN[i] = Math.max(L.t0 - 0.3, i ? LYR_OUT[i - 1] + 0.2 : -1);
});
function drawLyrics(t) {
  if (t >= 165.9) return;
  const bg = g.createLinearGradient(0, 840, 0, H);
  bg.addColorStop(0, 'rgba(6,8,15,0)'); bg.addColorStop(0.45, 'rgba(6,8,15,0.72)'); bg.addColorStop(1, 'rgba(6,8,15,0.9)');
  g.fillStyle = bg; g.fillRect(0, 840, W, H - 840);
  let cur = -1;
  for (let i = 0; i < LYRICS.length; i++) {
    const a = LYR_IN[i], z = LYR_OUT[i];
    if (t < a || t >= z + 0.2) continue;
    lyricLine(LYRICS[i], t, 948, Ease.outCubic(pr(t, a, Math.max(a + 0.2, LYRICS[i].t0))), Ease.inCubic(pr(t, z, z + 0.2)));
    if (t < z) cur = i;
  }
  // the next line, small, when it follows closely
  const L = LYRICS[cur], nx = LYRICS[cur + 1];
  if (L && nx && nx.s === L.s && nx.t0 - t < 4) text(nx.text, CX, 1030, { size: 28, w: 700, color: C.inkS, alpha: 0.8 * pr(t, L.t0, L.t0 + 0.6) * (1 - pr(t, LYR_OUT[cur] - 0.3, LYR_OUT[cur])) });
}

/* ---------------- header, HUD, progress ---------------- */
function drawHeader(t) {
  const s = sectAt(t);
  if (!s.name || t < 2.8) return;
  const t0 = Math.max(2.8, s.t), a = Ease.outCubic(pr(t, t0, t0 + 0.5));
  g.save(); g.globalAlpha = a; g.translate(-(1 - a) * 60, 0);
  g.save(); g.shadowColor = s.col; g.shadowBlur = 20; const w = pill(s.name, 84, 92, { size: 26, f: 'num', fill: s.col, color: '#0A0A0A', align: 'left', ls: 3 }); g.restore();
  text(s.sub, 84 + w + 20, 92, { size: 30, f: 'disp', align: 'left' });
  g.restore();
}
function drawHUD(t) {
  if (t < 2.8 || t >= 165.4) return;
  g.save(); g.globalAlpha = win(t, 2.8, 165.4, 0.6, 0.6);
  text('반도체의 계절', W - 84, 84, { size: 32, f: 'disp', align: 'right', color: C.pink });
  text('EWY vs EWT · 2026.10', W - 84, 118, { size: 18, w: 700, color: C.inkD, align: 'right', ls: 1 });
  const k = env(KICKS, t, 10);
  [C.ewy, C.ewt, C.pink, C.yellow].forEach((c, i) => circle(W - 90 - i * 16, 146, 4.5 + (i === 0 ? k * 2.5 : 0), c));
  g.restore();
}
function drawProgress(t) {
  const y = H - 4;
  g.fillStyle = 'rgba(244,246,255,0.08)'; g.fillRect(0, y, W, 4);
  for (let i = 0; i < SECTS.length; i++) {
    const a = SECTS[i].t, z = i + 1 < SECTS.length ? SECTS[i + 1].t : DUR, x0 = (a / DUR) * W, x1 = (Math.min(t, z) / DUR) * W;
    if (x1 > x0) { g.fillStyle = SECTS[i].col; g.fillRect(x0, y, x1 - x0, 4); }
  }
}

/* ============================================================
   COMPOSITION
   ============================================================ */
const SCENES = [
  { a: 0, z: 18.0, f: sVerse1 },
  { a: 18.3, z: 29.2, f: sPre1 },
  { a: 28.9, z: 56.8, f: (B, t, F) => sChorus(B, t, F, false) },
  { a: 57.4, z: 78.0, f: sVerse2 },
  { a: 77.8, z: 97.4, f: sPre2 },
  { a: 97.2, z: 125.0, f: (B, t, F) => sChorus(B - C2, t, F, true) },
  { a: 124.7, z: 147.1, f: sBridge },
  { a: 146.9, z: 165.7, f: sOutro },
  { a: 165.3, z: DUR + 1, f: sEnding },
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
  for (const s of SCENES) if (t >= s.a && t < s.z) s.f(B, t, F);
  g.restore();
  drawHeader(t);
  drawHUD(t);
  drawLyrics(t);
  drawProgress(t);
  return postParams(B, t);
}
