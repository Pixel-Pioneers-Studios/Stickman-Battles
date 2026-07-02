'use strict';
/*
 * tools/sov-harness.js — headless SovereignMK2 combat measurement (DEV ONLY)
 *
 * Loads the real game page, instruments combat (swings / hits / damage / deaths
 * split by Sovereign vs bots), then drives the SMK2Trainer's headless matches
 * and reports per-level aggregates. Zero game-code changes — instrumentation is
 * done by wrapping Fighter.prototype.attack and window.dealDamage in-page.
 *
 * Usage:
 *   node tools/sov-harness.js [--bots=1,2,3,4] [--matches=6] [--port=8098] [--eval]
 *
 *   --bots     comma list of bot counts to stress          (default 1,2,3,4)
 *   --matches  matches per level                           (default 6)
 *   --eval     also run SMK2Trainer.evalVsDefault(2, 30)   (default off)
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const BOTS    = String(args.bots || '1,2,3,4').split(',').map(Number).filter(n => n > 0);
const MATCHES = parseInt(args.matches, 10) || 6;
const PORT    = parseInt(args.port, 10) || 8098;

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

const log = (...a) => console.log('[sov]', ...a);

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }

  const server = await startServer();
  log(`server on :${PORT}`);

  const launchOpts = { headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] };
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(sysChrome)) launchOpts.executablePath = sysChrome;

  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();

  const NOISE = /onrender\.com|crazygames|supabase|live-config|\/api\/|ERR_FAILED|Failed to load resource|404|CORS|ERR_CONNECTION/i;
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));

  // Relay trainer console output live; resolve waiters on sentinel lines.
  let waiter = null;
  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error') { if (!NOISE.test(t)) pageErrors.push(t); return; }
    if (t.startsWith('[SMK2Trainer]') || t.startsWith('[sim')) {
      console.log('   ', t);
      if (waiter && waiter.re.test(t)) { const w = waiter; waiter = null; w.resolve(); }
    }
  });
  const waitForLine = (re, timeoutMs) => new Promise((resolve, reject) => {
    const to = setTimeout(() => { waiter = null; reject(new Error('timeout waiting for ' + re)); }, timeoutMs);
    waiter = { re, resolve: () => { clearTimeout(to); resolve(); } };
  });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  // Neutralize first-visit story auto-launch (same as headless-capture.js)
  await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
      }
      if (typeof storyModeActive !== 'undefined') storyModeActive = false;
      if (typeof activeCinematic !== 'undefined') activeCinematic = null;
    } catch (e) {}
    ['prologueOverlay', 'storyPrologueOverlay', 'storyPathPanel', 'storyModal',
     'storyIntroOverlay', 'storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
  });

  // ── Install combat instrumentation ────────────────────────────────────────
  const ok = await page.evaluate(() => {
    if (typeof SMK2Trainer === 'undefined' || typeof Fighter === 'undefined') return false;
    const S = window.__sovStats = { reset() {
      this.sov = { swings: 0, hits: 0, dmgDealt: 0, dmgTaken: 0, deaths: 0, whiffAborts: 0 };
      this.bot = { swings: 0, hits: 0, dmgDealt: 0, dmgTaken: 0, deaths: 0 };
    } };
    S.reset();
    const side = f => (f && f.applyGenome) ? 'sov' : 'bot'; // SovereignMK2 has applyGenome

    const origAttack = Fighter.prototype.attack;
    Fighter.prototype.attack = function (...a) {
      if (!this.isAI) return origAttack.apply(this, a);
      const cdBefore = this.cooldown, atBefore = this.attackTimer;
      const r = origAttack.apply(this, a);
      const s = S[side(this)];
      if (this.attackTimer > atBefore || this.cooldown > cdBefore) s.swings++;
      else if (side(this) === 'sov') s.whiffAborts++;
      return r;
    };
    const origDeal = window.dealDamage;
    window.dealDamage = function (attacker, target, dmg, kb, ...rest) {
      if (attacker && target) {
        const as = side(attacker), ts = side(target);
        if (as !== ts) {
          S[as].hits++; S[as].dmgDealt += dmg || 0;
          S[ts].dmgTaken += dmg || 0;
          if (target.health - (dmg || 0) <= 0) S[ts].deaths++;
        }
      }
      return origDeal(attacker, target, dmg, kb, ...rest);
    };
    return true;
  });
  if (!ok) { log('FATAL: SMK2Trainer or Fighter missing on page'); await browser.close(); server.close(); process.exit(1); }

  // ── Stress run: levels 1..maxBots in one pass ─────────────────────────────
  // stressTest(maxBots, m) internally runs every level 1..maxBots, so the
  // instrumentation below is an aggregate across the whole run; per-level
  // kills/lives come from the trainer's own log lines (relayed above).
  const maxBots = Math.max(...BOTS);
  await page.evaluate(() => __sovStats.reset());
  log(`— stress: 1..${maxBots} bot(s) × ${MATCHES} matches/level —`);
  await page.evaluate((n, m) => SMK2Trainer.stressTest(n, m), maxBots, MATCHES);
  await waitForLine(/STRESS TEST COMPLETE/, 30 * 60 * 1000);
  const stats = await page.evaluate(() => JSON.parse(JSON.stringify(__sovStats)));
  {
    const s = stats.sov, b = stats.bot;
    const pct = (x, y) => y ? (100 * x / y).toFixed(0) + '%' : '—';
    log(`AGGREGATE (all levels):`);
    log(`   SOV: swings ${s.swings}, connect ${pct(s.hits, s.swings)}, whiff-aborts ${s.whiffAborts}, dealt ${Math.round(s.dmgDealt)}, taken ${Math.round(s.dmgTaken)}, deaths ${s.deaths}`);
    log(`   BOT: swings ${b.swings}, connect ${pct(b.hits, b.swings)}, dealt ${Math.round(b.dmgDealt)}, deaths ${b.deaths}`);
  }

  if (args.eval) {
    log('— evalVsDefault(2, 30) —');
    await page.evaluate(() => SMK2Trainer.evalVsDefault(2, 30));
    await waitForLine(/EVAL COMPLETE/, 30 * 60 * 1000);
  }

  if (pageErrors.length) {
    log(`page errors (${pageErrors.length}):`);
    pageErrors.slice(0, 10).forEach(e => log('  !', e));
  } else {
    log('no page errors');
  }

  await browser.close();
  server.close();
  process.exit(0);
})().catch(e => { console.error('[sov] FATAL', e); process.exit(1); });
