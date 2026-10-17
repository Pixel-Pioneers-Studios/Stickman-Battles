'use strict';
/*
 * smb-sov-scenarios.js: the stress environments Sovereign trains against.
 *
 * A scenario only forces adaptation if no single fixed policy beats the whole set. The first set failed
 * this: its scenarios were correlated, so one behaviour cleared them all. Patience vs commitment is the
 * axis the set is built around. Re-run the correlation check after changing this file.
 *
 * `punishes` is also the prose VECTOR reads.
 */

const SovScenarios = (function () {

  // Extra opponent policies, registered via a hook so the trainer's four stay untouched.
  const POLICIES = {

    // Shields on reaction, punishes the recovery of whatever just bounced off.
    // Beats anyone who opens with pressure and has no shield-break answer.
    parry_wall(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      const theyCommitted = (t.cooldown || 0) > 0 || t.state === 'attack';
      f.shielding = d < 150 && !theyCommitted;
      if (d > 120) f.vx = dir * 4.2;
      else if (d < 70) f.vx = -dir * 3.0;
      else f.vx *= 0.8;
      // The punish window: they swung and are in recovery.
      if (theyCommitted && d < 100 && f.cooldown <= 0) { f.shielding = false; f.attack(t); }
    },

    // Exploits inferAct: it turns his swing into a guard when swings start together, so swing as he steps
    // into range, never into a raised guard, and hit the moment it drops. Reacts only to human-visible cues.
    // Used by tools/sov-bait.js to measure whether he stops falling for it.
    guard_baiter(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      f.shielding = false;
      const tR = (t.weapon && t.weapon.range) || 90;
      const R  = (f.weapon && f.weapon.range) || 90;
      const guardUp = !!t.shielding;
      const dropped = f._bgPrevGuard && !guardUp;
      f._bgPrevGuard = guardUp;
      const closing = f._bgPrevD !== undefined && d < f._bgPrevD - 0.5;
      f._bgPrevD = d;
      // Hover at the edge of HIS reach, so every approach is his decision.
      if (d > tR + 25) f.vx = dir * 4.0;
      else if (d < tR * 0.6) f.vx = -dir * 3.0;
      else f.vx *= 0.8;
      if (f.cooldown > 0) return;
      if (guardUp) return;                                   // never into the guard
      if (dropped && d < R + 20) { f._bgPunish = (f._bgPunish || 0) + 1; f.attack(t); return; }
      if (closing && d < Math.min(R, tR) + 10) { f._bgBait = (f._bgBait || 0) + 1; f.attack(t); }
    },

    // Hits the landing. Targets the measured weakness: 126 of 127 hits Sovereign took were airborne or in landing recovery.
    // Attacking only when the target is already falling left it idle while he was grounded, so it fights a normal
    // ground game and switches to the trap when the opening appears.
    landing_trap(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      f.shielding = false;
      const theyFalling = !t.onGround && t.vy > 1.5;
      if (theyFalling) {
        f.vx = dir * 5.4;                                   // converge on the landing spot
        if (d < 120 && f.cooldown <= 0) f.attack(t);
      } else {
        // Baseline pressure, so he is never given a free match.
        f.vx = dir * 4.4;
        if (d < 95 && f.cooldown <= 0) f.attack(t);
        // Bait him into the air rather than waiting for him to choose it.
        if (f.onGround && d < 140 && Math.random() < 0.04) f.vy = -12;
      }
    },

    // Fights with its back to open air and drags the exchange toward the edge. Position is the kill condition tested here.
    ledge_executioner(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      f.shielding = false;
      const W = (typeof GAME_W !== 'undefined') ? GAME_W : 900;
      // Push them toward whichever edge is nearer to them.
      const edgeDir = (t.cx() > W / 2) ? 1 : -1;
      f.vx = (d > 90) ? dir * 4.8 : edgeDir * 4.8;
      if (d < 100 && f.cooldown <= 0) f.attack(t);
      if (f.onGround && d < 60 && Math.random() < 0.03) f.vy = -11;
    },

    // Never commits, never stops chipping. Punishes impatience.
    // Retreat band sits well inside the attack band, so it commits to hitting instead of oscillating at the edge.
    chip(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      const R = (f.weapon && f.weapon.range) || 90;
      f.shielding = d < R * 0.5;
      if (d < R * 0.7) f.vx = -dir * 4.4;          // only back off when genuinely crowded
      else if (d > R * 1.15) f.vx = dir * 3.6;     // otherwise close to the edge of range
      else f.vx *= 0.7;
      if (d < R * 1.05 && f.cooldown <= 0) f.attack(t);
    },

    // Heals steadily, so chip damage is erased and only burst kills it. The commitment axis needs more than one member.
    regenerator(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      // Applied directly, not through dealDamage: healing must not trip shields, multipliers or hit-stop.
      if (f.health > 0 && f.health < f.maxHealth) f.health = Math.min(f.maxHealth, f.health + 0.14);
      f.shielding = d < 140 && (f.cooldown || 0) <= 0 && Math.random() < 0.5;
      if (d > 110) f.vx = dir * 4.0; else if (d < 70) f.vx = -dir * 2.6; else f.vx *= 0.8;
      if (d < 100 && f.cooldown <= 0) { f.shielding = false; f.attack(t); }
    },

    // Gets stronger the longer the match runs, so stalling loses.
    escalator(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      f.shielding = false;
      if (f._escBase == null) f._escBase = f.dmgMult || 1;
      const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
      // x1 at the opening, x3 of its own base by the 7200-frame limit.
      f.dmgMult = f._escBase * (1 + Math.min(2, fc / 3600));
      f.vx = dir * (4.2 + Math.min(1.6, fc / 4500));
      if (f.onGround && d > 200 && Math.random() < 0.02) f.vy = -12;
      if (d < 100 && f.cooldown <= 0) f.attack(t);
    },

    // Habit-engine test pair (js/smb-sov-habits.js). Each does one thing its name says.
    // Swings whenever the opponent is airborne within reach, otherwise holds position.
    anti_air_hawk(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      f.shielding = false;
      const reach = ((f.weapon && f.weapon.range) || 90) + 40;
      if (!t.onGround && d < reach) {
        if (f.cooldown <= 0) f.attack(t);
        f.vx *= 0.5;
      } else {
        f.vx = 0;   // holds position, never chases, never punishes ground
      }
    },

    // Swings at grounded opponents, never airborne ones. Control for the pair: no reason to avoid the air.
    ground_brawler(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      f.shielding = false;
      const R = (f.weapon && f.weapon.range) || 90;
      if (d > R * 0.8) f.vx = dir * 4.4; else f.vx *= 0.7;
      if (t.onGround && d < R + 10 && f.cooldown <= 0) f.attack(t);
    },

    // Erratic on purpose. As a control: if Sovereign scores the same against noise, the learning was not about the policy.
    random_walk(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      if (!f._rwT || f._rwT <= 0) { f._rwT = 20 + Math.random() * 40; f._rwD = Math.random() < 0.5 ? -1 : 1; }
      f._rwT--;
      f.shielding = Math.random() < 0.15;
      f.vx = f._rwD * 4.0;
      if (f.onGround && Math.random() < 0.03) f.vy = -13;
      if (d < 100 && f.cooldown <= 0 && Math.random() < 0.3) f.attack(t);
    },
  };

  // Every policy above plus the trainer's four. VECTOR's structured output is constrained to this enum.
  const POLICY_NAMES = ['turtle', 'rusher', 'zoner', 'aerial'].concat(Object.keys(POLICIES));

  // Hook consumed by _applyPolicy in smb-smk2-training.js.
  function policyFn(name) {
    const fn = POLICIES[name];
    if (!fn) return null;
    return function () {
      try {
        // Whole kit: abilities and supers. Without them, stress scenarios tested Sovereign against a third of a fighter.
        const t = this.target;
        if (t && t.health > 0 && typeof window !== 'undefined' && window._policyUseKit) {
          const d = Math.abs(t.cx() - this.cx());
          if (window._policyUseKit(this, t, d, { abi: 0.045, sup: 0.013, abiRange: 2.4 })) return;
        }
        fn(this);
      } catch (e) { /* a broken policy must not kill the match */ }
    };
  }

  // The stress library. `punishes` is the brief, `bots` the roster, `env` overrides physics.
  const LIBRARY = {
    parry_wall: {
      punishes: 'Blind pressure. It shields everything on approach and punishes the recovery of any swing that bounces off, so opening with offence loses stocks. Winning it requires waiting out the guard or breaking it.',
      // dmg 2.2 is measured: he holds 4.3/5 stocks at x1 and 2.0/5 at x2.2, the band where the scenario decides matches.
      bots: [{ w: 'sword', c: 'none', policy: 'parry_wall', dmg: 2.2 }],
    },
    attrition_tank: {
      punishes: 'Patience and super-hoarding. It has triple health and hits hard enough that stalling is not free, so a cautious Sovereign runs out of match before he runs out of opponent. Winning it requires committing and spending resources early.',
      // dmg 0.45 let him take 24 damage over a match. A scenario that cannot hurt does not punish anything.
      bots: [{ w: 'hammer', c: 'none', policy: 'turtle', hp: 3.5, dmg: 2.9 }],
    },
    glass_cannon: {
      punishes: 'Trading. It dies in a few hits but every hit it lands is enormous, so any exchange Sovereign accepts on even terms loses him the stock. Winning it requires spacing and clean punishes, never trades.',
      bots: [{ w: 'scythe', c: 'none', policy: 'rusher', hp: 0.35, dmg: 3.2 }],
    },
    untouchable: {
      punishes: 'Spacing and passivity. It outranges him and retreats on contact, so holding a neutral distance cedes the entire match. Winning it requires closing distance under fire.',
      // Strongest negative pair (-0.49 vs attrition_tank), so it anchors the commitment axis. Two, to punish a stall.
      bots: [{ w: 'spear', c: 'none', policy: 'chip', dmg: 2.6 },
             { w: 'spear', c: 'none', policy: 'chip', dmg: 2.6 }],
    },
    landing_trap: {
      punishes: 'Closing by air. It ignores him on the ground and converges on every landing, hitting the recovery window he cannot act out of. Winning it requires approaching on the ground or varying landing timing.',
      bots: [{ w: 'sword', c: 'none', policy: 'landing_trap', dmg: 3.0 },
             { w: 'sword', c: 'none', policy: 'landing_trap', dmg: 3.0 }],
    },
    gauntlet: {
      punishes: 'Anything single-target. Four simultaneous attackers defeat every anti-juggle guard at once, because all of them are keyed on the attacker rather than the victim. Winning it requires never being the centre of more than one.',
      bots: [
        { w: 'sword', c: 'none', policy: 'rusher', dmg: 2.2 }, { w: 'spear', c: 'none', policy: 'chip', dmg: 2.2 },
        { w: 'hammer', c: 'none', policy: 'turtle', dmg: 2.2 }, { w: 'sword', c: 'none', policy: 'aerial', dmg: 2.2 },
      ],
    },
    regenerator: {
      punishes: 'Chip damage and hesitation. It heals continuously, so any damage not delivered as burst is simply erased and a careful Sovereign can fight it forever without winning. Winning it requires concentrated output.',
      bots: [{ w: 'sword', c: 'none', policy: 'regenerator', hp: 2.0, dmg: 1.6 }],
    },
    escalator: {
      punishes: 'Stalling, specifically. Its damage triples over the course of the match, so every second Sovereign spends not closing the fight is a second it gets stronger. The safe opening is the losing opening.',
      // dmg 2.8. One bot, not two: a second escalator crowds the first out of the ramp window.
      bots: [{ w: 'hammer', c: 'none', policy: 'escalator', hp: 1.6, dmg: 2.8 }],
    },
    noise_control: {
      punishes: 'Nothing — deliberately. An erratic opponent is the control arm: a genome that scores the same here as against a real policy did not learn that policy, it learned the match length.',
      bots: [{ w: 'sword', c: 'none', policy: 'random_walk' }],
    },
  };

  const NAMES = Object.keys(LIBRARY);

  // Spec validation
  // VECTOR's output passes through here. Enum-constrained models still emit out-of-range numbers, so clamp.
  function validate(spec) {
    if (!spec || typeof spec !== 'object') return null;
    const clamp = (v, lo, hi, dflt) => {
      const n = Number(v);
      return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
    };
    const wepKeys = (typeof WEAPON_KEYS !== 'undefined' && WEAPON_KEYS.length) ? WEAPON_KEYS : ['sword'];
    const clsKeys = (typeof CLASSES !== 'undefined') ? Object.keys(CLASSES) : [];

    const bots = (Array.isArray(spec.bots) ? spec.bots : []).slice(0, 6).map(b => ({
      w: wepKeys.includes(b && b.w) ? b.w : 'sword',
      c: (b && b.c && clsKeys.includes(b.c)) ? b.c : 'none',
      policy: POLICY_NAMES.includes(b && b.policy) ? b.policy : 'rusher',
      hp:  clamp(b && b.hp,  0.25, 4.0, 1),
      dmg: clamp(b && b.dmg, 0.25, 4.0, 1),
    }));
    if (!bots.length) return null;

    const out = {
      name: String(spec.name || 'vector_scenario').replace(/[^a-z0-9_]/gi, '_').slice(0, 40),
      punishes: String(spec.punishes || '').slice(0, 400),
      bots,
      generated: true,
    };
    if (spec.env && typeof spec.env === 'object') {
      out.env = {};
      if (spec.env.floorWidth != null) out.env.floorWidth = clamp(spec.env.floorWidth, 200, 900, 900);
      if (spec.env.gravity    != null) out.env.gravity    = clamp(spec.env.gravity, 0.3, 2.0, 1);
    }
    return out;
  }

  // Auto-calibration
  // Model-authored scenarios came back easier than baseline: a model cannot guess the numbers.
  // The labour is split. The model picks the composition (policies, counts, weapons) and this search picks
  // the magnitude, escalating damage until Sovereign's stock count lands in the target band.
  function calibrate(spec, opts) {
    const o = opts || {};
    const target = o.targetStocks != null ? o.targetStocks : 2.5;
    const seeds  = o.seeds || 3;
    const ladder = [1, 1.6, 2.2, 3.0, 4.0];
    const base   = validate(spec);
    if (!base) return null;
    const trail = [];
    let best = null;
    for (const k of ladder) {
      const test = Object.assign({}, base, {
        bots: base.bots.map(b => Object.assign({}, b, { dmg: Math.min(4, (b.dmg || 1) * k) })),
      });
      let stocks = 0, fit = 0, n = 0;
      for (let i = 0; i < seeds; i++) {
        const r = run(test, o.genome || null, (i + 1) * 7919);
        if (!r) continue;
        stocks += r.result.sovLivesLeft; fit += r.result.fitness; n++;
      }
      if (!n) continue;
      const avgStk = stocks / n, avgFit = fit / n;
      trail.push({ k, stocks: Math.round(avgStk * 10) / 10, fitness: Math.round(avgFit) });
      // Closest to the target band wins; ties break toward the harder rung.
      const err = Math.abs(avgStk - target);
      if (!best || err <= best.err) best = { err, k, spec: test, stocks: avgStk, fitness: avgFit };
      if (avgStk <= target) break;   // escalating further is wasted compute
    }
    if (!best) return null;
    best.spec.name = base.name;
    best.spec.calibratedAt = best.k;
    return { spec: best.spec, stocks: Math.round(best.stocks * 10) / 10,
             fitness: Math.round(best.fitness), ladder: trail };
  }

  function get(name) { return LIBRARY[name] ? Object.assign({ name }, LIBRARY[name]) : null; }
  function all() { return NAMES.map(get); }

  // Run
  // Delegates to SMK2Trainer.runMatch (sim, frame loop, fitness). This module only supplies roster and brief.
  function run(scenario, genome, seed, opts) {
    const s = (typeof scenario === 'string') ? get(scenario) : validate(scenario);
    if (!s) { console.warn('[SovScenarios] invalid scenario'); return null; }
    if (typeof SMK2Trainer === 'undefined' || !SMK2Trainer.runMatch) {
      console.warn('[SovScenarios] SMK2Trainer not loaded'); return null;
    }
    const tele = (typeof SovTelemetry !== 'undefined');
    if (tele) SovTelemetry.start(s.name);
    let r;
    try {
      r = SMK2Trainer.runMatch(genome || null, s.bots.length, seed || (Math.random() * 1e9 | 0), Object.assign({
        duel: true, roster: s.bots, env: s.env || null, noBuff: true,
      }, opts || {}));
    } finally { if (tele) SovTelemetry.stop(); }
    if (!r) return null;
    return {
      scenario: s.name,
      punishes: s.punishes,
      result: r,
      telemetry: tele ? SovTelemetry.digest('SOVEREIGN') : null,
    };
  }

  // Full sweep: the worst case across the set is the only number that means 'cannot be beaten by a fixed policy'.
  function sweep(genome, seedsPer) {
    const n = seedsPer || 2;
    const out = [];
    for (const name of NAMES) {
      for (let i = 0; i < n; i++) {
        const r = run(name, genome, (i + 1) * 7919 + name.length * 104729);
        if (r) out.push(r);
      }
    }
    const byName = {};
    for (const r of out) (byName[r.scenario] = byName[r.scenario] || []).push(r.result.fitness);
    const vec = {}; let worst = Infinity;
    for (const k of Object.keys(byName)) {
      vec[k] = Math.round(byName[k].reduce((a, b) => a + b, 0) / byName[k].length);
      if (vec[k] < worst) worst = vec[k];
    }
    return { vec, worst, runs: out };
  }

  return { LIBRARY, NAMES, POLICY_NAMES, policyFn, validate, calibrate, get, all, run, sweep };
})();

if (typeof window !== 'undefined') window.SovScenarios = SovScenarios;
