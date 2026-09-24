'use strict';
/*
 * tools/sov-habit-test.js — DOES C1 (posture avoidance) ACTUALLY GATE ON THIS
 * OPPONENT? DEV ONLY.
 *
 * js/smb-sov-habits.js (SovHabits) files a per-opponent posture ledger from
 * every fight; js/smb-smk2-class.js's _habitGate reads it back to veto a fresh
 * ground->air launch when the ledger says this opponent punishes 'air' harder
 * than 'ground'. This measures whether the veto actually engages more against
 * an opponent who punishes the air (anti_air_hawk, js/smb-sov-scenarios.js)
 * than against one who never does (ground_brawler), and whether his airborne
 * openers taken fall against the hawk specifically.
 *
 * Pattern lifted from tools/sov-bait.js: one page, seeded RNG, SMK2_TUNE flag
 * as the only thing that differs between the on/off arms.
 *
 * Usage: node tools/sov-habit-test.js [--matches=20]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const M = parseInt(args.matches, 10) || 20;
const PORT = parseInt(args.port, 10) || 9410;

async function main() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  const server = await new Promise(res => {
    const s = http.createServer((req, rs) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rs);
    });
    s.listen(PORT, () => res(s));
  });
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 1800000, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  page.on('console', m => { const t = m.text(); if (/error|ERR/i.test(t)) console.log('[page]', t.slice(0, 200)); });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));
  await page.setRequestInterception(true);
  page.on('request', r => (r.url().startsWith(`http://localhost:${PORT}/`) || r.url().startsWith('data:')) ? r.continue() : r.abort());
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 600000 });
  await page.waitForFunction(() => typeof SovScenarios !== 'undefined' && typeof SMK2_TUNE !== 'undefined'
    && typeof SovDossier !== 'undefined' && typeof SovHabits !== 'undefined', { timeout: 600000 });

  const res = await page.evaluate((M) => {
    const _cl = console.log;
    function seedRng(seed) {
      let s = seed >>> 0;
      return function () {
        s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const out = {};
    for (const opp of ['anti_air_hawk', 'ground_brawler']) {
      for (const flag of [true, false]) {
        const cellKey = opp + '_' + (flag ? 'on' : 'off');
        const rows = [];
        for (let i = 0; i < M; i++) {
          console.log = () => {};
          try { SovDossier.reset(); SovHabits.reset(); } finally { console.log = _cl; }
          SMK2_TUNE.infer = true;
          SMK2_TUNE.habitAir = flag;
          Math.random = seedRng((opp.length * 1000 + (flag ? 500 : 0) + i + 1) * 7919);

          window.__habitAirCount = 0; window.__habitTotalCount = 0;
          if (typeof SovereignMK2 !== 'undefined' && !SovereignMK2.prototype.__habitWrapped) {
            const orig = SovereignMK2.prototype.update;
            SovereignMK2.prototype.update = function () {
              window.__habitTotalCount = (window.__habitTotalCount || 0) + 1;
              if (!this.onGround) window.__habitAirCount = (window.__habitAirCount || 0) + 1;
              return orig.apply(this, arguments);
            };
            SovereignMK2.prototype.__habitWrapped = true;
          }
          const g0 = Object.assign({ seen: 0, vetoed: 0, passed: 0 }, window.SOV_HABIT_LOG || {});
          const keysBefore = new Set(Object.keys(SovHabits._raw()));

          const spec = { name: 'habit_' + opp, punishes: '', bots: [{ w: 'sword', c: 'none', policy: opp }] };
          const r = SovScenarios.run(spec, null, (i + 1) * 104729);
          const R = r && r.result;

          const g1 = Object.assign({ seen: 0, vetoed: 0, passed: 0 }, window.SOV_HABIT_LOG || {});
          const newKey = Object.keys(SovHabits._raw()).find(k => !keysBefore.has(k));
          const rec = newKey ? SovHabits.get(newKey) : null;
          const airTaken = rec ? rec.postures.air.taken : 0;

          rows.push({
            i,
            stocks: R ? R.sovLivesLeft : null,
            dealt: R ? R.dmgDealt : 0,
            taken: R ? R.dmgTaken : 0,
            frames: R ? R.framesRun : 1,
            airPct: window.__habitTotalCount ? 100 * window.__habitAirCount / window.__habitTotalCount : 0,
            seen:   g1.seen   - g0.seen,
            vetoed: g1.vetoed - g0.vetoed,
            passed: g1.passed - g0.passed,
            airOpenersTaken: airTaken,
          });
        }
        out[cellKey] = rows;
      }
    }
    return out;
  }, M);

  const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  console.log('\n════ sov-habit-test ════');
  console.log('  opponent         habitAir   airborne%   veto/seen        stocks     airOpenersTaken   dmg taken/dealt');
  for (const opp of ['anti_air_hawk', 'ground_brawler']) {
    for (const flag of [true, false]) {
      const rows = res[opp + '_' + (flag ? 'on' : 'off')];
      const air = mean(rows.map(r => r.airPct));
      const seen = rows.reduce((a, r) => a + r.seen, 0), vet = rows.reduce((a, r) => a + r.vetoed, 0);
      const stocks = mean(rows.map(r => r.stocks));
      const opened = mean(rows.map(r => r.airOpenersTaken));
      const taken = mean(rows.map(r => r.taken)), dealt = mean(rows.map(r => r.dealt));
      console.log(`  ${opp.padEnd(16)} ${(flag ? 'on ' : 'off').padEnd(9)} ${air.toFixed(1).padStart(6)}%   ${String(vet).padStart(4)}/${String(seen).padEnd(5)}  ${stocks.toFixed(2).padStart(8)}      ${opened.toFixed(2).padStart(10)}      ${taken.toFixed(0)}/${dealt.toFixed(0)}`);
    }
  }
  const dir = path.join(ROOT, 'data', 'balance'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `sov-habit-test-${Date.now()}.json`), JSON.stringify(res));
  await browser.close(); server.close();
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
