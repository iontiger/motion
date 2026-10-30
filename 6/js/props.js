'use strict';
/* ============================================================
   PROPS — poster material that pops up behind the lyrics.
   Every prop belongs to one lyric line and is cued from that line's
   word / syllable times, so "여섯 연자" really throws out six speakers.
   Props take the half of the screen the lyric is not using
   (area 'low' when the lyric sits on top, 'high' when it sits at the
   bottom, 'back' = large and faded when the lyric fills the centre).
   ============================================================ */
const IMG = { sp: [], logo: null, qr: null };

// from the conference poster
const SPEAKERS = [
  { name: '황진섭', role: '변호사', org: '법무법인 대련', time: '09:30~11:30', topic: '치과의사의 의료윤리와 의료분쟁 예방', must: true, img: 'hwang' },
  { name: '김상완', role: '원장', org: '삼아이치과', time: '11:30~12:20', topic: 'AI가 돌려준 시간, 우리는 무엇을 할 것인가', img: 'kimsw' },
  { name: '김경수', role: '원장', org: '김경수치과', time: '13:30~14:20', topic: '원장님 치과에는 AI 직원이 몇 명인가요?', img: 'kimks' },
  { name: '류성훈', role: '원장', org: '밸런스치과', time: '14:35~15:25', topic: 'AI를 활용한 미래형 치과 운영 시스템', img: 'ryu' },
  { name: '옥용주', role: '원장', org: '내이처럼치과', time: '15:25~16:15', topic: 'AI 시대, 직원을 대체하지 말고 에이전트로', img: 'ok' },
  { name: '이정우', role: '병원장', org: '시카고치과병원', time: '16:30~17:20', topic: 'AI 시대, 기술보다 중요한 것은 사람 경영', img: 'lee' },
];
const SP_COL = [C.k, C.a, C.d, C.a2, C.purple, C.teal];

const CW = (i, k) => LYRICS[i].words[k].t;          // word k of line i starts
const CE = (i, k) => LYRICS[i].words[k].e;          // ... and its last syllable
const CC = (i, k, c) => LYRICS[i].words[k].ct[c];   // one character of it

/* ---------------- cue sheet: line -> prop ---------------- */
// sp: speaker index (0-5). at: word index that triggers a speaker / an event.
const PROP_CUES = {
  0: { kind: 'ai' },
  2: { kind: 'tooth' },
  3: { kind: 'year', at: 0 },
  4: { kind: 'bubble', sp: 0 },
  5: { kind: 'card', sp: [0] },
  6: { kind: 'clock', mode: 'spin', sp: 1 },
  7: { kind: 'card', sp: [1] },
  8: { kind: 'agents', sp: [2, 4], at: [0, 2] },
  9: { kind: 'blueprint', sp: 3 },
  10: { kind: 'team', sp: 5 },
  11: { kind: 'row6' },
  12: { kind: 'tooth', many: true },
  13: { kind: 'paths6' },
  14: { kind: 'ai' },
  15: { kind: 'row6', party: true },
  16: { kind: 'six' },
  17: { kind: 'card', sp: [3, 4] },
  18: { kind: 'shield', sp: 0 },
  19: { kind: 'card', sp: [5] },
  20: { kind: 'badge' },
  21: { kind: 'badge2' },
  22: { kind: 'timeline' },
  23: { kind: 'year', at: 0, big: true },
  24: { kind: 'tooth', many: true },
  25: { kind: 'paths6' },
  26: { kind: 'ai' },
  27: { kind: 'row6', party: true },
  28: { kind: 'calendar' },
  29: { kind: 'clock', mode: 'day' },
  30: { kind: 'place' },
  31: { kind: 'logo' },
};
// props that can sit large and faded behind a centre-filling lyric
const BACK_OK = new Set(['ai', 'tooth']);
// which session(s) each line talks about (lights the programme strip)
const LINE_SESS = { 4: [0], 5: [0], 6: [1], 7: [1], 8: [2, 4], 9: [3], 10: [5], 11: [0, 1, 2, 3, 4, 5], 13: [0, 1, 2, 3, 4, 5], 15: [0, 1, 2, 3, 4, 5], 16: [0, 1, 2, 3, 4, 5], 17: [3, 4], 18: [0], 19: [5], 22: [0, 1, 2, 3, 4, 5], 25: [0, 1, 2, 3, 4, 5], 27: [0, 1, 2, 3, 4, 5] };

/* ---------------- shared pieces ---------------- */
const AREA = {
  low: { cx: CX, cy: 700, h: 450, a: 1 },
  high: { cx: CX, cy: 375, h: 470, a: 1 },
  back: { cx: CX, cy: 540, h: 760, a: 0.3 },
};
// 0..1 pop with overshoot that starts on time t0
const popAt = (t, t0, d = 0.24, s = 2.4) => { const p = pr(t, t0 - 0.02, t0 + d); return p <= 0 ? 0 : Ease.outBack(p, s); };

// a speaker bursting out of a coloured disc (head pops above the rim)
function speakerPop(i, cx, cy, R, t, t0, sch, o = {}) {
  const p = pr(t, t0 - 0.02, t0 + 0.22);
  if (p <= 0) return;
  const img = IMG.sp[i];
  const s = Ease.outBack(p, 2.8) * (o.s || 1);
  const rise = Ease.outBack(pr(t, t0 + 0.03, t0 + 0.32), 1.8);
  const col = o.col || SP_COL[i];
  g.save();
  g.translate(cx, cy); g.rotate((1 - p) * 0.5 * (i % 2 ? 1 : -1) + (o.rot || 0)); g.scale(s, s);
  circle(R * 0.08, R * 0.12, R, 'rgba(10,20,45,0.22)');
  circle(0, 0, R, col);
  g.lineWidth = R * 0.07; g.strokeStyle = '#FFFFFF'; g.beginPath(); g.arc(0, 0, R * 0.965, 0, TAU); g.stroke();
  if (img && img.width) {
    g.save();
    g.beginPath(); g.arc(0, 0, R * 0.93, 0, TAU); g.rect(-R, -R * 3, R * 2, R * 3); g.clip();
    const ih = R * 2.3, iw = (ih * img.width) / img.height;
    const yb = R * 0.93 + (1 - rise) * R * 1.6;
    g.drawImage(img, -iw / 2, yb - ih, iw, ih);
    g.restore();
  }
  if (o.tag !== false) nameTag(i, 0, R * 1.2, R, t, t0 + 0.12, o.tagSize);
  g.restore();
}
function nameTag(i, x, y, R, t, t0, size) {
  const p = pr(t, t0, t0 + 0.2);
  if (p <= 0) return;
  const S = SPEAKERS[i], fs = size || clamp(R * 0.3, 20, 46);
  setFont(fs, 800); const nw = layout(S.name).w;
  setFont(fs * 0.62, 700); const rw = layout(' ' + S.role).w;
  const w = nw + rw + fs * 1.1, h = fs * 1.55;
  g.save(); g.translate(x, y + (1 - Ease.outBack(p, 2)) * 30); g.globalAlpha *= Math.min(1, p * 3);
  g.fillStyle = '#FFFFFF'; rr(-w / 2, -h / 2, w, h, h / 2); g.fill();
  g.fillStyle = SP_COL[i]; rr(-w / 2, -h / 2, h * 0.26, h, [h / 2, 0, 0, h / 2]); g.fill();
  text(S.name, -w / 2 + fs * 0.6, 1, { size: fs, w: 800, align: 'left', color: C.navy });
  text(S.role, -w / 2 + fs * 0.6 + nw + fs * 0.18, fs * 0.08, { size: fs * 0.62, w: 700, align: 'left', color: 'rgba(19,38,79,0.7)' });
  text(S.org, 0, h / 2 + fs * 0.62, { size: fs * 0.56, w: 700, color: '#FFFFFF', outline: fs * 0.16, ocol: 'rgba(19,38,79,0.85)' });
  g.restore();
}
// rounded white programme card (one row of the poster's table)
function sessionCard(i, x, y, w, t, t0, from) {
  const p = pr(t, t0 - 0.02, t0 + 0.32);
  if (p <= 0) return;
  const S = SPEAKERS[i], e = Ease.outExpo(p), h = 168;
  g.save();
  g.translate(x + (1 - e) * 1200 * from, y);
  g.transform(1, 0, (1 - e) * 0.35 * from, 1, 0, 0);
  g.fillStyle = 'rgba(10,20,45,0.25)'; rr(-w / 2 + 12, -h / 2 + 16, w, h, 30); g.fill();
  g.fillStyle = '#FFFFFF'; rr(-w / 2, -h / 2, w, h, 30); g.fill();
  g.fillStyle = SP_COL[i]; rr(-w / 2, -h / 2, 250, h, [30, 0, 0, 30]); g.fill();
  text('SESSION', -w / 2 + 125, -44, { size: 22, f: 'num', ls: 3, color: '#FFFFFF' });
  text('0' + (i + 1), -w / 2 + 125, 8, { size: 78, f: 'num', color: '#FFFFFF' });
  text(S.time, -w / 2 + 125, 58, { size: 22, w: 800, color: '#FFFFFF' });
  // topic types itself out
  const n = S.topic.length, k = Math.floor(n * Ease.outCubic(pr(t, t0 + 0.12, t0 + 0.75)));
  const tw = w - 250 - 340;
  let fs = 50; setFont(fs, 800); const fw = layout(S.topic).w; if (fw > tw) fs *= tw / fw;
  text(S.topic.slice(0, k), -w / 2 + 290, -14, { size: fs, w: 800, align: 'left', color: C.blue });
  if (S.must && k >= n) { const mw = 70; g.fillStyle = C.blue; rr(-w / 2 + 290, 20, mw, 40, 8); g.fill(); text('필수', -w / 2 + 290 + mw / 2, 41, { size: 24, w: 800, color: '#FFFFFF' }); }
  text(`${S.name} ${S.role} · ${S.org}`, -w / 2 + 290 + (S.must ? 86 : 0), 41, { size: 26, w: 700, align: 'left', color: 'rgba(19,38,79,0.72)' });
  // photo disc at the right end
  const img = IMG.sp[i], R = 66, cx = w / 2 - 110;
  circle(cx, 0, R, C.ice);
  if (img && img.width) { g.save(); g.beginPath(); g.arc(cx, 0, R, 0, TAU); g.clip(); const ih = R * 2.4, iw = (ih * img.width) / img.height; g.drawImage(img, cx - iw / 2, R - ih + 8, iw, ih); g.restore(); }
  g.lineWidth = 6; g.strokeStyle = SP_COL[i]; g.beginPath(); g.arc(cx, 0, R, 0, TAU); g.stroke();
  g.restore();
}

/* ---------------- icons ---------------- */
// molar outline sampled once into a polyline (unit size, centred)
const TOOTH = (() => {
  const segs = [
    [[-0.42, -0.26], [-0.47, -0.52], [-0.24, -0.6], [-0.11, -0.5]],
    [[-0.11, -0.5], [-0.04, -0.45], [0.04, -0.45], [0.11, -0.5]],
    [[0.11, -0.5], [0.24, -0.6], [0.47, -0.52], [0.42, -0.26]],
    [[0.42, -0.26], [0.39, -0.02], [0.33, 0.08], [0.29, 0.27]],
    [[0.29, 0.27], [0.25, 0.46], [0.21, 0.57], [0.15, 0.57]],
    [[0.15, 0.57], [0.07, 0.57], [0.07, 0.31], [0, 0.24]],
    [[0, 0.24], [-0.07, 0.31], [-0.07, 0.57], [-0.15, 0.57]],
    [[-0.15, 0.57], [-0.21, 0.57], [-0.25, 0.46], [-0.29, 0.27]],
    [[-0.29, 0.27], [-0.33, 0.08], [-0.39, -0.02], [-0.42, -0.26]],
  ];
  const pts = [];
  for (const [a, b, c, d] of segs) for (let k = 0; k < 12; k++) {
    const u = k / 12, v = 1 - u;
    pts.push([v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]);
  }
  pts.push(pts[0]);
  return pts;
})();
function toothIcon(x, y, s, col, p = 1, lw = 0.06, fill = null) {
  const pts = TOOTH.map(([a, b]) => [x + a * s, y + b * s]);
  if (fill && p >= 1) { g.beginPath(); pts.forEach(([a, b], k) => (k ? g.lineTo(a, b) : g.moveTo(a, b))); g.fillStyle = fill; g.fill(); }
  g.strokeStyle = col; g.lineWidth = s * lw; g.lineJoin = 'round'; g.lineCap = 'round';
  polyPartial(pts, p);
  g.lineCap = 'butt'; g.lineJoin = 'miter';
}
function robot(x, y, s, col, blink) {
  g.fillStyle = col; rr(x - s / 2, y - s * 0.38, s, s * 0.76, s * 0.2); g.fill();
  g.strokeStyle = col; g.lineWidth = s * 0.07; line(x, y - s * 0.38, x, y - s * 0.58); circle(x, y - s * 0.62, s * 0.08, col);
  const eh = s * 0.14 * (blink ? 0.2 : 1);
  g.fillStyle = '#FFFFFF'; rr(x - s * 0.28, y - eh / 2 - s * 0.04, s * 0.18, eh, s * 0.05); g.fill(); rr(x + s * 0.1, y - eh / 2 - s * 0.04, s * 0.18, eh, s * 0.05); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)'; rr(x - s * 0.18, y + s * 0.16, s * 0.36, s * 0.06, s * 0.03); g.fill();
}
function person(x, y, s, col) {
  circle(x, y - s * 0.42, s * 0.2, col);
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y + s * 0.18, s * 0.34, s * 0.32, 0, Math.PI, 0); g.fill();
}
function pinIcon(x, y, s, col) {
  g.fillStyle = col; g.beginPath();
  g.moveTo(x, y); g.bezierCurveTo(x - s * 0.15, y - s * 0.35, x - s * 0.5, y - s * 0.5, x - s * 0.5, y - s * 0.85);
  g.arc(x, y - s * 0.85, s * 0.5, Math.PI, 0); g.bezierCurveTo(x + s * 0.5, y - s * 0.5, x + s * 0.15, y - s * 0.35, x, y); g.fill();
  circle(x, y - s * 0.85, s * 0.2, '#FFFFFF');
}

/* ---------------- prop renderers: (t, P, A, sch) ---------------- */
// P: { line, a (first word), z (line leaves), cue } · A: area geometry
const PROP = {};

PROP.ai = (t, P, A, sch) => {
  const L = LYRICS[P.line], w = L.words;
  const size = A.h * 0.95, x = A.cx, y = A.cy;
  const p = popAt(t, w[0].t, 0.3, 1.8);
  if (p <= 0) return;
  setFont(size, 400, size * 0.02, 'num');
  const tw = layout('AI').w;
  // circuit traces grow out of the letters, nodes blink on the hats
  const nTr = 14;
  g.save(); g.globalAlpha *= 0.85;
  for (let k = 0; k < nTr; k++) {
    const side = k % 2 ? 1 : -1, yy = y + (rnd(k, 3) - 0.5) * size * 0.8;
    const x0 = x + side * tw * 0.42, len = 180 + rnd(k, 4) * 420;
    const pts = [[x0, yy], [x0 + side * len * 0.4, yy], [x0 + side * len * 0.55, yy + (rnd(k, 5) - 0.5) * 120], [x0 + side * len, yy + (rnd(k, 5) - 0.5) * 120]];
    const q = Ease.outCubic(pr(t, w[0].t + k * 0.04, w[0].t + k * 0.04 + 0.6));
    g.strokeStyle = sch.sub; g.lineWidth = 5;
    const hd = polyPartial(pts, q);
    if (q >= 1) circle(hd[0], hd[1], 10 + 8 * drumEnv(SNARE, t, 10), k % 4 === 0 ? sch.ul : sch.a3);
  }
  g.restore();
  // "AI 이전" = outline, "AI 이후" = filled: the fill sweeps on 이후까지
  g.save(); g.translate(x, y); g.scale(p, p);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = size * 0.02; g.strokeStyle = sch.ink; g.strokeText('AI', 0, size * 0.04);
  const f = Ease.inOutCubic(pr(t, w[3].t - 0.05, w[3].e + 0.25));
  if (f > 0) { g.save(); g.beginPath(); g.rect(-tw / 2 - 20, -size, (tw + 40) * f, size * 2); g.clip(); g.fillStyle = sch.ul; g.fillText('AI', 0, size * 0.04); g.restore(); }
  g.restore();
  const lb = (s, xx, t0, on) => {
    const q = popAt(t, t0, 0.2, 2);
    if (q <= 0) return;
    g.save(); g.translate(xx, y - size * 0.46); g.scale(q, q);
    setFont(34, 400, 6, 'num'); const lw = layout(s).w + 40;
    g.fillStyle = on ? sch.ul : 'transparent'; g.strokeStyle = sch.ink; g.lineWidth = 3; rr(-lw / 2, -26, lw, 52, 26); g.fill(); g.stroke();
    text(s, 0, 2, { size: 34, f: 'num', ls: 6, color: on ? sch.bg : sch.ink });
    g.restore();
  };
  lb('BEFORE', x - tw * 0.62, w[1].t, false);
  lb('AFTER', x + tw * 0.62, w[3].t, f > 0.5);
};

PROP.tooth = (t, P, A, sch) => {
  const w = LYRICS[P.line].words, s = A.h * 0.78, x = A.cx + (P.cue.many ? 0 : 0), y = A.cy;
  const d = pr(t, w[0].t - 0.05, w[1].t + 0.2);
  if (d <= 0) return;
  const bob = Math.sin(t * 5) * 6 + drumEnv(KICK, t, 9) * 14;
  g.save(); g.translate(0, -bob);
  toothIcon(x, y, s, sch.ink, Ease.outCubic(d), 0.045, d >= 1 ? sch.bg : null);
  // sparkle glints
  if (d >= 1) for (let k = 0; k < 3; k++) { const q = fract(t * 0.9 + k / 3); g.save(); g.globalAlpha *= Math.sin(q * Math.PI); shape(0, x - s * 0.25 + k * s * 0.22, y - s * 0.62 - k * 18, 40 + 20 * k, sch.hl, q); g.restore(); }
  g.restore();
  // the big question mark lands on 무엇이, little ones on every snare
  const qp = popAt(t, w[2].t, 0.26, 2.8);
  if (qp > 0) {
    g.save(); g.translate(x, y - bob + s * 0.02); g.rotate(Math.sin(t * 3) * 0.08); g.scale(qp, qp);
    word('?', 0, 0, s * 0.62, 'disp', sch.ul);
    g.restore();
  }
  if (P.cue.many) for (let q = stepIdx(t); q >= stepIdx(t) - 6 && q >= 0; q--) {
    if ((SNARE[q] || 0) < 0.8 || stepT(q) < w[0].t) continue;
    const dt = t - stepT(q), life = 0.5;
    if (dt > life) continue;
    const a = rnd(q, 70) * TAU, r = s * (0.62 + rnd(q, 71) * 0.25);
    const qx = x + Math.cos(a) * r * 1.3, qy = y + Math.sin(a) * r * 0.6;
    g.save(); g.translate(qx, qy); g.rotate((rnd(q, 72) - 0.5) * 0.8); g.globalAlpha *= 1 - pr(dt, life * 0.5, life);
    word('?', 0, 0, 90 * Ease.outBack(pr(dt, 0, 0.18), 3), 'disp', [sch.hl, sch.a3, sch.ul][q % 3]);
    g.restore();
  }
};

PROP.year = (t, P, A, sch) => {
  const w = LYRICS[P.line].words[P.cue.at], s = A.h * (P.cue.big ? 0.62 : 0.52);
  const p = popAt(t, w.t, 0.26, 2);
  if (p <= 0) return;
  const flipT = w.ct[3];                       // the "7" of 2027
  const tile = s * 0.62, gap = s * 0.08, x0 = A.cx - (tile * 4 + gap * 3) / 2 + tile / 2, y = A.cy - s * 0.06;
  g.save(); g.translate(A.cx, A.cy); g.scale(p, p); g.translate(-A.cx, -A.cy);
  '2026'.split('').forEach((d, k) => {
    const x = x0 + k * (tile + gap), th = s * 0.9;
    const lp = popAt(t, w.ct[Math.min(k, 3)], 0.18, 2.6);
    if (lp <= 0) return;
    g.save(); g.translate(x, y); g.scale(1, lp);
    g.fillStyle = 'rgba(10,20,45,0.25)'; rr(-tile / 2 + 8, -th / 2 + 12, tile, th, 18); g.fill();
    g.fillStyle = k === 3 ? sch.ul : sch.ink; rr(-tile / 2, -th / 2, tile, th, 18); g.fill();
    const col = sch.bg;
    if (k < 3) word(d, 0, 4, s * 0.8, 'num', col);
    else {
      // split-flap: 6 folds down into 7
      const f = pr(t, flipT - 0.04, flipT + 0.16);
      if (f < 1) { g.save(); g.beginPath(); g.rect(-tile, 0, tile * 2, th); g.clip(); word('6', 0, 4, s * 0.8, 'num', col); g.restore(); }
      g.save(); g.beginPath(); g.rect(-tile, -th, tile * 2, th); g.clip(); word(f < 0.5 ? '6' : '7', 0, 4, s * 0.8, 'num', col); g.restore();
      if (f >= 0.5) { g.save(); g.beginPath(); g.rect(-tile, 0, tile * 2, th); g.clip(); g.scale(1, f >= 1 ? 1 : (f - 0.5) * 2); word('7', 0, 4, s * 0.8, 'num', col); g.restore(); }
      if (f > 0 && f < 0.5) { g.save(); g.beginPath(); g.rect(-tile, -th, tile * 2, th); g.clip(); g.scale(1, 1 - f * 2); g.fillStyle = sch.ul; rr(-tile / 2, -th / 2, tile, th / 2, 18); g.fill(); word('6', 0, 4, s * 0.8, 'num', col); g.restore(); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-tile / 2, -2, tile, 4);
    }
    g.fillStyle = 'rgba(0,0,0,0.2)'; if (k < 3) g.fillRect(-tile / 2, -2, tile, 4);
    g.restore();
  });
  const f = pr(t, flipT + 0.1, flipT + 0.3);
  if (f > 0) { ring(beatF(t), beatF(flipT + 0.1), x0 + 3 * (tile + gap), y, { r: 420, col: sch.ul, lw: 14, life: 0.7 }); }
  if (t > flipT) text(P.cue.big ? '2027, 먼저 만나는 하루' : '2026. 11. 22 SUN', A.cx, y + s * 0.62, { size: s * 0.16, w: 800, color: sch.ink, alpha: Ease.outCubic(f), ls: 2 });
  g.restore();
};

PROP.bubble = (t, P, A, sch) => {
  const w = LYRICS[P.line].words;
  const bx = A.cx - 300, by = A.cy - 20, bw = 560, bh = 250;
  const p = popAt(t, w[1].t, 0.26, 2.4);
  if (p > 0) {
    g.save(); g.translate(bx, by); g.scale(p, p); g.rotate(-0.04);
    g.fillStyle = 'rgba(10,20,45,0.2)'; rr(-bw / 2 + 10, -bh / 2 + 14, bw, bh, 60); g.fill();
    g.fillStyle = '#FFFFFF'; rr(-bw / 2, -bh / 2, bw, bh, 60); g.fill();
    g.beginPath(); g.moveTo(bw * 0.18, bh / 2 - 4); g.lineTo(bw * 0.42, bh / 2 + 70); g.lineTo(bw * 0.34, bh / 2 - 4); g.fill();
    // typing dots jump on the eighths, then the word lands
    const said = t >= w[2].t;
    if (!said) for (let k = 0; k < 3; k++) { const j = Math.max(0, Math.sin((t / (SPB / 2) - k * 0.33) * Math.PI)); circle(-80 + k * 80, -j * 26, 26, k === 1 ? C.a : C.k); }
    else slamWord('말 한마디', 0, 0, 92, 'disp', C.navy, pr(t, w[2].t, w[2].t + 0.2));
    g.restore();
  }
  speakerPop(P.cue.sp, A.cx + 420, A.cy + 10, A.h * 0.36, t, w[0].t, sch);
};

PROP.card = (t, P, A, sch) => {
  const L = LYRICS[P.line], sps = P.cue.sp;
  sps.forEach((i, k) => {
    const n = sps.length, y = n === 1 ? A.cy : A.cy + (k - 0.5) * 200;
    const t0 = n === 1 ? L.words[0].t : L.words[Math.min(L.words.length - 1, k * 2)].t;
    sessionCard(i, A.cx, y, 1540, t, t0, k % 2 ? -1 : 1);
  });
};

PROP.clock = (t, P, A, sch) => {
  const w = LYRICS[P.line].words, R = A.h * 0.4;
  const day = P.cue.mode === 'day';
  const x = day ? A.cx - 360 : A.cx - 420, y = A.cy;
  const p = popAt(t, w[0].t, 0.26, 2.2);
  if (p <= 0) return;
  // minutes since midnight
  let mins;
  if (day) {
    const a = 9.5 * 60, b = 17.5 * 60, i5 = w.findIndex((x) => x.w === '다섯');
    const pa = pr(t, w[0].t, w[3].e), pb = pr(t, w[i5].t, w[w.length - 1].e + 0.3);
    mins = lerp(a - 60, a, Ease.outCubic(pa)) + (b - a) * Ease.inOutCubic(pb);
  } else {
    // the hours race, then settle on the downbeat after 바꾸고
    const end = w[w.length - 1].t, q = pr(t, w[0].t, end + 0.2);
    mins = 10 * 60 + 720 * 3 * Ease.inOutCubic(q) * (q < 1 ? 1 : 1);
  }
  g.save(); g.translate(x, y); g.scale(p, p);
  circle(10, 14, R, 'rgba(10,20,45,0.22)');
  circle(0, 0, R, '#FFFFFF');
  g.lineWidth = R * 0.08; g.strokeStyle = sch.dark ? C.k : C.navy; g.beginPath(); g.arc(0, 0, R * 0.96, 0, TAU); g.stroke();
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * TAU, big = k % 5 === 0;
    g.strokeStyle = big ? C.navy : 'rgba(19,38,79,0.35)'; g.lineWidth = big ? R * 0.035 : R * 0.012;
    line(Math.cos(a) * R * (big ? 0.72 : 0.8), Math.sin(a) * R * (big ? 0.72 : 0.8), Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
  }
  // session arc on the dial for the conference day
  if (day) { g.globalAlpha *= 0.85; arcStroke(0, 0, R * 0.62, ((9.5 / 12) * TAU) - Math.PI / 2, ((9.5 / 12) * TAU) - Math.PI / 2 + ((mins - 570) / 720) * TAU, C.a2, R * 0.1, 'butt'); g.globalAlpha /= 0.85; }
  const hA = ((mins / 60) % 12) / 12 * TAU - Math.PI / 2, mA = ((mins % 60) / 60) * TAU - Math.PI / 2;
  g.lineCap = 'round';
  g.strokeStyle = C.navy; g.lineWidth = R * 0.08; line(0, 0, Math.cos(hA) * R * 0.48, Math.sin(hA) * R * 0.48);
  g.strokeStyle = C.a; g.lineWidth = R * 0.05; line(0, 0, Math.cos(mA) * R * 0.74, Math.sin(mA) * R * 0.74);
  g.lineCap = 'butt';
  circle(0, 0, R * 0.07, C.navy);
  g.restore();
  if (day) {
    const hh = Math.floor(mins / 60), mm = Math.floor(mins % 60);
    const s = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const dx = A.cx + 260;
    g.save(); g.globalAlpha *= p;
    text(hh < 12 ? 'AM' : 'PM', dx, A.cy - 150, { size: 44, f: 'num', ls: 6, color: sch.ul });
    numText(s, dx, A.cy + 70, { size: 230, f: 'num', color: sch.ink, align: 'center' });
    g.restore();
  } else {
    speakerPop(P.cue.sp, A.cx + 430, A.cy + 10, A.h * 0.36, t, w[1].t, sch);
  }
};

PROP.agents = (t, P, A, sch) => {
  const w = LYRICS[P.line].words;
  const cols = 8, rows = 3, s = 74, gx = 108, gy = 108;
  const x0 = A.cx - ((cols - 1) * gx) / 2, y0 = A.cy - ((rows - 1) * gy) / 2;
  for (let k = 0; k < cols * rows; k++) {
    const c = k % cols, r = Math.floor(k / cols);
    if ((c === 0 || c === cols - 1)) continue;   // speakers stand at the ends
    const t0 = w[0].t + ((k * 7) % (cols * rows)) * (SPB / 4) * 0.5;
    const p = popAt(t, t0, 0.2, 3);
    if (p <= 0) continue;
    const hop = t >= w[3].t ? Math.abs(Math.sin(((t - w[3].t) / SPB) * Math.PI)) * 16 : 0;
    g.save(); g.translate(x0 + c * gx, y0 + r * gy - hop); g.scale(p, p);
    robot(0, 0, s, KADA4[(c + r) % 4], fract(t * 0.7 + rnd(k, 3)) < 0.06);
    g.restore();
  }
  speakerPop(P.cue.sp[0], A.cx - 700, A.cy + 20, A.h * 0.3, t, w[P.cue.at[0]].t, sch);
  speakerPop(P.cue.sp[1], A.cx + 700, A.cy + 20, A.h * 0.3, t, w[P.cue.at[1]].t, sch);
};

PROP.blueprint = (t, P, A, sch) => {
  const w = LYRICS[P.line].words;
  const cx = A.cx - 240, cy = A.cy, R = A.h * 0.36;
  const p = pr(t, w[0].t - 0.05, w[0].t + 0.4);
  if (p <= 0) return;
  // drafting grid
  g.save(); g.globalAlpha *= 0.5 * p; g.strokeStyle = sch.sub; g.lineWidth = 1.5;
  for (let x = cx - 560; x <= cx + 560; x += 56) line(x, cy - R * 1.2, x, cy + R * 1.2);
  for (let y = cy - R * 1.2; y <= cy + R * 1.2; y += 56) line(cx - 560, y, cx + 560, y);
  g.restore();
  // hub + five nodes wired up one per beat
  const N = 5;
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + (k / N) * TAU, nx = cx + Math.cos(a) * R * 1.35, ny = cy + Math.sin(a) * R * 0.95;
    const t0 = w[0].t + k * SPB * 0.5, q = Ease.outCubic(pr(t, t0, t0 + 0.3));
    if (q <= 0) continue;
    g.strokeStyle = sch.ink; g.lineWidth = 5; g.setLineDash([14, 10]); g.lineDashOffset = -t * 60;
    polyPartial([[cx, cy], [nx, ny]], q); g.setLineDash([]);
    const pp = popAt(t, t0 + 0.2, 0.2, 2.6);
    if (pp > 0) { g.save(); g.translate(nx, ny); g.scale(pp, pp); g.fillStyle = KADA4[k % 4]; rr(-58, -40, 116, 80, 18); g.fill(); [toothIcon.bind(null, 0, 0, 52, '#fff', 1, 0.09), () => robot(0, 4, 50, '#fff'), () => person(0, 8, 54, '#fff'), () => { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.stroke(); line(0, 0, 0, -14); line(0, 0, 10, 4); }, () => { g.fillStyle = '#fff'; for (let b = 0; b < 3; b++) g.fillRect(-26 + b * 20, 18 - (b + 1) * 12, 12, (b + 1) * 12); }][k](); g.restore(); }
  }
  const hp = popAt(t, w[0].t, 0.24, 2.4);
  g.save(); g.translate(cx, cy); g.scale(hp, hp); circle(0, 0, 88, sch.ul); word('AI', 0, 6, 80, 'num', sch.bg); g.restore();
  speakerPop(P.cue.sp, A.cx + 520, A.cy + 10, A.h * 0.36, t, w[1].t, sch);
};

PROP.team = (t, P, A, sch) => {
  const w = LYRICS[P.line].words;
  const n = 9, x0 = A.cx - 620, sp = 105;
  for (let k = 0; k < n; k++) {
    const t0 = k === 0 ? w[0].t : w[2].t + (k - 1) * SPB * 0.25;
    const p = popAt(t, t0, 0.2, 2.6);
    if (p <= 0) continue;
    const grow = k === 0 ? 1 : 0.7 + 0.3 * Ease.outCubic(pr(t, w[3].t, w[3].e + 0.2));
    const x = x0 + (k % 5) * sp + (k >= 5 ? sp / 2 : 0), y = A.cy + (k >= 5 ? 90 : -30);
    g.save(); g.translate(x, y); g.scale(p * grow, p * grow);
    person(0, 0, 120, k === 0 ? sch.ul : KADA4[k % 4]);
    g.restore();
  }
  // heart over the first one on 이해하고
  const hp = popAt(t, w[1].t, 0.2, 3);
  if (hp > 0) { g.save(); g.translate(x0, A.cy - 150); g.scale(hp, hp); g.fillStyle = C.a; g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(-40, -10, -22, -42, 0, -22); g.bezierCurveTo(22, -42, 40, -10, 0, 18); g.fill(); g.restore(); }
  speakerPop(P.cue.sp, A.cx + 560, A.cy + 10, A.h * 0.36, t, w[0].t, sch);
};

// six speakers in a row; who pops is cued per syllable
function sixRow(t, A, times, R, sch, o = {}) {
  const gap = (W - 260) / 6;
  for (let k = 0; k < 6; k++) {
    const x = 130 + gap * (k + 0.5), hop = o.hop ? o.hop(k) : 0;
    speakerPop(k, x, A.cy + (o.dy || 0) - hop, R, t, times[k], sch, { tagSize: o.tag, rot: o.rot ? (k - 2.5) * 0.04 : 0 });
  }
}
PROP.six = (t, P, A, sch) => {
  // 여섯 연자의 경험이 한자리에: one speaker per syllable, then they huddle on 한자리에
  const w = LYRICS[P.line].words, cts = [w[0].ct[0], w[0].ct[1], w[1].ct[0], w[1].ct[1], w[1].ct[2], w[2].ct[0]];
  const gather = Ease.inOutCubic(pr(t, w[3].t, w[3].e + 0.2));
  const R = A.h * 0.25 * (1 + 0.08 * gather);
  const hop = (k) => (t >= w[3].t ? Math.abs(Math.sin(((t - w[3].t) / (SPB / 2) + k * 0.15) * Math.PI)) * 30 : 0);
  g.save(); g.translate(CX, A.cy); g.scale(1 - 0.12 * gather, 1); g.translate(-CX, -A.cy);
  sixRow(t, { cy: A.cy + 20 }, cts, R, sch, { hop, tag: 26 });
  g.restore();
  for (let k = 0; k < 6; k++) ring(beatF(t), beatF(cts[k]), 130 + ((W - 260) / 6) * (k + 0.5), A.cy + 20, { r: 260, col: SP_COL[k], lw: 12, life: 0.5 });
};
PROP.row6 = (t, P, A, sch) => {
  const L = LYRICS[P.line], w = L.words;
  const all = w.flatMap((x) => x.ct.filter((_, c) => /[가-힣]/.test(x.w[c])));
  const times = [0, 1, 2, 3, 4, 5].map((k) => all[Math.min(all.length - 1, k)]);
  const hop = P.cue.party ? (k) => (t >= w[0].t ? Math.abs(Math.sin(((t - w[0].t) / (SPB / 2) + k * 0.2) * Math.PI)) * 24 : 0) : null;
  sixRow(t, A, times, A.h * 0.22, sch, { hop, tag: 22, rot: true });
  if (P.cue.party) {
    const hs = w.filter((x) => x.w.startsWith('함께'));
    hs.forEach((x, k) => confetti(beatF(t), beatF(x.t), k ? W * 0.75 : W * 0.25, A.cy - 150, { n: 50, seed: 30 + k + P.line, v0: 500, v1: 1500, life: 1.6 }));
  }
};
PROP.paths6 = (t, P, A, sch) => {
  // six roads from one start, each speaker travels their own
  const w = LYRICS[P.line].words, n = w.length;
  const ox = A.cx, oy = A.cy + A.h * 0.55;
  const tA = w[0].t, tB = w[n - 1].e + 0.2;
  for (let k = 0; k < 6; k++) {
    const ex = 180 + k * ((W - 360) / 5), ey = A.cy - A.h * 0.28 + (k % 2 ? 60 : -10);
    const mx = ox + (ex - ox) * 0.3 + (k - 2.5) * 40, my = oy - A.h * 0.35;
    const pts = [];
    for (let j = 0; j <= 24; j++) { const u = j / 24, v = 1 - u; pts.push([v * v * ox + 2 * v * u * mx + u * u * ex, v * v * oy + 2 * v * u * my + u * u * ey]); }
    const q = Ease.outCubic(pr(t, tA + k * 0.08, tB));
    g.strokeStyle = SP_COL[k]; g.lineWidth = 14; g.lineCap = 'round'; g.setLineDash([2, 26]);
    const hd = polyPartial(pts, q); g.setLineDash([]); g.lineCap = 'butt';
    if (q > 0) speakerPop(k, hd[0], hd[1], A.h * 0.13, t, tA + k * 0.08, sch, { tag: false });
    if (q >= 1) text('0' + (k + 1), ex, ey + A.h * 0.2, { size: 30, f: 'num', ls: 3, color: sch.ink });
  }
  const p = popAt(t, tA, 0.2, 2);
  if (p > 0) { g.save(); g.translate(ox, oy); g.scale(p, p); circle(0, 0, 28, sch.ink); g.restore(); }
};

PROP.shield = (t, P, A, sch) => {
  const w = LYRICS[P.line].words, x = A.cx - 330, y = A.cy, s = A.h * 0.8;
  const p = popAt(t, w[0].t, 0.26, 2.2);
  if (p > 0) {
    g.save(); g.translate(x, y); g.scale(p, p);
    const sh = () => { g.beginPath(); g.moveTo(0, -s * 0.5); g.bezierCurveTo(s * 0.22, -s * 0.38, s * 0.38, -s * 0.4, s * 0.4, -s * 0.36); g.bezierCurveTo(s * 0.42, s * 0.05, s * 0.3, s * 0.32, 0, s * 0.5); g.bezierCurveTo(-s * 0.3, s * 0.32, -s * 0.42, s * 0.05, -s * 0.4, -s * 0.36); g.bezierCurveTo(-s * 0.38, -s * 0.4, -s * 0.22, -s * 0.38, 0, -s * 0.5); g.closePath(); };
    g.save(); g.translate(10, 14); sh(); g.fillStyle = 'rgba(10,20,45,0.22)'; g.fill(); g.restore();
    sh(); g.fillStyle = C.blue; g.fill(); g.lineWidth = s * 0.03; g.strokeStyle = '#fff'; g.stroke();
    // the check mark is drawn on 분쟁
    const iw = w.findIndex((x) => x.w.startsWith('분쟁'));
    g.strokeStyle = '#fff'; g.lineWidth = s * 0.07; g.lineCap = 'round'; g.lineJoin = 'round';
    polyPartial([[-s * 0.16, 0], [-s * 0.03, s * 0.13], [s * 0.18, -s * 0.12]], Ease.outCubic(pr(t, w[iw].t, w[iw].t + 0.25)));
    g.lineCap = 'butt';
    g.restore();
    const mp = popAt(t, w[iw].e, 0.2, 3);
    if (mp > 0) { g.save(); g.translate(x + s * 0.32, y - s * 0.36); g.rotate(0.18); g.scale(mp, mp); g.fillStyle = C.a; rr(-62, -30, 124, 60, 12); g.fill(); text('필수', 0, 2, { size: 34, w: 900, color: '#fff' }); g.restore(); }
  }
  speakerPop(P.cue.sp, A.cx + 380, A.cy + 10, A.h * 0.36, t, w[0].t + 0.05, sch);
};

function creditBadge(x, y, s, label, sub, num, col, p) {
  if (p <= 0) return;
  const w = 760 * s, h = 190 * s;
  g.save(); g.translate(x, y); g.scale(p, p);
  g.fillStyle = 'rgba(10,20,45,0.22)'; rr(-w / 2 + 10, -h / 2 + 14, w, h, h / 2); g.fill();
  g.fillStyle = '#FFFFFF'; rr(-w / 2, -h / 2, w, h, h / 2); g.fill();
  g.strokeStyle = C.blue; g.lineWidth = 8 * s; rr(-w / 2 + 10 * s, -h / 2 + 10 * s, w - 20 * s, h - 20 * s, h / 2 - 10 * s); g.stroke();
  toothIcon(-w / 2 + 110 * s, 6 * s, 104 * s, C.blue, 1, 0.07);
  text(label, -w / 2 + 190 * s, sub ? -24 * s : 2 * s, { size: 46 * s, w: 800, align: 'left', color: C.navy });
  if (sub) text(sub, -w / 2 + 190 * s, 34 * s, { size: 34 * s, w: 700, align: 'left', color: 'rgba(19,38,79,0.7)' });
  if (num) numUnit(num, '점', w / 2 - 60 * s, 46 * s, { size: 128 * s, f: 'num', unitSize: 54 * s, uw: 900, align: 'right', color: col, unitColor: col });
  else { g.strokeStyle = col; g.lineWidth = 5 * s; g.setLineDash([10 * s, 10 * s]); rr(w / 2 - 190 * s, -58 * s, 130 * s, 116 * s, 18 * s); g.stroke(); g.setLineDash([]); }
  g.restore();
}
PROP.badge = (t, P, A, sch) => {
  const w = LYRICS[P.line].words, iN = w.findIndex((x) => x.w === '네');
  const p = popAt(t, w[0].t, 0.26, 2.2);
  const cnt = t < w[iN].t - 0.02 ? '' : String(Math.min(4, 1 + Math.floor((t - w[iN].t + 0.02) / 0.05)));
  creditBadge(A.cx, A.cy, 1.5, '치과의사 보수교육', '(필수 2점 포함)', cnt, C.purple, p);
  if (t >= w[iN].t) ring(beatF(t), beatF(w[iN].t), A.cx + 470, A.cy, { r: 360, col: C.purple, lw: 14, life: 0.6 });
};
PROP.badge2 = (t, P, A, sch) => {
  const w = LYRICS[P.line].words;
  creditBadge(A.cx - 200, A.cy - 95, 1.05, '치과의사 보수교육', '(필수 2점 포함)', '4', C.purple, 1);
  const iD = w.findIndex((x) => x.w === '두');
  // the 필수 stamp slams on, then the hygienists' badge slides in
  const sp = pr(t, w[0].t, w[0].t + 0.16);
  if (sp > 0) {
    g.save(); g.translate(A.cx + 330, A.cy - 170); g.rotate(-0.16); g.scale(lerp(2.4, 1, Ease.outExpo(sp)), lerp(2.4, 1, Ease.outExpo(sp))); g.globalAlpha *= Math.min(1, sp * 3);
    g.strokeStyle = C.a; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 105, 0, TAU); g.stroke(); g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 88, 0, TAU); g.stroke();
    text('필수', 0, -24, { size: 48, w: 900, color: C.a }); text('2점', 0, 34, { size: 56, f: 'num', color: C.a });
    g.restore();
  }
  creditBadge(A.cx + 180, A.cy + 125, 1.05, '치과위생사 보수교육', '', '2', C.purple, popAt(t, w[iD].t, 0.26, 2.2));
};

PROP.timeline = (t, P, A, sch) => {
  const w = LYRICS[P.line].words;
  const h0 = 9, h1 = 17.5, x0 = 170, x1 = W - 170, y = A.cy + 40;
  const X = (h) => lerp(x0, x1, (h - h0) / (h1 - h0));
  const p = pr(t, w[0].t - 0.05, w[0].t + 0.3);
  if (p <= 0) return;
  // axis
  g.strokeStyle = sch.ink; g.lineWidth = 5; line(x0, y, lerp(x0, x1, Ease.outCubic(p)), y);
  for (let h = 9; h <= 17; h++) { text(String(h).padStart(2, '0') + ':00', X(h), y + 44, { size: 24, f: 'num', color: sch.sub, alpha: p }); g.fillStyle = sch.ink; g.fillRect(X(h) - 2, y - 10, 4, 20); }
  // blocks fill along the sung syllables
  const blocks = [[9.5, 11.5, 0], [11.5, 12 + 20 / 60, 1], [12 + 20 / 60, 13.5, -1, '점심 · QI 경진대회'], [13.5, 14 + 20 / 60, 2], [14 + 35 / 60, 15 + 25 / 60, 3], [15 + 25 / 60, 16.25, 4], [16.5, 17 + 20 / 60, 5]];
  const syl = w.flatMap((x) => x.ct);
  const sweep = Ease.inOutCubic(pr(t, w[0].t, w[w.length - 1].e + 0.2));
  const now = lerp(h0, h1, sweep);
  blocks.forEach(([a, b, i, lab], k) => {
    const t0 = syl[Math.min(syl.length - 1, k + 1)], q = Ease.outBack(pr(t, t0, t0 + 0.22), 2.2);
    if (q <= 0) return;
    const xa = X(a), xb = X(b), bh = 92 * q;
    g.fillStyle = i < 0 ? sch.sub : SP_COL[i]; rr(xa + 3, y - 18 - bh, xb - xa - 6, bh, 12); g.fill();
    if (i >= 0) {
      text('S0' + (i + 1), (xa + xb) / 2, y - 18 - bh / 2, { size: 30, f: 'num', color: '#FFFFFF', alpha: q });
      const S = SPEAKERS[i];
      text(S.name, (xa + xb) / 2, y - 140, { size: 30, w: 800, color: sch.ink, alpha: clamp(q) });
      const img = IMG.sp[i], R = 46, cx = (xa + xb) / 2, cy = y - 220;
      if (img && img.width && q > 0.5) { g.save(); g.globalAlpha *= clamp((q - 0.5) * 2); circle(cx, cy, R, SP_COL[i]); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip(); const ih = R * 2.4, iw = (ih * img.width) / img.height; g.drawImage(img, cx - iw / 2, cy + R - ih + 6, iw, ih); g.restore(); }
    } else text(lab, (xa + xb) / 2, y - 18 - bh / 2, { size: 22, w: 800, color: sch.ink, alpha: q });
  });
  // the "now" cursor
  if (sweep > 0 && sweep < 1) { g.fillStyle = sch.ul; g.fillRect(X(now) - 3, y - 130, 6, 150); circle(X(now), y, 12, sch.ul); }
};

PROP.calendar = (t, P, A, sch) => {
  const w = LYRICS[P.line].words;
  const cw = 124, ch = 64, x0 = A.cx - cw * 3;
  const p = popAt(t, w[0].t, 0.26, 2);
  if (p <= 0) return;
  g.save(); g.translate(A.cx, A.cy); g.scale(p, p); g.translate(-A.cx, -A.cy);
  const bw = cw * 7 + 60, bh = ch * 6.6 + 40;
  g.fillStyle = 'rgba(10,20,45,0.22)'; rr(A.cx - bw / 2 + 12, A.cy - bh / 2 + 16, bw, bh, 32); g.fill();
  g.fillStyle = '#FFFFFF'; rr(A.cx - bw / 2, A.cy - bh / 2, bw, bh, 32); g.fill();
  g.fillStyle = C.navy; rr(A.cx - bw / 2, A.cy - bh / 2, bw, ch * 1.1, [32, 32, 0, 0]); g.fill();
  text('2026', A.cx - bw / 2 + 40, A.cy - bh / 2 + ch * 0.56, { size: 44, f: 'num', align: 'left', color: C.d, ls: 2 });
  text('11월 · NOVEMBER', A.cx + bw / 2 - 40, A.cy - bh / 2 + ch * 0.56, { size: 36, w: 800, align: 'right', color: '#FFFFFF' });
  const yd = A.cy - bh / 2 + ch * 1.55;
  '일월화수목금토'.split('').forEach((d, k) => text(d, x0 + k * cw, yd, { size: 28, w: 800, color: k === 0 ? C.a : 'rgba(19,38,79,0.6)' }));
  // 1 Nov 2026 is a Sunday
  const i22 = w.findIndex((x) => x.w.startsWith('22')), iSun = w.findIndex((x) => x.w === '일요일');
  for (let d = 1; d <= 30; d++) {
    const k = d - 1, c = k % 7, r = Math.floor(k / 7);
    const t0 = w[0].t + (c + r) * 0.035, q = popAt(t, t0, 0.18, 2.4);
    if (q <= 0) continue;
    const x = x0 + c * cw, y = yd + ch * 0.95 + r * ch;
    if (d === 22) {
      const hp = popAt(t, w[i22].t, 0.2, 3);
      if (hp > 0) { circle(x, y, 40 * hp, C.a); }
      g.save(); g.translate(x, y); g.scale(q * (1 + 0.5 * hp * Math.exp(-(t - w[i22].t) * 4)), q * (1 + 0.5 * hp * Math.exp(-(t - w[i22].t) * 4)));
      text('22', 0, 2, { size: 40, f: 'num', color: hp > 0.5 ? '#FFFFFF' : C.a }); g.restore();
      penCircle(x, y, 58, 50, 6, C.d, pr(t, w[iSun].t, w[iSun].t + 0.35), 22);
    } else { g.save(); g.translate(x, y); g.scale(q, q); text(String(d), 0, 2, { size: 34, f: 'num', color: c === 0 ? C.a : C.navy }); g.restore(); }
  }
  g.restore();
  const sp = pr(t, w[iSun].t, w[iSun].t + 0.16);
  if (sp > 0) stamp('SUN', A.cx + bw / 2 - 10, A.cy - bh / 2 + 10, 62, sch.ul, w[iSun].t, t, 0.16);
};

PROP.place = (t, P, A, sch) => {
  const w = LYRICS[P.line].words;
  const iB = w.findIndex((x) => x.w === '지하'), iL = w.findIndex((x) => x.w === '1층');
  // elevator panel counting down on the beats: 3 2 1 B1
  const x = A.cx + 420, y = A.cy, pw = 420, ph = 300;
  const p = popAt(t, w[0].t, 0.26, 2.2);
  if (p > 0) {
    g.save(); g.translate(x, y); g.scale(p, p);
    g.fillStyle = 'rgba(10,20,45,0.25)'; rr(-pw / 2 + 12, -ph / 2 + 16, pw, ph, 30); g.fill();
    g.fillStyle = '#0B1530'; rr(-pw / 2, -ph / 2, pw, ph, 30); g.fill();
    g.strokeStyle = '#3A4A70'; g.lineWidth = 6; rr(-pw / 2 + 14, -ph / 2 + 14, pw - 28, ph - 28, 20); g.stroke();
    const steps = Math.floor(Math.max(0, t - w[1].t) / SPB);
    const fl = t >= w[iB].t ? 'B1' : ['3', '2', '1'][Math.min(2, steps)] || '1';
    const lit = t >= w[iB].t;
    g.save(); g.shadowColor = lit ? C.d : '#FF6A3D'; g.shadowBlur = 30;
    word(fl, 40, 16, 190, 'num', lit ? C.d : '#FF6A3D');
    g.restore();
    // arrow
    const ay = -20 + ((t * 2) % 1) * 30;
    g.fillStyle = lit ? C.d : '#FF6A3D'; g.beginPath(); g.moveTo(-150, ay + 40); g.lineTo(-110, ay - 10); g.lineTo(-190, ay - 10); g.closePath(); g.fill();
    g.restore();
  }
  // a pin drops onto the hospital name
  const q = pr(t, w[0].t - 0.02, w[0].t + 0.4);
  if (q > 0) {
    const px = A.cx - 420, py = A.cy + 40;
    const drop = (1 - Ease.outBack(q, 2.2)) * -360;
    g.fillStyle = 'rgba(10,20,45,0.2)'; g.beginPath(); g.ellipse(px, py + 6, 60 * Ease.outCubic(q), 16, 0, 0, TAU); g.fill();
    pinIcon(px, py + drop, 180, sch.ul);
    const tp = Ease.outCubic(pr(t, w[1].t, w[1].t + 0.3));
    if (tp > 0) {
      text('서울성모병원', px, py + 70, { size: 54, w: 900, color: sch.ink, alpha: tp });
      text('대강당 · 지하 1층', px, py + 130, { size: 36, w: 800, color: sch.ink, alpha: Ease.outCubic(pr(t, w[iL].t, w[iL].t + 0.3)) * 0.8 });
    }
  }
};

PROP.logo = (t, P, A, sch) => {
  const w = LYRICS[P.line].words, img = IMG.logo;
  if (!img || !img.width) return;
  const p = popAt(t, w[0].t, 0.32, 2);
  if (p <= 0) return;
  const lw = Math.min(820, A.h * 1.6), lh = (lw * img.height) / img.width;
  // four rings, one per letter colour, on the first four syllables
  w[0].ct.slice(0, 4).forEach((c, k) => ring(beatF(t), beatF(c), A.cx - lw * 0.38 + k * lw * 0.25, A.cy, { r: 520, col: KADA4[k], lw: 18, life: 0.8 }));
  const wob = Math.sin(t * 4) * 0.015;
  g.save(); g.translate(A.cx, A.cy - 10); g.rotate(wob); g.scale(p, p);
  g.fillStyle = 'rgba(255,255,255,0.92)'; rr(-lw / 2 - 50, -lh / 2 - 40, lw + 100, lh + 80, 44); g.fill();
  g.drawImage(img, -lw / 2, -lh / 2, lw, lh);
  g.restore();
};

// draw every prop whose line is on screen
function drawProps(t, sch) {
  for (const P of PROPS) {
    if (t < P.a - 0.1 || t > P.z + EXIT_DUR) continue;
    const A = AREA[P.area];
    const q = pr(t, P.z, P.z + EXIT_DUR);
    g.save();
    if (A.a < 1) g.globalAlpha *= A.a;
    if (q > 0) {
      // props fly off toward the viewer with their line
      const s = Math.exp(Ease.inQuad(q) * 1.6);
      g.translate(A.cx, A.cy); g.scale(s, s); g.translate(-A.cx, -A.cy);
      g.globalAlpha *= 1 - Ease.inQuad(q);
    }
    PROP[P.cue.kind](t, P, A, sch);
    g.restore();
  }
}
