'use strict';
/*
 * tools/sov-conversion.js — WHY DO SOVEREIGN'S SWINGS MISS? (DEV ONLY)
 *
 * Replays measured him at 58% accuracy and 8.0 damage per swing against the
 * player's 75% and 12.6. That gap — not the neutral game, which he wins on every
 * process metric — is why he loses. This measures the CAUSE rather than guessing
 * at it: every swing is stamped at the moment of commit and again at the frame
 * the blade would connect, and the difference is attributed.
 *
 * Causes distinguished:
 *   blocked      — target was shielding at contact
 *   jumped_out   — target left the ground between commit and contact
 *   walked_out   — horizontal gap grew past reach during the swing
 *   reversed     — target's vx flipped sign after commit (defeats the whiff
 *                  guard's projection, which assumes constant velocity)
 *   vertical     — vertical gap exceeded the hitbox at contact
 *   unknown      — none of the above
 *
 * Usage: node tools/sov-conversion.js [--frames=3000] [--reps=3] [--port=8102]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const FRAMES = parseInt(args.frames, 10) || 3000;
const REPS   = parseInt(args.reps, 10)   || 3;
const PORT   = parseInt(args.port, 10)   || 8102;
const ROOT   = path.resolve(__dirname, '..');
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
const log = (...a) => console.log('[conv]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  await page.evaluate(() => {
    try { if (typeof _story2 !== 'undefined' && _story2) { _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated)?_story2.defeated:[]),0])]; _story2.prologueSeen = true; } } catch(e){}
    try { if (typeof storyModeActive !== 'undefined') storyModeActive = false; } catch(e){}
    ['prologueOverlay','storyPrologueOverlay','storyPathPanel','storyModal','storyIntroOverlay','storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch(e){}
  });

  const ready = await page.evaluate(() => {
    if (typeof SovereignControl === 'undefined') return 'no SovereignControl';
    const R = window.__conv = { host: null, sampling: false, scored: 0, lastFrame: -1, swings: [], pending: [], aborts: 0 };

    // Whiff-guard aborts: attack() returning without setting attackTimer. Counting
    // them separately matters — an abort is the guard WORKING, and folding it into
    // "swings" understates accuracy while folding it into nothing hides how often
    // he wants to swing and cannot.
    const origAttack = Fighter.prototype.attack;
    Fighter.prototype.attack = function (target) {
      if (!R.sampling || this !== R.host) return origAttack.apply(this, arguments);
      const before = this.attackTimer || 0;
      const t = target || this.target;
      const snap = t ? {
        gap: Math.abs(t.cx() - this.cx()),
        vgap: Math.abs((this.y + this.h / 2) - (t.y + t.h / 2)),
        tvx: t.vx || 0, tground: !!t.onGround, tshield: !!t.shielding,
      } : null;
      const r = origAttack.apply(this, arguments);
      // A swing started IFF attackTimer rose. The old test also accepted
      // `melee && attackTimer > 0`, which is true on EVERY frame of an
      // in-progress swing: the AI re-calls attack() each frame, Fighter.attack
      // bails at `if (this.cooldown > 0) return` without touching attackTimer,
      // and the still-running timer from the previous frame read as a fresh
      // commit. One real swing was logged as ~4 swings, 3 of them permanently
      // unhittable, which is why this tool reported 13.9% accuracy against a
      // replay-measured 58%. It also swallowed genuine whiff-guard aborts into
      // the swing count. attackTimer is assigned at fighter.js:2369 for melee
      // AND ranged alike, so clause 1 alone is sufficient.
      const started = (this.attackTimer || 0) > before;
      if (!started) { R.aborts++; return r; }
      if (snap && t) {
        R.pending.push({ f: frameCount, tgt: t, commit: snap, hit: false,
                         dur: this.attackDuration || 12 });
      }
      return r;
    };

    const origDeal = window.dealDamage;
    window.dealDamage = function (a, t, d, kb, ...rest) {
      if (R.sampling && a === R.host) {
        for (let i = R.pending.length - 1; i >= 0; i--) {
          if (R.pending[i].tgt === t && !R.pending[i].hit) { R.pending[i].hit = true; R.pending[i].dmg = d || 0; break; }
        }
      }
      return origDeal.apply(this, [a, t, d, kb, ...rest]);
    };

    (function tick() {
      requestAnimationFrame(tick);
      if (!R.sampling || !R.host) return;
      if (typeof frameCount === 'undefined' || frameCount === R.lastFrame) return;
      R.lastFrame = frameCount;
      if (typeof isCinematic !== 'undefined' && isCinematic) return;
      if (R.host.health === 1 && R.host.invincible > 500) return;
      R.scored++;
      // Resolve swings whose window has closed.
      for (let i = R.pending.length - 1; i >= 0; i--) {
        const p = R.pending[i];
        if (frameCount < p.f + p.dur + 4) continue;
        R.pending.splice(i, 1);
        const t = p.tgt;
        const out = { hit: p.hit, dmg: p.dmg || 0, commit: p.commit, cause: null };
        if (!p.hit && t) {
          const gap  = Math.abs(t.cx() - R.host.cx());
          const vgap = Math.abs((R.host.y + R.host.h / 2) - (t.y + t.h / 2));
          // weapon.range is the loose commit band, not the blade's real sweep —
          // fighter.js:2199 says so explicitly. Using it here made walked_out
          // almost never fire and dumped those misses into `unknown`.
          const reach = typeof R.host._meleeReachDist === 'function'
            ? R.host._meleeReachDist(t)
            : (R.host.weapon && R.host.weapon.range || 90) * (R.host.drawScale || 1);
          if (t.shielding)                                       out.cause = 'blocked';
          else if (p.commit.tground && !t.onGround)               out.cause = 'jumped_out';
          else if (Math.sign(t.vx || 0) && Math.sign(t.vx) !== Math.sign(p.commit.tvx) && p.commit.tvx) out.cause = 'reversed';
          else if (gap > reach)                                   out.cause = 'walked_out';
          else if (vgap > 60)                                     out.cause = 'vertical';
          else                                                    out.cause = 'unknown';
          out.gap = Math.round(gap); out.vgap = Math.round(vgap);
        }
        R.swings.push(out);
      }
    })();
    return 'ok';
  });
  if (ready !== 'ok') { log('RIG FAILED:', ready); await browser.close(); server.close(); return; }

  const all = [];
  for (let r = 0; r < REPS; r++) {
    await page.evaluate(() => { try { backToMenu(); } catch(e){} try { backToHome(); } catch(e){} });
    await sleep(600);
    await page.evaluate(() => { selectMode('2p'); p1IsBot = false; p2IsBot = true; p2IsNone = false; startGame(); });
    const ok = await page.waitForFunction(() => typeof gameRunning !== 'undefined' && gameRunning &&
      Array.isArray(players) && players.length >= 2 && !(typeof isCinematic !== 'undefined' && isCinematic),
      { timeout: 60000, polling: 250 }).then(() => true).catch(e => String(e.message));
    if (ok !== true) { log(`rep${r}: setup ${ok}`); continue; }
    const eng = await page.evaluate(() => {
      const R = window.__conv;
      players[1].aiDifficulty = 'expert';
      // Pin the opponent's kit. startGame() hands out a random weapon, so reps
      // were not comparable and a ranged draw silently changed the question
      // being asked. Same fix as tools/sov-recall.js. (p2Weapon is a DOM element
      // id, not a global — set it on the fighter after spawn.)
      if (typeof WEAPONS !== 'undefined' && WEAPONS.sword) {
        players[1].weapon = WEAPONS.sword; players[1].weaponKey = 'sword'; players[1]._ammo = 0;
      }
      // Keep the match alive for the whole measurement window. Both fighters
      // default to a handful of lives, so a trial ended as soon as one side ran
      // out — measured at 746 of a requested 1800 frames, and one trial was
      // discarded entirely because it ended before damage flowed both ways.
      // Deaths and respawns still happen; the match just does not conclude.
      for (const p of players) { p.lives = 99; }

      if (SovereignControl.active) { try { SovereignControl.release(); } catch(e){} }
      if (!SovereignControl.engage()) return 'engage failed';
      R.host = SovereignControl._host;
      if (!R.host) return 'no host';
      R.scored = 0; R.swings = []; R.pending = []; R.aborts = 0; R.lastFrame = -1;
      R.sampling = true; return 'ok';
    });
    if (eng !== 'ok') { log(`rep${r}: ${eng}`); continue; }
    await page.waitForFunction(n => window.__conv.scored >= n, { timeout: 300000, polling: 500 }, FRAMES)
      .then(() => true).catch(() => 'timeout');
    const out = await page.evaluate(() => { const R = window.__conv; R.sampling = false;
      return { swings: R.swings, aborts: R.aborts, scored: R.scored, weapon: R.host.weaponKey }; });
    all.push(out);
    log(`rep${r}: ${out.swings.length} swings, ${out.aborts} guard aborts, weapon ${out.weapon}`);
  }

  const sw = all.flatMap(a => a.swings);
  const hits = sw.filter(s => s.hit);
  console.log(`\n=== CONVERSION (${sw.length} resolved swings across ${all.length} reps) ===`);
  console.log(`  accuracy        ${(100 * hits.length / (sw.length || 1)).toFixed(1)}%`);
  console.log(`  dmg per hit     ${(hits.reduce((a, s) => a + s.dmg, 0) / (hits.length || 1)).toFixed(1)}`);
  console.log(`  dmg per swing   ${(hits.reduce((a, s) => a + s.dmg, 0) / (sw.length || 1)).toFixed(1)}`);
  console.log(`  guard aborts    ${all.reduce((a, x) => a + x.aborts, 0)} (guard working — not counted as swings)`);
  const causes = {};
  for (const s of sw) if (!s.hit) causes[s.cause] = (causes[s.cause] || 0) + 1;
  const miss = sw.length - hits.length;
  console.log(`\n  WHY THE ${miss} MISSES HAPPENED:`);
  for (const [c, n] of Object.entries(causes).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c.padEnd(12)} ${n.toString().padStart(4)}  ${(100 * n / miss).toFixed(1)}% of misses  ${(100 * n / sw.length).toFixed(1)}% of swings`);
  }
  const cg = sw.filter(s => !s.hit).map(s => s.commit.gap);
  const hg = hits.map(s => s.commit.gap);
  const med = a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  console.log(`\n  commit gap: median ${med(hg)}px when it hit, ${med(cg)}px when it missed`);
  console.log(`  commit vgap: median ${med(hits.map(s=>s.commit.vgap))}px when it hit, ${med(sw.filter(s=>!s.hit).map(s=>s.commit.vgap))}px when it missed`);
  fs.writeFileSync(path.join(ROOT, 'tools', 'sov-conversion-results.json'), JSON.stringify(all, null, 1));
  console.log(`\nwrote tools/sov-conversion-results.json  |  page errors: ${errs.length}`);
  if (errs.length) console.log('  ' + [...new Set(errs)].slice(0, 4).join('\n  '));
  await browser.close(); server.close();
})();
