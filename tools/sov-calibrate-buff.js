'use strict';
/*
 * tools/sov-calibrate-buff.js — WHAT DOES A HUMAN ACTUALLY DO TO SOVEREIGN?
 *
 * DUEL_BUFF (js/smb-smk2-training.js) is a sim calibration knob, not game
 * balance — it never touches shipped gameplay. Its whole job is to make a
 * scripted panel opponent inflict what a real player inflicts, so the fitness
 * terms measuring damage-taken and lockout have something honest to select
 * against. It has never been tuned against real numbers; 2.2/1.6 is a guess,
 * and the comment at its definition says "tune it against real-match numbers,
 * not vibes". This produces those numbers.
 *
 * Reads every tracked .smbreplay that is a human (ai:0) vs Sovereign match and
 * reports, per match and pooled:
 *   - human damage dealt to Sovereign per 1000 LIVE frames   -> dmg target
 *   - Sovereign's lockout share (stunned or ragdolled)       -> chaining target
 *   - the same two for Sovereign against the human           -> symmetry check
 *
 * Frame accounting, which is where the naive version goes wrong:
 *   - frames are sampled every meta.recordEveryN game frames, so sampled-frame
 *     counts must be scaled or every per-1000-frame figure is 3x too big;
 *   - the finisher lock (hp === 1 && inv > 500) freezes a fighter at 1 HP for
 *     a long invincible cinematic. Those frames are not fighting. Counting
 *     them moved per-frame stats by 18-37% in earlier work, so they are cut.
 *
 * Usage: node tools/sov-calibrate-buff.js
 */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');

const files = [...new Set(
  cp.execSync('git ls-files', { cwd: ROOT }).toString().split('\n')
    .filter(f => f.endsWith('.smbreplay'))
)];

const isLocked = p => p && p.hp === 1 && (p.inv || 0) > 500; // finisher lock
const rows = [], skipped = [];

for (const rel of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (e) { continue; }
  const meta = j.meta || {}, frames = (j.frames || []).filter(Boolean);
  if (!frames.length) continue;
  const f0 = frames[0];
  if (f0.length !== 2) continue;

  // Human is the ai:0 slot; Sovereign is the other. Identify by frame data, not
  // meta.players — meta reported ai:1 for a slot the frames show as ai:0.
  const hi = f0.findIndex(p => !p.ai), si = 1 - hi;
  if (hi < 0 || !/SOVEREIGN/i.test(f0[si].name || '')) continue;

  const every = meta.recordEveryN || 1;
  let live = 0, lockH = 0, lockS = 0;
  for (const fr of frames) {
    const h = fr[hi], s = fr[si];
    if (!h || !s) continue;
    if (isLocked(h) || isLocked(s)) continue;       // finisher cinematic, not a fight
    if (h.hp <= 0 || s.hp <= 0) continue;           // dead / awaiting respawn
    live++;
    if ((h.stn || 0) > 0 || (h.rag || 0) > 0) lockH++;
    if ((s.stn || 0) > 0 || (s.rag || 0) > 0) lockS++;
  }
  if (live < 100) continue;
  const liveGameFrames = live * every;

  // `p` in a dmg event is the VICTIM slot (verified: v:16 with hp:134 against a
  // 150 max is the victim's post-hit HP). So damage dealt BY the human is the
  // damage recorded against Sovereign.
  let dmgToSov = 0, dmgToHuman = 0, guessed = 0, nEv = 0;
  for (const e of (j.events || [])) {
    if (e.t !== 'dmg') continue;
    nEv++; if (e.byGuess) guessed++;
    if (e.p === si) dmgToSov += (e.v || 0); else if (e.p === hi) dmgToHuman += (e.v || 0);
  }

  // Replays older than the event log (pre-4.0.x) carry `events: []`. They look
  // like a perfectly quiet match — 0 damage both ways — and silently dragged the
  // pooled median to 0.0. A match with no damage events is unmeasurable, not calm.
  if (!nEv) { skipped.push(rel.split('/').pop()); continue; }

  rows.push({
    file: rel.split('/').pop(), date: new Date(meta.date || 0).toISOString().slice(0, 10),
    winner: meta.winner || '?', liveGameFrames,
    humanDmgPer1k: 1000 * dmgToSov / liveGameFrames,
    sovDmgPer1k:   1000 * dmgToHuman / liveGameFrames,
    sovLockPct: 100 * lockS / live, humanLockPct: 100 * lockH / live,
    guessPct: nEv ? 100 * guessed / nEv : 0,
    hw: f0[hi].wk, hc: f0[hi].cls, sw: f0[si].wk,
  });
}

rows.sort((a, b) => a.date.localeCompare(b.date));
const pad = (s, n) => String(s).padEnd(n), num = (v, n, d = 1) => v.toFixed(d).padStart(n);
console.log(`\n=== HUMAN vs SOVEREIGN — ${rows.length} measurable matches ===`);
if (skipped.length) console.log(`(${skipped.length} skipped: no damage-event log — ${skipped.join(', ')})`);
console.log('');
console.log(`${pad('date',11)}${pad('human kit',18)}${pad('win',10)}${'frames'.padStart(7)}` +
            `${'humDmg/1k'.padStart(11)}${'sovDmg/1k'.padStart(11)}${'sovLock%'.padStart(10)}${'humLock%'.padStart(10)}${'guess%'.padStart(8)}`);
for (const r of rows) {
  console.log(pad(r.date, 11) + pad(`${r.hw}/${r.hc}`, 18) + pad(r.winner, 10) +
    String(r.liveGameFrames).padStart(7) + num(r.humanDmgPer1k, 11) + num(r.sovDmgPer1k, 11) +
    num(r.sovLockPct, 10) + num(r.humanLockPct, 10) + num(r.guessPct, 8, 0));
}
const agg = k => { const a = rows.map(r => r[k]).sort((x, y) => x - y);
  return { med: a[a.length >> 1], min: a[0], max: a[a.length - 1],
           mean: a.reduce((s, v) => s + v, 0) / a.length }; };
const hd = agg('humanDmgPer1k'), sd = agg('sovDmgPer1k'), sl = agg('sovLockPct');
console.log(`\n  human dmg/1k to Sovereign   median ${hd.med.toFixed(1)}  mean ${hd.mean.toFixed(1)}  range ${hd.min.toFixed(1)}-${hd.max.toFixed(1)}`);
console.log(`  Sovereign dmg/1k to human   median ${sd.med.toFixed(1)}  mean ${sd.mean.toFixed(1)}  range ${sd.min.toFixed(1)}-${sd.max.toFixed(1)}`);
console.log(`  Sovereign lockout share     median ${sl.med.toFixed(1)}%  mean ${sl.mean.toFixed(1)}%  range ${sl.min.toFixed(1)}-${sl.max.toFixed(1)}%`);
console.log(`\n  CALIBRATION TARGETS for a duel-panel opponent:`);
console.log(`    damage into Sovereign : ${hd.med.toFixed(1)} per 1000 live frames`);
console.log(`    lock Sovereign        : ${sl.med.toFixed(1)}% of live frames`);
const gm = rows.reduce((s, r) => s + r.guessPct, 0) / rows.length;
console.log(`\n  CAVEAT: ${gm.toFixed(0)}% of damage events are attributed by GUESS`);
console.log(`  (event.byGuess), so per-side damage carries real attribution error.`);
console.log(`  The lockout share is read from per-frame stn/rag and does not.\n`);
console.log(`  Run the sim panel with noBuff and compare; DUEL_BUFF.dmg should be`);
console.log(`  whatever multiple closes the gap, not a guessed 2.2.\n`);
fs.writeFileSync(path.join(ROOT, 'tools', 'sov-calibrate-buff-results.json'),
  JSON.stringify({ rows, targets: { humanDmgPer1k: hd, sovDmgPer1k: sd, sovLockPct: sl } }, null, 1));
console.log('wrote tools/sov-calibrate-buff-results.json');
