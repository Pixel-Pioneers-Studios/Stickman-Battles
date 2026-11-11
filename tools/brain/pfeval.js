'use strict';
/*
 * tools/brain/pfeval.js — Layer 2 portfolio eval. DEV ONLY.
 *
 * The brain is a portfolio of nets (js/smb-brain.js rollout opts.portfolio). Arms: each net alone for the
 * whole match ('fixed k'), and Thompson sampling between them on this match's exchanges ('ts'). Every
 * opponent is a frozen net playing its top choice. Adapting = 'ts' beats the best single net it could
 * have committed to blind (the first net, the shipped one), and its exchanges improve as the match goes on.
 *
 * Usage: node tools/brain/pfeval.js --nets=data/brain/latest.json,other.json[,...] --opps=h4.json[,...]
 *        [--eps=100] [--seed=1] [--lives=5] [--seg=600] [--sigma=0.25] [--arms=fixed,ts] [--port=8170] [--json=out.json]
 *        [--oracle=back|guard|jump]  ceiling test: the brain sees the opponent's button before it is pressed
 *        [--startup=6]  override the game's swing startup with a flat N frames (SIM_SWING_STARTUP; 0 = the old frame-1 hits)
 *        [--trace]  keep one row per decision per match in the json (Brain.rollout opts.trace)
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8170;
const EPS = parseInt(args.eps, 10) || 100, SEED = parseInt(args.seed, 10) || 1, LIVES = parseInt(args.lives, 10) || 5;
const SEG = parseInt(args.seg, 10) || 600, SIGMA = +args.sigma || 0.25;
const ARMSET = String(args.arms || 'fixed,ts').split(',');
const load = p => { const j = JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8')); return { pi: j.pi || j, iter: j.iter, name: path.relative(ROOT, p) }; };
const NETS = String(args.nets).split(',').map(load), OPPS = String(args.opps).split(',').map(load);

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
  const results = [];
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 180000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.evaluate(() => { try { backToHome(); } catch (e) {} });
    await page.evaluate((nets, st) => { window._pfW = nets; window._pfStartup = st; }, NETS.map(n => n.pi), args.startup === undefined ? null : parseInt(args.startup, 10) || 0);
    const arms = [];
    if (ARMSET.includes('fixed')) NETS.forEach((n, k) => arms.push({ name: `fixed ${k} (${n.iter})`, pick: k }));
    if (ARMSET.includes('ts')) arms.push({ name: 'ts', pick: 'ts' });
    console.log(`Portfolio: ${NETS.map((n, k) => `${k}=${n.name} (${n.iter})`).join(', ')}`);
    console.log(`${EPS} matches per arm per opponent, ${LIVES} stocks, segment ${SEG / 60} s, seed ${SEED}\n`);
    for (const opp of OPPS) {
      console.log(`vs ${opp.name} (${opp.iter})`);
      await page.evaluate(w => { window._pfOpp = w; }, opp.pi);
      for (const arm of arms) {
        const t0 = Date.now();
        const r = await page.evaluate((pick, eps, seed, lives, seg, sigma, trace, oracle) => {
          if (window._pfStartup === null) delete window.SIM_SWING_STARTUP; else window.SIM_SWING_STARTUP = window._pfStartup;
          const rnd = Math.random;
          const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
          const spec = { type: 'self', label: 'target', greedy: true, brainKit: 'randomClass', kit: 'randomClass', weights: window._pfOpp };
          Math.random = seeded(seed * 7919);
          const out = Brain.rollout({ weights: window._pfW[0], maxFrames: 60 * 60 * lives, lives, opponents: [spec], episodes: eps, greedy: true,
            portfolio: { nets: window._pfW, pick, seg, sigma }, trace, oracle });
          Math.random = rnd;
          return out.episodes.map(e => ({ win: e.win, k: e.oLost, d: e.bLost, frames: e.frames, pf: e.pf, trace: e.trace, dodges: e.stats.oracleDodges || 0 }));
        }, arm.pick, EPS, SEED, LIVES, SEG, SIGMA, !!args.trace, args.oracle || null);
        const win = 100 * r.reduce((a, e) => a + e.win, 0) / r.length;
        const k = r.reduce((a, e) => a + e.k, 0), d = r.reduce((a, e) => a + e.d, 0);
        // Exchange per segment, first half of the match vs second half (by segment order).
        const early = [], late = [];
        for (const e of r) { const L = e.pf.log, h = L.length >> 1; L.forEach((s, i) => (i < h ? early : late).push(s[1])); }
        const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
        let use = '';
        if (arm.pick === 'ts') {
          const cnt = (from, to) => { const c = NETS.map(() => 0); let n = 0; for (const e of r) { const L = e.pf.log, h = L.length >> 1;
            L.slice(from === 0 ? 0 : h, to === 0 ? h : L.length).forEach(s => { c[s[0]]++; n++; }); } return c.map(x => (100 * x / Math.max(1, n)).toFixed(0)).join('/'); };
          use = `  net use early ${cnt(0, 0)}  late ${cnt(1, 1)}`;
        }
        console.log(`  ${arm.name.padEnd(18)} win ${win.toFixed(0).padStart(3)}%  stocks ${String(k).padStart(4)}/${String(d).padEnd(4)}  exchange early ${avg(early).toFixed(3)} late ${avg(late).toFixed(3)}${use}  dodges/match ${(r.reduce((a, e) => a + e.dodges, 0) / r.length).toFixed(0)}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
        results.push({ opp: opp.name, oppIter: opp.iter, arm: arm.name, win, k, d, early: avg(early), late: avg(late), eps: r.map(e => ({ win: e.win, k: e.k, d: e.d, log: e.pf.log, trace: e.trace })) });
      }
    }
    if (args.json) fs.writeFileSync(path.resolve(ROOT, args.json), JSON.stringify({ nets: NETS.map(n => n.name), seed: SEED, lives: LIVES, seg: SEG, sigma: SIGMA, results }) + '\n');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
