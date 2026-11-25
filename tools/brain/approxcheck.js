'use strict';
/*
 * tools/brain/approxcheck.js: score tools/brain/approxsim.js against recorded real matches. DEV ONLY.
 *
 * For every recorded decision i, start the model from the real state at i, feed both sides the keys they really
 * played, and compare with the real state k decisions later (k = 1, 4, 8; 8 = the lookahead horizon). Windows where
 * a move scene or domain ran are skipped (the model doesn't cover them). Split by whether anyone lost HP in the
 * window (contact) or not (movement only).
 *
 * Usage: node tools/brain/approxcheck.js data/brain-lookahead/traces-200.jsonl [--max=200]
 */
const fs = require('fs'), path = require('path');
const AS = require('./approxsim.js');
const args = Object.fromEntries(process.argv.slice(3).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
const file = process.argv[2];
const lines = fs.readFileSync(file, 'utf8').trim().split('\n').slice(0, parseInt(args.max, 10) || 1e9).map(l => JSON.parse(l));
const KS = [1, 4, 8], R = 3;
// Traces recorded before Nov 25 15:00 saved the post-match arena; the sim plays on ARENAS.sovereign (smb-data-arenas.js).
const SOVEREIGN = [{ x: -60, y: 460, w: 1020, h: 60, isFloor: true }, { x: 95, y: 335, w: 165, h: 16, oneWay: true },
  { x: 368, y: 320, w: 165, h: 16, oneWay: true }, { x: 640, y: 335, w: 165, h: 16, oneWay: true }];
for (const m of lines) if (!m.platforms || m.platforms[0].y === 480) m.platforms = SOVEREIGN;
let acc = {};
const add = (key, v) => { const a = acc[key] || (acc[key] = { n: 0, s: 0, big: 0 }); a.n++; a.s += v; if (v > 30) a.big++; };
function score() {
acc = {};
for (const m of lines) {
  const rec = m.rec;
  for (let i = 0; i < rec.length; i++) {
    for (const k of KS) {
      if (i + k >= rec.length) continue;
      let skip = false, contact = false;
      for (let j = i; j <= i + k; j++) {
        const r = rec[j];
        if (r.dom || r.b.ms || r.o.ms || r.f !== rec[i].f + (j - i) * R) { skip = true; break; }
        if (j > i && (r.b.health < rec[j - 1].b.health || r.o.health < rec[j - 1].o.health || r.b.lives !== rec[j - 1].b.lives || r.o.lives !== rec[j - 1].o.lives)) contact = true;
      }
      if (skip) continue;
      if (!AS.covers(rec[i].b.wk) || !AS.covers(rec[i].o.wk)) continue;   // kit outside the model
      const W = AS.world(rec[i].b, rec[i].o, m.platforms, rec[i].p);
      W.a.prevBtn = rec[i].ba[3]; W.b.prevBtn = rec[i].oa[3];
      // keys played during decision j are recorded as prev at j+1
      W.a.prevJump = rec[i].ba[1]; W.a.prevShield = rec[i].ba[2]; W.b.prevJump = rec[i].oa[1]; W.b.prevShield = rec[i].oa[2];
      for (let j = i + 1; j <= i + k; j++) AS.stepDecision(W, rec[j].ba, rec[j].oa, R);
      const t = rec[i + k], tag = (contact ? 'contact' : 'move') + ' k' + k;
      for (const [s, real, s0] of [[W.a, t.b, rec[i].b], [W.b, t.o, rec[i].o]]) {
        const rd = s0.health - real.health > 0.5 && real.lives === s0.lives, md = s0.health - s.hp > 0.5;
        add('hits k' + k + (rd ? (md ? ' both' : ' missed') : (md ? ' invented' : ' none')), 0);
        add(tag + ' x', Math.abs(s.x - real.x));
        add(tag + ' y', Math.abs(s.y - real.y));
        add(tag + ' hp', Math.abs(s.hp - real.health));
      }
    }
  }
}
}
if (args.fit) {
  // Grid over the reach box and startup offset; objective = HP error at k=4 over all windows.
  const ks = Object.keys(AS.TUNE);
  let best = null;
  for (const reach of [0.25, 0.4, 0.55, 0.7]) for (const back of [0, 15, 30]) for (const dy of [40, 60, 80]) for (const suOff of [0, 2, 4]) for (const blockAny of [false, true]) {
    Object.assign(AS.TUNE, { reach, back, dy, suOff, blockAny });
    score();
    const e0 = ['contact k4 hp', 'move k4 hp'].reduce((t, k) => t + (acc[k] ? acc[k].s : 0), 0);
    const hb = acc['hits k4 both'] ? acc['hits k4 both'].n : 0, hm = acc['hits k4 missed'] ? acc['hits k4 missed'].n : 0, hi = acc['hits k4 invented'] ? acc['hits k4 invented'].n : 0;
    // Objective: wrong hit calls (missed + invented) at k=4. HP error alone rewards predicting no hits at all.
    const e = hm + hi;
    if (!best || e < best.e) best = { e, e0, reach, back, dy, suOff, blockAny, hb, hm, hi };
  }
  console.log('best', JSON.stringify(best));
  Object.assign(AS.TUNE, best);
}
score();
const rows = Object.keys(acc).sort();
for (const k of rows) { const a = acc[k]; console.log(k.padEnd(18), 'mean', (a.s / a.n).toFixed(2).padStart(7), ' >30px', (100 * a.big / a.n).toFixed(1).padStart(5) + '%', ' n', a.n); }
