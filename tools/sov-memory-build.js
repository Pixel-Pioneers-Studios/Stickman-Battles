'use strict';
/*
 * tools/sov-memory-build.js — WRITE js/smb-sov-memory.js. DEV ONLY.
 *
 * Sovereign walks into every fight with what he already knows about how
 * exchanges resolve. That knowledge is produced here: independent lineages of
 * lab fights with his inference engine on, merged, scaled to a fixed weight and
 * written out as a plain script (not a fetched JSON — data/ has never been
 * committed, so the old artifact silently 404'd on every deploy).
 *
 * Lineage settings: infer + experiment ON (he has had time to test things),
 * inferAct OFF (converted swings are dropped from the stats, which would starve
 * exactly the cells he acts on), innateMemory OFF (the file must never feed
 * itself). Opponents alternate between the scenario panel and FAIR opponents on
 * every melee weapon — ranged is barred from his fights.
 *
 * Re-run after any change to combat rules; the file records the date it was
 * built and the matches behind it.
 *
 * Usage: node tools/sov-memory-build.js [--lineages=5] [--matches=300] [--weight=1500]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const LINEAGES = parseInt(args.lineages, 10) || 5;
const MATCHES  = parseInt(args.matches, 10) || 300;
const WEIGHT   = parseInt(args.weight, 10) || 1500;   // predicted swings the innate layer counts as
const BASEPORT = parseInt(args.port, 10) || 9400;
const OUT = path.join(ROOT, 'js', 'smb-sov-memory.js');
const log = (...a) => console.log('[memory]', ...a);

async function worker() {
  const port = parseInt(args.wport, 10), lineage = parseInt(args.lineage, 10);
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
  await page.waitForFunction(() => typeof SovScenarios !== 'undefined' && typeof SMK2Trainer !== 'undefined' && typeof SovDossier !== 'undefined', { timeout: 600000 });
  const mech = await page.evaluate((lineage, MATCHES) => {
    const _cl = console.log; console.log = () => {};
    try { SovDossier.reset(); } finally { console.log = _cl; }
    Object.assign(SMK2_TUNE, { infer: true, experiment: true, inferAct: false, innateMemory: false });
    let s = (0x9E3779B9 ^ Math.imul(lineage + 101, 0x85EBCA6B)) >>> 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const W = WEAPON_KEYS.filter(k => WEAPONS[k].type === 'melee' && WEAPONS[k].damage > 0);
    const C = Object.keys(CLASSES).filter(k => k !== 'megaknight');
    for (let i = 0; i < MATCHES; i++) {
      const seed = (lineage * 100000 + i + 1) * 7919;
      if (i % 2 === 0) SovScenarios.run(SovScenarios.NAMES[(i / 2) % SovScenarios.NAMES.length], null, seed);
      else SMK2Trainer.runMatch(null, 1, seed, { duel: true, noBuff: true,
             opp: { w: W[((i - 1) / 2) % W.length], c: C[Math.floor(Math.random() * C.length)] } });
    }
    return SovDossier.mechPrior();
  }, lineage, MATCHES);
  process.stdout.write('RESULT ' + JSON.stringify(mech) + '\n');
  await browser.close(); server.close();
}

// Same promotion rule as SovereignMK2._inferRules, for the build report only.
function rules(M, pairs) {
  if (!M || M.n < 12) return [];
  const base = M.miss / M.n, out = [];
  const src = pairs ? Object.assign({}, M.feat, M.pair) : M.feat;
  for (const k of Object.keys(src)) {
    const e = src[k]; if (e.n < 6) continue;
    const rate = e.miss / e.n, lift = rate / Math.max(1e-6, base);
    if (rate < 0.55 || lift < 1.6) continue;
    out.push({ when: k, n: Math.round(e.n), fail: Math.round(100 * rate), lift: +lift.toFixed(2) });
  }
  return out.sort((a, b) => b.lift - a.lift);
}

async function main() {
  log(`${LINEAGES} lineages x ${MATCHES} matches, weight ${WEIGHT}`);
  const t0 = Date.now();
  const parts = (await Promise.all(Array.from({ length: LINEAGES }, (_, i) => new Promise(resolve => {
    const p = spawn('node', [__filename, '--worker', `--wport=${BASEPORT + i}`, `--lineage=${i}`, `--matches=${MATCHES}`],
                    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '', tail = '';
    p.stdout.on('data', d => { buf += d; }); p.stderr.on('data', d => { tail = (tail + d).slice(-2000); });
    p.on('close', () => {
      const line = buf.split('\n').find(l => l.startsWith('RESULT '));
      if (!line) { log(`lineage ${i} FAILED`, tail.split('\n').filter(l => l && !/^\s+at /.test(l)).slice(-2).join(' | ')); return resolve(null); }
      resolve(JSON.parse(line.slice(7)));
    });
  })))).filter(m => m && m.n > 0);
  if (!parts.length) { console.error('no lineage produced data'); process.exit(1); }

  // Merge, then scale the whole record to WEIGHT swings. Ratios are what he
  // knows; the weight is how firmly he holds it.
  const M = { n: 0, miss: 0, missHitTotal: 0, feat: {}, pair: {} };
  for (const P of parts) {
    M.n += P.n; M.miss += P.miss; M.missHitTotal += P.missHitTotal || 0;
    for (const b of ['feat', 'pair']) for (const k of Object.keys(P[b] || {})) {
      const c = P[b][k], d = M[b][k] || (M[b][k] = { n: 0, miss: 0, missClean: 0, missHit: 0 });
      for (const f of ['n', 'miss', 'missClean', 'missHit']) d[f] += c[f] || 0;
    }
  }
  const raw = M.n, k = Math.min(1, WEIGHT / M.n), r2 = v => Math.round(v * k * 100) / 100;
  const S = { n: r2(M.n), miss: r2(M.miss), missHitTotal: r2(M.missHitTotal), feat: {}, pair: {} };
  for (const b of ['feat', 'pair']) for (const key of Object.keys(M[b]).sort()) {
    const c = M[b][key]; if (c.n * k < 0.5) continue;           // below half a swing carries no information
    S[b][key] = { n: r2(c.n), miss: r2(c.miss), missClean: r2(c.missClean), missHit: r2(c.missHit) };
  }

  const found = rules(S, true);
  const stamp = new Date().toISOString().slice(0, 10);
  const body = `// ============================================================
// SOVEREIGN — INNATE MEMORY. GENERATED; DO NOT EDIT BY HAND.
// ============================================================
// Regenerate with: node tools/sov-memory-build.js
//
// What Sovereign already knows about how exchanges resolve before this machine
// ever runs him: the prediction-failure statistics from ${parts.length} independent
// lineages of lab fights (${parts.length * MATCHES} matches, ${Math.round(raw)} remembered predicted swings),
// scaled to a fixed weight of ${WEIGHT} swings. In-world, fifty thousand years.
//
// None of this was written by hand. Every rule below is one he derived; this
// file only carries it across machines. SovereignMK2._seedInference adds it
// under his local dossier every fight and never writes it back, so what he
// learns about YOU can outvote it (local memory caps at 3000 swings).
//
// Built ${stamp}. Rules he states from this memory alone (fail rate, lift):
${found.slice(0, 10).map(r => `//   ${r.when.padEnd(38)} ${String(r.fail).padStart(3)}%  x${r.lift}  (n=${r.n})`).join('\n')}

const SOV_MEMORY = ${JSON.stringify({ built: stamp, matches: parts.length * MATCHES, weight: WEIGHT, mech: S })};
`;
  fs.writeFileSync(OUT, body);
  log(`wrote ${path.relative(ROOT, OUT)} (${(body.length / 1024).toFixed(1)} KB) in ${((Date.now() - t0) / 60000).toFixed(1)}m`);
  log(`base failure ${(100 * S.miss / S.n).toFixed(0)}%, ${found.length} rules stated:`);
  for (const r of found.slice(0, 10)) console.log(`   ${r.when.padEnd(38)} ${r.fail}%  x${r.lift}  n=${r.n}`);
}

(args.worker ? worker() : main()).catch(e => { console.error('FATAL', e); process.exit(1); });
