'use strict';
/*
 * tools/sov-fresh.js — FRESH Sovereign vs HAND-TUNED Sovereign. DEV ONLY.
 *
 * THE HYPOTHESIS
 * Sovereign is hand-initialised above the base class on every dial
 * (aggression 0.90 vs ADAPTIVE_DEFAULTS 0.78, defense 0.88 vs 0.70,
 * reactionSpeed 0.95 vs 0.90). _applyAdaptation now converges toward a target at
 * R=0.05 in BOTH directions — it was fixed from the old R=0.32 jump-to-limit. So
 * the machinery can learn, but it is handed a fighter with no upward headroom:
 * the only direction left is down, which looks like regression and gets tuned out.
 *
 * The claim under test: start him low and adaptation has somewhere to go. He
 * should lose early, climb, and finish stronger than the hand-tuned build.
 *
 * WHAT IS MEASURED, AND WHY IN THIRDS
 * "Loses early then wins late" is a CURVE, not an average — a match average would
 * hide it completely. Damage dealt each way is bucketed into thirds of the match,
 * so a fighter who is behind in T1 and ahead in T3 is visible as such.
 *
 * Dial trajectories are sampled too. If FRESH's dials do not actually rise, the
 * hypothesis fails for a different reason than if they rise and he still loses,
 * and those two outcomes need different fixes.
 *
 * Both sides run with the Sep-20 mechanisms OFF. This tests the dial hypothesis
 * alone; mixing in the plan layer would confound two independent questions.
 *
 * Usage: node tools/sov-fresh.js [--seeds=24] [--port=8120] [--level=0.45]
 */
const fs = require('fs'), path = require('path'), http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const SEEDS  = parseInt(args.seeds, 10)  || 24;
const PORT   = parseInt(args.port, 10)   || 8120;
const FRAMES = parseInt(args.frames, 10) || 7200;
const LEVEL  = args.level !== undefined ? parseFloat(args.level) : 0.45;
const ROOT   = path.resolve(__dirname, '..');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const log = (...a) => console.log('[fresh]', ...a);

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
    server.on('error', (e) => { console.error(`[fresh] cannot listen on :${PORT} — ${e.code}`); process.exit(1); });
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
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => typeof SovereignMK2 !== 'undefined' && typeof SMK2_TUNE !== 'undefined',
    { timeout: 180000 });
  log('game loaded');

  const results = [];
  for (let i = 0; i < SEEDS; i++) {
    const r = await page.evaluate((frames, swap, level) => {
      const _noop = () => {};
      currentArena = (typeof ARENAS !== 'undefined' && ARENAS.sovereign) ? ARENAS.sovereign
        : { id: 'sim', bgColor: '#000', platforms: [{ x: 0, y: 460, w: 900, h: 60, isFloor: true }] };
      players.length = 0;
      if (typeof minions !== 'undefined')        minions.length = 0;
      if (typeof projectiles !== 'undefined')    projectiles.length = 0;
      if (typeof damageTexts !== 'undefined')    damageTexts.length = 0;
      if (typeof verletRagdolls !== 'undefined') verletRagdolls.length = 0;
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
      // Sep-20 mechanisms off on BOTH sides — this is the dial question alone.
      SMK2_TUNE.superGate = false; SMK2_TUNE.tacticPlans = false; SMK2_TUNE.baitPunisher = false;

      const floor = (currentArena.platforms || []).find(p => p.isFloor) || { x: 0, w: 900, y: 460 };
      const LX = swap ? 650 : 250, RX = swap ? 250 : 650;
      const mk = (x, colour) => {
        const f = new SovereignMK2(x, 380, colour, 'sword');
        f.lives = 5; f.aiDiff = 'hard';
        return f;
      };
      const FRESH = mk(LX, '#22cc66');
      const TUNED = mk(RX, '#ff2200');

      // FRESH starts well below the hand-set values and below ADAPTIVE_DEFAULTS.
      // spacing is inverted in meaning (low = fights close), so it starts HIGH —
      // a fresh fighter should not already know to close distance.
      FRESH.aiMemory = { aggression: level, defense: level, spacing: 1 - level, reactionSpeed: level + 0.1 };
      // _memBaseline is captured on the first dossier seed and used to blend
      // priors back in; leaving a stale one would drag him back to the tuned
      // values and silently undo the whole experiment.
      FRESH._memBaseline = { ...FRESH.aiMemory };
      const dial0 = { ...FRESH.aiMemory };

      FRESH.name = 'FRESH'; TUNED.name = 'TUNED';
      FRESH._teamId = 'fresh'; TUNED._teamId = 'tuned';
      players.push(FRESH, TUNED);

      // Fine 200-frame blocks, folded into thirds of the ACTUAL match length
      // afterwards. Bucketing by thirds of the FRAME CAP was wrong: these matches
      // end around frame 2400 of 7200, so two of the three buckets were empty and
      // the curve the whole tool exists to draw was invisible.
      const BLK = 200;
      const blkF = [], blkT = [];   // damage DEALT by each, per 200-frame block
      let fDeaths = 0, tDeaths = 0, fRing = 0, tRing = 0;
      let prevF = FRESH.health, prevT = TUNED.health;
      let ran = 0, err = null, dialMid = null;

      const offStage = (f) => (f.cx() < floor.x + 8 || f.cx() > floor.x + floor.w - 8 ||
                               (f.y + f.h) > floor.y + 120);

      for (let fr = 0; fr < frames; fr++) {
        hitStopFrames = 0; slowMotion = 1; aiTick = fr; frameCount = fr; ran = fr + 1;
        FRESH.target = TUNED.health > 0 ? TUNED : null;
        TUNED.target = FRESH.health > 0 ? FRESH : null;
        try { FRESH.update(); } catch (e) { if (!err) err = 'FRESH:' + e.message; }
        try { TUNED.update(); } catch (e) { if (!err) err = 'TUNED:' + e.message; }

        const k = Math.floor(fr / BLK);
        while (blkF.length <= k) { blkF.push(0); blkT.push(0); }
        if (FRESH.health < prevF) blkT[k] += prevF - FRESH.health;
        if (TUNED.health < prevT) blkF[k] += prevT - TUNED.health;
        if (dialMid === null && fr > 0 && fr % 600 === 0) dialMid = { ...FRESH.aiMemory };

        if (FRESH.health <= 0) {
          fDeaths++; if (offStage(FRESH)) fRing++;
          FRESH.lives--; if (FRESH.lives <= 0) { prevF = FRESH.health; break; }
          FRESH.health = FRESH.maxHealth; FRESH.x = LX; FRESH.y = 380;
          FRESH.vx = 0; FRESH.vy = 0; FRESH.stunTimer = 0; FRESH.ragdollTimer = 0; FRESH.invincible = 30;
        }
        if (TUNED.health <= 0) {
          tDeaths++; if (offStage(TUNED)) tRing++;
          TUNED.lives--; if (TUNED.lives <= 0) { prevT = TUNED.health; break; }
          TUNED.health = TUNED.maxHealth; TUNED.x = RX; TUNED.y = 380;
          TUNED.vx = 0; TUNED.vy = 0; TUNED.stunTimer = 0; TUNED.ragdollTimer = 0; TUNED.invincible = 30;
        }
        prevF = FRESH.health; prevT = TUNED.health;
      }

      return {
        frames: ran, err,
        freshLives: FRESH.lives, tunedLives: TUNED.lives,
        blkF: blkF.map(Math.round), blkT: blkT.map(Math.round),
        fDeaths, tDeaths, fRing, tRing,
        dial0, dialMid, dialEnd: { ...FRESH.aiMemory }, tunedEnd: { ...TUNED.aiMemory },
      };
    }, FRAMES, i % 2 === 1, LEVEL);

    results.push(r);
    log(`seed ${i + 1}${i % 2 ? ' (sw)' : ''}: lives F${r.freshLives}/T${r.tunedLives}  ` +
        `${r.frames}f  dealt ${r.blkF.reduce((a, b) => a + b, 0)} vs ${r.blkT.reduce((a, b) => a + b, 0)}` +
        (r.err ? `  ERR ${r.err}` : ''));
  }

  const n = results.length;
  const sum = (k) => results.reduce((a, r) => a + r[k], 0);
  // Fold each match's blocks into thirds OF THAT MATCH, then average the thirds
  // across matches. Folding by absolute frame would let one long match dominate
  // the late buckets and define the curve on its own.
  const thirds = (r, key) => {
    const b = r[key], m = b.length;
    if (!m) return [0, 0, 0];
    const out = [0, 0, 0];
    for (let i = 0; i < m; i++) out[Math.min(2, Math.floor(i / (m / 3)))] += b[i];
    return out;
  };
  const fWins = results.filter(r => r.freshLives > r.tunedLives).length;
  const tWins = results.filter(r => r.tunedLives > r.freshLives).length;

  console.log('\n──── FRESH vs HAND-TUNED ────');
  console.log(`matches         ${n}   (dials start at ${LEVEL})`);
  console.log(`match wins      FRESH ${fWins}   TUNED ${tWins}   draws ${n - fWins - tWins}`);
  console.log(`lives remaining FRESH ${(sum('freshLives') / n).toFixed(2)}   TUNED ${(sum('tunedLives') / n).toFixed(2)}`);
  console.log(`deaths          FRESH ${(sum('fDeaths') / n).toFixed(2)}   TUNED ${(sum('tDeaths') / n).toFixed(2)}`);
  console.log('\nDAMAGE DEALT BY THIRD — the "loses early, wins late" curve:');
  for (let k = 0; k < 3; k++) {
    const f = results.reduce((a, r) => a + thirds(r, 'blkF')[k], 0) / n;
    const t = results.reduce((a, r) => a + thirds(r, 'blkT')[k], 0) / n;
    const share = (f + t) > 0 ? (f / (f + t) * 100) : 0;
    console.log(`  T${k + 1}:  FRESH ${f.toFixed(0).padStart(4)}   TUNED ${t.toFixed(0).padStart(4)}   ` +
                `FRESH share ${share.toFixed(1)}%`);
  }
  const avgDial = (which, key) => results.reduce((a, r) => a + ((r[which] && r[which][key]) || 0), 0) / n;
  console.log('\nFRESH dial trajectory (did adaptation actually move them?):');
  for (const k of ['aggression', 'defense', 'spacing', 'reactionSpeed']) {
    console.log(`  ${k.padEnd(14)} start ${avgDial('dial0', k).toFixed(3)}  ` +
                `mid ${avgDial('dialMid', k).toFixed(3)}  end ${avgDial('dialEnd', k).toFixed(3)}   ` +
                `(TUNED end ${avgDial('tunedEnd', k).toFixed(3)})`);
  }
  const errs = results.filter(r => r.err);
  if (errs.length) console.log(`\nERRORS in ${errs.length}/${n} — first: ${errs[0].err}`);

  await browser.close();
  server.close();
})().catch(e => { console.error('[fresh] FATAL', e); process.exit(1); });
