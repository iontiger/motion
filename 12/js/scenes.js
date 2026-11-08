'use strict';
/* ============================================================
   SCENES — the video is a book. The cover holds the title, every
   section is a new page that curls away on the beat (and on every
   sung "page"), the instrumental breaks are flip-books, and the
   back cover carries the credits. The lyrics ride on top (type.js).
   ============================================================ */
let ENERGY = null;
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((A >> 16) & 255, (B >> 16) & 255, t)), gg = Math.round(lerp((A >> 8) & 255, (B >> 8) & 255, t)), bb = Math.round(lerp(A & 255, B & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | bb).toString(16).slice(1);
}
function energy(t) { if (!ENERGY) return 0.5; return ENERGY[clamp(Math.floor(t * 60), 0, ENERGY.length - 1)]; }

/* ---------------- beats (BEATS from lyrics.js carries the tempo drift) ---------------- */
function beatAt(t) {
  const n = BEATS.length;
  if (t <= BEATS[0]) return (t - BEATS[0]) / SPB;
  if (t >= BEATS[n - 1]) return n - 1 + (t - BEATS[n - 1]) / SPB;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (BEATS[m] <= t) lo = m; else hi = m; }
  return lo + (t - BEATS[lo]) / (BEATS[hi] - BEATS[lo]);
}
function beatT(b) {
  const n = BEATS.length, i = Math.floor(b);
  if (i < 0) return BEATS[0] + b * SPB;
  if (i >= n - 1) return BEATS[n - 1] + (b - n + 1) * SPB;
  return lerp(BEATS[i], BEATS[i + 1], b - i);
}
function bEnv(t, k = 8) { const i = Math.floor(beatAt(t)); return i < 0 ? 0 : Math.exp(-(t - beatT(i)) * k); }
function dEnv(t, k = 5) { let i = Math.floor(beatAt(t)); i -= (((i - DB_PHASE) % 4) + 4) % 4; return i < 0 ? 0 : Math.exp(-(t - beatT(i)) * k); }
const beatsIn = (a, z, step = 1) => { const out = []; for (let b = Math.ceil(beatAt(a) / step) * step; beatT(b) < z; b += step) out.push(beatT(b)); return out; };

/* ---------------- palettes (one per page kind) ---------------- */
const PAL = {
  cover: { kind: 'cover', top: '#1A1F4A', bot: '#0B0E26', ink: '#FFE9B0', acc: '#FFC94A', acc2: '#FF5B8A', sub: '#B9B4D8', deep: '#07091C', glow: '#FFC94A', dark: true },
  paper: { kind: 'paper', bg: '#F6EEDF', ink: '#1C1B33', acc: '#FF5B3A', acc2: '#1F8A8A', sub: '#6A6480', deep: '#1C1B33', hl: '#FFE45C', glow: null },
  sunrise: { kind: 'sun', top: '#FF5E3A', bot: '#FFC15E', ink: '#FFFFFF', acc: '#3A1C71', acc2: '#FFF27A', sub: '#FFE8D0', deep: '#3A1C71', glow: '#FF9F5A', dark: true },
  violet: { kind: 'neon', top: '#140A30', bot: '#3B0F5C', ink: '#FFFFFF', acc: '#FF4FA3', acc2: '#3EE6FF', glow: '#B98CFF', sub: '#D7C8FF', deep: '#120828', dark: true, grid: '#FF4FA3' },
  violet2: { kind: 'neon', top: '#0E0A36', bot: '#5A0F4E', ink: '#FFFFFF', acc: '#3EE6FF', acc2: '#FF4FA3', glow: '#FF7AD0', sub: '#D7C8FF', deep: '#120828', dark: true, grid: '#3EE6FF' },
  mint: { kind: 'paper', bg: '#DFF3EA', ink: '#0F2E2A', acc: '#FF4F79', acc2: '#2F6BFF', sub: '#4E716A', deep: '#0F2E2A', hl: '#FFE45C', glow: null, card1: '#FFFFFF', card2: '#FFE45C', card3: '#FFC2D4' },
  pink: { kind: 'sun', top: '#FF3F8E', bot: '#FFB347', ink: '#FFFFFF', acc: '#2B145E', acc2: '#FFF27A', sub: '#FFE3EE', deep: '#2B145E', glow: '#FF7FB0', dark: true },
  blue: { kind: 'neon', top: '#040C26', bot: '#0B2B66', ink: '#FFFFFF', acc: '#3EE6FF', acc2: '#FFC94A', glow: '#3EA8FF', sub: '#BFD9FF', deep: '#020818', dark: true, grid: '#3EE6FF' },
  blue2: { kind: 'neon', top: '#0A0C3A', bot: '#23157A', ink: '#FFFFFF', acc: '#FFC94A', acc2: '#3EE6FF', glow: '#7A8CFF', sub: '#BFD9FF', deep: '#020818', dark: true, grid: '#FFC94A' },
  notebook: { kind: 'notebook', bg: '#FBF6E9', ink: '#2341A8', acc: '#E8443A', acc2: '#F2B630', sub: '#5A6A9A', deep: '#1B2A6B', glow: null },
  sky: { kind: 'sky', top: '#1B1446', mid: '#B8327A', bot: '#FFB547', ink: '#FFFFFF', acc: '#FFD45C', acc2: '#FF5FA8', glow: '#FF9D4A', deep: '#2A0F3D', sub: '#FFE7C2', dark: true, sun: 0.2 },
  sky2: { kind: 'sky', top: '#2A2C8C', mid: '#FF5F8A', bot: '#FFE08A', ink: '#FFFFFF', acc: '#FFE45C', acc2: '#3EE6FF', glow: '#FFB547', deep: '#2A0F3D', sub: '#FFF1D6', dark: true, sun: 0.75 },
  stars: { kind: 'sky', top: '#03061C', mid: '#1C1458', bot: '#5A2A8A', ink: '#FFFFFF', acc: '#FFD45C', acc2: '#3EE6FF', glow: '#8E7CFF', deep: '#03061C', sub: '#D7D2FF', dark: true, sun: 0, stars: true },
  white: { kind: 'paper', bg: '#FFF8EE', ink: '#1C1B33', acc: '#FF5B3A', acc2: '#8B5CFF', sub: '#6A6480', deep: '#1C1B33', glow: null },
};

/* ---------------- the book: page turns ---------------- */
const PAGES = [];
function addPage(t, key, o = {}) { PAGES.push(Object.assign({ t, key, dur: 0.7 }, o)); }
(() => {
  addPage(-10, 'cover', { cover: 'front' });
  addPage(13.75, 'paper');
  addPage(30.35, 'sunrise');
  addPage(38.75, 'violet');
  addPage(41.45, 'violet2', { dur: 0.55 });          // on 넘기고 — the page turns as it is sung
  addPage(57.85, 'mint', { dur: 0.6 });
  addPage(74.7, 'pink');
  addPage(83.05, 'blue');
  addPage(85.77, 'blue2', { dur: 0.55 });
  addPage(102.3, 'notebook');
  // build-up into the last chorus: flips every half beat over the held "가"
  beatsIn(119.45, 120.75, 0.5).forEach((bt, k) => addPage(bt - 0.03, ['sunrise', 'violet', 'pink', 'blue', 'mint', 'sky2'][k % 6], { dur: 0.22 }));
  addPage(120.75, 'sky', { dur: 0.6 });
  addPage(123.43, 'sky2', { dur: 0.55 });
  // held note after the last chorus: flip-book, a page per beat, each carrying one big word
  const flipKeys = ['sunrise', 'mint', 'violet', 'pink', 'paper', 'blue', 'sky2', 'notebook'];
  const words = ['페이지를', '넘기고', '있어', '✦'];
  beatsIn(139.9, 142.75).forEach((bt, k) => addPage(bt - 0.04, flipKeys[k % flipKeys.length], { dur: 0.3, word: words[k % 4], wf: ['ant', 'fra', 'bag', 'ant'][Math.floor(k / 4) % 4], seed: k }));
  addPage(142.8, 'sky', { dur: 0.5 });
  addPage(148.05, 'stars');
  addPage(158.95, 'white');
  addPage(167.3, 'cover', { cover: 'back', dur: 0.9 });
  PAGES.sort((a, b) => a.t - b.t);
  PAGES.forEach((p, i) => (p.num = i));
})();
function pageIndex(t) { let i = 0; for (let k = 0; k < PAGES.length; k++) if (PAGES[k].t <= t) i = k; return i; }
function paletteAt(t) { return PAL[PAGES[pageIndex(t)].key]; }

/* ---------------- textures ---------------- */
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), R = mulberry32(7);
  for (let i = 0; i < 2600; i++) { x.fillStyle = R() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'; x.fillRect(R() * 256, R() * 256, 1 + R() * 2, 1 + R() * 2); }
  GRAIN = g.createPattern(c, 'repeat');
  return GRAIN;
}

/* ---------------- one page ---------------- */
function drawPage(pg, t) {
  const p = PAL[pg.key];
  const local = t - pg.t;
  switch (p.kind) {
    case 'cover': coverBg(p, pg, t); break;
    case 'paper': {
      fillAll(p.bg);
      // dot grid
      g.fillStyle = hexA(p.ink, 0.07);
      for (let y = 60; y < H; y += 60) for (let x = 60; x < W; x += 60) g.fillRect(x - 2, y - 2, 4, 4);
      break;
    }
    case 'sun': {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, p.top); gr.addColorStop(1, p.bot);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const rise = Ease.outCubic(clamp(local / 8));
      const sx = CX, sy = lerp(1180, 900, rise), R = 340 * (1 + 0.04 * bEnv(t, 6));
      g.save(); g.translate(sx, sy); g.rotate(t * 0.12);
      g.fillStyle = hexA('#FFFFFF', 0.14);
      g.beginPath(); for (let i = 0; i < 18; i++) { const a0 = (i / 18) * TAU; g.moveTo(0, 0); g.arc(0, 0, 1600, a0, a0 + TAU / 36); } g.fill();
      g.restore();
      circle(sx, sy, R * 1.35, hexA('#FFFFFF', 0.12));
      circle(sx, sy, R, hexA('#FFF4D6', 0.55));
      // stripes across the sun (retro)
      g.fillStyle = hexA(p.bot, 0.9);
      for (let k = 0; k < 6; k++) { const yy = sy - R * 0.1 + k * R * 0.17; g.fillRect(sx - R, yy, R * 2, 6 + k * 3); }
      break;
    }
    case 'neon': {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, p.top); gr.addColorStop(1, p.bot);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const hz = 760;
      // horizon glow
      const hg = g.createRadialGradient(CX, hz, 10, CX, hz, 900); hg.addColorStop(0, hexA(p.grid, 0.45 + 0.25 * bEnv(t, 6))); hg.addColorStop(1, hexA(p.grid, 0));
      g.fillStyle = hg; g.fillRect(0, 0, W, H);
      // perspective floor grid moving toward the viewer on the beat
      g.save(); g.beginPath(); g.rect(0, hz, W, H - hz); g.clip();
      g.strokeStyle = hexA(p.grid, 0.75); g.lineWidth = 2;
      for (let k = -14; k <= 14; k++) line(CX + k * 40, hz, CX + k * 420, H + 40);
      const ph = fract(beatAt(t) / 2);
      for (let k = 0; k < 12; k++) { const z = Math.pow((k + ph) / 12, 2.2); const y = hz + z * (H + 60 - hz); g.globalAlpha = 0.3 + 0.7 * z; line(0, y, W, y); }
      g.restore();
      // bokeh lights pulsing on beats
      for (let i = 0; i < 14; i++) {
        const x = rnd(i, 11 + pg.num) * W, y = 80 + rnd(i, 12) * 560, r = 30 + rnd(i, 13) * 90;
        const a = (0.1 + 0.18 * bEnv(t + rnd(i, 14) * 0.3, 4)) * (0.6 + 0.4 * energy(t));
        circle(x + Math.sin(t * 0.4 + i) * 30, y, r, hexA(i % 2 ? p.acc : p.acc2, a));
      }
      break;
    }
    case 'notebook': {
      fillAll(p.bg);
      g.strokeStyle = hexA('#7EA6E0', 0.45); g.lineWidth = 2;
      for (let y = 150; y < H; y += 64) line(0, y, W, y);
      g.strokeStyle = hexA('#E8443A', 0.5); g.lineWidth = 3; line(190, 0, 190, H);
      for (const y of [220, 540, 860]) circle(80, y, 26, hexA('#1B2A6B', 0.12));
      break;
    }
    case 'sky': {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, p.top); gr.addColorStop(0.62, p.mid); gr.addColorStop(1, p.bot);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // stars at the top
      for (let i = 0; i < (p.stars ? 160 : 70); i++) {
        const x = rnd(i, 31) * W, y = rnd(i, 32) * H * (p.stars ? 0.95 : 0.5), tw = 0.5 + 0.5 * Math.sin(t * (2 + rnd(i, 33) * 4) + i);
        g.globalAlpha = (p.stars ? 0.9 : 0.6) * tw * (1 - y / H);
        g.fillStyle = '#FFFFFF'; g.fillRect(x, y, 2 + rnd(i, 34) * 2, 2 + rnd(i, 34) * 2);
      }
      g.globalAlpha = 1;
      if (p.sun > 0) {
        const sy = lerp(1250, 860, p.sun * Ease.outCubic(clamp(local / 6)));
        const sg = g.createRadialGradient(CX, sy, 40, CX, sy, 900); sg.addColorStop(0, hexA('#FFF6D8', 0.95)); sg.addColorStop(0.25, hexA('#FFD27A', 0.55)); sg.addColorStop(1, hexA('#FFD27A', 0));
        g.fillStyle = sg; g.fillRect(0, 0, W, H);
        g.save(); g.translate(CX, sy); g.rotate(-t * 0.08);
        g.fillStyle = hexA('#FFFFFF', 0.08 + 0.06 * bEnv(t, 5));
        g.beginPath(); for (let i = 0; i < 24; i++) { const a0 = (i / 24) * TAU; g.moveTo(0, 0); g.arc(0, 0, 1800, a0, a0 + TAU / 60); } g.fill();
        g.restore();
      }
      break;
    }
  }
  // flip-book pages carry one big word
  if (pg.word) flipWord(pg, p, t);
  // the book: gutter shadow on the left and a running header
  if (p.kind !== 'cover') {
    const gg = g.createLinearGradient(0, 0, 90, 0); gg.addColorStop(0, 'rgba(0,0,0,0.22)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gg; g.fillRect(0, 0, 90, H);
    g.save(); g.globalAlpha = 0.55;
    text('페이지를 넘기고 있어', 120, 58, { size: 24, w: 700, align: 'left', color: p.sub, ls: 3 });
    text('p. ' + (pg.num + 1), W - 70, 58, { size: 22, f: 'ant', align: 'right', color: p.sub, ls: 2 });
    g.restore();
  }
  if (p.kind === 'paper' || p.kind === 'notebook') { g.save(); g.fillStyle = grain(); g.fillRect(0, 0, W, H); g.restore(); }
}

function flipWord(pg, p, t) {
  const d = t - pg.t - 0.04;
  const s = lerp(1.6, 1, Ease.outExpo(pr(d, 0, 0.18))) * (1 + 0.03 * bEnv(t, 8));
  const f = pg.word === '✦' ? 'bag' : pg.wf;
  const size = pg.word === '✦' ? 420 : f === 'fra' ? 300 : f === 'bag' ? 330 : 340;
  const col = p.dark ? '#FFFFFF' : p.ink;
  g.save(); g.translate(CX, 470); g.rotate((rnd(pg.seed, 3) - 0.5) * 0.16); g.scale(s, s);
  if (pg.word === '✦') star4(0, 0, 220, p.acc2 || p.acc, t);
  else text(pg.word, 0, 0, { size, f, w: 800, color: col });
  g.restore();
}

/* ---------------- covers (title on the front, credits on the back) ---------------- */
function coverBg(p, pg, t) {
  const gr = g.createRadialGradient(CX, 420, 100, CX, 540, 1200); gr.addColorStop(0, p.top); gr.addColorStop(1, p.bot);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // cloth weave
  g.globalAlpha = 0.05; g.fillStyle = '#FFFFFF';
  for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 1);
  g.globalAlpha = 1;
  const front = pg.cover === 'front', t0 = front ? 0 : pg.t;
  const local = t - t0;
  // gold frame drawn in
  const pf = Ease.inOutCubic(pr(local, front ? 0.3 : 0.3, front ? 2.6 : 1.6));
  g.strokeStyle = p.acc; g.lineWidth = 5;
  const m = 70, fr = [[m, m], [W - m, m], [W - m, H - m], [m, H - m], [m, m]];
  polyPartial(fr, pf);
  g.lineWidth = 2; const m2 = 92; polyPartial([[W - m2, H - m2], [m2, H - m2], [m2, m2], [W - m2, m2], [W - m2, H - m2]], pf);
  for (const [x, y] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) { const ps = Ease.outBack(pr(local, 2.3, 2.7), 2); if (ps > 0) star4(x, y, 26 * ps, p.acc, 0); }
  // floating gold dust
  for (let i = 0; i < 50; i++) {
    const x = rnd(i, 41) * W, y = fract(rnd(i, 42) - t * (0.01 + rnd(i, 43) * 0.02)) * H;
    g.globalAlpha = (0.2 + 0.5 * rnd(i, 44)) * (0.6 + 0.4 * bEnv(t, 4)) * pr(local, 0, 2);
    circle(x, y, 1.5 + rnd(i, 45) * 2.5, p.acc);
  }
  g.globalAlpha = 1;
  if (front) coverTitle(p, t, 0);
  else backCover(p, t, pg.t);
}
// 페이지를 (glyphs flip in, one per beat) / 넘기고 (serif) / 있어 (neon)
function coverTitle(p, t, fade) {
  const bts = beatsIn(1.5, 20);
  const word = '페이지를';
  setFont(250, 400, -2.5, 'ant');
  const L = layout(word), x0 = CX - L.w / 2, y = 500;
  for (let k = 0; k < word.length; k++) {
    const tk = bts[k * 2], d = t - tk;
    if (d < 0) continue;
    const e = Ease.outBack(pr(d, 0, 0.36), 1.5);
    const sx = Math.max(0.001, Math.cos((1 - e) * Math.PI * 0.5));
    g.save(); g.translate(x0 + L.xs[k] + L.ws[k] / 2, y); g.scale(sx, 1 + 0.02 * bEnv(t, 8)); g.translate(-L.ws[k] / 2, 0);
    glyph(word[k], 'ant', 250, 400, { col: '#FFE9B0', ext: { n: 8, dx: 1.6, dy: 2, col: '#7A5A1A' }, glow: p.glow, blur: 12 + 20 * bEnv(t, 6) });
    if (1 - e > 0.02) { g.globalAlpha *= (1 - e) * 0.6; glyph(word[k], 'ant', 250, 400, { col: '#000' }); }
    g.restore();
  }
  // 넘기고 in serif, then 있어 in neon tubes
  const tA = bts[8] || 6.0, tB = bts[10] || 7.1;
  if (t > tA - 0.05) {
    const e = Ease.outCubic(pr(t, tA - 0.05, tA + 0.4));
    g.save(); g.globalAlpha = e; text('넘기고', CX - 190, 690 + (1 - e) * 30, { size: 130, f: 'fra', w: 800, color: '#FFE9B0' }); g.restore();
  }
  if (t > tB - 0.02) {
    const d = t - tB;
    const on = d > 0.5 ? 1 : rnd(Math.floor(d * 30), 9) > 0.4 ? 1 : 0.2;
    g.save(); g.globalAlpha = on;
    setFont(170, 300, 0, 'mon'); const w = layout('있어').w;
    g.translate(CX + 210 - w / 2, 750);
    glyphRunStr('있어', 'mon', 170, { col: '#FFFFFF', neon: p.acc2, blur: 26 + 30 * bEnv(t, 6) });
    g.restore();
  }
  // credits
  const pc = Ease.outCubic(pr(t, 8.6, 9.6));
  if (pc > 0) {
    g.save(); g.globalAlpha = pc;
    text('Turning the Page · 한국어', CX, 862, { size: 34, f: 'fra', w: 500, color: '#FFE9B0' });
    g.globalAlpha = pc * 0.75;
    text('노래 아울러 · made with Suno', CX, 918, { size: 26, w: 600, color: '#FFE9B0' });
    g.restore();
  }
}
function glyphRunStr(s, f, size, look) {
  setFont(size, f === 'mon' ? 300 : 400, 0, f); const L = layout(s);
  for (let k = 0; k < s.length; k++) { g.save(); g.translate(L.xs[k], 0); glyph(s[k], f, size, 400, look); g.restore(); }
}
function backCover(p, t, t0) {
  const local = t - t0;
  // the title rebuilt, then a line back to the song and the credits
  const words = [['페이지를', 'ant', 200, 360], ['넘기고', 'fra', 120, 520], ['있어', 'mon', 150, 690]];
  words.forEach(([w, f, size, y], k) => {
    const tb = t0 + 0.9 + k * SPB * 2, p0 = pr(t, tb, tb + 0.4);
    if (p0 <= 0) return;
    g.save(); g.globalAlpha = Math.min(1, p0 * 3); const s = lerp(1.6, 1, Ease.outExpo(p0)); g.translate(CX, y); g.scale(s, s);
    if (f === 'mon') { setFont(size, 300, 0, f); const ww = layout(w).w; g.translate(-ww / 2, size * 0.36); glyphRunStr(w, f, size, { col: '#FFFFFF', neon: p.acc2, blur: 26 + 26 * bEnv(t, 6) }); }
    else text(w, 0, 0, { size, f, w: 800, color: '#FFE9B0' });
    g.restore();
  });
  const pc = Ease.outCubic(pr(local, 4.6, 5.6));
  if (pc > 0) {
    g.save(); g.globalAlpha = pc;
    text('봐, 여기까지 온 너를 바라봐', CX, 810, { size: 54, f: 'fra', w: 700, color: p.acc });
    g.globalAlpha = pc * 0.8;
    text('노래 아울러 · made with Suno  ·  한글 키네틱 가사', CX, 878, { size: 26, w: 600, color: '#FFE9B0' });
    g.restore();
  }
}

/* ---------------- page turn (the corner lifts and sweeps across) ---------------- */
function clipHalf(poly, ux, uy, ox, oy, s, keepGreater) {
  const out = [], d = (P) => (P[0] - ox) * ux + (P[1] - oy) * uy - s;
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length], da = d(A), db = d(B);
    const inA = keepGreater ? da >= 0 : da <= 0, inB = keepGreater ? db >= 0 : db <= 0;
    if (inA) out.push(A);
    if (inA !== inB) { const f = da / (da - db); out.push([lerp(A[0], B[0], f), lerp(A[1], B[1], f)]); }
  }
  return out;
}
function pathPoly(pts) { g.beginPath(); pts.forEach((P, i) => (i ? g.lineTo(P[0], P[1]) : g.moveTo(P[0], P[1]))); g.closePath(); }
function drawBook(t) {
  const i = pageIndex(t), cur = PAGES[i];
  const p = (t - cur.t) / cur.dur;
  if (i === 0 || p >= 1) { drawPage(cur, t); return; }
  const prev = PAGES[i - 1];
  drawPage(cur, t);
  // fold line sweeps from the bottom-right corner toward the upper left
  const ux = -0.955, uy = -0.297, ox = W, oy = H;
  const span = W * 0.955 + H * 0.297;
  const s = lerp(-30, span * 1.08, Ease.inOutCubic(clamp(p)));
  const rect = [[0, 0], [W, 0], [W, H], [0, H]];
  // shadow on the new page along the fold
  g.save();
  const fx = ox + ux * s, fy = oy + uy * s;
  const sg = g.createLinearGradient(fx, fy, fx - ux * 160, fy - uy * 160);
  sg.addColorStop(0, 'rgba(0,0,0,0.4)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.fillRect(0, 0, W, H);
  g.restore();
  // the old page, still flat
  const keep = clipHalf(rect, ux, uy, ox, oy, s, true);
  if (keep.length > 2) { g.save(); pathPoly(keep); g.clip(); drawPage(prev, t); g.restore(); }
  // the flap: the turned part reflected over the fold
  const turned = clipHalf(rect, ux, uy, ox, oy, s, false);
  if (turned.length > 2) {
    const refl = turned.map(([x, y]) => { const d = (x - ox) * ux + (y - oy) * uy - s; return [x - 2 * d * ux, y - 2 * d * uy]; });
    const P = PAL[prev.key];
    const back = P.dark ? mixHex(P.top || P.bg, '#FFFFFF', 0.12) : mixHex(P.bg, '#FFFFFF', 0.4);
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 40; g.shadowOffsetX = -12; g.shadowOffsetY = -6;
    pathPoly(refl); g.fillStyle = back; g.fill();
    g.shadowColor = 'transparent';
    const lg = g.createLinearGradient(fx, fy, fx + ux * Math.max(60, s), fy + uy * Math.max(60, s));
    lg.addColorStop(0, 'rgba(0,0,0,0.28)'); lg.addColorStop(0.25, 'rgba(255,255,255,0.18)'); lg.addColorStop(1, 'rgba(0,0,0,0.05)');
    pathPoly(refl); g.fillStyle = lg; g.fill();
    g.restore();
  }
}

/* ---------------- ambient + overlays ---------------- */
function ambient(t) {
  const pal = paletteAt(t);
  // drifting dust / sparkles
  const n = pal.dark ? 46 : 26;
  for (let i = 0; i < n; i++) {
    const x = fract(rnd(i, 61) + t * 0.006 * (rnd(i, 62) - 0.5)) * W, y = fract(rnd(i, 63) - t * (0.012 + rnd(i, 64) * 0.02)) * H;
    const a = (0.25 + 0.5 * rnd(i, 65)) * (0.5 + 0.5 * bEnv(t + rnd(i, 66) * 0.2, 5));
    g.globalAlpha = a * (pal.dark ? 0.8 : 0.35);
    if (i % 5 === 0) star4(x, y, 7 + rnd(i, 67) * 8, pal.dark ? '#FFFFFF' : pal.acc, t + i);
    else circle(x, y, 1.5 + rnd(i, 68) * 2.5, pal.dark ? '#FFFFFF' : pal.ink);
  }
  g.globalAlpha = 1;
}
function overlays(t) {
  const pal = paletteAt(t);
  // light leaks on the dark pages, breathing with the music
  if (pal.dark) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const x = CX + Math.sin(t * 0.21 + i * 2.1) * 760, y = 300 + Math.cos(t * 0.17 + i * 1.3) * 300;
      const r = 520 + 120 * Math.sin(t * 0.3 + i);
      const lg = g.createRadialGradient(x, y, 0, x, y, r);
      lg.addColorStop(0, hexA([pal.acc, pal.acc2, pal.glow || pal.acc][i], 0.09 + 0.08 * energy(t)));
      lg.addColorStop(1, hexA(pal.acc, 0));
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
    }
    g.restore();
  }
  // vignette
  const vg = g.createRadialGradient(CX, CY, 500, CX, CY, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, pal.dark ? 'rgba(0,0,0,0.45)' : 'rgba(40,30,20,0.18)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

/* ---------------- camera for the lyrics ---------------- */
function inChorus(t) { return (t > 39.0 && t < 57.6) || (t > 83.3 && t < 101.9) || (t > 121.0 && t < 156.9); }
function camera(t) {
  let z = 1, r = 0;
  if (inChorus(t)) { z += 0.03 * dEnv(t, 5) + 0.01 * bEnv(t, 9); }
  if (t > 121.0 && t < 156.9) r = Math.sin(beatAt(t) * Math.PI / 4) * 0.012;
  g.translate(CX, 470); g.rotate(r); g.scale(z, z); g.translate(-CX, -470);
}

/* ---------------- sections (scrubber marks) ---------------- */
const SECTS = [
  { t: 0, name: '인트로' }, { t: 14.2, name: '1절' }, { t: 30.7, name: '프리코러스' }, { t: 39.1, name: '후렴' },
  { t: 58.2, name: '2절' }, { t: 75.0, name: '프리코러스' }, { t: 83.4, name: '후렴' },
  { t: 102.6, name: '브리지' }, { t: 121.1, name: '마지막 후렴' }, { t: 159.3, name: '아웃트로' }, { t: 167.3, name: '엔딩' }, { t: DUR, name: 'END', kind: 'end' },
];
async function loadImages() {}

/* ---------------- frame ---------------- */
function drawFrame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0;
  drawBook(t);
  ambient(t);
  g.save(); camera(t); drawLyrics(t); g.restore();
  overlays(t);
  // white pop as the last chorus lands, fade to black at the very end
  let flash = 0.55 * Math.exp(-Math.max(0, t - 120.75) * 5) * (t >= 120.75 ? 1 : 0);
  flash += 0.25 * Math.exp(-Math.max(0, t - 38.75) * 6) * (t >= 38.75 ? 1 : 0) + 0.25 * Math.exp(-Math.max(0, t - 83.05) * 6) * (t >= 83.05 ? 1 : 0);
  const black = pr(t, DUR - 2.4, DUR - 0.3);
  if (black > 0) { g.fillStyle = `rgba(0,0,0,${black})`; g.fillRect(0, 0, W, H); }
  return { flash };
}
