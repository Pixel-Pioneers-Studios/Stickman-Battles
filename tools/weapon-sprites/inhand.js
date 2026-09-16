'use strict';
/*
 * tools/weapon-sprites/inhand.js — sprite-in-hand capture (DEV ONLY)
 *
 * Boots the real game into a 2P match, gives both fighters a chosen weapon,
 * freezes them mid-swing, and crops a zoomed screenshot around each fighter.
 * The point is to judge weapon art at the size and in the context it actually
 * ships in — a gray contact sheet flatters sprites that read badly in a hand.
 *
 * Usage: node tools/weapon-sprites/inhand.js [--weapon=sword] [--arena=grass]
 *                                            [--frame=6] [--out=<dir>] [--headful]
 *   --frame  attack-animation frame to freeze on (0 = idle stance)
 *
 * Touches no game code — only globals the menu already sets.
 */
const fs = require('fs'), path = require('path'), http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const WEAPON = args.weapon || 'sword';
const ARENA  = args.arena  || 'grass';
const FRAME  = parseInt(args.frame, 10); const POSE = Number.isNaN(FRAME) ? 6 : FRAME;
const PORT   = parseInt(args.port, 10) || 8137;
const OUT    = args.out || '/tmp/smb-inhand';
const ROOT   = path.resolve(__dirname, '../..');
fs.mkdirSync(OUT, { recursive: true });

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
const log = (...a) => console.log('[inhand]', ...a);

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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  // Fresh profile auto-opens Story Mode over everything — neutralize it.
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
      // The start path reads the weapon straight off these selects.
      for (const id of ['p1Weapon', 'p2Weapon']) {
        const el = document.getElementById(id);
        if (el) el.value = weapon;
      }
      if (typeof startGame === 'function') { startGame(); return { ok: true }; }
      return { ok: false, why: 'startGame() missing' };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  }, WEAPON, ARENA);
  if (!boot.ok) { log('BOOT FAILED:', boot.why); await browser.close(); server.close(); process.exit(1); }
  await new Promise(r => setTimeout(r, 2000));

  // Freeze both fighters facing opposite ways, mid-swing, and confirm the
  // sprite actually decoded — otherwise drawWeapon() silently uses vector art
  // and the capture would "pass" while showing the wrong thing.
  const state = await page.evaluate((weapon, pose) => {
    const ps = (typeof players !== 'undefined' && Array.isArray(players)) ? players : [];
    const live = ps.filter(p => p && !p.isMinion);
    live.forEach((p, i) => {
      p.isAI = false; p.vx = 0; p.vy = 0;
      // `weapon` is the WEAPONS entry object; `weaponKey` is what the draw path
      // keys off. Setting the former to a string silently drops the art.
      p.weaponKey = weapon;
      if (typeof WEAPONS !== 'undefined' && WEAPONS[weapon]) p.weapon = WEAPONS[weapon];
      p.facing = i === 0 ? 1 : -1;
      // A human-held fighter is a fragment bearer, and fragmentWeaponVisual()
      // returns grow:0 with no combat intent — i.e. an idle player holds NOTHING
      // and the weapon is never drawn. Opt out so the art is always on screen.
      p._forceFragmentBearer = false;
      p._fragArm = 1;
      // state 'attacking' is derived from attackTimer, not a settable flag.
      if (pose > 0) p.attackTimer = pose;
    });
    const slot = (typeof WEAPON_SPRITES !== 'undefined') ? WEAPON_SPRITES[weapon] : null;
    const p1 = live[0];
    // Spawn x is randomised, so the crop has to follow the fighter. The view is
    // GAME_W/GAME_H of world offset by camXCur/camYCur (the camera's top-left).
    const cx = (typeof camXCur !== 'undefined') ? camXCur : 0;
    const cy = (typeof camYCur !== 'undefined') ? camYCur : 0;
    return {
      count: live.length,
      spriteReady: !!(slot && slot.ready),
      pos: live.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), k: p.weaponKey,
                            wObj: !!(p.weapon && p.weapon.name) })),
      // Fighter position as a fraction of the visible canvas.
      fx: p1 ? (p1.x - (cx - GAME_W / 2)) / GAME_W : 0.5,
      fy: p1 ? (p1.y - (cy - GAME_H / 2)) / GAME_H : 0.5,
    };
  }, WEAPON, POSE);
  log('state:', JSON.stringify(state));
  if (!state.spriteReady) log(`WARNING: WEAPON_SPRITES['${WEAPON}'] not ready — capture may show the vector fallback.`);

  // Ask the renderer where the fighter actually lands on the canvas. The world
  // is letterboxed into the canvas by a setTransform in the game loop, so any
  // world->screen formula reconstructed out here lands in the wrong place;
  // reading the live transform at draw time is exact.
  await page.evaluate(() => {
    const proto = Object.getPrototypeOf(players.filter(p => p && !p.isMinion)[0]);
    const orig = proto.draw;
    proto.draw = function (...a) {
      const r = orig.apply(this, a);
      if (this === players.filter(p => p && !p.isMinion)[0]) {
        const m = ctx.getTransform();
        window.__p1screen = { x: m.a * this.x + m.c * this.y + m.e,
                              y: m.b * this.x + m.d * this.y + m.f };
      }
      return r;
    };
  });

  // The loop decays attackTimer, so hold the pose across the settle frames.
  await page.evaluate((weapon, pose) => {
    const hold = () => {
      players.filter(p => p && !p.isMinion).forEach((p, i) => {
        p._forceFragmentBearer = false; p._fragArm = 1;
        p.weaponKey = weapon; p.vx = 0; p.vy = 0;
        p.facing = i === 0 ? 1 : -1;
        if (pose > 0) p.attackTimer = pose;
      });
    };
    window.__holdPose = setInterval(hold, 16); hold();
  }, WEAPON, POSE);
  await new Promise(r => setTimeout(r, 400));

  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  const el  = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { w: c.width, h: c.height, p1: window.__p1screen || null };
  });
  await page.screenshot({ path: path.join(OUT, `${WEAPON}-full.png`), clip: box });
  // Tight crop on the left half, where p1 stands.
  // Centre a fixed-size window on the fighter, clamped inside the canvas.
  // __p1screen is in canvas backing-store pixels; convert to CSS/clip pixels.
  const cw = box.width * 0.20, ch = box.height * 0.34;
  const clampf = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const kx = box.width / el.w, ky = box.height / el.h;
  const px = el.p1 ? box.x + el.p1.x * kx : box.x + box.width * 0.5;
  const py = el.p1 ? box.y + el.p1.y * ky : box.y + box.height * 0.5;
  if (!el.p1) log('WARNING: never captured a p1 draw transform — crop is centred.');
  const cropX = clampf(px - cw / 2,        box.x, box.x + box.width  - cw);
  const cropY = clampf(py - ch * 0.55,     box.y, box.y + box.height - ch);
  await page.screenshot({ path: path.join(OUT, `${WEAPON}-crop.png`),
    clip: { x: cropX, y: cropY, width: cw, height: ch } });

  log('errors:', errors.length ? errors.slice(0, 5) : 'none');
  log('wrote', OUT);
  await browser.close(); server.close();
})();
