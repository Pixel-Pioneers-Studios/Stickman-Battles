'use strict';
/*
 * tools/sov-adapt-probe.js — DOES SOVEREIGN ACTUALLY ADAPT? (DEV ONLY)
 *
 * Prerequisite check for the "breed two opponent-adapted Sovereigns" idea. Two
 * separate questions, deliberately not conflated:
 *
 *   Q1 MOVEMENT  — do his learned dials move at all during a fight, or do they
 *                  saturate at t=0 the way the Aug-25 finding said?
 *   Q2 DIVERGENCE — do they land in DIFFERENT places against DIFFERENT opponents?
 *                  Movement alone is worthless for breeding: if every opponent
 *                  drives him to the same endpoint there is nothing to cross.
 *   Q3 HERITABILITY — does any of it reach `_genome`, the thing the trainer
 *                  actually persists and mutates?
 *
 * Sovereign possesses P1 via SovereignControl and fights a bot P2 whose
 * (weapon, class) is the independent variable. Each opponent is run REPS times.
 *
 * Usage: node tools/sov-adapt-probe.js [--frames=2400] [--reps=3] [--port=8101]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const FRAMES = parseInt(args.frames, 10) || 2400;
const REPS   = parseInt(args.reps, 10)   || 3;
const PORT   = parseInt(args.port, 10)   || 8101;
const ROOT   = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };

// Opponents chosen to pull the dials in genuinely different directions:
// a long-endlag heavy, a fast light rushdown, and a zoner.
// KIT opponents — vary the weapon, leave the stock bot AI in charge.
const KIT_OPPONENTS = [
  { name: 'heavy',  weapon: 'hammer', cls: 'berserker' },
  { name: 'light',  weapon: 'katana', cls: 'assassin'  },
  { name: 'zoner',  weapon: 'spear',  cls: 'none'      },
];

// BEHAVIOUR opponents — same weapon for all, but the bot's updateAI is replaced
// with a scripted policy. This exists because the kit opponents above turned out
// to be behaviourally IDENTICAL: measured across 12 trials their attack rate
// (0.02-0.09), air share (0.22-0.87) and close share (0.53-0.94) overlap almost
// completely, because they are one bot AI holding three weapons. Nothing that
// reads BEHAVIOUR can be validated against them, and "adapts to anyone" is a
// claim about behaviour, not about weapon stats.
const BEH_OPPONENTS = [
  { name: 'turtle', weapon: 'sword', cls: 'none', policy: 'turtle' },
  { name: 'rusher', weapon: 'sword', cls: 'none', policy: 'rusher' },
  { name: 'zonepup', weapon: 'spear', cls: 'none', policy: 'zoner' },
  { name: 'aerial', weapon: 'sword', cls: 'none', policy: 'aerial' },
];

const OPPONENTS = args.behavior ? BEH_OPPONENTS : KIT_OPPONENTS;

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
const log = (...a) => console.log('[probe]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const sd   = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  log(`server :${PORT}  frames=${FRAMES}  reps=${REPS}  opponents=${OPPONENTS.map(o=>o.name).join(',')}`);
  const opts = { headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) opts.executablePath = chrome;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  const NOISE = /onrender\.com|crazygames|supabase|live-config|\/api\/|ERR_FAILED|Failed to load resource|404|CORS|ERR_CONNECTION/i;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text()); });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);
  await page.evaluate(() => {
    try { if (typeof _story2 !== 'undefined' && _story2) { _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated)?_story2.defeated:[]),0])]; _story2.prologueSeen = true; } } catch(e){}
    try { if (typeof storyModeActive !== 'undefined') storyModeActive = false; } catch(e){}
    try { if (typeof activeCinematic !== 'undefined') activeCinematic = null; } catch(e){}
    ['prologueOverlay','storyPrologueOverlay','storyPathPanel','storyModal','storyIntroOverlay','storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch(e){}
  });

  // ── Sampling rig: one sample per scored live frame, thinned on write ────────
  const ready = await page.evaluate(() => {
    if (typeof SovereignControl === 'undefined') return 'no SovereignControl';
    const R = window.__probe = { host: null, sampling: false, scored: 0, ended: false, samples: [], lastFrame: -1, dealt: 0, taken: 0 };
    const origDeal = window.dealDamage;
    window.dealDamage = function (a, t, d, kb, ...rest) {
      const r = origDeal.apply(this, [a, t, d, kb, ...rest]);
      if (R.sampling && R.host) { if (a === R.host) R.dealt += (d || 0); else if (t === R.host) R.taken += (d || 0); }
      return r;
    };
    (function tick() {
      requestAnimationFrame(tick);
      if (!R.sampling || !R.host) return;
      if (typeof frameCount === 'undefined' || frameCount === R.lastFrame) return;
      R.lastFrame = frameCount;
      if (typeof isCinematic !== 'undefined' && isCinematic) return;
      if (typeof gameFrozen !== 'undefined' && gameFrozen) return;
      if (typeof hitStopFrames !== 'undefined' && hitStopFrames > 0) return;
      const h = R.host;
      if (!h.aiMemory) return;
      // Finisher lock (health===1 && invincible>500) is not a live frame.
      if (h.health === 1 && h.invincible > 500) return;
      R.scored++;
      if (R.scored % 30 === 0) {
        const m = h.aiMemory;
        R.samples.push({
          f: R.scored,
          agg: +m.aggression.toFixed(4), def: +m.defense.toFixed(4),
          spc: +m.spacing.toFixed(4),    rxn: +m.reactionSpeed.toFixed(4),
          evo: h._evolutionStage | 0,
          strat: h._lockedCounterStrategy || null,
          arch: h._oppArchetype || null,
          rates: (function(){ try { const r = h._oppRates(); return r ? {
            a:+r.attack.toFixed(3), s:+r.shield.toFixed(3), d:+r.dodge.toFixed(3),
            air:+r.air.toFixed(3), cs:+r.closeShare.toFixed(3),
            ap:+r.approach.toFixed(3), re:+r.retreat.toFixed(3),
            ad:Math.round(r.avgDist) } : null; } catch(e){ return null; } })(),
          recall: +(h._dossierRecall || 0).toFixed(3),
          gen: JSON.stringify(h._genome || null)
        });
      }
      if (!gameRunning) R.ended = true;
    })();
    // ── Scripted opponent policies ────────────────────────────────────────────
    // Replace the bot's decision function outright. Physics, damage, collision and
    // every combat rule still run normally — only the intent is scripted, so what
    // Sovereign observes is a real fighter that happens to be predictable.
    window.__applyPolicy = function (f, policy) {
      if (!f || !policy) return;
      f._policy = policy;
      f.updateAI = function () {
        const t = (typeof players !== 'undefined') && players.find(p => p && p !== this && p.health > 0);
        if (!t) return;
        const dx = t.cx() - this.cx();
        const d  = Math.abs(dx);
        const dir = Math.sign(dx) || 1;
        this.facing = dir;
        const spd = 4.6;
        switch (this._policy) {
          case 'turtle':
            // Hold guard, give ground, punish only when he is already on top of us.
            if (!this.onGround && this.canDoubleJump && this.vy > 2) { this.vy = -12; this.canDoubleJump = false; }
            this.shielding = d < 170;
            if (d < 130) this.vx = -dir * spd * 0.8;
            else this.vx *= 0.8;
            if (d < 85 && this.cooldown <= 0 && Math.random() < 0.25) { this.shielding = false; this.attack(t); }
            break;
          case 'rusher':
            // Close and swing on every cooldown. No spacing, no guard.
            this.shielding = false;
            this.vx = dir * spd * 1.15;
            if (this.onGround && Math.random() < 0.02) this.vy = -13;
            if (d < 95 && this.cooldown <= 0) this.attack(t);
            break;
          case 'zoner':
            // Hold a pocket and poke; never voluntarily enter his range.
            this.shielding = false;
            // Recover if knocked off — without this a single launch left one trial
            // airborne for 100% of its frames and the whole sample was garbage.
            if (!this.onGround && this.canDoubleJump && this.vy > 2) { this.vy = -12; this.canDoubleJump = false; }
            if (d < 155)      this.vx = -dir * spd;
            else if (d > 230) this.vx =  dir * spd * 0.6;
            else              this.vx *= 0.7;
            if (d < 150 && d > 90 && this.cooldown <= 0) this.attack(t);
            break;
          case 'aerial':
            // Live in the air; attack on the way down.
            this.shielding = false;
            this.vx = dir * spd * 0.9;
            if (this.onGround) this.vy = -15;
            else if (this.canDoubleJump && this.vy > 0 && Math.random() < 0.08) { this.vy = -13; this.canDoubleJump = false; }
            if (d < 110 && this.cooldown <= 0) this.attack(t);
            break;
        }
      };
    };
    return 'ok';
  });
  if (ready !== 'ok') { log('RIG FAILED:', ready); await browser.close(); server.close(); return; }

  async function trial(opp) {
    await page.evaluate(() => { try { backToMenu(); } catch(e){} try { backToHome(); } catch(e){} });
    await sleep(600);
    const started = await page.evaluate(() => {
      try { selectMode('2p'); p1IsBot = false; p2IsBot = true; p2IsNone = false; startGame(); return true; }
      catch (e) { return String(e && e.message || e); }
    });
    if (started !== true) return { error: 'startGame: ' + started };
    const setup = await page.waitForFunction(() => {
      if (typeof gameRunning === 'undefined' || !gameRunning) return false;
      if (!Array.isArray(players) || players.length < 2) return false;
      if (typeof isCinematic !== 'undefined' && isCinematic) return false;
      return true;
    }, { timeout: 60000, polling: 250 }).then(() => true).catch(e => String(e.message));
    if (setup !== true) return { error: 'setup: ' + setup };

    const engaged = await page.evaluate((opp) => {
      const R = window.__probe;
      if (window.__probeWipeDossier && typeof SovDossier !== 'undefined') SovDossier.reset();
      const foe = players[1];
      if (!foe) return 'no P2';
      if (opp.cls === 'none') { foe.charClass = 'none'; }
      else if (typeof applyClass === 'function') applyClass(foe, opp.cls);
      if (typeof WEAPONS !== 'undefined' && WEAPONS[opp.weapon]) { foe.weapon = WEAPONS[opp.weapon]; foe.weaponKey = opp.weapon; foe._ammo = 0; }
      foe.aiDifficulty = 'expert';
      // Keep the match alive for the whole measurement window. Both fighters
      // default to a handful of lives, so a trial ended as soon as one side ran
      // out — measured at 746 of a requested 1800 frames, and one trial was
      // discarded entirely because it ended before damage flowed both ways.
      // Deaths and respawns still happen; the match just does not conclude.
      for (const p of players) { p.lives = 99; }

      if (opp.policy) window.__applyPolicy(foe, opp.policy);
      if (SovereignControl.active) { try { SovereignControl.release(); } catch(e){} }
      if (!SovereignControl.engage()) return 'engage failed';
      const h = SovereignControl._host;
      if (!h) return 'no host'; if (!h.isAI) return 'host not AI'; if (!h.aiMemory) return 'no aiMemory';
      R.host = h; R.scored = 0; R.ended = false; R.samples = []; R.lastFrame = -1; R.dealt = 0; R.taken = 0;
      R.sampling = true;
      return 'ok';
    }, opp);
    if (engaged !== 'ok') return { error: engaged };

    await page.waitForFunction(n => window.__probe.scored >= n || window.__probe.ended,
      { timeout: 300000, polling: 500 }, FRAMES).then(() => true).catch(e => 'timeout');
    return await page.evaluate(() => {
      const R = window.__probe; R.sampling = false;
      return { scored: R.scored, ended: R.ended, samples: R.samples,
               dealt: Math.round(R.dealt), taken: Math.round(R.taken),
               foeWeapon: players[1] ? players[1].weaponKey : null };
    });
  }

  // Wipe persisted learning unless --recall is passed: measuring WITHIN-match
  // adaptation is a different question from measuring what he remembers, and
  // leaving a dossier from a previous run in place silently conflates them.
  await page.evaluate((wipe) => {
    window.__probeWipeDossier = !!wipe;
    if (wipe && typeof SovDossier !== 'undefined') SovDossier.reset();
  }, !args.recall);
  log(args.recall ? 'dossier PERSISTS across trials (recall test)' : 'dossier wiped before each trial');

  const results = [];
  for (let r = 0; r < REPS; r++) {
    for (const opp of OPPONENTS) {
      const out = await trial(opp);
      if (out.error) { log(`rep${r} ${opp.name}: ERROR ${out.error}`); continue; }
      const s = out.samples;
      if (!s.length) { log(`rep${r} ${opp.name}: no samples`); continue; }
      if (out.dealt === 0 && out.taken === 0) { log(`rep${r} ${opp.name}: DISCARDED — no damage flowed either way`); continue; }
      results.push({ opp: opp.name, rep: r, ...out });
      const a = s[0], z = s[s.length - 1];
      log(`rep${r} ${opp.name.padEnd(6)} n=${out.scored} foe=${out.foeWeapon} dealt=${out.dealt} taken=${out.taken}`);
      log(`         agg ${a.agg}->${z.agg}  def ${a.def}->${z.def}  spc ${a.spc}->${z.spc}  rxn ${a.rxn}->${z.rxn}  evo ${a.evo}->${z.evo}`);
    }
  }

  // ── Q1: movement ───────────────────────────────────────────────────────────
  console.log('\n=== Q1  DO THE DIALS MOVE? (per-trial range over the fight) ===');
  const DIALS = ['agg','def','spc','rxn'];
  for (const k of DIALS) {
    const ranges = results.map(r => Math.max(...r.samples.map(s => s[k])) - Math.min(...r.samples.map(s => s[k])));
    const pinned = results.filter(r => { const v = r.samples.map(s => s[k]); return Math.max(...v) - Math.min(...v) < 0.01; }).length;
    console.log(`  ${k}: mean range ${mean(ranges).toFixed(3)}  max ${Math.max(...ranges).toFixed(3)}  pinned-flat trials ${pinned}/${results.length}`);
  }
  const evoStuck = results.filter(r => r.samples[0].evo === 3).length;
  console.log(`  evolution stage: reached 3 by first sample in ${evoStuck}/${results.length} trials; ` +
              `end distribution ${JSON.stringify(results.map(r => r.samples.at(-1).evo))}`);

  // ── Q2: divergence between opponents vs noise between reps ─────────────────
  console.log('\n=== Q2  DO ENDPOINTS DIVERGE BY OPPONENT? (endpoint = mean of last 25% of samples) ===');
  const endOf = (r, k) => mean(r.samples.slice(Math.floor(r.samples.length * 0.75)).map(s => s[k]));
  for (const k of DIALS) {
    const byOpp = OPPONENTS.map(o => ({ name: o.name, vals: results.filter(r => r.opp === o.name).map(r => endOf(r, k)) }))
                            .filter(g => g.vals.length >= 2);
    if (byOpp.length < 2) { console.log(`  ${k}: too few groups`); continue; }
    const allv = byOpp.flatMap(g => g.vals);
    const gm = mean(allv);
    const ssb = byOpp.reduce((a, g) => a + g.vals.length * (mean(g.vals) - gm) ** 2, 0);
    const ssw = byOpp.reduce((a, g) => a + g.vals.reduce((b, v) => b + (v - mean(g.vals)) ** 2, 0), 0);
    const dfb = byOpp.length - 1, dfw = allv.length - byOpp.length;
    const F = (dfw > 0 && ssw > 0) ? (ssb / dfb) / (ssw / dfw) : Infinity;
    const eta2 = (ssb + ssw) > 0 ? ssb / (ssb + ssw) : 0;
    const line = byOpp.map(g => `${g.name}=${mean(g.vals).toFixed(3)}`).join('  ');
    // eta2 > 0.14 is a conventional "large effect"; F is reported so the reader
    // can see whether it rests on enough samples to mean anything.
    const verdict = (eta2 >= 0.30 && F >= 3.0) ? 'DIVERGES' : (eta2 >= 0.14 ? 'weak' : 'no separation');
    console.log(`  ${k}: ${line}\n      eta2=${eta2.toFixed(3)}  F(${dfb},${dfw})=${F.toFixed(2)}  n=${allv.length}  → ${verdict}`);
  }

  // ── Q2b: did he actually CLASSIFY them differently? ────────────────────────
  console.log('\n=== Q2b  ARCHETYPE CLASSIFICATION + DOSSIER RECALL ===');
  for (const o of OPPONENTS) {
    const rs = results.filter(r => r.opp === o.name);
    if (!rs.length) continue;
    const archs = rs.map(r => r.samples.at(-1).arch);
    const recall = rs.map(r => r.samples.at(-1).recall);
    console.log(`  ${o.name.padEnd(6)} archetypes ${JSON.stringify(archs)}  end-recall ${JSON.stringify(recall)}`);
  }
  const strats = {};
  for (const r of results) for (const s2 of r.samples) if (s2.strat) {
    strats[r.opp] = strats[r.opp] || {}; strats[r.opp][s2.strat] = (strats[r.opp][s2.strat] || 0) + 1;
  }
  console.log('  MEASURED RATES at end of fight (attack/shield/jump/dodge/air/closeShare/avgDist):');
  for (const o of OPPONENTS) {
    for (const r of results.filter(x => x.opp === o.name)) {
      const q = r.samples.at(-1).rates;
      if (q) console.log(`    ${o.name.padEnd(6)} atk=${q.a} shd=${q.s} dodge=${q.d} air=${q.air} close=${q.cs} appr=${q.ap} retr=${q.re} dist=${q.ad}`);
    }
  }
  console.log('  locked strategy mix by opponent:');
  for (const k of Object.keys(strats)) {
    const tot = Object.values(strats[k]).reduce((a, b) => a + b, 0);
    console.log(`    ${k.padEnd(6)} ` + Object.entries(strats[k]).sort((a,b)=>b[1]-a[1])
      .map(([n, c]) => `${n} ${(100*c/tot).toFixed(0)}%`).join('  '));
  }

  // ── Q3: heritability ───────────────────────────────────────────────────────
  console.log('\n=== Q3  DOES ANY OF IT REACH _genome? ===');
  const genomeChanged = results.filter(r => new Set(r.samples.map(s => s.gen)).size > 1).length;
  console.log(`  _genome changed mid-match in ${genomeChanged}/${results.length} trials`);
  console.log(`  distinct _genome values across ALL trials: ${new Set(results.map(r => r.samples[0].gen)).size}`);

  fs.writeFileSync(path.join(ROOT, 'tools', 'sov-adapt-probe-results.json'), JSON.stringify(results, null, 1));
  console.log(`\nwrote tools/sov-adapt-probe-results.json  |  page errors: ${errs.length}`);
  if (errs.length) console.log('  ' + [...new Set(errs)].slice(0, 5).join('\n  '));
  await browser.close(); server.close();
})();
