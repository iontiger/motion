'use strict';
/* ============================================================
   WORLD — the room seen through the glasses, as one wide panorama.
   Left and low: the desk with the chart monitor (where the eyes used to go).
   Centre: the patient in the chair. Right: the bracket tray under the window.
   Three depths: the wall (prerendered, soft), the furniture and the patient
   (drawn live), and what is close to the face (lamp, gloved hands).
   On top of everything sits the HUD that is fixed to the glasses.
   ============================================================ */
const VIEW = {
  desk: { x: -810, y: 872, zoom: 1.1 },
  patient: { x: 960, y: 540, zoom: 1 },
  face: { x: 960, y: 470, zoom: 1.5 },
  tray: { x: 2660, y: 610, zoom: 1 },
};
const WR = { x0: -2100, y0: -320, x1: 3700, y1: 1660, k: 0.5 };   // far layer rectangle, prerender scale
let FAR = null;

/* ---------------- far: wall, cabinet, painting, window ---------------- */
function buildFar() {
  const w = Math.round((WR.x1 - WR.x0) * WR.k), h = Math.round((WR.y1 - WR.y0) * WR.k);
  const raw = document.createElement('canvas'); raw.width = w; raw.height = h;
  const keep = g; g = raw.getContext('2d');
  g.scale(WR.k, WR.k); g.translate(-WR.x0, -WR.y0);
  // wall
  const gw = g.createLinearGradient(0, WR.y0, 0, WR.y1);
  gw.addColorStop(0, '#F6EFE2'); gw.addColorStop(0.6, '#EEE5D5'); gw.addColorStop(1, '#E2D8C6');
  g.fillStyle = gw; g.fillRect(WR.x0, WR.y0, WR.x1 - WR.x0, WR.y1 - WR.y0);
  // wainscot + floor
  g.fillStyle = '#E6DCCB'; g.fillRect(WR.x0, 760, WR.x1 - WR.x0, 260);
  g.fillStyle = '#D6CBB8'; g.fillRect(WR.x0, 752, WR.x1 - WR.x0, 10);
  g.fillStyle = '#CFC4B2'; g.fillRect(WR.x0, 1020, WR.x1 - WR.x0, WR.y1 - 1020);
  g.fillStyle = '#BDB19E'; g.fillRect(WR.x0, 1012, WR.x1 - WR.x0, 12);

  // --- desk zone (seen with the camera low and left): pin board, shelf
  g.fillStyle = '#C9A77C'; rr(-1240, 380, 560, 400, 14); g.fill();
  g.fillStyle = '#B8946A'; rr(-1226, 394, 532, 372, 8); g.fill();
  const notes = [[-1190, 420, 150, 120, '#FFF3B8'], [-1010, 440, 130, 150, '#FFFFFF'], [-860, 420, 140, 110, '#CFEDE4'], [-1170, 580, 170, 150, '#FFFFFF'], [-960, 620, 120, 110, '#FFD9C7'], [-820, 560, 110, 170, '#FFFFFF']];
  notes.forEach(([x, y, ww, hh, c], i) => {
    g.save(); g.translate(x + ww / 2, y + hh / 2); g.rotate((rnd(i, 3) - 0.5) * 0.12);
    g.fillStyle = c; g.fillRect(-ww / 2, -hh / 2, ww, hh);
    g.fillStyle = 'rgba(60,70,80,0.28)'; for (let k = 0; k < 4; k++) g.fillRect(-ww / 2 + 14, -hh / 2 + 22 + k * 22, ww * (0.5 + 0.35 * rnd(i, k)), 6);
    circle(0, -hh / 2 + 8, 7, ['#E8554E', '#3F8CFF', '#19B8A6'][i % 3]);
    g.restore();
  });
  // shelf with folders
  g.fillStyle = '#D9CDB8'; g.fillRect(-520, 520, 520, 14);
  ['#6FA8DC', '#F2B56B', '#7FC8A9', '#E8857A', '#B9A3E3', '#6FA8DC', '#F2D06B'].forEach((c, i) => { g.fillStyle = c; rr(-500 + i * 56, 360 + (i % 3) * 12, 44, 160 - (i % 3) * 12, 6); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-490 + i * 56, 400, 24, 46); });
  // wall clock
  circle(-300, 190, 92, '#FFFFFF'); g.lineWidth = 12; g.strokeStyle = '#5E6B78'; g.beginPath(); g.arc(-300, 190, 92, 0, TAU); g.stroke();
  g.lineCap = 'round'; g.lineWidth = 9; g.strokeStyle = '#33414E'; line(-300, 190, -300, 130); line(-300, 190, -262, 208); g.lineCap = 'butt';

  // --- centre: steel cabinet (left of the chair), framed painting
  g.fillStyle = '#B9C0C6'; rr(20, 400, 500, 640, 16); g.fill();
  g.fillStyle = '#A7AFB6'; g.fillRect(20, 400, 500, 26);
  for (let i = 0; i < 4; i++) {
    const y = 446 + i * 146;
    g.fillStyle = '#C9CFD4'; rr(44, y, 452, 128, 10); g.fill();
    g.fillStyle = '#8E979F'; rr(190, y + 22, 160, 16, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(52, y + 6, 436, 6);
  }
  // things on the cabinet
  g.fillStyle = '#7DB58A'; g.beginPath(); g.ellipse(130, 330, 62, 78, -0.2, 0, TAU); g.fill();
  g.fillStyle = '#5E9C6E'; g.beginPath(); g.ellipse(176, 316, 44, 70, 0.4, 0, TAU); g.fill();
  g.fillStyle = '#E8E0D2'; rr(96, 350, 96, 56, 10); g.fill();
  g.fillStyle = '#FFFFFF'; rr(300, 330, 150, 72, 8); g.fill(); g.fillStyle = '#9FC4E8'; g.fillRect(300, 330, 150, 18);
  // painting (a nod to the mural in the clinic photo — abstract, made up)
  g.fillStyle = '#5A4A3C'; rr(1100, 70, 500, 350, 6); g.fill();
  g.save(); g.beginPath(); g.rect(1116, 86, 468, 318); g.clip();
  g.fillStyle = '#F2E8D0'; g.fillRect(1116, 86, 468, 318);
  g.fillStyle = '#E2664A'; g.beginPath(); g.moveTo(1116, 404); g.lineTo(1116, 250); g.quadraticCurveTo(1260, 190, 1330, 404); g.fill();
  g.fillStyle = '#2F8F8A'; g.beginPath(); g.ellipse(1440, 200, 120, 150, 0.3, 0, TAU); g.fill();
  g.fillStyle = '#F2B84B'; circle(1250, 170, 58, '#F2B84B');
  g.fillStyle = '#27456B'; g.beginPath(); g.moveTo(1330, 404); g.quadraticCurveTo(1400, 250, 1584, 300); g.lineTo(1584, 404); g.fill();
  g.strokeStyle = '#1E2A36'; g.lineWidth = 7; g.beginPath(); g.moveTo(1180, 120); g.quadraticCurveTo(1300, 300, 1210, 390); g.stroke();
  g.beginPath(); g.arc(1450, 190, 46, 0.4, 3.6); g.stroke();
  g.restore();

  // --- tray zone: window with blinds, light on the sill
  g.fillStyle = '#FFFFFF'; rr(1990, 30, 1420, 660, 10); g.fill();
  const gs = g.createLinearGradient(0, 50, 0, 670); gs.addColorStop(0, '#BFE3FF'); gs.addColorStop(0.55, '#E9F6FF'); gs.addColorStop(1, '#FFF7E0');
  g.fillStyle = gs; g.fillRect(2014, 54, 1372, 612);
  // far roofs / trees through the window
  g.fillStyle = 'rgba(150,190,170,0.6)'; g.beginPath(); g.moveTo(2014, 666); g.lineTo(2014, 560); g.quadraticCurveTo(2200, 470, 2400, 560); g.quadraticCurveTo(2600, 480, 2850, 570); g.quadraticCurveTo(3100, 500, 3386, 580); g.lineTo(3386, 666); g.fill();
  g.fillStyle = '#FFFFFF'; g.fillRect(2690, 54, 20, 612);
  for (let y = 70; y < 666; y += 34) { g.fillStyle = 'rgba(255,255,255,0.78)'; g.fillRect(2014, y, 1372, 15); g.fillStyle = 'rgba(160,175,190,0.25)'; g.fillRect(2014, y + 15, 1372, 3); }
  g.fillStyle = '#F4EEE2'; g.fillRect(1970, 690, 1460, 30);
  // sun patch on the wall
  g.fillStyle = 'rgba(255,244,205,0.5)'; g.beginPath(); g.moveTo(1990, 720); g.lineTo(3410, 720); g.lineTo(3520, 1010); g.lineTo(1840, 1010); g.fill();
  // poster right of the window
  g.fillStyle = '#FFFFFF'; rr(3470, 150, 180, 250, 8); g.fill(); g.fillStyle = '#7FC8A9'; g.fillRect(3470, 150, 180, 70); g.fillStyle = 'rgba(60,70,80,0.3)'; for (let k = 0; k < 5; k++) g.fillRect(3488, 244 + k * 28, 110 + 30 * rnd(k, 9), 8);

  g = keep;
  // soften (depth of field): blur once, here
  FAR = document.createElement('canvas'); FAR.width = w; FAR.height = h;
  const fx = FAR.getContext('2d');
  fx.filter = 'blur(2.2px)'; fx.drawImage(raw, 0, 0); fx.filter = 'none';
}
function drawFar() {
  if (!FAR) buildFar();
  g.save(); layerXf(0.88);
  g.imageSmoothingQuality = 'high';
  g.drawImage(FAR, WR.x0, WR.y0, WR.x1 - WR.x0, WR.y1 - WR.y0);
  g.restore();
}

/* ---------------- mid: desk + monitor ---------------- */
const SCREEN = { x: -1262, y: 590, w: 904, h: 512 };   // the chart monitor's picture area (panorama px)
function drawDesk(t) {
  // desk top
  const gd = g.createLinearGradient(0, 1200, 0, 1660); gd.addColorStop(0, '#E9DCC6'); gd.addColorStop(1, '#D3C3A8');
  g.fillStyle = gd; g.beginPath(); g.moveTo(-2100, 1236); g.lineTo(60, 1236); g.lineTo(180, 1660); g.lineTo(-2100, 1660); g.fill();
  g.fillStyle = '#F4EBDB'; g.fillRect(-2100, 1226, 2170, 14);
  // monitor stand + shadow
  g.fillStyle = 'rgba(60,50,40,0.18)'; g.beginPath(); g.ellipse(-810, 1262, 300, 30, 0, 0, TAU); g.fill();
  g.fillStyle = '#2A313C'; rr(-860, 1110, 100, 130, 8); g.fill(); rr(-980, 1226, 340, 26, 13); g.fill();
  // bezel
  g.fillStyle = '#1B212B'; rr(SCREEN.x - 26, SCREEN.y - 26, SCREEN.w + 52, SCREEN.h + 60, 22); g.fill();
  g.fillStyle = '#3A4350'; circle(SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h + 17, 5, '#5CE0B8');
  // chart program
  g.save(); rr(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 6); g.clip();
  g.fillStyle = '#F7FAFC'; g.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  g.fillStyle = '#12706A'; g.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, 46);
  text('전자차트', SCREEN.x + 20, SCREEN.y + 24, { size: 22, w: 800, align: 'left', color: '#FFFFFF' });
  [0, 1, 2].forEach((i) => circle(SCREEN.x + SCREEN.w - 28 - i * 26, SCREEN.y + 23, 7, ['#FF6B6B', '#FFD166', '#7BE0A2'][i]));
  g.fillStyle = '#E6EEF2'; g.fillRect(SCREEN.x, SCREEN.y + 46, 150, SCREEN.h - 46);
  for (let i = 0; i < 7; i++) { g.fillStyle = i === 1 ? '#BFE5DD' : '#D4DEE4'; rr(SCREEN.x + 14, SCREEN.y + 66 + i * 58, 122, 42, 8); g.fill(); g.fillStyle = 'rgba(40,60,70,0.35)'; g.fillRect(SCREEN.x + 26, SCREEN.y + 82 + i * 58, 60 + 30 * rnd(i, 2), 8); }
  g.restore();
  // glare
  g.save(); rr(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 6); g.clip();
  const gg = g.createLinearGradient(SCREEN.x, SCREEN.y, SCREEN.x + SCREEN.w * 0.7, SCREEN.y + SCREEN.h); gg.addColorStop(0, 'rgba(255,255,255,0.10)'); gg.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = gg; g.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h); g.restore();
  // keyboard
  g.fillStyle = 'rgba(60,50,40,0.16)'; rr(-1150, 1300, 600, 110, 16); g.fill();
  g.fillStyle = '#F2F4F6'; rr(-1160, 1280, 600, 112, 14); g.fill();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) {
    if (r === 3 && c > 3 && c < 10) continue;
    g.fillStyle = '#DDE3E8'; rr(-1144 + c * 41, 1292 + r * 24, 34, 18, 4); g.fill();
  }
  g.fillStyle = '#DDE3E8'; rr(-1144 + 4 * 41, 1292 + 72, 6 * 41 - 7, 18, 4); g.fill();
}
// the hand on the mouse: mx is where along its back-and-forth it sits
function drawMouseHand(t, mx, my) {
  g.fillStyle = 'rgba(60,50,40,0.18)'; g.beginPath(); g.ellipse(mx + 6, my + 34, 60, 18, 0, 0, TAU); g.fill();
  g.fillStyle = '#F6F7F9'; g.beginPath(); g.ellipse(mx, my, 44, 62, 0.08, 0, TAU); g.fill();
  g.strokeStyle = '#CBD3DA'; g.lineWidth = 3; line(mx - 2, my - 60, mx + 2, my - 14);
  // sleeve + hand
  g.fillStyle = '#1E2F52'; g.beginPath(); g.moveTo(mx + 30, my + 110); g.lineTo(mx + 190, my + 520); g.lineTo(mx - 150, my + 520); g.lineTo(mx - 62, my + 96); g.fill();
  g.fillStyle = '#F1C6A4'; g.beginPath(); g.ellipse(mx - 6, my + 52, 62, 70, 0.1, 0, TAU); g.fill();
  [[-40, -8, 17, 46, -0.12], [-12, -26, 17, 54, -0.02], [18, -22, 17, 52, 0.08], [46, 2, 16, 42, 0.2]].forEach(([dx, dy, rw, rh, a]) => { g.save(); g.translate(mx + dx, my + dy); g.rotate(a); g.fillStyle = '#F1C6A4'; rr(-rw, -rh, rw * 2, rh * 2, rw); g.fill(); g.restore(); });
}

/* ---------------- mid: patient in the chair ---------------- */
const PT = { x: 960, y: 440 };     // centre of the patient's face
function drawChair() {
  // base arm
  g.fillStyle = '#C9CED4'; rr(600, 1000, 720, 200, 40); g.fill();
  // back
  const gb = g.createLinearGradient(640, 0, 1300, 0); gb.addColorStop(0, '#6F93BC'); gb.addColorStop(0.5, '#8BADD2'); gb.addColorStop(1, '#6A8DB5');
  g.fillStyle = gb; g.beginPath(); g.moveTo(610, 1180); g.lineTo(690, 650); g.quadraticCurveTo(708, 560, 800, 552); g.lineTo(1120, 552); g.quadraticCurveTo(1212, 560, 1230, 650); g.lineTo(1310, 1180); g.closePath(); g.fill();
  // head rest
  g.fillStyle = '#5E82AC'; rr(790, 318, 340, 250, 84); g.fill();
  g.fillStyle = '#7397C0'; rr(806, 330, 308, 222, 74); g.fill();
}
function drawPatient(t, o = {}) {
  const x = PT.x, y = PT.y, gaze = o.gaze || [0, 0], blink = o.blink || 0, talk = o.talk || 0, smile = o.smile != null ? o.smile : 0.5;
  // neck
  g.fillStyle = '#E3B08C'; rr(x - 52, y + 96, 104, 110, 34); g.fill();
  // shoulders (shirt)
  g.fillStyle = '#F5F2EC'; g.beginPath(); g.moveTo(x - 260, 1180); g.quadraticCurveTo(x - 250, y + 190, x - 70, y + 170); g.lineTo(x + 70, y + 170); g.quadraticCurveTo(x + 250, y + 190, x + 260, 1180); g.fill();
  // bib / drape, mint green like the surgical cloth in the photos
  const gm = g.createLinearGradient(0, y + 150, 0, 1180); gm.addColorStop(0, '#62C7A8'); gm.addColorStop(1, '#3FA487');
  g.fillStyle = gm; g.beginPath(); g.moveTo(x - 96, y + 168); g.quadraticCurveTo(x, y + 236, x + 96, y + 168); g.quadraticCurveTo(x + 300, y + 230, x + 470, 1180); g.lineTo(x - 470, 1180); g.quadraticCurveTo(x - 300, y + 230, x - 96, y + 168); g.fill();
  g.strokeStyle = 'rgba(30,110,90,0.35)'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - 150, y + 330); g.quadraticCurveTo(x - 190, y + 480, x - 260, y + 640); g.moveTo(x + 40, y + 300); g.quadraticCurveTo(x + 30, y + 460, x + 60, y + 640); g.moveTo(x + 200, y + 340); g.quadraticCurveTo(x + 260, y + 470, x + 330, y + 620); g.stroke();
  // bib chain
  g.fillStyle = '#D8DEE3'; for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.16 + 0.68 * i / 12); circle(x + Math.cos(a) * 118, y + 118 + Math.sin(a) * 86, 5, '#D8DEE3'); }
  g.lineCap = 'butt';
  // hair behind
  g.fillStyle = '#2E2622'; g.beginPath(); g.ellipse(x, y - 8, 132, 146, 0, 0, TAU); g.fill();
  // ears
  g.fillStyle = '#EDBB97'; g.beginPath(); g.ellipse(x - 112, y + 12, 18, 28, 0, 0, TAU); g.ellipse(x + 112, y + 12, 18, 28, 0, 0, TAU); g.fill();
  // face
  const gf = g.createLinearGradient(x - 110, 0, x + 110, 0); gf.addColorStop(0, '#F3C7A4'); gf.addColorStop(0.5, '#F8D6B8'); gf.addColorStop(1, '#EFC09C');
  g.fillStyle = gf; g.beginPath(); g.ellipse(x, y + 4, 110, 128, 0, 0, TAU); g.fill();
  // fringe
  g.fillStyle = '#2E2622'; g.beginPath(); g.moveTo(x - 116, y - 20); g.quadraticCurveTo(x - 112, y - 128, x, y - 132); g.quadraticCurveTo(x + 112, y - 128, x + 116, y - 20); g.quadraticCurveTo(x + 86, y - 78, x + 26, y - 84); g.quadraticCurveTo(x - 40, y - 86, x - 76, y - 58); g.quadraticCurveTo(x - 104, y - 44, x - 116, y - 20); g.fill();
  // cheeks
  g.fillStyle = 'rgba(240,140,130,0.22)'; g.beginPath(); g.ellipse(x - 62, y + 44, 26, 16, 0, 0, TAU); g.ellipse(x + 62, y + 44, 26, 16, 0, 0, TAU); g.fill();
  // brows
  g.strokeStyle = '#3A2F2A'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - 64, y - 30); g.quadraticCurveTo(x - 44, y - 40, x - 24, y - 32); g.moveTo(x + 24, y - 32); g.quadraticCurveTo(x + 44, y - 40, x + 64, y - 30); g.stroke();
  // eyes
  const ey = y - 4, open = 1 - blink;
  [-1, 1].forEach((sx) => {
    const exx = x + sx * 44;
    if (open < 0.2) { g.strokeStyle = '#2B2422'; g.lineWidth = 5; g.beginPath(); g.moveTo(exx - 14, ey); g.quadraticCurveTo(exx, ey + 5, exx + 14, ey); g.stroke(); return; }
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(exx, ey, 17, 13 * open, 0, 0, TAU); g.fill();
    g.fillStyle = '#2B2422'; g.beginPath(); g.ellipse(exx + gaze[0] * 5, ey + gaze[1] * 3, 9.5, 10.5 * open, 0, 0, TAU); g.fill();
    circle(exx + gaze[0] * 5 + 3, ey + gaze[1] * 3 - 3, 3, '#FFFFFF');
  });
  // nose
  g.strokeStyle = 'rgba(190,130,100,0.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 4, y + 16); g.quadraticCurveTo(x - 12, y + 38, x + 6, y + 40); g.stroke();
  // mouth
  if (talk > 0.05) { g.fillStyle = '#8E3B3B'; g.beginPath(); g.ellipse(x, y + 74, 20 + 6 * smile, 6 + 13 * talk, 0, 0, TAU); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x, y + 70 - 4 * talk, 15, 3.5, 0, 0, TAU); g.fill(); }
  else { g.strokeStyle = '#B5524E'; g.lineWidth = 5; g.beginPath(); g.moveTo(x - 24, y + 70); g.quadraticCurveTo(x, y + 70 + 18 * smile, x + 24, y + 70); g.stroke(); }
  g.lineCap = 'butt';
}

/* ---------------- mid: bracket tray under the window ---------------- */
const TRAY = { clip: [2610, 960], tooth: [2330, 700], box: [2700, 650] };
function drawTray() {
  // unit arm
  g.fillStyle = '#E6E0D2'; g.beginPath(); g.moveTo(1900, 1080); g.quadraticCurveTo(2000, 760, 2300, 800); g.lineTo(2300, 860); g.quadraticCurveTo(2060, 840, 1990, 1100); g.fill();
  // table top
  g.fillStyle = 'rgba(70,60,40,0.18)'; g.beginPath(); g.ellipse(2760, 1150, 720, 60, 0, 0, TAU); g.fill();
  const gt = g.createLinearGradient(0, 780, 0, 1130); gt.addColorStop(0, '#F4EEDD'); gt.addColorStop(1, '#E4DBC4');
  g.fillStyle = gt; g.beginPath(); g.moveTo(2140, 800); g.lineTo(3330, 780); g.quadraticCurveTo(3400, 780, 3420, 840); g.lineTo(3520, 1100); g.quadraticCurveTo(3530, 1140, 3480, 1140); g.lineTo(2040, 1140); g.quadraticCurveTo(1990, 1136, 2010, 1090); g.lineTo(2090, 840); g.quadraticCurveTo(2100, 802, 2140, 800); g.fill();
  g.fillStyle = '#D3C9B0'; rr(2010, 1128, 1510, 26, 12); g.fill();
  // apex locator / motor box (as on the real tray)
  g.fillStyle = 'rgba(70,60,40,0.16)'; rr(2560, 786, 380, 30, 12); g.fill();
  g.fillStyle = '#F1ECDD'; rr(2540, 560, 400, 240, 24); g.fill();
  g.fillStyle = '#DDD6C3'; rr(2540, 760, 400, 40, 18); g.fill();
  g.fillStyle = '#BFC6CC'; rr(2600, 610, 200, 130, 10); g.fill(); g.fillStyle = '#E8EEF2'; rr(2612, 622, 176, 106, 6); g.fill();
  g.fillStyle = '#C9CED4'; rr(2830, 640, 80, 70, 10); g.fill(); g.fillStyle = '#F4F6F8'; rr(2846, 654, 30, 42, 6); g.fill();
  // green cloth
  g.fillStyle = '#3FA487'; g.beginPath(); g.moveTo(2150, 900); g.lineTo(2520, 880); g.lineTo(2600, 1050); g.lineTo(2130, 1090); g.closePath(); g.fill();
  g.fillStyle = '#56BE9F'; g.beginPath(); g.moveTo(2150, 900); g.lineTo(2520, 880); g.lineTo(2540, 930); g.lineTo(2146, 952); g.closePath(); g.fill();
  // steel cups
  [[2280, 800], [2440, 790]].forEach(([cx_, cy_]) => { const gc = g.createLinearGradient(cx_ - 60, 0, cx_ + 60, 0); gc.addColorStop(0, '#9AA3AB'); gc.addColorStop(0.4, '#EDF1F4'); gc.addColorStop(1, '#8D969E'); g.fillStyle = gc; rr(cx_ - 60, cy_ - 60, 120, 100, 14); g.fill(); g.fillStyle = '#C9D0D6'; g.beginPath(); g.ellipse(cx_, cy_ - 60, 60, 16, 0, 0, TAU); g.fill(); });
  // instruments: explorer pen, mirror
  g.save(); g.translate(3040, 960); g.rotate(-0.22);
  g.fillStyle = '#F7F7F4'; rr(-230, -14, 420, 28, 14); g.fill(); g.fillStyle = '#2F3B48'; rr(-110, -15, 150, 30, 6); g.fill(); g.fillStyle = '#19B8A6'; rr(120, -14, 60, 28, 6); g.fill();
  g.restore();
  g.save(); g.translate(3180, 880); g.rotate(0.5);
  g.fillStyle = '#C3CAD0'; rr(-200, -7, 330, 14, 7); g.fill(); circle(150, 0, 34, '#AEB7BF'); circle(150, 0, 26, '#EAF2F8');
  g.restore();
  // pebble (the dark stone on the real tray)
  g.fillStyle = '#3B3A40'; g.beginPath(); g.ellipse(3290, 1010, 70, 34, -0.1, 0, TAU); g.fill();
  // blue clip + patient card with the code
  const [cx_, cy_] = TRAY.clip;
  g.save(); g.translate(cx_, cy_); g.rotate(-0.1);
  g.fillStyle = 'rgba(40,40,60,0.2)'; rr(-150, 30, 330, 30, 10); g.fill();
  g.fillStyle = '#FFFFFF'; rr(-20, -52, 210, 104, 6); g.fill();
  g.fillStyle = '#E9EDF0'; rr(-14, -44, 210, 104, 6); g.fill(); g.fillStyle = '#FFFFFF'; rr(-20, -52, 210, 104, 6); g.fill();
  g.fillStyle = '#2B49B8'; g.beginPath(); g.moveTo(-160, -40); g.lineTo(-30, -58); g.lineTo(-10, 40); g.lineTo(-150, 62); g.closePath(); g.fill();
  g.fillStyle = '#3F62DA'; g.beginPath(); g.moveTo(-160, -40); g.lineTo(-30, -58); g.lineTo(-26, -34); g.lineTo(-156, -16); g.closePath(); g.fill();
  qrTag(120, 0, 70, { seed: 5 });
  g.restore();
}

/* ---------------- near: lamp, gloved hands ---------------- */
function drawLamp(t) {
  g.save(); layerXf(1.16);
  g.lineCap = 'round';
  g.strokeStyle = '#DAD3C4'; g.lineWidth = 38; g.beginPath(); g.moveTo(2020, -330); g.quadraticCurveTo(1830, -160, 1640, 40); g.stroke();
  g.strokeStyle = '#EEE8DA'; g.lineWidth = 16; g.beginPath(); g.moveTo(2016, -338); g.quadraticCurveTo(1826, -168, 1636, 32); g.stroke();
  g.lineCap = 'butt';
  g.translate(1600, 96); g.rotate(-0.5);
  g.fillStyle = '#E9E3D4'; rr(-190, -78, 380, 156, 60); g.fill();
  g.fillStyle = '#CFC8B8'; rr(-190, 30, 380, 48, 24); g.fill();
  const gl = g.createRadialGradient(0, 40, 4, 0, 40, 150); gl.addColorStop(0, 'rgba(255,250,225,1)'); gl.addColorStop(0.5, 'rgba(255,238,170,0.9)'); gl.addColorStop(1, 'rgba(255,225,130,0.0)');
  g.fillStyle = '#FFF6D6'; rr(-150, 22, 300, 44, 22); g.fill();
  g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.beginPath(); g.ellipse(0, 56, 260, 130, 0, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
  g.restore();
}
// first-person gloved hands rising from the bottom edge; amt 0..1, tool: 'mirror' | 'probe' | 'open'
function drawHands(t, amt, o = {}) {
  if (amt <= 0.001) return;
  const glove = '#9ED8F2', gloveD = '#6FB6D8', bob = Math.sin(t * 2.1) * 6;
  const hand = (sx, tool, ph) => {
    g.save();
    g.translate(CX + sx * (430 + (o.spread || 0)), H + 330 - amt * 372 + bob * sx + Math.sin(t * 1.3 + ph) * 8);
    g.scale(sx, 1); g.rotate(-0.32 + Math.sin(t * 1.7 + ph) * 0.03 + (o.rot || 0));
    // tool first (behind the fingers)
    if (tool === 'mirror') {
      g.strokeStyle = '#C9D1D8'; g.lineWidth = 15; g.lineCap = 'round'; line(-28, 40, -150, -330); g.lineCap = 'butt';
      g.save(); g.translate(-160, -356); g.rotate(-0.5); g.fillStyle = '#AEB8C1'; g.beginPath(); g.ellipse(0, 0, 50, 42, 0, 0, TAU); g.fill();
      const gm = g.createLinearGradient(-30, -30, 30, 30); gm.addColorStop(0, '#F4FBFF'); gm.addColorStop(1, '#BFD8E8'); g.fillStyle = gm; g.beginPath(); g.ellipse(0, 0, 40, 33, 0, 0, TAU); g.fill(); g.restore();
    } else if (tool === 'probe') {
      g.strokeStyle = '#D5DBE0'; g.lineWidth = 17; g.lineCap = 'round'; line(-24, 60, -128, -250); g.lineWidth = 5; g.strokeStyle = '#AEB8C1'; g.beginPath(); g.moveTo(-128, -250); g.lineTo(-146, -330); g.quadraticCurveTo(-150, -352, -172, -350); g.stroke(); g.lineCap = 'butt';
    }
    // forearm (scrub sleeve) + palm
    g.fillStyle = '#1E2F52'; g.beginPath(); g.moveTo(-86, 330); g.lineTo(150, 330); g.lineTo(132, 620); g.lineTo(-150, 620); g.closePath(); g.fill();
    g.fillStyle = glove; g.beginPath(); g.moveTo(-96, 120); g.quadraticCurveTo(-110, 10, -40, -10); g.lineTo(96, 0); g.quadraticCurveTo(156, 30, 150, 150); g.lineTo(156, 350); g.lineTo(-92, 350); g.closePath(); g.fill();
    g.fillStyle = gloveD; rr(-96, 318, 256, 40, 16); g.fill();
    // fingers
    const fingers = tool === 'open'
      ? [[-64, -90, 23, 78, -0.28], [-14, -112, 24, 92, -0.1], [40, -110, 24, 90, 0.06], [92, -78, 22, 74, 0.24]]
      : [[-58, -44, 24, 62, -0.5], [-8, -66, 25, 70, -0.42], [46, -50, 25, 60, -0.3], [92, -24, 23, 52, -0.18]];
    fingers.forEach(([dx, dy, rw, rh, a]) => { g.save(); g.translate(dx, dy); g.rotate(a); g.fillStyle = glove; rr(-rw, -rh, rw * 2, rh * 2, rw); g.fill(); g.fillStyle = 'rgba(255,255,255,0.28)'; rr(-rw + 6, -rh + 8, 9, rh * 1.2, 5); g.fill(); g.restore(); });
    // thumb
    g.save(); g.translate(-112, 60); g.rotate(tool === 'open' ? -1.0 : -0.2); g.fillStyle = glove; rr(-24, -70, 48, 120, 24); g.fill(); g.restore();
    g.restore();
  };
  const a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(1, amt * 2);
  hand(-1, o.left || 'mirror', 0);
  hand(1, o.right || 'probe', 1.7);
  g.globalAlpha = a0;
}

/* ---------------- the room, back to front ---------------- */
function drawWorld(t, st) {
  g.fillStyle = '#EDE4D4'; g.fillRect(0, 0, W, H);
  drawFar();
  g.save(); layerXf(1);
  const vx0 = CAM.x - 1300 / CAM.zoom, vx1 = CAM.x + 1300 / CAM.zoom;
  if (vx0 < 300) { drawDesk(t); }
  if (vx1 > 300 && vx0 < 1700) { drawChair(); drawPatient(t, st.patient); }
  if (vx1 > 1800) drawTray();
  g.restore();
  if (st.screenFn && vx0 < 300) st.screenFn();
  if (vx0 < 300 && st.mouse) { g.save(); layerXf(1.04); drawMouseHand(t, st.mouse[0], st.mouse[1]); g.restore(); }
  if (CAM.x > 200 && CAM.x < 2600) drawLamp(t);
}
// the lenses: tint (how much the room is dimmed for the overlay), then vignette
function drawTint(dim, col = '#06141F') {
  if (dim > 0.001) { g.fillStyle = hexA(col, dim); g.fillRect(0, 0, W, H); }
}
let VIG = null;
function drawVignette(k = 1) {
  if (!VIG) {
    VIG = document.createElement('canvas'); VIG.width = W / 4; VIG.height = H / 4;
    const x = VIG.getContext('2d');
    const gr = x.createRadialGradient(W / 8, H / 8, H / 8 * 0.9, W / 8, H / 8, W / 8 * 1.18);
    gr.addColorStop(0, 'rgba(3,12,20,0)'); gr.addColorStop(0.7, 'rgba(3,12,20,0.28)'); gr.addColorStop(1, 'rgba(3,12,20,0.78)');
    x.fillStyle = gr; x.fillRect(0, 0, W / 4, H / 4);
  }
  const a0 = g.globalAlpha; g.globalAlpha = a0 * k; g.drawImage(VIG, 0, 0, W, H); g.globalAlpha = a0;
}

/* ---------------- HUD: fixed to the glasses ---------------- */
// on: 0..1 (boot). label: bottom-left read-out. clock: 'HH:MM'
function drawHUD(t, on, o = {}) {
  if (on <= 0.001) return;
  const a0 = g.globalAlpha, col = o.col || C.mint;
  const fl = on < 1 ? (Math.sin(t * 90) > -0.2 ? 1 : 0.35) : 1;       // boot flicker
  g.globalAlpha = a0 * on * fl * (o.alpha != null ? o.alpha : 1);
  // lens frame
  const m = 44, k = Ease.outCubic(on);
  brackets(m + (1 - k) * 200, m + (1 - k) * 110, W - 2 * m - (1 - k) * 400, H - 2 * m - (1 - k) * 220, { len: 54, col, lw: 4, alpha: 0.9 });
  g.strokeStyle = hexA(col, 0.22); g.lineWidth = 1.5;
  rr(m, m, W - 2 * m, H - 2 * m, 30); g.stroke();
  // top-left: recording dot + device name
  const blink = Math.sin(t * Math.PI * 2 * (BPM / 60) / 2) > 0 ? 1 : 0.25;
  circle(m + 40, m + 40, 8, hexA('#FF5A6E', blink));
  hudText('AI GLASSES', m + 60, m + 41, { size: 21, color: col });
  hudText(o.mode || 'DENTAL · LIVE', m + 208, m + 41, { size: 21, color: hexA('#FFFFFF', 0.72) });
  // top-right: clock + battery
  hudText(o.clock || '09:00', W - m - 150, m + 41, { size: 23, color: '#FFFFFF', align: 'right' });
  g.strokeStyle = hexA('#FFFFFF', 0.8); g.lineWidth = 2; rr(W - m - 132, m + 30, 44, 21, 5); g.stroke(); g.fillStyle = hexA('#FFFFFF', 0.8); g.fillRect(W - m - 86, m + 36, 4, 9);
  g.fillStyle = col; rr(W - m - 128, m + 34, 36 * (o.batt != null ? o.batt : 0.86), 13, 3); g.fill();
  hudText('EMR', W - m - 40, m + 41, { size: 19, color: hexA(col, 0.9), align: 'right' });
  // bottom-left: section read-out
  if (o.label) {
    g.fillStyle = col; g.fillRect(m + 34, H - m - 52, 4, 26);
    hudText(o.label, m + 50, H - m - 38, { size: 22, color: '#FFFFFF' });
    if (o.sub) hudText(o.sub, m + 50 + textW(o.label, 22, 400, 0.5, 'orb') + 22, H - m - 38, { size: 20, color: hexA(col, 0.85) });
  }
  // bottom-right: listening meter
  meter(W - m - 190, H - m - 39, 14, 150, 30, o.level != null ? o.level : 0.4, hexA(col, 0.9));
  // horizon ticks left / right (move with head roll)
  g.save(); g.translate(CX, CY); g.rotate(-CAM.roll * 3);
  g.strokeStyle = hexA(col, 0.4); g.lineWidth = 2;
  for (let i = -2; i <= 2; i++) { const yy = i * 34; line(-CX + m + 12, yy, -CX + m + (i === 0 ? 44 : 28), yy); line(CX - m - 12, yy, CX - m - (i === 0 ? 44 : 28), yy); }
  g.restore();
  g.globalAlpha = a0;
}
