'use strict';
/* ============================================================
   AR — the wearer's head (camera), things that float in the room
   (planes with a little perspective), and the look of the overlay:
   extruded letters, glass cards, speech bubble, tracking brackets,
   leader lines, the 3D tooth, the blue disc, the QR tag.
   ============================================================ */
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((A >> 16) & 255, (B >> 16) & 255, t)), gg = Math.round(lerp((A >> 8) & 255, (B >> 8) & 255, t)), bb = Math.round(lerp(A & 255, B & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | bb).toString(16).slice(1);
}

/* ---------------- camera = the head ----------------
   CAM.x / CAM.y: the point of the panorama at the centre of the view (px, authored at rest scale),
   zoom: leaning in, roll: head tilt. A layer with par < 1 is further away and moves less;
   AR things use par > 1 and drift in front of the room. */
const CAM = { x: 960, y: 540, zoom: 1, roll: 0 };
function layerXf(par = 1) {
  const z = 1 + (CAM.zoom - 1) * par;
  g.translate(CX, CY); g.rotate(CAM.roll); g.scale(z, z);
  g.translate(-CX - (CAM.x - CX) * par, -CY - (CAM.y - CY) * par);
}
function toScreen(X, Y, par = 1) {
  const z = 1 + (CAM.zoom - 1) * par;
  const dx = (X - CX - (CAM.x - CX) * par) * z, dy = (Y - CY - (CAM.y - CY) * par) * z;
  const c = Math.cos(CAM.roll), s = Math.sin(CAM.roll);
  return [CX + dx * c - dy * s, CY + dx * s + dy * c, z];
}

/* ---------------- planes ----------------
   A plane is a flat thing hanging in the room: centre (x, y) on the panorama, par, scale s,
   turned by ry (about the vertical), rx (about the horizontal), rz (in its own plane).
   hud: true pins it to the glasses instead of the room. */
const FOCAL = 1500;
function plane(x, y, o = {}) {
  const pl = { x, y, par: o.par != null ? o.par : 1.08, s: o.s != null ? o.s : 1, ry: o.ry || 0, rx: o.rx || 0, rz: o.rz || 0, hud: !!o.hud };
  const cy = Math.cos(pl.ry), sy = Math.sin(pl.ry), cx = Math.cos(pl.rx), sx = Math.sin(pl.rx), cz = Math.cos(pl.rz), sz = Math.sin(pl.rz);
  // R = Ry · Rx · Rz
  pl.m = [
    cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx,
    cx * sz, cx * cz, -sx,
    -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx,
  ];
  if (pl.hud) { pl.ox = x; pl.oy = y; pl.k = pl.s; pl.cr = 1; pl.sr = 0; }
  else { const p = toScreen(x, y, pl.par); pl.ox = p[0]; pl.oy = p[1]; pl.k = p[2] * pl.s; pl.cr = Math.cos(CAM.roll); pl.sr = Math.sin(CAM.roll); }
  return pl;
}
function pproj(pl, u, v, w = 0) {
  const m = pl.m;
  const x = m[0] * u + m[1] * v + m[2] * w, y = m[3] * u + m[4] * v + m[5] * w, z = m[6] * u + m[7] * v + m[8] * w;
  const k = FOCAL / (FOCAL + z * pl.k) * pl.k;
  const dx = x * k, dy = y * k;
  return [pl.ox + dx * pl.cr - dy * pl.sr, pl.oy + dx * pl.sr + dy * pl.cr, k];
}
// local affine frame of the plane at (u, v, w): draw in plane units around the origin
function planeXf(pl, u = 0, v = 0, w = 0) {
  const p = pproj(pl, u, v, w), a = pproj(pl, u + 1, v, w), b = pproj(pl, u, v + 1, w);
  g.setTransform(a[0] - p[0], a[1] - p[1], b[0] - p[0], b[1] - p[1], p[0], p[1]);
  return p;
}
function resetXf() { g.setTransform(1, 0, 0, 1, 0, 0); }

/* ---------------- extruded letters (the look of the AR labels in the clinic test) ---------------- */
const EXT = {
  rust: { face: ['#F29A55', '#D9702A'], side: ['#7A3A12', '#A9541E'], rim: '#FFD2A6' },   // "#36 RCT (3)"
  stone: { face: ['#F4F2EC', '#CFCBC2'], side: ['#6F6C66', '#A29E96'], rim: '#FFFFFF' },   // name / birth date
  white: { face: ['#FFFFFF', '#E6F4F8'], side: ['#12324A', '#2B5F7E'], rim: '#FFFFFF' },
  mint: { face: ['#C9FFF4', '#6FEBD2'], side: ['#0C4A46', '#1F8F82'], rim: '#F2FFFC' },
  blue: { face: ['#9CCBFF', '#3F8CFF'], side: ['#0F2F6B', '#2459B8'], rim: '#DCEBFF' },
  amber: { face: ['#FFE08A', '#FFB02E'], side: ['#7A4A00', '#B87410'], rim: '#FFF4CF' },
  coral: { face: ['#FFB0B8', '#FF5A6E'], side: ['#6B1420', '#B32B3D'], rim: '#FFE1E5' },
  ink: { face: ['#20354A', '#0E2233'], side: ['#000000', '#07131F'], rim: '#3F5A75' },
};
// one glyph, extruded away from the viewer. Font must be set; text is centred on (u, v).
function extGlyph(pl, ch, u, v, size, look, o = {}) {
  const D = (o.depth != null ? o.depth : 0.16) * size, n = Math.max(2, Math.min(14, Math.round(D / 2.6)));
  const sc = o.sc != null ? o.sc : 1, scy = o.scy != null ? o.scy : sc, rot = o.rot || 0;
  const a0 = g.globalAlpha;
  for (let j = n; j >= 0; j--) {
    planeXf(pl, u, v, (j / n) * D);
    if (rot) g.rotate(rot);
    if (sc !== 1 || scy !== 1) g.scale(sc, scy);
    if (j > 0) { g.fillStyle = mixHex(look.side[0], look.side[1], 1 - j / n); g.fillText(ch, 0, 0); continue; }
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || 30; }
    // bevel: a light copy first, the face a hair down-right of it (a stroke would show the font's overlapping contours)
    if (o.rim !== false) { g.fillStyle = look.rim; g.fillText(ch, 0, 0); g.shadowBlur = 0; g.translate(size * 0.008, size * 0.013); }
    const gr = g.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
    gr.addColorStop(0, o.c0 || look.face[0]); gr.addColorStop(1, o.c1 || look.face[1]);
    g.fillStyle = gr; g.fillText(ch, 0, 0);
    g.shadowBlur = 0;
  }
  g.globalAlpha = a0;
}
// soft contact shadow under a run of letters (drawn on the plane, pushed back and down)
function extShadow(pl, u, v, w, h, alpha = 0.28) {
  planeXf(pl, u, v + h * 0.62, h * 0.5);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.55);
  gr.addColorStop(0, `rgba(6,18,30,${alpha})`); gr.addColorStop(1, 'rgba(6,18,30,0)');
  g.save(); g.scale(1, Math.min(0.5, (h * 0.5) / (w * 0.55 + 1) + 0.08)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w * 0.55, 0, TAU); g.fill(); g.restore();
}

/* ---------------- glass card ---------------- */
function glass(pl, u, v, w, h, o = {}) {
  planeXf(pl, u, v);
  const r = o.r != null ? o.r : Math.min(w, h) * 0.18, a = o.alpha != null ? o.alpha : 1, a0 = g.globalAlpha;
  g.globalAlpha = a0 * a;
  g.shadowColor = 'rgba(4,14,24,0.45)'; g.shadowBlur = o.shadow != null ? o.shadow : 36; g.shadowOffsetY = 14;
  rr(-w / 2, -h / 2, w, h, r);
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, o.top || 'rgba(26,52,74,0.72)'); gr.addColorStop(1, o.bot || 'rgba(10,26,40,0.78)');
  g.fillStyle = gr; g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  // sheen + border
  const sh = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.45, 'rgba(255,255,255,0.02)'); sh.addColorStop(1, 'rgba(255,255,255,0.07)');
  g.fillStyle = sh; g.fill();
  g.lineWidth = o.lw || 2; g.strokeStyle = o.stroke || 'rgba(255,255,255,0.42)'; g.stroke();
  if (o.accent) { g.fillStyle = o.accent; rr(-w / 2 + 14, -h / 2 + 14, 6, h - 28, 3); g.fill(); }
  g.globalAlpha = a0;
}

/* ---------------- speech bubble (grey 3D balloon, black type) ---------------- */
function bubble(pl, u, v, w, h, o = {}) {
  planeXf(pl, u, v);
  const a0 = g.globalAlpha; g.globalAlpha = a0 * (o.alpha != null ? o.alpha : 1);
  const tx = o.tx != null ? o.tx : -w * 0.22, ty = o.ty != null ? o.ty : h * 0.95;   // tail tip
  g.shadowColor = 'rgba(4,14,24,0.4)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
  g.beginPath();
  g.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
  g.moveTo(tx * 0.25 - w * 0.07, h * 0.36); g.quadraticCurveTo(tx * 0.8, h * 0.6, tx, ty); g.quadraticCurveTo(tx * 0.5 + w * 0.02, h * 0.62, tx * 0.25 + w * 0.1, h * 0.4); g.closePath();
  const gr = g.createRadialGradient(-w * 0.18, -h * 0.25, 0, 0, 0, w * 0.62);
  gr.addColorStop(0, '#F3F1EC'); gr.addColorStop(0.6, '#D9D6CF'); gr.addColorStop(1, '#A9A69F');
  g.fillStyle = gr; g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.globalAlpha = a0;
}

/* ---------------- HUD marks (screen space unless inside a plane transform) ---------------- */
function brackets(x, y, w, h, o = {}) {
  const L = o.len || Math.min(w, h) * 0.22, col = o.col || C.mint;
  g.strokeStyle = col; g.lineWidth = o.lw || 4; g.lineCap = 'round'; g.lineJoin = 'round';
  const a0 = g.globalAlpha; g.globalAlpha = a0 * (o.alpha != null ? o.alpha : 1);
  if (o.glow) { g.shadowColor = col; g.shadowBlur = o.glow; }
  g.beginPath();
  g.moveTo(x, y + L); g.lineTo(x, y); g.lineTo(x + L, y);
  g.moveTo(x + w - L, y); g.lineTo(x + w, y); g.lineTo(x + w, y + L);
  g.moveTo(x + w, y + h - L); g.lineTo(x + w, y + h); g.lineTo(x + w - L, y + h);
  g.moveTo(x + L, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - L);
  g.stroke();
  g.shadowBlur = 0; g.lineCap = 'butt'; g.globalAlpha = a0;
}
// tracking box that locks on: starts big and loose, snaps to the target
function lockOn(t, t0, x, y, w, h, o = {}) {
  if (t < t0) return 0;
  const p = Ease.outExpo(pr(t, t0, t0 + (o.dur || 0.45)));
  const k = lerp(1.9, 1, p), wob = (1 - p) * 0.2;
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(wob);
  brackets(-w * k / 2, -h * k / 2, w * k, h * k, Object.assign({ alpha: Math.min(1, p * 3) * (o.alpha != null ? o.alpha : 1) }, o));
  g.restore();
  return p;
}
function reticle(x, y, r, o = {}) {
  const col = o.col || C.mint, a0 = g.globalAlpha;
  g.globalAlpha = a0 * (o.alpha != null ? o.alpha : 1);
  g.strokeStyle = col; g.lineWidth = o.lw || 2.5;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + (o.rot || 0); line(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25, x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6); }
  if (o.fill != null) { g.lineWidth = (o.lw || 2.5) * 2.2; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r * 0.7, -TAU / 4, -TAU / 4 + TAU * clamp(o.fill)); g.stroke(); g.lineCap = 'butt'; }
  circle(x, y, clamp(r * 0.09, 2, 7), col);
  g.globalAlpha = a0;
}
// leader line: target dot → elbow → label end, drawn up to fraction p. returns the end point
function leader(x1, y1, x2, y2, p, o = {}) {
  if (p <= 0) return [x1, y1];
  const col = o.col || C.mint, a0 = g.globalAlpha;
  g.globalAlpha = a0 * (o.alpha != null ? o.alpha : 1);
  const ex = o.elbow != null ? o.elbow : x1 + (x2 - x1) * 0.35;
  g.strokeStyle = col; g.lineWidth = o.lw || 3; g.lineJoin = 'round'; g.lineCap = 'round';
  const head = polyPartial([[x1, y1], [ex, y2], [x2, y2]], p);
  circle(x1, y1, (o.dot || 7) * Math.min(1, p * 4), col);
  g.lineWidth = 2; g.beginPath(); g.arc(x1, y1, (o.dot || 7) * 2.1 * Math.min(1, p * 4), 0, TAU); g.stroke();
  g.lineCap = 'butt'; g.globalAlpha = a0;
  return head;
}
// thin label for the HUD: mono latin or Orbit hangul
function hudText(s, x, y, o = {}) {
  const lat = /^[\x20-\x7E·●▲▼→←°×Ø]+$/.test(s);
  return text(s, x, y, Object.assign({ f: lat ? 'mono' : 'orb', w: lat ? 600 : 400, size: 22, color: C.mint, align: 'left', ls: lat ? 1.2 : 0.5 }, o));
}
// small glass pill with a label (drawn in the current transform)
function pill(s, x, y, o = {}) {
  const size = o.size || 26, padX = o.padX != null ? o.padX : size * 0.7, f = o.f || null, wt = o.w || 700;
  const tw = textW(s, size, wt, o.ls, f), w = tw + padX * 2 + (o.dot ? size * 0.9 : 0), h = size * 1.75;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  const a0 = g.globalAlpha; g.globalAlpha = a0 * (o.alpha != null ? o.alpha : 1);
  rr(x0, y - h / 2, w, h, h / 2);
  g.fillStyle = o.bg || 'rgba(10,28,44,0.72)'; g.fill();
  g.lineWidth = o.lw || 2; g.strokeStyle = o.stroke || hexA(o.col || C.mint, 0.7); g.stroke();
  if (o.dot) circle(x0 + padX + size * 0.2, y, size * 0.24, o.dot);
  text(s, x0 + padX + (o.dot ? size * 0.9 : 0), y + size * 0.04, { size, w: wt, f, ls: o.ls, align: 'left', color: o.color || C.white });
  g.globalAlpha = a0;
  return w;
}

/* ---------------- objects from the clinic screenshots ---------------- */
// lower first molar (#36) cut off below the crown, two roots: white, softly shaded. canals: 0..1 lights the root canals
function tooth(x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); if (o.rot) g.rotate(o.rot);
  const a0 = g.globalAlpha;
  const body = () => {
    g.beginPath();
    g.moveTo(-100, -120);
    g.bezierCurveTo(-112, -60, -108, -10, -96, 40);       // mesial wall
    g.bezierCurveTo(-90, 110, -84, 190, -62, 236);        // mesial root outer
    g.bezierCurveTo(-52, 256, -30, 254, -26, 232);        // apex
    g.bezierCurveTo(-18, 170, -16, 96, -2, 44);           // furcation left
    g.bezierCurveTo(6, 30, 16, 30, 22, 46);               // furcation roof
    g.bezierCurveTo(36, 100, 44, 170, 62, 216);           // distal root inner
    g.bezierCurveTo(72, 240, 96, 236, 98, 214);           // apex
    g.bezierCurveTo(100, 150, 96, 80, 100, 30);           // distal root outer
    g.bezierCurveTo(108, -20, 110, -70, 102, -120);
    g.closePath();
  };
  // drop shadow
  g.shadowColor = 'rgba(4,14,24,0.4)'; g.shadowBlur = 30; g.shadowOffsetY = 16;
  body();
  const gr = g.createLinearGradient(-110, 0, 110, 0);
  gr.addColorStop(0, '#DADFE4'); gr.addColorStop(0.28, '#FFFFFF'); gr.addColorStop(0.62, '#F4F6F8'); gr.addColorStop(1, '#BFC7CF');
  g.fillStyle = gr; g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  // vertical shade towards the apices
  body(); const gv = g.createLinearGradient(0, -120, 0, 250); gv.addColorStop(0, 'rgba(255,255,255,0)'); gv.addColorStop(1, 'rgba(120,136,150,0.35)'); g.fillStyle = gv; g.fill();
  // cut surface (ellipse) with the access opening
  g.beginPath(); g.ellipse(1, -120, 101, 26, 0, 0, TAU);
  const gt = g.createLinearGradient(0, -146, 0, -94); gt.addColorStop(0, '#FFFFFF'); gt.addColorStop(1, '#E3E8EC'); g.fillStyle = gt; g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(150,165,178,0.6)'; g.stroke();
  g.beginPath(); g.ellipse(2, -118, 52, 12, 0, 0, TAU); g.fillStyle = '#B9C2CA'; g.fill();
  // root canals
  const cv_ = o.canals || 0;
  if (cv_ > 0) {
    const paths = [
      [[-30, -116], [-52, -40], [-60, 60], [-50, 150], [-44, 232]],     // mesial
      [[-6, -116], [-34, -30], [-40, 70], [-36, 150], [-40, 228]],
      [[26, -116], [48, -30], [60, 60], [74, 140], [82, 214]],          // distal
      [[40, -116], [68, -40], [80, 50], [86, 130], [88, 208]],
    ];
    g.lineCap = 'round'; g.lineJoin = 'round';
    paths.forEach((pts, i) => {
      const p = clamp(cv_ * 1.25 - i * 0.08);
      if (p <= 0) return;
      g.strokeStyle = hexA(o.canalCol || '#FF8A3D', 0.9); g.lineWidth = 7; g.shadowColor = o.canalCol || '#FF8A3D'; g.shadowBlur = 16;
      const head = polyPartial(pts, p);
      g.shadowBlur = 0;
      if (p < 1) circle(head[0], head[1], 8, '#FFFFFF');
    });
    g.lineCap = 'butt';
  }
  g.globalAlpha = a0;
  g.restore();
}
// the blue disc under "#36 RCT (3)"
function disc(x, y, rx, o = {}) {
  const ry = rx * 0.3, th = rx * 0.2, a0 = g.globalAlpha;
  g.globalAlpha = a0 * (o.alpha != null ? o.alpha : 1);
  g.shadowColor = 'rgba(4,14,24,0.4)'; g.shadowBlur = 26; g.shadowOffsetY = 14;
  g.beginPath(); g.ellipse(x, y + th, rx, ry, 0, 0, Math.PI); g.lineTo(x - rx, y); g.ellipse(x, y, rx, ry, 0, Math.PI, 0, true); g.closePath();
  const gs = g.createLinearGradient(x - rx, 0, x + rx, 0); gs.addColorStop(0, '#1F4E9E'); gs.addColorStop(0.5, '#2F6FD0'); gs.addColorStop(1, '#173F86');
  g.fillStyle = gs; g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  const gt = g.createLinearGradient(0, y - ry, 0, y + ry); gt.addColorStop(0, '#6AA6F5'); gt.addColorStop(1, '#3F86E0'); g.fillStyle = gt; g.fill();
  g.globalAlpha = a0;
}
// a QR-like tag (not a real code): finder squares + a fixed scatter of modules
function qrTag(x, y, s, o = {}) {
  const n = 21, m = s / n, seed = o.seed || 7;
  g.save(); g.translate(x - s / 2, y - s / 2);
  g.fillStyle = '#FFFFFF'; rr(-m * 1.5, -m * 1.5, s + m * 3, s + m * 3, m * 1.2); g.fill();
  g.fillStyle = o.col || '#10202E';
  const finder = (fx, fy) => { g.fillRect(fx * m, fy * m, 7 * m, 7 * m); g.fillStyle = '#FFFFFF'; g.fillRect((fx + 1) * m, (fy + 1) * m, 5 * m, 5 * m); g.fillStyle = o.col || '#10202E'; g.fillRect((fx + 2) * m, (fy + 2) * m, 3 * m, 3 * m); };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if ((i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9)) continue;
    if (rnd(i * 31 + j, seed) > 0.52) g.fillRect(i * m, j * m, m + 0.3, m + 0.3);
  }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  g.restore();
}
// glasses drawn as a line icon; lit: 0..1 fills the lenses with light
function glassesIcon(x, y, s, o = {}) {
  const col = o.col || C.white, lw = (o.lw || 10), lit = o.lit || 0, a0 = g.globalAlpha;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.globalAlpha = a0 * (o.alpha != null ? o.alpha : 1);
  const lens = (sx) => { rr(sx < 0 ? -212 : 28, -62, 184, 124, 46); };
  if (lit > 0) {
    [-1, 1].forEach((sx) => {
      lens(sx);
      const gr = g.createLinearGradient(sx < 0 ? -212 : 28, -62, sx < 0 ? -28 : 212, 62);
      gr.addColorStop(0, hexA(o.c0 || C.mint, 0.75 * lit)); gr.addColorStop(1, hexA(o.c1 || C.blue, 0.55 * lit));
      g.fillStyle = gr; g.shadowColor = o.c0 || C.mint; g.shadowBlur = 50 * lit; g.fill(); g.shadowBlur = 0;
    });
  }
  g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
  const pd = o.draw != null ? clamp(o.draw) : 1;
  if (pd >= 1) {
    lens(-1); g.stroke(); lens(1); g.stroke();
    g.beginPath(); g.moveTo(-28, -14); g.quadraticCurveTo(0, -34, 28, -14); g.stroke();
    g.beginPath(); g.moveTo(-212, -24); g.lineTo(-262, -44); g.moveTo(212, -24); g.lineTo(262, -44); g.stroke();
  } else if (pd > 0) {
    g.setLineDash([1400 * pd, 2000]);
    lens(-1); g.stroke(); lens(1); g.stroke();
    g.setLineDash([]);
    if (pd > 0.6) { g.beginPath(); g.moveTo(-28, -14); g.quadraticCurveTo(0, -34, 28, -14); g.stroke(); }
    if (pd > 0.8) { g.beginPath(); g.moveTo(-212, -24); g.lineTo(-262, -44); g.moveTo(212, -24); g.lineTo(262, -44); g.stroke(); }
  }
  g.lineCap = 'butt';
  g.restore(); g.globalAlpha = a0;
}
// level meter (the glasses are listening)
function meter(x, y, n, w, h, lv, col) {
  for (let i = 0; i < n; i++) {
    const k = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + lv * 9)) * lv + 0.08 * Math.sin(i * 0.9);
    const bh = Math.max(3, h * clamp(k));
    g.fillStyle = col; rr(x + i * (w / n), y - bh / 2, (w / n) * 0.55, bh, 2); g.fill();
  }
}
