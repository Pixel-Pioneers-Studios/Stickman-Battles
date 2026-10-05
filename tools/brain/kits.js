'use strict';
/*
 * tools/brain/kits.js — how well the latest checkpoint fights with each weapon. DEV ONLY.
 *
 * The brain never picks its kit (training assigns it), so "which weapon does it
 * like" can only mean "which weapon does it win with". Every weapon gets the same
 * opponent and the same number of matches.
 *
 * Usage: node tools/brain/kits.js [--vs=expert] [--eps=8] [--oppw=sword]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8125;
const VS = args.vs || 'expert', EPS = parseInt(args.eps, 10) || 8, OPPW = args.oppw || 'sword';

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    fs.createReadStream(fp).pipe(r);
  }).listen(PORT);
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--mute-audio'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 90000 });
    await new Promise(r => setTimeout(r, 2500));
    const ck = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'brain', 'latest.json'), 'utf8'));
    const rows = await page.evaluate((w, vs, eps, oppw) => {
      const out = [];
      for (const wk of WEAPON_KEYS) {
        const spec = { type: vs, brainKit: { w: wk, c: 'none' }, kit: { w: oppw, c: 'none' } };
        const r = Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: Array(eps).fill(spec), episodes: eps });
        let win = 0, k = 0, d = 0, dealt = 0, taken = 0, frames = 0;
        for (const e of r.episodes) { win += e.win; k += e.oLost; d += e.bLost; dealt += e.stats.dmgDealt; taken += e.stats.dmgTaken; frames += e.frames; }
        out.push({ w: wk, n: r.episodes.length, win: win / r.episodes.length, k, d, dealtPerMin: dealt / frames * 3600, takenPerMin: taken / frames * 3600 });
      }
      return out;
    }, ck.pi, VS, EPS, OPPW);
    rows.sort((a, b) => b.win - a.win || (b.k - b.d) - (a.k - a.d));
    console.log(`Checkpoint iteration ${ck.iter}, each weapon (no class) vs ${VS} with ${OPPW}, ${EPS} matches each`);
    console.log('weapon          win%   KOs-deaths   dmg dealt/min   dmg taken/min');
    for (const r of rows) console.log(`${r.w.padEnd(15)} ${(r.win * 100).toFixed(0).padStart(4)}%   ${String(r.k).padStart(3)}-${String(r.d).padEnd(6)}   ${r.dealtPerMin.toFixed(0).padStart(9)}       ${r.takenPerMin.toFixed(0).padStart(9)}`);
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
