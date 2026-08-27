'use strict';
/*
 * tools/sov-winrate.js — DOES SOVEREIGN BEAT THE PANEL? (DEV ONLY)
 *
 * The adaptation probes answer "does he read his opponent differently". This
 * answers the question that actually matters: does the reading WIN.
 *
 * Uses the trainer's headless sim (SMK2Trainer.runMatch with a scripted panel
 * opponent), so a match costs milliseconds instead of the two real-time minutes
 * a browser trial costs, and n can be large enough for the result to mean
 * something.
 *
 * Reports, per archetype: win rate by stock differential, mean stocks for and
 * against, damage dealt/taken, and lockout share.
 *
 * Honest scope: the panel is four scripted policies. A high win rate here is
 * evidence of robustness across those four behaviours. It is NOT evidence that
 * he beats an arbitrary human, and nothing in this file can be.
 *
 * Usage: node tools/sov-winrate.js [--matches=12] [--port=8113] [--genome=default]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MATCHES = parseInt(args.matches, 10) || 12;
const PORT    = parseInt(args.port, 10)    || 8113;
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
const log = (...a) => console.log('[win]', ...a);
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
  await page.evaluate(() => { try { if (typeof backToHome === 'function') backToHome(); } catch (e) {} });

  const have = await page.evaluate(() => typeof SMK2Trainer !== 'undefined' && !!SMK2Trainer.SMK2_PANEL);
  if (!have) { log('SMK2Trainer.SMK2_PANEL missing'); await browser.close(); server.close(); return; }

  const out = await page.evaluate(async (MATCHES, NOBUFF) => {
    const res = {};
    for (const p of SMK2Trainer.SMK2_PANEL) {
      const rows = [];
      for (let i = 0; i < MATCHES; i++) {
        const seed = (Math.random() * 1e9) | 0;
        rows.push(SMK2Trainer.runMatch(null, 1, seed, { duel: true, panel: p, noBuff: NOBUFF }));
        await new Promise(r => setTimeout(r, 0));   // yield so the page stays responsive
      }
      res[p.name] = rows;
    }
    return res;
  }, MATCHES, !!args.nobuff);

  const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  console.log(`\n=== SOVEREIGN vs SCRIPTED PANEL (${MATCHES} matches each, 5 stocks a side)${args.nobuff ? ' [NO DUEL BUFF]' : ''} ===\n`);
  console.log('  archetype   win%   stocks(for-against)   dmg dealt/taken   locked%');
  let worstWin = 101, worstName = null;
  for (const name of Object.keys(out)) {
    const rows = out[name];
    const wins = rows.filter(r => (r.oppDeaths - (5 - r.sovLivesLeft)) > 0).length;
    const draws = rows.filter(r => (r.oppDeaths - (5 - r.sovLivesLeft)) === 0).length;
    const wr = 100 * wins / rows.length;
    if (wr < worstWin) { worstWin = wr; worstName = name; }
    console.log(`  ${name.padEnd(10)} ${wr.toFixed(0).padStart(4)}%  ` +
      `${mean(rows.map(r => r.oppDeaths)).toFixed(1)} - ${mean(rows.map(r => 5 - r.sovLivesLeft)).toFixed(1)}` +
      `          ${Math.round(mean(rows.map(r => r.dmgDealt)))} / ${Math.round(mean(rows.map(r => r.dmgTaken)))}` +
      `        ${mean(rows.map(r => r.lockedPct)).toFixed(1)}%` + (draws ? `   (${draws} draw)` : ''));
  }
  // Calibration block. The panel's job is to stand in for a human, so the
  // question that decides whether DUEL_BUFF is set correctly is not "does
  // Sovereign win" but "does the panel opponent pressure him the way a human
  // does". Targets come from tools/sov-calibrate-buff.js over the four
  // measurable human-vs-Sovereign replays.
  const TGT = { dmgInto: 164.3, lock: 15.4 };   // median of real human matches
  console.log(`\n  --- CALIBRATION vs REAL HUMAN REPLAYS (target ${TGT.dmgInto} dmg/1k into him, ${TGT.lock}% locked) ---`);
  console.log('  archetype   dmg/1k into Sov   ratio-to-human   locked%   ratio-to-human');
  const ratios = [], locks = [];
  for (const name of Object.keys(out)) {
    const rows = out[name].filter(r => r.framesRun > 0);
    if (!rows.length) { console.log(`  ${name.padEnd(10)}  no framesRun — is smb-smk2-training.js current?`); continue; }
    const per1k = mean(rows.map(r => 1000 * r.dmgTaken / r.framesRun));
    const lock  = mean(rows.map(r => r.lockedPct));
    ratios.push(per1k / TGT.dmgInto); locks.push(lock / TGT.lock);
    console.log(`  ${name.padEnd(10)} ${per1k.toFixed(1).padStart(12)}   ${(per1k / TGT.dmgInto).toFixed(2).padStart(12)}x   ` +
      `${lock.toFixed(1).padStart(6)}%   ${(lock / TGT.lock).toFixed(2).padStart(12)}x`);
  }
  if (ratios.length) {
    const rMean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const lMean = locks.reduce((a, b) => a + b, 0) / locks.length;
    console.log(`\n  Panel inflicts ${rMean.toFixed(2)}x a human's damage and ${lMean.toFixed(2)}x a human's lockout.`);
    console.log(`  Both below 1.0 means the panel is SOFTER than a real player${args.nobuff ? '' : ' even WITH the buff on'}.`);
    console.log('');
    console.log('  Do NOT just scale DUEL_BUFF.dmg by 1/ratio to close this. That arithmetic');
    console.log('  is wrong for the lockout half, and lockout is the half we can actually');
    console.log('  trust. Measured previously (see the note at the bot-construction site in');
    console.log('  smb-smk2-training.js): taking damage 2.2x -> 5x moved lockout 5.7% -> 4.1%,');
    console.log('  i.e. DOWN. Lockout comes from CHAINED hits, not big ones — bigger hits end');
    console.log('  the exchange sooner. The damage gap is a stat knob; the lockout gap is a');
    console.log('  panel-policy problem (how often an archetype re-engages and strings hits).');
    console.log('');
    console.log('  Caveat: replay damage attribution is ~46% inferred (event.byGuess), so the');
    console.log('  dmg/1k column carries real error. The locked% column is read directly from');
    console.log('  per-frame stn/rag and does not — prefer it when the two disagree.');
  }

  console.log(`\n  WORST CASE: ${worstWin.toFixed(0)}% vs ${worstName}`);
  console.log('  Worst case is the number that matters. "Beats everyone" is a worst-case');
  console.log('  property — a strong mean with one bad matchup is exactly the profile that');
  console.log('  loses to the one player who fights that way.');
  // Buffed and noBuff runs used to write the same path, so whichever ran last
  // silently replaced the other — and the two are not interchangeable.
  const outName = args.nobuff ? 'sov-winrate-results-nobuff.json' : 'sov-winrate-results.json';
  fs.writeFileSync(path.join(ROOT, 'tools', outName), JSON.stringify(out, null, 1));
  console.log(`\nwrote tools/${outName}  |  page errors: ${errs.length}`);
  if (errs.length) console.log('  ' + [...new Set(errs)].slice(0, 4).join('\n  '));
  await browser.close(); server.close();
})();
