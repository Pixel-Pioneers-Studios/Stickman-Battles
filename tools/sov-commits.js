'use strict';
/*
 * tools/sov-commits.js — WHICH BRANCHES OF THE CASCADE ACTUALLY DECIDE? DEV ONLY.
 *
 * updateAI() is a ~2000-line, 70-guard preference order, and the plan on the
 * table is to convert its lower half — the ~30 "volition" branches — into a
 * scored policy. That plan rests on an assumption nobody has tested: that those
 * branches fire. A branch that wins zero frames in a full scenario sweep is not
 * a candidate to score; it is dead code with a comment.
 *
 * Every terminal branch now names itself via SovereignMK2._commit() on the frame
 * it wins. This runs the whole SovScenarios library headless and prints the
 * resulting distribution, split at the reflex/volition seam.
 *
 * Nothing here changes behaviour: _commit() only counts.
 *
 * Usage: node tools/sov-commits.js [--seeds=2] [--port=8112]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const SEEDS = parseInt(args.seeds, 10) || 2;
const PORT  = parseInt(args.port, 10)  || 8112;
const ROOT  = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2' };
const log = (...a) => console.log('[commits]', ...a);

// The reflex tier runs above the seam in updateAI() and must never be outvoted;
// the volition tier below it is what a scorer would ever be allowed to reorder.
const REFLEX = new Set(['recover_jump_abort','hop_steer','fakeout','danger_beam','danger_lava_air',
  'danger_lava_ground','volley_defense_a','volley_defense_b','volley_defense_c','volley_cycle_a',
  'volley_cycle_b','air_descent','elevation_pursuit','floor_hazard','domain_hazard','area_threat',
  'map_tactics','rapid_hit_escape','wall_safety','sov_escape_a','sov_escape_b']);

function startServer() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    s.on('error', e => { console.error(`[commits] cannot listen on :${PORT} — ${e.code}`); process.exit(1); });
    s.listen(PORT, () => resolve(s));
  });
}

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }

  const server = await startServer();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] });
  const page = await browser.newPage();
  page.on('pageerror', e => log('PAGEERR', e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => typeof SovereignMK2 !== 'undefined' && typeof SovScenarios !== 'undefined',
    { timeout: 180000 });
  log(`game loaded — sweeping ${SEEDS} seed(s) per scenario`);

  const out = await page.evaluate(async (seeds) => {
    window.sovCommitReset();
    let err = null, worst = null, scenarios = 0;
    try {
      const sw = SovScenarios.sweep(null, seeds);
      worst = sw && sw.worst;
      scenarios = sw && sw.runs ? sw.runs.length : 0;
    } catch (e) { err = e.message; }
    return { err, worst, scenarios, log: window.sovCommitLog() };
  }, SEEDS);

  if (out.err) log('SWEEP ERROR:', out.err);
  log(`matches ${out.scenarios}   worst fitness ${out.worst}`);

  const rows = out.log.rows;
  const total = out.log.total;
  const show = (title, set, want) => {
    const sub = rows.filter(r => set.has(r.action) === want);
    const sum = sub.reduce((a, r) => a + r.frames, 0);
    console.log(`\n──── ${title} — ${sum} frames (${total ? (100*sum/total).toFixed(1) : 0}% of decisions) ────`);
    for (const r of sub) console.log(`  ${r.action.padEnd(24)} ${String(r.frames).padStart(8)}  ${r.pct.toFixed(2)}%`);
  };
  console.log(`\ndecision frames logged: ${total}`);
  show('REFLEX TIER (never scorable)', REFLEX, true);
  show('VOLITION TIER (scorer candidates)', REFLEX, false);

  const fired = new Set(rows.map(r => r.action));
  const ALL = require('./sov-commits-names.json');
  const dead = ALL.filter(n => !fired.has(n));
  if (dead.length) {
    console.log(`\n──── NEVER FIRED (${dead.length}) ────`);
    for (const n of dead) console.log('  ' + n);
  }

  fs.writeFileSync(path.join(ROOT, 'tools', 'sov-commits-results.json'), JSON.stringify(out.log, null, 1));
  log('wrote tools/sov-commits-results.json');

  await browser.close();
  server.close();
})().catch(e => { console.error('[commits] FATAL', e); process.exit(1); });
