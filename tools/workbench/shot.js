'use strict';
// Weapon workbench contact sheet (DEV ONLY). Boots the real game headless with the
// workbench panel's API, holds the fighter at points through the swing, and tiles the
// crops into one labelled PNG, with hit points and the swept area drawn on.
//
//   node tools/workbench/shot.js <weapon> [--frames=6] [--out=<dir>] [--clean]
//                                [--set=swing.a0=-0.8,stats.damage=15] [--save] [--headful]
//
//   --set    live edits before capture (section.field=value, comma separated)
//   --save   also write those edits to source (same path as the panel's Save)
//   --clean  no overlays, the weapon as players see it
// Prints the sheet path and a JSON summary (reach, swing frames, source values).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { start } = require('./server');
const SP = require('./source-patch');

const ROOT = path.resolve(__dirname, '../..');
const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return [m[1], m[2] === undefined ? true : m[2]];
}));
const KEY = argv.find(a => !a.startsWith('--'));
if (!KEY) { console.error('usage: node tools/workbench/shot.js <weapon> [--frames=6] [--set=...] [--save] [--clean]'); process.exit(2); }
const FRAMES = Math.max(2, parseInt(args.frames, 10) || 6);
const OUT = args.out || path.join(os.tmpdir(), 'smb-workbench-shot');
const PORT = parseInt(args.port, 10) || 8141;
fs.mkdirSync(OUT, { recursive: true });

const SETS = (typeof args.set === 'string' ? args.set.split(',') : []).map(s => {
  const m = s.match(/^(stats|swing|sprite)\.(\w+)=(.+)$/);
  if (!m) { console.error('bad --set entry: ' + s); process.exit(2); }
  const v = isNaN(+m[3]) ? m[3] : +m[3];
  return [m[1], m[2], v];
});

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await start({ port: PORT, quiet: true });
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await puppeteer.launch({
    headless: args.headful ? false : 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
    ...(fs.existsSync(sysChrome) ? { executablePath: sysChrome } : {}),
  });
  const done = async code => { try { await browser.close(); } catch (e) {} server.close(); process.exit(code); };
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));

  await page.goto(`http://localhost:${PORT}/index.html?wbheadless`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__wbReady === true', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));   // let the first-visit story auto-open fire so open() can clear it

  const opened = await page.evaluate(async key => { try { return { ok: true, info: await __wb.open(key) }; } catch (e) { return { ok: false, why: e.message }; } }, KEY);
  if (!opened.ok) { console.error('open failed:', opened.why); return done(1); }

  if (SETS.length) {
    await page.evaluate(sets => { for (const [s, f, v] of sets) __wb.set(s, f, v); }, SETS);
    if (args.save) console.log('saved:', JSON.stringify(await page.evaluate(() => __wb.save())));
  }
  if (args.clean) await page.evaluate(() => __wb.overlays({ hitbox: false, sweep: false, grip: false }));

  // Crop window in world units around the fighter's centre.
  const VIEW_W = 200, VIEW_H = 170;
  const shoot = async (label, p, facing) => {
    await page.evaluate((p, facing) => { __wb.state.p1.facing = facing; __wb.pose(p); }, p, facing);
    await new Promise(r => setTimeout(r, 140));
    const fs_ = await page.evaluate(() => __wb.fighterScreen());
    if (!fs_) throw new Error('fighter was never drawn');
    const w = VIEW_W * fs_.unit, h = VIEW_H * fs_.unit;
    const clip = { x: Math.max(0, fs_.x - w / 2), y: Math.max(0, fs_.y - h * 0.5), width: w, height: h };
    const b64 = await page.screenshot({ clip, encoding: 'base64' });
    return { label, b64 };
  };

  const shots = [];
  const melee = opened.info.type === 'melee';
  shots.push(await shoot('idle', null, 1));
  for (let i = 0; i < FRAMES; i++) {
    const p = i / (FRAMES - 1);
    shots.push(await shoot(`swing ${p.toFixed(2)}`, p, 1));
  }
  shots.push(await shoot('facing left 0.60', 0.6, -1));

  const art = await page.evaluate(key => {
    const s = WEAPON_SPRITES[key];
    if (!s || !s.img) return null;
    const c = document.createElement('canvas');
    c.width = s.img.naturalWidth * 3; c.height = s.img.naturalHeight * 3;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(s.img, 0, 0, c.width, c.height);
    // Grip and shaft axis.
    x.strokeStyle = 'rgba(80,220,255,.9)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(s.anchor * c.width, 0); x.lineTo(s.anchor * c.width, c.height); x.stroke();
    x.beginPath(); x.moveTo(0, s.shaftY * c.height); x.lineTo(c.width, s.shaftY * c.height); x.stroke();
    return c.toDataURL('image/png').split(',')[1];
  }, KEY);

  const info = await page.evaluate(() => { __wb.pose(0.6); return __wb.info(); });

  const sheet = await page.evaluate(async (shots, art, title) => {
    const CW = 380, CH = 300, COLS = 4, HEAD = 26;
    const rows = Math.ceil(shots.length / COLS);
    const artH = art ? 140 : 0;
    const out = document.createElement('canvas');
    out.width = CW * COLS; out.height = 40 + artH + rows * (CH + HEAD);
    const o = out.getContext('2d');
    o.fillStyle = '#15171e'; o.fillRect(0, 0, out.width, out.height);
    o.fillStyle = '#fff'; o.font = 'bold 20px monospace'; o.fillText(title, 12, 27);
    const load = b => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b; });
    if (art) {
      const im = await load(art);
      const k = Math.min(1, (out.width - 24) / im.width, (artH - 12) / im.height);
      o.fillStyle = '#5b616e'; o.fillRect(12, 40, im.width * k + 12, im.height * k + 8);
      o.drawImage(im, 18, 44, im.width * k, im.height * k);
    }
    for (let i = 0; i < shots.length; i++) {
      const im = await load(shots[i].b64);
      const gx = (i % COLS) * CW, gy = 40 + artH + Math.floor(i / COLS) * (CH + HEAD);
      o.fillStyle = '#cfd5e2'; o.font = '16px monospace'; o.fillText(shots[i].label, gx + 8, gy + 18);
      const k = Math.min(CW / im.width, CH / im.height);
      o.drawImage(im, gx + (CW - im.width * k) / 2, gy + HEAD, im.width * k, im.height * k);
    }
    return out.toDataURL('image/png').split(',')[1];
  }, shots, art, `${KEY}${args.clean || !melee ? '' : '   red: hit points now   yellow: swept area   dashed: reach'}`);

  const file = path.join(OUT, `${KEY}-sheet.png`);
  fs.writeFileSync(file, Buffer.from(sheet, 'base64'));
  console.log(file);
  console.log(JSON.stringify({ info: { ...info, dirty: undefined }, melee, source: SP.readSource(KEY), errors: errors.slice(0, 5) }, null, 1));
  return done(0);
})().catch(e => { console.error(e); process.exit(1); });
