'use strict';
// Summarise a story-run.js capture log: fights, HP changes, lives, cinematics, result.
//   node story-log.js <shot> [profile=vert]      e.g. node story-log.js story-6-v1
const L = require(`./work/${process.argv[3] || 'vert'}/${process.argv[2]}.json`).log;
let p = null, res = null;
for (let i = 0; i < L.length; i++) {
  const e = L[i]; if (!e) continue;
  const ev = [];
  if (!p) ev.push('start');
  else {
    if (e.h !== p.h) ev.push(`hp ${p.h}->${e.h}`);
    if (e.l !== p.l) ev.push(`LIVES ${p.l}->${e.l}`);
    if (e.foes !== p.foes) ev.push(`foes ${p.foes}->${e.foes}`);
    if (e.cin !== p.cin) ev.push(e.cin ? 'CIN on' : 'cin off');
    if (e.nav !== p.nav) ev.push(e.nav ? 'walk' : 'fight');
  }
  if (e.r && !res) { res = e.r; ev.push('RESULT ' + e.r); }
  if (ev.length) console.log(String(i).padStart(5), (i / 60).toFixed(1).padStart(6) + 's', `hp ${e.h}/${e.mh} lives ${e.l} foes ${e.foes} near ${e.near}`, '|', ev.join(', '));
  p = e;
}
console.log('frames', L.length, 'result', res || 'none (still running when capture ended)');
