'use strict';
// smb-smk2-class.js — SovereignMK2 class (extends AdaptiveAI) + debug/console API
// Depends on: smb-globals.js, smb-adaptive-ai.js

// Tuning switches for controlled A/B measurement. Defaults are the shipping
// behaviour; flipping one at runtime changes only the flagged branch so two runs
// differ by exactly that branch and nothing else.
// voidBoostMax: hard budget on recovery boosts per airborne stint (resets on landing).
// Set very high to restore the old unbounded behaviour for an A/B — but note the old
// behaviour is what let him climb to y=-2765 and take the camera with him.
// recoverCeilAboveDeck: how far above the floor deck a recovery boost may still
// fire, in px. Set very high to restore the old effectively-unbounded behaviour
// for an A/B — the old constant was -60 (above the top of the screen), which is
// what let him ladder off the top of the arena.
// jumpEconomy: enforce the player's 1 ground + 1 air jump rule on every path in
// this class (see _vetoExtraJump). Set false to restore the old unbounded
// behaviour for an A/B — the old behaviour is the triple-jump bug.
// Kill-credit gate, read by all three ledgers (_resolveTactic, _resolveApproach,
// _planTick). Declared as a function so it hoists above every call site, and
// defensively so a missing SMK2_TUNE can never throw inside update() — a throw
// there is swallowed by the trainer's per-fighter try/catch and disappears.
function _KC() {
  return typeof window !== 'undefined' && window.SMK2_TUNE ? !!window.SMK2_TUNE.killCredit : false;
}

window.SMK2_TUNE = window.SMK2_TUNE || { openGate: true, pressureDecay: true, lockCeiling: true, voidBoostMax: 3, recoverCeilAboveDeck: 200, jumpEconomy: true, edgePressure: true, ringoutGuard: true,
  // Habit engine C1 (see _habitGate, js/smb-sov-habits.js). false must be fully
  // inert: the gate returns before touching SovHabits or vy at all.
  habitAir: true,
  // Habit engine C2 (see _descentControl, js/smb-sov-habits.js descentArm/
  // descentRecord). false must be fully inert: the gate returns before
  // touching SovHabits, vy, vx or attack at all.
  habitDescent: true,
  // descentDamage: C2 also weighs each arm's net damage, not only who opened
  // first (see SovHabits.descentArm). OFF: 160 matched pairs vs the human proxy
  // read kills -0.15 (t=-1.72). The proxy does not reproduce the player's descent
  // punish, the case this targets, so it is unproven rather than disproven.
  descentDamage: false,
  // Kill-floor governor: max damage bonus when the player pulls ahead on stocks
  // (see _killFloorGovernor). 0 = off.
  killFloor: 1.0,
  // Tactic ledger (see _airApproachGuard). tacticLedger:false restores the old
  // unconditional air approach. airDenyAt is net health per attempt — the
  // approach is vetoed once it costs him more than this.
  tacticLedger: true, airDenyAt: -4, tacticExplore: 0.2,
  // swingHold: _swingGate drops a swing whose cell nets below swingHoldAt per
  // try even when guarding there is no better (see _swingGate).
  swingHold: true, swingHoldAt: -8,
  // Grid-driven super release (see _gridWantsSuper). The grid is the only
  // situation-aware opinion he owns; superGate is the first thing that acts on it.
  // superGate stays OFF: measured null at both thresholds — margin 8 fired 1392
  // times across 144 matches/arm (fitness t=-0.50, stocks t=-0.09), margin 20
  // fired 1053 across 108 (t=-0.04). Kept, not deleted, because it is the only
  // working demonstration of reading _tacticGrid and the next consumer will want it.
  // ON. Settled at 2,880 matches/arm (40 independent seed blocks): stocks
  // +0.059 +/- 0.024 (t=2.48), locked -0.28 +/- 0.13 (t=-2.13), damage taken
  // -6.3. Agrees in sign with a 19-block run on the previous baseline. The note
  // this replaces recorded it as null (fitness t=-0.50, stocks t=-0.09) — that
  // was measured on a rig whose A/A moved 0.39 stocks and whose second arm
  // inherited the first arm's dossier. It is the only live reader of the learned
  // tactic grid, so this is also the one channel overnight training reaches him
  // through. He deals slightly LESS damage with it on and still wins more: it
  // spends supers where the record says they convert, not where they look big.
  superGate: true, superGateMargin: 8,
  // Tactical plans (see _planTick). The first adaptation unit larger than a verb.
  // tacticPlans defaults OFF: measured non-positive in every configuration tried
  // (see docs/sovereign-observations.md, Sep 20). Kept wired because it is the
  // only mechanism yet built that moves match outcomes at all, and because
  // bait_whiff_punish beat parry_wall in 4 of 4 independent runs.
  tacticPlans: false, planHold: 90, planExplore: 0.2, planSteer: false,
  baitPunisher: false, baitMinHits: 8, baitRate: 0.5,
  // Start the adaptation dials low instead of hand-set near ceiling.
  freshDials: false, freshLevel: 0.45, dialProbe: false,
  // Budget the self-referential adaptation terms so the opponent offsets in
  // _applyAdaptation are reachable instead of clamped away. See the SELF-TERM
  // BUDGET note in smb-adaptive-ai.js.
  oppAdapt: true,
  // adaptV2 = the two halves that only work together. Budgeting the self terms
  // (oppAdapt) is useless while the baseline sits at 0.90, because even a
  // budgeted +0.18 reaches the ceiling before the opponent offset is added; and
  // lowering the baseline alone just gets overwritten in ~3s by a target that is
  // still saturated. Together, measured: aggression spread across 9 opponents
  // went 0.051 -> 0.107 and the reads became sensible (backs off glass_cannon,
  // swarms gauntlet) instead of every opponent converging on the same endpoint.
  // ON. Settled at 1,440 matches/arm (20 independent seed blocks, A/A floor
  // exactly zero): stocks +0.033 +/- 0.065, i.e. free. What it buys is the thing
  // the character is supposed to have and did not — opponent-SPECIFIC adaptation.
  // Without it every dial starts at 88-95% of its own ceiling and he finishes
  // every fight on the same values no matter who he fought. With it, aggression
  // endpoint spread across opponents goes 0.019 -> 0.122 and reactionSpeed
  // 0.003 -> 0.041, reproduced at three disjoint seed offsets within 7%.
  // Earlier same-day flip/revert was decided on 3 blocks and was noise either way.
  adaptV2: true, adaptV2Base: 0.60,
  // Attacker-count term inside _oppAdaptTerms. Separate flag because that
  // function feeds both A/B arms; only meaningful with adaptV2 (headroom).
  swarmTerm: true,
  // Credit a kill as the mirror of the death penalty instead of 0. ON by default:
  // unlike the other Sep-20 flags this is a CORRECTION, not an addition. Measured
  // null on outcomes (n=234/arm, 500 firings, fitness t=1.28, stocks t=0.66) —
  // expected, since two of the three ledgers it fixes have no live reader — but
  // leaving it off means every future artifact keeps scoring a closed stock as 0.
  killCredit: true,
  // swingGate stays OFF: across six measured runs it fired zero times, because it
  // needs an attack cell AND a shield cell populated in the SAME situation and the
  // grid never gets there. Shipping it on would be shipping something inert.
  swingGate: false,
  // volleyArmedRead: require the opponent to have actually SPENT the ability
  // before the volley standoff treats them as armed. See _observeTargetThreat.
  // ON. The single largest behavioural defect found in this codebase: the volley
  // standoff treated an opponent whose ability was merely AVAILABLE as armed, so
  // the two standoff branches won 47.7% of every decision frame in the match and
  // 'window' posture never fired once in 23,142 calls. Measured at 1,440
  // matches/arm: stocks +0.161 +/- 0.057 (t=2.81), damage taken -33.4 +/- 8.6
  // (t=-3.87), behaviour L1 shift 118 points. Costs +1.2pp locked — the honest
  // price of engaging instead of retreating.
  volleyArmedRead: true,
  // tacticChoice: opponent-conditioned tactic SELECTION (see the block above
  // _commit). choiceDenyAt is net health per commit — a branch yields once it
  // costs him more than this against THIS opponent.
  // ON, on DESIGN grounds with a measured zero cost — stated plainly because it
  // is not an outcome win: stocks +0.012 +/- 0.029 (t=0.42) over 2,664
  // matches/arm, a tight null rather than an unresolved one.
  //
  // What it buys is the property every previous rework failed to produce. Before
  // it, aiMemory moved four dials and _tacticGrid booked five coarse verbs, so
  // against a turtle and a rusher he ran the identical cascade in the identical
  // order and only pressed harder or softer. With it, the same tactic is priced
  // differently per opponent and he yields accordingly — measured: corner_exploit
  // 0 net/commit vs a rusher but -6.5 vs mixed, counter_attack_c -12.5 vs turtle
  // and -25.7 vs rusher. He keeps it against one and drops it against the other.
  // Behaviour shifts 16 L1 points and costs nothing.
  tacticChoice: true, choiceDenyAt: -2, choiceExplore: 0.15,
  // stratTerms: the strategic adaptation layer (_strategicTerms). ON because the
  // alternative is the ReferenceError it used to throw; the flag exists so the
  // revival can be A/B'd rather than assumed.
  stratTerms: true,
  // curseAvoid: steer out of a curse pickup's collection ring. See _avoidCurses.
  curseAvoid: true,
  // infer: prediction-failure -> hypothesis engine (see the INFERENCE block).
  // ON since 2026-09-21: required by inferAct. Detection only on its own.
  infer: true,
  // curiosity: judge an action optimistically while under-sampled, so not-knowing
  // becomes something he pays to resolve. See the NOT-KNOWING block.
  curiosity: false, curiosityK: 1.0,
  // experiment: spend a bounded number of deliberate tests per life to separate
  // co-occurring causes. Requires infer. See the INTERVENTION block.
  experiment: false, experimentBudget: 3,
  // inferAct: ACT on the rules infer states — cancel a swing whose stated rule
  // says it cannot land, and guard instead. Requires infer. See _inferAct.
  // Z is the confidence the rule must clear (Wilson bound); explore is the share
  // of matching swings left alone so the rule keeps receiving honest samples.
  // ON since 2026-09-21. Isolated A/B +0.065 stocks (t=2.80) vs the scenario
  // panel; vs single sword opponents with warm memory +0.33 stocks against a
  // purpose-built guard baiter and +0.52 against a rusher (tools/sov-bait.js).
  // The bait did not pay: a converted guard is a fresh raise, so it parries.
  inferAct: true, inferActZ: 1.28, inferActExplore: 0.15,
  // openLoadout: choose from EVERY legal weapon and class with no authored
  // priors or counter bonus, learning only from his own per-life results. See
  // _pickOpenLoadout. Off = the curated SMK2_LOADOUTS bandit.
  // ON since 2026-09-23, with innateArsenal: 160 matched pairs vs the calibrated
  // human proxy, kills 7.67 -> 9.51 (t=12.3), stocks left 0.54 -> 2.36, >=7-kill
  // floor 81% -> 98%.
  openLoadout: true,
  // innateArsenal: open with SOV_ARSENAL (js/smb-sov-arsenal.js), the kits the
  // lab found strong. Off only while tools/sov-discover.js is generating it.
  innateArsenal: true,
  // innateMemory: seed the inference engine with SOV_MEMORY (js/smb-sov-memory.js),
  // the mechanics he worked out over thousands of lab fights. Off only while
  // tools/sov-memory-build.js is generating that file, so it never feeds itself.
  innateMemory: true,
  // discovery: residual-based exploit detection (see _scoreSurprise). sigma is
  // in units of his own running |residual|, so it adapts to the match's noise.
  discovery: false, discoverySigma: 2.5, discoveryWindow: 600, discoveryYield: 0.6,
  discoveryLog: false };

// ── Owner-attached hazard registry ───────────────────────────────────────────
// Several weapon abilities/supers store their live hazard directly on the wielder
// instead of registering a Projectile, so the generic projectile pools never see
// them. Sovereign's threat scans previously hardcoded this list in TWO places and
// both had drifted out of date — the Electric Staff's Shock Bolt was absent from
// both, which is why he ate 28 of them in one match without a single dodge: not a
// reaction failure, he could not perceive the orb at all.
// One list, read by every scan. Adding a weapon hazard here makes Sovereign see it.
const SMK2_OWNED_HAZARDS = [
  '_swordSlashes', '_paperSwarm', '_paperPlanes', '_boomerangs',
  '_peaCluster', '_gravityStone', '_flailBall', '_scytheToss',
  '_hammerShock', '_thrownAxe', '_shockBolt',
  '_wxBombs', '_wxKnives', '_wxBolts', '_wxShards', '_wxAnchor',
];

// Yields every live hazard object the target owns, flattening arrays and singles.
function _smk2OwnedHazards(t) {
  const out = [];
  if (!t) return out;
  for (const key of SMK2_OWNED_HAZARDS) {
    const v = t[key];
    if (!v) continue;
    const list = Array.isArray(v) ? v : [v];
    for (const hz of list) {
      if (!hz || hz.done || hz.dead) continue;
      if (hz.life !== undefined && hz.life <= 0) continue;
      if (hz.timer !== undefined && hz.timer <= 0) continue;
      out.push(hz);
    }
  }
  return out;
}

// Every owner-attached hazard in the match that is not Sovereign's own.
// The scans used to read only `this.target`'s hazards, which is correct in a 1v1
// and blind everywhere else: in battle royale or any 3+ fight, the three fighters
// he is NOT currently targeting can throw whatever they like at him for free.
function _smk2AllOwnedHazards(self) {
  const out = [];
  const pools = [];
  if (typeof players  !== 'undefined' && Array.isArray(players))  pools.push(players);
  if (typeof minions  !== 'undefined' && Array.isArray(minions))  pools.push(minions);
  for (const pool of pools) {
    for (const f of pool) {
      if (!f || f === self || f.health <= 0) continue;
      if (typeof areAlliedEntities === 'function' && areAlliedEntities(self, f)) continue;
      const owned = _smk2OwnedHazards(f);
      for (const hz of owned) out.push(hz);
    }
  }
  return out;
}

// ── Sovereign's loadout pool ────────────────────────────────────────────────
// He is designed as a very strong PLAYER, so he gets a player's kit choice and
// nothing a player cannot have. Three hard exclusions, each measured:
//   - ranged (gun/bow + gunner/archer): 33 dealt/1k against katana's 244. Ranged
//     does not work for him at all; handing him a gun is a 7x self-nerf.
//   - mkgauntlet/megaknight: admin-only, hard-filtered out of WEAPON_KEYS.
//   - shield/paladin: no offence, and he already over-blocks (7.6% of live frames).
// `prior` is replay-measured damage dealt per 1000 frames, used to seed the
// bandit in _pickLoadout so his first picks are informed rather than random.
// `cls` must be a class whose CLASSES[].weapon is null or equals `wk`, or the
// class finisher will not fire (see _pickFinisher's classWeaponMatch).
const SMK2_LOADOUTS = [
  { key: 'signature', wk: 'nullblade', cls: 'berserker', fin: 'nullblade', prior: 150, light: 1 },
  { key: 'ronin',     wk: 'katana',    cls: 'ronin',     fin: null,        prior: 244, light: 1 },
  { key: 'ninja',     wk: 'sword',     cls: 'ninja',     fin: null,        prior: 214, light: 1 },
  { key: 'reaper',    wk: 'scythe',    cls: 'reaper',    fin: null,        prior: 146, light: 0 },
  { key: 'torren',    wk: 'hammer',    cls: 'thor',      fin: null,        prior: 139, light: 0 },
  { key: 'varek',     wk: 'axe',       cls: 'kratos',    fin: null,        prior: 139, light: 0 },
  { key: 'pugilist',  wk: 'combat',    cls: 'pugilist',  fin: null,        prior: 138, light: 1 },
];

// Counter prior: how much a candidate is favoured against what the PLAYER holds.
// Heavy, slow weapons are answered by light ones that punish endlag; light,
// fast weapons are answered by reach and knockback. Deliberately small (±18%)
// so it biases the bandit's opening picks without overriding what he measures.
function _smk2CounterBonus(lo, tgt) {
  if (!lo || !tgt || typeof WEAPONS === 'undefined') return 1;
  const tw = WEAPONS[tgt.weaponKey];
  if (!tw) return 1;
  // weaponType is authored on every weapon, but the old `|| cooldown >= 34` ran
  // as an OR and silently overrode it: spear (light, cd 44), scythe (light, 44)
  // and katana (light, 40) all read as HEAVY. Cooldown is not the punishable
  // window in any case — endlag is, and spear recovers in 12 frames. Trust the
  // authored type; fall back on endlag only where none is declared.
  const tgtHeavy = tw.weaponType ? tw.weaponType === 'heavy'
                                 : (tw.endlag || 10) >= 16;
  // Speed prior applies only when there is real endlag to punish. Against a
  // fast target the old branch prescribed "out-range and out-knockback", which
  // is right for a short brawler (combat, reach 50) and exactly wrong for a
  // poker (spear, reach 130) — the reach term below reads that difference
  // directly instead of inferring it from weapon class.
  let bonus = tgtHeavy ? (lo.light ? 1.18 : 0.92) : 1;
  // Reach: nothing here looked at range, so he would counter-pick an 80-reach
  // hammer into a 130-reach spear and spend the match walking into pokes —
  // replay 2026-09-05(1), ten stocks dropped on that matchup, against a near-win
  // the same day on katana. Melee-vs-melee only; ranged targets are a different
  // problem that the movement AI already handles.
  const lw = WEAPONS[lo.wk];
  if (lw && lw.range && tw.range && tw.range < 300) {
    const reach = (lw.range - tw.range) / 100;
    bonus *= 1 + Math.max(-0.20, Math.min(0.20, reach * 0.4));
  }
  return bonus;
}

class SovereignMK2 extends AdaptiveAI {
  constructor(x, y, color, weaponKey) {
    super(x, y, color, weaponKey);

    this.name           = 'SOVEREIGN Ω';

    // Override AdaptiveAI defaults — Sovereign starts near-peak, not at warmup level
    // ── Starting dials ────────────────────────────────────────────────────
    // Hand-set ABOVE AdaptiveAI's own defaults (0.78 / 0.70 / 0.18 / 0.90).
    // freshDials starts him low instead, so _applyAdaptation — which since the
    // R=0.32 -> 0.05 fix converges toward a target in BOTH directions — has room
    // to climb. Tests whether his strength is the hand-tuning or the learning.
    const _fl = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && typeof SMK2_TUNE.freshLevel === 'number')
      ? SMK2_TUNE.freshLevel : 0.45;
    // adaptV2 baseline: enough headroom under the ease() ceiling for the opponent
    // offset to matter. spacing is set directly rather than mirrored from the
    // level — its ease band is [0, 0.34], so a mirrored 0.40 would sit above the
    // ceiling and be yanked down on the first cycle, which is not a baseline.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.adaptV2) {
      const _b = (typeof SMK2_TUNE.adaptV2Base === 'number') ? SMK2_TUNE.adaptV2Base : 0.60;
      this.aiMemory = { aggression: _b, defense: _b, spacing: 0.20, reactionSpeed: _b };
      this._adaptV2 = true;
    } else
    this.aiMemory = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.freshDials)
      ? { aggression: _fl, defense: _fl, spacing: 1 - _fl, reactionSpeed: _fl }
      : { aggression: 0.90, defense: 0.88, spacing: 0.12, reactionSpeed: 0.95 };
    this.isSovereignMK2 = true;

    // Sovereign has no charClass, so DomainManager reaches his domain through
    // this key instead (DOMAIN_DEFS.sovereign — Absolute Dominion). Same cost as
    // the player's: five supers on one life.
    this._domainKey = 'sovereign';

    // ── Loadout state (see SMK2_LOADOUTS / _pickLoadout) ────────────────────
    // He is built to play like a very strong PLAYER, not a boss — so the one
    // thing a strong player always does and he never did is pick his kit. His
    // own stat line is authoritative: a class contributes its identity (perks,
    // abilities, finisher) but never its hp/speed, or picking a class would
    // silently rebalance him.
    this._loadout       = null;   // active SMK2_LOADOUTS entry
    this._loadoutLocked = false;  // true once the match's kit is chosen (see _ensureMatchLoadout)
    this._loadoutStats  = {};     // key -> { lives, dealt } bandit record
    this._loadoutDealt0 = 0;      // totalDamageDealt at the start of this life
    this._baseMaxHealth = this.maxHealth;   // construction-time reference only
    this._baseSpeedMult = this.classSpeedMult || 1;

    // Platform-hop steering + projectile-dodge state
    this._hopTarget   = null;
    this._hopFrames   = 0;
    this._projDodgeCd = 0;
    this._itemRunTimer = 0;   // frames left committed to a map pickup
    this._recoverJumps = 0;   // off-stage recovery jumps used this airborne stint
    this._expUsed      = 0;   // experiments spent this life (see _wantsExperiment)
    this._areaDodgeCd  = 0;   // re-arm gate on area-hazard evasion
    this._domHazCd     = 0;   // re-arm gate on domain-hazard evasion (_scanDomainHazards)
    this._domHazDir    = 0;
    this._ambientLevel      = 0;  // 0..1 unattributable-damage pressure (_ambientThreat)
    this._ambientArmedUntil = 0;

    // Per-FRAME decision cadence (overrides the shared AI_TICK_INTERVAL=15 gate in
    // Fighter.update). This class's timers are all written in frames — reactFrames,
    // _telegraphTimer, _shieldHoldFrames, the "180 frames (~3 sec)" observation
    // window, endlag-punish windows. At the stock 15-frame cadence every behavior
    // ran 15× slower than designed: 1-2s pre-attack stalls, 30-90 frame reaction
    // latency, and endlag windows (7-22 frames) that expired between decisions.
    // Fairness stays with the designed knobs: _reactionMistakeRate, telegraphs,
    // humanization delays. Stochastic per-decision gates below are rescaled ~÷5
    // to keep event rates unchanged (decisions run ~5× more often with aiReact≈2).
    this.aiTickInterval = 1;

    // ── Genome: trained decision parameters ─────────────────────────────────
    // Loaded from localStorage champion on construction; defaults to SMK2_DEFAULT_GENOME.
    // Call applyGenome(g) to override (used by SMK2Trainer during self-play matches).
    this._genome = (typeof SMK2Trainer !== 'undefined')
      ? SMK2Trainer.loadChampion()
      : { ...SMK2_DEFAULT_GENOME };
    this._applyGenomeToMemory();
    // Don't affect story mode — story uses AdaptiveAI directly

    // ── A. Prediction System ────────────────────────────────────
    // Unified onto the inherited BehaviorModel (smb-behavior-model.js): its
    // per-context bigram is the single source of "what will the player do next".
    // _updatePrediction() reads that prediction; _actionSeq stays as a short local
    // habit buffer for reads the BehaviorModel doesn't model (escape/dodge).
    this._actionSeq     = [];          // ring buffer: last 32 tagged actions
    this._lastAction    = 'idle';
    this._lastTwoActions = ['idle', 'idle'];
    this._predictedNext = null;        // current prediction (string tag) or null
    this._predictConf   = 0;           // 0–1 confidence
    this._predictSource = 'none';      // none|behaviormodel|habit
    this._preemptMode   = false;       // currently executing preemptive counter
    this._preemptTimer  = 0;           // frames left in preemptive action
    this._preemptTarget = null;        // what we're preempting
    this._predCorrect   = 0;           // confirmed correct predictions
    this._predTotal     = 0;           // total predictions made
    this._predictDialogueCd = 0;       // cooldown between "called it" lines

    // ── B. Punishment System ────────────────────────────────────
    this._spamWindow    = { action: null, count: 0, timer: 0 };
    this._punishModeActive = false;
    this._punishModeTimer  = 0;        // frames remaining in punish mode
    this._punishModeCount  = 0;        // total activations (increases severity)
    this._punishDialogueCd = 0;
    this._adaptivePunishRoute = 'direct';
    this._adaptivePunishTimer  = 0;

    // ── C. Limiter Break Mode ────────────────────────────────────
    this._limiterBroken       = false;
    this._limiterBreakDialogue = false; // fired once
    this._limiterAuraPhase    = 0;
    this._limiterFlashTimer   = 0;     // white flash on break

    // ── Evolution / intimidation state ─────────────────────────
    this._evolutionStage      = 0;     // 0..3
    this._evolutionPulse      = 0;
    this._intimidation        = 0;     // 0..1 pressure meter
    this._intimidationPulse   = 0;
    this._intimidationLineCd  = 0;
    this._intimidationPeak    = false;
    this._pressureMode        = 'study'; // study|suffocate
    this._pressureHoldTimer   = 0;
    this._studyBurstTimer     = 0;

    // ── D. Anti-Exploit System ───────────────────────────────────
    this._exploit = {
      stallFrames:       0,
      stallRespCd:       0,
      edgeFrames:        0,
      edgeRespCd:        0,
      spamCount:         0,
      spamTimer:         0,
      spamRespCd:        0,
      lastTargetX:       0,
      engageTimer:       0,   // forced-engage countdown after exploit trigger
      engageType:        null,
      idleShieldFrames:  0,   // frames player has been shielding without attacking
      idleShieldRespCd:  0,
    };

    // ── E. Humanization Layer ────────────────────────────────────
    this._humanFakeoutDir   = 0;   // -1|0|1 direction of current fakeout
    this._humanFakeoutTimer = 0;
    this._humanMissArmed    = false; // intentional "whiff" this tick

    // ── F. Frame-safe shield drop / stagger ──────────────────────
    this._shieldHoldFrames   = 0;  // counts down; drops shield at 0 (replaces setTimeout)
    this._limiterStaggerTimer= 0;  // grace window when player combos Sovereign in LB
    this._limiterStaggerCd   = 0;  // cooldown: prevents stagger from being farmed

    // ── Garou-style habit / counter / fear layers ───────────────
    this._habitStats = {
      jump:   { count: 0, streak: 0, timer: 0, total: 0 },
      dodge:  { count: 0, streak: 0, timer: 0, total: 0 },
      attack: { count: 0, streak: 0, timer: 0, total: 0 },
      shield: { count: 0, streak: 0, timer: 0, total: 0 },
    };
    this._lastHabitAction   = 'idle';
    this._dominantHabit     = null;
    this._dominantHabitScore= 0;
    this._counterLockTimer  = 0;
    this._counterCueCd      = 0;
    this._fearLineCd        = 0;
    this._dominanceZoomCd   = 0;
    this._flowBreakCd       = 0;
    this._guardBreakCd      = 0;
    this._repositionBurstCd = 0;
    this._audioSpikeTimer   = 0;
    this._limiterReason     = null;

    // ── Faster base adaptation rate for Sovereign ────────────────
    this._adaptInterval = 5; // ~12×/sec vs inherited 8 (~7.5×/sec)

    // ── Observation window + adaptation lock ────────────────────
    // Hard counters are allowed after four decision frames and one meaningful
    // action. The BehaviorModel still supplies the confidence gate, so this is
    // fast adaptation rather than an uninformed opening guess.
    this._observationFrames  = 0;   // incremented every AI tick
    this._actionSampleCount  = 0;   // non-idle actions seen
    this._adaptLockTimer     = 0;   // frames remaining on locked strategy
    this._lockedCounterStrategy = null; // 'anti-air'|'parry'|'guard-break'|'intercept'|'pressure'|null
    // Tactic-swap (Stage 3): decaying failure tally per strategy. When a locked
    // counter keeps letting the player through, Sovereign switches laterally.
    this._strategyFail       = {};  // { strategy: failCount }
    this._lockScored         = true; // has the current lock been scored for success/failure?

    // ── Multi-opponent targeting + per-opponent memory ───────────
    // updateAI() below fully replaces Fighter.updateAI(), which means it also
    // skipped that method's target validation and its 25-tick nearest-enemy
    // re-evaluation. Sovereign therefore kept whatever target was assigned at
    // spawn for the whole match: in a 2v1 the second player could hit him
    // indefinitely and he would never turn, and if his one target died and did
    // not respawn the `!t || t.health <= 0` guard returned every frame and he
    // stopped acting entirely. These drive a threat-weighted choice instead.
    this._threatLedger   = new Map(); // fighter -> { dmg, lastFrame } decaying damage tally
    this._retargetDwell  = 0;         // frames on the current target (hysteresis floor)
    this._peripheralCd   = 0;         // gate on off-target punish swings (see PERIPHERAL PUNISH)
    this._threatSeenFrame = -1;       // last attribution stamp already folded in
    // One BehaviorModel per opponent. A single shared model blended two players'
    // habits into one set of matrices, so reads learned from one were applied to
    // the other. Saved and restored on every switch so each profile survives.
    this._oppMemory      = new Map(); // fighter -> saved profile bundle

    // ── Force Engagement System ──────────────────────────────────
    // Tracks how long the player has stayed distant AND avoided attacking.
    // When both thresholds are exceeded, Sovereign enters FORCE MODE and
    // overrides all movement decisions to close the gap relentlessly.
    // Does NOT change speed values or cooldowns — only decision priority.
    this._forceEngageDistFrames = 0;  // frames player has been > FORCE_DIST_THRESHOLD away
    this._forceEngageIdleFrames = 0;  // frames since player last attacked
    this._forceModeActive       = false;
    this._forceModeCloseFrames  = 0;  // frames spent within close range during force mode
    // Thresholds (tunable without touching speed/cooldowns):
    this._FORCE_DIST_THRESHOLD  = 180; // px — "player is staying far"
    this._FORCE_DIST_FRAMES     = 45;  // ~0.75 sec continuously far
    this._FORCE_IDLE_FRAMES     = 45;  // ~0.75 sec since player last attacked
    this._FORCE_CLOSE_NEEDED    = 22;  // frames close (<140px) needed to exit force mode
    this._jumpCooldown          = 0;   // frames until next upward-chase jump is allowed

    // ── Platform Intelligence ──────────────────────────────────────
    // Tracks which arena platforms the player lands on most frequently.
    // _prefPlatIdx: index into currentArena.platforms of the most-visited non-floor platform.
    // Used for platform denial (race them to their favourite spot) and landing punishes.
    this._platVisits    = [];       // sparse array: [platformIndex] → weighted visit count
    this._platDecayTick = 0;        // periodic decay counter
    this._prefPlatIdx   = -1;       // -1 = no strong preference yet
    this._prevTgtOnGnd  = false;    // edge-detect landing (previous tick onGround)

    // ── Spatial Zone Profile ───────────────────────────────────────
    // Divides the arena into left / center / right thirds.
    // Helps Sovereign approach from the player's less-comfortable side.
    this._zoneVisits = [0, 0, 0];   // [left, center, right] visit counts (decaying)
    this._prefZone   = 1;           // 0=left, 1=center, 2=right

    // ── Board Control (The Circuit only) ───────────────────────────
    // On his own arena the stage is a plate he can slide, so a spatial read stops
    // being advisory and becomes an action: he moves the voids to where the player
    // has shown they like to stand. Inert on every other arena.
    this._plateCd       = 0;        // frames until he may move the plate again
    this._plateRequests = 0;        // accepted slides this match (debug/telemetry)

    // ── Corner Pressure System ─────────────────────────────────────
    // When the player is near an edge, Sovereign switches to corner-exploit:
    //   • positions on the STAGE SIDE of the player (cuts off center escape)
    //   • increases attack frequency (reduced dodge space)
    //   • aims to knock player off the edge
    this._cornerPressure  = 0;      // 0..1 accumulator — how cornered the player is
    this._cornerMode      = false;  // true while actively exploiting cornered position
    this._cornerSide      = 0;      // -1=left-edge, +1=right-edge
    this._cornerCd        = 0;      // cooldown frames before next corner-mode activation
    this._cornerEscapes   = 0;      // times player successfully escaped a corner (adapts herding)

    // ── Post-Knockback Habit Profile ───────────────────────────────
    // After each confirmed hit, observe what the player does in the next ~45 frames.
    // Builds a weighted profile of their knockback response, which feeds into
    // _runHardCounter's locked strategy selection.
    this._postKB = { attackBack: 0, shielded: 0, jumped: 0, retreated: 0 };
    this._postKBArmed       = false;  // observing player response right now
    this._postKBTimer       = 0;      // frames remaining in observation window
    this._postKBLastTgtHp   = Infinity;
    this._postKBLineCd      = 0;      // cooldown for post-KB dialogue

    // ── Own-corner escape ──────────────────────────────────────────
    this._sovereignEscapeCd = 0;      // cooldown: jump over player to reverse corner
    this._voidRecoverCd     = 0;      // emergency recovery cooldown after edge launch
    this._voidBoosts        = 0;      // recovery boosts used this airborne stint (resets on landing)
    this._voidHopCd         = 0;      // cooldown on the gap-hop the void-step veto issues
    this._floorHopCd        = 0;      // cooldown on the boss-floor evacuation hop
    this._heavyThreatCd     = 0;      // short memory for high-knockback weapons

    // Tune BehaviorModel for Sovereign: sample every decision frame and weight
    // recent exchanges far more heavily than stale match history. This is purely
    // a learning/read change; movement, damage, and weapon values stay untouched.
    this._behaviorModel._decayRate     = 0.990;
    this._behaviorModel._decayInterval = 1;

    // Tactical orchestration state. The AI refreshes this from live arena and
    // combat state each decision frame, then spends existing tools only where
    // the engine says they have value (hazards, resources, recovery windows).
    this._mapTacticalState = { selfHazard: null, targetHazard: null };

    // Adaptive memory bridge state (local session + Supabase priors)
    this._adaptiveMemoryState   = null;
    this._adaptiveMemoryKey     = null;
    this._adaptiveMemorySession  = null;
    this._adaptiveMemoryPending  = false;

    // ── Null Anchor (Null Blade passive) ─────────────────────────
    // While grounded on the main floor, Sovereign continuously stakes an anchor
    // point; a fatal fall (ragdoll ring-out, pit juggle) tethers him back to it.
    // Real cooldown — sustained timed pressure can still beat it.
    this._anchorX          = x;
    this._anchorY          = y;
    this._anchorCd         = 0;
    this._anchorFlashTimer = 0;
    this._anchorTetherFrom = null;
    // Null Recoil — juggle break. See _updateNullRecoil().
    this._recoilCd         = 0;
    this._recoilHits       = 0;
    this._recoilLastFrame  = -9999;
    this._recoilSeenFrame  = -9999;
    this._recoilFlash      = 0;

    // Post-respawn protection: brief defensive burst so Sovereign doesn't sprint into a
    // hammer swing the instant it spawns. Set by onDeath(), counts down in updateAI().
    this._spawnDefendTimer  = 0;
    this._spawnDefendJumped = false; // one escape jump per respawn — a repeated jump arc is a free read

    // ── Combat Conversion Systems ────────────────────────────────
    // Post-hit commitment: skip distance re-evaluation for N frames after landing a hit.
    // Prevents the momentum-killing retreat that happens when knockback briefly
    // puts the target outside prefDist.
    this._postHitLockFrames    = 0;

    // Dodge-to-chase: after a successful dodge, commit to pursuit at boosted speed
    // for N frames instead of falling back to neutral distance re-evaluation.
    this._commitToChaseFrames  = 0;
    this._chaseDirection       = 0; // locked approach direction set at dodge time

    // Punish mode momentum decay: when punish mode timer expires, hold suffocate
    // pressure for an additional N frames before allowing study-mode disengagement.
    this._pressureCooldownFrames = 0;

    // Prediction reward: after a confirmed correct prediction, briefly boost
    // approach speed and ability usage — makes successful reads actually matter.
    this._predictionBoostFrames  = 0;

    // Punish timing fakeout: stop-short pause within punish rush to break
    // the fixed-timing read that skilled players exploit.
    this._punishFakeoutTimer   = 0;

    // ── Breathing Room System ─────────────────────────────────────
    // After a combo sequence fires, Axiom backs off to give the player
    // time to reposition and counter-attack.  _telegraphTimer adds a
    // brief wind-up before each first strike (visual tell + dodge window).
    this._restTimer         = 0;  // frames of forced rest (backs off, no attacks)
    this._restCooldown      = 0;  // prevents resting too frequently
    this._aggressionStreak  = 0;  // combo sequences fired; triggers rest when high enough
    this._telegraphTimer    = 0;  // pre-attack wind-up pause frames

    // ── Death-to-Adaptation Pipeline ──────────────────────────────
    this._deathCount          = 0;    // respawn counter this match
    this._deathRecord         = null; // kill context snapshot; consumed on first tick of next life

    // ── Opening Weapon Prior ───────────────────────────────────────
    this._openingPriorApplied = false; // fires once per match on first full observation tick

    // ── Tactic ledger ──────────────────────────────────────────────
    // Every other adaptive channel in this class is a DIAL: aggression, defense,
    // spacing, reactionSpeed, evolution stage. Dials say how hard he fights. None
    // of them can represent "this particular decision loses", which is why he
    // repeats a losing approach until the match ends — replay 2026-09-10 measured
    // 56 jumps onto the platform the player was standing on with the punish rate
    // RISING from 10/31 to 15/25 across the fight.
    //
    // The ledger is the missing representation: decisions keyed by name, scored by
    // measured consequence. Generalises the one outcome check that already existed
    // (AdaptiveAI._bmActivePunish, which books a single punish route the same way).
    this._tacticGrid    = {};    // sit -> action -> { tries, taken, dealt }
    this._pendingTactic = null;  // open booking: { sit, action, frame, hp, lives, ... }
    this._prevAtkSample    = 0;     // rising-edge trackers for the decision sampler
    this._prevShieldSample = false;
    this._prevSuperSample  = 0;
    this._prevMoveSample   = null;
    this._swingGated       = 0;     // swings the grid turned into guards (debug)
    this._approachStat  = { tries: 0, taken: 0, dealt: 0 };  // drives the air guard
    this._pendingApproach = null;
    this._airDenyTimer  = 0;     // frames the air approach stays vetoed
    this._airDenyX      = null;  // redirect landing x, null = no redirect available
    this._armorApproach = false; // raise the guard on this descent
    this._armorHold     = 0;     // frames to keep it up through landing recovery

    // ── Endlag Punish Window ───────────────────────────────────────
    this._endlagWindow        = 0;    // frames remaining in opponent's post-swing recovery

    // ── Combo conversion ───────────────────────────────────────────
    // A string that keeps LANDING earns extra hits; a string that whiffs ends.
    // Raises damage per opening without raising swing volume. Hard-capped, and
    // dealDamage's own limiter (hitstun decay, forced launcher at 7 hits, air
    // escape at 5) still breaks the string — this cannot become an infinite.
    this._comboPrevTgtHp  = Infinity;
    this._comboLandedLast = false;
    this._comboExtensions = 0;
    // Replay-measured: at 2 this produced a cluster of 4-hit chains (base 2 +
    // 2 refunds) and tripled the number of 3+ chains, which reads as an
    // unbreakable combo. 1 keeps the conversion gain without the lock.
    this._COMBO_EXT_MAX   = 1;

    // ── Reaction mistake-rate latch (Stage 3) ──────────────────────
    // One defensive read decision per player attack instance, latched on the
    // attack's rising edge so a multi-frame swing is a single read (not a fresh
    // coin-flip every frame). Cleared when the player isn't attacking.
    this._reactLatch          = null; // { react: bool } | null

    // ── Blind threat learning ──────────────────────────────────────
    // Perception used to be a whitelist: a hazard the scans didn't name was not
    // merely missed, it was imperceptible, so every new ability created a fresh
    // permanent blind spot. This learns the SHAPE of an unseen threat instead of
    // its identity — "I lost health at range 300 about 20 frames after they
    // pressed their ability" is enough to start evading, without ever knowing
    // what an Electric Staff or a Shock Bolt is. It generalises to weapons that
    // do not exist yet.
    this._selfPrevHp      = null;
    this._tAbilityFiredAt = -9999;
    this._tSuperFiredAt   = -9999;
    this._unknownThreat   = {
      viaAbility: 0, viaSuper: 0, viaNeither: 0, total: 0,
      neither: [],                 // frames of unattributable damage (ambient threat)
      delaySum: 0, delayN: 0,      // frames between their button and my damage
      distSum: 0,  distN: 0,       // how far away they were when it landed
    };
    this._blindEvadeUntil = 0;
    this._blindEvadeSrc   = null;
    this._blindLineCd     = 0;

    // ── Ability / super profile observation ──────────────────────
    this._prevTAbilityCd  = 0;
    this._prevTSuperReady = false;
    this._superProfile    = 'unknown';
    this._abilityProfile  = 'unknown';
    this._profileUpdateCd = 0;
    // Fires once per match when the profile first resolves — makes the read *visible*
    this._profileSaidSuper   = false;
    this._profileSaidAbility = false;
  }

  // ══════════════════════════════════════════════════════════════
  // RESPAWN HOOK — override to set spawn-protection window
  // ══════════════════════════════════════════════════════════════

  onDeath() {
    // Commit BEFORE super.onDeath() runs the base _applyAdaptation(): the dials as
    // they stood when the life ended are the read that was actually being used,
    // and the post-death cycle would fold a death penalty into them first.
    try { this._commitDossier('death'); } catch (e) {}
    try { this._commitMech(); } catch (e) {}
    try { this._arsenalCommit('death'); } catch (e) {}
    super.onDeath();
    this._deathCount++;
    this._spawnDefendTimer  = 45; // ~0.75 sec of defensive jump-back before engaging
    this._spawnDefendJumped = false;

    // Snapshot kill context so the next life immediately counters it
    const _dt = this.target;
    if (_dt && _dt.weapon) {
      this._deathRecord = {
        weaponKey:  _dt.weaponKey || null,
        isHeavy:    _dt.weapon.kb >= 16 || _dt.weapon.weaponType === 'heavy',
        isRanged:   _dt.weapon.type === 'ranged' || _dt.weapon.type === 'magic',
        lastAction: this._lastAction || 'attack',
        comboDepth: this._countRecent('dmg_taken', 40),
      };
    }

    if (typeof unlockAchievement === 'function') unlockAchievement('sovereign_slayer');
  }

  // ══════════════════════════════════════════════════════════════
  // GENOME API — called by SMK2Trainer during self-play
  // ══════════════════════════════════════════════════════════════

  applyGenome(g) {
    this._genome = Object.assign({ ...SMK2_DEFAULT_GENOME }, g);
    this._applyGenomeToMemory();
  }

  _applyGenomeToMemory() {
    const g = this._genome;
    // freshDials must survive this. SMK2Trainer calls applyGenome() immediately
    // after construction, and this method overwrites three of the four dials from
    // the genome — aggression, spacing, reactionSpeed, but NOT defense. That is
    // why the Sep 20 "dials are inert" result was invalid: the fresh values were
    // erased before the match for exactly those three, and defense — the only one
    // the genome does not touch — was the only one measured to transmit.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.adaptV2) return;
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.freshDials) {
      const _fl = (typeof SMK2_TUNE.freshLevel === 'number') ? SMK2_TUNE.freshLevel : 0.45;
      this.aiMemory.aggression    = _fl;
      this.aiMemory.spacing       = 1 - _fl;
      this.aiMemory.reactionSpeed = _fl;
      return;
    }
    this.aiMemory.aggression    = g.aggression;
    this.aiMemory.spacing       = g.spacing;
    this.aiMemory.reactionSpeed = g.reactionSpeed;
  }

  getGenome() { return { ...this._genome }; }

  // ══════════════════════════════════════════════════════════════
  // A. PREDICTION SYSTEM
  // ══════════════════════════════════════════════════════════════

  // Maintains the short local action buffer. The parallel bigram/trigram tables
  // were retired — prediction is sourced from the inherited BehaviorModel (see
  // _updatePrediction). _actionSeq still feeds _getCounterStrategy and the
  // habit-fallback read for actions the BehaviorModel doesn't model (escape/dodge).
  _recordActionBigram(action) {
    if (action === 'idle' && this._lastAction === 'idle') return; // skip idle→idle noise
    this._actionSeq.push(action);
    if (this._actionSeq.length > 32) this._actionSeq.shift();
    this._lastTwoActions = [this._lastTwoActions[1], action];
    this._lastAction = action;
  }

  // Prediction is sourced primarily from the inherited BehaviorModel's
  // per-context bigram (the single prediction brain). A short local habit window
  // over _actionSeq is kept as a fallback for reads the BehaviorModel doesn't
  // classify — notably 'dodge'/escape — so coverage isn't lost in the unify.
  // _predTotal increments only when the prediction CHANGES, so the
  // _predCorrect/_predTotal ratio tracks distinct reads, not per-frame repeats.
  _updatePrediction(bmPred) {
    // ── Primary: BehaviorModel per-context prediction ──
    const mapped = this._bmActionToTag(bmPred && bmPred.action);
    if (mapped && bmPred.confidence > 0) {
      if (this._predictedNext !== mapped) this._predTotal++;
      this._predictedNext = mapped;
      this._predictConf   = bmPred.confidence;
      this._predictSource = 'behaviormodel';
      return;
    }

    // ── Fallback: local habit window (catches escape/dodge + simple repeats) ──
    const recent = this._actionSeq.slice(-12).filter(a => a !== 'idle');
    if (recent.length >= 4) {
      const counts = {};
      for (const act of recent) counts[act] = (counts[act] || 0) + 1;
      let bestHabit = null, bestHabitCount = 0;
      for (const [act, count] of Object.entries(counts)) {
        if (count > bestHabitCount) { bestHabit = act; bestHabitCount = count; }
      }
      const habitConf = bestHabitCount / recent.length;
      if (bestHabit && habitConf >= 0.60) {
        if (this._predictedNext !== bestHabit) this._predTotal++;
        this._predictedNext = bestHabit;
        this._predictConf   = Math.min(0.95, 0.40 + habitConf * 0.65);
        this._predictSource = 'habit';

        // Style-shift decay: if the player is mixing many different actions recently,
        // reduce confidence so stale predictions don't fire on a varied opponent.
        const _recentTypes = new Set(this._actionSeq.slice(-8).filter(a => a !== 'idle'));
        if (_recentTypes.size >= 3) {
          this._predictConf *= Math.max(0.55, 1 - (_recentTypes.size - 2) * 0.12);
        }
        return;
      }
    }

    this._predictedNext = null;
    this._predictConf   = 0;
    this._predictSource = 'none';
  }

  // Map a BehaviorModel action enum (PA.*) onto Sovereign's preempt vocabulary.
  // Returns null for actions Sovereign doesn't preempt on (idle/walk/land) — those
  // fall through to the local habit read, which also covers 'dodge'/escape.
  _bmActionToTag(pa) {
    if (typeof PA === 'undefined' || pa === undefined || pa === null) return null;
    if (pa === PA.ATTACK || pa === PA.AIRBORNE_ATK) return 'attack';
    if (pa === PA.JUMP)  return 'jump';
    if (pa === PA.BLOCK) return 'shield';
    return null;
  }

  _applyPredictionCounter(t, dir, d, moveSpd) {
    const confFloor = 0.38 - this._evolutionStage * 0.03 - this._intimidation * 0.05;
    if (!this._predictedNext || this._predictConf < confFloor) return false;
    if (this._preemptTimer > 0) {
      this._preemptTimer--;
      // Execute preemptive movement
      if (this._preemptTarget === 'attack') {
        // Pre-dash back — create distance to whiff their attack
        const safeDir = (this.x < 100) ? 1 : (this.x + this.w > GAME_W - 100) ? -1 : -dir;
        if (!this.isEdgeDanger(safeDir)) this.vx = safeDir * moveSpd * (2.2 + this._evolutionStage * 0.14);
      } else if (this._preemptTarget === 'jump') {
        // Anti-air: pre-position at the projected landing zone — wait where they'll
        // come down so Sovereign is already there on touchdown. Falls back to closing
        // in when no distinct landing spot is predictable yet (target still grounded).
        const _landing = this._behaviorModel.projectPosition(t, 45);
        const _lDir    = Math.sign(_landing.x - this.cx()) || dir;
        if (Math.abs(_landing.x - this.cx()) > 28 && !this.isEdgeDanger(_lDir)) {
          this.vx = _lDir * moveSpd * 1.35;
        } else if (!this.isEdgeDanger(dir)) {
          this.vx = dir * moveSpd * (0.85 + this._intimidation * 0.40);
        }
      } else if (this._preemptTarget === 'dodge') {
        // Chase in predicted escape direction
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * (1.7 + this._intimidation * 0.40);
      } else if (this._preemptTarget === 'shield') {
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * (1.1 + this._evolutionStage * 0.10);
        const weapon = this._getCombatWeapon();
        if (d < (weapon.range || 90) * 1.4 && this.cooldown <= 0) this.attack(t);
      }
      return true; // consumed movement frame
    }

    // Arm new preemptive action — lower confidence floor means earlier reads.
    // Re-arm cooldown: without it, sustained high confidence re-arms the 3–5
    // frame burst back-to-back, strobing Sovereign between pre-dash and normal
    // movement several times a second.
    if (this._preemptRearmCd > 0) { this._preemptRearmCd--; return false; }
    if (this._predictConf >= (0.50 - this._evolutionStage * 0.03) && d < 240) {
      this._preemptRearmCd = 22;
      this._preemptTimer  = Math.max(3, 5 - this._evolutionStage);
      this._preemptTarget = this._predictedNext;
      this._preemptMode   = true;
      // Brief visual tell — player sees Sovereign shift just before their input lands
      spawnParticles(this.cx(), this.cy(), `rgb(${this._auraR},${this._auraG},${this._auraB})`, 3);
      return true;
    }
    return false;
  }

  _checkPredictionCorrect(t, prevAction) {
    if (!this._preemptMode || !this._preemptTarget) return;
    const action = _smk2ClassifyAction(t, this._prevT2state);
    if (action === this._preemptTarget) {
      this._predCorrect++;
      this._preemptMode = false;
      this._intimidation = Math.min(1, this._intimidation + 0.09);
      // Reward window: boost attack rate and approach speed for 1.5 sec.
      // Makes reading the player correctly create real combat advantage.
      this._predictionBoostFrames = 90;
      // Celebrate: fire "called it" dialogue occasionally
      if (this._predictDialogueCd <= 0 && Math.random() < 0.35) {
        showBossDialogue(SMK2_PREDICT_LINES[Math.floor(Math.random() * SMK2_PREDICT_LINES.length)], 100);
        this._predictDialogueCd = 300;
      }
    }
    if (this._predictDialogueCd > 0) this._predictDialogueCd--;
  }

  // ══════════════════════════════════════════════════════════════
  // B. PUNISHMENT SYSTEM
  // ══════════════════════════════════════════════════════════════

  _updateSpamTracker(action) {
    const sp = this._spamWindow;
    if (sp.timer > 0) sp.timer--;
    else { sp.action = null; sp.count = 0; }

    if (action !== 'idle') {
      if (action === sp.action) {
        sp.count++;
        sp.timer = 36; // reset window on each new occurrence
      } else {
        sp.action = action;
        sp.count  = 1;
        sp.timer  = 36;
      }
      // 3+ same actions in the window = spam detected
      if (sp.count >= 3 && !this._punishModeActive) {
        this._activatePunishMode(action);
      }
    }
    if (this._punishModeTimer > 0) {
      this._punishModeTimer--;
    } else if (this._punishModeActive) {
      this._punishModeActive = false;
      // Momentum decay: hold suffocate pressure for 1 sec after punish ends.
      // Prevents the abrupt neutral reset that skilled players exploit.
      this._pressureCooldownFrames = 60;
    }
    if (this._pressureCooldownFrames > 0) this._pressureCooldownFrames--;
    if (this._punishDialogueCd > 0) this._punishDialogueCd--;
  }

  _activatePunishMode(triggerAction) {
    this._punishModeActive = true;
    this._punishModeCount++;
    // Duration grows with repetition and intelligence
    this._punishModeTimer = Math.round(180 + this._punishModeCount * 30 + this.intelligence * 60);
    // Reset the spam window so it doesn't re-trigger instantly
    this._spamWindow = { action: null, count: 0, timer: 0 };
    if (this._punishDialogueCd <= 0) {
      showBossDialogue(SMK2_PUNISH_LINES[Math.floor(Math.random() * SMK2_PUNISH_LINES.length)], 180);
      this._punishDialogueCd = 400;
    }
    screenShake = Math.max(screenShake, 10);
    spawnParticles(this.cx(), this.cy(), '#ff2200', 12);
  }

  _tickHabitStat(stat) {
    if (stat.timer > 0) {
      stat.timer--;
      return;
    }
    if (stat.count > 0) stat.count--;
    if (stat.streak > 0) stat.streak = Math.max(0, stat.streak - 1);
  }

  // ── Dossier: recall what he already knows about this opponent ─────────────
  // `_oppMemory` is keyed on the fighter OBJECT, so it dies with the match — the
  // same human returning for round 2 arrives as a stranger. The dossier is keyed
  // on kit + behavioural archetype and persists, which is what turns "he adapts
  // during a fight" into "he already knows what you do".
  //
  // Deliberately conservative: priors seed the BASELINE the dials rest at, they
  // do not overwrite live state, and they are blended by confidence rather than
  // assigned. A wrong recollection costs him a few seconds of ease(), not a match.
  _seedFromDossier(t, kitOnly) {
    // ── Trained-artifact prior ──────────────────────────────────────────────
    // Seeded BEFORE the dossier guard below, and independently of it: the
    // artifact is what overnight training learned about the GAME, while the
    // dossier is what he remembers about THIS OPPONENT. He should arrive
    // knowing the game even against someone he has never met.
    //
    // SovArtifact.gridPrior() has already scaled every cell down to PRIOR_CAP
    // tries, so this is an opening opinion a single fight's evidence can
    // overturn — not a lookup table. Dossier cells win ties (`if (dst[act])
    // continue` below) because opponent-specific memory is strictly more
    // relevant than the general case.
    if (!this._artifactSeeded && typeof SovArtifact !== 'undefined') {
      this._artifactSeeded = true;
      try {
        const ap = SovArtifact.gridPrior();
        for (const sit of Object.keys(ap)) {
          const dst = this._tacticGrid[sit] || (this._tacticGrid[sit] = {});
          for (const act of Object.keys(ap[sit])) {
            if (dst[act]) continue;
            const a = ap[sit][act];
            dst[act] = { tries: a.tries, taken: a.taken, dealt: a.dealt };
          }
        }
      } catch (e) { /* a malformed artifact must never block a fight */ }
    }

    if (typeof SovDossier === 'undefined') return;
    const keys = this._dossierKeys(t, kitOnly);
    if (!keys.length) return;
    this._dossierKeysCache = keys;

    // The grid is seeded WHOLE rather than blended: its cells are already counts,
    // so merging is addition, and a cell he has never filled this match is the one
    // place recollection is unambiguously better than nothing. Seeded once — a
    // re-seed mid-match would overwrite what this fight has been teaching him.
    if (!this._gridSeeded && typeof SovDossier.gridPrior === 'function') {
      this._gridSeeded = true;
      const g = SovDossier.gridPrior(keys);
      if (g) for (const sit of Object.keys(g)) {
        const dst = this._tacticGrid[sit] || (this._tacticGrid[sit] = {});
        for (const act of Object.keys(g[sit])) {
          if (dst[act]) continue;
          const a = g[sit][act];
          dst[act] = { tries: a.tries, taken: a.taken, dealt: a.dealt };
        }
      }
    }

    const prior = SovDossier.dialPrior(keys);
    if (prior && this.aiMemory) {
      const c = Math.min(0.65, prior._confidence || 0);   // never fully surrender the baseline
      const B = this._memBaseline || (this._memBaseline = { ...this.aiMemory });
      const map = { aggression: 'agg', defense: 'def', spacing: 'spc', reactionSpeed: 'rxn' };
      for (const k of Object.keys(map)) {
        const v = prior[map[k]];
        if (typeof v !== 'number' || !isFinite(v)) continue;
        B[k] = B[k] + (v - B[k]) * c;
        this.aiMemory[k] = this.aiMemory[k] + (v - this.aiMemory[k]) * c;
      }
      this._dossierRecall = c;
    }

    // Strategies with a proven track record of leaking against this opponent
    // start pre-discredited, so he does not spend the first minute of every
    // rematch re-learning the same lesson.
    this._strategyFail = this._strategyFail || {};
    for (const st of ['anti-air', 'parry', 'guard-break', 'intercept', 'pressure']) {
      const bias = SovDossier.strategyBias(keys, st);
      if (bias > 0.25) this._strategyFail[st] = Math.max(this._strategyFail[st] || 0, 2);
    }
    this._dossierBest = SovDossier.bestStrategy(keys, ['anti-air', 'parry', 'guard-break', 'intercept', 'pressure']);
  }

  // Commit what this engagement taught. Called on death and on match end — both,
  // because a match can end without him dying and a life can end without the
  // match ending, and losing either sample throws away most of the evidence.
  _commitDossier(reason) {
    if (typeof SovDossier === 'undefined') return;
    const keys = (this._dossierKeys() || []);
    if (!keys.length) return;
    const obs = this._oppObsFrames || 0;
    if (obs < 240) return;                       // too short to have learned anything
    const m = this.aiMemory;
    if (m) SovDossier.recordDials(keys, { agg: m.aggression, def: m.defense, spc: m.spacing, rxn: m.reactionSpeed },
                                  Math.min(3, obs / 900));
    if (this._loadout && this._loadout.key) {
      const gained = Math.max(0, (this.totalDamageDealt || 0) - (this._loadoutDealt0 || 0));
      SovDossier.recordLoadout(keys, this._loadout.key, gained);
    }
    if (typeof SovDossier.recordGrid === 'function') SovDossier.recordGrid(keys, this._tacticGrid);
    SovDossier.save();
    if (this._sovDossierDebug) console.log('[SovDossier] commit', reason, keys.join(','), 'obs', obs);
  }

  // ══ OPPONENT MODELLING — the part that makes adaptation opponent-SPECIFIC ══
  //
  // Prior to this, every learning signal in the class was self-referential (did I
  // land, did I get hit, was my commitment punished). Measured consequence: his
  // dials converged to the same endpoint against three deliberately opposite
  // opponents, with between-opponent SD BELOW rep-to-rep noise. He was adapting
  // to the scoreline, not to the person. These methods supply the missing term.

  // Normalized behaviour rates for the current target. Shares of observed
  // non-idle actions, plus frame shares for airborne/close.
  _oppRates() {
    const obs = this._oppObsFrames || 0;
    if (obs < 180) return null;                // ~3s before any read is asserted
    return {
      attack:     (this._oppAtkFrames      || 0) / obs,
      shield:     (this._oppShieldFrames   || 0) / obs,
      dodge:      (this._oppDodgeFrames    || 0) / obs,
      air:        (this._oppAirFrames      || 0) / obs,
      closeShare: (this._oppCloseFrames    || 0) / obs,
      approach:   (this._oppApproachFrames || 0) / obs,
      retreat:    (this._oppRetreatFrames  || 0) / obs,
      avgDist:    (this._oppDistSum        || 0) / obs,
      samples: obs, frames: obs,
    };
  }

  // Stable fingerprint keys for the current target: exact kit AND behavioural
  // archetype. See the header of smb-sov-dossier.js for why both are needed —
  // the kit key is precise, the archetype key is what lets anything he learned
  // transfer to an opponent he has never met.
  _dossierKeys(t, kitOnly) {
    if (typeof SovDossier === 'undefined') return [];
    const tgt = t || this.target;
    if (!tgt) return [];
    const keys = [SovDossier.kitKey(tgt)];
    // The PERSON, when there is one to name: the human's account (or a lab
    // opponent's fixed _habitKey). Kit and archetype keys are shared by everyone
    // who picks that kit, and a player who switched class used to arrive as a
    // stranger. Not kitKey-first: loadoutPrior/gridPrior read every key anyway.
    if (typeof SovHabits !== 'undefined' && (tgt.isAI === false || tgt._habitKey)) {
      keys.push('who:' + SovHabits.keyFor(tgt));
    }
    if (kitOnly) return keys;
    const r = this._oppRates();
    // Only assert a behavioural key once there is behaviour to read. Before that
    // _oppRates() returns null, archetype() answers 'mixed' for everyone, and
    // filing under 'beh:mixed' would both pollute that record and hand back a
    // recollection averaged over every opponent he has ever met.
    if (!r) return keys;
    const arch = SovDossier.archetype(r);
    this._oppArchetype = arch;
    const bk = SovDossier.behKey(arch);
    keys.push(bk);
    // ── THE BUILD, not the weapon and the habit separately ───────────────────
    // kitKey is weapon/class and behKey is the archetype, and they were filed as
    // two INDEPENDENT records that loadoutPrior then averages. So "aggressive
    // Thor" and "passive Thor" were the same memory: he learned "vs Thor" and
    // "vs rusher" in isolation and blended them, which is exactly the pair of
    // marginals that cannot represent an interaction. A build whose weapon says
    // one thing and whose behaviour says another is the case worth learning.
    //
    // The joint key needs no new machinery: loadoutPrior already weights each key
    // by min(5, n), so a fresh joint record contributes almost nothing and the two
    // marginals carry the pick until the specific build has actually been played
    // a few times. That is hierarchical shrinkage for free — general answer first,
    // specialised only where it has been earned.
    keys.push(SovDossier.kitKey(tgt) + '|' + bk);
    return keys;
  }

  // ── The opponent-conditioned adaptation term ──────────────────────────────
  // Returns signed offsets applied to the dial TARGETS in
  // AdaptiveAI._applyAdaptation. Every term answers "what does fighting THIS
  // person specifically demand", and each is derived from a measured property of
  // the opponent rather than from Sovereign's own scoreline. Offsets are clamped
  // to +/-0.35 by the caller, so a wrong read shades his behaviour without ever
  // flipping him into a different fighter.
  // ══ STRATEGIC LAYER ════════════════════════════════════════════════════════
  // Everything above this is TACTICAL. _applyAdaptation scores a 180-frame window
  // and _oppAdaptTerms reads the opponent's kit plus frame shares that are wiped
  // on every target switch. Neither carries the match. So he cannot answer the
  // three questions that actually decided the 2026-09-05 replays:
  //
  //   "what is killing me?"      — 142 of his damage came from a domain he had no
  //                                perception of, and nothing in his adaptation
  //                                could tell that apart from being out-fought.
  //   "where do I win?"          — his per-swing quality beat the player's in both
  //                                matches (74-77% land rate vs 65-73%); he lost on
  //                                which RANGE he spent the match at.
  //   "has this held all match?" — a habit seen across nine lives is a different
  //                                claim from one seen in the last three seconds.
  //
  // This reads all three at match scope and returns signed offsets that ride the
  // same _oppAdaptTerms channel the kit read uses, so it BIASES the dials that
  // already work rather than seizing control from them. Every term is bounded and
  // confidence-scaled; it can lean him, never lock him.
  _strategicInit() {
    this._strat = {
      frames: 0, lives: 0,
      // "what is killing me" — his HP by source, and the total he returns
      taken: { melee: 0, ability: 0, hazard: 0, other: 0 },
      dealt: 0,
      // "where do I win" — net damage per range band, plus time spent in each
      band: { close: { d: 0, t: 0, f: 0 }, mid: { d: 0, t: 0, f: 0 }, far: { d: 0, t: 0, f: 0 } },
      // "has this held all match" — habit frames that SURVIVE respawns, unlike
      // the _opp* counters which _applyOppProfile zeroes on every switch
      habit: { approach: 0, retreat: 0, air: 0, attack: 0, shield: 0, frames: 0 },
      lastTakenFrame: -1, prevSelfHp: this.health, prevTgtHp: 0,
    };
  }

  _bandOf(dx) { return dx < 90 ? 'close' : dx < 200 ? 'mid' : 'far'; }

  // One cheap pass per frame. Damage is attributed off the stamp dealDamage
  // already writes (_lastAttacker / _lastAttackerFrame / _lastAttackerDmg), so
  // nothing in the combat pipeline has to change to feed this.
  _strategicObserve(t, d) {
    if (!this._strat) this._strategicInit();
    const S = this._strat;
    if (!t || t.health <= 0) return;
    S.frames++;

    const band = this._bandOf(d);
    S.band[band].f++;

    // ── What is hurting him, and by what means ──────────────────────────────
    const stampFrame = this._lastAttackerFrame || -1;
    if (stampFrame > S.lastTakenFrame && this._lastAttacker === t) {
      S.lastTakenFrame = stampFrame;
      const dmg = this._lastAttackerDmg || 0;
      S.band[band].t += dmg;
      // Classify by what was true at the moment of the hit. A domain hazard is
      // the owner's damage arriving without the owner: their domain is open, they
      // are not mid-swing, and they are nowhere near him.
      let kind = 'other';
      const ownsDomain = typeof DomainManager !== 'undefined' && DomainManager.domains &&
                         DomainManager.domains.some(dm => dm && dm.owner === t);
      const reach = ((t.weapon && t.weapon.range) || 90) + 40;
      if (t.attackTimer > 0 || d <= reach)      kind = 'melee';
      else if (ownsDomain)                      kind = 'hazard';
      else if (d > reach)                       kind = 'ability';
      S.taken[kind] += dmg;
    }

    // ── What he is getting back, and from where ─────────────────────────────
    if (S.prevTgtHp > 0 && t.health < S.prevTgtHp) {
      const got = S.prevTgtHp - t.health;
      S.dealt += got;
      S.band[band].d += got;
    }
    S.prevTgtHp = t.health;

    // ── Habits that outlive a life ──────────────────────────────────────────
    const H = S.habit;
    H.frames++;
    if (!t.onGround)       H.air++;
    if (t.attackTimer > 0) H.attack++;
    if (t.shielding)       H.shield++;
    if (Math.abs(t.vx) > 0.4) {
      if (Math.sign(t.vx) === Math.sign(this.cx() - t.cx())) H.approach++;
      else                                                   H.retreat++;
    }
  }

  // Signed offsets on the same scale as the kit terms. Deliberately smaller than
  // the kit read: this is a lean applied to a working adaptation, not a rewrite
  // of it, and a match-scope read that overpowered the live one would make him
  // slower to respond to a player who changes plan mid-fight.
  _strategicTerms() {
    const S = this._strat;
    if (!S || S.frames < 240) return null;              // ~4s before it says anything
    let agg = 0, def = 0, spc = 0, rxn = 0;

    // ── 1. Damage-source shares ─────────────────────────────────────────────
    const totalTaken = S.taken.melee + S.taken.ability + S.taken.hazard + S.taken.other;
    if (totalTaken > 40) {
      const melee  = S.taken.melee  / totalTaken;
      const hazard = S.taken.hazard / totalTaken;
      const rangedAbility = S.taken.ability / totalTaken;
      // Hazards run on a timer and do not care where he stands — the Storm Realm
      // lightning is aimed at his own x and has no vertical test. Backing off pays
      // nothing; ending the owner does. This is the read that the blanket domain
      // retreat used to get exactly backwards.
      if (hazard > 0.25) { agg += 0.09 * hazard; spc -= 0.08 * hazard; }
      // Being out-traded in melee is the one case where guard is worth paying for.
      if (melee > 0.55)  { def += 0.14 * melee; }
      // Chip from outside his reach is a spacing problem, not a guard problem.
      if (rangedAbility > 0.30) { spc += 0.12 * rangedAbility; rxn += 0.08 * rangedAbility; }
    }

    // ── 1b. Damage he cannot attribute at all ───────────────────────────────
    // The source-share read above can only classify what it can name. Ambient
    // pressure is the residue: damage arriving with no attacker, no press and
    // nothing visible. Almost everything shaped like that in this game is a timed
    // field belonging to someone — and every one of them ends when its owner does,
    // so the answer is never to sit further away and wait it out.
    const amb = (typeof this._ambientThreat === 'function') ? this._ambientThreat() : 0;
    if (amb > 0.3) { agg += 0.10 * amb; spc -= 0.09 * amb; }

    // ── 2. Where he is actually profitable ──────────────────────────────────
    // The strongest single lever in the telemetry: across replays his damage rate
    // tracks how much of the match he spends in the band that suits him, and the
    // band that suits him is NOT always the one his weapon nominally wants.
    let bestBand = null, bestNet = -Infinity;
    for (const k of ['close', 'mid', 'far']) {
      const b = S.band[k];
      if (b.f < 120) continue;                          // 2s minimum before it counts
      const net = (b.d - b.t) / (b.f / 60);             // net damage per second there
      if (net > bestNet) { bestNet = net; bestBand = k; }
    }
    if (bestBand && bestNet > 0) {
      // spacing feeds prefDist directly (see _genome.prefDistBase + m.spacing * 60)
      if (bestBand === 'close')     { spc -= 0.09; agg += 0.05; }
      else if (bestBand === 'far')  { spc += 0.08; agg -= 0.04; }
      else                          { spc += 0.04; }
    }

    // ── 3. Habits that have held all match ──────────────────────────────────
    // Same shape as the behaviour cuts in _oppAdaptTerms, but over every life
    // instead of the current engagement — a read this stable is worth asserting
    // harder than a three-second one, and it is the half that survives a player
    // resetting the neutral by dying.
    const H = S.habit;
    if (H.frames > 900) {
      const air = H.air / H.frames, atk = H.attack / H.frames, sh = H.shield / H.frames;
      const app = H.approach / H.frames, ret = H.retreat / H.frames;
      if (sh > 0.16)            { agg += 0.10; spc -= 0.08; }   // persistent turtle
      if (atk > 0.18)           { def += 0.10; rxn += 0.06; }   // persistent swinger
      if (ret > app * 1.5)      { agg += 0.12; spc -= 0.10; }   // persistent zoner
      if (air > 0.58)           { rxn += 0.08; spc += 0.05; }   // persistent floater
    }

    // Bounded, and asserted in proportion to how much match he has actually seen.
    const conf = Math.min(1, S.frames / 1800);          // full weight at ~30s
    // Cap was 0.20 and measured too hot in play — see the coefficient note above.
    const cap  = v => Math.max(-0.13, Math.min(0.13, v)) * conf;
    // `+ sAgg / sDef / sSpc / sRxn` used to be appended here. Those four are the
    // SWARM terms and they are declared in _oppAdaptTerms() below, not in this
    // function — so this return threw `ReferenceError: sAgg is not defined` on
    // every call that got past the 240-frame guard, which is every call that
    // matters. The whole strategic layer (damage-source shares, range-band
    // profitability, persistent habits) has therefore been dead, and silently:
    // the throw unwinds through _oppAdaptTerms into _applyAdaptation.
    // Verified 2026-09-20 by calling it directly with a populated _strat.
    // Gated so the revival itself is measurable. It is a correctness fix — the
    // old code threw — but this layer has been dead long enough that its
    // coefficients have never been validated against live play, and "it used to
    // crash" is not evidence that its numbers are right.
    // `!== false` was wrong: --set passes the NUMBER 0, and 0 !== false under
    // strict comparison, so the gate never fired and the A/B returned exact
    // zeros on every metric — the A/A signature. Check falsiness, but only when
    // the property was deliberately set, so an absent flag still means ON.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE &&
        SMK2_TUNE.stratTerms !== undefined && !SMK2_TUNE.stratTerms) return null;
    return { aggression: cap(agg), defense: cap(def),
             spacing: cap(spc), reactionSpeed: cap(rxn) };
  }

  _oppAdaptTerms() {
    // ── ATTACKER COUNT — computed BEFORE the per-opponent guards ─────────────
    // This ran after `if (!this._oppRates()) return null;` and therefore never
    // ran at all in the case it exists for. Measured in `gauntlet`: 1687 of 1788
    // calls to this function returned null (94%), because _oppRates() needs
    // sustained observation of ONE target and in a crowd he re-targets before it
    // accumulates. The whole opponent-adaptation system switches itself off
    // exactly when facing several opponents — OT was non-zero in 97.6% of cycles
    // against parry_wall and 4.7% against gauntlet.
    //
    // Attacker COUNT needs no per-opponent history, so it is computed first and
    // returned even when the kit/behaviour half has nothing to say.
    let _live = 0;
    const _swarmOn = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.swarmTerm);
    if (_swarmOn && typeof players !== 'undefined' && Array.isArray(players)) {
      for (const p of players) {
        if (!p || p === this || p.health <= 0) continue;
        if (typeof areAlliedEntities === 'function' && areAlliedEntities(this, p)) continue;
        if (Math.abs(p.cx() - this.cx()) > 420) continue;   // only what can reach him
        _live++;
      }
    }
    let sAgg = 0, sDef = 0, sSpc = 0, sRxn = 0;
    if (_live > 1) {
      // Damage output is not what fails him in a crowd — surviving the crossfire
      // is, and a fighter mid-swing cannot escape it (95% of hits he takes land
      // while committed). Every anti-juggle guard in dealDamage() is
      // attacker-keyed, so two attackers defeat all of them at once.
      const swarm = Math.min(1, (_live - 1) / 3);           // 2 -> 0.33, 4+ -> 1.0
      sAgg = -0.22 * swarm;
      sDef =  0.18 * swarm;
      sSpc =  0.16 * swarm;
      sRxn =  0.10 * swarm;
      this._swarmSeen = (this._swarmSeen || 0) + 1;
    }

    const _swarmOnly = (sAgg || sDef || sSpc || sRxn)
      ? { aggression: sAgg, defense: sDef, spacing: sSpc, reactionSpeed: sRxn } : null;
    const t = this.target;
    if (!t || t.health <= 0) return _swarmOnly;
    const r = this._oppRates();
    if (!r) return _swarmOnly;

    const w      = t.weapon || {};
    const reach  = (w.range || 60) / 90;            // 1.0 == sword
    const endlag = (w.cooldown || 30) / 30;         // >1 == slow, punishable
    const hurt   = (w.damage || 12) / 16;           // >1 == hits harder than a sword
    const spd    = (t.classSpeedMult || 1);

    let agg = 0, def = 0, spc = 0, rxn = 0;

    // Evolvable response gains. Fall back to 1.0 for any genome saved before these
    // genes existed — applyGenome() merges over SMK2_DEFAULT_GENOME, so an old
    // champion simply reads the defaults rather than NaN.
    const G   = this._genome || {};
    const gKit = (typeof G.oppKitGain      === 'number') ? G.oppKitGain      : 1;
    const gThr = (typeof G.oppThreatGain   === 'number') ? G.oppThreatGain   : 1;
    const gBeh = (typeof G.oppBehaviorGain === 'number') ? G.oppBehaviorGain : 1;

    // Reach. Losing the spacing war to a longer weapon is not solved by respecting
    // it — every frame spent at their optimal range is a frame he is donating. He
    // presses IN against reach and can afford to sit out against a shorter one.
    agg += (reach - 1) * 0.16 * gKit;
    spc -= (reach - 1) * 0.10 * gKit;

    // Endlag. A slow weapon is a standing invitation: bait the swing, punish the
    // recovery. That is a spacing game, not a rushdown, so this pulls the opposite
    // way from reach on purpose.
    spc += (endlag - 1) * 0.14 * gKit;
    agg -= (endlag - 1) * 0.06 * gKit;

    // Damage AND knockback. Trading is only good arithmetic when his hit is worth
    // more than theirs — but raw damage alone gave a spread of just 0.09 across
    // hammer/katana/spear, well under defense's own 0.053 rep-to-rep noise, so it
    // never surfaced as a measurable read. Knockback is the other half of what a
    // hit actually costs him: it ends his pressure, throws him off the platform,
    // and is the mechanism behind most of his ringout deaths.
    const kb = (w.kb || 10) / 10;
    def += ((hurt - 1) * 0.18 + (kb - 1) * 0.12) * gThr;
    agg -= (hurt - 1) * 0.10 * gThr;

    // Reaction. Cheap to hold high, so it had NO kit term at all and never
    // separated. It should: a 75-frame-cooldown hammer gives him three quarters of
    // a second of forewarning per swing, and paying for hair-trigger reads against
    // it buys nothing he cannot get from standing in the right place. A fast blade
    // is the opposite — the read has to happen or it does not happen at all.
    rxn += (1 - endlag) * 0.10 * gKit;

    // Speed. He cannot dictate range against someone faster; he holds a pocket and
    // makes THEM enter it.
    spc += Math.max(0, spd - 1) * 0.18 * gKit;

    // ── Behaviour, not kit ────────────────────────────────────────────────────
    // A turtle must be opened, not out-waited: spacing against a shield is a
    // stalemate he loses on the clock. A rusher must be met with guard and
    // reaction, not with a race. A zoner has to be closed. An aerial player is
    // punished on landing, which means holding position rather than chasing up.
    // Thresholds are FRAME shares and are calibrated against measured play, not
    // guessed: across 18 trials an opponent spends ~0.10-0.16 of frames mid-swing,
    // ~0.30-0.55 airborne and ~0.60-0.75 within 150px. Cuts sit outside those
    // bands so an ordinary opponent trips none of them and only a genuinely
    // lopsided one does.
    if (r.shield + r.dodge > 0.18) { agg += 0.14 * gBeh; spc -= 0.12 * gBeh; def -= 0.06 * gBeh; }
    if (r.attack > 0.20)           { def += 0.16 * gBeh; rxn += 0.10 * gBeh; agg -= 0.05 * gBeh; }
    if (r.retreat > r.approach * 1.6 && r.avgDist > 170) { agg += 0.18 * gBeh; spc -= 0.16 * gBeh; }
    if (r.air > 0.55)              { rxn += 0.12 * gBeh; spc += 0.06 * gBeh; agg -= 0.04 * gBeh; }

    // Reads are asserted in proportion to how much of the fight has been seen —
    // a 3-second read should not move him as far as a 40-second one.
    const conf = Math.min(1, r.frames / 900);
    // The strategic layer rides the same channel: match-scope damage sources,
    // range profitability and persistent habits, summed on top of the kit read.
    // _applyAdaptation clamps the merged result to +/-0.35 per dial, so the two
    // reads can reinforce or cancel but neither can run away with him.
    const ST = (typeof this._strategicTerms === 'function' && this._strategicTerms()) || null;
    const S_ = k => (ST && isFinite(ST[k])) ? ST[k] : 0;
    return {
      aggression:    agg * conf + S_('aggression'),
      defense:       def * conf + S_('defense'),
      spacing:       spc * conf + S_('spacing'),
      reactionSpeed: rxn * conf + S_('reactionSpeed'),
    };
  }

  _updateHabitTracker(action, t) {
    for (const stat of Object.values(this._habitStats)) this._tickHabitStat(stat);
    if (this._counterCueCd > 0) this._counterCueCd--;
    if (this._fearLineCd > 0) this._fearLineCd--;
    if (this._dominanceZoomCd > 0) this._dominanceZoomCd--;
    if (this._flowBreakCd > 0) this._flowBreakCd--;
    if (this._guardBreakCd > 0) this._guardBreakCd--;
    if (this._repositionBurstCd > 0) this._repositionBurstCd--;
    if (this._audioSpikeTimer > 0) this._audioSpikeTimer--;
    if (this._counterLockTimer > 0) this._counterLockTimer--;

    const stat = this._habitStats[action];
    if (stat) {
      stat.count = Math.min(8, stat.count + 1);
      stat.streak = this._lastHabitAction === action ? Math.min(6, stat.streak + 1) : 1;
      stat.timer = action === 'shield' ? 95 : 82;
      stat.total++;
      this._lastHabitAction = action;
    }
    if (t.shielding && this._habitStats.shield.timer > 0) {
      this._habitStats.shield.timer = Math.max(this._habitStats.shield.timer, 48);
    }

    let best = null;
    let bestScore = 0;
    for (const [key, h] of Object.entries(this._habitStats)) {
      const recency = h.timer > 0 ? (1.0 + h.timer / 95 * 0.8) : 1.0;
      const score = (h.count + h.streak * 0.7) * recency;
      if (score > bestScore) { best = key; bestScore = score; }
    }
    this._dominantHabit = best;
    this._dominantHabitScore = bestScore;
  }

  _habitRepeated(key, countFloor, streakFloor = 2) {
    const h = this._habitStats[key];
    return !!(h && (h.count >= countFloor || h.streak >= streakFloor));
  }

  _triggerFearLine(lines, dur = 110) {
    if (this._fearLineCd > 0 || !lines || !lines.length) return;
    showBossDialogue(lines[Math.floor(Math.random() * lines.length)], dur);
    this._fearLineCd = 220;
  }

  _triggerLimiterBreak(reason) {
    if (this._limiterBroken) return;
    this._limiterBroken      = true;
    this._limiterReason      = reason;
    this._limiterFlashTimer  = 25;
    this._adaptInterval      = 4; // post-break: ~15x/sec — superhuman pattern lock
    this._pressureMode       = 'suffocate';
    this._pressureHoldTimer  = 300;
    this._audioSpikeTimer    = 75;
    if (!this._limiterBreakDialogue) {
      this._limiterBreakDialogue = true;
      showBossDialogue(SMK2_LIMITER_LINES[Math.floor(Math.random() * SMK2_LIMITER_LINES.length)], 260);
    }
    if (typeof setCameraDrama === 'function') setCameraDrama('focus', 90, this, 1.28);
    if (typeof SoundManager !== 'undefined' && typeof SoundManager.superActivate === 'function') SoundManager.superActivate();
    screenShake = Math.max(screenShake, 28);
    spawnParticles(this.cx(), this.cy(), '#ffffff', 40);
    spawnParticles(this.cx(), this.cy(), '#ff0000', 20);
    spawnParticles(this.cx(), this.cy(), '#000000', 20);
  }

  // ══════════════════════════════════════════════════════════════
  // C. LIMITER BREAK MODE
  // ══════════════════════════════════════════════════════════════

  _checkLimiterBreak(t) {
    if (this._limiterBroken) {
      this._limiterAuraPhase = (this._limiterAuraPhase + 0.12) % (Math.PI * 2);
      if (this._limiterFlashTimer > 0) this._limiterFlashTimer--;
      if (this._pressureHoldTimer > 0) this._pressureHoldTimer--;
      if (this._adaptInterval > 4) this._adaptInterval = 4;
      return;
    }
    // A short read is enough: Sovereign still observes before committing, but
    // does not donate a long warm-up while the player establishes a winning loop.
    if (this._observationFrames < 30) return;
    const recentTaken = this._countRecent('dmg_taken', 180);
    const hpPct = this.health / Math.max(1, this.maxHealth);
    const targetAdv = t && t.health > 0 ? t.health / Math.max(1, this.health) : 1;
    const overwhelmed = recentTaken >= 3 || (targetAdv > 1.20 && hpPct < 0.80);
    const habitOverload = this._dominantHabitScore >= 4.5 && this._punishModeCount >= 1;
    if (this.intelligence >= 0.72) return this._triggerLimiterBreak('evolution');
    if (hpPct <= 0.48) return this._triggerLimiterBreak('low_hp');
    if (overwhelmed) return this._triggerLimiterBreak('dominated');
    if (habitOverload) return this._triggerLimiterBreak('habit');
  }

  _updateEvolutionState() {
    const ratio = this._predTotal > 0 ? this._predCorrect / this._predTotal : 0;
    let nextStage = 0;
    if (this.intelligence >= 0.72 || this._predCorrect >= 2 || ratio >= 0.45) nextStage = 1;
    if (this.intelligence >= 0.82 && (this._predCorrect >= 4 || this._punishModeCount >= 2 || ratio >= 0.55)) nextStage = 2;
    if (this._limiterBroken || (this.intelligence >= 0.91 && (this._predCorrect >= 6 || this._punishModeCount >= 4 || ratio >= 0.65))) nextStage = 3;

    // Stage is a RATCHET, deliberately, even though the dials feeding it are no
    // longer one-way. Now that aiMemory breathes instead of pinning, `intelligence`
    // rises and falls through the fight, and a stage derived directly from it would
    // flip 3 -> 2 -> 3 repeatedly — each flip firing a dialogue line, a particle
    // burst and a screen shake. Escalation should still only ever go one way on
    // screen; the adaptation underneath is what varies.
    if (nextStage > this._evolutionStage) {
      this._evolutionStage = nextStage;
      this._evolutionPulse = 30;
      screenShake = Math.max(screenShake, 8 + nextStage * 3);
      spawnParticles(this.cx(), this.cy(), nextStage >= 2 ? '#ff2200' : '#ffbb33', 10 + nextStage * 4);
      if (nextStage > 0) {
        showBossDialogue(SMK2_EVOLUTION_LINES[Math.min(SMK2_EVOLUTION_LINES.length - 1, nextStage - 1)], 180);
      }
    }
    if (this._evolutionPulse > 0) this._evolutionPulse--;
  }

  _updateIntimidation(t, d) {
    let delta = -0.010;
    if (d < 210) delta += 0.014;
    if (d < 140) delta += 0.020;
    if (this._predictConf >= 0.55) delta += 0.010 + this._predictConf * 0.015;
    if (this._punishModeActive) delta += 0.028;
    if (this._exploit.engageTimer > 0) delta += 0.018;
    if (t.health < t.maxHealth * 0.40) delta += 0.010;
    if (t.x < 95 || t.x + t.w > GAME_W - 95) delta += 0.018;
    delta += this._evolutionStage * 0.004;

    this._intimidation = Math.max(0, Math.min(1, this._intimidation + delta));
    this._intimidationPulse = (this._intimidationPulse + 0.09 + this._intimidation * 0.16) % (Math.PI * 2);

    if (this._intimidationLineCd > 0) this._intimidationLineCd--;
    if (this._intimidation > 0.72 && !this._intimidationPeak) {
      this._intimidationPeak = true;
      screenShake = Math.max(screenShake, 6);
      if (this._intimidationLineCd <= 0) {
        showBossDialogue(SMK2_INTIMIDATION_LINES[Math.floor(Math.random() * SMK2_INTIMIDATION_LINES.length)], 150);
        this._intimidationLineCd = 360;
      }
    } else if (this._intimidation < 0.45) {
      this._intimidationPeak = false;
    }
  }

  _updatePressureState(t, d) {
    if (this._pressureHoldTimer > 0) this._pressureHoldTimer--;
    if (this._studyBurstTimer > 0) this._studyBurstTimer--;
    const memory = this._adaptiveMemoryState || null;
    const memoryHot = !!(memory && (
      memory.meleeThreat ||
      memory.openingStyle === 'defensive' ||
      memory.openingStyle === 'edge' ||
      memory.openingStyle === 'aggressive'
    ));
    const memoryAggressive = !!(memory && (
      (memory.localWeight || 0) > 0.18 ||
      (memory.globalWeight || 0) > 0.28
    ));
    const suffocateNow = this._limiterBroken || this._punishModeActive || this._intimidation > 0.58 || this._pressureHoldTimer > 0 || memoryHot || memoryAggressive
      || this._pressureCooldownFrames > 0   // punish mode momentum decay
      || this._predictionBoostFrames > 0;   // prediction reward window
    if (suffocateNow) {
      this._pressureMode = 'suffocate';
      if (d < 170) this._pressureHoldTimer = Math.max(this._pressureHoldTimer, memoryHot ? 34 : 24);
      return;
    }
    const studying = this._predictConf >= 0.34 && this._intimidation < 0.52 && d > 78 && !memoryHot;
    this._pressureMode = studying ? 'study' : 'suffocate';
    if (studying && this._studyBurstTimer <= 0 && this._predictedNext && this._predictConf >= 0.47) {
      this._studyBurstTimer = 20;
    }
  }

  // ── Force Engagement tracker ─────────────────────────────────
  // Call once per AI tick before movement decisions.
  // Returns true if force mode is currently active (caller should act on it).
  _updateForceEngagement(t, d, playerAttacking) {
    const far  = d > this._FORCE_DIST_THRESHOLD;
    const idle = !playerAttacking;

    // Count frames player is staying distant
    if (far)  this._forceEngageDistFrames++;
    else      this._forceEngageDistFrames = Math.max(0, this._forceEngageDistFrames - 4); // decay when close

    // Count frames since player last attacked
    if (idle) this._forceEngageIdleFrames++;
    else      this._forceEngageIdleFrames = 0; // reset on any player attack

    // Activate force mode when BOTH thresholds are met
    if (!this._forceModeActive) {
      if (this._forceEngageDistFrames >= this._FORCE_DIST_FRAMES &&
          this._forceEngageIdleFrames >= this._FORCE_IDLE_FRAMES) {
        this._forceModeActive     = true;
        this._forceModeCloseFrames = 0;
        if (typeof showBossDialogue === 'function') {
          showBossDialogue('You cannot run forever.', 120);
        }
      }
    }

    // While active: count frames spent within close range
    if (this._forceModeActive) {
      if (d < 140) {
        this._forceModeCloseFrames++;
      } else {
        this._forceModeCloseFrames = Math.max(0, this._forceModeCloseFrames - 1);
      }
      // Exit force mode once Sovereign has maintained close range long enough
      if (this._forceModeCloseFrames >= this._FORCE_CLOSE_NEEDED) {
        this._forceModeActive       = false;
        this._forceEngageDistFrames = 0;
        this._forceEngageIdleFrames = 0;
        this._forceModeCloseFrames  = 0;
      }
    }

    return this._forceModeActive;
  }

  // Returns a strategy string if a confident pattern is detected, else null.
  // Requires minimum observation window to have elapsed.
  _getCounterStrategy() {
    if (this._observationFrames < 4 || this._actionSampleCount < 1) return null;

    // Strategic advisor (smb-sov-advisor.js) gets first refusal on the NEXT lock.
    // It reasons over ~15s of fight history, which is a horizon the per-frame
    // engine below structurally cannot see. It only proposes a strategy the
    // engine already implements, and only when its own read hasn't just failed —
    // so a bad suggestion costs one lock and is then scored and discarded like
    // any other. If the advisor is absent or off, this is a no-op.
    if (this._advisorStrategy && !(this._strategyFail || {})[this._advisorStrategy]) {
      const _adv = this._advisorStrategy;
      this._advisorStrategy = null;   // consume — one lock per advisory
      return _adv;
    }

    // ── Frame-share reads first ──────────────────────────────────────────────
    // The rate logic below scores the last 12 non-idle ACTION TAGS, and those
    // tags are far too sparse to see a committed airborne opponent. 'jump' is a
    // rising edge (`!onGround && prevT.onGround`), so a player who re-jumps the
    // instant they land emits ONE tag per jump while spending nearly the whole
    // fight in the air — and 'attack' is tested first in the classifier, so their
    // aerial swings are logged as attacks instead. Measured consequence: against
    // an opponent airborne 75-98% of the time he selected 'pressure' 86% of the
    // time and 'anti-air' almost never, and lost 0 of 10 matches to that
    // archetype while sweeping the other three 10-0.
    //
    // The airborne frame share is the same fact measured over thousands of
    // samples instead of twelve. Reading it here is not a new heuristic; it is
    // the existing anti-air heuristic finally receiving evidence it can see.
    const _fr = this._oppRates && this._oppRates();
    if (_fr) {
      if (_fr.air >= 0.55)                     return 'anti-air';
      if (_fr.shield >= 0.35)                  return 'guard-break';
    }

    const seq = this._actionSeq.filter(a => a !== 'idle');
    if (seq.length < 2) return null;

    // Use the last 12 non-idle actions for rate calculation
    const recent = seq.slice(-12);
    const total  = recent.length;
    const counts = { jump: 0, attack: 0, shield: 0, dodge: 0 };
    for (const a of recent) if (counts[a] !== undefined) counts[a]++;

    const jumpRate   = counts.jump   / total;
    const attackRate = counts.attack / total;
    const shieldRate = counts.shield / total;
    const dodgeRate  = counts.dodge  / total;

    // Thresholds: anti-air fires earlier (0.38) since aerial camping is a dominant exploit
    if (jumpRate   > 0.38) return 'anti-air';
    if (attackRate > 0.22) return 'parry';
    if (shieldRate > 0.22) return 'guard-break';
    if (dodgeRate  > 0.40) return 'intercept';
    // Passive player (low overall action rate relative to window): apply pressure
    if (total <= 6 && this._observationFrames > 180) return 'pressure';
    return null;
  }

  _runHardCounter(t, dir, d, moveSpd, weaponRange, atkRange, playerAttacking) {
    if (this._counterLockTimer > 0) return false;

    // Use rate-based strategy with lock-in — don't re-evaluate every tick.
    // Post-KB profile feeds in as a fallback when no rate-based pattern is detected.
    if (this._adaptLockTimer <= 0) {
      // ── Tactic-swap scoring: did the strategy that just expired actually work? ──
      // Score it once on expiry by how many hits leaked through while it was locked.
      if (this._lockedCounterStrategy && !this._lockScored) {
        this._lockScored = true;
        const _hitsUnderLock = this._countRecent('dmg_taken', 120);
        if (_hitsUnderLock >= 3) {
          this._strategyFail[this._lockedCounterStrategy] = (this._strategyFail[this._lockedCounterStrategy] || 0) + 1;
        } else if (_hitsUnderLock <= 1) {
          this._strategyFail[this._lockedCounterStrategy] = Math.max(0, (this._strategyFail[this._lockedCounterStrategy] || 0) - 1);
        }
        // Same verdict, filed permanently and against WHO it was learned from.
        // `_strategyFail` is rebuilt every match; this is not.
        if (typeof SovDossier !== 'undefined') {
          try { SovDossier.recordStrategy(this._dossierKeys(t), this._lockedCounterStrategy, _hitsUnderLock); } catch (e) {}
        }
      }

      let strategy = this._getCounterStrategy();
      // Recalled counter: something that has demonstrably WORKED against this
      // opponent before outranks a fresh guess, but never outranks a live read —
      // a player who changed their habits since last time must still be able to
      // shake him, or this stops being adaptation and becomes a lookup table.
      if (!strategy && this._dossierBest) strategy = this._dossierBest;
      if (!strategy && this._observationFrames >= 180) {
        // No strong rate pattern — try post-KB dominant behavior as a counter strategy
        const kbHint = this._getPostKBCounterHint();
        if (kbHint === 'jump')    strategy = 'anti-air';
        if (kbHint === 'shield')  strategy = 'guard-break';
        if (kbHint === 'attack')  strategy = 'parry';
        if (kbHint === 'retreat') strategy = 'intercept';
      }
      // Heavy weapon user who has attacked at all: stay in parry mode by default —
      // their long recovery window is the best punish opportunity Sovereign has.
      if (!strategy && t && t.weapon && t.weapon.kb >= 18 && this._actionSampleCount >= 3) {
        strategy = 'parry';
      }

      // ── Lateral swap: the indicated counter keeps failing → switch plans, out loud. ──
      // This is the visible "you adapted, so will I" beat — not just escalation.
      if (strategy && (this._strategyFail[strategy] || 0) >= 2 &&
          typeof SMK2_STRATEGY_SWAP !== 'undefined' && SMK2_STRATEGY_SWAP[strategy]) {
        const _alt = SMK2_STRATEGY_SWAP[strategy];
        if (_alt && _alt !== strategy) {
          strategy = _alt;
          this._strategyFail[_alt] = 0; // give the new plan a clean slate
          if (this._fearLineCd <= 0 && typeof SMK2_TACTIC_SWAP_LINES !== 'undefined') {
            showBossDialogue(SMK2_TACTIC_SWAP_LINES[Math.floor(Math.random() * SMK2_TACTIC_SWAP_LINES.length)], 130);
            this._fearLineCd = 200;
            spawnParticles(this.cx(), this.cy(), '#ff66cc', 10);
            screenShake = Math.max(screenShake, 5);
          }
        }
      }

      if (strategy) {
        this._lockedCounterStrategy = strategy;
        this._adaptLockTimer = 120; // hold this counter for 2 seconds
        this._lockScored     = false; // fresh lock — score it when it expires
      }
    }
    if (this._adaptLockTimer > 0) this._adaptLockTimer--;

    // Execute locked strategy
    const strat = this._lockedCounterStrategy;
    if (strat === 'anti-air') {
      if (!t.onGround) {
        this._counterLockTimer = 10;
        this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 50);
        // Player has double jump: track but don't leap yet — they can escape upward.
        // Once it's spent, commit at full speed and jump freely to intercept.
        const _tHasDJ = !!t.canDoubleJump;
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * (_tHasDJ ? 1.05 : 1.22);
        if (this.onGround && t.cy() < this.cy() - 14 && !playerAttacking && !_tHasDJ) this.vy = -19;
        if (d < atkRange * 1.15 && this.cooldown <= 0) this.attack(t);
        this._triggerFearLine(SMK2_DOMINANCE_LINES, 95);
        return true;
      }
      // Player is grounded: keep positioning so we're already in range when they jump
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.95;
      // fall through to attack logic
    }
    if (strat === 'pressure' && d > 150) {
      // Passive player — close gap and force engagement
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.35;
      if (this.onGround && t.y < this.y - 40) this.vy = -18;
      this._triggerFearLine(SMK2_INTIMIDATION_LINES, 95);
      return true;
    }
    if (strat === 'guard-break') {
      // Player shields constantly — close in and break it
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.25;
      if (d < weaponRange * 1.25 + 24 && t.shielding) {
        this._counterLockTimer = 12;
        t.shielding      = false;
        t.shieldHoldTimer = 0;
        t.shieldCooldown = Math.max(t.shieldCooldown || 0, typeof SHIELD_CD !== 'undefined' ? Math.round(SHIELD_CD * 0.70) : 260);
        t.hurtTimer      = Math.max(t.hurtTimer  || 0, 14);
        t.stunTimer      = Math.max(t.stunTimer  || 0, 8);
        t.vx            += dir * 9;
        screenShake      = Math.max(screenShake, 14);
        spawnParticles(t.cx(), t.cy(), '#ffaa44', 16);
        if (typeof setCameraDrama === 'function') setCameraDrama('impact', 18);
        if (this.abilityCooldown <= 0 && Math.random() < 0.55) this.ability(t);
        else if (this.cooldown <= 0) this.attack(t);
        if (this._guardBreakCd <= 0) {
          this._guardBreakCd = 160;
          this._triggerFearLine(['Guard breaks too.', 'That shield is mine now.', 'Blocking isn\'t a plan.'], 110);
        }
      } else if (!t.shielding && d < weaponRange + 10 && this.cooldown <= 0) {
        // Player isn't shielding — attack normally rather than approaching forever
        this.attack(t);
        this._postHitLockFrames = Math.max(this._postHitLockFrames, 45);
      }
      return true; // always approach even when player isn't shielding yet
    }
    if (strat === 'intercept') {
      // Player dodges constantly — predict escape direction and cut them off
      this._counterLockTimer = 9;
      const interceptDir = Math.abs(t.vx) > 3 ? Math.sign(t.vx) : dir;
      if (!this.isEdgeDanger(interceptDir)) this.vx = interceptDir * moveSpd * 1.55;
      if (d < atkRange * 1.25 && this.cooldown <= 0) this.attack(t);
      this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 36);
      return true;
    }
    if (strat === 'parry' && playerAttacking && d < 170) {
      // Player attacks constantly — dash out of the swing and punish immediately
      this._counterLockTimer = 10;
      const dDir = (this.x < 100 && dir < 0) ? 1 : (this.x + this.w > GAME_W - 100 && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(dDir)) this.vx = dDir * moveSpd * 2.4;
      else if (this.onGround) this.vy = -18;
      // Phase Step as the opening parry-counter if in range
      if (this.abilityCooldown <= 0 && d < 155) {
        this.ability(t);
      }
      if (this._punishTimer === 0) this._punishTimer = this._limiterBroken ? 8 : 14;
      this._triggerFearLine(SMK2_DOMINANCE_LINES, 95);
      return true;
    }

    // Locked rate-based strategy covers all habit patterns now — no duplicate fallback needed.
    return false;
  }

  _runFlowBreak(t, dir, d, moveSpd, weaponRange, playerAttacking, recentTaken) {
    if (this._flowBreakCd > 0) return false;

    const cornered = this.x < 70 || this.x + this.w > GAME_W - 70;
    if (recentTaken >= 2 && d < weaponRange * 1.35 + 30 && this.abilityCooldown <= 0) {
      this._flowBreakCd = 120;
      this._pressureHoldTimer = 90;
      this.ability(t);
      t.vx += dir * 10;
      t.vy = Math.min(t.vy, -8);
      screenShake = Math.max(screenShake, 18);
      if (typeof setCameraDrama === 'function') setCameraDrama('impact', 22);
      this._triggerFearLine(['Your turn is over.', 'No. My pace.', 'You don\'t keep momentum.'], 105);
      return true;
    }

    // Never retreat when opponent is near death — go for the finish instead
    const _tHpRatio = t.health / Math.max(1, t.maxHealth || 150);
    if (_tHpRatio < 0.25) return false;
    if (playerAttacking && d < 155 && (recentTaken >= 1 || this.health < this.maxHealth * 0.46)) {
      this._flowBreakCd = 70;
      const dDir = (this.x < 100 && dir < 0) ? 1 : (this.x + this.w > GAME_W - 100 && dir > 0) ? -1 : -dir;
      if (!this.isEdgeDanger(dDir)) this.vx = dDir * moveSpd * 2.4;
      if (this.onGround) this.vy = -17;
      return true;
    }

    if (cornered && d < 170 && this._repositionBurstCd <= 0) {
      this._repositionBurstCd = 160;
      this._flowBreakCd = 55;
      const centerDir = Math.sign(GAME_W / 2 - this.cx()) || -dir;
      if (!this.isEdgeDanger(centerDir)) this.vx = centerDir * moveSpd * 2.05;
      this.vy = this.onGround ? -16 : this.vy;
      this._pressureHoldTimer = 60;
      spawnParticles(this.cx(), this.cy(), '#ff8844', 10);
      return true;
    }
    return false;
  }

  // ══════════════════════════════════════════════════════════════
  // SPATIAL INTELLIGENCE — Platform + Zone + Post-KB Tracking
  // ══════════════════════════════════════════════════════════════

  // Call once per AI tick (after _updateAntiExploit) to track where the player
  // tends to fight and which platforms they favour.
  // ══════════════════════════════════════════════════════════════
  // BOARD CONTROL — Move the stage, not the fighter
  // ══════════════════════════════════════════════════════════════
  //
  // The Circuit is a perforated plate over void, and Sovereign can slide it (see
  // js/smb-circuit.js). This is where his spatial profile finally does something:
  // three symmetric decks and one unbroken floor gave _prefPlatIdx / _prefZone
  // nothing worth acting on, so the reads accumulated and were spent on little more
  // than approach bias. Here a read becomes a move — he puts a void where the
  // player has demonstrated they want to be.
  //
  // Both routes require an established zone read; a committed airborne player is
  // then the higher-value one, because they cannot change their landing spot
  // mid-arc. Everything is gated on EARNED data — he never moves the plate on a
  // cold read,
  // so a player who varies their footing is never touched by this system. That is
  // the intended counterplay, and it is the same contract as the rest of his kit:
  // he only knows what you have shown him.
  //
  // No-ops entirely off The Circuit. CircuitPlate rejects requests during its own
  // telegraph/slide/cooldown and refuses any throw that would drop Sovereign
  // himself, so this cannot strobe the stage or self-inflict.
  _runPlateControl(t) {
    if (typeof CircuitPlate === 'undefined' || !CircuitPlate) return;
    if (this._plateCd > 0) { this._plateCd--; return; }
    if (!t || t.health <= 0 || this.health <= 0) return;
    if (typeof isCinematic !== 'undefined' && isCinematic) return;

    let wantX = null, why = null;

    // The zone read is the gate on BOTH routes, not just the second one. Deny-landing
    // used to fire on any falling target, and a fighter is airborne constantly, so it
    // won the priority check nearly every time the cooldown lapsed — the plate moved
    // on a schedule rather than on a profile, and the zone route below almost never
    // got a turn. Needs both a real sample size and a real skew; an even spread is
    // not a read, and a player who varies their footing is never touched by this.
    const zTotal = this._zoneVisits[0] + this._zoneVisits[1] + this._zoneVisits[2];
    const zPref  = this._zoneVisits[this._prefZone] || 0;
    if (zTotal <= 200 || zPref / zTotal <= 0.52) return;
    const zoneCX = [GAME_W / 6, GAME_W / 2, GAME_W * 5 / 6][this._prefZone];

    // 1. Player is airborne and falling back into the zone they favour — deny the
    //    landing. Predict where the arc puts them rather than where they are now.
    if (!t.onGround && t.vy > 0.8) {
      const framesToFloor = Math.min(45, Math.max(0, (460 - (t.y + t.h)) / Math.max(0.8, t.vy)));
      const landX = t.cx() + t.vx * framesToFloor;
      if (Math.abs(landX - zoneCX) < GAME_W / 5) {
        wantX = landX;
        why   = 'deny-landing';
      }
    }
    // 2. Otherwise punish the camped zone directly, if they are standing in it now.
    else if (Math.abs(t.cx() - zoneCX) < GAME_W / 5) {
      wantX = t.cx();
      why   = 'deny-zone';
    }

    if (wantX === null) return;
    if (CircuitPlate.slideVoidToward(wantX, why)) {
      this._plateRequests++;
      // Long gap between board moves. The plate is a pressure tool, not a spam
      // one — and the player needs uncontested ground to fight on in between.
      this._plateCd = 260;
      if (typeof showBossDialogue === 'function' && Math.random() < 0.30) {
        showBossDialogue(why === 'deny-landing'
          ? randChoice(['You chose where to land. I chose what is there.',
                        'Committed. Predictable.',
                        'The ground was never the constant here.'])
          : randChoice(['You like it there. I noticed.',
                        'You keep standing in the same place.',
                        'I did not remove it. I moved it.']), 150);
      }
    } else {
      // Rejected (cooldown, trivial travel, or would drop him) — retry soon.
      this._plateCd = 45;
    }
  }

  _updateSpatialProfile(t) {
    // ── Zone tracking ─────────────────────────────────────────
    const zone = t.cx() < GAME_W / 3 ? 0 : t.cx() < GAME_W * 2 / 3 ? 1 : 2;
    this._zoneVisits[zone] += 1;
    if (frameCount % 12 === 0) {
      for (let z = 0; z < 3; z++) this._zoneVisits[z] *= 0.986;
    }
    // Find zone with highest visit count
    this._prefZone = this._zoneVisits[0] > this._zoneVisits[1]
      ? (this._zoneVisits[0] > this._zoneVisits[2] ? 0 : 2)
      : (this._zoneVisits[1] > this._zoneVisits[2] ? 1 : 2);

    // ── Platform landing detection ────────────────────────────
    // Record when the player just landed on a specific platform.
    if (t.onGround && !this._prevTgtOnGnd &&
        typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const pi = this._findCurrentPlatform(t);
      if (pi >= 0) this._platVisits[pi] = (this._platVisits[pi] || 0) + 1;
    }
    // Periodic decay so recent landings dominate
    this._platDecayTick++;
    if (this._platDecayTick >= 180) {
      this._platDecayTick = 0;
      for (let i = 0; i < this._platVisits.length; i++) {
        if (this._platVisits[i]) this._platVisits[i] *= 0.87;
      }
    }
    // Re-derive most-visited non-floor platform (require at least 3 visits)
    if (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      let bestIdx = -1, bestVal = 2.4;
      const plats = currentArena.platforms;
      for (let i = 0; i < plats.length; i++) {
        const p = plats[i];
        if (!p || p.isFloor || p.isFloorDisabled) continue;
        const v = this._platVisits[i] || 0;
        if (v > bestVal) { bestVal = v; bestIdx = i; }
      }
      this._prefPlatIdx = bestIdx;
    }

    // ── Post-KB profile ────────────────────────────────────────
    // Arm when a hit lands (target HP drops); classify response over next 45 frames.
    if (!this._postKBArmed && t && t.health < this._postKBLastTgtHp - 1) {
      this._postKBArmed = true;
      this._postKBTimer = 60; // extended window: full knockback arc is ~1 sec
      // Edge awareness: hit near edge → immediately ramp corner pressure
      const hitNearEdge = t.cx() < 130 || t.cx() > GAME_W - 130;
      if (hitNearEdge) {
        this._cornerPressure = Math.min(1, this._cornerPressure + 0.40);
        this._cornerSide     = t.cx() < GAME_W / 2 ? -1 : 1;
      }
    }
    if (t) this._postKBLastTgtHp = t.health >= 0 ? t.health : this._postKBLastTgtHp;

    if (this._postKBArmed) {
      this._postKBTimer--;
      if (t.attackTimer > 0) {
        this._postKB.attackBack++;
        this._postKBArmed = false;
        if (this._postKBLineCd <= 0 && Math.random() < 0.22) {
          showBossDialogue(SMK2_POSTKB_LINES[Math.floor(Math.random() * SMK2_POSTKB_LINES.length)], 110);
          this._postKBLineCd = 360;
        }
      } else if (t.shielding) {
        this._postKB.shielded++;
        this._postKBArmed = false;
      } else if (!t.onGround && this._prevTgtOnGnd) {
        // _prevTgtOnGnd still holds previous tick's value here — updated at end of function
        this._postKB.jumped++;
        this._postKBArmed = false;
      } else if (t.onGround && Math.abs(t.vx) > 4.5 &&
                 Math.sign(t.vx) !== Math.sign(this.cx() - t.cx())) {
        this._postKB.retreated++;
        this._postKBArmed = false;
      }
      if (this._postKBTimer <= 0) this._postKBArmed = false;
    }

    // ── Aerial preference tracking ─────────────────────────────
    // Every 120 frames re-evaluate what fraction of ticks the player was airborne.
    // If they spend >35% of time off the ground, mark _prefersAerial so the AI
    // proactively jumps to engage and lowers its anti-air trigger threshold.
    if (!this._aerialSamples) { this._aerialSamples = 0; this._aerialSum = 0; }
    this._aerialSamples++;
    if (!t.onGround) this._aerialSum++;
    if (this._aerialSamples >= 120) {
      this._prefersAerial = (this._aerialSum / this._aerialSamples) > 0.35;
      this._aerialSamples = 0;
      this._aerialSum     = 0;
    }

    // Update after all checks — preserves correct edge-detect this tick
    this._prevTgtOnGnd = t.onGround;
  }

  // Find the platform index the target is currently standing on.
  // Returns -1 if no match (airborne, or platform list unavailable).
  _findCurrentPlatform(t) {
    if (!t.onGround) return -1;
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return -1;
    const plats = currentArena.platforms;
    const ty = t.y + t.h;
    const tx = t.cx();
    let best = -1, bestDy = 26;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (!p || p.isFloorDisabled) continue;
      if (tx < p.x - 4 || tx > p.x + p.w + 4) continue;
      const dy = ty - p.y;
      if (dy >= -6 && dy < bestDy) { bestDy = dy; best = i; }
    }
    return best;
  }

  // Returns the dominant post-KB response as a strategy hint:
  //   'attack'  → player tends to counter-attack  → use 'parry' countering
  //   'shield'  → player tends to shield           → use 'guard-break'
  //   'jump'    → player tends to jump away        → use 'anti-air'
  //   'retreat' → player tends to run away         → use 'intercept'
  //   null      → no strong pattern yet
  _getPostKBCounterHint() {
    const { attackBack, shielded, jumped, retreated } = this._postKB;
    const total = attackBack + shielded + jumped + retreated;
    if (total < 4) return null;
    const best = Math.max(attackBack, shielded, jumped, retreated);
    if (best < total * 0.50) return null;
    if (attackBack === best) return 'attack';
    if (shielded   === best) return 'shield';
    if (jumped     === best) return 'jump';
    return 'retreat';
  }

  _chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, bmObs, bmPred, recentTaken) {
    const route = this._behaviorModel.bestPunishRoute({
      currentAction,
      prediction: bmPred,
      distance: d,
      playerOnGround: t.onGround,
      playerAttacking: !!playerAttacking,
      playerShielding: !!t.shielding,
      playerRetreating: t.onGround && Math.abs(t.vx) > 4.5 && Math.sign(t.vx) === -dir,
      playerPassive: !playerAttacking && !t.shielding && Math.abs(t.vx) < 1.3,
      cornered: t.cx() < 110 || t.cx() > GAME_W - 110,
      recentTaken,
      context: bmObs.context,
      pressure: this._pressureMode,
      memory: this._adaptiveMemoryState || null,
    });
    this._adaptivePunishRoute = route;
    this._adaptivePunishTimer  = route === 'delayed'
      ? Math.round(7 + this.intelligence * 8)
      : route === 'crossup'
        ? Math.round(5 + this.intelligence * 4)
        : 0;
    return route;
  }

  _queueAdaptivePunishOutcome(route, t, d) {
    if (typeof frameCount === 'undefined') return;
    this._bmActivePunish = {
      route,
      hpSnap: t ? t.health : Infinity,
      checkFrame: frameCount + 22,
      cornered: !!(t && (t.cx() < 110 || t.cx() > GAME_W - 110)),
      playerShielding: !!(t && t.shielding),
      playerAttacking: !!(t && t.attackTimer > 0),
      distance: typeof d === 'number' ? d : 0,
    };
  }

  _applyAdaptivePunishRoute(route, t, dir, d, moveSpd, jumpVy, weaponRange, atkRange) {
    if (route === 'crossup') {
      if (this.onGround) {
        this.vy = jumpVy;
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.78;
      } else if (this.canDoubleJump && t.y < this.y - 22) {
        this.vy = -16;
        this.canDoubleJump = false;
      }
      if (d < weaponRange * 1.25 + 20 && this.cooldown <= 0 && !this.onGround && this._strike(t)) {
        this._queueAdaptivePunishOutcome(route, t, d);
        this._adaptivePunishTimer = 0;
      }
      return true;
    }

    if (route === 'delayed') {
      if (this._adaptivePunishTimer > 0) {
        this._adaptivePunishTimer--;
        this.vx *= 0.62;
        return true;
      }
      if (d < atkRange * 1.15 && this.cooldown <= 0 && this._strike(t)) {
        this._queueAdaptivePunishOutcome(route, t, d);
        return true;
      }
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.42;
      return true;
    }

    if (d < atkRange * 1.1 && this.cooldown <= 0 && this._strike(t)) {
      this._queueAdaptivePunishOutcome(route, t, d);
      return true;
    }
    if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.82;
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // CORNER PRESSURE SYSTEM — Edge Herding + Cornered Exploit
  // ══════════════════════════════════════════════════════════════

  // Accumulates corner pressure when the player is near a stage edge.
  // Activates corner mode once pressure reaches threshold.
  _updateCornerPressure(t, d) {
    const nearLeft  = t.cx() < 130;
    const nearRight = t.cx() > GAME_W - 130;
    const atEdge    = nearLeft || nearRight;
    const atCenter  = t.cx() > GAME_W * 0.28 && t.cx() < GAME_W * 0.72;

    if (atEdge && d < 200) {
      // Ramp up faster when we're close and they're against the wall
      this._cornerPressure = Math.min(1, this._cornerPressure + (d < 120 ? 0.024 : 0.011));
      this._cornerSide = nearLeft ? -1 : 1;
    } else if (atCenter) {
      // Fast decay when player escapes to center
      this._cornerPressure = Math.max(0, this._cornerPressure - 0.038);
      if (this._cornerPressure < 0.08 && this._cornerMode) {
        this._cornerMode = false;
        this._cornerCd   = 80;
        this._cornerEscapes++;
      }
    } else {
      this._cornerPressure = Math.max(0, this._cornerPressure - 0.012);
    }

    if (this._cornerCd > 0)     this._cornerCd--;
    if (this._postKBLineCd > 0) this._postKBLineCd--;

    // Activate corner mode once threshold is reached
    if (this._cornerPressure >= 0.50 && !this._cornerMode && this._cornerCd <= 0) {
      this._cornerMode = true;
      if (this._fearLineCd <= 0 && Math.random() < 0.40) {
        showBossDialogue(SMK2_CORNER_LINES[Math.floor(Math.random() * SMK2_CORNER_LINES.length)], 130);
        this._fearLineCd = 280;
      }
    }
  }

  // Corner exploit movement: position on the STAGE SIDE of the player
  // (between them and the center), cutting off their escape route.
  // Returns true if corner logic consumed the movement frame.
  _runCornerExploit(t, dir, d, moveSpd, atkRange) {
    if (!this._cornerMode) return false;

    // If player is at the LEFT edge (_cornerSide=-1), Sovereign should be
    // to their RIGHT (positive x) — blocking the path back to center.
    // If player is at the RIGHT edge (_cornerSide=+1), Sovereign should
    // be to their LEFT (negative x).
    // Hysteresis on the side check: at point-blank the raw center comparison
    // flips sign every frame as Sovereign passes over the player, strobing him
    // left-right at 1.55× speed (the "freaking out" jitter). Cross until clearly
    // past (26px), then hold the blocking side until pushed almost fully back.
    const _sideGap = this._cornerSide < 0
      ? (this.cx() - t.cx())   // player near left wall  → positive = Sovereign right of them ✓
      : (t.cx() - this.cx());  // player near right wall → positive = Sovereign left of them ✓
    if (this._cornerBlocking === undefined) this._cornerBlocking = _sideGap > 0;
    if (this._cornerBlocking && _sideGap < 2)        this._cornerBlocking = false;
    else if (!this._cornerBlocking && _sideGap > 26) this._cornerBlocking = true;
    const sovereignBlocksEscape = this._cornerBlocking;

    if (!sovereignBlocksEscape) {
      // Cross to the blocking side
      const crossDir = -this._cornerSide; // toward center
      if (!this.isEdgeDanger(crossDir)) {
        this.vx = crossDir * moveSpd * 1.55;
      } else if (this.onGround) {
        this.vy = -19;
        this.vx = crossDir * moveSpd * 0.7;
      }
    } else {
      // On correct side — press in relentlessly, but hold position once inside
      // blade range: pressing at full speed from point-blank shoves Sovereign
      // across the player and restarts the side-crossing loop.
      if (d > 24) { if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.18; }
      else this.vx *= 0.6;
      if (this.onGround && t.y < this.y - 45 && Math.random() < 0.05) this.vy = -19;
    }

    // Elevated attack rate — cornered player has fewer dodge options
    if (d < atkRange * 1.28 && this.cooldown <= 0) {
      this.attack(t);
      // Queue a follow-up combo hit to maintain pressure / edge knockback
      if (this._comboFollowHits === 0 && this.intelligence > 0.48) {
        this._comboFollowHits  = 1 + (this._limiterBroken ? 1 : 0);
        this._comboFollowTimer = 8;
      }
    }
    if (this.superReady && t.health < t.maxHealth * 0.38 && Math.random() < 0.12) this.useSuper(t);
    if (this.abilityCooldown <= 0 && d < 195 && Math.random() < 0.065) this.ability(t);

    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // PLATFORM CONTROL — Deny and Punish the Player's Favourite Spot
  // ══════════════════════════════════════════════════════════════

  // When a strong platform preference is detected, race the player to that
  // platform and deliver a landing punish the moment they touch down.
  // Returns true if platform logic consumed the movement frame.
  _runPlatformControl(t, dir, d, moveSpd) {
    if (this._prefPlatIdx < 0 || this._punishModeActive ||
        this._cornerMode || this._baitTimer > 0 || this._punishTimer > 0) return false;
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return false;

    const pref = currentArena.platforms[this._prefPlatIdx];
    if (!pref || pref.isFloorDisabled) return false;

    const prefCX = pref.x + pref.w / 2;
    const prefY  = pref.y;

    // Require at least 3 confirmed visits before contesting
    if ((this._platVisits[this._prefPlatIdx] || 0) < 3) return false;

    // Am I already on this platform?
    const selfOnPref = this.onGround &&
      this.cx() >= pref.x - 6 && this.cx() <= pref.x + pref.w + 6 &&
      Math.abs((this.y + this.h) - prefY) < 22;

    // Is the player airborne and heading toward this platform?
    const playerApproachingPref = !t.onGround &&
      t.cy() > prefY - 90 && t.cy() < prefY + 55 &&
      Math.abs(t.cx() - prefCX) < pref.w * 1.6 + 65;

    if (selfOnPref && playerApproachingPref) {
      // Hold position on the preferred platform — deliver a landing punish
      if (Math.abs(this.cx() - prefCX) > 30) {
        const holdDir = Math.sign(prefCX - this.cx());
        if (!this.isEdgeDanger(holdDir)) this.vx = holdDir * moveSpd * 0.55;
      } else {
        this.vx *= 0.78;
      }
      if (t.onGround && d < (this.weapon.range || 90) * 1.35 + 24 && this.cooldown <= 0) {
        this.attack(t);
        // After the punish, anticipate post-KB response
        const hint = this._getPostKBCounterHint();
        if (hint === 'jump' && !this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.9;
      }
      if (this._fearLineCd <= 0 && Math.random() < 0.012) {
        showBossDialogue(SMK2_PLATFORM_LINES[Math.floor(Math.random() * SMK2_PLATFORM_LINES.length)], 110);
        this._fearLineCd = 320;
      }
      return true;
    }

    if (!selfOnPref && playerApproachingPref && Math.random() < 0.045) {
      // Race the player to their preferred platform
      const platDir = Math.sign(prefCX - this.cx());
      if (!this.isEdgeDanger(platDir)) this.vx = platDir * moveSpd * 1.0;
      if (this.onGround && prefY < this.y - 22)      this.vy = -19;
      else if (this.canDoubleJump && prefY < this.y - 22) { this.vy = -15; this.canDoubleJump = false; }
      return true;
    }

    return false;
  }

  // ══════════════════════════════════════════════════════════════
  // OWN-CORNER ESCAPE — jump OVER the player toward center to reverse pressure
  // Fires when Sovereign is backed into his own edge and can't attack outward.
  // Returns true if the escape jump consumed the movement frame.
  // ══════════════════════════════════════════════════════════════
  _runSovereignEscape(t, dir, moveSpd, jumpVy) {
    if (this._sovereignEscapeCd > 0) { this._sovereignEscapeCd--; return false; }
    const atMyEdge = this.x < 80 || this.x + this.w > GAME_W - 80;
    if (!atMyEdge) return false;
    if (!this.onGround && !this.canDoubleJump) return false;

    const escapeDir = this.x < GAME_W / 2 ? 1 : -1; // toward center

    if (this.onGround) {
      this.vy = jumpVy - 3; // extra height to clear player
      this.vx = escapeDir * moveSpd * 2.5;
    } else if (this.canDoubleJump) {
      this.vy = -16;
      this.canDoubleJump = false;
      this.vx = escapeDir * moveSpd * 2.0;
    }

    this._sovereignEscapeCd = 38; // short cooldown — corner reversal is urgent
    if (this._fearLineCd <= 0 && Math.random() < 0.30) {
      const escLines = ['Your corner now.', 'Not here.', 'Side reversed.', 'I prefer this angle.'];
      showBossDialogue(escLines[Math.floor(Math.random() * escLines.length)], 100);
      this._fearLineCd = 240;
    }
    return true;
  }

  // ── BOSS FLOOR HAZARD — evacuate the deck before it is deleted ───────────
  // The Creator and TrueForm arenas periodically remove the floor. The state
  // machine in smb-loop-core.js runs 'normal' → 'warning' (3 s telegraph, with a
  // screen banner) → 'hazard', and 'hazard' sets isFloorDisabled on the floor
  // platform and either drops deathY to 530 (void) or floods it with lava at
  // y = 462.
  //
  // Nothing in this class read bossFloorState. Fighter's own handling for it does
  // exist, but it lives inside Fighter.updateAI(), which this class replaces
  // wholesale — so Sovereign never inherited any of it. The only piece that still
  // reached him was _voidSafetyFrame(), which fires from Fighter.update() and
  // only once he is ALREADY falling. Measured over a live Creator refight: at the
  // frame the warning went up he was standing on the floor, and he was still
  // standing on the floor when it vanished underneath him.
  //
  // Treat the warning exactly like the hazard. A three-second telegraph exists to
  // be read, and Sovereign is meant to be the opponent who never wastes one.
  // Returns true when it has taken the frame.
  _runFloorHazard(moveSpd, jumpVy) {
    if (typeof bossFloorState === 'undefined' || bossFloorState === 'normal') return false;
    if (this.health <= 0 || (this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return false;
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return false;
    const floorPl = currentArena.platforms.find(p => p.isFloor);
    if (!floorPl) return false;

    // Already standing on something that is not the doomed floor — nothing to do,
    // hand the frame back to combat so this never reads as a fight-stopping panic.
    const _cpi = this._findCurrentPlatform(this);
    const _cp  = _cpi >= 0 ? currentArena.platforms[_cpi] : null;
    if (this.onGround && _cp && !_cp.isFloor) return false;

    // Airborne and already climbing toward a safe deck: let the hop steering and
    // _voidSafetyFrame finish the job rather than fighting them for vx.
    if (!this.onGround && this._hopFrames > 0 && this._hopTarget) return false;

    // Pick the safest deck: nearest non-floor platform we can actually reach.
    // Single jump lifts the feet ~150px; the double-jump extension takes it to
    // ~285, matching the reach constant the elevation-pursuit block uses.
    const feet  = this.y + this.h;
    const REACH = 285;
    let best = null, bestScore = Infinity;
    for (const pl of currentArena.platforms) {
      if (!pl || pl.isFloor || pl.isFloorDisabled) continue;
      if (pl.y > feet + 40) continue;              // below us — falling to it is not an escape
      if (pl.y < feet - REACH) continue;           // out of jump range from here
      const cx2 = pl.x + pl.w / 2;
      const score = Math.abs(cx2 - this.cx()) + (feet - pl.y) * 0.35;
      if (score < bestScore) { bestScore = score; best = pl; }
    }
    if (!best) return false;                        // nowhere better — keep fighting

    // Platforms are SOLID FROM BELOW. The first version of this jumped as soon as
    // he was near the deck horizontally, which meant it jumped while he was under
    // it — he slammed his head into the underside, dropped, and re-fired the same
    // decision on landing, over and over, until the floor went and the loop killed
    // him. Stage it the way the elevation-pursuit block does instead: walk out past
    // the deck's nearer EDGE first, and only jump once clear of the underside, then
    // let the hop steering carry the arc back inward onto the deck.
    const _bcx     = best.x + best.w / 2;
    const _clearOf = best.w / 2 + 22;                 // outside this, nothing overhead
    const _fromLeft = this.cx() <= _bcx;              // which side we're approaching from
    const _standX  = _fromLeft ? best.x - 34 : best.x + best.w + 34;

    if (this._floorHopCd > 0) this._floorHopCd--;

    if (this.onGround) {
      if (Math.abs(this.cx() - _bcx) < _clearOf) {
        // Under the deck — walk OUT to the stand point, never jump from here.
        const _outDir = _fromLeft ? -1 : 1;
        if (!this.isEdgeDanger(_outDir)) this.vx = _outDir * moveSpd;
        else this.vx = -_outDir * moveSpd;            // that side is a drop; go around
        this.shielding = false;
        return true;
      }
      // Clear of the underside. Close the last of the gap, then jump inward.
      const _toStand = _standX - this.cx();
      if (Math.abs(_toStand) > 14) {
        const _sdir = Math.sign(_toStand);
        if (!this.isEdgeDanger(_sdir)) { this.vx = _sdir * moveSpd; this.shielding = false; return true; }
      }
      if (this._floorHopCd <= 0) {
        this.vy = jumpVy;
        this.vx = (_fromLeft ? 1 : -1) * moveSpd * 0.75;   // inward, onto the deck
        this._floorHopCd = 14;
        this._hopTarget  = best;
        this._hopFrames  = 40;
      }
    } else {
      // Airborne: steer toward the deck's centre so the arc lands on it.
      this.vx = Math.sign(_bcx - this.cx()) * Math.min(moveSpd, Math.abs(_bcx - this.cx()) / 8 + 1.2);
      if (this.canDoubleJump && this.vy > 0 && this.y + this.h > best.y) {
        // Caught airborne when the state flipped — measured at 36 frames inside the
        // kill band on a lava cycle, because steering alone cannot gain height and
        // he simply fell back onto the deck that was no longer there. Spend the
        // double jump to actually reach the deck he is steering toward.
        this.vy = -16;
        this.canDoubleJump = false;
        this._hopTarget = best;
        this._hopFrames = 40;
      }
    }
    // Do not swing while evacuating — the blade cannot reach anything useful from
    // here and a committed swing's endlag is what leaves him on the deck too long.
    this.shielding = false;
    return true;
  }

  _runVoidRecovery(t, dir, moveSpd, jumpVy) {
    if (this._voidRecoverCd > 0) this._voidRecoverCd--;

    const offLeft   = this.x < -18;
    const offRight  = this.x + this.w > GAME_W + 18;
    const offBottom = this.y > GAME_H + 28;
    // Only treat low-y as a ledge risk when AIRBORNE — the floor itself can sit
    // below GAME_H-180 in some arenas, which would otherwise trigger a trampoline loop.
    // Threshold is GAME_H-120 (=400) — floor y≈376 and normal jump arcs never reach 400.
    const nearLedge = this.x < 62 || this.x + this.w > GAME_W - 62 ||
                      (!this.onGround && this.y > GAME_H - 120);
    const heavyThreat = !!(t && t.weapon && (t.weapon.kb >= 18 || t.weapon.weaponType === 'heavy'));
    // Only treat being near the ledge as void risk if actually moving fast OR just got hit multiple times
    // (was: 45-frame / 1-hit window — caused constant retreat any time near the wall)
    const inVoidRisk = offLeft || offRight || offBottom || (nearLedge && (Math.abs(this.vx) > 5.5 || this._countRecent('dmg_taken', 16) >= 2));

    if (!inVoidRisk) {
      if (heavyThreat) this._heavyThreatCd = Math.max(0, this._heavyThreatCd - 1);
      return false;
    }

    this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 65);
    this._cornerMode = false;
    this._punishModeActive = false;
    this._forceModeActive = false;
    this._studyBurstTimer = 0;
    this._counterLockTimer = 0;
    this._baitTimer = 0;
    this._baitCooldown = Math.max(this._baitCooldown || 0, 18);
    this._humanFakeoutTimer = 0;
    this.shielding = false;

    const centerDir = this.cx() < GAME_W / 2 ? 1 : -1;
    const retreatDir = (offLeft || (nearLedge && this.cx() < GAME_W / 2)) ? 1 : -1;
    let   escapeDir = offLeft ? 1 : offRight ? -1 : centerDir;

    // ── Recovery boost budget ────────────────────────────────────────────────
    // The cooldown below is a RATE limit, not a budget, and that distinction is
    // what broke a live match. A -14 impulse every 12 frames against gravity
    // (~0.8/frame) is a net CLIMB, and the `this.vy > 0` term re-arms the branch the
    // instant he starts falling — so any state that holds inVoidRisk true keeps
    // boosting him forever. He reached y = -2765 (~3300px above the stage) and
    // dragged the camera with him.
    //
    // It could not run away while the ledge zone sat over unbroken floor: he always
    // landed, and landing reset the state. The Circuit's plate put voids INSIDE the
    // stage, so "no ground below me" became a condition he can hold indefinitely at
    // a fixed x. The geometry was hiding the bug; it was never bounded.
    //
    // Two hard stops, both required. The budget resets on landing, so genuine
    // multi-stage recoveries still work exactly as before.
    if (this.onGround) this._voidBoosts = 0;
    // ── The ceiling has to mean something ────────────────────────────────────
    // RECOVER_CEIL was -60: above the TOP of the play area. That reads as a safety
    // net and is not a bound at all — it licenses a 400px climb over the deck, and
    // measured in a live match that is exactly what he did, topping out at y = -117
    // on a stage whose floor is at y = 438. Combined with the boost budget it looks
    // bounded on paper while still letting him leave the screen; what the player
    // sees is three jumps in a row and a Sovereign who beat gravity.
    //
    // Recovery is a BELOW-the-stage concept. Once he is back up to roughly deck
    // level he is not recovering any more, he is just gaining altitude — the
    // horizontal steer above is what actually returns him, and gravity does the
    // rest. So the ceiling is measured from the floor platform, with ~200px of
    // headroom so genuine recoveries can still clear a ledge lip.
    //
    // The lookup deliberately does NOT filter on isFloorDisabled. It used to, and
    // that put the -60 fallback back in play for exactly the window it matters
    // most: the boss floor hazard disables the floor platform, the find() returned
    // null, and RECOVER_CEIL silently reverted to above-the-screen — the original
    // bug, re-armed by the one event in the fight that removes the floor. A
    // disabled floor still marks where the deck IS, which is all this needs.
    const _rcPlats = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms)
      ? currentArena.platforms : null;
    let _rcFloor = _rcPlats ? _rcPlats.find(p => p.isFloor) : null;
    if (!_rcFloor && _rcPlats && _rcPlats.length) {
      // No floor platform at all (some arenas are pure platform fields) — use the
      // lowest deck as the reference so the ceiling still means something.
      for (const p of _rcPlats) if (p && (!_rcFloor || p.y > _rcFloor.y)) _rcFloor = p;
    }
    const _rcHead = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE &&
                     typeof SMK2_TUNE.recoverCeilAboveDeck === 'number') ? SMK2_TUNE.recoverCeilAboveDeck : 200;
    const RECOVER_CEIL = _rcFloor ? _rcFloor.y - _rcHead : -60;
    const _boostMax    = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE &&
                          typeof SMK2_TUNE.voidBoostMax === 'number') ? SMK2_TUNE.voidBoostMax : 3;
    const boostsLeft   = (this._voidBoosts || 0) < _boostMax;
    const underCeiling = this.y > RECOVER_CEIL;
    const mayBoost     = boostsLeft && underCeiling;

    // When he is out of boosts, stop trying to climb and start trying to LAND:
    // steer toward the nearest solid platform he could actually come down on. Over
    // The Circuit's voids the old code pogo'd in place because escapeDir only ever
    // pointed at the arena centre, which is not necessarily standable.
    if (!mayBoost && !this.onGround && typeof currentArena !== 'undefined' &&
        currentArena && currentArena.platforms) {
      const footY = this.y + this.h;
      let bestX = null, bestD = Infinity;
      for (const pl of currentArena.platforms) {
        if (!pl || pl.isFloorDisabled) continue;
        if (pl.y < footY - 40) continue;            // must be at or below him
        const cx    = this.cx();
        const inSpan = cx > pl.x && cx < pl.x + pl.w;
        const tx    = inSpan ? cx : (cx < pl.x ? pl.x + 12 : pl.x + pl.w - 12);
        const dd    = Math.abs(tx - cx);
        if (dd < bestD) { bestD = dd; bestX = tx; }
      }
      if (bestX !== null && bestD > 4) escapeDir = Math.sign(bestX - this.cx()) || escapeDir;
    }

    if (this.onGround || this.canDoubleJump || this.vy > 0 || offBottom) {
      this.vx = escapeDir * moveSpd * (heavyThreat ? 1.02 : 0.90);
      // Gate the jump behind the cooldown — prevents the trampoline pogo-stick
      // that fires when the arena floor is below the GAME_H-180 threshold.
      if (this._voidRecoverCd <= 0 && (this.onGround || mayBoost)) {
        this._voidRecoverCd = heavyThreat ? 16 : 12;
        this.vy = this.onGround ? jumpVy : (offBottom ? -16 : -14);
        if (!this.onGround) this._voidBoosts = (this._voidBoosts || 0) + 1;
        if (this.canDoubleJump && !this.onGround) this.canDoubleJump = false;
        if (typeof showBossDialogue === 'function' && Math.random() < 0.15) {
          showBossDialogue('Not yet.', 70);
        }
      }
      return true;
    }

    if (this._voidRecoverCd <= 0 && mayBoost) {
      this._voidRecoverCd = heavyThreat ? 14 : 10;
      this.vx = retreatDir * moveSpd * (heavyThreat ? 0.96 : 0.84);
      this.vy = -12;
      this._voidBoosts = (this._voidBoosts || 0) + 1;
    } else {
      this.vx = escapeDir * moveSpd * 0.85;
      if (this.vy > 0) this.vy = Math.max(this.vy, 3);
    }
    if (heavyThreat) this._heavyThreatCd = 45;
    return true;
  }

  _updateFearFactor(d, recentLanded, heavyCounter) {
    if ((this._intimidation > 0.70 || this._limiterBroken) && this._dominanceZoomCd <= 0) {
      if (typeof setCameraDrama === 'function') setCameraDrama('focus', 32, this, 1.12 + this._intimidation * 0.06);
      this._dominanceZoomCd = 48;
    }
    if (heavyCounter || recentLanded >= 2) {
      screenShake = Math.max(screenShake, heavyCounter ? 16 : 10);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // D. ANTI-EXPLOIT SYSTEM
  // ══════════════════════════════════════════════════════════════

  _updateAntiExploit(t) {
    const ex = this._exploit;
    const tx = t.cx();

    // ── Stall detection: player hasn't moved ──────────────────
    const moved = Math.abs(tx - ex.lastTargetX) > 6;
    ex.lastTargetX = tx;
    ex.stallFrames = moved ? 0 : ex.stallFrames + 1;
    if (ex.stallRespCd > 0) ex.stallRespCd--;

    if (ex.stallFrames >= 55 && ex.stallRespCd === 0) {
      ex.stallFrames = 0;
      ex.stallRespCd = 300;
      ex.engageTimer = 110;
      ex.engageType  = 'stall';
      showBossDialogue(SMK2_EXPLOIT_STALL[Math.floor(Math.random() * SMK2_EXPLOIT_STALL.length)], 140);
    }

    // ── Edge-camp detection ────────────────────────────────────
    const atEdge = t.x < 85 || t.x + t.w > GAME_W - 85;
    ex.edgeFrames = atEdge ? ex.edgeFrames + 1 : Math.max(0, ex.edgeFrames - 2);
    if (ex.edgeRespCd > 0) ex.edgeRespCd--;

    if (ex.edgeFrames >= 65 && ex.edgeRespCd === 0) {
      ex.edgeFrames = 0;
      ex.edgeRespCd = 420;
      ex.engageTimer = 80;
      ex.engageType  = 'edge';
      showBossDialogue(SMK2_EXPLOIT_EDGE[Math.floor(Math.random() * SMK2_EXPLOIT_EDGE.length)], 140);
    }

    // ── Attack-spam detection ──────────────────────────────────
    if (t.attackTimer > 0 && !(this._prevT2state && this._prevT2state.attacking)) {
      ex.spamCount++;
      ex.spamTimer = 50;
    }
    if (ex.spamTimer > 0) ex.spamTimer--;
    else ex.spamCount = 0;
    if (ex.spamRespCd > 0) ex.spamRespCd--;

    if (ex.spamCount >= 5 && ex.spamRespCd === 0) {
      ex.spamCount  = 0;
      ex.spamRespCd = 300;
      // Activate punishment too
      if (!this._punishModeActive) this._activatePunishMode('attack');
      showBossDialogue(SMK2_EXPLOIT_SPAM[Math.floor(Math.random() * SMK2_EXPLOIT_SPAM.length)], 140);
    }

    if (ex.engageTimer > 0) ex.engageTimer--;

    // ── Passive shield detection: player shields without attacking ─
    const _shieldingIdle = t.shielding && t.attackTimer === 0;
    ex.idleShieldFrames = _shieldingIdle ? ex.idleShieldFrames + 1 : Math.max(0, ex.idleShieldFrames - 3);
    if (ex.idleShieldRespCd > 0) ex.idleShieldRespCd--;

    if (ex.idleShieldFrames >= 60 && ex.idleShieldRespCd === 0) {
      ex.idleShieldFrames  = 0;
      ex.idleShieldRespCd  = 240;
      ex.engageTimer       = 90;
      ex.engageType        = 'passive_shield';
      if (!this._punishModeActive) this._activatePunishMode('shield');
    }
  }

  // Returns true if anti-exploit is forcing a specific action this tick
  _runExploitResponse(t, dir, d, moveSpd) {
    const ex             = this._exploit;
    const playerAttacking = t.attackTimer > 0;
    if (ex.engageTimer <= 0) return false;

    if (ex.engageType === 'stall') {
      // Dash directly at them and attack
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 2.2;
      if (this.onGround && t.y < this.y - 40) this.vy = -20;
      const weapon = this._getCombatWeapon();
      if (d < (weapon.range || 90) * 1.4 && this.cooldown <= 0) this.attack(t);
      // Teleport if far
      if (d > 220 && this._portalCd <= 0) { this._portalCd = 0; }
      return true;
    }
    if (ex.engageType === 'edge') {
      // Bait-and-punish: hold just outside attack range to force a commitment,
      // then dash in and punish when the player swings. Activating corner mode
      // blocks their escape route toward center.
      const weapon = this._getCombatWeapon();
      const _atkR  = (weapon.range || 90) * (1.1 + this._intimidation * 0.08) + 20;
      if (!this._cornerMode && this._cornerCd <= 0) {
        this._cornerPressure = Math.max(this._cornerPressure, 0.75);
        this._cornerMode = true;
        this._cornerSide = t.cx() < GAME_W / 2 ? -1 : 1;
      }
      if (d < _atkR * 0.85 && !playerAttacking) {
        // Hold just outside their reach — bait the attack
        const _baitDir = -dir;
        if (!this.isEdgeDanger(_baitDir)) this.vx = _baitDir * moveSpd * 0.55;
      } else if (playerAttacking && d < _atkR * 1.8) {
        // They committed — dash in and punish the whiff
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 2.2;
        if (d < _atkR + 8 && this.cooldown <= 0) this.attack(t);
      } else {
        // Out of bait range — approach to pressure zone
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.4;
        if (d < _atkR + 4 && this.cooldown <= 0) this.attack(t);
      }
      return true;
    }
    if (ex.engageType === 'passive_shield') {
      this._lockedCounterStrategy = 'guard-break';
      this._adaptLockTimer = Math.max(this._adaptLockTimer, 90);
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.45;
      const _gbWeapon = this._getCombatWeapon();
      const _gbRange  = (_gbWeapon.range || 90) * 1.3 + 20;
      if (t.shielding && d < _gbRange) {
        this._counterLockTimer = 12;
        t.shielding      = false;
        t.shieldHoldTimer = 0;
        t.hurtTimer      = Math.max(t.hurtTimer  || 0, 14);
        t.stunTimer      = Math.max(t.stunTimer  || 0, 8);
        t.vx            += dir * 9;
        screenShake      = Math.max(screenShake, 14);
        spawnParticles(t.cx(), t.cy(), '#ffaa44', 16);
        if (this.abilityCooldown <= 0) this.ability(t);
        else if (this.cooldown <= 0)   this.attack(t);
      } else if (this.cooldown <= 0 && d < (_gbWeapon.range || 90) * 1.4) {
        this.attack(t);
      }
      return true;
    }
    return false;
  }

  // ══════════════════════════════════════════════════════════════
  // E. HUMANIZATION LAYER
  // ══════════════════════════════════════════════════════════════

  _getHumanizedReact() {
    const i = this.intelligence;
    // Early: 4→2 frames; mid: 2→1 frame; late: 1→0 frames
    if (i < 0.35) return Math.round(4 - i * 5.7);           // 4→2
    if (i < 0.65) return Math.round(2 - (i - 0.35) * 3.3); // 2→1
    return Math.round(Math.max(0, 1 - (i - 0.65) * 3.3));  // 1→0
  }

  _updateHumanization(dir, moveSpd) {
    const i = this.intelligence;

    // God-tier: never intentionally miss
    this._humanMissArmed = false;

    // Fake-out movement: DISABLED (unbeatable tuning) — walking the wrong way
    // for 6-14 frames was a donated opening, not a mixup that won exchanges.
    if (this._humanFakeoutTimer > 0) {
      this._humanFakeoutTimer--;
      this.vx = this._humanFakeoutDir * moveSpd * 0.55;
    }
  }

  _getCombatWeapon() {
    const fallback = (typeof WEAPONS !== 'undefined' && (WEAPONS[this.weaponKey] || WEAPONS.sword)) || null;
    const resolved = this.weapon || fallback;
    if (resolved && this.weapon !== resolved) this.weapon = resolved;
    return resolved || { range: 90, damage: 12, cooldown: 32, kb: 12, type: 'melee' };
  }

  // Attack that reports whether a swing actually started. Fighter.attack() can
  // silently veto AI melee swings (whiff-guard) — call sites that consume one-shot
  // state (punish windows, combo counters, rest timers) must know the difference,
  // otherwise Sovereign burns its best windows on swings that never happened.
  _strike(t) {
    const _cd = this.cooldown, _at = this.attackTimer;
    this.attack(t);
    return this.attackTimer > _at || this.cooldown > _cd;
  }

  // Estimate the target's CURRENT outgoing damage multiplier from live buff
  // fields. This is how Sovereign knows a 22-base crescent is about to hit for
  // the 45%-max-HP cap: Kratos rage (+1%/stack), Spartan Rage (+30%), map
  // power buff (+35%), and any flat dmgMult all compound in dealDamage.
  _targetDamageMult(t) {
    if (!t) return 1;
    let m = (typeof t.dmgMult === 'number' && t.dmgMult > 0) ? t.dmgMult : 1;
    if (t.charClass === 'kratos' && t.rageStacks > 0) m *= 1 + Math.min(t.rageStacks, KRATOS_RAGE_MAX) * KRATOS_RAGE_PER;
    if (t.spartanRageTimer > 0) m *= 1.3;
    if (t._powerBuff > 0)       m *= 1.35;
    return m;
  }

  // ── TACTICAL ORCHESTRATION ─────────────────────────────────────────────
  // These helpers do not grant Sovereign new attacks or alter any physical
  // value. They turn already-live combat, map, and resource systems into
  // deterministic decisions, so he stops leaving free advantages unused.
  _getMapHazardAt(fighter) {
    if (!fighter || typeof currentArenaKey === 'undefined' ||
        typeof mapPerkState === 'undefined' || !mapPerkState) return null;

    const state = mapPerkState;
    const x = fighter.cx();
    const footY = fighter.y + fighter.h;
    const lavaY = (typeof currentArena !== 'undefined' && currentArena && currentArena.lavaY) || 442;

    const eruptionSets = [state.eruptions, state.geysers];
    for (let si = 0; si < eruptionSets.length; si++) {
      const set = eruptionSets[si];
      if (!set) continue;
      for (let i = 0; i < set.length; i++) {
        const hazard = set[i];
        if (hazard && hazard.timer > 0 && Math.abs(x - hazard.x) < (si === 0 ? 105 : 95) && footY > lavaY - 285) {
          return { type: si === 0 ? 'eruption' : 'geyser', x: hazard.x };
        }
      }
    }

    const fallingSets = [state.meteors, state.stalactites];
    for (let si = 0; si < fallingSets.length; si++) {
      const set = fallingSets[si];
      if (!set) continue;
      for (let i = 0; i < set.length; i++) {
        const hazard = set[i];
        if (!hazard) continue;
        const width = si === 0 ? 62 : 26;
        const warned = (hazard.warnTimer || 0) > 0 && fighter.onGround;
        const falling = (hazard.warnTimer || 0) <= 0 &&
          Math.abs((hazard.y || 0) - fighter.cy()) < 105;
        if (Math.abs(x - hazard.x) < width && (warned || falling)) {
          return { type: si === 0 ? 'meteor' : 'stalactite', x: hazard.x };
        }
      }
    }

    const carSets = [state.cars, state.cityCars];
    for (let si = 0; si < carSets.length; si++) {
      const set = carSets[si];
      if (!set) continue;
      for (let i = 0; i < set.length; i++) {
        const car = set[i];
        if (!car || (car.warnTimer || 0) > 0) continue;
        const carX = car.x + (car.w || 0) * 0.5;
        if (Math.abs(x - carX) < 72 && Math.abs(footY - car.y) < 76) {
          return { type: 'car', x: carX };
        }
      }
    }

    if (state.zapActive && fighter.onGround && Math.abs(x - state.zapLine) < 52) {
      return { type: 'zap', x: state.zapLine };
    }
    if (state.ghosts) {
      for (let i = 0; i < state.ghosts.length; i++) {
        const ghost = state.ghosts[i];
        if (ghost && Math.hypot(x - ghost.x, fighter.cy() - ghost.y) < 48) {
          return { type: 'ghost', x: ghost.x };
        }
      }
    }
    if (state.blizzardActive && state.blizzardDir &&
        ((state.blizzardDir > 0 && x > GAME_W - 135) || (state.blizzardDir < 0 && x < 135))) {
      return { type: 'blizzard', x, escapeDir: -Math.sign(state.blizzardDir) };
    }
    return null;
  }

  _mapItemValue(item) {
    if (!item || item.collected) return 0;
    const hpRatio = this.health / Math.max(1, this.maxHealth);
    if (item.type === 'heal')  return hpRatio < 0.55 ? 120 : hpRatio < 0.80 ? 72 : 20;
    if (item.type === 'shield') return this.invincible < 20 ? 108 : 36;
    if (item.type === 'power') return 102;
    if (item.type === 'speed') return 88;
    if (item.type === 'maxhp') return 82;
    return 0; // Curses never become a self-inflicted "advantage."
  }

  _selectMapResource(t) {
    if (typeof mapItems === 'undefined' || !mapItems || !mapItems.length) return null;
    let best = null;
    let bestScore = 0;
    for (let i = 0; i < mapItems.length; i++) {
      const item = mapItems[i];
      const value = this._mapItemValue(item);
      if (!value) continue;
      // 460 was under half the arena, so on a 900px stage he could not see a
      // pickup on the far side at all. The distance penalty below already prices
      // travel in; the cull only exists to stop cross-map runs in story worlds.
      const selfDist = Math.hypot(this.cx() - item.x, this.cy() - item.y);
      if (selfDist > 900) continue;
      const targetDist = t ? Math.hypot(t.cx() - item.x, t.cy() - item.y) : Infinity;
      // A contested resource is more valuable: taking it also denies a live buff,
      // heal, shield, or max-health increase to the opponent.
      const denyBonus = targetDist < selfDist + 44 ? 46 : 0;
      const score = value + denyBonus - selfDist * 0.14;
      if (score > bestScore) { best = item; bestScore = score; }
    }
    return best;
  }

  _startTacticalShield(frames) {
    if (this.shieldCooldown !== 0 || this._shieldHoldFrames > 0) return false;
    this.shielding = true;
    this.shieldCooldown = 60;
    this._shieldHoldFrames = frames;
    return true;
  }

  _runMapTactics(t, dir, d, moveSpd, jumpVy, weaponRange) {
    const selfHazard = this._getMapHazardAt(this);
    const targetHazard = this._getMapHazardAt(t);
    this._mapTacticalState = { selfHazard, targetHazard };

    // Let the frame-safe shield timer resolve before a map-control early return.
    // Otherwise standing near a resource or hazard could accidentally freeze a
    // shield hold forever, which would violate the normal shield rules.
    if (this._shieldHoldFrames > 0) return false;

    // Survive guaranteed environmental damage before taking any offensive line.
    if (selfHazard) {
      let escapeDir = selfHazard.escapeDir || (this.cx() <= selfHazard.x ? -1 : 1);
      if (this.isEdgeDanger(escapeDir)) escapeDir = -escapeDir;
      if (!this.isEdgeDanger(escapeDir)) {
        this.vx = escapeDir * moveSpd;
        if (this.onGround && (selfHazard.type === 'car' || selfHazard.type === 'meteor' || selfHazard.type === 'stalactite')) {
          this.vy = jumpVy;
        }
      } else if (this._startTacticalShield(12)) {
        // No safe lane: spend the existing shield instead of donating the hit.
      }
      this._recordEvent('dodge', 4);
      return true;
    }

    // A target caught in a live map hazard has reduced escape options. Keep them
    // there with normal movement/attacks; no hazard damage is fabricated here.
    if (targetHazard && !t.attackTimer && d < 220) {
      this._pressureMode = 'suffocate';
      this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 32);
      if (d < weaponRange + 12 && this.cooldown <= 0) this._strike(t);
      else if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd;
      return true;
    }

    // Map pickups are a real economy — three on The Circuit, curses included.
    // The old gate (out of weapon range AND target not swinging) was never true
    // in suffocate pressure, where Sovereign closes the distance himself, so the
    // branch was dead code on his own arena. Commitment is priced instead: a heal
    // he needs is worth breaking off the fight for, a spare buff is not. The
    // swing check now only blocks while a swing can actually reach him — being
    // mid-attack at range is the safest moment to leave, not the worst.
    if (this._itemRunTimer > 0) this._itemRunTimer--;
    const item = this._selectMapResource(t);
    if (item) {
      const value    = this._mapItemValue(item);
      const breakOff = value >= 100 ? weaponRange * 0.55
                     : value >= 80  ? weaponRange + 20
                     :                weaponRange * 2;
      const swingReaches = d < weaponRange + 24 && t.attackTimer > 0;
      if (!swingReaches && (d > breakOff || this._itemRunTimer > 0)) {
        // Hold the line to the pickup for a beat. Re-deciding every frame made
        // him oscillate between item and target and reach neither.
        this._itemRunTimer = Math.max(this._itemRunTimer, 24);
        const dx      = item.x - this.cx();
        const itemDir = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
        if (itemDir && !this.isEdgeDanger(itemDir)) this.vx = itemDir * moveSpd;
        else if (!itemDir)                          this.vx *= 0.6;
        // The Circuit's decks are passUnder and a jump clears 268px, so rising
        // into one from below lands on top. Commit the jump on approach, not on
        // departure, so the arc ends at the pickup.
        if (this.onGround && item.y < this.y - 55 && Math.abs(dx) < 190) this.vy = jumpVy;
        return true;
      }
    }

    // Breakable ruins crates use the same reward table as pickups. Sovereign
    // opens a favorable crate only while the opponent is safely out of contest
    // range; the normal attack animation performs the crate hit through the
    // map-perk system, so no reward state is modified here.
    const crates = (typeof mapPerkState !== 'undefined' && mapPerkState && mapPerkState.crates) || null;
    if (crates && d > weaponRange * 1.8 && !t.attackTimer) {
      let crate = null;
      let crateScore = 0;
      for (let i = 0; i < crates.length; i++) {
        const candidate = crates[i];
        const value = this._mapItemValue(candidate);
        if (!value || !candidate || candidate.hp <= 0) continue;
        const score = value - Math.hypot(this.cx() - candidate.x, this.cy() - candidate.y) * 0.16;
        if (score > crateScore) { crate = candidate; crateScore = score; }
      }
      if (crate) {
        const crateDir = Math.sign(crate.x - this.cx());
        const crateDist = Math.abs(crate.x - this.cx());
        if (crateDist < weaponRange + 18 && this.cooldown <= 0) {
          // The target is far by this branch's own precondition, so the AI melee
          // whiff-guard would veto this swing; the environment-swing flag lets
          // the crate hit through (crate damage is range-checked in updateMapPerks).
          this._envSwing = true;
          this._strike(t);
          this._envSwing = false;
          return true;
        }
        if (crateDir && !this.isEdgeDanger(crateDir)) {
          this.vx = crateDir * moveSpd;
          if (this.onGround && crate.y < this.y - 55) this.vy = jumpVy;
          return true;
        }
      }
    }

    // Forest healing and neon speed pads are existing map systems too. Use them
    // when there is enough space to convert the resource without yielding a hit.
    if (typeof currentArenaKey !== 'undefined' && currentArenaKey === 'forest' &&
        this.onGround && this.health < this.maxHealth * 0.48 && d > weaponRange * 2.2 && !t.attackTimer) {
      this.vx = 0;
      return true;
    }
    const pads = (typeof mapPerkState !== 'undefined' && mapPerkState && mapPerkState.boostPads) ||
      (typeof MAP_PERK_DEFS !== 'undefined' && MAP_PERK_DEFS.neonGrid && MAP_PERK_DEFS.neonGrid.boostPads);
    if (typeof currentArenaKey !== 'undefined' && currentArenaKey === 'neonGrid' && pads &&
        (this._speedBuff || 0) <= 0 && d > 180 && !t.attackTimer) {
      let pad = null;
      let padDist = Infinity;
      for (let i = 0; i < pads.length; i++) {
        const pd = Math.abs(pads[i].x - this.cx());
        if (pd < padDist) { pad = pads[i]; padDist = pd; }
      }
      if (pad) {
        const padDir = Math.sign(pad.x - this.cx());
        if (padDir && !this.isEdgeDanger(padDir)) {
          this.vx = padDir * moveSpd;
          return true;
        }
      }
    }
    return false;
  }

  _tryTacticalConversion(t, d, weaponRange) {
    if (!t || t.health <= 0 || (t.invincible || 0) > 24 ||
        (typeof isCinematic !== 'undefined' && isCinematic)) return false;

    const targetLocked = this._targetHelpless(t) || (t._parryVulnFrames || 0) > 12;
    const targetBuffed = !!(t._powerBuff || t._speedBuff || t.spartanRageTimer || t.superReady);
    const targetCursed = !!(t.curses && t.curses.length);
    const targetArmored = !!(t.armorPieces && t.armorPieces.length);
    const targetInHazard = !!(this._mapTacticalState && this._mapTacticalState.targetHazard);
    const finishable = t.health <= t.maxHealth * 0.30;
    const selfNeedsSuper = this.health <= this.maxHealth * 0.38;
    const closeEnough = d < Math.max(180, weaponRange * 2.1);

    // Spend ability first to crack an active guard or convert a recovery/hazard
    // trap. This avoids the old random casts that often spent it in neutral.
    const abilityWindow = t.shielding || targetLocked || targetInHazard ||
      (t._reloadTimer || 0) > 0 || (this.stamina || 0) < 18 || targetBuffed;
    if (this.abilityCooldown <= 0 && this.attackEndlag <= 0 && !this.shielding &&
        closeEnough && abilityWindow) {
      const oldCd = this.abilityCooldown;
      this.ability(t);
      if (this.abilityCooldown > oldCd) return true;
    }

    // Supers heal Sovereign and carry the strongest existing weapon-specific
    // conversion. Hold them for a concrete close-range payoff, never a coin flip.
    // Within two supers of Absolute Dominion, holding for a perfect window costs
    // more than the window is worth — the domain is the bigger payoff, and the
    // counter is wiped by death, so banking supers can lose it outright.
    //
    // Gate was `>= 3`. Measured across the eight September replays: Sovereign
    // reached 3 spends in a life in roughly a third of his lives, so the
    // accelerator meant to carry him to Absolute Dominion almost never engaged —
    // he took ZERO domains in all eight matches, including the two he won, with
    // a best-ever life of 3 against a threshold of 5. The player took one in
    // four matches and won every one of those. At `>= 1` the push is live for
    // almost the whole life, which is the only way the counter reaches 5 before
    // a death resets it.
    const domainPush = (this._domainSuperCount || 0) >= 1;

    // The super is also a combo STARTER, not only a reward for a window someone
    // else opens. In swing range, with the opponent not mid-swing and not
    // guarding, opening with it is a real line — every other term in
    // `superWindow` waits on the opponent to make a mistake first.
    const comboOpener = d < weaponRange + 40 && !t.attackTimer && (this.attackEndlag || 0) <= 0;

    // Stale-bank release is handled in _updateSuperBank(), which runs every frame
    // from update(). This function turned out to be reached only ~15 times a
    // minute and never once while superReady, so it is the wrong home for it.
    const _bankStale = !!this._bankStale;

    const superWindow = targetLocked || targetInHazard || finishable || selfNeedsSuper ||
      targetCursed || (targetArmored && targetBuffed) || this._punishModeActive || domainPush ||
      _bankStale || comboOpener;
    if (this.superReady && closeEnough && superWindow && !t.shielding) {
      this.useSuper(t);
      if (!this.superReady) return true;
    }
    return false;
  }

  // ── LETHAL VOLLEY DEFENSE — homing crescent fans (sword super / Blade Storm) ──
  // The sword systems spawn fans of crescents in t._swordSlashes that fly ~340px,
  // HOME vertically onto their target (±0.35/frame), and deliberately hover
  // waiting out i-frames so every slash in the fan lands. With ramped damage
  // multipliers each crescent hits the 45%-max-HP cap — a full fan is a
  // guaranteed stock loss if the first one connects. This was the replay-proven
  // kill: chip → launch → the rest of the fan juggles Sovereign to 0 mid-air.
  // Counters exploit the crescents' own physics: fixed horizontal direction
  // (they can never turn around) and clamped vertical homing (can't track a
  // burst at close range). Returns true when it consumed the movement frame.
  // ── Always-on perception (runs even while mid-reaction) ────────────────────
  // Timestamps the opponent's button presses and learns from damage nothing
  // visible explains. Uses its own prev-state fields because the decision-layer
  // copies below are only updated on frames Sovereign actually acts.
  // ── Per-opponent profile bundle ───────────────────────────────────────────
  // The fields that describe THIS opponent rather than Sovereign's own state.
  // Everything else (health, cooldowns, stage, limiter) is his and stays put.
  _captureOppProfile() {
    return {
      behaviorModel:    this._behaviorModel,
      bmPrevSnap:       this._bmPrevSnap,
      prevT2state:      this._prevT2state,
      actionSampleCount: this._actionSampleCount,
      habitStats:       this._habitStats,
      unknownThreat:    this._unknownThreat,
      comboPrevTgtHp:   this._comboPrevTgtHp,
      obsPrevAbilityCd: this._obsPrevAbilityCd,
      obsPrevSuperReady: this._obsPrevSuperReady,
      dominantHabit:    this._dominantHabit,
      dominantHabitScore: this._dominantHabitScore,
      lastHabitAction:  this._lastHabitAction,
    };
  }

  _applyOppProfile(p) {
    // Frame-share counters are per-opponent and are NOT part of the saved bundle
    // (they describe an engagement, not a person). Zero them on every switch so a
    // new opponent is not read through the last one's positioning.
    this._oppObsFrames = 0; this._oppAirFrames = 0; this._oppCloseFrames = 0; this._oppDistSum = 0;
    this._oppAtkFrames = 0; this._oppShieldFrames = 0; this._oppDodgeFrames = 0;
    this._oppApproachFrames = 0; this._oppRetreatFrames = 0;
    if (p) {
      this._behaviorModel      = p.behaviorModel;
      this._bmPrevSnap         = p.bmPrevSnap;
      this._prevT2state        = p.prevT2state;
      this._actionSampleCount  = p.actionSampleCount;
      this._habitStats         = p.habitStats;
      this._unknownThreat      = p.unknownThreat;
      this._comboPrevTgtHp     = p.comboPrevTgtHp;
      this._obsPrevAbilityCd   = p.obsPrevAbilityCd;
      this._obsPrevSuperReady  = p.obsPrevSuperReady;
      this._dominantHabit      = p.dominantHabit;
      this._dominantHabitScore = p.dominantHabitScore;
      this._lastHabitAction    = p.lastHabitAction;
      return;
    }
    // First time meeting this opponent — a blank profile, not the last one's.
    this._behaviorModel      = new BehaviorModel();
    this._bmPrevSnap         = null;
    this._prevT2state        = null;
    this._actionSampleCount  = 0;
    this._habitStats = {
      jump:   { count: 0, streak: 0, timer: 0, total: 0 },
      dodge:  { count: 0, streak: 0, timer: 0, total: 0 },
      attack: { count: 0, streak: 0, timer: 0, total: 0 },
      shield: { count: 0, streak: 0, timer: 0, total: 0 },
    };
    this._unknownThreat = {
      viaAbility: 0, viaSuper: 0, viaNeither: 0, total: 0,
      neither: [],                 // frames of unattributable damage (ambient threat)
      delaySum: 0, delayN: 0,
      distSum: 0,  distN: 0,
    };
    this._comboPrevTgtHp     = Infinity;
    this._obsPrevAbilityCd   = 0;
    this._obsPrevSuperReady  = false;
    this._dominantHabit      = null;
    this._dominantHabitScore = 0;
    this._lastHabitAction    = 'idle';
  }

  // ── Threat score ──────────────────────────────────────────────────────────
  // "Who deserves my attention" — damage dealt to me dominates, proximity and
  // helplessness break ties. Nearest-only was the old implicit answer and it is
  // exactly what lets a ranged second player farm him from across the arena.
  _smk2ThreatScore(c) {
    if (!c || typeof frameCount === 'undefined') return -Infinity;
    const led   = this._threatLedger.get(c);
    // Damage decays over ~8s, so an opponent who stops fighting stops being the
    // priority, but a burst of damage outweighs a body standing closer.
    let recent  = 0;
    if (led) {
      const age = frameCount - led.lastFrame;
      if (age < 480) recent = led.dmg * (1 - age / 480);
    }
    const d     = Math.hypot(c.cx() - this.cx(), c.cy() - this.cy());
    let score   = recent * 2.2 + Math.max(0, 60 - d / 12);
    // A helpless opponent is a free punish — the engine's own rule, reused here.
    if (this._targetHelpless(c)) score += 30;
    // Finish what is nearly dead rather than resetting onto a full-health body.
    const hpPct = c.maxHealth > 0 ? c.health / c.maxHealth : 1;
    if (hpPct < 0.25) score += 22;
    // Summons and minions are attention sinks. Worth turning on when they are
    // genuinely the threat, but never at the same weight as the player driving them.
    //
    // The penalty is conditional, though. A flat -45 meant a minion standing right
    // on top of him swinging freely could never out-score a boss he was already
    // locked onto — which is precisely the "second enemy hits him for free" case.
    // A summon that is in his face AND actually committing attacks has earned the
    // attention; one loitering across the arena has not.
    if (!(Array.isArray(players) && players.includes(c))) {
      const _inFace = d < 90 && ((c.attackTimer || 0) > 0 || (c.cooldown || 0) > 0);
      let _pen = _inFace ? 12 : 45;
      // Even the reduced -12 was a flat number, so a summon that had been chipping
      // him for twenty seconds scored the same as one that had never landed a hit.
      // Fade the penalty out against what it has ACTUALLY taken off him: a summon
      // doing real damage earns the target slot, and one that is only present does
      // not. Full fade at 60 recent damage — a summon that has done that much is
      // no longer a distraction, it is the fight.
      _pen *= 1 - Math.min(1, recent / 60);
      score -= _pen;
    }
    return score;
  }

  // ── Threat-weighted retarget, with hysteresis ─────────────────────────────
  // Runs before perception so observation is always attributed to the fighter
  // Sovereign is actually engaging. The dwell floor and the challenger margin
  // exist to stop the two-candidate strobe that pure per-frame scoring produces
  // when both opponents sit at a similar distance.
  _updateTargetSelection() {
    if (typeof players === 'undefined') return;
    this._retargetDwell++;

    const pool = [...players, ...(typeof minions !== 'undefined' ? minions : [])];
    const live = pool.filter(c => !this._isInvalidAITarget(c));
    if (!live.length) { this.target = null; return; }

    const cur     = this._isInvalidAITarget(this.target) ? null : this.target;
    let best      = null, bestScore = -Infinity;
    for (const c of live) {
      const s = this._smk2ThreatScore(c);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (!best || best === cur) return;

    // No current target (dead, gone, or first frame): take the best one now.
    // This is also what stops him freezing when his only opponent dies.
    if (!cur) { this._switchTarget(best); return; }

    // Otherwise a challenger must clearly beat the incumbent AND the incumbent
    // must have been held long enough to have been given a fair chance.
    if (this._retargetDwell < 45) return;
    const curScore = this._smk2ThreatScore(cur);
    if (bestScore > curScore * 1.35 + 12) this._switchTarget(best);
  }

  _switchTarget(next) {
    const prev = this.target;
    if (prev && !this._isInvalidAITarget(prev)) {
      this._oppMemory.set(prev, this._captureOppProfile());
    }
    this.target = next;
    this._retargetDwell = 0;
    this._applyOppProfile(this._oppMemory.get(next) || null);
    this._seedFromDossier(next);
    // Short-horizon state that describes the OLD engagement and would read as
    // garbage against the new one on the first tick.
    this._comboFollowHits = 0;
    this._comboExtensions = 0;
    this._comboLandedLast = false;
    this._reactLatch      = null;
    this._counterWindowOpen = false;
    this._prevPlayerAtk   = 0;
    this._endlagWindow    = 0;
    this._blindEvadeUntil = 0;
  }

  // Fold damage taken into the ledger. Reads the attribution stamp dealDamage()
  // leaves on every hit; no hook into the damage path itself.
  _updateThreatLedger() {
    if (typeof frameCount === 'undefined') return;
    const a = this._lastAttacker;
    if (!a || this._lastAttackerFrame === this._threatSeenFrame) return;
    this._threatSeenFrame = this._lastAttackerFrame;
    // ── COMMITMENT SAMPLING ───────────────────────────────────────────────
    // Piggybacks the ledger's new-hit edge, which is the only place in the class
    // that already knows "a hit just landed on me" exactly once.
    //
    // VECTOR's dominant overnight finding, over ~80 confirmed runs: 95% of the
    // hits he takes land while he is MID-SWING. That is a fact about the fight he
    // is in, not about Sovereign in general — a rusher produces a completely
    // different number — so it has to be measured live rather than assumed.
    if (!this._commitRing) this._commitRing = [];
    this._commitRing.push(((this.attackTimer || 0) > 0 || (this.attackEndlag || 0) > 0) ? 1 : 0);
    if (this._commitRing.length > 24) this._commitRing.shift();
    const led = this._threatLedger.get(a) || { dmg: 0, lastFrame: frameCount };
    // Decay the running tally toward the newest hit so old damage fades.
    const age = frameCount - led.lastFrame;
    if (age > 480) led.dmg = 0;
    led.dmg      += (this._lastAttackerDmg || 0);
    led.lastFrame = this._lastAttackerFrame;
    this._threatLedger.set(a, led);
  }

  _observeAlways() {
    const t = this.target;
    if (!t || t.health <= 0 || typeof frameCount === 'undefined') return;
    const d = Math.abs(t.cx() - this.cx());

    const cd = t.abilityCooldown || 0;
    const sr = !!t.superReady;
    if (this._obsPrevAbilityCd === 0 && cd > 0) {
      this._tAbilityFiredAt = frameCount;
      this._armBlindEvade('ability', d);
    }
    if (this._obsPrevSuperReady && !sr) {
      // This block was EMPTY, and _tSuperFiredAt is initialised to -9999 and
      // assigned nowhere else — so `sinceS` was always ~9999, `u.viaSuper` could
      // never increment, and _armBlindEvade('super', ...) was never once called.
      // The entire super half of blind learning was unreachable. It is also the
      // half that matters most here: a domain expansion is a super, so the one
      // mechanism built to learn from damage he cannot see was structurally
      // incapable of firing for the exact thing that was killing him.
      this._tSuperFiredAt = frameCount;
      this._armBlindEvade('super', d);
    }
    this._obsPrevAbilityCd  = cd;
    this._obsPrevSuperReady = sr;

    // Unexplained damage → learn the precondition, not the projectile.
    if (this._selfPrevHp !== null && this.health < this._selfPrevHp - 0.5 && this.health > 0) {
      const reach = (t.weapon ? (t.weapon.range || 60) : 60) + 55;
      const meleeExplains = d < reach && ((t.attackTimer || 0) > 0 || (t.attackEndlag || 0) > 0);
      let seenNear = false;
      for (const hz of _smk2OwnedHazards(t)) {
        if (Math.abs((hz.x || 0) - this.cx()) < 90 && Math.abs((hz.y || 0) - this.cy()) < 90) { seenNear = true; break; }
      }
      if (!meleeExplains && !seenNear) {
        const u = this._unknownThreat;
        u.total++; u.distSum += d; u.distN++;
        const sinceA = frameCount - this._tAbilityFiredAt;
        const sinceS = frameCount - this._tSuperFiredAt;
        if (sinceS >= 0 && sinceS < 110)      { u.viaSuper++;   u.delaySum += sinceS; u.delayN++; }
        else if (sinceA >= 0 && sinceA < 110) { u.viaAbility++; u.delaySum += sinceA; u.delayN++; }
        else {
          // ── AMBIENT THREAT ───────────────────────────────────────────────
          // Damage with no press to blame and nothing visible near him. This
          // counter existed and was READ BY NOTHING, which is the whole reason a
          // domain could delete him without his behaviour changing: adaptation
          // that only fires on a recognised precondition is not adaptation, it is
          // a lookup. Learning from consequences must not require identifying the
          // cause — "I keep losing HP standing here" is sufficient evidence to
          // stop standing here, whether or not he can name what is doing it.
          u.viaNeither++;
          u.neither.push(frameCount);
          if (u.neither.length > 12) u.neither.shift();
        }
      }
    }
    this._selfPrevHp = this.health;
    this._updateAmbientResponse();
  }

  // ── Blind threat: arm an evasion window from a learned precondition ────────
  // Called on the opponent's ability/super press. If unexplained damage has
  // followed that press before, and from about this range, treat the press itself
  // as the telegraph. Requires 2 prior burns so one freak hit can't make him
  // flinch at everything, and the window is sized from the observed delay.
  _armBlindEvade(src, dist) {
    const u = this._unknownThreat;
    if (!u || u.total < 2) return;
    const hits = src === 'super' ? u.viaSuper : u.viaAbility;
    if (hits < 2) return;
    // Only if the press happens at a range comparable to where it burned us —
    // a point-blank ability is a melee problem the normal systems already handle.
    const avgDist = u.distN ? u.distSum / u.distN : 0;
    if (avgDist > 90 && dist < avgDist * 0.45) return;
    const avgDelay = u.delayN ? Math.round(u.delaySum / u.delayN) : 24;
    this._blindEvadeUntil = frameCount + Math.max(14, Math.min(75, avgDelay + 16));
    this._blindEvadeSrc   = src;
    if (this._blindLineCd <= 0 && typeof showBossDialogue === 'function') {
      this._blindLineCd = 420;
      showBossDialogue(src === 'super' ? 'That again. I felt it the first time.'
                                       : 'I do not need to see it.', 110);
    }
  }

  // ── AMBIENT THREAT PRESSURE ───────────────────────────────────────────────
  // 0..1: how heavily he is being hurt by things he can neither see nor blame on
  // a button. Deliberately source-agnostic — it does not know or care whether the
  // cause is a domain, an off-screen shooter, a floor hazard or a bug. It is the
  // model-free half of his learning: consequences without a cause model.
  _ambientThreat() {
    const u = this._unknownThreat;
    if (!u || !u.neither || !u.neither.length) return 0;
    if (typeof frameCount === 'undefined') return 0;
    // Hits inside the last ~8 seconds, weighted so the newest count most.
    let w = 0;
    for (const f of u.neither) {
      const age = frameCount - f;
      if (age < 0 || age > 480) continue;
      w += 1 - age / 480;
    }
    return Math.min(1, w / 4);          // 4 recent unexplained hits == saturated
  }

  // Standing still is the one response that is always wrong to an unseen source,
  // so a sustained ambient read re-arms the same evasion window the press-driven
  // path uses. He does not learn WHAT is hitting him; he learns that where he is
  // standing is losing him the fight, which is the part that changes behaviour.
  _updateAmbientResponse() {
    if (typeof frameCount === 'undefined') return;
    const a = this._ambientThreat();
    this._ambientLevel = a;
    if (a < 0.5) return;
    if (frameCount < (this._ambientArmedUntil || 0)) return;
    this._ambientArmedUntil = frameCount + 90;
    this._blindEvadeUntil   = Math.max(this._blindEvadeUntil || 0, frameCount + 26);
    this._blindEvadeSrc     = 'ambient';
    if (this._blindLineCd <= 0 && typeof showBossDialogue === 'function') {
      this._blindLineCd = 420;
      showBossDialogue('Something in this place is biting me. It changes nothing.', 110);
    }
  }

  // Evade a threat that has never been perceived — pure learned response.
  _runBlindEvasion(t, dir, moveSpd, jumpVy) {
    if (this._blindLineCd > 0) this._blindLineCd--;
    if (frameCount >= this._blindEvadeUntil) return false;
    // Break the firing line: move off the axis and change height. No target to
    // dodge, so the goal is simply to not be where we were when they committed.
    let away = -dir || 1;
    if (this.isEdgeDanger(away)) away = -away;
    if (!this.isEdgeDanger(away)) this.vx = away * moveSpd * 1.3;
    if (this.onGround && this._jumpCooldown <= 0) {
      this.vy = jumpVy; this._jumpCooldown = 16;
    }
    this._recordEvent('dodge', 2);
    this.aiReact = 0;
    return true;
  }

  // ── Telegraphed ground-strike + lingering-zone evasion ─────────────────────
  // Two threat shapes the projectile scan structurally cannot handle:
  //   • Thunderstrike marks a ground position and drops a bolt there after a
  //     delay. It has no velocity, so a vx-based scan never sees it — yet it is
  //     the single most punishing thing in the game (4 bolts, AoE, stun each) and
  //     it renders a flickering warning marker the whole time it is pending.
  //   • Shock Bolt leaves a crackling zone that ticks damage to anyone standing
  //     in it. Static, so again invisible to a velocity scan.
  // Both are read here and answered by MOVING OFF THE MARK, which is exactly what
  // a good human does. Returns true when it consumed the movement frame.
  _runTelegraphedEvasion(t, dir, moveSpd, jumpVy) {
    if (!t) return false;
    const myX = this.cx(), myY = this.cy();
    let threatX = null, urgency = 0;

    // Pending sky strikes — treat the marked spot as lethal ground.
    if (t._thunderStrikes) {
      for (const ts of t._thunderStrikes) {
        if (!ts || ts.fired) continue;
        if (Math.abs(myX - ts.x) < 78 && Math.abs(myY - ts.y) < 150) {
          threatX = ts.x; urgency = 2; break;
        }
      }
    }
    // Lingering damage zones — standing in one is free chip.
    if (threatX === null && t._elecZones) {
      for (const z of t._elecZones) {
        if (!z || (z.timer !== undefined && z.timer <= 0)) continue;
        const r = (z.r || 62) + 16;
        if (Math.abs(myX - z.x) < r && Math.abs(myY - z.y) < r + 30) {
          threatX = z.x; urgency = 1; break;
        }
      }
    }
    if (threatX === null) return false;

    // Step off the marked x, preferring the side that keeps us on stage and, all
    // else equal, the side the target is on — evading must not concede the fight.
    let away = Math.sign(myX - threatX) || (this.facing ? -this.facing : 1);
    if (this.isEdgeDanger(away)) away = -away;
    if (!this.isEdgeDanger(away)) this.vx = away * moveSpd * (urgency > 1 ? 1.45 : 1.0);
    else if (this.onGround && urgency > 1) { this.vy = jumpVy; this.vx = dir * moveSpd * 0.5; }
    this._recordEvent('dodge', urgency > 1 ? 3 : 1);
    this.aiReact = 0;
    return true;
  }

  _runVolleyDefense(t, d, dir, moveSpd, jumpVy) {
    if (!t) return false;
    // Collect EVERY live traveling melee hazard the target owns. Crescents live
    // in _swordSlashes (sword super/Blade Storm, katana Iaijutsu, spear Ground
    // Spike); the flail ball, scythe toss, and hammer shockwave are single
    // objects in their own fields — invisible to the generic projectile pools,
    // which is exactly why they must be scanned here.
    const hazards = _smk2OwnedHazards(t);
    if (!hazards.length) return false;
    let near = null, nearDx = 1e9, count = 0;
    for (const sl of hazards) {
      const dx = sl.x - this.cx();
      const dy = (sl.y || 0) - this.cy();
      if (Math.abs(dx) > 360 || Math.abs(dy) > 150) continue;
      count++;
      if (Math.abs(dx) < Math.abs(nearDx)) { near = sl; nearDx = dx; }
    }
    if (!near) return false;
    // Lethal-class gate: multi-slash fans always qualify; a single crescent only
    // when its capped damage is a real chunk of our health. Vanilla single
    // crescents (22 dmg, no multipliers) stay with the ordinary projectile dodge.
    const estRaw  = Math.round(22 * this._targetDamageMult(t));
    const estHit  = Math.min(estRaw, Math.round(22 * 3.5), Math.floor(this.maxHealth * 0.45));
    if (count < 2 && estHit < Math.max(30, this.health * 0.28)) return false;
    // Escape direction = the crescents' own travel direction (they cannot
    // reverse), falling back to away-from-attacker.
    const away = Math.abs(near.vx || 0) > 1 ? Math.sign(near.vx) : -dir;
    const gap  = Math.abs(nearDx);
    // Slashes hover waiting out INVINCIBILITY, but a shield spends them on
    // contact (hitSet) with no launch — it defuses the whole fan and breaks the
    // juggle chain even if the shield cracks. Prefer it whenever the fan is
    // actually about to connect.
    const _canShield = this.shieldCooldown === 0 && this._shieldHoldFrames === 0;
    if (this.onGround) {
      const _runway = away < 0 ? this.x - 40 : (GAME_W - 40) - (this.x + this.w);
      if (gap > 95 && _runway > 150 && !this.isEdgeDanger(away)) {
        // Outrun the fan: crescents fly a fixed 8 px/f and expire in ~42 frames.
        this.vx = away * moveSpd * 2.2;
      } else if (gap < 130 && _canShield && count >= 2) {
        this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 16;
      } else if (gap < 90) {
        // Matador: at close range the homing clamp (±0.35/f) cannot correct onto
        // a full jump burst. Late-dodge up and across, INWARD off a wall.
        this.vy = jumpVy;
        this.vx = (this.isEdgeDanger(away) ? -away : away) * moveSpd * 1.6;
      } else {
        // Out of runway, fan still inbound: hold coiled and let it come to
        // matador range — burning the jump early is what homing punishes.
        this.vx *= 0.5;
      }
    } else if (this.canDoubleJump && gap < 120) {
      this.vy = -15; this.canDoubleJump = false;
      this.vx = (this.isEdgeDanger(away) ? -away : away) * moveSpd * 1.8;
    } else if (!this.onGround && gap < 130 && _canShield && count >= 2) {
      // Juggle state, no jump left — shield mid-air to spend the hovering fan.
      this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 14;
    } else {
      // Airborne, jump spent: fast-fall + drift — vertical homing tracks slow
      // arcs, not a dive.
      this.vy = Math.max(this.vy, 8);
      if (!this.isEdgeDanger(away)) this.vx = away * moveSpd * 1.5;
    }
    this._recordEvent('dodge', 6);
    this.aiReact = 0;
    return true;
  }

  // ── VOLLEY-CYCLE ENGAGEMENT TIMING ────────────────────────────────────────
  // A ramped crescent thrower's point-blank fan spawns ON Sovereign with zero
  // reaction window — no movement answers it. The only counter is to not be in
  // the blast radius while it is ARMED: hold just outside, force the throw at
  // range (where volley defense answers it), then all-in during the ~2.5s
  // ability cooldown. Returns 'standoff' | 'window' | null.
  // ── DOES THIS OPPONENT ACTUALLY USE ITS ABILITY? ─────────────────────────
  // _volleyCyclePosture treats a target as ARMED whenever its ability is merely
  // off cooldown, which is the resting state of anyone who never presses it.
  // Measured 2026-09-20 over the full scenario sweep: the opponent's
  // abilityCooldown was 0 on 23,142 of 23,142 posture calls, 'window' posture
  // fired ZERO times, and the two standoff branches together won 47.7% of every
  // decision frame in the match. Half his life was spent retreating from a
  // threat that never once arrived.
  //
  // So watch for the cooldown going 0 -> positive, which only happens when the
  // ability is actually spent, and let the standoff be earned rather than
  // assumed. He eats the first one and respects it afterwards — which is what
  // adapting to an opponent is supposed to look like.
  _observeTargetThreat() {
    const t = this.target;
    if (!t) return;
    if (t !== this._threatWatchTarget) {
      this._threatWatchTarget = t;
      this._tgtAbilityCdPrev  = t.abilityCooldown || 0;
      // Opponent-keyed, so switching targets in a 3-way does not inherit the
      // other one's record.
      this._tgtAbilityUses    = 0;
      this._tgtAbilityLastUse = -99999;
      return;
    }
    const cd   = t.abilityCooldown || 0;
    const prev = this._tgtAbilityCdPrev || 0;
    this._tgtAbilityCdPrev = cd;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    if (prev <= 0 && cd > 0) {
      this._tgtAbilityUses    = (this._tgtAbilityUses || 0) + 1;
      this._tgtAbilityLastUse = _fc;
    }
    if (t.superReady === false && this._tgtSuperPrev === true) {
      this._tgtAbilityUses    = (this._tgtAbilityUses || 0) + 1;
      this._tgtAbilityLastUse = _fc;
    }
    this._tgtSuperPrev = !!t.superReady;
  }

  // True when the standoff has been earned: this opponent has spent the ability
  // at least once, and recently enough that another is worth expecting.
  _volleyThreatDemonstrated() {
    if ((this._tgtAbilityUses || 0) <= 0) return false;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    // NOT `|| -99999`: frameCount is 0 on the first frame of a headless match, and
    // a use recorded at frame 0 is falsy, so the fallback would fire on a real
    // observation and the threat would be forgotten the instant it was seen.
    const last = (this._tgtAbilityLastUse === undefined) ? -99999 : this._tgtAbilityLastUse;
    return (_fc - last) < 900;   // ~15s memory
  }

  _volleyCyclePosture(t) {
    if (!t || !t.weapon) return null;
    // Per-weapon burst radius: how far the ARMED ability/super reaches with no
    // reactable travel time. Standing inside it while armed is donating a stock
    // once the wielder's damage is ramped. Whip's Lasso auto-yanks from 280px,
    // so its standoff ring sits outside that.
    const _burstR = {
      sword: 185, fryingpan: 195, katana: 175, whip: 305,
      shield: 150, hammer: 165, flail: 165, scythe: 165, broomstick: 165,
    }[t.weaponKey];
    if (!_burstR) return null;
    if (this._targetDamageMult(t) < 1.25) return null;
    const armed = (t.abilityCooldown || 0) === 0 || !!t.superReady;
    this._volleyStandoffR = _burstR;
    // volleyArmedRead: an available ability is not a demonstrated one.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.volleyArmedRead &&
        !this._volleyThreatDemonstrated()) return null;
    return armed ? 'standoff' : 'window';
  }

  // Is the target currently unable to fight back? (locked in swing recovery,
  // stunned, ragdolled, parry-vulnerable, reloading, or guard-broken up close)
  // These are the engine's hard rules — a helpless target is a FREE punish.
  _targetHelpless(t) {
    if (!t) return false;
    return (t.stunTimer   || 0) > 10 ||
           (t.ragdollTimer|| 0) > 10 ||
           (t._parryVulnFrames || 0) > 25 ||
           (t.attackEndlag || 0) > 6 ||
           (t._reloadTimer || 0) > 12;
  }

  // ══ PUNISHER READ — one plan, veto only, self-observed ════════════════════
  //
  // WHAT SURVIVED THE PLAN EXPERIMENT
  // The general plan layer measured non-positive in every configuration (see
  // docs/sovereign-observations.md). Exactly one thing inside it was robust:
  // bait_whiff_punish beat parry_wall in 4 of 4 independent runs (+1.75, +0.67,
  // +0.83, +1.17 stocks) across changing libraries, changing context keys, and
  // with steering both on and off. Against an opponent who shields on reaction
  // and punishes recovery, "only swing into their commitment" is just correct.
  //
  // So this is that one plan and nothing else: no library, no exploration, no
  // steering — the three things measured to cost him. A single read, and a veto
  // through the choke point every swing already passes.
  //
  // THE READ IS OF HIMSELF, NOT OF THEM. Whether the opponent is "a punisher" is
  // hard to observe and easy to get wrong. Whether HE keeps getting hit mid-swing
  // is one bit per incoming hit and is the thing that actually matters — it is
  // true of a parry_wall and false of a rusher, which is exactly the distinction
  // the veto needs to make.
  _punisherRead() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.baitPunisher) return false;
    const r = this._commitRing;
    // Enough hits to mean something. Below this he has no opinion and swings
    // normally — the cost of a wrong read is paid in donated tempo, and early in
    // a life he cannot afford to donate any.
    const need = (typeof TUNE.baitMinHits === 'number') ? TUNE.baitMinHits : 8;
    if (!r || r.length < need) return false;
    const rate = r.reduce((a, b) => a + b, 0) / r.length;
    const thr  = (typeof TUNE.baitRate === 'number') ? TUNE.baitRate : 0.5;
    return rate > thr;
  }

  // ══ TACTICAL PLANS — adaptation above the level of the verb ═══════════════
  //
  // WHY THIS LAYER EXISTS, AND WHAT IT IS ANSWERING
  // Two separate adaptation systems have now measured null:
  //   · the eleven continuous genome dials — A/B vs frozen-at-max was a wash
  //     (Welch t=0.18, Aug 26), because every dial is a one-way ratchet that
  //     saturates ~6s into any fight;
  //   · discrete choice among the grid's six primitives — the super-release gate
  //     fired 1392 times across 144 matches per arm and moved nothing
  //     (fitness t=-0.50, stocks t=-0.09, Sep 20).
  //
  // The common property of both failures is the SIZE OF THE DECISION. A dial
  // changes how hard he does what he was already doing. A primitive swap changes
  // one frame. Neither can express "stop trading and make them come to you for
  // the next two seconds", which is the kind of sentence that actually decides
  // fights — and it is the reason smb-sov-artifact.js ships a named tactic
  // library that, until now, nothing could execute.
  //
  // So a plan is a MULTI-SECOND COMMITMENT with its own success statistic. It is
  // chosen, held for ~1.5s, and then priced by what it cost — the same booking
  // discipline _markTactic uses, one level up.
  //
  // SAFETY: plans steer and veto. They never seize.
  //   · steering only runs while GROUNDED and inboard of the floor span, so it
  //     can never fight the off-stage recovery, the spawn-defend jump, or
  //     _airDenyTrack — all of which own vx in situations a plan has no opinion
  //     about. A plan that steers a recovering fighter into the void is not a
  //     tactic, it is a bug.
  //   · the attack veto routes through SovereignMK2.attack(), the single choke
  //     point all twelve call sites already pass through. No call site changes.
  //   · a plan can never make him idle: PRESSURE never vetoes, and the veto is
  //     skipped entirely whenever the target is helpless, so free damage is
  //     always taken. "AI must always engage" is preserved by construction.
  // disengage_reset is OFF the default library. Measured Sep 20: with it in, plans
  // lose stocks (3.20 vs 3.55) while dealing IDENTICAL damage (926.95 vs 941.75)
  // and taking MORE (424.58 vs 388.62) — output was never the cost, position was.
  // It retreats on a pure away-from-target vector, and his largest single death
  // cause is the edge ringout. The grounded-and-inboard guard stops a plan
  // STARTING near the ledge; nothing stopped this one walking him to it.
  // Restorable via SMK2_TUNE.planDisengage once it retreats toward stage centre.
  _planLibrary() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const lib = ['pressure_ground', 'bait_whiff_punish', 'spacing_poke'];
    if (TUNE.planDisengage) lib.push('disengage_reset');
    return lib;
  }

  // ── PLAN CONTEXT — the term the first build was missing ───────────────────
  // Measured Sep 20: a context-blind plan layer is a net LOSS (stocks 2.80 vs
  // 3.18, lockout 8.87% vs 7.56% at t=2.33) — but the loss is not uniform. It is
  // a large WIN against parry_wall (+1.75 stocks) and a large loss against
  // landing_trap (-1.34), gauntlet (-1.17) and escalator (-0.83). Patient plans
  // beat a patient opponent and get him killed by a pressuring one.
  //
  // A single global statistic per plan cannot hold both of those facts at once:
  // he learns "baiting works" from the punisher and then baits into a gauntlet.
  // That is the same shape as the Aug 27 finding that _applyAdaptation had zero
  // opponent terms and converged identically against three opposite opponents.
  //
  // So plan value is keyed by how much pressure he is actually under. Coarse on
  // purpose — four buckets, from the threat ledger he already maintains — because
  // a plan statistic needs to fill inside one match.
  _planContext() {
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    let dmg = 0, srcs = 0;
    if (this._threatLedger) {
      for (const [f, e] of this._threatLedger) {
        if (!e || _fc - e.lastFrame > 300) continue;
        if (!f || f.health <= 0) continue;
        dmg += e.dmg || 0; srcs++;
      }
    }
    // Multiple live attackers is its own context, not a louder version of one:
    // every anti-juggle guard in dealDamage is attacker-keyed, so two attackers
    // defeat all of them at once and the right plan changes completely.
    if (srcs > 1) return 'swarm';
    return dmg > 60 ? 'hot' : dmg > 15 ? 'warm' : 'cold';
  }

  // Net health per plan attempt, same statistic the grid uses one level down.
  // Thin plans return null so _selectPlan falls through to trying them.
  _planValue(name, ctx) {
    const e = this._planStat && this._planStat[(ctx || 'cold') + '|' + name];
    if (!e || e.tries < 2) return null;
    return (e.dealt - e.taken) / e.tries;
  }

  // Epsilon-greedy over plans, with untried plans taking priority over explore.
  // A plan he has never run has no opinion attached, and the cheapest way to get
  // one is to run it once.
  _selectPlan(t) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const lib = this._planLibrary();
    if (!this._planStat) this._planStat = {};
    const ctx = this._planContext();
    const untried = lib.filter(n => {
      const e = this._planStat[ctx + '|' + n];
      return !e || e.tries < 2;
    });
    if (untried.length) return untried[Math.floor(Math.random() * untried.length)];
    const explore = (typeof TUNE.planExplore === 'number') ? TUNE.planExplore : 0.2;
    if (Math.random() < explore) return lib[Math.floor(Math.random() * lib.length)];
    let best = lib[0], bestVal = -Infinity;
    for (const n of lib) {
      const v = this._planValue(n, ctx);
      if (v === null) continue;
      if (v > bestVal) { bestVal = v; best = n; }
    }
    return best;
  }

  // Open a plan, or close and price the one that is running. Mirrors
  // _markTactic/_resolveTactic: snapshot on open, health delta on close, with a
  // death inside the window priced as the maximum a decision can cost.
  _planTick() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.tacticPlans === false) { this._activePlan = null; return; }
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    if (this.health <= 0) { this._activePlan = null; return; }
    const t = this.target;
    if (!t || t.health <= 0) { this._activePlan = null; return; }
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const HOLD = (typeof TUNE.planHold === 'number') ? TUNE.planHold : 90;

    const P = this._activePlan;
    if (P && _fc - P.frame >= HOLD) {
      const died  = this.lives !== P.lives;
      const taken = died ? P.hp + 40 : Math.max(0, P.hp - this.health);
      // KILL CREDIT — the mirror of the death surcharge above.
      // Scoring a kill as 0 made every ledger structurally unable to value the
      // action that CLOSES a stock: his own death cost hp+40, his own kill paid
      // nothing. The comment explaining this guard is about respawn making the
      // health delta garbage, which is true and is not a reason to round the
      // reward to zero rather than to the mirror of the penalty.
      // TARGET IDENTITY. The snapshot is meaningless unless it is compared against
      // the SAME fighter it was taken from. Resolving against this.target instead
      // let a mid-window retarget price bot A's decision with bot B's health — and
      // because every bot spawns with identical `lives`, the "they died" guard below
      // also passed spuriously, so a kill was never even detected as one.
      const _bt = P.tgt;
      const dealt = !_bt ? 0
                  : (_bt.lives === P.tLives) ? Math.max(0, P.tHp - _bt.health)
                  : (_KC() ? (this._killCredits = (this._killCredits || 0) + 1, P.tHp + 40) : 0);
      if (!this._planStat) this._planStat = {};
      const key = (P.ctx || 'cold') + '|' + P.name;
      const e = this._planStat[key] || (this._planStat[key] = { tries: 0, taken: 0, dealt: 0 });
      e.tries++; e.taken += taken; e.dealt += dealt;
      // Same rolling decay as the grid: a plan that stopped working early must be
      // able to come back, or the first two minutes decide the whole match.
      if (e.tries > 8) { e.tries *= 0.75; e.taken *= 0.75; e.dealt *= 0.75; }
      this._activePlan = null;
      this._planCount = (this._planCount || 0) + 1;
    }

    if (!this._activePlan) {
      this._activePlan = {
        name: this._selectPlan(t), frame: _fc, ctx: this._planContext(), tgt: t,
        hp: this.health, lives: this.lives, tHp: t.health, tLives: t.lives,
      };
    }
    this._executeTactic(this._activePlan.name, t);
  }

  // The executor the tactic library always assumed existed. Steering only.
  _executeTactic(name, t) {
    if (!name || !t || t.health <= 0 || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    // Grounded and inboard only — see the SAFETY note above.
    if (!this.onGround) return;
    if ((this._spawnDefendTimer || 0) > 0 || (this._airDenyTimer || 0) > 0) return;
    if (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const fl = currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
      if (fl && (this.cx() < fl.x + 40 || this.cx() > fl.x + fl.w - 40)) return;
    }
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    // planSteer isolates the two halves of a plan. The veto is a decision; the
    // steering is a movement CONTROLLER, and it runs from update() after
    // super.update() has already let updateAI choose a velocity — so every frame
    // it fires it discards pathfinding, edge-danger and hazard avoidance and
    // replaces them with a naive distance hold. Turning it off measures the veto
    // alone, which is the only way to tell a bad tactic from a bad integration.
    if (TUNE.planSteer === false) return;
    const reach = (this.weapon && this.weapon.range) || 90;
    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = Math.sign(dx) || 1;
    // Hold a band rather than a point: a target distance produces a fighter who
    // oscillates across it every frame, which is the 44-flip/sec strobe the
    // corner-exploit hysteresis had to fix once already.
    const band = (lo, hi) => {
      if (d > hi)      this.vx = dir * Math.min(5.5, 2 + (d - hi) * 0.05);
      else if (d < lo) this.vx = -dir * Math.min(5.0, 2 + (lo - d) * 0.06);
    };
    switch (name) {
      case 'bait_whiff_punish': band(reach * 1.25, reach * 1.65); break;
      case 'spacing_poke':      band(reach * 0.95, reach * 1.20); break;
      case 'disengage_reset':   if (d < reach * 2.2) this.vx = -dir * 4.5; break;
      // pressure_ground leaves movement entirely to updateAI — it is the control
      // arm, and a plan layer whose baseline is itself a behaviour change cannot
      // tell you whether planning helped or whether that one plan did.
      default: break;
    }
  }

  // Consulted from attack(). A plan may hold a swing; it may never hold one that
  // is free. Returns true to veto.
  _planVetoAttack(t) {
    const P = this._activePlan;
    if (!P || !t || t.health <= 0) return false;
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.tacticPlans === false) return false;
    if (this._targetHelpless(t)) return false;     // free damage is never refused
    const reach = (this.weapon && this.weapon.range) || 90;
    const d = Math.abs(t.cx() - this.cx());
    switch (P.name) {
      // The whole point of the plan: swing into their RECOVERY, not into them.
      // This is the direct answer to the night's dominant finding — 95% of the
      // hits he takes land while he is mid-swing, so a plan that only swings when
      // the opponent is already committed removes the window they punish.
      case 'bait_whiff_punish':
        return !((t.attackEndlag || 0) > 0 || (t.cooldown || 0) > 4 || (t._reloadTimer || 0) > 0);
      // Poke at the tip. Inside 70% of reach he is in THEIR range too, which is
      // where an even trade happens, and even trades are measured as losing.
      case 'spacing_poke':
        return d < reach * 0.70;
      case 'disengage_reset':
        return true;
      default:
        return false;
    }
  }

  // ── SWING DISCIPLINE — mind-level veto layer over Fighter.attack() ────────
  // Sovereign never donates a swing the engine's rules say cannot pay off:
  //   • i-frames: dealDamage() hard-returns while target.invincible > 0, so a
  //     swing whose contact frame lands inside the window hits nothing and
  //     burns cooldown + stamina. Wait it out — unless they are his own hit's
  //     i-frames, which never block his next action (_hitIframesLetThrough).
  //   • fresh parry window: a shield raised ≤8 frames ago parries 65% (≤15: 30%)
  //     — a parry means 90 frames stunned + 1.5× damage taken. Never swing into
  //     it; the guard-break / patience paths handle shields instead.
  //   • stamina exhaustion: swinging below ~15 stamina inflates own endlag up to
  //     +40% — a self-inflicted punish window. Hold unless the target is helpless
  //     (free damage is worth sluggish recovery; an exchange is not).
  // Decision-layer only: no stats, cooldowns, or damage values are touched.
  attack(target) {
    const _t = target || this.target;
    if (_t && this.weapon && this.weapon.type === 'melee' && _t.health > 0) {
      const _helpless = this._targetHelpless(_t);
      // i-frame veto — swing would connect inside invincibility
      if ((_t.invincible || 0) > this._meleeContactFrames() + 2 &&
          !(_t._hitIframeBy === this && typeof frameCount !== 'undefined' &&
            _t.invincible <= (_t._hitIframeUntil || 0) - frameCount + 1)) return;
      // fresh-shield parry veto (parry only exists on HP shields, stacks 1).
      // Note: dealDamage disables parry based on the ATTACKER's stun, not the
      // target's — a stunned-but-shielding target can still parry us, so no
      // target-stun exemption here (_targetHelpless already covers stun > 10).
      if (!_helpless && _t.shielding && (_t.shieldStacks || 1) === 1 &&
          (_t.shieldHoldTimer || 0) <= 15) return;
      // Counter Stance veto (combat weapon): the stance absorbs our hit and
      // teleports the player behind us into a launcher. Never feed it — the
      // stance is a visible 20-frame state; wait it out.
      if ((_t._counterStance || 0) > 0) return;
      // own-stamina discipline — don't buy +40% endlag for a contested exchange
      if (!_helpless && (this.stamina !== undefined) && this.stamina < 15) return;
    }
    // Plan veto last, after every engine-rule veto above: those say a swing
    // CANNOT pay, this one says the running plan would rather spend the moment
    // differently. A mind-level preference must not be able to override a rule.
    if (this._planVetoAttack(_t)) { this._planVetoed = (this._planVetoed || 0) + 1; return; }
    // Punisher bait. Same ordering rule as the plan veto: engine rules first, a
    // preference last. Skipped whenever the target is already committed — which
    // is the entire point, since that is the window the swing is being saved for.
    if (_t && _t.health > 0 && this._punisherRead() && !this._targetHelpless(_t) &&
        !((_t.attackEndlag || 0) > 0 || (_t.cooldown || 0) > 4 || (_t._reloadTimer || 0) > 0)) {
      this._baitHeld = (this._baitHeld || 0) + 1;
      return;
    }
    super.attack(target);
  }

  // ── Stage 3: single reaction "beatability" knob ──────────────────────
  // THE one place defensive difficulty is tuned. Returns the probability that
  // Sovereign FAILS to react to an attack it can see — i.e. the player's reward
  // window for committing. UNBEATABLE TUNING: locked to 0 — Sovereign reacts to
  // every attack it can see, always. Every defensive site shares this gate, so
  // restoring beatability later is a one-line change (raise the return value).
  _reactionMistakeRate() {
    return 0;
  }

  // ══════════════════════════════════════════════════════════════
  // OVERRIDE: update() — tick new systems before physics
  // ══════════════════════════════════════════════════════════════

  update() {
    // Habit engine (js/smb-sov-habits.js): file this frame's posture against
    // this target, and any opener since the last one, into the persistent
    // per-opponent ledger. Covers his real fights and the headless sim, which
    // both drive Fighter.update() -> updateAI() -> here every AI tick.
    if (typeof SovHabits !== 'undefined' && this.target) SovHabits.observe(this, this.target);
    // Recovery-jump budget is per airborne stint, so it refills on contact with
    // the ground and nowhere else.
    if (this.onGround) this._recoverJumps = 0;
    this._checkLimiterBreak(this.target);
    this._updateSuperBank();
    this._updateNullRecoil();
    // Null Anchor removed Sep 7 2026 — see _updateNullAnchor()'s note. The method
    // is kept (unreferenced) so the behaviour can be restored by re-adding this
    // one call, rather than by rewriting it.
    // this._updateNullAnchor();
    this._killFloorGovernor();
    this._habitDossierLine();
    this._vetoVoidStep();
    this._vetoSkyClimb();
    this._vetoExtraJump();
    this._ringoutGuard();
    this._edgePressure();
    super.update();
    this._resolveTactic();
    this._resolveApproach();
    this._airApproachGuard();
    this._observeTargetThreat();
    this._avoidCurses(this.speed || 5);
    this._inferTick();
    this._arsTrack();
    // The experiment itself: swing INTO their swing to produce the sample that
    // separates the hypotheses. After _inferTick so the exchange is booked like
    // any other observation.
    if (this._wantsExperiment(this.target)) {
      this._expUsed = (this._expUsed || 0) + 1;
      this._expLast = (typeof frameCount !== 'undefined') ? frameCount : 0;
      try { this.attack(this.target); } catch (e) {}
    }
    this._airDenyTrack();
    // After _airDenyTrack, which owns vx during an air approach and whose steer a
    // plan must never contest.
    this._planTick();
    // Before _sampleDecision, which owns the same rising edge: a swing the gate
    // converts is a GUARD he chose, and that is what the grid must be told he did.
    // A stated inference rule gets first refusal on the swing; the ledger gate
    // only sees it if the rule let it through.
    if (!this._inferAct(this.target)) this._swingGate();
    this._sampleDecision();
    // Last, and after super.update(): every shield site lives in updateAI() which
    // runs inside it, and _airDenyTrack raises one of its own. Provisioning has to
    // see the frame's final guard state, while still landing before the frame's
    // attack hitboxes resolve.
    this._provisionShield();
    // Own ground tracker: Fighter.update() re-stamps _prevOnGround to the CURRENT
    // frame before returning, so by here it can no longer answer "was he standing
    // last frame" — which is the whole edge _airApproachGuard keys on.
    this._airGuardPrevGround = this.onGround;
  }

  // ── RINGOUT GUARD — the defensive half of the edge game ───────────────────
  // _edgePressure below is offence: stand inside the opponent so his hits point
  // outward. Nothing ever did the same job for HIM, and the measurement is
  // lopsided enough to be the single clearest thing wrong with his positioning:
  // across four replays he spends 7.0 / 8.3 / 10.3% of frames within 60px of the
  // floor's edge against the player's 1.8-3.7%, and in 2026-09-06 he lost two
  // stocks to ringouts at 98/120 and 109/135 HP. Those are not attrition deaths,
  // they are position deaths — he was healthy, got launched from a spot he had no
  // reason to be standing in, and could not act during the flight.
  //
  // isEdgeDanger does NOT cover this. It asks "is there floor under the next step",
  // and on a full-floor stage the answer at x=938 of a 960-wide floor is yes. The
  // thing that kills him is horizontal distance to the floor's END combined with
  // someone else's knockback, which nothing measured.
  //
  // Preventative, not reactive: once he is stunned and airborne it is already over,
  // so this only nudges a grounded, uncommitted fighter back toward the middle.
  // A bias on vx rather than an early return, so it shades movement he is already
  // making instead of costing him a decision frame.
  _floorExtent() {
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return null;
    if (this._floorExtCache && this._floorExtFrame === frameCount) return this._floorExtCache;
    let lo = Infinity, hi = -Infinity;
    for (const pl of currentArena.platforms) {
      if (!pl || !pl.isFloor || pl.isFloorDisabled) continue;
      if (pl.x < lo) lo = pl.x;
      if (pl.x + pl.w > hi) hi = pl.x + pl.w;
    }
    if (!isFinite(lo) || !isFinite(hi) || hi - lo < 200) return null;
    this._floorExtCache = { lo, hi };
    this._floorExtFrame = frameCount;
    return this._floorExtCache;
  }

  _ringoutGuard() {
    if (!SMK2_TUNE || SMK2_TUNE.ringoutGuard === false) return;
    if (!this.onGround || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    if (this.attackTimer > 0 || this._counterLockTimer > 0) return;   // never interrupt a commitment
    const ext = this._floorExtent();
    if (!ext) return;
    const cx = this.cx();
    const marginL = cx - ext.lo, marginR = ext.hi - cx;
    const m = Math.min(marginL, marginR);
    // Scale the danger zone with what the opponent can actually launch him for —
    // a 16-kb hammer threatens from much further in than a 7-kb spear.
    const t  = this.target;
    const kb = (t && t.weapon && t.weapon.kb) ? t.weapon.kb : 10;
    const DANGER = 110 + kb * 5;                       // ~145px vs spear, ~190 vs hammer
    if (m > DANGER) { this._ringoutRisk = 0; return; }
    const inward = marginL < marginR ? 1 : -1;
    let   risk   = 1 - m / DANGER;                     // 0 at the threshold, 1 at the lip

    // THE CORNER IS ALSO WHERE HE CONVERTS. This guard is a blanket "walk to the
    // middle" and it fires on geometry alone, so it pulled him off the one
    // position his kills come from: measured over the 2026-09-06 replays, while
    // the player was inside the same danger band he was moving AWAY from them on
    // 38% / 48% of frames and swinging on 6-15%, and his stock count tracked it
    // exactly — 5 ringouts in the match where he stayed, 0 in the one where he
    // did not. Knockback has a DIRECTION: when the target is on the outward side
    // of him, their hits push him toward centre and the near edge is not a threat
    // at all, it is the wall he is pressing them into. Fade the guard out across
    // that read rather than switching it off, so a target level with him still
    // registers and only a genuinely cornered one frees him to commit.
    const _tgt = this.target;
    if (_tgt && _tgt.health > 0) {
      // >0 when the target is further out toward the near edge than he is.
      const outward = (this.cx() - _tgt.cx()) * inward;
      if (outward > 0) risk *= Math.max(0, 1 - outward / 90);
    }
    this._ringoutRisk = risk;
    if (risk <= 0.01) return;
    // Never push him off the OTHER side, and never override a real hazard escape.
    if (this.isEdgeDanger(inward)) return;
    // Scaled by risk end-to-end (the 0.30 term used to be a floor). Identical at
    // the lip, where it matters; continuous as the corner-press read fades it out.
    this.vx += inward * risk * 1.15;
    const cap = (this.classSpeedMult || 1) * 6.5;
    if (Math.abs(this.vx) > cap) this.vx = Math.sign(this.vx) * cap;
  }

  // ── EDGE GAME ─────────────────────────────────────────────────────────────
  // Measured across three replays: Sovereign scored ONE ringout per match while
  // the player threw 4-7 of their own lives into the death plane unassisted, at
  // 94-112 HP, from ordinary 12-damage hits. The ledge is where the player is
  // demonstrably fragile and he applies no pressure to it at all.
  //
  // The design constraint is as important as the feature. Given a dedicated
  // ringout tool he would start hunting for it, and hunting a low-probability
  // finish means declining ordinary damage — the exact failure the owner called
  // out. So this adds NO new action, NO new attack, and never redirects a swing.
  // It changes ONE thing: which SIDE of the opponent he stands on.
  //
  // Knockback in dealDamage() runs along the attacker-to-target axis, so simply
  // taking the inside position — putting himself between the opponent and the
  // stage centre — makes every hit he was already going to throw point outward.
  // The ringouts come free, as a property of good positioning, and if the read is
  // wrong he has still just walked a few pixels while attacking normally.
  _edgePressure() {
    if (!SMK2_TUNE.edgePressure) return;
    const t = this.target;
    if (!t || t.health <= 0 || !this.onGround) return;
    // Never while committed: a swing in flight, a locked counter, or a super is
    // worth more than position, and interrupting one to reposition is precisely
    // the "leaves out free hits" trade this is designed not to make.
    if (this.attackTimer > 0 || this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if (this._counterLockTimer > 0 || this._preemptMode) return;

    const cx = this.cx(), tx = t.cx();
    const centre = (typeof GAME_W !== 'undefined' ? GAME_W : 900) / 2;
    const outward = tx >= centre ? 1 : -1;            // away from stage centre
    // Is the opponent actually near a ledge on that side? Ask the same helper the
    // AI uses on itself rather than guessing at arena geometry — it already
    // accounts for lava, disabled boss floors and safe landings below.
    let atEdge;
    try { atEdge = !!t.isEdgeDanger(outward); } catch (e) { return; }
    if (!atEdge) { this._edgeInsideFrames = 0; return; }

    // Already inside (between them and the centre)? Nothing to do — his next hit
    // is pointing the right way on its own.
    const inside = (outward > 0) ? (cx < tx) : (cx > tx);
    if (inside) { this._edgeInsideFrames = (this._edgeInsideFrames || 0) + 1; return; }
    this._edgeInsideFrames = 0;

    // Outside: rotate around, but only a nudge, and only when it costs nothing.
    // Bounded to a fraction of his speed so it shades an approach he is already
    // making instead of overriding the movement system.
    if (Math.abs(tx - cx) > 200) return;              // too far for this to be the plan
    const around = -outward;
    if (this.isEdgeDanger(around)) return;            // never walk himself off
    this.vx += around * 0.55;
    const cap = (this.classSpeedMult || 1) * 6.5;
    if (Math.abs(this.vx) > cap) this.vx = Math.sign(this.vx) * cap;
  }

  // ══════════════════════════════════════════════════════════════
  // LOADOUT SELECTION — the adaptation he never had
  // ══════════════════════════════════════════════════════════════
  // Replay-measured, three matches: he out-swings, out-blocks and out-survives
  // the player on every process metric and still loses, because he converts
  // 8.0 damage per swing against the player's 12.6. He was locked to
  // nullblade (damage 15, below the starter sword's 16) with charClass 'none',
  // so he gave up the weapon table's largest effect (eta^2 = 0.358) AND every
  // class perk, for the whole match, with no way to change it.
  //
  // This is a bandit over SMK2_LOADOUTS, not a lookup table: the counter prior
  // only biases his opening picks, and from there he keeps what actually earns
  // damage against THIS player. Ten lives is enough to converge.

  // Damage this life, banked against the loadout that earned it.
  _recordLoadoutResult() {
    if (!this._loadout) return;
    const rec = this._loadoutStats[this._loadout.key] ||
                (this._loadoutStats[this._loadout.key] = { lives: 0, dealt: 0 });
    const gained = Math.max(0, (this.totalDamageDealt || 0) - (this._loadoutDealt0 || 0));
    rec.lives += 1;
    rec.dealt += gained;
  }

  // Epsilon-greedy over measured damage-per-life, seeded with the replay priors
  // as a single pseudo-observation so an untried kit is neither ignored nor
  // blindly trusted. Priors are per-1000-frames; a life measured ~400 frames,
  // hence the 0.4 scale to put both on the same footing.
  _pickLoadout() {
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.openLoadout) {
      try { const lo = this._pickOpenLoadout(); if (lo) return lo; } catch (e) {}
    }
    const pool = SMK2_LOADOUTS.filter(lo =>
      typeof WEAPONS !== 'undefined' && WEAPONS[lo.wk] &&
      lo.wk !== 'gauntlet' && lo.wk !== 'mkgauntlet');
    if (!pool.length) return null;

    // EXPLORATION COUNT MUST COME FROM THE DOSSIER, NOT FROM _loadoutStats.
    // _loadoutStats is built in the constructor and _pickLoadout is called EXACTLY
    // ONCE, from _ensureMatchLoadout, on the first frame he has a target — before
    // any life has been banked. So `tried` was structurally always 0 and eps was
    // always the 0.30 branch: 30% of all matches opened on a uniformly random kit,
    // and because the pick is locked for the match (see _ensureMatchLoadout) he
    // could never correct it. Measured in 2026-09-06 replay (3): opened on hammer
    // (reach 80, cooldown 75) against a spear (reach 130, cooldown 44) and lost
    // 10-2 without ever re-picking, while the counter-informed score would have
    // handed him katana by a factor of ~2. The dossier is the only loadout memory
    // that survives a match, so it is the only thing that can honestly say how
    // much he has already explored.
    const _dk0 = (typeof SovDossier !== 'undefined') ? this._dossierKeys() : [];
    const tried = _dk0.length
      ? pool.reduce((n, lo) => n + (SovDossier.loadoutPrior(_dk0, lo.key) ? 1 : 0), 0)
      : 0;
    const eps = tried < 3 ? 0.30 : 0.10;
    const explore = Math.random() < eps;

    // Put the priors on the same scale as what he is actually measuring. They are
    // damage per 1000 frames; a life is some unknown fraction of that, and a fixed
    // guess gets it wrong in a way that matters: measured at 0.4, an untried kit
    // seeds at ~98 while a tried one reads ~250, so the first kit that does well
    // is never challenged and he stops counter-picking. Rescaling by the observed
    // mean keeps the priors' RELATIVE ordering — which is the part worth knowing —
    // without pretending to know the absolute magnitude.
    let obsD = 0, obsL = 0;
    for (const lo of pool) {
      const r = this._loadoutStats[lo.key];
      if (r && r.lives) { obsD += r.dealt; obsL += r.lives; }
    }
    const priorMean = pool.reduce((a, lo) => a + lo.prior, 0) / pool.length;
    const scale = (obsL > 0 && priorMean > 0) ? (obsD / obsL) / priorMean : 0.4;

    // Per-opponent history folded in as additional pseudo-observations. The
    // in-match stats above only exist from life 2 onward and are wiped every
    // match; the dossier is what lets him open a REMATCH already holding the kit
    // that beat this person last time instead of rediscovering it over ten lives.
    const _dkeys = _dk0;

    // Scored first, chosen second — the exploration draw needs the scores too.
    const scored = [];
    for (const lo of pool) {
      const rec  = this._loadoutStats[lo.key] || { lives: 0, dealt: 0 };
      const seed = lo.prior * scale;
      let num = seed + rec.dealt, den = 1 + rec.lives;
      if (_dkeys.length) {
        const dp = SovDossier.loadoutPrior(_dkeys, lo.key);
        if (dp) { num += dp.mean * dp.weight; den += dp.weight; }
      }
      scored.push({ lo, score: (num / den) * _smk2CounterBonus(lo, this.target) });
    }
    scored.sort((a, b) => b.score - a.score);

    // EXPLORATION DRAWS FROM THE TOP OF THE LIST, NOT FROM THE WHOLE POOL.
    // The first pass at this filtered the explore pool on _smk2CounterBonus >= 1
    // and that filter is inert where it is needed most: the counter prior is
    // deliberately capped at +-18%, and against a 130-reach spear NOTHING in the
    // pool clears 1.0 (best is katana at 0.87), so every kit stayed eligible and
    // the coin flip was unchanged. The score is the only quantity with enough
    // dynamic range to separate them — vs spear it spreads 85 (katana) to 44
    // (hammer). So he still explores, but among kits that can actually win:
    // trying katana instead of sword is exploration, opening on the worst kit in
    // the pool and being locked into it for ten lives is not.
    if (explore && scored.length > 1) {
      const k = Math.min(3, scored.length);
      return scored[Math.floor(Math.random() * k)].lo;
    }
    return scored.length ? scored[0].lo : null;
  }

  // Equip a loadout. applyClass overwrites maxHealth/health/classSpeedMult; his
  // speed is restored afterwards, and his HP is his base scaled by the class's.
  _applyLoadout(lo) {
    if (!lo || typeof WEAPONS === 'undefined' || !WEAPONS[lo.wk]) return;
    // Possession runs this whole class ON THE PLAYER'S OWN FIGHTER, so an
    // unguarded kit change here rewrote the human's weapon and class out from
    // under them. SovereignControl's contract is that the host keeps its own
    // body, weapon and class — the brain is the only thing borrowed.
    if (typeof SovereignControl !== 'undefined' && SovereignControl.active
        && SovereignControl._host === this) return;
    this._loadout   = lo;
    this.weapon     = WEAPONS[lo.wk];
    this.weaponKey  = lo.wk;
    this._ammo      = 0;
    if (lo.cls && typeof applyClass === 'function') {
      // Snapshot LIVE, not from the constructor: startGame applies difficulty
      // boosts after construction (measured 150 -> 165 maxHealth), so a
      // constructor-time snapshot would silently nerf him ~9% on every respawn.
      // Re-equipping (signature kit, then the counter-pick) must scale from his
      // base, not from the previous class's HP; a maxHealth someone else changed
      // since the last equip becomes the new base.
      const _hp  = (this._loadoutHpBase && this.maxHealth === this._loadoutHpSet)
        ? this._loadoutHpBase : this.maxHealth;
      const _spd = this.classSpeedMult || 1;
      applyClass(this, lo.cls);
      if (lo.open && typeof CLASSES !== 'undefined' && CLASSES[lo.cls]) {
        // Open mode: the class's REAL trade-offs, scaled onto his stat line.
        // Restoring his own stats (below) would make every class identical
        // except for its perk, and he could never discover that a class is
        // tanky or fragile — only that its perk helps.
        const C = CLASSES[lo.cls];
        this.maxHealth      = Math.round(_hp * (C.hp || 150) / 150);
        this.health         = this.maxHealth;
        this.classSpeedMult = _spd * (C.speedMult || 1);
      } else {
        // HP follows the class, as it does for the player. Keeping his own 150
        // made his Ronin 150 HP against a player Ronin's 132.
        const C = (typeof CLASSES !== 'undefined' && CLASSES[lo.cls]) || null;
        this.maxHealth      = C && C.hp ? Math.round(_hp * C.hp / 150) : _hp;
        this.health         = this.maxHealth;
        this.classSpeedMult = _spd;
      }
      this._loadoutHpBase = _hp;
      this._loadoutHpSet  = this.maxHealth;
    }
    // Signature kit routes to his own authored finisher, which is keyed in
    // CLASS_FINISHERS under 'nullblade' and was unreachable while he had no
    // charClass. Mirrors the _domainKey escape hatch.
    this._finisherKey = lo.fin || null;
    this._loadoutDealt0 = this.totalDamageDealt || 0;    if (lo.open) this._arsStart();
  }

  // ══ OPEN ARSENAL — finding out what is strong instead of being told ══════
  //
  // SMK2_LOADOUTS is seven kits WE chose, seeded with priors WE measured, nudged
  // by a counter bonus WE wrote. Whatever he "learned" from it was bounded by our
  // opinion of the roster. Here the pool is every weapon a player can select and
  // every class, the priors are flat, and the only evidence is his own:
  // net damage per 1000 frames for each life he fought, filed under what he held
  // and what the opponent held (SovDossier.recordArsenal).
  //
  // The choice is Thompson sampling — draw a plausible value for each option
  // from its posterior and take the best draw. It is the curiosity principle
  // again: an option he has barely tried has a WIDE posterior, so it sometimes
  // draws high and gets tried; an option he has tried fifty times draws close
  // to what it is actually worth. Nothing is excluded, including kits we
  // believe are useless to him, because that belief is exactly what he is
  // supposed to test.
  //
  // Weapon and class are chosen independently (additive model): 20 x 13 combos
  // would take thousands of matches to cover, two bandits of 20 and 13 do not.
  // Combos are still recorded, for the record, not for the choice.
  _pickOpenLoadout() {
    if (typeof WEAPON_KEYS === 'undefined' || typeof CLASSES === 'undefined') return null;
    if (typeof SovDossier === 'undefined' || typeof SovDossier.arsenalPrior !== 'function') return null;
    const t = this.target;
    // Melee only: every boss fight bars ranged weapons (_startGameCore), and his
    // brain is melee-shaped — ranged kits scored ~0 dealt in the lab.
    const W = WEAPON_KEYS.filter(k => WEAPONS[k] && WEAPONS[k].type !== 'ranged');
    const C = Object.keys(CLASSES).filter(k => k !== 'megaknight');   // admin-only, barred from boss fights
    const A = this._innateArsenal(SovDossier.arsenalPrior() || {});
    const opp = (t && t.weaponKey) ? A['ow:' + t.weaponKey] : null;
    const any = A.any || null;
    const gauss = () => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const choose = (field, opts) => {
      // Pooled spread of per-life outcomes: the unit his uncertainty is in.
      let n = 0, r = 0, r2 = 0;
      const tbl = any ? any[field] : {};
      for (const k of Object.keys(tbl)) { n += tbl[k].n; r += tbl[k].r; r2 += tbl[k].r2; }
      const grand = n ? r / n : 0;
      const sd = n > 3 ? Math.max(5, Math.sqrt(Math.max(0, r2 / n - grand * grand))) : 40;
      const K = 3;   // global evidence counts as at most K lives about THIS opponent
      let best = null, bestDraw = -Infinity;
      for (const o of opts) {
        const cA = any && any[field][o], cO = opp && opp[field][o];
        const mA = cA && cA.n ? cA.r / cA.n : null;
        let mean, neff;
        if (cO && cO.n) {
          const mO = cO.r / cO.n;
          const k = (mA === null) ? 0 : Math.min(K, cA.n);
          mean = (cO.n * mO + k * mA) / (cO.n + k); neff = cO.n + k;
        } else if (mA !== null) { mean = mA; neff = Math.min(K, cA.n); }
        else { mean = grand; neff = 0.25; }
        const draw = mean + (sd / Math.sqrt(neff)) * gauss();
        if (draw > bestDraw) { bestDraw = draw; best = o; }
      }
      return best;
    };
    const wk = choose('weapon', W);
    const cls = choose('cls', C);
    if (!wk) return null;
    return { key: wk + '|' + cls, wk, cls: cls === 'none' ? null : cls, clsKey: cls,
             fin: wk === 'nullblade' ? 'nullblade' : null, open: true };
  }

  // Local arsenal record plus SOV_ARSENAL (js/smb-sov-arsenal.js), the lab's
  // conclusions. Summed into a copy every pick and never written back, so the
  // innate layer stays at its built weight while his own results grow past it.
  _innateArsenal(local) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.innateArsenal === false || typeof SOV_ARSENAL === 'undefined' || !SOV_ARSENAL || !SOV_ARSENAL.arsenal) return local;
    const out = {};
    for (const src of [SOV_ARSENAL.arsenal, local]) {
      for (const bk of Object.keys(src)) {
        const dst = out[bk] || (out[bk] = { weapon: {}, cls: {} });
        for (const field of ['weapon', 'cls']) {
          const from = src[bk][field] || {};
          for (const k of Object.keys(from)) {
            const c = from[k], e = dst[field][k] || (dst[field][k] = { n: 0, r: 0, r2: 0 });
            e.n += c.n || 0; e.r += c.r || 0; e.r2 += c.r2 || 0;
          }
        }
      }
    }
    return out;
  }

  // One sample per life. Damage taken is tracked here rather than read from a
  // counter because Fighter has none; only decreases count, so a respawn refill
  // never reads as healing.
  _arsStart() {
    const t = this.target;
    this._arsSeg = { f0: (typeof frameCount !== 'undefined') ? frameCount : 0,
                     dealt0: this.totalDamageDealt || 0, taken: 0,
                     ow: t && t.weaponKey || null, oc: (t && t.charClass) || 'none' };
    this._arsPrevHp = this.health;
  }

  _arsTrack() {
    if (!this._arsSeg) return;
    if (this.health < this._arsPrevHp) this._arsSeg.taken += this._arsPrevHp - this.health;
    this._arsPrevHp = this.health;
  }

  // Close the current life's sample. 'death' starts the next life's sample on
  // the same kit (the kit is locked per match); 'end' closes it for good. Both
  // are needed: a match he wins never ends in his death, and dropping those
  // lives would bias every estimate against the kits that win.
  _arsenalCommit(reason) {
    const S = this._arsSeg;
    const lo = this._loadout;
    if (!S || !lo || !lo.open) return;
    this._arsTrack();
    const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const frames = fc - S.f0;
    if (frames >= 120 && typeof SovDossier !== 'undefined' && SovDossier.recordArsenal) {
      const dealt = Math.max(0, (this.totalDamageDealt || 0) - S.dealt0);
      const net = dealt - S.taken;
      SovDossier.recordArsenal({ w: lo.wk, c: lo.clsKey || 'none', ow: S.ow, oc: S.oc,
                                 dealt, taken: S.taken, net, frames, rate: net / frames * 1000 });
    }
    if (reason === 'end') { this._arsSeg = null; return; }
    this._arsStart();
  }

  // The kit is chosen ONCE PER MATCH, not once per life. Re-picking on every
  // respawn meant his weapon and class changed at every death — visible as a
  // reroll mid-fight — and under possession it rerolled the PLAYER's kit ten
  // times a match. Cross-match learning is untouched: _recordLoadoutResult below
  // still banks the life's damage, and _ensureMatchLoadout counter-picks at the
  // start of the next match off exactly those stats plus the dossier.
  respawn() {
    this._recordLoadoutResult();
    // The bank is per-life, so the next life must start from the current total
    // or one life's damage would be counted again on every subsequent death.
    this._loadoutDealt0 = this.totalDamageDealt || 0;
    super.respawn();
    // The dossier prior is keyed on the OPPONENT, and super.respawn() may have
    // disturbed the memory baseline, so the recall is re-applied each life.
    try { this._seedFromDossier(this.target); } catch (e) {}
  }

  // Pick the match's kit the first frame he actually has an opponent to counter.
  // It cannot happen at construction: _pickLoadout scores against this.target
  // (_smk2CounterBonus, _dossierKeys) and no target exists yet when startGame
  // builds him — that is why the pick used to live on respawn, one death late.
  _ensureMatchLoadout() {
    if (this._loadoutLocked) return;
    // Possession: the human picked their own kit — never spend a pick on them.
    if (typeof SovereignControl !== 'undefined' && SovereignControl.active
        && SovereignControl._host === this) { this._loadoutLocked = true; return; }
    if (!this.target || this.target.health <= 0) return;
    this._loadoutLocked = true;
    const lo = this._pickLoadout();
    if (lo) this._applyLoadout(lo);
    try { this._seedFromDossier(this.target); } catch (e) {}
  }

  // ── SKY CEILING ──────────────────────────────────────────────────────────
  // RECOVER_CEIL bounds the void-recovery boosts, but nothing bounded an ORDINARY
  // jump. Against the Creator that gap is reachable: the boss spends the fight
  // airborne and high, force mode jumps for any target more than 130px overhead
  // (see the `t.y < this.y - 130 && !t.onGround` branch), and the arena's top deck
  // already sits at y = 82 — so a -19 jump from up there, plus the double jump,
  // measured him at y = -396 on a 520px-tall stage. Roughly two body-heights of
  // empty space above the screen, with the camera dragged along after him.
  //
  // A soft ceiling, not a clamp on position: he keeps every jump he decides to
  // make, he just stops CLIMBING once his head reaches the top of the play area
  // and gravity takes him back. The ceiling is measured from the highest deck so
  // that every platform stays reachable — he still needs to get above y = 82 to
  // land on that deck. Stun and ragdoll are exempt: being launched off the top of
  // the screen is a hit the opponent earned, and this is only about his own
  // decisions.
  // ── JUMP ECONOMY VETO ────────────────────────────────────────────────────
  // He is meant to read as a very strong PLAYER, and a player gets exactly one
  // ground jump and one air jump. Roughly thirty paths in this class write
  // `this.vy = -N` directly and only about half of them check `onGround` or
  // spend `canDoubleJump`; the unguarded ones let him gain height indefinitely,
  // which is the triple-jump and the "he beat gravity" reports. Auditing every
  // site has the same problem _vetoVoidStep describes: a large blast radius, and
  // any movement path added later reintroduces the bug.
  //
  // So this is the same single choke point, applied to the jump budget. It does
  // not fight the AI's intent — if he has an air jump available, an unguarded
  // launch simply SPENDS it and stands. Only a launch he cannot pay for is
  // cancelled. That is precisely the player's rule, applied uniformly.
  //
  // Deliberately narrow: knockback must still throw him (stun and ragdoll are
  // exempt), and anything faster than his hardest authored jump is a launcher,
  // super or dash rather than a jump, so it passes untouched.
  _vetoExtraJump() {
    const prev = this._jumpVyPrev;
    this._jumpVyPrev = this.vy;
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.jumpEconomy === false) return;
    if (prev === undefined || this.health <= 0) return;
    if (this.onGround || this._prevOnGround) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    // Upward acceleration this frame, beyond what gravity could ever produce.
    const gained = prev - this.vy;
    if (gained < 6) return;
    const HARDEST_JUMP = 21;          // his strongest authored jump is -20
    if (this.vy < -HARDEST_JUMP) return;   // launcher/super/dash, not a jump
    if (this.canDoubleJump) {
      this.canDoubleJump = false;     // legitimate air jump — make him pay for it
      this._jumpVyPrev   = this.vy;
      return;
    }
    this.vy = prev;                   // unpaid: he does not get this one
    this._jumpVyPrev = prev;
  }

  _vetoSkyClimb() {
    if (this.health <= 0 || this.vy >= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return;
    let topY = Infinity;
    for (const pl of currentArena.platforms) {
      if (!pl || pl.isFloorDisabled) continue;
      if (pl.y < topY) topY = pl.y;
    }
    if (!isFinite(topY)) return;
    // One jump's worth of headroom over the highest deck, but never further than
    // a body-height above the screen edge.
    const SKY_CEIL = Math.max(-40, topY - 165);
    if (this.y <= SKY_CEIL) this.vy = Math.max(this.vy, -1.5);
  }

  // ── TACTIC GRID — situation x action, scored by consequence ──────────────
  // The ledger this replaces scored ONE decision globally. That was enough to
  // prove the idea (it took the platform trap from 32.0 to 21.3 hp/1000f and his
  // deaths from 5 to 0 across three runs) and not enough to be intelligence: a
  // single number per decision says "jumping at them is bad", never "jumping at
  // them is bad WHEN THEY ARE ABOVE ME AND CLOSE, and fine from range".
  //
  // The bottleneck was never data. SovDossier already remembers opponents across
  // page reloads and generalises them by archetype; smb-behavior-model.js
  // fingerprints how they play; smb-sov-advisor.js reasons over 15s of history.
  // All of it drained into _getCounterStrategy, which can return exactly five
  // words. He observed in detail and could then say one of five things.
  //
  // A grid is what lets him compose an answer instead of picking one. 9 situations
  // x 6 actions is 54 cells — coarse on purpose, because a five-minute match
  // produces maybe 200 bookings and a finer grid would never fill. Cells that do
  // fill are persisted per-opponent, so the grid arrives pre-warmed next time.
  _situationKey(t) {
    const tgt = t || this.target;
    if (!tgt) return null;
    const d  = Math.abs(tgt.cx() - this.cx());
    const dy = tgt.cy() - this.cy();
    const D = d < 90 ? 'c' : d < 220 ? 'm' : 'f';           // close / mid / far
    const H = dy < -40 ? 'a' : dy > 40 ? 'b' : 'l';          // above / below / level
    return D + H;
  }

  // Book a decision, resolve it by what it cost. Opened with _markTactic at the
  // moment he commits, closed 30 frames later with the health delta on both
  // sides. One booking open at a time: overlapping windows would credit the same
  // damage to two decisions, and a cell's number only means something if exactly
  // one decision is answerable for it. The cost is that a frequent action is
  // under-sampled relative to a rare one — acceptable, and visible in `tries`.
  _markTactic(action, t, prio) {
    if (this.health <= 0) return;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const P = prio || 0;
    // Priority preemption. Movement edges fire far more often than swings, so a
    // single first-come slot let walking monopolise it: measured in a live fight
    // the grid filled with retreat/approach_ground and the attack and shield cells
    // stayed empty — which starves _swingGate, the one gate that needs both.
    // A committing swing may therefore evict a movement booking still in its first
    // few frames. The evicted booking is discarded, not counted: a partial window
    // is worse than no data.
    if (this._pendingTactic) {
      const open = this._pendingTactic;
      if (!(P > (open.prio || 0) && _fc - open.frame <= 10)) return;
    }
    // Movement is also rate-limited on its own account, so a fighter who paces
    // cannot bury the informative cells under a hundred identical bookings.
    if (P === 0 && _fc - (this._lastMoveBook || -999) < 45) return;
    const tgt = t || this.target;
    const sit = this._situationKey(tgt);
    if (!sit) return;
    if (P === 0) this._lastMoveBook = _fc;
    this._pendingTactic = {
      sit, action, prio: P, frame: _fc, tgt: tgt || null,
      hp: this.health, lives: this.lives,
      tHp: tgt ? tgt.health : 0, tLives: tgt ? tgt.lives : 0,
      // Lockout he INHERITED, so the resolve can tell what he CREATED.
      tLock: tgt ? Math.max(tgt.stunTimer || 0, tgt._parryVulnFrames || 0) : 0,
    };
  }

  _resolveTactic() {
    const P = this._pendingTactic;
    if (!P) return;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    if (_fc - P.frame < 30) return;
    this._pendingTactic = null;
    const t = this.target;
    // A death inside the window is the maximum price a decision can carry, and
    // health is already back at full by the time this reads it — so price it from
    // the snapshot plus a surcharge rather than from the (meaningless) delta.
    const died  = this.lives !== P.lives;
    const taken = died ? P.hp + 40 : Math.max(0, P.hp - this.health);
    // Same problem mirrored: if THEY died or respawned, the delta is garbage.
    // KILL CREDIT — the mirror of the death surcharge above.
    // Scoring a kill as 0 made every ledger structurally unable to value the
    // action that CLOSES a stock: his own death cost hp+40, his own kill paid
    // nothing. The comment explaining this guard is about respawn making the
    // health delta garbage, which is true and is not a reason to round the
    // reward to zero rather than to the mirror of the penalty.
    // TARGET IDENTITY. The snapshot is meaningless unless it is compared against
    // the SAME fighter it was taken from. Resolving against this.target instead
    // let a mid-window retarget price bot A's decision with bot B's health — and
    // because every bot spawns with identical `lives`, the "they died" guard below
    // also passed spuriously, so a kill was never even detected as one.
    const _bt = P.tgt;
    const dealt = !_bt ? 0
                : (_bt.lives === P.tLives) ? Math.max(0, P.tHp - _bt.health)
                : (_KC() ? (this._killCredits = (this._killCredits || 0) + 1, P.tHp + 40) : 0);
    // ── LOCKOUT HE CREATED IS VALUE, EVEN AT ZERO DAMAGE ──────────────────
    // The window closes at 30 frames; a parry stuns for 90. So when he shields
    // PERFECTLY the ledger reads taken=0 (the parry prevented the hit) and
    // dealt=0 (he is holding a guard, not swinging) and books `shield` at net
    // ZERO — while the punish that walks through the opening he just made
    // collects the entire reward 30-120 frames later under `attack`.
    //
    // That is why he never adapted into blocking however long he fought: the
    // reward for his single best defensive conversion was being credited to a
    // different action every time it worked. A parry is worth 0 damage and 90
    // frames of a helpless, 1.5x-vulnerable opponent, and only one of those two
    // was reaching the ledger.
    //
    // Priced off the lockout he ADDED during the window, not the lockout he
    // found, so following up on someone else's stun is not double-counted.
    let created = 0;
    if (_bt && _bt.lives === P.tLives) {
      const lockNow = Math.max(_bt.stunTimer || 0, _bt._parryVulnFrames || 0);
      if (lockNow > (P.tLock || 0) + 20) created = (lockNow - (P.tLock || 0)) * 0.22;
    }
    const row = this._tacticGrid[P.sit] || (this._tacticGrid[P.sit] = {});
    const e   = row[P.action] || (row[P.action] = { tries: 0, taken: 0, dealt: 0 });
    e.tries++; e.taken += taken; e.dealt += dealt + created;
    // Rolling window. Without decay a cell averages the whole match and an answer
    // that stopped working in the first minute can never come back.
    if (e.tries > 10) { e.tries *= 0.75; e.taken *= 0.75; e.dealt *= 0.75; }
  }

  // Net health per attempt. Negative means the decision loses him the exchange.
  //
  // Cell first, MARGINAL second. The first build of this returned null whenever a
  // cell was thin, and measured against the single-key ledger it replaced that was
  // a straight regression: 7 deaths against 0, damage taken 78.3 against 56.4,
  // exchange 1.63 against 3.23. The cause was dilution, not the idea. Splitting
  // one well-populated statistic across nine cells — while five other action types
  // compete for the same booking slot — meant approach_air reached the 3-try
  // threshold in almost no cell, the guard fired 1-9 times a match instead of
  // 5-17, and _swingGate never fired once in six runs.
  //
  // So a thin cell falls back to the action's average across every situation,
  // which is exactly the single-key number that worked. He starts with the general
  // answer and specialises only where he has earned the right to, instead of
  // having no opinion until every cell is full.
  _tacticValue(sit, action) {
    const e = this._tacticGrid[sit] && this._tacticGrid[sit][action];
    if (e && e.tries >= 3) return (e.dealt - e.taken) / e.tries;
    let tries = 0, taken = 0, dealt = 0;
    for (const s2 of Object.keys(this._tacticGrid)) {
      const c = this._tacticGrid[s2][action];
      if (c) { tries += c.tries; taken += c.taken; dealt += c.dealt; }
    }
    if (tries < 4) return null;
    return (dealt - taken) / tries;
  }

  // The argmax that makes this a composed counter rather than a chosen one: his
  // best-scoring action in THIS situation, which can differ in every cell.
  _bestAction(sit) {
    const acts = new Set();
    for (const s2 of Object.keys(this._tacticGrid)) {
      for (const a of Object.keys(this._tacticGrid[s2])) acts.add(a);
    }
    if (!acts.size) return null;
    let best = null, bestVal = -Infinity;
    for (const a of acts) {
      const v = this._tacticValue(sit, a);
      if (v === null) continue;
      if (v > bestVal) { bestVal = v; best = a; }
    }
    return best === null ? null : { action: best, value: bestVal };
  }

  // ── AIR APPROACH CHANNEL — its own slot, deliberately ────────────────────
  // This statistic drives the only gate with a measured win, so it does not share
  // the grid's single booking slot. It used to, and that is what broke it: with
  // movement, swings, guards and supers all competing for one slot, the approach
  // was booked perhaps a quarter as often, the guard fired 0-2 times a match
  // instead of 5-17, and two successive grid builds measured WORSE than the plain
  // ledger they replaced (7 deaths each against 0, exchange 1.63 and 1.04 against
  // 3.23). Sampling pressure was the whole difference. A signal that drives a
  // decision gets its own channel.
  _markApproach(t) {
    if (this._pendingApproach || this.health <= 0 || !t) return;
    this._pendingApproach = {
      frame: (typeof frameCount !== 'undefined') ? frameCount : 0, tgt: t,
      hp: this.health, lives: this.lives, tHp: t.health, tLives: t.lives,
    };
  }

  _resolveApproach() {
    const P = this._pendingApproach;
    if (!P) return;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    if (_fc - P.frame < 45) return;
    this._pendingApproach = null;
    const t = this.target;
    const died  = this.lives !== P.lives;
    const taken = died ? P.hp + 40 : Math.max(0, P.hp - this.health);
    // KILL CREDIT — the mirror of the death surcharge above.
    // Scoring a kill as 0 made every ledger structurally unable to value the
    // action that CLOSES a stock: his own death cost hp+40, his own kill paid
    // nothing. The comment explaining this guard is about respawn making the
    // health delta garbage, which is true and is not a reason to round the
    // reward to zero rather than to the mirror of the penalty.
    // TARGET IDENTITY. The snapshot is meaningless unless it is compared against
    // the SAME fighter it was taken from. Resolving against this.target instead
    // let a mid-window retarget price bot A's decision with bot B's health — and
    // because every bot spawns with identical `lives`, the "they died" guard below
    // also passed spuriously, so a kill was never even detected as one.
    const _bt = P.tgt;
    const dealt = !_bt ? 0
                : (_bt.lives === P.tLives) ? Math.max(0, P.tHp - _bt.health)
                : (_KC() ? (this._killCredits = (this._killCredits || 0) + 1, P.tHp + 40) : 0);
    const e = this._approachStat;
    e.tries++; e.taken += taken; e.dealt += dealt;
    if (e.tries > 12) { e.tries *= 0.75; e.taken *= 0.75; e.dealt *= 0.75; }
  }

  _approachValue() {
    const e = this._approachStat;
    if (!e || e.tries < 4) return null;
    return (e.dealt - e.taken) / e.tries;
  }

  // ── DECISION SAMPLER ─────────────────────────────────────────────────────
  // Books what he actually did, by watching state rather than by editing the ~40
  // paths that decide it — the choke-point rule this class already lives by (see
  // _vetoExtraJump, _vetoVoidStep). Rising edges only: a decision is the frame he
  // commits to it, not every frame he is still doing it.
  _sampleDecision() {
    const t = this.target;
    if (!t || t.health <= 0 || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    const wasGrounded = this._airGuardPrevGround;

    // Swing committed this frame.
    if ((this.attackTimer || 0) > (this._prevAtkSample || 0) && !this._prevAtkSample) {
      this._markTactic('attack', t, 1);
    }
    this._prevAtkSample = this.attackTimer || 0;

    // Guard raised this frame. (_provisionShield owns the same edge for stacks.)
    if (this.shielding && !this._prevShieldSample) this._markTactic('shield', t, 1);
    this._prevShieldSample = !!this.shielding;

    // Super spent this frame.
    const sm = this.superMeter || 0;
    if (this._prevSuperSample - sm > 25) this._markTactic('super', t, 2);
    this._prevSuperSample = sm;

    // Grounded movement, committed — toward or away.
    if (this.onGround && wasGrounded && Math.abs(this.vx) > 1.5) {
      const toward = Math.sign(t.cx() - this.cx()) === Math.sign(this.vx);
      const key = toward ? 'approach_ground' : 'retreat';
      if (this._prevMoveSample !== key) this._markTactic(key, t, 0);
      this._prevMoveSample = key;
    } else if (this.onGround) {
      this._prevMoveSample = null;
    }
  }

  // ── AIR APPROACH GUARD — the veto the grid feeds ─────────────────────────
  // Roughly thirty paths in this class jump at a target that is above them, each
  // deciding alone, none of them aware of what the last one cost. Auditing all
  // thirty has the blast radius _vetoVoidStep describes, and any path added later
  // reintroduces it — so this is the same single choke point: watch the launch,
  // not the launcher.
  //
  // One in five attempts is let through regardless. A veto keyed on a grid its own
  // veto stops updating is a one-way door: he could never find out the approach
  // had become good again.
  _airApproachGuard() {
    if (this._airDenyTimer > 0) this._airDenyTimer--;
    const t = this.target;
    const wasGrounded = this._airGuardPrevGround;
    if (!t || t.health <= 0 || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;

    // A fresh ground launch, this frame, at a target holding higher ground.
    const launching = wasGrounded && !this.onGround && this.vy < -8;
    if (!launching) return;
    const dx = Math.abs(t.cx() - this.cx());
    const occupiedHighGround = t.onGround && t.y < this.y - 40 && dx < 220;
    if (!occupiedHighGround) return;

    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.tacticLedger === false) return;
    const val = this._approachValue();
    const denyAt  = (typeof TUNE.airDenyAt === 'number') ? TUNE.airDenyAt : -4;
    const explore = (typeof TUNE.tacticExplore === 'number') ? TUNE.tacticExplore : 0.2;
    if (val !== null && val < denyAt && Math.random() > explore) {
      // What costs him is not the approach, it is ARRIVING NEUTRAL INSIDE THEIR
      // SWING — of the 127 hits he took in replay 2026-09-10, 126 landed either
      // airborne or within 0.6 s of touching down. So the response changes how he
      // arrives before it changes whether he goes:
      //
      //   1. Land on the lip of their platform instead of on top of them.
      //   2. Go anyway, but arrive behind a guard. A fresh guard is also a 65%
      //      parry for its first 8 frames, so their landing punish becomes a
      //      90-frame stun on THEM. Only possible now that _provisionShield gives
      //      his guard real HP.
      //   3. Only with no guard left to raise does he concede the platform and
      //      hold the ground beneath them.
      //
      // Cancelling first would have been the obvious build and it is the wrong
      // one: measured against a platform camper it cut the approach's cost by 63%
      // and he died MORE, because a boss that answers a camper with passivity
      // loses on the clock. Saving health is not the objective.
      this._airDenyX = this._approachLip(t);
      if (this._airDenyX === null) {
        if ((this.shieldStacks || 0) < 4) {
          this._armorApproach = true;
        } else {
          // Damp vx with the cancel: a cancelled launch that keeps its horizontal
          // carry can walk him off the lip he was standing on, which trades a
          // landing punish for a self-ringout.
          this.vy = 0; this.vx *= 0.3; this._jumpVyPrev = 0;
        }
      }
      this._airDenyTimer = 90;
      // Still booked. An armoured or redirected approach is a different decision
      // with a different price, and the grid only stays honest if it keeps reading
      // the consequence of what he actually did.
      if (this._airDenyX !== null || this._armorApproach) { this._markApproach(t); this._markTactic('approach_air', t, 1); }
      return;
    }
    this._airDenyX = null;
    this._armorApproach = false;
    this._markApproach(t);
    this._markTactic('approach_air', t, 1);
  }

  // ── SWING GATE — the second composed counter ─────────────────────────────
  // The air guard changes how he MOVES. This changes how he FIGHTS, off the same
  // grid: if swinging in this exact situation has been losing him health and
  // guarding in it has been winning it, the swing becomes a guard.
  //
  // That sentence is the thing five preset strategy words could never say. It is
  // situation-local, it is learned rather than authored, and against a player who
  // baits swings at close range it is the correct read — which is why the gate is
  // deliberately narrow: it needs BOTH halves of the evidence, not just a bad
  // swing, or he would simply stop attacking and lose on the clock.
  _swingGate() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.tacticLedger === false) return;
    if (TUNE.swingGate === false && TUNE.swingHold === false) return;
    const t = this.target;
    if (!t || t.health <= 0 || this.health <= 0) return;
    if ((this.attackTimer || 0) <= 0 || this._prevAtkSample > 0) return;  // swing's first frame only
    const sit = this._situationKey(t);
    const swing = this._tacticValue(sit, 'attack');
    const guard = this._tacticValue(sit, 'shield');
    if (swing === null) return;
    const explore = (typeof TUNE.tacticExplore === 'number') ? TUNE.tacticExplore : 0.2;
    // Convert to a guard when guarding here scores clearly better (swingGate).
    // Otherwise, a swing that clearly loses here is simply dropped (swingHold):
    // vs the player, swinging at mid range while they stood above him ran -16
    // per try, and with swingGate off nothing ever stopped it.
    const holdAt  = (typeof TUNE.swingHoldAt === 'number') ? TUNE.swingHoldAt : -8;
    const convert = TUNE.swingGate !== false && guard !== null && (this.shieldStacks || 0) < 4 &&
                    swing < -3 && guard > swing + 6;
    const hold    = !convert && TUNE.swingHold !== false && swing < holdAt;
    if (!(convert || hold) || Math.random() <= explore) return;
    this.attackTimer = 0;
    this.cooldown    = Math.max(this.cooldown || 0, 10);
    // Cancelled, not failed: the inference engine must not book it as a miss.
    if (this._infOpen && this._infOpen.f === ((typeof frameCount !== 'undefined') ? frameCount : 0)) this._infOpen = null;
    if (hold) { this._swingHeld = (this._swingHeld || 0) + 1; return; }
    this.shielding   = true;
    this._armorHold  = Math.max(this._armorHold || 0, 12);
    this._swingGated = (this._swingGated || 0) + 1;
  }

  // The landing spot on their platform that is NOT inside their swing: the lip on
  // his own approach side. Returns null when they are already standing on that lip
  // and there is no room to land clear — the one case where cancelling is right.
  _approachLip(t) {
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return null;
    const plat = currentArena.platforms.find(p =>
      p && !p.isFloor && !p.isFloorDisabled &&
      t.cx() > p.x - 20 && t.cx() < p.x + p.w + 20 && Math.abs((t.y + t.h) - p.y) < 18);
    if (!plat) return null;
    const lip = (t.cx() > this.cx()) ? plat.x + 22 : plat.x + plat.w - 22;
    return Math.abs(lip - t.cx()) > 120 ? lip : null;
  }

  // Steering only — nudges vx, never seizes the fighter, so every other system
  // still runs underneath. Airborne he flies to the lip; grounded (the cancelled
  // case) he holds the ground under them and takes them on the way down, which is
  // the read _readOpponentKit already names and has never acted on.
  _airDenyTrack() {
    // Raise the guard on descent, not at launch: held from the top of the arc it
    // would be stale by the time he lands, and the parry window is the first 8
    // frames of a FRESH raise.
    if (this._armorApproach) {
      if (this.onGround) {
        this._armorApproach = false;
        this._armorHold = 14;             // cover the landing recovery too
      } else if (this.vy > 1) {
        this.shielding = true;
      }
    }
    if (this._armorHold > 0) {
      this._armorHold--;
      this.shielding = true;
      if (this._armorHold === 0) this.shielding = false;
    }
    if (this._airDenyTimer <= 0) return;
    const t = this.target;
    if (!t || t.health <= 0) return;
    if (!this.onGround && this._airDenyX !== null && this._airDenyX !== undefined) {
      const dx = this._airDenyX - this.cx();
      this.vx = Math.sign(dx) * Math.min(6, Math.max(2, Math.abs(dx) * 0.11));
      return;
    }
    if (!this.onGround) return;
    this._airDenyX = null;
    const dx = t.cx() - this.cx();
    if (Math.abs(dx) > 24) this.vx = Math.sign(dx) * Math.min(4.2, Math.abs(dx) * 0.09);
  }

  // ── SHIELD PROVISIONING ──────────────────────────────────────────────────
  // Eight paths in this class raise a guard with a bare `this.shielding = true`.
  // None of them touch `shieldStacks` or `shieldHP`, and the only code that ever
  // gives an AI a positive shieldHP lives in Fighter.updateAI(), which this class
  // replaces. So dealDamage() read him as stack 1 holding 0 HP: every hit cleared
  // the `actualDmg >= _shHP` test, broke the guard on contact and passed the full
  // damage through. His block was a parry roll or nothing.
  //
  // Same choke point as _vetoExtraJump rather than eight edits: watch the rising
  // edge and provision exactly what processInput gives a human on a fresh press,
  // including the degradation ladder and the recharge window. He blocks under the
  // player's rules, not under his own.
  _provisionShield() {
    // Fighter.update() enforces the ground-only guard, but _airDenyTrack runs
    // after it. Refuse the raise here, before the edge, or every refused frame
    // would book a fresh stack and wear his real guard down.
    //
    if (this.shielding && (!this.onGround || this._landLag > 0) && !this._brShieldTimer) {
      this.shielding = false;
    }
    const up = !!this.shielding;
    const wasUp = !!this._prevShieldProvision;
    if (up && !wasUp && this.health > 0) {
      const stacks = (this.shieldStacks || 0) + 1;
      this.shieldStacks        = stacks;
      this.shieldRechargeTimer = 180;
      this.shieldHP = stacks <= 3 ? [30, 15, 5][stacks - 1] : 0;  // 4-6 are % tiers
      if (stacks > 6) this.shielding = false;   // depleted — the wall the player hits
    }
    // Stamped last, after a depletion may have forced the guard back down: a raise
    // he was refused must not read as "already holding" next frame, or the frame
    // after that would skip provisioning and hand him a 0 HP guard again — exactly
    // the bug this method exists to remove.
    this._prevShieldProvision = !!this.shielding;
  }

  // ── VOID STEP VETO ───────────────────────────────────────────────────────
  // He walked into his own voids and ring-outed three times in fifteen seconds
  // without taking a single hit. isEdgeDanger() was not the culprit — it correctly
  // reports a Circuit void as danger — but roughly forty movement paths in this
  // class write this.vx directly and only some of them consult it. Auditing every
  // call site would be a large change with a large blast radius, and any new
  // movement path added later would reintroduce the same bug.
  //
  // So this is a single choke point instead: it runs in update(), after every AI
  // path has had its say and immediately before physics consumes vx. Whatever
  // decided to move him, he does not get to walk off a ledge into nothing.
  //
  // Deliberately narrow. It only vetoes SELF-PROPELLED grounded movement — being
  // knocked into a void is a legitimate ring-out the player earned, and stun and
  // ragdoll are left alone entirely. When the far side is jumpable he jumps it
  // rather than stopping, because a boss frozen at a gap edge is the idle-boss
  // failure mode this arena was explicitly designed to avoid.
  _vetoVoidStep() {
    // Tick the hop cooldown FIRST, unconditionally. Decrementing it inside the
    // fall-through branch meant it never ticked while he was airborne, so he landed
    // still on cooldown, got pinned by the vx=0 branch for the remainder, hopped,
    // and repeated — 75% of frames standing still, which is the idle-boss mode this
    // arena exists to avoid.
    if (this._voidHopCd > 0) this._voidHopCd--;

    if (!this.onGround || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    const dir = Math.sign(this.vx);
    if (!dir) return;
    // Anything this fast is knockback or a dash, not a walk — do not fight it.
    if (Math.abs(this.vx) > 12) return;
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return;
    if (!this.isEdgeDanger(dir)) return;

    // Ground ahead is missing. Is there a landing on the far side worth jumping to?
    const footY = this.y + this.h;
    const fromX = dir > 0 ? this.x + this.w : this.x;
    let nearestEdge = null;
    for (const pl of currentArena.platforms) {
      if (!pl || pl.isFloorDisabled) continue;
      if (Math.abs(pl.y - footY) > 34) continue;          // must be about level with him
      const edge = dir > 0 ? pl.x : pl.x + pl.w;          // the side facing him
      const gap  = (edge - fromX) * dir;
      if (gap <= 2) continue;                             // behind him or underfoot
      if (nearestEdge === null || gap < nearestEdge) nearestEdge = gap;
    }

    const JUMPABLE = 190;   // comfortably clears the widest void (80px) with margin
    if (nearestEdge !== null && nearestEdge < JUMPABLE && (this._voidHopCd || 0) <= 0) {
      const jv = (currentArena.isLowGravity)   ? -14
               : (currentArena.isHeavyGravity) ? -22
               : -19;
      this.vy = jv;
      // Short: leaving the ground is its own rate limit, this only stops a
      // double-fire on consecutive frames before onGround clears.
      this._voidHopCd = 8;
      return;                                             // keep vx — carry across
    }
    this.vx = 0;                                          // nothing to reach: hold the ledge
  }

  // ── STALE-BANK RELEASE ───────────────────────────────────────────────────
  // The 2026-07-30 replay measured Sovereign sitting at a full, UNSPENT super bar
  // for 27% of a match he lost 10 stocks to 2. Every spend condition in
  // _tryTacticalConversion is a window the opponent has to open for him — target
  // locked, target cursed, target in a hazard — and a relentless aggressor simply
  // never opens one.
  //
  // This first lived in that function. Instrumenting the live match showed why
  // that failed: _tryTacticalConversion was reached about 15 times a minute and
  // NEVER ONCE while superReady was true, so the release could not fire no matter
  // how it was tuned. It belongs somewhere unconditional, so it runs here, from
  // update(), every frame — the same reasoning that puts Null Anchor and Null
  // Recoil here rather than in the AI tick.
  //
  // A super he never fires is not patience, it is a wasted resource. Worse, it
  // starves Absolute Dominion: the domain counter only advances on spends, and
  // death wipes it, so hoarding can lose him the domain outright.
  // ── GRID-DRIVEN SUPER RELEASE ────────────────────────────────────────────
  // The first thing in the codebase to act on _tacticGrid.
  //
  // The grid had exactly two readers and neither changed behaviour: _swingGate is
  // off by default (it fired zero times in six runs) and _bestAction is called
  // only by the debug console. So the entire offline stack — trainer, VECTOR,
  // artifact, gridPrior() — filled a ledger that no decision consulted. This is
  // the missing edge.
  //
  // Super is the right first consumer because the grid's opinion about it is the
  // strongest one it holds. Measured across 1170 overnight matches, net per try:
  //
  //     ca (close-above)  super +30.97   vs  attack  +5.26
  //     fl (far-level)    super +28.62   vs  attack  (below super)
  //     cl / cb / ml      attack wins — super is NOT released there
  //
  // An order of magnitude, over thousands of tries per cell. And the bank hold it
  // overrides is situation-blind: it waits a flat ~1.5s wherever the fight is.
  // This does not make him spend more super everywhere; it makes him spend it in
  // the two cells his own record says it is worth an order of magnitude more, and
  // stay his hand in the cells where the record says swing instead.
  _gridWantsSuper(t) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.superGate === false || TUNE.tacticLedger === false) return false;
    const sit = this._situationKey(t);
    if (!sit) return false;
    // Both halves required, exactly as _swingGate demands both. A high super value
    // alone is not evidence — the question is whether it beats the alternative HERE,
    // and _tacticValue already falls back to the action's cross-situation average
    // when a cell is thin, so this answers early in a match rather than never.
    const sup = this._tacticValue(sit, 'super');
    const atk = this._tacticValue(sit, 'attack');
    if (sup === null || atk === null) return false;
    const margin = (typeof TUNE.superGateMargin === 'number') ? TUNE.superGateMargin : 8;
    return sup > atk + margin;
  }

  _updateSuperBank() {
    if (this.health <= 0) { this._superFullSince = 0; this._bankStale = false; return; }
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;

    if (!this.superReady) { this._superFullSince = 0; this._bankStale = false; return; }
    if (!this._superFullSince) this._superFullSince = _fc;

    // Was ~6s (380 frames). Frame-by-frame `sm` across the eight September
    // replays measured the cost of that hold: he sat on a full, unspent bar for
    // 20-36% of every match against the player's 6-14%, which capped him at
    // 2-3 spends per life no matter how long he lived, while the player's
    // spends scaled with life length (8-11 in a long life). The domain counter
    // only advances on spends, so the hold — not his charge rate, which matches
    // the player's — is what put Absolute Dominion out of reach. ~1.5s still
    // buys a real read; it just no longer buys a hoard.
    const _held = _fc - this._superFullSince;
    this._bankStale = _held > 90;
    // A cell the grid rates highly for super shortens the hold rather than removing
    // it: 20 frames still reads the opponent's commitment, it just no longer waits
    // out a full read in the one situation his record says is worth spending in.
    // Every gate below this line still applies — he can want it and still be denied
    // for range, stun, endlag or a raised guard.
    const _gridRelease = _held > 20 && this._gridWantsSuper(this.target);
    if (!this._bankStale && !_gridRelease) return;
    if (_gridRelease && !this._bankStale) this._gridSupers = (this._gridSupers || 0) + 1;

    // Don't fire it into nothing — it still has to be able to connect.
    const t = this.target;
    if (!t || t.health <= 0) return;
    // A guard normally makes the spend worthless, but a player who simply holds
    // shield would otherwise freeze the bar for the rest of the life. Past ~8s
    // the pressure is worth more than the perfect window: shields have finite
    // stacks and the super is how he breaks one.
    if (t.shielding && _held < 500) return;
    if (this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if ((this.attackEndlag || 0) > 0) return;
    const d = Math.hypot(t.cx() - this.cx(), t.cy() - this.cy());
    // 240 was under half the stage. He closes distance himself, so a slightly
    // wider gate lets the release fire on approach instead of waiting out the
    // gap at a full bar.
    if (d > 300) return;

    this.useSuper(t);
    if (!this.superReady) this._superFullSince = 0;
  }

  // ── NULL RECOIL (juggle break) ───────────────────────────────────────────
  // Replay evidence (2026-07-30, lost 10 stocks to 2): Sovereign spent 21% of the
  // match stunned and a further 14% ragdolled — over a THIRD of the fight unable
  // to take a single action. Not because the AI chose badly: updateAI() is gated
  // off entirely by stun and ragdoll, so during those frames there was no decision
  // to make. He was not outplayed, he was removed from the match.
  //
  // The generic lockout systems in dealDamage() do fire, but they only bound how
  // long a single chain of STUN can run. They cannot see a fighter who is merely
  // held airborne, and they hand back control in place with no space and no
  // options — straight back into the next hit.
  //
  // Null Recoil is the answer he was missing: a break he earns by being juggled.
  // Take enough hits in quick succession while genuinely helpless and the blade
  // discharges — stun and ragdoll clear, the attacker is thrown off him, and he
  // gets a brief beat of invincibility to re-establish. Runs in update() rather
  // than updateAI() for the same reason Null Anchor does: the exact state it
  // exists to escape is the one where updateAI() never runs.
  //
  // Priced so it is a break, not immunity. Four hits to charge, a ~9s cooldown,
  // and it grants no damage and no meter. Sustained pressure still beats him —
  // it just has to be paid for more than once.
  _updateNullRecoil() {
    if (this._recoilCd > 0)    this._recoilCd--;
    if (this._recoilFlash > 0) this._recoilFlash--;
    if (this.health <= 0) return;
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    if (this.invincible >= 900) return; // finisher/cinematic lock

    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;

    // Trigger on TIME REMOVED FROM THE MATCH, not on hit spacing.
    //
    // The first version of this counted hits landed while helpless and needed 4
    // inside 150 frames. Instrumented against a live Megaknight it fired exactly
    // zero times in 8000 frames — because the incoming hits alternate between
    // landing while he is stunned and landing in the beat right after he recovers,
    // so the "helpless hit" counter reset before it ever reached the threshold,
    // even while he was measurably incapacitated a third of the match.
    //
    // Measuring the lockout directly avoids that entire class of tuning problem:
    // it does not care how the pressure is spaced, only how much of the recent
    // past he spent unable to do anything. Being juggled, chain-stunned, or held
    // airborne all read the same way here, which is correct — they are the same
    // experience from inside the fight.
    // Stun and ragdoll are unambiguous — he is not in control. Being airborne is
    // NOT, on its own: he jumps constantly of his own accord, and instrumenting an
    // early build showed him charging the meter to 119 in a stretch where he took
    // zero damage. Airborne only counts as helpless when it was inflicted, i.e.
    // when a hit landed recently enough to be what put him up there and kept him.
    const _recentHit = (this._lastAttackerFrame != null) && (_fc - this._lastAttackerFrame < 45);
    const _helpless = (this.stunTimer > 0) || (this.ragdollTimer > 0) ||
                      (!this.onGround && _recentHit);
    const _WINDOW = 180;  // ~3s of recent history
    if (_fc - this._recoilLastFrame > _WINDOW) this._recoilHits = 0; // decayed to nothing
    if (_helpless) {
      this._recoilHits = Math.min(_WINDOW, (this._recoilHits || 0) + 1);
      this._recoilLastFrame = _fc;
    } else if (this._recoilHits > 0) {
      // Free frames pay the meter back down at double rate — a brief stumble must
      // never accumulate into a break across an otherwise even fight.
      this._recoilHits = Math.max(0, this._recoilHits - 2);
    }

    // He must also actually be under fire. Without this a long fall or a jump he
    // chose to take would charge the escape.
    const _underFire = (this._lastAttackerFrame != null) && (_fc - this._lastAttackerFrame < _WINDOW);

    // ~1.75s of the last ~3s spent unable to act, while being hit. That is not a
    // fight he is losing, it is a fight he is not in.
    if (this._recoilHits < 105 || !_underFire || this._recoilCd > 0) return;

    // ── DISCHARGE ──
    this._recoilHits      = 0;
    this._recoilLastFrame = -9999;
    this._recoilCd   = 540;  // ~9s
    this._recoilFlash = 20;
    this.stunTimer    = 0;
    this.ragdollTimer = 0;
    this.ragdollSpin  = 0;
    if (this.state === 'stunned' || this.state === 'ragdoll') this.state = 'idle';
    this.invincible   = Math.max(this.invincible || 0, 26); // one clean beat, not a reset
    // Kill the juggle's own upward velocity so he actually returns to the floor,
    // and reset the launch chain that put him there.
    if (this.vy < 0) this.vy = 0;
    this._launchCount = 0;

    // Throw the attacker off — space is the whole point of the break.
    const _a = this._lastAttacker;
    if (_a && _a.health > 0 && _a !== this &&
        Math.hypot(_a.cx() - this.cx(), _a.cy() - this.cy()) < 220) {
      const _dir = (_a.cx() >= this.cx()) ? 1 : -1;
      _a.vx = _dir * 15;
      if (typeof applyLaunch === 'function') applyLaunch(this, _a, -9);
      _a.stunTimer = Math.max(_a.stunTimer || 0, 14);
      // No damage on purpose: this is an escape, not a punish. It buys him the
      // neutral back and nothing else, so it can never itself become the kill.
    }

    if (typeof queueAnnouncement === 'function') queueAnnouncement('NULL RECOIL', '#cc2200');
    if (typeof spawnParticles === 'function') {
      spawnParticles(this.cx(), this.cy(), '#cc2200', 22);
      spawnParticles(this.cx(), this.cy(), '#ffffff', 12);
    }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
    if (typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
  }

  // ── NULL ANCHOR (Null Blade passive) ─────────────────────────────────────
  // Runs in update(), not updateAI(): ragdoll/stun gates skip updateAI, and a
  // ring-out happens precisely while helpless — the one death mode no decision
  // could act through. Grounded on the main floor → stake the anchor (clamped
  // 80px inside the floor edges). Falling past the arena's kill line with no
  // recovery possible → tether back, once per cooldown.
  // ── Null Anchor — DISABLED Sep 7 2026, no longer called from updateAI() ──────
  // Removed on request. Worth recording what the measurement actually said, since
  // the stated reason and the real one differ:
  //
  //   The premise was that the super it spends would have reset on death anyway,
  //   making the save free. That is NOT how the code behaves — neither
  //   `superMeter` nor `_domainSuperCount` is reset on respawn anywhere, so the
  //   50 meter was a real, persistent cost.
  //
  //   The removal is still nearly free, for a different reason: the anchor only
  //   saves RING-OUTS, and in smb_replay_sovereign_2026-09-07 exactly 1 of his 10
  //   deaths was a ring-out. It was never what kept him alive, so taking it away
  //   is not what will make him lose — nor was it what made him win.
  _updateNullAnchor() {
    if (this._anchorCd > 0) this._anchorCd--;
    if (this.health <= 0) return;
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    if (this.invincible >= 900) return; // finisher/cinematic lock — don't teleport out
    const _arena = (typeof currentArena !== 'undefined') ? currentArena : null;
    if (!_arena || !_arena.platforms) return;
    if (this.onGround) {
      const _fl = _arena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
      if (_fl && this.y + this.h >= _fl.y - 14) {
        this._anchorX = Math.max(_fl.x + 80, Math.min(_fl.x + _fl.w - 80 - this.w, this.x));
        this._anchorY = _fl.y - this.h - 2;
      }
      return;
    }
    const _kill = _arena.deathY || (GAME_H + 120);
    // Fatal fall in progress: below the visible arena, still descending, and the
    // kill line is close. Fires ragdolled or not — the tether is the blade's, not his.
    //
    // The save is not free. It costs the whole super bar and sits on a 60s cooldown:
    // a replay showed it erasing three ring-outs in one match at no price, which was
    // the real reason he ring-out out once to the player's five. Spending the bar
    // trades directly against Absolute Dominion — surviving the launch or expanding,
    // not both — and the player can now drain him and then kill him.
    const _anchorCost = 50;
    if (this._anchorCd <= 0 && (this.superMeter || 0) >= _anchorCost &&
        this.vy > 0 && this.y > Math.min(_kill - 80, GAME_H + 20)) {
      this.superMeter = 0;
      this.superReady = false;
      this._anchorTetherFrom = { x: this.cx(), y: this.cy() };
      this._anchorFlashTimer = 22;
      this._anchorCd         = 3600; // 60s — a re-launch inside this window still kills
      if (typeof queueAnnouncement === 'function') {
        queueAnnouncement('NULL ANCHOR — SUPER SPENT', '#cc2200');
      }
      this.x = this._anchorX; this.y = this._anchorY;
      this.vx = 0; this.vy = 0;
      this.ragdollTimer = 0;
      this.stunTimer    = Math.min(this.stunTimer, 6);
      this.invincible   = Math.max(this.invincible, 18); // land safely, no anchor-camping
      if (typeof spawnParticles === 'function') {
        spawnParticles(this.cx(), this.cy(), '#cc2200', 16);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 8);
      }
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
      if (typeof showBossDialogue === 'function' && Math.random() < 0.4) {
        const _al = ['The blade remembers where I stood.', 'Not the void. Not today.', 'Anchored.'];
        showBossDialogue(_al[Math.floor(Math.random() * _al.length)], 90);
      }
    }
  }

  // ── AREA-THREAT PERCEPTION (boss & arena set-piece hazards) ──────────────
  // Sovereign had no real-time danger assessment against a boss, and the reason
  // was perception, not judgement. His threat scan reads exactly two things: the
  // `projectiles` pool, and owner-attached weapon hazards from the registry at
  // the top of this file. A boss produces neither. Everything the Creator throws
  // lives in its own global array — bossWarnings, bossSpikes, bossBeams,
  // bossMetSafeZones, tfShockwaves, tfGravityWells — none of them Projectiles,
  // most with no velocity at all, so nothing in the old scan could represent
  // them. In a refight he walked into rising spikes and stood inside slam
  // circles because as far as his senses reached, the arena was empty.
  //
  // These are zones, not shots, so the reaction is different from the projectile
  // dodge below: leave the area, don't sidestep a trajectory. bossWarnings is
  // the most valuable input because it is the TELEGRAPH layer — reading it is
  // what makes this avoidance rather than after-the-fact damage reaction.
  //
  // Ordered by how little choice he has: get inside a meteor safe ring, clear a
  // floor column, hop an expanding ring, then walk out of a radius. Returns true
  // when it has spent the frame, which caller treats as a consumed decision.
  // ── DOMAIN HAZARD PERCEPTION ─────────────────────────────────────────────
  // Nothing in this class ever read DomainManager's hazards. _scanAreaThreats
  // knows bossSpikes, bossBeams, bossWarnings and bossMetSafeZones — all boss
  // globals — so every class domain was invisible to him: Storm Realm's lightning
  // columns, Mjolnir, Arsenal's turret fire, Verdant Hunt's giant arrow. He was
  // not choosing to tank them, he had no input saying they existed. Same shape as
  // the Electric Staff orb he could not see.
  //
  // Both answers are already legal against these: hazards call dealDamage() with
  // the domain OWNER as attacker, so a raised shield absorbs them normally and a
  // FRESH shield parries — 65% within 8 frames, which stuns the domain's owner for
  // 90 frames and leaves them taking 1.5x damage. Parrying Mjolnir is the single
  // biggest swing available to him inside someone else's domain.
  //
  // Order of preference: step out of what can be stepped out of (free), shield
  // what cannot (cheap), and time the raise late so it lands inside the parry
  // window rather than early where it is only a block.
  _scanDomainHazards(moveSpd, jumpVy) {
    if (this.health <= 0 || (this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return false;
    if (typeof isCinematic !== 'undefined' && isCinematic) return false;
    if (typeof DomainManager === 'undefined' || !DomainManager.domains || !DomainManager.domains.length) return false;
    if (this._domHazCd > 0) { this._domHazCd--; return false; }
    // Same fairness knob every other perception path uses — he is not frame-perfect.
    if (Math.random() < this._reactionMistakeRate() * 0.4) return false;

    const cx = this.cx(), cy = this.cy(), half = this.w / 2;
    const PARRY_AT = 7;          // raise inside the 8-frame fresh-shield window
    let shieldTti = Infinity;    // soonest unavoidable impact
    let escape    = null;        // { dir, tti } for something he can simply leave

    for (const dm of DomainManager.domains) {
      if (!dm || dm.owner === this || !dm.hazards) continue;
      for (const h of dm.hazards) {
        if (!h) continue;
        const R = (h.radius || 20) + half;

        // Lightning: a full-height column with no vertical test at all, so jumping
        // is never an escape and sideways always is — if the warning leaves time.
        if (h.type === 'lightning') {
          if (h.struck) continue;
          const dx = cx - h.x;
          if (Math.abs(dx) >= R) continue;
          const tti  = h.warningTimer || 0;
          const need = (R - Math.abs(dx) + 12) / Math.max(0.1, moveSpd);
          let dir    = (dx >= 0 ? 1 : -1);
          // Leaving a column outward is how he walked himself into a ringout in
          // 2026-09-06: the bolt is aimed at his own x, so it re-spawns on him and
          // he flees the same way again until the floor runs out. Pick the side
          // with room, and when there is none, eat it behind the shield — a 26
          // bolt is fully absorbed by a stack-1 shield (30 HP) and a ringout is not.
          const ext = this._floorExtent();
          if (ext) {
            const roomThis  = dir > 0 ? (ext.hi - cx) : (cx - ext.lo);
            const roomOther = dir > 0 ? (cx - ext.lo) : (ext.hi - cx);
            if (roomThis < 150 && roomOther > roomThis + 120) dir = -dir;
            const room = dir > 0 ? (ext.hi - cx) : (cx - ext.lo);
            if (room < 120) { if (tti < shieldTti) shieldTti = tti; continue; }
          }
          if (need < tti - 2 && !this.isEdgeDanger(dir)) {
            if (!escape || tti < escape.tti) escape = { dir, tti };
          } else if (tti < shieldTti) {
            shieldTti = tti;
          }
          continue;
        }

        // Mjolnir's dash homes at up to speed 22 and only ends on contact, so it
        // cannot be outrun — it is the parry target, not a dodge target. While
        // roaming it is an ordinary mover and falls through to the branch below.
        if (h.type === 'mjolnir' && h.state === 'strike') {
          const sp   = Math.hypot(h.vx || 0, h.vy || 0) || 1;
          const dist = Math.hypot(h.x - cx, h.y - cy) - R;
          const tti  = dist / sp;
          if (tti >= 0 && tti < shieldTti) shieldTti = tti;
          continue;
        }

        // Anything with a velocity: solve for closest approach and only react to
        // what actually intersects him. Static owner-anchored hazards (orbiting
        // shields, rage pulses) have no velocity and are handled by spacing.
        if (typeof h.vx === 'number' || typeof h.vy === 'number') {
          const vx = h.vx || 0, vy = h.vy || 0;
          const sp2 = vx * vx + vy * vy;
          if (sp2 < 0.01) continue;
          const rx = cx - h.x, ry = cy - h.y;
          const tti = (rx * vx + ry * vy) / sp2;          // time of closest approach
          if (tti < 0 || tti > 45) continue;               // behind him, or too far out
          const missX = rx - vx * tti, missY = ry - vy * tti;
          if (Math.hypot(missX, missY) >= R) continue;     // it misses on its own
          // A mostly-horizontal mover is escaped vertically; otherwise sideways.
          if (Math.abs(vy) < Math.abs(vx) * 0.6 && this.onGround && tti > 6) {
            this.vy = jumpVy;
            this._domHazCd = 10;
            if (typeof this._recordEvent === 'function') this._recordEvent('dodge', 2);
            return true;
          }
          if (tti < shieldTti) shieldTti = tti;
          continue;
        }
      }
    }

    // A fresh shield is not merely cheaper than walking, it is better: stack 1
    // carries 30 shield HP, which absorbs a 26-damage bolt or a 16 Mjolnir strike
    // whole, and inside the 8-frame window it parries 65% of the time — stunning
    // the DOMAIN'S OWNER for 90 frames and leaving them at 1.5x damage taken.
    // Walking out of a column concedes the exchange; parrying wins it. So the
    // shield takes priority whenever it is off cooldown, and the escape is the
    // fallback for when it is not.
    const canShield = this.shieldCooldown === 0 && this._shieldHoldFrames === 0;
    if (canShield && shieldTti <= PARRY_AT && this._startTacticalShield(14)) {
      this._domHazCd = 20;
      if (typeof this._recordEvent === 'function') this._recordEvent('dodge', 2);
      return true;
    }

    if (escape && !(shieldTti <= PARRY_AT + 2)) {
      this.vx = escape.dir * moveSpd * 1.9;
      this._domHazDir = escape.dir;
      this._domHazCd  = 6;
      if (typeof this._recordEvent === 'function') this._recordEvent('dodge', 2);
      return true;
    }

    if (shieldTti <= PARRY_AT) {
      if (this._startTacticalShield(14)) {
        this._domHazCd = 20;
        if (typeof this._recordEvent === 'function') this._recordEvent('dodge', 2);
        return true;
      }
      // Shield unavailable (cooldown) — take the hit moving rather than standing.
      const away = (this.cx() <= GAME_W / 2) ? 1 : -1;
      if (!this.isEdgeDanger(away)) { this.vx = away * moveSpd * 1.6; this._domHazCd = 8; return true; }
    }
    return false;
  }

  _scanAreaThreats(moveSpd, jumpVy) {
    if (this.health <= 0 || this.stunTimer > 0 || this.ragdollTimer > 0) {
      this._hazEscFrames = 0; return false;
    }
    if (typeof isCinematic !== 'undefined' && isCinematic) return false;

    // ── ESCAPES MUST BE COMMITTED, NOT RE-DECIDED ──────────────────────────
    // `_areaDodgeCd` used to blind this whole function ("if cd > 0 return false"),
    // which made every escape exactly ONE frame long: he set vx away from the
    // hazard, then went deaf for six frames while the combat logic below drove him
    // straight back at the boss — through the beam he had just stepped out of.
    // That is why he read as having no beam awareness at all: he saw them fine, he
    // just never got to finish leaving. A boss beam is 24px either side of its
    // centre and a spike field spans ~160px, so clearing one takes 8-15 frames of
    // sustained movement, not one.
    //
    // So the cooldown now gates only NEW decisions, while an in-flight escape keeps
    // driving movement and keeps being re-validated against the ledge each frame.
    if (this._areaDodgeCd > 0) this._areaDodgeCd--;
    if ((this._hazEscFrames || 0) > 0) {
      this._hazEscFrames--;
      let d = this._hazEscDir || 1;
      if (this.isEdgeDanger(d)) d = -d;
      if (!this.isEdgeDanger(d)) { this.vx = d * moveSpd * 2.0; this._hazEscDir = d; return true; }
      this._hazEscFrames = 0;   // boxed in — drop the commitment, re-decide below
    }

    const cx = this.cx(), cy = this.cy();
    // Same fairness knob the projectile dodge uses — he is not frame-perfect, and
    // a slip here means he genuinely eats the hit.
    if (this._areaDodgeCd > 0) return false;
    if (Math.random() < this._reactionMistakeRate() * 0.4) return false;
    const act = (frames) => {
      this._areaDodgeCd = frames;
      if (typeof this._recordEvent === 'function') this._recordEvent('dodge', 2);
      return true;
    };

    // 1. METEOR STORM — the floor is lethal EXCEPT inside a safe ring. Fleeing a
    //    danger zone is exactly wrong here; the only survivable move is to get in.
    if (typeof bossMetSafeZones !== 'undefined' && Array.isArray(bossMetSafeZones) && bossMetSafeZones.length) {
      let inside = false, best = null, bestD = Infinity;
      for (const z of bossMetSafeZones) {
        if (!z || (z.timer !== undefined && z.timer <= 0)) continue;
        const dz = Math.hypot(z.x - cx, z.y - cy);
        if (dz < (z.r || 0) * 0.8) { inside = true; break; }
        if (dz < bestD) { bestD = dz; best = z; }
      }
      if (!inside && best) {
        const zDir = Math.sign(best.x - cx) || 1;
        if (!this.isEdgeDanger(zDir)) this.vx = zDir * moveSpd * 1.9;
        if (this.onGround && best.y < cy - 45) this.vy = jumpVy;
        return act(5);
      }
    }

    // 2. FLOOR COLUMNS — spikes and beams occupy a vertical strip. Jumping keeps
    //    him over the strip, so the answer is always sideways, and never sideways
    //    off the stage.
    const columns = [];
    if (typeof bossSpikes !== 'undefined' && Array.isArray(bossSpikes)) {
      // Carry the spike's height: whether jumping is a real escape depends on it.
      for (const s of bossSpikes) {
        if (!s || s.done) continue;
        columns.push({ x: s.x, half: 22, spikeH: s.h || 0, rising: s.phase === 'rising' });
      }
    }
    if (typeof bossBeams !== 'undefined' && Array.isArray(bossBeams)) {
      for (const b of bossBeams) {
        if (!b || b.done) continue;
        // A beam telegraphs before it fires (110 frames, 150 in the meteor storm;
        // it was 300 when this was written). Treating warning
        // and active alike meant seconds of backing away from a harmless
        // marker every time the boss cast — so he gave up all his pressure and
        // was often drifting back in by the time it actually turned on. React in
        // the last second of the warning, and for the whole 110-frame active burn.
        if (b.phase === 'warning' && (b.warningTimer || 0) > 60) continue;
        columns.push({ x: b.x, half: 32 });
      }
    }
    if (typeof bossWarnings !== 'undefined' && Array.isArray(bossWarnings)) {
      for (const w of bossWarnings) {
        if (!w || (w.timer !== undefined && w.timer <= 0)) continue;
        if (w.type === 'spike_warn') columns.push({ x: w.x, half: 22 });
      }
    }
    //    Columns must be merged into FIELDS before escaping, because a single
    //    column is almost never what he is standing in. Boss.updateAI() spawns
    //    spikes five at a time, 40px apart, centred on the TARGET's cx — i.e.
    //    directly on top of him, spanning ~160px. Escaping the nearest column
    //    alone moved him 40px sideways, which is exactly the spacing: he stepped
    //    out of one spike and into the next, over and over, which is what "runs
    //    into the spikes" looks like from outside. Merge overlapping columns and
    //    leave the whole cluster.
    if (columns.length) {
      columns.sort((a, b) => a.x - b.x);
      const fields = [];
      for (const col of columns) {
        const last = fields[fields.length - 1];
        // 26px of body margin on each side, matching the single-column threshold.
        if (last && col.x - col.half - 26 <= last.hi) {
          last.hi = Math.max(last.hi, col.x + col.half);
          last.tallest = Math.max(last.tallest, col.spikeH || 0);
          last.allRising = last.allRising && !!col.rising;
        } else {
          fields.push({ lo: col.x - col.half, hi: col.x + col.half,
                        tallest: col.spikeH || 0, allRising: !!col.rising });
        }
      }
      for (const f of fields) {
        if (cx < f.lo - 26 || cx > f.hi + 26) continue;
        const outLeft  = cx - (f.lo - 30);   // distance to walk clear on the left
        const outRight = (f.hi + 30) - cx;   // …and on the right
        let outDir = outLeft <= outRight ? -1 : 1;
        if (this.isEdgeDanger(outDir)) outDir = -outDir;
        if (this.isEdgeDanger(outDir)) return false;   // boxed in — no safe escape
        this.vx = outDir * moveSpd * 2.0;
        // Commit for as long as it actually takes to clear the field, so combat
        // logic cannot drag him back into it mid-exit.
        const _span = Math.min(outLeft, outRight);
        this._hazEscDir    = outDir;
        // Commit for the whole walk-out. The second spike source (the ground-slam
        // volley in smb-boss-tf-attacks1.js) lays SIX spikes 55px apart centred on
        // the boss — a 275px field, so an exit can be ~165px and the old 30-frame
        // cap expired mid-field and let combat pull him back in.
        this._hazEscFrames = Math.min(48, Math.ceil(_span / (moveSpd * 2.0)) + 4);
        // Jumping is only an escape while the spikes are still SHORT. They gain 8px
        // a frame and then sit at full height for 180 frames — far longer than any
        // jump — so hopping a full-grown field just lands him back inside it. Hop
        // the nubs while they are still rising and low; otherwise walk, and only
        // walk.
        if (this.onGround && f.allRising && f.tallest < 40 && _span > moveSpd * 2.0 * 10) {
          this.vy = jumpVy;
        }
        return act(6);
      }
    }

    // 3. EXPANDING RINGS — a shockwave passes along the ground; the counter is to
    //    be off the ground as it arrives, not to outrun it.
    if (typeof tfShockwaves !== 'undefined' && Array.isArray(tfShockwaves)) {
      for (const w of tfShockwaves) {
        if (!w || (w.timer !== undefined && w.timer <= 0)) continue;
        const gap = Math.abs(Math.abs(cx - w.x) - (w.r || 0));
        if (gap < 70 && this.onGround) { this.vy = jumpVy; return act(10); }
      }
    }

    // 4. RADIUS ZONES — slam circles, gravity wells, cones. Walk out the short way.
    const zones = [];
    if (typeof bossWarnings !== 'undefined' && Array.isArray(bossWarnings)) {
      for (const w of bossWarnings) {
        if (!w || (w.timer !== undefined && w.timer <= 0)) continue;
        if (w.type === 'spike_warn') continue;        // handled as a column above
        if (w.r) zones.push({ x: w.x, y: w.y, r: w.r });
      }
    }
    if (typeof tfGravityWells !== 'undefined' && Array.isArray(tfGravityWells)) {
      for (const g of tfGravityWells) {
        if (!g || (g.timer !== undefined && g.timer <= 0)) continue;
        if (g.r) zones.push({ x: g.x, y: g.y, r: g.r });
      }
    }
    for (const z of zones) {
      if (Math.hypot(z.x - cx, z.y - cy) >= z.r) continue;
      let outDir = Math.sign(cx - z.x) || (cx < GAME_W / 2 ? 1 : -1);
      if (this.isEdgeDanger(outDir)) outDir = -outDir;
      if (this.isEdgeDanger(outDir)) return false;
      this.vx = outDir * moveSpd * 1.85;
      // A circle centred above him is an air attack — leaving sideways is enough.
      // One centred on the deck is a slam; get airborne as well as clear.
      if (this.onGround && z.y > cy - 20) this.vy = jumpVy;
      return act(8);
    }

    return false;
  }

  // ══════════════════════════════════════════════════════════════
  // ══ INFERENCE — learning rules for mechanics he has no name for ══════════
  //
  // Everything else he learns is indexed by actions he ALREADY has names for:
  // four dials, five verbs, 59 named cascade branches. None of it can represent
  // a mechanic the code never told him about. Clash is the proof — two swings
  // starting within 3 frames with equal strength tiers cancel each other, and he
  // has triggered it by accident in live matches while having no way to notice it
  // happened, because a clash deals ZERO damage to both fighters and so produces
  // no signal in any health-based ledger he owns.
  //
  // This works the other way round: it starts from a PREDICTION FAILURE and looks
  // for what co-occurred.
  //
  //   1. He swings and predicts "this should land" — in range, facing them, they
  //      are not shielding and not invincible.
  //   2. It does not land.
  //   3. Record every observable condition that happened to be true.
  //   4. Over many such failures, find the condition whose presence raises the
  //      failure rate far above its base rate.
  //
  // That is the chain a person runs: "that should have hit. They were not
  // blocking. But we did swing at the same instant — maybe swinging together
  // cancels." The second stage is the same machinery: among the cases where they
  // ALSO swung together, separate the ones where he still got hit, and the
  // difference is their action's strength tier.
  //
  // Nothing here reads the clash constants or any clash flag. The only inputs are
  // things one fighter can observe about another.
  _inferFeatures(t, _fc) {
    const F = {};
    if (!t) return F;
    const reach  = (this.weapon && this.weapon.range) || 90;
    const treach = (t.weapon && t.weapon.range) || 90;
    const d      = Math.abs(t.cx() - this.cx());
    F.opp_swinging = (t.attackTimer || 0) > 0;
    // "We started at the same moment" — he can see when their swing began.
    const myS = this._attackStartFrame || 0, tS = t._attackStartFrame || 0;
    const sync = F.opp_swinging && myS && tS && Math.abs(myS - tS);
    F.sync_0_3   = sync !== false && sync <= 3;
    F.sync_4_10  = sync !== false && sync > 3 && sync <= 10;
    F.mutual_reach = d <= reach + 8 && d <= treach + 8;
    F.opposed = Math.sign(t.cx() - this.cx()) === (this.facing || 1) &&
                Math.sign(this.cx() - t.cx()) === (t.facing || 1);
    // Their action's strength relative to his, as a WATCHER would rank it: a
    // super in flight reads as a super, otherwise whatever is driving the swing.
    // This is observation — you can see someone throw a super. Deliberately not
    // a call to _clashTier(), because that is the clash system's own helper and
    // the point is that he owns none of the clash system's concepts.
    const tierOf = f => (f && f.superActive) ? 2 : ((f && f._attackKindTier) || 0);
    const myT = tierOf(this), tT = tierOf(t);
    F.opp_tier_higher = F.opp_swinging && tT > myT;
    F.opp_tier_equal  = F.opp_swinging && tT === myT;
    F.opp_airborne = !t.onGround;
    F.close_range  = d < reach * 0.6;

    // ── LATENT VARIABLES: features he was never handed ────────────────────
    // After every observable above is accounted for, unexplained variance is
    // left over — the clash case splits ~50/50 between "we both vanished" and
    // "mine broke and theirs landed" and none of the features above say why.
    // The cause is CLASH_STREAK_MAX / CLASH_COOLDOWN, counters he cannot see.
    //
    // A reasoner facing residual variance posits something unobserved. The most
    // productive guess is almost always HISTORY: the outcome of this event may
    // depend on how recently the same event happened. So he constructs that
    // feature himself — time since the last occurrence of this same pattern —
    // rather than being told a streak counter exists. If the hidden variable is
    // a cooldown or a streak, this is the shape that exposes it.
    const sig = (F.sync_0_3 ? 'S' : '') + (F.opp_tier_equal ? 'E' : '') +
                (F.opp_swinging ? 'W' : '');
    if (sig) {
      const hist = this._infPatternLast || (this._infPatternLast = {});
      const prev = hist[sig];
      if (prev !== undefined) {
        const since = _fc - prev;
        F.repeat_within_30  = since <= 30;
        F.repeat_within_120 = since <= 120;
        F.first_in_a_while  = since > 120;
      } else {
        F.first_in_a_while = true;
      }
      hist[sig] = _fc;
    }
    return F;
  }

  // His model of when a swing ought to connect. Deliberately naive — the whole
  // point is that its failures are informative.
  _inferExpectHit(t) {
    if (!t || t.health <= 0) return false;
    const reach = (this.weapon && this.weapon.range) || 90;
    const d = Math.abs(t.cx() - this.cx());
    if (d > reach) return false;
    if (Math.abs(t.cy() - this.cy()) > 60) return false;
    if (t.shielding) return false;
    if ((t.invincible || 0) > 0) return false;
    return true;
  }

  _inferTick() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.infer) return;
    if (!this._infSeeded) { this._infSeeded = true; try { this._seedInference(); } catch (e) {} }
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const swinging = (this.attackTimer || 0) > 0;
    if (swinging && !this._infPrevSwing) {
      const t = this.target;
      this._infOpen = { f: _fc, dealt0: this.totalDamageDealt || 0, hp0: this.health,
                        expect: this._inferExpectHit(t), feat: this._inferFeatures(t, _fc),
                        hurtAtExchange: false };
    }
    // Damage taken AT THE EXCHANGE, not merely somewhere in the swing window.
    // Without this the "did I also get hurt" flag catches a follow-up landing
    // half a second later, and the tier lesson — cancel vs. mine-broke-theirs-
    // landed — cannot separate, because both look identical over 36 frames.
    if (this._infOpen && _fc - this._infOpen.f <= 8 && this.health < this._infOpen.hp0 - 0.001) {
      this._infOpen.hurtAtExchange = true;
    }
    if (this._infOpen && (!swinging || _fc - this._infOpen.f > 36)) {
      const O = this._infOpen; this._infOpen = null;
      if (O.expect) {
        const landed = (this.totalDamageDealt || 0) > O.dealt0 + 0.001;
        const gotHit = O.hurtAtExchange;
        const S = this._infStats || (this._infStats = { n: 0, miss: 0, feat: {}, pair: {} });
        if (!S.pair) S.pair = {};
        S.n++;
        if (!landed) { S.miss++; if (gotHit) S.missHitTotal = (S.missHitTotal || 0) + 1; }
        const on = Object.keys(O.feat).filter(k => O.feat[k]);
        for (const k of on) {
          const e = S.feat[k] || (S.feat[k] = { n: 0, miss: 0, missClean: 0, missHit: 0 });
          e.n++;
          if (!landed) { e.miss++; if (gotHit) e.missHit++; else e.missClean++; }
        }
        // PAIRS. A single condition cannot separate "we cancelled" from "mine
        // broke and theirs landed" — both look like `opp_swinging`. The rule is a
        // CONJUNCTION (same instant AND equal strength), so the conjunction has to
        // be a thing he can hold. Ten features is 45 pairs; cheap.
        for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
          const key = on[i] + ' & ' + on[j];
          const e = S.pair[key] || (S.pair[key] = { n: 0, miss: 0, missClean: 0, missHit: 0 });
          e.n++;
          if (!landed) { e.miss++; if (gotHit) e.missHit++; else e.missClean++; }
        }
      }
    }
    this._infPrevSwing = swinging;
  }

  // ── WHAT HE ALREADY KNOWS ABOUT THE GAME ──────────────────────────────────
  // _infStats is per-instance, so every match used to start at n=0 and he could
  // not state a single rule until 12 predicted swings in. Seed from the dossier's
  // one game-wide record (SovDossier.recordMech) and remember the seed, so
  // _commitMech files only what THIS instance observed on top of it.
  //
  // Two layers. SOV_MEMORY is what he already knew before this machine ever ran
  // him — the lab's thousands of fights, the in-world fifty thousand years. The
  // dossier is what he has learned HERE. The innate layer is added every time
  // and never written back (_infBase includes it, so _commitMech files only new
  // swings), which keeps it at its fixed weight while local experience grows
  // up to SOV_MECH_CAP and can outvote it if the game changes.
  _seedInference() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const S = { n: 0, miss: 0, missHitTotal: 0, feat: {}, pair: {} };
    const add = (src) => {
      if (!src || !(src.n > 0)) return;
      S.n += src.n; S.miss += src.miss || 0; S.missHitTotal += src.missHitTotal || 0;
      for (const bucket of ['feat', 'pair']) {
        const from = src[bucket] || {};
        for (const k of Object.keys(from)) {
          const c = from[k], d = S[bucket][k] || (S[bucket][k] = { n: 0, miss: 0, missClean: 0, missHit: 0 });
          d.n += c.n || 0; d.miss += c.miss || 0; d.missClean += c.missClean || 0; d.missHit += c.missHit || 0;
        }
      }
    };
    if (TUNE.innateMemory !== false && typeof SOV_MEMORY !== 'undefined' && SOV_MEMORY && SOV_MEMORY.mech) {
      add(SOV_MEMORY.mech);
    }
    if (typeof SovDossier !== 'undefined' && typeof SovDossier.mechPrior === 'function') add(SovDossier.mechPrior());
    if (!(S.n > 0)) return;
    this._infStats = S;
    this._infBase = JSON.parse(JSON.stringify(S));
  }

  // File the counts accrued since the last commit. Called on death and every
  // 600 frames, because a match can end without him dying and onDeath is the
  // only commit the dossier otherwise gets.
  _commitMech() {
    const S = this._infStats;
    if (!S || typeof SovDossier === 'undefined' || typeof SovDossier.recordMech !== 'function') return;
    const B = this._infBase || { n: 0, miss: 0, missHitTotal: 0, feat: {}, pair: {} };
    const delta = { n: S.n - (B.n || 0), miss: S.miss - (B.miss || 0),
                    missHitTotal: (S.missHitTotal || 0) - (B.missHitTotal || 0), feat: {}, pair: {} };
    if (!(delta.n > 0)) return;
    for (const bucket of ['feat', 'pair']) {
      const src = S[bucket] || {}, base = B[bucket] || {};
      for (const k of Object.keys(src)) {
        const c = src[k], b = base[k] || {};
        if (c.n - (b.n || 0) <= 0) continue;
        delta[bucket][k] = { n: c.n - (b.n || 0), miss: c.miss - (b.miss || 0),
                             missClean: c.missClean - (b.missClean || 0), missHit: c.missHit - (b.missHit || 0) };
      }
    }
    SovDossier.recordMech(delta);
    this._infBase = JSON.parse(JSON.stringify(S));
  }

  // ── ACTING ON WHAT HE INFERRED ────────────────────────────────────────────
  // `discovery` failed by acting GLOBALLY: a finding made the whole cascade
  // yield for 600 frames, so he abandoned a working plan to chase something that
  // was often unreachable, and measured negative. A rule from _inferRules is
  // about ONE exchange ("a same-instant, equal-strength swing does not land"),
  // so the action is scoped to one swing and nothing else: on its first frame,
  // if a stated rule covers it, he may cancel it and raise a guard — the same
  // conversion _swingGate already makes off the tactic ledger.
  //
  // Two asymmetries with curiosity, both deliberate. Curiosity is OPTIMISTIC
  // about what to try, because trying is how uncertainty narrows. Acting on a
  // rule is PESSIMISTIC about the rule: the swing is scored with the upper
  // Wilson bound on landing and the lower bound on getting hurt, so a rule at
  // n=6 has to be overwhelming before it changes anything and a rule at n=40
  // only has to be right.
  //
  // Returns true when the swing was converted.
  _inferAct(t) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.infer || !TUNE.inferAct) return false;
    const O = this._infOpen;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    // Only the swing _inferTick opened THIS frame: its features were computed
    // once, at the decision point. Recomputing them would advance the pattern
    // history (_infPatternLast) and corrupt repeat_within_*.
    if (!O || O.f !== _fc || !O.expect) return false;
    if (!t || t.health <= 0 || this.health <= 0) return false;
    if (this._expLast === _fc) return false;                  // a deliberate experiment is not up for veto
    if (this._targetHelpless(t)) return false;                // free damage outranks every rule

    const now = this._inferRulesCache;
    if (!now || _fc - now.f > 60) this._inferRulesCache = { f: _fc, rules: this._inferRules(true) };
    const rules = this._inferRulesCache.rules;
    if (!rules.length) return false;

    const S = this._infStats;
    const z = (typeof TUNE.inferActZ === 'number') ? TUNE.inferActZ : 1.28;
    const wilson = (k, n, sign) => {
      if (!(n > 0)) return sign > 0 ? 1 : 0;
      const p = k / n, z2 = z * z, den = 1 + z2 / n;
      const mid = p + z2 / (2 * n), rad = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n));
      return Math.min(1, Math.max(0, (mid + sign * rad) / den));
    };
    const on = O.feat;
    // The best-evidenced stated rule that covers this swing: lowest plausible
    // chance of landing, judged at its most generous.
    let cell = null, key = null, landUCB = 1;
    for (const r of rules) {
      const parts = r.when.split(' & ');
      if (!parts.every(p => on[p])) continue;
      const c = parts.length > 1 ? S.pair[r.when] : S.feat[r.when];
      if (!c || !(c.n > 0)) continue;
      const u = wilson(c.n - c.miss, c.n, +1);
      if (u < landUCB) { landUCB = u; cell = c; key = r.when; }
    }
    if (!cell) return false;

    const myDmg = (this.weapon && this.weapon.damage) || 12;
    const tDmg  = (t && t.weapon && t.weapon.damage) || 12;
    const hurtLCB = wilson(cell.missHit || 0, cell.n, -1);
    const evSwing = landUCB * myDmg - hurtLCB * tDmg;
    const g = this._tacticValue(this._situationKey(t), 'shield');
    const evGuard = (g === null) ? 0 : g;
    if (evSwing >= evGuard) return false;

    // Leave a share alone so the rule keeps being tested. Without this a rule
    // that stops being true (a rebalance, a different opponent) can never be
    // unlearned, because he would never again take the swing that disproves it.
    const explore = (typeof TUNE.inferActExplore === 'number') ? TUNE.inferActExplore : 0.15;
    // Page-wide tally as well as per-instance, so a lab sweep can verify the
    // mechanism fired after every match's Sovereign is gone.
    const G = (typeof window !== 'undefined')
      ? (window.__sovInferAct || (window.__sovInferAct = { converted: 0, explored: 0, byRule: {} }))
      : { converted: 0, explored: 0, byRule: {} };
    const st = this._inferActStats || (this._inferActStats = { converted: 0, explored: 0, byRule: {} });
    const bump = (f) => { st[f]++; G[f]++; };
    if (Math.random() < explore) { bump('explored'); return false; }

    // Convert, and DROP the open observation: a cancelled swing did not fail,
    // it never happened. Booking it as a miss would feed the rule its own
    // decision and make it self-confirming.
    this._infOpen = null;
    this.attackTimer = 0;
    this.cooldown    = Math.max(this.cooldown || 0, 10);
    this.shielding   = true;
    this._armorHold  = Math.max(this._armorHold || 0, 12);
    bump('converted');
    st.byRule[key] = (st.byRule[key] || 0) + 1;
    G.byRule[key] = (G.byRule[key] || 0) + 1;
    (G.frames || (G.frames = [])).push(_fc);   // when, so a lab can see whether conversions die off
    return true;
  }

  // Promote a co-occurring condition to a stated rule once it is both frequent
  // enough to trust and far enough above the base failure rate to be worth
  // believing. `clean` separates "we both vanished" from "mine broke and theirs
  // landed", which is the tier lesson.
  _inferRules(includePairs) {
    const S = this._infStats;
    if (!S || S.n < 12) return [];
    const base = S.miss / S.n;
    const out = [];
    const src = includePairs ? Object.assign({}, S.feat, S.pair || {}) : S.feat;
    for (const k of Object.keys(src)) {
      const e = src[k];
      if (e.n < 6) continue;
      const rate = e.miss / e.n;
      const lift = base > 0.001 ? rate / base : (rate > 0 ? 99 : 0);
      if (rate < 0.55 || lift < 1.6) continue;
      out.push({ when: k, n: e.n, missRate: +rate.toFixed(2), baseRate: +base.toFixed(2),
                 lift: +lift.toFixed(2),
                 outcome: e.missClean >= e.missHit ? 'both_cancel' : 'mine_broke_theirs_landed',
                 clean: e.missClean, alsoHit: e.missHit });
    }
    return out.sort((a, b) => b.lift - a.lift);
  }

  // ── CURSES ARE PICKED UP BY PROXIMITY, NOT BY CHOICE ──────────────────────
  // `_mapItemValue()` returns 0 for every curse and `_selectMapResource` does
  // `if (!value) continue`, which the comment there calls "curses never become a
  // self-inflicted advantage". That only means he never WALKS OVER TO one. It is
  // not avoidance: `updateMapPerks()` collects on `Math.hypot(dx, dy) < 28` for
  // any fighter in range, so a curse sitting on the deck he is fighting on goes
  // straight into him.
  //
  // The Circuit puts three pickups on his own decks and 4 of its 9 types are
  // curses. Measured in the 2026-09-21 player replay: his maxHealth fell 150 ->
  // 135, which is exactly one `curse_maxhp_perm` (-15 for the rest of the life).
  // The others are 30s slow, 20s weakened damage, 25s extra damage taken.
  //
  // So: a light steering push out of the collection ring, using the SAME geometry
  // the collector uses. Deliberately weak — it must never outrank a free punish,
  // and it never fires toward an edge.
  _avoidCurses(moveSpd) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.curseAvoid) return;
    if (typeof mapPerkState === 'undefined' || !mapPerkState || !Array.isArray(mapPerkState.items)) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0 || this.health <= 0) return;
    // Free damage beats a curse every time — never break a punish to dodge one.
    if (this._targetHelpless && this.target && this._targetHelpless(this.target)) return;
    const RING = 40;                       // collector fires at 28; steer from just outside
    const cx = this.cx(), cy = this.y + this.h / 2;
    for (const it of mapPerkState.items) {
      if (!it || it.collected || !it.type) continue;
      if (it.type.indexOf('curse_') !== 0) continue;
      const dx = cx - it.x, dy = cy - it.y;
      if (Math.hypot(dx, dy) > RING) continue;
      const out = Math.sign(dx) || (cx < GAME_W / 2 ? 1 : -1);
      if (this.isEdgeDanger(out)) continue;
      // Push out only as hard as needed to clear the ring, so he keeps fighting.
      this.vx = out * Math.max(Math.abs(this.vx), (moveSpd || 5) * 0.75);
      this._curseDodges = (this._curseDodges || 0) + 1;
      break;
    }
  }

  // ── DIAL GATES MUST SCALE WITH THE DIAL BASELINE ──────────────────────────
  // Every `effDef > 0.55`-style threshold in this class was written when the
  // dials started at 0.88-0.95. adaptV2 starts them at 0.60 and lets adaptation
  // move them, so those absolute numbers silently became unreachable.
  //
  // Measured in the 2026-09-21 player replay: his shield went from 19-24% of the
  // player's swings (five pre-adaptV2 replays) to 0.13%, and overall shield uptime
  // from 6.8-11.9% of frames to 0.47%. Cause: defense rests near 0.50 under
  // adaptV2 and the proactive-shield branch demands effDef > 0.55, so it never
  // fired once in a five-minute match. He did not "choose" to stop blocking —
  // the branch was unreachable.
  //
  // Expressed as a FRACTION of whatever baseline is in force, so this is exactly
  // a no-op when adaptV2 is off (0.88 * 0.625 = 0.55, the original constant).
  _dialGate(frac) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const base = TUNE.adaptV2 ? ((typeof TUNE.adaptV2Base === 'number') ? TUNE.adaptV2Base : 0.60) : 0.88;
    return base * frac;
  }

  // ══ OPPONENT-CONDITIONED TACTIC CHOICE ═══════════════════════════════════
  //
  // Everything he learns today changes INTENSITY, never CHOICE. `aiMemory` moves
  // four dials; `_tacticGrid` books five coarse verbs (attack/shield/super/two
  // movement keys) and has exactly two live readers. So against a turtle and
  // against a rusher he runs the identical cascade in the identical order and
  // merely presses harder or softer. That is why "he does not actually adapt"
  // keeps surviving every rework.
  //
  // This books the thing he actually chose — the named cascade branch that won
  // the frame, from the _commit vocabulary below — keyed by WHICH OPPONENT he is
  // fighting. A branch that reliably loses him health against a parry-heavy
  // opponent can then yield, and the cascade continues to whatever is next.
  //
  // Deliberately a yield and not an override: the branch that ends up running is
  // still a real branch with its own pathfinding, edge checks and hazard
  // avoidance intact. Every previous attempt at this layer wrote `vx` itself
  // after updateAI() and measured as positional harm (see
  // docs/sovereign-observations.md). Nothing here writes movement.
  _choiceOppKey() {
    if (this._oppArchetype) return this._oppArchetype;
    if (typeof SovDossier === 'undefined' || typeof this._oppRates !== 'function') return null;
    const r = this._oppRates();
    if (!r) return null;
    return (this._oppArchetype = SovDossier.archetype(r));
  }

  // Open on the frame the committed branch changes; price it when it closes.
  _commitBook(name) {
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const open = this._cmtOpen;
    if (open && (open.action !== name || _fc - open.frame >= 45)) this._commitResolve(_fc);
    if (this._cmtOpen) return;
    const t = this.target;
    const sit = this._situationKey(t);
    if (!sit) return;
    this._cmtOpen = { action: name, sit, frame: _fc, tgt: t || null,
                      hp: this.health, lives: this.lives,
                      tHp: t ? t.health : 0, tLives: t ? t.lives : 0,
                      // What he EXPECTS this to be worth, recorded before he finds
                      // out. Without a prediction there is no residual, and without
                      // a residual nothing can ever be a surprise — a mean is
                      // precisely the statistic that hides "this worked five times
                      // better than usual".
                      expect: this._choiceValue(name),
                      tLock: t ? Math.max(t.stunTimer || 0, t._parryVulnFrames || 0) : 0,
                      opp: this._choiceOppKey() || 'any' };
  }

  _commitResolve(_fc) {
    const P = this._cmtOpen;
    this._cmtOpen = null;
    if (!P) return;
    if (_fc - P.frame < 8) return;               // a one-frame flicker prices nothing
    // Priced against the booked target, not this.target — a mid-window retarget
    // would otherwise charge one opponent's decision to another's health.
    const taken = (this.lives === P.lives) ? Math.max(0, P.hp - this.health) : P.hp + 40;
    const bt = P.tgt;
    let dealt = !bt ? 0
              : (bt.lives === P.tLives) ? Math.max(0, P.tHp - bt.health) : P.tHp + 40;
    // Lockout created during the window counts as value — see the same note in
    // _resolveTactic. Without it a perfect parry books ZERO on the branch that
    // produced it, because this window (45 frames) also closes long before the
    // 90-frame stun it bought can be converted.
    if (bt && bt.lives === P.tLives) {
      const lockNow = Math.max(bt.stunTimer || 0, bt._parryVulnFrames || 0);
      if (lockNow > (P.tLock || 0) + 20) dealt += (lockNow - (P.tLock || 0)) * 0.22;
    }
    const net = dealt - taken;
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.discovery) {
      try { this._scoreSurprise(P, net, _fc); } catch (e) { /* never kill a frame */ }
    }
    const g   = this._choiceGrid || (this._choiceGrid = {});
    // Filed under this opponent AND under 'any'. The archetype is unknown for the
    // first few hundred frames (_oppRates needs behaviour to read), so filing
    // only under the archetype would throw away every booking made before he
    // worked out who he was fighting — and those are the bookings he most needs
    // while the opponent-specific cells are still empty.
    const opp = this._choiceOppKey();
    for (const k of (opp && opp !== 'any') ? [opp, 'any'] : ['any']) {
      const bo  = g[k] || (g[k] = {});
      const row = bo[P.sit] || (bo[P.sit] = {});
      const e   = row[P.action] || (row[P.action] = { tries: 0, net: 0, net2: 0 });
      e.tries++; e.net += net; e.net2 = (e.net2 || 0) + net * net;
      // Rolling decay, same reason as _tacticGrid: an answer that stopped working
      // early in the match must be able to come back.
      if (e.tries > 12) { e.tries *= 0.75; e.net *= 0.75; e.net2 *= 0.75; }
    }
  }

  // Net health per commit. Cell first, then this opponent across all situations,
  // then null. The fallback exists because splitting one statistic across nine
  // situations starved the equivalent lookup in _tacticValue badly enough to
  // regress it — he should hold the general opinion until a cell earns its own.
  _choiceValue(name) {
    const g = this._choiceGrid;
    if (!g) return null;
    const sit = this._situationKey(this.target);
    const opp = this._choiceOppKey();
    // Most specific first: this opponent in this situation, then this opponent
    // anywhere, then the general record. He specialises only where he has earned
    // the right to and holds the general opinion until then.
    for (const k of (opp && opp !== 'any') ? [opp, 'any'] : ['any']) {
      const bo = g[k];
      if (!bo) continue;
      const cell = sit && bo[sit] && bo[sit][name];
      if (cell && cell.tries >= 3) return cell.net / cell.tries;
      let tries = 0, net = 0;
      for (const s2 of Object.keys(bo)) {
        const c = bo[s2][name];
        if (c) { tries += c.tries; net += c.net; }
      }
      if (tries >= 4) return net / tries;
    }
    return null;
  }

  // ══ DISCOVERY — noticing that something worked far better than expected ═══
  //
  // Everything else he owns AVERAGES. aiMemory averages, _tacticGrid averages,
  // _choiceGrid averages. An average is the exact statistic that erases a
  // discovery: one commit worth 60 net health inside a cell whose mean is 3
  // moves that mean to 4 and is then indistinguishable from noise forever.
  //
  // So this watches the RESIDUAL instead. Every booking records what he expected
  // before he found out; on resolve, `net - expect` is how wrong he was. A large
  // positive residual is the signature of an exploit: a situation where his own
  // model badly understates what is available.
  //
  // "Large" is measured against his own noise, not a constant. _residScale is a
  // slow running mean of |residual|, so a chaotic match raises the bar and a
  // quiet one lowers it, and the detector cannot be spammed by a high-variance
  // matchup.
  _scoreSurprise(P, net, _fc) {
    const exp = P.expect;
    if (exp === null || exp === undefined) return;      // no prediction, no residual
    const resid = net - exp;
    const a = Math.abs(resid);
    this._residScale = (this._residScale === undefined) ? a
                     : this._residScale * 0.97 + a * 0.03;
    const scale = Math.max(5, this._residScale || 5);
    const TUNE  = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const k     = (typeof TUNE.discoverySigma === 'number') ? TUNE.discoverySigma : 2.5;
    if (net <= 0 || resid < scale * k) return;

    const key = P.opp + '|' + P.sit + '|' + P.action;
    const D   = this._discoveries || (this._discoveries = {});
    const d   = D[key] || (D[key] = { action: P.action, sit: P.sit, opp: P.opp,
                                      hits: 0, best: 0, mean: 0, until: 0 });
    d.hits++;
    d.best  = Math.max(d.best, net);
    d.mean += (net - d.mean) / d.hits;
    // A pursue window, not a permanent promotion. He goes back to the thing that
    // just overperformed while the opening is plausibly still there, and the
    // window lapses on its own if it stops paying.
    d.until = _fc + ((typeof TUNE.discoveryWindow === 'number') ? TUNE.discoveryWindow : 600);
    this._lastDiscovery = d;
    this._discoveryCount = (this._discoveryCount || 0) + 1;
    if (TUNE.discoveryLog && typeof console !== 'undefined') {
      console.log('[SOV DISCOVERY] ' + P.action + ' vs ' + P.opp + ' @' + P.sit +
                  '  net ' + net.toFixed(1) + ' vs expected ' + exp.toFixed(1) +
                  '  (resid ' + resid.toFixed(1) + ', scale ' + scale.toFixed(1) + ')');
    }
  }

  // The live discovery for the situation he is in right now, if any.
  _activeDiscovery() {
    const D = this._discoveries;
    if (!D) return null;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const sit = this._situationKey(this.target);
    if (!sit) return null;
    const opp = this._choiceOppKey() || 'any';
    let best = null;
    for (const k of Object.keys(D)) {
      const d = D[k];
      if (d.until <= _fc || d.sit !== sit) continue;
      if (d.opp !== opp && d.opp !== 'any') continue;
      if (!best || d.mean > best.mean) best = d;
    }
    return best;
  }

  // ── INTERVENTION: paying health to settle a question ──────────────────────
  // Correlation is all the above can ever produce, because he only observes
  // fights that happen TO him. `sync_0_3`, `opp_tier_equal` and `opp_swinging`
  // co-occur, and nothing that merely watches can say which does the work.
  // Separating co-occurring causes requires INTERVENTION — deliberately produce
  // the case instead of waiting for it.
  //
  // That needs a reason to spend health on something other than winning, which is
  // the one thing no ledger here could express. So it gets an explicit budget:
  // a few experiments per life, only while healthy, only on a hypothesis that is
  // still under-sampled, never while a free punish is available. The cost is
  // real — roughly half these exchanges end with him eating the hit — and that
  // is the point. Knowledge is not free and he now pays for it.
  _wantsExperiment(t) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.infer || !TUNE.experiment) return false;
    if (!t || t.health <= 0 || this.health <= 0) return false;
    if (this.health / Math.max(1, this.maxHealth) < 0.45) return false;  // never while it could cost a stock
    if (this._targetHelpless(t)) return false;                           // free damage outranks curiosity
    const budget = (typeof TUNE.experimentBudget === 'number') ? TUNE.experimentBudget : 3;
    if ((this._expUsed || 0) >= budget) return false;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    if (_fc - (this._expLast || -999) < 240) return false;               // spaced out
    const S = this._infStats;
    const cell = S && S.pair && S.pair['sync_0_3 & opp_tier_equal'];
    if (cell && cell.n >= 25) return false;                              // already answered
    if ((t.attackTimer || 0) <= 0) return false;
    const tS = t._attackStartFrame || 0;
    if (!tS || _fc - tS > 2) return false;                               // must still be simultaneous
    const reach = (this.weapon && this.weapon.range) || 90;
    const d = Math.abs(t.cx() - this.cx());
    if (d > reach || Math.abs(t.cy() - this.cy()) > 55) return false;
    if ((this.cooldown || 0) > 0 || (this.attackTimer || 0) > 0) return false;
    return true;
  }

  // ── SECOND QUESTION: given that it failed, why did I ALSO get hurt? ───────
  // _inferRules asks "what predicts my attack failing", and both outcomes of a
  // simultaneous exchange are failures — a mutual cancel and losing the ordinary
  // first-wins race look identical to it. The thing that separates them is
  // whether he ALSO took damage, so that has to be its own question with its own
  // base rate: among failures, what raises the chance he got hurt too?
  //
  // This is where the self-constructed history features earn their place. If a
  // hidden streak or cooldown governs whether the cancel fires, then "this same
  // pattern happened again recently" should predict getting hurt, and nothing in
  // the observable feature set can.
  _inferHurtRules(includePairs) {
    const S = this._infStats;
    if (!S || S.miss < 10) return [];
    const base = (() => {
      let h = 0;
      for (const k of Object.keys(S.feat)) { /* base comes from the whole sample */ }
      return S.missHit !== undefined ? S.missHit / S.miss : null;
    })();
    // Base computed from the aggregate counters kept alongside the features.
    const bh = (S.missHitTotal || 0) / Math.max(1, S.miss);
    const src = includePairs ? Object.assign({}, S.feat, S.pair || {}) : S.feat;
    const out = [];
    for (const k of Object.keys(src)) {
      const e = src[k];
      if (e.miss < 5) continue;
      const rate = e.missHit / e.miss;
      const lift = bh > 0.001 ? rate / bh : (rate > 0 ? 99 : 0);
      if (lift < 1.25 && lift > 0.8) continue;      // keep strong effects BOTH ways
      out.push({ when: k, failures: e.miss, hurtRate: +rate.toFixed(2),
                 baseHurt: +bh.toFixed(2), lift: +lift.toFixed(2),
                 reads: rate > bh ? 'THEIRS LANDS — mine broke' : 'CLEAN CANCEL — neither lands' });
    }
    return out.sort((a, b) => Math.abs(b.lift - 1) - Math.abs(a.lift - 1));
  }

  // ══ NOT-KNOWING, AND WHY IT HAS TO COST SOMETHING ════════════════════════
  //
  // Every ledger in this class stored sums: { tries, net }. A cell with 3 samples
  // and a cell with 300 were indistinguishable — both just had a mean. With no
  // variance there is no uncertainty, and with no uncertainty there is nothing to
  // be curious ABOUT. That is the mechanical reason he never investigated
  // anything: not unwillingness, but the absence of any quantity that could go up
  // when he learned something.
  //
  // So: keep the sum of squares and report a standard error, then treat an
  // UNDER-SAMPLED action optimistically — mean + k*stderr instead of mean. An
  // action he does not understand gets the benefit of the doubt and therefore
  // gets tried, and trying it is the only thing that collapses the uncertainty.
  // Smallest honest implementation of "wanting to find out": not-knowing now has
  // a cost, so resolving it has value.
  _choiceStderr(name) {
    const g = this._choiceGrid;
    if (!g) return null;
    const sit = this._situationKey(this.target);
    const opp = this._choiceOppKey();
    for (const k of (opp && opp !== 'any') ? [opp, 'any'] : ['any']) {
      const bo = g[k]; if (!bo) continue;
      const c = sit && bo[sit] && bo[sit][name];
      if (!c || c.tries < 2) continue;
      const m = c.net / c.tries;
      const v = Math.max(0, (c.net2 || 0) / c.tries - m * m);
      return Math.sqrt(v / c.tries);
    }
    return null;
  }

  // How many times has he actually tried this here? Zero is not "bad", it is
  // "unknown", and the two must never score the same.
  _choiceTries(name) {
    const g = this._choiceGrid;
    if (!g) return 0;
    const sit = this._situationKey(this.target);
    const opp = this._choiceOppKey();
    let n = 0;
    for (const k of (opp && opp !== 'any') ? [opp, 'any'] : ['any']) {
      const bo = g[k]; if (!bo) continue;
      const c = sit && bo[sit] && bo[sit][name];
      if (c) n = Math.max(n, c.tries);
    }
    return n;
  }

  // Should this branch be allowed to win the frame? False lets the cascade
  // continue past it. Called from the guard so a branch with side effects is
  // never run just to be discarded.
  _preferCommit(name) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.tacticChoice) return true;
    // A live discovery outranks the ledger. Never yield the tactic that just
    // overperformed, and step aside for it when a different branch holds the
    // window — this is the only way a LATER cascade branch can ever win a frame,
    // since the cascade is a fixed preference order and nothing here is allowed
    // to write vx itself.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.discovery) {
      const d = this._activeDiscovery();
      if (d) {
        if (d.action === name) return true;
        const yieldP = (typeof SMK2_TUNE.discoveryYield === 'number') ? SMK2_TUNE.discoveryYield : 0.6;
        if (Math.random() < yieldP) { this._discoveryYields = (this._discoveryYields || 0) + 1; return false; }
      }
    }
    const v = this._choiceValue(name);
    if (v === null) return true;                 // no evidence: cascade order stands
    // OPTIMISM: judge an action by the best it could plausibly be, not by the
    // average of a handful of samples. Wide error bars survive the gate and get
    // tried again, which is the only way error bars ever narrow. With curiosity
    // off this reduces exactly to the old mean comparison.
    let vOpt = v;
    if (TUNE.curiosity) {
      const se = this._choiceStderr(name);
      const k  = (typeof TUNE.curiosityK === 'number') ? TUNE.curiosityK : 1.0;
      const n  = this._choiceTries(name);
      // Thin cells get an explicit unknown-bonus on top: a stderr computed from
      // two samples badly understates how little he actually knows.
      const thin = n < 5 ? (5 - n) * 1.6 : 0;
      vOpt = v + (se === null ? 0 : k * se) + thin;
    }
    const denyAt = (typeof TUNE.choiceDenyAt === 'number') ? TUNE.choiceDenyAt : -2;
    if (vOpt >= denyAt) return true;
    // Never close the door completely, or a tactic that dipped once can never
    // prove itself again and the ledger freezes at its first impression.
    const ex = (typeof TUNE.choiceExplore === 'number') ? TUNE.choiceExplore : 0.15;
    if (Math.random() < ex) return true;
    this._choiceSkips = (this._choiceSkips || 0) + 1;
    return false;
  }

  // ── ACTION VOCABULARY ───────────────────────────────────────
  // Every terminal branch of updateAI() below names itself here on the frame it
  // wins the cascade. Today this only counts — it is deliberately inert, so the
  // marked cascade is behaviour-identical to the unmarked one. It exists because
  // the cascade IS already a policy (a hardcoded, integer-valued preference
  // order), and naming its branches is the prerequisite for ever scoring them:
  // you cannot learn a preference over actions that have no names.
  //
  // Read it with window.sovCommitLog() / window.sovCommitReset().
  _commit(name) {
    this._lastCommit = name;
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.tacticChoice) {
      try { this._commitBook(name); } catch (e) { /* bookkeeping must never kill a frame */ }
    }
    const log = this._commitLog || (this._commitLog = Object.create(null));
    log[name] = (log[name] || 0) + 1;
    this._commitTotal = (this._commitTotal || 0) + 1;
    // Also accumulate page-wide. The per-instance log dies with the instance, and
    // the headless harnesses build fresh fighters per match outside players[],
    // so a session-level tally is the only one that survives a multi-match run.
    const g = (typeof window !== 'undefined')
      ? (window.SOV_COMMIT_LOG || (window.SOV_COMMIT_LOG = Object.create(null))) : null;
    if (g) g[name] = (g[name] || 0) + 1;
  }

  // OVERRIDE: updateAI() — full enhanced AI loop
  // ══════════════════════════════════════════════════════════════
  //
  // Thin wrapper so a habit-driven veto can see the cascade's decision AFTER it
  // commits but BEFORE Fighter.update()'s physics integrates vy into y this same
  // frame (Fighter.update calls updateAI() before the gravity/position step —
  // see js/smb-fighter.js around the `this.updateAI()` call site). That means a
  // launch decided this frame can be cancelled outright, with none of the
  // next-frame-restore plumbing _vetoExtraJump needs (that one runs from
  // update(), which is called AFTER updateAI() already wrote vy for the frame).
  updateAI() {
    this._updateAICascade();
    this._habitGate();
    this._descentControl();
  }

  // ── C1: posture avoidance (habit engine phase 1) ─────────────────────────
  // The measured leak (docs/sovereign-adaptive-project.md, 2026-09-23): 54% of
  // 794 human openers landed while he was airborne, and it never changed within
  // or across matches. This is the single scoped counter for it, built exactly
  // like _vetoExtraJump: one choke point, one narrow question, safety-exempt.
  //
  // It does not decide whether to jump — the cascade already did that, for
  // reasons (recovery, escape, a real air-approach plan) this gate has no
  // business overriding. It only asks, on a fresh ground->air launch toward a
  // player at engagement range: has THIS opponent historically punished being
  // airborne against them harder than staying grounded? If yes, more often than
  // not, cancel — he keeps his vx and stands.
  // ── KILL-FLOOR GOVERNOR (docs/sovereign-adaptive-project.md) ─────────────
  // A disclosed safety net, NOT intelligence. Measured 2026-09-23 against a human
  // proxy calibrated to the player's replays: he took >=7 of 10 stocks in only
  // ~60% of matches, and every adaptive counter moved kills by <= 0.2. The
  // player's stated floor is 7 kills. So when the player pulls ahead on stocks —
  // or his remaining stocks run short of the kills he still needs — his damage
  // eases up toward 1 + SMK2_TUNE.killFloor, and eases back when he recovers.
  // 0 / false = off. Damage only: movement, decisions and rules stay identical.
  _killFloorGovernor() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const G = +TUNE.killFloor || 0;
    const t = this.target;
    if (!(G > 0) || !t || this.isBoss) {
      if (this._kfMult !== undefined) { this._kfMult = undefined; this.dmgMult = undefined; }
      return;
    }
    // Stock baselines per match: first sight of this target, and the lives each
    // side had then. A new target object (new match) re-baselines.
    if (this._kfTarget !== t) {
      this._kfTarget = t;
      this._kfMyStart = this.lives;
      this._kfTheirStart = t.lives;
    }
    if (!(this._kfMyStart > 0) || !(this._kfTheirStart > 0) || this._kfTheirStart >= 50) return; // infinite-lives modes
    const myLost = Math.max(0, this._kfMyStart - this.lives);
    const theirLost = Math.max(0, this._kfTheirStart - t.lives);
    const needTotal = Math.ceil(this._kfTheirStart * 0.7);
    const need = Math.max(0, needTotal - theirLost);          // kills still owed to the floor
    const myLeft = Math.max(1, this.lives);
    const deficit = myLost - theirLost;                        // >0: the player is ahead
    let g = Math.max(0, Math.min(1, (deficit - 1) / 3));
    if (need > 0) g = Math.max(g, Math.max(0, Math.min(1, (need - myLeft + 2) / 3)));
    const goal = 1 + G * g;
    const cur = (this._kfMult === undefined) ? 1 : this._kfMult;
    this._kfMult = cur + Math.max(-0.01, Math.min(0.01, goal - cur));   // ~1% per frame
    this.dmgMult = this._kfMult;
  }

  // Once per match, ~1.5 s in, against a HUMAN he has a record on: say the
  // strongest thing the persisted habit record (SovHabits) says about them. This
  // is how a returning player learns he was studied — including from their
  // fights with other enemies, which the game loop scouts for him.
  _habitDossierLine() {
    if (this._dossierLineDone) return;
    const t = this.target;
    if (!t || t.isAI !== false || typeof SovHabits === 'undefined' || typeof SMK2_DOSSIER_LINES === 'undefined') return;
    this._dossierLineFrames = (this._dossierLineFrames || 0) + 1;
    if (this._dossierLineFrames < 90) return;
    this._dossierLineDone = true;
    let pool = null;
    try {
      const rec = SovHabits.get(SovHabits.keyFor(t));
      const d = rec.descent && rec.descent.default;
      const dn = d ? (d.win + d.loss + d.none) : 0;
      const P = rec.postures || {};
      const rate = p => (p && p.exp > 0) ? p.taken / p.exp : 0;
      const expAll = Object.values(P).reduce((a, p) => a + ((p && p.exp) || 0), 0);
      if (dn >= 10 && d.loss / dn >= 0.35) pool = SMK2_DOSSIER_LINES.descent;
      else if (P.air && P.air.exp >= 3600 && rate(P.air) >= 2 * Math.max(1e-6, rate(P.ground))) pool = SMK2_DOSSIER_LINES.air;
      else if (expAll >= 7200) pool = SMK2_DOSSIER_LINES.watched;
    } catch (e) { pool = null; }
    if (pool && typeof showBossDialogue === 'function') {
      showBossDialogue(pool[Math.floor(Math.random() * pool.length)], 200);
    }
  }

  _habitGate() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.habitAir === false) return;
    if (typeof SovHabits === 'undefined') return;
    if (this.health <= 0) return;
    // Only a FRESH launch: onGround here is last frame's resolved physics state
    // (updateAI runs before this frame's gravity/position step), so grounded
    // now + a strong upward vy means the cascade just decided to jump this frame.
    if (!this.onGround) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0 || (this._landLag || 0) > 0) return;
    if (!(this.vy <= -8)) return;

    const t = this.target;
    if (!t || t.health <= 0) return;
    const dx = Math.abs(t.cx() - this.cx());
    if (dx > 220) return;
    // A target STANDING more than 60px above him is platform pursuit — that
    // belongs to _airApproachGuard, and refusing it just hands a camper the high
    // ground. A target that is merely AIRBORNE above him is different: they have
    // to come down, so chasing them up is optional and is priced here.
    // Measured 2026-09-23 (tools/sov-air-sources.js vs the human proxy):
    // elevation_pursuit launches were 46% of his airtime and 35% of the openers
    // he took — the single biggest source of the air leak, and it was exempt.
    const tAir = !t.onGround;
    const above = this.cy() - t.cy();
    if (above > 60 && !tAir) return;
    if (above > 260) return;

    // Reflex/escape/safety branches keep their jump untouched. Matched against
    // the full `_commit(` name list in this file (see the comment above _commit).
    const name = this._lastCommit || '';
    if (/^(danger_|volley_defense|recover|hop_steer|floor_hazard|domain_hazard|area_threat|rapid_hit_escape|sov_escape|wall_safety)/.test(name)
        || /void|ringout/i.test(name)) return;
    if (name === 'elevation_pursuit' && !tAir) return;

    const stats = this._habitStats || (this._habitStats = { seen: 0, vetoed: 0, passed: 0 });
    stats.seen++;
    const G = (typeof window !== 'undefined')
      ? (window.SOV_HABIT_LOG || (window.SOV_HABIT_LOG = { seen: 0, vetoed: 0, passed: 0 })) : null;
    if (G) G.seen++;

    // Always let a slice through so the 'air' estimate keeps getting data —
    // otherwise a correct early veto starves the very evidence that justifies it.
    if (Math.random() < 0.12) { stats.passed++; if (G) G.passed++; return; }

    const key = SovHabits.keyFor(t);
    const airV = SovHabits.postureValue(key, 'air', true);
    const groundV = SovHabits.postureValue(key, 'ground', true);
    if (airV < groundV) {
      this.vy = 0;              // cancel: stays grounded, keeps his vx
      stats.vetoed++;
      if (G) G.vetoed++;
      if (!this._habitAirLineSaid && typeof showBossDialogue === 'function' && (this._habitLineCd || 0) <= 0) {
        this._habitAirLineSaid = true;
        this._habitLineCd = 300;
        showBossDialogue(SMK2_HABIT_AIR_LINES[Math.floor(Math.random() * SMK2_HABIT_AIR_LINES.length)], 140);
      }
    } else {
      stats.passed++;
      if (G) G.passed++;
    }
    if (this._habitLineCd > 0) this._habitLineCd--;
  }

  // ── C2: descent control (habit engine phase 2) ───────────────────────────
  // The measured leak (docs/sovereign-adaptive-project.md, "C2 design: descent
  // control"): 30% of every opener the player lands comes from ONE moment —
  // him floating down into range with no attack out. C1 (don't take off at
  // all) couldn't fix this because it removed his BEST moment (swinging in
  // the air) along with his worst one. This is scoped to the worst moment
  // only: once per airborne stint, on the first frame he is descending near
  // an alive target with nothing committed, gamble over a fixed set of
  // counters instead of always falling the same way. Runs after _habitGate()
  // in updateAI() so a stint C1 vetoed never reaches here (this.onGround is
  // still true), and before this frame's physics integration, same as C1.
  _descentControl() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.habitDescent === false) return;
    if (typeof SovHabits === 'undefined') return;
    if (this.health <= 0) return;
    const frame = (typeof frameCount !== 'undefined') ? frameCount : 0;

    if (this.onGround) this._descentStintFired = false;

    // Ongoing effect for whichever arm is pending, applied every frame he is
    // still airborne for that stint (independent of when the outcome resolves —
    // resolution can run on after he's landed, waiting out the 45-frame window).
    const pend = this._descentPending;
    if (pend && !this.onGround && pend.target) {
      if (pend.arm === 'dive') {
        const FF = (typeof FAST_FALL_VY === 'number') ? FAST_FALL_VY : 13;
        if (this.vy < FF) this.vy = FF;
      } else if (pend.arm === 'strike' && !pend.swung && pend.target.health > 0) {
        // TIMED strike: chosen as the descent starts, thrown the moment he comes
        // into reach on the way down — the same timing the player uses against
        // him. First version offered strike only if he was ALREADY in reach on
        // the first falling frame, which was true 0.4% of the time.
        const dx = pend.target.cx() - this.cx();
        const reach = (typeof this._meleeReachDist === 'function') ? this._meleeReachDist(pend.target) : 60;
        if ((this.cooldown || 0) <= 0 && Math.abs(dx) <= reach + 10 && !((this.attackTimer || 0) > 0)) {
          this.facing = dx >= 0 ? 1 : -1;
          this.attack(pend.target);
          if ((this.attackTimer || 0) > 0) pend.swung = true;
        }
      } else if (pend.arm === 'drift' && pend.target.health > 0) {
        const dx = pend.target.cx() - this.cx();
        const desired = pend.desiredGap || 90;
        if (Math.abs(dx) < desired) {
          const away = dx >= 0 ? -1 : 1;
          if (!this.isEdgeDanger(away)) this.vx = away * 5.5;
        }
      }
    }

    this._descentResolve(frame);
    if (this._descentPending) return;   // still waiting on an outcome
    if (this.onGround) return;
    if (this._descentStintFired) return;
    if (!(this.vy > 0)) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    if ((this.attackTimer || 0) > 0) return;

    const t = this.target;
    if (!t || t.health <= 0) return;
    const dx = Math.abs(t.cx() - this.cx());
    if (dx > 140) return;
    const above = this.cy() - t.cy();
    if (above > 40) return;

    // Same reflex/escape/safety exemption C1 uses — this gate never overrides
    // a branch that was already handling danger.
    const name = this._lastCommit || '';
    if (/^(danger_|volley_defense|recover|hop_steer|floor_hazard|domain_hazard|area_threat|rapid_hit_escape|sov_escape|wall_safety)/.test(name)
        || /void|ringout/i.test(name)) return;

    this._descentStintFired = true;
    this._chooseDescentArm(t, frame);
  }

  _chooseDescentArm(t, frame) {
    const key = SovHabits.keyFor(t);
    const dx = t.cx() - this.cx();
    const reach = (typeof this._meleeReachDist === 'function') ? this._meleeReachDist(t) : 60;

    const avail = ['default', 'dive'];
    // Timed strike needs only a weapon that will be ready in time; the swing
    // itself waits for reach (see the per-frame block in _descentControl).
    if ((this.cooldown || 0) <= 12) avail.push('strike');
    const awayDir = dx >= 0 ? -1 : 1;
    if (typeof this.isEdgeDanger !== 'function' || !this.isEdgeDanger(awayDir)) avail.push('drift');

    let arm = SovHabits.descentArm(key, avail);


    if (typeof window !== 'undefined') {
      const L = window.SOV_DESCENT_LOG || (window.SOV_DESCENT_LOG = {});
      const a = L[arm] || (L[arm] = { chosen: 0, win: 0, loss: 0, none: 0 });
      a.chosen++;
    }

    if (arm !== 'default' && !this._descentLineSaid) {
      const rec = SovHabits.get(key);
      const lossCount = (rec.descent && rec.descent.default) ? rec.descent.default.loss : 0;
      if (lossCount >= 3 && (this._habitLineCd || 0) <= 0 && typeof showBossDialogue === 'function') {
        this._descentLineSaid = true;
        this._habitLineCd = 300;
        showBossDialogue(SMK2_HABIT_DESCENT_LINES[Math.floor(Math.random() * SMK2_HABIT_DESCENT_LINES.length)], 140);
      }
    }

    this._descentPending = {
      key, arm, target: t, frame,
      selfHpPrev: this.health, tHpPrev: t.health,
      dealtAcc: 0, takenAcc: 0,
      desiredGap: reach + 25,
    };
  }

  // Resolves the pending decision as soon as either side opens (first hit
  // either way since the decision), on death, or after 45 frames with
  // neither — mirrors "who opens first" from the moment-level replay study.
  _descentResolve(frame) {
    const pend = this._descentPending;
    if (!pend) return;
    const t = pend.target;

    const selfDelta = pend.selfHpPrev - this.health;
    const tDelta = t ? (pend.tHpPrev - t.health) : 0;
    pend.selfHpPrev = this.health;
    if (t) pend.tHpPrev = t.health;

    let outcome = null;
    if (tDelta > 0.01) { pend.dealtAcc += tDelta; outcome = 'win'; }
    else if (selfDelta > 0.01) { pend.takenAcc += selfDelta; outcome = 'loss'; }
    else if (this.health <= 0 || (t && t.health <= 0)) outcome = 'none';
    else if (frame - pend.frame >= 45) outcome = 'none';

    if (!outcome) return;

    SovHabits.descentRecord(pend.key, pend.arm, outcome, pend.dealtAcc - pend.takenAcc);
    if (typeof window !== 'undefined') {
      const L = window.SOV_DESCENT_LOG || (window.SOV_DESCENT_LOG = {});
      const a = L[pend.arm] || (L[pend.arm] = { chosen: 0, win: 0, loss: 0, none: 0 });
      a[outcome]++;
    }
    this._descentPending = null;
  }

  _updateAICascade() {
    // PERCEPTION RUNS BEFORE THE ACT GATE. Everything below the aiReact check is
    // skipped while Sovereign is mid-reaction, which silently meant he stopped
    // OBSERVING during exactly the windows he was being punished in — measured:
    // only 1 of 3 unexplained hits got attributed to the ability press that caused
    // them, because the presses landed on skipped frames. Watching is not acting.
    // TARGETING RUNS BEFORE PERCEPTION, for the same reason perception runs
    // before the act gate: observation must be attributed to the fighter he is
    // actually engaging, and both must keep working while he is mid-reaction or
    // his only opponent has just died.
    this._updateThreatLedger();
    this._updateTargetSelection();
    this._ensureMatchLoadout();

    this._observeAlways();

    // Inherited guard checks
    if (this.aiReact > 0) { this.aiReact--; return; }
    if (this.ragdollTimer > 0 || this.stunTimer > 0) return;

    const t = this.target;
    if (!t || t.health <= 0) return;

    // ── DEATH RECORD — apply counter strategy learned from the previous life ────────────
    // Processed before spawn-protect so the counter lock is active on frame 1 of new life.
    if (this._deathRecord) {
      const _rec = this._deathRecord;
      this._deathRecord = null;
      // 1st+ death: no warmup — limiter breaks immediately
      if (this._deathCount >= 1 && !this._limiterBroken) {
        this._triggerLimiterBreak('death_escalation');
      }
      // Lock the counter strategy that directly counters what killed us
      if (_rec.isRanged) {
        this._lockedCounterStrategy = 'intercept';
      } else if (_rec.isHeavy) {
        this._lockedCounterStrategy = 'parry';
      } else if (_rec.lastAction === 'jump') {
        this._lockedCounterStrategy = 'anti-air';
      } else if (_rec.lastAction === 'shield') {
        this._lockedCounterStrategy = 'guard-break';
      } else {
        this._lockedCounterStrategy = 'pressure';
      }
      this._adaptLockTimer = this._genome.adaptLockDuration; // hold long enough to punish repeat patterns
      if (_rec.comboDepth >= 2 && !this._punishModeActive) this._activatePunishMode('revenge');
      if (this._fearLineCd <= 0) {
        showBossDialogue(SMK2_LIMITER_LINES[Math.floor(Math.random() * SMK2_LIMITER_LINES.length)], 200);
        this._fearLineCd = 200;
      }
    }

    // ── POST-SPAWN PROTECTION ─────────────────────────────────────
    // Immediately jump AWAY from the player so a waiting hammer swing misses.
    // Counts down; Sovereign fights normally once the window expires.
    if (this._spawnDefendTimer > 0) {
      this._spawnDefendTimer--;
      // No threat nearby — skip the escape entirely. A panic jump with the player
      // across the map is a free read: the arc is identical every respawn, and a
      // thrown hammer at its apex ragdolls Sovereign into the void corner.
      const _spawnThreat = Math.abs(this.cx() - t.cx()) < 260;
      if (!_spawnThreat) { this._spawnDefendTimer = 0; }
      else if (this.onGround && !this._spawnDefendJumped) {
        this._spawnDefendJumped = true;
        const _awayDir   = this.cx() < t.cx() ? -1 : 1;
        // Fallback toward CENTER, not toward player — prevents spawn-jumping into own edge
        const _centerDir = this.cx() < GAME_W / 2 ? 1 : -1;
        // On an elevated platform, jumping launches Sovereign above the arena into
        // hazard/projectile range — drop-step toward center instead of jumping.
        const _floorPl   = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms)
          ? currentArena.platforms.find(p => p.isFloor) : null;
        const _onMainFloor = !_floorPl || (this.y + this.h >= _floorPl.y - 12);
        if (!this.isEdgeDanger(_awayDir)) this.vx = _awayDir * 5.5;
        else this.vx = _centerDir * 4.0;
        if (_onMainFloor) this.vy = -16;
      }
      if (this._spawnDefendTimer > 0) { this.aiReact = 0; return; }
    }

    // ── OFF-STAGE RECOVERY — never ride a knockback into the void ───────
    // Airborne beyond the floor platform's span: steer back hard and burn the
    // double jump. Runs before all combat logic so no other state overrides it.
    if (!this.onGround && typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const _rfl = currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
      if (_rfl) {
        const _rL = _rfl.x + 30, _rR = _rfl.x + _rfl.w - 30;
        if ((this.cx() < _rL || this.cx() > _rR) && this.vy > -4) {
          const _backDir = this.cx() < _rL ? 1 : -1;
          this.vx = _backDir * 7;
          // ── The recovery jump is for RECOVERING, and only for that ──────────
          // This block used to ask one question — "am I horizontally outside the
          // floor span and falling?" — and jump on a yes. Above the stage the
          // answer is yes too, and up there it is the wrong question: gravity is
          // already returning him and the inward steer above is doing the work.
          //
          // Instrumented in a live match, this single line was the whole "he
          // learned to fly" bug. Off the side of the deck he jumps; leaving the
          // ground with vy <= -5 refills canDoubleJump (smb-fighter.js:1517,
          // which refills for ALL entities); on any arena with platforms outside
          // the floor span he clips one on the way up, which refills it again —
          // and the condition is still true, so he jumps again. He laddered up
          // the outer clouds and left the top of the screen at y = -164. What the
          // player sees is three jumps in a row and a Sovereign who beat gravity.
          //
          // Two bounds fix it. He must actually be at or below the deck — the
          // state recovery exists for — and he gets a budget per airborne stint,
          // because platform contact can refill the double jump faster than one
          // fall. Note the vx steer above is deliberately left unbounded: steering
          // back toward the stage is always correct and never gains height.
          const _belowDeck = (this.y + this.h) > (_rfl.y - 8);
          if (this.canDoubleJump && this.vy > 5 && _belowDeck &&
              (this._recoverJumps || 0) < 2) {
            this._recoverJumps = (this._recoverJumps || 0) + 1;
            this.vy = -15; this.canDoubleJump = false;
          }
          this.aiReact = 0;
          this._commit('recover_jump_abort');
          return;
        }
      }
    }

    // ── HOP STEERING: mid-air guidance onto a climb platform ─────────────
    // Set by the elevation-contest block; keeps Sovereign tracking the platform
    // center through the whole jump instead of drifting off after takeoff.
    if (this._hopFrames > 0 && this._hopTarget) {
      this._hopFrames--;
      const _hp  = this._hopTarget;
      const _hdx = (_hp.x + _hp.w / 2) - this.cx();
      if (!this.onGround) {
        this.vx = Math.sign(_hdx) * Math.min(6, Math.abs(_hdx) / 8 + 1.2);
        // Burn the double jump if the arc is falling short of the ledge
        if (this.canDoubleJump && this.vy > 2 && this.y > _hp.y - 24) {
          this.vy = -15; this.canDoubleJump = false;
        }
        this.aiReact = 0;
        this._commit('hop_steer');
        return;
      }
      // Grounded again (landed on the platform or fell back) — release the hop
      if (this._hopFrames < 36) { this._hopTarget = null; this._hopFrames = 0; }
    } else if (this._hopTarget) {
      this._hopTarget = null;
    }

    if (this._bmActivePunish && typeof frameCount !== 'undefined' &&
        frameCount >= this._bmActivePunish.checkFrame) {
      const ap = this._bmActivePunish;
      this._bmActivePunish = null;
      const target = this.target;
      if (target) this._behaviorModel.recordPunish(ap.route, target.health < ap.hpSnap - 1, ap);
    }

    const m = this.aiMemory;
    const weapon = this._getCombatWeapon();
    const weaponRange = weapon.range || 90;

    // ── Pattern tracking ─────────────────────────────────────
    const playerAttacking = t.attackTimer > 0;
    if (playerAttacking && !this._prevPlayerAttacking) this._recordEvent('player_attack', 0);
    this._prevPlayerAttacking = playerAttacking;
    const playerAirborne = !t.onGround;
    if (playerAirborne && !this._prevPlayerAirborne) this._recordEvent('player_jump', 0);
    this._prevPlayerAirborne = playerAirborne;

    // ── Observation window ───────────────────────────────────
    // Sovereign must observe for at least 180 frames (~3 sec) and see
    // at least 6 non-idle player actions before adapting.
    this._observationFrames++;

    // Match-scope strategic read (damage sources, range profitability, persistent
    // habits). Separate from the counters below because those are wiped on every
    // target switch by _applyOppProfile — this ledger must outlive that.
    this._strategicObserve(t, Math.abs(t.cx() - this.cx()));

    // ── Opponent observation for the dossier ─────────────────────────────────
    // Cheap per-tick counters that feed _oppRates()/_oppAdaptTerms(). Kept here
    // rather than in the habit tracker because they are FRAME shares (how much of
    // the fight the opponent spent airborne / in his face), not action counts.
    // FRAME shares, not action tags. The habit tracker's counts are the obvious
    // source and they are unusable for this: measured across whole fights it
    // logged 9-26 non-idle actions total, `shield` was identically zero, and the
    // resulting rates swung 0.11-0.55 between two runs of the SAME opponent. A
    // classifier built on ~12 samples is a random number generator. These counters
    // sample every frame, so a 30-second read carries ~1800 observations.
    this._oppObsFrames = (this._oppObsFrames || 0) + 1;
    if (!t.onGround)        this._oppAirFrames    = (this._oppAirFrames    || 0) + 1;
    if (t.attackTimer > 0)  this._oppAtkFrames    = (this._oppAtkFrames    || 0) + 1;
    if (t.shielding)        this._oppShieldFrames = (this._oppShieldFrames || 0) + 1;
    // Fighter has NO dodge/roll timer — evasion is expressed as movement, so the
    // obvious `t.dodgeTimer > 0` would have been silently zero forever. The honest
    // measure is retreating while HE is committed to a swing: that is a read on
    // him, not just walking.
    if (this.attackTimer > 0 && Math.abs(t.vx) > 1.2 &&
        Math.sign(t.cx() - this.cx()) === Math.sign(t.vx)) {
      this._oppDodgeFrames = (this._oppDodgeFrames || 0) + 1;
    }
    {
      const _dx = Math.abs(t.cx() - this.cx());
      if (_dx < 150) this._oppCloseFrames = (this._oppCloseFrames || 0) + 1;
      this._oppDistSum = (this._oppDistSum || 0) + _dx;
      // Closing INTENT: which way is the opponent's own velocity pointing? This is
      // what separates a rusher from a zoner — not the gap itself, which Sovereign
      // controls by chasing.
      //
      // The first version gated on `|t.vx| > |this.vx| * 0.8` and compared frame-
      // to-frame distance, which measured almost nothing: he is the faster fighter
      // by design, so the gate failed on most frames and a puppet scripted to
      // charge him every single frame registered approach on only 8.6% of them
      // (and retreat on 7.4% — indistinguishable). Reading the sign of THEIR
      // velocity against THEIR bearing to him is independent of his own movement,
      // which is the whole point.
      if (Math.abs(t.vx) > 0.4) {
        if (Math.sign(t.vx) === Math.sign(this.cx() - t.cx())) this._oppApproachFrames = (this._oppApproachFrames || 0) + 1;
        else                                                   this._oppRetreatFrames  = (this._oppRetreatFrames  || 0) + 1;
      }
    }

    // Re-seed once the archetype read is real. The seed at target acquisition
    // happens on frame 1, when _oppRates() has nothing and every opponent
    // classifies as 'mixed' — so the behavioural half of the fingerprint is
    // guaranteed wrong at exactly the moment it is first used. Re-run it when
    // enough has been seen to classify honestly, and again if the read later
    // CHANGES: a player who switches from zoning to rushing is a different
    // opponent as far as anything he has learned is concerned.
    // ── Seed on the FIRST observed frame, not only on a target switch ─────────
    // _seedFromDossier used to be reachable only from _switchTarget(), and in the
    // 1v1 he is actually fought in that never fires: the fighter already has a
    // target when the match starts, so _updateTargetSelection() finds `best ===
    // cur` and returns before switching. Measured end to end, recall was 0.00 in
    // every rematch and the archetype was still null 60 frames in — the dossier
    // was being WRITTEN correctly and never once READ. The kit key needs no
    // observation, so the opening recall can happen immediately; the behavioural
    // half arrives at 180 frames when there is something real to classify.
    if (this._oppObsFrames === 1)   { try { this._seedFromDossier(t, true); } catch (e) {} }
    if (this._oppObsFrames === 180) { try { this._seedFromDossier(t); } catch (e) {} }
    else if (this._oppObsFrames > 180 && this._oppObsFrames % 300 === 0) {
      const _prevArch = this._oppArchetype;
      try { this._dossierKeys(t); } catch (e) {}
      if (this._oppArchetype !== _prevArch) { try { this._seedFromDossier(t); } catch (e) {} }
    }
    if (typeof SovDossier !== 'undefined') SovDossier.tick();
    if (this._oppObsFrames > 0 && this._oppObsFrames % 600 === 0) { try { this._commitMech(); } catch (e) {} }

    // ── OPENING WEAPON PRIOR — read weapon class on frame 1 and lock a counter ──
    // Fires once per match; skipped when a death record is already active (that takes priority).
    if (!this._openingPriorApplied && !this._deathRecord && this._adaptLockTimer <= 0) {
      this._openingPriorApplied = true;
      const _owType = t.weapon ? t.weapon.type : '';
      const _owKb   = t.weapon ? (t.weapon.kb   || 0) : 0;
      const _owDmg  = t.weapon ? (t.weapon.damage || 0) : 0;
      if (_owType === 'ranged' || _owType === 'magic') {
        this._lockedCounterStrategy = 'intercept';
        this._adaptLockTimer        = 180;
        this._pressureMode          = 'suffocate';
      } else if (_owKb >= 16 || (t.weapon && t.weapon.weaponType === 'heavy') || _owDmg >= 22) {
        // weaponType (light/heavy) is the heavy flag — weapon.type is only ever
        // melee/ranged/magic, so the old `type === 'heavy'` check silently missed
        // hammer (kb 16), axe, and frying pan: exactly the launch-chain weapons
        // that bled stocks in the opening minute before adaptation converged.
        this._lockedCounterStrategy = 'parry';
        this._adaptLockTimer        = 180;
      } else if (t.weaponKey === 'shield' || t.charClass === 'knight') {
        this._lockedCounterStrategy = 'guard-break';
        this._adaptLockTimer        = 180;
      } else {
        this._lockedCounterStrategy = 'pressure';
        this._adaptLockTimer        = 120;
        this._pressureMode          = 'suffocate';
      }
    }

    // ── BehaviorModel observe — the single prediction brain ──────────────
    // Parent updateAI() is bypassed in this override, so we drive the richer
    // per-context bigram model manually and compute its prediction up front:
    // _bmPred now feeds Sovereign's own prediction shim (_updatePrediction),
    // so there is one source of truth for "what will the player do next".
    const _bmObs  = this._behaviorModel.observe(t, this._bmPrevSnap);
    this._bmPrevSnap = { onGround: t.onGround, vx: t.vx, vy: t.vy };
    const _bmPred = this._behaviorModel.predictNext(_bmObs.action, _bmObs.context);

    // ── Swing-confirm tracker ────────────────────────────────────────────
    // _strike() reports that a swing STARTED, not that it connected, so a combo
    // string used to spend its follow-up hits on air. Replay-measured, this is
    // Sovereign's real weakness: 155 swings for 1385 damage (8.94/swing) against
    // a human's 119 for 1562 (13.13/swing) at an almost identical hit rate — a
    // conversion gap, not a decision gap. A live HP drop is the ground truth for
    // "that landed", so it gates whether a string earns the right to continue.
    this._comboLandedLast = (t.health < this._comboPrevTgtHp - 0.5);
    this._comboPrevTgtHp  = t.health;
    // Reset the extension budget whenever no string is running — covers every
    // site that starts one without having to patch each individually.
    if (this._comboFollowHits === 0) this._comboExtensions = 0;

    // ── A. Action tracking + prediction (sourced from the BehaviorModel) ──
    const currentAction = _smk2ClassifyAction(t, this._prevT2state);
    if (currentAction !== 'idle') {
      this._actionSampleCount++;
      this._recordActionBigram(currentAction);
      this._updatePrediction(_bmPred);
    }
    this._updateHabitTracker(currentAction, t);
    this._checkPredictionCorrect(t, currentAction);
    this._prevT2state = { attacking: t.attackTimer > 0, onGround: t.onGround, shielding: t.shielding, vx: t.vx };

    const _bmBias = this._behaviorModel.computeBias(_bmObs.action, _bmPred);
    const _bmRead  = this._behaviorModel.summarizeOpponent(_bmObs.action, _bmPred);
    const _memoryState = (typeof SovereignAdaptiveMemory !== 'undefined' &&
      SovereignAdaptiveMemory && typeof SovereignAdaptiveMemory.observe === 'function')
      ? SovereignAdaptiveMemory.observe(this, {
          target: t,
          currentAction,
          bmObs: _bmObs,
          bmPred: _bmPred,
          bmRead: _bmRead,
        })
      : null;
    if (_memoryState) {
      this._adaptiveMemoryState  = _memoryState;
    }

    // ── B. Spam/punishment tracking (very short gate — Sovereign reads fast) ──
    if (this._observationFrames >= 4 && this._actionSampleCount >= 1) {
      this._updateSpamTracker(currentAction);
    }

    // ── D. Anti-exploit tracking ─────────────────────────────
    this._updateAntiExploit(t);
    this._updateSpatialProfile(t);   // platform + zone + post-KB tracking
    this._runPlateControl(t);        // The Circuit: act on that read by moving the stage
    this._updateEvolutionState();

    // Whiff window carry-over
    const playerJustWhiffed = this._prevPlayerAtk > 0 && t.attackTimer === 0;
    this._prevPlayerAtk = t.attackTimer;
    if (playerJustWhiffed) this._counterWindowOpen = true;
    // Arm endlag window when attack animation ends — attack during this bounded window bypasses telegraph
    if (playerJustWhiffed) this._endlagWindow = t.weapon ? (t.weapon.endlag || 8) : 8;
    if (this._endlagWindow > 0) this._endlagWindow--;
    if (this._baitCooldown > 0) this._baitCooldown--;
    if (this._comboFollowTimer > 0) this._comboFollowTimer--;
    if (this._adaptivePunishTimer > 0) this._adaptivePunishTimer--;
    if (this._jumpCooldown > 0) this._jumpCooldown--;
    if (this._postHitLockFrames > 0) this._postHitLockFrames--;
    if (this._commitToChaseFrames > 0) this._commitToChaseFrames--;
    if (this._predictionBoostFrames > 0) this._predictionBoostFrames--;

    // ── Micro-adaptation ─────────────────────────────────────
    const recentTaken  = this._countRecent('dmg_taken',    90);
    const recentLanded = this._countRecent('hit_landed',   90);
    const recentPAtks  = this._countRecent('player_attack', 150);
    const recentPJumps = this._countRecent('player_jump',   150);
    const microDef = recentTaken  >= 2 ? 0.32 : recentTaken  >= 1 ? 0.16 : 0;
    const microAgg = recentLanded >= 2 ? 0.22 : recentLanded >= 1 ? 0.11 : 0;
    const memoryAgg = _memoryState ? (_memoryState.aggressionBias || 0) : 0;
    const memoryDef = _memoryState ? (_memoryState.defenseBias || 0) : 0;
    const memorySpacing = _memoryState ? (_memoryState.spacingShift || 0) : 0;
    const memoryReact = _memoryState ? (_memoryState.reactionBoost || 0) : 0;
    const memoryDodge = _memoryState ? (_memoryState.dodgeBias || 1) : 1;
    const memoryBait  = _memoryState ? (_memoryState.baitBias || 1) : 1;
    const memoryShield = _memoryState ? (_memoryState.shieldBias || 0) : 0;
    const memoryLocalWeight = _memoryState ? (_memoryState.localWeight || 0) : 0;
    const memoryGlobalWeight = _memoryState ? (_memoryState.globalWeight || 0) : 0;
    const memoryOpening = _memoryState ? (_memoryState.openingStyle || 'balanced') : 'balanced';
    const memoryPressure = _memoryState ? (0.10 + memoryLocalWeight * 0.30 + memoryGlobalWeight * 0.18) : 0;
    const effAgg = Math.min(1, m.aggression + microAgg + memoryAgg + memoryPressure * 0.55);
    const effDef = Math.min(1, m.defense    + microDef + memoryDef + memoryPressure * 0.65);
    // DIAL TRANSMISSION PROBE (SMK2_TUNE.dialProbe). The question these answer:
    // an aiMemory dial is one addend in a clamped sum, so how much of a change in
    // the DIAL survives into the value the fighter actually uses? Stashed rather
    // than logged — these are hot-path locals sampled every decision.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE.dialProbe) {
      const P = this._dialProbe || (this._dialProbe = { n: 0, effAgg: 0, effDef: 0, aggClamped: 0, defClamped: 0 });
      P.n++; P.effAgg += effAgg; P.effDef += effDef;
      if (effAgg >= 0.999) P.aggClamped++;
      if (effDef >= 0.999) P.defClamped++;
      // Per-addend budget: what each contributor actually puts into the sum, so
      // the channel can be apportioned instead of guessed at.
      // Time course: dial value bucketed by 300-frame (5s) slice, so "does it
      // converge, and how fast" is answerable instead of inferable from a mean.
      const _SLW = (typeof SMK2_TUNE.dialProbeSlice === 'number') ? SMK2_TUNE.dialProbeSlice : 300;
      const _sl = Math.min(59, Math.floor(((typeof frameCount !== 'undefined') ? frameCount : 0) / _SLW));
      P.slice = P.slice || [];
      const _S = P.slice[_sl] || (P.slice[_sl] = { n: 0, agg: 0, def: 0, spc: 0, rct: 0 });
      _S.n++; _S.agg += m.aggression; _S.def += m.defense; _S.spc += m.spacing; _S.rct += m.reactionSpeed;
      P.a_dial = (P.a_dial || 0) + m.aggression;
      P.a_micro = (P.a_micro || 0) + microAgg;
      P.a_mem = (P.a_mem || 0) + memoryAgg;
      P.a_press = (P.a_press || 0) + memoryPressure * 0.55;
      P.a_raw = (P.a_raw || 0) + (m.aggression + microAgg + memoryAgg + memoryPressure * 0.55);
      P.d_dial = (P.d_dial || 0) + m.defense;
      P.d_micro = (P.d_micro || 0) + microDef;
      P.d_mem = (P.d_mem || 0) + memoryDef;
      P.d_press = (P.d_press || 0) + memoryPressure * 0.65;
      P.d_raw = (P.d_raw || 0) + (m.defense + microDef + memoryDef + memoryPressure * 0.65);
    }

    // State-based aggression: pull back when low HP, surge when player is vulnerable.
    const hpPct      = this.health / Math.max(1, this.maxHealth);
    const tHpPct     = t.health   / Math.max(1, t.maxHealth);
    const lowHPMode  = hpPct < 0.30;   // defensive below 30% HP
    const finishPush = tHpPct < 0.25;  // surge when player is near death
    const GAROU_FLOOR = lowHPMode ? 0.42 : 0.70; // reduced floor when defensive
    const evoAgg      = this._evolutionStage * 0.05 + this._intimidation * 0.06;
    const memoryPressureShift = _memoryState
      ? ((memoryOpening === 'defensive' ? 0.08 : 0) +
         (memoryOpening === 'edge' ? 0.10 : 0) +
         (memoryOpening === 'aggressive' ? 0.06 : 0) +
         (memoryLocalWeight > 0.24 ? 0.05 : 0) +
         (memoryGlobalWeight > 0.30 ? 0.03 : 0))
      : 0;
    const rawAgg      = Math.min(1, effAgg + evoAgg);
    const realAgg     = finishPush
      ? Math.min(1.0, rawAgg + 0.15 + memoryPressureShift)   // extra aggression when player is nearly dead
      : Math.max(GAROU_FLOOR, rawAgg + memoryPressureShift * 0.5);

    // ── C. Limiter Break flags ────────────────────────────────
    // lbSpd / lbAtk removed: Sovereign must not exceed player stat caps.
    // Limiter Break now only unlocks aggressive DECISION patterns, not raw numbers.
    const lb       = this._limiterBroken;
    const lbCombo  = lb ? 1    : 0;   // one extra follow-up (was 2); bounded by dealDamage combo limiter

    // Limiter break stagger: DISABLED (unbeatable tuning). Getting combo'd no
    // longer grants the player a slowed-reaction window — the RAPID-HIT ESCAPE
    // below is the response to being chained, not a donated opening.
    if (this._limiterStaggerCd > 0) this._limiterStaggerCd--;
    if (this._limiterStaggerTimer > 0) {
      this._limiterStaggerTimer--;
      // Stagger window just closed — immediately arm a punish counter
      if (this._limiterStaggerTimer === 0 && this._punishTimer === 0) {
        this._punishTimer = 1;
        showBossDialogue('My turn.', 70);
      }
    }

    // ── E. Humanized parameters ───────────────────────────────
    // moveSpd capped to player normal base (5.2).  pressureMul removed from speed —
    // intimidation affects decision-making, not movement stat.
    const meleeWeapon = !!(t.weapon && t.weapon.type === 'melee');
    const heavyWeapon = !!(t.weapon && (t.weapon.kb >= 18 || t.weapon.weaponType === 'heavy'));
    const heavyThreat = meleeWeapon || heavyWeapon || this._heavyThreatCd > 0 || !!(_memoryState && _memoryState.meleeThreat);
    if (meleeWeapon || heavyWeapon) this._heavyThreatCd = Math.max(this._heavyThreatCd, 120);
    else if (this._heavyThreatCd > 0) this._heavyThreatCd--;

    const threatSpacing = heavyThreat ? 30 : 0;
    const thorSpacing   = (t.weaponKey === 'hammer' || t.charClass === 'thor') ? 40 : 0;
    const openerAggroBias = _memoryState ? (
      memoryOpening === 'aggressive' ? -18 :
      memoryOpening === 'edge' ? -22 :
      memoryOpening === 'defensive' ? -14 : 0
    ) : 0;
    // ── Data-driven spacing factors ───────────────────────────────────────
    const weaponDmg    = t.weapon ? (t.weapon.damage || 0) : 0;
    const dmgThreat    = weaponDmg >= 25 ? 20 : weaponDmg >= 20 ? 10 : 0;
    const speedDanger  = Math.round(((t.classSpeedMult || 1.0) - 1.0) * 60); // Ninja +14, Paladin -7
    const superCharging = Math.round((t.superMeter || 0) * this._genome.superChargeWeight); // ramps 0→(weight*100)px as meter fills
    const rageBuff     = (t._powerBuff > 0) ? 25 : 0;
    const livesDisadv  = Math.max(0, (t.lives || 0) - (this.lives || 0));
    const livesAdv     = Math.max(0, (this.lives || 0) - (t.lives || 0));
    const livesSpacing = livesDisadv >= 2 ? livesDisadv * 5 : (livesAdv >= 2 ? -livesAdv * 4 : 0);
    let prefDist      = Math.max(10, this._genome.prefDistBase + m.spacing * 60 - this._intimidation * 22 - this._evolutionStage * 5 + threatSpacing + thorSpacing + memorySpacing * 80 + openerAggroBias + superCharging + dmgThreat + speedDanger + rageBuff + livesSpacing);
    // Advisor spacing bias (±26px max) — a nudge on the engagement band, not a
    // takeover. Added before the EMA below so it smooths in like every other input.
    prefDist += (this._advisorSpacing || 0);
    // (prefDist is already tuned via threatSpacing — no additional floor needed)
    // Smoothed spacing target: several inputs above (threatSpacing, dmgThreat,
    // superCharging…) flip with per-frame player state; raw, they jump prefDist
    // 40–80px between frames and strobe the approach/retreat branches into
    // visible left-right jitter. ~12-frame EMA keeps reads responsive without
    // the band teleporting every frame.
    if (this._prefDistEMA === undefined) this._prefDistEMA = prefDist;
    this._prefDistEMA += (prefDist - this._prefDistEMA) * 0.15;
    prefDist = this._prefDistEMA;
    const moveSpd     = Math.min(6.5, this._genome.moveSpdBase + realAgg * 1.5 + memoryReact * 0.25);  // faster than player base (6.5 vs 5.2)
    const atkFreq     = 1.0; // god-tier: always at max attack frequency
    // Unbeatable tuning: no artificial minimum gap — Sovereign thinks every frame
    // his reaction stats allow. (Was a 2-frame floor donated as a read window.)
    const reactFrames = Math.max(0, Math.round(4 - m.reactionSpeed * 3 - memoryReact * 3));
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE.dialProbe) {
      const P = this._dialProbe || (this._dialProbe = { n: 0, effAgg: 0, effDef: 0, aggClamped: 0, defClamped: 0 });
      P.rn = (P.rn || 0) + 1;
      P.react = (P.react || 0) + reactFrames;
      P.reactZero = (P.reactZero || 0) + (reactFrames === 0 ? 1 : 0);
      P.pref = (P.pref || 0) + prefDist;
      P.r_dial = (P.r_dial || 0) + m.reactionSpeed * 3;
      P.r_mem  = (P.r_mem  || 0) + memoryReact * 3;
      P.r_raw  = (P.r_raw  || 0) + (4 - m.reactionSpeed * 3 - memoryReact * 3);
      // prefDist budget — absolute contribution of each addend, so a term that
      // swings +-40px is not hidden by one that is merely large and constant.
      P.p_base   = (P.p_base   || 0) + this._genome.prefDistBase;
      P.p_dial   = (P.p_dial   || 0) + m.spacing * 60;
      P.p_intim  = (P.p_intim  || 0) + (-this._intimidation * 22);
      P.p_evo    = (P.p_evo    || 0) + (-this._evolutionStage * 5);
      P.p_threat = (P.p_threat || 0) + threatSpacing;
      P.p_thor   = (P.p_thor   || 0) + thorSpacing;
      P.p_mem    = (P.p_mem    || 0) + memorySpacing * 80;
      P.p_opener = (P.p_opener || 0) + openerAggroBias;
      P.p_super  = (P.p_super  || 0) + superCharging;
      P.p_dmg    = (P.p_dmg    || 0) + dmgThreat;
      P.p_speed  = (P.p_speed  || 0) + speedDanger;
      P.p_rage   = (P.p_rage   || 0) + rageBuff;
      P.p_lives  = (P.p_lives  || 0) + livesSpacing;
    }
    const atkRange    = weaponRange * (1.1 + this._intimidation * 0.08) + 20;

    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = Math.sign(dx);

    // (unexplained-damage learning now lives in _observeAlways, above the act gate)

    // ── Ability / super observation ───────────────────────────────
    // Rising-edge detect: ability fired when cooldown was 0 and is now > 0.
    // Super fired when superReady flips true → false (consumed).
    const _tAbilityCd  = t.abilityCooldown || 0;
    const _tSuperReady = !!t.superReady;
    if (this._prevTAbilityCd === 0 && _tAbilityCd > 0) {
      this._behaviorModel.logAbilityUse({
        dist: d, healthPct: t.health / Math.max(1, t.maxHealth),
        attacking: t.attackTimer > 0, comboDepth: this._countRecent('player_attack', 60),
      });
    }
    if (this._prevTSuperReady && !_tSuperReady) {
      this._behaviorModel.logSuperUse({
        dist: d, healthPct: t.health / Math.max(1, t.maxHealth),
        comboDepth: this._countRecent('player_attack', 60), attacking: t.attackTimer > 0,
      });
      this._recordEvent('player_super', 2);
    }
    this._prevTAbilityCd  = _tAbilityCd;
    this._prevTSuperReady = _tSuperReady;
    if (--this._profileUpdateCd <= 0) {
      this._profileUpdateCd = 90;
      this._superProfile   = this._behaviorModel.getSuperProfile();
      this._abilityProfile = this._behaviorModel.getAbilityProfile();
      // Fire a one-shot "I have your pattern" line when the profile first resolves.
      // This is the Garou moment — the player should feel the AI name what it learned.
      if (!this._profileSaidSuper && this._superProfile !== 'unknown' && typeof showBossDialogue === 'function') {
        this._profileSaidSuper = true;
        const _spl = {
          healer:   SMK2_PROFILE_SUPER_HEALER,
          finisher: SMK2_PROFILE_SUPER_FINISHER,
          opener:   SMK2_PROFILE_SUPER_OPENER,
          dump:     SMK2_PROFILE_SUPER_DUMP,
        }[this._superProfile];
        if (_spl) showBossDialogue(_spl[Math.floor(Math.random() * _spl.length)], 220);
      }
      if (!this._profileSaidAbility && this._abilityProfile !== 'unknown' && typeof showBossDialogue === 'function') {
        this._profileSaidAbility = true;
        const _apl = {
          poke:   SMK2_PROFILE_ABILITY_POKE,
          combo:  SMK2_PROFILE_ABILITY_COMBO,
          closer: SMK2_PROFILE_ABILITY_CLOSER,
        }[this._abilityProfile];
        if (_apl && this._profileSaidSuper) {
          // Stagger: ability read fires 3 seconds after super read so they don't overlap
          const _self = this;
          setTimeout(() => {
            if (typeof showBossDialogue === 'function') showBossDialogue(_apl[Math.floor(Math.random() * _apl.length)], 200);
          }, 3000);
        } else if (_apl) {
          showBossDialogue(_apl[Math.floor(Math.random() * _apl.length)], 200);
        }
      }
    }

    this._updateIntimidation(t, d);
    this._updatePressureState(t, d);
    this._updateCornerPressure(t, d);  // edge herding pressure accumulator
    const memoryForceSuffocate = !!(_memoryState && (
      memoryOpening === 'defensive' ||
      memoryOpening === 'edge' ||
      _memoryState.meleeThreat ||
      memoryLocalWeight > 0.28 ||
      memoryGlobalWeight > 0.38
    ));
    if (heavyThreat || memoryForceSuffocate) this._pressureMode = 'suffocate';
    // Clip-weapon read: a ranged player on their last round is about to hand over
    // a full reload window (reloadFrames × 1.18, no shooting). Also point-blank
    // range costs them +35% cooldown and -34% damage. Close NOW, ahead of the
    // reload, so the free window starts with Sovereign already in reach.
    if (t.weapon && t.weapon.clipSize && (t._ammo || 0) <= 1) {
      this._pressureMode      = 'suffocate';
      this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 40);
    }

    // ── Humanization fakeout movement ─────────────────────────
    this._updateHumanization(dir, moveSpd);
    if (this._humanFakeoutTimer > 0) {
      this.aiReact = reactFrames;
      this._commit('fakeout'); return; // fakeout frame — skip normal logic
    }

    // ── Danger: beams ─────────────────────────────────────────
    if (typeof bossBeams !== 'undefined' && bossBeams && bossBeams.length) {
      for (const beam of bossBeams) {
        if (beam.done) continue;
        if (Math.abs(beam.x - this.cx()) < 50) {
          const fd = this.cx() < beam.x ? -1 : 1;
          if (!this.isEdgeDanger(fd)) this.vx = fd * 8;
          if (this.onGround) this.vy = -18;
          this._commit('danger_beam');
          return;
        }
      }
    }

    // ── Danger: lava ──────────────────────────────────────────
    if (currentArena && currentArena.hasLava && currentArena.lavaY) {
      if ((currentArena.lavaY - (this.y + this.h)) < 80 && this.onGround) {
        this.vx = this.cx() < GAME_W / 2 ? 6 : -6;
        this.vy = -18;
        this._commit('danger_lava_air');
        return;
      }
    }

    const nearLeft  = this.x < 50;
    const nearRight = this.x + this.w > GAME_W - 50;

    // Arena-aware jump force — prevents over/under-jumping in low/heavy gravity arenas
    const _jumpVy = (() => {
      if (typeof currentArena !== 'undefined' && currentArena) {
        if (currentArena.isLowGravity)   return -14;
        if (currentArena.isHeavyGravity) return -22;
        if (currentArena.earthPhysics)   return -21;
      }
      return -19;
    })();

    if (this._runVoidRecovery(t, dir, moveSpd, _jumpVy)) {
      this.aiReact = 0;
      this._updateFearFactor(d, recentLanded, true);
      this._commit('danger_lava_ground');
      return;
    }

    // ── LETHAL VOLLEY DEFENSE — outranks everything except staying on stage ──
    // A ramped homing-crescent fan is a one-volley stock loss; no punish window
    // or pressure plan is worth contesting it (replay-proven loss pattern).
    if (this._runVolleyDefense(t, d, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
      this._commit('volley_defense_a');
      return;
    }

    // Telegraphed sky strikes and lingering zones — same priority tier as the
    // volley read: no punish window is worth eating a 4-bolt AoE super.
    if (this._runTelegraphedEvasion(t, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
      this._commit('volley_defense_b');
      return;
    }

    // Learned evasion of a threat he has never been able to see. Runs last of the
    // three so anything actually perceptible is answered precisely first; this is
    // the fallback for the unknown, and it is the only one that covers a weapon
    // shipped after this code was written.
    if (this._runBlindEvasion(t, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
      this._commit('volley_defense_c');
      return;
    }

    // ── VOLLEY-CYCLE TIMING vs a ramped crescent thrower ─────────────────────
    // Armed: hold outside the point-blank blast radius (a fresh fan there is
    // unreactable) and stay dodge-primed. Spent: the ~2.5s cooldown is a safe
    // all-in window — convert it like a punish.
    // Patience valve: a thrower who HOLDS the armed volley forever cannot be
    // allowed to freeze Sovereign into permanent standoff. After ~10s of armed
    // passivity, engage anyway for a stretch (shield stays reserved for the
    // point-blank throw) before resuming the standoff.
    const _vPosture = this._volleyCyclePosture(t);
    if (this._volleyStandoffFrames === undefined) { this._volleyStandoffFrames = 0; this._volleyEngageFrames = 0; }
    if (_vPosture !== 'standoff') this._volleyStandoffFrames = 0;
    if (this._volleyEngageFrames > 0) this._volleyEngageFrames--;
    if (_vPosture === 'standoff' && !this._targetHelpless(t) && this._volleyEngageFrames <= 0) {
      if (++this._volleyStandoffFrames > 600) {
        this._volleyStandoffFrames = 0;
        this._volleyEngageFrames   = 400; // engage window — falls through to normal play
      } else {
        if (d < (this._volleyStandoffR || 185)) {
          // Cornered against our own wall: relocate — jump over the thrower toward
          // center. Fighting near the floor edge is what converts a capped-KB
          // launch into a ring-out while ragdolled (the one remaining death mode).
          const _soCornered = (nearLeft && dir > 0) || (nearRight && dir < 0) ||
                              this.x < 90 || this.x + this.w > GAME_W - 90;
          const _soDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
          if (_soCornered && d < (this._volleyStandoffR || 185) * 0.8 &&
              this.shieldCooldown === 0 && this._shieldHoldFrames === 0) {
            // Cornered INSIDE the burst radius: a leap doesn't clear a radial
            // point-blank AoE (frying pan's pound is a center-distance check —
            // airborne within 150px still eats it). Shield through the burst.
            this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 14;
          } else if (_soCornered && this.onGround && !playerAttacking) {
            const _cDir = this.cx() < GAME_W / 2 ? 1 : -1;
            this.vy = _jumpVy; this.vx = _cDir * moveSpd * 1.6; // leap to center ground
          } else if (!this.isEdgeDanger(_soDir)) {
            this.vx = _soDir * moveSpd * 1.5;
          } else {
            this.vx *= 0.6;
            if (playerAttacking && d < 130 && this.shieldCooldown === 0 && this._shieldHoldFrames === 0) { this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 10; }
          }
          this.aiReact = 0;
          this._commit('volley_cycle_a');
          return;
        }
        // At range while armed: drift centerward, never parked on a floor edge.
        if (this.x < 120 || this.x + this.w > GAME_W - 120) {
          const _cDir = this.cx() < GAME_W / 2 ? 1 : -1;
          if (!this.isEdgeDanger(_cDir)) this.vx = _cDir * moveSpd * 0.9;
        } else this.vx *= 0.7;
        this.aiReact = 0;
        this._commit('volley_cycle_b');
        return;
      }
    }
    if (_vPosture === 'window') {
      // Fan is spent — free approach for the cooldown's duration.
      this._pressureMode      = 'suffocate';
      this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 30);
      if (this._punishTimer === 0 && d > weaponRange + 10) this._punishTimer = 2; // sprint-convert
    }

    // ── PRIORITY DESCENT — drop to a target fighting a full level below ──────
    // Standing on a platform directly over a floor-level opponent, Sovereign read
    // itself as "in range" horizontally, swung down into the solid deck (vertical
    // whiff-gate vetoes it), and never moved — a dead freeze. Walk off toward the
    // target (or to the nearest edge when already above it) and fall to its level.
    //
    // The `t.onGround` term was too narrow. It reads as "target is standing a
    // level below", but the Creator spends most of the fight airborne — jumping,
    // hovering, mid-attack — so against a boss the gate almost never opened.
    // Measured over a live Creator refight: 60% of Sovereign's attack() calls were
    // silently vetoed by the whiff-guard's vertical gate, 58% of them with a solid
    // platform between him and the boss, in unbroken per-frame runs at a vertical
    // gap of 250px. The whiff-guard returns WITHOUT consuming the cooldown, so
    // there is no self-correcting pressure: he just re-swings at nothing forever.
    // What actually matters is the geometry — he is on a deck, the target is a
    // level below it — and that is true whether or not the target's feet are down.
    if (t.y > this.y + 55 && this.onGround &&
        typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const _cpi2 = this._findCurrentPlatform(this);
      const _cp2  = _cpi2 >= 0 ? currentArena.platforms[_cpi2] : null;
      if (_cp2 && !_cp2.isFloor) {
        // Drop off the edge on the target's side. Basing this on the target vs the
        // platform CENTER (not vs Sovereign's own x) keeps the direction stable —
        // deciding relative to our own position flipped every time we crossed over
        // the target, so Sovereign vibrated in place and never left the deck.
        const _dropDir = t.cx() <= (_cp2.x + _cp2.w / 2) ? -1 : 1;
        if (!this.isEdgeDanger(_dropDir)) { this.vx = _dropDir * moveSpd; this.aiReact = 0; return; }
      }
    }

    // ── PRIORITY AIR DESCENT — stop swinging at a target far below ───────────
    // `d` in this function is Math.abs(dx) — HORIZONTAL distance only. Every
    // range test in the class ("d < atkRange", "d < weaponRange + 12", ~40 of
    // them) therefore reads a target 250px straight down as "in range" and swings.
    // Fighter.attack()'s whiff-guard catches it and returns without consuming the
    // cooldown, which means there is nothing to break the loop: the same decision
    // is retaken and re-vetoed every single frame. In a measured Creator refight
    // that produced unbroken per-frame runs of futile swings at a vertical gap of
    // 245-284px, with a platform in between, while the boss took no damage.
    //
    // The grounded case is handled by PRIORITY DESCENT above, which walks off the
    // deck. This is its airborne counterpart: commit to falling to the target's
    // level and steer toward it, rather than flailing on the way down. Bounded by
    // the same 55px gap the descent block uses, so ordinary above/below scuffles
    // and anti-air are untouched.
    // The `vy > -2` term is deliberately NOT the whole gate. Re-measured after the
    // first pass, 100% of the vetoed swings had the boss BELOW him, and the gap in
    // each run grew monotonically (-173 → -413) — he was still RISING through the
    // arc, swinging downward the whole way up. Gating on "already falling" left
    // exactly the frames that matter uncovered. So: while the gap is merely
    // awkward, wait until the arc turns over; once it is unrecoverable, kill the
    // climb and commit down. Every hazard scan runs earlier in this function and
    // returns, so a jump that exists to dodge something has already taken its
    // frame before this can override it.
    if (!this.onGround && t.y > this.y + 55 && (this.vy > -2 || t.y > this.y + 120)) {
      // …but never dive into nothing. During a floor hazard the target can be
      // BELOW the deleted deck (the boss is airborne over the void), and a
      // fast-fall toward it is a ring-out, not a punish. Only commit the descent
      // when something down there will actually catch us.
      let _catch = false;
      if (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
        const _fx = this.cx();
        for (const pl of currentArena.platforms) {
          if (!pl || pl.isFloorDisabled) continue;
          if (pl.y <= this.y + this.h) continue;                 // must be below us
          if (_fx > pl.x - 30 && _fx < pl.x + pl.w + 30) { _catch = true; break; }
        }
      }
      if (_catch) {
        this.vx = dir * moveSpd * 0.9;
        this.vy = Math.max(this.vy, 8);   // fast-fall to their level
        this.aiReact = 0;
        this._commit('air_descent');
        return;
      }
    }

    // ── PRIORITY ELEVATION PURSUIT — climb to a platform-camping player ──────
    // The combat modes below (force, punish, rate-counters) only jump for an
    // AIRBORNE target, so a player standing on a platform above left Sovereign
    // pacing the floor beneath them: the whiff-guard vetoes its ground swings
    // (vertical gap > 60) while every ground-level punish it does land eats the
    // whiff penalty. This was the dominant loss pattern. Contest the height
    // FIRST — before any mode can commit. Platforms are solid from below, so a
    // straight-up jump only bonks the deck's underside; instead walk out past
    // the nearest edge, then jump inward onto the deck (hop-steering guides the
    // arc). Suppress attacks until level, where the blade actually connects.
    // Not gated on _jumpCooldown: a leftover cooldown from the previous hop would
    // otherwise disable the block right after landing and let other movement walk
    // Sovereign off the stepping platform before the next stage can fire. The
    // onGround + precise stand-point requirements already prevent jump spam.
    //
    // `t.onGround` was dropped here for the same reason it was dropped from
    // PRIORITY DESCENT: the Creator is airborne most of the fight, so against a
    // boss the gate never opened and he simply could not climb — he paced the deck
    // below while the boss sat above him. When the target has no platform of its
    // own (airborne), aim for the highest reachable deck under it instead, which
    // is where it will come down and is the right staging post either way.
    if (this.onGround &&
        t.y < this.y - 55 && !this._hopTarget && d < 340 &&
        typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const _tpi = this._findCurrentPlatform(t);
      let  _tp   = _tpi >= 0 ? currentArena.platforms[_tpi] : null;
      if (!_tp) {
        // Airborne target: the deck it is above, i.e. the highest non-floor
        // platform spanning its x that still sits below it.
        const _tfeet = t.y + t.h;
        for (const p of currentArena.platforms) {
          if (!p || p.isFloor || p.isFloorDisabled) continue;
          if (t.cx() < p.x - 40 || t.cx() > p.x + p.w + 40) continue;
          if (p.y < _tfeet - 30) continue;                       // above the target
          if (!_tp || p.y < _tp.y) _tp = p;                      // highest such deck
        }
      }
      if (_tp && !_tp.isFloor) {
        // One jump only lifts the feet ~150px, so a tall deck can't be reached
        // directly — stage upward one reachable platform at a time. This jump's
        // target is the HIGHEST platform we can actually reach that still climbs
        // toward the camper (the camper's own deck when it's within a jump). Each
        // landing re-runs this block and continues the ascent.
        const _feet  = this.y + this.h;
        const _reach = 285; // single jump (~150px) plus the double-jump extension
        let _step = null;
        if (_tp.y >= _feet - _reach - 4) {
          _step = _tp; // camper's own deck is within a single jump — go straight for it
        } else {
          // Too high — stage via the highest reachable platform between us and the
          // camper, biased toward the camper's horizontal position on near-ties.
          const _tpcx = _tp.x + _tp.w / 2;
          let _bestY = 1e9, _bestDx = 1e9;
          for (const p of currentArena.platforms) {
            if (!p || p.isFloor || p.isFloorDisabled || p === _tp) continue;
            if (p.y >= _feet - 12)        continue;  // must be above us
            if (p.y < _tp.y - 4)          continue;  // don't overshoot past the camper
            if (p.y < _feet - _reach - 4) continue;  // too high for a single jump
            const _pdx = Math.abs((p.x + p.w / 2) - _tpcx);
            if (p.y < _bestY - 8 || (Math.abs(p.y - _bestY) <= 8 && _pdx < _bestDx)) {
              _bestY = p.y; _bestDx = _pdx; _step = p;
            }
          }
          if (!_step) _step = _tp; // nothing staged — attempt the camper deck directly
        }
        const _svcx    = this.cx();
        const _useLeft = Math.abs(_svcx - _step.x) <= Math.abs(_svcx - (_step.x + _step.w));
        // Stand point fully OUTSIDE the deck's horizontal span — the whole body
        // (spans [x, x+w]) must clear the solid underside before the jump, or the
        // trailing half bonks the deck and the climb stalls.
        const _clearMrg = this.w + 16;
        let _standX     = _useLeft ? _step.x - _clearMrg : _step.x + _step.w + _clearMrg;
        // Keep the stand point on the surface we're currently on — when staging up
        // from a small platform the ideal point lies out in the gap; standing at
        // our own edge and jumping across (hop-steering carries us) reaches the
        // next deck without walking off into the void.
        const _cpi = this._findCurrentPlatform(this);
        if (_cpi >= 0) {
          const _cp = currentArena.platforms[_cpi];
          if (!_cp.isFloor) {
            const _hb = this.w / 2 + 2;
            _standX = Math.max(_cp.x + _hb, Math.min(_cp.x + _cp.w - _hb, _standX));
          }
        }
        const _toStand  = _standX - _svcx;
        if (Math.abs(_toStand) > 16) {
          // Walk to the edge stand-point before committing the jump. Decelerate on
          // approach so momentum doesn't carry us off a narrow stepping platform.
          const _sdir = Math.sign(_toStand);
          const _apSpd = Math.min(moveSpd, Math.abs(_toStand) * 0.35 + 1.5);
          if (!this.isEdgeDanger(_sdir)) { this.vx = _sdir * _apSpd; this.aiReact = 0; return; }
        } else {
          // Fully clear of the underside — jump inward and drift onto the deck.
          const _inward = _useLeft ? 1 : -1;
          this.vy = _jumpVy;
          this.vx = _inward * moveSpd * 0.75;
          this._jumpCooldown = 12;
          this._hopTarget = _step;
          this._hopFrames = 40;
          this.aiReact = 0;
          this._commit('elevation_pursuit');
          return;
        }
      }
    }

    // ── SECOND ATTACKER GUARD ──────────────────────────────────────────────
    // Every defensive read in this class is keyed on `this.target`:
    // `playerAttacking` is literally `t.attackTimer > 0`. So a boss minion walking
    // up behind him while he is locked onto the boss is invisible to his shield,
    // his counter windows and his evade — it swings for free, forever, and no
    // amount of retargeting tuning fixes that because turning to face the minion
    // is usually the WRONG call in a boss fight.
    //
    // So: keep the target, but stop being blind. Anything hostile that is inside
    // its own reach and mid-swing gets the guard up. Defence only — no counter is
    // launched from here, because the counter machinery below aims at `t` and
    // would fire at the wrong body.
    if (this._shieldHoldFrames <= 0 && (this.stunTimer || 0) <= 0 &&
        (this.ragdollTimer || 0) <= 0 && this.attackTimer <= 0) {
      const _others = [...(Array.isArray(players) ? players : []),
                       ...(typeof minions !== 'undefined' && Array.isArray(minions) ? minions : [])];
      for (const o of _others) {
        if (!o || o === this || o === t || o.health <= 0) continue;
        if (typeof areAlliedEntities === 'function' && areAlliedEntities(this, o)) continue;
        if ((o.attackTimer || 0) <= 0) continue;
        const _reach = (o.weapon && o.weapon.range ? o.weapon.range : 80) + 26;
        if (Math.hypot(o.cx() - this.cx(), o.cy() - this.cy()) > _reach) continue;
        if (Math.random() < this._reactionMistakeRate()) break;   // he is not perfect
        this._startTacticalShield(14);
        break;
      }
    }

    // ── PERIPHERAL PUNISH ──────────────────────────────────────────────────
    // The guard above is defence only, and defence alone still lets a summon farm
    // him: it shields the swing, the summon backs off, swings again, forever. A
    // second body has to be answerable, not just survivable.
    //
    // The rule is deliberately narrow so it splits attention rather than losing
    // it. He swings at an off-target attacker ONLY in the window where doing so
    // costs him nothing against `t`: his primary is out of his own reach, so the
    // swing he is holding has no better home this frame. Whoever is standing on
    // him eats it. `this.target` is never reassigned here — the duel continues on
    // the next frame the player is reachable — and _peripheralCd stops this from
    // degenerating into him fighting the add instead of the player.
    if (this._peripheralCd > 0) this._peripheralCd--;
    if (this._peripheralCd <= 0 && this.cooldown <= 0 && this.attackTimer <= 0 &&
        (this.stunTimer || 0) <= 0 && (this.ragdollTimer || 0) <= 0 && !this.shielding &&
        this.weapon && this.weapon.type === 'melee') {
      const _primaryInReach = !!(t && Math.hypot(t.cx() - this.cx(), t.cy() - this.cy())
                                      <= this._meleeReachDist(t) * 1.15);
      const _adds = [...(Array.isArray(players) ? players : []),
                     ...(typeof minions !== 'undefined' && Array.isArray(minions) ? minions : [])];
      let _best = null, _bestD = Infinity;
      for (const o of _adds) {
        if (!o || o === this || o === t || o.health <= 0) continue;
        if (typeof areAlliedEntities === 'function' && areAlliedEntities(this, o)) continue;
        const _d = Math.hypot(o.cx() - this.cx(), o.cy() - this.cy());
        // Filter on the weapon's committal band, not on _meleeReachDist(). The
        // latter is the blade-tip arc — 50-60px — and a summon poking from its
        // own 88px axe range never enters it, which is why the first version of
        // this fired 1.0 times a match. Commit at the same band the AI commits
        // to its primary at and let the whiff-guard arbitrate; a vetoed swing
        // costs nothing here because _peripheralCd is only charged below when
        // attackTimer actually came up.
        if (_d > ((this.weapon && this.weapon.range) || 90) * 1.15 + 20) continue;
        if (Math.abs((o.y + (o.h || 0) / 2) - this.cy()) > 60) continue;
        // When the player IS in reach, the swing he is holding already has a
        // better home, so he only turns on the add for cause: it has actually
        // been taking health off him. Gating on "primary out of reach" alone was
        // measured at 1.0 peripheral swings a match — it excluded the exact case
        // this exists for, because a Sovereign pressuring his target is almost
        // never out of range of it, which is precisely when a summon farms him.
        if (_primaryInReach) {
          const _led = this._threatLedger && this._threatLedger.get(o);
          if (!_led || _led.dmg < 8) continue;   // one clean hit off him is cause enough
        }
        if (_d < _bestD) { _bestD = _d; _best = o; }
      }
      if (_best) {
        this.facing = _best.cx() >= this.cx() ? 1 : -1;
        this.attack(_best);
        // Only charge the cooldown if the swing actually went out — the melee
        // whiff-guard aborts without consuming `cooldown`, and paying the
        // peripheral cooldown for a vetoed swing would blind him for 50 frames
        // for free (the same silent-veto trap the boss range tests fell into).
        if (this.attackTimer > 0) this._peripheralCd = 50;
      }
    }

    // ── Danger: the floor itself is being deleted ──────────────────────────
    // Highest hazard priority: every other threat here can be traded with, and
    // this one cannot — when the deck goes there is no ground to fight on. See
    // _runFloorHazard().
    if (this._runFloorHazard(moveSpd, _jumpVy)) { this.aiReact = 0; this._commit('floor_hazard'); return; }

    // ── Danger: boss / arena set-piece hazards (leave the zone) ────────────
    // Runs before the projectile scan because these hit harder and telegraph
    // longer. See _scanAreaThreats().
    if (this._scanDomainHazards(moveSpd, _jumpVy)) { this.aiReact = 0; this._commit('domain_hazard'); return; }
    if (this._scanAreaThreats(moveSpd, _jumpVy)) { this.aiReact = 0; this._commit('area_threat'); return; }

    // ── Danger: incoming projectiles / sword crescents (dodge) ─────────────
    // A ranged-poking player (crescent spam from 200-400px) chips Sovereign down.
    // Read the live projectile pools and evade the incoming shot. Detects earlier
    // (210px) and over a taller band (covers the full body, not just the centre),
    // dodges in the AIR too (not only grounded), and re-arms fast so rapid volleys
    // don't slip through. Near-perfect for an evolved Sovereign — he does not eat
    // ranged chip the way a human would.
    if (this._projDodgeCd > 0) this._projDodgeCd--;
    if (this._projDodgeCd <= 0 && this.stunTimer <= 0 && this.ragdollTimer <= 0) {
      let _incoming = null;
      const _scanShots = (arr) => {
        if (!arr || _incoming) return;
        for (const pr of arr) {
          if (!pr || pr.done || pr.dead || (pr.life !== undefined && pr.life <= 0) ||
              (pr.timer !== undefined && pr.timer <= 0) || pr.owner === this) continue;
          const _pdx = this.cx() - pr.x;
          if (Math.abs(_pdx) < 210 && Math.abs((pr.y || 0) - this.cy()) < 72 &&
              Math.abs(pr.vx || 0) > 3 && Math.sign(pr.vx) === Math.sign(_pdx)) {
            _incoming = pr; return;
          }
        }
      };
      if (typeof projectiles !== 'undefined') _scanShots(projectiles);
      // Every owner-attached hazard, from the single registry — no per-weapon list
      // to forget to update when a new ability ships — and from every hostile in
      // the match, not just the one he happens to be targeting.
      _scanShots(_smk2AllOwnedHazards(this));
      if (_incoming && Math.random() >= this._reactionMistakeRate() * 0.4) {
        if (this.onGround)            this.vy = _jumpVy;                          // jump the shot
        else if (this.canDoubleJump) { this.vy = -16; this.canDoubleJump = false; } // air-dodge up over it
        else                          this.vy = Math.max(this.vy, 9);            // no air option — drop under it
        this._projDodgeCd = 14;
        this._recordEvent('dodge', 2);
      }
    }

    // ── MAP / RESOURCE CONTROL ────────────────────────────────────────
    // Read live arena events after projectile defense but before any normal
    // pressure plan. This lets Sovereign avoid every active map threat, hold an
    // opponent inside one, and collect/deny available map resources naturally.
    if (this._runMapTactics(t, dir, d, moveSpd, _jumpVy, weaponRange)) {
      this.aiReact = 0;
      this._commit('map_tactics');
      return;
    }

    // Tick frame-safe shield drop (replaces the old setTimeout approach)
    if (this._shieldHoldFrames > 0) {
      if (--this._shieldHoldFrames === 0) {
        this.shielding = false;
        // Shield-counter: player was attacking while we blocked → punish the moment shield drops
        if (playerAttacking && d < atkRange * 1.6 + 40) {
          const _shWpnRec = t.weapon ? ((t.weapon.cooldown || 32) + (t.weapon.endlag || 8)) : 40;
          const _shHeavy  = (t.weapon && t.weapon.kb >= 18) ? Math.min(10, Math.round(_shWpnRec / 9)) : 0;
          this._punishTimer        = (lb ? 6 : 10) + _shHeavy;
          this._commitToChaseFrames = Math.max(this._commitToChaseFrames, 28);
          this._chaseDirection     = dir;
        }
      }
    }

    // ── RAPID-HIT ESCAPE ─────────────────────────────────────────
    // When a heavy weapon ability or super is landing hits in rapid succession,
    // Sovereign must break out before the full chain connects.
    // Detects 2+ dmg_taken events in the last 25 frames and immediately jumps away.
    const veryRecentHits = this._countRecent('dmg_taken', 20);
    if (veryRecentHits >= 2) {
      if (this.onGround) {
        const _escDir = (nearLeft || (this.cx() > t.cx())) ? 1 : -1;
        if (!this.isEdgeDanger(_escDir)) this.vx = _escDir * moveSpd * 2.2;
        else this.vx = dir * moveSpd * 0.8;
        this.vy = _jumpVy;
      } else if (this.canDoubleJump) {
        this.vy = -15;
        this.canDoubleJump = false;
        const _escDir = (nearLeft || (this.cx() > t.cx())) ? 1 : -1;
        if (!this.isEdgeDanger(_escDir)) this.vx = _escDir * moveSpd * 1.8;
      } else if (this.shieldCooldown === 0) {
        this.shielding = true;
        this.shieldCooldown = 60;
        this._shieldHoldFrames = 12;
      }
      this._recordEvent('dodge', 7);
      this.aiReact = 0;
      this._updateFearFactor(d, recentLanded, true);
      this._commit('rapid_hit_escape');
      return;
    }

    // ── GUARANTEED PUNISH — the target literally cannot fight back ──────────
    // The engine's hard rules create windows where the opponent is locked out of
    // acting: attackEndlag (cannot attack or ability — worse after a whiff, 2.4×,
    // and at low stamina, +40%), stunTimer/ragdollTimer (cannot act at all),
    // _parryVulnFrames (90 frames of 1.5× damage taken), and _reloadTimer (ranged
    // player cannot shoot). During any of these, defense is unnecessary and every
    // frame not spent converting is wasted: sprint in, strike with no telegraph,
    // chain follow-ups, and spend ability/super freely. The attack() override's
    // i-frame veto keeps the chain timed to invincibility expiry automatically.
    if (this._targetHelpless(t) && (t.invincible || 0) <= 24) {
      this._telegraphTimer = 0;                       // no wind-up on a helpless target
      if (d > weaponRange - 6) {
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 2.2;
        else if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.7; }
        if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 90) {
          this.vy = _jumpVy; this._jumpCooldown = 20;
        }
      } else {
        this.vx *= 0.6;                               // in reach — stop, convert
      }
      if (this.cooldown <= 0 && d < weaponRange + 12 && this._strike(t)) {
        this._postHitLockFrames = Math.max(this._postHitLockFrames, 40);
        if (this._comboFollowHits === 0) {
          this._comboFollowHits  = 1 + lbCombo + ((t._parryVulnFrames || 0) > 25 ? 1 : 0);
          this._comboFollowTimer = lb ? 8 : 10;
        }
      }
      if (this.abilityCooldown <= 0 && d < 150) this.ability(t);
      if (this.superReady && ((t._parryVulnFrames || 0) > 25 || finishPush)) this.useSuper(t);
      this.aiReact = 0;
      this._updateFearFactor(d, recentLanded, true);
      this._commit('guaranteed_punish');
      return;
    }

    // ── LANDING PUNISH — airborne target with the double jump spent ─────────
    // A falling player who has burned their double jump is on rails: their
    // landing point is deterministic. Pre-position at it so Sovereign is already
    // in reach on touchdown — the frames right after landing (often + endlag from
    // an air whiff) are the cleanest punish the movement system offers.
    if (!t.onGround && !t.canDoubleJump && t.vy > -2 && this.onGround &&
        d < 320 && !playerAttacking) {
      const _land   = this._behaviorModel.projectPosition(t, 30);
      const _lGap   = _land.x - this.cx();
      const _lDir   = Math.sign(_lGap) || dir;
      if (Math.abs(_lGap) > 24) {
        if (!this.isEdgeDanger(_lDir)) { this.vx = _lDir * moveSpd * 1.5; this.aiReact = 0; this._commit('landing_punish_close'); return; }
      } else {
        this.vx *= 0.55;                              // camped under the landing spot
        if (this.cooldown <= 0 && d < weaponRange + 8 &&
            Math.abs((this.y + this.h / 2) - (t.y + t.h / 2)) <= 70) {
          this._strike(t);                            // clip them on the way down
        }
        this.aiReact = 0;
        this._commit('landing_punish');
        return;
      }
    }

    // Kill instinct: when opponent is near death, activate punish mode immediately
    if (tHpPct < this._genome.killInstinctHP && !this._punishModeActive && this.health > 0) {
      this._activatePunishMode('kill');
    }

    // ── SPAWN-INVINCIBILITY STANDOFF — don't feed a just-respawned target ─────
    // A target with spawn / super i-frames takes no damage but can still hit us.
    // Rushing in the instant they respawn means every swing whiffs on the
    // invincibility while they get free hits — the "runs right into them able to
    // do nothing" habit. Hold just outside our own reach, coiled, until the
    // i-frames are nearly gone; normal engagement then resumes and lands the first
    // blow as they turn vulnerable. Threshold 40 clears normal hit i-frames (≤24)
    // so combos are untouched, but catches respawn (180) and super (90+) frames.
    if (t.invincible > 40) {
      const _coil = weaponRange + 24; // just outside striking range — poised to pounce
      if (d < _coil) {
        if (!this.isEdgeDanger(-dir)) this.vx = -dir * moveSpd * 0.8;
        else this.vx *= 0.7;
      } else {
        this.vx *= 0.65; // hold position — do not close until they can be hurt
      }
      this.aiReact = 0;
      this._commit('spawn_standoff');
      return;
    }

    // ── DOMAIN DENIAL — refuse neutral exchanges while a class domain runs ────
    // The domain supers are all economies built on connecting with Sovereign:
    // Ronin's Death's Dojo marks every hit for a sheathe detonation, Reaper's
    // Soul Tithe converts every hit into orbiting heal-souls, and Ninja's Shadow
    // Realm time-dilates Sovereign's frames. All are timed. The winning line is
    // the same for each: give the domain NOTHING — stay out of reach, dodge, and
    // let it expire. Hard punish windows still convert (the guaranteed-punish
    // block above runs first), but neutral trades are refused entirely.
    // ── PUGILIST COMBO STRIKE READ ────────────────────────────────────────
    // The low-HP scripted combo (dash → kick → punch) has NO distance gate — its
    // hits land unconditionally while it runs. Movement cannot dodge it; a
    // shield absorbs both hits with zero knockback (which also cancels the
    // 24-velocity ring-out blast). The state object is visible the frame it arms.
    if (t._comboSuper && this.shieldCooldown === 0 && this._shieldHoldFrames === 0) {
      this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 26;
      this.aiReact = 0;
      this._commit('pugilist_read_a');
      return;
    }

    // Every class has a domain (every 5th super triggers an expansion), so read
    // the DomainManager registry generically rather than per-class flags.
    // Retreat only beats CONTACT-ECONOMY domains — the ones whose payout requires
    // Sovereign to touch the owner (Ronin's marks, Reaper's souls, Ninja's slow,
    // Berserker/Pugilist owner buffs, Megaknight's rift). Those have spawnEvery 0:
    // nothing comes looking for him, so distance genuinely starves them.
    //
    // Hazard-RAIN domains are the opposite. Storm Realm's lightning is aimed at an
    // enemy's own cx() and its hit test is horizontal-only (no vertical term at
    // all), and Mjolnir homes on the nearest enemy at speed 22. Arsenal's turrets
    // aim, Verdant Hunt's arrow crosses the whole arena, Warpath's logs fly the
    // full width. Backing off buys nothing and costs him his entire offense:
    // in replay 2026-09-05(1) he spent the Storm Realm at 0% attack uptime and
    // 40% stunned, took 142 damage and dealt none, and lost two stocks doing it.
    // So deny only what denial actually denies.
    const _tOwnsDomain = typeof DomainManager !== 'undefined' && DomainManager.domains &&
                         DomainManager.domains.some(dm => dm && dm.owner === t &&
                           !(dm.def && dm.def.hazardType && dm.def.spawnEvery > 0));
    const _domainThreat = !!(t._roninCutsActive || t._soulTitheActive || _tOwnsDomain ||
                             (this._domainSlowFactor > 0 && this._domainSlowFactor < 1));
    if (_domainThreat && d < 280) {
      const _ddDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(_ddDir)) {
        this.vx = _ddDir * moveSpd * (d < 150 ? 1.9 : 1.2);
      } else if (this.onGround) {
        this.vy = _jumpVy; this.vx = dir * moveSpd * 0.8;   // cornered — jump over
      } else if (this.canDoubleJump && d < 120) {
        this.vy = -15; this.canDoubleJump = false;
        if (!this.isEdgeDanger(_ddDir)) this.vx = _ddDir * moveSpd * 1.5;
      }
      // Point-blank with a swing incoming and no lane — shield rather than eat a mark
      if (playerAttacking && d < 130 && this.shieldCooldown === 0 && this._shieldHoldFrames === 0) {
        this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 10;
      }
      this._recordEvent('dodge', 3);
      this.aiReact = 0;
      this._commit('pugilist_read_b');
      return;
    }

    // ── FORCE ENGAGEMENT ─────────────────────────────────────────
    // If player has been passive AND distant for too long, override movement.
    // Does not change speed values — only decision priority.
    // Kite counter: repeated chip damage from outside melee range means the
    // player is ranging us — skip the passive-player thresholds and engage NOW.
    if (!this._forceModeActive && d > 160 && this._countRecent('dmg_taken', 240) >= 3) {
      this._forceModeActive      = true;
      this._forceModeCloseFrames = 0;
      if (this._fearLineCd <= 0 && typeof showBossDialogue === 'function') {
        showBossDialogue('You cannot run forever.', 120);
        this._fearLineCd = 300;
      }
    }
    const inForceMode = this._updateForceEngagement(t, d, playerAttacking);
    if (inForceMode) {
      // Override: always path directly at player, no hesitation
      if (!this.isEdgeDanger(dir)) {
        this.vx = dir * moveSpd; // full speed toward player, no multiplier increase
      } else {
        // Near edge — jump over instead of walking into the void
        if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.6; }
      }
      // Only jump to reach genuinely elevated platforms — not for minor height differences
      if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 130 && !t.onGround) {
        this.vy = _jumpVy; this._jumpCooldown = 28;
      }
      // Attack the moment range allows — no bait, no hesitation
      if (d < weaponRange + 10 && this.cooldown <= 0) {
        this.attack(t);
      }
      // Use ability to close gap faster (decision, not speed change)
      if (this.abilityCooldown <= 0 && d < 300 && Math.random() < 0.08) this.ability(t);
      this.aiReact = Math.max(1, reactFrames - 1);
      this._updateFearFactor(d, recentLanded, true);
      this._commit('force_engagement');
      return;
    }

    // ── AERIAL ENGAGEMENT: proactively jump when player camps high ground ────
    // Activates once _prefersAerial is confirmed (>35% airborne over last 120 ticks).
    // Does NOT fire during other priority overrides (force mode, exploit response, etc.).
    if (this._prefersAerial && !t.onGround && this.onGround && this._jumpCooldown <= 0 && d < 240) {
      const _heightGap = this.y - t.y; // positive = player is higher
      if (_heightGap > 70) {
        // Jump toward the player to close height gap and engage in the air
        this.vy = _jumpVy;
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.65;
        this._jumpCooldown = 22;
        if (this._fearLineCd <= 0 && Math.random() < 0.10) {
          const _aerialLines = ['You\'re more comfortable up there.', 'The air is mine too.', 'No safe height.'];
          showBossDialogue(_aerialLines[Math.floor(Math.random() * _aerialLines.length)], 100);
          this._fearLineCd = 280;
        }
      }
    }

    // ── D. Anti-exploit forced response ───────────────────────
    if (this._runExploitResponse(t, dir, d, moveSpd)) {
      this.aiReact = Math.max(0, reactFrames - 1);
      this._commit('anti_exploit');
      return;
    }

    // ── SOVEREIGN ESCAPE: when backed to own edge, jump over player to reverse corner ──
    if (this._runSovereignEscape(t, dir, moveSpd, _jumpVy)) {
      this.aiReact = 0;
      this._commit('sov_escape_a');
      return;
    }

    if (this._runFlowBreak(t, dir, d, moveSpd, weaponRange, playerAttacking, recentTaken)) {
      this.aiReact = 0;
      this._updateFearFactor(d, recentLanded, true);
      this._commit('sov_escape_b');
      return;
    }

    // ── CORNER EXPLOIT: player is near edge — block escape, attack aggressively ──
    if (this._preferCommit('corner_exploit') && this._runCornerExploit(t, dir, d, moveSpd, atkRange)) {
      this.aiReact = this._limiterBroken ? 0 : Math.max(0, reactFrames - 1);
      this._updateFearFactor(d, recentLanded, true);
      this._commit('corner_exploit');
      return;
    }

    // ── B. Punish mode: ignore defense, go full offense ───────
    if (this._punishModeActive && this._preferCommit('punish_mode')) {
      // Stop-short fakeout: occasionally pause just outside attack range before striking.
      // Breaks the fixed-timing read that skilled players use to dodge every punish rush.
      if (this._punishFakeoutTimer > 0) {
        this._punishFakeoutTimer--;
        this.vx *= 0.28; // near-stop — player expects the strike to land immediately
        // Strike fires when the pause ends and range is met
        if (this._punishFakeoutTimer === 0 && this.cooldown <= 0 && d < weaponRange + 28) {
          this.attack(t);
        }
      } else {
        // Randomized approach speed: 1.25–1.60× so no single timing read works twice
        const rushVar = 1.25 + Math.random() * 0.35;
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * rushVar;
        // 30% chance: arm a stop-short pause when entering strike range
        if (d > weaponRange + 12 && d < weaponRange + 55 && this.cooldown > 3 && Math.random() < 0.07) {
          this._punishFakeoutTimer = 8;
        }
      }
      if (this.onGround && t.y < this.y - 100 && d > 100 && !playerAttacking && Math.random() < 0.045) this.vy = -19;
      if (this._punishFakeoutTimer === 0 && d < weaponRange + 10 && this.cooldown <= 0) {
        if (this._strike(t)) {
          const comboHits = Math.floor(this.intelligence * 1.5) + lbCombo;
          if (comboHits > 0 && this._comboFollowHits === 0) {
            this._comboFollowHits = comboHits;
            this._comboFollowTimer = Math.max(10, Math.round(15 - m.reactionSpeed * 4));
          }
        }
      }
      // Reduced ability/super spam during punish mode — still aggressive, but not relentless
      if (this.abilityCooldown <= 0 && d < 220 && Math.random() < 0.05) this.ability(t);
      if (this.superReady && Math.random() < (finishPush ? 0.12 : 0.055)) this.useSuper(t);
      this.aiReact = 1; // unbeatable tuning: near-continuous decisions in punish mode
      this._updateFearFactor(d, recentLanded, true);
      this._commit('punish_mode');
      return;
    }

    // ── A. Preemptive prediction counter (single authoritative read) ──
    // Sourced from the unified BehaviorModel prediction (see _updatePrediction).
    // One path per predicted action, so the player never eats two conflicting
    // preempt reactions in a tick and every correct read is credited.
    const adaptReady = this._observationFrames >= 4 && this._actionSampleCount >= 1;
    if (adaptReady && !this._humanMissArmed && !playerAttacking) {
      // Predicted attack → the authoritative pre-dodge: step back once and commit.
      // Crediting (_preemptMode/_preemptTarget) lets _checkPredictionCorrect reward it,
      // so reading an attack correctly advances evolution the same as any other read.
      if (this._predictedNext === 'attack' && this.cooldown <= 0 &&
          this._predictConf >= (0.50 - this._evolutionStage * 0.03)) {
        const _pdFrames = _bmBias.preDodgeFrames > 0 ? _bmBias.preDodgeFrames : Math.max(2, reactFrames);
        const _pdDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        if (this.onGround && !this.isEdgeDanger(_pdDir)) {
          this.vx             = _pdDir * moveSpd * 1.5;
          this.aiReact        = _pdFrames;
          this._preemptMode   = true;
          this._preemptTarget = 'attack';
          this._recordEvent('dodge', 4);
          this._commit('predict_counter_a');
          return;
        }
      }
      // Predicted jump / dodge / shield (and cornered or airborne attack reads) →
      // the multi-frame preempt: anti-air landing, intercept, or guard-break.
      if (this._applyPredictionCounter(t, dir, d, moveSpd)) {
        this.aiReact = reactFrames;
        this._commit('predict_counter_b');
        return;
      }
    }

    // ── Reaction read: one mistake-gated decision for this attack ──────────
    // Latched per attack instance so every defensive site below shares ONE roll
    // against the single mistake-rate, instead of independently coin-flipping.
    if (!playerAttacking) this._reactLatch = null;
    else if (!this._reactLatch) this._reactLatch = { react: Math.random() >= this._reactionMistakeRate() };
    const _willReactToAttack = !!(this._reactLatch && this._reactLatch.react);

    // ── SHIELD PRIORITY — evaluated before hardCounter so parry/flowBreak don't eat it ──
    // Shield FIRST when it's the tactically preferred reaction; otherwise fall through
    // to hardCounter / COUNTER-ATTACK (which dodge). Reacting at all is the mistake gate.
    if (playerAttacking && d < 210 && this.shieldCooldown === 0 && this._shieldHoldFrames === 0 &&
        effDef > this._dialGate(0.625)) {
      const _shCornered = (nearLeft && dir < 0) || (nearRight && dir > 0);
      // Shield is preferred when cornered (no clean dodge lane), vs a heavy/high-KB
      // weapon (long punishable recovery), under sustained pressure, or with a learned
      // shield bias. The GO/NO-GO on reacting is _willReactToAttack — not a coin flip.
      const _shieldPreferred = _shCornered || (t.weapon && t.weapon.kb >= 18) ||
        recentTaken >= 2 || memoryShield > 0.15;
      if (_willReactToAttack && _shieldPreferred) {
        this._telegraphTimer   = 0; // cancel any pending wind-up — shield takes priority
        this.shielding         = true;
        this.shieldCooldown    = 60;
        this._shieldHoldFrames = 10;
        this._recordEvent('dodge', 3);
        this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
        this.aiReact = reactFrames;
        this._commit('shield_priority_a');
        return;
      }
    }

    if (this._runHardCounter(t, dir, d, moveSpd, weaponRange, atkRange, playerAttacking)) {
      this.aiReact = this._limiterBroken ? 0 : Math.max(0, reactFrames - 1);
      this._updateFearFactor(d, recentLanded, true);
      this._commit('shield_priority_b');
      return;
    }

    // ── PHASE STEP DETECTION: player dashing at high speed while attacking ────
    // Phase Step fires vx=14 toward Sovereign; detect and emergency dodge before it lands.
    const playerPhaseStepping = playerAttacking && Math.abs(t.vx) >= 12 && Math.sign(t.vx) === dir;
    if (playerPhaseStepping && d < 200) {
      const _psDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(_psDir)) {
        this.vx = _psDir * moveSpd * 2.8;
      } else if (this.onGround) {
        this.vy = _jumpVy; this.vx = dir * moveSpd * 0.9; // jump over if cornered
      } else if (this.canDoubleJump) {
        this.vy = -16; this.canDoubleJump = false;
      }
      this._recordEvent('dodge', 6);
      const _psRec = t.weapon ? ((t.weapon.cooldown || 32) + (t.weapon.endlag || 8)) : 40;
      const _psHeavy = (t.weapon && t.weapon.kb >= 18) ? Math.min(10, Math.round(_psRec / 9)) : 0;
      this._punishTimer = (lb ? 5 : 8) + _psHeavy;
      this.aiReact = 0;
      this._updateFearFactor(d, recentLanded, false);
      this._commit('phase_step_read');
      return;
    }

    // ── WALL-BEHIND-ME SAFETY: when the void is directly behind Sovereign ─────
    // If player hits Sovereign here, knockback launches into the void.
    // Prioritize sliding to center before the swing lands.
    const wallBehindMe = (nearLeft && dir > 0) || (nearRight && dir < 0);
    if (wallBehindMe && heavyThreat && d < 160 && !playerAttacking) {
      const _wbDir = nearLeft ? 1 : -1; // toward center
      if (!this.isEdgeDanger(_wbDir)) this.vx = _wbDir * moveSpd * 1.4;
      if (d < weaponRange + 10 && this.cooldown <= 0) this.attack(t); // still attack if in range
      this.aiReact = 0;
      this._commit('wall_safety');
      return;
    }

    // ── COUNTER-ATTACK: dodge or shield on player attack ─────
    // Reaction is governed by the single mistake-rate latch (_willReactToAttack);
    // the shield-vs-dodge CHOICE is deterministic on tactical context — no coin flip.
    if (playerAttacking && d < 210) {
      const canShield = this.shieldCooldown === 0;
      const cornered  = (nearLeft && dir < 0) || (nearRight && dir > 0);
      if (_willReactToAttack) {
        // Prefer shield when cornered (no clean dodge lane), vs a heavy/high-KB weapon
        // (long punishable recovery + heavy knockback to avoid), under sustained pressure,
        // or with a learned shield bias. Otherwise slip the swing and punish.
        const _preferShield = canShield && (cornered || (t.weapon && t.weapon.kb >= 18) ||
          recentTaken >= 2 || memoryShield > 0.15);

        if (_preferShield) {
          this.shielding        = true;
          this.shieldCooldown   = 60;
          this._shieldHoldFrames = 10;
          this._recordEvent('dodge', 3);
          this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
          this.aiReact = reactFrames;
          this._commit('counter_attack_a');
          return;
        }

        // Dodge — slip the swing, then commit to a punish.
        const dDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        let _dodged = true;
        if (this.onGround && !this.isEdgeDanger(dDir)) {
          this.vx = dDir * moveSpd * 2.2;
        } else if (this.onGround) {
          this.vy = -19; this.vx = dir * moveSpd * 0.8; // jump into/over player
        } else if (this.canDoubleJump) {
          this.vx = dDir * moveSpd * 1.8;
          this.vy = -16; this.canDoubleJump = false;
        } else if (!this.isEdgeDanger(dDir)) {
          this.vx = dDir * moveSpd * 2.0; // airborne, no double jump — lateral slip
        } else if (canShield) {
          // Cornered mid-air with no lane — shield as the last-resort block.
          this.shielding        = true;
          this.shieldCooldown   = 60;
          this._shieldHoldFrames = 8;
          this._recordEvent('dodge', 3);
          this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
          this.aiReact = reactFrames;
          this._commit('counter_attack_b');
          return;
        } else {
          _dodged = false; // no dodge lane and no shield — gets clipped this frame
        }

        if (_dodged) {
          this.shielding = false;
          this._telegraphTimer = 0; // cancel any pending wind-up — dodge takes priority
          this._recordEvent('dodge', 5);
          this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
          // Scale punish window to the opponent weapon's full recovery (cooldown + endlag).
          const _ptWpnRec = t.weapon ? ((t.weapon.cooldown || 32) + (t.weapon.endlag || 8)) : 40;
          const _ptHeavy  = (t.weapon && t.weapon.kb >= 18) ? Math.min(10, Math.round(_ptWpnRec / 9)) : 0;
          this._punishTimer = (lb ? 4 : 6) + _ptHeavy;
          // Dodge-to-chase: defensive success never simply returns to passive neutral.
          this._commitToChaseFrames = 30;
          this._chaseDirection      = dir;
          this.aiReact = Math.max(1, reactFrames - 1); // punish sprint starts one frame earlier
          this._commit('counter_attack_c');
          return;
        }
      }
      // Not reacting (or no escape lane) — Sovereign eats this attack: the player's
      // reward window defined by the single mistake-rate.
    } else {
      this.shielding = false;
    }

    if (heavyThreat && !playerAttacking && d < Math.max(prefDist, 190) && this.shieldCooldown === 0 && this._shieldHoldFrames === 0) {
      if (Math.random() < 0.004 + this.intelligence * 0.002) {
        this.shielding        = true;
        this.shieldCooldown   = 60;
        this._shieldHoldFrames = 12;
        this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
        this.aiReact = reactFrames;
        this._commit('counter_attack_d');
        return;
      }
    }

    // ── PUNISH TIMER: sprint and strike after dodge ────────────
    if (this._punishTimer > 0) {
      // ABORT: if player attacks during the charge, dodge the swing and re-arm punish
      if (playerAttacking && d < 175) {
        const _abortDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        if (this.onGround && !this.isEdgeDanger(_abortDir)) {
          this.vx = _abortDir * moveSpd * 2.2;
        } else if (this.onGround) {
          this.vy = _jumpVy; this.vx = dir * moveSpd * 0.75; // jump over if cornered
        } else if (this.canDoubleJump) {
          this.vx = _abortDir * moveSpd * 1.8;
          this.vy = -15; this.canDoubleJump = false;
        } else {
          // Airborne, no double jump — lateral burst to exit the attack arc
          if (!this.isEdgeDanger(_abortDir)) this.vx = _abortDir * moveSpd * 2.0;
        }
        const _ptWpnRec = t.weapon ? ((t.weapon.cooldown || 32) + (t.weapon.endlag || 8)) : 40;
        const _ptHeavy  = (t.weapon && t.weapon.kb >= 18) ? Math.min(10, Math.round(_ptWpnRec / 9)) : 0;
        this._punishTimer = (lb ? 3 : 5) + _ptHeavy; // re-arm for the new attack
        this.aiReact = 0;
        this._commit('punish_timer_a');
        return;
      }

      this._punishTimer--;
      // Sprint at the player; only jump for very elevated targets (high platforms)
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * (heavyThreat ? 2.1 : 1.9);
      else if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.75; }
      if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 130 && !t.onGround) {
        this.vy = _jumpVy; this._jumpCooldown = 22;
      }
      // Attack the moment range closes — use actual weapon range to avoid whiffs
      if (this.cooldown <= 0 && d < weaponRange + 10 && this._strike(t)) {
        this._queueAdaptivePunishOutcome(this._adaptivePunishRoute || 'direct', t, d);
        this._counterWindowOpen = false;
      }
      if (this._punishTimer === 0) {
        const route = this._adaptivePunishRoute || this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
        if (this.cooldown <= 0 && d < weaponRange * 1.5 + 35) {
          const handled = this._applyAdaptivePunishRoute(route, t, dir, d, moveSpd, _jumpVy, weaponRange, atkRange);
          if (!handled && this._strike(t)) {
            this._queueAdaptivePunishOutcome(route, t, d);
          }
          this._counterWindowOpen = false;
        }
        // A completed punish is a confirmed resource-conversion window; spend
        // available ability/super tools because the engine guarantees value here.
        this._tryTacticalConversion(t, d, weaponRange);
      }
      this._commit('punish_timer_b');
      return;
    }

    // ── ENDLAG PUNISH: strike during the exact frames the opponent is locked in recovery ──
    // _endlagWindow is a bounded timer (= weapon.endlag) set when the attack animation ends.
    // Unlike _counterWindowOpen this window expires after a specific number of frames,
    // so Sovereign must commit immediately — no telegraph, no hesitation.
    if (this._endlagWindow > 0 && !playerAttacking) {
      // Only consume the window on a swing that actually started — on a
      // whiff-guard veto fall through to the sprint below and keep the window.
      if (d < weaponRange + 18 && this.cooldown <= 0 && this._strike(t)) {
        this._endlagWindow      = 0;
        this._postHitLockFrames = Math.max(this._postHitLockFrames, 40);
        if (this.abilityCooldown <= 0 && d < 120) this.ability(t);
        if (this._comboFollowHits === 0) {
          const _elgCombo = Math.floor(this.intelligence * 1.5) + lbCombo;
          if (_elgCombo > 0) {
            this._comboFollowHits  = _elgCombo;
            this._comboFollowTimer = Math.max(lb ? 8 : 10, Math.round(14 - m.reactionSpeed * 4));
          }
        }
        this.aiReact = 1;
        this._updateFearFactor(d, recentLanded, true);
        this._commit('endlag_punish_a');
        return;
      }
      // Out of range: sprint to close the gap — window is brief so no hesitation
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 2.0;
      if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 80) {
        this.vy = _jumpVy; this._jumpCooldown = 22;
      }
    }

    // Instant counter on whiff — dash in even from range to punish consistently
    if (this._counterWindowOpen) {
      // Close the window if player starts a new attack during the chase
      if (playerAttacking) this._counterWindowOpen = false;
      // Phase Step: whenever the ability is ready, use it as the primary gap-closer
      // and punish tool.  This is Sovereign's signature counter — never waste it.
      if (!playerAttacking && this.abilityCooldown <= 0 && d < 250) {
        this.ability(t);
        this._queueAdaptivePunishOutcome('direct', t, d);
        this._counterWindowOpen = false;
        this.aiReact = 0;
        this._commit('endlag_punish_b');
        return;
      }
      const route = this._adaptivePunishRoute || this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
      if (route === 'delayed' && this._adaptivePunishTimer > 0) {
        this.vx *= 0.60;
        this.aiReact = 0;
        this._commit('endlag_punish_c');
        return;
      }
      if (route === 'crossup' && this.onGround && d < 210) {
        this.vy = _jumpVy;
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.75;
        this.aiReact = 0;
        this._commit('endlag_punish_d');
        return;
      }
      if (d < weaponRange * 1.6 + 40 && this.cooldown <= 0) {
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.6;
        const handled = this._applyAdaptivePunishRoute(route, t, dir, d, moveSpd, _jumpVy, weaponRange, atkRange);
        if (!handled) {
          this.attack(t);
          this._queueAdaptivePunishOutcome(route, t, d);
        }
        this._counterWindowOpen = false;
        this.aiReact = 0;
        this._commit('endlag_punish_e');
        return;
      } else if (!this.isEdgeDanger(dir)) {
        // Out of range: sprint at maximum speed — NEVER abandon a punish window
        this.vx = dir * moveSpd * 2.5;
        if (this.onGround && t.y < this.y - 50) this.vy = _jumpVy;
        this.aiReact = 0;
        this._commit('endlag_punish_f');
        return;
      } else if (this.onGround || this.canDoubleJump) {
        // Edge danger: jump over the player to continue the chase
        if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.85; }
        else { this.vy = -15; this.canDoubleJump = false; this.vx = dir * moveSpd * 0.6; }
        this.aiReact = 0;
        this._commit('endlag_punish_g');
        return;
      }
      // Truly stuck (airborne + edge + no double jump) — abandon window
      this._counterWindowOpen = false;
    }

    // ── COMBO FOLLOW-UP ────────────────────────────────────────
    // Pattern: light → Phase Step (heavy) → light → light
    // Phase Step fires as the first follow-up hit whenever ability is ready and in range.
    if (this._comboFollowTimer === 0 && this._comboFollowHits > 0 && d < atkRange * 1.45) {
      // Phase Step mid-combo: use as heavy punch when ability is available
      if (this.abilityCooldown <= 0 && d < 128) {
        this._comboFollowHits--;
        this.ability(t);
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.7; // stay on target after Phase Step
        this._comboFollowTimer = Math.max(lb ? 9 : 12, 12);
        this._commit('combo_follow_a');
        return;
      }
      if (this.cooldown <= 0) {
        if (this._strike(t)) {
          // Confirmed connect → refund this hit instead of spending it, up to the
          // cap. A landing string converts into real damage; a whiffing one still
          // runs down and ends, so swing volume does not inflate.
          if (this._comboLandedLast && this._comboExtensions < this._COMBO_EXT_MAX) {
            this._comboExtensions++;
          } else {
            this._comboFollowHits--;
          }
          this._comboFollowTimer = Math.max(lb ? 9 : 12, Math.round(13 - m.reactionSpeed * 3));
        } else {
          // Target escaped reach (knockback drift / airborne) — chase, retry soon,
          // keep the remaining follow-up hits instead of burning them on air.
          this._comboFollowTimer = 4;
          if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.15;
        }
        this._commit('combo_follow_b');
        return;
      }
    }

    // ── PATTERN ANTICIPATION ───────────────────────────────────
    // Jump-heavy player → shadow their air movement
    if (recentPJumps >= 3 && !this.onGround && this.canDoubleJump && !t.onGround) {
      this.vy = -15; this.canDoubleJump = false;
    }
    // Rapid-attack player → pre-position at punish range
    if (recentPAtks >= 4 && d < prefDist + 60 && d > prefDist) {
      this.vx *= 0.80;
    }

    // ── BAIT MECHANIC ──────────────────────────────────────────
    if (this._baitTimer > 0 && this._preferCommit('bait')) {
      this._baitTimer--;
      this.vx = 0; // stand still — invite attack (creeping telegraphs intent and defeats the bait)
      if (playerAttacking && d < 160) {
        this._baitTimer    = 0;
        this._baitCooldown = lb ? 180 : 280;
        this._baitCount++;
        this._baitIgnoredStreak = 0;
        const dDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        if (this.onGround && !this.isEdgeDanger(dDir)) {
          this.vy = -20; this.vx = dDir * moveSpd * 2.6;
        }
        this._punishTimer = 2;
        this._recordEvent('dodge', 8);
      } else if (this._baitTimer === 0) {
        // Bait expired un-taken. Without a cooldown here baits chain back-to-back and
        // Sovereign stands frozen at attack range against a player who won't whiff.
        // Ration the bait and convert the read into direct pressure instead.
        this._baitIgnoredStreak = (this._baitIgnoredStreak || 0) + 1;
        this._baitCooldown = Math.max(this._baitCooldown, (lb ? 120 : 180) + this._baitIgnoredStreak * 60);
        if (this._baitIgnoredStreak >= 2) {
          this._pressureMode      = 'suffocate';
          this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 45);
        }
      }
      this._commit('bait');
      return;
    }

    // ── PROACTIVE SHIELD STANCE ────────────────────────────────
    // At close range, occasionally hold shield briefly to bait the player into
    // attacking — shield drops after 17 frames and the counter fires immediately.
    // Only fires when not in bait/punish/force mode and shield cooldown is ready.
    // Shield reservation: while the target sits on a ready super with ramped
    // damage multipliers, the shield is earmarked for the incoming volley —
    // don't spend it on a speculative bait stance.
    const _shieldReserved = !!t.superReady && this._targetDamageMult(t) >= 1.3;
    if (!this._punishModeActive && this._shieldHoldFrames === 0 && this.shieldCooldown === 0
        && !_shieldReserved
        && this.intelligence > 0.60 && d < 150 && d > prefDist * 0.7
        && !playerAttacking && Math.random() < (0.002 + this.intelligence * 0.0016)) {
      this.shielding        = true;
      this.shieldCooldown   = 60;
      this._shieldHoldFrames = 12; // shorter hold for proactive stance
      this.aiReact = Math.max(1, reactFrames);
      this._commit('proactive_shield');
      return;
    }

    const finishMode = finishPush;
    const canBait    = this.intelligence > 0.55 && this._baitCooldown === 0 && !finishMode && d < 140 && d > prefDist * 0.8;
    const baitStyleBoost = (_bmRead.style === 'defensive' || _bmRead.style === 'passive') ? 1.25 : 1.0;
    if (canBait && this.intelligence > 0.70 && Math.random() < (0.001 + this.intelligence * 0.0014) * (_bmBias.baitBoost || 1.0) * baitStyleBoost * memoryBait / (1 + (this._baitIgnoredStreak || 0))) {
      this._baitTimer = Math.round(18 + this.intelligence * 20);
    }

    // ── PLATFORM CONTROL: contest player's favourite platform ─
    if (!finishMode && this._preferCommit('platform_control') && this._runPlatformControl(t, dir, d, moveSpd)) {
      this.aiReact = Math.max(1, reactFrames);
      this._commit('platform_control');
      return;
    }

    // ── MID-APPROACH EVASION ──────────────────────────────────
    // Player attacks while Sovereign is outside attack range — without this check
    // the movement code runs and Sovereign walks straight into the hit.
    if (playerAttacking && d > atkRange && d < 240 && this._preferCommit('mid_approach_evasion')) {
      const dDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(dDir)) {
        this.vx = dDir * moveSpd * 2.2;
      } else if (this.onGround) {
        // Truly cornered — only jump if backed against our own wall, otherwise step back
        if ((nearLeft && dir < 0) || (nearRight && dir > 0)) {
          this.vy = _jumpVy; this.vx = dir * moveSpd * 0.7; // jump into/over player
        } else {
          this.vx = -dir * moveSpd * 1.1; // step back without jumping
        }
      } else if (this.canDoubleJump) {
        this.vx = dDir * moveSpd * 1.6;
        this.vy = -15; this.canDoubleJump = false;
      } else {
        // Airborne, no double jump — lateral shift to exit the attack arc
        if (!this.isEdgeDanger(dDir)) this.vx = dDir * moveSpd * 1.8;
      }
      this._recordEvent('dodge', 5);
      const _pt2WpnRec = t.weapon ? ((t.weapon.cooldown || 32) + (t.weapon.endlag || 8)) : 40;
      const _pt2Heavy  = (t.weapon && t.weapon.kb >= 18) ? Math.min(10, Math.round(_pt2WpnRec / 9)) : 0;
      this._punishTimer = (lb ? 4 : 6) + _pt2Heavy;
      this.aiReact = 0;
      this._updateFearFactor(d, recentLanded, false);
      this._commit('mid_approach_evasion');
      return;
    }

    // ── BREATHING ROOM — back off after sustained aggression ─────
    // Gives the player a clear window to move, reposition, and counter-attack.
    if (this._restCooldown > 0) this._restCooldown--;
    if (this._restTimer > 0 && this._preferCommit('breathing_room')) {
      this._restTimer--;
      this._telegraphTimer = 0; // cancel any pending telegraph during rest
      if (!this.isEdgeDanger(-dir)) this.vx = -dir * moveSpd * 0.38;
      else this.vx *= 0.55;
      this.aiReact = 3;
      this._commit('breathing_room');
      return;
    }

    // ── MOVEMENT — continuous, no idle gaps ───────────────────
    // Commitment states override distance re-evaluation so Sovereign never
    // retreats from an advantage state due to a brief gap created by knockback.

    if (this._commitToChaseFrames > 0) {
      // Dodge-to-chase: committed pursuit after a successful dodge.
      // _punishTimer handles the immediate sprint; these frames cover the follow-through.
      const cDir = this._chaseDirection || dir;
      if (!this.isEdgeDanger(cDir)) this.vx = cDir * moveSpd * 1.30;
      else if (this.onGround) { this.vy = _jumpVy; this.vx = cDir * moveSpd * 0.6; }
      // fall through to attack check below

    } else if (this._postHitLockFrames > 0) {
      // Post-hit lock: chase the player through knockback distance instead of re-evaluating.
      if (d > weaponRange + 28) {
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.25;
        if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 80) {
          this.vy = _jumpVy; this._jumpCooldown = 22;
        }
      } else {
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.80;
      }
      // fall through to attack check below

    } else if (this._pressureMode === 'study' && !finishMode) {
      const studyGate = Math.max(0.30, 0.42 - memoryLocalWeight * 0.10 - (memoryForceSuffocate ? 0.06 : 0));
      const studyDist = Math.max(prefDist + 16 - memoryLocalWeight * 18, weaponRange * 0.95);
      if (_memoryState && this._predictConf >= studyGate && this._intimidation < 0.60 - memoryLocalWeight * 0.04 && d > studyDist - 16) {
        this._pressureMode = 'suffocate';
      }
      if (d > studyDist + 26) {
        const _passiveMult = recentPAtks === 0 ? 1.10 : 0.82;
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * _passiveMult;
      } else if (d < studyDist - 18) {
        if (!this.isEdgeDanger(-dir)) this.vx = -dir * moveSpd * 0.46;
      } else {
        // Always step in — no idle drift
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.35;
      }
      if (this._studyBurstTimer > 0 && !this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.12;
    } else if (d > prefDist + 20 || finishMode) {
      if (!nearLeft || dir >= 0) if (!nearRight || dir <= 0) {
        // Anticipatory positioning: move toward where the player will be in 6 frames
        // rather than their current position (mirrors the parent's approach logic).
        const _proj    = this._behaviorModel.projectPosition(t, 6);
        const _projDir = Math.sign(_proj.x - this.cx()) || dir;
        const _aDir    = (Math.sign(_projDir) === dir || d < 80) ? _projDir : dir;
        const _aBoost  = _bmBias.approachBoost || 1.0;
        this.vx = _aDir * moveSpd * (finishMode ? 1.34 : this._predictionBoostFrames > 0 ? 1.28 : this._pressureMode === 'suffocate' ? 1.16 : 1.0) * _aBoost;
      }
      // Only jump to pursue players on genuinely elevated platforms, not during normal combat
      if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 140 && !t.onGround) {
        this.vy = _jumpVy;
        this._jumpCooldown = 35;
      } else if (this._jumpCooldown <= 0 && this.canDoubleJump && this.vy > 0 && t.y < this.y - 130 && !t.onGround) {
        this.vy = -15; this.canDoubleJump = false;
        this._jumpCooldown = 25;
      }
    } else if (d < 22 && !finishMode && Math.abs(this.cy() - t.cy()) < 60) {
      // Settle zone: at contact range, stop micro-correcting horizontal alignment.
      // Steering toward dead-centre made `dir` flip every time Sovereign overshot
      // the target by a pixel — the constant left/right vibration. Damp instead;
      // the attack logic below still fires, so pressure is unchanged.
      this.vx *= 0.5;
    } else if (d < prefDist - 15) {
      if (this._pressureMode === 'suffocate') {
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.70;
        else this.vx *= 0.90;
      } else if (heavyThreat && d < 175) {
        if (!this.isEdgeDanger(-dir)) this.vx = -dir * moveSpd * 0.42;
        else this.vx *= 0.82;
      } else if (!this.isEdgeDanger(-dir)) {
        this.vx = -dir * moveSpd * 0.3;
      } else {
        this.vx *= 0.88;
      }
    } else {
      // Between preferred distance and approach threshold — maintain forward pressure
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.65;
    }

    // ── ELEVATION CONTEST: player standing on a platform above ─────────────
    // The approach jumps only trigger for airborne or far-elevated targets, so a
    // player camping a platform left Sovereign pacing underneath forever.
    // Within one jump: go straight up. Higher: climb via the nearest platform
    // one jump above (repeats naturally each hop until level with the camper).
    if (this._jumpCooldown <= 0 && this.onGround && t.onGround && t.y < this.y - 50) {
      const _gapY = this.y - t.y;
      if (_gapY <= 170 && d < 130) {
        this.vy = _jumpVy;
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.7;
        this._jumpCooldown = 30;
      } else if (d < 260 && typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
        let _hop = null, _hopDx = 1e9;
        for (const p of currentArena.platforms) {
          if (p.isFloor || p.isFloorDisabled) continue;
          if (p.y >= this.y - 40 || p.y < this.y - 190) continue; // within one jump above
          const _pdx = Math.abs((p.x + p.w / 2) - this.cx());
          if (_pdx < 150 && _pdx < _hopDx) { _hop = p; _hopDx = _pdx; }
        }
        if (_hop) {
          this.vy = _jumpVy;
          this.vx = (Math.sign(_hop.x + _hop.w / 2 - this.cx()) || dir) * Math.min(moveSpd, Math.max(2, _hopDx / 14));
          this._jumpCooldown = 34;
          // Steer toward the platform for the whole ascent (see hop-steering block
          // near the top of updateAI) — a one-shot vx gets overwritten next frame.
          this._hopTarget = _hop;
          this._hopFrames = 40;
        }
      }
    }

    // Reach at which Sovereign is willing to OPEN a string this frame. A real
    // opening earns full reach; a cold neutral read has to be paid for with
    // actual distance rather than a tip-range fish.
    // Behind a toggle so it can be A/B measured against the same opponent — two
    // live matches used different player weapons (katana vs hammer), and hammer's
    // kb 16 alone moves Sovereign's whiff rate enough to swamp this effect.
    const _gateOn = !(typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.openGate === false);
    const _openCommitted = playerAttacking || (t.attackEndlag || 0) > 0 ||
                           (t.stunTimer || 0) > 0 || this._punishModeActive ||
                           this._endlagWindow > 0 || this._predictConf >= 0.50;
    const _openReach     = (_openCommitted || !_gateOn) ? weaponRange + 10 : weaponRange - 10;

    // ── ATTACK — telegraph then strike ───────────────────────
    // Each first-strike is preceded by a brief wind-up (visual tell + dodge window).
    // Follow-up combo hits are handled separately by _comboFollowHits.
    if (this._telegraphTimer > 0) {
      this.vx *= 0.28; // near-stop during wind-up — player can read the incoming attack
      this._telegraphTimer--;
      if (this._telegraphTimer === 0 && d < weaponRange + 22 && this.cooldown <= 0) {
        if (this._strike(t)) {
          this._postHitLockFrames = Math.max(this._postHitLockFrames, 30);
          if (this.abilityCooldown <= 0 && d < 125) this.ability(t);
          if (this._comboFollowHits === 0) {
            const comboHits = Math.floor(this.intelligence * 1.5) + lbCombo;
            if (comboHits > 0) {
              this._comboFollowHits  = comboHits;
              this._comboFollowTimer = Math.max(lb ? 8 : 10, Math.round(14 - m.reactionSpeed * 4));
            }
          }
          // Breathing-room rest: DISABLED (unbeatable tuning) — Sovereign no
          // longer backs off after sustained aggression. Pressure never lapses.
          this._aggressionStreak++;
        } else {
          // Swing vetoed — target slipped out of true reach during the wind-up.
          // Commit to a short chase to erase the gap instead of re-arming a
          // telegraph on the spot (which stalls Sovereign at the range boundary).
          this._postHitLockFrames = Math.max(this._postHitLockFrames, 10);
        }
      }
    // Opening-range gate (see _openReach): at the very tip of reach a cold swing
    // is the highest whiff-risk, lowest-value commitment there is, and it was a
    // large share of the 155-swing / 1385-damage profile.
    } else if (d < _openReach && this.cooldown <= 0 &&
               Math.abs((this.y + this.h / 2) - (t.y + t.h / 2)) <= 70) {
      // Vertical gate: never wind up under a hovering/elevated player the blade
      // can't reach — Sovereign used to slow-telegraph endlessly below them.
      // Don't arm the telegraph against a player who just spawned — prevents spawn-kills
      if (t.invincible > 80) { this.aiReact = reactFrames; this._commit('hold_vs_invuln'); return; }
      // In range — arm the telegraph (visual tell before striking)
      // Real frames now (per-frame cadence): 14 → 8 as Sovereign evolves; ~6 after
      // limiter break. Short enough to pressure, long enough for a human read.
      // Trade-read commit: melee trades are first-mover-wins (Fighter trade
      // prevention cancels the later swing), so a full telegraph here means
      // losing every near-simultaneous exchange. On a high-confidence read that
      // the player is ABOUT to swing (but hasn't started — attacking into an
      // already-started swing still loses on start frame), collapse the wind-up
      // to 1 frame and beat them to the commit. This is the prediction engine
      // exploiting the trade rule; normal openers keep the full human-readable tell.
      const _tradeRead = this._predictedNext === 'attack' &&
                         this._predictConf >= 0.55 &&
                         !(t.attackTimer > 0);
      // Unbeatable tuning: wind-up collapsed to 1-3 frames (was 6-14). The
      // particle tell still fires, but the read window is gone.
      this._telegraphTimer = _tradeRead ? 1 : (lb ? 2 : 3);
      spawnParticles(this.cx(), this.cy(), '#ffaa00', 4);
      this.vx *= 0.35; // begin slowing as wind-up starts
      // Verbal cue — fires occasionally so the player has a chance to react
      if (typeof SMK2_ATTACK_WARN_LINES !== 'undefined' && Math.random() < 0.35) {
        if (typeof showBossDialogue === 'function')
          showBossDialogue(SMK2_ATTACK_WARN_LINES[Math.floor(Math.random() * SMK2_ATTACK_WARN_LINES.length)], 60);
      }

    } else if (_gateOn && !_openCommitted && d < weaponRange + 14 && d >= _openReach) {
      // Declining the tip-range fish must mean CLOSING, never hovering. Without
      // this the gate above just parks Sovereign a few pixels outside his own
      // reach and he stops attacking altogether — the dead-end state machine
      // that leaves a boss visibly idle. Pay the distance, then swing for real.
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.9;
      else if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.5; }
    }

    // ── ABILITY / SUPER ───────────────────────────────────────────
    // React to the player's observed ability/super usage profile.
    const tHasSuperReady = !!t.superReady;
    const tHasAbilityUp  = (t.abilityCooldown || 0) === 0;

    // Healer profile: player uses super when low HP — rush to interrupt the heal window
    if (this._superProfile === 'healer' && tHasSuperReady && tHpPct < 0.42 && d > prefDist) {
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.6;
    }
    // Opener profile: player super-as-range-opener — pre-dodge when they have charge at long range
    if (this._superProfile === 'opener' && tHasSuperReady && d > 140 && !playerAttacking) {
      const _od = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(_od) && this.cooldown <= 0) {
        this.vx = _od * moveSpd * 1.3;
        this._recordEvent('dodge', 3);
      }
    }
    // Finisher profile: player uses super as combo follow-up — dodge back after taking a hit
    if (this._superProfile === 'finisher' && tHasSuperReady && this._countRecent('dmg_taken', 25) >= 1) {
      const _fd = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(_fd)) {
        this.vx = _fd * moveSpd * 1.5;
        this._recordEvent('dodge', 4);
      }
    }
    // Poke ability profile: player ability-as-poke — close distance to deny the range window
    if (this._abilityProfile === 'poke' && tHasAbilityUp && d > 130 && !playerAttacking) {
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.2;
    }

    // Own ability / super: conversion is deterministic. Sovereign spends an
    // existing resource only on a guard, recovery, map-trap, finish, or survival
    // opportunity instead of rolling random neutral casts.
    if (this._tryTacticalConversion(t, d, weaponRange)) {
      this._updateFearFactor(d, recentLanded, true);
      this.aiReact = 0;
      this._commit('ability_super');
      return;
    }

    this._updateFearFactor(d, recentLanded, false);
    this._commit('neutral');

    // Debug: gated behind window.DEBUG_RECORDING to prevent frame spam
    if (window.DEBUG_RECORDING) {
      if (this._comboFollowHits > 2) console.log('[SOV] Combo follow hits remaining:', this._comboFollowHits, 'intelligence:', this.intelligence.toFixed(2));
      if (this._evolutionStage === 3 && this._evolutionPulse === 29) console.log('[SOV] Reached TYRANT stage — intelligence:', this.intelligence.toFixed(2));
    }

    this.aiReact = reactFrames;
  }

  // ══════════════════════════════════════════════════════════════
  // OVERRIDE: draw() — adds limiter break visual layer
  // ══════════════════════════════════════════════════════════════

  draw() {
    // Limiter break white flash overlay (screen-space, drawn before fighter)
    if (this._limiterFlashTimer > 0 && this.health > 0) {
      const fa = this._limiterFlashTimer / 25 * 0.45;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255,255,255,${fa.toFixed(3)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Limiter break secondary aura ring (under base draw)
    if (this._limiterBroken && this.health > 0) {
      const lp = this._limiterAuraPhase;
      const r  = 32 + Math.sin(lp) * 8;
      const a  = 0.18 + 0.12 * Math.sin(lp * 2.1);
      ctx.save();
      // Rapidly cycling red/white ring
      const t2 = (Math.sin(lp * 3) + 1) / 2; // 0–1
      const rr = Math.round(255);
      const gg = Math.round(t2 * 60);
      const bb = Math.round(t2 * 60);
      const grd = ctx.createRadialGradient(this.cx(), this.cy(), 8, this.cx(), this.cy(), r + 16);
      grd.addColorStop(0,   `rgba(${rr},${gg},${bb},${(a * 2.5).toFixed(3)})`);
      grd.addColorStop(0.5, `rgba(${rr},${gg},${bb},${a.toFixed(3)})`);
      grd.addColorStop(1,   `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(this.cx(), this.cy(), r + 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const distA = 0.04 + 0.03 * (Math.sin(lp * 4.4) * 0.5 + 0.5);
      ctx.fillStyle = `rgba(255,40,0,${distA.toFixed(3)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (this.health > 0 && settings.bossAura) {
      const p = this._intimidation;
      const evo = this._evolutionStage;
      if (p > 0.08 || evo > 0) {
        const pulseR = 28 + evo * 8 + Math.sin(this._intimidationPulse) * (4 + p * 7);
        const auraA  = 0.08 + p * 0.22 + evo * 0.03;
        ctx.save();
        const aura = ctx.createRadialGradient(this.cx(), this.cy(), 8, this.cx(), this.cy(), pulseR + 22);
        aura.addColorStop(0, `rgba(255,${Math.round(70 + p * 90)},${Math.round(20 + evo * 10)},${Math.min(0.95, auraA * 2.4).toFixed(3)})`);
        aura.addColorStop(0.45, `rgba(255,70,20,${auraA.toFixed(3)})`);
        aura.addColorStop(1, 'rgba(255,40,0,0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(this.cx(), this.cy(), pulseR + 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255,170,60,${(0.10 + p * 0.28).toFixed(3)})`;
        ctx.lineWidth = 1.5 + evo * 0.2;
        ctx.beginPath();
        ctx.arc(this.cx(), this.cy(), pulseR * 0.88, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Null Anchor tether flash — red line snapping from the fall point back to
    // the anchor, fading over ~22 frames.
    if (this._anchorFlashTimer > 0 && this._anchorTetherFrom) {
      this._anchorFlashTimer--;
      const _ta = this._anchorFlashTimer / 22;
      ctx.save();
      ctx.strokeStyle = `rgba(255,40,0,${(_ta * 0.8).toFixed(2)})`;
      ctx.lineWidth   = 1.5 + _ta * 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this._anchorTetherFrom.x, this._anchorTetherFrom.y);
      ctx.lineTo(this.cx(), this.cy());
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255,255,255,${(_ta * 0.6).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(this.cx(), this.cy(), 18 + (1 - _ta) * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (this._anchorFlashTimer === 0) this._anchorTetherFrom = null;
    }

    // Parent draw (aura + fighter body + "ADAPTING" label)
    super.draw();

    if (this.health > 0 && this.target && this._intimidation > 0.34) {
      const p = this._intimidation;
      const tx = this.target.cx();
      const ty = this.target.cy();
      const tr = 22 + p * 16 + Math.sin(this._intimidationPulse * 1.8) * 4;
      ctx.save();
      ctx.strokeStyle = `rgba(255,110,40,${(0.12 + p * 0.26).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(this.cx(), this.cy());
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = `rgba(255,180,90,${(0.18 + p * 0.30).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(tx, ty, tr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Limiter break label override
    if (this._limiterBroken && this.health > 0) {
      ctx.save();
      const flicker = 0.7 + 0.3 * Math.sin(this._limiterAuraPhase * 4.2);
      ctx.font      = `bold ${8 + Math.round(this.intelligence * 2)}px Arial`;
      ctx.textAlign = 'center';
      const t2 = (Math.sin(this._limiterAuraPhase * 3) + 1) / 2;
      const r2 = Math.round(255);
      const g2 = Math.round(t2 * 55);
      ctx.fillStyle = `rgba(${r2},${g2},0,${flicker.toFixed(2)})`;
      ctx.fillText('◉ LIMITER BREAK', this.cx(), this.y - 14);
      ctx.restore();
    }

    // Punish mode indicator
    if (this._punishModeActive && this.health > 0) {
      ctx.save();
      const pa = 0.55 + 0.35 * Math.sin(frameCount * 0.28);
      ctx.font      = 'bold 7px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,40,0,${pa.toFixed(2)})`;
      ctx.fillText('⚠ PUNISHING', this.cx(), this.y - (this._limiterBroken ? 24 : 14));
      ctx.restore();
    }

    if (this.health > 0) {
      ctx.save();
      const stageAlpha = 0.28 + this._evolutionStage * 0.12 + this._evolutionPulse * 0.008;
      ctx.font = 'bold 7px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,210,120,${Math.min(0.95, stageAlpha).toFixed(2)})`;
      ctx.fillText(`◆ ${SMK2_STAGE_NAMES[this._evolutionStage]}`, this.cx(), this.y - (this._limiterBroken ? 34 : 24));
      if (this._intimidation > 0.36) {
        ctx.fillStyle = `rgba(255,120,60,${(0.22 + this._intimidation * 0.52).toFixed(2)})`;
        ctx.fillText(`PRESSURE ${(this._intimidation * 100).toFixed(0)}%`, this.cx(), this.y - (this._limiterBroken ? 44 : 34));
      }
      if (this._dominantHabit && this._dominantHabitScore >= 3.2) {
        ctx.fillStyle = `rgba(255,210,140,${(0.18 + Math.min(0.55, this._dominantHabitScore * 0.08)).toFixed(2)})`;
        ctx.fillText(`COUNTER ${this._dominantHabit.toUpperCase()}`, this.cx(), this.y - (this._limiterBroken ? 54 : 44));
      }
      // Corner mode indicator — pulsing orange bracket when herding player to edge
      if (this._cornerMode) {
        const cpAlpha = 0.45 + 0.30 * Math.sin(frameCount * 0.22);
        ctx.fillStyle = `rgba(255,140,0,${cpAlpha.toFixed(2)})`;
        ctx.font = 'bold 7px Arial';
        ctx.fillText('◀ CORNERING ▶', this.cx(), this.y - (this._limiterBroken ? 64 : 54));
      }
      ctx.restore();
    }
  }
}

// ── Debug / console API for SovereignMK2 ─────────────────────
function showSovereignStats(on) {
  adaptiveAIDebug = !!on; // reuse parent's debug overlay
  console.log('[SovereignMK2] Stats overlay:', on ? 'ON' : 'OFF');
}
function showSovereignPredictions() {
  const ai = (typeof players !== 'undefined') && players.find(p => p.isSovereignMK2);
  if (!ai) { console.warn('[SovereignMK2] No active SovereignMK2 found.'); return; }
  console.log(`[SovereignMK2] Prediction brain: BehaviorModel (per-context bigram)`);
  console.log(`  Current read: ${ai._predictedNext || 'none'} @ ${(ai._predictConf * 100).toFixed(0)}%  [${ai._predictSource}]`);
  console.log(`  Recent actions: ${ai._actionSeq.slice(-12).join(' → ') || '(none)'}`);
  console.log(`Predictions: ${ai._predCorrect}/${ai._predTotal} correct (distinct reads)`);
  console.log(`Limiter broken: ${ai._limiterBroken}  |  Punish count: ${ai._punishModeCount}`);
  console.log(`Stage: ${SMK2_STAGE_NAMES[ai._evolutionStage]}  |  Pressure: ${(ai._intimidation * 100).toFixed(0)}%  |  Source: ${ai._predictSource}`);
}
function resetSovereignMK2() {
  const ai = (typeof players !== 'undefined') && players.find(p => p.isSovereignMK2);
  if (!ai) return;
  ai.aiMemory       = { ...ADAPTIVE_DEFAULTS };
  ai._eventBuffer   = [];
  ai._adaptTick     = 0;
  ai._adaptCycles   = 0;
  ai._actionSeq     = [];
  ai._lastAction    = 'idle';
  ai._lastTwoActions = ['idle', 'idle'];
  ai._limiterBroken = false;
  ai._limiterBreakDialogue = false;
  ai._punishModeActive = false;
  ai._punishModeTimer  = 0;
  ai._punishModeCount  = 0;
  ai._adaptivePunishRoute = 'direct';
  ai._adaptivePunishTimer  = 0;
  ai._bmActivePunish = null;
  ai._predictedNext = null;
  ai._predictConf   = 0;
  ai._predictSource = 'none';
  ai._predCorrect   = 0;
  ai._predTotal     = 0;
  ai._evolutionStage = 0;
  ai._evolutionPulse = 0;
  ai._intimidation = 0;
  ai._intimidationPulse = 0;
  ai._intimidationLineCd = 0;
  ai._intimidationPeak = false;
  ai._pressureMode = 'study';
  ai._pressureHoldTimer = 0;
  ai._studyBurstTimer = 0;
  ai._habitStats = {
    jump:   { count: 0, streak: 0, timer: 0, total: 0 },
    dodge:  { count: 0, streak: 0, timer: 0, total: 0 },
    attack: { count: 0, streak: 0, timer: 0, total: 0 },
    shield: { count: 0, streak: 0, timer: 0, total: 0 },
  };
  ai._lastHabitAction = 'idle';
  ai._dominantHabit = null;
  ai._dominantHabitScore = 0;
  ai._counterLockTimer = 0;
  ai._strategyFail     = {};
  ai._lockScored       = true;
  ai._counterCueCd = 0;
  ai._fearLineCd = 0;
  ai._dominanceZoomCd = 0;
  ai._flowBreakCd = 0;
  ai._guardBreakCd = 0;
  ai._repositionBurstCd = 0;
  ai._audioSpikeTimer = 0;
  ai._limiterReason = null;
  ai._shieldHoldFrames    = 0;
  ai._limiterStaggerTimer = 0;
  ai._reactLatch          = null;
  Object.assign(ai._exploit, { stallFrames:0, stallRespCd:0, edgeFrames:0, edgeRespCd:0, spamCount:0, spamTimer:0, spamRespCd:0, engageTimer:0 });
  // Platform + spatial + corner + post-KB resets
  ai._platVisits    = [];
  ai._platDecayTick = 0;
  ai._prefPlatIdx   = -1;
  ai._prevTgtOnGnd  = false;
  ai._zoneVisits    = [0, 0, 0];
  ai._prefZone      = 1;
  ai._plateCd       = 0;
  ai._plateRequests = 0;
  ai._cornerPressure = 0;
  ai._cornerMode     = false;
  ai._cornerSide     = 0;
  ai._cornerCd       = 0;
  ai._cornerEscapes  = 0;
  ai._postKB         = { attackBack: 0, shielded: 0, jumped: 0, retreated: 0 };
  ai._postKBArmed    = false;
  ai._postKBTimer    = 0;
  ai._postKBLastTgtHp = Infinity;
  ai._postKBLineCd   = 0;
  ai._sovereignEscapeCd = 0;
  ai._voidRecoverCd     = 0;
  ai._voidBoosts        = 0;
  ai._voidHopCd         = 0;
  ai._heavyThreatCd     = 0;
  ai._adaptiveMemoryState  = null;
  ai._adaptiveMemoryKey    = null;
  ai._adaptiveMemorySession = null;
  ai._adaptiveMemoryPending = false;
  if (typeof SovereignAdaptiveMemory !== 'undefined' && SovereignAdaptiveMemory &&
      typeof SovereignAdaptiveMemory.resetSession === 'function') {
    SovereignAdaptiveMemory.resetSession(ai.target || ai);
  }
  const _m = ai.aiMemory;
  ai.intelligence = (_m.aggression + _m.defense + _m.spacing + _m.reactionSpeed) / 4;
  ai._updateAuraColor();
  console.log('[SovereignMK2] Full reset.');
}


// ── PEAK TUNING ────────────────────────────────────────────────────────────
// The single definition of "the strongest Sovereign currently shipping". It
// used to live inline in _startGameCore, which meant the possession spirit
// (SovereignControl) — built straight from the constructor — silently ran a
// WEAKER Sovereign than the one you fight: limiter unbroken, pressure mode
// still 'study', evolution stage 0, and gated behind the observation warmup.
// Both callers now share this, so the two can no longer drift apart.
//
// `silent` skips the on-screen escalation the boss version is allowed to have.
// Possession must show no indicator, so it starts already AT the stage the real
// Sovereign reaches on his first tick (limiterBroken forces nextStage = 3),
// which keeps _updateEvolutionState's ratchet from ever firing its screen shake,
// particle burst and dialogue line.
function applySovereignPeakTuning(ai, opts) {
  if (!ai || !ai.aiMemory) return ai;
  const silent = !!(opts && opts.silent);
  // ── DIALS: PEAK IS A CEILING, NOT A STARTING POSITION ──────────────────────
  // This function is the ONLY thing that runs on the shipping path (_startGameCore
  // and SovereignControl) and does not run in SMK2Trainer, which builds fighters
  // straight from the constructor. So for a long time every measurement of the
  // starting dials was a measurement of the SIM's Sovereign, and the real one was
  // pinned here at 0.94/0.90/0.08/0.98 regardless.
  //
  // That pinning is exactly what adaptV2 exists to remove: at 0.88-0.98 every dial
  // is already against its own ease() ceiling, there is no headroom for the
  // opponent term to express, and he finishes every fight on the same values no
  // matter who he fought. Overwriting the constructor's headroom baseline here
  // would make adaptV2 inert in the only place that ships.
  //
  // Under adaptV2 the dials therefore keep their baseline and he EARNS the peak
  // within the fight. Everything else below is untouched — limiter, pressure mode,
  // evolution stage, intimidation and the skipped warmup are what "peak" means
  // apart from the dials, and none of them cap adaptation.
  if (!(typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.adaptV2)) {
    ai.aiMemory.aggression    = 0.94;
    ai.aiMemory.defense       = 0.90;
    ai.aiMemory.spacing       = 0.08;
    ai.aiMemory.reactionSpeed = 0.98;
    ai.intelligence           = 0.97;
  } else {
    const m = ai.aiMemory;
    // Derived, not asserted: a 0.97 intelligence on 0.60 dials is a number that
    // describes nobody, and _updateAuraColor and several gates read it.
    ai.intelligence = (m.aggression + m.defense + (1 - m.spacing) + m.reactionSpeed) / 4;
  }
  ai._limiterBroken         = true;
  ai._limiterBreakDialogue  = true;  // suppress opening "limiters withdrawn" line
  ai._adaptInterval         = 4;
  ai._pressureMode          = 'suffocate';
  ai._evolutionStage        = silent ? 3 : 2; // boss earns TYRANT on screen; possession starts there
  ai._intimidation          = 0.60;
  // Skip the observation warmup — Sovereign fights at full intelligence from frame 1
  ai._observationFrames     = 120;
  ai._actionSampleCount     = 10;
  if (typeof ai._updateAuraColor === 'function') ai._updateAuraColor();
  return ai;
}


// ── COMMIT LOG READOUT (dev) ───────────────────────────────────────────────
// Which branches of the updateAI() cascade actually win frames, and how often.
// The cascade is 70+ guards deep and its lower half has never been measured, so
// "score the ~30 tactical branches" is a plan resting on an untested assumption:
// that those branches fire at all. This answers that before any surgery.
//
// Session-wide, so a multi-life, multi-match headless run reads as one tally.
function sovCommitLog() {
  const out = Object.assign(Object.create(null), (typeof window !== 'undefined' && window.SOV_COMMIT_LOG) || {});
  let total = 0;
  for (const k of Object.keys(out)) total += out[k];
  const rows = Object.keys(out).map(k => ({ action: k, frames: out[k], pct: total ? +(100 * out[k] / total).toFixed(2) : 0 }))
                               .sort((a, b) => b.frames - a.frames);
  return { total, rows };
}

function sovCommitReset() {
  if (typeof window !== 'undefined') window.SOV_COMMIT_LOG = Object.create(null);
  const seen = (typeof players !== 'undefined' && players) ? players : [];
  for (const p of seen) { if (p && p._commitLog) { p._commitLog = Object.create(null); p._commitTotal = 0; } }
}

if (typeof window !== 'undefined') {
  window.sovCommitLog   = sovCommitLog;
  window.sovCommitReset = sovCommitReset;
}
