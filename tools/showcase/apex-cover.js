'use strict';
// Store cover: "The 95th looks up." Paints tools/showcase/apex-scene.js onto
// the game's own canvas with the game loop parked, then screenshots it.
// Title is added afterwards by compose-cover.js.
//
//   node tools/showcase/apex-cover.js <out.png> <W> <H> <port|land|sq>
const fs = require('fs');
const path = require('path');
const { launch } = require('./harness');

const OUT = process.argv[2] || '/tmp/smb-apex-cover.png';
const W = +(process.argv[3] || 1600);
const H = +(process.argv[4] || 2400);
const LAYOUT = process.argv[5] || 'port';

(async () => {
  const h = await launch({ width: W, height: H, port: 8152, offline: true });
  await h.manual();   // park the menu loop: nothing else draws from here on
  await h.page.addScriptTag({ path: path.join(__dirname, 'apex-scene.js') });
  // Read the pixels back in the same task as the paint: the intro animation
  // still draws on timers the frame-stepping harness doesn't capture, so a
  // page screenshot can race it.
  const dataUrl = await h.eval(layout => {
    ApexScene.render(layout);
    return canvas.toDataURL('image/png');
  }, LAYOUT);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(OUT);
  if (h.errors.length) console.log('errors', h.errors.slice(0, 8));
  await h.close();
})().catch(error => { console.error(error); process.exit(1); });
