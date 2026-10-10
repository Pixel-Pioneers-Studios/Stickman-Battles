'use strict';
/* global BalanceSim, WEAPON_KEYS */
/*
 * tools/bot-move-ranges.js — WHERE EVERY ABILITY AND SUPER CONNECTS. DEV ONLY.
 *
 * Drills each weapon's Q and E against a passive target at a ladder of
 * distances (BalanceSim.drill in tools/class-balance.js) and prints the
 * BOT_MOVES table that js/smb-bot-tactics.js reads: the distance band the move
 * hits in, how many frames it takes to land at each end of that band, how far
 * it carries the user, and how long the user is committed.
 *
 * Re-run after changing any ability, super or move scene, and paste the output
 * over BOT_MOVES.
 *
 * Usage:
 *   node tools/bot-move-ranges.js            (prints the table)
 *   node tools/bot-move-ranges.js --raw      (prints the damage-by-distance grid)
 */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const RAW = process.argv.includes('--raw');
const PORT = 8760;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

(async () => {
  const server = http.createServer((req, rs) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
    rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(rs);
  }).listen(PORT);
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 1800000,
    args: ['--no-sandbox', '--disable-gpu', '--mute-audio', '--blink-settings=imagesEnabled=false'] });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', r => { const u = r.url(); (u.startsWith(`http://localhost:${PORT}/`) || u.startsWith('data:')) ? r.continue() : r.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 600000 });
    await page.waitForFunction(() => typeof SovereignMK2 !== 'undefined' && typeof WEAPONS !== 'undefined', { timeout: 600000 });
    await page.evaluate(() => { try { if (typeof backToHome === 'function') backToHome(); } catch (e) {} });
    const SIM = fs.readFileSync(path.join(ROOT, 'tools', 'class-balance.js'), 'utf8').match(/const SIM_SRC = `([\s\S]*?)\n`;/)[1];
    await page.addScriptTag({ content: SIM });

    const D = [30, 60, 90, 120, 150, 180, 220, 260, 300, 360, 420, 500];
    const grid = await page.evaluate(D => {
      const out = {};
      for (const k of WEAPON_KEYS) {
        out[k] = {};
        for (const mv of ['q', 'e']) out[k][mv] = D.map(d => {
          // Best of two: several moves carry a random spread.
          let best = null;
          for (let i = 0; i < 2; i++) { const r = BalanceSim.drill(k, mv, d, 260); if (!best || r.dmg > best.dmg) best = r; }
          return best;
        });
      }
      return out;
    }, D);

    if (RAW) {
      console.log('dist'.padEnd(18) + D.map(d => String(d).padStart(4)).join(''));
      for (const k of Object.keys(grid)) for (const mv of ['q', 'e'])
        console.log(`${k}:${mv}`.padEnd(18) + grid[k][mv].map(r => String(r.dmg).padStart(4)).join('') +
          '   first ' + grid[k][mv].map(r => r.first < 0 ? '-' : r.first).join(','));
      return;
    }
    // The band is the first unbroken run of distances that hit, starting from the nearest.
    const row = cells => {
      const i0 = cells.findIndex(c => c.dmg > 0);
      if (i0 < 0) return null;
      let i1 = i0; while (i1 + 1 < cells.length && cells[i1 + 1].dmg > 0) i1++;
      const dx = cells[Math.min(3, cells.length - 1)].dx;
      return [i0 === 0 ? 0 : D[i0], D[i1], cells[i0].first, cells[i1].first, dx,
              Math.max(...cells.map(c => c.free)), Math.max(...cells.slice(i0, i1 + 1).map(c => c.dmg))];
    };
    console.log('// [lo, hi, framesToHitAtLo, framesToHitAtHi, userTravel, committedFrames, damage]');
    console.log('const BOT_MOVES = {');
    for (const k of Object.keys(grid)) {
      const q = row(grid[k].q), e = row(grid[k].e);
      console.log(`  ${(k + ':').padEnd(15)} { q: ${JSON.stringify(q)}, e: ${JSON.stringify(e)} },`);
    }
    console.log('};');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
