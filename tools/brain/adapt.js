'use strict';
/*
 * tools/brain/adapt.js — does the latest checkpoint actually READ its opponent? DEV ONLY.
 *
 * Every fixed playstyle is played twice from the same seed: once normally, once
 * with the opponent read frozen at its match-start values (Brain.rollout histOff). If the net uses
 * what it has seen of the opponent, the zeroed run trades worse. Early (first
 * 10 s) vs late damage ratio is shown too: a reader should trade better late.
 *
 * Usage: node tools/brain/adapt.js [--eps=12] [--seed=1] [--ckpt=data/brain/latest.json]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8127;
const EPS = parseInt(args.eps, 10) || 12, SEED = parseInt(args.seed, 10) || 1;
const CKPT = path.resolve(ROOT, args.ckpt || 'data/brain/latest.json');

// Same table as train.js, kept in sync by hand (train.js is a script, not a module).
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
const specs = Object.entries(STYLES).map(([k, p]) => ({ type: 'style', label: k, params: p, hpMult: k === 'zoner' ? 2 : 1.5,
  brainKit: 'randomClass', kit: k === 'zoner' ? { w: 'ranged', c: 'none' } : undefined }));
specs.push({ type: 'style', label: 'switcher', every: 900, hpMult: 1.5, brainKit: 'randomClass',
  styles: ['turtle', 'rushdown', 'aerial', 'counter'].map(k => STYLES[k]) });

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
    await page.addScriptTag({ path: path.join(ROOT, 'tools', 'human-proxy.js') });
    const ck = JSON.parse(fs.readFileSync(CKPT, 'utf8'));
    const rows = await page.evaluate((w, specs, eps, seed) => {
      const rnd = Math.random;
      const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const out = [];
      // Throwaway match: the first rollout in a fresh page starts from different
      // leftover state than every later one, which broke the on/off pairing.
      // Something initialises lazily during a first full match, so warm up on every style.
      Math.random = seeded(seed);
      Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: specs.concat(specs), episodes: specs.length * 2 });
      specs.forEach((spec, si) => {
        const row = { style: spec.label };
        for (const off of [false, true]) {
          Math.random = seeded(seed * 7919 + si * 104729);
          const r = Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: Array(eps).fill(spec), episodes: eps, histOff: off });
          const a = { win: 0, de: 0, te: 0, dt: 0, tt: 0, fr: 0 };
          for (const e of r.episodes) { a.win += e.win; a.de += e.stats.dmgDealtEarly; a.te += e.stats.dmgTakenEarly; a.dt += e.stats.dmgDealt; a.tt += e.stats.dmgTaken; a.fr += e.frames; }
          a.win /= r.episodes.length;
          row[off ? 'off' : 'on'] = a;
        }
        out.push(row);
      });
      Math.random = rnd;
      return out;
    }, ck.pi, specs, EPS, SEED);
    const ratio = (d, t) => (d / Math.max(1, t)).toFixed(2);
    console.log(`Checkpoint iteration ${ck.iter} (input ${ck.pi.sizes[0]}), ${EPS} matches per style per arm, seed ${SEED}`);
    console.log('dmg ratio = dealt/taken. "late" = after the first 10 s. Read OFF = opponent read frozen at its match-start (no evidence) values.');
    console.log('style       win% on/off    ratio on/off    early->late (on)    early->late (off)   avg match');
    for (const r of rows) {
      const L = a => `${ratio(a.de, a.te)}->${ratio(a.dt - a.de, a.tt - a.te)}`;
      console.log(`${r.style.padEnd(10)}  ${(r.on.win * 100).toFixed(0).padStart(3)}%/${(r.off.win * 100).toFixed(0).padStart(3)}%    ` +
        `${ratio(r.on.dt, r.on.tt).padStart(5)}/${ratio(r.off.dt, r.off.tt).padEnd(5)}    ${L(r.on).padEnd(18)}  ${L(r.off).padEnd(18)}  ${(r.on.fr / EPS / 60).toFixed(0)}s`);
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
