/* ============================================================
   DIRECTOR — sections, where each lyric line stands on the
   dance floor, and the camera that whips from line to line
   ============================================================ */
import * as THREE from 'three';
import { tOfBeat, beatOf, clamp, lerp, pr, Ease, vnoise, beatPulse, DUR, CHORUS_OFF } from './util.js';

const D2R = Math.PI / 180;
/* cut times sit between the last syllable of one section and the first of the next */
export const SECTIONS = [
  { key: 'intro',  name: 'Intro',        lines: [0, 1, 2, 3],             from: 0,            layout: 'deep',      styles: ['candy', 'white', 'cyan', 'lilac'],         enter: ['drop', 'zoom', 'pop', 'slot'] },
  { key: 'verse',  name: '1절',          lines: [4, 5, 6, 7],             from: 11.69,        layout: 'corridor',  styles: ['cyan', 'ice', 'lilac', 'mint'],            enter: ['flip', 'drop', 'spin', 'rise'] },
  { key: 'pre',    name: '프리코러스',    lines: [8, 9, 10, 11],           from: 21.30,        layout: 'stairs',    styles: ['white', 'candy', 'lemon', 'cyan'],         enter: ['zoom', 'flip', 'pop', 'drop'] },
  { key: 'chorus', name: '후렴',          lines: [12, 13, 14, 15, 16, 17], from: tOfBeat(56),  layout: 'ring',      styles: ['candy', 'cyan', 'white', 'lemon', 'lilac', 'mint'], enter: ['drop', 'spin', 'zoom', 'pop', 'slot', 'rise'], scatter: tOfBeat(86) },
  { key: 'verse2', name: '2절',          lines: [18, 19, 20, 21],         from: tOfBeat(88),  layout: 'row',       styles: ['mint', 'lilac', 'cyan', 'white'],          enter: ['rise', 'flip', 'drop', 'spin'] },
  { key: 'pre2',   name: '프리코러스 2',  lines: [22, 23, 24, 25],         from: 60.30,        layout: 'stairsDown', styles: ['lemon', 'white', 'candy', 'cyan'],        enter: ['drop', 'flip', 'pop', 'rise'], scatter: 70.05 },
  { key: 'chorus', name: '후렴 2',        lines: [26, 27, 28, 29, 30, 31], from: tOfBeat(124), layout: 'spiral',    styles: ['white', 'candy', 'cyan', 'lemon', 'lilac', 'mint'], enter: ['zoom', 'drop', 'spin', 'pop', 'slot', 'flip'] },
  { key: 'outro',  name: '아웃트로',      lines: [32, 33, 34, 35],         from: 88.30,        layout: 'deep',      styles: ['white', 'cyan', 'candy', 'lemon'],         enter: ['slot', 'flip', 'drop', 'pop'] },
  { key: 'end',    name: '안내',          lines: [],                       from: 99.65,        layout: 'end' },
];
SECTIONS.forEach((s, i) => (s.to = i + 1 < SECTIONS.length ? SECTIONS[i + 1].from : DUR + 1));

export function sectionAt(t) {
  let k = 0;
  for (let i = 0; i < SECTIONS.length; i++) if (t >= SECTIONS[i].from) k = i;
  return SECTIONS[k];
}

/* plan for building each line */
export function linePlan(idx) {
  const s = SECTIONS.find((x) => x.lines.includes(idx));
  const k = s.lines.indexOf(idx);
  const plan = { style: s.styles[k % s.styles.length], enter: s.enter[k % s.enter.length] };
  // keyword entrances
  plan.enterFor = (word, ch) => {
    if (/^20\d\d/.test(word) && /\d/.test(ch)) return 'slot';
    if (word.startsWith('AI') && /[A-Z]/.test(ch)) return 'zoom';
    return plan.enter;
  };
  return plan;
}

/* where each line stands, by layout; k = index in section */
export function placeLine(L, s, k) {
  const g = L.group;
  let x = 0, y = 0.12, z = 0, ry = 0;
  switch (s.layout) {
    case 'deep': x = (k % 2 ? 1 : -1) * 1.2; z = -k * 15; break;
    case 'corridor': { const side = k % 2 ? 1 : -1; x = side * 3.6; z = -k * 10; ry = -side * 17 * D2R; break; }
    case 'stairs': x = k * 2.2 - 3; y = 0.12 + k * 3.3; z = -k * 6; ry = -k * 9 * D2R; break;
    case 'stairsDown': x = 3 - k * 2.2; y = 0.12 + (3 - k) * 3.1; z = k * 4; ry = k * 9 * D2R; break;
    case 'ring': { const a = k * 60 * D2R; x = Math.sin(a) * 13; z = Math.cos(a) * 13; ry = a; break; }
    case 'spiral': { const a = -k * 60 * D2R; x = Math.sin(a) * 13.5; z = Math.cos(a) * 13.5; y = 0.12 + k * 1.5; ry = a; break; }
    case 'row': x = k * 15; z = (k % 2) * -2.5; break;
  }
  g.position.set(x, y, z);
  g.rotation.set(0, ry, 0);
  g.updateMatrixWorld(true);
  L.world = new THREE.Vector3(L.frame.cx, L.frame.cy, 0).applyMatrix4(g.matrixWorld);
  L.facing = ry;
}

/* camera pose: target + yaw/pitch/dist (+roll), interpolated as numbers */
const P = () => ({ tx: 0, ty: 0, tz: 0, yaw: 0, pitch: 0, dist: 10, roll: 0 });
function lerpPose(a, b, u, o = P()) {
  for (const k of ['tx', 'ty', 'tz', 'pitch', 'dist', 'roll']) o[k] = lerp(a[k], b[k], u);
  let dy = b.yaw - a.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  o.yaw = a.yaw + dy * u;
  return o;
}
function fitDist(L) { return Math.max(L.frame.w * 1.24, L.frame.h * 2.75, 5.6); }

/* per-layout shot: start pose and end pose for line k */
function shot(L, s, k) {
  const d = fitDist(L), c = L.world, f = L.facing;
  const alt = k % 2 ? 1 : -1;
  const a = { tx: c.x, ty: c.y, tz: c.z, yaw: f, pitch: 7 * D2R, dist: d * 1.12, roll: 0 };
  const b = { ...a, dist: d * 1.0 };
  switch (s.layout) {
    case 'deep': a.yaw = f + alt * 12 * D2R; b.yaw = f + alt * 4 * D2R; a.pitch = 9 * D2R; b.pitch = 4 * D2R; break;
    case 'corridor': a.yaw = f - alt * 7 * D2R; b.yaw = f + alt * 4 * D2R; a.pitch = b.pitch = 9 * D2R; a.roll = alt * 3 * D2R; b.roll = alt * 1 * D2R; break;
    case 'stairs': a.pitch = -9 * D2R; b.pitch = 4 * D2R; a.yaw = f + alt * 8 * D2R; b.yaw = f - alt * 4 * D2R; break;
    case 'stairsDown': a.pitch = 22 * D2R; b.pitch = 12 * D2R; a.yaw = f - alt * 10 * D2R; b.yaw = f + alt * 4 * D2R; break;
    case 'ring': a.yaw = f + 11 * D2R; b.yaw = f - 9 * D2R; a.pitch = 12 * D2R; b.pitch = 5 * D2R; a.dist = d * 1.22; b.dist = d * 1.04; a.roll = alt * 2 * D2R; break;
    case 'spiral': a.yaw = f - 16 * D2R; b.yaw = f + 10 * D2R; a.pitch = 16 * D2R; b.pitch = 3 * D2R; a.roll = alt * 7 * D2R; b.roll = alt * 2 * D2R; a.dist = d * 1.28; b.dist = d * 1.02; break;
    case 'row': a.tx -= 1.4; b.tx += 1.4; a.yaw = f - 9 * D2R; b.yaw = f + 9 * D2R; a.pitch = b.pitch = 6 * D2R; break;
  }
  if (L.shot && L.shot.pitch != null) { a.pitch = (L.shot.pitch + 4) * D2R; b.pitch = L.shot.pitch * D2R; }
  return [a, b];
}

const WHIP = 0.26;
/** camera pose for time t inside section s whose lines are built in LINES */
export function cameraPose(t, s, LINES, out = P()) {
  if (s.layout === 'end') return endPose(t, s, out);
  const ls = s.lines.map((i) => LINES[i]);
  const shots = ls.map((L, k) => shot(L, s, k));
  const starts = ls.map((L) => L.t0);
  // which line owns the camera now
  let k = 0;
  for (let i = 0; i < ls.length; i++) if (t >= starts[i] - WHIP) k = i;
  const st = k === 0 ? s.from : starts[k];
  const en = k + 1 < ls.length ? starts[k + 1] - WHIP : Math.min(s.to, ls[k].t1 + 1.2);
  const [a, b] = shots[k];
  if (k > 0 && t < starts[k]) {
    // whip from the end of the previous shot
    const u = Ease.inOutCubic(pr(t, starts[k] - WHIP, starts[k] - 0.02));
    lerpPose(shots[k - 1][1], a, u, out);
    const lift = Math.sin(Math.PI * u);
    if (s.layout === 'deep') { out.ty += lift * 3.5; out.pitch += lift * 14 * D2R; }
    if (s.layout === 'corridor' || s.layout === 'row') out.roll += lift * 6 * D2R * (k % 2 ? 1 : -1);
  } else {
    lerpPose(a, b, Ease.inOutSine(pr(t, Math.max(st, starts[k] - 0.02), en)), out);
  }
  // opening swoop: start high above the floor and dive to the first line
  if (s.key === 'intro' && t < starts[0]) {
    const u = Ease.outCubic(pr(t, 0, starts[0]));
    out.pitch = lerp(62 * D2R, out.pitch, u); out.dist = lerp(out.dist * 2.6, out.dist, u); out.yaw += (1 - u) * 50 * D2R;
  }
  // breaks: pull back and look at everything that was sung
  if (s.scatter && t > ls[ls.length - 1].t1 + 0.1) {
    const u = Ease.inOutCubic(pr(t, ls[ls.length - 1].t1 + 0.1, s.to));
    const cx = ls.reduce((a2, L) => a2 + L.world.x, 0) / ls.length, cz = ls.reduce((a2, L) => a2 + L.world.z, 0) / ls.length;
    const cy = ls.reduce((a2, L) => a2 + L.world.y, 0) / ls.length;
    const far = { tx: cx, ty: cy + 2.5, tz: cz, yaw: out.yaw + 50 * D2R, pitch: 26 * D2R, dist: 30, roll: 0 };
    lerpPose(out, far, u, out);
  }
  // handheld drift + a small push on each kick
  out.yaw += vnoise(t * 0.6, 1) * 1.1 * D2R;
  out.pitch += vnoise(t * 0.5, 2) * 0.8 * D2R;
  out.dist *= 1 - 0.018 * beatPulse(t, 7, 2);
  return out;
}

/* end card: slow orbit around the logo */
function endPose(t, s, out) {
  const u = pr(t, s.from, s.to);
  out.tx = 0; out.ty = 2.1; out.tz = 0;
  out.yaw = lerp(-22, 10, Ease.outCubic(u)) * D2R;
  out.pitch = lerp(18, 6, Ease.outCubic(u)) * D2R;
  out.dist = lerp(15, 11.5, Ease.outCubic(u));
  out.roll = 0;
  return out;
}

export function applyPose(cam, p) {
  const cp = Math.cos(p.pitch);
  cam.position.set(p.tx + Math.sin(p.yaw) * cp * p.dist, p.ty + Math.sin(p.pitch) * p.dist, p.tz + Math.cos(p.yaw) * cp * p.dist);
  cam.up.set(0, 1, 0);
  cam.lookAt(p.tx, p.ty, p.tz);
  cam.rotateZ(p.roll);
}

/* the mirror-ball tooth: hangs ahead of the camera, behind the words */
const _f = new THREE.Vector3();
export function ballPose(t, s, cam, pose, out) {
  if (s.layout === 'ring' || s.layout === 'spiral') {
    out.pos.set(0, s.layout === 'ring' ? 5.2 : 9.5, 0); out.scale = 1.6;
  } else if (s.layout === 'end') {
    out.pos.set(6.2, 5.4, -3); out.scale = 0.95;
  } else {
    cam.getWorldDirection(_f); _f.y = 0; _f.normalize();
    out.pos.set(pose.tx + _f.x * 13, Math.max(6, pose.ty + 5.5), pose.tz + _f.z * 13); out.scale = 1.0;
  }
  out.spin = beatOf(t) * 0.15;
  return out;
}

/* section marks for the scrubber */
export const MARKS = SECTIONS.map((s) => [s.from, s.name]);
