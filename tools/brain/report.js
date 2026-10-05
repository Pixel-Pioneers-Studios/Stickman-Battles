'use strict';
/*
 * tools/brain/report.js — which controls THE BRAIN has learned, from data/brain/log.jsonl. DEV ONLY.
 *
 * "Uses a control" is not "knows it": a random network presses every key
 * constantly. So each control is judged on an EFFECT a random network cannot
 * produce — swings that connect, blocks that stop a hit, supers that land —
 * against the first iterations (the random baseline). A control counts as
 * learned at the first iteration where its effect holds over a 10-iteration
 * window.
 *
 * Usage: node tools/brain/report.js [--json]
 */
const fs = require('fs'), path = require('path');
const dirArg = process.argv.find(a => a.startsWith('--dir='));
const DIR = dirArg ? path.resolve(__dirname, '..', '..', dirArg.slice(6)) : path.resolve(__dirname, '..', '..', 'data', 'brain');
const lines = fs.readFileSync(path.join(DIR, 'log.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
const state = JSON.parse(fs.readFileSync(path.join(DIR, 'state.json'), 'utf8'));
if (!lines.length) { console.log('no iterations logged yet'); process.exit(0); }

function sum(rows) {
  const s = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.stats)) s[k] = (s[k] || 0) + v;
  return s;
}
const perMin = (s, k) => (s[k] || 0) / Math.max(1, s.frames) * 3600;
const ratio = (s, a, b, minB = 1) => (s[b] || 0) >= minB ? (s[a] || 0) / s[b] : 0;
// How much more often a control is pressed under threat than when calm. 1.0 is
// what random mashing scores; needs enough presses in both situations to mean anything.
const situational = (s, t, c) => ((s[t] || 0) >= 20 && (s[c] || 0) >= 20 && s.threatFrames && s.calmFrames)
  ? (s[t] / s.threatFrames) / (s[c] / s.calmFrames) : 0;

// [name, what counts, value(stats), threshold, format]
const CONTROLS = [
  ['Move (left/right)', 'damage dealt per minute',               s => perMin(s, 'dmgDealt'),                     null, v => v.toFixed(0)],
  ['Attack',            'swings that connect',                   s => ratio(s, 'swingHits', 'swings', 50),       0.25, v => (v * 100).toFixed(0) + '%'],
  ['Jump',              'jump rate under threat vs calm (1x=random)', s => situational(s, 'jumpsThreat', 'jumpsCalm'), 2.0, v => v ? v.toFixed(1) + 'x' : '-'],
  ['Double jump',       'double jumps under threat vs calm',     s => situational(s, 'djThreat', 'djCalm'),      2.0, v => v ? v.toFixed(1) + 'x' : '-'],
  ['Fast fall',         'fast falls per minute',                 s => perMin(s, 'fastFalls'),                    null, v => v.toFixed(1)],
  ['Shield',            'incoming hits blocked',                 s => ratio(s, 'blocks', 'hitsTaken', 30),       0.15, v => (v * 100).toFixed(0) + '%'],
  ['Shield timing',     'shield raises under threat vs calm',    s => situational(s, 'shieldThreat', 'shieldCalm'), 2.0, v => v ? v.toFixed(1) + 'x' : '-'],
  ['Ability',           'abilities that hit',                    s => ratio(s, 'abilityHits', 'abilities', 20),  0.30, v => (v * 100).toFixed(0) + '%'],
  ['Super',             'supers that hit',                       s => ratio(s, 'superHits', 'supers', 5),        0.40, v => (v * 100).toFixed(0) + '%'],
  ['Stuns',             'stuns inflicted per minute',            s => perMin(s, 'stuns'),                        null, v => v.toFixed(1)],
  ['Strings',           'hits on a stunned opponent per minute', s => perMin(s, 'strings'),                      1.0,  v => v.toFixed(1)],
  ['Parry',             'parries per minute',                    s => perMin(s, 'parries'),                      0.3,  v => v.toFixed(2)],
  ['Clash',             'clashes per minute',                    s => perMin(s, 'clashes'),                      0.3,  v => v.toFixed(2)],
  ['Clash break',       'clashes won outright per minute',       s => perMin(s, 'clashWins'),                    0.2,  v => v.toFixed(2)],
  ['Guard break',       'shields broken per minute',             s => perMin(s, 'guardBreaks'),                  0.2,  v => v.toFixed(2)],
  ['Domain',            'domains opened per 10 minutes',         s => perMin(s, 'domains') * 10,                 0.5,  v => v.toFixed(2)],
];

const base = sum(lines.slice(0, 3));
// Lines logged before the situational stats (and the one-landing-per-super fix)
// existed. Controls judged on those stats only look at lines after this point.
const FIXED = Math.max(0, lines.findIndex(l => l.stats.threatFrames !== undefined));
const POST_FIX = new Set(['Jump', 'Double jump', 'Shield timing', 'Ability', 'Super']);
const now = sum(lines.slice(-10));
const out = [];
for (const [name, what, fn, thr, fmt] of CONTROLS) {
  const b = fn(base), n = fn(now);
  // Rate-only controls have no absolute bar; they count once they are 3x the
  // random baseline (move) — jumps are shown but not judged, since a random
  // network already jumps constantly.
  const bar = thr !== null ? thr : (name.startsWith('Move') ? Math.max(1, b * 3) : null);
  let learnedAt = null;
  const from = POST_FIX.has(name) ? FIXED : 0;
  if (bar !== null && (!POST_FIX.has(name) || FIXED > 0 || lines[0].stats.threatFrames !== undefined)) {
    for (let i = from + 10; i <= lines.length; i++) {
      if (fn(sum(lines.slice(i - 10, i))) >= bar) { learnedAt = lines[i - 1].iter; break; }
    }
  }
  out.push({ name, what, random: POST_FIX.has(name) && FIXED > 0 ? '-' : fmt(b), now: fmt(n), learnedAt, judged: bar !== null });
}

if (process.argv.includes('--json')) { console.log(JSON.stringify({ state, controls: out }, null, 1)); process.exit(0); }

const last = lines[lines.length - 1];
console.log(`THE BRAIN — iteration ${last.iter}, ${(state.hoursTrained || 0).toFixed(1)}h trained, ${(state.frames / 216000).toFixed(0)}h of game time, ${(state.decisions / 1e6).toFixed(1)}M decisions`);
console.log(`Ladder: ${state.stageLog.map(s => `${s.stage} @${s.iter}`).join('  ->  ')}`);
const byOpp = {};
for (const l of lines.slice(-10)) for (const [k, b] of Object.entries(l.byOpp)) { const o = byOpp[k] || (byOpp[k] = { n: 0, w: 0 }); o.n += b.n; o.w += b.w; }
console.log('Win rate, last 10 iterations: ' + Object.entries(byOpp).map(([k, o]) => `${k} ${(o.w / o.n * 100).toFixed(0)}% (${o.n})`).join(', '));
console.log('');
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('Control', 19) + pad('Measured by', 45) + pad('Random', 9) + pad('Now', 9) + 'Learned');
for (const c of out) {
  console.log(pad(c.name, 19) + pad(c.what, 45) + pad(c.random, 9) + pad(c.now, 9) +
    (!c.judged ? '(usage only)' : c.learnedAt ? `iteration ${c.learnedAt}` : 'not yet'));
}
