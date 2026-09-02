'use strict';
/*
 * tools/sov-stun-mirror.js — headless stun/ragdoll-rate measurement (DEV ONLY)
 *
 * Question this answers: when Sovereign hits you, how often does the hit stun?
 * dealDamage() says it should be a roll (30% ragdoll above kb 16, else a 45%
 * plain-stun roll) but a real replay measured 10 stuns from 10 fresh hits.
 * Ten-for-ten is either a ~0.7% run of luck or a code path that bypasses the roll.
 *
 * METHOD — "Sovereign spirit" mirror. SovereignMK2's brain acts directly on
 * `this`, so the way to put him on both sides of a fight is the same graft the
 * F7 SovereignControl toggle uses: copy the constructor state onto the opponent
 * and repoint its prototype. Both fighters then run identical brains, identical
 * classes and identical nullblades, with DUEL_BUFF off. Any asymmetry in the
 * measured stun rate between the two sides is a bug; the pooled rate is a clean
 * estimate of the true per-hit probability.
 *
 * dealDamage() is WRAPPED, never modified — every number here is observed from
 * outside the pipeline (stunTimer/ragdollTimer before vs after the real call).
 *
 * Usage:
 *   node tools/sov-stun-mirror.js [--matches=8] [--port=8099] [--weapon=nullblade]
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MATCHES = parseInt(args.matches, 10) || 8;
const PORT    = parseInt(args.port, 10) || 8099;
const WEAPON  = String(args.weapon || 'nullblade');

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

const log = (...a) => console.log('[stunlab]', ...a);

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
  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error') { if (!NOISE.test(t)) pageErrors.push(t); return; }
    if (t.startsWith('[stunlab]')) console.log('   ', t);
  });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
      }
      if (typeof storyModeActive !== 'undefined') storyModeActive = false;
      if (typeof activeCinematic !== 'undefined') activeCinematic = null;
    } catch (e) {}
    ['prologueOverlay','storyPrologueOverlay','storyPathPanel','storyModal',
     'storyIntroOverlay','storyUnlockOverlay'].forEach(id => {
      const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
  });

  // ── Install rig ───────────────────────────────────────────────────────────
  const ready = await page.evaluate((WEAPON) => {
    if (typeof SMK2Trainer === 'undefined' || typeof Fighter === 'undefined' ||
        typeof SovereignMK2 === 'undefined') return 'missing globals';

    const L = window.__stunLab = {
      hits: [],
      reset() { this.hits = []; },
    };

    // ── Observation wrapper on dealDamage ───────────────────────────────────
    // Reads stunTimer/ragdollTimer either side of the REAL call. A hit only
    // counts as landed if health actually fell, so shielded/i-frame no-ops and
    // the early hard-returns inside dealDamage are excluded automatically.
    const origDeal = window.dealDamage;
    window.dealDamage = function (attacker, target, dmg, kb, stunMult, isSplash, hitInv) {
      if (!attacker || !target || !L._on) return origDeal.apply(this, arguments);
      const b = { hp: target.health, stn: target.stunTimer || 0, rag: target.ragdollTimer || 0,
                  inv: target.invincible || 0, sh: !!target.shielding, air: !target.onGround };
      const r = origDeal.apply(this, arguments);
      const a = { hp: target.health, stn: target.stunTimer || 0, rag: target.ragdollTimer || 0 };
      if (a.hp < b.hp) {
        L.hits.push({
          atk: attacker.name || '?', vic: target.name || '?',
          wk: attacker.weaponKey || '?',
          dmg: Math.round((b.hp - a.hp) * 10) / 10,
          kbIn: kb, stunMult: (stunMult === undefined ? 1 : stunMult),
          splash: !!isSplash,
          preStn: b.stn, preRag: b.rag, postStn: a.stn, postRag: a.rag,
          preAir: b.air, preSh: b.sh, preInv: b.inv,
          combo: (attacker._comboHitCount || 0),
          fresh: (b.stn === 0 && b.rag === 0),
          stunApplied: a.stn > b.stn,
          ragApplied:  a.rag > b.rag,
        });
      }
      return r;
    };

    // ── "Sovereign spirit" possession, applied lazily on first update ────────
    // _runMatch builds the panel opponent as a plain Fighter and we get no hook
    // during its construction, so the graft happens the first time the engine
    // updates that fighter. Same mechanic as SovereignControl.engage(): copy the
    // brain's own-properties on, then repoint the prototype.
    const origUpdate = Fighter.prototype.update;
    Fighter.prototype.update = function () {
      if (L._on && !this._mirrorDone && typeof this.name === 'string' &&
          this.name.indexOf('PANEL:MIRROR') === 0) {
        this._mirrorDone = true;
        try {
          const tpl = new SovereignMK2(-99999, -99999, this.color, WEAPON);
          for (const k of Object.keys(tpl)) {
            if (k === 'name' || k === 'color' || k === '_teamId') continue;
            if (Object.prototype.hasOwnProperty.call(this, k)) continue;
            this[k] = tpl[k];
          }
          delete this.updateAI;             // drop the panel policy stub
          Object.setPrototypeOf(this, SovereignMK2.prototype);
          this.aiTickInterval = 1;
          this.isAI = true;
          if (typeof SMK2Trainer.loadChampion === 'function' && this.applyGenome) {
            this.applyGenome(SMK2Trainer.loadChampion());
          }
          L._mirrorOk = (L._mirrorOk || 0) + 1;
        } catch (e) { L._mirrorErr = String(e && e.message || e); }
      }
      // Force both sides onto the same weapon so kb/damage are identical.
      if (L._on && typeof WEAPONS !== 'undefined' && WEAPONS[WEAPON] &&
          (this.isSovereignMK2 || this._mirrorDone) && this.weaponKey !== WEAPON) {
        this.weaponKey = WEAPON;
        this.weapon    = WEAPONS[WEAPON];
      }
      return origUpdate.apply(this, arguments);
    };
    return 'ok';
  }, WEAPON);

  if (ready !== 'ok') { log('FATAL:', ready); await browser.close(); server.close(); process.exit(1); }
  log('rig installed — dealDamage wrapped, mirror graft armed');

  // ── Run the mirror matches ────────────────────────────────────────────────
  const all = [];
  for (let m = 0; m < MATCHES; m++) {
    const res = await page.evaluate((seed, WEAPON) => {
      const L = window.__stunLab;
      L.reset(); L._on = true; L._mirrorOk = 0; L._mirrorErr = null;
      let err = null;
      try {
        SMK2Trainer.runMatch(SMK2Trainer.loadChampion(), 1, seed, {
          duel: true, noBuff: true,
          panel: { name: 'MIRROR', w: WEAPON, c: 'berserker', policy: 'mirror' },
        });
      } catch (e) { err = String(e && e.message || e); }
      L._on = false;
      return { hits: L.hits, mirrorOk: L._mirrorOk, mirrorErr: L._mirrorErr, err };
    }, 1000 + m * 7919, WEAPON);
    if (res.err) log(`match ${m + 1}: ERROR ${res.err}`);
    if (res.mirrorErr) log(`match ${m + 1}: graft error ${res.mirrorErr}`);
    log(`match ${m + 1}/${MATCHES}: ${res.hits.length} landed hits, mirror grafted ${res.mirrorOk}`);
    all.push(...res.hits);
  }

  fs.writeFileSync(path.join(ROOT, 'tools', 'sov-stun-mirror-results.json'),
                   JSON.stringify(all, null, 1));

  if (pageErrors.length) {
    log(`page errors (${pageErrors.length}):`);
    pageErrors.slice(0, 6).forEach(e => log('  !', e));
  }
  await browser.close();
  server.close();
  log(`wrote ${all.length} hit records -> tools/sov-stun-mirror-results.json`);
  process.exit(0);
})().catch(e => { console.error('[stunlab] FATAL', e); process.exit(1); });
