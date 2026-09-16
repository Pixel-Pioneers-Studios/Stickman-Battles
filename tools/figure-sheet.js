'use strict';
/*
 * tools/figure-sheet.js — player-figure inspection sheet (DEV ONLY)
 *
 * Boots the real game into a 2P match and takes a tight, high-DPI crop of P1 in
 * a series of forced poses. The point is to judge the FIGURE at a size where
 * shading, taper and silhouette are actually visible — the in-game figure is
 * ~86px tall, which flatters and hides everything in equal measure.
 *
 * Usage: node tools/figure-sheet.js [--weapon=sword] [--arena=grass]
 *                                   [--out=<dir>] [--headful]
 *
 * Touches no game code — only globals the game already exposes.
 */
const fs = require('fs'), path = require('path'), http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const WEAPON = args.weapon || 'sword';
const ARENA  = args.arena  || 'grass';
const PORT   = parseInt(args.port, 10) || 8139;
const OUT    = args.out || '/tmp/smb-figure';
const ROOT   = path.resolve(__dirname, '..');
fs.mkdirSync(OUT, { recursive: true });

// Each entry is applied to P1 every frame while the shot is taken.
const POSES = [
  { name: 'idle-right',  f:  1, set: { } },
  { name: 'idle-left',   f: -1, set: { } },
  { name: 'walk',        f:  1, set: { vx: 3.2 }, walk: true },
  { name: 'attack',      f:  1, set: { attackTimer: 6, attackDuration: 12 } },
  { name: 'jump',        f:  1, set: { vy: -9, onGround: false } },
  { name: 'hurt',        f: -1, set: { hurtTimer: 20 } },
  { name: 'unarmed',     f:  1, set: { }, hideWeapon: true },
  { name: 'zoom',        f:  1, set: { drawScale: 3 }, hideWeapon: true },
];

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ico':'image/x-icon' };
const startServer = () => new Promise(res => {
  const s = http.createServer((rq, rs) => {
    let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end(); return; }
    rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(rs);
  });
  s.listen(PORT, () => res(s));
});
const log = (...a) => console.log('[figsheet]', ...a);

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await puppeteer.launch({
    headless: args.headful ? false : 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900', '--mute-audio'],
    ...(fs.existsSync(sysChrome) ? { executablePath: sysChrome } : {}),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
  // Chrome's disk cache defeats ?v= bumps and will silently hand back the
  // previous build's figure — the sheet then "passes" showing stale art.
  await page.setCacheEnabled(false);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
        if (typeof _saveStory2 === 'function') _saveStory2();
      }
      if (typeof storyModeActive !== 'undefined') storyModeActive = false;
      if (typeof activeCinematic !== 'undefined') activeCinematic = null;
    } catch (e) {}
    ['prologueOverlay','storyPrologueOverlay','storyPathPanel','storyModal','storyIntroOverlay','storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 600));

  const boot = await page.evaluate((weapon, arena) => {
    try {
      if (typeof selectMode === 'function') selectMode('2p');
      gameMode = '2p';
      selectedArena = arena;
      for (const id of ['p1Weapon', 'p2Weapon']) {
        const el = document.getElementById(id); if (el) el.value = weapon;
      }
      if (typeof startGame === 'function') { startGame(); return { ok: true }; }
      return { ok: false, why: 'startGame() missing' };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  }, WEAPON, ARENA);
  if (!boot.ok) { log('BOOT FAILED:', boot.why); await browser.close(); server.close(); process.exit(1); }
  await new Promise(r => setTimeout(r, 2000));

  // Read the live draw-time transform: the world is letterboxed into the canvas
  // by a setTransform in the loop, so any world->screen formula reconstructed
  // out here lands in the wrong place.
  await page.evaluate(() => {
    const p1 = players.filter(p => p && !p.isMinion)[0];
    const proto = Object.getPrototypeOf(p1);
    const orig = proto.draw;
    proto.draw = function (...a) {
      const r = orig.apply(this, a);
      if (this === window.__p1) {
        const m = ctx.getTransform();
        const X = (wx, wy) => ({ x: m.a * wx + m.c * wy + m.e, y: m.b * wx + m.d * wy + m.f });
        window.__p1box = { tl: X(this.x, this.y), br: X(this.x + this.w, this.y + this.h), sc: m.a };
      }
      return r;
    };
    window.__p1 = p1;
  });

  const shots = [];
  for (const P of POSES) {
    // Hold the pose: the loop decays every one of these fields each frame.
    await page.evaluate((weapon, pose) => {
      window.__hold && clearInterval(window.__hold);
      const p1 = window.__p1;
      const others = players.filter(p => p && !p.isMinion && p !== p1);
      // Park P2 off-camera so it never intrudes into the crop.
      others.forEach(o => { o.isAI = false; o.x = p1.x + 700; o.vx = 0; });
      window.__hold = setInterval(() => {
        p1.isAI = false;
        p1._forceFragmentBearer = false; p1._fragArm = 1;
        p1.weaponKey = weapon;
        if (typeof WEAPONS !== 'undefined' && WEAPONS[weapon]) p1.weapon = WEAPONS[weapon];
        p1.facing = pose.f;
        p1.vx = 0; p1.vy = 0;
        p1._hideWeapon = !!pose.hideWeapon;
        for (const k in pose.set) p1[k] = pose.set[k];
        if (pose.walk) { p1.state = 'walking'; p1.vx = pose.set.vx; p1.x -= pose.set.vx; }
      }, 8);
    }, WEAPON, P);
    await new Promise(r => setTimeout(r, P.walk ? 900 : 500));

    const box = await page.evaluate(() => window.__p1box);
    // A zoomed pose (drawScale) grows about the FEET, so the body overflows a
    // crop sized from the un-scaled hitbox. Widen the margins to match.
    const ds = (P.set && P.set.drawScale) || 1;
    if (!box) { log('no box for', P.name); continue; }
    // Generous margin: weapons, smears and the ground shadow all live outside
    // the fighter's own hitbox.
    const mx = (78 + 70 * (ds - 1)) * box.sc,
          myT = (40 + 110 * (ds - 1)) * box.sc,
          myB = 26 * box.sc;
    const clip = {
      x: Math.max(0, Math.round(box.tl.x - mx)),
      y: Math.max(0, Math.round(box.tl.y - myT)),
      width:  Math.round((box.br.x - box.tl.x) + mx * 2),
      height: Math.round((box.br.y - box.tl.y) + myT + myB),
    };
    const file = path.join(OUT, `${P.name}.png`);
    await page.screenshot({ path: file, clip, captureBeyondViewport: false });
    shots.push(P.name);
  }

  await page.evaluate(() => { window.__hold && clearInterval(window.__hold); });
  log('errors:', errors.length ? errors.slice(0, 5) : 'none');
  log('wrote', shots.length, 'poses to', OUT);
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
