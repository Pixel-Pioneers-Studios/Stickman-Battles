'use strict';
// Renders the edits in cuts.js to out/.
//   node edit.js [main|cut30|shortFinishers|shortBoss|shortWeapons|all]
const cuts = require('./cuts');
const { render } = require('./lib/engine');
(async () => {
  const want = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : Object.keys(cuts);
  for (const k of want) {
    const spec = cuts[k]();
    const sum = spec.segs.reduce((a, s) => a + s.len, 0);
    console.log(k, '→', spec.name, sum, 'frames', (sum / 60).toFixed(2) + 's');
    const r = await render(spec);
    console.log('  wrote', r.out);
  }
})().catch(e => { console.error(e); process.exit(1); });
