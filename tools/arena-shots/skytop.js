'use strict';
// Measure the colour each arena's drawer paints at its top row (world y=3),
// for the skyTop values in ARENA_HD. Uses the dev-only ARENA_HD_SAMPLE hook.
//   node tools/arena-shots/skytop.js
const { openSession } = require('../showcase/session');
const ALL = process.argv[2] ? process.argv[2].split(',') : ['city','lava','forest','ice','ruins','cave','volcano','underwater','colosseum','clouds','mushroom','haunted','cyberpunk','neonGrid','mirror','desert'];
(async () => {
  const s = await openSession({ width: 1280, height: 720, port: 8196 });
  const out = {};
  for (const a of ALL) {
    await s.startMatch({ mode: '2p', arena: a, p1: 'sword', p2: 'axe', p1Bot: false, p2Bot: false, settleMs: 1500 });
    await s.manual();
    await s.eval(() => { for (const p of players) { p.y = 40; p.vy = 0; } }); out[a] = await s.eval(k => { window.ARENA_HD_SAMPLE = true; window.__step(3); window.ARENA_HD_SAMPLE = false; return _hdSkySample[k] || null; }, a);
  }
  console.log(JSON.stringify(out));
  process.exit(0);
})();
