'use strict';
/*
 * tools/sov-bait.js — DOES HE STOP FALLING FOR IT? DEV ONLY.
 *
 * inferAct cancels a swing and guards when a stated rule says the swing cannot
 * land. A human who notices can farm that: swing to trigger the guard, never
 * swing into it, hit the drop (policy `guard_baiter` in smb-sov-scenarios.js).
 * The claim under test is that he adapts — the guard gets priced as a loss in
 * his tactic ledger and he stops converting. This measures whether, and how
 * fast, against a control opponent (`rusher`) that is not baiting anything.
 *
 * Conditions: inferAct off/on (infer on in both) x opponent baiter/rusher.
 * Each block is ONE page playing M matches in a row with memory carried, i.e.
 * one person rematching him M times. Blocks are independent seeds.
 *
 * Usage: node tools/sov-bait.js [--matches=30] [--blocks=3] [--jobs=5]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const M = parseInt(args.matches, 10) || 30;
const BLOCKS = parseInt(args.blocks, 10) || 3;
const JOBS = parseInt(args.jobs, 10) || 5;
const BASEPORT = parseInt(args.port, 10) || 9300;
const WEAPON = String(args.weapon || 'sword');
const log = (...a) => console.log('[bait]', ...a);

async function worker() {
  const port = parseInt(args.wport, 10), act = args.act === '1', opp = String(args.opp), block = parseInt(args.block, 10);
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
  await page.waitForFunction(() => typeof SovScenarios !== 'undefined' && typeof SMK2_TUNE !== 'undefined' && typeof SovDossier !== 'undefined', { timeout: 600000 });
  const res = await page.evaluate((act, opp, block, M, WEAPON) => {
    const _cl = console.log; console.log = () => {};
    try { SovDossier.reset(); } finally { console.log = _cl; }
    SMK2_TUNE.infer = true;
    SMK2_TUNE.inferAct = act;
    let s = (0x9E3779B9 ^ Math.imul(block + 1, 0x85EBCA6B)) >>> 0;   // same stream in both arms
    Math.random = function () {
      s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Warm-up, unrecorded: in a live game he arrives with rules learned from
    // earlier fights. From empty memory he states none and there is nothing to
    // bait, which measures nothing.
    for (let w = 0; w < 2; w++) for (const nm of SovScenarios.NAMES) SovScenarios.run(nm, null, (block * 100 + w + 1) * 104729 + nm.length);
    const G0 = window.__sovInferAct || { converted: 0 };
    const warmConv = G0.converted || 0;
    const spec = { name: 'bait_' + opp, punishes: '', bots: [{ w: WEAPON, c: 'none', policy: opp }] };
    const out = [];
    for (let i = 0; i < M; i++) {
      const G = window.__sovInferAct || { converted: 0, frames: [] };
      const c0 = G.converted || 0, f0 = (G.frames || []).length;
      const r = SovScenarios.run(spec, null, (block * 1000 + i + 1) * 7919);
      const G2 = window.__sovInferAct || { converted: 0, frames: [] };
      const R = r && r.result;
      const frames = (G2.frames || []).slice(f0);
      const len = R ? R.framesRun : 1;
      out.push({ i, stocks: R ? R.sovLivesLeft : null, dealt: R ? R.dmgDealt : 0, taken: R ? R.dmgTaken : 0,
                 locked: R ? R.lockedPct : 0, len, conv: (G2.converted || 0) - c0,
                 convH1: frames.filter(f => f < len / 2).length, convH2: frames.filter(f => f >= len / 2).length });
    }
    return { out, warmConv };
  }, act, opp, block, M, WEAPON);
  process.stdout.write('RESULT ' + JSON.stringify({ act, opp, block, res: res.out, warmConv: res.warmConv }) + '\n');
  await browser.close(); server.close();
}

async function main() {
  const conds = [];
  for (const opp of ['guard_baiter', 'rusher']) for (const act of [0, 1]) for (let b = 0; b < BLOCKS; b++) conds.push({ opp, act, b });
  log(`${conds.length} runs x ${M} matches (weapon ${WEAPON}), ${JOBS} at a time`);
  const t0 = Date.now(); let next = 0; const outs = [];
  await Promise.all(Array.from({ length: JOBS }, async (_, slot) => {
    while (next < conds.length) {
      const c = conds[next++];
      const r = await new Promise(resolve => {
        const p = spawn('node', [__filename, '--worker', `--wport=${BASEPORT + slot}`, `--act=${c.act}`, `--opp=${c.opp}`,
                                 `--block=${c.b}`, `--matches=${M}`, `--weapon=${WEAPON}`], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
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
  console.log(`\n════ sov-bait — ${((Date.now() - t0) / 60000).toFixed(1)}m ════`);
  console.log('  warm-up conversions (inferAct on): ' + outs.filter(o => o.act).map(o => o.warmConv).join(' '));
  const cell = (opp, act) => outs.filter(o => o.opp === opp && o.act === !!act).flatMap(o => o.res);
  console.log('\n  OUTCOME per match (mean ± se)');
  console.log('  opponent       inferAct   stocks left      taken            dealt          conv/match');
  for (const opp of ['guard_baiter', 'rusher']) for (const act of [0, 1]) {
    const r = cell(opp, act);
    const f = k => `${mean(r.map(x => x[k])).toFixed(k === 'stocks' ? 2 : 0).padStart(6)} ±${se(r.map(x => x[k])).toFixed(k === 'stocks' ? 2 : 0).padEnd(5)}`;
    console.log(`  ${opp.padEnd(14)} ${act ? 'on ' : 'off'}        ${f('stocks')}   ${f('taken')}   ${f('dealt')}   ${mean(r.map(x => x.conv)).toFixed(1)}`);
  }
  // Adaptation: conversions per 1000 frames, early vs late in the match, and
  // across the run of rematches. If he learns, both should fall vs the baiter
  // faster than vs the rusher.
  console.log('\n  ADAPTATION (inferAct on): conversions per 1000 frames');
  console.log('  opponent        1st half   2nd half    matches 1-5   6-15   16+');
  for (const opp of ['guard_baiter', 'rusher']) {
    const r = cell(opp, 1);
    const rate = (xs, k) => 1000 * xs.reduce((a, x) => a + x[k], 0) / Math.max(1, xs.reduce((a, x) => a + x.len / (k === 'conv' ? 1 : 2), 0));
    const byIdx = (lo, hi) => rate(r.filter(x => x.i >= lo && x.i < hi), 'conv');
    console.log(`  ${opp.padEnd(14)} ${rate(r, 'convH1').toFixed(2).padStart(8)}   ${rate(r, 'convH2').toFixed(2).padStart(8)}      ${byIdx(0, 5).toFixed(2).padStart(6)}   ${byIdx(5, 15).toFixed(2).padStart(5)}  ${byIdx(15, 1e9).toFixed(2).padStart(5)}`);
  }
  const dir = path.join(ROOT, 'data', 'balance'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `sov-bait-${Date.now()}.json`), JSON.stringify(outs));
}

(args.worker ? worker() : main()).catch(e => { console.error('FATAL', e); process.exit(1); });
