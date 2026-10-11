'use strict';
/* ============================================================
   APP — WebGL post FX, player (audio-clock synced), MP4 export
   ============================================================ */
const out = document.getElementById('out');
out.width = W; out.height = H;
const cv = document.createElement('canvas');
cv.width = W; cv.height = H;
g = cv.getContext('2d', { alpha: false });

/* ---------------- post-processing ---------------- */
const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime, uCA, uGlitch, uFlash, uGrain, uVig, uZoom, uBloom, uSeed;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 S(vec2 uv){ return texture2D(uTex, uv).rgb; }
void main(){
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  vec2 ca2 = c * vec2(uRes.x / uRes.y, 1.0);
  float r2 = dot(ca2, ca2);
  uv = 0.5 + c * (1.0 - uZoom * 0.05 - uZoom * 0.05 * r2);
  if (uGlitch > 0.001) {
    float band = floor(uv.y * 26.0 + h(vec2(uSeed, 1.0)) * 7.0);
    if (h(vec2(band, uSeed)) < uGlitch * 0.55) uv.x += (h(vec2(band, uSeed + 3.1)) - 0.5) * 0.14 * uGlitch;
    vec2 cell = floor(uv * vec2(18.0, 10.0));
    if (h(cell + uSeed * 0.37) < uGlitch * 0.07) uv += (vec2(h(cell + 2.0), h(cell + 5.0)) - 0.5) * 0.06;
  }
  vec2 d = uv - 0.5;
  float ca = uCA * 0.0045 + uGlitch * 0.012;
  vec3 col;
  col.r = S(uv + d * ca * 2.0 + vec2(uGlitch * 0.006, 0.0)).r;
  col.g = S(uv).g;
  col.b = S(uv - d * ca * 2.0 - vec2(uGlitch * 0.006, 0.0)).b;
  if (uBloom > 0.001) {
    vec3 b = vec3(0.0);
    vec2 px = 1.0 / uRes;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398 + 0.39;
      vec2 o = vec2(cos(a), sin(a));
      b += max(S(uv + o * px * 9.0) - 0.62, 0.0);
      b += max(S(uv + o * px * 22.0) - 0.62, 0.0) * 0.7;
    }
    col += b / 13.6 * uBloom * 1.5;
  }
  float vg = 1.0 - smoothstep(0.32, 0.92, length(c * vec2(1.0, 0.78))) * 0.85;
  col *= mix(1.0, vg, uVig);
  col += (h(vUv * uRes + fract(uTime * 7.13) * 91.7) - 0.5) * uGrain;
  col = mix(col, vec3(1.0), clamp(uFlash, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;
const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

function initPost() {
  const gl = out.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const pg = gl.createProgram(); gl.attachShader(pg, vs); gl.attachShader(pg, fs); gl.linkProgram(pg);
  if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) return null;
  gl.useProgram(pg);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pg, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const U = {};
  ['uTex', 'uRes', 'uTime', 'uCA', 'uGlitch', 'uFlash', 'uGrain', 'uVig', 'uZoom', 'uBloom', 'uSeed'].forEach((n) => (U[n] = gl.getUniformLocation(pg, n)));
  gl.uniform1i(U.uTex, 0);
  gl.uniform2f(U.uRes, W, H);
  gl.viewport(0, 0, W, H);
  return {
    render(p, t) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.uniform1f(U.uTime, t); gl.uniform1f(U.uCA, p.ca); gl.uniform1f(U.uGlitch, p.glitch);
      gl.uniform1f(U.uFlash, p.flash); gl.uniform1f(U.uGrain, p.grain); gl.uniform1f(U.uVig, p.vig);
      gl.uniform1f(U.uZoom, p.zoom); gl.uniform1f(U.uBloom, p.bloom); gl.uniform1f(U.uSeed, p.seed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
const post = initPost();
const out2d = post ? null : out.getContext('2d');
function renderAt(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const p = drawFrame(t);
  if (post) post.render(p, t);
  else {
    out2d.drawImage(cv, 0, 0);
    if (p.flash > 0) { out2d.globalAlpha = p.flash; out2d.fillStyle = '#fff'; out2d.fillRect(0, 0, W, H); out2d.globalAlpha = 1; }
  }
}

/* ---------------- fonts ---------------- */
async function loadFonts() {
  const tasks = [];
  try {
    const ff = new FontFace('PretendardV', 'url(https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2)', { weight: '45 920' });
    document.fonts.add(ff); tasks.push(ff.load());
  } catch (e) { /* fall back to system Korean font */ }
  ['500', '700', '800'].forEach((w) => tasks.push(document.fonts.load(`${w} 20px "JetBrains Mono"`, 'A0')));
  await Promise.race([Promise.allSettled(tasks), new Promise((r) => setTimeout(r, 10000))]);
}

/* ---------------- player ---------------- */
const $ = (id) => document.getElementById(id);
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
  document.body.classList.add('playing');
  $('overlay').classList.add('hidden');
  syncUI();
}
function pause() {
  if (!S.playing) return;
  S.offset = curT();
  S.src.onended = null; try { S.src.stop(); } catch (e) {}
  S.src = null; S.playing = false; S.dirty = true;
  document.body.classList.remove('playing');
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
  let vconf = { codec: 'avc1.640033', width: W, height: H, bitrate: 8e6, bitrateMode: 'variable', framerate: fps, avc: { format: 'avc' } };
  if (!(await VideoEncoder.isConfigSupported(vconf)).supported) vconf = { ...vconf, codec: 'avc1.64002A' };
  let acodec = 'aac', aconf = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 256000 };
  if (!(await AudioEncoder.isConfigSupported(aconf)).supported) { acodec = 'opus'; aconf = { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }; }
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H, frameRate: fps },
    audio: { codec: acodec, numberOfChannels: 2, sampleRate: 48000 },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  let err = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (err = e) });
  venc.configure(vconf);
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => (err = e) });
  aenc.configure(aconf);
  const buf = S.buf, sr = buf.sampleRate, L = buf.getChannelData(0), R = buf.getChannelData(1);
  const total = Math.floor(DUR * sr);
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
    const vf = new VideoFrame(out, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) });
    venc.encode(vf, { keyFrame: f % (fps * 2) === 0 });
    vf.close();
    if (venc.encodeQueueSize > 6) await new Promise((r) => { const chk = () => (venc.encodeQueueSize <= 2 ? r() : setTimeout(chk, 1)); chk(); });
    if (f % 15 === 0) { onProgress(f / N); await new Promise((r) => setTimeout(r, 0)); }
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
    a.href = URL.createObjectURL(blob); a.download = 'hyundai-marine-001450.mp4';
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
window.__audioStats = () => {
  const b = S.buf, sr = b.sampleRate, L = b.getChannelData(0), R = b.getChannelData(1);
  const sect = [[0, 16, 'hook'], [16, 48, 'dropA'], [48, 80, 'grooveB'], [80, 96, 'dropC'], [96, 112, 'stop'], [112, 128, 'break'], [128, 136, 'build'], [136, 144, 'final'], [144, 152, 'under'], [152, 160, 'slogan'], [160, 172, 'outro']];
  const res = { peakBefore: b._peakBefore, sections: {} };
  for (const [a, z, n] of sect) {
    let s = 0, pk = 0; const i0 = Math.floor(a * SPB * sr), i1 = Math.min(L.length, Math.floor(z * SPB * sr));
    for (let i = i0; i < i1; i++) { const m = (L[i] + R[i]) / 2; s += m * m; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
    res.sections[n] = { rmsDb: +(10 * Math.log10(s / (i1 - i0) + 1e-12)).toFixed(1), peak: +pk.toFixed(3) };
  }
  return res;
};
window.__wavChunk = null;

/* ---------------- boot ---------------- */
async function boot() {
  const qs = new URLSearchParams(location.search);
  const st = $('status');
  st.textContent = '폰트 불러오는 중…';
  await loadFonts();
  DOTS = makeDots();
  S.offset = qs.has('t') ? parseFloat(qs.get('t')) : 0;
  renderAt(qs.has('t') ? S.offset : 18.6 * SPB);
  window.__fontsReady = true;
  if (qs.has('noaudio')) { window.__ready = true; requestAnimationFrame(loop); return; }
  st.textContent = '사운드트랙 합성 중…';
  await new Promise((r) => setTimeout(r, 30));
  const t0 = performance.now();
  S.buf = await renderSong();
  ENERGY = analyzeEnergy(S.buf);
  console.log(`audio rendered in ${Math.round(performance.now() - t0)}ms, peak before norm ${S.buf._peakBefore.toFixed(3)}`);
  S.ready = true;
  st.textContent = '';
  document.body.classList.add('ready');
  window.__ready = true;
  if (!qs.has('t')) renderAt(18.6 * SPB);
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
[[0, '훅'], [16, '타이틀'], [24, '01'], [48, '02'], [64, '03'], [80, '04'], [96, '05'], [112, '06'], [136, '점수'], [144, '리스크'], [152, '결론']].forEach(([b, l]) => {
  const s = document.createElement('button');
  s.className = 'mark'; s.style.left = `${((b * SPB) / DUR) * 100}%`; s.title = l; s.textContent = l;
  s.addEventListener('click', () => seek(b * SPB + 0.001));
  marks.appendChild(s);
});
boot();
