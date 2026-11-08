'use strict';
/* ============================================================
   SCENES — the timeline: piano state, chord light, the door,
   the walk through it, and what each lyric line brings in
   ============================================================ */

/* ---------------- lines & sections ---------------- */
const LN = LYRICS.map(([sec, txt, words], i) => {
  const first = words[0][1], last = words[words.length - 1][2];
  // one time per sung syllable (Hangul char or English word), in order
  const syl = [];
  words.forEach(([w, a, z, ts]) => {
    if (/[A-Za-z]/.test(w)) syl.push(a);
    else [...w].forEach((ch, k) => { if (/[가-힣]/.test(ch)) syl.push(ts[k]); });
  });
  return { i, sec, txt, words, first, last, syl };
});
LN.forEach((l, i) => {
  const nx = LN[i + 1];
  l.a = l.first - 0.2;
  l.z = nx ? clamp(nx.first - 0.16, l.last + 0.3, l.last + 1.8) : l.last + 1.8;
});
// the outro's two lines stay up and become the end card
LN[LN.length - 2].z = LN[LN.length - 1].z = 1e9;
const SY = (li, k) => LN[li].syl[Math.min(k, LN[li].syl.length - 1)];
const END_T = 79.7;                     // last sung syllable ~78.9; the piano plays the song out
const SECTS = [
  { t: 0, name: '인트로' }, { t: 9.6, name: '1절' }, { t: 27.0, name: '후렴' }, { t: 39.3, name: '2절' },
  { t: 55.3, name: '후렴' }, { t: 75.6, name: '아웃트로' }, { t: END_T, name: '피아노' }, { t: DUR - 0.3, name: null, kind: 'end' },
];
SECTS.forEach((s) => (s.kind = s.kind || 'sec'));
let ENERGY = null, LAYOUTS = new Map();
async function loadImages() {}

/* ---------------- the piano: chord every two beats, hits from the stem ---------------- */
const PT = PIANO.map((e) => e[0]);
function chordIdx(t) { const b = Math.floor((t - BEAT0) / SPB / 2); return ((b % 4) + 4) % 4; }
const LIGHTCOL = ['#FFB45C', '#FF957A', '#FFCB72', '#FFE6A0'];   // Fm amber · Fm/E♭ rose · D♭ honey · C7 lemon
let P_LCOL = LIGHTCOL[0];
function lightColAt(t) {
  const b = (t - BEAT0) / SPB / 2, i = chordIdx(t), p = fract(b) * 2 * SPB; // seconds since the change
  if (t < BEAT0 - SPB) return LIGHTCOL[0];
  return p < 0.16 ? mixHex(LIGHTCOL[(i + 3) % 4], LIGHTCOL[i], p / 0.16) : LIGHTCOL[i];
}
const chordKick = (t) => { const b = (t - BEAT0) / SPB / 2; return b < 0 ? 0 : Math.exp(-fract(b) * 2 * SPB * 5); };
const PS = { key: new Float32Array(128), bulb: new Float32Array(26), lh: 0, rh: 0, pulse: 0 };
function pianoState(t) {
  PS.key.fill(0); PS.bulb.fill(0); PS.lh = PS.rh = 0;
  for (let i = lastBefore(PT, t); i >= 0 && t - PIANO[i][0] < 1.6; i--) {
    const te = PIANO[i][0], v = PIANO[i][1], reg = PIANO[i][2];
    const ch = CHORDS[chordIdx(te + 0.03)], e = v * Math.exp(-(t - te) * (reg ? 5.5 : 3.2));
    if (reg === 0) {
      for (const m of ch.lh) PS.key[m] = Math.max(PS.key[m], e);
      PS.lh = Math.max(PS.lh, e);
    } else {
      for (const m of ch.rh) PS.key[m] = Math.max(PS.key[m], e * 0.8);
      const hm = ch.hi[(i * 7) % 4];
      PS.key[hm] = Math.max(PS.key[hm], e);
      PS.rh = Math.max(PS.rh, e);
      const b0 = (i * 5) % 26;
      for (let d = -1; d <= 1; d++) { const bi = (b0 + d + 26) % 26; PS.bulb[bi] = Math.max(PS.bulb[bi], e * (d ? 0.45 : 1)); }
    }
  }
  // the last chord rings out, then a glissando runs down the keys (the score ends on Fm7 with one)
  const tf = 88.86;
  if (t > tf) {
    const ring = Math.exp(-(t - tf) * 0.9);
    for (const m of [41, 48, 56, 60, 63, 65]) PS.key[m] = Math.max(PS.key[m], ring);
    const gp = (t - tf - 0.15) / 0.75;
    if (gp > 0 && gp < 1.3) for (let m = KB.hi; m >= KB.lo; m--) { if (IS_BLACK[m % 12]) continue; const pos = (KB.hi - m) / (KB.hi - KB.lo); const d = gp - pos; if (d > 0 && d < 0.18) PS.key[m] = Math.max(PS.key[m], 1 - d / 0.18); }
    PS.bulb.fill(Math.max(0.6, ring));
  }
  PS.pulse = Math.min(1, PS.lh * 0.6 + PS.rh * 0.5);
}

/* ---------------- the door and the walk through it ---------------- */
const ZIN = [29.1, 30.6], ZOUT = [74.15, 75.85];
function zoomE(t) {
  if (t < ZIN[0] || t >= ZOUT[1]) return 0;
  if (t < ZIN[1]) return Ease.inOutCubic(pr(t, ZIN[0], ZIN[1]));
  if (t < ZOUT[0]) return 1;
  return 1 - Ease.inOutCubic(pr(t, ZOUT[0], ZOUT[1]));
}
function doorTheta(t) {
  if (t >= ZOUT[0]) return lerp(1.95, 1.42, Ease.inOutCubic(pr(t, ZOUT[0], ZOUT[1] + 0.4)));
  const steps = [[SY(6, 7), 0.24], [SY(8, 0), 0.62], [SY(8, 1), 1.0], [SY(8, 2), 1.42], [SY(8, 3), 1.95]];
  let th = 0;
  for (const [ts, v] of steps) { const p = pr(t, ts - 0.04, ts + 0.42); if (p > 0) th = lerp(th, v, Ease.outBack(p, 1.6)); }
  // the door breathes with the chord changes once it is ajar (C7 pushes a little)
  if (th > 0.1 && th < 0.5) th += 0.04 * chordKick(t) * (chordIdx(t) === 3 ? 1.6 : 0.6);
  return th;
}
function hallParams(t) {
  const th = doorTheta(t);
  const P = {
    th, open: clamp(th / 1.3), lcol: P_LCOL,
    light: 0.72 + 0.5 * PS.pulse,
    crack: t < SY(6, 7) ? 0.25 + 0.75 * pr(t, 0.4, 3.5) * (0.8 + 0.35 * PS.pulse) : 0,
    jiggle: 0,
    bulbsOn: t < 9.6 ? pr(t, 0.65, 8.2) : 1,
  };
  // knob rattles on "큰소리치며"
  for (let k = 2; k <= 6; k++) { const d = t - SY(6, k); if (d > 0 && d < 0.4) P.jiggle += Math.sin(d * 40) * Math.exp(-d * 9); }
  P.memo = memoFn(t);
  P.roomView = () => {
    // the room seen through the doorway; its scale grows toward 1 as the camera goes through
    const e = P.zoom || 0, s = Math.exp(Math.log(4.8) * e), rs = lerp(0.7, 1, e) / s;
    g.fillStyle = '#F2D2A2'; g.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
    g.save(); g.translate(DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h / 2); g.scale(rs, rs); g.translate(-CX, -CY);
    drawRoom(t, roomParams(t));
    g.restore();
    // warm haze in the doorway
    g.fillStyle = hexA(P.lcol, 0.16 * (1 - e)); g.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  };
  return P;
}
function memoFn(t) {
  const t0 = SY(1, 4);
  if (t < t0 - 0.05) return null;
  const pop = popE(t, t0 - 0.05, 0.35, 2.4);
  const fold = Ease.outBack(pr(t, SY(1, 8), SY(1, 8) + 0.35), 2);
  // "오늘은 꼭 전화해" written in as it is sung
  const sy = LN[2].syl; let n = 0;
  const map = [1, 2, 3, 4, 6, 7, 8];
  for (let k = 0; k < 7; k++) if (t >= sy[k]) n = map[k] - 1 + clamp((t - sy[k]) / 0.12);
  const doodle = popE(t, SY(7, 8), 0.4, 2.6);
  return () => { g.save(); g.scale(pop * 0.78, pop * 0.78); g.rotate(-0.05); memoNote(fold, n, doodle); g.restore(); };
}
function hallProps(t, P) {
  // paper cup on the mat ("종이컵"), steaming
  const tc = SY(0, 7);
  if (t > tc - 0.1) { const s = popE(t, tc - 0.08, 0.4, 2.6); paperCup(DOOR.x - 48, FLOOR_Y + 46, 0.95 * s, 1, t); }
  // bread bag ("빵을")
  const tb = SY(5, 6);
  if (t > tb - 0.1 && t < ZOUT[0]) { const s = popE(t, tb - 0.08, 0.45, 2.4); breadBag(DOOR.x - 190, FLOOR_Y + 98, 0.72 * s * (1 + 0.04 * chordKick(t))); }
  // footsteps coming down the corridor ("복도 끝에서 들리는 발소리"), one per beat
  const f0 = SY(4, 0), f1 = SY(5, 6);
  if (t > f0 && t < f1 + 4) {
    const b0 = Math.ceil((f0 - BEAT0) / SPB), b1 = Math.floor((f1 - BEAT0) / SPB);
    for (let b = b0, k = 0; b <= b1; b++, k++) {
      const tb2 = BEAT0 + b * SPB, n = b1 - b0 + 1;
      if (t < tb2) break;
      const x = lerp(-40, DOOR.x - 300, k / Math.max(1, n - 1)), y = FLOOR_Y + 60 + (k % 2 ? 18 : -6);
      const a = Math.min(1, (t - tb2) * 8) * (1 - pr(t, tb2 + 2.2, tb2 + 3.2));
      footprint(x, y, 1, k % 2, a);
      if (t - tb2 < 0.5) glow(x, y, 80, P.lcol, 0.5 * (1 - (t - tb2) / 0.5));
    }
  }
  // the scat behind the door in the intro: notes slip out from under it
  SCAT.forEach(([a, z], k) => {
    const d = t - a;
    if (d < 0 || d > 2.6) return;
    const p = d / 2.6, x = DOOR.x + 60 + ((k * 97) % 280) + Math.sin(d * 3 + k) * 26, y = FLOOR_Y - 10 - p * 420;
    g.save(); g.globalAlpha = (1 - p) * Math.min(1, d * 6);
    glow(x, y, 60, P.lcol, 0.5);
    text(k % 3 === 2 ? '♫' : '♪', x, y, { size: 56 + (z - a) * 30, w: 700, color: P.lcol });
    g.restore();
  });
  // slippers set out for you in the outro
  if (t > SY(30, 0) - 0.3) slippers(DOOR.x + DOOR.w / 2 + 40, FLOOR_Y + 52, 0.9 * popE(t, SY(30, 0) - 0.3, 0.45, 2.2), 1);
}
function phoneProp(t) {
  const a = SY(3, 0) - 0.35, z = SY(4, 0) + 0.4;
  if (t < a || t > z + 0.5) return;
  const up = Ease.outBack(pr(t, a, a + 0.5), 1.3) * (1 - Ease.inCubic(pr(t, z, z + 0.45)));
  const sy = LN[3].syl;
  phone(1700, 1240 - 520 * up, 1.0, {
    calling: clamp((t - sy[8]) * 4) , callT: t,
    keys: (k) => { let v = 0; for (let j = 6; j < sy.length; j++) { const d = t - sy[j]; if (d > 0 && (j * 5) % 12 === k) v = Math.max(v, Math.exp(-d * 5)); } return v; },
  });
}

/* ---------------- the room ---------------- */
const C2 = 29.40;  // chorus 2 = chorus 1 + 12 bars
function roomParams(t) {
  const P = { lcol: P_LCOL, party: 0 };
  // clock: normal, slow-motion on "천천히", racing on "오래"
  let ct = t;
  for (const li of [10, 24]) { const a = SY(li, 3), z = SY(li, 6) + 0.5; if (t > a) ct -= Math.min(t, z) - a; ct += 0.15 * clamp(t - a, 0, z - a); }
  const o0 = SY(16, 8), o1 = SY(16, 10) + 0.8;
  if (t > o0) ct += 9 * Ease.inOutCubic(pr(t, o0, o1));
  P.clockT = ct;
  P.bus = pr(t, SY(17, 0) - 0.3, SY(17, 9) + 0.6);
  if (t > 55) P.party = 0.35 + 0.25 * PS.rh;
  P.roomProps = () => roomProps(t, P);
  P.roomBack = () => roomBack(t, P);
  return P;
}
function cum(t, list) { let n = 0; for (const x of list) if (t >= x) n++; return n; }
function roomProps(t, P) {
  const ty = ROOM.table + 46;
  // bread plate, bitten on "한입"
  breadPlate(380, ty, 0.95, cum(t, [SY(11, 1), SY(25, 1)]));
  // the radio (verse 2 on)
  if (t > SY(15, 0) - 0.3) { const s = popE(t, SY(15, 0) - 0.3, 0.45, 2.2); radio(690, ty + 6, 0.8 * s, t > SY(15, 8), t); }
  // two mugs that meet on "우리 편"
  const meet = Math.max(Ease.outBack(pr(t, SY(9, 3), SY(9, 5)), 1.4) * (1 - pr(t, SY(10, 0), SY(10, 0) + 0.6)), Ease.outBack(pr(t, SY(23, 3), SY(23, 5)), 1.4) * (1 - pr(t, SY(24, 0), SY(24, 0) + 0.6)));
  const bob = 6 * chordKick(t);
  mug(lerp(880, 930, meet), ty + 4 - bob, 0.9, 1, C.terra, 1, t);
  mug(lerp(1130, 1020, meet), ty + 4 - bob * 0.6, 0.9, 1, C.teal, 1, t + 1);
  for (const tm of [SY(9, 5), SY(23, 5)]) { const d = t - tm; if (d > 0 && d < 0.6) { glow(975, ty - 90, 160, '#FFF3C0', 1 - d / 0.6); confetti(t / SPB, tm / SPB, 975, ty - 100, { n: 18, v0: 300, v1: 900, life: 0.7, cols: [C.mustard, C.rose, C.cream], seed: 5 }); } }
  // glass filled on "한 잔 더"
  const fill = Math.max(0.15, Math.min(1, 0.15 + 0.3 * cum(t, [SY(11, 3), SY(11, 4), SY(11, 5)]) - 0.0 + (t > SY(25, 3) ? 0.6 : 0)) - (t > 40 && t < SY(25, 3) ? 0.45 * pr(t, 40, 52) : 0));
  glass(1640, ty + 4, 0.85, fill, t);
  // coins + receipt from the pocket
  for (const [k, tc, x] of [[0, SY(14, 4), 1240], [1, SY(14, 6), 1310]]) {
    if (t < tc - 0.25) continue;
    const d = t - tc, y = d < 0 ? ty - 30 - (-d) * 900 : ty - 30 - Math.abs(Math.sin(d * 9)) * 40 * Math.exp(-d * 4);
    coin(x, y, 30, d < 0 ? 0 : d * 14 * Math.exp(-d * 1.2));
  }
  const tr = SY(14, 9);
  if (t > tr) receipt(1370, ROOM.table + 8, 220 * Ease.outCubic(pr(t, tr, tr + 0.7)), tr);
  // music notes out of the radio while "your song" plays
  const n0 = SY(15, 8);
  if (t > n0 && t < SY(17, 0)) {
    for (let i = lastBefore(PT, t); i >= 0 && t - PT[i] < 2.2; i--) {
      if (PIANO[i][2] !== 1 || PT[i] < n0 || i % 2) continue;
      const d = t - PT[i], p = d / 2.2;
      g.save(); g.globalAlpha = (1 - p) * PIANO[i][1];
      text(i % 4 ? '♪' : '♫', 690 + Math.sin(i * 1.7) * 110 + d * 30, ty - 160 - d * 190, { size: 46, w: 700, color: C.teal });
      g.restore();
    }
  }
  // a little promise note, then next week circled on the calendar
  const tp = SY(20, 2);
  if (t > tp - 0.2 && t < 55.6) {
    const s = popE(t, tp - 0.2, 0.45, 2.4) * (1 - Ease.inCubic(pr(t, 55.1, 55.6)));
    scaled(1730, 640, s, () => {
      g.save(); g.translate(1730, 640); g.rotate(0.08);
      g.fillStyle = '#FFE48A'; rr(-90, -60, 180, 120, 6); g.fill();
      text('약속 ✓', 0, 2, { size: 50, f: 'pen', color: C.ink });
      g.restore();
    });
  }
  const tcal = SY(21, 0);
  if (t > tcal - 0.3 && t < 55.6) {
    const s = popE(t, tcal - 0.3, 0.45, 2.2) * (1 - Ease.inCubic(pr(t, 55.1, 55.6)));
    const cp = Ease.outCubic(pr(t, SY(21, 2), SY(21, 2) + 0.5));
    calendar(640, 560, 0.72 * s, cp, popE(t, SY(21, 5), 0.4, 2.6));
  }
}
function roomBack(t, P) {
  const ty = ROOM.table + 46;
  const ppl = pr(t, SY(15, 0), SY(16, 0)) * (t < ZOUT[0] ? 1 : 0);
  if (ppl > 0) {
    const nod = Math.max(...[SY(19, 5), SY(19, 6)].map((x) => { const d = t - x; return d > 0 && d < 0.45 ? Math.sin((d / 0.45) * Math.PI) : 0; }));
    const smile = pr(t, SY(19, 9), SY(19, 10) + 0.2);
    g.save(); g.globalAlpha = ppl;
    personBehind(1120 + 0, ty - 40, '#8FB3A0', nod, Math.max(smile, t > 55 ? 1 : 0), 1);
    personBehind(1520, ty - 40, C.mustard, 0, 1, 0);
    g.restore();
    // small talk going back and forth ("별일 아닌 얘길 오래 나누다")
    const a = SY(16, 0), z = SY(16, 10) + 0.6;
    if (t > a && t < z) {
      const b = Math.floor((t - a) / SPB), on = 1 - pr(t, z - 0.3, z);
      g.save(); g.globalAlpha = on;
      const left = b % 2 === 0, bx = left ? 1120 : 1520;
      bubble(bx, ty - 300, 150, 74, left ? -30 : 30);
      text('…', bx, ty - 304, { size: 48, w: 800, color: C.ink });
      g.restore();
    }
    // "다음엔 내가 살게" from across the table
    const sa = SY(18, 0), sz = SY(18, 11) + 0.4;
    if (t > sa - 0.1 && t < sz) {
      const s = popE(t, sa - 0.1, 0.4, 2.2) * (1 - pr(t, sz - 0.3, sz));
      scaled(1520, ty - 250, s, () => {
        bubble(1520, ty - 300, 380, 120, 40);
        const n = cum(t, LN[18].syl.slice(0, 7));
        const str = '다음엔 내가 살게'.slice(0, [0, 1, 2, 3, 5, 6, 8, 9][n]);
        text(str, 1340, ty - 302, { size: 64, f: 'pen', align: 'left', color: C.ink });
      });
    }
  }
}
function personBehind(x, y, col, nod, smile, me) {
  g.fillStyle = mixHex(col, '#000000', 0.12); rr(x - 110, y - 60, 220, 160, 60); g.fill();
  face(x, y - 140, 74, col, nod, smile);
}

/* ---------------- per-line plan (style + where) ----------------
   hall lines sit left of the door; room choruses sit centre; verse 2 sits top */
const PLAN = [
  { style: 'story', acc: [4] },
  { style: 'story', acc: [2, 4] },
  { style: 'story', pen: [0, 1, 2] },
  { style: 'story', acc: [3] },
  { style: 'story', acc: [3] },
  { style: 'story', acc: [2] },
  { style: 'story', acc: [2, 3] },
  { style: 'story', acc: [4] },
  { style: 'come', x: 600 },
  { style: 'big', fx: 'team' },
  { style: 'big', fx: 'slow' },
  { style: 'big', fx: 'more' },
  { style: 'big', fx: 'shortbig' },
  { style: 'big', fx: 'start' },
  { style: 'room', acc: [2, 3, 5] },
  { style: 'room', acc: [3] },
  { style: 'room', acc: [3] },
  { style: 'room', acc: [1] },
  { style: 'room', pen: [0, 1, 2] },
  { style: 'room', acc: [2] },
  { style: 'room', acc: [1] },
  { style: 'room', acc: [3] },
  { style: 'come', v: 2, x: 800 },
  { style: 'big', fx: 'team' },
  { style: 'big', fx: 'slow' },
  { style: 'big', fx: 'more' },
  { style: 'big', fx: 'shortbig' },
  { style: 'big', fx: 'start' },
  { style: 'come', v: 2, x: 800 },
  { style: 'big', fx: 'start' },
  { style: 'outro', acc: [1] },
  { style: 'outro2', fx: 'start' },
];
LN.forEach((l, i) => (l.plan = PLAN[i]));

/* ---------------- frame ---------------- */
function drawFrame(t) {
  pianoState(t);
  P_LCOL = lightColAt(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const e = zoomE(t);
  const inRoom = t >= ZIN[1] && t < ZOUT[0];
  if (inRoom) {
    drawRoom(t, roomParams(t));
    vignette(0.28, '#5A2A10');
  } else {
    const P = hallParams(t);
    P.zoom = e;
    const s = Math.exp(Math.log(4.8) * e), dcx = DOOR.x + DOOR.w / 2, dcy = DOOR.y + DOOR.h / 2;
    // end card: a slow push toward the open door
    const push = t > END_T ? 1 + 0.06 * Ease.inOutSine(pr(t, END_T, DUR)) : 1;
    g.save();
    g.translate(lerp(dcx, CX, e), lerp(dcy, CY, e)); g.scale(s * push, s * push); g.translate(-dcx, -dcy);
    drawHall(t, P);
    hallProps(t, P);
    g.restore();
    vignette(0.55 * (1 - e), '#000000');
    phoneProp(t);
  }
  drawKeys(t, { lcol: P_LCOL });
  chordTicker(t, 40, KEY_Y - 26, t > 0.2 ? 0.9 : 0, '#FFF1DC');
  drawLyrics(t);
  drawTitle(t);
  grain(t, 0.08);
  // fade in / out
  const fin = 1 - pr(t, 0, 0.5), fout = pr(t, DUR - 0.9, DUR - 0.1);
  if (fin > 0 || fout > 0) { g.fillStyle = `rgba(0,0,0,${Math.max(fin, fout)})`; g.fillRect(0, 0, W, H); }
  return { flash: 0 };
}
