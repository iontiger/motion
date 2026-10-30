/* ============================================================
   UTIL — timing grid, easing, seeded randomness, audio energy
   ============================================================ */
export const W = 1920, H = 1080, TAU = Math.PI * 2;
export const BPM = 105, SPB = 60 / BPM;   // beat grid fitted to the drums
export const BEAT0 = 0.2265;              // time of beat 0 (a downbeat)
export const DUR = 108.79;                // length of audio/song.mp3 as decoded
export const CHORUS_OFF = 38.86;          // chorus 2 = chorus 1 + this (17 bars)
export const beatOf = (t) => (t - BEAT0) / SPB;
export const tOfBeat = (b) => BEAT0 + b * SPB;

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const pr = (x, a, b) => clamp((x - a) / (b - a));
export const fract = (x) => x - Math.floor(x);
export const rnd = (a, b = 0) => fract(Math.sin(a * 127.1 + b * 311.7 + 0.123) * 43758.5453);
export const vnoise = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i, s), rnd(i + 1, s), u) * 2 - 1; };
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const Ease = {
  lin: (x) => x,
  inQuad: (x) => x * x, outQuad: (x) => 1 - (1 - x) * (1 - x),
  inCubic: (x) => x * x * x, outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1),
  outBounce: (x) => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
};

/* beat pulses: 1 on the beat, decaying (k per second) */
export function beatPulse(t, k = 9, every = 1, phase = 0) {
  const b = beatOf(t) - phase;
  if (b < 0) return 0;
  const since = (b - Math.floor(b / every) * every) * SPB;
  return Math.exp(-since * k);
}

/* ---------------- audio energy (deterministic, from the decoded buffer) ---------------- */
export const ENERGY = { fps: 100, rms: null, low: null };
export function analyzeEnergy(buf) {
  const fps = ENERGY.fps, sr = buf.sampleRate, hop = Math.floor(sr / fps);
  const L = buf.getChannelData(0), R = buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0);
  const n = Math.ceil(L.length / hop), rms = new Float32Array(n), low = new Float32Array(n);
  const a = Math.exp(-2 * Math.PI * 140 / sr); // one-pole low-pass ~140 Hz for the kick
  let lp = 0, mr = 0, ml = 0;
  for (let f = 0; f < n; f++) {
    let s = 0, sl = 0; const i0 = f * hop, i1 = Math.min(L.length, i0 + hop);
    for (let i = i0; i < i1; i++) { const m = (L[i] + R[i]) * 0.5; s += m * m; lp = a * lp + (1 - a) * m; sl += lp * lp; }
    rms[f] = Math.sqrt(s / Math.max(1, i1 - i0)); low[f] = Math.sqrt(sl / Math.max(1, i1 - i0));
    if (rms[f] > mr) mr = rms[f]; if (low[f] > ml) ml = low[f];
  }
  for (let f = 0; f < n; f++) { rms[f] /= mr || 1; low[f] /= ml || 1; }
  ENERGY.rms = rms; ENERGY.low = low;
}
export function energy(t, which = 'rms') {
  const arr = ENERGY[which];
  if (!arr) return 0.6;
  const f = clamp(t * ENERGY.fps, 0, arr.length - 1), i = Math.floor(f), u = f - i;
  return lerp(arr[i], arr[Math.min(arr.length - 1, i + 1)], u);
}
