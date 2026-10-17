'use strict';
// Capture one gameplay frame per base arena (the ones the arena picker offers).
//   node tools/arena-shots/shots.js <outdir> [arena,arena,...]
const fs = require('fs'), path = require('path');
const { openSession } = require('../showcase/session');
const ALL = ['grass','city','space','lava','forest','ice','ruins','cave','volcano','underwater','colosseum','clouds','mushroom','haunted','cyberpunk','neonGrid','mirror','desert','sewer'];
(async () => {
  const out = process.argv[2] || 'arena-shots';
  const list = process.argv[3] ? process.argv[3].split(',') : ALL;
  fs.mkdirSync(out, { recursive: true });
  const s = await openSession({ width: 1280, height: 720, port: 8191 });
  for (const a of list) {
    await s.startMatch({ mode: '2p', arena: a, p1: 'sword', p2: 'axe', p1Bot: true, p2Bot: true, settleMs: 2500 });
    await s.manual();
    await s.step(90);
    const url = await s.eval(() => document.getElementById('gameCanvas').toDataURL('image/png'));
    fs.writeFileSync(path.join(out, a + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('shot', a);
  }
  if (s.errors.length) console.log('ERRORS', s.errors.slice(0, 5));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
