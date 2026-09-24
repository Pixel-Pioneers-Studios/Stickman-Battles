'use strict';
/*
 * tools/ghost-test.js — TEST THE HUMAN MIMIC AND THE HYBRID. DEV ONLY.
 *
 * Opponents vs Sovereign at his SHIPPING settings, blocks of consecutive
 * matches (the hybrid's ledger carries across a block, like a player learning
 * him over a session):
 *   ghost   static mimic (tools/ghost-core.js)
 *   modes   human modes chosen by habit only — the control for hybrid
 *   hybrid  human modes chosen by a Sovereign-style ledger
 *   bot     the game's expert AI on the same kits, for contrast
 *
 * Reports three things:
 *   1. BEHAVIOUR — does the mimic play like the humans in the replays, incl.
 *      the held-out ones it never trained on?
 *   2. OUTCOME — how Sovereign fares against each, next to the real humans.
 *   3. ADAPTATION — does hybrid improve across a block faster than modes?
 *
 * Usage: node tools/ghost-test.js [--matches=20] [--blocks=4] [--jobs=5]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const G = require('./ghost-core.js');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const M = parseInt(args.matches, 10) || 20;
const BLOCKS = parseInt(args.blocks, 10) || 4;
const JOBS = parseInt(args.jobs, 10) || 5;
const BASEPORT = parseInt(args.port, 10) || 9600;
const MODEL = path.join(ROOT, 'tools', 'ghost-model.json');
const log = (...a) => console.log('[ghost-test]', ...a);

async function worker() {
  const port = parseInt(args.wport, 10), kind = String(args.kind), block = parseInt(args.block, 10);
  const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };
  const server = await new Promise(res => {
    const s = http.createServer((req, rs) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rs);
    });
    s.listen(port, () => res(s));
  });
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 1800000, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', r => (r.url().startsWith(`http://localhost:${port}/`) || r.url().startsWith('data:')) ? r.continue() : r.abort());
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 600000 });
  await page.waitForFunction(() => typeof SMK2Trainer !== 'undefined' && typeof SovDossier !== 'undefined', { timeout: 600000 });
  await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'tools', 'ghost-core.js'), 'utf8') });
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
  const res = await page.evaluate((kind, block, M, model) => {
    const _cl = console.log; console.log = () => {};
    try { SovDossier.reset(); } finally { console.log = _cl; }
    let s = (0x9E3779B9 ^ Math.imul(block + 1, 0x85EBCA6B)) >>> 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // The kits the human actually used, melee only (ranged is barred from his arena).
    const kits = [];
    for (const [k, n] of Object.entries(model.kits)) {
      const [w, c] = k.split('/');
      if (!WEAPONS[w] || WEAPONS[w].type !== 'melee' || w === 'mkgauntlet' || c === 'megaknight') continue;
      for (let i = 0; i < n; i++) kits.push({ w, c });
    }
    const ledger = {}, out = [];
    for (let i = 0; i < M; i++) {
      const kit = kits[Math.floor(Math.random() * kits.length)];
      const modeLog = {};
      let bot = null;
      const opts = { duel: true, noBuff: true, opp: kit };
      if (kind !== 'bot') {
        const ai = HumanGhost.controller(model, { kind, ledger, log: modeLog });
        opts.oppAI = function () { bot = this; return ai.call(this); };
      }
      const r = SMK2Trainer.runMatch(null, 1, (block * 1000 + i + 1) * 7919, opts);
      out.push({ i, kit: kit.w + '/' + kit.c, sovLives: r.sovLivesLeft, oppDeaths: r.oppDeaths,
                 sovDealt: r.dmgDealt, sovTaken: r.dmgTaken, frames: r.framesRun,
                 stats: bot && bot._ghostRec ? HumanGhost.stats(bot._ghostRec) : null, modes: modeLog });
    }
    return out;
  }, kind, block, M, model);
  process.stdout.write('RESULT ' + JSON.stringify({ kind, block, res }) + '\n');
  await browser.close(); server.close();
}

// Human reference from replays, scored by the same stats() as the sim.
function humanRefs(files) {
  const beh = [], out = [];
  for (const f of files) {
    const r = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    const pl = r.meta.players, me = pl.findIndex(x => !x.ai), opp = 1 - me;
    beh.push(G.stats(r.frames.map(fr => fr ? [fr[me], fr[opp]] : [null, null])));
    if (!Array.isArray(r.events)) continue;   // pre-event-log replays: behaviour only
    let dealt = 0, taken = 0, myKo = 0, sovKo = 0;
    for (const e of r.events) {
      const hpBefore = e.t === 'ko' ? ((r.frames[Math.max(0, Math.round(e.fi) - 2)] || [])[e.p] || {}).hp || 0 : 0;
      if (e.t === 'dmg') { if (e.p === opp) dealt += e.v; else taken += e.v; }
      if (e.t === 'ko') { if (e.p === opp) { dealt += hpBefore; sovKo++; } else { taken += hpBefore; myKo++; } }
    }
    const fr = r.frames.length * (r.meta.recordEveryN || 3);
    out.push({ f, dealt1k: 1000 * dealt / fr, taken1k: 1000 * taken / fr, sovKo, myKo });
  }
  return { beh, out };
}

async function main() {
  if (!fs.existsSync(MODEL)) { console.error('run tools/ghost-build.js first'); process.exit(1); }
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
  const conds = [];
  for (const kind of ['ghost', 'modes', 'hybrid', 'bot']) for (let b = 0; b < BLOCKS; b++) conds.push({ kind, b });
  log(`${conds.length} runs x ${M} matches, ${JOBS} at a time`);
  const t0 = Date.now(); let next = 0; const outs = [];
  await Promise.all(Array.from({ length: JOBS }, async (_, slot) => {
    while (next < conds.length) {
      const c = conds[next++];
      const r = await new Promise(resolve => {
        const p = spawn('node', [__filename, '--worker', `--wport=${BASEPORT + slot}`, `--kind=${c.kind}`, `--block=${c.b}`, `--matches=${M}`],
                        { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
        let buf = '', tail = '';
        p.stdout.on('data', d => { buf += d; }); p.stderr.on('data', d => { tail = (tail + d).slice(-2000); });
        p.on('close', () => {
          const line = buf.split('\n').find(l => l.startsWith('RESULT '));
          if (!line) { log('FAILED', JSON.stringify(c), tail.split('\n').filter(l => l && !/^\s+at /.test(l)).slice(-2).join(' | ')); return resolve(null); }
          resolve(JSON.parse(line.slice(7)));
        });
      });
      if (r) outs.push(r);
    }
  }));
  const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  const se = v => { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1) / v.length); };
  const rows = k => outs.filter(o => o.kind === k).flatMap(o => o.res);

  console.log(`\n════ ghost-test — ${((Date.now() - t0) / 60000).toFixed(1)}m ════`);
  // 1. Behaviour
  const H = humanRefs(model.heldOut), T = humanRefs(model.trainedOn);
  const F = ['atkPer1k', 'groundJumpPer1k', 'airJumpPer1k', 'airStintFrames', 'airPct', 'hitWhileAirPct', 'shieldPct', 'meanDist', 'towardPct', 'awayPct'];
  const avgStats = list => Object.fromEntries(F.map(f => [f, mean(list.map(s => s[f]))]));
  console.log('\n  1. BEHAVIOUR (per 1000 frames / % of samples)');
  console.log('  ' + 'who'.padEnd(20) + F.map(f => f.replace('Per1k', '/1k').replace('Pct', '%').padStart(10)).join(''));
  const line = (name, st) => console.log('  ' + name.padEnd(20) + F.map(f => (st[f] || 0).toFixed(f === 'meanDist' ? 0 : 1).padStart(10)).join(''));
  line('human (held out)', avgStats(H.beh));
  line('human (trained)', avgStats(T.beh));
  for (const k of ['ghost', 'modes', 'hybrid']) line(k, avgStats(rows(k).map(r => r.stats).filter(Boolean)));

  // 1b. Where each gets hit: share of time in each distance band x ground/air,
  // and hits per 1000 frames spent there.
  const expo = list => { const o = {}; for (const st of list) for (const [k, c] of Object.entries(st.expo || {})) { const d = o[k] || (o[k] = { n: 0, hits: 0 }); d.n += c.n; d.hits += c.hits; } return o; };
  const E = { 'human': expo(H.beh.concat(T.beh)), 'ghost': expo(rows('ghost').map(r => r.stats).filter(Boolean)) };
  console.log('\n  1b. EXPOSURE: time share % / hits per 1000 frames there   (d0 <45px ... d6 >400px; g ground, a air)');
  const EK = []; for (let d = 0; d <= 6; d++) for (const g of ['g', 'a']) EK.push(d + g);
  console.log('  ' + ''.padEnd(8) + EK.map(k => k.padStart(11)).join(''));
  for (const [who, e] of Object.entries(E)) {
    const tot = Object.values(e).reduce((a, c) => a + c.n, 0) || 1;
    console.log('  ' + who.padEnd(8) + EK.map(k => { const c = e[k] || { n: 0, hits: 0 }; return `${(100 * c.n / tot).toFixed(0)}/${c.n ? (1000 * c.hits / (c.n * 3)).toFixed(0) : '-'}`.padStart(11); }).join(''));
  }

  // 2. Outcome
  console.log('\n  2. OUTCOME vs current Sovereign (per match; dmg per 1000 frames from the opponent\'s side)');
  console.log('  who                 his stocks left   KOs on him   opp dealt/1k   opp taken/1k');
  for (const k of ['ghost', 'modes', 'hybrid', 'bot']) {
    const r = rows(k);
    const d = r.map(x => 1000 * x.sovTaken / x.frames), t = r.map(x => 1000 * x.sovDealt / x.frames);
    console.log(`  ${k.padEnd(20)}${mean(r.map(x => x.sovLives)).toFixed(2).padStart(6)} ±${se(r.map(x => x.sovLives)).toFixed(2)}     ${mean(r.map(x => x.oppDeaths === undefined ? 0 : 5 - x.sovLives)).toFixed(2).padStart(5)}      ${mean(d).toFixed(1).padStart(8)}       ${mean(t).toFixed(1).padStart(8)}`);
  }
  for (const [name, R] of [['human (held out)', H.out], ['human (trained)', T.out]]) {
    console.log(`  ${name.padEnd(20)}        —          ${mean(R.map(x => x.sovKo)).toFixed(2).padStart(5)}      ${mean(R.map(x => x.dealt1k)).toFixed(1).padStart(8)}       ${mean(R.map(x => x.taken1k)).toFixed(1).padStart(8)}   (real matches, older Sovereigns)`);
  }

  // 3. Adaptation
  console.log('\n  3. ADAPTATION: opponent net damage per 1000 frames by match index within a block');
  console.log('  who        1-5      6-10     11+      modes chosen (share)');
  for (const k of ['modes', 'hybrid']) {
    const r = rows(k);
    const net = x => 1000 * (x.sovTaken - x.sovDealt) / x.frames;
    const b = (lo, hi) => mean(r.filter(x => x.i >= lo && x.i < hi).map(net)).toFixed(1).padStart(8);
    const mc = {}; for (const x of r) for (const [m, n] of Object.entries(x.modes || {})) mc[m] = (mc[m] || 0) + n;
    const tot = Object.values(mc).reduce((a, b2) => a + b2, 0) || 1;
    console.log(`  ${k.padEnd(8)}${b(0, 5)}${b(5, 10)}${b(10, 1e9)}     ` + Object.entries(mc).sort((a, b2) => b2[1] - a[1]).map(([m, n]) => `${m} ${Math.round(100 * n / tot)}%`).join(' '));
  }
  const dir = path.join(ROOT, 'data', 'balance'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `ghost-test-${Date.now()}.json`), JSON.stringify(outs));
}

(args.worker ? worker() : main()).catch(e => { console.error('FATAL', e); process.exit(1); });
