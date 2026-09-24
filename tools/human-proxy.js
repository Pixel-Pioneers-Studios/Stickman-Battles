'use strict';
/*
 * tools/human-proxy.js — a hand-written, parameterised "human" opponent for
 * Sovereign, used via `opts.oppAI` in js/smb-smk2-training.js `_runMatch`.
 *
 * NOT a replay-trained mimic (that's tools/ghost-core.js, which came in at
 * ~4.5x a human's damage taken because it copies STYLE, not skill under
 * pressure). This is a policy with explicit, human-plausible LIMITS:
 *
 *   - perceives Sovereign through a delay buffer (reactionFrames)
 *   - re-decides at a limited rate (decisionEvery) for offense/movement, but
 *     EVASION reacts every frame once information clears the SAME delay
 *     buffer — a real dodge is a reflex, not a scheduled decision, and gating
 *     it behind decisionEvery too would make every dodge late by construction
 *   - aim/timing noise on its spacing target and its decision cadence
 *   - drives the SAME fields a keyboard would: vx/facing, jump via vy,
 *     shielding (engine already enforces ground-only + no-landing-lag —
 *     see smb-fighter.js line ~1736 — so this file does not need to
 *     re-implement that), attack()/ability()/useSuper() on decision edges
 *   - respects cooldown (never swings through it) and _landLag implicitly
 *     (attack() itself gates on cooldown, and cooldown is held through
 *     landing lag by the engine)
 *
 * ITERATION 2 — mobility/evasion layer. Replays show the human airborne
 * 63-73% of the time (iter.1's proxy: ~3%, from jumpInRate=0.03 alone), and
 * that airtime is read as what drags Sovereign into the air too (human's
 * Sovereign-airborne% ~66% vs iter.1's sim ~34%). This version adds: jumping
 * away/over an incoming swing (evadeJump), double-jumping when threatened
 * in the air, fast-falling past the apex to land out of reach (fastFallRate),
 * a baseline hop-around tendency even with no immediate threat (airHopRate),
 * and attacking downward when already above the target (aboveAttackRate).
 * Shield use is turned down hard — the human shields only ~4% of frames.
 *
 * Parameters (all tunable by tools/proxy-calibrate.js):
 *   reactionFrames    perception delay, ~12-18 (200-300ms at 60fps)
 *   decisionEvery     frames between offense/movement re-decisions
 *   timingNoiseFr     +/- jitter added to decisionEvery
 *   aimNoise          fractional noise on the preferred spacing distance
 *   spacing           preferred neutral-game distance (px)
 *   antiAir           prob. of swinging at an airborne opponent closing in
 *   whiffPunish       prob. of punishing the instant an opponent's swing ends
 *   pokeRate          prob. of poking when in range and neutral
 *   jumpInRate        prob./decision of jumping in from mid-range (ground game)
 *   shieldUse         prob. of raising shield when opponent is committed and close (kept LOW)
 *   abilityCd         min frames between ability() calls
 *   abilityRate       prob. of using ability when off cooldown and in range
 *   superRate         prob. of using super the moment it's ready and opponent's near
 *   comboFollow       prob. of continuing to press after landing a hit (vs. resetting to neutral)
 *   retreatDiscipline prob. of retreating instead of trading when low on HP
 *   evadeJump         prob./threat-onset of jumping away from an incoming swing in reach
 *   doubleJumpEvade   prob. of double-jumping away when airborne and still threatened
 *   fastFallRate      prob./frame (while past apex) of fast-falling to control the landing
 *   airHopRate        prob./decision of hopping even with no immediate threat (baseline airtime)
 *   aboveAttackRate   prob./decision of attacking downward when already above the target
 *
 * ITERATION 3 — anticipation/read layer (readRate `p`, offenseRead `q`).
 * iter.2 gave the proxy human-plausible AIRTIME but not human-plausible
 * DEFENSE: it still relocates on a generic "he's swinging and close" cue with
 * no idea which attack is coming, so it dodges late or in the wrong direction
 * against Sovereign's real (and adaptive) move set. A human's defense is
 * mostly anticipation + spacing, which a delayed generic cue structurally
 * cannot express — so this models it directly as a calibrated knob instead of
 * trying to fake it with more heuristics: `readRate` (p) is the probability
 * that, the INSTANT Sovereign's current melee swing's hitbox geometrically
 * would connect with the proxy (computed from `_meleeReachDist`, his facing/
 * forward arc, and vertical gap — the same geometry his own AI whiff-guard
 * uses), the proxy reacts with NO reaction delay (it "read" the attack) and
 * picks whichever escape actually clears that geometry (jump away, double-
 * jump away if already airborne, step out, rarely shield). With probability
 * 1-p it falls through to the normal delayed `evade()` layer above, unchanged.
 * `offenseRead` (q) is the same idea for the offensive side: the instant his
 * swing truly ends (not the delayed-perception edge `decide()` uses), punish
 * with no delay. Both are 0 by default — pure calibration knobs, not part of
 * the "generic reflex" behavior model.
 *
 * ITERATION 4 — anti-air DESCENT catch (`antiAirDescent`). Moment-level
 * analysis (docs/sovereign-adaptive-project.md) found the human's single
 * biggest opener source is `descend_level_near` — 30% of all their openers —
 * from waiting under/level with him and hitting him as he falls back into
 * range unarmed (net +35.7 openers/min in the human's favor; v3 proxy nets
 * only +3.9 there, and actively LOSES the `takeoff_near` moment by jumping up
 * into him instead). This models that specifically: through the SAME delayed
 * perception buffer as everything else (not the undelayed iter.3 read), when
 * he's airborne and falling, project his landing spot from (x, y, vx, vy) and
 * a fixed gravity constant (matches the sim's default arena gravity), hold
 * ground under that spot instead of jumping to meet him, and time a swing
 * with timing noise so its active frame lines up with his arrival. Also
 * suppresses the proxy's OWN jump-in/air-hop while this opportunity is live —
 * that's what was trading on `takeoff_near`. Default 0 (off): a params file
 * saved before this iteration behaves identically, since every branch here is
 * gated on `antiAirDescent > 0`.
 */
(function (root) {

  const DEFAULTS = {
    reactionFrames: 14,
    decisionEvery: 4,
    timingNoiseFr: 3,
    aimNoise: 0.18,
    spacing: 95,
    antiAir: 0.55,
    whiffPunish: 0.6,
    pokeRate: 0.55,
    jumpInRate: 0.03,
    shieldUse: 0.04,
    abilityCd: 100,
    abilityRate: 0.35,
    superRate: 0.85,
    comboFollow: 0.65,
    retreatDiscipline: 0.5,
    evadeJump: 0.55,
    doubleJumpEvade: 0.45,
    fastFallRate: 0.35,
    airHopRate: 0.12,
    aboveAttackRate: 0.5,
    readRate: 0,        // p — anticipation-based evasion, see iteration-3 note above
    offenseRead: 0,      // q — anticipation-based whiff punish
    antiAirDescent: 0,        // iteration-4: prob./opportunity of holding ground to catch his descent
    antiAirDescentRange: 150, // px window around the predicted landing spot
    antiAirDescentLead: 5,    // frames of timing noise around the predicted arrival
  };

  // A Fighter-shaped "self" driven by this controller must expose: x, y, vx,
  // vy, facing, onGround, cooldown, attackTimer, shielding, stunTimer,
  // ragdollTimer, health, maxHealth, superReady, classSpeedMult, weapon,
  // canDoubleJump, coyoteFrames, attack(tgt), ability(tgt), useSuper(tgt),
  // target. All standard Fighter fields — no engine changes needed to drive
  // them from outside processInput.
  function controller(params) {
    const P = Object.assign({}, DEFAULTS, params || {});
    let hist = [];               // delayed perception buffer of the opponent
    let held = { mv: 'n', sh: false };
    let nextDecision = 0;
    let lastAbility = -1e9;
    let frame = 0;
    let prevOppAtk = false;
    let prevThreat = false;      // edge-detect for evasion (rising edge only)
    let pressing = false;        // combo-follow state: currently in an exchange
    let prevWouldHit = false;    // TRUE (undelayed) geometric-threat edge, for readRate
    let prevTrueAtk = false;     // TRUE (undelayed) swing-active flag, for offenseRead
    let holdForCatch = false;    // iteration-4: true while positioning for a descent catch

    function groundJump(self) {
      self.vy = -17; self.canDoubleJump = true; self.coyoteFrames = 0;
    }
    function doubleJump(self) {
      self.vy = -13; self.canDoubleJump = false;
    }
    function jumpIn(self) {
      if (self.onGround || (self.coyoteFrames > 0 && !self.canDoubleJump)) groundJump(self);
      else if (self.canDoubleJump) doubleJump(self);
    }

    // ── Evasion + mobility: runs every frame off the delayed perception, not
    // gated by decisionEvery — a dodge is a reflex bounded by reaction time,
    // not by the slower cadence a human re-evaluates strategy at. ────────────
    function evade(self, tgt, perc) {
      const dirTo = Math.sign(perc.x - self.x) || 1;
      const d = Math.abs(perc.x - self.x);
      const R = (self.weapon && self.weapon.range) || 90;
      const threat = perc.atk && d < R * 1.35;
      const oppClosing = Math.sign(perc.vx || 0) === -dirTo && Math.abs(perc.vx || 0) > 2;

      // Rising edge: their swing/approach just became dangerous — dodge NOW.
      if (threat && !prevThreat) {
        if (self.onGround && Math.random() < P.evadeJump) {
          groundJump(self);
          held.mv = 'a'; // jump AWAY, not over — clears the swing's hitbox faster
        } else if (!self.onGround && self.canDoubleJump && Math.random() < P.doubleJumpEvade) {
          doubleJump(self);
          held.mv = 'a';
        }
      }
      // Still threatened in the air and a double jump is available — take it.
      if (!self.onGround && (threat || (oppClosing && d < R * 1.6)) && self.canDoubleJump &&
          Math.random() < P.doubleJumpEvade * 0.5) {
        doubleJump(self); held.mv = 'a';
      }
      prevThreat = threat;

      // Fast-fall past the apex to control the landing (away from the swing,
      // or straight down onto a grounded opponent to close a gap quickly).
      if (!self.onGround && self.vy > -1 && Math.random() < P.fastFallRate) {
        self.vy = Math.max(self.vy, 13); // FAST_FALL_VY
      }
    }

    // ── Iteration 4: predict where an airborne, falling opponent will reach
    // self's height, from the DELAYED perception snapshot — a human reads
    // this from the arc, not from true state, unlike iteration 3's melee-hit
    // read. Gravity is a fixed approximation of the sim's default arena value
    // (js/smb-fighter.js ~line 1781, arenaGravity ≈ 0.65 on a plain arena);
    // this is anticipation, not physics simulation, so an approximation is
    // the honest way to model it.
    const GRAV_APPROX = 0.65;
    function predictDescent(self, perc) {
      if (perc.g || (perc.vy || 0) <= 0.5) return null; // not airborne-and-falling
      const dy = self.y - perc.y; // positive: opponent still above self's level
      if (dy <= 0) return null;
      const disc = perc.vy * perc.vy + 2 * GRAV_APPROX * dy;
      if (disc < 0) return null;
      const t = (-perc.vy + Math.sqrt(disc)) / GRAV_APPROX;
      if (!isFinite(t) || t < 0) return null;
      return { t, xPred: perc.x + (perc.vx || 0) * t };
    }

    // Hold ground under the predicted landing spot and time a swing to catch
    // him entering reach. Returns true while the opportunity is live, so the
    // caller can suppress its own jump-in/air-hop (that's what was trading
    // with him on takeoff instead of catching the descent).
    function antiAirCatch(self, tgt, perc) {
      // Not gated on self.onGround: the moment classifier keys off HIS motion
      // and proximity only, and with the proxy airborne ~55-60% of the time
      // (iteration 2), restricting the catch to "already grounded" starved
      // it of opportunities — measured: time% in descend_level_near barely
      // moved across antiAirDescent 0/0.5/0.7/0.9 (7.1/7.2/6.9/7.3) when
      // gated this way. Drifting toward the landing spot works whether
      // airborne or grounded; the timed swing still only fires once in reach.
      if (!(P.antiAirDescent > 0)) return false;
      const pred = predictDescent(self, perc);
      if (!pred) return false;
      if (Math.abs(pred.xPred - self.x) > P.antiAirDescentRange) return false;
      if (Math.random() >= P.antiAirDescent) return false; // not every opportunity is read

      // Step under the landing spot rather than chasing him air-to-air.
      if (Math.abs(self.x - pred.xPred) > 12) {
        self.vx = Math.sign(pred.xPred - self.x) * 5.2 * (self.classSpeedMult || 1);
        self.facing = Math.sign(tgt.x - self.x) || self.facing;
      } else {
        self.vx = 0;
      }
      held.mv = 'n'; // driving vx directly above — don't let the generic
                      // toward/away block overwrite it against tgt's position

      // Timed swing: fire as he's about to arrive, with timing noise instead
      // of a frame-perfect trigger.
      const R = (self.weapon && self.weapon.range) || 90;
      const leadNoise = P.antiAirDescentLead * (0.6 + Math.random() * 0.8);
      if (pred.t <= leadNoise && Math.abs(tgt.x - self.x) < R * 1.2 && (self.cooldown || 0) <= 0) {
        self.attack(tgt); pressing = true;
      }
      return true;
    }

    // ── TRUE (undelayed) geometric threat check — the anticipation layer. ──
    // Melee only: only melee weapons have a stable arc/reach an outside
    // observer can project (ranged/ability hitboxes vary too much to model
    // generically here — see the iteration-3 report's honesty note).
    function meleeAttackWouldHit(self, tgt) {
      if (!tgt || (tgt.attackTimer || 0) <= 0) return false;
      const w = tgt.weapon;
      if (!w || w.type !== 'melee') return false;
      const reach = (typeof tgt._meleeReachDist === 'function') ? tgt._meleeReachDist(self) : (w.range || 90) + 40;
      const dx = self.x - tgt.x, d = Math.abs(dx);
      if (d > reach) return false;
      // Forward-arc cone: outside it (behind the swing) only matters once
      // very close, where wide arcs and drawScale slack still catch you.
      const facing = tgt.facing || 1;
      if (Math.sign(dx || 1) !== facing && d > reach * 0.45) return false;
      const dy = Math.abs((self.y + (self.h || 60) / 2) - (tgt.y + (tgt.h || 60) / 2));
      if (dy > (self.h || 60) * 1.15) return false;
      return true;
    }

    // Pick the escape that actually clears the geometry above, given current
    // ground/air state — no reaction delay, this fires on the true frame.
    function performReadEscape(self, tgt) {
      if (!self.onGround) {
        // Already airborne: a double jump clears both axes fastest; failing
        // that, drift away is still strictly better than holding still.
        if (self.canDoubleJump) doubleJump(self);
        held.mv = 'a';
        return;
      }
      const r = Math.random();
      if (r < 0.12) { held.sh = true; return; } // rare shield escape (human shields ~4% overall)
      const d = Math.abs(self.x - tgt.x);
      const reach = (typeof tgt._meleeReachDist === 'function') ? tgt._meleeReachDist(self) : 140;
      if (d > reach * 0.75) { held.mv = 'a'; return; } // near the reach edge: a step out clears it
      groundJump(self); held.mv = 'a';                  // deep in reach: jump away clears both axes
    }

    function decide(self, tgt, perc) {
      const dirTo = Math.sign(perc.x - self.x) || 1;
      const d = Math.abs(perc.x - self.x);
      const dy = perc.y - self.y;       // negative: opponent is ABOVE self; positive: self is above opponent
      const noisySpacing = P.spacing * (1 + (Math.random() * 2 - 1) * P.aimNoise);
      const R = (self.weapon && self.weapon.range) || 90;
      const hpFrac = self.health / Math.max(1, self.maxHealth);
      const threat = perc.atk && d < R * 1.35;

      // ── Movement: hold toward/away/neutral, like a human holding a key ──
      // (evade() may have just overridden held.mv this frame — only reassign
      // it here when there's no live threat, so a dodge isn't immediately
      // cancelled by the next neutral-game movement call. holdForCatch also
      // owns movement this frame — don't walk out from under the landing spot.)
      if (!threat && !holdForCatch) {
        if (hpFrac < 0.3 && Math.random() < P.retreatDiscipline) {
          held.mv = d < noisySpacing ? 'a' : (d > noisySpacing + 40 ? 't' : 'n');
        } else if (d > noisySpacing + 30) held.mv = 't';
        else if (d < noisySpacing - 40) held.mv = 'a';
        else held.mv = 'n';
      }

      // ── Shield: rare — the human shields only ~4% of frames. Reserved for
      // when jumping away isn't an option (already committed airborne, low
      // recovery) rather than the default reaction to pressure.
      held.sh = perc.atk && d < R * 1.3 && !pressing && self.onGround && Math.random() < P.shieldUse;

      // ── Baseline air-hop: humans move through the air a lot even with no
      // immediate threat — this is what keeps Sovereign airborne too (he
      // engages wherever the fight actually is). Suppressed while catching a
      // descent — jumping up into him is exactly the takeoff_near trade this
      // iteration exists to remove.
      if (self.onGround && !threat && !holdForCatch && Math.random() < P.airHopRate) jumpIn(self);
      // ── Jump-in from mid-range (closing the neutral gap through the air) ──
      if (self.onGround && !threat && !holdForCatch && d > noisySpacing && d < noisySpacing + 160 && Math.random() < P.jumpInRate) jumpIn(self);

      if ((self.cooldown || 0) > 0) { prevOppAtk = perc.atk; return; }

      // ── Attack downward when already above the target — ~30% of the
      // human's openers land on an airborne Sovereign FROM ABOVE.
      if (!self.onGround && dy > 20 && d < R * 1.6 && Math.random() < P.aboveAttackRate) {
        self.attack(tgt); pressing = true; prevOppAtk = perc.atk; return;
      }

      // ── Anti-air: opponent airborne and closing, read from their velocity ──
      const oppClosing = Math.sign(perc.vx || 0) === -dirTo && Math.abs(perc.vx || 0) > 2;
      if (!perc.g && oppClosing && d < R * 1.6 && Math.random() < P.antiAir) {
        self.attack(tgt); pressing = true; prevOppAtk = perc.atk; return;
      }

      // ── Whiff punish: their swing just ended (edge: atk true -> false) ──
      const swingEnded = prevOppAtk && !perc.atk;
      if (swingEnded && d < R * 1.4 && Math.random() < P.whiffPunish) {
        self.attack(tgt); pressing = true; prevOppAtk = perc.atk; return;
      }

      // ── Combo follow-through: keep pressing after a connect, else reset ──
      if (pressing) {
        if (d < R + 15 && Math.random() < P.comboFollow) { self.attack(tgt); prevOppAtk = perc.atk; return; }
        pressing = false;
      }

      // ── Basic poke in neutral ──
      if (d < R + 10 && !held.sh && Math.random() < P.pokeRate) {
        self.attack(tgt); pressing = true; prevOppAtk = perc.atk; return;
      }

      // ── Ability, on cooldown and in range ──
      if (typeof self.ability === 'function' && (frame - lastAbility) > P.abilityCd &&
          d < R * 1.6 && Math.random() < P.abilityRate) {
        self.ability(tgt); lastAbility = frame; prevOppAtk = perc.atk; return;
      }

      // ── Super, when ready and opponent within reach of it mattering ──
      if (self.superReady && d < 220 && Math.random() < P.superRate) {
        self.useSuper(tgt);
      }
      prevOppAtk = perc.atk;
    }

    return function humanProxyAI() {
      const self = this, tgt = this.target;
      if (!tgt || tgt.health <= 0 || self.health <= 0) return;
      frame++;

      const snap = {
        x: tgt.x, y: tgt.y, vx: tgt.vx || 0, vy: tgt.vy || 0,
        atk: (tgt.attackTimer || 0) > 0, sh: !!tgt.shielding, g: !!tgt.onGround,
      };
      hist.push(snap);
      const delaySamples = Math.max(1, Math.round(P.reactionFrames));
      while (hist.length > delaySamples + 1) hist.shift();
      const perc = hist[0];

      const incap = (self.stunTimer || 0) > 0 || (self.ragdollTimer || 0) > 0;
      if (incap) { self.shielding = false; return; }

      // ── Iteration 4: try to catch his descent first — it drives its own
      // movement/attack when live. readRate still gets first refusal (a real
      // incoming swing, e.g. an air attack on the way down, is not something
      // to stand still for) via the unconditional check below.
      holdForCatch = antiAirCatch(self, tgt, perc);

      // ── Anticipation layer (readRate p): checked on TRUE state, no delay.
      // Only the rising edge of "this swing would actually connect" fires it,
      // so it's one read per swing, not a held override of every later frame.
      const trueWouldHit = meleeAttackWouldHit(self, tgt);
      const readFired = trueWouldHit && !prevWouldHit && Math.random() < P.readRate;
      prevWouldHit = trueWouldHit;
      if (readFired) performReadEscape(self, tgt);
      else if (!holdForCatch) evade(self, tgt, perc); // the 1-p fallback: normal delayed reflex layer

      // ── Anticipation layer (offenseRead q): whiff-punish on the TRUE edge
      // of his swing ending, no delay.
      const trueAtkNow = (tgt.attackTimer || 0) > 0;
      const trueSwingEnded = prevTrueAtk && !trueAtkNow;
      prevTrueAtk = trueAtkNow;
      if (trueSwingEnded && Math.random() < P.offenseRead) {
        const R = (self.weapon && self.weapon.range) || 90;
        const d = Math.abs(self.x - tgt.x);
        if (d < R * 1.4 && (self.cooldown || 0) <= 0) { self.attack(tgt); pressing = true; }
      }

      if (frame >= nextDecision) {
        nextDecision = frame + Math.max(1, P.decisionEvery + Math.round((Math.random() * 2 - 1) * P.timingNoiseFr));
        decide(self, tgt, perc);
      }

      // Held state applies every frame, exactly like keysDown does in processInput.
      const dirTo = Math.sign(tgt.x - self.x) || 1;
      const spd = 5.2 * (self.classSpeedMult || 1);
      if (held.mv === 't') { self.vx = dirTo * spd; self.facing = dirTo; }
      else if (held.mv === 'a') { self.vx = -dirTo * spd; self.facing = -dirTo; }
      // Engine enforces ground-only shield / no-shield-through-landing-lag itself
      // (smb-fighter.js update(), unconditional for every non-boss fighter), so
      // this only needs to express intent.
      self.shielding = held.sh;
    };
  }

  const api = { DEFAULTS, controller };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HumanProxy = api;
})(typeof window !== 'undefined' ? window : this);
