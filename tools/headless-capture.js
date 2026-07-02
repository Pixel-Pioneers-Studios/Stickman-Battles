'use strict';
/*
 * tools/headless-capture.js — real-boot headless capture harness (DEV ONLY)
 *
 * Boots the ACTUAL game (through startGame/_startGameCore so the real render
 * path runs), drops into a Boss or TrueForm fight, then captures a sequence of
 * rendered frames plus a per-sample state log. Unlike a hand-built logic sim
 * this produces VALID pixels AND motion over time, so it can verify a level
 * renders, animates, and doesn't freeze/deadlock — not just "doesn't throw".
 *
 * It touches ZERO game code. It only reads/sets globals the menu already sets.
 *
 * What it CAN confirm: no crashes/exceptions, boss spawns and stays active
 *   (catches frozen-boss dead-ends), cinematics fire and hand back control,
 *   the scene renders real pixels across a sequence.
 * What it CANNOT confirm: game feel / fun / fairness / difficulty. Human-only.
 *
 * Usage:
 *   node tools/headless-capture.js --mode=boss     [--arena=grass] [--frames=20] [--interval=30] [--out=/tmp/smb-capture]
 *   node tools/headless-capture.js --mode=trueform
 *
 *   --mode      boss | trueform            (default boss)
 *   --arena     arena key                  (default grass)
 *   --frames    number of screenshots      (default 20)
 *   --interval  ms between screenshots     (default 400)
 *   --port      static server port         (default 8099)
 *   --out       output dir for png + json  (default /tmp/smb-capture)
 *   --headful   show the browser window    (default headless)
 *
 * Note: lexical `let` globals (players, gameMode, selectedArena, gameRunning…)
 * are NOT window properties — but page.evaluate runs in the page's global scope,
 * so reference them by BARE name. `window.players` would be a dead copy.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

// ---- args ----
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MODE     = (args.mode || 'boss').toLowerCase();
const ARENA    = args.arena || 'grass';
const FRAMES   = parseInt(args.frames, 10)   || 20;
const INTERVAL = parseInt(args.interval, 10) || 400;
const PORT     = parseInt(args.port, 10)     || 8099;
const OUT      = args.out || '/tmp/smb-capture';
const HEADFUL  = !!args.headful;

if (!['boss', 'trueform'].includes(MODE)) {
  console.error(`Unsupported --mode=${MODE}. Use boss or trueform.`);
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');           // Stickman-Battles/
fs.mkdirSync(OUT, { recursive: true });

// ---- tiny static file server (no python dependency) ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

const log = (...a) => console.log('[capture]', ...a);

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('puppeteer'); }

  const server = await startServer();
  log(`static server on http://localhost:${PORT}  (root: ${ROOT})`);

  const launchOpts = {
    headless: HEADFUL ? false : 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900', '--mute-audio'],
  };
  // Prefer system Chrome if bundled chromium is unavailable
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(sysChrome)) launchOpts.executablePath = sysChrome;

  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // ---- collect runtime errors (the core "does it crash" signal) ----
  // Separate real game errors from external-network noise (the game phones home
  // to onrender.com / CrazyGames / Supabase, which all fail under a local headless
  // origin — CORS, 404, ERR_FAILED). That noise is not a game bug.
  const NOISE = /onrender\.com|crazygames|CrazySDK|supabase|live-config|\/api\/|net::ERR_FAILED|Failed to load resource|status of 404|CORS policy|ERR_CONNECTION/i;
  const errors = [];          // real game errors (fail the run)
  const ignored = [];         // external-network noise (informational)
  const classify = (s) => (NOISE.test(s) ? ignored : errors).push(s);
  page.on('pageerror', e => errors.push(String(e && e.message || e))); // uncaught JS = always real
  page.on('console', msg => { if (msg.type() === 'error') classify('console.error: ' + msg.text()); });

  log(`loading game…`);
  // NOTE: not networkidle — PeerJS/socket.io hold persistent connections so the
  // network never goes idle. Wait for `load`, then settle manually.
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });

  // On a fresh (headless) profile the game auto-opens Story Mode and plays the
  // chapter-0 prologue/intro cutscene over everything. Neutralize first-visit
  // story state so it never triggers, then we control the boot cleanly.
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated    = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
        if (typeof _saveStory2 === 'function') _saveStory2();
      }
      if (typeof storyModeActive !== 'undefined') storyModeActive = false;
      if (typeof activeCinematic !== 'undefined') activeCinematic = null; // clear any auto-launched story cutscene
    } catch (e) {}
    // Tear down every story/prologue overlay (storyPrologueOverlay is z-index 999).
    ['prologueOverlay', 'storyPrologueOverlay', 'storyPathPanel', 'storyModal',
     'storyIntroOverlay', 'storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    document.querySelectorAll('button').forEach(b => { if (/begin/i.test(b.textContent)) b.click(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 600));

  // ---- boot the fight ----
  log(`booting mode=${MODE} arena=${ARENA}…`);
  const boot = await page.evaluate((mode, arena) => {
    try {
      if (typeof ARENAS !== 'undefined' && !ARENAS[arena]) return { ok: false, why: `unknown arena '${arena}'` };
      // selectMode wires DOM (player-count toggle etc.); then force arena + bare globals.
      if (typeof selectMode === 'function') selectMode(mode); else gameMode = mode;
      gameMode = mode;
      selectedArena = arena;
      if (mode === 'boss') bossPlayerCount = 1;
      if (typeof startGame === 'function') { startGame(); return { ok: true }; }
      return { ok: false, why: 'startGame() not found' };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  }, MODE, ARENA);

  if (!boot.ok) { log('BOOT FAILED:', boot.why); await browser.close(); server.close(); process.exit(1); }

  // startGame() holds an 800ms loading screen before _startGameCore(); wait it out + a bit.
  await new Promise(r => setTimeout(r, 1800));

  const ready = await page.evaluate(() => {
    const found = typeof players !== 'undefined' && Array.isArray(players)
      && players.find(p => p && (p.isBoss || p.isTrueForm));
    return { gameRunning: typeof gameRunning !== 'undefined' ? gameRunning : null,
             bossPresent: !!found, playerCount: typeof players !== 'undefined' ? players.length : 0 };
  });
  log('post-boot:', JSON.stringify(ready));
  if (!ready.bossPresent) log('WARNING: no boss/trueform entity found in players[] — capturing anyway.');

  // Drive the player as an aggressive bot so a REAL fight unfolds. Boss/TF AI is
  // reactive — with an idle player it just waits (looks "frozen"). startGame forces
  // p1.isAI=false (expects a human); we flip it back. `--no-drive` keeps it idle.
  if (args.drive !== 'false' && args['no-drive'] === undefined) {
    const drove = await page.evaluate(() => {
      try {
        const ps = (typeof players !== 'undefined' && Array.isArray(players)) ? players : [];
        const boss = ps.find(p => p && (p.isBoss || p.isTrueForm));
        const human = ps.find(p => p && !p.isBoss && !p.isTrueForm && !p.isMinion && !p.isRemote);
        if (!human) return false;
        human.isAI   = true;
        human.aiDiff = 'hard';            // AI difficulty keys off aiDiff, not `intelligence`
        if (boss) human.target = boss;
        return true;
      } catch (e) { return false; }
    });
    log('player driven as bot:', drove);
  }

  // ---- capture loop ----
  const samples = [];
  for (let i = 0; i < FRAMES; i++) {
    const file = path.join(OUT, `frame-${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: file });
    const s = await page.evaluate(() => {
      const out = { t: Date.now() };
      try {
        out.gameRunning = typeof gameRunning !== 'undefined' ? gameRunning : null;
        out.frameCount  = typeof frameCount !== 'undefined' ? frameCount : null;
        out.cinematic   = typeof activeCinematic !== 'undefined' && !!activeCinematic;
        out.bossFloor   = typeof bossFloorState !== 'undefined' ? bossFloorState : null;
        const ps = (typeof players !== 'undefined' && Array.isArray(players)) ? players : [];
        const boss = ps.find(p => p && (p.isBoss || p.isTrueForm));
        const human = ps.find(p => p && !p.isBoss && !p.isTrueForm && !p.isMinion);
        if (boss)  out.boss  = { x: Math.round(boss.x), y: Math.round(boss.y), hp: Math.round(boss.health),
                                 phase: boss.phase != null ? boss.phase : null, attackTimer: boss.attackTimer != null ? boss.attackTimer : null };
        if (human) out.human = { x: Math.round(human.x), hp: Math.round(human.health), lives: human.lives != null ? human.lives : null };
      } catch (e) { out.err = String(e && e.message || e); }
      return out;
    });
    samples.push(s);
    if (i < FRAMES - 1) await new Promise(r => setTimeout(r, INTERVAL));
  }

  // ---- analyze ----
  const findings = [];
  if (errors.length) findings.push(`${errors.length} runtime error(s) — see report.errors`);

  const bossSamples = samples.filter(s => s.boss);
  if (ready.bossPresent && bossSamples.length) {
    const movedX = new Set(bossSamples.map(s => s.boss.x)).size;
    const movedY = new Set(bossSamples.map(s => s.boss.y)).size;
    const hpVals = new Set(bossSamples.map(s => s.boss.hp)).size;
    const anyCinematic = samples.some(s => s.cinematic);
    // Frozen heuristic: boss never moved and never acted across the whole window,
    // while no cinematic was playing (a cinematic legitimately holds the boss still).
    if (movedX <= 1 && movedY <= 1 && !anyCinematic) {
      findings.push('POSSIBLE FROZEN BOSS: position never changed and no cinematic ran across the capture window');
    }
    if (hpVals <= 1) findings.push('boss HP never changed (player may not be engaging — expected with no live player input)');
  }
  const frameAdvanced = new Set(samples.map(s => s.frameCount).filter(v => v != null)).size > 1;
  if (!frameAdvanced) findings.push('frameCount never advanced — game loop may be stalled');

  const report = {
    mode: MODE, arena: ARENA, frames: FRAMES, intervalMs: INTERVAL,
    capturedAt: new Date().toISOString(), outDir: OUT,
    postBoot: ready, errors, ignoredNetworkNoise: ignored, samples,
    findings: findings.length ? findings : ['no anomalies detected by harness heuristics'],
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  await browser.close();
  server.close();

  log('—'.repeat(50));
  log(`captured ${FRAMES} frames → ${OUT}/frame-*.png`);
  log(`report → ${OUT}/report.json`);
  log(`game errors: ${errors.length}   (ignored external-network noise: ${ignored.length})`);
  report.findings.forEach(f => log('•', f));
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('[capture] FATAL', e); process.exit(1); });
