'use strict';
// Frame each base arena at the camera's widest pull-back (fighters far apart
// vertically) to check that the backdrop covers everything the camera shows.
//   node tools/arena-shots/zoomout.js <outdir> [arena,...]
const fs = require('fs'), path = require('path');
const { openSession } = require('../showcase/session');
const ALL = ['grass','city','space','lava','forest','ice','ruins','cave','volcano','underwater','colosseum','clouds','mushroom','haunted','cyberpunk','neonGrid','mirror','desert','sewer'];
(async () => {
  const out = process.argv[2]; const list = process.argv[3] ? process.argv[3].split(',') : ALL;
  fs.mkdirSync(out, { recursive: true });
  const s = await openSession({ width: 1280, height: 720, port: 8192 });
  for (const a of list) {
    await s.startMatch({ mode: '2p', arena: a, p1: 'sword', p2: 'axe', p1Bot: false, p2Bot: false, settleMs: 2500 });
    await s.manual();
    for (let i = 0; i < 40; i++) {
      await s.eval(() => { const p = players[0], q = players[1]; if (!p || !q) return;
        p.x = -140; p.y = -300; p.vy = 0; p.vx = 0; q.x = GAME_W + 100; q.y = GAME_H - 140; q.vx = 0; p.invincible = q.invincible = 999; });
      await s.step(1);
    }
    const url = await s.eval(() => document.getElementById('gameCanvas').toDataURL('image/jpeg', 0.85));
    fs.writeFileSync(path.join(out, a + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
  }
  if (s.errors.length) console.log('ERRORS', s.errors.slice(0, 5));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
