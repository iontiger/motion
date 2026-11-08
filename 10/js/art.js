'use strict';
/* ============================================================
   ART — the corridor, the door, the warm room, the props,
   the string lights and the piano keyboard along the bottom
   ============================================================ */

/* ---------------- cached sprites ---------------- */
const _SPR = new Map();
function glowSprite(col) {
  let c = _SPR.get(col);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, col); gr.addColorStop(0.18, col);
  gr.addColorStop(0.45, hexA(col, 0.35)); gr.addColorStop(1, hexA(col, 0));
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  _SPR.set(col, c);
  return c;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((A >> 16) & 255, (B >> 16) & 255, t)), gg = Math.round(lerp((A >> 8) & 255, (B >> 8) & 255, t)), bb = Math.round(lerp(A & 255, B & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | bb).toString(16).slice(1);
}
function glow(x, y, r, col, a = 1, add = true) {
  if (a <= 0.003 || r <= 1) return;
  const a0 = g.globalAlpha, op = g.globalCompositeOperation;
  g.globalAlpha = a0 * Math.min(1, a);
  if (add) g.globalCompositeOperation = 'lighter';
  g.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = a0; g.globalCompositeOperation = op;
}
let _grain = null;
function grain(t, a = 0.07) {
  if (!_grain) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), im = x.createImageData(256, 256), r = mulberry32(7);
    for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0);
    _grain = g.createPattern(c, 'repeat');
  }
  const k = Math.floor(t * 12);
  g.save();
  g.globalAlpha = a; g.globalCompositeOperation = 'overlay';
  g.translate(-(rnd(k, 1) * 256) | 0, -(rnd(k, 2) * 256) | 0);
  g.fillStyle = _grain; g.fillRect(0, 0, W + 256, H + 256);
  g.restore();
}
function vignette(a, col = '#000000') {
  const gr = g.createRadialGradient(CX, CY * 0.95, H * 0.35, CX, CY, H * 1.05);
  gr.addColorStop(0, hexA(col, 0)); gr.addColorStop(1, hexA(col, a));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}

/* ---------------- geometry of the corridor ---------------- */
const DOOR = { x: 1090, y: 176, w: 400, h: 714 };   // the opening; its sill sits on the floor line
const FLOOR_Y = DOOR.y + DOOR.h;                     // 890
const KEY_Y = 1000;                                  // the keyboard strip starts here
const VP = { x: 1290, y: 520 };                      // eye level, a little right of centre (the door)
const proj = (X, Y, Z) => { const f = 1 / (1 + Z / 1500); return [VP.x + (X - VP.x) * f, VP.y + (Y - VP.y) * f]; };
// door slab corners for an inward swing of th (0 shut … ~1.5 wide open); hinge on the left jamb
function slabQuad(th) {
  const X1 = DOOR.x + DOOR.w * Math.cos(th), Z1 = DOOR.w * Math.sin(th);
  return [[DOOR.x, DOOR.y], proj(X1, DOOR.y, Z1), proj(X1, FLOOR_Y, Z1), [DOOR.x, FLOOR_Y]];
}
// point on the slab at (u along width, v down the height)
function slabPt(Q, u, v) {
  const top = [lerp(Q[0][0], Q[1][0], u), lerp(Q[0][1], Q[1][1], u)], bot = [lerp(Q[3][0], Q[2][0], u), lerp(Q[3][1], Q[2][1], u)];
  return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)];
}
function quadPath(pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
// affine frame on the slab around (u,v): draw in local px (1 local px ≈ 1 slab px at the hinge)
function onSlab(Q, u, v, fn) {
  const p = slabPt(Q, u, v), pu = slabPt(Q, u + 0.01, v), pv = slabPt(Q, u, v + 0.01);
  const ax = (pu[0] - p[0]) / (0.01 * DOOR.w), ay = (pu[1] - p[1]) / (0.01 * DOOR.w);
  const bx = (pv[0] - p[0]) / (0.01 * DOOR.h), by = (pv[1] - p[1]) / (0.01 * DOOR.h);
  g.save(); g.transform(ax, ay, bx, by, p[0], p[1]); fn(); g.restore();
}

/* ---------------- the corridor (outside the door, night) ---------------- */
function drawHall(t, P) {
  // wall
  let gr = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  gr.addColorStop(0, '#10262E'); gr.addColorStop(0.55, '#173640'); gr.addColorStop(1, '#14303A');
  g.fillStyle = gr; g.fillRect(0, 0, W, FLOOR_Y);
  // faint wallpaper stripes + chair rail
  g.globalAlpha = 0.09; g.fillStyle = '#2C5966';
  for (let x = 20; x < W; x += 64) g.fillRect(x, 0, 10, 640);
  g.globalAlpha = 1;
  g.fillStyle = '#0F242B'; g.fillRect(0, 640, W, 10);
  g.fillStyle = '#1B3B45'; g.fillRect(0, 650, W, 4);
  g.fillStyle = '#12303A'; g.fillRect(0, 654, W, FLOOR_Y - 654);
  // skirting
  g.fillStyle = '#0B1C22'; g.fillRect(0, FLOOR_Y - 26, W, 26);
  // floor with tiles running to the eye point
  gr = g.createLinearGradient(0, FLOOR_Y, 0, KEY_Y);
  gr.addColorStop(0, '#0C1E24'); gr.addColorStop(1, '#13313B');
  g.fillStyle = gr; g.fillRect(0, FLOOR_Y, W, KEY_Y - FLOOR_Y);
  g.strokeStyle = 'rgba(70,120,130,0.18)'; g.lineWidth = 2;
  for (let k = -14; k <= 14; k++) {
    const xb = VP.x + k * 210, f = (FLOOR_Y - VP.y) / (KEY_Y - VP.y);
    line(VP.x + (xb - VP.x) * f, FLOOR_Y, xb, KEY_Y);
  }
  for (const yy of [FLOOR_Y + 22, FLOOR_Y + 52, FLOOR_Y + 92]) line(0, yy, W, yy);
  // corridor lamp, cold, upper left
  const fl = 0.82 + 0.18 * (vnoise(t * 7, 3) > 0.75 ? 0.4 : 1);
  g.fillStyle = '#0B1A1F'; rr(250, 92, 120, 22, 8); g.fill();
  glow(310, 118, 380, '#7FB6C4', 0.22 * fl);
  g.fillStyle = hexA('#CFEFF5', 0.85 * fl); rr(262, 112, 96, 8, 4); g.fill();
  // apartment number plate
  g.fillStyle = '#0D2026'; rr(DOOR.x + DOOR.w + 52, 300, 92, 52, 10); g.fill();
  text('1004', DOOR.x + DOOR.w + 98, 327, { size: 30, w: 700, f: 'fra', color: hexA(C.honey, 0.85) });

  const L = P.light, col = P.lcol;
  // warm wash on the wall around the doorway (stronger as the door opens)
  glow(DOOR.x + DOOR.w * 0.62, DOOR.y + DOOR.h * 0.55, 560 + 380 * P.open, col, (0.16 + 0.55 * P.open) * L);
  // door frame
  g.fillStyle = '#0A181D'; g.fillRect(DOOR.x - 34, DOOR.y - 34, DOOR.w + 68, DOOR.h + 34);
  g.fillStyle = '#1D3D46'; g.fillRect(DOOR.x - 22, DOOR.y - 22, DOOR.w + 44, DOOR.h + 22);
  // the doorway: the room glimpsed through it
  g.save(); g.beginPath(); g.rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); g.clip();
  if (P.open > 0.003) {
    P.roomView();
  } else { g.fillStyle = '#081418'; g.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); }
  g.restore();
  // light spilling onto the floor through the gap
  const Q = slabQuad(P.th);
  const gapL = Math.max(DOOR.x, Q[2][0]), gapR = DOOR.x + DOOR.w;
  const spill = (P.th > 0.004 ? 1 : 0) * L;
  if (spill > 0 || P.crack > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const wL = gapL - (VP.x - gapL) * 1.3, wR = gapR + (gapR - VP.x) * 1.6 + 120;
    const yb = KEY_Y;
    gr = g.createLinearGradient(0, FLOOR_Y, 0, yb);
    gr.addColorStop(0, hexA(col, 0.72 * Math.max(spill * Math.min(1, P.open * 3 + 0.25), P.crack))); gr.addColorStop(1, hexA(col, 0.08));
    g.fillStyle = gr;
    g.beginPath();
    if (spill > 0) { g.moveTo(gapL, FLOOR_Y); g.lineTo(gapR, FLOOR_Y); g.lineTo(wR, yb); g.lineTo(wL, yb); }
    else { g.moveTo(DOOR.x + 6, FLOOR_Y); g.lineTo(DOOR.x + DOOR.w - 6, FLOOR_Y); g.lineTo(DOOR.x + DOOR.w + 120, yb); g.lineTo(DOOR.x - 120, yb); }
    g.closePath(); g.fill();
    g.restore();
  }
  // the slab itself (it swings inward, so the doorway always frames it)
  g.save(); g.beginPath(); g.rect(DOOR.x - 2, DOOR.y - 2, DOOR.w + 4, DOOR.h + 4); g.clip();
  drawSlab(t, Q, P);
  g.restore();
  // the line of light under a shut door
  if (P.crack > 0 && P.th < 0.02) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = hexA(col, Math.min(1, P.crack)); g.fillRect(DOOR.x + 4, FLOOR_Y - 5, DOOR.w - 8, 5);
    glow(DOOR.x + DOOR.w / 2, FLOOR_Y, 260, col, 0.45 * P.crack);
    g.restore();
  }
  // doormat
  doormat(P);
  // string lights around the frame
  frameLights(t, P);
}

function drawSlab(t, Q, P) {
  const shade = 1 - 0.45 * Math.sin(P.th);
  g.fillStyle = mixHex('#24434B', '#3A6069', shade * 0.6); quadPath(Q); g.fill();
  // lit edge (the light catches the free edge)
  if (P.th > 0.01) { g.strokeStyle = hexA(P.lcol, 0.55 * P.light); g.lineWidth = 4; line(Q[1][0], Q[1][1], Q[2][0], Q[2][1]); }
  // two raised panels
  for (const [u0, v0, u1, v1] of [[0.14, 0.07, 0.86, 0.44], [0.14, 0.52, 0.86, 0.93]]) {
    const pts = [slabPt(Q, u0, v0), slabPt(Q, u1, v0), slabPt(Q, u1, v1), slabPt(Q, u0, v1)];
    g.fillStyle = mixHex('#1E3A42', '#2F535C', shade * 0.6); quadPath(pts); g.fill();
    g.strokeStyle = 'rgba(120,170,175,0.18)'; g.lineWidth = 3; quadPath(pts); g.stroke();
  }
  // knob + plate
  const kb = slabPt(Q, 0.9, 0.53);
  const jig = P.jiggle || 0;
  g.fillStyle = '#122A31'; rr(kb[0] - 9, kb[1] - 40, 18, 80, 9); g.fill();
  g.save(); g.translate(kb[0], kb[1]); g.rotate(jig * 0.5);
  circle(0, 0, 15, '#C98F45'); circle(-4, -4, 6, '#F2C77E');
  g.restore();
  // the memo stuck on the door
  if (P.memo) onSlab(Q, 0.5, 0.33, () => P.memo());
}

function doormat(P) {
  const y0 = FLOOR_Y + 8, y1 = FLOOR_Y + 86;
  const a = [DOOR.x + 44, y0], b = [DOOR.x + DOOR.w - 44, y0], c = [DOOR.x + DOOR.w + 6, y1], d = [DOOR.x - 6, y1];
  g.fillStyle = '#3B2A22'; quadPath([a, b, c, d]); g.fill();
  g.strokeStyle = 'rgba(255,200,140,0.25)'; g.lineWidth = 3;
  quadPath([[a[0] + 10, a[1] + 6], [b[0] - 10, b[1] + 6], [c[0] - 16, c[1] - 8], [d[0] + 16, d[1] - 8]]); g.stroke();
  g.save(); g.translate((d[0] + c[0]) / 2, (y0 + y1) / 2 + 4); g.scale(1, 0.5);
  text('어서 와', 0, 0, { size: 64, f: 'pen', color: hexA(C.honey, 0.55 + 0.4 * P.open) });
  g.restore();
}

// bulbs around the door frame; brightness from the piano's right hand
const FRAME_BULBS = (() => {
  const pts = [], x0 = DOOR.x - 46, x1 = DOOR.x + DOOR.w + 46, y0 = DOOR.y - 50, yb = FLOOR_Y - 120;
  const path = [[x0, yb], [x0, y0], [x1, y0], [x1, yb]];
  const segs = [], lens = [];
  let tot = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push([path[i - 1], path[i]]); lens.push(l); tot += l; }
  const N = 26;
  for (let k = 0; k < N; k++) {
    let d = (k + 0.5) / N * tot, i = 0;
    while (d > lens[i]) { d -= lens[i]; i++; }
    const [p, q] = segs[i], f = d / lens[i];
    const sag = i === 1 ? Math.sin(fract(f * 4) * Math.PI) * 18 : Math.sin(fract(f * 3) * Math.PI) * 10;
    pts.push({ x: lerp(p[0], q[0], f) + (i !== 1 ? (i === 0 ? -sag : sag) : 0), y: lerp(p[1], q[1], f) + (i === 1 ? sag : 0), k });
  }
  return pts;
})();
const BULB_COLS = ['#FFC46B', '#FF9C7A', '#FFE3A1', '#FFB0A0'];
function frameLights(t, P) {
  const on = P.bulbsOn != null ? P.bulbsOn : 1;
  if (on <= 0) return;
  g.strokeStyle = '#08161A'; g.lineWidth = 3;
  g.beginPath();
  FRAME_BULBS.forEach((b, i) => (i ? g.lineTo(b.x, b.y - 8) : g.moveTo(b.x, b.y - 8)));
  g.stroke();
  const n = FRAME_BULBS.length;
  FRAME_BULBS.forEach((b, i) => {
    const vis = clamp(on * n - i);           // switch on one by one
    if (vis <= 0) { circle(b.x, b.y, 7, '#2A3B3E'); return; }
    const fl = PS.bulb[i % PS.bulb.length];
    const a = vis * (0.35 + 0.65 * fl);
    const col = BULB_COLS[i % 4];
    glow(b.x, b.y, 40 + 46 * fl, col, a * 0.85);
    circle(b.x, b.y, 7, mixHex('#6B4A2A', col, 0.4 + 0.6 * a));
  });
}

/* ---------------- the room (inside, warm) ---------------- */
const ROOM = { table: 790, window: { x: 1566, y: 140, w: 300, h: 330 }, clock: { x: 230, y: 220, r: 70 } };
function drawRoom(t, P) {
  const col = P.lcol;
  let gr = g.createLinearGradient(0, 0, 0, ROOM.table);
  gr.addColorStop(0, '#F4D9AE'); gr.addColorStop(1, '#EDC48C');
  g.fillStyle = gr; g.fillRect(-10, -10, W + 20, ROOM.table + 20);
  g.globalAlpha = 0.28; g.fillStyle = '#E6B97F';
  for (let x = 30; x < W; x += 72) g.fillRect(x, 0, 18, ROOM.table);
  g.globalAlpha = 1;
  // window
  win_(t, P);
  // wall clock
  clockFace(ROOM.clock.x, ROOM.clock.y, ROOM.clock.r, P.clockT != null ? P.clockT : t);
  // pendant lamp + its cone
  const lx = 860, ly = 168;
  g.strokeStyle = '#5B3A22'; g.lineWidth = 4; line(lx, -10, lx, ly - 36);
  const pulse = PS.lh * 0.6 + PS.rh * 0.3;
  g.save(); g.globalCompositeOperation = 'lighter';
  gr = g.createLinearGradient(0, ly, 0, ROOM.table);
  gr.addColorStop(0, hexA(col, 0.32 + 0.22 * pulse)); gr.addColorStop(1, hexA(col, 0.02));
  g.fillStyle = gr; g.beginPath(); g.moveTo(lx - 60, ly); g.lineTo(lx + 60, ly); g.lineTo(lx + 420, ROOM.table); g.lineTo(lx - 420, ROOM.table); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = C.terra; g.beginPath(); g.moveTo(lx - 30, ly - 40); g.lineTo(lx + 30, ly - 40); g.lineTo(lx + 70, ly + 4); g.lineTo(lx - 70, ly + 4); g.closePath(); g.fill();
  glow(lx, ly + 8, 150 + 90 * pulse, col, 0.75);
  circle(lx, ly + 6, 16, '#FFF4D8');
  // garland of bulbs across the top
  garland(t, P);
  if (P.roomBack) P.roomBack();
  // table
  gr = g.createLinearGradient(0, ROOM.table, 0, ROOM.table + 70);
  gr.addColorStop(0, '#C77A43'); gr.addColorStop(1, '#A85F32');
  g.fillStyle = gr; g.fillRect(-10, ROOM.table, W + 20, 70);
  g.fillStyle = '#7E4323'; g.fillRect(-10, ROOM.table + 70, W + 20, KEY_Y - ROOM.table - 70 + 10);
  g.fillStyle = 'rgba(255,220,170,0.35)'; g.fillRect(-10, ROOM.table, W + 20, 4);
  // warm light pooling on the table
  glow(lx, ROOM.table + 20, 520, col, 0.35 + 0.25 * pulse);
  if (P.roomProps) P.roomProps();
}

function win_(t, P) {
  const { x, y, w, h } = ROOM.window;
  g.fillStyle = '#FFF2DC'; rr(x - 22, y - 22, w + 44, h + 44, 10); g.fill();
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#173246'); gr.addColorStop(1, '#2C5466');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  // moon
  circle(x + w * 0.76, y + h * 0.22, 26, '#FFF0C8'); glow(x + w * 0.76, y + h * 0.22, 90, '#FFE7B0', 0.4);
  // far buildings with lit windows (twinkle on the piano's right hand)
  const bs = [[0, 0.52, 0.22], [0.2, 0.62, 0.18], [0.36, 0.46, 0.2], [0.58, 0.58, 0.16], [0.74, 0.5, 0.26]];
  bs.forEach(([bx, top, bw], i) => {
    g.fillStyle = '#0F2433'; g.fillRect(x + bx * w, y + top * h, bw * w, h);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
      const k = i * 31 + r * 5 + c;
      if (rnd(k, 4) < 0.45) continue;
      const tw = rnd(k, 9) < 0.25 ? PS.rh : 0;
      g.fillStyle = hexA('#FFD27A', 0.45 + 0.45 * rnd(k, 5) + 0.3 * tw);
      g.fillRect(x + (bx + 0.03 + c * bw / 3.2) * w, y + (top + 0.04 + r * 0.07) * h, 9, 12);
    }
  });
  // the bus going past
  if (P.bus != null && P.bus > 0 && P.bus < 1) bus(x + w + 260 - P.bus * (w + 640), y + h - 62, 1);
  // street lamp glow at the bottom
  g.fillStyle = '#0B1B26'; g.fillRect(x, y + h - 20, w, 20);
  g.restore();
  // window cross + sill
  g.fillStyle = '#FFF2DC'; g.fillRect(x + w / 2 - 7, y, 14, h); g.fillRect(x, y + h * 0.48 - 7, w, 14);
  g.fillStyle = '#EAD3B0'; rr(x - 40, y + h + 18, w + 80, 20, 6); g.fill();
  // curtains
  g.fillStyle = C.rose;
  g.beginPath(); g.moveTo(x - 40, y - 40); g.quadraticCurveTo(x + 40, y + h * 0.4, x - 6, y + h + 10); g.lineTo(x - 56, y + h + 10); g.lineTo(x - 56, y - 40); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x + w + 40, y - 40); g.quadraticCurveTo(x + w - 40, y + h * 0.4, x + w + 6, y + h + 10); g.lineTo(x + w + 56, y + h + 10); g.lineTo(x + w + 56, y - 40); g.closePath(); g.fill();
  g.fillStyle = '#C96F5E'; g.fillRect(x - 60, y - 52, w + 120, 16);
}

function bus(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#E8A93A'; rr(0, -70, 380, 70, 14); g.fill();
  g.fillStyle = '#C9862A'; g.fillRect(0, -20, 380, 8);
  for (let i = 0; i < 6; i++) { g.fillStyle = '#FFF0C0'; rr(22 + i * 58, -60, 44, 30, 5); g.fill(); }
  circle(70, 2, 15, '#1B2A30'); circle(300, 2, 15, '#1B2A30');
  glow(0, -30, 70, '#FFE7A3', 0.8);
  g.restore();
  // motion streaks
  g.strokeStyle = 'rgba(255,231,163,0.35)'; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) line(x + 390 * s, y - 56 + i * 14, x + 390 * s + 120, y - 56 + i * 14);
}

function clockFace(x, y, r, tt) {
  circle(x, y, r + 10, '#7E4323'); circle(x, y, r, '#FFF6E6');
  g.strokeStyle = C.ink; g.lineWidth = 4;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; line(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); }
  const am = (tt / 6) * TAU - Math.PI / 2, ah = (tt / 72) * TAU - Math.PI / 2 + 1.1;
  g.lineCap = 'round';
  g.lineWidth = 8; line(x, y, x + Math.cos(ah) * r * 0.48, y + Math.sin(ah) * r * 0.48);
  g.lineWidth = 5; line(x, y, x + Math.cos(am) * r * 0.72, y + Math.sin(am) * r * 0.72);
  g.lineCap = 'butt';
  circle(x, y, 7, C.terra);
}

// three sagging spans of bulbs along the top of the room
const GARLAND = (() => {
  const pins = [-40, 620, 1290, 1960], out = [];
  for (let s = 0; s < 3; s++) {
    const a = pins[s], b = pins[s + 1];
    for (let k = 0; k < 11; k++) {
      const f = (k + 0.5) / 11;
      out.push({ x: lerp(a, b, f), y: 54 + Math.sin(f * Math.PI) * 74, k: out.length });
    }
  }
  return out;
})();
function garland(t, P) {
  g.strokeStyle = '#5B3A22'; g.lineWidth = 3;
  const pins = [-40, 620, 1290, 1960];
  for (let s = 0; s < 3; s++) { g.beginPath(); g.moveTo(pins[s], 46); g.quadraticCurveTo((pins[s] + pins[s + 1]) / 2, 46 + 150, pins[s + 1], 46); g.stroke(); }
  const boost = P.party || 0;
  GARLAND.forEach((b, i) => {
    const fl = PS.bulb[i % PS.bulb.length];
    const a = 0.45 + 0.55 * fl + 0.3 * boost;
    const col = BULB_COLS[i % 4];
    glow(b.x, b.y + 10, 36 + 50 * fl + 30 * boost, col, Math.min(1, a) * 0.9);
    g.fillStyle = '#5B3A22'; g.fillRect(b.x - 4, b.y - 4, 8, 8);
    circle(b.x, b.y + 10, 9, mixHex('#C98F45', col, 0.5 + 0.5 * Math.min(1, a)));
  });
}

/* ---------------- props ---------------- */
function paperCup(x, y, s, steam = 0, t = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#F6EEDF'; g.beginPath(); g.moveTo(-30, -78); g.lineTo(30, -78); g.lineTo(22, 0); g.lineTo(-22, 0); g.closePath(); g.fill();
  g.fillStyle = C.terra; g.beginPath(); g.moveTo(-27, -52); g.lineTo(27, -52); g.lineTo(24, -30); g.lineTo(-24, -30); g.closePath(); g.fill();
  g.fillStyle = '#FFF'; rr(-34, -86, 68, 12, 5); g.fill();
  text('♡', 0, -41, { size: 18, w: 700, color: '#FFF3DE' });
  if (steam > 0) {
    g.strokeStyle = hexA('#FFF3DE', 0.5 * steam); g.lineWidth = 5; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let i = 0; i <= 10; i++) { const yy = -96 - i * 9, xx = -8 + k * 16 + Math.sin(i * 0.8 + t * 3 + k * 2) * 7; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke();
    }
    g.lineCap = 'butt';
  }
  g.restore();
}
// sticky memo in slab-local px; fold: 0..1 corner fold; write: per-char reveal fn
function memoNote(fold, writeN, doodle) {
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-104, -84, 216, 176);
  g.fillStyle = C.yellow;
  const f = 40 * fold;
  g.beginPath(); g.moveTo(-110, -90); g.lineTo(110, -90); g.lineTo(110, 90 - f); g.lineTo(110 - f, 90); g.lineTo(-110, 90); g.closePath(); g.fill();
  if (f > 1) { g.fillStyle = '#D9B54C'; g.beginPath(); g.moveTo(110, 90 - f); g.lineTo(110 - f, 90 - f); g.lineTo(110 - f, 90); g.closePath(); g.fill(); }
  g.fillStyle = 'rgba(230,190,80,0.6)'; g.fillRect(-110, -90, 220, 18);
  if (writeN > 0) {
    const L1 = '오늘은', L2 = '꼭 전화해';
    const n1 = Math.min(L1.length, writeN), n2 = Math.max(0, writeN - L1.length);
    text(L1.slice(0, Math.ceil(n1)), -86, -26, { size: 52, f: 'pen', color: '#2A2A40', align: 'left' });
    if (n2 > 0) text(L2.slice(0, Math.ceil(n2)), -86, 30, { size: 52, f: 'pen', color: '#2A2A40', align: 'left' });
  }
  if (doodle > 0) {
    g.save(); g.translate(70, -40); g.scale(doodle, doodle);
    g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.stroke();
    circle(-6, -4, 2.5, C.red); circle(6, -4, 2.5, C.red);
    g.beginPath(); g.arc(0, 2, 9, 0.2, Math.PI - 0.2); g.stroke();
    g.restore();
  }
}
function phone(x, y, s, P) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.06);
  g.fillStyle = '#0B1519'; rr(-120, -230, 240, 460, 34); g.fill();
  const gr = g.createLinearGradient(0, -210, 0, 210);
  gr.addColorStop(0, '#2B5361'); gr.addColorStop(1, '#173540');
  g.fillStyle = gr; rr(-106, -214, 212, 428, 24); g.fill();
  text('너', 0, -150, { size: 44, f: 'hah', w: 800, color: C.cream });
  text(P.calling > 0 ? '연결 중…' : '최근 통화', 0, -104, { size: 22, w: 600, color: hexA(C.cream, 0.7) });
  // keypad dots that light as the number is pressed again
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const k = r * 3 + c, lit = P.keys ? P.keys(k) : 0;
    circle(-62 + c * 62, -30 + r * 56, 22, mixHex('#244650', '#FFD58A', lit));
  }
  circle(0, 182, 26, P.calling > 0 ? '#5BC07A' : '#3D8A57');
  if (P.calling > 0) for (let i = 0; i < 3; i++) {
    const p = fract(P.callT * 1.4 - i / 3);
    g.strokeStyle = hexA('#9BE3B3', (1 - p) * P.calling); g.lineWidth = 4;
    g.beginPath(); g.arc(0, 182, 30 + p * 70, -Math.PI * 0.8, -Math.PI * 0.2); g.stroke();
  }
  g.restore();
}
function footprint(x, y, s, flip, a) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.scale(1.3 * s * (flip ? -1 : 1), 1.3 * s * 0.42); g.rotate(-0.3); g.globalAlpha *= a;
  g.fillStyle = hexA(C.honey, 0.8);
  rr(-20, -70, 40, 78, 20); g.fill();
  rr(-17, 18, 34, 34, 12); g.fill();
  g.fillStyle = hexA('#13313B', 0.6);
  for (let i = 0; i < 4; i++) g.fillRect(-14, -52 + i * 15, 28, 4);
  g.restore();
}
function breadBag(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // baguette poking out
  g.save(); g.rotate(-0.32);
  g.fillStyle = '#D9913F'; rr(-30, -190, 50, 170, 25); g.fill();
  g.strokeStyle = '#F2C27A'; g.lineWidth = 5; for (let i = 0; i < 3; i++) line(-16, -170 + i * 40, 8, -184 + i * 40);
  g.restore();
  g.fillStyle = '#C9A06A'; g.beginPath(); g.moveTo(-70, -120); g.lineTo(70, -120); g.lineTo(80, 0); g.lineTo(-80, 0); g.closePath(); g.fill();
  g.fillStyle = '#B48A55'; g.beginPath(); g.moveTo(-70, -120); g.lineTo(-50, -100); g.lineTo(-30, -120); g.lineTo(-10, -100); g.lineTo(10, -120); g.lineTo(30, -100); g.lineTo(50, -120); g.lineTo(70, -120); g.lineTo(70, -110); g.lineTo(-70, -110); g.closePath(); g.fill();
  text('BREAD', 0, -56, { size: 26, w: 800, f: 'fra', color: '#7A4E25' });
  g.restore();
}
function mug(x, y, s, fill, col, steam = 0, t = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = col; g.lineWidth = 12; g.beginPath(); g.arc(58, -60, 26, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.fillStyle = col; rr(-56, -120, 112, 120, 14); g.fill();
  g.fillStyle = '#5A2E16'; g.fillRect(-46, -112, 92, 8);
  if (fill > 0) { g.fillStyle = '#7A3F1E'; g.fillRect(-46, -112, 92, 8 + 0 * fill); }
  g.fillStyle = 'rgba(255,255,255,0.22)'; rr(-44, -108, 16, 92, 8); g.fill();
  if (steam > 0) {
    g.strokeStyle = hexA('#FFFFFF', 0.55 * steam); g.lineWidth = 5; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 9; i++) { const yy = -132 - i * 10, xx = -12 + k * 24 + Math.sin(i * 0.8 + t * 3 + k) * 7; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
    g.lineCap = 'butt';
  }
  g.restore();
}
// a glass that fills (0..1)
function glass(x, y, s, fill, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(-44, -150); g.lineTo(44, -150); g.lineTo(36, 0); g.lineTo(-36, 0); g.closePath(); g.fill();
  if (fill > 0) {
    const h = 140 * fill, wob = Math.sin(t * 9) * 4 * (1 - fill);
    g.fillStyle = hexA('#E8A93A', 0.9);
    g.beginPath(); g.moveTo(-36 - 8 * (h / 150), -h + wob); g.lineTo(36 + 8 * (h / 150), -h - wob); g.lineTo(36, 0); g.lineTo(-36, 0); g.closePath(); g.fill();
    g.fillStyle = '#FFF6E0'; g.fillRect(-36 - 8 * (h / 150), -h - 8, 72 + 16 * (h / 150), 10);
  }
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(-44, -150); g.lineTo(-36, 0); g.lineTo(36, 0); g.lineTo(44, -150); g.stroke();
  g.restore();
}
function breadPlate(x, y, s, bites) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#FFF6E6'; g.beginPath(); g.ellipse(0, 0, 170, 34, 0, 0, TAU); g.fill();
  g.fillStyle = '#EADBC3'; g.beginPath(); g.ellipse(0, -4, 130, 22, 0, 0, TAU); g.fill();
  // a round loaf
  g.save();
  g.beginPath(); g.ellipse(0, -46, 120, 62, 0, 0, TAU);
  // bites cut out of the right side
  for (let i = 0; i < bites; i++) { const bx = 112 - i * 34, by = -70 + i * 6; g.moveTo(bx + 34, by); g.arc(bx, by, 34, 0, TAU, true); }
  g.fillStyle = '#D48A3A'; g.fill('evenodd');
  g.restore();
  g.strokeStyle = '#F4C47E'; g.lineWidth = 7; g.lineCap = 'round';
  for (let i = -1; i <= 1; i++) line(-50 + i * 40, -70, -20 + i * 40, -30);
  g.lineCap = 'butt';
  g.restore();
}
function coin(x, y, r, spin) {
  const sx = Math.max(0.12, Math.abs(Math.cos(spin)));
  g.save(); g.translate(x, y); g.scale(sx, 1);
  circle(0, 0, r, '#C98F45'); circle(0, 0, r * 0.8, '#E9B866');
  if (sx > 0.5) text('100', 0, 2, { size: r * 0.62, w: 800, f: 'fra', color: '#8A5A24' });
  g.restore();
}
function receipt(x, y, len, t0) {
  if (len <= 0) return;
  g.save(); g.translate(x, y);
  g.fillStyle = '#FFFDF6';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(150, 0);
  g.lineTo(150, len); for (let i = 0; i < 10; i++) g.lineTo(150 - i * 15 - 7.5, len + (i % 2 ? 0 : 9));
  g.lineTo(0, len); g.closePath(); g.fill();
  g.fillStyle = 'rgba(40,40,60,0.55)';
  const rows = ['RECEIPT', '빵 · 1', '커피 · 2', '— — —', '합계 9,800'];
  rows.forEach((r, i) => { if (26 + i * 34 < len) text(r, 75, 26 + i * 34, { size: i ? 20 : 18, w: 700, color: 'rgba(40,40,60,0.6)' }); });
  g.restore();
}
function radio(x, y, s, playing, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = C.teal; rr(-130, -140, 260, 140, 22); g.fill();
  g.strokeStyle = '#173A44'; g.lineWidth = 6; g.beginPath(); g.moveTo(-80, -140); g.lineTo(-40, -190); g.lineTo(40, -190); g.lineTo(80, -140); g.stroke();
  circle(-62, -66, 46, '#173A44'); circle(-62, -66, 38 + 3 * PS.lh, '#2F6170'); circle(-62, -66, 12, '#173A44');
  g.fillStyle = '#FFF2DC'; rr(16, -112, 92, 36, 6); g.fill();
  text(playing ? '▶ 01' : '■ 00', 62, -94, { size: 22, w: 800, color: C.terra });
  circle(36, -40, 12, C.mustard); circle(72, -40, 12, C.rose);
  g.restore();
}
function bubble(x, y, w, h, tail, col = '#FFF8EC', stroke = C.ink) {
  rr(x - w / 2, y - h / 2, w, h, h * 0.42);
  g.fillStyle = col; g.fill(); g.lineWidth = 4; g.strokeStyle = stroke; g.stroke();
  g.beginPath(); g.moveTo(x + tail * 0.25 - 16, y + h / 2 - 2); g.lineTo(x + tail, y + h / 2 + 34); g.lineTo(x + tail * 0.25 + 16, y + h / 2 - 2); g.closePath(); g.fillStyle = col; g.fill();
  g.beginPath(); g.moveTo(x + tail * 0.25 - 16, y + h / 2); g.lineTo(x + tail, y + h / 2 + 34); g.lineTo(x + tail * 0.25 + 16, y + h / 2); g.stroke();
}
function calendar(x, y, s, circleP, heart) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#FFFDF6'; rr(-150, -120, 300, 250, 12); g.fill();
  g.fillStyle = C.terra; rr(-150, -120, 300, 54, 12); g.fill(); g.fillRect(-150, -80, 300, 14);
  text('NOVEMBER', 0, -92, { size: 26, w: 800, f: 'fra', color: '#FFF3DE' });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
    const d = r * 7 + c + 1;
    text(String(d), -128 + c * 43, -40 + r * 42, { size: 20, w: 700, color: c === 0 ? C.terra : 'rgba(23,58,68,0.75)' });
  }
  if (circleP > 0) {
    const cx = -128 + 6 * 43, cy = -40 + 2 * 42;
    g.strokeStyle = C.red; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.ellipse(cx, cy, 26, 20, -0.2, -1.4, -1.4 + TAU * 1.08 * circleP); g.stroke();
    g.lineCap = 'butt';
    if (heart > 0) heartShape(cx + 26, cy - 26, 14 * heart, C.red);
  }
  g.restore();
}
function heartShape(x, y, s, col) {
  if (s <= 0) return;
  g.save(); g.translate(x, y); g.scale(s / 10, s / 10);
  g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-12, -2, -8, -12, 0, -6); g.bezierCurveTo(8, -12, 12, -2, 0, 6); g.closePath();
  g.fillStyle = col; g.fill(); g.restore();
}
function face(x, y, r, col, nod, smile, wink = 0) {
  g.save(); g.translate(x, y); g.rotate(nod * 0.12); g.translate(0, nod * 10);
  circle(0, 0, r, col);
  const ey = -r * 0.12;
  if (wink > 0.5) { g.strokeStyle = C.ink; g.lineWidth = 5; line(-r * 0.42, ey, -r * 0.2, ey); } else circle(-r * 0.32, ey, r * 0.09, C.ink);
  circle(r * 0.32, ey, r * 0.09, C.ink);
  g.strokeStyle = C.ink; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.arc(0, r * 0.12, r * 0.36, 0.25 * Math.PI - 0.2 * smile, 0.75 * Math.PI + 0.2 * smile); g.stroke();
  g.lineCap = 'butt';
  circle(-r * 0.55, r * 0.22, r * 0.12, hexA('#F08C78', 0.6)); circle(r * 0.55, r * 0.22, r * 0.12, hexA('#F08C78', 0.6));
  g.restore();
}
function slippers(x, y, s, a) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s * 0.6); g.globalAlpha *= a;
  for (const dx of [-46, 46]) {
    g.fillStyle = '#E98A7C'; g.beginPath(); g.ellipse(dx, 0, 38, 70, dx * 0.002, 0, TAU); g.fill();
    g.fillStyle = '#FFF0DD'; g.beginPath(); g.ellipse(dx, -24, 36, 34, 0, Math.PI, TAU); g.fill();
  }
  g.restore();
}

/* ---------------- piano keyboard along the bottom ---------------- */
const KB = { lo: 36, hi: 84 };
const IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const WHITES = []; for (let m = KB.lo; m <= KB.hi; m++) if (!IS_BLACK[m % 12]) WHITES.push(m);
const WKW = W / WHITES.length;
function keyX(m) {
  if (!IS_BLACK[m % 12]) return { x: WHITES.indexOf(m) * WKW, w: WKW, black: false };
  const wi = WHITES.indexOf(m - 1);
  return { x: (wi + 1) * WKW - WKW * 0.31, w: WKW * 0.62, black: true };
}
function drawKeys(t, P) {
  const y = KEY_Y, h = H - KEY_Y, col = P.lcol;
  g.fillStyle = '#0A1519'; g.fillRect(0, y - 8, W, h + 8);
  g.fillStyle = '#7C2B26'; g.fillRect(0, y - 8, W, 7);  // felt strip
  for (const m of WHITES) {
    const k = keyX(m), gl = PS.key[m];
    g.fillStyle = gl > 0.02 ? mixHex('#EFE3CF', col, Math.min(1, gl * 1.2)) : '#EFE3CF';
    g.fillRect(k.x + 1.5, y, k.w - 3, h - 2);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(k.x + 1.5, y + h - 12, k.w - 3, 10);
  }
  for (let m = KB.lo; m <= KB.hi; m++) {
    if (!IS_BLACK[m % 12]) continue;
    const k = keyX(m), gl = PS.key[m];
    g.fillStyle = gl > 0.02 ? mixHex('#14242A', col, Math.min(1, gl)) : '#14242A';
    rr(k.x, y, k.w, h * 0.6, [0, 0, 5, 5]); g.fill();
  }
  // light bleeding up from struck keys
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let m = KB.lo; m <= KB.hi; m++) {
    const gl = PS.key[m];
    if (gl < 0.05) continue;
    const k = keyX(m);
    glow(k.x + k.w / 2, y + 6, 70 + 60 * gl, col, gl * 0.55);
  }
  g.restore();
}
// lead-sheet ticker: the loop's four chords with the current one lit
function chordTicker(t, x, y, a, ink) {
  if (a <= 0) return;
  const ci = chordIdx(t), b = (t - BEAT0) / SPB, bar = Math.floor(b / 4) + 1;
  g.save(); g.globalAlpha *= a;
  const names = t > END_T - 1.5 ? ['Fm7'] : CHORDS.map((c) => c.name);
  let xx = x;
  names.forEach((n, i) => {
    const on = names.length === 1 || i === ci;
    const sz = on ? 42 : 30;
    if (on) { const p = names.length === 1 ? 1 : Math.exp(-fract(b / 2) * SPB * 2 * 4); g.globalAlpha = a * (0.85 + 0.15 * p); }
    else g.globalAlpha = a * 0.38;
    const w = text(n, xx, y, { size: sz, w: 700, f: 'fra', align: 'left', base: 'alphabetic', color: on ? P_LCOL : ink });
    xx += w + 26;
    if (i === 1) { g.globalAlpha = a * 0.4; text('|', xx - 13, y, { size: 30, w: 400, base: 'alphabetic', color: ink }); xx += 8; }
  });
  g.globalAlpha = a * 0.5;
  if (b >= 0 && t < END_T) text(`${bar}마디`, xx + 10, y, { size: 22, w: 700, align: 'left', base: 'alphabetic', color: ink });
  g.restore();
}
