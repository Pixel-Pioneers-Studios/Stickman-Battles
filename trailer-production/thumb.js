'use strict';
// YouTube thumbnail: one real gameplay frame, punched in, with the logo.
//   node thumb.js [shot] [frame] [zoom] [cx] [cy]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { openOverlay, WORK, BASE } = require('./lib/engine');
(async () => {
  const [shot = 'duel2', frame = '240', z = '1.9', cx = '0.03', cy = '0.96'] = process.argv.slice(2);
  const W = 1920, H = 1080, tmp = path.join(WORK, 'thumb-src.png');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', (+frame / 60).toFixed(4), '-i', path.join(WORK, 'land', shot + '.mov'), '-frames:v', '1',
    '-vf', `crop=iw/${z}:ih/${z}:(iw-iw/${z})*${cx}:(ih-ih/${z})*${cy},scale=${W}:${H}:flags=lanczos,eq=saturation=1.15:contrast=1.06`, tmp]);
  const ov = await openOverlay(W, H);
  const items = [
    { type: 'vignette', a: 0.55 },
    { type: 'logo', from: 0, to: 9999, x: 0.275, y: 0.34, size: 136, lines: ['STICKMAN', 'EVOLUTION'] },
    { type: 'tag', from: 0, to: 9999, text: 'FREE BROWSER FIGHTER', x: 0.062, y: 0.8, align: 'left', size: 56 },
  ];
  const url = await ov.page.evaluate((items, bg) => window.__drawOver(500, items, bg), items, 'data:image/png;base64,' + fs.readFileSync(tmp).toString('base64'));
  await ov.close();
  const full = path.join(BASE, 'out', 'thumbnail-1920x1080.png');
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, Buffer.from(url.split(',')[1], 'base64'));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', full, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '2', path.join(BASE, 'out', 'thumbnail-1280x720.jpg')]);
  console.log(full);
})().catch(e => { console.error(e); process.exit(1); });
