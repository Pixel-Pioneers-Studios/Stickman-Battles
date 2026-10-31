'use strict';
/*
 * tools/brain/weaponread.js — does the brain need to know a weapon's name to fight it? DEV ONLY.
 *
 * The brain sees each weapon as a one-hot over KIT_WEAPONS (js/smb-brain.js); a weapon outside that
 * list reads as all zeros. Per weapon, same seeds in every arm:
 *   opp    the opponent holds the weapon            opp-blank  ...and the brain sees it as unknown
 *   me     the brain holds the weapon               me-blank   ...and sees its own as unknown
 * For a known weapon, blank minus normal is what knowing its name is worth. For an unknown weapon
 * the two arms are the same matches (a check that the seeding repeats).
 *
 * Usage: node tools/brain/weaponread.js [--ckpt=data/brain/latest.json] [--vs=self|sovereign|expert]
 *        [--eps=60] [--seed=1] [--weapons=sword,nullblade,...] [--sides=opp,me] [--json=out.json]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8131;
const EPS = parseInt(args.eps, 10) || 60, SEED = parseInt(args.seed, 10) || 1, VS = args.vs || 'self';
const CK = (j => ({ pi: j.pi || j, iter: j.iter }))(JSON.parse(fs.readFileSync(path.resolve(ROOT, args.ckpt || 'data/brain/latest.json'), 'utf8')));
// Known weapons first, then the ones no checkpoint has a one-hot for.
const UNSEEN = ['nullblade', 'voidblade', 'shockrifle', 'gauntlet', 'lantern'];
const WEAPONS_ = args.weapons ? String(args.weapons).split(',')
  : ['sword', 'katana', 'axe', 'spear', 'hammer', 'combat', 'whip', 'glassblade', 'anchor', 'gun', 'bow', 'knives', ...UNSEEN];
const SIDES = args.sides ? String(args.sides).split(',') : ['opp', 'me'];

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
    args: ['--no-sandbox', '--mute-audio', '--disable-gpu'], timeout: 180000, protocolTimeout: 3600000 });
  const rows = [];
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 180000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.evaluate(() => { try { backToHome(); } catch (e) {} });
    console.log(`Checkpoint ${CK.iter} vs ${VS}, ${EPS} matches per arm, seed ${SEED}`);
    console.log('weapon        side   win  blank  diff   dealt/min  taken/min  (blank: dealt taken)');
    for (const wk of WEAPONS_) {
      for (const side of SIDES) {
        const res = await page.evaluate((w, wk, side, vs, eps, seed) => {
          const rnd = Math.random;
          const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
          if (!WEAPONS[wk]) return { err: 'no weapon ' + wk };
          const kit = { w: wk, c: 'none' };
          const spec = side === 'opp'
            ? { type: vs, greedy: true, brainKit: 'randomClass', kit }
            : { type: vs, greedy: true, brainKit: kit, kit: 'randomClass' };
          Math.random = seeded(seed);
          Brain.rollout({ weights: w, hunt: w, maxFrames: 7200, opponents: [spec], episodes: 1, greedy: true });
          const out = {};
          for (const blank of [false, true]) {
            Math.random = seeded(seed * 7919 + wk.length);
            const r = Brain.rollout({ weights: w, hunt: w, maxFrames: 7200, opponents: [spec], episodes: eps, greedy: true, blankKit: blank ? side : null });
            const a = { win: 0, fr: 0, dealt: 0, taken: 0, errs: r.errs };
            for (const e of r.episodes) { a.win += e.win; a.fr += e.frames; a.dealt += e.stats.dmgDealt; a.taken += e.stats.dmgTaken; }
            out[blank ? 'blank' : 'normal'] = a;
          }
          Math.random = rnd;
          return out;
        }, CK.pi, wk, side, VS, EPS, SEED);
        if (res.err) { console.log(`${wk.padEnd(13)} ${res.err}`); continue; }
        const N = res.normal, B = res.blank, pm = (a, k) => a[k] / Math.max(1, a.fr) * 3600;
        const row = { weapon: wk, unseen: UNSEEN.includes(wk), side, win: 100 * N.win / EPS, blank: 100 * B.win / EPS,
          dealt: pm(N, 'dealt'), taken: pm(N, 'taken'), bDealt: pm(B, 'dealt'), bTaken: pm(B, 'taken'), errs: N.errs };
        rows.push(row);
        console.log(`${(wk + (row.unseen ? '*' : '')).padEnd(13)} ${side.padEnd(5)} ${row.win.toFixed(0).padStart(4)} ${row.blank.toFixed(0).padStart(6)} ${(row.blank - row.win).toFixed(0).padStart(5)}` +
          `   ${row.dealt.toFixed(0).padStart(8)}   ${row.taken.toFixed(0).padStart(8)}    ${row.bDealt.toFixed(0)} ${row.bTaken.toFixed(0)}` +
          (Object.keys(N.errs || {}).length ? '   errs ' + JSON.stringify(N.errs) : ''));
      }
    }
    const se = Math.sqrt(0.25 / EPS) * 100;
    for (const side of SIDES) {
      const k = rows.filter(r => r.side === side && !r.unseen), u = rows.filter(r => r.side === side && r.unseen);
      const avg = (a, f) => a.reduce((s, r) => s + f(r), 0) / Math.max(1, a.length);
      console.log(`\n  ${side}: known weapons win ${avg(k, r => r.win).toFixed(1)}%, blanked ${avg(k, r => r.blank).toFixed(1)}% ` +
        `(diff ${avg(k, r => r.blank - r.win).toFixed(1)}, SE of the mean diff ~${(se * Math.SQRT2 / Math.sqrt(Math.max(1, k.length))).toFixed(1)}); unseen win ${avg(u, r => r.win).toFixed(1)}%`);
    }
    if (args.json) fs.writeFileSync(path.resolve(ROOT, args.json), JSON.stringify({ iter: CK.iter, vs: VS, eps: EPS, seed: SEED, rows }, null, 1) + '\n');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
