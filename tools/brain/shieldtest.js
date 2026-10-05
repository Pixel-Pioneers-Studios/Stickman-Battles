'use strict';
/*
 * tools/brain/shieldtest.js — is the shield worth learning? DEV ONLY.
 *
 * The same checkpoint plays every opponent four times from the same seeds, with
 * only the shield key's owner changed (Brain.rollout shieldMode):
 *   net   — the brain's own shield (as trained)
 *   none  — never shields on the ground
 *   f1    — scripted guard, checked every frame: raised whenever a hostile swing is in reach
 *   dec   — the same guard, checked only every 3 frames (the net's decision cadence)
 *   hold  — guard held AHEAD while a hostile is in reach and neither side is swinging
 *           or recovering; dropped whenever the net presses a button
 * --rules=pool,stacks plays every arm under each shield rule set (A/B of the rework).
 *   Append +air / +burst for the air guard and guard burst (e.g. pool,pool+air+burst);
 *   a bare 'pool' turns both off. Under them f1/dec also guard in the air and burst ASAP.
 * In the air the key is fast fall, so every arm leaves it to the net there.
 * If even f1 barely beats none, blocking is not worth teaching. If f1 wins but
 * dec does not, the 3-frame decision gap is what stands in the way.
 *
 * Also prints, for each hit the brain takes, frames since the attacker's swing
 * started — how much warning a guard would actually get.
 *
 * Usage: node tools/brain/shieldtest.js [--eps=100] [--seed=1] [--ckpt=data/brain/latest.json] [--sample]
 *        [--arms=net,none,f1,dec,hold] [--rules=pool,stacks] [--opps=sovereign,sov rnd kit,sov fast,expert]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8128;
const EPS = parseInt(args.eps, 10) || 100, SEED = parseInt(args.seed, 10) || 1;
const CKPT = path.resolve(ROOT, args.ckpt || 'data/brain/latest.json');
const GREEDY = !args.sample;

const ALL_SPECS = [
  { type: 'sovereign', label: 'sovereign', brainKit: 'randomClass' },
  { type: 'sovereign', label: 'sov rnd kit', brainKit: 'randomClass', kit: 'random' },
  { type: 'sovereign', label: 'sov fast', speed: 0.6, brainKit: 'randomClass' },
  { type: 'expert', label: 'expert', brainKit: 'randomClass' },
];
const specs = args.opps ? ALL_SPECS.filter(s => args.opps.split(',').includes(s.label)) : ALL_SPECS;
const ARMS = (args.arms || 'net,none,f1,dec').split(',');
// Shield rules to test (smb-combat.js SHIELD_RULES): every arm is played under each.
const RULES = (args.rules || 'pool').split(',');

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
    args: ['--no-sandbox', '--mute-audio'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 90000 });
    await new Promise(r => setTimeout(r, 2500));
    const ck = JSON.parse(fs.readFileSync(CKPT, 'utf8'));
    console.log(`Checkpoint iteration ${ck.iter}, ${EPS} matches per opponent per arm, seed ${SEED}, ${GREEDY ? 'top choice' : 'sampled'}`);
    const t0 = Date.now();
    // One opponent per evaluate call so a long run reports as it goes.
    for (const rules of RULES) for (let si = 0; si < specs.length; si++) {
      const row = await page.evaluate((w, spec, si, eps, seed, greedy, arms, rules) => {
        // 'pool+air+burst': base rule set, then the air guard / guard burst flags.
        const _r = rules.split('+');
        SHIELD_RULES = _r[0]; SHIELD_AIR = _r.includes('air'); GUARD_BURST = _r.includes('burst');
        const rnd = Math.random;
        const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
          t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        // Throwaway matches: the first rollout in a fresh page is not reproducible (lazy init).
        Math.random = seeded(seed);
        Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: [spec], episodes: 2, greedy });
        const out = {};
        for (const arm of arms) {
          Math.random = seeded(seed * 7919 + si * 104729);
          const r = Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: Array(eps).fill(spec), episodes: eps,
            greedy, shieldMode: arm === 'net' ? undefined : arm });
          const a = { win: 0, dt: 0, tt: 0, fr: 0, blocks: 0, hits: 0, parries: 0, raises: 0, bursts: 0, lag: {}, pre: {} };
          for (const e of r.episodes) {
            a.win += e.win; a.dt += e.stats.dmgDealt; a.tt += e.stats.dmgTaken; a.fr += e.frames;
            a.blocks += e.stats.blocks; a.hits += e.stats.hitsTaken; a.parries += e.stats.parries; a.raises += e.stats.shieldRaises; a.bursts += e.bursts || 0;
            for (const [l, pre] of e.hitLag || []) {
              const b = l < 0 ? 'none' : l <= 3 ? String(l) : l <= 6 ? '4-6' : l <= 12 ? '7-12' : '13+'; a.lag[b] = (a.lag[b] || 0) + 1;
              a.pre[pre] = (a.pre[pre] || 0) + 1;
            }
          }
          a.win /= r.episodes.length;
          out[arm] = a;
        }
        Math.random = rnd;
        return out;
      }, ck.pi, specs[si], si, EPS, SEED, GREEDY, ARMS, rules);
      const spec = specs[si];
      console.log(`\n${spec.label}  [rules: ${rules}]  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      console.log('  arm    win%   dmg ratio   blocked%   parries/match   raises/min   bursts/match');
      for (const arm of ARMS) {
        const a = row[arm];
        console.log(`  ${arm.padEnd(5)}  ${(a.win * 100).toFixed(0).padStart(3)}%   ${(a.dt / Math.max(1, a.tt)).toFixed(2).padStart(6)}     ` +
          `${(100 * a.blocks / Math.max(1, a.blocks + a.hits)).toFixed(1).padStart(5)}%    ${(a.parries / EPS).toFixed(2).padStart(6)}          ${(a.raises / (a.fr / 3600)).toFixed(1).padStart(5)}        ${(a.bursts / EPS).toFixed(2).padStart(5)}`);
      }
      if (!row.none) continue;
      const L = row.none.lag, tot = Object.values(L).reduce((x, y) => x + y, 0) || 1;
      console.log('  hits taken (arm none) by frames since swing start: ' +
        ['1', '2', '3', '4-6', '7-12', '13+', 'none'].map(k => `${k}:${(100 * (L[k] || 0) / tot).toFixed(0)}%`).join('  '));
      const P = row.none.pre;
      console.log('  hits taken (arm none) by brain state as the frame began: ' +
        ['stun', 'air', 'atk', 'open'].map(k => `${k}:${(100 * (P[k] || 0) / tot).toFixed(0)}%`).join('  ') + '   (only "open" is guardable)');
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
