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
 *        --wipe=60,1   memory test instead: normal vs the brain's memory (GRU) cleared every N
 *                      decisions (20 decisions = 1 s; 1 = no memory at all). --greedy = top choice, as shipped.
 *                      --styles=a,b limits the opponents. --nets=name:ckpt.json,... adds other nets as opponents.
 *                      --switch[=900] adds 'switch': all those nets taking turns in one body, swapping every N frames.
 *                      --json=out.json writes the per-opponent and pooled win rates for a script (league.js).
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8127;
const EPS = parseInt(args.eps, 10) || 12, SEED = parseInt(args.seed, 10) || 1;
const CKPT = path.resolve(ROOT, args.ckpt || 'data/brain/latest.json');
const WIPE = args.wipe ? String(args.wipe).split(',').map(Number).filter(n => n > 0) : null, GREEDY = !!args.greedy;
const ARMS = WIPE ? [{ k: 'on' }].concat(WIPE.map(n => ({ k: 'wipe' + n, memWipe: n }))) : [{ k: 'on' }, { k: 'off', histOff: true }];

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
// --nets=name:path,...  other checkpoints as opponents (hunters, the mirror), top choice, random class kits both sides.
for (const kv of args.nets ? String(args.nets).split(',') : []) {
  const [label, p] = kv.split(':'), j = JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8'));
  specs.push({ type: 'self', label, greedy: true, weights: j.pi || j, brainKit: 'randomClass', kit: 'randomClass' });
}
if (args.switch) {
  const nets = specs.filter(s => s.type === 'self' && s.label !== 'mirror');
  if (nets.length >= 2) specs.push({ type: 'self', label: 'switch', greedy: true, weightsList: nets.map(s => s.weights),
    every: parseInt(args.switch, 10) || 900, brainKit: 'randomClass', kit: 'randomClass' });
}
const ONLY = args.styles ? String(args.styles).split(',') : null;
const run = ONLY ? specs.filter(s => ONLY.includes(s.label)) : specs;

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
    args: ['--no-sandbox', '--mute-audio'], protocolTimeout: 0 });
  try {
    const page = await browser.newPage();
    // Only the local game: a CDN that is slow to answer holds the load event (see hunteval.js).
    await page.setRequestInterception(true);
    page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 90000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.addScriptTag({ path: path.join(ROOT, 'tools', 'human-proxy.js') });
    const ck = JSON.parse(fs.readFileSync(CKPT, 'utf8'));
    await page.evaluate((w, specs, seed) => {
      window._adaptRnd = Math.random;
      window._adaptSeeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      // Throwaway match: the first rollout in a fresh page starts from different
      // leftover state than every later one, which broke the on/off pairing.
      // Something initialises lazily during a first full match, so warm up on every style.
      Math.random = window._adaptSeeded(seed);
      Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: specs.concat(specs), episodes: specs.length * 2 });
      Math.random = window._adaptRnd;
    }, ck.pi, specs.filter(s => s.type === 'style').concat(run.filter(s => s.type === 'self')), SEED);
    const rows = [];
    for (const spec of run) {
      const si = specs.indexOf(spec);
      rows.push(await page.evaluate((w, spec, si, eps, seed, arms, greedy) => {
        const row = { style: spec.label };
        // The page's own loop ran since the last call; a throwaway pair of matches puts every arm behind a rollout of the same kind.
        Math.random = window._adaptSeeded(seed + si);
        Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: [spec, spec], episodes: 2, greedy });
        for (const arm of arms) {
          Math.random = window._adaptSeeded(seed * 7919 + si * 104729);
          const r = Brain.rollout({ weights: w, steps: 1, maxFrames: 7200, opponents: Array(eps).fill(spec), episodes: eps,
            histOff: !!arm.histOff, memWipe: arm.memWipe || 0, greedy });
          const a = { win: 0, de: 0, te: 0, dt: 0, tt: 0, fr: 0 };
          for (const e of r.episodes) { a.win += e.win; a.de += e.stats.dmgDealtEarly; a.te += e.stats.dmgTakenEarly; a.dt += e.stats.dmgDealt; a.tt += e.stats.dmgTaken; a.fr += e.frames; }
          a.win /= r.episodes.length;
          row[arm.k] = a;
        }
        Math.random = window._adaptRnd;
        return row;
      }, ck.pi, spec, si, EPS, SEED, ARMS, GREEDY));
      if (WIPE) { const r = rows[rows.length - 1];
        console.log(r.style.padEnd(10) + ARMS.map(m => `  ${m.k} ${(r[m.k].win * 100).toFixed(0)}% ${(r[m.k].dt / Math.max(1, r[m.k].tt)).toFixed(2)} late ${((r[m.k].dt - r[m.k].de) / Math.max(1, r[m.k].tt - r[m.k].te)).toFixed(2)}`).join('')); }
    }
    if (WIPE) {
      const tot = ARMS.map(m => rows.reduce((s, r) => s + r[m.k].win, 0) / rows.length);
      console.log(`Checkpoint iteration ${ck.iter}, ${EPS} matches per style per arm, seed ${SEED}${GREEDY ? ', top choice' : ''}. Each arm: win%, dmg dealt/taken, same after the first 10 s.`);
      if (args.json) fs.writeFileSync(path.resolve(ROOT, args.json), JSON.stringify({ iter: ck.iter, eps: EPS, seed: SEED,
        arms: ARMS.map(m => m.k), pooled: tot.map(t => 100 * t),
        rows: rows.map(r => ({ opp: r.style, win: ARMS.map(m => 100 * r[m.k].win) })) }) + '\n');
      console.log('all styles' + ARMS.map((m, i) => `  ${m.k} ${(tot[i] * 100).toFixed(1)}%`).join('') + `   (one style, one arm: +-${(100 * Math.sqrt(0.25 / EPS)).toFixed(1)} pts worst case)`);
      return;
    }
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
