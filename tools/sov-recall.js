'use strict';
/*
 * tools/sov-recall.js — DOES SOVEREIGN REMEMBER AN OPPONENT BETWEEN MATCHES? (DEV ONLY)
 *
 * The dossier's whole claim is that a returning opponent is not a stranger. Every
 * other probe WIPES it between trials on purpose, so nothing has tested that
 * claim. This does, by the only design that can:
 *
 *   1. Fight archetype A. Record where his dials end up. Commit to the dossier.
 *   2. Fight archetype A again, dossier intact. Record where the dials START.
 *   3. Fight archetype B (a different archetype), dossier intact.
 *
 * Recall is real if and only if fight 2 STARTS near where fight 1 ENDED, while
 * fight 3 does not. The second half matters as much as the first: a seed that
 * moves him the same way regardless of who he is facing is not memory, it is a
 * constant, and comparing only fight 1 to fight 2 cannot tell the difference.
 *
 * Usage: node tools/sov-recall.js [--frames=1500] [--port=8122]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
const FRAMES = parseInt(args.frames, 10) || 1500;
const PORT = parseInt(args.port, 10) || 8122;
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
const log = (...a) => console.log('[recall]', ...a);

const POLICIES = {
  turtle: `this.shielding = d < 170; if (d < 130) this.vx = -dir*4.6*0.8; else this.vx *= 0.8;
           if (d < 85 && this.cooldown <= 0 && Math.random() < 0.25) { this.shielding = false; this.attack(t); }`,
  aerial: `this.shielding = false; this.vx = dir*4.6*0.9; if (this.onGround) this.vy = -15;
           if (d < 110 && this.cooldown <= 0) this.attack(t);`,
};

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
    if (typeof SovDossier !== 'undefined') SovDossier.reset();
  });

  await page.evaluate((POLICIES) => {
    window.__rc = { host: null, sampling: false, scored: 0, lastFrame: -1, first: null, last: null };
    window.__policySrc = POLICIES;
    (function tick() {
      requestAnimationFrame(tick);
      const R = window.__rc;
      if (!R.sampling || !R.host || frameCount === R.lastFrame) return;
      R.lastFrame = frameCount;
      if (typeof isCinematic !== 'undefined' && isCinematic) return;
      const m = R.host.aiMemory; if (!m) return;
      R.scored++;
      const snap = { agg: m.aggression, def: m.defense, spc: m.spacing, rxn: m.reactionSpeed,
                     recall: R.host._dossierRecall || 0, arch: R.host._oppArchetype || null,
                     obs: R.host._oppObsFrames || 0 };
      // "Start" is sampled at frame 240: the kit-key seed lands on frame 1 and the
      // behavioural seed at frame 180, so anything earlier reads the state before
      // recall has been applied rather than the state recall produced.
      if (R.scored === 400) R.first = snap;
      R.last = snap;
    })();
  }, POLICIES);

  async function fight(policyName) {
    await page.evaluate(() => { try { backToMenu(); } catch (e) {} try { backToHome(); } catch (e) {} });
    await sleep(600);
    await page.evaluate(() => { selectMode('2p'); p1IsBot = false; p2IsBot = true; p2IsNone = false; startGame(); });
    const ok = await page.waitForFunction(() => typeof gameRunning !== 'undefined' && gameRunning &&
      Array.isArray(players) && players.length >= 2 && !(typeof isCinematic !== 'undefined' && isCinematic),
      { timeout: 60000, polling: 250 }).then(() => true).catch(e => String(e.message));
    if (ok !== true) return { error: ok };
    const eng = await page.evaluate((pn) => {
      const R = window.__rc;
      const foe = players[1];
      foe.aiDifficulty = 'expert';
      // Pin the kit. The dossier's exact-match key is `kit:<weapon>/<class>`, and
      // startGame hands out a RANDOM weapon per match — so without this every
      // rematch filed under a different key and the recall test was measuring a
      // brand new opponent each time. That was a flaw in this probe, not in the
      // dossier: it reported "no recall" for a system that was never given the
      // same opponent twice.
      if (typeof WEAPONS !== 'undefined' && WEAPONS.sword) { foe.weapon = WEAPONS.sword; foe.weaponKey = 'sword'; foe._ammo = 0; }
      foe.charClass = 'none';
      for (const p of players) p.lives = 99;
      const body = window.__policySrc[pn];
      foe.updateAI = new Function('', `
        const t = (typeof players !== 'undefined') && players.find(p => p && p !== this && p.health > 0);
        if (!t) return; const dx = t.cx() - this.cx(); const d = Math.abs(dx);
        const dir = Math.sign(dx) || 1; this.facing = dir;
        if (!this.onGround && this.canDoubleJump && this.vy > 2) { this.vy = -12; this.canDoubleJump = false; }
        ${body}`);
      if (SovereignControl.active) { try { SovereignControl.release(); } catch (e) {} }
      if (!SovereignControl.engage()) return 'engage failed';
      R.host = SovereignControl._host;
      R.scored = 0; R.first = null; R.last = null; R.lastFrame = -1; R.sampling = true;
      return 'ok';
    }, policyName);
    if (eng !== 'ok') return { error: eng };
    await page.waitForFunction(n => window.__rc.scored >= n, { timeout: 300000, polling: 500 }, FRAMES)
      .then(() => true).catch(() => 'timeout');
    return await page.evaluate(() => {
      const R = window.__rc; R.sampling = false;
      // Commit is normally driven by death; force it so a probe that ends mid-life
      // still records what the engagement taught.
      try { R.host._commitDossier('probe'); SovDossier.save(); } catch (e) {}
      return { first: R.first, last: R.last, scored: R.scored };
    });
  }

  const f1 = await fight('turtle');  log('fight 1 (turtle):', JSON.stringify(f1.last));
  const f2 = await fight('turtle');  log('fight 2 (turtle, dossier intact) START:', JSON.stringify(f2.first));
  const f3 = await fight('aerial');  log('fight 3 (aerial,  dossier intact) START:', JSON.stringify(f3.first));

  const K = ['agg', 'def', 'spc', 'rxn'];
  const dist = (a, b) => a && b ? Math.sqrt(K.reduce((s, k) => s + (a[k] - b[k]) ** 2, 0)) : NaN;
  console.log('\n=== RECALL ===');
  console.log(`  fight1 END        ${K.map(k => k + ' ' + f1.last[k].toFixed(3)).join('  ')}`);
  console.log(`  fight2 START      ${K.map(k => k + ' ' + f2.first[k].toFixed(3)).join('  ')}   recall=${f2.first.recall.toFixed(2)} arch=${f2.first.arch} obs=${f2.first.obs}`);
  console.log(`  fight3 START      ${K.map(k => k + ' ' + f3.first[k].toFixed(3)).join('  ')}   recall=${f3.first.recall.toFixed(2)} arch=${f3.first.arch} obs=${f3.first.obs}`);
  const d2 = dist(f1.last, f2.first), d3 = dist(f1.last, f3.first);
  console.log(`\n  distance from fight1's endpoint:  same opponent ${d2.toFixed(4)}   different opponent ${d3.toFixed(4)}`);
  console.log(`  → ${d2 < d3 * 0.75 ? 'RECALL IS REAL — he starts a rematch closer to what he learned'
    : d2 < d3 ? 'weak — directionally right but not decisive'
    : 'NO RECALL — the rematch starts no closer than a fresh opponent does'}`);
  console.log(`\npage errors: ${errs.length}`);
  if (errs.length) console.log('  ' + [...new Set(errs)].slice(0, 4).join('\n  '));
  await browser.close(); server.close();
})();
