'use strict';
/*
 * tools/sov-vector.js — the overnight research loop. DEV ONLY.
 *
 * VECTOR decides, Sovereign executes, each reports its own half:
 *
 *   1. Sovereign runs the stress sweep headless and reports MEASUREMENTS.
 *   2. VECTOR reads a tight digest — never the raw log, never the source tree —
 *      and reports a DESCRIPTION in plain prose.
 *   3. VECTOR proposes a HYPOTHESIS plus a scenario built to expose it, as
 *      schema-constrained JSON so a 3B model cannot emit a tactic or policy
 *      that does not exist.
 *   4. The scenario RUNS. The hypothesis predicted Sovereign would do worse in
 *      it than his baseline; either he did or he did not.
 *   5. Confirmed findings and the match's grid deltas are absorbed into
 *      data/sov-artifact.json, which the game loads at boot.
 *
 * Step 4 is the one that makes this more than an idea generator. A small model
 * handed a log will always produce a fluent story about eight coin flips, and
 * it will never say "I see nothing here". Description proposes; measurement
 * disposes. Nothing reaches the artifact without surviving a run.
 *
 * Usage:
 *   node tools/sov-vector.js [--cycles=8] [--model=llama3.2:3b] [--seeds=2]
 *                            [--port=8099] [--dry] [--verbose]
 *
 *   --cycles   research cycles to run                (default 4)
 *   --hours    stop after this many hours instead     (uncaps --cycles)
 *   --model    ollama model tag                      (default llama3.2:3b)
 *   --seeds    seeds per scenario in the sweep       (default 2)
 *   --dry      run everything, write nothing         (default off)
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
// A run bounded by wall clock rather than by cycle count: cycle duration swings
// with how long a scenario takes to resolve, so "ten cycles" is not a duration.
// --hours governs, and leaves cycles uncapped unless one is passed explicitly.
const HOURS    = parseFloat(args.hours) || 0;
const DEADLINE = HOURS ? Date.now() + HOURS * 3600e3 : 0;
const CYCLES  = parseInt(args.cycles, 10) || (HOURS ? Infinity : 4);
const SEEDS   = parseInt(args.seeds, 10)  || 2;
const PORT    = parseInt(args.port, 10)   || 8099;
const MODEL   = args.model || 'llama3.2:3b';
const DRY     = !!args.dry;
const VERBOSE = !!args.verbose;
const OLLAMA  = 'http://localhost:11434';

const ROOT     = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'data', 'sov-artifact.json');
const LOGDIR   = path.join(ROOT, 'data', 'vector-logs');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

const log = (...a) => console.log('[vector]', ...a);
const vlog = (...a) => { if (VERBOSE) console.log('[vector:v]', ...a); };

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
    // Without this the EADDRINUSE arrives as an unhandled 'error' event and the
    // process dies with a stack trace that looks nothing like "port is taken".
    server.on('error', (e) => {
      console.error(`[vector] cannot listen on :${PORT} \u2014 ${e.code}. ` +
                    'Something else holds that port; pass --port=<n>.');
      process.exit(1);
    });
    server.listen(PORT, () => resolve(server));
  });
}

// ── Ollama ──────────────────────────────────────────────────────────────────
// `format` carries a JSON schema. This is the single most important line in the
// file for small-model reliability: constrained decoding makes an invalid
// policy name or an unknown tactic structurally impossible, which removes the
// dominant 3B failure mode without needing a bigger model.
// num_ctx is kept deliberately modest — a small model reasons WORSE with a long
// prompt, so the brief is short by design and the window is sized to match.
async function ask(prompt, schema, system) {
  const body = {
    model: MODEL,
    stream: false,
    options: { temperature: schema ? 0.2 : 0.6, num_ctx: 4096 },
    messages: [
      { role: 'system', content: system || 'You are VECTOR, a combat analyst for a 2D fighting game. Be concrete and brief. Never invent function names or code.' },
      { role: 'user', content: prompt },
    ],
  };
  if (schema) body.format = schema;
  const r = await fetch(OLLAMA + '/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(180000),
  });
  if (!r.ok) throw new Error('ollama HTTP ' + r.status);
  const d = await r.json();
  const txt = (d.message && d.message.content || '').trim();
  return schema ? JSON.parse(txt) : txt;
}

// ── Briefs ──────────────────────────────────────────────────────────────────
// Tight retrieval, not full context: everything the model needs about THIS
// result and nothing else. A digest is ~15 lines; the raw log for the same
// match is ~900 events.
function describeBrief(run) {
  const t = run.telemetry || {};
  const k = t.taken || {};
  return [
    `SCENARIO: ${run.scenario}`,
    `WHAT IT PUNISHES: ${run.punishes}`,
    `RESULT: Sovereign finished with ${run.result.sovLivesLeft}/5 stocks, opponent lost ${run.result.oppDeaths}.`,
    `He dealt ${run.result.dmgDealt} and took ${run.result.dmgTaken}. He was stunned or ragdolled ${run.result.lockedPct}% of the match.`,
    `OF THE HITS HE TOOK (${k.total || 0} total):`,
    `  ${k.airborne || 0}% landed while he was airborne, ${k.landing || 0}% specifically during landing recovery`,
    `  ${k.stunned || 0}% while he was already stunned, ${k.chained || 0}% within 30 frames of the previous hit`,
    `  ${k.fromBehind || 0}% from behind him, ${k.multiAttacker || 0}% with more than one attacker on him`,
    `  ${k.shielding || 0}% while shielding, ${k.attacking || 0}% while he was mid-swing`,
    `  longest unbroken chain: ${t.worstChain || 0} hits; worst single burst: ${t.worstBurst ? t.worstBurst.dmg + ' damage over ' + t.worstBurst.hits + ' hits' : 'n/a'}`,
    `WHERE (situation cells, c/m/f = close/mid/far, a/l/b = they are above/level/below him):`,
    `  ${Object.entries(t.takenBySituation || {}).map(([s, v]) => `${s}: ${v.hits} hits ${Math.round(v.dmg)} dmg`).join(', ') || 'none'}`,
  ].join('\n');
}

const DESCRIBE_SCHEMA = {
  type: 'object',
  properties: {
    summary:  { type: 'string' },
    weakness: { type: 'string' },
    confident: { type: 'boolean' },
  },
  required: ['summary', 'weakness', 'confident'],
};

function proposeSchema(policies, weapons) {
  return {
    type: 'object',
    properties: {
      hypothesis: { type: 'string' },
      name: { type: 'string' },
      punishes: { type: 'string' },
      // COMPOSITION ONLY — no dmg field. Four measured cycles showed both models
      // choosing multipliers that made their scenario easier than the baseline
      // (by 971, 4026, 4314, 5405). Difficulty is not a thing a prompt can
      // estimate, so it is not asked for: SovScenarios.calibrate() escalates
      // damage against live matches until the stock count hits the target band.
      // The model picks the mechanism; the search picks the magnitude.
      bots: {
        type: 'array', minItems: 1, maxItems: 4,
        items: {
          type: 'object',
          properties: {
            w: { type: 'string', enum: weapons },
            policy: { type: 'string', enum: policies },
          },
          required: ['w', 'policy'],
        },
      },
    },
    required: ['hypothesis', 'name', 'punishes', 'bots'],
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }

  // Fail fast and clearly if Ollama is not up — the loop is worthless without it.
  try {
    const r = await fetch(OLLAMA + '/api/tags', { signal: AbortSignal.timeout(3000) });
    const tags = (await r.json()).models.map(m => m.name);
    if (!tags.includes(MODEL)) {
      log(`model "${MODEL}" not installed. Available: ${tags.join(', ')}`);
      log(`pull it with:  ollama pull ${MODEL}`);
      process.exit(1);
    }
    log(`ollama ok — using ${MODEL}`);
  } catch (e) {
    log('ollama unreachable at ' + OLLAMA + ' — start it with `ollama serve`');
    process.exit(1);
  }

  const server = await startServer();
  log(`server on :${PORT}`);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  page.on('pageerror', e => vlog('PAGEERR', e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle2', timeout: 60000 });

  // BARE identifiers, not window.*. The game's modules are top-level `const` in
  // classic scripts, which are lexically scoped and never become window
  // properties — `window.SMK2Trainer` is permanently undefined while
  // `SMK2Trainer` resolves fine. Testing the window form here cost a 30s
  // timeout and looked exactly like a load failure.
  await page.waitForFunction(
    () => typeof SMK2Trainer !== 'undefined' && typeof SovScenarios !== 'undefined' &&
          typeof SovTelemetry !== 'undefined' && typeof SovArtifact !== 'undefined',
    { timeout: 30000 });
  log('game loaded, all four modules present');

  const policies = await page.evaluate(() => SovScenarios.POLICY_NAMES);
  const weapons  = await page.evaluate(() => (typeof WEAPON_KEYS !== 'undefined' ? WEAPON_KEYS.slice(0, 12) : ['sword']));
  const PROPOSE_SCHEMA = proposeSchema(policies, weapons);

  const session = { started: new Date().toISOString(), model: MODEL, cycles: [] };
  let confirmed = 0, killed = 0;

  // ── Incremental flush ───────────────────────────────────────────────────
  // Everything absorbed lives in the PAGE until exportJSON() pulls it out, so a
  // long run that only wrote at the end could lose all of it to one crash in
  // the last hour. Both writes are whole-file and idempotent; the last wins.
  let _logFile = null;
  async function flush(tag) {
    if (DRY) return;
    const out = await page.evaluate(() => SovArtifact.exportJSON());
    fs.mkdirSync(path.dirname(ARTIFACT), { recursive: true });
    fs.writeFileSync(ARTIFACT, out);
    fs.mkdirSync(LOGDIR, { recursive: true });
    if (!_logFile) _logFile = path.join(LOGDIR, `vector-${Date.now()}.json`);
    fs.writeFileSync(_logFile, JSON.stringify(session, null, 1));
    const d = JSON.parse(out);
    log(`${tag} \u2014 artifact v${d.version}, ${Object.keys(d.grid).length} cells, ` +
        `${d.findings.length} findings, ${d.matches} matches`);
  }

  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    if (DEADLINE && Date.now() >= DEADLINE) {
      log(`\ndeadline reached \u2014 stopping after ${cycle - 1} cycles`);
      break;
    }
    log(`\n──── cycle ${cycle}${CYCLES === Infinity ? '' : '/' + CYCLES} ────`);

    // ── 1. Sovereign reports ────────────────────────────────────────────────
    log('running stress sweep...');
    const sweep = await page.evaluate((s) => {
      const r = SovScenarios.sweep(null, s);
      // Strip the grids out of the transferred payload — they are accumulated
      // separately and would otherwise dominate the serialised result.
      return {
        vec: r.vec, worst: r.worst,
        stocks: r.runs.map(x => x.result.sovLivesLeft),
        runs: r.runs.map(x => ({ scenario: x.scenario, punishes: x.punishes, telemetry: x.telemetry,
          result: { sovLivesLeft: x.result.sovLivesLeft, oppDeaths: x.result.oppDeaths,
                    dmgDealt: x.result.dmgDealt, dmgTaken: x.result.dmgTaken,
                    lockedPct: x.result.lockedPct, fitness: Math.round(x.result.fitness) } })),
        grids: r.runs.map(x => x.result.grid),
      };
    }, SEEDS);

    const sweepStocks = sweep.stocks || [];
    log('worst-case ' + Math.round(sweep.worst) + '  |  ' +
        Object.entries(sweep.vec).map(([k, v]) => `${k} ${v}`).join('  '));

    // The scenario he did worst in is the one worth explaining.
    const worstName = Object.entries(sweep.vec).sort((a, b) => a[1] - b[1])[0][0];
    const worstRun  = sweep.runs.find(r => r.scenario === worstName);
    log(`weakest against: ${worstName}`);

    // ── 2. VECTOR describes ─────────────────────────────────────────────────
    let desc;
    try {
      desc = await ask(
        describeBrief(worstRun) +
        '\n\nDescribe in plain language what happened to Sovereign here and what specific weakness it shows. ' +
        'Base it ONLY on the numbers above. If the numbers do not show a clear pattern, set confident to false.',
        DESCRIBE_SCHEMA);
    } catch (e) { log('describe failed: ' + e.message); continue; }
    log('VECTOR: ' + desc.summary);
    log('  weakness: ' + desc.weakness + (desc.confident ? '' : '  (low confidence)'));

    // ── 3. VECTOR proposes a stressor ───────────────────────────────────────
    let prop;
    try {
      prop = await ask(
        `Sovereign's measured weakness: ${desc.weakness}\n` +
        `His current worst scenario is "${worstName}" (score ${sweep.vec[worstName]}). ` +
        `His baseline worst-case across all scenarios is ${Math.round(sweep.worst)}.\n\n` +
        `Design ONE new training scenario built specifically to exploit that weakness harder than any existing one. ` +
        `Choose 1-4 opponents: their behaviour policy and weapon. Do NOT set difficulty — it is calibrated automatically. ` +
        `Available policies and what they do: turtle (shields and retreats), rusher (charges relentlessly), ` +
        `zoner (holds weapon range), aerial (attacks from above), parry_wall (blocks then punishes recovery), ` +
        `landing_trap (converges on landings), ledge_executioner (carries you to the edge), chip (pokes from max range), ` +
        `random_walk (erratic control). ` +
        `State as "hypothesis" what you predict will happen to him and why.`,
        PROPOSE_SCHEMA);
    } catch (e) { log('propose failed: ' + e.message); continue; }
    log(`VECTOR proposes "${prop.name}": ${prop.bots.map(b => `${b.policy}/${b.w}`).join(' + ')}`);
    log('  hypothesis: ' + prop.hypothesis);

    // ── 4. Measurement disposes ─────────────────────────────────────────────
    const test = await page.evaluate((spec, s) => {
      // Calibrate FIRST: the model gave a composition, the ladder gives it teeth.
      const cal = SovScenarios.calibrate(spec, { targetStocks: 1.8, seeds: Math.max(3, s) });
      if (!cal) return { invalid: true };
      const v = cal.spec;
      const runs = [];
      for (let i = 0; i < s; i++) {
        const r = SovScenarios.run(v, null, (i + 1) * 31337);
        if (r) runs.push({ fitness: r.result.fitness, lockedPct: r.result.lockedPct,
                           dmgTaken: r.result.dmgTaken, sovLivesLeft: r.result.sovLivesLeft,
                           telemetry: r.telemetry, grid: r.result.grid });
      }
      if (!runs.length) return { invalid: true };
      return {
        spec: v, ladder: cal.ladder, calibratedAt: v.calibratedAt,
        avgFitness: Math.round(runs.reduce((a, b) => a + b.fitness, 0) / runs.length),
        avgLocked:  Math.round(runs.reduce((a, b) => a + b.lockedPct, 0) / runs.length * 10) / 10,
        avgTaken:   Math.round(runs.reduce((a, b) => a + b.dmgTaken, 0) / runs.length),
        stocksLeft: Math.round(runs.reduce((a, b) => a + b.sovLivesLeft, 0) / runs.length * 10) / 10,
        telemetry:  runs[0].telemetry,
        grids: runs.map(r => r.grid),
      };
    }, prop, SEEDS);

    if (test.invalid) { log('  proposed spec failed validation — discarded'); killed++; continue; }
    log(`  calibrated to x${test.calibratedAt} — ladder ` +
        test.ladder.map(r => `x${r.k}:${r.stocks}stk`).join(' '));

    // ── The bar ──────────────────────────────────────────────────────────────────
    // FIRST VERSION WAS WRONG and it cost three cycles of false negatives. It
    // compared the calibrated scenario against `sweep.worst` — the single
    // lowest scenario average in the sweep. That number is the minimum of nine
    // noisy samples and swings wildly run to run (gauntlet measured -892, +397
    // and +854 on three consecutive cycles), so the bar moved further than the
    // effect being measured and nothing could ever clear it.
    //
    // A stable bar needs a stable reference and a low-variance statistic:
    //   · stocks, not fitness — fitness is dominated by stockDiff * 400 and
    //     inherits all of its variance plus the damage terms' on top
    //   · the library MEDIAN, not its minimum — a median of nine barely moves
    //
    // So: a proposal is confirmed when it holds Sovereign at or under 2 stocks
    // AND is harder than the typical library scenario. That is a real claim
    // about a stressor, checkable without pretending the noise floor is
    // smaller than it is.
    const libStocks = sweepStocks.slice().sort((a, b) => a - b);
    const median    = libStocks.length ? libStocks[Math.floor(libStocks.length / 2)] : 5;
    const survived  = test.stocksLeft <= 2.0 && test.stocksLeft < median;
    log(`  measured: ${test.stocksLeft}/5 stocks vs library median ${median}/5 ` +
        `| fitness ${test.avgFitness} | locked ${test.avgLocked}%`);
    log(survived ? `  ✓ CONFIRMED — holds him at ${test.stocksLeft} stocks, under the library median of ${median}`
                 : `  ✗ KILLED — ${test.stocksLeft} stocks left, not harder than the library (median ${median})`);

    // ── 5. Absorb ───────────────────────────────────────────────────────────
    const finding = survived ? {
      claim: desc.weakness,
      evidence: `${worstName}: ${worstRun.result.dmgTaken} taken, ${worstRun.result.lockedPct}% locked, ` +
                `${(worstRun.telemetry.taken || {}).landing || 0}% of hits during landing recovery`,
      scenario: test.spec.name,
      spec: test.spec,
      measuredFitness: test.avgFitness,
      measuredStocks: test.stocksLeft,
      libraryMedianStocks: median,
      baselineWorst: Math.round(sweep.worst),
      hypothesis: prop.hypothesis,
      confident: !!desc.confident,
      model: MODEL,
      at: new Date().toISOString(),
    } : null;

    if (survived) confirmed++; else killed++;

    if (!DRY) {
      const allGrids = sweep.grids.concat(test.grids || []);
      await page.evaluate((grids, fnd, matches) => {
        const merged = {};
        for (const g of grids) {
          if (!g) continue;
          for (const sit of Object.keys(g)) {
            const dst = merged[sit] || (merged[sit] = {});
            for (const act of Object.keys(g[sit])) {
              const s = g[sit][act];
              const c = dst[act] || (dst[act] = { tries: 0, taken: 0, dealt: 0 });
              c.tries += s.tries || 0; c.taken += s.taken || 0; c.dealt += s.dealt || 0;
            }
          }
        }
        SovArtifact.absorb({ grid: merged, findings: fnd ? [fnd] : [], matches });
      }, allGrids, finding, allGrids.length);
    }

    session.cycles.push({ cycle, worstName, sweepVec: sweep.vec, sweepWorst: Math.round(sweep.worst),
                          description: desc, proposal: prop, test: { avgFitness: test.avgFitness,
                          avgLocked: test.avgLocked, stocksLeft: test.stocksLeft }, survived });
    await flush(`cycle ${cycle} saved`);
  }

  // ── Write out ───────────────────────────────────────────────────────────
  await flush('\nfinal');
  if (DRY) log('\n--dry: nothing written');
  else     log('session log: ' + path.relative(ROOT, _logFile));
  log(`${confirmed} hypotheses confirmed, ${killed} killed`);

  await browser.close();
  server.close();
})().catch(e => { console.error('[vector] FATAL', e); process.exit(1); });
