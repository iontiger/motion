'use strict';
/* ============================================================
   SCENES — one take through a pair of AI glasses.
   Yesterday: eyes on the chart monitor (verse 1, first two lines).
   Today: the head comes up, the display boots, and what the lyrics
   name appears in the room — patient ID, tooth chart, history, the next
   appointment, implant plan, canal lengths, the visit memo (verse / pre-chorus);
   the room dims and the words take over (chorus); the tray under the window
   rebuilds the clinic's own AR test screen (verse 2); two pieces of real
   footage from that test play in the break; tomorrow: the title.
   PLAN = how each lyric line is drawn (type.js), CUE = what else shows with it.
   ============================================================ */
let ENERGY = null;
function energy(t) { if (!ENERGY) return 0.5; return ENERGY[clamp(Math.floor(t * 60), 0, ENERGY.length - 1)]; }
const beatAt = (t) => (t - BEAT0) / SPB;
const bEnv = (t, k = 8) => { const b = Math.floor(beatAt(t)); return b < 0 ? 0 : Math.exp(-(t - (BEAT0 + b * SPB)) * k); };
const barAt = (t) => (t - BAR0) / (4 * SPB);
const dEnv = (t, k = 5) => { const b = Math.floor(barAt(t)); return b < 0 ? 0 : Math.exp(-(t - (BAR0 + b * 4 * SPB)) * k); };
const barT = (k) => BAR0 + k * 4 * SPB;

const T = (i) => LN[i].a, Wd = (i, wi) => LN[i].words[wi].a, Zl = (i) => LN[i].z;
const BRK = Zl(39) + 0.35;                 // instrumental break (vocalise) until the outro
const OUT = T(40);
const BRK_B0 = BAR0 + Math.ceil((BRK - 0.3 - BAR0) / (4 * SPB)) * 4 * SPB;      // first bar of the break
const BRK_T1 = BRK_B0 + 16 * SPB;                                               // real footage for four bars, then the glasses

/* ---------------- views ---------------- */
const V = {
  desk: VIEW.desk, pt: VIEW.patient, ptR: { x: 1040, y: 545, zoom: 1 },
  lean: { x: 960, y: 505, zoom: 1.2 }, face: { x: 960, y: 468, zoom: 1.4 }, back: { x: 960, y: 530, zoom: 1.08 },
  ch: { x: 960, y: 540, zoom: 0.97 }, tray: VIEW.tray, clip: { x: 2690, y: 850, zoom: 1.4 },
  gaze: { x: 960, y: 480, zoom: 1.3 }, info: { x: 960, y: 520, zoom: 1.1 },
  out: { x: 960, y: 515, zoom: 1.13 }, wide: { x: 960, y: 540, zoom: 0.93 },
};
// head moves: [start, duration, view]
const MOVES = [
  [Wd(2, 1) - 0.2, 1.3, V.pt],
  [T(7) - 0.2, 1.0, V.ptR],
  [T(8) - 0.4, 0.8, V.lean],
  [T(10) - 0.35, 0.6, V.face],
  [T(11) - 0.25, 1.2, V.back],
  [T(12) - 0.55, 0.8, V.ch],
  [T(12) + 0.8, T(16) - T(12) - 1.0, { x: 960, y: 540, zoom: 1.03 }],
  [T(16) - 0.2, 0.5, { x: 960, y: 540, zoom: 1.07 }],
  [T(17) - 0.2, 0.6, { x: 960, y: 540, zoom: 1.0 }],
  [T(20) - 0.5, 1.1, V.tray],
  [T(22) - 0.08, 0.6, V.clip],
  [T(23) - 0.3, 1.2, V.pt],
  [T(28) - 0.3, 0.8, { x: 960, y: 540, zoom: 1.03 }],
  [T(29) - 0.2, 1.8, V.gaze],
  [T(30) - 0.25, 0.8, V.info],
  [T(31) - 0.25, 0.7, V.pt],
  [T(32) - 0.55, 0.8, V.ch],
  [T(32) + 0.8, T(36) - T(32) - 1.0, { x: 960, y: 540, zoom: 1.03 }],
  [T(36) - 0.2, 0.5, { x: 960, y: 540, zoom: 1.07 }],
  [T(37) - 0.2, 0.6, { x: 960, y: 540, zoom: 1.0 }],
  [BRK - 0.2, 1.2, { x: 960, y: 540, zoom: 0.94 }],
  [OUT - 0.8, 5.2, V.out],
  [T(42) - 0.3, 3.6, V.wide],
  [T(43) - 0.5, 2.4, { x: 960, y: 540, zoom: 1.0 }],
];
function camera(t) {
  let x = V.desk.x, y = V.desk.y, z = V.desk.zoom;
  for (const [t0, d, v] of MOVES) {
    if (t < t0) break;
    const p = Ease.inOutCubic(pr(t, t0, t0 + d));
    x = lerp(x, v.x, p); y = lerp(y, v.y, p); z = lerp(z, v.zoom, p);
  }
  const ch = inChorus(t);
  // a living head: slow drift, a nod on the beat, a push on the downbeat in the chorus
  CAM.x = x + vnoise(t * 0.33, 1) * 16 + vnoise(t * 0.9, 4) * 5;
  CAM.y = y + vnoise(t * 0.29, 2) * 10 + (t > T(2) ? bEnv(t, 9) * 3 : 0);
  CAM.zoom = z * (1 + (ch ? 0.014 * dEnv(t, 5) + 0.004 * bEnv(t, 10) : 0));
  CAM.roll = vnoise(t * 0.25, 3) * 0.006 + (ch ? Math.sin(barAt(t) * Math.PI / 2) * 0.004 : 0);
}
function inChorus(t) { return (t > T(12) - 0.3 && t < T(20) - 0.4) || (t > T(32) - 0.3 && t < BRK); }
// how far the lenses dim the room: [start, duration, value]
const DIMS = [[T(2) - 0.25, 0.8, 0.2], [T(3) - 0.2, 0.5, 0.34], [T(8) - 0.3, 0.6, 0.48], [T(11), 0.8, 0.55], [T(12) - 0.45, 0.5, 0.72], [T(20) - 0.45, 0.9, 0.36], [T(23), 0.8, 0.42], [T(28) - 0.3, 0.6, 0.5], [T(31) + 0.6, 0.6, 0.6], [T(32) - 0.45, 0.5, 0.72], [BRK, 0.8, 0.76], [BRK_T1 - 0.3, 0.8, 0.9], [OUT - 0.9, 1.8, 0.3], [T(42), 2, 0.34], [T(43) - 0.4, 0.9, 0.52]];
function dimAt(t) { let v = 0; for (const [t0, d, x] of DIMS) { if (t < t0) break; v = lerp(v, x, Ease.inOutSine(pr(t, t0, t0 + d))); } return v; }
const hudOn = (t) => pr(t, T(2) - 0.3, T(2) + 0.45);

/* ---------------- how each line is drawn ---------------- */
const P = (st, pos, o = {}) => Object.assign({ st }, pos, o);
const rowLook = (map) => (wi) => ({ look: map[wi] });
const PLAN = [];
// Verse 1 — the monitor, then the head comes up
PLAN[0] = P('screen', {}, { row: 0, lead: 0.05 });
PLAN[1] = P('screen', {}, { row: 1, lead: 0.05, sel: (c, t) => { const cx = cursorX(t); return clamp(1 - Math.abs(cx - c.sx) / 120); } });
PLAN[2] = P('hud', { x: 960, y: 690 }, { size: 128, label: '> TODAY · 오늘', ex: 'up', exd: 0.3 });
PLAN[3] = P('ext', AT(V.pt, 960, 812), { br: [2], size: 150, rel: { 2: 1.2, 3: 1.2 }, look: 'stone', hot: 'mint', ent: 'rise', ex: 'sink', ry: 0.2, rz: -0.045, rx: 0.08 });
PLAN[4] = P('ext', AT(V.pt, 960, 815), { br: [2], size: 128, rowDx: [-190, 190], look: 'mint', hot: 'white', wfx: (wi) => ({ look: wi < 2 ? 'mint' : 'amber' }), ent: 'pop', ex: 'fall', ry: -0.12, rx: 0.06 });
PLAN[5] = P('flow', AT(V.pt, 960, 790), { size: 124, look: 'white', path: (X) => PLAN[5].y + 48 * Math.sin((X - 960) / 270), ex: 'up' });
PLAN[6] = P('ext', AT(V.pt, 960, 815), { size: 128, look: 'white', hot: 'mint', ent: 'fade', ex: 'fade', exd: 0.28, wfx: (wi, t, l, c) => ({ du: c.u * 0.3 * (1 - Ease.inOutCubic(pr(t, l.words[3].a - 0.12, l.words[3].a + 0.45))) }), dyn: (t, l) => ({ s: PLAN[6].s * (1 - 0.6 * Ease.inCubic(pr(t, l.end - l.exd, l.end))) }), ry: 0.06 });
PLAN[7] = P('ext', AT(V.ptR, 800, 818), { size: 134, look: 'rust', hot: 'amber', ent: 'rise', ex: 'sink', ry: 0.22, rz: -0.03, rx: 0.06, maxW: 1240 });
// Pre-chorus 1 — leaning in
PLAN[8] = P('ext', AT(V.lean, 1375, 735), { br: [2], size: 112, look: 'mint', hot: 'white', ent: 'pop', ex: 'up', ry: -0.2, rx: 0.05, maxW: 780 });
PLAN[9] = P('ext', AT(V.lean, 1375, 735), { br: [2], size: 122, look: 'white', hot: 'amber', ent: 'drop', ex: 'fall', ry: -0.2, rx: 0.05, maxW: 780 });
PLAN[10] = P('ext', AT(V.face, 960, 892), { size: 100, look: 'white', hot: 'amber', ent: 'pop', ex: 'fade', ry: 0.05, rx: 0.1, maxW: 1420 });
PLAN[11] = P('hud', { x: 960, y: 800 }, { size: 92, label: '> 조용히', box: true, ex: 'glitch', hold: 0.25 });
// Chorus 1 — the room dims, the words take over
const CH = (v) => {
  const A = v ? 'amber' : 'mint', B = v ? 'coral' : 'amber', k = v ? 20 : 0;
  return [
    P('ext', AT(V.ch, 960, 548), { f: 'gas', wt: 400, br: [2], size: 196, rel: { 0: 0.66, 1: 0.66 }, lh: 1.1, maxW: 1560, look: A, hot: 'white', wfx: (wi) => ({ look: wi < 2 ? 'white' : A }), ent: v ? 'drop' : 'slam', ex: 'zoom', ry: v ? -0.14 : 0.14, rx: 0.05, depth: 0.2 }),
    P('flow', AT(V.ch, 960, 520), { size: 150, look: 'white', col: v ? C.amber : C.mint, col2: v ? 'rgba(255,138,61,0.22)' : undefined, path: (X) => PLAN[13 + k].y + (v ? -86 : 86) * Math.sin((X - 960) / 330), ex: 'up', hold: 0.2 }),
    P('ext', AT(V.ch, 960, 470), { f: 'han', wt: 400, br: [2], size: 178, rel: { 0: 0.56, 1: 0.56 }, look: 'white', hot: B, wfx: (wi, t, l, c) => (wi < 2 ? { look: A } : { dv: Math.sin(t * 2.7 + c.i * 1.1) * 15, rot: Math.sin(t * 2.2 + c.i * 1.7) * 0.11 }), ent: 'drop', ex: 'scatter', ry: v ? 0.1 : -0.1, rx: 0.05 }),
    P('ext', AT(V.ch, 960, 530), { f: 'han', wt: 400, br: [3], size: 164, look: v ? 'coral' : 'blue', hot: 'white', depth: 0.16, wfx: (wi, t, l) => (wi === 1 ? { dep: 1 + 5.5 * Ease.outCubic(pr(t, l.words[1].a, l.words[1].a + 0.9)), look: 'white' } : wi >= 3 ? { look: A } : null), ent: 'pop', ex: 'sink', ry: v ? -0.3 : 0.3, rx: 0.1 }),
    P('ext', AT(V.ch, 960, 650), { f: 'gas', wt: 400, br: [2], size: 150, rel: { 0: 1.34, 1: 1.34 }, lh: 1.1, look: 'white', hot: A, maxW: 1500, wfx: (wi, t, l) => (wi < 2 ? { look: B } : { s: lerp(0.66, 1.06, Ease.outCubic(pr(t, l.words[2].a, l.z))) }), ent: 'slam', ex: 'zoom', ry: 0.04, rx: 0.04, depth: 0.2 }),
    P('ext', AT(V.ch, 960, 540), { f: 'han', wt: 400, br: [2], size: 170, gap: 0.5, look: 'white', hot: 'white', wfx: (wi) => ({ look: wi === 0 ? A : wi === 1 ? (v ? 'blue' : 'blue') : B }), ent: 'pop', ex: 'up', ry: v ? 0.1 : -0.1, rx: 0.05 }),
    P('hud', { x: 960, y: 540 }, { size: 136, br: [2], box: false, heavy: true, col: C.white, acc: v ? C.coral : C.yellow, ent: 'flick', ex: 'glitch', exd: 0.2 }),
    P('ext', AT(V.ch, 960, 548), { f: 'gas', wt: 400, br: [2], size: 172, rel: { 0: 1.26, 1: 1.26 }, lh: 1.1, maxW: 1560, look: 'white', hot: A, wfx: (wi) => (wi < 2 ? { look: B } : null), ent: 'slam', ex: 'scatter', ry: v ? 0.1 : -0.1, rx: 0.05, depth: 0.2, hold: v ? 0.7 : 0.1 }),
  ];
};
CH(0).forEach((p, i) => { PLAN[12 + i] = p; });
// Verse 2 — the tray under the window, then back to the patient
PLAN[20] = P('hud', { x: 960, y: 196 }, { size: 104, label: '> DISPLAY', ex: 'glitch' });
PLAN[21] = P('ext', AT(V.tray, 1360, 196), { br: [2], size: 108, look: 'white', hot: 'mint', ent: 'rise', ex: 'up', ry: -0.16, rx: 0.06, maxW: 640, wfx: (wi, t, l) => (wi === 3 ? { dv: -26 * Ease.outCubic(pr(t, l.words[3].a, l.words[3].a + 0.8)), look: 'mint' } : null) });
PLAN[22] = P('glass', AT(V.clip, 960, 236), { size: 88, hl: [3, 4], label: 'QR · PATIENT MATCH', accent: C.mint, ry: 0.04 });
PLAN[23] = P('ext', AT(V.pt, 960, 812), { br: [2], size: 138, look: 'mint', hot: 'white', ent: 'pop', ex: 'fall', ry: 0.12, rx: 0.06, wfx: (wi, t, l) => (wi === 2 ? { du: 340 * (1 - Ease.outBack(pr(t, l.words[2].a - 0.05, l.words[2].a + 0.3), 1.2)), look: 'amber' } : null) });
PLAN[24] = P('ext', AT(V.pt, 960, 846), { br: [2], size: 98, rowDx: [-540, 540], rowDy: [56, -56], look: 'mint', hot: 'white', wfx: (wi) => ({ look: wi < 2 ? 'mint' : 'amber' }), ent: 'pop', ex: 'up', rx: 0.08 });
PLAN[25] = P('ext', AT(V.pt, 960, 852), { size: 116, look: 'white', hot: 'amber', ent: 'rise', ex: 'sink', ry: -0.08, rx: 0.08, wfx: (wi) => (wi === 2 ? { look: 'amber' } : null) });
PLAN[26] = P('ext', AT(V.pt, 960, 852), { size: 116, look: 'blue', hot: 'white', ent: 'spin', ex: 'fall', ry: 0.1, rx: 0.08 });
PLAN[27] = P('hand', AT(V.pt, 960, 838), { size: 210, col: C.yellow, ex: 'up' });
// Pre-chorus 2
PLAN[28] = P('ext', AT(V.pt, 1345, 760), { br: [2], size: 120, look: 'stone', hot: 'white', ent: 'pop', ex: 'fall', ry: -0.18, rx: 0.05, maxW: 780, wfx: (wi, t, l, c) => (wi < 2 ? { rot: (rnd(c.i, 3) - 0.5) * 0.34 * (1 - Ease.inOutCubic(pr(t, l.words[2].a, l.z))), dv: (rnd(c.i, 8) - 0.5) * 30 * (1 - Ease.inOutCubic(pr(t, l.words[2].a, l.z))) } : { look: 'mint' }) });
PLAN[29] = P('glass', { x: 960, y: 906, hud: true }, { size: 88, hl: [1], label: 'GAZE · 시선', accent: C.mint });
PLAN[30] = P('tags', {}, { size: 84, par: 1.1, tags: [
  Object.assign(AT(V.info, 450, 330, 1.1), { ax: 838, ay: 400, al: 'r', col: C.mint }),
  Object.assign(AT(V.info, 520, 640, 1.1), { ax: 850, ay: 500, al: 'r', col: C.mint }),
  Object.assign(AT(V.info, 1450, 330, 1.1), { ax: 1082, ay: 400, al: 'l', col: C.amber }),
  Object.assign(AT(V.info, 1400, 640, 1.1), { ax: 1070, ay: 500, al: 'l', col: C.amber }),
] });
PLAN[31] = P('ext', AT(V.pt, 960, 548), { f: 'gas', wt: 400, br: [2, 4], size: 176, rel: { 0: 0.5, 1: 0.5, 2: 1.4, 3: 1.4, 4: 0.78 }, lh: 1.08, maxW: 1500, look: 'white', hot: 'white', wfx: (wi) => ({ look: wi < 2 ? 'mint' : wi < 4 ? 'amber' : 'white' }), ent: 'slam', ex: 'zoom', ry: -0.08, rx: 0.05, depth: 0.2 });
// Chorus 2 — same words, warm light
CH(1).forEach((p, i) => { PLAN[32 + i] = p; });
PLAN[39].endAt = BRK + 0.4; PLAN[39].exd = 0.3;
// Outro — tomorrow
PLAN[40] = P('ext', AT(V.out, 960, 835), { br: [2], size: 128, rowDx: [-150, 150], look: 'white', hot: 'mint', ent: 'rise', ex: 'up', ry: 0.1, rx: 0.08, wfx: (wi, t, l) => (wi >= 2 ? { s: lerp(0.9, 1.22, Ease.inOutSine(pr(t, l.words[2].a, l.z))), look: 'mint' } : null) });
PLAN[41] = P('ext', AT(V.out, 960, 835), { br: [2], size: 120, rowDx: [-140, 140], look: 'mint', hot: 'white', ent: 'pop', ex: 'up', ry: -0.1, rx: 0.08, wfx: (wi) => ({ look: wi < 2 ? 'mint' : 'white' }) });
PLAN[40].endAt = T(41) - 0.1; PLAN[40].exd = 0.28;
PLAN[41].endAt = T(42) - 0.12; PLAN[41].exd = 0.3;
PLAN[42] = P('hud', { x: 960, y: 812 }, { size: 112, box: false, col: C.white, acc: C.mint, ex: 'glitch', exd: 0.3, dyn: (t, l) => ({ ls: 0.04 + 0.16 * Ease.inOutSine(pr(t, l.a, l.z + 0.5)), key: 'w' + Math.round(40 * Ease.inOutSine(pr(t, l.a, l.z + 0.5))) }) });
PLAN[43] = P('ext', { x: 960, y: 748, hud: true }, { f: 'gas', wt: 400, size: 230, look: 'white', hot: 'mint', ent: 'slam', ex: 'fade', depth: 0.2, ry: 0.06, rx: 0.05, endAt: DUR - 0.6, exd: 1.6, maxW: 1500 });
setupLines(PLAN);

/* ---------------- desk: the cursor going back and forth ---------------- */
function cursorX(t) {       // panorama x of the mouse pointer on the monitor
  const a = SCREEN.x + 200, b = SCREEN.x + SCREEN.w - 90;
  if (t < T(1) - 0.3) return lerp(b - 60, a + 380, Ease.inOutCubic(pr(t, T(0), T(1) - 0.3)));
  const ph = (t - T(1) + 0.3) / (2 * SPB);
  return lerp(a + 380, lerp(a, b, 0.5 - 0.5 * Math.cos(ph * TAU)), pr(t, T(1) - 0.3, T(1)));
}
function deskScreen(t) {
  // result rows under the search field
  g.save(); layerXf(1);
  const x0 = SCREEN.x + 190, y0 = SCREEN.y + 400;
  for (let i = 0; i < 2; i++) {
    const p = pr(t, T(0) + 1.1 + i * 0.25, T(0) + 1.4 + i * 0.25);
    if (p <= 0) continue;
    g.globalAlpha = p;
    rr(x0 - 26, y0 + i * 52, SCREEN.w - 210, 42, 10); g.fillStyle = i ? '#EEF3F6' : '#DDF1EC'; g.fill();
    circle(x0, y0 + 21 + i * 52, 12, i ? '#C5D2DA' : '#19B8A6');
    g.fillStyle = 'rgba(40,60,70,0.4)'; rr(x0 + 24, y0 + 15 + i * 52, 150 + i * 40, 12, 6); g.fill(); rr(x0 + 330, y0 + 15 + i * 52, 110, 12, 6); g.fill();
    g.globalAlpha = 1;
  }
  g.restore();
  // lyric lines 0 and 1, typed
  const r1 = LN[1].plan; r1._left = null;
  drawLyric(LN[0], t);
  // line 1 needs each glyph's panorama x for the selection highlight
  const L1 = layLine(LN[1], Object.assign({ wt: 800, size: 74, maxW: SCREEN.w - 250, key: 'screen1' }, LN[1].plan));
  const left = SCREEN.x + 190 + L1.w / 2; L1.chars.forEach((c) => { c.sx = left + c.u; });
  drawLyric(LN[1], t);
  // pointer
  if (t < T(2) + 0.6) {
    const cx = cursorX(t), cy = SCREEN.y + (t < T(1) - 0.3 ? lerp(250, 330, pr(t, T(0), T(1) - 0.3)) : 330) + Math.sin(t * 5) * 4;
    g.save(); layerXf(1); g.translate(cx, cy); g.scale(1.5, 1.5);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(8, 23); g.lineTo(14, 36); g.lineTo(19, 34); g.lineTo(13, 21); g.lineTo(23, 21); g.closePath();
    g.fillStyle = '#10222E'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#FFFFFF'; g.stroke();
    g.restore();
  }
}

/* ---------------- chorus light: frames moving out of the depth, a pulse on the bar ---------------- */
function chorusFx(t, k, v) {
  if (k <= 0.001) return;
  const col = v ? C.amber : C.mint, a0 = g.globalAlpha;
  const ph = beatAt(t) / 4;
  g.save(); g.translate(CX, CY); g.rotate(CAM.roll * 2);
  for (let i = 0; i < 6; i++) {
    const f = fract(ph + i / 6), s = 0.16 + f * f * 1.75;
    g.globalAlpha = a0 * k * Math.sin(f * Math.PI) * 0.34;
    g.strokeStyle = i % 3 === 0 ? '#FFFFFF' : col; g.lineWidth = 2 + f * 5;
    rr(-CX * s, -CY * s, W * s, H * s, 60 * s); g.stroke();
  }
  g.restore();
  // soft glow behind the words, pulsing on the downbeat
  const gl = g.createRadialGradient(CX, CY, 40, CX, CY, 900);
  gl.addColorStop(0, hexA(v ? '#FF8A3D' : '#19B8A6', 0.26 + 0.2 * dEnv(t, 4))); gl.addColorStop(1, hexA(v ? '#FF8A3D' : '#19B8A6', 0));
  g.globalAlpha = a0 * k; g.fillStyle = gl; g.fillRect(0, 0, W, H);
  // sweeping bars of light
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x = fract(t * 0.11 + i * 0.37) * (W + 900) - 450;
    const gr = g.createLinearGradient(x - 170, 0, x + 170, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, hexA(col, 0.07)); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.save(); g.translate(CX, CY); g.transform(1, 0, -0.35, 1, 0, 0); g.translate(-CX, -CY); g.fillRect(x - 170, -200, 340, H + 400); g.restore();
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = a0;
}

/* ---------------- cues: what shows with each line ---------------- */
const AP = {      // anchor points, panorama → the positions at rest in each view
  id: AT(V.pt, 960, 150), chart: AT(V.pt, 392, 420), hist: AT(V.pt, 1528, 420),
  rct: AT(V.ptR, 1470, 380), plan: AT(V.lean, 395, 470), tooth: AT(V.lean, 410, 560), cb: AT(V.lean, 520, 190),
  memo: AT(V.face, 1500, 300), edu: AT(V.pt, 420, 420), surg: AT(V.pt, 1500, 420), floor: AT(V.pt, 470, 420), sched: AT(V.pt, 1500, 420),
  check: AT(V.pt, 400, 430),
  t_tooth: AT(V.tray, 420, 590), t_cb: AT(V.tray, 690, 250), t_rct: AT(V.tray, 1380, 500), t_memo: AT(V.tray, 1385, 820),
  c_id: AT(V.clip, 1440, 600),
};
const facePt = (dx = 0, dy = 0) => toScreen(PT.x + dx, PT.y + dy, 1);
function connect(pts, p, col, o = {}) {       // glowing polyline through screen points, drawn up to p, with a travelling dot
  if (p <= 0) return;
  g.strokeStyle = col; g.lineWidth = o.lw || 4; g.lineCap = 'round'; g.lineJoin = 'round';
  if (o.dash) g.setLineDash(o.dash);
  g.shadowColor = col; g.shadowBlur = 14;
  const head = polyPartial(pts, p);
  g.shadowBlur = 0; g.setLineDash([]); g.lineCap = 'butt';
  if (p < 1 || o.dot) circle(head[0], head[1], 9, '#FFFFFF');
}
function schedulePanel(pos, p, k) {
  panel(pos, 430, 330, p, { title: 'TODAY · 오늘 일정', tcol: C.sky }, (w, h) => {
    [['09:30', '스케일링', C.sky], ['10:00', '#36 RCT (3)', C.amber], ['10:40', '임플란트 상담', C.mint]].forEach(([tm, s, c], i) => {
      const q = pr(k, i * 0.2, i * 0.2 + 0.3), y = -44 + i * 72, a = g.globalAlpha;
      if (q <= 0) return;
      g.globalAlpha = a * q;
      rr(-w / 2 + 26, y - 28, w - 52, 56, 14); g.fillStyle = i === 1 ? hexA(C.amber, 0.16) : 'rgba(255,255,255,0.07)'; g.fill();
      g.fillStyle = c; rr(-w / 2 + 26, y - 28, 7, 56, 3.5); g.fill();
      hudText(tm, -w / 2 + 48, y, { size: 22, color: hexA('#FFFFFF', 0.75) });
      text(s, -w / 2 + 136, y + 2, { size: 30, w: 800, align: 'left', color: C.white });
      g.globalAlpha = a;
    });
  });
}
function doodles(t, t0, t1) {         // pen sketches around the room: bulb, arrows, sparks
  const p = pr(t, t0, t1), a0 = g.globalAlpha;
  if (p <= 0) return;
  g.globalAlpha = a0 * fadeOut(t, T(28) + 0.1, 0.4);
  g.strokeStyle = C.yellow; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = 'rgba(0,10,20,0.5)'; g.shadowBlur = 8;
  const S = (x, y) => toScreen(AT(V.pt, x, y).x, AT(V.pt, x, y).y, 1.08);
  const draw = (pts, a, b) => { const q = pr(p, a, b); if (q > 0) polyPartial(pts.map(([x, y]) => { const s = S(x, y); return [s[0], s[1]]; }), q); };
  // bulb
  const bulb = []; for (let i = 0; i <= 26; i++) { const a = -Math.PI * 1.25 + (i / 26) * Math.PI * 1.5; bulb.push([330 + Math.cos(a) * 84, 300 + Math.sin(a) * 84]); }
  draw(bulb.concat([[372, 400], [288, 400], [bulb[0][0], bulb[0][1]]]), 0, 0.3);
  draw([[296, 426], [364, 426]], 0.28, 0.34); draw([[306, 450], [354, 450]], 0.32, 0.38);
  [[330, 176, 330, 132], [224, 214, 190, 186], [436, 214, 470, 186], [196, 300, 152, 300], [464, 300, 508, 300]].forEach(([x1, y1, x2, y2], i) => draw([[x1, y1], [x2, y2]], 0.36 + i * 0.03, 0.44 + i * 0.03));
  // curved arrow to the patient
  const arc = []; for (let i = 0; i <= 20; i++) { const u = i / 20; arc.push([lerp(470, 770, u), 330 - Math.sin(u * Math.PI) * 120 + u * 40]); }
  draw(arc, 0.45, 0.7); draw([[730, 330], [772, 372], [786, 314]], 0.7, 0.78);
  // star + plus on the right
  const star = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI * 0.8; star.push([1500 + Math.cos(a) * 92, 320 + Math.sin(a) * 92]); }
  draw(star, 0.5, 0.85);
  draw([[1660, 470], [1660, 550]], 0.8, 0.9); draw([[1620, 510], [1700, 510]], 0.86, 0.96);
  g.shadowBlur = 0; g.lineCap = 'butt'; g.globalAlpha = a0;
}

// things that stay over several lines (drawn before the lyric of the moment)
function persistent(t) {
  const a0 = g.globalAlpha;
  // --- verse 1: lock on the patient, ID above the head
  if (t > T(3) - 0.5 && t < T(8) + 0.4) {
    const f = facePt(), z = f[2];
    g.globalAlpha = a0 * fadeOut(t, T(8) + 0.4, 0.4);
    lockOn(t, T(3) - 0.35, f[0] - 165 * z, f[1] - 190 * z, 330 * z, 380 * z, { len: 44, lw: 4 });
    idCard(AP.id, popIn(t, T(3) - 0.05, 0.4), { check: pr(t, T(3) + 0.35, T(3) + 0.7) });
    g.globalAlpha = a0;
  }
  // --- verse 1: chart + history (lines 4–6), gathered in on line 6
  if (t > T(4) - 0.3 && t < T(7)) {
    const gather = Ease.inCubic(pr(t, Wd(6, 3) - 0.1, Wd(6, 3) + 0.5));
    const mv = (pos, k) => ({ x: lerp(pos.x, AT(V.pt, 960, 440).x, k * 0.8), y: lerp(pos.y, AT(V.pt, 960, 440).y, k * 0.8), par: pos.par, s: pos.s * (1 - k * 0.8) });
    g.globalAlpha = a0 * (1 - gather);
    toothChart(mv(AP.chart, gather), popIn(t, T(4) - 0.15, 0.4), { hi: pr(t, Wd(4, 1), Wd(4, 1) + 0.5), ry: 0.22 });
    historyList(mv(AP.hist, gather), popIn(t, Wd(4, 2) - 0.15, 0.4), { k: pr(t, Wd(4, 2), Wd(4, 2) + 1.1), ry: -0.22 });
    // line 5: one stroke through all three
    if (t > T(5) - 0.1) {
      const a = toScreen(AP.chart.x + 230, AP.chart.y - 40, 1.08), b = toScreen(AP.id.x - 240, AP.id.y + 20, 1.08), c = toScreen(AP.id.x + 240, AP.id.y + 20, 1.08), d = toScreen(AP.hist.x - 230, AP.hist.y - 40, 1.08);
      connect([[a[0], a[1]], [b[0] - 30, a[1]], [b[0], b[1]]], pr(t, T(5), T(5) + 0.9), C.mint);
      connect([[c[0], c[1]], [d[0] + 30, d[1]], [d[0], d[1]]].map((q, i) => (i === 1 ? [c[0] + 30, d[1]] : q)), pr(t, T(5) + 0.8, Zl(5)), C.mint);
    }
    g.globalAlpha = a0;
    // line 6: the ring closes on the patient
    if (t > T(6) - 0.1) {
      const f = facePt(), k = Ease.outCubic(pr(t, T(6), Zl(6)));
      reticle(f[0], f[1] + 10, lerp(620, 215, k) * f[2], { alpha: Math.min(1, k * 3) * fadeOut(t, T(7), 0.3), rot: t * 0.6, lw: 3 });
    }
  }
  // --- line 7: next appointment
  if (t > T(7) - 0.2 && t < T(8) + 0.3) {
    g.globalAlpha = a0 * fadeOut(t, T(8) + 0.3, 0.35);
    rctLabel(AP.rct, pr(t, T(7), T(7) + 1.2));
    const q = toScreen(AP.rct.x, AP.rct.y + 215, 1.08), k = popIn(t, Wd(7, 2), 0.35);
    if (k > 0) { g.save(); g.translate(q[0], q[1]); g.scale(k, k); pill('다음 예약 · 3회차', 0, 0, { size: 30, w: 800, col: C.blue, dot: C.blue }); g.restore(); }
    g.globalAlpha = a0;
  }
  // --- pre-chorus 1: implant plan → tooth with canals + the grey balloon
  if (t > T(8) - 0.3 && t < T(10) + 0.3) {
    g.globalAlpha = a0 * fadeOut(t, T(9) + 0.05, 0.3);
    if (t < T(9) + 0.1) implantPlan(AP.plan, popIn(t, T(8) - 0.15, 0.4), { k: pr(t, Wd(8, 1), Zl(8)), ry: 0.24 });
    g.globalAlpha = a0 * fadeOut(t, T(10) + 0.3, 0.4);
    if (t > T(9) - 0.25) {
      const k = popIn(t, T(9) - 0.2, 0.45), q = toScreen(AP.tooth.x, AP.tooth.y + Math.sin(t * 1.2) * 6, 1.08);
      if (k > 0) tooth(q[0], q[1], 1.18 * k * q[2] / (1 + (V.lean.zoom - 1) * 1.08), { canals: pr(t, T(9), Zl(9) - 0.1), rot: Math.sin(t * 0.9) * 0.04 - 0.05 });
      canalBubble(AP.cb, pr(t, Wd(9, 1) - 0.1, Wd(9, 1) + 0.9), { s: 0.7, tx: -70, ty: 268 });
    }
    g.globalAlpha = a0;
  }
  // --- line 10: eye contact + what the patient said
  if (t > T(10) - 0.2 && t < T(11) + 0.4) {
    g.globalAlpha = a0 * fadeOut(t, T(11) + 0.4, 0.4);
    const l = facePt(-44, -4), r = facePt(44, -4), z = l[2];
    [l, r].forEach((e, i) => lockOn(t, Wd(10, 1) - 0.15 + i * 0.08, e[0] - 38 * z, e[1] - 30 * z, 76 * z, 60 * z, { len: 16, lw: 3, dur: 0.35 }));
    if (t > Wd(10, 2)) { const p = popIn(t, Wd(10, 2), 0.3); g.save(); g.translate((l[0] + r[0]) / 2, l[1] - 92 * z); g.scale(p, p); pill('EYE CONTACT', 0, 0, { size: 22, f: 'mono', w: 600, col: C.mint, dot: C.mint }); g.restore(); }
    const m = facePt(30, 78), mp = toScreen(AP.memo.x - 200, AP.memo.y + 60, 1.08);
    connect([[m[0], m[1]], [lerp(m[0], mp[0], 0.5), mp[1] + 50], [mp[0], mp[1]]], pr(t, Wd(10, 4) - 0.1, Wd(10, 4) + 0.3), C.amber, { dash: [3, 12], lw: 5 });
    memoText(AP.memo, pr(t, Wd(10, 4), Wd(10, 4) + 1.0), { size: 66 });
    g.globalAlpha = a0;
  }
  // --- line 11: something arrives, quietly
  if (t > T(11) - 0.1 && t < T(12) + 0.2) {
    const t0 = Wd(11, 4);
    g.globalAlpha = a0 * fadeOut(t, T(12) + 0.1, 0.3);
    // dots drifting in from the edge of sight
    for (let i = 0; i < 5; i++) { const q = pr(t, T(11) + i * 0.3, t0 + 0.1); if (q > 0 && q < 1) circle(lerp(1900, 1560, Ease.inOutSine(q)) + i * 14, 190 + Math.sin(q * 6 + i) * 10, 5, hexA(C.mint, 0.8 * Math.sin(q * Math.PI))); }
    notifChip(1548, 190, '새 기록이 도착했어요', 'EMR · 방금', pr(t, t0 - 0.05, t0 + 0.45), { t0 });
    g.globalAlpha = a0;
  }
  // --- verse 2 at the tray: the four things of the clinic's AR test, then the call-outs
  if (t > T(20) && t < T(23) + 0.2) {
    g.globalAlpha = a0 * fadeOut(t, T(22) + 0.15, 0.4);
    if (t < T(22) + 0.2) {
      const rise = (t0) => 60 * (1 - Ease.outCubic(pr(t, t0, t0 + 0.7)));
      const w0 = Wd(21, 0), w1 = Wd(21, 1), w2 = Wd(21, 2), w3 = Wd(21, 3);
      let k = popIn(t, w0 - 0.1, 0.45);
      if (k > 0) { const q = toScreen(AP.t_tooth.x, AP.t_tooth.y + rise(w0) + Math.sin(t * 1.2) * 6, 1.08); tooth(q[0], q[1], 1.0 * k, { rot: -0.06 + Math.sin(t) * 0.03 }); }
      canalBubble({ x: AP.t_cb.x, y: AP.t_cb.y + rise(w1), par: 1.08, s: 1 }, pr(t, w1 - 0.1, w1 + 0.8), { s: 0.74, tx: -190, ty: 290 });
      rctLabel({ x: AP.t_rct.x, y: AP.t_rct.y + rise(w2), par: 1.08, s: 1 }, pr(t, w2 - 0.1, w2 + 0.9), { s: 0.95 });
      memoText({ x: AP.t_memo.x, y: AP.t_memo.y + rise(w3), par: 1.08, s: 1 }, pr(t, w3 - 0.1, w3 + 0.8), { size: 70 });
      // captions, as in the figure
      const c0 = w3 + 0.25, S = (p, dx, dy) => { const q = toScreen(p.x + dx, p.y + dy, 1.08); return [q[0], q[1]]; };
      let a = S(AP.t_cb, -222, 4), b = S(AP.t_cb, -282, 4); callout(a[0], a[1], b[0], b[1], '전자차트 내용', pr(t, w1 + 0.3, w1 + 0.85), { size: 30 });
      a = S(AP.t_rct, 270, 0); b = S(AP.t_rct, 330, 0); callout(a[0], a[1], b[0], b[1], '예약 내용', pr(t, w2 + 0.3, w2 + 0.85), { size: 30 });
      a = S(AP.t_memo, -250, 10); b = S(AP.t_memo, -310, 10); callout(a[0], a[1], b[0], b[1], '내원 메모', pr(t, w3 + 0.12, w3 + 0.6));
    }
    g.globalAlpha = a0;
  }
  // --- line 22: the code on the clip is read, the patient is found
  if (t > T(22) - 0.1 && t < T(23) + 0.5) {
    g.globalAlpha = a0 * fadeOut(t, T(23) + 0.35, 0.35);
    const q = toScreen(TRAY.clip[0] + 119, TRAY.clip[1] - 12, 1), z = q[2], sz = 112 * z;
    const lk = lockOn(t, T(22) + 0.1, q[0] - sz / 2, q[1] - sz / 2, sz, sz, { len: 26, lw: 4, glow: 12 });
    if (lk > 0.5 && t < Wd(22, 3) + 0.3) { const sy = q[1] - sz / 2 + sz * (0.5 - 0.5 * Math.cos((t - T(22)) * 9)); g.strokeStyle = C.mint; g.lineWidth = 4; g.shadowColor = C.mint; g.shadowBlur = 16; line(q[0] - sz / 2 + 6, sy, q[0] + sz / 2 - 6, sy); g.shadowBlur = 0; }
    const c = toScreen(AP.c_id.x - 235, AP.c_id.y, 1.08);
    connect([[q[0] + sz / 2, q[1]], [c[0] - 60, q[1]], [c[0], c[1]]], pr(t, Wd(22, 2), Wd(22, 2) + 0.4), C.mint);
    idCard(AP.c_id, popIn(t, Wd(22, 2) + 0.25, 0.4), { check: pr(t, Wd(22, 3), Wd(22, 3) + 0.35) });
    ring(t, Wd(22, 3), q[0], q[1], { r: 220, col: C.mint, lw: 6, life: 0.7 });
    g.globalAlpha = a0;
  }
  // --- lines 23–27: ID back over the patient, linked to the face; education + surgery; flow; sketches
  if (t > T(23) + 0.5 && t < T(28) + 0.4) {
    g.globalAlpha = a0 * fadeOut(t, T(28) + 0.3, 0.4);
    idCard(AP.id, popIn(t, T(23) + 0.6, 0.4), { check: 1 });
    const f = facePt(0, -150), b = toScreen(AP.id.x, AP.id.y + 92, 1.08);
    connect([[b[0], b[1]], [f[0], f[1]]], pr(t, Wd(23, 2) - 0.1, Wd(23, 2) + 0.25), C.mint, { dot: true });
    ring(t, Wd(23, 2) + 0.2, f[0], f[1], { r: 260, col: C.amber, lw: 7, life: 0.7 });
    g.globalAlpha = a0;
    const out = Ease.inCubic(pr(t, T(26) - 0.25, T(26) + 0.15));
    if (t > T(24) - 0.3 && out < 1) {
      g.globalAlpha = a0 * (1 - out);
      eduPanel({ x: AP.edu.x - out * 300, y: AP.edu.y, par: 1.08, s: 1 }, popIn(t, T(24) - 0.2, 0.4), { ry: 0.2, t0: T(24) });
      surgPanel({ x: AP.surg.x + out * 300, y: AP.surg.y, par: 1.08, s: 1 }, popIn(t, Wd(24, 2) - 0.2, 0.4), { ry: -0.2, k: pr(t, T(25), Wd(25, 2) + 0.15) });
      if (t > Wd(25, 2)) { const s = toScreen(AP.surg.x, AP.surg.y - 30, 1.08); ring(t, Wd(25, 2) + 0.1, s[0], s[1], { r: 260, col: C.mint, lw: 6, life: 0.7 }); }
      g.globalAlpha = a0;
    }
    if (t > T(26) - 0.2) {
      g.globalAlpha = a0 * fadeOut(t, T(28) + 0.2, 0.4);
      floorPlan(AP.floor, popIn(t, T(26) - 0.1, 0.4), { ry: 0.18, s: 0.86, k: pr(t, T(26), Zl(26)) });
      schedulePanel(AP.sched, popIn(t, Wd(26, 1) - 0.1, 0.4), pr(t, Wd(26, 1), Zl(26) + 0.3));
      g.globalAlpha = a0;
      doodles(t, T(27), Zl(27) + 0.2);
    }
  }
  // --- pre-chorus 2: steps taken away; the gaze stays; ripple
  if (t > T(28) - 0.3 && t < T(29) + 0.5) {
    const l = LN[28], cs = l.chars.filter((c) => c.wi >= 2);
    let gone = 0; cs.forEach((c, i) => { gone += pr(t, c.t, c.t + 0.3); });
    gone += pr(t, l.z, l.z + 0.3);
    g.globalAlpha = a0 * fadeOut(t, T(29) + 0.45, 0.4);
    checklist(AP.check, popIn(t, T(28) - 0.2, 0.4), gone, { ry: 0.22 });
    g.globalAlpha = a0;
  }
  if (t > T(29) - 0.2 && t < T(30) + 0.3) {
    const f = facePt(0, 6), arrive = Ease.inOutCubic(pr(t, T(29), Wd(29, 1) + 0.2));
    const x = lerp(1560, f[0], arrive), y = lerp(250, f[1], arrive);
    g.globalAlpha = a0 * fadeOut(t, T(30) + 0.25, 0.3);
    reticle(x, y, lerp(46, 150 * f[2], arrive), { rot: t * 0.8, fill: pr(t, Wd(29, 2), Zl(29) + 0.2), lw: 3.5 });
    if (arrive >= 1) { const k = popIn(t, Wd(29, 2), 0.3); g.save(); g.translate(f[0] + 190 * f[2], f[1] - 150 * f[2]); g.scale(k, k); pill('머무는 중', 0, 0, { size: 26, col: C.mint, dot: C.mint, align: 'left' }); g.restore(); }
    g.globalAlpha = a0;
  }
  if (t > T(31) - 0.1 && t < T(32)) {
    const t0 = Wd(31, 2);
    [0, 0.18, 0.36].forEach((d, i) => ring(t, t0 + d, CX, CY, { r: 1100, r0: 80, col: i === 1 ? C.white : C.amber, lw: 10, life: 1.1, alpha: 0.7 }));
  }
}

// chorus cues, k = 12 (first chorus) or 32 (second)
function chorusCues(t, k) {
  const v = k === 32 ? 1 : 0, A = v ? C.amber : C.mint, B = v ? C.coral : C.amber, a0 = g.globalAlpha;
  let l = LN[k];
  // line 1: the search bar that is no longer needed, then the records simply there
  if (t > l.a - 0.45 && t < l.end + 0.2) {
    const t1 = l.words[1].a, drop = Ease.inCubic(pr(t, l.words[2].a - 0.25, l.words[2].a + 0.2));
    const k0 = popIn(t, l.a - 0.4, 0.35), sh = t > t1 && t < t1 + 0.5 ? Math.sin((t - t1) * 50) * 9 * (1 - pr(t, t1, t1 + 0.5)) : 0;
    if (k0 > 0 && drop < 1) {
      g.save(); g.translate(CX + sh, 196 + drop * 500); g.rotate(drop * 0.3); g.scale(k0, k0); g.globalAlpha = a0 * (1 - drop);
      rr(-330, -46, 660, 92, 46); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
      g.lineWidth = 6; g.beginPath(); g.arc(-270, -4, 18, 0, TAU); g.stroke(); g.lineCap = 'round'; line(-257, 9, -243, 23); g.lineCap = 'butt';
      text('환자 검색', -220, 2, { size: 38, w: 600, align: 'left', color: 'rgba(255,255,255,0.7)' });
      const st = pr(t, t1, t1 + 0.3);
      if (st > 0) { g.strokeStyle = C.coral; g.lineWidth = 9; g.lineCap = 'round'; line(-300, 0, -300 + 600 * st, 0); g.lineCap = 'butt'; }
      g.restore(); g.globalAlpha = a0;
    }
    const cs = l.chars.filter((c) => c.wi >= 2), ex = pr(t, l.end - 0.3, l.end);
    const spots = [[250, 250, -0.16], [960, 190, 0.03], [1670, 250, 0.15], [230, 850, 0.12], [960, 905, -0.03], [1690, 850, -0.14]];
    spots.forEach(([x, y, r], i) => { const c = cs[Math.min(i, cs.length - 1)]; const p = pr(t, c.t + (i >= cs.length ? 0.2 : 0), c.t + 0.4 + (i >= cs.length ? 0.2 : 0)); g.globalAlpha = a0 * (1 - ex); recordCard(x, y + Math.sin(t * 1.3 + i) * 6, 300, 190, r, p, i + 1, i % 2 ? B : A); });
    g.globalAlpha = a0;
  }
  // line 2: stations along the flow
  l = LN[k + 1];
  if (t > l.a - 0.2 && t < l.end) {
    const names = ['접수', '진단', '치료', '다음 예약'], p = pr(t, l.a, l.z);
    names.forEach((s, i) => {
      const q = popIn(t, lerp(l.a, l.z, i / 4) + 0.1, 0.35);
      if (q <= 0) return;
      const X = PLAN[k + 1].x - 630 + i * 420, sp = toScreen(X, PLAN[k + 1].path(X) + (v ? -210 : 235), 1.08);
      g.globalAlpha = a0 * fadeOut(t, l.end, 0.3);
      g.save(); g.translate(sp[0], sp[1]); g.scale(q, q); pill(s, 0, 0, { size: 34, w: 800, col: v ? C.amber : C.mint, dot: p > (i + 0.5) / 4 ? (v ? C.amber : C.mint) : 'rgba(255,255,255,0.3)' }); g.restore();
    });
    g.globalAlpha = a0;
  }
  // line 4: listen (rings from the patient), look (a lens passing over)
  l = LN[k + 3];
  if (t > l.a && t < l.end) {
    const t2 = l.words[2].a, f = facePt(0, 74);
    for (let i = 0; i < 4; i++) ring(t, t2 + i * 0.16, f[0], f[1], { r: 520, r0: 30, col: A, lw: 6, life: 1.0, alpha: 0.6 });
    const t3 = l.words[3].a;
    if (t > t3 - 0.1) {
      const q = Ease.inOutSine(pr(t, t3 - 0.1, l.z)), x = lerp(520, 1400, q), y = 800 + Math.sin(q * Math.PI) * -40;
      g.globalAlpha = a0 * Math.min(1, pr(t, t3 - 0.1, t3 + 0.1)) * fadeOut(t, l.end, 0.25);
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 9; g.beginPath(); g.arc(x, y, 74, 0, TAU); g.stroke(); g.fillStyle = hexA(A, 0.16); g.fill();
      g.lineCap = 'round'; g.lineWidth = 13; line(x + 54, y + 54, x + 104, y + 104); g.lineCap = 'butt';
      g.globalAlpha = a0;
    }
  }
  // line 5: the glasses, drawn then lit
  l = LN[k + 4];
  if (t > l.a - 0.3 && t < l.end + 0.1) {
    g.globalAlpha = a0 * fadeOut(t, l.end + 0.1, 0.3);
    const lit = pr(t, l.words[1].a, l.words[1].a + 0.35);
    glassesIcon(CX, 268 + Math.sin(t * 1.4) * 5, 0.92 * (1 + 0.06 * Math.exp(-Math.max(0, t - l.words[1].a) * 6)), { draw: pr(t, l.a - 0.25, l.words[1].a), lit, lw: 11, c0: A, c1: v ? C.coral : C.blue });
    burstRays(CX, 268, pr(t, l.words[1].a, l.words[1].a + 0.6), { col: A, r0: 300, r: 260, n: 20, sy: 0.5 });
    g.globalAlpha = a0;
  }
  // line 8: lock-up rays
  l = LN[k + 7];
  if (t > l.a && t < l.end + 0.3) {
    burstRays(CX, CY, pr(t, l.a, l.a + 0.7), { col: B, r0: 420, r: 500, n: 22, sy: 0.62, lw: 10 });
    burstRays(CX, CY, pr(t, l.words[2].a, l.words[2].a + 0.7), { col: A, r0: 460, r: 520, n: 22, sy: 0.62, lw: 10, rot: 0.14 });
  }
}
// after the lyric of the moment (needs its layout)
function chorusPost(t, k, R) {
  const v = k === 32 ? 1 : 0, l = LN[k + 5];
  // line 6: a bridge from the first word to the second
  if (R && R.line === l && t > l.words[2].a - 0.15) {
    const w0 = R.L.words[0], w1 = R.L.words[1], a = pproj(R.pl, (w0.x0 + w0.x1) / 2, w0.y - w0.size * 0.62), b = pproj(R.pl, (w1.x0 + w1.x1) / 2, w1.y - w1.size * 0.62);
    const p = Ease.outCubic(pr(t, l.words[2].a - 0.15, l.words[2].a + 0.45)), pts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 120]); }
    const a0 = g.globalAlpha; g.globalAlpha = a0 * fadeOut(t, l.end, 0.25);
    connect(pts, p, v ? C.coral : C.amber, { lw: 9, dot: true });
    g.strokeStyle = hexA('#FFFFFF', 0.5); g.lineWidth = 3;
    for (let i = 2; i < 24; i += 3) { if (i / 24 > p) break; line(pts[i][0], pts[i][1], pts[i][0], pts[i][1] + 26); }
    g.globalAlpha = a0;
  }
}
// line 7 of the chorus: the day turning on (behind the HUD words)
function dayOn(t, k) {
  const l = LN[k + 6], v = k === 32 ? 1 : 0;
  if (t < l.a - 0.1 || t > l.end + 0.2) return;
  const a0 = g.globalAlpha, col = v ? C.coral : C.yellow, p = pr(t, l.a, l.words[3].a);
  g.globalAlpha = a0 * fadeOut(t, l.end + 0.2, 0.3) * Math.min(1, pr(t, l.a - 0.1, l.a + 0.15));
  // a dial around the words: the hours of a working day
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 3; g.beginPath(); g.ellipse(CX, CY, 700, 400, 0, Math.PI, TAU); g.stroke();
  for (let i = 0; i <= 9; i++) { const a = Math.PI + (i / 9) * Math.PI, x = CX + Math.cos(a) * 700, y = CY + Math.sin(a) * 400; g.strokeStyle = i / 9 <= p ? col : 'rgba(255,255,255,0.4)'; g.lineWidth = 5; line(x, y, x - Math.cos(a) * 26, y - Math.sin(a) * 15); hudText(String(9 + i).padStart(2, '0'), x + Math.cos(a) * 34 - 14, y + Math.sin(a) * 26, { size: 20, color: i / 9 <= p ? col : hexA('#FFFFFF', 0.5) }); }
  const a = Math.PI + p * Math.PI; circle(CX + Math.cos(a) * 700, CY + Math.sin(a) * 400, 16, col);
  g.shadowColor = col; g.shadowBlur = 40; circle(CX + Math.cos(a) * 700, CY + Math.sin(a) * 400, 10, '#FFFFFF'); g.shadowBlur = 0;
  // switched on
  const t3 = l.words[3].a;
  burstRays(CX, CY, pr(t, t3, t3 + 0.6), { col, r0: 520, r: 420, n: 26, sy: 0.6 });
  g.globalAlpha = a0;
}

/* ---------------- break: the clinic's own AR test, then the glasses ---------------- */
const KEYS = ['환자 확인', '전자차트', '예약', '내원 메모', '임플란트', '근관', '교육', '수술', '운영'];
function breakScene(t) {
  if (t < BRK - 0.1 || t > OUT + 0.3) return;
  const a0 = g.globalAlpha, bar = 4 * SPB, b0 = BRK_B0, t1 = BRK_T1, t2 = OUT - 0.55;
  // headline
  let hp = pr(t, BRK + 0.3, BRK + 0.7) * fadeOut(t, t1 + 0.05, 0.35);
  if (hp > 0) { g.globalAlpha = a0 * hp; hudText('AR TEST · 실제 진료실에서 시험한 증강현실', CX, 136, { size: 34, align: 'center', color: C.mint }); g.fillStyle = hexA(C.mint, 0.6); g.fillRect(CX - 360 * hp, 166, 720 * hp, 2); }
  hp = pr(t, t1 + 0.5, t1 + 0.9) * fadeOut(t, t2 - 0.2, 0.35);
  if (hp > 0) { g.globalAlpha = a0 * hp; hudText('AI GLASSES · 눈 앞에 도착하는 정보', CX, 118, { size: 32, align: 'center', color: C.mint }); g.fillStyle = hexA(C.mint, 0.6); g.fillRect(CX - 300 * hp, 146, 600 * hp, 2); }
  g.globalAlpha = a0;
  // two real clips: the AR screenshot (bar 1), the face-tracked anatomy clip (bar 2), what each object is (bar 3)
  const exitP = Ease.inCubic(pr(t, t1 - 0.25, t1 + 0.3));
  if (exitP < 1) {
    g.globalAlpha = a0 * (1 - exitP);
    const p1 = popIn(t, BRK + 0.35, 0.5), p2 = popIn(t, b0 + bar - 0.1, 0.5), c0 = b0 + 2 * bar;
    photoPanel({ x: 560 - exitP * 500, y: 592, hud: true, par: 1, s: 1 }, 800, p1, {
      ry: 0.14, rz: -0.012, kb: pr(t, BRK, t1), title: 'AR 스크린샷 · 근관 길이 / 예약 / 내원 메모',
      over: (P) => {
        [[0.30, 0.21, 0.245, 0.21, '전자차트 내용'], [0.59, 0.535, 0.545, 0.535, '예약 내용'], [0.675, 0.80, 0.63, 0.80, '내원 메모']].forEach(([ox, oy, lx, ly, s], i) => {
          const a = P(ox, oy), b = P(lx, ly), tc = c0 + i * 2 * SPB;
          callout(a[0], a[1], b[0], b[1], s, pr(t, tc - 0.05, tc + 0.55), { size: 27 });
        });
      },
    });
    panel({ x: 1440 + exitP * 500, y: 592, hud: true, par: 1, s: 1 }, 500, 690, p2, { title: '얼굴 추적 · 해부 교육', ry: -0.16, rz: 0.012, r: 26 }, (w, h) => {
      skullFrame(-w / 2 + 20, -h / 2 + 62, w - 40, h - 82, t - b0);
      brackets(-w / 2 + 36, -h / 2 + 78, w - 72, h - 114, { len: 34, col: C.mint, lw: 4, alpha: 0.9 });
      pill('실제 화면', w / 2 - 30, -h / 2 + 30, { size: 19, align: 'right', col: C.mint, dot: C.coral });
    });
    g.globalAlpha = a0;
  }
  // the glasses, and everything they bring in front of the eyes: one word per half beat, then one lights up on each beat
  if (t > t1 - 0.2) {
    const out = Ease.inCubic(pr(t, t2 - 0.5, t2 + 0.2));
    g.globalAlpha = a0 * (1 - out);
    const draw = pr(t, t1 - 0.1, t1 + 0.9), lit = pr(t, t1 + 0.8, t1 + 1.3);
    glassesIcon(CX, CY + 24 + Math.sin(t * 1.3) * 6, 1.18 * (1 + 0.03 * bEnv(t, 7)) * (1 - out * 0.5), { draw, lit, lw: 10, c0: C.mint, c1: C.blue });
    burstRays(CX, CY + 24, pr(t, t1 + 0.8, t1 + 1.5), { col: C.mint, r0: 380, r: 360, n: 24, sy: 0.55 });
    const tk0 = t1 + 2 * SPB, all = tk0 + 5 * SPB;
    const hot = t >= all ? Math.floor((t - all) / SPB) % KEYS.length : -1, hk = t >= all ? Math.exp(-((t - all) % SPB) * 4.5) : 0;
    KEYS.forEach((s, i) => {
      const tk = tk0 + i * SPB * 0.5, q = popIn(t, tk, 0.3);
      if (q <= 0) return;
      const on = i === hot ? hk : 0, col = i % 3 === 0 ? C.amber : i % 3 === 1 ? C.mint : C.sky;
      const a = -Math.PI / 2 + (i / KEYS.length) * TAU + (t - t1) * 0.1, rx = lerp(660, 0, out), ry = lerp(318, 0, out);
      const x = CX + Math.cos(a) * rx, y = CY + 24 + Math.sin(a) * ry;
      g.strokeStyle = hexA(col, 0.35 + 0.65 * on); g.lineWidth = 2 + 4 * on; line(CX + Math.cos(a) * 320 * (1 - out), CY + 24 + Math.sin(a) * 105 * (1 - out), x, y);
      if (on > 0.02) { const u = 1 - on; circle(lerp(CX + Math.cos(a) * 320, x, u), lerp(CY + 24 + Math.sin(a) * 105, y, u), 9, '#FFFFFF'); }
      const k = q * (1 - out * 0.6) * (1 + 0.2 * on);
      g.save(); g.translate(x, y); g.scale(k, k); pill(s, 0, 0, { size: 40, w: 800, col, dot: col, bg: on > 0.3 ? 'rgba(20,52,72,0.92)' : undefined, lw: 2 + 3 * on }); g.restore();
    });
    g.globalAlpha = a0;
  }
}

/* ---------------- end title ---------------- */
function endTitle(t) {
  const l = LN[43];
  if (t < l.a - 0.6) return;
  const a0 = g.globalAlpha, fade = 1 - pr(t, DUR - 2.2, DUR - 0.7);
  g.globalAlpha = a0 * fade;
  glassesIcon(CX, 196, 0.7, { draw: pr(t, l.a - 0.5, l.a + 0.4), lit: pr(t, l.words[1].a, l.words[1].a + 0.5), lw: 11 });
  burstRays(CX, 196, pr(t, l.words[1].a, l.words[1].a + 0.8), { col: C.mint, r0: 240, r: 300, n: 22, sy: 0.5 });
  const p = pr(t, l.z + 0.2, l.z + 0.9);
  if (p > 0) {
    g.globalAlpha = a0 * fade * p;
    hudText('AI 안경 × 치과 진료', CX, 916, { size: 40, align: 'center', color: C.mint });
    g.fillStyle = hexA('#FFFFFF', 0.4); g.fillRect(CX - 250 * p, 948, 500 * p, 2);
    text('노래 아울러 · made with Suno', CX, 978, { size: 27, w: 600, color: hexA('#FFFFFF', 0.9) });
    text('화면 속 환자 정보는 모두 예시입니다', CX, 1012, { size: 20, w: 500, color: hexA('#FFFFFF', 0.66) });
  }
  g.globalAlpha = a0;
}

/* ---------------- HUD read-outs ---------------- */
function clockAt(t) {         // the working day runs through the song; the break is the night; the outro is tomorrow morning
  let m;
  if (t < BRK) m = 9 * 60 + pr(t, T(2), BRK) * 9 * 60;
  else if (t < OUT) m = 18 * 60 + pr(t, BRK, OUT) * 15 * 60;
  else m = 33 * 60 + (t - OUT) * 1.5;
  m = Math.floor(m) % (24 * 60);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function hudLabel(t) {
  if (t < T(8) - 0.3) return ['오늘 · 1절', 'PATIENT'];
  if (t < T(12) - 0.4) return ['프리코러스', 'FOCUS'];
  if (t < T(20) - 0.4) return ['후렴', 'AI GLASSES'];
  if (t < T(28) - 0.3) return ['2절', 'CLINICAL INFO'];
  if (t < T(32) - 0.4) return ['프리코러스', 'GAZE'];
  if (t < BRK) return ['후렴', 'AI GLASSES'];
  if (t < OUT - 0.5) return ['간주', t < BRK_T1 ? 'AR TEST FOOTAGE' : 'AI GLASSES'];
  return ['내일', 'TOMORROW'];
}

/* ---------------- sections (scrubber marks) ---------------- */
const SECTS = [
  { t: 0, name: '1절' }, { t: T(8) - 0.2, name: '프리코러스' }, { t: T(12) - 0.3, name: '후렴' },
  { t: T(20) - 0.3, name: '2절' }, { t: T(28) - 0.2, name: '프리코러스' }, { t: T(32) - 0.3, name: '후렴' },
  { t: BRK, name: '간주' }, { t: OUT - 0.3, name: '아웃트로' }, { t: DUR, name: 'END', kind: 'end' },
];

/* ---------------- frame ---------------- */
function patientState(t) {
  const bl = fract(t / 3.7), blink = bl > 0.96 ? Math.sin((bl - 0.96) / 0.04 * Math.PI) : 0;
  const direct = Math.max(win(t, T(10) - 0.3, T(11) + 0.3, 0.3, 0.4), win(t, T(29), T(31), 0.5, 0.4), win(t, OUT - 0.5, DUR, 1, 0.1), win(t, T(3) - 0.2, T(4), 0.3, 0.5));
  const gx = lerp(-0.9 + 0.5 * Math.sin(t * 0.4), 0, direct), gy = lerp(0.3, 0, direct);
  const talk = t > Wd(10, 3) && t < T(11) + 0.2 ? 0.5 + 0.5 * Math.sin(t * 15) : 0;
  return { gaze: [gx, gy], blink, talk, smile: lerp(0.45, 1, Math.max(direct, pr(t, OUT, OUT + 3))) };
}
function drawFrame(t) {
  NOW = t;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0; g.shadowOffsetY = 0; g.setLineDash([]);
  camera(t);
  const atDesk = t < T(3);
  drawWorld(t, {
    patient: patientState(t),
    screenFn: atDesk ? () => deskScreen(t) : null,
    mouse: atDesk ? [-440 + (cursorX(t) - (SCREEN.x + SCREEN.w / 2)) * 0.22, 1296] : null,
  });
  // yesterday's caption, before the glasses come on
  if (t < T(2) + 0.2) {
    const a = pr(t, 0.2, 0.9) * (1 - pr(t, T(2) - 0.4, T(2) + 0.1));
    if (a > 0) { g.globalAlpha = a; rr(84, H - 150, 372, 70, 35); g.fillStyle = 'rgba(16,30,42,0.72)'; g.fill(); text('어제', 122, H - 114, { size: 32, w: 800, align: 'left', color: '#FFD95C' }); text('화면 속의 기록', 196, H - 114, { size: 30, w: 600, align: 'left', color: '#FFFFFF' }); g.globalAlpha = 1; }
  }
  // the lenses dim the room for the overlay
  const v2 = t > T(31) + 0.5 && t < OUT ? pr(t, T(31) + 0.5, T(32)) * (1 - pr(t, OUT - 1, OUT + 1)) : 0;
  drawTint(dimAt(t), mixHex('#06141F', '#1B0E26', v2));
  // gloved hands (real, so under the overlay)
  const hands = Math.max(win(t, T(8) - 0.2, T(10) - 0.1, 0.6, 0.5) * 0.8, win(t, Wd(14, 2) - 0.3, T(15) + 0.2, 0.5, 0.5), win(t, Wd(34, 2) - 0.3, T(35) + 0.2, 0.5, 0.5), win(t, T(25) - 0.2, T(26), 0.5, 0.4) * 0.7);
  const free = (t > T(14) - 1 && t < T(15) + 1) || (t > T(34) - 1 && t < T(35) + 1);
  drawHands(t, hands, free ? { left: 'open', right: 'open', spread: 150, rot: 0.1 } : {});
  const hk = hudOn(t);
  if (hk > 0) {
    const chK = Math.max(win(t, T(12) - 0.4, T(20) - 0.3, 0.5, 0.5), win(t, T(32) - 0.4, BRK + 0.6, 0.5, 0.8));
    chorusFx(t, chK, t > T(20) ? 1 : 0);
    persistent(t);
    if (chK > 0) { const k = t > T(20) ? 32 : 12; chorusCues(t, k); dayOn(t, k); }
    breakScene(t);
    endTitle(t);
    // lyrics (the two desk lines are drawn on the monitor inside drawWorld)
    let R = null;
    for (let i = 2; i < LN.length; i++) { const r = drawLyric(LN[i], t); if (r) { R = r; R.line = LN[i]; if (chK > 0) chorusPost(t, t > T(20) ? 32 : 12, R); } }
  }
  drawVignette(lerp(0.55, 1, hk));
  const lab = hudLabel(t);
  drawHUD(t, hk, { label: lab[0], sub: lab[1], clock: clockAt(t), level: 0.25 + 0.75 * energy(t), batt: 0.9 - 0.25 * (t / DUR), alpha: 1 - 0.6 * pr(t, DUR - 2.2, DUR - 0.7) });
  // flashes: the display coming on, each chorus landing, the title
  let flash = 0;
  [[T(2) - 0.28, 0.4, 7], [T(12) - 0.1, 0.34, 6], [T(32) - 0.1, 0.34, 6], [T(43), 0.3, 5]].forEach(([t0, a, k]) => { if (t >= t0) flash += a * Math.exp(-(t - t0) * k); });
  // in from black, out to black
  const black = Math.max(1 - pr(t, 0.05, 1.0), pr(t, DUR - 1.6, DUR - 0.25));
  if (black > 0) { g.fillStyle = `rgba(2,8,14,${black})`; g.fillRect(0, 0, W, H); }
  return { flash };
}
