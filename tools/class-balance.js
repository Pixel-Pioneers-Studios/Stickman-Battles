'use strict';
/*
 * tools/class-balance.js — CLASS-VS-CLASS WIN-RATE MATRIX (DEV ONLY)
 *
 * The question this answers: with the brain, the map and the AI difficulty held
 * identical on both sides, which CLASS wins? Every difference in the result is
 * then attributable to class hp/speed/perk and the class's signature weapon,
 * because nothing else differs.
 *
 * Zero game-code changes: the sim is injected into the loaded page with
 * addScriptTag, so it runs as a classic script and shares the game's top-level
 * lexical scope (`players`, `gameRunning`, `currentArena` are script-scoped
 * `let`s, NOT window properties — a page.evaluate closure can read them but a
 * `window.x =` assignment does not reach them).
 *
 * Honest scope, stated up front:
 *   · Both sides run the stock Fighter AI at the same aiDiff. That AI is not a
 *     human and has known blind spots (whiff-guard holds swings, it does not
 *     bait, it does not wall-combo). A class whose strength is a read a human
 *     makes and this AI does not will UNDER-perform here.
 *   · The default arena is a flat full-width floor with no hazards and no
 *     ledges, so this measures the damage race ONLY. Ring-out pressure is a
 *     real and large part of the game (knockback classes gain, lights lose) and
 *     is deliberately excluded so map choice cannot confound the stat read.
 *     --arena=ledge adds edges back as a second, separate measurement.
 *   · Classes with no signature weapon (none/warrior/berserker/summoner) are
 *     given the sword so the weapon is held constant across them.
 *
 * Usage:
 *   node tools/class-balance.js [--matches=12] [--stocks=3] [--arena=flat|ledge]
 *                               [--diff=hard] [--port=8121]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MATCHES = parseInt(args.matches, 10) || 12;
const STOCKS  = parseInt(args.stocks, 10)  || 3;
const ARENA   = String(args.arena || 'flat');
const DIFF    = String(args.diff  || 'hard');
// Measured dmg rates land ~15-70 per 1000 frames, so 3 stocks of ~130hp needs
// well over 5400 frames to resolve. A capped match has no winner and dilutes
// every rate in the table, so the cap is set high enough to be rare.
const FRAMES  = parseInt(args.frames, 10)   || 18000;
const PORT    = parseInt(args.port, 10)    || 8121;
const ROOT    = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };

function startServer() {
  return new Promise(res => {
    const s = http.createServer((req, rs) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rs);
    });
    s.listen(PORT, () => res(s));
  });
}
const log = (...a) => console.log('[bal]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── The injected sim ────────────────────────────────────────────────────────
// Runs as a classic <script>, so bare assignment reaches the game's lexical
// globals. Everything it touches is restored by the next _env() call, and the
// page is thrown away at the end regardless.
const SIM_SRC = `
window.BalanceSim = (function () {
  // Two arenas, and the difference between them is the whole point:
  //   flat  — walled box, no ledges. Pure damage race, no ring-outs.
  //   ledge — inset floor with open sides. Knockback can now kill.
  // Fighter.update() has NO horizontal clamp on a standard arena and kills by
  // falling ONLY via currentArena.deathY -- and this.y > undefined is always
  // false. An arena missing both lets fighters walk off the floor and drift
  // sideways forever, neither dying nor re-engaging — which silently turned
  // ~70% of an earlier sweep into unresolved frame-cap matches.
  const ARENAS_SIM = {
    flat: { platforms: [{ x: 0, y: 460, w: 900, h: 60, isFloor: true }],
            // worldWidth === GAME_W makes mapLeft/mapRight resolve to 0/900,
            // i.e. hard walls, without setting isBossArena (which changes AI).
            worldWidth: 900, deathY: 520 + 200 },
    ledge: { platforms: [{ x: 150, y: 460, w: 600, h: 60, isFloor: true }],
             deathY: 520 + 60 },
    // Wide: a walled box 2400 across instead of 900. Exists as a CONTROL for the
    // ranged result. If ranged weapons are weak on their stats, extra room
    // changes nothing; if they are weak because this AI never kites, room to
    // retreat is exactly what they were missing. The two hypotheses predict
    // opposite things here, which is the point.
    wide: { platforms: [{ x: -750, y: 460, w: 2400, h: 60, isFloor: true }],
            worldWidth: 2400, deathY: 520 + 200 },
  };

  function _rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  function _env(arenaKind) {
    const noop = () => {};
    const spec = ARENAS_SIM[arenaKind] || ARENAS_SIM.flat;
    currentArena = Object.assign({ id: 'balancesim', name: 'Balance Sim', bgColor: '#101018' },
                                 spec, { platforms: spec.platforms.map(p => Object.assign({}, p)) });
    players.length = 0;
    if (typeof minions         !== 'undefined') minions.length         = 0;
    if (typeof trainingDummies !== 'undefined') trainingDummies.length = 0;
    if (typeof verletRagdolls  !== 'undefined') verletRagdolls.length  = 0;
    if (typeof projectiles     !== 'undefined') projectiles.length     = 0;
    if (typeof damageTexts     !== 'undefined') damageTexts.length     = 0;
    hitStopFrames = 0; slowMotion = 1; screenShake = 0;
    isCinematic = false; activeCinematic = null; storyModeActive = false;
    gameRunning = true; gameMode = 'versus'; onlineMode = false;
    if (typeof trainingMode      !== 'undefined') trainingMode      = false;
    if (typeof trainingChaosMode !== 'undefined') trainingChaosMode = false;
    if (typeof activeFinisher    !== 'undefined') activeFinisher    = null;
    if (typeof qteActive         !== 'undefined') qteActive         = false;
    if (typeof settings !== 'undefined') { settings.finishers = false; settings.dmgNumbers = false; }
    if (typeof combatLock !== 'undefined' && combatLock && combatLock.blocks) {
      Object.keys(combatLock.blocks).forEach(k => { combatLock.blocks[k] = false; });
    }
    window.spawnParticles = noop; window.showBossDialogue = noop;
    // spawnBullet is deliberately NOT stubbed: it is the only damage path for
    // every ranged weapon, and stubbing it made archer/gunner deal exactly 0.
    if (typeof unlockAchievement  !== 'undefined') window.unlockAchievement  = noop;
    if (typeof pickSafeSpawn      !== 'undefined') window.pickSafeSpawn      = () => null;
    if (typeof spawnLightningBolt !== 'undefined') window.spawnLightningBolt = noop;
    if (typeof isCombatLocked     !== 'undefined') window.isCombatLocked     = () => false;
    if (typeof isCutsceneActive   !== 'undefined') window.isCutsceneActive   = () => false;
    if (typeof SoundManager !== 'undefined') {
      for (const k of Object.keys(SoundManager)) if (typeof SoundManager[k] === 'function') SoundManager[k] = noop;
    }
  }

  // Weapon held constant for classes that do not carry a signature one.
  const FALLBACK_WEAPON = 'sword';
  function weaponFor(key) {
    const c = CLASSES[key];
    return (c && c.weapon) ? c.weapon : FALLBACK_WEAPON;
  }

  function build(key, x, color, diff, stocks, wOverride) {
    const f = new Fighter(x, 380, color, wOverride || weaponFor(key));
    f.isAI = true;
    f.aiDiff = diff;               // NOTE: compared as a STRING downstream — keep it a known tier
    f.intelligence = 0.92;
    f.lives = stocks;
    f.name = key.toUpperCase();
    // applyClass sets hp/speed/charClass and is what every perk hook keys off.
    if (key !== 'none') applyClass(f, key);
    if (wOverride && WEAPONS[wOverride]) { f.weapon = WEAPONS[wOverride]; f.weaponKey = wOverride; }
    // applyClass only force-sets the weapon for megaknight; everyone else keeps
    // the one the ctor took, which is already the class's signature weapon.
    f._teamId = 'sim_' + key + '_' + x;
    return f;
  }

  // One match. Returns the stock differential from A's point of view plus the
  // process stats, so a win can be told apart from a win that was nearly a loss.
  function runMatch(keyA, keyB, seed, opts) {
    const o = opts || {};
    const stocks = o.stocks || 3, diff = o.diff || 'hard';
    const MAX_FRAMES = o.maxFrames || 18000;
    const swap = !!o.swap;   // swap spawn sides to cancel positional bias
    _env(o.arena);
    const rng = _rng(seed);
    const xA = swap ? 620 : 280, xB = swap ? 280 : 620;
    const A = build(keyA, xA, '#00d4ff', diff, stocks, o.wA);
    const B = build(keyB, xB, '#ff4444', diff, stocks, o.wB);
    A.target = B; B.target = A;
    players.length = 0; players.push(A, B);

    let dmgA = 0, dmgB = 0, lockA = 0, lockB = 0, deathsA = 0, deathsB = 0;
    let pvA = A.health, pvB = B.health, frames = 0, err = null;

    for (let fr = 0; fr < MAX_FRAMES; fr++) {
      hitStopFrames = 0; slowMotion = 1; aiTick = fr; frameCount = fr;
      frames = fr + 1;
      A.target = B; B.target = A;
      // Update order is ALTERNATED every frame. It is not cosmetic: with a fixed
      // order the mirror control read 0-16 for ten of thirteen classes, i.e.
      // whoever updates SECOND wins essentially every melee trade (it acts on a
      // state the first fighter has already committed to). Fixed-order results
      // measure that artifact, not the class. Ranged mirrors sat near 50% —
      // which is exactly the tell, since a projectile resolves on a later frame
      // and so does not care who moved first.
      const order = (fr % 2 === 0) ? [A, B] : [B, A];
      for (const f of order) {
        try { f.update(); } catch (e) { if (!err) err = (f === A ? 'A:' : 'B:') + e.message; }
      }
      // gameLoop owns these two, not Fighter.update(). Without them a bow shot
      // hangs in the air forever and a Summoner familiar never acts.
      try {
        projectiles.forEach(pr => pr.update());
        projectiles = projectiles.filter(pr => pr.active);
        minions.forEach(mn => { if (mn.health > 0) mn.update(); });
        minions = minions.filter(mn => mn.health > 0);
      } catch (e) { if (!err) err = 'world:' + e.message; }
      if (A.stunTimer > 0 || A.ragdollTimer > 0) lockA++;
      if (B.stunTimer > 0 || B.ragdollTimer > 0) lockB++;
      if (A.health < pvA) dmgB += pvA - A.health;   // damage DEALT BY B
      if (B.health < pvB) dmgA += pvB - B.health;
      pvA = A.health; pvB = B.health;

      let over = false;
      for (const [f, other] of [[A, B], [B, A]]) {
        if (f.health > 0) continue;
        if (f === A) deathsA++; else deathsB++;
        f.lives--;
        if (f.lives <= 0) { over = true; break; }
        try { f.onDeath(); } catch (_) {}
        f.health = f.maxHealth;
        f.x = other.cx() < 450 ? 600 + Math.floor(rng() * 120) : 180 + Math.floor(rng() * 120);
        f.y = 380; f.vx = f.vy = 0;
        f.ragdollTimer = f.stunTimer = f.hurtTimer = 0;
        f.shielding = false; f.state = 'idle';
      }
      pvA = A.health; pvB = B.health;
      if (over) break;
    }
    players.length = 0; gameRunning = false;
    return { a: keyA, b: keyB, frames, err,
             stockDiff: deathsB - deathsA, deathsA, deathsB,
             dmgA, dmgB, lockA, lockB,
             hpA: A.maxHealth, hpB: B.maxHealth,
             timeout: frames >= MAX_FRAMES };
  }

  return { runMatch, weaponFor };
})();
`;

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  const opts = { headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) opts.executablePath = chrome;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  const errs = [];
  const NOISE = /onrender\.com|crazygames|supabase|live-config|\/api\/|ERR_FAILED|Failed to load resource|404|CORS|ERR_CONNECTION/i;
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text()); });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);
  await page.evaluate(() => { try { if (typeof backToHome === 'function') backToHome(); } catch (e) {} });
  await page.addScriptTag({ content: SIM_SRC });

  // --no-abilities: ablate every weapon Q. Basic-attack stats and abilities are
  // two separate balance surfaces and the sweep cannot tell them apart; running
  // the same table with abilities off says which surface the ranking lives on.
  if (args['no-abilities']) {
    await page.evaluate(() => { Fighter.prototype.ability = function () {}; });
    log('ABILITIES ABLATED — basic attacks only');
  }

  // Two sweep modes:
  //   classes — each class with its signature weapon (the default)
  //   weapons — every player-selectable weapon on the SAME class, so the class
  //             statline is held constant and only the weapon varies
  const MODE = String(args.mode || 'classes');
  // Megaknight is an unlockable joke class and is excluded by design.
  const EXCLUDE = new Set(['megaknight']);
  let classes, weapons, HOLD = null;
  if (MODE === 'weapons') {
    HOLD = String(args.hold || 'warrior');   // the class every entrant wears
    classes = await page.evaluate(() => WEAPON_KEYS.slice());
    weapons = Object.fromEntries(classes.map(w => [w, w]));
    log(`weapons under test (${classes.length}) on class '${HOLD}': ${classes.join(', ')}`);
  } else {
    classes = await page.evaluate(ex =>
      Object.keys(CLASSES).filter(k => !ex.includes(k)), [...EXCLUDE]);
    weapons = await page.evaluate(ks =>
      Object.fromEntries(ks.map(k => [k, BalanceSim.weaponFor(k)])), classes);
    log(`classes under test (${classes.length}): ${classes.join(', ')}`);
  }
  // In weapons mode an "entrant" is a weapon name; translate to (class, weapon).
  const asMatch = e => MODE === 'weapons' ? { k: HOLD, w: e } : { k: e, w: null };

  // ── Control: mirror matches ───────────────────────────────────────────────
  // A class fighting ITSELF must land near 50%. Anything else means the harness
  // has a side/order bias (spawn side, who calls update() first, who wins a
  // simultaneous trade) and every number in the matrix below is contaminated by
  // it. This runs first because there is no point reading the matrix until it
  // passes.
  if (!args['no-mirror']) {
    log('mirror control: each class vs itself...');
    const mir = await page.evaluate((ks, MATCHES, STOCKS, ARENA, DIFF, FRAMES, MODE, HOLD) => {
      const out = {};
      for (const k of ks) {
        let aw = 0, bw = 0, dr = 0;
        for (let i = 0; i < MATCHES; i++) {
          const m = MODE === 'weapons' ? { k: HOLD, w: k } : { k, w: null };
          const r = BalanceSim.runMatch(m.k, m.k, (Math.random() * 1e9) | 0,
            { stocks: STOCKS, arena: ARENA, diff: DIFF, maxFrames: FRAMES, swap: i % 2 === 1,
              wA: m.w, wB: m.w });
          if (r.stockDiff > 0) aw++; else if (r.stockDiff < 0) bw++; else dr++;
        }
        out[k] = { aw, bw, dr };
      }
      return out;
    }, classes, MATCHES, STOCKS, ARENA, DIFF, FRAMES, MODE, HOLD);
    console.log('\n  --- MIRROR CONTROL (same class both sides; 50% = unbiased) ---');
    let worst = 50, worstK = '(none)';
    for (const k of classes) {
      const m = mir[k], n = m.aw + m.bw + m.dr;
      const r = 100 * (m.aw + 0.5 * m.dr) / (n || 1);
      if (Math.abs(r - 50) > Math.abs(worst - 50)) { worst = r; worstK = k; }
      console.log(`    ${k.padEnd(12)} ${r.toFixed(0).padStart(3)}%  (${m.aw}-${m.bw}-${m.dr})`);
    }
    console.log(`    worst deviation: ${worstK} at ${worst.toFixed(0)}%` +
      (Math.abs(worst - 50) > 25
        ? '   <-- FAILS. Side bias this large invalidates the matrix; fix before reading it.'
        : '   (acceptable)'));
  }

  if (args['mirror-only']) { await browser.close(); server.close(); return; }

  const pairs = [];
  for (let i = 0; i < classes.length; i++)
    for (let j = i + 1; j < classes.length; j++) pairs.push([classes[i], classes[j]]);
  log(`${pairs.length} pairings x ${MATCHES} matches = ${pairs.length * MATCHES} matches (arena=${ARENA}, ${STOCKS} stocks, diff=${DIFF}, cap ${FRAMES}f)`);

  const t0 = Date.now();
  const rows = [];
  for (let p = 0; p < pairs.length; p++) {
    const [a, b] = pairs[p];
    const res = await page.evaluate((a, b, MATCHES, STOCKS, ARENA, DIFF, FRAMES, MODE, HOLD) => {
      const out = [];
      for (let i = 0; i < MATCHES; i++) {
        const seed = (Math.random() * 1e9) | 0;
        // Alternate spawn sides so a left/right advantage cannot masquerade as
        // a class advantage.
        const ma = MODE === 'weapons' ? { k: HOLD, w: a } : { k: a, w: null };
        const mb = MODE === 'weapons' ? { k: HOLD, w: b } : { k: b, w: null };
        const r = BalanceSim.runMatch(ma.k, mb.k, seed,
          { stocks: STOCKS, arena: ARENA, diff: DIFF, maxFrames: FRAMES, swap: i % 2 === 1,
            wA: ma.w, wB: mb.w });
        r.a = a; r.b = b;   // label by entrant, not by class
        out.push(r);
      }
      return out;
    }, a, b, MATCHES, STOCKS, ARENA, DIFF, FRAMES, MODE, HOLD);
    rows.push(...res);
    if ((p + 1) % 10 === 0 || p === pairs.length - 1)
      log(`  ${p + 1}/${pairs.length} pairings  (${Math.round((Date.now() - t0) / 1000)}s)`);
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const stat = {};
  for (const k of classes) stat[k] = { w: 0, l: 0, d: 0, n: 0, dmgFor: 0, dmgAgainst: 0, lockFor: 0, lockAgainst: 0, frames: 0, timeouts: 0 };
  const cell = {};   // "a|b" -> wins for a
  for (const r of rows) {
    const A = stat[r.a], B = stat[r.b];
    A.n++; B.n++;
    A.dmgFor += r.dmgA; A.dmgAgainst += r.dmgB; B.dmgFor += r.dmgB; B.dmgAgainst += r.dmgA;
    A.lockFor += r.lockB; A.lockAgainst += r.lockA; B.lockFor += r.lockA; B.lockAgainst += r.lockB;
    A.frames += r.frames; B.frames += r.frames;
    if (r.timeout) { A.timeouts++; B.timeouts++; }
    const key = r.a + '|' + r.b;
    cell[key] = cell[key] || { aw: 0, bw: 0, dr: 0 };
    if (r.stockDiff > 0)      { A.w++; B.l++; cell[key].aw++; }
    else if (r.stockDiff < 0) { A.l++; B.w++; cell[key].bw++; }
    else                      { A.d++; B.d++; cell[key].dr++; }
  }

  const pct = s => 100 * (s.w + 0.5 * s.d) / (s.n || 1);
  const ranked = classes.slice().sort((x, y) => pct(stat[y]) - pct(stat[x]));

  console.log(`\n=== CLASS WIN RATE — round robin, ${MATCHES} matches per pairing, ${STOCKS} stocks, arena=${ARENA}, diff=${DIFF} ===\n`);
  console.log(MODE === 'weapons'
    ? '  weapon       key           dmg  kb     win%    W-L-D     dmg/1k for-against   locked% self-opp'
    : '  class        weapon        hp   spd    win%    W-L-D     dmg/1k for-against   locked% self-opp');
  for (const k of ranked) {
    const s = stat[k];
    const c = MODE === 'weapons'
      ? await page.evaluate(k => ({ hp: WEAPONS[k].damage, sp: WEAPONS[k].kb || 0 }), k)
      : await page.evaluate(k => ({ hp: CLASSES[k].hp, sp: CLASSES[k].speedMult }), k);
    const per1k = v => (1000 * v / (s.frames || 1)).toFixed(1);
    console.log(
      '  ' + k.padEnd(12) + String(weapons[k]).padEnd(13) +
      String(c.hp).padEnd(5) + c.sp.toFixed(2).padEnd(7) +
      (pct(s).toFixed(1) + '%').padStart(6) + '  ' +
      `${s.w}-${s.l}-${s.d}`.padEnd(11) +
      `${per1k(s.dmgFor)} - ${per1k(s.dmgAgainst)}`.padEnd(20) +
      `${(100 * s.lockAgainst / (s.frames || 1)).toFixed(1)}% - ${(100 * s.lockFor / (s.frames || 1)).toFixed(1)}%`);
  }

  // Worst matchups: the number that actually decides whether a class is broken.
  console.log('\n  --- most lopsided pairings (>=75% one way) ---');
  const lop = [];
  for (const key of Object.keys(cell)) {
    const [a, b] = key.split('|'); const c = cell[key];
    const n = c.aw + c.bw + c.dr; if (!n) continue;
    const r = 100 * (c.aw + 0.5 * c.dr) / n;
    if (r >= 75 || r <= 25) lop.push({ a, b, r, n, c });
  }
  lop.sort((x, y) => Math.abs(y.r - 50) - Math.abs(x.r - 50));
  if (!lop.length) console.log('    none — no pairing is decided by class alone at this n.');
  for (const l of lop.slice(0, 20))
    console.log(`    ${(l.r >= 50 ? l.a : l.b).padEnd(12)} beats ${(l.r >= 50 ? l.b : l.a).padEnd(12)} ${(l.r >= 50 ? l.r : 100 - l.r).toFixed(0)}%  (${l.c.aw}-${l.c.bw}-${l.c.dr}, n=${l.n})`);

  const to = rows.filter(r => r.timeout).length;
  const er = rows.filter(r => r.err);
  console.log(`\n  ${rows.length} matches, ${to} hit the frame cap (${(100 * to / rows.length).toFixed(0)}%)` +
              (to / rows.length > 0.15 ? '  <-- HIGH: a capped match has no winner and dilutes every rate' : ''));
  if (er.length) console.log(`  ${er.length} matches logged a fighter error, first: ${er[0].err}`);
  const outPath = path.join(ROOT, 'tools', `class-balance-results-${MODE}-${ARENA}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ meta: { MODE, HOLD, MATCHES, STOCKS, ARENA, DIFF, when: new Date().toISOString() }, stat, cell, weapons }, null, 1));
  console.log(`\nwrote ${path.relative(ROOT, outPath)}  |  page errors: ${errs.length}`);
  if (errs.length) console.log('  ' + [...new Set(errs)].slice(0, 4).join('\n  '));
  await browser.close(); server.close();
})();
