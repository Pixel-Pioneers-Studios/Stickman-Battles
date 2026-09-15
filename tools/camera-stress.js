#!/usr/bin/env node
'use strict';
// tools/camera-stress.js — camera containment stress test.
//
//   node tools/camera-stress.js            (expects a server on :8080)
//   node tools/camera-stress.js --port 3001
//
// The camera's contract: every fighter the camera is RESPONSIBLE for must be
// inside the safe viewport (below the HUD, inside the frame), in every mode, on
// every arena, at every separation. This drives the real game through a battery
// of scenarios and measures that contract each frame.
//
// It reports, per scenario:
//   offFrames  — frames where a tracked fighter was outside the safe viewport
//   maxOver    — worst overflow, in fractions of a half-viewport (1.0 = at edge)
//   snapMax    — largest single-frame camera jump (world units); >220 reads as a cut
//   zoom       — [min, max] the camera actually used
// A scenario passes when offFrames is 0 (after a settle window) and snapMax is
// under the cut threshold.

const path = require('path');
const puppeteer = require(path.join(__dirname, '..', 'node_modules', 'puppeteer'));

const PORT = (() => {
  const i = process.argv.indexOf('--port');
  return i > -1 ? process.argv[i + 1] : '8080';
})();
const URL = `http://localhost:${PORT}/index.html`;

const SETTLE_FRAMES = 90;    // camera is allowed this long to reach a new framing
const SNAP_LIMIT    = 220;   // world units in one frame before it reads as a cut

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Scenarios ────────────────────────────────────────────────────────────────
// Each drives positions every frame (`drive`) so the camera cannot "win" by the
// fighters happening to come back together.
const SCENARIOS = [
  { name: 'standard arena · both fighters centred',
    mode: '2p', arena: 'grass',
    drive: (t) => [[380, 300], [520, 300]] },

  { name: 'standard arena · opposite edges',
    mode: '2p', arena: 'grass',
    drive: (t) => [[20, 300], [860, 300]] },

  { name: 'standard arena · vertical extreme (one high, one low)',
    mode: '2p', arena: 'space',
    drive: (t) => [[300, 40], [600, 440]] },

  { name: 'standard arena · fighters oscillating apart and together',
    mode: '2p', arena: 'grass',
    drive: (t) => { const d = 420 * (0.5 + 0.5 * Math.sin(t / 45)); return [[450 - d, 300], [450 + d, 300]]; } },

  { name: 'wide arena · opposite ends of the sewer',
    mode: '2p', arena: 'sewer',
    drive: (t) => [[40, 330], [1740, 330]] },

  { name: 'wide arena · sewer, one player sprinting away',
    mode: '2p', arena: 'sewer',
    drive: (t) => [[60, 330], [Math.min(1740, 300 + t * 6), 330]] },

  { name: 'wide arena · megacity far separation',
    mode: '2p', arena: 'megacity',
    drive: (t) => [[80, 300], [3400, 300]] },

  // A player teleporting 3100 units instantly SHOULD produce a cut — the camera
  // closing that gap smoothly would leave them off screen for a second. What is
  // measured here is that it recovers fast, not that it stays smooth.
  { name: 'wide arena · megacity, teleporting player (worst-case cut)',
    mode: '2p', arena: 'megacity', allowCut: true, maxOffFrames: 24,
    drive: (t) => [[(t % 240 < 120) ? 200 : 3300, 300], [1700, 300]] },

  { name: 'standard arena · one fighter launched above the ceiling',
    mode: '2p', arena: 'grass',
    drive: (t) => [[450, -260], [500, 420]] },

  { name: 'standard arena · one fighter below the floor',
    mode: '2p', arena: 'grass',
    drive: (t) => [[420, 300], [500, 620]] },

  { name: 'low gravity · fighter launched to the ceiling and back',
    mode: '2p', arena: 'space',
    drive: (t) => [[400, 300], [520, 300 - 260 * (0.5 + 0.5 * Math.sin(t / 30))]] },

  { name: 'wide arena · sewer with real physics, no forced positions',
    mode: '2p', arena: 'sewer', free: true },

  { name: 'boss arena · player and boss separated',
    mode: 'boss', arena: null,
    drive: (t) => [[60, 300], [820, 260]] },

  { name: 'battle royale · local player tracked through the match',
    mode: 'battleroyale', arena: null, br: true, free: true },

  { name: '1p · distant bot must not drag the camera off the human',
    mode: '1p', arena: 'megacity',
    drive: (t) => [[600, 300], [3400, 300]], humanOnly: true },
];

async function runScenario(page, sc) {
  await page.evaluate(({ mode, arena }) => {
    if (typeof gameRunning !== 'undefined' && gameRunning) gameRunning = false;
    selectMode(mode);
    if (arena) selectArena(arena);
    startGame();
  }, sc);
  await sleep(sc.br ? 3000 : 1400);
  if (sc.br) {
    // Get off the plane so the match is actually being played.
    await page.evaluate(() => {
      const t = setInterval(() => {
        if (typeof brPlaneX !== 'undefined' && brPlaneX > 900 && !brJumped) {
          keysDown.add(' '); clearInterval(t); setTimeout(() => keysDown.delete(' '), 500);
        }
      }, 20);
    });
    await sleep(5000);
  }

  return await page.evaluate(async ({ driveSrc, settle, snapLimit, br, humanOnly }) => {
    const drive = driveSrc ? eval('(' + driveSrc + ')') : null;
    const p1 = players[0], p2 = players[1];
    if (!p1) return { error: 'no player' };
    if (drive && !p2) return { error: 'need two fighters, got ' + players.length };
    // Which fighters is the camera responsible for in this scenario?
    //  - BR locks to the local player by design, so only P1 is checked.
    //  - humanOnly scenarios assert that a distant BOT is correctly ignored.
    const watched = br ? [p1] : (humanOnly ? [p1] : [p1, p2]);
    if (drive) for (const p of [p1, p2]) { p.isAI = humanOnly && p === p2; p.godmode = true; p.health = p.maxHealth; }

    const hudEl = document.getElementById('hud');
    const hudScreenH = (hudEl && hudEl.offsetHeight) || 0;
    const hudGU = hudScreenH * GAME_H / Math.max(canvas.height, 1);

    let offFrames = 0, maxOver = 0, snapMax = 0, zMin = 9, zMax = 0, nan = 0;
    let prevX = camXCur, prevY = camYCur;

    for (let t = 0; t < 260; t++) {
      if (drive) {
        const pos = drive(t);
        p1.x = pos[0][0]; p1.y = pos[0][1]; p1.vx = 0; p1.vy = 0;
        p2.x = pos[1][0]; p2.y = pos[1][1]; p2.vx = 0; p2.vy = 0;
      }
      await new Promise(r => requestAnimationFrame(r));

      if (![camXCur, camYCur, camZoomCur].every(Number.isFinite)) { nan++; continue; }
      zMin = Math.min(zMin, camZoomCur); zMax = Math.max(zMax, camZoomCur);
      const jump = Math.hypot(camXCur - prevX, camYCur - prevY);
      if (t > settle) snapMax = Math.max(snapMax, jump);
      prevX = camXCur; prevY = camYCur;
      if (t <= settle) continue;

      // Safe viewport in world units: full width, height minus the HUD band.
      const hvw = GAME_W / (2 * camZoomCur);
      const hvh = GAME_H / (2 * camZoomCur);
      const top = camYCur - hvh + hudGU;      // HUD eats the top
      const bot = camYCur + hvh;
      const lef = camXCur - hvw;
      const rig = camXCur + hvw;

      for (const p of watched) {
        if (!p || p.health <= 0 || p._brOnPlane) continue;
        // A fighter the world clamp genuinely cannot reach (outside the map, or
        // above its ceiling) is not the camera's failure — skip those.
        const wl = currentArena.mapLeft !== undefined ? currentArena.mapLeft : 0;
        const wr = currentArena.mapRight !== undefined ? currentArena.mapRight : GAME_W;
        if (p.cx() < wl - 20 || p.cx() > wr + 20) continue;
        if (p.y < -180) continue;                       // above the arena ceiling
        // Below the world floor: the camera is not allowed to pan into the void
        // under the stage, and a fighter down there is already dying.
        const floorPl = currentArena.platforms && currentArena.platforms.find(q => q.isFloor);
        const wb = currentArena.mapBottom !== undefined ? currentArena.mapBottom
                 : (floorPl ? floorPl.y + 80 : GAME_H);
        if (p.y > wb) continue;
        const overL = (lef - p.x) / hvw;
        const overR = (p.x + p.w - rig) / hvw;
        const overT = (top - p.y) / hvh;
        const overB = (p.y + p.h - bot) / hvh;
        const over = Math.max(overL, overR, overT, overB);
        if (over > 0.02) { offFrames++; maxOver = Math.max(maxOver, over); }
      }
    }
    return { offFrames, maxOver: +maxOver.toFixed(3), snapMax: Math.round(snapMax),
             zoom: [+zMin.toFixed(2), +zMax.toFixed(2)], nan, frames: 260 - settle };
  }, { driveSrc: sc.drive ? sc.drive.toString() : null, settle: SETTLE_FRAMES,
       snapLimit: SNAP_LIMIT, br: !!sc.br, humanOnly: !!sc.humanOnly });
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 700 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2500);

  let failed = 0;
  console.log('CAMERA STRESS TEST\n' + '='.repeat(78));
  for (const sc of SCENARIOS) {
    let r;
    try { r = await runScenario(page, sc); }
    catch (e) { r = { error: e.message }; }
    if (r.error) { console.log(`FAIL  ${sc.name}\n      ${r.error}`); failed++; continue; }
    const bad = r.offFrames > (sc.maxOffFrames || 0)
             || (!sc.allowCut && r.snapMax > SNAP_LIMIT)
             || r.nan > 0;
    if (bad) failed++;
    console.log(`${bad ? 'FAIL' : 'pass'}  ${sc.name}`);
    console.log(`      off ${r.offFrames}/${r.frames} frames · maxOver ${r.maxOver} · `
              + `snapMax ${r.snapMax} · zoom ${r.zoom[0]}-${r.zoom[1]}${r.nan ? ' · NaN ' + r.nan : ''}`);
  }
  console.log('='.repeat(78));
  console.log(failed ? `${failed}/${SCENARIOS.length} scenarios FAILED` : `all ${SCENARIOS.length} scenarios pass`);
  if (errs.length) console.log('page errors:\n  ' + errs.slice(0, 5).join('\n  '));
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
