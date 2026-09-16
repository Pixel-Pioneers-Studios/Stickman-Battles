'use strict';
/*
 * tools/weapon-tune.js — MELEE WEAPON BALANCE TUNER (DEV ONLY)
 *
 * Searches one combined "power" multiplier per melee weapon so that every
 * weapon lands near a 50% win rate against the rest of the melee field, then
 * prints the resulting statline as a patch you can apply to smb-data-weapons.js.
 *
 * Why a COMBINED knob instead of tuning one stat at a time: measured 2026-09-14,
 * single-stat changes are threshold-like and mostly inert. Hammer damage
 * 22 -> 10 moved its field win rate 91.7% -> 90.0%; knockback 16 -> 0 moved it
 * to 85.8%; cooldown 75 -> 150 to 80.0%. But changing damage, range, cooldown,
 * endlag and kb TOGETHER flipped the same weapon from 100% to 0% head-to-head vs
 * a sword. So the tunable quantity is overall weapon power, not any one stat.
 *
 * The knob m scales:  damage x m,  range x m^0.3,  cooldown / m^0.6
 * Range moves least because it is the most identity-defining stat (a whip that
 * reaches like a dagger is a different weapon); cooldown carries the most.
 *
 * RANGED WEAPONS ARE DELIBERATELY EXCLUDED. They occupy the bottom of every
 * sweep, but that is an AI positioning failure, not a stat problem: a bow with
 * range 700 fights at a median gap of 130px and takes ~48% of its shots inside
 * 120px, where spawnBullet applies up to -34% point-blank damage. Tuning their
 * numbers against this harness would overbuff them for a human who does kite.
 *
 * Usage: node tools/weapon-tune.js [--rounds=6] [--matches=8] [--port=8150]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROUNDS  = parseInt(args.rounds, 10)  || 6;
const MATCHES = parseInt(args.matches, 10) || 8;
const PORT    = parseInt(args.port, 10)    || 8150;
const ROOT    = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };
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
const log = (...a) => console.log('[tune]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  const opts = { headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) opts.executablePath = chrome;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);
  await page.evaluate(() => { try { if (typeof backToHome === 'function') backToHome(); } catch (e) {} });
  const SIM = fs.readFileSync(path.join(ROOT, 'tools', 'class-balance.js'), 'utf8')
                .match(/const SIM_SRC = `([\s\S]*?)\n`;/)[1];
  await page.addScriptTag({ content: SIM });

  const MELEE = await page.evaluate(() =>
    WEAPON_KEYS.filter(k => WEAPONS[k].type === 'melee' && WEAPONS[k].damage > 0));
  log(`melee field (${MELEE.length}): ${MELEE.join(', ')}`);

  // Baselines captured once; every round re-derives stats from base x m, so the
  // search never compounds rounding error round over round.
  await page.evaluate(ks => {
    window.__base = {};
    for (const k of ks) window.__base[k] = { damage: WEAPONS[k].damage, range: WEAPONS[k].range,
                                             cooldown: WEAPONS[k].cooldown, endlag: WEAPONS[k].endlag,
                                             kb: WEAPONS[k].kb };
  }, MELEE);

  const m = Object.fromEntries(MELEE.map(k => [k, 1]));
  let last = null;
  for (let round = 1; round <= ROUNDS; round++) {
    const res = await page.evaluate(async (MELEE, m, MATCHES) => {
      // Apply the current multipliers from the pristine baseline.
      for (const k of MELEE) {
        const b = window.__base[k], mm = m[k];
        WEAPONS[k].damage   = Math.max(1, Math.round(b.damage * mm));
        WEAPONS[k].range    = Math.max(20, Math.round(b.range * Math.pow(mm, 0.3)));
        WEAPONS[k].cooldown = Math.max(8, Math.round(b.cooldown / Math.pow(mm, 0.6)));
      }
      const st = Object.fromEntries(MELEE.map(k => [k, { w: 0, l: 0, d: 0 }]));
      for (let i = 0; i < MELEE.length; i++) {
        for (let j = i + 1; j < MELEE.length; j++) {
          for (let n = 0; n < MATCHES; n++) {
            const r = BalanceSim.runMatch('warrior', 'warrior', (Math.random() * 1e9) | 0,
              { stocks: 3, arena: 'flat', diff: 'hard', maxFrames: 18000, swap: n % 2 === 1,
                wA: MELEE[i], wB: MELEE[j] });
            if (r.stockDiff > 0)      { st[MELEE[i]].w++; st[MELEE[j]].l++; }
            else if (r.stockDiff < 0) { st[MELEE[i]].l++; st[MELEE[j]].w++; }
            else                      { st[MELEE[i]].d++; st[MELEE[j]].d++; }
          }
          await new Promise(r => setTimeout(r, 0));
        }
      }
      return st;
    }, MELEE, m, MATCHES);

    const pct = {};
    for (const k of MELEE) { const s = res[k]; pct[k] = 100 * (s.w + 0.5 * s.d) / (s.w + s.l + s.d); }
    const spread = Math.max(...Object.values(pct)) - Math.min(...Object.values(pct));
    const rmse = Math.sqrt(Object.values(pct).reduce((a, v) => a + (v - 50) ** 2, 0) / MELEE.length);
    log(`round ${round}: spread ${spread.toFixed(0)} pts, rmse-from-50 ${rmse.toFixed(1)}  ` +
        MELEE.map(k => `${k.slice(0,4)} ${pct[k].toFixed(0)}`).join(' '));
    last = pct;
    if (round === ROUNDS) break;
    // Proportional update. Gain is deliberately gentle: the win-rate surface is
    // near-deterministic per matchup, so a large step oscillates instead of
    // converging.
    for (const k of MELEE) {
      const err = (pct[k] - 50) / 50;
      m[k] = Math.min(2.2, Math.max(0.45, m[k] * (1 - 0.22 * err)));
    }
  }

  const final = await page.evaluate((MELEE, m) => {
    const out = {};
    for (const k of MELEE) {
      const b = window.__base[k], mm = m[k];
      out[k] = { base: b, m: mm,
        damage: Math.max(1, Math.round(b.damage * mm)),
        range: Math.max(20, Math.round(b.range * Math.pow(mm, 0.3))),
        cooldown: Math.max(8, Math.round(b.cooldown / Math.pow(mm, 0.6))) };
    }
    return out;
  }, MELEE, m);

  console.log('\n=== PROPOSED MELEE STATLINE ===\n');
  console.log('  weapon         win%   mult    damage        range         cooldown');
  for (const k of MELEE.sort((a, b) => last[b] - last[a])) {
    const f = final[k];
    const arrow = (a, b) => `${a} -> ${b}`.padEnd(13);
    console.log('  ' + k.padEnd(14) + last[k].toFixed(0).padStart(4) + '  ' + f.m.toFixed(2).padStart(5) + '   ' +
      arrow(f.base.damage, f.damage) + ' ' + arrow(f.base.range, f.range) + ' ' + arrow(f.base.cooldown, f.cooldown));
  }
  fs.writeFileSync(path.join(ROOT, 'tools', 'weapon-tune-results.json'),
    JSON.stringify({ when: new Date().toISOString(), rounds: ROUNDS, matches: MATCHES, final, winPct: last }, null, 1));
  console.log('\nwrote tools/weapon-tune-results.json');
  await browser.close(); server.close();
})();
