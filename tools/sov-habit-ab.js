'use strict';
/*
 * tools/sov-habit-ab.js — matched-seed, parallel A/B for SMK2_TUNE.habitAir. DEV ONLY.
 *
 * Supersedes the arm comparison in tools/sov-habit-test.js, which gave the on and
 * off arms DIFFERENT seeds (so pairs were not matched) and ran serially (too slow
 * to reach the ~200 matches/arm this rig needs to resolve anything).
 *
 * Two modes:
 *   fresh (default)  every match starts with an empty habit ledger — "first meeting"
 *   --carry=K        runs rematch sequences of K matches with the ledger CARRIED
 *                    between them (the bot is given a fixed _habitKey), which is
 *                    how the engine meets a real player: it remembers them.
 *
 * Usage: node tools/sov-habit-ab.js [--n=200] [--jobs=8] [--carry=0]
 *                                   [--opps=anti_air_hawk,ground_brawler] [--flag=habitAir]
 *                                   [--fixed=routeSpend:0,comboRoutes:1]   held in BOTH arms
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

async function worker() {
  const port = parseInt(args.wport, 10);
  const opp = args.opp, flagName = args.flag || 'habitAir', on = args.on === '1';
  const seed0 = parseInt(args.seed0, 10), n = parseInt(args.n, 10), carry = parseInt(args.carry, 10) || 0;
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
  const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 3600000, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.setRequestInterception(true);
  page.on('request', r => (r.url().startsWith(`http://localhost:${port}/`) || r.url().startsWith('data:')) ? r.continue() : r.abort());
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 600000 });
  await page.waitForFunction(() => typeof SovScenarios !== 'undefined' && typeof SovHabits !== 'undefined', { timeout: 600000 });
  let pparams = null;
  if (opp === 'proxy') {
    await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'tools', 'human-proxy.js'), 'utf8') });
    pparams = JSON.parse(fs.readFileSync(args.params || path.join(ROOT, 'tools', 'human-proxy-params.json'), 'utf8'));
  }
  const fixed = String(args.fixed || '').split(',').filter(Boolean).map(kv => { const [k, v] = kv.split(':'); return [k, v === '1' || v === 'true']; });
  const rows = await page.evaluate((opp, flagName, on, seed0, n, carry, pparams, fixed) => {
    const _cl = console.log;
    const seedRng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    if (!SovereignMK2.prototype.__abWrapped) {
      const orig = SovereignMK2.prototype.update;
      SovereignMK2.prototype.update = function () {
        window.__abT = (window.__abT || 0) + 1;
        if (!this.onGround) window.__abA = (window.__abA || 0) + 1;
        return orig.apply(this, arguments);
      };
      SovereignMK2.prototype.__abWrapped = true;
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const seed = seed0 + i;
      const fresh = !carry || (i % carry === 0);
      console.log = () => {};
      // Carry mode keeps the dossier too: kit choice and the tactic grid live
      // there, and a rematch is exactly when they should pay.
      try { if (fresh) { SovDossier.reset(); SovHabits.reset(); } } finally { console.log = _cl; }
      // Carry mode: every bot in this sequence answers to one fixed ledger key.
      if (carry) Fighter.prototype._habitKey = 'ab:' + opp + ':' + Math.floor(i / carry);
      else delete Fighter.prototype._habitKey;
      for (const [k, v] of fixed) SMK2_TUNE[k] = v;
      SMK2_TUNE[flagName] = on;
      Math.random = seedRng(seed * 7919 + 17);
      window.__abT = 0; window.__abA = 0;
      const g0 = Object.assign({ seen: 0, vetoed: 0 }, window.SOV_HABIT_LOG || {});
      const raw0 = JSON.parse(JSON.stringify(SovHabits._raw() || {}));
      window.SOV_DESCENT_LOG = {};
      let R;
      if (opp === 'proxy') {
        const ai = HumanProxy.controller(Object.assign({}, HumanProxy.DEFAULTS || {}, pparams || {}));
        // No sovKit pin: smb-smk2-training.js now LOCKS whatever sovKit is passed
        // (opts.sovKit sets sov._loadoutLocked = true), so pinning here would force
        // sword/ninja every match instead of letting him pick his own kit the way
        // he does against the real player. Baseline (61% >=7 kills) was measured on
        // his natural pick — match that.
        R = SMK2Trainer.runMatch(null, 1, seed * 104729, { duel: true, noBuff: true, lives: 10, maxFrames: 24000,
          opp: { w: 'spear', c: 'gunner' }, oppHpMult: (pparams && pparams.hpMult) || 1, oppAI: function () { return ai.call(this); } });
      } else {
        const spec = { name: 'ab_' + opp, punishes: '', bots: [{ w: 'sword', c: 'none', policy: opp }] };
        const r = SovScenarios.run(spec, null, seed * 104729);
        R = r && r.result;
      }
      const g1 = Object.assign({ seen: 0, vetoed: 0 }, window.SOV_HABIT_LOG || {});
      // Air openers he took this match = growth of the bot's 'air'.taken across all records.
      const raw1 = SovHabits._raw() || {};
      let airTaken = 0, gndTaken = 0;
      for (const k of Object.keys(raw1)) {
        const p1 = raw1[k].postures || {}, p0 = (raw0[k] && raw0[k].postures) || {};
        airTaken += ((p1.air && p1.air.taken) || 0) - ((p0.air && p0.air.taken) || 0);
        for (const ps of ['ground', 'landing', 'committed'])
          gndTaken += ((p1[ps] && p1[ps].taken) || 0) - ((p0[ps] && p0[ps].taken) || 0);
      }
      out.push({ seed, idx: carry ? i % carry : 0, stocks: R ? R.sovLivesLeft : null, dealt: R ? R.dmgDealt : 0,
        taken: R ? R.dmgTaken : 0, kills: R ? (R.oppDeaths || 0) : 0, airPct: window.__abT ? 100 * window.__abA / window.__abT : 0,
        seen: g1.seen - g0.seen, vetoed: g1.vetoed - g0.vetoed, airTaken, gndTaken,
        descentLog: window.SOV_DESCENT_LOG || {} });
    }
    return out;
  }, opp, flagName, on, seed0, n, carry, pparams, fixed);
  process.stdout.write('RESULT ' + JSON.stringify({ opp, on, rows, errs: errs.slice(0, 3) }) + '\n');
  await browser.close(); server.close();
}

async function driver() {
  const N = parseInt(args.n, 10) || 200, JOBS = parseInt(args.jobs, 10) || 8;
  const carry = parseInt(args.carry, 10) || 0;
  const CH = carry || 10;                       // matches per worker chunk
  const opps = String(args.opps || 'anti_air_hawk,ground_brawler').split(',');
  const flag = args.flag || 'habitAir';
  const tasks = [];
  for (const opp of opps) for (let s = 0; s < N; s += CH) for (const on of [1, 0])
    tasks.push({ opp, on, seed0: 1000 + s, n: Math.min(CH, N - s) });   // same seeds in both arms
  console.log(`[ab] ${tasks.length} chunks, ${N} matches/arm/opp, carry=${carry}, ${JOBS} jobs`);
  const t0 = Date.now(); let next = 0; const res = [];
  await Promise.all(Array.from({ length: JOBS }, async (_, slot) => {
    while (next < tasks.length) {
      const t = tasks[next++];
      const r = await new Promise(resolve => {
        const p = spawn('node', [__filename, '--worker', `--wport=${9500 + slot}`, `--opp=${t.opp}`, `--on=${t.on}`,
          `--seed0=${t.seed0}`, `--n=${t.n}`, `--carry=${carry}`, `--flag=${flag}`].concat(args.params ? [`--params=${args.params}`] : [],
          args.fixed ? [`--fixed=${args.fixed}`] : []), { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
        let buf = '', tail = '';
        p.stdout.on('data', d => { buf += d; }); p.stderr.on('data', d => { tail = (tail + d).slice(-1500); });
        p.on('close', () => {
          const line = buf.split('\n').find(l => l.startsWith('RESULT '));
          if (!line) { console.log('[ab] FAILED', JSON.stringify(t), tail.split('\n').slice(-3).join(' | ')); return resolve(null); }
          resolve(JSON.parse(line.slice(7)));
        });
      });
      if (r) { res.push(r); if (r.errs.length) console.log('[ab] page errors', r.errs); }
    }
  }));
  const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const se = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1) / (a.length || 1)); };
  const f = (v, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d);
  console.log(`\n[ab] done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  for (const opp of opps) {
    const on = new Map(), off = new Map();
    for (const r of res.filter(r => r.opp === opp)) for (const row of r.rows) (r.on ? on : off).set(row.seed, row);
    const seeds = [...on.keys()].filter(s => off.has(s));
    const pair = k => seeds.map(s => on.get(s)[k] - off.get(s)[k]);
    const arm = (m, k) => mean(seeds.map(s => m.get(s)[k]));
    console.log(`\n  ${opp}  (n=${seeds.length} matched pairs)`);
    console.log('  metric        on        off       diff ± SE        t');
    for (const k of ['airPct', 'airTaken', 'gndTaken', 'taken', 'dealt', 'stocks', 'kills']) {
      const d = pair(k), m = mean(d), s = se(d);
      console.log(`  ${k.padEnd(12)} ${arm(on, k).toFixed(2).padStart(8)}  ${arm(off, k).toFixed(2).padStart(8)}   ${f(m).padStart(8)} ± ${s.toFixed(2).padEnd(6)} ${(s ? m / s : 0).toFixed(2).padStart(6)}`);
    }
    const kills7 = (m) => seeds.filter(s => m.get(s).kills >= 7).length / Math.max(1, seeds.length);
    console.log(`  kills>=7 share:  on ${(100 * kills7(on)).toFixed(1)}%   off ${(100 * kills7(off)).toFixed(1)}%`);
    const seen = seeds.reduce((a, s) => a + on.get(s).seen, 0), vet = seeds.reduce((a, s) => a + on.get(s).vetoed, 0);
    console.log(`  veto rate (on arm): ${vet}/${seen} = ${(100 * vet / Math.max(1, seen)).toFixed(1)}%`);
    // Per-arm choice mix + outcome rates from SOV_DESCENT_LOG (C2), on arm only.
    const dTot = {};
    for (const s of seeds) {
      const dl = on.get(s).descentLog || {};
      for (const [a, o] of Object.entries(dl)) {
        const d = dTot[a] || (dTot[a] = { chosen: 0, win: 0, loss: 0, none: 0 });
        for (const k of ['chosen', 'win', 'loss', 'none']) d[k] += (o[k] || 0);
      }
    }
    const dArms = Object.keys(dTot);
    if (dArms.length) {
      const totChosen = dArms.reduce((a, k) => a + dTot[k].chosen, 0) || 1;
      console.log('  descent arm mix (on arm):  arm       share    win/loss/none    win-loss rate');
      dArms.forEach(a => {
        const o = dTot[a], resolved = o.win + o.loss + o.none;
        console.log(`    ${a.padEnd(10)} ${(100 * o.chosen / totChosen).toFixed(1).padStart(5)}%    ${o.win}/${o.loss}/${o.none}         ${resolved ? ((o.win - o.loss) / resolved).toFixed(3) : 'n/a'}`);
      });
    }
    if (carry) {
      const byIdx = [];
      for (const s of seeds) { const r = on.get(s); (byIdx[r.idx] = byIdx[r.idx] || []).push(r); }
      console.log('  learning curve, on arm (rematch # → veto rate, air openers taken, dmg taken):');
      byIdx.forEach((rs, i) => { if (!rs) return; const sn = rs.reduce((a, r) => a + r.seen, 0), vt = rs.reduce((a, r) => a + r.vetoed, 0);
        console.log(`    #${String(i + 1).padStart(2)}  veto ${(100 * vt / Math.max(1, sn)).toFixed(0).padStart(3)}%   airTaken ${mean(rs.map(r => r.airTaken)).toFixed(2)}   taken ${mean(rs.map(r => r.taken)).toFixed(0)}`); });
    }
  }
  const dir = path.join(ROOT, 'data', 'balance'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `sov-habit-ab-${Date.now()}.json`), JSON.stringify(res));
}

(args.worker ? worker() : driver()).catch(e => { console.error('FATAL', e); process.exit(1); });
