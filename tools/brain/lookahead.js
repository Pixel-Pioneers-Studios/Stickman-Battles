'use strict';
/*
 * tools/brain/lookahead.js: Sovereign lookahead ceiling test. DEV ONLY, nothing here ships.
 *
 * Question: if Sovereign could see the future (fork the real game, play each candidate move forward, judge the
 * result with its value net), how much would it win? This uses the REAL sim as the simulator and the opponent's
 * REAL net as the opponent model, so it is a ceiling: a cheaper approximate simulator can only do worse.
 *
 * Search, at each decision while engaged: the policy's top K joint actions; for each, fork the game, hold that
 * action for one decision, then both sides play their nets for H decisions; score = damage exchange (/40, KO +-2)
 * + 0.99^n * V(end) from the checkpoint's value net. Pick the best; restore; play it for real.
 *
 * Fork = snapshot every object reachable from the fighters, projectiles, MoveScene, the input keys and the
 * rollout tracker, and restore them in place (identity kept). --fidelity checks that two forks from one state
 * with one RNG seed end identical; if they don't, something outside the snapshot leaks.
 *
 * Usage: node tools/brain/lookahead.js --fidelity [--eps=3]
 *        node tools/brain/lookahead.js [--net=data/brain/sovereign-20011-cand.json] [--opp=same] [--eps=40]
 *             [--seed=1] [--lives=3] [--K=6] [--H=8] [--every=2] [--range=320] [--arms=base,search] [--port=8171]
 *             [--json=out.json]
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8171;
const EPS = parseInt(args.eps, 10) || 40, SEED = parseInt(args.seed, 10) || 1, LIVES = parseInt(args.lives, 10) || 3;
const CFG = { record: !!args.record, oppSample: !!args.oppSample, dumpAt: parseInt(args.dumpAt, 10) || 0, deepcheck: !!args.deepcheck, globcheck: args.globcheck ? (parseInt(args.globcheck, 10) || 40) : 0, trace: !!args.trace, K: parseInt(args.K, 10) || 6, H: parseInt(args.H, 10) || 8, every: parseInt(args.every, 10) || 2, range: +args.range || 320 };
const NETP = String(args.net || 'data/brain/sovereign-20011-cand.json'), OPPP = String(args.opp || NETP);
const load = p => JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8'));
const NET = load(NETP), OPP = load(OPPP);
// --model: the net search uses to PREDICT the opponent (default: the opponent's real net, a perfect model).
// --oppSample: the opponent samples its moves instead of always playing its top choice (a noisier, more human foe).
const MODELP = args.model ? String(args.model) : null, MODEL = MODELP ? load(MODELP) : null;

// ---- page side -----------------------------------------------------------------------------------------------
function pageSetup() {
  const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // Static data a fork never needs to copy (weapon/class/move tables, the arena).
  const STATIC = new Set();
  const markStatic = root => { const st = [root]; while (st.length) { const o = st.pop();
    if (!o || typeof o !== 'object' || STATIC.has(o)) continue; STATIC.add(o);
    if (ArrayBuffer.isView(o)) continue;
    for (const k of Object.keys(o)) { const v = o[k]; if (v && typeof v === 'object') st.push(v); } } };
  const SKIP_KEYS = new Set(['_brainNet', '_brainNets', 'controls', '_whipT0']);
  const skippable = o => (typeof Node !== 'undefined' && o instanceof Node) || (typeof CanvasRenderingContext2D !== 'undefined' && o instanceof CanvasRenderingContext2D)
    || (typeof AudioNode !== 'undefined' && o instanceof AudioNode) || (typeof BaseAudioContext !== 'undefined' && o instanceof BaseAudioContext)
    || (typeof DOMMatrix !== 'undefined' && o instanceof DOMMatrix) || o instanceof Promise || (o.sizes && o.W && o.b);
  // Globals a sim frame writes outside the fighters (found with --leak --globcheck). Each binding is saved and
  // re-bound on restore, and an object value's contents are restored in place too.
  const BIND = ['projectiles', 'minions', 'frameCount', 'aiTick', 'hitStopFrames', 'slowMotion', 'hitSlowTimer', 'screenShake',
    '_wxStepFrame', '_combatTimers', 'director', '_hitFx', '_wrPending', '_wrMotes', 'damageTexts', 'particles', 'surfaceScars',
    'cinSpeedLines', '_achStats', 'hitVignetteTimer', 'hitVignetteColor', 'camHitZoomTimer', 'abilityFlashPlayer', 'abilityFlashTimer',
    '_hitFromSuper', '_moveTierOverride', 'bloodStains', '_wxBlasts', '_wxFx', '_wxInHit', '_particlePool', '_wrWaves', '_wrRings',
    '_wrLights', '_wrScuffs', '_netInboundHit',
    // Visual only, but they draw on the shared Math.random stream, so a leftover chunk shifts every later roll.
    'debrisChunks', '_fracPtcl', 'camDramaState', 'camDramaTimer', 'camDramaTarget', 'camDramaZoom'];
  const getters = [], setters = [];
  for (const n of BIND) {
    let g = null, s = null;
    try { g = new Function('return typeof ' + n + ' === "undefined" ? undefined : ' + n); g(); } catch (e) { g = null; }
    try { s = new Function('v', n + ' = v'); } catch (e) { s = null; }
    getters.push(g); setters.push(s);
  }
  function snap(roots) {
    const gv = getters.map(g => g ? g() : undefined);
    roots = roots.concat(gv.filter(v => v && typeof v === 'object'));
    const recs = [], seen = new Set(), stack = roots.slice();
    while (stack.length) {
      const o = stack.pop();
      if (!o || typeof o !== 'object' || seen.has(o) || STATIC.has(o)) continue;
      seen.add(o);
      if (skippable(o)) continue;
      if (ArrayBuffer.isView(o)) { if (o.length <= 4096) recs.push([o, 2, o.slice()]); continue; }
      if (o instanceof Set) { const v = [...o]; recs.push([o, 3, v]); for (const x of v) stack.push(x); continue; }
      if (o instanceof Map) { const v = [...o]; recs.push([o, 4, v]); for (const [k, x] of v) { stack.push(k); stack.push(x); } continue; }
      if (Array.isArray(o)) { const v = o.slice(); recs.push([o, 1, v]); for (const x of v) stack.push(x); continue; }
      const keys = Object.keys(o), vals = new Array(keys.length);
      for (let i = 0; i < keys.length; i++) { const v = o[keys[i]]; vals[i] = v; if (v && typeof v === 'object' && !SKIP_KEYS.has(keys[i])) stack.push(v); }
      recs.push([o, 0, keys, vals]);
    }
    return { recs, gv };
  }
  function restore(S) {
    for (const r of S.recs) {
      const o = r[0];
      switch (r[1]) {
        case 0: { const keys = r[2], vals = r[3];
          for (const k of Object.keys(o)) delete o[k];
          for (let i = 0; i < keys.length; i++) o[keys[i]] = vals[i]; break; }
        case 1: o.length = 0; for (const x of r[2]) o.push(x); break;
        case 2: o.set(r[2]); break;
        case 3: o.clear(); for (const x of r[2]) o.add(x); break;
        case 4: o.clear(); for (const [k, x] of r[2]) o.set(k, x); break;
      }
    }
    for (let i = 0; i < setters.length; i++) if (setters[i] && getters[i]) { try { setters[i](S.gv[i]); } catch (e) {} }
  }
  const rootsOf = c => [c.brain, ...c.opps, typeof projectiles !== 'undefined' ? projectiles : null, typeof minions !== 'undefined' ? minions : null,
    typeof MoveScene !== 'undefined' ? MoveScene : null, keysDown, keyHeldFrames, c.T, c.act, c.prevAct, c.mem, ...c.oppIO];
  const fingerprint = c => [c.brain, ...c.opps].map(f => [f.x, f.y, f.vx, f.vy, f.health, f.lives, f.attackTimer || 0, f.stunTimer || 0,
    f.attackEndlag || 0, f.cooldown || 0, f.abilityCooldown || 0, f.superMeter || 0, f.shielding ? 1 : 0, f.facing].map(v => Math.round(v * 1000) / 1000).join(','))
    .join(' | ') + ' | proj ' + (typeof projectiles !== 'undefined' ? projectiles.length : 0);

  // One fork: hold act0 for one decision, then both nets play for H-1 more. Returns the score from Sovereign's side.
  function playFork(c, act0, H, seed, vf, vh, model) {
    const rnd = Math.random; Math.random = seeded(seed);
    const OBS = Brain.OBS_DIM, R = Brain.REPEAT;
    const bm = c.mem ? c.mem.slice() : null;
    const io = c.oppIO.map((x, q) => x && { act: x.act.slice(), prev: x.prev.slice(), obs: new Float32Array(OBS),
      h: model && q === 0 ? (model.h ? model.h.slice() : null) : (x.h ? x.h.slice() : null) });
    const bPrev = c.prevAct.slice(), a = act0.slice(), obs = new Float32Array(OBS);
    let fr = c.frame, r = 0, pb = c.brain.health, ko = false, dec = 0;
    const po = c.opps.map(f => f.health);
    try {
      outer: for (dec = 0; dec < H; dec++) {
        if (dec > 0 && !LA.holdMe) { Brain.observe(c.brain, c.main, bPrev, obs, c.T.obj); Brain.sample(Brain.forward(c.net, obs, bm), a, true); }
        Brain.applyKeys(c.brain, a);
        c.opps.forEach((f, q) => {
          const x = io[q]; if (!x || !c.alive(f)) return;
          if (dec > 0 && LA.holdOpp) { Brain.applyKeys(f, x.act); return; }
          Brain.observe(f, c.brain, x.prev, x.obs);
          Brain.sample(Brain.forward(model && q === 0 ? model.net : f._brainNet, x.obs, x.h), x.act, true);
          Brain.applyKeys(f, x.act);
          for (let k = 0; k < 4; k++) x.prev[k] = x.act[k];
        });
        for (let k = 0; k < 4; k++) bPrev[k] = a[k];
        for (let s = 0; s < R; s++) {
          c.simFrame(fr); fr++;
          if (c.brain.health < pb) r -= (pb - c.brain.health) / 40;
          pb = c.brain.health;
          c.opps.forEach((f, q) => { if (f.health < po[q]) r += (po[q] - f.health) / 40; po[q] = f.health; });
          if (c.brain.health <= 0) { r -= 2; ko = true; break outer; }
          if (c.opps.some(f => c.alive(f) && f.health <= 0)) { r += 2; ko = true; break outer; }
        }
      }
      if (!ko && vf) {
        Brain.observe(c.brain, c.main, bPrev, obs, c.T.obj);
        r += Math.pow(0.99, dec) * Brain.forward(vf, obs, vh ? vh.slice() : null)[0];
      }
    } finally { Math.random = rnd; }
    return r;
  }

  // Top K joint actions by policy probability (the greedy one first).
  function topK(logits, K) {
    const H = Brain.HEADS, lp = []; let off = 0;
    for (const n of H) {
      let mx = -Infinity; for (let k = 0; k < n; k++) mx = Math.max(mx, logits[off + k]);
      let z = 0; for (let k = 0; k < n; k++) z += Math.exp(logits[off + k] - mx);
      const row = []; for (let k = 0; k < n; k++) row.push(logits[off + k] - mx - Math.log(z));
      lp.push(row); off += n;
    }
    const all = [];
    for (let a = 0; a < H[0]; a++) for (let b = 0; b < H[1]; b++) for (let s = 0; s < H[2]; s++) for (let d = 0; d < H[3]; d++)
      all.push({ act: [a, b, s, d], lp: lp[0][a] + lp[1][b] + lp[2][s] + lp[3][d] });
    all.sort((x, y) => y.lp - x.lp);
    return all.slice(0, K);
  }

  // Every declared top-level global, hashed shallowly (leak hunting: compare before forks vs after restore).
  const GL = window._laGlobals || [];
  function shallow(v) {
    if (v === null || typeof v !== 'object') return typeof v === 'function' ? 'fn' : String(v);
    if (v instanceof Set || v instanceof Map) return v.constructor.name + v.size;
    if (ArrayBuffer.isView(v)) return 'ta' + v.length;
    let h = '';
    try { for (const k of Object.keys(v).slice(0, 60)) { const x = v[k]; h += k + ':' + (x === null || typeof x !== 'object' ? (typeof x === 'function' ? 'fn' : String(x)) : (Array.isArray(x) ? 'a' + x.length : 'o')) + ','; } } catch (e) {}
    return (Array.isArray(v) ? 'A' + v.length : 'O') + h;
  }
  function globState() { const o = {}; for (const n of GL) { try { o[n] = shallow((0, eval)(n)); } catch (e) {} } return o; }
  // Path -> primitive for everything reachable (static tables and skipped keys included), to find what a fork
  // changes that restore doesn't put back.
  function deepMap(roots) {
    const out = new Map(), seen = new Set();
    const st = roots.map(([name, o]) => [name, o, 0]);
    while (st.length && out.size < 400000) {
      const [p, o, d] = st.pop();
      if (o === null || typeof o !== 'object') { out.set(p, typeof o === 'function' ? 'fn' : String(o)); continue; }
      if (seen.has(o) || d > 7) continue; seen.add(o);
      if (skippable(o)) continue;
      if (ArrayBuffer.isView(o)) { if (o.length <= 4096) out.set(p, Array.prototype.join.call(o, ',')); continue; }
      if (o instanceof Set) { out.set(p + '#size', String(o.size)); continue; }
      if (o instanceof Map) { out.set(p + '#size', String(o.size)); let i = 0; for (const [k, v] of o) st.push([p + '.get(' + (i++) + ')', v, d + 1]); continue; }
      for (const k of Object.getOwnPropertyNames(o)) { let v; try { v = o[k]; } catch (e) { continue; } st.push([p + '.' + k, v, d + 1]); }
    }
    return out;
  }
  // Search on tools/brain/approxsim.js instead of real-game forks. The nets still pick the follow-up moves and
  // judge the end: they read stand-ins (Object.create(fighter) + the simulated fields + a private _bHist copy).
  const SIMF = (sf, p) => { p.x = sf.x; p.y = sf.y; p.vx = sf.vx; p.vy = sf.vy; p.onGround = sf.g; p.canDoubleJump = sf.dj; p.facing = sf.facing;
    p.health = sf.hp; p.attackTimer = sf.atk; p.cooldown = sf.cd; p.attackEndlag = sf.endlag; p.stunTimer = sf.stun; p.shielding = sf.sh; };
  const copyHist = H => H ? { f: H.f, n: H.n, num: Float64Array.from(H.num), den: Float64Array.from(H.den), p: H.p ? Object.assign({}, H.p) : null, pend: H.pend } : undefined;
  function stand(f) { const p = Object.create(f); p._bHist = copyHist(f._bHist); return p; }
  const platsOf = () => currentArena.platforms.map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, oneWay: !!p.passUnder, off: !!p.isFloorDisabled }));
  function approxFork(c, W0, act0, H, vf, vh, model) {
    const W = ApproxSim.forkWorld(W0), OBS = Brain.OBS_DIM, R = Brain.REPEAT;
    const pb = stand(c.brain), po = stand(c.main);
    const bm = c.mem ? c.mem.slice() : null;
    const x = c.oppIO[0];
    const oh = model ? (model.h ? model.h.slice() : null) : (x && x.h ? x.h.slice() : null), onet = model ? model.net : c.main._brainNet;
    const bPrev = c.prevAct.slice(), oPrev = x ? x.prev.slice() : [1, 0, 0, 0], a = act0.slice(), b = [1, 0, 0, 0];
    const obs = new Float32Array(OBS), obs2 = new Float32Array(OBS);
    let r = 0, dec = 0, ko = false;
    // The crowd features list hostiles from players[] and drop the opponent by identity: show them the stand-ins.
    const realPlayers = players.slice(); players.length = 0; players.push(pb, po);
    // Projectile features read the global list and compare owners by identity: show the model's own shots.
    const realProj = projectiles;
    const showProj = () => { projectiles = W.p.map(q => ({ x: q.x, y: q.y, vx: q.vx, vy: q.vy, active: true, owner: q.own === W.a ? pb : po })); };
    showProj();
    try {
    for (dec = 0; dec < H; dec++) {
      if (dec > 0 && !LA.holdMe) { Brain.observe(pb, po, bPrev, obs, c.T.obj); Brain.sample(Brain.forward(c.net, obs, bm), a, true); }
      if (onet && !(dec > 0 && LA.holdOpp)) { Brain.observe(po, pb, oPrev, obs2); Brain.sample(Brain.forward(onet, obs2, oh), b, true); }
      const ha = W.a.hp, hb = W.b.hp;
      ApproxSim.stepDecision(W, a, b, R);
      SIMF(W.a, pb); SIMF(W.b, po); showProj();
      r += (hb - W.b.hp) / 40 - (ha - W.a.hp) / 40;
      for (let k = 0; k < 4; k++) { bPrev[k] = a[k]; oPrev[k] = b[k]; }
      if (W.a.hp <= 0) { r -= 2; ko = true; break; }
      if (W.b.hp <= 0) { r += 2; ko = true; break; }
    }
    if (!ko && vf) { Brain.observe(pb, po, bPrev, obs, c.T.obj); r += Math.pow(0.99, dec) * Brain.forward(vf, obs, vh ? vh.slice() : null)[0]; }
    } finally { players.length = 0; for (const f of realPlayers) players.push(f); projectiles = realProj; }
    return r;
  }
  function approxRoot(c) {
    const W = ApproxSim.world(c.brain, c.main, platsOf(), (typeof projectiles !== 'undefined' ? projectiles : []).filter(q => q.active !== false)
      .map(q => ({ x: q.x, y: q.y, vx: q.vx, vy: q.vy, dmg: q.damage, own: q.owner === c.brain ? 0 : 1 })));
    W.a.prevJump = c.prevAct[1]; W.a.prevShield = c.prevAct[2]; W.a.prevBtn = c.prevAct[3];
    const x = c.oppIO[0]; if (x) { W.b.prevJump = x.prev[1]; W.b.prevShield = x.prev[2]; W.b.prevBtn = x.prev[3]; }
    return W;
  }
  // Root check: stand-ins with nothing simulated must observe exactly what the real fighters do.
  function standDiff(c) {
    const pb = stand(c.brain), po = stand(c.main), o = new Float32Array(Brain.OBS_DIM);
    const W = approxRoot(c); SIMF(W.a, pb); SIMF(W.b, po);
    const realPlayers = players.slice(), realProj = projectiles; players.length = 0; players.push(pb, po);
    projectiles = W.p.map(q => ({ x: q.x, y: q.y, vx: q.vx, vy: q.vy, active: true, owner: q.own === W.a ? pb : po }));
    try { Brain.observe(pb, po, c.prevAct, o, c.T.obj); } finally { players.length = 0; for (const f of realPlayers) players.push(f); projectiles = realProj; }
    let mx = 0, at = -1; for (let i = 0; i < o.length; i++) { const d = Math.abs(o[i] - c.obs[i]); if (d > mx) { mx = d; at = i; } }
    return [mx, at];
  }
  window.LA = { standDiff, approxFork, approxRoot, deepMap, globState, seeded, snap, restore, rootsOf, fingerprint, playFork, topK, markStatic, STATIC };
}

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    fs.createReadStream(fp).pipe(r);
  }).listen(PORT);
  const launch = () => puppeteer.launch({ headless: 'new', dumpio: !!args.dumpio, args: ['--no-sandbox', '--mute-audio', '--disable-gpu'], timeout: 180000, protocolTimeout: 24 * 3600000 });
  let browser = await launch();
  try {
    // The page sometimes reloads itself right after load (a script that failed on the cold server triggers the
    // game's one-time reload), which detaches the frame. boot() retries on a fresh tab; runMatch replays a match
    // whose tab died.
    let page = null;
    const newPage = async () => {
      if (page) { try { await page.close(); } catch (e) {} }
      // A dead browser (Connection closed) is relaunched; the rest of the run carries on.
      if (!browser.connected) { try { await browser.close(); } catch (e) {} browser = await launch(); console.error('browser relaunched'); }
      page = await browser.newPage();
      page.on('pageerror', e => console.error('pageerror', e.message));
      await page.setRequestInterception(true);
      // Headless sims need no art, sound or fonts: skipping them keeps the tab small (memory-starved Macs killed it).
      page.on('request', q => { const u = q.url(), t = q.resourceType();
        (/^(image|media|font)$/.test(t) || !(u.startsWith('http://localhost') || u.startsWith('data:'))) ? q.abort() : q.continue(); });
    };
    const boot = async () => {
      for (let attempt = 1; ; attempt++) {
        try { if (!page) await newPage(); await boot1(); return; }
        catch (e) { if (attempt >= 8) throw e; console.error(`boot failed (${e.message.slice(0, 60)}), retry ${attempt}`); await newPage(); }
      }
    };
    const boot1 = async () => {
      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 180000 });
      await new Promise(r => setTimeout(r, 2500));
      await page.evaluate(() => { try { backToHome(); } catch (e) {} });
      await page.evaluate(g => { window._laGlobals = g; }, require(path.join(ROOT, 'tools/audit/globals.json')).globals.filter(n => !/^[A-Z][A-Z0-9_]*$/.test(n)));
      await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'approxsim.js'), 'utf8') });
      await page.evaluate(pageSetup.toString().replace(/^function pageSetup\(\) \{/, '').replace(/\}$/, ''));
      await page.evaluate((net, opp, model, hold) => {
        window._laNet = net; window._laOpp = opp; window._laModel = model;
        // --hold=me|opp|both: follow-up decisions repeat the first keys instead of asking the nets (cheaper search).
        LA.holdMe = /me|both/.test(hold); LA.holdOpp = /opp|both/.test(hold);
        for (const t of ['WEAPONS', 'CLASSES', 'MS_DEFS', 'WEAPON_SWINGS', 'MS_PROTO']) { try { LA.markStatic((0, eval)(t)); } catch (e) {} }
      }, NET, OPP, MODEL, String(args.hold || ''));
    };
    await boot();

    // One match (episode index ep) with or without search. Math.random seeded per match, so both arms get the
    // same kits and spawns.
    // --fresh: reload the page before every match, so nothing carries over between matches.
    const runMatch = async (ep, arm) => {
      for (let attempt = 1; ; attempt++) {
        try { if (args.fresh || attempt > 1) await boot(); return await runMatch1(ep, arm); }
        catch (e) { if (attempt >= 5) throw e; console.error(`match ${ep} ${arm} failed (${e.message.slice(0, 60)}), replaying`); await newPage(); }
      }
    };
    const runMatch1 = (ep, arm) => page.evaluate((ep, arm, seed, lives, cfg) => {
      const rnd = Math.random;
      Math.random = LA.seeded((seed * 7919 + ep * 104729) >>> 0);
      const vf = Brain.loadNet(window._laNet.vf);
      let vh = Brain.newState(vf);
      // The opponent model keeps its own memory through the match, fed the opponent's view each decision.
      const mnet = window._laModel ? Brain.loadNet(window._laModel.pi) : null;
      const model = mnet ? { net: mnet, h: Brain.newState(mnet), obs: new Float32Array(Brain.OBS_DIM) } : null;
      const st = { searched: 0, changed: 0, ms: 0, fid: [] };
      st.fps = [];
      // --record: every decision, both fighters' state, the projectiles and the keys each side played LAST decision
      // (prevAct / oppIO.prev), for fitting and scoring the approximate simulator offline (tools/brain/approxsim.js).
      const F = ['x', 'y', 'vx', 'vy', 'w', 'h', 'health', 'maxHealth', 'lives', 'facing', 'attackTimer', 'attackDuration', 'cooldown',
        'attackEndlag', 'stunTimer', 'hurtTimer', 'ragdollTimer', 'shieldHoldTimer', 'coyoteFrames', 'classSpeedMult', 'superMeter',
        'abilityCooldown', 'invincible', '_landLag', '_atkAge', 'shieldPool', '_shieldPool', '_comboHitCount'];
      const stateOf = f => { const o = { wk: f.weaponKey, cls: f.charClass || 'none', g: f.onGround ? 1 : 0, dj: f.canDoubleJump ? 1 : 0,
        sh: f.shielding ? 1 : 0, ms: f._msScene ? 1 : 0, sr: f.superReady ? 1 : 0 };
        for (const k of F) if (typeof f[k] === 'number') o[k] = Math.round(f[k] * 1000) / 1000; return o; };
      if (cfg.record) st.rec = [];
      const search = c => {
        if (cfg.record && !st.plats) st.plats = currentArena.platforms.map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, isFloor: !!p.isFloor,
          oneWay: !!(p.oneWay || p.passThrough || p.passUnder), ramp: !!p.ramp, noDraw: !!p.noDraw, off: !!p.isFloorDisabled }));
        if (cfg.record) st.rec.push({ f: c.frame, b: stateOf(c.brain), o: stateOf(c.opps[0]), ba: c.prevAct.slice(), oa: c.oppIO[0] ? c.oppIO[0].prev.slice() : null,
          p: (typeof projectiles !== 'undefined' ? projectiles : []).filter(q => q.active !== false).map(q => ({ x: Math.round(q.x), y: Math.round(q.y), vx: q.vx, vy: q.vy,
            own: q.owner === c.brain ? 0 : 1, dmg: q.damage })),
          dom: typeof DomainManager !== 'undefined' && DomainManager.anyActive && DomainManager.anyActive() ? 1 : 0 });
        if (cfg.trace) st.fps.push(c.frame + ' ' + LA.fingerprint(c));
        if (cfg.dumpAt && st.fps.length - 1 === cfg.dumpAt) {
          const roots = [['brain', c.brain], ...c.opps.map((f, i) => ['opp' + i, f]), ['MoveScene', MoveScene], ['projectiles', projectiles],
            ['rising', DomainManager.rising], ['domains', DomainManager.domains],
            ...['WEAPONS', 'CLASSES', 'MS_DEFS', 'WEAPON_SWINGS'].map(n => { try { return [n, (0, eval)(n)]; } catch (e) { return [n, null]; } })];
          st.dump = Object.fromEntries(LA.deepMap(roots));
          st.dumpG = LA.globState();
        }
        if (arm === 'base') return;
        if (vf) Brain.forward(vf, c.obs, vh);         // keep the value net's memory in step with the match
        if (model && c.oppIO[0]) { Brain.observe(c.opps[0], c.brain, c.oppIO[0].prev, model.obs); Brain.forward(model.net, model.obs, model.h); }
        if (arm === 'fidelity') {
          if (c.frame < 300 || c.frame % 150) return;
          const S = LA.snap(LA.rootsOf(c));
          const fp0 = LA.fingerprint(c);
          const a = LA.playFork(c, c.act, 20, 99, null, null); const fa = LA.fingerprint(c);
          LA.restore(S);
          const back = LA.fingerprint(c) === fp0;
          const b = LA.playFork(c, c.act, 20, 99, null, null); const fb = LA.fingerprint(c);
          LA.restore(S);
          // A different first move (walk the other way, jump, swing) must lead somewhere else, or the fork isn't running.
          const alt = [2 - c.act[0], 1 - c.act[1], 0, c.act[3] === 1 ? 0 : 1];
          LA.playFork(c, alt, 20, 99, null, null); const fc = LA.fingerprint(c);
          LA.restore(S);
          st.fid.push({ frame: c.frame, same: fa === fb && a === b, back, moved: fa !== fp0, diverge: fc !== fa, fa: fa === fb ? undefined : fa, fb: fa === fb ? undefined : fb,
            dom: typeof DomainManager !== 'undefined' && DomainManager.anyActive && DomainManager.anyActive() ? 1 : 0,
            scene: (c.brain._msScene || c.opps.some(f => f._msScene)) ? 1 : 0 });
          return;
        }
        const dec = (c.frame / Brain.REPEAT) | 0;
        if (dec % cfg.every) return;
        if (Math.abs(c.main.cx() - c.brain.cx()) > cfg.range || Math.abs(c.main.cy() - c.brain.cy()) > 200) return;
        if (typeof DomainManager !== 'undefined' && DomainManager.anyActive && DomainManager.anyActive()) return;
        const t0 = performance.now();
        const logits = Float32Array.from(c.net.bufs[c.net.bufs.length - 1]);
        const cands = LA.topK(logits, cfg.K);
        // 'agree': play the real-fork pick, and count how often the model's pick (and the bare policy) matches it.
        let apick = null;
        if (arm === 'agree' && st.searched < 30) { const d = LA.standDiff(c); st.sd = st.sd || []; if (d[0] > 1e-4) st.sd.push(d.map(v => +v.toFixed(3))); }
        if (arm === 'agree' && c.act[3] < 2 && ApproxSim.covers(c.brain.weaponKey) && ApproxSim.covers(c.main.weaponKey)) {
          const W0 = LA.approxRoot(c); let bs = -Infinity;
          for (const cd of cands) { if (cd.act[3] >= 2) continue; const sc = LA.approxFork(c, W0, cd.act, cfg.H, vf, vh, model); if (sc > bs) { bs = sc; apick = cd.act; } }
        }
        if (arm === 'approx') {
          // The model has no abilities or supers: leave those decisions to the policy, and only weigh plain keys.
          if (c.act[3] >= 2 || !ApproxSim.covers(c.brain.weaponKey) || !ApproxSim.covers(c.main.weaponKey)) return;
          const W0 = LA.approxRoot(c);
          let best = null, bs = -Infinity;
          for (const cd of cands) {
            if (cd.act[3] >= 2) continue;
            const sc = LA.approxFork(c, W0, cd.act, cfg.H, vf, vh, model);
            if (sc > bs) { bs = sc; best = cd.act; }
          }
          st.searched++;
          if (best && best.some((v, k) => v !== c.act[k])) { st.changed++; for (let k = 0; k < 4; k++) c.act[k] = best[k]; }
          st.ms += performance.now() - t0;
          return;
        }
        const S = LA.snap(LA.rootsOf(c));
        const g0 = cfg.globcheck && st.searched < cfg.globcheck ? LA.globState() : null;
        const droots = () => [['brain', c.brain], ...c.opps.map((f, i) => ['opp' + i, f]), ['MoveScene', MoveScene], ['projectiles', projectiles],
          ...['WEAPONS', 'CLASSES', 'MS_DEFS', 'WEAPON_SWINGS'].map(n => { try { return [n, (0, eval)(n)]; } catch (e) { return [n, null]; } })];
        const d0 = cfg.deepcheck && st.searched < 60 ? LA.deepMap(droots()) : null;
        let best = null, bs = -Infinity;
        for (let i = 0; i < cands.length; i++) {
          const sc = LA.playFork(c, cands[i].act, cfg.H, 1000 + i, vf, vh, model);
          LA.restore(S);
          if (sc > bs) { bs = sc; best = cands[i].act; }
        }
        if (d0) { const d1 = LA.deepMap(droots()); st.deep = st.deep || {};
          for (const [k, v] of d0) if (d1.get(k) !== v) { const key = k.replace(/\.\d+(?=\.|$)/g, '.N'); st.deep[key] = (st.deep[key] || '') .length < 80 ? (st.deep[key] || '') + `[${v} -> ${d1.get(k)}]` : st.deep[key]; }
          for (const k of d1.keys()) if (!d0.has(k)) { const key = 'NEW ' + k.replace(/\.\d+(?=\.|$)/g, '.N'); st.deep[key] = 1; } }
        if (g0) { const g1 = LA.globState(); for (const k in g0) if (g0[k] !== g1[k]) st.leaks = Object.assign(st.leaks || {}, { [k]: (st.leaks && st.leaks[k] || 0) + 1 }); }
        st.searched++;
        if (apick) {
          const same = (x, y) => x.every((v, k) => v === y[k]);
          st.ag = st.ag || { n: 0, model: 0, policy: 0, modelMove: 0, modelBtn: 0 };
          st.ag.n++; if (same(apick, best)) st.ag.model++; if (same(c.act, best)) st.ag.policy++;
          if (apick[0] === best[0]) st.ag.modelMove++; if (apick[3] === best[3]) st.ag.modelBtn++;
        }
        // 'shadow' searches but always plays the policy's move: it must match 'base' exactly, or forks leak.
        if (best.some((v, k) => v !== c.act[k])) { st.changed++; if (arm !== 'shadow') for (let k = 0; k < 4; k++) c.act[k] = best[k]; }
        st.ms += performance.now() - t0;
      };
      const spec = { type: 'self', label: 'opp', greedy: !cfg.oppSample, brainKit: 'randomClass', kit: 'randomClass', weights: window._laOpp.pi };
      const out = Brain.rollout({ weights: window._laNet.pi, maxFrames: 60 * 60 * lives, lives, opponents: [spec], episodes: 1, greedy: true, search });
      Math.random = rnd;
      const e = out.episodes[0];
      // Platforms as they were DURING the match (the sim env puts the old arena back when the rollout ends).
      return { platforms: st.plats,
        win: e.win, k: e.oLost, d: e.bLost, frames: e.frames, kit: e.kit, dealt: e.stats.dmgDealt, taken: e.stats.dmgTaken, st };
    }, ep, arm, SEED, LIVES, CFG);

    if (args.leak) {
      // First decision where 'base' and 'shadow' disagree, for each match.
      for (let ep = 0; ep < (parseInt(args.eps, 10) || 2); ep++) {
        const [armA, armB] = String(args.pair || 'base,shadow').split(',');
        const ra = await runMatch(ep, armA), A = ra.st.fps, rs = await runMatch(ep, armB), B = rs.st.fps, cfg_leaks = rs.st.leaks;
        const i = A.findIndex((x, j) => x !== B[j]);
        console.log(`ep ${ep}: ${i < 0 ? 'identical' : `first difference at decision ${i}`}`);
        if (ra.st.dump && rs.st.dump) {
          const a = ra.st.dump, b = rs.st.dump, diff = [];
          for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) diff.push(`${k}: ${a[k]} | ${b[k]}`);
          for (const k of Object.keys(ra.st.dumpG)) if (ra.st.dumpG[k] !== rs.st.dumpG[k]) diff.push(`GLOBAL ${k}: ${ra.st.dumpG[k].slice(0, 60)} | ${rs.st.dumpG[k].slice(0, 60)}`);
          console.log(`   state differences at decision ${CFG.dumpAt} (base | other): ${diff.length}\n     ` + diff.slice(0, 50).join('\n     '));
        }
        if (cfg_leaks) console.log('   globals changed by forks:', JSON.stringify(cfg_leaks));
        if (rs.st.deep) console.log('   reachable values changed by forks:\n     ' + Object.entries(rs.st.deep).slice(0, 40).map(([k, v]) => k + '  ' + v).join('\n     '));
        if (i >= 0) for (let j = Math.max(0, i - 1); j <= i + 1 && j < A.length; j++) console.log(`   base   ${A[j]}\n   shadow ${B[j]}`);
      }
      return;
    }
    if (args.fidelity) {
      const n = parseInt(args.eps, 10) || 3;
      let tot = 0, same = 0, back = 0, moved = 0, div = 0;
      for (let ep = 0; ep < n; ep++) {
        const r = await runMatch(ep, 'fidelity');
        for (const f of r.st.fid) {
          tot++; same += f.same ? 1 : 0; back += f.back ? 1 : 0; moved += f.moved ? 1 : 0; div += f.diverge ? 1 : 0;
          if (!f.same || !f.back) console.log(`  ep ${ep} frame ${f.frame} same=${f.same} back=${f.back} dom=${f.dom} scene=${f.scene}\n    A ${f.fa}\n    B ${f.fb}`);
        }
      }
      console.log(`fidelity: ${same}/${tot} forks repeat exactly, ${back}/${tot} restore to the start state, ${moved}/${tot} advance the game, ${div}/${tot} diverge under a different first move`);
      return;
    }

    if (args.record) {
      // Traces for the approximate simulator: no search, one match each, written as JSON lines.
      const out = path.resolve(ROOT, String(args.record));
      fs.writeFileSync(out, '');
      for (let ep = 0; ep < EPS; ep++) {
        const r = await runMatch(ep, 'base');
        fs.appendFileSync(out, JSON.stringify({ ep, kit: r.kit, platforms: r.platforms, rec: r.st.rec }) + '\n');
        console.log(`ep ${ep} ${r.kit} ${r.st.rec.length} decisions`);
      }
      return;
    }
    const arms = String(args.arms || 'base,search').split(',');
    if (args.hold) console.log(`follow-ups held: ${args.hold}`);
    console.log(`model ${MODELP ? MODELP + ' (' + MODEL.iter + ')' : 'the real opponent net'}, opponent ${CFG.oppSample ? 'samples' : 'greedy'}`);
    console.log(`net ${NETP} (${NET.iter}) vs ${OPPP} (${OPP.iter}), ${EPS} paired matches, ${LIVES} stocks, K=${CFG.K} H=${CFG.H} every=${CFG.every} range=${CFG.range}`);
    const res = Object.fromEntries(arms.map(a => [a, []]));
    for (let ep = 0; ep < EPS; ep++) {
      const line = [];
      for (const arm of arms) {
        const t0 = Date.now();
        const r = await runMatch(ep, arm);
        res[arm].push(r);
        if (r.st.sd) line.push('standDiff ' + JSON.stringify(r.st.sd.slice(0, 8)) + ' (' + r.st.sd.length + ' of 30)');
        if (r.st.ag) line.push(`agree: model ${(100 * r.st.ag.model / r.st.ag.n).toFixed(0)}% (move ${(100 * r.st.ag.modelMove / r.st.ag.n).toFixed(0)}%, button ${(100 * r.st.ag.modelBtn / r.st.ag.n).toFixed(0)}%) vs policy ${(100 * r.st.ag.policy / r.st.ag.n).toFixed(0)}% of ${r.st.ag.n}`);
        line.push(`${arm} ${r.win ? 'W' : 'L'} ${r.k}-${r.d} (${((Date.now() - t0) / 1000).toFixed(0)}s${r.st.searched ? `, ${r.st.searched} searches ${(r.st.ms / r.st.searched).toFixed(0)}ms, ${(100 * r.st.changed / r.st.searched).toFixed(0)}% changed` : ''})`);
      }
      const sum = arms.map(a => { const R = res[a]; const w = R.reduce((s, r) => s + r.win, 0);
        return `${a} ${w}/${R.length} = ${(100 * w / R.length).toFixed(0)}%  dmg ${(R.reduce((s, r) => s + r.dealt, 0) / R.length).toFixed(0)}/${(R.reduce((s, r) => s + r.taken, 0) / R.length).toFixed(0)}`; }).join('   ');
      console.log(`ep ${String(ep).padStart(3)} ${res[arms[0]][ep].kit.padEnd(22)} ${line.join('  ')}   | ${sum}`);
      if (args.json) fs.writeFileSync(path.resolve(ROOT, args.json), JSON.stringify({ net: NETP, opp: OPPP, cfg: CFG, seed: SEED, lives: LIVES, res }) + '\n');
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
