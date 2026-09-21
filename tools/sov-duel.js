'use strict';
/*
 * tools/sov-duel.js — NEW Sovereign vs OLD Sovereign, head to head. DEV ONLY.
 *
 * SMK2Trainer only ever spawns one Sovereign against scripted bots, so it cannot
 * answer "which version wins". This builds the mirror match directly: two real
 * SovereignMK2 instances, same arena, same seed, fighting each other for stocks.
 *
 * HOW THE TWO VERSIONS ARE SEPARATED
 * Every mechanism added on 2026-09-20 is gated on the GLOBAL SMK2_TUNE, so the
 * flags cannot distinguish two instances in one match. Instead the flags are
 * turned ON globally and the OLD fighter has the three entry points stubbed on
 * its own instance:
 *     _gridWantsSuper -> false      (grid-driven super release)
 *     _planTick       -> no-op      (tactical plan layer)
 *     _punisherRead   -> false      (bait-the-punisher veto)
 * Instance properties shadow the prototype, so OLD runs the pre-Sep-20 code path
 * exactly and NEW runs the new one. Nothing in js/ is modified to run this.
 *
 * SIDES ARE SWAPPED EVERY OTHER SEED. Spawn side is worth real stocks in a game
 * with ringouts, and an unswapped mirror measures the stage, not the fighter.
 *
 * Usage:  node tools/sov-duel.js [--seeds=12] [--port=8110] [--frames=7200]
 */
const fs = require('fs'), path = require('path'), http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const SEEDS  = parseInt(args.seeds, 10)  || 12;
const PORT   = parseInt(args.port, 10)   || 8110;
const FRAMES = parseInt(args.frames, 10) || 7200;
// --mirror: both sides identical (no OLD stubs), so the only question is the
// draw rate itself. --noledger additionally disables tacticLedger, which is what
// gates _airApproachGuard — the one LIVE consumer of the asymmetric
// kill-scores-zero pricing. If the stalemates are caused by an approach ledger
// that has been taught going in is worthless, they should fall.
const MIRROR   = !!args.mirror;
const NOLEDGER = !!args.noledger;
const ROOT   = path.resolve(__dirname, '..');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const log = (...a) => console.log('[duel]', ...a);

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
    server.on('error', (e) => { console.error(`[duel] cannot listen on :${PORT} — ${e.code}`); process.exit(1); });
    server.listen(PORT, () => resolve(server));
  });
}

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }

  const server = await startServer();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  page.on('pageerror', e => log('PAGEERR', e.message));
  // domcontentloaded, not networkidle2: the overnight VECTOR run saturates the CPU
  // and "no network activity for 500ms" can take longer than the navigation budget
  // even though the page is fine. The waitForFunction below is the real readiness
  // check — it waits on the globals this harness actually needs.
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => typeof SovereignMK2 !== 'undefined' && typeof SMK2_TUNE !== 'undefined',
    { timeout: 180000 });
  log('game loaded');

  const results = [];
  for (let i = 0; i < SEEDS; i++) {
    const r = await page.evaluate((seed, frames, swap, mirror, noledger) => {
      // ── sim environment (mirrors SMK2Trainer._applySimEnv) ────────────────
      const _noop = () => {};
      currentArena = (typeof ARENAS !== 'undefined' && ARENAS.sovereign) ? ARENAS.sovereign
        : { id: 'sim', bgColor: '#000', platforms: [{ x: 0, y: 460, w: 900, h: 60, isFloor: true }] };
      players.length = 0;
      if (typeof minions !== 'undefined')         minions.length = 0;
      if (typeof projectiles !== 'undefined')     projectiles.length = 0;
      if (typeof damageTexts !== 'undefined')     damageTexts.length = 0;
      if (typeof verletRagdolls !== 'undefined')  verletRagdolls.length = 0;
      hitStopFrames = 0; slowMotion = 1; screenShake = 0;
      isCinematic = false; activeCinematic = null; storyModeActive = false;
      gameRunning = true; gameMode = 'sovereign'; onlineMode = false;
      if (typeof settings !== 'undefined') { settings.finishers = false; settings.dmgNumbers = false; }
      window.spawnParticles = _noop; window.showBossDialogue = _noop;
      if (typeof spawnBullet !== 'undefined')        window.spawnBullet = _noop;
      if (typeof unlockAchievement !== 'undefined')  window.unlockAchievement = _noop;
      if (typeof pickSafeSpawn !== 'undefined')      window.pickSafeSpawn = () => null;
      if (typeof spawnLightningBolt !== 'undefined') window.spawnLightningBolt = _noop;
      if (typeof isCombatLocked !== 'undefined')     window.isCombatLocked = () => false;
      if (typeof isCutsceneActive !== 'undefined')   window.isCutsceneActive = () => false;
      if (typeof SoundManager !== 'undefined') {
        for (const k of Object.keys(SoundManager)) if (typeof SoundManager[k] === 'function') SoundManager[k] = _noop;
      }

      // Both mechanisms live for NEW; OLD has them stubbed per-instance below.
      // In mirror mode every Sep-20 mechanism is off on BOTH sides: the question
      // is the baseline fighter's own stalemate rate, not anything added tonight.
      SMK2_TUNE.superGate = !mirror; SMK2_TUNE.tacticPlans = !mirror; SMK2_TUNE.baitPunisher = !mirror;
      SMK2_TUNE.tacticLedger = !noledger;

      const floor = (currentArena.platforms || []).find(p => p.isFloor) || { x: 0, w: 900, y: 460 };
      const LX = swap ? 650 : 250, RX = swap ? 250 : 650;

      const mk = (x, colour) => {
        const f = new SovereignMK2(x, 380, colour, 'sword');
        f.lives = 5; f.aiDiff = 'hard';
        return f;
      };
      const NEW = mk(LX, '#ff2200');
      const OLD = mk(RX, '#2277ff');
      // Per-instance stubs = the pre-Sep-20 code path, exactly.
      if (!mirror) {
        OLD._gridWantsSuper = () => false;
        OLD._planTick       = () => {};
        OLD._punisherRead   = () => false;
      }
      NEW.name = 'NEW'; OLD.name = 'OLD';
      NEW._teamId = 'new'; OLD._teamId = 'old';
      players.push(NEW, OLD);

      let dmgNewDealt = 0, dmgOldDealt = 0;
      let newDeaths = 0, oldDeaths = 0, newRingouts = 0, oldRingouts = 0;
      let prevNew = NEW.health, prevOld = OLD.health;
      let ran = 0, err = null;

      // A death is a RINGOUT if it happened with the fighter horizontally off the
      // floor span or below it — the distinction the user asked for, and the one
      // that separates "outfought" from "positioned to death".
      const offStage = (f) => (f.cx() < floor.x + 8 || f.cx() > floor.x + floor.w - 8 ||
                               (f.y + f.h) > floor.y + 120);

      for (let fr = 0; fr < frames; fr++) {
        hitStopFrames = 0; slowMotion = 1; aiTick = fr; frameCount = fr; ran = fr + 1;
        NEW.target = OLD.health > 0 ? OLD : null;
        OLD.target = NEW.health > 0 ? NEW : null;
        try { NEW.update(); } catch (e) { if (!err) err = 'NEW:' + e.message; }
        try { OLD.update(); } catch (e) { if (!err) err = 'OLD:' + e.message; }

        if (NEW.health < prevNew) dmgOldDealt += prevNew - NEW.health;
        if (OLD.health < prevOld) dmgNewDealt += prevOld - OLD.health;

        if (NEW.health <= 0) {
          newDeaths++; if (offStage(NEW)) newRingouts++;
          NEW.lives--; if (NEW.lives <= 0) { prevNew = NEW.health; break; }
          NEW.health = NEW.maxHealth; NEW.x = LX; NEW.y = 380; NEW.vx = 0; NEW.vy = 0;
          NEW.stunTimer = 0; NEW.ragdollTimer = 0; NEW.invincible = 30;
        }
        if (OLD.health <= 0) {
          oldDeaths++; if (offStage(OLD)) oldRingouts++;
          OLD.lives--; if (OLD.lives <= 0) { prevOld = OLD.health; break; }
          OLD.health = OLD.maxHealth; OLD.x = RX; OLD.y = 380; OLD.vx = 0; OLD.vy = 0;
          OLD.stunTimer = 0; OLD.ragdollTimer = 0; OLD.invincible = 30;
        }
        prevNew = NEW.health; prevOld = OLD.health;
      }

      return {
        frames: ran, err,
        newLives: NEW.lives, oldLives: OLD.lives,
        dmgNewDealt: Math.round(dmgNewDealt), dmgOldDealt: Math.round(dmgOldDealt),
        newDeaths, oldDeaths, newRingouts, oldRingouts,
        newBait: NEW._baitHeld || 0, newPlans: NEW._planCount || 0, newSupers: NEW._gridSupers || 0,
      };
    }, (i + 1) * 7919, FRAMES, i % 2 === 1, MIRROR, NOLEDGER);

    results.push(r);
    log(`seed ${i + 1}${i % 2 ? ' (swapped)' : ''}: NEW ${r.newLives} lives / OLD ${r.oldLives}  ` +
        `dmg ${r.dmgNewDealt} vs ${r.dmgOldDealt}  ringouts ${r.newRingouts}/${r.oldRingouts}` +
        (r.err ? `  ERR ${r.err}` : ''));
  }

  const sum = (k) => results.reduce((a, r) => a + r[k], 0);
  const n = results.length;
  const newWins = results.filter(r => r.newLives > r.oldLives).length;
  const oldWins = results.filter(r => r.oldLives > r.newLives).length;

  console.log('\n──── HEAD TO HEAD ────');
  console.log(`matches           ${n}`);
  console.log(`match wins        NEW ${newWins}   OLD ${oldWins}   draws ${n - newWins - oldWins}`);
  console.log(`lives remaining   NEW ${(sum('newLives') / n).toFixed(2)}   OLD ${(sum('oldLives') / n).toFixed(2)}`);
  console.log(`damage dealt      NEW ${Math.round(sum('dmgNewDealt') / n)}   OLD ${Math.round(sum('dmgOldDealt') / n)}`);
  console.log(`deaths            NEW ${(sum('newDeaths') / n).toFixed(2)}   OLD ${(sum('oldDeaths') / n).toFixed(2)}`);
  console.log(`  of which ringout NEW ${sum('newRingouts')}   OLD ${sum('oldRingouts')}  (totals)`);
  console.log(`mechanism firings NEW  bait ${sum('newBait')}  plans ${sum('newPlans')}  supers ${sum('newSupers')}`);
  const errs = results.filter(r => r.err);
  if (errs.length) console.log(`\nERRORS in ${errs.length}/${n} matches — first: ${errs[0].err}`);

  await browser.close();
  server.close();
})().catch(e => { console.error('[duel] FATAL', e); process.exit(1); });
