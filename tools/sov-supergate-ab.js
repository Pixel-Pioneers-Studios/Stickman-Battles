'use strict';
/*
 * tools/sov-supergate-ab.js — does the grid-driven super release help? DEV ONLY.
 *
 * WHAT IS BEING TESTED
 * _gridWantsSuper (smb-smk2-class.js) is the first thing in the codebase to act on
 * _tacticGrid. Before it, the grid had two readers — a gate that is off by default
 * and a debug readout — so every number the trainer, VECTOR and the artifact ever
 * produced changed nothing about how he fought. This measures whether connecting
 * it is an improvement or a regression.
 *
 * ARMS ARE INTERLEAVED, NOT BATCHED. A six-hour VECTOR run is usually chewing the
 * same CPU, so a batched A-then-B design would confound the arms with whatever the
 * machine was doing at the time. Alternating per scenario/seed spreads that evenly.
 *
 * SEEDS ARE MATCHED. Both arms see the identical scenario and the identical seed,
 * so a pair differs only by the flag. Unmatched seeds were what made the earlier
 * three-run arms disagree with each other more than the arms disagreed.
 *
 * Usage:
 *   node tools/sov-supergate-ab.js [--seeds=4] [--port=8101] [--margin=8]
 *                                  [--flag=tacticPlans]
 */
const fs = require('fs'), path = require('path'), http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const SEEDS  = parseInt(args.seeds, 10) || 4;
const PORT   = parseInt(args.port, 10) || 8101;
const MARGIN = args.margin !== undefined ? parseFloat(args.margin) : 8;
// --also=<flag>: held TRUE in BOTH arms. Needed to isolate a mechanism that only
// has effect when another is on (e.g. swarmTerm requires adaptV2's headroom).
const ALSO   = args.also || '';
const ROOT   = path.resolve(__dirname, '..');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const log = (...a) => console.log('[ab]', ...a);

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
    server.on('error', (e) => { console.error(`[ab] cannot listen on :${PORT} — ${e.code}`); process.exit(1); });
    server.listen(PORT, () => resolve(server));
  });
}

// Welch's t — the arms have different variances (the ON arm spends a resource the
// OFF arm hoards), so Student's pooled test is the wrong one.
function welch(a, b) {
  const n1 = a.length, n2 = b.length;
  if (n1 < 2 || n2 < 2) return { t: 0, m1: 0, m2: 0 };
  const m1 = a.reduce((x, y) => x + y, 0) / n1, m2 = b.reduce((x, y) => x + y, 0) / n2;
  const v1 = a.reduce((s, x) => s + (x - m1) ** 2, 0) / (n1 - 1);
  const v2 = b.reduce((s, x) => s + (x - m2) ** 2, 0) / (n2 - 1);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  return { t: se > 0 ? (m1 - m2) / se : 0, m1, m2 };
}

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }

  const server = await startServer();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  page.on('pageerror', e => log('PAGEERR', e.message));
  // domcontentloaded, not networkidle2: with a long VECTOR run saturating the CPU,
  // "no network activity for 500ms" can exceed the navigation budget on a page that
  // is perfectly fine. waitForFunction below is the real readiness check.
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(
    () => typeof SMK2Trainer !== 'undefined' && typeof SovScenarios !== 'undefined' &&
          typeof SMK2_TUNE !== 'undefined',
    { timeout: 180000 });
  const FLAG = args.flag || 'superGate';
  await page.evaluate((f, a) => { window.__abFlag = f; window.__abAlso = a; }, FLAG, ALSO);
  log('game loaded — testing SMK2_TUNE.' + FLAG + (ALSO ? '  (with ' + ALSO + ' on in BOTH arms)' : ''));

  const names = await page.evaluate(() => SovScenarios.NAMES);
  log(`${names.length} scenarios x ${SEEDS} seeds x 2 arms = ${names.length * SEEDS * 2} matches`);

  const arms = { on: [], off: [] };
  const perScenario = {};
  let gridSupers = 0;

  for (const name of names) {
    perScenario[name] = { on: [], off: [] };
    for (let i = 0; i < SEEDS; i++) {
      const seed = (i + 1) * 7919 + name.length * 104729;
      for (const arm of ['on', 'off']) {
        const r = await page.evaluate((nm, sd, on, mg) => {
          // FLAG is set by --flag; superGate and tacticPlans are both testable
          // through the same harness because both are single booleans that gate a
          // mechanism with an execution counter.
          const FLAG = window.__abFlag || 'superGate';
          if (window.__abAlso) SMK2_TUNE[window.__abAlso] = true;
          SMK2_TUNE[FLAG] = on;
          if (FLAG === 'superGate')  SMK2_TUNE.superGateMargin = mg;
          if (FLAG === 'freshDials') SMK2_TUNE.freshLevel = mg;
          const res = SovScenarios.run(nm, null, sd);
          if (!res) return null;
          return { fitness: res.result.fitness, stocks: res.result.sovLivesLeft,
                   dealt: res.result.dmgDealt, taken: res.result.dmgTaken,
                   locked: res.result.lockedPct,
                   fired: (window.__abFlag === 'tacticPlans') ? (res.result.planCount || 0)
                        : (window.__abFlag === 'baitPunisher') ? (res.result.baitHeld || 0)
                        : (window.__abFlag === 'swarmTerm') ? (res.result.swarmSeen || 0)
                        : (window.__abFlag === 'adaptV2') ? (res.result.swarmSeen || 1)
                        : (window.__abFlag === 'freshDials') ? 1
                        : (window.__abFlag === 'killCredit') ? (res.result.killCredits || 0)
                        : (res.result.gridSupers || 0) };
        }, name, seed, arm === 'on', MARGIN);
        if (!r) continue;
        arms[arm].push(r);
        perScenario[name][arm].push(r);
        if (arm === 'on') gridSupers += r.fired;
      }
    }
    const on = perScenario[name].on, off = perScenario[name].off;
    const avg = (xs, k) => xs.length ? (xs.reduce((a, b) => a + b[k], 0) / xs.length) : 0;
    log(`${name.padEnd(20)} fitness ON ${Math.round(avg(on, 'fitness'))
      }  OFF ${Math.round(avg(off, 'fitness'))}   stocks ON ${avg(on, 'stocks').toFixed(2)
      }  OFF ${avg(off, 'stocks').toFixed(2)}`);
  }

  console.log('\n──── RESULT ────');
  for (const k of ['fitness', 'stocks', 'dealt', 'taken', 'locked']) {
    const w = welch(arms.on.map(r => r[k]), arms.off.map(r => r[k]));
    const dir = w.m1 > w.m2 ? 'ON higher' : 'OFF higher';
    console.log(`${k.padEnd(8)} ON ${w.m1.toFixed(2).padStart(9)}   OFF ${w.m2.toFixed(2).padStart(9)}   ` +
                `t=${w.t.toFixed(2).padStart(6)}   ${Math.abs(w.t) > 2 ? 'SIGNIFICANT ' + dir : 'no difference'}`);
  }
  console.log(`\nn = ${arms.on.length} per arm.  mechanism firings in ON arm: ${gridSupers}`);
  if (!gridSupers) console.log('WARNING: the gate never fired — the ON arm is not testing anything.');

  await browser.close();
  server.close();
})().catch(e => { console.error('[ab] FATAL', e); process.exit(1); });
