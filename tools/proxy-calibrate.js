'use strict';
/*
 * tools/proxy-calibrate.js — search tools/human-proxy.js parameters until its
 * OUTCOME STATISTICS against the current shipping Sovereign match a real
 * human's, scored identically by tools/proxy-stats.js.
 *
 * Two kit profiles, pinned to real replays (see tools/proxy-stats.js output):
 *   A: player spear/gunner   vs Sovereign sword/ninja  (smb_replay_sovereign_2026-09-22)
 *   B: player sword/paladin  vs Sovereign katana/ronin  (smb_replay_sovereign_2026-09-21(1))
 *
 * Sovereign runs at shipping SMK2_TUNE defaults, noBuff, SovDossier reset per
 * match (no persistent memory across the calibration set — see --memory to
 * test that separately). 10 lives each side, maxFrames large enough to finish.
 *
 * ITERATION 2: searches ALL tools/human-proxy.js parameters (not just 6), and
 * weights damage-INTO-the-proxy and both sides' airborne% heavily in the
 * objective — the iter.1 finding was that the proxy's offense was fine but
 * its defense (damage taken, lockout%, mobility) was nowhere close to human,
 * traced to near-zero airtime (jumpInRate alone was not enough).
 *
 * Also runs a loadout-distribution pass: the calibrated proxy vs each of
 * Sovereign's 7 SMK2_LOADOUTS kits, ~60 matches each, reporting how often he
 * gets >=7 of 10 kills per kit.
 *
 * Usage: node tools/proxy-calibrate.js [--matches=40] [--rounds=3] [--jobs=5] [--final=200] [--loadoutMatches=60]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const PS = require('./proxy-stats.js');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const M       = parseInt(args.matches, 10) || 40;   // matches per candidate per round
const ROUNDS  = parseInt(args.rounds, 10) || 3;
const JOBS    = parseInt(args.jobs, 10) || 5;
const FINAL_M = parseInt(args.final, 10) || 200;    // matches for the final report
const LOADOUT_M = parseInt(args.loadoutMatches, 10) || 60;
const BASEPORT = parseInt(args.port, 10) || 9700;
const log = (...a) => console.log('[proxy-calibrate]', ...a);

// NO sovKit: pinning it silently applies that class's stat line to Sovereign
// (e.g. sword/ninja runs him at 126 max HP instead of his real 150) —
// confirmed by the coordinator as a confound in every earlier calibration.
// He must pick his own loadout, same as a real match.
const PROFILES = [
  { name: 'A', opp: { w: 'spear', c: 'gunner' } },
  { name: 'B', opp: { w: 'sword', c: 'paladin' } },
];

// Sovereign's 7 curated kits (SMK2_LOADOUTS in js/smb-smk2-class.js) — used by
// the loadout-distribution pass, player fixed on spear/gunner (profile A).
const SOV_LOADOUTS = [
  { key: 'signature', w: 'nullblade', c: 'berserker' },
  { key: 'ronin',     w: 'katana',    c: 'ronin' },
  { key: 'ninja',     w: 'sword',     c: 'ninja' },
  { key: 'reaper',    w: 'scythe',    c: 'reaper' },
  { key: 'torren',    w: 'hammer',    c: 'thor' },
  { key: 'varek',     w: 'axe',       c: 'kratos' },
  { key: 'pugilist',  w: 'combat',    c: 'pugilist' },
];
const LOADOUT_PLAYER_KIT = { w: 'spear', c: 'gunner' };

function djb2(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h; }

// Human targets, computed once from proxy-stats over ALL scoreable replays
// (the general target table) — used as the calibration objective. Profile-
// specific replay stats are reported separately for context.
function humanTargets() {
  const { execSync } = require('child_process');
  const os = require('os');
  // Scoped search — see the matching note in tools/proxy-stats.js: a full
  // `find $HOME` was measured hanging (20s+) and once returned 0 results.
  const roots = [ROOT, path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'Desktop')]
    .filter(p => { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } });
  let out = '';
  try { out = execSync(`find ${roots.map(r => `"${r}"`).join(' ')} -name "*.smbreplay" 2>/dev/null`, { maxBuffer: 1 << 24 }).toString(); }
  catch (e) { out = (e.stdout || '').toString(); }
  const files = out.split('\n').filter(Boolean);
  const rows = [];
  for (const f of files) { try { const r = PS.statsFromReplay(f); if (r) rows.push(r); } catch (e) {} }
  const mean = k => rows.reduce((a, r) => a + r.stats[k], 0) / rows.length;
  return {
    n: rows.length,
    dmgToOppPer1k: mean('dmgToOppPer1k'),   // human's output onto Sovereign
    dmgToMePer1k: mean('dmgToMePer1k'),     // Sovereign's output onto human — PRIORITY ONE
    lockoutPct: mean('lockoutPct'),
    meAirPct: mean('meAirPct'),             // human's own airborne%
    oppAirPct: mean('oppAirPct'),           // Sovereign's airborne%
    killRatio: mean('killsOpp') / (mean('killsOpp') + mean('killsMe') + 1e-9),
    exposure: PS.mergeExposure(rows.map(r => r.stats)),
    rows,
  };
}

// Relative-squared-error objective: lower is better. Damage-into-the-proxy
// and both sides' airborne% carry the heaviest weight per the iter.2 brief —
// human-like DEFENSE matters more than anything else.
function score(sim, target) {
  const rel = (v, t) => { const d = (v - t) / Math.max(1, Math.abs(t)); return d * d; };
  const killRatioSim = sim.killsOpp / (sim.killsOpp + sim.killsMe + 1e-9);
  return 4.0 * rel(sim.dmgToMePer1k, target.dmgToMePer1k)     // damage INTO proxy — top priority
       + 2.0 * rel(sim.meAirPct, target.meAirPct)             // proxy's own airborne%
       + 2.0 * rel(sim.oppAirPct, target.oppAirPct)           // Sovereign's airborne%
       + 1.5 * rel(sim.dmgToOppPer1k, target.dmgToOppPer1k)
       + 1.0 * rel(killRatioSim, target.killRatio)
       + 1.0 * rel(sim.lockoutPct, target.lockoutPct);
}

function aggregate(recs) {
  // recs: array of per-match extractStats() outputs (meIdx=0 proxy, oppIdx=1 sov)
  const mean = k => recs.reduce((a, r) => a + r[k], 0) / recs.length;
  const se = k => { const m = mean(k); const v = recs.reduce((a, r) => a + (r[k] - m) ** 2, 0) / Math.max(1, recs.length - 1); return Math.sqrt(v / recs.length); };
  const out = {};
  for (const k of ['dmgToOppPer1k', 'dmgToMePer1k', 'lockoutPct', 'meAirPct', 'oppAirPct', 'bothGroundPct', 'meanDist', 'hitsPerOpeningOnMe', 'hitsPerOpeningOnOpp', 'killsOpp', 'killsMe']) {
    out[k] = mean(k); out[k + '_se'] = se(k);
  }
  out.n = recs.length;
  return out;
}

// ── Worker: runs `tasks` (a list of {id, params, profiles?}), `matches` per
// task, entirely inside one page session. `profiles` (array) defaults to the
// module-level PROFILES; the loadout-distribution pass overrides it per task
// with a single fixed kit so every match in that task uses the same loadout. ─
async function worker() {
  const port = parseInt(args.wport, 10);
  const tasks = JSON.parse(fs.readFileSync(args.tasksFile, 'utf8'));
  const matches = parseInt(args.taskMatches, 10);
  const noBuff = args.noBuff !== '0';
  const memory = args.memory === '1';

  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = await new Promise(res => {
    const s = http.createServer((req, rs) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rs);
    });
    s.listen(port, () => res(s));
  });
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 1800000, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', r => (r.url().startsWith(`http://localhost:${port}/`) || r.url().startsWith('data:')) ? r.continue() : r.abort());
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 600000 });
  await page.waitForFunction(() => typeof SMK2Trainer !== 'undefined' && typeof SovDossier !== 'undefined', { timeout: 600000 });
  await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'tools', 'human-proxy.js'), 'utf8') });

  const results = [];
  for (const task of tasks) {
    const profiles = task.profiles || PROFILES;
    const perMatchStats = await page.evaluate((params, matches, profiles, noBuff, memory, taskIdHash) => {
      const _cl = console.log; console.log = () => {};
      try { SovDossier.reset(); } finally { console.log = _cl; }
      // Iteration-3 baseline: measure the proxy/Sovereign matchup WITHOUT the
      // new habit-engine feature (SMK2_TUNE.habitAir), per the coordinator's
      // instruction. Set once — _runMatch never touches SMK2_TUNE, so it holds
      // for every match this task runs.
      if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) SMK2_TUNE.habitAir = false;
      let s = (0x9E3779B9 ^ Math.imul(taskIdHash, 0x85EBCA6B)) >>> 0;
      Math.random = function () {
        s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const out = [];
      for (let i = 0; i < matches; i++) {
        const prof = profiles[i % profiles.length];
        if (!memory) { const _c = console.log; console.log = () => {}; try { SovDossier.reset(); } finally { console.log = _c; } }
        const ai = HumanProxy.controller(params);
        const r = SMK2Trainer.runMatch(null, 1, ((i + 1) * 7919 + taskIdHash) >>> 0, {
          duel: true, noBuff, lives: 10, maxFrames: 24000, record: true,
          opp: prof.opp, sovKit: prof.sovKit, oppAI: function () { return ai.call(this); },
        });
        if (r.rec) out.push({ profile: prof.name, rec: r.rec, sovLivesLeft: r.sovLivesLeft, oppDeaths: r.oppDeaths });
      }
      return out;
    }, task.params, matches, profiles, noBuff, memory, djb2(task.id));
    results.push({ id: task.id, matches: perMatchStats });
  }
  process.stdout.write('RESULT ' + JSON.stringify(results) + '\n');
  await browser.close(); server.close();
}

async function runTasks(tasks, matchesPer, noBuff, memory) {
  // Shard tasks across JOBS worker processes.
  const shards = Array.from({ length: JOBS }, () => []);
  tasks.forEach((c, i) => shards[i % JOBS].push(c));
  const tmp = path.join(ROOT, 'tools', '.calib-tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const all = [];
  await Promise.all(shards.map((shard, slot) => new Promise(resolve => {
    if (!shard.length) return resolve();
    const tasksFile = path.join(tmp, `shard-${slot}-${Date.now()}.json`);
    fs.writeFileSync(tasksFile, JSON.stringify(shard));
    const p = spawn('node', [__filename, '--worker', `--wport=${BASEPORT + slot}`, `--tasksFile=${tasksFile}`,
                             `--taskMatches=${matchesPer}`, `--noBuff=${noBuff ? '1' : '0'}`, `--memory=${memory ? '1' : '0'}`],
                    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '', tail = '';
    p.stdout.on('data', d => { buf += d; }); p.stderr.on('data', d => { tail = (tail + d).slice(-2000); });
    p.on('close', () => {
      fs.unlinkSync(tasksFile);
      const line = buf.split('\n').find(l => l.startsWith('RESULT '));
      if (!line) { log('SHARD FAILED', tail.split('\n').filter(l => l && !/^\s+at /.test(l)).slice(-4).join(' | ')); return resolve(); }
      for (const r of JSON.parse(line.slice(7))) all.push(r);
      resolve();
    });
  })));
  return all; // [{id, matches:[{profile, rec, sovLivesLeft, oppDeaths}]}]
}

// Split ONE (params, totalMatches) config into JOBS parallel shards so a
// large final/loadout run isn't stuck on a single page (iter.1's final(150)
// ran single-threaded because there was only one "candidate").
async function runParallelSingle(idPrefix, params, totalMatches, noBuff, memory, profiles) {
  const per = Math.ceil(totalMatches / JOBS);
  const tasks = [];
  for (let i = 0; i < JOBS && i * per < totalMatches; i++) {
    tasks.push({ id: `${idPrefix}_${i}`, params, profiles });
  }
  const results = await runTasks(tasks, per, noBuff, memory);
  const matches = results.flatMap(r => r.matches).slice(0, totalMatches);
  return matches;
}

function scoreCandidateResult(result, target) {
  const recs = result.matches.map(m => PS.extractStats(m.rec, 0, 1));
  const agg = aggregate(recs);
  return { score: score(agg, target), agg, raw: result.matches };
}

// Search ALL human-proxy.js parameters — iter.1 found no improvement over 6
// dims; the brief for iter.2 is that the limiting factor may live in the
// other 14 (the new evasion/mobility ones especially).
const PARAM_STEPS = {
  reactionFrames: 3, decisionEvery: 2, spacing: 15,
  pokeRate: 0.15, whiffPunish: 0.15, antiAir: 0.15,
  jumpInRate: 0.03, shieldUse: 0.05, abilityRate: 0.15, superRate: 0.15,
  comboFollow: 0.15, retreatDiscipline: 0.15,
  evadeJump: 0.15, doubleJumpEvade: 0.15, fastFallRate: 0.15,
  airHopRate: 0.06, aboveAttackRate: 0.15,
};
const PARAM_BOUNDS = {
  reactionFrames: [8, 22], decisionEvery: [3, 10], spacing: [60, 150],
  pokeRate: [0.2, 0.85], whiffPunish: [0.25, 0.9], antiAir: [0.2, 0.85],
  jumpInRate: [0.0, 0.3], shieldUse: [0.0, 0.5], abilityRate: [0.1, 0.9], superRate: [0.3, 0.95],
  comboFollow: [0.2, 0.9], retreatDiscipline: [0.1, 0.9],
  evadeJump: [0.1, 0.9], doubleJumpEvade: [0.1, 0.9], fastFallRate: [0.05, 0.8],
  airHopRate: [0.0, 0.4], aboveAttackRate: [0.1, 0.9],
};

// ITERATION 3 — the proxy is now treated as a calibrated INSTRUMENT: the
// iter.2 behavior params (mobility/evasion/offense) are held at their tuned
// defaults, and the ONE new knob under search is the anticipation layer
// (readRate p, offenseRead q). This is deliberately not another full
// coordinate descent over all 19 params — the brief is to isolate and
// calibrate the read-based defense mechanism specifically, on TOP of the
// iter.2 baseline, and show its curve.
const READ_RATE_POINTS = [0, 0.25, 0.5, 0.7, 0.85];
const OFFENSE_READ_POINTS = [0, 0.3, 0.6];

async function calibrate() {
  const HumanProxyDefaults = require('./human-proxy.js').DEFAULTS;
  log('computing human targets from replays...');
  const target = humanTargets();
  console.log('\n════ HUMAN TARGET (mean over', target.n, 'scoreable replays) ════');
  console.log(JSON.stringify({ dmgToOppPer1k: target.dmgToOppPer1k, dmgToMePer1k: target.dmgToMePer1k,
                                lockoutPct: target.lockoutPct, meAirPct: target.meAirPct, oppAirPct: target.oppAirPct,
                                killRatio: target.killRatio }, null, 2));
  console.log('\nHuman exposure (time share % / hits per 1000 frames there):');
  const keys = []; for (let d = 0; d <= PS.D_EDGES.length; d++) for (const g of ['g', 'a']) keys.push(d + g);
  console.log('  ' + ''.padEnd(10) + keys.map(k => k.padStart(9)).join(''));
  PS.printExposure('human', target.exposure);

  const base = Object.assign({}, HumanProxyDefaults); // iter.2-tuned mobility/evasion, held fixed

  log(`readRate (p) curve: ${READ_RATE_POINTS.join(', ')} — n=${M} each`);
  const pTasks = READ_RATE_POINTS.map(p => ({ id: 'p_' + p, params: Object.assign({}, base, { readRate: p }) }));
  const pResults = await runTasks(pTasks, M, true, false);
  console.log('\n════ READ-RATE CURVE (damage into proxy vs p) ════');
  console.log('  p        dmg->proxy/1k    dmg->sov/1k    lock%    meAir%    sovAir%    killRatio');
  let bestP = READ_RATE_POINTS[0], bestPScore = Infinity, bestPAgg = null;
  for (const p of READ_RATE_POINTS) {
    const r = pResults.find(x => x.id === 'p_' + p);
    const { score: s, agg } = scoreCandidateResult(r, target);
    const kr = agg.killsOpp / (agg.killsOpp + agg.killsMe + 1e-9);
    console.log(`  ${String(p).padEnd(8)} ${agg.dmgToMePer1k.toFixed(1).padStart(12)}    ${agg.dmgToOppPer1k.toFixed(1).padStart(9)}    ${agg.lockoutPct.toFixed(1).padStart(5)}    ${agg.meAirPct.toFixed(1).padStart(6)}    ${agg.oppAirPct.toFixed(1).padStart(7)}    ${kr.toFixed(2)}   (score=${s.toFixed(2)})`);
    if (s < bestPScore) { bestPScore = s; bestP = p; bestPAgg = agg; }
  }
  log(`best p so far = ${bestP} (score ${bestPScore.toFixed(2)})`);

  log(`offenseRead (q) refinement at p=${bestP}: ${OFFENSE_READ_POINTS.join(', ')} — n=${M} each`);
  const qBase = Object.assign({}, base, { readRate: bestP });
  const qTasks = OFFENSE_READ_POINTS.map(q => ({ id: 'q_' + q, params: Object.assign({}, qBase, { offenseRead: q }) }));
  const qResults = await runTasks(qTasks, M, true, false);
  console.log('\n════ OFFENSE-READ REFINEMENT at p=' + bestP + ' ════');
  console.log('  q        dmg->proxy/1k    dmg->sov/1k    score');
  let bestQ = OFFENSE_READ_POINTS[0], bestQScore = bestPScore, bestQAgg = bestPAgg;
  for (const q of OFFENSE_READ_POINTS) {
    const r = qResults.find(x => x.id === 'q_' + q);
    const { score: s, agg } = scoreCandidateResult(r, target);
    console.log(`  ${String(q).padEnd(8)} ${agg.dmgToMePer1k.toFixed(1).padStart(12)}    ${agg.dmgToOppPer1k.toFixed(1).padStart(9)}    ${s.toFixed(2)}`);
    if (s < bestQScore) { bestQScore = s; bestQ = q; bestQAgg = agg; }
  }

  const best = Object.assign({}, base, { readRate: bestP, offenseRead: bestQ });
  console.log('\n════ FINAL PROXY PARAMETERS ════');
  console.log(JSON.stringify(best, null, 2));
  fs.writeFileSync(path.join(ROOT, 'tools', 'human-proxy-params.json'), JSON.stringify(best, null, 2));
  log('saved to tools/human-proxy-params.json');

  log(`final evaluation: ${FINAL_M} matches with the best parameters, parallel across ${JOBS} shards`);
  const finalMatches = await runParallelSingle('final', best, FINAL_M, true, false);
  const finalRecs = finalMatches.map(m => PS.extractStats(m.rec, 0, 1));
  const finalAgg = aggregate(finalRecs);
  const simExposure = PS.mergeExposure(finalRecs);

  const sov7of10 = finalMatches.filter(m => m.oppDeaths >= 7).length;
  const proxyKillsSov7of10 = finalMatches.filter(m => (10 - m.sovLivesLeft) >= 7).length;

  console.log('\n════ SIM vs HUMAN (final, n=' + finalAgg.n + ') ════');
  const cmp = (label, simK, tgtV) => console.log(`  ${label.padEnd(28)} sim=${finalAgg[simK].toFixed(2)} ±${finalAgg[simK + '_se'].toFixed(2)}   human=${tgtV.toFixed(2)}`);
  cmp('damage into Sovereign/1k', 'dmgToOppPer1k', target.dmgToOppPer1k);
  cmp('damage into proxy/1k', 'dmgToMePer1k', target.dmgToMePer1k);
  cmp('lockout %', 'lockoutPct', target.lockoutPct);
  cmp("proxy's airborne %", 'meAirPct', target.meAirPct);
  cmp("Sovereign's airborne %", 'oppAirPct', target.oppAirPct);
  const simKillRatio = finalAgg.killsOpp / (finalAgg.killsOpp + finalAgg.killsMe + 1e-9);
  console.log(`  ${'kill ratio (sov deaths share)'.padEnd(28)} sim=${simKillRatio.toFixed(2)}   human=${target.killRatio.toFixed(2)}`);
  console.log(`\n  Sovereign got >=7 kills of 10 stocks in ${sov7of10}/${finalMatches.length} sim matches`);
  console.log(`  proxy got >=7 kills of 10 stocks in ${proxyKillsSov7of10}/${finalMatches.length} sim matches`);

  console.log('\n════ EXPOSURE comparison (time share % / hits per 1000 frames there) ════');
  console.log('  ' + ''.padEnd(10) + keys.map(k => k.padStart(9)).join(''));
  PS.printExposure('human', target.exposure);
  PS.printExposure('proxy', simExposure);

  const dmgGap = Math.abs(finalAgg.dmgToMePer1k - target.dmgToMePer1k) / target.dmgToMePer1k;
  console.log(`\n  damage-into-proxy gap vs human: ${(dmgGap * 100).toFixed(0)}%` + (dmgGap <= 0.25 ? ' (within the 25% bar)' : ' (OUTSIDE the 25% bar)'));

  const dir = path.join(ROOT, 'data', 'balance'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `proxy-calibrate-${Date.now()}.json`), JSON.stringify({
    target: Object.assign({}, target, { rows: undefined }), best, finalAgg, simExposure, sov7of10, n: finalMatches.length,
  }, null, 2));

  return best;
}

async function loadoutDistribution(bestParams) {
  log(`loadout distribution: ${SOV_LOADOUTS.length} Sovereign kits x ${LOADOUT_M} matches, player ${LOADOUT_PLAYER_KIT.w}/${LOADOUT_PLAYER_KIT.c}`);
  const tasks = SOV_LOADOUTS.map(lo => ({
    id: 'lo_' + lo.key,
    params: bestParams,
    profiles: [{ name: lo.key, opp: LOADOUT_PLAYER_KIT, sovKit: { w: lo.w, c: lo.c } }],
  }));
  const results = await runTasks(tasks, LOADOUT_M, true, false);
  console.log('\n════ SOVEREIGN LOADOUT DISTRIBUTION vs calibrated proxy (n=' + LOADOUT_M + ' each) ════');
  console.log('  loadout      sov >=7/10 kills   mean sov kills   mean dmg->proxy/1k   mean dmg->sov/1k');
  const summary = [];
  for (const lo of SOV_LOADOUTS) {
    const r = results.find(x => x.id === 'lo_' + lo.key);
    if (!r || !r.matches.length) { console.log(`  ${lo.key.padEnd(12)} NO DATA`); continue; }
    const recs = r.matches.map(m => PS.extractStats(m.rec, 0, 1));
    const n7 = r.matches.filter(m => m.oppDeaths >= 7).length;
    const meanKills = r.matches.reduce((a, m) => a + m.oppDeaths, 0) / r.matches.length;
    const meanDmgToMe = recs.reduce((a, s) => a + s.dmgToMePer1k, 0) / recs.length;
    const meanDmgToOpp = recs.reduce((a, s) => a + s.dmgToOppPer1k, 0) / recs.length;
    console.log(`  ${lo.key.padEnd(12)} ${(100 * n7 / r.matches.length).toFixed(0).padStart(5)}% (${n7}/${r.matches.length})     ${meanKills.toFixed(2).padStart(6)}           ${meanDmgToMe.toFixed(1).padStart(8)}             ${meanDmgToOpp.toFixed(1).padStart(8)}`);
    summary.push({ key: lo.key, pct7of10: 100 * n7 / r.matches.length, meanKills, meanDmgToMe, meanDmgToOpp, n: r.matches.length });
  }
  const dir = path.join(ROOT, 'data', 'balance'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `proxy-loadout-dist-${Date.now()}.json`), JSON.stringify(summary, null, 2));
}

async function main() {
  const best = await calibrate();
  await loadoutDistribution(best);
}

(args.worker ? worker() : main()).catch(e => { console.error('FATAL', e); process.exit(1); });
