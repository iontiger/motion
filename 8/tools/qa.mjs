// QA: render contact sheets of frames at given times (s) + print audio stats.
// usage: node tools/qa.mjs <outDir> <sec,sec,...> [--full] [--audio]
import { launch } from './cdp.mjs';
import { serve } from './serve.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2];
const beats = (process.argv[3] || '').split(',').filter(Boolean).map(Number);
const full = process.argv.includes('--full');
const audio = process.argv.includes('--audio');
mkdirSync(outDir, { recursive: true });

const web = await serve(root);
const b = await launch();
try {
  await b.navigate(web.url + (process.env.QS || ''));
  await b.waitFor('window.__fontsReady', 30000);
  if (audio) {
    await b.waitFor('window.__ready', 120000);
    console.log(JSON.stringify(await b.evaluate('window.__audioStats()'), null, 1));
  }
  if (full) {
    for (const bt of beats) {
      const url = await b.evaluate(`window.__frame(${bt}, 0.92)`);
      writeFileSync(join(outDir, `f_${String(bt).replace('.', '_')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
  } else {
    // contact sheet: 3 columns of 640x360
    const per = 12;
    for (let s = 0; s < beats.length; s += per) {
      const chunk = beats.slice(s, s + per);
      const url = await b.evaluate(`(() => {
        const bs = ${JSON.stringify(chunk)};
        const cols = 3, tw = 640, th = 360, rows = Math.ceil(bs.length / cols);
        const sh = document.createElement('canvas'); sh.width = cols * tw; sh.height = rows * (th + 26);
        const x = sh.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, sh.width, sh.height);
        bs.forEach((bt, i) => {
          window.__renderAt(bt);
          const cx = (i % cols) * tw, cy = Math.floor(i / cols) * (th + 26);
          x.drawImage(document.getElementById('out'), cx, cy + 26, tw, th);
          x.fillStyle = '#3E3558'; x.font = '700 18px monospace'; x.fillText('t=' + bt + 's', cx + 8, cy + 19);
        });
        return sh.toDataURL('image/jpeg', 0.85);
      })()`);
      writeFileSync(join(outDir, `sheet_${s / per}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
  }
  console.log('done');
} finally {
  await b.close();
  web.close();
  process.exit(0);
}
