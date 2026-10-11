'use strict';
/* ============================================================
   MUSIC — 128 BPM, F minor.  arrange() builds a pure event list
   (shared with the visuals for beat-sync); renderSong() synthesizes
   it offline with Web Audio into an AudioBuffer.
   ============================================================ */
const T = (bar, beat = 0) => (bar * 4 + beat) * SPB;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const PROG = [
  { root: 41, ch: [53, 60, 65, 68, 72], arp: [65, 68, 72, 77], pad: [53, 60, 65, 68], key: [53, 60, 65, 68, 72] }, // Fm
  { root: 37, ch: [49, 56, 65, 68, 73], arp: [65, 68, 73, 77], pad: [49, 56, 65, 68], key: [49, 56, 61, 65, 68] }, // Db
  { root: 44, ch: [56, 60, 63, 68, 72], arp: [63, 68, 72, 75], pad: [56, 60, 63, 68], key: [56, 60, 63, 68, 72] }, // Ab
  { root: 39, ch: [51, 58, 63, 67, 70], arp: [63, 67, 70, 75], pad: [51, 58, 63, 67], key: [51, 58, 63, 67, 70] }, // Eb
];
const chordOf = (bar) => PROG[bar & 3];
const ARP = [0, 1, 2, 3, 1, 2, 3, 2, 0, 1, 2, 3, 1, 2, 3, 1];
const RIFF = [
  [[0, 72, 2], [3, 72, 2], [6, 75, 2], [8, 77, 4], [12, 75, 2], [14, 72, 2]],
  [[0, 77, 2], [3, 77, 2], [6, 80, 2], [8, 77, 4], [12, 75, 2], [14, 73, 2]],
  [[0, 72, 2], [3, 72, 2], [6, 75, 2], [8, 80, 4], [12, 79, 2], [14, 75, 2]],
  [[0, 79, 2], [3, 79, 2], [6, 82, 2], [8, 79, 3], [11, 77, 3], [14, 75, 2]],
];

function arrange() {
  const ev = [];
  const A = (i, t, o = {}) => { ev.push(Object.assign({ i, t }, o)); };
  const S16 = SPB / 4;

  /* ---------- pattern helpers ---------- */
  function beat(bar, o = {}) {
    const sc = o.sc != null ? o.sc : 0.22;
    for (let b = 0; b < 4; b++) {
      if (o.kick !== false && !(o.skipKick && o.skipKick.includes(b))) A('kick', T(bar, b), { v: o.kv || 1, sc });
      if (o.clap !== false && (b === 1 || b === 3)) A('clap', T(bar, b), { v: o.cv || 0.75 });
    }
    if (o.hats !== false) {
      for (let s = 0; s < 16; s++) {
        if (o.cut != null && s / 4 >= o.cut) break;
        if (s % 4 === 2 && o.open !== false) A('hat', T(bar, s / 4), { v: 0.34, open: true });
        else A('hat', T(bar, s / 4), { v: [0.42, 0.18, 0.3, 0.2][s % 4] * (o.hv || 1) });
      }
    }
  }
  function offBass(bar, v = 0.85, cut = 4) {
    const r = chordOf(bar).root;
    for (let b = 0; b < cut; b++) A('bass', T(bar, b + 0.5), { n: b === 3 ? r + 12 : r, d: SPB * 0.42, v });
    A('sub', T(bar), { n: r - 12, d: SPB * Math.min(4, cut + 0.5) - 0.02, v: v * 0.9 });
  }
  function rollBass(bar, v = 0.8, cut = 4) {
    const r = chordOf(bar).root;
    for (let s = 0; s < cut * 4; s++) {
      if (s % 4 === 0) continue;
      A('bass', T(bar, s / 4), { n: (s % 8 === 7) ? r + 12 : r, d: S16 * 0.85, v: v * (s % 4 === 2 ? 1 : 0.8) });
    }
    A('sub', T(bar), { n: r - 12, d: SPB * cut - 0.02, v: v * 0.8 });
  }
  function chords(bar, v = 0.55, cut = 5200, len = 4) { A('saw', T(bar), { notes: chordOf(bar).ch, d: SPB * len - 0.03, v, cut }); }
  function arp(bar, v = 0.3, until = 16) {
    const a = chordOf(bar).arp;
    for (let s = 0; s < until; s++) A('pluck', T(bar, s / 4), { n: a[ARP[s]] + 12 * (s >= 8 && s % 4 === 3 ? 1 : 0), v: v * (s % 4 === 0 ? 1 : 0.72) });
  }
  function lead(bar, v = 0.6) {
    for (const [s, n, l] of RIFF[bar & 3]) A('lead', T(bar, s / 4), { n, d: l * S16 * 0.92, v });
  }
  function roll(b0, b1, step, v0, v1) {
    for (let b = b0; b < b1 - 1e-6; b += step) { const p = (b - b0) / (b1 - b0); A('snare', b * SPB, { v: lerp(v0, v1, p), p }); }
  }

  /* ---------- 0–3 HOOK / BUILD ---------- */
  A('auto', 0, { p: 'mlp', k: 'set', v: 340 });
  A('auto', T(1), { p: 'mlp', k: 'exp', v: 900 });
  A('auto', T(3), { p: 'mlp', k: 'exp', v: 2600 });
  A('auto', T(3, 3.5), { p: 'mlp', k: 'exp', v: 9500 });
  A('auto', T(4), { p: 'mlp', k: 'set', v: 18000 });
  for (let bar = 0; bar < 4; bar++) A('pad', T(bar), { notes: chordOf(bar).pad, d: bar === 3 ? SPB * 3.5 : SPB * 4, v: 0.75 });
  for (let k = 0; k < 12; k++) A('tick', T(0, k), { v: k % 4 === 0 ? 0.9 : 0.55 });
  A('kick', T(0), { v: 0.8, sc: 0.6 });
  A('kick', T(0, 2.5), { v: 0.45, sc: 0.8 });
  for (let k = 4; k < 12; k++) A('kick', T(0, k), { v: 0.92, sc: 0.45 });
  for (let k = 4; k < 10; k++) A('zap', T(0, k), { v: 0.55, n: [88, 84, 91, 86, 93, 96][k - 4] });
  for (let k = 4; k < 12; k++) A('hat', T(0, k + 0.5), { v: 0.3, open: true });
  for (let k = 4; k < 12; k++) A('hat', T(0, k + 0.25), { v: 0.12 }), A('hat', T(0, k + 0.75), { v: 0.12 });
  A('clap', T(1, 1), { v: 0.5 }); A('clap', T(1, 3), { v: 0.5 });
  A('stab', T(2, 2), { notes: [56, 60, 63, 68, 72], v: 0.8 }); A('clap', T(2, 2), { v: 0.85 });
  A('stab', T(2, 3), { notes: [55, 58, 63, 67, 70], v: 0.85 }); A('clap', T(2, 3), { v: 0.85 });
  A('crash', T(2, 2), { v: 0.22 });
  roll(12, 14, 0.25, 0.22, 0.5);
  roll(14, 15.5, 0.125, 0.5, 0.85);
  A('riser', T(2), { d: SPB * 7.5, v: 0.55 });
  A('rev', T(4), { d: SPB * 2, v: 0.5 });

  /* ---------- 4–11 DROP A (title / 가치) ---------- */
  A('impact', T(4), { v: 1 }); A('crash', T(4), { v: 0.55 }); A('subdrop', T(4), { v: 0.9 });
  for (let bar = 4; bar < 12; bar++) {
    beat(bar, { cut: bar === 11 ? 3 : null });
    offBass(bar);
    chords(bar, 0.55);
    if (bar >= 8) arp(bar, 0.26);
  }
  A('crash', T(6), { v: 0.45 }); A('impact', T(6), { v: 0.5 });
  A('crash', T(8), { v: 0.32 });
  A('crash', T(9), { v: 0.3 }); A('glitch', T(9) - SPB * 0.25, { v: 0.4, d: SPB * 0.25 });
  A('impact', T(11), { v: 0.45 });
  roll(47, 48, 0.25, 0.35, 0.7);
  A('rev', T(12), { d: SPB, v: 0.35 });

  /* ---------- 12–19 GROOVE B (수익성 / 성장) ---------- */
  A('crash', T(12), { v: 0.45 }); A('impact', T(12), { v: 0.55 }); A('down', T(12), { d: SPB * 4, v: 0.3 });
  for (let bar = 12; bar < 20; bar++) {
    const last = bar === 19;
    beat(bar, { open: false, hv: 1.1, sc: 0.45, cut: last ? 3.5 : null, skipKick: last ? [] : null });
    rollBass(bar, 0.8, last ? 3.5 : 4);
    arp(bar, 0.62, last ? 14 : 16);
    A('pad', T(bar), { notes: chordOf(bar).pad, d: SPB * (last ? 3.5 : 4), v: 0.7 });
  }
  A('crash', T(16), { v: 0.45 }); A('impact', T(16), { v: 0.5 });
  roll(63, 64, 0.25, 0.3, 0.6);
  A('riser', T(18), { d: SPB * 7.5, v: 0.5 });
  roll(76, 78, 0.25, 0.25, 0.55);
  roll(78, 79.5, 0.125, 0.55, 0.9);
  A('rev', T(20), { d: SPB * 2, v: 0.45 });
  A('auto', T(18), { p: 'hp', k: 'set', v: 20 });
  A('auto', T(19, 3.5), { p: 'hp', k: 'exp', v: 900 });
  A('auto', T(20), { p: 'hp', k: 'set', v: 20 });

  /* ---------- 20–23 DROP C (추세) ---------- */
  A('impact', T(20), { v: 1 }); A('crash', T(20), { v: 0.6 }); A('subdrop', T(20), { v: 0.9 });
  for (let bar = 20; bar < 24; bar++) {
    beat(bar, { cut: bar === 23 ? 2 : null });
    offBass(bar, 0.85, bar === 23 ? 3 : 4);
    chords(bar, 0.5, 6000, bar === 23 ? 3.5 : 4);
    arp(bar, 0.22);
    lead(bar, 0.62);
  }
  A('crash', T(22), { v: 0.4 });
  roll(94, 96, 0.125, 0.35, 0.85);
  A('riser', T(23), { d: SPB * 4, v: 0.4 });

  /* ---------- 24–27 STOP-TIME (수급) ---------- */
  A('impact', T(24), { v: 0.95 }); A('crash', T(24), { v: 0.55 }); A('subdrop', T(24), { v: 0.7 });
  A('kick', T(24), { v: 1, sc: 1 }); A('stab', T(24), { notes: PROG[0].ch, v: 0.95 });
  for (let b = 97; b < 100; b += 0.5) A('tick', b * SPB, { v: b % 1 ? 0.35 : 0.6 });
  for (let b = 97; b < 100; b += 0.25) A('hat', b * SPB, { v: 0.1 + (b - 97) * 0.04 });
  A('riser', T(24, 1), { d: SPB * 3, v: 0.32 });
  A('sub', T(24), { n: 29, d: SPB * 4, v: 0.5 });
  const STABS = [[53, 60, 65, 68, 72], [56, 63, 68, 72, 75], [58, 65, 70, 73, 77], [60, 67, 72, 76, 79]];
  for (let i = 0; i < 4; i++) {
    const t = T(25, i);
    A('kick', t, { v: 1, sc: 1 }); A('clap', t, { v: 0.8 }); A('stab', t, { notes: STABS[i], v: 0.95 }); A('crash', t, { v: 0.2 });
    A('sub', t, { n: [29, 32, 34, 36][i], d: SPB * 0.9, v: 0.7 });
  }
  A('impact', T(26), { v: 0.85 }); A('crash', T(26), { v: 0.55 });
  for (let bar = 26; bar < 28; bar++) {
    beat(bar, { cut: bar === 27 ? 3 : null });
    offBass(bar);
    chords(bar, 0.55);
    arp(bar, 0.24);
  }
  roll(111, 112, 0.25, 0.3, 0.6);

  /* ---------- 28–31 BREAKDOWN (촉매) ---------- */
  A('impact', T(28), { v: 0.55, soft: true }); A('down', T(28), { d: SPB * 6, v: 0.35 }); A('crash', T(28), { v: 0.3 });
  A('auto', T(28), { p: 'mlp', k: 'set', v: 2400 });
  A('auto', T(31, 3), { p: 'mlp', k: 'exp', v: 7000 });
  for (let bar = 28; bar < 32; bar++) {
    const c = chordOf(bar);
    A('pad', T(bar), { notes: c.pad, d: SPB * 4, v: 0.7, slow: true });
    A('sub', T(bar), { n: c.root - 12, d: SPB * 4 - 0.02, v: 0.42 });
    A('kick', T(bar), { v: 0.5, sc: 0.85 });
    const k = c.key;
    A('keys', T(bar), { notes: k.slice(0, 3), d: SPB * 2, v: 0.5 });
    const seq = [k[2], k[3], k[4], k[3], k[4] + 12 - 12, k[3], k[2], k[3]];
    seq.forEach((n, j) => A('keys', T(bar, j * 0.5), { notes: [n + 12], d: SPB * 0.6, v: j % 2 ? 0.22 : 0.3 }));
    if (bar >= 30) for (let s = 0; s < 8; s++) A('hat', T(bar, s * 0.5 + 0.5), { v: 0.14 });
  }
  A('rev', T(30), { d: SPB * 2, v: 0.35 });
  [77, 80, 84, 89, 92].forEach((n, j) => A('bell', T(30, j * 0.25), { n, v: 0.42 - j * 0.04 }));
  A('crash', T(31), { v: 0.22 });
  [80, 84, 87].forEach((n, j) => A('bell', T(31, 0.5 + j * 0.5), { n, v: 0.22 }));

  /* ---------- 32–33 BUILD (리포트) ---------- */
  A('auto', T(32), { p: 'mlp', k: 'set', v: 1600 });
  A('auto', T(33, 3.5), { p: 'mlp', k: 'exp', v: 16000 });
  for (let bar = 32; bar < 34; bar++) {
    for (let b = 0; b < 4; b++) if (!(bar === 33 && b === 3)) A('kick', T(bar, b), { v: 0.9, sc: 0.5 });
    chords(bar, 0.42, 5200, bar === 33 ? 3.5 : 4);
    offBass(bar, 0.75, bar === 33 ? 3 : 4);
  }
  roll(128, 132, 0.5, 0.3, 0.5);
  roll(132, 134, 0.25, 0.45, 0.65);
  roll(134, 135.5, 0.125, 0.65, 0.95);
  A('riser', T(32), { d: SPB * 7.5, v: 0.6 });
  A('rev', T(34), { d: SPB * 1.5, v: 0.5 });
  [128, 130, 132].forEach((b, j) => { A('crash', b * SPB, { v: 0.35 }); A('stab', b * SPB, { notes: chordOf(32 + (j >> 1)).ch, v: 0.8 }); A('impact', b * SPB, { v: 0.35 }); });
  A('stab', 134 * SPB, { notes: [55, 58, 63, 67, 70], v: 0.85 }); A('zap', 134 * SPB, { v: 0.5, n: 96 });

  /* ---------- 34–39 FINAL DROP ---------- */
  A('impact', T(34), { v: 1.05 }); A('crash', T(34), { v: 0.6 }); A('subdrop', T(34), { v: 0.95 });
  for (let bar = 34; bar < 36; bar++) { beat(bar); offBass(bar); chords(bar, 0.55); arp(bar, 0.24); lead(bar, 0.6); }
  // underwater
  A('auto', T(36), { p: 'mlp', k: 'target', v: 520, tc: 0.04 });
  A('auto', T(36), { p: 'dlp', k: 'target', v: 480, tc: 0.04 });
  A('auto', T(37, 2), { p: 'mlp', k: 'set', v: 520 });
  A('auto', T(37, 2), { p: 'dlp', k: 'set', v: 480 });
  A('auto', T(37, 3.5), { p: 'mlp', k: 'exp', v: 18000 });
  A('auto', T(37, 3.5), { p: 'dlp', k: 'exp', v: 18000 });
  A('down', T(36), { d: SPB * 2, v: 0.3 });
  for (let bar = 36; bar < 38; bar++) {
    beat(bar, { hats: false, sc: 0.3, cut: bar === 37 ? 3.5 : null, skipKick: bar === 37 ? [3] : null });
    offBass(bar, 0.85, bar === 37 ? 3 : 4);
    chords(bar, 0.5, 5200, bar === 37 ? 3.5 : 4);
  }
  const R = mulberry32(77);
  for (let k = 0; k < 14; k++) A('bloop', T(36) + R() * SPB * 7, { v: 0.16 + R() * 0.12, n: 66 + Math.floor(R() * 14) });
  A('riser', T(37, 1), { d: SPB * 2.5, v: 0.5 });
  roll(150, 151.5, 0.125, 0.4, 0.85);
  A('impact', T(38), { v: 0.9 }); A('crash', T(38), { v: 0.55 });
  for (let bar = 38; bar < 40; bar++) {
    beat(bar, { cut: bar === 39 ? 2 : null, skipKick: bar === 39 ? [3] : null });
    offBass(bar, 0.85, bar === 39 ? 3 : 4);
    chords(bar, 0.55, 5600, bar === 39 ? 3.5 : 4);
    lead(bar, 0.62);
    arp(bar, 0.22, bar === 39 ? 14 : 16);
  }
  [152, 154, 156].forEach((b, j) => { A('crash', b * SPB, { v: 0.35 }); A('stab', b * SPB, { notes: [[56, 60, 63, 68, 72], [56, 60, 63, 68, 72], [51, 58, 63, 67, 70]][j], v: 0.75 }); });
  A('impact', 156 * SPB, { v: 0.45 });
  roll(158, 159.5, 0.125, 0.45, 0.95);
  A('riser', T(39), { d: SPB * 3.5, v: 0.5 });
  A('rev', T(40), { d: SPB * 1.5, v: 0.5 });

  /* ---------- 40–42 OUTRO ---------- */
  A('impact', T(40), { v: 1.15 }); A('crash', T(40), { v: 0.7 }); A('subdrop', T(40), { v: 1 });
  A('kick', T(40), { v: 1, sc: 1 });
  A('saw', T(40), { notes: [44, 56, 63, 68, 72, 75, 80], d: SPB * 5, v: 0.6, cut: 6500, rel: 3.2 });
  A('pad', T(40), { notes: [56, 63, 68, 72], d: SPB * 9, v: 0.7, slow: true });
  A('keys', T(40), { notes: [56, 63, 68, 72, 75], d: SPB * 6, v: 0.45 });
  A('sub', T(40), { n: 32, d: SPB * 6, v: 0.6 });
  [80, 84, 87, 92, 96].forEach((n, j) => A('bell', T(40, 1 + j * 0.25), { n, v: 0.3 - j * 0.03 }));
  A('auto', T(41, 2), { p: 'master', k: 'set', v: 1 });
  A('auto', DUR - 0.05, { p: 'master', k: 'lin', v: 0 });

  ev.sort((a, b) => a.t - b.t);
  return ev;
}

const SONG = arrange();
const evTimes = (name, filter) => SONG.filter((e) => e.i === name && (!filter || filter(e))).map((e) => e.t);
const KICKS = evTimes('kick');
const SNARES = evTimes('snare');
const CLAPS = evTimes('clap');
const IMPACTS = SONG.filter((e) => e.i === 'impact').map((e) => ({ t: e.t, v: e.v }));
const STABT = evTimes('stab');

// last-event envelope (binary search)
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
   single master pass applies compression; level + soft clip in JS.
   ============================================================ */
const AUTO_INIT = { mlp: 18000, dlp: 18000, hp: 20, master: 1 };
function autoValueAt(p, T0) {
  const evs = SONG.filter((e) => e.i === 'auto' && e.p === p);
  let v = AUTO_INIT[p], tPrev = 0, tgt = null;
  const atT = (t) => (tgt ? tgt.v + (v - tgt.v) * Math.exp(-(t - tgt.s) / tgt.tc) : v);
  for (const e of evs) {
    if (e.t <= T0) {
      const cur = atT(e.t);
      if (e.k === 'target') { v = cur; tgt = { v: e.v, tc: e.tc || 0.05, s: e.t }; }
      else { v = e.v; tgt = null; }
      tPrev = e.t;
    } else {
      if (e.k === 'exp' && !tgt) return v * Math.pow(e.v / v, (T0 - tPrev) / (e.t - tPrev));
      if (e.k === 'lin' && !tgt) return v + (e.v - v) * ((T0 - tPrev) / (e.t - tPrev));
      break;
    }
  }
  return atT(T0);
}
const evStart = (e) => (e.i === 'rev' ? e.t - e.d : e.t);

function makeShared(sr) {
  const R = mulberry32(99);
  const noise = new Float32Array(sr * 6);
  for (let i = 0; i < noise.length; i++) noise[i] = R() * 2 - 1;
  const n = Math.floor(2.6 * sr), ir = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) { let lp = 0; for (let i = 0; i < n; i++) { const x = (R() * 2 - 1) * Math.pow(1 - i / n, 2.8); lp += (x - lp) * 0.42; ir[c][i] = lp; } }
  return { noise, ir };
}

async function renderSegment(s0, s1, tail, sr, SH, only) {
  const len = Math.ceil((s1 - s0 + tail) * sr);
  const ac = new OfflineAudioContext(2, len, sr);
  const R = mulberry32(Math.floor(s0 * 1000) + 7);
  const NB = ac.createBuffer(1, SH.noise.length, sr); NB.copyToChannel(SH.noise, 0);
  const noise = (t, dur) => { const s = ac.createBufferSource(); s.buffer = NB; s.start(t, R() * Math.max(0, 5.8 - dur), dur + 0.05); return s; };
  const G = (v = 1) => { const n = ac.createGain(); n.gain.value = v; return n; };
  const F = (type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const shaperCurve = (k) => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; };
  const P = (v) => { const p = ac.createStereoPanner(); p.pan.value = v; return p; };
  const dst = ac.destination;

  // reverb (high-passed input keeps the low end clean)
  const IRB = ac.createBuffer(2, SH.ir[0].length, sr); IRB.copyToChannel(SH.ir[0], 0); IRB.copyToChannel(SH.ir[1], 1);
  const rev = ac.createConvolver(); rev.normalize = true; rev.buffer = IRB;
  const revIn = G(1), revHP = F('highpass', 280, 0.6), revOut = G(0.5);
  revIn.connect(revHP); revHP.connect(rev); rev.connect(revOut); revOut.connect(dst);
  // ping-pong delay
  const dIn = G(1), dOut = G(0.42), dL = ac.createDelay(2), dR = ac.createDelay(2);
  dL.delayTime.value = SPB * 0.75; dR.delayTime.value = SPB * 0.75;
  const fbL = G(0.34), fbR = G(0.34), dlpF = F('lowpass', 3800), pL = P(-0.8), pR = P(0.8);
  dIn.connect(dL); dL.connect(dlpF); dlpF.connect(fbL); fbL.connect(dR); dR.connect(fbR); fbR.connect(dL);
  dL.connect(pL); dR.connect(pR); pL.connect(dOut); pR.connect(dOut); dOut.connect(dst);
  // buses
  const drumBus = G(0.9), drumLP = F('lowpass', 18000, 0.9);
  drumBus.connect(drumLP); drumLP.connect(dst);
  const kickShape = ac.createWaveShaper(); kickShape.curve = shaperCurve(2.0);
  const kickBus = G(0.8); kickShape.connect(kickBus); kickBus.connect(drumLP);
  const kickClickHP = F('highpass', 2200); kickClickHP.connect(drumBus);
  const musicBus = G(1), hp = F('highpass', 20, 0.7), musicLP = F('lowpass', 18000, 0.9), pump = G(1);
  musicBus.connect(hp); hp.connect(musicLP); musicLP.connect(pump); pump.connect(dst);
  const musicRev = G(0.16); pump.connect(musicRev); musicRev.connect(revIn);
  const fxBus = G(0.85); fxBus.connect(dst);
  // shared percussion chains
  const hatC = F('highpass', 8200, 0.9), hatPk = F('peaking', 11000, 1), hatPan = P(-0.18);
  hatPk.gain.value = 5; hatC.connect(hatPk); hatPk.connect(hatPan); hatPan.connect(drumBus);
  const ohC = F('highpass', 7200, 0.9), ohPan = P(0.22); ohC.connect(ohPan); ohPan.connect(drumBus);
  const clapHP = F('highpass', 700), clapBP = F('bandpass', 1350, 0.8), clapOut = G(1);
  clapHP.connect(clapBP); clapBP.connect(clapOut); clapOut.connect(drumBus);
  const clapRev = G(0.3); clapOut.connect(clapRev); clapRev.connect(revIn);
  const snRev = G(0.25); snRev.connect(revIn);
  const pluckOut = G(1); pluckOut.connect(musicBus);
  const pluckDel = G(0.42); pluckOut.connect(pluckDel); pluckDel.connect(dIn);
  const leadOut = G(1); leadOut.connect(musicBus);
  const leadDel = G(0.28), leadRev = G(0.3); leadOut.connect(leadDel); leadDel.connect(dIn); leadOut.connect(leadRev); leadRev.connect(revIn);
  const keysOut = G(1); keysOut.connect(musicBus);
  const keysRev = G(0.5); keysOut.connect(keysRev); keysRev.connect(revIn);
  const crashOut = G(1), crashHP = F('highpass', 4800, 0.6); crashHP.connect(crashOut); crashOut.connect(fxBus);
  const crashRev = G(0.35); crashOut.connect(crashRev); crashRev.connect(revIn);
  const PANS = [-0.75, -0.35, 0, 0.35, 0.75];

  function envAD(gn, t, peak, a, d, sustain = 0.0001) {
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    gn.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  const I = {
    kick(t, e) {
      const v = e.v, o = ac.createOscillator();
      o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(56, t + 0.05); o.frequency.exponentialRampToValueAtTime(41, t + 0.38);
      const gn = G(0);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + 0.003);
      gn.gain.setValueAtTime(v, t + 0.06); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
      o.connect(gn); gn.connect(kickShape); o.start(t); o.stop(t + 0.5);
      const n = noise(t, 0.03), ng = G(0); envAD(ng, t, 0.3 * v, 0.001, 0.014);
      n.connect(ng); ng.connect(kickClickHP);
    },
    clap(t, e) {
      const v = e.v, n = noise(t, 0.4), gn = G(0), p = gn.gain;
      p.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach((d) => { p.setValueAtTime(v * 3.6, t + d); p.exponentialRampToValueAtTime(v * 0.3, t + d + 0.009); });
      p.setValueAtTime(v * 2.8, t + 0.033); p.exponentialRampToValueAtTime(0.0001, t + 0.3);
      n.connect(gn); gn.connect(clapHP);
      const o = ac.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.06);
      const og = G(0); envAD(og, t, 0.5 * v, 0.002, 0.07); o.connect(og); og.connect(drumBus); o.start(t); o.stop(t + 0.12);
    },
    snare(t, e) {
      const v = e.v, p = e.p || 0, n = noise(t, 0.2), f = F('bandpass', 2200 + p * 2600, 0.6), gn = G(0);
      envAD(gn, t, v * 1.6, 0.001, 0.11);
      n.connect(f); f.connect(gn); gn.connect(drumBus); gn.connect(snRev);
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = 200 + p * 260;
      const og = G(0); envAD(og, t, v * 0.6, 0.001, 0.05); o.connect(og); og.connect(drumBus); o.start(t); o.stop(t + 0.1);
    },
    hat(t, e) {
      const d = e.open ? 0.2 : 0.035, n = noise(t, d + 0.05), gn = G(0);
      envAD(gn, t, e.v * 1.2, 0.001, d);
      n.connect(gn); gn.connect(e.open ? ohC : hatC);
    },
    crash(t, e) {
      const v = e.v, n = noise(t, 2.2), gn = G(0);
      envAD(gn, t, v * 0.62, 0.002, 1.9);
      n.connect(gn); gn.connect(crashHP);
      const mg = G(0); envAD(mg, t, v * 0.05, 0.002, 1.1);
      const mf = F('bandpass', 8500, 1.2);
      [205.3, 304.4, 369.6, 522.7, 540, 800].forEach((fq) => { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = fq * 2.7; o.connect(mf); o.start(t); o.stop(t + 1.3); });
      mf.connect(mg); mg.connect(crashOut);
    },
    tick(t, e) {
      [2400, 3600].forEach((fq, i) => {
        const o = ac.createOscillator(); o.frequency.value = fq;
        const gn = G(0); envAD(gn, t, e.v * (i ? 0.18 : 0.42), 0.001, i ? 0.015 : 0.03);
        o.connect(gn); gn.connect(drumBus); o.start(t); o.stop(t + 0.06);
      });
    },
    zap(t, e) {
      const o = ac.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(mtof(e.n || 88), t); o.frequency.exponentialRampToValueAtTime(90, t + 0.09);
      const f = F('lowpass', 4200, 2), gn = G(0); envAD(gn, t, e.v * 0.16, 0.001, 0.11);
      o.connect(f); f.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 0.15);
      const s = G(0.3); gn.connect(s); s.connect(dIn);
    },
    glitch(t, e) {
      const steps = 8, o = ac.createOscillator(); o.type = 'square';
      const gn = G(0);
      for (let k = 0; k < steps; k++) {
        const tt = t + (e.d / steps) * k;
        o.frequency.setValueAtTime(mtof(60 + ((k * 7) % 24)), tt);
        envAD(gn, tt, e.v * 0.12, 0.001, (e.d / steps) * 0.8);
      }
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + e.d + 0.05);
    },
    riser(t, e) {
      const d = e.d, v = e.v, n = noise(t, d), f = F('bandpass', 400, 1.6), gn = G(0);
      f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(9500, t + d);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v * 0.5, t + d); gn.gain.linearRampToValueAtTime(0, t + d + 0.012);
      n.connect(f); f.connect(gn); gn.connect(fxBus);
      const s = G(0.35); gn.connect(s); s.connect(revIn);
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + d);
      const of = F('lowpass', 2600, 1), og = G(0);
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(v * 0.07, t + d); og.gain.linearRampToValueAtTime(0, t + d + 0.012);
      o.connect(of); of.connect(og); og.connect(fxBus); o.start(t); o.stop(t + d + 0.02);
    },
    rev(tEnd, e) {
      const t = tEnd - e.d, n = noise(t, e.d), f = F('highpass', 3500, 0.7), gn = G(0);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(e.v * 0.5, tEnd - 0.004); gn.gain.linearRampToValueAtTime(0, tEnd);
      n.connect(f); f.connect(gn); gn.connect(fxBus);
    },
    impact(t, e) {
      const v = e.v, soft = e.soft, o = ac.createOscillator();
      o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.4);
      const gn = G(0); envAD(gn, t, v * 0.7, 0.004, soft ? 1.6 : 2.2);
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 2.4);
      const n = noise(t, 1.2), f = F('lowpass', soft ? 600 : 1100), ng = G(0);
      envAD(ng, t, v * (soft ? 0.25 : 0.5), 0.002, 0.7);
      n.connect(f); f.connect(ng); ng.connect(fxBus);
      const s = G(0.7); ng.connect(s); s.connect(revIn);
    },
    subdrop(t, e) {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(29, t + 1.1);
      const gn = G(0); envAD(gn, t, e.v * 0.45, 0.01, 1.5);
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 1.6);
    },
    down(t, e) {
      const d = e.d, n = noise(t, d), f = F('bandpass', 7000, 1.3), gn = G(0);
      f.frequency.setValueAtTime(7000, t); f.frequency.exponentialRampToValueAtTime(220, t + d);
      envAD(gn, t, e.v * 0.4, 0.01, d);
      n.connect(f); f.connect(gn); gn.connect(fxBus);
      const s = G(0.4); gn.connect(s); s.connect(revIn);
    },
    saw(t, e) { const gn = supersaw(t, e.d, e.notes, e.v, e.cut || 5200, e.rel || 0.12, 0.012); if (e.rel) { const s = G(0.4); gn.connect(s); s.connect(revIn); } },
    stab(t, e) { const gn = supersaw(t, 0.06, e.notes, e.v * 1.4, 7500, 0.45, 0.003); const s = G(0.55); gn.connect(s); s.connect(revIn); },
    pad(t, e) {
      const N = e.notes.length * 3, f = F('lowpass', e.slow ? 1500 : 1900, 0.5), gn = G(0);
      const amp = (e.v * 0.36) / Math.sqrt(N), atk = e.slow ? 0.8 : 0.35;
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(amp, t + atk);
      gn.gain.setValueAtTime(amp, t + e.d); gn.gain.setTargetAtTime(0, t + e.d, 0.25);
      const pans = [P(-0.6), P(0), P(0.6)];
      pans.forEach((p) => p.connect(f));
      for (const n of e.notes) for (let k = 0; k < 3; k++) {
        const o = ac.createOscillator(); o.type = k === 1 ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(n);
        o.detune.value = [-11, 0, 11][k] + (R() - 0.5) * 4;
        o.connect(pans[k]); o.start(t); o.stop(t + e.d + 1.6);
      }
      f.connect(gn); gn.connect(musicBus);
      const s = G(0.5); gn.connect(s); s.connect(revIn);
    },
    pluck(t, e) {
      const f = F('lowpass', 5200, 2.2);
      f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(420, t + 0.2);
      const gn = G(0); envAD(gn, t, e.v * 0.32, 0.002, 0.26);
      [0, 7].forEach((dt, k) => { const o = ac.createOscillator(); o.type = k ? 'square' : 'sawtooth'; o.frequency.value = mtof(e.n); o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + 0.32); });
      f.connect(gn); gn.connect(pluckOut);
    },
    bass(t, e) {
      const d = e.d, v = e.v, f = F('lowpass', 1600, 3);
      f.frequency.setValueAtTime(2000, t); f.frequency.exponentialRampToValueAtTime(520, t + d * 0.8);
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.16, t + 0.004);
      gn.gain.setValueAtTime(v * 0.16, t + d - 0.02); gn.gain.linearRampToValueAtTime(0, t + d);
      [[0, 'sawtooth'], [-9, 'square']].forEach(([dt, ty]) => { const o = ac.createOscillator(); o.type = ty; o.frequency.value = mtof(e.n); o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + d + 0.02); });
      f.connect(gn); gn.connect(musicBus);
    },
    sub(t, e) {
      const d = e.d, v = e.v, o = ac.createOscillator(); o.frequency.value = mtof(e.n);
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.28, t + 0.012);
      gn.gain.setValueAtTime(v * 0.28, t + d - 0.04); gn.gain.linearRampToValueAtTime(0, t + d);
      o.connect(gn); gn.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
    },
    lead(t, e) {
      const d = e.d, v = e.v, f = F('lowpass', 5200, 1.2);
      f.frequency.setValueAtTime(7000, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.25);
      const gn = G(0);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.26, t + 0.006);
      gn.gain.setValueAtTime(v * 0.26, t + d); gn.gain.setTargetAtTime(0, t + d, 0.03);
      const lfo = ac.createOscillator(); lfo.frequency.value = 5.6;
      const lg = G(0); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(14, t + Math.min(d, 0.3));
      lfo.connect(lg); lfo.start(t); lfo.stop(t + d + 0.2);
      [[-12, 'sawtooth', 0, -0.5], [0, 'sawtooth', 0, 0], [12, 'sawtooth', 0, 0.5], [0, 'square', -12, 0]].forEach(([dt, ty, oc, pn]) => {
        const o = ac.createOscillator(); o.type = ty; o.frequency.value = mtof(e.n + oc); o.detune.value = dt;
        lg.connect(o.detune);
        const p = P(pn); o.connect(p); p.connect(f); o.start(t); o.stop(t + d + 0.2);
      });
      f.connect(gn); gn.connect(leadOut);
    },
    keys(t, e) {
      for (const n of e.notes) {
        const fq = mtof(n), d = e.d, v = e.v;
        const car = ac.createOscillator(); car.frequency.value = fq;
        const mod = ac.createOscillator(); mod.frequency.value = fq;
        const mg = G(0); mg.gain.setValueAtTime(fq * 2.2, t); mg.gain.exponentialRampToValueAtTime(fq * 0.15, t + 1.2);
        const tine = ac.createOscillator(); tine.frequency.value = fq * 14;
        const tg = G(0); tg.gain.setValueAtTime(fq * 0.9, t); tg.gain.exponentialRampToValueAtTime(1, t + 0.08);
        mod.connect(mg); mg.connect(car.frequency); tine.connect(tg); tg.connect(car.frequency);
        const gn = G(0), hold = Math.max(d, 1.21);
        gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v * 0.26, t + 0.004);
        gn.gain.exponentialRampToValueAtTime(v * 0.095, t + 1.2);
        gn.gain.setValueAtTime(v * 0.095, t + hold); gn.gain.setTargetAtTime(0, t + hold, 0.25);
        car.connect(gn); gn.connect(keysOut);
        [car, mod, tine].forEach((o) => { o.start(t); o.stop(t + hold + 1.4); });
      }
    },
    bell(t, e) {
      const fq = mtof(e.n);
      const car = ac.createOscillator(); car.frequency.value = fq;
      const mod = ac.createOscillator(); mod.frequency.value = fq * 3.5;
      const mg = G(0); mg.gain.setValueAtTime(fq * 2.5, t); mg.gain.exponentialRampToValueAtTime(fq * 0.05, t + 2);
      mod.connect(mg); mg.connect(car.frequency);
      const gn = G(0); envAD(gn, t, e.v * 0.12, 0.002, 2.4);
      car.connect(gn); gn.connect(fxBus);
      const s = G(0.8); gn.connect(s); s.connect(revIn);
      const s2 = G(0.3); gn.connect(s2); s2.connect(dIn);
      car.start(t); mod.start(t); car.stop(t + 2.6); mod.stop(t + 2.6);
    },
    bloop(t, e) {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(mtof(e.n - 12), t); o.frequency.exponentialRampToValueAtTime(mtof(e.n + 12), t + 0.07);
      const gn = G(0); envAD(gn, t, e.v * 0.3, 0.003, 0.09);
      o.connect(gn); gn.connect(fxBus); o.start(t); o.stop(t + 0.12);
      const s = G(0.5); gn.connect(s); s.connect(revIn);
    },
  };
  function supersaw(t, d, notes, v, cut, rel, atk) {
    const N = notes.length * 5, f = F('lowpass', cut, 0.6);
    f.frequency.setValueAtTime(cut * 1.7, t); f.frequency.exponentialRampToValueAtTime(cut, t + 0.35);
    const gn = G(0), amp = (v * 0.75) / Math.sqrt(N);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(amp, t + atk);
    gn.gain.setValueAtTime(amp, t + d); gn.gain.setTargetAtTime(0, t + d, rel / 3);
    const pans = PANS.map((p) => { const n = P(p); n.connect(f); return n; });
    const DET = [-19, -9, 0, 9, 19];
    for (const n of notes) for (let k = 0; k < 5; k++) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n);
      o.detune.value = DET[k] + (R() - 0.5) * 5;
      o.connect(pans[k]);
      o.start(t + R() * 0.004); o.stop(t + d + rel * 2 + 0.1);
    }
    f.connect(gn); gn.connect(musicBus);
    return gn;
  }

  // automation: initial value at segment start, then events through the tail
  const PARAM = { mlp: musicLP.frequency, dlp: drumLP.frequency, hp: hp.frequency };
  const tEnd = s1 + tail;
  for (const p of Object.keys(PARAM)) {
    PARAM[p].setValueAtTime(autoValueAt(p, s0), 0);
    for (const e of SONG) {
      if (e.i !== 'auto' || e.p !== p || e.t <= s0 || e.t >= tEnd) continue;
      const t = e.t - s0, pa = PARAM[p];
      if (e.k === 'set') pa.setValueAtTime(e.v, t);
      else if (e.k === 'exp') pa.exponentialRampToValueAtTime(e.v, t);
      else if (e.k === 'lin') pa.linearRampToValueAtTime(e.v, t);
      else if (e.k === 'target') pa.setTargetAtTime(e.v, t, e.tc || 0.05);
    }
  }
  // sidechain pump (kicks through the tail too, so overlap-add stays exact)
  const pg = pump.gain; pg.setValueAtTime(1, 0);
  for (const e of SONG) {
    if (e.i !== 'kick' || e.t < s0 || e.t >= tEnd) continue;
    const depth = e.sc != null ? e.sc : 0.25;
    if (depth >= 0.99) continue;
    pg.setTargetAtTime(depth, e.t - s0, 0.004);
    pg.setTargetAtTime(1, e.t - s0 + 0.035, 0.085);
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
  const sr = opts.sampleRate || 48000, TAIL = 2.6, SEG = 2;
  const SH = makeShared(sr);
  const total = Math.ceil(DUR * sr);
  const pre = [new Float32Array(total), new Float32Array(total)];
  const segs = [];
  for (let bar = 0; bar < TOTAL_BEATS / 4; bar += SEG) segs.push([T(bar), Math.min(DUR, T(bar + SEG))]);
  const only = opts.only ? new Set(opts.only) : null;
  let next = 0, done = 0;
  const worker = async () => {
    while (next < segs.length) {
      const [s0, s1] = segs[next++];
      const b = await renderSegment(s0, s1, TAIL, sr, SH, only);
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
  const pre_g = mc.createGain(); pre_g.gain.value = 0.8;
  const comp = mc.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 2.6; comp.attack.value = 0.006; comp.release.value = 0.16;
  src.connect(pre_g); pre_g.connect(comp); comp.connect(mc.destination); src.start(0);
  const buf = opts.raw ? null : await mc.startRendering();
  const outB = buf || (() => { const b = new AudioBuffer({ numberOfChannels: 2, length: total, sampleRate: sr }); b.copyToChannel(pre[0], 0); b.copyToChannel(pre[1], 1); return b; })();
  if (opts.raw) return outB;

  // loudness: set the loudest 2-bar window to TARGET dBFS RMS, then soft clip
  const L = outB.getChannelData(0), Rr = outB.getChannelData(1);
  const win = Math.floor(T(2) * sr);
  let best = 0;
  for (let a = 0; a + win <= total; a += win) {
    let s = 0; for (let i = a; i < a + win; i++) { const m = (L[i] + Rr[i]) * 0.5; s += m * m; }
    best = Math.max(best, Math.sqrt(s / win));
  }
  const TARGET = Math.pow(10, -12 / 20);
  const gain = best > 0 ? TARGET / best : 1;
  const knee = 0.72;
  const clipf = (x) => { const a = Math.abs(x); if (a <= knee) return x; const y = knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)); return Math.sign(x) * y * 0.985; };
  let peak = 0;
  const fadeA = Math.floor((T(41, 2)) * sr);
  for (const d of [L, Rr]) {
    for (let i = 0; i < total; i++) {
      let x = d[i] * gain;
      if (i > fadeA) x *= Math.pow(1 - (i - fadeA) / (total - fadeA), 1.6);
      if (i < 64) x *= i / 64;
      x = clipf(x); d[i] = x;
      const a = Math.abs(x); if (a > peak) peak = a;
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
