'use strict';
/* ============================================================
   MUSIC — 108 BPM funk in E dorian: slap bass, clavinet, wah
   guitar, Rhodes and a brass section over a syncopated kit.
   arrange() builds a pure event list; every on-screen entrance
   registered with hit() in scenes.js gets its own accent here, so
   picture and sound share one cue sheet. renderSong() synthesizes
   the list offline with Web Audio.
   ============================================================ */
const T = (bar, beat = 0) => (bar * 4 + beat) * SPB;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NBARS = 54;

const CHD = {
  Em: { root: 40, ep: [62, 66, 67, 71], top: [64, 67, 71, 74], gtr: [71, 74, 78] },
  A7: { root: 45, ep: [61, 64, 66, 67], top: [64, 67, 69, 73], gtr: [69, 73, 76] },
  C9: { root: 36, ep: [59, 62, 64, 67], top: [64, 67, 71, 74], gtr: [67, 71, 74] },
  D9: { root: 38, ep: [60, 64, 66, 69], top: [66, 69, 72, 76], gtr: [69, 72, 76] },
  B7: { root: 35, ep: [57, 63, 66, 69], top: [63, 66, 69, 74], gtr: [69, 74, 78] },
  Am: { root: 45, ep: [60, 64, 67, 71], top: [64, 67, 72, 76], gtr: [67, 72, 76] },
};
const CHORD_BARS = (
  'Em Em Em B7 ' +                       // 0–3   intro
  'Em A7 Em A7 ' +                       // 4–7   title (hook)
  'Em A7 Em A7 Em A7 C9 B7 ' +           // 8–15  ① 상장
  'C9 D9 Em Em C9 D9 Em B7 ' +           // 16–23 ② 지수
  'Em Em A7 A7 Em A7 Em A7 Am D9 C9 B7 ' + // 24–35 ③ 엔비디아와 수혜주
  'C9 D9 Em A7 C9 D9 Em Em Am D9 C9 B7 ' + // 36–47 ④ 삼성전자
  'Em A7 Em A7 Em Em'                    // 48–53 outro
).trim().split(/\s+/);
const chordOf = (bar) => CHD[CHORD_BARS[clamp(bar, 0, CHORD_BARS.length - 1)]];
const PENTA = [64, 67, 69, 71, 74, 76, 79, 81, 83, 86, 88, 91]; // E minor pentatonic

// drum grids, one char per 16th: X accent, x hit, g ghost, o open hat
const DR = {
  A: { k: 'X..x......x.....', s: '....X..g.g..X..g', h: 'x.xxx.xxx.xxx.ox' },
  B: { k: 'X..x..x...x..x..', s: '....X..g.g..X.gg', h: 'x.xxx.xox.xxx.ox' },
  C: { k: 'X.....x...x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' },   // light
  D: { k: 'X..x....x.x.....', s: '....X..g....X..g', h: 'xxxxxxxxxxxxxxox' },
};
// bass riff: [16th, semitones above root, length, kind]  n=finger, p=pop, g=ghost
const RIFF = {
  A: [[0, 0, 2, 'n'], [3, 0, 1, 'n'], [6, 10, 1, 'p'], [7, 12, 1, 'p'], [10, 0, 1.5, 'n'], [12, 7, 1, 'n'], [13, 10, 1, 'n']],
  B: [[0, 0, 2, 'n'], [3, 0, 1, 'g'], [4, 0, 1, 'n'], [6, 12, 1, 'p'], [8, 7, 1, 'n'], [10, 10, 1, 'p'], [11, 12, 1, 'p'], [13, 5, 1, 'n']],
  C: [[0, 0, 3, 'n'], [6, 7, 1, 'n'], [7, 10, 1, 'n'], [10, 0, 2, 'n']],
};
// brass hook: [16th, melody note, length]
const HOOK = [
  [[0, 76, 2], [3, 74, 1], [4, 76, 2], [10, 79, 1], [12, 76, 3]],
  [[0, 76, 2], [3, 74, 1], [4, 73, 2], [10, 71, 1], [11, 73, 1], [12, 76, 3]],
  [[0, 79, 2], [3, 76, 1], [4, 79, 2], [10, 83, 1], [12, 81, 3]],
  [[0, 81, 1], [2, 79, 1], [4, 76, 2], [7, 73, 1], [8, 74, 1], [10, 76, 4]],
];

function arrange() {
  const ev = [];
  const A = (i, t, o = {}) => { ev.push(Object.assign({ i, t }, o)); };
  const S16 = SPB / 4;
  const B_ = (b) => b * SPB;

  function drums(bar, pat = 'A', o = {}) {
    const p = DR[pat], cut = o.cut != null ? o.cut * 4 : 99, lv = o.v || 1;
    for (let s = 0; s < 16; s++) {
      if (s >= cut) break;
      const sw = s % 2 ? S16 * 0.14 : 0;            // a touch of swing on the off 16ths
      const t = T(bar) + s * S16 + sw;
      const k = p.k[s], sn = p.s[s], h = p.h[s];
      if (k !== '.' && o.kick !== false) A('kick', t, { v: (k === 'X' ? 1 : 0.8) * lv, sc: 0.82 });
      if (sn !== '.' && o.snare !== false) A('snare', t, { v: (sn === 'X' ? 0.95 : 0.2) * lv });
      if (h !== '.' && o.hat !== false) A('hat', t, { v: (h === 'o' ? 0.3 : s % 4 === 0 ? 0.3 : s % 2 === 0 ? 0.22 : 0.13) * (o.hv || 1), open: h === 'o' });
    }
    if (o.conga) [[1, 0], [3, 1], [6, 1], [7, 0], [9, 0], [11, 1], [14, 0], [15, 1]].forEach(([s, hi]) => { if (s < cut) A('conga', T(bar) + s * S16 + (s % 2 ? S16 * 0.14 : 0), { hi, v: 0.5 }); });
    if (o.tamb) for (let s = 2; s < 16; s += 4) if (s < cut) A('shaker', T(bar) + s * S16, { v: 0.5 });
  }
  function bass(bar, pat = 'A', o = {}) {
    const r = chordOf(bar).root, cut = o.cut != null ? o.cut * 4 : 99;
    for (const [s, iv, l, k] of RIFF[pat]) {
      if (s >= cut) break;
      A('slap', T(bar) + s * S16 + (s % 2 ? S16 * 0.14 : 0), { n: r + iv, d: l * S16 * 0.9, v: o.v || 0.9, k });
    }
    if (o.lead !== false && cut > 15) {              // chromatic walk-up into the next bar's root
      const nx = chordOf(bar + 1).root;
      A('slap', T(bar) + 14 * S16, { n: nx - 2, d: S16 * 0.8, v: 0.75, k: 'n' });
      A('slap', T(bar) + 15 * S16 + S16 * 0.14, { n: nx - 1, d: S16 * 0.8, v: 0.8, k: 'n' });
    }
  }
  function clav(bar, o = {}) {
    const n = chordOf(bar).ep.slice(1), cut = o.cut != null ? o.cut * 4 : 99;
    for (const s of o.pat || [2, 5, 8, 11, 14]) { if (s >= cut) break; A('clav', T(bar) + s * S16 + (s % 2 ? S16 * 0.14 : 0), { notes: n, v: (o.v || 0.5) * (s % 4 === 2 ? 1 : 0.75) }); }
  }
  function wah(bar, o = {}) {
    const n = chordOf(bar).gtr, cut = o.cut != null ? o.cut * 4 : 99;
    for (const s of o.pat || [2, 3, 6, 10, 11, 14]) { if (s >= cut) break; A('wah', T(bar) + s * S16 + (s % 2 ? S16 * 0.14 : 0), { notes: n, v: (o.v || 0.4) * (s % 2 ? 0.6 : 1), up: s % 4 === 2 }); }
  }
  function rhodes(bar, o = {}) {
    const n = chordOf(bar).ep, cut = o.cut != null ? o.cut : 9;
    for (const [b, d] of o.pat || [[0, 1.4], [1.75, 0.5], [2.5, 1.2]]) { if (b >= cut) break; A('keys', T(bar, b), { notes: n, d: d * SPB, v: o.v || 0.34, bright: 1.1 }); }
  }
  function pad(bar, o = {}) { A('pad', T(bar), { notes: chordOf(bar).ep.map((x) => x - 12).concat(chordOf(bar).ep[3]), d: SPB * (o.len || 4) - 0.02, v: o.v || 0.4, slow: o.slow }); }
  function hook(bar, k, o = {}) {
    for (const [s, n, l] of HOOK[k]) A('brass', T(bar) + s * S16, { notes: [n, n - 5, n - 12], d: l * S16 * 0.85, v: o.v || 0.7, fall: l >= 3 });
  }
  function fill(bar, kind = 0) {                       // last beat (or two) of a bar
    if (kind === 0) [[12, 0.5], [13, 0.4], [14, 0.7], [15, 0.9]].forEach(([s, v], i) => A(i < 2 ? 'snare' : 'tom', T(bar) + s * S16, { v, n: 50 - i * 3 }));
    else [[8, 55], [9, 55], [10, 52], [11, 52], [12, 48], [13, 48], [14, 43], [15, 43]].forEach(([s, n], i) => A('tom', T(bar) + s * S16, { v: 0.5 + i * 0.06, n }));
  }
  function breakInto(bDrop, len = 2) {                 // riser then a half-beat of air
    A('swell', B_(bDrop - len), { d: (len - 0.5) * SPB, v: 0.5 });
    for (let b = bDrop - len; b < bDrop - 0.5 - 1e-6; b += 0.25) A('snare', B_(b), { v: lerp(0.25, 0.9, (b - (bDrop - len)) / (len - 0.5)) });
  }
  function drop(b, v = 1) {
    A('boom', B_(b), { v }); A('crash', B_(b), { v: 0.5 * v });
    const c = chordOf(Math.floor(b / 4));
    A('brass', B_(b), { notes: [...c.top, c.top[3] + 5 > 84 ? c.top[1] + 12 : c.top[3] + 5], d: SPB * 1.2, v: 0.9 * v, fall: true });
  }

  /* ---------- 0–3 INTRO ---------- */
  A('auto', 0, { p: 'mlp', k: 'set', v: 1400 });
  A('auto', T(3), { p: 'mlp', k: 'exp', v: 5000 });
  A('auto', T(3, 3.5), { p: 'mlp', k: 'exp', v: 16000 });
  A('auto', T(4), { p: 'mlp', k: 'set', v: 18000 });
  for (let bar = 0; bar < 4; bar++) {
    const last = bar === 3;
    drums(bar, bar < 2 ? 'C' : 'A', { cut: last ? 2 : null, v: bar < 2 ? 0.85 : 1 });
    clav(bar, { v: 0.42, cut: last ? 2 : null });
    if (bar >= 2) bass(bar, 'A', { cut: last ? 2 : null, lead: !last });
    if (bar >= 1) wah(bar, { v: 0.3, cut: last ? 2 : null });
  }
  breakInto(16, 2);

  /* ---------- 4–7 TITLE: the hook ---------- */
  drop(16);
  for (let bar = 4; bar < 8; bar++) {
    drums(bar, 'B', { tamb: true }); bass(bar, 'B'); clav(bar, { v: 0.4 }); wah(bar, { v: 0.32 }); rhodes(bar, { v: 0.26 });
    hook(bar, bar - 4);
  }
  fill(7, 0);

  /* ---------- 8–15 ① 상장: verse groove ---------- */
  A('crash', T(8), { v: 0.4 });
  for (let bar = 8; bar < 16; bar++) {
    const last = bar === 15;
    drums(bar, bar % 4 === 3 ? 'B' : 'A', { cut: last ? 2 : null });
    bass(bar, bar % 2 ? 'B' : 'A', { cut: last ? 2 : null, lead: !last });
    clav(bar, { v: 0.4, cut: last ? 2 : null });
    rhodes(bar, { v: 0.3, cut: last ? 2 : null });
    if (bar >= 12) wah(bar, { v: 0.3, cut: last ? 2 : null });
  }
  fill(11, 0);
  breakInto(64, 2);

  /* ---------- 16–23 ② 지수: lighter, congas + Rhodes ---------- */
  drop(64, 0.8);
  for (let bar = 16; bar < 24; bar++) {
    drums(bar, 'C', { conga: true, hv: 0.9 });
    bass(bar, 'C');
    rhodes(bar, { v: 0.38, pat: [[0, 1.5], [1.5, 0.4], [2.5, 1.3]] });
    pad(bar, { v: 0.3 });
    wah(bar, { v: 0.26, pat: [2, 6, 10, 14] });
    if (bar >= 20) clav(bar, { v: 0.3, pat: [3, 7, 11, 15] });
  }
  fill(19, 0); fill(23, 1);

  /* ---------- 24–35 ③ 엔비디아와 수혜주 ---------- */
  drop(96);
  for (let bar = 24; bar < 36; bar++) {
    const strip = bar < 26;                            // bass + drums only while the fall is drawn
    const last = bar === 35;
    drums(bar, bar >= 32 ? 'D' : bar % 2 ? 'B' : 'A', { cut: last ? 2 : null, tamb: bar >= 28 });
    bass(bar, bar % 2 ? 'B' : 'A', { cut: last ? 2 : null, lead: !last });
    if (!strip) { clav(bar, { v: 0.4, cut: last ? 2 : null }); wah(bar, { v: 0.3, cut: last ? 2 : null }); }
    if (bar >= 28) rhodes(bar, { v: 0.28, cut: last ? 2 : null });
    if (bar === 28 || bar === 30) hook(bar, bar === 28 ? 0 : 2, { v: 0.5 });
  }
  fill(27, 0); fill(31, 0);
  breakInto(144, 2);

  /* ---------- 36–47 ④ 삼성전자 ---------- */
  drop(144);
  for (let bar = 36; bar < 48; bar++) {
    const last = bar === 47, full = bar >= 44;
    drums(bar, full ? 'B' : bar % 4 === 3 ? 'B' : 'A', { conga: !full, tamb: full, cut: last ? 2 : null });
    bass(bar, bar % 2 ? 'B' : 'A', { cut: last ? 2 : null, lead: !last });
    rhodes(bar, { v: 0.34, cut: last ? 2 : null });
    clav(bar, { v: full ? 0.42 : 0.32, cut: last ? 2 : null });
    if (bar >= 40) wah(bar, { v: 0.3, cut: last ? 2 : null });
    if (full) pad(bar, { v: 0.3, len: last ? 2 : 4 });
  }
  fill(39, 0); fill(43, 1);
  breakInto(192, 2);

  /* ---------- 48–53 OUTRO: hook again ---------- */
  drop(192);
  for (let bar = 48; bar < 52; bar++) {
    drums(bar, 'B', { tamb: true }); bass(bar, 'B'); clav(bar, { v: 0.4 }); wah(bar, { v: 0.32 }); rhodes(bar, { v: 0.26 });
    hook(bar, bar - 48);
  }
  fill(51, 1);
  // final hit + ring-out
  A('boom', T(52), { v: 1 }); A('crash', T(52), { v: 0.6 });
  A('brass', T(52), { notes: [64, 71, 74, 78, 83], d: SPB * 3, v: 0.9, fall: true });
  A('slap', T(52), { n: 28, d: SPB * 3, v: 1, k: 'n' });
  A('keys', T(52), { notes: [62, 66, 67, 71, 78], d: SPB * 6, v: 0.4, bright: 1.2 });
  A('pad', T(52), { notes: [52, 59, 62, 66, 71], d: SPB * 5, v: 0.4, slow: true });

  /* ---------- accents for every on-screen entrance (scenes.js → hit()) ---------- */
  let popK = 0, lastBar = -1;
  for (const h of HITS) {
    const bar = Math.floor(h.b / 4), c = chordOf(bar), t = B_(h.b), v = h.v;
    if (bar !== lastBar) { popK = 0; lastBar = bar; }
    switch (h.kind) {
      case 'stab': A('brass', t, { notes: c.top.slice(1), d: SPB * 0.32, v: 0.62 * v }); break;
      case 'big': A('brass', t, { notes: c.top, d: SPB * 0.9, v: 0.8 * v, fall: true }); A('crash', t, { v: 0.3 * v }); A('thud', t, { v: 0.8 * v }); break;
      case 'boom': A('boom', t, { v: 0.9 * v }); A('crash', t, { v: 0.4 * v }); A('brass', t, { notes: c.top, d: SPB * 1.1, v: 0.85 * v, fall: true }); break;
      case 'clav': A('clav', t, { notes: c.top.slice(0, 3), v: 0.7 * v }); break;
      case 'pop': A('pop', t, { n: PENTA[(2 + popK++ * 2) % PENTA.length] + 12, v: 0.42 * v }); break;
      case 'tick': A('blip', t, { n: PENTA[(4 + popK++) % PENTA.length] + 12, v: 0.3 * v }); break;
      case 'run': { const n = Math.max(2, Math.round(h.d * 4)); for (let i = 0; i < n; i++) A('blip', t + i * S16, { n: PENTA[Math.min(PENTA.length - 1, Math.round((i * (PENTA.length - 1)) / (n - 1)))] + 12, v: 0.2 + 0.12 * (i / n) }); break; }
      case 'down': { const n = Math.max(2, Math.round(h.d * 4)); for (let i = 0; i < n; i++) A('blip', t + i * S16, { n: PENTA[Math.max(0, PENTA.length - 1 - Math.round((i * (PENTA.length - 1)) / (n - 1)))], v: 0.3 }); break; }
      case 'whoosh': A('whoosh', t, { d: (h.d || 1) * SPB, v: 0.45 * v }); break;
      case 'thud': A('stamp', t, { v: 0.7 * v }); break;
      case 'chime': A('chime', t, { n: c.top[3] + 12, v: 0.5 * v }); break;
      case 'flip': A('flip', t, { v: 0.7 * v }); break;
    }
  }
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

const SONG = arrange();
const evTimes = (name, filter) => SONG.filter((e) => e.i === name && (!filter || filter(e))).map((e) => e.t);
const KICKS = evTimes('kick');
const SNARES = SONG.filter((e) => e.i === 'snare' && e.v > 0.5).map((e) => e.t);
const IMPACTS = SONG.filter((e) => e.i === 'boom').map((e) => ({ t: e.t, v: e.v }));

function lastBefore(arr, t) {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
  return ans;
}
function env(arr, t, k = 10) { const i = lastBefore(arr, t); if (i < 0) return 0; return Math.exp(-(t - arr[i]) * k); }
function impactEnv(t, k = 4) {
  let s = 0;
  for (const e of IMPACTS) { if (e.t > t) break; const dt = t - e.t; if (dt < 2) s += e.v * Math.exp(-dt * k); }
  return s;
}

/* ============================================================
   SYNTHESIS — rendered in parallel 2-bar segments (Chrome's offline
   renderer charges every node for the whole render length, so short
   contexts are far cheaper). Segments overlap-add with a tail, then a
   single master pass applies gentle compression; level + soft clip in JS.
   ============================================================ */
const AUTO_INIT = { mlp: 18000 };
function autoValueAt(p, T0) {
  const evs = SONG.filter((e) => e.i === 'auto' && e.p === p);
  let v = AUTO_INIT[p], tPrev = 0;
  for (const e of evs) {
    if (e.t <= T0) { v = e.v; tPrev = e.t; }
    else {
      if (e.k === 'exp') return v * Math.pow(e.v / v, (T0 - tPrev) / (e.t - tPrev));
      if (e.k === 'lin') return v + (e.v - v) * ((T0 - tPrev) / (e.t - tPrev));
      break;
    }
  }
  return v;
}
const evStart = (e) => (e.i === 'rev' ? e.t - e.d : e.t);

function makeShared(sr) {
  const R = mulberry32(77);
  const noise = new Float32Array(sr * 6);
  for (let i = 0; i < noise.length; i++) noise[i] = R() * 2 - 1;
  const n = Math.floor(2.8 * sr), ir = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) { let lp = 0; for (let i = 0; i < n; i++) { const x = (R() * 2 - 1) * Math.pow(1 - i / n, 3.4); lp += (x - lp) * 0.4; ir[c][i] = lp; } }
  return { noise, ir };
}

async function renderSegment(s0, s1, tail, sr, SHR, only) {
  const len = Math.ceil((s1 - s0 + tail) * sr);
  const ac = new OfflineAudioContext(2, len, sr);
  const R = mulberry32(Math.floor(s0 * 1000) + 7);
  const NB = ac.createBuffer(1, SHR.noise.length, sr); NB.copyToChannel(SHR.noise, 0);
  const noise = (t, dur) => { const s = ac.createBufferSource(); s.buffer = NB; s.start(Math.max(0, t), R() * Math.max(0, 5.8 - dur), dur + 0.05); return s; };
  const G = (v = 1) => { const n = ac.createGain(); n.gain.value = v; return n; };
  const F = (type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const shaperCurve = (k) => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; };
  const P = (v) => { const p = ac.createStereoPanner(); p.pan.value = v; return p; };
  const dst = ac.destination;

  // reverb (high-passed input keeps the low end clean)
  const IRB = ac.createBuffer(2, SHR.ir[0].length, sr); IRB.copyToChannel(SHR.ir[0], 0); IRB.copyToChannel(SHR.ir[1], 1);
  const rev = ac.createConvolver(); rev.normalize = true; rev.buffer = IRB;
  const revIn = G(1), revHP = F('highpass', 350, 0.6), revOut = G(0.5);
  revIn.connect(revHP); revHP.connect(rev); rev.connect(revOut); revOut.connect(dst);
  // ping-pong delay (dotted eighth)
  const dIn = G(1), dOut = G(0.34), dL = ac.createDelay(2), dR = ac.createDelay(2);
  dL.delayTime.value = SPB * 0.75; dR.delayTime.value = SPB * 0.75;
  const fbL = G(0.3), fbR = G(0.3), dlpF = F('lowpass', 3800), pL = P(-0.75), pR = P(0.75);
  dIn.connect(dL); dL.connect(dlpF); dlpF.connect(fbL); fbL.connect(dR); dR.connect(fbR); fbR.connect(dL);
  dL.connect(pL); dR.connect(pR); pL.connect(dOut); pR.connect(dOut); dOut.connect(dst);
  // buses
  const drumBus = G(0.85); drumBus.connect(dst);
  const kickShape = ac.createWaveShaper(); kickShape.curve = shaperCurve(1.5);
  const kickBus = G(0.95); kickShape.connect(kickBus); kickBus.connect(drumBus);
  const musicBus = G(1), musicLP = F('lowpass', 18000, 0.8), pump = G(1);
  musicBus.connect(musicLP); musicLP.connect(pump); pump.connect(dst);
  const musicRev = G(0.18); pump.connect(musicRev); musicRev.connect(revIn);
  const fxBus = G(0.8); fxBus.connect(dst);
  const fxRev = G(0.4); fxBus.connect(fxRev); fxRev.connect(revIn);
  const snapRev = G(0.4); snapRev.connect(revIn);
  const PANS = [-0.6, -0.3, 0, 0.3, 0.6];

  function envAD(gn, t, peak, a, d, sustain = 0.0001) {
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    gn.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  const I = {
    kick(t, e) {
      const v = e.v, o = ac.createOscillator();
      o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.04); o.frequency.exponentialRampToValueAtTime(47, t + 0.28);
      const gn = G(0);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v * 0.82, t + 0.003);
      gn.gain.setValueAtTime(v * 0.82, t + 0.045); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(gn); gn.connect(kickShape); o.start(t); o.stop(t + 0.36);
      const n = noise(t, 0.02), ng = G(0), nf = F('bandpass', 3500, 0.8); envAD(ng, t, 0.1 * v, 0.001, 0.01);
      n.connect(nf); nf.connect(ng); ng.connect(drumBus);
    },
    snap(t, e) {
      const v = e.v, n = noise(t, 0.2), f = F('bandpass', 2400, 1.2), gn = G(0), p = gn.gain;
      p.setValueAtTime(0.0001, t);
      [0, 0.008].forEach((d) => { p.setValueAtTime(v * 1.5, t + d); p.exponentialRampToValueAtTime(v * 0.2, t + d + 0.006); });
      p.setValueAtTime(v * 1.2, t + 0.014); p.exponentialRampToValueAtTime(0.0001, t + 0.13);
      const pan = P(0.1);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(drumBus); gn.connect(snapRev);
    },
    clap(t, e) {
      const v = e.v, n = noise(t, 0.35), gn = G(0), p = gn.gain, hp = F('highpass', 750), bp = F('bandpass', 1400, 0.8);
      p.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach((d) => { p.setValueAtTime(v * 2.5, t + d); p.exponentialRampToValueAtTime(v * 0.25, t + d + 0.009); });
      p.setValueAtTime(v * 1.9, t + 0.033); p.exponentialRampToValueAtTime(0.0001, t + 0.26);
      n.connect(hp); hp.connect(bp); bp.connect(gn); gn.connect(drumBus); gn.connect(snapRev);
    },
    snare(t, e) {
      const v = e.v, ghost = v < 0.3;
      const o = ac.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(175, t + 0.06);
      const og = G(0); envAD(og, t, v * 1.7, 0.001, ghost ? 0.04 : 0.1);
      o.connect(og); og.connect(drumBus); o.start(t); o.stop(t + 0.16);
      const n = noise(t, 0.22), hp = F('highpass', 1700, 0.7), bp = F('peaking', 4200, 0.8), ng = G(0);
      bp.gain.value = 5;
      envAD(ng, t, v * (ghost ? 1.8 : 3.4), 0.001, ghost ? 0.05 : 0.17);
      n.connect(hp); hp.connect(bp); bp.connect(ng); ng.connect(drumBus);
      if (!ghost) { const s = G(0.22); ng.connect(s); s.connect(revIn); }
    },
    tom(t, e) {
      const f0 = mtof(e.n || 48), o = ac.createOscillator();
      o.frequency.setValueAtTime(f0 * 1.6, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.06);
      const gn = G(0); envAD(gn, t, e.v * 0.6, 0.002, 0.22);
      const pan = P(((e.n || 48) - 48) / 14);
      o.connect(gn); gn.connect(pan); pan.connect(drumBus); o.start(t); o.stop(t + 0.3);
      const n = noise(t, 0.04), nf = F('bandpass', 2500, 1), ng = G(0); envAD(ng, t, e.v * 0.2, 0.001, 0.03);
      n.connect(nf); nf.connect(ng); ng.connect(drumBus);
    },
    conga(t, e) {
      const f0 = e.hi ? 330 : 220, o = ac.createOscillator();
      o.frequency.setValueAtTime(f0 * 1.25, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.03);
      const gn = G(0); envAD(gn, t, e.v * 0.6, 0.001, e.hi ? 0.09 : 0.14);
      const pan = P(e.hi ? 0.45 : 0.3);
      o.connect(gn); gn.connect(pan); pan.connect(drumBus); o.start(t); o.stop(t + 0.2);
      const n = noise(t, 0.02), nf = F('bandpass', 3000, 1.5), ng = G(0); envAD(ng, t, e.v * 0.12, 0.001, 0.012);
      n.connect(nf); nf.connect(ng); ng.connect(pan);
    },
    slap(t, e) { // funk bass: finger, pop (octave snap) and dead ghost notes
      const d = Math.max(0.06, e.d), v = e.v, pop = e.k === 'p', ghost = e.k === 'g', fq = mtof(e.n);
      const f = F('lowpass', 900, pop ? 5 : 3.2);
      f.frequency.setValueAtTime(pop ? 4200 : 2300, t);
      f.frequency.exponentialRampToValueAtTime(pop ? 700 : 300, t + (pop ? 0.09 : 0.14));
      const gn = G(0), len = ghost ? 0.045 : d, pk = v * (pop ? 0.32 : ghost ? 0.18 : 0.28);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(pk, t + 0.004);
      gn.gain.exponentialRampToValueAtTime(pk * 0.6, t + Math.min(len, 0.12));
      gn.gain.setValueAtTime(pk * 0.6, t + Math.max(0.01, len - 0.02)); gn.gain.linearRampToValueAtTime(0, t + len);
      [['sawtooth', -4, 0.6], ['square', 3, 0.42]].forEach(([ty, dt, lv]) => {
        const o = ac.createOscillator(); o.type = ty; o.frequency.value = fq; o.detune.value = dt;
        const og = G(lv); o.connect(og); og.connect(f); o.start(t); o.stop(t + len + 0.03);
      });
      f.connect(gn); gn.connect(musicBus);
      if (!pop && !ghost) {
        const so = ac.createOscillator(); so.frequency.value = fq; const sg = G(0);
        sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(v * 0.24, t + 0.006);
        sg.gain.setValueAtTime(v * 0.24, t + Math.max(0.01, len - 0.03)); sg.gain.linearRampToValueAtTime(0, t + len);
        so.connect(sg); sg.connect(musicBus); so.start(t); so.stop(t + len + 0.02);
      }
      const n = noise(t, 0.02), nf = F('bandpass', pop ? 3200 : 1800, 1.2), ng = G(0); envAD(ng, t, v * (pop ? 0.16 : 0.08), 0.001, 0.012);
      n.connect(nf); nf.connect(ng); ng.connect(musicBus);
    },
    clav(t, e) {
      const v = e.v, hp = F('highpass', 520, 0.8), bp = F('peaking', 1900, 1.1), gn = G(0);
      bp.gain.value = 9;
      envAD(gn, t, v * 0.6, 0.002, 0.13);
      for (const n of e.notes) {
        const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = mtof(n);
        const o2 = ac.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = mtof(n); o2.detune.value = 8;
        const g2 = G(0.6); o.connect(hp); o2.connect(g2); g2.connect(hp);
        o.start(t); o2.start(t); o.stop(t + 0.2); o2.stop(t + 0.2);
      }
      const pan = P(-0.35);
      hp.connect(bp); bp.connect(gn); gn.connect(pan); pan.connect(musicBus);
      const s = G(0.15); gn.connect(s); s.connect(revIn);
    },
    wah(t, e) { // muted wah-guitar "chicka"
      const v = e.v, f = F('bandpass', 900, 4.5), gn = G(0);
      if (e.up) { f.frequency.setValueAtTime(650, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.07); }
      else { f.frequency.setValueAtTime(2000, t); f.frequency.exponentialRampToValueAtTime(800, t + 0.06); }
      envAD(gn, t, v * 3.2, 0.002, 0.075);
      for (const n of e.notes) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.connect(f); o.start(t); o.stop(t + 0.12); }
      const nz = noise(t, 0.03), ng = G(0.25); nz.connect(ng); ng.connect(f);
      const pan = P(0.45);
      f.connect(gn); gn.connect(pan); pan.connect(musicBus);
    },
    brass(t, e) {
      const d = Math.max(0.1, e.d), v = e.v, N = e.notes.length;
      const f = F('lowpass', 700, 1.2), gn = G(0), amp = (v * 0.5) / Math.sqrt(N * 2);
      f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(5200, t + 0.035);
      f.frequency.exponentialRampToValueAtTime(2400, t + Math.min(d, 0.25));
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(amp, t + 0.018);
      gn.gain.setValueAtTime(amp * 0.85, t + d); gn.gain.setTargetAtTime(0, t + d, 0.035);
      const pans = [P(-0.3), P(0.3)]; pans.forEach((p) => p.connect(f));
      for (const n of e.notes) for (let k = 0; k < 2; k++) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; const fq = mtof(n);
        o.frequency.setValueAtTime(fq * 0.97, t); o.frequency.exponentialRampToValueAtTime(fq, t + 0.03);   // scoop
        if (e.fall) { o.frequency.setValueAtTime(fq, t + d * 0.7); o.frequency.exponentialRampToValueAtTime(fq * 0.8, t + d + 0.12); }
        o.detune.value = k ? 9 : -9;
        o.connect(pans[k]); o.start(t); o.stop(t + d + 0.3);
      }
      f.connect(gn); gn.connect(musicBus);
      const s = G(0.35); gn.connect(s); s.connect(revIn);
    },
    rim(t, e) {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = 1700;
      const gn = G(0); envAD(gn, t, e.v * 0.28, 0.001, 0.035);
      const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 480;
      const g2 = G(0); envAD(g2, t, e.v * 0.32, 0.001, 0.05);
      const pan = P(-0.3);
      o.connect(gn); o2.connect(g2); gn.connect(pan); g2.connect(pan); pan.connect(drumBus);
      o.start(t); o2.start(t); o.stop(t + 0.08); o2.stop(t + 0.08);
    },
    shaker(t, e) {
      const n = noise(t, 0.08), f = F('highpass', 7000, 0.7), gn = G(0);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(e.v * 0.8, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
      const pan = P(0.3);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(drumBus);
    },
    hat(t, e) {
      const d = e.open ? 0.17 : 0.03, n = noise(t, d + 0.05), f = F('highpass', e.open ? 7400 : 8600, 0.9), gn = G(0);
      envAD(gn, t, e.v * 2.2, 0.001, d);
      const pan = P(-0.2);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(drumBus);
    },
    crash(t, e) {
      const v = e.v, n = noise(t, 2.2), f = F('highpass', 5000, 0.6), gn = G(0);
      envAD(gn, t, v * 0.5, 0.004, 1.9);
      n.connect(f); f.connect(gn); gn.connect(fxBus);
    },
    clock(t, e) {
      const fq = e.hi ? 1900 : 1350;
      const o = ac.createOscillator(); o.frequency.value = fq;
      const gn = G(0); envAD(gn, t, e.v * 0.26, 0.001, 0.045);
      const o2 = ac.createOscillator(); o2.frequency.value = fq * 2.7; const g2 = G(0); envAD(g2, t, e.v * 0.08, 0.001, 0.02);
      const n = noise(t, 0.02), nf = F('highpass', 4000), ng = G(0); envAD(ng, t, e.v * 0.12, 0.001, 0.008);
      const pan = P(e.hi ? -0.15 : 0.15);
      o.connect(gn); o2.connect(g2); g2.connect(gn); n.connect(nf); nf.connect(ng); ng.connect(pan); gn.connect(pan); pan.connect(drumBus);
      const s = G(0.3); gn.connect(s); s.connect(revIn);
      o.start(t); o2.start(t); o.stop(t + 0.08); o2.stop(t + 0.05);
    },
    flip(t, e) {
      const d = 0.16, n = noise(t, d), f = F('bandpass', 1000, 1.1), gn = G(0);
      f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(5200, t + d);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(e.v * 0.55, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      const pan = ac.createStereoPanner(); pan.pan.setValueAtTime(-0.4, t); pan.pan.linearRampToValueAtTime(0.5, t + d);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(fxBus);
    },
    swell(t, e) {
      const d = e.d, v = e.v, n = noise(t, d), f = F('bandpass', 400, 1.2), gn = G(0);
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7500, t + d);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v * 0.32, t + d); gn.gain.linearRampToValueAtTime(0, t + d + 0.015);
      n.connect(f); f.connect(gn); gn.connect(fxBus);
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + d);
      const of = F('lowpass', 1800, 0.8);
      const og = G(0); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(v * 0.035, t + d); og.gain.linearRampToValueAtTime(0, t + d + 0.015);
      o.connect(of); of.connect(og); og.connect(fxBus); o.start(t); o.stop(t + d + 0.05);
    },
    rev(tEnd, e) {
      const t = tEnd - e.d, n = noise(t, e.d), f = F('highpass', 4200, 0.7), gn = G(0);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(e.v * 0.4, tEnd - 0.004); gn.gain.linearRampToValueAtTime(0, tEnd);
      n.connect(f); f.connect(gn); gn.connect(fxBus);
    },
    whoosh(t, e) {
      const d = e.d, n = noise(t, d), f = F('bandpass', 500, 1.8), gn = G(0);
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3800, t + d * 0.55); f.frequency.exponentialRampToValueAtTime(700, t + d);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(e.v * 0.5, t + d * 0.55); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      const pan = ac.createStereoPanner(); pan.pan.setValueAtTime(-0.7, t); pan.pan.linearRampToValueAtTime(0.7, t + d);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(fxBus);
    },
    boom(t, e) {
      const v = e.v, o = ac.createOscillator();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.7);
      const gn = G(0); envAD(gn, t, v * 0.5, 0.006, 0.9);
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 1.1);
      const n = noise(t, 0.8), f = F('lowpass', 900), ng = G(0);
      envAD(ng, t, v * 0.22, 0.004, 0.5);
      n.connect(f); f.connect(ng); ng.connect(fxBus);
    },
    thud(t, e) {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      const gn = G(0); envAD(gn, t, e.v * 0.45, 0.002, 0.16);
      o.connect(gn); gn.connect(drumBus); o.start(t); o.stop(t + 0.22);
      const n = noise(t, 0.06), f = F('bandpass', 1400, 1), ng = G(0); envAD(ng, t, e.v * 0.25, 0.001, 0.04);
      n.connect(f); f.connect(ng); ng.connect(drumBus);
    },
    stamp(t, e) { I.boom(t, { v: e.v * 0.6 }); I.clap(t, { v: e.v * 0.8 }); I.thud(t, { v: e.v }); },
    sub(t, e) {
      const d = e.d, v = e.v, o = ac.createOscillator(); o.frequency.value = mtof(e.n);
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.3, t + 0.05);
      gn.gain.setValueAtTime(v * 0.3, t + d - 0.08); gn.gain.linearRampToValueAtTime(0, t + d);
      o.connect(gn); gn.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
    },
    bass(t, e) {
      const d = e.d, v = e.v, f = F('lowpass', 900, 2);
      f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(380, t + Math.min(0.2, d));
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.3, t + 0.005);
      gn.gain.exponentialRampToValueAtTime(v * 0.2, t + Math.min(d, 0.18));
      gn.gain.setValueAtTime(v * 0.2, t + Math.max(0.01, d - 0.03)); gn.gain.linearRampToValueAtTime(0, t + d);
      [['sawtooth', -5, 0.6], ['sawtooth', 5, 0.6], ['square', 0, 0.3]].forEach(([ty, dt, lv]) => {
        const o = ac.createOscillator(); o.type = ty; o.frequency.value = mtof(e.n); o.detune.value = dt;
        const og = G(lv); o.connect(og); og.connect(f); o.start(t); o.stop(t + d + 0.02);
      });
      const so = ac.createOscillator(); so.frequency.value = mtof(e.n); const sg = G(0);
      sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(v * 0.24, t + 0.006); sg.gain.setValueAtTime(v * 0.24, t + Math.max(0.01, d - 0.03)); sg.gain.linearRampToValueAtTime(0, t + d);
      so.connect(sg); sg.connect(musicBus); so.start(t); so.stop(t + d + 0.02);
      f.connect(gn); gn.connect(musicBus);
    },
    keys(t, e) { // FM electric/house piano
      const br = e.bright || 1;
      for (const n of e.notes) {
        const fq = mtof(n), d = e.d, v = e.v;
        const car = ac.createOscillator(); car.frequency.value = fq;
        const mod = ac.createOscillator(); mod.frequency.value = fq;
        const mg = G(0); mg.gain.setValueAtTime(fq * 1.5 * br, t); mg.gain.exponentialRampToValueAtTime(fq * 0.14, t + 0.8);
        const tine = ac.createOscillator(); tine.frequency.value = fq * 14;
        const tg = G(0); tg.gain.setValueAtTime(fq * 0.55 * br, t); tg.gain.exponentialRampToValueAtTime(1, t + 0.06);
        mod.connect(mg); mg.connect(car.frequency); tine.connect(tg); tg.connect(car.frequency);
        const gn = G(0), hold = Math.max(d, 0.22);
        gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.2, t + 0.004);
        gn.gain.exponentialRampToValueAtTime(v * 0.085, t + Math.min(1, hold));
        gn.gain.setValueAtTime(v * 0.085, t + hold); gn.gain.setTargetAtTime(0, t + hold, 0.1);
        const pan = P((n % 7) / 7 - 0.4);
        car.connect(gn); gn.connect(pan); pan.connect(musicBus);
        const s = G(0.3); gn.connect(s); s.connect(revIn);
        [car, mod, tine].forEach((o) => { o.start(t); o.stop(t + hold + 0.8); });
      }
    },
    pad(t, e) {
      const N = e.notes.length * 3, f = F('lowpass', e.slow ? 1500 : 2100, 0.5), gn = G(0);
      const amp = (e.v * 0.3) / Math.sqrt(N), atk = e.slow ? 0.8 : 0.3;
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(amp, t + atk);
      gn.gain.setValueAtTime(amp, t + e.d); gn.gain.setTargetAtTime(0, t + e.d, 0.25);
      const pans = [P(-0.6), P(0), P(0.6)];
      pans.forEach((p) => p.connect(f));
      for (const n of e.notes) for (let k = 0; k < 3; k++) {
        const o = ac.createOscillator(); o.type = k === 1 ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(n);
        o.detune.value = [-10, 0, 10][k] + (R() - 0.5) * 4;
        o.connect(pans[k]); o.start(t); o.stop(t + e.d + 1.5);
      }
      f.connect(gn); gn.connect(musicBus);
      const s = G(0.55); gn.connect(s); s.connect(revIn);
    },
    lead(t, e) {
      const d = e.d, v = e.v, fq = mtof(e.n), f = F('lowpass', 3000, 1.1);
      f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(2300, t + Math.min(0.22, d));
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.11, t + 0.006);
      gn.gain.exponentialRampToValueAtTime(v * 0.07, t + Math.min(0.25, d));
      gn.gain.setValueAtTime(v * 0.07, t + d); gn.gain.setTargetAtTime(0, t + d, 0.05);
      const lfo = ac.createOscillator(); lfo.frequency.value = 5.5;
      const lg = G(0); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(0, t + 0.2); lg.gain.linearRampToValueAtTime(fq * 0.006, t + Math.max(0.25, d));
      lfo.connect(lg);
      [['sawtooth', -9, 0.8], ['sawtooth', 9, 0.8], ['square', 0, 0.35], ['triangle', 1200, 0.25]].forEach(([ty, dt, lv]) => {
        const o = ac.createOscillator(); o.type = ty; o.frequency.value = fq; o.detune.value = dt; lg.connect(o.frequency);
        const og = G(lv); o.connect(og); og.connect(f); o.start(t); o.stop(t + d + 0.4);
      });
      lfo.start(t); lfo.stop(t + d + 0.4);
      f.connect(gn); gn.connect(musicBus);
      const s = G(0.35); gn.connect(s); s.connect(revIn);
      const s2 = G(0.22); gn.connect(s2); s2.connect(dIn);
    },
    glock(t, e) {
      const fq = mtof(e.n);
      const car = ac.createOscillator(); car.frequency.value = fq;
      const mod = ac.createOscillator(); mod.frequency.value = fq * 3.5;
      const mg = G(0); mg.gain.setValueAtTime(fq * 1.3, t); mg.gain.exponentialRampToValueAtTime(fq * 0.02, t + 1.1);
      mod.connect(mg); mg.connect(car.frequency);
      const gn = G(0); envAD(gn, t, e.v * 0.16, 0.002, 1.4);
      car.connect(gn); gn.connect(musicBus);
      const s = G(0.45); gn.connect(s); s.connect(revIn);
      const s2 = G(0.22); gn.connect(s2); s2.connect(dIn);
      [car, mod].forEach((o) => { o.start(t); o.stop(t + 1.6); });
    },
    chime(t, e) { I.glock(t, { n: e.n, v: e.v }); I.glock(t + 0.06, { n: e.n + 12, v: e.v * 0.5 }); },
    marimba(t, e) {
      const fq = mtof(e.n);
      const o = ac.createOscillator(); o.frequency.value = fq;
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.002, 0.32);
      const o2 = ac.createOscillator(); o2.frequency.value = fq * 4; const g2 = G(0); envAD(g2, t, e.v * 0.08, 0.001, 0.05);
      const pan = P(((e.n * 5) % 9) / 9 - 0.45);
      o.connect(gn); o2.connect(g2); gn.connect(pan); g2.connect(pan); pan.connect(musicBus);
      const s = G(0.3); gn.connect(s); s.connect(revIn);
      o.start(t); o2.start(t); o.stop(t + 0.4); o2.stop(t + 0.1);
    },
    pluck(t, e) {
      const f = F('lowpass', 4600, 1.4);
      f.frequency.setValueAtTime(4600, t); f.frequency.exponentialRampToValueAtTime(650, t + 0.16);
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.002, 0.2);
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(e.n);
      const o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.value = mtof(e.n); o2.detune.value = 7; const g2 = G(0.3);
      const pan = P(((e.n * 3) % 7) / 7 - 0.42);
      o.connect(f); o2.connect(g2); g2.connect(f); f.connect(gn); gn.connect(pan); pan.connect(musicBus);
      const s = G(0.3); gn.connect(s); s.connect(dIn);
      o.start(t); o2.start(t); o.stop(t + 0.28); o2.stop(t + 0.28);
    },
    blip(t, e) {
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(mtof(e.n - 7), t); o.frequency.exponentialRampToValueAtTime(mtof(e.n), t + 0.025);
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.002, 0.09);
      const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = mtof(e.n + 12); const g2 = G(0); envAD(g2, t, e.v * 0.06, 0.001, 0.05);
      const pan = P(((e.n * 7) % 11) / 11 - 0.5);
      o.connect(gn); o2.connect(g2); g2.connect(gn); gn.connect(pan); pan.connect(fxBus);
      o.start(t); o2.start(t); o.stop(t + 0.14); o2.stop(t + 0.1);
    },
    pop(t, e) {
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(mtof(e.n - 12), t); o.frequency.exponentialRampToValueAtTime(mtof(e.n), t + 0.04);
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.002, 0.11);
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 0.16);
      I.glock(t + 0.015, { n: e.n + 12, v: e.v * 0.3 });
    },
    check(t, e) { I.blip(t, { n: e.n, v: e.v }); I.blip(t + 0.075, { n: e.n + 7, v: e.v }); I.glock(t + 0.075, { n: e.n + 19, v: e.v * 0.4 }); },
    quest(t, e) { I.blip(t, { n: e.n, v: e.v * 0.9 }); I.blip(t + 0.11, { n: e.n + 5, v: e.v }); },
    stab(t, e) {
      I.keys(t, { notes: e.notes.map((n) => n + 12), d: e.big ? 0.9 : 0.3, v: e.v * 0.8, bright: 1.5 });
      const N = e.notes.length * 3, f = F('lowpass', e.big ? 5600 : 3600, 0.6), gn = G(0), amp = (e.v * 0.45) / Math.sqrt(N);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(amp, t + 0.006); gn.gain.setTargetAtTime(0, t + 0.08, e.big ? 0.24 : 0.08);
      const pans = PANS.slice(1, 4).map((p) => { const n = P(p); n.connect(f); return n; });
      for (const n of e.notes) for (let k = 0; k < 3; k++) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n + 12); o.detune.value = [-12, 0, 12][k];
        o.connect(pans[k]); o.start(t); o.stop(t + 1.2);
      }
      f.connect(gn); gn.connect(musicBus);
      const s = G(0.55); gn.connect(s); s.connect(revIn);
    },
  };

  // automation: value at segment start, then events through the tail
  const PARAM = { mlp: musicLP.frequency };
  const tEnd = s1 + tail;
  for (const p of Object.keys(PARAM)) {
    PARAM[p].setValueAtTime(autoValueAt(p, s0), 0);
    for (const e of SONG) {
      if (e.i !== 'auto' || e.p !== p || e.t <= s0 || e.t >= tEnd) continue;
      const t = e.t - s0, pa = PARAM[p];
      if (e.k === 'set') pa.setValueAtTime(e.v, t);
      else if (e.k === 'exp') pa.exponentialRampToValueAtTime(e.v, t);
      else if (e.k === 'lin') pa.linearRampToValueAtTime(e.v, t);
    }
  }
  // sidechain pump (kicks through the tail too, so overlap-add stays exact)
  const pg = pump.gain; pg.setValueAtTime(1, 0);
  for (const e of SONG) {
    if (e.i !== 'kick' || e.t < s0 || e.t >= tEnd) continue;
    const depth = e.sc != null ? e.sc : 0.6;
    if (depth >= 0.99) continue;
    pg.setTargetAtTime(depth, e.t - s0, 0.005);
    pg.setTargetAtTime(1, e.t - s0 + 0.035, 0.09);
  }
  for (const e of SONG) {
    if (e.i === 'auto') continue;
    const st = evStart(e);
    if (st < s0 || st >= s1) continue;
    if (only && !only.has(e.i)) continue;
    I[e.i](e.t - s0, e);
  }
  return ac.startRendering();
}

async function renderSong(opts = {}) {
  const sr = opts.sampleRate || 48000, TAIL = 3.0, SEG = 2;
  const SHR = makeShared(sr);
  const total = Math.ceil(DUR * sr);
  const pre = [new Float32Array(total), new Float32Array(total)];
  const segs = [];
  for (let bar = 0; bar < TOTAL_BEATS / 4; bar += SEG) segs.push([T(bar), Math.min(DUR, T(bar + SEG))]);
  const only = opts.only ? new Set(opts.only) : null;
  let next = 0, done = 0;
  const worker = async () => {
    while (next < segs.length) {
      const [s0, s1] = segs[next++];
      const b = await renderSegment(s0, s1, TAIL, sr, SHR, only);
      const off = Math.round(s0 * sr);
      for (let c = 0; c < 2; c++) {
        const src = b.getChannelData(c), dstA = pre[c];
        const n = Math.min(src.length, total - off);
        for (let i = 0; i < n; i++) dstA[off + i] += src[i];
      }
      done++;
      if (opts.onProgress) opts.onProgress(done / segs.length);
    }
  };
  await Promise.all(Array.from({ length: opts.workers || 6 }, worker));

  // master pass: glue compressor
  const mc = new OfflineAudioContext(2, total, sr);
  const inB = mc.createBuffer(2, total, sr); inB.copyToChannel(pre[0], 0); inB.copyToChannel(pre[1], 1);
  const src = mc.createBufferSource(); src.buffer = inB;
  const preG = mc.createGain(); preG.gain.value = 0.8;
  const comp = mc.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.4; comp.attack.value = 0.008; comp.release.value = 0.18;
  src.connect(preG); preG.connect(comp); comp.connect(mc.destination); src.start(0);
  const outB = await mc.startRendering();

  // loudness: set the loudest 2-bar window to TARGET dBFS RMS, then soft clip + end fade
  const L = outB.getChannelData(0), Rr = outB.getChannelData(1);
  const winN = Math.floor(T(2) * sr);
  let best = 0;
  for (let a = 0; a + winN <= total; a += winN) {
    let s = 0; for (let i = a; i < a + winN; i++) { const m = (L[i] + Rr[i]) * 0.5; s += m * m; }
    best = Math.max(best, Math.sqrt(s / winN));
  }
  const TARGET = Math.pow(10, -13 / 20);
  const gain = best > 0 ? TARGET / best : 1;
  const knee = 0.72;
  const clipf = (x) => { const a = Math.abs(x); if (a <= knee) return x; const y = knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)); return Math.sign(x) * y * 0.985; };
  const fadeA = Math.floor(T(NBARS - 1) * sr);
  for (const d of [L, Rr]) {
    for (let i = 0; i < total; i++) {
      let x = d[i] * gain;
      if (i > fadeA) x *= Math.pow(1 - (i - fadeA) / (total - fadeA), 1.4);
      if (i < 64) x *= i / 64;
      d[i] = clipf(x);
    }
  }
  outB._peakBefore = best;
  outB._gain = gain;
  return outB;
}

// per-frame RMS energy (0..1) for visuals
function analyzeEnergy(buf, fps = 60) {
  const sr = buf.sampleRate, hop = Math.floor(sr / fps);
  const L = buf.getChannelData(0), Rr = buf.getChannelData(1);
  const n = Math.ceil(L.length / hop), out = new Float32Array(n);
  let mx = 0;
  for (let f = 0; f < n; f++) {
    let s = 0; const a = f * hop, b = Math.min(L.length, a + hop);
    for (let i = a; i < b; i++) { const m = (L[i] + Rr[i]) * 0.5; s += m * m; }
    out[f] = Math.sqrt(s / Math.max(1, b - a)); if (out[f] > mx) mx = out[f];
  }
  for (let f = 0; f < n; f++) out[f] /= mx || 1;
  return out;
}
