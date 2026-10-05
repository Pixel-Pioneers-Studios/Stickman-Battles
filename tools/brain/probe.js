'use strict';
// tools/brain/probe.js — one short rollout with a random net; prints errors and a trace. DEV ONLY.
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8121;
const { MLP } = require('./ppo');
(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p); if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(fp).pipe(r); }).listen(PORT);
  const b = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--mute-audio'] });
  const page = await b.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
  const ck = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).pi : null;
  const D = await page.evaluate(() => Brain.OBS_DIM);
  const w = ck || new MLP([D, 128, 128, 11], 0.01).toJSON();
  const opp = process.argv[3] || 'idle';
  const r = await page.evaluate((w, opp) => {
    const t0 = performance.now();
    const out = Brain.rollout({ weights: w, steps: 1200, opponents: [{ type: opp }] });
    return { ms: performance.now() - t0, errs: out.errs, eps: out.episodes.map(e => ({ len: e.len, frames: e.frames, bLost: e.bLost, oLost: e.oLost, win: e.win, stats: e.stats })) };
  }, w, opp);
  console.log(JSON.stringify(r, null, 1));
  await b.close(); s.close();
})();
