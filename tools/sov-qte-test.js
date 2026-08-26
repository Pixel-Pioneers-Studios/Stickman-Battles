'use strict';
/*
 * tools/sov-qte-test.js — can a possessed Sovereign clear the TrueForm QTEs?
 *
 * Starts the TrueForm refight, possesses P1 with SovereignMK2, installs
 * tools/sov-qte-autopilot.js, then walks the boss down through all four QTE
 * thresholds (75 / 50 / 25 / 10 %) and reports whether each phase was passed.
 *
 * This is the prerequisite for A/B-testing Sovereign against TrueForm at all:
 * the fight gates on these checkpoints and Phase 4 is all-or-nothing.
 *
 * Usage:
 *   node tools/sov-qte-test.js [--mistake=0] [--reaction=10] [--nomirror] [--port=8100]
 */

const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const PORT = parseInt(args.port, 10) || 8100;
const OPTS = {
  mistakeRate:    args.mistake  !== undefined ? parseFloat(args.mistake)  : 0,
  reactionFrames: args.reaction !== undefined ? parseInt(args.reaction, 10) : 10,
  readMirror:     !args.nomirror,
  log: false
};
const NO_AUTOPILOT = !!args.noautopilot;   // control: possess Sovereign, give him no hands

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.wav':'audio/wav' };
const log = (...a) => console.log('[qte]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function startServer() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    s.listen(PORT, () => resolve(s));
  });
}

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  const launchOpts = { headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] };
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(sysChrome)) launchOpts.executablePath = sysChrome;
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  const NOISE = /onrender\.com|crazygames|supabase|live-config|\/api\/|ERR_FAILED|Failed to load resource|404|CORS|ERR_CONNECTION/i;
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  page.on('console', m => { const t = m.text();
    if (m.type() === 'error' && !NOISE.test(t)) pageErrors.push(t);
    else if (/SovQTE/.test(t)) console.log('   ', t); });

  log(`server on :${PORT}  opts=${JSON.stringify(OPTS)}`);
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);

  await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
      }
      if (typeof storyModeActive !== 'undefined') storyModeActive = false;
      if (typeof activeCinematic !== 'undefined') activeCinematic = null;
    } catch (e) {}
    ['prologueOverlay','storyPrologueOverlay','storyPathPanel','storyModal','storyIntroOverlay','storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
  });

  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'sov-qte-autopilot.js'), 'utf8'));

  // QTE lifecycle observer — records every phase from first appearance to outro.
  await page.evaluate(() => {
    window.__qteLog = [];
    let cur = null;
    (function tick() {
      requestAnimationFrame(tick);
      const s = (typeof QTE_STATE !== 'undefined') ? QTE_STATE : null;
      if (s && (!cur || cur.phase !== s.phase)) {
        cur = { phase: s.phase, name: s.def && s.def.name, lastStage: s.stage,
                attempts: 0, completed: 0, fails: 0, resolved: null,
                queued: Array.isArray(s.promptQueue) ? s.promptQueue.length : 0, presses: 0 };
        window.__qteLog.push(cur);
      }
      if (s && cur) {
        cur.lastStage   = s.stage;
        cur.attempts    = s.totalAttempts;
        cur.completed   = s.completedCount;
        cur.fails       = s.failCount;
        cur.presses     = (typeof SovQTE !== 'undefined' && SovQTE.active) ? SovQTE._pressCount : 0;
        if (s.stage === 'outro_success') cur.resolved = 'PASS';
        if (s.stage === 'outro_fail')    cur.resolved = 'fail-round';
      }
      if (!s && cur && cur.resolved === null) cur.resolved = 'ended-unresolved';
      if (!s) cur = null;
    })();
  });

  // Start the TrueForm refight and wait out its scripted opening.
  await page.evaluate(() => { selectMode('trueform'); startGame(); });
  const ready = await page.waitForFunction(() => {
    if (typeof gameRunning === 'undefined' || !gameRunning) return false;
    if (typeof tfCinematicState !== 'undefined' && tfCinematicState !== 'none') return false;
    if (typeof isCinematic !== 'undefined' && isCinematic) return false;
    if (typeof gameFrozen !== 'undefined' && gameFrozen) return false;
    return Array.isArray(players) && players.some(p => p && p.isTrueForm && p.health > 0);
  }, { timeout: 180000, polling: 500 }).then(() => true).catch(e => 'TIMEOUT ' + e.message);
  if (ready !== true) { log('FATAL: TrueForm never became fightable —', ready); await browser.close(); server.close(); process.exit(1); }
  log('TrueForm fight live');

  const engaged = await page.evaluate((o) => {
    if (!SovereignControl.engage()) return 'engage failed';
    const h = SovereignControl._host;
    if (!h || !h.isAI) return 'host not AI';
    if (!o._disabled) SovQTE.enable(o);
    return 'ok';
  }, Object.assign({ _disabled: NO_AUTOPILOT }, OPTS));
  if (engaged !== 'ok') { log('FATAL:', engaged); await browser.close(); server.close(); process.exit(1); }
  log('Sovereign possessing P1; autopilot ' + (NO_AUTOPILOT ? 'DISABLED (control run)' : 'armed'));

  // Walk the boss down through each threshold.
  for (const [phase, thr] of [[1, 0.75], [2, 0.50], [3, 0.25], [4, 0.10]]) {
    await page.evaluate((t) => {
      const tf = players.find(p => p && p.isTrueForm);
      if (tf) tf.health = Math.max(1, Math.floor(tf.maxHealth * (t - 0.01)));
    }, thr);
    const seen = await page.waitForFunction((ph) => window.__qteLog.some(e => e.phase === ph),
      { timeout: 60000, polling: 250 }, phase).then(() => true).catch(e => 'TIMEOUT');
    if (seen !== true) { log(`phase ${phase}: never triggered`); continue; }
    const done = await page.waitForFunction((ph) => {
      const e = window.__qteLog.find(x => x.phase === ph);
      return e && e.resolved !== null;
    }, { timeout: 120000, polling: 250 }, phase).then(() => true).catch(() => 'TIMEOUT');
    const e = await page.evaluate((ph) => window.__qteLog.find(x => x.phase === ph), phase);
    log(`phase ${phase} ${String(e.name).padEnd(22)} ${String(e.resolved).padEnd(16)} ` +
        `completed ${e.completed}/${e.queued} failed ${e.fails} attempts ${e.attempts} presses ${e.presses}` +
        (done === true ? '' : '  [resolve timeout]'));
    await sleep(1500);
  }

  const final = await page.evaluate(() => ({ log: window.__qteLog, stats: (typeof SovQTE !== 'undefined' && SovQTE.opts) ? SovQTE.stats() : null }));
  console.log('\n' + '='.repeat(64));
  const passed = final.log.filter(e => e.resolved === 'PASS').length;
  log(`phases seen ${final.log.length}   PASS ${passed}`);
  const comp = final.log.reduce((a, e) => a + e.completed, 0);
  const fail = final.log.reduce((a, e) => a + e.fails, 0);
  const pres = final.log.reduce((a, e) => a + e.presses, 0);
  log(`prompts completed ${comp}, failed ${fail}, autopilot presses ${pres}`);
  log(`accuracy ${comp + fail ? (100 * comp / (comp + fail)).toFixed(1) + '%' : '—'}`);
  console.log('='.repeat(64));
  fs.writeFileSync(path.join(ROOT, 'tools', 'sov-qte-results.json'), JSON.stringify({ opts: OPTS, ...final }, null, 2));
  if (pageErrors.length) { log(`page errors (${pageErrors.length}):`); pageErrors.slice(0, 8).forEach(e => log('  !', e)); }
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error('[qte] FATAL', e); process.exit(1); });
