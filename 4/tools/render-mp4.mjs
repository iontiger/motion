// Render the motion piece to MP4 using headless Chrome + WebCodecs.
// usage: node tools/render-mp4.mjs [out.mp4] [fps]
import { launch } from './cdp.mjs';
import { serve } from './serve.mjs';
import { openSync, writeSync, closeSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(process.argv[2] || join(root, 'semiconductor-season.mp4'));
const fps = Number(process.argv[3] || 60);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

process.env.CDP_QUIET = '1';
const web = await serve(root);
const b = await launch();
try {
  await b.navigate(web.url + (process.env.QS || ''));
  await b.waitFor('window.__ready', 120000);
  const t0 = Date.now();
  await b.evaluate(`window.__startExport(${fps})`);
  let last = -1;
  for (;;) {
    await sleep(1000);
    const st = await b.evaluate('({ p: window.__progress, done: !!window.__mp4, err: window.__exportErr })');
    if (st.err) throw new Error(st.err);
    const pct = Math.floor(st.p * 100);
    if (pct !== last && pct % 5 === 0) { console.log(`render ${pct}%  (${((Date.now() - t0) / 1000).toFixed(0)}s)`); last = pct; }
    if (st.done) break;
  }
  const size = await b.evaluate('window.__mp4.length');
  const fd = openSync(outPath, 'w');
  const CH = 4 * 1024 * 1024;
  for (let i = 0; i < size; i += CH) {
    const b64 = await b.evaluate(`window.__chunk(${i}, ${CH})`);
    writeSync(fd, Buffer.from(b64, 'base64'));
  }
  closeSync(fd);
  console.log(`wrote ${outPath} (${(size / 1048576).toFixed(1)} MB) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
} catch (e) {
  console.error("render failed:", e.message);
  process.exitCode = 1;
} finally {
  await b.close();
  web.close();
  process.exit(process.exitCode || 0);
}
