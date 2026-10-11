'use strict';
/* ============================================================
   SCENES — every frame is a pure function of time t.
   B = t / SPB (time in beats). Cue sheet is shared with music.js
   ============================================================ */
let ENERGY = null;
const energyAt = (t) => { if (!ENERGY) return 0.5; const i = clamp(Math.floor(t * 60), 0, ENERGY.length - 1); return ENERGY[i]; };

const SECT = [
  { b: 0, top: '#CFE8FF', bot: '#FFE3EE', blobs: [C.pink, C.butter, C.sky] },
  { b: 16, top: '#BEE2FF', bot: '#FFF0DA', blobs: [C.butter, C.pink, C.mint] },
  { b: 32, top: '#CDF3E3', bot: '#FFF8EF', blobs: [C.mint, C.sky, C.butter] },
  { b: 56, top: '#FFE1CC', bot: '#FFF5D6', blobs: [C.peach, C.butter, C.pink] },
  { b: 72, top: '#C6E6FF', bot: '#EAFDF3', blobs: [C.sky, C.mint, C.white] },
  { b: 80, top: '#C9BEFF', bot: '#FFD8EA', blobs: [C.lav2, C.pink, C.sky2] },
  { b: 104, top: '#FFDCE8', bot: '#FFF6EC', blobs: [C.pink, C.mint, C.butter] },
  { b: 120, top: '#C3E4FF', bot: '#FFE0EC', blobs: [C.pink, C.butter, C.mint, C.lav] },
  { b: 136, top: '#FFE8D6', bot: '#FFF8EF', blobs: [C.peach, C.pink, C.butter] },
];
const sectAt = (B) => { let s = SECT[0]; for (const x of SECT) if (B >= x.b) s = x; return s; };

/* ---------------- background ---------------- */
let DOTS = null;
function makeDots() {
  const c = document.createElement('canvas'); c.width = W + 120; c.height = H + 120;
  const x = c.getContext('2d'); x.fillStyle = '#fff';
  for (let yy = 0; yy < c.height; yy += 60) for (let xx = (yy / 60) % 2 ? 30 : 0; xx < c.width; xx += 60) { x.beginPath(); x.arc(xx, yy, 4, 0, TAU); x.fill(); }
  return c;
}
function blobs(t, cols, alpha = 0.55) {
  for (let i = 0; i < 6; i++) {
    const x = (0.1 + rnd(i, 1) * 0.8) * W + Math.sin(t * 0.18 + i * 1.7) * 160;
    const y = (0.1 + rnd(i, 2) * 0.8) * H + Math.cos(t * 0.15 + i * 2.3) * 110;
    const r = 260 + rnd(i, 3) * 260;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    const col = cols[i % cols.length];
    rg.addColorStop(0, col); rg.addColorStop(1, col + '00');
    g.globalAlpha = alpha; g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
}
function cloudLayer(t, y0, n, sc, speed, alpha, seed = 1) {
  g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const cw = 560 * sc * (0.7 + rnd(i, seed) * 0.6), ch = 260 * sc * (0.7 + rnd(i, seed) * 0.6);
    const span = W + cw;
    const x = ((rnd(i, seed + 1) * span - t * speed * (0.7 + rnd(i, seed + 2) * 0.6)) % span + span) % span - cw;
    const y = y0 + (rnd(i, seed + 3) - 0.5) * 260;
    g.drawImage(CLOUDS[i % CLOUDS.length], x, y, cw, ch);
  }
  g.globalAlpha = 1;
}
function petals(t, n, alpha = 0.8, cols = ['#FFC2D4', '#FFD9E4', '#FFB3C9']) {
  for (let i = 0; i < n; i++) {
    const sp = 40 + rnd(i, 21) * 70;
    const x = ((rnd(i, 22) * (W + 200) + t * (30 + rnd(i, 23) * 40) + Math.sin(t * 0.9 + i) * 40) % (W + 200)) - 100;
    const y = ((rnd(i, 24) * (H + 200) + t * sp) % (H + 200)) - 100;
    g.globalAlpha = alpha * (0.6 + 0.4 * rnd(i, 25));
    petal(x, y, 7 + rnd(i, 26) * 7, t * (1 + rnd(i, 27)) + i, cols[i % cols.length]);
  }
  g.globalAlpha = 1;
}
function twinkles(t, n, col, alpha, yMax = H, seed = 41) {
  for (let i = 0; i < n; i++) {
    const x = rnd(i, seed) * W, y = rnd(i, seed + 1) * yMax;
    const tw = Math.pow(0.5 + 0.5 * Math.sin(t * (1.5 + rnd(i, seed + 2) * 2) + i * 2.1), 3);
    g.globalAlpha = alpha * tw;
    sparkle(x, y, 6 + rnd(i, seed + 3) * 12, col, i);
  }
  g.globalAlpha = 1;
}
function background(B, t, F) {
  const s = sectAt(B);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, s.top); gr.addColorStop(1, s.bot);
  fillAll(gr);
  blobs(t, s.blobs, 0.5 + F.kick * 0.08);
  g.globalAlpha = 0.18;
  g.drawImage(DOTS, -((t * 14) % 60) - 60, -((t * 8) % 60) - 60);
  g.globalAlpha = 1;
}

/* ---------------- camera & post ---------------- */
function camera(B, t) {
  const kick = env(KICKS, t, 10);
  const imp = impactEnv(t, 5);
  let amp = imp * 6;
  if (B >= 90 && B < 91.2) amp += (1 - pr(B, 90, 91.2)) * 26;
  const sx = vnoise(t * 14, 1) * amp + Math.sin(t * 0.35) * 6, sy = vnoise(t * 14, 2) * amp + Math.cos(t * 0.29) * 4;
  const r = vnoise(t * 7, 3) * amp * 0.0006 + Math.sin(t * 0.21) * 0.002;
  const z = 1 + kick * 0.006 + imp * 0.01;
  return { sx, sy, r, z };
}
const FLASHES = [[16, 0.55], [90, 0.75], [120, 0.55], [140, 0.4]];
function postParams(B, t) {
  const kick = env(KICKS, t, 12), imp = impactEnv(t, 4.5);
  let flash = 0;
  for (const [fb, s] of FLASHES) { const d = (B - fb) * SPB; if (d >= 0 && d < 0.8) flash = Math.max(flash, s * Math.exp(-d * 6)); }
  return { ca: 0.05 + imp * 0.35 + kick * 0.05, flash, bloom: 0.38, grain: 0.03, vig: 0.55, warm: 0.5 + 0.5 * Math.sin(t * 0.2), seed: Math.floor(t * 24) % 997 };
}

/* ---------------- transitions ---------------- */
function iris(B, b, cols, x = CX, y = CY) {
  const R = Math.hypot(W, H) * 0.62 + Math.hypot(x - CX, y - CY);
  if (B >= b - 0.62 && B < b) {
    cols.forEach((c, k) => {
      const p = Ease.inCubic(pr(B, b - 0.62 + k * 0.12, b - 0.12 + k * 0.06));
      if (p > 0) circle(x, y, R * p, c);
    });
  } else if (B >= b && B < b + 0.7) {
    const p = Ease.outCubic(pr(B, b, b + 0.7));
    g.fillStyle = cols[cols.length - 1];
    g.beginPath(); g.rect(-400, -400, W + 800, H + 800); g.arc(x, y, R * p, 0, TAU, true); g.fill('evenodd');
  }
}
function cloudWipe(B, b, col = C.white) {
  const lb = B - b;
  if (lb < -0.9 || lb >= 0.9) return;
  const p = Ease.inOutSine(pr(lb, -0.9, 0.9));
  const bw = W + 700, x0 = lerp(W + 120, -bw - 120, p);
  g.fillStyle = col;
  g.fillRect(x0, -50, bw, H + 100);
  for (const side of [0, 1]) {
    const ex = side ? x0 + bw : x0;
    for (let i = 0; i < 9; i++) {
      const yy = -40 + i * 145, r = 95 + rnd(i, side + 3) * 70;
      circle(ex + (side ? -1 : 1) * 20 + Math.sin(i * 1.9) * 40, yy, r, col);
    }
  }
}

/* ---------------- shared pieces ---------------- */
// chapter header: big centred → compact top-left
function chapterHeader(B, gi, b0, b1) {
  if (B < b0 || B >= b1) return;
  const G = GAMES[gi], lb = B - b0;
  const m = Ease.inOutCubic(pr(lb, 2.4, 3.3));
  const out = pr(B, b1 - 0.5, b1);
  g.save();
  g.globalAlpha = 1 - out;
  // badge
  const bx = lerp(CX, 112, m), by = lerp(CY - 150, 104, m), br = lerp(96, 44, m);
  const bp = popE(B, b0, 0.55, 2.6);
  if (bp > 0) {
    g.save(); g.translate(bx, by); g.scale(bp, bp); g.rotate(Math.sin(t0(B) * 2.2) * 0.04);
    circle(0, 8, br, SH); circle(0, 0, br, G.col);
    g.lineWidth = br * 0.12; g.strokeStyle = C.white; g.beginPath(); g.arc(0, 0, br, 0, TAU); g.stroke();
    text(G.n, 0, 4, { size: br * 0.95, w: 700, f: 'round', color: C.white });
    g.restore();
  }
  // title
  const ts = lerp(150, 58, m);
  const tx = lerp(CX, 180, m), ty = lerp(CY + 40, 104, m);
  const al = m > 0.5 ? 'left' : 'center';
  if (m <= 0.5) jelly(G.name, tx, ty, { size: 150, f: 'kr', color: C.ink, outline: 22, ocol: C.white, shadow: SH }, B, b0 + 0.25, 0.55, 0.07);
  else text(G.name, tx, ty, { size: ts, f: 'kr', color: C.ink, outline: 12, ocol: C.white, align: al, alpha: pr(m, 0.5, 0.7) });
  // kind pill
  const kp = popE(B, b0 + 1, 0.5, 2);
  if (kp > 0) {
    const kx = m > 0.5 ? 180 + textW(G.name, 58, 400, 'kr') + 24 : CX, ky = lerp(CY + 170, 106, m);
    g.save(); g.translate(kx, ky); g.scale(kp * lerp(1, 0.78, m), kp * lerp(1, 0.78, m));
    pill(G.kind, 0, 0, { size: 38, f: 'kr', fill: G.soft, color: C.ink, align: m > 0.5 ? 'left' : 'center', dot: G.col });
    g.restore();
  }
  g.restore();
}
const t0 = (B) => B * SPB;

// pastel tracker of the four games
function drawTracker(B) {
  if (B < 32 || B >= 120.5) return;
  const inA = pr(B, 32, 33), out = pr(B, 119.5, 120.5);
  const R = [[32, 56], [56, 80], [80, 104], [104, 120]];
  const segW = 300, gap = 18, tot = segW * 4 + gap * 3, x0 = CX - tot / 2, y = 1032 + (1 - Ease.outCubic(inA)) * 60 + Ease.inCubic(out) * 60;
  g.save();
  g.globalAlpha = 1 - out;
  for (let i = 0; i < 4; i++) {
    const [a, b] = R[i], G = GAMES[i];
    const x = x0 + i * (segW + gap);
    const fp = clamp((B - a) / (b - a));
    const active = B >= a && B < b;
    rr(x, y - 6, segW, 12, 6); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
    if (fp > 0) { rr(x, y - 6, Math.max(12, segW * fp), 12, 6); g.fillStyle = G.col; g.fill(); }
    text(`${G.n}  ${G.name}`, x + 2, y - 26, { size: 21, w: 700, f: 'sans', color: active ? C.ink : C.inkD, align: 'left', alpha: active ? 1 : 0.8 });
  }
  g.restore();
}

// perspective road with lollipop trees (scooter scenes)
function road(t, hy, speed, alpha = 1) {
  g.save(); g.globalAlpha *= alpha;
  // far hills
  for (let k = 0; k < 2; k++) {
    g.fillStyle = k ? '#B9E8C4' : '#D4F2D2';
    g.beginPath(); g.moveTo(-50, hy + 4);
    for (let x = -50; x <= W + 50; x += 30) g.lineTo(x, hy - 30 - k * -14 - Math.sin(x * 0.004 + k * 2 + 0.5) * (60 - k * 26) - Math.sin(x * 0.011 + k) * 14);
    g.lineTo(W + 50, hy + 4); g.closePath(); g.fill();
  }
  const fg = g.createLinearGradient(0, hy, 0, H);
  fg.addColorStop(0, '#C6EDC0'); fg.addColorStop(1, '#A8E0A6');
  g.fillStyle = fg; g.fillRect(-50, hy, W + 100, H - hy + 60);
  const topW = 30, botW = 1700;
  g.fillStyle = '#FCE7CF';
  g.beginPath(); g.moveTo(CX - topW / 2, hy); g.lineTo(CX + topW / 2, hy); g.lineTo(CX + botW / 2, H + 40); g.lineTo(CX - botW / 2, H + 40); g.closePath(); g.fill();
  g.strokeStyle = C.white; g.lineWidth = 6;
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(CX + sd * topW * 0.42, hy); g.lineTo(CX + sd * botW * 0.42, H + 40); g.stroke(); }
  const N = 9;
  for (let k = 0; k < N; k++) {
    const u = fract(k / N + t * speed);
    const e = u * u, y = hy + (H + 40 - hy) * e, wdt = lerp(topW, botW, e);
    const dl = 18 + 150 * e, dw = 3 + 18 * e;
    g.fillStyle = C.white; g.globalAlpha = alpha * Math.min(1, u * 4);
    g.fillRect(CX - dw / 2, y, dw, dl);
    // trees both sides
    for (const sd of [-1, 1]) {
      const tx = CX + sd * (wdt * 0.5 + 40 + 260 * e), sz = 8 + 150 * e;
      const col = (k + (sd > 0 ? 1 : 0)) % 2 ? '#FFC7D8' : '#A9DE9B';
      g.fillStyle = '#C9A27E'; g.fillRect(tx - sz * 0.07, y - sz * 0.9, sz * 0.14, sz * 0.9);
      circle(tx, y - sz * 1.15, sz * 0.55, col);
      circle(tx - sz * 0.18, y - sz * 1.3, sz * 0.22, 'rgba(255,255,255,0.35)');
    }
  }
  g.restore();
}

// stat bubble with count-up
function statBubble(B, b0, x, y, big, unit, cap, col, from = 0, decimals = 0) {
  const p = popE(B, b0, 0.55, 2.2);
  if (p <= 0) return;
  const cu = Ease.outCubic(pr(B, b0, b0 + 1.4));
  const val = big == null ? null : lerp(from, big, cu);
  g.save(); g.translate(x, y + Math.sin(t0(B) * 2 + x) * 6); g.scale(p, p);
  const bw = 400, bh = 190;
  rr(-bw / 2 + 4, -bh / 2 + 12, bw, bh, 40); g.fillStyle = SH; g.fill();
  rr(-bw / 2, -bh / 2, bw, bh, 40); g.fillStyle = C.white; g.fill();
  g.beginPath(); g.moveTo(-30, bh / 2 - 2); g.lineTo(0, bh / 2 + 26); g.lineTo(26, bh / 2 - 2); g.fill();
  const s = val == null ? unit : fmt(val, decimals);
  const nw = numText(s, 0, 0, { size: 86, w: 700, f: 'round', measure: true });
  const uw = val == null ? 0 : textW(unit, 40, 400, 'kr');
  const gx = -(nw + (uw ? uw + 10 : 0)) / 2;
  numText(s, gx, 22, { size: 86, w: 700, f: 'round', color: col, align: 'left' });
  if (uw) text(unit, gx + nw + 10, 22, { size: 40, f: 'kr', color: col, align: 'left', base: 'alphabetic' });
  text(cap, 0, 62, { size: 28, w: 600, f: 'sans', color: C.inkD });
  g.restore();
}

/* ============================================================
   INTRO (B0–16)
   ============================================================ */
const POLAROIDS = [
  { img: 'splash', cap: 'DentPhoto 마을', x: 560, y: 410, r: -0.08 },
  { img: 'ride-title', cap: '바람을 따라', x: 1360, y: 390, r: 0.07 },
  { img: 'night-title', cap: '달빛의 받아치기', x: 640, y: 720, r: 0.05 },
  { img: 'civ-title', cap: '덴포토 치과 경쟁', x: 1300, y: 700, r: -0.06 },
];
function sIntro(B, t, F) {
  cloudLayer(t, 200, 5, 0.9, 26, 0.85, 3);
  petals(t, 26, 0.7);
  // words
  if (B < 8.6) {
    const out = Ease.inCubic(pr(B, 7, 8.4));
    g.save(); g.globalAlpha = 1 - out; g.translate(0, -out * 80);
    const pp = popE(B, 0.5, 0.5);
    if (pp > 0) { g.save(); g.translate(CX, 390); g.scale(pp, pp); pill('2026 · 아울러', 0, 0, { size: 36, fill: C.white, color: C.coral, dot: C.coral }); g.restore(); }
    rise('작은 마을 하나에서', CX, 550, { size: 116, f: 'kr', color: C.ink, outline: 18, ocol: C.white }, B, 1, 0.7, 0.05);
    jelly('네 가지 모험이 시작됐어요', CX, 690, { size: 116, f: 'kr', color: C.ink, outline: 18, ocol: C.white, colorFn: hl('네 가지 모험이 시작됐어요', '네 가지', C.coral) }, B, 3, 0.5, 0.055);
    twinkles(t, 10, C.white, 0.9 * pr(B, 2, 3), 600);
    g.restore();
  }
  // polaroids drop on the pops (B8–11), then push into the first one
  if (B >= 8) {
    const zp = Ease.inOutCubic(pr(B, 12.4, 16));
    const p0 = POLAROIDS[0];
    const S = lerp(1, 1920 / 600 * 1.02, zp);
    g.save();
    // camera dolly toward polaroid 0
    g.translate(CX, CY); g.scale(S, S); g.rotate(-p0.r * zp); g.translate(-lerp(CX, p0.x, zp), -lerp(CY, p0.y, zp));
    for (let i = POLAROIDS.length - 1; i >= 0; i--) {
      const P = POLAROIDS[i];
      const lp = pr(B, 8 + i, 8 + i + 0.55);
      if (lp <= 0) continue;
      const e = Ease.outBack(lp, 1.6);
      const spread = i === 0 ? 0 : Ease.inCubic(pr(B, 12.4, 15)) * 600;
      const dx = Math.sign(P.x - CX || 1) * spread, dy = Math.sign(P.y - CY) * spread * 0.6;
      card(P.img, P.x + dx, P.y - (1 - e) * 260 + dy, 600, 338, { rot: P.r * (i === 0 ? 1 : 1) + (1 - e) * 0.2, s: lerp(1.25, 1, e), alpha: Math.min(1, lp * 3), cap: P.cap, capH: 66, tape: [C.pink2, C.mint2, C.lav2, C.butter][i], lift: (1 - e) * 20 });
      if (lp < 1) ring(B, 8 + i + 0.2, P.x, P.y, { r: 380, life: 0.6, lw: 8, col: C.white });
    }
    g.restore();
  }
}

/* ============================================================
   TITLE (B16–32)
   ============================================================ */
function sTitle(B, t, F) {
  const lb = B - 16;
  const sh = Ease.inOutCubic(pr(B, 23.5, 25)); // shrink image to card
  // background behind the card (visible once it shrinks)
  if (sh > 0) { cloudLayer(t, 160, 5, 0.9, 30, 0.9, 5); petals(t, 22, 0.7); }
  const cx = lerp(CX, 560, sh), cy = lerp(CY, 520, sh), w = lerp(W + 40, 860, sh), h = lerp(H + 24, 484, sh);
  card('splash', cx, cy, w, h, { border: lerp(0, 16, sh), r: lerp(0, 26, sh), rot: lerp(0, -0.035, sh), zoom: 1.02 + lb * 0.004, fy: 0.45, tape: sh > 0.6 ? C.pink2 : null, sh: sh > 0.2 ? SH : 'transparent' });
  if (sh < 1) {
    twinkles(t, 18, C.white, 0.9 * (1 - sh), 600, 77);
    confetti(B, 16, CX, 300, { n: 70, seed: 16, v0: 400, v1: 1500, life: 2.2 });
    ring(B, 16, CX, 300, { r: 1100, life: 1, lw: 16, col: C.white });
  }
  // lower-third
  const lt = popE(B, 18, 0.6, 1.8) * (1 - Ease.inCubic(pr(B, 23, 24)));
  if (lt > 0) {
    g.save(); g.translate(CX, 940); g.scale(lt, lt);
    rr(-560 + 4, -86 + 12, 1120, 172, 86); g.fillStyle = SH; g.fill();
    rr(-560, -86, 1120, 172, 86); g.fillStyle = 'rgba(255,253,248,0.96)'; g.fill();
    g.restore();
    rise('덴포토 마을의 비밀', CX, 912, { size: 74, f: 'kr', color: C.ink }, B, 18.4, 0.6, 0.04);
    rise('아울러가 만든 게임 네 편을 소개합니다', CX, 978, { size: 34, w: 600, f: 'sans', color: C.inkD }, B, 19.2, 0.6, 0.012);
  }
  // game tickets
  for (let i = 0; i < 4; i++) {
    const G = GAMES[i];
    const p = popE(B, 24 + i, 0.5, 2);
    if (p <= 0) continue;
    const hi = B >= 28 + i * 0.75 && B < 28.75 + i * 0.75 ? 1 : 0;
    const x = 1430, y = 250 + i * 168 + Math.sin(t * 2.4 + i) * 4;
    const wob = env(SNAPS, t, 8) * 0.02 * (i % 2 ? 1 : -1);
    g.save(); g.translate(x, y); g.rotate(wob + (i % 2 ? 0.012 : -0.012)); g.scale(p * (1 + hi * 0.05), p * (1 + hi * 0.05));
    const tw = 720, th = 136;
    rr(-tw / 2 + 4, -th / 2 + 12, tw, th, 34); g.fillStyle = SH; g.fill();
    rr(-tw / 2, -th / 2, tw, th, 34); g.fillStyle = hi ? G.soft : C.white; g.fill();
    g.lineWidth = 5; g.strokeStyle = hi ? G.col : C.white; g.stroke();
    circle(-tw / 2 + 74, 0, 44, G.col);
    text(G.n, -tw / 2 + 74, 3, { size: 44, w: 700, f: 'round', color: C.white });
    text(G.name, -tw / 2 + 140, -18, { size: 50, f: 'kr', color: C.ink, align: 'left' });
    text(G.kind, -tw / 2 + 142, 30, { size: 27, w: 600, f: 'sans', color: C.inkD, align: 'left' });
    g.restore();
  }
}

/* ============================================================
   01 — DentPhoto 마을 (B32–56)
   ============================================================ */
const V_CHIPS = ['다이아 러시', '낚시', '숨은 다이아몬드', '요트 섬 일주', 'DentPhoto 치과', '포토 스팟', '실사 화질', '클라라를 찾아라'];
const V_CHIP_COLS = [C.butter, C.sky, C.mint, C.lav, C.pink, C.peach];
function sVillage(B, t, F) {
  petals(t, 18, 0.55);
  // main screenshot + bullet chips (B34–41)
  if (B < 41.5) {
    const p = pr(B, 34, 34.8), e = Ease.outBack(p, 1.4);
    const out = Ease.inCubic(pr(B, 40, 41.5));
    if (p > 0) {
      card('village-real', 1190 - out * 300, 600 + (1 - e) * 500 + out * 40, 1120, 648, { rot: 0.025 - out * 0.05, s: 1 - out * 0.2, alpha: 1 - out, zoom: 1.02 + pr(B, 34, 41) * 0.06, fx: 0.5, fy: 0.45, tape: C.pink2, tapeX: -260 });
      const pin = popE(B, 35.5, 0.5, 2.4) * (1 - out);
      if (pin > 0) { g.save(); g.translate(1340 - out * 300, 315); g.scale(pin, pin); pill('실사 화질 모드', 0, 0, { size: 30, fill: C.teal, color: C.white, border: 0 }); g.restore(); }
    }
    g.save(); g.globalAlpha = 1 - out;
    rise('봄날의 3D 마을을', 120, 360, { size: 66, f: 'kr', color: C.ink, align: 'left' }, B, 35, 0.6, 0.04);
    rise('천천히 걸어요', 120, 446, { size: 66, f: 'kr', color: C.teal, align: 'left' }, B, 35.6, 0.6, 0.04);
    const chips = ['낚시', '다이아 러시', '요트 섬 일주', '포토 스팟', '치과 미니게임', '클라라를 찾아라'];
    chips.forEach((s, i) => {
      const cp = popE(B, 37 + i * 0.5, 0.45, 2.4);
      if (cp <= 0) return;
      const x = 120 + (i % 2) * 0, y = 540 + i * 74;
      g.save(); g.translate(x, y); g.scale(cp, cp);
      pill(s, 0, 0, { size: 32, fill: V_CHIP_COLS[i % V_CHIP_COLS.length], color: C.ink, align: 'left', dot: C.teal });
      g.restore();
    });
    g.restore();
  }
  // three minigame polaroids (B40–48)
  if (B >= 40 && B < 49) {
    const out = Ease.inCubic(pr(B, 47.6, 48.6));
    jelly('마을 곳곳이 미니게임', CX, 300 - out * 300, { size: 92, f: 'kr', color: C.ink, outline: 16, ocol: C.white, shadow: SH }, B, 40.4, 0.5, 0.05);
    const M = [
      { img: 'v-yacht', cap: '요트 섬 일주', x: 400, y: 640, r: -0.05, tape: C.sky2 },
      { img: 'v-dental', cap: '충치균을 잡아요', x: 960, y: 620, r: 0.03, tape: C.pink2 },
      { img: 'v-rush', cap: '다이아 러시', x: 1520, y: 650, r: -0.025, tape: C.butter },
    ];
    M.forEach((m, i) => {
      const lp = pr(B, 40 + i * 2, 40.55 + i * 2);
      if (lp <= 0) return;
      const e = Ease.outBack(lp, 1.8);
      const bob = Math.sin(t * 1.6 + i * 2) * 8 + env(KICKS, t, 10) * -6;
      card(m.img, m.x, m.y + (1 - e) * 220 + bob + out * 700, 500, 281, { rot: m.r + (1 - e) * 0.15, s: lerp(1.2, 1, e), alpha: Math.min(1, lp * 3), cap: m.cap, capH: 64, tape: m.tape, zoom: 1.04 });
    });
  }
  // walking + chip marquee (B48–56)
  if (B >= 48) {
    const p = pr(B, 48, 48.8), e = Ease.outBack(p, 1.3);
    card('v-ui', CX, 520 + (1 - e) * 600, 1180, 664, { rot: -0.012, zoom: 1.03 + pr(B, 48, 56) * 0.05, cap: null, tape: C.mint2, tapeX: 300, tapeRot: 0.05 });
    const cp = popE(B, 49.2, 0.5, 2.2);
    if (cp > 0) { g.save(); g.translate(CX, 178); g.scale(cp, cp); pill('주인공을 골라 마을 산책', 0, 0, { size: 44, fill: C.white, color: C.ink, dot: C.teal }); g.restore(); }
    // marquee of the in-game minigame list
    const mq = pr(B, 49, 50);
    if (mq > 0) {
      let x = 120 - ((t - 49 * SPB) * 160) % 2400;
      g.save(); g.globalAlpha = mq;
      for (let rep = 0; rep < 3; rep++) for (let i = 0; i < V_CHIPS.length; i++) {
        const w = pill(V_CHIPS[i], x, 935, { size: 34, fill: V_CHIP_COLS[i % V_CHIP_COLS.length], color: C.ink, align: 'left' });
        x += w + 22;
        if (x > W + 100) break;
      }
      g.restore();
    }
  }
}

/* ============================================================
   02 — 바람을 따라 (B56–72) · Painted Skies (B72–80)
   ============================================================ */
const STRIP = [
  { img: 'ride-title', cap: 'DentPhoto Ride' },
  { img: 'r-lm5', cap: '억 돌파 석탑 가는 길' },
  { img: 'r-lm4', cap: '목표봉 고갯길' },
  { img: 'r-lm6', cap: '푸른 해안길' },
  { img: 'r-lm7', cap: '별빛 밤길' },
];
function sRide(B, t, F) {
  const roadOut = Ease.inCubic(pr(B, 66, 67.5));
  if (B < 67.5) {
    g.save(); g.translate(0, roadOut * 700);
    road(t, 520, 0.9, 1);
    cloudLayer(t, 150, 4, 0.8, 34, 0.9, 9);
    // scooter: approaches from the vanishing point, then rides bouncing on the beat
    const ap = Ease.outCubic(pr(B, 57.6, 59.6));
    const kick = env(KICKS, t, 12);
    const h = lerp(60, 560, ap), y = lerp(560, 1075, ap);
    const sway = Math.sin(t * 2.6) * 26 * ap;
    sprite('scooter', CX + sway, y + kick * 6, h, { rot: Math.sin(t * 2.6 + 0.6) * 0.04, sy: 1 - kick * 0.02, outline: 6 });
    // speed streaks
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const u = fract(rnd(i, 61) + t * 1.4);
      const a = (rnd(i, 62) - 0.5) * 2.6 - Math.PI / 2 + (i % 2 ? Math.PI : 0);
      const r0 = 220 + u * 900, len = 40 + u * 160;
      g.lineWidth = 2 + u * 6; g.globalAlpha = (1 - u) * 0.8 * ap;
      g.beginPath(); g.moveTo(CX + Math.cos(a) * r0, 520 + Math.sin(a) * r0 * 0.6); g.lineTo(CX + Math.cos(a) * (r0 + len), 520 + Math.sin(a) * (r0 + len) * 0.6); g.stroke();
    }
    g.globalAlpha = 1; g.lineCap = 'butt';
    g.restore();
    g.save(); g.globalAlpha = 1 - pr(B, 65.8, 66.6);
    rise('작은 편지를 싣고, 봄날의 마을로.', CX, 250, { size: 50, f: 'kr', color: C.ink, outline: 12, ocol: C.white }, B, 58.6, 0.6, 0.025);
    statBubble(B, 59.5, 400, 420, 21.6, 'km', '높낮이 있는 코스', '#F08A4B', 0, 1);
    statBubble(B, 61, 1520, 420, 80, '통+', '편지를 모아 우체국까지', C.coral);
    statBubble(B, 62.5, 380, 720, 200, 'km/h', '부스트하면 260', C.blue);
    statBubble(B, 64, 1540, 720, 7, '곳', '분수 · 석탑 · 등대…', C.teal);
    g.restore();
  }
  // road-trip filmstrip
  if (B >= 66) {
    const x0 = lerp(420, -2620, Ease.inOutSine(pr(B, 66.6, 72.6)));
    const enter = pr(B, 66, 67);
    rise('바람 따라 달리는 7곳의 명소', CX, 230, { size: 80, f: 'kr', color: C.ink, outline: 16, ocol: C.white, shadow: SH }, B, 67, 0.6, 0.04);
    // film band
    g.save(); g.globalAlpha = enter;
    rr(-40, 400, W + 80, 420, 0); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
    for (let k = 0; k < 40; k++) { const hx = ((k * 60 + x0 * 0.5) % (W + 120) + W + 120) % (W + 120) - 60; rr(hx, 416, 30, 18, 6); g.fillStyle = C.white; g.fill(); rr(hx, 786, 30, 18, 6); g.fill(); }
    g.restore();
    STRIP.forEach((s, i) => {
      const x = x0 + i * 760;
      if (x < -500 || x > W + 500) return;
      const cp = popE(B, 66.3 + i * 0.25, 0.55, 2);
      if (cp <= 0) return;
      card(s.img, x, 610 + Math.sin(t * 1.8 + i) * 6, 620, 349, { s: cp, rot: (i % 2 ? 0.02 : -0.02), cap: s.cap, capH: 58, capSize: 30, border: 12, tape: [C.peach2, C.pink2, C.mint2, C.sky2, C.lav2][i] });
    });
  }
}
function sSkies(B, t, F) {
  cloudLayer(t, 160, 6, 1.1, 40, 0.95, 13);
  const p = pr(B, 72, 73), e = Ease.outBack(p, 1.3);
  const fl = Math.sin(t * 1.2) * 10;
  card('skies', CX, 520 + (1 - e) * 600 + fl, 1100, 619, { rot: 0.01, zoom: 1.02 + pr(B, 72, 80) * 0.05, border: 14, tape: C.sky2, tapeX: -360 });
  cloudLayer(t, 1010, 5, 1.3, 70, 0.95, 17);
  const lp = popE(B, 73, 0.5, 2.2);
  if (lp > 0) { g.save(); g.translate(CX, 140); g.scale(lp, lp); pill('그리고 하늘길까지 · DentPhoto Painted Skies', 0, 0, { size: 40, fill: C.white, color: C.blue, f: 'kr', dot: C.sky2 }); g.restore(); }
  rise('구름 사이를 지나, 바다 위의 작은 섬으로.', CX, 912, { size: 56, f: 'kr', color: C.ink, outline: 14, ocol: C.white }, B, 74, 0.6, 0.025);
  // little plane looping across
  const pp = pr(B, 74, 79.5);
  if (pp > 0 && pp < 1) {
    const x = lerp(-120, W + 120, pp), y = 300 + Math.sin(pp * TAU * 1.5) * 60;
    g.save(); g.translate(x, y); g.rotate(Math.cos(pp * TAU * 1.5) * 0.25);
    g.fillStyle = '#6B6FC9'; rr(-40, -10, 80, 20, 10); g.fill();
    g.fillStyle = '#FFD25E'; rr(-10, -34, 22, 68, 8); g.fill();
    g.fillStyle = '#6B6FC9'; rr(-44, -16, 14, 32, 5); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 6; g.setLineDash([2, 16]); g.lineCap = 'round';
    g.beginPath();
    for (let q = Math.max(0, pp - 0.18); q <= pp; q += 0.006) { const xx = lerp(-120, W + 120, q) - 46, yy = 300 + Math.sin(q * TAU * 1.5) * 60; q === Math.max(0, pp - 0.18) ? g.moveTo(xx, yy) : g.lineTo(xx, yy); }
    g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
  }
}

/* ============================================================
   03 — 달빛의 받아치기 (B80–104)
   ============================================================ */
const VILLAGERS = [
  ['kettle', '주전자 할머니', C.pink], ['postman', '우편배달부', C.butter], ['sailor', '밧줄 선원', C.mint],
  ['illusionist', '거울 마술사 미라주', C.lav], ['photographer', '약병 사진사', C.peach], ['mechanic', '시계 정비사 정각', C.sky],
];
function moon(t, x, y, r) {
  const rg = g.createRadialGradient(x, y, r * 0.6, x, y, r * 3);
  rg.addColorStop(0, 'rgba(255,246,214,0.75)'); rg.addColorStop(1, 'rgba(255,246,214,0)');
  g.fillStyle = rg; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  circle(x, y, r, '#FFF6D6');
  circle(x - r * 0.3, y - r * 0.2, r * 0.18, 'rgba(240,222,180,0.55)');
  circle(x + r * 0.35, y + r * 0.3, r * 0.12, 'rgba(240,222,180,0.5)');
}
function slashArc(B, b0, x, y, R, col) {
  const p = pr(B, b0, b0 + 0.6);
  if (p <= 0 || p >= 1) return;
  const a0 = -2.4, a1 = lerp(-2.4, 0.9, Ease.outExpo(Math.min(1, p * 2.2)));
  const tail = lerp(-2.4, 0.9, Ease.outCubic(p));
  g.save(); g.globalAlpha = 1 - Ease.inCubic(p);
  g.beginPath(); g.arc(x, y, R, Math.max(a0, tail - 1.4), a1); g.arc(x + 30, y - 20, R * 0.82, a1, Math.max(a0, tail - 1.4), true); g.closePath();
  g.fillStyle = col; g.fill();
  g.restore();
}
function sMoon(B, t, F) {
  moon(t, 1590, 220, 110);
  twinkles(t, 40, C.white, 0.85 + env(SNAPS, t, 6) * 0.15, 640, 91);
  cloudLayer(t, 820, 4, 0.9, 22, 0.55, 23);
  const dim = Ease.outCubic(pr(B, 87.6, 88.2)) * (1 - Ease.inCubic(pr(B, 91.6, 92.4)));
  // cards (B82–88)
  if (B < 92.5) {
    const out = dim;
    const K = [
      { img: 'night-title', b: 82, x: 620, y: 600, w: 840, h: 473, r: -0.04, tape: C.lav2, wash: '#C9BEFF', washA: 0.08 },
      { img: 'c-hub', b: 84, x: 1380, y: 470, w: 700, h: 394, r: 0.05, cap: '밤의 갈매기 · 출항 준비', tape: C.pink2 },
      { img: 'c-act2', b: 86, x: 1330, y: 800, w: 620, h: 349, r: -0.035, cap: '2막 · 절벽 지붕길', tape: C.butter },
    ];
    K.forEach((k) => {
      const lp = pr(B, k.b, k.b + 0.55);
      if (lp <= 0) return;
      const e = Ease.outBack(lp, 1.6);
      card(k.img, k.x, k.y + (1 - e) * 240 + Math.sin(t * 1.4 + k.x) * 6, k.w, k.h, { rot: k.r + (1 - e) * 0.12, s: lerp(1.2, 1, e) * (1 - out * 0.08), alpha: Math.min(1, lp * 3) * (1 - out * 0.75), cap: k.cap, capH: 60, capSize: 30, tape: k.tape, wash: k.wash, washA: k.washA });
    });
  }
  // the gag: wait one beat … then counter
  if (B >= 88 && B < 92.6) {
    g.save(); g.globalAlpha = dim * 0.55; fillAll('#B7A7F5'); g.restore();
    const o1 = 1 - Ease.inCubic(pr(B, 91.8, 92.5));
    g.save(); g.globalAlpha = o1;
    const lift = Ease.inOutCubic(pr(B, 89.8, 90.1)) * 120;
    jelly('한 박자 기다렸다가,', CX, 470 - lift, { size: 124, f: 'kr', color: C.white, shadow: 'rgba(70,40,140,0.35)' }, B, 88, 0.45, 0.04);
    if (B >= 89 && B < 90) for (let k = 0; k < 3; k++) { const dp = popE(B, 89 + k * 0.25, 0.25, 3); if (dp > 0) circle(CX - 60 + k * 60, 600, 14 * dp, C.white); }
    if (B >= 90) {
      const sl = pr(B, 90, 90.2);
      card('c-fight', CX, 610, 1100, 619, { rot: -0.03, s: lerp(1.25, 1, Ease.outBack(sl, 2)), zoom: 1.18, fx: 0.18, fy: 0.62, tape: C.coral, alpha: Math.min(1, sl * 4) });
      slashArc(B, 89.95, CX - 60, 620, 520, 'rgba(255,255,255,0.95)');
      confetti(B, 90, CX, 560, { n: 80, seed: 90, v0: 500, v1: 1800, life: 2 });
      ring(B, 90, CX, 560, { r: 1100, life: 0.9, lw: 18, col: C.white });
      jelly('기막히게 받아치세요!', CX, 900, { size: 132, f: 'kr', color: C.coral, outline: 26, ocol: C.white, shadow: SH }, B, 90, 0.4, 0.035);
      const st = popE(B, 91, 0.35, 3);
      if (st > 0) { g.save(); g.translate(1580, 330); g.rotate(0.12); g.scale(st, st); pill('받아치기!', 0, 0, { size: 54, fill: C.yellow, color: C.ink, border: 6 }); g.restore(); }
    }
    g.restore();
  }
  // villagers parade (B92–100)
  if (B >= 92 && B < 100.8) {
    const out = Ease.inCubic(pr(B, 99.6, 100.6));
    rise('주민 여섯의 증언을 모으면', CX, 260 - out * 300, { size: 70, f: 'kr', color: C.ink, outline: 14, ocol: C.white }, B, 92.2, 0.6, 0.03);
    rise('마을의 비밀이 드러나요', CX, 352 - out * 300, { size: 70, f: 'kr', color: C.purple, outline: 14, ocol: C.white }, B, 93, 0.6, 0.03);
    const kick = env(KICKS, t, 10);
    VILLAGERS.forEach(([k, name, col], i) => {
      const lp = pr(B, 92 + i, 92.5 + i);
      if (lp <= 0) return;
      const e = Ease.outBack(lp, 2);
      const x = 260 + i * 280, base = 895 + (1 - e) * 500 + out * 600;
      circle(x, base - 190, 150 * Math.min(1, e), col);
      sprite('vl-' + k, x, base, 430 * (k === 'postman' ? 0.97 : 1), { sy: 1 - kick * 0.03, sx: 1 + kick * 0.015, outline: 5 });
      const np = popE(B, 92.25 + i, 0.4, 2.4);
      if (np > 0) { g.save(); g.translate(x, base + 42); g.scale(np, np); pill(name, 0, 0, { size: 27, fill: C.white, color: C.ink }); g.restore(); }
    });
  }
  // talk scene (B100–104)
  if (B >= 100) {
    const lp = pr(B, 100, 100.6), e = Ease.outBack(lp, 1.5);
    card('c-talk', CX, 590 + (1 - e) * 500, 1080, 608, { rot: -0.015, zoom: 1.06, fy: 0.62, tape: C.lav2, tapeX: -380 });
    sprite('vl-hero', 280, 1000 + (1 - e) * 400, 420, { outline: 6 });
    const q = popE(B, 101, 0.5, 2.2);
    if (q > 0) { g.save(); g.translate(CX, 200); g.scale(q, q); pill('진심으로 답할까, 재치로 받아칠까?', 0, 0, { size: 46, fill: C.white, color: C.purple, dot: C.lav2 }); g.restore(); }
  }
}

/* ============================================================
   04 — 덴포토 치과 경쟁 (B104–120)
   ============================================================ */
const RIVALS = [
  ['덤핑치과', '반값 스케일링', '#F2A33A'],
  ['불법위임치과', '가끔 보건소 단속', '#9B7BD6'],
  ['365치과', '연중무휴', '#4E9BE0'],
  ['광고폭탄치과', '매출 +30%', '#86C79B'],
];
const HEX_COLS = ['#D6F2C9', '#FFF0B8', '#FFDCC4', '#CFE8FF', '#E4DAFF', '#C6F1E0'];
function hexGrid(B, b0, alpha) {
  const s = 64, hw = Math.sqrt(3) * s, vh = 1.5 * s;
  g.save(); g.globalAlpha = alpha;
  for (let r = -1; r < H / vh + 1; r++) for (let c = -1; c < W / hw + 1; c++) {
    const x = c * hw + (r % 2 ? hw / 2 : 0), y = r * vh;
    const d = Math.hypot(x - CX, y - CY) / 1100;
    const p = popE(B, b0 + d * 1.6, 0.45, 2);
    if (p <= 0) continue;
    const k = Math.floor(rnd(c, r + 7) * HEX_COLS.length);
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * TAU) / 6; g.lineTo(x + Math.cos(a) * s * 0.94 * p, y + Math.sin(a) * s * 0.94 * p); }
    g.closePath(); g.fillStyle = HEX_COLS[k]; g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
  }
  g.restore();
}
function badge(B, b0, x, y, col, icon, title, sub) {
  const p = popE(B, b0, 0.55, 2.4);
  if (p <= 0) return;
  const kick = env(KICKS, B * SPB, 10);
  g.save(); g.translate(x, y + Math.sin(B * SPB * 2 + x) * 6); g.scale(p * (1 + kick * 0.02), p * (1 + kick * 0.02));
  circle(0, 12, 140, SH); circle(0, 0, 140, C.white); circle(0, 0, 118, col);
  g.fillStyle = C.white;
  if (icon === 'crown') { g.beginPath(); g.moveTo(-62, 30); g.lineTo(-70, -36); g.lineTo(-30, -6); g.lineTo(0, -52); g.lineTo(30, -6); g.lineTo(70, -36); g.lineTo(62, 30); g.closePath(); g.fill(); rr(-62, 34, 124, 18, 6); g.fill(); }
  else if (icon === 'coin') { circle(0, -4, 58, C.white); circle(0, -4, 44, col); text('20억', 0, -2, { size: 34, f: 'kr', color: C.white }); }
  else { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * TAU) / 10, r = i % 2 ? 28 : 64; g.lineTo(Math.cos(a) * r, Math.sin(a) * r - 4); } g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.translate(x, y); g.scale(p, p);
  text(title, 0, 200, { size: 48, f: 'kr', color: C.ink, outline: 12, ocol: C.white });
  text(sub, 0, 252, { size: 27, w: 600, f: 'sans', color: C.inkD });
  g.restore();
}
function sCiv(B, t, F) {
  hexGrid(B, 104, 0.85);
  // map + rival clinics (B106–112)
  if (B < 112.8) {
    const out = Ease.inCubic(pr(B, 111.6, 112.6));
    const lp = pr(B, 106, 106.6), e = Ease.outBack(lp, 1.4);
    if (lp > 0) card('civ-map', 720 - out * 900, 600 + (1 - e) * 500, 1040, 585, { rot: -0.02, zoom: 1.08, fx: 0.4, fy: 0.5, tape: C.pink2, tapeX: -300 });
    const hp = popE(B, 107.3, 0.5, 2.2);
    if (hp > 0) { g.save(); g.translate(1560 + out * 700, 290); g.scale(hp, hp); text('경쟁 치과 2~4곳과 겨뤄요', 0, 0, { size: 48, f: 'kr', color: C.ink, outline: 12, ocol: C.white }); g.restore(); }
    RIVALS.forEach(([name, trait, col], i) => {
      const p = popE(B, 108 + i, 0.5, 2.2);
      if (p <= 0) return;
      const x = 1560 + out * 700, y = 400 + i * 148;
      g.save(); g.translate(x, y); g.scale(p, p); g.rotate(i % 2 ? 0.015 : -0.015);
      rr(-250 + 4, -58 + 10, 500, 116, 32); g.fillStyle = SH; g.fill();
      rr(-250, -58, 500, 116, 32); g.fillStyle = C.white; g.fill();
      circle(-190, 0, 30, col); circle(-190, 0, 12, C.white);
      text(name, -140, -16, { size: 40, f: 'kr', color: C.ink, align: 'left' });
      text(trait, -140, 28, { size: 25, w: 600, f: 'sans', color: C.inkD, align: 'left' });
      g.restore();
    });
  }
  // victory badges (B112–120)
  if (B >= 112) {
    const lp = pr(B, 112, 112.8);
    const py = (1 - Ease.outBack(lp, 1.4)) * 500;
    g.save(); g.globalAlpha = Math.min(1, lp * 2);
    rr(CX - 820 + 6, 150 + 16 + py, 1640, 780, 70); g.fillStyle = SH; g.fill();
    rr(CX - 820, 150 + py, 1640, 780, 70); g.fillStyle = 'rgba(255,253,248,0.94)'; g.fill();
    g.lineWidth = 8; g.strokeStyle = C.white; g.stroke();
    g.restore();
    jelly('이기는 방법은 세 가지', CX, 268, { size: 92, f: 'kr', color: C.ink, outline: 18, ocol: C.white, shadow: SH }, B, 112.2, 0.5, 0.05);
    badge(B, 112, 500, 560, C.coral, 'crown', '인수 합병', '경쟁 치과 본점을 모두 인수');
    badge(B, 113.5, CX, 560, C.yellow, 'coin', '목표자산 20억', "마지막 연구 '자산 경영'");
    badge(B, 115, 1420, 560, C.purple, 'star', '평판 점수', '250턴 동안 쌓은 평판');
  }
}

/* ============================================================
   FINALE (B120–136)
   ============================================================ */
const WALL = [
  'c-hub', 'v-dental', 'r-lm4', 'civ-map', 'v-rush', 'c-act2',
  'night-title', 'r-lm6', 'village-real', 'skies', 'cliffs', 'c-talk',
  'r-lm7', 'civ-city', 'splash', 'ride-title', 'v-yacht', 'c-fight',
  'c-talk2', 'v-walk', 'r-lm5', 'v-ui', 'civ-wide', 'civ-title',
];
function drawLogo(x, y, sc, B, b0) {
  g.save(); g.translate(x, y); g.scale(sc, sc);
  const bounce = (i, d = 0.06) => { const p = pr(B, b0 + i * d, b0 + i * d + 0.5); return p <= 0 ? false : { s: Ease.outBack(p, 2.4), a: Math.min(1, p * 4) }; };
  chars('The Secret of', 0, -180, { size: 64, w: 600, f: 'round', color: C.brown, outline: 16, ocol: C.white }, (i) => bounce(i, 0.03));
  for (const [s, yy, sz, off, c0, c1] of [['DentPhoto', -30, 190, 0.3, '#FFD66E', '#FF8A3D'], ['Village', 150, 170, 0.7, '#A8E58A', '#3FB27A']]) {
    chars(s, 0, yy, { size: sz, w: 700, f: 'round', color: C.white, outline: 54, ocol: C.white, shadow: 'rgba(96,66,128,0.25)' }, (i) => bounce(i + off * 10));
    chars(s, 0, yy, { size: sz, w: 700, f: 'round', color: C.white, outline: 26, ocol: C.brown }, (i) => bounce(i + off * 10));
    // gradient lives in each glyph's local space (chars translates to the glyph centre)
    const gg = g.createLinearGradient(0, -sz * 0.45, 0, sz * 0.35); gg.addColorStop(0, c0); gg.addColorStop(1, c1);
    chars(s, 0, yy, { size: sz, w: 700, f: 'round', color: gg }, (i) => bounce(i + off * 10));
  }
  g.restore();
}
function sFinale(B, t, F) {
  const dimWall = Ease.outCubic(pr(B, 123.6, 124.6));
  // mosaic wall
  g.save();
  g.translate(CX, CY); g.rotate(-0.09); g.scale(1.08 - pr(B, 120, 136) * 0.06, 1.08 - pr(B, 120, 136) * 0.06); g.translate(-CX, -CY);
  const drift = (t - 120 * SPB) * 40;
  const cw = 440, chh = 248, gx = 500, gy = 300;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
    const idx = (r * 6 + c) % WALL.length;
    const x = -260 + c * gx + (r % 2 ? 150 : 0) + (r % 2 ? -drift : drift) % gx, y = -110 + r * gy;
    const d = Math.hypot(x - CX, y - CY) / 1400;
    const lp = pr(B, 120 + d * 1.2, 120.5 + d * 1.2);
    if (lp <= 0) continue;
    const e = Ease.outBack(lp, 1.6);
    card(WALL[idx], x, y, cw, chh, { s: e, rot: (rnd(r, c) - 0.5) * 0.08, border: 10, r: 16, zoom: 1.03, alpha: Math.min(1, lp * 3) });
  }
  g.restore();
  confetti(B, 120, CX, 380, { n: 100, seed: 120, v0: 500, v1: 2000, life: 2.4 });
  ring(B, 120, CX, CY, { r: 1300, life: 1.1, lw: 22, col: C.white });
  if (dimWall > 0) { g.save(); g.globalAlpha = dimWall * 0.62; fillAll(C.cream); g.restore(); }
  // logo plate
  if (B >= 124) {
    const up = Ease.inOutCubic(pr(B, 127.4, 128.4));
    const ly = lerp(CY - 10, 285, up), ls = lerp(1, 0.66, up);
    const pp = popE(B, 124, 0.6, 1.8);
    g.save(); g.translate(CX, ly); g.scale(pp * ls, pp * ls);
    rr(-680 + 6, -330 + 18, 1360, 700, 80); g.fillStyle = SH; g.fill();
    rr(-680, -330, 1360, 700, 80); g.fillStyle = 'rgba(255,253,248,0.97)'; g.fill();
    g.lineWidth = 8; g.strokeStyle = C.white; g.stroke();
    g.restore();
    drawLogo(CX, ly + 10 * ls, ls * pp, B, 124.2);
    rise('덴포토 마을의 비밀 · 2026 아울러', CX, lerp(CY + 290, 500, up), { size: lerp(48, 36, up), f: 'kr', color: C.inkD }, B, 125.5, 0.6, 0.03);
  }
  // play links
  if (B >= 128) {
    jelly('지금, 마을로 놀러 오세요!', CX, 618, { size: 84, f: 'kr', color: C.coral, outline: 18, ocol: C.white, shadow: SH }, B, 132, 0.5, 0.05);
    GAMES.forEach((G, i) => {
      const p = popE(B, 128 + i, 0.5, 2.2);
      if (p <= 0) return;
      const x = i % 2 ? 1400 : 520, y = 765 + Math.floor(i / 2) * 145;
      g.save(); g.translate(x, y + Math.sin(t * 2 + i) * 5); g.scale(p, p);
      const bw = 820, bh = 122;
      rr(-bw / 2 + 4, -bh / 2 + 12, bw, bh, 61); g.fillStyle = SH; g.fill();
      rr(-bw / 2, -bh / 2, bw, bh, 61); g.fillStyle = C.white; g.fill();
      g.lineWidth = 5; g.strokeStyle = G.soft; g.stroke();
      circle(-bw / 2 + 62, 0, 40, G.col);
      text(G.n, -bw / 2 + 62, 3, { size: 38, w: 700, f: 'round', color: C.white });
      text(G.name, -bw / 2 + 122, -18, { size: 42, f: 'kr', color: C.ink, align: 'left' });
      text(G.url, -bw / 2 + 124, 28, { size: 26, w: 600, f: 'sans', color: G.col, align: 'left', ls: 0 });
      g.restore();
    });
  }
}

/* ============================================================
   OUTRO (B136–146)
   ============================================================ */
function sOutro(B, t, F) {
  road(t, 560, 0.5, 1);
  cloudLayer(t, 170, 5, 0.9, 20, 0.95, 31);
  petals(t, 30, 0.8);
  const go = Ease.inOutSine(pr(B, 136.5, 144.5));
  const kick = env(KICKS, t, 12);
  sprite('scooter', CX + Math.sin(t * 2.2) * 20 * (1 - go), lerp(1075, 600, go), lerp(540, 40, go), { rot: Math.sin(t * 2.2 + 0.6) * 0.04, sy: 1 - kick * 0.02, outline: lerp(6, 1, go), alpha: 1 - pr(B, 143.5, 144.8) });
  jelly('다음 모험에서 만나요!', CX, 300, { size: 110, f: 'kr', color: C.ink, outline: 20, ocol: C.white, shadow: SH }, B, 137, 0.5, 0.05);
  const pp = popE(B, 140, 0.5, 2.2);
  if (pp > 0) { g.save(); g.translate(CX, 430); g.scale(pp, pp); pill('The Secret of DentPhoto Village · 2026 아울러', 0, 0, { size: 36, fill: C.white, color: C.coral, dot: C.coral }); g.restore(); }
  confetti(B, 140, CX, 300, { n: 60, seed: 140, v0: 300, v1: 1300, life: 2.4 });
  const fo = pr(B, 144.2, 146);
  if (fo > 0) { g.globalAlpha = Ease.inCubic(fo); fillAll(C.cream); g.globalAlpha = 1; }
}

/* ---------------- HUD ---------------- */
function drawHUD(B, t, F) {
  const a = pr(B, 17, 18) * (1 - pr(B, 135, 136));
  if (a <= 0) return;
  text('THE SECRET OF DENTPHOTO VILLAGE', 1820, 70, { size: 18, w: 600, f: 'round', ls: 4, color: C.ink, align: 'right', alpha: a * 0.55 });
  const bi = Math.floor(B) % 4;
  for (let k = 0; k < 4; k++) circle(1820 - (3 - k) * 18 - 4, 100, 5, k === bi ? C.coral : 'rgba(62,53,88,0.18)');
}

/* ---------------- scene table & frame ---------------- */
const SCENES = [
  { b0: 0, b1: 16, f: sIntro },
  { b0: 16, b1: 32, f: sTitle },
  { b0: 32, b1: 56, f: sVillage },
  { b0: 56, b1: 72, f: sRide },
  { b0: 72, b1: 80, f: sSkies },
  { b0: 80, b1: 104, f: sMoon },
  { b0: 104, b1: 120, f: sCiv },
  { b0: 120, b1: 136, f: sFinale },
  { b0: 136, b1: 999, f: sOutro },
];
function drawFrame(t) {
  const B = t / SPB;
  const F = { kick: env(KICKS, t, 9), energy: energyAt(t) };
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.setLineDash([]); g.lineCap = 'butt'; g.lineJoin = 'miter';
  background(B, t, F);
  const cam = camera(B, t);
  g.save();
  g.translate(CX + cam.sx, CY + cam.sy); g.rotate(cam.r); g.scale(cam.z, cam.z); g.translate(-CX, -CY);
  for (const s of SCENES) if (B >= s.b0 && B < s.b1) s.f(B, t, F);
  chapterHeader(B, 0, 32, 56);
  chapterHeader(B, 1, 56, 72);
  chapterHeader(B, 2, 80, 104);
  chapterHeader(B, 3, 104, 120);
  g.restore();
  drawTracker(B);
  drawHUD(B, t, F);
  // transitions
  iris(B, 32, [C.white, C.mint2, C.mint], 1430, 250);
  cloudWipe(B, 56, C.white);
  cloudWipe(B, 72, '#F4FAFF');
  iris(B, 80, [C.white, C.lav2, '#C9BEFF'], 1590, 220);
  iris(B, 104, [C.white, C.pink2, C.pink], CX, CY);
  iris(B, 120, [C.butter, C.sky2, C.white], CX, CY);
  cloudWipe(B, 136, C.white);
  return postParams(B, t);
}
