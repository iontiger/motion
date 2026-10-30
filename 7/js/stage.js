/* ============================================================
   STAGE — light-up dance floor, mirror-ball tooth, beams, dots
   ============================================================ */
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { TAU, SPB, beatOf, clamp, lerp, rnd, fract, beatPulse, energy, mulberry32 } from './util.js';

export const FOG = new THREE.Color('#1A0828');

/* environment cube: a dark room with bright coloured strips, for chrome / gold / mirror tiles */
export function makeEnv(renderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color('#0B0414');
  const strip = (col, x, y, z, w, h, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); room.add(m);
  };
  strip(new THREE.Color('#FF3D9A').multiplyScalar(3), -6, 2, -4, 1.2, 9, 0.6);
  strip(new THREE.Color('#3BE8FF').multiplyScalar(3), 6, 1, -4, 1.2, 9, -0.6);
  strip(new THREE.Color('#FFFFFF').multiplyScalar(4), 0, 7, 0, 10, 1.5, 0, Math.PI / 2);
  strip(new THREE.Color('#FFC83D').multiplyScalar(2.5), 0, -1, 6, 8, 0.8, Math.PI);
  strip(new THREE.Color('#9B5CFF').multiplyScalar(2.5), -7, -2, 5, 3, 3, 2.2);
  strip(new THREE.Color('#5BFFC6').multiplyScalar(2), 7, 3, 5, 2, 4, -2.2);
  const crt = new THREE.WebGLCubeRenderTarget(128);
  const cc = new THREE.CubeCamera(0.1, 100, crt);
  cc.update(renderer, room);
  return crt.texture;
}

/* ---------------- floor ---------------- */
const NX = 76, NZ = 76, TILE = 0.6;
const FLOOR_PAL = {
  intro:  ['#FF3D9A', '#9B5CFF'],
  verse:  ['#3BE8FF', '#9B5CFF'],
  pre:    ['#FF3D9A', '#FFC83D'],
  chorus: null, // rainbow
  verse2: ['#5BFFC6', '#3BE8FF'],
  pre2:   ['#FFC83D', '#FF6A3D'],
  outro:  ['#FFB627', '#FF6FB5'],
  end:    ['#3478B8', '#E0558C'],
};
/* one quad; tile colours live in a small texture that is rewritten every frame */
const FLOOR_VS = `varying vec3 vW; varying float vFog;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`;
const FLOOR_FS = `uniform sampler2D uTiles; uniform vec2 uOrigin; uniform vec2 uN; uniform float uTile; uniform vec3 uFog; uniform float uDensity;
varying vec3 vW; varying float vFog;
void main(){
  vec2 g = (vW.xz - uOrigin) / uTile + uN * 0.5;            // tile space
  vec2 cell = floor(g), f = fract(g);
  vec3 col = texture2D(uTiles, (cell + 0.5) / uN).rgb;
  float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));   // distance to the grout
  float aa = fwidth(e) * 1.2 + 1e-4;
  float tile = smoothstep(0.035, 0.035 + aa, e);
  float bevel = smoothstep(0.035, 0.16, e);
  col = mix(vec3(0.016, 0.006, 0.03), col * (0.72 + 0.28 * bevel) + col * 0.25 * (1.0 - bevel) * step(0.5, f.y), tile);
  float fogF = 1.0 - exp(-uDensity * uDensity * vFog * vFog);
  gl_FragColor = vec4(mix(col, uFog, clamp(fogF, 0.0, 1.0)), 1.0);
  #include <colorspace_fragment>
}`;
function makeFloor() {
  const data = new Uint8Array(NX * NZ * 4);
  const tex = new THREE.DataTexture(data, NX, NZ, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS,
    uniforms: { uTiles: { value: tex }, uOrigin: { value: new THREE.Vector2() }, uN: { value: new THREE.Vector2(NX, NZ) }, uTile: { value: TILE }, uFog: { value: FOG.clone() }, uDensity: { value: 0.03 } },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(NX * TILE, NZ * TILE), mat);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = -0.01;
  const g = new THREE.Group(); g.add(mesh);
  return { group: g, mesh, data, tex, mat };
}
const _o = new THREE.Color(), _c = new THREE.Color(), _a = new THREE.Color(), _b = new THREE.Color(), _dim = new THREE.Color('#110720');
function floorColor(mode, wx, wz, t, cx, cz) {
  const B = beatOf(t), bi = Math.floor(B), kick = beatPulse(t, 7), e = 0.4 + 0.3 * energy(t);
  const dx = wx - cx, dz = wz - cz, d = Math.sqrt(dx * dx + dz * dz);
  const focus = clamp(1.2 - d / 26);
  let v = 0, hue = -1, pal = FLOOR_PAL[mode] || FLOOR_PAL.verse, alt = 0;
  switch (mode) {
    case 'intro': { // a ring opens from the centre on every beat
      const r = (B - bi) * 9; v = Math.exp(-Math.abs(d - r) * 1.4) * 0.9 + (rnd(wx, wz + bi * 7) > 0.93 ? 0.6 : 0); alt = (bi >> 1) & 1; break; }
    case 'verse': { // checkerboard that flips every beat
      v = ((Math.floor(wx) + Math.floor(wz) + bi) & 1) ? 0.15 + 0.75 * kick : 0.08; alt = (Math.floor(wx / 3) & 1); break; }
    case 'pre': { // stripes racing toward the camera, twice a beat
      const k = Math.floor(wz + B * 4); v = (((k % 4) + 4) % 4 === 0) ? 0.95 : 0.06; alt = Math.floor(wx / 2) & 1; break; }
    case 'chorus': { // rainbow diagonals + kick flash
      hue = fract(wx * 0.035 + wz * 0.025 - t * 0.25); v = 0.35 + 0.35 * Math.sin(wx * 0.9 + wz * 0.7 + B * Math.PI) ** 2 + 0.5 * kick; break; }
    case 'verse2': { // random sparkle every 8th
      const s = Math.floor(B * 2); v = rnd(Math.floor(wx), Math.floor(wz) * 3.1 + s) > 0.8 ? 0.95 : 0.07; alt = rnd(wx, wz + s) > 0.5 ? 1 : 0; break; }
    case 'pre2': { // concentric squares
      const r = Math.max(Math.abs(dx), Math.abs(dz)); v = ((Math.floor(r - B * 2) % 3 + 3) % 3 === 0) ? 0.9 : 0.06; alt = Math.floor(r / 3) & 1; break; }
    case 'outro': { // slow breathing gold
      v = 0.35 + 0.3 * Math.sin(d * 0.6 - t * 2.4) + 0.35 * kick * (rnd(wx, wz) > 0.6 ? 1 : 0); alt = rnd(Math.floor(wx), Math.floor(wz)) > 0.5 ? 1 : 0; break; }
    case 'end': {
      v = 0.25 + 0.25 * Math.sin(d * 0.6 - t * 2.4) + 0.35 * kick * (rnd(wx, wz) > 0.6 ? 1 : 0); alt = rnd(Math.floor(wx), Math.floor(wz)) > 0.5 ? 1 : 0; break; }
  }
  v = clamp(v * e) * focus;
  if (hue >= 0) _a.setHSL(hue, 1, 0.55); else _a.set(pal[alt]);
  return _c.copy(_dim).lerp(_a, v);
}

/* ---------------- mirror-ball tooth ---------------- */
function toothShape() {
  const s = new THREE.Shape();
  s.moveTo(-1.0, 0.9);
  s.bezierCurveTo(-1.28, 1.6, -1.08, 2.32, -0.55, 2.36);
  s.bezierCurveTo(-0.25, 2.38, -0.13, 2.16, 0, 2.1);
  s.bezierCurveTo(0.13, 2.16, 0.25, 2.38, 0.55, 2.36);
  s.bezierCurveTo(1.08, 2.32, 1.28, 1.6, 1.0, 0.9);
  s.bezierCurveTo(0.9, 0.5, 0.86, 0.1, 0.76, -0.38);
  s.bezierCurveTo(0.69, -0.74, 0.4, -0.78, 0.32, -0.42);
  s.bezierCurveTo(0.25, -0.1, 0.16, 0.36, 0, 0.4);
  s.bezierCurveTo(-0.16, 0.36, -0.25, -0.1, -0.32, -0.42);
  s.bezierCurveTo(-0.4, -0.78, -0.69, -0.74, -0.76, -0.38);
  s.bezierCurveTo(-0.86, 0.1, -0.9, 0.5, -1.0, 0.9);
  return s;
}
export function toothGeometry(depth = 0.9, bevel = 0.42, segs = 6, curve = 18) {
  const g = new THREE.ExtrudeGeometry(toothShape(), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: segs, curveSegments: curve });
  g.computeBoundingBox();
  const bb = g.boundingBox, c = new THREE.Vector3(); bb.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);
  g.computeVertexNormals();
  return g;
}
function makeTooth(env) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(toothGeometry(0.9, 0.42, 4, 10), new THREE.MeshLambertMaterial({ color: '#6E5C96' }));
  core.scale.setScalar(0.985);
  group.add(core);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(toothGeometry())).build();
  const N = 1700;
  const tileGeo = new THREE.PlaneGeometry(0.155, 0.155); tileGeo.translate(0, 0, 0.012);
  const tiles = new THREE.InstancedMesh(tileGeo,
    new THREE.MeshPhongMaterial({ color: '#ffffff', specular: '#ffffff', shininess: 90, envMap: env, combine: THREE.MixOperation, reflectivity: 0.75 }), N);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), z = new THREE.Vector3(0, 0, 1), col = new THREE.Color();
  const rng = mulberry32(7);
  for (let i = 0; i < N; i++) {
    sampler.sample(p, n);
    q.setFromUnitVectors(z, n.normalize());
    m.compose(p, q, new THREE.Vector3(1, 1, 1));
    tiles.setMatrixAt(i, m);
    tiles.setColorAt(i, col.setHSL(rng(), 0.35, 0.75 + rng() * 0.2));
  }
  group.add(tiles);
  // chain
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 30, 6), new THREE.MeshBasicMaterial({ color: '#3a2a50' }));
  chain.position.y = 16.5; group.add(chain);
  // sparkles: additive stars that flash on the beat
  const sp = [];
  const starTex = starTexture();
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: '#ffffff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.userData.seed = i; group.add(s); sp.push(s);
  }
  return { group, tiles, sp, sampler };
}
function starTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[128, 6], [6, 128]]) { const lg = x.createLinearGradient(64 - w / 2, 64 - h / 2, 64 + w / 2, 64 + h / 2); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(64 - w / 2, 64 - h / 2, w, h); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- light dots thrown by the ball ---------------- */
function makeDots() {
  const N = 1600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const rng = mulberry32(11), c = new THREE.Color();
  const pal = ['#FF3D9A', '#3BE8FF', '#FFC83D', '#FFFFFF', '#C6A2FF', '#5BFFC6'];
  for (let i = 0; i < N; i++) {
    const u = rng() * 2 - 1, a = rng() * TAU, r = 60, s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * s * r, Math.abs(u) * r * 0.9 - 6, Math.sin(a) * s * r], i * 3);
    c.set(pal[i % pal.length]); col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const p = new THREE.Points(g, mat); p.frustumCulled = false;
  return p;
}

/* ---------------- glitter in the air ---------------- */
function makeGlitter() {
  const N = 700, pos = new Float32Array(N * 3), rng = mulberry32(5);
  for (let i = 0; i < N; i++) pos.set([(rng() - 0.5) * 40, rng() * 14, (rng() - 0.5) * 40], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.06, color: '#FFE9F6', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const p = new THREE.Points(g, mat); p.frustumCulled = false;
  return p;
}

/* ---------------- volumetric-looking beams ---------------- */
const BEAM_VS = `varying float vD; varying vec3 vN; varying vec3 vV; uniform float uLen;
void main(){ vD = position.z / uLen; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const BEAM_FS = `varying float vD; varying vec3 vN; varying vec3 vV; uniform vec3 uCol; uniform float uI;
void main(){ float f = pow(1.0 - clamp(vD, 0.0, 1.0), 1.6); float e = pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(uCol * f * e * uI, 1.0); }`;
function makeBeams() {
  const len = 34, list = [];
  const geo = new THREE.ConeGeometry(2.3, len, 24, 1, true);
  geo.translate(0, -len / 2, 0); geo.rotateX(-Math.PI / 2);
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, uniforms: { uLen: { value: len }, uCol: { value: new THREE.Color() }, uI: { value: 0.4 } },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; g.add(m); list.push(m);
  }
  return { group: g, list };
}
const BEAM_PAL = {
  intro: ['#FF3D9A', '#9B5CFF'], verse: ['#3BE8FF', '#FFFFFF'], pre: ['#FF3D9A', '#FFC83D'], chorus: ['#FF3D9A', '#3BE8FF', '#FFC83D', '#5BFFC6'],
  verse2: ['#5BFFC6', '#C6A2FF'], pre2: ['#FFC83D', '#FF6A3D'], outro: ['#FFC83D', '#FFFFFF'], end: ['#3478B8', '#E0558C', '#F2B83C', '#34AE90'],
};

export function buildStage(scene, env) {
  scene.fog = new THREE.FogExp2(FOG, 0.03);
  scene.background = FOG.clone();
  const floor = makeFloor(); scene.add(floor.group);
  const tooth = makeTooth(env); scene.add(tooth.group);
  const dots = makeDots(); scene.add(dots);
  const glitter = makeGlitter(); scene.add(glitter);
  const beams = makeBeams(); scene.add(beams.group);
  const hemi = new THREE.HemisphereLight('#B9A4FF', '#FF4FA0', 1.1); scene.add(hemi);
  const key = new THREE.DirectionalLight('#FFF1F8', 2.4); scene.add(key); scene.add(key.target);
  const pl1 = new THREE.PointLight('#FF3D9A', 30, 18, 1.6), pl2 = new THREE.PointLight('#3BE8FF', 30, 18, 1.6);
  scene.add(pl1, pl2);

  const S = { floor, tooth, dots, glitter, beams, key, pl1, pl2, hemi };
  const _v = new THREE.Vector3(), _q = new THREE.Vector3();
  S.update = (t, mode, focus, cam, ball) => {
    // floor follows the action, snapped to whole tiles so patterns stay put (pattern units = tiles)
    const fx = Math.round(focus.x / TILE), fz = Math.round(focus.z / TILE);
    floor.group.position.set(fx * TILE, 0, fz * TILE);
    floor.mat.uniforms.uOrigin.value.set(fx * TILE, fz * TILE);
    const D = floor.data;
    for (let i = 0; i < NX * NZ; i++) {
      // texture row = tile row along +z (plane is rotated so v runs toward -z; the shader works in world space)
      const ix = i % NX, iz = Math.floor(i / NX);
      const c = _o.copy(floorColor(mode, fx + ix - NX / 2 + 0.5, fz + iz - NZ / 2 + 0.5, t, focus.x / TILE, focus.z / TILE)).convertLinearToSRGB();
      D[i * 4] = c.r * 255; D[i * 4 + 1] = c.g * 255; D[i * 4 + 2] = c.b * 255; D[i * 4 + 3] = 255;
    }
    floor.tex.needsUpdate = true;
    // tooth ball
    const k = beatPulse(t, 6);
    tooth.group.position.copy(ball.pos);
    tooth.group.rotation.set(0.12 * Math.sin(t * 0.7), t * 0.9 + ball.spin, 0.1 * Math.sin(t * 0.5 + 1));
    tooth.group.scale.setScalar(ball.scale * (1 + 0.025 * k));
    tooth.group.visible = ball.scale > 0.01;
    const bi = Math.floor(beatOf(t) * 2);
    tooth.sp.forEach((s, j) => {
      const r = rnd(j * 3.3, bi), on = rnd(j, bi * 1.7) > 0.45;
      const ph = fract(beatOf(t) * 2);
      s.position.set((rnd(j, bi) - 0.5) * 2.4, (rnd(j + 9, bi) - 0.5) * 2.8, 1.1 * (r > 0.5 ? 1 : -1));
      s.scale.setScalar(on ? (0.5 + 0.6 * r) * Math.exp(-ph * 5) : 0.001);
      s.material.opacity = 0.7;
    });
    // dots spin with the ball
    dots.rotation.y = t * 0.12 + ball.spin * 0.1;
    dots.material.opacity = 0.35 + 0.55 * k * (0.5 + 0.5 * energy(t));
    dots.position.set(focus.x, 0, focus.z);
    glitter.position.set(focus.x, 0, focus.z);
    glitter.rotation.y = t * 0.05;
    // beams from a ring above the focus point, sweeping
    const pal = BEAM_PAL[mode] || BEAM_PAL.verse;
    beams.list.forEach((b, j) => {
      const a = (j / beams.list.length) * TAU + t * 0.15;
      b.position.set(focus.x + Math.cos(a) * 15, 17, focus.z + Math.sin(a) * 15 - 6);
      const sw = Math.sin(t * 0.9 + j * 1.3) * 7;
      _v.set(focus.x + Math.cos(a + 1.7) * sw, 0, focus.z + Math.sin(a + 1.7) * sw);
      b.lookAt(_v);
      b.material.uniforms.uCol.value.set(pal[j % pal.length]);
      const flick = (Math.floor(beatOf(t)) + j) % 2 ? 1 : 0.55;
      b.material.uniforms.uI.value = (0.2 + 0.45 * energy(t)) * flick * (mode === 'chorus' ? 1.3 : 1);
    });
    // lights: key from the camera's upper left, coloured points orbit the focus
    _q.set(-6, 9, 8).applyQuaternion(cam.quaternion);
    key.position.copy(cam.position).add(_q); key.target.position.copy(focus);
    pl1.position.set(focus.x + Math.cos(t * 1.3) * 6, 4 + 1.5 * Math.sin(t), focus.z + Math.sin(t * 1.3) * 6);
    pl2.position.set(focus.x + Math.cos(t * 1.3 + Math.PI) * 6, 3, focus.z + Math.sin(t * 1.3 + Math.PI) * 6);
    pl1.intensity = 14 + 26 * k; pl2.intensity = 14 + 26 * beatPulse(t, 6, 1, 0.5);
  };
  return S;
}
