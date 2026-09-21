'use strict';
/*
 * tools/sov-run.js — PARALLEL A/B DRIVER. DEV ONLY.
 *
 * sov-lab.js measures one seed block. Measured 2026-09-20, three independent
 * blocks of the same flag returned +0.431 / -0.292 / -0.278 stocks: the SD of a
 * single block is ~0.41, and every mechanism in this tree produces effects of
 * 0.2-0.4. One block can therefore never judge one of them, and the honest fix is
 * more blocks, not a bolder reading of one.
 *
 * Blocks are fully independent processes on disjoint seeds, so they parallelise
 * perfectly. Averaging k of them cuts the standard error by sqrt(k):
 *
 *     1 block  -> +/- 0.41      4 blocks -> +/- 0.21
 *     9 blocks -> +/- 0.14     16 blocks -> +/- 0.10
 *
 * On a 10-core machine 5 run concurrently, so 10 blocks (720 matches/arm) cost
 * about the wall clock of two, not ten. That is what turns the "7 hours per
 * candidate" estimate into something a research loop can actually spend.
 *
 * Usage:
 *   node tools/sov-run.js --flags=adaptV2,oppAdapt --label=headroom --blocks=6
 *   node tools/sov-run.js --flags=x --blocks=10 --jobs=5 --seeds=8
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const BLOCKS = parseInt(args.blocks, 10) || 6;
const JOBS   = parseInt(args.jobs, 10)   || 5;
const SEEDS  = parseInt(args.seeds, 10)  || 8;
const FLAGS  = args.flags || '';
const SETS   = args.set || '';
const LABEL  = args.label || FLAGS.replace(/,/g, '+') || 'baseline';
const BASEPORT = parseInt(args.port, 10) || 8200;
// --blockoffset=N: start at block N, so a second run lands on fresh seeds
// instead of deterministically reproducing the first run's blocks.
const BOFF = parseInt(args.blockoffset, 10) || 0;

const log = (...a) => console.log('[run]', ...a);

function runBlock(i0) {
  const i = i0 + BOFF;
  return new Promise((resolve) => {
    const label = `${LABEL}__b${i}`;
    const argv = ['tools/sov-lab.js', `--label=${label}`, `--seeds=${SEEDS}`,
                  `--seedoffset=${i * SEEDS}`, `--port=${BASEPORT + i0}`];
    if (FLAGS) argv.push(`--flags=${FLAGS}`);
    if (args.baseflags) argv.push(`--baseflags=${args.baseflags}`);
    if (SETS)  argv.push(`--set=${SETS}`);
    const t0 = Date.now();
    const p = spawn('node', argv, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let errTail = '';
    p.stderr.on('data', d => { errTail = (errTail + d).slice(-400); });
    p.stdout.on('data', () => {});
    p.on('close', (code) => {
      const mins = ((Date.now() - t0) / 60000).toFixed(1);
      if (code !== 0) { log(`block ${i} FAILED (${mins}m) ${errTail.trim().slice(-200)}`); return resolve(null); }
      // Newest file for this block's label.
      const dir = path.join(ROOT, 'data', 'lab');
      const safe = label.replace(/[^\w.+-]/g, '_') + (i ? `@off${i * SEEDS}` : '');
      const hits = fs.readdirSync(dir).filter(f => f.startsWith(label.replace(/[^\w.+-]/g, '_'))).sort();
      if (!hits.length) { log(`block ${i} produced no result file`); return resolve(null); }
      const d = JSON.parse(fs.readFileSync(path.join(dir, hits[hits.length - 1]), 'utf8'));
      log(`block ${i} done (${mins}m)  stocks ${d.outcome.stocks.mean >= 0 ? '+' : ''}${d.outcome.stocks.mean}`);
      resolve(d);
    });
  });
}

// Fixed-size worker pool: 10 concurrent Chromes would thrash a 10-core box and
// slow every block down, which shows up as nothing but a longer wall clock.
async function pool(n, jobs, fn) {
  const out = new Array(n); let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, n) }, async () => {
    while (next < n) { const i = next++; out[i] = await fn(i); }
  }));
  return out;
}

function stats(v) {
  const n = v.length;
  if (!n) return { n: 0, mean: 0, se: 0, t: 0 };
  const m = v.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { n, mean: +m.toFixed(3), se: 0, t: 0 };
  const va = v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  const se = Math.sqrt(va / n);
  return { n, mean: +m.toFixed(3), sd: +Math.sqrt(va).toFixed(3), se: +se.toFixed(3), t: se ? +(m / se).toFixed(2) : 0 };
}

(async () => {
  log(`${LABEL}: ${BLOCKS} blocks x ${SEEDS} seeds x 9 scenarios = ${BLOCKS * SEEDS * 9} matches/arm, ${JOBS} concurrent`);
  const t0 = Date.now();
  const res = (await pool(BLOCKS, JOBS, runBlock)).filter(Boolean);
  if (!res.length) { console.error('[run] every block failed'); process.exit(1); }

  const FIELDS = ['stocks', 'fitness', 'dealt', 'taken', 'locked'];
  console.log(`\n════ ${LABEL} — ${res.length} independent blocks (${res.length * SEEDS * 9} matches/arm) ════`);
  console.log('\n──── OUTCOME (mean over blocks; t across blocks) ────');
  const summary = {};
  for (const f of FIELDS) {
    const s = stats(res.map(r => r.outcome[f].mean));
    summary[f] = s;
    const blocks = res.map(r => r.outcome[f].mean.toFixed(2)).join(' ');
    console.log(`  ${f.padEnd(8)} ${String(s.mean).padStart(9)}  +/-${String(s.se).padStart(7)}  t=${String(s.t).padStart(6)}   [${blocks}]`);
  }

  // Per-frame panels: averaged, and reported with their spread so the contrast
  // with the outcome panel above is visible rather than asserted.
  const DIALS = ['aggression', 'defense', 'spacing', 'reactionSpeed'];
  console.log('\n──── ADAPTATION (endpoint spread across opponents) ────');
  for (const d of DIALS) {
    const b = stats(res.map(r => r.base.spread[d]));
    const t = stats(res.map(r => r.treat.spread[d]));
    console.log(`  ${d.padEnd(14)} base ${String(b.mean).padStart(7)} +/-${String(b.se).padEnd(7)}  treat ${String(t.mean).padStart(7)} +/-${t.se}` +
                `   x${b.mean ? (t.mean / b.mean).toFixed(1) : '-'}`);
  }
  console.log('\n──── ADAPTATION (within-match travel) ────');
  for (const d of DIALS) {
    const b = stats(res.map(r => r.base.travel[d]));
    const t = stats(res.map(r => r.treat.travel[d]));
    console.log(`  ${d.padEnd(14)} base ${String(b.mean).padStart(7)}  treat ${String(t.mean).padStart(7)}   x${b.mean ? (t.mean / b.mean).toFixed(1) : '-'}`);
  }

  const l1 = stats(res.map(r => r.behaviourL1));
  console.log(`\n──── BEHAVIOUR ────\n  commit-distribution L1 shift ${l1.mean} +/-${l1.se} pts`);
  const agg = {};
  for (const r of res) for (const x of r.topDeltas) { (agg[x.a] = agg[x.a] || []).push(x.d); }
  const rows = Object.entries(agg).filter(([, v]) => v.length >= Math.ceil(res.length / 2))
    .map(([a, v]) => ({ a, ...stats(v) })).sort((x, y) => Math.abs(y.mean) - Math.abs(x.mean));
  for (const r of rows.slice(0, 12)) {
    console.log(`  ${r.a.padEnd(24)} ${(r.mean > 0 ? '+' : '') + r.mean.toFixed(2)} pts  +/-${r.se}  t=${r.t}  (in ${r.n}/${res.length} blocks)`);
  }

  const ia = res.map(r => r.inferAct && r.inferAct.treat).filter(Boolean);
  if (ia.length) {
    const conv = ia.reduce((a, x) => a + x.converted, 0), expl = ia.reduce((a, x) => a + x.explored, 0);
    const by = {};
    for (const x of ia) for (const k of Object.keys(x.byRule)) by[k] = (by[k] || 0) + x.byRule[k];
    console.log(`\n──── INFER ACT ────\n  treat converted ${conv}  explored ${expl}  (${(conv / (res.length * SEEDS * 9)).toFixed(2)}/match)`);
    for (const k of Object.keys(by).sort((p, q) => by[q] - by[p]).slice(0, 8)) console.log(`    ${String(by[k]).padStart(6)}  ${k}`);
  }

  const out = { label: LABEL, flags: FLAGS, sets: SETS, blocks: res.length, seedsPerBlock: SEEDS,
                matchesPerArm: res.length * SEEDS * 9, at: new Date().toISOString(),
                outcome: summary, behaviourL1: l1,
                blockStocks: res.map(r => r.outcome.stocks.mean) };
  const dir = path.join(ROOT, 'data', 'lab');
  fs.writeFileSync(path.join(dir, `AGG-${LABEL.replace(/[^\w.+-]/g, '_')}-${Date.now()}.json`), JSON.stringify(out, null, 1));
  log(`total wall clock ${((Date.now() - t0) / 60000).toFixed(1)}m`);
})();
