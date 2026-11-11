'use strict';
// Renders an authored animation page (anim/<name>.html) frame by frame into a shot the Shorts engine can cut:
// work/<profile>/<name>.mov at 60 fps plus <name>.json ({ frames, sfx, marks }).
//
//   node anim-render.js <name> [vert|draft] [--from=N --to=M --every=K --sheet]
//
// --sheet renders only every K-th frame into a contact sheet (fast iteration) instead of the full shot.
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));

const name = process.argv[2], prof = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'vert';
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? Number(a.split('=')[1]) : undefined; };
const SHEET = process.argv.includes('--sheet');

(async () => {
  const lo = { headless: 'new', pipe: true, protocolTimeout: 600000, args: ['--no-sandbox', '--allow-file-access-from-files'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) lo.executablePath = chrome;
  const browser = await puppeteer.launch(lo);
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setViewport({ width: 1080, height: 1920 });
  await page.goto('file://' + path.join(__dirname, 'anim', name + '.html'), { waitUntil: 'load' });
  const info = await page.evaluate(() => ({ frames: window.__FRAMES, sfx: window.__SFX, marks: window.__MARKS }));
  if (errs.length) throw new Error(errs.join(' | '));
  const from = arg('from') || 0, to = arg('to') || info.frames, every = arg('every') || (SHEET ? 24 : 1);
  const outDir = path.join(__dirname, 'work', prof); fs.mkdirSync(outDir, { recursive: true });
  const grab = f => page.evaluate(f => { window.__render(f); return document.getElementById('c').toDataURL('image/jpeg', 0.94); }, f);
  if (SHEET) {
    const tmp = path.join(outDir, name + '-sheet'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
    let n = 0;
    for (let f = from; f < to; f += every) fs.writeFileSync(path.join(tmp, String(n++).padStart(4, '0') + '.jpg'), Buffer.from((await grab(f)).split(',')[1], 'base64'));
    const cols = 8, out = path.join(outDir, name + '.sheet.jpg');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, '%04d.jpg'), '-vf', `scale=216:-1,tile=${cols}x${Math.ceil(n / cols)}`, '-frames:v', '1', out]);
    console.log(out, n, 'frames', errs.join(' | '));
    await browser.close(); return;
  }
  const mov = path.join(outDir, name + '.mov');
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', mov], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  for (let f = 0; f < info.frames; f++) {
    const buf = Buffer.from((await grab(f)).split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) process.stdout.write('.');
  }
  ff.stdin.end(); await done;
  fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify({ frames: info.frames, fps: 60, sfx: info.sfx, marks: info.marks }));
  console.log('\n' + mov, info.frames, 'frames', errs.join(' | '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
