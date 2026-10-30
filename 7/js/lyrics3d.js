/* ============================================================
   LYRICS 3D — every syllable is an extruded letter that enters
   on the exact moment it is sung
   ============================================================ */
import * as THREE from 'three';
import { glyphMesh, glyphGeo, STYLE } from './glyphs.js';
import { clamp, lerp, pr, rnd, Ease, beatPulse, TAU } from './util.js';

const ROW_H = 1.2, TRACK = 0.95, WORD_GAP = 0.36;
const SKIP = new Set([',', '.', '?', '!']);

/* special word colours */
const ACCENT = {
  'AI': 'chrome', 'AI가': 'chrome', '2027년을': 'gold', '2026년': 'gold', '11월': 'gold', '22일,': 'gold', '일요일': 'lemon',
  '09시': 'gold', '30분부터': 'gold', '17시': 'gold', '30분': 'gold', '1층': 'gold', '네': 'gold', '두': 'gold', '여섯': 'lemon',
  '에이전트,': 'chrome', '2027년을 ': 'gold', '초대합니다': 'gold', '성공': 'white', '다를까': 'white',
};
const DIGIT_ONLY = new Set(['2027년을', '2026년', '11월', '22일,', '09시', '30분부터', '17시', '30분', '1층']);
const isDigit = (c) => c >= '0' && c <= '9';
const isLatin = (c) => /[A-Za-z]/.test(c);

/** split words over one or two rows, as balanced as possible */
function rowsOf(words, font) {
  const wW = words.map((w) => [...w].filter((c) => !SKIP.has(c)).reduce((s, c) => s + font.advance(c) * TRACK, 0));
  const total = wW.reduce((a, b) => a + b, 0) + WORD_GAP * (words.length - 1);
  const n = words.reduce((s, w) => s + [...w].filter((c) => !SKIP.has(c)).length, 0);
  if (n <= 8 || words.length < 2) return [words.map((_, i) => i)];
  let best = 1, bd = 1e9, acc = 0;
  for (let k = 1; k < words.length; k++) {
    acc += wW[k - 1] + (k > 1 ? WORD_GAP : 0);
    const d = Math.abs(acc - (total - acc - WORD_GAP));
    if (d < bd) { bd = d; best = k; }
  }
  return [words.slice(0, best).map((_, i) => i), words.slice(best).map((_, i) => i + best)];
}

/**
 * builds one lyric line as a group of glyph meshes laid out on 1–2 rows
 * plan: { style, enter, rows? }
 */
export function buildLine(idx, font, env, plan) {
  const [sec, text, words] = LYRICS[idx];
  const group = new THREE.Group();
  const wordsTxt = words.map((w) => w[0]);
  const rows = plan.rows || rowsOf(wordsTxt, font);
  const glyphs = [];
  let maxW = 0;
  const nRows = rows.length;
  rows.forEach((row, r) => {
    // measure
    let w = 0;
    row.forEach((wi, k) => { for (const c of words[wi][0]) if (!SKIP.has(c)) w += font.advance(c) * TRACK; if (k) w += WORD_GAP; });
    maxW = Math.max(maxW, w);
    let x = -w / 2;
    const y = (nRows - 1 - r) * ROW_H;
    row.forEach((wi, k) => {
      if (k) x += WORD_GAP;
      const [wt, , , ct] = words[wi];
      [...wt].forEach((c, ci) => {
        if (SKIP.has(c)) return;
        const adv = font.advance(c) * TRACK;
        let style = plan.style;
        const acc = ACCENT[wt];
        if (acc && (!DIGIT_ONLY.has(wt) || isDigit(c))) style = acc;
        if (isLatin(c) && wt.startsWith('AI')) style = 'chrome';
        const mesh = glyphMesh(font, c, style, env);
        mesh.position.set(x + adv / 2, y, 0);
        group.add(mesh);
        glyphs.push({ mesh, ch: c, t: ct[ci], word: wt, wi, hx: x + adv / 2, hy: y, style, seed: rnd(idx * 31 + glyphs.length, 7.7), enter: plan.enterFor ? plan.enterFor(wt, c) : plan.enter });
        x += adv;
      });
    });
  });
  const L = { idx, sec, text, group, glyphs, width: maxW, height: nRows * ROW_H, rows: nRows, t0: words[0][1], t1: words[words.length - 1][2], plan };
  // the box the camera frames; props may grow it
  L.frame = { w: maxW, h: nRows * ROW_H, cx: 0, cy: (nRows * ROW_H) / 2 - 0.15 };
  // the "7" of 2027 rolls through digits before it lands
  for (const g of glyphs) if (g.ch === '7' && g.word.startsWith('2027')) g.roll = ['3', '4', '5', '6', '7'].map((d) => glyphGeo(font, d));
  group.visible = false;
  return L;
}

/* how much a letter may glow when it is sung: light colours bloom easily */
const GLOW = { candy: 0.7, lilac: 0.6, kblue: 0.6, kpink: 0.6, kteal: 0.5, kgold: 0.4, cyan: 0.32, mint: 0.3, lemon: 0.28, white: 0.16, ice: 0.18, gold: 0.5, chrome: 0.24 };
const ENTER_LEAD = { drop: 0.1, flip: 0.05, pop: 0.03, zoom: 0.12, spin: 0.06, slot: 0.05, rise: 0.06 };
const ENTER_DUR = { drop: 0.42, flip: 0.32, pop: 0.5, zoom: 0.34, spin: 0.42, slot: 0.4, rise: 0.36 };

/** poses every glyph of a line for time t; exitT = when the letters blow away */
export function updateLine(L, t, exitT = Infinity, dim = 0) {
  const kick = beatPulse(t, 8);
  for (const g of L.glyphs) {
    const m = g.mesh, e = g.enter, lead = ENTER_LEAD[e], dur = ENTER_DUR[e];
    if (g.hide) { m.visible = false; continue; }
    const p = (t - (g.t - lead)) / dur;
    if (p <= 0) { m.visible = false; continue; }
    m.visible = true;
    const q = clamp(p);
    let x = g.hx, y = g.hy, z = 0, rx = 0, ry = 0, rz = 0, s = 1;
    switch (e) {
      case 'drop': y += (1 - Ease.outBounce(q)) * 3.2; rz = (1 - q) * (g.seed - 0.5) * 0.8; break;
      case 'flip': rx = (1 - Ease.outBack(q, 2.2)) * -Math.PI / 2; break;
      case 'pop': s = Ease.outElastic(q); ry = (1 - Ease.outCubic(q)) * Math.PI; break;
      case 'zoom': z = (1 - Ease.outExpo(q)) * 7; s = 1 + (1 - Ease.outExpo(q)) * 0.6; break;
      case 'spin': ry = (1 - Ease.outCubic(q)) * -TAU; y += (1 - Ease.outBack(q, 2)) * -0.6; break;
      case 'slot': rx = (1 - Ease.outCubic(q)) * TAU * 1.5; s = 0.6 + 0.4 * Ease.outBack(q, 2.5); break;
      case 'rise': y += (1 - Ease.outBack(q, 1.8)) * -1.4; s = Ease.outBack(Math.min(1, q * 1.4), 2); break;
    }
    if (g.roll) {
      const k = p < 0.85 ? Math.min(g.roll.length - 2, Math.floor(p * 6)) : g.roll.length - 1;
      m.geometry = g.roll[k];
    }
    // after landing: bob on the beat
    if (q >= 1) y += 0.05 * kick * (0.5 + g.seed);
    // exit: blow outward with spin
    if (t > exitT) {
      const u = clamp((t - exitT - g.seed * 0.12) / 0.7);
      const a = g.seed * TAU * 3.1, f = Ease.inQuad(u);
      x += Math.cos(a) * f * 7; y += Math.sin(a) * f * 5 + f * 2; z += (rnd(g.seed, 3) - 0.3) * f * 9;
      rx += f * 6 * (g.seed - 0.5); ry += f * 5; s *= 1 - Ease.inCubic(u);
      if (u >= 1) { m.visible = false; continue; }
    }
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.setScalar(Math.max(0.001, s));
    // flash on the sung moment, then settle; earlier lines dim a little
    const since = t - g.t;
    const flash = since >= 0 ? Math.exp(-since * 5) : 0;
    const glow = GLOW[g.style] ?? 0.5;
    m.userData.face.emissiveIntensity = glow * (0.1 + 0.9 * flash + 0.15 * kick * (1 - dim));
  }
}
