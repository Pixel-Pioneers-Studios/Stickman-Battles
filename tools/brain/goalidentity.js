'use strict';
/*
 * tools/brain/goalidentity.js — does widening a checkpoint for the objective inputs leave it unchanged? DEV ONLY.
 *
 * Widens the checkpoint's input layer to Brain.OBS_DIM the way train.js does (zero weights on the new
 * inputs), then runs the original and the widened net through the page's Brain.forward on random
 * observations with random objective one-hots, memory carried. The original net also gets the full
 * OBS_DIM vector, so it checks that a narrow net ignores the trailing inputs. Exit 0 when max |diff| < 1e-5.
 *
 * Usage: node tools/brain/goalidentity.js [--ckpt=data/brain/latest.json] [--n=200] [--port=8144]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const { MLP } = require('./ppo');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8144, N = parseInt(args.n, 10) || 200;
const ck = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.ckpt || 'data/brain/latest.json'), 'utf8'));

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    fs.createReadStream(fp).pipe(r);
  }).listen(PORT);
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--mute-audio', '--disable-gpu'] });
  let max = -1;
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 180000 });
    await new Promise(r => setTimeout(r, 2500));
    const D = await page.evaluate(() => Brain.OBS_DIM);
    // Same widening as train.js.
    const wide = MLP.fromJSON(ck.pi), old = wide.sizes[0], nOut = wide.sizes[1];
    if (old < D) {
      const W = new Float32Array(nOut * D);
      for (let o = 0; o < nOut; o++) W.set(wide.W[0].subarray(o * old, o * old + old), o * D);
      wide.W[0] = W; wide.sizes = [D, ...wide.sizes.slice(1)];
    }
    max = await page.evaluate((pi, piWide, D, n) => {
      const a = Brain.loadNet(pi), b = Brain.loadNet(piWide), ha = Brain.newState(a), hb = Brain.newState(b);
      let m = 0;
      for (let t = 0; t < n; t++) {
        const x = new Float32Array(D);
        for (let i = 0; i < D; i++) x[i] = Math.random() * 2 - 1;
        x.fill(0, D - 3); const g = Math.floor(Math.random() * 4); if (g > 0) x[D - 4 + g] = 1;
        const la = Brain.forward(a, x, ha), lb = Brain.forward(b, x, hb);
        for (let i = 0; i < la.length; i++) m = Math.max(m, Math.abs(la[i] - lb[i]));
      }
      return m;
    }, ck.pi, wide.toJSON(), D, N);
    console.log(`identity: input ${old} -> ${D}, ${N} observations, max abs logit diff ${max.toExponential(2)} ${max < 1e-5 ? 'PASS' : 'FAIL'}`);
  } finally { await browser.close(); server.close(); }
  process.exit(max >= 0 && max < 1e-5 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
