/*
 * tools/sov-movelab-page.js — injected into the game page by tools/sov-movelab.js.
 * DEV ONLY; never loaded by index.html.
 *
 * Two fighters on The Circuit, the real engine, nothing else. Every drill uses
 * the drivers in js/smb-sov-combo.js, so what is measured here is exactly the
 * move Sovereign makes in a live fight.
 */
/* global SovMoves, SMK2Trainer, SovereignMK2, Fighter, WEAPONS, WEAPON_KEYS */
window.MoveLab = (() => {
  const FLOOR_Y = 460;
  let _fc0 = 100000;
  let _stubbed = false;

  function seed(s) {
    s = s >>> 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function scene(a, b) {
    if (!_stubbed) { SMK2Trainer.simEnv.stub(); _stubbed = true; }
    SMK2Trainer.simEnv.apply();
    try { if (typeof DomainManager !== 'undefined' && DomainManager.reset) DomainManager.reset(); } catch (e) {}
    players.length = 0; players.push(a, b);
    a.target = b; b.target = a;
  }

  function step() {
    hitStopFrames = 0; slowMotion = 1;
    _fc0++; frameCount = _fc0; aiTick = _fc0;
    try { if (typeof DomainManager !== 'undefined' && DomainManager.update) DomainManager.update(); } catch (e) {}
    SMK2Trainer.simEnv.tickWorld();
    for (const f of players.slice()) { try { f.update(); } catch (e) { window.__mlErr = window.__mlErr || String(e && e.message); } }
  }

  function passive(f) { f.isAI = true; f.aiTickInterval = 1; f.updateAI = function () {}; f._noWhiffGuard = true; return f; }

  function plain(x, wk, color) {
    const f = new Fighter(x, FLOOR_Y - 90, color || '#4488ff', wk, null, true, 'expert');
    f.aiDiff = 'expert'; f.intelligence = 0.99; f._teamId = 'ml_' + color;
    return passive(f);
  }

  function sovereign(x, wk) {
    const s = new SovereignMK2(x, FLOOR_Y - 90, '#ff2200', wk);
    s.weaponKey = wk; s.weapon = WEAPONS[wk];
    s._loadoutLocked = true; s._teamId = 'ml_sov';
    s._spawnDefendTimer = 0;
    s.isAI = true; s.aiTickInterval = 1; s.updateAI = function () {};
    return s;
  }

  function settle(n) { for (let i = 0; i < n; i++) step(); }

  const lock = f => SovMoves.lock(f);

  // ── 1. FRAME DATA ─────────────────────────────────────────────────────────
  // For every move: fired from a standstill at each distance on flat ground at a
  // passive target. Startup = frames to first damage; advantage = frames the
  // target stays locked after the attacker can act again (positive = the
  // attacker moves first, so a follow-up can link).
  function frameData(wk, move, dist) {
    const a = plain(300, wk, '#4488ff'), v = plain(300 + dist, 'sword', '#44dd44');
    scene(a, v); settle(6);
    a.facing = 1; v.facing = -1;
    if (move === 'super') { a.superMeter = 100; a.superReady = true; }
    const hp0 = v.health;
    const cd0 = a.cooldown, at0 = a.attackTimer;
    if (move === 'swing') a.attack(v); else if (move === 'ability') a.ability(v); else a.useSuper(v);
    const fired = move === 'swing' ? (a.attackTimer > at0 || a.cooldown > cd0)
                : move === 'ability' ? (a.abilityCooldown > 0) : !a.superReady;
    if (!fired) return { fired: false };
    // Some abilities deal their damage inside the call itself (axe Spin Attack),
    // so the first check is frame 0, against the health before the call.
    let first = -1, dmg = 0, maxStun = 0, maxRag = 0, kbx = 0, kby = 0, hits = 0, prev = hp0;
    let attFree = -1, vicFree = -1, lastDmg = -1;
    if (v.health < prev - 0.5) {
      dmg += prev - v.health; hits++; lastDmg = 0; first = 0; kbx = Math.abs(v.vx || 0); kby = v.vy || 0;
      prev = v.health; maxStun = v.stunTimer || 0; maxRag = v.ragdollTimer || 0;
    }
    for (let f = 1; f <= 150; f++) {
      step();
      if (v.health < prev - 0.5) {
        dmg += prev - v.health; hits++; lastDmg = f;
        if (first < 0) { first = f; kbx = Math.abs(v.vx || 0); kby = v.vy || 0; }
      }
      if (v.health <= 0) break;
      prev = v.health;
      maxStun = Math.max(maxStun, v.stunTimer || 0); maxRag = Math.max(maxRag, v.ragdollTimer || 0);
      if (attFree < 0 && f > 1 && (a.cooldown || 0) <= 0 && (a.attackEndlag || 0) <= 0 && (a.attackTimer || 0) <= 0 && !a.superActive) attFree = f;
      if (first >= 0 && vicFree < 0 && lock(v) <= 0 && f > first) vicFree = f;
      if (attFree >= 0 && (first < 0 ? f > 60 : (vicFree >= 0 && f - lastDmg > 20))) break;
    }
    return { fired: true, hit: first >= 0, startup: first, dmg: Math.round(dmg * 10) / 10, hits, maxStun, maxRag,
             kbx: Math.round(kbx * 10) / 10, kby: Math.round(kby * 10) / 10, attFree, vicFree,
             adv: (first >= 0 && vicFree >= 0 && attFree >= 0) ? vicFree - attFree : null,
             abilityCd: a.abilityCooldown || 0, cooldown: WEAPONS[wk].cooldown };
  }

  function catalogue(wk) {
    const out = {};
    for (const move of ['swing', 'ability', 'super']) {
      const rows = [];
      for (let d = 20; d <= 320; d += 10) { seed(d * 31 + move.length); rows.push([d, frameData(wk, move, d)]); }
      const hits = rows.filter(([, r]) => r.hit);
      if (!rows[0][1].fired) { out[move] = { fired: false }; continue; }
      if (!hits.length) { out[move] = { fired: true, hit: false }; continue; }
      const best = hits.reduce((b, r) => (r[1].dmg > b[1].dmg ? r : b));
      const reach = Math.max(...hits.map(([d]) => d));
      const minD = Math.min(...hits.map(([d]) => d));
      const advs = hits.map(([, r]) => r.adv).filter(x => x != null);
      out[move] = Object.assign({ fired: true, hit: true, reach, minReach: minD, bestAt: best[0],
        advMin: advs.length ? Math.min(...advs) : null, advMax: advs.length ? Math.max(...advs) : null,
        startupMin: Math.min(...hits.map(([, r]) => r.startup)),
        startupFar: hits.find(([d]) => d === reach)[1].startup, listedRange: WEAPONS[wk].range }, best[1]);
    }
    return out;
  }

  // ── 2. ROUTES ─────────────────────────────────────────────────────────────
  // One episode: an opener lands, then he chains follow-ups chosen epsilon-
  // greedily from the current table until one misses or leaves a gap.
  const LEVELS = 4;

  function routeEpisode(wk, Q, eps, rec) {
    const x0 = rnd(180, 720);
    const a = sovereign(x0, wk);
    const reach = WEAPONS[wk].range || 80;
    const side = Math.random() < 0.5 ? -1 : 1;
    const v = plain(x0 + side * rnd(30, reach + 50), 'sword', '#44dd44');
    scene(a, v);
    settle(4);
    if (Math.random() < 0.3) { v.vy = -rnd(8, 16); v.y -= 20; }
    a.abilityCooldown = Math.random() < 0.5 ? 0 : Math.floor(rnd(0, WEAPONS[wk].abilityCooldown || 180));
    if (Math.random() < 0.3) { a.superMeter = 100; a.superReady = true; }
    a.health = a.maxHealth = 9999;
    const spd = 6, jumpVy = -19;

    const runStep = (action) => {
      const p = SovMoves.startRoute(action), st = SovMoves.routeTracker(v);
      for (let f = 0; f < 160; f++) {
        const status = SovMoves.driveRoute(a, v, p, spd, jumpVy);
        step();
        SovMoves.trackRoute(st, v);
        const out = SovMoves.routeDone(st, a, p, status);
        if (out) return { out, st };
        if (v.health <= 0) return { out: st.dmg > 0 ? 'hit' : 'miss', st };
      }
      return { out: st.dmg > 0 ? 'hit' : 'miss', st };
    };
    const settleAfter = () => {
      let last = _fc0, hp = v.health;
      for (let f = 0; f < 40; f++) {
        if ((a.attackTimer || 0) <= 0 && _fc0 - last >= 3) return;
        a.vx *= 0.8; step();
        if (v.health < hp - 0.5) { hp = v.health; last = _fc0; }
      }
    };

    const openers = SovMoves.routeAvail(a).filter(x => x.endsWith('@0'));
    const opener = Math.random() < 0.6 ? 'swing@0' : pick(openers);
    const o = runStep(opener);
    if (o.out !== 'hit') return 0;
    rec.openers[opener.split('@')[0]] = (rec.openers[opener.split('@')[0]] || 0) + 1;
    let prevIdx = -1, hits = 0;
    while (hits < 12 && v.health > 0) {
      settleAfter();
      if (v.health < 60) { v.health = v.maxHealth; }
      const keys = SovMoves.routeKeys(a, v), avail = SovMoves.routeAvail(a);
      let act;
      if (Math.random() < eps) act = pick(avail);
      else {
        let bv = -1;
        for (const x of avail) { const q = qhat(Q, keys, x); if (q > bv) { bv = q; act = x; } }
      }
      const lockNow = lock(v);
      const r = runStep(act);
      const tru = r.out === 'hit' && r.st.freeAtHit <= 1;
      const idx = rec.T.length;
      rec.T.push({ k: keys, av: avail, a: act, hit: r.out === 'hit', tru, dmg: r.st.dmg, free: r.st.freeAtHit, lk: lockNow, next: -1 });
      if (prevIdx >= 0) rec.T[prevIdx].next = idx;
      prevIdx = idx;
      if (!tru) break;
      hits++;
    }
    return 1;
  }

  // Backed-off expected value of an action: finest levels refine coarser ones.
  function qhat(Q, keys, a) {
    let q = null;
    for (let i = LEVELS - 1; i >= 0; i--) {
      const c = Q[i][keys[i]] && Q[i][keys[i]][a];
      if (!c || !c.n) continue;
      const qi = c.v / c.n;
      q = (q === null) ? qi : (c.n * qi + 3 * q) / (c.n + 3);
    }
    return q === null ? 0 : q;
  }

  function solve(T) {
    let V = new Float64Array(T.length);
    let Q = null;
    for (let it = 0; it < 10; it++) {
      Q = Array.from({ length: LEVELS }, () => ({}));
      for (let j = 0; j < T.length; j++) {
        const t = T[j];
        const val = t.tru ? t.dmg + (t.next >= 0 ? V[t.next] : 0) : 0;
        for (let i = 0; i < LEVELS; i++) {
          const row = Q[i][t.k[i]] || (Q[i][t.k[i]] = {});
          const c = row[t.a] || (row[t.a] = { n: 0, v: 0, tru: 0, tv: 0, hit: 0, hd: 0 });
          c.n++; c.v += val;
          if (t.tru) { c.tru++; c.tv += val; }
          if (t.hit) { c.hit++; c.hd += t.dmg; }
        }
      }
      // V of a decision point = best available action there.
      const V2 = new Float64Array(T.length);
      for (let j = 0; j < T.length; j++) {
        const t = T[j];
        let best = 0;
        for (const x of t.av) best = Math.max(best, qhat(Q, t.k, x));
        V2[j] = best;
      }
      V = V2;
    }
    return Q;
  }

  function routes(wk, episodes, rounds) {
    const rec = { T: [], openers: {} };
    let Q = Array.from({ length: LEVELS }, () => ({}));
    const per = Math.ceil(episodes / rounds);
    let landed = 0;
    for (let r = 0; r < rounds; r++) {
      const eps = r === 0 ? 1 : Math.max(0.15, 0.6 - r * 0.15);
      for (let e = 0; e < per; e++) landed += routeEpisode(wk, Q, eps, rec);
      Q = solve(rec.T);
    }
    // Export: [n, trueLinks, meanValueGivenTrue, anyHits, meanDamageOnHit]
    const out = [];
    for (let i = 0; i < LEVELS; i++) {
      const lv = {};
      for (const [k, row] of Object.entries(Q[i])) {
        const r2 = {};
        for (const [a, c] of Object.entries(row)) {
          if (c.n < 2) continue;
          r2[a] = [c.n, c.tru, c.tru ? Math.round(c.tv / c.tru * 10) / 10 : 0, c.hit, c.hit ? Math.round(c.hd / c.hit * 10) / 10 : 0];
        }
        if (Object.keys(r2).length) lv[k] = r2;
      }
      out.push(lv);
    }
    // Longest and most damaging chains, replayed greedily for the record.
    const chains = [];
    for (let j = 0; j < rec.T.length; j++) {
      const isHead = !rec.T.some(t => t.next === j);
      if (!isHead) continue;
      let k = j, seq = [], dmg = 0;
      while (k >= 0 && rec.T[k].tru) { seq.push(rec.T[k].a); dmg += rec.T[k].dmg; k = rec.T[k].next; }
      if (seq.length) chains.push({ seq, dmg: Math.round(dmg) });
    }
    chains.sort((x, y) => y.dmg - x.dmg);
    const acts = {};
    for (const t of rec.T) {
      const e = acts[t.a] || (acts[t.a] = { n: 0, tru: 0, hit: 0, gap: 0 });
      e.n++; if (t.tru) e.tru++; if (t.hit) e.hit++; if (t.hit && !t.tru) e.gap++;
    }
    // Why chains end, by depth: the step that ended each chain, and its cause.
    const ends = {};
    for (let j = 0; j < rec.T.length; j++) {
      const t = rec.T[j];
      if (t.tru && t.next >= 0) continue;
      let depth = 0;
      for (let k = j, guard = 0; guard < 20; guard++) { const pj = rec.T.findIndex(x => x.next === k); if (pj < 0) break; depth++; k = pj; }
      const why = !t.hit ? 'miss' : !t.tru ? 'gap' : 'cap';
      const key = depth + ':' + why;
      ends[key] = (ends[key] || 0) + 1;
    }
    return { levels: out, transitions: rec.T.length, landed, openers: rec.openers, top: chains.slice(0, 8), acts, ends,
             err: window.__mlErr || null };
  }

  // ── 3. COUNTERS ───────────────────────────────────────────────────────────
  // One exchange: the opponent starts a move, he answers SOV_COUNTER_REACT
  // frames in with a uniformly random legal answer, scored over the window.
  let _clashes = 0;
  function _wrapClash() {
    if (Fighter.prototype.__mlClash) return;
    const orig = Fighter.prototype._resolveClash;
    Fighter.prototype._resolveClash = function () { const r = orig.apply(this, arguments); _clashes++; return r; };
    Fighter.prototype.__mlClash = true;
  }

  function counterEpisode(ow, myw, rec) {
    _wrapClash();
    const x0 = rnd(220, 680);
    const reachA = WEAPONS[ow].range || 80;
    const side = Math.random() < 0.5 ? -1 : 1;
    const s = sovereign(x0, myw);
    const A = plain(x0 + side * rnd(30, reachA * 0.8 + 60), ow, '#4488ff');
    // A stands in for the human. Fighter's clash branch requires one side to be
    // non-AI (two bots never clash), so an all-AI drill could never find one.
    A.isAI = false;
    scene(A, s);
    settle(4);
    const toS = Math.sign(s.cx() - A.cx());
    A.facing = toS;
    const air = Math.random() < 0.25;
    if (air) { A.vy = -rnd(9, 13); A.vx = toS * rnd(2, 5); settle(Math.floor(rnd(6, 14))); }
    else if (Math.random() < 0.5) A.vx = toS * 5;
    const r = Math.random();
    const want = r < 0.55 ? 'swing' : r < 0.8 ? 'ability' : 'super';
    if (want === 'super') { A.superMeter = 100; A.superReady = true; }
    if (Math.random() < 0.4) { s.superMeter = 100; s.superReady = true; }
    s.abilityCooldown = Math.random() < 0.6 ? 0 : 60;
    const cd0 = A.cooldown, at0 = A.attackTimer;
    if (want === 'swing') A.attack(s); else if (want === 'ability') A.ability(s); else A.useSuper(s);
    const fired = want === 'swing' ? (A.attackTimer > at0 || A.cooldown > cd0)
                : want === 'ability' ? A.abilityCooldown > 0 : !A.superReady;
    if (!fired) return 0;
    const kind = SovMoves.moveKind(A);
    const moveF = _fc0;
    // The answer is driven from inside the next step, at frameCount moveF +
    // SOV_COUNTER_REACT — the same frame _counterTick answers on in a live
    // fight. One step fewer here, or a reactive clash (CLASH_WINDOW = 3) can
    // never happen in the lab while it can in the game.
    for (let i = 0; i < SOV_COUNTER_REACT - 1; i++) step();
    const keys = SovMoves.counterKeys(s, A, kind);
    const avail = SovMoves.counterAvail(s);
    const act = pick(avail);
    const p = SovMoves.startCounter(act), st = SovMoves.counterTracker(s, A);
    const c0 = _clashes;
    let live = true, parried = false;
    s.updateAI = function () { if (live) live = SovMoves.driveCounter(this, A, p, 6, -19); else if (this.shielding) this.shielding = false; };
    while (_fc0 - moveF < SOV_COUNTER_WINDOW) {
      step();
      SovMoves.trackCounter(st, s, A);
      if ((A._parryVulnFrames || 0) > 0) parried = true;
    }
    const v = SovMoves.counterValue(st, s, A);
    rec.push({ k: keys, a: act, v, clash: _clashes > c0, parried, dealt: st.dealt, taken: st.taken });
    return 1;
  }

  function counters(ow, mywList, episodes) {
    const rec = [];
    for (let e = 0; e < episodes; e++) counterEpisode(ow, mywList[e % mywList.length], rec);
    const lv = Array.from({ length: LEVELS }, () => ({}));
    for (const r of rec) {
      for (let i = 0; i < LEVELS; i++) {
        const row = lv[i][r.k[i]] || (lv[i][r.k[i]] = {});
        const c = row[r.a] || (row[r.a] = { n: 0, pos: 0, s: 0, s2: 0, clash: 0, parry: 0 });
        c.n++; c.pos += r.v > 0 ? 1 : 0; c.s += r.v; c.s2 += r.v * r.v;
        if (r.clash) c.clash++; if (r.parried) c.parry++;
      }
    }
    const out = lv.map(L => {
      const o = {};
      for (const [k, row] of Object.entries(L)) {
        const r2 = {};
        for (const [a, c] of Object.entries(row)) {
          if (c.n < 2) continue;
          const m = c.s / c.n;
          r2[a] = [c.n, c.pos, Math.round(m * 10) / 10, Math.round(Math.sqrt(Math.max(0, c.s2 / c.n - m * m)) * 10) / 10, c.clash, c.parry];
        }
        if (Object.keys(r2).length) o[k] = r2;
      }
      return o;
    });
    return { levels: out, n: rec.length, err: window.__mlErr || null };
  }

  return { seed, catalogue, routes, counters };
})();
