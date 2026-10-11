'use strict';
/* ============================================================
   MUSIC — 100 BPM, F major, bright city-pop / toy-box palette.
   arrange() builds a pure event list (shared with the visuals for
   beat-sync); renderSong() synthesizes it offline with Web Audio.
   ============================================================ */
const T = (bar, beat = 0) => (bar * 4 + beat) * SPB;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// IVmaj7 – V7 – iii7 – vi7 in F (the bright "royal road" loop)
const PROG = [
  { root: 46, ep: [57, 62, 65, 69], pad: [58, 62, 65, 69], arp: [65, 69, 70, 74] }, // Bbmaj7
  { root: 48, ep: [58, 64, 67, 72], pad: [60, 64, 67, 70], arp: [64, 67, 70, 72] }, // C7
  { root: 45, ep: [55, 60, 64, 67], pad: [57, 60, 64, 67], arp: [64, 67, 69, 72] }, // Am7
  { root: 50, ep: [57, 60, 65, 69], pad: [57, 62, 65, 69], arp: [65, 69, 72, 74] }, // Dm7
];
const END = {
  gm: { root: 43, ep: [58, 62, 65, 69], pad: [55, 58, 62, 65], arp: [62, 65, 67, 70] },  // Gm9
  c: { root: 48, ep: [58, 62, 65, 67], pad: [55, 58, 60, 65], arp: [65, 67, 70, 72] },   // C7sus
  f: { root: 41, ep: [57, 60, 64, 67, 69], pad: [53, 57, 60, 64, 67], arp: [65, 69, 72, 76] }, // Fmaj9
};
const chordOf = (bar) => (bar === 34 ? END.gm : bar >= 35 ? END.f : PROG[bar & 3]);
// [16th step, midi, length in 16ths]
const MEL_A = [
  [[0, 74, 2], [2, 72, 2], [4, 74, 2], [6, 77, 4], [10, 76, 2], [12, 74, 4]],
  [[0, 72, 3], [3, 70, 1], [4, 72, 2], [6, 76, 4], [10, 79, 2], [12, 76, 4]],
  [[0, 76, 2], [2, 77, 2], [4, 76, 2], [6, 72, 4], [10, 69, 2], [12, 72, 4]],
  [[0, 74, 6], [6, 72, 2], [8, 69, 2], [10, 72, 2], [12, 74, 4]],
];
const MEL_B = [
  [[0, 77, 3], [3, 76, 1], [4, 74, 2], [6, 77, 2], [8, 81, 4], [12, 79, 2], [14, 77, 2]],
  [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 76, 2], [8, 79, 8]],
  [[0, 81, 2], [2, 79, 2], [4, 76, 2], [6, 72, 2], [8, 76, 4], [12, 79, 4]],
  [[0, 77, 8], [8, 76, 4], [12, 74, 4]],
];
const MEL_END = [
  [[0, 74, 4], [4, 72, 2], [6, 74, 2], [8, 77, 4], [12, 79, 4]],
  [[0, 81, 16]],
];
const ARP16 = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2];

function arrange() {
  const ev = [];
  const A = (i, t, o = {}) => { ev.push(Object.assign({ i, t }, o)); };
  const S16 = SPB / 4;

  /* ---------- pattern helpers ---------- */
  function groove(bar, o = {}) {
    const kicks = o.kicks || [0, 1.5, 2];
    for (const k of kicks) { if (o.cut != null && k >= o.cut) continue; A('kick', T(bar, k), { v: (k === 0 ? 1 : 0.78) * (o.kv || 1), sc: o.sc != null ? o.sc : 0.68 }); }
    if (o.snap !== false) for (const b of o.snaps || [1, 3]) { if (o.cut != null && b >= o.cut) continue; A(o.clap ? 'clap' : 'snap', T(bar, b), { v: o.sv || 0.72 }); if (o.clap) A('snap', T(bar, b), { v: 0.45 }); }
    if (o.shaker !== false) for (let s = 0; s < 16; s++) { if (o.cut != null && s / 4 >= o.cut) break; A('shaker', T(bar, s / 4), { v: [0.5, 0.16, 0.3, 0.2][s % 4] * (o.hv || 1) }); }
    if (o.ohat) for (let b = 0; b < 4; b++) { if (o.cut != null && b + 0.5 >= o.cut) break; A('hat', T(bar, b + 0.5), { v: 0.2, open: true }); }
    if (o.rim) for (let s = 0; s < 8; s++) if (s % 2 || o.rim === 2) A('rim', T(bar, s / 2), { v: s % 4 === 3 ? 0.5 : 0.32 });
  }
  const PAT = {
    a: [[0, 0, 1.25], [1.5, 0, 0.4], [2, 0, 0.9], [3, 7, 0.4], [3.5, 12, 0.4]],
    b: [[0, 0, 0.9], [1, 12, 0.4], [1.5, 0, 0.4], [2, 0, 0.9], [3, 7, 0.4], [3.5, 12, 0.4]],
    walk: [[0, 0, 0.45], [1, 7, 0.45], [2, 12, 0.45], [3, 7, 0.45]],
    long: [[0, 0, 3.9]],
    half: [[0, 0, 2.3], [2.5, 7, 1.3]],
  };
  function bassline(bar, pat = 'a', o = {}) {
    const r = chordOf(bar).root - 12;
    for (const [b, iv, d] of PAT[pat]) { if (o.cut != null && b >= o.cut) break; A('bass', T(bar, b), { n: r + iv, d: d * SPB, v: o.v || 0.85 }); }
  }
  function ep(bar, o = {}) {
    const n = chordOf(bar).ep;
    for (const [b, d] of o.pat || [[0, 1.4], [1.5, 0.4], [2.5, 1.2]]) { if (o.cut != null && b >= o.cut) break; A('keys', T(bar, b), { notes: n, d: d * SPB, v: o.v || 0.42 }); }
  }
  function pad(bar, o = {}) { A('pad', T(bar), { notes: chordOf(bar).pad, d: SPB * (o.len || 4) - 0.02, v: o.v || 0.55, slow: o.slow }); }
  function arp(bar, inst = 'marimba', o = {}) {
    const a = chordOf(bar).arp, step = o.step || 0.5, n = Math.round((o.len || 4) / step);
    for (let s = 0; s < n; s++) A(inst, T(bar, s * step), { n: a[ARP16[s % 16]] + (o.oct || 0), v: (o.v || 0.3) * (s % 2 ? 0.72 : 1) });
  }
  function mel(bar, phrase, k, inst, o = {}) {
    for (const [s, n, l] of phrase[k]) A(inst, T(bar, s / 4), { n: n + (o.oct || 0), d: l * S16 * 0.94, v: o.v || 0.5 });
  }
  function roll(b0, b1, step, v0, v1, inst = 'snap') {
    for (let b = b0; b < b1 - 1e-6; b += step) { const p = (b - b0) / (b1 - b0); A(inst, b * SPB, { v: lerp(v0, v1, p) }); }
  }

  /* ---------- 0–3 INTRO (music box) ---------- */
  A('auto', 0, { p: 'mlp', k: 'set', v: 2400 });
  A('auto', T(3), { p: 'mlp', k: 'set', v: 2400 });
  A('auto', T(3, 3.75), { p: 'mlp', k: 'exp', v: 18000 });
  for (let bar = 0; bar < 4; bar++) {
    pad(bar, { v: 0.5, slow: true, len: bar === 3 ? 3.75 : 4 });
    mel(bar, MEL_A, bar, 'glock', { oct: 12, v: 0.34 });
    A('sub', T(bar), { n: chordOf(bar).root - 12, d: SPB * 4 - 0.03, v: bar < 2 ? 0.25 : 0.38 });
    if (bar >= 2) for (let s = 0; s < 16; s++) A('shaker', T(bar, s / 4), { v: [0.32, 0.1, 0.2, 0.12][s % 4] });
  }
  [77, 81, 84, 89].forEach((n, j) => A('pop', T(2, j), { n, v: 0.5 }));
  A('swell', T(3), { d: SPB * 3.9, v: 0.45 });
  A('rev', T(4), { d: SPB * 1.5, v: 0.35 });

  /* ---------- 4–7 TITLE ---------- */
  A('boom', T(4), { v: 0.9 }); A('crash', T(4), { v: 0.32 });
  for (let bar = 4; bar < 8; bar++) {
    const last = bar === 7;
    groove(bar, { cut: last ? 3.5 : null, ohat: bar >= 6 });
    bassline(bar, 'a', { cut: last ? 3.5 : null });
    ep(bar, { cut: last ? 3 : null });
    pad(bar, { v: 0.3 });
    mel(bar, MEL_A, bar - 4, 'flute', { v: 0.5 });
    mel(bar, MEL_A, bar - 4, 'glock', { oct: 12, v: 0.16 });
  }
  [81, 84, 86, 89].forEach((n, j) => A('pop', T(6, j), { n, v: 0.42 }));
  A('whoosh', T(7, 3), { d: SPB * 1.2, v: 0.4 });
  A('rev', T(8), { d: SPB, v: 0.3 });

  /* ---------- 8–13 GAME 1 · 마을 ---------- */
  A('boom', T(8), { v: 0.6 }); A('crash', T(8), { v: 0.26 });
  for (let bar = 8; bar < 14; bar++) {
    const last = bar === 13;
    groove(bar, { cut: last ? 3.5 : null });
    bassline(bar, 'a', { cut: last ? 3.5 : null });
    ep(bar, { v: 0.38, cut: last ? 3 : null });
    arp(bar, 'marimba', { v: 0.28, len: last ? 3.5 : 4 });
    if (bar >= 10) { const a = chordOf(bar).arp; [[0, 3], [1.5, 2], [3, 1]].forEach(([b, k]) => A('glock', T(bar, b), { n: a[k] + 12, d: SPB, v: 0.16 })); }
  }
  [[34, 84], [40, 81], [42, 84], [44, 88], [48, 89]].forEach(([b, n]) => A('pop', b * SPB, { n, v: 0.4 }));
  A('whoosh', T(13, 3), { d: SPB * 1.2, v: 0.45 });
  A('rev', T(14), { d: SPB, v: 0.3 });

  /* ---------- 14–19 GAME 2 · 바람을 따라 (+ Painted Skies) ---------- */
  A('boom', T(14), { v: 0.7 }); A('crash', T(14), { v: 0.3 }); A('whoosh', T(14), { d: SPB * 2.5, v: 0.5 });
  for (let bar = 14; bar < 20; bar++) {
    const last = bar === 19;
    groove(bar, { kicks: [0, 1.5, 2, 3.5], ohat: true, hv: 1.1, cut: last ? 3.5 : null });
    bassline(bar, 'b', { cut: last ? 3.5 : null });
    ep(bar, { v: 0.32, pat: [[0, 0.4], [0.75, 0.4], [1.5, 0.4], [2.5, 0.9]], cut: last ? 3 : null });
    arp(bar, 'pluck', { step: 0.25, v: 0.2, len: last ? 3.5 : 4 });
    if (bar >= 16) { mel(bar, MEL_B, bar - 16, 'flute', { v: 0.52 }); mel(bar, MEL_B, bar - 16, 'glock', { oct: 12, v: 0.14 }); }
  }
  [[59.5, 84], [61, 86], [62.5, 89], [64, 91]].forEach(([b, n]) => A('chime', b * SPB, { n, v: 0.4 }));
  A('whoosh', T(18), { d: SPB * 2, v: 0.4 }); A('crash', T(18), { v: 0.22 });
  A('pad', T(18), { notes: [72, 76, 79, 81], d: SPB * 8 - 0.02, v: 0.32, slow: true });
  A('swell', T(19), { d: SPB * 3.9, v: 0.4 });
  A('rev', T(20), { d: SPB * 1.5, v: 0.35 });

  /* ---------- 20–25 GAME 3 · 달빛의 받아치기 ---------- */
  A('boom', T(20), { v: 0.7 }); A('crash', T(20), { v: 0.3 });
  [77, 81, 84, 89, 93].forEach((n, j) => A('glock', T(20, j * 0.25), { n, d: SPB, v: 0.3 - j * 0.03 }));
  A('auto', T(20), { p: 'mlp', k: 'set', v: 3200 });
  A('auto', T(21, 3.5), { p: 'mlp', k: 'exp', v: 18000 });
  for (let bar = 20; bar < 22; bar++) {
    groove(bar, { kicks: [0, 2.5], snaps: [2], shaker: true, hv: 0.6, sv: 0.6, sc: 0.8 });
    bassline(bar, 'half', { v: 0.75 });
    pad(bar, { v: 0.5, slow: true });
    const k = chordOf(bar).ep;
    [k[1], k[2], k[3], k[2], k[3] + 12 - 12, k[2], k[1], k[2]].forEach((n, j) => A('keys', T(bar, j * 0.5), { notes: [n + 12], d: SPB * 0.6, v: j % 2 ? 0.2 : 0.28 }));
  }
  // "한 박자 기다렸다가, 기막히게 받아치세요." — wait one beat, then counter
  A('kick', T(22, 0), { v: 1, sc: 0.6 }); A('stab', T(22, 0), { notes: chordOf(22).ep, v: 0.75 });
  A('tick', T(22, 1), { v: 0.6 }); A('tick', T(22, 1.5), { v: 0.4 });
  A('slash', T(22, 2) - 0.07, { v: 0.8 });
  A('kick', T(22, 2), { v: 1.1, sc: 0.5 }); A('boom', T(22, 2), { v: 1 }); A('crash', T(22, 2), { v: 0.45 });
  A('stab', T(22, 2), { notes: [...chordOf(22).ep, chordOf(22).ep[3] + 5], v: 1, big: true }); A('clap', T(22, 2), { v: 0.8 });
  A('kick', T(22, 3), { v: 0.9 }); A('stab', T(22, 3), { notes: chordOf(23).ep, v: 0.7 }); A('snap', T(22, 3), { v: 0.6 });
  A('bass', T(22, 2), { n: chordOf(22).root - 12, d: SPB * 0.9, v: 0.9 }); A('bass', T(22, 3), { n: chordOf(23).root - 12, d: SPB * 0.9, v: 0.9 });
  roll(91.5, 92, 0.125, 0.3, 0.6);
  for (let bar = 23; bar < 26; bar++) {
    const last = bar === 25;
    groove(bar, { ohat: bar === 24, cut: last ? 3.5 : null });
    bassline(bar, 'a', { cut: last ? 3.5 : null });
    ep(bar, { v: 0.36, cut: last ? 3 : null });
    pad(bar, { v: 0.32 });
  }
  [77, 81, 84, 86, 89, 93].forEach((n, j) => A('glock', (92 + j) * SPB, { n, d: SPB * 0.8, v: 0.32, pop: true }));
  A('swell', T(25), { d: SPB * 3.9, v: 0.35 });
  A('rev', T(26), { d: SPB, v: 0.3 });

  /* ---------- 26–29 GAME 4 · 치과 경쟁 ---------- */
  A('boom', T(26), { v: 0.6 }); A('crash', T(26), { v: 0.26 });
  for (let bar = 26; bar < 30; bar++) {
    const last = bar === 29;
    groove(bar, { kicks: [0, 2, 2.5], rim: 1, shaker: false, cut: last ? 3 : null });
    bassline(bar, 'walk', { cut: last ? 3 : null, v: 0.8 });
    ep(bar, { v: 0.34, pat: [[0, 0.5], [2, 0.5]], cut: last ? 2.5 : null });
    arp(bar, 'marimba', { step: 0.25, v: 0.22, len: last ? 3 : 4 });
  }
  [[106, 84], [108, 77], [109, 81], [110, 84], [111, 88]].forEach(([b, n]) => A('pop', b * SPB, { n, v: 0.42 }));
  [[112, 89], [113.5, 91], [115, 93]].forEach(([b, n]) => A('chime', b * SPB, { n, v: 0.38 }));
  roll(118, 119, 0.25, 0.25, 0.45); roll(119, 120, 0.125, 0.45, 0.85);
  A('swell', T(29), { d: SPB * 3.9, v: 0.5 });
  A('rev', T(30), { d: SPB * 1.5, v: 0.4 });

  /* ---------- 30–33 FINALE (chorus) ---------- */
  A('boom', T(30), { v: 1.05 }); A('crash', T(30), { v: 0.5 });
  for (let bar = 30; bar < 34; bar++) {
    const last = bar === 33;
    groove(bar, { clap: true, ohat: true, cut: last ? 3.5 : null });
    bassline(bar, 'b', { cut: last ? 3.5 : null });
    ep(bar, { v: 0.4 });
    pad(bar, { v: 0.38 });
    arp(bar, 'marimba', { v: 0.22 });
    mel(bar, MEL_A, bar - 30, 'flute', { v: 0.55 });
    mel(bar, MEL_A, bar - 30, 'glock', { oct: 12, v: 0.2 });
  }
  A('crash', T(32), { v: 0.3 });
  roll(135, 136, 0.25, 0.3, 0.6);

  /* ---------- 34–36 OUTRO (Gm9 · C7sus → Fmaj9) ---------- */
  A('crash', T(34), { v: 0.32 });
  groove(34, { kicks: [0, 1.5, 2], cut: 4 });
  for (const [b, ch, d] of [[0, END.gm, 2], [2, END.c, 2]]) {
    A('keys', T(34, b), { notes: ch.ep, d: SPB * d * 0.95, v: 0.42 });
    A('pad', T(34, b), { notes: ch.pad, d: SPB * d - 0.02, v: 0.4 });
    A('bass', T(34, b), { n: ch.root - 12, d: SPB * d * 0.9, v: 0.85 });
  }
  mel(34, MEL_END, 0, 'flute', { v: 0.55 }); mel(34, MEL_END, 0, 'glock', { oct: 12, v: 0.2 });
  A('boom', T(35), { v: 0.7 }); A('crash', T(35), { v: 0.4 }); A('kick', T(35), { v: 1, sc: 0.9 });
  A('keys', T(35), { notes: END.f.ep, d: SPB * 5, v: 0.5 });
  A('pad', T(35), { notes: END.f.pad, d: SPB * 6, v: 0.5, slow: true });
  A('sub', T(35), { n: 29, d: SPB * 5.5, v: 0.5 });
  A('flute', T(35), { n: 81, d: SPB * 4.5, v: 0.5 });
  [77, 81, 84, 88, 89, 93, 96].forEach((n, j) => A('glock', T(35, 0.5 + j * 0.25), { n, d: SPB * 2, v: 0.3 - j * 0.025 }));
  A('auto', T(35, 2), { p: 'master', k: 'set', v: 1 });
  A('auto', DUR - 0.05, { p: 'master', k: 'lin', v: 0 });

  ev.sort((a, b) => a.t - b.t);
  return ev;
}

const SONG = arrange();
const evTimes = (name, filter) => SONG.filter((e) => e.i === name && (!filter || filter(e))).map((e) => e.t);
const KICKS = evTimes('kick');
const SNAPS = SONG.filter((e) => e.i === 'snap' || e.i === 'clap').map((e) => e.t).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.01);
const POPS = SONG.filter((e) => e.i === 'pop' || e.i === 'chime' || (e.i === 'glock' && e.pop)).map((e) => e.t);
const IMPACTS = SONG.filter((e) => e.i === 'boom').map((e) => ({ t: e.t, v: e.v }));
const MELODY = SONG.filter((e) => e.i === 'flute').map((e) => ({ t: e.t, n: e.n, d: e.d }));

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
const AUTO_INIT = { mlp: 18000, master: 1 };
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
  const R = mulberry32(99);
  const noise = new Float32Array(sr * 6);
  for (let i = 0; i < noise.length; i++) noise[i] = R() * 2 - 1;
  const n = Math.floor(3.2 * sr), ir = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) { let lp = 0; for (let i = 0; i < n; i++) { const x = (R() * 2 - 1) * Math.pow(1 - i / n, 3.2); lp += (x - lp) * 0.36; ir[c][i] = lp; } }
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
  const revIn = G(1), revHP = F('highpass', 320, 0.6), revOut = G(0.55);
  revIn.connect(revHP); revHP.connect(rev); rev.connect(revOut); revOut.connect(dst);
  // ping-pong delay (dotted eighth)
  const dIn = G(1), dOut = G(0.38), dL = ac.createDelay(2), dR = ac.createDelay(2);
  dL.delayTime.value = SPB * 0.75; dR.delayTime.value = SPB * 0.75;
  const fbL = G(0.32), fbR = G(0.32), dlpF = F('lowpass', 3600), pL = P(-0.75), pR = P(0.75);
  dIn.connect(dL); dL.connect(dlpF); dlpF.connect(fbL); fbL.connect(dR); dR.connect(fbR); fbR.connect(dL);
  dL.connect(pL); dR.connect(pR); pL.connect(dOut); pR.connect(dOut); dOut.connect(dst);
  // buses
  const drumBus = G(0.85); drumBus.connect(dst);
  const kickShape = ac.createWaveShaper(); kickShape.curve = shaperCurve(1.3);
  const kickBus = G(0.9); kickShape.connect(kickBus); kickBus.connect(drumBus);
  const musicBus = G(1), musicLP = F('lowpass', 18000, 0.8), pump = G(1);
  musicBus.connect(musicLP); musicLP.connect(pump); pump.connect(dst);
  const musicRev = G(0.2); pump.connect(musicRev); musicRev.connect(revIn);
  const fxBus = G(0.8); fxBus.connect(dst);
  const fxRev = G(0.4); fxBus.connect(fxRev); fxRev.connect(revIn);
  const snapRev = G(0.45); snapRev.connect(revIn);
  const PANS = [-0.6, -0.3, 0, 0.3, 0.6];

  function envAD(gn, t, peak, a, d, sustain = 0.0001) {
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    gn.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  const I = {
    kick(t, e) {
      const v = e.v, o = ac.createOscillator();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.045); o.frequency.exponentialRampToValueAtTime(46, t + 0.3);
      const gn = G(0);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v * 0.95, t + 0.004);
      gn.gain.setValueAtTime(v * 0.95, t + 0.05); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      o.connect(gn); gn.connect(kickShape); o.start(t); o.stop(t + 0.4);
      const n = noise(t, 0.02), ng = G(0), nf = F('bandpass', 3200, 0.8); envAD(ng, t, 0.08 * v, 0.001, 0.01);
      n.connect(nf); nf.connect(ng); ng.connect(drumBus);
    },
    snap(t, e) {
      const v = e.v, n = noise(t, 0.2), f = F('bandpass', 2600, 1.4), gn = G(0), p = gn.gain;
      p.setValueAtTime(0.0001, t);
      [0, 0.008].forEach((d) => { p.setValueAtTime(v * 1.6, t + d); p.exponentialRampToValueAtTime(v * 0.2, t + d + 0.006); });
      p.setValueAtTime(v * 1.3, t + 0.014); p.exponentialRampToValueAtTime(0.0001, t + 0.12);
      const pan = P(0.12);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(drumBus); gn.connect(snapRev);
    },
    clap(t, e) {
      const v = e.v, n = noise(t, 0.35), gn = G(0), p = gn.gain, hp = F('highpass', 800), bp = F('bandpass', 1500, 0.8);
      p.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach((d) => { p.setValueAtTime(v * 2.6, t + d); p.exponentialRampToValueAtTime(v * 0.25, t + d + 0.009); });
      p.setValueAtTime(v * 2, t + 0.033); p.exponentialRampToValueAtTime(0.0001, t + 0.26);
      n.connect(hp); hp.connect(bp); bp.connect(gn); gn.connect(drumBus); gn.connect(snapRev);
    },
    rim(t, e) {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = 1750;
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.001, 0.035);
      const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 520;
      const g2 = G(0); envAD(g2, t, e.v * 0.35, 0.001, 0.05);
      const pan = P(-0.25);
      o.connect(gn); o2.connect(g2); gn.connect(pan); g2.connect(pan); pan.connect(drumBus);
      o.start(t); o2.start(t); o.stop(t + 0.08); o2.stop(t + 0.08);
    },
    shaker(t, e) {
      const n = noise(t, 0.08), f = F('highpass', 6500, 0.7), gn = G(0);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(e.v * 0.42, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      const pan = P(0.3);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(drumBus);
    },
    hat(t, e) {
      const d = e.open ? 0.18 : 0.03, n = noise(t, d + 0.05), f = F('highpass', e.open ? 7600 : 8400, 0.9), gn = G(0);
      envAD(gn, t, e.v * 0.9, 0.001, d);
      const pan = P(-0.2);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(drumBus);
    },
    crash(t, e) {
      const v = e.v, n = noise(t, 2.2), f = F('highpass', 5200, 0.6), gn = G(0);
      envAD(gn, t, v * 0.5, 0.004, 1.9);
      n.connect(f); f.connect(gn); gn.connect(fxBus);
    },
    tick(t, e) {
      const o = ac.createOscillator(); o.frequency.value = 2900;
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.001, 0.03);
      o.connect(gn); gn.connect(drumBus); o.start(t); o.stop(t + 0.06);
    },
    swell(t, e) {
      const d = e.d, v = e.v, n = noise(t, d), f = F('bandpass', 400, 1.2), gn = G(0);
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + d);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v * 0.32, t + d); gn.gain.linearRampToValueAtTime(0, t + d + 0.02);
      n.connect(f); f.connect(gn); gn.connect(fxBus);
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + d);
      const og = G(0); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(v * 0.05, t + d); og.gain.linearRampToValueAtTime(0, t + d + 0.02);
      o.connect(og); og.connect(fxBus); o.start(t); o.stop(t + d + 0.05);
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
      o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.7);
      const gn = G(0); envAD(gn, t, v * 0.5, 0.006, 0.9);
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 1.1);
      const n = noise(t, 0.8), f = F('lowpass', 900), ng = G(0);
      envAD(ng, t, v * 0.22, 0.004, 0.5);
      n.connect(f); f.connect(ng); ng.connect(fxBus);
    },
    slash(t, e) {
      const n = noise(t, 0.2), f = F('bandpass', 1500, 2.2), gn = G(0);
      f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(9000, t + 0.08);
      envAD(gn, t, e.v * 0.6, 0.02, 0.12);
      const pan = ac.createStereoPanner(); pan.pan.setValueAtTime(-0.6, t); pan.pan.linearRampToValueAtTime(0.6, t + 0.12);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(fxBus);
    },
    sub(t, e) {
      const d = e.d, v = e.v, o = ac.createOscillator(); o.frequency.value = mtof(e.n);
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.3, t + 0.05);
      gn.gain.setValueAtTime(v * 0.3, t + d - 0.08); gn.gain.linearRampToValueAtTime(0, t + d);
      o.connect(gn); gn.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
    },
    bass(t, e) {
      const d = e.d, v = e.v, f = F('lowpass', 900, 1.6);
      f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(420, t + Math.min(0.25, d));
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.3, t + 0.006);
      gn.gain.exponentialRampToValueAtTime(v * 0.2, t + Math.min(d, 0.2));
      gn.gain.setValueAtTime(v * 0.2, t + d - 0.03); gn.gain.linearRampToValueAtTime(0, t + d);
      [['triangle', 0, 1], ['sawtooth', 4, 0.35]].forEach(([ty, dt, lv]) => {
        const o = ac.createOscillator(); o.type = ty; o.frequency.value = mtof(e.n); o.detune.value = dt;
        const og = G(lv); o.connect(og); og.connect(f); o.start(t); o.stop(t + d + 0.02);
      });
      const so = ac.createOscillator(); so.frequency.value = mtof(e.n); const sg = G(0);
      sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(v * 0.22, t + 0.008); sg.gain.setValueAtTime(v * 0.22, t + d - 0.03); sg.gain.linearRampToValueAtTime(0, t + d);
      so.connect(sg); sg.connect(musicBus); so.start(t); so.stop(t + d + 0.02);
      f.connect(gn); gn.connect(musicBus);
    },
    keys(t, e) {
      for (const n of e.notes) {
        const fq = mtof(n), d = e.d, v = e.v;
        const car = ac.createOscillator(); car.frequency.value = fq;
        const mod = ac.createOscillator(); mod.frequency.value = fq;
        const mg = G(0); mg.gain.setValueAtTime(fq * 1.6, t); mg.gain.exponentialRampToValueAtTime(fq * 0.12, t + 0.9);
        const tine = ac.createOscillator(); tine.frequency.value = fq * 14;
        const tg = G(0); tg.gain.setValueAtTime(fq * 0.6, t); tg.gain.exponentialRampToValueAtTime(1, t + 0.07);
        mod.connect(mg); mg.connect(car.frequency); tine.connect(tg); tg.connect(car.frequency);
        const gn = G(0), hold = Math.max(d, 0.25);
        gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.2, t + 0.004);
        gn.gain.exponentialRampToValueAtTime(v * 0.09, t + Math.min(1, hold));
        gn.gain.setValueAtTime(v * 0.09, t + hold); gn.gain.setTargetAtTime(0, t + hold, 0.12);
        const pan = P((n % 7) / 7 - 0.4);
        car.connect(gn); gn.connect(pan); pan.connect(musicBus);
        const s = G(0.35); gn.connect(s); s.connect(revIn);
        [car, mod, tine].forEach((o) => { o.start(t); o.stop(t + hold + 0.9); });
      }
    },
    pad(t, e) {
      const N = e.notes.length * 3, f = F('lowpass', e.slow ? 1400 : 1800, 0.5), gn = G(0);
      const amp = (e.v * 0.3) / Math.sqrt(N), atk = e.slow ? 0.9 : 0.4;
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(amp, t + atk);
      gn.gain.setValueAtTime(amp, t + e.d); gn.gain.setTargetAtTime(0, t + e.d, 0.3);
      const pans = [P(-0.6), P(0), P(0.6)];
      pans.forEach((p) => p.connect(f));
      for (const n of e.notes) for (let k = 0; k < 3; k++) {
        const o = ac.createOscillator(); o.type = k === 1 ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(n);
        o.detune.value = [-9, 0, 9][k] + (R() - 0.5) * 4;
        o.connect(pans[k]); o.start(t); o.stop(t + e.d + 1.8);
      }
      f.connect(gn); gn.connect(musicBus);
      const s = G(0.6); gn.connect(s); s.connect(revIn);
    },
    glock(t, e) {
      const fq = mtof(e.n);
      const car = ac.createOscillator(); car.frequency.value = fq;
      const mod = ac.createOscillator(); mod.frequency.value = fq * 3.5;
      const mg = G(0); mg.gain.setValueAtTime(fq * 1.4, t); mg.gain.exponentialRampToValueAtTime(fq * 0.02, t + 1.2);
      mod.connect(mg); mg.connect(car.frequency);
      const h = ac.createOscillator(); h.frequency.value = fq * 4; const hg = G(0); envAD(hg, t, e.v * 0.03, 0.001, 0.25);
      const gn = G(0); envAD(gn, t, e.v * 0.16, 0.002, 1.6);
      car.connect(gn); h.connect(hg); hg.connect(gn); gn.connect(musicBus);
      const s = G(0.5); gn.connect(s); s.connect(revIn);
      const s2 = G(0.25); gn.connect(s2); s2.connect(dIn);
      [car, mod, h].forEach((o) => { o.start(t); o.stop(t + 1.8); });
    },
    chime(t, e) { I.glock(t, { n: e.n, v: e.v }); I.glock(t + 0.06, { n: e.n + 12, v: e.v * 0.5 }); },
    marimba(t, e) {
      const fq = mtof(e.n);
      const o = ac.createOscillator(); o.frequency.value = fq;
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.002, 0.32);
      const o2 = ac.createOscillator(); o2.frequency.value = fq * 4; const g2 = G(0); envAD(g2, t, e.v * 0.08, 0.001, 0.05);
      const pan = P(((e.n * 5) % 9) / 9 - 0.45);
      o.connect(gn); o2.connect(g2); gn.connect(pan); g2.connect(pan); pan.connect(musicBus);
      const s = G(0.25); gn.connect(s); s.connect(revIn);
      o.start(t); o2.start(t); o.stop(t + 0.4); o2.stop(t + 0.1);
    },
    pluck(t, e) {
      const f = F('lowpass', 4200, 1.4);
      f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.18);
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.002, 0.22);
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(e.n);
      const o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.value = mtof(e.n); o2.detune.value = 6; const g2 = G(0.25);
      o.connect(f); o2.connect(g2); g2.connect(f); f.connect(gn); gn.connect(musicBus);
      const s = G(0.35); gn.connect(s); s.connect(dIn);
      o.start(t); o2.start(t); o.stop(t + 0.3); o2.stop(t + 0.3);
    },
    flute(t, e) {
      const d = e.d, v = e.v, fq = mtof(e.n), f = F('lowpass', 3600, 0.8);
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.16, t + 0.035);
      gn.gain.setValueAtTime(v * 0.16, t + d); gn.gain.setTargetAtTime(0, t + d, 0.05);
      const lfo = ac.createOscillator(); lfo.frequency.value = 5.2;
      const lg = G(0); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(0, t + 0.18); lg.gain.linearRampToValueAtTime(fq * 0.008, t + Math.max(0.2, d));
      lfo.connect(lg);
      [['sine', 1, 1], ['triangle', 1, 0.35], ['sine', 2, 0.12]].forEach(([ty, mul, lv]) => {
        const o = ac.createOscillator(); o.type = ty; o.frequency.value = fq * mul; lg.connect(o.frequency);
        const og = G(lv); o.connect(og); og.connect(f); o.start(t); o.stop(t + d + 0.4);
      });
      lfo.start(t); lfo.stop(t + d + 0.4);
      const n = noise(t, d), nf = F('bandpass', fq * 2, 2), ng = G(0);
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * 0.03, t + 0.02); ng.gain.setTargetAtTime(v * 0.008, t + 0.05, 0.05); ng.gain.setTargetAtTime(0, t + d, 0.04);
      n.connect(nf); nf.connect(ng); ng.connect(f);
      f.connect(gn); gn.connect(musicBus);
      const s = G(0.45); gn.connect(s); s.connect(revIn);
      const s2 = G(0.2); gn.connect(s2); s2.connect(dIn);
    },
    pop(t, e) {
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(mtof(e.n - 12), t); o.frequency.exponentialRampToValueAtTime(mtof(e.n), t + 0.045);
      const gn = G(0); envAD(gn, t, e.v * 0.32, 0.002, 0.12);
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 0.18);
      I.glock(t + 0.02, { n: e.n + 12, v: e.v * 0.35 });
    },
    stab(t, e) {
      I.keys(t, { notes: e.notes.map((n) => n + 12), d: e.big ? 0.9 : 0.3, v: e.v * 0.8 });
      const N = e.notes.length * 3, f = F('lowpass', e.big ? 5200 : 3400, 0.6), gn = G(0), amp = (e.v * 0.45) / Math.sqrt(N);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(amp, t + 0.006); gn.gain.setTargetAtTime(0, t + 0.08, e.big ? 0.22 : 0.08);
      const pans = PANS.slice(1, 4).map((p) => { const n = P(p); n.connect(f); return n; });
      for (const n of e.notes) for (let k = 0; k < 3; k++) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n + 12); o.detune.value = [-12, 0, 12][k];
        o.connect(pans[k]); o.start(t); o.stop(t + 1.2);
      }
      f.connect(gn); gn.connect(musicBus);
      const s = G(0.6); gn.connect(s); s.connect(revIn);
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
  // gentle sidechain pump (kicks through the tail too, so overlap-add stays exact)
  const pg = pump.gain; pg.setValueAtTime(1, 0);
  for (const e of SONG) {
    if (e.i !== 'kick' || e.t < s0 || e.t >= tEnd) continue;
    const depth = e.sc != null ? e.sc : 0.7;
    if (depth >= 0.99) continue;
    pg.setTargetAtTime(depth, e.t - s0, 0.005);
    pg.setTargetAtTime(1, e.t - s0 + 0.04, 0.1);
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
  const sr = opts.sampleRate || 48000, TAIL = 3.4, SEG = 2;
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
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.2; comp.attack.value = 0.01; comp.release.value = 0.2;
  src.connect(preG); preG.connect(comp); comp.connect(mc.destination); src.start(0);
  const outB = await mc.startRendering();

  // loudness: set the loudest 2-bar window to TARGET dBFS RMS, then soft clip + end fade
  const L = outB.getChannelData(0), Rr = outB.getChannelData(1);
  const win = Math.floor(T(2) * sr);
  let best = 0;
  for (let a = 0; a + win <= total; a += win) {
    let s = 0; for (let i = a; i < a + win; i++) { const m = (L[i] + Rr[i]) * 0.5; s += m * m; }
    best = Math.max(best, Math.sqrt(s / win));
  }
  const TARGET = Math.pow(10, -13 / 20);
  const gain = best > 0 ? TARGET / best : 1;
  const knee = 0.72;
  const clipf = (x) => { const a = Math.abs(x); if (a <= knee) return x; const y = knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)); return Math.sign(x) * y * 0.985; };
  const fadeA = Math.floor(T(35, 2.5) * sr);
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
