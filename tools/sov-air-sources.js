'use strict';
/*
 * tools/sov-air-sources.js — WHERE DOES SOVEREIGN'S AIRTIME COME FROM? DEV ONLY.
 *
 * Every ground->air transition starts a "stint", tagged with its cause:
 *   launch:<commit>  he jumped; <commit> is the cascade branch that won that frame
 *   knocked          he left the ground while stunned/ragdolled (knockback)
 *   walkoff          no upward velocity and no stun: stepped off a ledge
 * Per cause: stints, airborne frames, and OPENERS he took during the stint (a hit
 * on him with no hit either way in the previous 60 frames).
 *
 * Opponents: the human proxy (tools/human-proxy.js, DEFAULTS or
 * tools/human-proxy-params.json when present) and/or scripted policies.
 *
 * Usage: node tools/sov-air-sources.js [--opp=proxy|anti_air_hawk|...] [--n=40] [--jobs=8]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

async function worker() {
  const port = parseInt(args.wport, 10), opp = args.opp, seed0 = parseInt(args.seed0, 10), n = parseInt(args.n, 10);
  const flags = args.flags ? JSON.parse(args.flags) : {};
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
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.setRequestInterception(true);
  page.on('request', r => (r.url().startsWith(`http://localhost:${port}/`) || r.url().startsWith('data:')) ? r.continue() : r.abort());
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 600000 });
  await page.waitForFunction(() => typeof SMK2Trainer !== 'undefined' && typeof SovScenarios !== 'undefined', { timeout: 600000 });
  await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'tools', 'human-proxy.js'), 'utf8') });
  const pfile = args.params || path.join(ROOT, 'tools', 'human-proxy-params.json');
  const params = fs.existsSync(pfile) ? JSON.parse(fs.readFileSync(pfile, 'utf8')) : null;
  // No pin by default: he picks his own kit, exactly as in a real match. (A pin also
  // applies that class's stat line — the old sword/ninja default ran him at 126 HP
  // instead of his real 150.)
  const sk = args.sovkit ? String(args.sovkit).split('/') : null;
  const sovKit = sk ? { w: sk[0], c: sk[1] || 'none' } : null;
  const out = await page.evaluate((opp, seed0, n, params, flags, sovKit) => {
    const seedRng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const A = { causes: {}, frames: 0, air: 0, openers: 0, midJumps: {} };
    const bump = (c, k, v) => { const o = A.causes[c] || (A.causes[c] = { stints: 0, frames: 0, openers: 0 }); o[k] += v; };
    const orig = SovereignMK2.prototype.update;
    SovereignMK2.prototype.update = function () {
      const wasG = this.onGround, vy0 = this.vy, t = this.target;
      // Hits land between his updates (the opponent's swing resolves in ITS update), so
      // compare against what we saw at the end of his previous update, not at entry.
      const hp0 = (this._probeHp === undefined) ? this.health : this._probeHp;
      const thp0 = (t && t._probeHpT !== undefined) ? t._probeHpT : (t ? t.health : 0);
      const r = orig.apply(this, arguments);
      const F = (typeof frameCount !== 'undefined') ? frameCount : 0;
      if (this.health <= 0) { this._stint = null; this._probeHp = undefined; return r; }
      A.frames++;
      if (wasG && !this.onGround) {
        let cause;
        if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) cause = 'knocked';
        else if (this.vy < -3) cause = 'launch:' + (this._lastCommit || '?');
        else cause = 'walkoff';
        this._stint = cause; bump(cause, 'stints', 1);
      } else if (!wasG && !this.onGround && this.vy < vy0 - 6 && !((this.stunTimer || 0) > 0)) {
        const c = 'air-jump:' + (this._lastCommit || '?'); A.midJumps[c] = (A.midJumps[c] || 0) + 1;
      }
      if (this.onGround) this._stint = null;
      if (!this.onGround) { A.air++; if (this._stint) bump(this._stint, 'frames', 1); }
      // opener on him
      if (this.health < hp0) {
        const quiet = F - (this._lastExchangeF || -9999) > 60;
        if (quiet) { A.openers++; bump(this.onGround ? 'GROUNDED' : (this._stint || 'air-unknown'), 'openers', 1); }
        this._lastExchangeF = F;
      }
      if (t && t.health < thp0) this._lastExchangeF = F;
      this._probeHp = this.health; if (t) t._probeHpT = t.health;
      return r;
    };
    for (const k in flags) SMK2_TUNE[k] = flags[k];
    let lost = 0, killed = 0;
    for (let i = 0; i < n; i++) {
      const _c = console.log; console.log = () => {}; try { SovDossier.reset(); if (typeof SovHabits !== 'undefined') SovHabits.reset(); } finally { console.log = _c; }
      Math.random = seedRng((seed0 + i) * 7919 + 3);
      let r;
      if (opp === 'proxy') {
        const ai = HumanProxy.controller(Object.assign({}, HumanProxy.DEFAULTS || {}, params || {}));
        r = SMK2Trainer.runMatch(null, 1, (seed0 + i) * 104729, { duel: true, noBuff: true, lives: 10, maxFrames: 24000,
          opp: { w: 'spear', c: 'gunner' }, sovKit: sovKit || undefined, oppHpMult: (params && params.hpMult) || 1, oppAI: function () { return ai.call(this); } });
      } else {
        r = SovScenarios.run({ name: 'air_' + opp, punishes: '', bots: [{ w: 'sword', c: 'none', policy: opp }] }, null, (seed0 + i) * 104729);
        r = r && r.result;
      }
      if (r) { lost += (opp === 'proxy' ? 10 : 5) - (r.sovLivesLeft || 0); killed += r.oppDeaths || 0; (A.killList = A.killList || []).push(r.oppDeaths || 0); }
    }
    A.lost = lost; A.killed = killed;
    return A;
  }, opp, seed0, n, params, flags, sovKit);
  process.stdout.write('RESULT ' + JSON.stringify(Object.assign(out, { errs })) + '\n');
  await browser.close(); server.close();
}

async function driver() {
  const opp = args.opp || 'proxy', N = parseInt(args.n, 10) || 40, JOBS = parseInt(args.jobs, 10) || 8;
  const CH = Math.ceil(N / JOBS);
  const res = await Promise.all(Array.from({ length: Math.ceil(N / CH) }, (_, j) => new Promise(resolve => {
    const p = spawn('node', [__filename, '--worker', `--wport=${9600 + j}`, `--opp=${opp}`, `--seed0=${5000 + j * CH}`,
      `--n=${Math.min(CH, N - j * CH)}`].concat(args.flags ? [`--flags=${args.flags}`] : []).concat(args.params ? [`--params=${args.params}`] : []).concat(args.sovkit ? [`--sovkit=${args.sovkit}`] : []), { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '', tail = ''; p.stdout.on('data', d => { buf += d; }); p.stderr.on('data', d => { tail = (tail + d).slice(-1000); });
    p.on('close', () => { const l = buf.split('\n').find(x => x.startsWith('RESULT ')); if (!l) { console.log('FAILED', tail); return resolve(null); } resolve(JSON.parse(l.slice(7))); });
  })));
  const T = { causes: {}, frames: 0, air: 0, openers: 0, midJumps: {}, lost: 0, killed: 0 };
  for (const r of res.filter(Boolean)) {
    if (r.errs.length) console.log('page errors', r.errs);
    for (const k of ['frames', 'air', 'openers', 'lost', 'killed']) T[k] += r[k];
    T.killList = (T.killList || []).concat(r.killList || []);
    for (const [c, o] of Object.entries(r.causes)) { const d = T.causes[c] || (T.causes[c] = { stints: 0, frames: 0, openers: 0 }); d.stints += o.stints; d.frames += o.frames; d.openers += o.openers; }
    for (const [c, v] of Object.entries(r.midJumps)) T.midJumps[c] = (T.midJumps[c] || 0) + v;
  }
  const KL = T.killList || [];
  console.log(`floor: kills>=7 in ${KL.filter(k => k >= 7).length}/${KL.length} (${(100 * KL.filter(k => k >= 7).length / Math.max(1, KL.length)).toFixed(0)}%)  mean kills ${(KL.reduce((a, b) => a + b, 0) / Math.max(1, KL.length)).toFixed(2)}`);
  console.log(`\nopponent=${opp} matches=${N}  his airborne ${(100 * T.air / T.frames).toFixed(1)}%  openers taken ${T.openers}  stocks lost ${T.lost}  kills ${T.killed}`);
  console.log('cause                                 stints   air-frames(% of all air)   openers taken (% of all)');
  Object.entries(T.causes).sort((a, b) => (b[1].frames + b[1].openers * 1000) - (a[1].frames + a[1].openers * 1000)).slice(0, 25).forEach(([c, o]) =>
    console.log(`  ${c.padEnd(36)} ${String(o.stints).padStart(6)}   ${String(o.frames).padStart(8)} (${(100 * o.frames / Math.max(1, T.air)).toFixed(1).padStart(5)}%)      ${String(o.openers).padStart(5)} (${(100 * o.openers / Math.max(1, T.openers)).toFixed(1)}%)`));
  console.log('mid-air jumps by branch:', Object.entries(T.midJumps).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, v]) => c + ' ' + v).join(', '));
}

(args.worker ? worker() : driver()).catch(e => { console.error('FATAL', e); process.exit(1); });
