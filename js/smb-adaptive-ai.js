// Adaptive AI: Garou-style counter-striker.
// Reads player patterns in real time and punishes mistakes.
// Only used in the 'adaptive' game mode.

// Starting memory, calibrated to hard-bot behaviour.
// aggression/reactionSpeed high from the start; spacing low (fights close)
const ADAPTIVE_DEFAULTS = {
  aggression:    0.78,   // attacks relentlessly
  defense:       0.70,   // reads and reacts well
  spacing:       0.18,   // fights very close, Garou is always in your face
  reactionSpeed: 0.90,   // near-instant reaction
};

// Debug and console API
let adaptiveAIDebug = false;

function showAIStats(on) {
  adaptiveAIDebug = !!on;
  console.log('[AdaptiveAI] Stats overlay:', adaptiveAIDebug ? 'ON' : 'OFF');
}

function resetAdaptiveAI() {
  const ai = (typeof players !== 'undefined') && players.find(p => p.isAdaptive);
  if (!ai) { console.warn('[AdaptiveAI] No active AdaptiveAI found.'); return; }
  ai.aiMemory     = { ...ADAPTIVE_DEFAULTS };
  ai._eventBuffer = [];
  ai._adaptTick   = 0;
  ai._adaptCycles = 0;
  const _m = ai.aiMemory;
  ai.intelligence = (_m.aggression + _m.defense + _m.spacing + _m.reactionSpeed) / 4;
  ai._updateAuraColor();
  console.log('[AdaptiveAI] Reset to defaults.');
}

function logAIChanges() {
  const ai = (typeof players !== 'undefined') && players.find(p => p.isAdaptive);
  if (!ai) return;
  const m = ai.aiMemory;
  console.log(
    `[AdaptiveAI] Cycle ${ai._adaptCycles} | ` +
    `AGG=${(m.aggression*100).toFixed(0)}% ` +
    `DEF=${(m.defense*100).toFixed(0)}% ` +
    `SPC=${(m.spacing*100).toFixed(0)}% ` +
    `RXN=${(m.reactionSpeed*100).toFixed(0)}% ` +
    `INT=${(ai.intelligence*100).toFixed(0)}%`
  );
}

// AdaptiveAI class
class AdaptiveAI extends Fighter {
  constructor(x, y, color, weaponKey) {
    super(x, y, color, weaponKey, null, true, 'hard');

    this.isAdaptive = true;
    this.isBoss     = false;
    this.name       = 'SOVEREIGN';

    this.aiMemory = { ...ADAPTIVE_DEFAULTS };

    // Rolling event buffer (last ~20s of combat events)
    this._eventBuffer = [];

    this._adaptTick     = 0;
    this._adaptInterval = 8; // batch ~7.5x/sec, above human adaptation rate
    this._adaptCycles   = 0;

    // Health snapshots for delta detection
    this._prevHealth       = this.health;
    this._prevTargetHealth = Infinity;

    this._comboCount = 0;
    this._comboTimer = 0;

    // Garou-style combat state
    this._punishTimer        = 0;  // frames until counter-attack fires after a dodge
    this._prevPlayerAttacking = false;
    this._prevPlayerAirborne  = false;
    this._prevPlayerAtk       = 0;
    this._counterWindowOpen   = false;
    // Bait state
    this._baitTimer    = 0;  // frames remaining in bait stance (stand still to invite attack)
    this._baitCooldown = 0;  // frames until bait is available again
    this._baitCount    = 0;  // how many baits have been successfully punished (tracks pattern)
    this._baitIgnoredStreak = 0; // consecutive baits refused, rations future baits
    // Combo state
    this._comboFollowTimer = 0; // frames until follow-up combo hit fires
    this._comboFollowHits  = 0; // queued follow-up hits remaining

    // BehaviorModel integration
    this._behaviorModel  = new BehaviorModel();
    this._bmPrevSnap     = null;   // { onGround, vx, vy } snapshot of target last tick
    this._bmActivePunish = null;   // pending outcome check: { route, hpSnap, checkFrame }

    // Derived intelligence score
    const _dm = this.aiMemory;
    this.intelligence = (_dm.aggression + _dm.defense + _dm.spacing + _dm.reactionSpeed) / 4;

    // Aura RGB: orange/gold at start (hard-bot level)
    this._auraR     = 255;
    this._auraG     = 200;
    this._auraB     = 0;
    this._auraPhase = 0;
  }

  // Event recording
  _recordEvent(type, weight) {
    this._eventBuffer.push({ type, weight, frame: frameCount });
    if (this._eventBuffer.length > 280) this._eventBuffer.shift();
  }

  _countRecent(type, windowFrames) {
    const cutoff = frameCount - windowFrames;
    return this._eventBuffer.filter(e => e.type === type && e.frame >= cutoff).length;
  }

  // Per-frame adaptation tick, called from update()
  _tickAdaptation() {
    // Punish outcome check.
    // Runs ~22 frames after a punish fires; records whether it landed.
    if (this._bmActivePunish && typeof frameCount !== 'undefined' &&
        frameCount >= this._bmActivePunish.checkFrame) {
      const _ap = this._bmActivePunish;
      this._bmActivePunish = null;
      const _at = this.target;
      if (_at) this._behaviorModel.recordPunish(_ap.route, _at.health < _ap.hpSnap - 1);
    }

    const t = this.target;

    // Detect hits landed on player
    if (t && t.health >= 0) {
      const curTgtHp = t.health;
      if (curTgtHp < this._prevTargetHealth && this._prevTargetHealth < Infinity) {
        this._recordEvent('hit_landed', 10);
        // Instant reward: more aggression, fight even closer.
        // Steps are small. Big steps pinned every dial at its limit within seconds.
        this.aiMemory.aggression = Math.min(1, this.aiMemory.aggression + 0.004);
        this.aiMemory.spacing    = Math.max(0, this.aiMemory.spacing    - 0.003);
        if (this._comboTimer > 0) {
          this._comboCount++;
          if (this._comboCount >= 2) {
            this._recordEvent('combo_landed', 15);
            this.aiMemory.aggression = Math.min(1, this.aiMemory.aggression + 0.006);
          }
        } else {
          this._comboCount = 1;
        }
        this._comboTimer = 70;
      }
      this._prevTargetHealth = curTgtHp >= 0 ? curTgtHp : 0;
    }
    if (this._comboTimer > 0) this._comboTimer--;
    else this._comboCount = 0;

    // Damage taken makes him faster, not more cautious.
    const curHp = this.health;
    if (curHp < this._prevHealth && this._prevHealth > 0) {
      this._recordEvent('dmg_taken', -10);
      // Only a punish (damage mid-swing or in recovery) argues for less aggression. Neutral hits don't.
      const _committed = this.attackTimer > 0 || this.attackEndlag > 0;
      if (_committed) this._recordEvent('dmg_punished', -12);
      // Sharpen reaction, don't open spacing.
      this.aiMemory.reactionSpeed = Math.min(1, this.aiMemory.reactionSpeed + 0.005);
      this.aiMemory.defense       = Math.min(1, this.aiMemory.defense       + 0.004);
      if (_committed) this.aiMemory.aggression = Math.max(0.35, this.aiMemory.aggression - 0.006);
      if (this._countRecent('dmg_taken', 90) >= 3) {
        this._recordEvent('being_comboed', -15);
        // Comboed: spike reaction speed, pull spacing back a little.
        this.aiMemory.reactionSpeed = Math.min(1, this.aiMemory.reactionSpeed + 0.010);
        this.aiMemory.defense       = Math.min(1, this.aiMemory.defense       + 0.009);
        this.aiMemory.spacing       = Math.min(0.55, this.aiMemory.spacing    + 0.012);
      }
    }
    this._prevHealth = curHp >= 0 ? curHp : 0;

    // Periodic batch adaptation
    this._adaptTick++;
    if (this._adaptTick >= this._adaptInterval) {
      this._adaptTick = 0;
      this._applyAdaptation();
    }

    // Derive overall intelligence
    const m = this.aiMemory;
    this.intelligence = (m.aggression + m.defense + (1 - m.spacing) * 0.5 + m.reactionSpeed) / 3.5;
    this.intelligence = Math.min(1, Math.max(0, this.intelligence));

    this._updateAuraColor();
  }

  // Batch adaptation
  _applyAdaptation() {
    this._adaptCycles++;
    const m      = this.aiMemory;
    const cutoff = frameCount - 180;
    const recent = this._eventBuffer.filter(e => e.frame >= cutoff);

    const hitsLanded   = recent.filter(e => e.type === 'hit_landed').length;
    const combosLanded = recent.filter(e => e.type === 'combo_landed').length;
    const dmgTaken     = recent.filter(e => e.type === 'dmg_taken').length;
    const beingComboed = recent.filter(e => e.type === 'being_comboed').length;
    const deaths       = recent.filter(e => e.type === 'death').length;
    const dodges       = recent.filter(e => e.type === 'dodge').length;

    // Learning rate: small steps. Dials ease toward a target instead of accumulating.
    // Accumulating (m.x += k) gets re-counted by ~22 batches per hit, so ease toward a target instead.
    const RATE = 0.05;                 // ~2.7s to close most of a gap at 7.5 cyc/s

    // Rest point is this fighter's own starting profile, not module defaults (Sovereign boosts survive).
    if (!this._memBaseline) this._memBaseline = { ...m };
    const B = this._memBaseline;

    const ease = (k, target, lo, hi) => {
      const tgt = Math.max(lo, Math.min(hi, target));
      m[k] += (tgt - m[k]) * RATE;
    };
    // Self-term is tanh-squashed into a budget, so the opponent offset still matters at the ceiling.
    const _oppAdapt = (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && (SMK2_TUNE.oppAdapt || SMK2_TUNE.adaptV2));
    const SQ = (x, cap) => _oppAdapt ? cap * Math.tanh(x / cap) : x;

    // Evidence, as signed pressures rather than one-way triggers.
    const punished = recent.filter(e => e.type === 'dmg_punished').length;
    const winning  = hitsLanded + combosLanded * 1.5;
    const losing   = dmgTaken + beingComboed * 2 + deaths * 3;

    // Aggression follows punishment, not scoreline. Net score alone caused a retreat spiral after every hit.
    const pressure = punished * 1.6 + deaths * 2.5;

    // Opponent-conditioned offsets
    // The dials above are self-referential. Without an opponent term, every opponent converges to the same answer.
    // _oppAdaptTerms() gives bounded offsets from the opponent's reach, speed, endlag and mix. Others get none.
    const O = (typeof this._oppAdaptTerms === 'function' && this._oppAdaptTerms()) || null;
    const OT = k => (O && typeof O[k] === 'number' && isFinite(O[k])) ? Math.max(-0.35, Math.min(0.35, O[k])) : 0;

    // Target saturation probe (SMK2_TUNE.dialProbe): records pre-clamp target and offset size.
    if (typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE.dialProbe) {
      const _T = this._targProbe || (this._targProbe = { n: 0, tgt: 0, over: 0, ot: 0, otNonZero: 0 });
      const _raw = B.aggression + winning * 0.05 - pressure * 0.09 + OT('aggression');
      _T.n++; _T.tgt += _raw; if (_raw >= 1) _T.over++;
      _T.ot += Math.abs(OT('aggression')); if (OT('aggression') !== 0) _T.otNonZero++;
    }
    ease('aggression', B.aggression + SQ(winning * 0.05 - pressure * 0.09, 0.18) + OT('aggression'), 0.55, 1);

    // Defense: bought when hit, relaxed when not.
    ease('defense', B.defense + SQ(losing * 0.10 - (dmgTaken === 0 ? 0.12 : 0)
                    + dodges * 0.02, 0.18) + OT('defense'), 0.30, 1);

    // Spacing tightens under pressure. It opens only when his approach is what gets punished.
    ease('spacing', B.spacing + SQ(-winning * 0.03 + pressure * 0.05, 0.12) + OT('spacing'), 0, 0.34);

    // Reaction speed is evidence-driven only. No unconditional drift.
    ease('reactionSpeed', B.reactionSpeed + SQ(losing * 0.05, 0.15) + OT('reactionSpeed'), 0.45, 1);

    // Clamp all to [0, 1]
    for (const k of Object.keys(m)) m[k] = Math.max(0, Math.min(1, m[k]));

    if (adaptiveAIDebug) logAIChanges();
  }

  // Called on death
  onDeath() {
    this._recordEvent('death', -20);
    this._applyAdaptation();
    // Fresh read on respawn
    this._punishTimer         = 0;
    this._counterWindowOpen   = false;
    this._prevPlayerAttacking = false;
    this._prevPlayerAirborne  = false;
    this._prevPlayerAtk       = 0;
  }

  // Aura color: blue, cyan, yellow, orange, red
  _updateAuraColor() {
    const i = this.intelligence;
    if (i < 0.25) {
      const t2 = i * 4;
      this._auraR = Math.round(40  + t2 * 0);
      this._auraG = Math.round(80  + t2 * 40);
      this._auraB = 255;
    } else if (i < 0.5) {
      const t2 = (i - 0.25) * 4;
      this._auraR = Math.round(0   + t2 * 255);
      this._auraG = Math.round(200 + t2 * 20);
      this._auraB = Math.round(255 - t2 * 180);
    } else if (i < 0.75) {
      const t2 = (i - 0.5) * 4;
      this._auraR = 255;
      this._auraG = Math.round(220 - t2 * 130);
      this._auraB = 0;
    } else {
      const t2 = (i - 0.75) * 4;
      this._auraR = 255;
      this._auraG = Math.round(90  - t2 * 90);
      this._auraB = 0;
    }
  }

  // Tick adaptation every physics frame
  update() {
    this._tickAdaptation();
    super.update();
  }

  // Garou AI: reads moves, punishes mistakes, never backs down
  updateAI() {
    if (this.aiReact > 0) { this.aiReact--; return; }
    if (this.ragdollTimer > 0 || this.stunTimer > 0) return;

    const t = this.target;
    if (!t || t.health <= 0) return;

    const m = this.aiMemory;

    // ── BehaviorModel: observe target this tick ───────────────────
    // BehaviorModel: observe target every tick, even on early return.
    const _bmObs = this._behaviorModel.observe(t, this._bmPrevSnap);
    this._bmPrevSnap = { onGround: t.onGround, vx: t.vx, vy: t.vy };

    // Pattern tracking: edge-detect player inputs.
    const playerAttacking = t.attackTimer > 0;
    if (playerAttacking && !this._prevPlayerAttacking) {
      this._recordEvent('player_attack', 0);
    }
    this._prevPlayerAttacking = playerAttacking;

    const playerAirborne = !t.onGround;
    if (playerAirborne && !this._prevPlayerAirborne) {
      this._recordEvent('player_jump', 0);
    }
    this._prevPlayerAirborne = playerAirborne;

    // Punish window: player just finished a swing.
    const playerJustWhiffed = this._prevPlayerAtk > 0 && t.attackTimer === 0;
    this._prevPlayerAtk = t.attackTimer;
    if (playerJustWhiffed) this._counterWindowOpen = true;
    if (this._baitCooldown > 0) this._baitCooldown--;
    if (this._comboFollowTimer > 0) this._comboFollowTimer--;

    // Short-window reactive boosts
    const recentTaken  = this._countRecent('dmg_taken',    90);
    const recentLanded = this._countRecent('hit_landed',   90);
    const recentPAtks  = this._countRecent('player_attack', 150);
    const recentPJumps = this._countRecent('player_jump',   150);

    const microDef = recentTaken  >= 2 ? 0.32 : recentTaken  >= 1 ? 0.16 : 0;
    const microAgg = recentLanded >= 2 ? 0.22 : recentLanded >= 1 ? 0.11 : 0;

    const effAgg = Math.min(1, m.aggression + microAgg);
    const effDef = Math.min(1, m.defense    + microDef);

    // Garou never drops below a lethal aggression floor
    const GAROU_FLOOR = 0.70;
    const realAgg = Math.max(GAROU_FLOOR, effAgg);

    // spacing 0..1 maps to 25..110px: always close, never far
    const prefDist    = 25  + m.spacing * 85;
    const moveSpd     = 3.6 + realAgg  * 2.4;  // 3.6..6.0
    const atkFreq     = 0.40 + realAgg * 0.58; // 0.40..0.98
    const reactFrames = Math.max(0, Math.round(4 - m.reactionSpeed * 4)); // 4..0

    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = Math.sign(dx);
    const atkRange = this.weapon.range * 1.1 + 20;

    // Danger: boss beams
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

    // Danger: lava proximity
    if (currentArena && currentArena.hasLava && currentArena.lavaY) {
      if ((currentArena.lavaY - (this.y + this.h)) < 80 && this.onGround) {
        this.vx = this.cx() < GAME_W / 2 ? 6 : -6;
        this.vy = -18;
        return;
      }
    }

    // Edge guard
    const nearLeft  = this.x < 50;
    const nearRight = this.x + this.w > GAME_W - 50;

    // BehaviorModel: predict and bias
    const _bmPred = this._behaviorModel.predictNext(_bmObs.action, _bmObs.context);
    const _bmBias = this._behaviorModel.computeBias(_bmObs.action, _bmPred);

    // Pre-dodge: step back before the swing starts, so we're at whiff range when it fires.
    if (_bmBias.preDodgeFrames > 0 && !playerAttacking && this.cooldown <= 0) {
      const _pdDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
      if (this.onGround && !this.isEdgeDanger(_pdDir)) {
        this.vx      = _pdDir * moveSpd * 1.5;
        this.aiReact = _bmBias.preDodgeFrames;
        this._recordEvent('dodge', 4);
        return;
      }
    }

    // Counter-attack: punish a whiff.
    // Read the attack, dodge it, punish immediately.
    if (playerAttacking && d < 160) {
      const dodgeRoll = Math.random();
      if (dodgeRoll < effDef * 0.88 * Math.min(1.45, _bmBias.dodgeBoost)) {
        const dDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        if (this.onGround && !this.isEdgeDanger(dDir)) {
          // Dash back out of range
          this.vx = dDir * moveSpd * 2.2;
        } else if (this.onGround) {
          // Cornered: jump over them
          this.vy = -19;
          this.vx = dir * moveSpd * 0.8;
        } else if (this.canDoubleJump) {
          this.vy = -16;
          this.canDoubleJump = false;
        }
        this.shielding = false;
        this._recordEvent('dodge', 5);
        this._punishTimer = 6; // 6 AI ticks until counter fires
        this.aiReact = Math.max(1, reactFrames);
        return;
      }
      // Didn't dodge: shield if timing is still good
      // Gate scaled to the SovereignMK2 dial gate, since a constant tuned for 0.88 is unreachable at 0.60.
      const _defGate = (typeof this._dialGate === 'function') ? this._dialGate(0.682) : 0.60;
      if (effDef > _defGate && this.shieldCooldown === 0 && Math.random() < 0.40) {
        this.shielding     = true;
        this.shieldCooldown = typeof SHIELD_CD !== 'undefined' ? SHIELD_CD : 450;
        this._recordEvent('dodge', 3);
        combatAfter(17, () => { this.shielding = false; });
        return;
      }
    } else {
      this.shielding = false;
    }

    // Punish: close and strike after a dodge
    if (this._punishTimer > 0) {
      this._punishTimer--;
      // Sprint toward them during the punish window
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.9;
      if (this._punishTimer === 0) {
        // Strike using the best route from the punish ledger
        const _pRoute = this._behaviorModel.bestPunishRoute();
        if (this.cooldown <= 0 && d < this.weapon.range * 1.5 + 35) {
          if (_pRoute === 'crossup' && this.onGround && d < 90) {
            // Jump over target: airborne follow-up fires on the next close pass
            this.vy = -19;
            this.vx = dir * moveSpd * 1.2;
          } else {
            // 'direct': swing now. 'delayed': short timing-trip delay.
            if (_pRoute === 'delayed') this.aiReact = Math.max(2, reactFrames + 3);
            this.attack(t);
            this._counterWindowOpen = false;
            // Schedule outcome check 22 frames from now
            this._bmActivePunish = {
              route     : _pRoute,
              hpSnap    : t.health,
              checkFrame: frameCount + 22,
            };
          }
        }
      }
      return; // committed to punish
    }

    // Instant counter on player whiff (no punish timer delay)
    if (this._counterWindowOpen && d < this.weapon.range * 1.6 + 40 && this.cooldown <= 0) {
      if (!this.isEdgeDanger(dir)) this.vx = dir * moveSpd * 1.6;
      this.attack(t);
      this._counterWindowOpen = false;
      this.aiReact = 0; // no reaction delay for read counters
      return;
    }
    this._counterWindowOpen = false;

    // Combo follow-up
    // After landing a hit, queue immediate follow-up strikes
    if (this._comboFollowTimer === 0 && this._comboFollowHits > 0 && this.cooldown <= 0 && d < atkRange * 1.2) {
      this._comboFollowHits--;
      this.attack(t);
      this._comboFollowTimer = Math.max(6, Math.round(8 - m.reactionSpeed * 4));
      return;
    }

    // Pattern anticipation and bait
    // Player jumps frequently → stay airborne too; predict aerial exchanges
    if (recentPJumps >= 3 && !this.onGround && this.canDoubleJump && Math.random() < 0.38) {
      this.vy = -15;
      this.canDoubleJump = false;
    }
    // Player attacks rapidly → pre-position at punish range
    if (recentPAtks >= 4 && d < prefDist + 60 && d > prefDist) {
      this.vx *= 0.80;
    }

    // Bait: stand still at punish range
    // Triggers at moderate intelligence; if player bites, dodge + punish harder
    if (this._baitTimer > 0) {
      this._baitTimer--;
      this.vx = 0;
      if (playerAttacking && d < 160) {
        // Player took the bait: dodge aggressively
        this._baitTimer = 0;
        this._baitCooldown = 280;
        this._baitCount++;
        this._baitIgnoredStreak = 0;
        const dDir = (nearLeft && dir < 0) ? 1 : (nearRight && dir > 0) ? -1 : -dir;
        if (this.onGround && !this.isEdgeDanger(dDir)) {
          this.vy = -20;  // jump-cancel away
          this.vx = dDir * moveSpd * 2.6;
        }
        this._punishTimer = 4; // immediately punish
        this._recordEvent('dodge', 8);
      } else if (this._baitTimer === 0) {
        // Bait expired untaken. Without a cooldown, baits chain against a disciplined player and the AI stands at range doing nothing.
        this._baitIgnoredStreak++;
        this._baitCooldown = Math.max(this._baitCooldown, 160 + this._baitIgnoredStreak * 80);
      }
      return;
    }
    // Low player health: finish them
    const finishMode = t.health < t.maxHealth * 0.30;

    // Activate bait: only at decent intelligence, not finishing, not in punish
    const canBait = this.intelligence > 0.50 && this._baitCooldown === 0 && !finishMode && d < 140 && d > prefDist * 0.8;
    if (canBait && Math.random() < (0.004 + this.intelligence * 0.006) * _bmBias.baitBoost / (1 + this._baitIgnoredStreak)) {
      this._baitTimer = Math.round(18 + this.intelligence * 20); // 18-38 frames
    }

    // Movement: always pressure, never retreat
    if (d > atkRange + 15 || finishMode) {
      // Outside range or finishing: always close the gap.
      if (nearLeft  && dir < 0) { /* edge guard, do nothing */ }
      else if (nearRight && dir > 0) { /* edge guard */ }
      else {
        // Lead the target by 8 frames.
        const _proj    = this._behaviorModel.projectPosition(t, 8);
        const _projDir = Math.sign(_proj.x - this.cx()) || dir;
        // Trust the projection only if it agrees with direction, or we're very close (under 60px).
        const _aDir    = (Math.sign(_projDir) === dir || d < 60) ? _projDir : dir;
        this.vx = _aDir * moveSpd * (finishMode ? 1.3 : 1.0) * _bmBias.approachBoost;
      }
      // Jump to reach player on higher platform
      if (this.onGround && t.y < this.y - 55 && Math.random() < 0.18) {
        this.vy = -19;
      } else if (this.canDoubleJump && this.vy > 0 && t.y < this.y - 45) {
        this.vy = -15; this.canDoubleJump = false;
      }
    } else if (d < prefDist - 15) {
      // Slightly inside preferred gap: small side step, never a real retreat.
      if (Math.random() < 0.25 && !this.isEdgeDanger(-dir)) {
        this.vx = -dir * moveSpd * 0.3;
      } else {
        this.vx *= 0.88;
      }
    } else {
      // In range: hold with slight drift.
      this.vx *= 0.90;
      // Occasional hop to stay unpredictable
      if (this.onGround && Math.random() < 0.05) this.vy = -16;
    }

    // Attack: frequent and aggressive
    if (d < atkRange && this.cooldown <= 0) {
      if (Math.random() < atkFreq) {
        this.attack(t);
        // Queue combo follow-ups based on intelligence
        const comboHits = Math.floor(this.intelligence * 3.5); // 0-3 follow-up hits
        if (comboHits > 0 && this._comboFollowHits === 0) {
          this._comboFollowHits = comboHits;
          this._comboFollowTimer = Math.max(6, Math.round(10 - m.reactionSpeed * 5));
        }
      }
    }
    // Immediate attack if player walks into range mid-movement
    if (d < atkRange * 0.85 && this.cooldown <= 0 && Math.random() < 0.55) {
      this.attack(t);
    }

    // Ability and super
    const abiChance = 0.05 + realAgg * 0.09;
    if (this.abilityCooldown <= 0 && d < 280 && Math.random() < abiChance) {
      this.ability(t);
    }
    const superChance = finishMode ? 0.55 : 0.18 + realAgg * 0.22;
    if (this.superReady && Math.random() < superChance) this.useSuper(t);
    if (this.health < 22 && this.superReady) this.useSuper(t); // emergency super

    this.aiReact = reactFrames;
  }

  // Draw override: aura behind the fighter
  draw() {
    // Aura and ADAPTING label skip the invisibility check of Fighter.draw(), so they're hidden here too.
    if (this._trialInvisible) { super.draw(); return; }
    this._auraPhase = (this._auraPhase + 0.055) % (Math.PI * 2);

    if (this.intelligence > 0.04 && this.health > 0) {
      const auraAlpha  = 0.12 + this.intelligence * 0.30;
      const auraRadius = 26   + this.intelligence * 22 + Math.sin(this._auraPhase) * 4;
      const r = this._auraR, g = this._auraG, b = this._auraB;

      ctx.save();
      // Sovereign gets the ring only: the filled orb hid his body and his wind-ups.
      if (!this.isSovereignMK2) {
        const grd = ctx.createRadialGradient(
          this.cx(), this.cy(), 4,
          this.cx(), this.cy(), auraRadius
        );
        grd.addColorStop(0,   `rgba(${r},${g},${b},${Math.min(1, auraAlpha * 2.2).toFixed(2)})`);
        grd.addColorStop(0.5, `rgba(${r},${g},${b},${auraAlpha.toFixed(2)})`);
        grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(this.cx(), this.cy(), auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pulsing ring at higher intelligence
      if (this.intelligence > 0.55) {
        const ringAlpha = (this.intelligence - 0.55) * 1.8 *
                          (0.35 + 0.30 * Math.sin(this._auraPhase * 2.5));
        ctx.strokeStyle = `rgba(${r},${g},${b},${ringAlpha.toFixed(2)})`;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(this.cx(), this.cy(), auraRadius * 0.82, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Particle sparks at near-max intelligence
      if (this.intelligence > 0.80 && Math.random() < 0.25) {
        const angle  = Math.random() * Math.PI * 2;
        const dist2  = auraRadius * (0.6 + Math.random() * 0.4);
        spawnParticles(
          this.cx() + Math.cos(angle) * dist2,
          this.cy() + Math.sin(angle) * dist2,
          `rgb(${r},${g},${b})`, 1
        );
      }

      ctx.restore();
    }

    super.draw();

    // "ADAPTING" label (not on Sovereign: he shows no overhead labels)
    if (this.intelligence > 0.35 && this.health > 0 && !this.isSovereignMK2) {
      ctx.save();
      const r = this._auraR, g = this._auraG, b = this._auraB;
      const alpha = 0.35 + this.intelligence * 0.55;
      ctx.font      = `bold ${6 + Math.round(this.intelligence * 3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
      ctx.fillText('◈ ADAPTING', this.cx(), this.y - 14);
      ctx.restore();
    }
  }
}

// Debug overlay: screen space, after the HUD
function drawAdaptiveAIDebug() {
  if (!adaptiveAIDebug || !gameRunning) return;
  const ai = (typeof players !== 'undefined') && players.find(p => p.isAdaptive);
  if (!ai) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const scale  = canvas.width / 900;
  const px     = canvas.width - Math.round(170 * scale);
  const py     = Math.round(14 * scale);
  const bw     = Math.round(140 * scale);
  const bh     = Math.round(9   * scale);
  const gap    = Math.round(15  * scale);
  const fSize  = Math.max(7, Math.round(8 * scale));

  const labels = ['Aggression',    'Defense',   'Spacing',   'Reaction Spd'];
  const keys   = ['aggression',    'defense',   'spacing',   'reactionSpeed'];
  const colors = ['#ff6644',       '#44aaff',   '#44ff88',   '#ffdd00'];

  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  const panelH = gap * 4 + bh + Math.round(18 * scale);
  const panelX = px - Math.round(10 * scale);
  const panelW = bw + Math.round(20 * scale);
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(panelX, py - Math.round(4 * scale), panelW, panelH, Math.round(6 * scale));
  } else {
    ctx.rect(panelX, py - Math.round(4 * scale), panelW, panelH);
  }
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fSize}px monospace`;

  keys.forEach((k, i) => {
    const v   = ai.aiMemory[k];
    const y   = py + i * gap;
    const yMid = y + bh * 0.5;

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(px, y, bw, bh);
    ctx.fillStyle = colors[i];
    ctx.fillRect(px, y, Math.round(bw * v), bh);
    ctx.fillStyle = '#ddd';
    ctx.fillText(`${labels[i]}: ${(v * 100).toFixed(0)}%`, px, y + bh + Math.round(5 * scale));
  });

  const r = ai._auraR, g = ai._auraG, b = ai._auraB;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.font = `bold ${fSize}px monospace`;
  ctx.fillText(
    `Intelligence: ${(ai.intelligence * 100).toFixed(0)}%  [cycle ${ai._adaptCycles}]`,
    px,
    py + gap * 4 + bh + Math.round(9 * scale)
  );

  ctx.restore();
}
