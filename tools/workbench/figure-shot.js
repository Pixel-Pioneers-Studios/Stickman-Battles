'use strict';
// Figure studio contact sheets (DEV ONLY). Draws poses or a clip with the real scene
// renderer (window._sceneDrawFigure), big and at scene size, into one labelled PNG.
//
//   node tools/workbench/figure-shot.js pose stand,stance,kneel [--facing=-1]
//   node tools/workbench/figure-shot.js clip attack [--frames=12]
//   node tools/workbench/figure-shot.js clip kneel --set=pose.kneel.headTilt=0.3 [--save]
//   node tools/workbench/figure-shot.js clip myClip --clip-json='{"loop":false,"hold":true,"dur":60,"keys":[...]}'
//
//   --set        live edits: pose.<name>.<channel>=<value>, comma separated
//   --pose-json  name=JSON for a new or replaced pose (repeatable via ;)
//   --clip-json  JSON for the clip being drawn (new or replaced)
//   --save       write the edits into js/smb-figure-rig.js
//   --color      figure colour (default Kael #4488ff)
// Prints the sheet path.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { start } = require('./server');

const ROOT = path.resolve(__dirname, '../..');
const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => {
  const m = a.match(/^--([^=]+)(?:=([\s\S]*))?$/); return [m[1], m[2] === undefined ? true : m[2]];
}));
const [MODE, NAMES] = argv.filter(a => !a.startsWith('--'));
if (!['pose', 'clip'].includes(MODE) || !NAMES) {
  console.error('usage: figure-shot.js pose <a,b,..> | clip <name> [--frames=12] [--set=...] [--save]'); process.exit(2);
}
const OUT = args.out || path.join(os.tmpdir(), 'smb-figure-shot');
const PORT = parseInt(args.port, 10) || 8145;
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await start({ port: PORT, quiet: true });
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await puppeteer.launch({
    headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'],
    ...(fs.existsSync(sysChrome) ? { executablePath: sysChrome } : {}),
  });
  const done = async code => { try { await browser.close(); } catch (e) {} server.close(); process.exit(code); };
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  await page.goto(`http://localhost:${PORT}/index.html?wbheadless`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__wbFigReady === true', { timeout: 30000 });

  const r = await page.evaluate(async (MODE, NAMES, args) => {
    try {
      const F = window.__wbFig;
      if (typeof args['pose-json'] === 'string') for (const part of args['pose-json'].split(';')) {
        const i = part.indexOf('='); F.setPose(part.slice(0, i), JSON.parse(part.slice(i + 1)));
      }
      if (typeof args['clip-json'] === 'string') F.setClip(NAMES, JSON.parse(args['clip-json']));
      if (typeof args.set === 'string') for (const s of args.set.split(',')) {
        const m = s.match(/^pose\.(\w+)\.(\w+)=(.+)$/);
        if (!m) throw new Error('bad --set ' + s);
        F.setChannel(m[1], m[2], m[3] === 'null' ? null : +m[3]);
      }
      const saved = args.save ? await F.save() : null;
      const png = F.sheet(MODE === 'pose'
        ? { poses: NAMES.split(','), facing: +args.facing || 1, color: args.color }
        : { clip: NAMES, frames: +args.frames || 12, facing: +args.facing || 1, color: args.color });
      return { ok: true, png, saved };
    } catch (e) { return { ok: false, why: e.message }; }
  }, MODE, NAMES, args);
  if (!r.ok) { console.error(r.why); return done(1); }
  const file = path.join(OUT, `${MODE}-${NAMES.replace(/[^\w,]/g, '').replace(/,/g, '_').slice(0, 60)}.png`);
  fs.writeFileSync(file, Buffer.from(r.png, 'base64'));
  console.log(file);
  if (r.saved) console.log('saved:', JSON.stringify(r.saved.changed));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  return done(0);
})().catch(e => { console.error(e); process.exit(1); });
