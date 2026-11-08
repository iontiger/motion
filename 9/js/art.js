'use strict';
/* ============================================================
   ART — cartoon palette, inked shapes, the white bear, props
   Everything is drawn with a thick ink outline, flat fills and a
   hard offset shadow, like the comic the song comes from.
   ============================================================ */
const P = {
  paper: '#FFF6E6', cream: '#FFEBC8', ink: '#1E1B18', white: '#FFFFFF', shadow: 'rgba(30,27,24,0.92)',
  orange: '#FF7A1A', orange2: '#FFA53D', vestDark: '#D9560A', yellow: '#FFD84A', red: '#FF4B3E', pink: '#FF9DB0', blush: 'rgba(255,128,150,0.55)',
  sky: '#8FD6FF', sky2: '#DDF3FF', water: '#4FB8F2', water2: '#2A86D6', deep: '#145BA8', foam: '#E9F8FF',
  green: '#86D06E', green2: '#58B35B', green3: '#3E9548', sand: '#F1D49E', trail: '#E3B678', rock: '#9C928A', rock2: '#7A706A',
  brown: '#C99260', brown2: '#A9733F', grey: '#B9C0C7', grey2: '#8E969E', snow: '#FFFFFF', purple: '#8F7BEA', peach: '#FFB37A',
};
const LW = 7; // base ink width at scale 1

/* ---------------- ink helpers ---------------- */
// draw a path twice: ink stroke (outline) then the fill
function inked(path, fill, lw = LW, ink = P.ink) {
  path(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (lw > 0) { g.strokeStyle = ink; g.lineWidth = lw; g.stroke(); }
  if (fill) { g.fillStyle = fill; g.fill(); }
}
// union of several shapes: all outlines first, then all fills (no inner seams)
function union(paths, fill, lw = LW) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = P.ink; g.lineWidth = lw * 2;
  for (const p of paths) { p(); g.stroke(); }
  g.fillStyle = fill;
  for (const p of paths) { p(); g.fill(); }
}
const pCircle = (x, y, r) => () => { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); };
const pEllipse = (x, y, rx, ry, rot = 0) => () => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); };
const pRR = (x, y, w, h, r) => () => { g.beginPath(); g.roundRect(x, y, w, h, r); };
// capsule from (x1,y1) to (x2,y2) with radius r
const pCap = (x1, y1, x2, y2, r) => () => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  g.beginPath(); g.arc(x1, y1, r, a + Math.PI / 2, a - Math.PI / 2); g.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2); g.closePath();
};
function hardShadow(fn, dx = 12, dy = 12, col = P.shadow) {
  g.save(); g.translate(dx, dy); const a = g.globalAlpha; g.globalAlpha = a * 0.9;
  g.fillStyle = col; fn(true); g.restore();
}
function inkLine(x1, y1, x2, y2, lw = LW) { g.strokeStyle = P.ink; g.lineWidth = lw; g.lineCap = 'round'; line(x1, y1, x2, y2); }

/* ---------------- halftone & patterns ---------------- */
const _PAT = new Map();
function dotPattern(col, bg, step = 22, r = 4.2) {
  const key = col + bg + step + r;
  if (_PAT.has(key)) return _PAT.get(key);
  const c = document.createElement('canvas'); c.width = step; c.height = step;
  const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, step, step); }
  x.fillStyle = col;
  x.beginPath(); x.arc(step / 4, step / 4, r, 0, TAU); x.arc(step * 3 / 4, step * 3 / 4, r, 0, TAU); x.fill();
  const p = g.createPattern(c, 'repeat'); _PAT.set(key, p); return p;
}
function halftone(col, x, y, w, h, step, r, ox = 0, oy = 0) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.translate(ox % step, oy % step);
  g.fillStyle = dotPattern(col, null, step, r); g.fillRect(x - step, y - step, w + step * 2, h + step * 2);
  g.restore();
}

/* ---------------- manga speed / burst lines ---------------- */
function burst(cx, cy, r0, r1, n, t, col = P.ink, seed = 3, lw = 6) {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd(i, seed) * 0.12 + t * 0.15;
    const w = (0.012 + rnd(i, seed + 1) * 0.02);
    const rr0 = r0 * (0.9 + rnd(i + Math.floor(t * 12), seed + 2) * 0.35);
    g.beginPath();
    g.moveTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1);
    g.lineTo(cx + Math.cos(a) * rr0, cy + Math.sin(a) * rr0);
    g.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1);
    g.fill();
  }
}
function speedLines(x0, y0, x1, y1, n, t, col = P.ink, seed = 5) {
  g.strokeStyle = col; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, rnd(i, seed));
    const len = lerp(80, 260, rnd(i, seed + 1));
    const sp = lerp(1400, 2600, rnd(i, seed + 2));
    const x = x1 - fract(t * sp / (x1 - x0 + 400) + rnd(i, seed + 3)) * (x1 - x0 + 400);
    g.lineWidth = lerp(3, 8, rnd(i, seed + 4));
    line(x, y, x + len, y);
  }
}

/* ---------------- comic shapes ---------------- */
// spiky shout balloon
function spiky(cx, cy, rx, ry, n = 14, seed = 1, fill = P.white, lw = LW) {
  inked(() => {
    g.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * TAU;
      const k = i % 2 ? 0.74 + rnd(i, seed) * 0.08 : 1 + rnd(i, seed + 1) * 0.12;
      const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  }, fill, lw);
}
// round speech bubble with a tail pointing at (tx,ty)
function bubble(cx, cy, w, h, tx, ty, fill = P.white, lw = LW) {
  const path = () => {
    g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(h / 2, 60));
    if (tx != null) {
      const bx = clamp(tx, cx - w / 2 + 50, cx + w / 2 - 50), by = ty > cy ? cy + h / 2 - 4 : cy - h / 2 + 4;
      g.moveTo(bx - 26, by); g.lineTo(tx, ty); g.lineTo(bx + 26, by);
    }
  };
  hardShadow(() => { path(); g.fill(); }, 10, 10);
  path(); g.strokeStyle = P.ink; g.lineWidth = lw * 2; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = fill; path(); g.fill();
}
// puffy thought cloud
function cloudShape(cx, cy, w, h, seed = 2) {
  g.beginPath();
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = Math.min(w, h) * (0.22 + rnd(i, seed) * 0.06);
    g.moveTo(cx + Math.cos(a) * (w / 2 - r * 0.6) + r, cy + Math.sin(a) * (h / 2 - r * 0.6));
    g.arc(cx + Math.cos(a) * (w / 2 - r * 0.6), cy + Math.sin(a) * (h / 2 - r * 0.6), r, 0, TAU);
  }
  g.moveTo(cx + w * 0.42, cy); g.ellipse(cx, cy, w * 0.42, h * 0.36, 0, 0, TAU);
}
function thoughtCloud(cx, cy, w, h, tx, ty, fill = P.white, seed = 2) {
  hardShadow(() => { cloudShape(cx, cy, w, h, seed); g.fill(); }, 10, 10);
  g.strokeStyle = P.ink; g.lineWidth = LW * 2; cloudShape(cx, cy, w, h, seed); g.stroke();
  g.fillStyle = fill; cloudShape(cx, cy, w, h, seed); g.fill();
  if (tx != null) for (let k = 0; k < 3; k++) {
    const f = (k + 1) / 4, r = 18 - k * 5;
    inked(pCircle(lerp(cx, tx, 0.55 + f * 0.45), lerp(cy + h * 0.35, ty, 0.55 + f * 0.45), r), fill, 5);
  }
}
// rubber stamp label
function stamp(s, x, y, size, rot, col = P.red, p = 1, f = 'disp') {
  if (p <= 0) return;
  const sc = lerp(2.6, 1, Ease.outExpo(clamp(p))), a = clamp(p * 4);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.globalAlpha *= a;
  setFont(size, 400, 0, f); const w = layout(s).w;
  const bw = w + size * 0.8, bh = size * 1.35;
  g.strokeStyle = col; g.lineWidth = size * 0.1; g.lineJoin = 'round';
  g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, size * 0.18); g.stroke();
  g.lineWidth = size * 0.04; g.beginPath(); g.roundRect(-bw / 2 + size * 0.12, -bh / 2 + size * 0.12, bw - size * 0.24, bh - size * 0.24, size * 0.12); g.stroke();
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, size * 0.04);
  g.restore();
}

/* ---------------- the white bear ----------------
   (x,y) = point between the feet; s = scale (1 → about 250 px tall)
   o: walk (phase, 0 = still), run, arms ([left, right] angles), face, vest, cap, hat, pack, col, blink, look */
function bear(x, y, s, o = {}) {
  const col = o.col || P.white, lw = LW / Math.max(0.35, s) * Math.min(1, 0.55 + s * 0.45);
  const ph = o.walk || 0, run = o.run || 0, amp = o.walkAmp != null ? o.walkAmp : (run ? 0.9 : 0.45);
  const bob = o.walk != null ? Math.abs(Math.sin(ph)) * (run ? 14 : 7) : 0;
  g.save(); g.translate(x, y); g.scale(s, s);
  if (o.flip) g.scale(-1, 1);
  g.rotate((o.lean || 0) + (run ? 0.14 : 0));
  g.translate(0, -bob);
  const legA = o.walk != null ? Math.sin(ph) * amp : 0;
  const armA = o.arms || [0.3 + legA * 0.9, 0.3 - legA * 0.9];
  const parts = [];
  // legs
  const leg = (sx, a) => { const hx = sx * 17, hy = -22; parts.push(pCap(hx, hy, hx + Math.sin(a) * 24, hy + Math.cos(a) * 22, 15)); };
  if (!o.noLegs) { leg(-1, legA); leg(1, -legA); }
  // body + head + ears
  parts.push(pEllipse(0, -62, 54, 56));
  const hy = -160, hr = 74;
  parts.push(pCircle(-hr * 0.66, hy - hr * 0.72, 18), pCircle(hr * 0.66, hy - hr * 0.72, 18));
  parts.push(pEllipse(0, hy, hr * 1.04, hr * 0.92));
  if (o.pack) inked(pRR(-60, -120, 44, 82, 18), P.brown2, lw); // backpack peeking behind
  union(parts, col, lw);
  // vest
  if (o.vest) lifeVestOn(lw);
  // arms (each inked so they read in front of the body)
  const arm = (sx, a) => { // a: 0 = hanging down, PI/2 = straight out, PI = straight up
    const ax = sx * 46, ay = -96, L = o.armLen || 48;
    const p = pCap(ax, ay, ax + sx * Math.sin(a) * L, ay + Math.cos(a) * L, 14);
    inked(p, null, lw * 2); g.fillStyle = col; p(); g.fill();
  };
  if (!o.noArms) { arm(-1, armA[0]); arm(1, armA[1]); }
  // accessories on the head
  if (o.cap) { inked(() => { g.beginPath(); g.ellipse(0, hy - 20, hr * 1.02, hr * 0.7, 0, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); }, o.cap === true ? '#F3DDB5' : o.cap, lw); }
  if (o.hat) {
    inked(pEllipse(0, hy - hr * 0.62, hr * 1.25, 16), '#B48A55', lw);
    inked(() => { g.beginPath(); g.ellipse(0, hy - hr * 0.62, hr * 0.78, hr * 0.62, 0, Math.PI, TAU); g.closePath(); }, '#C9A06A', lw);
    g.fillStyle = '#7A5530'; g.fillRect(-hr * 0.78, hy - hr * 0.62 - 14, hr * 1.56, 10);
  }
  if (o.grad) {
    inked(() => { g.beginPath(); g.moveTo(-hr * 0.95, hy - hr * 0.95); g.lineTo(0, hy - hr * 1.3); g.lineTo(hr * 0.95, hy - hr * 0.95); g.lineTo(0, hy - hr * 0.62); g.closePath(); }, '#2B2B33', lw);
    g.strokeStyle = P.yellow; g.lineWidth = 5; line(hr * 0.5, hy - hr * 0.95, hr * 0.62, hy - hr * 0.45);
  }
  g.save(); g.translate(0, hy + 6); g.scale(1.1, 1.1); face(0, 0, o.face || 'calm', o.blink || 0, o.look || 0, col === P.white); g.restore();
  g.restore();
}
function face(x, y, kind, blink, look, blush) {
  g.save(); g.translate(x + look * 10, y);
  g.fillStyle = P.ink; g.strokeStyle = P.ink; g.lineCap = 'round'; g.lineJoin = 'round';
  const ex = 24, ey = -6;
  const dots = (r = 6.5) => {
    if (blink > 0.5) { g.lineWidth = 5; line(-ex - 7, ey, -ex + 7, ey); line(ex - 7, ey, ex + 7, ey); return; }
    circle(-ex, ey, r, P.ink); circle(ex, ey, r, P.ink);
  };
  const mouthW = () => { // ω
    g.lineWidth = 5; g.beginPath(); g.arc(-7, 18, 7, 0.1, Math.PI - 0.1); g.stroke(); g.beginPath(); g.arc(7, 18, 7, 0.1, Math.PI - 0.1); g.stroke();
  };
  const nose = () => { g.beginPath(); g.ellipse(0, 9, 7, 5, 0, 0, TAU); g.fill(); };
  if (kind === 'scared') {
    for (const sx of [-1, 1]) { inked(pCircle(sx * ex, ey - 2, 14), P.white, 4); circle(sx * ex + 2, ey, 5, P.ink); }
    g.lineWidth = 4.5; g.beginPath(); for (let i = 0; i <= 6; i++) { const xx = -16 + i * 5.3; i ? g.lineTo(xx, 26 + (i % 2 ? -4 : 3)) : g.moveTo(xx, 26); } g.stroke();
    nose();
    g.fillStyle = '#8FD0FF'; g.strokeStyle = P.ink; g.lineWidth = 3;
    for (const [dx, dy] of [[-58, -30], [52, -40]]) { g.beginPath(); g.moveTo(dx, dy - 12); g.quadraticCurveTo(dx + 9, dy + 4, dx, dy + 8); g.quadraticCurveTo(dx - 9, dy + 4, dx, dy - 12); g.fill(); g.stroke(); }
  } else if (kind === 'happy') {
    g.lineWidth = 5; g.beginPath(); g.arc(-ex, ey + 4, 8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.beginPath(); g.arc(ex, ey + 4, 8, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    nose();
    inked(() => { g.beginPath(); g.moveTo(-12, 17); g.quadraticCurveTo(0, 40, 12, 17); g.closePath(); }, '#FF6F7F', 4);
  } else if (kind === 'meh') {
    g.lineWidth = 5; line(-ex - 9, ey, -ex + 7, ey + 2); line(ex - 7, ey + 2, ex + 9, ey);
    g.lineWidth = 3; line(-ex - 10, ey - 10, -ex + 6, ey - 13); line(ex - 6, ey - 13, ex + 10, ey - 10);
    nose(); g.lineWidth = 4.5; line(-6, 22, 6, 22);
  } else if (kind === 'firm') {
    g.lineWidth = 5; line(-ex - 10, ey - 16, -ex + 8, ey - 10); line(ex - 8, ey - 10, ex + 10, ey - 16);
    dots(6); nose(); mouthW();
  } else if (kind === 'shout') {
    dots(6.5); nose();
    inked(pEllipse(0, 28, 11, 13), '#FF6F7F', 4);
  } else { dots(); nose(); mouthW(); }
  if (blush && kind !== 'scared' && kind !== 'meh') { g.fillStyle = P.blush; g.beginPath(); g.ellipse(-ex - 16, 16, 11, 7, 0, 0, TAU); g.ellipse(ex + 16, 16, 11, 7, 0, 0, TAU); g.fill(); }
  g.restore();
}
// orange life vest over the bear's body (bear-local coords)
function lifeVestOn(lw) {
  g.save(); g.translate(0, -64); g.scale(0.5, 0.4);
  vestBody(lw / 0.45);
  g.restore();
}
// a standalone life vest (for flying in)
function lifeVest(x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  hardShadow(() => { vestPath(); g.fill(); }, 14, 14);
  vestBody(8);
  g.restore();
}
function vestBody(lw) {
  inked(vestPath, P.orange, lw);
  g.fillStyle = P.vestDark; g.save(); vestPath(); g.clip(); g.fillRect(60, -130, 60, 280); g.fillRect(-120, -130, 30, 280); g.restore();
  inked(vestPath, null, lw);
  g.strokeStyle = P.ink; g.lineWidth = lw * 0.8; g.lineCap = 'round'; line(0, -34, 0, 128);
  for (const yy of [22, 78]) { g.fillStyle = '#2E2A33'; g.fillRect(-100, yy - 10, 200, 20); inked(pRR(-20, yy - 16, 40, 32, 7), '#F4F4F4', lw * 0.7); }
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(-84, -20, 30, 11); g.fillRect(54, -20, 30, 11);
}
function vestPath() {
  g.beginPath();
  g.moveTo(-62, -118); g.lineTo(-28, -118); g.quadraticCurveTo(-24, -56, 0, -34); g.quadraticCurveTo(24, -56, 28, -118); g.lineTo(62, -118);
  g.quadraticCurveTo(66, -48, 104, -28); g.lineTo(100, 120); g.quadraticCurveTo(0, 142, -100, 120); g.lineTo(-104, -28); g.quadraticCurveTo(-66, -48, -62, -118);
  g.closePath();
}

/* ---------------- scenery ---------------- */
function sun(x, y, r, t) {
  g.save(); g.translate(x, y); g.rotate(t * 0.25);
  g.strokeStyle = P.ink; g.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, r0 = r * 1.35, r1 = r * (i % 2 ? 1.62 : 1.8);
    g.lineWidth = 14; line(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1);
    g.strokeStyle = P.orange2; g.lineWidth = 7; line(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1); g.strokeStyle = P.ink;
  }
  g.restore();
  inked(pCircle(x, y, r), P.orange2);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU); g.fill();
}
function cloud(x, y, s, fill = P.white) {
  const path = () => {
    g.beginPath();
    g.arc(x - 60 * s, y, 42 * s, Math.PI * 0.5, Math.PI * 1.5);
    g.arc(x - 20 * s, y - 40 * s, 46 * s, Math.PI, Math.PI * 1.85);
    g.arc(x + 38 * s, y - 30 * s, 40 * s, Math.PI * 1.2, Math.PI * 0.1 + TAU);
    g.arc(x + 70 * s, y + 6 * s, 34 * s, Math.PI * 1.5, Math.PI * 0.5);
    g.closePath();
  };
  inked(path, fill, LW * 0.9);
}
// rolling hills band; base y, amplitude, phase scroll x
function hills(y, amp, wl, ox, fill, seed, lw = LW) {
  inked(() => {
    g.beginPath(); g.moveTo(-20, H + 20);
    for (let x = -20; x <= W + 20; x += 16) {
      const u = (x + ox) / wl;
      g.lineTo(x, y - amp * (0.55 + 0.45 * Math.sin(u * TAU + seed) * 0.8 + 0.25 * Math.sin(u * TAU * 2.3 + seed * 2)));
    }
    g.lineTo(W + 20, H + 20); g.closePath();
  }, fill, lw);
}
function mountain(x, y, w, h, fill = P.rock, snow = true) {
  inked(() => { g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w * 0.06, y - h); g.lineTo(x + w * 0.04, y - h * 0.96); g.lineTo(x + w / 2, y); g.closePath(); }, fill);
  if (snow) inked(() => {
    g.beginPath(); g.moveTo(x - w * 0.06 - w * 0.13, y - h * 0.72); g.lineTo(x - w * 0.06, y - h); g.lineTo(x + w * 0.04, y - h * 0.96); g.lineTo(x + w * 0.04 + w * 0.12, y - h * 0.7);
    g.lineTo(x + w * 0.06, y - h * 0.76); g.lineTo(x, y - h * 0.66); g.lineTo(x - w * 0.08, y - h * 0.76); g.closePath();
  }, P.snow, LW * 0.8);
}
function tree(x, y, s, fill = P.green2) {
  g.fillStyle = P.ink; g.fillRect(x - 6 * s, y - 50 * s, 12 * s, 50 * s);
  g.fillStyle = '#8B5A2B'; g.fillRect(x - 3 * s, y - 48 * s, 6 * s, 46 * s);
  inked(pCircle(x, y - 80 * s, 42 * s), fill, LW * Math.min(1, s + 0.2));
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(x - 14 * s, y - 94 * s, 12 * s, 0, TAU); g.fill();
}
// a band of water with a wavy inked top. returns nothing
function waterBand(y, t, fill = P.water, amp = 14, wl = 220, speed = 1, foam = true, lw = LW) {
  const path = () => {
    g.beginPath(); g.moveTo(-20, H + 40);
    for (let x = -20; x <= W + 20; x += 12) g.lineTo(x, y + Math.sin((x / wl) * TAU + t * 2.2 * speed) * amp + Math.sin((x / wl) * TAU * 2.7 - t * 1.6 * speed) * amp * 0.3);
    g.lineTo(W + 20, H + 40); g.closePath();
  };
  inked(path, fill, lw);
  if (foam) {
    g.strokeStyle = P.foam; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = fract(i * 0.137 + t * 0.03 * speed) * (W + 200) - 100, yy = y + 48 + (i % 3) * 46;
      g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + 22, yy - 12, x + 44, yy); g.quadraticCurveTo(x + 66, yy + 12, x + 88, yy); g.stroke();
    }
  }
}
function rock(x, y, w, h, fill = P.rock) {
  inked(() => {
    g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x - w * 0.48, y - h * 0.8, x - w * 0.2, y - h);
    g.quadraticCurveTo(x + w * 0.1, y - h * 1.08, x + w * 0.34, y - h * 0.86); g.quadraticCurveTo(x + w * 0.52, y - h * 0.5, x + w / 2, y); g.closePath();
  }, fill);
  g.strokeStyle = P.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(x - w * 0.1, y - h * 0.7); g.quadraticCurveTo(x, y - h * 0.5, x - w * 0.05, y - h * 0.3); g.stroke();
}
function bubbles(x0, x1, yTop, yBot, t, n, seed = 9, sMax = 18) {
  for (let i = 0; i < n; i++) {
    const sp = lerp(90, 220, rnd(i, seed));
    const y = yBot - fract(t * sp / (yBot - yTop) + rnd(i, seed + 1)) * (yBot - yTop);
    const x = lerp(x0, x1, rnd(i, seed + 2)) + Math.sin(t * 2 + i) * 12;
    const r = lerp(5, sMax, rnd(i, seed + 3));
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU); g.fill();
  }
}
function heart(x, y, s, fill = P.red) {
  inked(() => {
    g.beginPath(); g.moveTo(x, y + 30 * s);
    g.bezierCurveTo(x - 60 * s, y - 10 * s, x - 30 * s, y - 50 * s, x, y - 22 * s);
    g.bezierCurveTo(x + 30 * s, y - 50 * s, x + 60 * s, y - 10 * s, x, y + 30 * s); g.closePath();
  }, fill, LW * Math.min(1, s));
}
function check(x, y, s, p) {
  if (p <= 0) return;
  inked(pCircle(x, y, 46 * s * Ease.outBack(clamp(p * 1.6), 2)), P.green2, LW);
  const q = clamp((p - 0.2) / 0.5);
  if (q > 0) { g.strokeStyle = P.white; g.lineWidth = 12 * s; g.lineCap = 'round'; g.lineJoin = 'round'; polyPartial([[x - 20 * s, y + 2 * s], [x - 5 * s, y + 18 * s], [x + 22 * s, y - 16 * s]], q); }
}
// wooden signpost with two arrows
function signpost(x, y, s, t, pick) {
  g.save(); g.translate(x, y); g.scale(s, s);
  inked(pRR(-12, -330, 24, 330, 6), '#B07A45');
  const arm = (yy, dir, label, col, on) => {
    g.save(); g.translate(0, yy); g.rotate(dir * (0.04 + (on ? Math.sin(t * 8) * 0.03 : 0)));
    inked(() => { g.beginPath(); const L = 230 * dir; g.moveTo(-20 * dir, -38); g.lineTo(L, -38); g.lineTo(L + 44 * dir, 0); g.lineTo(L, 38); g.lineTo(-20 * dir, 38); g.closePath(); }, on ? col : '#E8C79A');
    text(label, 120 * dir, 4, { size: 46, f: 'jua', color: on ? P.white : P.ink, outline: on ? 10 : 0, ocol: P.ink });
    g.restore();
  };
  arm(-260, -1, '물', P.water, pick < 0);
  arm(-160, 1, '산', P.green2, pick > 0);
  g.restore();
}
