'use strict';
/*
 * tools/brain/league.js — the live league, unattended. DEV ONLY.
 *
 * Freeze-and-patch lost: every fresh hunter found a new hole as fast as the last
 * (hunter 1 beat 5135 75%, hunter 2 beat the patched 7584 77%). So the cycle runs
 * on its own until the clock runs out:
 *
 *   main    train data/brain against EVERY hunter so far (train.js --hunters=...)
 *   eval    newest hunter vs the patched main        (did the patch hold?)
 *   hunt    new data/brain-hunterN seeded from main, trained only against it
 *   eval    hunterN vs its frozen target             (how big is the new hole?)
 *
 * Old hunters stay in the league so a patched hole cannot reopen unnoticed.
 * Each phase is its own train.js process; a crash is retried once.
 *
 * Ship gate. The Oct 8 run went 7584 -> 9334 with no net gain: main chased the
 * newest hunter and forgot the fix it had found against the one before. So main
 * now trains a CANDIDATE in data/brain-cand (reset from the shipped data/brain
 * before every main phase, with its snapshot pool) and data/brain/latest.json,
 * which Sovereign loads, only moves if the candidate
 *   1. beats the shipped main by --margin points over the mirror, and
 *   2. is not --tol points easier for ANY hunter in the pool than shipped is.
 * A rejected candidate is thrown away; the next phase starts again from shipped.
 *
 * Memory check (Oct 12). Iter 12756 passed that gate and still played the same
 * with its memory cleared every decision: stronger, not adapting. So every
 * candidate is also played normally and with its memory cleared (adapt.js --wipe=1)
 * against each hunter and against the hunters taking turns in one body. It counts
 * as adapting only if clearing the memory costs it --mem-margin points pooled.
 * This is a verdict in the log, not a ship condition; a candidate that adapts
 * but fails the gate is kept in data/brain-league/ instead of thrown away.
 *
 * Usage: node tools/brain/league.js [--hours=8.5] [--main=2.5] [--hunt=3] [--workers=3]
 *        [--gate-eps=200] [--margin=5] [--tol=6] [--mem-margin=5] [--no-gate] [--torch] [--threads=N] [--gru[=128]] [--main-only]
 *        --main-only stops after the first main phase and its gate (one long candidate run, no new hunter)
 *        --torch / --threads / --gru are passed to every train.js phase (PyTorch update, see train.js)
 * Log:   data/brain-league/league.log  (phase lines + eval headlines + gate verdicts)
 */
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..');
const HOURS = parseFloat(args.hours) || 8.5, MAIN_H = parseFloat(args.main) || 2.5, HUNT_H = parseFloat(args.hunt) || 3;
const WORKERS = String(parseInt(args.workers, 10) || 3);
const TRAIN_EXTRA = [...(args.torch ? ['--torch'] : []), ...(args.threads ? [`--threads=${args.threads}`] : []),
  ...(args.gru ? [args.gru === true ? '--gru' : `--gru=${args.gru}`] : [])];
const MIN_PHASE_H = 0.75;
const GATE = !args['no-gate'], GATE_EPS = parseInt(args['gate-eps'], 10) || 200;
const MARGIN = args.margin !== undefined ? parseFloat(args.margin) : 5, TOL = args.tol !== undefined ? parseFloat(args.tol) : 6;
const MEM_MARGIN = args['mem-margin'] !== undefined ? parseFloat(args['mem-margin']) : 5;
const LDIR = path.join(ROOT, 'data', 'brain-league');
fs.mkdirSync(LDIR, { recursive: true });
const LOG = path.join(LDIR, 'league.log');
const deadline = Date.now() + HOURS * 3600e3;
const hoursLeft = () => (deadline - Date.now()) / 3600e3;
const say = s => { const l = `[league ${new Date().toISOString()}] ${s}`; console.log(l); fs.appendFileSync(LOG, l + '\n'); };

let child = null;
process.on('SIGINT', () => { say('SIGINT: stopping current phase'); if (child) child.kill('SIGINT'); process.exitCode = 130; stopping = true; });
let stopping = false;

function run(script, argv, outFile) {
  return new Promise(res => {
    const out = fs.openSync(outFile, 'a');
    child = spawn(process.execPath, [path.join(__dirname, script), ...argv], { cwd: ROOT, stdio: ['ignore', out, out] });
    child.on('exit', code => { child = null; fs.closeSync(out); res(code); });
  });
}
async function train(argv, outFile, hours) {
  for (let attempt = 0; attempt < 2 && !stopping; attempt++) {
    const h = Math.min(hours, hoursLeft());
    if (h < 0.1) return;
    const t0 = Date.now();
    const code = await run('train.js', [`--workers=${WORKERS}`, `--hours=${h.toFixed(2)}`, ...TRAIN_EXTRA, ...argv], outFile);
    if (code === 0) return;
    say(`train.js exited ${code}; ${attempt ? 'giving up on this phase' : 'retrying in 60 s'}`);
    hours -= (Date.now() - t0) / 3600e3;
    await new Promise(r => setTimeout(r, 60e3));
  }
}
async function evalPair(ckpt, target, tag) {
  if (stopping) return;
  const out = path.join(LDIR, `eval-${tag}.out`);
  const code = await run('hunteval.js', ['--eps=100', '--seed=1', `--ckpt=${ckpt}`, `--target=${target}`], out);
  const txt = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  const head = txt.split('\n').filter(l => /win|%/i.test(l)).slice(0, 4).join(' | ');
  say(`eval ${tag} (exit ${code}): ${head || 'no output, see ' + path.relative(ROOT, out)}`);
}
const hunterDirs = () => fs.readdirSync(path.join(ROOT, 'data'))
  .filter(d => /^brain-hunter\d*$/.test(d) && fs.existsSync(path.join(ROOT, 'data', d, 'latest.json')))
  .sort((a, b) => (parseInt(a.slice(12), 10) || 1) - (parseInt(b.slice(12), 10) || 1))
  .map(d => `data/${d}`);
// Headline numbers of one hunteval run, via its --json file; null when it failed.
async function evalJSON(ckpt, target, tag, extra = []) {
  if (stopping) return null;
  const json = path.join(LDIR, `gate-${tag}.json`), out = path.join(LDIR, `gate-${tag}.out`);
  try { fs.unlinkSync(json); } catch (e) {}
  const code = await run('hunteval.js', [`--eps=${GATE_EPS}`, '--seed=1', `--ckpt=${ckpt}`, `--target=${target}`, `--json=${json}`, ...extra], out);
  try { return JSON.parse(fs.readFileSync(json, 'utf8')); } catch (e) { say(`gate eval ${tag} failed (exit ${code}), see ${path.relative(ROOT, out)}`); return null; }
}
// The candidate's checks. Hunter-vs-shipped is cached per (hunter iter, shipped iter):
// shipped only changes on a pass, and hunters only change while they are hunting.
const vsShipped = new Map();
async function gate(cand, shipped, hunters) {
  const it = iterOf(shipped), ct = iterOf(cand);
  const head = await evalJSON(cand, shipped, `cand${ct}-vs-ship${it}`);
  if (!head) return false;
  const edge = head.hunter.win - head.mirror.win;
  say(`gate: cand ${ct} vs shipped ${it}: ${head.hunter.win.toFixed(0)}% vs mirror ${head.mirror.win.toFixed(0)}% = ${edge >= 0 ? '+' : ''}${edge.toFixed(1)} (need +${MARGIN})`);
  if (edge < MARGIN) return false;
  for (const h of hunters) {
    const hc = `${h}/latest.json`, key = `${h}@${iterOf(hc)}@${it}`, name = h.slice(5);
    if (!vsShipped.has(key)) {
      const r = await evalJSON(hc, shipped, `${name}-vs-ship${it}`, ['--no-mirror']);
      if (!r) return false;
      vsShipped.set(key, r.hunter.win);
    }
    const r = await evalJSON(hc, cand, `${name}-vs-cand${ct}`, ['--no-mirror']);
    if (!r) return false;
    const was = vsShipped.get(key), now = r.hunter.win;
    say(`gate: ${name} wins ${now.toFixed(0)}% vs cand, ${was.toFixed(0)}% vs shipped (tol +${TOL})`);
    if (now - was > TOL) return false;
  }
  return true;
}
// Does the candidate lean on what it remembers of this match? null when the eval failed.
async function memoryCheck(cand, hunters) {
  if (stopping || hunters.length < 2) return null;
  const ct = iterOf(cand), json = path.join(LDIR, `mem-cand${ct}.json`), out = path.join(LDIR, `mem-cand${ct}.out`);
  try { fs.unlinkSync(json); } catch (e) {}
  const nets = hunters.map(h => `${h.slice(5)}:${h}/latest.json`), names = hunters.map(h => h.slice(5)).concat('switch');
  const code = await run('adapt.js', ['--wipe=1', '--greedy', '--switch', `--eps=${GATE_EPS}`, `--ckpt=${cand}`, `--nets=${nets.join(',')}`,
    `--styles=${names.join(',')}`, `--json=${json}`], out);
  let r; try { r = JSON.parse(fs.readFileSync(json, 'utf8')); } catch (e) { say(`memory check failed (exit ${code}), see ${path.relative(ROOT, out)}`); return null; }
  const gap = r.pooled[0] - r.pooled[1], sw = r.rows.find(x => x.opp === 'switch');
  say(`memory: cand ${ct} normal ${r.pooled[0].toFixed(1)}% vs memory cleared ${r.pooled[1].toFixed(1)}% = ${gap >= 0 ? '+' : ''}${gap.toFixed(1)} (need +${MEM_MARGIN})` +
    (sw ? `; vs switching hunters ${sw.win[0].toFixed(0)}% / ${sw.win[1].toFixed(0)}%` : '') + ` -> ${gap >= MEM_MARGIN ? 'ADAPTS' : 'does not adapt'}`);
  return gap >= MEM_MARGIN;
}
const copyDir = (from, to, names) => { fs.mkdirSync(to, { recursive: true }); for (const f of names) if (fs.existsSync(path.join(from, f))) fs.copyFileSync(path.join(from, f), path.join(to, f)); };
const poolFiles = dir => { try { return (JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8')).pool || []).map(p => p.file); } catch (e) { return []; } };
const iterOf = p => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')).iter; } catch (e) { return '?'; } };

(async () => {
  const main = path.join(ROOT, 'data', 'brain');
  const CAND = 'data/brain-cand', cand = path.join(ROOT, CAND);
  let shipped = 0, rejected = 0;
  const bak = path.join(main, `pre-league-${Date.now()}`);
  fs.mkdirSync(bak, { recursive: true });
  for (const f of ['latest.json', 'state.json']) fs.copyFileSync(path.join(main, f), path.join(bak, f));
  say(`start: ${HOURS} h, main iter ${iterOf('data/brain/latest.json')}, backup ${path.relative(ROOT, bak)}, hunters ${hunterDirs().join(',')}`);

  let phase = 'main';
  while (!stopping && hoursLeft() >= MIN_PHASE_H) {
    const hunters = hunterDirs(), newest = hunters[hunters.length - 1];
    if (phase === 'main') {
      if (!GATE) {
        say(`MAIN vs ${hunters.join(',')} for ${Math.min(MAIN_H, hoursLeft()).toFixed(2)} h (no gate)`);
        await train([`--hunters=${hunters.join(',')}`], path.join(main, 'train.out'), MAIN_H);
        say(`main done at iter ${iterOf('data/brain/latest.json')}`);
        await evalPair(`${newest}/latest.json`, 'data/brain/latest.json', `${newest.slice(5)}-vs-main${iterOf('data/brain/latest.json')}`);
        phase = 'hunt'; continue;
      }
      // Fresh candidate from shipped: checkpoint, state, and the snapshot pool state.json names.
      fs.rmSync(cand, { recursive: true, force: true });
      copyDir(main, cand, ['latest.json', 'state.json']);
      copyDir(path.join(main, 'snapshots'), path.join(cand, 'snapshots'), poolFiles(main));
      say(`MAIN (candidate ${CAND}) from shipped iter ${iterOf('data/brain/latest.json')} vs ${hunters.join(',')} for ${Math.min(MAIN_H, hoursLeft()).toFixed(2)} h`);
      await train([`--dir=${CAND}`, `--hunters=${hunters.join(',')}`], path.join(cand, 'train.out'), MAIN_H);
      say(`candidate done at iter ${iterOf(CAND + '/latest.json')}`);
      if (stopping) break;
      const adapts = await memoryCheck(`${CAND}/latest.json`, hunters);
      const passed = await gate(`${CAND}/latest.json`, 'data/brain/latest.json', hunters);
      if (adapts && !passed) {
        const keep = `cand-${iterOf(CAND + '/latest.json')}-adapts.json`;
        fs.copyFileSync(path.join(cand, 'latest.json'), path.join(LDIR, keep));
        say(`kept the adapting candidate as data/brain-league/${keep}`);
      }
      if (passed) {
        const was = iterOf('data/brain/latest.json');
        const newSnaps = poolFiles(cand).filter(f => !fs.existsSync(path.join(main, 'snapshots', f)));
        copyDir(path.join(cand, 'snapshots'), path.join(main, 'snapshots'), newSnaps);
        copyDir(cand, main, ['latest.json', 'state.json']);
        try { fs.appendFileSync(path.join(main, 'log.jsonl'), fs.readFileSync(path.join(cand, 'log.jsonl'))); } catch (e) {}
        shipped++;
        say(`gate PASS: shipped ${was} -> ${iterOf('data/brain/latest.json')}`);
      } else {
        rejected++;
        say(`gate REJECT: shipped stays ${iterOf('data/brain/latest.json')}`);
      }
      phase = 'hunt';
      if (args['main-only']) break;
    } else {
      const n = Math.max(...hunters.map(d => parseInt(d.slice(17), 10) || 1)) + 1;
      const rel = `data/brain-hunter${n}`, dir = path.join(ROOT, rel);
      fs.mkdirSync(dir, { recursive: true });
      for (const f of ['latest.json', 'state.json']) fs.copyFileSync(path.join(main, f), path.join(dir, f));
      fs.copyFileSync(path.join(main, 'latest.json'), path.join(dir, 'target.json'));
      say(`HUNT ${rel} vs frozen main iter ${iterOf(rel + '/target.json')} for ${Math.min(HUNT_H, hoursLeft()).toFixed(2)} h`);
      await train([`--dir=${rel}`, `--hunt=${rel}/target.json`], path.join(dir, 'train.out'), HUNT_H);
      await evalPair(`${rel}/latest.json`, `${rel}/target.json`, `hunter${n}-vs-target`);
      phase = 'main';
    }
  }
  say(`end: main iter ${iterOf('data/brain/latest.json')}${GATE ? `, gate ${shipped} shipped / ${rejected} rejected` : ''}, hunters ${hunterDirs().join(',')}`);
})().catch(e => { say('FATAL ' + (e.stack || e)); process.exit(1); });
