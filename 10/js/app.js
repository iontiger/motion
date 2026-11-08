'use strict';
/* ============================================================
   APP — 2D output, player (audio-clock synced), MP4 export
   ============================================================ */
const out = document.getElementById('out');
out.width = W; out.height = H;
const cv = document.createElement('canvas');
cv.width = W; cv.height = H;
g = cv.getContext('2d', { alpha: false });

/* ---------------- output (plain 2D; a white flash for the splashes) ---------------- */
const post = null;
const out2d = out.getContext('2d');
function renderAt(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const p = drawFrame(t);
  out2d.drawImage(cv, 0, 0);
  if (p.flash > 0) { out2d.globalAlpha = p.flash; out2d.fillStyle = '#FFFFFF'; out2d.fillRect(0, 0, W, H); out2d.globalAlpha = 1; }
}

/* ---------------- fonts ---------------- */
async function loadFonts() {
  const faces = [['PretendardV', 'fonts/pretendard-sub.woff2', { weight: '45 920' }], ['HahmletV', 'fonts/hahmlet-sub.woff2', { weight: '100 900' }], ['NanumPen', 'fonts/nanumpen-sub.woff2', {}], ['FrauncesI', 'fonts/fraunces-italic-sub.woff2', { weight: '500 900', style: 'italic' }]];
  const tasks = faces.map(([fam, url, d]) => {
    try { const ff = new FontFace(fam, `url(${url})`, d); document.fonts.add(ff); return ff.load(); } catch (e) { return Promise.resolve(); }
  });
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
async function exportMP4(fps = 60, onProgress = () => {}, f0 = 0, f1 = null) {
  if (!window.VideoEncoder || !window.Mp4Muxer) throw new Error('이 브라우저는 WebCodecs MP4 내보내기를 지원하지 않습니다 (Chrome 권장).');
  const { Muxer, ArrayBufferTarget } = Mp4Muxer;
  // H.264 where the browser has it (Chrome); VP9-in-MP4 otherwise (e.g. open-source Chromium builds)
  const base = { width: W, height: H, bitrate: 8e6, bitrateMode: 'variable', framerate: fps };
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
  const N = Math.round(DUR * fps), fEnd = f1 == null ? N : Math.min(N, f1);
  const px = new Uint8Array(4);
  for (let f = f0; f < fEnd; f++) {
    if (err) throw err;
    renderAt(f / fps);
    const vf = new VideoFrame(out, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) });
    venc.encode(vf, { keyFrame: f % (fps * 2) === 0 });
    vf.close();
    if (venc.encodeQueueSize > 6) await new Promise((r) => { const chk = () => (venc.encodeQueueSize <= 2 ? r() : setTimeout(chk, 1)); chk(); });
    if (f % 15 === 0) { onProgress((f - f0) / (fEnd - f0)); await new Promise((r) => setTimeout(r, 0)); }
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
    a.href = URL.createObjectURL(blob); a.download = 'the-door-is-open.mp4';
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
window.__startExport = (fps = 60, f0 = 0, f1 = null) => {
  window.__progress = 0; window.__mp4 = null; window.__exportErr = null;
  exportMP4(fps, (p) => (window.__progress = p), f0, f1)
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
  const b = S.buf, sr = b.sampleRate, L = b.getChannelData(0), R = b.getChannelData(Math.min(1, b.numberOfChannels - 1));
  const res = { duration: b.length / sr, sampleRate: sr, channels: b.numberOfChannels, sections: {} };
  SECTS.forEach((x, k) => {
    const a = x.t, z = k + 1 < SECTS.length ? SECTS[k + 1].t : DUR, n = `${k}:${x.name || 'END'}`;
    let s = 0, pk = 0; const i0 = Math.floor(a * sr), i1 = Math.min(L.length, Math.floor(z * sr));
    for (let i = i0; i < i1; i++) { const m = (L[i] + R[i]) / 2; s += m * m; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
    res.sections[n] = { rmsDb: +(10 * Math.log10(s / (i1 - i0) + 1e-12)).toFixed(1), peak: +pk.toFixed(3) };
  });
  return res;
};
window.__wavChunk = null;

/* ---------------- boot ---------------- */
const POSTER_T = 28.9; // the door swinging open on "Come on in," as the still preview
async function boot() {
  const qs = new URLSearchParams(location.search);
  const st = $('status');
  st.textContent = '폰트 불러오는 중…';
  await Promise.all([loadFonts(), loadImages()]);
  LAYOUTS = new Map(); // measure lyric layouts with the real fonts
  S.offset = qs.has('t') ? parseFloat(qs.get('t')) : 0;
  renderAt(qs.has('t') ? S.offset : POSTER_T);
  S.dirty = false; // keep the still preview until the viewer plays or seeks
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
  ENERGY = analyzeEnergy(S.buf);
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
SECTS.filter((x) => x.kind !== 'end').forEach((x, k) => {
  const s = document.createElement('button');
  s.className = 'mark'; s.style.left = `${(x.t / DUR) * 100}%`; s.title = x.name; s.textContent = x.name.replace('프리코러스', '프리').replace('마지막 후렴', '마지막');
  s.addEventListener('click', () => seek(Math.max(0, x.t - 0.2)));
  marks.appendChild(s);
});
boot();
