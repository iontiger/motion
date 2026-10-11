// Minimal Chrome DevTools Protocol driver (no dependencies).
// Launches headless Google Chrome and exposes evaluate()/navigate() helpers.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9333 + Math.floor(Math.random() * 400), width = 1920, height = 1080 } = {}) {
  const userDir = mkdtempSync(join(process.env.SCRATCH || tmpdir(), 'chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required',
    '--allow-file-access-from-files',
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-webgpu',
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    '--mute-audio',
    'about:blank',
  ], { stdio: 'ignore', detached: false });

  let wsUrl = null;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    await sleep(100);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch {}
  }
  if (!wsUrl) { proc.kill(); throw new Error('Chrome did not start'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(typeof m.data === 'string' ? m.data : m.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method && listeners.has(msg.method)) {
      for (const fn of listeners.get(msg.method)) fn(msg.params);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  on('Runtime.consoleAPICalled', (p) => {
    if (process.env.CDP_QUIET) return;
    const args = p.args.map((a) => a.value ?? a.description ?? '').join(' ');
    console.log(`[page:${p.type}]`, args);
  });
  on('Runtime.exceptionThrown', (p) => console.log('[page:exception]', p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  async function evaluate(expression, { timeout = 600000 } = {}) {
    const r = await Promise.race([
      send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
      sleep(timeout).then(() => { throw new Error('evaluate timeout: ' + expression.slice(0, 80)); }),
    ]);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async function navigate(url) {
    const loaded = new Promise((res) => on('Page.loadEventFired', res));
    await send('Page.navigate', { url });
    await loaded;
  }
  async function waitFor(expr, ms = 60000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await evaluate(`!!(${expr})`)) return true;
      await sleep(150);
    }
    throw new Error('waitFor timeout: ' + expr);
  }
  async function close() {
    try { ws.close(); } catch {}
    proc.kill('SIGTERM');
    await sleep(400);
    try { proc.kill('SIGKILL'); } catch {}
    try { rmSync(userDir, { recursive: true, force: true }); } catch {}
  }
  return { send, on, evaluate, navigate, waitFor, close };
}
