// ============================================================
// SOVEREIGN — MOVE BOOK: combo routes and counters
// ============================================================
// Two questions, both answered by physics rather than by opinion:
//
//   ROUTES   "I just landed a hit. Given what is still locked, how far away they
//             are, how high, how many hits deep and what is off cooldown — what
//             is the next move, and when, that connects before they can act?"
//   COUNTERS "They just started a move. Three frames in, what answer to THAT
//             move, from this distance, pays best?"
//
// Bots and players share one physics engine, so a link that is true in the lab
// (the next hit lands while the target is still in stun or ragdoll) is true
// against a human. tools/sov-movelab.js drills every weapon on the real engine
// and writes what it measured to js/smb-sov-movebook.js (SOV_MOVEBOOK). This
// file holds the pieces the drill and the live fight must share EXACTLY — the
// situation keys and the per-frame drivers — so the lab measures the moves he
// will actually make.
//
// His own evidence against real opponents is filed through SovDossier.recordMove
// and outvotes the lab (the lab prior is capped at SOV_BOOK_PRIOR_CAP samples).
//
// Globals-based, no modules. Loaded before smb-smk2-class.js; everything here
// resolves game globals at call time.

const SOV_ROUTE_MOVES   = ['swing', 'jswing', 'ability', 'super'];
const SOV_ROUTE_DELAYS  = [0, 6, 12];
const SOV_ROUTE_ACTIONS = SOV_ROUTE_MOVES.reduce((a, m) => a.concat(SOV_ROUTE_DELAYS.map(d => m + '@' + d)), []);
const SOV_COUNTER_ACTIONS = ['none', 'shield', 'back', 'jback', 'jin', 'swing', 'ability', 'super', 'wpunish'];
// He answers what he can SEE. A move's first frames are its windup; three frames
// sits inside his existing reaction range (reactFrames 0-4), so nothing here
// reacts faster than the cascade already does.
const SOV_COUNTER_REACT  = 3;
const SOV_COUNTER_WINDOW = 75;   // frames after the move starts that an exchange is scored over
const SOV_BOOK_PRIOR_CAP = 20;   // lab samples count as at most this many of his own
const SOV_ROUTE_MIN_VALUE = 8;   // expected damage a follow-up must promise to keep the route

const SovMoves = (() => {
  const _fc = () => (typeof frameCount !== 'undefined' ? frameCount : 0);
  const _b  = (v, edges) => { let i = 0; while (i < edges.length && v >= edges[i]) i++; return i; };

  function lock(f) { return f ? Math.max(f.stunTimer || 0, f.ragdollTimer || 0) : 0; }

  // Hit count in the engine's own combo window (dealDamage resets it after 45
  // frames), which is what drives hitstun decay, the 3-hit string launcher and
  // the forced launcher at 7.
  function comboN(att) {
    return (_fc() - (att._comboLastFrame || 0) > 45) ? 0 : (att._comboHitCount || 0);
  }

  function _nearWall(f) {
    let L = 0, R = (typeof GAME_W !== 'undefined' ? GAME_W : 900);
    const pl = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
    const fl = pl.find(p => p.isFloor && !p.isFloorDisabled);
    if (fl) { L = Math.max(L, fl.x); R = Math.min(R, fl.x + fl.w); }
    return (f.cx() - L < 70 || R - f.cx() < 70) ? 1 : 0;
  }

  // Finest first. Each coarser key drops what matters least, so a situation he
  // has never seen exactly still reads what he knows about ones like it.
  function routeKeys(att, tgt) {
    const w  = att.weaponKey || 'none';
    const n  = comboN(att);
    const nB = n <= 1 ? 1 : n >= 7 ? 5 : n >= 4 ? 4 : n;
    const air = tgt.onGround ? 0 : 1;
    const lk = _b(lock(tgt), [9, 17, 29, 46]);
    const dx = _b(Math.abs(tgt.cx() - att.cx()), [40, 80, 130, 200]);
    const dyv = tgt.cy() - att.cy();
    const dy = dyv < -60 ? 0 : dyv > 40 ? 2 : 1;
    const iv = (tgt.invincible || 0) > 8 ? 2 : (tgt.invincible || 0) > 0 ? 1 : 0;
    const wl = _nearWall(tgt);
    return [`${w}|${nB}|${air}|${lk}|${dx}|${dy}|${iv}|${wl}`, `${w}|${nB}|${air}|${lk}|${dx}|${dy}`,
            `${w}|${nB}|${air}|${lk}`, `${w}|${air}|${lk}`];
  }

  // Moves that can fire within their own delay.
  function routeAvail(att) {
    const out = [];
    for (const a of SOV_ROUTE_ACTIONS) {
      const [m, dl] = a.split('@');
      if (m === 'ability' && (att.abilityCooldown || 0) > +dl) continue;
      if (m === 'super' && !att.superReady) continue;
      // routeSpend:false keeps ability and super out of routes, so the systems
      // that bank them (super bank, domain charge, defensive abilities) keep them.
      if ((m === 'ability' || m === 'super') && att.isSovereignMK2 &&
          typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.routeSpend === false) continue;
      out.push(a);
    }
    return out;
  }

  function startRoute(action) {
    const [move, dl] = action.split('@');
    return { action, move, delay: +dl, t0: _fc(), fired: -1, jumped: false };
  }

  function _edge(att, dir) { return typeof att.isEdgeDanger === 'function' && att.isEdgeDanger(dir); }

  // The blade's real reach, the same figure the whiff-guard in Fighter.attack()
  // tests. weapon.range is a looser band and runs up to 40% long (spear: 130
  // listed, under 100 measured), so spacing off it plants him out of reach.
  function reachOf(f, tgt) {
    return typeof f._meleeReachDist === 'function' ? f._meleeReachDist(tgt) : ((f.weapon && f.weapon.range) || 80);
  }

  // One frame of a route step. 'pending' until the move fires, then 'fired';
  // 'expired' if it never could.
  function driveRoute(att, tgt, p, spd, jumpVy) {
    const age = _fc() - p.t0;
    const dx = tgt.cx() - att.cx(), gap = Math.abs(dx), dir = Math.sign(dx) || att.facing || 1;
    const reach = reachOf(att, tgt), band = (att.weapon && att.weapon.range) || 80;
    if (p.fired >= 0) { att.vx *= 0.8; return 'fired'; }
    if (age > p.delay + 45) return 'expired';
    // Same spacing his guaranteed-punish branch uses: sprint to reach, then plant.
    if (gap > reach * 0.85) { if (!_edge(att, dir)) att.vx = dir * spd * 2.2; }
    else att.vx *= 0.6;
    if (p.move === 'jswing' && !p.jumped && att.onGround && tgt.cy() < att.cy() - 30 && gap < reach + 60) {
      att.vy = jumpVy; p.jumped = true;
    }
    if (age < p.delay) return 'pending';
    att.facing = dir;
    if (p.move === 'swing' || p.move === 'jswing') {
      if ((att.cooldown || 0) <= 0 && gap < reach + 6 &&
          (p.move === 'swing' || Math.abs(tgt.cy() - att.cy()) <= 55)) {
        const cd = att.cooldown, at = att.attackTimer;
        att.attack(tgt);
        if (att.attackTimer > at || att.cooldown > cd) p.fired = _fc();
      }
    } else if (p.move === 'ability') {
      if ((att.abilityCooldown || 0) <= 0 && gap < band + 30) {
        att.ability(tgt);
        if ((att.abilityCooldown || 0) > 0) p.fired = _fc();
      }
    } else if (p.move === 'super') {
      if (att.superReady && gap < band + 40) {
        att.useSuper(tgt);
        if (!att.superReady) p.fired = _fc();
      }
    }
    return p.fired >= 0 ? 'fired' : 'pending';
  }

  // Outcome of one route step. `free` counts frames the target spent able to act
  // before the first damage: 0-1 is a true link (1 absorbs update order), more
  // is a gap a human could have shielded or jumped out of.
  function routeTracker(tgt) { return { hp: tgt.health, dmg: 0, free: 0, freeAtHit: -1, lastDmgF: -1 }; }

  function trackRoute(st, tgt) {
    const drop = st.hp - tgt.health;
    if (drop > 0.5) {
      if (st.dmg === 0) st.freeAtHit = st.free;
      st.dmg += drop; st.lastDmgF = _fc();
    } else if (st.dmg === 0 && lock(tgt) <= 0) st.free++;
    st.hp = tgt.health;
  }

  function routeDone(st, att, p, status) {
    if (status === 'expired') return 'miss';
    if (p.fired < 0) return null;
    const since = _fc() - p.fired;
    if (st.dmg > 0) {
      if (((att.attackTimer || 0) <= 0 && _fc() - st.lastDmgF >= 3) || since > 90) return 'hit';
      return null;
    }
    return since > 45 ? 'miss' : null;
  }

  // ── Counters ──────────────────────────────────────────────────────────────
  function moveKind(f) {
    const tier = f.superActive ? 2 : (f._attackKindTier || 0);
    return tier >= 2 ? 'super' : tier === 1 ? 'ability' : f.onGround ? 'swing' : 'aswing';
  }

  function counterKeys(def, att, kind) {
    const w = att.weaponKey || 'none';
    const dx = _b(Math.abs(att.cx() - def.cx()), [50, 90, 140, 200]);
    const aAir = att.onGround ? 0 : 1, dAir = def.onGround ? 0 : 1;
    const toDef = Math.sign(def.cx() - att.cx());
    const toward = (Math.abs(att.vx || 0) > 1.5 && Math.sign(att.vx) === toDef) ? 1 : 0;
    const my = def.weaponKey || 'none';
    return [`${w}|${my}|${kind}|${dx}|${aAir}|${dAir}|${toward}`, `${w}|${my}|${kind}|${dx}`, `${w}|${kind}|${dx}`, `${w}|${kind}`];
  }

  function counterAvail(def) {
    return SOV_COUNTER_ACTIONS.filter(a =>
      a === 'shield'  ? (def.onGround && !((def._landLag || 0) > 0)) :
      a === 'swing' || a === 'wpunish' ? ((def.cooldown || 0) <= 2 && (def.attackEndlag || 0) <= 2) :
      a === 'ability' ? (def.abilityCooldown || 0) <= 0 :
      a === 'super'   ? !!def.superReady :
      a === 'jback' || a === 'jin' ? def.onGround : true);
  }

  function startCounter(action) { return { action, t0: _fc(), fired: false, phase: 0 }; }

  // One frame of a counter. Returns false when the answer has finished.
  function driveCounter(def, att, p, spd, jumpVy) {
    const age = _fc() - p.t0;
    const dx = att.cx() - def.cx(), gap = Math.abs(dx), dir = Math.sign(dx) || def.facing || 1;
    const reach = reachOf(def, att);
    const a = p.action;
    if (a !== 'shield' && def.shielding && age === 0) def.shielding = false;
    switch (a) {
      case 'none':   def.vx *= 0.8; return age < 20;
      case 'shield': def.shielding = age < 24; return age < 26;
      case 'back':   if (!_edge(def, -dir)) def.vx = -dir * spd * 1.4; return age < 22;
      case 'jback':  if (age === 0 && def.onGround) def.vy = jumpVy; if (!_edge(def, -dir)) def.vx = -dir * spd; return age < 22;
      case 'jin':    if (age === 0 && def.onGround) def.vy = jumpVy; def.vx = dir * spd * 1.2; return age < 22;
      case 'swing':
        def.facing = dir;
        if (!p.fired) { const cd = def.cooldown, at = def.attackTimer; def.attack(att); p.fired = def.attackTimer > at || def.cooldown > cd; }
        return age < (p.fired ? 24 : 6);
      case 'ability':
        def.facing = dir;
        if (!p.fired) { def.ability(att); p.fired = (def.abilityCooldown || 0) > 0; }
        return age < (p.fired ? 30 : 6);
      case 'super':
        def.facing = dir;
        if (!p.fired) { def.useSuper(att); p.fired = !def.superReady; }
        return age < (p.fired ? 40 : 6);
      case 'wpunish':
        // Step out of their reach until the move is spent, then walk into the
        // recovery and swing. The classic answer to a committed swing.
        if (p.phase === 0) {
          if (!_edge(def, -dir)) def.vx = -dir * spd * 1.3;
          if ((att.attackTimer || 0) <= 0 || age > 30) p.phase = 1;
          return true;
        }
        def.facing = dir;
        if (gap > reach * 0.85) { if (!_edge(def, dir)) def.vx = dir * spd * 2; } else def.vx *= 0.6;
        if (!p.fired && gap < reach + 6 && (def.cooldown || 0) <= 0) {
          const cd = def.cooldown, at = def.attackTimer; def.attack(att);
          p.fired = def.attackTimer > at || def.cooldown > cd;
        }
        return age < 60;
    }
    return false;
  }

  // Net result of an exchange: damage traded, plus who is left unable to act.
  function counterTracker(def, att) { return { dHp: def.health, aHp: att.health, dealt: 0, taken: 0 }; }
  function trackCounter(st, def, att) {
    if (att.health < st.aHp) st.dealt += st.aHp - att.health;
    if (def.health < st.dHp) st.taken += st.dHp - def.health;
    st.aHp = att.health; st.dHp = def.health;
  }
  function counterValue(st, def, att) {
    const aLock = Math.max(lock(att), att._parryVulnFrames || 0);
    return st.dealt - st.taken + 0.3 * (aLock - lock(def));
  }

  // ── Choosing ──────────────────────────────────────────────────────────────
  function _gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // Beta draw via two gamma draws (Marsaglia-Tsang; shape >= 1 after +1 smoothing).
  function _gamma(k) {
    if (k < 1) return _gamma(k + 1) * Math.pow(Math.random() || 1e-9, 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = _gauss(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function _beta(a, b) { const x = _gamma(a), y = _gamma(b); return x / (x + y); }

  // Lab cell for an action: the finest level holding at least 3 samples.
  function _labCell(levels, keys, a) {
    if (!levels) return null;
    for (let i = 0; i < keys.length; i++) {
      const row = levels[i] && levels[i][keys[i]];
      if (row && row[a] && row[a][0] >= 3) return row[a];
    }
    return null;
  }

  function _book() { return (typeof SOV_MOVEBOOK !== 'undefined' && SOV_MOVEBOOK) ? SOV_MOVEBOOK : null; }
  function _own(table) {
    return (typeof SovDossier !== 'undefined' && SovDossier.moveEvidence) ? SovDossier.moveEvidence(table) : null;
  }

  // Route cell: [n, trueLinks, meanValueGivenTrue, anyHits, meanDamageOnHit].
  // Own evidence: [tries, connected, damageSum], keyed at level 1.
  function pickRoute(att, tgt) {
    const B = _book();
    const lv = B && B.routes && B.routes[att.weaponKey];
    if (!lv) return null;
    const keys = routeKeys(att, tgt);
    const own = _own('route');
    const ownRow = own && own[keys[1]];
    let best = null, bestV = 0;
    for (const a of routeAvail(att)) {
      const c = _labCell(lv, keys, a);
      if (!c) continue;
      const k = Math.min(SOV_BOOK_PRIOR_CAP, c[0]) / c[0];
      const o = ownRow && ownRow[a];
      const s = c[1] * k + (o ? o[1] : 0), f = (c[0] - c[1]) * k + (o ? o[0] - o[1] : 0);
      const p = _beta(s + 1, f + 1);
      const payoff = c[1] > 0 ? c[2] : c[4];
      const v = p * payoff;
      if (v > bestV) { bestV = v; best = a; }
    }
    return best ? { action: best, keys, value: bestV } : null;
  }

  // Counter cell: [n, positives, meanValue, sd].
  // Own evidence: [tries, positives, valueSum], keyed at level 1.
  function pickCounter(def, att, kind) {
    const B = _book();
    const lv = B && B.counters;
    if (!lv) return null;
    const keys = counterKeys(def, att, kind);
    const own = _own('counter');
    const ownRow = own && own[keys[1]];
    let best = null, bestDraw = -Infinity;
    for (const a of counterAvail(def)) {
      const c = _labCell(lv, keys, a);
      if (!c) continue;
      const k = Math.min(SOV_BOOK_PRIOR_CAP, c[0]);
      const o = ownRow && ownRow[a];
      const n = k + (o ? o[0] : 0);
      const mean = (k * c[2] + (o ? o[2] : 0)) / n;
      const draw = mean + (Math.max(4, c[3] || 20) / Math.sqrt(n)) * _gauss();
      if (draw > bestDraw) { bestDraw = draw; best = a; }
    }
    return best ? { action: best, keys, value: bestDraw } : null;
  }

  return { lock, comboN, reachOf, routeKeys, routeAvail, startRoute, driveRoute, routeTracker, trackRoute, routeDone,
           moveKind, counterKeys, counterAvail, startCounter, driveCounter, counterTracker, trackCounter, counterValue,
           pickRoute, pickCounter };
})();
