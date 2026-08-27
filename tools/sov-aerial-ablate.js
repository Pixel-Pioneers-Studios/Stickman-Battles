'use strict';
/*
 * tools/sov-aerial-ablate.js — WHY DOES SOVEREIGN LOSE 0-10 TO AN AERIAL OPPONENT? (DEV ONLY)
 *
 * The panel win-rate harness is unambiguous: he sweeps turtle, rusher and zoner
 * 100% and loses EVERY match to an opponent that simply keeps jumping. Fixing
 * anti-air STRATEGY SELECTION did not move it at all (0/10 before, 0/10 after),
 * so the cause is not that he fails to notice. This isolates it by ablation —
 * change exactly one thing per condition, hold everything else, same match count.
 *
 * Conditions:
 *   baseline    — untouched
 *   noguard     — Sovereign's melee whiff-guard disabled (_noWhiffGuard). Tests
 *                 whether the guard's `vGap > 60` gate is refusing every swing at
 *                 an airborne target and paralyzing him.
 *   plainkit    — aerial puppet stripped to sword/none. Tests whether the loss is
 *                 really the katana/assassin kit rather than the behaviour.
 *   grounded    — same puppet, jumping removed. The control: if he beats THIS, the
 *                 airborne-ness is the cause and not the aggression.
 *
 * Usage: node tools/sov-aerial-ablate.js [--matches=10] [--port=8116]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MATCHES = parseInt(args.matches, 10) || 10;
const PORT = parseInt(args.port, 10) || 8116;
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json' };
function startServer() {
  return new Promise(res => {
    const s = http.createServer((req, rs) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rs);
    });
    s.listen(PORT, () => res(s));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  const opts = { headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) opts.executablePath = chrome;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);
  await page.evaluate(() => { try { backToHome(); } catch (e) {} });

  let out = await page.evaluate(async (MATCHES) => {
    const res = {};
    const aerial = SMK2Trainer.SMK2_PANEL.find(p => p.name === 'aerial');
    const conds = {
      baseline: { panel: aerial },
      noguard:  { panel: aerial, _sovNoGuard: true },
      plainkit: { panel: { ...aerial, w: 'sword', c: 'none' } },
      grounded: { panel: { ...aerial, policy: 'rusher' } },
    };
    // Hook: apply per-condition tweaks to the Sovereign the sim builds.
    const origApply = SovereignMK2.prototype.applyGenome;
    SovereignMK2.prototype.applyGenome = function (g) {
      const r = origApply.apply(this, arguments);
      if (window.__ablNoGuard) this._noWhiffGuard = true;
      window.__ablSov = this;
      return r;
    };

    // ── Death-cause instrumentation ──────────────────────────────────────────
    // Damage dealt and taken come out DEAD EVEN in the losing conditions (807 vs
    // 802) while the stock count is 2.8 to 4.6. Even damage plus a lopsided stock
    // count means most of his deaths are not being paid for in damage at all —
    // i.e. he is leaving the stage. Recording position and HP at the moment a
    // life ends is what separates "out-damaged" from "fell off".
    window.__ablDeaths = [];
    const origUpd = SovereignMK2.prototype.update;
    SovereignMK2.prototype.update = function () {
      this.__hpTrail = this.__hpTrail || [];
      this.__hpTrail.push(this.health);
      if (this.__hpTrail.length > 8) this.__hpTrail.shift();
      this.__lastY = this.y;
      return origUpd.apply(this, arguments);
    };
    const origDeath = SovereignMK2.prototype.onDeath;
    SovereignMK2.prototype.onDeath = function () {
      try {
        const trail = this.__hpTrail || [];
        window.__ablDeaths.push({
          cond: window.__ablCond,
          y: Math.round(this.__lastY),
          hpBefore: Math.round(trail.length ? trail[0] : this.health),
          offStage: this.__lastY > (typeof GAME_H !== 'undefined' ? GAME_H : 520),
        });
      } catch (e) {}
      return origDeath.apply(this, arguments);
    };
    for (const name of Object.keys(conds)) {
      const c = conds[name];
      window.__ablNoGuard = !!c._sovNoGuard;
      window.__ablCond = name;
      const rows = [];
      for (let i = 0; i < MATCHES; i++) {
        rows.push(SMK2Trainer.runMatch(null, 1, (Math.random() * 1e9) | 0, { duel: true, panel: c.panel }));
        await new Promise(r => setTimeout(r, 0));
      }
      res[name] = rows;
    }
    window.__ablNoGuard = false;
    return { rows: res, deaths: window.__ablDeaths };
  }, MATCHES);

  const deaths = out.deaths || []; out = out.rows;
  const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  console.log(`\n=== AERIAL ABLATION (${MATCHES} matches per condition) ===\n`);
  console.log('  condition   win%   stocks(for-against)   dmg dealt/taken   locked%');
  for (const name of Object.keys(out)) {
    const rows = out[name];
    const wins = rows.filter(r => (r.oppDeaths - (5 - r.sovLivesLeft)) > 0).length;
    console.log(`  ${name.padEnd(10)} ${(100 * wins / rows.length).toFixed(0).padStart(4)}%  ` +
      `${mean(rows.map(r => r.oppDeaths)).toFixed(1)} - ${mean(rows.map(r => 5 - r.sovLivesLeft)).toFixed(1)}` +
      `          ${Math.round(mean(rows.map(r => r.dmgDealt)))} / ${Math.round(mean(rows.map(r => r.dmgTaken)))}` +
      `        ${mean(rows.map(r => r.lockedPct)).toFixed(1)}%`);
  }
  console.log('\n  HOW HIS LIVES ENDED (hp ~8 frames before death, and whether he was below the stage):');
  for (const name of Object.keys(out)) {
    const ds = deaths.filter(d => d.cond === name);
    if (!ds.length) { console.log(`    ${name.padEnd(10)} no deaths recorded`); continue; }
    const off = ds.filter(d => d.offStage).length;
    const healthy = ds.filter(d => d.hpBefore > 40).length;
    console.log(`    ${name.padEnd(10)} ${ds.length} deaths | below stage ${off} (${(100*off/ds.length).toFixed(0)}%) | ` +
      `at >40 HP ${healthy} (${(100*healthy/ds.length).toFixed(0)}%) | median hp ${(() => {
        const b = ds.map(d => d.hpBefore).sort((a, c) => a - c); return b[b.length >> 1]; })()}`);
  }
  console.log(`\npage errors: ${errs.length}`);
  if (errs.length) console.log('  ' + [...new Set(errs)].slice(0, 4).join('\n  '));
  await browser.close(); server.close();
})();
