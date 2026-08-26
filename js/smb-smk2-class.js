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
window.SMK2_TUNE = window.SMK2_TUNE || { openGate: true, pressureDecay: true, lockCeiling: true, voidBoostMax: 3, recoverCeilAboveDeck: 200, jumpEconomy: true };

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
  const tgtHeavy = tw.weaponType === 'heavy' || (tw.cooldown || 30) >= 34;
  if (tgtHeavy) return lo.light ? 1.18 : 0.92;   // punish endlag with speed
  return lo.light ? 0.92 : 1.18;                 // out-range and out-knockback speed
}

class SovereignMK2 extends AdaptiveAI {
  constructor(x, y, color, weaponKey) {
    super(x, y, color, weaponKey);

    this.name           = 'SOVEREIGN Ω';

    // Override AdaptiveAI defaults — Sovereign starts near-peak, not at warmup level
    this.aiMemory = { aggression: 0.90, defense: 0.88, spacing: 0.12, reactionSpeed: 0.95 };
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
    this._areaDodgeCd  = 0;   // re-arm gate on area-hazard evasion

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
      }

      let strategy = this._getCounterStrategy();
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
  // the 45%-max-HP cap: Kratos rage (+1.5%/stack), Spartan Rage (+30%), map
  // power buff (+35%), and any flat dmgMult all compound in dealDamage.
  _targetDamageMult(t) {
    if (!t) return 1;
    let m = (typeof t.dmgMult === 'number' && t.dmgMult > 0) ? t.dmgMult : 1;
    if (t.charClass === 'kratos' && t.rageStacks > 0) m *= 1 + Math.min(t.rageStacks, 30) * 0.015;
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
    const domainPush = (this._domainSuperCount || 0) >= 3;

    // Stale-bank release is handled in _updateSuperBank(), which runs every frame
    // from update(). This function turned out to be reached only ~15 times a
    // minute and never once while superReady, so it is the wrong home for it.
    const _bankStale = !!this._bankStale;

    const superWindow = targetLocked || targetInHazard || finishable || selfNeedsSuper ||
      targetCursed || (targetArmored && targetBuffed) || this._punishModeActive || domainPush ||
      _bankStale;
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
      score -= _inFace ? 12 : 45;
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
        else                                   { u.viaNeither++; }
      }
    }
    this._selfPrevHp = this.health;
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

  // ── SWING DISCIPLINE — mind-level veto layer over Fighter.attack() ────────
  // Sovereign never donates a swing the engine's rules say cannot pay off:
  //   • i-frames: dealDamage() hard-returns while target.invincible > 0, so a
  //     swing whose contact frame lands inside the window hits nothing and
  //     burns cooldown + stamina. Wait it out (it's ≤16 frames mid-combo).
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
      if ((_t.invincible || 0) > this._meleeContactFrames() + 2) return;
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
    // Recovery-jump budget is per airborne stint, so it refills on contact with
    // the ground and nowhere else.
    if (this.onGround) this._recoverJumps = 0;
    this._checkLimiterBreak(this.target);
    this._updateSuperBank();
    this._updateNullRecoil();
    this._updateNullAnchor();
    this._vetoVoidStep();
    this._vetoSkyClimb();
    this._vetoExtraJump();
    super.update();
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
    const pool = SMK2_LOADOUTS.filter(lo =>
      typeof WEAPONS !== 'undefined' && WEAPONS[lo.wk] &&
      lo.wk !== 'gauntlet' && lo.wk !== 'mkgauntlet');
    if (!pool.length) return null;

    const tried = pool.reduce((n, lo) =>
      n + ((this._loadoutStats[lo.key] && this._loadoutStats[lo.key].lives) ? 1 : 0), 0);
    const eps = tried < 3 ? 0.30 : 0.10;
    if (Math.random() < eps) return pool[Math.floor(Math.random() * pool.length)];

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

    let best = null, bestScore = -Infinity;
    for (const lo of pool) {
      const rec  = this._loadoutStats[lo.key] || { lives: 0, dealt: 0 };
      const seed = lo.prior * scale;
      const mean = (seed + rec.dealt) / (1 + rec.lives);
      const score = mean * _smk2CounterBonus(lo, this.target);
      if (score > bestScore) { bestScore = score; best = lo; }
    }
    return best;
  }

  // Equip a loadout. The class contributes identity only — applyClass overwrites
  // maxHealth/health/classSpeedMult, which would silently rebalance him, so his
  // own stat line is restored immediately afterwards.
  _applyLoadout(lo) {
    if (!lo || typeof WEAPONS === 'undefined' || !WEAPONS[lo.wk]) return;
    this._loadout   = lo;
    this.weapon     = WEAPONS[lo.wk];
    this.weaponKey  = lo.wk;
    this._ammo      = 0;
    if (lo.cls && typeof applyClass === 'function') {
      // Snapshot LIVE, not from the constructor: startGame applies difficulty
      // boosts after construction (measured 150 -> 165 maxHealth), so a
      // constructor-time snapshot would silently nerf him ~9% on every respawn.
      const _hp  = this.maxHealth;
      const _spd = this.classSpeedMult || 1;
      applyClass(this, lo.cls);
      this.maxHealth      = _hp;
      this.health         = _hp;
      this.classSpeedMult = _spd;
    }
    // Signature kit routes to his own authored finisher, which is keyed in
    // CLASS_FINISHERS under 'nullblade' and was unreachable while he had no
    // charClass. Mirrors the _domainKey escape hatch.
    this._finisherKey = lo.fin || null;
    this._loadoutDealt0 = this.totalDamageDealt || 0;
  }

  respawn() {
    this._recordLoadoutResult();
    super.respawn();
    const lo = this._pickLoadout();
    if (lo) this._applyLoadout(lo);
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
  _updateSuperBank() {
    if (this.health <= 0) { this._superFullSince = 0; this._bankStale = false; return; }
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;

    if (!this.superReady) { this._superFullSince = 0; this._bankStale = false; return; }
    if (!this._superFullSince) this._superFullSince = _fc;

    // Full and unspent for ~6s. Below that he still gets to hold for a real read.
    this._bankStale = (_fc - this._superFullSince) > 380;
    if (!this._bankStale) return;

    // Don't fire it into nothing — it still has to be able to connect.
    const t = this.target;
    if (!t || t.health <= 0 || t.shielding) return;
    if (this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if ((this.attackEndlag || 0) > 0) return;
    const d = Math.hypot(t.cx() - this.cx(), t.cy() - this.cy());
    if (d > 240) return;

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
        // A beam telegraphs for 300 frames (5s) before it fires. Treating warning
        // and active alike meant five seconds of backing away from a harmless
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
  // OVERRIDE: updateAI() — full enhanced AI loop
  // ══════════════════════════════════════════════════════════════

  updateAI() {
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
      return; // fakeout frame — skip normal logic
    }

    // ── Danger: beams ─────────────────────────────────────────
    if (typeof bossBeams !== 'undefined' && bossBeams && bossBeams.length) {
      for (const beam of bossBeams) {
        if (beam.done) continue;
        if (Math.abs(beam.x - this.cx()) < 50) {
          const fd = this.cx() < beam.x ? -1 : 1;
          if (!this.isEdgeDanger(fd)) this.vx = fd * 8;
          if (this.onGround) this.vy = -18;
          return;
        }
      }
    }

    // ── Danger: lava ──────────────────────────────────────────
    if (currentArena && currentArena.hasLava && currentArena.lavaY) {
      if ((currentArena.lavaY - (this.y + this.h)) < 80 && this.onGround) {
        this.vx = this.cx() < GAME_W / 2 ? 6 : -6;
        this.vy = -18;
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
      return;
    }

    // ── LETHAL VOLLEY DEFENSE — outranks everything except staying on stage ──
    // A ramped homing-crescent fan is a one-volley stock loss; no punish window
    // or pressure plan is worth contesting it (replay-proven loss pattern).
    if (this._runVolleyDefense(t, d, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
      return;
    }

    // Telegraphed sky strikes and lingering zones — same priority tier as the
    // volley read: no punish window is worth eating a 4-bolt AoE super.
    if (this._runTelegraphedEvasion(t, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
      return;
    }

    // Learned evasion of a threat he has never been able to see. Runs last of the
    // three so anything actually perceptible is answered precisely first; this is
    // the fallback for the unknown, and it is the only one that covers a weapon
    // shipped after this code was written.
    if (this._runBlindEvasion(t, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
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
          return;
        }
        // At range while armed: drift centerward, never parked on a floor edge.
        if (this.x < 120 || this.x + this.w > GAME_W - 120) {
          const _cDir = this.cx() < GAME_W / 2 ? 1 : -1;
          if (!this.isEdgeDanger(_cDir)) this.vx = _cDir * moveSpd * 0.9;
        } else this.vx *= 0.7;
        this.aiReact = 0;
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

    // ── Danger: the floor itself is being deleted ──────────────────────────
    // Highest hazard priority: every other threat here can be traded with, and
    // this one cannot — when the deck goes there is no ground to fight on. See
    // _runFloorHazard().
    if (this._runFloorHazard(moveSpd, _jumpVy)) { this.aiReact = 0; return; }

    // ── Danger: boss / arena set-piece hazards (leave the zone) ────────────
    // Runs before the projectile scan because these hit harder and telegraph
    // longer. See _scanAreaThreats().
    if (this._scanAreaThreats(moveSpd, _jumpVy)) { this.aiReact = 0; return; }

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
        if (!this.isEdgeDanger(_lDir)) { this.vx = _lDir * moveSpd * 1.5; this.aiReact = 0; return; }
      } else {
        this.vx *= 0.55;                              // camped under the landing spot
        if (this.cooldown <= 0 && d < weaponRange + 8 &&
            Math.abs((this.y + this.h / 2) - (t.y + t.h / 2)) <= 70) {
          this._strike(t);                            // clip them on the way down
        }
        this.aiReact = 0;
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
      return;
    }

    // Every class has a domain (every 5th super triggers an expansion), so read
    // the DomainManager registry generically rather than per-class flags.
    const _tOwnsDomain = typeof DomainManager !== 'undefined' && DomainManager.domains &&
                         DomainManager.domains.some(dm => dm && dm.owner === t);
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
      return;
    }

    // ── SOVEREIGN ESCAPE: when backed to own edge, jump over player to reverse corner ──
    if (this._runSovereignEscape(t, dir, moveSpd, _jumpVy)) {
      this.aiReact = 0;
      return;
    }

    if (this._runFlowBreak(t, dir, d, moveSpd, weaponRange, playerAttacking, recentTaken)) {
      this.aiReact = 0;
      this._updateFearFactor(d, recentLanded, true);
      return;
    }

    // ── CORNER EXPLOIT: player is near edge — block escape, attack aggressively ──
    if (this._runCornerExploit(t, dir, d, moveSpd, atkRange)) {
      this.aiReact = this._limiterBroken ? 0 : Math.max(0, reactFrames - 1);
      this._updateFearFactor(d, recentLanded, true);
      return;
    }

    // ── B. Punish mode: ignore defense, go full offense ───────
    if (this._punishModeActive) {
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
          return;
        }
      }
      // Predicted jump / dodge / shield (and cornered or airborne attack reads) →
      // the multi-frame preempt: anti-air landing, intercept, or guard-break.
      if (this._applyPredictionCounter(t, dir, d, moveSpd)) {
        this.aiReact = reactFrames;
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
    if (playerAttacking && d < 210 && this.shieldCooldown === 0 && this._shieldHoldFrames === 0 && effDef > 0.55) {
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
        return;
      }
    }

    if (this._runHardCounter(t, dir, d, moveSpd, weaponRange, atkRange, playerAttacking)) {
      this.aiReact = this._limiterBroken ? 0 : Math.max(0, reactFrames - 1);
      this._updateFearFactor(d, recentLanded, true);
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
        return;
      }
      const route = this._adaptivePunishRoute || this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
      if (route === 'delayed' && this._adaptivePunishTimer > 0) {
        this.vx *= 0.60;
        this.aiReact = 0;
        return;
      }
      if (route === 'crossup' && this.onGround && d < 210) {
        this.vy = _jumpVy;
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.75;
        this.aiReact = 0;
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
        return;
      } else if (!this.isEdgeDanger(dir)) {
        // Out of range: sprint at maximum speed — NEVER abandon a punish window
        this.vx = dir * moveSpd * 2.5;
        if (this.onGround && t.y < this.y - 50) this.vy = _jumpVy;
        this.aiReact = 0;
        return;
      } else if (this.onGround || this.canDoubleJump) {
        // Edge danger: jump over the player to continue the chase
        if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.85; }
        else { this.vy = -15; this.canDoubleJump = false; this.vx = dir * moveSpd * 0.6; }
        this.aiReact = 0;
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
    if (this._baitTimer > 0) {
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
      return;
    }

    const finishMode = finishPush;
    const canBait    = this.intelligence > 0.55 && this._baitCooldown === 0 && !finishMode && d < 140 && d > prefDist * 0.8;
    const baitStyleBoost = (_bmRead.style === 'defensive' || _bmRead.style === 'passive') ? 1.25 : 1.0;
    if (canBait && this.intelligence > 0.70 && Math.random() < (0.001 + this.intelligence * 0.0014) * (_bmBias.baitBoost || 1.0) * baitStyleBoost * memoryBait / (1 + (this._baitIgnoredStreak || 0))) {
      this._baitTimer = Math.round(18 + this.intelligence * 20);
    }

    // ── PLATFORM CONTROL: contest player's favourite platform ─
    if (!finishMode && this._runPlatformControl(t, dir, d, moveSpd)) {
      this.aiReact = Math.max(1, reactFrames);
      return;
    }

    // ── MID-APPROACH EVASION ──────────────────────────────────
    // Player attacks while Sovereign is outside attack range — without this check
    // the movement code runs and Sovereign walks straight into the hit.
    if (playerAttacking && d > atkRange && d < 240) {
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
      return;
    }

    // ── BREATHING ROOM — back off after sustained aggression ─────
    // Gives the player a clear window to move, reposition, and counter-attack.
    if (this._restCooldown > 0) this._restCooldown--;
    if (this._restTimer > 0) {
      this._restTimer--;
      this._telegraphTimer = 0; // cancel any pending telegraph during rest
      if (!this.isEdgeDanger(-dir)) this.vx = -dir * moveSpd * 0.38;
      else this.vx *= 0.55;
      this.aiReact = 3;
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
      if (t.invincible > 80) { this.aiReact = reactFrames; return; }
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
      return;
    }

    this._updateFearFactor(d, recentLanded, false);

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
