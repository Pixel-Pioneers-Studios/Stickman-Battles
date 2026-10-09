'use strict';
/*
 * tools/level-tester.js — Sovereign plays every story chapter (DEV ONLY)
 *
 * Boots the real game headless, launches each chapter, possesses the player with
 * SovereignControl (the F7 brain) and records whether he clears it and what it
 * cost him. Touches zero game code: everything is wrappers installed per page.
 *
 *   node tools/level-tester.js                        # every chapter, 3 attempts, Normal
 *   node tools/level-tester.js --chapters=0-20 --attempts=5 --difficulty=evolution
 *   node tools/level-tester.js --chapters=9,10,44 --parallel=2 --timeout=300
 *
 *   --chapters    range/list of registry ids     (default all)
 *   --attempts    attempts per chapter           (default 3)
 *   --difficulty  story|normal|challenge|evolution (default normal)
 *   --parallel    pages at once                  (default 3; more starves rAF)
 *   --timeout     seconds per attempt            (default 240)
 *   --stall       seconds with no progress = STALL (default 45)
 *   --out         output dir                     (default data/level-test/<stamp>)
 *   --headful     show the browser
 *   --shots       also screenshot every N seconds (debugging a chapter)
 *
 * Result per attempt:
 *   WIN    chapter cleared (victory screen, or walk-through exit into the next world)
 *   LOSS   out of lives (retry screen)
 *   STALL  nothing moved, hit or got hit for --stall seconds. This is Sovereign or
 *          the navigator failing to find the way, NOT proof the level is broken.
 *   TIMEOUT still going at --timeout
 *   CRASH  uncaught page error during the attempt
 *   SKIP   no gameplay to test (narrative, branch, cinematic run, ship flight)
 *
 * Sovereign is a fighter, not an explorer: with nothing alive to target he stands
 * still. When no enemy is alive the tester steers him toward the current objective
 * (next puzzle switch in order, nearest scavenge item, then the exit) with a
 * walk/jump/back-off walker. QTEs are played by tools/sov-qte-autopilot.js.
 *
 * Difficulty score (0-100, 100 = never cleared) is half "how often he lost" and
 * half "how much of his total health budget a WIN cost him" (damage taken divided
 * by maxHealth x starting lives). It measures Sovereign, who is not a human: read
 * it as a relative curve across chapters, not an absolute rating.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT       = path.resolve(__dirname, '..');
const ATTEMPTS   = parseInt(args.attempts, 10) || 3;
const DIFFICULTY = args.difficulty || 'normal';
const PARALLEL   = parseInt(args.parallel, 10) || 3;
const TIMEOUT_S  = parseInt(args.timeout, 10) || 240;
const STALL_S    = parseInt(args.stall, 10) || 45;
const PORT       = parseInt(args.port, 10) || 8131;
const HEADFUL    = !!args.headful;
const SHOTS_S    = parseInt(args.shots, 10) || 0;
const STAMP      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT        = path.resolve(args.out || path.join(ROOT, 'data', 'level-test', STAMP));
fs.mkdirSync(OUT, { recursive: true });

function parseChapters(spec, max) {
  if (!spec || spec === true) return null;
  const out = new Set();
  for (const part of String(spec).split(',')) {
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m) for (let i = +m[1]; i <= Math.min(+m[2], max); i++) out.add(i);
    else if (/^\d+$/.test(part)) out.add(+part);
  }
  return [...out].sort((a, b) => a - b);
}

// ---- static server (python's resets under the game's ~250 parallel script loads) ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
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
    server.listen(PORT, '127.0.0.1', 1024, () => resolve(server));
  });
}

const NOISE = /onrender\.com|crazygames|CrazySDK|supabase|live-config|\/api\/|net::ERR|Failed to load resource|status of 40\d|CORS policy|peerjs|socket\.io|AudioContext/i;
const QTE_SRC = fs.readFileSync(path.join(__dirname, 'sov-qte-autopilot.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- page boot: fresh profile, no first-run ladder, no prologue ----
async function bootPage(browser) {
  const ctx  = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 760 });
  const errors = [], consoleErrors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text()) && !/HTML5 SDK/.test(m.text())) consoleErrors.push(m.text()); });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('smb_tutorialSeen', '1'); } catch (e) {}
  });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => typeof STORY_CHAPTERS2 !== 'undefined' && STORY_CHAPTERS2.length > 0 &&
    typeof SovereignControl !== 'undefined' && typeof _launchChapterWithGauntlet === 'function' &&
    document.readyState === 'complete', { timeout: 90000 });
  await sleep(1500);
  await page.evaluate(() => {
    try {
      // The tutorial flag is read from the account first, so localStorage alone
      // doesn't stop the first-run ladder fight on a fresh profile.
      if (typeof markTutorialSeen === 'function') markTutorialSeen();
      window.maybeStartFirstRun = function () {};
      if (typeof tutorialActive !== 'undefined') tutorialActive = false;
      if (typeof ladderActive !== 'undefined') ladderActive = false;
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.prologueSeen = true;
        if (!Array.isArray(_story2.defeated)) _story2.defeated = [];
      }
      if (typeof activeCinematic !== 'undefined') activeCinematic = null;
      if (typeof gameRunning !== 'undefined' && gameRunning && typeof backToHome === 'function') backToHome();
    } catch (e) {}
    ['prologueOverlay', 'storyPrologueOverlay', 'storyIntroOverlay', 'storyUnlockOverlay', 'storyDifficultyOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  });
  await sleep(400);
  return { ctx, page, errors, consoleErrors };
}

async function readChapters(browser) {
  const { ctx, page } = await bootPage(browser);
  const list = await page.evaluate(() => STORY_CHAPTERS2.map((c, i) => ({
    idx: i, id: c.id, title: c.title || '', type: c.type || 'fight',
    noFight: !!c.noFight, walkFight: !!c.walkFight,
    cinematicRun: typeof isStoryCinematicRunStart === 'function' && isStoryCinematicRunStart(c.id),
    boss: !!(c.isBossFight || c.isTrueFormFight || c.isSovereignFight || c.isGodFight || c.isAbsoluteAxiomFight),
    exploreMode: c.exploreMode || c.mode || null,
  })));
  await ctx.close();
  return list;
}

function skipReason(ch) {
  if (ch.type === 'branch') return 'branch choice';
  if (ch.noFight) return 'narrative only';
  if (ch.cinematicRun) return 'cinematic run';
  if (ch.type === 'ship_flight') return 'ship flight needs human input';
  return null;
}

// ---- one attempt ----
async function runAttempt(browser, ch, attempt) {
  let boot;
  try { boot = await bootPage(browser); }
  catch (e) { return { result: 'CRASH', note: 'boot failed: ' + e.message }; }
  const { ctx, page, errors, consoleErrors } = boot;
  const bootErrs = errors.length, bootConsole = consoleErrors.length;
  try {
    await page.evaluate(QTE_SRC);
    const launched = await page.evaluate((id, diff, stallS) => {
      const T = window.__lt = {
        result: null, note: '', frames: 0, startT: performance.now(),
        hp: null, lives: null, livesStart: null, maxHp: 0, dmgTaken: 0, healed: 0, deaths: 0,
        dmgDealt: 0, minHpPct: 1, lowHpFrames: 0, maxX: -1e9, lastProgress: performance.now(),
        navFrames: 0, aiFrames: 0, dropFrames: 0, lastDealt: performance.now(), hurtBy: {}, viaDeal: 0, falls: 0, lastY: 0, context: null, weapon: null, cls: null, engageFails: 0, completed: [],
      };
      _story2.difficulty = diff;
      const ch = STORY_CHAPTERS2[id];
      if (!ch) return 'no chapter ' + id;
      const progress = () => { T.lastProgress = performance.now(); };

      const wrap = (name, fn) => {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function () { try { fn.apply(this, arguments); } catch (e) {} return orig.apply(this, arguments); };
      };
      wrap('_showStory2Victory', c => { if (!T.result) { T.result = 'WIN'; T.note = 'victory screen'; } });
      wrap('_regionCompleteChapter', chId => {
        T.completed.push(chId);
        if (chId === id && !T.result) { T.result = 'WIN'; T.note = 'walked through the exit'; }
      });
      const snap = () => {
        const modes = ['stealthModeActive', 'escapeModeActive', 'defenseModeActive', 'escortModeActive', 'puzzleModeActive', 'scavengeModeActive', 'survivalModeActive']
          .filter(k => { try { return !!eval(k); } catch (e) { return false; } });
        const h = SovereignControl._host;
        T.context = { subtitle: (typeof storyFightSubtitle !== 'undefined' && storyFightSubtitle && storyFightSubtitle.text) || '',
          modes, lives: h ? h.lives : null, health: h ? Math.round(h.health) : null,
          enemiesAlive: (typeof minions !== 'undefined' ? minions.filter(m => m.health > 0).length : 0) +
            players.filter(p => p !== h && p.health > 0 && !(typeof areAlliedEntities === 'function' && h && areAlliedEntities(h, p))).length };
      };
      T.snap = snap;
      wrap('_showStory2RetryScreen', () => {
        if (T.result) return;
        snap(); T.result = 'LOSS';
        T.note = T.context.lives > 0 ? 'failed with lives left' + (T.context.subtitle ? ': "' + T.context.subtitle + '"' : '') : 'out of lives';
      });

      const host = () => SovereignControl.active ? SovereignControl._host : null;
      // endGame() scores a story win as `winner && !winner.isAI`, and possession
      // sets isAI on the player — every possessed win would read as a loss.
      const origEnd = window.endGame;
      window.endGame = function () {
        const h = host();
        if (!h) return origEnd.apply(this, arguments);
        h.isAI = false;
        try { return origEnd.apply(this, arguments); } finally { h.isAI = true; }
      };
      const origDeal = window.dealDamage;
      window.dealDamage = function (attacker, target) {
        const h = host();
        const before = target ? target.health : 0;
        const r = origDeal.apply(this, arguments);
        if (h && target === h) {
          const d = before - h.health;
          if (d > 0) { const k = (attacker && (attacker.name || attacker.charClass)) || 'unknown'; T.hurtBy[k] = (T.hurtBy[k] || 0) + d; T.viaDeal += d; }
        }
        if (h && target && target !== h && (attacker === h || (attacker && attacker.owner === h))) {
          const d = before - target.health;
          if (d > 0) { T.dmgDealt += d; T.lastDealt = performance.now(); progress(); }
        }
        return r;
      };

      // Objective walker: only drives when Sovereign has nothing alive to fight.
      function waypoint(h) {
        if (typeof puzzleModeActive !== 'undefined' && puzzleModeActive && puzzleSwitches[puzzleStep])
          return puzzleSwitches[puzzleStep];
        if (typeof scavengeModeActive !== 'undefined' && scavengeModeActive) {
          const left = scavengeItems.filter(s => !s.collected);
          if (left.length) return left.reduce((a, b) => Math.abs(b.x - h.cx()) < Math.abs(a.x - h.cx()) ? b : a);
        }
        if (typeof exploreGoalX !== 'undefined' && (typeof exploreGoalFound === 'undefined' || !exploreGoalFound))
          return { x: exploreGoalX + 40, y: null };
        return null;
      }
      // Sovereign never steps off a ledge to reach a target below him (no
      // drop-through exists). After a stretch with no damage dealt and the target
      // well below, walk him off the nearer edge of whatever he stands on.
      function dropEdge(h, nav) {
        const t = h.target;
        if (!t || !h.onGround || t.y - h.y < 120) return null;
        if (performance.now() - T.lastDealt < 5000) return null;
        const pls = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
        const feet = h.y + h.h;
        const pl = pls.find(p => h.x + h.w > p.x && h.x < p.x + p.w && Math.abs(feet - p.y) < 8 && !p.isFloor);
        if (!pl) return null;
        if (nav.dropPl !== pl) { nav.dropPl = pl; nav.dropSide = t.cx() < pl.x + pl.w / 2 ? -1 : 1; }
        return { x: nav.dropSide < 0 ? pl.x - h.w - 20 : pl.x + pl.w + h.w + 20, y: null, drop: true };
      }
      function installNav(h) {
        if (h.__ltNav) return;
        h.__ltNav = true;
        const inner = h.update;
        const nav = { lastX: h.x, stuck: 0, backoff: 0, dir: 1, dropPl: null, dropSide: 1 };
        // Optional foes (cache guards, side-portal elites) don't gate the exit;
        // chasing one into a cache tunnel is how he got lost. Fight them only up close.
        const baseInvalid = h._isInvalidAITarget;
        h._isInvalidAITarget = function (c) {
          if (baseInvalid.call(this, c)) return true;
          return typeof _exploreOptionalFoe === 'function' && _exploreOptionalFoe(c) &&
            Math.hypot(c.cx() - this.cx(), c.cy() - this.cy()) > 220;
        };
        h.update = function () {
          if (!this.target || this.target.health <= 0) { try { this._acquireAITarget(); } catch (e) {} }
          const free = !activeCinematic && !isCinematic;
          let wp = free ? (this.target ? dropEdge(this, nav) : waypoint(this)) : null;
          if (!wp) { if (this.onGround) nav.dropPl = null; T.aiFrames++; return inner.apply(this, arguments); }
          if (wp.drop) T.dropFrames++; else T.navFrames++;
          const dx = wp.x - this.cx();
          if (nav.backoff > 0) nav.backoff--;
          else nav.dir = Math.sign(dx) || 1;
          if (Math.abs(this.x - nav.lastX) < 0.6 && Math.abs(dx) > 20) nav.stuck++; else nav.stuck = Math.max(0, nav.stuck - 2);
          nav.lastX = this.x;
          // A drop edge behind an arena-lock wall: try the other side.
          if (wp.drop && nav.stuck > 30) { nav.dropSide = -nav.dropSide; nav.stuck = 0; }
          const spd = 5.2 * (this.classSpeedMult || 1);
          this.vx = Math.abs(dx) > 14 || nav.backoff > 0 ? nav.dir * spd : this.vx * 0.5;
          this.facing = nav.dir;
          const wantUp = !wp.drop && wp.y != null && wp.y < this.cy() - 70 && Math.abs(dx) < 140;
          // Jump floor gaps (cache shafts dead-end in tunnels a walker can't leave).
          let gap = false;
          if (!wp.drop && this.onGround && Math.abs(dx) > 80) {
            const feet = this.y + this.h, probe = this.cx() + nav.dir * 70;
            const pls = (currentArena && currentArena.platforms) || [];
            gap = !pls.some(p => !p.isFloorDisabled && probe >= p.x && probe <= p.x + p.w && p.y >= feet - 12 && p.y <= feet + 60);
          }
          const jump = !wp.drop && (nav.stuck > 12 || wantUp || gap);
          if (this.onGround && jump) {
            this.vy = -17; this.canDoubleJump = true; this.onGround = false;
          } else if (!this.onGround && this.canDoubleJump && this.vy > -1 && jump) {
            this.vy = -13; this.canDoubleJump = false;
          }
          if (nav.stuck > 240) { nav.backoff = 70; nav.dir = -nav.dir; nav.stuck = 0; }
          return inner.apply(this, arguments);
        };
      }

      // Per-frame sampler, separate rAF so it survives gameLoop restarts.
      const isMatchHost = h => h && players.includes(h);
      function tick() {
        if (T.result) return;
        requestAnimationFrame(tick);
        T.frames++;
        try {
          // Advance mid-chapter dialogue. Only the story dialogue panel: a generic
          // "Fight!" click elsewhere starts the home-screen Fight Ladder.
          if (T.frames % 30 === 0) {
            const panel = document.getElementById('storyDialoguePanel');
            const btn = document.getElementById('storyDialogueFightBtn');
            if (panel && btn && panel.offsetParent !== null && btn.offsetParent !== null && !btn.disabled) btn.click();
          }
          if ((typeof ladderActive !== 'undefined' && ladderActive) || (typeof tutorialActive !== 'undefined' && tutorialActive)) {
            T.result = 'CRASH'; T.note = 'harness: the first-run ladder took over the match'; return;
          }
          if (typeof gameRunning === 'undefined' || !gameRunning || !Array.isArray(players)) return;
          if (!SovereignControl.active || !isMatchHost(SovereignControl._host)) {
            SovereignControl.active = false; SovereignControl._host = null;
            if (!SovereignControl.engage()) { T.engageFails++; return; }
          }
          const h = SovereignControl._host;
          installNav(h);
          if (T.livesStart == null) { T.livesStart = h.lives; T.weapon = h.weaponKey; T.cls = h.charClass; }
          T.maxHp = Math.max(T.maxHp, h.maxHealth || 0);
          if (T.hp != null) {
            const d = T.hp - h.health;
            if (d > 0) { T.dmgTaken += d; progress(); } else if (d < 0 && h.health < h.maxHealth) T.healed -= d;
          }
          if (T.lives != null && h.lives < T.lives) {
            T.deaths += T.lives - h.lives; progress();
            if (T.lastY > (typeof GAME_H !== 'undefined' ? GAME_H : 520) + 60) T.falls++;
          }
          T.lastY = h.y;
          T.hp = h.health; T.lives = h.lives;
          const pct = h.maxHealth ? h.health / h.maxHealth : 1;
          if (h.health > 0) T.minHpPct = Math.min(T.minHpPct, pct);
          if (pct < 0.25 && h.health > 0) T.lowHpFrames++;
          if (h.x > T.maxX + 40) { T.maxX = h.x; progress(); }
          if (activeCinematic || isCinematic) progress();
          if (performance.now() - T.lastProgress > stallS * 1000) {
            snap(); T.result = 'STALL';
            const tg = h.target;
            T.note = `no progress ${stallS}s at x=${Math.round(h.x)} y=${Math.round(h.y)}` +
              (tg ? `, target ${tg.name || 'enemy'} at x=${Math.round(tg.x)} y=${Math.round(tg.y)}` : ', no target (navigator)');
          }
        } catch (e) { T.note = 'sampler: ' + e.message; }
      }
      requestAnimationFrame(tick);

      if (typeof SovQTE !== 'undefined') SovQTE.enable();
      _activeStory2Chapter = ch;
      _seenNarrativeIds.add(ch.id);
      _launchChapterWithGauntlet(ch);
      return 'ok';
    }, ch.id, DIFFICULTY, STALL_S);
    if (launched !== 'ok') return { result: 'CRASH', note: 'launch: ' + launched };

    const deadline = Date.now() + TIMEOUT_S * 1000;
    let T = null;
    let tickN = 0;
    while (Date.now() < deadline) {
      await sleep(1000);
      if (SHOTS_S && ++tickN % SHOTS_S === 0) {
        await page.screenshot({ path: path.join(OUT, `ch${ch.id}-a${attempt + 1}-t${tickN}.png`) }).catch(() => {});
        const dbg = await page.evaluate(() => { const h = SovereignControl._host; const t = h && h.target;
          return h ? { x: Math.round(h.x), y: Math.round(h.y), target: t ? { name: t.name, x: Math.round(t.x), y: Math.round(t.y), hp: Math.round(t.health), godmode: !!t.godmode, inv: t.invincible } : null,
            lock: typeof exploreArenaLock !== 'undefined' ? !!exploreArenaLock : null, onGround: h.onGround, vy: +h.vy.toFixed(1), feet: Math.round(h.y + h.h), sinceDealt: Math.round((performance.now() - window.__lt.lastDealt) / 1000), plats: (currentArena.platforms || []).filter(p => p.x < h.x + 300 && p.x + p.w > h.x - 300 && p.y < 500).map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.w), p.passUnder ? 'pu' : '', p.isFloor ? 'floor' : '']), cin: !!activeCinematic, isCin: !!isCinematic } : null; }).catch(() => null);
        console.log(`[lt]   t${tickN} ch ${ch.id}`, JSON.stringify(dbg));
      }
      T = await page.evaluate(() => window.__lt &&
        Object.assign({}, window.__lt, { seconds: Math.round((performance.now() - window.__lt.startT) / 1000) })).catch(() => null);
      if (!T) break;
      if (T.result) break;
      if (errors.length > bootErrs) { T.result = 'CRASH'; T.note = errors[errors.length - 1].slice(0, 300); break; }
    }
    if (!T) return { result: 'CRASH', note: 'page detached (reload?)' };
    if (T.result !== 'WIN') {
      T.shot = `ch${ch.id}-a${attempt + 1}-${T.result || 'TIMEOUT'}.png`;
      await page.screenshot({ path: path.join(OUT, T.shot) }).catch(() => { T.shot = null; });
    }
    if (!T.result) { T.result = 'TIMEOUT'; T.note = `still running after ${TIMEOUT_S}s`; }
    if (T.livesStart == null) T.note += ' (Sovereign never took control)';
    T.errors = errors.slice(bootErrs, bootErrs + 5).concat(consoleErrors.slice(bootConsole, bootConsole + 3).map(e => 'console.error: ' + e.slice(0, 200)));
    return T;
  } catch (e) {
    return { result: 'CRASH', note: e.message };
  } finally {
    await ctx.close().catch(() => {});
  }
}

// ---- scoring ----
function summarize(ch, atts) {
  const n = atts.length;
  const wins = atts.filter(a => a.result === 'WIN');
  const counted = atts.filter(a => ['WIN', 'LOSS'].includes(a.result));
  const winRate = counted.length ? wins.length / counted.length : null;
  const budget = a => Math.max(1, (a.maxHp || 100) * Math.max(1, a.livesStart || 1));
  const strain = wins.length ? wins.reduce((s, a) => s + Math.min(1, a.dmgTaken / budget(a)), 0) / wins.length : null;
  let score = null, label;
  if (!counted.length) label = atts.every(a => a.result === 'STALL') ? 'Stuck' : atts.some(a => a.result === 'CRASH') ? 'Crashed' : 'Inconclusive';
  else if (!wins.length) { score = 100; label = 'Never cleared'; }
  else {
    score = Math.round(100 * (0.5 * (1 - winRate) + 0.5 * strain));
    label = score < 20 ? 'Trivial' : score < 40 ? 'Easy' : score < 60 ? 'Fair' : score < 80 ? 'Hard' : 'Brutal';
  }
  const avg = (xs, f) => xs.length ? +(xs.reduce((s, a) => s + f(a), 0) / xs.length).toFixed(1) : null;
  return {
    id: ch.id, title: ch.title, type: ch.walkFight ? 'walkFight' : ch.type, boss: ch.boss,
    attempts: n, wins: wins.length, winRate, score, label,
    strainOnWins: strain == null ? null : +strain.toFixed(2),
    deathsOnWins: avg(wins, a => a.deaths), dmgTakenOnWins: avg(wins, a => a.dmgTaken),
    minHpPctOnWins: avg(wins, a => a.minHpPct * 100), secondsOnWins: avg(wins, a => a.seconds),
    walkerPct: avg(atts, a => 100 * a.navFrames / Math.max(1, a.navFrames + a.aiFrames + a.dropFrames)),
    dropAssistPct: avg(atts, a => 100 * a.dropFrames / Math.max(1, a.navFrames + a.aiFrames + a.dropFrames)),
    outcomes: atts.map(a => a.result), notes: [...new Set(atts.map(a => a.note).filter(Boolean))],
    errors: [...new Set(atts.flatMap(a => a.errors || []))].slice(0, 3),
    raw: atts.map(a => { const { completed, hp, lives, lastProgress, startT, snap, lastY, ...k } = a; return k; }),
  };
}

function flagSpikes(rows) {
  const scored = rows.filter(r => r.score != null);
  scored.forEach((r, i) => {
    const prev = scored.slice(Math.max(0, i - 5), i).map(x => x.score).sort((a, b) => a - b);
    if (prev.length >= 3) {
      const med = prev[Math.floor(prev.length / 2)];
      if (r.score - med >= 25) r.spike = `+${r.score - med} over the previous chapters' median ${med}`;
    }
  });
}

function writeReport(rows) {
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ difficulty: DIFFICULTY, attempts: ATTEMPTS, rows }, null, 2));
  const color = r => r.score == null ? 'var(--muted)' : r.score >= 100 ? 'var(--bad)' : r.score >= 60 ? 'var(--warn)' : 'var(--ok)';
  const W = 900, H = 160, played = rows.filter(r => !r.skip);
  const bw = played.length ? W / played.length : W;
  const bars = played.map((r, i) => {
    const h = r.score == null ? 6 : Math.max(2, r.score / 100 * H);
    return `<rect x="${(i * bw).toFixed(1)}" y="${H - h}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${h}" fill="${color(r)}"><title>ch ${r.id} ${esc(r.title)}: ${r.label}${r.score != null ? ' ' + r.score : ''}</title></rect>`;
  }).join('');
  const tr = rows.map(r => r.skip
    ? `<tr class="skip"><td>${r.id}</td><td>${esc(r.title)}</td><td colspan="7">skipped: ${esc(r.skip)}</td></tr>`
    : `<tr><td>${r.id}</td><td>${esc(r.title)}<div class="sub">${esc(r.type)}${r.boss ? ' · boss' : ''}</div></td>
       <td><b style="color:${color(r)}">${r.score ?? '—'}</b> ${esc(r.label)}${r.spike ? `<div class="sub warn">spike ${esc(r.spike)}</div>` : ''}</td>
       <td>${r.wins}/${r.attempts}</td><td>${r.outcomes.join(' ')}</td>
       <td>${r.deathsOnWins ?? '—'}</td><td>${r.minHpPctOnWins ?? '—'}%</td><td>${r.secondsOnWins ?? '—'}s</td>
       <td class="sub">${esc(r.notes.join('; '))}${r.errors.length ? '<br><span class="bad">' + esc(r.errors.join(' | ')) + '</span>' : ''}</td></tr>`).join('');
  const count = k => played.filter(r => r.label === k).length;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Level Test Report</title><style>
:root{--bg:#fafaf8;--fg:#1d1d1b;--muted:#8a8a85;--line:#e4e4df;--ok:#2f8f5b;--warn:#c98a12;--bad:#c2412d}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--fg:#ecebe6;--muted:#8d8c86;--line:#2c2c2a;--ok:#4fbf83;--warn:#e0a83a;--bad:#e2654f}}
body{background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;margin:0;padding:24px 16px;max-width:1200px;margin:auto}
h1{font-size:20px;margin:0 0 4px}.sub{color:var(--muted);font-size:12px}.warn{color:var(--warn)}.bad{color:var(--bad)}
svg{width:100%;height:auto;border-bottom:1px solid var(--line);margin:16px 0}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:900px}td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{font-size:12px;color:var(--muted);font-weight:600}tr.skip td{color:var(--muted);font-size:12px}
</style></head><body>
<h1>Sovereign level test</h1>
<div class="sub">${esc(STAMP)} · difficulty ${esc(DIFFICULTY)} · ${ATTEMPTS} attempt(s) per chapter · ${played.length} chapters played, ${rows.length - played.length} skipped</div>
<p>Never cleared ${count('Never cleared')} · Stuck ${count('Stuck')} · Crashed ${count('Crashed')} · Brutal ${count('Brutal')} · Hard ${count('Hard')} · Fair ${count('Fair')} · Easy ${count('Easy')} · Trivial ${count('Trivial')}</p>
<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg>
<p class="sub">Score = half loss rate, half share of total health (max HP × lives) a win cost. "Stuck" means Sovereign or the walker couldn't find the way — check it by hand before calling the level broken.</p>
<div class="wrap"><table><tr><th>id</th><th>chapter</th><th>difficulty</th><th>wins</th><th>outcomes</th><th>deaths on wins</th><th>lowest HP on wins</th><th>time on wins</th><th>notes</th></tr>${tr}</table></div>
</body></html>`;
  fs.writeFileSync(path.join(OUT, 'report.html'), html);
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---- main ----
(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); } catch { puppeteer = require('puppeteer'); }
  const server = await startServer();
  const launchOpts = { headless: HEADFUL ? false : 'new', protocolTimeout: 180000,
    args: ['--no-sandbox', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] };
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(sysChrome)) launchOpts.executablePath = sysChrome;
  const browser = await puppeteer.launch(launchOpts);

  const all = await readChapters(browser);
  const misaligned = all.filter(c => c.id !== c.idx);
  if (misaligned.length) console.warn(`[lt] ${misaligned.length} chapters have id != index; using id`);
  const pick = parseChapters(args.chapters, all.length - 1);
  const chapters = pick ? all.filter(c => pick.includes(c.id)) : all;
  console.log(`[lt] ${chapters.length} chapters × ${ATTEMPTS} attempts · ${DIFFICULTY} · ${PARALLEL} parallel · out ${OUT}`);

  const jobs = [];
  const rows = new Map();
  for (const ch of chapters) {
    const skip = skipReason(ch);
    if (skip) { rows.set(ch.id, { id: ch.id, title: ch.title, skip }); continue; }
    for (let a = 0; a < ATTEMPTS; a++) jobs.push({ ch, a });
  }
  const results = new Map();
  let done = 0;
  async function worker() {
    while (jobs.length) {
      const { ch, a } = jobs.shift();
      const r = await runAttempt(browser, ch, a);
      done++;
      if (!results.has(ch.id)) results.set(ch.id, []);
      results.get(ch.id).push(r);
      console.log(`[lt] ${done} · ch ${ch.id} ${ch.title} #${a + 1}: ${r.result}${r.note ? ' — ' + r.note : ''}` +
        (r.livesStart != null ? ` (${r.cls}/${r.weapon}, deaths ${r.deaths}/${r.livesStart}, dmg taken ${Math.round(r.dmgTaken)}` +
          ` dealt ${Math.round(r.dmgDealt)}, falls ${r.falls}, hurt by ${JSON.stringify(Object.fromEntries(Object.entries(r.hurtBy || {}).map(([k, v]) => [k, Math.round(v)])))}, furthest x ${Math.round(r.maxX)}, walker ${Math.round(100 * r.navFrames / Math.max(1, r.navFrames + r.aiFrames + r.dropFrames))}%, drop assist ${Math.round(100 * r.dropFrames / Math.max(1, r.navFrames + r.aiFrames + r.dropFrames))}%, ${r.seconds}s)` : ''));
      if (results.get(ch.id).length === ATTEMPTS) {
        rows.set(ch.id, summarize(ch, results.get(ch.id)));
        const ordered = chapters.map(c => rows.get(c.id)).filter(Boolean);
        flagSpikes(ordered.filter(r => !r.skip));
        writeReport(ordered);
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  const ordered = chapters.map(c => rows.get(c.id)).filter(Boolean);
  flagSpikes(ordered.filter(r => !r.skip));
  writeReport(ordered);
  console.log(`[lt] report: ${path.join(OUT, 'report.html')}`);
  await browser.close();
  server.close();
})();
