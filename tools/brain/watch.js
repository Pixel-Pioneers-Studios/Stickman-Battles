'use strict';
/*
 * tools/brain/watch.js — records THE BRAIN playing a real, rendered match. DEV ONLY.
 *
 * Boots the actual game through startGame() (real render loop, real input path),
 * hands P1 to the latest checkpoint via Brain.takeOver(), and screenshots the
 * fight. With ffmpeg on PATH the frames become an mp4.
 *
 * Usage:
 *   node tools/brain/watch.js [--mode=sovereign] [--vs=expert] [--seconds=40] [--out=tools/brain/watch]
 *
 *   --mode  game mode to boot (sovereign = 1v1 vs SovereignMK2 on The Circuit)
 *   --vs    replace the opponent's brain with a stock bot difficulty (easy..expert)
 */
const fs = require('fs'), path = require('path'), http = require('http'), { execSync } = require('child_process');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..');
const MODE = args.mode || 'sovereign';
const SECONDS = parseFloat(args.seconds) || 40;
const FPS = 10;
const OUT = path.resolve(ROOT, args.out || 'tools/brain/watch');
const PORT = parseInt(args.port, 10) || 8123;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const log = (...a) => console.log('[watch]', ...a);

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  }).listen(PORT);
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--mute-audio', '--window-size=1280,760'], defaultViewport: { width: 1280, height: 740 } });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
      }
      if (typeof storyModeActive !== 'undefined') storyModeActive = false;
      if (typeof activeCinematic !== 'undefined') activeCinematic = null;
    } catch (e) {}
    ['prologueOverlay', 'storyPrologueOverlay', 'storyPathPanel', 'storyModal', 'storyIntroOverlay', 'storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(mode => { selectMode(mode); gameMode = mode; startGame(); }, MODE);
  await new Promise(r => setTimeout(r, 2500));

  const setup = await page.evaluate(async vs => {
    const me = players.find(p => !p.isAI && !p.isRemote);
    const opp = players.find(p => p !== me && p.health > 0);
    if (!me || !opp) return { ok: false, why: 'no 1v1 pair', n: players.length };
    if (vs) {
      const bot = new Fighter(opp.x, opp.y, '#44dd44', 'sword', null, true, vs);
      bot.lives = opp.lives; bot.target = me; bot.name = 'BOT:' + vs;
      players[players.indexOf(opp)] = bot;
    }
    const it = await Brain.takeOver(me, players.find(p => p !== me));
    return { ok: it >= 0, iter: it, me: me.weaponKey, opp: players.find(p => p !== me).name };
  }, args.vs || null);
  log('setup', JSON.stringify(setup));
  if (!setup.ok) { await browser.close(); server.close(); process.exit(1); }

  const trace = [];
  const n = Math.round(SECONDS * FPS);
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    await page.screenshot({ path: path.join(OUT, `f${String(i).padStart(4, '0')}.png`) });
    trace.push(await page.evaluate(() => {
      const me = Brain.live && Brain.live.f; const o = players.find(p => p !== me);
      const s = f => f ? { hp: Math.round(f.health), lives: f.lives, x: Math.round(f.x), y: Math.round(f.y), sh: !!f.shielding, atk: (f.attackTimer || 0) > 0 } : null;
      return { running: gameRunning, fc: frameCount, brain: s(me), opp: s(o) };
    }));
    const dt = Date.now() - t0; if (dt < 1000 / FPS) await new Promise(r => setTimeout(r, 1000 / FPS - dt));
    if (!trace[trace.length - 1].running) break;
  }
  fs.writeFileSync(path.join(OUT, 'trace.json'), JSON.stringify(trace));
  const last = trace[trace.length - 1];
  log(`frames ${trace.length}; end: brain ${JSON.stringify(last.brain)} opp ${JSON.stringify(last.opp)}`);
  try {
    execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i "${OUT}/f%04d.png" -pix_fmt yuv420p -vf "scale=1280:-2" "${OUT}/match.mp4"`);
    log('video:', path.relative(ROOT, path.join(OUT, 'match.mp4')));
  } catch (e) { log('ffmpeg failed; frames are in', OUT); }
  if (errors.length) log('page errors:', errors.slice(0, 5));
  await browser.close(); server.close();
})().catch(e => { console.error('[watch] FATAL', e); process.exit(1); });
