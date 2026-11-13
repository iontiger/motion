'use strict';
/* ============================================================
   TYPE — the lyrics, one syllable (= one Hangul glyph) at a time, drawn as
   things the glasses put into the room. Styles:
     screen  typed into the chart program on the desk monitor (the old way)
     hud     thin Orbit letters printed on the glasses' display
     ext     chunky extruded letters standing in the room, like the labels
             in the clinic's AR test ("#36 RCT (3)", the patient's name)
     glass   a glass card that unfolds, text inside
     tags    every word is a label tied to something in the room by a leader line
     flow    letters ride a curve that draws itself
     hand    pen handwriting wiped on
   Each line has a PLAN entry in scenes.js (style, place, rows, look, entrance, exit).
   ============================================================ */
let LAYOUTS = new Map();

/* ---------------- lines: timing ---------------- */
const LN = LYRICS.map(([sec, text, ws], i) => {
  const words = ws.map(([w, a, z, syl]) => ({ w, a, z, syl }));
  return { i, sec, text, words, a: words[0].a, z: words[words.length - 1].z };
});
function setupLines(PLAN) {
  LN.forEach((l, i) => {
    const nx = LN[i + 1], pl = PLAN[i] || {};
    l.plan = pl;
    l.end = nx ? Math.min(nx.a - 0.05 + (pl.hold || 0), l.z + 0.7 + (pl.hold || 0)) : l.z + 1.2;      // gone by here
    l.end = Math.max(l.end, l.words[l.words.length - 1].syl.slice(-1)[0][1] + 0.45);
    if (pl.endAt) l.end = pl.endAt;
    l.exd = pl.exd || Math.min(0.32, Math.max(0.16, (nx ? nx.a : l.end + 1) - l.z));
    // flat character list with times
    l.chars = [];
    l.words.forEach((wd, wi) => {
      wd.syl.forEach(([s, st], si) => { for (let j = 0; j < s.length; j++) l.chars.push({ ch: s[j], t: st + j * 0.03, wi, si, punct: /[,.!?]/.test(s[j]) }); });
    });
    l.chars.forEach((c, k) => { const n = l.chars[k + 1]; c.k = k; c.dur = clamp((n ? n.t : l.z) - c.t, 0.12, 0.7); });
  });
}
const lineOn = (l, t, lead = 0.12) => t >= l.a - lead && t < l.end;
// the syllable being sung right now (or null)
function curChar(l, t) { let c = null; for (const x of l.chars) if (x.t <= t) c = x; return c; }
const wordT = (l, wi) => l.words[wi].a;

/* ---------------- layout ----------------
   o: f (font key or null = Pretendard), wt, size, br [word indices that start a new row], rel {wi: scale},
      fw {wi: font}, maxW, lh, al ('c' | 'l' | 'r'), gap (word gap in em) */
function layLine(l, o) {
  const key = l.i + '|' + (o.key || o.st || '') + '|' + (o.size || 0) + '|' + (o.maxW || 0);
  let L = LAYOUTS.get(key);
  if (L) return L;
  const base = o.size || 150, wt = o.wt || 900;
  const mk = (scale) => {
    const words = l.words.map((wd, wi) => {
      const f = (o.fw && o.fw[wi] !== undefined) ? o.fw[wi] : (o.f || null), size = base * scale * ((o.rel && o.rel[wi]) || 1);
      setFont(size, wt, o.ls != null ? o.ls * size : (f === 'orb' ? size * 0.04 : null), f);
      const m = layout(wd.w);
      return { wi, f, size, w: m.w, xs: m.xs, ws: m.ws, ls: _ls };
    });
    const rows = []; let cur = [];
    words.forEach((w, i) => { if (i && o.br && o.br.includes(i)) { rows.push(cur); cur = []; } cur.push(w); });
    rows.push(cur);
    const gapOf = (a, b) => Math.max(a.size, b.size) * (o.gap != null ? o.gap : 0.26);
    rows.forEach((r) => { r.w = r.reduce((s, w, i) => s + w.w + (i ? gapOf(r[i - 1], w) : 0), 0); r.h = Math.max(...r.map((w) => w.size)) * (o.lh || 1.14); });
    return { words, rows, gapOf, w: Math.max(...rows.map((r) => r.w)), h: rows.reduce((s, r) => s + r.h, 0) };
  };
  let m = mk(1);
  const sc = Math.min(1, (o.maxW || 1600) / m.w, (o.maxH || 900) / m.h);
  if (sc < 0.999) m = mk(sc);
  // place
  const chars = []; let y = -m.h / 2;
  m.rows.forEach((r, ri) => {
    let x = o.al === 'l' ? -m.w / 2 : o.al === 'r' ? m.w / 2 - r.w : -r.w / 2;
    if (o.rowDx && o.rowDx[ri]) x += o.rowDx[ri];
    const cy = y + r.h / 2 + ((o.rowDy && o.rowDy[ri]) || 0);
    r.y = cy; r.x0 = x;
    r.forEach((w, i) => {
      if (i) x += m.gapOf(r[i - 1], w);
      w.x0 = x; w.x1 = x + w.w; w.y = cy; w.row = ri;
      for (let k = 0; k < w.xs.length; k++) chars.push({ wi: w.wi, k, u: x + w.xs[k] + (w.ws[k] - w.ls) / 2, v: cy, size: w.size, f: w.f, cw: w.ws[k] - w.ls });
      x += w.w;
    });
    y += r.h;
  });
  // join with the timed characters (same order)
  l.chars.forEach((c, i) => { if (chars[i]) Object.assign(chars[i], { ch: c.ch, t: c.t, dur: c.dur, punct: c.punct, i }); });
  L = { chars: chars.filter((c) => c.ch), words: m.words, rows: m.rows, w: m.w, h: m.h, wt };
  if (LAYOUTS.size > 400) LAYOUTS.clear();
  LAYOUTS.set(key, L);
  return L;
}

/* ---------------- entrances / exits (per glyph) ---------------- */
const outBounce = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
function entFx(kind, age, c) {
  const r = { sc: 1, scx: 1, scy: 1, du: 0, dv: 0, rot: 0, a: 1, dep: 1 };
  if (age < 0) { r.a = 0; return r; }
  if (kind === 'pop') { const p = pr(age, 0, 0.3); r.sc = Ease.outBack(p, 2.4); r.a = Math.min(1, p * 5); }
  else if (kind === 'rise') { const p = Ease.outBack(pr(age, 0, 0.34), 1.6); r.scy = p; r.dv = (1 - p) * c.size * 0.46; r.dep = p; r.a = Math.min(1, age * 14); }
  else if (kind === 'drop') { const p = pr(age, 0, 0.5); r.dv = -(1 - outBounce(p)) * c.size * 1.1; r.a = Math.min(1, p * 6); }
  else if (kind === 'slam') { const p = pr(age, 0, 0.26); r.sc = lerp(2.7, 1, Ease.outExpo(p)); r.a = Math.min(1, p * 4); }
  else if (kind === 'spin') { const p = Ease.outCubic(pr(age, 0, 0.42)); r.scx = Math.cos((1 - p) * Math.PI * 1.5); r.a = Math.min(1, age * 10); }
  else if (kind === 'slide') { const p = Ease.outExpo(pr(age, 0, 0.4)); r.du = -(1 - p) * c.size * 0.9; r.a = Math.min(1, age * 8); }
  else if (kind === 'fade') { const p = Ease.outCubic(pr(age, 0, 0.4)); r.dv = (1 - p) * c.size * 0.22; r.a = p; }
  else if (kind === 'flick') { r.a = age < 0.05 ? 1 : age < 0.09 ? 0.2 : age < 0.14 ? 1 : age < 0.17 ? 0.5 : 1; }
  return r;
}
function exFx(kind, p, c, n, r) {
  if (p <= 0) return r;
  const st = clamp(p * 1.5 - (c.i / Math.max(1, n)) * 0.5);       // left-to-right stagger
  if (kind === 'up') { const e = Ease.inCubic(st); r.dv -= e * c.size * 0.9; r.a *= 1 - e; }
  else if (kind === 'fall') { const e = Ease.inQuad(st); r.dv += e * c.size * 1.6; r.rot += e * (rnd(c.i, 4) - 0.5) * 1.6; r.a *= 1 - Ease.inCubic(st); }
  else if (kind === 'sink') { const e = Ease.inCubic(st); r.scy *= 1 - e; r.dv += e * c.size * 0.46; r.dep *= 1 - e; r.a *= 1 - e * e; }
  else if (kind === 'glitch') { r.a *= (rnd(Math.floor(p * 14), c.i) > p ? 1 : 0.08) * (1 - p * p); r.du += (rnd(Math.floor(p * 14), c.i + 9) - 0.5) * c.size * 0.3 * p; }
  else if (kind === 'scatter') { const e = Ease.inQuad(p); const a = rnd(c.i, 2) * TAU; r.du += Math.cos(a) * e * c.size * 2.2; r.dv += Math.sin(a) * e * c.size * 2.2; r.rot += e * (rnd(c.i, 6) - 0.5) * 3; r.a *= 1 - e; }
  else { const e = Ease.inCubic(p); r.a *= 1 - e; r.sc *= 1 - e * 0.06; }     // fade (also 'zoom', which the plane handles)
  return r;
}

/* ---------------- style: ext (extruded letters in the room) ----------------
   o: x, y (panorama, or screen when hud), par, ry, rx, rz, look, hot (look while a syllable is sung),
      ent, ex, depth, wfx(wi, t, l) → {s, du, dv, rot, look, a} per word, sway */
function stExt(l, t, o) {
  const L = layLine(l, o), n = L.chars.length;
  const exP = pr(t, l.end - l.exd, l.end);
  const sway = o.sway != null ? o.sway : 1;
  let s = (o.s || 1), alpha = 1;
  if (o.ex === 'zoom' && exP > 0) { const e = Ease.inCubic(exP); s *= 1 + e * 1.4; alpha *= 1 - e; }
  if (o.grow) s *= 1 + o.grow * pr(t, l.a, l.end);
  const pl = plane(o.x + (o.driftX || 0) * (t - l.a), o.y + Math.sin(t * 1.3 + l.i) * 5 * sway, {
    par: o.par, hud: o.hud, s,
    ry: (o.ry || 0) + Math.sin(t * 0.9 + l.i * 1.7) * 0.035 * sway + (o.spinRy || 0) * (t - l.a),
    rx: (o.rx || 0) + Math.sin(t * 0.7 + l.i) * 0.02 * sway, rz: o.rz || 0,
  });
  const look = EXT[o.look || 'white'], hot = EXT[o.hot || o.look || 'white'];
  const a0 = g.globalAlpha;
  // contact shadow under each row
  if (o.shadow !== false) {
    L.rows.forEach((r) => {
      const vis = r.reduce((m, w) => Math.max(m, t >= l.words[w.wi].a ? w.x1 : -1e9), -1e9);
      if (vis > -1e8) { g.globalAlpha = a0 * alpha * (1 - exP) * pr(t, l.a, l.a + 0.3); extShadow(pl, (r.x0 + vis) / 2, r.y, vis - r.x0, r.h * 0.8, o.shadowA != null ? o.shadowA : 0.26); }
    });
  }
  // far glyphs first
  const order = L.chars.slice().sort((a, b) => (pl.m[6] * b.u + pl.m[7] * b.v) - (pl.m[6] * a.u + pl.m[7] * a.v));
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const c of order) {
    const age = t - c.t;
    if (age < 0) continue;
    const r = exFx(o.ex, exP, c, n, entFx(o.ent || 'pop', age, c));
    const wf = o.wfx ? o.wfx(c.wi, t, l, c) : null;
    let sc = r.sc, du = r.du, dv = r.dv, rot = r.rot, a = r.a * alpha, lk = look, u = c.u, v = c.v;
    if (wf) {
      if (wf.s != null) { const w = L.words[c.wi], mx = (w.x0 + w.x1) / 2; u = mx + (u - mx) * wf.s + (wf.du || 0); v = w.y + (v - w.y) * wf.s + (wf.dv || 0); sc *= wf.s; }
      else { du += wf.du || 0; dv += wf.dv || 0; }
      if (wf.rot) rot += wf.rot; if (wf.a != null) a *= wf.a; if (wf.look) lk = EXT[wf.look];
      if (wf.dep != null) r.dep *= wf.dep;
    }
    if (a <= 0.004) continue;
    const hotK = c.punct ? 0 : Math.exp(-age * 5.5) * (age < c.dur + 0.25 ? 1 : 0.4);
    const useHot = hot !== look && age < c.dur;
    const bump = 1 + 0.14 * Math.exp(-age * 8);
    g.globalAlpha = a0 * a;
    setFont(c.size, L.wt, 0, c.f);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    extGlyph(pl, c.ch, u + du, v + dv, c.size, useHot ? hot : lk, {
      depth: (o.depth != null ? o.depth : 0.16) * r.dep, sc: sc * bump * r.scx, scy: sc * bump * r.scy, rot,
      glow: hotK > 0.08 ? hexA(o.glowCol || (useHot ? hot.face[1] : '#FFFFFF'), 0.9 * hotK) : null, blur: 36,
    });
  }
  resetXf(); g.globalAlpha = a0;
  return { pl, L };
}

/* ---------------- style: hud (printed on the display) ----------------
   o: x, y (screen px if hud !== false), size, col, box (draw a frame), label, ent, ex */
function stHud(l, t, o) {
  const oo = Object.assign({ f: 'orb', wt: 400, size: 120, lh: 1.24 }, o);
  const L = layLine(l, oo), n = L.chars.length;
  const exP = pr(t, l.end - l.exd, l.end);
  const pl = plane(o.x, o.y + (o.lift ? -o.lift * Ease.inOutCubic(pr(t, o.liftAt || l.a, (o.liftAt || l.a) + 0.9)) : 0), { hud: o.hud !== false, par: o.par, ry: o.ry || 0, rx: o.rx || 0, rz: o.rz || 0, s: o.s || 1 });
  const col = o.col || C.white, acc = o.acc || C.mint, a0 = g.globalAlpha;
  const inP = pr(t, l.a - 0.12, l.a + 0.25);
  // frame + label
  if (o.box !== false) {
    planeXf(pl, 0, 0);
    const bw = L.w + 110, bh = L.h + 60;
    g.globalAlpha = a0 * inP * (1 - exP);
    g.fillStyle = 'rgba(6,20,32,0.34)'; rr(-bw / 2, -bh / 2, bw, bh, 18); g.fill();
    brackets(-bw / 2, -bh / 2, bw * lerp(0.3, 1, Ease.outExpo(inP)), bh, { len: 26, col: acc, lw: 3 });
    if (o.label) hudText(o.label, -bw / 2 + 4, -bh / 2 - 20, { size: 20, color: acc });
  }
  const cur = curChar(l, t);
  for (const c of L.chars) {
    const age = t - c.t;
    if (age < 0) continue;
    const r = exFx(o.ex || 'glitch', exP, c, n, entFx(o.ent || 'flick', age, c));
    if (r.a <= 0.004) continue;
    planeXf(pl, c.u + r.du, c.v + r.dv);
    g.globalAlpha = a0 * r.a;
    setFont(c.size, 400, 0, c.f); g.textAlign = 'center'; g.textBaseline = 'middle';
    const hotK = Math.exp(-age * 5);
    g.shadowColor = acc; g.shadowBlur = 10 + 30 * hotK;
    g.fillStyle = hotK > 0.25 && !c.punct ? mixHex(col, acc, Math.min(1, hotK * 1.2)) : col;
    g.fillText(c.ch, 0, 0); g.shadowBlur = 0;
    if (o.heavy) { g.lineWidth = c.size * 0.03; g.strokeStyle = g.fillStyle; g.lineJoin = 'round'; g.strokeText(c.ch, 0, 0); }
  }
  // caret under the syllable being sung
  if (cur && t < l.z && exP <= 0) {
    const c = L.chars.find((x) => x.i === cur.k);
    if (c) { planeXf(pl, c.u, c.v + c.size * 0.62); g.globalAlpha = a0 * (0.5 + 0.5 * Math.exp(-(t - c.t) * 6)); g.fillStyle = acc; g.fillRect(-c.cw * 0.42, -3, c.cw * 0.84, 6); }
  }
  resetXf(); g.globalAlpha = a0;
  return { pl, L };
}

/* ---------------- style: glass (card that unfolds) ----------------
   o: x, y, par, ry, size, hl [word indices in accent], label, icon(fn), bubble: true → grey balloon + black type */
function stGlass(l, t, o) {
  const oo = Object.assign({ wt: 800, size: 96, lh: 1.22 }, o);
  const L = layLine(l, oo), n = L.chars.length;
  const exP = pr(t, l.end - l.exd, l.end), inP = Ease.outBack(pr(t, l.a - 0.16, l.a + 0.2), 1.4);
  const pl = plane(o.x, o.y + Math.sin(t * 1.2 + l.i) * 4, { par: o.par, hud: o.hud, ry: (o.ry || 0) + Math.sin(t * 0.8 + l.i) * 0.03, rx: o.rx || 0, rz: o.rz || 0, s: (o.s || 1) * (1 - 0.12 * Ease.inCubic(exP)) });
  const a0 = g.globalAlpha, padX = o.padX != null ? o.padX : 70, padY = o.padY != null ? o.padY : 44;
  const w = L.w + padX * 2, h = L.h + padY * 2 + (o.label ? 34 : 0);
  if (inP <= 0) return { pl, L };
  g.globalAlpha = a0 * Math.min(1, inP * 1.4) * (1 - Ease.inCubic(exP));
  if (o.bubble) {
    const bw = w * 1.16 * inP, bh = h * 1.5 * inP;
    bubble(pl, 0, 0, bw, bh, { tx: o.tx != null ? o.tx * inP : undefined, ty: o.ty != null ? o.ty * inP : undefined });
  } else {
    glass(pl, 0, 0, w * lerp(0.2, 1, inP), h, { accent: o.accent, r: o.r != null ? o.r : 30, top: o.top, bot: o.bot, stroke: o.stroke });
    if (o.label) { planeXf(pl, 0, 0); hudText(o.label, -w / 2 + (o.accent ? 36 : 28), -h / 2 + 30, { size: 20, color: o.accCol || C.mint, alpha: pr(t, l.a, l.a + 0.3) }); }
  }
  const dy = o.label ? 15 : 0;
  for (const c of L.chars) {
    const age = t - c.t;
    if (age < 0) continue;
    const r = exFx('fade', 0, c, n, entFx(o.ent || 'fade', age, c));
    planeXf(pl, c.u + r.du, c.v + r.dv + dy);
    if (r.sc !== 1) g.scale(r.sc, r.sc);
    g.globalAlpha = a0 * r.a * (1 - Ease.inCubic(exP));
    setFont(c.size, L.wt, 0, c.f); g.textAlign = 'center'; g.textBaseline = 'middle';
    const hl = o.hl && o.hl.includes(c.wi), hotK = Math.exp(-age * 5);
    const baseCol = o.bubble ? '#111418' : (hl ? (o.accCol || C.mint) : C.white);
    g.fillStyle = hotK > 0.2 && !c.punct ? mixHex(baseCol, o.bubble ? '#D2541B' : (hl ? '#FFFFFF' : (o.accCol || C.mint)), Math.min(1, hotK)) : baseCol;
    if (!o.bubble) { g.shadowColor = 'rgba(0,10,20,0.5)'; g.shadowBlur = 8; g.shadowOffsetY = 3; }
    g.fillText(c.ch, 0, 0);
    g.shadowBlur = 0; g.shadowOffsetY = 0;
  }
  resetXf(); g.globalAlpha = a0;
  return { pl, L, w, h };
}

/* ---------------- style: tags (each word a label tied to something) ----------------
   o: tags [{x, y, ax, ay, col, f, size, al}] per word (panorama coords), par */
function stTags(l, t, o) {
  const a0 = g.globalAlpha, exP = pr(t, l.end - l.exd, l.end);
  l.words.forEach((wd, wi) => {
    const tg = o.tags[wi];
    if (!tg || t < wd.a - 0.1) return;
    const size = tg.size || o.size || 92, f = tg.f !== undefined ? tg.f : (o.f || null), wt = o.wt || 900, col = tg.col || o.col || C.mint;
    setFont(size, wt, null, f);
    const m = layout(wd.w), tw = m.w, padX = size * 0.42, w = tw + padX * 2, h = size * 1.5;
    const inP = Ease.outBack(pr(t, wd.a - 0.1, wd.a + 0.22), 1.8);
    const par = o.par || 1.1, bob = Math.sin(t * 1.4 + wi * 2 + l.i) * 5;
    const [sx, sy, z] = toScreen(tg.x, tg.y + bob, par);
    const exo = Ease.inCubic(clamp(exP * 1.4 - wi * 0.12));
    g.globalAlpha = a0 * (1 - exo);
    if (tg.ax != null) {
      const [ax, ay] = toScreen(tg.ax, tg.ay, tg.apar || 1);
      const side = tg.al === 'r' ? 1 : tg.al === 'l' ? -1 : 0;
      leader(ax, ay, sx + side * (w / 2) * z, sy + (side === 0 ? (ay > sy ? h / 2 : -h / 2) * z : 0), pr(t, wd.a - 0.1, wd.a + 0.25), { col, elbow: side === 0 ? ax : undefined });
    }
    g.save(); g.translate(sx, sy - exo * 40); g.rotate(CAM.roll + (tg.rot || 0)); g.scale(z * inP, z * inP);
    g.shadowColor = 'rgba(4,14,24,0.45)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
    rr(-w / 2, -h / 2, w, h, h * 0.28);
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, 'rgba(22,48,70,0.82)'); gr.addColorStop(1, 'rgba(8,24,38,0.86)');
    g.fillStyle = gr; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.lineWidth = 3; g.strokeStyle = hexA(col, 0.85); g.stroke();
    g.fillStyle = col; rr(-w / 2 + 12, -h / 2 + 12, 7, h - 24, 3.5); g.fill();
    // syllables
    setFont(size, wt, 0, f); g.textAlign = 'center'; g.textBaseline = 'middle';
    let k = 0;
    wd.syl.forEach(([s, st]) => {
      for (let j = 0; j < s.length; j++, k++) {
        const age = t - st - j * 0.03;
        if (age < 0) continue;
        const p = Ease.outBack(pr(age, 0, 0.26), 2.2), hotK = Math.exp(-age * 5);
        const cx = -tw / 2 + m.xs[k] + (m.ws[k] - _ls) / 2 + 4;
        g.save(); g.translate(cx, size * 0.04); g.scale(p, p);
        g.fillStyle = hotK > 0.2 ? mixHex('#FFFFFF', col, Math.min(1, hotK)) : '#FFFFFF';
        g.fillText(s[j], 0, 0); g.restore();
      }
    });
    g.restore();
  });
  g.globalAlpha = a0;
}

/* ---------------- style: flow (letters ride a curve that draws itself) ----------------
   o: path(s) → [x, y] with s in px along x (screen or panorama via par), x0, size, col, f */
function stFlow(l, t, o) {
  const oo = Object.assign({ wt: 900, size: 120, br: [] }, o);
  const L = layLine(l, oo), n = L.chars.length, a0 = g.globalAlpha;
  const exP = pr(t, l.end - l.exd, l.end);
  const par = o.par || 1.08, x0 = o.x - L.w / 2;
  const P = (u) => { const X = x0 + u, Y = o.path(X, t); return toScreen(X, Y, par); };
  // the ribbon, drawn up to a little past the sung syllable
  const cur = curChar(l, t);
  const headU = cur ? (L.chars.find((c) => c.i === cur.k) || L.chars[n - 1]).u + L.w / 2 : 0;
  const lead = lerp(-160, headU + 190, 1) + Ease.outCubic(pr(t, l.a - 0.3, l.a)) * 0;
  const from = -260, to = t < l.a ? lerp(from, -40, pr(t, l.a - 0.35, l.a)) : Math.min(L.w + 320, lead + (t - (cur ? cur.t : l.a)) * 260);
  g.globalAlpha = a0 * (1 - Ease.inCubic(exP));
  if (to > from) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    const dv = oo.size * 0.74;
    [[o.col2 || 'rgba(124,245,221,0.22)', 26], [o.col || C.mint, 6]].forEach(([c, lw]) => {
      g.strokeStyle = c; g.lineWidth = lw; g.beginPath();
      for (let u = from; u <= to; u += 16) { const X = x0 + u, p = toScreen(X, o.path(X, t) + dv, par); u === from ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); }
      g.stroke();
    });
    const hp = toScreen(x0 + to, o.path(x0 + to, t) + dv, par);
    circle(hp[0], hp[1], 11, '#FFFFFF');
    g.lineCap = 'butt';
  }
  const look = EXT[o.look || 'white'];
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const c of L.chars) {
    const age = t - c.t;
    if (age < 0) continue;
    const r = exFx(o.ex || 'up', exP, c, n, entFx('pop', age, c));
    if (r.a <= 0.004) continue;
    const u = c.u + L.w / 2, p = P(u), q = P(u + 8);
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const pl = plane(p[0], p[1] + r.dv, { hud: true, rz: ang + r.rot, s: p[2] });
    g.globalAlpha = a0 * r.a;
    setFont(c.size, L.wt, 0, c.f); g.textAlign = 'center'; g.textBaseline = 'middle';
    const hotK = Math.exp(-age * 5.5);
    extGlyph(pl, c.ch, 0, 0, c.size, look, { depth: 0.13, sc: r.sc * (1 + 0.14 * Math.exp(-age * 8)), glow: hotK > 0.08 ? hexA('#FFFFFF', 0.9 * hotK) : null });
  }
  resetXf(); g.globalAlpha = a0;
}

/* ---------------- style: hand (pen handwriting wiped on) ---------------- */
function stHand(l, t, o) {
  const oo = Object.assign({ f: 'pen', wt: 400, size: 190, lh: 0.95, gap: 0.22 }, o);
  const L = layLine(l, oo), n = L.chars.length, a0 = g.globalAlpha;
  const exP = pr(t, l.end - l.exd, l.end);
  const pl = plane(o.x, o.y + Math.sin(t * 1.3) * 4, { par: o.par, hud: o.hud, rz: o.rz || -0.04, ry: o.ry || 0 });
  for (const c of L.chars) {
    const age = t - c.t;
    if (age < 0) continue;
    const p = Ease.outCubic(pr(age, 0, Math.min(0.3, c.dur)));
    const r = exFx(o.ex || 'up', exP, c, n, { sc: 1, scx: 1, scy: 1, du: 0, dv: 0, rot: 0, a: 1, dep: 1 });
    planeXf(pl, c.u + r.du, c.v + r.dv);
    g.rotate((rnd(c.i, l.i) - 0.5) * 0.08 + r.rot);
    g.globalAlpha = a0 * r.a;
    g.save(); g.beginPath(); g.rect(-c.size * 0.7, -c.size * 0.8, c.size * 1.4 * p, c.size * 1.6); g.clip();
    setFont(c.size, 400, 0, 'pen'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,10,20,0.55)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    g.lineJoin = 'round'; g.lineWidth = c.size * 0.035; g.strokeStyle = o.col || C.yellow; g.strokeText(c.ch, 0, 0);
    g.fillStyle = o.col || C.yellow; g.fillText(c.ch, 0, 0);
    g.restore();
    g.shadowBlur = 0; g.shadowOffsetY = 0;
  }
  resetXf(); g.globalAlpha = a0;
  return { pl, L };
}

/* ---------------- style: screen (typed on the chart monitor) ----------------
   o: row (0 = search field, 1 = below it), size */
function stScreen(l, t, o) {
  const oo = Object.assign({ wt: 800, size: 74, maxW: SCREEN.w - 250, key: 'screen' + (o.row || 0) }, o);
  const L = layLine(l, oo), a0 = g.globalAlpha;
  const x0 = SCREEN.x + 190, yy = SCREEN.y + (o.row ? 318 : 150);
  const exP = pr(t, l.end - l.exd, l.end);
  g.save(); layerXf(1);
  g.globalAlpha = a0 * (1 - exP);
  if (!o.row) {       // search field
    rr(x0 - 26, yy - 62, SCREEN.w - 210, 124, 20); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#19B8A6'; g.stroke();
    text('환자 검색', x0 - 20, yy - 86, { size: 24, w: 700, align: 'left', color: '#5F7480' });
  }
  const left = x0 + (o.row ? 0 : 6) + L.w / 2;
  let lastX = x0;
  for (const c of L.chars) {
    if (t < c.t) continue;
    setFont(c.size, 800, 0, null); g.textAlign = 'center'; g.textBaseline = 'middle';
    const sel = o.sel ? o.sel(c, t) : 0;
    if (sel > 0) { g.fillStyle = `rgba(63,140,255,${0.32 * sel})`; g.fillRect(left + c.u - c.cw / 2 - 2, yy - c.size * 0.62, c.cw + 4, c.size * 1.24); }
    g.fillStyle = '#10222E'; g.fillText(c.ch, left + c.u, yy + 2);
    lastX = left + c.u + c.cw / 2;
  }
  if (!o.row && Math.sin(t * 9) > 0 && t < l.end - 0.2) { g.fillStyle = '#19B8A6'; g.fillRect(lastX + 8, yy - 40, 5, 80); }
  g.restore(); g.globalAlpha = a0;
  return { L, left, yy };
}

/* ---------------- dispatcher ---------------- */
const STYLES = { ext: stExt, hud: stHud, glass: stGlass, tags: stTags, flow: stFlow, hand: stHand, screen: stScreen };
function drawLyric(l, t) {
  const pl = l.plan;
  if (!pl || !pl.st || !lineOn(l, t, pl.lead != null ? pl.lead : 0.4)) return null;
  const o = typeof pl.dyn === 'function' ? Object.assign({}, pl, pl.dyn(t, l)) : pl;
  return STYLES[pl.st](l, t, o);
}
