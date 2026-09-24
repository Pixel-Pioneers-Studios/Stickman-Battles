'use strict';
/* global BalanceSim */
/*
 * tools/sov-balance.js — BALANCE WITH SOVEREIGN AS THE WIELDER. DEV ONLY.
 *
 * Round-robin of every melee weapon (or every class) with SovereignMK2 on BOTH
 * sides, via BalanceSim from tools/class-balance.js. Same brain, same map, only
 * the kit differs, so a win-rate gap is the kit.
 *
 * Why not the stock Fighter AI alone: it under-uses some kits badly. Hammer
 * read 92% in its hands and bottom-tier in Sovereign's (docs/sovereign-
 * discoveries.md). Balance for a strong player has to be measured with one.
 *
 * Candidate stats are applied IN THE PAGE with --patch, so a change can be
 * measured before anyone edits smb-data-weapons.js:
 *   --patch='{"hammer":{"cooldown":90,"endlag":20}}'          (weapons mode)
 *   --patch='{"thor":{"hp":150,"speedMult":0.95}}'            (classes mode)
 *
 * Also the bug finder: every match reports non-finite positions, fighters
 * outside the arena, 30s stalls, frame-cap timeouts and thrown errors.
 *
 * Usage:
 *   node tools/sov-balance.js --mode=weapons --matches=12 --jobs=5
 *   node tools/sov-balance.js --mode=classes --hold=sword --matches=12
 *   node tools/sov-balance.js --brain=fighter ...     (the old bot-vs-bot view)
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MODE    = String(args.mode || 'weapons');
const MATCHES = parseInt(args.matches, 10) || 12;
const JOBS    = parseInt(args.jobs, 10) || 5;
const STOCKS  = parseInt(args.stocks, 10) || 3;
const FRAMES  = parseInt(args.frames, 10) || 18000;
const BRAIN   = String(args.brain || 'sovereign');
const HOLD_C  = String(args.holdclass || 'none');     // weapons mode: class everyone wears
const HOLD_W  = String(args.hold || 'sword');          // classes mode: weapon everyone holds
const PATCH   = args.patch ? JSON.parse(args.patch) : {};
// --wpatch: weapon stats applied in EVERY mode, so classes can be measured on
// top of candidate weapon stats rather than the shipped ones.
const WPATCH  = args.wpatch ? JSON.parse(args.wpatch) : {};
const BASEPORT = parseInt(args.port, 10) || 8700;
const LABEL   = String(args.label || `${MODE}-${BRAIN}`);
const log = (...a) => console.log('[bal]', ...a);

const SIM = fs.readFileSync(path.join(ROOT, 'tools', 'class-balance.js'), 'utf8')
              .match(/const SIM_SRC = `([\s\S]*?)\n`;/)[1];

// ── WORKER ──────────────────────────────────────────────────────────────────
async function worker() {
  const shard = parseInt(args.shard, 10), of = parseInt(args.of, 10), port = parseInt(args.wport, 10);
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
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 1800000,
    args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  // Offline: index.html pulls GSAP/PeerJS from CDNs as BLOCKING scripts, so a
  // stalled network request held DOMContentLoaded past the 120s timeout and
  // failed shards at random. The sim needs neither.
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (u.startsWith(`http://localhost:${port}/`) || u.startsWith('data:')) r.continue(); else r.abort();
  });
  // domcontentloaded, not load: 'load' waits on every external resource (CDNs,
  // the live server) and one hanging request timed out whole sweeps.
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 600000 });
  await page.waitForFunction(() => typeof SovereignMK2 !== 'undefined' && typeof WEAPONS !== 'undefined', { timeout: 600000 });
  await page.evaluate(() => { try { if (typeof backToHome === 'function') backToHome(); } catch (e) {} });
  await page.addScriptTag({ content: SIM });

  const res = await page.evaluate((MODE, MATCHES, STOCKS, FRAMES, BRAIN, HOLD_C, HOLD_W, PATCH, WPATCH, shard, of) => {
    // Apply candidate stats in-page only.
    for (const k of Object.keys(WPATCH)) if (WEAPONS[k]) Object.assign(WEAPONS[k], WPATCH[k]);
    const tbl = MODE === 'classes' ? CLASSES : WEAPONS;
    for (const k of Object.keys(PATCH)) if (tbl[k]) Object.assign(tbl[k], PATCH[k]);
    // Seeded, so a shard is reproducible and two runs of the same config agree.
    let s = (0x9E3779B9 ^ Math.imul(shard + 1, 0x85EBCA6B)) >>> 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const ents = (MODE === 'weapons' || MODE === 'threat')
      ? WEAPON_KEYS.filter(k => WEAPONS[k].type === 'melee' && WEAPONS[k].damage > 0)
      : Object.keys(CLASSES).filter(k => k !== 'megaknight');
    // --hold=signature: each class holds its own weapon (what selecting the class
    // sets the picker to), sword where it has none.
    const sig = k => (CLASSES[k] && CLASSES[k].weapon) || 'sword';
    const asM = e => MODE === 'classes' ? { k: e, w: HOLD_W === 'signature' ? sig(e) : HOLD_W } : { k: HOLD_C, w: e };
    // Every pairing including mirrors (i === j): the mirror is the control.
    // threat: ORDERED pairs, Sovereign holds a (every melee kit, so no single
    // kit of his biases it) and a stock bot holds b.
    const jobs = [];
    for (let i = 0; i < ents.length; i++)
      for (let j = (MODE === 'threat' ? 0 : i); j < ents.length; j++) jobs.push([ents[i], ents[j]]);
    const out = [];
    jobs.forEach(([a, b], idx) => {
      if (idx % of !== shard) return;
      for (let m = 0; m < MATCHES; m++) {
        const A = asM(a), B = asM(b);
        const r = BalanceSim.runMatch(A.k, B.k, (Math.random() * 1e9) | 0,
          { stocks: STOCKS, arena: 'flat', diff: 'hard', maxFrames: FRAMES, swap: m % 2 === 1,
            wA: A.w, wB: B.w, brain: BRAIN,
            brainA: MODE === 'threat' ? 'sovereign' : undefined,
            brainB: MODE === 'threat' ? 'fighter' : undefined });
        out.push({ a, b, sd: r.stockDiff, dA: r.dmgA, dB: r.dmgB, lA: r.lockA, lB: r.lockB,
                   f: r.frames, to: r.timeout, err: r.err, bug: r.bug });
      }
    });
    return { ents, out };
  }, MODE, MATCHES, STOCKS, FRAMES, BRAIN, HOLD_C, HOLD_W, PATCH, WPATCH, shard, of);
  res.pageErrors = [...new Set(errs)].slice(0, 5);
  process.stdout.write('RESULT ' + JSON.stringify(res) + '\n');
  await browser.close(); server.close();
}

// ── ORCHESTRATOR ────────────────────────────────────────────────────────────
async function main() {
  log(`${LABEL}: mode=${MODE} brain=${BRAIN} matches/pair=${MATCHES} jobs=${JOBS}` +
      (Object.keys(PATCH).length ? ` patch=${JSON.stringify(PATCH)}` : ''));
  const t0 = Date.now();
  const parts = await Promise.all(Array.from({ length: JOBS }, (_, i) => new Promise(resolve => {
    const argv = [__filename, '--worker', `--shard=${i}`, `--of=${JOBS}`, `--wport=${BASEPORT + i}`,
      `--mode=${MODE}`, `--matches=${MATCHES}`, `--stocks=${STOCKS}`, `--frames=${FRAMES}`,
      `--brain=${BRAIN}`, `--holdclass=${HOLD_C}`, `--hold=${HOLD_W}`, `--patch=${JSON.stringify(PATCH)}`, `--wpatch=${JSON.stringify(WPATCH)}`];
    const p = spawn('node', argv, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '', tail = '';
    p.stdout.on('data', d => { buf += d; });
    p.stderr.on('data', d => { tail = (tail + d).slice(-4000); });
    p.on('close', code => {
      const line = buf.split('\n').find(l => l.startsWith('RESULT '));
      if (!line) {
        const msg = tail.split('\n').filter(l => l.trim() && !/^\s+at /.test(l)).slice(-3).join(' | ');
        log(`shard ${i} FAILED (${code}) ${msg}`); return resolve(null);
      }
      resolve(JSON.parse(line.slice(7)));
    });
  })));
  const ok = parts.filter(Boolean);
  if (!ok.length) { console.error('every shard failed'); process.exit(1); }
  const ents = ok[0].ents, rows = ok.flatMap(p => p.out);

  if (MODE === 'threat') return threatReport(ents, rows, ok, t0);
  const st = Object.fromEntries(ents.map(e => [e, { w: 0, l: 0, d: 0, n: 0, dFor: 0, dAg: 0, f: 0 }]));
  const mir = Object.fromEntries(ents.map(e => [e, { a: 0, b: 0, d: 0 }]));
  const cell = {};
  const bugs = { nonFinite: {}, offArena: {}, stall: {}, timeout: {}, err: {} };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  for (const r of rows) {
    const tag = r.a === r.b ? r.a : `${r.a} v ${r.b}`;
    if (r.bug && r.bug.nonFinite) bump(bugs.nonFinite, tag);
    if (r.bug && r.bug.offArena)  bump(bugs.offArena, tag);
    if (r.bug && r.bug.stall)     bump(bugs.stall, tag);
    if (r.to)  bump(bugs.timeout, tag);
    if (r.err) bump(bugs.err, `${tag}: ${r.err}`);
    if (r.a === r.b) { const m = mir[r.a]; if (r.sd > 0) m.a++; else if (r.sd < 0) m.b++; else m.d++; continue; }
    const A = st[r.a], B = st[r.b];
    A.n++; B.n++; A.f += r.f; B.f += r.f;
    A.dFor += r.dA; A.dAg += r.dB; B.dFor += r.dB; B.dAg += r.dA;
    const k = r.a + '|' + r.b; const c = cell[k] || (cell[k] = { aw: 0, bw: 0, d: 0 });
    if (r.sd > 0) { A.w++; B.l++; c.aw++; } else if (r.sd < 0) { A.l++; B.w++; c.bw++; } else { A.d++; B.d++; c.d++; }
  }
  const pct = s => 100 * (s.w + 0.5 * s.d) / (s.n || 1);
  const ranked = ents.slice().sort((x, y) => pct(st[y]) - pct(st[x]));
  const rates = ranked.map(e => pct(st[e]));
  const rmse = Math.sqrt(rates.reduce((a, r) => a + (r - 50) ** 2, 0) / rates.length);

  console.log(`\n════ ${LABEL} — ${rows.length} matches, ${((Date.now() - t0) / 60000).toFixed(1)}m ════`);
  console.log(`  spread ${(rates[0] - rates.at(-1)).toFixed(0)} pts   RMSE-from-50 ${rmse.toFixed(1)}\n`);
  console.log('  entrant        win%     W-L-D      dmg/1k for-against');
  for (const e of ranked) {
    const s = st[e], k = v => (1000 * v / (s.f || 1)).toFixed(1);
    console.log(`  ${e.padEnd(14)} ${pct(s).toFixed(1).padStart(5)}%   ${`${s.w}-${s.l}-${s.d}`.padEnd(10)} ${k(s.dFor)} - ${k(s.dAg)}`);
  }
  console.log('\n  mirror control (same kit both sides; should sit near 50%):');
  const mline = ents.map(e => { const m = mir[e], n = m.a + m.b + m.d; return `${e} ${n ? Math.round(100 * (m.a + 0.5 * m.d) / n) : '-'}%`; });
  console.log('    ' + mline.join('  '));
  console.log('\n  most lopsided pairings:');
  const lop = Object.entries(cell).map(([k, c]) => {
    const [a, b] = k.split('|'); const n = c.aw + c.bw + c.d; const r = 100 * (c.aw + 0.5 * c.d) / n;
    return r >= 50 ? { w: a, l: b, r, n } : { w: b, l: a, r: 100 - r, n };
  }).filter(x => x.r >= 80).sort((x, y) => y.r - x.r);
  for (const x of lop.slice(0, 12)) console.log(`    ${x.w.padEnd(14)} beats ${x.l.padEnd(14)} ${x.r.toFixed(0)}%  (n=${x.n})`);
  if (!lop.length) console.log('    none at 80%+');
  console.log('\n  BUG FINDER:');
  let anyBug = false;
  for (const [kind, o] of Object.entries(bugs)) {
    const e = Object.entries(o).sort((a, b) => b[1] - a[1]);
    if (!e.length) continue; anyBug = true;
    console.log(`    ${kind}: ${e.slice(0, 6).map(([k, v]) => `${k} x${v}`).join(', ')}`);
  }
  const pe = [...new Set(ok.flatMap(p => p.pageErrors || []))];
  if (pe.length) { anyBug = true; console.log('    page errors: ' + pe.join(' | ')); }
  if (!anyBug) console.log('    nothing tripped');

  const dir = path.join(ROOT, 'data', 'balance'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${LABEL.replace(/[^\w.+-]/g, '_')}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ LABEL, MODE, BRAIN, MATCHES, PATCH, ents, st, mir, cell, bugs, rmse }, null, 1));
  log('wrote ' + path.relative(ROOT, file));
}

// threat: how dangerous is a stock bot holding X to Sovereign (a strong
// player), averaged over every melee kit he holds. Reported per BOT weapon.
function threatReport(ents, rows, ok, t0) {
  const bt = Object.fromEntries(ents.map(e => [e, { w: 0, n: 0, dmg: 0, taken: 0, f: 0 }]));
  let to = 0;
  for (const r of rows) {
    const b = bt[r.b]; b.n++; b.f += r.f; b.dmg += r.dB; b.taken += r.dA;
    if (r.sd < 0) b.w++;
    if (r.to) to++;
  }
  const k = (v, f) => (1000 * v / (f || 1));
  const rk = ents.slice().sort((x, y) => k(bt[y].dmg, bt[y].f) - k(bt[x].dmg, bt[x].f));
  const dmgs = rk.map(e => k(bt[e].dmg, bt[e].f)), mean = dmgs.reduce((a, b) => a + b, 0) / dmgs.length;
  console.log(`\n════ ${LABEL} — ${rows.length} matches, ${((Date.now() - t0) / 60000).toFixed(1)}m ════`);
  console.log(`  bot weapon threat to a strong player (mean dmg ${mean.toFixed(1)}/1k, max/min ${(dmgs[0] / dmgs.at(-1)).toFixed(2)}x)\n`);
  console.log('  bot holds       bot win%   bot dmg/1k   vs field   bot takes/1k');
  for (const e of rk) {
    const b = bt[e];
    console.log(`  ${e.padEnd(14)} ${(100 * b.w / b.n).toFixed(1).padStart(6)}%   ${k(b.dmg, b.f).toFixed(1).padStart(8)}   ${((k(b.dmg, b.f) / mean - 1) * 100).toFixed(0).padStart(5)}%   ${k(b.taken, b.f).toFixed(1).padStart(8)}`);
  }
  console.log(`\n  ${to} timeouts`);
  const dir = path.join(ROOT, 'data', 'balance'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${LABEL.replace(/[^\w.+-]/g, '_')}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ LABEL, MODE, PATCH, ents, bt }, null, 1));
  log('wrote ' + path.relative(ROOT, file));
}

(args.worker ? worker() : main()).catch(e => { console.error('FATAL', e); process.exit(1); });
