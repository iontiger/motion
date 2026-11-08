'use strict';
/* ============================================================
   TYPE — kinetic lyrics. Every syllable appears on the beat it is
   sung, as a sticker: ink outline, hard shadow, flat colour.
   Styles: pop · drop · slide · wave · label · bubble · caption ·
   sink · freeze · hook · stamp. Seeded per line, so every play is the same.
   ============================================================ */
const KEY = [
  '친척들', '그때 얘가 말이야', '손끝', '증거', '그날로', '바위',
  '살아남았다는', '마음', '물속에', '숨이',
  '두려움을', '답이', '솔직했어', '산길을', '괜찮아,', '고르면', '아이들이', '구명조끼부터',
  '버틸', '첫', '겁', '안전하댔지만', '그만뒀고,', '절벽에도',
  '높은', '졸업할', '매일', '헤엄쳤어',
  '두려움을', '답이', '솔직했어', '산길을', '괜찮아,', '고르면', '아이들이', '구명조끼부터',
  '제법', '겁', '으쓱', '취향은', '산', '흙길,', '달리기도', '두',
  '좋은', '좋아하는', '꼭', '잊지',
  '괜찮아,', '고르면', '충분해', '방향을', '아이들이', '챙겨', '구명조끼부터', '명심해,',
  '손끝은', '한마디가', '구명조끼를', '명심해',
];
const KEYCOL = { room: P.orange, under: P.yellow, hill: P.orange, shore: P.orange, pool: P.red, montage: P.water2, park: P.water2, trail: P.green2, sunset: P.yellow, lake: P.orange };
const POOL = {
  room: ['pop', 'drop', 'slide', 'wave'], under: ['wave', 'pop'], hill: ['pop', 'drop', 'label', 'slide'], shore: ['pop', 'label'],
  pool: ['pop', 'drop', 'slide', 'wave'], montage: ['label', 'slide', 'pop'], park: ['pop', 'drop', 'slide', 'label'], trail: ['pop', 'drop', 'slide', 'label'],
  sunset: ['caption'], lake: ['pop', 'caption'],
};
const SLOTS = {
  T: { x: 960, y: 230, w: 1360, size: 112, rows: 2 },
  B: { x: 960, y: 860, w: 1360, size: 108, rows: 2 },
  C: { x: 960, y: 640, w: 1360, size: 150, rows: 2 },
  L: { x: 500, y: 520, w: 820, size: 90, rows: 3 },
  R: { x: 1420, y: 520, w: 820, size: 90, rows: 3 },
};
const rngLine = (li) => mulberry32(li * 7919 + 13);
const STYLE = PLAN.map((p, li) => p.style || (() => { const r = rngLine(li), pool = POOL[p.bg]; return pool[Math.floor(r() * pool.length)]; })());

// sticker text for a whole string (titles)
function stickText(s, x, y, size, fill, f = 'jua') {
  setFont(size, 400, -size * 0.01, f);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.fillStyle = P.ink; g.fillText(s, x + size * 0.06, y + size * 0.08);
  g.lineWidth = size * 0.07; g.strokeStyle = P.ink; g.strokeText(s, x + size * 0.06, y + size * 0.08);
  g.lineWidth = size * 0.17; g.strokeText(s, x, y);
  g.fillStyle = fill; g.fillText(s, x, y);
}

/* ---------------- layout: words → rows → chars with times ---------------- */
function lineLayout(li) {
  const key = li + '|' + STYLE[li];
  if (LAYOUTS.has(key)) return LAYOUTS.get(key);
  const L = LN[li], st = STYLE[li], slot = SLOTS[PLAN[li].slot];
  const f = st === 'caption' ? 'gaegu' : st === 'stamp' ? 'disp' : 'jua';
  let size = slot.size * (st === 'hook' ? 1.12 : st === 'caption' ? 0.9 : 1);
  const label = st === 'label' || st === 'hook';
  const gap = label ? 0.42 : 0.3;
  let rows;
  for (let tries = 0; tries < 12; tries++) {
    setFont(size, 400, -size * 0.01, f);
    const sp = size * gap;
    const wsz = L.words.map((wd) => layout(wd[0]).w + (label ? size * 0.5 : 0));
    const total = wsz.reduce((a, b) => a + b, 0) + sp * (wsz.length - 1);
    const nr = Math.max(1, Math.ceil(total / slot.w)), lim = Math.min(slot.w, (total / nr) * 1.1 + size * 0.5);
    rows = [[]]; let w = 0;
    wsz.forEach((ww, k) => {
      if (rows[rows.length - 1].length && w + sp + ww > lim) { rows.push([]); w = 0; }
      rows[rows.length - 1].push(k); w += (rows[rows.length - 1].length > 1 ? sp : 0) + ww;
    });
    // balance two rows a little: move words down while row 0 is much longer
    if (rows.length <= slot.rows) break;
    size *= 0.92;
  }
  setFont(size, 400, -size * 0.01, f);
  const sp = size * gap, lh = size * (label ? 1.42 : 1.22);
  const chars = [], words = [];
  const kw = KEY[li] || '';
  rows.forEach((r, ri) => {
    const ws = r.map((k) => layout(L.words[k][0]).w + (label ? size * 0.5 : 0));
    const tot = ws.reduce((a, b) => a + b, 0) + sp * (r.length - 1);
    let x = slot.x - tot / 2;
    const y = slot.y + (ri - (rows.length - 1) / 2) * lh;
    r.forEach((k, j) => {
      const [txt, t0, t1, ts] = L.words[k];
      const Lw = layout(txt), pad = label ? size * 0.25 : 0;
      const isKey = kw && (kw.includes(txt) || txt.includes(kw) || kw.split(' ').includes(txt));
      words.push({ k, x, y, w: ws[j], t0, t1, txt, isKey, row: ri });
      for (let i = 0; i < txt.length; i++) {
        if (txt[i] === ' ') continue;
        chars.push({ ch: txt[i], x: x + pad + Lw.xs[i] + Lw.ws[i] / 2, y, t: ts[i], wi: words.length - 1, ri, n: chars.length, isKey });
      }
      x += ws[j] + sp;
    });
  });
  const res = { size, f, rows: rows.length, chars, words, lh, slot };
  LAYOUTS.set(key, res);
  return res;
}

/* ---------------- drawing ---------------- */
function stickChar(c, x, y, size, fill, o = {}) {
  g.save(); g.translate(x, y);
  if (o.r) g.rotate(o.r);
  if (o.sx != null || o.sy != null) g.scale(o.sx == null ? 1 : o.sx, o.sy == null ? 1 : o.sy);
  if (o.a != null) g.globalAlpha *= o.a;
  const ink = o.ink || P.ink;
  if (!o.flat) {
    g.fillStyle = ink; g.fillText(c, size * 0.06, size * 0.08);
    g.lineWidth = size * 0.17; g.strokeStyle = ink; g.strokeText(c, size * 0.06, size * 0.08);
    g.lineWidth = size * 0.17; g.strokeText(c, 0, 0);
  }
  g.fillStyle = fill; g.fillText(c, 0, 0);
  g.restore();
}
function drawLyrics(t) {
  const li = curLine(t);
  if (li < 0) return;
  for (const k of [li - 1, li]) {
    if (k < 0) continue;
    const L = LN[k];
    if (t < L.a || t > L.z) continue;
    drawLine(k, t);
  }
}
function drawLine(li, t) {
  const L = LN[li], st = STYLE[li], lay = lineLayout(li), size = lay.size, bg = PLAN[li].bg;
  const q = clamp((t - (L.z - 0.22)) / 0.22); // exit progress
  const kc = KEYCOL[bg] || P.orange;
  const r = rngLine(li + 500);
  setFont(size, 400, 0, lay.f);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const beat = beatPulse(t, 8);

  // containers
  if (st === 'caption') {
    const w = Math.max(...lay.words.map((w) => w.x + w.w)) - Math.min(...lay.words.map((w) => w.x)) + size * 1.2;
    const h = lay.rows * lay.lh + size * 0.6;
    const p = Ease.outExpo(clamp((t - L.a) / 0.35));
    const x = lay.slot.x - w / 2 - (1 - p) * 300 - Ease.inCubic(q) * 1800, y = lay.slot.y - h / 2;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(-0.015);
    hardShadow(() => { g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.fill(); }, 12, 12);
    inked(() => { g.beginPath(); g.rect(-w / 2, -h / 2, w, h); }, '#FFF3B0', LW);
    g.restore();
    setFont(size, 700, 0, lay.f); g.textAlign = 'center'; g.textBaseline = 'middle';
  }
  if (st === 'bubble') {
    const w = Math.max(...lay.words.map((w) => w.x + w.w)) - Math.min(...lay.words.map((w) => w.x)) + size * 1.4;
    const h = lay.rows * lay.lh + size * 0.9;
    const p = Ease.outBack(clamp((t - L.a) / 0.35), 2) * (1 - Ease.inCubic(q));
    if (p > 0) { g.save(); g.translate(lay.slot.x, lay.slot.y); g.scale(p, p); bubble(0, 0, w, h, -w / 2 - 60, h / 2 + 120); g.restore(); }
    setFont(size, 400, 0, lay.f); g.textAlign = 'center'; g.textBaseline = 'middle';
  }
  if (st === 'label' || st === 'hook') {
    const cols = st === 'hook' ? [P.orange, P.white, P.orange, P.water] : [P.white, P.yellow, P.water, P.pink, P.green];
    lay.words.forEach((w, j) => {
      const p = Ease.outBack(clamp((t - w.t0 + 0.06) / 0.3), 2.4);
      if (p <= 0) return;
      const rot = (rnd(j, li) - 0.5) * 0.12 + (st === 'hook' ? Math.sin(t * 3 + j) * 0.03 : 0);
      const hs = st === 'hook' ? 1 + beat * 0.05 : 1;
      const fy = Ease.inCubic(clamp(q * 1.3 - j * 0.05)) * -900;
      g.save(); g.translate(w.x + w.w / 2, w.y + fy); g.rotate(rot); g.scale(p * hs, p * hs);
      const col = w.isKey ? (st === 'hook' ? P.orange : kc) : cols[j % cols.length];
      const bh = size * 1.25;
      hardShadow(() => { g.beginPath(); g.roundRect(-w.w / 2, -bh / 2, w.w, bh, size * 0.24); g.fill(); }, 10, 10);
      inked(pRR(-w.w / 2, -bh / 2, w.w, bh, size * 0.24), col, LW);
      g.restore();
      w._p = p; w._rot = rot; w._fy = fy; w._hs = hs;
    });
  }

  // characters
  const dropH = 110;
  for (const c of lay.chars) {
    const dt = t - c.t + 0.06;
    if (dt < 0) continue;
    const p = clamp(dt / 0.32);
    let x = c.x, y = c.y, sx = 1, sy = 1, rr = 0, a = 1;
    let fill = c.isKey ? kc : P.white, ink = P.ink, flat = false;
    if (st === 'pop') { const s = Ease.outBack(p, 2.6); sx = sy = s; rr = (rnd(c.n, li) - 0.5) * 0.3 * (1 - p); }
    else if (st === 'drop') {
      const fall = clamp(dt / 0.22);
      y -= (1 - Ease.inQuad(fall)) * dropH;
      const land = clamp((dt - 0.22) / 0.25);
      if (fall >= 1 && land < 1) { const sq = Math.sin(land * Math.PI) * (1 - land); sx = 1 + sq * 0.35; sy = 1 - sq * 0.3; y += sq * size * 0.12; }
      a = clamp(dt / 0.06);
    } else if (st === 'slide') { const e = Ease.outExpo(p); x += (1 - e) * 240; a = clamp(p * 3); rr = (1 - e) * 0.25; sx = lerp(1.4, 1, e); }
    else if (st === 'wave') { const s = Ease.outBack(p, 2); sx = sy = s; y += Math.sin(t * 3.4 - c.n * 0.55) * size * 0.08; rr = Math.sin(t * 3.4 - c.n * 0.55 + 1) * 0.06; }
    else if (st === 'label' || st === 'hook') {
      const w = lay.words[c.wi]; if (!w._p) continue;
      const s = Ease.outBack(clamp(dt / 0.25), 2.2);
      g.save(); g.translate(w.x + w.w / 2, w.y + w._fy); g.rotate(w._rot); g.scale(w._p * w._hs, w._p * w._hs);
      stickChar(c.ch, c.x - (w.x + w.w / 2), 0, size, w.isKey || (st === 'hook' && c.wi % 2 === 0) ? P.white : P.ink, { sx: s, sy: s, flat: !(w.isKey || (st === 'hook' && c.wi % 2 === 0)) });
      g.restore();
      continue;
    } else if (st === 'bubble') { fill = c.isKey ? P.orange : P.ink; flat = true; const s = Ease.outBack(p, 2.4); sx = sy = s; }
    else if (st === 'caption') { fill = c.isKey ? P.red : P.ink; flat = true; a = clamp(dt / 0.12); y += (1 - Ease.outCubic(p)) * size * 0.3; }
    else if (st === 'sink') {
      const s = Ease.outBack(p, 2); sx = sy = s;
      const sk = t - (L.last + 0.25);
      if (sk > 0) { const v = 0.6 + rnd(c.n, 3) * 0.8; y += sk * sk * 260 * v + sk * 60; rr = sk * (rnd(c.n, 4) - 0.5) * 1.6; x += Math.sin(sk * 4 + c.n) * 20 * sk; }
    } else if (st === 'freeze') {
      const s = Ease.outBack(p, 2.4); sx = sy = s;
      const fr = clamp((t - (L.first + 0.6)) / 0.3);
      if (fr > 0) { fill = c.isKey ? '#9EDBFF' : '#E2F5FF'; ink = '#1E4F8A'; }
      else { x += Math.sin(t * 50 + c.n) * 3; }
    } else if (st === 'stamp') { const e = Ease.outExpo(clamp(dt / 0.25)); sx = sy = lerp(2.4, 1, e); a = clamp(dt / 0.08); fill = P.red; rr = -0.06; }
    // exit
    if (q > 0) {
      const e = Ease.inCubic(clamp(q * 1.4 - (c.n / lay.chars.length) * 0.4));
      if (st === 'pop' || st === 'wave' || st === 'freeze' || st === 'stamp') { sx *= 1 - e; sy *= 1 - e; }
      else if (st === 'drop') { y += e * 700; rr += e * (rnd(c.n, 9) - 0.5) * 2; }
      else if (st === 'slide') { x -= e * 1600; }
      else if (st === 'bubble') { sx *= 1 - e; sy *= 1 - e; }
      else if (st === 'caption') { x -= Ease.inCubic(q) * 1800; }
      else if (st === 'sink') { a *= 1 - e; }
    }
    if (sx <= 0.01 || sy <= 0.01 || a <= 0.01) continue;
    if (st === 'bubble' || st === 'caption') setFont(size, st === 'caption' ? 700 : 400, 0, lay.f);
    stickChar(c.ch, x, y, size, fill, { sx, sy, r: rr, a, ink, flat });
  }
}
