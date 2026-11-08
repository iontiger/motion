'use strict';
/* ============================================================
   TYPE — the English lyrics, big and centred, one syllable at a time.
   Every line has a PLAN entry: a style (layout + how letters arrive),
   row breaks, fonts, and an exit. Words with a meaning of their own
   ("page", "spark", "door", "run" …) get their own trick wherever
   they turn up (FX below).
   Styles gather the moves of motion/1–10:
     edit    mixed editorial: Anton capitals + Fraunces italic small words, mask reveal
     type    typewriter + newspaper headline (5)
     stack   justified poster rows that slam in (1, 5)
     stairs  words land on rising steps, a ball hops along (karaoke ball)
     neon    tube letters flicker on, glow on the beat (4, 7)
     resize  the sung word swells, the rest shrink (5)
     zoom    one giant word at a time flying at the camera (5)
     clothes name tags pegged on a swinging line (5)
     film    sepia grain, letters flicker and fade (8)
     extrude chunky 3D letters swinging on the beat (7)
     comic   halftone burst + outlined pop letters (9)
     hand    Caveat handwriting wiped on with a pen (10)
     path    letters ride a road that bends out of view
     flip    every letter flips in like a page
     wide    the sky opens: letters spread to the edges
     far     the line falls away into the distance
   ============================================================ */
const STOP = new Set(['a', 'the', 'at', 'for', 'in', 'to', 'by', 'and', 'of', 'your', 'you', 'on', 'then', 'when', 'that', 'was', 'how']);
const FX = {
  monday: 'monday', shoes: 'shoes', news: 'news', doubt: 'doubt', door: 'door', breath: 'breath', more: 'more',
  lighter: 'lighter', run: 'run', page: 'page', day: 'day', room: 'room', spark: 'spark', through: 'through',
  'brand-new': 'new', question: 'question', faded: 'faded', right: 'right', nerve: 'nerve', line: 'line',
  note: 'note', key: 'key', true: 'true', courage: 'courage', come: 'come', far: 'far',
};
const P = (st, o = {}) => Object.assign({ st }, o);
const PLAN = [
  // Verse 1 — cream paper, Monday morning
  P('edit', { br: [1, 4], big: { 0: 1.55 }, ent: 'mask', ex: 'up' }),
  P('type', { br: [5], fw: { 0: 'fra', 1: 'fra', 2: 'fra', 3: 'fra', 4: 'fra' }, ent: 'type', ex: 'up' }),
  P('edit', { br: [3], ent: 'mask', ex: 'up' }),
  P('edit', { br: [4], big: { 7: 1.5 }, ent: 'mask', ex: 'zoom' }),
  // Pre-chorus 1 — sunrise
  P('stairs', { ex: 'drop' }),
  P('stack', { br: [2, 4, 6], ent: 'slam', ex: 'zoom', tw: 1180 }),
  // Chorus 1 — violet neon
  P('neon', { f: 'bag', br: [3], mon: [5], ent: 'neon', ex: 'flip' }),
  P('resize', { ex: 'up' }),
  P('zoom', { ex: 'zoom' }),
  P('neon', { f: 'bag', br: [3, 5], mon: [7], ent: 'pop', ex: 'scatter' }),
  // Verse 2 — mint paper
  P('clothes', { ex: 'drop' }),
  P('edit', { br: [4], ent: 'mask', ex: 'up' }),
  P('film', { br: [4], ent: 'blur', ex: 'blur' }),
  P('edit', { br: [4], ent: 'slam', ex: 'scatter' }),
  // Pre-chorus 2 — pink sunrise
  P('stairs', { ex: 'drop', ext: true }),
  P('stack', { br: [2, 4, 6], ent: 'slam', ex: 'zoom', tw: 1180, rgb: true }),
  // Chorus 2 — blue, 3D
  P('extrude', { f: 'bag', br: [3], ent: 'drop', ex: 'flip' }),
  P('stack', { br: [2, 5], ent: 'slam', ex: 'up', tw: 1100 }),
  P('neon', { f: 'bag', br: [3], ent: 'neon', ex: 'scatter' }),
  P('comic', { f: 'bag', br: [3, 5], ent: 'pop', ex: 'zoom' }),
  // Bridge — notebook, handwriting
  P('hand', { br: [3], ent: 'wipe', ex: 'up' }),
  P('hand', { br: [3], ent: 'wipe', ex: 'up' }),
  P('path', { ex: 'fade' }),
  P('hand', { br: [4], fw: { 6: 'ant' }, ent: 'wipe', ex: 'zoom', endAt: 131.0 }),
  // Final chorus — gold sky, everything at once
  P('flip', { f: 'ant', br: [3], mon: [5], ent: 'flip', ex: 'flip' }),
  P('resize', { ex: 'up', ext: true }),
  P('zoom', { ex: 'zoom', confetti: true }),
  P('neon', { f: 'bag', br: [3, 5], mon: [7], ent: 'neon', ex: 'up' }),
  P('wide', { ex: 'fade', hold: 0.5 }),
  P('stack', { br: [3, 4], ent: 'slam', ex: 'zoom', tw: 1240, ext: true }),
  // Outro — morning white
  P('stairs', { ex: 'up', soft: true }),
  P('far', { ex: 'fade' }),
];

/* ---------------- lines: timing ---------------- */
const LN = LYRICS.map(([sec, text, ko, ws], i) => {
  const words = ws.map(([w, a, z, syl]) => ({ w, a, z, syl }));
  return { i, sec, text, ko, words, a: words[0].a, z: words[words.length - 1].z };
});
LN.forEach((l, i) => {
  const nx = LN[i + 1];
  const pl = PLAN[i];
  l.end = nx ? Math.min(nx.a - 0.04 + (pl.hold || 0), l.z + 0.6 + (pl.hold || 0)) : l.z + 0.9;   // line gone by here
  l.end = Math.max(l.end, l.words[l.words.length - 1].a + 0.5);
  if (pl.endAt) l.end = pl.endAt;
  l.exd = Math.min(0.3, Math.max(0.16, (nx ? nx.a : l.end + 1) - l.z));
  l.plan = PLAN[i];
  l.subEnd = nx ? Math.min(nx.a - 0.12, l.z + 1.4) : l.z + 1.6;   // Korean subtitle
});
let LAYOUTS = new Map();

/* ---------------- tokens & layout ---------------- */
const LH = { ant: 0.96, bag: 1.0, fra: 1.12, cav: 1.0, mon: 1.08 };
const CAPS = { ant: true, bag: true, mon: true };
function normWord(s) { return s.toLowerCase().replace(/[’']/g, '’').replace(/[^a-z’-]/g, ''); }

function tokens(l, pl, base) {
  return l.words.map((wd, wi) => {
    const norm = normWord(wd.w);
    const stop = pl.st === 'edit' || pl.st === 'film' ? STOP.has(norm) : false;
    let f = (pl.fw && pl.fw[wi]) || (stop ? 'fra' : pl.f || 'ant');
    if (pl.mon && pl.mon.includes(wi)) f = 'mon';
    if (pl.st === 'hand' && !(pl.fw && pl.fw[wi])) f = 'cav';
    const caps = CAPS[f];
    const txt = caps ? wd.w.toUpperCase() : (stop ? wd.w.toLowerCase() : wd.w);
    let rel = stop ? 0.5 : f === 'mon' ? 0.86 : f === 'fra' ? 0.8 : f === 'cav' ? 1.1 : 1;
    if (pl.st === 'type' && f === 'fra') rel = 0.62;
    if (pl.big && pl.big[wi]) rel *= pl.big[wi];
    const wt = f === 'fra' ? (stop ? 500 : 800) : f === 'cav' ? 700 : 400;
    // syllable → per-char times (small stagger inside a syllable)
    const ct = []; let k = 0;
    wd.syl.forEach(([s, st], si) => { for (let j = 0; j < s.length; j++) { ct[k] = st + j * 0.022; k++; } });
    while (ct.length < txt.length) ct.push(ct[ct.length - 1] || wd.a);
    return { wi, word: wd.w, norm, txt, f, rel, stop, wt, a: wd.a, z: wd.z, syl: wd.syl, ct, fx: (norm === 'more' && l.i !== 3 ? null : FX[norm]) || null, size: base * rel };
  });
}
function measureTok(tk, size) {
  tk.size = size;
  setFont(size, tk.wt, tk.f === 'ant' ? size * 0.01 : 0, tk.f);
  const L = layout(tk.txt);
  tk.xs = L.xs; tk.ws = L.ws; tk.w = L.w;
  return tk;
}
// rows from breaks (or auto wrap), then scale to fit the box; returns tokens with x, y (baseline), size
function flowLayout(l, pl, toks, o) {
  const base = o.base, maxW = o.maxW || 1640, maxH = o.maxH || 600, cy = o.cy || 470;
  toks.forEach((tk) => measureTok(tk, base * tk.rel));
  const rows = []; let cur = [];
  toks.forEach((tk, i) => { if (i && pl.br && pl.br.includes(i)) { rows.push(cur); cur = []; } cur.push(tk); });
  rows.push(cur);
  const gapOf = (a, b) => Math.max(a.size, b.size) * (a.f === 'mon' || b.f === 'mon' ? 0.2 : 0.24);
  const rowW = (r) => r.reduce((s, tk, i) => s + tk.w + (i ? gapOf(r[i - 1], tk) : 0), 0);
  // stack: every row scaled to the same width
  if (o.justify) {
    rows.forEach((r) => { const s = Math.min(o.justify / rowW(r), o.maxRowScale || 2.6); r.forEach((tk) => measureTok(tk, tk.size * s)); });
  }
  const rowH = (r) => Math.max(...r.map((tk) => tk.size * (LH[tk.f] || 1))) + (o.rowGap || 0);
  let H_ = rows.reduce((s, r) => s + rowH(r), 0), Wm = Math.max(...rows.map(rowW));
  const sc = Math.min(1, maxW / Wm, maxH / H_);
  if (sc < 1) { toks.forEach((tk) => measureTok(tk, tk.size * sc)); H_ = rows.reduce((s, r) => s + rowH(r), 0); }
  let y = cy - H_ / 2;
  const out = [];
  rows.forEach((r, ri) => {
    const h = rowH(r), w = rowW(r);
    let x = CX - w / 2;
    const base = y + h * 0.8;
    r.forEach((tk, i) => { if (i) x += gapOf(r[i - 1], tk); tk.x = x; tk.y = base; tk.row = ri; x += tk.w; out.push(tk); });
    y += h;
  });
  return { toks: out, rows, top: cy - H_ / 2, bot: cy + H_ / 2, H: H_ };
}
function getLayout(li) {
  let L = LAYOUTS.get(li);
  if (L) return L;
  const l = LN[li], pl = l.plan;
  const base = { edit: 170, type: 170, stack: 170, neon: 168, extrude: 170, comic: 168, hand: 190, flip: 200, film: 160 }[pl.st] || 170;
  const toks = tokens(l, pl, base);
  if (pl.st === 'stack') L = flowLayout(l, pl, toks, { base, justify: pl.tw || 1180, maxH: 640, maxRowScale: 1.9 });
  else if (pl.st === 'type') L = flowLayout(l, pl, toks, { base, maxW: 1600, maxH: 600, rowGap: 70 });
  else if (['edit', 'neon', 'extrude', 'comic', 'hand', 'flip', 'film'].includes(pl.st)) L = flowLayout(l, pl, toks, { base, maxW: pl.st === 'comic' ? 1400 : 1600, maxH: 560 });
  else L = { toks };
  L.toks.forEach((tk) => { tk.cx = tk.x + tk.w / 2; tk.cy = tk.y - tk.size * (tk.f === 'cav' ? 0.28 : tk.f === 'fra' ? 0.3 : 0.36); });
  LAYOUTS.set(li, L);
  return L;
}

/* ---------------- drawing one glyph ---------------- */
// look: { col, ext:{n,dx,dy,col}, glow, blur, neon, outline:{w,col}, offset:{dx,dy,col}, rgb }
function glyph(ch, f, size, wt, look) {
  setFont(size, wt, 0, f);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  if (look.ext) { g.fillStyle = look.ext.col; for (let k = look.ext.n; k >= 1; k--) g.fillText(ch, k * look.ext.dx, k * look.ext.dy); }
  if (look.offset) { g.fillStyle = look.offset.col; g.fillText(ch, look.offset.dx, look.offset.dy); }
  if (look.rgb) {
    const ga = g.globalAlpha;
    g.globalAlpha = ga * 0.8; g.fillStyle = C.cyan; g.fillText(ch, -look.rgb, 0); g.fillStyle = C.pink; g.fillText(ch, look.rgb, 0);
    g.globalAlpha = ga;
  }
  if (look.outline) { g.lineJoin = 'round'; g.lineWidth = look.outline.w; g.strokeStyle = look.outline.col; g.strokeText(ch, 0, 0); }
  if (look.neon) {
    g.shadowColor = look.neon; g.shadowBlur = look.blur || 30;
    g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.035); g.strokeStyle = look.neon; g.strokeText(ch, 0, 0);
    g.fillStyle = look.col; g.fillText(ch, 0, 0);
    g.shadowBlur = 0;
    return;
  }
  if (look.glow) { g.shadowColor = look.glow; g.shadowBlur = look.blur || 26; }
  g.fillStyle = look.col; g.fillText(ch, 0, 0);
  if (look.glow) g.shadowBlur = 0;
}

// entrance transform for one char, d = seconds since the char's time
function enter(kind, d, k, tk) {
  const sz = tk.size;
  switch (kind) {
    case 'mask': { if (d < -0.02) return { a: 0 }; const e = Ease.outExpo(pr(d, -0.02, 0.38)); return { dy: (1 - e) * sz * 1.05, clip: true }; }
    case 'slam': { const p = pr(d, -0.03, 0.22); return { s: lerp(2.3, 1, Ease.outExpo(p)), a: Math.min(1, p * 5) }; }
    case 'pop': { const p = pr(d, -0.03, 0.3); return { s: Ease.outBack(p, 2.6), a: Math.min(1, p * 4) }; }
    case 'drop': { const p = pr(d, -0.04, 0.34); return { dy: -(1 - Ease.outBack(p, 1.9)) * sz * 1.2, a: Math.min(1, p * 4), r: (1 - p) * (k % 2 ? 0.25 : -0.25) }; }
    case 'flip': { const p = pr(d, -0.03, 0.36); const e = Ease.outBack(p, 1.5); return { sx: Math.max(0.001, Math.cos((1 - e) * Math.PI * 0.5)), shade: 1 - Math.min(1, e), a: Math.min(1, p * 5) }; }
    case 'neon': {
      if (d < -0.02) return { a: 0 };
      const on = d > 0.28 ? 1 : (rnd(Math.floor(d * 40), k + tk.wi * 7) > 0.45 ? 1 : 0.15);
      return { a: on, s: 1 + 0.12 * Math.exp(-Math.max(0, d) * 9) };
    }
    case 'wipe': { const p = pr(d, -0.02, 0.16); return { wipe: p }; }
    case 'blur': { const p = pr(d, -0.03, 0.4); const e = Ease.outCubic(p); return { smear: (1 - e) * sz * 0.5, a: e }; }
    case 'type': return { a: d >= -0.01 ? 1 : 0 };
    case 'rise': { const p = pr(d, -0.03, 0.35); const e = Ease.outCubic(p); return { dy: (1 - e) * sz * 0.4, a: e }; }
    default: { const p = pr(d, -0.03, 0.25); return { a: p }; }
  }
}

// exit transform for the whole line (q 0..1) on token tk / char k
function leave(kind, q, tk, k, n) {
  if (q <= 0) return null;
  const e = Ease.inCubic(q);
  switch (kind) {
    case 'up': return { dy: -110 * Ease.inOutCubic(q), a: 1 - e };
    case 'drop': { const d = pr(q, (k % 7) * 0.05, (k % 7) * 0.05 + 0.65); return { dy: 900 * d * d, r: (rnd(k, tk.wi) - 0.5) * 1.6 * d, a: 1 - pr(d, 0.6, 1) }; }
    case 'zoom': return { zoom: 1 + 1.8 * e, a: 1 - pr(q, 0.4, 1) };
    case 'flip': return { sx: Math.max(0.001, Math.cos(e * Math.PI * 0.5)), a: 1 - pr(q, 0.85, 1) };
    case 'scatter': { const ang = rnd(k + tk.wi * 13, 3) * TAU; return { dx: Math.cos(ang) * 700 * e, dy: Math.sin(ang) * 500 * e, r: (rnd(k, 9) - 0.5) * 3 * e, a: 1 - e }; }
    case 'blur': return { smear: 200 * e, a: 1 - e };
    default: return { a: 1 - q };
  }
}

/* ---------------- line rendering ---------------- */
function drawLyrics(t) {
  for (let i = 0; i < LN.length; i++) {
    const l = LN[i];
    if (t < l.a - 0.3 || t > l.end + 0.02) continue;
    const pal = paletteAt(l.a + 0.05);
    g.save();
    (RENDER[l.plan.st] || drawFlow)(l, getLayout(i), t, pal);
    g.restore();
  }
}
function exitQ(l, t) { return pr(t, l.end - l.exd, l.end); }
// the word being sung right now (for a lift + glow)
function liveOf(l, tk, t) {
  const nx = l.words[tk.wi + 1];
  const z = nx ? Math.min(nx.a, tk.z + 0.1) : tk.z;
  return t >= tk.a - 0.02 && t < z ? 1 : 0;
}

function drawFlow(l, L, t, pal) {
  const pl = l.plan, q = exitQ(l, t), n = L.toks.length;
  const sw = pl.st === 'extrude' ? Math.sin(beatAt(t) * Math.PI) * 0.06 : 0;
  // block-level beat bounce
  const bb = 1 + 0.018 * bEnv(t, 9);
  g.translate(CX, 470); g.scale(bb, bb); if (sw) g.transform(1, 0, sw, 1, 0, 0); g.translate(-CX, -470);
  if (pl.st === 'comic') comicBurst(l, L, t, pal, q);
  if (pl.st === 'type') headlineRules(l, L, t, pal, q);
  if (pl.st === 'film') filmFrame(l, L, t, pal);
  // behind-the-word decorations
  for (const tk of L.toks) if (tk.fx) fxBehind(l, tk, t, pal, q);
  for (const tk of L.toks) drawTok(l, pl, tk, t, pal, q, n);
  for (const tk of L.toks) if (tk.fx) fxFront(l, tk, t, pal, q);
  if (pl.st === 'type') caret(l, L, t, pal);
}

function lookFor(pl, tk, pal, live, t) {
  let col = tk.stop ? pal.sub : pal.ink;
  if (tk.fx && !tk.stop) col = pal.acc;
  if (pl.st === 'type' && tk.f === 'fra') col = pal.sub;
  const look = { col };
  switch (pl.st) {
    case 'neon': {
      const hue = [pal.acc, pal.acc2, pal.glow][(tk.wi + Math.floor(beatAt(t) / 4)) % 3];
      look.col = '#FFFFFF'; look.neon = hue; look.blur = 22 + 26 * bEnv(t, 7) + 20 * live;
      break;
    }
    case 'extrude': look.col = tk.wi < 3 ? pal.acc2 : '#FFFFFF'; look.ext = { n: 14, dx: 2.2, dy: 2.6, col: pal.deep }; look.outline = { w: 6, col: pal.deep }; break;
    case 'comic': look.col = tk.wi < 3 ? '#FFFFFF' : C.yellow; look.outline = { w: tk.size * 0.14, col: '#111' }; look.offset = { dx: tk.size * 0.05, dy: tk.size * 0.06, col: '#111' }; break;
    case 'flip': look.col = tk.f === 'mon' ? pal.acc : tk.wi < 3 ? '#FFFFFF' : pal.acc; look.glow = pal.glow; look.blur = 18 + 30 * live; break;
    case 'stack': {
      look.col = tk.row % 2 ? pal.acc2 : pal.ink;
      if (tk.fx === 'courage') look.col = pal.acc;
      if (pl.ext) look.ext = { n: 10, dx: 2, dy: 2.4, col: pal.deep };
      if (pl.rgb) look.rgb = 3 + 9 * bEnv(t, 10);
      if (pal.glow && !pl.ext) { look.glow = pal.glow; look.blur = 14 + 20 * live; }
      break;
    }
    case 'hand': look.col = tk.f === 'ant' ? pal.acc : pal.ink; break;
    case 'film': look.col = tk.stop ? pal.sub : pal.ink; break;
    case 'edit': if (pal.glow) { look.glow = pal.glow; look.blur = 16; } if (tk.fx === 'more') look.ext = { n: 12, dx: 2.4, dy: 2.4, col: pal.acc2 }; break;
  }
  if (pl.st === 'edit' || pl.st === 'type') { if (tk.fx === 'more' || tk.fx === 'monday') look.offset = { dx: 8, dy: 8, col: hexA(pal.acc2, 0.85) }; }
  return look;
}

function drawTok(l, pl, tk, t, pal, q, n) {
  const live = liveOf(l, tk, t);
  const look = lookFor(pl, tk, pal, live, t);
  const exK = pl.ex || 'up';
  const nch = tk.txt.length;
  // per-word overrides
  let ent = pl.ent || 'mask';
  if (tk.fx === 'page' && pl.st !== 'flip') ent = 'flip';
  if (tk.fx === 'more' || tk.fx === 'monday') ent = 'slam';
  // a word-level transform: lift while sung
  const lift = live ? 1 : Math.exp(-Math.max(0, t - tk.z) * 6) * (t >= tk.a ? 1 : 0);
  g.save();
  // the "door" swings open on its hinge
  if (tk.fx === 'door') {
    const p = pr(t, tk.a - 0.05, tk.a + 0.5);
    if (p <= 0) { g.restore(); return; }
    const sx = Ease.outBack(p, 1.6);
    g.translate(tk.x, tk.cy); g.transform(sx, -0.14 * (1 - p), 0, 1, 0, 0); g.translate(-tk.x, -tk.cy);
  }
  if (tk.fx === 'breath') { const s = 1 + 0.07 * Math.sin((t - tk.a) * 5) * (t > tk.a ? 1 : 0); g.translate(tk.cx, tk.cy); g.scale(s, s); g.translate(-tk.cx, -tk.cy); }
  if (live && pl.st !== 'hand' && pl.st !== 'type') { const s = 1 + 0.05 * lift; g.translate(tk.cx, tk.cy); g.scale(s, s); g.translate(-tk.cx, -tk.cy); }
  for (let k = 0; k < nch; k++) {
    const ch = tk.txt[k];
    if (ch === ' ') continue;
    const d = t - tk.ct[k];
    if (d < -0.05 && ent !== 'mask') continue;
    const e = enter(ent, d, k, tk);
    if (e.a === 0) continue;
    const ex = leave(exK, q, tk, k, nch);
    let x = tk.x + tk.xs[k], y = tk.y, a = e.a == null ? 1 : e.a, s = e.s || 1, sx = e.sx || 1, r = e.r || 0;
    if (e.dy) y += e.dy;
    // word fx on letters
    if (tk.fx === 'doubt' && d > 0) { x += vnoise(t * 22, k * 3) * 6; y += vnoise(t * 19, k * 5 + 1) * 6; a *= 0.7 + 0.3 * Math.abs(Math.sin(t * 7 + k)); }
    if (tk.fx === 'lighter' && d > 0) { y -= Math.min(1, d * 1.2) * (12 + 10 * Math.sin(k * 1.7 + t * 3)); }
    if (tk.fx === 'faded' && d > 0) { a *= lerp(1, 0.3, Ease.inOutSine(pr(d, 0.3, 1.4))); }
    if (tk.fx === 'nerve' && d > 0) { x += (rnd(Math.floor(t * 30), k) - 0.5) * 10 * Math.exp(-d * 2); }
    if (tk.fx === 'run') { const p = pr(d, -0.04, 0.22); x += (1 - Ease.outExpo(p)) * 600; a *= Math.min(1, p * 4); }
    if (tk.fx === 'courage' && d > 0) s *= 1 + 0.08 * bEnv(t, 8);
    if (ex) { if (ex.dx) x += ex.dx; if (ex.dy) y += ex.dy; if (ex.r) r += ex.r; a *= ex.a; if (ex.sx != null) sx *= ex.sx; }
    if (a <= 0.003) continue;
    const cw = tk.ws[k];
    g.save();
    if (ex && ex.zoom) { g.translate(CX, 470); g.scale(ex.zoom, ex.zoom); g.translate(-CX, -470); }
    if (ex && ex.sx != null && exK === 'flip') { g.translate(tk.cx, 0); g.scale(ex.sx, 1); g.translate(-tk.cx, 0); }
    if (e.clip) { g.beginPath(); g.rect(x - cw, tk.y - tk.size * 1.2, cw * 3, tk.size * (tk.f === 'fra' ? 1.45 : 1.24)); g.clip(); }
    if (e.wipe != null) { if (e.wipe <= 0) { g.restore(); continue; } g.beginPath(); g.rect(x - cw * 0.3, tk.y - tk.size * 1.2, cw * 1.6 * e.wipe, tk.size * 1.6); g.clip(); }
    g.globalAlpha *= a;
    g.translate(x + cw / 2, y - tk.size * 0.35);
    if (r) g.rotate(r);
    if (s !== 1 || sx !== 1) g.scale(s * sx, s);
    g.translate(-cw / 2, tk.size * 0.35);
    const smear = (e.smear || 0) + (ex && ex.smear ? ex.smear : 0);
    if (smear > 1) { const ga = g.globalAlpha; for (let m = 3; m >= 1; m--) { g.globalAlpha = ga * 0.22; g.save(); g.translate(-smear * m / 3, 0); glyph(ch, tk.f, tk.size, tk.wt, { col: look.col }); g.restore(); } g.globalAlpha = ga; }
    glyph(ch, tk.f, tk.size, tk.wt, look);
    if (e.shade > 0.02) { g.globalAlpha *= e.shade * 0.6; glyph(ch, tk.f, tk.size, tk.wt, { col: '#000' }); }
    g.restore();
  }
  // pen in the hand style
  if (pl.st === 'hand' && live) {
    let kk = 0; for (let k = 0; k < nch; k++) if (t >= tk.ct[k]) kk = k;
    const px = tk.x + tk.xs[kk] + tk.ws[kk] * Ease.outCubic(pr(t - tk.ct[kk], 0, 0.16)), py = tk.y - tk.size * 0.1;
    g.save(); g.translate(px, py); g.rotate(0.5); g.fillStyle = pal.ink; rr(-6, -70, 12, 64, 4); g.fill(); g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, -6); g.lineTo(0, 8); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
}

/* ---------------- word decorations ---------------- */
function fxBehind(l, tk, t, pal, q) {
  const d = t - tk.a, a = 1 - Ease.inCubic(q);
  if (d < -0.05 || a <= 0) return;
  g.save(); g.globalAlpha *= a;
  switch (tk.fx) {
    case 'day': { // sun rays behind
      const p = Ease.outBack(pr(d, 0, 0.45), 1.6);
      g.translate(tk.cx, tk.cy); g.rotate(t * 0.35);
      const R = tk.size * 1.5 * p * (1 + 0.08 * bEnv(t, 7));
      g.fillStyle = hexA(pal.acc2, 0.55);
      g.beginPath(); for (let i = 0; i < 16; i++) { const a0 = (i / 16) * TAU; g.moveTo(0, 0); g.arc(0, 0, R, a0, a0 + TAU / 40); } g.fill();
      circle(0, 0, tk.size * 0.55 * p, hexA(pal.acc2, 0.7));
      break;
    }
    case 'room': { // a frame grows around the word
      const p = Ease.outBack(pr(d, 0, 0.4), 1.4), pad = tk.size * 0.25;
      g.strokeStyle = pal.acc2; g.lineWidth = 7; g.setLineDash([22, 14]); g.lineDashOffset = -t * 60;
      const w = (tk.w + pad * 2) * p, h = (tk.size + pad) * p;
      rr(tk.cx - w / 2, tk.cy - h / 2, w, h, 18); g.stroke(); g.setLineDash([]);
      break;
    }
    case 'true': case 'monday': { // highlighter swipe
      const p = Ease.outCubic(pr(d, 0.05, 0.4));
      g.globalCompositeOperation = pal.dark ? 'source-over' : 'multiply';
      g.fillStyle = hexA(tk.fx === 'true' ? '#FFE45C' : pal.hl || '#FFE45C', pal.dark ? 0.35 : 0.85);
      const h = tk.size * 0.5, x0 = tk.x - 14;
      g.beginPath(); g.moveTo(x0, tk.cy - h * 0.2); g.lineTo(x0 + (tk.w + 28) * p, tk.cy - h * 0.28); g.lineTo(x0 + (tk.w + 28) * p, tk.cy + h * 0.7); g.lineTo(x0, tk.cy + h * 0.76); g.closePath(); g.fill();
      break;
    }
    case 'note': { // a sticky note behind "note"
      const p = Ease.outBack(pr(d, -0.05, 0.4), 2);
      g.translate(tk.cx, tk.cy); g.rotate(-0.06); g.scale(p, p);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-tk.w * 0.75 + 10, -tk.size * 0.7 + 12, tk.w * 1.5, tk.size * 1.4);
      g.fillStyle = '#FFE873'; g.fillRect(-tk.w * 0.75, -tk.size * 0.7, tk.w * 1.5, tk.size * 1.4);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-tk.w * 0.2, -tk.size * 0.8, tk.w * 0.4, tk.size * 0.2);
      break;
    }
    case 'run': { // speed lines
      const p = pr(d, -0.05, 0.6);
      g.strokeStyle = pal.ink; g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const yy = tk.cy + (i - 4) * tk.size * 0.11, len = 160 + rnd(i, 4) * 260, x1 = tk.x - 30 - rnd(i, 5) * 40;
        g.globalAlpha = a * (1 - p) * 0.8; g.lineWidth = 4 + rnd(i, 6) * 6;
        line(x1 - len * (0.3 + p), yy, x1 - len * p * 0.2, yy);
      }
      g.lineCap = 'butt';
      break;
    }
  }
  g.restore();
}
function fxFront(l, tk, t, pal, q) {
  const d = t - tk.a, a = 1 - Ease.inCubic(q);
  if (d < -0.05 || a <= 0) return;
  g.save(); g.globalAlpha *= a;
  switch (tk.fx) {
    case 'spark': sparks(tk.cx, tk.cy, d, tk.size, pal, l.i); break;
    case 'question': { // a big question mark pops beside
      const p = Ease.outBack(pr(d, 0.15, 0.5), 2.4);
      if (p > 0) { g.translate(tk.x + tk.w + tk.size * 0.3, tk.cy - tk.size * 0.15); g.rotate(0.18 + 0.08 * Math.sin(t * 4)); g.scale(p, p); text('?', 0, 0, { size: tk.size * 1.3, f: 'bag', color: pal.acc2 }); }
      break;
    }
    case 'right': { // "ALL RIGHT" stamp
      const p = pr(d, 0.25, 0.42);
      if (p > 0) {
        const s = lerp(2.2, 1, Ease.outExpo(p));
        g.translate(tk.cx - tk.w * 0.35, tk.cy); g.rotate(-0.09); g.scale(s, s); g.globalAlpha *= Math.min(1, p * 3);
        const w = tk.w * 2.9, h = tk.size * 1.45;
        g.strokeStyle = pal.acc; g.lineWidth = 12; rr(-w / 2, -h / 2, w, h, 20); g.stroke();
        g.lineWidth = 4; rr(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 12); g.stroke();
      }
      break;
    }
    case 'line': { // strike through the line, then a fresh one drawn under it
      const p1 = Ease.inOutCubic(pr(d, 0.1, 0.45)), p2 = Ease.outCubic(pr(d, 0.5, 0.9));
      g.strokeStyle = pal.acc; g.lineWidth = tk.size * 0.09; g.lineCap = 'round';
      if (p1 > 0) line(tk.x - 16, tk.cy + 6, tk.x - 16 + (tk.w + 32) * p1, tk.cy - 10);
      if (p2 > 0) { g.strokeStyle = pal.acc2; g.lineWidth = tk.size * 0.07; penLine(tk.x - 40, tk.x + tk.w + 60, tk.y + tk.size * 0.22, tk.size * 0.07, pal.acc2, p2, 7); }
      g.lineCap = 'butt';
      break;
    }
    case 'through': { // an arrow that shoots through and off to the right
      const p = Ease.inOutCubic(pr(d, 0.1, 0.8));
      if (p > 0) {
        const x0 = tk.x - 40, x1 = lerp(x0, W + 200, p), yy = tk.y + tk.size * 0.16;
        g.strokeStyle = pal.acc2; g.lineWidth = 10; g.lineCap = 'round'; line(Math.max(x0, x1 - 700), yy, x1, yy);
        g.fillStyle = pal.acc2; g.beginPath(); g.moveTo(x1 + 30, yy); g.lineTo(x1 - 14, yy - 24); g.lineTo(x1 - 14, yy + 24); g.closePath(); g.fill();
        g.lineCap = 'butt';
      }
      break;
    }
    case 'new': { // a starry NEW sticker
      const p = Ease.outBack(pr(d, 0.35, 0.65), 2.6);
      if (p > 0) {
        g.translate(tk.x + tk.w - 10, tk.y - tk.size * 0.95); g.rotate(0.2 + t * 0.3); g.scale(p, p);
        g.fillStyle = pal.acc2; g.beginPath();
        for (let i = 0; i < 24; i++) { const an = (i / 24) * TAU, r = i % 2 ? 46 : 62; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
        g.closePath(); g.fill(); g.rotate(-0.2 - t * 0.3);
        text('NEW', 0, 2, { size: 34, f: 'ant', color: pal.deep || '#111' });
      }
      break;
    }
    case 'shoes': { // footprints walk in under the line
      for (let i = 0; i < 6; i++) {
        const ts = tk.a + i * SPB * 0.5, p = pr(t, ts, ts + 0.12);
        if (p <= 0) continue;
        const fx = CX - 520 + i * 200, fy = tk.y + tk.size * 0.55 + (i % 2 ? 26 : -6);
        g.save(); g.translate(fx, fy); g.rotate(-0.25 + (i % 2) * 0.1); g.globalAlpha *= p * 0.55;
        g.fillStyle = pal.ink; g.beginPath(); g.ellipse(0, 0, 30, 15, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(46, 0, 14, 12, 0, 0, TAU); g.fill();
        g.restore();
      }
      break;
    }
    case 'key': { // a key doodle drawn by pen
      const p = pr(d, 0.1, 0.9);
      if (p > 0) {
        g.translate(tk.x + tk.w + 110, tk.cy); g.rotate(-0.3 + 0.05 * Math.sin(t * 3));
        g.strokeStyle = pal.acc; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
        const pts = []; for (let i = 0; i <= 24; i++) { const an = (i / 24) * TAU; pts.push([Math.cos(an) * 34, Math.sin(an) * 34]); }
        pts.push([34, 0], [150, 0], [150, 26], [150, 0], [120, 0], [120, 22]);
        polyPartial(pts, p);
        g.lineCap = 'butt';
      }
      break;
    }
    case 'come': { // rings out
      ring(t, tk.a, tk.cx, tk.cy, { r: 900, life: 1.4, col: pal.acc, lw: 14 });
      ring(t, tk.a + 0.25, tk.cx, tk.cy, { r: 900, life: 1.4, col: pal.acc2, lw: 10 });
      break;
    }
  }
  g.restore();
}
function sparks(x, y, d, size, pal, seed) {
  if (d < 0 || d > 2.4) return;
  const cols = [pal.acc, pal.acc2, '#FFFFFF', C.gold];
  for (let i = 0; i < 26; i++) {
    const an = rnd(i, seed) * TAU, sp = 500 + rnd(i, seed + 1) * 900, k = 2.6;
    const dist = (sp * (1 - Math.exp(-k * d))) / k;
    const px = x + Math.cos(an) * dist, py = y + Math.sin(an) * dist * 0.7 + 160 * d * d;
    const life = 1.2 + rnd(i, seed + 2) * 1.2, lf = d / life;
    if (lf >= 1) continue;
    g.globalAlpha = (1 - lf);
    star4(px, py, (10 + rnd(i, seed + 3) * 22) * (1 - lf * 0.5), cols[i % 4], d * 3 + i);
  }
  g.globalAlpha = 1;
}
function star4(x, y, s, col, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.beginPath();
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, r = k % 2 ? s * 0.22 : s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill(); g.restore();
}
function penLine(x0, x1, y, lw, col, p, seed) {
  if (p <= 0) return;
  const n = 18, pts = [];
  for (let k = 0; k <= n; k++) { const f = k / n; pts.push([lerp(x0, x1, f), y + vnoise(f * 5, seed) * lw * 0.6 + f * lw * 0.4]); }
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  polyPartial(pts, p);
  g.lineCap = 'butt'; g.lineJoin = 'miter';
}

/* ---------------- style extras ---------------- */
function headlineRules(l, L, t, pal, q) {
  const r = L.toks.filter((tk) => tk.row === 1);
  if (!r.length) return;
  const p = Ease.outCubic(pr(t, r[0].a - 0.3, r[0].a + 0.2)), a = 1 - q;
  const x0 = Math.min(...r.map((tk) => tk.x)) - 40, x1 = Math.max(...r.map((tk) => tk.x + tk.w)) + 40;
  const top = r[0].y - r[0].size * 0.86, bot = r[0].y + r[0].size * 0.12;
  g.save(); g.globalAlpha *= a; g.fillStyle = pal.ink;
  const w = (x1 - x0) * p, xm = (x0 + x1) / 2;
  g.fillRect(xm - w / 2, top - 12, w, 8); g.fillRect(xm - w / 2, top + 2, w, 3);
  g.fillRect(xm - w / 2, bot + 6, w, 3); g.fillRect(xm - w / 2, bot + 14, w, 8);
  if (p > 0.5) { g.globalAlpha *= pr(p, 0.5, 1); text('THE MONDAY TIMES  ·  VOL. 1  ·  MORNING EDITION', xm, bot + 48, { size: 24, f: 'ant', color: pal.sub, ls: 3 }); }
  g.restore();
}
function caret(l, L, t, pal) {
  if (t > l.end - 0.1) return;
  let last = null;
  for (const tk of L.toks) for (let k = 0; k < tk.txt.length; k++) if (t >= tk.ct[k]) last = [tk, k];
  if (!last || fract(t * 2.2) > 0.6) return;
  const [tk, k] = last;
  g.fillStyle = pal.acc; g.fillRect(tk.x + tk.xs[k] + tk.ws[k] + 6, tk.y - tk.size * 0.72, Math.max(6, tk.size * 0.06), tk.size * 0.8);
}
function comicBurst(l, L, t, pal, q) {
  const p = Ease.outBack(pr(t, l.a - 0.1, l.a + 0.25), 1.8) * (1 - Ease.inCubic(q));
  if (p <= 0) return;
  g.save(); g.translate(CX, 470); g.rotate(-0.04 + 0.03 * Math.sin(beatAt(t) * Math.PI)); g.scale(p * (1 + 0.03 * bEnv(t, 8)), p);
  const n = 22, R = 640, R2 = 470;
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const an = (i / (n * 2)) * TAU, r = (i % 2 ? R2 : R) * (1 + 0.06 * Math.sin(i * 2.3)); g.lineTo(Math.cos(an) * r * 1.35, Math.sin(an) * r * 0.78); }
  g.closePath(); g.fillStyle = C.pink; g.fill(); g.lineWidth = 14; g.strokeStyle = '#111'; g.stroke();
  g.clip();
  // halftone dots
  g.fillStyle = 'rgba(255,255,255,0.32)';
  for (let y = -460; y < 460; y += 30) for (let x = -900; x < 900; x += 30) { const rr2 = 3 + 9 * (1 - Math.hypot(x, y) / 1000); if (rr2 > 0.5) { g.beginPath(); g.arc(x + ((y / 30) % 2 ? 15 : 0), y, rr2, 0, TAU); g.fill(); } }
  g.restore();
}
function filmFrame(l, L, t, pal) {
  // sepia flicker + scratches behind the line
  const a = win(t, l.a - 0.2, l.end, 0.25, 0.3);
  if (a <= 0) return;
  g.save(); g.globalAlpha *= a * (0.85 + 0.15 * rnd(Math.floor(t * 24), 3));
  g.fillStyle = 'rgba(80,52,20,0.18)'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(60,40,20,0.35)'; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const x = rnd(Math.floor(t * 12), i + 20) * W; line(x, 0, x + 20, H); }
  // sprocket holes
  g.fillStyle = 'rgba(40,28,14,0.5)';
  for (let y = -60 + ((t * 300) % 120); y < H; y += 120) { rr(36, y, 50, 70, 10); g.fill(); rr(W - 86, y, 50, 70, 10); g.fill(); }
  g.restore();
}

/* ---------------- special layouts ---------------- */
// stairs: words land on rising steps, a ball hops from word to word
function drawStairs(l, L, t, pal) {
  const pl = l.plan, q = exitQ(l, t), n = L.toks.length;
  if (!L.ready) {
    L.toks.forEach((tk, k) => { tk.f = 'ant'; tk.txt = tk.word.toUpperCase(); tk.wt = 400; measureTok(tk, pl.soft ? 120 : 136); });
    let total = L.toks.reduce((s, tk) => s + tk.w, 0) + (n - 1) * 46;
    if (total > 1640) { const sc = 1640 / total; L.toks.forEach((tk) => measureTok(tk, tk.size * sc)); total = 1640; }
    const gap = (total - L.toks.reduce((s, tk) => s + tk.w, 0)) / (n - 1);
    let x = CX - total / 2;
    L.toks.forEach((tk, k) => { tk.x = x; tk.y = 690 - k * 70; tk.cx = x + tk.w / 2; tk.cy = tk.y - tk.size * 0.36; x += tk.w + gap; });
    L.ready = true;
  }
  const ex = pl.ex;
  L.toks.forEach((tk, k) => {
    const d = t - tk.a;
    const pS = Ease.outBack(pr(d, -0.2, 0.1), 1.4);
    const lq = leave(ex, q, tk, k, n);
    g.save();
    if (lq) { g.translate(lq.dx || 0, lq.dy || 0); g.globalAlpha *= lq.a; }
    // step block
    if (pS > 0) {
      const sw = tk.w + 30, sh = 26 + k * 70;
      g.fillStyle = hexA(pal.acc, pl.soft ? 0.2 : 0.9);
      g.fillRect(tk.x - 15, tk.y + 16 + (1 - pS) * 300, sw, sh);
      g.fillStyle = hexA(pal.ink, pl.soft ? 0.5 : 0.95); g.fillRect(tk.x - 15, tk.y + 16 + (1 - pS) * 300, sw, 8);
    }
    const p = pr(d, -0.03, 0.22);
    if (p > 0) {
      const s = lerp(1.9, 1, Ease.outExpo(p));
      g.globalAlpha *= Math.min(1, p * 4);
      g.translate(tk.cx, tk.y); g.scale(s, s); g.translate(-tk.cx, -tk.y);
      const look = { col: pal.ink };
      if (pl.ext) look.ext = { n: 9, dx: 2, dy: 2.4, col: pal.deep };
      if (pal.glow && !pl.ext) { look.glow = pal.glow; look.blur = 16; }
      g.translate(tk.x, tk.y); glyphRun(tk, look);
    }
    g.restore();
  });
  // hopping ball between word starts
  if (q < 1) {
    let k = -1; for (let i = 0; i < n; i++) if (t >= L.toks[i].a - 0.12) k = i;
    if (k >= 0) {
      const A = L.toks[Math.max(0, k)], B = L.toks[Math.min(n - 1, k + 1)];
      const t0 = A.a, t1 = k + 1 < n ? B.a : A.a + 0.3;
      const f = clamp((t - t0) / Math.max(0.1, t1 - t0));
      const x = k + 1 < n ? lerp(A.cx, B.cx, f) : A.cx, y0 = A.y - A.size * 0.95, y1 = B.y - B.size * 0.95;
      const y = lerp(y0, y1, f) - Math.sin(f * Math.PI) * 120 - (k === 0 ? (1 - pr(t, A.a - 0.12, A.a)) * 300 : 0);
      g.save(); g.globalAlpha *= 1 - q;
      g.shadowColor = pal.acc2; g.shadowBlur = 30; circle(x, y, 22, pal.acc2); g.shadowBlur = 0;
      g.restore();
    }
  }
}
function glyphRun(tk, look) {
  for (let k = 0; k < tk.txt.length; k++) { g.save(); g.translate(tk.xs[k], 0); glyph(tk.txt[k], tk.f, tk.size, tk.wt, look); g.restore(); }
}

// resize: the word being sung swells, the others shrink back
function drawResize(l, L, t, pal) {
  const pl = l.plan, q = exitQ(l, t), n = L.toks.length;
  if (!L.ready) { L.toks.forEach((tk) => { tk.f = 'ant'; tk.txt = tk.word.toUpperCase(); tk.wt = 400; setFont(100, 400, 1, 'ant'); tk.w100 = layout(tk.txt).w; }); L.ready = true; }
  let cur = -1; for (let k = 0; k < n; k++) if (t >= L.toks[k].a - 0.02) cur = k;
  if (cur < 0) return;
  const sizes = L.toks.map((tk, k) => {
    if (t < tk.a - 0.02) return 0;
    const grow = Ease.outBack(pr(t, tk.a - 0.02, tk.a + 0.16), 2);
    const nT = k + 1 < n ? L.toks[k + 1].a : l.end - 0.25;
    const shrink = Ease.inOutCubic(pr(t, nT - 0.02, nT + 0.22));
    const big = tk.fx === 'day' ? 360 : tk.fx ? 320 : 280, small = 110;
    return lerp(0, lerp(big, small, k === n - 1 ? 0.35 * shrink : shrink), grow) * (1 + 0.05 * bEnv(t, 8));
  });
  const gap = 34;
  let total = 0; sizes.forEach((s, k) => (total += (L.toks[k].w100 * s) / 100 + (s > 0 && k ? gap : 0)));
  const sc = total > 1700 ? 1700 / total : 1;
  let x = CX - (total * sc) / 2;
  const y = 560;
  const ex = leave(pl.ex, q, L.toks[0], 0, n);
  if (ex) { g.translate(0, ex.dy || 0); g.globalAlpha *= ex.a; }
  L.toks.forEach((tk, k) => {
    const s = sizes[k] * sc;
    if (s <= 0.5) return;
    if (k) x += gap * sc;
    const w = (tk.w100 * s) / 100;
    measureTok(tk, s); tk.x = x; tk.y = y; tk.cx = x + w / 2; tk.cy = y - s * 0.36;
    const active = k === cur && t < l.end - 0.2;
    if (tk.fx) fxBehind(l, tk, t, pal, q);
    if (active) { // highlighter block behind the sung word
      const p = Ease.outCubic(pr(t, tk.a, tk.a + 0.15));
      g.fillStyle = hexA(pal.acc, 0.95); g.fillRect(x - 12, y - s * 0.78, (w + 24) * p, s * 0.86);
    }
    const look = { col: active ? pal.deep || '#111' : pal.ink };
    if (pl.ext && !active) look.ext = { n: 8, dx: 2, dy: 2.2, col: pal.deep };
    if (!active && pal.glow) { look.glow = pal.glow; look.blur = 14; }
    g.save(); g.translate(x, y); glyphRun(tk, look); g.restore();
    if (tk.fx) fxFront(l, tk, t, pal, q);
    x += w;
  });
}

// zoom: one giant word at a time, the previous one flies past the camera
function drawZoom(l, L, t, pal) {
  const pl = l.plan, q = exitQ(l, t), n = L.toks.length;
  if (!L.ready) {
    L.toks.forEach((tk) => { tk.f = tk.fx ? 'bag' : 'ant'; tk.txt = tk.word.toUpperCase(); tk.wt = 400; setFont(100, 400, 1, tk.f); const w100 = layout(tk.txt).w; measureTok(tk, Math.min(tk.fx ? 330 : 380, (1300 / w100) * 100)); tk.x = CX - tk.w / 2; tk.y = 470 + tk.size * 0.36; tk.cx = CX; tk.cy = 470; });
    L.ready = true;
  }
  // speed lines
  g.save(); g.strokeStyle = hexA(pal.ink, 0.5); g.lineWidth = 3;
  for (let k = 0; k < 30; k++) {
    const an = (k / 30) * TAU + rnd(k, l.i) * 0.2, ph = fract(t * 1.7 + rnd(k, l.i + 1));
    const r0 = 220 + ph * 900, r1 = r0 + 60 + ph * 240;
    g.globalAlpha = 0.6 * Math.sin(ph * Math.PI) * (1 - q);
    line(CX + Math.cos(an) * r0, 470 + Math.sin(an) * r0 * 0.6, CX + Math.cos(an) * r1, 470 + Math.sin(an) * r1 * 0.6);
  }
  g.restore();
  for (let k = n - 1; k >= 0; k--) {
    const tk = L.toks[k];
    const p = pr(t, tk.a - 0.04, tk.a + 0.18);
    if (p <= 0) continue;
    const nx = k + 1 < n ? L.toks[k + 1].a : l.end - 0.12;
    const f = pr(t, nx - 0.05, nx + 0.24);
    if (f >= 1) continue;
    const s = lerp(0.2, 1, Ease.outExpo(p)) * (1 + 0.05 * (t - tk.a)) * Math.exp(Ease.inQuad(f) * 2.8);
    const a = Math.min(1, p * 3) * (1 - Ease.outQuad(f));
    g.save(); g.globalAlpha *= a;
    g.translate(CX, 470); g.rotate((k % 2 ? 1 : -1) * 0.04); g.scale(s, s); g.translate(-CX, -470);
    const look = { col: tk.fx ? pal.acc : pal.ink, glow: pal.glow || null, blur: 24 };
    if (tk.fx) look.ext = { n: 10, dx: 2.4, dy: 2.8, col: pal.deep };
    g.translate(tk.x, tk.y); glyphRun(tk, look);
    g.restore();
    if (tk.fx === 'spark') { sparks(CX, 470, t - tk.a, 300, pal, l.i); if (pl.confetti) confetti(t, tk.a, CX, 470, { n: 70, v0: 600, v1: 2000, life: 1.8, cols: [pal.acc, pal.acc2, '#FFFFFF', C.gold, C.pink], seed: l.i }); }
    if (tk.fx === 'room' && f <= 0) fxBehind(l, tk, t, pal, q);
  }
}

// clothes line: name tags pegged on a swinging rope
function drawClothes(l, L, t, pal) {
  const pl = l.plan, q = exitQ(l, t), n = L.toks.length;
  if (!L.ready) {
    L.toks.forEach((tk, k) => { tk.f = 'ant'; tk.txt = tk.word.toUpperCase(); tk.wt = 400; measureTok(tk, tk.norm === 'names,' || tk.norm === 'names' || tk.norm === 'floor' ? 120 : 92); });
    let total = L.toks.reduce((s, tk) => s + tk.w + 70, 0) - 70;
    if (total > 1700) { const sc = 1700 / total; L.toks.forEach((tk) => measureTok(tk, tk.size * sc)); total = L.toks.reduce((s, tk) => s + tk.w + 70 * sc, 0) - 70 * sc; L.gap = 70 * sc; } else L.gap = 70;
    let x = CX - total / 2;
    L.toks.forEach((tk) => { tk.px = x + tk.w / 2; x += tk.w + L.gap; });
    L.ready = true;
  }
  const bounce = bEnv(t, 7) * 18;
  let load = 0; for (const tk of L.toks) load += Ease.outCubic(pr(t, tk.a, tk.a + 0.3));
  const sag = 40 + load * 10 + bounce;
  const ropeY = (x) => 390 + sag * (1 - Math.pow((x - CX) / (W / 2 + 60), 2));
  const snap = q > 0 ? Ease.outCubic(q) : 0;
  g.strokeStyle = pal.ink; g.lineWidth = 6;
  if (!snap) { g.beginPath(); for (let x = -60; x <= W + 60; x += 40) g.lineTo(x, ropeY(x)); g.stroke(); }
  else {
    g.beginPath(); for (let x = -60; x <= CX; x += 40) g.lineTo(x, ropeY(x) + Math.pow((x + 60) / (CX + 60), 2) * snap * 900); g.stroke();
    g.beginPath(); for (let x = CX; x <= W + 60; x += 40) g.lineTo(x, ropeY(x) + Math.pow((W + 60 - x) / (CX + 60), 2) * snap * 900); g.stroke();
  }
  const cards = [pal.card1 || '#FFFFFF', pal.card2 || '#FFE45C', pal.card3 || '#FFB4C8'];
  L.toks.forEach((tk, k) => {
    const p = pr(t, tk.a - 0.03, tk.a + 0.22);
    if (p <= 0) return;
    const dt = t - tk.a;
    const sw = (dt > 0 ? 0.3 * Math.exp(-dt * 2.4) * Math.sin(dt * 7.5 + 0.4) : 0) + 0.05 * bEnv(t, 5) * (k % 2 ? 1 : -1);
    const px = tk.px, py = ropeY(px) - (1 - Ease.outBack(p, 1.6)) * 500;
    const ex = q > 0 ? leave('drop', q, tk, k, n) : null;
    g.save(); g.translate(px + (ex ? ex.dx || 0 : 0), py + (ex ? ex.dy : 0)); g.rotate(sw + (ex ? ex.r : 0)); if (ex) g.globalAlpha *= ex.a;
    const cw = tk.w + 50, ch = tk.size * 1.25;
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(-cw / 2 + 10, 22, cw, ch);
    g.fillStyle = cards[k % 3]; g.fillRect(-cw / 2, 12, cw, ch);
    g.fillStyle = pal.acc; rr(-11, -20, 22, 52, 5); g.fill();
    g.save(); g.translate(-tk.w / 2, 12 + ch / 2 + tk.size * 0.36); glyphRun(tk, { col: '#15120F' }); g.restore();
    if (/name|floor/.test(tk.norm)) { g.strokeStyle = pal.acc; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 12 + ch / 2, cw * 0.62, ch * 0.66, -0.05, 0, TAU * Ease.outCubic(pr(dt, 0.2, 0.6))); g.stroke(); }
    g.restore();
  });
}

// path: letters ride a road that bends out of view
function drawPath(l, L, t, pal) {
  const q = exitQ(l, t);
  if (!L.ready) {
    L.toks.forEach((tk) => { tk.f = 'cav'; tk.txt = tk.word; tk.wt = 700; });
    // one long string along the curve
    const s = L.toks.map((tk) => tk.txt).join('  ');
    L.str = s; L.times = [];
    L.toks.forEach((tk, i) => { for (let k = 0; k < tk.txt.length; k++) L.times.push(tk.ct[k]); if (i < L.toks.length - 1) { L.times.push(tk.z); L.times.push(tk.z); } });
    L.ready = true;
  }
  const curve = (u) => { // bezier road from lower left, bending up and away to the right
    const P0 = [180, 760], P1 = [900, 820], P2 = [1300, 520], P3 = [1540, 260];
    const v = 1 - u;
    return [v * v * v * P0[0] + 3 * v * v * u * P1[0] + 3 * v * u * u * P2[0] + u * u * u * P3[0], v * v * v * P0[1] + 3 * v * v * u * P1[1] + 3 * v * u * u * P2[1] + u * u * u * P3[1]];
  };
  const a = 1 - Ease.inCubic(q);
  g.save(); g.globalAlpha *= a;
  // the road
  const pRoad = Ease.outCubic(pr(t, l.a - 0.4, l.a + 0.6));
  const pts = []; for (let i = 0; i <= 60; i++) pts.push(curve(i / 60));
  g.strokeStyle = hexA(pal.ink, 0.16); g.lineWidth = 150; g.lineCap = 'round'; polyPartial(pts, pRoad);
  g.setLineDash([26, 22]); g.strokeStyle = hexA(pal.acc2, 0.9); g.lineWidth = 6; polyPartial(pts, pRoad); g.setLineDash([]); g.lineCap = 'butt';
  // letters: size shrinks along the road (perspective)
  let u = 0.02;
  for (let k = 0; k < L.str.length; k++) {
    const ch = L.str[k];
    const size = lerp(200, 64, Math.pow(u, 0.9));
    setFont(size, 700, 0, 'cav');
    const cw = g.measureText(ch).width;
    const du = cw / 2050;
    const pA = curve(u), pB = curve(Math.min(1, u + du));
    const ang = Math.atan2(pB[1] - pA[1], pB[0] - pA[0]);
    const tt = L.times[k], d = t - tt;
    if (ch !== ' ' && d > -0.02) {
      const p = Ease.outBack(pr(d, -0.02, 0.25), 2);
      g.save(); g.translate(pA[0], pA[1] - 34); g.rotate(ang); g.scale(p, p);
      const isView = k >= L.str.length - 4;
      g.fillStyle = isView ? pal.acc : pal.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.globalAlpha *= isView ? 1 - 0.7 * pr(d, 0.4, 1.4) : 1;
      g.fillText(ch, 0, 0);
      g.restore();
    }
    u += du * 1.04;
  }
  g.restore();
}

// wide: "the whole sky wide" — letters spread out to the edges
function drawWide(l, L, t, pal) {
  const pl = l.plan, q = exitQ(l, t);
  if (!L.ready) { L.toks.forEach((tk) => { tk.f = tk.wi < 3 ? 'bag' : 'ant'; tk.txt = tk.word.toUpperCase(); tk.wt = 400; measureTok(tk, tk.wi < 3 ? 120 : 170); }); L.ready = true; }
  const ex = leave(pl.ex, q, L.toks[0], 0, 1);
  if (ex) { g.translate(0, ex.dy || 0); g.globalAlpha *= ex.a; }
  // row 1: LOOK AT YOU,
  const r1 = L.toks.slice(0, 3), r2 = L.toks.slice(3);
  let tot = r1.reduce((s, tk) => s + tk.w, 0) + 2 * 34, x = CX - tot / 2;
  r1.forEach((tk) => {
    const p = pr(t, tk.a - 0.03, tk.a + 0.25);
    if (p > 0) { g.save(); g.globalAlpha *= Math.min(1, p * 4); const s = Ease.outBack(p, 2.4); g.translate(x + tk.w / 2, 330); g.scale(s, s); g.translate(-tk.w / 2, 0); glyphRun(tk, { col: '#FFFFFF', neon: pal.acc2, blur: 26 }); g.restore(); }
    x += tk.w + 34;
  });
  // row 2: tracking opens as "wide" is sung
  const wideT = r2[r2.length - 1].a;
  const open = Ease.inOutCubic(pr(t, wideT - 0.12, wideT + 0.55));
  const letters = []; r2.forEach((tk, i) => { [...tk.txt].forEach((ch, k) => letters.push([ch, tk.ct[k], tk])); if (i < r2.length - 1) letters.push([' ', 0, null]); });
  setFont(170, 400, 0, 'ant');
  const ws = letters.map(([ch]) => (ch === ' ' ? 50 : g.measureText(ch).width));
  const tight = ws.reduce((a, b) => a + b, 0), span = lerp(tight, 1800, open);
  const extra = (span - tight) / (letters.length - 1);
  x = CX - span / 2;
  letters.forEach(([ch, tt, tk], k) => {
    if (ch !== ' ' && t >= tt - 0.03) {
      const p = pr(t, tt - 0.03, tt + 0.22);
      g.save(); g.globalAlpha *= Math.min(1, p * 4);
      g.translate(x, 640 - (1 - Ease.outBack(p, 2)) * 60 - Math.sin(k * 0.6 + t * 2) * 10 * open);
      glyph(ch, 'ant', 170, 400, { col: open > 0.3 && tk && tk.wi >= 5 ? pal.acc : '#FFFFFF', glow: pal.glow, blur: 20 + 30 * open });
      g.restore();
    }
    x += ws[k] + extra;
  });
  // stars bloom across the sky with the opening
  if (open > 0) for (let i = 0; i < 40; i++) { const sx = rnd(i, 51) * W, sy = 80 + rnd(i, 52) * 760, tw = 0.5 + 0.5 * Math.sin(t * 5 + i); g.globalAlpha = open * tw * (1 - q); star4(sx, sy, 6 + rnd(i, 53) * 16, i % 3 ? '#FFFFFF' : pal.acc, t + i); }
}

// far: the line falls away into the distance as it goes on
function drawFar(l, L, t, pal) {
  const q = exitQ(l, t), n = L.toks.length;
  if (!L.ready) { L.toks.forEach((tk) => { tk.f = tk.fx === 'come' ? 'bag' : 'ant'; tk.txt = tk.word.toUpperCase(); tk.wt = 400; measureTok(tk, tk.fx === 'come' ? 300 : 210); }); L.ready = true; }
  const a = 1 - Ease.inCubic(q);
  for (let k = 0; k < n; k++) {
    const tk = L.toks[k];
    const p = pr(t, tk.a - 0.03, tk.a + 0.25);
    if (p <= 0) continue;
    // how many words came after this one → how far back it sits
    let after = 0; for (let j = k + 1; j < n; j++) after += Ease.inOutCubic(pr(t, L.toks[j].a - 0.05, L.toks[j].a + 0.35));
    const depth = Math.pow(0.55, after), last = k === n - 1;
    const y = lerp(120, 640, Math.pow(depth, 0.7)), s = depth * lerp(1.8, 1, Ease.outExpo(p));
    g.save(); g.globalAlpha *= a * Math.min(1, p * 4) * (0.15 + 0.85 * depth);
    g.translate(CX, y); g.scale(s, s);
    g.translate(-tk.w / 2, tk.size * 0.36);
    glyphRun(tk, { col: last ? pal.acc : pal.ink, ext: last ? { n: 12, dx: 2.4, dy: 2.8, col: pal.acc2 } : null, glow: null });
    g.restore();
    if (tk.fx === 'come') { tk.cx = CX; tk.cy = 640 - tk.size * 0.36; fxFront(l, tk, t, pal, q); }
  }
}

const RENDER = { stairs: drawStairs, resize: drawResize, zoom: drawZoom, clothes: drawClothes, path: drawPath, wide: drawWide, far: drawFar };

/* ---------------- Korean subtitle (fixed, one sentence, no motion) ---------------- */
function drawSub(t) {
  let li = -1;
  for (let i = 0; i < LN.length; i++) if (t >= LN[i].a - 0.15 && t < LN[i].subEnd) li = i;
  if (li < 0) return;
  const l = LN[li];
  const a = Math.min(pr(t, l.a - 0.15, l.a - 0.03), 1 - pr(t, l.subEnd - 0.12, l.subEnd));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  setFont(40, 600, -0.4);
  const w = layout(l.ko).w;
  g.fillStyle = 'rgba(10,10,22,0.58)'; rr(CX - w / 2 - 30, 1002 - 34, w + 60, 68, 34); g.fill();
  g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l.ko, CX, 1004);
  g.restore();
}
