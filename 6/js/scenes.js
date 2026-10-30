'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   Each lyric line becomes its own piece of kinetic type, placed
   top / middle / bottom with one of nine styles (collage, underline,
   highlighter, washing line, fly-through, resize, stack, typewriter,
   poster title) plus one of five exits. The choice is random but
   seeded, so every playback and the MP4 look the same. Behind the
   words, material from the conference poster (speakers, programme
   cards, credits, calendar…) pops up on the same syllables (props.js).
   ============================================================ */
let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };

/* ---------------- beat grid ---------------- */
const beatT = (k) => BEAT0 + k * SPB;
const beatF = (t) => (t - BEAT0) / SPB;
const beatIdx = (t) => Math.floor(beatF(t));
const stepT = (q) => BEAT0 + (q * SPB) / 4;               // sixteenth notes
const stepIdx = (t) => Math.floor(((t - BEAT0) * 4) / SPB);
const BAR = (n) => BEAT0 + n * 4 * SPB;
// decaying envelope after the last sixteenth whose drum strength passes `min`
function drumEnv(arr, t, k = 9, min = 0.6) {
  for (let q = stepIdx(t), n = 0; q >= 0 && n < 8; q--, n++) {
    const v = arr[q] || 0;
    if (v >= min) return Math.min(1, v) * Math.exp(-(t - stepT(q)) * k);
  }
  return 0;
}
const kickEnv = (t, k) => drumEnv(KICK, t, k, 0.6);
const snareEnv = (t, k) => drumEnv(SNARE, t, k, 0.75);

/* ---------------- colour schemes ---------------- */
// bg, ink, sub (quiet details), hl (highlighter) + hlInk (text on it), ul (pen: underline, circle, stamp), a3 (shapes),
// wave (the poster's flowing ribbons); mul: paper-like, so the highlighter multiplies like real ink.
// k / a / d / a2 are the four letters of the KADA logo; the choruses flip through them bar by bar.
const SCH = {
  ice:    { bg: '#F2F6FB', ink: '#13264F', sub: 'rgba(19,38,79,0.26)', hl: '#F6CF5C', hlInk: '#13264F', ul: '#D44C7C', a3: '#3C9C8C', wave: '#C9DDF3', dark: false, mul: true },
  sky:    { bg: '#DCEBFA', ink: '#13264F', sub: 'rgba(19,38,79,0.26)', hl: '#FFFFFF', hlInk: '#13264F', ul: '#2A64B0', a3: '#D44C7C', wave: '#B5D0EE', dark: false },
  navy:   { bg: '#13264F', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.26)', hl: '#3C9C8C', hlInk: '#FFFFFF', ul: '#E4B43C', a3: '#D44C7C', wave: '#1C3466', dark: true },
  purple: { bg: '#3E2A78', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.26)', hl: '#E4B43C', hlInk: '#13264F', ul: '#FF9FC4', a3: '#7FB2E8', wave: '#4A358A', dark: true },
  k:      { bg: '#2C6A9C', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.3)', hl: '#E4B43C', hlInk: '#13264F', ul: '#FFFFFF', a3: '#F49AB9', wave: '#3676AA', dark: false },
  a:      { bg: '#D44C7C', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.32)', hl: '#13264F', hlInk: '#FFFFFF', ul: '#F6CF5C', a3: '#13264F', wave: '#DC5E8A', dark: false },
  d:      { bg: '#E4B43C', ink: '#13264F', sub: 'rgba(19,38,79,0.3)', hl: '#FFFFFF', hlInk: '#13264F', ul: '#D44C7C', a3: '#2C6A9C', wave: '#ECC152', dark: false },
  a2:     { bg: '#3C9C8C', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.32)', hl: '#F6CF5C', hlInk: '#13264F', ul: '#13264F', a3: '#F6CF5C', wave: '#48A898', dark: false },
};
const CHORUS_CYCLE = ['k', 'a', 'd', 'a2'];

/* ---------------- song sections ---------------- */
const LF = (i) => LYRICS[i].words[0].t;               // first sung word of line i
const LE = (i) => { const w = LYRICS[i].words; return w[w.length - 1].e; };
const SECTS = [
  { t: 0, name: 'INTRO', sch: 'ice' },
  { t: BAR(4), name: 'VERSE 1', sch: 'navy' },
  { t: BAR(8), name: 'PRE-CHORUS', sch: 'sky' },
  { t: LF(12), name: 'CHORUS', sch: 'cycle' },
  { t: BAR(20), name: 'VERSE 2', sch: 'ice' },
  { t: BAR(24), name: 'PRE-CHORUS', sch: 'purple' },
  { t: LF(24), name: 'CHORUS', sch: 'cycle' },
  { t: BAR(36), name: 'OUTRO', sch: 'navy' },
  { t: LF(32) - 0.06, name: 'INVITATION', sch: 'ice' },
];
const sectAt = (t) => { let s = SECTS[0]; for (const x of SECTS) if (t >= x.t) s = x; return s; };

// background changes: one per section, one per bar in the choruses (on the downbeat)
const TRANS = (() => {
  const out = [];
  SECTS.forEach((s, k) => {
    const end = k + 1 < SECTS.length ? SECTS[k + 1].t : DUR;
    if (s.sch !== 'cycle') { out.push({ t: s.t, sch: s.sch }); return; }
    let n = 0;
    out.push({ t: s.t, sch: CHORUS_CYCLE[n++ % 4] });
    for (let b = Math.ceil(beatF(s.t + 0.5)); beatT(b) < end - 0.3; b++) if (b % 4 === 0) out.push({ t: beatT(b), sch: CHORUS_CYCLE[n++ % 4] });
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

/* ---------------- words: keywords, stamps ---------------- */
const KEYS = ['AI', '성공', '방식', '다를까', '2027년을', '한마디부터', '원칙', '신뢰를', '시간을', '여백을', '직원', '에이전트와', '미래형', '시스템을', '사람을', '팀을', '답을', '각자의', '함께', '여섯', '연자의', '한자리에', '기회로', '의료윤리와', '예방에서', '경영의', '보수교육', '네', '필수', '두', '지식과', '시선', '먼저', '11월', '22일', '일요일', '아홉', '다섯', '서울성모병원', '대강당', '1층', '대한치과의료관리학회', '종합학술대회', '여러분을', '초대합니다'];
const isKey = (w) => KEYS.some((k) => w.includes(k));
const STAMPS = { '22일': '11.22', 일요일: 'SUN', 아홉: '09:30', 다섯: '17:30', '1층': 'B1', 네: '+4', 두: '+2', 여섯: 'x6' };
const clean = (w) => w.replace(/[,.]+$/, '');

/* ---------------- per-line plan (seeded) ---------------- */
const STYLES = ['block', 'underline', 'marker', 'clothes', 'zoom', 'resize', 'stack', 'type'];
const CENTRE = new Set(['zoom', 'stack']);           // styles that fill the middle of the screen
const FORCE = {
  0: { style: 'type', zone: 'bot', align: 'center' },
  1: { style: 'title', zone: 'mid', align: 'center', exit: 'zoom' },
  12: { style: 'stack', align: 'center', exit: 'zoom' },
  16: { style: 'block', zone: 'top' },
  20: { style: 'resize', zone: 'top' },
  28: { style: 'clothes' },
  31: { style: 'block', zone: 'bot', exit: 'zoom' },
  32: { style: 'type', zone: 'top', align: 'left', exit: 'wipe' },
  33: { style: 'marker', zone: 'top', align: 'left', exit: 'none' },
};
const PLAN = (() => {
  const R = mulberry32(61122);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const out = [];
  let prevStyle = '', prev2 = '', prevZone = '';
  LYRICS.forEach((L, i) => {
    const f = FORCE[i] || {}, cue = PROP_CUES[i];
    const nw = L.words.length;
    let style = f.style;
    for (let tries = 0; !style && tries < 80; tries++) {
      const s = pick(STYLES);
      if (s === prevStyle || s === prev2) continue;
      if (s === 'stack' && nw > 5) continue;
      if (s === 'clothes' && nw > 6) continue;
      if (cue && CENTRE.has(s) && !BACK_OK.has(cue.kind)) continue;
      style = s;
    }
    const zones = CENTRE.has(style) || style === 'title' ? ['mid'] : style === 'clothes' ? ['top'] : cue ? ['top', 'bot'] : ['top', 'mid', 'bot'];
    let zone = f.zone || pick(zones);
    if (!f.zone && zone === prevZone && zones.length > 1) zone = zones[(zones.indexOf(zone) + 1) % zones.length];
    const align = f.align || pick(['left', 'center', 'right', 'center']);
    const exit = f.exit || (style === 'zoom' ? 'zoom' : style === 'clothes' ? pick(['drop', 'zoom']) : pick(['zoom', 'zoom', 'zoom', 'drop', 'wipe', 'shrink', 'scatter']));
    const last = L.words[nw - 1].e;
    const next = i + 1 < LYRICS.length ? LF(i + 1) : DUR + 1;
    const tOut = i + 1 === LYRICS.length ? DUR + 1 : next - last > 4 ? last + 2.4 : next - 0.1;
    const area = cue ? (zone === 'top' ? 'low' : zone === 'bot' ? 'high' : 'back') : null;
    out.push({ style, zone, align, exit, seed: 1000 + i * 37, tIn: L.words[0].t, tOut, area, compact: !!cue });
    prev2 = prevStyle; prevStyle = style; prevZone = zone;
  });
  return out;
})();
const ZONE_Y = { top: 255, mid: 540, bot: 820 };
const EXIT_DUR = 0.42;
const PROPS = Object.keys(PROP_CUES).map((k) => { const i = +k; return { line: i, cue: PROP_CUES[i], a: LF(i), z: PLAN[i].tOut, area: PLAN[i].area }; });

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
  let cy = clamp(ZONE_Y[plan.zone], 150 + total / 2, 965 - total / 2) - total / 2;
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
  const st = plan.style, cmp = plan.compact ? 0.8 : 1;
  if (st === 'block') {
    const fonts = ['disp', 'serif', 'sans', 'disp'];
    for (const it of items) {
      it.f = fonts[Math.floor(R() * fonts.length)];
      it.size = (it.key ? 205 : 150) * lerp(0.78, 1.18, R()) * cmp;
      it.box = !it.key && R() < 0.22;
      it.rot = (R() - 0.5) * 0.09;
      it.w = measure(it.s, it.size, it.f);
      if (it.w > 1500) { it.size *= 1500 / it.w; it.w = 1500; }
    }
    const gap = (it) => it.size * 0.24;
    placeRows(rows(items, 1560, gap), plan, gap, 1.04);
  } else if (st === 'underline' || st === 'marker' || st === 'type') {
    const f = st === 'marker' ? 'serif' : st === 'type' ? 'sans' : R() < 0.5 ? 'disp' : 'sans';
    let size = (st === 'type' ? 112 : 132) * cmp, rs;
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
    const cards = ['#FFFFFF', '#F6CF5C', '#F49AB9', '#8ED1C4', '#FFFFFF', '#BFD7F0', '#F2C14E'];
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
  } else if (st === 'title') {
    // the poster's headline: one row of heavy gradient type
    let size = 250;
    for (const it of items) { it.f = 'disp'; }
    const gap = (it) => it.size * 0.22;
    for (let n = 0; n < 10; n++) {
      for (const it of items) { it.size = size; it.w = measure(it.s, size, 'disp'); }
      if (items.reduce((a, it, k) => a + it.w + (k ? gap(it) : 0), 0) <= 1720) break;
      size *= 0.94;
    }
    placeRows([items], plan, gap);
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
  else if (kind === 4) { g.lineWidth = s * 0.1; g.lineJoin = 'round'; g.beginPath(); for (let k = 0; k <= 4; k++) g.lineTo(-s / 2 + (k * s) / 4, k % 2 ? s * 0.2 : -s * 0.2); g.stroke(); }
  else { g.restore(); toothIcon(x, y, s * 0.9, col, 1, 0.09); return; }
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

function drawTitle(i, L, plan, t, sch) {
  // slams in word by word with the poster's teal-to-navy gradient
  const W_ = LYRICS[i].words, n = W_.length;
  const x0 = Math.min(...L.items.map((it) => it.cx - it.w / 2)), x1 = Math.max(...L.items.map((it) => it.cx + it.w / 2));
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, sch.dark ? '#5FD3C6' : '#0E8C8C'); gr.addColorStop(1, sch.dark ? '#9DB8FF' : '#232F8C');
  for (const it of L.items) {
    const w = W_[it.k], p = inA(t, w, 0.16);
    if (p <= 0) continue;
    const e = Ease.outExpo(p), ex = exitFx(plan, L, it, n, t);
    g.save(); g.translate(it.cx + (ex ? ex.dx : 0), it.cy + (ex ? ex.dy : 0)); g.scale(lerp(2.6, 1, e) * (ex ? ex.s : 1), lerp(2.6, 1, e) * (ex ? ex.s : 1));
    g.globalAlpha *= Math.min(1, p * 4) * (ex ? ex.a : 1);
    setFont(it.size, 400, null, 'disp'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = sch.dark ? 'rgba(0,0,0,0.3)' : 'rgba(19,38,79,0.12)'; g.fillText(it.s, 8, 12);
    g.fillStyle = gr;
    g.save(); g.translate(-it.cx, 0); g.fillText(it.s, it.cx, 0); g.restore();
    g.restore();
  }
  // the poster's subtitle sits above it
  const q = Ease.outCubic(pr(t, W_[0].t + 0.1, W_[0].t + 0.5));
  if (q > 0) text('AI 이전부터 AI 이후까지', CX, L.items[0].cy - L.items[0].size * 0.78, { size: 54, w: 800, color: sch.ink, alpha: q * (1 - pr(t, plan.tOut, plan.tOut + 0.2)) });
}

const RENDER = { title: drawTitle, block: drawBlock, underline: drawUnderline, marker: drawMarker, type: drawType, clothes: drawClothes, zoom: drawZoom, resize: drawResize, stack: drawStack };

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
// the poster's flowing ribbons, a grid of medical crosses that breathes on the kick, and the title scrolling behind
function background(t, S) {
  const sch = S.cur;
  fillAll(S.prev.bg);
  if (S.p < 1) {
    // new colour grows out of a point on the beat
    const r = Ease.inOutCubic(S.p) * 2300;
    g.fillStyle = sch.bg; g.beginPath(); g.arc(S.tr.ox, S.tr.oy, r, 0, TAU); g.fill();
    if (S.p > 0) { g.strokeStyle = sch.a3; g.lineWidth = 26 * (1 - S.p); g.beginPath(); g.arc(S.tr.ox, S.tr.oy, r, 0, TAU); g.stroke(); }
  } else fillAll(sch.bg);
  const k = kickEnv(t, 6);
  // ribbons
  g.save();
  for (let r = 0; r < 4; r++) {
    const ph = t * (0.25 + r * 0.07) + r * 1.7, amp = 70 + r * 22 + k * 26, y0 = 700 + r * 70;
    g.beginPath();
    for (let x = -40; x <= W + 40; x += 40) g.lineTo(x, y0 + Math.sin(x / (520 + r * 90) + ph) * amp - x * 0.22);
    for (let x = W + 40; x >= -40; x -= 40) g.lineTo(x, y0 + 46 + r * 6 + Math.sin(x / (480 + r * 70) + ph * 1.2 + 0.8) * amp * 0.8 - x * 0.22);
    g.closePath();
    g.globalAlpha = 0.5 - r * 0.08; g.fillStyle = sch.wave; g.fill();
  }
  g.restore();
  // crosses
  g.fillStyle = sch.sub;
  const a0 = g.globalAlpha; g.globalAlpha = 0.16 + 0.3 * k;
  const step = 72, off = (t * 14) % step;
  for (let y = -step; y < H + step; y += step) for (let x = -step; x < W + step; x += step) {
    const dx = x + off, dy = y + ((x / step) % 2 ? step / 2 : 0);
    const d = Math.hypot(dx - CX, dy - CY) / 1100;
    const s = (3 + 5 * k) * clamp(d * 1.3);
    if (s > 0.8) { g.fillRect(dx - s, dy - s * 0.28, s * 2, s * 0.56); g.fillRect(dx - s * 0.28, dy - s, s * 0.56, s * 2); }
  }
  g.globalAlpha = a0;
  // giant scrolling title behind everything
  g.save(); g.globalAlpha = sch.dark ? 0.06 : 0.07;
  setFont(400, 400, -6, 'disp'); g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = sch.ink;
  const s = '서로 다른 성공 방식 · KADA 2026 · ', w = layout(s).w, x = -((t * 70) % w);
  g.fillText(s, x, CY + 20); g.fillText(s, x + w, CY + 20);
  g.restore();
}

// snare sparkles (and little teeth, crosses), placed away from the lyric zone
function shapes(t, sch) {
  const q0 = stepIdx(t), zone = activeZone(t);
  const sect = sectAt(t).name;
  const busy = sect === 'CHORUS' ? 3 : sect === 'INVITATION' || sect === 'INTRO' ? 0 : 1;
  for (let q = q0; q >= q0 - 3 && q >= 0; q--) {
    if ((SNARE[q] || 0) < 0.9) continue;
    const dt = t - stepT(q);
    if (dt < 0 || dt > 0.42) continue;
    const p = dt / 0.42;
    for (let m = 0; m < busy; m++) {
      let y = 140 + rnd(q, 20 + m) * 800;
      if (zone === 'all') y = rnd(q, 21 + m) < 0.5 ? 150 + rnd(q, 22) * 60 : 900 + rnd(q, 23) * 60;
      else if (zone !== 'none' && Math.abs(y - ZONE_Y[zone]) < 220) y = ZONE_Y[zone] < 540 ? y + 440 : y - 440;
      const x = 100 + rnd(q, 30 + m) * 1720;
      const s = lerp(40, 110, rnd(q, 40 + m)) * Ease.outBack(pr(p, 0, 0.35), 2.5) * (1 - Ease.inQuad(pr(p, 0.5, 1)));
      if (s > 1) shape(Math.floor(rnd(q, 50 + m) * 6), x, clamp(y, 140, 960), s, [sch.a3, sch.ul, sch.hl][m % 3], rnd(q, 60 + m) * TAU + p * 1.5);
    }
  }
}

/* ---------------- HUD ---------------- */
function hud(t, sch) {
  const a0 = g.globalAlpha;
  g.globalAlpha = 1;
  // KADA logo, fixed top-left on a white plate so it reads on every background
  const img = IMG.logo, lh = 64, lw = img && img.width ? (lh * img.width) / img.height : 130;
  g.fillStyle = 'rgba(10,20,45,0.16)'; rr(36, 30, lw + 290, 98, 26); g.fill();
  g.fillStyle = '#FFFFFF'; rr(30, 24, lw + 290, 98, 26); g.fill();
  if (img && img.width) g.drawImage(img, 52, 41, lw, lh);
  text('대한치과의료관리학회', 72 + lw, 58, { size: 27, w: 800, align: 'left', color: C.navy, ls: -0.5 });
  text('2026년 11월 종합학술대회', 72 + lw, 92, { size: 21, w: 800, align: 'left', color: C.blue });
  const sect = sectAt(t).name;
  if (sect && sect !== 'INVITATION') pill(sect, 30, 152, sch);
  // beat counter: four squares in the logo's colours
  const bi = beatIdx(t);
  for (let k = 0; k < 4; k++) {
    const on = bi >= 0 && ((bi % 4) + 4) % 4 === k;
    g.fillStyle = on ? KADA4[k] : sch.sub;
    const s = on ? 24 + 10 * Math.exp(-(t - beatT(bi)) * 10) : 16;
    rr(W - 210 + k * 40 - s / 2, 72 - s / 2, s, s, 4); g.fill();
    if (on) { g.strokeStyle = sch.dark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.stroke(); }
  }
  // the programme strip: the session the lyric is about lights up
  let cur = [];
  for (let i = 0; i < LYRICS.length; i++) if (t >= PLAN[i].tIn - 0.05 && t < PLAN[i].tOut && LINE_SESS[i]) cur = LINE_SESS[i];
  const y = 1022, pw = 196;
  SPEAKERS.forEach((S, k) => {
    const x = 70 + k * (pw + 14), on = cur.includes(k);
    g.fillStyle = on ? SP_COL[k] : 'transparent'; g.strokeStyle = on ? SP_COL[k] : sch.sub; g.lineWidth = 2.5;
    rr(x, y - 22, pw, 44, 22); g.fill(); g.stroke();
    text('0' + (k + 1), x + 26, y + 1, { size: 20, f: 'num', color: on ? '#FFFFFF' : sch.sub });
    text(S.name, x + 50, y + 1, { size: 21, w: 800, align: 'left', color: on ? '#FFFFFF' : sch.ink, alpha: on ? 1 : 0.6 });
    text(S.role, x + 50 + textW(S.name, 21, 800) + 6, y + 2, { size: 15, w: 700, align: 'left', color: on ? '#FFFFFF' : sch.ink, alpha: on ? 0.85 : 0.45 });
  });
  if (sect !== 'INVITATION') text('2026.11.22 SUN · 서울성모병원', W - 70, 1006, { size: 20, w: 800, align: 'right', color: sch.ink, alpha: 0.7 });
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60), ff = Math.floor((t % 1) * 100);
  text(`${mm}:${String(ss).padStart(2, '0')}.${String(ff).padStart(2, '0')}`, W - 70, 1040, { size: 24, f: 'num', align: 'right', color: sch.sub });
  g.globalAlpha = a0;
}
function pill(s, x, y, sch) {
  setFont(17, 800, 2, 'num');
  const w = layout(s).w + 28;
  g.strokeStyle = sch.ink; g.lineWidth = 2.5; rr(x, y - 16, w, 32, 16); g.stroke();
  text(s, x + w / 2, y + 1, { size: 17, f: 'num', ls: 2, color: sch.ink });
}

/* ---------------- title card, invitation ---------------- */
function gradText(s, x, y, size, a = 1, dark = false) {
  setFont(size, 400, -size * 0.02, 'disp'); g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = layout(s).w, gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  gr.addColorStop(0, dark ? '#5FD3C6' : '#0E8C8C'); gr.addColorStop(1, dark ? '#9DB8FF' : '#232F8C');
  const a0 = g.globalAlpha; g.globalAlpha = a0 * a; g.fillStyle = gr; g.fillText(s, x, y); g.globalAlpha = a0;
  return w;
}
function intro(t, sch) {
  // poster-style title card; flies toward the viewer on the first sung syllable
  const t1 = LF(0);
  if (t > t1 + 0.45) return;
  const q = pr(t, t1 - 0.08, t1 + 0.35);
  const s = (1 + 0.05 * t) * Math.exp(Ease.inQuad(q) * 2.6);
  g.save(); g.translate(CX, CY); g.scale(s, s); g.globalAlpha *= 1 - Ease.inQuad(q); g.translate(-CX, -CY);
  const img = IMG.logo;
  if (img && img.width) { const lw = 300, lh = (lw * img.height) / img.width; g.drawImage(img, CX - lw / 2, 230 - lh / 2, lw, lh); }
  text('대한치과의료관리학회 2026년 11월 종합학술대회', CX, 375, { size: 46, w: 800, color: C.blue });
  text('AI 이전부터 AI 이후까지', CX, 470, { size: 64, w: 900, color: C.navy });
  gradText('서로 다른 성공 방식', CX, 610, 210);
  text('2026. 11. 22 (일) 9:30 ~ 17:30 · 서울성모병원 대강당', CX, 770, { size: 40, w: 800, color: C.navy, alpha: 0.85 });
  g.restore();
}
function invitation(t, sch) {
  const a = LF(32) - 0.06;
  if (t < a) return;
  const p = (d, dur = 0.3) => pr(t, a + d, a + d + dur);
  const B = SPB;
  // headline block (left)
  const L0 = 150;
  const h1 = Ease.outCubic(p(B * 1, 0.4));
  if (h1 > 0) { g.save(); g.globalAlpha *= h1; g.translate((1 - h1) * -60, 0); text('AI 이전부터 AI 이후까지', L0, 418, { size: 46, w: 900, align: 'left', color: C.navy }); g.restore(); }
  const h2 = p(B * 2, 0.22);
  if (h2 > 0) {
    g.save(); g.translate(L0, 520); const sc = lerp(1.8, 1, Ease.outExpo(h2)); g.scale(sc, sc);
    setFont(118, 400, -2, 'disp'); g.textAlign = 'left'; g.textBaseline = 'middle';
    const w = layout('서로 다른 성공 방식').w, gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#0E8C8C'); gr.addColorStop(1, '#232F8C'); g.fillStyle = gr; g.globalAlpha *= Math.min(1, h2 * 4); g.fillText('서로 다른 성공 방식', 0, 0);
    g.restore();
  }
  const rowsData = [['일시', '2026년 11월 22일(일) 9:30 ~ 17:30'], ['장소', '서울성모병원 대강당 (지하 1층)'], ['보수교육', '치과의사 4점(필수 2점 포함) · 치과위생사 2점'], ['접수', 'www.kadap.org · 등록비 5만원']];
  rowsData.forEach(([k, s], i) => {
    const q = Ease.outCubic(p(B * (3 + i), 0.35));
    if (q <= 0) return;
    const y = 668 + i * 74;
    g.save(); g.globalAlpha *= q; g.translate((1 - q) * -50, 0);
    setFont(26, 800); const kw = layout(k).w + 34;
    g.fillStyle = C.blue; rr(L0, y - 22, kw, 44, 22); g.fill();
    text(k, L0 + kw / 2, y + 1, { size: 26, w: 800, color: '#FFFFFF' });
    text(s, L0 + kw + 22, y + 2, { size: 38, w: 800, align: 'left', color: C.navy });
    g.restore();
  });
  // six speakers (right, two rows) and the registration QR
  const ts = [0, 1, 2, 3, 4, 5].map((k) => a + B * 2 + k * B * 0.5);
  for (let k = 0; k < 6; k++) {
    const x = 1330 + (k % 3) * 175, y = 400 + Math.floor(k / 3) * 215;
    speakerPop(k, x, y, 64, t, ts[k], sch, { tagSize: 20 });
  }
  const qp = popAt(t, a + B * 7, 0.3, 2);
  if (qp > 0 && IMG.qr && IMG.qr.width) {
    const x = 1660, y = 850, s = 170;
    g.save(); g.translate(x, y); g.scale(qp, qp); g.rotate(Math.sin(t * 2) * 0.02);
    g.fillStyle = 'rgba(10,20,45,0.2)'; rr(-s / 2 - 16 + 8, -s / 2 - 16 + 12, s + 32, s + 76, 22); g.fill();
    g.fillStyle = '#FFFFFF'; rr(-s / 2 - 16, -s / 2 - 16, s + 32, s + 76, 22); g.fill();
    g.imageSmoothingEnabled = false; g.drawImage(IMG.qr, -s / 2, -s / 2, s, s); g.imageSmoothingEnabled = true;
    g.fillStyle = C.blue; rr(-s / 2 - 16, s / 2 + 8, s + 32, 44, [0, 0, 22, 22]); g.fill();
    text('사전등록 QR', 0, s / 2 + 31, { size: 24, w: 800, color: '#FFFFFF' });
    g.restore();
  }
  text('노래 iontiger · made with Suno', W - 70, 132, { size: 18, w: 700, align: 'right', color: sch.ink, alpha: 0.55 * Ease.outCubic(p(B * 9, 0.5)) });
  // fade to the poster's ice at the very end
  const f = pr(t, DUR - 0.9, DUR - 0.05);
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
  const k = kickEnv(t, 10), sect = sectAt(t).name, hot = sect === 'CHORUS' ? 1 : sect === 'INVITATION' ? 0.15 : 0.45;
  return {
    z: 1 + 0.018 * k * hot,
    sx: vnoise(t * 22, 1) * 7 * k * hot,
    sy: vnoise(t * 22, 2) * 7 * k * hot,
    r: vnoise(t * 3, 3) * 0.004 * hot,
  };
}
function postParams(t, sch) {
  const sect = sectAt(t).name, hot = sect === 'CHORUS';
  const sn = snareEnv(t, 12), k = kickEnv(t, 9);
  let flash = 0, glitch = 0;
  for (const s of SECTS) {
    const dt = t - s.t;
    if (s.t > 0 && dt >= 0 && dt < 0.4) { flash = Math.max(flash, (s.name === 'CHORUS' ? 0.5 : 0.22) * Math.exp(-dt * 9)); glitch = Math.max(glitch, (s.name === 'CHORUS' ? 1 : 0.5) * Math.exp(-dt * 8)); }
  }
  return {
    ca: (hot ? 2.0 : 0.5) * k + (hot ? 0.6 * sn : 0),
    flash,
    grain: sch.dark ? 0.045 : 0.03,
    vig: sch.dark ? 0.45 : 0.14,
    bloom: sch.dark ? 0.3 : 0,
    glitch: glitch + (hot ? 0.18 * sn : 0),
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
  drawProps(t, sch);
  invitation(t, sch);
  drawLines(t, sch);
  g.restore();
  hud(t, sch);
  return postParams(t, sch);
}
