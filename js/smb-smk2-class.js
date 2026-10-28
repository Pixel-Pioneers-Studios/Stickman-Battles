'use strict';
// smb-smk2-class.js: SovereignMK2 class (extends AdaptiveAI) and debug/console API
// Depends on: smb-globals.js, smb-adaptive-ai.js

// A/B switches: each flag gates one branch, so flipping it changes only that branch.
// Defaults are the shipping behaviour. voidBoostMax caps recovery boosts per airborne stint.
// recoverCeilAboveDeck is px above the floor a recovery boost may fire (the old -60 ceiling
// sat above the screen). jumpEconomy enforces 1 ground + 1 air jump (see _vetoExtraJump).
// Kill-credit gate: defensive, since a throw in update() is swallowed by the trainer.
function _KC() {
  return typeof window !== 'undefined' && window.SMK2_TUNE ? !!window.SMK2_TUNE.killCredit : false;
}

window.SMK2_TUNE = window.SMK2_TUNE || { openGate: true, pressureDecay: true, lockCeiling: true, voidBoostMax: 3, recoverCeilAboveDeck: 200, jumpEconomy: true, edgePressure: true, ringoutGuard: true,
  // Inert when false: the gate returns before touching SovHabits or vy.
  habitAir: true,
  // Inert when false: the gate returns before touching SovHabits, vy, vx or attack.
  habitDescent: true,
  // Move book (js/smb-sov-combo.js, data js/smb-sov-movebook.js). comboRoutes:
  // follow-up after a hit. counterBook: answer an opponent's move three frames in.
  // Inert when false.
  comboRoutes: false,
  counterBook: false,
  // Routes may spend ability and super (see SovMoves.routeAvail).
  routeSpend: true,
  // Choose the class for the weapon already chosen (see _pickOpenLoadout).
  pairedClass: false,
  // descentDamage: C2 also weighs net damage per arm. Off: the human proxy did not
  // reproduce the punish it targets (t=-1.72), so it is unproven, not disproven.
  descentDamage: false,
  // Kill-floor governor: max damage bonus when the player leads on stocks. 0 = off.
  killFloor: 1.0,
  // Tactic ledger (see _airApproachGuard). airDenyAt: net health per attempt
  // before the approach is vetoed.
  tacticLedger: true, airDenyAt: -4, tacticExplore: 0.2,
  // One-strike scars (see _scarTick): a method that let the opponent open on him
  // is barred for the rest of the match. Inert when false.
  scars: true,
  // swingHold: _swingGate drops a swing whose cell nets below swingHoldAt per
  // try even when guarding there is no better (see _swingGate).
  swingHold: true, swingHoldAt: -8,
  // Grid-driven super release (see _gridWantsSuper). ON: stocks +0.059 (t=2.48) over
  // 2880 matches/arm. It is the only live reader of the tactic grid, and it spends
  // supers where they convert, not where they look big.
  superGate: true, superGateMargin: 8,
  // Tactical plans (see _planTick). OFF: non-positive in every config tried. Kept
  // wired because bait_whiff_punish beat parry_wall in 4 of 4 runs.
  tacticPlans: false, planHold: 90, planExplore: 0.2, planSteer: false,
  // Run the plan layer as a gambler (see _gambleTick) instead of epsilon-greedy.
  planGamble: false,
  baitPunisher: false, baitMinHits: 8, baitRate: 0.5,
  // Start the adaptation dials low instead of hand-set near ceiling.
  freshDials: false, freshLevel: 0.45, dialProbe: false,
  // Budget the self-referential terms so the opponent offsets in _applyAdaptation
  // are reachable. See smb-adaptive-ai.js.
  oppAdapt: true,
  // adaptV2: pairs with oppAdapt. Either half alone is wiped out by the 0.90
  // baseline or the saturated target. ON: opponent-specific adaptation, aggression
  // spread across opponents 0.019 -> 0.122. Stocks +0.033, costs nothing.
  adaptV2: true, adaptV2Base: 0.60,
  // Attacker-count term in _oppAdaptTerms. Only meaningful with adaptV2.
  swarmTerm: true,
  // Credit a kill as the mirror of the death penalty instead of 0. A correction,
  // not an addition: otherwise a closed stock scores 0 in every artifact.
  killCredit: true,
  // swingGate: OFF. Fired zero times in six runs, its two cells never coexist.
  swingGate: false,
  // Only treat an opponent as armed once they have spent the ability. 'Available'
  // used to count as armed, which put 47.7% of frames in the standoff branches.
  // ON: stocks +0.161 (t=2.81), costs 1.2pp locked, the price of engaging.
  volleyArmedRead: true,
  // Opponent-conditioned tactic selection (see the block above _commit). choiceDenyAt is the net
  // health per commit before a branch yields to this opponent. ON: the tactic now prices differently
  // per opponent, with no measured cost.
  tacticChoice: true, choiceDenyAt: -2, choiceExplore: 0.15,
  // freeSwing: take a ready swing on a target in reach when the cascade did not (see _freeSwing).
  freeSwing: true,
  // stratTerms: strategic adaptation layer (_strategicTerms).
  stratTerms: true,
  // curseAvoid: steer out of a curse pickup's collection ring. See _avoidCurses.
  curseAvoid: true,
  // infer: prediction failure -> hypothesis engine (see the inference block).
  // Required by inferAct.
  infer: true,
  // curiosity: optimistic judgement of under-sampled actions. See the not-knowing block.
  curiosity: false, curiosityK: 1.0,
  // experiment: bounded deliberate tests per life. Needs infer. See the intervention block.
  experiment: false, experimentBudget: 3,
  // inferAct: act on the rules infer states, cancelling a swing its rule says cannot
  // land. Needs infer. inferActZ is the Wilson-bound confidence. inferActExplore leaves
  // a share of matching swings alone so the rule keeps getting honest samples.
  inferAct: true, inferActZ: 1.28, inferActExplore: 0.15,
  // openLoadout: pick from every legal weapon and class, learning only from his own
  // per-life results (see _pickOpenLoadout). Off = the curated SMK2_LOADOUTS bandit.
  openLoadout: true,
  // innateArsenal: open with SOV_ARSENAL (js/smb-sov-arsenal.js).
  innateArsenal: true,
  // innateMemory: seed inference with SOV_MEMORY (js/smb-sov-memory.js). Off while
  // sov-memory-build.js regenerates it, so it cannot feed itself.
  innateMemory: true,
  // discovery: residual-based exploit detection (see _scoreSurprise). discoverySigma
  // is in units of his running |residual|.
  discovery: false, discoverySigma: 2.5, discoveryWindow: 600, discoveryYield: 0.6,
  discoveryLog: false };

// Owner-attached hazards. Weapon abilities keep live hazards on the wielder instead
// of a Projectile, so the projectile pools never see them. Every scan reads this
// one list, so a hazard added here is seen everywhere.
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

// Hazards owned by any fighter that is not Sovereign or an ally. Scans used to read
// only the current target, which left 3+ fights blind.
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

// Loadout pool. No ranged kits (33 dealt/1k vs katana's 244), no admin-only weapons, no shield.
// prior: replay damage per 1000 frames, seeds the bandit. cls must be null or match wk, or the
// class finisher will not fire.
const SMK2_LOADOUTS = [
  { key: 'signature', wk: 'nullblade', cls: 'berserker', fin: 'nullblade', prior: 150, light: 1 },
  { key: 'ronin',     wk: 'katana',    cls: 'ronin',     fin: null,        prior: 244, light: 1 },
  { key: 'ninja',     wk: 'sword',     cls: 'ninja',     fin: null,        prior: 214, light: 1 },
  { key: 'reaper',    wk: 'scythe',    cls: 'reaper',    fin: null,        prior: 146, light: 0 },
  { key: 'torren',    wk: 'hammer',    cls: 'thor',      fin: null,        prior: 139, light: 0 },
  { key: 'varek',     wk: 'axe',       cls: 'kratos',    fin: null,        prior: 139, light: 0 },
  { key: 'pugilist',  wk: 'combat',    cls: 'pugilist',  fin: null,        prior: 138, light: 1 },
];

// Counter prior: heavy weapons get answered by light ones, light ones by reach.
// Kept to +/-18% so it biases opening picks without overriding measurement.
function _smk2CounterBonus(lo, tgt) {
  if (!lo || !tgt || typeof WEAPONS === 'undefined') return 1;
  const tw = WEAPONS[tgt.weaponKey];
  if (!tw) return 1;
  // weaponType is authored, so trust it. Endlag is the punishable window, not
  // cooldown (spear recovers in 12 frames).
  const tgtHeavy = tw.weaponType ? tw.weaponType === 'heavy'
                                 : (tw.endlag || 10) >= 16;
  // Speed prior only where there is endlag to punish. The reach term below tells
  // a brawler apart from a poker.
  let bonus = tgtHeavy ? (lo.light ? 1.18 : 0.92) : 1;
  // Reach: melee vs melee only. Without it he countered an 80-reach hammer into a
  // 130-reach spear and walked into pokes all match.
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

    // Hand-set dials, above AdaptiveAI's defaults. freshDials starts him low instead,
    // so _applyAdaptation has room to climb.
    const _fl = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && typeof SMK2_TUNE.freshLevel === 'number')
      ? SMK2_TUNE.freshLevel : 0.45;
    // adaptV2 baseline. Needs ease() headroom for the opponent offset to matter.
    // spacing is set directly: its ease band is [0, 0.34], so a mirrored value would
    // be pulled down on the first cycle.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.adaptV2) {
      const _b = (typeof SMK2_TUNE.adaptV2Base === 'number') ? SMK2_TUNE.adaptV2Base : 0.60;
      this.aiMemory = { aggression: _b, defense: _b, spacing: 0.20, reactionSpeed: _b };
      this._adaptV2 = true;
    } else
    this.aiMemory = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.freshDials)
      ? { aggression: _fl, defense: _fl, spacing: 1 - _fl, reactionSpeed: _fl }
      : { aggression: 0.90, defense: 0.88, spacing: 0.12, reactionSpeed: 0.95 };
    this.isSovereignMK2 = true;

    // No charClass, so DomainManager finds his domain by this key (DOMAIN_DEFS.sovereign).
    // Same cost as the player's: five supers per life.
    this._domainKey = 'sovereign';

    // Loadout state (see SMK2_LOADOUTS, _pickLoadout). He picks a kit like a strong
    // player. A class adds its perks, abilities and finisher, never hp or speed.
    this._loadout       = null;   // active SMK2_LOADOUTS entry
    this._loadoutLocked = false;  // true once the match's kit is chosen (see _ensureMatchLoadout)
    this._loadoutStats  = {};     // key -> { lives, dealt } bandit record
    this._loadoutDealt0 = 0;      // totalDamageDealt at the start of this life
    this._baseMaxHealth = this.maxHealth;   // construction-time reference only
    this._baseSpeedMult = this.classSpeedMult || 1;

    // Hop steering and projectile dodge
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

    // One decision per frame, overriding Fighter's 15-frame AI_TICK_INTERVAL. Every
    // timer here is in frames, so the stock cadence ran each behaviour 15x slower
    // than designed. Stochastic gates are rescaled by ~1/5 to keep event rates.
    this.aiTickInterval = 1;

    // Genome from the localStorage champion, else the default. applyGenome(g)
    // overrides it (used by SMK2Trainer self-play).
    this._genome = (typeof SMK2Trainer !== 'undefined')
      ? SMK2Trainer.loadChampion()
      : { ...SMK2_DEFAULT_GENOME };
    this._applyGenomeToMemory();
    // Story mode uses AdaptiveAI directly, not this class.

    // Prediction reads BehaviorModel's per-context bigram. _actionSeq is a short
    // habit buffer for the escape and dodge reads that model does not cover.
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

    this._spamWindow    = { action: null, count: 0, timer: 0 };
    this._punishModeActive = false;
    this._punishModeTimer  = 0;        // frames remaining in punish mode
    this._punishModeCount  = 0;        // total activations (increases severity)
    this._punishDialogueCd = 0;
    this._adaptivePunishRoute = 'direct';
    this._adaptivePunishTimer  = 0;

    this._limiterBroken       = false;
    this._limiterBreakDialogue = false; // fired once
    this._limiterAuraPhase    = 0;
    this._limiterFlashTimer   = 0;     // white flash on break

    this._evolutionStage      = 0;     // 0..3
    this._evolutionPulse      = 0;
    this._intimidation        = 0;     // 0..1 pressure meter
    this._intimidationPulse   = 0;
    this._intimidationLineCd  = 0;
    this._intimidationPeak    = false;
    this._pressureMode        = 'study'; // study|suffocate
    this._pressureHoldTimer   = 0;
    this._studyBurstTimer     = 0;

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

    this._humanFakeoutDir   = 0;   // -1|0|1 direction of current fakeout
    this._humanFakeoutTimer = 0;
    this._humanMissArmed    = false; // intentional "whiff" this tick

    this._shieldHoldFrames   = 0;  // counts down; drops shield at 0 (replaces setTimeout)
    this._limiterStaggerTimer= 0;  // grace window when player combos Sovereign in LB
    this._limiterStaggerCd   = 0;  // cooldown: prevents stagger from being farmed

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

    this._adaptInterval = 5; // ~12×/sec vs inherited 8 (~7.5×/sec)

    // Hard counters unlock after four decision frames and one meaningful action. The
    // BehaviorModel confidence gate still applies, so this is fast adaptation, not a guess.
    this._observationFrames  = 0;   // incremented every AI tick
    this._actionSampleCount  = 0;   // non-idle actions seen
    this._adaptLockTimer     = 0;   // frames remaining on locked strategy
    this._lockedCounterStrategy = null; // 'anti-air'|'parry'|'guard-break'|'intercept'|'pressure'|null
    // Decaying failure tally per strategy. A locked counter that keeps letting the
    // player through switches laterally.
    this._strategyFail       = {};  // { strategy: failCount }
    this._lockScored         = true; // has the current lock been scored for success/failure?

    // Per-opponent targeting. updateAI() replaces Fighter.updateAI(), which also skipped
    // target validation and the 25-tick nearest-enemy re-check. Without them he could
    // stay on a dead or unreachable target for the whole match.
    this._threatLedger   = new Map(); // fighter -> { dmg, lastFrame } decaying damage tally
    this._retargetDwell  = 0;         // frames on the current target (hysteresis floor)
    this._peripheralCd   = 0;         // gate on off-target punish swings (see PERIPHERAL PUNISH)
    this._threatSeenFrame = -1;       // last attribution stamp already folded in
    // One BehaviorModel per opponent. A shared one blended two players' habits.
    // Saved and restored on every switch.
    this._oppMemory      = new Map(); // fighter -> saved profile bundle

    // Force engagement. Entered when the player stays far and idle, and overrides
    // movement priority. Speed and cooldowns are untouched.
    this._forceEngageDistFrames = 0;  // frames player has been > FORCE_DIST_THRESHOLD away
    this._forceEngageIdleFrames = 0;  // frames since player last attacked
    this._forceModeActive       = false;
    this._forceModeCloseFrames  = 0;  // frames spent within close range during force mode
    this._FORCE_DIST_THRESHOLD  = 180; // px, "player is staying far"
    this._FORCE_DIST_FRAMES     = 45;  // ~0.75 sec continuously far
    this._FORCE_IDLE_FRAMES     = 45;  // ~0.75 sec since player last attacked
    this._FORCE_CLOSE_NEEDED    = 22;  // frames close (<140px) needed to exit force mode
    this._jumpCooldown          = 0;   // frames until next upward-chase jump is allowed

    // Platform preference: the non-floor platform the player lands on most. Used for
    // denial and landing punishes.
    this._platVisits    = [];       // sparse array: [platformIndex] → weighted visit count
    this._platDecayTick = 0;        // periodic decay counter
    this._prefPlatIdx   = -1;       // -1 = no strong preference yet
    this._prevTgtOnGnd  = false;    // edge-detect landing (previous tick onGround)

    // Zone profile: left, centre and right thirds. Approaches from the player's weaker side.
    this._zoneVisits = [0, 0, 0];   // [left, center, right] visit counts (decaying)
    this._prefZone   = 1;           // 0=left, 1=center, 2=right

    // Board control (The Circuit only): the plate is a real action there, so he slides
    // the voids to where the player likes to stand. Inert on other arenas.
    this._plateCd       = 0;        // frames until he may move the plate again
    this._plateRequests = 0;        // accepted slides this match (debug/telemetry)

    // Corner pressure: near an edge he takes the stage side of the player to cut off
    // centre escape, attacks more often, and aims to knock them off.
    this._cornerPressure  = 0;      // 0..1 accumulator, how cornered the player is
    this._cornerMode      = false;  // true while actively exploiting cornered position
    this._cornerSide      = 0;      // -1=left-edge, +1=right-edge
    this._cornerCd        = 0;      // cooldown frames before next corner-mode activation
    this._cornerEscapes   = 0;      // times player successfully escaped a corner (adapts herding)

    // Knockback response profile: what the player does in the ~45 frames after a
    // confirmed hit. Feeds _runHardCounter's strategy choice.
    this._postKB = { attackBack: 0, shielded: 0, jumped: 0, retreated: 0 };
    this._postKBArmed       = false;  // observing player response right now
    this._postKBTimer       = 0;      // frames remaining in observation window
    this._postKBLastTgtHp   = Infinity;
    this._postKBLineCd      = 0;      // cooldown for post-KB dialogue

    this._sovereignEscapeCd = 0;      // cooldown: jump over player to reverse corner
    this._voidRecoverCd     = 0;      // emergency recovery cooldown after edge launch
    this._voidBoosts        = 0;      // recovery boosts used this airborne stint (resets on landing)
    this._voidHopCd         = 0;      // cooldown on the gap-hop the void-step veto issues
    this._floorHopCd        = 0;      // cooldown on the boss-floor evacuation hop
    this._heavyThreatCd     = 0;      // short memory for high-knockback weapons

    // Learning only: sample every decision frame and weight recent exchanges above
    // stale history. Movement and damage are untouched.
    this._behaviorModel._decayRate     = 0.990;
    this._behaviorModel._decayInterval = 1;

    // Tactical state, refreshed each decision frame from live arena and combat state.
    this._mapTacticalState = { selfHazard: null, targetHazard: null };

    // Adaptive memory bridge state (local session + Supabase priors)
    this._adaptiveMemoryState   = null;
    this._adaptiveMemoryKey     = null;
    this._adaptiveMemorySession  = null;
    this._adaptiveMemoryPending  = false;

    // Null Anchor: while grounded on the main floor he stakes a point, and a fatal
    // fall tethers him back to it. Has a real cooldown.
    this._anchorX          = x;
    this._anchorY          = y;
    this._anchorCd         = 0;
    this._anchorFlashTimer = 0;
    this._anchorTetherFrom = null;
    // Null Recoil: juggle break. See _updateNullRecoil().
    this._recoilCd         = 0;
    this._recoilHits       = 0;
    this._recoilLastFrame  = -9999;
    this._recoilSeenFrame  = -9999;
    this._recoilFlash      = 0;

    // Spawn protection: a brief defensive burst so he does not run into a hammer swing
    // the moment he spawns. Set in onDeath(), counts down in updateAI().
    this._spawnDefendTimer  = 0;
    this._spawnDefendJumped = false; // one escape jump per respawn, a repeated jump arc is a free read

    // Post-hit commitment: skip distance re-checks for N frames after a hit, so
    // knockback that pushes the target past prefDist does not trigger a retreat.
    this._postHitLockFrames    = 0;

    // Dodge-to-chase: commit to pursuit at boosted speed for N frames after a dodge.
    this._commitToChaseFrames  = 0;
    this._chaseDirection       = 0; // locked approach direction set at dodge time

    // Punish mode: hold suffocate pressure N frames after the punish timer ends.
    this._pressureCooldownFrames = 0;

    // After a correct prediction, boost approach speed and ability use so reads matter.
    this._predictionBoostFrames  = 0;

    // Stop-short pause in a punish rush, to break the fixed timing players exploit.
    this._punishFakeoutTimer   = 0;

    // Breathing room: after a combo he backs off so the player can reposition.
    // _telegraphTimer is a brief wind-up before the first strike.
    this._restTimer         = 0;  // frames of forced rest (backs off, no attacks)
    this._restCooldown      = 0;  // prevents resting too frequently
    this._aggressionStreak  = 0;  // combo sequences fired; triggers rest when high enough
    this._telegraphTimer    = 0;  // pre-attack wind-up pause frames

    this._deathCount          = 0;    // respawn counter this match
    this._deathRecord         = null; // kill context snapshot; consumed on first tick of next life

    this._openingPriorApplied = false; // fires once per match on first full observation tick

    // Tactic ledger. Dials say how hard he fights, not that a decision loses, so decisions are
    // keyed by name and scored by measured consequence.
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
    this._scarBook      = new Map();  // target -> { air:Set, chase, descent:Set, swing:Set } (match-scoped)
    this._scarWatch     = [];         // open windows: what he is doing that a hit would indict
    this._scarLog       = [];

    this._endlagWindow        = 0;    // frames remaining in opponent's post-swing recovery

    // A string that keeps landing earns extra hits. A whiff ends it. Raises damage
    // per opening, not swing volume. Hard-capped, and dealDamage's limiter still
    // breaks strings, so this cannot become infinite.
    this._comboPrevTgtHp  = Infinity;
    this._comboLandedLast = false;
    this._comboExtensions = 0;
    // At 2 this made 4-hit chains common and tripled 3+ chains, which reads as
    // unbreakable. 1 keeps the gain without the lock.
    this._COMBO_EXT_MAX   = 1;

    // One defensive read per player attack, latched on the rising edge so a
    // multi-frame swing is a single read. Cleared when the player stops attacking.
    this._reactLatch          = null; // { react: bool } | null

    // Blind threat learning. Learns the shape of an unseen threat ("I lost health at
    // range 300 about 20 frames after their ability") without knowing its identity,
    // so weapons that do not exist yet are covered too.
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

    this._prevTAbilityCd  = 0;
    this._prevTSuperReady = false;
    this._superProfile    = 'unknown';
    this._abilityProfile  = 'unknown';
    this._profileUpdateCd = 0;
    // Fires once per match when the profile first resolves, so the read is visible.
    this._profileSaidSuper   = false;
    this._profileSaidAbility = false;
  }


  onDeath() {
    // Commit before super.onDeath() runs the base _applyAdaptation, so the dials
    // are the ones this life actually used.
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
    // Sovereign Slayer is paid for winning the match, not for one stock (endGame, smb-drawing-arenas.js).
  }


  applyGenome(g) {
    this._genome = Object.assign({ ...SMK2_DEFAULT_GENOME }, g);
    this._applyGenomeToMemory();
  }

  _applyGenomeToMemory() {
    const g = this._genome;
    // freshDials must survive this. applyGenome() runs right after construction and
    // overwrites aggression, spacing and reactionSpeed, but not defense. Only defense
    // carries the fresh value into the match.
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


    // Short local action buffer. Prediction comes from BehaviorModel (see
    // _updatePrediction). _actionSeq feeds _getCounterStrategy and the habit fallback
    // for escape and dodge.
  _recordActionBigram(action) {
    if (action === 'idle' && this._lastAction === 'idle') return; // skip idle→idle noise
    this._actionSeq.push(action);
    if (this._actionSeq.length > 32) this._actionSeq.shift();
    this._lastTwoActions = [this._lastTwoActions[1], action];
    this._lastAction = action;
  }

    // Prediction comes from BehaviorModel's per-context bigram. The habit window over
    // _actionSeq is the fallback for actions it does not classify, such as dodge.
    // _predTotal only counts changes, so the ratio tracks distinct reads.
  _updatePrediction(bmPred) {
    const mapped = this._bmActionToTag(bmPred && bmPred.action);
    if (mapped && bmPred.confidence > 0) {
      if (this._predictedNext !== mapped) this._predTotal++;
      this._predictedNext = mapped;
      this._predictConf   = bmPred.confidence;
      this._predictSource = 'behaviormodel';
      return;
    }

    // Fallback: local habit window, catches escape/dodge and simple repeats.
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

    // Style shift: many different recent actions lower confidence, so stale
    // predictions do not fire on a varied opponent.
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

    // Map BehaviorModel's PA enum to Sovereign's preempt tags. Null for idle, walk and
    // land, which fall through to the habit read.
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
      if (this._preemptTarget === 'attack') {
        // Pre-dash back, create distance to whiff their attack
        const safeDir = (this.x < this._wbL() + 100) ? 1 : (this.x + this.w > this._wbR() - 100) ? -1 : -dir;
        if (!this.isEdgeDanger(safeDir)) this.vx = safeDir * moveSpd * (2.2 + this._evolutionStage * 0.14);
      } else if (this._preemptTarget === 'jump') {
        // Anti-air: pre-position at the projected landing zone. Falls back to closing in
        // when the target is still grounded and no landing spot is predictable.
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

    // Arm a preemptive action. A lower confidence floor means earlier reads. The
    // re-arm cooldown stops a sustained read from strobing him between pre-dash and
    // normal movement.
    if (this._preemptRearmCd > 0) { this._preemptRearmCd--; return false; }
    if (this._predictConf >= (0.50 - this._evolutionStage * 0.03) && d < 240) {
      this._preemptRearmCd = 22;
      this._preemptTimer  = Math.max(3, 5 - this._evolutionStage);
      this._preemptTarget = this._predictedNext;
      this._preemptMode   = true;
      // Visual tell, so the player sees the shift before their input lands.
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
      // Reward for a correct read: 1.5 sec of boosted attack rate and approach.
      this._predictionBoostFrames = 90;
      // Occasional 'called it' line.
      if (this._predictDialogueCd <= 0 && Math.random() < 0.35) {
        showBossDialogue(SMK2_PREDICT_LINES[Math.floor(Math.random() * SMK2_PREDICT_LINES.length)], 100);
        this._predictDialogueCd = 300;
      }
    }
    if (this._predictDialogueCd > 0) this._predictDialogueCd--;
  }

  // B. PUNISHMENT SYSTEM

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
      // Hold suffocate pressure for 1 sec after punish ends, so the reset is not abrupt.
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

  // Dossier: what he knows about this opponent. _oppMemory dies with the match, so a rematch would
  // be a stranger. Keyed on kit and archetype, so it persists. Priors are blended by confidence.
  _seedFromDossier(t, kitOnly) {
    // Trained-artifact prior: what training learned about the game, seeded before the dossier guard.
    // gridPrior() scales cells to PRIOR_CAP tries, so one fight can overturn it. Dossier cells win ties.
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

    // The grid is seeded whole, not blended. Cells are counts, so merging is addition.
    // Seeded once, since a re-seed mid-match would overwrite this fight's learning.
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

    // Strategies that leaked against this opponent start pre-discredited.
    this._strategyFail = this._strategyFail || {};
    for (const st of ['anti-air', 'parry', 'guard-break', 'intercept', 'pressure']) {
      const bias = SovDossier.strategyBias(keys, st);
      if (bias > 0.25) this._strategyFail[st] = Math.max(this._strategyFail[st] || 0, 2);
    }
    this._dossierBest = SovDossier.bestStrategy(keys, ['anti-air', 'parry', 'guard-break', 'intercept', 'pressure']);
  }

  // Commit on death and on match end. A match can end without a death and a life can
  // end without the match ending, so either one alone loses evidence.
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

  // Opponent modelling. Earlier learning signals were all self-referential, so his
  // dials converged to the same values against opposite opponents. These terms supply
  // the opponent-specific part.

  // Behaviour rates for the current target, as shares of observed frames.
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

  // Fingerprint keys: exact kit and behavioural archetype. The kit key is precise. The
  // archetype key lets what he learned transfer to an opponent he has never met.
  _dossierKeys(t, kitOnly) {
    if (typeof SovDossier === 'undefined') return [];
    const tgt = t || this.target;
    if (!tgt) return [];
    const keys = [SovDossier.kitKey(tgt)];
    // The person, when known: a human's account or a lab opponent's _habitKey. Kit keys
    // are shared by everyone who picks that kit.
    if (typeof SovHabits !== 'undefined' && (tgt.isAI === false || tgt._habitKey)) {
      keys.push('who:' + SovHabits.keyFor(tgt));
    }
    if (kitOnly) return keys;
    const r = this._oppRates();
    // Behavioural key only once there is behaviour to read. Before that every opponent
    // is 'mixed' and would share one record.
    if (!r) return keys;
    const arch = SovDossier.archetype(r);
    this._oppArchetype = arch;
    const bk = SovDossier.behKey(arch);
    keys.push(bk);
    // The joint build key (weapon x archetype). The two marginals alone cannot represent
    // an interaction. loadoutPrior weights each key by min(5, n), so a new joint record
    // contributes little until the build has been played a few times.
    keys.push(SovDossier.kitKey(tgt) + '|' + bk);
    return keys;
  }

  // Opponent-conditioned adaptation term: signed offsets on the dial targets in
  // AdaptiveAI._applyAdaptation, each from a measured property of the opponent (clamped to +/-0.35).
  //
  // Strategic layer: match-scope reads the tactical layer cannot see (damage by source, damage by
  // range band, habits held all match). Terms bias the working dials and never lock them.
  _strategicInit() {
    this._strat = {
      frames: 0, lives: 0,
      // "what is killing me", his HP by source, and the total he returns
      taken: { melee: 0, ability: 0, hazard: 0, other: 0 },
      dealt: 0,
      // Net damage per range band, and time spent in each.
      band: { close: { d: 0, t: 0, f: 0 }, mid: { d: 0, t: 0, f: 0 }, far: { d: 0, t: 0, f: 0 } },
      // Habit frames that survive respawns. The _opp* counters reset on target switch.
      habit: { approach: 0, retreat: 0, air: 0, attack: 0, shield: 0, frames: 0 },
      lastTakenFrame: -1, prevSelfHp: this.health, prevTgtHp: 0,
    };
  }

  _bandOf(dx) { return dx < 90 ? 'close' : dx < 200 ? 'mid' : 'far'; }

  // One pass per frame. Damage is attributed from the stamp dealDamage() writes
  // (_lastAttacker and friends), so the combat pipeline needs no change.
  _strategicObserve(t, d) {
    if (!this._strat) this._strategicInit();
    const S = this._strat;
    if (!t || t.health <= 0) return;
    S.frames++;

    const band = this._bandOf(d);
    S.band[band].f++;

    // Damage taken, by source.
    const stampFrame = this._lastAttackerFrame || -1;
    if (stampFrame > S.lastTakenFrame && this._lastAttacker === t) {
      S.lastTakenFrame = stampFrame;
      const dmg = this._lastAttackerDmg || 0;
      S.band[band].t += dmg;
      // A domain hazard is the owner's damage arriving without the owner: their domain is
      // open and they are not mid-swing, nowhere near him.
      let kind = 'other';
      const ownsDomain = typeof DomainManager !== 'undefined' && DomainManager.domains &&
                         DomainManager.domains.some(dm => dm && dm.owner === t);
      const reach = ((t.weapon && t.weapon.range) || 90) + 40;
      if (t.attackTimer > 0 || d <= reach)      kind = 'melee';
      else if (ownsDomain)                      kind = 'hazard';
      else if (d > reach)                       kind = 'ability';
      S.taken[kind] += dmg;
    }

    // Damage dealt, by range band.
    if (S.prevTgtHp > 0 && t.health < S.prevTgtHp) {
      const got = S.prevTgtHp - t.health;
      S.dealt += got;
      S.band[band].d += got;
    }
    S.prevTgtHp = t.health;

    // Habits that outlive a life.
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

  // Same scale as the kit terms but smaller. This is a lean on a working adaptation,
  // not a rewrite. A stronger match-scope read would make him slow to react when the
  // player changes plan mid-fight.
  _strategicTerms() {
    const S = this._strat;
    if (!S || S.frames < 240) return null;              // ~4s before it says anything
    let agg = 0, def = 0, spc = 0, rxn = 0;

    // Damage-source shares.
    const totalTaken = S.taken.melee + S.taken.ability + S.taken.hazard + S.taken.other;
    if (totalTaken > 40) {
      const melee  = S.taken.melee  / totalTaken;
      const hazard = S.taken.hazard / totalTaken;
      const rangedAbility = S.taken.ability / totalTaken;
      // Hazards run on a timer and ignore where he stands, so backing off pays nothing.
      // Ending the owner does.
      if (hazard > 0.25) { agg += 0.09 * hazard; spc -= 0.08 * hazard; }
      // Being out-traded in melee is the one case where guard is worth paying for.
      if (melee > 0.55)  { def += 0.14 * melee; }
      // Chip from outside his reach is a spacing problem, not a guard problem.
      if (rangedAbility > 0.30) { spc += 0.12 * rangedAbility; rxn += 0.08 * rangedAbility; }
    }

    // Damage he cannot attribute: ambient pressure. Almost all of it is a timed field owned by
    // someone, and it ends when the owner does, so waiting out at a distance does not help.
    const amb = (typeof this._ambientThreat === 'function') ? this._ambientThreat() : 0;
    if (amb > 0.3) { agg += 0.10 * amb; spc -= 0.09 * amb; }

    // Where he is profitable. Damage rate tracks how much of the match he spends in the
    // band that suits him, which is not always the band his weapon wants.
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

    // Habits held over the whole match. Same shape as the cuts in _oppAdaptTerms, but
    // across every life, so it survives a player resetting the neutral by dying.
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
    // Capped. 0.20 ran too hot in play.
    const cap  = v => Math.max(-0.13, Math.min(0.13, v)) * conf;
    // The swarm terms live in _oppAdaptTerms. This layer used to reference them, threw on every call
    // past the 240-frame guard, and was silently dead. Gated so the revival can be A/B tested.
    // Check falsiness, not !== false: --set passes the number 0, which must not read as off.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE &&
        SMK2_TUNE.stratTerms !== undefined && !SMK2_TUNE.stratTerms) return null;
    return { aggression: cap(agg), defense: cap(def),
             spacing: cap(spc), reactionSpeed: cap(rxn) };
  }

  _oppAdaptTerms() {
    // Attacker count, computed before the per-opponent guards. Crowds re-target before
    // _oppRates() has enough observation, so the kit half returned null exactly when
    // facing several opponents. The count needs no per-opponent history.
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
    // In a crowd the problem is surviving the crossfire, not damage output. Every
    // anti-juggle guard in dealDamage() is keyed on the attacker, so two attackers
    // defeat all of them at once.
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

    // Response gains. Genomes saved before these genes existed get 1.0, via the merge
    // in applyGenome() over SMK2_DEFAULT_GENOME.
    const G   = this._genome || {};
    const gKit = (typeof G.oppKitGain      === 'number') ? G.oppKitGain      : 1;
    const gThr = (typeof G.oppThreatGain   === 'number') ? G.oppThreatGain   : 1;
    const gBeh = (typeof G.oppBehaviorGain === 'number') ? G.oppBehaviorGain : 1;

    // Reach. Respecting a longer weapon donates frames at its optimal range, so he
    // presses in against reach and can sit out against a shorter one.
    agg += (reach - 1) * 0.16 * gKit;
    spc -= (reach - 1) * 0.10 * gKit;

    // Endlag. A slow weapon is an invitation: bait the swing, punish the recovery. That
    // is a spacing game, so this pulls against reach on purpose.
    spc += (endlag - 1) * 0.14 * gKit;
    agg -= (endlag - 1) * 0.06 * gKit;

    // Damage and knockback. Trading only pays when his hit is worth more than theirs.
    // Raw damage alone barely separated the weapons, so knockback is in too: it ends
    // his pressure and drives most of his ringout deaths.
    const kb = (w.kb || 10) / 10;
    def += ((hurt - 1) * 0.18 + (kb - 1) * 0.12) * gThr;
    agg -= (hurt - 1) * 0.10 * gThr;

    // Reaction. Cheap to hold high, so it needs its own kit term. A slow weapon gives
    // forewarning. A fast blade only works if the read happens in time.
    rxn += (1 - endlag) * 0.10 * gKit;

    // Speed. He cannot set range against someone faster, so he holds a pocket and makes
    // them enter it.
    spc += Math.max(0, spd - 1) * 0.18 * gKit;

    // Behaviour, not kit: a turtle must be opened, a rusher gets guard and reaction, a zoner gets closed,
    // and an aerial player is punished on landing. Cuts sit outside the ordinary frame shares, so only
    // lopsided opponents trip one.
    if (r.shield + r.dodge > 0.18) { agg += 0.14 * gBeh; spc -= 0.12 * gBeh; def -= 0.06 * gBeh; }
    if (r.attack > 0.20)           { def += 0.16 * gBeh; rxn += 0.10 * gBeh; agg -= 0.05 * gBeh; }
    if (r.retreat > r.approach * 1.6 && r.avgDist > 170) { agg += 0.18 * gBeh; spc -= 0.16 * gBeh; }
    if (r.air > 0.55)              { rxn += 0.12 * gBeh; spc += 0.06 * gBeh; agg -= 0.04 * gBeh; }

    // Reads scale with how much of the fight has been seen.
    const conf = Math.min(1, r.frames / 900);
    // Strategic layer on the same channel. _applyAdaptation clamps the merged result to
    // +/-0.35 per dial, so the reads can reinforce or cancel but never run away.
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
    this._adaptInterval      = 4; // post-break: ~15x/sec, superhuman pattern lock
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

  // Limiter break. One-way, see _triggerLimiterBreak.

  _checkLimiterBreak(t) {
    if (this._limiterBroken) {
      this._limiterAuraPhase = (this._limiterAuraPhase + 0.12) % (Math.PI * 2);
      if (this._limiterFlashTimer > 0) this._limiterFlashTimer--;
      if (this._pressureHoldTimer > 0) this._pressureHoldTimer--;
      if (this._adaptInterval > 4) this._adaptInterval = 4;
      return;
    }
    // A short read is enough. Waiting longer donates a warm-up while the player builds a
    // winning loop.
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

    // Stage is a ratchet. The dials feeding intelligence now rise and fall, and a stage
    // read from them directly would flip 3 -> 2 -> 3, re-firing dialogue, particles and
    // shake each time. The adaptation underneath is what varies.
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
    if (t.x < this._wbL() + 95 || t.x + t.w > this._wbR() - 95) delta += 0.018;
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

  // Force engagement. Runs once per AI tick before movement. Returns true when force
  // mode is active.
  _updateForceEngagement(t, d, playerAttacking) {
    const far  = d > this._FORCE_DIST_THRESHOLD;
    const idle = !playerAttacking;

    // Count frames player is staying distant
    if (far)  this._forceEngageDistFrames++;
    else      this._forceEngageDistFrames = Math.max(0, this._forceEngageDistFrames - 4); // decay when close

    // Count frames since player last attacked
    if (idle) this._forceEngageIdleFrames++;
    else      this._forceEngageIdleFrames = 0; // reset on any player attack

    // Activate force mode when both thresholds are met
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

  // Returns a strategy if a confident pattern is detected, else null. Needs the
  // observation window to have elapsed first.
  _getCounterStrategy() {
    if (this._observationFrames < 4 || this._actionSampleCount < 1) return null;

    // The strategic advisor (smb-sov-advisor.js) gets first refusal on the next lock. It
    // sees ~15s of history, which the per-frame engine cannot. It only proposes a
    // strategy the engine implements, and not when its own read just failed.
    if (this._advisorStrategy && !(this._strategyFail || {})[this._advisorStrategy]) {
      const _adv = this._advisorStrategy;
      this._advisorStrategy = null;   // consume, one lock per advisory
      return _adv;
    }

    // Frame shares first. The action-tag window is too sparse to see a committed airborne opponent,
    // since aerial swings get logged as attacks. Against an airborne-heavy opponent he picked 'pressure'
    // 86% of the time and lost 0 of 10 to that archetype.
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

    // Rate-based strategy with lock-in, so it is not re-evaluated every tick. The
    // post-KB profile is the fallback.
    if (this._adaptLockTimer <= 0) {
      // Tactic-swap scoring: did the strategy that just expired work? Scored on expiry by
      // how many hits leaked through while it was locked.
      if (this._lockedCounterStrategy && !this._lockScored) {
        this._lockScored = true;
        const _hitsUnderLock = this._countRecent('dmg_taken', 120);
        if (_hitsUnderLock >= 3) {
          this._strategyFail[this._lockedCounterStrategy] = (this._strategyFail[this._lockedCounterStrategy] || 0) + 1;
        } else if (_hitsUnderLock <= 1) {
          this._strategyFail[this._lockedCounterStrategy] = Math.max(0, (this._strategyFail[this._lockedCounterStrategy] || 0) - 1);
        }
        // Same verdict, filed permanently against the opponent it was learned from.
        // _strategyFail is rebuilt every match; this is not.
        if (typeof SovDossier !== 'undefined') {
          try { SovDossier.recordStrategy(this._dossierKeys(t), this._lockedCounterStrategy, _hitsUnderLock); } catch (e) {}
        }
      }

      let strategy = this._getCounterStrategy();
      // A counter that worked against this opponent before outranks a guess, but not a live
      // read. A player who changes habits must still be able to shake him.
      if (!strategy && this._dossierBest) strategy = this._dossierBest;
      if (!strategy && this._observationFrames >= 180) {
        // No strong rate pattern, try post-KB dominant behavior as a counter strategy
        const kbHint = this._getPostKBCounterHint();
        if (kbHint === 'jump')    strategy = 'anti-air';
        if (kbHint === 'shield')  strategy = 'guard-break';
        if (kbHint === 'attack')  strategy = 'parry';
        if (kbHint === 'retreat') strategy = 'intercept';
      }
      // A heavy weapon user stays in parry mode by default. Their long recovery is the best
      // punish.
      if (!strategy && t && t.weapon && t.weapon.kb >= 18 && this._actionSampleCount >= 3) {
        strategy = 'parry';
      }

      // The indicated counter keeps failing: switch plans, out loud. This is the visible
      // adaptation beat.
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
        this._lockScored     = false; // fresh lock, score it when it expires
      }
    }
    if (this._adaptLockTimer > 0) this._adaptLockTimer--;

    // Execute locked strategy
    const strat = this._lockedCounterStrategy;
    if (strat === 'anti-air') {
      if (!t.onGround) {
        this._counterLockTimer = 10;
        this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 50);
        // Player has double jump: track but don't leap yet, they can escape upward.
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
      // Passive player, close gap and force engagement
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.35;
      if (this.onGround && t.y < this.y - 40) this.vy = -18;
      this._triggerFearLine(SMK2_INTIMIDATION_LINES, 95);
      return true;
    }
    if (strat === 'guard-break') {
      // Player shields constantly, close in and break it
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
        // Player isn't shielding, attack normally rather than approaching forever
        this.attack(t);
        this._postHitLockFrames = Math.max(this._postHitLockFrames, 45);
      }
      return true; // always approach even when player isn't shielding yet
    }
    if (strat === 'intercept') {
      // Player dodges constantly, predict escape direction and cut them off
      this._counterLockTimer = 9;
      const interceptDir = Math.abs(t.vx) > 3 ? Math.sign(t.vx) : dir;
      if (!this.isEdgeDanger(interceptDir)) this.vx = interceptDir * moveSpd * 1.55;
      if (d < atkRange * 1.25 && this.cooldown <= 0) this.attack(t);
      this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 36);
      return true;
    }
    if (strat === 'parry' && playerAttacking && d < 170) {
      // Player attacks constantly, dash out of the swing and punish immediately
      this._counterLockTimer = 10;
      const dDir = (this.x < this._wbL() + 100 && dir < 0) ? 1 : (this.x + this.w > this._wbR() - 100 && dir > 0) ? -1 : -dir;
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

    // Rate-based strategies cover all habit patterns, so there is no fallback here.
    return false;
  }

  _runFlowBreak(t, dir, d, moveSpd, weaponRange, playerAttacking, recentTaken) {
    if (this._flowBreakCd > 0) return false;

    const cornered = this.x < this._wbL() + 70 || this.x + this.w > this._wbR() - 70;
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

    // Never retreat when opponent is near death, go for the finish instead
    const _tHpRatio = t.health / Math.max(1, t.maxHealth || 150);
    if (_tHpRatio < 0.25) return false;
    if (playerAttacking && d < 155 && (recentTaken >= 1 || this.health < this.maxHealth * 0.46)) {
      this._flowBreakCd = 70;
      const dDir = (this.x < this._wbL() + 100 && dir < 0) ? 1 : (this.x + this.w > this._wbR() - 100 && dir > 0) ? -1 : -dir;
      if (!this.isEdgeDanger(dDir)) this.vx = dDir * moveSpd * 2.4;
      if (this.onGround) this.vy = -17;
      return true;
    }

    if (cornered && d < 170 && this._repositionBurstCd <= 0) {
      this._repositionBurstCd = 160;
      this._flowBreakCd = 55;
      const centerDir = Math.sign(this._aiSafeCenterX() - this.cx()) || -dir;
      if (!this.isEdgeDanger(centerDir)) this.vx = centerDir * moveSpd * 2.05;
      this.vy = this.onGround ? -16 : this.vy;
      this._pressureHoldTimer = 60;
      spawnParticles(this.cx(), this.cy(), '#ff8844', 10);
      return true;
    }
    return false;
  }

  // Spatial intelligence: platform, zone and post-KB tracking.

  // Called once per AI tick, after _updateAntiExploit: tracks where the player fights and which
  // platforms they favour.
  //
  // Board control (The Circuit only): he slides a void to where the player shows they want to stand.
  // Both routes need an established zone read. Everything is gated on earned data, so a player who
  // varies their footing is never touched. No-op off The Circuit.
  _runPlateControl(t) {
    if (typeof CircuitPlate === 'undefined' || !CircuitPlate) return;
    if (this._plateCd > 0) { this._plateCd--; return; }
    if (!t || t.health <= 0 || this.health <= 0) return;
    if (typeof isCinematic !== 'undefined' && isCinematic) return;

    let wantX = null, why = null;

    // The zone read gates both routes. Deny-landing used to fire on any falling target,
    // which is nearly always, so the plate moved on a schedule rather than a profile.
    // Needs a real sample size and a real skew. An even spread is not a read.
    const zTotal = this._zoneVisits[0] + this._zoneVisits[1] + this._zoneVisits[2];
    const zPref  = this._zoneVisits[this._prefZone] || 0;
    if (zTotal <= 200 || zPref / zTotal <= 0.52) return;
    const zoneCX = [GAME_W / 6, GAME_W / 2, GAME_W * 5 / 6][this._prefZone];

    // 1. Airborne and falling back into the favoured zone: deny the landing. Predict where
    //    the arc puts them, not where they are now.
    if (!t.onGround && t.vy > 0.8) {
      const framesToFloor = Math.min(45, Math.max(0, (460 - (t.y + t.h)) / Math.max(0.8, t.vy)));
      const landX = t.cx() + t.vx * framesToFloor;
      if (Math.abs(landX - zoneCX) < GAME_W / 5) {
        wantX = landX;
        why   = 'deny-landing';
      }
    }
    // 2. Otherwise punish the camped zone if they are standing in it.
    else if (Math.abs(t.cx() - zoneCX) < GAME_W / 5) {
      wantX = t.cx();
      why   = 'deny-zone';
    }

    if (wantX === null) return;
    if (CircuitPlate.slideVoidToward(wantX, why)) {
      this._plateRequests++;
      // Long gap between moves. The plate is a pressure tool, and the player needs
      // uncontested ground in between.
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
      // Rejected (cooldown, trivial travel, or would drop him). Retry soon.
      this._plateCd = 45;
    }
  }

  _updateSpatialProfile(t) {
    // Zone tracking.
    const zone = t.cx() < GAME_W / 3 ? 0 : t.cx() < GAME_W * 2 / 3 ? 1 : 2;
    this._zoneVisits[zone] += 1;
    if (frameCount % 12 === 0) {
      for (let z = 0; z < 3; z++) this._zoneVisits[z] *= 0.986;
    }
    // Find zone with highest visit count
    this._prefZone = this._zoneVisits[0] > this._zoneVisits[1]
      ? (this._zoneVisits[0] > this._zoneVisits[2] ? 0 : 2)
      : (this._zoneVisits[1] > this._zoneVisits[2] ? 1 : 2);

    // Record a landing on a specific platform.
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

    // Post-KB profile: arm when a hit lands, then classify the response over 45 frames.
    if (!this._postKBArmed && t && t.health < this._postKBLastTgtHp - 1) {
      this._postKBArmed = true;
      this._postKBTimer = 60; // extended window: full knockback arc is ~1 sec
      // Edge awareness: hit near edge → immediately ramp corner pressure
      const hitNearEdge = t.cx() < this._wbL() + 130 || t.cx() > this._wbR() - 130;
      if (hitNearEdge) {
        this._cornerPressure = Math.min(1, this._cornerPressure + 0.40);
        this._cornerSide     = t.cx() < this._wbMid() ? -1 : 1;
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
        // _prevTgtOnGnd is still last tick's value here. It is updated at the end of the function.
        this._postKB.jumped++;
        this._postKBArmed = false;
      } else if (t.onGround && Math.abs(t.vx) > 4.5 &&
                 Math.sign(t.vx) !== Math.sign(this.cx() - t.cx())) {
        this._postKB.retreated++;
        this._postKBArmed = false;
      }
      if (this._postKBTimer <= 0) this._postKBArmed = false;
    }

    // Aerial preference: every 120 frames, if the player spent over 35% airborne, mark
    // _prefersAerial so the AI jumps to engage and lowers its anti-air threshold.
    if (!this._aerialSamples) { this._aerialSamples = 0; this._aerialSum = 0; }
    this._aerialSamples++;
    if (!t.onGround) this._aerialSum++;
    if (this._aerialSamples >= 120) {
      this._prefersAerial = (this._aerialSum / this._aerialSamples) > 0.35;
      this._aerialSamples = 0;
      this._aerialSum     = 0;
    }

    // Last, so next tick's edge detect sees this tick's value.
    this._prevTgtOnGnd = t.onGround;
  }

  // Platform index under the target, or -1 if it is airborne or unknown.
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
      cornered: t.cx() < this._wbL() + 110 || t.cx() > this._wbR() - 110,
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
      cornered: !!(t && (t.cx() < this._wbL() + 110 || t.cx() > this._wbR() - 110)),
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

  // Corner pressure: edge herding and the cornered exploit.

  // Pressure builds while the player is near an edge. Corner mode turns on at 0.50.
  _updateCornerPressure(t, d) {
    const _wbl = this._wbL(), _wbw = this._wbR() - _wbl;
    const nearLeft  = t.cx() < _wbl + 130;
    const nearRight = t.cx() > _wbl + _wbw - 130;
    const atEdge    = nearLeft || nearRight;
    const atCenter  = t.cx() > _wbl + _wbw * 0.28 && t.cx() < _wbl + _wbw * 0.72;

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

  // Corner exploit: stand on the stage side of the player, between them and centre, to
  // cut off escape. Returns true if it used the frame.
  _runCornerExploit(t, dir, d, moveSpd, atkRange) {
    if (!this._cornerMode) return false;

    // Blocking side: at the left edge he sits to the player's right, and at the right edge to their left.
    // The raw centre check flips every frame as he passes over the player, so cross until clearly past.
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
      // Hold position inside blade range. Pressing at full speed from point-blank shoves
      // him across the player and restarts the side-crossing loop.
      if (d > 24) { if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.18; }
      else this.vx *= 0.6;
      if (this.onGround && t.y < this.y - 45 && Math.random() < 0.05) this.vy = -19;
    }

    // Elevated attack rate, cornered player has fewer dodge options
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


  // When a strong platform preference shows up, race the player there and punish the
  // landing the moment they touch down. Returns true if it used the frame.
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
      // Hold position on the preferred platform, deliver a landing punish
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

  // Own-corner escape: when backed into his own edge, jump over the player toward centre
  // to reverse the pressure. Returns true if it used the frame.
  _runSovereignEscape(t, dir, moveSpd, jumpVy) {
    if (this._sovereignEscapeCd > 0) { this._sovereignEscapeCd--; return false; }
    const atMyEdge = this.x < this._wbL() + 80 || this.x + this.w > this._wbR() - 80;
    if (!atMyEdge) return false;
    if (!this.onGround && !this.canDoubleJump) return false;

    const escapeDir = this.x < this._aiSafeCenterX() ? 1 : -1; // toward center

    if (this.onGround) {
      this.vy = jumpVy - 3; // extra height to clear player
      this.vx = escapeDir * moveSpd * 2.5;
    } else if (this.canDoubleJump) {
      this.vy = -16;
      this.canDoubleJump = false;
      this.vx = escapeDir * moveSpd * 2.0;
    }

    this._sovereignEscapeCd = 38; // short cooldown, corner reversal is urgent
    if (this._fearLineCd <= 0 && Math.random() < 0.30) {
      const escLines = ['Your corner now.', 'Not here.', 'Side reversed.', 'I prefer this angle.'];
      showBossDialogue(escLines[Math.floor(Math.random() * escLines.length)], 100);
      this._fearLineCd = 240;
    }
    return true;
  }

  // Boss floor hazard: evacuate the deck before it is removed. smb-loop-core.js runs bossFloorState
  // 'normal' -> 'warning' -> 'hazard'. Fighter.updateAI() handles this, but this class replaces it
  // wholesale, so only _voidSafetyFrame() reached him, once he was already falling. Treat the warning
  // like the hazard. Returns true when it has taken the frame.
  _runFloorHazard(moveSpd, jumpVy) {
    if (typeof bossFloorState === 'undefined' || bossFloorState === 'normal') return false;
    if (this.health <= 0 || (this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return false;
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return false;
    const floorPl = currentArena.platforms.find(p => p.isFloor);
    if (!floorPl) return false;

    // Already on something that is not the doomed floor: hand the frame back so this never
    // reads as a panic.
    const _cpi = this._findCurrentPlatform(this);
    const _cp  = _cpi >= 0 ? currentArena.platforms[_cpi] : null;
    if (this.onGround && _cp && !_cp.isFloor) return false;

    // Airborne and climbing to a safe deck: let hop steering and _voidSafetyFrame finish
    // the job rather than fighting them for vx.
    if (!this.onGround && this._hopFrames > 0 && this._hopTarget) return false;

    // Safest deck: the nearest reachable non-floor platform. A single jump lifts ~150px,
    // a double jump ~285, matching the elevation-pursuit reach.
    const feet  = this.y + this.h;
    const REACH = 285;
    let best = null, bestScore = Infinity;
    for (const pl of currentArena.platforms) {
      if (!pl || pl.isFloor || pl.isFloorDisabled) continue;
      if (pl.y > feet + 40) continue;              // below us, falling to it is not an escape
      if (pl.y < feet - REACH) continue;           // out of jump range from here
      const cx2 = pl.x + pl.w / 2;
      const score = Math.abs(cx2 - this.cx()) + (feet - pl.y) * 0.35;
      if (score < bestScore) { bestScore = score; best = pl; }
    }
    if (!best) return false;                        // nowhere better, keep fighting

    // Platforms are solid from below. Jumping as soon as he was level with the deck hit its underside and
    // re-fired until the floor went. Walk out past the nearer edge first, then jump, and let hop steering carry him in.
    const _bcx     = best.x + best.w / 2;
    const _clearOf = best.w / 2 + 22;                 // outside this, nothing overhead
    const _fromLeft = this.cx() <= _bcx;              // which side we're approaching from
    const _standX  = _fromLeft ? best.x - 34 : best.x + best.w + 34;

    if (this._floorHopCd > 0) this._floorHopCd--;

    if (this.onGround) {
      if (Math.abs(this.cx() - _bcx) < _clearOf) {
        // Under the deck, walk OUT to the stand point, never jump from here.
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
        // Caught airborne after the state flipped. Steering alone cannot gain height, so spend
        // the double jump to reach the deck.
        this.vy = -16;
        this.canDoubleJump = false;
        this._hopTarget = best;
        this._hopFrames = 40;
      }
    }
    // No swings while evacuating. A committed swing's endlag leaves him on the deck too long.
    this.shielding = false;
    return true;
  }

  // World-edge helpers: the arena edge, not the 900px screen (see Fighter._aiWorldBounds).
  _wbL()   { return this._aiWorldBounds().left; }
  _wbR()   { return this._aiWorldBounds().right; }
  _wbMid() { const b = this._aiWorldBounds(); return (b.left + b.right) / 2; }

  _runVoidRecovery(t, dir, moveSpd, jumpVy) {
    if (this._voidRecoverCd > 0) this._voidRecoverCd--;

    // World bounds, not GAME_W. In a wide story world every x past 900 read as off-stage,
    // so he held recovery forever against the lock wall.
    const _wb       = this._aiWorldBounds();
    const _midX     = (_wb.left + _wb.right) / 2;
    const offLeft   = this.x < _wb.left - 18;
    const offRight  = this.x + this.w > _wb.right + 18;
    const offBottom = this.y > GAME_H + 28;
    // Low y counts as a ledge risk only when airborne. Some arenas put the floor below
    // GAME_H-180, which made a trampoline loop. GAME_H-120 (400) clears the floor (~376)
    // and normal jump arcs.
    const nearLedge = this.x < _wb.left + 62 || this.x + this.w > _wb.right - 62 ||
                      (!this.onGround && this.y > GAME_H - 120);
    const heavyThreat = !!(t && t.weapon && (t.weapon.kb >= 18 || t.weapon.weaponType === 'heavy'));
    // Ledge proximity alone is not void risk. It needs real speed or repeated hits.
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

    const centerDir = this.cx() < _midX ? 1 : -1;
    const retreatDir = (offLeft || (nearLedge && this.cx() < _midX)) ? 1 : -1;
    let   escapeDir = offLeft ? 1 : offRight ? -1 : centerDir;

    // Recovery boost budget. The cooldown is a rate limit, not a budget: a -14 impulse every 12 frames is
    // a net climb, and it re-arms as soon as he falls (he reached y=-2765). It only stayed bounded over
    // unbroken floor, since landing reset the state. Two hard stops, both required. The budget resets on landing.
    if (this.onGround) this._voidBoosts = 0;
    // Ceiling measured from the deck, with ~200px headroom to clear a ledge lip. The old fixed -60 sat
    // above the screen. No isFloorDisabled filter, or a disabled floor would fall back to that -60.
    const _rcPlats = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms)
      ? currentArena.platforms : null;
    let _rcFloor = _rcPlats ? _rcPlats.find(p => p.isFloor) : null;
    if (!_rcFloor && _rcPlats && _rcPlats.length) {
      // No floor platform (some arenas are pure platform fields): use the lowest deck.
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

    // Out of boosts: stop climbing and steer toward the nearest solid platform he can land
    // on. The old code pogo'd over The Circuit's voids, since escapeDir only pointed at the
    // arena centre.
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
      // The cooldown gates the jump so the arena-floor trampoline cannot pogo-stick.
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

  // D. ANTI-EXPLOIT SYSTEM

  _updateAntiExploit(t) {
    const ex = this._exploit;
    const tx = t.cx();

    // Stall: player has not moved.
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

    // Edge camp.
    const atEdge = t.x < this._wbL() + 85 || t.x + t.w > this._wbR() - 85;
    ex.edgeFrames = atEdge ? ex.edgeFrames + 1 : Math.max(0, ex.edgeFrames - 2);
    if (ex.edgeRespCd > 0) ex.edgeRespCd--;

    if (ex.edgeFrames >= 65 && ex.edgeRespCd === 0) {
      ex.edgeFrames = 0;
      ex.edgeRespCd = 420;
      ex.engageTimer = 80;
      ex.engageType  = 'edge';
      showBossDialogue(SMK2_EXPLOIT_EDGE[Math.floor(Math.random() * SMK2_EXPLOIT_EDGE.length)], 140);
    }

    // Attack spam.
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

    // Idle shield: shielding without attacking.
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
      // Bait and punish: hold just outside reach to force a commitment, then dash in and
      // punish the swing. Corner mode blocks their route to centre.
      const weapon = this._getCombatWeapon();
      const _atkR  = (weapon.range || 90) * (1.1 + this._intimidation * 0.08) + 20;
      if (!this._cornerMode && this._cornerCd <= 0) {
        this._cornerPressure = Math.max(this._cornerPressure, 0.75);
        this._cornerMode = true;
        this._cornerSide = t.cx() < this._wbMid() ? -1 : 1;
      }
      if (d < _atkR * 0.85 && !playerAttacking) {
        // Hold just outside their reach, bait the attack
        const _baitDir = -dir;
        if (!this.isEdgeDanger(_baitDir)) this.vx = _baitDir * moveSpd * 0.55;
      } else if (playerAttacking && d < _atkR * 1.8) {
        // They committed, dash in and punish the whiff
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 2.2;
        if (d < _atkR + 8 && this.cooldown <= 0) this.attack(t);
      } else {
        // Out of bait range, approach to pressure zone
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

  // E. HUMANIZATION LAYER

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

    // Fake-out movement is disabled. Walking the wrong way for 6-14 frames was a free
    // opening, not a mixup.
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

  // Attack that reports whether a swing started. Fighter.attack() can silently veto swings
  // (whiff guard). One-shot state (punish windows, combo counters, rest timers) must not be
  // spent on a swing that never happened.
  _strike(t) {
    const _cd = this.cooldown, _at = this.attackTimer;
    this.attack(t);
    return this.attackTimer > _at || this.cooldown > _cd;
  }

  // Target's current outgoing damage multiplier, from live buff fields. Lets him see a
  // 22-base crescent about to hit for the 45%-max-HP cap. Varek rage, Warborn Fury, the map
  // power buff and dmgMult all compound in dealDamage.
  _targetDamageMult(t) {
    if (!t) return 1;
    let m = (typeof t.dmgMult === 'number' && t.dmgMult > 0) ? t.dmgMult : 1;
    if (t.charClass === 'kratos' && t.rageStacks > 0) m *= 1 + Math.min(t.rageStacks, KRATOS_RAGE_MAX) * KRATOS_RAGE_PER;
    if (t.spartanRageTimer > 0) m *= 1.3;
    if (t._powerBuff > 0)       m *= 1.35;
    return m;
  }

  // Tactical orchestration. These grant no attacks and change no physical values. They turn
  // live combat, map and resource systems into decisions, so he does not leave free
  // advantages unused.
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
      // Was 460, which hid far-side pickups on a 900px stage. The distance penalty prices
      // travel. The cull only stops cross-map runs in story worlds.
      const selfDist = Math.hypot(this.cx() - item.x, this.cy() - item.y);
      if (selfDist > 900) continue;
      const targetDist = t ? Math.hypot(t.cx() - item.x, t.cy() - item.y) : Infinity;
      // Taking a contested resource also denies it to the opponent.
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

    // Resolve the frame-safe shield timer before any early return here, or a map hold
    // could freeze a shield forever.
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

    // Keep a hazard-caught target there with normal movement and attacks. No hazard damage is faked.
    if (targetHazard && !t.attackTimer && d < 220) {
      this._pressureMode = 'suffocate';
      this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 32);
      if (d < weaponRange + 12 && this.cooldown <= 0) this._strike(t);
      else if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd;
      return true;
    }

    // Map pickups are a real economy, curses included. Commitment is priced: a heal he needs is worth
    // breaking off for, a spare buff is not. The swing check only blocks while a swing can reach him.
    if (this._itemRunTimer > 0) this._itemRunTimer--;
    const item = this._selectMapResource(t);
    if (item) {
      const value    = this._mapItemValue(item);
      const breakOff = value >= 100 ? weaponRange * 0.55
                     : value >= 80  ? weaponRange + 20
                     :                weaponRange * 2;
      const swingReaches = d < weaponRange + 24 && t.attackTimer > 0;
      if (!swingReaches && (d > breakOff || this._itemRunTimer > 0)) {
        // Hold the line to the pickup for a beat. Re-deciding every frame made him oscillate
        // between item and target.
        this._itemRunTimer = Math.max(this._itemRunTimer, 24);
        const dx      = item.x - this.cx();
        const itemDir = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
        if (itemDir && !this.isEdgeDanger(itemDir)) this.vx = itemDir * moveSpd;
        else if (!itemDir)                          this.vx *= 0.6;
        // Decks are passUnder and a jump clears 268px. Commit the jump on approach so the arc
        // ends on the pickup.
        if (this.onGround && item.y < this.y - 55 && Math.abs(dx) < 190) this.vy = jumpVy;
        return true;
      }
    }

    // Ruins crates use the pickup reward table. He opens one only while the opponent is out
    // of contest range. The normal attack hits the crate through the map-perk system, so no
    // reward state is set here.
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
          // The target is far by this branch's own precondition, so the AI whiff guard would veto
          // the swing. The env-swing flag lets the crate hit through (range-checked in
          // updateMapPerks).
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

    // Forest healing and neon speed pads: use them only with room to convert the resource
    // without taking a hit.
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

    // Spend ability first to crack an active guard or convert a recovery or hazard trap,
    // rather than casting in neutral.
    const abilityWindow = t.shielding || targetLocked || targetInHazard ||
      (t._reloadTimer || 0) > 0 || (this.stamina || 0) < 18 || targetBuffed;
    if (this.abilityCooldown <= 0 && this.attackEndlag <= 0 && !this.shielding &&
        closeEnough && abilityWindow) {
      const oldCd = this.abilityCooldown;
      this.ability(t);
      if (this.abilityCooldown > oldCd) return true;
    }

    // Supers carry the strongest weapon-specific conversion, so hold them for a close-range payoff.
    // Within two supers of Absolute Dominion, a perfect-window wait costs more than the domain is worth.
    // At >= 1 the push is live for most of a life.
    const domainPush = (this._domainSuperCount || 0) >= 1;

    // A super is also a combo starter, not only a reward for a window the opponent opens. In
    // swing range, with the opponent not swinging or guarding, opening with it is a real line.
    const comboOpener = d < weaponRange + 40 && !t.attackTimer && (this.attackEndlag || 0) <= 0;

    // Stale-bank release lives in _updateSuperBank(), which runs every frame.
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

  // Lethal volley defence. Sword super fans (t._swordSlashes) fly ~340px and home vertically, and each
  // can hit the 45%-max-HP cap. Counters use the crescents' fixed horizontal direction and clamped
  // homing. Returns true when it consumed the movement frame.
  //
  // Always-on perception, even mid-reaction: timestamps the opponent's button presses and learns from
  // unexplained damage. Per-opponent profile bundle: the fields describing the opponent, not his own.
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
    // Frame-share counters describe an engagement, not a person, so they are not in the saved
    // bundle. Zero them on switch so a new opponent is not read through the last one.
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
    // First time meeting this opponent, a blank profile, not the last one's.
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

  // Who deserves attention. Damage taken dominates, with proximity and helplessness breaking
  // ties. Nearest-only let a ranged second player farm him from across the arena.
  _smk2ThreatScore(c) {
    if (!c || typeof frameCount === 'undefined') return -Infinity;
    const led   = this._threatLedger.get(c);
    // Damage decays over ~8s, so a fighter who stops fighting stops being the priority. A burst
    // still outweighs a body standing closer.
    let recent  = 0;
    if (led) {
      const age = frameCount - led.lastFrame;
      if (age < 480) recent = led.dmg * (1 - age / 480);
    }
    const d     = Math.hypot(c.cx() - this.cx(), c.cy() - this.cy());
    let score   = recent * 2.2 + Math.max(0, 60 - d / 12);
    // A helpless opponent is a free punish, the engine's own rule, reused here.
    if (this._targetHelpless(c)) score += 30;
    // Finish what is nearly dead rather than resetting onto a full-health body.
    const hpPct = c.maxHealth > 0 ? c.health / c.maxHealth : 1;
    if (hpPct < 0.25) score += 22;
    // Summons and minions are attention sinks, never weighted like the player driving them.
    // The penalty is conditional: a flat one meant a minion on top of him could never out-score
    // the boss he was locked onto. A summon in his face and committing has earned the attention.
    if (!(Array.isArray(players) && players.includes(c))) {
      const _inFace = d < 90 && ((c.attackTimer || 0) > 0 || (c.cooldown || 0) > 0);
      let _pen = _inFace ? 12 : 45;
      // Fade the penalty against the damage the summon has actually done. A summon doing real
      // damage earns the target slot. Full fade at 60 recent damage.
      _pen *= 1 - Math.min(1, recent / 60);
      score -= _pen;
    }
    return score;
  }

  // Threat-weighted retarget with hysteresis. Runs before perception. The dwell floor and challenger
  // margin stop the two-candidate strobe that per-frame scoring produces at similar distances.
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

    // No current target (dead, gone, or first frame): take the best now. This stops him
    // freezing when his only opponent dies.
    if (!cur) { this._switchTarget(best); return; }

    // A challenger must clearly beat the incumbent, and the incumbent must have had a fair chance.
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
    // Short-horizon state from the old engagement, which would read as garbage on the first tick.
    this._comboFollowHits = 0;
    this._comboExtensions = 0;
    this._comboLandedLast = false;
    this._reactLatch      = null;
    this._counterWindowOpen = false;
    this._prevPlayerAtk   = 0;
    this._endlagWindow    = 0;
    this._blindEvadeUntil = 0;
  }

  // Fold damage taken into the ledger, from the attribution stamp dealDamage() leaves.
  _updateThreatLedger() {
    if (typeof frameCount === 'undefined') return;
    const a = this._lastAttacker;
    if (!a || this._lastAttackerFrame === this._threatSeenFrame) return;
    this._threatSeenFrame = this._lastAttackerFrame;
    // Commitment sampling, on the new-hit edge. VECTOR's overnight finding: 95% of hits he
    // takes land while he is mid-swing. That is a fact about this fight, not Sovereign in
    // general, so it is measured live.
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
      // Set here, or the super half of blind learning never fires. A domain expansion is a super.
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
          // Damage with no press to blame and nothing visible near him. Learning from consequences
          // must not need the cause identified: 'I keep losing HP standing here' is enough to stop
          // standing here.
          u.viaNeither++;
          u.neither.push(frameCount);
          if (u.neither.length > 12) u.neither.shift();
        }
      }
    }
    this._selfPrevHp = this.health;
    this._updateAmbientResponse();
  }

  // Called on the opponent's ability or super press. If unexplained damage has followed that
  // press before, from about this range, the press itself becomes the telegraph. Needs 2 prior
  // burns, so one freak hit does not make him flinch at everything.
  _armBlindEvade(src, dist) {
    const u = this._unknownThreat;
    if (!u || u.total < 2) return;
    const hits = src === 'super' ? u.viaSuper : u.viaAbility;
    if (hits < 2) return;
    // Only at a range comparable to where it burned us. Point-blank is a melee problem.
    const avgDist = u.distN ? u.distSum / u.distN : 0;
    if (avgDist > 90 && dist < avgDist * 0.45) return;
    const avgDelay = u.delayN ? Math.round(u.delaySum / u.delayN) : 24;
    this._blindEvadeUntil = frameCount + Math.max(14, Math.min(75, avgDelay + 16));
    this._blindEvadeSrc   = src;
    if (this._blindLineCd <= 0 && typeof showBossDialogue === 'function') {
      this._blindLineCd = 420;
      showBossDialogue(src === 'super' ? 'That again. Already answered.'
                                       : 'I do not need to see it.', 110);
    }
  }

  // Ambient pressure, 0..1: how hard he is hurt by sources he can neither see nor blame on a
  // button. Source-agnostic on purpose, so a domain, an off-screen shooter or a floor hazard
  // all count.
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

  // Standing still is always wrong against an unseen source, so sustained ambient pressure
  // re-arms the same evasion window the press-driven path uses. He does not learn what is
  // hitting him, only that where he stands is losing him the fight.
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
      showBossDialogue('This place bites. So do I.', 110);
    }
  }

  // Evade a threat that has never been perceived, pure learned response.
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

  // Telegraphed ground strikes and lingering zones, which the projectile scan cannot see. Thunderstrike
  // marks a spot and drops a bolt after a delay. Shock bolt leaves a static zone. Answered by moving off
  // the mark. Returns true when it consumed the movement frame.
  _runTelegraphedEvasion(t, dir, moveSpd, jumpVy) {
    if (!t) return false;
    const myX = this.cx(), myY = this.cy();
    let threatX = null, urgency = 0;

    // Pending sky strikes, treat the marked spot as lethal ground.
    if (t._thunderStrikes) {
      for (const ts of t._thunderStrikes) {
        if (!ts || ts.fired) continue;
        if (Math.abs(myX - ts.x) < 78 && Math.abs(myY - ts.y) < 150) {
          threatX = ts.x; urgency = 2; break;
        }
      }
    }
    // Lingering damage zones, standing in one is free chip.
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

    // Step off the marked x, preferring the side that keeps us on stage, then the target's
    // side. Evading must not concede the fight.
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
    // Every live melee hazard the target owns. Crescents live in _swordSlashes. The flail ball,
    // scythe toss and hammer shockwave are single objects in their own fields, invisible to the
    // projectile pools, so they are scanned here.
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
    // Lethal-class gate. Multi-slash fans always qualify. A single crescent qualifies only when
    // its capped damage is a real chunk of health. Plain crescents (22 dmg) stay with the
    // ordinary projectile dodge.
    const estRaw  = Math.round(22 * this._targetDamageMult(t));
    const estHit  = Math.min(estRaw, Math.round(22 * 3.5), Math.floor(this.maxHealth * 0.45));
    if (count < 2 && estHit < Math.max(30, this.health * 0.28)) return false;
    // Escape along the crescents' travel direction, since they cannot reverse. Otherwise away
    // from the attacker.
    const away = Math.abs(near.vx || 0) > 1 ? Math.sign(near.vx) : -dir;
    const gap  = Math.abs(nearDx);
    // Slashes hover waiting out i-frames, but a shield spends them on contact with no launch.
    // It defuses the fan even if the shield cracks, so prefer it when the fan is about to connect.
    const _canShield = this.shieldCooldown === 0 && this._shieldHoldFrames === 0;
    if (this.onGround) {
      const _runway = away < 0 ? this.x - (this._wbL() + 40) : (this._wbR() - 40) - (this.x + this.w);
      if (gap > 95 && _runway > 150 && !this.isEdgeDanger(away)) {
        // Outrun the fan: crescents fly a fixed 8 px/f and expire in ~42 frames.
        this.vx = away * moveSpd * 2.2;
      } else if (gap < 130 && _canShield && count >= 2) {
        this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 16;
      } else if (gap < 90) {
        // Matador: at close range the homing clamp (+/-0.35/f) cannot correct onto a full jump
        // burst. Late-dodge up and across, inward off a wall.
        this.vy = jumpVy;
        this.vx = (this.isEdgeDanger(away) ? -away : away) * moveSpd * 1.6;
      } else {
        // Fan still inbound and out of runway: hold coiled. Burning the jump early is what homing punishes.
        this.vx *= 0.5;
      }
    } else if (this.canDoubleJump && gap < 120) {
      this.vy = -15; this.canDoubleJump = false;
      this.vx = (this.isEdgeDanger(away) ? -away : away) * moveSpd * 1.8;
    } else if (!this.onGround && gap < 130 && _canShield && count >= 2) {
      // Juggle state, no jump left, shield mid-air to spend the hovering fan.
      this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 14;
    } else {
      // Airborne with the jump spent: fast-fall and drift. Vertical homing tracks slow arcs, not a dive.
      this.vy = Math.max(this.vy, 8);
      if (!this.isEdgeDanger(away)) this.vx = away * moveSpd * 1.5;
    }
    this._recordEvent('dodge', 6);
    this.aiReact = 0;
    return true;
  }

  // Volley-cycle timing vs a ramped crescent thrower: stay just outside its burst radius while armed,
  // force the throw at range, then go all-in during the ~2.5s cooldown. Returns 'standoff' | 'window' | null.
  // An ability merely off cooldown is the resting state of anyone who never presses it, so watch for the
  // cooldown going from 0 to positive, which only happens when it is spent. He eats the first one.
  _observeTargetThreat() {
    const t = this.target;
    if (!t) return;
    if (t !== this._threatWatchTarget) {
      this._threatWatchTarget = t;
      this._tgtAbilityCdPrev  = t.abilityCooldown || 0;
      // Opponent-keyed, so a 3-way does not inherit the other one's record.
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
    // Not `|| -99999`: a use on frame 0 is falsy, and the fallback would forget the threat as
    // soon as it was seen.
    const last = (this._tgtAbilityLastUse === undefined) ? -99999 : this._tgtAbilityLastUse;
    return (_fc - last) < 900;   // ~15s memory
  }

  _volleyCyclePosture(t) {
    if (!t || !t.weapon) return null;
    // Per-weapon burst radius: how far an armed ability or super reaches with no reactable
    // travel time. Whip's Lasso auto-yanks from 280px, so its ring sits outside that.
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

  // Can the target not fight back? (swing recovery, stun, ragdoll, parry vulnerable, reloading.)
  // A helpless target is a free punish.
  _targetHelpless(t) {
    if (!t) return false;
    return (t.stunTimer   || 0) > 10 ||
           (t.ragdollTimer|| 0) > 10 ||
           (t._parryVulnFrames || 0) > 25 ||
           (t.attackEndlag || 0) > 6 ||
           (t._reloadTimer || 0) > 12;
  }

  // Punisher read: one plan, veto only, self-observed. bait_whiff_punish beat parry_wall in 4 of 4 runs,
  // and against an opponent who punishes recovery, only swinging into their commitment is correct.
  // The read is of himself: whether he keeps getting hit mid-swing.
  _punisherRead() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.baitPunisher) return false;
    const r = this._commitRing;
    // Below this many hits he has no opinion. A wrong read costs donated tempo, which he cannot
    // afford early in a life.
    const need = (typeof TUNE.baitMinHits === 'number') ? TUNE.baitMinHits : 8;
    if (!r || r.length < need) return false;
    const rate = r.reduce((a, b) => a + b, 0) / r.length;
    const thr  = (typeof TUNE.baitRate === 'number') ? TUNE.baitRate : 0.5;
    return rate > thr;
  }

  // Tactical plans: adaptation above the level of the verb. Dials saturate, and discrete primitive
  // choice moved nothing, because the failure is the size of the decision. A plan is a multi-second
  // commitment with its own success statistic: chosen, held ~1.5s, then priced by what it cost.
  //
  // Safety: plans steer and veto, never seize. Steering runs only while grounded and inboard, so it
  // cannot fight recovery or the air-deny steer. Attacks are vetoed through attack(). Pressure never
  // vetoes, and the veto is skipped when the target is helpless, so free damage is always taken.
  //
  // disengage_reset is off: it lost stocks and took more damage, since its away vector walks him toward
  // the edge ringout.
  _planLibrary() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const lib = ['pressure_ground', 'bait_whiff_punish', 'spacing_poke'];
    if (TUNE.planDisengage) lib.push('disengage_reset');
    return lib;
  }

  // Plan value is keyed by pressure context (hot, warm, cold, swarm). One global statistic would learn
  // 'baiting works' from a punisher and then bait into a gauntlet. Four coarse buckets, so a plan
  // statistic can fill inside one match.
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
    // Multiple live attackers are their own context: anti-juggle guards are attacker-keyed, so
    // two attackers defeat all of them at once.
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

  // Epsilon-greedy over plans. Untried plans come first, since running one once is the cheapest
  // way to get an opinion on it.
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

  // Open a plan, or close and price the running one. Mirrors _markTactic/_resolveTactic:
  // snapshot on open, health delta on close. A death inside the window is priced as the largest
  // cost a decision can carry.
  _planTick() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.planGamble) { this._gambleTick(); return; }
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
      // Kill credit: the mirror of the death surcharge. Scoring a kill as 0 blinded every ledger to the
      // action that closes a stock. Target identity: compare against the fighter the snapshot came from,
      // since bots share `lives`.
      const _bt = P.tgt;
      const dealt = !_bt ? 0
                  : (_bt.lives === P.tLives) ? Math.max(0, P.tHp - _bt.health)
                  : (_KC() ? (this._killCredits = (this._killCredits || 0) + 1, P.tHp + 40) : 0);
      if (!this._planStat) this._planStat = {};
      const key = (P.ctx || 'cold') + '|' + P.name;
      const e = this._planStat[key] || (this._planStat[key] = { tries: 0, taken: 0, dealt: 0 });
      e.tries++; e.taken += taken; e.dealt += dealt;
      // Rolling decay, as in the grid: a plan that stopped working early must be able to recover.
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

  // Gambler: the plan layer without the hedge. Holds a plan while it wins exchanges and drops it once it
  // has lost more than it won. An exchange is an opener (first hit after 60 quiet frames). The score
  // decays at 0.6. A plan dropped twice without a win is burned for the match, and burns clear if every
  // plan burns, since an idle boss is the failure to avoid.
  _gambleTick() {
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    const t = this.target;
    if (this.health <= 0 || !t || t.health <= 0) return;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    let G = this._gamble;
    if (!G) G = this._gamble = { burned: {}, dropped: {}, won: {}, lost: {}, lastEx: -9999, switches: 0, lineAt: -9999 };
    if (G.tgt !== t) {
      G.tgt = t; G.hp = this.health; G.lives = this.lives; G.tHp = t.health; G.tLives = t.lives;
    }
    const hitMe   = this.lives !== G.lives  || this.health < G.hp;
    const hitThem = t.lives    !== G.tLives || t.health    < G.tHp;
    let outcome = 0;
    if ((hitMe || hitThem) && _fc - G.lastEx > 60) outcome = hitThem ? (hitMe ? 0 : 1) : -1;
    if (hitMe || hitThem) G.lastEx = _fc;
    G.hp = this.health; G.lives = this.lives; G.tHp = t.health; G.tLives = t.lives;

    let B = this._activePlan;
    if (!B || !B.gamble) B = this._openBet('pressure_ground', t);
    if (outcome !== 0) B.score = B.score * 0.6 + outcome;
    if (outcome > 0) {
      B.wins++; G.won[B.name] = (G.won[B.name] || 0) + 1;
    } else if (outcome < 0) {
      B.losses++; G.lost[B.name] = (G.lost[B.name] || 0) + 1;
      if (B.score < 0) {
        if (B.wins === 0 && (G.dropped[B.name] = (G.dropped[B.name] || 0) + 1) >= 2) G.burned[B.name] = true;
        B = this._openBet(this._nextBet(B.name), t);
      }
    }
    this._executeTactic(B.name, t);
  }

  // Untried plans first, in library order; after that the best record this match.
  // The plan just dropped is never re-picked while anything else is available.
  _nextBet(dropped) {
    const G = this._gamble;
    const lib = this._planLibrary();
    let pool = lib.filter(n => !G.burned[n]);
    if (!pool.length) { G.burned = {}; G.dropped = {}; pool = lib.slice(); }
    const others = pool.filter(n => n !== dropped);
    if (others.length) pool = others;
    const untried = pool.filter(n => !G.won[n] && !G.lost[n]);
    if (untried.length) return untried[0];
    let best = pool[0], bestV = -Infinity;
    for (const n of pool) {
      const w = G.won[n] || 0, l = G.lost[n] || 0;
      const v = (w - l) / (w + l + 1);
      if (v > bestV) { bestV = v; best = n; }
    }
    return best;
  }

  _openBet(name, t) {
    const G = this._gamble;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const prev = this._activePlan;
    this._activePlan = { name, gamble: true, frame: _fc, wins: 0, losses: 0, score: 0, tgt: t };
    if (prev && prev.gamble) G.switches++;
    // Spoken only to a human, only on a real switch, at most every 10 seconds.
    if (prev && prev.gamble && t && t.isAI === false && _fc - G.lineAt > 600 &&
        typeof SMK2_GAMBLE_LINES !== 'undefined' && SMK2_GAMBLE_LINES[name] &&
        typeof showBossDialogue === 'function') {
      G.lineAt = _fc;
      const pool = SMK2_GAMBLE_LINES[name];
      showBossDialogue(pool[Math.floor(Math.random() * pool.length)], 180);
    }
    return this._activePlan;
  }

  // The executor the tactic library always assumed existed. Steering only.
  _executeTactic(name, t) {
    if (!name || !t || t.health <= 0 || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    // Grounded and inboard only, see the SAFETY note above.
    if (!this.onGround) return;
    if ((this._spawnDefendTimer || 0) > 0 || (this._airDenyTimer || 0) > 0) return;
    if (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const fl = currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
      if (fl && (this.cx() < fl.x + 40 || this.cx() > fl.x + fl.w - 40)) return;
    }
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    // planSteer isolates the two halves of a plan. Steering is a movement controller that runs
    // after updateAI has chosen a velocity, so it discards pathfinding, edge-danger and hazard
    // avoidance. Off, this measures the veto alone.
    if (TUNE.planSteer === false) return;
    const reach = (this.weapon && this.weapon.range) || 90;
    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = Math.sign(dx) || 1;
    // Hold a band, not a point. Holding a point makes the fighter oscillate across it every frame.
    const band = (lo, hi) => {
      if (d > hi)      this.vx = dir * Math.min(5.5, 2 + (d - hi) * 0.05);
      else if (d < lo) this.vx = -dir * Math.min(5.0, 2 + (lo - d) * 0.06);
    };
    switch (name) {
      case 'bait_whiff_punish': band(reach * 1.25, reach * 1.65); break;
      case 'spacing_poke':      band(reach * 0.95, reach * 1.20); break;
      case 'disengage_reset':   if (d < reach * 2.2) this.vx = -dir * 4.5; break;
      // pressure_ground leaves movement to updateAI. It is the control arm: a plan whose baseline
      // is itself a behaviour change cannot show whether planning helped.
      default: break;
    }
  }

  // Consulted from attack(). A plan may hold a swing; it may never hold one that
  // is free. Returns true to veto.
  _planVetoAttack(t) {
    const P = this._activePlan;
    if (!P || !t || t.health <= 0) return false;
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.tacticPlans === false && !TUNE.planGamble) return false;
    if (this._targetHelpless(t)) return false;     // free damage is never refused
    const reach = (this.weapon && this.weapon.range) || 90;
    const d = Math.abs(t.cx() - this.cx());
    switch (P.name) {
      // The whole point: swing into their recovery, not into them. This answers the 95% mid-swing
      // hit rate. A plan that only swings once they are committed removes the window they punish.
      case 'bait_whiff_punish':
        return !((t.attackEndlag || 0) > 0 || (t.cooldown || 0) > 4 || (t._reloadTimer || 0) > 0);
      // Poke at the tip. Inside 70% of reach he is in their range too, where even trades happen,
      // and those lose.
      case 'spacing_poke':
        return d < reach * 0.70;
      case 'disengage_reset':
        return true;
      default:
        return false;
    }
  }

  // Swing discipline: a veto layer over Fighter.attack() for swings the engine's rules say cannot pay
  // (i-frames, a fresh parry window, stamina below ~15). Decision layer only: stats, cooldowns and
  // damage are untouched.
  // True while a swing started now would contact inside the target's i-frames.
  _iframeVeto(t) {
    return !!t && (t.invincible || 0) > this._meleeContactFrames() + 2 &&
      !(t._hitIframeBy === this && typeof frameCount !== 'undefined' &&
        t.invincible <= (t._hitIframeUntil || 0) - frameCount + 1);
  }

  attack(target) {
    const _t = target || this.target;
    if (_t && this.weapon && this.weapon.type === 'melee' && _t.health > 0) {
      const _helpless = this._targetHelpless(_t);
      // i-frame veto, swing would connect inside invincibility
      if (this._iframeVeto(_t)) return;
      // Fresh-shield parry veto. Parry exists only on HP shields with one stack. dealDamage gates
      // parry on the attacker's stun, so a stunned target can still parry us. No target-stun
      // exemption here.
      if (!_helpless && _t.shielding && (_t.shieldStacks || 1) === 1 &&
          (_t.shieldHoldTimer || 0) <= 15) return;
      // Counter Stance absorbs the hit and launches us. Never feed it: the stance is a visible
      // 20-frame state, so wait it out.
      if ((_t._counterStance || 0) > 0) return;
      // own-stamina discipline, don't buy +40% endlag for a contested exchange
      if (!_helpless && (this.stamina !== undefined) && this.stamina < 15) return;
    }
    // The plan veto goes last, after every engine-rule veto above. Those say a swing cannot pay.
    // This one says the plan would rather spend the moment differently. A preference must never
    // override a rule.
    if (this._planVetoAttack(_t)) { this._planVetoed = (this._planVetoed || 0) + 1; return; }
    // Punisher bait. Same ordering as the plan veto. Skipped when the target is committed, since
    // that is the window the swing is being saved for.
    if (_t && _t.health > 0 && this._punisherRead() && !this._targetHelpless(_t) &&
        !((_t.attackEndlag || 0) > 0 || (_t.cooldown || 0) > 4 || (_t._reloadTimer || 0) > 0)) {
      this._baitHeld = (this._baitHeld || 0) + 1;
      return;
    }
    super.attack(target);
  }

  // Defensive difficulty knob: the probability he fails to react to an attack he can see. Locked
  // to 0 (unbeatable tuning). Every defensive site shares this gate, so restoring beatability is a
  // one-line change.
  _reactionMistakeRate() {
    return 0;
  }

  // update(): ticks the new systems before physics.

  update() {
    // Habit engine: file this frame's posture and any opener against this target in the per-opponent
    // ledger. Covers real fights and the headless sim, which both reach here every AI tick.
    if (typeof SovHabits !== 'undefined' && this.target) SovHabits.observe(this, this.target);
    this._scarTick();
    // Recovery-jump budget is per airborne stint. It refills on ground contact only.
    if (this.onGround) this._recoverJumps = 0;
    this._checkLimiterBreak(this.target);
    this._updateSuperBank();
    this._updateNullRecoil();
    // Null Anchor is disabled. _updateNullAnchor() is kept unreferenced, so re-adding the call
    // below restores it.
    this._killFloorGovernor();
    this._habitDossierLine();
    this._vetoVoidStep();
    this._vetoSkyClimb();
    this._vetoExtraJump();
    this._ringoutGuard();
    this._edgePressure();
    super.update();
    // The brain drives movement and attacks (isAI=false), so updateAI never runs. This slice keeps
    // only the voice, journal and dossier observation alive.
    if (!this.isAI && typeof Brain !== 'undefined' && Brain.live && Brain.live.f === this) this._brainVoiceTick();
    this._resolveTactic();
    this._resolveApproach();
    this._airApproachGuard();
    this._observeTargetThreat();
    this._avoidCurses(this.speed || 5);
    this._inferTick();
    this._arsTrack();
    // The experiment: swing into their swing to produce the sample that separates the hypotheses.
    // After _inferTick, so it is booked like any other observation.
    if (this._wantsExperiment(this.target)) {
      this._expUsed = (this._expUsed || 0) + 1;
      this._expLast = (typeof frameCount !== 'undefined') ? frameCount : 0;
      try { this.attack(this.target); } catch (e) {}
    }
    this._airDenyTrack();
    // After _airDenyTrack, which owns vx during an air approach. A plan must never contest it.
    this._planTick();
    // Before _sampleDecision, which owns the same rising edge. A swing the gate converts is a guard
    // he chose, and the grid must be told so. A stated inference rule gets first refusal on the swing.
    if (!this._scarSwingGate(this.target) && !this._inferAct(this.target)) this._swingGate();
    this._sampleDecision();
    // Last, after super.update(): shield sites live in updateAI(), and _airDenyTrack raises one too.
    // Provisioning must see the final guard state but still land before the frame's hitboxes resolve.
    this._provisionShield();
    // Own ground tracker. Fighter.update() re-stamps _prevOnGround before returning, so
    // _airApproachGuard needs its own copy of last frame's state.
    this._airGuardPrevGround = this.onGround;
  }

  // Ringout guard: the defensive half of the edge game. He spent 7-10% of frames near the floor's edge
  // while healthy, and lost stocks to ringouts. isEdgeDanger() only checks the next step, so this measures
  // distance to the floor's end and nudges a grounded, uncommitted fighter toward the middle, as a bias on vx.
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
    // Scale the danger zone by what the opponent can launch him for. A 16-kb hammer threatens from
    // further in than a 7-kb spear.
    const t  = this.target;
    const kb = (t && t.weapon && t.weapon.kb) ? t.weapon.kb : 10;
    const DANGER = 110 + kb * 5;                       // ~145px vs spear, ~190 vs hammer
    if (m > DANGER) { this._ringoutRisk = 0; return; }
    const inward = marginL < marginR ? 1 : -1;
    let   risk   = 1 - m / DANGER;                     // 0 at the threshold, 1 at the lip

    // The corner is also where he converts. Knockback has a direction: when the target is on the outward
    // side, their hits push him toward centre, so the near edge is a wall he presses them into. Fade the
    // guard across that read instead of switching it off, so a cornered target frees him to commit.
    const _tgt = this.target;
    if (_tgt && _tgt.health > 0) {
      // >0 when the target is further out toward the near edge than he is.
      const outward = (this.cx() - _tgt.cx()) * inward;
      if (outward > 0) risk *= Math.max(0, 1 - outward / 90);
    }
    this._ringoutRisk = risk;
    if (risk <= 0.01) return;
    // Never push him off the other side, and never override a real hazard escape.
    if (this.isEdgeDanger(inward)) return;
    // Scaled by risk end to end, so it is continuous as the corner read fades the guard out.
    this.vx += inward * risk * 1.15;
    const cap = (this.classSpeedMult || 1) * 6.5;
    if (Math.abs(this.vx) > cap) this.vx = Math.sign(this.vx) * cap;
  }

  // Edge game: take the inside position so every hit he throws knocks the opponent outward. A dedicated
  // ringout move would make him hunt for it and decline ordinary damage, so this changes only which side
  // of the opponent he stands on.
  _edgePressure() {
    if (!SMK2_TUNE.edgePressure) return;
    const t = this.target;
    if (!t || t.health <= 0 || !this.onGround) return;
    // Never while committed. A swing, locked counter or super is worth more than position.
    if (this.attackTimer > 0 || this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if (this._counterLockTimer > 0 || this._preemptMode) return;

    const cx = this.cx(), tx = t.cx();
    const centre = this._wbMid();
    const outward = tx >= centre ? 1 : -1;            // away from stage centre
    // Ask the same helper the AI uses on itself. It already accounts for lava, disabled boss floors
    // and safe landings.
    let atEdge;
    try { atEdge = !!t.isEdgeDanger(outward); } catch (e) { return; }
    if (!atEdge) { this._edgeInsideFrames = 0; return; }

    // Already inside? His next hit already points the right way.
    const inside = (outward > 0) ? (cx < tx) : (cx > tx);
    if (inside) { this._edgeInsideFrames = (this._edgeInsideFrames || 0) + 1; return; }
    this._edgeInsideFrames = 0;

    // Outside: rotate around, but only a nudge, and only when it costs nothing. Bounded to a fraction
    // of his speed.
    if (Math.abs(tx - cx) > 200) return;              // too far for this to be the plan
    const around = -outward;
    if (this.isEdgeDanger(around)) return;            // never walk himself off
    this.vx += around * 0.55;
    const cap = (this.classSpeedMult || 1) * 6.5;
    if (Math.abs(this.vx) > cap) this.vx = Math.sign(this.vx) * cap;
  }

  // Loadout selection: a bandit over SMK2_LOADOUTS. He out-swung the player and still lost, converting
  // 8.0 damage per swing against their 12.6, locked to one kit all match. The counter prior only biases
  // the opening picks. Ten lives is enough to converge.

  // Damage this life, banked against the loadout that earned it.
  _recordLoadoutResult() {
    if (!this._loadout) return;
    const rec = this._loadoutStats[this._loadout.key] ||
                (this._loadoutStats[this._loadout.key] = { lives: 0, dealt: 0 });
    const gained = Math.max(0, (this.totalDamageDealt || 0) - (this._loadoutDealt0 || 0));
    rec.lives += 1;
    rec.dealt += gained;
  }

  // Epsilon-greedy over measured damage per life, seeded with the replay priors as one
  // pseudo-observation, so an untried kit is neither ignored nor trusted blindly.
  _pickLoadout() {
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.openLoadout) {
      try { const lo = this._pickOpenLoadout(); if (lo) return lo; } catch (e) {}
    }
    const pool = SMK2_LOADOUTS.filter(lo =>
      typeof WEAPONS !== 'undefined' && WEAPONS[lo.wk] &&
      lo.wk !== 'gauntlet' && lo.wk !== 'mkgauntlet');
    if (!pool.length) return null;

    // Exploration count comes from the dossier, not _loadoutStats: _pickLoadout runs before any life is
    // banked, so the in-match count was always 0. The dossier is the only loadout memory that survives a match.
    const _dk0 = (typeof SovDossier !== 'undefined') ? this._dossierKeys() : [];
    const tried = _dk0.length
      ? pool.reduce((n, lo) => n + (SovDossier.loadoutPrior(_dk0, lo.key) ? 1 : 0), 0)
      : 0;
    const eps = tried < 3 ? 0.30 : 0.10;
    const explore = Math.random() < eps;

    // Put the priors on the observed scale. A fixed 0.4 seeded untried kits near 98 and tried ones
    // near 250, so the first good kit was never challenged. Rescaling by the observed mean keeps the
    // priors' relative ordering.
    let obsD = 0, obsL = 0;
    for (const lo of pool) {
      const r = this._loadoutStats[lo.key];
      if (r && r.lives) { obsD += r.dealt; obsL += r.lives; }
    }
    const priorMean = pool.reduce((a, lo) => a + lo.prior, 0) / pool.length;
    const scale = (obsL > 0 && priorMean > 0) ? (obsD / obsL) / priorMean : 0.4;

    // Per-opponent history as extra pseudo-observations. In-match stats only exist from life 2 and
    // reset each match. The dossier lets a rematch open on the kit that beat this person last time.
    const _dkeys = _dk0;

    // Scored first, chosen second, the exploration draw needs the scores too.
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

    // Explore from the top of the list, not the whole pool. Filtering on the counter bonus does
    // nothing here: the bonus is capped at +/-18%, so against a 130-reach spear no kit clears 1.0.
    // The score has the range (85 vs 44 against a spear), so he explores among kits that can win.
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
    // Possession runs this class on the player's own fighter. An unguarded kit change would rewrite
    // the human's weapon and class, so the host keeps its own body, weapon and class. Only the brain
    // is borrowed.
    if (typeof SovereignControl !== 'undefined' && SovereignControl.active
        && SovereignControl._host === this) return;
    this._loadout   = lo;
    this.weapon     = WEAPONS[lo.wk];
    this.weaponKey  = lo.wk;
    this._ammo      = 0;
    if (lo.cls && typeof applyClass === 'function') {
      // Snapshot live, not from the constructor: startGame boosts difficulty after construction, so a
      // constructor snapshot would nerf him ~9% on every respawn. Re-equipping scales from his base,
      // not from the previous class's HP.
      const _hp  = (this._loadoutHpBase && this.maxHealth === this._loadoutHpSet)
        ? this._loadoutHpBase : this.maxHealth;
      const _spd = this.classSpeedMult || 1;
      applyClass(this, lo.cls);
      if (lo.open && typeof CLASSES !== 'undefined' && CLASSES[lo.cls]) {
        // Open mode: the class's real trade-offs, scaled onto his stat line. Restoring his stats would
        // hide that a class is tanky or fragile.
        const C = CLASSES[lo.cls];
        this.maxHealth      = Math.round(_hp * (C.hp || 150) / 150);
        this.health         = this.maxHealth;
        this.classSpeedMult = _spd * (C.speedMult || 1);
      } else {
        // HP follows the class, as it does for the player. His own 150 would have made a Ronin 150 HP
        // against a player Ronin's 132.
        const C = (typeof CLASSES !== 'undefined' && CLASSES[lo.cls]) || null;
        this.maxHealth      = C && C.hp ? Math.round(_hp * C.hp / 150) : _hp;
        this.health         = this.maxHealth;
        this.classSpeedMult = _spd;
      }
      this._loadoutHpBase = _hp;
      this._loadoutHpSet  = this.maxHealth;
    }
    // Signature kit routes to his own finisher, keyed under 'nullblade' in CLASS_FINISHERS. Mirrors the
    // _domainKey escape hatch.
    this._finisherKey = lo.fin || null;
    this._loadoutDealt0 = this.totalDamageDealt || 0;    if (lo.open) this._arsStart();
  }

  // Open arsenal: the pool is every legal weapon and class with flat priors. The only evidence is his own
  // net damage per 1000 frames per life (SovDossier.recordArsenal). Thompson sampling: draw a plausible
  // value per option and take the best. Weapon first. With pairedClass the class is then chosen for that weapon.
  _pickOpenLoadout() {
    if (typeof WEAPON_KEYS === 'undefined' || typeof CLASSES === 'undefined') return null;
    if (typeof SovDossier === 'undefined' || typeof SovDossier.arsenalPrior !== 'function') return null;
    const t = this.target;
    // Melee only: boss fights bar ranged weapons, and his brain is melee-shaped. Ranged kits
    // scored near 0 in the lab.
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
    const choose = (field, opts, pairW) => {
      // Pooled spread of per-life outcomes: the unit his uncertainty is in.
      let n = 0, r = 0, r2 = 0;
      const tbl = any ? any[field] : {};
      for (const k of Object.keys(tbl)) { n += tbl[k].n; r += tbl[k].r; r2 += tbl[k].r2; }
      const grand = n ? r / n : 0;
      const sd = n > 3 ? Math.max(5, Math.sqrt(Math.max(0, r2 / n - grand * grand))) : 40;
      const K = 3;   // global evidence counts as at most K lives about this opponent
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
        // Paired: what this class did with this weapon, shrunk toward the class's overall record.
        // The opponent-specific pair wins when there is one.
        if (pairW) {
          const pk = pairW + '|' + o;
          const cP = (opp && opp.combo && opp.combo[pk] && opp.combo[pk].n) ? opp.combo[pk]
                   : (any && any.combo && any.combo[pk] && any.combo[pk].n) ? any.combo[pk] : null;
          if (cP) {
            const kP = Math.min(K, neff);
            mean = (cP.n * (cP.r / cP.n) + kP * mean) / (cP.n + kP); neff = cP.n + kP;
          }
        }
        const draw = mean + (sd / Math.sqrt(neff)) * gauss();
        if (draw > bestDraw) { bestDraw = draw; best = o; }
      }
      return best;
    };
    const wk = choose('weapon', W);
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const cls = choose('cls', C, TUNE.pairedClass ? wk : null);
    if (!wk) return null;
    return { key: wk + '|' + cls, wk, cls: cls === 'none' ? null : cls, clsKey: cls,
             fin: wk === 'nullblade' ? 'nullblade' : null, open: true };
  }

  // Local arsenal record plus SOV_ARSENAL (js/smb-sov-arsenal.js). Summed into a copy each pick and
  // never written back, so the innate layer keeps its built weight.
  _innateArsenal(local) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.innateArsenal === false || typeof SOV_ARSENAL === 'undefined' || !SOV_ARSENAL || !SOV_ARSENAL.arsenal) return local;
    const out = {};
    for (const src of [SOV_ARSENAL.arsenal, local]) {
      for (const bk of Object.keys(src)) {
        const dst = out[bk] || (out[bk] = { weapon: {}, cls: {}, combo: {} });
        for (const field of ['weapon', 'cls', 'combo']) {
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

  // One sample per life. Damage taken is tracked here since Fighter has no counter. Only decreases
  // count, so a respawn refill never reads as healing.
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

  // Close the life's sample. 'death' starts the next life on the same kit (locked per match), 'end'
  // closes it for good. Both matter: a match he wins never ends in his death, and dropping those
  // lives would bias against the kits that win.
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

    // Kit is chosen once per match: re-picking on respawn changed his weapon mid-fight and rerolled the
    // player's kit under possession. Cross-match learning still runs through _recordLoadoutResult and the dossier.
  respawn() {
    this._recordLoadoutResult();
    // Bank per life, so the next life starts from the current total. Otherwise damage would be
    // counted again on every death.
    this._loadoutDealt0 = this.totalDamageDealt || 0;
    super.respawn();
    // The dossier prior is keyed on the opponent, and super.respawn() can disturb the baseline, so
    // it is re-applied each life.
    try { this._seedFromDossier(this.target); } catch (e) {}
  }

  // Pick the match's kit on the first frame there is an opponent to counter. Not at construction:
  // _pickLoadout scores against this.target, and none exists when startGame builds him.
  _ensureMatchLoadout() {
    if (this._loadoutLocked) return;
    // Possession: the human picked their own kit, never spend a pick on them.
    if (typeof SovereignControl !== 'undefined' && SovereignControl.active
        && SovereignControl._host === this) { this._loadoutLocked = true; return; }
    if (!this.target || this.target.health <= 0) return;
    this._loadoutLocked = true;
    const lo = this._pickLoadout();
    if (lo) this._applyLoadout(lo);
    try { this._seedFromDossier(this.target); } catch (e) {}
  }

  // Sky ceiling: a soft ceiling from the highest deck, not a position clamp. Against the Creator a -19 jump
  // plus the double jump reached y=-396 on a 520px stage. He stops climbing once his head reaches the top
  // of the play area. Stun and ragdoll are exempt, since being launched off screen is a hit he earned.
  // Jump economy veto: one ground jump and one air jump, like a player. About thirty paths write vy directly,
  // so this is one choke point, and an unpaid launch is cancelled. Knockback still throws him, and anything
  // faster than his hardest jump is a launcher or dash, so it passes.
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
      this.canDoubleJump = false;     // legitimate air jump, make him pay for it
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
    // One jump of headroom over the highest deck, never more than a body-height above the screen edge.
    const SKY_CEIL = Math.max(-40, topY - 165);
    if (this.y <= SKY_CEIL) this.vy = Math.max(this.vy, -1.5);
  }

  // Tactic grid: situation x action, scored by consequence. A single number could say 'jumping at them is
  // bad', not 'bad when they are above me and close'. 9 x 6 cells, coarse on purpose, persisted per opponent.
  _situationKey(t) {
    const tgt = t || this.target;
    if (!tgt) return null;
    const d  = Math.abs(tgt.cx() - this.cx());
    const dy = tgt.cy() - this.cy();
    const D = d < 90 ? 'c' : d < 220 ? 'm' : 'f';           // close / mid / far
    const H = dy < -40 ? 'a' : dy > 40 ? 'b' : 'l';          // above / below / level
    return D + H;
  }

  // Book a decision and resolve it by what it cost. Opened when he commits, closed 30 frames later
  // with the health delta on both sides. One booking at a time: overlapping windows would credit the
  // same damage to two decisions.
  _markTactic(action, t, prio) {
    if (this.health <= 0) return;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const P = prio || 0;
    // Priority preemption: a committing swing may evict a movement booking in its first few frames.
    // Movement edges fire far more often, so a first-come slot starved the attack and shield cells.
    if (this._pendingTactic) {
      const open = this._pendingTactic;
      if (!(P > (open.prio || 0) && _fc - open.frame <= 10)) return;
    }
    // Movement is rate-limited too, so a pacing fighter cannot bury the cells under identical bookings.
    if (P === 0 && _fc - (this._lastMoveBook || -999) < 45) return;
    const tgt = t || this.target;
    const sit = this._situationKey(tgt);
    if (!sit) return;
    if (P === 0) this._lastMoveBook = _fc;
    this._pendingTactic = {
      sit, action, prio: P, frame: _fc, tgt: tgt || null,
      hp: this.health, lives: this.lives,
      tHp: tgt ? tgt.health : 0, tLives: tgt ? tgt.lives : 0,
      // Lockout he inherited, so the resolve can tell what he created.
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
    // A death in the window is the maximum price a decision can carry. Health is back at full by now,
    // so price it from the snapshot plus a surcharge.
    const died  = this.lives !== P.lives;
    const taken = died ? P.hp + 40 : Math.max(0, P.hp - this.health);
    // Same for them: if they died or respawned, the delta is garbage. Kill credit is the mirror of the
    // death surcharge. Target identity: the snapshot only means something against the fighter it came
    // from, and every bot spawns with the same `lives`.
    const _bt = P.tgt;
    const dealt = !_bt ? 0
                : (_bt.lives === P.tLives) ? Math.max(0, P.tHp - _bt.health)
                : (_KC() ? (this._killCredits = (this._killCredits || 0) + 1, P.tHp + 40) : 0);
    // A parry stuns for 90 frames but the window closes at 30, and a perfect shield books zero while the
    // punish it enables is credited to 'attack'. The lockout he created counts as value, priced off the
    // lockout added inside the window.
    let created = 0;
    if (_bt && _bt.lives === P.tLives) {
      const lockNow = Math.max(_bt.stunTimer || 0, _bt._parryVulnFrames || 0);
      if (lockNow > (P.tLock || 0) + 20) created = (lockNow - (P.tLock || 0)) * 0.22;
    }
    const row = this._tacticGrid[P.sit] || (this._tacticGrid[P.sit] = {});
    const e   = row[P.action] || (row[P.action] = { tries: 0, taken: 0, dealt: 0 });
    e.tries++; e.taken += taken; e.dealt += dealt + created;
    // Rolling window. Without decay a cell averages the whole match, and a fixed answer never comes back.
    if (e.tries > 10) { e.tries *= 0.75; e.taken *= 0.75; e.dealt *= 0.75; }
  }

  // Net health per attempt. Negative means the decision loses him the exchange. Cell first, falling back
  // to the action's average across situations, so he specialises only once a cell earns it.
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

  // Argmax across situations: his best-scoring action here, which can differ per cell.
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

  // Air approach channel: its own booking slot, since this statistic drives the only gate with a
  // measured win. Sharing the grid's slot starved it (the guard fired 0-2 times a match instead of
  // 5-17). A signal that drives a decision gets its own channel.
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
    // Kill credit and target identity, as in _resolveTactic.
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

  // Decision sampler. Watches state rather than editing the ~40 paths that decide, the same
  // choke-point rule as _vetoExtraJump and _vetoVoidStep. Rising edges only: a decision is the frame
  // he commits to it.
  _sampleDecision() {
    const t = this.target;
    if (!t || t.health <= 0 || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    const wasGrounded = this._airGuardPrevGround;

    // Swing committed this frame.
    if ((this.attackTimer || 0) > (this._prevAtkSample || 0) && !this._prevAtkSample) {
      this._markTactic('attack', t, 1);
      const sg = this._scarSwingSig(t);
      if (sg) this._scarOpen('swing', sg, t);
    }
    this._prevAtkSample = this.attackTimer || 0;

    // Guard raised this frame. (_provisionShield owns the same edge for stacks.)
    if (this.shielding && !this._prevShieldSample) this._markTactic('shield', t, 1);
    this._prevShieldSample = !!this.shielding;

    // Super spent this frame.
    const sm = this.superMeter || 0;
    if (this._prevSuperSample - sm > 25) this._markTactic('super', t, 2);
    this._prevSuperSample = sm;

    // Grounded movement, committed, toward or away.
    if (this.onGround && wasGrounded && Math.abs(this.vx) > 1.5) {
      const toward = Math.sign(t.cx() - this.cx()) === Math.sign(this.vx);
      const key = toward ? 'approach_ground' : 'retreat';
      if (this._prevMoveSample !== key) this._markTactic(key, t, 0);
      this._prevMoveSample = key;
    } else if (this.onGround) {
      this._prevMoveSample = null;
    }
  }

  // Air approach guard: the veto the grid feeds. Thirty paths jump at a target above them, so watch the
  // launch at one choke point, not the launcher. One in five attempts is let through, since a veto that
  // stops updating is a one-way door.
  _airApproachGuard() {
    if (this._airDenyTimer > 0) this._airDenyTimer--;
    const prevVy = this._scarPrevVy || 0;
    this._scarPrevVy = this.vy;
    const t = this.target;
    const wasGrounded = this._airGuardPrevGround;
    if (!t || t.health <= 0 || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;

    // A fresh ground launch, this frame, at a target holding higher ground.
    const launching = wasGrounded && !this.onGround && this.vy < -8;
    // The double jump is the same approach from another launcher. Only the scar layer acts on it,
    // since the ledger was measured on ground launches.
    const airJump = !wasGrounded && !this.onGround && prevVy > -3 && this.vy < -8;
    if (!launching && !airJump) return;
    const dx = Math.abs(t.cx() - this.cx());
    const highGround = t.onGround && t.y < this.y - 40;
    if (!highGround) return;
    const occupiedHighGround = launching && dx < 220;
    // Wider than the ledger's 220: a running jump from further out still arrives inside their swing.
    if (!occupiedHighGround && dx >= 320) return;

    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.tacticLedger === false) return;
    let method = 'naked';
    const val = this._approachValue();
    const denyAt  = (typeof TUNE.airDenyAt === 'number') ? TUNE.airDenyAt : -4;
    const explore = (typeof TUNE.tacticExplore === 'number') ? TUNE.tacticExplore : 0.2;
    if (occupiedHighGround && val !== null && val < denyAt && Math.random() > explore) {
      // Arriving neutral inside their swing is what costs him: 126 of 127 hits landed airborne or within
      // 0.6s of touchdown. So the response changes how he arrives: land on the lip, or arrive behind a guard
      // (a fresh guard parries for 8 frames), or with no guard left concede the platform and hold the ground.
      // Cancelling outright cut the cost 63% but he died more, since passivity loses on the clock.
      method = this._approachLip(t) !== null ? 'lip' : (this.shieldStacks || 0) < 4 ? 'armor' : 'hold';
    }
    method = this._scarApproachMethod(method, t);
    if (method === 'naked' && !occupiedHighGround) { this._scarOpen('air', 'naked', t); return; }
    this._airDenyX = method === 'lip' ? this._approachLip(t) : null;
    this._armorApproach = method === 'armor';
    if (method === 'hold') {
      // Damp vx with the cancel, or the carried momentum walks him off the lip into a self-ringout.
      this.vy = 0; this.vx *= 0.3; this._jumpVyPrev = 0;
    }
    if (method !== 'naked') this._airDenyTimer = 90;
    // Still booked: an armoured or redirected approach has a different price, and the grid only stays
    // honest if it reads what he actually did.
    if (method === 'hold') return;
    if (occupiedHighGround) { this._markApproach(t); this._markTactic('approach_air', t, 1); }
    this._scarOpen('air', method, t);
  }

  // Swing gate: the second composed counter. If swinging here has been losing health and guarding here has
  // been winning it, the swing becomes a guard. Needs both halves of the evidence, or he would stop attacking.
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
    // Convert to a guard when guarding here scores clearly better (swingGate). Otherwise drop a swing
    // that clearly loses here (swingHold). Mid-range swings while they stood above him ran -16 per try,
    // and nothing stopped them.
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

  // The landing spot on their platform outside their swing: the lip on his approach side. Null when
  // they already stand on that lip with no room to land clear, the one case where cancelling is right.
  _approachLip(t) {
    if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return null;
    const plat = currentArena.platforms.find(p =>
      p && !p.isFloor && !p.isFloorDisabled &&
      t.cx() > p.x - 20 && t.cx() < p.x + p.w + 20 && Math.abs((t.y + t.h) - p.y) < 18);
    if (!plat) return null;
    const lip = (t.cx() > this.cx()) ? plat.x + 22 : plat.x + plat.w - 22;
    return Math.abs(lip - t.cx()) > 120 ? lip : null;
  }

  // Steering only: nudges vx and never seizes the fighter, so every other system still runs. Airborne
  // he flies to the lip. Grounded (the cancelled case) he holds the ground under them and takes them
  // on the way down.
  _airDenyTrack() {
    // Raise the guard on descent, not at launch. Held from the top of the arc it would be stale by
    // landing, and the parry window is the first 8 frames of a fresh raise.
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

  // One-strike scars: a method he was using when this opponent opened on him is barred against them for
  // the rest of the match. Windows open where a method is committed (_scarOpen). A hit he lands first closes them clean.
  _scarOn(chan) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.scars === false) return false;
    return !chan || TUNE['scar' + chan[0].toUpperCase() + chan.slice(1)] !== false;
  }

  _scarsFor(t) {
    if (!t) return null;
    let r = this._scarBook.get(t);
    if (!r) { r = { air: new Set(), chase: false, descent: new Set(), swing: new Set() }; this._scarBook.set(t, r); }
    return r;
  }

  _scarOpen(chan, sig, t) {
    if (!t || !this._scarOn(chan)) return;
    const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    this._scarWatch = this._scarWatch.filter(w => !(w.chan === chan && w.tgt === t));
    this._scarWatch.push({ chan, sig, tgt: t, frame: fc, landF: null, tHp: t.health, tLives: t.lives });
  }

  _scarBurn(chan, sig, t) {
    const r = this._scarsFor(t);
    if (!r) return;
    const fresh = chan === 'chase' ? !r.chase : !r[chan].has(sig);
    // A barred method that still got him hit means some path went round the bar.
    if (!fresh) { this._scarRepeats = (this._scarRepeats || 0) + 1; return; }
    if (chan === 'chase') r.chase = true; else r[chan].add(sig);
    this._scarLog.push({ chan, sig, frame: (typeof frameCount !== 'undefined') ? frameCount : 0 });
    if (typeof showBossDialogue === 'function' && typeof SMK2_SCAR_LINES !== 'undefined' && (this._scarLineCd || 0) <= 0) {
      this._scarLineCd = 600;
      showBossDialogue(SMK2_SCAR_LINES[Math.floor(Math.random() * SMK2_SCAR_LINES.length)], 120);
    }
  }

  // First in update(): any hit since his last frame is read against the windows open when it landed.
  _scarTick() {
    if ((this._scarLineCd || 0) > 0) this._scarLineCd--;
    if (!this._scarOn()) return;
    const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const took = this._scarHp !== undefined && (this.lives < this._scarLives || this.health < this._scarHp - 0.01);
    this._scarHp = this.health;
    this._scarLives = this.lives;
    if (took) {
      // Mid-combo hits belong to the opener, not to a new method.
      const opener = fc - (this._scarLastHit === undefined ? -9999 : this._scarLastHit) > 60;
      this._scarLastHit = fc;
      // Only the fighter who hit him can indict a method aimed at them. A hazard or a third party says
      // nothing about the approach.
      const by = (fc - (this._lastAttackerFrame || -9999) <= 2) ? this._lastAttacker : null;
      if (opener && by) {
        for (const w of this._scarWatch) if (w.tgt === by) this._scarBurn(w.chan, w.sig, w.tgt);
      }
      this._scarWatch.length = 0;
      return;
    }
    if (!this._scarWatch.length) return;
    this._scarWatch = this._scarWatch.filter(w => {
      const tg = w.tgt;
      if (!tg || tg.health <= 0 || tg.lives !== w.tLives) return false;
      if (tg.health < w.tHp - 0.01) return false;
      if (w.chan === 'swing') return fc - w.frame <= 45;
      // Air windows run through the landing. 126 of 127 hits in one replay landed airborne or within
      // 0.6s of touchdown.
      if (this.onGround && w.landF === null && fc - w.frame > 3) w.landF = fc;
      if (w.landF !== null && fc - w.landF > 40) return false;
      return fc - w.frame <= 180;
    });
  }

  // The approach he is about to make, with every burned method swapped for the next clean one. 'hold'
  // is never burned, since it is not an approach.
  _scarApproachMethod(m, t) {
    if (m === 'hold' || !this._scarOn('air')) return m;
    const r = this._scarsFor(t);
    if (!r || !r.air.has(m)) return m;
    const ok = { lip: this._approachLip(t) !== null, armor: (this.shieldStacks || 0) < 4, naked: true };
    for (const alt of ['lip', 'armor', 'naked']) if (ok[alt] && !r.air.has(alt)) return alt;
    return 'hold';
  }

  // Swing scars key on what the opponent was doing, never on neutral. A scar on 'swing at close range'
  // would end his offence after one whiff punish.
  _scarSwingSig(t) {
    const st = t.shielding ? 'shield' : (t.attackTimer || 0) > 0 ? 'swing' : !t.onGround ? 'air' : null;
    if (!st) return null;
    const sit = this._situationKey(t);
    return sit ? sit + ':' + st : null;
  }

  // Same edge and cancel as _swingGate, ahead of it and with no explore.
  _scarSwingGate(t) {
    if (!t || t.health <= 0 || this.health <= 0 || !this._scarOn('swing')) return false;
    if ((this.attackTimer || 0) <= 0 || this._prevAtkSample > 0) return false;
    const r = this._scarsFor(t);
    if (!r || !r.swing.size) return false;
    const sg = this._scarSwingSig(t);
    if (!sg || !r.swing.has(sg)) return false;
    this.attackTimer = 0;
    this.cooldown    = Math.max(this.cooldown || 0, 10);
    if (this._infOpen && this._infOpen.f === ((typeof frameCount !== 'undefined') ? frameCount : 0)) this._infOpen = null;
    if (!t.shielding && (this.shieldStacks || 0) < 4) {
      this.shielding  = true;
      this._armorHold = Math.max(this._armorHold || 0, 12);
    }
    return true;
  }

  // Shield provisioning: eight paths raise a guard with a bare `this.shielding = true`, and none set
  // shieldStacks or shieldHP, so dealDamage() read him as 1 stack with 0 HP. On the rising edge, provision
  // exactly what a human press gets, including the degradation ladder and recharge window.
  _provisionShield() {
    // Fighter.update() enforces the ground-only guard, but _airDenyTrack runs after it. Refuse the
    // raise here, or each refused frame books a fresh stack and wears the real guard down.
    if (this.shielding && (!this.onGround || this._landLag > 0) && !this._brShieldTimer) {
      this.shielding = false;
    }
    const up = !!this.shielding;
    const wasUp = !!this._prevShieldProvision;
    if (up && !wasUp && this.health > 0) {
      // Same rules as a human press (smb-combat.js shieldRaise); refused = the wall the player hits.
      if (!shieldRaise(this)) this.shielding = false;
    }
    // Stamped last, after a depletion may have forced the guard down. A refused raise must not read as
    // already holding, or the next frame skips provisioning and hands him a 0 HP guard.
    this._prevShieldProvision = !!this.shielding;
  }

  // Void step veto: one choke point after every AI path, just before physics consumes vx. Self-propelled
  // grounded movement does not walk off a ledge. Knockback into a void is a legitimate ring-out, and stun
  // and ragdoll are exempt. When the far side is jumpable he jumps rather than stops.
  _vetoVoidStep() {
    // Tick the hop cooldown first, unconditionally. Ticking it in the fall-through branch meant it never
    // ticked while airborne, so he landed still on cooldown, got pinned at vx=0, and repeated. That was
    // 75% of frames standing still.
    if (this._voidHopCd > 0) this._voidHopCd--;

    if (!this.onGround || this.health <= 0) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return;
    const dir = Math.sign(this.vx);
    if (!dir) return;
    // Anything this fast is knockback or a dash, not a walk, do not fight it.
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
      // Leaving the ground has its own rate limit. This only stops a double fire before onGround clears.
      this._voidHopCd = 8;
      return;                                             // keep vx, carry across
    }
    this.vx = 0;                                          // nothing to reach: hold the ledge
  }

  // Stale-bank release: the bar is spent even with no window, since a relentless aggressor never opens one.
  // Runs every frame here, because _tryTacticalConversion is reached too rarely to ever see superReady.
  //
  // Grid-driven release: the grid's strongest opinion is on super (ca +30.97 vs attack +5.26 net per try
  // over 1170 overnight matches). It spends super only where the record says it is worth far more.
  _gridWantsSuper(t) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.superGate === false || TUNE.tacticLedger === false) return false;
    const sit = this._situationKey(t);
    if (!sit) return false;
    // Both halves required, as in _swingGate. _tacticValue falls back to the cross-situation average
    // when a cell is thin, so this answers early in a match too.
    const sup = this._tacticValue(sit, 'super');
    const atk = this._tacticValue(sit, 'attack');
    if (sup === null || atk === null) return false;
    const margin = (typeof TUNE.superGateMargin === 'number') ? TUNE.superGateMargin : 8;
    return sup > atk + margin;
  }

  // Burst (Fighter.burst). A burst pays a domain charge, so it is not a pure loss. Not when he is at
  // 4 supers and the next one is Absolute Dominion. Then he eats the string unless it could end the life.
  _aiWantsBurst() {
    const d = this._aiBurstDanger();
    if (!d || d.since < 2) return false;
    const _hp = this.health / (this.maxHealth || 1);
    if ((this._domainSuperCount || 0) >= 4 && _hp > 0.35) return false;
    if (d.combo >= 2 || (d.combo >= 1 && _hp < 0.30)) {
      this._burstsUsed = (this._burstsUsed || 0) + 1;
      return true;
    }
    return false;
  }

  // Absolute Dominion is banked, not forced (Fighter._wantsConviction). He keeps it when the plain
  // super is worth more: it can end this life, or he needs its heal (the expansion heals nothing).
  // Otherwise the bank is spent, it can't grow past one.
  _sovWantsConviction(t) {
    if (!t || t.health <= 0) return true;
    const tHp = t.health / (t.maxHealth || 1);
    const hp  = this.health / (this.maxHealth || 1);
    if (tHp < 0.25) return false;
    if (hp < 0.25 && tHp > hp) return false;
    return true;
  }

  _updateSuperBank() {
    if (this.health <= 0) { this._superFullSince = 0; this._bankStale = false; return; }
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;

    if (!this.superReady) { this._superFullSince = 0; this._bankStale = false; return; }
    if (!this._superFullSince) this._superFullSince = _fc;

    // Was ~6s. Across the September replays that hold kept him on a full bar for 20-36% of each match,
    // capping him at 2-3 spends per life. The domain counter only advances on spends, so the hold, not
    // his charge rate, kept Absolute Dominion out of reach. ~1.5s still buys a real read.
    const _held = _fc - this._superFullSince;
    this._bankStale = _held > 90;
    // A grid-favoured cell shortens the hold to 20 frames rather than removing it. Every gate below
    // still applies: range, stun, endlag and raised guard.
    const _gridRelease = _held > 20 && this._gridWantsSuper(this.target);
    if (!this._bankStale && !_gridRelease) return;
    if (_gridRelease && !this._bankStale) this._gridSupers = (this._gridSupers || 0) + 1;

    // Don't fire it into nothing, it still has to be able to connect.
    const t = this.target;
    if (!t || t.health <= 0) return;
    // A guard would make the spend worthless, but a player who just holds shield would freeze the bar
    // for the whole life. Past ~8s the pressure is worth more than the perfect window.
    if (t.shielding && _held < 500) return;
    if (this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if ((this.attackEndlag || 0) > 0) return;
    const d = Math.hypot(t.cx() - this.cx(), t.cy() - this.cy());
    // He closes distance himself, so a wider gate lets the release fire on approach.
    if (d > 300) return;

    this.useSuper(t);
    if (!this.superReady) this._superFullSince = 0;
  }

  // Walk speed parity: his movement branches could reach ~2x what a player's input can, so vx is capped
  // to the formula processInput() uses, from Fighter.update() just before integration.
  _walkSpeedCap() {
    const _curse = this.curses && this.curses.some(c => c.type === 'curse_slow');
    const _chaos = gameMode === 'minigames' && currentChaosModifiers.has('speedy') ? 1.4 : 1.0;
    const _water = currentArena && currentArena.isSlowMovement ? 0.72 : 1.0;
    const _earth = currentArena && currentArena.earthPhysics   ? 0.70 : 1.0;
    const _kite  = (this._kiteSpeedMult != null) ? this._kiteSpeedMult : 1.0;
    return 5.2 * (this.classSpeedMult || 1.0) * (this._speedBuff > 0 ? 1.35 : 1.0) *
           (_curse ? 0.6 : 1.0) * _chaos * _water * _earth * _kite;
  }

  _capSelfVx() {
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    // Ability dashes belong to the weapon, and a player gets the same dash, so a fresh cooldown
    // exempts a short window.
    const _ab = this.abilityCooldown || 0;
    if (_ab > (this._capPrevAbCd || 0)) this._capDashUntil = _fc + 10;
    this._capPrevAbCd = _ab;
    if (_fc < (this._capDashUntil || 0)) return;
    if (this.health <= 0 || this.stunTimer > 0 || this.ragdollTimer > 0 || this.hurtTimer > 0) return;
    if (this.superActive || this._dimPunchGravLock || this._domainRising) return;
    // Knockback momentum outlives hurtTimer and is not his to shed.
    if (this._lastAttackerFrame != null && _fc - this._lastAttackerFrame < 24) return;
    const cap = this._walkSpeedCap();
    if (Math.abs(this.vx) > cap) this.vx = Math.sign(this.vx) * cap;
  }

  // Null Recoil: a juggle break. He spent over a third of a fight stunned or ragdolled while updateAI()
  // was gated off. Enough hits while genuinely helpless discharge the blade: stun and ragdoll clear, the
  // attacker is thrown off, and he gets a brief beat of invincibility. Runs in update() like Null Anchor.
  // No damage, no meter, ~9s cooldown.
  _updateNullRecoil() {
    if (this._recoilCd > 0)    this._recoilCd--;
    if (this._recoilFlash > 0) this._recoilFlash--;
    if (this.health <= 0) return;
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    if (this.invincible >= 900) return; // finisher/cinematic lock

    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;

    // Trigger on time removed from the match, not hit spacing: hits alternate between stunned and
    // recovering, so counting hits never reached the threshold. Juggled, chain-stunned or held airborne
    // all count. Airborne alone does not, since he jumps by choice.
    const _recentHit = (this._lastAttackerFrame != null) && (_fc - this._lastAttackerFrame < 45);
    const _helpless = (this.stunTimer > 0) || (this.ragdollTimer > 0) ||
                      (!this.onGround && _recentHit);
    const _WINDOW = 180;  // ~3s of recent history
    if (_fc - this._recoilLastFrame > _WINDOW) this._recoilHits = 0; // decayed to nothing
    if (_helpless) {
      this._recoilHits = Math.min(_WINDOW, (this._recoilHits || 0) + 1);
      this._recoilLastFrame = _fc;
    } else if (this._recoilHits > 0) {
      // Free frames pay the meter back down at double rate, so a brief stumble never builds into a break.
      this._recoilHits = Math.max(0, this._recoilHits - 2);
    }

    // Must be under fire, or a long fall or a chosen jump would charge the escape.
    const _underFire = (this._lastAttackerFrame != null) && (_fc - this._lastAttackerFrame < _WINDOW);

    // ~1.75s of the last ~3s unable to act, while being hit.
    if (this._recoilHits < 105 || !_underFire || this._recoilCd > 0) return;

    // DISCHARGE
    this._recoilHits      = 0;
    this._recoilLastFrame = -9999;
    this._recoilCd   = 540;  // ~9s
    this._recoilFlash = 20;
    this.stunTimer    = 0;
    this.ragdollTimer = 0;
    this.ragdollSpin  = 0;
    if (this.state === 'stunned' || this.state === 'ragdoll') this.state = 'idle';
    this._stunGuardUntil = Math.max(this._stunGuardUntil || 0, frameCount + 26); // one clean beat, not a reset
    // Kill the juggle's upward velocity so he returns to the floor, and reset the launch chain.
    if (this.vy < 0) this.vy = 0;
    this._launchCount = 0;

    // Throw the attacker off, space is the whole point of the break.
    const _a = this._lastAttacker;
    if (_a && _a.health > 0 && _a !== this &&
        Math.hypot(_a.cx() - this.cx(), _a.cy() - this.cy()) < 220) {
      const _dir = (_a.cx() >= this.cx()) ? 1 : -1;
      _a.vx = _dir * 15;
      if (typeof applyLaunch === 'function') applyLaunch(this, _a, -9);
      _a.stunTimer = Math.max(_a.stunTimer || 0, 14);
      // No damage on purpose: an escape, not a punish. It buys neutral and nothing else.
    }

    if (typeof queueAnnouncement === 'function') queueAnnouncement('NULL RECOIL', '#cc2200');
    if (typeof spawnParticles === 'function') {
      spawnParticles(this.cx(), this.cy(), '#cc2200', 22);
      spawnParticles(this.cx(), this.cy(), '#ffffff', 12);
    }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
    if (typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
  }

  // Null Anchor is disabled. _updateNullAnchor() is kept unreferenced, so re-adding the call in update()
  // restores it. It saved only one of ten deaths in the measured match, and it costs the whole super bar,
  // which otherwise trades directly against Absolute Dominion.
  _updateNullAnchor() {
    if (this._anchorCd > 0) this._anchorCd--;
    if (this.health <= 0) return;
    if (typeof isCinematic !== 'undefined' && isCinematic) return;
    if (this.invincible >= 900) return; // finisher/cinematic lock, don't teleport out
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
    // Fatal fall in progress: below the visible arena, still descending, kill line close. Fires ragdolled or
    // not, since the tether belongs to the blade. The save costs the whole super bar and a 60s cooldown.
    const _anchorCost = 50;
    if (this._anchorCd <= 0 && (this.superMeter || 0) >= _anchorCost &&
        this.vy > 0 && this.y > Math.min(_kill - 80, GAME_H + 20)) {
      this.superMeter = 0;
      this.superReady = false;
      this._anchorTetherFrom = { x: this.cx(), y: this.cy() };
      this._anchorFlashTimer = 22;
      this._anchorCd         = 3600; // 60s, a re-launch inside this window still kills
      if (typeof queueAnnouncement === 'function') {
        queueAnnouncement('NULL ANCHOR — SUPER SPENT', '#cc2200');
      }
      this.x = this._anchorX; this.y = this._anchorY;
      this.vx = 0; this.vy = 0;
      this.ragdollTimer = 0;
      this.stunTimer    = Math.min(this.stunTimer, 6);
      this._stunGuardUntil = Math.max(this._stunGuardUntil || 0, frameCount + 18); // land safely, no anchor-camping
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

  // Area-threat perception: boss and arena set-piece hazards. The threat scan only read the projectile
  // pool, so spikes, beams, warnings and shockwaves were invisible. These are zones, so he leaves the area
  // rather than sidestepping. Returns true when it has spent the frame.
  //
  // Domain hazard perception: nothing read DomainManager's hazards, so lightning, Mjolnir, turret fire and
  // arrows were invisible. A raised shield absorbs them, and a fresh shield parries (65% within 8 frames,
  // 90-frame stun on the owner). Step out of what can be stepped out of, shield what cannot, and raise late
  // so the shield lands inside the parry window.
  _scanDomainHazards(moveSpd, jumpVy) {
    if (this.health <= 0 || (this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0) return false;
    if (typeof isCinematic !== 'undefined' && isCinematic) return false;
    if (typeof DomainManager === 'undefined' || !DomainManager.domains || !DomainManager.domains.length) return false;
    if (this._domHazCd > 0) { this._domHazCd--; return false; }
    // Same fairness knob every other perception path uses, he is not frame-perfect.
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

        // Lightning is a full-height column with no vertical test. Jumping is never an escape, sideways
        // always is, if the warning leaves time.
        if (h.type === 'lightning') {
          if (h.struck) continue;
          const dx = cx - h.x;
          if (Math.abs(dx) >= R) continue;
          const tti  = h.warningTimer || 0;
          const need = (R - Math.abs(dx) + 12) / Math.max(0.1, moveSpd);
          let dir    = (dx >= 0 ? 1 : -1);
          // Leaving a column outward re-spawns the bolt on him, so he fled the same way until the floor
          // ran out. Pick the side with room. With none, eat it behind the shield: a 26 bolt is fully
          // absorbed by a stack-1 shield (30 HP), and a ringout is not.
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

        // Mjolnir's dash homes at speed 22 and ends only on contact, so it cannot be outrun. It is a
        // parry target, not a dodge target.
        if (h.type === 'mjolnir' && h.state === 'strike') {
          const sp   = Math.hypot(h.vx || 0, h.vy || 0) || 1;
          const dist = Math.hypot(h.x - cx, h.y - cy) - R;
          const tti  = dist / sp;
          if (tti >= 0 && tti < shieldTti) shieldTti = tti;
          continue;
        }

        // Anything with velocity: find the closest approach and react only if it intersects him. Static
        // owner-anchored hazards are handled by spacing.
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

    // A fresh shield beats walking. Stack 1 carries 30 HP, absorbing a 26 bolt or a 16 Mjolnir strike
    // whole. Inside the 8-frame window it parries 65% of the time, stunning the domain owner for 90
    // frames. So the shield goes first when off cooldown, and the escape is the fallback.
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
      // Shield unavailable (cooldown), take the hit moving rather than standing.
      const away = (this.cx() <= this._aiSafeCenterX()) ? 1 : -1;
      if (!this.isEdgeDanger(away)) { this.vx = away * moveSpd * 1.6; this._domHazCd = 8; return true; }
    }
    return false;
  }

  _scanAreaThreats(moveSpd, jumpVy) {
    if (this.health <= 0 || this.stunTimer > 0 || this.ragdollTimer > 0) {
      this._hazEscFrames = 0; return false;
    }
    if (typeof isCinematic !== 'undefined' && isCinematic) return false;

    // Escapes are committed, not re-decided. The cooldown used to blind this function, so each escape
    // lasted one frame. A beam is 24px wide and a spike field ~160px, so clearing one takes 8-15 frames.
    // The cooldown gates only new decisions.
    if (this._areaDodgeCd > 0) this._areaDodgeCd--;
    if ((this._hazEscFrames || 0) > 0) {
      this._hazEscFrames--;
      let d = this._hazEscDir || 1;
      if (this.isEdgeDanger(d)) d = -d;
      if (!this.isEdgeDanger(d)) { this.vx = d * moveSpd * 2.0; this._hazEscDir = d; return true; }
      this._hazEscFrames = 0;   // boxed in, drop the commitment, re-decide below
    }

    const cx = this.cx(), cy = this.cy();
    // Same fairness knob as the projectile dodge. A slip here means he genuinely eats the hit.
    if (this._areaDodgeCd > 0) return false;
    if (Math.random() < this._reactionMistakeRate() * 0.4) return false;
    const act = (frames) => {
      this._areaDodgeCd = frames;
      if (typeof this._recordEvent === 'function') this._recordEvent('dodge', 2);
      return true;
    };

    // 1. Meteor storm: the floor is lethal except inside a safe ring. Fleeing a danger zone is wrong
    //    here; the only survivable move is in.
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

    // 2. Floor columns (spikes, beams): jumping keeps him over the strip, so the answer is sideways,
    //    never off the stage.
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
        // A beam telegraphs for 110 frames (150 in the meteor storm). Reacting to the warning as well as
        // the active burn made him back away from a harmless marker and lose pressure. React in the last
        // second of the warning, and for the whole active burn.
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
    // Merge overlapping columns into fields before escaping. A single column is rarely all he stands
    // in: spikes come five at a time, 40px apart, centred on the target. Escaping one just stepped him
    // into the next. Merge, and leave the whole cluster.
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
        if (this.isEdgeDanger(outDir)) return false;   // boxed in, no safe escape
        this.vx = outDir * moveSpd * 2.0;
        // Commit for as long as the clear takes, so combat cannot drag him back mid-exit.
        const _span = Math.min(outLeft, outRight);
        this._hazEscDir    = outDir;
        // Commit for the whole walk-out. The ground-slam volley lays six spikes 55px apart (a 275px
        // field), and the old 30-frame cap expired mid-field.
        this._hazEscFrames = Math.min(48, Math.ceil(_span / (moveSpd * 2.0)) + 4);
        // Jumping only escapes while spikes are short. They gain 8px a frame, then sit at full height for
        // 180 frames, so hopping a full field lands him back inside it. Hop the nubs while they rise,
        // otherwise walk.
        if (this.onGround && f.allRising && f.tallest < 40 && _span > moveSpd * 2.0 * 10) {
          this.vy = jumpVy;
        }
        return act(6);
      }
    }

    // 3. Expanding rings: a shockwave passes along the ground. Be airborne as it arrives, do not outrun it.
    if (typeof tfShockwaves !== 'undefined' && Array.isArray(tfShockwaves)) {
      for (const w of tfShockwaves) {
        if (!w || (w.timer !== undefined && w.timer <= 0)) continue;
        const gap = Math.abs(Math.abs(cx - w.x) - (w.r || 0));
        if (gap < 70 && this.onGround) { this.vy = jumpVy; return act(10); }
      }
    }

    // 4. Radius zones (slam circles, gravity wells, cones). Walk out the short way.
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
      let outDir = Math.sign(cx - z.x) || (cx < this._aiSafeCenterX() ? 1 : -1);
      if (this.isEdgeDanger(outDir)) outDir = -outDir;
      if (this.isEdgeDanger(outDir)) return false;
      this.vx = outDir * moveSpd * 1.85;
      // A circle centred above him is an air attack, so leaving sideways is enough. One centred on the
      // deck is a slam: get airborne as well.
      if (this.onGround && z.y > cy - 20) this.vy = jumpVy;
      return act(8);
    }

    return false;
  }

  // Inference: learning rules for mechanics he has no name for. Clash is the proof: two swings starting
  // within 3 frames with equal strength tiers cancel. He triggered it by accident and never noticed, since
  // clash deals zero damage.
  //
  // It starts from a prediction failure and records every condition that was true. Over many failures, a
  // condition whose presence raises the failure rate far above base becomes a candidate rule. The second
  // stage separates cases where both swung together and he still got hit. Only observable inputs are used.
  _inferFeatures(t, _fc) {
    const F = {};
    if (!t) return F;
    const reach  = (this.weapon && this.weapon.range) || 90;
    const treach = (t.weapon && t.weapon.range) || 90;
    const d      = Math.abs(t.cx() - this.cx());
    F.opp_swinging = (t.attackTimer || 0) > 0;
    // "We started at the same moment", he can see when their swing began.
    const myS = this._attackStartFrame || 0, tS = t._attackStartFrame || 0;
    const sync = F.opp_swinging && myS && tS && Math.abs(myS - tS);
    F.sync_0_3   = sync !== false && sync <= 3;
    F.sync_4_10  = sync !== false && sync > 3 && sync <= 10;
    F.mutual_reach = d <= reach + 8 && d <= treach + 8;
    F.opposed = Math.sign(t.cx() - this.cx()) === (this.facing || 1) &&
                Math.sign(this.cx() - t.cx()) === (t.facing || 1);
    // Their action's strength as a watcher would rank it: a super in flight reads as a super. This is
    // observation, not a call to _clashTier(), so he owns none of the clash system's concepts.
    const tierOf = f => (f && f.superActive) ? 2 : ((f && f._attackKindTier) || 0);
    const myT = tierOf(this), tT = tierOf(t);
    F.opp_tier_higher = F.opp_swinging && tT > myT;
    F.opp_tier_equal  = F.opp_swinging && tT === myT;
    F.opp_airborne = !t.onGround;
    F.close_range  = d < reach * 0.6;

    // Latent variables: features he was never handed. Clash splits about 50/50 between 'both vanished' and
    // 'mine broke and theirs landed', and the hidden cause is a streak counter. So he builds a
    // time-since-same-pattern feature himself.
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

  // His model of when a swing should connect. Deliberately naive: its failures are the informative part.
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
    // Damage taken at the exchange, not somewhere in the swing window. Otherwise a follow-up landing half a
    // second later gets counted, and cancel and mine-broke-theirs-landed look identical.
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
        // PAIRS. A single condition cannot separate 'we cancelled' from 'mine broke and theirs landed',
        // so the rule is a conjunction. Ten features is 45 pairs, which is cheap.
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

  // What he already knows about the game: seeded from the dossier's game-wide record, so a new match does
  // not start at n=0. SOV_MEMORY is the lab's prior and the dossier is what he learned here. The innate
  // layer is never written back, so it keeps its fixed weight while local experience can outvote it.
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

  // File the counts accrued since the last commit. Called on death and every 600 frames, since a match
  // can end without a death.
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

  // Acting on what he inferred: a rule covers one exchange, so on its first frame a covering rule may
  // cancel the swing and raise a guard. Pessimistic about the rule (upper Wilson bound on landing, lower
  // bound on being hurt). Curiosity is the opposite, optimistic about what to try.
  _inferAct(t) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.infer || !TUNE.inferAct) return false;
    const O = this._infOpen;
    const _fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    // Only the swing opened this frame: its features were computed once. Recomputing would advance
    // _infPatternLast and corrupt repeat_within_*.
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
    // The best-evidenced rule covering this swing: lowest plausible chance of landing, at its most generous.
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

    // Leave a share alone so the rule keeps being tested. Otherwise a rule that stops being true can
    // never be unlearned.
    const explore = (typeof TUNE.inferActExplore === 'number') ? TUNE.inferActExplore : 0.15;
    // Page-wide tally too, so a lab sweep can confirm the mechanism fired.
    const G = (typeof window !== 'undefined')
      ? (window.__sovInferAct || (window.__sovInferAct = { converted: 0, explored: 0, byRule: {} }))
      : { converted: 0, explored: 0, byRule: {} };
    const st = this._inferActStats || (this._inferActStats = { converted: 0, explored: 0, byRule: {} });
    const bump = (f) => { st[f]++; G[f]++; };
    if (Math.random() < explore) { bump('explored'); return false; }

    // Convert and drop the open observation. A cancelled swing did not fail, it never happened. Booking
    // it as a miss would make the rule confirm itself.
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

  // Promote a co-occurring condition to a rule once it is frequent enough to trust and far enough above
  // base to believe. 'clean' separates 'both vanished' from 'mine broke and theirs landed'.
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

  // Curses are picked up by proximity, not choice: updateMapPerks() collects anything within 28px, so a
  // curse on the deck goes straight into him. A light steering push out of the ring, never toward an edge.
  _avoidCurses(moveSpd) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.curseAvoid) return;
    if (typeof mapPerkState === 'undefined' || !mapPerkState || !Array.isArray(mapPerkState.items)) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0 || this.health <= 0) return;
    // Free damage beats a curse every time, never break a punish to dodge one.
    if (this._targetHelpless && this.target && this._targetHelpless(this.target)) return;
    const RING = 40;                       // collector fires at 28; steer from just outside
    const cx = this.cx(), cy = this.y + this.h / 2;
    for (const it of mapPerkState.items) {
      if (!it || it.collected || !it.type) continue;
      if (it.type.indexOf('curse_') !== 0) continue;
      const dx = cx - it.x, dy = cy - it.y;
      if (Math.hypot(dx, dy) > RING) continue;
      const out = Math.sign(dx) || (cx < this._aiSafeCenterX() ? 1 : -1);
      if (this.isEdgeDanger(out)) continue;
      // Push out only as hard as needed to clear the ring, so he keeps fighting.
      this.vx = out * Math.max(Math.abs(this.vx), (moveSpd || 5) * 0.75);
      this._curseDodges = (this._curseDodges || 0) + 1;
      break;
    }
  }

  // Dial gates scale with the dial baseline. Thresholds like effDef > 0.55 were written for dials at
  // 0.88-0.95. Under adaptV2 (0.60) they became unreachable, so his shield nearly never fired.
  _dialGate(frac) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const base = TUNE.adaptV2 ? ((typeof TUNE.adaptV2Base === 'number') ? TUNE.adaptV2Base : 0.60) : 0.88;
    return base * frac;
  }

  // Opponent-conditioned tactic choice: the cascade branch that won the frame is booked per opponent, and
  // a branch that reliably loses health against that opponent can yield. A yield, not an override: the
  // branch that runs keeps its own pathfinding and hazard avoidance, so nothing here writes movement.
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
                      // What he expects this to be worth, recorded before he finds out. A mean hides a
                      // result five times better than usual. A residual needs a prediction.
                      expect: this._choiceValue(name),
                      tLock: t ? Math.max(t.stunTimer || 0, t._parryVulnFrames || 0) : 0,
                      opp: this._choiceOppKey() || 'any' };
  }

  _commitResolve(_fc) {
    const P = this._cmtOpen;
    this._cmtOpen = null;
    if (!P) return;
    if (_fc - P.frame < 8) return;               // a one-frame flicker prices nothing
    // Priced against the booked target, not this.target. A mid-window retarget would charge one
    // opponent's decision to another's health.
    const taken = (this.lives === P.lives) ? Math.max(0, P.hp - this.health) : P.hp + 40;
    const bt = P.tgt;
    let dealt = !bt ? 0
              : (bt.lives === P.tLives) ? Math.max(0, P.tHp - bt.health) : P.tHp + 40;
    // Lockout created during the window counts as value, as in _resolveTactic. Without it a perfect parry
    // books zero, because this 45-frame window closes before the 90-frame stun can be converted.
    if (bt && bt.lives === P.tLives) {
      const lockNow = Math.max(bt.stunTimer || 0, bt._parryVulnFrames || 0);
      if (lockNow > (P.tLock || 0) + 20) dealt += (lockNow - (P.tLock || 0)) * 0.22;
    }
    const net = dealt - taken;
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.discovery) {
      try { this._scoreSurprise(P, net, _fc); } catch (e) { /* never kill a frame */ }
    }
    const g   = this._choiceGrid || (this._choiceGrid = {});
    // Filed under this opponent and under 'any'. The archetype is unknown for the
    // Filed under this opponent and under 'any'. The archetype is unknown for the first few hundred
    // frames, and those early bookings are the ones the opponent-specific cells most need.
    const opp = this._choiceOppKey();
    for (const k of (opp && opp !== 'any') ? [opp, 'any'] : ['any']) {
      const bo  = g[k] || (g[k] = {});
      const row = bo[P.sit] || (bo[P.sit] = {});
      const e   = row[P.action] || (row[P.action] = { tries: 0, net: 0, net2: 0 });
      e.tries++; e.net += net; e.net2 = (e.net2 || 0) + net * net;
      // Rolling decay, as in _tacticGrid.
      if (e.tries > 12) { e.tries *= 0.75; e.net *= 0.75; e.net2 *= 0.75; }
    }
  }

  // Net health per commit. Cell first, then this opponent across situations, then null. Splitting one
  // statistic across nine situations starved it, so the general opinion holds until a cell earns its own.
  _choiceValue(name) {
    const g = this._choiceGrid;
    if (!g) return null;
    const sit = this._situationKey(this.target);
    const opp = this._choiceOppKey();
    // Most specific first: this opponent in this situation, then this opponent anywhere, then the general record.
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

  // Discovery: an exploit shows up as a large positive residual (net minus expected). An average would
  // erase it, so this compares the residual against his own running noise.
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
    // A pursue window, not a permanent promotion. He returns to what overperformed while the opening is
    // plausibly still there. It lapses on its own if it stops paying.
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

  // Intervention: paying health to settle a question correlation cannot. Experiments are budgeted per life,
  // only while healthy, only on an under-sampled hypothesis, and never while a free punish is available.
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

  // Second question: having failed, why did he also get hurt? Both simultaneous outcomes count as failures.
  // Among failures, which conditions raise the chance he took damage too?
  _inferHurtRules(includePairs) {
    const S = this._infStats;
    if (!S || S.miss < 10) return [];
    const base = (() => {
      let h = 0;
      for (const k of Object.keys(S.feat)) { /* base comes from the whole sample */ }
      return S.missHit !== undefined ? S.missHit / S.miss : null;
    })();
    // Base from the aggregate counters kept alongside the features.
    const bh = (S.missHitTotal || 0) / Math.max(1, S.miss);
    const src = includePairs ? Object.assign({}, S.feat, S.pair || {}) : S.feat;
    const out = [];
    for (const k of Object.keys(src)) {
      const e = src[k];
      if (e.miss < 5) continue;
      const rate = e.missHit / e.miss;
      const lift = bh > 0.001 ? rate / bh : (rate > 0 ? 99 : 0);
      if (lift < 1.25 && lift > 0.8) continue;      // keep strong effects both ways
      out.push({ when: k, failures: e.miss, hurtRate: +rate.toFixed(2),
                 baseHurt: +bh.toFixed(2), lift: +lift.toFixed(2),
                 reads: rate > bh ? 'THEIRS LANDS — mine broke' : 'CLEAN CANCEL — neither lands' });
    }
    return out.sort((a, b) => Math.abs(b.lift - 1) - Math.abs(a.lift - 1));
  }

  // Not-knowing has a cost: each cell carries a standard error, and an under-sampled action is scored
  // optimistically (mean + k*stderr), so it gets tried.
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

  // How many times has he tried this here? Zero is unknown, not bad, and the two must never score the same.
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

  // Should this branch win the frame? False lets the cascade continue past it. Checked in the guard, so a
  // branch with side effects is never run just to be discarded.
  _preferCommit(name) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.tacticChoice) return true;
    // A live discovery outranks the ledger. Never yield the tactic that just overperformed. This is the only
    // way a later cascade branch can win a frame, since the cascade is a fixed preference order and nothing
    // here may write vx.
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
    // Optimism: judge an action by the best it plausibly is, not by the average of a few samples. Wide error
    // bars survive the gate and get tried again, which is how they narrow. With curiosity off this is the
    // plain mean comparison.
    let vOpt = v;
    if (TUNE.curiosity) {
      const se = this._choiceStderr(name);
      const k  = (typeof TUNE.curiosityK === 'number') ? TUNE.curiosityK : 1.0;
      const n  = this._choiceTries(name);
      // A stderr from two samples understates how little he knows, so thin cells get an explicit unknown bonus.
      const thin = n < 5 ? (5 - n) * 1.6 : 0;
      vOpt = v + (se === null ? 0 : k * se) + thin;
    }
    const denyAt = (typeof TUNE.choiceDenyAt === 'number') ? TUNE.choiceDenyAt : -2;
    if (vOpt >= denyAt) return true;
    // Never close the door completely, or a tactic that dipped once can never prove itself again.
    const ex = (typeof TUNE.choiceExplore === 'number') ? TUNE.choiceExplore : 0.15;
    if (Math.random() < ex) return true;
    this._choiceSkips = (this._choiceSkips || 0) + 1;
    return false;
  }

  // Action vocabulary: every terminal branch of updateAI() names itself on the frame it wins. Inert (it
  // only counts). Read with window.sovCommitLog(). Move book (js/smb-sov-combo.js): routes first, since a
  // landed hit is the more valuable moment.
  _moveBookStep(t, spd, jumpVy) {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (!TUNE.comboRoutes && !TUNE.counterBook) return false;
    if (typeof SovMoves === 'undefined' || !t || t.health <= 0) return false;
    try {
      if (TUNE.comboRoutes && this._routeTick(t, spd, jumpVy)) { this._commit('route'); return true; }
      if (TUNE.counterBook && this._counterTick(t, spd, jumpVy)) { this._commit('counter'); return true; }
    } catch (e) { this._route = null; this._ctr = null; }
    return false;
  }

  // 'settle' lets the landed move finish. 'exec' drives one chosen follow-up to its outcome, then back to
  // choosing. Any miss ends the route.
  _routeTick(t, spd, jumpVy) {
    const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    let R = this._route;
    if (R && (R.tgt !== t || fc - R.f0 > 420 || R.hits >= 12)) R = this._route = null;
    if (!R) {
      if (!this._comboLandedLast || SovMoves.lock(t) <= 0) return false;
      R = this._route = { tgt: t, f0: fc, phase: 'settle', since: fc, lastHp: t.health, hits: 0, p: null, st: null, keys: null };
    }
    const free = SovMoves.lock(t) <= 0;
    if (R.phase === 'settle') {
      if (t.health < R.lastHp - 0.5) { R.lastHp = t.health; R.since = fc; }
      // Standing through his own recovery is only safe while they cannot act.
      if (free && (t.attackTimer || 0) > 0) { this._route = null; return false; }
      const busy = (this.attackTimer || 0) > 0 || fc - R.since < 3;
      if (busy && !free && fc - R.since < 40) { this.vx *= 0.8; return true; }
      const pick = SovMoves.pickRoute(this, t);
      // A route that no longer expects to pay hands the frame back to the cascade.
      if (!pick || pick.value < SOV_ROUTE_MIN_VALUE) { this._route = null; return false; }
      R.phase = 'exec'; R.p = SovMoves.startRoute(pick.action); R.st = SovMoves.routeTracker(t); R.keys = pick.keys;
      this._comboFollowHits = 0;
    }
    SovMoves.trackRoute(R.st, t);
    if (R.p.fired < 0 && free && (t.attackTimer || 0) > 0) { this._route = null; return false; }
    const status = SovMoves.driveRoute(this, t, R.p, spd, jumpVy);
    const out = SovMoves.routeDone(R.st, this, R.p, status);
    if (!out) return true;
    const hit = out === 'hit';
    if (typeof SovDossier !== 'undefined' && SovDossier.recordMove) {
      SovDossier.recordMove('route', R.keys[1], R.p.action, hit, R.st.dmg);
    }
    const log = (typeof window !== 'undefined') ? (window.SOV_ROUTE_LOG || (window.SOV_ROUTE_LOG = { steps: 0, hits: 0, trueHits: 0, dmg: 0, chains: 0 })) : null;
    if (log) { log.steps++; if (hit) { log.hits++; log.dmg += R.st.dmg; if (R.st.freeAtHit <= 1) log.trueHits++; } }
    if (!hit) { if (log) log.chains++; this._route = null; return false; }
    R.hits++; R.phase = 'settle'; R.since = fc; R.lastHp = t.health;
    return true;
  }

  // A new move from the target (its _attackStartFrame changed) arms a counter. He answers SOV_COUNTER_REACT
  // frames later, and the exchange is scored at the end of SOV_COUNTER_WINDOW whether or not the answer
  // still holds the frame.
  _counterTick(t, spd, jumpVy) {
    const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    let C = this._ctr;
    if (C && C.st) SovMoves.trackCounter(C.st, this, t);
    if (C && C.st && (fc - C.moveF >= SOV_COUNTER_WINDOW || C.tgt !== t)) {
      if (C.tgt === t && typeof SovDossier !== 'undefined' && SovDossier.recordMove) {
        const v = SovMoves.counterValue(C.st, this, t);
        SovDossier.recordMove('counter', C.keys[1], C.p.action, v > 0, v);
        const log = (typeof window !== 'undefined') ? (window.SOV_COUNTER_LOG || (window.SOV_COUNTER_LOG = {})) : null;
        if (log) { const e = log[C.p.action] || (log[C.p.action] = { n: 0, v: 0 }); e.n++; e.v += v; }
      }
      C = this._ctr = null;
    }
    const sf = t._attackStartFrame;
    if (!C && sf != null && sf !== this._ctrSeenStart && (t.attackTimer || 0) > 0 && t.weapon && t.weapon.type === 'melee') {
      this._ctrSeenStart = sf;
      if (fc - sf <= SOV_COUNTER_REACT + 2) C = this._ctr = { tgt: t, moveF: sf, kind: SovMoves.moveKind(t), p: null, st: null, keys: null, live: false };
    }
    if (!C) return false;
    if (!C.p) {
      if (fc - C.moveF < SOV_COUNTER_REACT) return false;
      const pick = SovMoves.pickCounter(this, t, C.kind);
      if (!pick) { this._ctr = null; return false; }
      C.p = SovMoves.startCounter(pick.action); C.keys = pick.keys; C.live = true;
      C.st = SovMoves.counterTracker(this, t);
    }
    if (!C.live) return false;
    C.live = SovMoves.driveCounter(this, t, C.p, spd, jumpVy);
    if (!C.live && this.shielding && C.p.action === 'shield') this.shielding = false;
    return C.live;
  }

  _commit(name) {
    this._lastCommit = name;
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.tacticChoice) {
      try { this._commitBook(name); } catch (e) { /* bookkeeping must never kill a frame */ }
    }
    const log = this._commitLog || (this._commitLog = Object.create(null));
    log[name] = (log[name] || 0) + 1;
    this._commitTotal = (this._commitTotal || 0) + 1;
    // Also page-wide. The per-instance log dies with the instance, and headless harnesses build fresh
    // fighters per match, so a session tally is the only one that survives a run.
    const g = (typeof window !== 'undefined')
      ? (window.SOV_COMMIT_LOG || (window.SOV_COMMIT_LOG = Object.create(null))) : null;
    if (g) g[name] = (g[name] || 0) + 1;
  }

  // Brain voice slice: observation only, for a brain-driven Sovereign. Calls the same observers as
  // updateAI and never writes vx, vy, input or attack state. Its reactive lines reuse the existing pools
  // and limiters.
  _brainVoiceTick() {
    if (typeof gameRunning !== 'undefined' && !gameRunning) return;
    if (typeof activeCinematic !== 'undefined' && activeCinematic) return;
    if (this.health <= 0) return;
    if (!this.target || this.target.health <= 0) {
      const o = Brain.live.opp;
      if (o && o.health > 0 && players.indexOf(o) >= 0) this.target = o; else return;
    }
    const t = this.target;
    try {
      this._observeAlways();
      this._observationFrames++;
      this._observeFight(t);
      this._updateEvolutionState();
      const d = Math.abs(t.cx() - this.cx());
      this._observeProfiles(t, d);
      this._updateIntimidation(t, d);
      this._updateCornerPressure(t, d);
      if (this._punishDialogueCd > 0) this._punishDialogueCd--;
      // Reactive lines.
      const v = this._bvState || (this._bvState = { lives: this.lives, tHp: t.health, hits: [], lowSaid: false });
      if (this.lives < v.lives) {
        v.lowSaid = false;
        this._triggerFearLine(SMK2_LIMITER_LINES, 150);
      }
      v.lives = this.lives;
      if (t.health < v.tHp - 0.5) { v.hits.push(frameCount); if (v.hits.length > 8) v.hits.shift(); }
      v.tHp = t.health;
      if (v.hits.length >= 3 && frameCount - v.hits[v.hits.length - 3] <= 90 && this._punishDialogueCd <= 0) {
        this._punishDialogueCd = 400;
        v.hits.length = 0;
        showBossDialogue(SMK2_PUNISH_LINES[Math.floor(Math.random() * SMK2_PUNISH_LINES.length)], 160);
      }
      if (!v.lowSaid && this.health < this.maxHealth * 0.25) {
        v.lowSaid = true;
        this._triggerFearLine(SMK2_LIMITER_LINES, 150);
      }
    } catch (e) { if (!this._bvErr) { this._bvErr = true; console.warn('[brainVoice]', e.message); } }
  }

  // Observation half of the cascade: BehaviorModel, habit and spam trackers, dossier seeding, evolution
  // inputs. No movement or attack writes, so the brain voice slice shares it.
  _observeFight(t) {
    this._observationFrames++;

    // Match-scope strategic read. Separate from the counters below, which _applyOppProfile wipes on every
    // target switch.
    this._strategicObserve(t, Math.abs(t.cx() - this.cx()));

    // Per-tick frame shares for _oppRates(). Action tags are too sparse (9-26 per fight, shield always zero),
    // while frame counts sample every frame.
    this._oppObsFrames = (this._oppObsFrames || 0) + 1;
    if (!t.onGround)        this._oppAirFrames    = (this._oppAirFrames    || 0) + 1;
    if (t.attackTimer > 0)  this._oppAtkFrames    = (this._oppAtkFrames    || 0) + 1;
    if (t.shielding)        this._oppShieldFrames = (this._oppShieldFrames || 0) + 1;
    // Fighter has no dodge timer, so evasion is read as retreating while he is committed to a swing.
    if (this.attackTimer > 0 && Math.abs(t.vx) > 1.2 &&
        Math.sign(t.cx() - this.cx()) === Math.sign(t.vx)) {
      this._oppDodgeFrames = (this._oppDodgeFrames || 0) + 1;
    }
    {
      const _dx = Math.abs(t.cx() - this.cx());
      if (_dx < 150) this._oppCloseFrames = (this._oppCloseFrames || 0) + 1;
      this._oppDistSum = (this._oppDistSum || 0) + _dx;
      // Closing intent: the sign of their velocity against their bearing to him. This separates a rusher
      // from a zoner, and it is independent of his own movement. Frame-to-frame distance measured almost
      // nothing, since he is the faster fighter and the gate failed on most frames.
      if (Math.abs(t.vx) > 0.4) {
        if (Math.sign(t.vx) === Math.sign(this.cx() - t.cx())) this._oppApproachFrames = (this._oppApproachFrames || 0) + 1;
        else                                                   this._oppRetreatFrames  = (this._oppRetreatFrames  || 0) + 1;
      }
    }

    // Seed on the first observed frame, not only on a target switch: a 1v1 never switches, so the dossier
    // was written but never read. The kit key needs no observation. The behavioural half arrives at 180 frames.
    if (this._oppObsFrames === 1)   { try { this._seedFromDossier(t, true); } catch (e) {} }
    if (this._oppObsFrames === 180) { try { this._seedFromDossier(t); } catch (e) {} }
    else if (this._oppObsFrames > 180 && this._oppObsFrames % 300 === 0) {
      const _prevArch = this._oppArchetype;
      try { this._dossierKeys(t); } catch (e) {}
      if (this._oppArchetype !== _prevArch) { try { this._seedFromDossier(t); } catch (e) {} }
    }
    if (typeof SovDossier !== 'undefined') SovDossier.tick();
    if (this._oppObsFrames > 0 && this._oppObsFrames % 600 === 0) { try { this._commitMech(); } catch (e) {} }

    // Opening weapon prior: read the weapon class on frame 1 and lock a counter. Once per match, skipped
    // when a death record is active.
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
        // weapon.type is only melee, ranged or magic, so heavy is checked by weaponType. The old check
        // missed hammer, axe and frying pan, the launch-chain weapons that bled stocks in the opening minute.
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

    // BehaviorModel observe: the single prediction brain. The parent updateAI() is bypassed here, so the
    // bigram model is driven by hand. _bmPred feeds _updatePrediction, so there is one source for 'what
    // will the player do next'.
    const _bmObs  = this._behaviorModel.observe(t, this._bmPrevSnap);
    this._bmPrevSnap = { onGround: t.onGround, vx: t.vx, vy: t.vy };
    const _bmPred = this._behaviorModel.predictNext(_bmObs.action, _bmObs.context);

    // Swing-confirm: _strike() reports that a swing started, not that it connected, so a combo string
    // spent its follow-ups in the air. Replay-measured conversion gap: 8.94 damage per swing against a
    // human's 13.13 at the same hit rate. A live HP drop is the ground truth for 'that landed'.
    this._comboLandedLast = (t.health < this._comboPrevTgtHp - 0.5);
    this._comboPrevTgtHp  = t.health;
    // Reset the extension budget whenever no string is running, so every start site is covered.
    if (this._comboFollowHits === 0) this._comboExtensions = 0;

    // A. Action tracking + prediction (sourced from the BehaviorModel)
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

    // B. Spam/punishment tracking (very short gate, Sovereign reads fast)
    if (this._observationFrames >= 4 && this._actionSampleCount >= 1) {
      this._updateSpamTracker(currentAction);
    }

    // D. Anti-exploit tracking
    this._updateAntiExploit(t);
    this._updateSpatialProfile(t);   // platform + zone + post-KB tracking
    return { _bmObs, _bmPred, _bmBias, _bmRead, _memoryState, currentAction };
  }

  // Ability/super profile reads and their one-shot "I have your pattern" lines.
  _observeProfiles(t, d) {
    // Ability: rising edge when the cooldown goes from 0 to positive. Super: superReady flips true to false.
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
      // Fire a one-shot 'I have your pattern' line when the profile first resolves. The player should feel the
      // AI name what it learned.
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
  }

  updateAI() {
    // Mid lava climb: Fighter._voidSafetyFrame owns vx and vy until he lands. Otherwise the per-frame vx
    // write pinned him under the decks.
    if (this._lavaDeck && !this.onGround) return;
    this._updateAICascade();
    this._habitGate();
    this._descentControl();
  }

  // Posture avoidance (habit engine phase 1): on a fresh ground-to-air launch toward a player in range,
  // cancel it if this opponent has historically punished being airborne harder than staying grounded.
  // Built like _vetoExtraJump.
  // Kill-floor governor: a disclosed safety net, not intelligence. When the player leads on stocks, damage
  // eases toward 1 + SMK2_TUNE.killFloor. Damage only: movement and decisions are unchanged.
  _killFloorGovernor() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    const G = +TUNE.killFloor || 0;
    const t = this.target;
    if (!(G > 0) || !t || this.isBoss) {
      if (this._kfMult !== undefined) { this._kfMult = undefined; this.dmgMult = this._kfBase; }
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
    // The slack follows the spare stocks he starts with. A fixed +2 read as already short on frame one in
    // story matches with 5 or 3 lives.
    const slack = Math.min(3, this._kfMyStart - needTotal) - 1;
    if (need > 0) g = Math.max(g, Math.max(0, Math.min(1, (need - myLeft + slack) / 3)));
    const goal = 1 + G * g;
    const cur = (this._kfMult === undefined) ? 1 : this._kfMult;
    this._kfMult = cur + Math.max(-0.01, Math.min(0.01, goal - cur));   // ~1% per frame
    // _kfBase: story mirror of the player's damage boost (smb-story-engine-frame.js). Unset elsewhere.
    this.dmgMult = (this._kfBase || 1) * this._kfMult;
  }

  // Once per match, ~1.5s in, against a human he has a record on: say the strongest thing the persisted
  // habit record says about them. A returning player learns he was studied, including from fights with
  // other enemies.
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
    // Fresh launch only. onGround is last frame's resolved state, so grounded now plus a strong upward vy
    // means the cascade just decided to jump.
    if (!this.onGround) return;
    if ((this.stunTimer || 0) > 0 || (this.ragdollTimer || 0) > 0 || (this._landLag || 0) > 0) return;
    if (!(this.vy <= -8)) return;

    const t = this.target;
    if (!t || t.health <= 0) return;
    const dx = Math.abs(t.cx() - this.cx());
    if (dx > 220) return;
    // A target standing above him is platform pursuit, which belongs to _airApproachGuard. An airborne
    // target above him has to come down, so chasing it up is optional and priced here.
    const tAir = !t.onGround;
    const above = this.cy() - t.cy();
    if (above > 60 && !tAir) return;
    if (above > 260) return;

    // Reflex, escape and safety branches keep their jump. Matched against the _commit( names.
    const name = this._lastCommit || '';
    if (/^(danger_|volley_defense|recover|hop_steer|floor_hazard|domain_hazard|area_threat|rapid_hit_escape|sov_escape|wall_safety)/.test(name)
        || /void|ringout/i.test(name)) return;
    if (name === 'elevation_pursuit' && !tAir) return;

    const stats = this._habitStats || (this._habitStats = { seen: 0, vetoed: 0, passed: 0 });
    stats.seen++;
    const G = (typeof window !== 'undefined')
      ? (window.SOV_HABIT_LOG || (window.SOV_HABIT_LOG = { seen: 0, vetoed: 0, passed: 0 })) : null;
    if (G) G.seen++;

    const sc = this._scarOn('chase') ? this._scarsFor(t) : null;
    if (sc && sc.chase) { this.vy = 0; stats.vetoed++; if (G) G.vetoed++; return; }

    // Let a slice through so the air estimate keeps getting data. Otherwise a correct early veto starves the
    // evidence that justifies it.
    if (Math.random() < 0.12) { stats.passed++; if (G) G.passed++; this._scarOpen('chase', 'chase', t); return; }

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
      this._scarOpen('chase', 'chase', t);
    }
    if (this._habitLineCd > 0) this._habitLineCd--;
  }

  // Descent control (habit engine phase 2): 30% of openers came from floating down into range with no
  // attack out. Scoped to that one moment: once per airborne stint, on the first descending frame near a
  // live target, it gambles over a fixed set of counters. Runs after _habitGate() so a stint C1 vetoed never reaches here.
  _descentControl() {
    const TUNE = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE) || {};
    if (TUNE.habitDescent === false) return;
    if (typeof SovHabits === 'undefined') return;
    if (this.health <= 0) return;
    const frame = (typeof frameCount !== 'undefined') ? frameCount : 0;

    if (this.onGround) this._descentStintFired = false;

    // Ongoing effect for the pending arm, applied every frame of the stint. Resolution can run on after he
    // has landed, through the 45-frame window.
    const pend = this._descentPending;
    if (pend && !this.onGround && pend.target) {
      if (pend.arm === 'dive') {
        const FF = (typeof FAST_FALL_VY === 'number') ? FAST_FALL_VY : 13;
        if (this.vy < FF) this.vy = FF;
      } else if (pend.arm === 'strike' && !pend.swung && pend.target.health > 0) {
        // Timed strike: chosen as the descent starts, thrown the moment he comes into reach on the way down,
        // the same timing the player uses. The first version only offered it when he was already in reach,
        // which was true 0.4% of the time.
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

    // Same reflex/escape/safety exemption as C1. This gate never overrides a branch already handling danger.
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

    let avail = ['default', 'dive'];
    // Timed strike needs only a weapon ready in time. The swing waits for reach (see _descentControl).
    if ((this.cooldown || 0) <= 12) avail.push('strike');
    const awayDir = dx >= 0 ? -1 : 1;
    if (typeof this.isEdgeDanger !== 'function' || !this.isEdgeDanger(awayDir)) avail.push('drift');

    const sc = this._scarOn('descent') ? this._scarsFor(t) : null;
    if (sc && sc.descent.size) {
      const clean = avail.filter(a => !sc.descent.has(a));
      if (clean.length) avail = clean;
    }
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

  // Resolves the pending decision once either side opens, on death, or after 45 frames with neither.
  // Mirrors the who-opens-first study.
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
    if (outcome === 'loss' && t && this._lastAttacker === t && this._scarOn('descent')) this._scarBurn('descent', pend.arm, t);
    if (typeof window !== 'undefined') {
      const L = window.SOV_DESCENT_LOG || (window.SOV_DESCENT_LOG = {});
      const a = L[pend.arm] || (L[pend.arm] = { chosen: 0, win: 0, loss: 0, none: 0 });
      a[outcome]++;
    }
    this._descentPending = null;
  }

  _updateAICascade() {
    // Perception runs before the act gate, and targeting before perception. Both keep working mid-reaction,
    // so he still observes while punished and keeps attributing hits after his only opponent dies.
    this._updateThreatLedger();
    this._updateTargetSelection();
    this._ensureMatchLoadout();

    this._observeAlways();

    // Inherited guard checks
    if (this.aiReact > 0) { this.aiReact--; return; }
    if (this.ragdollTimer > 0 || this.stunTimer > 0) return;

    const t = this.target;
    if (!t || t.health <= 0) return;

    // Counter strategy from the previous life. Processed before spawn protection, so the lock is active on frame 1.
    if (this._deathRecord) {
      const _rec = this._deathRecord;
      this._deathRecord = null;
      // 1st+ death: no warmup, limiter breaks immediately
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

    // Post-spawn protection: jump away from the player so a waiting hammer swing misses. Counts down, then
    // he fights normally.
    if (this._spawnDefendTimer > 0) {
      this._spawnDefendTimer--;
      // No threat nearby, so skip the escape. A panic jump with the player across the map is a free read:
      // the arc repeats every respawn, and a thrown hammer at its apex ragdolls him into the void corner.
      const _spawnThreat = Math.abs(this.cx() - t.cx()) < 260;
      if (!_spawnThreat) { this._spawnDefendTimer = 0; }
      else if (this.onGround && !this._spawnDefendJumped) {
        this._spawnDefendJumped = true;
        const _awayDir   = this.cx() < t.cx() ? -1 : 1;
        // Fallback toward centre, so a spawn jump does not land on his own edge.
        const _centerDir = this.cx() < this._aiSafeCenterX() ? 1 : -1;
        // On an elevated platform a jump launches him into hazard range, so drop-step toward centre.
        const _floorPl   = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms)
          ? currentArena.platforms.find(p => p.isFloor) : null;
        const _onMainFloor = !_floorPl || (this.y + this.h >= _floorPl.y - 12);
        if (!this.isEdgeDanger(_awayDir)) this.vx = _awayDir * 5.5;
        else this.vx = _centerDir * 4.0;
        if (_onMainFloor) this.vy = -16;
      }
      if (this._spawnDefendTimer > 0) { this.aiReact = 0; return; }
    }

    // Off-stage recovery: never ride a knockback into the void. Airborne beyond the floor's span, steer back
    // hard and burn the double jump. Runs before all combat logic.
    if (!this.onGround && typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const _rfl = currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
      if (_rfl) {
        const _rL = _rfl.x + 30, _rR = _rfl.x + _rfl.w - 30;
        if ((this.cx() < _rL || this.cx() > _rR) && this.vy > -4) {
          const _backDir = this.cx() < _rL ? 1 : -1;
          this.vx = _backDir * 7;
          // The recovery jump is for recovering only. Jumping above the stage refills the double jump via
          // platform contact, so he laddered up the outer clouds to y = -164. Two bounds: at or below the deck,
          // and a budget per airborne stint.
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

    // Hop steering: mid-air guidance onto a climb platform, set by the elevation-contest block.
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
      // Grounded again (landed on the platform or fell back), release the hop
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

    // Pattern tracking.
    const playerAttacking = t.attackTimer > 0;
    if (playerAttacking && !this._prevPlayerAttacking) this._recordEvent('player_attack', 0);
    this._prevPlayerAttacking = playerAttacking;
    const playerAirborne = !t.onGround;
    if (playerAirborne && !this._prevPlayerAirborne) this._recordEvent('player_jump', 0);
    this._prevPlayerAirborne = playerAirborne;

    // Observation window: at least 180 frames and 6 non-idle player actions before adapting.
    const { _bmObs, _bmPred, _bmBias, _bmRead, _memoryState, currentAction } = this._observeFight(t);
    this._runPlateControl(t);        // The Circuit: act on that read by moving the stage
    this._updateEvolutionState();

    // Whiff window carry-over
    const playerJustWhiffed = this._prevPlayerAtk > 0 && t.attackTimer === 0;
    this._prevPlayerAtk = t.attackTimer;
    if (playerJustWhiffed) this._counterWindowOpen = true;
    // Endlag window arms when the player's attack ends. A swing in this window bypasses the telegraph.
    if (playerJustWhiffed) this._endlagWindow = t.weapon ? (t.weapon.endlag || 8) : 8;
    if (this._endlagWindow > 0) this._endlagWindow--;
    if (this._baitCooldown > 0) this._baitCooldown--;
    if (this._comboFollowTimer > 0) this._comboFollowTimer--;
    if (this._adaptivePunishTimer > 0) this._adaptivePunishTimer--;
    if (this._jumpCooldown > 0) this._jumpCooldown--;
    if (this._postHitLockFrames > 0) this._postHitLockFrames--;
    if (this._commitToChaseFrames > 0) this._commitToChaseFrames--;
    if (this._predictionBoostFrames > 0) this._predictionBoostFrames--;

    // Micro-adaptation.
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
    // Dial transmission probe (SMK2_TUNE.dialProbe). An aiMemory dial is one addend in a clamped sum. How
    // much of a change in the dial reaches the value used? Stashed rather than logged, since these are
    // hot-path locals.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE.dialProbe) {
      const P = this._dialProbe || (this._dialProbe = { n: 0, effAgg: 0, effDef: 0, aggClamped: 0, defClamped: 0 });
      P.n++; P.effAgg += effAgg; P.effDef += effDef;
      if (effAgg >= 0.999) P.aggClamped++;
      if (effDef >= 0.999) P.defClamped++;
      // Per-addend budget, and a 300-frame (5s) dial slice so convergence speed is measured, not inferred.
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

    // Limiter break only unlocks decision patterns. It does not raise stats, since Sovereign must not exceed
    // player stat caps.
    const lb       = this._limiterBroken;
    const lbCombo  = lb ? 1    : 0;   // one extra follow-up (was 2); bounded by dealDamage combo limiter

    // Limiter stagger is disabled. Being chained no longer grants the player a slow window. The rapid-hit
    // escape is the response instead.
    if (this._limiterStaggerCd > 0) this._limiterStaggerCd--;
    if (this._limiterStaggerTimer > 0) {
      this._limiterStaggerTimer--;
      // Stagger window just closed, immediately arm a punish counter
      if (this._limiterStaggerTimer === 0 && this._punishTimer === 0) {
        this._punishTimer = 1;
        showBossDialogue('My turn.', 70);
      }
    }

    // Movement is capped to the player's base (5.2). Intimidation affects decisions, not speed.
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
    // Spacing factors.
    const weaponDmg    = t.weapon ? (t.weapon.damage || 0) : 0;
    const dmgThreat    = weaponDmg >= 25 ? 20 : weaponDmg >= 20 ? 10 : 0;
    const speedDanger  = Math.round(((t.classSpeedMult || 1.0) - 1.0) * 60); // Ninja +14, Paladin -7
    const superCharging = Math.round((t.superMeter || 0) * this._genome.superChargeWeight); // ramps 0→(weight*100)px as meter fills
    const rageBuff     = (t._powerBuff > 0) ? 25 : 0;
    const livesDisadv  = Math.max(0, (t.lives || 0) - (this.lives || 0));
    const livesAdv     = Math.max(0, (this.lives || 0) - (t.lives || 0));
    const livesSpacing = livesDisadv >= 2 ? livesDisadv * 5 : (livesAdv >= 2 ? -livesAdv * 4 : 0);
    let prefDist      = Math.max(10, this._genome.prefDistBase + m.spacing * 60 - this._intimidation * 22 - this._evolutionStage * 5 + threatSpacing + thorSpacing + memorySpacing * 80 + openerAggroBias + superCharging + dmgThreat + speedDanger + rageBuff + livesSpacing);
    // Advisor spacing bias (+/-26px max). A nudge on the engagement band, not a takeover.
    prefDist += (this._advisorSpacing || 0);
    // Smoothed spacing target. Several inputs flip with per-frame player state, and raw they jump
    // prefDist 40-80px a frame and strobe the approach branches. A ~12-frame EMA keeps reads responsive.
    if (this._prefDistEMA === undefined) this._prefDistEMA = prefDist;
    this._prefDistEMA += (prefDist - this._prefDistEMA) * 0.15;
    prefDist = this._prefDistEMA;
    const moveSpd     = Math.min(6.5, this._genome.moveSpdBase + realAgg * 1.5 + memoryReact * 0.25);  // faster than player base (6.5 vs 5.2)
    const atkFreq     = 1.0; // god-tier: always at max attack frequency
    // No artificial minimum gap. Reaction stats alone set the timing.
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
      // prefDist budget, absolute contribution of each addend, so a term that
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


    this._observeProfiles(t, d);

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
    // Clip-weapon read: a ranged player on their last round is about to hand over a full reload window,
    // and point-blank range costs them too. Close now, so the free window starts with him in reach.
    if (t.weapon && t.weapon.clipSize && (t._ammo || 0) <= 1) {
      this._pressureMode      = 'suffocate';
      this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 40);
    }

    // Humanization fakeout movement
    this._updateHumanization(dir, moveSpd);
    if (this._humanFakeoutTimer > 0) {
      this.aiReact = reactFrames;
      this._commit('fakeout'); return; // fakeout frame, skip normal logic
    }

    // Danger: beams
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

    // Danger: lava
    if (currentArena && currentArena.hasLava && currentArena.lavaY) {
      if ((currentArena.lavaY - (this.y + this.h)) < 80 && this.onGround) {
        // Flee to the nearest deck clear of the lava, not toward screen centre, which sent him back across
        // a 2700px lava map.
        let _lvDir = 0, _lvBest = Infinity;
        const _lvCx = this.cx(), _lvTop = currentArena.lavaY - 100;
        for (const pl of (currentArena.platforms || [])) {
          if (!pl || pl.isFloorDisabled || pl.w < 50 || pl.y >= _lvTop) continue;
          const _gap = _lvCx < pl.x ? pl.x - _lvCx : _lvCx > pl.x + pl.w ? _lvCx - (pl.x + pl.w) : 0;
          if (_gap < _lvBest) {
            _lvBest = _gap;
            // directly under a deck: step out to its nearer edge, then rise
            _lvDir = _lvCx < pl.x ? 1 : _lvCx > pl.x + pl.w ? -1 : (_lvCx - pl.x < pl.x + pl.w - _lvCx ? -1 : 1);
          }
        }
        if (_lvBest === Infinity) _lvDir = _lvCx < this._aiSafeCenterX() ? 1 : -1;
        this.vx = _lvDir * 6;
        this.vy = -18;
        this._commit('danger_lava_air');
        return;
      }
    }

    const nearLeft  = this.x < this._wbL() + 50;
    const nearRight = this.x + this.w > this._wbR() - 50;

    // Arena-aware jump force, prevents over/under-jumping in low/heavy gravity arenas
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

    // Lethal volley defence outranks everything except staying on stage. A ramped homing fan is a
    // one-volley stock loss.
    if (this._runVolleyDefense(t, d, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
      this._commit('volley_defense_a');
      return;
    }

    // Telegraphed sky strikes and lingering zones: same tier as the volley read. No punish is worth
    // eating a 4-bolt AoE.
    if (this._runTelegraphedEvasion(t, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
      this._commit('volley_defense_b');
      return;
    }

    // Learned evasion of a threat he has never perceived. Runs last of the three, so anything perceptible
    // is answered precisely first. It also covers weapons shipped after this code was written.
    if (this._runBlindEvasion(t, dir, moveSpd, _jumpVy)) {
      this._updateFearFactor(d, recentLanded, true);
      this._commit('volley_defense_c');
      return;
    }

    // Volley-cycle timing vs a ramped crescent thrower. Armed: stay outside the point-blank blast radius and
    // stay dodge-primed. Spent: the ~2.5s cooldown is an all-in window. Patience valve: after ~10s of armed
    // passivity, engage anyway for a stretch so a thrower who holds the volley cannot freeze him.
    const _vPosture = this._volleyCyclePosture(t);
    if (this._volleyStandoffFrames === undefined) { this._volleyStandoffFrames = 0; this._volleyEngageFrames = 0; }
    if (_vPosture !== 'standoff') this._volleyStandoffFrames = 0;
    if (this._volleyEngageFrames > 0) this._volleyEngageFrames--;
    if (_vPosture === 'standoff' && !this._targetHelpless(t) && this._volleyEngageFrames <= 0) {
      if (++this._volleyStandoffFrames > 600) {
        this._volleyStandoffFrames = 0;
        this._volleyEngageFrames   = 400; // engage window, falls through to normal play
      } else {
        if (d < (this._volleyStandoffR || 185)) {
          // Cornered against our own wall: jump over the thrower toward centre. Fighting at the floor edge
          // turns a capped launch into a ring-out.
          const _soCornered = (nearLeft && dir > 0) || (nearRight && dir < 0) ||
                              this.x < this._wbL() + 90 || this.x + this.w > this._wbR() - 90;
          const _soDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
          if (_soCornered && d < (this._volleyStandoffR || 185) * 0.8 &&
              this.shieldCooldown === 0 && this._shieldHoldFrames === 0) {
            // Cornered inside the burst radius: a leap does not clear a radial point-blank AoE (frying pan's
            // pound checks centre distance, so airborne within 150px still eats it). Shield through it.
            this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 14;
          } else if (_soCornered && this.onGround && !playerAttacking) {
            const _cDir = this.cx() < this._aiSafeCenterX() ? 1 : -1;
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
        if (this.x < this._wbL() + 120 || this.x + this.w > this._wbR() - 120) {
          const _cDir = this.cx() < this._aiSafeCenterX() ? 1 : -1;
          if (!this.isEdgeDanger(_cDir)) this.vx = _cDir * moveSpd * 0.9;
        } else this.vx *= 0.7;
        this.aiReact = 0;
        this._commit('volley_cycle_b');
        return;
      }
    }
    if (_vPosture === 'window') {
      // Fan is spent, free approach for the cooldown's duration.
      this._pressureMode      = 'suffocate';
      this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 30);
      if (this._punishTimer === 0 && d > weaponRange + 10) this._punishTimer = 2; // sprint-convert
    }

    // Priority descent: drop to a target a full level below. Standing on a deck over a floor-level
    // opponent, he swung into the solid deck and froze. What matters is the geometry: he is on a deck
    // and the target sits a level below it, whether or not the target's feet are down.
    if (t.y > this.y + 55 && this.onGround &&
        typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const _cpi2 = this._findCurrentPlatform(this);
      const _cp2  = _cpi2 >= 0 ? currentArena.platforms[_cpi2] : null;
      if (_cp2 && !_cp2.isFloor) {
        // Drop off the edge on the target's side. Measured against the platform centre, not Sovereign's own
        // x, so the direction is stable and he does not vibrate in place.
        const _dropDir = t.cx() <= (_cp2.x + _cp2.w / 2) ? -1 : 1;
        if (!this.isEdgeDanger(_dropDir)) { this.vx = _dropDir * moveSpd; this.aiReact = 0; return; }
      }
    }

    // Priority air descent: stop swinging at a target far below, since d is horizontal only and the whiff
    // guard re-vetoes the same swing every frame. Commit to falling to the target's level, gated by the same
    // 55px gap, and kill the climb once the gap is unrecoverable.
    if (!this.onGround && t.y > this.y + 55 && (this.vy > -2 || t.y > this.y + 120)) {
      // Never dive into nothing. During a floor hazard the target can be below the deleted deck, and a
      // fast-fall there is a ring-out, not a punish.
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

    // Priority elevation pursuit: climb to a platform-camping player. Platforms are solid from below, so walk
    // out past the nearest edge, then jump inward. Attacks are suppressed until level. A boss is airborne most
    // of the fight, so the gate does not need the target grounded.
    if (this.onGround &&
        t.y < this.y - 55 && !this._hopTarget && d < 340 &&
        typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const _tpi = this._findCurrentPlatform(t);
      let  _tp   = _tpi >= 0 ? currentArena.platforms[_tpi] : null;
      if (!_tp) {
        // Airborne target: the highest non-floor deck spanning its x that still sits below it.
        const _tfeet = t.y + t.h;
        for (const p of currentArena.platforms) {
          if (!p || p.isFloor || p.isFloorDisabled) continue;
          if (t.cx() < p.x - 40 || t.cx() > p.x + p.w + 40) continue;
          if (p.y < _tfeet - 30) continue;                       // above the target
          if (!_tp || p.y < _tp.y) _tp = p;                      // highest such deck
        }
      }
      if (_tp && !_tp.isFloor) {
        // One jump lifts the feet ~150px, so stage upward one reachable platform at a time. Each landing
        // re-runs this block and continues the ascent.
        const _feet  = this.y + this.h;
        const _reach = 285; // single jump (~150px) plus the double-jump extension
        let _step = null;
        if (_tp.y >= _feet - _reach - 4) {
          _step = _tp; // camper's own deck is within a single jump, go straight for it
        } else {
          // Too high: stage via the highest reachable platform between us and the camper.
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
          if (!_step) _step = _tp; // nothing staged, attempt the camper deck directly
        }
        const _svcx    = this.cx();
        const _useLeft = Math.abs(_svcx - _step.x) <= Math.abs(_svcx - (_step.x + _step.w));
        // Stand fully outside the deck's span, so the whole body clears the solid underside before the jump.
        const _clearMrg = this.w + 16;
        let _standX     = _useLeft ? _step.x - _clearMrg : _step.x + _step.w + _clearMrg;
        // Stand on the surface we are on. Staging from a small platform the ideal point is in the gap, so jump
        // across from our own edge instead of walking off.
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
          // Walk to the stand point first. Decelerate on approach so momentum does not carry us off a narrow platform.
          const _sdir = Math.sign(_toStand);
          const _apSpd = Math.min(moveSpd, Math.abs(_toStand) * 0.35 + 1.5);
          if (!this.isEdgeDanger(_sdir)) { this.vx = _sdir * _apSpd; this.aiReact = 0; return; }
        } else {
          // Fully clear of the underside, jump inward and drift onto the deck.
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

    // Second attacker guard: his defensive reads are keyed on this.target, so a minion swinging at him is
    // invisible to his shield. Keep the target, but raise a guard when something hostile is mid-swing in reach.
    // Defence only: no counter aims at the wrong body.
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

    // Peripheral punish: a guard alone lets a summon farm him, so he swings at an off-target attacker only
    // when his primary is out of reach. _peripheralCd stops him fighting the add instead of the player.
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
        // Filter on the weapon's committal band, not _meleeReachDist(). That is the blade-tip arc (50-60px) and
        // never reaches a summon poking from its own axe range. The whiff guard arbitrates, and a vetoed swing
        // costs nothing.
        if (_d > ((this.weapon && this.weapon.range) || 90) * 1.15 + 20) continue;
        if (Math.abs((o.y + (o.h || 0) / 2) - this.cy()) > 60) continue;
        // With the player in reach, the swing he holds has a better home, so the add only gets a swing once it
        // has taken health off him. Gating on out-of-reach alone measured 1.0 peripheral swings a match.
        if (_primaryInReach) {
          const _led = this._threatLedger && this._threatLedger.get(o);
          if (!_led || _led.dmg < 8) continue;   // one clean hit off him is cause enough
        }
        if (_d < _bestD) { _bestD = _d; _best = o; }
      }
      if (_best) {
        this.facing = _best.cx() >= this.cx() ? 1 : -1;
        this.attack(_best);
        // Only charge the cooldown if the swing went out. A vetoed swing paying the cooldown would blind him
        // for 50 frames.
        if (this.attackTimer > 0) this._peripheralCd = 50;
      }
    }

    // Highest hazard priority: every other threat can be traded with, and this one cannot. When the deck
    // goes there is no ground to fight on.
    if (this._runFloorHazard(moveSpd, _jumpVy)) { this.aiReact = 0; this._commit('floor_hazard'); return; }

    // Boss and arena set-piece hazards hit harder and telegraph longer, so they run before the projectile scan.
    if (this._scanDomainHazards(moveSpd, _jumpVy)) { this.aiReact = 0; this._commit('domain_hazard'); return; }
    if (this._scanAreaThreats(moveSpd, _jumpVy)) { this.aiReact = 0; this._commit('area_threat'); return; }

    // Incoming projectiles and sword crescents. Detects at 210px over the full body height, dodges in the air
    // too, and re-arms fast so volleys do not slip through.
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
      // Every owner-attached hazard from the single registry, and from every hostile in the match, not just
      // the current target.
      _scanShots(_smk2AllOwnedHazards(this));
      if (_incoming && Math.random() >= this._reactionMistakeRate() * 0.4) {
        if (this.onGround)            this.vy = _jumpVy;                          // jump the shot
        else if (this.canDoubleJump) { this.vy = -16; this.canDoubleJump = false; } // air-dodge up over it
        else                          this.vy = Math.max(this.vy, 9);            // no air option, drop under it
        this._projDodgeCd = 14;
        this._recordEvent('dodge', 2);
      }
    }

    // MAP / RESOURCE CONTROL
    // Map resources are read after projectile defence but before any pressure plan, so he avoids map threats,
    // holds an opponent inside one, and collects or denies resources naturally.
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

    // Rapid-hit escape: 2+ hits in the last 20 frames, while a heavy ability or super is chaining, breaks out
    // before the chain connects.
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

    if (this._moveBookStep(t, moveSpd, _jumpVy)) { this.aiReact = 0; return; }

    // Guaranteed punish: attack endlag, stun, ragdoll, _parryVulnFrames and a reloading ranged player are
    // lockouts. Every frame not spent converting is wasted. The attack() i-frame veto keeps the chain timed.
    if (this._targetHelpless(t) && (t.invincible || 0) <= 24) {
      this._telegraphTimer = 0;                       // no wind-up on a helpless target
      if (d > weaponRange - 6) {
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 2.2;
        else if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.7; }
        if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 90) {
          this.vy = _jumpVy; this._jumpCooldown = 20;
        }
      } else {
        this.vx *= 0.6;                               // in reach, stop, convert
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

    // Landing punish: a falling player who has burned the double jump is on rails, so pre-position at the
    // landing point. The frames right after landing are the cleanest punish the movement system offers.
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

    // Spawn-invincibility standoff: rushing a just-respawned target means every swing whiffs on i-frames
    // while they hit back. Hold just outside reach until the i-frames are nearly gone. A threshold of 40
    // clears normal hit i-frames (24 or less), so combos are untouched.
    if (t.invincible > 40) {
      const _coil = weaponRange + 24; // just outside striking range, poised to pounce
      if (d < _coil) {
        if (!this.isEdgeDanger(-dir)) this.vx = -dir * moveSpd * 0.8;
        else this.vx *= 0.7;
      } else {
        this.vx *= 0.65; // hold position, do not close until they can be hurt
      }
      this.aiReact = 0;
      this._commit('spawn_standoff');
      return;
    }

    // I-frame spacing: the swing is vetoed in attack() while the target is invincible, so work the spacing
    // instead. Ease to ~70% of reach, so the swing that unlocks when they turn vulnerable starts from the
    // right distance. Skipped while they attack, so the defensive tiers below still run.
    if (this._iframeVeto(t) && d < weaponRange + 40 && !playerAttacking) {
      const _sp = weaponRange * 0.7;
      if (d > _sp + 8) { if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.5; }
      else if (d < _sp - 8) { if (!this.isEdgeDanger(-dir)) this.vx = -dir * moveSpd * 0.5; }
      this.aiReact = 0;
      this._commit('iframe_spacing');
      return;
    }

    // Domain denial: refuse neutral exchanges while a contact-economy domain runs. Stay out of reach and let
    // it expire. The pugilist low-HP combo has no distance gate, so a shield absorbs both hits instead.
    if (t._comboSuper && this.shieldCooldown === 0 && this._shieldHoldFrames === 0) {
      this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 26;
      this.aiReact = 0;
      this._commit('pugilist_read_a');
      return;
    }

    // Read the DomainManager registry generically. Contact-economy domains (spawnEvery 0) starve with
    // distance. Hazard-rain domains (Storm Realm lightning, Mjolnir) are the opposite: backing off buys
    // nothing and costs all his offence.
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
        this.vy = _jumpVy; this.vx = dir * moveSpd * 0.8;   // cornered, jump over
      } else if (this.canDoubleJump && d < 120) {
        this.vy = -15; this.canDoubleJump = false;
        if (!this.isEdgeDanger(_ddDir)) this.vx = _ddDir * moveSpd * 1.5;
      }
      // Point-blank with a swing incoming and no lane, shield rather than eat a mark
      if (playerAttacking && d < 130 && this.shieldCooldown === 0 && this._shieldHoldFrames === 0) {
        this.shielding = true; this.shieldCooldown = 60; this._shieldHoldFrames = 10;
      }
      this._recordEvent('dodge', 3);
      this.aiReact = 0;
      this._commit('pugilist_read_b');
      return;
    }

    // Force engagement: a passive, distant player (or one chipping him from outside melee) gets overridden
    // movement. Speed is unchanged, only decision priority.
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
        // Near edge, jump over instead of walking into the void
        if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.6; }
      }
      // Only jump to reach genuinely elevated platforms, not for minor height differences
      if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 130 && !t.onGround) {
        this.vy = _jumpVy; this._jumpCooldown = 28;
      }
      // Attack the moment range allows, no bait, no hesitation
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

    // Aerial engagement: jump at a player who camps high ground. Fires once _prefersAerial is confirmed (over
    // 35% airborne in the last 120 ticks). Not during other priority overrides.
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

    // D. Anti-exploit forced response
    if (this._runExploitResponse(t, dir, d, moveSpd)) {
      this.aiReact = Math.max(0, reactFrames - 1);
      this._commit('anti_exploit');
      return;
    }

    // SOVEREIGN ESCAPE: when backed to own edge, jump over player to reverse corner
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

    // CORNER EXPLOIT: player is near edge, block escape, attack aggressively
    if (this._preferCommit('corner_exploit') && this._runCornerExploit(t, dir, d, moveSpd, atkRange)) {
      this.aiReact = this._limiterBroken ? 0 : Math.max(0, reactFrames - 1);
      this._updateFearFactor(d, recentLanded, true);
      this._commit('corner_exploit');
      return;
    }

    // B. Punish mode: ignore defense, go full offense
    if (this._punishModeActive && this._preferCommit('punish_mode')) {
      // Stop-short fakeout: pause just outside attack range before striking. Breaks the fixed timing
      // skilled players use to dodge punish rushes.
      if (this._punishFakeoutTimer > 0) {
        this._punishFakeoutTimer--;
        this.vx *= 0.28; // near-stop, player expects the strike to land immediately
        // Strike fires when the pause ends and range is met
        if (this._punishFakeoutTimer === 0 && this.cooldown <= 0 && d < weaponRange + 28) {
          this.attack(t);
        }
      } else {
        // Randomised approach speed, so no single timing read works twice.
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
      // Reduced ability/super spam during punish mode, still aggressive, but not relentless
      if (this.abilityCooldown <= 0 && d < 220 && Math.random() < 0.05) this.ability(t);
      if (this.superReady && Math.random() < (finishPush ? 0.12 : 0.055)) this.useSuper(t);
      this.aiReact = 1; // unbeatable tuning: near-continuous decisions in punish mode
      this._updateFearFactor(d, recentLanded, true);
      this._commit('punish_mode');
      return;
    }

    // Preemptive prediction counter. Sourced from BehaviorModel (see _updatePrediction). One path per
    // predicted action, so a correct read is credited once.
    const adaptReady = this._observationFrames >= 4 && this._actionSampleCount >= 1;
    if (adaptReady && !this._humanMissArmed && !playerAttacking) {
      // Predicted attack: step back once and commit. Crediting via _preemptMode lets _checkPredictionCorrect
      // reward it.
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
      // Predicted jump, dodge or shield: the multi-frame preempt (anti-air landing, intercept, or guard-break).
      if (this._applyPredictionCounter(t, dir, d, moveSpd)) {
        this.aiReact = reactFrames;
        this._commit('predict_counter_b');
        return;
      }
    }

    // One mistake-gated decision per attack, latched per attack instance so every defensive site shares one roll.
    if (!playerAttacking) this._reactLatch = null;
    else if (!this._reactLatch) this._reactLatch = { react: Math.random() >= this._reactionMistakeRate() };
    const _willReactToAttack = !!(this._reactLatch && this._reactLatch.react);

    // Shield first when it is the tactically preferred reaction. Otherwise fall through to hardCounter or
    // counter-attack, which dodge.
    if (playerAttacking && d < 210 && this.shieldCooldown === 0 && this._shieldHoldFrames === 0 &&
        effDef > this._dialGate(0.625)) {
      const _shCornered = (nearLeft && dir < 0) || (nearRight && dir > 0);
      // Shield is preferred when cornered, vs a heavy or high-knockback weapon (long punishable recovery),
      // under sustained pressure, or with a learned bias. The go/no-go on reacting is _willReactToAttack.
      const _shieldPreferred = _shCornered || (t.weapon && t.weapon.kb >= 18) ||
        recentTaken >= 2 || memoryShield > 0.15;
      if (_willReactToAttack && _shieldPreferred) {
        this._telegraphTimer   = 0; // cancel any pending wind-up, shield takes priority
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

    // Phase Step: a dash at high speed toward him while attacking. Detect it and dodge before the vx=14 lands.
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

    // Wall-behind-me safety: with the void directly behind him, knockback would launch him into it. Slide to
    // centre before the swing lands.
    const wallBehindMe = (nearLeft && dir > 0) || (nearRight && dir < 0);
    if (wallBehindMe && heavyThreat && d < 160 && !playerAttacking) {
      const _wbDir = nearLeft ? 1 : -1; // toward center
      if (!this.isEdgeDanger(_wbDir)) this.vx = _wbDir * moveSpd * 1.4;
      if (d < weaponRange + 10 && this.cooldown <= 0) this.attack(t); // still attack if in range
      this.aiReact = 0;
      this._commit('wall_safety');
      return;
    }

    // Counter-attack: dodge or shield on a player attack. The reaction is gated by _willReactToAttack. The
    // shield-vs-dodge choice is deterministic on tactical context.
    if (playerAttacking && d < 210) {
      const canShield = this.shieldCooldown === 0;
      const cornered  = (nearLeft && dir < 0) || (nearRight && dir > 0);
      if (_willReactToAttack) {
        // Prefer shield when cornered, vs a heavy weapon, under sustained pressure, or with a learned bias.
        // Otherwise slip the swing and punish.
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

        // Dodge, slip the swing, then commit to a punish.
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
          this.vx = dDir * moveSpd * 2.0; // airborne, no double jump, lateral slip
        } else if (canShield) {
          // Cornered mid-air with no lane, shield as the last-resort block.
          this.shielding        = true;
          this.shieldCooldown   = 60;
          this._shieldHoldFrames = 8;
          this._recordEvent('dodge', 3);
          this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
          this.aiReact = reactFrames;
          this._commit('counter_attack_b');
          return;
        } else {
          _dodged = false; // no dodge lane and no shield, gets clipped this frame
        }

        if (_dodged) {
          this.shielding = false;
          this._telegraphTimer = 0; // cancel any pending wind-up, dodge takes priority
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
      // Not reacting, or no escape lane: he eats the attack. The mistake rate sets the player's reward window.
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

    // PUNISH TIMER: sprint and strike after dodge
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
          // Airborne, no double jump, lateral burst to exit the attack arc
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
      // Attack the moment range closes, use actual weapon range to avoid whiffs
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
        // A completed punish is a confirmed conversion window: spend ability and super, since the engine
        // guarantees value here.
        this._tryTacticalConversion(t, d, weaponRange);
      }
      this._commit('punish_timer_b');
      return;
    }

    // Endlag punish: strike while the opponent is locked in recovery. _endlagWindow is a bounded timer set
    // when their attack ends. It expires quickly, so commit at once.
    if (this._endlagWindow > 0 && !playerAttacking) {
      // A swing that actually started consumes the window. On a whiff-guard veto, fall through and keep it.
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
      // Out of range: sprint to close the gap, window is brief so no hesitation
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 2.0;
      if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 80) {
        this.vy = _jumpVy; this._jumpCooldown = 22;
      }
    }

    // Instant counter on whiff, dash in even from range to punish consistently
    if (this._counterWindowOpen) {
      // Close the window if player starts a new attack during the chase
      if (playerAttacking) this._counterWindowOpen = false;
      // Phase Step is the signature counter: whenever ready, use it as the gap closer and punish tool.
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
        // Out of range: sprint at maximum speed, never abandon a punish window
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
      // Truly stuck (airborne + edge + no double jump), abandon window
      this._counterWindowOpen = false;
    }

    // Combo follow-up: light, Phase Step (heavy), light, light. Phase Step fires as the first follow-up
    // whenever the ability is ready and in range.
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
          // Confirmed connect: refund this hit up to the cap, so a landing string converts into damage. A
          // whiffing one still runs down and ends, so swing volume does not inflate.
          if (this._comboLandedLast && this._comboExtensions < this._COMBO_EXT_MAX) {
            this._comboExtensions++;
          } else {
            this._comboFollowHits--;
          }
          this._comboFollowTimer = Math.max(lb ? 9 : 12, Math.round(13 - m.reactionSpeed * 3));
        } else {
          // Target escaped reach (knockback drift or airborne): chase and retry soon. Keep the remaining
          // follow-ups rather than burning them on air.
          this._comboFollowTimer = 4;
          if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.15;
        }
        this._commit('combo_follow_b');
        return;
      }
    }

    // PATTERN ANTICIPATION
    // Jump-heavy player → shadow their air movement
    if (recentPJumps >= 3 && !this.onGround && this.canDoubleJump && !t.onGround) {
      this.vy = -15; this.canDoubleJump = false;
    }
    // Rapid-attack player → pre-position at punish range
    if (recentPAtks >= 4 && d < prefDist + 60 && d > prefDist) {
      this.vx *= 0.80;
    }

    // BAIT MECHANIC
    if (this._baitTimer > 0 && this._preferCommit('bait')) {
      this._baitTimer--;
      this.vx = 0; // stand still, invite attack (creeping telegraphs intent and defeats the bait)
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
        // Bait expired untaken. Without a cooldown, baits chain back to back and he stands frozen at range.
        // Ration the bait and turn the read into pressure.
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

    // Proactive shield stance at close range: hold briefly to bait an attack. Reserved while the target has
    // a ramped super ready.
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

    // PLATFORM CONTROL: contest player's favourite platform
    if (!finishMode && this._preferCommit('platform_control') && this._runPlatformControl(t, dir, d, moveSpd)) {
      this.aiReact = Math.max(1, reactFrames);
      this._commit('platform_control');
      return;
    }

    // Player attacks while he is outside attack range. Without this he walks straight into the hit.
    if (playerAttacking && d > atkRange && d < 240 && this._preferCommit('mid_approach_evasion')) {
      const dDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(dDir)) {
        this.vx = dDir * moveSpd * 2.2;
      } else if (this.onGround) {
        // Truly cornered, only jump if backed against our own wall, otherwise step back
        if ((nearLeft && dir < 0) || (nearRight && dir > 0)) {
          this.vy = _jumpVy; this.vx = dir * moveSpd * 0.7; // jump into/over player
        } else {
          this.vx = -dir * moveSpd * 1.1; // step back without jumping
        }
      } else if (this.canDoubleJump) {
        this.vx = dDir * moveSpd * 1.6;
        this.vy = -15; this.canDoubleJump = false;
      } else {
        // Airborne, no double jump, lateral shift to exit the attack arc
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

    // Breathing room: back off after sustained aggression, so the player gets a clear window.
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

    // Commitment states override distance re-evaluation, so a brief gap from knockback does not make him
    // retreat from an advantage.

    if (this._commitToChaseFrames > 0) {
      // Dodge-to-chase: committed pursuit after a successful dodge. The punish timer drives the sprint. These
      // frames cover the follow-through.
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
        // Always step in, no idle drift
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.35;
      }
      if (this._studyBurstTimer > 0 && !this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.12;
    } else if (d > prefDist + 20 || finishMode) {
      if (!nearLeft || dir >= 0) if (!nearRight || dir <= 0) {
        // Anticipatory positioning: move toward where the player will be in 6 frames, not where they are now.
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
      // Settle zone at contact range. Steering to dead centre flipped dir on every overshoot and vibrated him
      // left and right. Damp instead; the attack logic below still fires.
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
      // Between preferred distance and approach threshold, maintain forward pressure
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.65;
    }

    // ELEVATION CONTEST: player standing on a platform above
    // Elevation contest: a player standing on a platform above. Within one jump, go straight up. Higher,
    // climb via the nearest platform one jump above, repeating each hop until level with the camper.
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
          // Steer toward the platform for the whole ascent. A one-shot vx gets overwritten next frame.
          this._hopTarget = _hop;
          this._hopFrames = 40;
        }
      }
    }

    // Reach at which he is willing to open a string this frame. A real opening earns full reach. A cold
    // neutral read has to be paid for with real distance, not a tip-range poke.
    // Behind a toggle, so it can be A/B tested against the same opponent.
    const _gateOn = !(typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.openGate === false);
    const _openCommitted = playerAttacking || (t.attackEndlag || 0) > 0 ||
                           (t.stunTimer || 0) > 0 || this._punishModeActive ||
                           this._endlagWindow > 0 || this._predictConf >= 0.50;
    const _openReach     = (_openCommitted || !_gateOn) ? weaponRange + 10 : weaponRange - 10;

    // ATTACK, telegraph then strike
    // Each first strike is preceded by a brief wind-up. Follow-up hits are handled by _comboFollowHits.
    if (this._telegraphTimer > 0) {
      this.vx *= 0.28; // near-stop during wind-up, player can read the incoming attack
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
          // Breathing-room rest is disabled: he never backs off after sustained aggression.
          this._aggressionStreak++;
        } else {
          // Swing vetoed: the target slipped out of reach during the wind-up. Commit to a short chase rather
          // than re-arming a telegraph on the spot, which stalls at the range boundary.
          this._postHitLockFrames = Math.max(this._postHitLockFrames, 10);
        }
      }
    // Opening-range gate (see _openReach): at the very tip of reach a cold swing has the highest whiff risk
    // and the lowest value.
    } else if (d < _openReach && this.cooldown <= 0 &&
               Math.abs((this.y + this.h / 2) - (t.y + t.h / 2)) <= 70) {
      // Vertical gate: never wind up under a hovering or elevated player the blade cannot reach. No telegraph
      // against a player who just spawned.
      if (t.invincible > 80) { this.aiReact = reactFrames; this._commit('hold_vs_invuln'); return; }
      // Wind-up shrinks as he evolves, and is shorter after a limiter break. A confident read that the player
      // is about to swing collapses it to 1 frame, since melee trades go to whoever swings first.
      const _tradeRead = this._predictedNext === 'attack' &&
                         this._predictConf >= 0.55 &&
                         !(t.attackTimer > 0);
      // The wind-up is 1-3 frames. The particle tell still fires, but the read window is gone.
      this._telegraphTimer = _tradeRead ? 1 : (lb ? 2 : 3);
      spawnParticles(this.cx(), this.cy(), '#ffaa00', 4);
      this.vx *= 0.35; // begin slowing as wind-up starts
      // Verbal cue, fires occasionally so the player has a chance to react
      if (typeof SMK2_ATTACK_WARN_LINES !== 'undefined' && Math.random() < 0.35) {
        if (typeof showBossDialogue === 'function')
          showBossDialogue(SMK2_ATTACK_WARN_LINES[Math.floor(Math.random() * SMK2_ATTACK_WARN_LINES.length)], 60);
      }

    } else if (_gateOn && !_openCommitted && d < weaponRange + 14 && d >= _openReach) {
      // Declining the tip-range poke must mean closing, never hovering. Without this the gate above parks him
      // just outside his own reach and he stops attacking.
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.9;
      else if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.5; }
    }

    // ABILITY / SUPER
    // React to the player's observed ability/super usage profile.
    const tHasSuperReady = !!t.superReady;
    const tHasAbilityUp  = (t.abilityCooldown || 0) === 0;

    // Healer profile: player uses super when low HP, rush to interrupt the heal window
    if (this._superProfile === 'healer' && tHasSuperReady && tHpPct < 0.42 && d > prefDist) {
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.6;
    }
    // Opener profile: player super-as-range-opener, pre-dodge when they have charge at long range
    if (this._superProfile === 'opener' && tHasSuperReady && d > 140 && !playerAttacking) {
      const _od = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(_od) && this.cooldown <= 0) {
        this.vx = _od * moveSpd * 1.3;
        this._recordEvent('dodge', 3);
      }
    }
    // Finisher profile: player uses super as combo follow-up, dodge back after taking a hit
    if (this._superProfile === 'finisher' && tHasSuperReady && this._countRecent('dmg_taken', 25) >= 1) {
      const _fd = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(_fd)) {
        this.vx = _fd * moveSpd * 1.5;
        this._recordEvent('dodge', 4);
      }
    }
    // Poke ability profile: player ability-as-poke, close distance to deny the range window
    if (this._abilityProfile === 'poke' && tHasAbilityUp && d > 130 && !playerAttacking) {
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.2;
    }

    // Own ability and super: spent only on a guard, recovery, map trap, finish or survival opportunity, not on
    // random neutral casts.
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

  // draw(): limiter break visual layer.

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
      // Ring only, no fill and no full-screen tint (Oct 19 2026): the orb hid his body and wind-ups,
      // and the red wash over the whole screen made fights unreadable.
      ctx.strokeStyle = `rgba(${rr},${gg},${bb},${Math.min(0.8, a * 2.5).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.cx(), this.cy(), r + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.health > 0 && settings.bossAura) {
      const p = this._intimidation;
      const evo = this._evolutionStage;
      if (p > 0.08 || evo > 0) {
        const pulseR = 28 + evo * 8 + Math.sin(this._intimidationPulse) * (4 + p * 7);
        ctx.save();
        // Ring only (Oct 19 2026): the filled glow covered his body.
        ctx.strokeStyle = `rgba(255,170,60,${(0.10 + p * 0.28).toFixed(3)})`;
        ctx.lineWidth = 1.5 + evo * 0.2;
        ctx.beginPath();
        ctx.arc(this.cx(), this.cy(), pulseR * 0.88, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Null Anchor tether: red line snapping from the fall point back to the anchor, fading over ~22 frames.
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

    // Parent draw: aura and fighter body (the ADAPTING label is skipped for him).
    super.draw();

    // The intimidation line and ring drawn on the target were removed Oct 19 2026: a ring on the
    // player read as a status effect and added to the clutter.

    // The overhead text labels (LIMITER BREAK, PUNISHING, stage, PRESSURE, COUNTER,
    // CORNERING) were removed Oct 18 2026: they cluttered recorded footage; the
    // same state is still in showSovereignPredictions() and the debug overlay.
  }
}

// Debug / console API.
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
  // Platform, spatial, corner and post-KB resets.
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


// Free swing: after the cascade, a ready swing on a target in reach is taken, since several branches move
// him without asking for a swing. It goes through attack(), so its vetoes still decide.
SovereignMK2.prototype._freeSwing = function () {
  const t = this.target;
  if (!t || !(t.health > 0) || !this.weapon || this.weapon.type !== 'melee') return;
  if (this.cooldown > 0 || this.attackTimer > 0 || this.attackEndlag > 0 || this.shielding) return;
  if (this.stunTimer > 0 || this.ragdollTimer > 0 || this.hurtTimer > 0) return;
  if (this._lastCommit === 'spawn_standoff' || this._lastCommit === 'iframe_spacing') return;
  if (typeof MoveScene !== 'undefined' && MoveScene.isBusy(this)) return;
  if (Math.abs((this.y + this.h) - (t.y + t.h)) > 60) return;
  const reach = typeof this._meleeReachDist === 'function' ? this._meleeReachDist(t) : 90;
  const dx = t.cx() - this.cx();
  if (Math.abs(dx) > reach - 4) return;
  this.facing = dx >= 0 ? 1 : -1;
  this.attack(t);
  if (this.attackTimer > 0) this._commit('free_swing');
};
(function () {
  const _updateAI = SovereignMK2.prototype.updateAI;
  SovereignMK2.prototype.updateAI = function () {
    const free = !!(window.SMK2_TUNE && SMK2_TUNE.freeSwing);
    if (free) this._lastCommit = null;
    const r = _updateAI.apply(this, arguments);
    if (free) this._freeSwing();
    return r;
  };
})();

// The single definition of the strongest Sovereign. Possession (SovereignControl) used to build a weaker
// one from the constructor. `silent` skips the on-screen escalation, so the ratchet never fires its
// shake, particles or dialogue.
function applySovereignPeakTuning(ai, opts) {
  if (!ai || !ai.aiMemory) return ai;
  const silent = !!(opts && opts.silent);
  // Dials: peak is a ceiling, not a starting position. Pinning the dials here would sit them against their
  // ease() ceiling and leave no headroom for adaptV2. Under adaptV2 he earns the peak within the fight.
  if (!(typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.adaptV2)) {
    ai.aiMemory.aggression    = 0.94;
    ai.aiMemory.defense       = 0.90;
    ai.aiMemory.spacing       = 0.08;
    ai.aiMemory.reactionSpeed = 0.98;
    ai.intelligence           = 0.97;
  } else {
    const m = ai.aiMemory;
    // Derived, not asserted: a fixed 0.97 would describe nobody on 0.60 dials, and aura colour and several gates read it.
    ai.intelligence = (m.aggression + m.defense + (1 - m.spacing) + m.reactionSpeed) / 4;
  }
  ai._limiterBroken         = true;
  ai._limiterBreakDialogue  = true;  // suppress opening "limiters withdrawn" line
  ai._adaptInterval         = 4;
  ai._pressureMode          = 'suffocate';
  ai._evolutionStage        = silent ? 3 : 2; // boss earns TYRANT on screen; possession starts there
  ai._intimidation          = 0.60;
  // Skip the observation warmup: he fights at full intelligence from frame 1.
  ai._observationFrames     = 120;
  ai._actionSampleCount     = 10;
  if (typeof ai._updateAuraColor === 'function') ai._updateAuraColor();
  return ai;
}


// Commit log readout (dev). Which cascade branches win frames, and how often. Session-wide, so a
// multi-match headless run reads as one tally.
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
