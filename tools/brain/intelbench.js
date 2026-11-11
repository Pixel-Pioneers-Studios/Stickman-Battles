'use strict';
/*
 * tools/brain/intelbench.js — experiment B: can Layer 1 (js/smb-sov-intel.js) detect a sudden change in
 * how the opponent plays? DEV ONLY.
 *
 * The brain (greedy, like live Sovereign) fights fixed-style proxies that switch style ONCE at a hidden
 * frame drawn per match (spec.switchAt). Controls play the same style on both sides of the switch, so
 * they measure false alarms in exactly the same window. Layer 1's drift scores are recorded every 15
 * frames; thresholds are swept offline, so one simulation pass scores every detector setting.
 *
 * Scoring per detector (series x threshold), all after a 10 s warm-up:
 *   hit       = the score crosses the threshold within --window seconds after the switch (switch pairs)
 *   control   = the same, in control matches (no real switch): the false-hit rate to beat
 *   latency   = seconds from the switch to that crossing (median, hits only)
 *   alarms/min= crossings before the switch, any match (rising edges, 5 s refractory)
 *
 * Usage: node tools/brain/intelbench.js [--ckpt=data/brain/latest.json] [--eps=20] [--hp=7] [--window=20]
 *        [--styles=turtle,rushdown,aerial,counter] [--seed=1] [--port=8144] [--json=data/brain-intel/bench.json]
 *        [--from=<saved json>]   (re-analyse a saved run without simulating)
 *        [--vals]                (also record medium-window feature values every 60 frames)
 *        [--habits=none,masher,blocker,jumper]  opponents are the checkpoint itself (top choice) carrying a
 *                                switching habit (js/smb-brain.js HABITS) instead of proxy styles; both
 *                                sides get --hp so matches outlast the switch
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8144;
const EPS = parseInt(args.eps, 10) || 20, HP = +args.hp || 7, SEED = parseInt(args.seed, 10) || 1;
const WINDOW = (+args.window || 20) * 60, WARM = 600, REFRACT = 300, EVERY = 15;
const CKPT = path.resolve(ROOT, args.ckpt || 'data/brain/latest.json');
const OUT = path.resolve(ROOT, args.json || 'data/brain-intel/bench.json');

// Same table as goalmatrix.js / adapt.js, kept in sync by hand.
const STYLES = {
  turtle:   { spacing: 110, pokeRate: 0.25, shieldUse: 0.85, whiffPunish: 0.9, offenseRead: 0.5, jumpInRate: 0, airHopRate: 0,
              evadeJump: 0.15, comboFollow: 0.4, abilityRate: 0.15 },
  rushdown: { spacing: 35, decisionEvery: 2, pokeRate: 0.95, comboFollow: 0.95, retreatDiscipline: 0, shieldUse: 0,
              evadeJump: 0.15, jumpInRate: 0.15, abilityRate: 0.6, superRate: 1 },
  aerial:   { spacing: 80, airHopRate: 0.6, jumpInRate: 0.6, aboveAttackRate: 0.95, fastFallRate: 0.7, evadeJump: 0.9,
              doubleJumpEvade: 0.9, shieldUse: 0 },
  counter:  { spacing: 150, pokeRate: 0.1, whiffPunish: 1, offenseRead: 0.9, antiAir: 0.95, antiAirDescent: 0.9, readRate: 0.6,
              shieldUse: 0.2, jumpInRate: 0, airHopRate: 0.02, comboFollow: 0.8 },
};
const HABIT_MODE = !!args.habits;
const styleNames = HABIT_MODE ? (args.habits === true ? 'none,masher,blocker,jumper' : String(args.habits)).split(',')
  : args.styles ? String(args.styles).split(',') : Object.keys(STYLES);
const pairs = [];
for (const a of styleNames) for (const b of styleNames) pairs.push([a, b]);   // a === b = control

async function simulate() {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    fs.createReadStream(fp).pipe(r);
  }).listen(PORT);
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--mute-audio', '--disable-gpu'], protocolTimeout: 0 });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 180000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.addScriptTag({ path: path.join(ROOT, 'tools', 'human-proxy.js') });
    const ok = await page.evaluate(() => typeof SovIntel !== 'undefined' && typeof Brain !== 'undefined' && typeof HumanProxy !== 'undefined');
    if (!ok) throw new Error('SovIntel / Brain / HumanProxy missing in page');
    const ck = JSON.parse(fs.readFileSync(CKPT, 'utf8'));
    if (HABIT_MODE) await page.evaluate(names => { for (const h of names) if (h !== 'none' && !Brain.HABITS[h]) throw new Error('unknown habit ' + h); }, styleNames);
    const spec = ([a, b]) => HABIT_MODE
      ? { type: 'self', label: a === b ? `${a}=${a}` : `${a}>${b}`, weights: ck.pi, greedy: true, habits: [a, b],
          switchAt: [1800, 3600], hpMult: HP, brainHpMult: HP, kit: 'randomClass', brainKit: 'randomClass' }
      : { type: 'style', label: a === b ? `${a}=${a}` : `${a}>${b}`, styles: [STYLES[a], STYLES[b]],
          switchAt: [1800, 3600], hpMult: HP, brainKit: 'randomClass' };
    await page.evaluate((w, s, vals) => {
      window._ibRnd = Math.random; window._ibVals = vals;
      window._ibSeeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = x;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      // Throwaway match: the first rollout in a fresh page starts from different leftover state.
      Brain.rollout({ weights: w, steps: 1, maxFrames: 1200, opponents: [s], episodes: 1, greedy: true });
    }, ck.pi, spec(pairs[0]), !!args.vals);
    const eps = [];
    for (let i = 0; i < pairs.length; i++) {
      const t0 = Date.now();
      const r = await page.evaluate((w, s, n, seed, every) => {
        Math.random = window._ibSeeded(seed);
        const out = Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: Array(n).fill(s), episodes: n,
          greedy: true, intel: { every, vals: !!window._ibVals } });
        Math.random = window._ibRnd;
        return out.episodes.map(e => ({ label: e.opp, frames: e.frames, win: e.win, sw: e.intel.sw, s: e.intel.s, m: e.intel.m, mz: e.intel.mz, vals: e.intel.vals,
          fires: e.stats.habitFires, firesLate: e.stats.habitFiresLate }));
      }, ck.pi, spec(pairs[i]), EPS, SEED * 7919 + i * 104729, EVERY);
      eps.push(...r);
      console.log(`  ${spec(pairs[i]).label.padEnd(18)} ${r.length} matches, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    return { iter: ck.iter, hp: HP, seed: SEED, every: EVERY, opponents: HABIT_MODE ? 'habits' : 'styles', eps };
  } finally { await browser.close(); server.close(); }
}

// Rising-edge crossings of `thr`, with a refractory gap, as frame numbers.
function crossings(series, thr, every) {
  const out = []; let last = -1e9, above = false;
  for (let k = 0; k < series.length; k++) {
    const f = k * every, on = series[k] >= thr;
    if (on && !above && f >= WARM && f - last >= REFRACT) { out.push(f); last = f; }
    above = on;
  }
  return out;
}
const median = a => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function analyse(run) {
  // Only matches that ran the whole detection window after the switch can score.
  const usable = run.eps.filter(e => e.sw && e.frames >= e.sw + WINDOW);
  const sw = usable.filter(e => !e.label.includes('=')), ctl = usable.filter(e => e.label.includes('='));
  console.log(`\nCheckpoint ${run.iter}, opponent hpMult ${run.hp}, seed ${run.seed}: ${run.eps.length} matches, ${usable.length} usable ` +
    `(${sw.length} switch, ${ctl.length} control; the rest ended before switch + ${WINDOW / 60} s).`);
  const rows = [];
  for (const series of ['s', 'm', 'mz']) {
    const all = usable.flatMap(e => e[series]);
    const qs = [0.9, 0.95, 0.97, 0.98, 0.99, 0.995, 0.998].map(q => all.slice().sort((x, y) => x - y)[Math.floor(q * (all.length - 1))]);
    for (const thr of [...new Set(qs)]) {
      const hitIn = e => crossings(e[series], thr, run.every).find(f => f >= e.sw && f < e.sw + WINDOW);
      const lat = [];
      let hits = 0; for (const e of sw) { const f = hitIn(e); if (f !== undefined) { hits++; lat.push((f - e.sw) / 60); } }
      let fh = 0; for (const e of ctl) if (hitIn(e) !== undefined) fh++;
      let pre = 0, preMin = 0;
      for (const e of usable) { pre += crossings(e[series], thr, run.every).filter(f => f < e.sw).length; preMin += Math.max(0, e.sw - WARM) / 3600; }
      rows.push({ series, thr, hit: 100 * hits / Math.max(1, sw.length), ctl: 100 * fh / Math.max(1, ctl.length),
        lat: median(lat), alarms: pre / Math.max(1e-9, preMin) });
    }
  }
  const name = { s: 'short vs long, mean z^2', m: 'medium vs long, mean z^2', mz: 'medium vs long, max |z|' };
  console.log(`\nDetector                     thresh   hit%  control%  edge   latency s  alarms/min (pre-switch)`);
  for (const r of rows) console.log(`${name[r.series].padEnd(28)} ${r.thr.toFixed(2).padStart(6)} ${r.hit.toFixed(0).padStart(6)} ${r.ctl.toFixed(0).padStart(9)} ` +
    `${(r.hit - r.ctl).toFixed(0).padStart(5)} ${isNaN(r.lat) ? '    -' : r.lat.toFixed(1).padStart(10)} ${r.alarms.toFixed(2).padStart(11)}`);
  // Operating point: best hit rate with a control false-hit rate of 10% or less.
  const okRows = rows.filter(r => r.ctl <= 10);
  const best = okRows.sort((a, b) => b.hit - a.hit)[0];
  if (best) {
    console.log(`\nBest at <=10% control false hits: ${name[best.series]} @ ${best.thr.toFixed(2)}: hit ${best.hit.toFixed(0)}%, ` +
      `control ${best.ctl.toFixed(0)}%, median latency ${best.lat.toFixed(1)} s, ${best.alarms.toFixed(2)} alarms/min before the switch.`);
    console.log('Per pair at that setting (hit% / median latency s):');
    const byLabel = {};
    for (const e of usable) (byLabel[e.label] = byLabel[e.label] || []).push(e);
    for (const [lab, list] of Object.entries(byLabel).sort()) {
      const lat = []; let h = 0;
      for (const e of list) { const f = crossings(e[best.series], best.thr, run.every).find(x => x >= e.sw && x < e.sw + WINDOW); if (f !== undefined) { h++; lat.push((f - e.sw) / 60); } }
      console.log(`  ${lab.padEnd(18)} n=${String(list.length).padStart(2)}  ${(100 * h / list.length).toFixed(0).padStart(3)}%  ${isNaN(median(lat)) ? '-' : median(lat).toFixed(1)}`);
    }
  } else console.log('\nNo detector setting held control false hits at 10% or less.');
  return { rows, best };
}

(async () => {
  const run = args.from ? JSON.parse(fs.readFileSync(path.resolve(ROOT, args.from), 'utf8')) : await simulate();
  if (!args.from) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(run) + '\n'); console.log(`saved ${path.relative(ROOT, OUT)}`); }
  analyse(run);
})().catch(e => { console.error(e); process.exit(1); });
