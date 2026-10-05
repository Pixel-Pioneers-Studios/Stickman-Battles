'use strict';
/*
 * tools/brain/readeval.js — does the in-match read (js/smb-brain-read.js) help? DEV ONLY.
 *
 * Same seeds, read OFF vs ON, Sovereign's net playing its top choice:
 *   hunter  Sovereign (the hunter's target) vs the hunter. The hunter beat him by
 *           exploiting his guard; a working read should cut its win rate.
 *   styles  Sovereign vs each fixed playstyle (tools/human-proxy.js). These keep
 *           habits on purpose, which is what a read is for.
 * Win rates are from the reader's side. The read's own counters show what it did.
 *
 * Usage: node tools/brain/readeval.js [--eps=40] [--seed=1] [--only=hunter|styles]
 *        [--sov=data/brain-hunter/target.json] [--hunter=data/brain-hunter/latest.json]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8131;
const EPS = parseInt(args.eps, 10) || 40, SEED = parseInt(args.seed, 10) || 1;
const load = p => { const j = JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8')); return { pi: j.pi || j, iter: j.iter }; };
const CFG = args.cfg ? JSON.parse(args.cfg) : {};   // e.g. --cfg='{"raiseP":0.6}'
const SOV = load(args.sov || 'data/brain-hunter/target.json');
const HUNTER = load(args.hunter || 'data/brain-hunter/latest.json');

// Same table as adapt.js / train.js, kept in sync by hand.
const HUMAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'human-proxy-params-v4.json'), 'utf8')); delete HUMAN.hpMult;
const STYLES = {
  turtle:   { spacing: 110, pokeRate: 0.25, shieldUse: 0.85, whiffPunish: 0.9, offenseRead: 0.5, jumpInRate: 0, airHopRate: 0,
              evadeJump: 0.15, comboFollow: 0.4, abilityRate: 0.15 },
  rushdown: { spacing: 35, decisionEvery: 2, pokeRate: 0.95, comboFollow: 0.95, retreatDiscipline: 0, shieldUse: 0,
              evadeJump: 0.15, jumpInRate: 0.15, abilityRate: 0.6, superRate: 1 },
  aerial:   { spacing: 80, airHopRate: 0.6, jumpInRate: 0.6, aboveAttackRate: 0.95, fastFallRate: 0.7, evadeJump: 0.9,
              doubleJumpEvade: 0.9, shieldUse: 0 },
  counter:  { spacing: 150, pokeRate: 0.1, whiffPunish: 1, offenseRead: 0.9, antiAir: 0.95, antiAirDescent: 0.9, readRate: 0.6,
              shieldUse: 0.2, jumpInRate: 0, airHopRate: 0.02, comboFollow: 0.8 },
  human:    HUMAN,
};

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
    args: ['--no-sandbox', '--mute-audio', '--disable-gpu'], timeout: 180000, protocolTimeout: 7200000 });
  try {
    const page = await browser.newPage();
    // Only the local game (a hung CDN holds the load event forever; GSAP is optional).
    await page.setRequestInterception(true);
    page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 180000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.evaluate(() => { try { backToHome(); } catch (e) {} });
    await page.addScriptTag({ path: path.join(ROOT, 'tools', 'human-proxy.js') });
    console.log(`Sovereign iteration ${SOV.iter}, hunter iteration ${HUNTER.iter}, ${EPS} matches per arm, seed ${SEED}`);

    const run = (label, fnArgs) => page.evaluate((a) => {
      const rnd = Math.random;
      const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      BrainRead.enabled = true;
      Object.assign(BrainRead.CFG, a.cfg || {});
      // Throwaway match: the first rollout in a fresh page is not reproducible (lazy init).
      Math.random = seeded(a.seed);
      Brain.rollout(Object.assign({}, a.opts, { episodes: 2 }));
      const out = {};
      for (const read of [null, a.side]) {
        Math.random = seeded(a.seed * 7919 + a.salt);
        const r = Brain.rollout(Object.assign({}, a.opts, { episodes: a.eps, read }));
        const s = { win: 0, k: 0, d: 0, fr: 0, dt: 0, tt: 0, read: {}, stats: {} };
        for (const e of r.episodes) {
          s.win += e.win; s.k += e.oLost; s.d += e.bLost; s.fr += e.frames;
          s.dt += e.stats.dmgDealt; s.tt += e.stats.dmgTaken;
          for (const k in e.stats) s.stats[k] = (s.stats[k] || 0) + e.stats[k];
          if (e.read) for (const k in e.read) s.read[k] = (s.read[k] || 0) + e.read[k];
        }
        out[read ? 'on' : 'off'] = s;
      }
      Math.random = rnd;
      return out;
    }, fnArgs);

    const pct = (x, n) => (100 * x / n).toFixed(0).padStart(3) + '%';
    const perMin = (s, v) => (v / Math.max(1, s.fr) * 3600).toFixed(1);
    const readLine = s => Object.entries(s.read).map(([k, v]) => `${k} ${perMin(s, v)}`).join('  ');

    if (args.only !== 'styles') {
      // Sovereign is the opponent net here (hunt mode), so the read goes on the 'opp' side.
      const spec = { type: 'self', label: 'target', greedy: true, brainKit: 'randomClass', kit: 'randomClass' };
      const r = await run('hunter', { cfg: CFG, seed: SEED, salt: 0, eps: EPS, side: 'opp',
        opts: { weights: HUNTER.pi, hunt: SOV.pi, maxFrames: 7200, opponents: [spec], greedy: true } });
      console.log('\nSovereign vs the hunter (Sovereign win%, read off -> on)');
      for (const arm of ['off', 'on']) {
        const s = r[arm];
        // Rollout stats are the hunter's (the brain side): its blocks/hitsTaken are Sovereign's offense.
        console.log(`  read ${arm.padEnd(3)}  Sovereign win ${pct(EPS - s.win, EPS)}  stocks ${s.d}/${s.k}  ` +
          `hunter parries/min ${perMin(s, s.stats.parries || 0)}  hunter blocks/min ${perMin(s, s.stats.blocks || 0)}`);
        if (arm === 'on') console.log(`           read per min: ${readLine(s)}`);
      }
    }
    if (args.only !== 'hunter') {
      console.log('\nSovereign vs fixed styles (Sovereign win%, dmg dealt/taken; read off -> on)');
      let salt = 1;
      for (const [k, p] of Object.entries(STYLES)) {
        const spec = { type: 'style', label: k, params: p, hpMult: 1.5, brainKit: 'randomClass' };
        if (args.styles && !String(args.styles).split(',').includes(k)) continue;
        const r = await run(k, { cfg: CFG, seed: SEED, salt: salt++ * 104729, eps: EPS, side: 'brain',
          opts: { weights: SOV.pi, maxFrames: 7200, opponents: [spec], greedy: true } });
        const ratio = s => (s.dt / Math.max(1, s.tt)).toFixed(2);
        console.log(`  ${k.padEnd(9)} ${pct(r.off.win, EPS)} -> ${pct(r.on.win, EPS)}   ratio ${ratio(r.off)} -> ${ratio(r.on)}   ` +
          `parries/min ${perMin(r.off, r.off.stats.parries || 0)} -> ${perMin(r.on, r.on.stats.parries || 0)}`);
        console.log(`            read per min: ${readLine(r.on)}`);
      }
    }
    console.log(`\n  one standard error on a win rate ~${(Math.sqrt(0.25 / EPS) * 100).toFixed(0)} pts`);
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
