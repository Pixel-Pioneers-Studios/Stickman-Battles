'use strict';
/*
 * smb-sov-telemetry.js — causal combat telemetry for the VECTOR research loop.
 *
 * WHY THIS EXISTS
 * The replay recorder (smb-replay.js) logs damage as { amount, resulting hp,
 * guessed attacker }. That is enough to rebuild a match and nowhere near enough
 * to explain one. The best sentence anything can write from it is "P1 took 14
 * damage around 0:40, probably from P2" — true, and worth nothing to a model
 * asked to find out WHY Sovereign keeps losing.
 *
 * Every field below exists because some explanation is impossible without it:
 *
 *   airborne / landing / stun / shield  — 126 of 127 hits Sovereign took in the
 *       Sep 10 replay set landed while he was airborne or in landing recovery.
 *       That finding is invisible unless victim state is sampled AT the hit.
 *   fromBehind                          — distinguishes "he gets read" from
 *       "he gets flanked", which have opposite fixes.
 *   sinceLast / chain                   — lockout comes from CHAINED hits, not
 *       big ones (measured: damage 2.2x -> 5x moved lockout 5.7% -> 4.1%).
 *       Chain depth is the causal variable; raw damage is not.
 *   attackers                           — every anti-juggle guard in dealDamage
 *       is `attacker.`-keyed, so two attackers defeat all of them at once. A
 *       per-hit attacker count is what makes that pattern legible.
 *   dist / dy / sit                     — the same 9-cell situation key the
 *       tactic grid uses, so telemetry and Sovereign's own learning speak the
 *       same coordinates and a finding can name a cell he can actually act on.
 *
 * Nothing here mutates game state. It wraps dealDamage, records, and forwards.
 * Recording is OFF by default and costs nothing until SovTelemetry.start().
 */

const SovTelemetry = (function () {

  const RING = 4000;          // hits retained; a 7200-frame match lands ~200-900
  let _events   = [];
  let _on       = false;
  let _wrapped  = false;
  let _label    = '';
  let _lastHitOn = new Map(); // victim -> frameCount of their previous hit

  const _fc = () => (typeof frameCount !== 'undefined' ? frameCount : 0);

  function _name(f) {
    if (!f) return '?';
    if (f.isTrueForm) return 'TRUEFORM';
    if (f.isBoss)     return 'BOSS';
    if (f._isSovereign || f.constructor && f.constructor.name === 'SovereignMK2') return 'SOVEREIGN';
    return f.name || (f.isAI ? 'BOT' : 'PLAYER');
  }

  // Same buckets as SovereignMK2._situationKey, deliberately. A finding phrased
  // in a cell he does not index is a finding he cannot act on.
  function _sit(a, v) {
    if (!a || !v) return null;
    const d  = Math.abs(v.cx() - a.cx());
    const dy = v.cy() - a.cy();
    return (d < 90 ? 'c' : d < 220 ? 'm' : 'f') + (dy < -40 ? 'a' : dy > 40 ? 'b' : 'l');
  }

  // Victim state AT the moment of the hit — read before dealDamage mutates it.
  function _victimState(v) {
    if (!v) return {};
    const air = !v.onGround;
    return {
      air,
      // "Landing" is the window a fighter is committed to touching down in and
      // cannot act out of. No engine flag marks it, so it is inferred: falling
      // fast and close to the ground. Coarse on purpose — the signal is whether
      // hits CLUSTER here, not the exact boundary.
      landing:  air && v.vy > 3,
      stunned:  (v.stunTimer || 0) > 0 || (v.ragdollTimer || 0) > 0,
      hurt:     (v.hurtTimer || 0) > 0,
      shielding: !!v.shielding,
      attacking: (v.cooldown || 0) > 0 || v.state === 'attack',
    };
  }

  // How many DISTINCT living attackers are currently inside striking distance of
  // the victim. The anti-juggle guards cannot see this; it is the whole reason a
  // 2v1 feels illegal.
  function _pressure(v) {
    if (!v || typeof players === 'undefined') return 1;
    let n = 0;
    for (const p of players) {
      if (!p || p === v || p.health <= 0) continue;
      if (typeof areAlliedEntities === 'function' && areAlliedEntities(p, v)) continue;
      if (Math.abs(p.cx() - v.cx()) < 160 && Math.abs(p.cy() - v.cy()) < 120) n++;
    }
    return Math.max(1, n);
  }

  function record(attacker, victim, dmg, kbForce) {
    if (!_on || !victim || dmg <= 0) return;
    const f    = _fc();
    const prev = _lastHitOn.get(victim);
    const gap  = (typeof prev === 'number') ? f - prev : -1;
    _lastHitOn.set(victim, f);

    const vs = _victimState(victim);
    _events.push({
      f,
      atk: _name(attacker),
      vic: _name(victim),
      dmg: Math.round(dmg * 10) / 10,
      kb:  Math.round((kbForce || 0) * 10) / 10,
      hp:  Math.round(victim.health || 0),
      wep: (attacker && attacker.weaponKey) || '?',
      cls: (attacker && attacker.charClass) || 'none',
      sit: _sit(attacker, victim),
      dist: attacker ? Math.round(Math.abs(victim.cx() - attacker.cx())) : -1,
      dy:   attacker ? Math.round(victim.cy() - attacker.cy()) : 0,
      // Hit from the side the victim is NOT facing.
      behind: !!(attacker && victim.facing && Math.sign(attacker.cx() - victim.cx()) !== Math.sign(victim.facing)),
      sinceLast: gap,
      // A hit inside 30 frames of the last one on the same victim is a chain
      // link, not a fresh exchange. 30f is the tactic grid's own resolve window.
      chain: gap >= 0 && gap <= 30,
      pressure: _pressure(victim),
      ...vs,
    });
    if (_events.length > RING) _events.splice(0, _events.length - RING);
  }

  // ── Rollup ────────────────────────────────────────────────────────────────
  // What actually goes to the model. Raw events are for drilling in; a 900-hit
  // log handed to a 3B model is exactly the long-context dilution that makes
  // small models worse. The digest is ~40 lines and carries the causal shape.
  function digest(subject) {
    const S = subject || 'SOVEREIGN';
    const taken = _events.filter(e => e.vic === S);
    const dealt = _events.filter(e => e.atk === S);
    const pct   = (n, d) => d > 0 ? Math.round(n / d * 1000) / 10 : 0;

    function stateBreakdown(list) {
      const n = list.length;
      return {
        total: n,
        airborne:  pct(list.filter(e => e.air).length, n),
        landing:   pct(list.filter(e => e.landing).length, n),
        stunned:   pct(list.filter(e => e.stunned).length, n),
        shielding: pct(list.filter(e => e.shielding).length, n),
        attacking: pct(list.filter(e => e.attacking).length, n),
        fromBehind: pct(list.filter(e => e.behind).length, n),
        chained:   pct(list.filter(e => e.chain).length, n),
        multiAttacker: pct(list.filter(e => e.pressure > 1).length, n),
        avgDmg:    n ? Math.round(list.reduce((s, e) => s + e.dmg, 0) / n * 10) / 10 : 0,
      };
    }

    // Longest unbroken chain on the subject — the juggle length, in hits.
    let worstChain = 0, cur = 0;
    for (const e of taken) { if (e.chain) { cur++; worstChain = Math.max(worstChain, cur + 1); } else cur = 0; }

    const bySit = {};
    for (const e of taken) {
      if (!e.sit) continue;
      (bySit[e.sit] = bySit[e.sit] || { hits: 0, dmg: 0 }).hits++;
      bySit[e.sit].dmg += e.dmg;
    }
    const byWep = {};
    for (const e of taken) {
      (byWep[e.wep] = byWep[e.wep] || { hits: 0, dmg: 0 }).hits++;
      byWep[e.wep].dmg += e.dmg;
    }

    return {
      label: _label,
      frames: _fc(),
      taken: stateBreakdown(taken),
      dealt: stateBreakdown(dealt),
      worstChain,
      takenBySituation: bySit,
      takenByWeapon: byWep,
      // Single biggest exchange against the subject — the moment worth explaining.
      worstBurst: (() => {
        let best = null, run = [], acc = 0;
        for (const e of taken) {
          if (e.chain) { run.push(e); acc += e.dmg; }
          else { if (!best || acc > best.dmg) best = { dmg: Math.round(acc), hits: run.length, at: run[0] && run[0].f }; run = [e]; acc = e.dmg; }
        }
        if (!best || acc > best.dmg) best = { dmg: Math.round(acc), hits: run.length, at: run[0] && run[0].f };
        return best;
      })(),
    };
  }

  // ── dealDamage wrap ───────────────────────────────────────────────────────
  // Wrapping rather than editing smb-combat.js keeps the damage pipeline the
  // single source of truth and means telemetry can never change an outcome:
  // we read state, call through, and return whatever it returned.
  function _wrap() {
    if (_wrapped) return;
    const g = (typeof window !== 'undefined') ? window : globalThis;
    const orig = g.dealDamage;
    if (typeof orig !== 'function') return;   // retried on start()
    g.dealDamage = function (attacker, target, dmg, kbForce) {
      if (_on) { try { record(attacker, target, dmg, kbForce); } catch (e) { /* never break combat */ } }
      return orig.apply(this, arguments);
    };
    _wrapped = true;
  }

  return {
    start(label) { _label = label || ''; _events = []; _lastHitOn = new Map(); _wrap(); _on = true; },
    stop()       { _on = false; },
    reset()      { _events = []; _lastHitOn = new Map(); },
    get on()     { return _on; },
    events()     { return _events.slice(); },
    digest,
    // Raw slice for drill-down once the digest has pointed somewhere.
    around(frame, span) {
      const s = span || 90;
      return _events.filter(e => Math.abs(e.f - frame) <= s);
    },
  };
})();

if (typeof window !== 'undefined') window.SovTelemetry = SovTelemetry;
