'use strict';
/*
 * tools/sov-tactic-probe.js — DOES THE TACTIC LEDGER CHANGE WHAT HE DOES? (DEV ONLY)
 *
 * The complaint the ledger exists to answer is specific and reproducible: the
 * player stands on a platform, Sovereign jumps up to them, and gets hit off on
 * arrival — over and over, at a punish rate that RISES across the match because
 * he never books the cost. Replay 2026-09-10 measured 56 of those approaches,
 * 10/31 punished in the first half and 15/25 in the second.
 *
 * So this probe rebuilds exactly that trap: the opponent camps the centre
 * platform and swings at anything that lands next to them. It then reports the
 * one number that can falsify "he adapts" — the share of air approaches punished
 * in the first half of the fight versus the second. Rising is the bug. Falling
 * is the fix.
 *
 * Run it BOTH ways; the off arm is the control, not decoration:
 *   node tools/sov-tactic-probe.js --frames=5000
 *   node tools/sov-tactic-probe.js --frames=5000 --off
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
const FRAMES = parseInt(args.frames, 10) || 5000;
const PORT   = parseInt(args.port, 10) || 8123;
const OFF    = !!args.off;
// Sovereign picks one of seven loadouts per match and locks it (see
// _pickLoadout / _ensureMatchLoadout). Katana and hammer are different fights, so
// an unpinned kit was the dominant variance between runs and swamped the effect
// being measured — three-run arms disagreed with each other more than the arms
// disagreed with the control. Pinned by default; --kit=<key> to vary it.
const KIT    = args.kit || 'ronin';
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json' };
function startServer() { return new Promise(res => {
  const s = http.createServer((req, rs) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
    rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(rs);
  }); s.listen(PORT, () => res(s)); }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log('[tactic]', ...a);

// Camp the centre platform of the sovereign arena; punish anything that arrives.
const CAMPER = `
  const PX = 450;
  const onPlat = this.onGround && this.y < 300;
  if (!onPlat) {
    const ddx = PX - this.cx();
    this.vx = Math.sign(ddx) * 4.2;
    if (this.onGround && Math.abs(ddx) < 130) this.vy = -19;
  } else {
    this.vx *= 0.7;
    if (d < 95 && this.cooldown <= 0) this.attack(t);
  }`;

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  const opts = { headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) opts.executablePath = chrome;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);
  await page.evaluate(() => {
    try { if (typeof _story2 !== 'undefined' && _story2) { _story2.defeated = [0]; _story2.prologueSeen = true; } } catch (e) {}
    ['prologueOverlay','storyModal','storyIntroOverlay'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { backToHome(); } catch (e) {}
  });

  // Per-frame sampler: every ground launch at the camped platform, and whether it
  // cost him health inside the 45-frame window the ledger books on.
  await page.evaluate(() => {
    window.__tp = { host: null, foe: null, sampling: false, lastFrame: -1, frames: 0,
                    prevGround: true, approaches: [], open: null, vetoes: 0, prevDeny: 0,
                    hostLost: 0, foeLost: 0 };
    (function tick() {
      requestAnimationFrame(tick);
      const S = window.__tp;
      if (!S.sampling || !S.host || frameCount === S.lastFrame) return;
      S.lastFrame = frameCount; S.frames++;
      const h = S.host, t = S.foe;
      if (!h || !t) return;
      // Whole-fight damage, not just the damage the approach is blamed for. A
      // veto that saves health on one decision and spends more of it somewhere
      // else has not helped him, and the per-tactic number alone cannot see that.
      if (S.prevHp !== undefined && h.health < S.prevHp && h.lives === S.prevLives) S.hostLost += S.prevHp - h.health;
      if (S.prevFoeHp !== undefined && t.health < S.prevFoeHp && t.lives === S.prevFoeLives) S.foeLost += S.prevFoeHp - t.health;
      S.prevHp = h.health; S.prevLives = h.lives;
      S.prevFoeHp = t.health; S.prevFoeLives = t.lives;
      if ((h._airDenyTimer || 0) > S.prevDeny) S.vetoes++;
      S.prevDeny = h._airDenyTimer || 0;
      // Close an open approach once its window is up.
      if (S.open && frameCount - S.open.f >= 45) {
        S.open.cost = Math.max(0, S.open.hp - h.health) + (h.lives !== S.open.lives ? 40 : 0);
        S.approaches.push(S.open); S.open = null;
      }
      const launching = S.prevGround && !h.onGround && h.vy < -8;
      S.prevGround = h.onGround;
      if (launching && !S.open && t.onGround && t.y < h.y - 40 &&
          Math.abs(t.cx() - h.cx()) < 220) {
        S.open = { f: frameCount, at: S.frames, hp: h.health, lives: h.lives, cost: 0 };
      }
    })();
  });

  await page.evaluate(() => { try { backToMenu(); } catch (e) {} try { backToHome(); } catch (e) {} });
  await sleep(600);
  await page.evaluate(() => { selectMode('2p'); p1IsBot = false; p2IsBot = true; p2IsNone = false;
                              selectedArena = 'sovereign'; startGame(); });
  const ok = await page.waitForFunction(() => typeof gameRunning !== 'undefined' && gameRunning &&
    Array.isArray(players) && players.length >= 2 && !(typeof isCinematic !== 'undefined' && isCinematic),
    { timeout: 60000, polling: 250 }).then(() => true).catch(e => String(e.message));
  if (ok !== true) { console.log('boot failed:', ok); await browser.close(); server.close(); return; }

  const eng = await page.evaluate((body, off, kit) => {
    if (off) SMK2_TUNE.tacticLedger = false;
    // The dossier persists loadout priors and dial endpoints in localStorage, so
    // run N would otherwise inherit run N-1. Every arm must start from the same
    // blank state or the later runs are measuring a different Sovereign.
    try { if (typeof SovDossier !== 'undefined') SovDossier.reset(); } catch (e) {}
    const S = window.__tp;
    const foe = players[1];
    foe.aiDifficulty = 'expert';
    if (typeof WEAPONS !== 'undefined' && WEAPONS.sword) { foe.weapon = WEAPONS.sword; foe.weaponKey = 'sword'; foe._ammo = 0; }
    foe.charClass = 'none';
    for (const p of players) p.lives = 99;
    foe.updateAI = new Function('', `
      const t = (typeof players !== 'undefined') && players.find(p => p && p !== this && p.health > 0);
      if (!t) return; const dx = t.cx() - this.cx(); const d = Math.abs(dx);
      const dir = Math.sign(dx) || 1; this.facing = dir;
      ${body}`);
    if (SovereignControl.active) { try { SovereignControl.release(); } catch (e) {} }
    if (!SovereignControl.engage()) return { ok: false, why: 'engage failed' };
    S.host = SovereignControl._host; S.foe = foe;
    // Pin his kit AFTER engage, and lock it so _ensureMatchLoadout cannot re-pick.
    const lo = (typeof SMK2_LOADOUTS !== 'undefined') && SMK2_LOADOUTS.find(l => l.key === kit);
    if (lo && typeof WEAPONS !== 'undefined' && WEAPONS[lo.wk]) {
      S.host.weapon = WEAPONS[lo.wk]; S.host.weaponKey = lo.wk;
      S.host.charClass = lo.cls;
      S.host._loadout = lo; S.host._loadoutLocked = true;
      if (typeof applyClass === 'function') { try { applyClass(S.host, lo.cls); } catch (e) {} }
    }
    S.sampling = true;
    return { ok: true, kit: S.host.weaponKey + '/' + S.host.charClass };
  }, CAMPER, OFF, KIT);
  if (!eng || !eng.ok) { console.log('engage failed:', eng); await browser.close(); server.close(); return; }
  log('sovereign kit pinned:', eng.kit);

  await page.waitForFunction(n => window.__tp.frames >= n, { timeout: 600000, polling: 1000 }, FRAMES)
    .then(() => true).catch(() => log('timed out — reporting what was collected'));

  const out = await page.evaluate(() => {
    const S = window.__tp; S.sampling = false;
    return { approaches: S.approaches, vetoes: S.vetoes, frames: S.frames,
             hostLost: S.hostLost, foeLost: S.foeLost,
             grid: JSON.parse(JSON.stringify(S.host._tacticGrid || {})),
             gated: S.host._swingGated || 0,
             hostHp: S.host.health, hostLives: S.host.lives, foeLives: S.foe.lives };
  });

  const A = out.approaches;
  const half = out.frames / 2;
  const first = A.filter(a => a.at <  half), second = A.filter(a => a.at >= half);
  const rate = arr => arr.length ? (arr.filter(a => a.cost > 0).length / arr.length) : 0;
  console.log('\n=== AIR APPROACH ONTO THE CAMPED PLATFORM ===');
  console.log(`  ledger ${OFF ? 'OFF (control)' : 'ON'}   kit ${KIT}   frames ${out.frames}   vetoes ${out.vetoes}`);
  console.log(`  attempts        ${A.length}   (first half ${first.length}, second half ${second.length})`);
  console.log(`  punished        first half ${(rate(first)*100).toFixed(0)}%   second half ${(rate(second)*100).toFixed(0)}%`);
  console.log(`  avg cost/try    first half ${(first.reduce((s,a)=>s+a.cost,0)/(first.length||1)).toFixed(1)} hp   second half ${(second.reduce((s,a)=>s+a.cost,0)/(second.length||1)).toFixed(1)} hp`);
  // The number that decides it. Punish RATE only says how dangerous one attempt
  // is; what loses the match is total health spent on a losing decision, and a
  // veto that fires changes the count of attempts, not the rate.
  const total = A.reduce((s,a)=>s+a.cost,0);
  console.log(`  TOTAL COST      ${total.toFixed(0)} hp   (${(total / out.frames * 1000).toFixed(1)} hp per 1000 frames)`);
  console.log(`  deaths          sovereign ${99 - out.hostLives}   camper ${99 - out.foeLives}`);
  console.log(`  WHOLE FIGHT     sov took ${(out.hostLost / out.frames * 1000).toFixed(1)} hp/1000f   dealt ${(out.foeLost / out.frames * 1000).toFixed(1)} hp/1000f   ratio ${(out.foeLost / (out.hostLost || 1)).toFixed(2)}`);
  console.log(`  swings->guards  ${out.gated}`);
  const SITN = { c: 'close', m: 'mid', f: 'far' }, HN = { a: 'above', l: 'level', b: 'below' };
  console.log('  grid (net hp per try, tries in brackets):');
  for (const sit of Object.keys(out.grid).sort()) {
    const cells = Object.keys(out.grid[sit]).sort().map(a => {
      const e = out.grid[sit][a];
      const v = e.tries >= 3 ? ((e.dealt - e.taken) / e.tries).toFixed(1) : '?';
      return `${a} ${v}(${e.tries.toFixed(0)})`;
    });
    console.log(`    ${(SITN[sit[0]] + '/' + HN[sit[1]]).padEnd(12)} ${cells.join('  ')}`);
  }
  console.log(`\npage errors: ${errs.length}`);
  if (errs.length) console.log('  ' + [...new Set(errs)].slice(0, 4).join('\n  '));
  await browser.close(); server.close();
})();
