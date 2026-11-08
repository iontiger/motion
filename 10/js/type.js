'use strict';
/* ============================================================
   TYPE — the lyrics, one syllable at a time
   story  : verse 1 in the corridor, left of the door, cream on night
   come   : "Come on in" — each word swings in like a door on its hinge
   big    : chorus lines in the room, ink with a rose offset print
   room   : verse 2 in the room, top centre
   outro  : back in the corridor, the door left open
   ============================================================ */
const STY = {
  story: { f: 'hah', w: 600, wAcc: 800, size: 96, x: 130, y: 350, maxW: 890, align: 'left', lh: 1.28, color: '#FFF1DC' },
  room: { f: 'hah', w: 600, wAcc: 800, size: 88, x: 840, y: 300, maxW: 1240, align: 'center', lh: 1.25, color: '#173A44' },
  big: { f: 'hah', w: 800, wAcc: 900, size: 132, x: 820, y: 440, maxW: 1400, align: 'center', lh: 1.15, color: '#173A44' },
  come: { f: 'fra', w: 800, wAcc: 900, size: 200, x: CX, y: 400, maxW: 1800, align: 'center', lh: 1.05, color: '#FFF1DC' },
  outro: { f: 'hah', w: 800, wAcc: 900, size: 124, x: 130, y: 380, maxW: 900, align: 'left', lh: 1.2, color: '#FFF1DC' },
  outro2: { f: 'hah', w: 700, wAcc: 900, size: 80, x: 130, y: 520, maxW: 900, align: 'left', lh: 1.2, color: '#FFF1DC' },
};

// lay a line out once: words → rows, each char with its x offset and sung time
function lineLayout(li) {
  let L = LAYOUTS.get(li);
  if (L) return L;
  const l = LN[li], pl = l.plan, st = STY[pl.style];
  const toks = l.words.map(([w, a, z, ts], wi) => {
    const pen = pl.pen && pl.pen.includes(wi), acc = pl.acc && pl.acc.includes(wi);
    let size = pen ? st.size * 1.4 : st.size, f = pen ? 'pen' : st.f, wt = acc ? st.wAcc : st.w;
    if (pl.fx === 'shortbig') { if (wi < 2) size = st.size * 0.62; else size = st.size * (wi === 2 ? 1.0 : 1.22); }
    setFont(size, wt, null, f);
    const lay = layout(w);
    const chars = [...w].map((ch, k) => ({ ch, dx: lay.xs[k], w: lay.ws[k], t: ts[k] }));
    return { w, a, z, ts, wi, pen, acc, size, f, wt, width: lay.w, chars, space: size * (f === 'fra' ? 0.26 : 0.3) };
  });
  // wrap
  const rows = [];
  let cur = [], cw = 0;
  toks.forEach((tk) => {
    const add = (cur.length ? tk.space : 0) + tk.width;
    if (cur.length && cw + add > st.maxW) { rows.push({ toks: cur, w: cw }); cur = []; cw = 0; }
    cw += (cur.length ? tk.space : 0) + tk.width; cur.push(tk);
  });
  if (cur.length) rows.push({ toks: cur, w: cw });
  // "Come on in, come on in" always splits after the comma
  if (pl.style === 'come') {
    const all = toks, a = all.slice(0, 3), b = all.slice(3);
    rows.length = 0;
    const ww = (arr) => arr.reduce((s, tk, i) => s + tk.width + (i ? tk.space : 0), 0);
    rows.push({ toks: a, w: ww(a) }, { toks: b, w: ww(b) });
  }
  const rowH = Math.max(...toks.map((tk) => tk.size)) * st.lh;
  rows.forEach((r, k) => {
    r.y = st.y + k * rowH - (pl.style === 'big' || pl.style === 'come' ? ((rows.length - 1) * rowH) / 2 : 0);
    const bx = pl.x != null ? pl.x : st.x;
    const x0 = st.align === 'left' ? bx : bx - r.w / 2;
    let x = x0;
    r.toks.forEach((tk, i) => { if (i) x += tk.space; tk.x = x; x += tk.width; });
  });
  L = { rows, st, rowH };
  LAYOUTS.set(li, L);
  return L;
}

function drawLyrics(t) {
  for (let li = 0; li < LN.length; li++) {
    const l = LN[li];
    if (t < l.a - 0.05 || t > l.z + 0.45) continue;
    drawLine(li, t);
  }
}

function drawLine(li, t) {
  const l = LN[li], pl = l.plan, L = lineLayout(li), st = L.st;
  const ex = pr(t, l.z, l.z + 0.42);          // exit progress
  const exE = Ease.inCubic(ex);
  const inRoom = t >= ZIN[1] && t < ZOUT[0];
  g.save();
  // exits: story lines float up and fade (the next one rises in below); big lines drop away
  if (pl.style === 'story' || pl.style === 'room' || pl.style === 'outro') { g.translate(0, -90 * Ease.outCubic(ex)); g.globalAlpha = 1 - exE; }
  else if (pl.style === 'come') { g.globalAlpha = 1 - exE; scaledAbout(CX, CY, 1 + 0.25 * exE); }
  else { g.translate(0, 40 * exE); g.globalAlpha = 1 - exE; }
  const col = pl.style === 'come' ? (inRoom ? '#173A44' : '#FFF1DC') : st.color;
  for (const row of L.rows) for (const tk of row.toks) drawWord(l, pl, st, tk, row, t, col, inRoom);
  // decorations after the words
  if (pl.fx === 'shortbig') laughBurst(l, L, t);
  g.restore();
}
function scaledAbout(x, y, s) { g.translate(x, y); g.scale(s, s); g.translate(-x, -y); }

function drawWord(l, pl, st, tk, row, t, col, inRoom) {
  const y = row.y;
  // hinge swing for "Come on in"
  if (pl.style === 'come') {
    const p = pr(t, tk.a - 0.06, tk.a + 0.34);
    if (p <= 0) return;
    const sx = Ease.outBack(p, 1.8);
    g.save();
    g.translate(tk.x, y); g.transform(sx, -0.12 * (1 - p), 0, 1, 0, 0); g.translate(-tk.x, -y);
    const isIn = /^in/i.test(tk.w);
    const c = isIn ? (inRoom ? C.terra : P_LCOL) : col;
    if (!inRoom) glow(tk.x + tk.width / 2, y, tk.width * 0.9, P_LCOL, 0.35 * Math.exp(-(t - tk.a) * 2.5));
    if (inRoom) text(tk.w, tk.x + 8, y + 8, { size: tk.size, w: tk.wt, f: 'fra', align: 'left', color: hexA('#F08C78', 0.85) });
    text(tk.w, tk.x, y, { size: tk.size, w: tk.wt, f: 'fra', align: 'left', color: c });
    g.restore();
    return;
  }
  const accCol = pl.style === 'story' || pl.style === 'outro' || pl.style === 'outro2' ? P_LCOL : C.terra;
  // highlighter under accented words in the room
  if (tk.acc && (pl.style === 'room')) {
    const p = Ease.outCubic(pr(t, tk.a, tk.z + 0.25));
    if (p > 0) { g.fillStyle = hexA('#F6C453', 0.55); rr(tk.x - 8, y + tk.size * 0.05, (tk.width + 16) * p, tk.size * 0.36, 6); g.fill(); }
  }
  // the "우리 편" pill
  if (pl.fx === 'team' && (tk.wi === 1 || tk.wi === 2)) {
    const p = Ease.outBack(pr(t, tk.a - 0.05, tk.a + 0.3), 1.6);
    if (p > 0) { g.fillStyle = hexA(P_LCOL, 0.9); rr(tk.x - 18, y - tk.size * 0.56, (tk.width + 36) * p, tk.size * 1.1, tk.size * 0.5); g.fill(); }
  }
  // starburst behind "시작"
  if (pl.fx === 'start' && /시작/.test(tk.w)) {
    const k0 = [...tk.w].findIndex((c) => c === '시');
    const ts = tk.chars[k0].t, d = t - ts;
    if (d > -0.05) { g.save(); if (!inRoom) g.globalAlpha *= 0.32; starburst(tk.x + tk.width * 0.36, y, tk.size * (inRoom ? 1.15 : 0.9), Ease.outBack(clamp((d + 0.05) / 0.35), 2), t, inRoom ? '#F6C453' : P_LCOL); g.restore(); }
    if (inRoom && d > 0 && d < 1.2) confetti(t / SPB, ts / SPB, tk.x + tk.width * 0.4, y - 40, { n: 46, v0: 500, v1: 1500, life: 1.2, cols: [C.terra, C.mustard, C.rose, C.teal, '#FFF3DE'], seed: l.i });
  }
  const isQuote = tk.pen;
  for (let k = 0; k < tk.chars.length; k++) {
    const c = tk.chars[k];
    if (c.ch === ' ') continue;
    let ts = c.t;
    if (pl.fx === 'slow' && tk.wi === 1) ts = c.t; // timing stays, the motion slows
    const d = t - ts;
    const dur = pl.fx === 'slow' && tk.wi === 1 ? 0.55 : pl.style === 'big' ? 0.3 : 0.2;
    const p = pr(d, -0.04, dur);
    if (p <= 0) continue;
    let x = tk.x + c.dx + c.w / 2, yy = y, s = 1, a = 1, r = 0;
    if (pl.style === 'big') {
      s = Ease.outBack(p, pl.fx === 'slow' && tk.wi === 1 ? 0.6 : 2.3); yy -= (1 - p) * 26; a = Math.min(1, p * 3);
      if (pl.fx === 'more' && c.ch === '더') { s *= 1 + 0.32 * Ease.outBack(clamp(p), 2) + 0.08 * PS.rh; r = -0.08; }
      if (pl.fx === 'slow' && tk.wi === 1) x += (k - 1) * 22 * Ease.outCubic(clamp(d / 1.4));
    } else {
      const e = Ease.outCubic(p); yy += (1 - e) * 28; a = e;
      if (isQuote) r = -0.03 + 0.02 * Math.sin(k * 1.7);
    }
    // a little hop on chord changes while the line is up (the piano's two-beat loop)
    if (pl.style !== 'big') yy -= 5 * chordKick(t) * (k % 2 ? 0.6 : 1);
    const fresh = Math.exp(-Math.max(0, d) * 3.2);
    const ccol = isQuote ? (pl.style === 'story' ? C.yellow : C.terra) : tk.acc ? accCol : col;
    if (!inRoom && fresh > 0.05 && pl.style !== 'big') glow(x, yy, tk.size * 0.95, P_LCOL, 0.42 * fresh);
    g.save(); g.translate(x, yy); if (r) g.rotate(r); if (s !== 1) g.scale(s, s);
    const ga = g.globalAlpha; g.globalAlpha = ga * a;
    if (pl.style === 'big') text(c.ch, 7, 7, { size: tk.size, w: tk.wt, f: tk.f, color: hexA('#F08C78', 0.9), ls: 0 });
    text(c.ch, 0, 0, { size: tk.size, w: tk.wt, f: tk.f, color: ccol, ls: 0 });
    g.globalAlpha = ga;
    g.restore();
  }
  // hand-drawn underline that follows an accented word once it's sung (in the corridor)
  if (tk.acc && (pl.style === 'story' || pl.style === 'outro')) {
    const p = Ease.outCubic(pr(t, tk.z, tk.z + 0.35));
    if (p > 0) {
      g.strokeStyle = P_LCOL; g.lineWidth = 6; g.lineCap = 'round';
      const yy = y + tk.size * 0.56;
      g.beginPath();
      for (let i = 0; i <= 20 * p; i++) { const f = i / 20; const xx = tk.x - 6 + (tk.width + 12) * f; const w = Math.sin(f * 9 + tk.wi) * 3; i ? g.lineTo(xx, yy + w) : g.moveTo(xx, yy + w); }
      g.stroke(); g.lineCap = 'butt';
    }
  }
}

function starburst(x, y, r, s, t, col) {
  if (s <= 0) return;
  g.save(); g.translate(x, y); g.rotate(t * 0.4); g.scale(s, s);
  g.fillStyle = col; g.beginPath();
  const n = 14;
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, rr2 = i % 2 ? r * 0.62 : r; i ? g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : g.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  g.closePath(); g.globalAlpha *= 0.9; g.fill();
  g.restore();
}
// "웃음은 크게" — 하하 letters pop around the line
function laughBurst(l, L, t) {
  const t0 = l.syl[4];
  if (t < t0) return;
  const spots = [[-430, -200, -0.2], [600, -170, 0.18], [-520, 140, 0.12], [520, 160, -0.15], [60, -250, 0.05]];
  spots.forEach(([dx, dy, r], k) => {
    const tk = t0 + k * SPB / 2, p = popE(t, tk, 0.35, 2.8);
    if (p <= 0) return;
    g.save(); g.translate((l.plan.x || L.st.x) + dx, L.rows[0].y + dy); g.rotate(r + 0.05 * Math.sin(t * 6 + k)); g.scale(p, p);
    text(k % 2 ? '하하' : '하하하', 0, 0, { size: 84 + (k % 3) * 18, f: 'pen', color: k % 2 ? C.terra : '#E8A93A' });
    g.restore();
  });
}

/* ---------------- title (intro) and end card ---------------- */
function drawTitle(t) {
  // intro: title fades up on bar 1, gone before the first line at ~9.9 s
  if (t < 9.7) {
    const a = Ease.outCubic(pr(t, 0.6, 1.8)) * (1 - Ease.inCubic(pr(t, 8.6, 9.55)));
    if (a > 0) {
      g.save(); g.globalAlpha = a;
      revealUp('문은 열어 둘게', 130, 400, { size: 128, w: 800, f: 'hah', align: 'left', color: '#FFF1DC' }, t, 0.7, 0.7, 0.07);
      const pc = Ease.outCubic(pr(t, 1.6, 2.4));
      g.globalAlpha = a * pc;
      text('Come on in', 134, 530, { size: 64, w: 600, f: 'fra', align: 'left', color: P_LCOL });
      g.globalAlpha = a * pc * 0.7;
      text('노래 아울러 · made with Suno', 136, 612, { size: 26, w: 600, align: 'left', color: '#FFF1DC' });
      g.restore();
    }
  }
  // end card: the outro's two lines stay where they are; the credits join them
  if (t > END_T - 0.2) {
    const a = Ease.outCubic(pr(t, END_T, END_T + 1.0));
    g.save(); g.globalAlpha = a;
    text('Come on in', 134, 650, { size: 60, w: 600, f: 'fra', align: 'left', color: P_LCOL });
    const p3 = Ease.outCubic(pr(t, END_T + 0.9, END_T + 2.0));
    g.globalAlpha = a * p3 * 0.75;
    text('노래 아울러 · made with Suno', 136, 730, { size: 26, w: 600, align: 'left', color: '#FFF1DC' });
    text('피아노 반주  Fm – Fm/E♭ – D♭ – C7', 136, 772, { size: 26, w: 600, align: 'left', color: '#FFF1DC' });
    g.restore();
  }
}
