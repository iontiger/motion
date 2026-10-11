'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   B = t / SPB  (time in beats).  Cue sheet is shared with music.js
   ============================================================ */
let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };

const CHAPTERS = [
  { b: 24, e: 48, n: '01', w: '싸다.', s: '압도적 저평가', tag: '가치' },
  { b: 48, e: 64, n: '02', w: '잘 번다.', s: 'ROE 20.6% · 전 종목 상위 6%', tag: '수익성' },
  { b: 64, e: 80, n: '03', w: '더 번다.', s: '순이익 1조 시대', tag: '성장' },
  { b: 80, e: 96, n: '04', w: '오른다.', s: '6개월 +54% · 상위 3%', tag: '추세' },
  { b: 96, e: 112, n: '05', w: '외국인이 산다.', s: '5거래일 연속 순매수', tag: '수급' },
  { b: 112, e: 136, n: '06', w: '다음 한 방.', s: '해준금 규제 완화 → 배당 재개 기대', tag: '촉매', soft: true },
];

/* ---------------- background ---------------- */
let DOTS = null;
function makeDots() {
  const c = document.createElement('canvas'); c.width = W + 96; c.height = H + 96;
  const x = c.getContext('2d'); x.fillStyle = '#fff';
  for (let yy = 0; yy < c.height; yy += 48) for (let xx = 0; xx < c.width; xx += 48) x.fillRect(xx, yy, 2, 2);
  return c;
}
function waves(t, y0, amp, col, alpha, n = 5, spread = 22) {
  g.lineWidth = 1.6; g.strokeStyle = col;
  for (let k = 0; k < n; k++) {
    g.globalAlpha = alpha * (1 - (k / n) * 0.7);
    g.beginPath();
    for (let x = -40; x <= W + 40; x += 20) {
      const y = y0 + k * spread
        + Math.sin(x * 0.0042 + t * (0.7 + k * 0.13) + k * 1.3) * amp * (1 + k * 0.25)
        + Math.sin(x * 0.0105 - t * 1.3 + k * 2.1) * amp * 0.35;
      if (x === -40) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}
function motes(t, n, col, alpha, vy = 16) {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = fract(rnd(i, 11) + t * 0.004 * (rnd(i, 12) - 0.5)) * W;
    const y = fract(rnd(i, 13) - (t * vy / H) * (0.5 + rnd(i, 14))) * H;
    const s = 1 + rnd(i, 15) * 2.5;
    g.globalAlpha = alpha * (0.3 + 0.7 * Math.pow(Math.sin(t * 1.7 + i * 1.3), 2));
    g.fillRect(x, y, s, s);
  }
  g.globalAlpha = 1;
}
function background(B, t, F) {
  let top = '#04060D', bot = '#0A1226', glow = null, gx = CX, gy = CY, ga = 0, wc = C.cyan, wa = 0.26, amp = 16, wy = 850, mo = 0.45;
  if (B >= 16 && B < 24) { top = '#060A1A'; bot = '#111A3F'; glow = '255,90,31'; ga = 0.42; gy = CY - 30; }
  else if (B >= 24 && B < 48) { top = '#05070F'; bot = '#0B1430'; glow = '255,90,31'; ga = 0.15; gx = 1400; gy = 480; }
  else if (B >= 48 && B < 80) { top = '#050912'; bot = '#0A1A33'; glow = '69,214,255'; ga = 0.10; gx = 600; gy = 620; }
  else if (B >= 80 && B < 96) { top = '#08060B'; bot = '#1A0C14'; glow = '255,51,82'; ga = 0.15; gx = 1200; gy = 420; wc = C.red; wa = 0.2; }
  else if (B >= 96 && B < 112) { top = '#05070F'; bot = '#0B1430'; glow = '255,51,82'; ga = 0.1; gx = 700; gy = 500; }
  else if (B >= 112 && B < 128) { top = '#03112B'; bot = '#0A3270'; glow = '69,214,255'; ga = 0.16; gx = CX; gy = 180; wa = 0.5; amp = 30; wy = 800; mo = 1; }
  else if (B >= 128 && B < 136) { top = '#08060A'; bot = '#1C0D06'; glow = '255,90,31'; ga = 0.15 + pr(B, 128, 136) * 0.35; }
  else if (B >= 136 && B < 144) { top = '#05070F'; bot = '#0B1430'; glow = '255,90,31'; ga = 0.18; gx = 350; gy = 500; }
  else if (B >= 160) { top = '#060A1A'; bot = '#0F1A3F'; glow = '255,90,31'; ga = 0.35; gy = 430; wa = 0.45; amp = 26; wc = C.orange; }
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, top); gr.addColorStop(1, bot);
  fillAll(gr);
  if (glow) {
    const k = 0.75 + 0.5 * F.kick;
    const rg = g.createRadialGradient(gx, gy, 0, gx, gy, 950);
    rg.addColorStop(0, `rgba(${glow},${ga * k})`); rg.addColorStop(1, `rgba(${glow},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  g.globalAlpha = 0.06 + F.kick * 0.05;
  g.drawImage(DOTS, -((t * 12) % 48) - 48, -((t * 6) % 48) - 48);
  g.globalAlpha = 1;
  waves(t, wy, amp * (0.55 + F.energy * 0.9) + F.kick * 6, wc, wa);
  motes(t, 70, C.ink, mo);
}

/* ---------------- camera & post ---------------- */
function camera(B, t) {
  const kick = env(KICKS, t, 14);
  const imp = impactEnv(t, 5);
  let amp = imp * 20 + kick * 2.5;
  if (B < 15.5) amp += Ease.inQuad(pr(B, 12, 15.5)) * 16;
  if (B >= 76 && B < 79.5) amp += Ease.inQuad(pr(B, 76, 79.5)) * 10;
  if (B >= 134 && B < 135.5) amp += Ease.inQuad(pr(B, 134, 135.5)) * 16;
  if (B >= 150.5 && B < 151.5) amp += pr(B, 150.5, 151.5) * 10;
  if (B >= 112 && B < 128) amp *= 0.3;
  const sx = vnoise(t * 22, 1) * amp, sy = vnoise(t * 22, 2) * amp, r = vnoise(t * 11, 3) * amp * 0.0009;
  let z = 1 + kick * 0.008;
  if (B >= 76 && B < 79.5) z += Ease.inCubic(pr(B, 76, 79.5)) * 0.1;
  if (B >= 128 && B < 135.5) z += pr(B, 128, 135.5) * 0.05;
  if (B >= 112 && B < 128) z += pr(B, 112, 128) * 0.03;
  return { sx, sy, r, z };
}
const FLASHES = [[16, 1], [24, 0.5], [48, 0.28], [64, 0.28], [80, 1], [96, 0.45], [104, 0.3], [112, 0.2], [120, 0.18], [136, 1], [152, 0.35], [160, 1]];
const GLITCHES = [15.5, 36, 48, 64, 96, 128];
function postParams(B, t) {
  const kick = env(KICKS, t, 12);
  const imp = impactEnv(t, 4.5);
  let ca = 0.12 + kick * 0.3 + imp * 1.3;
  let glitch = 0, flash = 0;
  if (B >= 12 && B < 15.5) ca += Ease.inQuad(pr(B, 12, 15.5)) * 1.6;
  if (B >= 76 && B < 79.5) ca += Ease.inQuad(pr(B, 76, 79.5)) * 1.2;
  if (B >= 132 && B < 135.5) ca += Ease.inQuad(pr(B, 132, 135.5)) * 1.5;
  if (B >= 150 && B < 151.5) ca += pr(B, 150, 151.5) * 1.2;
  if (B >= 158 && B < 159.75) ca += pr(B, 158, 159.75) * 1.2;
  if (B >= 4 && B < 12) { const lc = B - Math.floor(B); if (lc < 0.1) glitch = (1 - lc / 0.1) * 0.7; }
  for (const gb of GLITCHES) { const d = B - gb; if (d > -0.12 && d < 0.18) glitch = Math.max(glitch, (1 - Math.abs(d) / 0.18) * 0.9); }
  for (const [fb, s] of FLASHES) { const d = (B - fb) * SPB; if (d >= 0 && d < 0.6) flash = Math.max(flash, s * Math.exp(-d * 9)); }
  return { ca, glitch, flash, zoom: imp * 0.6, bloom: 0.6, grain: 0.06, vig: 0.62, seed: Math.floor(t * 24) % 997 };
}

/* ============================================================
   SCENE 0 — HOOK (B0–16)
   ============================================================ */
const CARDS = [
  { lab: 'PER', v: '3.6', u: '배', note: '업종 내 저렴한 쪽 상위 14%', bg: '#06070C', fg: C.orange, sub: C.ink, pos: 'L', tex: 'PER' },
  { lab: 'PBR', v: '0.57', u: '배', note: '장부가치의 57% 가격', bg: C.ink, fg: '#0A0B10', sub: '#0A0B10', pos: 'R', tex: 'PBR' },
  { lab: 'ROE', v: '20.6', u: '%', note: '전 종목 상위 6%', bg: C.orange, fg: '#0A0B10', sub: '#0A0B10', pos: 'C', tex: 'ROE' },
  { lab: '6개월 수익률', v: '+54', u: '%', note: '전 종목 상위 3%', bg: '#06070C', fg: C.red, sub: C.ink, pos: 'L', tex: 'UP' },
  { lab: '외국인 5일 순매수', v: '+134', u: '억', note: '5거래일 연속', bg: C.blue, fg: C.ink, sub: C.ink, pos: 'R', tex: 'BUY' },
  { lab: '2025 순이익', v: '1', u: '조+', note: '1조 198억 · 26E 1조 1,495억', bg: C.ink, fg: C.orange, sub: '#0A0B10', pos: 'C', tex: 'NET' },
];
function dotsRow(nLit, line, fill, y = 965, pulse = 0) {
  for (let i = 0; i < 6; i++) {
    const x = CX - 150 + i * 60;
    g.beginPath(); g.arc(x, y, 9 + (i < nLit ? pulse * 3 : 0), 0, TAU);
    if (i < nLit) { g.fillStyle = fill; g.fill(); }
    g.lineWidth = 2.5; g.strokeStyle = line; g.stroke();
  }
}
function montageCard(B, t) {
  const k = Math.floor(B - 4), lc = B - 4 - k, c = CARDS[k];
  fillAll(c.bg);
  g.save();
  text(c.tex, CX + (c.pos === 'R' ? -1 : 1) * (240 - lc * 300), CY + 40, { size: 640, w: 900, stroke: 3, color: c.fg, alpha: 0.1 });
  g.restore();
  for (let i = 0; i < 8; i++) {
    const y = 110 + rnd(i, k) * 860;
    const x = (((rnd(i, k + 5) + lc * (1.4 + rnd(i, k + 7) * 2)) % 1.4) - 0.2) * W;
    g.globalAlpha = 0.14; g.fillStyle = c.fg; g.fillRect(x, y, 240 + rnd(i, k + 3) * 420, 3);
  }
  g.globalAlpha = 1;
  const e = Ease.outExpo(pr(lc, 0, 0.4));
  const sc = lerp(1.32, 1, e) * (1 + Ease.inQuad(pr(lc, 0.8, 1)) * 0.04);
  const align = c.pos === 'L' ? 'left' : c.pos === 'R' ? 'right' : 'center';
  const ax = c.pos === 'L' ? 150 : c.pos === 'R' ? W - 150 : CX;
  const val = scramble(c.v, lc, 0, 0.3, 40);
  const NS = 400, US = 150;
  const nw = numText(c.v, 0, 0, { size: NS, w: 900, measure: true });
  const uw = textW(c.u, US, 900);
  const gw = nw + 20 + uw;
  const gx = align === 'left' ? ax : align === 'right' ? ax - gw : ax - gw / 2;
  const by = CY + 120;
  const pivot = align === 'left' ? gx : align === 'right' ? gx + gw : gx + gw / 2;
  g.save();
  g.translate(pivot, by - 140); g.scale(sc, sc); g.translate(-pivot, -(by - 140));
  g.globalAlpha = Math.min(1, lc * 8);
  numText(val, gx, by, { size: NS, w: 900, align: 'left', color: c.fg });
  const up = Ease.outBack(pr(lc, 0.12, 0.42), 2);
  if (up > 0) { g.save(); g.translate(gx + nw + 20, by); g.scale(up, up); text(c.u, 0, 0, { size: US, w: 900, color: c.fg, base: 'alphabetic', align: 'left' }); g.restore(); }
  g.restore();
  g.globalAlpha = 1;
  revealUp(c.lab, ax, CY - 230, { size: 40, w: 700, mono: true, color: c.sub, align, ls: 4 }, lc, 0, 0.35, 0.01);
  revealUp(c.note, ax, CY + 215, { size: 46, w: 700, color: c.sub, align }, lc, 0.15, 0.4, 0.008);
  text(`0${k + 1} / 06`, c.pos === 'R' ? 150 : W - 150, 110, { size: 26, w: 700, mono: true, color: c.sub, align: c.pos === 'R' ? 'left' : 'right', alpha: 0.7 });
  dotsRow(k + 1, c.sub, c.fg === c.sub ? C.orange : c.fg);
}
function sHook(B, t, F) {
  if (B < 4) {
    const inh = Ease.inExpo(pr(B, 3.25, 4));
    g.save();
    g.translate(CX, CY); g.scale(1 - inh * 0.1, 1 - inh * 0.1); g.translate(-CX, -CY);
    const lab = 'KRX 001450  ·  2026.10.08 종가 기준';
    const n = Math.floor(lab.length * pr(B, 0.15, 1.3));
    text(lab.slice(0, n) + (B < 3 && Math.floor(B * 4) % 2 === 0 ? '_' : ''), CX, 250, { size: 24, w: 600, mono: true, color: C.inkD, ls: 3 });
    revealUp('숫자 6개면', CX, 420, { size: 160, w: 900, colorFn: hl('숫자 6개면', '6', C.orange) }, B, 1, 0.7, 0.06);
    revealUp('충분하다.', CX, 595, { size: 160, w: 900 }, B, 2, 0.7, 0.06);
    const lp = Ease.outExpo(pr(B, 0, 1.4));
    g.strokeStyle = C.ink; g.lineWidth = 2; g.globalAlpha = 0.8;
    line(CX - 820 * lp, 712, CX + 820 * lp, 712);
    g.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const p = Ease.outBack(pr(B, 2.4 + i * 0.12, 2.8 + i * 0.12), 2.5);
      if (p <= 0) continue;
      g.strokeStyle = C.ink; g.lineWidth = 2.5;
      g.beginPath(); g.arc(CX - 150 + i * 60, 778, 10 * p, 0, TAU); g.stroke();
    }
    g.restore();
    return;
  }
  if (B < 10) { montageCard(B, t); return; }
  if (B < 12) {
    const k = B < 11 ? 0 : 1, lc = B - 10 - k;
    const bg = k ? C.orange : '#06070C', fg = k ? '#0A0B10' : C.ink;
    fillAll(bg);
    text(k ? 'ALL' : 'THIS', CX, CY, { size: 700, w: 900, stroke: 3, color: fg, alpha: 0.08 });
    slam(k ? '전부' : '이게', CX, CY - 20, { size: 440, w: 900, color: fg }, lc, 0, 0.3, 0.1, 1.9);
    dotsRow(6, fg, k ? '#0A0B10' : C.orange, 965, env(KICKS, t, 10));
    return;
  }
  if (B >= 15.5) { fillAll('#000'); return; }
  for (const st of SNARES) {
    const sb = st / SPB;
    if (sb < 12 || sb > B || B - sb > 1.2) continue;
    ring(B, sb, CX, CY, { r: 1150, r0: 160, life: 0.55, lw: 3, alpha: 0.4, col: C.orange });
  }
  const p = pr(B, 12, 15.5);
  const z = 1 + Ease.inQuad(p) * 0.4;
  g.save();
  g.translate(CX, CY); g.scale(z, z); g.translate(-CX, -CY);
  const times = [12, 0, 12.5, 13, 13.5, 14, 14.5];
  const flick = B > 15 && Math.floor(B * 8) % 2 === 1 ? 0.35 : 1;
  chars('한 종목이다.', CX, CY, { size: 240, w: 900, alpha: flick }, (i, n, ch) => {
    const lp = pr(B, times[i], times[i] + 0.4);
    if (lp <= 0) return false;
    return { s: Ease.outBack(lp, 2.5), a: Math.min(1, lp * 5), c: ch === '종' || ch === '목' ? C.orange : null };
  });
  g.restore();
}

/* ============================================================
   SCENE 1 — TITLE (B16–24)
   ============================================================ */
function marquee(s, y, size, off, alpha, col = C.ink) {
  const w = textW(s, size, 900);
  let x = -(((off % w) + w) % w);
  for (; x < W; x += w) text(s, x, y, { size, w: 900, stroke: 2, color: col, alpha, align: 'left' });
}
function sTitle(B, t, F) {
  const lb = B - 16;
  const out = Ease.inExpo(pr(B, 23, 24));
  const mq = 'HYUNDAI MARINE & FIRE INSURANCE  ·  001450  ·  KOSPI  ·  ';
  marquee(mq, 175, 120, t * 140 + F.kick * 20, 0.09 * (1 - out));
  marquee(mq, 905, 120, -t * 140 + 400, 0.09 * (1 - out));
  ring(B, 16, CX, CY - 30, { r: 1300, life: 0.9, lw: 18, col: C.orange });
  ring(B, 16.08, CX, CY - 30, { r: 1000, life: 0.8, lw: 5, col: C.ink });
  burst(B, 16, CX, CY - 30, { n: 90, seed: 7, v0: 400, v1: 2300, life: 1.4, s0: 2, s1: 7 });

  const mv = Ease.inOutExpo(pr(lb, 4, 5));
  const ty = lerp(CY - 40, 330, mv), ts = lerp(1, 0.6, mv);
  g.save();
  g.globalAlpha = 1 - out;
  g.translate(CX, ty); g.scale(ts * (1 + out * 1.6), ts * (1 + out * 1.6));
  slam('현대해상', 0, 0, { size: 300, w: 900 }, B, 16, 0.42, 0.25, 3.2);
  const tw = textW('현대해상', 300, 900);
  const up = Ease.outExpo(pr(lb, 1, 1.6));
  if (up > 0) { g.fillStyle = C.orange; g.fillRect(-tw / 2, 165, tw * up, 16); }
  const CH = ['001450', 'KOSPI', '손해보험', '시총 4.1조', 'SINCE 1955'];
  const ws = CH.map((c) => textW(c, 30, 700, true, 1) + 42);
  const tot = ws.reduce((a, b) => a + b, 0) + 18 * (CH.length - 1);
  let x = -tot / 2;
  CH.forEach((c, i) => {
    const pp = Ease.outBack(pr(lb, 2 + i * 0.25, 2.4 + i * 0.25), 2);
    if (pp > 0) {
      g.save(); g.translate(x + ws[i] / 2, 262); g.scale(pp, pp);
      g.globalAlpha = (1 - mv) * (1 - out);
      pill(c, 0, 0, { size: 30, w: 700, mono: true, ls: 1, align: 'center', strokeCol: 'rgba(244,241,234,0.45)', fill: i === 0 ? C.orange : null, color: i === 0 ? '#0A0B10' : C.ink });
      g.restore();
    }
    x += ws[i] + 18;
  });
  g.restore();

  g.save();
  g.globalAlpha = 1 - out;
  g.translate(CX, 640); g.scale(1 + out * 1.4, 1 + out * 1.4); g.translate(-CX, -640);
  revealUp('지금 담아야 할', CX, 560, { size: 88, w: 800 }, B, 20.25, 0.6, 0.04);
  revealUp('6가지 이유', CX, 705, { size: 170, w: 900, colorFn: hl('6가지 이유', '6', C.orange) }, B, 20.75, 0.6, 0.05);
  g.restore();
}

/* ---------------- chapter header ---------------- */
function drawChapter(B, t) {
  for (const ch of CHAPTERS) {
    if (B < ch.b || B >= ch.e) continue;
    const lb = B - ch.b;
    const big = 250;
    const ww = textW(ch.w, big, 900);
    const bs = Math.min(1, 1150 / ww);
    const bx = CX + 200;
    const m = Ease.inOutExpo(pr(lb, 0.85, 1.6));
    const hs = 74 / big;
    const hx = 214 + (ww * hs) / 2, hy = 150;
    if (m < 1) {
      const a = (1 - m) * (ch.soft ? Ease.outCubic(pr(lb, 0, 0.6)) : 1);
      g.save();
      g.globalAlpha = a * 0.95;
      const sc = lerp(1.3, 1, Ease.outExpo(pr(lb, 0, 0.6))) * (1 + m * 0.5);
      g.translate(CX - 640 - m * 200, CY + 10); g.rotate(-0.07); g.scale(sc, sc);
      text(ch.n, 0, 0, { size: 500, w: 900, stroke: 3, color: C.orange, ls: -14 });
      g.restore();
      g.save(); g.globalAlpha = 1 - m;
      revealUp(ch.s, bx, CY + 195, { size: 42, w: 700, color: C.inkD }, B, ch.b + 0.3, 0.5, 0.012);
      g.restore();
    }
    const cx = lerp(bx, hx, m), cy = lerp(CY - 10, hy, m), sc = lerp(bs, hs, m);
    g.save(); g.translate(cx, cy); g.scale(sc, sc);
    if (ch.soft) {
      chars(ch.w, 0, 0, { size: big, w: 900 }, (i) => {
        const lp = pr(B, ch.b + i * 0.06, ch.b + i * 0.06 + 0.8);
        if (lp <= 0) return false;
        return { y: (1 - Ease.outCubic(lp)) * 50, a: Ease.outCubic(lp) };
      });
    } else slam(ch.w, 0, 0, { size: big, w: 900 }, B, ch.b, 0.36, 0.07, 2.4);
    g.restore();
    const hp = Ease.outBack(pr(lb, 1.3, 1.8), 2);
    if (hp > 0) {
      g.save(); g.translate(150, hy); g.scale(hp, hp);
      g.fillStyle = C.orange; rr(-32, -32, 64, 64, 12); g.fill();
      text(ch.n, 0, 2, { size: 28, w: 800, mono: true, color: '#0A0B10' });
      g.restore();
      revealUp(ch.s, 214 + ww * hs + 30, hy + 10, { size: 28, w: 600, color: C.inkD, align: 'left' }, B, ch.b + 1.45, 0.5, 0.01);
    }
  }
}

/* ---------------- tracker (tiles → progress bar) ---------------- */
function drawTracker(B) {
  if (B < 21 || B >= 136.5) return;
  const out = pr(B, 135.6, 136.4);
  const m = Ease.inOutExpo(pr(B, 23, 24));
  const X0 = 120, X1 = 1800, GAP = 16, TY = 1018;
  const segW = (X1 - X0 - GAP * 5) / 6;
  const tW = 214, tH = 88, tG = 22, tX0 = CX - (tW * 6 + tG * 5) / 2, tY = 870;
  for (let i = 0; i < 6; i++) {
    const ch = CHAPTERS[i];
    const pop = Ease.outBack(pr(B, 21 + i * 0.5, 21.45 + i * 0.5), 1.8);
    if (pop <= 0) continue;
    const x = lerp(tX0 + i * (tW + tG), X0 + i * (segW + GAP), m);
    const y = lerp(tY - tH / 2, TY, m);
    const w = lerp(tW, segW, m), h = lerp(tH, 5, m);
    const active = B >= ch.b && B < ch.e;
    const fp = B < ch.b ? 0 : B >= ch.e ? 1 : (B - ch.b) / (ch.e - ch.b);
    g.save();
    g.globalAlpha = 1 - out;
    g.translate(x + w / 2, y + h / 2); g.scale(pop, pop); g.translate(-(x + w / 2), -(y + h / 2));
    g.fillStyle = m < 0.5 ? 'rgba(244,241,234,0.06)' : 'rgba(244,241,234,0.16)';
    rr(x, y, w, h, lerp(16, 3, m)); g.fill();
    if (m < 0.6) { g.globalAlpha = (1 - out) * (1 - m / 0.6) * 0.5; g.strokeStyle = C.ink; g.lineWidth = 2; rr(x, y, w, h, 16); g.stroke(); }
    if (fp > 0) {
      g.globalAlpha = 1 - out;
      if (active) { g.shadowColor = C.orange; g.shadowBlur = 16; }
      g.fillStyle = C.orange; rr(x, y, Math.max(h, w * fp), h, lerp(16, 3, m)); g.fill();
      g.shadowBlur = 0;
    }
    if (m < 0.5) {
      const a = (1 - m / 0.5) * (1 - out);
      text(ch.n, x + 26, y + h / 2, { size: 24, w: 700, mono: true, color: C.orange, align: 'left', alpha: a });
      text(ch.tag, x + 72, y + h / 2 + 1, { size: 32, w: 800, align: 'left', alpha: a });
    } else {
      const a = ((m - 0.5) / 0.5) * (1 - out);
      text(`${ch.n} ${ch.tag}`, x, TY - 16, { size: 17, w: 700, mono: true, color: active ? C.ink : C.inkD, align: 'left', alpha: a, ls: 1 });
    }
    g.restore();
  }
}

/* ============================================================
   01 — PER (B24–36) / PBR (B36–48)
   ============================================================ */
function sPER(B, t, F) {
  const L = 150;
  revealUp('PER  ·  주가수익비율', L, 330, { size: 30, w: 700, mono: true, color: C.orange, align: 'left', ls: 2 }, B, 25, 0.5, 0.012);
  if (B >= 25.2) {
    const cp = Ease.outExpo(pr(B, 25.2, 27.4));
    const v = lerp(20, 3.6, cp);
    g.save();
    if (B > 33.5) { g.shadowColor = C.orange; g.shadowBlur = 20 + env(KICKS, t, 8) * 60; }
    numUnit(v.toFixed(1), '배', L, 640, { size: 330, unitSize: 120, align: 'left', color: cp > 0.985 ? C.orange : C.ink, unitColor: C.ink });
    g.restore();
  }
  const pp = Ease.outBack(pr(B, 27.5, 28), 2);
  if (pp > 0) { g.save(); g.translate(L, 722); g.scale(pp, pp); pill('업종 내 저렴한 쪽 상위 14%', 0, 0, { size: 28, w: 700, strokeCol: 'rgba(244,241,234,0.5)' }); g.restore(); }

  const RX = 1010, RW = 780, RY = 420, RH = 130;
  revealUp('시가총액 4.1조원  =  ?', RX, RY - 46, { size: 30, w: 700, mono: true, color: C.inkD, align: 'left', ls: 1 }, B, 27.5, 0.5, 0.01);
  if (B >= 27.5) {
    g.strokeStyle = C.ink; g.globalAlpha = 0.5; g.lineWidth = 2;
    rectDraw(RX, RY, RW, RH, Ease.outExpo(pr(B, 27.5, 28.2)));
    g.globalAlpha = 1;
  }
  const bw = RW / 3.57;
  for (let i = 0; i < 4; i++) {
    const b0 = 28 + i, lp = pr(B, b0, b0 + 0.4);
    if (lp <= 0) continue;
    const e = Ease.outBack(lp, 1.6);
    const x = RX + i * bw, w = i < 3 ? bw : RW - 3 * bw, yo = (1 - e) * -90;
    g.save();
    g.globalAlpha = Math.min(1, lp * 4);
    g.fillStyle = i < 3 ? (i % 2 ? C.orange2 : C.orange) : C.gold;
    rr(x + 4, RY + 6 + yo, w - 8, RH - 12, 8); g.fill();
    text(i < 3 ? `${i + 1}년` : '0.6', x + w / 2, RY + RH / 2 + yo, { size: i < 3 ? 40 : 30, w: 800, color: '#0A0B10' });
    g.restore();
    const fl = 1 - pr(B, b0 + 0.05, b0 + 0.45);
    if (lp > 0.1 && fl > 0) { g.globalAlpha = fl * 0.7; g.fillStyle = '#fff'; rr(x + 4, RY + 6, w - 8, RH - 12, 8); g.fill(); g.globalAlpha = 1; }
  }
  if (B >= 28.5) {
    const a = Ease.outExpo(pr(B, 28.5, 29));
    const by = RY + RH + 26;
    g.globalAlpha = a; g.strokeStyle = C.inkD; g.lineWidth = 2;
    line(RX + 4, by, RX + bw - 4, by); line(RX + 4, by - 10, RX + 4, by); line(RX + bw - 4, by - 10, RX + bw - 4, by);
    g.globalAlpha = 1;
    text('1칸 = 1년 순이익 1.15조 (2026E)', RX, by + 34, { size: 24, w: 600, mono: true, color: C.inkD, align: 'left', alpha: a });
  }
  revealUp('3.6년 치 이익이면', RX, 760, { size: 62, w: 800, align: 'left' }, B, 32, 0.6, 0.03);
  revealUp('회사 전체를 산다.', RX, 848, { size: 62, w: 900, align: 'left', color: C.orange }, B, 32.5, 0.6, 0.03);
}

function drawBill(x, y, w, h, glow) {
  g.save();
  rr(x, y, w, h, 18);
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, '#F3ECDD'); gr.addColorStop(1, '#D8CBB0');
  g.fillStyle = gr; g.fill();
  if (glow) { g.shadowColor = C.orange; g.shadowBlur = 40; g.strokeStyle = C.orange; g.lineWidth = 6; g.stroke(); g.shadowBlur = 0; }
  g.save(); rr(x, y, w, h, 18); g.clip();
  g.strokeStyle = 'rgba(60,50,30,0.12)'; g.lineWidth = 1.5;
  for (let k = 0; k < 10; k++) {
    g.beginPath();
    for (let xx = x; xx <= x + w; xx += 10) {
      const yy = y + h * 0.5 + Math.sin(xx * 0.018 + k * 0.7) * h * 0.34 * Math.sin(k * 0.4 + 0.6);
      if (xx === x) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.stroke();
  }
  g.strokeStyle = 'rgba(60,50,30,0.35)'; g.lineWidth = 2; rr(x + 16, y + 16, w - 32, h - 32, 10); g.stroke();
  g.restore();
  text('BOOK VALUE  ·  순자산', x + 50, y + 68, { size: 24, w: 700, mono: true, color: 'rgba(20,18,12,0.62)', align: 'left' });
  text('10,000원', x + 46, y + 215, { size: 136, w: 900, color: '#14120C', align: 'left', base: 'alphabetic' });
  text('001450', x + w - 44, y + h - 46, { size: 22, w: 700, mono: true, color: 'rgba(20,18,12,0.5)', align: 'right' });
  g.restore();
}
function sPBR(B, t, F) {
  const L = 150;
  revealUp('PBR  ·  주가순자산비율', L, 330, { size: 30, w: 700, mono: true, color: C.orange, align: 'left', ls: 2 }, B, 36.1, 0.5, 0.012);
  if (B >= 36.3) {
    const cp = Ease.outExpo(pr(B, 36.3, 38.5));
    numUnit(lerp(1, 0.57, cp).toFixed(2), '배', L, 640, { size: 270, unitSize: 100, align: 'left', color: cp > 0.985 ? C.orange : C.ink, unitColor: C.ink });
  }
  const pp = Ease.outBack(pr(B, 39, 39.5), 2);
  if (pp > 0) { g.save(); g.translate(L, 722); g.scale(pp, pp); pill('업종 내 저렴한 쪽 상위 38%', 0, 0, { size: 28, w: 700, strokeCol: 'rgba(244,241,234,0.5)' }); g.restore(); }

  const BX = 1040, BY = 290, BW = 750, BH = 330, cut = 0.57;
  const ap = Ease.outExpo(pr(B, 36.4, 37.1));
  if (ap > 0) {
    const dt = Math.max(0, (B - 38.5) * SPB);
    g.save();
    g.globalAlpha = ap;
    const s0 = lerp(0.85, 1, ap);
    g.translate(BX + BW / 2, BY + BH / 2); g.scale(s0, s0); g.translate(-(BX + BW / 2), -(BY + BH / 2));
    g.save(); g.beginPath(); g.rect(BX - 20, BY - 20, BW * cut + 20, BH + 40); g.clip(); drawBill(BX, BY, BW, BH, B >= 38.5); g.restore();
    g.save();
    if (B >= 38.5) {
      const fx = dt * 160, fy = 0.5 * 2600 * dt * dt, rot = dt * 0.9;
      g.translate(BX + BW * cut + fx, BY + fy); g.rotate(rot); g.translate(-(BX + BW * cut), -BY);
      g.globalAlpha = ap * (1 - pr(dt, 0.5, 0.9));
    }
    g.beginPath(); g.rect(BX + BW * cut, BY - 20, BW * (1 - cut) + 20, BH + 40); g.clip();
    if (B < 38.5 || dt < 0.9) drawBill(BX, BY, BW, BH, false);
    g.restore();
    g.restore();
    if (B >= 38 && B < 38.7) {
      const lp = Ease.outExpo(pr(B, 38, 38.25));
      g.globalAlpha = 1 - pr(B, 38.5, 38.7);
      g.setLineDash([14, 10]); g.strokeStyle = C.orange; g.lineWidth = 5;
      line(BX + BW * cut, BY - 34, BX + BW * cut, BY - 34 + (BH + 68) * lp);
      g.setLineDash([]); g.globalAlpha = 1;
    }
    if (B >= 38.5) burst(B, 38.5, BX + BW * cut, BY + BH / 2, { n: 30, seed: 4, v0: 200, v1: 900, life: 0.7, a0: 0, spread: 1.6, cols: [C.orange, '#F3ECDD'] });
    const la = Ease.outBack(pr(B, 39, 39.4), 2);
    if (la > 0) {
      g.save(); g.translate(BX, BY + BH + 58); g.scale(la, la);
      text('↳  시장 가격 5,700원', 0, 0, { size: 44, w: 800, color: C.orange, align: 'left' });
      g.restore();
    }
  }
  revealUp('1만 원짜리 자산을', BX, 770, { size: 62, w: 800, align: 'left' }, B, 40, 0.6, 0.03);
  revealUp('5,700원에 살 수 있다.', BX, 858, { size: 62, w: 900, align: 'left', colorFn: hl('5,700원에 살 수 있다.', '5,700원', C.orange) }, B, 40.5, 0.6, 0.03);
  stamp('저평가', BX + 215, BY + 262, B, 44, { size: 84, rot: -0.2, col: C.red });
  if (B >= 44) burst(B, 44, BX + 215, BY + 262, { n: 26, seed: 12, v0: 300, v1: 1100, life: 0.6, cols: [C.red], s0: 3, s1: 8 });
}

/* ============================================================
   02 — ROE (B48–64)
   ============================================================ */
function sROE(B, t, F) {
  const base = 860, X = [250, 500, 750], BWd = 170, maxH = 470, maxV = 22;
  revealUp('ROE  ·  자기자본이익률', 170, 300, { size: 30, w: 700, mono: true, color: C.orange, align: 'left', ls: 2 }, B, 49, 0.5, 0.012);
  const bl = Ease.outExpo(pr(B, 49, 49.8));
  g.strokeStyle = C.inkD; g.lineWidth = 2; line(170, base, 170 + 760 * bl, base);
  const cols = ['rgba(244,241,234,0.3)', C.blue, C.orange];
  const tops = [];
  for (let i = 0; i < 3; i++) {
    const b0 = 50 + i * 2, lp = pr(B, b0, b0 + 0.9);
    const fullH = (maxH * D.roe[i]) / maxV;
    tops.push([X[i], base - fullH]);
    text(D.years[i], X[i], base + 36, { size: 26, w: 600, mono: true, color: C.inkD, alpha: pr(B, 49.3 + i * 0.2, 49.8 + i * 0.2) });
    if (lp <= 0) continue;
    const h = fullH * Ease.outBack(lp, 1.3);
    g.save();
    if (i === 2) { g.shadowColor = C.orange; g.shadowBlur = 30 + env(KICKS, t, 8) * 30; }
    g.fillStyle = cols[i]; rr(X[i] - BWd / 2, base - h, BWd, h, [10, 10, 0, 0]); g.fill();
    g.restore();
    const cv = D.roe[i] * Ease.outExpo(pr(B, b0, b0 + 0.9));
    numText(cv.toFixed(2) + '%', X[i], base - h - 24, { size: 50, w: 800, align: 'center', color: i === 2 ? C.orange : C.ink });
    ring(B, b0 + 0.3, X[i], base - fullH, { r: 140, life: 0.45, lw: 4, col: cols[i] === cols[0] ? C.ink : cols[i] });
  }
  if (B >= 55) {
    const ap = Ease.inOutCubic(pr(B, 55, 56));
    g.strokeStyle = C.orange; g.lineWidth = 6; g.lineCap = 'round';
    const a = [tops[0][0] - 60, tops[0][1] - 170], b = [tops[2][0] + 130, tops[2][1] - 190];
    const head = polyPartial([a, b], ap);
    if (ap > 0.98) {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      g.fillStyle = C.orange; g.beginPath();
      g.moveTo(head[0] + Math.cos(ang) * 18, head[1] + Math.sin(ang) * 18);
      g.lineTo(head[0] + Math.cos(ang + 2.5) * 30, head[1] + Math.sin(ang + 2.5) * 30);
      g.lineTo(head[0] + Math.cos(ang - 2.5) * 30, head[1] + Math.sin(ang - 2.5) * 30);
      g.fill();
    }
    g.lineCap = 'butt';
  }
  revealUp('3년 만에', 1110, 320, { size: 42, w: 700, color: C.inkD, align: 'left' }, B, 56, 0.5, 0.02);
  if (B >= 56) slam('×2.8', 1100, 490, { size: 280, w: 900, color: C.orange, align: 'left' }, B, 56, 0.35, 0.05, 2.2);
  const MX = 1110, MW = 680, MY = 690;
  if (B >= 58) {
    const a = Ease.outExpo(pr(B, 58, 58.5));
    text('ROE 순위  ·  전 종목 대비', MX, MY - 50, { size: 24, w: 700, mono: true, color: C.inkD, align: 'left', alpha: a });
    g.globalAlpha = a; g.fillStyle = C.inkF; rr(MX, MY - 6, MW, 12, 6); g.fill();
    for (let k = 0; k <= 10; k++) { g.fillStyle = C.inkD; g.fillRect(MX + (MW * k) / 10 - 1, MY + 16, 2, k % 5 === 0 ? 14 : 8); }
    const mp = Ease.outExpo(pr(B, 58.3, 59.8)) * 0.94;
    g.fillStyle = C.orange; rr(MX, MY - 6, Math.max(12, MW * mp), 12, 6); g.fill();
    const mx = MX + MW * mp;
    g.shadowColor = C.orange; g.shadowBlur = 20; g.beginPath(); g.arc(mx, MY, 15, 0, TAU); g.fill(); g.shadowBlur = 0;
    g.globalAlpha = 1;
    const bp = Ease.outBack(pr(B, 59.4, 59.9), 2);
    if (bp > 0) { g.save(); g.translate(mx, MY - 58); g.scale(bp, bp); pill('상위 6%', 0, 0, { size: 30, w: 800, fill: C.orange, color: '#0A0B10', align: 'center' }); g.restore(); }
  }
  revealUp('자본 100원으로', 1110, 830, { size: 52, w: 800, align: 'left' }, B, 60, 0.6, 0.03);
  revealUp('1년에 20.6원을 번다.', 1110, 905, { size: 52, w: 900, align: 'left', colorFn: hl('1년에 20.6원을 번다.', '20.6원', C.orange) }, B, 60.5, 0.6, 0.03);
}

/* ============================================================
   03 — GROWTH (B64–80)
   ============================================================ */
const fmtEok = (v) => (v >= 10000 ? `1조 ${fmt(v - 10000)}억` : `${fmt(v)}억`);
function sGrowth(B, t, F) {
  if (B >= 79.5) { fillAll('#000'); return; }
  const X = [230, 480, 730, 980], y0 = 860, y1 = 380, vmax = 12500;
  const yOf = (v) => y0 - (v / vmax) * (y0 - y1);
  revealUp('당기순이익', 170, 300, { size: 30, w: 700, mono: true, color: C.orange, align: 'left', ls: 2 }, B, 65, 0.5, 0.012);
  const bl = Ease.outExpo(pr(B, 64.6, 65.4));
  g.strokeStyle = C.inkD; g.lineWidth = 2; line(170, y0, 170 + 880 * bl, y0);
  D.years.forEach((yr, i) => text(yr, X[i], y0 + 36, { size: 26, w: 600, mono: true, color: i === 3 ? C.gold : C.inkD, alpha: pr(B, 65 + i * 0.15, 65.5 + i * 0.15) }));
  const pts = D.ni.map((v, i) => [X[i], yOf(v)]);
  const u = clamp(B - 65.5, 0, 3);
  if (B >= 65.5) {
    const k = Math.min(2, Math.floor(u)), f = u - k;
    const head = u >= 3 ? pts[3] : [lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f)];
    const path = pts.slice(0, Math.floor(u) + 1);
    if (u < 3) path.push(head);
    const ag = g.createLinearGradient(0, y1, 0, y0);
    ag.addColorStop(0, 'rgba(255,90,31,0.42)'); ag.addColorStop(1, 'rgba(255,90,31,0)');
    g.fillStyle = ag; g.beginPath(); g.moveTo(path[0][0], y0);
    path.forEach((p) => g.lineTo(p[0], p[1]));
    g.lineTo(path[path.length - 1][0], y0); g.closePath(); g.fill();
    g.save(); g.shadowColor = C.orange; g.shadowBlur = 18; g.strokeStyle = C.orange; g.lineWidth = 6; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= Math.min(2, Math.floor(u)); i++) g.lineTo(pts[i][0], pts[i][1]);
    if (u < 2) g.lineTo(head[0], head[1]);
    g.stroke();
    if (u > 2) { g.setLineDash([16, 12]); g.beginPath(); g.moveTo(pts[2][0], pts[2][1]); g.lineTo(head[0], head[1]); g.stroke(); g.setLineDash([]); }
    g.restore();
  }
  for (let i = 0; i < 4; i++) {
    const b0 = 65.5 + i, lp = pr(B, b0, b0 + 0.4);
    if (lp <= 0) continue;
    const [px, py] = pts[i];
    const e = Ease.outBack(lp, 2.5);
    g.fillStyle = i === 3 ? C.gold : C.ink; g.beginPath(); g.arc(px, py, 11 * e, 0, TAU); g.fill();
    g.strokeStyle = C.orange; g.lineWidth = 4; g.stroke();
    ring(B, b0, px, py, { r: 90, life: 0.4, lw: 3, col: C.orange });
    const v = D.ni[i] * Ease.outExpo(pr(B, b0, b0 + 0.7));
    const lab = fmtEok(v) + (i === 3 ? ' (E)' : '');
    text(lab, px, py - 44, { size: i >= 2 ? 40 : 36, w: 800, color: i === 3 ? C.gold : C.ink, alpha: Math.min(1, lp * 3) });
  }
  if (B >= 69.5) {
    const lp = Ease.outExpo(pr(B, 69.5, 70.1));
    const ly = yOf(10000);
    g.setLineDash([10, 10]); g.strokeStyle = C.ink; g.globalAlpha = 0.55; g.lineWidth = 2;
    line(170, ly, 170 + 900 * lp, ly); g.setLineDash([]); g.globalAlpha = 1;
    text('1조', 1080, ly, { size: 26, w: 800, mono: true, color: C.ink, align: 'left', alpha: lp });
  }
  if (B >= 70) {
    burst(B, 70, pts[2][0], pts[2][1], { n: 60, seed: 21, v0: 300, v1: 1500, life: 1.1, cols: [C.orange, C.gold, C.ink] });
    ring(B, 70, pts[2][0], pts[2][1], { r: 260, life: 0.7, lw: 8, col: C.gold });
    stamp('1조 돌파', 560, 690, B, 70, { size: 70, rot: -0.12, col: C.gold });
  }
  const RX = 1240;
  revealUp('EPS  ·  주당순이익', RX, 300, { size: 30, w: 700, mono: true, color: C.orange, align: 'left', ls: 2 }, B, 72, 0.5, 0.012);
  const a1 = Ease.outExpo(pr(B, 72.3, 72.9));
  if (a1 > 0) {
    text('2023', RX, 378, { size: 24, w: 600, mono: true, color: C.inkD, align: 'left', alpha: a1 });
    numUnit('6,426', '원', RX, 460, { size: 72, unitSize: 34, align: 'left', color: C.inkD, alpha: a1 });
  }
  if (B >= 72.8) {
    const ap = Ease.outExpo(pr(B, 72.8, 73.2));
    g.strokeStyle = C.orange; g.lineWidth = 4;
    line(RX + 30, 490, RX + 30, 490 + 60 * ap);
    if (ap > 0.95) { g.fillStyle = C.orange; g.beginPath(); g.moveTo(RX + 18, 548); g.lineTo(RX + 42, 548); g.lineTo(RX + 30, 566); g.fill(); }
  }
  if (B >= 73) {
    text('2026E', RX, 606, { size: 24, w: 600, mono: true, color: C.gold, align: 'left' });
    const cp = Ease.outExpo(pr(B, 73, 75));
    g.save(); if (cp > 0.98) { g.shadowColor = C.orange; g.shadowBlur = 30; }
    numUnit(fmt(lerp(6426, 13025, cp)), '원', RX, 745, { size: 132, unitSize: 54, align: 'left', color: cp > 0.98 ? C.orange : C.ink, unitColor: C.ink });
    g.restore();
  }
  stamp('2배', 1680, 470, B, 75.5, { size: 96, rot: -0.14, col: C.orange });
  revealUp('3년 새 주당순이익 두 배.', RX, 850, { size: 46, w: 800, align: 'left' }, B, 76, 0.6, 0.02);
}

/* ============================================================
   04 — TREND (B80–96)
   ============================================================ */
const CHX0 = 150, CHX1 = 1660, CHY0 = 270, CHY1 = 900, PMIN = 32000, PMAX = 56500;
const cxd = (d) => CHX0 + ((d + 0.5) * (CHX1 - CHX0)) / 90;
const cyp = (p) => CHY1 - ((p - PMIN) / (PMAX - PMIN)) * (CHY1 - CHY0);
function statCard(x, y, w, h, B, b0, lab, val, unit, col, sub, badge) {
  const lp = pr(B, b0, b0 + 0.5);
  if (lp <= 0) return;
  const e = Ease.outExpo(lp);
  g.save();
  g.globalAlpha = Math.min(1, lp * 3);
  g.translate(0, (1 - e) * 40);
  g.fillStyle = 'rgba(8,8,14,0.86)'; rr(x, y, w, h, 18); g.fill();
  g.strokeStyle = 'rgba(244,241,234,0.18)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = col; rr(x, y + 18, 6, h - 36, 3); g.fill();
  text(lab, x + 30, y + 38, { size: 22, w: 700, mono: true, color: C.inkD, align: 'left' });
  const cv = val * Ease.outExpo(pr(B, b0, b0 + 1.2));
  numUnit('+' + cv.toFixed(1), unit, x + 28, sub ? y + 122 : y + h - 26, { size: sub ? 80 : 100, unitSize: 44, align: 'left', color: col });
  if (sub) text(sub, x + 30, y + h - 20, { size: 20, w: 600, mono: true, color: C.inkD, align: 'left' });
  if (badge) { const bp = Ease.outBack(pr(B, b0 + 0.4, b0 + 0.8), 2); if (bp > 0) { g.save(); g.translate(x + w - 30, y + 40); g.scale(bp, bp); pill(badge, 0, 0, { size: 24, w: 800, fill: col, color: C.ink, align: 'right' }); g.restore(); } }
  g.restore();
}
function sTrend(B, t, F) {
  const ga = Ease.outExpo(pr(B, 80.8, 81.6));
  for (const p of [35000, 40000, 45000, 50000, 55000]) {
    const y = cyp(p);
    g.globalAlpha = ga * 0.14; g.strokeStyle = C.ink; g.lineWidth = 1; g.setLineDash([4, 8]);
    line(CHX0, y, CHX1, y); g.setLineDash([]);
    text(fmt(p), 1800, y, { size: 20, w: 600, mono: true, color: C.inkD, align: 'right', alpha: ga });
  }
  g.globalAlpha = 1;
  const nf = pr(B, 81, 88) * 90;
  if (nf <= 0) return;
  const hd = Math.min(89, Math.floor(nf));
  const z = lerp(1.55, 1, Ease.inOutCubic(pr(B, 81, 88.6)));
  const hx = cxd(Math.min(nf, 89)), hy = cyp(CANDLES[hd].c);
  g.save();
  if (z > 1.0005) { g.translate(hx, hy); g.scale(z, z); g.translate(-hx, -hy); }
  const ag = g.createLinearGradient(0, CHY0, 0, CHY1);
  ag.addColorStop(0, 'rgba(255,90,31,0.20)'); ag.addColorStop(1, 'rgba(255,90,31,0)');
  g.beginPath(); g.moveTo(cxd(0), CHY1);
  for (let d = 0; d <= hd; d++) g.lineTo(cxd(d), cyp(CANDLES[d].c));
  g.lineTo(cxd(hd), CHY1); g.closePath(); g.fillStyle = ag; g.fill();
  g.strokeStyle = 'rgba(255,138,61,0.55)'; g.lineWidth = 2;
  g.beginPath();
  for (let d = 0; d <= hd; d++) { const x = cxd(d), y = cyp(CANDLES[d].c); d ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  const bw = 10.5;
  for (let d = 0; d <= hd; d++) {
    const c = CANDLES[d], age = nf - d;
    const s = Ease.outBack(clamp(age / 1.6), 2.2);
    const up = c.c >= c.o, col = up ? C.red : C.blue;
    const x = cxd(d);
    const yo = cyp(c.o), yc = cyp(c.c), yh = cyp(c.h), yl = cyp(c.l);
    const mid = (yo + yc) / 2;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.6;
    line(x, mid + (yh - mid) * s, x, mid + (yl - mid) * s);
    const top = Math.min(yo, yc), hgt = Math.max(2, Math.abs(yo - yc));
    g.fillRect(x - bw / 2, mid + (top - mid) * s, bw, hgt * s);
  }
  g.restore();
  if (B < 88.8) {
    const a = 1 - pr(B, 88.2, 88.8);
    const c = CANDLES[hd];
    g.save(); g.globalAlpha = a;
    g.shadowColor = C.orange; g.shadowBlur = 24 + env(KICKS, t, 10) * 30;
    g.fillStyle = C.orange; g.beginPath(); g.arc(hx, hy, 8, 0, TAU); g.fill();
    g.shadowBlur = 0;
    pill(fmt(c.c), hx + 22, hy, { size: 22, w: 700, mono: true, fill: c.c >= c.o ? C.red : C.blue, color: C.ink });
    g.restore();
  }
  if (B >= 88) {
    const hiY = cyp(D.hi52), nowY = cyp(D.price);
    const a1 = Ease.outExpo(pr(B, 88, 88.7));
    g.setLineDash([10, 8]); g.lineWidth = 2;
    g.strokeStyle = 'rgba(244,241,234,0.7)'; line(CHX0, hiY, CHX0 + (CHX1 - CHX0) * a1, hiY);
    g.strokeStyle = 'rgba(58,114,255,0.9)'; line(CHX0, nowY, CHX0 + (CHX1 - CHX0) * a1, nowY);
    g.setLineDash([]);
    text('52주 고점 54,700', CHX1 - 6, hiY - 20, { size: 22, w: 700, mono: true, color: C.ink, align: 'right', alpha: a1 });
    pill('현재 46,900', CHX1 + 8, nowY, { size: 20, w: 700, mono: true, fill: C.blue, color: C.ink, align: 'right' }, a1);
    const bp = Ease.outExpo(pr(B, 89, 89.7));
    if (bp > 0) {
      const bx = CHX1 + 32;
      g.strokeStyle = C.gold; g.lineWidth = 4;
      const yTop = lerp(nowY, hiY, bp);
      line(bx, nowY, bx, yTop);
      g.fillStyle = C.gold; g.beginPath(); g.moveTo(bx, yTop - 14); g.lineTo(bx - 10, yTop + 4); g.lineTo(bx + 10, yTop + 4); g.fill();
      const lp = Ease.outBack(pr(B, 89.4, 89.9), 2);
      if (lp > 0) { g.save(); g.translate(CHX1 - 14, cyp(52300)); g.scale(lp, lp); text('고점까지', 0, -30, { size: 22, w: 700, mono: true, color: C.gold, align: 'right' }); text('+16.6%', 0, 8, { size: 46, w: 900, color: C.gold, align: 'right' }); g.restore(); }
    }
  }
  statCard(170, 286, 560, 160, B, 90, '6개월 수익률', D.ret6m, '%', C.red, null, '상위 3%');
  statCard(170, 460, 560, 168, B, 92, '52주 저점 대비', 79.7, '%', C.red, '26,100 → 46,900', null);
}

/* ============================================================
   05 — FLOW (B96–112)
   ============================================================ */
function sFlow(B, t, F) {
  const s1 = '최근 5거래일, 외국인은 하루도 빠짐없이 샀다.';
  const s2 = '기관이 던진 물량, 외국인이 다 받아냈다.';
  if (B < 107.6) {
    g.save(); g.globalAlpha = 1 - pr(B, 107.3, 107.6);
    revealUp(s1, 150, 290, { size: 50, w: 800, align: 'left', colorFn: hl(s1, '하루도 빠짐없이', C.red) }, B, 97.2, 0.6, 0.012);
    g.restore();
  } else revealUp(s2, 150, 290, { size: 50, w: 800, align: 'left', colorFn: hl(s2, ['외국인이 다 받아냈다'], C.red) }, B, 107.7, 0.6, 0.012);

  const base = 700, X0 = 260, DX = 235, BWd = 120, sc = 255 / 77005;
  const la = Ease.outExpo(pr(B, 99, 99.6));
  g.globalAlpha = la;
  g.strokeStyle = C.inkD; g.lineWidth = 2; line(170, base, 170 + 1170 * la, base);
  g.fillStyle = C.red; g.fillRect(170, 380, 18, 18);
  text('외국인', 198, 390, { size: 22, w: 700, mono: true, color: C.ink, align: 'left' });
  g.fillStyle = C.blue; g.fillRect(310, 380, 18, 18);
  text('기관', 338, 390, { size: 22, w: 700, mono: true, color: C.ink, align: 'left' });
  text('단위: 주', 1340, 390, { size: 20, w: 600, mono: true, color: C.inkD, align: 'right' });
  g.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {
    const b0 = 100 + i, x = X0 + i * DX;
    const lp = pr(B, b0, b0 + 0.35);
    text(D.foreign[i][0], x, base + 222, { size: 26, w: 700, mono: true, color: C.inkD, alpha: Math.min(1, la, lp * 3 + 0.25) });
    if (lp <= 0) continue;
    const v = D.foreign[i][1], fh = v * sc, h = fh * Ease.outBack(lp, 1.8);
    g.save();
    g.shadowColor = C.red; g.shadowBlur = 20 + Math.exp(-(B - b0) * 4) * 40;
    g.fillStyle = C.red; rr(x - BWd / 2, base - h, BWd, h, [8, 8, 0, 0]); g.fill();
    g.restore();
    ring(B, b0, x, base - fh, { r: 160, life: 0.45, lw: 5, col: C.red });
    burst(B, b0, x, base - fh, { n: 16, seed: 40 + i, v0: 200, v1: 900, life: 0.5, a0: -Math.PI / 2, spread: 2.2, cols: [C.red, C.ink] });
    text('+' + fmt(v * Ease.outExpo(lp)), x, base - h - 28, { size: 34, w: 800, color: C.ink });
    const lq = pr(B, b0 + 0.2, b0 + 0.7);
    if (lq > 0) {
      const hb = -D.inst[i] * sc * Ease.outCubic(lq);
      g.globalAlpha = 0.6; g.fillStyle = C.blue; rr(x - BWd / 2, base, BWd, hb, [0, 0, 8, 8]); g.fill(); g.globalAlpha = 1;
      text(fmt(D.inst[i]), x, base + hb + 24, { size: 24, w: 700, color: C.blue, alpha: lq });
    }
  }
  stamp('5일 연속', 1630, 330, B, 104, { size: 64, rot: -0.12, col: C.red });
  const RX = 1450;
  if (B >= 104) {
    const a = Ease.outExpo(pr(B, 104, 104.5));
    text('외국인 순매수 (5일)', RX, 440, { size: 22, w: 700, mono: true, color: C.inkD, align: 'left', alpha: a });
    numUnit('+' + Math.round(134 * Ease.outExpo(pr(B, 104, 105.5))), '억', RX, 548, { size: 116, unitSize: 54, align: 'left', color: C.red, alpha: a });
  }
  if (B >= 104.5) {
    const a = Ease.outExpo(pr(B, 104.5, 105));
    text('기관 -100억', RX, 608, { size: 40, w: 800, color: C.blue, align: 'left', alpha: a });
  }
  const pp = Ease.outBack(pr(B, 105.5, 106), 2);
  if (pp > 0) { g.save(); g.translate(RX, 672); g.scale(pp, pp); pill('시총 대비 상위 8%', 0, 0, { size: 24, w: 700, strokeCol: 'rgba(244,241,234,0.5)' }); g.restore(); }
  if (B >= 106.5) {
    const gp = Ease.outExpo(pr(B, 106.5, 108)) * (D.own / 100);
    const gx = 1530, gy = 820, r = 70;
    g.lineWidth = 14; g.strokeStyle = C.inkF; g.beginPath(); g.arc(gx, gy, r, 0, TAU); g.stroke();
    g.strokeStyle = C.red; g.lineCap = 'round'; g.beginPath(); g.arc(gx, gy, r, -Math.PI / 2, -Math.PI / 2 + TAU * gp); g.stroke(); g.lineCap = 'butt';
    numText((gp * 100).toFixed(2) + '%', gx, gy + 9, { size: 26, w: 800, align: 'center' });
    text('외국인', gx + 100, gy - 16, { size: 24, w: 700, mono: true, color: C.inkD, align: 'left' });
    text('소진율', gx + 100, gy + 16, { size: 24, w: 700, mono: true, color: C.inkD, align: 'left' });
  }
  if (B >= 111.3) { g.globalAlpha = Ease.inCubic(pr(B, 111.3, 112)); fillAll('#03112B'); g.globalAlpha = 1; }
}

/* ============================================================
   06 — CATALYST (B112–128)
   ============================================================ */
function drawLock(x, y, s, open, gold) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.save();
  g.translate(-70, -110); g.rotate(-0.42 * open); g.translate(70, 110);
  g.translate(0, -60 * open);
  g.strokeStyle = gold > 0.5 ? C.gold : '#CFC8B8'; g.lineWidth = 34; g.lineCap = 'butt';
  g.beginPath(); g.moveTo(-70, -100); g.lineTo(-70, -170); g.arc(0, -170, 70, Math.PI, 0); g.lineTo(70, -100); g.stroke();
  g.restore();
  const gr = g.createLinearGradient(0, -115, 0, 115);
  gr.addColorStop(0, gold > 0 ? `rgba(255,${200 - gold * 10},${90 - gold * 30},1)` : '#EDE7DA');
  gr.addColorStop(1, gold > 0 ? '#E09A1A' : '#BDB5A3');
  g.fillStyle = gold > 0.02 ? gr : '#E6E0D2';
  if (gold > 0.02) { g.shadowColor = C.gold; g.shadowBlur = 60 * gold; }
  rr(-150, -115, 300, 230, 28); g.fill(); g.shadowBlur = 0;
  g.fillStyle = '#1A1710';
  g.beginPath(); g.arc(0, -30, 22, 0, TAU); g.fill();
  g.fillRect(-9, -30, 18, 50);
  text('배당가능이익', 0, 72, { size: 32, w: 800, color: '#1A1710' });
  g.restore();
}
function sCatalyst(B, t, F) {
  const fadeA = 1 - Ease.inOutCubic(pr(B, 123.3, 124.1));
  if (fadeA > 0.01) {
    g.save();
    g.globalAlpha = fadeA;
    const base = 790, X = [300, 520, 740], maxH = 300, BWd = 150;
    revealUp('주당배당금 (원)', 225, 320, { size: 28, w: 700, mono: true, color: C.gold, align: 'left', ls: 1 }, B, 113, 0.5, 0.02);
    const bl = Ease.outExpo(pr(B, 113.2, 114));
    g.strokeStyle = C.inkD; g.lineWidth = 2; line(200, base, 200 + 660 * bl, base);
    ['2023', '2024', '2025'].forEach((yr, i) => text(yr, X[i], base + 36, { size: 26, w: 600, mono: true, color: C.inkD, alpha: fadeA * pr(B, 113.3 + i * 0.2, 113.8 + i * 0.2) }));
    const lp = pr(B, 113.5, 114.3);
    if (lp > 0) {
      const h = maxH * Ease.outBack(lp, 1.4);
      g.save(); g.beginPath(); g.rect(X[0] - BWd / 2, base - h, BWd, h); g.clip();
      g.fillStyle = C.gold; g.fillRect(X[0] - BWd / 2, base - h, BWd, h);
      g.fillStyle = 'rgba(120,70,0,0.35)';
      for (let yy = base - 14; yy > base - h; yy -= 22) g.fillRect(X[0] - BWd / 2, yy, BWd, 3);
      g.restore();
      text('2,063원', X[0], base - h - 34, { size: 44, w: 900, color: C.gold });
    }
    for (let i = 1; i < 3; i++) {
      const q = pr(B, 113.5 + i, 114 + i);
      if (q <= 0) continue;
      g.save(); g.globalAlpha = fadeA * 0.35 * q; g.setLineDash([8, 8]); g.strokeStyle = C.ink; g.lineWidth = 2;
      rr(X[i] - BWd / 2, base - maxH, BWd, maxH, 4); g.stroke(); g.setLineDash([]); g.restore();
      g.fillStyle = C.red; g.globalAlpha = fadeA; g.fillRect(X[i] - BWd / 2, base - 4, BWd * Ease.outExpo(q), 4);
      const e = Ease.outBack(q, 2);
      g.save(); g.translate(X[i], base - 60); g.scale(e, e); text('0원', 0, 0, { size: 52, w: 900, color: C.red }); g.restore();
    }
    revealUp('2024년부터, 배당이 멈췄다.', 200, 905, { size: 46, w: 800, align: 'left' }, B, 116.5, 0.6, 0.03);

    const LX = 1360, LY = 640;
    const ls = Ease.outBack(pr(B, 117.5, 118.2), 1.6) * 0.86;
    if (ls > 0) {
      const op = Ease.outBack(pr(B, 120, 120.7), 2);
      const gd = Ease.outCubic(pr(B, 120, 120.8));
      drawLock(LX, LY, ls, op, gd);
      if (B < 120) {
        const sh = Math.exp(-(B - 118) * 3) * (B >= 118 ? 1 : 0);
        if (sh > 0.02) ring(B, 117.6, LX, LY, { r: 300, life: 0.5, lw: 4, col: C.ink });
      }
    }
    revealUp('해약환급금준비금 (해준금)', LX, 330, { size: 38, w: 800, color: C.orange }, B, 118.5, 0.5, 0.02);
    if (B < 120.6) revealUp('쌓아야 할 준비금이 배당 재원을 묶었다', LX, 820, { size: 34, w: 600, color: C.inkD }, B, 119, 0.5, 0.012);
    else revealUp('규제 완화  →  배당 여력 회복', LX, 820, { size: 42, w: 800, color: C.gold }, B, 120.6, 0.5, 0.02);
    if (B >= 120) {
      burst(B, 120, LX + 50, LY - 170, { n: 60, seed: 31, v0: 200, v1: 1100, life: 1.5, grav: 260, cols: [C.gold, '#fff', C.orange] });
      ring(B, 120, LX, LY - 60, { r: 520, life: 1, lw: 8, col: C.gold });
    }
    g.restore();
  }
  if (B >= 124) {
    revealUp('2023년 배당(2,063원)이 돌아온다면', CX, 345, { size: 54, w: 800 }, B, 124, 0.6, 0.02);
    revealUp('시가배당률', CX, 455, { size: 36, w: 700, color: C.inkD }, B, 124.5, 0.5, 0.03);
    if (B >= 124.6) {
      const cp = Ease.outExpo(pr(B, 124.6, 126.2));
      g.save(); g.shadowColor = C.gold; g.shadowBlur = 50 + env(KICKS, t, 6) * 40;
      numUnit((4.4 * cp).toFixed(1), '%', CX, 700, { size: 280, unitSize: 120, align: 'center', color: C.gold });
      g.restore();
    }
    text('※ 2,063원 ÷ 46,900원 단순 계산 · 배당 재개는 아직 확정이 아닙니다', CX, 810, { size: 24, w: 600, color: C.inkD, alpha: pr(B, 126, 126.6) });
  }
}

/* ============================================================
   REPORTS (B128–136)
   ============================================================ */
function sReports(B, t, F) {
  if (B >= 135.5) { fillAll('#000'); return; }
  const out = Ease.inOutCubic(pr(B, 133.8, 134.4));
  text('증권가의 시선', CX, 262, { size: 28, w: 700, mono: true, color: C.orange, ls: 6, alpha: (1 - out) * pr(B, 128, 128.4) });
  const slots = [405, 615, 825], rots = [-0.022, 0.016, -0.012];
  for (let i = 0; i < 3; i++) {
    const b0 = 128 + i * 2, lp = pr(B, b0, b0 + 0.5);
    if (lp <= 0) continue;
    const e = Ease.outExpo(lp), dir = i % 2 ? 1 : -1;
    const x = CX + dir * 1500 * (1 - e), y = slots[i];
    g.save();
    g.globalAlpha = 1 - out * 0.85;
    g.translate(x, y); g.rotate(lerp(dir * 0.15, rots[i], e));
    const s = (1 - out * 0.1) * (1 + Math.exp(-(B - b0) * 6) * 0.04);
    g.scale(s, s);
    const cw = 1480, chh = 170;
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
    g.fillStyle = C.ink; rr(-cw / 2, -chh / 2, cw, chh, 22); g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.fillStyle = C.orange; rr(-cw / 2, -chh / 2, 16, chh, [22, 0, 0, 22]); g.fill();
    text('“', -cw / 2 + 86, 4, { size: 170, w: 900, color: C.orange });
    const [hd, src, dt] = D.reports[i];
    const hs = fitSize(hd, cw - 330, 64, 900);
    text(hd, -cw / 2 + 165, -14, { size: hs, w: 900, color: '#0B0C10', align: 'left' });
    text(`${src}  ·  ${dt}`, -cw / 2 + 168, 48, { size: 24, w: 700, mono: true, color: C.orange, align: 'left' });
    g.restore();
  }
  if (B >= 134) {
    for (const st of SNARES) {
      const sb = st / SPB;
      if (sb < 134 || sb > B || B - sb > 1) continue;
      ring(B, sb, CX, CY, { r: 1100, r0: 200, life: 0.5, lw: 3, alpha: 0.4, col: C.orange });
    }
    const z = 1 + Ease.inQuad(pr(B, 134, 135.5)) * 0.3;
    g.save(); g.translate(CX, CY); g.scale(z, z); g.translate(-CX, -CY);
    slam('그래서, 점수는?', CX, CY, { size: 170, w: 900, colorFn: hl('그래서, 점수는?', '점수', C.orange) }, B, 134, 0.35, 0.05, 2.2);
    g.restore();
  }
}

/* ============================================================
   SCORE (B136–144)
   ============================================================ */
function sScore(B, t, F) {
  const TX = 150, TY = 300, TS = 400;
  burst(B, 136, TX + TS / 2, TY + TS / 2, { n: 80, seed: 61, v0: 400, v1: 2200, life: 1.3 });
  ring(B, 136, TX + TS / 2, TY + TS / 2, { r: 1200, life: 0.9, lw: 14, col: C.orange });
  text('종합 점수', TX, 262, { size: 26, w: 700, mono: true, color: C.inkD, align: 'left', ls: 4, alpha: pr(B, 136, 136.4) });
  const tp = Ease.outBack(pr(B, 136, 136.5), 1.5);
  if (tp > 0) {
    g.save(); g.translate(TX + TS / 2, TY + TS / 2); g.scale(tp, tp);
    g.shadowColor = C.orange; g.shadowBlur = 40 + env(KICKS, t, 7) * 50;
    const gr = g.createLinearGradient(-TS / 2, -TS / 2, TS / 2, TS / 2);
    gr.addColorStop(0, C.orange2); gr.addColorStop(1, C.orange);
    g.fillStyle = gr; rr(-TS / 2, -TS / 2, TS, TS, 64); g.fill();
    g.shadowBlur = 0;
    numText(String(Math.round(60 * Ease.outExpo(pr(B, 136.1, 137.8)))), 0, 70, { size: 230, w: 900, color: '#0A0B10', align: 'center' });
    text('B · 매력', 0, 138, { size: 44, w: 800, color: '#0A0B10' });
    g.restore();
  }
  const RX = 640, TRX = 830, TRW = 700, VX = 1780, RY0 = 320, RH = 88;
  const HL = { 1: 141, 3: 142, 0: 143 };
  D.scores.forEach(([lab, v, mx], i) => {
    const b0 = 137 + i * 0.5, lp = pr(B, b0, b0 + 0.3);
    if (lp <= 0) return;
    const y = RY0 + i * RH, a = Ease.outExpo(lp);
    text(lab, RX + (1 - a) * -30, y, { size: 40, w: 800, align: 'left', alpha: a });
    g.globalAlpha = a; g.fillStyle = C.inkF; rr(TRX, y - 10, TRW, 20, 10); g.fill(); g.globalAlpha = 1;
    const fp = Ease.outExpo(pr(B, b0 + 0.1, b0 + 1));
    if (mx > 0) {
      const r = v / mx, col = r >= 0.75 ? C.mint : r >= 0.45 ? C.gold : C.red;
      g.save();
      if (HL[i] != null && B >= HL[i]) { g.shadowColor = col; g.shadowBlur = 10 + Math.exp(-(B - HL[i]) * 3) * 50; }
      g.fillStyle = col; rr(TRX, y - 10, Math.max(20, TRW * r * fp), 20, 10); g.fill();
      g.restore();
      const den = ` / ${mx}`;
      const dw = textW(den, 28, 700);
      text(den, VX, y + 2, { size: 28, w: 700, color: C.inkD, align: 'right', alpha: a });
      numText((v * fp).toFixed(v % 1 ? 1 : 0), VX - dw - 4, y + 14, { size: 42, w: 800, align: 'right', alpha: a });
    } else {
      text('-3', VX, y + 2, { size: 42, w: 800, color: C.red, align: 'right', alpha: a });
      text('부채비율 878%', TRX, y + 2, { size: 26, w: 600, mono: true, color: C.inkD, align: 'left', alpha: a });
    }
  });
  revealUp('수익성 · 추세 · 가치가', TX, 790, { size: 40, w: 800, align: 'left' }, B, 141, 0.5, 0.03);
  revealUp('점수를 끌어올렸다.', TX, 848, { size: 40, w: 800, align: 'left', color: C.orange }, B, 141.5, 0.5, 0.03);
}

/* ============================================================
   RISK (B144–152) — underwater
   ============================================================ */
function underwater(t, B) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#0B4290'); gr.addColorStop(0.55, '#072556'); gr.addColorStop(1, '#020A1E');
  fillAll(gr);
  g.fillStyle = '#BFE6FF';
  for (let k = 0; k < 7; k++) {
    const x = (k / 7) * W + 120 + Math.sin(t * 0.6 + k * 1.7) * 140;
    g.globalAlpha = 0.045 + 0.02 * Math.sin(t * 1.3 + k);
    g.beginPath(); g.moveTo(x - 30, -20); g.lineTo(x + 50, -20); g.lineTo(x + 260, H + 20); g.lineTo(x + 40, H + 20); g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#CFEFFF';
  for (let i = 0; i < 50; i++) {
    const sp = 90 + rnd(i, 3) * 200;
    const y = H + 40 - fract(rnd(i, 4) + (t * sp) / (H + 80)) * (H + 80);
    const x = rnd(i, 5) * W + Math.sin(t * 2.2 + i) * 14;
    const r = 2 + rnd(i, 6) * 8;
    g.globalAlpha = 0.28; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  }
  g.globalAlpha = 1;
}
const RISKS = [
  ['단기 타이밍 2/10', '스토캐스틱 %K 23 < %D 31 · 내리는 흐름'],
  ['기관 5일 순매도 -100억', '외국인이 받아내는 중이지만, 지켜볼 부분'],
  ['배당은 아직 0원', '해준금 완화 효과는 아직 ‘기대’ 단계'],
  ['부채비율 878%', '보험업 특성상 구조적으로 높게 나오는 수치'],
];
function sonar(B, t, x, y) {
  const R0 = 300;
  g.save();
  g.strokeStyle = 'rgba(190,230,255,0.22)'; g.lineWidth = 1.5;
  for (let k = 1; k <= 4; k++) { g.beginPath(); g.arc(x, y, (R0 * k) / 4, 0, TAU); g.stroke(); }
  line(x - R0, y, x + R0, y); line(x, y - R0, x, y + R0);
  for (const kt of KICKS) {
    const kb = kt / SPB;
    if (kb < 144 || kb > B || B - kb > 1.4) continue;
    ring(B, kb, x, y, { r: R0, r0: 4, life: 0.75, lw: 3, alpha: 0.5, col: '#9FDcff' });
  }
  const ang = (B - 144) * (TAU / 4);
  const sw = g.createRadialGradient(x, y, 0, x, y, R0);
  sw.addColorStop(0, 'rgba(120,210,255,0.28)'); sw.addColorStop(1, 'rgba(120,210,255,0)');
  g.fillStyle = sw;
  g.beginPath(); g.moveTo(x, y); g.arc(x, y, R0, ang - 0.6, ang); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(160,225,255,0.7)'; g.lineWidth = 2;
  line(x, y, x + Math.cos(ang) * R0, y + Math.sin(ang) * R0);
  const BL = [[0.6, 0.35, 145], [2.3, 0.62, 146], [3.9, 0.48, 147], [5.1, 0.8, 148]];
  BL.forEach(([a, r, b0]) => {
    if (B < b0) return;
    const age = ((ang - a) % TAU + TAU) % TAU;
    const glow = Math.exp(-age * 1.2);
    const bx = x + Math.cos(a) * R0 * r, by = y + Math.sin(a) * R0 * r;
    g.fillStyle = C.gold; g.globalAlpha = 0.35 + glow * 0.65;
    g.beginPath(); g.arc(bx, by, 7 + glow * 5, 0, TAU); g.fill();
    g.globalAlpha = 1;
  });
  text('DEPTH CHECK', x, y + R0 + 40, { size: 20, w: 700, mono: true, color: 'rgba(190,230,255,0.6)', ls: 6 });
  g.restore();
}
function sRisk(B, t, F) {
  underwater(t, B);
  g.save(); g.globalAlpha = 1 - Ease.inExpo(pr(B, 149.4, 150)); sonar(B, t, 1430, 620); g.restore();
  const outI = Ease.inExpo(pr(B, 149.4, 150));
  g.save(); g.globalAlpha = 1 - outI;
  revealUp('잠깐, 리스크도 보자.', 150, 300, { size: 84, w: 900, align: 'left' }, B, 144.5, 0.6, 0.03);
  g.restore();
  RISKS.forEach(([a, b], i) => {
    const b0 = 145 + i, lp = Ease.outExpo(pr(B, b0, b0 + 0.6));
    if (lp <= 0) return;
    const y = 440 + i * 120;
    g.save();
    g.globalAlpha = lp * (1 - outI);
    g.translate((1 - lp) * -60 - outI * 200, 0);
    g.fillStyle = C.gold; g.beginPath(); g.arc(185, y + 4, 27, 0, TAU); g.fill();
    text('!', 185, y + 6, { size: 38, w: 900, color: '#0A0B10' });
    text(a, 240, y - 10, { size: 48, w: 800, align: 'left' });
    text(b, 242, y + 38, { size: 27, w: 500, align: 'left', color: 'rgba(220,236,255,0.72)' });
    g.restore();
  });
  if (B >= 150) {
    if (B >= 151.5) { fillAll('#000'); return; }
    const z = 1 + Ease.inQuad(pr(B, 150.4, 151.5)) * 0.25;
    g.save(); g.translate(CX, CY); g.scale(z, z); g.translate(-CX, -CY);
    slam('그럼에도.', CX, CY, { size: 240, w: 900 }, B, 150, 0.36, 0.07, 2.4);
    g.restore();
  }
}

/* ============================================================
   SLOGAN (B152–160)
   ============================================================ */
const SLOG = [
  { b: 152, w: '싸다.', sub: 'PER 3.6배  ·  PBR 0.57배', bg: C.orange, fg: '#0A0B10', dir: 1 },
  { b: 154, w: '잘 번다.', sub: 'ROE 20.6%  ·  순이익 1조+', bg: C.ink, fg: '#0A0B10', dir: -1 },
  { b: 156, w: '오른다.', sub: '6개월 +54%  ·  외국인 5일 연속 순매수', bg: C.red, fg: C.ink, dir: 1 },
];
function sSlogan(B, t, F) {
  if (B < 158) {
    const i = B < 154 ? 0 : B < 156 ? 1 : 2, s = SLOG[i], lb = B - s.b;
    fillAll(i ? SLOG[i - 1].bg : '#000');
    const rp = Ease.outExpo(pr(lb, 0, 0.3));
    const sk = 420, edge = lerp(-sk - 60, W + sk + 60, rp);
    g.save();
    g.beginPath();
    if (s.dir > 0) { g.moveTo(-300, -300); g.lineTo(edge + sk, -300); g.lineTo(edge - sk, H + 300); g.lineTo(-300, H + 300); }
    else { g.moveTo(W + 300, -300); g.lineTo(W - edge - sk, -300); g.lineTo(W - edge + sk, H + 300); g.lineTo(W + 300, H + 300); }
    g.closePath(); g.clip();
    fillAll(s.bg);
    for (let r = 0; r < 3; r++) {
      const row = `${s.w}   ${s.w}   ${s.w}   ${s.w}   `;
      const w = textW(row, 260, 900) / 2;
      const off = ((t * 220 * (r % 2 ? 1 : -1)) % w + w) % w;
      text(row + row, -off, 170 + r * 370, { size: 260, w: 900, stroke: 2, color: s.fg, alpha: 0.1, align: 'left' });
    }
    slam(s.w, CX, CY - 40, { size: 420, w: 900, color: s.fg }, B, s.b, 0.32, 0.06, 2.0);
    revealUp(s.sub, CX, CY + 240, { size: 46, w: 700, color: s.fg }, B, s.b + 0.5, 0.5, 0.012);
    g.restore();
    return;
  }
  if (B >= 159.75) { fillAll('#000'); return; }
  fillAll('#06070C');
  const coll = Ease.inExpo(pr(B, 159.3, 159.75));
  g.save();
  g.translate(CX, CY); g.scale(1 - coll * 0.98, 1 - coll * 0.98); g.translate(-CX, -CY);
  const ws = ['싸다.', '잘 번다.', '오른다.'], cols = [C.orange, C.ink, C.red];
  ws.forEach((w, i) => slam(w, CX + (i - 1) * 560, CY, { size: 150, w: 900, color: cols[i] }, B, 158 + i * 0.5, 0.3, 0.05, 2));
  g.restore();
}

/* ============================================================
   OUTRO (B160–172)
   ============================================================ */
function sOutro(B, t, F) {
  ring(B, 160, CX, 430, { r: 1400, life: 1.1, lw: 18, col: C.orange });
  ring(B, 160.06, CX, 430, { r: 1100, life: 1, lw: 6, col: C.ink });
  burst(B, 160, CX, 430, { n: 130, seed: 99, v0: 500, v1: 2700, life: 1.9 });
  const z = 1 - Ease.outCubic(pr(B, 160, 172)) * 0.05;
  g.save(); g.translate(CX, CY); g.scale(z, z); g.translate(-CX, -CY);
  slam('현대해상', CX, 420, { size: 250, w: 900 }, B, 160, 0.4, 0.07, 2.8);
  const tw = textW('현대해상', 250, 900), up = Ease.outExpo(pr(B, 160.6, 161.4));
  if (up > 0) { g.fillStyle = C.orange; g.fillRect(CX - (tw / 2) * up, 548, tw * up, 14); }
  revealUp('싸게, 잘 벌고, 오르는 중.', CX, 645, { size: 58, w: 800 }, B, 161.5, 0.6, 0.03);
  revealUp('001450  ·  KOSPI  ·  손해보험  ·  종합 60점 B', CX, 735, { size: 26, w: 700, mono: true, color: C.inkD, ls: 2 }, B, 162.5, 0.5, 0.01);
  g.restore();
  const da = Ease.outCubic(pr(B, 164, 165));
  text('본 영상은 2026년 10월 8일 종가 기준 공개 데이터로 만든 정보 제공용 콘텐츠이며, 특정 종목의 매수·매도를 권유하지 않습니다.', CX, 905, { size: 22, w: 500, color: C.inkD, alpha: da });
  text('투자 판단과 그에 따른 책임은 투자자 본인에게 있습니다. 증권사 리포트 제목은 각 사 원문을 인용했습니다.', CX, 940, { size: 22, w: 500, color: C.inkD, alpha: da });
  const fo = pr(B, 168.5, 172);
  if (fo > 0) { g.globalAlpha = Ease.inCubic(fo); fillAll('#000'); g.globalAlpha = 1; }
}

/* ---------------- HUD & transitions ---------------- */
function drawHUD(B, t, F) {
  const a = pr(B, 16.5, 17.5) * (1 - pr(B, 151, 152));
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  text('현대해상  001450', 1800, 74, { size: 20, w: 700, mono: true, color: C.ink, align: 'right', alpha: 0.75 });
  text('2026.10.08 CLOSE  46,900', 1800, 102, { size: 16, w: 600, mono: true, color: C.inkD, align: 'right' });
  const bi = Math.floor(B) % 4;
  for (let k = 0; k < 4; k++) { g.fillStyle = k === bi ? C.orange : C.inkF; g.fillRect(1800 - (3 - k) * 16 - 8, 124, 8, 8); }
  g.strokeStyle = C.ink; g.globalAlpha = a * 0.28; g.lineWidth = 2;
  const m = 44, l = 30;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    g.beginPath(); g.moveTo(x, y + sy * l); g.lineTo(x, y); g.lineTo(x + sx * l, y); g.stroke();
  });
  g.restore();
}
const GAPS = [[15.5, 16], [79.5, 80], [135.5, 136], [151.5, 152], [159.75, 160]];
const WIPES = [{ b: 48, dir: 1 }, { b: 64, dir: -1 }, { b: 96, dir: 1 }, { b: 128, dir: -1, cols: [C.orange, C.ink, '#08060A'] }];
function drawWipes(B, t) {
  for (const wp of WIPES) {
    const lb = B - wp.b;
    if (lb < -0.6 || lb >= 0) continue;
    const cols = wp.cols || [C.orange, C.ink, '#05070F'];
    const sk = 260;
    const spans = [[-0.58, -0.16], [-0.5, -0.08], [-0.42, -0.01]];
    for (let k = 0; k < 3; k++) {
      const p = Ease.inOutCubic(pr(lb, spans[k][0], spans[k][1]));
      if (p <= 0) continue;
      const edge = lerp(-sk - 60, W + sk + 60, p);
      g.fillStyle = cols[k];
      g.beginPath();
      if (wp.dir > 0) { g.moveTo(-300, -300); g.lineTo(edge + sk, -300); g.lineTo(edge - sk, H + 300); g.lineTo(-300, H + 300); }
      else { g.moveTo(W + 300, -300); g.lineTo(W - edge - sk, -300); g.lineTo(W - edge + sk, H + 300); g.lineTo(W + 300, H + 300); }
      g.closePath(); g.fill();
    }
  }
  if (B >= 143.35 && B < 144) {
    const p = Ease.inOutCubic(pr(B, 143.35, 144));
    const sy = lerp(H + 120, -160, p);
    const gr = g.createLinearGradient(0, sy, 0, sy + H);
    gr.addColorStop(0, '#0B4290'); gr.addColorStop(1, '#020A1E');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-50, H + 400);
    for (let x = -50; x <= W + 50; x += 20) g.lineTo(x, sy + Math.sin(x * 0.012 + t * 9) * 26 + Math.sin(x * 0.031 - t * 6) * 10);
    g.lineTo(W + 50, H + 400); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(190,230,255,0.8)'; g.lineWidth = 3;
    g.beginPath();
    for (let x = -50; x <= W + 50; x += 20) { const y = sy + Math.sin(x * 0.012 + t * 9) * 26 + Math.sin(x * 0.031 - t * 6) * 10; x === -50 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
}

/* ---------------- scene table & frame ---------------- */
const SCENES = [
  { b0: 0, b1: 16, f: sHook },
  { b0: 16, b1: 24, f: sTitle },
  { b0: 24, b1: 36, f: sPER },
  { b0: 36, b1: 48, f: sPBR },
  { b0: 48, b1: 64, f: sROE },
  { b0: 64, b1: 80, f: sGrowth },
  { b0: 80, b1: 96, f: sTrend },
  { b0: 96, b1: 112, f: sFlow },
  { b0: 112, b1: 128, f: sCatalyst },
  { b0: 128, b1: 136, f: sReports },
  { b0: 136, b1: 144, f: sScore },
  { b0: 144, b1: 152, f: sRisk },
  { b0: 152, b1: 160, f: sSlogan },
  { b0: 160, b1: 999, f: sOutro },
];
function drawFrame(t) {
  const B = t / SPB;
  const F = { kick: env(KICKS, t, 9), energy: energyAt(t) };
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0; g.shadowColor = 'transparent';
  g.setLineDash([]); g.lineCap = 'butt'; g.lineJoin = 'miter';
  background(B, t, F);
  for (const [a, b] of GAPS) if (B >= a && B < b) { fillAll('#000'); const p = postParams(B, t); p.flash = 0; p.zoom = 0; return p; }
  const cam = camera(B, t);
  g.save();
  g.translate(CX + cam.sx, CY + cam.sy); g.rotate(cam.r); g.scale(cam.z, cam.z); g.translate(-CX, -CY);
  for (const s of SCENES) if (B >= s.b0 && B < s.b1) s.f(B, t, F);
  drawChapter(B, t);
  g.restore();
  drawTracker(B);
  drawHUD(B, t, F);
  drawWipes(B, t);
  return postParams(B, t);
}
