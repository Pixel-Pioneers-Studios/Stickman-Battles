'use strict';
/*
 * tools/ghost-build.js — BUILD THE HUMAN MIMIC FROM REPLAYS. DEV ONLY.
 *
 * Reads every .smbreplay where a HUMAN fought Sovereign, extracts
 * (situation -> action) samples with a human reaction lag (tools/ghost-core.js),
 * and writes tools/ghost-model.json:
 *   global     one table for the whole human        (the static ghost)
 *   modes      one table per play mode               (what the hybrid chooses from)
 *   modeFreq   how often the human was in each mode  (the habit prior)
 *   kits       weapon/class the human actually used
 *
 * The newest replays are HELD OUT (never trained on) so the mimic can be
 * checked against human play it has never seen. Replays with an input track
 * (recorded from 2026-09-21 on) use the real key presses instead of inferring
 * actions from state.
 *
 * Usage: node tools/ghost-build.js [--holdout=3]
 */
const fs = require('fs'), path = require('path');
const G = require('./ghost-core.js');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const HOLDOUT = args.holdout !== undefined ? parseInt(args.holdout, 10) : 3;

function findReplays() {
  const dirs = [ROOT, path.join(ROOT, 'replays')];
  const out = [];
  for (const d of dirs) for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.smbreplay')) continue;
    const p = path.join(d, f);
    try {
      const r = JSON.parse(fs.readFileSync(p, 'utf8'));
      const pl = r.meta && r.meta.players || [];
      const me = pl.findIndex(x => !x.ai), opp = pl.findIndex(x => x.ai && /SOVEREIGN/i.test(x.name || ''));
      if (me < 0 || opp < 0 || !r.frames || r.frames.length < 200) continue;
      // Replays before 2026-07-27 lack g / stn / rag / inv: every sample reads
      // as airborne and never stunned, which corrupts the situation keys and
      // books knockback as the human's own movement. Unusable, not just older.
      const f0 = r.frames.find(f => f && f[me]);
      if (!f0 || !('g' in f0[me]) || !('stn' in f0[me])) continue;
      out.push({ file: path.relative(ROOT, p), date: r.meta.date || 0, me, opp, r });
    } catch (e) { /* unreadable replay: skip */ }
  }
  return out.sort((a, b) => a.date - b.date);
}

// Input track -> per-sample { held, pressed, jumpEdge } over (i*3, i*3+3].
function inputReader(r, me) {
  const tr = r.inputs && r.inputs[me];
  if (!tr || !tr.length) return null;
  return (i) => {
    const a = i * G.STEP, b = a + G.STEP;
    let held = 0, pressed = 0, prevHeld = 0;
    for (let k = 0; k < tr.length; k++) {
      const [fc, m] = tr[k];
      if (fc <= a) { prevHeld = m & 31; held = m & 31; continue; }
      if (fc > b) break;
      held = m & 31; pressed |= m & 224;
    }
    return { held, pressed, jumpEdge: (held & 4) && !(prevHeld & 4) };
  };
}

const all = findReplays();
const train = all.slice(0, Math.max(0, all.length - HOLDOUT));
const held = all.slice(all.length - HOLDOUT);
if (!train.length) { console.error('no training replays found'); process.exit(1); }

const model = { built: new Date().toISOString().slice(0, 10), global: {}, modes: {}, modeFreq: {}, kits: {},
                trainedOn: train.map(t => t.file), heldOut: held.map(t => t.file), samples: 0, withInputs: 0 };
const modeCount = {};
for (const t of train) {
  const reader = inputReader(t.r, t.me);
  if (reader) model.withInputs++;
  const f0 = t.r.frames.find(f => f && f[t.me]);
  const kit = `${f0[t.me].wk}/${f0[t.me].cls || 'none'}`;
  model.kits[kit] = (model.kits[kit] || 0) + 1;
  G.extract(t.r.frames, t.me, t.opp, (keys, act, mode) => {
    model.samples++;
    G.addTo(model.global, keys, act);
    G.addTo(model.modes[mode] || (model.modes[mode] = {}), keys, act);
    modeCount[mode] = (modeCount[mode] || 0) + 1;
  }, reader);
}
for (const m of Object.keys(modeCount)) model.modeFreq[m] = +(modeCount[m] / model.samples).toFixed(4);

const out = path.join(ROOT, 'tools', 'ghost-model.json');
fs.writeFileSync(out, JSON.stringify(model));
console.log(`[ghost] ${train.length} replays trained (${model.withInputs} with input tracks), ${held.length} held out`);
console.log(`[ghost] ${model.samples} samples, ${Object.keys(model.global).length} situation cells, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
console.log('[ghost] modes: ' + Object.entries(model.modeFreq).sort((a, b) => b[1] - a[1]).map(([m, p]) => `${m} ${(100 * p).toFixed(0)}%`).join(', '));
console.log('[ghost] kits:  ' + Object.entries(model.kits).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} x${n}`).join(', '));
console.log('[ghost] held out: ' + model.heldOut.join(', '));
