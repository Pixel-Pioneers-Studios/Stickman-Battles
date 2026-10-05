'use strict';
/*
 * tools/brain/hunteval.js — what has the hunter found? DEV ONLY.
 *
 * The frozen target plays its top choice (as it does when it drives Sovereign)
 * against two challengers from the same seeds and the same random class kits:
 *   mirror  the target itself, also top choice — the ~50% baseline
 *   hunter  the hunter checkpoint, top choice
 * Win rate is the headline. The per-minute stat table shows HOW the hunter wins:
 * the rows that moved most against the mirror are the hole it is exploiting.
 *
 * Usage: node tools/brain/hunteval.js [--eps=100] [--seed=1]
 *        [--ckpt=data/brain-hunter/latest.json] [--target=data/brain-hunter/target.json]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8129;
const EPS = parseInt(args.eps, 10) || 100, SEED = parseInt(args.seed, 10) || 1;
const load = p => { const j = JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8')); return { pi: j.pi || j, iter: j.iter }; };
const HUNTER = load(args.ckpt || 'data/brain-hunter/latest.json');
const TARGET = load(args.target || 'data/brain-hunter/target.json');

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
    args: ['--no-sandbox', '--mute-audio', '--disable-gpu'], timeout: 180000, protocolTimeout: 3600000 });
  try {
    const page = await browser.newPage();
    // Only the local game: a CDN that stops answering (cdnjs hung for 17 min on Oct 4)
    // holds the load event forever and every worker times out. GSAP is optional in-game.
    await page.setRequestInterception(true);
    page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 180000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.evaluate(() => { try { backToHome(); } catch (e) {} });
    console.log(`Hunter iteration ${HUNTER.iter} vs target iteration ${TARGET.iter}, ${EPS} matches per arm, seed ${SEED}, both top choice`);
    const res = await page.evaluate((hunter, target, eps, seed) => {
      const rnd = Math.random;
      const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const spec = { type: 'self', label: 'target', greedy: true, brainKit: 'randomClass', kit: 'randomClass' };
      // Throwaway matches: the first rollout in a fresh page is not reproducible (lazy init).
      Math.random = seeded(seed);
      Brain.rollout({ weights: target, hunt: target, maxFrames: 7200, opponents: [spec], episodes: 2, greedy: true });
      const out = {};
      for (const [arm, w] of [['mirror', target], ['hunter', hunter]]) {
        Math.random = seeded(seed * 7919);
        const r = Brain.rollout({ weights: w, hunt: target, maxFrames: 7200, opponents: [spec], episodes: eps, greedy: true });
        const a = { win: 0, k: 0, d: 0, fr: 0, stats: {} };
        for (const e of r.episodes) {
          a.win += e.win; a.k += e.oLost; a.d += e.bLost; a.fr += e.frames;
          for (const k in e.stats) a.stats[k] = (a.stats[k] || 0) + e.stats[k];
        }
        out[arm] = a;
      }
      Math.random = rnd;
      return out;
    }, HUNTER.pi, TARGET.pi, EPS, SEED);
    const M = res.mirror, H = res.hunter;
    const se = Math.sqrt(0.25 / EPS) * 100;
    console.log(`\n  mirror  win ${(100 * M.win / EPS).toFixed(0)}%  stocks taken/lost ${M.k}/${M.d}`);
    console.log(`  hunter  win ${(100 * H.win / EPS).toFixed(0)}%  stocks taken/lost ${H.k}/${H.d}   (one standard error ~${se.toFixed(0)} pts)`);
    const perMin = (a, k) => a.stats[k] / Math.max(1, a.fr) * 3600;
    const rows = Object.keys(H.stats).filter(k => k !== 'frames').map(k => {
      const m = perMin(M, k), h = perMin(H, k);
      return { k, m, h, lr: Math.log((h + 0.5) / (m + 0.5)) };
    }).sort((x, y) => Math.abs(y.lr) - Math.abs(x.lr));
    console.log('\n  per minute of match, sorted by how far the hunter moved from the mirror');
    console.log('  stat               mirror    hunter');
    for (const r of rows) console.log(`  ${r.k.padEnd(17)} ${r.m.toFixed(1).padStart(7)}   ${r.h.toFixed(1).padStart(7)}`);
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
