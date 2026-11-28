'use strict';
/* global BalanceSim, RT */
/*
 * tools/fight-retune-test.js — headless checks for the Stage 1 fighting retune
 * (docs/superpowers/plans/2026-11-25-fighting-retune-stage1.md). DEV ONLY.
 *
 * Boots the real page (like tools/bot-duel.js), injects BalanceSim, and runs
 * named checks. Each check body runs in the page and returns { pass, detail }.
 *
 * Usage: node tools/fight-retune-test.js [--only=name] [--port=8141]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const PORT = parseInt(args.port, 10) || 8141;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const CHECKS = [];
// fn runs inside the page. `sim` checks get a fresh BalanceSim world; `page`
// checks get a freshly reloaded page (real menus, real startGame).
function check(name, fn, kind, arg) { CHECKS.push({ name, fn, kind: kind || 'sim', arg }); }

// ── Helpers injected into the page before every check ───────────────────────
const HELPERS = `
// BalanceSim no-ops every SoundManager function, so getVolume() returns undefined and the ambience timer
// writes NaN into a gain (harness-only page error). Give the stubs a muted answer.
(function () {
  const setup = BalanceSim.setup;
  BalanceSim.setup = function (...a) { const r = setup.apply(this, a); SoundManager.getVolume = () => 0; SoundManager.isMuted = () => true; return r; };
})();
window.RT = {
  // A pair standing in reach on the flat arena, AI off on both.
  pair(wA, wB, gap) {
    const r = BalanceSim.setup('warrior', 'warrior', { arena: 'flat', stocks: 9, wA, wB: wB || 'sword' });
    const A = r.A, B = r.B;
    for (const f of [A, B]) { f.isAI = false; f.controls = {}; f.lives = 9; }
    B.maxHealth = B.health = 100000;
    A.x = 400 - A.w / 2; B.x = 400 + (gap == null ? 40 : gap) - B.w / 2;
    A.facing = 1; B.facing = -1; A.vx = B.vx = 0;
    BalanceSim.step(30);   // land
    A.x = 400 - A.w / 2; B.x = 400 + (gap == null ? 40 : gap) - B.w / 2; A.facing = 1; B.facing = -1;
    return { A, B };
  },
  // Press attack every frame for n frames; returns each accepted swing with
  // its start frame, move, duration, landed flag and the recovery it got.
  pressLog(A, B, n) {
    const out = []; let last = A._attackStartFrame, cur = null;
    for (let i = 0; i < n; i++) {
      A.attack(B);
      if (A._attackStartFrame !== last) {
        last = A._attackStartFrame;
        cur = { at: BalanceSim.frame(), mv: A._swingMv ? A._swingMv.name || A._swingMv.id : null, dur: A.attackDuration, hit: false, endlag: 0, lockOk: true };
        out.push(cur);
      }
      BalanceSim.step(1);
      if (cur) {
        if (A.weaponHit && A.swingHitTargets.size) cur.hit = true;   // a floor spark is not a hit
        if (A.attackEndlag > cur.endlag) cur.endlag = A.attackEndlag;
        if (A.attackEndlag > 0 && !(A._whiffGuardLock > frameCount) && !cur.hit) cur.lockOk = false;
      }
    }
    return out;
  },
  // ── Real-match helpers (kind 'page') ──
  frames(n) { const f0 = frameCount; return new Promise(r => { const t = () => (frameCount - f0 >= n ? r() : requestAnimationFrame(t)); t(); }); },
  until(fn, max) { const f0 = frameCount; return new Promise(r => { const t = () => (fn() || frameCount - f0 >= (max || 600) ? r(fn()) : requestAnimationFrame(t)); t(); }); },
  key(k, type) {
    const code = (k.length === 1 && /[a-z]/i.test(k)) ? 'Key' + k.toUpperCase() : (k === ';' ? 'Semicolon' : k);
    document.dispatchEvent(new KeyboardEvent(type || 'keydown', { key: k, code, bubbles: true }));
  },
  tap(k) { RT.key(k, 'keydown'); RT.key(k, 'keyup'); },
  async duel(weapon, c1, c2) {
    selectMode('2p');
    const w = document.getElementById('p1Weapon'); if (w) w.value = weapon || 'sword';
    for (const [id, v] of [['p1Class', c1], ['p2Class', c2]]) { const el = document.getElementById(id); if (el && v) el.value = v; }
    startGame();
    await RT.until(() => gameRunning && players.length >= 2 && !(typeof gameLoading !== 'undefined' && gameLoading), 900);
    await RT.frames(120);
    const P1 = players[0], P2 = players[1];
    return { P1, P2 };
  },
  // Put P2 in reach of P1, both still, on P1's floor.
  face(P1, P2, gap) { P2.x = P1.x + P1.w / 2 + gap - P2.w / 2; P2.y = P1.y; P2.vx = P1.vx = 0; P1.facing = 1; P2.facing = -1; },
  free(p) { return !(p.cooldown > 0) && !(p.attackEndlag > 0) && !(p.attackTimer > 0); },
  // Press every frame; log each landed hit on B with B's knockback right after it.
  stringRun(A, B, n, onFrame) {
    const hits = []; let hp = B.health;
    for (let i = 0; i < n; i++) {
      A.attack(B); BalanceSim.step(1);
      if (B.health < hp) hits.push({ at: BalanceSim.frame(), cn: A._comboHitCount, kb: Math.abs(B.vx) + Math.abs(B.vy), chainN: A._basicChainN });
      hp = B.health;
      if (onFrame) onFrame(i);
    }
    return hits;
  },
  gaps(log) { const g = []; for (let i = 1; i < log.length; i++) g.push(log[i].at - log[i - 1].at); return g; },
  // Stage 2: press attack until B has taken n hits (B held in reach), then stop pressing and step
  // into that swing's recovery. Returns the number of hits landed.
  landN(A, B, n, gap) {
    let hits = 0, hp = B.health;
    for (let i = 0; i < 200 && hits < n; i++) {
      A.attack(B); BalanceSim.step(1);
      if (B.health < hp) hits++;
      hp = B.health;
      if (hits < n) { B.x = A.x + A.w / 2 + (gap || 40) - B.w / 2; B.vx = 0; }
    }
    for (let i = 0; i < 60 && !(A.attackEndlag > 0); i++) BalanceSim.step(1);
    return hits;
  },
  // Whiff, press Q or E 5 frames before recovery ends; report when it fired (string concat: inside HELPERS).
  async bufferedAfterMiss(kind) {
    const { P1, P2 } = await RT.duel('sword');
    RT.face(P1, P2, 400);
    if (kind === 'super') RT.fullMeter(P1);
    RT.tap(P1.controls.attack);
    await RT.until(() => P1.attackTimer === 0 && P1.attackEndlag > 0 && P1.attackEndlag <= 5, 120);
    const left = P1.attackEndlag;
    RT.tap(kind === 'super' ? P1.controls.super : P1.controls.ability);
    const fired = () => kind === 'super' ? !P1.superReady : P1.abilityCooldown > 0;
    const early = fired();
    await RT.until(() => !(P1.attackEndlag > 0), 60);
    const endAt = frameCount;
    await RT.until(fired, INPUT_BUFFER_FRAMES + 4);
    const lag = fired() ? frameCount - endAt : 'never';
    return { pass: !early && fired() && lag <= INPUT_BUFFER_FRAMES + 2,
             detail: 'pressed ' + left + 'f before recovery ended; fired early ' + early + '; ' + lag + 'f after it ended' };
  },
  // Count wall combo escapes on B (dealDamage sets _wallEscape when one fires).
  watchEscape(B) {
    const w = { n: 0 }; let v = null;
    Object.defineProperty(B, '_wallEscape', { configurable: true, get() { return v; }, set(x) { if (x) w.n++; v = x; } });
    return w;
  },
  // Revive checks: P2 on the widest safe platform, P1 out of shove range.
  reviveStage(P1, P2) {
    const pl = currentArena.platforms.filter(p => !p.isFloorDisabled && !p.isRockFill && !p.isBedrock && !(currentArena.hasLava && p.y >= (currentArena.lavaY || 442) - 30))
      .sort((a, b) => b.w - a.w)[0];
    P2.x = pl.x + pl.w / 2 - P2.w / 2; P2.y = pl.y - P2.h;
    P1.x = P2.x - 200; P1.y = P2.y; P1.vx = P2.vx = P1.vy = P2.vy = 0;
  },
  // A faces B with B against the right wall, in reach.
  corner(A, B) { B.x = 900 - B.w - 2; A.x = B.x - 40 - A.w / 2 + B.w / 2; A.facing = 1; B.facing = -1; A.vx = B.vx = 0; },
  // Bot A (difficulty diff) against a still dummy B kept in reach for n frames; counts A's Q cancels.
  botCancels(diff, n, legacy) {
    const { A, B } = RT.pair('sword', 'sword', 40);
    A.isAI = true; A.aiDiff = diff; A.target = B;
    let cancels = 0; const opened = new Set();
    const orig = A._endSwingForCancel;
    A._endSwingForCancel = function (kind) {
      if (kind === 'q') { cancels++; if (this._basicChainN === 2 || this._basicChainN === 3) opened.add(this._hitCancelFrom); }
      return orig.call(this, kind);
    };
    // Deliberate cancels: the ones botHitCancel (smb-bot-tactics.js) made.
    let taught = 0; const bhc = typeof botHitCancel === 'function' ? botHitCancel : null;
    if (bhc) window.botHitCancel = function (f, t) { const r = bhc(f, t); if (r && f === A) taught++; return r; };
    const was = BOT_TACTICS.enabled;
    if (legacy) BOT_TACTICS.enabled = false;
    try {
      for (let i = 0; i < n; i++) {
        if (A._canHitCancel() && (A._basicChainN === 2 || A._basicChainN === 3) && !(A.abilityCooldown > 0)) opened.add(A._hitCancelFrom);
        BalanceSim.step(1);
        if (!(B.ragdollTimer > 0)) { B.x = A.x + A.w / 2 + 40 * (A.facing || 1) - B.w / 2; B.vx = 0; }
        B.health = B.maxHealth;
      }
    } finally { BOT_TACTICS.enabled = was; if (bhc) window.botHitCancel = bhc; }
    const rate = opened.size ? cancels / opened.size : 0;
    return { cancels, taught, opened: opened.size, rate, txt: cancels + ' cancels (' + taught + ' by botHitCancel) / ' + opened.size + ' windows (' + Math.round(rate * 100) + '%)' };
  },
  fullMeter(f) { f.superMeter = 100; f.superReady = true; },
  // Swing at nothing and step into the whiff's recovery.
  whiff(A, B) {
    A.attack(B);
    for (let i = 0; i < 60 && !(A.attackEndlag > 0); i++) BalanceSim.step(1);
  },
};
`;

check('harness', () => {
  const r = BalanceSim.setup('warrior', 'warrior', { arena: 'flat', wA: 'sword', wB: 'sword' });
  const err = BalanceSim.step(60);
  const ok = r.A.health > 0 && r.B.health > 0 && !err && BalanceSim.frame() === 60;
  return { pass: ok, detail: `hpA=${r.A.health} hpB=${r.B.health} frame=${BalanceSim.frame()} err=${err}` };
});


// ── Task 2: recovery decides when you can swing again ───────────────────────
// A dead press: the fighter is free to act (no swing, no recovery, no stun, no
// scene), the chain cap is not what refused it, and still nothing started.
function deadPresses(weapon, gap) {
  return [`deadPresses ${weapon} ${gap}`, (arg) => {
    const { A, B } = RT.pair(arg.w, 'sword', arg.gap);
    let dead = 0, swings = 0, last = A._attackStartFrame; const at = [];
    for (let i = 0; i < 240; i++) {
      const free = !(A.attackTimer > 0) && !(A.attackEndlag > 0) && !(A.stunTimer > 0) && !(A.ragdollTimer > 0) &&
                   !(typeof MoveScene !== 'undefined' && MoveScene.isBusy(A)) && A.onGround;
      const capped = (A._basicChainN || 0) >= BASIC_CHAIN_MAX;
      A.attack(B);
      if (A._attackStartFrame !== last) { last = A._attackStartFrame; swings++; }
      else if (free && !capped) { dead++; if (at.length < 8) at.push(BalanceSim.frame() + ':cd' + A.cooldown); }
      BalanceSim.step(1);
      // Keep the target in place so the run is about timing, not spacing.
      B.x = A.x + A.w / 2 + arg.gap - B.w / 2; B.vx = 0;
    }
    return { pass: dead === 0 && swings > 3, detail: `${arg.w} gap ${arg.gap}: ${swings} swings, ${dead} dead presses ${at.join(' ')}` };
  }, { w: weapon, gap }];
}
for (const w of ['sword', 'spear', 'axe']) {
  const [, fn, arg] = deadPresses(w, 40);   check('recovery_gate_' + w, fn, 'sim', arg);
  const [, fn2, arg2] = deadPresses(w, 400); check('recovery_gate_' + w + '_whiff', fn2, 'sim', arg2);
}
check('whiff_still_costs', () => {
  const { A, B } = RT.pair('sword', 'sword', 400);
  const log = RT.pressLog(A, B, 120);
  if (log.length < 2) return { pass: false, detail: 'only ' + log.length + ' swings' };
  const s0 = log[0], gap = log[1].at - s0.at;
  // endlag recorded is already the x2.4 whiff value; it must be >= 2x the nominal one.
  const g = WEAPON_SWINGS.sword.moves, mv0 = g && g.string ? g.string[0] : null;
  const nominal = mv0 && mv0.endlag != null ? mv0.endlag : WEAPONS.sword.endlag;
  const need = s0.dur + Math.round(nominal * 2.4);
  return { pass: !s0.hit && gap >= need && s0.lockOk,
           detail: `whiff gap ${gap}f (need >= ${need}), endlag ${s0.endlag}, guard locked ${s0.lockOk}` };
});
check('bots_still_fight', () => {
  const r = BalanceSim.runMatch('warrior', 'warrior', 7, { stocks: 1, arena: 'flat', wA: 'sword', wB: 'sword' });
  return { pass: r.bug.stall === 0 && r.dmgA > 0 && r.dmgB > 0 && !r.err,
           detail: `stall ${r.bug.stall} dmgA ${Math.round(r.dmgA)} dmgB ${Math.round(r.dmgB)} frames ${r.frames} err ${r.err}` };
});


// ── Task 3: inputs are never silently eaten (real match, real key events) ────
check('double_press_in_recovery_fires', async () => {
  const { P1, P2 } = await RT.duel('sword');
  RT.face(P1, P2, 400);              // a whiff: long recovery to press into
  const k = P1.controls.attack;
  RT.tap(k);
  const s0 = P1._attackStartFrame;
  // Two presses in the last frames of recovery: once mashing, now just a buffered follow-up.
  await RT.until(() => P1.attackTimer === 0 && P1.attackEndlag > 0 && Math.max(P1.cooldown, P1.attackEndlag) <= 7, 80);
  RT.tap(k); await RT.frames(2); RT.tap(k);
  const ok = await RT.until(() => RT.free(P1), 120);
  const freeAt = frameCount;
  await RT.until(() => P1._attackStartFrame !== s0, 40);
  const lag = P1._attackStartFrame !== s0 ? P1._attackStartFrame - freeAt : 'never';
  return { pass: ok && P1._attackStartFrame !== s0 && lag <= 2, detail: `second swing ${lag}f after recovery ended` };
}, 'page');
check('buffer_10f', async () => {
  const { P1, P2 } = await RT.duel('sword');
  RT.face(P1, P2, 400);
  const k = P1.controls.attack;
  RT.tap(k);
  const s0 = P1._attackStartFrame;
  // Press once, 10 frames before recovery ends.
  await RT.until(() => P1.attackTimer === 0 && P1.attackEndlag > 0 && Math.max(P1.cooldown, P1.attackEndlag) <= 10, 80);
  const left = Math.max(P1.cooldown, P1.attackEndlag);
  RT.tap(k);
  await RT.until(() => P1._attackStartFrame !== s0, 40);
  return { pass: P1._attackStartFrame !== s0 && left >= 9, detail: `pressed ${left}f before recovery ended; fired ${P1._attackStartFrame !== s0}` };
}, 'page');


// ── Task 4: SWITCH IT UP becomes a 4-hit string that ends in a launch ───────
check('string_four_hits', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  const hits = RT.stringRun(A, B, 150);
  const run = hits.slice(0, 4);
  const ok = run.length === 4 && run[3].cn === 4 && run[3].kb >= 4 * run[2].kb;
  return { pass: ok, detail: hits.slice(0, 6).map(h => `@${h.at} cn${h.cn} kb${h.kb.toFixed(1)}`).join(' ') };
});
check('fifth_press_swings', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  settings.dmgNumbers = true;
  const texts = [];
  const push = damageTexts.push;
  damageTexts.push = function (...a) { for (const t of a) texts.push(t && String(t.amount)); return push.apply(this, a); };
  // Every press while free must swing, including the one after the string ends (once refused by the cap).
  let starts = 0, dead = 0, last = A._attackStartFrame;
  try {
    for (let i = 0; i < 150; i++) {
      const free = RT.free(A) && !(A.stunTimer > 0) && !MoveScene.isBusy(A) && A.onGround;
      A.attack(B);
      if (A._attackStartFrame !== last) { last = A._attackStartFrame; starts++; } else if (free) dead++;
      BalanceSim.step(1);
      B.x = A.x + A.w / 2 + 40 - B.w / 2; B.vx = 0;   // keep B in reach
    }
  } finally { damageTexts.push = push; settings.dmgNumbers = false; }
  const ok = dead === 0 && starts >= 5 && !texts.includes('SWITCH IT UP');
  return { pass: ok, detail: `${starts} swings, ${dead} dead presses; texts: ${[...new Set(texts.filter(t => isNaN(t)))].join(',')}` };
});
check('no_infinite', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  // Cornered: B against the right wall, A just inside reach.
  B.x = 900 - B.w - 2; A.x = B.x - 40 - A.w / 2 + B.w / 2; A.facing = 1;
  let stun = 0, worst = 0, maxCn = 0;
  RT.stringRun(A, B, 600, () => {
    stun = (B.stunTimer > 0 || B.ragdollTimer > 0) ? stun + 1 : 0;
    worst = Math.max(worst, stun); maxCn = Math.max(maxCn, A._comboHitCount || 0);
  });
  return { pass: worst <= 120, detail: `longest stun ${worst}f, longest combo ${maxCn}` };
});


// ── Task 5: Q cooldowns down 25% ────────────────────────────────────────────
check('q_cooldown_scaled', () => {
  const out = []; let ok = true;
  for (const w of ['sword', 'axe', 'spear', 'hammer']) {
    const { A, B } = RT.pair(w, 'sword', 60);
    A.ability(B);
    const got = A.abilityCooldown, want = Math.round(WEAPONS[w].abilityCooldown * 0.75);
    if (!(Math.abs(got - want) <= 1)) ok = false;
    out.push(`${w} ${got}/${want}`);
    BalanceSim.step(120);   // let the move scene end before the next world is built
  }
  return { pass: ok, detail: out.join(' ') };
});


// ── Task 6: two lives and more health in duels ──────────────────────────────
check('duel_hp_scaled', async () => {
  const { P1, P2 } = await RT.duel('sword', 'warrior', 'warrior');
  const ok = P1.maxHealth === 276 && P2.maxHealth === 276 && P1.lives === 2 && P2.lives === 2;
  return { pass: ok, detail: `P1 ${P1.maxHealth}hp ${P1.lives} lives, P2 ${P2.maxHealth}hp ${P2.lives} lives` };
}, 'page');
check('class_none_scaled', async () => {
  const { P1 } = await RT.duel('sword', 'none', 'warrior');
  return { pass: P1.maxHealth === 300 && P1.health === 300, detail: `class none: ${P1.health}/${P1.maxHealth}` };
}, 'page');
check('story_unscaled', () => {
  const f = new Fighter(300, 300, '#fff', 'sword'); applyClass(f, 'warrior');
  const gm = gameMode, st = storyModeActive;
  gameMode = '2p'; storyModeActive = true;
  try { if (typeof applyDuelHp === 'function') applyDuelHp(f); } finally { gameMode = gm; storyModeActive = st; }
  return { pass: typeof applyDuelHp === 'function' && f.maxHealth === 138, detail: `story warrior ${f.maxHealth}, applyDuelHp ${typeof applyDuelHp}` };
});
check('boss_unscaled', () => {
  const f = new Fighter(300, 300, '#fff', 'sword'); f.isBoss = true; f.maxHealth = f.health = 500;
  const gm = gameMode, st = storyModeActive;
  gameMode = '2p'; storyModeActive = false;
  try { if (typeof applyDuelHp === 'function') applyDuelHp(f); } finally { gameMode = gm; storyModeActive = st; }
  return { pass: typeof applyDuelHp === 'function' && f.maxHealth === 500, detail: `boss ${f.maxHealth}, applyDuelHp ${typeof applyDuelHp}` };
});
check('menu_defaults', () => {
  const sel = document.getElementById('livesSelect');
  const chip = document.querySelector('[data-onlinelives="2"]');
  const ok = chosenLives === 2 && sel && sel.value === '2' && chip && chip.classList.contains('active') &&
             document.querySelectorAll('.online-chip-btn.active[data-onlinelives]').length === 1;
  return { pass: ok, detail: `chosenLives ${chosenLives}, select ${sel && sel.value}, chip2 active ${chip && chip.classList.contains('active')}` };
}, 'page');
check('respawn_full', async () => {
  const { P1, P2 } = await RT.duel('sword', 'warrior', 'warrior');
  P2.health = 0;   // test-only: force a KO to watch the respawn
  await RT.until(() => P2.lives === 1 && P2.health > 0 && !(P2.respawnTimer > 0), 600);
  return { pass: P2.lives === 1 && P2.health === P2.maxHealth && P2.maxHealth === 276,
           detail: `after KO: lives ${P2.lives}, ${P2.health}/${P2.maxHealth}` };
}, 'page');


// Story sets its own lives per chapter (selectLives(ch.playerLives || 3)); the versus default must not reach it.
check('story_chapter_lives', async () => {
  const ch = (typeof STORY_CHAPTER_REGISTRY !== 'undefined') ? STORY_CHAPTER_REGISTRY.find(c => c && c.id === 4) : null;
  if (!ch || typeof _launchChapterWithGauntlet !== 'function') return { pass: false, detail: 'no chapter launcher' };
  try { skipTutorial(); } catch (e) {}
  _launchChapterWithGauntlet(ch);
  await RT.until(() => gameRunning && players[0] && players[0].lives > 0 && !(typeof gameLoading !== 'undefined' && gameLoading), 1800);
  await RT.frames(30);
  const p = players[0];
  const want = ch.playerLives || 3;
  return { pass: !!p && p.lives === want, detail: `chapter ${ch.id}: lives ${p && p.lives} (want ${want}), storyModeActive ${storyModeActive}, hp ${p && p.maxHealth}` };
}, 'page');


// The ladder never had the player below the rung's own lives: P1 keeps 3 (or the rung's p1Lives).
check('ladder_p1_lives', async () => {
  try { skipTutorial(); } catch (e) {}
  const r = 6, def = LADDER_RUNGS[r];
  startLadderRung(r, { def });
  await RT.until(() => gameRunning && players.length >= 2 && !(typeof gameLoading !== 'undefined' && gameLoading), 900);
  await RT.frames(30);
  const P1 = players[0], P2 = players[1], want = def.p1Lives || 3;
  return { pass: P1.lives === want && P2.lives === def.lives && P1.maxHealth > 200,
           detail: `rung ${r}: P1 ${P1.lives} lives (want ${want}) ${P1.maxHealth}hp, bot ${P2.lives} lives ${P2.maxHealth}hp` };
}, 'page');

// ═══ Stage 2 (docs/superpowers/plans/2026-11-26-fighting-rework-stage2.md) ═══

// ── Task 1: hit-confirm cancel into Q ───────────────────────────────────────
check('cancel_on_hits_1_to_3', () => {
  const out = []; let ok = true;
  for (let n = 1; n <= 3; n++) {
    const { A, B } = RT.pair('sword', 'sword', 40);
    const got = RT.landN(A, B, n);
    const inRec = A.attackEndlag > 0;
    A.ability(B);
    const fired = A.abilityCooldown > 0;
    if (!(got === n && inRec && fired)) ok = false;
    out.push(`n${n}: hits ${got} rec ${inRec} fired ${fired}`);
    BalanceSim.step(120);
  }
  return { pass: ok, detail: out.join('; ') };
});
check('no_cancel_on_hit_4', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  const got = RT.landN(A, B, 4);
  const inRec = A.attackEndlag > 0;
  A.ability(B);
  return { pass: got === 4 && inRec && A.abilityCooldown === 0, detail: `hits ${got} rec ${inRec} qcd ${A.abilityCooldown}` };
});
check('no_cancel_on_miss', () => {
  const { A, B } = RT.pair('sword', 'sword', 200);
  RT.whiff(A, B);
  const inRec = A.attackEndlag > 0;
  A.ability(B);
  return { pass: inRec && A.abilityCooldown === 0, detail: `rec ${inRec} qcd ${A.abilityCooldown}` };
});
check('cancel_not_on_block', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  B.shielding = true; B.shieldHP = 999; B._parryFresh = false; B.shieldHoldTimer = 60;
  const hp = B.health;
  A.attack(B);
  for (let i = 0; i < 60 && !(A.attackEndlag > 0); i++) { B.shielding = true; B._parryFresh = false; BalanceSim.step(1); }
  const inRec = A.attackEndlag > 0;
  A.ability(B);
  return { pass: inRec && B.health === hp && A.abilityCooldown === 0, detail: `rec ${inRec} dmg ${hp - B.health} qcd ${A.abilityCooldown}` };
});
check('cancel_clears_swing', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.landN(A, B, 1);
  A.ability(B);
  const fired = A.abilityCooldown > 0;
  const clean = A.attackEndlag === 0 && !(A._whiffGuardLock > frameCount) && A._hitCancelFrom == null;
  // The old swing must deal nothing more: every later hit on B is the Q's.
  let stray = 0, hp = B.health;
  for (let i = 0; i < 10; i++) {
    BalanceSim.step(1);
    if (B.health < hp && A._attackKindTier !== CLASH_TIER_ABILITY) stray++;
    hp = B.health;
  }
  return { pass: fired && clean && stray === 0,
           detail: `fired ${fired} endlag ${A.attackEndlag} guardLock ${A._whiffGuardLock > frameCount} from ${A._hitCancelFrom} stray ${stray}` };
});
// Qs that cannot reach a target stunned by hit 3 even with the stun hold, and why. Filled after measuring.
const Q_CONNECT_EXCEPTIONS = {};
check('q_connects_from_hit_3', (exc) => {
  const miss = [], ok = [], skip = [];
  for (const w of WEAPON_KEYS) {
    const wd = WEAPONS[w];
    if (!wd || wd.type !== 'melee' || wd.customAttack) { skip.push(w); continue; }
    const { A, B } = RT.pair(w, 'sword', 40);
    const got = RT.landN(A, B, 3);
    if (got < 3) { miss.push(w + '(string ' + got + ')'); BalanceSim.step(120); continue; }
    A.ability(B);
    const cd = A.abilityCooldown;
    let hp = B.health, hit = false;
    for (let i = 0; i < 90 && !hit; i++) {
      const stunned = B.stunTimer > 0 || B.ragdollTimer > 0;
      BalanceSim.step(1);
      if (B.health < hp && stunned) hit = true;
      hp = B.health;
    }
    if (cd > 0 && hit) ok.push(w); else if (!exc[w]) miss.push(w + (cd > 0 ? '' : '(no Q)'));
    BalanceSim.step(150);
  }
  return { pass: miss.length === 0, detail: `connect ${ok.length}; miss ${miss.join(',') || '-'}; excepted ${Object.keys(exc).join(',') || '-'}; skip ${skip.join(',')}` };
}, 'sim', Q_CONNECT_EXCEPTIONS);

// ── Task 2: super (E) follows the same rule ─────────────────────────────────
check('e_refused_after_miss', () => {
  const { A, B } = RT.pair('sword', 'sword', 200);
  RT.whiff(A, B); RT.fullMeter(A);
  const inRec = A.attackEndlag > 0;
  A.useSuper(B);
  return { pass: inRec && A.superReady === true, detail: `rec ${inRec} superReady ${A.superReady}` };
});
check('e_refused_after_hit_4', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  const got = RT.landN(A, B, 4); RT.fullMeter(A);
  const inRec = A.attackEndlag > 0;
  A.useSuper(B);
  return { pass: got === 4 && inRec && A.superReady === true, detail: `hits ${got} rec ${inRec} superReady ${A.superReady}` };
});
check('e_cancel_on_hit_2', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  const got = RT.landN(A, B, 2); RT.fullMeter(A);
  const inRec = A.attackEndlag > 0;
  A.useSuper(B);
  return { pass: got === 2 && inRec && A.superReady === false, detail: `hits ${got} rec ${inRec} superReady ${A.superReady}` };
});
check('burst_still_fires', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.fullMeter(B);
  RT.landN(A, B, 1);
  const stunned = B.stunTimer > 0;
  B.useSuper(A); BalanceSim.step(1); B.useSuper(A);
  return { pass: stunned && B.stunTimer === 0 && B.superMeter === 0, detail: `stunned ${stunned} stun ${B.stunTimer} meter ${B.superMeter}` };
});
check('boss_e_ungated', () => {
  const { A, B } = RT.pair('sword', 'sword', 200);
  A.isBoss = true;
  A.attackEndlag = 20; RT.fullMeter(A);
  A.useSuper(B);
  return { pass: A.superReady === false, detail: `boss superReady ${A.superReady}` };
});

// ── Task 3: Q and E pressed in recovery are buffered (real keys) ────────────
check('q_buffered_after_miss', () => RT.bufferedAfterMiss('ability'), 'page');
check('e_buffered_after_miss', () => RT.bufferedAfterMiss('super'), 'page');
check('q_cancel_by_key', async () => {
  const { P1, P2 } = await RT.duel('sword');
  RT.face(P1, P2, 40);
  const hp = P2.health;
  RT.tap(P1.controls.attack);
  await RT.until(() => P2.health < hp, 40);
  const hit = P2.health < hp;
  RT.tap(P1.controls.ability);
  return { pass: hit && P1.abilityCooldown > 0, detail: `hit ${hit}, Q fired on the press ${P1.abilityCooldown > 0}` };
}, 'page');
check('buffer_respects_story_lock', async () => {
  const { P1, P2 } = await RT.duel('sword');
  RT.face(P1, P2, 400);
  P1._storyNoAbility = true;
  RT.tap(P1.controls.attack);
  await RT.until(() => P1.attackTimer === 0 && P1.attackEndlag > 0 && P1.attackEndlag <= 5, 120);
  RT.tap(P1.controls.ability);
  await RT.frames(40);
  return { pass: P1.abilityCooldown === 0, detail: `qcd ${P1.abilityCooldown}` };
}, 'page');

// ── Task 4: wall escape only past a full string ─────────────────────────────
// Corner string with B pinned at the wall the whole time (the knockback would otherwise carry it out).
check('corner_string_lands', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.corner(A, B); const esc = RT.watchEscape(B);
  let hits = 0, hp = B.health;
  for (let i = 0; i < 200 && hits < 4; i++) {
    A.attack(B); BalanceSim.step(1);
    if (B.health < hp) hits++;
    hp = B.health;
    if (hits < 4) { B.x = 900 - B.w - 2; B.vx = 0; }
  }
  return { pass: hits === 4 && esc.n === 0, detail: `hits ${hits} escapes ${esc.n}` };
});
check('corner_3_plus_q_lands', () => {
  // The melee weapon whose Q lands the most separate hits in open space.
  let best = null, bestN = 0;
  for (const w of WEAPON_KEYS) {
    const wd = WEAPONS[w]; if (!wd || wd.type !== 'melee' || wd.customAttack) continue;
    const { A, B } = RT.pair(w, 'sword', 40);
    A.ability(B); let n = 0, hp = B.health;
    for (let i = 0; i < 120; i++) { BalanceSim.step(1); if (B.health < hp) n++; hp = B.health; B.x = A.x + A.w / 2 + 40 - B.w / 2; }
    if (n > bestN) { bestN = n; best = w; }
    BalanceSim.step(120);
  }
  const { A, B } = RT.pair(best, 'sword', 40);
  RT.corner(A, B); const esc = RT.watchEscape(B);
  const got = RT.landN(A, B, 3);
  B.x = 900 - B.w - 2; B.vx = 0;
  A.ability(B);
  let qh = 0, hp = B.health;
  for (let i = 0; i < 120; i++) { BalanceSim.step(1); if (B.health < hp) qh++; hp = B.health; if (B.x < 900 - B.w - 30) { B.x = 900 - B.w - 2; B.vx = 0; } }
  return { pass: got === 3 && qh >= 2 && esc.n === 0, detail: `${best} (Q ${bestN} hits open): string ${got}, Q hits ${qh}, escapes ${esc.n}` };
});
check('corner_string_plus_q_escapes', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.corner(A, B); const esc = RT.watchEscape(B);
  let hits = 0, hp = B.health;
  for (let i = 0; i < 200 && hits < 4; i++) {
    A.attack(B); BalanceSim.step(1);
    if (B.health < hp) hits++;
    hp = B.health;
    B.x = 900 - B.w - 2; B.vx = 0;
  }
  // Put B back at the wall in reach and Q as soon as A is free.
  let fired = false, qh = 0;
  for (let i = 0; i < 80; i++) {
    RT.corner(A, B); B.vy = Math.max(0, B.vy);
    if (!fired && !(A.attackEndlag > 0)) { A.ability(B); fired = A.abilityCooldown > 0; }
    BalanceSim.step(1);
    if (B.health < hp) qh++;
    hp = B.health;
    if (esc.n) break;
  }
  return { pass: hits === 4 && fired && esc.n === 1, detail: `hits ${hits} q ${fired} qhits ${qh} escapes ${esc.n}` };
});
check('trueform_wall_warp_3', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  B.isTrueForm = true;
  RT.corner(A, B); const esc = RT.watchEscape(B);
  let hits = 0, hp = B.health;
  for (let i = 0; i < 200 && hits < 3 && !esc.n; i++) {
    A.attack(B); BalanceSim.step(1);
    if (B.health < hp) hits++;
    hp = B.health;
    if (!esc.n) { B.x = 900 - B.w - 2; B.vx = 0; }
  }
  return { pass: hits === 3 && esc.n === 1, detail: `hits ${hits} escapes ${esc.n}` };
});
check('dot_not_counted', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.corner(A, B);
  B._wallComboHits = 0; B._wallComboTimer = 0;
  for (let i = 0; i < 6; i++) { dealDamage(A, B, 1, 0, 1, false, 0, true); B.invincible = 0; }
  return { pass: (B._wallComboHits || 0) === 0, detail: `wall hits after 6 DoT ticks: ${B._wallComboHits}` };
});

// ── Task 5: baitable burst, BURST label, bot burst timing ───────────────────
// A strings B to hit 2; B (full meter) bursts. guard: A raises its guard first.
check('burst_read', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.fullMeter(B);
  RT.landN(A, B, 2);
  // A drops its recovery and guards (test shortcut) as B bursts.
  A.attackEndlag = 0; A.attackTimer = 0; A._whiffGuardLock = 0;
  A.shieldHP = 999; A.shielding = true; A.vx = 0;
  const vx0 = A.vx, vy0 = A.vy;
  B.burst();
  const pushed = A.vx !== vx0 || A.vy !== vy0;
  const rec = B.attackEndlag, locked = _whiffGuardLocked(B), stun = B.stunTimer;
  const ok1 = !pushed && B.superMeter === 0 && rec >= BURST_READ_RECOVERY - 1 && locked && stun === 0;
  // The punish: A drops guard and swings; the sword lands on the read burster.
  A.shielding = false;
  B.invincible = 0;   // burst i-frames (8) run out well inside the read recovery
  let hp = B.health, landed = false;
  BalanceSim.step(BURST_IFRAMES);
  for (let i = 0; i < 30 && !landed; i++) {
    A.attack(B); BalanceSim.step(1);
    if (B.health < hp) landed = true;
    B.x = A.x + A.w / 2 + 40 - B.w / 2; B.vx = 0;
  }
  return { pass: ok1 && landed, detail: `A pushed ${pushed}, meter ${B.superMeter}, rec ${rec}/${typeof BURST_READ_RECOVERY !== 'undefined' ? BURST_READ_RECOVERY : '?'}, guardLock ${locked}, stun ${stun}, punish landed ${landed}` };
});
check('burst_unread', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.fullMeter(B);
  RT.landN(A, B, 2);
  A.shielding = false;
  B.burst();
  return { pass: Math.abs(A.vx) >= BURST_KB_X - 1 && !(B.attackEndlag > 0), detail: `A vx ${A.vx.toFixed(1)}, B endlag ${B.attackEndlag}` };
});
check('burst_label', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  settings.dmgNumbers = true;
  const texts = [], push = damageTexts.push;
  damageTexts.push = function (...a) { for (const t of a) texts.push(t && String(t.amount)); return push.apply(this, a); };
  try { RT.fullMeter(B); RT.landN(A, B, 2); B.burst(); }
  finally { damageTexts.push = push; settings.dmgNumbers = false; }
  return { pass: texts.includes('BURST'), detail: `texts: ${texts.filter(t => isNaN(t)).join(',') || '-'}` };
});
check('bot_burst_hit3', () => {
  let reach3 = 0, burst3 = 0, early = 0, strings = 0;
  for (let k = 0; k < 200; k++) {
    const { A, B } = RT.pair('sword', 'sword', 40);
    B.isAI = true; B.aiDiff = 'hard'; B.target = A; RT.fullMeter(B);
    let maxCn = 0, burstAt = null, ready3 = false;
    const orig = B.burst.bind(B);
    B.burst = function () { if (burstAt == null) burstAt = A._comboHitCount || 0; return orig(); };
    for (let i = 0; i < 150 && burstAt == null; i++) {
      if (burstAt == null) RT.fullMeter(B);   // the stock AI would otherwise spend it on a plain super
      A.attack(B); BalanceSim.step(1);
      const cn = A._comboHitCount || 0;
      if (cn >= 3 && maxCn < 3) ready3 = B.superReady && B.stunTimer > 0;   // the bot could still burst at hit 3
      maxCn = Math.max(maxCn, cn);
      if (!(B.ragdollTimer > 0)) { B.x = A.x + A.w / 2 + 40 - B.w / 2; B.vx = 0; }
      if (maxCn >= 4 && !(B.stunTimer > 0)) break;
    }
    if (maxCn >= 1) strings++;
    if (burstAt != null && burstAt < 3) early++;
    if (maxCn >= 3 && (ready3 || burstAt != null)) { reach3++; if (burstAt != null && burstAt >= 3) burst3++; }
    BalanceSim.step(60);
  }
  const rate = reach3 ? burst3 / reach3 : 0;
  return { pass: early === 0 && reach3 >= 10 && rate >= 0.3 && rate <= 0.7,
           detail: `strings ${strings}, early bursts ${early}, reached 3: ${reach3}, burst after 3: ${burst3} (${(rate * 100).toFixed(0)}%)` };
});

// ── Task 6: hard and expert bots use the cancel ─────────────────────────────
check('bot_cancels_hard', () => { const r = RT.botCancels('hard', 4800); return { pass: r.taught >= 1, detail: 'hard ' + r.txt }; });
check('bot_cancels_expert', () => { const r = RT.botCancels('expert', 4800); return { pass: r.taught >= 1, detail: 'expert ' + r.txt }; });
check('bot_no_cancel_medium', () => { const r = RT.botCancels('medium', 2400); return { pass: typeof botHitCancel === 'function' && r.taught === 0, detail: 'medium ' + r.txt }; });
check('bot_cancels_legacy', () => { const r = RT.botCancels('hard', 4800, true); return { pass: r.taught >= 1, detail: 'hard, no tactics layer: ' + r.txt }; });

// ── Task 7: interruption probe — fast attacker vs live hard/medium bots, middle and wall, meter full/empty ──
check('probe_strings', () => {
  const rows = []; let bad = 0;
  for (const diff of ['hard', 'medium']) for (const wall of [false, true]) for (const meter of [true, false]) {
    let full = 0, burst = 0, early = 0, esc = 0, n = 0, gb = 0, other = [];
    const gbOrig = window.guardBurst; let gbHit;
    window.guardBurst = function (f) { const r = gbOrig(f); if (r) gbHit = true; return r; };
    for (let k = 0; k < 30; k++) {
      gbHit = false;
      const { A, B } = RT.pair('sword', 'sword', 40);
      B.isAI = true; B.aiDiff = diff; B.target = A;
      if (wall) RT.corner(A, B);
      const w = RT.watchEscape(B);
      let burstAt = null; const orig = B.burst.bind(B);
      B.burst = function () { if (burstAt == null) burstAt = A._comboHitCount || 0; return orig(); };
      let hits = 0, hp = B.health;
      for (let i = 0; i < 150 && hits < 4 && burstAt == null && !w.n; i++) {
        if (meter) RT.fullMeter(B); else { B.superMeter = 0; B.superReady = false; }
        A.attack(B); BalanceSim.step(1);
        if (B.health < hp) hits++;
        hp = B.health;
        if (hits < 4) { B.x = wall ? 900 - B.w - 2 : A.x + A.w / 2 + 40 - B.w / 2; B.vx = 0; }
      }
      if (hits >= 1) n++;
      if (hits === 4) full++;
      if (burstAt != null) { burst++; if (burstAt < 3) early++; }
      if (w.n) esc++;
      if (gbHit) gb++;
      if (hits >= 1 && hits < 4 && burstAt == null && !gbHit && other.length < 3)
        other.push('h' + hits + (B.shielding ? ' guard' : '') + (B.invincible > 0 ? ' inv' : '') + (A.stunTimer > 0 ? ' Astun' : '') + (B.ragdollTimer > 0 ? ' Brag' : ''));
      BalanceSim.step(60);
    }
    window.guardBurst = gbOrig;
    if (early || esc) bad++;
    rows.push(`${diff}/${wall ? 'wall' : 'mid'}/${meter ? 'full' : 'empty'}: ${full}/${n} land 4, burst ${burst} (early ${early}), guard bursts ${gb}, escapes ${esc}; other ${other.join(',') || '-'}`);
  }
  return { pass: bad === 0, detail: rows.join(' | ') };
});

// ── Final review fixes ──────────────────────────────────────────────────────
check('hold_skips_boss', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.landN(A, B, 3);
  B.isBoss = true; B.stunTimer = 5;
  A.ability(B);
  const st = B.stunTimer; B.isBoss = false;
  return { pass: A.abilityCooldown > 0 && st <= 5, detail: `boss stun after cancel ${st} (was 5)` };
});
check('hold_skips_stun_guard', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.landN(A, B, 3);
  B.stunTimer = 5; B._stunGuardUntil = frameCount + 30;
  A.ability(B);
  return { pass: A.abilityCooldown > 0 && B.stunTimer <= 5, detail: `stun ${B.stunTimer} inside no-restun window` };
});
check('clash_closes_cancel', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.landN(A, B, 1);
  const C = new Fighter(A.x, A.y, '#0f0', 'sword');
  C.health = C.maxHealth = 100; A._clashCd = 0; C._clashCd = 0;
  const pre = { cd: A._clashCd, hp: C.health };
  A._resolveClash(C);
  if (!(A.attackEndlag > 0)) return { pass: false, detail: 'clash did not apply ' + JSON.stringify(pre) };
  A.ability(B);
  return { pass: A.attackEndlag > 0 && A.abilityCooldown === 0, detail: `after clash: endlag ${A.attackEndlag} qcd ${A.abilityCooldown}` };
});
check('burst_read_by_attacker_only', () => {
  const { A, B } = RT.pair('sword', 'sword', 40);
  RT.fullMeter(B);
  RT.landN(A, B, 2);
  A.shielding = false;
  // A guarding hostile bystander next to B, not the one who hit it.
  const C = new Fighter(B.x + 30, B.y, '#0f0', 'sword');
  C.shielding = true; C.shieldHP = 999; C.team = A.team; C.isAI = false; players.push(C);
  try { B.burst(); } finally { players.splice(players.indexOf(C), 1); }
  return { pass: !(B.attackEndlag > 0) && Math.abs(A.vx) >= BURST_KB_X - 1, detail: `B endlag ${B.attackEndlag}, A vx ${A.vx.toFixed(1)}` };
});
check('q_buffered_early_in_whiff', async () => {
  const { P1, P2 } = await RT.duel('hammer');
  RT.face(P1, P2, 400);
  RT.tap(P1.controls.attack);
  await RT.until(() => P1.attackTimer === 0 && P1.attackEndlag > 20, 120);
  const left = P1.attackEndlag;
  RT.tap(P1.controls.ability);
  await RT.until(() => !(P1.attackEndlag > 0), 90);
  const e0 = frameCount;
  await RT.until(() => P1.abilityCooldown > 0, INPUT_BUFFER_FRAMES + 4);
  return { pass: P1.abilityCooldown > 0, detail: 'pressed ' + left + 'f before recovery ended; fired ' + (P1.abilityCooldown > 0 ? (frameCount - e0) + 'f after' : 'never') };
}, 'page');

// ── Clash bind (js/smb-clash-bind.js) ──
// The bind locks both, then throws each back CLASH_BIND_DIST px. Measure the real distances.
check('clash_bind_throwback', () => {
  if (typeof clashBindStart !== 'function') return { pass: false, detail: 'smb-clash-bind.js not loaded' };
  const { A, B } = RT.pair('sword', 'sword', 70);
  A._clashCd = B._clashCd = 0;
  A._resolveClash(B);
  const bound = !!(A._clashAnim && B._clashAnim);
  let lockGap = null, n = 0;
  for (; n < 90 && (A._clashAnim || B._clashAnim); n++) {
    BalanceSim.step(1);
    if (A._clashAnim && A._clashAnim.t === CLASH_BIND_LOCK) lockGap = Math.abs(A.cx() - B.cx());
  }
  BalanceSim.step(20);
  const endGap = Math.abs(A.cx() - B.cx());
  const each = lockGap == null ? 0 : (endGap - lockGap) / 2;
  const clean = !A._clashAnim && !B._clashAnim && !A._movePose && !B._movePose;
  return { pass: bound && clean && each > 40 && each < 62,
           detail: `bound ${bound}, lock gap ${lockGap && lockGap.toFixed(0)}, end gap ${endGap.toFixed(0)}, each thrown ${each.toFixed(1)}px (target 51), done in ${n}f, clean ${clean}` };
});
check('clash_bind_broken_by_hit', () => {
  const { A, B } = RT.pair('sword', 'sword', 70);
  A._clashCd = B._clashCd = 0;
  A._resolveClash(B);
  BalanceSim.step(3);
  B.hurtTimer = 10;   // a third party hit B mid-lock
  BalanceSim.step(2);
  const freed = !B._clashAnim && !B._movePose;
  // A skips straight to its throw-back and finishes on its own.
  for (let i = 0; i < 40 && A._clashAnim; i++) BalanceSim.step(1);
  return { pass: freed && !A._clashAnim && !A._movePose, detail: `B freed ${freed}, A done ${!A._clashAnim}` };
});
// A human proxy walking in and swinging when in reach, against a live bot: how many
// exchanges where both swings were live and pointed at each other became clashes.
check('clash_rate_vs_bot', (diff) => {
  const { A, B } = RT.pair('sword', 'sword', 120);
  B.isAI = true; B.aiDiff = diff || 'hard'; B.target = A;
  let clashes = 0, meets = 0, swings = 0, next = 0;
  const orig = Fighter.prototype._resolveClash;
  const deltas = [];
  Fighter.prototype._resolveClash = function (o) { if (!this._clashCd && !(o && o._clashCd)) { clashes++; deltas.push((A._attackStartFrame||0) - (B._attackStartFrame||0)); } return orig.call(this, o); };
  let both = false; const meet = { y: 0, n: 0 };
  const om = Fighter.prototype._clashArcsMeet;
  Fighter.prototype._clashArcsMeet = function (o) { const r = om.call(this, o); if (r) meet.y++; else meet.n++; return r; };
  try {
    for (let i = 0; i < 9000; i++) {
      const d = B.cx() - A.cx(), dir = Math.sign(d) || 1;
      A.facing = dir;
      if (!A._clashAnim && !(A.attackTimer > 0) && !(A.attackEndlag > 0)) A.vx = Math.abs(d) > 62 ? dir * 3.2 : 0;
      if (i >= next && Math.abs(d) < 80) { const s0 = A._attackStartFrame; A.attack(B); if (A._attackStartFrame !== s0) { swings++; next = i + 16 + Math.floor(Math.random() * 26); } }
      // An exchange: both swings live and facing each other at once.
      const now = A.attackTimer > 0 && B.attackTimer > 0 && A.facing === -B.facing && Math.abs(d) < 110;
      if (now && !both) meets++;
      both = now;
      BalanceSim.step(1);
      A.health = A.maxHealth; B.health = B.maxHealth;
      if (A.x < 120 || A.x > 760 || B.x < 120 || B.x > 760) { A.x = 330; B.x = 470; A.vx = B.vx = 0; }
    }
  } finally { Fighter.prototype._resolveClash = orig; Fighter.prototype._clashArcsMeet = om; }
  return { pass: true, detail: `arcs meet ${meet.y} / rejected ${meet.n}; ${diff || 'hard'}: ${clashes} clashes / ${meets} two-swing exchanges / ${swings} swings; A-B start deltas ${deltas.join(',')}` };
});


// ── Revive (js/smb-revive.js): the body that fell is the one that gets up ──
// Real match: KO P2 on the floor, then watch the respawn. Rise mode, near the body, one body.
check('revive_rises_where_body_lies', async () => {
  const { P1, P2 } = await RT.duel('sword');
  await RT.until(() => !(P2.invincible > 0), 240);
  P1.isAI = P2.isAI = false;
  RT.reviveStage(P1, P2);
  const lives0 = P2.lives;
  P2.invincible = 0; P2.health = 0;
  await RT.until(() => P2._reviveAnim, 200);
  const c = P2._reviveAnim;
  if (!c) return { pass: false, detail: 'no revive started; lives ' + lives0 + '->' + P2.lives };
  const mode = c.mode, x0 = P2.cx();
  const corpses = verletRagdolls.filter(v => v.color === P2.color).length;
  const lyingInv = P2.invincible > 0;
  await RT.until(() => !P2._reviveAnim, 120);
  const done = !P2._reviveAnim && !P2._movePose && !P2._finSquash && !P2._hideWeapon;
  return { pass: mode === 'rise' && corpses === 0 && lyingInv && done && P2.lives === lives0 - 1 && P2.health === P2.maxHealth,
           detail: `mode ${mode}, corpses left ${corpses}, rose at x ${x0.toFixed(0)}, invincible while down ${lyingInv}, finished clean ${done}, lives ${lives0}->${P2.lives}` };
}, 'page');
check('revive_leaps_back_after_fall', async () => {
  const { P1, P2 } = await RT.duel('sword');
  await RT.until(() => !(P2.invincible > 0), 240);
  P1.isAI = P2.isAI = false;
  P2.invincible = 0; P2.y = GAME_H + 200; P2.vy = 4;   // under the kill plane: the fall KO
  await RT.until(() => P2._reviveAnim, 260);
  const c = P2._reviveAnim;
  if (!c) return { pass: false, detail: 'no revive started' };
  const mode = c.mode, sx = c.sx, lx = c.lx;
  await RT.until(() => !P2._reviveAnim, 120);
  const landed = Math.abs(P2.x - lx) < 2 && P2.health > 0 && !P2.backstageHiding;
  return { pass: mode === 'leap' && landed, detail: `mode ${mode}, from x ${sx.toFixed(0)} to ${lx.toFixed(0)}, landed ${landed}` };
}, 'page');
check('revive_flat_after_slam', async () => {
  const { P1, P2 } = await RT.duel('sword');
  await RT.until(() => !(P2.invincible > 0), 240);
  P1.isAI = P2.isAI = false;
  RT.reviveStage(P1, P2);
  P2._reviveFlat = true; P2.invincible = 0; P2.health = 0;
  await RT.until(() => P2._reviveAnim, 200);
  const c = P2._reviveAnim;
  if (!c) return { pass: false, detail: 'no revive started' };
  let minY = 9, maxY = 0;
  await RT.until(() => { if (P2._finSquash) { minY = Math.min(minY, P2._finSquash.y, P2._finSquash.x); maxY = Math.max(maxY, P2._finSquash.y); } return !P2._reviveAnim; }, 120);
  return { pass: c.flat && minY < 0.5 && maxY > 1.1 && !P2._finSquash, detail: `flat ${c.flat}, thinnest ${minY.toFixed(2)}, pop overshoot ${maxY.toFixed(2)}` };
}, 'page');

// End to end: a real PANCAKE (frying pan Q) kill with a life left, then the flat revive.
check('revive_flat_after_pancake', async () => {
  const { P1, P2 } = await RT.duel('fryingpan');
  await RT.until(() => !(P2.invincible > 0), 240);
  settings.finishers = true;
  P1.isAI = P2.isAI = false;
  RT.reviveStage(P1, P2);
  P1.x = P2.x - 46; P1.facing = 1; P2.facing = -1;
  P2.health = 1; P2.invincible = 0; P1.abilityCooldown = 0; P1.cooldown = 0; P1.attackEndlag = 0;
  P1.ability(P2);
  const fin = await RT.until(() => activeFinisher || P2.health <= 0, 120);
  const name = activeFinisher && activeFinisher.def ? (activeFinisher.def.name || '?') : (activeFinisher ? 'on' : 'none');
  await RT.until(() => P2._reviveAnim, 900);
  const c = P2._reviveAnim;
  return { pass: !!(c && c.flat), detail: `finisher ${name}, revive ${c ? c.mode : 'none'} flat ${c && c.flat}` };
}, 'page');

// HOLE IN ONE (frying pan E) drives them out of the sky: the revive should be the leap back in.
check('revive_leap_after_hole_in_one', async () => {
  const { P1, P2 } = await RT.duel('fryingpan');
  await RT.until(() => !(P2.invincible > 0), 240);
  settings.finishers = true;
  P1.isAI = P2.isAI = false;
  RT.reviveStage(P1, P2);
  P1.x = P2.x - 46; P1.facing = 1; P2.facing = -1;
  P2.health = 1; P2.invincible = 0; RT.fullMeter(P1); P1.cooldown = 0; P1.attackEndlag = 0;
  P1.useSuper(P2);
  await RT.until(() => activeFinisher || P2.health <= 0, 120);
  const name = activeFinisher && activeFinisher.def ? (activeFinisher.def.name || '?') : (activeFinisher ? 'on' : 'none');
  let seen = null;
  await RT.until(() => { if (P2._death && !seen) seen = 1; return P2._reviveAnim; }, 900);
  const c = P2._reviveAnim;
  const where = `${P2.cx().toFixed(0)},${P2.y.toFixed(0)}`;
  return { pass: !!(c && c.mode === 'leap'), detail: `finisher ${name}, revive ${c ? c.mode : 'none'} (body at ${where})` };
}, 'page');

// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  const server = await new Promise(res => {
    const s = http.createServer((rq, rs) => {
      let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); return rs.end(); }
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rs);
    }).listen(PORT, () => res(s));
  });
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const lo = { headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) lo.executablePath = chrome;
  const browser = await puppeteer.launch(lo);
  const page = await browser.newPage();
  let errs = [];
  page.on('pageerror', e => errs.push(e.message + (args.stack ? ' @ ' + String(e.stack).split('\n').slice(1,4).join(' | ') : '')));
  const SIM = fs.readFileSync(path.join(ROOT, 'tools', 'class-balance.js'), 'utf8').match(/const SIM_SRC = `([\s\S]*?)\n`;/)[1];
  async function boot() {
    await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`, { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.evaluate(() => { try { if (typeof backToHome === 'function') backToHome(); } catch (e) {} });
    await page.addScriptTag({ content: SIM });
    await page.addScriptTag({ content: HELPERS });
  }
  const todo = CHECKS.filter(c => !args.only || String(args.only).split(',').includes(c.name));
  if (!todo.length) { console.log('no check named', args.only); process.exit(1); }
  let fails = 0, booted = false;
  for (const c of todo) {
    if (!booted || c.kind === 'page') { await boot(); booted = true; }
    errs = [];
    let r;
    try {
      // Sim checks stop the live loop before returning: a sim world has no sky, and drawing it throws (stage 2).
      const fn = c.kind === 'page' ? c.fn
        : new Function('arg', 'try { return (' + c.fn.toString() + ')(arg); } finally { gameRunning = false; }');
      r = await page.evaluate(fn, c.arg === undefined ? null : c.arg);
    } catch (e) { r = { pass: false, detail: 'threw: ' + e.message.split('\n')[0] }; }
    if (r && r.pass && errs.length) r = { pass: false, detail: 'page error: ' + errs[0] };
    if (r && r.pass) console.log('PASS', c.name, r.detail ? '(' + r.detail + ')' : '');
    else { fails++; console.log('FAIL', c.name + ':', r ? r.detail : 'no result'); }
  }
  await browser.close(); server.close();
  console.log(fails ? `${fails} failed` : `all ${todo.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
