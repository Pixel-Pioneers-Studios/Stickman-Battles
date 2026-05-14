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
    // Don't affect story mode — story uses AdaptiveAI directly

    // ── A. Prediction System ────────────────────────────────────
    // Bigram table: maps "lastAction→currentAction" → occurrence count
    this._bigramTable   = {};          // { 'jump→attack': 5, 'idle→jump': 3, … }
    this._trigramTable  = {};          // { 'jump→attack→dodge': 2, … }
    this._actionSeq     = [];          // ring buffer: last 32 tagged actions
    this._lastAction    = 'idle';
    this._lastTwoActions = ['idle', 'idle'];
    this._predictedNext = null;        // current prediction or null
    this._predictConf   = 0;           // 0–1 confidence
    this._predictSource = 'none';      // none|bigram|trigram|habit
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
    this._FORCE_DIST_THRESHOLD  = 200; // px — "player is staying far"
    this._FORCE_DIST_FRAMES     = 70;  // ~1.2 sec continuously far
    this._FORCE_IDLE_FRAMES     = 70;  // ~1.2 sec since player last attacked
    this._FORCE_CLOSE_NEEDED    = 30;  // frames close (<140px) needed to exit force mode
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
  }

  // ══════════════════════════════════════════════════════════════
  // A. PREDICTION SYSTEM
  // ══════════════════════════════════════════════════════════════

  _recordActionBigram(action) {
    if (action === 'idle' && this._lastAction === 'idle') return; // skip idle→idle noise
    const key = `${this._lastAction}→${action}`;
    this._bigramTable[key] = (this._bigramTable[key] || 0) + 1;
    const trigramKey = `${this._lastTwoActions[0]}→${this._lastTwoActions[1]}→${action}`;
    this._trigramTable[trigramKey] = (this._trigramTable[trigramKey] || 0) + 1;
    this._actionSeq.push(action);
    if (this._actionSeq.length > 32) this._actionSeq.shift();
    this._lastTwoActions = [this._lastTwoActions[1], action];
    this._lastAction = action;
  }

  _updatePrediction() {
    const triPrefix = `${this._lastTwoActions[0]}→${this._lastTwoActions[1]}→`;
    let triBest = null, triBestCount = 0, triTotal = 0;
    for (const [key, count] of Object.entries(this._trigramTable)) {
      if (key.startsWith(triPrefix)) {
        triTotal += count;
        if (count > triBestCount) { triBestCount = count; triBest = key.split('→')[2]; }
      }
    }
    if (triTotal >= 2 && triBestCount / triTotal >= 0.50) {
      this._predictedNext = triBest;
      this._predictConf   = triBestCount / triTotal;
      this._predictSource = 'trigram';
      this._predTotal++;
      return;
    }

    const recent = this._actionSeq.slice(-6).filter(a => a !== 'idle');
    if (recent.length >= 4) {
      const counts = {};
      for (const act of recent) counts[act] = (counts[act] || 0) + 1;
      let bestHabit = null, bestHabitCount = 0;
      for (const [act, count] of Object.entries(counts)) {
        if (count > bestHabitCount) { bestHabit = act; bestHabitCount = count; }
      }
      const habitConf = bestHabitCount / recent.length;
      if (bestHabit && habitConf >= 0.66) {
        this._predictedNext = bestHabit;
        this._predictConf   = Math.min(0.95, 0.40 + habitConf * 0.65);
        this._predictSource = 'habit';
        this._predTotal++;
        return;
      }
    }

    // Given _lastAction, find the most likely next action
    const prefix = `${this._lastAction}→`;
    let best = null, bestCount = 0, total = 0;
    for (const [key, count] of Object.entries(this._bigramTable)) {
      if (key.startsWith(prefix)) {
        total += count;
        if (count > bestCount) { bestCount = count; best = key.split('→')[1]; }
      }
    }
    // Require at least 2 observations before predicting
    if (total >= 2 && bestCount / total >= 0.40) {
      this._predictedNext = best;
      this._predictConf   = bestCount / total;
      this._predictSource = 'bigram';
      this._predTotal++;
    } else {
      this._predictedNext = null;
      this._predictConf   = 0;
      this._predictSource = 'none';
    }
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
        // Reposition to anti-air zone: move under predicted apex
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * (0.85 + this._intimidation * 0.40);
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
    if (this._punishModeTimer > 0) this._punishModeTimer--;
    else if (this._punishModeActive) this._punishModeActive = false;
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
    if (this._observationFrames < 120) return;
    const recentTaken = this._countRecent('dmg_taken', 180);
    const hpPct = this.health / Math.max(1, this.maxHealth);
    const targetAdv = t && t.health > 0 ? t.health / Math.max(1, this.health) : 1;
    const overwhelmed = recentTaken >= 4 || (targetAdv > 1.28 && hpPct < 0.72);
    const habitOverload = this._dominantHabitScore >= 5.2 && this._punishModeCount >= 1;
    if (this.intelligence >= 0.76) return this._triggerLimiterBreak('evolution');
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
    const suffocateNow = this._limiterBroken || this._punishModeActive || this._intimidation > 0.58 || this._pressureHoldTimer > 0 || memoryHot || memoryAggressive;
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
    if (this._observationFrames < 90 || this._actionSampleCount < 4) return null;

    const seq = this._actionSeq.filter(a => a !== 'idle');
    if (seq.length < 6) return null;

    // Use the last 12 non-idle actions for rate calculation
    const recent = seq.slice(-12);
    const total  = recent.length;
    const counts = { jump: 0, attack: 0, shield: 0, dodge: 0 };
    for (const a of recent) if (counts[a] !== undefined) counts[a]++;

    const jumpRate   = counts.jump   / total;
    const attackRate = counts.attack / total;
    const shieldRate = counts.shield / total;
    const dodgeRate  = counts.dodge  / total;

    // High-confidence thresholds — must be strong pattern, not noise
    if (jumpRate   > 0.60) return 'anti-air';
    if (attackRate > 0.65) return 'parry';
    if (shieldRate > 0.30) return 'guard-break';
    if (dodgeRate  > 0.50) return 'intercept';
    // Passive player (low overall action rate relative to window): apply pressure
    if (total <= 6 && this._observationFrames > 180) return 'pressure';
    return null;
  }

  _runHardCounter(t, dir, d, moveSpd, weaponRange, atkRange, playerAttacking) {
    if (this._counterLockTimer > 0) return false;

    // Use rate-based strategy with lock-in — don't re-evaluate every tick.
    // Post-KB profile feeds in as a fallback when no rate-based pattern is detected.
    if (this._adaptLockTimer <= 0) {
      let strategy = this._getCounterStrategy();
      if (!strategy && this._observationFrames >= 180) {
        // No strong rate pattern — try post-KB dominant behavior as a counter strategy
        const kbHint = this._getPostKBCounterHint();
        if (kbHint === 'jump')    strategy = 'anti-air';
        if (kbHint === 'shield')  strategy = 'guard-break';
        if (kbHint === 'attack')  strategy = 'parry';
        if (kbHint === 'retreat') strategy = 'intercept';
      }
      if (strategy) {
        this._lockedCounterStrategy = strategy;
        this._adaptLockTimer = 120; // hold this counter for 2 seconds
      }
    }
    if (this._adaptLockTimer > 0) this._adaptLockTimer--;

    // Execute locked strategy
    const strat = this._lockedCounterStrategy;
    if (strat === 'anti-air') {
      if (!t.onGround) {
        this._counterLockTimer = 10;
        this._pressureHoldTimer = Math.max(this._pressureHoldTimer, 50);
        if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.18;
        if (this.onGround && t.cy() < this.cy() - 14) this.vy = -19;
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
      if (this.onGround && !this.isEdgeDanger(dDir)) this.vx = dDir * moveSpd * 2.2;
      else if (this.onGround) this.vy = -18;
      this._punishTimer = this._limiterBroken ? 1 : 2;
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
      if (d < weaponRange * 1.25 + 20 && this.cooldown <= 0 && !this.onGround) {
        this.attack(t);
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
      if (d < atkRange * 1.15 && this.cooldown <= 0) {
        this.attack(t);
        this._queueAdaptivePunishOutcome(route, t, d);
        return true;
      }
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.42;
      return true;
    }

    if (d < atkRange * 1.1 && this.cooldown <= 0) {
      this.attack(t);
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
      if (this.onGround && t.y < this.y - 45 && Math.random() < 0.20) this.vy = -19;
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
    if (this.superReady && t.health < t.maxHealth * 0.38 && Math.random() < 0.55) this.useSuper(t);
    if (this.abilityCooldown <= 0 && d < 195 && Math.random() < 0.28) this.ability(t);

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

    if (!selfOnPref && playerApproachingPref && Math.random() < 0.18) {
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
    const nearLedge = this.x < 90 || this.x + this.w > GAME_W - 90 ||
                      (!this.onGround && this.y > GAME_H - 180);
    const heavyThreat = !!(t && t.weapon && (t.weapon.kb >= 18 || t.weapon.weaponType === 'heavy'));
    const inVoidRisk = offLeft || offRight || offBottom || (nearLedge && (this.vy > -1 || Math.abs(this.vx) > 4.4 || this._countRecent('dmg_taken', 45) >= 1));

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
    const ex = this._exploit;
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
      // Pull them toward center: use grasp-style impulse
      const ddx = GAME_W / 2 - t.cx();
      t.vx += ddx * 0.04; // gentle center-pull
      t.vy  = Math.min(t.vy, -6);
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.6;
      const weapon = this._getCombatWeapon();
      if (d < (weapon.range || 90) * 1.5 && this.cooldown <= 0) this.attack(t);
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
    if (i > 0.62 && this._humanFakeoutTimer <= 0 && this.onGround && Math.random() < 0.008) {
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

    // ── A. Bigram action tracking ────────────────────────────
    const currentAction = _smk2ClassifyAction(t, this._prevT2state);
    if (currentAction !== 'idle') {
      this._actionSampleCount++;
      this._recordActionBigram(currentAction);
      this._updatePrediction();
    }
    this._updateHabitTracker(currentAction, t);
    this._checkPredictionCorrect(t, currentAction);
    this._prevT2state = { attacking: t.attackTimer > 0, onGround: t.onGround, shielding: t.shielding, vx: t.vx };

    // ── BehaviorModel observe — parent system kept alive in SMK2 override ──
    // Parent updateAI() is never called here, so we drive the richer per-context
    // bigram model manually. _bmPred/_bmBias are used later for pre-dodge and approach.
    const _bmObs  = this._behaviorModel.observe(t, this._bmPrevSnap);
    this._bmPrevSnap = { onGround: t.onGround, vx: t.vx, vy: t.vy };
    const _bmPred = this._behaviorModel.predictNext(_bmObs.action, _bmObs.context);
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
    if (this._observationFrames >= 40 && this._actionSampleCount >= 2) {
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
    if (this._baitCooldown > 0) this._baitCooldown--;
    if (this._comboFollowTimer > 0) this._comboFollowTimer--;
    if (this._adaptivePunishTimer > 0) this._adaptivePunishTimer--;
    if (this._jumpCooldown > 0) this._jumpCooldown--;

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
    const thorSpacing   = (t.weaponKey === 'hammer' || t.charClass === 'thor') ? 14 : 0;
    const openerAggroBias = _memoryState ? (
      memoryOpening === 'aggressive' ? -18 :
      memoryOpening === 'edge' ? -22 :
      memoryOpening === 'defensive' ? -14 : 0
    ) : 0;
    const prefDist    = Math.max(10, 20 + m.spacing * 60 - this._intimidation * 22 - this._evolutionStage * 5 + threatSpacing + thorSpacing + memorySpacing * 80 + openerAggroBias);
    const moveSpd     = Math.min(6.5, 4.5 + realAgg * 1.5 + memoryReact * 0.25);  // faster than player base (6.5 vs 5.2)
    const atkFreq     = 1.0; // god-tier: always at max attack frequency
    // God-tier: zero reaction delay. Limiter stagger briefly delays to give player a punish window.
    const reactFrames = (lb && this._limiterStaggerTimer > 0)
      ? 2
      : Math.max(0, Math.round(4 - m.reactionSpeed * 4 - memoryReact * 6));
    const atkRange    = weaponRange * (1.1 + this._intimidation * 0.08) + 20;

    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = Math.sign(dx);
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

    // Tick frame-safe shield drop (replaces the old setTimeout approach)
    if (this._shieldHoldFrames > 0) {
      if (--this._shieldHoldFrames === 0) {
        this.shielding = false;
        // Shield-counter: player was attacking while we blocked → punish the moment shield drops
        if (playerAttacking && d < atkRange * 1.6 + 40) {
          this._punishTimer = lb ? 1 : 2;
        }
      }
    }

    // ── FORCE ENGAGEMENT ─────────────────────────────────────────
    // If player has been passive AND distant for too long, override movement.
    // Does not change speed values — only decision priority.
    const inForceMode = this._updateForceEngagement(t, d, playerAttacking);
    if (inForceMode) {
      // Override: always path directly at player, no hesitation
      if (!this.isEdgeDanger(dir)) {
        this.vx = dir * moveSpd; // full speed toward player, no multiplier increase
      } else {
        // Near edge — jump over instead of walking into the void
        if (this.onGround) { this.vy = _jumpVy; this.vx = dir * moveSpd * 0.6; }
      }
      // Jump if player is elevated or if a platform is in the way
      if (this.onGround && t.y < this.y - 45 && Math.random() < 0.55) {
        this.vy = _jumpVy;
      } else if (this.canDoubleJump && this.vy > 0 && t.y < this.y - 45) {
        this.vy = -15; this.canDoubleJump = false;
      }
      // Attack the moment range allows — no bait, no hesitation
      if (d < atkRange && this.cooldown <= 0) {
        this.attack(t);
      }
      // Use ability to close gap faster (decision, not speed change)
      if (this.abilityCooldown <= 0 && d < 300 && Math.random() < 0.35) this.ability(t);
      this.aiReact = Math.max(1, reactFrames - 1);
      this._updateFearFactor(d, recentLanded, true);
      return;
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
      // No dodging — rush and attack relentlessly
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.45;
      if (this.onGround && t.y < this.y - 50 && Math.random() < 0.3) this.vy = -19;
      if (d < atkRange * 1.3 && this.cooldown <= 0) {
        this.attack(t);
        const comboHits = Math.floor(this.intelligence * 3.5) + lbCombo;
        if (comboHits > 0 && this._comboFollowHits === 0) {
          this._comboFollowHits = comboHits;
          this._comboFollowTimer = Math.max(4, Math.round(8 - m.reactionSpeed * 5));
        }
      }
      // Use ability and super aggressively during punish mode
      if (this.abilityCooldown <= 0 && d < 280 && Math.random() < 0.45) this.ability(t);
      if (this.superReady && Math.random() < (finishPush ? 0.80 : 0.50)) this.useSuper(t);
      this.aiReact = 0; // zero delay in punish mode
      this._updateFearFactor(d, recentLanded, true);
      return;
    }

    // ── A. Preemptive prediction counter ─────────────────────
    // Short observation window — Sovereign reads patterns almost immediately
    const adaptReady = this._observationFrames >= 40 && this._actionSampleCount >= 2;
    if (adaptReady && !this._humanMissArmed) {
      // BehaviorModel pre-dodge: step back before a confidently-predicted attack fires.
      // Uses the richer per-context bigram from the parent system (7 actions × 3 contexts).
      if (_bmBias.preDodgeFrames > 0 && !playerAttacking && this.cooldown <= 0) {
        const _pdDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        if (this.onGround && !this.isEdgeDanger(_pdDir)) {
          this.vx      = _pdDir * moveSpd * 1.5;
          this.aiReact = _bmBias.preDodgeFrames;
          this._recordEvent('dodge', 4);
          return;
        }
      }
      if (this._applyPredictionCounter(t, dir, d, moveSpd)) {
        this.aiReact = reactFrames;
        return;
      }
    }

    if (this._runHardCounter(t, dir, d, moveSpd, weaponRange, atkRange, playerAttacking)) {
      this.aiReact = this._limiterBroken ? 0 : Math.max(0, reactFrames - 1);
      this._updateFearFactor(d, recentLanded, true);
      return;
    }

    // ── COUNTER-ATTACK: dodge or shield on player attack ─────
    if (playerAttacking && d < 210) {
      const canShield = this.shieldCooldown === 0;
      const cornered  = (nearLeft && dir < 0) || (nearRight && dir > 0);
      // Shield preferred when cornered (no clean dodge direction), under heavy pressure,
      // or limiter broken (Sovereign wants to absorb and counter rather than flee).
      const shieldChance = (canShield && effDef > 0.55)
        ? (cornered ? 0.62 : 0.22) + (lb ? 0.12 : 0) + (recentTaken >= 2 ? 0.14 : 0) + (heavyThreat ? 0.18 : 0) + memoryShield
        : 0;

      if (shieldChance > 0 && Math.random() < shieldChance) {
        this.shielding        = true;
        this.shieldCooldown   = 60;
        this._shieldHoldFrames = 10;
        this._recordEvent('dodge', 3);
        this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
        this.aiReact = reactFrames;
        return;
      }

      // At high intelligence, dodge is near-certain — not a coin flip.
      // Below 0.72 intelligence it stays probabilistic so early-game has counterplay.
      const dodgeThresh = this.intelligence > 0.72
        ? Math.min(0.98, effDef * Math.min(1.55, _bmBias.dodgeBoost) * (heavyThreat ? 1.08 : 1.0) * memoryDodge)
        : effDef * 0.88 * Math.min(1.55, _bmBias.dodgeBoost) * (heavyThreat ? 1.05 : 1.0) * memoryDodge;

      if (Math.random() < dodgeThresh) {
        const dDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        if (this.onGround && !this.isEdgeDanger(dDir)) {
          this.vx = dDir * moveSpd * 2.2;
        } else if (this.onGround) {
          this.vy = -19; this.vx = dir * moveSpd * 0.8; // jump into/over player
        } else if (this.canDoubleJump) {
          this.vy = -16; this.canDoubleJump = false;
        }
        this.shielding = false;
        this._recordEvent('dodge', 5);
        this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
        this._punishTimer = lb ? 2 : 3;
        this.aiReact = reactFrames;
        return;
      }

      // Cornered with no usable dodge direction — brief shield then instant punish
      if (canShield) {
        this.shielding        = true;
        this.shieldCooldown   = 60;
        this._shieldHoldFrames = 8;
        this._recordEvent('dodge', 3);
        this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
        this.aiReact = reactFrames;
        return;
      }
    } else {
      this.shielding = false;
    }

    if (heavyThreat && !playerAttacking && d < Math.max(prefDist, 190) && this.shieldCooldown === 0 && this._shieldHoldFrames === 0) {
      if (Math.random() < 0.02 + this.intelligence * 0.01) {
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
      this._punishTimer--;
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.9;
      if (this._punishTimer === 0) {
        const route = this._adaptivePunishRoute || this._chooseAdaptivePunishRoute(t, dir, d, playerAttacking, currentAction, _bmObs, _bmPred, recentTaken);
        if (this.cooldown <= 0 && d < weaponRange * 1.5 + 35) {
          const handled = this._applyAdaptivePunishRoute(route, t, dir, d, moveSpd, _jumpVy, weaponRange, atkRange);
          if (!handled) {
            this.attack(t);
            this._queueAdaptivePunishOutcome(route, t, d);
          }
          this._counterWindowOpen = false;
        }
        if (this.superReady && Math.random() < 0.55) this.useSuper(t);
        if (this.abilityCooldown <= 0 && d < 200 && Math.random() < 0.40) this.ability(t);
      }
      return;
    }

    // Instant counter on whiff — dash in even from range to punish consistently
    if (this._counterWindowOpen) {
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
      } else if (d < 280 && !this.isEdgeDanger(dir)) {
        // Out of range: dash in to close gap — keep window open so attack fires next tick
        this.vx = dir * moveSpd * 2.2;
        this.aiReact = 0;
        return;
      }
      // Nothing in range — discard stale window
      this._counterWindowOpen = false;
    }

    // ── COMBO FOLLOW-UP ────────────────────────────────────────
    if (this._comboFollowTimer === 0 && this._comboFollowHits > 0 && this.cooldown <= 0 && d < atkRange * 1.2) {
      this._comboFollowHits--;
      this.attack(t);
      this._comboFollowTimer = Math.max(lb ? 4 : 6, Math.round(8 - m.reactionSpeed * 4));
      return;
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
        const dDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        if (this.onGround && !this.isEdgeDanger(dDir)) {
          this.vy = -20; this.vx = dDir * moveSpd * 2.6;
        }
        this._punishTimer = 2;
        this._recordEvent('dodge', 8);
      }
      return;
    }

    // ── PROACTIVE SHIELD STANCE ────────────────────────────────
    // At close range, occasionally hold shield briefly to bait the player into
    // attacking — shield drops after 17 frames and the counter fires immediately.
    // Only fires when not in bait/punish/force mode and shield cooldown is ready.
    if (!this._punishModeActive && this._shieldHoldFrames === 0 && this.shieldCooldown === 0
        && this.intelligence > 0.60 && d < 150 && d > prefDist * 0.7
        && !playerAttacking && Math.random() < (0.006 + this.intelligence * 0.005)) {
      this.shielding        = true;
      this.shieldCooldown   = 60;
      this._shieldHoldFrames = 12; // shorter hold for proactive stance
      this.aiReact = Math.max(1, reactFrames);
      return;
    }

    const finishMode = finishPush;
    const canBait    = this.intelligence > 0.55 && this._baitCooldown === 0 && !finishMode && d < 140 && d > prefDist * 0.8;
    const baitStyleBoost = (_bmRead.style === 'defensive' || _bmRead.style === 'passive') ? 1.25 : 1.0;
    if (canBait && this.intelligence > 0.70 && Math.random() < (0.005 + this.intelligence * 0.007) * (_bmBias.baitBoost || 1.0) * baitStyleBoost * memoryBait) {
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
        this.vy = _jumpVy; this.vx = dir * moveSpd * 0.7;
      } else if (this.canDoubleJump) {
        this.vy = -15; this.canDoubleJump = false;
      }
      this._recordEvent('dodge', 5);
      this._punishTimer = lb ? 2 : 3;
      this.aiReact = 0;
      this._updateFearFactor(d, recentLanded, false);
      return;
    }

    // ── MOVEMENT — continuous, no idle gaps ───────────────────
    if (this._pressureMode === 'study' && !finishMode) {
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
    } else if (d > atkRange + 15 || finishMode) {
      if (!nearLeft || dir >= 0) if (!nearRight || dir <= 0) {
        // Anticipatory positioning: move toward where the player will be in 6 frames
        // rather than their current position (mirrors the parent's approach logic).
        const _proj    = this._behaviorModel.projectPosition(t, 6);
        const _projDir = Math.sign(_proj.x - this.cx()) || dir;
        const _aDir    = (Math.sign(_projDir) === dir || d < 80) ? _projDir : dir;
        const _aBoost  = _bmBias.approachBoost || 1.0;
        this.vx = _aDir * moveSpd * (finishMode ? 1.34 : this._pressureMode === 'suffocate' ? 1.16 : 1.0) * _aBoost;
      }
      if (this._jumpCooldown <= 0 && this.onGround && t.y < this.y - 80) {
        this.vy = _jumpVy;
        this._jumpCooldown = 30;
      } else if (this._jumpCooldown <= 0 && this.canDoubleJump && this.vy > 0 && t.y < this.y - 70) {
        this.vy = -15; this.canDoubleJump = false;
        this._jumpCooldown = 20;
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
      // In attack range — keep light pressure toward target
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 0.25;
    }

    // ── ATTACK — deterministic: if in range and ready, always attack ───
    if (d < atkRange && this.cooldown <= 0) {
      this.attack(t);
      const comboHits = Math.floor(this.intelligence * 3.5) + lbCombo;
      if (comboHits > 0 && this._comboFollowHits === 0) {
        this._comboFollowHits = comboHits;
        this._comboFollowTimer = Math.max(lb ? 4 : 6, Math.round(10 - m.reactionSpeed * 5));
      }
    }

    // ── ABILITY / SUPER ───────────────────────────────────────
    // Context-aware ability usage — don't fire randomly at any distance.
    // Priority order: guard-break opportunity > finish > panic > standard aggression.
    let abiChance  = 0.04 + realAgg * 0.07 * (lb ? 1.3 : 1.0);
    let abiMaxDist = 220;
    if (t.shielding && d < 150)        { abiChance = 0.65; abiMaxDist = 150; } // break the guard now
    else if (finishPush && d < 200)    { abiChance = Math.max(abiChance, 0.40); abiMaxDist = 200; }
    else if (hpPct < 0.25 && d < 200) { abiChance = Math.max(abiChance, 0.32); abiMaxDist = 200; } // panic use
    if (this.abilityCooldown <= 0 && d < abiMaxDist && Math.random() < abiChance) this.ability(t);
    const superChance = finishMode ? 0.60 : 0.18 + realAgg * 0.22;
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
  const total  = Object.values(ai._bigramTable).reduce((a, b) => a + b, 0);
  const top    = Object.entries(ai._bigramTable).sort(([,a],[,b]) => b - a).slice(0, 8);
  console.log(`[SovereignMK2] Top bigrams (${total} total):`);
  for (const [k, v] of top) console.log(`  ${k.padEnd(18)} x${v} (${(v/total*100).toFixed(0)}%)`);
  console.log(`Predictions: ${ai._predCorrect}/${ai._predTotal} correct`);
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
  ai._bigramTable   = {};
  ai._trigramTable  = {};
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
