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
 *   --startup     flat swing startup in frames for all non-boss fighters (0 = pre-Nov 10 behaviour)
 *   --pilot       cascade (default; the scripted F7 Sovereign) or brain (the neural
 *                 net that drives the shipped Sovereign fight, pressing virtual keys)
 *   --ckpt        brain checkpoint for --pilot=brain  (default data/brain/latest.json)
 *   --progress    give the pilot the skill-tree nodes a player could own by each chapter.
 *                 Value = a results.json from an earlier run (its measured EXP per chapter is
 *                 the income), or 'auto' (72 EXP = 6 kills per chapter everywhere). Without it
 *                 every chapter starts on a fresh profile, which understates the player.
 *   --cpretries   after a LOSS, press the real retry button up to N times (Retry from Checkpoint
 *                 when a boss mark is saved, else Restart), as a player would. --timeout covers
 *                 the whole run of tries. Default 0: the first LOSS ends the attempt.
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
// --startup=N: flat swing startup for every non-boss fighter (SIM_SWING_STARTUP); 0 = hits land on frame 1 as before Nov 10.
const STARTUP    = args.startup != null ? parseInt(args.startup, 10) : null;
const CP_RETRIES = parseInt(args.cpretries, 10) || 0;
const PILOT      = args.pilot === 'brain' ? 'brain' : 'cascade';

// --progress: skill nodes bought greedily in this order (prerequisites first) from the EXP a
// player earns in chapters before this one. Weapon mastery nodes are a separate track, left out.
const SKILL_COST = { highJump1: 25, highJump2: 45, doubleJump: 80, fastFall: 55, heavyHit1: 25, heavyHit2: 45,
  weaponAbility: 80, comboExtender: 100, criticalEdge: 140, impactShield: 60, tankier1: 25, tankier2: 45,
  superMeter: 80, tankier3: 70, dimensionalPatch: 50, voidStep: 85, fastMove1: 20, fastMove2: 40, fastMove3: 75,
  fractureSurge: 75, lastStrike: 60, echoRage: 110, mirrorFracture: 90, temporalBreak: 180, masterRoot: 100,
  fragmentHunger: 130, architects: 160, coreCollapse: 350 };
const SKILL_ORDER = ['tankier1', 'heavyHit1', 'highJump1', 'highJump2', 'doubleJump', 'tankier2', 'heavyHit2',
  'fastMove1', 'impactShield', 'tankier3', 'superMeter', 'weaponAbility', 'fastMove2', 'lastStrike',
  'dimensionalPatch', 'comboExtender', 'fastFall', 'criticalEdge', 'echoRage', 'masterRoot', 'fastMove3',
  'voidStep', 'fractureSurge', 'mirrorFracture', 'temporalBreak', 'fragmentHunger', 'architects', 'coreCollapse'];
const EXP_DEFAULT = 72;
const expTable = (() => {
  if (!args.progress || args.progress === true || args.progress === 'auto') return {};
  const rows = JSON.parse(fs.readFileSync(args.progress, 'utf8')).rows || [];
  const t = {};
  for (const r of rows) if (r.expOnWins != null) t[r.id] = r.expOnWins;
  return t;
})();
function progressTree(id) {
  if (!args.progress) return null;
  let exp = 0;
  for (let i = 0; i < id; i++) exp += expTable[i] != null ? expTable[i] : EXP_DEFAULT;
  const sk = {};
  for (const k of SKILL_ORDER) { if (SKILL_COST[k] > exp) break; sk[k] = true; exp -= SKILL_COST[k]; }
  return sk;
}
const CKPT       = String(args.ckpt || 'data/brain/latest.json');
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
  if (STARTUP != null) await page.evaluate(n => { window.SIM_SWING_STARTUP = n; }, STARTUP);
  await sleep(400);
  return { ctx, page, errors, consoleErrors };
}

async function readChapters(browser) {
  const { ctx, page } = await bootPage(browser);
  const list = await page.evaluate(() => STORY_CHAPTERS2.map((c, i) => ({
    idx: i, id: c.id, title: c.title || '', type: c.type || 'fight',
    noFight: !!c.noFight, walkFight: !!c.walkFight, hasBeat: !!c.beat,
    cinematicRun: typeof isStoryCinematicRunStart === 'function' && isStoryCinematicRunStart(c.id),
    boss: !!(c.isBossFight || c.isTrueFormFight || c.isSovereignFight || c.isGodFight || c.isAbsoluteAxiomFight),
    exploreMode: c.exploreMode || c.mode || null,
  })));
  await ctx.close();
  return list;
}

function skipReason(ch) {
  if (ch.type === 'branch' && !ch.hasBeat) return 'branch choice';
  if (ch.noFight) return 'narrative only';
  if (ch.cinematicRun && !ch.hasBeat) return 'cinematic run';
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
    const launched = await page.evaluate((id, diff, stallS, pilot, ckpt, skills) => {
      const T = window.__lt = {
        result: null, note: '', frames: 0, startT: performance.now(),
        hp: null, lives: null, livesStart: null, maxHp: 0, dmgTaken: 0, healed: 0, deaths: 0,
        dmgDealt: 0, minHpPct: 1, lowHpFrames: 0, maxX: -1e9, lastProgress: performance.now(),
        navFrames: 0, aiFrames: 0, dropFrames: 0, lastDealt: performance.now(), hurtBy: {}, viaDeal: 0, falls: 0, fallSaves: 0, lastY: 0, context: null, weapon: null, cls: null, engageFails: 0, completed: [],
        near: 0, crowdMax: 0, dmgByCrowd: [0, 0, 0, 0], deathCrowd: [],
      };
      _story2.difficulty = diff;
      if (skills) _story2.skillTree = Object.assign({}, _story2.skillTree, skills);
      T.skills = skills ? Object.keys(skills).length : 0; T.expGain = 0;
      const ch = STORY_CHAPTERS2[id];
      if (!ch) return 'no chapter ' + id;
      const progress = () => { T.lastProgress = performance.now(); };

      const wrap = (name, fn) => {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function () { try { fn.apply(this, arguments); } catch (e) {} return orig.apply(this, arguments); };
      };
      wrap('_storyAwardKillExp', n => { T.expGain += n || 0; });
      // Side portals are optional (a fresh shield press beside one), and the pilot guards often enough
      // to enter them by accident: two bonus elites a player chose not to fight. Keep them shut.
      if (typeof _storyEnterSidePortal === 'function') window._storyEnterSidePortal = function () {};
      wrap('_showStory2Victory', c => { if (!T.result) { T.result = 'WIN'; T.note = 'victory screen'; } });
      wrap('_regionCompleteChapter', chId => {
        T.completed.push(chId);
        if (chId === id && !T.result) { T.result = 'WIN'; T.note = 'walked through the exit'; }
      });
      const snap = () => {
        const modes = ['stealthModeActive', 'escapeModeActive', 'defenseModeActive', 'escortModeActive', 'puzzleModeActive', 'scavengeModeActive', 'survivalModeActive']
          .filter(k => { try { return !!eval(k); } catch (e) { return false; } });
        const h = host();
        T.context = { subtitle: (typeof storyFightSubtitle !== 'undefined' && storyFightSubtitle && storyFightSubtitle.text) || '',
          modes, lives: h ? h.lives : null, health: h ? Math.round(h.health) : null,
          enemiesAlive: (typeof minions !== 'undefined' ? minions.filter(m => m.health > 0).length : 0) +
            players.filter(p => p !== h && p.health > 0 && !(typeof areAlliedEntities === 'function' && h && areAlliedEntities(h, p))).length };
        if (typeof damnationActive !== 'undefined' && (damnationActive || damnationAnchors)) T.context.damnation = {
          wave: damnationWave, anchors: damnationAnchors, portal: !!damnationPortalActive,
          orbs: damnationAnchorOrbs.map(o => [Math.round(o.x), Math.round(o.y), o.value]),
          echoes: players.filter(p => p.isEcho).map(p => ({ n: p.name, hp: Math.round(p.health), x: Math.round(p.x), y: Math.round(p.y),
            dead: !!p.isDead, inv: p.invincible, hide: !!p.backstageHiding, tf: !!p.isTrueForm })) };
      };
      T.snap = snap;
      wrap('_showStory2RetryScreen', () => {
        if (T.result) return;
        snap(); T.result = 'LOSS';
        T.note = T.context.lives > 0 ? 'failed with lives left' + (T.context.subtitle ? ': "' + T.context.subtitle + '"' : '') : 'out of lives';
      });

      const BRAIN = pilot === 'brain';
      // function declaration on purpose: snap() above runs later but is defined first.
      function host() {
        if (BRAIN) return Brain.live ? Brain.live.f : null;
        return SovereignControl.active ? SovereignControl._host : null;
      }
      // The brain plays as a non-AI fighter through the real key path. With nothing
      // to fight (or while the walker steers) its keys are let go, or tickLive would
      // aim it at whatever else is alive, allies included.
      if (BRAIN) {
        fetch(ckpt + '?t=' + Date.now()).then(r => r.json()).then(j => { T.ck = j.pi || j; T.ckIter = j.iter || 0; }).catch(e => { T.ckErr = String(e); });
        // The game's own tickLive only accepts an opponent that is in players[];
        // story enemies live in minions[], so the same decision step is run here.
        Brain.tickLive = function () {
          const L = Brain.live;
          if (!L || !L.f || typeof gameRunning === 'undefined' || !gameRunning) return;
          // While the walker pushes a realm block it holds the push direction, as a player would.
          if (L.f.health <= 0 || T.navHold || !L.opp || L.opp.health <= 0) { try { Brain.applyKeys(L.f, [T.pushDir < 0 ? 0 : T.pushDir > 0 ? 2 : 1, 0, 0, 0]); } catch (e) {} return; }
          if (L.t++ % Brain.REPEAT !== 0) return;
          Brain.observe(L.f, L.opp, L.prev, L.obs);
          Brain.sample(Brain.forward(L.net, L.obs, L.h), L.act, true);
          Brain.applyKeys(L.f, L.act);
          for (let k = 0; k < 4; k++) L.prev[k] = L.act[k];
        };
      }
      // endGame() scores a story win as `winner && !winner.isAI`, and possession
      // sets isAI on the player — every possessed win would read as a loss.
      const origEnd = window.endGame;
      window.endGame = function () {
        const h = host();
        if (!h) return origEnd.apply(this, arguments);
        // The brain plays with isAI=false, but endGame's _brainDriven check still refuses it a
        // story win; hide the link for the duration of the call.
        if (BRAIN) {
          const L = Brain.live; L.f = null;
          try { return origEnd.apply(this, arguments); } finally { L.f = h; }
        }
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
      // Story realms (js/smb-realm.js): a closed gate needs its terminal, and the terminal may want an item
      // from a side room. Route from the realm's own data: terminal, else the door to the room holding the
      // item, then the item, then out by the door that comes out nearest the gate. `act` = press F on arrival.
      function realmGateOpen(g) { return realmSave && realmSave.flags['gate_' + g.id]; }
      function realmClosedGates() {
        if (typeof realmActive === 'undefined' || !realmActive || realmHost !== 'story' || !realmSave) return [];
        return _realmStoryGates().filter(g => !realmGateOpen(g));
      }
      // Dungeon route (a realm holding the chapter exit): in a room, fight, then burn, then the next door on the
      // def's route (or the way out after the last room); outside, the entrance into its first room.
      // Also a gate with no terminal: its side rooms open it (the Memory Vault), so walk the rooms.
      function realmDungeonWaypoint(h) {
        if (typeof realmExitBlocker !== 'function' || realmFade !== 0) return null;
        const roomGate = realmClosedGates().some(g => g.termX == null);
        if (!realmExitBlocker() && !roomGate && !(realmRoomKey && REALM_DEFS[realmKey].route)) return null;
        const def = REALM_DEFS[realmKey], save = realmSave;
        if (!realmRoomKey) {
          const first = def.route ? def.route[0] : null;
          const ent = _realmStoryEntrances().find(e => e.room === first && !(e.oneWay && !save.flags['open_' + e.id]));
          return ent ? { x: ent.x, y: null, act: true } : null;
        }
        if (_realmRoomFoesAlive() || _realmCharge) return null;
        const R = def.rooms[realmRoomKey];
        const b = (R.burn || []).find(q => !save.flags['burn_' + q.id]);
        if (b) return { x: b.x, y: null, act: true };
        const pz = realmPuzzleWaypoint(h, R);
        if (pz) return pz;
        const i = (def.route || []).indexOf(realmRoomKey);
        const nextRoom = def.route && def.route[i + 1];
        const d = (R.doors || []).find(q => q.to && (nextRoom ? q.to[0] === nextRoom : q.to[0] === '@main' && q.id !== 'in'));
        if (!d) return null;
        if (d.kind === 'edge') return { x: d.side === 'l' ? -40 : R.w + 40, y: null };
        return { x: d.x, y: null, act: true };
      }
      // Puzzle parts (smb-realm.js _realmPuzzleTick), solved as a player would: shut bars first (push the
      // block onto a latch plate, step on a hold plate and the door waypoint does the run, pull the lever),
      // then cracked walls (swing at them), then levers left to pull.
      function realmPuzzleWaypoint(h, R) {
        for (const b of (R.bars || [])) {
          if (_realmBarOpen(b)) continue;
          const w = b.when || '';
          if (w.indexOf('plate:') === 0) {
            const pt = (R.plates || []).find(q => q.id === w.slice(6));
            if (!pt) continue;
            if (!pt.latch) return { x: pt.x, y: null };
            const blk = (R.blocks || []).map(q => _realmPuzPlat('_realmBlock', q.id)).find(Boolean);
            if (!blk) continue;
            const dir = Math.sign(pt.x - (blk.x + blk.w / 2)) || 1;
            return { x: dir > 0 ? blk.x - h.w / 2 : blk.x + blk.w + h.w / 2, y: null, push: dir };
          }
          if (w.indexOf('lever:') === 0) {
            const l = (R.levers || []).find(q => q.id === w.slice(6));
            if (l) return { x: l.x, y: l.y || null, act: true };
          }
        }
        for (const c of (R.cracks || [])) {
          if (realmSave.flags['broke_' + c.id]) continue;
          const side = h.cx() < c.x ? -1 : 1;
          return { x: c.x + side * 60, y: null, hit: -side };
        }
        const l = (R.levers || []).find(q => !realmSave.flags['lever_' + q.id] && _realmCond(q.when));
        if (l) return { x: l.x, y: l.y || null, act: true };
        return null;
      }
      function realmWaypoint(h) {
        const dw = realmDungeonWaypoint(h);
        if (dw) return dw;
        const gates = realmClosedGates().filter(g => g.termX != null);
        if (!gates.length || realmFade !== 0) return null;
        const g = gates[0], save = realmSave, rooms = REALM_DEFS[realmKey].rooms;
        if (realmRoomKey) {
          const R = rooms[realmRoomKey];
          const item = (R.chests || []).find(c => c.gives === 'item:' + g.needs && !_realmLooted(c.id));
          if (item) return { x: item.x, y: (item.y || REALM_FLOOR_Y) - 20, act: true };
          const ents = _realmStoryEntrances();
          const outs = (R.doors || []).filter(d => d.to && d.to[0] === '@main');
          if (!outs.length) return null;
          const exitX = d => { const e = ents.find(q => q.id === d.to[1]); return e ? Math.abs(e.x - g.termX) : 1e9; };
          const d = outs.reduce((a, b) => exitX(b) < exitX(a) ? b : a);
          return { x: d.x, y: null, act: true };
        }
        if (save.items[g.needs] || (g.setsFlag && !save.flags[g.setsFlag])) return { x: g.termX, y: null, act: true };
        const roomKey = Object.keys(rooms).find(k => (rooms[k].chests || []).some(c => c.gives === 'item:' + g.needs));
        const ent = _realmStoryEntrances().find(e => e.room === roomKey &&
          !(e.needs && !save.flags[e.needs]) && !(e.oneWay && !save.flags['open_' + e.id]));
        return ent ? { x: ent.x, y: null, act: true } : null;
      }
      // A foe on the far side of a closed gate can't be reached; chasing it pins the pilot to the door.
      function behindGate(me, c) {
        return realmClosedGates().some(g => (c.cx() > g.x) !== (me.cx() > g.x));
      }
      function waypoint(h) {
        const rw = realmWaypoint(h);
        if (rw) return rw;
        if (typeof puzzleModeActive !== 'undefined' && puzzleModeActive && puzzleSwitches[puzzleStep])
          return puzzleSwitches[puzzleStep];
        if (typeof damnationActive !== 'undefined' && damnationActive) {
          if (damnationPortalActive && damnationPortal) return damnationPortal;
          if (damnationAnchorOrbs.length) return damnationAnchorOrbs[0];
        }
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
      // A waypoint (scavenge item, switch) below him is the same problem with no wait:
      // pass `pt` = {x, y} with y as the point's centre.
      function dropEdge(h, nav, pt) {
        const t = pt ? { cx: () => pt.x, y: pt.y - h.h / 2 } : h.target;
        // Finish a fall once started: steering back at a point behind him lands him on the ledge again.
        if (!h.onGround && nav.dropWp) return nav.dropWp;
        nav.dropWp = null;
        if (!t || !h.onGround || t.y - h.y < 120) return null;
        if (!pt && performance.now() - T.lastDealt < 5000) return null;
        const pls = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
        const feet = h.y + h.h;
        const pl = pls.find(p => h.x + h.w > p.x && h.x < p.x + p.w && Math.abs(feet - p.y) < 8 && !p.isFloor);
        if (!pl) return null;
        if (nav.dropPl !== pl) { nav.dropPl = pl; nav.dropSide = t.cx() < pl.x + pl.w / 2 ? -1 : 1; }
        return nav.dropWp = { x: nav.dropSide < 0 ? pl.x - h.w - 20 : pl.x + pl.w + h.w + 20, y: null, drop: true };
      }
      // Knocked or stepped into a floor gap mid-fight: the pilot never spends its double jump to get
      // back (the game's own FELL OFF tip says to). Do what that tip says: double jump, drift to the
      // nearest surface above the drop.
      function recoverFall(f) {
        if (f.onGround || !f.canDoubleJump || f.vy <= 1) return;
        const feet = f.y + f.h, pls = (currentArena && currentArena.platforms) || [];
        const live = pls.filter(p => !p.isFloorDisabled);
        if (live.some(p => f.cx() >= p.x - 10 && f.cx() <= p.x + p.w + 10 && p.y >= feet - 4 && p.y <= feet + 220)) return;
        let best = null, bd = Infinity;
        for (const p of live) {
          if (p.y < feet - 160 || p.y > feet + 40) continue;
          const ex = Math.max(p.x + 12, Math.min(p.x + p.w - 12, f.cx()));
          const d = Math.abs(ex - f.cx());
          if (d < bd) { bd = d; best = ex; }
        }
        if (best == null) return;
        f.vy = -13; f.canDoubleJump = false;
        f.vx = Math.sign(best - f.cx()) * Math.max(Math.abs(f.vx), 5);
        T.fallSaves = (T.fallSaves || 0) + 1;
      }
      function installNav(h) {
        if (h.__ltNav) return;
        h.__ltNav = true;
        const inner = h.update;
        const nav = { lastX: h.x, stuck: 0, backoff: 0, dir: 1, dropPl: null, dropSide: 1 };
        // Optional foes (cache guards, side-portal elites) don't gate the exit;
        // chasing one into a cache tunnel is how he got lost. Fight them only up close.
        const farOptional = (me, c) => (typeof _exploreOptionalFoe === 'function' && _exploreOptionalFoe(c) &&
          Math.hypot(c.cx() - me.cx(), c.cy() - me.cy()) > 220) || behindGate(me, c);
        if (!BRAIN) {
          const baseInvalid = h._isInvalidAITarget;
          h._isInvalidAITarget = function (c) { return baseInvalid.call(this, c) || farOptional(this, c); };
        }
        h.update = function () {
          if (BRAIN) {
            // Nearest living hostile is the brain's opponent this frame.
            let best = null, bd = Infinity;
            for (const c of Brain.hostilesOf(this)) {
              if (c.godmode || farOptional(this, c)) continue;
              const d = Math.abs(c.cx() - this.cx()) + Math.abs(c.cy() - this.cy());
              if (d < bd) { bd = d; best = c; }
            }
            this.target = best;
            if (Brain.live && Brain.live.f === this) Brain.live.opp = best;
          } else if (!this.target || this.target.health <= 0) { try { this._acquireAITarget(); } catch (e) {} }
          const free = !activeCinematic && !isCinematic;
          let wp = null;
          if (free && this.target) wp = dropEdge(this, nav);
          else if (free) { wp = waypoint(this); if (wp && wp.y != null) wp = dropEdge(this, nav, wp) || wp; }
          T.navHold = !!wp;
          if (!wp) {
            if (T.pushDir && !BRAIN) { keysDown.delete(this.controls.left); keysDown.delete(this.controls.right); }
            T.pushDir = 0;
            if (this.onGround) nav.dropPl = null;
            T.aiFrames++;
            recoverFall(this);
            return inner.apply(this, arguments);
          }
          if (wp.drop) T.dropFrames++; else T.navFrames++;
          const dx = wp.x - this.cx();
          // Realm stop (door, terminal, item): press F through the real key handler once it is in reach.
          if (wp.act && Math.abs(dx) < 30 && this.onGround && typeof _realmNear !== 'undefined' && _realmNear &&
              T.frames - (T.realmPressF || 0) > 40) {
            T.realmPressF = T.frames;
            T.realmPresses = (T.realmPresses || 0) + 1;
            setTimeout(() => { try { if (realmSave) T.realmFlags = Object.keys(realmSave.flags).concat(Object.keys(realmSave.items)).join('+'); } catch (e) {} }, 50);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true }));
          }
          // Realm block: lean into it with the direction key held (the block reads keys, not velocity).
          T.pushDir = wp.push && Math.abs(dx) < 40 && this.onGround ? wp.push : 0;
          const pushKey = wp.push > 0 ? this.controls.right : this.controls.left;
          if (!BRAIN) {
            keysDown.delete(this.controls.left); keysDown.delete(this.controls.right);
            if (T.pushDir) keysDown.add(pushKey);
          }
          if (T.pushDir) { this.vx = wp.push * 5.2; this.facing = wp.push; return inner.apply(this, arguments); }
          // Cracked wall: face it and swing.
          if (wp.hit && Math.abs(dx) < 16 && this.onGround) {
            this.facing = wp.hit; this.vx = 0;
            if (!this.cooldown && !this.attackTimer) { try { this.attack(null); } catch (e) {} }
            return inner.apply(this, arguments);
          }
          if (nav.backoff > 0) nav.backoff--;
          else nav.dir = Math.sign(dx) || 1;
          if (Math.abs(this.x - nav.lastX) < 0.6 && Math.abs(dx) > 20) nav.stuck++; else nav.stuck = Math.max(0, nav.stuck - 2);
          nav.lastX = this.x;
          // A drop edge behind an arena-lock wall: try the other side.
          if (wp.drop && nav.stuck > 30) { nav.dropSide = -nav.dropSide; nav.stuck = 0; }
          const spd = 5.2 * (this.classSpeedMult || 1);
          this.vx = Math.abs(dx) > 14 || nav.backoff > 0 ? nav.dir * spd : this.vx * 0.5;
          this.facing = nav.dir;
          // Pickups take |dy| < 60 (updateScavengeMode); one at y 330 is 68 px over a floored
          // fighter's centre, so hop for anything above that window, as a player would.
          const wantUp = !wp.drop && wp.y != null && wp.y < this.cy() - 50 && Math.abs(dx) < 140;
          // Jump floor gaps (cache shafts dead-end in tunnels a walker can't leave).
          let gap = false;
          if (!wp.drop && this.onGround && Math.abs(dx) > 80) {
            const feet = this.y + this.h, probe = this.cx() + nav.dir * 70;
            const pls = (currentArena && currentArena.platforms) || [];
            gap = !pls.some(p => !p.isFloorDisabled && probe >= p.x && probe <= p.x + p.w && p.y >= feet - 12 && p.y <= feet + 60);
          }
          // Falling with nothing below: spend the double jump, as a player crossing a void gap would.
          if (!wp.drop && !this.onGround && this.vy > 1) {
            const feet = this.y + this.h, pls = (currentArena && currentArena.platforms) || [];
            gap = !pls.some(p => !p.isFloorDisabled && this.cx() >= p.x - 10 && this.cx() <= p.x + p.w + 10 && p.y >= feet - 4 && p.y <= feet + 220);
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
          if (BRAIN) {
            if (!Brain.live || !isMatchHost(Brain.live.f)) {
              const f = T.ck && SovereignControl._pickHost();
              if (!f || f.health <= 0 || !Brain.possess(f, T.ck, null)) { T.engageFails++; return; }
              Brain.live.greedy = true;
            }
          } else if (!SovereignControl.active || !isMatchHost(SovereignControl._host)) {
            SovereignControl.active = false; SovereignControl._host = null;
            if (!SovereignControl.engage()) { T.engageFails++; return; }
          }
          const h = host();
          installNav(h);
          const cpBoss = typeof _storyBossCpTarget === 'function' && _storyBossCpTarget();
          if (cpBoss && cpBoss.maxHealth && cpBoss._cpStocks !== undefined) T.minBossFrac = Math.min(T.minBossFrac == null ? 1 : T.minBossFrac, _storyBossCpFrac(cpBoss));
          if (T.livesStart == null) { T.livesStart = h.lives; T.weapon = h.weaponKey; T.cls = h.charClass; }
          T.maxHp = Math.max(T.maxHp, h.maxHealth || 0);
          // Crowd pressure: hostiles alive within 220 px. Damage and deaths are bucketed by it
          // (0, 1, 2, 3+) so a chapter's losses read as "too strong" or "too many at once".
          if (T.frames % 6 === 0) {
            const foes = (typeof minions !== 'undefined' ? minions : []).concat(players)
              .filter(e => e && e !== h && e.health > 0 && !(typeof areAlliedEntities === 'function' && areAlliedEntities(h, e)));
            T.near = foes.filter(e => Math.abs(e.cx() - h.cx()) < 220 && Math.abs(e.cy() - h.cy()) < 160).length;
            T.crowdMax = Math.max(T.crowdMax, T.near);
          }
          if (T.hp != null) {
            const d = T.hp - h.health;
            if (d > 0) { T.dmgTaken += d; T.dmgByCrowd[Math.min(3, T.near)] += d; progress(); } else if (d < 0 && h.health < h.maxHealth) T.healed -= d;
          }
          if (T.lives != null && h.lives < T.lives) {
            T.deathCrowd.push(T.near);
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
      T.retryLog = [];
      T.pressRetry = () => {
        const cp = document.getElementById('_retryCheckpointBtn');
        const btn = cp || document.getElementById('_retryChapterBtn');
        if (!btn) return null;
        const row = { via: cp ? 'checkpoint' : 'restart', mark: typeof _storyBossCp !== 'undefined' && _storyBossCp ? _storyBossCp.frac : null,
          lowest: T.minBossFrac == null ? null : +T.minBossFrac.toFixed(3), sec: Math.round((performance.now() - T.startT) / 1000) };
        T.retryLog.push(row);
        T.minBossFrac = null; T.hp = null; T.lives = null; T.note = ''; T.result = null; progress();
        btn.click();
        requestAnimationFrame(tick);
        return row;
      };

      if (typeof SovQTE !== 'undefined') SovQTE.enable();
      _activeStory2Chapter = ch;
      _seenNarrativeIds.add(ch.id);
      // A branch chapter's playable beat: win = the beat's continuation fires.
      if (ch.beat && typeof _playChapterBeat === 'function') _playChapterBeat(ch, () => { if (!T.result) { T.result = 'WIN'; T.note = 'beat cleared'; } });
      else _launchChapterWithGauntlet(ch);
      return 'ok';
    }, ch.id, DIFFICULTY, STALL_S, PILOT, CKPT, progressTree(ch.id));
    if (launched !== 'ok') return { result: 'CRASH', note: 'launch: ' + launched };

    const deadline = Date.now() + TIMEOUT_S * 1000;
    let T = null;
    let tickN = 0, retriesUsed = 0;
    while (Date.now() < deadline) {
      await sleep(1000);
      if (SHOTS_S && ++tickN % SHOTS_S === 0) {
        await page.screenshot({ path: path.join(OUT, `ch${ch.id}-a${attempt + 1}-t${tickN}.png`) }).catch(() => {});
        const dbg = await page.evaluate(() => { const h = (typeof Brain !== 'undefined' && Brain.live && Brain.live.f) || SovereignControl._host; const t = h && h.target;
          return h ? { brain: (typeof Brain !== 'undefined' && Brain.live) ? { act: Array.from(Brain.live.act), t: Brain.live.t, opp: !!Brain.live.opp, hold: !!window.__lt.navHold, isAI: h.isAI, keys: [...keysDown].filter(k => String(k).startsWith('brain')), ctl: h.controls && h.controls.left } : undefined, x: Math.round(h.x), y: Math.round(h.y), target: t ? { name: t.name, x: Math.round(t.x), y: Math.round(t.y), hp: Math.round(t.health), godmode: !!t.godmode, inv: t.invincible } : null,
            lock: typeof exploreArenaLock !== 'undefined' ? !!exploreArenaLock : null, onGround: h.onGround, vy: +h.vy.toFixed(1), feet: Math.round(h.y + h.h), sinceDealt: Math.round((performance.now() - window.__lt.lastDealt) / 1000), plats: (currentArena.platforms || []).filter(p => p.x < h.x + 300 && p.x + p.w > h.x - 300 && p.y < 500).map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.w), p.passUnder ? 'pu' : '', p.isFloor ? 'floor' : '']), cin: !!activeCinematic, isCin: !!isCinematic } : null; }).catch(() => null);
        console.log(`[lt]   t${tickN} ch ${ch.id}`, JSON.stringify(dbg));
      }
      T = await page.evaluate(() => window.__lt &&
        Object.assign({}, window.__lt, { seconds: Math.round((performance.now() - window.__lt.startT) / 1000) })).catch(() => null);
      if (!T) break;
      if (T.result === 'LOSS' && retriesUsed < CP_RETRIES) {
        await sleep(1500); // the retry screen draws on the next frame
        const row = await page.evaluate(() => window.__lt.pressRetry()).catch(() => null);
        if (row) { retriesUsed++; console.log(`[lt]   ch ${ch.id} retry ${retriesUsed}: ${JSON.stringify(row)}`); continue; }
      }
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
    minHpPctOnWins: avg(wins, a => a.minHpPct * 100), expOnWins: avg(wins, a => a.expGain || 0), skillNodes: atts.length ? atts[0].skills : 0, secondsOnWins: avg(wins, a => a.seconds),
    walkerPct: avg(atts, a => 100 * a.navFrames / Math.max(1, a.navFrames + a.aiFrames + a.dropFrames)),
    dropAssistPct: avg(atts, a => 100 * a.dropFrames / Math.max(1, a.navFrames + a.aiFrames + a.dropFrames)),
    crowdMax: Math.max(0, ...atts.map(a => a.crowdMax || 0)),
    // Share of all damage taken while 3+ hostiles were within reach, and deaths with 3+ near.
    crowdDmgPct: (() => { const t = atts.reduce((s, a) => s + (a.dmgByCrowd || [0]).reduce((x, y) => x + y, 0), 0);
      return t ? Math.round(100 * atts.reduce((s, a) => s + ((a.dmgByCrowd || [])[3] || 0), 0) / t) : null; })(),
    deathsInCrowd: atts.reduce((s, a) => s + (a.deathCrowd || []).filter(n => n >= 3).length, 0),
    deathsTotal: atts.reduce((s, a) => s + (a.deathCrowd || []).length, 0),
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
  let browser = await puppeteer.launch(launchOpts);
  // Chrome dies after ~160 pages in one session; relaunch it and retry the attempt.
  let relaunching = null, sinceLaunch = 0, gen = 0;
  async function relaunch() {
    if (!relaunching) relaunching = (async () => {
      try { await browser.close(); } catch {}
      browser = await puppeteer.launch(launchOpts); sinceLaunch = 0; gen++;
      console.log('[lt] relaunched browser');
    })().finally(() => { relaunching = null; });
    return relaunching;
  }

  const all = await readChapters(browser);
  const misaligned = all.filter(c => c.id !== c.idx);
  if (misaligned.length) console.warn(`[lt] ${misaligned.length} chapters have id != index; using id`);
  const pick = parseChapters(args.chapters, all.length - 1);
  const chapters = pick ? all.filter(c => pick.includes(c.id)) : all;
  console.log(`[lt] ${chapters.length} chapters × ${ATTEMPTS} attempts · ${DIFFICULTY} · pilot ${PILOT}${STARTUP != null ? ' · startup ' + STARTUP : ''} · ${PARALLEL} parallel · out ${OUT}`);

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
      if (relaunching) await relaunching;
      if (++sinceLaunch > 100 && !relaunching) await relaunch();
      const g = gen;
      let r = await runAttempt(browser, ch, a);
      if (r.result === 'CRASH' && (g !== gen || !browser.connected || /Connection closed|detached/.test(r.note || ''))) {
        if (g === gen) await relaunch(); else if (relaunching) await relaunching;
        r = await runAttempt(browser, ch, a);
      }
      done++;
      if (!results.has(ch.id)) results.set(ch.id, []);
      results.get(ch.id).push(r);
      console.log(`[lt] ${done} · ch ${ch.id} ${ch.title} #${a + 1}: ${r.result}${r.note ? ' — ' + r.note : ''}` +
        (r.livesStart != null ? ` (${r.cls}/${r.weapon}, deaths ${r.deaths}/${r.livesStart}, dmg taken ${Math.round(r.dmgTaken)}` +
          ` dealt ${Math.round(r.dmgDealt)}, falls ${r.falls} (saved ${r.fallSaves | 0}), hurt by ${JSON.stringify(Object.fromEntries(Object.entries(r.hurtBy || {}).map(([k, v]) => [k, Math.round(v)])))}, furthest x ${Math.round(r.maxX)}${r.realmPresses ? `, realm F x${r.realmPresses} [${r.realmFlags || ''}]` : ''}, walker ${Math.round(100 * r.navFrames / Math.max(1, r.navFrames + r.aiFrames + r.dropFrames))}%, drop assist ${Math.round(100 * r.dropFrames / Math.max(1, r.navFrames + r.aiFrames + r.dropFrames))}%, ${r.seconds}s)` : ''));
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
