'use strict';
/*
 * tools/brain/train.js — trains THE BRAIN (js/smb-brain.js) from scratch. DEV ONLY.
 *
 * It starts knowing nothing: a random network holding random keys. Each iteration
 * every worker (its own headless Chrome running the real game) plays whole
 * matches with the current network, then a PPO update runs here and the new
 * weights go back out. Opponents climb a ladder as it wins:
 *
 *   idle dummy -> easy bot -> medium -> hard -> expert -> league
 *
 * The league mixes the expert bot, SovereignMK2 and frozen past copies of itself.
 * Everything persists under data/brain/, so a stopped run resumes where it was.
 *
 * Usage:
 *   node tools/brain/train.js [--workers=8] [--steps=3000] [--hours=10] [--fresh]
 *   node tools/brain/report.js          # which controls it has learned so far
 *
 * Hunter (exploiter) run: --dir=data/brain-hunter --hunt=data/brain-hunter/target.json
 * Every match is against that frozen net playing its top choice, the way it plays
 * as Sovereign. Whatever the hunter learns is a hole in the target.
 *
 * Patching the holes: --hunters=data/brain-hunter[,...] puts each hunter's latest
 * checkpoint and its newest snapshots into the main league at HUNTER_SHARE.
 */
const fs = require('fs'), path = require('path'), http = require('http');
const { MLP, Adam } = require('./ppo');
const { GradPool } = require('./pool');
const os = require('os');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const WORKERS = parseInt(args.workers, 10) || 3;
const THREADS = parseInt(args.threads, 10) || Math.max(2, os.cpus().length - 2);
const STEPS   = parseInt(args.steps, 10) || 8000;        // decisions per worker per iteration
const HOURS   = parseFloat(args.hours) || 10;
const MAX_IT  = parseInt(args.iters, 10) || Infinity;
const PORT    = parseInt(args.port, 10) || 8120;
const ROOT    = path.resolve(__dirname, '..', '..');
const DIR     = args.dir ? path.resolve(ROOT, args.dir) : path.join(ROOT, 'data', 'brain');
const HUNTER_SHARE = 0.4;
// The hunters' newest nets (latest + up to 4 snapshots each); they play sampled, like any league net.
const HUNTERS = !args.hunters ? [] : String(args.hunters).split(',').flatMap(d => {
  const dir = path.resolve(ROOT, d), snaps = path.join(dir, 'snapshots');
  const files = fs.existsSync(snaps) ? fs.readdirSync(snaps).filter(f => f.endsWith('.json')).sort().slice(-4).map(f => path.join(snaps, f)) : [];
  return [path.join(dir, 'latest.json'), ...files].filter(f => fs.existsSync(f)).map(f => {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return { label: 'hunter', weights: j.pi || j };
  });
});
const HUNT    = args.hunt ? (j => j.pi || j)(JSON.parse(fs.readFileSync(path.resolve(ROOT, args.hunt), 'utf8'))) : null;
const SNAPS   = path.join(DIR, 'snapshots');

const CFG = {
  gamma: 0.99, lambda: 0.95, clip: 0.2, epochs: 4, mb: 2048,
  entCoef: 0.01, maxGrad: 0.5, targetKl: 0.03, lr: 3e-4,
  hidden: [128, 128],
  noveltyStart: 0.15, noveltyIters: 150,
};
const STAGES = ['idle', 'easy', 'medium', 'hard', 'expert', 'league'];
const RECYCLE = 150;
const PROMOTE_WIN = 0.7, PROMOTE_MIN_EPS = 60, WINDOW = 100;

const log = (...a) => console.log('[brain]', ...a);
// Every Chrome this process launched. A crash that skips browser.close() used to
// leave workers running a full core each for hours, so they are killed on exit.
const LIVE_BROWSERS = new Set();
process.on('SIGTERM', () => process.exit(143));
process.on('exit', () => { for (const b of LIVE_BROWSERS) { try { b.process().kill('SIGKILL'); } catch (e) {} } });
// A Chrome whose frame detached can ignore close() (or never answer it), and the
// stragglers piled up generation after generation until load hit ~270 (run 4).
// Ask politely for 5 s, then kill the process regardless.
async function killBrowser(b) {
  if (!b) return;
  try { await Promise.race([b.close(), new Promise(r => setTimeout(r, 5000))]); } catch (e) {}
  try { const pr = b.process(); if (pr && pr.exitCode === null) pr.kill('SIGKILL'); } catch (e) {}
  LIVE_BROWSERS.delete(b);
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

function startServer() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    s.on('error', e => { console.error(`[brain] cannot listen on :${PORT} — ${e.code}`); process.exit(1); });
    s.listen(PORT, () => resolve(s));
  });
}

async function launchWorker(puppeteer, id) {
  const opts = { headless: 'new', handleSIGINT: false, handleSIGTERM: false, args: ['--no-sandbox', '--disable-gpu', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] };
  const sysChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(sysChrome)) opts.executablePath = sysChrome;
  const browser = await puppeteer.launch(opts);
  LIVE_BROWSERS.add(browser);
  // No 'disconnected' -> delete: a dropped connection does not mean the process exited.
  try { return await setupWorker(browser, id); }
  catch (e) { await killBrowser(browser); throw e; }
}

async function setupWorker(browser, id) {
  const page = await browser.newPage();
  const errors = [];
  const NOISE = /onrender\.com|crazygames|supabase|live-config|\/api\/|ERR_FAILED|Failed to load resource|404|CORS|ERR_CONNECTION/i;
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(m.text()); });
  // Only the local game: a CDN that stops answering (cdnjs hung for 17 min on Oct 4)
  // holds the load event forever and every worker times out. GSAP is optional in-game.
  await page.setRequestInterception(true);
  page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 90000 });
  await new Promise(r => setTimeout(r, 2500));
  const ok = await page.evaluate(() => {
    try {
      if (typeof _story2 !== 'undefined' && _story2) {
        _story2.defeated = [...new Set([...(Array.isArray(_story2.defeated) ? _story2.defeated : []), 0])];
        _story2.prologueSeen = true;
      }
      if (typeof storyModeActive !== 'undefined') storyModeActive = false;
      if (typeof activeCinematic !== 'undefined') activeCinematic = null;
    } catch (e) {}
    ['prologueOverlay', 'storyPrologueOverlay', 'storyPathPanel', 'storyModal', 'storyIntroOverlay', 'storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
    return typeof Brain !== 'undefined' && typeof SMK2Trainer !== 'undefined';
  });
  await page.addScriptTag({ path: path.join(ROOT, 'tools', 'human-proxy.js') });
  if (!ok) throw new Error(`worker ${id}: Brain or SMK2Trainer missing on page`);
  const meta = await page.evaluate(() => ({ OBS_DIM: Brain.OBS_DIM, HEADS: Brain.HEADS, STAT_KEYS: Brain.STAT_KEYS }));
  return { id, browser, page, errors, meta };
}

const f32 = s => { const b = Buffer.from(s, 'base64'); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };

function loadJSON(p, d) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } }
function saveJSON(p, v) { const t = p + '.tmp'; fs.writeFileSync(t, JSON.stringify(v)); fs.renameSync(t, p); }

// Fixed playstyles built on the human proxy. Each wants a different answer —
// break or bait the turtle, guard and punish the rusher, close on the zoner,
// anti-air the jumper, stop whiffing into the counter-puncher — so the only
// way to beat all of them is to read which one is in front of it.
const HUMAN = Object.assign(loadJSON(path.join(ROOT, 'tools', 'human-proxy-params-v4.json'), {}), { hpMult: undefined });
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
function styleSpec(name, brainKit) {
  if (name === 'switcher') {
    return { type: 'style', label: 'switcher', brainKit, every: 900, kit: 'random', hpMult: 1.5,
             styles: ['turtle', 'rushdown', 'aerial', 'counter'].map(k => STYLES[k]) };
  }
  // Extra health so a match lasts long enough for reading it to pay off.
  return { type: 'style', label: name, brainKit, params: STYLES[name], hpMult: name === 'zoner' ? 2 : 1.5,
           kit: name === 'zoner' ? { w: 'ranged', c: 'none' } : (Math.random() < 0.5 ? 'random' : undefined) };
}
const STYLE_NAMES = [...Object.keys(STYLES), 'switcher'];

// Opponent list for one worker's iteration. Mostly the current rung, with some
// earlier rungs mixed back in so it does not forget how to beat them.
function pickOpponents(state, pool, count) {
  const stage = STAGES[state.stage];
  const out = [];
  // The brain always holds a random kit WITH a class: until iteration ~1960 it
  // had one in only ~40% of matches, so class passives and every domain were
  // mostly out of reach (0 domains in 49M decisions).
  const brainKit = 'randomClass';
  if (HUNT) return Array.from({ length: count }, () => ({ type: 'self', label: 'target', greedy: true, brainKit, kit: 'randomClass' }));
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    if (state.stage > 0 && r < 0.2) { out.push({ type: STAGES[Math.floor(Math.random() * Math.min(state.stage, 5))], brainKit }); continue; }
    if (stage !== 'league') { out.push({ type: stage, brainKit }); continue; }
    const q = Math.random();
    // Half the league's opponents carry random kits, the rest a plain sword.
    const kit = Math.random() < 0.5 ? 'random' : undefined;
    if (q < 0.05 || !pool.length) out.push({ type: 'expert', brainKit, kit });
    else if (q < 0.25) out.push({ type: 'sovereign', brainKit, kit });
    // Guard drill: a Sovereign that swings far more often. Against him trading and
    // walking away stop working and the shield is the answer. The speed is random
    // per match so "this one is fast" is a blurry cue — the hope is it keys the
    // guard on the incoming swing, which every opponent shows, not on the opponent.
    else if (q < 0.45) out.push({ type: 'sovereign', label: 'sov fast', speed: 0.4 + Math.random() * 0.4, brainKit, kit });
    // A Summoner: the familiar is a second body it has to track in the crowd slots.
    else if (q < 0.5) out.push({ type: 'expert', label: 'summoner', brainKit, kit: { w: 'random', c: 'summoner' } });
    // Outnumbered: weaker bots, more of them.
    else if (q < 0.58) out.push(Math.random() < 0.5
      ? { type: 'expert', count: 2, label: 'expert x2', brainKit, kit }
      : { type: 'hard', count: 3, label: 'hard x3', brainKit, kit });
    else if (q < 0.8) out.push(styleSpec(STYLE_NAMES[Math.floor(Math.random() * STYLE_NAMES.length)], brainKit));
    else { const s = pool[Math.floor(Math.random() * pool.length)]; out.push({ type: 'self', snap: s.iter, weights: s.weights, brainKit, kit }); }
  }
  return out;
}
// HUNTER_SHARE of the league swapped for hunter nets.
function withHunters(opps) {
  if (!HUNTERS.length || HUNT) return opps;
  return opps.map(o => Math.random() < HUNTER_SHARE
    ? { type: 'self', label: 'hunter', weights: HUNTERS[Math.floor(Math.random() * HUNTERS.length)].weights,
        brainKit: 'randomClass', kit: 'randomClass' }
    : o);
}

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }
  fs.mkdirSync(SNAPS, { recursive: true });

  const server = await startServer();
  log(`server :${PORT}, launching ${WORKERS} workers`);
  const workers = await Promise.all(Array.from({ length: WORKERS }, (_, i) => launchWorker(puppeteer, i)));
  const { OBS_DIM, HEADS, STAT_KEYS } = workers[0].meta;
  const A = HEADS.reduce((a, b) => a + b, 0), H = HEADS.length;

  // ── Nets + state (resume unless --fresh) ─────────────────────────────────
  const ckptPath = path.join(DIR, 'latest.json'), statePath = path.join(DIR, 'state.json');
  let pi, vf, state;
  const ck = !args.fresh && loadJSON(ckptPath, null);
  // The observation only ever grows at its END, so an older checkpoint is widened
  // with zero weights on the new inputs: it plays exactly as before until the
  // update teaches it what they mean.
  const widen = net => {
    const old = net.sizes[0];
    if (old === OBS_DIM) return net;
    const nOut = net.sizes[1], W = new Float32Array(nOut * OBS_DIM);
    for (let o = 0; o < nOut; o++) W.set(net.W[0].subarray(o * old, o * old + old), o * OBS_DIM);
    net.W[0] = W; net.gW[0] = new Float32Array(W.length); net.sizes = [OBS_DIM, ...net.sizes.slice(1)];
    log(`widened input layer ${old} -> ${OBS_DIM}`);
    return net;
  };
  if (ck && ck.pi.sizes[0] <= OBS_DIM) {
    pi = widen(MLP.fromJSON(ck.pi)); vf = widen(MLP.fromJSON(ck.vf));
    state = loadJSON(statePath, null);
    log(`resumed at iteration ${state.iter}, stage ${STAGES[state.stage]}`);
  } else {
    pi = new MLP([OBS_DIM, ...CFG.hidden, A], 0.01);
    vf = new MLP([OBS_DIM, ...CFG.hidden, 1], 1);
    state = { iter: 0, stage: 0, frames: 0, decisions: 0, hoursTrained: 0, recent: [], stageLog: [{ iter: 0, stage: 'idle', at: new Date().toISOString() }], pool: [] };
    const logp = path.join(DIR, 'log.jsonl');
    if (fs.existsSync(logp)) fs.renameSync(logp, logp.replace('.jsonl', `-${Date.now()}.jsonl`));
    log('fresh start: random network');
  }
  const gpool = new GradPool(THREADS, pi, vf, Object.assign({ HEADS }, CFG));
  const piOpt = new Adam(pi, CFG.lr), vfOpt = new Adam(vf, CFG.lr);
  const pool = (state.pool || []).map(p => ({ iter: p.iter, weights: loadJSON(path.join(SNAPS, p.file), null) })).filter(p => p.weights);

  const t0 = Date.now();
  let stop = false;
  process.on('SIGINT', () => { log('SIGINT: finishing this iteration then saving'); stop = true; });

  while (!stop && state.iter < MAX_IT && (Date.now() - t0) < HOURS * 3600e3) {
    const it0 = Date.now();
    const novelty = Math.max(0, CFG.noveltyStart * (1 - state.iter / CFG.noveltyIters));
    const weights = pi.toJSON();

    // ── Rollouts ──
    // A worker whose Chrome dies is relaunched and sits out this iteration;
    // every worker is also recycled periodically so page memory cannot creep.
    const results = (await Promise.all(workers.map(async (w, i) => {
      try {
        if (state.iter > 0 && state.iter % RECYCLE === i % RECYCLE) throw new Error('recycle');
        return await w.page.evaluate(o => Brain.rollout(o),
          { weights, steps: STEPS, novelty, maxFrames: 7200, opponents: withHunters(pickOpponents(state, pool, 40)), hunt: HUNT });
      } catch (e) {
        if (e.message !== 'recycle') log(`worker ${w.id} failed (${e.message.slice(0, 80)}); relaunching`);
        await killBrowser(w.browser);
        for (let tries = 0; tries < 3; tries++) {
          try { workers[i] = await launchWorker(puppeteer, w.id); break; }
          catch (e2) { log(`worker ${w.id} relaunch failed: ${e2.message.slice(0, 80)}`); }
        }
        return null;
      }
    }))).filter(Boolean);
    if (!results.length) { log('no worker returned data this iteration'); continue; }
    const tRoll = Date.now() - it0;

    // ── Assemble batch ──
    let N = 0; for (const r of results) N += r.n;
    const obs = new Float32Array(N * OBS_DIM), acts = new Int32Array(N * H);
    const logps = new Float32Array(N), rews = new Float32Array(N), dones = new Float32Array(N);
    const episodes = [];
    let off = 0;
    const tot = Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
    for (const r of results) {
      obs.set(f32(r.obs), off * OBS_DIM);
      const a = f32(r.acts); for (let i = 0; i < a.length; i++) acts[off * H + i] = a[i];
      logps.set(f32(r.logps), off); rews.set(f32(r.rews), off); dones.set(f32(r.dones), off);
      for (const e of r.episodes) episodes.push(Object.assign({}, e, { start: e.start + off }));
      for (const k of STAT_KEYS) tot[k] += r.total[k] || 0;
      off += r.n;
    }

    // ── Values + GAE ──
    const V = vf.forward(obs, N).slice();
    const adv = new Float32Array(N), ret = new Float32Array(N);
    for (const e of episodes) {
      let next = 0;
      if (e.trunc && e.finalObs) next = vf.forward(f32(e.finalObs), 1)[0];
      let gae = 0;
      for (let t = e.start + e.len - 1; t >= e.start; t--) {
        const delta = rews[t] + CFG.gamma * next - V[t];
        gae = delta + CFG.gamma * CFG.lambda * gae;
        adv[t] = gae; ret[t] = gae + V[t];
        next = V[t];
      }
    }
    let mu = 0, sd = 0;
    for (let i = 0; i < N; i++) mu += adv[i]; mu /= N;
    for (let i = 0; i < N; i++) sd += (adv[i] - mu) ** 2; sd = Math.sqrt(sd / N) + 1e-8;
    const nadv = new Float32Array(N); for (let i = 0; i < N; i++) nadv[i] = (adv[i] - mu) / sd;

    // ── Update ──
    const tu = Date.now();
    gpool.setBatch({ obs, acts, logps, adv: nadv, ret, N, D: OBS_DIM });
    const u = { pl: 0, vl: 0, ent: 0, kl: 0, clipFrac: 0, epochs: 0 };
    const idx = new Int32Array(N); for (let i = 0; i < N; i++) idx[i] = i;
    for (let ep = 0; ep < CFG.epochs; ep++) {
      for (let i = N - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      const s = { pl: 0, vl: 0, ent: 0, kl: 0, clip: 0, n: 0 };
      for (let a = 0; a + CFG.mb <= N; a += CFG.mb) {
        const g = await gpool.grads(idx, a, CFG.mb);
        piOpt.step(1, CFG.maxGrad); vfOpt.step(1, CFG.maxGrad);
        for (const k in s) s[k] += g[k];
      }
      const n = Math.max(1, s.n);
      Object.assign(u, { pl: s.pl / n, vl: s.vl / n, ent: s.ent / n, kl: s.kl / n, clipFrac: s.clip / n, epochs: ep + 1 });
      if (u.kl > CFG.targetKl * 1.5) break;
    }
    const tUpd = Date.now() - tu;

    // ── Bookkeeping ──
    state.iter++;
    state.decisions += N;
    state.frames += tot.frames;
    const stageName = STAGES[state.stage];
    for (const e of episodes) state.recent.push({ opp: e.opp, win: e.win, it: state.iter });
    state.recent = state.recent.slice(-2000);
    const cur = state.recent.filter(e => e.opp === (HUNT ? 'target' : stageName === 'league' ? 'sovereign' : stageName)).slice(-WINDOW);
    const curWin = cur.length ? cur.reduce((a, e) => a + e.win, 0) / cur.length : 0;
    const byOpp = {};
    // de/te: damage dealt/taken in the first 10 s; dt/tt: whole match. Late
    // trading better than early is what adaptation looks like from outside.
    for (const e of episodes) {
      const b = byOpp[e.opp] || (byOpp[e.opp] = { n: 0, w: 0, k: 0, d: 0, de: 0, te: 0, dt: 0, tt: 0, fr: 0,
                                                    bk: 0, ht: 0, sT: 0, sC: 0, tF: 0, cF: 0 });
      b.n++; b.w += e.win; b.k += e.oLost; b.d += e.bLost;
      b.de += e.stats.dmgDealtEarly || 0; b.te += e.stats.dmgTakenEarly || 0;
      b.dt += e.stats.dmgDealt; b.tt += e.stats.dmgTaken; b.fr += e.frames;
      // Guard per opponent, so the drill's transfer shows: does it block (bk/ht) and
      // time its raises (sT/tF vs sC/cF) against opponents that are NOT fast?
      b.bk += e.stats.blocks || 0; b.ht += e.stats.hitsTaken || 0;
      b.sT += e.stats.shieldThreat || 0; b.sC += e.stats.shieldCalm || 0;
      b.tF += e.stats.threatFrames || 0; b.cF += e.stats.calmFrames || 0;
    }
    let meanR = 0; for (let i = 0; i < N; i++) meanR += rews[i];
    const entry = { iter: state.iter, t: new Date().toISOString(), stage: stageName, N, frames: tot.frames,
      eps: episodes.length, meanRewardPerEp: meanR / Math.max(1, episodes.length), novelty,
      byOpp, curWin, stats: tot, upd: u, tRoll, tUpd };
    fs.appendFileSync(path.join(DIR, 'log.jsonl'), JSON.stringify(entry) + '\n');

    if (stageName !== 'league' && cur.length >= PROMOTE_MIN_EPS && curWin >= PROMOTE_WIN) {
      state.stage++;
      state.recent = [];
      state.stageLog.push({ iter: state.iter, stage: STAGES[state.stage], at: new Date().toISOString() });
      log(`*** PROMOTED to ${STAGES[state.stage]} at iteration ${state.iter} (won ${(curWin * 100).toFixed(0)}% vs ${stageName})`);
    }
    if (state.iter % 25 === 0) {
      const file = `iter-${String(state.iter).padStart(5, '0')}.json`;
      saveJSON(path.join(SNAPS, file), weights);
      state.pool = (state.pool || []).concat({ iter: state.iter, file }).slice(-20);
      pool.push({ iter: state.iter, weights }); while (pool.length > 20) pool.shift();
    }
    state.hoursTrained = (state.hoursTrained || 0) + (Date.now() - it0) / 3600e3;
    saveJSON(ckptPath, { pi: pi.toJSON(), vf: vf.toJSON(), iter: state.iter });
    saveJSON(statePath, state);

    const perMin = k => (tot[k] / Math.max(1, tot.frames) * 3600).toFixed(1);
    const opps = Object.entries(byOpp).map(([k, b]) => `${k} ${b.w}/${b.n}`).join(' ');
    log(`it ${state.iter} [${stageName} ${(curWin * 100).toFixed(0)}%] R/ep ${entry.meanRewardPerEp.toFixed(2)} ent ${u.ent.toFixed(2)} kl ${u.kl.toFixed(3)} | ` +
        `hit/swing ${(tot.swingHits / Math.max(1, tot.swings) * 100).toFixed(0)}% dj/min ${perMin('doubleJumps')} blk/min ${perMin('blocks')} abiHit ${tot.abilityHits} supHit ${tot.superHits} | ${opps} | roll ${(tRoll / 1000).toFixed(1)}s upd ${(tUpd / 1000).toFixed(1)}s`);
    for (const w of workers) if (w.errors.length) { log(`worker ${w.id} page errors:`, w.errors.slice(0, 3)); w.errors.length = 0; }
  }

  log(`stopped at iteration ${state.iter}; saved to ${path.relative(ROOT, DIR)}/`);
  gpool.close();
  await Promise.all(workers.map(w => killBrowser(w.browser)));
  server.close();
  process.exit(0);
})().catch(e => { console.error('[brain] FATAL', e); process.exit(1); });
