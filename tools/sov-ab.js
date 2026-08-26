'use strict';
/*
 * tools/sov-ab.js — A/B: does Sovereign's adaptation beat frozen-at-max? (DEV ONLY)
 *
 * The Aug-25 harness was underpowered (n=2 vs n=1) and, worse, scored windows in
 * which Sovereign took ZERO damage — the exact regime where the adaptive and the
 * frozen dials are identical. This one:
 *
 *   - forces the boss to phase 2/3 so it actually fights back
 *   - skips cinematic / frozen frames when counting the window
 *   - DISCARDS any trial where damage did not flow BOTH ways
 *   - runs matched alternating pairs (adaptive, frozen, adaptive, frozen, ...)
 *   - re-engages SovereignControl after every restart and asserts isAI
 *
 * Conditions:
 *   adaptive — untouched (current main)
 *   frozen   — aiMemory pinned every frame to the pre-rework saturated values
 *              (aggression/defense/reactionSpeed 1.0, spacing 0) and
 *              _applyAdaptation neutered. This is "always maximum".
 *
 * Usage:
 *   node tools/sov-ab.js [--pairs=6] [--frames=1800] [--boss=boss] [--port=8099] [--hp=0.55]
 *
 * LOADOUT SWEEP — how much of his damage is the weapon rather than the brain?
 * Possession keeps the HOST's weaponKey/charClass (SovereignControl's graft skips
 * properties the host already owns), and SovereignMK2 never changes its own
 * weapon, so every A/B trial above ran one fixed loadout. That is not a confound
 * between conditions, but it does bound what the A/B result covers.
 *
 *   node tools/sov-ab.js --sweep=mkgauntlet,hammer,sword,whip --trials=3
 *   node tools/sov-ab.js --sweep=... --cond=frozen --class=berserker
 *
 * Reports per-loadout means and eta-squared: the share of total damage variance
 * explained by WHICH LOADOUT he held. Compare that against the adaptive-vs-frozen
 * effect to see which one is actually driving his output.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const PAIRS  = parseInt(args.pairs, 10)  || 6;
const FRAMES = parseInt(args.frames, 10) || 1800;
const PORT   = parseInt(args.port, 10)   || 8099;
const MODE   = String(args.boss || 'boss');          // 'boss' = Creator refight
const HPFRAC = args.hp !== undefined ? parseFloat(args.hp) : 0.55;
const SWEEP  = args.sweep ? String(args.sweep).split(',').map(x => x.trim()).filter(Boolean) : null;
const TRIALS = parseInt(args.trials, 10) || 3;
const COND   = String(args.cond || 'adaptive');
const WEAPON = args.weapon ? String(args.weapon) : null;
const CLASSK = args.class  ? String(args.class)  : null;
// PAIRED-LOADOUT mode. The boss refight does NOT give the host a fixed loadout —
// it varies per match (measured: broomstick/gunner one match, whip/none the next),
// and loadout is a ~7x effect on damage. Left uncontrolled it is random across
// both conditions, so it does not BIAS the comparison, but it swamps it: it is
// what produced sd~100 on a mean of ~180 and left every t-statistic near zero.
// With --weapons, both halves of a pair are forced onto the SAME loadout, so the
// within-pair delta is loadout-free and a paired test has real power.
const WEAPONS_CYCLE = args.weapons ? String(args.weapons).split(',').map(x => x.trim()).filter(Boolean) : null;

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

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

const log = (...a) => console.log('[ab]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  log(`server on :${PORT}  mode=${MODE}  pairs=${PAIRS}  frames=${FRAMES}  bossHP=${HPFRAC}`);

  const launchOpts = { headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] };
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(sysChrome)) launchOpts.executablePath = sysChrome;

  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  const NOISE = /onrender\.com|crazygames|supabase|live-config|\/api\/|ERR_FAILED|Failed to load resource|404|CORS|ERR_CONNECTION/i;
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) pageErrors.push(m.text()); });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);

  // Neutralize first-visit story auto-launch
  await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
      }
      if (typeof storyModeActive !== 'undefined') storyModeActive = false;
      if (typeof activeCinematic !== 'undefined') activeCinematic = null;
    } catch (e) {}
    ['prologueOverlay','storyPrologueOverlay','storyPathPanel','storyModal',
     'storyIntroOverlay','storyUnlockOverlay'].forEach(id => {
      const el = document.getElementById(id); if (el) el.remove();
    });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
  });

  // ── Install the measurement rig (once) ────────────────────────────────────
  const ready = await page.evaluate(() => {
    if (typeof SovereignControl === 'undefined' || typeof dealDamage !== 'function') return 'missing globals';
    const R = window.__ab = {
      host: null, bossRef: null, sampling: false, cond: 'adaptive',
      lastFrame: -1, scored: 0, skipped: 0, ended: false,
      dealt: 0, taken: 0, deaths: 0, swings: 0, whiffAborts: 0,
      dialSamples: [], bossHp0: 0, bossHp1: 0,
      minDist: 1e9, sumDist: 0, closeFrames: 0
    };

    const FROZEN = { aggression: 1, defense: 1, reactionSpeed: 1, spacing: 0 };

    // Damage attribution — keyed on object identity, not class.
    const origDeal = window.dealDamage;
    window.dealDamage = function (attacker, target, dmg, kb, ...rest) {
      if (R.sampling && attacker && target && dmg > 0) {
        if (attacker === R.host && target !== R.host) R.dealt += dmg;
        else if (target === R.host && attacker !== R.host) {
          R.taken += dmg;
          if (R.host.health - dmg <= 0) R.deaths++;
        }
      }
      return origDeal(attacker, target, dmg, kb, ...rest);
    };

    // Swing / whiff-veto accounting on the host only.
    //
    // Counting "attack() returned without starting a swing" is WRONG and inflates
    // the veto rate to ~70%: the AI calls attack() every frame, and the vast
    // majority of those calls bail early on cooldown / mid-swing / stun, which is
    // correct behaviour, not a veto. `_meleeReachDist` has exactly ONE call site
    // in the codebase — inside the whiff-guard — so it is an exact sentinel for
    // "this call reached the guard". Veto = reached the guard AND no swing began.
    //
    // It also reconstructs the guard's own arithmetic so a veto can be attributed
    // to a CAUSE. The guard is `_projGap > reach || _vGap > 60`, and those two
    // clauses mean very different things: _vGap is "the boss is above/below me",
    // _projGap is "the blade will not arrive". Recomputing here is safe because
    // _meleeReachDist is called with the same target inside the same expression.
    R.veto = { vgap: 0, vgapBelow: 0, vgapAbove: 0, vgapSum: 0, projgap: 0, projSum: 0, reachSum: 0, cfSum: 0, driftSum: 0, n: 0 };
    const origReach = Fighter.prototype._meleeReachDist;
    Fighter.prototype._meleeReachDist = function (tgt, ...a) {
      const reach = origReach.call(this, tgt, ...a);
      if (R.sampling && this === R.host) {
        R._reachedGuard = true;
        try {
          const cf  = this._meleeContactFrames();
          const sc  = this.drawScale || 1;
          const dir = (tgt.cx() - this.cx()) >= 0 ? 1 : -1;
          const pursue = this.aiDiff === 'easy' ? 3.4 : this.aiDiff === 'medium' ? 4.4
                       : this.aiDiff === 'expert' ? 5.6 : 5.0;
          const close = Math.max(this.vx * dir, pursue * sc) * cf;
          const drift = (tgt.vx || 0) * cf * dir;
          const projGap = Math.abs(tgt.cx() - this.cx()) + drift - close;
          const vGap = Math.abs((this.y + this.h / 2) - (tgt.y + tgt.h / 2));
          const v = R.veto;
          v.n++; v.projSum += projGap; v.reachSum += reach; v.cfSum += cf; v.driftSum += drift;
          if (vGap > 60) {
            v.vgap++;
            v.vgapSum += vGap;
            // SIGNED, because the Aug-25 fix only covers "target BELOW me"
            // (PRIORITY AIR DESCENT / PRIORITY DESCENT both gate on
            // `t.y > this.y + 55`). A boss ABOVE him is an entirely uncovered
            // case, and vGap being an absolute value hides which one this is.
            if ((tgt.y + tgt.h / 2) > (this.y + this.h / 2)) v.vgapBelow++;
            else v.vgapAbove++;
          }
          else if (projGap > reach) v.projgap++;
        } catch (e) {}
      }
      return reach;
    };
    const origAttack = Fighter.prototype.attack;
    Fighter.prototype.attack = function (...a) {
      if (!R.sampling || this !== R.host) return origAttack.apply(this, a);
      const cd = this.cooldown, at = this.attackTimer;
      R._reachedGuard = false;
      const r = origAttack.apply(this, a);
      const swung = (this.attackTimer > at || this.cooldown > cd);
      if (swung) R.swings++;
      else if (R._reachedGuard) R.whiffAborts++;   // genuine whiff-guard veto
      return r;
    };

    // Per-frame sampler. rAF matches the game loop's cadence; frameCount tells us
    // whether a GAME frame actually advanced (it does not during hit-stop/freeze).
    (function tick() {
      requestAnimationFrame(tick);
      if (!R.sampling || !R.host) return;
      if (typeof gameRunning !== 'undefined' && !gameRunning) { R.ended = true; return; }
      const f = (typeof frameCount !== 'undefined') ? frameCount : -1;
      if (f === R.lastFrame) return;
      R.lastFrame = f;

      // Condition B: re-pin every frame. _applyAdaptation is neutered below, but
      // updateAdaptation also nudges dials inline, so pinning must be per-frame.
      if (R.cond === 'frozen' && R.host.aiMemory) Object.assign(R.host.aiMemory, FROZEN);

      const cine = (typeof isCinematic !== 'undefined' && isCinematic) ||
                   (typeof gameFrozen  !== 'undefined' && gameFrozen);
      if (cine) { R.skipped++; return; }
      R.scored++;
      if (R.bossRef && R.bossRef.health > 0) {
        const d = Math.hypot(R.bossRef.x - R.host.x, R.bossRef.y - R.host.y);
        R.sumDist += d;
        if (d < R.minDist) R.minDist = d;
        if (d < 100) R.closeFrames++;
      }
      if (R.scored % 60 === 0 && R.host.aiMemory) {
        const m = R.host.aiMemory;
        R.dialSamples.push([+m.aggression.toFixed(3), +m.defense.toFixed(3),
                            +m.spacing.toFixed(3), +m.reactionSpeed.toFixed(3)]);
      }
    })();

    // Neutered batch adaptation for the frozen condition.
    const origApply = AdaptiveAI.prototype._applyAdaptation;
    AdaptiveAI.prototype._applyAdaptation = function () {
      if (R.sampling && R.cond === 'frozen' && this === R.host) return;
      return origApply.apply(this, arguments);
    };
    return 'ok';
  });
  if (ready !== 'ok') { log('FATAL:', ready); await browser.close(); server.close(); process.exit(1); }

  // ── One trial ─────────────────────────────────────────────────────────────
  async function trial(cond, loadout) {
    // Restart from a clean menu — a match restart replaces every Fighter.
    await page.evaluate(() => {
      try { if (typeof backToMenu === 'function') backToMenu(); } catch (e) {}
      try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
    });
    await sleep(600);
    const started = await page.evaluate((mode) => {
      try {
        selectMode(mode);
        startGame();
        return true;
      } catch (e) { return String(e && e.message || e); }
    }, MODE);
    if (started !== true) return { error: 'startGame: ' + started };

    // Wait for a live match with a boss in it, past any opening cinematic.
    const setup = await page.waitForFunction(() => {
      if (typeof gameRunning === 'undefined' || !gameRunning) return false;
      if (!Array.isArray(players) || players.length < 2) return false;
      const b = players.find(p => p && p.isBoss && p.health > 0);
      if (!b) return false;
      if (typeof isCinematic !== 'undefined' && isCinematic) return false;
      if (typeof gameFrozen !== 'undefined' && gameFrozen) return false;
      if (typeof tfCinematicState !== 'undefined' && tfCinematicState !== 'none') return false;
      return true;
    }, { timeout: 90000, polling: 250 }).then(() => true).catch(e => String(e.message));
    if (setup !== true) return { error: 'setup timeout: ' + setup };

    // Force the boss into its aggressive phase, then possess.
    const engaged = await page.evaluate((cond, hpFrac, lo) => {
      const R = window.__ab;
      const b = players.find(p => p && p.isBoss && p.health > 0);
      if (!b) return 'no boss';
      b.health = Math.max(1, Math.floor(b.maxHealth * hpFrac));
      R.bossRef = b;

      // Force the loadout BEFORE possession — applyClass resets health, and the
      // graft reads host.weaponKey when it builds the brain.
      if (lo) {
        // WEAPON_KEYS is the player-facing list — it hard-filters `gauntlet` and
        // `mkgauntlet` (admin/troll-only) and every `enemyOnly` weapon. Reading
        // damage ranks straight off the WEAPONS object silently pulls those in and
        // produces a sweep that measures kit the player can never equip.
        if (lo.weapon && typeof WEAPON_KEYS !== 'undefined' &&
            !WEAPON_KEYS.includes(lo.weapon) && !lo.allowRestricted) {
          return 'restricted weapon: ' + lo.weapon + ' is not in WEAPON_KEYS';
        }
        const h0 = players.find(p => p && p.controls && !p.isBoss);
        if (h0) {
          // applyClass() RETURNS EARLY on 'none' (`if (!cls || classKey === 'none') return;`),
          // so passing 'none' silently leaves whatever class the match handed out
          // in place — which is the bug this whole option exists to close. Apply
          // the neutral profile by hand in that case.
          if (lo.cls === 'none' && typeof CLASSES !== 'undefined' && CLASSES.none) {
            h0.charClass = 'none';
            h0.maxHealth = CLASSES.none.hp;
            h0.health = CLASSES.none.hp;
            h0.classSpeedMult = CLASSES.none.speedMult;
          } else if (lo.cls && typeof applyClass === 'function') {
            applyClass(h0, lo.cls);
          }
          if (lo.weapon && typeof WEAPONS !== 'undefined' && WEAPONS[lo.weapon]) {
            h0.weapon = WEAPONS[lo.weapon]; h0.weaponKey = lo.weapon; h0._ammo = 0;
          }
        }
      }

      if (SovereignControl.active) { try { SovereignControl.release(); } catch (e) {} }
      if (!SovereignControl.engage()) return 'engage failed';
      const h = SovereignControl._host;
      if (!h) return 'no host';
      if (!h.isAI) return 'host not AI';
      if (!h.aiMemory) return 'host has no aiMemory';

      R.host = h; R.cond = cond;
      R.scored = 0; R.skipped = 0; R.dealt = 0; R.taken = 0; R.deaths = 0;
      R.swings = 0; R.whiffAborts = 0; R.dialSamples = []; R.ended = false;
      R.minDist = 1e9; R.sumDist = 0; R.closeFrames = 0;
      R.veto = { vgap: 0, vgapBelow: 0, vgapAbove: 0, vgapSum: 0, projgap: 0, projSum: 0, reachSum: 0, cfSum: 0, driftSum: 0, n: 0 };
      R.lastFrame = -1;
      R.bossHp0 = b.health;
      if (cond === 'frozen') Object.assign(h.aiMemory, { aggression: 1, defense: 1, reactionSpeed: 1, spacing: 0 });
      R.sampling = true;
      return 'ok';
    }, cond, HPFRAC, loadout || null);
    if (engaged !== 'ok') return { error: engaged };

    // Let it run.
    const done = await page.waitForFunction((n) => window.__ab.scored >= n || window.__ab.ended,
      { timeout: 240000, polling: 500 }, FRAMES).then(() => true).catch(e => String(e.message));

    const out = await page.evaluate(() => {
      const R = window.__ab;
      R.sampling = false;
      const b = R.bossRef;
      return {
        cond: R.cond, scored: R.scored, skipped: R.skipped, ended: R.ended,
        dealt: Math.round(R.dealt), taken: Math.round(R.taken), deaths: R.deaths,
        swings: R.swings, whiffAborts: R.whiffAborts,
        bossHp0: R.bossHp0, bossHp1: b ? Math.max(0, b.health) : 0,
        minDist: Math.round(R.minDist), avgDist: R.scored ? Math.round(R.sumDist / R.scored) : 0,
        closePct: R.scored ? +(100 * R.closeFrames / R.scored).toFixed(1) : 0,
        dials: R.dialSamples,
        veto: Object.assign({}, R.veto),
        weapon: R.host ? R.host.weaponKey : null,
        charClass: R.host ? (R.host.charClass || 'none') : null
      };
    });
    if (done !== true) out.warn = 'window ' + done;
    return out;
  }

  // ── Loadout sweep ─────────────────────────────────────────────────────────
  if (SWEEP) {
    const rows = [];
    for (const w of SWEEP) {
      for (let t = 0; t < TRIALS; t++) {
        const r = await trial(COND, { weapon: w, cls: CLASSK, allowRestricted: !!args.allowrestricted });
        if (r.error) { log(`${w} #${t + 1}: ERROR ${r.error}`); continue; }
        r.valid = r.dealt > 0 && r.taken > 0;
        r.loadout = w;
        rows.push(r);
        log(`${w.padEnd(14)} #${t + 1} held=${String(r.weapon).padEnd(13)} ` +
            `dealt/1k ${(1000 * r.dealt / r.scored).toFixed(1).padStart(6)} ` +
            `taken/1k ${(1000 * r.taken / r.scored).toFixed(1).padStart(6)} ` +
            `close ${r.closePct}%${r.valid ? '' : '  <-- DISCARDED'}`);
      }
    }
    const valid = rows.filter(r => r.valid);
    const byLo = {};
    for (const r of valid) (byLo[r.loadout] = byLo[r.loadout] || []).push(1000 * r.dealt / r.scored);

    console.log('\n' + '='.repeat(72));
    log(`LOADOUT SWEEP (cond=${COND}${CLASSK ? ', class=' + CLASSK : ''}) — dealt/1k`);
    const means = [];
    for (const w of SWEEP) {
      const a = byLo[w];
      if (!a || !a.length) { log(`  ${w.padEnd(14)} no valid trials`); continue; }
      const m = a.reduce((x, y) => x + y, 0) / a.length;
      means.push({ w, m, n: a.length });
      const vr = valid.filter(r => r.loadout === w).reduce((acc, r) => {
        acc.vgap += r.veto.vgap; acc.projgap += r.veto.projgap; acc.n += r.veto.n;
        acc.below += r.veto.vgapBelow; acc.above += r.veto.vgapAbove; acc.vsum += r.veto.vgapSum;
        acc.proj += r.veto.projSum; acc.reach += r.veto.reachSum;
        acc.cf += r.veto.cfSum; acc.drift += r.veto.driftSum; return acc;
      }, { vgap: 0, projgap: 0, n: 0, proj: 0, reach: 0, cf: 0, drift: 0, below: 0, above: 0, vsum: 0 });
      const pc = x => vr.n ? (100 * x / vr.n).toFixed(0) + '%' : '—';
      log(`  ${w.padEnd(14)} n=${a.length}  mean ${m.toFixed(1)}   [${a.map(x => x.toFixed(0)).join(', ')}]`);
      log(`  ${' '.repeat(14)}    guard-checks ${vr.n}  vGap-veto ${pc(vr.vgap)}  projGap-veto ${pc(vr.projgap)}  ` +
          `avg projGap ${(vr.proj / (vr.n || 1)).toFixed(0)} vs reach ${(vr.reach / (vr.n || 1)).toFixed(0)}  ` +
          `contactFrames ${(vr.cf / (vr.n || 1)).toFixed(1)}  avg drift ${(vr.drift / (vr.n || 1)).toFixed(0)}`);
      log(`  ${' '.repeat(14)}    vGap vetoes: boss BELOW ${vr.below}  boss ABOVE ${vr.above}  ` +
          `mean vGap ${(vr.vsum / (vr.vgap || 1)).toFixed(0)}px`);
    }
    // eta^2 = between-group variance share. This is the number the whole sweep is for.
    const all = valid.map(r => 1000 * r.dealt / r.scored);
    if (all.length > 1 && means.length > 1) {
      const gm = all.reduce((a, b) => a + b, 0) / all.length;
      const ssTot = all.reduce((a, x) => a + (x - gm) ** 2, 0);
      const ssBet = means.reduce((a, g) => a + g.n * (g.m - gm) ** 2, 0);
      log(`\n  eta-squared = ${(ssBet / ssTot).toFixed(3)}  ` +
          `— share of damage variance explained by WHICH LOADOUT he held`);
      log(`  spread: best ${Math.max(...means.map(g => g.m)).toFixed(0)} vs worst ${Math.min(...means.map(g => g.m)).toFixed(0)} dealt/1k`);
    }
    console.log('='.repeat(72));
    fs.writeFileSync(path.join(ROOT, 'tools', 'sov-sweep-results.json'),
      JSON.stringify({ cond: COND, cls: CLASSK, trials: TRIALS, frames: FRAMES, rows }, null, 2));
    log('raw -> tools/sov-sweep-results.json');
    if (pageErrors.length) { log(`page errors (${pageErrors.length}):`); pageErrors.slice(0, 8).forEach(e => log('  !', e)); }
    await browser.close(); server.close(); process.exit(0);
  }

  // ── Matched alternating pairs ─────────────────────────────────────────────
  const results = [];
  for (let i = 0; i < PAIRS; i++) {
    const order = (i % 2 === 0) ? ['adaptive', 'frozen'] : ['frozen', 'adaptive'];
    for (const cond of order) {
      const pairWeapon = WEAPONS_CYCLE ? WEAPONS_CYCLE[i % WEAPONS_CYCLE.length] : WEAPON;
      const r = await trial(cond, (pairWeapon || CLASSK) ? { weapon: pairWeapon, cls: CLASSK, allowRestricted: !!args.allowrestricted } : null);
      if (r.error) { log(`pair ${i + 1} ${cond}: ERROR ${r.error}`); results.push({ cond, error: r.error }); continue; }
      const per = (x) => r.scored ? (1000 * x / r.scored).toFixed(1) : '—';
      const valid = r.dealt > 0 && r.taken > 0;
      r.valid = valid;
      r.pairIdx = i;
      results.push(r);
      log(`pair ${i + 1} ${cond.padEnd(8)} [${r.weapon}/${r.charClass}] frames ${r.scored} (skip ${r.skipped}) ` +
          `dealt/1k ${per(r.dealt).padStart(6)} taken/1k ${per(r.taken).padStart(6)} ` +
          `deaths ${r.deaths} bossHP ${r.bossHp0}->${r.bossHp1} avgD ${r.avgDist} close ${r.closePct}% ${valid ? '' : '  <-- DISCARDED (one-way damage)'}`);
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const agg = {};
  for (const c of ['adaptive', 'frozen']) {
    const v = results.filter(r => r.cond === c && r.valid);
    if (!v.length) { agg[c] = null; continue; }
    const sum = k => v.reduce((a, r) => a + r[k], 0);
    const fr = sum('scored');
    agg[c] = {
      n: v.length, frames: fr,
      dealtPer1k: 1000 * sum('dealt') / fr,
      takenPer1k: 1000 * sum('taken') / fr,
      ratio: sum('taken') ? sum('dealt') / sum('taken') : Infinity,
      bossDmg: v.reduce((a, r) => a + (r.bossHp0 - r.bossHp1), 0),
      deaths: sum('deaths'),
      whiffPct: sum('swings') + sum('whiffAborts') ? 100 * sum('whiffAborts') / (sum('swings') + sum('whiffAborts')) : 0,
      perTrialDealt: v.map(r => +(1000 * r.dealt / r.scored).toFixed(1))
    };
  }
  console.log('\n' + '='.repeat(72));
  for (const c of ['adaptive', 'frozen']) {
    const a = agg[c];
    if (!a) { log(`${c}: NO VALID TRIALS`); continue; }
    log(`${c.toUpperCase().padEnd(9)} n=${a.n}  frames=${a.frames}`);
    log(`   dealt/1k ${a.dealtPer1k.toFixed(1)}   taken/1k ${a.takenPer1k.toFixed(1)}   ratio ${a.ratio.toFixed(2)}`);
    log(`   boss dmg ${Math.round(a.bossDmg)}   deaths ${a.deaths}   whiff-abort ${a.whiffPct.toFixed(1)}%`);
    log(`   per-trial dealt/1k: [${a.perTrialDealt.join(', ')}]`);
  }
  // Paired test — only meaningful when both halves of a pair share a loadout.
  if (WEAPONS_CYCLE) {
    const deltas = [];
    for (let i = 0; i < PAIRS; i++) {
      const both = results.filter(r => r.pairIdx === i && r.valid);
      const a = both.find(r => r.cond === 'adaptive'), f = both.find(r => r.cond === 'frozen');
      if (a && f) deltas.push({ w: a.weapon, d: (1000 * a.dealt / a.scored) - (1000 * f.dealt / f.scored) });
    }
    if (deltas.length > 1) {
      const ds = deltas.map(x => x.d);
      const m  = ds.reduce((a, b) => a + b, 0) / ds.length;
      const sd = Math.sqrt(ds.reduce((a, x) => a + (x - m) ** 2, 0) / (ds.length - 1));
      const t  = m / (sd / Math.sqrt(ds.length));
      log(`\nPAIRED (same loadout both halves), adaptive - frozen dealt/1k:`);
      deltas.forEach(x => log(`   ${x.w.padEnd(13)} ${x.d >= 0 ? '+' : ''}${x.d.toFixed(1)}`));
      log(`   mean ${m >= 0 ? '+' : ''}${m.toFixed(1)} ±${sd.toFixed(1)}   paired t = ${t.toFixed(2)}  (n=${ds.length})`);
    }
  }

  if (agg.adaptive && agg.frozen) {
    const d = 100 * (agg.adaptive.ratio - agg.frozen.ratio) / agg.frozen.ratio;
    log(`\nVERDICT: adaptive dealt/taken ratio is ${d >= 0 ? '+' : ''}${d.toFixed(1)}% vs frozen-at-max.`);
  }
  console.log('='.repeat(72));

  fs.writeFileSync(path.join(ROOT, 'tools', 'sov-ab-results.json'),
    JSON.stringify({ mode: MODE, pairs: PAIRS, frames: FRAMES, hp: HPFRAC, agg, results }, null, 2));
  log('raw -> tools/sov-ab-results.json');

  if (pageErrors.length) { log(`page errors (${pageErrors.length}):`); pageErrors.slice(0, 8).forEach(e => log('  !', e)); }

  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error('[ab] FATAL', e); process.exit(1); });
