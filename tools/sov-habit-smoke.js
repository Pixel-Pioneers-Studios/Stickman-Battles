'use strict';
/*
 * tools/sov-habit-smoke.js — one-minute real-game smoke check for the habit
 * engine (js/smb-sov-habits.js). DEV ONLY, not a lab tool.
 *
 * Loads index.html for real (not the headless sim), starts gameMode
 * 'sovereign' the same way the menu does (selectMode + startGame, which kicks
 * off the real requestAnimationFrame gameLoop and the real per-player
 * update()/updateAI() paths), lets it run ~60s, and checks: no page errors,
 * SovHabits observed frames, and the human record persisted to localStorage
 * under 'sov_habits_v1'.
 *
 * Usage: node tools/sov-habit-smoke.js
 */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const PORT = 9420;

async function main() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  const server = http.createServer((req, rs) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
    rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(rs);
  });
  await new Promise(res => server.listen(PORT, res));

  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof SovHabits !== 'undefined' && typeof selectMode === 'function'
    && typeof startGame === 'function', { timeout: 60000 });

  await page.evaluate(() => {
    try { localStorage.removeItem('sov_habits_v1'); } catch (e) {}
    selectMode('sovereign');
    startGame();
    // Hold a movement key so the human player actually moves/engages instead
    // of standing still at spawn.
    let dir = 1, t = 0;
    window.__habitSmokeTimer = setInterval(() => {
      t++;
      const key = dir > 0 ? 'ArrowRight' : 'ArrowLeft';
      if (window.keysDown) { window.keysDown.clear(); window.keysDown.add(key); if (t % 20 === 0) window.keysDown.add('ArrowUp'); }
      if (t % 40 === 0) dir *= -1;
    }, 50);
  });

  await new Promise(r => setTimeout(r, 60000));

  const result = await page.evaluate(() => {
    let ls = null;
    try { ls = localStorage.getItem('sov_habits_v1'); } catch (e) {}
    const keys = Object.keys(SovHabits._raw());
    return {
      gameRunning: !!window.gameRunning,
      frameCount: window.frameCount,
      habitLog: window.SOV_HABIT_LOG || null,
      habitKeys: keys,
      humanKeys: keys.filter(k => k.indexOf('human:') === 0),
      localStorageHasRecord: !!ls,
      localStorageSample: ls ? ls.slice(0, 300) : null,
    };
  });

  console.log('\n════ sov-habit-smoke ════');
  console.log('page errors:', errors.length ? errors.slice(0, 10) : 'none');
  console.log('gameRunning:', result.gameRunning, ' frameCount:', result.frameCount);
  console.log('SOV_HABIT_LOG:', result.habitLog);
  console.log('SovHabits keys:', result.habitKeys);
  console.log('human: keys:', result.humanKeys);
  console.log('localStorage has sov_habits_v1 record:', result.localStorageHasRecord);
  if (result.localStorageSample) console.log('sample:', result.localStorageSample);

  await browser.close();
  server.close();
  if (errors.length) process.exitCode = 1;
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
