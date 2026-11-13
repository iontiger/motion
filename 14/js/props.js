'use strict';
/* ============================================================
   PROPS — what the glasses show besides the lyrics: the patient's ID,
   tooth chart, history, the next appointment (#36 RCT (3) on its blue disc),
   implant plan, canal lengths in the grey balloon, the visit memo, the
   records fanned out in the chorus, the education / surgery panels, the
   floor plan, and the two pieces of real footage from the clinic.
   Everything is anchored in the room (see AT) unless it says HUD.
   ============================================================ */
let NOW = 0;                 // current time, set by drawFrame
let IMG = {};                // real footage: ar (photo), skull (sprite sheet)
function loadImages() {
  const one = (k, src) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = src; });
  return Promise.all([one('ar', 'img/ar-photo.jpg'), one('skull', 'img/skull-sheet.jpg')]);
}
// where on the panorama a thing must hang so that, with the head at view v, it shows at screen (sx, sy)
function AT(v, sx, sy, par = 1.08) {
  const z = 1 + (v.zoom - 1) * par;
  return { x: CX + (v.x - CX) * par + (sx - CX) / z, y: CY + (v.y - CY) * par + (sy - CY) / z, par, s: 1 / z };
}
const popIn = (t, t0, d = 0.35) => Ease.outBack(pr(t, t0, t0 + d), 1.7);
const fadeOut = (t, t1, d = 0.3) => 1 - Ease.inCubic(pr(t, t1 - d, t1));

// a glass panel in the room; fn(w, h) draws inside it in panel px, origin at its centre
function panel(pos, w, h, p, o, fn) {
  if (p <= 0.001) return null;
  const a0 = g.globalAlpha;
  const pl = plane(pos.x, pos.y + Math.sin(NOW * 1.1 + w * 0.01) * 4, { par: pos.par, hud: pos.hud, s: (pos.s || 1) * lerp(0.72, 1, Math.min(1.08, p)) * (o.s || 1), ry: (o.ry || 0) + Math.sin(NOW * 0.8 + h * 0.01) * 0.025, rx: o.rx || 0, rz: o.rz || 0 });
  g.globalAlpha = a0 * Math.min(1, p * 1.5) * (o.alpha != null ? o.alpha : 1);
  glass(pl, 0, 0, w, h, o);
  planeXf(pl, 0, 0);
  if (o.title) { hudText(o.title, -w / 2 + 24, -h / 2 + 30, { size: o.ts || 19, color: o.tcol || C.mint }); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(-w / 2 + 22, -h / 2 + 48, w - 44, 1.5); }
  if (fn) fn(w, h, pl);
  resetXf(); g.globalAlpha = a0;
  return pl;
}

/* ---------------- patient ID (a made-up patient) ---------------- */
const PATIENT = { name: '홍길동', birth: '850505' };
function idCard(pos, p, o = {}) {
  panel(pos, 470, 168, p, { title: 'PATIENT ID · 환자 확인', accent: C.mint, ry: o.ry }, (w, h) => {
    text(PATIENT.name, -w / 2 + 36, 6, { size: 54, w: 800, align: 'left', color: C.white });
    hudText(PATIENT.birth, -w / 2 + 38, 54, { size: 26, color: hexA('#FFFFFF', 0.82) });
    qrTag(w / 2 - 70, 22, 70, { seed: 5 });
    const ck = o.check != null ? o.check : 1;
    if (ck > 0) { circle(w / 2 - 152, 26, 20 * Ease.outBack(ck, 2), C.mint); g.strokeStyle = '#06241F'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(w / 2 - 161, 26); g.lineTo(w / 2 - 154, 33); g.lineTo(w / 2 - 142, 19); g.stroke(); g.lineCap = 'butt'; }
  });
}

/* ---------------- tooth chart + history ---------------- */
function toothIcon(x, y, w, h, rot, col, stroke) {
  g.save(); g.translate(x, y); g.rotate(rot);
  rr(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.36); g.fillStyle = col; g.fill();
  if (stroke) { g.lineWidth = 2.5; g.strokeStyle = stroke; g.stroke(); }
  g.restore();
}
function toothChart(pos, p, o = {}) {
  panel(pos, 470, 290, p, { title: 'TOOTH CHART · 치아 상태', ry: o.ry }, (w, h) => {
    const hi = o.hi != null ? o.hi : 1;
    for (let arch = 0; arch < 2; arch++) {
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * (0.08 + 0.84 * i / 13), sgn = arch ? 1 : -1;
        const x = -Math.cos(a) * 178, y = 28 + sgn * (18 + Math.sin(a) * 78);
        const molar = i < 3 || i > 10, big = molar ? 30 : 22;
        const target = arch === 1 && i === 11;         // lower left first molar = #36
        const k = pr(p, 0.3 + i * 0.03, 0.6 + i * 0.03);
        if (k <= 0) continue;
        g.globalAlpha *= k;
        if (target && hi > 0) { g.shadowColor = C.amber; g.shadowBlur = 22 * hi; toothIcon(x, y, big + 8 * hi, big + 8 * hi, a - Math.PI / 2, mixHex('#F3F6F8', '#FF8A3D', hi), '#FFFFFF'); g.shadowBlur = 0; }
        else toothIcon(x, y, big, big, a - Math.PI / 2, i % 5 === 2 && arch === 0 ? '#BFD8FF' : '#F3F6F8', null);
        g.globalAlpha /= k;
      }
    }
    if (hi > 0.5) { hudText('#36', 128, 64, { size: 24, color: C.amber, alpha: pr(hi, 0.5, 1) }); }
    hudText('R', -w / 2 + 26, 28, { size: 18, color: hexA('#FFFFFF', 0.6) }); hudText('L', w / 2 - 38, 28, { size: 18, color: hexA('#FFFFFF', 0.6) });
  });
}
const HISTORY = [['03.12', '#36 RCT (1)', C.mint], ['03.26', '#36 RCT (2)', C.mint], ['04.14', '#36 RCT (3)', C.amber]];
function historyList(pos, p, o = {}) {
  panel(pos, 470, 290, p, { title: 'HISTORY · 지난 치료', ry: o.ry }, (w, h) => {
    const k = o.k != null ? o.k : 1;
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 3; line(-w / 2 + 50, -62, -w / 2 + 50, -62 + 164 * clamp(k * 1.3));
    HISTORY.forEach(([d, s, c], i) => {
      const q = pr(k, i * 0.28, i * 0.28 + 0.3);
      if (q <= 0) return;
      const y = -60 + i * 78, a = g.globalAlpha; g.globalAlpha = a * q;
      circle(-w / 2 + 50, y, 10, c);
      hudText(d, -w / 2 + 78, y, { size: 22, color: hexA('#FFFFFF', 0.7) });
      text(s, -w / 2 + 168 + (1 - q) * 30, y + 1, { size: 36, w: 800, align: 'left', color: i === 2 ? C.amber : C.white });
      if (i === 2) pill('오늘', w / 2 - 34, y, { size: 20, align: 'right', col: C.amber, color: C.amber });
      g.globalAlpha = a;
    });
  });
}

/* ---------------- next appointment: "#36 RCT (3)" on the blue disc ---------------- */
function rctLabel(pos, p, o = {}) {
  if (p <= 0.001) return;
  const a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(1, p * 2) * (o.alpha != null ? o.alpha : 1);
  const pl = plane(pos.x, pos.y + Math.sin(NOW * 1.2) * 5, { par: pos.par, s: (pos.s || 1) * (o.s || 1), ry: o.ry != null ? o.ry : -0.28, rx: 0.06, rz: -0.02 });
  const d = pproj(pl, 0, 118, 0);
  resetXf(); disc(d[0], d[1], 130 * d[2] * popIn(p, 0.25, 0.6));
  const s = '#36 RCT (3)', size = 92;
  setFont(size, 900, 0, null);
  const m = layout(s); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') continue;
    const k = Ease.outBack(pr(p, i * 0.05, i * 0.05 + 0.35), 2);
    if (k <= 0) continue;
    setFont(size, 900, 0, null); g.textAlign = 'center'; g.textBaseline = 'middle';
    extGlyph(pl, s[i], -m.w / 2 + m.xs[i] + m.ws[i] / 2, 0, size, EXT.rust, { depth: 0.14, sc: k });
  }
  resetXf(); g.globalAlpha = a0;
}

/* ---------------- implant plan ---------------- */
function implantPlan(pos, p, o = {}) {
  panel(pos, 500, 420, p, { title: 'IMPLANT PLAN · #46 식립 계획', ry: o.ry }, (w, h) => {
    const k = o.k != null ? o.k : 1, a = g.globalAlpha;
    g.save(); g.beginPath(); g.rect(-w / 2 + 16, -h / 2 + 54, w - 32, h - 70); g.clip();
    // bone + gum
    g.fillStyle = '#E9DEC3'; g.beginPath(); g.moveTo(-230, 30); g.quadraticCurveTo(0, -6, 230, 30); g.lineTo(230, 210); g.lineTo(-230, 210); g.fill();
    g.fillStyle = 'rgba(190,170,130,0.5)'; for (let i = 0; i < 26; i++) circle(-210 + rnd(i, 1) * 420, 60 + rnd(i, 2) * 130, 5 + rnd(i, 3) * 7, 'rgba(190,170,130,0.45)');
    g.fillStyle = '#F4A6A6'; g.beginPath(); g.moveTo(-230, 30); g.quadraticCurveTo(0, -6, 230, 30); g.lineTo(230, 2); g.quadraticCurveTo(0, -36, -230, 2); g.fill();
    // neighbours
    [-136, 136].forEach((x) => { g.fillStyle = '#FFFFFF'; rr(x - 52, -116, 104, 122, 34); g.fill(); g.fillStyle = '#F2EAD8'; g.beginPath(); g.moveTo(x - 40, 0); g.lineTo(x - 22, 130); g.lineTo(x - 4, 20); g.lineTo(x + 18, 130); g.lineTo(x + 40, 0); g.fill(); });
    // site ring
    g.strokeStyle = hexA(C.mint, 0.9); g.lineWidth = 3; g.setLineDash([8, 7]); g.beginPath(); g.ellipse(0, -6, 62, 18, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    // fixture coming down the axis
    const yy = lerp(-250, 20, Ease.outCubic(k));
    g.strokeStyle = hexA(C.amber, 0.95); g.lineWidth = 2.5; g.setLineDash([10, 8]); line(0, -160, 0, 190); g.setLineDash([]);
    const gi = g.createLinearGradient(-26, 0, 26, 0); gi.addColorStop(0, '#8E99A4'); gi.addColorStop(0.45, '#F2F6F9'); gi.addColorStop(1, '#7B8691');
    g.fillStyle = gi; g.beginPath(); g.moveTo(-26, yy); g.lineTo(26, yy); g.lineTo(18, yy + 128); g.quadraticCurveTo(0, yy + 142, -18, yy + 128); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(70,80,92,0.6)'; g.lineWidth = 2.5; for (let i = 1; i < 9; i++) line(-25 + i * 0.9, yy + i * 14, 25 - i * 0.9, yy + i * 14 + 5);
    g.fillStyle = '#C9D2DA'; rr(-22, yy - 30, 44, 32, 6); g.fill();
    g.restore();
    g.globalAlpha = a * pr(k, 0.5, 0.9);
    pill('Ø4.5 × 10 mm', -w / 2 + 30, h / 2 - 44, { size: 22, f: 'mono', w: 600, align: 'left', col: C.amber });
    pill('각도 3°', w / 2 - 30, h / 2 - 44, { size: 22, align: 'right', col: C.mint });
    g.globalAlpha = a;
  });
}

/* ---------------- canal lengths in the grey balloon (as in the clinic test) ---------------- */
function canalBubble(pos, p, o = {}) {
  if (p <= 0.001) return;
  const a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(1, p * 2) * (o.alpha != null ? o.alpha : 1);
  const k = Ease.outBack(clamp(p), 1.6);
  const pl = plane(pos.x, pos.y + Math.sin(NOW * 1.1) * 5, { par: pos.par, s: (pos.s || 1) * (o.s || 1) * k, ry: o.ry != null ? o.ry : 0.12, rz: 0.02 });
  bubble(pl, 0, 0, 560, 330, { tx: o.tx != null ? o.tx : -150, ty: o.ty != null ? o.ty : 300 });
  planeXf(pl, 0, 0);
  const rows = ['MB-16.5 ML-17', 'DB-17.5 DL-16'];
  rows.forEach((s, i) => { const n = Math.floor(s.length * pr(p, 0.35 + i * 0.25, 0.75 + i * 0.25) + 0.001); text(s.slice(0, n), -238, -44 + i * 82, { size: 66, w: 900, align: 'left', color: '#0E1114', ls: -1 }); });
  resetXf(); g.globalAlpha = a0;
}
// the visit memo, in the rust letters of the test
function memoText(pos, p, o = {}) {
  if (p <= 0.001) return;
  const a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(1, p * 2) * (o.alpha != null ? o.alpha : 1);
  const pl = plane(pos.x, pos.y + Math.sin(NOW * 1.3 + 2) * 5, { par: pos.par, s: (pos.s || 1) * (o.s || 1), ry: o.ry != null ? o.ry : -0.22, rx: 0.05, rz: -0.03 });
  const rows = ['씹을 때 약간', '아팠어요!!'], size = o.size || 78;
  let idx = 0;
  rows.forEach((s, ri) => {
    setFont(size, 800, 0, null); const m = layout(s);
    for (let i = 0; i < s.length; i++, idx++) {
      if (s[i] === ' ') continue;
      const k = Ease.outBack(pr(p, idx * 0.045, idx * 0.045 + 0.3), 2);
      if (k <= 0) continue;
      setFont(size, 800, 0, null); g.textAlign = 'center'; g.textBaseline = 'middle';
      extGlyph(pl, s[i], -m.w / 2 + m.xs[i] + m.ws[i] / 2, (ri - 0.5) * size * 1.16, size, EXT.rust, { depth: 0.12, sc: k });
    }
  });
  resetXf(); g.globalAlpha = a0;
}
// coral call-out arrow with a caption (the red arrows of the figure): from (x1, y1) to the caption at (x2, y2), screen px
function callout(x1, y1, x2, y2, s, p, o = {}) {       // (x1, y1): the thing; (x2, y2): where the arrow starts, the label sits behind it
  if (p <= 0.001) return;
  const col = o.col || C.coral, a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(1, p * 2.5);
  const a = Math.atan2(y1 - y2, x1 - x2), ca = Math.cos(a), sa = Math.sin(a);
  const k = popIn(p, 0, 0.35), q = Ease.outCubic(pr(p, 0.3, 0.9));
  if (q > 0) {
    const hx = lerp(x2, x1, q), hy = lerp(y2, y1, q);
    g.strokeStyle = col; g.lineWidth = 6; g.lineCap = 'round'; line(x2, y2, hx - ca * 10, hy - sa * 10); g.lineCap = 'butt';
    g.fillStyle = col; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a + 2.6) * 24, hy + Math.sin(a + 2.6) * 24); g.lineTo(hx + Math.cos(a - 2.6) * 24, hy + Math.sin(a - 2.6) * 24); g.fill();
  }
  if (k > 0) { g.save(); g.translate(x2 - ca * 16, y2 - sa * 16 - (Math.abs(ca) < 0.3 ? sa * 22 : 0)); g.scale(k, k); pill(s, 0, 0, { size: o.size || 34, w: 800, align: o.al || (ca > 0.3 ? 'right' : ca < -0.3 ? 'left' : 'center'), col, bg: 'rgba(10,22,34,0.88)', lw: 3 }); g.restore(); }
  g.globalAlpha = a0;
}

/* ---------------- small things ---------------- */
function notifChip(x, y, s, sub, p, o = {}) {       // HUD: slides in from the right
  if (p <= 0.001) return;
  const a0 = g.globalAlpha, col = o.col || C.mint;
  const k = Ease.outExpo(clamp(p)), w = o.w || 520, h = 104;
  g.globalAlpha = a0 * Math.min(1, p * 3) * (o.alpha != null ? o.alpha : 1);
  g.save(); g.translate(x + (1 - k) * 260, y);
  g.shadowColor = 'rgba(4,14,24,0.4)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
  rr(-w / 2, -h / 2, w, h, 26); g.fillStyle = 'rgba(12,32,48,0.78)'; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.lineWidth = 2; g.strokeStyle = hexA(col, 0.6); g.stroke();
  circle(-w / 2 + 52, 0, 26, hexA(col, 0.18)); circle(-w / 2 + 52, 0, 9, col);
  ring(NOW, o.t0 != null ? o.t0 : -9, -w / 2 + 52, 0, { r: 60, r0: 12, col, lw: 4, life: 1.1 });
  text(s, -w / 2 + 96, -14, { size: 32, w: 800, align: 'left', color: C.white });
  hudText(sub, -w / 2 + 96, 24, { size: 20, color: hexA('#FFFFFF', 0.66) });
  g.restore(); g.globalAlpha = a0;
}
function recordCard(x, y, w, h, rot, p, seed, col) {    // screen px; a chart page with lines
  if (p <= 0.001) return;
  const a0 = g.globalAlpha, k = Ease.outBack(clamp(p), 1.5);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k);
  g.globalAlpha = a0 * Math.min(1, p * 2) * 0.92;
  g.shadowColor = 'rgba(2,10,18,0.5)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  rr(-w / 2, -h / 2, w, h, 20); g.fillStyle = 'rgba(18,44,64,0.8)'; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.lineWidth = 2; g.strokeStyle = hexA(col, 0.7); g.stroke();
  g.fillStyle = col; rr(-w / 2 + 18, -h / 2 + 18, w * 0.42, 14, 7); g.fill();
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.3)'; rr(-w / 2 + 18, -h / 2 + 50 + i * 26, w * (0.5 + 0.36 * rnd(i, seed)), 10, 5); g.fill(); }
  toothIcon(w / 2 - 44, h / 2 - 44, 40, 44, 0, 'rgba(255,255,255,0.85)', null);
  g.restore(); g.globalAlpha = a0;
}
function burstRays(x, y, p, o = {}) {
  if (p <= 0 || p >= 1) return;
  const n = o.n || 18, a0 = g.globalAlpha, col = o.col || C.white;
  g.globalAlpha = a0 * (1 - p) * (o.alpha || 0.8);
  g.strokeStyle = col; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = i * TAU / n + (o.rot || 0), r0 = (o.r0 || 200) + Ease.outCubic(p) * (o.r || 500), len = (o.len || 120) * (1 - p * 0.5); g.lineWidth = (o.lw || 8) * (1 - p) + 1; line(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * (o.sy || 1), x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len) * (o.sy || 1)); }
  g.lineCap = 'butt'; g.globalAlpha = a0;
}

/* ---------------- education / surgery panels, floor plan, checklist ---------------- */
function skullFrame(x, y, w, h, tclip, r = 18) {        // draw one frame of the real clip (cover-fit) in the current transform
  const im = IMG.skull;
  g.save(); rr(x, y, w, h, r); g.clip();
  if (im) {
    const fw = 300, fh = im.height / 5, n = 35, f = ((Math.floor(tclip * 10) % n) + n) % n;
    const sc = Math.max(w / fw, h / fh), dw = fw * sc, dh = fh * sc;
    g.drawImage(im, (f % 7) * fw, Math.floor(f / 7) * fh, fw, fh, x + (w - dw) / 2, y + (h - dh) * 0.3, dw, dh);
  } else { g.fillStyle = '#C9C2B4'; g.fillRect(x, y, w, h); }
  g.restore();
}
function eduPanel(pos, p, o = {}) {
  return panel(pos, 400, 470, p, { title: '교육 · 얼굴 추적 해부', ry: o.ry, tcol: C.mint }, (w, h) => {
    skullFrame(-w / 2 + 20, -h / 2 + 62, w - 40, h - 82, NOW - (o.t0 || 0));
    brackets(-w / 2 + 34, -h / 2 + 76, w - 68, h - 110, { len: 30, col: C.mint, lw: 3.5, alpha: 0.9 });
    pill('실제 화면', w / 2 - 34, h / 2 - 46, { size: 20, align: 'right', col: C.mint, dot: C.coral });
  });
}
function surgPanel(pos, p, o = {}) {
  return panel(pos, 400, 470, p, { title: '수술 · 가이드', ry: o.ry, tcol: C.amber }, (w, h) => {
    const k = o.k != null ? o.k : 0, a = g.globalAlpha;
    g.save(); g.beginPath(); g.rect(-w / 2 + 20, -h / 2 + 62, w - 40, h - 82); g.clip();
    g.fillStyle = 'rgba(244,166,166,0.9)'; g.beginPath(); g.moveTo(-180, 90); g.quadraticCurveTo(0, 40, 180, 90); g.lineTo(180, 240); g.lineTo(-180, 240); g.fill();
    g.fillStyle = '#E9DEC3'; g.beginPath(); g.moveTo(-180, 126); g.quadraticCurveTo(0, 80, 180, 126); g.lineTo(180, 240); g.lineTo(-180, 240); g.fill();
    [-118, 118].forEach((x) => { g.fillStyle = '#FFFFFF'; rr(x - 48, -30, 96, 120, 30); g.fill(); });
    // target axis and the drill that swings onto it
    g.strokeStyle = hexA(C.mint, 0.95); g.lineWidth = 3; g.setLineDash([10, 8]); line(0, -150, 0, 200); g.setLineDash([]);
    const ang = lerp(0.42, 0, Ease.outBack(clamp(k), 1.3));
    g.save(); g.translate(0, 70); g.rotate(ang);
    const gd = g.createLinearGradient(-12, 0, 12, 0); gd.addColorStop(0, '#8E99A4'); gd.addColorStop(0.5, '#F2F6F9'); gd.addColorStop(1, '#7B8691');
    g.fillStyle = gd; rr(-9, -170, 18, 170, 5); g.fill(); g.fillStyle = '#5A6672'; rr(-22, -214, 44, 50, 10); g.fill();
    g.restore();
    g.strokeStyle = C.amber; g.lineWidth = 4; g.beginPath(); g.arc(0, 70, 120, -Math.PI / 2, -Math.PI / 2 + ang + 0.001); g.stroke();
    g.restore();
    const deg = Math.round(ang * 57.3 / 2);
    pill(deg === 0 ? '0° 정렬' : `${deg}°`, w / 2 - 34, -h / 2 + 96, { size: 26, f: deg === 0 ? null : 'mono', w: 800, align: 'right', col: deg === 0 ? C.mint : C.amber, color: deg === 0 ? C.mint : C.amber });
    g.globalAlpha = a * pr(k, 0.7, 1);
    pill('깊이 10.0 mm', -w / 2 + 34, h / 2 - 46, { size: 20, align: 'left', col: C.mint });
    g.globalAlpha = a;
  });
}
function floorPlan(pos, p, o = {}) {
  return panel(pos, 760, 400, p, { title: 'CLINIC FLOW · 운영', ry: o.ry, tcol: C.sky }, (w, h) => {
    const k = o.k != null ? o.k : 1, a = g.globalAlpha;
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; rr(-w / 2 + 30, -h / 2 + 66, w - 60, h - 96, 16); g.stroke();
    const nodes = [['접수', -290, 30, C.sky], ['체어 1', -110, -50, C.mint], ['체어 2', 60, -50, C.amber], ['체어 3', -110, 110, C.mint], ['체어 4', 60, 110, C.sky], ['수납', 270, 30, C.sky]];
    // flow line
    g.strokeStyle = hexA(C.sky, 0.9); g.lineWidth = 4; g.setLineDash([12, 10]); g.lineDashOffset = -NOW * 60;
    polyPartial([[-290, 30], [-200, 30], [-200, -50], [150, -50], [150, 30], [270, 30]], clamp(k * 1.2));
    polyPartial([[-200, 30], [-200, 110], [150, 110], [150, 30]], clamp(k * 1.2 - 0.2));
    g.setLineDash([]); g.lineDashOffset = 0;
    nodes.forEach(([s, x, y, c], i) => {
      const q = popIn(k, i * 0.1, 0.3);
      if (q <= 0) return;
      g.save(); g.translate(x, y); g.scale(q, q);
      rr(-62, -32, 124, 64, 16); g.fillStyle = 'rgba(8,24,38,0.92)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = hexA(c, 0.9); g.stroke();
      circle(-40, 0, 7, c); text(s, -24, 2, { size: 26, w: 800, align: 'left', color: C.white });
      g.restore();
    });
    g.globalAlpha = a;
  });
}
const STEPS = ['로그인', '환자 검색', '차트 열기', '영상 불러오기', '예약 확인'];
function checklist(pos, p, gone, o = {}) {      // gone: how many steps have been taken away (float)
  return panel(pos, 420, 430, p, { title: 'BEFORE · 진료 전 절차', ry: o.ry, tcol: C.coral, stroke: 'rgba(255,255,255,0.3)' }, (w, h) => {
    STEPS.forEach((s, i) => {
      const q = clamp(gone - i), y = -h / 2 + 100 + i * 66, a = g.globalAlpha;
      g.globalAlpha = a * (1 - Ease.inCubic(pr(q, 0.4, 1)));
      const dx = Ease.inCubic(pr(q, 0.4, 1)) * 200;
      rr(-w / 2 + 28 + dx, y - 24, w - 56, 50, 12); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
      g.lineWidth = 3; g.strokeStyle = hexA('#FFFFFF', 0.6); rr(-w / 2 + 44 + dx, y - 13, 26, 26, 6); g.stroke();
      text(s, -w / 2 + 88 + dx, y + 2, { size: 32, w: 700, align: 'left', color: hexA('#FFFFFF', 0.92) });
      if (q > 0) { g.strokeStyle = C.coral; g.lineWidth = 5; g.lineCap = 'round'; line(-w / 2 + 82 + dx, y + 2, -w / 2 + 82 + dx + (textW(s, 32, 700) + 14) * clamp(q * 2.5), y + 2); g.lineCap = 'butt'; }
      g.globalAlpha = a;
    });
  });
}

/* ---------------- the real photo from the clinic's AR test ---------------- */
function photoPanel(pos, w, p, o = {}) {
  const im = IMG.ar, h = w * 0.75 + 64;
  return panel(pos, w + 40, h + 28, p, { title: o.title || '실제 증강현실 화면', ry: o.ry, rz: o.rz, tcol: C.mint, r: 26 }, (W_, H_) => {
    const top = -H_ / 2 + 60, z = 1 + (o.kb || 0) * 0.08, ix = -w / 2 * z - (o.kb || 0) * 10, iy = top - (z - 1) * w * 0.375;
    g.save(); rr(-w / 2, top, w, w * 0.75, 14); g.clip();
    if (im) g.drawImage(im, ix, iy, w * z, w * 0.75 * z);
    else { g.fillStyle = '#C9C2B4'; g.fillRect(-w / 2, top, w, w * 0.75); }
    g.restore();
    pill('실제 화면', W_ / 2 - 30, -H_ / 2 + 30, { size: 19, align: 'right', col: C.mint, dot: C.coral });
    if (o.over) o.over((fx, fy) => [ix + fx * w * z, iy + fy * w * 0.75 * z]);      // photo fraction → panel coords
  });
}
