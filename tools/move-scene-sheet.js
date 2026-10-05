'use strict';
/*
 * tools/move-scene-sheet.js — contact sheets + functional probe for the move
 * scenes in js/smb-move-scenes-defs.js (DEV ONLY, touches no game code).
 *
 * Boots a real local 1v1, takes over requestAnimationFrame so frames can be
 * stepped one at a time, puts the two fighters face to face, fires a weapon's
 * ability or super and renders the fighters every N frames into one sheet.
 * Each run also logs what the scene did: damage dealt, whether the victim was
 * held, where both ended up relative to the stage, and any page errors.
 *
 * Usage:
 *   node tools/move-scene-sheet.js --moves=axe:q,axe:e [--every=3] [--frames=72]
 *       [--gap=110] [--out=/tmp/ms-sheets] [--victim=bot|idle|shield] [--edge]
 *   node tools/move-scene-sheet.js --all            (every defined scene, log only unless --sheets)
 *
 * --edge starts the pair 120px from the right ledge to check ring-out safety.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT   = path.resolve(__dirname, '..');
const OUT    = args.out || '/tmp/ms-sheets';
const EVERY  = parseInt(args.every, 10) || 3;
const FRAMES = parseInt(args.frames, 10) || 72;
const GAP    = parseInt(args.gap, 10) || 110;
const PORT   = parseInt(args.port, 10) || 8131;
const VICTIM = args.victim || 'idle';
const EDGE   = !!args.edge;
const ARENA  = args.arena || 'grass';
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rsp);
    });
    s.listen(PORT, () => res(s));
  });
}

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await serve();
  const opts = { headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio', '--window-size=1280,800'] };
  const sys = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(sys)) opts.executablePath = sys;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 800 });
  const NOISE = /onrender\.com|crazygames|CrazySDK|supabase|live-config|\/api\/|net::ERR|Failed to load resource|404|CORS|ERR_CONNECTION|socket\.io|peerjs/i;
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push('console: ' + m.text()); });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
      }
      storyModeActive = false; activeCinematic = null;
    } catch (e) {}
    ['prologueOverlay', 'storyPrologueOverlay', 'storyPathPanel', 'storyModal', 'storyIntroOverlay', 'storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate((arena) => {
    if (typeof selectMode === 'function') selectMode('2p');
    gameMode = '2p';
    selectedArena = arena;
    startGame();
  }, ARENA);
  await new Promise(r => setTimeout(r, 2200));

  // Take over the frame clock.
  await page.evaluate(() => {
    window.__rafQ = [];
    window.requestAnimationFrame = (cb) => { window.__rafQ.push(cb); return 1; };
    // The loop caps its rate off the rAF timestamp, so each step must advance it a frame.
    window.__ts = performance.now() + 1000;
    window.__step = (n) => {
      for (let i = 0; i < n; i++) {
        window.__ts += 1000 / 60;
        const q = window.__rafQ; window.__rafQ = [];
        for (const cb of q) cb(window.__ts);
      }
    };
  });
  await new Promise(r => setTimeout(r, 300));

  const keys = args.all
    ? await page.evaluate(() => Object.keys(MS_DEFS))
    : String(args.moves || 'axe:q').split(',');

  const results = [];
  for (const key of keys) {
    const [wk, kind] = key.split(':');
    const res = await page.evaluate(async (wk, kind, cfg) => {
      const out = { key: wk + ':' + kind, frames: [], errors: [] };
      // Real time has to pass between frames: some volleys are setTimeout-driven.
      const tick = () => new Promise(r => setTimeout(r, 17));
      try {
        MoveScene.reset();
        if (typeof projectiles !== 'undefined') projectiles.length = 0;
        if (typeof activeFinisher !== 'undefined') activeFinisher = null;
        isCinematic = false;
        const p1 = players[0], p2 = players[1];
        for (const p of players) {
          if (typeof wxResetFighter === 'function') wxResetFighter(p);
          for (const k of ['_swordSlashes', '_swordSlashQueue', '_hammerShock', '_hammerSpin', '_thrownAxe', '_scytheToss', '_flailBall',
            '_flailOrbit', '_boomOrbit', '_boomerangs', '_shockBolt', '_thunderStrikes', '_peaCluster', '_gravityStone', '_paperSwarm',
            '_paperPlanes', '_whipCoil', '_whipRope', '_broomRide', '_comboSuper', '_spearCharge', '_shieldCharge']) p[k] = null;
        }
        p2.charClass = 'none'; p2.armorPieces = []; p2.damageReductionMult = undefined; p2._damageTakenMult = undefined;
        p2.maxHealth = 400; p2.kbResist = undefined;
        p1.charClass = 'none'; p1.dmgMult = undefined; p1._domainSuperCount = 0; p1.superActive = false;
        p1.spartanRageTimer = 0; p1._powerBuff = 0; p1.curses = [];
        // Every hit on the victim, with what the performer was doing at the time.
        out.hits = [];
        if (!window.__ddWrapped) {
          window.__ddOrig = dealDamage;
          window.__ddWrapped = true;
        }
        window.__ddLog = out.hits;
        dealDamage = function (a, t, d, kb) {
          const h0 = t ? t.health : 0;
          const r = window.__ddOrig.apply(this, arguments);
          if (t && t === players[1] && window.__ddLog) {
            const sc = a && a._msScene;
            window.__ddLog.push(`${a === players[0] ? 'P1' : a ? 'other' : 'env'} req${d} got${(h0 - t.health)} ${sc ? sc.track + '@' + Math.round(sc.lt) : 'no-scene'}`);
          }
          return r;
        };
        for (const p of players) {
          p.health = p.maxHealth; p.invincible = 0; p.stunTimer = 0; p.ragdollTimer = 0; p.hurtTimer = 0;
          p.vx = 0; p.vy = 0; p.shielding = false; p.attackTimer = 0; p.attackEndlag = 0;
          p.cooldown = 0; p.abilityCooldown = 0; p._msScene = null; p._msLock = null; p._movePose = null;
          p._comboHitCount = 0; p._launchCount = 0; p._superArmorUntil = 0; p.lives = 99;
        }
        p1.isAI = false; p1.controls = p1.controls || {};
        p2.isAI = cfg.victim === 'bot'; if (p2.isAI) p2.aiDiff = 'hard';
        p1.weaponKey = wk; p1.weapon = WEAPONS[wk];
        // Stand them face to face on the main floor.
        const floor = currentArena.platforms.filter(pl => !pl.isFloorDisabled).sort((a, b) => b.w - a.w)[0];
        const fy = floor.y;
        let x1 = floor.x + floor.w * 0.42;
        if (cfg.edge) x1 = floor.x + floor.w - 120 - cfg.gap;
        const fdir = cfg.left ? -1 : 1;
        if (cfg.left) x1 = x1 + cfg.gap;
        p1.x = x1; p1.y = fy - p1.h; p1.facing = fdir; p1.onGround = true;
        p2.x = x1 + fdir * cfg.gap; p2.y = fy - p2.h; p2.facing = -fdir; p2.onGround = true;
        if (cfg.victim === 'shield') { p2.shielding = true; p2.shieldHP = 50; p2.shieldStacks = 1; p2._parryFresh = false; }
        out.floor = { L: floor.x, R: floor.x + floor.w, y: fy };
        for (let i = 0; i < 3; i++) { __step(1); await tick(); }
        p1.x = x1; p2.x = x1 + fdir * cfg.gap; p1.facing = fdir;
        if (cfg.victim === 'shield') { p2.shielding = true; }
        const hp0 = p2.health;
        if (kind === 'e') { p1.superMeter = 100; p1.superReady = true; p1.useSuper(p2); }
        else p1.ability(p2);
        out.started = !!p1._msScene;
        // Record the draw transform so the sheet can crop world space.
        let T = null;
        const _d = p1.draw;
        p1.draw = function () { T = ctx.getTransform(); return _d.call(this); };
        const sheet = document.createElement('canvas');
        const CW = 300, CH = 220, COLS = 6;
        const shots = Math.ceil(cfg.frames / cfg.every);
        sheet.width = CW * COLS; sheet.height = CH * Math.ceil(shots / COLS);
        const sx = sheet.getContext('2d');
        sx.fillStyle = '#111'; sx.fillRect(0, 0, sheet.width, sheet.height);
        let held = 0, maxDx = 0, minUY = 1e9, s = 0;
        for (let f = 0; f < cfg.frames; f++) {
          // A human holds the guard key; here it is re-raised every frame until caught.
          if (cfg.victim === 'shield') {
            if (!p2._msLock && p2.controls && p2.controls.shield) keysDown.add(p2.controls.shield);
            else if (p2.controls) keysDown.delete(p2.controls.shield);
          }
          __step(1);
          await tick();
          if (p2._msLock) held++;
          // --break=N: the victim spends a full meter N frames into being held.
          if (cfg.brk && p2._msLock && held === cfg.brk) {
            p2.superMeter = 100; p2.superReady = true;
            const ok = p2.useSuper(p1);
            out.broke = { frame: f, sceneAfter: !!p1._msScene, lockAfter: !!p2._msLock, p1Stun: p1.stunTimer, p2Inv: p2.invincible, p1vx: +p1.vx.toFixed(1) };
          }
          if (f % cfg.every === 0 && T) {
            // Fixed world window around the performer, whatever the camera zoom is.
            const WW = cfg.ww || 380, WH = WW * CH / CW;
            const mid = { x: p1.cx() + (cfg.left ? -90 : 90), y: fy - 95 };
            const px = T.a * mid.x + T.c * mid.y + T.e, py = T.b * mid.x + T.d * mid.y + T.f;
            const sw = WW * T.a, shh = WH * T.d;
            const col = s % COLS, row = Math.floor(s / COLS);
            try { sx.drawImage(canvas, px - sw / 2, py - shh / 2, sw, shh, col * CW, row * CH, CW, CH); } catch (e) {}
            sx.fillStyle = '#fff'; sx.font = '12px monospace';
            sx.fillText(`${cfg.key} f${f} ${p1._msScene ? p1._msScene.track + ':' + Math.round(p1._msScene.lt) : '-'}`, col * CW + 4, row * CH + 14);
            s++;
          }
          out.frames.push({ f, p1x: Math.round(p1.x), p1y: Math.round(p1.y), p2x: Math.round(p2.x), p2y: Math.round(p2.y),
                            hp2: p2.health, scene: p1._msScene ? p1._msScene.track + ':' + Math.round(p1._msScene.lt) : null, lock: !!p2._msLock });
        }
        p1.draw = _d;
        if (p2.controls) keysDown.delete(p2.controls.shield);
        out.dmg = hp0 - p2.health;
        out.heldFrames = held;
        out.endScene = !!p1._msScene;
        out.p1End = { x: Math.round(p1.cx()), y: Math.round(p1.y + p1.h), onStage: p1.cx() > out.floor.L && p1.cx() < out.floor.R };
        out.p2End = { x: Math.round(p2.cx()), y: Math.round(p2.y + p2.h), vx: +p2.vx.toFixed(1), vy: +p2.vy.toFixed(1), hp: p2.health };
        out.sheet = sheet.toDataURL('image/png');
      } catch (e) { out.errors.push(String(e && e.stack || e)); }
      return out;
    }, wk, kind, { frames: FRAMES, every: EVERY, gap: GAP, victim: VICTIM, edge: EDGE, key, ww: parseInt(args.ww, 10) || 380, brk: parseInt(args.break, 10) || 0, left: !!args.left });
    if (res.sheet && (args.sheets || !args.all)) {
      const fn = path.join(OUT, `${wk}-${kind}${EDGE ? '-edge' : ''}${VICTIM !== 'idle' ? '-' + VICTIM : ''}${args.break ? '-break' : ''}${args.left ? '-left' : ''}.png`);
      fs.writeFileSync(fn, Buffer.from(res.sheet.split(',')[1], 'base64'));
      res.sheetFile = fn;
    }
    delete res.sheet;
    const trace = res.frames; delete res.frames;
    res.trace = trace.filter((_, i) => i % 6 === 0).map(t => `${t.f}:${t.scene || '-'} p1(${t.p1x},${t.p1y}) p2(${t.p2x},${t.p2y}) hp${t.hp2}${t.lock ? ' L' : ''}`);
    results.push(res);
    if (args.hits) console.log('   hits: ' + (res.hits || []).join(' | '));
    if (res.broke) console.log('   break: ' + JSON.stringify(res.broke));
    console.log(JSON.stringify({ key: res.key, started: res.started, dmg: res.dmg, held: res.heldFrames, stillRunning: res.endScene,
      p1End: res.p1End, p2End: res.p2End, errors: res.errors, sheet: res.sheetFile }));
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
