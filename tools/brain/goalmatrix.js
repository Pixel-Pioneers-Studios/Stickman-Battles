'use strict';
/*
 * tools/brain/goalmatrix.js — do the objectives change what a goal-conditioned checkpoint does? DEV ONLY.
 *
 * Per style, the opponent's hpMult is calibrated (objective none) until the brain wins about half its
 * matches. Then every objective plays the same seeded draws at that hpMult. The question is whether the
 * best objective differs by style (a reversal) and whether the objectives move the brain's behaviour at all.
 *
 * Usage: node tools/brain/goalmatrix.js --ckpt=<path> [--styles=turtle,rushdown] [--eps=200] [--calEps=60]
 *        [--seed=1] [--port=8143] [--json=out.json]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8143;
const EPS = parseInt(args.eps, 10) || 200, CAL_EPS = parseInt(args.calEps, 10) || 60, SEED = parseInt(args.seed, 10) || 1;
if (!args.ckpt) { console.error('goalmatrix.js: --ckpt=<path> is required'); process.exit(1); }
const CKPT = path.resolve(ROOT, args.ckpt);
const OBJ_NAMES = ['none', 'pressure', 'punish', 'antiair'];
const STEPS = 6, LO = 0.5, HI = 8;

// Same table and kits as adapt.js, kept in sync by hand.
const HUMAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'human-proxy-params-v4.json'), 'utf8')); delete HUMAN.hpMult;
const STYLES = {
  turtle:   { spacing: 110, pokeRate: 0.25, shieldUse: 0.85, whiffPunish: 0.9, offenseRead: 0.5, jumpInRate: 0, airHopRate: 0,
              evadeJump: 0.15, comboFollow: 0.4, abilityRate: 0.15 },
  rushdown: { spacing: 35, decisionEvery: 2, pokeRate: 0.95, comboFollow: 0.95, retreatDiscipline: 0, shieldUse: 0,
              evadeJump: 0.15, jumpInRate: 0.15, abilityRate: 0.6, superRate: 1 },
  zoner:    { spacing: 320, pokeRate: 0.9, retreatDiscipline: 0.9, shieldUse: 0.05, evadeJump: 0.7, airHopRate: 0.05, jumpInRate: 0 },
  aerial:   { spacing: 80, airHopRate: 0.6, jumpInRate: 0.6, aboveAttackRate: 0.95, fastFallRate: 0.7, evadeJump: 0.9,
              doubleJumpEvade: 0.9, shieldUse: 0 },
  counter:  { spacing: 150, pokeRate: 0.1, whiffPunish: 1, offenseRead: 0.9, antiAir: 0.95, antiAirDescent: 0.9, readRate: 0.6,
              shieldUse: 0.2, jumpInRate: 0, airHopRate: 0.02, comboFollow: 0.8 },
  human:    HUMAN,
};
const styleNames = args.styles ? String(args.styles).split(',') : ['turtle', 'rushdown'];
for (const k of styleNames) if (!STYLES[k]) { console.error('unknown style ' + k); process.exit(1); }
const mkSpec = (k, hp) => ({ type: 'style', label: k, params: STYLES[k], hpMult: hp, brainKit: 'randomClass',
  kit: k === 'zoner' ? { w: 'ranged', c: 'none' } : undefined });

(async () => {
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
    const ck = JSON.parse(fs.readFileSync(CKPT, 'utf8'));
    await page.evaluate((w, specs, seed) => {
      window._gmRnd = Math.random;
      window._gmSeeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      // Throwaway matches: the first rollout in a fresh page starts from different leftover state.
      Math.random = window._gmSeeded(seed);
      Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: specs.concat(specs), episodes: specs.length * 2 });
      Math.random = window._gmRnd;
    }, ck.pi, styleNames.map(k => mkSpec(k, 1.5)), SEED);

    // One cell: eps matches at this hpMult and objective, always from the same seed.
    const cell = (k, hp, objective, eps) => page.evaluate((w, spec, eps, seed, objective) => {
      Math.random = window._gmSeeded(seed);
      const r = Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: Array(eps).fill(spec), episodes: eps, objective });
      Math.random = window._gmRnd;
      const a = { win: 0, dt: 0, tt: 0, fr: 0, pr: 0, pu: 0, aa: 0 };
      for (const e of r.episodes) {
        a.win += e.win; a.dt += e.stats.dmgDealt; a.tt += e.stats.dmgTaken; a.fr += e.frames;
        a.pr += e.stats.objPressureDmg; a.pu += e.stats.objPunishDmg; a.aa += e.stats.objAntiAirDmg;
      }
      a.win = 100 * a.win / r.episodes.length;
      return a;
    }, ck.pi, mkSpec(k, hp), eps, SEED * 7919 + styleNames.indexOf(k) * 104729, objective);

    const calibration = {}, cells = {};
    // --hp=turtle:6.7,rushdown:7.7 skips calibration for those styles.
    const fixedHp = Object.fromEntries(String(args.hp || '').split(',').filter(Boolean).map(s => s.split(':')).map(([k, v]) => [k, +v]));
    for (const k of styleNames) {
      let lo = Math.log(LO), hi = Math.log(HI), best = fixedHp[k] ? { hpMult: fixedHp[k], win: NaN } : null;
      for (let s = 0; s < (fixedHp[k] ? 0 : STEPS); s++) {
        const hp = Math.exp((lo + hi) / 2), a = await cell(k, hp, 0, CAL_EPS);
        console.log(`  cal ${k.padEnd(9)} step ${s + 1}/${STEPS} hpMult ${hp.toFixed(2)} win ${a.win.toFixed(0)}%`);
        if (!best || Math.abs(a.win - 50) < Math.abs(best.win - 50)) best = { hpMult: hp, win: a.win };
        // More opponent health = harder for the brain: win rate above 50 means raise it.
        if (a.win > 50) lo = Math.log(hp); else hi = Math.log(hp);
      }
      calibration[k] = best;
      cells[k] = {};
      for (let o = 0; o < 4; o++) {
        const a = await cell(k, best.hpMult, o, EPS), m = a.fr / 3600;
        cells[k][OBJ_NAMES[o]] = { win: a.win, dmgDealt: a.dt, dmgTaken: a.tt, minutes: m,
          pressurePerMin: a.pr / m, punishPerMin: a.pu / m, antiairPerMin: a.aa / m };
      }
    }

    console.log(`\nCheckpoint iteration ${ck.iter} (input ${ck.pi.sizes[0]}), ${EPS} matches per cell, calibration ${CAL_EPS}, seed ${SEED}. Same draws in every objective column.`);
    console.log('style      hpMult  objective   win%  dmg dealt  dmg taken  pressure/min  punish/min  antiair/min');
    for (const k of styleNames) for (const n of OBJ_NAMES) {
      const c = cells[k][n];
      console.log(`${k.padEnd(10)} ${calibration[k].hpMult.toFixed(2).padStart(6)}  ${n.padEnd(9)} ${c.win.toFixed(0).padStart(5)} ${c.dmgDealt.toFixed(0).padStart(10)} ${c.dmgTaken.toFixed(0).padStart(10)} ` +
        `${c.pressurePerMin.toFixed(1).padStart(13)} ${c.punishPerMin.toFixed(1).padStart(11)} ${c.antiairPerMin.toFixed(1).padStart(12)}`);
    }

    // Reversal: with two styles A, B and objectives a* = best on A, b* = best on B (a* != b*), a* must beat
    // b* on A and b* must beat a* on B by at least 7 win points.
    const bestOf = k => OBJ_NAMES.reduce((b, n) => cells[k][n].win > cells[k][b].win ? n : b, OBJ_NAMES[0]);
    let verdict = 'no reversal', detail = null;
    if (styleNames.length >= 2) {
      const [A, B] = styleNames, a = bestOf(A), b = bestOf(B);
      const gapA = cells[A][a].win - cells[A][b].win, gapB = cells[B][b].win - cells[B][a].win;
      detail = { styleA: A, bestA: a, styleB: B, bestB: b, gapA, gapB };
      if (a !== b && gapA >= 7 && gapB >= 7) verdict = 'reversal';
    }
    // Collapse: every objective's three event-damage-per-minute figures within 10% of none's.
    const within = (x, y) => Math.abs(x - y) <= 0.1 * Math.max(Math.abs(y), 1e-9);
    const collapse = styleNames.every(k => ['pressurePerMin', 'punishPerMin', 'antiairPerMin'].every(f =>
      OBJ_NAMES.slice(1).every(n => within(cells[k][n][f], cells[k].none[f]))));
    console.log(`\nverdict: ${verdict}${detail ? `  (${detail.styleA} best ${detail.bestA}, gap ${detail.gapA.toFixed(1)}; ${detail.styleB} best ${detail.bestB}, gap ${detail.gapB.toFixed(1)})` : ''}`);
    if (collapse) console.log('collapse: objectives do not change the event-damage profile (all within 10% of none)');
    if (args.json) {
      fs.mkdirSync(path.dirname(path.resolve(ROOT, args.json)), { recursive: true });
      fs.writeFileSync(path.resolve(ROOT, args.json), JSON.stringify({ iter: ck.iter, eps: EPS, calEps: CAL_EPS, seed: SEED,
        calibration, cells, verdict, collapse, detail }) + '\n');
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
