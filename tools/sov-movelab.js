'use strict';
/* global MoveLab */
/*
 * tools/sov-movelab.js — SOVEREIGN'S MOVE LAB. DEV ONLY.
 *
 * Drills every melee weapon on the real engine, one weapon per block:
 *   frames    every move's startup, reach, damage, stun and frame advantage
 *   routes    after a hit lands, which follow-up links TRUE (lands while the
 *             target is still in stun or ragdoll), learned by fitted value
 *             iteration over thousands of chains per weapon
 *   counters  three frames into an opponent's move, what each answer is worth
 *
 * Page-side drills live in tools/sov-movelab-page.js and drive fighters with the
 * same code the live fight uses (js/smb-sov-combo.js).
 *
 * Usage:
 *   node tools/sov-movelab.js --phase=all [--episodes=3000] [--cepisodes=4000] [--jobs=8]
 *   node tools/sov-movelab.js --build=data/movelab/<stamp>     writes js/smb-sov-movebook.js
 *   node tools/sov-movelab.js --doc=data/movelab/<stamp>       writes docs/sovereign-movebook.md
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const log = (...a) => console.log('[movelab]', ...a);

async function openPage(port) {
  const server = await new Promise((resolve, reject) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    s.on('error', reject);
    s.listen(port, () => resolve(s));
  });
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 3600000, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.setRequestInterception(true);
  page.on('request', r => (r.url().startsWith(`http://localhost:${port}/`) || r.url().startsWith('data:')) ? r.continue() : r.abort());
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 600000 });
  await page.waitForFunction(() => typeof SovMoves !== 'undefined' && typeof SMK2Trainer !== 'undefined' &&
    typeof SMK2Trainer.simEnv !== 'undefined', { timeout: 600000 });
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'sov-movelab-page.js'), 'utf8') });
  await page.evaluate(() => { console.log = () => {}; console.warn = () => {}; });
  return { browser, page, server, errs };
}

// ── WORKER ──────────────────────────────────────────────────────────────────
async function worker() {
  const port = parseInt(args.wport, 10);
  const { browser, page, server, errs } = await openPage(port);
  if (args.list) {
    const info = await page.evaluate(() => {
      // Plus his signature Null Blade: enemyOnly keeps it out of WEAPON_KEYS, but
      // the legacy loadout list can still hand it to him.
      const W = WEAPON_KEYS.filter(k => WEAPONS[k] && WEAPONS[k].type !== 'ranged')
        .concat(WEAPONS.nullblade ? ['nullblade'] : []);
      let top;
      try {
        const any = SOV_ARSENAL.arsenal.any.weapon;
        top = Object.keys(any).filter(k => W.includes(k)).sort((a, b) => any[b].r / any[b].n - any[a].r / any[a].n).slice(0, 6);
      } catch (e) { top = W.slice(0, 6); }
      return { weapons: W, top };
    });
    process.stdout.write('RESULT ' + JSON.stringify(info) + '\n');
  } else {
    const job = JSON.parse(args.job);
    const res = await page.evaluate(job => {
      MoveLab.seed(job.seed);
      if (job.phase === 'frames')   return MoveLab.catalogue(job.w);
      if (job.phase === 'routes')   return MoveLab.routes(job.w, job.episodes, job.rounds);
      if (job.phase === 'counters') return MoveLab.counters(job.w, job.mine, job.episodes);
      return null;
    }, job);
    fs.writeFileSync(path.join(job.out, `${job.phase}-${job.w}.json`), JSON.stringify(res));
    process.stdout.write('RESULT ' + JSON.stringify({ ok: true, errs: errs.slice(0, 3), err: res && res.err }) + '\n');
  }
  await browser.close(); server.close();
}

function runWorker(extra, port) {
  return new Promise(resolve => {
    const p = spawn('node', [__filename, '--worker', `--wport=${port}`].concat(extra), { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '', tail = '';
    p.stdout.on('data', d => { buf += d; });
    p.stderr.on('data', d => { tail = (tail + d).slice(-1500); });
    p.on('close', () => {
      const line = buf.split('\n').find(l => l.startsWith('RESULT '));
      if (!line) { log('worker FAILED', extra.join(' '), tail.split('\n').slice(-4).join(' | ')); return resolve(null); }
      resolve(JSON.parse(line.slice(7)));
    });
  });
}

async function driver() {
  const JOBS = parseInt(args.jobs, 10) || 8;
  const phases = args.phase === 'all' || !args.phase ? ['frames', 'routes', 'counters'] : String(args.phase).split(',');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = args.out || path.join(ROOT, 'data', 'movelab', stamp);
  fs.mkdirSync(out, { recursive: true });
  const info = await runWorker(['--list'], 9400);
  if (!info) process.exit(1);
  const only = args.weapons ? String(args.weapons).split(',') : null;
  const W = only ? info.weapons.filter(w => only.includes(w)) : info.weapons;
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ weapons: W, top: info.top, phases, at: new Date().toISOString(),
    episodes: +args.episodes || 3000, cepisodes: +args.cepisodes || 4000 }));
  log(`${W.length} weapons, phases ${phases.join('+')}, his weapons for counters: ${info.top.join(', ')} -> ${path.relative(ROOT, out)}`);
  const tasks = [];
  for (const phase of phases) W.forEach((w, i) => tasks.push({ phase, w, out, seed: 7919 * (i + 1) + phase.length,
    episodes: phase === 'counters' ? (+args.cepisodes || 4000) : (+args.episodes || 3000), rounds: +args.rounds || 5, mine: info.top }));
  const t0 = Date.now(); let next = 0, done = 0;
  await Promise.all(Array.from({ length: JOBS }, async (_, slot) => {
    while (next < tasks.length) {
      const t = tasks[next++];
      const r = await runWorker([`--job=${JSON.stringify(t)}`], 9410 + slot);
      done++;
      log(`${done}/${tasks.length} ${t.phase} ${t.w}${r && (r.err || (r.errs && r.errs.length)) ? '  ERR ' + (r.err || r.errs[0]) : ''}`);
    }
  }));
  log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min — next: node tools/sov-movelab.js --build=${path.relative(ROOT, out)}`);
}

// ── BUILD: write js/smb-sov-movebook.js ─────────────────────────────────────
function readPhase(dir, phase) {
  const o = {};
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(new RegExp(`^${phase}-(.+)\\.json$`));
    if (m) o[m[1]] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  }
  return o;
}

function build(dir) {
  const frames = readPhase(dir, 'frames'), routes = readPhase(dir, 'routes'), counters = readPhase(dir, 'counters');
  const book = { built: new Date().toISOString().slice(0, 10), source: path.basename(dir), frames: {}, routes: {}, counters: null };
  for (const [w, fd] of Object.entries(frames)) {
    book.frames[w] = {};
    for (const [mv, r] of Object.entries(fd)) {
      if (!r || !r.hit) { book.frames[w][mv] = null; continue; }
      book.frames[w][mv] = { startup: r.startupMin, reach: r.reach, dmg: r.dmg, stun: r.maxStun, rag: r.maxRag,
                             adv: [r.advMin, r.advMax], recover: r.attFree };
    }
  }
  // Pruned to what the runtime can use: _labCell reads a cell only at n >= 3,
  // and the two finest levels need more than that to beat the coarser estimate
  // they refine. The finest counter level (opponent weapon, his weapon, move,
  // distance, both airborne flags, approach) averages under 3 samples per cell
  // over 60k exchanges and is dropped whole; its index stays so keys line up.
  const prune = (lvls, mins) => lvls.map((L, i) => {
    const o = {};
    for (const [k, row] of Object.entries(L)) {
      const r2 = {};
      for (const [a, c] of Object.entries(row)) if (c[0] >= mins[i]) r2[a] = c;
      if (Object.keys(r2).length) o[k] = r2;
    }
    return o;
  });
  for (const [w, r] of Object.entries(routes)) book.routes[w] = prune(r.levels, [5, 5, 3, 3]);
  // Counters: merge every opponent weapon's levels into one set; keys already
  // carry the opponent weapon, except the coarsest, which is per weapon too.
  const lv = [{}, {}, {}, {}];
  for (const r of Object.values(counters)) r.levels.forEach((L, i) => Object.assign(lv[i], L));
  // The runtime cell is [n, positives, mean, sd]; clash/parry counts are for the doc.
  book.counters = prune(lv.map(L => {
    const o = {};
    for (const [k, row] of Object.entries(L)) { o[k] = {}; for (const [a, c] of Object.entries(row)) o[k][a] = c.slice(0, 4); }
    return o;
  }), [Infinity, 5, 3, 3]);
  const OUT = path.join(ROOT, 'js', 'smb-sov-movebook.js');
  const header = `// ============================================================
// SOVEREIGN — MOVE BOOK DATA. GENERATED; DO NOT EDIT BY HAND.
// ============================================================
// Regenerate with:
//   node tools/sov-movelab.js --phase=all
//   node tools/sov-movelab.js --build=data/movelab/<stamp>
// Re-run after ANY weapon, class or combat change: every number here is a
// measurement of the engine as it was on ${book.built} (${book.source}).
//
// frames:   per weapon and move — startup frames, reach px, damage, stun,
//           ragdoll, frame advantage [min,max] and recovery frames
// routes:   per weapon, four key levels (see SovMoves.routeKeys) of
//           [n, trueLinks, meanValueGivenTrue, anyHits, meanDamageOnHit]
// counters: four key levels (see SovMoves.counterKeys) of [n, positives, mean, sd]
`;
  fs.writeFileSync(OUT, header + '\nlet SOV_MOVEBOOK = ' + JSON.stringify(book) + ';\n');
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  log(`wrote ${path.relative(ROOT, OUT)} (${kb} KB) — ${Object.keys(book.routes).length} route tables, ${Object.keys(book.counters[1]).length} counter keys at the level his own evidence is filed under`);
}

// ── DOC: write docs/sovereign-movebook.md ───────────────────────────────────
function doc(dir) {
  const frames = readPhase(dir, 'frames'), routes = readPhase(dir, 'routes'), counters = readPhase(dir, 'counters');
  const L = [];
  const p = s => L.push(s);
  p('# Sovereign move book');
  p('');
  p(`GENERATED by \`node tools/sov-movelab.js --doc=${path.relative(ROOT, dir)}\` — do not edit by hand. ` +
    'Findings and their interpretation live in docs/sovereign-adaptive-project.md.');
  p('');
  p('Every number is a measurement of the real engine (tools/sov-movelab-page.js), two fighters on The Circuit, ' +
    'driven by the same code Sovereign uses in a live fight (js/smb-sov-combo.js).');
  p('');
  p('## Frame data');
  p('');
  p('Fired from a standstill at a passive target, every 10px from 20 to 320px (centre to centre). ' +
    '**Reach** is the farthest distance that hit; **listed** is `weapon.range`. **Startup** is frames from the ' +
    'input to first damage, point-blank / at max reach. **Advantage** is frames the target stays locked after ' +
    'the attacker can act again: positive means the attacker moves first, so a follow-up can link.');
  p('');
  p('| Weapon | Move | Listed | Reach | Startup | Damage | Stun | Ragdoll | Advantage | Recovery |');
  p('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const w of Object.keys(frames).sort()) {
    for (const mv of ['swing', 'ability', 'super']) {
      const r = frames[w][mv];
      if (!r || !r.hit) { p(`| ${w} | ${mv} | | | | ${r && r.fired ? 'no hit' : 'did not fire'} | | | | |`); continue; }
      const adv = r.advMin == null ? '—' : r.advMin === r.advMax ? `${r.advMin}` : `${r.advMin} to ${r.advMax}`;
      p(`| ${w} | ${mv} | ${r.listedRange} | ${r.reach} | ${r.startupMin} / ${r.startupFar} | ${r.dmg} | ${r.maxStun} | ${r.maxRag} | ${adv} | ${r.attFree} |`);
    }
  }
  p('');
  p('## Combo routes');
  p('');
  p('After an opener lands he chooses a follow-up (move @ frames of delay) and the drill records whether it ' +
    'connected, and whether it was a **true link**: the target was still in stun or ragdoll when it landed. ' +
    'Chains end on a miss or a gap. Values come from fitted value iteration over every recorded step.');
  p('');
  p('| Weapon | Chains | Steps | Ended by gap | Ended by miss | Deepest true chain | Best true-link rates |');
  p('|---|---:|---:|---:|---:|---:|---|');
  for (const w of Object.keys(routes).sort()) {
    const d = routes[w];
    const ends = { gap: 0, miss: 0, cap: 0 };
    let deep = 0;
    for (const [k, v] of Object.entries(d.ends || {})) { const [dp, why] = k.split(':'); ends[why] += v; deep = Math.max(deep, why === 'cap' ? +dp + 1 : +dp); }
    const best = Object.entries(d.acts).filter(([, e]) => e.n >= 30).map(([a, e]) => [a, e.tru / e.n])
      .sort((x, y) => y[1] - x[1]).slice(0, 3).map(([a, r]) => `${a} ${(100 * r).toFixed(0)}%`).join(', ');
    p(`| ${w} | ${d.landed} | ${d.transitions} | ${ends.gap} | ${ends.miss} | ${deep} follow-ups | ${best} |`);
  }
  p('');
  p('Most damaging true chains per weapon (follow-ups after the opener; damage includes lingering hits):');
  p('');
  for (const w of Object.keys(routes).sort()) {
    const top = (routes[w].top || []).slice(0, 3).map(c => `\`${c.seq.join(' → ')}\` ${c.dmg}`).join(' · ');
    p(`- **${w}**: ${top || '—'}`);
  }
  p('');
  p('## Counters');
  p('');
  p(`The opponent starts a move; ${3} frames later he answers with a random legal answer; the exchange is ` +
    'scored over 75 frames as damage dealt − damage taken + 0.3 × (frames the opponent is left locked − frames he is). ' +
    'His weapon is one of his six strongest by the arsenal.');
  p('');
  p('| Opponent weapon | Their move | Best answer | Second | Worst | Samples |');
  p('|---|---|---|---|---|---:|');
  const clashTot = {}, parryTot = {};
  for (const w of Object.keys(counters).sort()) {
    const lv = counters[w].levels[3];
    for (const kind of ['swing', 'aswing', 'ability', 'super']) {
      const row = lv[`${w}|${kind}`];
      if (!row) continue;
      const s = Object.entries(row).sort((x, y) => y[1][2] - x[1][2]);
      const n = s.reduce((a, [, c]) => a + c[0], 0);
      for (const [a, c] of s) { clashTot[a] = (clashTot[a] || 0) + c[4]; parryTot[a] = (parryTot[a] || 0) + c[5]; }
      const f = ([a, c]) => `${a} (${c[2] >= 0 ? '+' : ''}${c[2]})`;
      p(`| ${w} | ${kind} | ${f(s[0])} | ${s[1] ? f(s[1]) : ''} | ${f(s[s.length - 1])} | ${n} |`);
    }
  }
  p('');
  p('Clashes by answer: ' + Object.entries(clashTot).filter(([, v]) => v).map(([a, v]) => `${a} ${v}`).join(', ') + '. ' +
    'Parries (the opponent left parry-vulnerable) by answer: ' +
    Object.entries(parryTot).filter(([, v]) => v).map(([a, v]) => `${a} ${v}`).join(', ') + '.');
  p('');
  const OUT = path.join(ROOT, 'docs', 'sovereign-movebook.md');
  fs.writeFileSync(OUT, L.join('\n'));
  log(`wrote ${path.relative(ROOT, OUT)}`);
}

if (args.worker) worker().catch(e => { console.error('FATAL', e); process.exit(1); });
else if (args.build) build(path.resolve(ROOT, args.build));
else if (args.doc) doc(path.resolve(ROOT, args.doc));
else driver().catch(e => { console.error('FATAL', e); process.exit(1); });
