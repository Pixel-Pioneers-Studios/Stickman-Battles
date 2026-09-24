'use strict';
/*
 * smb-sov-scenarios.js — the stress environments Sovereign trains against.
 *
 * THE DESIGN CONSTRAINT THAT MATTERS
 * A scenario only forces adaptation if no single fixed policy wins it and the
 * others. If one behaviour clears the whole set, there is nothing to adapt TO —
 * the optimiser finds that behaviour, pins it, and you have rebuilt the current
 * Sovereign with more compute. That is precisely how the eleven dials ended up
 * saturated at ~0.95 six seconds into every fight.
 *
 * THE FIRST LIBRARY FAILED THAT TEST, MEASURED.
 * The original nine were asserted to be mutually counter-indicated. They were
 * not. Across 16 genomes x 9 scenarios x 3 seeds the mean inter-scenario
 * correlation was +0.238 — 18 of 36 pairs strongly POSITIVE, one negative.
 * Being good at one predicted being good at the rest, i.e. the set measured a
 * single axis (general competence) nine times. And the best single genome never
 * fell below 3.33/5 stocks anywhere: a fixed solution existed.
 *
 * Three findings drove this rebuild:
 *   · parry_wall <-> no_ground correlated +0.87, no_ground <-> ledge +0.72.
 *     Three entries, one test. no_ground also had a genome-spread of 0.08 at a
 *     mean of 4.98 stocks — it did not discriminate between genomes AT ALL.
 *     Both are gone; ledge_executioner survives as a POLICY for compositions.
 *   · attrition_tank was the one genuinely orthogonal entry, negative against
 *     almost everything (untouchable -0.49, parry_wall -0.28). Patience-vs-
 *     commitment is the only tension that materialised, so the rebuild is
 *     organised around it rather than around a prettier six-way chain.
 *   · glass_cannon sat near zero with everything — independent, which is worth
 *     as much as opposed.
 *
 * regenerator and escalator are new, and exist to WEIGHT the commitment pole:
 * both make passivity lose on the clock rather than on damage, which is the
 * one mechanism the old set had exactly one example of.
 *
 * Re-run the correlation check after touching this file. The claim that the set
 * has no fixed solution is a measurement, and it stopped being true once.
 *
 * `punishes` is also the prose VECTOR reads. It is not a comment — it is the
 * brief that lets a small model say something useful about a result.
 */

const SovScenarios = (function () {

  // ── Extra opponent policies ───────────────────────────────────────────────
  // The trainer ships four (turtle / rusher / zoner / aerial). These add the
  // behaviours the base four cannot express. Registered through a hook rather
  // than by editing _applyPolicy's switch, so the existing four are untouched.
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

    // Exploits inferAct the way a human would. inferAct turns his swing into a
    // guard when their swings START together, so: swing as he steps into range
    // (when he tends to swing too), never swing into a raised guard (a fresh one
    // parries), and hit the moment it drops. Human-limited on purpose — it reacts
    // to his approach and to his guard, never to the first frame of his swing,
    // which no person can see in time. Used by tools/sov-bait.js to measure
    // whether he stops falling for it, and how fast.
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

    // Hits the landing. Targets the single measured weakness: 126 of 127 hits
    // Sovereign took landed airborne or in landing recovery.
    //
    // FIRST VERSION WAS BROKEN and the fix is the instructive part. It only
    // attacked when the target was already falling — so against a Sovereign who
    // spends most of a match grounded it swung 16 times in 7200 frames and lost
    // 5-0. A specialist that does nothing outside its specialty is not a
    // specialist, it is an absence. It now fights a normal ground game and
    // SWITCHES to the trap when the opening appears.
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

    // Fights with its back to open air and drags the exchange toward the edge.
    // 5 of 8 player deaths in the July replay set were edge ringouts at healthy
    // HP — position, not damage, is the kill condition it tests.
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
    //
    // ALSO BROKEN FIRST TIME, same shape of error: it retreated at d < R*1.4 but
    // only swung at d < R*1.5, so the retreat band and the attack band shared an
    // edge and it spent the match backing out of its own range — 286 swings, ZERO
    // damage. The retreat threshold now sits well inside the attack threshold, so
    // there is a band where it is committed to hitting rather than oscillating.
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

    // Heals steadily, so chip damage is erased and only burst kills it. The
    // commitment axis needs more than one member: attrition_tank was the sole
    // entry negatively correlated with the rest of the old library, and one
    // orthogonal scenario is an anecdote rather than an axis.
    regenerator(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      // Regen is applied directly, never through dealDamage — this is healing,
      // not negative damage, and routing it through the damage pipeline would
      // trip shields, multipliers and hit-stop.
      if (f.health > 0 && f.health < f.maxHealth) f.health = Math.min(f.maxHealth, f.health + 0.14);
      f.shielding = d < 140 && (f.cooldown || 0) <= 0 && Math.random() < 0.5;
      if (d > 110) f.vx = dir * 4.0; else if (d < 70) f.vx = -dir * 2.6; else f.vx *= 0.8;
      if (d < 100 && f.cooldown <= 0) { f.shielding = false; f.attack(t); }
    },

    // Gets stronger the longer the match runs. Stalling is not neutral here —
    // it is the losing move, which is the cleanest possible opposite of the
    // "never take a risk" behaviour the old library rewarded nine ways.
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

    // Habit-engine test pair (js/smb-sov-habits.js, C1 / _habitGate). Neither
    // does anything but the one thing its name says — deliberately narrow, so a
    // veto rate difference between them can only be explained by that one axis.
    //
    // Swings whenever the opponent is airborne within reach, otherwise holds
    // position. Measures whether he learns to stop giving this opponent the air.
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
        f.vx = 0;   // holds position — never chases, never punishes ground
      }
    },

    // Approaches and swings at a grounded opponent, never at an airborne one.
    // The control side of the pair: this opponent gives him no reason to ever
    // avoid the air, so a real learner should stay loose against it.
    ground_brawler(f) {
      const t = f.target; if (!t || t.health <= 0) return;
      const dx = t.cx() - f.cx(), d = Math.abs(dx), dir = Math.sign(dx) || 1;
      f.facing = dir;
      f.shielding = false;
      const R = (f.weapon && f.weapon.range) || 90;
      if (d > R * 0.8) f.vx = dir * 4.4; else f.vx *= 0.7;
      if (t.onGround && d < R + 10 && f.cooldown <= 0) f.attack(t);
    },

    // Deliberately erratic. Exists as a CONTROL: if Sovereign scores the same
    // against noise as against a real policy, whatever he "learned" about that
    // policy was not about the policy.
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

  // Every policy above plus the trainer's own four. This is the enum VECTOR's
  // structured output is constrained to.
  const POLICY_NAMES = ['turtle', 'rusher', 'zoner', 'aerial'].concat(Object.keys(POLICIES));

  // Hook consumed by _applyPolicy in smb-smk2-training.js.
  function policyFn(name) {
    const fn = POLICIES[name];
    if (!fn) return null;
    return function () {
      try {
        // ── WHOLE KIT, EVERY POLICY ───────────────────────────────────────────
        // Not one policy in this file used an ability or a super; measured over
        // a full sweep, the opponent's abilityCooldown was 0 on 23,142 of 23,142
        // samples. Every stress scenario was therefore testing Sovereign against
        // a third of a fighter, and his answers to the other two thirds — volley
        // standoff, shield timing, i-frame reads — could be neither rewarded nor
        // punished. Routed through the trainer's single helper so there is one
        // definition rather than two that drift.
        const t = this.target;
        if (t && t.health > 0 && typeof window !== 'undefined' && window._policyUseKit) {
          const d = Math.abs(t.cx() - this.cx());
          if (window._policyUseKit(this, t, d, { abi: 0.045, sup: 0.013, abiRange: 2.4 })) return;
        }
        fn(this);
      } catch (e) { /* a broken policy must not kill the match */ }
    };
  }

  // ── The stress library ────────────────────────────────────────────────────
  // `punishes` is the brief. `bots` is the roster. `env` overrides physics.
  const LIBRARY = {
    parry_wall: {
      punishes: 'Blind pressure. It shields everything on approach and punishes the recovery of any swing that bounces off, so opening with offence loses stocks. Winning it requires waiting out the guard or breaking it.',
      // dmg 2.2 is measured, not chosen: a damage sweep put him at 4.3/5 stocks
      // at x1 and 2.0/5 at x2.2, which is the band where the scenario actually
      // decides matches instead of decorating them.
      bots: [{ w: 'sword', c: 'none', policy: 'parry_wall', dmg: 2.2 }],
    },
    attrition_tank: {
      punishes: 'Patience and super-hoarding. It has triple health and hits hard enough that stalling is not free, so a cautious Sovereign runs out of match before he runs out of opponent. Winning it requires committing and spending resources early.',
      // dmg was 0.45 in the first build and he took 24 damage across a full
      // match — a scenario that cannot hurt you does not punish anything. The
      // threat has to be real for the patience it tests to cost something.
      bots: [{ w: 'hammer', c: 'none', policy: 'turtle', hp: 3.5, dmg: 2.9 }],
    },
    glass_cannon: {
      punishes: 'Trading. It dies in a few hits but every hit it lands is enormous, so any exchange Sovereign accepts on even terms loses him the stock. Winning it requires spacing and clean punishes, never trades.',
      bots: [{ w: 'scythe', c: 'none', policy: 'rusher', hp: 0.35, dmg: 3.2 }],
    },
    untouchable: {
      punishes: 'Spacing and passivity. It outranges him and retreats on contact, so holding a neutral distance cedes the entire match. Winning it requires closing distance under fire.',
      // Kept because it is the strongest NEGATIVE pair in the whole library
      // (-0.49 against attrition_tank) — it anchors the other end of the
      // commitment axis. But at dmg 1.4 it left him on 4.83/5 stocks with a
      // genome-spread of 0.24, so it was anchoring with no weight behind it.
      // Two of them, and hard enough to punish a stall.
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
      // dmg 2.8 measured: at 1.0 it left him on 4.88/5 with a genome-spread of
      // 0.16 — the same "does not discriminate" defect that got no_ground
      // deleted, and it made escalator's (good) negative correlations noise.
      // The damage ladder read x1:4.83  x2:3.33  x2.8:2.67  x3.6:2.83.
      // One bot, not two: a second escalator measured EASIER (5.0 stocks at x1),
      // because they crowd each other out of the ramp window.
      bots: [{ w: 'hammer', c: 'none', policy: 'escalator', hp: 1.6, dmg: 2.8 }],
    },
    noise_control: {
      punishes: 'Nothing — deliberately. An erratic opponent is the control arm: a genome that scores the same here as against a real policy did not learn that policy, it learned the match length.',
      bots: [{ w: 'sword', c: 'none', policy: 'random_walk' }],
    },
  };

  const NAMES = Object.keys(LIBRARY);

  // ── Spec validation ───────────────────────────────────────────────────────
  // Everything VECTOR produces comes through here. A small model constrained to
  // an enum still emits out-of-range numbers and occasionally a roster of
  // thirty; clamping is what makes an unreliable author safe to automate.
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

  // ── Auto-calibration ──────────────────────────────────────────────────────
  // MEASURED FAILURE THIS FIXES: across four research cycles (two on
  // llama3.2:3b, two on qwen2.5-coder:14b) every model-authored scenario came
  // back EASIER than the baseline worst case — by 971, 4026, 4314 and 5405
  // fitness. Not one was a stressor. The descriptions were fine; the 14b named
  // Sovereign's weakness correctly both times. What neither model could do was
  // pick the NUMBERS, because the relationship between an hp/dmg multiplier and
  // actual difficulty is not inferable from a prompt — it took a five-point
  // damage sweep to learn that gauntlet flips from 4.2 stocks to 0.5 between
  // x1 and x3. A model asked to guess that will guess wrong, and did, 4/4.
  //
  // So the labour is split along the line each side is actually good at: the
  // model chooses the COMPOSITION (which policies, how many, what weapons —
  // the mechanism it just described), and this search chooses the MAGNITUDE by
  // escalating damage until Sovereign's stock count falls into the target band.
  // Nobody has to guess a multiplier ever again.
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

  // ── Run ───────────────────────────────────────────────────────────────────
  // Delegates to SMK2Trainer.runMatch, which owns the sim environment, the frame
  // loop and the fitness. This module contributes the roster and the brief; it
  // does not reimplement a match.
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

  // Full sweep — the worst-case score across the set is the only number that
  // means "cannot be beaten by a fixed policy".
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
