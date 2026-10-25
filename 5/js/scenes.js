'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   No karaoke strip: each lyric line becomes its own piece of kinetic
   type, placed top / middle / bottom and given one of eight styles
   (collage, underline, highlighter, washing line, fly-through,
   resize, stack, typewriter) plus one of five exits. The choice is
   random but seeded, so every playback and the MP4 look the same.
   Words land on the syllable times in lyrics.js; everything else
   (background flips, shapes, shakes) is cued from the beat grid.
   ============================================================ */
let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };

/* ---------------- beat grid ---------------- */
const beatT = (k) => BEAT0 + k * SPB;
const beatF = (t) => (t - BEAT0) / SPB;
const beatIdx = (t) => Math.floor(beatF(t));
// decaying envelope after the last beat whose drum strength passes `min`
function drumEnv(arr, t, k = 9, min = 0.35) {
  for (let i = beatIdx(t), n = 0; i >= 0 && n < 3; i--, n++) {
    const v = arr[i] || 0;
    if (v >= min) return Math.min(1, v) * Math.exp(-(t - beatT(i)) * k);
  }
  return 0;
}
const kickEnv = (t, k) => drumEnv(KICK, t, k, 0.5);
const snareEnv = (t, k) => drumEnv(SNARE, t, k, 0.5);

/* ---------------- colour schemes ---------------- */
// bg, ink, sub (quiet details), hl (highlighter) + hlInk (text on it), ul (pen: underline, circle, stamp), a3 (shapes);
// mul: paper-like, so the highlighter multiplies like real ink
const SCH = {
  paper: { bg: '#F2ECE0', ink: '#15120F', sub: 'rgba(21,18,15,0.32)', hl: '#FFE14D', hlInk: '#15120F', ul: '#FF3B2F', a3: '#2D5BFF', dark: false, mul: true },
  cool:  { bg: '#E6EDF8', ink: '#0F1A3A', sub: 'rgba(15,26,58,0.32)', hl: '#B8FF3D', hlInk: '#0F1A3A', ul: '#2D5BFF', a3: '#FF4FA3', dark: false, mul: true },
  navy:  { bg: '#101736', ink: '#F6F1E6', sub: 'rgba(246,241,230,0.3)', hl: '#FF4FA3', hlInk: '#FFFFFF', ul: '#3EE6C9', a3: '#FFE14D', dark: true },
  red:   { bg: '#FF3B2F', ink: '#FFF8EE', sub: 'rgba(255,248,238,0.4)', hl: '#FFE14D', hlInk: '#15120F', ul: '#15120F', a3: '#FFE14D', dark: false },
  black: { bg: '#0B0A09', ink: '#FFF8EE', sub: 'rgba(255,248,238,0.3)', hl: '#FFE14D', hlInk: '#0B0A09', ul: '#FF3B2F', a3: '#3EE6C9', dark: true },
  yellow:{ bg: '#FFE14D', ink: '#15120F', sub: 'rgba(21,18,15,0.32)', hl: '#FF3B2F', hlInk: '#FFF8EE', ul: '#2D5BFF', a3: '#FF3B2F', dark: false },
  blue:  { bg: '#2D5BFF', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.35)', hl: '#FFE14D', hlInk: '#15120F', ul: '#FFE14D', a3: '#FF4FA3', dark: false },
  dusk:  { bg: '#22122E', ink: '#FFEEDB', sub: 'rgba(255,238,219,0.3)', hl: '#FF8A3D', hlInk: '#22122E', ul: '#FFE14D', a3: '#FF4FA3', dark: true },
};
const CHORUS_CYCLE = ['red', 'black', 'yellow', 'blue'];

/* ---------------- song sections ---------------- */
const LF = (i) => LYRICS[i].words[0].t;               // first sung word of line i
const SECTS = [
  { t: 0, name: 'VERSE 1', sch: 'paper' },
  { t: LF(8), name: 'PRE-CHORUS', sch: 'navy' },
  { t: LF(12), name: 'CHORUS', sch: 'cycle' },
  { t: LF(16), name: 'VERSE 2', sch: 'cool' },
  { t: LF(24), name: 'PRE-CHORUS', sch: 'navy' },
  { t: LF(28), name: 'CHORUS', sch: 'cycle' },
  { t: LF(32), name: 'BRIDGE', sch: 'dusk' },
  { t: 125.35, name: 'BREAK', sch: 'black' },
  { t: LF(38), name: 'FINAL CHORUS', sch: 'cycle' },
  { t: 155.1, name: 'OUTRO', sch: 'paper' },
];
const sectAt = (t) => { let s = SECTS[0]; for (const x of SECTS) if (t >= x.t) s = x; return s; };
const FINAL_FAST = LF(42);                            // last two lines flip every two beats

// background changes: one per section, one per bar (or half bar) in the choruses
const TRANS = (() => {
  const out = [];
  SECTS.forEach((s, k) => {
    const end = k + 1 < SECTS.length ? SECTS[k + 1].t : DUR;
    if (s.sch !== 'cycle') { out.push({ t: s.t, sch: s.sch }); return; }
    let n = 0;
    out.push({ t: s.t, sch: CHORUS_CYCLE[n++ % 4] });
    for (let b = Math.ceil(beatF(s.t + 0.5)); beatT(b) < end - 0.3; b++) {
      const step = beatT(b) >= FINAL_FAST ? 2 : 4;
      if (b % step === 0) out.push({ t: beatT(b), sch: CHORUS_CYCLE[n++ % 4] });
    }
  });
  out.forEach((x, k) => { x.ox = 200 + rnd(k, 3) * 1520; x.oy = 150 + rnd(k, 4) * 780; });
  return out;
})();
function schemeAt(t) {
  let k = 0;
  for (let i = 0; i < TRANS.length; i++) if (TRANS[i].t <= t) k = i;
  const tr = TRANS[k];
  return { cur: SCH[tr.sch], prev: k > 0 ? SCH[TRANS[k - 1].sch] : SCH[tr.sch], p: pr(t, tr.t, tr.t + 0.26), tr };
}

/* ---------------- words: keywords, date stamps ---------------- */
const KEYS = ['하이닉스', 'FOMC', '삼성', '마이크로소프트', '알파벳', '아마존', '앤트로픽', 'A.I.', 'AI의', '실적의', '계절', '숫자', '이십팔일', '이십구일', '삼십일', '십일월', '이십육일', '로드쇼', '도비쉬한', '유가가', '연준의', '메모리', '하이퍼스케일러들의', '피크', '상장을', '결정', '전망', '신호도', '흐름', '불안의', '약속을', '논란', '시험대에', '중간선거가', '물결', '내일을', '선명해'];
const isKey = (w) => KEYS.some((k) => w.includes(k));
const STAMPS = { 이십팔일: '10.28', 이십구일: '10.29', 삼십일: '10.30', 시월의: 'OCT', 십일월: 'NOV', 이십육일: '11.26', FOMC의: 'FED', 'A.I.': 'AI?' };
const clean = (w) => (w === 'A.I.' ? w : w.replace(/[,.]+$/, ''));

/* ---------------- per-line plan (seeded) ---------------- */
const STYLES = ['block', 'underline', 'marker', 'clothes', 'zoom', 'resize', 'stack', 'type'];
const FORCE = {
  0: { style: 'type', zone: 'mid', align: 'left' },
  2: { style: 'stack', align: 'left' },
  4: { style: 'zoom' },
  12: { style: 'stack', align: 'center', exit: 'zoom' },
  13: { style: 'clothes' },
  17: { style: 'resize', zone: 'mid' },
  20: { style: 'block', zone: 'mid' },
  28: { style: 'block', zone: 'mid' },
  38: { style: 'stack', align: 'center', exit: 'zoom' },
  42: { style: 'zoom' },
  43: { style: 'resize', zone: 'mid', exit: 'zoom' },
};
const PLAN = (() => {
  const R = mulberry32(5150);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const out = [];
  let prevStyle = '', prev2 = '', prevZone = '';
  LYRICS.forEach((L, i) => {
    const f = FORCE[i] || {};
    const nw = L.words.length;
    let style = f.style;
    for (let tries = 0; !style && tries < 50; tries++) {
      const s = pick(STYLES);
      if (s === prevStyle || s === prev2) continue;
      if (s === 'stack' && nw > 5) continue;
      if (s === 'clothes' && nw > 6) continue;
      style = s;
    }
    const zones = style === 'stack' || style === 'zoom' || style === 'resize' ? ['mid'] : style === 'clothes' ? ['top', 'mid'] : ['top', 'mid', 'bot'];
    let zone = f.zone || pick(zones);
    if (!f.zone && zone === prevZone && zones.length > 1) zone = zones[(zones.indexOf(zone) + 1) % zones.length];
    const align = f.align || pick(['left', 'center', 'right', 'center']);
    const exit = f.exit || (style === 'zoom' ? 'zoom' : style === 'clothes' ? pick(['drop', 'zoom']) : pick(['zoom', 'zoom', 'zoom', 'drop', 'wipe', 'shrink', 'scatter']));
    const next = i + 1 < LYRICS.length ? LF(i + 1) : 155.0;
    const last = L.words[nw - 1].e;
    const brk = SECTS.find((s) => s.t > last && s.t < next && s.name === 'BREAK');
    const tOut = brk ? brk.t : next - last > 4 ? last + 2.4 : next - 0.1;
    out.push({ style, zone, align, exit, seed: 1000 + i * 37, tIn: L.words[0].t, tOut });
    prev2 = prevStyle; prevStyle = style; prevZone = zone;
  });
  return out;
})();
const ZONE_Y = { top: 255, mid: 540, bot: 820 };
const EXIT_DUR = 0.42;

/* ---------------- layouts (measured once per line) ---------------- */
let LAYOUTS = new Map();
function measure(s, size, f) { return textW(s, size, 900, null, f); }
function rows(items, maxW, gapOf) {
  const out = [[]];
  let w = 0;
  for (const it of items) {
    const add = (out[out.length - 1].length ? gapOf(it) : 0) + it.w;
    if (out[out.length - 1].length && w + add > maxW) { out.push([]); w = 0; }
    w += out[out.length - 1].length ? gapOf(it) + it.w : it.w;
    out[out.length - 1].push(it);
  }
  return out;
}
function placeRows(rs, plan, gapOf, lead = 1.02) {
  const heights = rs.map((r) => Math.max(...r.map((it) => it.size)) * lead);
  const total = heights.reduce((a, b) => a + b, 0);
  let cy = clamp(ZONE_Y[plan.zone], 110 + total / 2, 975 - total / 2) - total / 2;
  rs.forEach((r, k) => {
    const rw = r.reduce((a, it, j) => a + it.w + (j ? gapOf(it) : 0), 0);
    let x = plan.align === 'left' ? 150 : plan.align === 'right' ? W - 150 - rw : CX - rw / 2;
    const yc = cy + heights[k] / 2;
    r.forEach((it, j) => { if (j) x += gapOf(it); it.cx = x + it.w / 2; it.cy = yc; it.row = k; x += it.w; });
    cy += heights[k];
  });
  return { top: cy - total, bottom: cy };
}
function getLayout(i) {
  let L = LAYOUTS.get(i);
  if (L) return L;
  const line = LYRICS[i], plan = PLAN[i], R = mulberry32(plan.seed);
  const items = line.words.map((w, k) => ({ k, s: clean(w.w), key: isKey(w.w), stamp: STAMPS[clean(w.w)] || STAMPS[w.w] }));
  const st = plan.style;
  if (st === 'block') {
    const fonts = ['disp', 'serif', 'sans', 'disp'];
    for (const it of items) {
      it.f = fonts[Math.floor(R() * fonts.length)];
      it.size = (it.key ? 205 : 150) * lerp(0.78, 1.18, R());
      it.box = !it.key && R() < 0.22;
      it.rot = (R() - 0.5) * 0.09;
      it.w = measure(it.s, it.size, it.f);
      if (it.w > 1500) { it.size *= 1500 / it.w; it.w = 1500; }
    }
    const gap = (it) => it.size * 0.24;
    placeRows(rows(items, 1560, gap), plan, gap, 1.04);
  } else if (st === 'underline' || st === 'marker' || st === 'type') {
    const f = st === 'marker' ? 'serif' : st === 'type' ? 'sans' : R() < 0.5 ? 'disp' : 'sans';
    let size = st === 'type' ? 112 : 132, rs;
    const gap = (it) => it.size * 0.3;
    for (let n = 0; n < 8; n++) {
      for (const it of items) { it.f = f; it.size = size; it.w = measure(it.s, size, f); }
      rs = rows(items, 1600, gap);
      if (rs.length <= 2) break;
      size *= 0.9;
    }
    placeRows(rs, plan, gap, st === 'type' ? 1.3 : 1.5);
  } else if (st === 'clothes') {
    let size = 100;
    const f = R() < 0.5 ? 'disp' : 'sans';
    const cards = ['#FFFFFF', C.yellow, C.pink, C.mint, '#FFFFFF', C.lime, C.orange];
    const gap = 46;
    let total = 0;
    for (let n = 0; n < 8; n++) {
      total = 0;
      for (const it of items) { it.f = f; it.size = size; it.w = measure(it.s, size, f); it.cw = it.w + size * 0.6; total += it.cw; }
      total += gap * (items.length - 1);
      if (total <= 1760) break;
      size *= 0.9;
    }
    let x = CX - total / 2;
    items.forEach((it, k) => { it.px = x + it.cw / 2; x += it.cw + gap; it.card = cards[Math.floor(R() * cards.length)]; it.rot = (R() - 0.5) * 0.12; it.ch = size * 1.32; });
    L = { ropeY: plan.zone === 'top' ? 150 : 330, sag: 110 };
  } else if (st === 'zoom') {
    for (const it of items) {
      it.f = R() < 0.6 ? 'disp' : 'serif';
      const w100 = measure(it.s, 100, it.f);
      it.size = Math.min(it.key ? 300 : 250, (1500 / w100) * 100);
      it.w = measure(it.s, it.size, it.f);
      it.cx = CX + (R() - 0.5) * 380; it.cy = CY + (R() - 0.5) * 220;
      it.rot = (R() - 0.5) * 0.12;
    }
  } else if (st === 'resize') {
    const f = R() < 0.5 ? 'disp' : 'sans';
    for (const it of items) { it.f = f; it.w100 = measure(it.s, 100, f); }
  } else if (st === 'stack') {
    const f = R() < 0.65 ? 'disp' : 'serif';
    const target = plan.align === 'center' ? 1300 : 980;
    for (const it of items) { it.f = f; const w100 = measure(it.s, 100, f); it.size = clamp((target / w100) * 100, 96, 330); it.w = (w100 * it.size) / 100; }
    let total = items.reduce((a, it) => a + it.size * 0.96, 0);
    if (total > 780) { const k = 780 / total; for (const it of items) { it.size *= k; it.w *= k; } total = 780; }
    let y = CY + 20 - total / 2;
    for (const it of items) {
      const h = it.size * 0.96;
      it.cy = y + h / 2; y += h;
      it.cx = plan.align === 'left' ? 150 + it.w / 2 : plan.align === 'right' ? W - 150 - it.w / 2 : CX;
      it.box = it.key && R() < 0.5;
    }
  }
  L = Object.assign(L || {}, { items });
  // bounding box (for exits)
  const xs = items.filter((it) => it.cx != null);
  if (xs.length) {
    L.x0 = Math.min(...xs.map((it) => it.cx - it.w / 2)); L.x1 = Math.max(...xs.map((it) => it.cx + it.w / 2));
    L.y0 = Math.min(...xs.map((it) => it.cy - it.size / 2)); L.y1 = Math.max(...xs.map((it) => it.cy + it.size / 2));
  } else { L.x0 = 0; L.x1 = W; L.y0 = 0; L.y1 = H; }
  LAYOUTS.set(i, L);
  return L;
}

/* ---------------- drawing primitives ---------------- */
function word(s, x, y, size, f, col, a = 1) {
  setFont(size, 900, null, f);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const a0 = g.globalAlpha; g.globalAlpha = a0 * a;
  g.fillStyle = col; g.fillText(s, x, y);
  g.globalAlpha = a0;
}
// highlighter swipe behind a word box; p = 0..1 sweep
function marker(x0, x1, cy, size, col, p, seed, mul) {
  if (p <= 0) return;
  const pad = size * 0.14, h = size * 0.74, y = cy - h * 0.5 + size * 0.04;
  const xa = x0 - pad, xb = lerp(xa, x1 + pad, Ease.outCubic(p));
  g.save();
  if (mul) g.globalCompositeOperation = 'multiply';
  g.fillStyle = col;
  g.beginPath();
  const j = (k) => vnoise(k * 1.7, seed) * size * 0.05;
  g.moveTo(xa + j(1), y + j(2)); g.lineTo(xb + j(3), y + j(4) - size * 0.03);
  g.lineTo(xb + j(5), y + h + j(6) - size * 0.03); g.lineTo(xa + j(7), y + h + j(8));
  g.closePath(); g.fill();
  g.restore();
}
// hand-drawn underline from x0 towards x1, p = 0..1
function penLine(x0, x1, y, lw, col, p, seed) {
  if (p <= 0) return;
  const n = 18, pts = [];
  for (let k = 0; k <= n; k++) { const f = k / n; pts.push([lerp(x0, x1, f), y + vnoise(f * 5, seed) * lw * 0.6 + f * lw * 0.4]); }
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  polyPartial(pts, p);
  g.lineCap = 'butt'; g.lineJoin = 'miter';
}
// hand-drawn loop around a word
function penCircle(cx, cy, rx, ry, lw, col, p, seed) {
  if (p <= 0) return;
  const n = 48, pts = [], a0 = -2.6 + rnd(seed) * 0.6;
  for (let k = 0; k <= n; k++) {
    const f = k / n, a = a0 + f * TAU * 1.08, wob = 1 + vnoise(f * 6, seed) * 0.06 + f * 0.05;
    pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
  }
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  polyPartial(pts, p);
  g.lineCap = 'butt'; g.lineJoin = 'miter';
}
// rubber stamp (date badge)
function stamp(s, x, y, size, col, t0, t, rot = -0.14) {
  const p = pr(t, t0, t0 + 0.16);
  if (p <= 0) return;
  const sc = lerp(2.4, 1, Ease.outExpo(p));
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
  g.globalAlpha *= Math.min(1, p * 3);
  setFont(size, 400, size * 0.02, 'num');
  const w = layout(s).w, pw = w + size * 0.6, ph = size * 1.25;
  g.strokeStyle = col; g.lineWidth = size * 0.09;
  rr(-pw / 2, -ph / 2, pw, ph, size * 0.18); g.stroke();
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, size * 0.04);
  g.restore();
}
// sparkle / shapes on the snare
function shape(kind, x, y, s, col, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.strokeStyle = col;
  if (kind === 0) { // four-point sparkle
    g.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, r = k % 2 ? s * 0.18 : s * 0.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
  } else if (kind === 1) { g.lineWidth = s * 0.12; g.beginPath(); g.arc(0, 0, s * 0.4, 0, TAU); g.stroke(); }
  else if (kind === 2) { g.fillRect(-s / 2, -s * 0.1, s, s * 0.2); g.fillRect(-s * 0.1, -s / 2, s * 0.2, s); }
  else if (kind === 3) { g.beginPath(); g.moveTo(0, -s * 0.5); g.lineTo(s * 0.45, s * 0.35); g.lineTo(-s * 0.45, s * 0.35); g.closePath(); g.fill(); }
  else { g.lineWidth = s * 0.1; g.lineJoin = 'round'; g.beginPath(); for (let k = 0; k <= 4; k++) g.lineTo(-s / 2 + (k * s) / 4, k % 2 ? s * 0.2 : -s * 0.2); g.stroke(); }
  g.restore();
}

/* ---------------- exits ---------------- */
// per-word transform for the line's exit (null while not leaving, or for whole-line exits)
function exitFx(plan, L, it, n, t) {
  const q = pr(t, plan.tOut, plan.tOut + EXIT_DUR);
  if (q <= 0) return null;
  const k = it.k;
  switch (plan.exit) {
    case 'drop': {
      const d = pr(t, plan.tOut + k * 0.035, plan.tOut + k * 0.035 + EXIT_DUR);
      return { dx: (rnd(k, 7) - 0.5) * 200 * d, dy: 1500 * d * d - 120 * Math.sin(d * Math.PI), r: (rnd(k, 8) - 0.5) * 2.4 * d, s: 1, a: 1 - pr(d, 0.7, 1) };
    }
    case 'shrink': {
      const d = pr(t, plan.tOut + (n - 1 - k) * 0.03, plan.tOut + (n - 1 - k) * 0.03 + EXIT_DUR * 0.7);
      return { dx: 0, dy: 0, r: d * 0.6, s: 1 - Ease.inQuad(d) * (1 + 0.3), a: 1 };
    }
    case 'scatter': {
      const a = rnd(k, 9) * TAU, d = Ease.outCubic(q);
      return { dx: Math.cos(a) * 900 * d, dy: Math.sin(a) * 600 * d, r: (rnd(k, 10) - 0.5) * 3 * d, s: 1 + d * 0.8, a: 1 - q };
    }
    default: return null; // zoom and wipe act on the whole line (exitBegin)
  }
}
// whole-line transform (zoom toward the viewer / wipe); returns false when fully gone
function exitBegin(plan, L, t, sch) {
  const q = pr(t, plan.tOut, plan.tOut + EXIT_DUR);
  if (q >= 1) return false;
  g.save();
  if (q > 0 && plan.exit === 'zoom') {
    const px = (L.x0 + L.x1) / 2, py = (L.y0 + L.y1) / 2;
    const s = Math.exp(Ease.inQuad(q) * 2.4);
    g.translate(px, py); g.scale(s, s); g.translate(-px, -py);
    g.globalAlpha *= 1 - Ease.inQuad(q);
  } else if (q > 0 && plan.exit === 'wipe') {
    const e = Ease.inOutCubic(q), x = lerp(L.x0 - 80, L.x1 + 80, e);
    g.beginPath(); g.rect(x, -100, W + 200, H + 200); g.clip();
    g.fillStyle = sch.ul; g.fillRect(x, L.y0 - 30, 26, L.y1 - L.y0 + 60);
  }
  return true;
}

/* ---------------- line renderers ---------------- */
const inA = (t, w, d = 0.14) => pr(t, w.t - 0.02, w.t - 0.02 + d);   // word entrance progress

function drawItem(it, t, fx, ex, col, a = 1) {
  const dx = (fx.dx || 0) + (ex ? ex.dx : 0), dy = (fx.dy || 0) + (ex ? ex.dy : 0);
  const s = (fx.s != null ? fx.s : 1) * (ex ? ex.s : 1), r = (fx.r || 0) + (ex ? ex.r : 0);
  const al = a * (fx.a != null ? fx.a : 1) * (ex ? ex.a : 1);
  if (s <= 0.001 || al <= 0.001) return;
  g.save(); g.translate(it.cx + dx, it.cy + dy); g.rotate(r); g.scale(s, s);
  if (fx.box) {
    const pw = it.w + it.size * 0.36, ph = it.size * 1.08;
    g.globalAlpha *= al; g.fillStyle = fx.box; g.fillRect(-pw / 2, -ph / 2, pw, ph); g.globalAlpha /= al;
  }
  word(it.s, 0, 0, it.size, it.f, col, al);
  g.restore();
}

function drawBlock(i, L, plan, t, sch) {
  const W_ = LYRICS[i].words, n = W_.length;
  // highlighter behind keywords, swept on the eighth after the word lands
  for (const it of L.items) {
    if (!it.key || it.box) continue;
    const w = W_[it.k], ex = exitFx(plan, L, it, n, t);
    if (ex) continue;
    const p = pr(t, w.t + SPB * 0.5, w.t + SPB * 0.5 + 0.22);
    g.save(); g.translate(it.cx, it.cy); g.rotate(it.rot);
    marker(-it.w / 2, it.w / 2, 0, it.size, sch.hl, p, it.k + i, sch.mul);
    g.restore();
  }
  for (const it of L.items) {
    const w = W_[it.k], p = inA(t, w, 0.2);
    if (p <= 0) continue;
    const e = Ease.outBack(p, 2.4);
    const lit = it.key && t >= w.t + SPB * 0.5 + 0.2;
    const fx = { s: e, r: it.rot + (1 - p) * 0.35, a: Math.min(1, p * 4), box: it.box ? sch.ink : null };
    drawItem(it, t, fx, exitFx(plan, L, it, n, t), it.box ? sch.bg : lit ? sch.hlInk : sch.ink);
    if (it.stamp) stamp(it.stamp, it.cx + it.w * 0.42, it.cy - it.size * 0.62, it.size * 0.3, sch.ul, w.t + SPB * 0.5, t);
  }
}

function drawUnderline(i, L, plan, t, sch) {
  const W_ = LYRICS[i].words, n = W_.length, out = t >= plan.tOut;
  // one pen stroke per row, growing with the words already sung
  const byRow = {};
  for (const it of L.items) (byRow[it.row] = byRow[it.row] || []).push(it);
  if (!out) for (const r in byRow) {
    const its = byRow[r], x0 = its[0].cx - its[0].w / 2;
    let x1 = x0, pp = 0;
    for (const it of its) {
      const w = W_[it.k], p = pr(t, w.t, w.e + 0.25);
      if (p > 0) { x1 = lerp(it.cx - it.w / 2, it.cx + it.w / 2, Ease.outCubic(p)); pp = 1; }
    }
    if (pp) penLine(x0 - 10, x1 + 10, its[0].cy + its[0].size * 0.58, its[0].size * 0.085, sch.ul, 1, i * 3 + +r);
  }
  for (const it of L.items) {
    const w = W_[it.k], p = inA(t, w, 0.18);
    if (p <= 0) continue;
    const e = Ease.outCubic(p);
    drawItem(it, t, { dy: (1 - e) * it.size * 0.55, a: e }, exitFx(plan, L, it, n, t), sch.ink);
    if (it.key && !out) penCircle(it.cx, it.cy, it.w / 2 + it.size * 0.3, it.size * 0.66, it.size * 0.06, sch.ul, pr(t, w.t + SPB, w.t + SPB + 0.3), i * 11 + it.k);
    if (it.stamp) stamp(it.stamp, it.cx + it.w * 0.45, it.cy - it.size * 0.85, it.size * 0.34, sch.ul, w.t + SPB * 0.5, t);
  }
}

function drawMarker(i, L, plan, t, sch) {
  const W_ = LYRICS[i].words, n = W_.length;
  for (const it of L.items) {
    const w = W_[it.k];
    if (exitFx(plan, L, it, n, t)) continue;
    const p = pr(t, w.t, Math.max(w.e, w.t + 0.12) + 0.12);
    marker(it.cx - it.w / 2, it.cx + it.w / 2, it.cy, it.size, it.key ? sch.hl : sch.sub, p, i * 5 + it.k, sch.mul);
  }
  for (const it of L.items) {
    const w = W_[it.k], p = inA(t, w, 0.1);
    if (p <= 0) continue;
    const fx = { s: lerp(1.25, 1, Ease.outCubic(p)), a: p }, ex = exitFx(plan, L, it, n, t);
    drawItem(it, t, fx, ex, sch.ink);
    if (it.key && !ex) {
      const sw = pr(t, w.t, Math.max(w.e, w.t + 0.12) + 0.12), x0 = it.cx - it.w / 2 - it.size * 0.14;
      g.save(); g.beginPath(); g.rect(x0, 0, (it.w + it.size * 0.28) * Ease.outCubic(sw), H); g.clip();
      drawItem(it, t, fx, ex, sch.hlInk);
      g.restore();
    }
    if (it.stamp) stamp(it.stamp, it.cx + it.w * 0.45, it.cy - it.size * 0.8, it.size * 0.34, sch.ul, w.t + SPB * 0.5, t);
  }
}

function drawType(i, L, plan, t, sch) {
  const W_ = LYRICS[i].words, n = W_.length;
  let cursor = null;
  for (const it of L.items) {
    const w = W_[it.k];
    if (t < w.t - 0.02) continue;
    const ex = exitFx(plan, L, it, n, t);
    if (it.key && !ex) marker(it.cx - it.w / 2, it.cx + it.w / 2, it.cy, it.size, sch.hl, pr(t, w.e + SPB * 0.5, w.e + SPB * 0.5 + 0.2), i + it.k, sch.mul);
    g.save();
    if (ex) { g.translate(it.cx + ex.dx, it.cy + ex.dy); g.rotate(ex.r); g.scale(ex.s, ex.s); g.translate(-it.cx, -it.cy); g.globalAlpha *= ex.a; }
    const lit = it.key && t >= w.e + SPB * 0.5 + 0.2;
    const r = chars(it.s, it.cx, it.cy, { size: it.size, f: it.f, w: 900, color: lit ? sch.hlInk : sch.ink }, (c) => {
      const ct = w.ct[c] != null ? w.ct[c] : w.t;
      const p = pr(t, ct - 0.02, ct + 0.06);
      return p <= 0 ? false : { s: lerp(1.5, 1, p), a: p };
    });
    g.restore();
    let lastC = -1;
    for (let c = 0; c < it.s.length; c++) if (t >= (w.ct[c] != null ? w.ct[c] : w.t) - 0.02) lastC = c;
    if (lastC >= 0) { setFont(it.size, 900, null, it.f); const lay = layout(it.s); cursor = { x: r.x0 + lay.xs[lastC] + lay.ws[lastC] + 8, y: it.cy, h: it.size }; }
  }
  if (cursor && t < plan.tOut && fract(t / SPB) < 0.55) { g.fillStyle = sch.ul; g.fillRect(cursor.x, cursor.y - cursor.h * 0.45, cursor.h * 0.09, cursor.h * 0.9); }
}

function drawClothes(i, L, plan, t, sch) {
  const W_ = LYRICS[i].words, n = W_.length;
  const q = pr(t, plan.tOut, plan.tOut + EXIT_DUR);
  const snap = plan.exit === 'drop' && q > 0;
  const bounce = kickEnv(t, 7) * 22 + Math.sin(t * 9) * 3 * kickEnv(t, 4);
  // sag grows as each card is pegged on
  let load = 0;
  for (const w of W_) load += Ease.outCubic(pr(t, w.t, w.t + 0.3));
  const sag = L.sag + load * 12 + bounce;
  const ropeY = (x) => L.ropeY + sag * (1 - Math.pow((x - CX) / (W / 2 + 60), 2));
  // rope
  if (!snap) {
    g.strokeStyle = sch.ink; g.lineWidth = 6; g.beginPath();
    for (let x = -60; x <= W + 60; x += 40) g.lineTo(x, ropeY(x));
    g.stroke();
  } else {
    // two halves whipping down
    const d = Ease.outCubic(q);
    g.strokeStyle = sch.ink; g.lineWidth = 6;
    g.beginPath(); for (let x = -60; x <= CX; x += 40) g.lineTo(x, ropeY(x) + Math.pow((x + 60) / (CX + 60), 2) * d * 900); g.stroke();
    g.beginPath(); for (let x = CX; x <= W + 60; x += 40) g.lineTo(x, ropeY(x) + Math.pow((W + 60 - x) / (CX + 60), 2) * d * 900); g.stroke();
  }
  for (const it of L.items) {
    const w = W_[it.k], p = pr(t, w.t - 0.03, w.t + 0.22);
    if (p <= 0) continue;
    const dt = t - w.t;
    // swing: damped pendulum kicked on landing, nudged by every beat
    const sw = (dt > 0 ? 0.32 * Math.exp(-dt * 2.4) * Math.sin(dt * 7.5 + 0.4) : 0) + 0.05 * kickEnv(t, 5) * (it.k % 2 ? 1 : -1) + it.rot * 0.5;
    const px = it.px, py = ropeY(px) - (1 - Ease.outBack(p, 1.6)) * 500;
    const ex = snap ? exitFx(plan, L, it, n, t) : null;
    g.save();
    g.translate(px + (ex ? ex.dx : 0), py + (ex ? ex.dy : 0)); g.rotate(sw + (ex ? ex.r : 0));
    if (ex) g.globalAlpha *= ex.a;
    // card
    const cw = it.cw, ch = it.ch;
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(-cw / 2 + 10, 22, cw, ch);
    g.fillStyle = it.card; g.fillRect(-cw / 2, 12, cw, ch);
    // peg
    g.fillStyle = sch.ul; rr(-11, -20, 22, 52, 5); g.fill();
    word(it.s, 0, 12 + ch / 2 + it.size * 0.02, it.size, it.f, '#15120F');
    if (it.stamp) stamp(it.stamp, cw * 0.32, 12 + ch + it.size * 0.35, it.size * 0.3, sch.ul, w.t + SPB * 0.5, t, 0.1);
    g.restore();
  }
}

function drawZoom(i, L, plan, t, sch) {
  const W_ = LYRICS[i].words, n = W_.length;
  // speed lines while words fly
  const ln = 26;
  g.save(); g.strokeStyle = sch.sub; g.lineWidth = 3;
  for (let k = 0; k < ln; k++) {
    const a = (k / ln) * TAU + rnd(k, i) * 0.2, ph = fract(t * 1.6 + rnd(k, i + 1));
    const r0 = 200 + ph * 900, r1 = r0 + 60 + ph * 220;
    g.globalAlpha = 0.6 * Math.sin(ph * Math.PI);
    line(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0 * 0.6, CX + Math.cos(a) * r1, CY + Math.sin(a) * r1 * 0.6);
  }
  g.restore();
  // later words sit behind the flying earlier ones, so draw newest first
  for (let k = n - 1; k >= 0; k--) {
    const it = L.items[k], w = W_[k];
    const p = inA(t, w, 0.2);
    if (p <= 0) continue;
    const next = k + 1 < n ? W_[k + 1].t : plan.tOut;
    const f = pr(t, next - 0.04, next - 0.04 + 0.4);
    if (f >= 1) continue;
    const s = lerp(0.25, 1, Ease.outExpo(p)) * (1 + 0.04 * (t - w.t)) * Math.exp(Ease.inQuad(f) * 2.6);
    const a = Math.min(1, p * 3) * (1 - Ease.inQuad(f));
    const lit = it.key && t >= w.t + SPB * 0.5 + 0.2;
    if (lit && f <= 0) {
      g.save(); g.translate(it.cx, it.cy); g.rotate(it.rot); g.scale(s, s);
      marker(-it.w / 2, it.w / 2, 0, it.size, sch.hl, pr(t, w.t + SPB * 0.5, w.t + SPB * 0.5 + 0.2), k, sch.mul);
      g.restore();
    }
    drawItem(it, t, { s, r: it.rot, a }, null, lit ? sch.hlInk : sch.ink);
    if (it.stamp && f <= 0) stamp(it.stamp, it.cx + it.w * 0.4, it.cy - it.size * 0.6, it.size * 0.28, sch.ul, w.t + SPB * 0.5, t);
  }
}

function drawResize(i, L, plan, t, sch) {
  const W_ = LYRICS[i].words, n = W_.length;
  // the word being sung swells, the rest shrink back
  let cur = -1;
  for (let k = 0; k < n; k++) if (t >= W_[k].t - 0.02) cur = k;
  if (cur < 0) return;
  const sizes = L.items.map((it, k) => {
    if (t < W_[k].t - 0.02) return 0;
    const grow = Ease.outBack(pr(t, W_[k].t - 0.02, W_[k].t + 0.16), 2);
    const nextT = k + 1 < n ? W_[k + 1].t : plan.tOut;
    const shrink = Ease.inOutCubic(pr(t, nextT - 0.02, nextT + 0.2));
    const big = it.key ? 250 : 215, small = 82;
    return lerp(0, lerp(big, small, shrink), grow) * (1 + 0.06 * kickEnv(t, 8));
  });
  const gap = 34;
  let total = 0;
  sizes.forEach((s, k) => (total += (L.items[k].w100 * s) / 100 + (s > 0 && k ? gap : 0)));
  const sc = total > 1720 ? 1720 / total : 1;
  let x = CX - (total * sc) / 2;
  const y = CY + (plan.zone === 'top' ? -260 : plan.zone === 'bot' ? 260 : 0);
  L.x0 = CX - (total * sc) / 2; L.x1 = L.x0 + total * sc; L.y0 = y - 120; L.y1 = y + 120;
  L.items.forEach((it, k) => {
    const s = sizes[k] * sc;
    if (s <= 0.5) return;
    if (k) x += gap * sc;
    const w = (it.w100 * s) / 100;
    it.cx = x + w / 2; it.cy = y; it.size = s; it.w = w;
    const active = k === cur && t < plan.tOut;
    if (active) marker(it.cx - w / 2, it.cx + w / 2, y, s, sch.hl, pr(t, W_[k].t, W_[k].t + 0.2), k + i, sch.mul);
    drawItem(it, t, {}, exitFx(plan, L, it, n, t), active ? sch.hlInk : sch.ink);
    if (it.stamp && active) stamp(it.stamp, it.cx + w * 0.4, y - s * 0.7, 46, sch.ul, W_[k].t + SPB * 0.5, t);
    x += w;
  });
}

function drawStack(i, L, plan, t, sch) {
  const W_ = LYRICS[i].words, n = W_.length;
  for (const it of L.items) {
    const w = W_[it.k], p = inA(t, w, 0.16);
    if (p <= 0) continue;
    const e = Ease.outExpo(p);
    const fx = { s: lerp(2.3, 1, e), a: Math.min(1, p * 4), box: it.box ? sch.ul : null };
    const ex = exitFx(plan, L, it, n, t);
    if (!it.box && it.key && !ex) {
      // pen underline under keywords
      penLine(it.cx - it.w / 2, it.cx + it.w / 2, it.cy + it.size * 0.47, it.size * 0.07, sch.ul, pr(t, w.t + SPB * 0.5, w.t + SPB * 0.5 + 0.25), it.k + i);
    }
    drawItem(it, t, fx, ex, it.box ? sch.bg : sch.ink);
    if (it.stamp) stamp(it.stamp, Math.min(W - 110, it.cx + it.w / 2 + 90), it.cy - it.size * 0.15, Math.min(64, it.size * 0.3), sch.ul, w.t + SPB * 0.5, t);
  }
}

const RENDER = { block: drawBlock, underline: drawUnderline, marker: drawMarker, type: drawType, clothes: drawClothes, zoom: drawZoom, resize: drawResize, stack: drawStack };

function drawLines(t, sch) {
  for (let i = 0; i < LYRICS.length; i++) {
    const plan = PLAN[i];
    if (t < plan.tIn - 0.05 || t > plan.tOut + EXIT_DUR + 0.05) continue;
    const L = getLayout(i);
    if (!exitBegin(plan, L, t, sch)) continue;
    RENDER[plan.style](i, L, plan, t, sch);
    g.restore();
  }
}
function activeZone(t) {
  for (let i = 0; i < LYRICS.length; i++) if (t >= PLAN[i].tIn - 0.05 && t < PLAN[i].tOut) return PLAN[i].style === 'stack' || PLAN[i].style === 'zoom' ? 'all' : PLAN[i].zone;
  return 'none';
}

/* ---------------- background ---------------- */
function background(t, S) {
  const sch = S.cur;
  fillAll(S.prev.bg);
  if (S.p < 1) {
    // new colour grows out of a point on the beat
    const r = Ease.inOutCubic(S.p) * 2300;
    g.fillStyle = sch.bg; g.beginPath(); g.arc(S.tr.ox, S.tr.oy, r, 0, TAU); g.fill();
    if (S.p > 0) { g.strokeStyle = sch.a3; g.lineWidth = 26 * (1 - S.p); g.beginPath(); g.arc(S.tr.ox, S.tr.oy, r, 0, TAU); g.stroke(); }
  } else fillAll(sch.bg);
  // halftone dots that breathe on the kick
  const k = kickEnv(t, 6);
  g.fillStyle = sch.sub;
  const a0 = g.globalAlpha; g.globalAlpha = 0.18 + 0.25 * k;
  const step = 54, off = (t * 12) % step;
  for (let y = -step; y < H + step; y += step) for (let x = -step; x < W + step; x += step) {
    const dx = x + off, dy = y + ((x / step) % 2 ? step / 2 : 0);
    const d = Math.hypot(dx - CX, dy - CY) / 1100;
    const r = (1.5 + 3.5 * k) * clamp(d * 1.4);
    if (r > 0.3) { g.beginPath(); g.arc(dx, dy, r, 0, TAU); g.fill(); }
  }
  g.globalAlpha = a0;
  // giant scrolling title behind everything
  g.save(); g.globalAlpha = sch.dark ? 0.05 : 0.06;
  setFont(420, 400, -6, 'disp'); g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = sch.ink;
  const s = '실적의 계절 · EARNINGS SEASON · ', w = layout(s).w, x = -((t * 70) % w);
  g.fillText(s, x, CY + 20); g.fillText(s, x + w, CY + 20);
  g.restore();
}

// snare sparkles, placed away from the lyric zone
function shapes(t, sch) {
  const b = beatIdx(t), zone = activeZone(t);
  const sect = sectAt(t).name;
  const busy = sect.includes('CHORUS') ? 3 : sect === 'BREAK' || sect === 'OUTRO' ? 0 : 1;
  for (let j = b; j >= b - 1 && j >= 0; j--) {
    if ((SNARE[j] || 0) < 0.5) continue;
    const dt = t - beatT(j);
    if (dt < 0 || dt > 0.45) continue;
    const p = dt / 0.45;
    for (let m = 0; m < busy; m++) {
      let y = 120 + rnd(j, 20 + m) * 840;
      if (zone === 'all') y = rnd(j, 21 + m) < 0.5 ? 110 + rnd(j, 22) * 80 : 900 + rnd(j, 23) * 80;
      else if (zone !== 'none' && Math.abs(y - ZONE_Y[zone]) < 220) y = ZONE_Y[zone] < 540 ? y + 440 : y - 440;
      const x = 100 + rnd(j, 30 + m) * 1720;
      const s = lerp(40, 120, rnd(j, 40 + m)) * Ease.outBack(pr(p, 0, 0.35), 2.5) * (1 - Ease.inQuad(pr(p, 0.5, 1)));
      if (s > 1) shape(Math.floor(rnd(j, 50 + m) * 5), x, clamp(y, 90, 990), s, [sch.a3, sch.ul, sch.hl][m % 3], rnd(j, 60 + m) * TAU + p * 1.5);
    }
  }
}

/* ---------------- HUD ---------------- */
const WEEK = [['MON', 26], ['TUE', 27], ['WED', 28], ['THU', 29], ['FRI', 30], ['SAT', 31], ['SUN', 1]];
// which day the lyric is on: 28 (line 2-3), 29 (4-7), 30 (16-17)
function dayAt(t) {
  const on = (a, b) => t >= LF(a) - 0.05 && t < PLAN[b].tOut;
  return on(2, 3) ? 28 : on(4, 7) ? 29 : on(16, 17) ? 30 : 0;
}
function hud(t, sch) {
  const a0 = g.globalAlpha;
  g.globalAlpha = 1;
  text('실적의 계절', 70, 66, { size: 34, f: 'disp', align: 'left', color: sch.ink });
  const sect = sectAt(t).name;
  if (sect && sect !== 'BREAK') pill(sect, 290, 66, sch);
  // beat counter: four squares
  const bi = beatIdx(t);
  for (let k = 0; k < 4; k++) {
    const on = bi >= 0 && ((bi % 4) + 4) % 4 === k;
    g.fillStyle = on ? sch.ul : sch.sub;
    const s = on ? 22 + 8 * Math.exp(-(t - beatT(bi)) * 10) : 16;
    g.fillRect(W - 220 + k * 38 - s / 2, 66 - s / 2, s, s);
  }
  // the week strip
  const d = dayAt(t);
  WEEK.forEach(([nm, dd], k) => {
    const x = 70 + k * 92, y = 1020, on = dd === d;
    if (on) { g.fillStyle = sch.ul; rr(x - 8, y - 30, 80, 52, 10); g.fill(); }
    text(nm, x + 32, y - 14, { size: 13, w: 800, color: on ? sch.bg : sch.sub, ls: 1 });
    text(String(dd), x + 32, y + 8, { size: 22, f: 'num', color: on ? sch.bg : sch.ink });
  });
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60), ff = Math.floor((t % 1) * 100);
  text(`${mm}:${String(ss).padStart(2, '0')}.${String(ff).padStart(2, '0')}`, W - 70, 1010, { size: 30, f: 'num', align: 'right', color: sch.sub });
  g.globalAlpha = a0;
}
function pill(s, x, y, sch) {
  setFont(18, 800, 2, 'num');
  const w = layout(s).w + 28;
  g.strokeStyle = sch.ink; g.lineWidth = 2.5; rr(x, y - 17, w, 34, 17); g.stroke();
  text(s, x + w / 2, y + 1, { size: 18, f: 'num', ls: 2, color: sch.ink });
}

/* ---------------- intro, break, outro ---------------- */
function intro(t, sch) {
  if (t > LF(0) + 0.45) return;
  const q = pr(t, LF(0) - 0.08, LF(0) + 0.35);
  const s = (1 + 0.04 * t) * Math.exp(Ease.inQuad(q) * 2.6);
  g.save(); g.translate(CX, CY); g.scale(s, s); g.globalAlpha *= 1 - Ease.inQuad(q);
  marker(-420, 420, -40, 230, sch.hl, pr(t, 0.05, 0.4), 1, true);
  word('실적의 계절', 0, -40, 230, 'disp', sch.ink);
  text('2026 · 10.26 — 11.01', 0, 120, { size: 40, f: 'num', color: sch.ink, ls: 4 });
  g.restore();
}
function breakBeat(t, sch) {
  const a = SECTS.find((s) => s.name === 'BREAK').t, z = LF(38);
  if (t < a || t > z + 0.1) return;
  // a held breath: rings on each beat, then the countdown digits
  for (let b = Math.ceil(beatF(a)); beatT(b) < z; b++) ring(beatF(t), b, CX, CY, { r: 700, col: sch.ul, lw: 16, life: 0.6 });
  const left = Math.max(0, Math.ceil((z - t) / SPB));
  const bp = fract(beatF(t));
  if (left > 0 && left <= 3) word(String(left), CX, CY, 360 * (1 + 0.25 * Math.exp(-bp * 6)), 'num', sch.ink, 1 - bp * 0.5);
}
function outro(t, sch) {
  const a = 155.1;
  if (t < a) return;
  const p = (d, dur = 0.3) => pr(t, a + d, a + d + dur);
  marker(CX - 560, CX + 560, 330, 240, sch.hl, p(0.3, 0.5), 3, true);
  slamWord('실적의 계절', CX, 330, 240, 'disp', sch.ink, p(0, 0.2));
  const rowsData = [['10.28', '하이닉스'], ['10.29', 'FOMC · 삼성 · 마이크로소프트 · 알파벳'], ['10.30', '아마존']];
  rowsData.forEach(([d, s], k) => {
    const q = Ease.outCubic(p(1.2 + k * SPB * 2, 0.35));
    if (q <= 0) return;
    const y = 560 + k * 105;
    g.save(); g.globalAlpha *= q; g.translate((1 - q) * -60, 0);
    stamp(d, 520, y, 48, sch.ul, a + 1.2 + k * SPB * 2, t, -0.06);
    text(s, 640, y + 2, { size: 50, w: 800, align: 'left', color: sch.ink });
    g.restore();
  });
  const q = Ease.outCubic(p(5.5, 0.5));
  if (q > 0) text('“무엇이 남을지 차분히 봐”', CX, 930, { size: 44, f: 'serif', color: sch.ink, alpha: q });
  const q2 = Ease.outCubic(p(7.2, 0.5));
  if (q2 > 0) text('노래 iontiger · made with Suno', CX, 990, { size: 24, w: 700, color: sch.sub, alpha: q2 });
  // fade to paper at the very end
  const f = pr(t, DUR - 1.2, DUR - 0.1);
  if (f > 0) { g.globalAlpha = f; fillAll(sch.bg); g.globalAlpha = 1; }
}
function slamWord(s, x, y, size, f, col, p) {
  if (p <= 0) return;
  g.save(); g.translate(x, y); g.scale(lerp(2.6, 1, Ease.outExpo(p)), lerp(2.6, 1, Ease.outExpo(p)));
  word(s, 0, 0, size, f, col, Math.min(1, p * 4));
  g.restore();
}

/* ---------------- camera & post ---------------- */
function camera(t) {
  const k = kickEnv(t, 10), sect = sectAt(t).name, hot = sect.includes('CHORUS') ? 1 : 0.4;
  return {
    z: 1 + 0.018 * k * hot,
    sx: vnoise(t * 22, 1) * 7 * k * hot,
    sy: vnoise(t * 22, 2) * 7 * k * hot,
    r: vnoise(t * 3, 3) * 0.004 * hot,
  };
}
function postParams(t, sch) {
  const sect = sectAt(t).name, hot = sect.includes('CHORUS');
  const sn = snareEnv(t, 12), k = kickEnv(t, 9);
  let flash = 0, glitch = 0;
  for (const s of SECTS) {
    const dt = t - s.t;
    if (s.t > 0 && dt >= 0 && dt < 0.4) { flash = Math.max(flash, (s.name.includes('CHORUS') ? 0.55 : 0.25) * Math.exp(-dt * 9)); glitch = Math.max(glitch, Math.exp(-dt * 8)); }
  }
  return {
    ca: (hot ? 2.2 : 0.6) * k + (sect === 'FINAL CHORUS' ? 0.8 * sn : 0),
    flash,
    grain: sch.dark ? 0.05 : 0.035,
    vig: sch.dark ? 0.5 : 0.18,
    bloom: sch.dark ? 0.35 : 0,
    glitch: glitch + (sect === 'FINAL CHORUS' ? 0.25 * sn : 0),
  };
}

function drawFrame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.setLineDash([]); g.lineCap = 'butt'; g.lineJoin = 'miter'; g.shadowBlur = 0;
  const S = schemeAt(t), sch = S.cur;
  background(t, S);
  shapes(t, sch);
  const cam = camera(t);
  g.save();
  g.translate(CX + cam.sx, CY + cam.sy); g.rotate(cam.r); g.scale(cam.z, cam.z); g.translate(-CX, -CY);
  intro(t, sch);
  drawLines(t, sch);
  breakBeat(t, sch);
  outro(t, sch);
  g.restore();
  hud(t, sch);
  return postParams(t, sch);
}
