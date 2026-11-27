'use strict';
// smb-sov-lookahead.js: Sovereign calculates the future. OFF by default (dev, Nov 25 2026).
// Depends on smb-brain.js (Brain), smb-move-scenes.js (MoveScene), smb-domain.js (DomainManager),
// smb-input.js (processInput, keysDown, keyHeldFrames) and the game globals they read.
//
// At a live decision of the brain-driven Sovereign (Brain.tickLive), while he is engaged 1v1: take the policy's
// top K key choices; for each, fork the REAL game in place, play it forward H decisions (Sovereign on his net,
// the opponent on a model of them: Sovereign's own net reading their side), score the damage exchange plus the
// checkpoint's value net at the end, restore. Play the best. tools/brain/lookahead.js measured this at 95% vs
// 48% in sims with a perfect opponent model, 67% vs 28% with a wrong one (docs/sovereign.md, Nov 25).
//
// A fork must leave no trace: everything reachable from the fighters, projectiles, MoveScene, input state and
// a list of globals is snapshotted and restored in place. Side effects (sound, particles, achievements,
// dialogue, finishers, domain triggers) are stubbed while forks run. Systems kept in closures that a fork can't
// restore are not stepped inside forks (CircuitPlate, ComboDomain), and search is skipped while a domain,
// cinematic or finisher is up, online, or with anyone but two fighters on the field.
//
// Console: SovLookahead.enable() / .disable() / .stats() / .CFG. URL: ?sovlook (=shadow for search-but-don't-play).

const SovLookahead = (() => {
  const CFG = { K: 6, H: 8, every: 2, range: 320, dyMax: 200, hold: false, shadow: false, budgetMs: 6, auto: true };
  // Cost tiers, strongest first. With CFG.auto, search measures itself and steps down a tier when its average
  // runs over budgetMs (per search, one search every `every` decisions), up when well under; below the last
  // tier it stops. A slow laptop gets a weaker Sovereign that keeps 60 fps, not a stronger one that stutters.
  const TIERS = [{ K: 6, H: 8, hold: false }, { K: 6, H: 8, hold: true }, { K: 4, H: 6, hold: true }, { K: 3, H: 4, hold: true }];
  // Start at the cheapest tier and climb while there's room, so a slow machine never pays a full search first.
  const START_TIER = TIERS.length - 1;
  let _tier = START_TIER, _ema = 0, _emaN = 0;
  let _on = false, _ctx = null;
  const _st = { decisions: 0, searched: 0, changed: 0, ms: 0, maxMs: 0, skipped: {} };
  const skip = why => { _st.skipped[why] = (_st.skipped[why] || 0) + 1; };

  const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ---- fork: in-place snapshot / restore ---------------------------------------------------------------------
  // Static tables a fork never copies.
  const STATIC = new Set();
  let _staticDone = false;
  function markStatic() {
    if (_staticDone) return; _staticDone = true;
    const roots = [];
    for (const n of ['WEAPONS', 'CLASSES', 'MS_DEFS', 'WEAPON_SWINGS', 'MS_PROTO']) { try { roots.push((0, eval)(n)); } catch (e) {} }
    const st = roots.slice();
    while (st.length) { const o = st.pop();
      if (!o || typeof o !== 'object' || STATIC.has(o)) continue; STATIC.add(o);
      if (ArrayBuffer.isView(o)) continue;
      // Data properties only: MS_PROTO's getters run scene code that needs a live scene.
      for (const k of Object.keys(o)) { const d = Object.getOwnPropertyDescriptor(o, k); const v = d && 'value' in d ? d.value : null;
        if (v && typeof v === 'object') st.push(v); } }
  }
  const SKIP_KEYS = new Set(['_brainNet', '_brainNets', 'controls', '_whipT0', '_whipLash']);
  const skippable = o => (typeof Node !== 'undefined' && o instanceof Node) || (typeof CanvasRenderingContext2D !== 'undefined' && o instanceof CanvasRenderingContext2D)
    || (typeof AudioNode !== 'undefined' && o instanceof AudioNode) || (typeof BaseAudioContext !== 'undefined' && o instanceof BaseAudioContext)
    || (typeof DOMMatrix !== 'undefined' && o instanceof DOMMatrix) || o instanceof Promise || (o.sizes && o.W && o.b);
  // Globals a frame writes outside the fighters (found in sims with tools/brain/lookahead.js --leak --globcheck).
  // Visual ones count: visual code draws on the same Math.random stream as gameplay rolls.
  const BIND = ['projectiles', 'minions', 'frameCount', 'aiTick', 'hitStopFrames', 'slowMotion', 'hitSlowTimer', 'screenShake',
    '_wxStepFrame', '_combatTimers', 'director', '_hitFx', '_wrPending', '_wrMotes', 'damageTexts', 'particles', 'surfaceScars',
    'cinSpeedLines', '_achStats', 'hitVignetteTimer', 'hitVignetteColor', 'camHitZoomTimer', 'abilityFlashPlayer', 'abilityFlashTimer',
    '_hitFromSuper', '_moveTierOverride', 'bloodStains', '_wxBlasts', '_wxFx', '_wxInHit', '_particlePool', '_wrWaves', '_wrRings',
    '_wrLights', '_wrScuffs', '_netInboundHit', 'debrisChunks', '_fracPtcl', 'camDramaState', 'camDramaTimer', 'camDramaTarget',
    'camDramaZoom', 'verletRagdolls', 'respawnCountdowns', 'gameRunning', '_firstDeathFrame', '_firstDeathPlayer'];
  let getters = null, setters = null;
  function bindAccessors() {
    if (getters) return;
    getters = []; setters = [];
    for (const n of BIND) {
      let g, s;
      try { g = new Function('return typeof ' + n + ' === "undefined" ? undefined : ' + n); g(); } catch (e) { g = null; }
      try { s = new Function('v', n + ' = v'); } catch (e) { s = null; }
      getters.push(g); setters.push(s);
    }
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
      // Data properties only (an accessor is code, not state).
      const keys = [], vals = [];
      for (const k of Object.keys(o)) {
        const d = Object.getOwnPropertyDescriptor(o, k);
        if (!d || !('value' in d)) continue;
        keys.push(k); vals.push(d.value);
        if (d.value && typeof d.value === 'object' && !SKIP_KEYS.has(k)) stack.push(d.value);
      }
      recs.push([o, 0, keys, vals, new Set(keys)]);
    }
    return { recs, gv };
  }
  function restore(S) {
    for (const r of S.recs) {
      const o = r[0];
      switch (r[1]) {
        case 0: { const keys = r[2], vals = r[3], had = r[4];
          // Drop only what the fork added; rewriting the rest in place keeps the object's shape (and speed).
          for (const k of Object.keys(o)) if (!had.has(k)) { const d = Object.getOwnPropertyDescriptor(o, k); if (d && 'value' in d) delete o[k]; }
          for (let i = 0; i < keys.length; i++) o[keys[i]] = vals[i]; break; }
        case 1: o.length = 0; for (const x of r[2]) o.push(x); break;
        case 2: o.set(r[2]); break;
        case 3: o.clear(); for (const x of r[2]) o.add(x); break;
        case 4: o.clear(); for (const [k, x] of r[2]) o.set(k, x); break;
      }
    }
    for (let i = 0; i < setters.length; i++) if (setters[i] && getters[i]) { try { setters[i](S.gv[i]); } catch (e) {} }
  }

  // CFG.verify: path -> value for everything a fork could touch, compared before the forks and after restore.
  function stateMap(roots) {
    const out = new Map(), seen = new Set();
    const st = roots.map(([p, o]) => [p, o, 0]);
    const gv = getters.map(g => g ? g() : undefined);
    BIND.forEach((n, i) => st.push(['$' + n, gv[i], 0]));
    while (st.length && out.size < 200000) {
      const [p, o, d] = st.pop();
      if (o === null || typeof o !== 'object') { out.set(p, typeof o === 'function' ? 'fn' : String(o)); continue; }
      if (seen.has(o) || d > 6 || STATIC.has(o) || skippable(o)) continue; seen.add(o);
      if (ArrayBuffer.isView(o)) { if (o.length <= 4096) out.set(p, Array.prototype.join.call(o, ',')); continue; }
      if (o instanceof Set || o instanceof Map) { out.set(p + '#size', String(o.size)); continue; }
      for (const k of Object.keys(o)) { if (SKIP_KEYS.has(k)) continue; const ds = Object.getOwnPropertyDescriptor(o, k); if (ds && 'value' in ds) st.push([p + '.' + k, ds.value, d + 1]); }
    }
    return out;
  }

  // ---- side effects off while forks run -------------------------------------------------------------------
  const _noop = () => {};
  function quiet(opp) {
    const s = { win: {}, sm: {}, dm: {}, cd: {}, set: {}, oppControls: opp.controls };
    for (const n of ['spawnParticles', 'spawnImpact', 'showBossDialogue', 'unlockAchievement', 'spawnLightningBolt', 'screenFlash', 'showToast']) {
      if (typeof window[n] === 'function') { s.win[n] = window[n]; window[n] = _noop; }
    }
    if (typeof SoundManager !== 'undefined') for (const k of Object.keys(SoundManager)) {
      if (typeof SoundManager[k] === 'function' && k !== 'at') { s.sm[k] = SoundManager[k]; SoundManager[k] = _noop; }
    }
    if (typeof SoundManager !== 'undefined' && typeof SoundManager.at === 'function') { s.sm.at = SoundManager.at; SoundManager.at = () => SoundManager; }
    if (typeof DomainManager !== 'undefined') for (const k of ['triggerExpansion', 'onFighterDied']) {
      if (typeof DomainManager[k] === 'function') { s.dm[k] = DomainManager[k]; DomainManager[k] = _noop; }
    }
    if (typeof ComboDomain !== 'undefined') for (const k of ['onHit']) {
      if (typeof ComboDomain[k] === 'function') { s.cd[k] = ComboDomain[k]; ComboDomain[k] = _noop; }
    }
    if (typeof settings !== 'undefined') { s.set.finishers = settings.finishers; s.set.dmgNumbers = settings.dmgNumbers; settings.finishers = false; settings.dmgNumbers = false; }
    // The opponent plays predicted keys on virtual controls, so the real keys held right now don't leak in and
    // no real key name is dispatched to the page's other keydown listeners.
    opp.controls = Brain.controlsFor(8);
    s.rnd = Math.random;
    return s;
  }
  function loud(s, opp) {
    for (const n in s.win) window[n] = s.win[n];
    for (const k in s.sm) SoundManager[k] = s.sm[k];
    for (const k in s.dm) DomainManager[k] = s.dm[k];
    for (const k in s.cd) ComboDomain[k] = s.cd[k];
    if (typeof settings !== 'undefined') { settings.finishers = s.set.finishers; settings.dmgNumbers = s.set.dmgNumbers; }
    opp.controls = s.oppControls;
    Math.random = s.rnd;
  }

  // ---- one frame of the world, as gameLoop runs it for a 1v1 (minus rendering and closure-kept systems) -------
  function simFrame(fr) {
    hitStopFrames = 0; slowMotion = 1; frameCount = fr; aiTick = fr;
    try { processInput(); } catch (e) {}
    try { projectiles.forEach(p => p.update()); projectiles = projectiles.filter(p => p.active); } catch (e) {}
    try { if (typeof DomainManager !== 'undefined' && DomainManager.update) DomainManager.update(); } catch (e) {}
    for (const p of players) { if ((p.health > 0 || p.invincible > 0) && !p.isRemote) { try { p.update(); } catch (e) {} } }
    try { if (typeof MoveScene !== 'undefined') MoveScene.update(); } catch (e) {}
  }

  // Keys the human is holding, as the brain's four heads.
  function heldAct(f, out) {
    const c = f.controls, h = k => keysDown.has(k);
    out[0] = h(c.left) && !h(c.right) ? 0 : h(c.right) && !h(c.left) ? 2 : 1;
    out[1] = h(c.jump) ? 1 : 0; out[2] = h(c.shield) ? 1 : 0;
    out[3] = h(c.attack) ? 1 : h(c.ability) ? 2 : h(c.super) ? 3 : 0;
    return out;
  }

  // Top K joint actions by policy probability, greedy first.
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

  // One future: Sovereign holds act0 for a decision, then both sides play (or hold) for H-1 more.
  function playFork(L, opp, C, act0, seed) {
    Math.random = seeded(seed);
    const OBS = Brain.OBS_DIM, R = Brain.REPEAT, sov = L.f;
    const bm = L.h ? L.h.slice() : null, mh = C.mh ? C.mh.slice() : null;
    const bPrev = L.prev.slice(), oPrev = C.oPrev.slice(), a = act0.slice(), b = [1, 0, 0, 0];
    const obs = C.obs, obs2 = C.obs2;
    let fr = frameCount, r = 0, pb = sov.health, po = opp.health, dec, ko = false;
    outer: for (dec = 0; dec < CFG.H; dec++) {
      if (dec > 0 && !CFG.hold) { Brain.observe(sov, opp, bPrev, obs); Brain.sample(Brain.forward(L.net, obs, bm), a, true); }
      if (dec === 0 || !CFG.hold) { Brain.observe(opp, sov, oPrev, obs2); Brain.sample(Brain.forward(C.model, obs2, mh), b, true); }
      Brain.applyKeys(sov, a); Brain.applyKeys(opp, b);
      for (let k = 0; k < 4; k++) { bPrev[k] = a[k]; oPrev[k] = b[k]; }
      for (let s = 0; s < R; s++) {
        simFrame(fr); fr++;
        if (sov.health < pb) r -= (pb - sov.health) / 40;
        if (opp.health < po) r += (po - opp.health) / 40;
        pb = sov.health; po = opp.health;
        if (sov.health <= 0) { r -= 2; ko = true; break outer; }
        if (opp.health <= 0) { r += 2; ko = true; break outer; }
      }
    }
    if (!ko && C.vf) { Brain.observe(sov, opp, bPrev, obs); r += Math.pow(0.99, dec) * Brain.forward(C.vf, obs, C.vh ? C.vh.slice() : null)[0]; }
    return r;
  }

  // Brain.tickLive calls this after the net has picked L.act for this decision.
  function search(L, opp) {
    if (!_on) return;
    const sov = L.f;
    // Per-match context: value net, opponent model (Sovereign's own net reading the other side) and their memories.
    if (!_ctx || _ctx.f !== sov || _ctx.opp !== opp) {
      const ck = Brain.liveCkpt;
      _ctx = { f: sov, opp, vf: ck && ck.vf ? Brain.loadNet(ck.vf) : null, model: ck ? Brain.loadNet(ck.pi || ck) : null, dec: 0,
               obs: new Float32Array(Brain.OBS_DIM), obs2: new Float32Array(Brain.OBS_DIM), oPrev: [1, 0, 0, 0] };
      _ctx.vh = Brain.newState(_ctx.vf); _ctx.mh = Brain.newState(_ctx.model);
      markStatic(); bindAccessors();
    }
    const C = _ctx;
    if (!C.model) return;
    // The policy's logits for this decision, before anything else runs a forward on this net.
    const logits = Float32Array.from(L.net.bufs[L.net.bufs.length - 1]);
    // Keep both memories in step with the match, searched or not.
    heldAct(opp, C.oPrev);
    if (C.vf) Brain.forward(C.vf, L.obs, C.vh);
    Brain.observe(opp, sov, C.oPrev, C.obs2); Brain.forward(C.model, C.obs2, C.mh);
    _st.decisions++;
    if (C.dec++ % CFG.every) return;
    if (typeof onlineMode !== 'undefined' && onlineMode) return skip('online');
    if (players.length !== 2 || players.some(p => p.health <= 0)) return skip('field');
    if ((typeof minions !== 'undefined' && minions.length) || (typeof trainingDummies !== 'undefined' && trainingDummies.length)) return skip('field');
    if (isCinematic || activeCinematic || (typeof activeFinisher !== 'undefined' && activeFinisher) || gameFrozen) return skip('cinematic');
    if (typeof DomainManager !== 'undefined' && DomainManager.anyActive && (DomainManager.anyActive() || DomainManager.rising.length)) return skip('domain');
    if (typeof ComboDomain !== 'undefined' && ComboDomain.defFor && sov._comboDomain) return skip('domain');
    if (sov._msScene || opp._msScene || sov._msLock || opp._msLock) return skip('scene');
    if (Math.abs(opp.cx() - sov.cx()) > CFG.range || Math.abs(opp.cy() - sov.cy()) > CFG.dyMax) return skip('far');
    if (CFG.auto) {
      if (_tier >= TIERS.length) return skip('budget');
      Object.assign(CFG, TIERS[_tier]);
    }
    const t0 = performance.now();
    const cands = topK(logits, CFG.K);
    const roots = [sov, opp, projectiles, typeof MoveScene !== 'undefined' ? MoveScene : null, keysDown, keyHeldFrames, currentArena,
      L.read, L.turn, L.prev, L.act];
    const vroots = CFG.verify ? [['sov', sov], ['opp', opp], ['proj', projectiles], ['MoveScene', typeof MoveScene !== 'undefined' ? MoveScene : null],
      ['keys', [...keysDown].sort()], ['held', keyHeldFrames], ['L.prev', L.prev], ['L.act', L.act]] : null;
    const before = vroots ? stateMap(vroots) : null;
    const Q = quiet(opp);
    let best = null, bs = -Infinity;
    try {
      const S = snap(roots);
      for (let i = 0; i < cands.length; i++) {
        let sc;
        try { sc = playFork(L, opp, C, cands[i].act, 1000 + i); } finally { restore(S); }
        if (sc > bs) { bs = sc; best = cands[i].act; }
      }
    } finally { loud(Q, opp); }
    if (before) {
      vroots[4][1] = [...keysDown].sort();
      const after = stateMap(vroots); let bad = 0;
      for (const [k, v] of before) if (after.get(k) !== v) { bad++; if ((_st.verifyDiffs = _st.verifyDiffs || []).length < 12) _st.verifyDiffs.push(k + ': ' + v + ' -> ' + after.get(k)); }
      for (const k of after.keys()) if (!before.has(k)) { bad++; if ((_st.verifyDiffs = _st.verifyDiffs || []).length < 12) _st.verifyDiffs.push('NEW ' + k); }
      _st.verified = (_st.verified || 0) + 1; if (bad) _st.verifyFail = (_st.verifyFail || 0) + 1;
    }
    const ms = performance.now() - t0;
    _st.searched++; _st.ms += ms; if (ms > _st.maxMs) _st.maxMs = ms;
    if (CFG.auto && !CFG.verify) {
      _ema = _emaN++ ? _ema * 0.8 + ms * 0.2 : ms;
      // One search at 3x budget drops a tier at once; otherwise step on the average.
      if (ms > CFG.budgetMs * 3 || (_emaN >= 5 && _ema > CFG.budgetMs)) { _tier++; _emaN = 0; }
      else if (_emaN >= 20 && _tier > 0 && _ema < CFG.budgetMs * 0.35) { _tier--; _emaN = 0; }
      _st.tier = _tier;
    }
    if (best && best.some((v, k) => v !== L.act[k])) { _st.changed++; if (!CFG.shadow) for (let k = 0; k < 4; k++) L.act[k] = best[k]; }
  }

  function enable(opts) { Object.assign(CFG, opts || {}); _on = true; Brain.setLiveSearch(search); return CFG; }
  function disable() { _on = false; Brain.setLiveSearch(null); _ctx = null; }
  function stats() {
    return Object.assign({}, _st, { avgMs: _st.searched ? +(_st.ms / _st.searched).toFixed(2) : 0, on: _on, cfg: Object.assign({}, CFG) });
  }
  function resetStats() { _st.decisions = _st.searched = _st.changed = 0; _st.ms = _st.maxMs = 0; _st.skipped = {}; _tier = START_TIER; _ema = 0; _emaN = 0; }

  // ?sovlook turns it on; ?sovlook=shadow searches without playing the result (leak check).
  try {
    const q = new URLSearchParams(location.search).get('sovlook');
    if (q !== null && typeof Brain !== 'undefined') enable({ shadow: q === 'shadow' });
  } catch (e) {}

  return { enable, disable, stats, resetStats, CFG, get on() { return _on; } };
})();
