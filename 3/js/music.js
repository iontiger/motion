'use strict';
/* ============================================================
   MUSIC — 120 BPM, D major, bright piano-house.
   Drops on the key points are preceded by a riser and a hard
   half-beat of silence ("break"); explanatory parts sit in a
   half-time groove so the pace breathes.
   arrange() builds a pure event list (shared with the visuals for
   beat-sync); renderSong() synthesizes it offline with Web Audio.
   ============================================================ */
const T = (bar, beat = 0) => (bar * 4 + beat) * SPB;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const CHD = {
  Bm: { root: 47, ep: [62, 66, 69, 71], pad: [59, 62, 66, 69], arp: [66, 69, 71, 74] },
  G: { root: 43, ep: [62, 66, 67, 71], pad: [55, 59, 62, 66], arp: [67, 71, 74, 78] },
  D: { root: 50, ep: [62, 66, 69, 74], pad: [57, 62, 66, 69], arp: [66, 69, 74, 78] },
  A: { root: 45, ep: [61, 64, 69, 71], pad: [57, 61, 64, 69], arp: [64, 69, 71, 76] },
  As: { root: 45, ep: [62, 64, 69, 71], pad: [57, 62, 64, 69], arp: [64, 69, 71, 74] },
  G9: { root: 43, ep: [59, 62, 66, 69], pad: [55, 59, 62, 66], arp: [67, 69, 71, 74] },
  Fm: { root: 42, ep: [61, 64, 66, 69], pad: [54, 57, 61, 64], arp: [66, 69, 73, 76] },
  Em: { root: 40, ep: [59, 62, 64, 67], pad: [52, 55, 59, 62], arp: [64, 67, 71, 74] },
  D9: { root: 50, ep: [61, 64, 66, 69], pad: [50, 54, 57, 61, 64], arp: [69, 73, 74, 78] },
};
// one chord per bar (bars 0–80)
const CHORD_BARS = (
  'Bm G D A Bm G D A Bm G D A Bm G D A ' +           // 0–15  intro · title · setup
  'Bm G D A Bm G D A ' +                             // 16–23 실적
  'G9 A Fm Bm G9 A G9 As Bm G ' +                    // 24–33 금리와 FOMC
  'Bm G D A As Bm G D ' +                            // 34–41 중간선거
  'Bm G D A Bm G Bm G As Bm ' +                      // 42–51 데이터센터
  'G9 A Fm Bm G9 A ' +                               // 52–57 중국
  'Bm G D G As Bm G D A G9 ' +                       // 58–67 코스피
  'Em G Bm A Em G Bm As ' +                          // 68–75 리스크
  'Bm G A D9 D9'                                     // 76–80 outro
).trim().split(/\s+/);
const chordOf = (bar) => CHD[CHORD_BARS[clamp(bar, 0, CHORD_BARS.length - 1)]];
const bassNote = (bar) => { const n = chordOf(bar).root - 12; return n < 30 ? n + 12 : n; };

// [16th step, midi, length in 16ths]
const MEL_A = [
  [[0, 78, 2], [2, 81, 2], [4, 83, 3], [7, 81, 1], [8, 78, 2], [10, 76, 2], [12, 78, 4]],
  [[0, 74, 2], [2, 76, 2], [4, 78, 3], [7, 79, 1], [8, 78, 4], [12, 76, 2], [14, 74, 2]],
  [[0, 74, 2], [2, 78, 2], [4, 81, 3], [7, 83, 1], [8, 86, 4], [12, 83, 2], [14, 81, 2]],
  [[0, 81, 6], [6, 78, 2], [8, 76, 4], [12, 73, 4]],
];
const MEL_B = [
  [[0, 83, 2], [2, 81, 2], [4, 78, 2], [6, 81, 2], [8, 83, 3], [11, 86, 1], [12, 83, 4]],
  [[0, 79, 3], [3, 78, 1], [4, 76, 2], [6, 74, 2], [8, 76, 4], [12, 78, 4]],
  [[0, 78, 2], [2, 81, 2], [4, 86, 4], [8, 85, 2], [10, 83, 2], [12, 81, 4]],
  [[0, 81, 4], [4, 83, 2], [6, 81, 2], [8, 76, 8]],
];
const ARP16 = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2];
const PENTA = [66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98]; // D major pentatonic from F#4

function arrange() {
  const ev = [];
  const A = (i, t, o = {}) => { ev.push(Object.assign({ i, t }, o)); };
  const S16 = SPB / 4;
  const B_ = (b) => b * SPB; // absolute beat → seconds

  /* ---------- pattern helpers ---------- */
  function groove(bar, o = {}) {
    const mode = o.mode || 'four', cut = o.cut != null ? o.cut : 9;
    const kicks = o.kicks || (mode === 'four' ? [0, 1, 2, 3] : [0, 2.5]);
    for (const k of kicks) if (k < cut) A('kick', T(bar, k), { v: (k === 0 ? 1 : 0.86) * (o.kv || 1), sc: o.sc != null ? o.sc : 0.6 });
    const claps = o.claps || (mode === 'four' ? [1, 3] : [2]);
    if (o.clap !== false) for (const b of claps) if (b < cut) { A(o.snapOnly ? 'snap' : 'clap', T(bar, b), { v: o.cv || 0.7 }); if (!o.snapOnly) A('snap', T(bar, b), { v: 0.35 }); }
    if (o.shaker !== false) for (let s = 0; s < 16; s++) { if (s / 4 >= cut) break; A('shaker', T(bar, s / 4), { v: [0.45, 0.14, 0.28, 0.18][s % 4] * (o.hv || 1) }); }
    if (o.ohat) for (let b = 0; b < 4; b++) if (b + 0.5 < cut) A('hat', T(bar, b + 0.5), { v: 0.22 * (o.ov || 1), open: true });
    if (o.hats8) for (let s = 0; s < 8; s++) if (s / 2 < cut) A('hat', T(bar, s / 2), { v: s % 2 ? 0.16 : 0.1 });
    if (o.rim) for (let s = 0; s < 8; s++) if ((s % 3 === 2 || s === 7) && s / 2 < cut) A('rim', T(bar, s / 2), { v: 0.4 });
  }
  const PAT = {
    off: [[0.5, 0, 0.42], [1.5, 0, 0.42], [2.5, 0, 0.42], [3.5, 0, 0.42]],
    offo: [[0.5, 0, 0.42], [1.5, 0, 0.42], [2.5, 0, 0.42], [3.25, 12, 0.2], [3.5, 0, 0.42]],
    half: [[0, 0, 1.8], [2.5, 0, 0.4], [3, 7, 0.9]],
    long: [[0, 0, 3.9]],
    roll: [[0, 0, 0.4], [0.5, 0, 0.4], [1, 0, 0.4], [1.5, 0, 0.4], [2, 0, 0.4], [2.5, 0, 0.4], [3, 0, 0.4], [3.5, 0, 0.4]],
  };
  function bassline(bar, pat = 'off', o = {}) {
    const r = bassNote(bar), cut = o.cut != null ? o.cut : 9;
    for (const [b, iv, d] of PAT[pat]) { if (b >= cut) break; A('bass', T(bar, b), { n: r + iv, d: Math.min(d, cut - b) * SPB, v: o.v || 0.85 }); }
  }
  function piano(bar, o = {}) {
    const n = chordOf(bar).ep, cut = o.cut != null ? o.cut : 9;
    const pat = o.pat || [[0, 0.4], [0.75, 0.3], [1.5, 0.4], [2.5, 0.3], [3.25, 0.3]];
    for (const [b, d] of pat) { if (b >= cut) break; A('keys', T(bar, b), { notes: n, d: d * SPB, v: o.v || 0.4, bright: o.bright != null ? o.bright : 1.4 }); }
  }
  function pad(bar, o = {}) { A('pad', T(bar), { notes: chordOf(bar).pad, d: SPB * (o.len || 4) - 0.02, v: o.v || 0.5, slow: o.slow }); }
  function arp(bar, inst = 'pluck', o = {}) {
    const a = chordOf(bar).arp, step = o.step || 0.5, n = Math.round((o.len || 4) / step);
    for (let s = 0; s < n; s++) A(inst, T(bar, s * step), { n: a[ARP16[s % 16]] + (o.oct || 0), v: (o.v || 0.3) * (s % 2 ? 0.72 : 1) });
  }
  function mel(bar, phrase, k, inst, o = {}) {
    for (const [s, n, l] of phrase[k]) A(inst, T(bar, s / 4), { n: n + (o.oct || 0), d: l * S16 * 0.94, v: o.v || 0.5 });
  }
  function lead(bar, phrase, k, o = {}) {
    mel(bar, phrase, k, 'lead', { v: o.v || 0.55 });
    mel(bar, phrase, k, 'glock', { oct: 12, v: o.gv || 0.13 });
  }
  function roll(b0, b1, step, v0, v1, inst = 'snap') {
    for (let b = b0; b < b1 - 1e-6; b += step) { const p = (b - b0) / (b1 - b0); A(inst, B_(b), { v: lerp(v0, v1, p) }); }
  }
  // riser + roll up to the silent gap, then the drop at bDrop
  function breakInto(bDrop, len = 4, o = {}) {
    const gap = o.gap || 0.5, b0 = bDrop - len, bEnd = bDrop - gap;
    A('swell', B_(b0), { d: (bEnd - b0) * SPB, v: o.v || 0.5 });
    const half = Math.max(b0, bEnd - 1.5);
    if (half > b0) roll(b0, half, 0.5, 0.2, 0.42);
    roll(half, bEnd, 0.25, 0.42, 0.9);
    A('auto', B_(b0), { p: 'mlp', k: 'set', v: o.f0 || 2200 });
    A('auto', B_(bEnd), { p: 'mlp', k: 'exp', v: 16000 });
    A('auto', B_(bDrop), { p: 'mlp', k: 'set', v: 18000 });
  }
  function drop(bDrop, v = 1) {
    A('boom', B_(bDrop), { v }); A('crash', B_(bDrop), { v: 0.45 * v });
    A('stab', B_(bDrop), { notes: [...chordOf(Math.floor(bDrop / 4)).ep, chordOf(Math.floor(bDrop / 4)).ep[3] + 5], v: 0.9 * v, big: true });
  }
  const pops = (list, inst = 'pop', v = 0.42) => list.forEach(([b, n]) => A(inst, B_(b), { n, v }));
  // n blips spread over the pentatonic range from index k0 (dir -1 runs downwards)
  const blips = (b0, n, step, v = 0.3, dir = 1, k0 = 0) => {
    const span = dir > 0 ? Math.min(n - 1, PENTA.length - 1 - k0) : Math.min(n - 1, k0);
    for (let i = 0; i < n; i++) A('blip', B_(b0 + i * step), { n: PENTA[k0 + dir * Math.round((i * span) / Math.max(1, n - 1))], v });
  };

  /* ---------- 0–3 INTRO: clock + filtered piano (B0–16) ---------- */
  A('auto', 0, { p: 'mlp', k: 'set', v: 900 });
  A('auto', T(2), { p: 'mlp', k: 'exp', v: 2400 });
  A('auto', T(3, 3.5), { p: 'mlp', k: 'exp', v: 9000 });
  A('auto', T(4), { p: 'mlp', k: 'set', v: 18000 });
  for (let b = 0; b < 15.5; b++) A('clock', B_(b), { v: b % 2 ? 0.4 : 0.55, hi: b % 2 === 0 });
  for (let bar = 0; bar < 4; bar++) {
    const last = bar === 3;
    piano(bar, { v: 0.36, pat: [[0, 1.2], [1.5, 0.4], [2.5, 1.0]], cut: last ? 3.5 : null });
    pad(bar, { v: 0.45, slow: true, len: last ? 3.5 : 4 });
    A('sub', T(bar), { n: bassNote(bar), d: SPB * (last ? 3.5 : 4) - 0.03, v: bar < 2 ? 0.25 : 0.4 });
    if (bar >= 1) for (let s = 0; s < 16; s++) { if (last && s >= 14) break; A('shaker', T(bar, s / 4), { v: [0.3, 0.08, 0.18, 0.1][s % 4] * (bar === 1 ? 0.6 : 1) }); }
    if (bar >= 2) [0, 2].forEach((k) => A('kick', T(bar, k), { v: 0.55, sc: 0.85 }));
  }
  A('flip', B_(4), { v: 0.7 }); A('flip', B_(4.12), { v: 0.4 });
  [74, 78, 81, 86].forEach((n, j) => A('glock', B_(4 + j * 0.25), { n, d: SPB, v: 0.3 }));
  pops([[6, 78], [7, 81], [8, 83], [9, 86], [10, 88], [11, 90]]);
  A('swell', B_(12), { d: SPB * 3.5, v: 0.5 });
  roll(12, 14, 0.5, 0.18, 0.4); roll(14, 15.5, 0.25, 0.4, 0.85);
  // B15.5–16: silence

  /* ---------- 4–7 TITLE (B16–32) ---------- */
  drop(16, 1.05);
  for (let bar = 4; bar < 8; bar++) {
    groove(bar, { ohat: bar >= 5 });
    bassline(bar, bar === 7 ? 'offo' : 'off');
    piano(bar, { v: 0.4 });
    pad(bar, { v: 0.3 });
    lead(bar, MEL_A, bar - 4);
  }
  A('stab', B_(20), { notes: chordOf(5).ep, v: 0.55 }); A('clock', B_(20), { v: 0.6, hi: true }); // "흔들리지" locks still
  A('chime', B_(22), { n: 86, v: 0.4 });                                                       // check mark
  [74, 76, 78, 81, 83, 86, 88].forEach((n, j) => A('pop', B_(24.5 + j * 0.5), { n, v: 0.36 })); // agenda
  roll(30, 32, 0.25, 0.25, 0.55);
  A('rev', B_(32), { d: SPB * 1.5, v: 0.35 });

  /* ---------- 8–15 SETUP: 실적시즌 vs 금리, 10년물, 캘린더 (B32–64) ---------- */
  A('crash', B_(32), { v: 0.3 }); A('boom', B_(32), { v: 0.5 });
  for (let bar = 8; bar < 11; bar++) {
    groove(bar, { hv: 0.9 });
    bassline(bar, 'off');
    piano(bar, { v: 0.36 });
    pad(bar, { v: 0.3 });
  }
  A('pop', B_(36), { n: 81, v: 0.45 });
  A('stamp', B_(40), { v: 0.7 });
  A('pop', B_(41), { n: 86, v: 0.3 });
  // chart line draws B42–49.5 → build, hard stop, 5.3% hit at B50
  groove(11, { hv: 1.1 });
  bassline(11, 'roll', { v: 0.75 });
  pad(11, { v: 0.32 });
  for (let s = 0; s < 30; s++) A('pluck', B_(42 + s * 0.25), { n: PENTA[Math.min(PENTA.length - 1, Math.floor(s / 3))], v: 0.16 + s * 0.006 });
  groove(12, { kicks: [0, 0.5, 1], claps: [], shaker: false, cut: 1.5 });
  breakInto(50, 6, { v: 0.55, f0: 2600 });
  A('kick', B_(50), { v: 1.1, sc: 0.5 }); drop(50, 1.05); A('clap', B_(50), { v: 0.8 });
  A('bass', B_(50), { n: bassNote(12), d: SPB * 1.8, v: 0.9 });
  A('kick', B_(51), { v: 0.7 });
  A('pad', B_(50), { notes: chordOf(12).pad, d: SPB * 2 - 0.02, v: 0.4 });
  // calendar (B52–64)
  for (let bar = 13; bar < 16; bar++) {
    groove(bar, { ohat: bar >= 14, cut: bar === 15 ? 3.5 : null });
    bassline(bar, 'off', { cut: bar === 15 ? 3.5 : null });
    piano(bar, { v: 0.34 });
    pad(bar, { v: 0.28 });
    arp(bar, 'pluck', { v: 0.18, len: bar === 15 ? 3.5 : 4 });
  }
  blips(52, 5, 0.5, 0.3, 1, 2);
  A('whoosh', B_(54.5), { d: SPB * 1.2, v: 0.3 }); A('pop', B_(54.75), { n: 83, v: 0.4 });
  pops([[56, 86], [57, 81], [59, 88]]);
  A('whoosh', B_(58), { d: SPB * 1.5, v: 0.35 });
  A('stamp', B_(60), { v: 0.55 });
  roll(62, 63.5, 0.25, 0.3, 0.7);
  A('rev', B_(64), { d: SPB * 1.5, v: 0.4 });

  /* ---------- 16–23 CH1 실적 (B64–96) ---------- */
  A('boom', B_(64), { v: 0.85 }); A('crash', B_(64), { v: 0.45 });
  for (let bar = 16; bar < 24; bar++) {
    const last = bar === 23;
    groove(bar, { ohat: true, cut: last ? 3.5 : null });
    bassline(bar, bar % 4 === 3 ? 'offo' : 'off', { cut: last ? 3.5 : null });
    piano(bar, { v: 0.38, cut: last ? 3.5 : null });
    pad(bar, { v: 0.26 });
    if (bar >= 18) arp(bar, 'pluck', { step: 0.25, v: 0.13, len: last ? 3.5 : 4 });
    lead(bar, bar < 20 ? MEL_A : MEL_B, (bar - 16) & 3);
  }
  A('swell', B_(68), { d: SPB * 3, v: 0.22 }); A('pop', B_(71), { n: 86, v: 0.45 });
  [72, 73, 74, 75].forEach((b, j) => A('check', B_(b), { n: 81 + j * 2, v: 0.4 }));
  A('crash', B_(76), { v: 0.3 }); A('stab', B_(76), { notes: chordOf(19).ep, v: 0.6 });
  for (let j = 0; j < 12; j++) A('glock', B_(80 + j * 0.25), { n: PENTA[2 + j], d: SPB, v: 0.2 });
  A('pop', B_(84), { n: 88, v: 0.45 });
  [90, 91, 92, 93].forEach((b, j) => A('thud', B_(b), { v: 0.6 + j * 0.08 }));
  A('rev', B_(96), { d: SPB * 2, v: 0.4 });

  /* ---------- 24–33 CH2 금리와 FOMC (B96–136) ---------- */
  A('boom', B_(96), { v: 0.7 }); A('crash', B_(96), { v: 0.35 });
  for (let bar = 24; bar < 29; bar++) {
    groove(bar, { mode: 'half', hats8: true, hv: 0.7 });
    bassline(bar, 'half', { v: 0.8 });
    piano(bar, { v: 0.32, pat: [[0, 1.8], [2.5, 1.2]], bright: 1 });
    pad(bar, { v: 0.42 });
    if (bar >= 25) arp(bar, 'pluck', { v: 0.14 });
  }
  A('swell', B_(100), { d: SPB * 3, v: 0.25 }); A('pop', B_(103), { n: 86, v: 0.42 });
  pops([[106, 81], [108, 83], [110, 86]]);
  // "다만" — back to four, dots light up on 16ths
  groove(29, { hv: 0.9 }); bassline(29, 'off'); piano(29, { v: 0.36 }); pad(29, { v: 0.3 });
  blips(117, 16, 0.25, 0.26, 1, 0);
  groove(30, { ohat: true }); bassline(30, 'off'); piano(30, { v: 0.36 }); pad(30, { v: 0.3 });
  A('pop', B_(121), { n: 90, v: 0.45 });
  A('swell', B_(120), { d: SPB * 4, v: 0.3 });
  // BREAK bar 31 (B124–128): clock + calendar flips 10→11→12월
  A('crash', B_(124), { v: 0.25 });
  A('pad', B_(124), { notes: chordOf(31).pad, d: SPB * 3.5 - 0.02, v: 0.36, slow: true });
  A('sub', B_(124), { n: bassNote(31), d: SPB * 3.5 - 0.03, v: 0.35 });
  for (let b = 124; b < 127.5; b += 1) A('clock', B_(b), { v: 0.6, hi: b % 2 === 0 });
  A('flip', B_(125), { v: 0.6 }); A('flip', B_(126), { v: 0.65 });
  A('swell', B_(126), { d: SPB * 1.5, v: 0.45 }); roll(126, 127.5, 0.25, 0.3, 0.8);
  A('auto', B_(124), { p: 'mlp', k: 'set', v: 1600 }); A('auto', B_(127.5), { p: 'mlp', k: 'exp', v: 12000 }); A('auto', B_(128), { p: 'mlp', k: 'set', v: 18000 });
  // DROP B128: 진짜 승부는 12월
  drop(128, 1.1); A('clap', B_(128), { v: 0.8 });
  for (let bar = 32; bar < 34; bar++) {
    groove(bar, { ohat: true, cut: bar === 33 ? 3.5 : null });
    bassline(bar, 'off', { cut: bar === 33 ? 3.5 : null });
    piano(bar, { v: 0.4 });
    pad(bar, { v: 0.3 });
    lead(bar, MEL_A, bar - 32);
  }
  A('chime', B_(130), { n: 90, v: 0.38 });
  A('rev', B_(136), { d: SPB * 1.5, v: 0.4 });

  /* ---------- 34–41 CH3 중간선거 (B136–168) ---------- */
  A('boom', B_(136), { v: 0.7 }); A('crash', B_(136), { v: 0.35 });
  for (let bar = 34; bar < 38; bar++) {
    groove(bar, { ohat: bar >= 36, hv: 0.85 });
    bassline(bar, 'off');
    piano(bar, { v: 0.36 });
    pad(bar, { v: 0.32 });
    if (bar >= 36) arp(bar, 'pluck', { v: 0.15 });
  }
  [140, 141, 142, 143].forEach((b, j) => A('thud', B_(b), { v: 0.55 + j * 0.06 }));
  pops([[144, 78], [144.5, 76], [145, 83], [145.5, 81]], 'blip', 0.3);
  blips(149, 20, 0.25, 0.26, 1, 0);
  groove(38, { cut: 3.5 }); bassline(38, 'roll', { cut: 3.5, v: 0.7 }); pad(38, { v: 0.3, len: 3.5 });
  breakInto(156, 4, { v: 0.55 });
  drop(156, 1.15); A('clap', B_(156), { v: 0.85 });
  for (let bar = 39; bar < 42; bar++) {
    const last = bar === 41;
    groove(bar, { ohat: true, cut: last ? 3.5 : null });
    bassline(bar, 'off', { cut: last ? 3.5 : null });
    piano(bar, { v: 0.4 });
    pad(bar, { v: 0.3 });
    lead(bar, MEL_A, bar - 39);
  }
  A('stab', B_(164), { notes: chordOf(41).ep, v: 0.5 }); A('clock', B_(164), { v: 0.6, hi: true });
  A('rev', B_(168), { d: SPB * 1.5, v: 0.4 });

  /* ---------- 42–51 CH4 블루웨이브 · 데이터센터 (B168–208) ---------- */
  A('boom', B_(168), { v: 0.7 }); A('crash', B_(168), { v: 0.35 });
  for (let bar = 42; bar < 50; bar++) {
    groove(bar, { ohat: bar >= 44, rim: true });
    bassline(bar, bar % 2 ? 'offo' : 'off');
    piano(bar, { v: 0.34 });
    pad(bar, { v: 0.26 });
    arp(bar, 'pluck', { step: 0.25, v: 0.11 });
  }
  A('stamp', B_(174), { v: 0.55 });
  pops([[176, 81], [178, 86], [180, 83], [183, 86], [186, 88]]);
  A('clock', B_(188), { v: 0.5, hi: true }); A('chime', B_(189), { n: 86, v: 0.32 });
  for (let k = 0; k < 17; k++) A('blip', B_(193 + k * 0.25), { n: PENTA[k % 8 + 2], v: 0.22 });
  A('pop', B_(198), { n: 74, v: 0.4 }); A('check', B_(199), { n: 86, v: 0.42 });
  // capex bars → break → "어디에 짓느냐"
  groove(50, { cut: 3.5, hv: 1.1 }); bassline(50, 'roll', { cut: 3.5, v: 0.7 }); pad(50, { v: 0.3, len: 3.5 });
  A('pop', B_(200), { n: 81, v: 0.45 }); A('pop', B_(201.5), { n: 88, v: 0.5 });
  breakInto(204, 4, { v: 0.5 });
  drop(204, 1.05); A('clap', B_(204), { v: 0.8 });
  groove(51, { ohat: true, cut: 3.5 }); bassline(51, 'off', { cut: 3.5 }); piano(51, { v: 0.4, cut: 3.5 }); pad(51, { v: 0.3 });
  lead(51, MEL_A, 0);
  A('chime', B_(205), { n: 90, v: 0.36 });
  A('rev', B_(208), { d: SPB * 1.5, v: 0.32 });

  /* ---------- 52–57 CH5 중국: half-time (B208–232) ---------- */
  A('crash', B_(208), { v: 0.28 }); A('boom', B_(208), { v: 0.45 });
  for (let bar = 52; bar < 58; bar++) {
    groove(bar, { mode: 'half', snapOnly: true, hv: 0.6, cv: 0.6 });
    bassline(bar, 'half', { v: 0.75 });
    piano(bar, { v: 0.3, pat: [[0, 1.6], [1.75, 0.4], [2.5, 1.2]], bright: 0.9 });
    pad(bar, { v: 0.45, slow: true });
    arp(bar, 'marimba', { v: 0.2 });
  }
  [81, 78, 76, 74].forEach((n, j) => A('glock', B_(212 + j), { n, d: SPB * 1.5, v: 0.22 }));
  pops([[216, 66], [217, 69]], 'blip', 0.36);
  A('quest', B_(218), { n: 81, v: 0.45 });
  pops([[220, 81], [222, 83], [224, 86]]);
  [74, 78, 81, 86, 90].forEach((n, j) => A('glock', B_(226 + j * 0.5), { n, d: SPB * 1.5, v: 0.26 }));
  A('rev', B_(232), { d: SPB * 2, v: 0.36 });

  /* ---------- 58–67 CH6 코스피 (B232–272) ---------- */
  A('boom', B_(232), { v: 0.65 }); A('crash', B_(232), { v: 0.35 });
  for (let bar = 58; bar < 61; bar++) {
    groove(bar, { mode: 'half', hats8: true, hv: 0.7 });
    bassline(bar, 'half', { v: 0.78 });
    piano(bar, { v: 0.32, pat: [[0, 1.8], [2.5, 1.2]], bright: 1 });
    pad(bar, { v: 0.42 });
  }
  pops([[236, 78], [240, 83], [242, 86]]);
  groove(61, {}); bassline(61, 'off'); piano(61, { v: 0.34 }); pad(61, { v: 0.3 });
  A('stamp', B_(244), { v: 0.6 });
  [86, 83, 81, 78, 76, 74, 71, 69].forEach((n, j) => A('blip', B_(244 + j * 0.25), { n, v: 0.26 }));
  pops([[246, 81], [247, 86]]);
  groove(62, { cut: 3.5 }); bassline(62, 'roll', { cut: 3.5, v: 0.7 }); pad(62, { v: 0.3, len: 3.5 });
  pops([[248, 83], [249.5, 88]]);
  breakInto(252, 4, { v: 0.55 });
  drop(252, 1.15); A('clap', B_(252), { v: 0.85 });
  for (let bar = 63; bar < 65; bar++) {
    groove(bar, { ohat: true });
    bassline(bar, 'off');
    piano(bar, { v: 0.4 });
    pad(bar, { v: 0.3 });
    lead(bar, MEL_A, bar - 63);
  }
  A('chime', B_(253), { n: 90, v: 0.4 });
  pops([[255, 74], [256, 81], [257, 83], [258, 86]]);
  A('crash', B_(260), { v: 0.25 });
  for (let bar = 65; bar < 68; bar++) {
    groove(bar, { mode: 'half', snapOnly: true, hv: 0.55, cv: 0.55 });
    bassline(bar, 'long', { v: 0.7 });
    piano(bar, { v: 0.3, pat: [[0, 1.8], [2.5, 1.2]], bright: 0.9 });
    pad(bar, { v: 0.45, slow: true });
  }
  pops([[262, 81], [264, 83], [265.5, 78]]);
  A('check', B_(268), { n: 81, v: 0.36 });
  A('rev', B_(272), { d: SPB * 1.5, v: 0.34 });

  /* ---------- 68–75 RISK checklist (B272–304) ---------- */
  A('boom', B_(272), { v: 0.6 }); A('crash', B_(272), { v: 0.25 });
  for (let bar = 68; bar < 74; bar++) {
    groove(bar, { mode: 'half', hats8: true, hv: 0.75 });
    bassline(bar, 'half', { v: 0.8 });
    piano(bar, { v: 0.32, pat: [[0, 0.4], [0.75, 0.3], [1.5, 1.2], [3, 0.4]], bright: 1.1 });
    pad(bar, { v: 0.4 });
    arp(bar, 'pluck', { v: 0.13 });
  }
  [276, 282, 288, 294].forEach((b, j) => A('check', B_(b), { n: 81 + j * 2, v: 0.45 }));
  groove(74, { ohat: true }); bassline(74, 'off'); piano(74, { v: 0.36 }); pad(74, { v: 0.32 }); arp(74, 'pluck', { step: 0.25, v: 0.14 });
  groove(75, { cut: 3.5 }); bassline(75, 'roll', { cut: 3.5, v: 0.7 }); pad(75, { v: 0.3, len: 3.5 });
  breakInto(304, 4, { v: 0.6 });

  /* ---------- 76–80 OUTRO (B304–322) ---------- */
  drop(304, 1.2); A('clap', B_(304), { v: 0.9 });
  const OUT_MEL = [0, 1, 3];
  for (let bar = 76; bar < 79; bar++) {
    groove(bar, { ohat: true, cut: bar === 78 ? 3.5 : null });
    bassline(bar, 'off', { cut: bar === 78 ? 3.5 : null });
    piano(bar, { v: 0.42, cut: bar === 78 ? 3.5 : null });
    pad(bar, { v: 0.32 });
    lead(bar, MEL_A, OUT_MEL[bar - 76]);
    arp(bar, 'pluck', { step: 0.25, v: 0.12 });
  }
  A('stab', B_(305), { notes: chordOf(76).ep, v: 0.5 }); A('clock', B_(305), { v: 0.6, hi: true });
  A('chime', B_(308), { n: 86, v: 0.4 });
  pops([[312, 81], [312.5, 83], [313, 86], [313.5, 88]]);
  roll(314.5, 315.5, 0.25, 0.3, 0.6);
  const F9 = CHD.D9;
  A('boom', T(79), { v: 0.9 }); A('crash', T(79), { v: 0.5 }); A('kick', T(79), { v: 1, sc: 0.9 });
  A('keys', T(79), { notes: F9.ep, d: SPB * 5, v: 0.5, bright: 1.2 });
  A('pad', T(79), { notes: F9.pad, d: SPB * 6, v: 0.5, slow: true });
  A('sub', T(79), { n: 38, d: SPB * 5.5, v: 0.5 });
  A('lead', T(79), { n: 81, d: SPB * 3, v: 0.4 });
  [74, 78, 81, 85, 86, 90, 93].forEach((n, j) => A('glock', T(79, 0.5 + j * 0.25), { n, d: SPB * 2, v: 0.28 - j * 0.025 }));

  ev.sort((a, b) => a.t - b.t);
  return ev;
}

const SONG = arrange();
const evTimes = (name, filter) => SONG.filter((e) => e.i === name && (!filter || filter(e))).map((e) => e.t);
const KICKS = evTimes('kick');
const CLAPS = SONG.filter((e) => e.i === 'clap' || e.i === 'snap').map((e) => e.t).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.01);
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
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v * 0.95, t + 0.003);
      gn.gain.setValueAtTime(v * 0.95, t + 0.045); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
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
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(e.v * 0.4, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
      const pan = P(0.3);
      n.connect(f); f.connect(gn); gn.connect(pan); pan.connect(drumBus);
    },
    hat(t, e) {
      const d = e.open ? 0.17 : 0.03, n = noise(t, d + 0.05), f = F('highpass', e.open ? 7400 : 8600, 0.9), gn = G(0);
      envAD(gn, t, e.v * 0.9, 0.001, d);
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
  const TARGET = Math.pow(10, -12.5 / 20);
  const gain = best > 0 ? TARGET / best : 1;
  const knee = 0.72;
  const clipf = (x) => { const a = Math.abs(x); if (a <= knee) return x; const y = knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)); return Math.sign(x) * y * 0.985; };
  const fadeA = Math.floor(T(79, 3) * sr);
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
