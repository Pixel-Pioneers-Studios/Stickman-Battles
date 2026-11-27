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
  page.on('pageerror', e => errs.push(e.message));
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
      r = await page.evaluate(c.fn, c.arg === undefined ? null : c.arg);
    } catch (e) { r = { pass: false, detail: 'threw: ' + e.message.split('\n')[0] }; }
    if (r && r.pass && errs.length) r = { pass: false, detail: 'page error: ' + errs[0] };
    if (r && r.pass) console.log('PASS', c.name, r.detail ? '(' + r.detail + ')' : '');
    else { fails++; console.log('FAIL', c.name + ':', r ? r.detail : 'no result'); }
  }
  await browser.close(); server.close();
  console.log(fails ? `${fails} failed` : `all ${todo.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
