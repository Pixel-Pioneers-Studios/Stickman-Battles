'use strict';
/*
 * tools/boss-bench.js — the brain (data/brain/latest.json, Sovereign's net) plays the PLAYER's side of
 * each boss fight in the real game, so boss difficulty can be compared on one yardstick. DEV ONLY.
 *
 *   node tools/boss-bench.js [--bosses=fallen_god,boss,trueform,god,absoluteaxiom] [--n=4] [--par=3] [--cap=300]
 *                            [--weapon=sword] [--cls=none] [--haz=off] [--pilot=brain|masher] [--port=8150]
 *
 * --cap is game seconds (frames/60), so a loaded machine changes wall time, not results.
 * Boss keys: fallen_god (Simulator refight), boss (Creator), trueform (Cosmic Axiom).
 * --haz=off removes the boss-hazard layer (btHazardNav) to measure what it is worth.
 * --pilot=masher walks at the boss and attacks/abilities on cooldown, never dodging: a fight it wins
 * cheaply is a spam fight. God and Absolute Axiom (bosses held in minions) are masher-only: the brain
 * only targets players[]. Their standalone fights hand the player the Godslayer, so --weapon is ignored.
 * Per match: result, seconds, boss HP left, lives lost and what killed each one (floor removal,
 * a fall, or a hit). One browser per worker: a background tab's game loop is frozen.
 */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
const BOSSES = String(args.bosses || 'fallen_god,boss,trueform').split(',');
const N = +args.n || 4, PAR = +args.par || 3, CAP = +args.cap || 300, PORT = +args.port || 8150;
const WEAPON = args.weapon || 'sword', CLS = args.cls || 'none', HAZ_OFF = args.haz === 'off', PILOT = args.pilot || 'brain';
const OUT = path.join(ROOT, 'data', 'boss-bench'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

(async () => {
  const server = await new Promise(res => { const s = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); return rs.end(); }
    rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(rs); }).listen(PORT, () => res(s)); });
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const mk = () => puppeteer.launch({ headless: 'new', protocolTimeout: 1200000, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });

  const jobs = []; for (const b of BOSSES) for (let i = 0; i < N; i++) jobs.push({ boss: b, i });
  const results = []; let next = 0;
  async function worker() {
    const browser = await mk(); const page = await browser.newPage(); await page.setViewport({ width: 1000, height: 640 });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
    // A cold load can drop scripts; one reload fixes it.
    if (!(await page.evaluate(() => typeof startSimFight === 'function' && typeof Brain !== 'undefined'))) {
      await page.reload({ waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
    }
    while (next < jobs.length) {
      const job = jobs[next++];
      const r = await page.evaluate(async (BOSS, CAP, WEAPON, CLS, HAZ_OFF, PILOT) => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        if (!window.__bhn) window.__bhn = btHazardNav;
        window.__hazN = 0; window.__hazWhy = {};
        btHazardNav = HAZ_OFF ? null : function (f, want) {
          const r = window.__bhn(f, want);
          if (r && !r.fight && f === players[0]) {
            window.__hazN++;
            const fl = bossFloorState !== 'normal' || !!(typeof tfFloorRemoved !== 'undefined' && tfFloorRemoved);
            const k = fl ? (f.onGround ? 'floor-ground' : 'floor-air') : 'telegraph';
            window.__hazWhy[k] = (window.__hazWhy[k] || 0) + 1;
          }
          return r;
        };
        try { if (Brain.live) Brain.release(); } catch (e) {}
        try { if (gameRunning) backToMenu(); } catch (e) {}
        const ov = document.getElementById('gameOverOverlay'); if (ov) ov.style.display = 'none';
        if (BOSS === 'trueform') unlockedTrueBoss = false;
        if (BOSS === 'god') godDefeated = true;   // phase 2, the refight
        const findBoss = () => players.find(p => p.isBoss) || (minions || []).find(m => m && (m.isAbsoluteAxiom || m.isGod));
        startSimFight(BOSS === 'fallen_god' ? 'boss' : BOSS, BOSS === 'fallen_god' ? 'fallen_god' : null);
        for (const [id, v] of [['p1Weapon', WEAPON], ['p1Class', CLS]]) { const el = document.getElementById(id); if (el) el.value = v; }
        startGame();
        let t = 0;
        while (!(gameRunning && findBoss() && !(typeof gameLoading !== 'undefined' && gameLoading)) && t < 300) { await sleep(100); t++; }
        await sleep(500);
        const me = players[0], boss = findBoss();
        if (!me || !boss) return { result: 'NOSTART', boss: BOSS };
        const masher = PILOT === 'masher' || !players.includes(boss);
        let iter = 'masher';
        if (!masher) iter = await Brain.takeOver(me, boss);
        else {
          me.isAI = false;
          const mash = () => {
            if (!gameRunning || !(boss.health > 0)) return;
            if (me.health > 0 && !activeCinematic && !(me.stunTimer > 0)) {
              const dx = boss.cx() - me.cx();
              me.facing = Math.sign(dx) || 1;
              if (Math.abs(dx) > 30) me.vx = Math.sign(dx) * 5.2 * (me.classSpeedMult || 1);
              if (me.onGround && boss.y + boss.h < me.y - 20) me.vy = -17;
              else if (!me.onGround && me.canDoubleJump && me.vy > 0 && boss.y + boss.h < me.y) { me.vy = -13; me.canDoubleJump = false; }
              if (me.cooldown <= 0) me.attack(boss);
              if (!(me.abilityCooldown > 0)) me.ability(boss);
            }
            requestAnimationFrame(mash);
          };
          mash();
        }
        const S = { boss: BOSS, name: boss.name, iter, kit: me.weaponKey + '/' + (me.charClass || 'none'), meHp: me.maxHealth, bossHp: boss.maxHealth,
          lives0: me.lives, deaths: [], dmgTo: 0, dmgBy: 0, hazFrames: 0, frames: 0, cinFrames: 0 };
        let lm = me.lives, pm = me.health, phit = 0, pcause = null, pfloor = false, pstate = bossFloorState;
        // Where the player is the moment a warned floor actually goes: the test of seeing it coming.
        S.floorDrops = { onDeck: 0, inAir: 0, onFloor: 0 };
        const t0 = performance.now(), f0 = frameCount;
        const gs = () => (frameCount - f0) / 60;
        const iv = setInterval(() => { try {
          S.frames++;
          if (activeCinematic || isCinematic) S.cinFrames++;
          if (pstate === 'warning' && bossFloorState === 'hazard' && me.health > 0) {
            const fl = currentArena.platforms.find(p => p.isFloor), feet = me.y + me.h;
            if (!me.onGround) S.floorDrops.inAir++;
            else if (fl && feet >= fl.y - 4) S.floorDrops.onFloor++;
            else S.floorDrops.onDeck++;
          }
          pstate = bossFloorState;
          if (me.health < pm && me.health >= 0) { S.dmgBy += pm - me.health; phit = S.frames; }
          // Cause is read the moment health reaches 0: a void fall zeroes health below deathY a while before
          // the life is taken, and lava kills through ordinary damage.
          if (pm > 0 && me.health <= 0) {
            const feet = me.y + me.h, A = currentArena;
            pcause = me.y > A.deathY - 40 ? (S.frames - phit <= 20 ? 'knockoff' : 'fell')
                   : (A.hasLava && feet > A.lavaY - 30) ? 'lava' : 'ko';
            pfloor = bossFloorState !== 'normal' || !!(typeof tfFloorRemoved !== 'undefined' && tfFloorRemoved);
          }
          if (me.lives < lm) {
            S.deaths.push({ s: Math.round(gs()), floor: pfloor, cause: pcause || 'ko', bossHpPct: Math.round(100 * Math.max(0, boss.health) / boss.maxHealth) });
            pcause = null; pfloor = false;
            lm = me.lives;
          }
          pm = me.health;
        } catch (e) {} }, 50);
        const over = () => ov && ov.style.display !== 'none' && ov.style.display !== '';
        let w = 0;
        // Capped in game time: a loaded machine runs fewer frames per wall second.
        // Standalone Absolute Axiom shows a defeat card, not the game-over overlay, so a dead boss also ends it.
        while (!over() && boss.health > 0 && !(me.lives <= 0) && gs() < CAP && w < CAP * 40) { await sleep(100); w++; }
        clearInterval(iv);
        S.hazFrames = Math.round(window.__hazN / 3);
        S.hazWhy = window.__hazWhy;
        S.secs = Math.round(gs());
        S.wallSecs = Math.round((performance.now() - t0) / 1000);
        S.pilot = masher ? 'masher' : 'brain';
        S.result = boss.health <= 0 ? 'WIN' : (over() || me.lives <= 0) ? 'LOSS' : 'TIMEOUT';
        S.bossLeftPct = Math.round(100 * Math.max(0, boss.health) / boss.maxHealth);
        S.livesLost = S.lives0 - Math.max(0, me.lives);
        S.dmgTo = Math.round(boss.maxHealth - Math.max(0, boss.health));
        S.dmgBy = Math.round(S.dmgBy);
        S.tfState = typeof tfCinematicState !== 'undefined' ? tfCinematicState : null;
        try { Brain.release(); } catch (e) {}
        return S;
      }, job.boss, CAP, WEAPON, CLS, HAZ_OFF, PILOT);
      r.errs = errs.splice(0, 3);
      results.push(r);
      const dk = (r.deaths || []).map(d => d.cause + (d.floor ? '(floor)' : '') + '@' + d.s + 's').join(' ');
      console.log(`${String(r.boss).padEnd(10)} #${job.i} ${String(r.result).padEnd(7)} ${r.secs}s game (${r.wallSecs}s wall)  boss left ${r.bossLeftPct}% of ${r.bossHp}  lives lost ${r.livesLost}/${r.lives0}  dmg dealt ${r.dmgTo} taken ${r.dmgBy}  hazard-layer ${Math.round(100 * r.hazFrames / Math.max(1, r.frames))}%  cinematic ${Math.round(100 * r.cinFrames / Math.max(1, r.frames))}% ${JSON.stringify(r.hazWhy || {})} floor-drops ${JSON.stringify(r.floorDrops || {})}  deaths: ${dk || '-'}${r.errs.length ? '  ERR ' + r.errs[0] : ''}`);
    }
    await browser.close();
  }
  await Promise.all(Array.from({ length: Math.min(PAR, jobs.length) }, () => worker()));

  console.log(`\npilot ${PILOT} (brain ${results[0] && results[0].iter})  kit ${WEAPON}/${CLS}  hazard layer ${HAZ_OFF ? 'OFF' : 'on'}  cap ${CAP}s`);
  const summary = {};
  for (const b of BOSSES) {
    const rs = results.filter(r => r.boss === b && r.result !== 'NOSTART');
    if (!rs.length) { console.log(`${b}: no matches started`); continue; }
    const avg = k => rs.reduce((a, r) => a + (r[k] || 0), 0) / rs.length;
    const deaths = rs.flatMap(r => r.deaths || []);
    const dmgPerLife = rs.reduce((a, r) => a + r.dmgTo, 0) / Math.max(1, deaths.length);
    summary[b] = { n: rs.length, wins: rs.filter(r => r.result === 'WIN').length, timeouts: rs.filter(r => r.result === 'TIMEOUT').length,
      secs: Math.round(avg('secs')), bossLeftPct: Math.round(avg('bossLeftPct')), livesLost: +avg('livesLost').toFixed(1), dmgPerLife: Math.round(dmgPerLife),
      dmgPerMin: Math.round(rs.reduce((a, r) => a + r.dmgTo, 0) / (rs.reduce((a, r) => a + r.secs, 0) / 60)),
      livesPerMin: +(deaths.length / (rs.reduce((a, r) => a + r.secs, 0) / 60)).toFixed(2),
      deathsBy: { fell: deaths.filter(d => d.cause === 'fell').length, lava: deaths.filter(d => d.cause === 'lava').length,
                  knockoff: deaths.filter(d => d.cause === 'knockoff').length,
                  ko: deaths.filter(d => d.cause === 'ko').length, duringFloor: deaths.filter(d => d.floor).length } };
    const s = summary[b];
    console.log(`${(rs[0].name || b).padEnd(12)} wins ${s.wins}/${s.n} (timeouts ${s.timeouts})  avg ${s.secs}s game  boss dmg/min ${s.dmgPerMin}  lives lost/min ${s.livesPerMin}  boss HP left ${s.bossLeftPct}%  lives lost ${s.livesLost}  boss dmg per life ${s.dmgPerLife}  deaths: fell ${s.deathsBy.fell} lava ${s.deathsBy.lava} knocked off ${s.deathsBy.knockoff} KO ${s.deathsBy.ko} (during floor removal ${s.deathsBy.duringFloor})`);
  }
  const file = path.join(OUT, `bench-${HAZ_OFF ? 'hazoff' : 'hazon'}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ args, summary, results }, null, 1));
  console.log('wrote ' + path.relative(ROOT, file));
  server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
