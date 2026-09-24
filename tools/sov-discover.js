'use strict';
/*
 * tools/sov-discover.js — LET HIM FIND IT. DEV ONLY.
 *
 * Every other lab tool measures a flag we wrote. This one measures nothing of
 * ours: it runs Sovereign through hundreds of FAIR matches (opponent on stock
 * stats, its own full AI, every legal weapon and class) with his memory carried
 * from match to match, and records what he concluded. Our only job is to write
 * that down — tools/sov-discoveries-doc.js turns the dumps into
 * docs/sovereign-discoveries.md.
 *
 * Several independent LINEAGES run in parallel, each from an empty dossier and
 * its own random stream. A conclusion one lineage reaches is a hypothesis; one
 * that every lineage reaches independently is a finding.
 *
 * His brain for the run: openLoadout (choose any weapon/class, learn from
 * results), infer + experiment (derive mechanics), inferAct (act on them).
 *
 * Usage:
 *   node tools/sov-discover.js --lineages=5 --matches=600
 *   node tools/sov-discover.js --worker --lineage=0 --matches=600 --port=8600 --out=DIR
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MATCHES  = parseInt(args.matches, 10)  || 600;
const LINEAGES = parseInt(args.lineages, 10) || 5;
const BASEPORT = parseInt(args.port, 10)     || 8600;
const BATCH    = 40;   // matches per page.evaluate — keeps each call far under the protocol timeout
const FLAGS    = (args.flags || 'openLoadout,infer,experiment,inferAct').split(',').filter(Boolean);
const log = (...a) => console.log('[discover]', ...a);

if (!args.worker) {
  // ── ORCHESTRATOR ──────────────────────────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = path.join(ROOT, 'data', 'discover', stamp);
  fs.mkdirSync(out, { recursive: true });
  log(`${LINEAGES} lineages x ${MATCHES} matches -> ${path.relative(ROOT, out)}`);
  const t0 = Date.now();
  Promise.all(Array.from({ length: LINEAGES }, (_, i) => new Promise(resolve => {
    const p = spawn('node', [__filename, '--worker', `--lineage=${i}`, `--matches=${MATCHES}`,
                             `--port=${BASEPORT + i}`, `--out=${out}`, `--flags=${FLAGS.join(',')}`],
                    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    p.stdout.on('data', d => { const s = String(d); if (/lineage \d+ (at|done)/.test(s)) process.stdout.write(s); });
    p.stderr.on('data', d => { tail = (tail + d).slice(-600); });
    p.on('close', code => { if (code) log(`lineage ${i} FAILED: ${tail.trim().slice(-300)}`); resolve(code); });
  }))).then(() => {
    log(`done in ${((Date.now() - t0) / 60000).toFixed(1)}m — now: node tools/sov-discoveries-doc.js ${path.relative(ROOT, out)}`);
  });
  return;
}

// ── WORKER: one lineage ─────────────────────────────────────────────────────
const LINEAGE = parseInt(args.lineage, 10) || 0;
const PORT = parseInt(args.port, 10) || 8600;
const OUT = args.out;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2' };

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }
  const server = await new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    s.on('error', e => { console.error(`cannot listen on :${PORT} — ${e.code}`); process.exit(1); });
    s.listen(PORT, () => resolve(s));
  });
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 600000,
    args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGEERR', e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => typeof SovereignMK2 !== 'undefined' && typeof SMK2Trainer !== 'undefined' &&
    typeof SovDossier !== 'undefined' && typeof SMK2_TUNE !== 'undefined', { timeout: 180000 });

  // Fresh memory, his flags, and a lineage-specific random stream. Seeded so a
  // lineage can be re-run exactly; distinct per lineage so they are independent.
  await page.evaluate((flags, lineage) => {
    SovDossier.reset();
    for (const f of flags) SMK2_TUNE[f] = true;
    SMK2_TUNE.innateArsenal = false;   // the lab must never feed on its own previous output
    let s = (0x9E3779B9 ^ Math.imul(lineage + 1, 0x85EBCA6B)) >>> 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    window.__discHist = [];
  }, FLAGS, LINEAGE);

  for (let done = 0; done < MATCHES; done += BATCH) {
    const n = Math.min(BATCH, MATCHES - done);
    await page.evaluate((start, n) => {
      // Opponents cycle through every legal weapon so no kit is under-sampled;
      // class is random. Stock stats, full AI, no policy (see `opp` in _runMatch).
      // Opponents a real Sovereign fight can contain: ranged weapons and the
      // ranged-locked classes are barred from every boss fight.
      const W = WEAPON_KEYS.filter(k => WEAPONS[k] && WEAPONS[k].type !== 'ranged');
      const C = Object.keys(CLASSES).filter(k => k !== 'megaknight' && k !== 'gunner' && k !== 'archer');
      const P = SovereignMK2.prototype, origPick = P._pickOpenLoadout;
      let picked;
      P._pickOpenLoadout = function () { const lo = origPick.apply(this, arguments); picked = lo; return lo; };
      try {
        for (let i = 0; i < n; i++) {
          const m = start + i;
          const opp = { w: W[m % W.length], c: C[Math.floor(Math.random() * C.length)] };
          picked = null;
          const r = SMK2Trainer.runMatch(null, 1, (m + 1) * 7919, { duel: true, noBuff: true, opp });
          window.__discHist.push({
            m, ow: opp.w, oc: opp.c, w: picked && picked.wk, c: picked && (picked.clsKey || 'none'),
            sovLives: r ? r.sovLivesLeft : null, oppDeaths: r ? r.oppDeaths : null,
            dealt: r ? r.dmgDealt : null, taken: r ? r.dmgTaken : null, frames: r ? r.framesRun : null,
          });
        }
      } finally { P._pickOpenLoadout = origPick; }
    }, done, n);
    console.log(`lineage ${LINEAGE} at ${done + n}/${MATCHES}`);
  }

  const dump = await page.evaluate(() => {
    const mech = SovDossier.mechPrior();
    const P = SovereignMK2.prototype;
    const probe = { _infStats: mech };
    return {
      arsenal: SovDossier.arsenalPrior(),
      mech: mech ? { n: mech.n, miss: mech.miss, missHitTotal: mech.missHitTotal } : null,
      failRules: mech ? P._inferRules.call(probe, true) : [],
      hurtRules: mech ? P._inferHurtRules.call(probe, true) : [],
      hist: window.__discHist,
      weapons: WEAPON_KEYS.filter(k => WEAPONS[k]),
      classes: Object.keys(CLASSES).filter(k => k !== 'megaknight'),
    };
  });
  dump.lineage = LINEAGE; dump.flags = FLAGS; dump.matches = MATCHES; dump.at = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, `lineage-${LINEAGE}.json`), JSON.stringify(dump));
  console.log(`lineage ${LINEAGE} done`);
  await browser.close(); server.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
