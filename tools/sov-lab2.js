'use strict';
/*
 * tools/sov-lab.js — PAIRED A/B OVER THE STRESS LIBRARY. DEV ONLY.
 *
 * The rig the research loop runs on. VECTOR could propose a scenario but never
 * change the fighter, so 243 confirmed findings produced zero fixes. This closes
 * that end: every experiment is a set of SMK2_TUNE flags, both arms run the SAME
 * scenarios at the SAME seeds in the SAME page, and the losing arm is discarded
 * on measurement rather than on judgement.
 *
 * Three families of metric, because the September experiments kept failing to
 * distinguish "the mechanism never fired" from "it fired and did not help":
 *
 *   OUTCOME     stocks, fitness, damage dealt/taken       — did it win more?
 *   BEHAVIOUR   sovCommitLog() distribution per arm       — did he DO anything
 *                                                            different? (needs
 *                                                            the _commit markers)
 *   ADAPTATION  per-dial travel, and cross-scenario spread — did adaptation have
 *               of each dial's endpoint                     room to move at all?
 *
 * A change that moves BEHAVIOUR but not OUTCOME is a different failure from one
 * that moves neither, and the old harnesses reported both as "null".
 *
 * Usage:
 *   node tools/sov-lab.js --flags=adaptV2,oppAdapt,swarmTerm [--seeds=2] [--label=headroom]
 *   node tools/sov-lab.js --flags=adaptV2 --set=adaptV2Base:0.5
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const SEEDS = parseInt(args.seeds, 10) || 2;
// The rig is deterministic, so re-running a config at the same seeds replays it
// byte for byte. A reproduction therefore needs DIFFERENT seeds: --seedoffset=8
// with --seeds=8 draws scenario realisations 9..16, disjoint from a prior 1..8.
const SEEDOFF = parseInt(args.seedoffset, 10) || 0;
const PORT  = parseInt(args.port, 10)  || 8115;
const FLAGS = (args.flags || '').split(',').map(s => s.trim()).filter(Boolean);
const LABEL = (args.label || FLAGS.join('+') || 'baseline') + (SEEDOFF ? `@off${SEEDOFF}` : '');
// --set=key:value,key:value — numeric SMK2_TUNE overrides applied to the TREATMENT arm only.
const SETS = {};
for (const kv of (args.set || '').split(',').filter(Boolean)) {
  // `0` must become BOOLEAN false, not the number 0. Several SMK2_TUNE consumers
  // test `=== false` (e.g. _gridWantsSuper), and 0 !== false under strict
  // comparison — so `--set=superGate:0` silently left the flag ON and the run
  // measured a config against itself. That voided a 26-block superGate A/B on
  // 2026-09-20 before the exact-zero panel gave it away.
  const [k, v0] = kv.split(':');
  if (!k) continue;
  const v = (v0 === '0' || v0 === 'false' || v0 === 'off') ? false
          : (v0 === '1' || v0 === 'true' || v0 === 'on') ? true
          : isNaN(+v0) ? v0 : +v0;
  SETS[k.trim()] = v;
}
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2' };
const log = (...a) => console.log('[lab]', ...a);

function startServer() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    s.on('error', e => { console.error(`[lab] cannot listen on :${PORT} — ${e.code}`); process.exit(1); });
    s.listen(PORT, () => resolve(s));
  });
}

// Paired and CLUSTERED. Both arms see identical scenarios at identical seeds, so
// the comparison is paired. But matches inside one scenario are not independent
// observations of the treatment — nine scenarios times eight seeds is nine
// clusters, not 72 samples, and scoring it per-match inflates t by roughly the
// square root of the cluster size. Measured 2026-09-20: superGate scored t=+2.84
// per-match on seeds 1-8 and t=-1.88 on seeds 9-16, both "significant", opposite
// signs. Clustering does not rescue that reversal, but reporting per-match t made
// it look like a result instead of a coin flip.
//
// So: collapse each scenario to its mean delta, then t across scenarios.
function clusteredT(deltas, clusters) {
  const by = new Map();
  for (let i = 0; i < deltas.length; i++) {
    const k = clusters[i];
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(deltas[i]);
  }
  const means = [...by.values()].map(v => v.reduce((a, b) => a + b, 0) / v.length);
  const n = means.length;
  if (n < 2) return { n, mean: 0, t: 0, matches: deltas.length };
  const mean = means.reduce((a, b) => a + b, 0) / n;
  const varr = means.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const se = Math.sqrt(varr / n);
  return { n, matches: deltas.length, mean: +mean.toFixed(3),
           sd: +Math.sqrt(varr).toFixed(3), t: se ? +(mean / se).toFixed(2) : 0 };
}

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }

  const server = await startServer();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] });
  log(`arms: BASE (shipped defaults) vs TREAT (${LABEL})`);

  // ── ONE FRESH PAGE PER ARM ─────────────────────────────────────────────────
  // Two arms in one page do not start from the same state. Measured 2026-09-20:
  // an A/A with both arms identical still moved stocks +0.39 and fitness +276 in
  // favour of whichever ran second. SovDossier was one cause and is now reset,
  // but residual page state remained. A fresh page is the only starting condition
  // we can actually assert, and it is cheap next to ten minutes of sim.
  async function newArmPage() {
    const pg = await browser.newPage();
    pg.on('pageerror', e => log('PAGEERR', e.message));
    await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await pg.waitForFunction(() => typeof SovereignMK2 !== 'undefined' && typeof SovScenarios !== 'undefined' &&
      typeof SMK2_TUNE !== 'undefined' && typeof window.sovCommitLog === 'function', { timeout: 180000 });
    return pg;
  }

  const runArm = async (flags, sets, seeds) => {
    const page = await newArmPage();
    try { return await page.evaluate((flags, sets, seeds, seedoff) => {
    // Restore shipped defaults, then apply this arm's overrides. Saved once on
    // first call so a later arm cannot inherit the previous arm's flags.
    if (!window.__labRandom) window.__labRandom = Math.random;
    const _origRandom = window.__labRandom;
    if (!window.__labBase) window.__labBase = JSON.parse(JSON.stringify(SMK2_TUNE));
    for (const k of Object.keys(window.__labBase)) SMK2_TUNE[k] = window.__labBase[k];
    for (const f of flags) SMK2_TUNE[f] = true;
    for (const k of Object.keys(sets)) SMK2_TUNE[k] = sets[k];

    window.sovCommitReset();

    // ── CROSS-MATCH MEMORY ───────────────────────────────────────────────────
    // SovDossier persists opponent-keyed dials, loadouts and grids to
    // localStorage and re-seeds the next Sovereign from them (_dossierSeed).
    // The treatment arm runs second, so without this it inherits every match the
    // baseline arm just played — a systematic bias toward whichever arm is last,
    // and it contaminates the dial metrics specifically, since dialPrior() seeds
    // the exact numbers this rig samples. Measured on the first A/A: the second
    // arm gained +0.39 stocks and +276 fitness over an identical first arm.
    try { if (typeof SovDossier !== 'undefined' && SovDossier.reset) SovDossier.reset(); } catch (e) {}

    // ── DETERMINISM ──────────────────────────────────────────────────────────
    // The scenario seed controls LOADOUT PICKS ONLY; every other decision in the
    // sim reads an unseeded Math.random(). Measured 2026-09-20: two runs of the
    // identical baseline config at identical seeds agreed on 3 of 18 matches
    // (untouchable dealt 992 vs 140). That makes a "paired" test pair scenario
    // labels rather than match realisations, which is how cycle 1 produced a
    // t=-1.97 out of noise. Both arms now draw from the same seeded stream from
    // the same starting state, so a difference between them is the treatment.
    let _s = 0x9E3779B9 >>> 0;
    Math.random = function () {
      _s = (_s + 0x6D2B79F5) >>> 0;
      let t = _s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Per-match dial travel. Sampled off update() so it costs nothing when idle.
    const P = SovereignMK2.prototype, origU = P.update;
    const DIALS = ['aggression','defense','spacing','reactionSpeed'];
    const perFighter = new Map();
    P.update = function () {
      const r = origU.apply(this, arguments);
      if (this.aiMemory) {
        let rec = perFighter.get(this);
        if (!rec) { rec = {}; for (const d of DIALS) rec[d] = { mn: Infinity, mx: -Infinity, last: 0 }; perFighter.set(this, rec); }
        for (const d of DIALS) {
          const v = this.aiMemory[d];
          if (typeof v !== 'number') continue;
          const c = rec[d]; if (v < c.mn) c.mn = v; if (v > c.mx) c.mx = v; c.last = v;
        }
      }
      return r;
    };

    let err = null, sw = null;
    try {
      // sweep()'s own seed formula, reproduced so an offset can be applied. Its
      // per-scenario constant is kept so offset 0 matches sweep() exactly.
      const runs = [];
      for (const name of SovScenarios.NAMES) {
        for (let i = 0; i < seeds; i++) {
          const r = SovScenarios.run(name, null, (i + 1 + seedoff) * 7919 + name.length * 104729);
          if (r) runs.push(r);
        }
      }
      const fits = runs.map(r => r.result.fitness);
      sw = { runs, worst: fits.length ? Math.min.apply(null, fits) : null };
    } catch (e) { err = e.message; }
    P.update = origU;
    Math.random = _origRandom;

    // Travel = mean per-dial excursion within a match. Spread = stdev of each
    // dial's ENDPOINT across fighters, i.e. "does he end up somewhere different
    // against a different opponent" — the thing the adaptV2 note measured at
    // 0.051 -> 0.107 and the thing opponent-specific adaptation actually means.
    const travel = {}, spread = {};
    for (const d of DIALS) {
      const exc = [], ends = [];
      for (const rec of perFighter.values()) {
        const c = rec[d];
        if (c.mx < c.mn) continue;
        exc.push(c.mx - c.mn); ends.push(c.last);
      }
      const mean = (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
      const sd = (v) => { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };
      travel[d] = +mean(exc).toFixed(4);
      spread[d] = +sd(ends).toFixed(4);
    }

    const runs = (sw && sw.runs) ? sw.runs.map(r => ({
      scenario: r.scenario,
      fitness: r.result.fitness,
      stocks:  r.result.sovLivesLeft,
      dealt:   r.result.dmgDealt,
      taken:   r.result.dmgTaken,
      frames:  r.result.framesRun,
      locked:  r.result.lockedPct,
      // oppDeaths is what makes him a BOSS: how often he actually kills the
      // opponent. `stocks` is only his own survival, and the two came apart —
      // measured 2026-09-20, the old build scored HIGHER fitness while holding
      // FEWER of its own lives, which is only possible if it was killing more.
      // Reporting survival without lethality was hiding half the result.
      kills:   r.result.oppDeaths || 0,
    })) : [];

    return { err, worst: sw && sw.worst, runs, travel, spread,
             fighters: perFighter.size, commits: window.sovCommitLog() };
    }, flags, sets, seeds, SEEDOFF); }
    finally { await page.close(); }
  };

  log('running BASE arm...');
  const base  = await runArm([], {}, SEEDS);
  log(`  ${base.runs.length} matches, worst ${base.worst}${base.err ? '  ERR ' + base.err : ''}`);
  log('running TREAT arm...');
  const treat = await runArm(FLAGS, SETS, SEEDS);
  log(`  ${treat.runs.length} matches, worst ${treat.worst}${treat.err ? '  ERR ' + treat.err : ''}`);

  // ── OUTCOME ──
  const key = (r) => r.scenario;
  const pair = (field) => {
    const d = [], cl = [];
    for (let i = 0; i < Math.min(base.runs.length, treat.runs.length); i++) {
      if (key(base.runs[i]) !== key(treat.runs[i])) continue; // seeds are deterministic; skip any drift
      d.push(treat.runs[i][field] - base.runs[i][field]); cl.push(key(base.runs[i]));
    }
    return clusteredT(d, cl);
  };
  const avg = (rs, f) => rs.length ? +(rs.reduce((a, r) => a + r[f], 0) / rs.length).toFixed(1) : 0;

  console.log(`\n════ ${LABEL} ════`);
  console.log('\n──── OUTCOME (treatment minus baseline, paired + clustered by scenario) ────');
  for (const f of ['stocks','kills','fitness','dealt','taken','locked']) {
    const p = pair(f);
    console.log(`  ${f.padEnd(8)} base ${String(avg(base.runs,f)).padStart(8)}   treat ${String(avg(treat.runs,f)).padStart(8)}   ` +
                `delta ${String(p.mean).padStart(8)}   t=${p.t}  (${p.n} scenarios / ${p.matches} matches)`);
  }

  // ── ADAPTATION ──
  console.log('\n──── ADAPTATION (did the dials have room?) ────');
  console.log('  dial            travel base -> treat      endpoint spread base -> treat');
  for (const d of ['aggression','defense','spacing','reactionSpeed']) {
    console.log(`  ${d.padEnd(14)} ${String(base.travel[d]).padStart(7)} -> ${String(treat.travel[d]).padEnd(8)}` +
                `      ${String(base.spread[d]).padStart(7)} -> ${treat.spread[d]}`);
  }

  // ── BEHAVIOUR ──
  const toMap = (c) => { const m = {}; for (const r of c.rows) m[r.action] = r.pct; return m; };
  const mb = toMap(base.commits), mt = toMap(treat.commits);
  const acts = [...new Set([...Object.keys(mb), ...Object.keys(mt)])];
  const deltas = acts.map(a => ({ a, base: mb[a] || 0, treat: mt[a] || 0, d: (mt[a] || 0) - (mb[a] || 0) }))
                     .sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  const l1 = deltas.reduce((s, x) => s + Math.abs(x.d), 0);
  console.log(`\n──── BEHAVIOUR (commit distribution, L1 shift = ${l1.toFixed(1)} pts) ────`);
  for (const x of deltas.slice(0, 10)) {
    if (Math.abs(x.d) < 0.05) break;
    console.log(`  ${x.a.padEnd(24)} ${x.base.toFixed(2).padStart(7)}% -> ${x.treat.toFixed(2).padStart(7)}%   ${x.d > 0 ? '+' : ''}${x.d.toFixed(2)}`);
  }

  const out = { label: LABEL, flags: FLAGS, sets: SETS, seeds: SEEDS, at: new Date().toISOString(),
                outcome: Object.fromEntries(['stocks','kills','fitness','dealt','taken','locked'].map(f => [f, pair(f)])),
                behaviourL1: +l1.toFixed(2), topDeltas: deltas.slice(0, 15),
                base: { worst: base.worst, travel: base.travel, spread: base.spread, runs: base.runs },
                treat: { worst: treat.worst, travel: treat.travel, spread: treat.spread, runs: treat.runs } };
  const dir = path.join(ROOT, 'data', 'lab');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${LABEL.replace(/[^\w.+-]/g, '_')}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  log('wrote ' + path.relative(ROOT, file));

  await browser.close();
  server.close();
})().catch(e => { console.error('[lab] FATAL', e); process.exit(1); });
