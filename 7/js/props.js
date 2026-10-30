/* ============================================================
   PROPS — set pieces tied to particular lyric lines:
   pixel "AI", six speaker cards, the stacked records, the B1
   sign, the rising sun, credit medals, the golden ticket and
   the K·A·D·A logo
   ============================================================ */
import * as THREE from 'three';
import { glyphGeo, STYLE } from './glyphs.js';
import { clamp, lerp, pr, rnd, Ease, beatPulse, mulberry32, TAU, tOfBeat } from './util.js';
import { SANS, DISCO } from './hud.js';

const SPEAKERS = [
  ['황진섭', '변호사', '법무법인 대련'], ['김상완', '원장', '삼아이치과'], ['김경수', '원장', '김경수치과'],
  ['류성훈', '원장', '밸런스치과'], ['옥용주', '원장', '내이처럼치과'], ['이정우', '병원장', '시카고치과병원'],
];
const KADA = [['K', '#3478B8'], ['A', '#E0558C'], ['D', '#F2B83C'], ['A', '#34AE90']];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const flat = (map, extra = {}) => new THREE.MeshBasicMaterial({ map, color: '#e4e4e4', transparent: true, toneMapped: false, fog: false, side: THREE.DoubleSide, ...extra });
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
const timesOf = (L) => L.glyphs.map((g) => g.t);
const glyphAt = (L, word, ch) => L.glyphs.find((g) => g.word === word && (!ch || g.ch === ch));

/* ---------------- speaker cards ---------------- */
function cardTexture(img, i) {
  const [name, role, org] = SPEAKERS[i];
  return canvasTex(400, 520, (g, w, h) => {
    g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 34); g.fillStyle = '#FFFFFF'; g.fill();
    g.save(); g.beginPath(); g.roundRect(18, 18, w - 36, 360, 24); g.clip();
    g.fillStyle = '#DCE8F7'; g.fillRect(18, 18, w - 36, 360);
    const s = Math.max((w - 36) / (img.width - 8), 360 / (img.height - 6));
    g.drawImage(img, 4, 6, img.width - 8, img.height - 6, w / 2 - ((img.width - 8) * s) / 2, 18, (img.width - 8) * s, (img.height - 6) * s);
    g.restore();
    g.beginPath(); g.roundRect(34, 34, 142, 40, 20); g.fillStyle = ['#3478B8', '#E0558C', '#F2B83C', '#34AE90', '#9B5CFF', '#FF3D9A'][i]; g.fill();
    g.fillStyle = '#fff'; g.font = `800 21px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`SESSION 0${i + 1}`, 105, 55);
    g.fillStyle = '#1A0B2E'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `900 44px ${SANS}`; g.fillText(name, 34, 438);
    const nw = g.measureText(name).width;
    g.font = `700 28px ${SANS}`; g.fillStyle = '#5A4A75'; g.fillText(role, 34 + nw + 12, 438);
    g.font = `600 25px ${SANS}`; g.fillStyle = '#7A6B95'; g.fillText(org, 34, 482);
  });
}
async function speakerCards(L) {
  const imgs = await Promise.all(SPEAKERS.map((_, i) => loadImg(`img/speaker${i + 1}.jpg`)));
  const geo = new THREE.PlaneGeometry(1.3, 1.69);
  const cards = imgs.map((img, i) => { const m = new THREE.Mesh(geo, flat(cardTexture(img, i))); L.group.add(m); return m; });
  const ts = timesOf(L).slice(0, 6), meet = glyphAt(L, '모여', '모').t;
  const top = L.frame.h + 1.05;
  L.frame.w = Math.max(L.frame.w, 9.4); L.frame.h = top + 0.95; L.frame.cy = L.frame.h / 2 - 0.1;
  return {
    update(t) {
      const k = beatPulse(t, 6);
      cards.forEach((c, i) => {
        const p = pr(t, ts[i] - 0.05, ts[i] + 0.4);
        c.visible = p > 0;
        if (!p) return;
        const sq = Ease.inOutCubic(pr(t, meet - 0.1, meet + 0.35));
        const gap = lerp(1.5, 1.36, sq), x = (i - 2.5) * gap;
        const e = Ease.outBack(p, 1.8);
        c.position.set(lerp(x * 2.2, x, e), lerp(-2.5, top, e) + 0.05 * k * (i % 2 ? 1 : -1), lerp(3.5, -0.2, e));
        c.rotation.set(0, (1 - e) * -2.4 + sq * TAU * (t < meet + 0.35 ? 1 : 0) + Math.sin(t * 2 + i) * 0.06, (1 - e) * (i - 2.5) * 0.3);
      });
    },
  };
}

/* ---------------- six records stacked up (한 치과씩 쌓아 온 여섯 가지 이야기) ---------------- */
function recordTexture(i) {
  const col = ['#3478B8', '#E0558C', '#F2B83C', '#34AE90', '#9B5CFF', '#FF3D9A'][i];
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#0B0910'; g.beginPath(); g.arc(256, 256, 256, 0, TAU); g.fill();
    for (let r = 120; r < 250; r += 5) { g.strokeStyle = r % 15 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'; g.lineWidth = 1.5; g.beginPath(); g.arc(256, 256, r, 0, TAU); g.stroke(); }
    const sh = g.createLinearGradient(0, 0, 512, 512); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.65, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(256, 256, 250, 0, TAU); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(256, 256, 104, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 22px ${SANS}`; g.fillText('SESSION', 256, 206);
    g.font = `900 64px ${SANS}`; g.fillText(`0${i + 1}`, 256, 254);
    g.font = `800 26px ${SANS}`; g.fillText(SPEAKERS[i][0], 256, 306);
    g.fillStyle = '#0B0910'; g.beginPath(); g.arc(256, 256, 9, 0, TAU); g.fill();
  });
}
function recordStack(L) {
  const geo = new THREE.CylinderGeometry(0.95, 0.95, 0.07, 56);
  const side = new THREE.MeshLambertMaterial({ color: '#111' });
  const start = L.glyphs.findIndex((g) => g.word === '치과씩' && g.ch === '씩');
  const ts = timesOf(L).slice(start, start + 6);
  const x0 = L.frame.w / 2 + 1.5;
  const recs = ts.map((_, i) => {
    const top = new THREE.MeshPhongMaterial({ map: recordTexture(i), shininess: 80, specular: '#555555' });
    const m = new THREE.Mesh(geo, [side, top, top]); L.group.add(m); return m;
  });
  L.frame.w += 4.6; L.frame.cx = 1.6; L.frame.h = Math.max(L.frame.h, 2.0);
  L.shot = { pitch: 24 };
  const rng = mulberry32(3), jitter = recs.map(() => [(rng() - 0.5) * 0.35, (rng() - 0.5) * 0.35, rng() * TAU]);
  return {
    update(t) {
      recs.forEach((r, i) => {
        const p = pr(t, ts[i] - 0.12, ts[i] + 0.28);
        r.visible = p > 0;
        if (!p) return;
        const [jx, jz, a] = jitter[i];
        r.position.set(x0 + jx, 0.05 + i * 0.09 + (1 - Ease.outBounce(p)) * 4, jz);
        r.rotation.set(0.05 * Math.sin(a), a + t * 0.6 + (1 - p) * 3, 0.05 * Math.cos(a));
      });
    },
  };
}

/* ---------------- pixel "AI" (AI 이전) vs chrome "AI" (AI 이후) ---------------- */
function voxelWord(L, font) {
  const gs = L.glyphs.filter((g) => g.word === 'AI').slice(0, 2);
  if (gs.length < 2) return null;
  const cell = 0.072, cubes = [];
  for (const g of gs) {
    g.hide = true;
    const shapes = font.shapes(g.ch, 1), adv = font.advance(g.ch);
    const polys = shapes.map((s) => ({ outer: s.extractPoints(4).shape, holes: s.extractPoints(4).holes }));
    const inside = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
    for (let y = -0.1; y < 1.0; y += cell) for (let x = 0; x < adv; x += cell) {
      const cx = x + cell / 2, cy = y + cell / 2;
      if (polys.some((p) => inside(cx, cy, p.outer) && !p.holes.some((h) => inside(cx, cy, h)))) cubes.push({ g, x: g.hx - adv / 2 + cx, y: g.hy + cy });
    }
  }
  const N = cubes.length, rng = mulberry32(17);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(cell * 0.92, cell * 0.92, 0.3), new THREE.MeshPhongMaterial({ shininess: 60, emissive: '#ffffff', emissiveIntensity: 0.12 }), N);
  const pal = ['#FFE14D', '#3BE8FF', '#FF3D9A', '#5BFFC6', '#FFFFFF'].map((c) => new THREE.Color(c));
  cubes.forEach((c, i) => { c.d = [(rng() - 0.5) * 9, (rng() - 0.2) * 6, 2 + rng() * 6]; c.r = rng(); mesh.setColorAt(i, pal[Math.floor(rng() * pal.length)]); });
  mesh.frustumCulled = false;
  L.group.add(mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0);
  return {
    update(t) {
      cubes.forEach((c, i) => {
        const p = pr(t, c.g.t - 0.12 + c.r * 0.12, c.g.t + 0.3 + c.r * 0.12);
        if (p <= 0) { m4.compose(v.set(0, -50, 0), q.identity(), zero); mesh.setMatrixAt(i, m4); return; }
        const u = 1 - Ease.outCubic(p);
        v.set(c.x + c.d[0] * u, c.y + c.d[1] * u, c.d[2] * u);
        e.set(u * 6 * c.r, u * 5, 0); q.setFromEuler(e);
        m4.compose(v, q, one); mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/* ---------------- B1 elevator sign ---------------- */
function b1Sign(L) {
  const g0 = glyphAt(L, '지하', '지');
  const tex = canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#0A0710'; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill();
    g.strokeStyle = '#3a3346'; g.lineWidth = 10; g.stroke();
    g.fillStyle = '#FF3B3B'; g.shadowColor = '#FF3B3B'; g.shadowBlur = 30;
    g.font = `900 210px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('B1', 300, 200);
    g.beginPath(); g.moveTo(60, 150); g.lineTo(140, 150); g.lineTo(100, 230); g.closePath(); g.fill();
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), flat(tex));
  const x = L.frame.w / 2 + 1.5;
  L.group.add(m);
  L.frame.w += 3.4; L.frame.cx = 1.6;
  return {
    update(t) {
      const p = pr(t, g0.t - 0.05, g0.t + 0.4);
      m.visible = p > 0;
      m.position.set(x, 1.0 + (1 - Ease.outBack(p, 2)) * 2.4, 0);
      m.rotation.set(0, (1 - p) * 2, 0);
      m.material.opacity = 0.75 + 0.25 * beatPulse(t, 5, 0.5);
    },
  };
}

/* ---------------- retro sun rising behind 일요일 아침부터 오후까지 ---------------- */
const SUN_FS = `varying vec2 vUv; uniform float uT;
void main(){ vec2 p = vUv - 0.5; float r = length(p); if (r > 0.5) discard;
  vec3 top = vec3(1.0, 0.86, 0.3), bot = vec3(1.0, 0.24, 0.6); vec3 col = mix(bot, top, smoothstep(-0.5, 0.5, p.y));
  float y = 0.5 - vUv.y; float band = step(0.0, sin((y * 22.0 + uT * 2.0) * 3.14159)) * step(0.06, -p.y) ;
  if (band > 0.5 && p.y < -0.05) discard;
  gl_FragColor = vec4(col * 1.6, 1.0); }`;
function sun(L) {
  const a = glyphAt(L, '아침부터', '아').t, b = glyphAt(L, '함께해요', '해').t;
  const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: SUN_FS, uniforms: { uT: { value: 0 } }, fog: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), mat);
  L.group.add(m);
  L.frame.h += 1.6; L.frame.cy += 0.6;
  return {
    update(t) {
      const p = Ease.outCubic(pr(t, a - 0.2, b));
      m.visible = t > a - 0.2;
      m.position.set(lerp(-L.frame.w * 0.35, L.frame.w * 0.25, p), lerp(-1.2, 2.6, Math.sin(p * Math.PI * 0.8)), -2.2);
      mat.uniforms.uT.value = t;
    },
  };
}

/* ---------------- credit medals: 보수교육 4점 · 필수 2점 ---------------- */
function medalTexture(big, line1, line2, col) {
  return canvasTex(512, 512, (g) => {
    const gr = g.createRadialGradient(200, 180, 30, 256, 256, 256);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, '#2a1240');
    g.fillStyle = gr; g.beginPath(); g.arc(256, 256, 250, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 222, 0, TAU); g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 40px ${SANS}`; g.fillText(line1, 256, 136);
    g.font = `900 190px ${SANS}`; g.fillText(big, 256, 282);
    g.font = `800 40px ${SANS}`; g.fillText(line2, 256, 410);
  });
}
function medals(L, env) {
  const a = glyphAt(L, '네').t, b = glyphAt(L, '두').t;
  const rimGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.14, 48, 1, true); rimGeo.rotateX(Math.PI / 2);
  const face = new THREE.CircleGeometry(1.05, 48);
  const rim = new THREE.MeshPhongMaterial({ color: '#FFB935', specular: '#ffffff', shininess: 90, envMap: env, combine: THREE.AddOperation, reflectivity: 0.5, emissive: '#5A3A08', side: THREE.DoubleSide });
  const mk = (tex) => {
    const f = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: '#e8e8e8' });
    const g = new THREE.Group(), a = new THREE.Mesh(face, f), b = new THREE.Mesh(face, f);
    a.position.z = 0.071; b.position.z = -0.071; b.rotation.y = Math.PI;
    g.add(new THREE.Mesh(rimGeo, rim), a, b);
    return g;
  };
  const m1 = mk(medalTexture('4점', '치과의사 보수교육', '2026.11.22', '#F2B83C'));
  const m2 = mk(medalTexture('2점', '필수 평점', '포함', '#3BE8FF'));
  L.group.add(m1, m2);
  const xl = -L.frame.w / 2 - 1.5, xr = L.frame.w / 2 + 1.5;
  L.frame.w += 6.2;
  return {
    update(t) {
      [[m1, a, xl], [m2, b, xr]].forEach(([m, t0, x], i) => {
        const p = pr(t, t0 - 0.08, t0 + 0.45);
        m.visible = p > 0;
        m.position.set(x, 1.05 + (1 - Ease.outBack(p, 2.4)) * -2.5 + 0.06 * beatPulse(t, 6), 0);
        m.rotation.set(0, (1 - Ease.outCubic(p)) * TAU * 1.5 + Math.sin(t * 1.6 + i) * 0.15, 0);
      });
    },
  };
}

/* ---------------- golden ticket: 여러분을 초대합니다 ---------------- */
function ticketTexture() {
  return canvasTex(1024, 460, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#FFE68A'); gr.addColorStop(0.45, '#F2B83C'); gr.addColorStop(1, '#C9851A');
    g.fillStyle = gr; g.beginPath(); g.roundRect(0, 0, w, h, 36); g.fill();
    // stub notches + perforation
    g.globalCompositeOperation = 'destination-out';
    for (const y of [0, h]) { g.beginPath(); g.arc(770, y, 34, 0, TAU); g.fill(); }
    for (let y = 46; y < h - 30; y += 26) { g.beginPath(); g.arc(770, y, 6, 0, TAU); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(90,50,0,0.35)'; g.lineWidth = 4; g.beginPath(); g.roundRect(18, 18, w - 36, h - 36, 26); g.stroke();
    g.fillStyle = '#4A2A00'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.font = `400 86px ${DISCO}`; g.fillText('INVITATION', 56, 128);
    g.font = `800 34px ${SANS}`; g.fillText('대한치과의료관리학회 2026년 11월 종합학술대회', 60, 202);
    g.font = `900 52px ${SANS}`; g.fillText('2026.11.22 (일) 09:30 – 17:30', 60, 290);
    g.font = `700 34px ${SANS}`; g.fillText('서울성모병원 대강당 (지하 1층)', 60, 352);
    g.font = `600 26px ${SANS}`; g.fillStyle = 'rgba(74,42,0,0.75)'; g.fillText('사전등록 www.kadap.org', 60, 404);
    g.textAlign = 'center'; g.fillStyle = '#4A2A00';
    g.save(); g.translate(898, 230); g.rotate(-Math.PI / 2);
    g.font = `900 46px ${SANS}`; g.fillText('ADMIT ONE', 0, 16);
    g.restore();
  });
}
function ticket(L, tex) {
  const t0 = glyphAt(L, '초대합니다', '초').t;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.07), flat(tex));
  L.group.add(m);
  const y = L.frame.h + 1.25;
  L.frame.h = y + 1.15; L.frame.cy = L.frame.h / 2 - 0.1; L.frame.w = Math.max(L.frame.w, 5.2);
  return {
    update(t) {
      const p = pr(t, t0 - 0.1, t0 + 0.6);
      m.visible = p > 0;
      const e = Ease.outBack(p, 1.6);
      m.position.set(0, lerp(-1.5, y, e) + 0.06 * Math.sin(t * 2.2), lerp(-2, 0.1, e));
      m.rotation.set((1 - e) * -1.2, (1 - Ease.outCubic(p)) * TAU * 2 + Math.sin(t * 1.3) * 0.12, Math.sin(t * 1.7) * 0.03);
    },
  };
}

/* ---------------- K·A·D·A logo letters ---------------- */
function kadaLogo(logoFont, env, size = 2) {
  const g = new THREE.Group(), letters = [];
  let x = 0;
  KADA.forEach(([ch, col], i) => {
    const shapes = logoFont.shapes(ch, size);
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 0.28 * size / 2, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 });
    const adv = logoFont.advance(ch, size);
    geo.translate(-adv / 2, 0, 0);
    const mat = new THREE.MeshPhongMaterial({ color: col, specular: '#ffffff', shininess: 60, envMap: env, combine: THREE.MixOperation, reflectivity: 0.12, emissive: col, emissiveIntensity: 0.25, transparent: true, opacity: 0.93 });
    const m = new THREE.Mesh(geo, mat);
    m.userData.home = new THREE.Vector3(x + adv / 2, i % 2 ? -0.22 * size : 0.12 * size, i * 0.05);
    m.position.copy(m.userData.home);
    g.add(m); letters.push(m);
    x += adv * (ch === 'A' ? 0.78 : 0.86);
  });
  letters.forEach((m) => (m.userData.home.x -= x / 2));
  g.userData.width = x;
  return { group: g, letters };
}

export async function buildProps(scene, LINES, { font, logoFont, env }) {
  const list = [];
  const add = (p) => p && list.push(p);
  add(voxelWord(LINES[1], font));
  add(voxelWord(LINES[14], font));
  add(voxelWord(LINES[28], font));
  add(await speakerCards(LINES[11]));
  add(recordStack(LINES[18]));
  add(b1Sign(LINES[22]));
  add(sun(LINES[23]));
  add(medals(LINES[24], env));
  const tt = ticketTexture();
  add(ticket(LINES[17], tt));
  add(ticket(LINES[31], tt));

  // logo above 대한치과의료관리학회 종합학술대회
  {
    const L = LINES[34], lg = kadaLogo(logoFont, env, 1.6), t0 = L.t0;
    L.group.add(lg.group);
    const y = L.frame.h + 0.5;
    lg.group.position.set(0, y, 0);
    L.frame.h = y + 1.5; L.frame.cy = L.frame.h / 2 - 0.1;
    add({
      update(t) {
        lg.letters.forEach((m, i) => {
          const p = pr(t, t0 - 0.25 + i * 0.1, t0 + 0.25 + i * 0.1);
          m.visible = p > 0;
          m.position.copy(m.userData.home); m.position.y += (1 - Ease.outBounce(p)) * 3;
          m.rotation.y = Math.sin(t * 1.5 + i) * 0.12;
        });
      },
    });
  }
  // end card: big logo on the floor under the mirror-ball tooth
  {
    const lg = kadaLogo(logoFont, env, 3.2);
    lg.group.position.set(0, 0.6, 0);
    scene.add(lg.group);
    const t0 = 99.75;
    add({
      update(t, s) {
        lg.group.visible = s.layout === 'end';
        if (!lg.group.visible) return;
        lg.letters.forEach((m, i) => {
          const p = pr(t, t0 + i * 0.16, t0 + 0.55 + i * 0.16);
          m.visible = p > 0;
          m.position.copy(m.userData.home); m.position.y += (1 - Ease.outBounce(p)) * 5 + 0.08 * beatPulse(t, 5, 1, i * 0.25);
          m.rotation.set(0, Math.sin(t * 1.1 + i) * 0.1, 0);
        });
      },
    });
  }
  return { update(t, s, cam) { for (const p of list) p.update(t, s, cam); } };
}
