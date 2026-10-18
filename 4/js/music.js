'use strict';
/* ============================================================
   MUSIC — 128 BPM, A minor, punchy neon house with trap-style
   half-time sections. Every drop is preceded by a riser and a
   half-beat of silence ("break"); the outro resolves to C major.
   arrange() builds a pure event list (shared with the visuals for
   beat-sync); renderSong() synthesizes it offline with Web Audio.
   ============================================================ */
const T = (bar, beat = 0) => (bar * 4 + beat) * SPB;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const CHD = {
  Am: { root: 45, ep: [64, 67, 69, 72], pad: [57, 60, 64, 67], arp: [69, 72, 76, 79] },
  F: { root: 41, ep: [64, 65, 69, 72], pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] },
  C: { root: 48, ep: [64, 67, 71, 72], pad: [55, 60, 64, 67], arp: [67, 72, 76, 79] },
  G: { root: 43, ep: [62, 67, 71, 74], pad: [55, 59, 62, 67], arp: [67, 71, 74, 79] },
  Gs: { root: 43, ep: [62, 67, 72, 74], pad: [55, 60, 62, 67], arp: [67, 72, 74, 79] },
  Em: { root: 40, ep: [62, 64, 67, 71], pad: [52, 55, 59, 64], arp: [64, 67, 71, 76] },
  Dm: { root: 50, ep: [62, 65, 69, 72], pad: [57, 62, 65, 69], arp: [65, 69, 74, 77] },
  C9: { root: 48, ep: [62, 64, 67, 71], pad: [48, 55, 60, 64, 67], arp: [72, 74, 76, 79] },
};
// one chord per bar (bars 0–68)
const CHORD_BARS = (
  'Am F C G Am F C G ' +                              // 0–7   intro · title
  'Am F C G Am F C Gs ' +                             // 8–15  01 같은 잣대로
  'Am F C G Am F Gs Am G ' +                          // 16–24 02 고점 대비 · 왜?
  'Am F C G Gs Am F C G Am ' +                        // 25–34 03 지수 안의 무게
  'Dm Am F Em Dm Am Gs ' +                            // 35–41 04 메모리 vs 파운드리
  'Am F C Gs Am F C G ' +                             // 42–49 05 미국도 같은 그림
  'F G Em Am F G C Am F Gs ' +                        // 50–59 06 마무리
  'Am F C G Am F G C9 C9'                             // 60–68 outro
).trim().split(/\s+/);
const chordOf = (bar) => CHD[CHORD_BARS[clamp(bar, 0, CHORD_BARS.length - 1)]];
const bassNote = (bar) => { const n = chordOf(bar).root - 12; return n < 30 ? n + 12 : n; };

// [16th step, midi, length in 16ths]
const MEL_A = [
  [[0, 76, 2], [2, 79, 2], [4, 81, 3], [7, 79, 1], [8, 76, 2], [10, 74, 2], [12, 72, 4]],
  [[0, 72, 2], [2, 74, 2], [4, 76, 3], [7, 77, 1], [8, 76, 4], [12, 74, 2], [14, 72, 2]],
  [[0, 72, 2], [2, 76, 2], [4, 79, 3], [7, 81, 1], [8, 84, 4], [12, 81, 2], [14, 79, 2]],
  [[0, 79, 6], [6, 76, 2], [8, 74, 4], [12, 71, 4]],
];
const MEL_B = [
  [[0, 81, 2], [3, 81, 1], [4, 79, 2], [6, 76, 2], [8, 81, 3], [11, 84, 1], [12, 81, 4]],
  [[0, 77, 3], [3, 76, 1], [4, 74, 2], [6, 72, 2], [8, 74, 4], [12, 76, 4]],
  [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 83, 2], [10, 81, 2], [12, 79, 4]],
  [[0, 79, 4], [4, 81, 2], [6, 79, 2], [8, 74, 8]],
];
const ARP16 = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2];
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88]; // A minor pentatonic

function arrange() {
  const ev = [];
  const A = (i, t, o = {}) => { ev.push(Object.assign({ i, t }, o)); };
  const S16 = SPB / 4;
  const B_ = (b) => b * SPB; // absolute beat → seconds

  /* ---------- pattern helpers ---------- */
  function groove(bar, o = {}) {
    const mode = o.mode || 'four', cut = o.cut != null ? o.cut : 9;
    const kicks = o.kicks || (mode === 'four' ? [0, 1, 2, 3] : [0, 1.75, 2.5]);
    for (const k of kicks) if (k < cut) A('kick', T(bar, k), { v: (k === 0 ? 1 : 0.88) * (o.kv || 1), sc: o.sc != null ? o.sc : 0.5 });
    const claps = o.claps || (mode === 'four' ? [1, 3] : [2]);
    if (o.clap !== false) for (const b of claps) if (b < cut) { A(o.snapOnly ? 'snap' : 'clap', T(bar, b), { v: o.cv || 0.75 }); if (!o.snapOnly) A('snap', T(bar, b), { v: 0.4 }); }
    if (o.shaker) for (let s = 0; s < 16; s++) { if (s / 4 >= cut) break; A('shaker', T(bar, s / 4), { v: [0.45, 0.14, 0.28, 0.18][s % 4] * (o.hv || 1) }); }
    if (o.ohat !== false && mode === 'four') for (let b = 0; b < 4; b++) if (b + 0.5 < cut) A('hat', T(bar, b + 0.5), { v: 0.26 * (o.ov || 1), open: true });
    if (o.h16 !== false) {
      const roll = o.roll != null ? o.roll : bar % 2 === 1;
      for (let s = 0; s < 16; s++) {
        if (s / 4 >= cut) break;
        if (roll && s >= 14) { for (let k = 0; k < 2; k++) A('hat', T(bar, s / 4 + k / 8), { v: 0.1 + (s - 14) * 0.05 + k * 0.03 }); continue; }
        A('hat', T(bar, s / 4), { v: [0.2, 0.08, 0.14, 0.09][s % 4] * (o.hv || 1) });
      }
    }
    if (o.rim) for (let s = 0; s < 8; s++) if ((s % 3 === 2 || s === 7) && s / 2 < cut) A('rim', T(bar, s / 2), { v: 0.4 });
  }
  const PAT = {
    off: [[0.5, 0, 0.42], [1.5, 0, 0.42], [2.5, 0, 0.42], [3.5, 0, 0.42]],
    offo: [[0.5, 0, 0.42], [1.5, 0, 0.42], [2.5, 0, 0.42], [3.25, 12, 0.2], [3.5, 0, 0.42]],
    drive: [[0, 0, 0.2], [0.5, 0, 0.42], [0.75, 12, 0.2], [1.5, 0, 0.42], [2, 0, 0.2], [2.5, 0, 0.42], [3, 7, 0.2], [3.5, 0, 0.42]],
    roll: [[0, 0, 0.4], [0.5, 0, 0.4], [1, 0, 0.4], [1.5, 0, 0.4], [2, 0, 0.4], [2.5, 0, 0.4], [3, 0, 0.4], [3.5, 0, 0.4]],
  };
  function bassline(bar, pat = 'off', o = {}) {
    const r = bassNote(bar), cut = o.cut != null ? o.cut : 9;
    for (const [b, iv, d] of PAT[pat]) { if (b >= cut) break; A('bass', T(bar, b), { n: r + iv, d: Math.min(d, cut - b) * SPB, v: o.v || 0.85 }); }
  }
  // trap 808: long note on 1, short re-hits, slide into the next bar
  function b808(bar, o = {}) {
    const r = bassNote(bar) - 12 < 28 ? bassNote(bar) : bassNote(bar) - 12, cut = o.cut != null ? o.cut : 9;
    const hits = [[0, 1.6], [1.75, 0.6], [2.5, 1.3]];
    for (const [b, d] of hits) if (b < cut) A('sub808', T(bar, b), { n: r, d: Math.min(d, cut - b) * SPB, v: o.v || 0.9, glide: b === 0 ? 12 : 0 });
  }
  function piano(bar, o = {}) {
    const n = chordOf(bar).ep, cut = o.cut != null ? o.cut : 9;
    const pat = o.pat || [[0, 0.4], [0.75, 0.3], [1.5, 0.4], [2.5, 0.3], [3.25, 0.3]];
    for (const [b, d] of pat) { if (b >= cut) break; A('keys', T(bar, b), { notes: n, d: d * SPB, v: o.v || 0.36, bright: o.bright != null ? o.bright : 1.4 }); }
  }
  function saws(bar, o = {}) { // supersaw chord pumping on the offbeats
    const n = chordOf(bar).ep, cut = o.cut != null ? o.cut : 9;
    for (const b of [0.5, 1.5, 2.5, 3.5]) if (b < cut) A('stab', T(bar, b), { notes: n, v: o.v || 0.32 });
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
    mel(bar, phrase, k, 'glock', { oct: 12, v: o.gv || 0.12 });
  }
  function roll(b0, b1, step, v0, v1, inst = 'snap') {
    for (let b = b0; b < b1 - 1e-6; b += step) { const p = (b - b0) / (b1 - b0); A(inst, B_(b), { v: lerp(v0, v1, p) }); }
  }
  // riser + roll up to the silent gap, then the drop at bDrop
  function breakInto(bDrop, len = 4, o = {}) {
    const gap = o.gap || 0.5, b0 = bDrop - len, bEnd = bDrop - gap;
    A('swell', B_(b0), { d: (bEnd - b0) * SPB, v: o.v || 0.55 });
    const half = Math.max(b0, bEnd - 1.5);
    if (half > b0) roll(b0, half, 0.5, 0.2, 0.42);
    roll(half, bEnd, 0.25, 0.42, 0.8);
    roll(bEnd - 0.5, bEnd, 0.125, 0.5, 0.9);
    A('auto', B_(b0), { p: 'mlp', k: 'set', v: o.f0 || 1800 });
    A('auto', B_(bEnd), { p: 'mlp', k: 'exp', v: 16000 });
    A('auto', B_(bDrop), { p: 'mlp', k: 'set', v: 18000 });
  }
  function drop(bDrop, v = 1) {
    const c = chordOf(Math.floor(bDrop / 4));
    A('boom', B_(bDrop), { v }); A('crash', B_(bDrop), { v: 0.5 * v }); A('zap', B_(bDrop), { v: 0.5 * v });
    A('stab', B_(bDrop), { notes: [...c.ep, c.ep[3] + 5], v: 0.9 * v, big: true });
  }
  const pops = (list, inst = 'pop', v = 0.42) => list.forEach(([b, n]) => A(inst, B_(b), { n, v }));
  const blips = (b0, n, step, v = 0.3, dir = 1, k0 = 0) => {
    const span = dir > 0 ? Math.min(n - 1, PENTA.length - 1 - k0) : Math.min(n - 1, k0);
    for (let i = 0; i < n; i++) A('blip', B_(b0 + i * step), { n: PENTA[k0 + dir * Math.round((i * span) / Math.max(1, n - 1))], v });
  };
  // full four-on-the-floor bar
  function full(bar, o = {}) {
    groove(bar, { cut: o.cut, hv: o.hv });
    bassline(bar, o.bass || (bar % 4 === 3 ? 'offo' : 'off'), { cut: o.cut });
    pad(bar, { v: 0.26, len: o.cut ? o.cut : 4 });
    if (o.saws !== false) saws(bar, { cut: o.cut, v: o.sv || 0.24 });
    if (o.arp) arp(bar, 'pluck', { step: 0.25, v: 0.11, len: o.cut || 4 });
    if (o.lead) lead(bar, o.lead, o.k != null ? o.k : bar & 3);
    if (o.piano) piano(bar, { v: 0.32, cut: o.cut });
  }
  // trap half-time bar
  function trap(bar, o = {}) {
    groove(bar, { mode: 'half', cut: o.cut, hv: 1.1, roll: o.roll });
    b808(bar, { cut: o.cut });
    pad(bar, { v: 0.4, slow: true, len: o.cut ? o.cut : 4 });
    if (o.arp !== false) arp(bar, o.inst || 'pluck', { v: 0.16, len: o.cut || 4 });
    if (o.piano) piano(bar, { v: 0.3, pat: [[0, 1.8], [2.5, 1.2]], bright: 1, cut: o.cut });
  }

  /* ---------- 0–3 INTRO: filtered beat, ticker (B0–16) ---------- */
  A('auto', 0, { p: 'mlp', k: 'set', v: 700 });
  A('auto', T(2), { p: 'mlp', k: 'exp', v: 2200 });
  A('auto', T(3, 3.5), { p: 'mlp', k: 'exp', v: 9000 });
  A('auto', T(4), { p: 'mlp', k: 'set', v: 18000 });
  for (let bar = 0; bar < 4; bar++) {
    const last = bar === 3;
    pad(bar, { v: 0.45, slow: true, len: last ? 3.5 : 4 });
    arp(bar, 'pluck', { step: 0.25, v: 0.14, len: last ? 3.5 : 4 });
    A('sub', T(bar), { n: bassNote(bar), d: SPB * (last ? 3.5 : 4) - 0.03, v: 0.4 });
    if (bar >= 1) groove(bar, { kicks: [0, 1, 2, 3], clap: bar >= 2, ohat: false, cut: last ? 3.5 : null, kv: 0.7, hv: bar === 1 ? 0.6 : 1, roll: false });
  }
  A('tick', B_(0), { v: 0.5 }); A('tick', B_(2), { v: 0.5 });
  pops([[4, 76], [6, 79], [8, 81], [10, 84]], 'blip', 0.34);
  A('stamp', B_(8), { v: 0.55 });
  [8.5, 9, 9.5].forEach((b) => A('glitch', B_(b), { v: 0.4 }));
  breakInto(16, 4, { v: 0.55, f0: 2400 });

  /* ---------- 4–7 TITLE DROP (B16–32) ---------- */
  drop(16, 1.15); A('clap', B_(16), { v: 0.9 });
  for (let bar = 4; bar < 8; bar++) full(bar, { lead: MEL_A, arp: bar >= 6 });
  A('glitch', B_(20), { v: 0.5 }); A('glitch', B_(20.25), { v: 0.4 });
  A('chime', B_(24), { n: 84, v: 0.4 });
  roll(30, 32, 0.25, 0.25, 0.6);
  A('rev', B_(32), { d: SPB * 1.5, v: 0.4 });

  /* ---------- 8–15 CH1 같은 잣대로 (B32–64) ---------- */
  A('boom', B_(32), { v: 0.8 }); A('crash', B_(32), { v: 0.4 }); A('zap', B_(32), { v: 0.35 });
  for (let bar = 8; bar < 11; bar++) full(bar, { saws: false, piano: true, arp: bar >= 9 });
  pops([[36, 76], [37, 81]]); A('stamp', B_(38), { v: 0.6 }); pops([[39, 84]]);
  // chart draws B44–56: rising plucks, then labels pop
  for (let bar = 11; bar < 14; bar++) full(bar, { saws: bar >= 12, arp: true, piano: bar === 11 });
  for (let s = 0; s < 40; s++) A('pluck', B_(44 + s * 0.3), { n: PENTA[Math.min(PENTA.length - 1, 3 + Math.floor(s / 4))], v: 0.12 + s * 0.004 });
  A('check', B_(56), { n: 81, v: 0.45 }); A('check', B_(57), { n: 76, v: 0.4 });
  full(14, { lead: MEL_B, k: 0 });
  groove(15, { cut: 3.5 }); bassline(15, 'roll', { cut: 3.5, v: 0.7 }); pad(15, { v: 0.3, len: 3.5 });
  breakInto(64, 4, { v: 0.6 });

  /* ---------- 16–24 CH2 10월 고점 대비 (B64–100) ---------- */
  drop(64, 1.1); A('clap', B_(64), { v: 0.85 });
  for (let bar = 16; bar < 21; bar++) full(bar, { lead: bar >= 17 ? MEL_B : null, k: (bar - 17) & 3, arp: bar >= 18, bass: 'drive' });
  // counters tick down
  for (let k = 0; k < 16; k++) A('blip', B_(70 + k * 0.25), { n: PENTA[13 - Math.floor(k * 0.8)], v: 0.22 });
  A('stamp', B_(74), { v: 0.7 });
  for (let k = 0; k < 10; k++) A('blip', B_(74.5 + k * 0.25), { n: PENTA[10 - Math.floor(k * 0.6)], v: 0.2 });
  A('stamp', B_(77), { v: 0.55 }); A('pop', B_(78.5), { n: 76, v: 0.4 });
  A('glitch', B_(84), { v: 0.6 }); A('stab', B_(84), { notes: chordOf(21).ep, v: 0.6 });
  full(21, { saws: false, arp: true });
  groove(22, { cut: 3.5 }); bassline(22, 'roll', { cut: 3.5, v: 0.7 }); pad(22, { v: 0.3, len: 3.5 });
  breakInto(92, 4, { v: 0.6 });
  // "왜?" — half-time hit, question blips
  drop(92, 1.05);
  trap(23, { piano: true }); trap(24, { cut: 3.5, piano: true });
  A('quest', B_(93), { n: 76, v: 0.5 }); A('quest', B_(96), { n: 79, v: 0.45 });
  A('rev', B_(100), { d: SPB * 1.5, v: 0.4 });

  /* ---------- 25–34 CH3 지수 안의 무게 (B100–140) ---------- */
  A('boom', B_(100), { v: 0.8 }); A('crash', B_(100), { v: 0.4 }); A('zap', B_(100), { v: 0.35 });
  for (let bar = 25; bar < 29; bar++) trap(bar, { inst: 'marimba', piano: bar >= 26 });
  A('pop', B_(106), { n: 81, v: 0.45 }); A('stamp', B_(110), { v: 0.6 }); pops([[112, 76], [113, 79]]);
  groove(29, { cut: 3.5, hv: 1.1 }); bassline(29, 'roll', { cut: 3.5, v: 0.7 }); pad(29, { v: 0.3, len: 3.5 });
  breakInto(120, 4, { v: 0.6 });
  drop(120, 1.15); A('clap', B_(120), { v: 0.9 });
  for (let bar = 30; bar < 35; bar++) full(bar, { lead: bar < 34 ? MEL_A : null, k: bar - 30, arp: bar >= 32, cut: bar === 34 ? 3.5 : null });
  A('stamp', B_(124), { v: 0.7 }); A('stamp', B_(126), { v: 0.6 });
  pops([[130, 81], [131, 84]]);
  A('rev', B_(140), { d: SPB * 1.5, v: 0.4 });

  /* ---------- 35–41 CH4 메모리 vs 파운드리: moody half-time (B140–168) ---------- */
  A('boom', B_(140), { v: 0.7 }); A('crash', B_(140), { v: 0.35 });
  for (let bar = 35; bar < 41; bar++) {
    groove(bar, { mode: 'half', snapOnly: true, hv: 0.8, cv: 0.65 });
    b808(bar, { v: 0.85 });
    pad(bar, { v: 0.48, slow: true });
    arp(bar, 'marimba', { v: 0.2 });
    if (bar >= 37) piano(bar, { v: 0.28, pat: [[0, 1.6], [1.75, 0.4], [2.5, 1.2]], bright: 0.9 });
  }
  // wave visual: big swings (memory) vs small (foundry)
  [76, 84, 72, 86, 69].forEach((n, j) => A('glock', B_(146 + j), { n, d: SPB * 1.5, v: 0.24 }));
  [79, 81, 79, 81].forEach((n, j) => A('glock', B_(151 + j * 0.5), { n, d: SPB, v: 0.18 }));
  A('quest', B_(156), { n: 76, v: 0.45 });
  pops([[160, 76], [162, 79], [164, 84]]);
  groove(41, { cut: 3.5 }); bassline(41, 'roll', { cut: 3.5, v: 0.7 }); pad(41, { v: 0.3, len: 3.5 });
  A('swell', B_(164), { d: SPB * 3.5, v: 0.45 }); roll(166, 167.5, 0.25, 0.3, 0.7);
  A('rev', B_(168), { d: SPB * 1.5, v: 0.35 });

  /* ---------- 42–49 CH5 미국도 같은 그림 (B168–200) ---------- */
  A('boom', B_(168), { v: 0.8 }); A('crash', B_(168), { v: 0.4 }); A('zap', B_(168), { v: 0.35 });
  for (let bar = 42; bar < 45; bar++) full(bar, { saws: false, piano: true, arp: true, bass: 'drive' });
  for (let k = 0; k < 12; k++) A('blip', B_(176 + k * 0.25), { n: PENTA[12 - k], v: 0.22 });
  A('stamp', B_(179), { v: 0.7 });
  groove(45, { cut: 3.5 }); bassline(45, 'roll', { cut: 3.5, v: 0.7 }); pad(45, { v: 0.3, len: 3.5 });
  breakInto(184, 4, { v: 0.6 });
  drop(184, 1.1); A('clap', B_(184), { v: 0.85 });
  for (let bar = 46; bar < 50; bar++) full(bar, { lead: MEL_B, k: bar - 46, arp: bar >= 47 });
  A('check', B_(192), { n: 84, v: 0.45 });
  A('rev', B_(200), { d: SPB * 1.5, v: 0.4 });

  /* ---------- 50–59 CH6 마무리 (B200–240) ---------- */
  A('boom', B_(200), { v: 0.7 }); A('crash', B_(200), { v: 0.35 }); A('zap', B_(200), { v: 0.3 });
  for (let bar = 50; bar < 54; bar++) trap(bar, { piano: true, inst: 'pluck' });
  [206, 208].forEach((b, j) => A('check', B_(b), { n: 81 + j * 3, v: 0.45 }));
  [210, 212].forEach((b) => A('thud', B_(b), { v: 0.7 }));
  for (let bar = 54; bar < 58; bar++) full(bar, { saws: bar >= 56, arp: true, piano: true });
  [216, 217, 218].forEach((b) => A('stamp', B_(b), { v: 0.55 }));
  for (let k = 0; k < 8; k++) A('blip', B_(224 + k * 0.25), { n: PENTA[11 - k], v: 0.22 });
  A('chime', B_(228), { n: 84, v: 0.4 });
  trap(58, { piano: true }); groove(59, { cut: 3.5, mode: 'half' }); b808(59, { cut: 3.5 }); pad(59, { v: 0.35, len: 3.5 });
  breakInto(240, 8, { v: 0.65, f0: 1200 });

  /* ---------- 60–68 OUTRO 쫄지마세요 (B240–274) ---------- */
  drop(240, 1.25); A('clap', B_(240), { v: 0.95 });
  for (let bar = 60; bar < 67; bar++) full(bar, { lead: bar < 64 ? MEL_A : MEL_B, k: (bar - 60) & 3, arp: true, cut: bar === 66 ? 3.5 : null, sv: 0.28 });
  A('glitch', B_(240.5), { v: 0.5 });
  A('stamp', B_(248), { v: 0.6 }); A('chime', B_(252), { n: 88, v: 0.4 });
  pops([[256, 76], [256.5, 79], [257, 81], [257.5, 84]]);
  roll(265, 267.5, 0.25, 0.3, 0.7);
  const F9 = CHD.C9;
  A('boom', T(67), { v: 1 }); A('crash', T(67), { v: 0.55 }); A('kick', T(67), { v: 1, sc: 0.9 }); A('zap', T(67), { v: 0.4 });
  A('stab', T(67), { notes: F9.ep, v: 0.8, big: true });
  A('keys', T(67), { notes: F9.ep, d: SPB * 5, v: 0.5, bright: 1.2 });
  A('pad', T(67), { notes: F9.pad, d: SPB * 6, v: 0.5, slow: true });
  A('sub', T(67), { n: 36, d: SPB * 5.5, v: 0.5 });
  A('lead', T(67), { n: 79, d: SPB * 3, v: 0.4 });
  [72, 76, 79, 83, 84, 88, 91].forEach((n, j) => A('glock', T(67, 0.5 + j * 0.25), { n, d: SPB * 2, v: 0.28 - j * 0.025 }));

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
    sub808(t, e) {
      const d = e.d, v = e.v, fq = mtof(e.n), o = ac.createOscillator();
      o.frequency.setValueAtTime(fq * (e.glide ? Math.pow(2, e.glide / 12) : 1.06), t); o.frequency.exponentialRampToValueAtTime(fq, t + (e.glide ? 0.09 : 0.03));
      const sh = ac.createWaveShaper(); sh.curve = shaperCurve(2.2);
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.42, t + 0.006);
      gn.gain.setValueAtTime(v * 0.42, t + Math.max(0.01, d - 0.06)); gn.gain.linearRampToValueAtTime(0, t + d);
      const lp = F('lowpass', 900, 0.7);
      o.connect(sh); sh.connect(lp); lp.connect(gn); gn.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
    },
    zap(t, e) {
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.35);
      const f = F('bandpass', 1400, 1.5), gn = G(0); envAD(gn, t, e.v * 0.14, 0.002, 0.34);
      o.connect(f); f.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 0.4);
    },
    tick(t, e) {
      const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 2200;
      const gn = G(0); envAD(gn, t, e.v * 0.08, 0.001, 0.03);
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 0.05);
    },
    glitch(t, e) {
      for (let k = 0; k < 6; k++) {
        const tt = t + k * 0.022, o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 300 + R() * 2600;
        const gn = G(0); gn.gain.setValueAtTime(0, tt); gn.gain.linearRampToValueAtTime(e.v * 0.07, tt + 0.002); gn.gain.setValueAtTime(e.v * 0.07, tt + 0.016); gn.gain.linearRampToValueAtTime(0, tt + 0.02);
        const pan = P(R() * 1.4 - 0.7); o.connect(gn); gn.connect(pan); pan.connect(fxBus); o.start(tt); o.stop(tt + 0.025);
      }
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
  const fadeA = Math.floor(T(67, 3) * sr);
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
