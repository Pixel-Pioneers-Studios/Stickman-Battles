'use strict';
/*
 * tools/sov-movebook-smoke.js — real-game smoke check for the move book
 * (js/smb-sov-combo.js + js/smb-sov-movebook.js). DEV ONLY, not a lab tool.
 *
 * Loads index.html for real, turns comboRoutes/counterBook on, starts
 * gameMode 'sovereign' the way the menu does, drives the human with a crude
 * walk/jump/swing pattern for ~60s and reports: page errors, how many route
 * steps and counters ran, whether his own evidence reached the dossier, and a
 * screenshot taken mid-route.
 *
 * Usage: node tools/sov-movebook-smoke.js [--out=path/to/shot.png]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const PORT = 9421;
const OUT = (process.argv.find(a => a.startsWith('--out=')) || '').slice(6) || path.join(ROOT, 'data', 'movebook-smoke.png');

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
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 180000, args: ['--no-sandbox', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 760 });
  const errors = [];
  // Network failures (offline server, CORS) are not the move book's.
  const netNoise = t => /Failed to load resource|CORS policy|ERR_NAME_NOT_RESOLVED|ERR_FAILED/.test(t);
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !netNoise(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof SovMoves !== 'undefined' && typeof selectMode === 'function'
    && typeof startGame === 'function', { timeout: 60000 });

  await page.evaluate(() => {
    SMK2_TUNE.comboRoutes = true;
    SMK2_TUNE.counterBook = true;
    selectMode('sovereign');
    startGame();
    // Real key events: attacks fire on the keydown edge (smb-input.js), and
    // keysDown is a lexical const, so window.keysDown is not the game's set.
    let t = 0;
    const held = new Set();
    const press = (k, down) => {
      if (down === held.has(k)) return;
      if (down) held.add(k); else held.delete(k);
      document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, bubbles: true }));
    };
    window.__mbSmoke = setInterval(() => {
      t++;
      const sov = players.find(p => p.isSovereignMK2), me = players.find(p => !p.isAI);
      if (!sov || !me) return;
      const toward = sov.cx() > me.cx() ? 'd' : 'a', away = toward === 'd' ? 'a' : 'd';
      press(away, false); press(toward, t % 30 < 22);
      press('w', t % 17 === 0);
      press(' ', t % 4 === 0);
      press('q', t % 60 === 0);
      if (me._attackStartFrame !== window.__mbLastStart) { window.__mbLastStart = me._attackStartFrame; window.__mbSwings = (window.__mbSwings || 0) + 1; }
    }, 50);
  });

  // Wait for a route to be running, then photograph it.
  let shot = false;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const live = await page.evaluate(() => { const s = players.find(p => p.isSovereignMK2); return !!(s && s._route && s._route.phase === 'exec'); });
    if (live && !shot) { await page.screenshot({ path: OUT }); shot = true; }
  }

  const result = await page.evaluate(() => {
    const own = SovDossier.moveEvidence ? { route: SovDossier.moveEvidence('route'), counter: SovDossier.moveEvidence('counter') } : null;
    const s = players.find(p => p.isSovereignMK2);
    return {
      frameCount: window.frameCount,
      humanMoveStarts: window.__mbSwings || 0,
      kit: s ? `${s.weaponKey}/${s.charClass || 'none'}` : null,
      route: window.SOV_ROUTE_LOG || null,
      counter: window.SOV_COUNTER_LOG || null,
      commits: { route: (window.SOV_COMMIT_LOG || {}).route || 0, counter: (window.SOV_COMMIT_LOG || {}).counter || 0 },
      ownRouteKeys: own && own.route ? Object.keys(own.route).length : 0,
      ownCounterKeys: own && own.counter ? Object.keys(own.counter).length : 0,
    };
  });

  console.log('\n════ sov-movebook-smoke ════');
  console.log('page errors:', errors.length ? errors.slice(0, 10) : 'none');
  console.log(JSON.stringify(result, null, 1));
  console.log('screenshot mid-route:', shot ? OUT : 'no route was running at any 1s sample');

  await browser.close();
  server.close();
  if (errors.length) process.exitCode = 1;
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
