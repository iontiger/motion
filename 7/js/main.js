/* ============================================================
   MAIN — three.js renderer + post, HUD composite, player
   (audio-clock synced), headless hooks and MP4 export
   ============================================================ */
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { W, H, DUR, SPB, clamp, pr, beatPulse, energy, analyzeEnergy, Ease } from './util.js';
import { Font } from './glyphs.js';
import { buildStage, makeEnv } from './stage.js';
import { buildLine, updateLine } from './lyrics3d.js';
import { SECTIONS, sectionAt, linePlan, placeLine, cameraPose, applyPose, ballPose, MARKS } from './director.js';
import { buildProps } from './props.js';
import { drawHUD } from './hud.js';

const $ = (id) => document.getElementById(id);
const out = $('out');
out.width = W; out.height = H;
const g2 = out.getContext('2d', { alpha: false });

/* ---------------- renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
const QS = new URLSearchParams(location.search);
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 400);

/* post: a light bloom at 1/4 and 1/8 resolution (cheap enough for software GL),
   then one full-res pass for aberration, vignette, grain, flash and sRGB */
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BRIGHT_FS = `uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr; varying vec2 vUv;
  vec3 tap(vec2 o){ vec3 c = texture2D(tSrc, vUv + o * uTexel).rgb; float l = max(c.r, max(c.g, c.b)); return c * smoothstep(uThr, uThr + 0.25, l); }
  void main(){ gl_FragColor = vec4((tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0))) * 0.25, 1.0); }`;
const BLUR_FS = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
    c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.316;
    c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.070;
    gl_FragColor = vec4(c, 1.0); }`;
const GRADE_FS = `uniform sampler2D tScene, tB1, tB2; uniform float uTime, uCA, uFlash, uVig, uGrain, uBloom; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 c = vUv - 0.5; float ca = uCA * 0.006;
    vec3 col = vec3(texture2D(tScene, vUv + c * ca).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - c * ca).b);
    col += (texture2D(tB1, vUv).rgb * 0.9 + texture2D(tB2, vUv).rgb * 1.1) * uBloom;
    float vg = smoothstep(0.38, 1.0, length(c * vec2(1.0, 0.82)));
    col *= 1.0 - vg * 0.55 * uVig;
    col = mix(col, vec3(1.0, 0.97, 1.0), clamp(uFlash, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    gl_FragColor.rgb += (h(vUv * vec2(1920.0, 1080.0) + fract(uTime * 7.13) * 91.7) - 0.5) * uGrain;
  }`;
const POST = {};
function initPost() {
  const msaa = +(QS.get('msaa') ?? 4);
  const rt = (w, h, s = 0) => new THREE.WebGLRenderTarget(w, h, { samples: s, depthBuffer: s > 0 });
  POST.scene = rt(W, H, msaa);
  POST.a1 = rt(W / 4, H / 4); POST.b1 = rt(W / 4, H / 4);
  POST.a2 = rt(W / 8, H / 8); POST.b2 = rt(W / 8, H / 8);
  const mat = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
  POST.bright = mat(BRIGHT_FS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 0.72 } });
  POST.blur = mat(BLUR_FS, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
  POST.grade = mat(GRADE_FS, { tScene: { value: POST.scene.texture }, tB1: { value: POST.a1.texture }, tB2: { value: POST.a2.texture }, uTime: { value: 0 }, uCA: { value: 0 }, uFlash: { value: 0 }, uVig: { value: 1 }, uGrain: { value: 0.03 }, uBloom: { value: 0.6 } });
  POST.quad = new FullScreenQuad(null);
}
function pass(material, target) { POST.quad.material = material; renderer.setRenderTarget(target); POST.quad.render(renderer); }
function blurPair(a, b, w, h, spread) {
  const u = POST.blur.uniforms;
  u.tSrc.value = a.texture; u.uDir.value.set(spread / w, 0); pass(POST.blur, b);
  u.tSrc.value = b.texture; u.uDir.value.set(0, spread / h); pass(POST.blur, a);
}
function renderPost() {
  renderer.setRenderTarget(POST.scene);
  renderer.render(scene, camera);
  const bu = POST.bright.uniforms;
  bu.tSrc.value = POST.scene.texture; bu.uTexel.value.set(1.5 / W, 1.5 / H); pass(POST.bright, POST.a1);
  blurPair(POST.a1, POST.b1, W / 4, H / 4, 1);
  POST.blur.uniforms.tSrc.value = POST.a1.texture; POST.blur.uniforms.uDir.value.set(0.5 / (W / 4), 0); pass(POST.blur, POST.a2);
  blurPair(POST.a2, POST.b2, W / 8, H / 8, 1.4);
  pass(POST.grade, null);
}

/* ---------------- world ---------------- */
let STAGE, LINES = [], PROPS;
const pose = {}, ball = { pos: new THREE.Vector3(), scale: 1, spin: 0 }, focus = new THREE.Vector3();
async function buildWorld() {
  const font = new Font(await (await fetch('fonts/bagel-glyphs.json')).json());
  const env = makeEnv(renderer);
  STAGE = buildStage(scene, env);
  const logoFont = new Font(await (await fetch('fonts/jost-glyphs.json')).json());
  LINES = LYRICS.map((_, i) => buildLine(i, font, env, linePlan(i)));
  PROPS = await buildProps(scene, LINES, { font, logoFont, env });
  for (const s of SECTIONS) s.lines.forEach((i, k) => { scene.add(LINES[i].group); placeLine(LINES[i], s, k); });
  initPost();
}

/* ---------------- one frame ---------------- */
function renderAt(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const s = sectionAt(t);
  cameraPose(t, s, LINES, pose);
  applyPose(camera, pose);
  for (const L of LINES) L.group.visible = false;
  for (const i of s.lines) { const L = LINES[i]; L.group.visible = true; updateLine(L, t, s.scatter ?? Infinity); }
  focus.set(pose.tx, 0, pose.tz);
  ballPose(t, s, camera, pose, ball);
  STAGE.update(t, s.key, focus, camera, ball);
  PROPS.update(t, s, camera);
  // post: flash + aberration on cuts, aberration on kicks
  const cut = t - s.from;
  const u = POST.grade.uniforms;
  u.uTime.value = t;
  u.uFlash.value = s.from > 0 ? Math.exp(-cut * 14) * 0.7 : 0;
  u.uCA.value = Math.exp(-cut * 6) * 1.6 + beatPulse(t, 10, 2) * 0.5 * energy(t);
  u.uBloom.value = 0.5 + 0.35 * energy(t) + (s.key === 'chorus' ? 0.12 : 0);
  renderPost();
  g2.drawImage(renderer.domElement, 0, 0);
  drawHUD(g2, t, s);
}

/* ---------------- fonts ---------------- */
async function loadFonts() {
  const faces = [['PretendardV', 'fonts/pretendard-sub.woff2', { weight: '45 920' }], ['Monoton', 'fonts/monoton-sub.woff2', {}]];
  const tasks = faces.map(([fam, url, d]) => { try { const ff = new FontFace(fam, `url(${url})`, d); document.fonts.add(ff); return ff.load(); } catch (e) { return Promise.resolve(); } });
  await Promise.race([Promise.allSettled(tasks), new Promise((r) => setTimeout(r, 10000))]);
}

/* ---------------- player ---------------- */
const S = { ready: false, buf: null, ac: null, src: null, playing: false, offset: 0, startAt: 0, dirty: true };
function audioNow() {
  const ac = S.ac;
  if (ac.getOutputTimestamp) {
    const ts = ac.getOutputTimestamp();
    if (ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
  }
  return ac.currentTime - (ac.outputLatency || ac.baseLatency || 0);
}
function curT() { return S.playing ? clamp(S.offset + audioNow() - S.startAt, S.offset, DUR) : S.offset; }
async function play() {
  if (!S.ready) return;
  if (!S.ac) S.ac = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
  await S.ac.resume();
  if (S.offset >= DUR - 0.05) S.offset = 0;
  const src = S.ac.createBufferSource();
  src.buffer = S.buf; src.connect(S.ac.destination);
  S.startAt = S.ac.currentTime + 0.06;
  src.start(S.startAt, S.offset);
  src.onended = () => { if (S.src === src && S.playing) { S.playing = false; S.offset = DUR; S.dirty = true; syncUI(); } };
  S.src = src; S.playing = true;
  $('overlay').classList.add('hidden');
  syncUI();
}
function pause() {
  if (!S.playing) return;
  S.offset = curT();
  S.src.onended = null; try { S.src.stop(); } catch (e) {}
  S.src = null; S.playing = false; S.dirty = true;
  syncUI();
}
function toggle() { S.playing ? pause() : play(); }
function seek(t) {
  const was = S.playing;
  if (was) pause();
  S.offset = clamp(t, 0, DUR); S.dirty = true;
  if (was) play();
}
const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
let scrubbing = false;
function syncUI(t = curT()) {
  $('btnPlay').dataset.state = S.playing ? 'pause' : 'play';
  $('btnPlay').setAttribute('aria-label', S.playing ? '일시정지' : '재생');
  $('time').textContent = `${fmtTime(t)} / ${fmtTime(DUR)}`;
  if (!scrubbing) $('scrub').value = String(Math.round((t / DUR) * 1000));
  $('scrub').style.setProperty('--p', `${(t / DUR) * 100}%`);
}
function loop() {
  const t = curT();
  if (S.playing || S.dirty) { renderAt(t); S.dirty = false; syncUI(t); }
  requestAnimationFrame(loop);
}

/* ---------------- export (WebCodecs → MP4) ---------------- */
async function exportMP4(fps = 60, onProgress = () => {}) {
  if (!window.VideoEncoder || !window.Mp4Muxer) throw new Error('이 브라우저는 WebCodecs MP4 내보내기를 지원하지 않습니다 (Chrome 권장).');
  const { Muxer, ArrayBufferTarget } = Mp4Muxer;
  const base = { width: W, height: H, bitrate: 10e6, bitrateMode: 'variable', framerate: fps };
  let vconf = null, vcodec = 'avc';
  for (const c of ['avc1.640033', 'avc1.64002A', 'vp09.00.40.08']) {
    const cand = c.startsWith('avc') ? { ...base, codec: c, avc: { format: 'avc' } } : { ...base, codec: c };
    if ((await VideoEncoder.isConfigSupported(cand)).supported) { vconf = cand; vcodec = c.startsWith('avc') ? 'avc' : 'vp9'; break; }
  }
  if (!vconf) throw new Error('이 브라우저에서 쓸 수 있는 영상 코덱이 없습니다 (Chrome 권장).');
  let acodec = 'aac', aconf = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 256000 };
  if (!(await AudioEncoder.isConfigSupported(aconf)).supported) { acodec = 'opus'; aconf = { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }; }
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: vcodec, width: W, height: H, frameRate: fps },
    audio: { codec: acodec, numberOfChannels: 2, sampleRate: 48000 },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  let err = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (err = e) });
  venc.configure(vconf);
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => (err = e) });
  aenc.configure(aconf);
  const buf = S.buf, sr = buf.sampleRate, L = buf.getChannelData(0), R = buf.getChannelData(Math.min(1, buf.numberOfChannels - 1));
  const total = Math.min(buf.length, Math.floor(DUR * sr));
  for (let i = 0; i < total; i += 4800) {
    const n = Math.min(4800, total - i), data = new Float32Array(n * 2);
    data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / sr) * 1e6), data });
    aenc.encode(ad); ad.close();
  }
  const N = Math.round(DUR * fps);
  for (let f = 0; f < N; f++) {
    if (err) throw err;
    renderAt(f / fps);
    /* wait for the frame here: letting several frames queue up behind the encoder is ~3× slower in software GL */
    g2.getImageData(0, 0, 1, 1);
    const vf = new VideoFrame(out, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) });
    venc.encode(vf, { keyFrame: f % (fps * 2) === 0 });
    vf.close();
    if (venc.encodeQueueSize > 6) await new Promise((r) => { const chk = () => (venc.encodeQueueSize <= 2 ? r() : setTimeout(chk, 1)); chk(); });
    if (f % 10 === 0) { onProgress(f / N); await new Promise((r) => setTimeout(r, 0)); }
  }
  await venc.flush(); await aenc.flush();
  if (err) throw err;
  muxer.finalize();
  onProgress(1);
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}
async function exportUI() {
  if (!S.ready) return;
  pause();
  const m = $('exportModal'), bar = $('exportBar'), lab = $('exportLabel');
  m.classList.remove('hidden');
  lab.textContent = '프레임 렌더링 중… 0%';
  try {
    const blob = await exportMP4(60, (p) => { bar.style.width = `${p * 100}%`; lab.textContent = `프레임 렌더링 중… ${Math.round(p * 100)}%`; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'kada-disco-3d.mp4';
    document.body.appendChild(a); a.click(); a.remove();
    lab.textContent = '완료! 다운로드를 확인하세요.';
  } catch (e) {
    lab.textContent = '내보내기 실패: ' + e.message;
  }
  setTimeout(() => m.classList.add('hidden'), 2200);
  S.dirty = true;
}

/* ---------------- headless hooks ---------------- */
window.__renderAt = (t) => { renderAt(t); return true; };
window.__dbg = { THREE, camera, scene, ball, renderer, POST, get STAGE() { return STAGE; }, get LINES() { return LINES; }, render() { renderPost(); g2.drawImage(renderer.domElement, 0, 0); } };
window.__frame = (t, q = 0.9) => { renderAt(t); return out.toDataURL('image/jpeg', q); };
window.__startExport = (fps = 60) => {
  window.__progress = 0; window.__mp4 = null; window.__exportErr = null;
  exportMP4(fps, (p) => (window.__progress = p))
    .then(async (b) => { window.__mp4 = new Uint8Array(await b.arrayBuffer()); })
    .catch((e) => (window.__exportErr = String(e && e.stack || e)));
  return true;
};
window.__chunk = (i, size) => {
  const a = window.__mp4.subarray(i, i + size);
  let s = '';
  for (let k = 0; k < a.length; k += 32768) s += String.fromCharCode.apply(null, a.subarray(k, k + 32768));
  return btoa(s);
};

/* ---------------- boot ---------------- */
const POSTER_T = 33.4; // a chorus frame as the still preview
async function boot() {
  const qs = new URLSearchParams(location.search);
  const st = $('status');
  st.textContent = '폰트·무대 준비 중…';
  try {
    await loadFonts();
    await buildWorld();
  } catch (e) {
    st.textContent = '3D 무대를 준비하지 못했습니다: ' + e.message;
    console.error(e);
    return;
  }
  S.offset = qs.has('t') ? parseFloat(qs.get('t')) : 0;
  renderAt(qs.has('t') ? S.offset : POSTER_T);
  S.dirty = false;
  window.__fontsReady = true;
  if (qs.has('noaudio')) { window.__ready = true; requestAnimationFrame(loop); return; }
  st.textContent = '노래 불러오는 중…';
  try {
    const res = await fetch('audio/song.mp3');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    S.buf = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await res.arrayBuffer());
  } catch (e) {
    st.textContent = '노래를 불러오지 못했습니다: ' + e.message;
    return;
  }
  analyzeEnergy(S.buf);
  S.ready = true;
  st.textContent = '';
  document.body.classList.add('ready');
  window.__ready = true;
  renderAt(qs.has('t') ? S.offset : POSTER_T);
  S.dirty = false;
  requestAnimationFrame(loop);
}

/* ---------------- UI wiring ---------------- */
$('bigPlay').addEventListener('click', play);
$('btnPlay').addEventListener('click', toggle);
$('btnRestart').addEventListener('click', () => seek(0));
$('btnExport').addEventListener('click', exportUI);
$('btnFull').addEventListener('click', () => {
  const el = $('stage');
  if (document.fullscreenElement) document.exitFullscreen();
  else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
});
$('scrub').addEventListener('input', (e) => { scrubbing = true; const t = (e.target.value / 1000) * DUR; if (!S.playing) { S.offset = t; S.dirty = true; } $('time').textContent = `${fmtTime(t)} / ${fmtTime(DUR)}`; });
$('scrub').addEventListener('change', (e) => { scrubbing = false; seek((e.target.value / 1000) * DUR); });
out.addEventListener('click', () => { if (S.ready) toggle(); });
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.key !== ' ') return;
  if (e.key === ' ' || e.key === 'k') { e.preventDefault(); if (S.ready) toggle(); }
  else if (e.key === 'ArrowRight') seek(curT() + 4 * SPB);
  else if (e.key === 'ArrowLeft') seek(curT() - 4 * SPB);
  else if (e.key === 'f') $('btnFull').click();
  else if (e.key === 'Home' || e.key === '0') seek(0);
});
const marks = $('marks');
MARKS.forEach(([t, l]) => {
  const s = document.createElement('button');
  s.className = 'mark'; s.style.left = `${(t / DUR) * 100}%`; s.title = l; s.textContent = l;
  s.addEventListener('click', () => seek(Math.max(0, t)));
  marks.appendChild(s);
});
boot();
