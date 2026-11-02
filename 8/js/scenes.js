'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   A black-and-white film being projected: leader countdown, letterboxed
   verses cut shot by shot (subtitles, silent-film intertitles, slams,
   a typed screenplay, a running film strip, words flying at the lens),
   open-matte hooks with wind / ink / ice, and a chorus where the reel
   runs backwards, bleeds and burns. The only colour is blood red.
   Words land on the syllable times in lyrics.js; shots, shakes and
   flashes are cued from the beat grid. Choices are seeded, so every
   playback and the MP4 look the same.
   ============================================================ */
let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };

/* ---------------- beat grid ---------------- */
const beatT = (k) => BEAT0 + k * SPB;
const beatF = (t) => (t - BEAT0) / SPB;
const beatIdx = (t) => Math.floor(beatF(t));
function drumEnv(arr, t, k = 9, min = 0.35) {
  for (let i = beatIdx(t), n = 0; i >= 0 && n < 3; i--, n++) {
    const v = arr[i] || 0;
    if (v >= min) return Math.min(1, v) * Math.exp(-(t - beatT(i)) * k);
  }
  return 0;
}
const kickEnv = (t, k) => drumEnv(KICK, t, k, 0.5);
const snareEnv = (t, k) => drumEnv(SNARE, t, k, 0.5);

/* ---------------- palette (silver screen + one red) ---------------- */
const P = {
  black: '#0A0A09', coal: '#151514', ash: '#2A2A28', smoke: '#5C5B57', grey: '#8E8C86', fog: '#B9B6AE', silver: '#D8D5CD', paper: '#ECE8DF', white: '#F7F5F0',
  red: '#C3121E', redHot: '#FF2A2A',
};

/* ---------------- song map ---------------- */
const NL = LYRICS.length;
const LF = (i) => LYRICS[i].words[0].t;                               // first sung word of line i
const LE = (i) => LYRICS[i].words[LYRICS[i].words.length - 1].e;       // last sung syllable of line i
const HOOKS = [
  { a: 16, chorus: 20, z: 23, el: 'wind' },
  { a: 41, chorus: 45, z: 48, el: 'ink' },
  { a: 65, chorus: 69, z: 72, el: 'ice' },
  { a: 90, z: 105, chorus: 102, el: 'all' },
];
const HOOK_EL = (i) => {
  if (i >= 90 && i <= 93) return 'wind';
  if (i >= 94 && i <= 97) return 'ink';
  if (i >= 98 && i <= 101) return 'ice';
  for (const h of HOOKS) if (i >= h.a && i < h.chorus) return h.el;
  return null;
};
const isChorus = (i) => HOOKS.some((h) => i >= h.chorus && i <= h.z);
const isHook = (i) => HOOKS.some((h) => i >= h.a && i <= h.z);
const OUTRO_A = 106;
const T_INTRO_END = LF(0) - 0.35;
const T_END = LE(NL - 1) + 1.2;                                        // end card after the last line
const SECTS = [
  { t: 0, name: 'LEADER', kind: 'intro' },
  { t: T_INTRO_END, name: 'REEL 1', kind: 'verse' },
  { t: LF(16) - 0.16, name: 'HOOK', kind: 'hook' },
  { t: LF(24) - 0.16, name: 'REEL 2', kind: 'verse' },
  { t: LF(41) - 0.16, name: 'HOOK', kind: 'hook' },
  { t: LF(49) - 0.16, name: 'REEL 3', kind: 'verse' },
  { t: LF(65) - 0.16, name: 'HOOK', kind: 'hook' },
  { t: LF(73) - 0.16, name: 'REEL 4', kind: 'verse' },
  { t: LF(90) - 0.16, name: 'LAST HOOK', kind: 'hook' },
  { t: LF(106) - 0.16, name: 'OUTRO', kind: 'outro' },
  { t: T_END, name: 'END', kind: 'end' },
];
const sectAt = (t) => { let s = SECTS[0]; for (const x of SECTS) if (t >= x.t) s = x; return s; };
const sectEnd = (s) => { const k = SECTS.indexOf(s); return k + 1 < SECTS.length ? SECTS[k + 1].t : DUR; };

/* ---------------- words: red words and props ---------------- */
const RED = ['피', '빨강', '불을', '악역', '죽음', '칼', '죽게', '피흘릴', '흘릴', '영정', '죄를'];
const isRed = (w) => RED.some((k) => w.includes(k));
const clean = (w) => w.replace(/[,.?]+$/, '').replace(/\.\.\.$/, '');
// a prop is shown from the cue word's first syllable until the end of its line (or `hold` seconds)
const PROP_WORDS = [
  ['단조로운', 'grey'], ['흑백의', 'grey'], ['관중', 'audience'], ['홀로', 'spot'], ['치과란', 'tooth'], ['일인극과', 'spot'],
  ['포스터가', 'poster'], ['전시', 'poster'], ['칼', 'knife'], ['암흑과', 'black'], ['투영과', 'beam'], ['액자', 'frame'],
  ['엔딩은', 'end'], ['영정이야', 'frame'], ['씬도', 'clap'], ['장면만을', 'clap'], ['빛을', 'iris'], ['모노드라마', 'spot'],
  ['영화관에', 'poster'],
];
const PROPS = [];
LYRICS.forEach((L, i) => {
  if (isHook(i) || i >= OUTRO_A) return;
  L.words.forEach((w, k) => {
    const nx = L.words[k + 1];
    if (w.w.startsWith('되감') || w.w.startsWith('되돌') || (w.w === '되' && nx && nx.w.startsWith('감'))) { PROPS.push({ kind: 'rewind', i, k, t: w.t, e: w.e, z: lineOut(i) }); return; }
    const hit = PROP_WORDS.find(([kw]) => clean(w.w) === kw || (kw.length > 1 && w.w.startsWith(kw)));
    if (!hit) return;
    PROPS.push({ kind: hit[1], i, k, t: w.t, e: w.e, z: lineOut(i) });
  });
});
function lineOut(i) { return i + 1 < NL ? LF(i + 1) - 0.12 : LE(i) + 2; }
const propsAt = (t) => PROPS.filter((p) => t >= p.t - 0.08 && t < p.z);
// times where the film visibly runs backwards (shader + timecode)
const REWINDS = [];
PROPS.filter((p) => p.kind === 'rewind').forEach((p) => REWINDS.push([p.t, Math.min(p.t + 1.1, p.z)]));
LYRICS.forEach((L, i) => { if (isChorus(i) && L.text.includes('되감는다')) { const w = L.words.find((x) => x.w.startsWith('되감')); REWINDS.push([w.t - 0.05, w.e + 0.9]); } });
function rewindAmt(t) {
  let a = 0;
  for (const [s, e] of REWINDS) a = Math.max(a, Math.min(Ease.outCubic(pr(t, s, s + 0.15)), 1 - Ease.inCubic(pr(t, e - 0.3, e))));
  return a;
}
// film time shown on the timecode: runs backwards while rewinding
const FILM_T = (() => {
  const step = 1 / 30, n = Math.ceil(DUR / step) + 2, arr = new Float32Array(n);
  let ft = 0;
  for (let k = 0; k < n; k++) { arr[k] = ft; const r = rewindAmt(k * step); ft += step * (1 - r * 4.2); if (ft < 0) ft = 0; }
  return arr;
})();
const filmTime = (t) => FILM_T[clamp(Math.floor(t * 30), 0, FILM_T.length - 1)];

/* ---------------- per-line plan (seeded) ---------------- */
const STYLES = ['subtitle', 'intertitle', 'slam', 'script', 'strip', 'zoom'];
const FORCE = {
  0: { style: 'intertitle' }, 1: { style: 'subtitle' }, 3: { style: 'slam' }, 5: { style: 'strip' }, 8: { style: 'script' }, 9: { style: 'slam' },
  15: { style: 'zoom' }, 24: { style: 'slam' }, 26: { style: 'subtitle' }, 27: { style: 'subtitle' }, 29: { style: 'slam' }, 30: { style: 'intertitle' }, 31: { style: 'strip' },
  34: { style: 'subtitle' }, 35: { style: 'zoom' }, 38: { style: 'intertitle' }, 39: { style: 'strip' }, 40: { style: 'zoom' },
  49: { style: 'intertitle' }, 50: { style: 'slam' }, 54: { style: 'subtitle' }, 56: { style: 'zoom' }, 60: { style: 'script' }, 63: { style: 'script' }, 64: { style: 'subtitle' },
  73: { style: 'slam' }, 79: { style: 'subtitle' }, 82: { style: 'strip' }, 84: { style: 'zoom' }, 85: { style: 'slam' }, 86: { style: 'zoom' }, 87: { style: 'slam' }, 88: { style: 'intertitle' }, 89: { style: 'zoom' },
};
const PLAN = (() => {
  const R = mulberry32(8080);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const out = [];
  let prev = '', prev2 = '', dark = true;
  LYRICS.forEach((L, i) => {
    const tIn = LF(i) - 0.14, tOut = lineOut(i);
    if (i >= OUTRO_A) { out.push({ style: 'outro', tIn, tOut, seed: 7000 + i }); return; }
    if (isChorus(i)) { out.push({ style: 'chorus', tIn, tOut, seed: 5000 + i }); return; }
    if (isHook(i)) { out.push({ style: 'hook', tIn, tOut, seed: 6000 + i, el: HOOK_EL(i) }); return; }
    const f = FORCE[i] || {};
    let style = f.style;
    for (let tries = 0; !style && tries < 60; tries++) {
      const s = pick(STYLES);
      if (s === prev || s === prev2) continue;
      if (s === 'strip' && L.words.length > 7) continue;
      style = s;
    }
    // shot tone: intertitles and scripts sit on black; the rest alternate dark / light shots
    dark = style === 'intertitle' || style === 'script' ? true : !dark;
    if (PROPS.some((p) => p.i === i && (p.kind === 'black' || p.kind === 'spot' || p.kind === 'beam'))) dark = true;
    out.push({ style, tIn, tOut, seed: 1000 + i * 37, dark, align: pick(['left', 'center', 'center', 'right']), shot: 0 });
    prev2 = prev; prev = style;
  });
  let n = 0;
  out.forEach((p, i) => { if (!isHook(i) && i < OUTRO_A) p.shot = ++n; });
  return out;
})();
const lineAt = (t) => { let k = -1; for (let i = 0; i < NL; i++) { if (PLAN[i].tIn <= t) k = i; else break; } return k; };

/* ---------------- layout helpers ---------------- */
let LAYOUTS = new Map();
function wrapItems(words, f, size, maxW, w = 900) {
  setFont(size, w, null, f);
  const sp = g.measureText(' ').width + size * 0.1;
  const items = words.map((x, k) => ({ k, s: x.w, red: isRed(x.w), w: layout(x.w).w }));
  const total = items.reduce((a, it) => a + it.w, 0) + sp * (items.length - 1);
  const nrows = Math.ceil(total / maxW);
  if (nrows > 1) maxW = Math.min(maxW, (total / nrows) * 1.12 + size);
  const rows = [[]]; let cw = 0;
  for (const it of items) {
    const add = rows[rows.length - 1].length ? sp + it.w : it.w;
    if (rows[rows.length - 1].length && cw + add > maxW) { rows.push([]); cw = 0; }
    cw += rows[rows.length - 1].length ? sp + it.w : it.w;
    rows[rows.length - 1].push(it);
  }
  return { items, rows, sp };
}
// fit words into at most `maxRows` rows, place them; returns items with cx/cy
function fitLines(words, f, size, maxW, maxRows, cy, align, lead = 1.3, w = 900) {
  let r;
  for (let n = 0; n < 12; n++) { r = wrapItems(words, f, size, maxW, w); if (r.rows.length <= maxRows) break; size *= 0.9; }
  const lh = size * lead, top = cy - ((r.rows.length - 1) * lh) / 2;
  r.rows.forEach((row, j) => {
    const rw = row.reduce((a, it, q) => a + it.w + (q ? r.sp : 0), 0);
    let x = align === 'left' ? 170 : align === 'right' ? W - 170 - rw : CX - rw / 2;
    row.forEach((it, q) => { if (q) x += r.sp; it.cx = x + it.w / 2; it.cy = top + j * lh; it.row = j; x += it.w; });
  });
  r.items.forEach((it) => { it.size = size; it.f = f; });
  return r;
}
function getLayout(i) {
  let L = LAYOUTS.get(i);
  if (L) return L;
  const line = LYRICS[i], plan = PLAN[i], R = mulberry32(plan.seed);
  const st = plan.style;
  L = { };
  if (st === 'subtitle') {
    L.big = R() < 0.5;
    L.r = fitLines(line.words, 'serif', L.big ? 96 : 80, 1500, 2, L.big ? 640 : 790, 'center', 1.32);
  } else if (st === 'intertitle') {
    L.r = fitLines(line.words, 'serif', 104, 1260, 3, 540, 'center', 1.4);
  } else if (st === 'slam') {
    const f = R() < 0.7 ? 'disp' : 'serif';
    const items = line.words.map((x, k) => ({ k, s: x.w, red: isRed(x.w) }));
    // two or three per row, big
    const per = items.length <= 4 ? 2 : 3;
    const rows = []; for (let k = 0; k < items.length; k += per) rows.push(items.slice(k, k + per));
    const gap = 40;
    let size = 230;
    for (let n = 0; n < 14; n++) {
      setFont(size, 900, null, f);
      const sp = size * 0.22;
      const wid = Math.max(...rows.map((r) => r.reduce((a, it, q) => a + layout(it.s).w + (q ? sp : 0), 0)));
      if (wid < 1560 && rows.length * size * 1.02 < 760) break;
      size *= 0.92;
    }
    setFont(size, 900, null, f);
    const sp = size * 0.22, lh = size * 1.02, top = 545 - ((rows.length - 1) * lh) / 2;
    rows.forEach((row, j) => {
      row.forEach((it) => { it.w = layout(it.s).w; });
      const rw = row.reduce((a, it, q) => a + it.w + (q ? sp : 0), 0);
      let x = plan.align === 'left' ? 170 : plan.align === 'right' ? W - 170 - rw : CX - rw / 2;
      row.forEach((it, q) => { if (q) x += sp; it.cx = x + it.w / 2; it.cy = top + j * lh; x += it.w; it.size = size; it.f = f; it.rot = (R() - 0.5) * 0.05; });
    });
    L.items = items; void gap;
  } else if (st === 'script') {
    L.scene = ['극장', '치과', '대기실', '분장실', '편집실', '영사실'][Math.floor(R() * 6)];
    L.time = ['밤', '낮', '새벽'][Math.floor(R() * 3)];
    L.rot = (R() - 0.5) * 0.035;
    setFont(64, 600, 0, null);
    L.lines = []; let cur = '';
    for (const w of line.text.split(' ')) { const nx = cur ? cur + ' ' + w : w; if (layout(nx).w > 1000 && cur) { L.lines.push(cur); cur = w; } else cur = nx; }
    L.lines.push(cur);
    // per char times across the whole text
    L.ct = []; let wi = 0, ci = 0;
    for (const ch of line.text) {
      if (ch === ' ') { L.ct.push(null); wi++; ci = 0; continue; }
      const w = line.words[wi];
      L.ct.push(w ? w.ct[Math.min(ci, w.ct.length - 1)] : null); ci++;
    }
  } else if (st === 'strip') {
    L.f = R() < 0.5 ? 'disp' : 'serif';
    L.items = line.words.map((x, k) => {
      setFont(150, 900, null, L.f); const w = layout(x.w).w;
      return { k, s: x.w, red: isRed(x.w), size: Math.min(150, (430 / w) * 150) };
    });
  } else if (st === 'zoom') {
    L.items = line.words.map((x, k) => {
      const f = R() < 0.6 ? 'disp' : 'serif';
      setFont(100, 900, null, f); const w100 = layout(x.w).w;
      return { k, s: x.w, red: isRed(x.w), f, size: Math.min(300, (1400 / w100) * 100), dx: (R() - 0.5) * 300, dy: (R() - 0.5) * 160, rot: (R() - 0.5) * 0.1 };
    });
  } else if (st === 'hook') {
    L.r = fitLines(line.words, 'serifR', 92, 1500, 2, 560, 'center', 1.3, 400);
  } else if (st === 'chorus') {
    L.r = fitLines(line.words, 'serif', 112, 1600, 2, 540, 'center', 1.25);
  } else if (st === 'outro') {
    L.r = fitLines(line.words, 'serif', 150, 1500, 1, 540, 'center', 1.2);
  }
  LAYOUTS.set(i, L);
  return L;
}

/* ---------------- small drawing helpers ---------------- */
function glyph(s, x, y, size, f, col, a = 1, w = 900) {
  if (a <= 0.002) return;
  setFont(size, w, null, f);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const a0 = g.globalAlpha; g.globalAlpha = a0 * a;
  g.fillStyle = col; g.fillText(s, x, y);
  g.globalAlpha = a0;
}
// per-character reveal on the sung times of a word
function sungWord(it, wd, t, o) {
  const n = it.s.length;
  setFont(it.size, o.w || 900, null, it.f);
  const Lw = layout(it.s);
  const x0 = it.cx - Lw.w / 2;
  const ls = _ls;
  g.letterSpacing = '0px'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const a0 = g.globalAlpha;
  for (let c = 0; c < n; c++) {
    const ch = it.s[c];
    const tc = wd.ct[Math.min(c, wd.ct.length - 1)];
    const p = pr(t, tc - 0.03, tc - 0.03 + (o.dur || 0.16));
    if (p <= 0) continue;
    const e = Ease.outCubic(p);
    const cx = x0 + Lw.xs[c] + (Lw.ws[c] - ls) / 2;
    g.save();
    g.translate(cx, it.cy + (o.rise != null ? o.rise : it.size * 0.25) * (1 - e));
    if (o.pop) { const s = lerp(o.pop, 1, Ease.outExpo(p)); g.scale(s, s); }
    g.globalAlpha = a0 * e * (o.a != null ? o.a : 1);
    if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.stroke; g.strokeStyle = o.scol; g.strokeText(ch, 0, 0); }
    g.fillStyle = it.red && o.redOK !== false ? P.red : o.col;
    g.fillText(ch, 0, 0);
    g.restore();
  }
  g.letterSpacing = ls + 'px';
}
function vgrad(y0, y1, c0, c1) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
function radial(x, y, r0, r1, c0, c1) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }

/* ---------------- backgrounds ---------------- */
function shotBg(t, i, plan) {
  const R = mulberry32(plan.seed + 3);
  const lx = 300 + R() * 1320, ly = 200 + R() * 500;
  const drift = (t - plan.tIn) * 8;
  if (plan.dark) {
    fillAll(P.black);
    g.fillStyle = radial(lx + drift, ly, 0, 1100, 'rgba(120,118,112,0.42)', 'rgba(10,10,9,0)');
    g.fillRect(0, 0, W, H);
  } else {
    fillAll(P.silver);
    g.fillStyle = radial(lx - drift, ly, 100, 1300, 'rgba(247,245,240,0.9)', 'rgba(120,118,112,0.0)');
    g.fillRect(0, 0, W, H);
  }
  // drifting dust in the projector light
  const a0 = g.globalAlpha;
  for (let k = 0; k < 36; k++) {
    const sp = 6 + rnd(k, 21) * 22;
    const x = fract(rnd(k, 22) + t * sp / W * (rnd(k, 25) < 0.5 ? 1 : -1)) * W;
    const y = fract(rnd(k, 23) + t * sp * 0.4 / H) * H;
    g.globalAlpha = a0 * (0.12 + 0.25 * rnd(k, 24)) * (0.6 + 0.4 * Math.sin(t * 2 + k));
    circle(x, y, 1.2 + rnd(k, 26) * 2.6, plan.dark ? P.fog : P.ash);
  }
  g.globalAlpha = a0;
}
function hookBg(t, el, i) {
  // open matte, silver paper, the element of the stanza drawn in ink
  fillAll(P.paper);
  g.fillStyle = radial(CX, CY, 200, 1250, 'rgba(255,255,255,0.6)', 'rgba(90,88,84,0.35)');
  g.fillRect(0, 0, W, H);
  if (el === 'wind') wind(t);
  else if (el === 'ink') ink(t, i);
  else if (el === 'ice') ice(t, i);
}
// wind: long strokes of scent / smoke drifting right and dissolving
function wind(t) {
  g.save();
  g.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const y0 = 80 + rnd(k, 1) * 920, sp = 140 + rnd(k, 2) * 260, len = 260 + rnd(k, 3) * 520;
    const x = fract(rnd(k, 4) + (t * sp) / (W + 1200)) * (W + 1200) - 600;
    g.strokeStyle = `rgba(40,40,38,${0.05 + rnd(k, 5) * 0.12})`;
    g.lineWidth = 1.5 + rnd(k, 6) * 5;
    g.beginPath();
    for (let s = 0; s <= 24; s++) {
      const f = s / 24, xx = x + f * len;
      const yy = y0 + Math.sin(f * 5 + t * 1.3 + k) * 26 + vnoise(xx * 0.004 + t * 0.4, k) * 40;
      s ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
    }
    g.stroke();
  }
  // petals of scent scattering
  for (let k = 0; k < 60; k++) {
    const sp = 90 + rnd(k, 11) * 200;
    const x = fract(rnd(k, 12) + (t * sp) / W) * W, y = 120 + rnd(k, 13) * 840 + Math.sin(t * 1.7 + k) * 40;
    g.save(); g.translate(x, y); g.rotate(t * (1 + rnd(k, 14) * 2) + k);
    g.fillStyle = `rgba(30,30,28,${0.08 + 0.18 * rnd(k, 15)})`;
    g.beginPath(); g.ellipse(0, 0, 9 + rnd(k, 16) * 10, 3 + rnd(k, 17) * 3, 0, 0, TAU); g.fill();
    g.restore();
  }
  g.restore();
}
// ink: drops land on the beat and bloom outward like ink in still water
function ink(t, i) {
  const b0 = beatIdx(t);
  g.save();
  for (let b = b0 - 12; b <= b0; b++) {
    if (b < 0 || b % 2) continue;
    const t0 = beatT(b), age = t - t0;
    if (age < 0) continue;
    const x = 160 + rnd(b, 31) * 1600, y = 120 + rnd(b, 32) * 840;
    const r = 30 + Math.sqrt(age) * (150 + rnd(b, 33) * 120);
    const a = 0.3 * Math.exp(-age * 0.32);
    for (let ring = 0; ring < 3; ring++) {
      g.fillStyle = `rgba(14,14,13,${a * (0.5 - ring * 0.13)})`;
      g.beginPath();
      for (let s = 0; s <= 48; s++) {
        const ang = (s / 48) * TAU;
        const rr2 = r * (1 - ring * 0.22) * (1 + 0.22 * vnoise(ang * 2.2 + ring * 3, b) + 0.1 * vnoise(ang * 6 + age, b + 9));
        const px = x + Math.cos(ang) * rr2, py = y + Math.sin(ang) * rr2;
        s ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath(); g.fill();
    }
    // tendrils
    g.strokeStyle = `rgba(14,14,13,${a * 0.6})`; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const ang = rnd(b, 40 + k) * TAU; g.beginPath();
      for (let s = 0; s <= 12; s++) { const f = s / 12, rr2 = r * (0.6 + f * 0.9); const px = x + Math.cos(ang + vnoise(f * 3, b + k) * 0.6) * rr2, py = y + Math.sin(ang + vnoise(f * 3, b + k) * 0.6) * rr2; s ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
    }
  }
  g.restore();
}
// ice: crystal shards crack outward, then drip as they melt
function ice(t, i) {
  const b0 = beatIdx(t);
  g.save();
  g.lineJoin = 'miter';
  for (let b = b0 - 8; b <= b0; b++) {
    if (b < 0 || b % 4) continue;
    const t0 = beatT(b), age = t - t0;
    const x = 200 + rnd(b, 51) * 1520, y = 150 + rnd(b, 52) * 700;
    const grow = Ease.outExpo(pr(age, 0, 0.5)), fade = Math.exp(-age * 0.35);
    g.strokeStyle = `rgba(20,20,19,${0.55 * fade})`;
    for (let k = 0; k < 9; k++) {
      const ang = (k / 9) * TAU + rnd(b, 53 + k) * 0.5;
      let px = x, py = y; g.lineWidth = 2.6; g.beginPath(); g.moveTo(px, py);
      const segs = 5, L0 = (90 + rnd(b, 60 + k) * 240) * grow;
      for (let s = 1; s <= segs; s++) { const a = ang + (rnd(b * 7 + k, s) - 0.5) * 0.7; px += Math.cos(a) * (L0 / segs); py += Math.sin(a) * (L0 / segs); g.lineTo(px, py); }
      g.stroke();
    }
    // facets
    g.fillStyle = `rgba(255,255,255,${0.5 * fade})`;
    g.beginPath();
    for (let s = 0; s < 6; s++) { const a = (s / 6) * TAU + b; const r = (30 + rnd(b, 70 + s) * 40) * grow; s ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath(); g.fill();
    // melting drops
    for (let k = 0; k < 4; k++) {
      const dx = x + (rnd(b, 80 + k) - 0.5) * 200, dy = y + 40 + Math.pow(Math.max(0, age - 0.6 - k * 0.3), 2) * 160;
      if (dy > H + 40 || age < 0.6) continue;
      g.fillStyle = `rgba(20,20,19,${0.35 * fade})`;
      g.beginPath(); g.ellipse(dx, dy, 5, 9, 0, 0, TAU); g.fill();
    }
  }
  g.restore();
}
// a film reel (two flanges with six windows), spinning by `ang`
function reel(x, y, r, ang, col, hole) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = col; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    g.beginPath(); g.arc(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56, r * 0.25, 0, TAU); g.fill();
  }
  g.beginPath(); g.arc(0, 0, r * 0.08, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over';
  if (hole) { g.strokeStyle = hole; g.lineWidth = r * 0.03; g.beginPath(); g.arc(0, 0, r * 0.97, 0, TAU); g.stroke(); }
  g.restore();
}
// horizontal film strip band with sprocket holes; `off` scrolls it
function filmStrip(y, h, off, frameW, tone) {
  g.fillStyle = tone.strip; g.fillRect(-10, y - h / 2, W + 20, h);
  const hs = h * 0.07, hw = hs * 1.4, pitch = hs * 2.6;
  g.fillStyle = tone.hole;
  for (let x = -((off % pitch) + pitch) ; x < W + pitch; x += pitch) {
    rr(x, y - h / 2 + hs * 0.7, hw, hs, hs * 0.25); g.fill();
    rr(x, y + h / 2 - hs * 1.7, hw, hs, hs * 0.25); g.fill();
  }
  // frame lines
  g.fillStyle = tone.line;
  for (let x = -((off % frameW) + frameW); x < W + frameW; x += frameW) g.fillRect(x, y - h / 2 + hs * 2.4, 6, h - hs * 4.8);
}

/* ---------------- verse styles ---------------- */
const tone = (plan) => (plan.dark ? { ink: P.white, sub: P.grey, stroke: P.black } : { ink: P.black, sub: P.smoke, stroke: P.paper });

function drawSubtitle(i, L, plan, t) {
  const tn = tone(plan), line = LYRICS[i];
  // subtitles get a soft band behind them on light shots
  for (const it of L.r.items) sungWord(it, line.words[it.k], t, { col: tn.ink, stroke: plan.dark ? 6 : 0, scol: P.black, rise: 14, dur: 0.18 });
}
function drawIntertitle(i, L, plan, t) {
  const p = Ease.outCubic(pr(t, plan.tIn, plan.tIn + 0.25));
  fillAll(P.black);
  // ornamental double border
  g.save(); g.globalAlpha = p;
  g.strokeStyle = P.fog; g.lineWidth = 3; g.strokeRect(150, 150, W - 300, H - 300);
  g.lineWidth = 1.5; g.strokeRect(172, 172, W - 344, H - 344);
  for (const [x, y] of [[150, 150], [W - 150, 150], [150, H - 150], [W - 150, H - 150]]) {
    g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = P.fog; g.fillRect(-11, -11, 22, 22); g.fillStyle = P.black; g.fillRect(-5, -5, 10, 10); g.restore();
  }
  // little ornaments above and below the text
  const top = Math.min(...L.r.items.map((it) => it.cy)) - L.r.items[0].size * 0.95, bot = Math.max(...L.r.items.map((it) => it.cy)) + L.r.items[0].size * 0.95;
  g.fillStyle = P.grey;
  for (const y of [top, bot]) { g.fillRect(CX - 140, y, 110, 2); g.fillRect(CX + 30, y, 110, 2); g.save(); g.translate(CX, y + 1); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore(); }
  g.restore();
  const line = LYRICS[i];
  for (const it of L.r.items) {
    const wd = line.words[it.k];
    const a = Ease.outCubic(pr(t, wd.t - 0.06, wd.t + 0.25));
    if (a <= 0) continue;
    glyph(it.s, it.cx, it.cy, it.size, it.f, it.red ? P.red : P.paper, a);
  }
}
function drawSlam(i, L, plan, t) {
  const tn = tone(plan), line = LYRICS[i];
  for (const it of L.items) {
    const wd = line.words[it.k];
    const p = pr(t, wd.t - 0.05, wd.t + 0.12);
    if (p <= 0) continue;
    const s = lerp(2.3, 1, Ease.outExpo(p));
    g.save(); g.translate(it.cx, it.cy); g.rotate(it.rot * (1 - p * 0.5)); g.scale(s, s);
    glyph(it.s, 0, 0, it.size, it.f, it.red ? P.red : tn.ink, Math.min(1, p * 3));
    g.restore();
  }
}
function drawScript(i, L, plan, t) {
  const line = LYRICS[i]; void line;
  const p = Ease.outCubic(pr(t, plan.tIn, plan.tIn + 0.3));
  g.save();
  g.translate(CX, CY + (1 - p) * 80); g.rotate(L.rot);
  // paper
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(-640 + 18, -380 + 22, 1280, 760);
  g.fillStyle = P.paper; g.fillRect(-640, -380, 1280, 760);
  g.fillStyle = 'rgba(0,0,0,0.06)'; for (let y = -330; y < 360; y += 64) g.fillRect(-600, y, 1200, 1);
  g.fillStyle = P.black; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  setFont(40, 800, 1, null);
  g.fillText(`S#${String(plan.shot).padStart(2, '0')}.  ${L.scene} — ${L.time}`, -560, -270);
  setFont(30, 500, 0, null); g.fillStyle = P.smoke;
  g.fillText('나 (V.O.)', -80, -170);
  // typed text: one character index across the whole line (spaces included, null time)
  setFont(64, 600, 0, null);
  let idx = 0, caret = null;
  L.lines.forEach((ln, r) => {
    let x = -560; const y = -60 + r * 100;
    for (const ch of ln) {
      const tc = L.ct[idx];
      const w = g.measureText(ch).width;
      if (ch !== ' ') {
        if (tc != null && t >= tc - 0.02) { g.fillStyle = isRedChar(i, idx) ? P.red : P.black; g.fillText(ch, x, y); caret = [x + w + 4, y]; }
      }
      x += w; idx++;
    }
    idx++; // the space where the line wrapped
  });
  if (!caret) caret = [-560, -60];
  if (caret && Math.floor(t * 3) % 2 === 0) { g.fillStyle = P.black; g.fillRect(caret[0], caret[1] - 52, 5, 62); }
  g.restore();
}
function isRedChar(i, idx) {
  const text = LYRICS[i].text; let k = 0, s = 0;
  for (const w of text.split(' ')) { if (idx >= s && idx < s + w.length) return isRed(w); s += w.length + 1; k++; }
  return false;
}
function drawStrip(i, L, plan, t) {
  const line = LYRICS[i], n = L.items.length;
  const frameW = 560;
  // which frame is centred: follows the sung words
  let pos = 0;
  for (let k = 0; k < n; k++) { const w = line.words[k]; pos += Ease.inOutCubic(pr(t, w.t - 0.22, w.t + 0.04)); }
  pos = Math.max(0, pos - 1);
  const rw = rewindAmt(t);
  const scroll = pos * frameW + (rw ? -Math.sin(t * 30) * 30 * rw : 0);
  const y = 540, h = 470;
  g.save();
  g.translate(0, 0);
  const tn = plan.dark ? { strip: '#1C1C1B', hole: P.silver, line: P.black } : { strip: P.black, hole: P.silver, line: '#222' };
  const x0 = CX - frameW / 2 - scroll;
  filmStrip(y, h, -x0, frameW, tn);
  for (let k = 0; k < n; k++) {
    const it = L.items[k], wd = line.words[k];
    const fx = x0 + k * frameW;
    if (fx > W + 40 || fx + frameW < -40) continue;
    const lit = Ease.outCubic(pr(t, wd.t - 0.08, wd.t + 0.12));
    // frame window
    g.fillStyle = lit > 0 ? `rgba(236,232,223,${0.1 + 0.85 * lit})` : 'rgba(236,232,223,0.07)';
    g.fillRect(fx + 26, y - h / 2 + 64, frameW - 46, h - 128);
    if (lit > 0) glyph(it.s, fx + frameW / 2 + 3, y + 4, it.size, L.f, it.red ? P.red : P.black, lit);
    // frame number on the edge
    g.fillStyle = P.grey; setFont(18, 400, 2, 'num'); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(`${plan.shot}${String.fromCharCode(65 + (k % 26))}`, fx + 30, y + h / 2 - 22);
  }
  g.restore();
}
function drawZoom(i, L, plan, t) {
  const tn = tone(plan), line = LYRICS[i];
  // current word big; the previous one flies at the lens
  let cur = -1;
  for (let k = 0; k < L.items.length; k++) if (t >= line.words[k].t - 0.06) cur = k;
  for (let k = Math.max(0, cur - 1); k <= cur; k++) {
    const it = L.items[k], wd = line.words[k];
    const pin = Ease.outExpo(pr(t, wd.t - 0.06, wd.t + 0.2));
    const nxt = k + 1 < L.items.length ? line.words[k + 1].t - 0.06 : plan.tOut;
    const pout = pr(t, nxt - 0.02, nxt + 0.14);
    const s = lerp(0.6, 1, pin) * (1 + Ease.inQuad(pout) * 2.6);
    const a = Math.min(1, pin * 2.5) * Math.pow(1 - pout, 3);
    if (a <= 0) continue;
    g.save(); g.translate(CX + it.dx * (1 - pin * 0.6), CY + it.dy * (1 - pin * 0.6)); g.rotate(it.rot); g.scale(s, s);
    glyph(it.s, 0, 0, it.size, it.f, it.red ? P.red : tn.ink, a);
    g.restore();
  }
}

/* ---------------- hook + chorus + outro styles ---------------- */
function drawHook(i, L, plan, t) {
  const line = LYRICS[i];
  // previous hook line lingers above, small and faint
  const pi = i - 1;
  if (pi >= 0 && PLAN[pi].style === 'hook') {
    const Lp = getLayout(pi);
    const fade = 1 - pr(t, plan.tIn + 0.4, plan.tIn + 1.2);
    if (fade > 0) {
      g.save(); g.translate(0, -170 * Ease.outCubic(pr(t, plan.tIn - 0.1, plan.tIn + 0.35)));
      g.globalAlpha *= 0.35 * fade;
      for (const it of Lp.r.items) glyph(it.s, it.cx, it.cy, it.size, it.f, P.ash, 1, 400);
      g.restore();
    }
  }
  for (const it of L.r.items) sungWord(it, line.words[it.k], t, { col: P.black, w: 400, rise: 30, dur: 0.4 });
}
function chorusBg(t, i) {
  fillAll(P.black);
  // reel turns backwards; faster while the film is rewinding
  const rw = rewindAmt(t);
  const ang = -t * 0.9 - rw * t * 3;
  g.globalAlpha = 0.07;
  reel(1500, 560, 420, ang, P.silver, P.white);
  reel(380, 300, 260, ang * 1.3, P.silver, P.white);
  g.globalAlpha = 1;
  // film running between the reels
  g.strokeStyle = 'rgba(216,213,205,0.12)'; g.lineWidth = 26;
  g.beginPath(); g.moveTo(380, 300 + 250); g.bezierCurveTo(700, 900, 1100, 950, 1500, 980); g.stroke();
}
function drawChorus(i, L, plan, t) {
  const line = LYRICS[i];
  const rw = rewindAmt(t);
  for (const it of L.r.items) {
    const wd = line.words[it.k];
    const isRw = it.s.startsWith('되감');
    if (isRw && t > wd.e) {
      // ghost copies sliding back to where the word came from
      for (let k = 3; k >= 1; k--) {
        const off = k * 22 * rw * (1 + Math.sin(t * 25 + k));
        g.save(); g.globalAlpha *= 0.12 * rw; glyph(it.s, it.cx - off, it.cy - k * 6 * rw, it.size, it.f, P.silver, 1); g.restore();
      }
    }
    sungWord(it, wd, t, { col: P.paper, rise: 24, dur: 0.22 });
    // blood drips from the red word
    if (it.red && t > wd.t) drips(it, t - wd.t, it.s.length);
  }
}
function drips(it, age, n) {
  setFont(it.size, 900, null, it.f);
  const w = layout(it.s).w;
  for (let k = 0; k < n * 2; k++) {
    const x = it.cx - w / 2 + (k + 0.5) * (w / (n * 2)) + (rnd(k, it.k) - 0.5) * 20;
    const d0 = rnd(k, it.k + 3) * 0.6;
    const len = Math.max(0, age - d0) * (120 + rnd(k, it.k + 5) * 260);
    if (len <= 0) continue;
    const y0 = it.cy + it.size * 0.3, ww = 4 + rnd(k, it.k + 7) * 7;
    g.fillStyle = P.red;
    g.fillRect(x - ww / 2, y0, ww, Math.min(len, 700));
    g.beginPath(); g.arc(x, y0 + Math.min(len, 700), ww * 0.9, 0, TAU); g.fill();
  }
}
// film burn: a hole that melts out from a point, red-hot edge, white beyond
function burn(t, t0, x, y, seed) {
  const age = t - t0;
  if (age <= 0) return;
  const r = Math.pow(age, 1.3) * 2600;
  const path = (rad) => {
    g.beginPath();
    for (let s = 0; s <= 180; s++) {
      const a = (s / 180) * TAU;
      const rr2 = rad * (1 + 0.26 * vnoise(a * 2.2, seed) + 0.07 * vnoise(a * 7 + age * 2, seed + 1) + 0.025 * vnoise(a * 23, seed + 2));
      const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
      s ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  };
  g.save();
  path(r * 1.25 + 30); g.fillStyle = 'rgba(70,20,10,0.55)'; g.fill();
  path(r * 1.1 + 18); g.fillStyle = P.red; g.fill();
  path(r * 1.02 + 8); g.fillStyle = '#FF6A3A'; g.fill();
  path(r); g.fillStyle = P.white; g.fill();
  g.restore();
}
function drawOutro(i, L, plan, t) {
  const line = LYRICS[i];
  fillAll(P.black);
  // one candle-like light breathing behind the words
  g.fillStyle = radial(CX, CY + 40, 0, 700, `rgba(216,213,205,${0.12 + 0.05 * Math.sin(t * 3)})`, 'rgba(0,0,0,0)');
  g.fillRect(0, 0, W, H);
  const pout = pr(t, plan.tOut - 0.35, plan.tOut);
  g.save(); g.globalAlpha *= 1 - pout;
  for (const it of L.r.items) sungWord(it, line.words[it.k], t, { col: P.paper, rise: 0, dur: 0.5, pop: 1.08 });
  g.restore();
  // the earlier statement echoes small at the top
  if (i > OUTRO_A) {
    const prev = LYRICS[i - 1].text;
    glyph(prev, CX, 260, 46, 'serifR', P.smoke, 0.7 * (1 - pout), 400);
  }
}
const RENDER = { subtitle: drawSubtitle, intertitle: drawIntertitle, slam: drawSlam, script: drawScript, strip: drawStrip, zoom: drawZoom, hook: drawHook, chorus: drawChorus, outro: drawOutro };

/* ---------------- props (verse keywords) ---------------- */
function drawProps(t, under) {
  for (const p of propsAt(t)) {
    const a = Ease.outCubic(pr(t, p.t - 0.08, p.t + 0.2)) * (1 - pr(t, p.z - 0.15, p.z));
    if (a <= 0) continue;
    const plan = PLAN[p.i], dark = plan.dark;
    const ink = dark ? P.silver : P.black;
    g.save(); g.globalAlpha *= a;
    switch (p.kind) {
      case 'grey': if (!under) break; {
        const n = 10, w = 120, x0 = CX - (n * w) / 2, y = 190;
        for (let k = 0; k < n; k++) {
          const v = Math.round(lerp(14, 244, k / (n - 1)));
          const dy = (1 - Ease.outBack(pr(t, p.t + k * 0.03, p.t + k * 0.03 + 0.3))) * -200;
          g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x0 + k * w, y + dy, w, 70);
        }
        g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(x0, y, n * w, 70);
      } break;
      case 'audience': if (under) break; {
        for (let k = 0; k < 15; k++) {
          const x = 40 + k * 135 + (k % 2) * 30, y = H - 150 + Math.sin(t * 2 + k) * 3 + (k % 2) * 25;
          g.fillStyle = P.black;
          g.beginPath(); g.arc(x, y - 92, 44, 0, TAU); g.fill();
          g.beginPath(); g.ellipse(x, y + 20, 95, 80, 0, Math.PI, TAU); g.fill();
        }
      } break;
      case 'spot': if (!under) break; {
        const sx = CX + Math.sin(t * 0.7) * 120;
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, 'rgba(247,245,240,0.32)'); gr.addColorStop(1, 'rgba(247,245,240,0.06)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(sx - 70, -10); g.lineTo(sx + 70, -10); g.lineTo(sx + 520, H); g.lineTo(sx - 520, H); g.closePath(); g.fill();
        g.fillStyle = 'rgba(247,245,240,0.22)'; g.beginPath(); g.ellipse(sx, H - 110, 520, 70, 0, 0, TAU); g.fill();
      } break;
      case 'tooth': if (!under) break; {
        const s = 1 + 0.03 * Math.sin(t * 4);
        g.save(); g.translate(CX, 560); g.scale(2.2 * s, 2.2 * s);
        g.strokeStyle = dark ? 'rgba(216,213,205,0.35)' : 'rgba(10,10,9,0.25)'; g.lineWidth = 5; g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(-90, -60); g.bezierCurveTo(-110, -150, -20, -150, 0, -115); g.bezierCurveTo(20, -150, 110, -150, 90, -60);
        g.bezierCurveTo(80, 0, 70, 60, 55, 130); g.bezierCurveTo(45, 160, 25, 150, 20, 120); g.bezierCurveTo(12, 70, -12, 70, -20, 120);
        g.bezierCurveTo(-25, 150, -45, 160, -55, 130); g.bezierCurveTo(-70, 60, -80, 0, -90, -60); g.closePath(); g.stroke();
        g.restore();
      } break;
      case 'poster': if (!under) break; {
        // three posters slide from left to right, like an exhibition
        for (let k = 0; k < 3; k++) {
          const x = -420 + fract((t - p.t) * 0.12 + k / 3) * (W + 840);
          g.fillStyle = dark ? '#262624' : '#C6C3BB'; g.fillRect(x - 170, 230, 340, 500);
          g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(x - 170, 230, 340, 500);
          g.fillStyle = dark ? '#3A3A37' : '#A9A69E'; g.fillRect(x - 140, 260, 280, 300);
          reel(x, 410, 90, t * 0.5 + k, dark ? '#4A4A46' : '#8E8C86');
          g.fillStyle = ink; g.fillRect(x - 120, 600, 240, 14); g.fillRect(x - 90, 630, 180, 8);
          glyph(`${k + 1}편`, x, 690, 34, 'serif', ink, 0.8);
        }
      } break;
      case 'knife': if (under) break; {
        const sl = Ease.outExpo(pr(t, p.t - 0.05, p.t + 0.35));
        const x = lerp(-700, 520, sl), y = 210;
        g.save(); g.translate(x, y);
        g.fillStyle = P.black; rr(-380, -26, 240, 52, 12); g.fill();
        g.fillStyle = P.smoke; g.fillRect(-150, -40, 22, 80);
        g.fillStyle = P.silver; g.beginPath(); g.moveTo(-128, -30); g.lineTo(560, -8); g.lineTo(600, 6); g.lineTo(-128, 30); g.closePath(); g.fill();
        g.fillStyle = P.white; g.beginPath(); g.moveTo(-128, -30); g.lineTo(560, -8); g.lineTo(560, -2); g.lineTo(-128, -6); g.closePath(); g.fill();
        // red glint on the tip
        const gl = Math.exp(-Math.max(0, t - p.t - 0.3) * 4);
        g.fillStyle = `rgba(195,18,30,${0.9 * gl})`; g.beginPath(); g.arc(590, 4, 16 + 30 * gl, 0, TAU); g.fill();
        g.restore();
        glyph('→', 1270, 210, 120, 'num', P.red, 0.9);
      } break;
      case 'black': break; // handled as a forced black shot
      case 'beam': if (!under) break; {
        const gr = g.createLinearGradient(W, 0, 0, H);
        gr.addColorStop(0, 'rgba(247,245,240,0.45)'); gr.addColorStop(1, 'rgba(247,245,240,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(W + 10, 60); g.lineTo(W + 10, 160); g.lineTo(-20, H + 60); g.lineTo(-20, 200); g.closePath(); g.fill();
        for (let k = 0; k < 50; k++) { const f = fract(rnd(k, 90) + t * 0.15); const x = W - f * W, y = lerp(110, 650, f) + (rnd(k, 91) - 0.5) * lerp(60, 700, f); circle(x, y, 1.5 + rnd(k, 92) * 2.5, 'rgba(247,245,240,0.6)'); }
      } break;
      case 'frame': if (under) break; {
        const ribbon = LYRICS[p.i].words[p.k].w.startsWith('영정');
        const x0 = 330, y0 = 200, w = W - 660, h = H - 400;
        g.strokeStyle = dark ? P.fog : P.ash; g.lineWidth = 18; g.strokeRect(x0, y0, w, h);
        g.lineWidth = 3; g.strokeRect(x0 + 28, y0 + 28, w - 56, h - 56);
        if (ribbon) {
          g.fillStyle = P.black;
          for (const [cx, cy, r] of [[x0, y0, 0], [x0 + w, y0, Math.PI / 2]]) { g.save(); g.translate(cx, cy); g.rotate(r); g.beginPath(); g.moveTo(0, 0); g.lineTo(170, 0); g.lineTo(0, 170); g.closePath(); g.fill(); g.restore(); }
        }
      } break;
      case 'end': if (under) break; {
        const sp = pr(t, p.t, p.t + 0.25);
        g.save(); g.translate(1520, 860); g.rotate(-0.12); g.scale(lerp(2, 1, Ease.outExpo(sp)), lerp(2, 1, Ease.outExpo(sp)));
        g.strokeStyle = P.red; g.lineWidth = 6; g.strokeRect(-190, -62, 380, 124);
        glyph('THE END', 0, 4, 82, 'num', P.red, 1);
        g.restore();
      } break;
      case 'clap': if (under) break; {
        const cl = pr(t, p.t - 0.25, p.t);
        const ang = -0.55 * (1 - Ease.inCubic(cl));
        g.save(); g.translate(1460, 830); g.rotate(-0.08);
        g.fillStyle = P.black; g.fillRect(-200, -60, 400, 230);
        g.strokeStyle = P.silver; g.lineWidth = 3; g.strokeRect(-190, -50, 380, 210);
        setFont(30, 400, 2, 'num'); g.fillStyle = P.silver; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(`SCENE ${plan.shot}`, -170, 10); g.fillText('TAKE 1', -170, 60); g.fillText('필름을 되감는다', -170, 115);
        g.save(); g.translate(-200, -60); g.rotate(ang);
        g.fillStyle = P.black; g.fillRect(0, -62, 400, 58);
        g.fillStyle = P.silver; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(20 + k * 80, -62); g.lineTo(60 + k * 80, -62); g.lineTo(30 + k * 80, -4); g.lineTo(-10 + k * 80, -4); g.closePath(); g.fill(); }
        g.restore(); g.restore();
      } break;
      case 'door': if (under) break; {
        // a doorway of light closing (떠난 / 사라진)
        const q = pr(t, p.t, p.z);
        const w = 260 * (1 - Ease.inOutCubic(q) * 0.85);
        g.fillStyle = dark ? 'rgba(247,245,240,0.16)' : 'rgba(10,10,9,0.14)';
        g.fillRect(CX + 500 - w / 2, 220, w, 640);
        g.strokeStyle = ink; g.lineWidth = 4; g.strokeRect(CX + 370, 220, 260, 640);
      } break;
    }
    g.restore();
  }
}
function propIris(t) {
  const p = propsAt(t).find((x) => x.kind === 'iris');
  if (!p) return;
  const q = Ease.inOutCubic(pr(t, LE(p.i) - 0.2, p.z));
  if (q <= 0) return;
  const r = lerp(1300, 0, q);
  g.save(); g.fillStyle = P.black; g.beginPath(); g.rect(-10, -10, W + 20, H + 20); g.arc(CX, CY, Math.max(0, r), 0, TAU, true); g.fill(); g.restore();
}

/* ---------------- frame chrome: letterbox, timecode, leader ---------------- */
function tc(ft) {
  const fr = Math.floor(ft * 24);
  const f = fr % 24, s = Math.floor(fr / 24) % 60, m = Math.floor(fr / 1440) % 60;
  return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}
function letterbox(t, amt, label) {
  if (amt <= 0) return;
  const h = 132 * amt;
  g.fillStyle = P.black; g.fillRect(-10, -10, W + 20, h + 10); g.fillRect(-10, H - h, W + 20, h + 10);
  if (amt < 0.95) return;
  setFont(22, 400, 3, 'num'); g.textBaseline = 'middle';
  g.fillStyle = P.smoke; g.textAlign = 'left';
  g.fillText(label, 70, H - 66);
  g.textAlign = 'right';
  const rw = rewindAmt(t);
  g.fillStyle = rw > 0.1 ? P.red : P.smoke;
  g.fillText((rw > 0.1 ? '◀◀ ' : '') + tc(filmTime(t)), W - 70, H - 66);
  g.fillStyle = P.smoke; g.textAlign = 'right'; g.fillText('IONTIGER', W - 70, 66);
  setFont(26, 800, 2, 'serif'); g.textAlign = 'left'; g.fillText('필름을 되감는다', 70, 66);
}
function leader(t) {
  // academy-style countdown: 5 4 3 2 on every second beat, then the title
  const tTitle = 5.3;
  if (t < tTitle) {
    fillAll(P.fog);
    g.fillStyle = radial(CX, CY, 100, 1100, 'rgba(236,232,223,1)', 'rgba(92,91,87,1)'); g.fillRect(0, 0, W, H);
    const step = 2 * SPB, k = Math.max(0, Math.floor((t - BEAT0) / step)), f = fract(Math.max(0, t - BEAT0) / step);
    const num = Math.max(2, 5 - k);
    // sweep wedge
    g.fillStyle = 'rgba(42,42,40,0.35)';
    g.beginPath(); g.moveTo(CX, CY); g.arc(CX, CY, 900, -Math.PI / 2, -Math.PI / 2 + f * TAU); g.closePath(); g.fill();
    g.strokeStyle = P.black; g.lineWidth = 6;
    line(0, CY, W, CY); line(CX, 0, CX, H);
    g.lineWidth = 8; g.beginPath(); g.arc(CX, CY, 330, 0, TAU); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(CX, CY, 390, 0, TAU); g.stroke();
    glyph(String(num), CX, CY + 20, 470, 'num', P.black, 1);
    setFont(26, 400, 4, 'num'); g.fillStyle = P.ash; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('PICTURE START', 80, 80); g.textAlign = 'right'; g.fillText('REEL 1 · iontiger', W - 80, 80);
    // a flash frame on each number
    return f < 0.06 ? 0.35 : 0;
  }
  // title card
  const p = pr(t, tTitle, tTitle + 1.2);
  fillAll(P.black);
  g.fillStyle = radial(CX, CY, 0, 900, 'rgba(216,213,205,0.18)', 'rgba(0,0,0,0)'); g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.09; reel(CX, CY, 380, -t * 0.6, P.silver, P.white); g.globalAlpha = 1;
  const a = Ease.outCubic(p) * (1 - pr(t, T_INTRO_END - 0.3, T_INTRO_END));
  chars('필름을 되감는다', CX, CY - 10, { size: 170, f: 'serif', color: P.paper, alpha: a }, (c, n) => {
    const q = Ease.outCubic(pr(t, tTitle + c * 0.08, tTitle + c * 0.08 + 0.6));
    return { a: q, x: (1 - q) * 60 };
  });
  glyph('iontiger · made with Suno', CX, CY + 150, 34, 'serifR', P.grey, a * Ease.outCubic(pr(t, tTitle + 0.8, tTitle + 1.6)), 400);
  g.fillStyle = P.red; g.globalAlpha = a; g.fillRect(CX - 60, CY + 100, 120, 4); g.globalAlpha = 1;
  return 0;
}
function endCard(t) {
  const p = pr(t, T_END, T_END + 1.2);
  fillAll(P.black);
  // run-out: the tail of the film flaps past
  const ro = 1 - pr(t, T_END, T_END + 0.9);
  if (ro > 0) { g.globalAlpha = ro; filmStrip(540, 300, t * 2400, 420, { strip: '#1C1C1B', hole: P.silver, line: P.black }); g.globalAlpha = 1; }
  const a = Ease.outCubic(pr(t, T_END + 0.7, T_END + 1.8)) * (1 - pr(t, DUR - 0.8, DUR));
  g.globalAlpha = a * 0.08; reel(CX, CY - 60, 330, -t * 0.4, P.silver, P.white); g.globalAlpha = 1;
  glyph('끝', CX, CY - 60, 220, 'serif', P.paper, a);
  glyph('필름을 되감는다', CX, CY + 340, 44, 'serif', P.fog, a);
  glyph('노래 iontiger · made with Suno', CX, CY + 400, 28, 'serifR', P.grey, a, 400);
  g.fillStyle = P.red; g.globalAlpha = a; g.fillRect(CX - 40, CY + 296, 80, 4); g.globalAlpha = 1;
  void p;
}

/* ---------------- camera + post ---------------- */
function camera(t, s) {
  if (s.kind !== 'verse') return [0, 0, 1];
  const k = kickEnv(t, 14);
  const i = lineAt(t);
  const slam = i >= 0 && PLAN[i].style === 'slam' ? LYRICS[i].words.reduce((a, w) => a + Math.exp(-Math.max(0, t - w.t) * 18) * (t >= w.t ? 1 : 0), 0) : 0;
  const amp = 4 * k + 14 * Math.min(1, slam);
  return [vnoise(t * 40, 1) * amp, vnoise(t * 40, 2) * amp, 1 + 0.012 * k];
}
function postParams(t, s) {
  const e = energyAt(t);
  const rw = rewindAmt(t);
  // flash on each new shot (hard cut) in the verses
  let flash = 0;
  if (s.kind === 'verse') {
    const i = lineAt(t);
    if (i >= 0 && !isHook(i)) flash = 0.22 * Math.exp(-(t - PLAN[i].tIn) * 22);
  }
  const sstart = s.t, se = Math.exp(-(t - sstart) * 6);
  if (s.kind === 'hook' || s.kind === 'outro') flash = Math.max(flash, 0.6 * se);
  return {
    flash,
    grain: s.kind === 'hook' ? 0.07 : 0.1,
    vig: s.kind === 'hook' ? 0.6 : 1.0,
    flicker: 0.035 + 0.03 * e,
    scratch: s.kind === 'intro' || s.kind === 'end' ? 1 : s.kind === 'hook' ? 0.35 : 0.7,
    rewind: rw,
    weave: s.kind === 'intro' ? 1.6 : 1,
  };
}

/* ---------------- frame ---------------- */
function drawFrame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const s = sectAt(t);
  let extraFlash = 0;
  if (s.kind === 'intro') extraFlash = leader(t);
  else if (s.kind === 'end') endCard(t);
  else {
    const i = lineAt(t);
    const plan = i >= 0 ? PLAN[i] : null;
    const [cx, cy, cz] = camera(t, s);
    g.save();
    g.translate(CX + cx, CY + cy); g.scale(cz, cz); g.translate(-CX, -CY);
    if (s.kind === 'verse' && plan) {
      const black = propsAt(t).some((p) => p.kind === 'black');
      if (plan.style !== 'intertitle') {
        if (black) fillAll(P.black); else shotBg(t, i, plan);
      }
      drawProps(t, true);
      getLayout(i);
      RENDER[plan.style](i, getLayout(i), plan, t);
      drawProps(t, false);
      propIris(t);
    } else if (s.kind === 'hook' && plan) {
      if (isChorus(i)) chorusBg(t, i); else hookBg(t, plan.el || HOOK_EL(i), i);
      RENDER[plan.style](i, getLayout(i), plan, t);
      // the last chorus line burns the film at its end
      const h = HOOKS.find((x) => x.z === i);
      if (h) burn(t, LE(i) - 0.1, CX + 260, CY - 120, i);
    } else if (s.kind === 'outro' && plan) {
      RENDER.outro(i, getLayout(i), plan, t);
    } else fillAll(P.black);
    g.restore();
    // letterbox for the verses (bars slide in at each verse start, out before the hook)
    if (s.kind === 'verse') {
      const amt = Ease.outCubic(pr(t, s.t, s.t + 0.5)) * (1 - Ease.inCubic(pr(t, sectEnd(s) - 0.4, sectEnd(s))));
      const sh = plan && !isHook(i) ? plan.shot : 0;
      letterbox(t, amt, `${s.name} · SCENE ${String(sh).padStart(2, '0')}`);
    }
  }
  const pp = postParams(t, s);
  pp.flash = Math.max(pp.flash, extraFlash);
  return pp;
}
