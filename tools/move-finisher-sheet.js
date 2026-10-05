'use strict';
/*
 * tools/move-finisher-sheet.js — functional probe + contact sheets for the
 * per-move finishers in js/smb-finisher-moves*.js (DEV ONLY, touches no game code).
 *
 * Same rig as tools/move-scene-sheet.js: boots a real local 1v1, steps frames
 * by hand, stands the fighters face to face. The victim is left on 1 HP so the
 * move's first hit kills, then the probe checks that the kill played that
 * move's own finisher (MOVE_FINISHERS[key]), that it ran to the end, that the
 * victim died and the performer was handed back on stage.
 *
 * Usage:
 *   node tools/move-finisher-sheet.js --moves=axe:q,axe:e [--every=6] [--gap=110] [--out=/tmp/mf-sheets]
 *   node tools/move-finisher-sheet.js --all [--sheets]
 *
 * Extra keys: 'sword:swing' kills with a plain swing (expects the weapon's
 * generic finisher); 'katana:q+swing' casts the move, then kills with swings
 * (generic too, unless the move is keepOnSwing). --all adds a few of these.
 * Moves whose kill comes from a lingering effect are staged in STAGE below.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT  = path.resolve(__dirname, '..');
const OUT   = args.out || '/tmp/mf-sheets';
const EVERY = parseInt(args.every, 10) || 6;
const GAP   = parseInt(args.gap, 10) || 110;
const PORT  = parseInt(args.port, 10) || 8132;
const ARENA = args.arena || 'grass';
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
  page.on('console', m => {
    const t = m.text();
    if ((m.type() === 'error' && !NOISE.test(t)) || /\[MoveFinisher\]|\[finisher\]/.test(t)) errors.push(m.type() + ': ' + t);
  });

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
    ? (await page.evaluate(() => Object.keys(MS_DEFS))).concat(['sword:swing', 'katana:q+swing', 'glassblade:e+swing', 'fragment:e+swing'])
    : String(args.moves || 'axe:q').split(',');

  const results = [];
  for (const key of keys) {
    const [wk, rest] = key.split(':');
    const kind = rest.split('+')[0], swingAfter = rest.includes('+swing');
    const res = await page.evaluate(async (wk, kind, cfg) => {
      const out = { key: cfg.key, errors: [] };
      const mk = wk + ':' + kind;
      // Swings after a move are not the move's kill, unless it's a buff whose kills are its swings.
      out.want = kind === 'swing' || (cfg.swingAfter && !(MS_DEFS[mk] && MS_DEFS[mk].keepOnSwing)) ? 'generic' : mk;
      // How each lingering-effect move actually lands its kill in play.
      const STAGE = {
        'flail:e': { gap: 60 },
        'bomb:e': { at(f, p1, p2) { const b = (p1._wxBombs || []).find(b => b.giga); if (f === 60 && b) p2.x = b.x - p2.w / 2; } },
        'glassblade:e': { at(f, p1, p2) { const m = p1._wxMirror; if (f === 30 && m) p2.x = m.x - p2.w / 2; } },
        'fragment:e': { at(f, p1, p2) { if (f >= 40 && f % 20 === 0) swing(p1, p2); } },
        'knives:q': { async pre(p1, p2) {
          // Knives out past an empty floor, then the victim walks between thrower and knives.
          const px = p2.x; p2.x = p1.x - 300;
          for (let i = 0; i < 3; i++) { p1.cooldown = 0; p1.attackTimer = 0; p1.attack(p2); for (let j = 0; j < 20; j++) { __step(1); await tick(); } }
          for (let j = 0; j < 40; j++) { __step(1); await tick(); }
          const ks = (p1._wxKnives || []).filter(k => !k.gone);
          const far = ks.sort((a, b) => Math.abs(b.x - p1.cx()) - Math.abs(a.x - p1.cx()))[0];
          p2.x = far ? (p1.cx() + far.x) / 2 - p2.w / 2 : px;
          p2.health = 1; p1.abilityCooldown = 0;
        } },
      };
      function swing(p1, p2) { p2.x = p1.x + p1.facing * 40; p1.cooldown = 0; p1.attackTimer = 0; p1.attackEndlag = 0; p1.attack(p2); }
      // After a move, swing at a victim BEHIND the performer so the move's own effect can't be what kills.
      const back = (p1, p2) => { p1.facing = -1; p2.x = p1.x - 40; p1.cooldown = 0; p1.attackTimer = 0; p1.attackEndlag = 0; p1.attack(p2); };
      const st = kind === 'swing' ? { gap: 40, at(f, p1, p2) { if (f >= 40 && f % 20 === 0) swing(p1, p2); } }
        : cfg.swingAfter ? { gap: 400, at(f, p1, p2) { if (f >= 40 && f % 20 === 0) back(p1, p2); } } : (STAGE[mk] || {});
      const gap = st.gap || cfg.gap;
      const tick = () => new Promise(r => setTimeout(r, 17));
      try {
        // Let any finisher from the previous move finish and the dead respawn.
        for (let i = 0; i < 400 && activeFinisher; i++) { __step(1); await tick(); }
        for (let i = 0; i < 200; i++) { __step(1); await tick(); }   // the last victim's respawn lands
        MoveScene.reset();
        if (typeof projectiles !== 'undefined') projectiles.length = 0;
        activeFinisher = null; activeCinematic = null; isCinematic = false; slowMotion = 1;
        if (typeof setCombatLock === 'function' && typeof clearCombatLock === 'function') clearCombatLock('finisher');
        const p1 = players[0], p2 = players[1];
        for (const p of players) {
          if (typeof wxResetFighter === 'function') wxResetFighter(p);
          for (const k of ['_swordSlashes', '_swordSlashQueue', '_hammerShock', '_hammerSpin', '_thrownAxe', '_scytheToss', '_flailBall',
            '_flailOrbit', '_boomOrbit', '_boomerangs', '_shockBolt', '_thunderStrikes', '_peaCluster', '_gravityStone', '_paperSwarm',
            '_paperPlanes', '_whipCoil', '_whipRope', '_broomRide', '_comboSuper', '_spearCharge', '_shieldCharge']) p[k] = null;
          p.health = p.maxHealth; p.invincible = 0; p.stunTimer = 0; p.ragdollTimer = 0; p.hurtTimer = 0;
          p.vx = 0; p.vy = 0; p.shielding = false; p.attackTimer = 0; p.attackEndlag = 0;
          p.cooldown = 0; p.abilityCooldown = 0; p._msScene = null; p._msLock = null; p._movePose = null; p._msKill = null;
          p._comboHitCount = 0; p._launchCount = 0; p._superArmorUntil = 0; p.lives = 99;
          p.isAI = false; p.charClass = 'none'; p.armorPieces = []; p.curses = [];
          p._deathAnim = null; p.respawnTimer = 0; p.invincible = 0;
        }
        p1.superActive = false; p1.dmgMult = undefined; p1._domainSuperCount = 0;
        p1.weaponKey = wk; p1.weapon = WEAPONS[wk];
        const floor = currentArena.platforms.filter(pl => !pl.isFloorDisabled).sort((a, b) => b.w - a.w)[0];
        const fy = floor.y;
        const x1 = floor.x + floor.w * 0.42;
        p1.x = x1; p1.y = fy - p1.h; p1.facing = 1; p1.onGround = true;
        p2.x = x1 + gap; p2.y = fy - p2.h; p2.facing = -1; p2.onGround = true;
        out.floor = { L: floor.x, R: floor.x + floor.w };
        for (let i = 0; i < 3; i++) { __step(1); await tick(); }
        p1.x = x1; p2.x = x1 + gap; p1.facing = 1;
        p1.health = 60;   // room for the completion heal to show
        p2.health = 1;
        if (st.pre) await st.pre(p1, p2);
        if (kind === 'swing') { /* the staging swings */ }
        else if (kind === 'e') { p1.superMeter = 100; p1.superReady = true; p1.useSuper(p2); }
        else p1.ability(p2);
        out.started = !!p1._msScene;

        let T = null;
        const _d = p1.draw;
        p1.draw = function () { T = ctx.getTransform(); return _d.call(this); };
        const CW = 320, CH = 200, COLS = 6;
        const sheet = document.createElement('canvas');
        sheet.width = CW * COLS; sheet.height = CH * 6;
        const sx = sheet.getContext('2d');
        sx.fillStyle = '#111'; sx.fillRect(0, 0, sheet.width, sheet.height);

        // Wait for the kill (projectile moves can take a while).
        let f = 0;
        out.trace = [];
        if (!window.__tfOrig) window.__tfOrig = triggerFinisher;
        triggerFinisher = function (a, t) { const g = { sf: settings.finishers, hub: !!window._pubHubActive, af: !!activeFinisher, ac: activeCinematic && (activeCinematic.name || typeof activeCinematic), ic: isCinematic, tr: trainingMode, tu: tutorialMode, on: onlineMode, gm: gameMode }; const r = window.__tfOrig.apply(this, arguments); out.trace.push(JSON.stringify(g) + ' ' + `tf@${f} ${a === p1 ? 'p1' : '?'}->${t === p2 ? 'p2' : '?'} ${r} kill=${JSON.stringify(a && a._msKill)} gates=${JSON.stringify({ af: !!activeFinisher, ac: !!activeCinematic, ic: isCinematic, tr: trainingMode, tu: tutorialMode, on: onlineMode, gm: gameMode })}`); return r; };
        let hpPrev = p2.health;
        for (; f < 260 && !activeFinisher; f++) {
          if (st.at) st.at(f, p1, p2); __step(1); await tick();
          if (p2.health !== hpPrev) { out.trace.push(`f${f} hp ${hpPrev}->${p2.health} x${Math.round(p2.x)} y${Math.round(p2.y)}`); hpPrev = p2.health; }
        }
        triggerFinisher = window.__tfOrig;
        if (out.trace.length > 12) out.trace = out.trace.slice(0, 12);
        out.killFrame = activeFinisher ? f : null;
        if (!activeFinisher) { out.fin = null; out.hp2 = p2.health; p1.draw = _d; return out; }
        const af = activeFinisher;
        out.fin = af.def.moveKey || 'generic';
        out.finName = af.def.name;
        out.len = af.totalDuration;
        const hpBefore = p1.health;
        let s = 0, ran = 0, nan = false;
        while (activeFinisher === af && ran < 600) {
          __step(1); await tick(); ran++;
          for (const p of [p1, p2]) if (!isFinite(p.x) || !isFinite(p.y)) nan = true;
          if (ran % cfg.every === 1 && T && s < 36) {
            // Use the full canvas: the finisher owns the camera.
            const col = s % COLS, row = Math.floor(s / COLS);
            try { sx.drawImage(canvas, 0, 0, canvas.width, canvas.height, col * CW, row * CH, CW, CH); } catch (e) {}
            sx.fillStyle = '#fff'; sx.font = '12px monospace';
            sx.fillText(`${cfg.key} t${af.timer}`, col * CW + 4, row * CH + 14);
            s++;
          }
        }
        for (let i = 0; i < 6; i++) { __step(1); await tick(); }
        p1.draw = _d;
        out.ranFrames = ran;
        out.completed = activeFinisher !== af;
        out.nan = nan;
        out.heal = p1.health - hpBefore;
        out.p2Dead = p2.health <= 0 || (p2.lives < 99);
        out.p1End = { x: Math.round(p1.cx()), onStage: p1.cx() > out.floor.L && p1.cx() < out.floor.R, pose: !!p1._movePose };
        out.cinClear = !activeCinematic && !isCinematic;
        if (s) {
          const crop = document.createElement('canvas');
          crop.width = sheet.width; crop.height = CH * Math.ceil(s / COLS);
          crop.getContext('2d').drawImage(sheet, 0, 0);
          out.sheet = crop.toDataURL('image/png');
        } else out.sheet = null;
      } catch (e) { out.errors.push(String(e && e.stack || e)); }
      return out;
    }, wk, kind, { every: EVERY, gap: GAP, key, swingAfter });
    if (res.sheet && (args.sheets || !args.all)) {
      const fn = path.join(OUT, `${key.replace(/[:+]/g, "-")}.png`);
      fs.writeFileSync(fn, Buffer.from(res.sheet.split(',')[1], 'base64'));
      res.sheetFile = fn;
    }
    delete res.sheet;
    const ok = res.fin === res.want && res.completed && res.p2Dead && res.p1End && res.p1End.onStage && !res.nan && res.cinClear && !res.errors.length;
    res.ok = !!ok;
    results.push(res);
    console.log((ok ? 'OK   ' : 'FAIL ') + JSON.stringify(res));
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter(r => r.ok).length}/${results.length} ok`);
  if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n'));
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
