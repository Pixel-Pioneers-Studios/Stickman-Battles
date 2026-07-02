'use strict';
// smb-smk2-class.js — SovereignMK2 class (extends AdaptiveAI) + debug/console API
// Depends on: smb-globals.js, smb-adaptive-ai.js

class SovereignMK2 extends AdaptiveAI {
  constructor(x, y, color, weaponKey) {
    super(x, y, color, weaponKey);

    this.name           = 'SOVEREIGN Ω';

    // Override AdaptiveAI defaults — Sovereign starts near-peak, not at warmup level
    this.aiMemory = { aggression: 0.90, defense: 0.88, spacing: 0.12, reactionSpeed: 0.95 };
    this.isSovereignMK2 = true;

    // Platform-hop steering + projectile-dodge state
    this._hopTarget   = null;
    this._hopFrames   = 0;
    this._projDodgeCd = 0;

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
    // No adaptation fires until _observationFrames >= 40 (≈0.7 sec)
    // AND _actionSampleCount >= 2 non-idle actions.
    this._observationFrames  = 0;   // incremented every AI tick
    this._actionSampleCount  = 0;   // non-idle actions seen
    this._adaptLockTimer     = 0;   // frames remaining on locked strategy
    this._lockedCounterStrategy = null; // 'anti-air'|'parry'|'guard-break'|'intercept'|'pressure'|null
    // Tactic-swap (Stage 3): decaying failure tally per strategy. When a locked
    // counter keeps letting the player through, Sovereign switches laterally.
    this._strategyFail       = {};  // { strategy: failCount }
    this._lockScored         = true; // has the current lock been scored for success/failure?

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
    this._heavyThreatCd     = 0;      // short memory for high-knockback weapons

    // Tune BehaviorModel for Sovereign: faster decay so recent patterns dominate
    // Default 0.993 / 6-frame interval; Sovereign uses 0.988 / 4-frame for quicker adaptation
    this._behaviorModel._decayRate     = 0.988;
    this._behaviorModel._decayInterval = 4;

    // Adaptive memory bridge state (local session + Supabase priors)
    this._adaptiveMemoryState   = null;
    this._adaptiveMemoryKey     = null;
    this._adaptiveMemorySession  = null;
    this._adaptiveMemoryPending  = false;

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

    // ── Reaction mistake-rate latch (Stage 3) ──────────────────────
    // One defensive read decision per player attack instance, latched on the
    // attack's rising edge so a multi-frame swing is a single read (not a fresh
    // coin-flip every frame). Cleared when the player isn't attacking.
    this._reactLatch          = null; // { react: bool } | null

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
        isHeavy:    _dt.weapon.kb >= 18,
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

    // Arm new preemptive action — lower confidence floor means earlier reads
    if (this._predictConf >= (0.50 - this._evolutionStage * 0.03) && d < 240) {
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
    // Real warmup before the limiter can break: Sovereign starts near peak
    // intelligence, so the 'evolution' trigger below would otherwise fire almost
    // immediately and skip the OBSERVING/READING arc the player is meant to see.
    if (this._observationFrames < 600) return;
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

    if (nextStage !== this._evolutionStage) {
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
    if (this._observationFrames < 20 || this._actionSampleCount < 1) return null;

    const seq = this._actionSeq.filter(a => a !== 'idle');
    if (seq.length < 4) return null;

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
    const sovereignBlocksEscape = this._cornerSide < 0
      ? (this.cx() > t.cx())   // player near left wall  → Sovereign right of them ✓
      : (this.cx() < t.cx());  // player near right wall → Sovereign left of them ✓

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
      // On correct side — press in relentlessly
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.18;
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
    const escapeDir = offLeft ? 1 : offRight ? -1 : centerDir;

    if (this.onGround || this.canDoubleJump || this.vy > 0 || offBottom) {
      this.vx = escapeDir * moveSpd * (heavyThreat ? 1.02 : 0.90);
      // Gate the jump behind the cooldown — prevents the trampoline pogo-stick
      // that fires when the arena floor is below the GAME_H-180 threshold.
      if (this._voidRecoverCd <= 0) {
        this._voidRecoverCd = heavyThreat ? 16 : 12;
        this.vy = this.onGround ? jumpVy : (offBottom ? -16 : -14);
        if (this.canDoubleJump && !this.onGround) this.canDoubleJump = false;
        if (typeof showBossDialogue === 'function' && Math.random() < 0.15) {
          showBossDialogue('Not yet.', 70);
        }
      }
      return true;
    }

    if (this._voidRecoverCd <= 0) {
      this._voidRecoverCd = heavyThreat ? 14 : 10;
      this.vx = retreatDir * moveSpd * (heavyThreat ? 0.96 : 0.84);
      this.vy = -12;
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

    // Fake-out movement: late-game only — walk wrong way then snap back
    if (i > 0.62 && this._humanFakeoutTimer <= 0 && this.onGround && Math.random() < 0.0016) {
      this._humanFakeoutDir   = -dir; // move AWAY from target briefly
      this._humanFakeoutTimer = Math.round(6 + Math.random() * 8);
    }
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

  // ── Stage 3: single reaction "beatability" knob ──────────────────────
  // THE one place defensive difficulty is tuned. Returns the probability that
  // Sovereign FAILS to react to an attack it can see — i.e. the player's reward
  // window for committing. Replaces the scattered per-site dodge/shield coin-flips
  // with one legible, tunable number. Starts forgiving (exchanges are winnable),
  // shrinks as Sovereign evolves / breaks its limiter, and spikes during a stagger
  // so even a peaked Sovereign always leaves a genuine opening. Lower the base to
  // make Sovereign harder; raise it to make it more beatable.
  _reactionMistakeRate() {
    let rate = 0.18;
    rate -= this._evolutionStage * 0.035;                    // main progression: 0 → -0.105
    rate -= Math.max(0, this.intelligence - 0.85) * 0.30;    // slight (Sovereign starts ~0.91)
    if (this._limiterBroken)                  rate -= 0.06;  // near-perfect after limiter break
    if (this._limiterStaggerTimer > 0)        rate += 0.42;  // staggered → genuine counter window
    if (this.health < this.maxHealth * 0.30)  rate += 0.04;  // desperate, a touch sloppier
    return Math.max(0.03, Math.min(0.55, rate));
  }

  // ══════════════════════════════════════════════════════════════
  // OVERRIDE: update() — tick new systems before physics
  // ══════════════════════════════════════════════════════════════

  update() {
    this._checkLimiterBreak(this.target);
    super.update();
  }

  // ══════════════════════════════════════════════════════════════
  // OVERRIDE: updateAI() — full enhanced AI loop
  // ══════════════════════════════════════════════════════════════

  updateAI() {
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
          if (this.canDoubleJump && this.vy > 5) { this.vy = -15; this.canDoubleJump = false; }
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
      } else if (_owKb >= 18 || _owType === 'heavy' || _owDmg >= 25) {
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
    if (this._observationFrames >= 20 && this._actionSampleCount >= 1) {
      this._updateSpamTracker(currentAction);
    }

    // ── D. Anti-exploit tracking ─────────────────────────────
    this._updateAntiExploit(t);
    this._updateSpatialProfile(t);   // platform + zone + post-KB tracking
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

    // Limiter break stagger: if the player lands 3+ hits within 1 sec while LB is active,
    // Sovereign briefly staggers — reaction delay spikes for ~1.5 sec, giving the player
    // a window to counter rather than facing permanent superhuman mode.
    if (this._limiterStaggerCd > 0) this._limiterStaggerCd--;
    if (lb && this._limiterStaggerTimer <= 0 && this._limiterStaggerCd <= 0 && this._countRecent('dmg_taken', 60) >= 4) {
      this._limiterStaggerTimer = 90;
      this._limiterStaggerCd    = 360; // 6-second cooldown — cannot be farmed
      showBossDialogue('...tch.', 80);
    }
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
    // (prefDist is already tuned via threatSpacing — no additional floor needed)
    const moveSpd     = Math.min(6.5, this._genome.moveSpdBase + realAgg * 1.5 + memoryReact * 0.25);  // faster than player base (6.5 vs 5.2)
    const atkFreq     = 1.0; // god-tier: always at max attack frequency
    // Always keep a minimum 2-frame reaction gap so the player has a tiny window
    // to read each action. Limiter stagger adds extra delay when player combos Sovereign.
    const reactFrames = (lb && this._limiterStaggerTimer > 0)
      ? 4
      : Math.max(2, Math.round(6 - m.reactionSpeed * 3 - memoryReact * 3));
    const atkRange    = weaponRange * (1.1 + this._intimidation * 0.08) + 20;

    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = Math.sign(dx);

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

    // ── Danger: incoming projectiles / sword crescents (kite counter) ──────
    // A ranged-poking player (crescent spam from 200-400px) chips Sovereign down
    // while it approaches on the ground. Read the live projectile pools and jump
    // the incoming shot — mistake-gated so it stays beatable, and on cooldown so
    // rapid volleys still land some hits.
    if (this._projDodgeCd > 0) this._projDodgeCd--;
    if (this._projDodgeCd <= 0 && this.onGround) {
      let _incoming = null;
      const _scanShots = (arr) => {
        if (!arr || _incoming) return;
        for (const pr of arr) {
          if (!pr || pr.done || pr.dead || pr.life <= 0 || pr.owner === this) continue;
          const _pdx = this.cx() - pr.x;
          if (Math.abs(_pdx) < 150 && Math.abs((pr.y || 0) - this.cy()) < 55 &&
              Math.abs(pr.vx || 0) > 3 && Math.sign(pr.vx) === Math.sign(_pdx)) {
            _incoming = pr; return;
          }
        }
      };
      if (typeof projectiles !== 'undefined') _scanShots(projectiles);
      _scanShots(t._swordSlashes);
      if (_incoming && Math.random() >= this._reactionMistakeRate()) {
        this.vy = _jumpVy * 0.85;
        this._projDodgeCd = 30;
        this._recordEvent('dodge', 2);
      }
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

    // Kill instinct: when opponent is near death, activate punish mode immediately
    if (tHpPct < this._genome.killInstinctHP && !this._punishModeActive && this.health > 0) {
      this._activatePunishMode('kill');
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
      this.aiReact = 2; // small gap even in punish mode — player can see each hit
      this._updateFearFactor(d, recentLanded, true);
      return;
    }

    // ── A. Preemptive prediction counter (single authoritative read) ──
    // Sourced from the unified BehaviorModel prediction (see _updatePrediction).
    // One path per predicted action, so the player never eats two conflicting
    // preempt reactions in a tick and every correct read is credited.
    const adaptReady = this._observationFrames >= 20 && this._actionSampleCount >= 1;
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
        if (this.superReady && Math.random() < (heavyThreat ? 0.88 : 0.55)) this.useSuper(t);
        // Phase Step is the ideal punish finisher vs heavy weapons — use it aggressively
        const _abilPunishChance = heavyThreat ? 0.92 : 0.40;
        if (this.abilityCooldown <= 0 && d < 220 && Math.random() < _abilPunishChance) this.ability(t);
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
          this._comboFollowHits--;
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
    if (!this._punishModeActive && this._shieldHoldFrames === 0 && this.shieldCooldown === 0
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
          // After each strike sequence, count toward a rest period
          this._aggressionStreak++;
          if (this._aggressionStreak >= 3 && this._restCooldown <= 0) {
            this._restTimer    = Math.round(25 + Math.random() * 20);
            this._restCooldown = 180;
            this._aggressionStreak = 0;
          }
        } else {
          // Swing vetoed — target slipped out of true reach during the wind-up.
          // Commit to a short chase to erase the gap instead of re-arming a
          // telegraph on the spot (which stalls Sovereign at the range boundary).
          this._postHitLockFrames = Math.max(this._postHitLockFrames, 10);
        }
      }
    } else if (d < weaponRange + 10 && this.cooldown <= 0 &&
               Math.abs((this.y + this.h / 2) - (t.y + t.h / 2)) <= 70) {
      // Vertical gate: never wind up under a hovering/elevated player the blade
      // can't reach — Sovereign used to slow-telegraph endlessly below them.
      // Don't arm the telegraph against a player who just spawned — prevents spawn-kills
      if (t.invincible > 80) { this.aiReact = reactFrames; return; }
      // In range — arm the telegraph (visual tell before striking)
      // Real frames now (per-frame cadence): 14 → 8 as Sovereign evolves; ~6 after
      // limiter break. Short enough to pressure, long enough for a human read.
      this._telegraphTimer = Math.max(lb ? 6 : 8, Math.round(14 - this._evolutionStage * 2 - (lb ? 2 : 0)));
      spawnParticles(this.cx(), this.cy(), '#ffaa00', 4);
      this.vx *= 0.35; // begin slowing as wind-up starts
      // Verbal cue — fires occasionally so the player has a chance to react
      if (typeof SMK2_ATTACK_WARN_LINES !== 'undefined' && Math.random() < 0.35) {
        if (typeof showBossDialogue === 'function')
          showBossDialogue(SMK2_ATTACK_WARN_LINES[Math.floor(Math.random() * SMK2_ATTACK_WARN_LINES.length)], 60);
      }
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

    // Own ability usage
    let abiChance  = 0.004 + realAgg * 0.008 * (lb ? 1.2 : 1.0) + (this._predictionBoostFrames > 0 ? 0.016 : 0);
    let abiMaxDist = 200;
    if (t.shielding && d < 150)        { abiChance = 0.14; abiMaxDist = 150; }
    else if (finishPush && d < 200)    { abiChance = Math.max(abiChance, 0.07); abiMaxDist = 200; }
    else if (hpPct < 0.25 && d < 200) { abiChance = Math.max(abiChance, 0.055); abiMaxDist = 200; }
    if (this.abilityCooldown <= 0 && d < abiMaxDist && (!playerAttacking || t.shielding) && Math.random() < abiChance) this.ability(t);

    // Own super: prefer contextual use over random timing
    let superChance = 0.008 + realAgg * 0.016;
    if (finishMode)                                           superChance = 0.11;
    else if (this._countRecent('hit_landed', 30) >= 2)       superChance = Math.max(superChance, 0.08);
    else if (tHpPct < 0.30 && d < 180)                       superChance = Math.max(superChance, 0.06);
    if (this.superReady && Math.random() < superChance) this.useSuper(t);
    if (this.health < 22 && this.superReady) this.useSuper(t);

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
