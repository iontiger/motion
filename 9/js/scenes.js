'use strict';
/* ============================================================
   SCENES — timeline, backgrounds, and one cartoon cue per lyric line
   ============================================================ */

/* ---------------- lines & sections ---------------- */
const LN = LYRICS.map(([sec, txt, words], i) => {
  const first = words[0][1], last = words[words.length - 1][2];
  return { i, sec, txt, words, first, last };
});
LN.forEach((l, i) => {
  const nx = LN[i + 1];
  l.a = l.first - 0.14;
  l.z = nx ? clamp(nx.first - 0.1, l.last + 0.35, l.last + 2.4) : l.last + 4.2;
});
const SECNAME = { 'Verse 1': '1절', 'Pre-Chorus': '프리코러스', Chorus: '후렴', 'Verse 2': '2절', 'Verse 3': '3절', Bridge: '브리지', 'Final Chorus': '마지막 후렴', Outro: '아웃트로' };
const SECTS = [];
LN.forEach((l, i) => { if (!i || l.sec !== LN[i - 1].sec) SECTS.push({ t: i ? Math.max(LN[i - 1].last + 0.3, l.first - 0.5) : 0, name: SECNAME[l.sec] || l.sec, sec: l.sec, li: i }); });
SECTS.push({ t: LN[LN.length - 1].last + 0.6, name: null, kind: 'end' });
SECTS.forEach((s) => (s.kind = s.kind || 'sec'));
let ENERGY = null, LAYOUTS = new Map();
const beatOf = (t) => (t - BEAT0) / SPB;
const beatPulse = (t, k = 7) => { const b = beatOf(t); return b < 0 ? 0 : Math.exp(-fract(b) * SPB * k); };
function curLine(t) { let k = -1; for (let i = 0; i < LN.length; i++) if (LN[i].a <= t) k = i; return k; }

/* ---------------- per-line plan: background, text slot, cue ----------------
   bg: room · under · hill · shore · pool · montage · park · trail · sunset · lake
   slot: where the lyric sits (T top, B bottom, L / R half, C centre)            */
const PLAN = [
  // Verse 1 — the family table, the story told again
  { bg: 'room', slot: 'T', cue: 'gather' },
  { bg: 'room', slot: 'R', cue: 'uncle', style: 'bubble' },
  { bg: 'room', slot: 'L', cue: 'flashRock' },
  { bg: 'room', slot: 'R', cue: 'panelHands' },
  { bg: 'room', slot: 'T', cue: 'wow' },
  { bg: 'room', slot: 'L', cue: 'flashStand' },
  // Pre-chorus 1 — the water rises
  { bg: 'under', slot: 'T', cue: 'rise', style: 'caption' },
  { bg: 'under', slot: 'T', cue: 'heartQ', style: 'caption' },
  { bg: 'under', slot: 'C', cue: 'sinkBear', style: 'sink' },
  { bg: 'under', slot: 'L', cue: 'panelFear', style: 'freeze' },
  // Chorus 1 — out into the sun, on the mountain path
  { bg: 'hill', slot: 'T', cue: 'hurdle', burst: true },
  { bg: 'hill', slot: 'T', cue: 'curtain' },
  { bg: 'hill', slot: 'T', cue: 'blush' },
  { bg: 'hill', slot: 'T', cue: 'scale' },
  { bg: 'hill', slot: 'T', cue: 'okStamp' },
  { bg: 'hill', slot: 'T', cue: 'sign' },
  { bg: 'shore', slot: 'T', cue: 'kids' },
  { bg: 'shore', slot: 'T', cue: 'vestDrop', style: 'hook' },
  // Verse 2 — the swimming pool
  { bg: 'pool', slot: 'R', cue: 'panelBrochure' },
  { bg: 'pool', slot: 'R', cue: 'poolEdge' },
  { bg: 'pool', slot: 'T', cue: 'neckDeep' },
  { bg: 'pool', slot: 'R', cue: 'panelFear2' },
  { bg: 'pool', slot: 'R', cue: 'panelCliff' },
  { bg: 'pool', slot: 'L', cue: 'photoTroll' },
  // Pre-chorus 2 — practice montage
  { bg: 'montage', slot: 'R', cue: 'grow', style: 'caption' },
  { bg: 'montage', slot: 'R', cue: 'panelGrad' },
  { bg: 'montage', slot: 'B', cue: 'lessons' },
  { bg: 'montage', slot: 'R', cue: 'panelSwim' },
];
// Chorus 2 repeats chorus 1's cues on a warmer sky
for (let k = 0; k < 8; k++) PLAN.push({ ...PLAN[10 + k], v: 2 });
PLAN.push(
  // Verse 3 — not fear, just taste
  { bg: 'park', slot: 'R', cue: 'swimGood' },
  { bg: 'park', slot: 'R', cue: 'panelMeh' },
  { bg: 'park', slot: 'R', cue: 'panelPark' },
  { bg: 'park', slot: 'T', cue: 'shrug' },
  { bg: 'trail', slot: 'R', cue: 'panelHike' },
  { bg: 'trail', slot: 'T', cue: 'uphill' },
  { bg: 'trail', slot: 'R', cue: 'panelMtn' },
  { bg: 'trail', slot: 'L', cue: 'panelRun' },
  // Bridge — sunset, the one thing to keep
  { bg: 'sunset', slot: 'T', cue: 'check1', style: 'caption' },
  { bg: 'sunset', slot: 'T', cue: 'check2', style: 'caption' },
  { bg: 'sunset', slot: 'T', cue: 'arms' },
  { bg: 'sunset', slot: 'R', cue: 'panelVestPeek' },
  // Final chorus
  { bg: 'hill', slot: 'T', cue: 'okStamp', v: 3, burst: true },
  { bg: 'hill', slot: 'T', cue: 'sign', v: 3 },
  { bg: 'hill', slot: 'T', cue: 'sprint', v: 3 },
  { bg: 'hill', slot: 'T', cue: 'compass', v: 3 },
  { bg: 'shore', slot: 'T', cue: 'kids', v: 3 },
  { bg: 'shore', slot: 'R', cue: 'panelVest', v: 3 },
  { bg: 'shore', slot: 'T', cue: 'vestDrop', v: 3, style: 'hook' },
  { bg: 'shore', slot: 'T', cue: 'remember', v: 3, style: 'hook' },
  // Outro — golden lake
  { bg: 'lake', slot: 'T', cue: 'fingertips', style: 'caption' },
  { bg: 'lake', slot: 'T', cue: 'oneWord' },
  { bg: 'lake', slot: 'T', cue: 'kidVest' },
  { bg: 'lake', slot: 'C', cue: 'finalStamp', style: 'stamp' },
);
// background spans (a background starts where its first line starts)
const BGS = [];
PLAN.forEach((p, i) => { if (!i || p.bg !== PLAN[i - 1].bg || (p.v || 0) !== (PLAN[i - 1].v || 0) && p.bg === 'hill' && !PLAN[i - 1].v) BGS.push({ bg: p.bg, li: i, v: p.v || 1, t: i ? (LN[i - 1].last + LN[i].first) / 2 : 0 }); });
// transition style into each background
const TRANS = { under: 'none', hill: 'splash', shore: 'wave', pool: 'iris', montage: 'wave', park: 'iris', trail: 'wave', sunset: 'fade', lake: 'fade', room: 'none' };

/* ---------------- images (the user's own comic panels) ---------------- */
const IMG = {};
const IMG_NAMES = ['gather', 'hands', 'brochure', 'fear', 'cliff', 'troll', 'grad', 'swim', 'lanes', 'coach', 'meh', 'park', 'hike', 'mtn', 'run', 'vest'];
function loadImages() {
  return Promise.all(IMG_NAMES.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = res; im.src = `img/${n}.jpg`; })));
}
// a comic panel: thick ink frame, white mat, hard shadow. (cx,cy) centre, w width
function panel(name, cx, cy, w, o = {}) {
  const im = IMG[name]; if (!im) return;
  const s = o.s == null ? 1 : o.s; if (s <= 0.01) return;
  const h = (w * im.height) / im.width, mat = o.mat == null ? 14 : o.mat;
  g.save(); g.translate(cx, cy); g.rotate(o.rot || 0); g.scale(s * (o.sx || 1), s * (o.sy || 1));
  const a0 = g.globalAlpha; if (o.alpha != null) g.globalAlpha = a0 * o.alpha;
  const W2 = w / 2 + mat, H2 = h / 2 + mat + (o.polaroid ? 40 : 0), oy = o.polaroid ? 40 : 0;
  g.fillStyle = P.shadow; g.fillRect(-W2 + 16, -H2 + 16, W2 * 2, H2 * 2);
  g.fillStyle = P.ink; g.fillRect(-W2 - 6, -H2 - 6, W2 * 2 + 12, H2 * 2 + 12);
  g.fillStyle = P.white; g.fillRect(-W2, -H2, W2 * 2, H2 * 2);
  g.drawImage(im, -w / 2, -h / 2 - oy, w, h);
  g.strokeStyle = P.ink; g.lineWidth = 5; g.strokeRect(-w / 2, -h / 2 - oy, w, h);
  if (o.polaroid && o.caption) text(o.caption, 0, h / 2 + 4, { size: 40, f: 'gaegu', color: P.ink });
  if (o.tape) { g.save(); g.rotate(-0.08); g.fillStyle = 'rgba(255,230,140,0.85)'; g.fillRect(-70, -H2 - 26, 140, 44); g.restore(); }
  g.globalAlpha = a0;
  g.restore();
}
// pop a panel in at a, out at z
function popPanel(name, t, L, cx, cy, w, rot = 0, o = {}) {
  const pin = Ease.outBack(clamp((t - L.a) / 0.45), 1.8), pout = clamp((t - (L.z - 0.22)) / 0.22);
  if (pin <= 0) return;
  const wob = Math.sin((t - L.a) * 3.2) * 0.012;
  const dir = o.exitDir || (cx < 960 ? -1 : 1), dx = Ease.inCubic(pout) * dir * 1400;
  panel(name, cx + dx, cy - (1 - clamp(pin)) * 60, w, { ...o, s: pin, rot: rot + wob + pout * 0.25 * dir });
}

/* ---------------- backgrounds ---------------- */
function bgRoom(t, lt) {
  fillAll('#FFEFD3');
  halftone('#FFDDA8', 0, 0, W, 860, 30, 5);
  // window with sky
  inked(pRR(1430, 110, 380, 300, 18), P.sky);
  cloud(1560 + Math.sin(t * 0.3) * 20, 250, 0.6);
  g.strokeStyle = P.ink; g.lineWidth = 8; line(1620, 110, 1620, 410); line(1430, 260, 1810, 260);
  // lamp swinging on the beat
  const sw = Math.sin(beatOf(t) * Math.PI) * 0.06;
  g.save(); g.translate(960, -10); g.rotate(sw);
  inkLine(0, 0, 0, 120, 6);
  inked(() => { g.beginPath(); g.moveTo(-80, 200); g.quadraticCurveTo(0, 90, 80, 200); g.closePath(); }, P.yellow);
  g.restore();
  // family heads behind the table
  const fam = [[140, P.white, 0.9], [330, P.brown, 0.7], [520, P.grey, 0.95], [1400, P.white, 0.85], [1590, P.brown, 0.65], [1780, P.white, 0.9]];
  fam.forEach(([x, col, s], k) => {
    const b = Math.max(0, Math.sin(beatOf(t) * Math.PI + k)) * 10;
    bear(x, 930 - b, s, { col, noLegs: true, arms: [0.2, 0.2], face: k % 3 === 1 ? 'happy' : 'calm', blink: fract(t * 0.3 + k * 0.37) < 0.04 ? 1 : 0 });
  });
  // table
  inked(() => { g.beginPath(); g.roundRect(-40, 860, W + 80, 300, 30); }, '#C98A52');
  g.fillStyle = '#B0743F'; g.fillRect(0, 900, W, 10);
  // cups clink on the beat
  const cl = beatPulse(t, 9);
  [[700, -1], [1220, 1]].forEach(([x, d]) => {
    g.save(); g.translate(x + d * cl * -12, 860); g.rotate(d * cl * -0.15);
    inked(pRR(-34, -86, 68, 86, 10), P.white); g.fillStyle = P.orange2; g.fillRect(-28, -60, 56, 54);
    inked(() => { g.beginPath(); g.arc(34 * d, -46, 18, -Math.PI / 2, Math.PI / 2, d < 0); }, null, LW);
    g.restore();
  });
  if (cl > 0.3) { g.strokeStyle = P.ink; g.lineWidth = 5; for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.5; line(960 + Math.cos(a) * 60, 760 + Math.sin(a) * 60, 960 + Math.cos(a) * (60 + 40 * cl), 760 + Math.sin(a) * (60 + 40 * cl)); } }
}
function bgUnder(t, lt) {
  // the room floods: water rises over the first 6 s, then we are under it
  const L0 = LN[6], L9 = LN[9];
  const lvl = lerp(H + 60, -80, Ease.inOutCubic(clamp((t - L0.a) / (LN[8].last - L0.a))));
  if (lvl > -60) bgRoom(t, lt);
  const gr = g.createLinearGradient(0, lvl, 0, H);
  gr.addColorStop(0, '#5CC4F7'); gr.addColorStop(1, '#1D6FC2');
  g.save();
  waterBand(lvl, t, '#5CC4F7', 18, 260, 1.4, false);
  g.beginPath(); g.rect(0, lvl - 30, W, H + 60); g.clip();
  g.fillStyle = gr; g.globalAlpha = 0.9; g.fillRect(0, lvl + 20, W, H); g.globalAlpha = 1;
  // light rays
  g.globalAlpha = 0.16; g.fillStyle = P.white;
  for (let k = 0; k < 6; k++) { const x = 200 + k * 330 + Math.sin(t * 0.6 + k) * 40; g.beginPath(); g.moveTo(x, lvl); g.lineTo(x + 90, lvl); g.lineTo(x + 260, H); g.lineTo(x + 120, H); g.fill(); }
  g.globalAlpha = 1;
  const freeze = t > L9.first + 0.6 ? 0.15 : 1;
  bubbles(60, W - 60, Math.max(0, lvl), H + 20, t * freeze + (freeze < 1 ? L9.first : 0), 26, 4, 20);
  g.restore();
  if (lvl < H) { g.strokeStyle = P.ink; g.lineWidth = LW; }
}
// sky + scrolling hills + winding path with the bear walking
function bgHill(t, lt, v) {
  const warm = v === 2, fin = v === 3;
  const gr = g.createLinearGradient(0, 0, 0, 700);
  gr.addColorStop(0, warm ? '#7FCBFF' : fin ? '#6CC6FF' : '#8FD6FF'); gr.addColorStop(1, warm ? '#FFF1D2' : '#E6F7FF');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (fin) { g.globalAlpha = 0.25; burst(1640, 170, 90, 1400, 28, t * 0.4, P.white, 7); g.globalAlpha = 1; }
  sun(1640, 170, 74, t);
  const sc = lt * (fin ? 150 : 90);
  for (let k = 0; k < 4; k++) cloud(((k * 560 - sc * 0.15 + 4000) % (W + 400)) - 200, 120 + (k % 2) * 90, 0.7 + (k % 3) * 0.15);
  // far mountains
  for (let k = 0; k < 5; k++) { const x = ((k * 520 - sc * 0.25) % 2600 + 2600) % 2600 - 300; mountain(x, 640, 640, 380 + (k % 2) * 90, k % 2 ? '#A9A4C9' : '#9DB6D6'); }
  hills(700, 120, 900, sc * 0.5, P.green, 1);
  hills(820, 90, 640, sc * 0.8, P.green2, 3);
  for (let k = 0; k < 7; k++) { const x = ((k * 330 - sc * 0.8) % 2310 + 2310) % 2310 - 160; tree(x, 800 + (k % 2) * 20, 0.8 + (k % 3) * 0.1, k % 2 ? P.green3 : '#4FA65A'); }
  // path
  inked(() => { g.beginPath(); g.moveTo(-40, H + 40); g.lineTo(-40, 930); g.bezierCurveTo(500, 880, 1300, 960, W + 40, 900); g.lineTo(W + 40, H + 40); g.closePath(); }, P.trail);
  g.fillStyle = '#CF9F62'; for (let k = 0; k < 14; k++) { const x = ((k * 150 - sc) % 2100 + 2100) % 2100 - 90; g.beginPath(); g.ellipse(x, 1000 + (k % 3) * 22, 16, 6, 0, 0, TAU); g.fill(); }
}
function walker(t, o = {}) {
  const run = o.run || 0, ph = t * (run ? 15 : 9.95);
  bear(o.x || 300, o.y || 985, o.s || 0.95, { walk: ph, run, face: o.face || 'happy', hat: o.hat, pack: o.pack, vest: o.vest, lean: o.lean || 0, blink: fract(t * 0.4) < 0.03 ? 1 : 0, arms: o.arms });
  if (run) { g.globalAlpha = 0.6; speedLines(-100, (o.y || 985) - 260, (o.x || 300) - 60, (o.y || 985) - 20, 8, t, P.ink, 2); g.globalAlpha = 1; }
}
function bgShore(t, lt, v) {
  const gr = g.createLinearGradient(0, 0, 0, 640);
  gr.addColorStop(0, '#78CCFF'); gr.addColorStop(1, '#E8F8FF');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  sun(260, 170, 64, t);
  cloud(820 + Math.sin(t * 0.2) * 60, 170, 0.8); cloud(1500 - lt * 8, 120, 0.6);
  waterBand(600, t, P.water, 12, 260, 0.8);
  inked(() => { g.beginPath(); g.moveTo(-40, H + 40); g.lineTo(-40, 820); g.bezierCurveTo(600, 760, 1200, 800, W + 40, 770); g.lineTo(W + 40, H + 40); g.closePath(); }, P.sand);
  g.fillStyle = '#E2BD7D'; for (let k = 0; k < 18; k++) { g.beginPath(); g.arc(rnd(k, 3) * W, 860 + rnd(k, 4) * 200, 4, 0, TAU); g.fill(); }
  // little boat far out
  const bx = 1700 + Math.sin(t * 0.5) * 30, by = 620 + Math.sin(t * 2) * 6;
  inked(() => { g.beginPath(); g.moveTo(bx - 70, by - 20); g.lineTo(bx + 70, by - 20); g.lineTo(bx + 45, by + 14); g.lineTo(bx - 45, by + 14); g.closePath(); }, '#E9573F', 5);
  inkLine(bx, by - 20, bx, by - 110, 5);
  inked(() => { g.beginPath(); g.moveTo(bx + 4, by - 106); g.lineTo(bx + 60, by - 34); g.lineTo(bx + 4, by - 34); g.closePath(); }, P.white, 5);
  // big bear watching on the left
  bear(250, 1010, 0.95, { face: 'calm', arms: [0.25, 0.25], blink: fract(t * 0.35) < 0.03 ? 1 : 0 });
}
function bgPool(t, lt) {
  fillAll('#F4FBFF');
  // wall tiles
  g.strokeStyle = '#CFE6F2'; g.lineWidth = 3;
  for (let x = 0; x <= W; x += 80) line(x, 0, x, 520);
  for (let y = 0; y <= 520; y += 80) line(0, y, W, y);
  // clock + flags line
  g.strokeStyle = P.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 90); g.quadraticCurveTo(W / 2, 150, W, 90); g.stroke();
  for (let k = 0; k < 16; k++) {
    const x = 60 + k * 120, y = 90 + Math.sin((x / W) * Math.PI) * 58;
    inked(() => { g.beginPath(); g.moveTo(x - 24, y); g.lineTo(x + 24, y); g.lineTo(x, y + 44 + Math.sin(t * 4 + k) * 4); g.closePath(); }, [P.red, P.yellow, P.water, P.white][k % 4], 4);
  }
  // pool edge
  inked(pRR(-40, 500, W + 80, 60, 0), '#E3EAEF');
  // water + tile grid through it
  const wy = 560;
  waterBand(wy, t, '#6CCBF5', 8, 300, 0.6, false);
  g.save(); g.beginPath(); g.rect(0, wy + 10, W, H); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
  for (let x = -200; x <= W + 200; x += 110) line(x + Math.sin(t + x) * 6, wy, x * 1.3 - 150, H);
  for (let y = wy + 60; y <= H; y += 70) line(0, y + Math.sin(t * 1.3 + y) * 4, W, y + Math.sin(t * 1.3 + y + 1) * 4);
  // caustics
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 4;
  for (let k = 0; k < 14; k++) { const x = rnd(k, 8) * W, y = wy + 80 + rnd(k, 9) * 420; g.beginPath(); g.ellipse(x + Math.sin(t + k) * 20, y, 40, 12, 0.3, 0, Math.PI * 1.3); g.stroke(); }
  g.restore();
  // lane ropes
  for (const [yy, a] of [[650, 1], [860, 0.9]]) {
    for (let x = -30; x < W + 40; x += 40) {
      const k = Math.round(x / 40), y = yy + Math.sin(t * 2.4 + k * 0.4) * 5;
      inked(pEllipse(x, y, 20 * a, 14 * a), k % 6 < 3 ? P.red : P.white, 4);
    }
  }
  // ladder
  g.strokeStyle = P.ink; g.lineWidth = 16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(1760, 700); g.lineTo(1760, 470); g.quadraticCurveTo(1760, 420, 1810, 420); g.stroke();
  g.beginPath(); g.moveTo(1860, 700); g.lineTo(1860, 470); g.quadraticCurveTo(1860, 420, 1910, 420); g.stroke();
  g.strokeStyle = '#D9E2E8'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(1760, 700); g.lineTo(1760, 470); g.quadraticCurveTo(1760, 420, 1810, 420); g.stroke();
  g.beginPath(); g.moveTo(1860, 700); g.lineTo(1860, 470); g.quadraticCurveTo(1860, 420, 1910, 420); g.stroke();
  g.lineCap = 'butt';
}
function bgMontage(t, lt) {
  fillAll(P.yellow);
  g.save(); g.translate(W / 2, H / 2); g.rotate(-0.35);
  g.fillStyle = '#FFC93A';
  const off = (t * 120) % 160;
  for (let x = -1600; x < 1600; x += 160) g.fillRect(x + off, -1400, 70, 2800);
  g.restore();
  halftone('rgba(255,122,26,0.35)', 0, 0, W, H, 34, 7, t * 10, 0);
  // calendar grid of days ticking by
  const days = Math.floor(clamp((t - LN[24].a) * 3.2, 0, 28));
  g.save(); g.translate(70, 640); g.rotate(-0.04);
  inked(pRR(0, 0, 520, 380, 20), P.white);
  inked(pRR(0, 0, 520, 70, { upperLeft: 20, upperRight: 20, lowerLeft: 0, lowerRight: 0 }), P.red);
  text('매일 매일', 260, 38, { size: 40, f: 'jua', color: P.white });
  for (let d = 0; d < 28; d++) {
    const x = 37 + (d % 7) * 74, y = 110 + Math.floor(d / 7) * 72;
    g.strokeStyle = '#E6DDCF'; g.lineWidth = 3; g.strokeRect(x - 30, y - 28, 60, 56);
    if (d < days) { const p = clamp((t - LN[24].a) * 3.2 - d); g.save(); g.translate(x, y); g.scale(Ease.outBack(p, 3), Ease.outBack(p, 3)); text('✓', 0, 2, { size: 46, w: 900, color: P.water2 }); g.restore(); }
  }
  g.restore();
}
function bgPark(t, lt) {
  const gr = g.createLinearGradient(0, 0, 0, 700);
  gr.addColorStop(0, '#86D4FF'); gr.addColorStop(1, '#EAF8FF');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  cloud(700 + lt * 6, 150, 0.8); cloud(1300 + lt * 4, 110, 0.6);
  // water slide tower
  const tx = 240;
  inked(pRR(tx - 55, 200, 110, 600, 6), '#F5F5F5');
  for (let y = 240; y < 790; y += 64) { g.fillStyle = P.red; g.fillRect(tx - 51, y, 102, 26); }
  inked(() => { g.beginPath(); g.moveTo(tx - 90, 210); g.lineTo(tx, 120); g.lineTo(tx + 90, 210); g.closePath(); }, P.red);
  g.strokeStyle = P.ink; g.lineWidth = 50; g.lineCap = 'round';
  const sl = () => { g.beginPath(); g.moveTo(tx + 40, 280); g.bezierCurveTo(tx + 360, 300, tx + 340, 480, tx + 90, 500); g.bezierCurveTo(tx - 150, 520, tx - 110, 680, tx + 240, 760); };
  sl(); g.stroke(); g.strokeStyle = P.yellow; g.lineWidth = 34; sl(); g.stroke(); g.lineCap = 'butt';
  // pool deck and water
  inked(pRR(-40, 760, W + 80, 40, 0), '#E7EEF2');
  waterBand(800, t, '#62C6F4', 10, 240, 0.9, false);
  // splashing kids, heads above the water
  for (let k = 0; k < 3; k++) {
    const x = 1080 + k * 300, y = 930 + Math.sin(t * 3 + k * 2) * 10;
    bear(x, y, 0.55, { col: k === 1 ? P.brown : P.white, face: 'happy', arms: [2.6 + Math.sin(t * 6 + k) * 0.3, 2.6 - Math.sin(t * 6 + k) * 0.3], noLegs: true });
  }
  g.save(); g.beginPath(); g.rect(0, 840, W, H); g.clip();
  waterBand(870, t * 1.3, '#62C6F4', 12, 200, 1.2);
  g.restore();
}
function bgTrail(t, lt) {
  const gr = g.createLinearGradient(0, 0, 0, 700);
  gr.addColorStop(0, '#7DCBFF'); gr.addColorStop(1, '#F2FAFF');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  sun(1660, 160, 64, t);
  mountain(520, 760, 1100, 640, '#9FB0C9'); mountain(1350, 760, 1000, 520, '#B4A9CF');
  hills(800, 100, 1000, lt * 30, P.green, 2);
  // uphill trail diagonal
  inked(() => { g.beginPath(); g.moveTo(-40, H + 40); g.lineTo(-40, 1040); g.bezierCurveTo(600, 980, 1100, 760, W + 40, 640); g.lineTo(W + 40, H + 40); g.closePath(); }, P.green2);
  inked(() => { g.beginPath(); g.moveTo(-40, 1100); g.bezierCurveTo(600, 1040, 1100, 840, W + 40, 720); g.lineTo(W + 40, 790); g.bezierCurveTo(1100, 910, 600, 1110, -40, 1170); g.closePath(); }, P.trail);
  for (let k = 0; k < 6; k++) tree(140 + k * 330, 990 - k * 64 + (k % 2) * 40 - 120, 0.6, k % 2 ? P.green3 : '#4FA65A');
}
function bgSunset(t, lt) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#7E79E0'); gr.addColorStop(0.45, '#FF92A8'); gr.addColorStop(0.75, '#FFC27A'); gr.addColorStop(1, '#FFE3A3');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 30; k++) { const tw = 0.5 + 0.5 * Math.sin(t * 2 + k); g.globalAlpha = tw * 0.8; circle(rnd(k, 1) * W, rnd(k, 2) * 360, 2 + rnd(k, 3) * 3, P.white); }
  g.globalAlpha = 1;
  inked(pCircle(960, 760, 170), '#FFD27A');
  mountain(300, 900, 1000, 460, '#6E5FB8', false); mountain(1500, 900, 1100, 400, '#7E6CC4', false);
  hills(900, 70, 1200, lt * 12, '#5B4FA0', 4);
  hills(990, 50, 800, lt * 24, '#4A3F88', 6);
}
function bgLake(t, lt) {
  const gr = g.createLinearGradient(0, 0, 0, 600);
  gr.addColorStop(0, '#FFC979'); gr.addColorStop(1, '#FFF0C9');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  inked(pCircle(1560, 330, 110), '#FFE7A0');
  mountain(1250, 600, 900, 300, '#E0A27A', false); mountain(420, 600, 1100, 380, '#D9906F', false);
  waterBand(560, t * 0.6, '#5FB3E8', 8, 300, 0.5);
  g.globalAlpha = 0.85; g.fillStyle = '#FFF1C2'; for (let k = 0; k < 6; k++) g.fillRect(1500 - k * 8 + Math.sin(t * 2 + k) * 10, 600 + k * 34, 120 + k * 16, 8); g.globalAlpha = 1;
  inked(() => { g.beginPath(); g.moveTo(-40, H + 40); g.lineTo(-40, 860); g.bezierCurveTo(600, 820, 1000, 900, 1300, 1000); g.quadraticCurveTo(1400, 1060, 1500, H + 40); g.closePath(); }, P.sand);
  // kid in a life vest, fishing; big bear beside
  const kx = 700, ky = 920;
  g.strokeStyle = P.ink; g.lineWidth = 6; g.beginPath(); g.moveTo(kx + 40, ky - 70); g.quadraticCurveTo(kx + 260, ky - 300, kx + 420, ky - 240); g.stroke();
  g.lineWidth = 2.5; line(kx + 420, ky - 240, kx + 420, 700 + Math.sin(t * 2) * 6);
  inked(pCircle(kx + 420, 700 + Math.sin(t * 2) * 6, 10), P.red, 4);
  bear(kx, ky, 0.62, { col: P.brown, face: 'happy', vest: true, arms: [0.6, 1.4], blink: fract(t * 0.4) < 0.04 ? 1 : 0 });
  bear(300, 1000, 0.95, { face: 'firm', arms: [0.4, 0.4] });
}
const BG = { room: bgRoom, under: bgUnder, hill: bgHill, shore: bgShore, pool: bgPool, montage: bgMontage, park: bgPark, trail: bgTrail, sunset: bgSunset, lake: bgLake };

/* ---------------- cues: one cartoon beat per lyric line ---------------- */
const inP = (t, L, d = 0.45) => clamp((t - L.a) / d);
const outP = (t, L, d = 0.22) => clamp((t - (L.z - d)) / d);
const wordT = (L, w) => { const k = L.words.findIndex((x) => x[0].includes(w)); return k < 0 ? L.first : L.words[k][1]; };
const CUE = {
  gather: (t, L) => popPanel('gather', t, L, 960, 600, 860, -0.02),
  uncle: (t, L) => {
    const p = Ease.outBack(inP(t, L, 0.4), 2), o = outP(t, L);
    bear(420, 960 + (1 - p) * 300 + o * 300, 1.25, { col: P.grey, face: 'happy', arms: [0.4, 2.3 + Math.sin(t * 8) * 0.25], blink: 0 });
  },
  flashRock: (t, L) => {
    const p = Ease.outBack(inP(t, L, 0.5), 1.6), o = 1 - outP(t, L);
    if (p <= 0) return;
    g.save(); g.translate(1360, 470); g.scale(p * o, p * o); g.translate(-1360, -470);
    thoughtCloud(1360, 470, 860, 620, 1100, 860, '#DDF3FF', 5);
    g.save(); cloudShape(1360, 470, 860, 620, 5); g.clip();
    waterBand(560, t, P.water, 16, 200, 1.6);
    rock(1360, 640, 420, 250, P.rock);
    // little hands gripping the wet rock, splashes
    const sh = Math.sin(t * 30) * 2;
    for (const dx of [-60, 40]) { inked(pEllipse(1360 + dx + sh, 420, 26, 20), P.white, 6); g.strokeStyle = P.ink; g.lineWidth = 3; for (let f = -1; f <= 1; f++) line(1360 + dx + sh + f * 10, 404, 1360 + dx + sh + f * 10, 416); }
    bear(1350 + sh, 640, 0.55, { face: 'scared', noArms: true, noLegs: true });
    waterBand(620, t + 2, P.water2, 20, 160, 2.2);
    g.restore(); g.restore();
  },
  panelHands: (t, L) => { popPanel('hands', t, L, 520, 520, 820, -0.03); stamp('생존 증거', 560, 880, 64, -0.12, P.red, (t - wordT(L, '증거')) / 0.25); },
  wow: (t, L) => {
    for (let k = 0; k < 5; k++) {
      const p = popE(t, L.a + k * 0.12, 0.4, 3);
      if (p <= 0) continue;
      const x = 340 + k * 310, y = 640 + Math.sin(t * 6 + k) * 8;
      g.save(); g.translate(x, y); g.scale(p, p); spiky(0, 0, 70, 70, 10, k); text('!', 0, 6, { size: 90, f: 'disp', color: P.red }); g.restore();
    }
  },
  flashStand: (t, L) => {
    const p = Ease.outBack(inP(t, L, 0.5), 1.6), o = 1 - outP(t, L);
    if (p <= 0) return;
    g.save(); g.translate(1360, 470); g.scale(p * o, p * o); g.translate(-1360, -470);
    thoughtCloud(1360, 470, 860, 620, 1100, 860, '#DDF3FF', 6);
    g.save(); cloudShape(1360, 470, 860, 620, 6); g.clip();
    waterBand(580, t, P.water, 16, 200, 1.6);
    rock(1360, 680, 460, 230, P.rock);
    bear(1360, 470, 0.62, { face: 'firm', arms: [1.7 + Math.sin(t * 5) * 0.08, 1.7 - Math.sin(t * 5) * 0.08] });
    waterBand(660, t + 2, P.water2, 20, 160, 2.2);
    g.restore(); g.restore();
  },
  rise: (t, L) => {},
  heartQ: (t, L) => {
    const p = popE(t, L.a, 0.5, 2), y = 620 + Math.sin(t * 2) * 20;
    if (p <= 0) return;
    g.save(); g.translate(960, y); g.scale(p, p); heart(0, 0, 2.6, P.pink); text('?', 0, -6, { size: 110, f: 'disp', color: P.white, outline: 14, ocol: P.ink }); g.restore();
  },
  sinkBear: (t, L) => {
    const s = clamp((t - L.a) / (L.z - L.a));
    bear(1560, 520 + s * 260, 0.9, { face: 'scared', arms: [2.5 + Math.sin(t * 9) * 0.3, 2.5 - Math.sin(t * 9) * 0.3], lean: Math.sin(t * 3) * 0.1 });
  },
  panelFear: (t, L) => {
    const fr = t > L.first + 0.6;
    bear(1500 + (fr ? 0 : Math.sin(t * 40) * 3), 800, 0.9, { face: 'scared', arms: [2.9, 2.9] });
    popPanel('fear', t, L, 1460, 380, 620, 0.05);
    if (fr) { g.globalAlpha = 0.5 * (1 - outP(t, L)); text('…', 1500, 560, { size: 120, f: 'disp', color: P.white }); g.globalAlpha = 1; }
  },
  hurdle: (t, L, v) => {
    // wave-shaped "겁" hurdles roll in; the bear hops over each one
    let jump = 0;
    for (let k = 0; k < 2; k++) {
      const hx = 2100 - (t - L.a) * 900 - k * 900;
      if (hx < -200 || hx > 2200) continue;
      inked(() => { g.beginPath(); g.moveTo(hx - 110, 975); g.bezierCurveTo(hx - 80, 790, hx + 80, 790, hx + 110, 975); g.closePath(); }, P.water2);
      g.strokeStyle = P.foam; g.lineWidth = 6; g.beginPath(); g.arc(hx - 10, 880, 34, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
      text('겁', hx, 920, { size: 62, f: 'disp', color: P.white });
      const d = (hx - 300) / 260;
      if (Math.abs(d) < 1) jump = Math.max(jump, Math.cos(d * Math.PI / 2));
    }
    g.save(); g.translate(0, -jump * 230);
    walker(t, { face: jump > 0.2 ? 'shout' : 'firm', arms: jump > 0.2 ? [2.6, 2.6] : null });
    g.restore();
  },
  curtain: (t, L) => {
    walker(t, { face: 'calm' });
    const ta = wordT(L, '답'), p = popE(t, L.a, 0.4, 2);
    if (t < ta && p > 0) { g.save(); g.translate(1250, 740 + Math.sin(t * 3) * 8); g.scale(p, p); thoughtCloud(0, 0, 360, 240, -260, 200, '#E9E6F5', 3); text('?', 0, 6, { size: 120, f: 'disp', color: P.grey2 }); g.restore(); }
    if (t >= ta) { const q = popE(t, ta, 0.4, 3); g.save(); g.translate(1250, 740); g.scale(q, q); spiky(0, 0, 170, 120, 12, 4, P.yellow); text('답!', 0, 6, { size: 104, f: 'disp', color: P.ink }); g.restore(); confetti(beatOf(t), beatOf(ta), 1250, 740, { n: 24, seed: 4 }); }
  },
  blush: (t, L) => { walker(t, { face: 'happy' }); const p = popE(t, wordT(L, '솔직'), 0.5, 2); if (p > 0) { g.save(); g.translate(1250, 760); g.scale(p, p); heart(0, 0, 2, P.pink); g.restore(); } },
  scale: (t, L) => {
    walker(t, { face: 'happy' });
    // seesaw: water vs mountain, tips toward the mountain on "산길"
    const tip = Ease.outBack(clamp((t - wordT(L, '산길')) / 0.6), 2) * 0.22;
    g.save(); g.translate(1250, 900);
    inked(() => { g.beginPath(); g.moveTo(-60, 70); g.lineTo(0, -10); g.lineTo(60, 70); g.closePath(); }, P.rock2);
    g.rotate(-tip);
    inked(pRR(-380, -30, 760, 30, 12), '#B07A45');
    inked(pCircle(-300, -110, 80), P.water); waterBand; text('물', -300, -104, { size: 70, f: 'jua', color: P.white, outline: 12, ocol: P.ink });
    g.save(); g.translate(300, -30); g.scale(1 + tip, 1 + tip); mountain(0, 0, 220, 190, P.green2); g.restore();
    g.restore();
    if (tip > 0.15) heart(1580, 640 + Math.sin(t * 5) * 8, 0.9, P.red);
  },
  okStamp: (t, L, v) => { walker(t, { face: 'happy', run: v === 3 ? 1 : 0, x: 320 }); stamp('괜찮아', 1250, 760, 120, -0.1, P.green3, (t - wordT(L, '괜찮아')) / 0.3); },
  sign: (t, L, v) => { walker(t, { face: 'firm', x: 320 }); const pick = t > wordT(L, '고르면') ? 1 : 0; signpost(1250, 1030, 1.15, t, pick); if (pick) confetti(beatOf(t), beatOf(wordT(L, '고르면')), 1500, 700, { n: 30, seed: 2, cols: [P.green2, P.yellow, P.orange, P.white] }); },
  kids: (t, L) => {
    for (let k = 0; k < 2; k++) {
      const p = popE(t, L.a + k * 0.2, 0.5, 2.4), x = 1080 + k * 330, hop = Math.abs(Math.sin(t * 6 + k * 1.3)) * 30;
      if (p > 0) { g.save(); g.translate(x, 900); g.scale(p, p); bear(0, -hop, 0.78, { col: k ? P.brown : '#F3E4D0', face: 'happy', arms: [2.4, 2.4], walk: t * 10 + k, walkAmp: 0.3 }); g.restore(); }
    }
    const q = popE(t, wordT(L, '아이들'), 0.4, 3); if (q > 0) { g.save(); g.translate(1650, 620); g.scale(q, q); spiky(0, 0, 80, 80, 10, 3, P.yellow); text('!', 0, 6, { size: 96, f: 'disp', color: P.red }); g.restore(); }
  },
  vestDrop: (t, L, v) => {
    const td = wordT(L, '구명조끼'), land = (L.words.find((w) => w[0].includes('입혀')) || L.words[L.words.length - 1])[1];
    for (let k = 0; k < 2; k++) {
      const x = 1080 + k * 330, landed = t > land + k * 0.1;
      bear(x, 900, 0.78, { col: k ? P.brown : '#F3E4D0', face: landed ? 'happy' : 'calm', arms: landed ? [2.6, 2.6] : [0.4, 0.4], vest: landed });
      if (!landed && t > td - 0.3) {
        const p = clamp((t - (td - 0.3)) / (land + k * 0.1 - td + 0.3));
        lifeVest(x, lerp(-200, 760, Ease.inQuad(p)), 0.62, Math.sin(t * 10 + k) * 0.3);
      }
      if (landed) ring(beatOf(t), beatOf(land + k * 0.1), x, 800, { r: 220, col: P.orange, lw: 14 });
    }
    if (t > land) confetti(beatOf(t), beatOf(land), 1240, 700, { n: 70, seed: 7, v0: 700, v1: 1700, cols: [P.orange, P.yellow, P.white, P.water, P.red], life: 1.8 });
    stamp('꼭!', 1640, 400, 110, 0.14, P.orange, (t - (L.words.find((w) => w[0] === '꼭') || L.words[0])[1]) / 0.25);
  },
  panelBrochure: (t, L) => popPanel('brochure', t, L, 560, 360, 820, -0.03),
  poolEdge: (t, L) => {
    const sh = Math.sin(t * 34) * (t > wordT(L, '첫') ? 3 : 0);
    bear(560 + sh, 520, 0.95, { face: 'scared', cap: true, arms: [0.15, 0.15] });
    const p = popE(t, wordT(L, '첫'), 0.4, 3);
    if (p > 0) { g.save(); g.translate(330, 260); g.rotate(-0.1); g.scale(p, p); inked(pRR(-140, -46, 280, 92, 16), P.red); text('첫 수업', 0, 4, { size: 58, f: 'jua', color: P.white }); g.restore(); }
  },
  neckDeep: (t, L) => {
    const up = clamp((t - wordT(L, '떨어지자')) / 1.2), y = lerp(860, 690, Ease.inOutCubic(up));
    bear(960 + Math.sin(t * 30) * up * 4, 780, 1.05, { face: up > 0.5 ? 'scared' : 'calm', cap: true, arms: [2.6 + Math.sin(t * 12) * 0.3, 2.6 - Math.sin(t * 12) * 0.3] });
    g.save(); g.beginPath(); g.rect(0, y - 40, W, H); g.clip();
    waterBand(y, t * 1.4, 'rgba(108,203,245,0.94)', 14, 200, 1.5, true);
    g.restore();
    const q = popE(t, wordT(L, '겁'), 0.4, 3); if (q > 0) { g.save(); g.translate(1430, 360); g.scale(q, q); g.rotate(Math.sin(t * 30) * 0.05); spiky(0, 0, 150, 120, 14, 2, P.white); text('겁!', 0, 8, { size: 110, f: 'disp', color: P.red }); g.restore(); }
  },
  panelFear2: (t, L) => popPanel('fear', t, L, 540, 540, 860, -0.03),
  panelCliff: (t, L) => popPanel('cliff', t, L, 540, 520, 820, 0.03),
  photoTroll: (t, L) => {
    const sh = t > wordT(L, '굳었어') ? Math.sin(t * 40) * 6 : 0;
    popPanel('troll', t, L, 1380 + sh, 500, 760, 0.04, { polaroid: true, caption: '사진 속 절벽', tape: true });
    const p = popE(t, wordT(L, '다리가'), 0.3, 3); if (p > 0) { text('덜덜', 1700 + sh, 860, { size: 64, f: 'jua', color: P.white, outline: 12, ocol: P.ink, alpha: p }); }
  },
  grow: (t, L) => {
    const p = clamp((t - L.a) / (L.last - L.a));
    bear(560, 980, lerp(0.5, 1.1, Ease.inOutCubic(p)), { face: 'calm', arms: [0.3, 0.3], walk: t * 4, walkAmp: 0.15 });
    g.globalAlpha = 1 - p * 0.7; inked(pCircle(140 - p * 200, 300, 70), P.water); mountain(980 + p * 300, 420, 200, 180, P.rock); g.globalAlpha = 1;
  },
  panelGrad: (t, L) => popPanel('grad', t, L, 560, 460, 780, -0.03),
  lessons: (t, L) => {
    popPanel('lanes', t, L, 560, 360, 700, -0.04);
    const L2 = { a: wordT(L, '개인'), z: L.z }; popPanel('coach', t, L2, 1360, 360, 680, 0.04);
  },
  panelSwim: (t, L) => {
    popPanel('swim', t, L, 560, 480, 800, -0.03);
    ['굿!', '최고!', '빠르다!'].forEach((s, k) => { const p = popE(t, L.a + 0.5 + k * 0.4, 0.4, 3); if (p > 0) { g.save(); g.translate(240 + k * 330, 870 - (k % 2) * 40); g.scale(p, p); bubble(0, 0, 220, 100, -40 + k * 40, 90); text(s, 0, 4, { size: 48, f: 'jua', color: P.ink }); g.restore(); } });
  },
  swimGood: (t, L) => {
    const x = lerp(-100, 1000, clamp((t - L.a) / (L.z - L.a)));
    g.save(); g.translate(x, 900); g.rotate(-1.35);
    bear(0, 0, 0.95, { face: 'firm', cap: true, arms: [Math.PI * 0.9 + Math.sin(t * 9) * 0.9, Math.PI * 0.9 - Math.sin(t * 9) * 0.9], noLegs: false });
    g.restore();
    for (let k = 0; k < 6; k++) { const a = t * 8 + k; circle(x - 80 - k * 44, 900 + Math.sin(a) * 18, 12 - k, P.white); }
  },
  panelMeh: (t, L) => popPanel('meh', t, L, 560, 480, 640, -0.03),
  panelPark: (t, L) => popPanel('park', t, L, 560, 500, 700, 0.03),
  shrug: (t, L) => {
    const s = Math.sin(clamp((t - wordT(L, '아니구나')) / 0.5) * Math.PI);
    bear(960, 1000, 1.1, { face: 'meh', arms: [1.9 + s * 0.4, 1.9 + s * 0.4], lean: 0 });
    stamp('취향 아님', 1460, 760, 84, 0.12, P.purple, (t - wordT(L, '취향')) / 0.3);
  },
  panelHike: (t, L) => popPanel('hike', t, L, 560, 480, 760, -0.03),
  uphill: (t, L) => { bear(lerp(300, 1100, clamp((t - L.a) / 3)), lerp(1080, 900, clamp((t - L.a) / 3)), 0.9, { walk: t * 9, face: 'happy', hat: true, pack: true, lean: -0.15 }); },
  panelMtn: (t, L) => popPanel('mtn', t, L, 560, 520, 840, -0.03),
  panelRun: (t, L) => { popPanel('run', t, L, 1360, 470, 840, 0.03); },
  check1: (t, L) => { bear(960, 1000, 0.9, { face: 'calm', arms: [0.3, 0.3] }); check(1640, 640, 1.5, (t - wordT(L, '좋은')) / 0.5); },
  check2: (t, L) => { bear(960, 1000, 0.9, { face: 'happy', arms: [0.3, 2.4] }); check(1640, 640, 1.5, 1); check(1800, 760, 1.2, (t - wordT(L, '좋은')) / 0.5); },
  arms: (t, L) => {
    const p = Ease.outBack(inP(t, L, 0.5), 2);
    bear(960, 1000 + (1 - p) * 200, 1.25, { face: 'firm', arms: [1.4, 1.4], armLen: 40 });
    if (t > wordT(L, '꼭')) { const q = popE(t, wordT(L, '꼭'), 0.35, 3); g.save(); g.translate(1320, 560); g.scale(q, q); spiky(0, 0, 90, 90, 12, 5, P.yellow); text('!', 0, 6, { size: 100, f: 'disp', color: P.red }); g.restore(); }
  },
  panelVestPeek: (t, L) => popPanel('vest', t, L, 560, 520, 820, -0.03),
  sprint: (t, L) => { walker(t, { run: 1, face: 'firm', x: 420, vest: false }); stamp('충분해', 1300, 760, 110, -0.08, P.orange, (t - wordT(L, '충분해')) / 0.3); },
  compass: (t, L) => {
    walker(t, { face: 'happy', x: 320 });
    g.save(); g.translate(1250, 760);
    inked(pCircle(0, 0, 190), P.white); inked(pCircle(0, 0, 150), '#FFF4DE', 5);
    ['산', '', '물', ''].forEach((s, k) => s && text(s, Math.sin((k * Math.PI) / 2) * 118, -Math.cos((k * Math.PI) / 2) * 118 + 4, { size: 48, f: 'jua', color: P.ink }));
    const ang = lerp(2.4, 0, Ease.outBack(clamp((t - wordT(L, '방향')) / 0.8), 2.2)) + Math.sin(t * 6) * 0.04;
    g.rotate(ang);
    inked(() => { g.beginPath(); g.moveTo(0, -120); g.lineTo(26, 0); g.lineTo(-26, 0); g.closePath(); }, P.red, 5);
    inked(() => { g.beginPath(); g.moveTo(0, 120); g.lineTo(26, 0); g.lineTo(-26, 0); g.closePath(); }, P.grey, 5);
    inked(pCircle(0, 0, 18), P.ink, 0);
    g.restore();
    heart(1250, 520 + Math.sin(t * 4) * 10, 0.7, P.red);
  },
  panelVest: (t, L) => { popPanel('vest', t, L, 540, 520, 860, -0.03); },
  remember: (t, L) => {
    CUE.vestDrop(t, L, 3);
    stamp('명심해', 760, 700, 110, -0.1, P.red, (t - L.first) / 0.3);
  },
  fingertips: (t, L) => { popPanel('hands', t, L, 1400, 420, 640, 0.03, { alpha: 0.9 }); },
  oneWord: (t, L) => { const p = popE(t, wordT(L, '한마디'), 0.4, 2.5); if (p > 0) { g.save(); g.translate(1450, 620); g.scale(p, p); bubble(0, 0, 360, 160, -160, 240); text('한마디!', 0, 4, { size: 70, f: 'jua', color: P.orange }); g.restore(); } },
  kidVest: (t, L) => { const p = Ease.outBack(inP(t, L, 0.5), 1.6); stamp('구명조끼', 1500, 760, 84, -0.08, P.orange, (t - wordT(L, '구명조끼')) / 0.3); },
  finalStamp: (t, L) => {
    const p = Ease.outBack(clamp((t - L.a) / 0.5), 1.6);
    g.save(); g.globalAlpha = 0.95; burst(960, 540, 300, 1400, 36, t, 'rgba(255,255,255,0.55)', 4); g.restore();
    lifeVest(960, 300 + Math.sin(t * 2) * 8, 0.9 * p, Math.sin(t * 1.5) * 0.08);
  },
};

/* ---------------- background + transition ---------------- */
function bgAt(t) {
  let k = 0; for (let i = 0; i < BGS.length; i++) if (BGS[i].t <= t) k = i;
  return k;
}
function drawBackground(t) {
  const k = bgAt(t), b = BGS[k];
  let flash = 0, wiped = false;
  for (let i = 1; i < BGS.length; i++) {
    const tb = BGS[i].t, d = t - tb, kind = TRANS[BGS[i].bg];
    if (kind !== 'wave' || Math.abs(d) >= 0.4) continue;
    const p = Ease.inOutCubic((d + 0.4) / 0.8), o = BGS[i - 1], n = BGS[i];
    const xf = lerp(-260, W + 260, p);
    const edge = (x0) => { g.beginPath(); g.moveTo(-60, -60); for (let y = -60; y <= H + 60; y += 24) g.lineTo(x0 + Math.sin(y / 70 + t * 9) * 46, y); g.lineTo(-60, H + 60); g.closePath(); };
    BG[o.bg](t, t - o.t, o.v);
    g.save(); edge(xf); g.clip(); BG[n.bg](t, t - n.t, n.v); g.restore();
    const col = n.bg === 'pool' || n.bg === 'shore' ? P.water : n.bg === 'montage' ? P.orange : P.green2;
    // the band between the two wavy edges
    g.save(); g.beginPath();
    for (let y = -60; y <= H + 60; y += 24) g.lineTo(xf + 80 + Math.sin(y / 70 + t * 9) * 46, y);
    for (let y = H + 60; y >= -60; y -= 24) g.lineTo(xf - 6 + Math.sin(y / 70 + t * 9) * 46, y);
    g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = P.ink; g.lineWidth = LW * 1.4; g.stroke();
    g.fillStyle = P.white; for (let y = 0; y < H; y += 140) { const yy = y + fract(t * 0.7) * 140; circle(xf + 36 + Math.sin(yy / 70 + t * 9) * 46, yy, 9, P.white); }
    g.restore();
    wiped = true; break;
  }
  if (!wiped) BG[b.bg](t, t - b.t, b.v);
  // cues: the line that is leaving and the line that is arriving
  const li = curLine(t);
  let walkerDrawn = false;
  for (const k2 of [li - 1, li]) {
    if (k2 < 0 || t > LN[k2].z + 0.02 || t < LN[k2].a) continue;
    const p = PLAN[k2], fn = CUE[p.cue];
    if (p.bg !== BGS[bgAt(t)].bg) continue;
    if (fn) fn(t, LN[k2], p.v || 1);
    if (WALKS.includes(p.cue)) walkerDrawn = true;
  }
  if (BGS[bgAt(t)].bg === 'hill' && !walkerDrawn && !wiped) walker(t);
  for (let i = 1; i < BGS.length; i++) {
    const tb = BGS[i].t, d = t - tb, kind = TRANS[BGS[i].bg];
    if (Math.abs(d) > 0.6) continue;
    if (kind === 'iris') iris(d, BGS[i].bg);
    else if (kind === 'splash') { if (d >= 0 && d < 0.5) flash = Math.max(flash, (1 - d / 0.5) * 0.9); if (d > -0.35 && d < 0) { bubbles(0, W, 0, H, t, 60, 12, 40); } }
    else if (kind === 'fade') { if (d >= 0 && d < 0.6) { g.globalAlpha = 1 - d / 0.6; g.fillStyle = BGS[i].bg === 'lake' ? '#FFE7B8' : '#FFB98A'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } }
  }
  return flash;
}
const WALKS = ['okStamp', 'sign', 'sprint', 'compass', 'hurdle', 'curtain', 'blush', 'scale'];
// a big inked wave that sweeps across; p in [-1,1], 0 = fully covering
function waveWipe(p, col) {
  if (p <= -1 || p >= 1) return;
  const xf = lerp(-300, W + 2300, (p + 1) / 2), xb = xf - W - 900;
  inked(() => {
    g.beginPath(); g.moveTo(xb, -60);
    for (let y = -60; y <= H + 60; y += 30) g.lineTo(xf + Math.sin(y / 90 + p * 6) * 60, y);
    for (let y = H + 60; y >= -60; y -= 30) g.lineTo(xb + Math.sin(y / 90 + p * 6 + 1) * 60, y);
    g.closePath();
  }, col, LW * 1.5);
}
function iris(d, bg) {
  const r = d < 0 ? lerp(1300, 0, Ease.inCubic(clamp((d + 0.5) / 0.5))) : lerp(0, 1300, Ease.outCubic(clamp(d / 0.5)));
  if (r >= 1290) return;
  g.fillStyle = P.ink; g.beginPath(); g.rect(-10, -10, W + 20, H + 20); g.arc(960, 560, Math.max(0, r), 0, TAU, true); g.fill('evenodd');
}

/* ---------------- frame ---------------- */
function drawFrame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  const flash = drawBackground(t);
  drawLyrics(t);
  drawChrome(t);
  return { flash };
}
// small badge (top-left) + intro/outro title cards
function drawChrome(t) {
  const endT = SECTS[SECTS.length - 1].t;
  if (t > endT - 0.4) { drawEndCard(t - endT + 0.4); return; }
  drawTitle(t);
}
function drawTitle(t) {
  const p = Ease.outBack(clamp(t / 0.5), 1.8), o = 1 - clamp((t - 5.6) / 0.4);
  if (o <= 0) return;
  g.save(); g.translate(960, 965 + Ease.inCubic(1 - o) * 300); g.scale(p * 0.8, p * 0.8); g.rotate(-0.02);
  hardShadow(() => { g.beginPath(); g.roundRect(-520, -90, 1040, 180, 40); g.fill(); }, 14, 14);
  inked(pRR(-520, -90, 1040, 180, 40), P.orange, LW * 1.4);
  stickText('구명조끼부터 입혀 줘', 0, 0, 108, P.white);
  g.restore();
}
function drawEndCard(d) {
  const p = Ease.outBack(clamp(d / 0.6), 1.6);
  fillAll(P.paper);
  halftone('#FFE0B0', 0, 0, W, H, 30, 5);
  g.globalAlpha = 0.5; burst(960, 400, 260, 1500, 40, d, '#FFD9A0', 6); g.globalAlpha = 1;
  lifeVest(960, 380 + Math.sin(d * 2) * 10, 1.7 * p, Math.sin(d * 1.5) * 0.06);
  bear(380, 1000, 1.1, { face: 'happy', arms: [0.3, 2.4 + Math.sin(d * 6) * 0.2], blink: fract(d * 0.4) < 0.04 ? 1 : 0 });
  bear(1560, 1000, 0.75, { col: P.brown, face: 'happy', vest: true, arms: [2.5, 2.5], walk: d * 8, walkAmp: 0.2 });
  const q = clamp((d - 0.4) / 0.5);
  g.globalAlpha = q;
  stickText('구명조끼부터 입혀 줘', 960, 790, 120, P.orange);
  text('노래 · 만화 iontiger  ·  made with Suno', 960, 920, { size: 34, w: 700, color: P.ink });
  g.globalAlpha = 1;
}
