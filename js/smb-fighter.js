'use strict';

// ============================================================
// FIGHTER
// ============================================================
class Fighter {
  constructor(x, y, color, weaponKey, controls, isAI, aiDifficulty) {
    this.x = x; this.y = y;
    this.w = 34; this.h = 84;
    // Read by VerletRagdoll (smb-verlet.js) so the death rig matches the figure.
    this.headR = FIG_HEAD_R;
    this.vx = 0; this.vy = 0;
    this.color       = color;
    this.weaponKey   = weaponKey;
    this.weapon      = (weaponKey && weaponKey.startsWith('_custom_') && window.CUSTOM_WEAPONS && window.CUSTOM_WEAPONS[weaponKey])
                       ? window.CUSTOM_WEAPONS[weaponKey]
                       : WEAPONS[weaponKey];
    this.controls    = controls;
    this.isAI        = isAI || false;
    this.aiDiff      = aiDifficulty || 'medium';
    this.health      = 150;
    this.maxHealth   = 150;
    this.lives       = chosenLives;
    this.kills           = 0;
    this.totalDamageDealt = 0;
    this.onGround    = false;
    this.cooldown    = 0;
    this.cooldown2   = 0;
    this.abilityCooldown  = 0;
    this.abilityCooldown2 = 0;
    this.invincible  = 0;
    this.shielding   = false;
    this.spinning    = 0;
    this.facing      = 1;
    this.state       = 'idle';
    this.attackTimer = 0;
    this.attackDuration = 12;
    this.attackEndlag = 0;    // recovery frames after swing; player can't attack or ability
    this.hurtTimer    = 0;
    this.stunTimer    = 0;   // frames unable to act (stars spin overhead)
    this.ragdollTimer = 0;   // frames of limp physics (flailing limbs)
    this.weaponHit    = false; // has weapon tip dealt damage this swing?
    this.boostCooldown   = 0;  // ability cooldown (legacy field)
    this.shieldCooldown      = 0;  // legacy field kept for compatibility — always 0 now
    this.shieldHoldTimer     = 0;  // frames S is held this activation
    this.shieldStacks        = 0;  // consecutive activations since last full recharge
    this.shieldRechargeTimer = 0;  // frames until stacks reset to 0 (recharge)
    this.shieldHP            = 0;  // remaining HP for current HP-based shield tier (stacks 1-3)
    this.shieldBroken        = false; // true while shield is broken and awaiting re-press
    this.canDoubleJump   = false; // allows one double-jump after leaving ground
    this.superMeter      = 0;    // 0-100 super charge
    this.superReady      = false; // true when super is fully charged
    this.superFlashTimer = 0;    // countdown for "SUPER!" text above player
    this.stamina         = 100;  // 0-100 stamina; drains on attack, regens over time
    this.maxStamina      = 100;
    this.superChargeRate = 1.0;  // base rate; boss overrides higher
    this.charClass      = 'none';
    this.classSpeedMult = 1.0;
    this.rageStacks     = 0;
    this.godmode        = false;
    this.backstageHiding = false;
    this.classPerkUsed   = false;  // one-time class passive; resets each life
    this.spartanRageTimer = 0;     // Kratos: frames of +50% damage boost
    this.noCooldownsActive = false;
    this.lavaBurnTimer = 0;
    this.contactDamageCooldown = 0; // frames between passive weapon contact hits
    this.ragdollAngle    = 0;    // accumulated spin angle during ragdoll
    this.ragdollSpin     = 0;    // angular velocity (rad/frame) for ragdoll tumble
    this._rd          = null;    // per-limb ragdoll state (PlayerRagdoll system)
    this.animTimer    = 0;
    this._speedBuff   = 0;
    this._powerBuff   = 0;
    this._domainSlowFactor = 1;   // <1 = caught in ninja Shadow Realm time dilation
    this._domainSlowAccum  = 0;   // fractional-tick accumulator for the slow
    this._maxLives       = chosenLives; // for correct heart display
    this.onePunchMode    = false;       // training: kills anything in one hit
    this.swingHitTargets = new Set();   // tracks targets hit in current swing (multi-hit)
    this._lastTapLeft    = -999;        // frame of last left-key tap (story dodge detection)
    this._lastTapRight   = -999;
    this._lastTapUp      = -999;
    this.target          = null;
    this.aiState     = 'chase';
    this.aiReact     = 0;
    this.squashTimer   = 0;  // frames of landing squash animation
    this.aiNoHitTimer  = 0;  // frames bot has been attacking without landing a hit
    // ---- NO-IDLE SYSTEM ----
    this.intent          = 'pressure'; // 'pressure'|'reposition'|'bait'|'retreat'
    this._intentTimer    = 0;          // AI ticks until next intent re-evaluation
    this._inactiveTime   = 0;          // AI ticks since last meaningful action
    this._microRandTimer = 0;          // countdown to next micro-randomization pulse
    this._playerIdleTmr  = 0;         // AI ticks the target has been idle
    this.storyFaction    = null;       // 'enemy' for story opponent bots; used to prevent ally targeting
    this._megaJumping    = false;
    this._megaJumpLanded = false;
    this._megaSmashing   = false;
    this._spawnFalling   = false; // megaknight: falls from sky on spawn
    this._fallStartY     = null;  // Y when megaknight left ground (for fall-height damage)
    this._wanderDir    = 1;  // direction for wander state
    this._wanderTimer  = 0;  // frames left in wander state
    this.coyoteFrames  = 0;  // frames after walking off a platform where ground jump is still allowed
    this._lavaJumpGrace = 0; // frames after a lava bounce where a full ground jump is allowed
    this._prevOnGround = false; // previous frame ground state (for coyote time)
    this._stateChangeCd = 0; // frames before AI can switch aiState again (human-like hesitation)
    this.personality    = null; // 'aggressive'|'defensive'|'trickster'|'sniper' — set when spawned as bot
    this._pendingAction    = null;  // { action: string, timer: int } — queued decision pending reaction delay
    this._actionLockFrames = 0;     // frames bot is committed to current action (no re-evaluation)
    this.inputBuffer       = [];    // queued inputs: 'attack'|'jump'|'ability' (drained once per frame)
    this._ammo        = this.weapon && this.weapon.clipSize ? this.weapon.clipSize : 0;
    this._reloadTimer = 0;  // countdown to reload complete; 0 = ready
    this.spawnX      = x;
    this.spawnY      = y;
    this.name        = '';
    this.playerNum   = 1;
    this.expressionState = 'neutral'; // 'neutral'|'cool'|'focused'|'intense'|'serene'
    // ── Anti-kite system ─────────────────────────────────────────────────────
    this._kiteTimer     = 0;   // frames of continuous high-speed movement
    this._kiteSpeedMult = 1.0; // applied in processInput; decays toward 0.70 over 8s
    // ── Ranged weapon state ───────────────────────────────────────────────────
    this._rangedBurstTimer = 0; // frames since last ranged attack (resets on pause)
    this._rangedMovePenalty = 0; // frames of post-burst speed debuff remaining
    this._rangedCommitTimer = 0; // short post-shot commitment window
    this._rangedShotHeat    = 0; // repeated-fire recoil / inaccuracy scaler
    this._recentRangedUse   = 0; // AI / boss response signal
    this._reloadInterrupted = false;
    this._rangedRecoilKick  = 0; // visual / movement recoil after firing
    // ── Bot ranged AI state ───────────────────────────────────────────────────
    this._rangedStrafeDir   = 1;   // current strafe direction
    this._rangedStrafeTimer = 0;   // frames until next strafe direction flip
    this._rangedAimPause    = 0;   // frames spent aiming (standing still for accuracy)
    // ── AI Intent buffer ─────────────────────────────────────────────────────
    // Written by AI systems each tick; consumed by applyAIIntent().
    // null between ticks (AI cleared it) or { vx, vy, jump } when pending.
    this._aiIntent = null;
    this._damageAccumThisLife = 0; // cumulative damage taken since last respawn — drives degradation visuals
    this._degradeVisual       = 0; // eased mirror of the accumulator — what draw() actually renders
    this._lastHealthSeen      = this.health; // per-frame health watcher; any rise = a heal, which closes wounds
    this._boomOrbit      = null;
    this._thrownAxe      = null;
    this._shockBolt      = null;
    this._elecZones      = [];
    this._thunderStrikes = null;
    this._thunderTimer   = 0;
    this._chainArcs      = [];
    this._hammerShock    = null;
    this._broomRide      = null;
    this._scytheToss     = null;
    this._paperPlanes    = [];
    this._familiar        = null;
    this._familiarTimer   = 0;
    this._familiarRespawn = 0;
    this._familiarEverSpawned = false;
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  _isInvalidAITarget(candidate) {
    return !candidate || candidate === this || candidate.health <= 0 ||
      (candidate.godmode === true) ||
      (typeof areAlliedEntities === 'function' && areAlliedEntities(this, candidate));
  }

  _acquireAITarget() {
    // In training mode, entities in players[] (e.g. p2 bot) should only target
    // other players[], not trainingDummies — otherwise bots attack the ForestBeast
    // instead of their actual opponent.
    const pool = (trainingMode && players.includes(this))
      ? [...players]
      : [...players, ...trainingDummies, ...minions];
    // Never acquire an ally. This filter is what stops a boss and the minions it
    // summoned from turning on each other during the player's respawn window: the
    // pool is "everything alive", so with the player gone the nearest entity to a
    // minion is the boss that spawned it. areAlliedEntities() reads the same
    // _teamId / storyFaction stamps dealDamage() already honours, so nothing that
    // was previously a legal target stops being one.
    // The rule is absolute: no fallback to an ally when nothing else is alive.
    // A "don't strand the AI" fallback here would re-select the boss for its own
    // minion during the player's respawn window — exactly the case this filter
    // exists to fix. A minion standing still for two seconds is correct; a minion
    // duelling the boss that summoned it is not.
    const living = pool.filter(q => !this._isInvalidAITarget(q) &&
      !(typeof areAlliedEntities === 'function' && areAlliedEntities(this, q)));
    if (!living.length) { this.target = null; return this.target; }

    // Player-priority: if any player is within 350 px, always pick the nearest one.
    // Beyond that range, target the nearest entity regardless of type.
    const _PLAYER_PRIO_RANGE = 350;
    const nearPlayers = living.filter(q =>
      Array.isArray(players) && players.includes(q) &&
      Math.hypot(q.cx() - this.cx(), q.cy() - this.cy()) < _PLAYER_PRIO_RANGE
    );
    const candidates = nearPlayers.length > 0 ? nearPlayers : living;
    this.target = candidates.reduce((a, b) =>
      Math.hypot(b.cx() - this.cx(), b.cy() - this.cy()) <
      Math.hypot(a.cx() - this.cx(), a.cy() - this.cy()) ? b : a
    );
    return this.target;
  }

  respawn() {
    // Restore size if Axiom resized this fighter — must happen before spawn position calc
    if (typeof tfSizeTargets !== 'undefined' && tfSizeTargets.has(this)) {
      const orig = tfSizeTargets.get(this);
      this.w = orig.w; this.h = orig.h;
      tfSizeTargets.delete(this);
      this.tfDrawScale = 1;
      this.drawScale   = 1;
    }
    // Always re-pick a safe platform — this handles moving/disappearing boss floor
    if (currentArena && typeof pickSafeSpawn === 'function') {
      const sideHint = this.playerNum === 2 ? 'right' : 'left';
      const newSpawn = pickSafeSpawn(sideHint);
      if (newSpawn) { this.spawnX = newSpawn.x; this.spawnY = newSpawn.y; }
      else if (currentArena.isBossArena) {
        // Floor was removed — use screen centre at a safe height so player can reach a platform
        this.spawnX = GAME_W / 2;
        this.spawnY = GAME_H * 0.38;
      }
    }
    // Cancel any authored death performance before the body is reused
    if (typeof DeathAnim !== 'undefined') DeathAnim.clear(this);
    this._hideWeapon = false;
    if (typeof animStrideReset === 'function') animStrideReset(this);
    this._smearPrev = null;
    this.x  = this.spawnX;
    this.y  = this.spawnY - this.h; // use actual height so spawn lands on platform regardless of scale
    this.vx = 0; this.vy = 0;
    this._dimPunchGravLock = false;
    this.health          = this.maxHealth; // always restore to full on respawn
    this.shielding           = false;
    this.spinning            = 0;
    this.ragdollTimer        = 0;
    this.stunTimer           = 0;
    this.weaponHit           = false;
    this.boostCooldown       = 0;
    this.shieldHoldTimer     = 0;
    this.shieldStacks        = 0;
    this.shieldRechargeTimer = 0;
    this.shieldHP            = 0;
    this.shieldBroken        = false;
    this._hammerSpin         = null;
    this._spearCharge        = null;
    this._axeWhirl           = null;
    this._swordSlashes       = [];
    this._swordSlashQueue    = [];
    this._comboSuper         = null;
    this._peaCluster         = null;
    this._gravityStone       = null;
    this._paperSwarm         = [];
    this._flailBall          = null;
    this._flailOrbit         = null;
    this._boomerangs         = [];
    this._boomOrbit          = null;
    this._thrownAxe          = null;
    this._shockBolt          = null;
    this._elecZones          = [];
    this._thunderStrikes     = null;
    this._thunderTimer       = 0;
    this._chainArcs          = [];
    this._hammerShock        = null;
    this._broomRide          = null;
    this._scytheToss         = null;
    this._paperPlanes        = [];
    this._shieldCharge       = null;
    // Nulling the reference alone orphaned the live familiar: it stayed in
    // minions[] and kept fighting while the next life spawned a fresh one, so a
    // Summoner accumulated one permanent extra body per death. Retire it first.
    this._despawnFamiliar();
    this._familiarTimer      = 0;
    this._familiarRespawn    = 0;
    // The familiar comes back with its summoner. Losing a stock is already the
    // punishment; making the class play its next 15 seconds with no perk at all
    // stacked a second one on top. `_familiarRespawn` is deliberately NOT cleared
    // here, so dying does not wash out the 10s an opponent earned by killing it.
    this._familiarEverSpawned = false;
    this._whipSlow           = 0;
    this._whipCrack          = null;
    this._whipRope           = null;
    this._whipBleed          = null;
    this._whipHooked         = 0;
    this._whipHookSrc        = null;
    this._whipCoil           = null;
    this._overcharged        = 0;
    this._counterStance      = 0;   // frames remaining in counter window
    this._counterAttacker    = null;
    this.canDoubleJump   = false;
    // superMeter / superReady intentionally NOT reset — supers carry over between lives
    // Domain: clear expansion state and reset counter so domain must be re-earned
    if (typeof DomainManager !== 'undefined') DomainManager.onFighterDied(this);
    this._domainSuperCount = 0;
    this._domainRising     = false;
    this.contactDamageCooldown = 0;
    this.ragdollAngle    = 0;
    this.ragdollSpin     = 0;
    if (this._rd) PlayerRagdoll.standUp(this);
    this.lavaBurnTimer   = 0;
    this._speedBuff      = 0;
    this._powerBuff      = 0;
    this._domainSlowFactor = 1;
    this._domainSlowAccum  = 0;
    this.classPerkUsed    = false;
    this.spartanRageTimer = 0;
    this._ammo        = this.weapon && this.weapon.clipSize ? this.weapon.clipSize : 0;
    this._reloadTimer = 0;
    this._rangedCommitTimer = 0;
    this._rangedShotHeat = 0;
    this._recentRangedUse = 0;
    this._reloadInterrupted = false;
    this._rangedRecoilKick = 0;
    this._damageAccumThisLife = 0;
    this._degradeVisual       = 0;
    this._lastHealthSeen      = this.health;
    this.invincible = 180; // 3 s of spawn protection — enough for a stable landing
    // Megaknight spawn animation: fall from sky
    if (this.charClass === 'megaknight') {
      this.y = -120;
      this.vy = 2;
      this._spawnFalling = true;
      this.invincible = 200;
      SoundManager.megaknightFall && SoundManager.megaknightFall();
    }
    if (this.isAI) {
      this.target = null;
      this.aiState = 'chase';
      this.intent = 'pressure';
      this.aiReact = 0;
      this._pendingAction = null;
      this._actionLockFrames = 0;
      this._stateChangeCd = 0;
      this._inactiveTime = 0;
      this._intentTimer = 0;
      this._wanderTimer = 0;
      this._comboPressTimer = 0;
      this.aiNoHitTimer = 0;
      this.inputBuffer.length = 0;
      this._acquireAITarget();
    }
    for (const ai of [...players, ...minions]) {
      if (ai && ai.isAI && typeof ai._isInvalidAITarget === 'function' && ai._isInvalidAITarget(ai.target)) {
        ai._acquireAITarget();
      }
    }
    spawnParticles(this.cx(), this.cy(), this.color, 22);
    // Online: notify remote that we respawned
    if (onlineMode && !this.isRemote && NetworkManager.connected) {
      NetworkManager.sendGameEvent('respawn', { x: this.x, y: this.y });
    }
  }

  // ---- UPDATE ----
  update() {
    // Remote player in online mode: skip local physics (state driven by network)
    if (this.isRemote && onlineMode) {
      this.updateState();
      return;
    }
    // Ninja Shadow Realm time dilation: slowed fighters run on a fractional clock.
    // Skipping whole update frames slows everything uniformly — movement, gravity,
    // attack swings, cooldowns, shield hold, AI ticks — while draw still runs at 60fps.
    if (this._domainSlowFactor > 0 && this._domainSlowFactor < 1 && !this._domainRising) {
      this._domainSlowAccum = (this._domainSlowAccum || 0) + this._domainSlowFactor;
      if (this._domainSlowAccum < 1) {
        this.updateState();
        return;
      }
      this._domainSlowAccum -= 1;
    }
    // AI fighters never run processInput (which ticks shieldHoldTimer for
    // humans), so theirs froze at 0 — granting the maximum 65% fresh-shield
    // parry chance for an AI shield's entire duration.
    //
    // The counter means "frames held THIS activation" (smb-combat.js reads it for
    // the parry window), and nothing was restarting it: processInput resets on a
    // fresh press, but the AI paths drop a shield without touching it. So an AI's
    // timer accumulated across every block of its life — measured on Sovereign at
    // 15 -> 29 -> 43 over three ordinary blocks — and past 15 the parry chance is
    // zero. After his first block he could never parry anything again. Restart it
    // on the raising edge, which is exactly what a fresh press does for a human.
    if (this.isAI) {
      if (this.shielding) {
        if (!this._prevShieldingAI) this.shieldHoldTimer = 0;
        this.shieldHoldTimer = (this.shieldHoldTimer || 0) + 1;
      }
      this._prevShieldingAI = this.shielding;
    }
    if (this.cooldown > 0)         this.cooldown--;
    if (this.cooldown2 > 0)        this.cooldown2--;
    if (this.abilityCooldown > 0)  this.abilityCooldown--;
    if (this.abilityCooldown2 > 0) this.abilityCooldown2--;
    if (this.invincible > 0)      this.invincible--;
    const _prevAtkTimer = this.attackTimer;
    if (this.attackTimer > 0)     this.attackTimer--;
    if (this.attackEndlag > 0) { this.attackEndlag--; this.vx *= 0.72; } // slow during recovery
    // Affinity move penalty: low-affinity attacks slow the attacker during the active swing frames
    if (this._affinityMovePenalty > 0) { this._affinityMovePenalty--; this.vx *= 0.88; }
    // Stamina regen
    if (!this.isBoss) this.stamina = Math.min(this.maxStamina, this.stamina + 0.35);

    // ── Anti-kite timer (human players — 1v1, minigames, story; not boss/TF) ───
    if (!this.isAI && !this.isBoss) {
      // Kiting only means something when a living hostile is actually chasing.
      // The old check keyed off `this.target`, which is often null while simply
      // traversing a story exploration map — so plain walking across a 6000px
      // world drained move speed to the 0.65 floor with no enemy in sight.
      let _foe = null;
      let _foeDist = Infinity;
      const _scanFoes = (list) => {
        if (!list) return;
        for (const f of list) {
          if (!f || f === this || f.health <= 0) continue;
          if (f.isAlly || f._isAlly) continue;
          if (typeof areAlliedEntities === 'function' && areAlliedEntities(this, f)) continue;
          const d = Math.abs(f.cx() - this.cx());
          if (d < _foeDist) { _foeDist = d; _foe = f; }
        }
      };
      _scanFoes(players);
      if (typeof minions !== 'undefined') _scanFoes(minions);
      // Only engaged when the hostile is roughly on-screen — beyond that you are
      // travelling, not running away from a fight.
      const _engaged    = !!_foe && _foeDist < 620;
      const _kiteMode   = (gameMode === '2p' || gameMode === 'minigames' || storyModeActive) && _engaged;
      const _movingFast = Math.abs(this.vx) > 3.8;
      const _inCombat   = this.hurtTimer > 0 || this.attackTimer > 0 || this.attackEndlag > 0;
      const _nearEnemy  = _foeDist < 140;
      // Increment while actively running away from combat; decay 3× faster when not kiting
      if (!_engaged) {
        this._kiteTimer = 0; // nothing to kite — restore full speed immediately
      } else if (!_kiteMode || !_movingFast || _inCombat || _nearEnemy) {
        this._kiteTimer = Math.max(0, this._kiteTimer - 3);
      } else {
        this._kiteTimer++;
      }
      // Grace: full speed for 90f (~1.5s), then linear decay to 0.65 floor by 450f (~7.5s)
      if (this._kiteTimer <= 90) {
        this._kiteSpeedMult = 1.0;
      } else if (this._kiteTimer <= 450) {
        this._kiteSpeedMult = 1.0 - 0.35 * ((this._kiteTimer - 90) / 360);
      } else {
        this._kiteSpeedMult = 0.65;
      }
    }
    // ── Ranged burst tracking ─────────────────────────────────────────────────
    if (!this.isBoss && this.weapon && this.weapon.type === 'ranged') {
      if (this.attackTimer > 0) {
        this._rangedBurstTimer++;
        // After ~3s of continuous fire, apply post-burst debuff
        if (this._rangedBurstTimer >= 180 && this._rangedMovePenalty <= 0) {
          this._rangedMovePenalty = 40; // 0.67s recovery debuff
          this._rangedBurstTimer  = 0;
        }
      } else {
        this._rangedBurstTimer = Math.max(0, this._rangedBurstTimer - 1);
        this._rangedShotHeat   = Math.max(0, this._rangedShotHeat - 0.16);
      }
    }
    if (this._rangedMovePenalty > 0) this._rangedMovePenalty--;
    if (this._rangedCommitTimer > 0) this._rangedCommitTimer--;
    if (this._rangedRecoilKick > 0) this._rangedRecoilKick--;
    if (this._recentRangedUse > 0) this._recentRangedUse--;
    if (this.hurtTimer > 0)       this.hurtTimer--;
    if (this.stunTimer > 0)       this.stunTimer--;
    if (this.ragdollTimer > 0)    this.ragdollTimer--;
    // ── STATE RESET FAILSAFE ─────────────────────────────────────────────────
    // If hitstun/stun/ragdoll timers are stuck above their maximum possible values,
    // force them back to neutral so the fighter doesn't get permanently locked.
    if (this.hurtTimer > 240) {
      console.warn('[STATE] hurtTimer overflow — reset on', this.name || 'fighter');
      this.hurtTimer = 0;
    }
    if (this.stunTimer > 180) {
      console.warn('[STATE] stunTimer overflow — reset on', this.name || 'fighter');
      this.stunTimer = 0;
    }
    if (this.ragdollTimer > 180) {
      console.warn('[STATE] ragdollTimer overflow — reset on', this.name || 'fighter');
      this.ragdollTimer = 0; this.ragdollSpin = 0;
    }
    if (this.spinning > 0)        this.spinning--;
    if (this.boostCooldown > 0)        this.boostCooldown--;

    // ── Hammer super: Mjolnir Spin — contact hits while spinning, launch on end ──
    if (this._hammerSpin) {
      this._hammerSpin.timer--;
      if (this._hammerSpin.timer % 8 === 0) {
        const _hAll = [...players, ...trainingDummies, ...minions];
        for (const f of _hAll) {
          if (!isHostileTarget(this, f) || this._hammerSpin.hitSet.has(f)) continue;
          if (dist(this, f) < 80) {
            dealDamage(this, f, 10, 8);
            this._hammerSpin.hitSet.delete(f); // allow re-hit after interval
          }
        }
        this._hammerSpin.hitSet.clear();
      }
      if (this._hammerSpin.timer <= 0) {
        this._hammerSpin = null;
        this.superActive = false;
        this.vx = this.facing * 44;
        this.vy = -16;
        screenShake = Math.max(screenShake, 26);
        spawnRing(this.cx(), this.y + this.h);
        spawnParticles(this.cx(), this.cy(), '#ffcc44', 22);
      }
    }

    // ── Spear super: Lance Charge — sustained forward pierce ─────────────────────
    if (this._spearCharge) {
      this._spearCharge.timer--;
      this.vx = this.facing * 14;
      const _sAll = [...players, ...trainingDummies, ...minions];
      for (const f of _sAll) {
        if (!isHostileTarget(this, f) || this._spearCharge.hitSet.has(f)) continue;
        if (dist(this, f) < 50) {
          dealDamage(this, f, 28, 18);
          this._spearCharge.hitSet.add(f);
        }
      }
      if (this._spearCharge.timer <= 0) { this._spearCharge = null; this.superActive = false; }
    }

    // ── Axe super: Whirlwind — continuous multi-hit spin ────────────────────────
    if (this._axeWhirl && this.spinning > 0) {
      const _aAll = [...players, ...trainingDummies, ...minions];
      for (const f of _aAll) {
        if (!isHostileTarget(this, f)) continue;
        if (dist(this, f) < 90) {
          this._axeWhirl.hitCd[f._id || f.name] = (this._axeWhirl.hitCd[f._id || f.name] || 0) - 1;
          if ((this._axeWhirl.hitCd[f._id || f.name] || 0) <= 0) {
            dealDamage(this, f, 14, 10);
            this._axeWhirl.hitCd[f._id || f.name] = 12;
          }
        }
      }
    } else if (this._axeWhirl && this.spinning <= 0) {
      this._axeWhirl = null;
      this.superActive = false;
    }

    // ── Sword super: slash queue (staggered spawn) + slash movement ─────────────
    if (this._swordSlashQueue && this._swordSlashQueue.length > 0) {
      for (let i = this._swordSlashQueue.length - 1; i >= 0; i--) {
        this._swordSlashQueue[i].delay--;
        if (this._swordSlashQueue[i].delay <= 0) {
          const q = this._swordSlashQueue.splice(i, 1)[0];
          this._swordSlashes.push({
            x: this.cx() + this.facing * 18,
            y: this.y + this.h * 0.38 + q.yOff,
            vx: this.facing * 8,
            vy: q.vy,
            tilt: q.tilt,
            kb: q.kb !== undefined ? q.kb : 12,
            facing: this.facing,
            life: 42, maxLife: 42,
            size: 26 + Math.abs(q.yOff) * 0.3,
            hitSet: new Set(),
          });
          // slicing forward dash on first slash
          if (i === 0 || this._swordSlashQueue.length === 0) {
            this.vx = this.facing * 10;
            this.vy = Math.min(this.vy, -2);
          }
        }
      }
    }
    if (this._swordSlashes && this._swordSlashes.length > 0) {
      for (let i = this._swordSlashes.length - 1; i >= 0; i--) {
        const sl = this._swordSlashes[i];
        sl.x += sl.vx;
        sl.y += sl.vy;
        sl.vy += 0.08; // slight gravity arc
        sl.life--;
        const _slAll = [...players, ...trainingDummies, ...minions];
        // Gentle vertical tracking toward the nearest un-hit enemy ahead of the slash,
        // so the fan doesn't sail over/under the target at range
        let _slHome = null, _slHomeD = 300;
        for (const f of _slAll) {
          if (!isHostileTarget(this, f) || sl.hitSet.has(f)) continue;
          if (typeof areAlliedEntities === 'function' && areAlliedEntities(this, f)) continue;
          const dx = (f.cx() - sl.x) * sl.facing;
          if (dx < -20 || dx > _slHomeD) continue;
          _slHomeD = dx; _slHome = f;
        }
        if (_slHome) sl.vy += clamp(((_slHome.y + _slHome.h * 0.5) - sl.y) * 0.02, -0.35, 0.35);
        // damage check — short invincibility window (8 frames) so all 3 staggered slashes can land
        for (const f of _slAll) {
          if (!isHostileTarget(this, f) || sl.hitSet.has(f)) continue;
          // Don't spend the slash's single hit while the target is in i-frames
          // (dealDamage would silently no-op) — keep overlapping until they expire
          if (f.invincible > 0) continue;
          if (Math.hypot(f.cx() - sl.x, (f.y + f.h * 0.5) - sl.y) < sl.size + 14) {
            dealDamage(this, f, 22, sl.kb !== undefined ? sl.kb : 12, 1.0, false, 8);
            sl.hitSet.add(f);
          }
        }
        if (sl.life <= 0) this._swordSlashes.splice(i, 1);
      }
      if (this._swordSlashes.length === 0 && (this._swordSlashQueue || []).length === 0) {
        this.superActive = false;
      }
    }

    // ── Combat weapon: Counter Stance timer + teleport retaliation ───────────────
    if (this._counterStance > 0) {
      this._counterStance--;
    }
    if (this._counterAttacker) {
      const atk = this._counterAttacker;
      this._counterAttacker = null;
      if (atk && atk.health > 0) {
        // Teleport to the opposite side of the attacker
        const behindX = atk.cx() + (atk.facing || 1) * 55;
        this.x = clamp(behindX - this.w / 2, 0, GAME_W - this.w);
        this.y = atk.y;
        this.vy = 0;
        this.vx = 0;
        // Face toward the attacker's back
        this.facing = -(atk.facing || 1);
        spawnParticles(this.cx(), this.cy(), '#ff4444', 18);
        spawnParticles(this.cx(), this.cy(), '#ffcc44', 10);
        screenShake = Math.max(screenShake, 12);
        // Launcher kick: knock them upward
        dealDamage(this, atk, 18, 12);
        atk.vy = Math.min(atk.vy, -16);
        atk.vx = this.facing * 6;
        spawnParticles(atk.cx(), atk.cy(), '#ff6644', 16);
      }
    }

    // ── Combat super: Combo Strike — dash → uppercut → aimed kick ──────────────
    // Redesigned 2026-09-05. The old version was four unconditional phases: the
    // kick's dealDamage() had NO range test at all, so firing E from the far side
    // of the arena connected anyway and the super was a guaranteed 56 damage plus
    // a launch from any distance. It is now a read: the dash has to CONNECT, and
    // if it does the reward is a combo the victim genuinely cannot escape — but
    // the payoff angle is the player's to aim, so a bad aim wastes the launch.
    if (this._comboSuper) {
      const cs = this._comboSuper;
      cs.timer++;
      const t = cs.target;
      const _csDead = !t || t.health <= 0;

      // Losing the victim mid-combo (ring-out, another player's kill, respawn)
      // must not strand the attacker in the aim phase forever.
      if (_csDead && cs.phase >= 1) {
        this._comboSuper = null;
        this.superActive = false;
      } else if (cs.phase === 0) {
        // ── Phase 0: DASH. This is the whiff-able half of the move. ───────────
        if (!_csDead) {
          const _csDx = t.cx() - this.cx();
          this.facing = _csDx > 0 ? 1 : -1;
          this.vx = this.vx * 0.5 + this.facing * 18 * 0.5;
          const _gap  = Math.abs(t.cx() - this.cx());
          const _vGap = Math.abs(t.cy() - this.cy());
          if (_gap <= COMBO_SUPER_REACH && _vGap <= 70) { cs.phase = 1; cs.timer = 0; this.vx *= 0.3; }
        }
        // Ran out of dash without touching anything: the super is spent. That is
        // the cost that makes the confirmed version fair.
        if (cs.phase === 0 && cs.timer >= 26) {
          this._comboSuper = null;
          this.superActive = false;
          this.cooldown = Math.max(this.cooldown, 22);   // visible whiff endlag
          spawnParticles(this.cx(), this.cy(), '#886644', 10);
        }
      } else if (cs.phase === 1) {
        // ── Phase 1: UPPERCUT. Confirmed hit — launches the victim straight up.
        this.vx *= 0.55;
        if (cs.timer === 3 && !cs.kickDone) {
          cs.kickDone = true;
          dealDamage(this, t, 20, 6);
          t.vy = -21;
          t.vx = this.facing * 3;
          cs.impactX = t.cx(); cs.impactY = t.cy(); cs.impactFlash = 12;
          spawnParticles(t.cx(), t.cy(), '#ff4444', 16);
          spawnParticles(t.cx(), t.cy(), '#ffffff', 8);
          spawnRing(t.cx(), t.cy());
          screenShake = Math.max(screenShake, 14);
          this.vy = -13;   // follow them up
        }
        if (cs.impactFlash > 0) cs.impactFlash--;
        if (cs.timer >= 16) { cs.phase = 2; cs.timer = 0; }
      } else if (cs.phase === 2) {
        // ── Phase 2: FALL BACK. They peak and drop; he tracks under them. ─────
        this.vx *= 0.7;
        if (cs.timer >= 22) {
          cs.phase = 3; cs.timer = 0;
          // Aim opens pointing where the uppercut was already going, so a player
          // who does nothing still gets a sane (if unoptimised) launch.
          cs.aim = this.facing > 0 ? -0.55 : Math.PI + 0.55;
          // Pin the attacker's height for the window. Zeroing vy is not enough:
          // gravity is applied later in this same update(), so he would sink a
          // couple of hundred pixels across a 110-frame aim.
          cs.holdY = this.y;
        }
      } else if (cs.phase === 3) {
        // ── Phase 3: AIM. Both bodies are suspended; the kick angle is an input.
        // The victim CANNOT escape — velocity is zeroed and re-stunned every
        // frame — which is the whole promise of the move. What is not free is
        // where they go: that is the player's decision, under a clock.
        this.vx = 0; this.vy = 0;
        if (cs.holdY != null) this.y = cs.holdY;
        t.vx = 0; t.vy = 0;
        t.stunTimer = Math.max(t.stunTimer || 0, 12);
        t.attackTimer = 0;
        // Park them just in front of and slightly above him — a readable pose to
        // aim off, and it stops a drifting body leaving the kick's reach.
        t.x = this.cx() + this.facing * 44 - (t.w || 30) / 2;
        t.y = this.cy() - 40;

        if (this.isAI) {
          // Bots aim at the nearest blast-off: whichever side wall is closer.
          const _outLeft = this.cx() < GAME_W / 2;
          cs.aim = _outLeft ? Math.PI + 0.35 : -0.35;
          if (cs.timer >= 18) { cs.phase = 4; cs.timer = 0; }
        } else {
          const _cL = this.controls || {};
          if (keysDown.has(_cL.left))  cs.aim -= COMBO_SUPER_AIM_RATE;
          if (keysDown.has(_cL.right)) cs.aim += COMBO_SUPER_AIM_RATE;
          if (cs.fire || cs.timer >= COMBO_SUPER_AIM_FRAMES) { cs.phase = 4; cs.timer = 0; }
        }
      } else if (cs.phase === 4) {
        // ── Phase 4: KICK. Fires along the aimed vector. ──────────────────────
        this.vx *= 0.65;
        if (cs.timer === 3 && !cs.punchDone) {
          cs.punchDone = true;
          const _a = cs.aim || 0;
          this.facing = Math.cos(_a) >= 0 ? 1 : -1;
          dealDamage(this, t, 34, 28);
          t.vx = Math.cos(_a) * 26;
          t.vy = Math.sin(_a) * 26;
          cs.impactX = t.cx(); cs.impactY = t.cy(); cs.impactFlash = 18;
          spawnParticles(t.cx(), t.cy(), '#ff2222', 22);
          spawnParticles(t.cx(), t.cy(), '#ffcc44', 10);
          spawnRing(t.cx(), t.cy());
          screenShake = Math.max(screenShake, 22);
        }
        if (cs.impactFlash > 0) cs.impactFlash--;
        if (cs.timer >= 14) {
          this._comboSuper = null;
          this.superActive = false;
        }
      }
    }

    // ── Pea Shooter super: Cluster Bomb — large pea that bursts into radial shrapnel ──
    if (this._peaCluster) {
      const pc = this._peaCluster;
      pc.x += pc.vx;
      pc.y += pc.vy;
      pc.vy += 0.15;
      pc.life--;
      let _pcDetonated = false;
      const _pcAll = [...players, ...trainingDummies, ...minions];
      for (const f of _pcAll) {
        if (!isHostileTarget(this, f)) continue;
        if (Math.hypot(f.cx() - pc.x, (f.y + f.h * 0.5) - pc.y) < 36) { _pcDetonated = true; break; }
      }
      if (_pcDetonated || pc.life <= 0) {
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const spd   = 9 + Math.random() * 3;
          const dmg   = 8 + Math.floor(Math.random() * 4);
          projectiles.push(new Projectile(pc.x, pc.y, Math.cos(angle) * spd, Math.sin(angle) * spd, this, dmg, '#00ff44'));
        }
        spawnParticles(pc.x, pc.y, '#44ff44', 26);
        spawnParticles(pc.x, pc.y, '#ffffff', 10);
        spawnRing(pc.x, pc.y);
        screenShake = Math.max(screenShake, 18);
        this._peaCluster = null;
      }
    }

    // ── Slingshot super: Gravity Stone — slow boulder that yanks enemies on detonation ──
    if (this._gravityStone) {
      const gs = this._gravityStone;
      gs.x += gs.vx;
      gs.y += gs.vy;
      gs.vy += 0.18;
      gs.life--;
      const _gsAll = [...players, ...trainingDummies, ...minions];
      let _gsHit = false;
      for (const f of _gsAll) {
        if (!isHostileTarget(this, f)) continue;
        if (Math.hypot(f.cx() - gs.x, (f.y + f.h * 0.5) - gs.y) < 44) { _gsHit = true; break; }
      }
      if (_gsHit || gs.life <= 0) {
        for (const f of _gsAll) {
          if (!isHostileTarget(this, f)) continue;
          const _gdx = gs.x - f.cx();
          const _gdy = gs.y - (f.y + f.h * 0.5);
          const _gd  = Math.hypot(_gdx, _gdy) || 1;
          if (_gd < 220) {
            f.vx += (_gdx / _gd) * 18;
            f.vy += (_gdy / _gd) * 12;
            dealDamage(this, f, 52, 0);
            spawnParticles(f.cx(), f.cy(), '#ff6600', 10);
          }
        }
        spawnRing(gs.x, gs.y);
        spawnRing(gs.x, gs.y);
        spawnParticles(gs.x, gs.y, '#ff9933', 28);
        screenShake = Math.max(screenShake, 28);
        this._gravityStone = null;
        this.superActive = false;
      }
    }

    // ── Paper Airplane super: Origami Swarm — 8 homing planes that track enemies ──
    if (this._paperSwarm && this._paperSwarm.length > 0) {
      const _swarmTarget = players.find(p => p !== this && p.health > 0)
                        || trainingDummies.find(d => d.health > 0);
      for (let i = this._paperSwarm.length - 1; i >= 0; i--) {
        const pl = this._paperSwarm[i];
        if (_swarmTarget) {
          const _pdx = _swarmTarget.cx() - pl.x;
          const _pdy = (_swarmTarget.y + _swarmTarget.h * 0.5) - pl.y;
          const _pd  = Math.hypot(_pdx, _pdy) || 1;
          pl.vx += (_pdx / _pd) * 0.28;
          pl.vy += (_pdy / _pd) * 0.28;
          const _pspd = Math.hypot(pl.vx, pl.vy);
          if (_pspd > 9) { pl.vx = pl.vx / _pspd * 9; pl.vy = pl.vy / _pspd * 9; }
        }
        pl.x += pl.vx;
        pl.y += pl.vy;
        pl.life--;
        const _plAll = [...players, ...trainingDummies, ...minions];
        for (const f of _plAll) {
          if (!isHostileTarget(this, f) || pl.hitSet.has(f)) continue;
          if (Math.hypot(f.cx() - pl.x, (f.y + f.h * 0.5) - pl.y) < 22) {
            dealDamage(this, f, 22, 9);
            pl.hitSet.add(f);
            spawnParticles(pl.x, pl.y, '#aaccff', 6);
            pl.life = 0;
          }
        }
        if (pl.life <= 0 || pl.x < worldLeftBound() - 60 || pl.x > worldRightBound() + 60 || pl.y > GAME_H + 60) {
          this._paperSwarm.splice(i, 1);
        }
      }
      if (this._paperSwarm.length === 0) this.superActive = false;
    }

    // ── Whip slow: damps velocity on targets hit by Crack ────────────────────────
    if (this._whipSlow > 0) {
      this._whipSlow--;
      this.vx *= 0.82;
    }

    // ── Whip lacerate bleed: DoT left by a lash; crack hits cut deeper ───────────
    if (this._whipBleed) {
      const wb = this._whipBleed;
      if (--wb.timer <= 0) {
        wb.timer = 26;
        wb.ticks--;
        if (this.health > 0 && wb.src && wb.src !== this) {
          dealDamage(wb.src, this, wb.dmg, 0);
          spawnParticles(this.cx(), this.cy() + 6, '#aa2222', 4);
        }
      }
      if (wb.ticks <= 0 || this.health <= 0) this._whipBleed = null;
    }

    // ── Whip hook mark from Lasso: every lash on a hooked target counts as a crack ─
    if (this._whipHooked > 0) {
      this._whipHooked--;
      if (this._whipHooked <= 0) this._whipHookSrc = null;
    }

    // ── Whip super: Serpent's Coil — three extending long-range lashes ────────────
    if (this._whipCoil) {
      const wc = this._whipCoil;
      wc.t++;
      const LASH = 22;                       // frames per lash (extend + recoil)
      const p    = (wc.t % LASH) / LASH;
      // reach ramps out over the first 40% of the lash, then snaps back
      wc.reach = p < 0.4 ? (p / 0.4) * wc.maxReach
                         : wc.maxReach * (1 - Math.pow((p - 0.4) / 0.6, 2));
      wc.tipX  = this.cx() + wc.dir * wc.reach;
      wc.tipY  = this.cy() - 4 + Math.sin(wc.t * 0.5) * 10;
      const _lashIdx = Math.floor(wc.t / LASH);
      if (_lashIdx !== wc.lash) {            // new lash begins
        wc.lash = _lashIdx;
        wc.hitSet = new Set();
        if (typeof SoundManager !== 'undefined' && SoundManager.hitSnap) SoundManager.hitSnap();
        screenShake = Math.max(screenShake, 10);
      }
      if (wc.lash >= 3) {
        this._whipCoil = null;
        this.superActive = false;
      } else {
        const _final = wc.lash === 2;
        const _wcAll = [...players, ...trainingDummies, ...minions];
        for (const f of _wcAll) {
          if (!isHostileTarget(this, f) || wc.hitSet.has(f) || f.health <= 0) continue;
          const _fdx = (f.cx() - this.cx()) * wc.dir;
          if (_fdx < 0 || _fdx > wc.reach) continue;            // behind us or past the tip
          if (Math.abs(f.cy() - this.cy()) > 62) continue;      // horizontal band
          wc.hitSet.add(f);
          dealDamage(this, f, _final ? 16 : 13, _final ? 12 : 5);
          this._whipApplyBleed(f, true);
          f._whipSlow = Math.max(f._whipSlow || 0, 16);
          spawnParticles(f.cx(), f.cy(), '#ffcc55', _final ? 16 : 9);
          if (_final) {
            f.vy = Math.min(f.vy, -13);
            f.stunTimer = Math.max(f.stunTimer || 0, 18);
            screenShake = Math.max(screenShake, 20);
          }
        }
      }
    }

    // ── Whip crack visual timer ───────────────────────────────────────────────────
    if (this._whipCrack) {
      this._whipCrack.timer--;
      if (this._whipCrack.timer <= 0) this._whipCrack = null;
    }
    if (this._whipRope) {
      this._whipRope.timer--;
      if (this._whipRope.timer <= 0) this._whipRope = null;
    }

    // ── Shield: Fortress Charge — sustained forward rush with contact hit ─────────
    if (this._shieldCharge) {
      const sc = this._shieldCharge;
      sc.timer--;
      this.vx = this.facing * 27;
      spawnParticles(this.cx() - this.facing * 10, this.cy(), '#4488ff', 3);
      const _scAll = [...players, ...trainingDummies, ...minions];
      for (const f of _scAll) {
        if (!isHostileTarget(this, f) || sc.hitSet.has(f)) continue;
        if (dist(this, f) < 58) {
          dealDamage(this, f, 32, 40);
          f.vx        = this.facing * 24;
          f.stunTimer = Math.max(f.stunTimer || 0, 14);
          sc.hitSet.add(f);
          spawnParticles(f.cx(), f.cy(), '#88aaff', 16);
          spawnRing(f.cx(), f.cy());
          screenShake = Math.max(screenShake, 22);
        }
      }
      if (sc.timer <= 0) { this._shieldCharge = null; this.superActive = false; }
    }

    // ── Electric Staff overcharge timer ──────────────────────────────────────────
    if (this._overcharged > 0) this._overcharged--;

    // ── Flail: Chain Yank ball ────────────────────────────────────────────────────
    if (this._flailBall) {
      const fb = this._flailBall;
      if (!fb.returning) {
        fb.timer--;
        if (fb.timer <= 0) { fb.returning = true; fb.hitSet.clear(); }
      } else {
        const _fdx = this.cx() - fb.x;
        const _fdy = this.cy() - fb.y;
        const _fd  = Math.hypot(_fdx, _fdy) || 1;
        fb.vx = (_fdx / _fd) * 10;
        fb.vy = (_fdy / _fd) * 10;
        if (_fd < 28) { this._flailBall = null; }
      }
      if (this._flailBall) {
        fb.x += fb.vx;
        fb.y += fb.vy;
        const _fbDmg = fb.returning ? 16 : 26;
        const _fbKb  = fb.returning ? 12 : 18;
        const _fbAll = [...players, ...trainingDummies, ...minions];
        for (const f of _fbAll) {
          if (!isHostileTarget(this, f) || fb.hitSet.has(f)) continue;
          if (Math.hypot(f.cx() - fb.x, (f.y + f.h * 0.5) - fb.y) < 30) {
            dealDamage(this, f, _fbDmg, _fbKb);
            fb.hitSet.add(f);
            spawnParticles(fb.x, fb.y, '#aaaaaa', 8);
            screenShake = Math.max(screenShake, 10);
          }
        }
        if (fb.x < worldLeftBound() - 100 || fb.x > worldRightBound() + 100) this._flailBall = null;
      }
    }

    // ── Flail: Orbit Storm super — ball orbits and hits nearby enemies ─────────
    if (this._flailOrbit) {
      const fo = this._flailOrbit;
      fo.timer--;
      fo.angle = (fo.angle || 0) + 0.22;
      fo.ballX  = this.cx() + Math.cos(fo.angle) * 75;
      fo.ballY  = (this.y + this.h * 0.4) + Math.sin(fo.angle) * 55;
      const _foAll = [...players, ...trainingDummies, ...minions];
      for (const f of _foAll) {
        if (!isHostileTarget(this, f)) continue;
        const _foid = f._id || f.name || 'dummy';
        fo.hitCd[_foid] = (fo.hitCd[_foid] || 0) - 1;
        if ((fo.hitCd[_foid] || 0) <= 0 && Math.hypot(f.cx() - fo.ballX, (f.y + f.h * 0.5) - fo.ballY) < 26) {
          dealDamage(this, f, 16, 10);
          fo.hitCd[_foid] = 14;
          spawnParticles(fo.ballX, fo.ballY, '#888888', 6);
        }
      }
      if (fo.timer <= 0) { this._flailOrbit = null; this.superActive = false; }
    }

    // ── Boomerang: returning projectiles ─────────────────────────────────────────
    if (this._boomerangs && this._boomerangs.length > 0) {
      for (let i = this._boomerangs.length - 1; i >= 0; i--) {
        const bm = this._boomerangs[i];
        if (!bm.returning) {
          bm.timer--;
          bm.vy += 0.10;
          if (bm.timer <= 0) {
            if (bm.oneWay) { this._boomerangs.splice(i, 1); continue; } // basic attack: no return
            bm.returning = true;
          }
        } else {
          const _bdx = this.cx() - bm.x;
          const _bdy = (this.y + this.h * 0.5) - bm.y;
          const _bdd = Math.hypot(_bdx, _bdy) || 1;
          bm.vx += (_bdx / _bdd) * 0.85;
          bm.vy += (_bdy / _bdd) * 0.85;
          const _bspd = Math.hypot(bm.vx, bm.vy);
          if (_bspd > 11) { bm.vx = bm.vx / _bspd * 11; bm.vy = bm.vy / _bspd * 11; }
          if (_bdd < 30) { this._boomerangs.splice(i, 1); continue; }
        }
        bm.x += bm.vx;
        bm.y += bm.vy;
        const _bmHitSet = bm.returning ? bm.hitSetReturn : bm.hitSetGo;
        const _bmDmg    = bm.returning ? 18 : 22;
        const _bmAll    = [...players, ...trainingDummies, ...minions];
        for (const f of _bmAll) {
          if (!isHostileTarget(this, f) || _bmHitSet.has(f)) continue;
          if (Math.hypot(f.cx() - bm.x, (f.y + f.h * 0.5) - bm.y) < 26) {
            dealDamage(this, f, _bmDmg, 12);
            _bmHitSet.add(f);
            spawnParticles(bm.x, bm.y, '#cc9944', 8);
          }
        }
        if (bm.x < worldLeftBound() - 100 || bm.x > worldRightBound() + 100 || bm.y > GAME_H + 100) {
          this._boomerangs.splice(i, 1);
        }
      }
    }

    // ── Paper Airplane: basic-attack planes fly forward ──────────────────────────
    if (this._paperPlanes && this._paperPlanes.length > 0) {
      for (let i = this._paperPlanes.length - 1; i >= 0; i--) {
        const pp = this._paperPlanes[i];
        pp.x += pp.vx; pp.y += pp.vy; pp.vy += 0.06;
        pp.life--;
        if (pp.life <= 0 || pp.x < worldLeftBound() - 60 || pp.x > worldRightBound() + 60 || pp.y > GAME_H + 60) {
          this._paperPlanes.splice(i, 1); continue;
        }
        const _ppAll = [...players, ...trainingDummies, ...minions];
        for (const f of _ppAll) {
          if (!isHostileTarget(this, f) || pp.hitSet.has(f)) continue;
          if (pp.x > f.x && pp.x < f.x + f.w && pp.y > f.y - 4 && pp.y < f.y + f.h + 4) {
            const _ppDmg = this.weapon && this.weapon.damageFunc ? this.weapon.damageFunc() : 10;
            dealDamage(this, f, _ppDmg, 6);
            pp.hitSet.add(f);
            spawnParticles(pp.x, pp.y, '#aaccff', 6);
            this._paperPlanes.splice(i, 1); break;
          }
        }
      }
    }

    // ── Boomerang Q: Orbit Guard — boomerang circles user as a spinning shield ────
    if (this._boomOrbit) {
      const bo = this._boomOrbit;
      bo.angle += 0.20;
      bo.timer--;
      bo.ballX = this.cx() + Math.cos(bo.angle) * bo.r;
      bo.ballY = this.cy() + Math.sin(bo.angle) * bo.r * 0.55;
      // Decrement per-target hit cooldowns
      for (const [_bof, _bocd] of bo.hitCd) {
        if (_bocd <= 1) bo.hitCd.delete(_bof); else bo.hitCd.set(_bof, _bocd - 1);
      }
      const _boAll = [...players, ...trainingDummies, ...minions];
      for (const f of _boAll) {
        if (!isHostileTarget(this, f) || bo.hitCd.has(f)) continue;
        if (Math.hypot(f.cx() - bo.ballX, (f.y + f.h * 0.5) - bo.ballY) < 30) {
          dealDamage(this, f, 15, 9);
          bo.hitCd.set(f, 20);
          spawnParticles(bo.ballX, bo.ballY, '#cc9944', 7);
          screenShake = Math.max(screenShake, 6);
        }
      }
      if (bo.timer <= 0) this._boomOrbit = null;
    }

    // ── Axe E: Thrown Axe — heavy spinning axe head flies out and returns ────────
    if (this._thrownAxe) {
      const ta = this._thrownAxe;
      ta.angle += 0.35;
      ta.timer--;
      if (!ta.returning) {
        ta.x += ta.vx;
        ta.y += ta.vy;
        ta.vy += 0.18;
        if (ta.timer < 40) ta.returning = true; // start curving back
      } else {
        const _tadx = this.cx() - ta.x;
        const _tady = (this.y + this.h * 0.5) - ta.y;
        const _tadd = Math.hypot(_tadx, _tady) || 1;
        ta.vx += (_tadx / _tadd) * 1.4;
        ta.vy += (_tady / _tadd) * 1.4;
        const _taspd = Math.hypot(ta.vx, ta.vy);
        if (_taspd > 13) { ta.vx = ta.vx / _taspd * 13; ta.vy = ta.vy / _taspd * 13; }
        if (_tadd < 32) { this._thrownAxe = null; this.superActive = false; return; }
      }
      // Hit detection — 40px radius, once per target
      const _taAll = [...players, ...trainingDummies, ...minions];
      for (const f of _taAll) {
        if (!isHostileTarget(this, f) || ta.hitSet.has(f)) continue;
        if (Math.hypot(f.cx() - ta.x, (f.y + f.h * 0.5) - ta.y) < 40) {
          dealDamage(this, f, 38, 18);
          f.vy = -10;
          ta.hitSet.add(f);
          spawnParticles(ta.x, ta.y, '#ff8833', 16);
          spawnParticles(ta.x, ta.y, '#ffcc44', 8);
          spawnRing(ta.x, ta.y);
          screenShake = Math.max(screenShake, 22);
        }
      }
      if (ta.timer <= 0) { this._thrownAxe = null; this.superActive = false; }
    }

    // ── Electric Staff Q: Shock Bolt — ranged orb; on impact creates electric zone ─
    if (this._shockBolt) {
      const sb = this._shockBolt;
      sb.x += sb.vx; sb.y += sb.vy; sb.vy += 0.06; sb.life--;
      let _sbExplode = sb.life <= 0;
      const _sbAll = [...players, ...trainingDummies, ...minions];
      for (const f of _sbAll) {
        if (!isHostileTarget(this, f) || sb.hitSet.has(f)) continue;
        if (Math.hypot(f.cx() - sb.x, (f.y + f.h * 0.3) - sb.y) < 30) {
          // Was 20 — MORE than the staff's own 14-damage melee swing, on a safe
          // ranged orb. Replay-measured it was 25.7% of the wielder's entire
          // output (28 landed bolts). 13 puts it below the basic attack so it
          // reads as the zoning/utility tool it's described as, not the win
          // condition. The lingering ground zone it leaves is untouched.
          dealDamage(this, f, 13, 9);
          f.stunTimer = Math.max(f.stunTimer || 0, 12);
          sb.hitSet.add(f); _sbExplode = true;
        }
      }
      if (_sbExplode) {
        if (!this._elecZones) this._elecZones = [];
        this._elecZones.push({ x: sb.x, y: sb.y + 18, r: 62, timer: 95, tickCd: 0 });
        typeof spawnLightningBolt === 'function' && spawnLightningBolt(sb.x, sb.y);
        spawnParticles(sb.x, sb.y, '#00eeff', 22); spawnParticles(sb.x, sb.y, '#ffffff', 8);
        spawnRing(sb.x, sb.y); screenShake = Math.max(screenShake, 14);
        this._shockBolt = null;
      }
    }

    // ── Electric Staff: electric ground zones from Shock Bolt impact ──────────────
    if (this._elecZones && this._elecZones.length) {
      for (let _ezi = this._elecZones.length - 1; _ezi >= 0; _ezi--) {
        const ez = this._elecZones[_ezi];
        ez.timer--; ez.tickCd = Math.max(0, ez.tickCd - 1);
        if (ez.timer <= 0) { this._elecZones.splice(_ezi, 1); continue; }
        if (ez.tickCd <= 0) {
          const _ezAll = [...players, ...trainingDummies, ...minions];
          for (const f of _ezAll) {
            if (!isHostileTarget(this, f)) continue;
            if (Math.hypot(f.cx() - ez.x, (f.y + f.h) - ez.y) < ez.r) {
              dealDamage(this, f, 5, 3);
              spawnParticles(f.cx(), f.cy(), '#00eeff', 3);
            }
          }
          ez.tickCd = 15;
        }
      }
    }

    // ── Electric Staff E: Thunderstrike — 4 bolts drop from sky ──────────────────
    if (this._thunderStrikes) {
      this._thunderTimer++;
      for (const ts of this._thunderStrikes) {
        if (!ts.fired && this._thunderTimer >= ts.delay) {
          ts.fired = true;
          typeof spawnLightningBolt === 'function' && spawnLightningBolt(ts.x, ts.y);
          spawnParticles(ts.x, ts.y, '#00eeff', 20); spawnParticles(ts.x, ts.y, '#aaeeff', 10);
          screenShake = Math.max(screenShake, 18);
          const _tsAll = [...players, ...trainingDummies, ...minions];
          for (const f of _tsAll) {
            if (!isHostileTarget(this, f)) continue;
            if (Math.hypot(f.cx() - ts.x, f.cy() - ts.y) < 62) {
              // Was 32/bolt = 128 total — 85% of a 150 HP bar, from any range, on
              // a 62px AoE that also stuns. Replay-measured, Thunderstrike plus
              // Shock Bolt carried the staff's whole damage profile while its own
              // 14-damage melee swing landed once in a 302-second match.
              // 20/bolt = 80 total keeps it a fight-ending super without being a
              // near-guaranteed stock from full health at zero risk.
              dealDamage(this, f, 20, 14);
              f.stunTimer = Math.max(f.stunTimer || 0, 10);
            }
          }
        }
      }
      if (this._thunderStrikes.every(ts => ts.fired) && this._thunderTimer > 75) {
        this._thunderStrikes = null; this.superActive = false;
      }
    }

    // ── Electric Staff: chain arc visuals (base attack chain) ────────────────────
    if (this._chainArcs && this._chainArcs.length) {
      for (let _cai = this._chainArcs.length - 1; _cai >= 0; _cai--) {
        this._chainArcs[_cai].timer--;
        if (this._chainArcs[_cai].timer <= 0) this._chainArcs.splice(_cai, 1);
      }
    }

    // ── Hammer Q: Ground Shockwave — traveling wave rolls along the floor ────────
    if (this._hammerShock) {
      const hs = this._hammerShock;
      hs.x += hs.vx;
      hs.timer--;
      const _hsAll = [...players, ...trainingDummies, ...minions];
      for (const f of _hsAll) {
        if (!isHostileTarget(this, f) || hs.hitSet.has(f)) continue;
        if (Math.hypot(f.cx() - hs.x, (f.y + f.h) - hs.y) < 52) {
          dealDamage(this, f, 28, 14);
          // Was a bare `f.vy = -16` assignment — not even Math.min, so it set
          // upward velocity unconditionally and bypassed the launch governor
          // entirely. Same class of bug as the Megaknight uppercut.
          applyLaunch(this, f, -16);
          hs.hitSet.add(f);
          spawnParticles(f.cx(), f.cy(), '#ffcc44', 14);
          spawnRing(f.cx(), f.cy());
          screenShake = Math.max(screenShake, 16);
        }
      }
      if (hs.timer <= 0 || hs.x < worldLeftBound() - 60 || hs.x > worldRightBound() + 60) this._hammerShock = null;
    }

    // ── Broomstick Q: Broom Ride — aerial body-check while flying ────────────────
    if (this._broomRide) {
      const br = this._broomRide;
      br.timer--;
      // Spawn sparkle trail every other frame
      if (br.timer % 2 === 0) spawnParticles(this.cx(), this.cy(), '#ddbb88', 3);
      const _brAll = [...players, ...trainingDummies, ...minions];
      for (const f of _brAll) {
        if (!isHostileTarget(this, f) || br.hitSet.has(f)) continue;
        if (Math.hypot(f.cx() - this.cx(), f.cy() - this.cy()) < 52) {
          dealDamage(this, f, 16, 20);
          f.vx += this.facing * 16;
          f.vy = -8;
          br.hitSet.add(f);
          spawnParticles(f.cx(), f.cy(), '#cc9966', 12);
          screenShake = Math.max(screenShake, 12);
        }
      }
      if (br.timer <= 0 || (this.onGround && br.timer < 18)) this._broomRide = null;
    }

    // ── Scythe Q: Scythe Toss — spinning blade flies out and returns ──────────────
    if (this._scytheToss) {
      const st = this._scytheToss;
      st.angle += 0.28;
      st.timer--;
      if (!st.returning) {
        st.x += st.vx; st.y += st.vy; st.vy += 0.12;
        if (st.timer < 22) st.returning = true;
      } else {
        const _stdx = this.cx() - st.x;
        const _stdy = this.cy() - st.y;
        const _stdd = Math.hypot(_stdx, _stdy) || 1;
        st.vx += (_stdx / _stdd) * 1.6;
        st.vy += (_stdy / _stdd) * 1.6;
        const _stspd = Math.hypot(st.vx, st.vy);
        if (_stspd > 14) { st.vx = st.vx / _stspd * 14; st.vy = st.vy / _stspd * 14; }
        if (_stdd < 28) { this._scytheToss = null; return; }
      }
      const _stAll = [...players, ...trainingDummies, ...minions];
      for (const f of _stAll) {
        if (!isHostileTarget(this, f)) continue;
        if (st.returning && st.hitSetReturn.has(f)) continue;
        if (!st.returning && st.hitSetGo.has(f)) continue;
        if (Math.hypot(f.cx() - st.x, f.cy() - st.y) < 24) {
          const _stDmg = st.returning ? 14 : 22;
          dealDamage(this, f, _stDmg, 9);
          (st.returning ? st.hitSetReturn : st.hitSetGo).add(f);
          spawnParticles(st.x, st.y, '#aa44aa', 10);
          screenShake = Math.max(screenShake, 8);
        }
      }
      if (st.timer <= 0) this._scytheToss = null;
    }

    if (this.shieldCooldown > 0)       this.shieldCooldown--; // legacy — kept at 0
    // Shield recharge: tick down while not shielding; when it hits 0 stacks fully reset
    if (!this.shielding && this.shieldRechargeTimer > 0) {
      this.shieldRechargeTimer--;
      if (this.shieldRechargeTimer === 0) { this.shieldStacks = 0; this.shieldHP = 0; }
    }
    if (this._projDeflectCd > 0)       this._projDeflectCd--;
    if (this._parryVulnFrames > 0)     this._parryVulnFrames--;
    if (this.contactDamageCooldown > 0) this.contactDamageCooldown--;
    // Reload ticker — refill clip when timer expires
    if (this._reloadTimer > 0) {
      if (this.hurtTimer > 0 && !this._reloadInterrupted) {
        this._reloadTimer = this.weapon && this.weapon.reloadFrames ? Math.round(this.weapon.reloadFrames * 1.18) : this._reloadTimer;
        this._reloadInterrupted = true;
      }
      this._reloadTimer--;
      if (this._reloadTimer === 0 && this.weapon && this.weapon.clipSize) {
        this._ammo = this.weapon.clipSize;
        this._reloadInterrupted = false;
        if (!this.isAI) SoundManager.pickup && SoundManager.pickup();
      }
    }
    if (this.hurtTimer <= 0) this._reloadInterrupted = false;
    if (this.superFlashTimer > 0)      this.superFlashTimer--;
    if (this.spartanRageTimer > 0) this.spartanRageTimer--;
    this.animTimer++;

    if (this.noCooldownsActive) {
      this.cooldown = 0; this.cooldown2 = 0;
      this.abilityCooldown = 0; this.abilityCooldown2 = 0;
      this.shieldCooldown = 0; this.boostCooldown = 0;
    }
    // Story mode: runtime enforcement — ranged weapons silently swap to sword
    if (storyModeActive && !this.isBoss && this.weapon && this.weapon.type === 'ranged') {
      if (typeof WEAPONS !== 'undefined' && WEAPONS.sword) {
        this.weapon = WEAPONS.sword;
        this.weaponKey = 'sword';
        this._ammo = 0;
      }
    }

    // ---- RAGDOLL SPIN PHYSICS ----
    if (this.ragdollTimer > 0) {
      this.ragdollAngle += this.ragdollSpin;
      this.ragdollSpin  *= 0.97; // gradually decelerate spin
    } else {
      this.ragdollAngle = 0;
      this.ragdollSpin  = 0;
    }

    // ---- PER-LIMB SPRING-DAMPER RAGDOLL ----
    // Lazily init on first update; runs every frame to keep pose smooth.
    if (!this._rd) PlayerRagdoll.createRagdoll(this);
    PlayerRagdoll.updateLimbs(this);
    // Lean torso into movement direction
    if (Math.abs(this.vx) > 0.5) PlayerRagdoll.applyMovement(this);

    // ---- WEAPON ARC HITBOX (melee only) — sweeps multiple points along swing arc ----
    // Use _prevAtkTimer so hit detection also runs on the final swing frame (timer 1→0),
    // ensuring weaponHit is correctly set before the whiff-stun check below.
    if (_prevAtkTimer > 0 && this.weapon.type === 'melee') {
      // Build a set of hit-check points: tip + mid-arc + close-arc for wide coverage
      const hitPoints = this._getMeleeArcPoints();
      if (hitPoints.length > 0) {
        const hitPad = 6; // tight horizontal pad — reduces phantom hits from behind/above

        // Helper: is any hit point inside the target's box?
        // Y-axis tolerance tightened to ±4px to prevent phantom hits above/below.
        // Directional guard ensures hit points are on the attacker's facing side.
        const arcHits = (tx, ty, tw, th, extraPad) => {
          const ep = extraPad || 0;
          const facingSign = this.facing;
          const sCx = this.cx();
          for (const pt of hitPoints) {
            // Directional pruning: discard points clearly behind the attacker's facing direction
            if (facingSign * (pt.x - sCx) < -12) continue;
            if (pt.x > tx - hitPad - ep && pt.x < tx + tw + hitPad + ep &&
                pt.y > ty - 4  - ep    && pt.y < ty + th + 4  + ep) return true;
          }
          return false;
        };

        // All players in range (multi-target — not locked to primary target)
        for (const tgt of players) {
          // Allies are transparent to the swing: without this they get added to
          // swingHitTargets, set weaponHit, and can even cancel our attack via the
          // trade-prevention branch below — all for zero damage.
          if (!isHostileTarget(this, tgt)) continue;
          // Vertical separation guard: require meaningful bounding-box overlap (~55px center gap)
          if (Math.abs((this.y + this.h / 2) - (tgt.y + tgt.h / 2)) > 55) continue;
          // Block friendly fire unless survival competitive mode explicitly enables it
          const _survFFM = gameMode === 'minigames' && minigameType === 'survival' && survivalFriendlyFire;
          if (!_survFFM && gameMode === 'boss' && !this.isBoss && !tgt.isBoss) continue;
          // Block friendly fire in minigames ONLY for survival team mode
          if (gameMode === 'minigames' && minigameType === 'survival' && !_survFFM && !this.isBoss && !tgt.isBoss && !tgt.isAI && !this.isAI) continue;
          if (!this.swingHitTargets.has(tgt) && arcHits(tgt.x, tgt.y, tgt.w, tgt.h, this.weaponKey === 'whip' ? 10 : 0)) {
            // ── TRADE PREVENTION ──────────────────────────────────────────────────────
            // If tgt is also mid-swing with a melee weapon, only the fighter who started
            // their attack first lands the hit. The later attacker's swing is cancelled.
            if (!this.isBoss && !tgt.isBoss && tgt.weapon && tgt.weapon.type === 'melee' && tgt.attackTimer > 0) {
              const _myStart  = this._attackStartFrame  || 0;
              const _tgtStart = tgt._attackStartFrame   || 0;
              if (_myStart >= _tgtStart) {
                // tgt attacked first (or same frame) — cancel our swing so only tgt's hit registers
                this.attackTimer = 0;
                this.weaponHit   = false;
                break;
              } else {
                // We attacked first — cancel tgt's pending swing
                tgt.attackTimer = 0;
              }
            }
            dealDamage(this, tgt, this._swingDamage(tgt), this.weapon.kb);
            this.swingHitTargets.add(tgt);
            this.weaponHit = true;
            if (this.weaponKey === 'katana') {
              if (!this._swordSlashes) this._swordSlashes = [];
              this._swordSlashes.push({ x: tgt.cx(), y: tgt.cy(), vx: this.facing * 7, vy: -0.4,
                tilt: this.facing * 0.18, facing: this.facing, life: 20, maxLife: 20, size: 20, color: '#aaaadd', hitSet: new Set() });
            } else if (this.weaponKey === 'flail') {
              tgt.vy = Math.min(tgt.vy, -10); // chain ball sends upward
              spawnParticles(tgt.cx(), tgt.cy(), '#bbbbbb', 10);
              screenShake = Math.max(screenShake, 8);
            } else if (this.weaponKey === 'whip') {
              const _wt = this._weaponTip;
              const _wCrack = this._whipLastCrack;
              // A crack reads loud: bigger burst, longer rope, screen shake and a
              // brief stagger. A body hit is a dull slap with none of that.
              this._whipCrack = { x: _wt ? _wt.x : tgt.cx(), y: _wt ? _wt.y : tgt.cy(),
                                  timer: _wCrack ? 16 : 8, big: _wCrack };
              this._whipRope  = { tx: tgt.cx(), ty: tgt.cy(), timer: _wCrack ? 12 : 8 };
              this._whipApplyBleed(tgt, _wCrack);
              if (_wCrack) {
                tgt.stunTimer = Math.max(tgt.stunTimer || 0, 11);
                tgt._whipSlow = Math.max(tgt._whipSlow || 0, 14);
                spawnParticles(this._whipCrack.x, this._whipCrack.y, '#ffee99', 12);
                screenShake = Math.max(screenShake, 9);
              }
            } else if (this.weaponKey === 'electricstaff') {
              spawnParticles(tgt.cx(), tgt.cy(), '#00eeff', 12);
              typeof spawnLightningBolt === 'function' && spawnLightningBolt(tgt.cx(), tgt.y);
              // Chain to nearest other enemy within 130px
              let _cTgt = null, _cDist = 999;
              const _cAll = [...players, ...trainingDummies, ...minions];
              for (const _cf of _cAll) {
                if (_cf === tgt || !isHostileTarget(this, _cf)) continue;
                const _cd = Math.hypot(_cf.cx() - tgt.cx(), _cf.cy() - tgt.cy());
                if (_cd < 130 && _cd < _cDist) { _cTgt = _cf; _cDist = _cd; }
              }
              if (_cTgt) {
                dealDamage(this, _cTgt, Math.floor((this.weapon.damage || 14) * 0.6), 4);
                typeof spawnLightningBolt === 'function' && spawnLightningBolt(_cTgt.cx(), _cTgt.y);
                spawnParticles(_cTgt.cx(), _cTgt.cy(), '#00eeff', 6);
                if (!this._chainArcs) this._chainArcs = [];
                this._chainArcs.push({ x1: tgt.cx(), y1: tgt.cy(), x2: _cTgt.cx(), y2: _cTgt.cy(), timer: 14 });
              }
            }
          }
        }
        // All minions in range (multi-hit — no break)
        if (!this.isMinion && !(this instanceof Boss)) {
          for (const mn of minions) {
            if (!this.swingHitTargets.has(mn) && mn.health > 0 && arcHits(mn.x, mn.y, mn.w, mn.h, 4)) {
              dealDamage(this, mn, this._swingDamage(mn), this.weapon.kb);
              if (this.weaponKey === 'whip') this._whipApplyBleed(mn, this._whipLastCrack);
              this.swingHitTargets.add(mn);
              this.weaponHit = true;
            }
          }
        }
        // All training dummies in range (multi-hit — no break)
        if (!this.isDummy) {
          for (const dum of trainingDummies) {
            if (dum === this) continue; // prevent ForestBeast (stored in trainingDummies) from hitting itself
            if (!this.swingHitTargets.has(dum) && dum.health > 0 && arcHits(dum.x, dum.y, dum.w, dum.h, 0)) {
              dealDamage(this, dum, this._swingDamage(dum), this.weapon.kb);
              if (this.weaponKey === 'whip') this._whipApplyBleed(dum, this._whipLastCrack);
              this.swingHitTargets.add(dum);
              this.weaponHit = true;
            }
          }
        }
        const tip = hitPoints[hitPoints.length - 1]; // use outermost point for platform sparks
        // Weapon bounces off platform surfaces → sparks + recoil
        if (!this.weaponHit) {
          for (const pl of currentArena.platforms) {
            if (tip.x > pl.x && tip.x < pl.x + pl.w &&
                tip.y > pl.y && tip.y < pl.y + pl.h) {
              spawnParticles(tip.x, tip.y, '#ffee88', 5);
              spawnParticles(tip.x, tip.y, '#ffffff', 3);
              screenShake = Math.max(screenShake, 5);
              this.attackTimer = Math.min(this.attackTimer, 4); // cut swing short
              this.weaponHit   = true;
              break;
            }
          }
        }
      }
    }

    // Trigger endlag when swing animation completes (attackTimer just hit 0).
    // Placed AFTER hit detection so weaponHit is accurate before the whiff-stun check.
    if (_prevAtkTimer === 1 && this.attackTimer === 0 && !this.isBoss) {
      let endlag = this.weapon.endlag || 0;
      // Whiff punish: extra recovery if swing missed + 30% chance of stun (stars overhead)
      if (!this.weaponHit) {
        endlag = Math.round(endlag * 2.4);
        if (Math.random() < 0.30) {
          this.stunTimer = Math.max(this.stunTimer || 0, 20 + Math.floor(Math.random() * 16));
        }
      }
      // Low stamina: sluggish recovery (up to +40% at 0 stamina)
      const staminaRatio = this.stamina / (this.maxStamina || 100);
      if (staminaRatio < 0.4) endlag = Math.round(endlag * (1 + 0.4 * (1 - staminaRatio / 0.4)));
      // Affinity feel: low affinity = sluggish recovery, high affinity = snappier recovery
      if (this.charClass && this.weapon && typeof CLASS_AFFINITY !== 'undefined') {
        const _aff = CLASS_AFFINITY[this.charClass];
        if (_aff) {
          const _affMult = _aff[this.weapon.type] || 1.0;
          if (_affMult < 0.8) endlag = Math.round(endlag * (1 + (_affMult < 0.6 ? 0.30 : 0.15)));
          else if (_affMult > 1.2) endlag = Math.round(endlag * (1 - (_affMult > 1.4 ? 0.20 : 0.10)));
        }
      }
      this.attackEndlag = endlag;
      // Stamina drain on attack
      const staminaCost = Math.min(this.stamina, (this.weapon.damage || 10) * 1.5);
      this.stamina = Math.max(0, this.stamina - staminaCost);
      // Clear super-active guard so subsequent normal attacks can charge meter again.
      // Supers with ongoing effects (hammer, axe, spear, sword) clear it themselves when those end.
      if (this.superActive && !this._hammerSpin && !this._axeWhirl && !this._spearCharge &&
          !(this._swordSlashes && this._swordSlashes.length) &&
          !(this._swordSlashQueue && this._swordSlashQueue.length) &&
          !this._comboSuper && !this._peaCluster && !this._gravityStone &&
          !(this._paperSwarm && this._paperSwarm.length) &&
          !this._shieldCharge && !this._thrownAxe && !this._thunderStrikes &&
          !this._flailOrbit && !this._whipCoil && !(this._boomerangs && this._boomerangs.length)) {
        this.superActive = false;
      }
      // Electric Staff overcharge: chain to nearby enemies after each melee swing
      if (this.weaponKey === 'electricstaff' && this._overcharged > 0 && this.weaponHit) {
        const _ecAll = [...players, ...trainingDummies, ...minions];
        for (const f of _ecAll) {
          if (!isHostileTarget(this, f)) continue;
          if (dist(this, f) < 160) {
            dealDamage(this, f, 10, 5);
            spawnParticles(f.cx(), f.cy(), '#00ddff', 6);
            typeof spawnLightningBolt === 'function' && spawnLightningBolt(f.cx(), f.y);
          }
        }
      }
    }

    // ---- PASSIVE WEAPON CONTACT (boss weapons only — gauntlet/mkgauntlet intentional) ----
    if (this.isBoss && this.weapon && this.weapon.contactDmgMult && this.attackTimer === 0 &&
        this.contactDamageCooldown === 0 && this.target) {
      const tgt = this.target;
      if (tgt.health > 0 && dist(this, tgt) < this.weapon.range * 0.62 * (this.drawScale || 1)) {
        const movingToward = (tgt.cx() > this.cx() && this.vx > 0.8) ||
                             (tgt.cx() < this.cx() && this.vx < -0.8);
        if (movingToward) {
          dealDamage(this, tgt, Math.max(1, Math.floor(this.weapon.damage * this.weapon.contactDmgMult)),
                                Math.floor(this.weapon.kb * 0.35));
          this.contactDamageCooldown = 32;
        }
      }
    }

    // AI: only update every AI_TICK_INTERVAL frames (smoother movement, less CPU)
    // _fusionAIOverride is handled by paradoxFusionUpdateAI() in the game loop — do NOT run stock AI
    // combatLock.blocks.ai gates the whole update during finishers, QTEs, and cinematics
    // The `this.target` term used to sit at the front of this gate, which made it
    // a deadlock: updateAI() is the ONLY routine caller of _acquireAITarget(), so
    // an AI fighter that came into the world without a target could never run the
    // code that would have found it one. Anything whose spawner remembered to
    // assign `.target` (boss minions, trainer bots) was fine; the Summoner's
    // familiar was not, and stood motionless for entire matches — measured at
    // 0 swings across 7200 frames with 60% uptime.
    // Acquisition is folded into the gate AFTER the aiTick check so it still only
    // runs on this fighter's own AI ticks, and _acquireAITarget() returns null
    // when nothing legal is alive — a targetless AI stays idle, as before.
    if (this.isAI && !this._fusionAIOverride &&
        !this._domainRising &&
        !activeCinematic &&
        !(typeof isCutsceneActive === 'function' && isCutsceneActive()) &&
        !(typeof isCombatLocked === 'function' && isCombatLocked('ai')) &&
        aiTick % (this.aiTickInterval || AI_TICK_INTERVAL) === 0 &&
        (this.target || this._acquireAITarget())) this.updateAI();

      // ── Standard game physics ──
      // godmode cheat: free flight for human player
      if (this.godmode && !this.isAI && !this.isBoss) {
        this.health = this.maxHealth;
        this.invincible = 9999;
        const fUp   = this.controls && keysDown.has(this.controls.jump);
        const fDown = this.controls && keysDown.has(this.controls.shield);
        this.vy = fUp ? -9 : (fDown ? 9 : this.vy * 0.7);
        this.onGround = true;
        this.x += this.vx * slowMotion;
        this.y += this.vy * slowMotion;
        this.vx *= 0.72;
        this.vx = clamp(this.vx, -13, 13);
        this.y = clamp(this.y, -200, GAME_H + 100);
        this._prevOnGround = true;
        return;
      }
      // Training designer: godmode + free flight for human player
      if (trainingDesignerOpen && !this.isAI && !this.isBoss) {
        this.health = this.maxHealth;
        this.invincible = 9999;
        // Free flight: zero out gravity, allow up/down movement via jump/shield keys
        const fUp   = this.controls && keysDown.has(this.controls.jump);
        const fDown = this.controls && keysDown.has(this.controls.shield);
        this.vy = fUp ? -6 : (fDown ? 6 : 0);
        this.onGround = true; // prevent double-jump consumption
        this.x += this.vx * slowMotion;
        this.y += this.vy * slowMotion;
        this.vx *= 0.72;
        this.vx = clamp(this.vx, -13, 13);
        this.y = clamp(this.y, -200, GAME_H + 100);
        this._prevOnGround = true;
        return; // skip normal physics this frame
      }
      const _chaosMoon = gameMode === 'minigames' && currentChaosModifiers.has('moon');
      const _arenaModGrav = ((currentArena.modifiers && currentArena.modifiers.gravityMult) || 1.0) *
        (gameMode === 'minigames' && typeof chaosGravityMult === 'number' ? chaosGravityMult : 1.0);
      const arenaGravity = (_chaosMoon ? 0.18 : (currentArena.isLowGravity ? 0.28 : (currentArena.isHeavyGravity ? 0.95 : (currentArena.earthPhysics ? 0.88 : 0.65)))) * _arenaModGrav;
      const gravDir = ((gameMode === 'trueform' || gameMode === 'story') && tfGravityInverted && !this.isBoss) ? -1 : 1;
      const _sm = slowMotion; // cinematic slow-motion time scale

      // ── GRAVITY FAILSAFE ─────────────────────────────────────────────────────
      // If _dimPunchGravLock is stuck (sequence was interrupted without cleanup), clear it.
      if (this._dimPunchGravLock) {
        const _dpActive = (typeof tfDimensionPunch !== 'undefined') && tfDimensionPunch != null;
        if (!_dpActive) {
          this._dimPunchGravLock = false;
          console.warn('[PHYS] gravity lock cleared by failsafe on', this.name || 'fighter');
        }
      }

      // Dimension punch gravity lock / domain rising: skip gravity while floating
      if (!this._dimPunchGravLock && !this._domainRising) {
        this.vy += arenaGravity * gravDir * _sm;
      } else if (this._domainRising) {
        // Lock horizontal drift — input runs before this so we enforce it here
        this.vx = 0;
      }
      this.x  += this.vx * _sm;
      // Exact pre-integration foot position, for one-way (passUnder) platforms.
      // Reconstructing this from vy inside checkPlatform() is unreliable — vy is
      // clamped and re-written after integration — so record it here instead.
      this._passPrevBottom = this.y + this.h;
      this.y  += this.vy * _sm;
      const _chaosSlip = gameMode === 'minigames' && currentChaosModifiers.has('slippery');
      const _arenaModFric = (currentArena.modifiers && currentArena.modifiers.frictionMult) || 1.0;
      const _baseFric = (this.onGround && (currentArena.isIcy || _chaosSlip)) ? 0.975 : (this.onGround ? 0.78 : 0.94);
      // frictionMult > 1 = more grip (higher deceleration); < 1 = more slip
      const friction = 1 - (1 - _baseFric) * _arenaModFric;
      this.vx *= friction;
      // During dimension travel, allow vx beyond the normal cap
      const _vxMax = this._dimPunchGravLock ? 60 : 13;
      this.vx  = clamp(this.vx, -_vxMax, _vxMax);
      const vyMax = currentArena.isLowGravity ? 10 : 19;
      this.vy  = clamp(this.vy, -20, vyMax);

      // ── VELOCITY SANITY LOG (debug) ──────────────────────────────────────────
      if (debugMode && (Math.abs(this.vx) > 11 || Math.abs(this.vy) > 17)) {
        console.warn('[PHYS] high velocity', this.name || 'fighter', 'vx:', this.vx.toFixed(1), 'vy:', this.vy.toFixed(1));
      }
      this.onGround = false;
      // Inverted gravity ceiling bounce
      if (gameMode === 'trueform' && tfGravityInverted && !this.isBoss && this.y < 0) {
        this.y = 0; this.vy = Math.abs(this.vy) * 0.4;
      }
      // No ceiling — camera zooms out to follow players upward
      // Story/story-only arenas: hard wall at portal face + flag for teleport-back flash
      const _storyWalls = storyModeActive || (currentArena && currentArena.isStoryOnly);
      if (_storyWalls && !this.isBoss && gameMode !== 'exploration') {
        // _bOff=25: aligns the wall with the portal column's right/left visual face
        // (portal center at mapLeft+10, column is 30px wide → face at mapLeft+10±15 → mapLeft+25)
        const _bOff = (currentArena && currentArena.boundaryPortals) ? 25 : 30;
        const softLeft  = currentArena && currentArena.mapLeft  !== undefined ? currentArena.mapLeft  + _bOff : -60;
        const softRight = currentArena && currentArena.mapRight !== undefined ? currentArena.mapRight - this.w - _bOff : GAME_W - this.w + 60;
        if (this.x < softLeft) {
          this.x  = softLeft;          // hard wall: stop right at the portal face
          if (this.vx < 0) this.vx = 0;
          this._storyBoundaryBreached = 'left';  // flag for flash-teleport-back
        } else if (this.x > softRight) {
          this.x  = softRight;
          if (this.vx > 0) this.vx = 0;
          this._storyBoundaryBreached = 'right';
        } else {
          this._storyBoundaryBreached = null;
        }
      }
      for (const pl of currentArena.platforms) this.checkPlatform(pl);
      this._voidSafetyFrame(); // Per-frame void/lava safety — bypasses AI tick delay

    // Coyote time: if player just walked off a platform (was on ground, now isn't),
    // grant 6 frames where a ground jump is still possible
    if (this._prevOnGround && !this.onGround && this.vy > -5 && !this.isBoss) {
      // Walked off edge (vy > -5 means didn't jump off)
      if (this.coyoteFrames === 0) this.coyoteFrames = 6;
    }
    // Megaknight: record Y when leaving ground for fall-height damage
    if (this.charClass === 'megaknight' && this._prevOnGround && !this.onGround) {
      this._fallStartY = this.y;
    }
    // Enable double jump for ALL entities (including AI/Boss/TrueForm) when they jump off ground
    if (this._prevOnGround && !this.onGround && this.vy <= -5) {
      this.canDoubleJump = true;
    }
    if (this.coyoteFrames > 0 && !this.onGround) this.coyoteFrames--;
    if (this._lavaJumpGrace > 0) { if (this.onGround) this._lavaJumpGrace = 0; else this._lavaJumpGrace--; }
    this._prevOnGround = this.onGround;

    // Horizontal clamp — boss arenas with no worldWidth get hard walls at 0/GAME_W;
    // large-world boss arenas (like absolute_axiom_domain) use worldWidth bounds instead.
    if (currentArena.isBossArena && !currentArena.worldWidth) {
      if (this.x < 0)               { this.x = 0;               this.vx =  Math.abs(this.vx) * 0.25; }
      if (this.x + this.w > GAME_W) { this.x = GAME_W - this.w; this.vx = -Math.abs(this.vx) * 0.25; }
    } else if (currentArena.worldWidth) {
      const mapLeft  = currentArena.mapLeft  !== undefined ? currentArena.mapLeft  : -(currentArena.worldWidth - GAME_W) / 2;
      const mapRight = currentArena.mapRight !== undefined ? currentArena.mapRight : (currentArena.worldWidth + GAME_W) / 2;
      // Story arenas with boundary portals use portal teleports instead of hard walls
      const _usePortals = storyModeActive && currentArena.boundaryPortals;
      if (!_usePortals) {
        if (this.x < mapLeft)               { this.x = mapLeft;               this.vx =  Math.abs(this.vx) * 0.25; }
        if (this.x + this.w > mapRight)     { this.x = mapRight - this.w;     this.vx = -Math.abs(this.vx) * 0.25; }
      }
    }
    // No clamp on standard arenas — players can drift slightly off edges; deathY handles falling

    // Death by falling / lava
    const dyY = currentArena.deathY;
    // Lava burn: damage + bounce when feet touch lava surface
    if (currentArena.hasLava && !this.isBoss && this.y + this.h > currentArena.lavaY && this.health > 0) {
      this.lavaBurnTimer++;
      if (!this.godmode) {
        if (this.vy > 0) {
          this.vy = -16; // lava bounce
          this.canDoubleJump = true; // refill double jump on lava bounce
          this._lavaJumpGrace = 45; // refill ground jump too — lava sits low enough that one jump can't clear it
        }
        this.vx *= 0.88;
        // Apply immediate damage on first contact and every 6 frames thereafter
        // Routes through dealDamage so shield, iframes, and anti-stack checks apply
        if (this.lavaBurnTimer === 1 || this.lavaBurnTimer % 6 === 0) {
          // Ramping lava damage: starts gentle, escalates with sustained contact
          let _lavaDmg = 4;
          if (this.lavaBurnTimer > 120) _lavaDmg = 8;
          else if (this.lavaBurnTimer > 60) _lavaDmg = 6;
          dealDamage(null, this, _lavaDmg, 0, 1.0, false, 6);
          if (settings.particles) spawnParticles(this.cx(), this.cy(), '#ff6600', 8);
          if (settings.particles) spawnParticles(this.cx(), this.cy(), '#ffaa00', 5);
          if (settings.screenShake) screenShake = Math.max(screenShake, 4);
        }
      }
    } else {
      this.lavaBurnTimer = 0;
    }
    // Story mode: soft bottom boundary — flag for portal catch instead of hard clamp
    if (storyModeActive && !this.isBoss && this.y + this.h > dyY - 20) {
      this._storyBottomBreached = true;
    } else if (storyModeActive) {
      this._storyBottomBreached = false;
    }
    // Hard death (fell off screen or health ran out from lava)
    // Remote players: skip — their death is handled on their own machine
    if (!this.isRemote && this.y > dyY && this.health > 0) {
      if (this.isBoss) bossTeleport(this, true);
      else if (!this.godmode) this.health = 0;
    }

    this.updateState();

    // Auto-face: AI only — human players face from last key press (set in processInput)
    if (this.isAI) {
      if (this.target) this.facing = this.target.cx() > this.cx() ? 1 : -1;
      else if (Math.abs(this.vx) > 0.5) this.facing = this.vx > 0 ? 1 : -1;
    }

    // godmode visual: keep HP bar full for clarity
    if (this.godmode) this.health = this.maxHealth;

    // Apply speed/power buffs from map perks
    if (this._speedBuff > 0) this._speedBuff--;
    if (this._powerBuff > 0) this._powerBuff--;

    // Tick down active curses
    if (this.curses && this.curses.length > 0) {
      this.curses = this.curses.filter(c => {
        c.timer--;
        return c.timer > 0;
      });
    }

    // ---- CLASS PASSIVE PERK (fires once per life at HP threshold) ----
    if (!this.classPerkUsed && this.charClass !== 'none' && this.health > 0 && this.target) {
      const pct = this.health / this.maxHealth;

      // THOR: Lightning Storm at ≤20% HP — 2 strikes after a visible 600ms windup.
      // Damage routed through dealDamage so shields/multipliers/achievements apply.
      // Stun reduced (25f) and windup gives a dodge window before the first strike.
      if (this.charClass === 'thor' && pct <= 0.20) {
        this.classPerkUsed = true;
        screenShake = Math.max(screenShake, 16);
        spawnParticles(this.cx(), this.cy(), '#ffff00', 20);
        spawnParticles(this.cx(), this.cy(), '#88ddff', 10);
        const _t    = this.target;
        const _thor = this;
        const _strikeFn = () => {
          if (!gameRunning || !_t || _t.health <= 0 || _thor.health <= 0) return;
          spawnLightningBolt(_t.cx(), _t.y);
          spawnParticles(_t.cx(), _t.cy(), '#ffff00', 18);
          spawnParticles(_t.cx(), _t.cy(), '#ffffff', 10);
          if (settings.screenShake) screenShake = Math.max(screenShake, 10);
          dealDamage(_thor, _t, 8, 0);
          // Apply stun post-dealDamage so it stacks with (rather than overwrites) KB stun
          if (_t.health > 0) _t.stunTimer = Math.max(_t.stunTimer, 25);
        };
        setTimeout(_strikeFn, 600);  // windup: target can dodge the first bolt
        setTimeout(_strikeFn, 950);  // follow-up
      }

      // KRATOS: Spartan Rage at ≤15% HP — 5s damage boost; heals 10% of damage dealt during rage
      if (this.charClass === 'kratos' && pct <= 0.15) {
        this.classPerkUsed     = true;
        this.spartanRageTimer  = 300;
        this._spartanRageHealPool = 0; // resets each activation
        screenShake = Math.max(screenShake, 24);
        spawnParticles(this.cx(), this.cy(), '#ff4400', 30);
        spawnParticles(this.cx(), this.cy(), '#ff8800', 18);
        spawnParticles(this.cx(), this.cy(), '#ffffff',  8);
      }

      // NINJA: Shadow Step at ≤25% HP — 2s invincibility + all cooldowns reset
      if (this.charClass === 'ninja' && pct <= 0.25) {
        this.classPerkUsed = true;
        this.invincible = 120;
        this.cooldown = 0; this.abilityCooldown = 0; this.shieldCooldown = 0; this.boostCooldown = 0;
        screenShake = Math.max(screenShake, 14);
        spawnParticles(this.cx(), this.cy(), '#44ff88', 30);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 14);
      }

      // GUNNER: Last Stand at ≤20% HP — 8 bullets burst in all directions
      if (this.charClass === 'gunner' && pct <= 0.20) {
        this.classPerkUsed = true;
        screenShake = Math.max(screenShake, 26);
        spawnParticles(this.cx(), this.cy(), '#ff6600', 28);
        spawnParticles(this.cx(), this.cy(), '#ffaa00', 14);
        for (let _j = 0; _j < 8; _j++) {
          const _ang = (_j / 8) * Math.PI * 2;
          const _spd = 11 + Math.random() * 3;
          const _dmg = Math.floor(Math.random() * 3) + 3;
          projectiles.push(new Projectile(
            this.cx(), this.cy(),
            Math.cos(_ang) * _spd, Math.sin(_ang) * _spd,
            this, _dmg, '#ff4400'
          ));
        }
      }

      // ARCHER: Back-Step at ≤20% HP — auto-dash backward + reset double jump
      if (this.charClass === 'archer' && pct <= 0.20 && this.onGround) {
        this.classPerkUsed = true;
        this.vx = -this.facing * 20;
        this.canDoubleJump = true;
        spawnParticles(this.cx(), this.cy(), '#aad47a', 16);
      }

      // PALADIN: Holy Light at ≤25% HP — AoE heal pulse
      if (this.charClass === 'paladin' && pct <= 0.25) {
        this.classPerkUsed = true;
        this.health = Math.min(this.maxHealth, this.health + 20);
        screenShake = Math.max(screenShake, 14);
        spawnParticles(this.cx(), this.cy(), '#ffffaa', 28);
        spawnParticles(this.cx(), this.cy(), '#88aaff', 14);
        for (const p of players) {
          if (p === this || p.health <= 0) continue;
          if (dist(this, p) < 130) dealDamage(this, p, 15, 8);
        }
      }

      // BERSERKER: Blood Frenzy at ≤15% HP — 3s damage boost + speed boost
      if (this.charClass === 'berserker' && pct <= 0.15) {
        this.classPerkUsed = true;
        this._powerBuff   = 180; // 3s damage boost via existing power buff
        this._speedBuff   = 180; // also speed boost
        screenShake = Math.max(screenShake, 20);
        spawnParticles(this.cx(), this.cy(), '#ff2200', 24);
        spawnParticles(this.cx(), this.cy(), '#880000', 12);
      }

      // (Megaknight perk is now the super — no passive HP-threshold trigger)

      // PUGILIST: Surge Strike at ≤20% HP — auto-launches Combo Strike for free
      if (this.charClass === 'pugilist' && pct <= 0.20 && !this._comboSuper) {
        this.classPerkUsed = true;
        const _sfAll = [...players, ...trainingDummies, ...minions];
        let _sfTgt = null, _sfDist = 9999;
        for (const f of _sfAll) {
          if (!isHostileTarget(this, f)) continue;
          const _d = Math.hypot(f.cx() - this.cx(), f.cy() - this.cy());
          if (_d < _sfDist) { _sfTgt = f; _sfDist = _d; }
        }
        this._comboSuper = {
          phase: 0, timer: 0, target: _sfTgt,
          kickDone: false, punchDone: false,
          impactX: 0, impactY: 0, impactFlash: 0,
          aim: 0, fire: false,
        };
        if (_sfTgt) this.facing = _sfTgt.cx() > this.cx() ? 1 : -1;
        this.invincible = Math.max(this.invincible || 0, 55);
        this.superActive = true;
        screenShake = Math.max(screenShake, 20);
        spawnParticles(this.cx(), this.cy(), '#ff4444', 24);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 12);
      }

      // REAPER: Revive at ≤8% HP — restore to 40% HP once
      if (this.charClass === 'reaper' && pct <= 0.08) {
        this.classPerkUsed = true;
        this.health = Math.round(this.maxHealth * 0.40);
        this.invincible = Math.max(this.invincible, 60);
        screenShake = Math.max(screenShake, 20);
        spawnParticles(this.cx(), this.cy(), '#aa44aa', 32);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 16);
        spawnRing(this.cx(), this.cy());
      }

      // SUMMONER: Desperate Bond at ≤20% HP — immediately spawn/empower familiar
      if (this.charClass === 'summoner' && pct <= 0.20) {
        this.classPerkUsed = true;
        if (!this._familiar || this._familiar.health <= 0) this._spawnFamiliar();
        if (this._familiar && this._familiar.health > 0) {
          // Desperate Bond is advertised as a 10s empowerment, but dmgMult was set
          // permanently and nothing ever restored it — the familiar kept the buff
          // for the rest of the match, stacking with the +35% _powerBuff already
          // grants. Drive the boost off a timer that restores the base value.
          const _fam = this._familiar;
          _fam._baseDmgMult   = _fam._baseDmgMult != null ? _fam._baseDmgMult : _fam.dmgMult;
          _fam.dmgMult        = _fam._baseDmgMult * 1.7;
          // No _powerBuff here: that is a separate +35% in dealDamage() and stacking
          // it on top of the 1.7x made the real figure +130%, not the advertised +70%.
          _fam._empowerFrames = 600;
          spawnParticles(this._familiar.cx(), this._familiar.cy(), '#44ccff', 24);
          spawnParticles(this._familiar.cx(), this._familiar.cy(), '#ffffff', 10);
        }
        screenShake = Math.max(screenShake, 16);
        spawnParticles(this.cx(), this.cy(), '#44ccff', 20);
      }
    }

    // SUMMONER: passive familiar timer (outside HP-perk block so it ticks every frame)
    if (this.charClass === 'summoner' && gameRunning && this.health > 0 && !isCinematic) {
      // Desperate Bond empowerment expiry — restore the familiar's base damage.
      if (this._familiar && this._familiar._empowerFrames > 0) {
        if (--this._familiar._empowerFrames <= 0 && this._familiar._baseDmgMult != null) {
          this._familiar.dmgMult = this._familiar._baseDmgMult;
        }
      }
      if (this._familiar && this._familiar.health <= 0) {
        this._familiar = null;
        // Killing the familiar has to buy real time or it is not worth attacking.
        this._familiarRespawn = 600;
      }
      if (this._familiarRespawn > 0) {
        this._familiarRespawn--;
      } else if (!this._familiar) {
        // The FIRST familiar arrives immediately. Waiting 900 frames for it meant
        // the opening fifteen seconds of every match were played by a 120 HP
        // fighter with no class perk at all — the Summoner's entire kit is the
        // second body, so until it exists the class is strictly worse than none.
        // Subsequent spawns keep the 15s cadence (and a kill still costs 10s on
        // top of it, via _familiarRespawn).
        if (!this._familiarEverSpawned) { this._spawnFamiliar(); }
        else {
          this._familiarTimer = (this._familiarTimer || 0) + 1;
          if (this._familiarTimer >= 900) this._spawnFamiliar();
        }
      }
    }
  }

  // Retire the current familiar, if any. health = 0 is enough — gameLoop culls
  // minions[] every frame (smb-loop-core.js) — but the reference must be cleared
  // here too so the passive timer does not treat it as still alive.
  _despawnFamiliar() {
    const fam = this._familiar;
    this._familiar = null;
    if (!fam) return;
    if (fam.health > 0) {
      fam.health = 0;
      if (typeof spawnParticles === 'function') spawnParticles(fam.cx(), fam.cy(), '#44ccff', 14);
    }
  }

  _spawnFamiliar() {
    if (!gameRunning || typeof Minion === 'undefined') return;
    // Hard cap of one: any earlier familiar is retired before a new one appears.
    if (this._familiar) this._despawnFamiliar();
    const fam = new Minion(this.cx() - 20 * this.facing, this.y);
    // Minion's constructor difficulty ('hard') is tuned for the story swarm, where
    // a minion only has to be a body. A familiar fighting a single evasive opponent
    // at that setting connected with 11% of the swings it was allowed to take —
    // 13 damage across a two-minute match. Expert pursuit speed is what lets the
    // whiff-guard clear a swing at all against a target that moves.
    fam.aiDiff        = 'expert';
    fam.intelligence  = 0.85;
    const famTeamId   = 'fam_' + this.playerNum + '_' + Date.now();
    fam._teamId       = famTeamId;
    this._teamId      = famTeamId;
    fam.color         = '#44ccff';
    fam.name          = 'FAMILIAR';
    fam._isFamiliar   = true;
    // 65 HP put the familiar inside two Sovereign swings, so the answer to a
    // Summoner was "swat it once on the way past" and the class had no second
    // body for most of the fight. 110 is still fragile — a committed pass still
    // kills it — but it has to be a committed pass.
    fam.health        = 110;
    fam.maxHealth     = 110;
    // 0.45 on a 15-damage axe is ~7 a hit. It is a chip unit, not a damage
    // dealer, but chip has to be legible or the class reads as broken.
    fam.dmgMult       = 0.6;
    // kbResist 0.15 made the familiar almost impossible to displace, so the only
    // counterplay to a permanent second body was killing it. 0.5 lets it be swatted
    // away — repositioning it is now a real answer.
    fam.kbResist      = 0.5;
    // The familiar is a chip/pressure unit, not a launcher. Low KB output is what
    // stops it feeding a juggle to its owner (see FAMILIAR JUGGLE GUARD in
    // dealDamage() for the airborne case this pairs with).
    fam.kbBonus       = 0.3;
    fam._baseDmgMult  = fam.dmgMult;
    fam._empowerFrames = 0;
    this._familiar    = fam;
    this._familiarTimer = 0;
    this._familiarEverSpawned = true;
    if (typeof minions !== 'undefined') minions.push(fam);
    // Engage on frame one. The gate in update() can now acquire for itself, but
    // that costs an AI tick of standing still, and inheriting the summoner's own
    // target is a better first guess than "nearest body" for a unit whose whole
    // job is to pressure whoever the summoner is fighting.
    fam.target = (this.target && this.target.health > 0 && !areAlliedEntities(fam, this.target))
      ? this.target : fam._acquireAITarget();
    spawnParticles(this.cx(), this.cy(), '#44ccff', 20);
    spawnParticles(this.cx(), this.cy(), '#aaeeff', 10);
  }

  checkPlatform(pl) {
    if (pl.isFloorDisabled) return;
    // Broad-phase: skip if no overlap at all
    if (this.x + this.w <= pl.x || this.x >= pl.x + pl.w ||
        this.y + this.h <= pl.y || this.y >= pl.y + pl.h) return;

    // ── ONE-WAY / PASS-UNDER PLATFORMS ──────────────────────────────────────
    // Set per-platform via `passUnder: true` (currently The Circuit's three decks
    // and nothing else — every other arena keeps fully solid platforms).
    // Such a platform exists only as a surface to LAND on: a fighter rising into
    // it passes straight through instead of bonking. Returning here leaves only
    // the dTop branch reachable, so landing keeps its full behaviour (edge grip,
    // squash, dust, megaknight fall damage) while the underside and BOTH side
    // faces stop resolving. Dropping the side faces is deliberate — otherwise a
    // fighter rising past the deck's edge column gets ejected sideways instead of
    // passing through, and a horizontally sliding deck (CircuitPlate) would shove
    // anyone standing next to it.
    if (pl.passUnder) {
      if (this.vy < 0) return;                                          // rising
      const _prevBottom = (this._passPrevBottom !== undefined) ? this._passPrevBottom
                                                               : (this.y + this.h);
      if (_prevBottom > pl.y + 2) return;   // feet were already at/below the surface
    }

    // Penetration depth on each side
    const dTop    = (this.y + this.h) - pl.y;      // player bottom into platform top
    const dBottom = (pl.y + pl.h)    - this.y;     // player top  into platform bottom
    const dLeft   = (this.x + this.w) - pl.x;      // player right into platform left
    const dRight  = (pl.x + pl.w)    - this.x;     // player left  into platform right

    const minPen = Math.min(dTop, dBottom, dLeft, dRight);

    if (minPen === dTop && this.vy >= 0) {
      // Fell onto top surface
      const landVy = this.vy;
      this.y           = pl.y - this.h;
      this.vy          = 0;
      this.onGround    = true;
      this.canDoubleJump = false; // reset on landing; re-enabled by jumping
      // Edge grip: if player is within 4px past a platform edge, nudge them back
      // Prevents frustrating slip-offs when barely touching a platform
      if (!this.isBoss) {
        const overLeft  = pl.x - (this.x + this.w);   // +ve = player barely on left edge
        const overRight = this.x - (pl.x + pl.w);     // +ve = player barely on right edge
        if (overLeft  >= 0 && overLeft  < 4) this.x = pl.x - this.w + 1;
        if (overRight >= 0 && overRight < 4) this.x = pl.x + pl.w - 1;
      }
      // Bouncy platform — launch player upward
      if (pl.isBouncy && landVy > 1) {
        pl.sinkOffset = (pl.sinkOffset || 0) + Math.min(landVy * 0.5, 22);
        this.vy = -Math.max(18, landVy * 1.1); // bounce up with at least 18 force
        this.canDoubleJump = true;              // refill double jump on bounce
        this.onGround = false;
        spawnParticles(this.cx(), pl.y, '#ff88ff', 10);
      }
      // Landing squash animation trigger
      if (!this.isBoss && landVy > 5) this.squashTimer = 4;
      // Clear pending double-jump intent on landing
      if (this.isAI) this._pfDoubleJumpPending = false;
      // Landing dust — harder landing = more particles
      if (settings.landingDust && landVy > 4) {
        spawnParticles(this.cx(), pl.y, 'rgba(200,200,200,0.9)', Math.min(14, Math.floor(landVy * 1.2)));
        if (!this.isAI && landVy > 6) SoundManager.land();
      }
      // Stop ragdoll spin on landing
      if (this.ragdollTimer > 0 && landVy > 2) {
        spawnParticles(this.cx(), pl.y, this.color, 10);
        this.ragdollSpin = 0;
      }
      // MEGAKNIGHT: Fall-height landing damage (any normal landing, not just Mega Jump)
      if (this.charClass === 'megaknight' && !this._megaJumping && !this._spawnFalling &&
          this._fallStartY !== null && landVy > 5) {
        const fallHeight = Math.max(0, this.y - this._fallStartY); // positive = fell down
        if (fallHeight > 40) {
          const dmg = Math.max(5, Math.min(40, Math.floor(fallHeight * 0.15)));
          const _allF = [...players, ...minions, ...trainingDummies];
          let hitAny = false;
          for (const f of _allF) {
            if (!isHostileTarget(this, f)) continue;
            const _d = Math.hypot(f.cx() - this.cx(), f.cy() - this.cy());
            if (_d < 100) {
              dealDamage(this, f, Math.round(dmg * (1 - _d/100)), Math.round(20 * (1 - _d/100)));
              hitAny = true;
            }
          }
          if (hitAny || fallHeight > 80) {
            // Shockwave particle ring
            spawnParticles(this.cx(), pl.y, '#8844ff', Math.min(20, Math.floor(fallHeight * 0.2)));
            spawnParticles(this.cx(), pl.y, '#ffffff', 8);
            if (settings.screenShake) screenShake = Math.max(screenShake, Math.min(fallHeight * 0.1, 14));
          }
        }
        this._fallStartY = null;
      }
      // MEGAKNIGHT: Mega Jump shockwave on landing
      if (this._megaJumping && !this._megaJumpLanded && landVy > 8) {
        this._megaJumping    = false;
        this._megaJumpLanded = true;
        this.invincible      = 0;
        screenShake = Math.max(screenShake, 36);
        spawnParticles(this.cx(), pl.y, '#8844ff', 40);
        spawnParticles(this.cx(), pl.y, '#cc88ff', 22);
        spawnParticles(this.cx(), pl.y, '#ffffff', 14);
        const _allF = [...players, ...minions, ...trainingDummies];
        for (const f of _allF) {
          if (!isHostileTarget(this, f)) continue;
          const _d = Math.hypot(f.cx() - this.cx(), f.cy() - this.cy());
          if (_d < 220) {
            const _pct = 1 - _d / 220;
            dealDamage(this, f, Math.round(62 * _pct), Math.round(72 * _pct));
            // Mega Jump is the super — it keeps its full launch regardless of the
            // decay chain, since it is spent from the meter, not spammable.
            applyLaunch(this, f, -28 * _pct, { ignoreAirGuard: true });
            f.vx += Math.sign(f.cx() - this.cx()) * 14 * _pct;
          }
        }
        SoundManager.explosion && SoundManager.explosion();
        this.superActive = false;
      }
      // MEGAKNIGHT: spawn-fall landing — deals AoE damage when dropping in from sky
      if (this._spawnFalling && landVy > 6) {
        this._spawnFalling = false;
        this.invincible    = 0;
        screenShake = Math.max(screenShake, 32);
        spawnParticles(this.cx(), pl.y, '#8844ff', 36);
        spawnParticles(this.cx(), pl.y, '#ffffff', 22);
        camHitZoomTimer = 20;
        const _allFS = [...players, ...minions, ...trainingDummies];
        for (const f of _allFS) {
          if (!isHostileTarget(this, f)) continue;
          const _d = Math.hypot(f.cx() - this.cx(), f.cy() - this.cy());
          if (_d < 200) {
            const _p = 1 - _d / 200;
            dealDamage(this, f, Math.round(35 * _p), 50 * _p);
            applyLaunch(this, f, -18 * _p, { ignoreAirGuard: true }); // once-per-spawn entrance
          }
        }
        SoundManager.explosion && SoundManager.explosion();
      }
    } else if (minPen === dBottom && this.vy <= 0) {
      // Bumped head on underside
      this.y  = pl.y + pl.h;
      this.vy = Math.abs(this.vy) * 0.1; // small bounce so gravity takes over
    } else if (minPen === dLeft) {
      // Hit right face of platform (player moving right)
      this.x  = pl.x - this.w;
      this.vx = Math.min(this.vx, 0);
      this._wallHitT = 8; // breaks a sprint — see updateFragmentManifest()
    } else if (minPen === dRight) {
      // Hit left face of platform (player moving left)
      this.x  = pl.x + pl.w;
      this.vx = Math.max(this.vx, 0);
      this._wallHitT = 8;
    }
  }

  // Player state machine: idle | run | jump | fall | attack | stunned | ragdoll | dead
  updateState() {
    this._updateDegradation();
    if (this.health <= 0)              this.state = 'dead';
    else if (this.ragdollTimer > 0)     this.state = 'ragdoll';
    else if (this.hurtTimer > 0)       this.state = 'hurt';
    else if (this.stunTimer > 0)       this.state = 'stunned';
    else if (this.attackTimer > 0)     this.state = 'attacking';
    else if (this.shielding)           this.state = 'shielding';
    else if (!this.onGround)           this.state = this.vy < 0 ? 'jumping' : 'falling';
    else if (Math.abs(this.vx) > 0.7)  this.state = 'walking';
    else                               this.state = 'idle';
    // Fragment weapon manifestation + walk→sprint escalation (smb-fragment-manifest.js).
    // Runs after state is resolved because both read this.state.
    if (typeof updateFragmentManifest === 'function') updateFragmentManifest(this);
  }

  // ── Degradation bookkeeping (cuts / bruises / blood) ──────────────────────
  // dealDamage() only ever ADDS to _damageAccumThisLife, so before this existed a
  // fighter could be healed back to full HP and still be visibly bleeding for the
  // rest of the life. Healing is the reverse of damage: any rise in health closes
  // an equal amount of accumulated damage, and reaching full HP clears it outright.
  // Single central watcher — no need to touch the ~30 scattered heal call sites.
  _updateDegradation() {
    const hp   = this.health;
    const prev = (typeof this._lastHealthSeen === 'number') ? this._lastHealthSeen : hp;
    if (hp > prev) {
      this._damageAccumThisLife = Math.max(0, (this._damageAccumThisLife || 0) - (hp - prev));
    }
    // Fully restored = fully mended, regardless of how the accumulator got there.
    if (this.maxHealth > 0 && hp >= this.maxHealth) this._damageAccumThisLife = 0;
    this._lastHealthSeen = hp;

    // Ease the rendered value: wounds appear the instant they land, but close over
    // ~1s after a heal instead of popping off mid-frame.
    const target = this._damageAccumThisLife || 0;
    let   vis    = this._degradeVisual || 0;
    if (target >= vis) vis = target;
    else               vis = Math.max(target, vis - 2.5);
    this._degradeVisual = vis;
  }

  // Returns weapon-tip world position during a melee swing, or null if not attacking.
  getWeaponTipPos() {
    if (this.attackTimer <= 0) return null;
    const cx         = this.cx();
    // Shared with draw() via FIG_* in smb-globals.js so this cannot drift.
    const shoulderY  = this.y + FIG_SHOULDER_DY;
    const _sc        = this.drawScale || 1;
    const armLen     = FIG_ARM_LEN * _sc;
    const atkP       = 1 - this.attackTimer / this.attackDuration;
    // Megaknight: upward arc — fist sweeps from low to high
    let ang, reachFrac = 1;
    if (this.charClass === 'megaknight') {
      ang = this.facing > 0
        ? lerp(1.2, -1.1, atkP)
        : lerp(Math.PI - 1.2, Math.PI + 1.1, atkP);
    } else {
      const _sp = swingPose(this.weaponKey, atkP, this.facing, this._jabAlt);
      ang = _sp.ang;
      reachFrac = _sp.reachFrac;
    }
    const tipLens = { sword: 26, hammer: 30, axe: 23, spear: 40, gauntlet: 22, mkgauntlet: 30 };
    const _swg    = (typeof WEAPON_SWINGS !== 'undefined') ? WEAPON_SWINGS[this.weaponKey] : null;
    const wLen    = ((_swg && _swg.tipLen) || tipLens[this.weaponKey] || 23) * _sc;
    const reach   = (armLen + wLen) * reachFrac;
    return {
      x: cx         + Math.cos(ang) * reach,
      y: shoulderY  + Math.sin(ang) * reach
    };
  }

  // Returns 3 points along the weapon swing arc for broad hitbox coverage.
  // Includes the inner arm, mid-arc, and tip — so enemies right next to the
  // attacker or slightly misaligned still get hit.
  _getMeleeArcPoints() {
    if (this.attackTimer < 0) return [];
    const cx        = this.cx();
    const shoulderY = this.y + FIG_SHOULDER_DY;
    const _sc2      = this.drawScale || 1;
    const armLen    = FIG_ARM_LEN * _sc2;
    const atkP      = 1 - this.attackTimer / this.attackDuration;
    const tipLens = { sword: 26, hammer: 30, axe: 23, spear: 40, gauntlet: 22, mkgauntlet: 30, whip: 50, flail: 28 };
    const _swg2   = (typeof WEAPON_SWINGS !== 'undefined') ? WEAPON_SWINGS[this.weaponKey] : null;
    const wLen    = ((_swg2 && _swg2.tipLen) || tipLens[this.weaponKey] || 23) * _sc2;
    // Sample inner (50%), mid (75%), and tip (100%) along the weapon; whip adds extra outer sample
    const fracs = (_swg2 && _swg2.hitFracs) || (this.weaponKey === 'whip' ? [0.40, 0.65, 0.85, 1.0] : [0.50, 0.75, 1.0]);

    // Pose(s) to sample. Snap/iai easings cross most of the arc in a few frames,
    // so a single per-frame angle snapshot leaves gaps the blade visibly swept
    // through — sub-frame sweep interpolation closes them (playtest: "I can't
    // hit anything" reports were real whiffs through moving targets).
    const poses = [];
    if (this.charClass === 'megaknight') {
      poses.push({
        ang: this.facing > 0 ? lerp(1.2, -1.1, atkP) : lerp(Math.PI - 1.2, Math.PI + 1.1, atkP),
        reachFrac: 1,
      });
    } else {
      const _now  = swingPose(this.weaponKey, atkP, this.facing, this._jabAlt);
      poses.push(_now);
      if (this.attackDuration > 0) {
        const prevP = Math.max(0, 1 - (this.attackTimer + 1) / this.attackDuration);
        const _prev = swingPose(this.weaponKey, prevP, this.facing, this._jabAlt);
        const dAng  = Math.abs(_now.ang - _prev.ang);
        const steps = Math.min(3, Math.floor(dAng / 0.14)); // one extra sample per ~0.14 rad swept
        for (let _si2 = 1; _si2 <= steps; _si2++) {
          poses.push(swingPose(this.weaponKey, prevP + (atkP - prevP) * _si2 / (steps + 1), this.facing, this._jabAlt));
        }
      }
    }
    const pts = [];
    for (const pose of poses) {
      const fullReach = (armLen + wLen) * pose.reachFrac;
      for (const frac of fracs) {
        pts.push({
          x: cx        + Math.cos(pose.ang) * fullReach * frac,
          y: shoulderY + Math.sin(pose.ang) * fullReach * frac,
        });
      }
    }
    return pts;
  }

  // Real center-to-center distance the melee weapon tip can reach a target.
  // Mirrors _getMeleeArcPoints geometry: arc tip = (armLen + weaponLen) * drawScale
  // from cx(); a hit lands once that tip enters the target box (+half-width +pad).
  // This is FAR shorter than the AI's loose `weapon.range*1.1+20` commit band —
  // the gap is what made bots whiff (and eat the harsh whiff-punish) constantly.
  _meleeReachDist(tgt) {
    const sc  = this.drawScale || 1;
    const _tl = { sword: 26, hammer: 30, axe: 23, spear: 40, gauntlet: 22, mkgauntlet: 30, whip: 50, flail: 28 };
    const _swg = (typeof WEAPON_SWINGS !== 'undefined') ? WEAPON_SWINGS[this.weaponKey] : null;
    const wLen = ((_swg && _swg.tipLen) || _tl[this.weaponKey] || 23) * sc;
    const armLen = FIG_ARM_LEN * sc;
    const tgtHalf = tgt ? tgt.w * 0.5 : 14;
    return (armLen + wLen) + tgtHalf + 8; // +8 ≈ hitPad + arc-forgiveness slack
  }

  // ── WHIP SWEET SPOT ───────────────────────────────────────────────────────────
  // The whip is the only melee weapon whose damage depends on WHERE on the cord the
  // hit lands. Past `crackDist` horizontally the lash is at the crack point and hits
  // for crackMult; inside that it is a slack rope and only chips. A target Hooked by
  // Lasso always counts as a crack and takes an extra multiplier on top.
  // Returns the damage for this swing and records the result on _whipLastCrack so the
  // post-hit branch can pick the right VFX/bleed without recomputing.
  _swingDamage(tgt) {
    const w = this.weapon;
    const base = w ? (w.damage || 0) : 0;
    if (this.weaponKey !== 'whip' || !tgt) { this._whipLastCrack = false; return base; }
    const gap    = Math.abs(tgt.cx() - this.cx());
    const hooked = (tgt._whipHooked > 0) && (!tgt._whipHookSrc || tgt._whipHookSrc === this);
    const crack  = hooked || gap >= (w.crackDist || 96) * (this.drawScale || 1);
    this._whipLastCrack = crack;
    let dmg = base;
    if (crack)  dmg *= (w.crackMult || 1.55);
    if (hooked) dmg *= (w.hookMult  || 1.35);
    return Math.round(dmg);
  }

  // Apply the lacerate bleed left by a whip hit. Refreshes rather than stacking, so
  // repeated pokes can't multiply the DoT — the crack simply leaves a deeper cut.
  _whipApplyBleed(tgt, crack) {
    if (!tgt || tgt.health <= 0) return;
    const w = this.weapon || {};
    const ticks = crack ? ((w.bleedTicks || 3) + 2) : (w.bleedTicks || 3);
    const dmg   = w.bleedDmg || 2;
    const cur   = tgt._whipBleed;
    tgt._whipBleed = {
      ticks: Math.max(ticks, cur ? cur.ticks : 0),
      dmg,
      timer: 26,          // frames until the next tick
      src:   this,
    };
  }

  // Approx frames into the swing when the blade reaches max forward extension
  // (i.e. when contact is most likely). Used to lead the target: project our
  // closing + the target's drift to this frame before deciding to swing.
  // Heavy weapons wind up first, so contact lands much later in the swing.
  _meleeContactFrames() {
    const _swg = (typeof WEAPON_SWINGS !== 'undefined') ? WEAPON_SWINGS[this.weaponKey] : null;
    const dur  = (_swg && _swg.dur) || 12;
    const ease = _swg && _swg.ease;
    const cp = ease === 'heavy' ? 0.62 : ease === 'sweep' ? 0.50 : ease === 'iai' ? 0.38 :
               ease === 'snap'  ? 0.30 : ease === 'crack' ? 0.50 : 0.42;
    return dur * cp;
  }

  // ---- ATTACK ----
  attack(target) {
    if (isCinematic) return; // no new attacks during cinematics or finishers
    if (this.backstageHiding) return;
    if (this.state === 'dead' || this.state === 'stunned' || this.state === 'ragdoll') return;
    if (this.cooldown > 0 || this.health <= 0 || this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if (!this.isBoss && this.attackEndlag > 0) return; // enforced swing recovery window
    if (this.shielding) return;

    // MEGAKNIGHT: Uppercut Slam — upward fist swing, wide arc, sends enemies skyward
    if (this.charClass === 'megaknight') {
      this.cooldown     = this.attackCooldownMult ? Math.max(1, Math.ceil(this.weapon.cooldown * this.attackCooldownMult)) : this.weapon.cooldown;
      this.attackDuration = 12; // reset in case a cinematic stretched it
      this.attackTimer  = this.attackDuration;
      this.superChargeRate = 2;
      this.weaponHit    = false;
      SoundManager.heavyHit && SoundManager.heavyHit();
      const _allF = [...players, ...minions, ...trainingDummies];
      for (const f of _allF) {
        if (!isHostileTarget(this, f)) continue;
        const relX = f.cx() - this.cx();
        const relY = f.cy() - this.cy();
        // Wide upward arc in front — 185px range, generous vertical tolerance.
        // Deliberately absurd: Megaknight is a troll class, not a balance target.
        if (Math.hypot(relX, relY) < 185 && (relX * this.facing > -50)) {
          dealDamage(this, f, this.weapon.damage, this.weapon.kb);
          // Governed launch — repeated uppercuts inside the window decay so the
          // target always gets back to the floor. See applyLaunch() in smb-combat.js.
          applyLaunch(this, f, -26);
          f.vx += this.facing * 5;           // slight forward push, mostly vertical
          this.weaponHit = true;
        }
      }
      // NOTE: this branch deliberately returns before the shared swing-recovery
      // block, so Uppercut Slam has no endlag and no stamina cost. That is not an
      // oversight — Megaknight is a joke class and is barred from boss fights
      // (see the troll-class bar in _startGameCore). Do not "fix" it.

      // Upward arc particle burst
      spawnParticles(this.cx() + this.facing * 35, this.y,      '#8844ff', 18);
      spawnParticles(this.cx() + this.facing * 35, this.y - 20, '#cc88ff', 10);
      spawnParticles(this.cx() + this.facing * 35, this.y - 35, '#ffffff',  6);
      screenShake = Math.max(screenShake, 11);
      return;
    }

    if (!this.weapon) return;

    // ── AI MELEE WHIFF-GUARD ────────────────────────────────────────────
    // The melee hitbox is a swept weapon-tip arc whose real reach is only
    // armLen+tipLen — much shorter than the loose `weapon.range*1.1+20` band
    // the AI commits in. Post weapon-rework the swing also lands several frames
    // in (windup), so bots were committing to swings that could never connect,
    // then eating the harsh whiff-punish (2.4× endlag + 30% stun) — the
    // "lobotomized" feel. Project our closing + the target's drift to the
    // swing's contact frame; if the blade still won't reach, abort WITHOUT
    // consuming the cooldown so the bot keeps closing and only swings when a
    // hit is actually plausible. AI-only; players keep full manual control.
    if (this.isAI && !this.isBoss && this.weapon.type === 'melee' && !this._envSwing &&
        // _noWhiffGuard is a PER-FIGHTER opt-out. The global AI_WHIFF_GUARD flag
        // cannot be used to make one combatant swing freely, because this guard
        // applies to every `isAI && !isBoss` fighter — Sovereign included — so
        // flipping it globally degrades both sides of a training match at once.
        !this._noWhiffGuard &&
        (typeof window === 'undefined' || window.AI_WHIFF_GUARD !== false)) {
      const _gT = target || this.target;
      if (_gT && _gT.health > 0) {
        const _cf   = this._meleeContactFrames();
        const _sc   = this.drawScale || 1;
        const _dir  = (_gT.cx() - this.cx()) >= 0 ? 1 : -1;
        // Assumed pursuit speed ≈ this bot's difficulty move speed (it closes in
        // after committing — movement logic runs later this tick). Easy bots
        // close slower so they commit from closer; expert bots reach further.
        const _pursue = this.aiDiff === 'easy' ? 3.4 : this.aiDiff === 'medium' ? 4.4
                      : this.aiDiff === 'expert' ? 5.6 : 5.0;
        // Distance we can erase by closing during the swing's windup (use our
        // current closing speed if we're already moving in faster than that).
        const _close = Math.max(this.vx * _dir, _pursue * _sc) * _cf;
        // How much the target drifts during the swing (+ = fleeing out of reach).
        const _drift = (_gT.vx || 0) * _cf * _dir;
        const _projGap = Math.abs(_gT.cx() - this.cx()) + _drift - _close;
        const _vGap    = Math.abs((this.y + this.h / 2) - (_gT.y + _gT.h / 2));
        if (_projGap > this._meleeReachDist(_gT) || _vGap > 60) return;
      }
    }

    // Per-weapon swing grammar: distinct duration per melee weapon (legacy 12 otherwise).
    // Bosses keep their own attackDuration handling (cinematics set it directly).
    if (!this.isBoss) {
      const _sg = (typeof WEAPON_SWINGS !== 'undefined') ? WEAPON_SWINGS[this.weaponKey] : null;
      this.attackDuration = (this.weapon.type === 'melee' && _sg && _sg.dur) ? _sg.dur : 12;
      if (_sg && _sg.alternate) this._jabAlt = !this._jabAlt; // combat: high jab / body hook
    }
    if (this.weapon.type === 'melee') {
      // Use closest enemy (dummy, minion, or training target) if target is null
      const _atkTarget = target || this.target || trainingDummies[0] || players.find(p => p !== this);
      // Damage is delivered via weapon-tip hitbox in update() — just start the swing
      // Always clear swingHitTargets so previous swing's targets can be hit again
      this.weaponHit = false;
      this.swingHitTargets.clear();
      if (!_atkTarget || dist(this, _atkTarget) < this.weapon.range * 1.4 * (this.drawScale || 1)) {
        if (!this.isAI) SoundManager.swing();
      }
    } else {
      const _distToTarget = target ? dist(this, target) : 999;
      const _pointBlankT  = !this.isBoss ? Math.max(0, 1 - clamp((_distToTarget - 48) / 72, 0, 1)) : 0;
      // Ranged: close-range disadvantage — add extra cooldown when enemy is point-blank (<70px)
      if (!this.isBoss && _distToTarget < 70) {
        const _pbPenalty = Math.round((this.weapon.cooldown || 30) * 0.35);
        this.cooldown = Math.max(this.cooldown, _pbPenalty); // stacks with normal cooldown
      }
      // Ranged: check ammo clip
      if (this.weapon.clipSize) {
        if (this._reloadTimer > 0) return; // currently reloading — can't shoot
        if (this._ammo <= 0) {
          // Out of ammo — start reload
          this._reloadTimer = Math.round(this.weapon.reloadFrames * 1.18);
          this._reloadInterrupted = false;
          return;
        }
        this._ammo--;
        // Auto-trigger reload when last round is fired
        if (this._ammo === 0) {
          this._reloadTimer = Math.round(this.weapon.reloadFrames * 1.18);
          this._reloadInterrupted = false;
        }
      }
      if (!this.isAI) SoundManager.shoot();
      const bSpd = this.weapon.bulletSpeed || 13;
      const bClr = this.weapon.bulletColor || '#ffdd00';
      const bVy  = this.weapon.bulletVy  || 0;
      const _baseDmg = this.weapon.damageFunc ? this.weapon.damageFunc() : this.weapon.damage;
      const _closeDmgMult = 1 - _pointBlankT * 0.34;
      const dmg  = Math.max(1, Math.round(_baseDmg * _closeDmgMult));
      // Slingshot: auto-aim regular shot at nearest enemy (arc adjusted to lead target)
      let _bvx = this.facing * bSpd, _bvy = bVy;
      if (this.weaponKey === 'slingshot') {
        const _aimPool = [...players, ...trainingDummies, ...minions].filter(p => isHostileTarget(this, p));
        const _aimT = _aimPool.sort((a,b) => dist(this,a) - dist(this,b))[0];
        if (_aimT) {
          const _adx = _aimT.cx() - this.cx(), _ady = _aimT.cy() - this.cy();
          const _alen = Math.hypot(_adx, _ady) || 1;
          _bvx = (_adx / _alen) * bSpd;
          _bvy = (_ady / _alen) * bSpd;
        }
      }
      // Movement-based spread (same logic as spawnBullet)
      const _atkSpd    = Math.abs(this.vx);
      const _atkRapid  = this.weapon.cooldown <= 20;
      const _recoilHeat = Math.min(8, this._rangedShotHeat + 1);
      const _atkSpread = (_atkSpd > 0.8 ? (_atkSpd / 5.2) * (_atkRapid ? 2.0 : 1.25) * 0.70 : 0)
                       + _recoilHeat * (_atkRapid ? 0.28 : 0.18)
                       + _pointBlankT * (_atkRapid ? 1.45 : 0.95);
      const _atkVyOff  = _atkSpread > 0 ? (Math.random() - 0.5) * _atkSpread : 0;
      // ── Special-cased ranged attacks that bypass the generic Projectile ──────────
      if (this.weaponKey === 'boomerang') {
        // Throw a visible, non-returning boomerang (oneWay = fades on timeout, no return arc)
        if (!this._boomerangs) this._boomerangs = [];
        this._boomerangs.push({
          x: this.cx() + this.facing * 20, y: this.cy() - 2,
          vx: this.facing * bSpd, vy: -0.8,
          timer: 32, oneWay: true,
          hitSetGo: new Set(), hitSetReturn: new Set(), returning: false,
        });
        spawnParticles(this.cx() + this.facing * 20, this.cy(), '#cc9944', 5);
      } else if (this.weaponKey === 'paperairplane') {
        // Fire a paper airplane that flies forward (drawn as a plane shape, not a dot)
        if (!this._paperPlanes) this._paperPlanes = [];
        this._paperPlanes.push({
          x: this.cx() + this.facing * 16, y: this.y + 18,
          vx: this.facing * bSpd, vy: (Math.random() - 0.5) * 0.6 - 0.4,
          life: 85, hitSet: new Set(),
        });
      } else if (this.weaponKey === 'flamethrower') {
        // Fire a tight cone of 3 short-range flame projectiles (stream, not a single bullet)
        const _ftOffs = [-0.45, 0, 0.45];
        for (const _fto of _ftOffs) {
          const _fp = new Projectile(
            this.cx() + this.facing * 14, this.y + 20,
            this.facing * 11 + (Math.random() - 0.5) * 1.2,
            _fto + (Math.random() - 0.5) * 0.3,
            this, dmg, '#ff5500'
          );
          _fp.life = 9;
          _fp._isFlame = true;
          _fp._warmupFrames = 0;
          projectiles.push(_fp);
        }
      } else {
        // Generic ranged Projectile
        const _proj = new Projectile(
          this.cx() + this.facing * 12, this.y + 22,
          _bvx, _bvy + _atkVyOff, this, dmg, bClr
        );
        _proj._closeRangePenalty = _pointBlankT;
        _proj._warmupFrames = _atkRapid ? 3 : 2;
        if (this.weaponKey === 'bow') _proj._isArrow = true;
        projectiles.push(_proj);
        // Gunner class: fire a second bullet (costs no extra ammo — it's the same shot)
        if (this.charClass === 'gunner') {
          const dmg2 = Math.max(1, Math.round((this.weapon.damageFunc ? this.weapon.damageFunc() : this.weapon.damage) * _closeDmgMult));
          const _proj2 = new Projectile(this.cx() + this.facing * 12, this.y + 28, this.facing * bSpd * 0.92, bVy - 0.8 + _atkVyOff, this, dmg2, bClr);
          _proj2._closeRangePenalty = _pointBlankT;
          _proj2._warmupFrames = _atkRapid ? 3 : 2;
          projectiles.push(_proj2);
        }
      }
      const _commitFrames = Math.max(10, Math.min(18, Math.round((this.weapon.cooldown || 30) * 0.42)));
      const _recoilPush = 0.6 + _recoilHeat * (_atkRapid ? 0.11 : 0.08);
      this.attackEndlag = Math.max(this.attackEndlag || 0, _commitFrames);
      this._rangedCommitTimer = Math.max(this._rangedCommitTimer, _commitFrames);
      this._rangedMovePenalty = Math.max(this._rangedMovePenalty, Math.round(_commitFrames * 1.55));
      this._rangedShotHeat = Math.min(8, this._rangedShotHeat + (_atkRapid ? 1.75 : 1.15) + _pointBlankT * 0.9);
      this._recentRangedUse = Math.min(180, this._recentRangedUse + 28);
      this._rangedRecoilKick = Math.max(this._rangedRecoilKick, _commitFrames);
      this.vx *= _atkRapid ? 0.58 : 0.68;
      this.vx -= this.facing * _recoilPush;
    }
    this.cooldown    = this.attackCooldownMult ? Math.max(1, Math.ceil(this.weapon.cooldown * this.attackCooldownMult)) : this.weapon.cooldown;
    this._attackStartFrame = (typeof frameCount !== 'undefined' ? frameCount : 0);
    this.attackTimer = this.attackDuration;
    // Affinity feel: low affinity slows movement during attack swing; high affinity lets you stay mobile
    if (!this.isBoss && this.charClass && this.weapon && typeof CLASS_AFFINITY !== 'undefined') {
      const _aff2 = CLASS_AFFINITY[this.charClass];
      if (_aff2) {
        const _affMult2 = _aff2[this.weapon.type] || 1.0;
        if (_affMult2 < 0.8) this._affinityMovePenalty = Math.round(this.attackDuration * 0.6); // sluggish during swing
        else if (_affMult2 > 1.2) this._affinityMovePenalty = 0; // no extra penalty
      }
    }
  }

  ability(target) {
    if (isCinematic) return; // no abilities during cinematics or finishers
    if (this.backstageHiding) return;
    if (this._storyNoAbility) return; // story progression — ability not yet unlocked
    if (this.state === 'dead' || this.state === 'stunned' || this.state === 'ragdoll') return;
    if (this.abilityCooldown > 0 || this.health <= 0 || this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if (!this.isBoss && this.attackEndlag > 0) return; // can't ability during swing recovery
    if (this.shielding) return;
    // MEGAKNIGHT class override: Q = Grand Slam — spinning slam that craters nearby enemies upward
    if (this.charClass === 'megaknight') {
      this.abilityCooldown  = 80;
      this.abilityCooldown2 = 80;
      this.attackTimer      = this.attackDuration; // drives the upward swing animation
      abilityFlashTimer = 14; abilityFlashPlayer = this;
      const _allF = [...players, ...minions, ...trainingDummies];
      let hitCount = 0;
      for (const f of _allF) {
        if (!isHostileTarget(this, f)) continue;
        const _d = Math.hypot(f.cx() - this.cx(), f.cy() - this.cy());
        if (_d < 160) {
          const _pct = 1 - _d / 160;
          dealDamage(this, f, Math.round(38 * _pct + 12), 28);
          applyLaunch(this, f, -36);   // massive upward launch (governed)
          f.vx += (f.cx() > this.cx() ? 1 : -1) * 8;
          hitCount++;
        }
      }
      spawnParticles(this.cx(), this.y,      '#8844ff', 28);
      spawnParticles(this.cx(), this.y - 20, '#cc88ff', hitCount > 0 ? 20 : 8);
      spawnParticles(this.cx(), this.y - 40, '#ffffff', hitCount > 0 ? 12 : 4);
      if (settings.screenShake) screenShake = Math.max(screenShake, hitCount > 0 ? 18 : 7);
      return;
    }
    const _safeTarget = target || this.target || trainingDummies[0] || players.find(p => p !== this && p.health > 0) || minions.find(m => m.health > 0);
    if (!_safeTarget) return; // no valid target — don't fire ability (avoids null crash in weapon ability functions)
    if (!this.weapon || typeof this.weapon.ability !== 'function') return; // weapon not loaded yet
    this.weapon.ability(this, _safeTarget);
    this.abilityCooldown = Math.round(this.weapon.abilityCooldown * (this._weaponAbilityCdMult || 1));
    this.attackTimer     = this.attackDuration * 2;
    abilityFlashTimer = 14; abilityFlashPlayer = this;
  }

  // Dedicated super / ultimate activation (separate button from Q)
  useSuper(target) {
    if (this.state === 'dead' || this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if (!this.superReady) return;
    if (this._storyNoSuper) return; // story progression — super not yet unlocked
    this.activateSuper(target);
  }

  activateSuper(target) {
    // ── Conviction: every 5th super triggers conviction instead of normal super ──
    // Supers spent inside your own domain don't advance the next one. The domain
    // buffs you and its hazards credit you super meter, so counting them let a
    // domain pay for its own successor.
    const _inOwnDomain = typeof DomainManager !== 'undefined'
      && typeof DomainManager.ownsDomain === 'function' && DomainManager.ownsDomain(this);
    if (!_inOwnDomain) this._domainSuperCount = (this._domainSuperCount || 0) + 1;
    const _domKey = (typeof DomainManager !== 'undefined' && DomainManager.domainKeyOf)
      ? DomainManager.domainKeyOf(this) : this.charClass;
    if (this._domainSuperCount >= 5
        && _domKey && _domKey !== 'none'
        && typeof DomainManager !== 'undefined'
        && typeof DOMAIN_DEFS !== 'undefined' && DOMAIN_DEFS[_domKey]) {
      this._domainSuperCount = 0;
      this.superMeter = 0;
      this.superReady = false;
      if (!this.isAI && !this.isBoss) { _achStats.superCount++; if (_achStats.superCount >= 10) unlockAchievement('super_saver'); }
      DomainManager.triggerExpansion(this);
      return;
    }

    // MEGAKNIGHT super: Mega Jump — massive leap into the sky, shockwave on landing
    if (this.charClass === 'megaknight') {
      this._megaJumping    = true;
      this._megaJumpLanded = false;
      this.vy              = -40;
      this.canDoubleJump   = true;
      this.superMeter      = 0;
      this.superReady      = false;
      this.superActive     = true; // block super meter charging from landing shockwave
      this.invincible      = Math.max(this.invincible, 120);
      screenShake = Math.max(screenShake, 20);
      spawnParticles(this.cx(), this.y + this.h, '#8844ff', 32);
      spawnParticles(this.cx(), this.y + this.h, '#cc88ff', 18);
      spawnParticles(this.cx(), this.y + this.h, '#ffffff', 10);
      SoundManager.explosion && SoundManager.explosion();
      setTimeout(() => { if (this) this.superActive = false; }, 3000); // fallback: MegaKnight may not land (e.g. falls off-map)
      return;
    }
    if (!this.isBoss) {
      this.health = Math.min(this.maxHealth, this.health + 40);
    }
    this.superMeter  = 0;
    this.superReady  = false;
    this.superActive = true; // block super-meter charging during this move
    setTimeout(() => { if (this) this.superActive = false; }, 1800); // fallback: clears if per-effect cleanup is somehow skipped
    screenShake      = Math.max(screenShake, 24);
    SoundManager.superActivate();
    if (!this.isAI && !this.isBoss) { _achStats.superCount++; if (_achStats.superCount >= 10) unlockAchievement('super_saver'); }
    spawnParticles(this.cx(), this.cy(), this.color,   36);
    spawnParticles(this.cx(), this.cy(), '#ffffff',    18);
    spawnParticles(this.cx(), this.cy(), '#ffd700',    12);
    this.attackTimer = this.attackDuration * 3;
    this.weaponHit   = false;
    if (!this.isBoss) this.invincible = Math.max(this.invincible, 90); // 1.5s i-frames on super
    // Resolve a safe target — target arg may be undefined in solo/training modes
    const _superTarget = target || this.target || trainingDummies[0] || players.find(p => p !== this && p.health > 0);
    const superMoves = {
      // ── Sword: Air Slash — three crescent blade arcs sweep outward ──────────────
      sword: () => {
        this._swordSlashes     = [];
        // kb: first two hits hold the target in place so the full string lands;
        // only the final slash launches
        this._swordSlashQueue  = [
          { delay: 0,  yOff: -8,  vy: -1.2, tilt:  0.3, kb: 0 },
          { delay: 10, yOff:  0,  vy: -0.4, tilt:  0,   kb: 0 },
          { delay: 20, yOff:  9,  vy:  0.5, tilt: -0.3, kb: 14 },
        ];
        spawnParticles(this.cx(), this.cy(), '#88ccff', 14);
        screenShake = Math.max(screenShake, 16);
      },
      // ── Hammer: Mjolnir Spin — spinning contact AoE then forward launch ─────────
      hammer: () => {
        this.spinning   = 45;
        this._hammerSpin = { timer: 45, hitSet: new Set() };
        screenShake = Math.max(screenShake, 22);
        spawnParticles(this.cx(), this.cy(), '#ffcc44', 20);
      },
      gun: () => {
        for (let i = 0; i < 14; i++) {
          setTimeout(() => {
            if (!gameRunning || this.health <= 0) return;
            spawnBullet(this, 14 + (Math.random() - 0.5) * 4, '#ff8800', Math.floor(Math.random() * 4) + 9);
          }, i * 50);
        }
      },
      // ── Axe: Axe Throw — hurl the axe across the arena; it curves back ─────────
      axe: () => {
        const _atTgt = _superTarget;
        const _atVx  = _atTgt
          ? ((_atTgt.cx() - this.cx()) / Math.max(1, Math.abs(_atTgt.cx() - this.cx()))) * 10
          : this.facing * 10;
        this._thrownAxe = {
          x:         this.cx() + this.facing * 20,
          y:         this.cy(),
          vx:        _atVx,
          vy:        -4,
          angle:     0,
          timer:     90,
          returning: false,
          hitSet:    new Set(),
        };
        spawnParticles(this.cx(), this.cy(), '#ff8833', 22);
        spawnParticles(this.cx(), this.cy(), '#ffcc44', 10);
        screenShake = Math.max(screenShake, 20);
      },
      // ── Spear: Lance Charge — short forward pierce burst ────────────────────────
      spear: () => {
        this._spearCharge = { timer: 26, hitSet: new Set() };
        this.vx  = this.facing * 14;
        this.vy  = -2;
        spawnParticles(this.cx(), this.cy(), '#ffaa44', 14);
        screenShake = Math.max(screenShake, 14);
      },
      // ── Bow: Arrow Rain — 8 spread arrows arc outward ───────────────────────
      bow: () => {
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            if (!gameRunning || this.health <= 0) return;
            const angle = -0.48 + (i / 7) * 0.96;
            const spd   = 16;
            const dmg   = 24 + Math.floor(Math.random() * 10);
            const _bArrow = new Projectile(
              this.cx() + this.facing * 14, this.y + 20,
              this.facing * spd * Math.cos(angle), spd * Math.sin(angle) - 5,
              this, dmg, '#ffee44'
            );
            _bArrow._isArrow = true;
            projectiles.push(_bArrow);
          }, i * 55);
        }
        spawnParticles(this.cx(), this.cy(), '#ffee44', 16);
      },
      // ── Shield: Fortress Charge — blazing forward rush with trail and slam ──────
      shield: () => {
        this._shieldCharge = { timer: 22, hitSet: new Set() };
        this.vx = this.facing * 28;
        this.vy = Math.min(this.vy, -2);
        spawnParticles(this.cx(), this.cy(), '#88aaff', 30);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 12);
        spawnRing(this.cx(), this.cy());
        screenShake = Math.max(screenShake, 36);
      },
      // ── Scythe: Soul Reap — forward reaping sweep, heals per target hit ─────────
      scythe: () => {
        this.spinning  = 90;
        this.vx        = this.facing * 18;
        this.vy        = -5;
        screenShake    = Math.max(screenShake, 24);
        // Spawn crescent slash arcs sweeping in the charge direction
        this._swordSlashes = this._swordSlashes || [];
        for (let i = 0; i < 4; i++) {
          const yOff = (i - 1.5) * 14;
          this._swordSlashes.push({
            x: this.cx() + this.facing * 20,
            y: this.y + this.h * 0.38 + yOff,
            vx: this.facing * 9,
            vy: yOff * 0.04,
            tilt: this.facing * 0.5,
            life: 50, maxLife: 50,
            size: 30,
            color: '#cc44cc',
            hitSet: new Set(),
          });
        }
        let healed = 0;
        const _scAll = [...players, ...trainingDummies, ...minions];
        for (const f of _scAll) {
          if (!isHostileTarget(this, f)) continue;
          if (dist(this, f) < 210) { dealDamage(this, f, 32, 16); healed++; }
        }
        if (healed > 0) {
          this.health = Math.min(this.maxHealth, this.health + healed * 14);
          spawnParticles(this.cx(), this.cy(), '#cc44cc', 28);
        }
        spawnRing(this.cx(), this.cy());
      },
      // ── Frying Pan: Grand Slam — overhead smash launches target straight up ──────
      fryingpan: () => {
        screenShake = Math.max(screenShake, 36);
        this.vy = -6; // user leaps up into the slam
        const _slAll = [...players, ...trainingDummies, ...minions];
        for (const f of _slAll) {
          if (!isHostileTarget(this, f)) continue;
          if (dist(this, f) < 150) {
            dealDamage(this, f, 45, 8);
            f.vy = -32;  // launched straight up
            f.vx *= 0.2;
            f.stunTimer = Math.max(f.stunTimer || 0, 22);
            spawnParticles(f.cx(), f.cy(), '#ffdd44', 22);
            spawnParticles(f.cx(), f.cy(), '#ffffff', 10);
          }
        }
        spawnRing(this.cx(), this.cy());
      },
      // ── Broomstick: Storm Sweep — spin + extreme edge-push on all nearby ─────
      broomstick: () => {
        this.spinning = 90;
        screenShake   = Math.max(screenShake, 28);
        const _bAll   = [...players, ...trainingDummies, ...minions];
        for (const f of _bAll) {
          if (!isHostileTarget(this, f)) continue;
          if (dist(this, f) < 250) {
            const dir = f.cx() > this.cx() ? 1 : -1;
            dealDamage(this, f, 38, 16);
            f.vx = dir * 36;
            spawnParticles(f.cx(), f.cy(), '#cc9966', 10);
          }
        }
        spawnRing(this.cx(), this.cy());
      },
      // ── Combat: Combo Strike — dash → kick up → power punch away ───────────────
      combat: () => {
        const _csAll = [...players, ...trainingDummies, ...minions];
        let _csTgt = null, _csDist = 9999;
        for (const f of _csAll) {
          if (!isHostileTarget(this, f)) continue;
          const _d = Math.hypot(f.cx() - this.cx(), f.cy() - this.cy());
          if (_d < _csDist) { _csTgt = f; _csDist = _d; }
        }
        this._comboSuper = {
          phase:     0,   // 0=dash 1=uppercut 2=fall-back 3=aim 4=kick
          timer:     0,
          target:    _csTgt,
          kickDone:  false,
          punchDone: false,
          impactX:   0,
          impactY:   0,
          impactFlash: 0,
          aim:       0,      // kick angle, radians — set when the aim window opens
          fire:      false,  // set by the attack key (smb-input.js) to commit early
        };
        if (_csTgt) this.facing = _csTgt.cx() > this.cx() ? 1 : -1;
        this.invincible = Math.max(this.invincible || 0, 55);
        screenShake = Math.max(screenShake, 10);
        spawnParticles(this.cx(), this.cy(), '#ff4444', 14);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 6);
      },
      // ── Pea Shooter: Cluster Bomb — travels then bursts into 10 radial peas ────
      peashooter: () => {
        this._peaCluster = {
          x:    this.cx() + this.facing * 16,
          y:    this.y + 22,
          vx:   this.facing * 9,
          vy:   -2,
          life: 100,
        };
        spawnParticles(this.cx(), this.cy(), '#44ff44', 14);
        screenShake = Math.max(screenShake, 10);
      },
      // ── Slingshot: Gravity Stone — slow boulder; detonates with a gravity pull ──
      slingshot: () => {
        const _sdx  = _superTarget ? (_superTarget.cx() - this.cx()) : this.facing * 300;
        const _sdy  = _superTarget ? (_superTarget.cy() - this.cy()) : 0;
        const _slen = Math.hypot(_sdx, _sdy) || 1;
        this._gravityStone = {
          x:    this.cx() + this.facing * 16,
          y:    this.y + 22,
          vx:   (_sdx / _slen) * 5,
          vy:   (_sdy / _slen) * 5 - 1,
          life: 120,
        };
        spawnParticles(this.cx(), this.cy(), '#ff9933', 14);
        screenShake = Math.max(screenShake, 12);
      },
      // ── Paper Airplane: Origami Swarm — 8 homing planes that chase and track ──
      paperairplane: () => {
        this._paperSwarm = [];
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const spd   = 4 + Math.random() * 3;
          this._paperSwarm.push({
            x:      this.cx(),
            y:      this.cy(),
            vx:     Math.cos(angle) * spd,
            vy:     Math.sin(angle) * spd,
            life:   220 + Math.floor(Math.random() * 60),
            hitSet: new Set(),
          });
        }
        spawnParticles(this.cx(), this.cy(), '#aaccff', 22);
        screenShake = Math.max(screenShake, 12);
      },
      // ── Flail: Orbit Storm — ball orbits for 65 frames dealing contact damage ───
      flail: () => {
        this._flailOrbit = { timer: 85, angle: 0, hitCd: {}, ballX: 0, ballY: 0 };
        this._flailBall  = null;
        spawnRing(this.cx(), this.cy());
        spawnParticles(this.cx(), this.cy(), '#aaaaaa', 18);
        screenShake = Math.max(screenShake, 18);
      },
      // ── Whip: Serpent's Coil — three extending lashes out to 430px ──────────────
      // Deliberately NOT another pull: Q already yanks. This is the zoner's reach
      // turned into a barrage — it hits from further than any other melee super and
      // the third lash launches, so it opens the air game instead of closing distance.
      whip: () => {
        this._whipCoil = {
          t: 0, lash: -1, dir: this.facing, maxReach: 430,
          reach: 0, tipX: this.cx(), tipY: this.cy(), hitSet: new Set(),
        };
        spawnParticles(this.cx(), this.cy(), '#ffcc55', 18);
        screenShake = Math.max(screenShake, 14);
      },
      // ── Boomerang: Boomerang Blitz — 4-way 360° burst; all return ───────────────
      boomerang: () => {
        if (!this._boomerangs) this._boomerangs = [];
        // Four directions: forward, backward, up-forward diagonal, up-backward diagonal
        const _bbDirs = [
          { vx: this.facing * 11,  vy: -1   },  // forward
          { vx: -this.facing * 11, vy: -1   },  // backward (catches flankers)
          { vx: this.facing * 7,   vy: -10  },  // steep upward arc
          { vx: -this.facing * 7,  vy: -10  },  // upward backward arc
        ];
        for (const d of _bbDirs) {
          this._boomerangs.push({
            x:            this.cx(),
            y:            this.cy(),
            vx:           d.vx,
            vy:           d.vy,
            timer:        55,
            returning:    false,
            hitSetGo:     new Set(),
            hitSetReturn: new Set(),
          });
        }
        spawnParticles(this.cx(), this.cy(), '#cc9944', 28);
        spawnRing(this.cx(), this.cy());
        screenShake = Math.max(screenShake, 18);
      },
      // ── Katana: Shadow Step — instant teleport to far side of enemy + slash ──────
      katana: () => {
        const _kAll = [...players, ...trainingDummies, ...minions];
        let _kTgt = null, _kDist = 9999;
        for (const f of _kAll) {
          if (!isHostileTarget(this, f)) continue;
          const _kd = dist(this, f);
          if (_kd < _kDist) { _kTgt = f; _kDist = _kd; }
        }
        this._swordSlashes = this._swordSlashes || [];
        if (_kTgt && _kDist < 450) {
          // Teleport to opposite side of target (max range 450px)
          const _kDir = _kTgt.cx() > this.cx() ? 1 : -1;
          this.x = _kDir > 0 ? _kTgt.x + _kTgt.w + 8 : _kTgt.x - this.w - 8;
          this.y = _kTgt.y;
          this.facing = -_kDir;
          this.vx = 0; this.vy = 0;
          // 3 slash arcs sweeping at the target from the new position
          for (let i = 0; i < 3; i++) {
            const yOff = (i - 1) * 12;
            this._swordSlashes.push({
              x: this.cx() + this.facing * (14 + i * 16),
              y: this.y + this.h * 0.38 + yOff,
              vx: this.facing * 8, vy: yOff * 0.04,
              tilt: this.facing * 0.4, facing: this.facing,
              life: 35, maxLife: 35, size: 26, color: '#ffffff', hitSet: new Set(),
            });
          }
          dealDamage(this, _kTgt, 38, 14);
          spawnParticles(this.cx(), this.cy(), '#ffffff', 22);
          spawnParticles(this.cx(), this.cy(), '#888899', 12);
          spawnRing(this.cx(), this.cy());
          screenShake = Math.max(screenShake, 24);
        } else {
          // No target — burst slash in place
          for (let i = 0; i < 3; i++) {
            const yOff = (i - 1) * 12;
            this._swordSlashes.push({
              x: this.cx() + this.facing * (16 + i * 20),
              y: this.y + this.h * 0.38 + yOff,
              vx: this.facing * 7, vy: yOff * 0.04,
              tilt: this.facing * 0.4, facing: this.facing,
              life: 35, maxLife: 35, size: 24, color: '#aaaacc', hitSet: new Set(),
            });
          }
          spawnParticles(this.cx(), this.cy(), '#888899', 16);
          screenShake = Math.max(screenShake, 14);
        }
      },
      // ── Flamethrower: Backdraft — rocket-jump backward + roaring fire wave forward ─
      flamethrower: () => {
        this.vx = -this.facing * 26;
        this.vy = -4;
        screenShake = Math.max(screenShake, 28);
        const _ftAll = [...players, ...trainingDummies, ...minions];
        for (const f of _ftAll) {
          if (!isHostileTarget(this, f)) continue;
          const _ftRelX = f.cx() - this.cx();
          const _ftRelY = Math.abs((f.y + f.h * 0.5) - this.cy());
          if (Math.abs(_ftRelX) < 150 && _ftRelY < 80 && (_ftRelX * this.facing > -20)) {
            dealDamage(this, f, 40, 20);
            f.vx = this.facing * 28;
            spawnParticles(f.cx(), f.cy(), '#ff5500', 18);
          }
        }
        // Fire wave — 8 flame projectiles spraying forward in a cone
        for (let _fi = 0; _fi < 8; _fi++) {
          const _fvy = (_fi - 3.5) * 0.55;
          const _ffp = new Projectile(
            this.cx() + this.facing * 14, this.y + 22,
            this.facing * (14 + Math.random() * 4), _fvy + (Math.random() - 0.5) * 0.3,
            this, 0, '#ff6600'  // damage = 0: pure visual, real damage done in AoE above
          );
          _ffp.life = 14;
          _ffp._isFlame = true;
          _ffp._warmupFrames = 0;
          projectiles.push(_ffp);
        }
        spawnRing(this.cx(), this.cy());
        spawnParticles(this.cx(), this.cy(), '#ff3300', 28);
        spawnParticles(this.cx(), this.cy(), '#ffaa00', 14);
      },
      // ── Electric Staff: Thunderstrike — 4 sky bolts crash on target ─────────────
      electricstaff: () => {
        const _eTgt = _superTarget;
        const _eX   = _eTgt ? _eTgt.cx() : this.cx() + this.facing * 140;
        const _eY   = _eTgt ? _eTgt.y + _eTgt.h * 0.5 : this.cy();
        this._thunderStrikes = [
          { delay:  0, x: _eX,                                 y: _eY, fired: false },
          { delay: 18, x: _eX + (Math.random() - 0.5) * 80,   y: _eY, fired: false },
          { delay: 36, x: _eX + (Math.random() - 0.5) * 100,  y: _eY, fired: false },
          { delay: 54, x: _eX,                                 y: _eY, fired: false },
        ];
        this._thunderTimer = 0;
        screenShake = Math.max(screenShake, 16);
        spawnParticles(this.cx(), this.cy(), '#00eeff', 18);
        spawnParticles(this.cx(), this.cy(), '#aaeeff', 10);
      },
      gauntlet: () => {
        screenShake = Math.max(screenShake, 60);
        spawnRing(this.cx(), this.cy());
        spawnRing(this.cx(), this.cy());
        spawnRing(this.cx(), this.cy());
        for (const p of players) {
          if (p === this || p.health <= 0) continue;
          if (dist(this, p) < 280) dealDamage(this, p, 15, 50);
        }
        for (const d of trainingDummies) {
          if (d.health <= 0) continue;
          if (dist(this, d) < 280) dealDamage(this, d, 15, 50);
        }
        // postSpecialPause is counted in AI ticks, not frames — 90 was 22.5s of
        // total silence, the single largest cause of the boss's dead stretches.
        if (this.isBoss) this.postSpecialPause = 6; // 6 ticks = 90 frames = 1.5s
      },
      // ── Nullblade: Null Sequence — 3-hit combo extender, low KB to keep target in range ──
      nullblade: () => {
        this.vx = this.facing * 4;
        screenShake = Math.max(screenShake, 10);
        spawnParticles(this.cx(), this.cy(), '#cc2200', 10);
        const _allTargets = [...players, ...trainingDummies, ...minions];
        const _nullHits = [
          { delay: 0,   dmg: 14, kb: 6  },
          { delay: 110, dmg: 14, kb: 6  },
          { delay: 220, dmg: 24, kb: 16 },
        ];
        for (const hit of _nullHits) {
          setTimeout(() => {
            if (!gameRunning || this.health <= 0) return;
            for (const f of _allTargets) {
              if (!isHostileTarget(this, f)) continue;
              if (dist(this, f) < 110) {
                dealDamage(this, f, hit.dmg, hit.kb);
                spawnParticles(f.cx(), f.cy(), hit.kb >= 16 ? '#ff3300' : '#cc2200', hit.kb >= 16 ? 12 : 6);
                if (hit.kb >= 16) screenShake = Math.max(screenShake, 18);
              }
            }
          }, hit.delay);
        }
      }
    };
    (superMoves[this.weaponKey] || superMoves.sword)();
  }

  // ---- AI ----

  // ---- UTILITY AI HELPERS ----

  /**
   * Walk N steps forward (world-space) and sample the heatmap + check for cliffs.
   * @param {number} dir      ±1 direction
   * @param {number} steps    how many probe steps
   * @param {number} stepDist world-units per step
   * @returns {{ heat: number, cliff: boolean }}
   */
  raycastForward(dir, steps = 7, stepDist = 13) {
    let maxHeat = 0;
    let cliffAhead = false;
    for (let i = 1; i <= steps; i++) {
      const wx = this.cx() + dir * i * stepDist;
      const wy = this.y + this.h * 0.5;
      const h  = heatAt(wx, wy);
      if (h > maxHeat) maxHeat = h;
      // Check ground under foot for the first 3 steps (cliff detection)
      if (i <= 3 && this.onGround) {
        const footX = wx;
        const footY = this.y + this.h + 10;
        let groundFound = false;
        for (const pl of currentArena.platforms) {
          if (pl.isFloorDisabled) continue;
          if (footX > pl.x && footX < pl.x + pl.w && footY >= pl.y && footY <= pl.y + 30) {
            groundFound = true; break;
          }
        }
        if (!groundFound) cliffAhead = true;
      }
    }
    return { heat: maxHeat, cliff: cliffAhead };
  }

  /**
   * Score each possible AI action [0–1+] based on current game state.
   * Higher score = more desirable action.
   * Difficulty weights bias the scores toward aggression or caution.
   */
  computeUtility(t) {
    const hpPct    = this.health / this.maxHealth;
    const selfHeat = heatAt(this.cx(), this.cy());
    const d        = t ? Math.abs(t.cx() - this.cx()) : Infinity;
    const dNorm    = Math.min(d / 500, 1);           // 0 = at target, 1 = far away
    const tHpPct   = t ? t.health / t.maxHealth : 1;


    // Difficulty: easy = cautious, expert = relentless
    const hazardW  = this.aiDiff === 'easy' ? 1.10 : this.aiDiff === 'medium' ? 0.80 : this.aiDiff === 'hard' ? 0.50 : 0.30;
    const _baseAggrW = this.aiDiff === 'easy' ? 0.90 : this.aiDiff === 'medium' ? 1.25 : this.aiDiff === 'hard' ? 1.65 : 2.20;
    // Aggression ramps over match time — +0..45% over 90 seconds of no kill
    const _matchSecs   = (typeof frameCount !== 'undefined' ? frameCount : 0) / 60;
    const _noKillYet   = !players.some(p => p !== this && p.health < (p.maxHealth || 100) * 0.5);
    const _timeRamp    = _noKillYet ? Math.min(0.45, _matchSecs / 90 * 0.45) : 0;
    const aggrW        = _baseAggrW + _timeRamp;

    const s = {};

    // Clamp heat so hazard avoidance never fully disables attacks
    const clampedHeat = Math.min(selfHeat, 0.40);

    // AVOID_HAZARD: only fires when genuinely standing in danger
    s.avoid_hazard = clampedHeat > 0.30 ? clampedHeat * hazardW * (1 + (1 - hpPct) * 0.3) : 0;

    // RECOVER: steer to platform when falling
    s.recover = (!this.onGround && this.vy > 1 && this.y > GAME_H * 0.50) ? 0.96 : 0;

    // RETREAT: only when critically low HP (< 20%) and healthy enemy very close
    s.retreat = (hpPct < 0.12 && d < 160)
      ? (1 - hpPct) * 0.28 * hazardW
      : 0;

    // ATTACK: wide detection, always wins over chase when in range + cooldown ready
    const attackRange = this.weapon.range * 1.1 + 30;
    const inRangeExt  = t ? d < attackRange : false;
    // Base attack score is very high when in range — always beats chase
    s.attack = inRangeExt
      ? (1.10 + (1 - dNorm) * 0.30 + (1 - tHpPct) * 0.20) * aggrW
      : 0;

    // USE_ABILITY: available + reasonable distance
    s.use_ability = (this.abilityCooldown <= 0 && d < 320)
      ? (0.80 + (1 - tHpPct) * 0.18) * aggrW
      : 0;

    // USE_SUPER: very high priority when ready
    s.use_super = (this.superReady && clampedHeat < 0.40) ? 1.10 * aggrW : 0;

    // CHASE: strong baseline — always positive so bot never idles
    s.chase = (0.55 + dNorm * 0.25) * aggrW;

    // Ranged target pressure: punish kiting / repeated gunplay by closing faster.
    if (t && t.weapon && t.weapon.type === 'ranged') {
      const _rangedRetreat = Math.sign(t.vx || 0) === Math.sign(t.cx() - this.cx()) && Math.abs(t.vx || 0) > 1.6;
      const _rangedSpam    = (t._recentRangedUse || 0) > 45;
      if (_rangedRetreat || _rangedSpam) {
        s.chase        = Math.min(1.45, s.chase + 0.28 * aggrW);
        s.attack       = Math.min(1.60, (s.attack || 0) + (d < attackRange * 1.35 ? 0.18 : 0));
        s.reposition   = Math.min(1.0, (s.reposition || 0) + 0.20);
        s.retreat      = Math.max(0, (s.retreat || 0) * 0.35);
      }
    }

    // FINISH_THEM: enemy near death — ignore hazards, close in relentlessly
    if (tHpPct < 0.25 && d < 420) {
      const _urgency    = (1 - tHpPct) * 1.8 * aggrW;
      s.attack          = Math.max(s.attack || 0,   _urgency);
      s.chase           = Math.max(s.chase  || 0,   _urgency * 0.8);
      s.retreat         = 0;
      s.avoid_hazard    = Math.max(0, (s.avoid_hazard || 0) - 0.5);
    }

    // ---- TACTICAL POSITIONING MODIFIERS ----
    const tacticW = this.aiDiff === 'expert' ? 1.4 : this.aiDiff === 'hard' ? 1.0 : this.aiDiff === 'medium' ? 0.55 : 0.18;
    if (tacticW > 0 && currentArena) {
      // Corner avoidance: boost reposition when bot is near edge
      const edgeDist = Math.min(this.cx(), GAME_W - this.cx()) / (GAME_W * 0.18);
      const heatBelow = heatAt(this.cx(), this.y + this.h + 20);
      const corner = Math.min(1, (1 - Math.min(edgeDist, 1)) * 0.6 + heatBelow * 0.4);
      if (corner > 0.45) {
        s.reposition = (s.reposition || 0) + corner * 0.55 * tacticW;
        s.chase = Math.max(0, s.chase - corner * 0.30 * tacticW);
      }
      // Hazard push: more aggressive when enemy is near hazard
      if (t) {
        const tEdgeDist = Math.min(t.cx(), GAME_W - t.cx()) / (GAME_W * 0.25);
        const tHazard   = heatAt(t.cx(), t.y + t.h + 10);
        const push = Math.max(0, Math.min(1, (1 - Math.min(tEdgeDist, 1)) * 0.5 + tHazard * 0.5));
        if (push > 0.3) {
          s.attack = Math.min(1.5, s.attack + push * 0.45 * tacticW);
          s.chase  = Math.min(1.2, s.chase  + push * 0.25 * tacticW);
        }
        // Distance control by weapon type
        const optRange = this.weapon?.type === 'ranged' ? 280 : (this.weapon?.range >= 90 ? 90 : 60);
        const rangeDiff = d - optRange;
        if (rangeDiff > 50 && this.weapon?.type !== 'ranged') {
          s.chase = Math.min(1.2, s.chase + 0.22 * tacticW);
        } else if (rangeDiff < -30 && this.weapon?.type === 'ranged') {
          s.reposition = Math.min(1, (s.reposition || 0) + 0.28 * tacticW);
        }
      }
      // Escape routes: reduce aggression when trapped
      let escapes = 0;
      for (const pl of currentArena.platforms) {
        if (pl.isFloorDisabled) continue;
        const pdx = Math.abs((pl.x + pl.w/2) - this.cx());
        const pdy = this.y - pl.y;
        if (pdx < 200 && pdy > -20 && pdy < 320 && heatAt(pl.x + pl.w/2, pl.y) < 0.5) escapes++;
      }
      if (escapes <= 1) {
        s.attack     = Math.max(0, s.attack - 0.22 * tacticW);
        s.reposition = Math.min(1, (s.reposition || 0) + 0.32 * tacticW);
      }
    }

    // ---- PERSONALITY MODIFIERS ----
    // Applied after all base scoring so they additively shift the action distribution.
    if (this.personality) {
      switch (this.personality) {
        case 'aggressive':
          // Relentlessly press attacks — ignore self-preservation when healthy
          s.attack       = Math.min(1.8, (s.attack || 0)       * 1.55);
          s.chase        = Math.min(1.5, (s.chase  || 0)       * 1.40);
          s.use_ability  = Math.min(1.6, (s.use_ability || 0)  * 1.35);
          s.retreat      = Math.max(0,   (s.retreat || 0)      * 0.30);
          s.avoid_hazard = Math.max(0,   (s.avoid_hazard || 0) * 0.55);
          break;

        case 'defensive':
          // Back off when hurt; fight mainly when enemy comes to them
          s.retreat      = Math.min(1.1, (s.retreat      || 0) * 1.15);
          s.avoid_hazard = Math.min(1.4, (s.avoid_hazard || 0) * 1.45);
          s.reposition   = Math.min(1.2, (s.reposition   || 0) + 0.18);
          s.attack       = Math.max(0,   (s.attack || 0)       * 0.65);
          s.chase        = Math.max(0,   (s.chase  || 0)       * 0.55);
          // Counter-punch: spike attack score when enemy swings at us
          if (t && t.attackTimer > 0 && Math.abs(t.cx() - this.cx()) < 120) {
            s.attack = Math.min(1.5, (s.attack || 0) + 0.55);
          }
          break;

        case 'trickster':
          // Chaotic — frequently uses abilities/supers, moves unpredictably
          s.use_ability = Math.min(1.8, (s.use_ability || 0) * 1.70);
          s.use_super   = Math.min(1.6, (s.use_super   || 0) * 1.45);
          s.chase       = Math.min(1.3, (s.chase       || 0) * 1.20);
          // Random noise: shifts scoring each frame for erratic feel
          s.attack      = Math.max(0, (s.attack || 0) + (Math.random() - 0.5) * 0.35);
          s.retreat     = Math.max(0, (s.retreat || 0) + (Math.random() - 0.5) * 0.25);
          break;

        case 'sniper':
          // Stays at range; high attack priority only with ranged weapon
          if (this.weapon?.type === 'ranged') {
            s.attack      = Math.min(1.8, (s.attack || 0) * 1.80);
            s.use_ability = Math.min(1.6, (s.use_ability || 0) * 1.50);
            // Prefer keeping distance — boost reposition when enemy gets close
            if (d < 200) {
              s.retreat    = Math.min(0.95, (s.retreat    || 0) + 0.20);
              s.reposition = Math.min(1.2, (s.reposition || 0) + 0.35);
              s.attack     = Math.max(0,   (s.attack     || 0) * 0.60);
            }
          } else {
            // Melee sniper: still tries to keep optimal range, attacks only when lined up
            s.chase       = Math.max(0,   (s.chase  || 0) * 0.70);
            s.reposition  = Math.min(1.2, (s.reposition || 0) + 0.22);
          }
          break;
      }
    }

    return s;
  }

  /**
   * Execute the highest-scoring utility action.
   * Handles movement, combat, dodging, and reaction lag.
   * Called from updateAI() after special-case overrides.
   */
  // ---- PER-FRAME VOID/LAVA SAFETY ----
  // Runs every physics frame for AI bots on lethal-fall arenas (hasLava, isVoidArena,
  // boss void floor). Detects "no platform below us" and immediately uses double jump +
  // steers toward the nearest platform — bypassing the AI tick reaction delay.
  _voidSafetyFrame() {
    if (!this.isAI || this.isBoss || this.health <= 0 || !currentArena) return;

    const lethalFall = currentArena.hasLava || currentArena.isVoidArena ||
      (bossFloorState === 'hazard' && bossFloorType === 'void');
    if (!lethalFall) return;

    // Only act when airborne and falling
    if (this.onGround || this.vy <= 0.5) return;

    // Check if a platform will catch us within safe distance below
    const footY = this.y + this.h;
    let hasPlatBelow = false;
    for (const pl of currentArena.platforms) {
      if (pl.isFloorDisabled) continue;
      if (this.cx() > pl.x - 35 && this.cx() < pl.x + pl.w + 35 &&
          pl.y >= footY && pl.y <= footY + 260) {
        hasPlatBelow = true;
        break;
      }
    }

    if (!hasPlatBelow) {
      const spd = this.aiDiff === 'easy' ? 3.4 : this.aiDiff === 'medium' ? 4.4 : this.aiDiff === 'hard' ? 5.0 : 5.6;

      // Steer toward the nearest platform immediately
      let nearX = GAME_W / 2, nearDist = Infinity;
      for (const pl of currentArena.platforms) {
        if (pl.isFloorDisabled) continue;
        const pd = Math.abs((pl.x + pl.w / 2) - this.cx());
        if (pd < nearDist) { nearDist = pd; nearX = pl.x + pl.w / 2; }
      }
      this.vx = nearX > this.cx() ? spd * 2.4 : -spd * 2.4;

      // Fire double jump immediately — don't wait for AI tick
      if (this.canDoubleJump) {
        this.vy = -16;
        this.canDoubleJump = false;
      }
    }
  }

  executeUtilityAI(t) {
    // Ensure heatmap is current (no-op if already done this frame)
    updateHeatmap();

    const scores = this.computeUtility(t);

    // Fix 1: fallback — if every score is zero or below, default to 'chase' so bot never idles
    const maxScore = Math.max(...Object.values(scores));
    const best = maxScore <= 0
      ? 'chase'
      : Object.keys(scores).reduce((a, b) => scores[a] >= scores[b] ? a : b);

    // Reaction delay (in AI ticks). Kept short so bots feel responsive.
    const reactFrames  = this.aiDiff === 'easy' ? 3 : this.aiDiff === 'medium' ? 2 : 1;
    const lockFrames   = this.aiDiff === 'easy' ? 3 : this.aiDiff === 'medium' ? 2 : 1;

    if (this._stateChangeCd > 0) this._stateChangeCd--;
    if (this._actionLockFrames > 0) this._actionLockFrames--;

    // Tick pending action countdown; commit when it expires
    if (this._pendingAction) {
      this._pendingAction.timer--;
      if (this._pendingAction.timer <= 0) {
        this.aiState = this._pendingAction.action;
        this._pendingAction = null;
        this._stateChangeCd = 18;
        this._actionLockFrames = lockFrames;
      }
    } else if (best !== this.aiState && this._stateChangeCd === 0 && this._actionLockFrames === 0) {
      // Queue the new decision — bot will execute it after reaction delay
      this._pendingAction = { action: best, timer: reactFrames };
    }

    // Fix 6: debug state display — show current AI state as a small label above bot
    if (this.isAI && !this.isBoss && typeof debugMode !== 'undefined' && debugMode) {
      this._debugState = best; // drawn by Fighter.draw() if present
    }

    const dx         = t ? t.cx() - this.cx() : 0;
    const dir        = dx > 0 ? 1 : -1;
    const d          = Math.abs(dx);
    const _worldAggro = Math.max(0.25, this._aggroBoost || 1);
    let   spd        = (this.aiDiff === 'easy' ? 3.0 : this.aiDiff === 'medium' ? 4.4 : this.aiDiff === 'hard' ? 5.2 : 5.8) * _worldAggro;
    // atkFreq is per-AI-tick probability. Previously 0.04/0.16/0.28 = attacks every 6s/1.6s/0.9s.
    // New values guarantee attacks within 1–3 ticks of entering range.
    let   atkFreq    = Math.min(1, (this.aiDiff === 'easy' ? 0.55 : this.aiDiff === 'medium' ? 0.75 : this.aiDiff === 'hard' ? 0.90 : 1.00) * _worldAggro);
    let   abiFreq    = Math.min(1, (this.aiDiff === 'easy' ? 0.10 : this.aiDiff === 'medium' ? 0.20 : this.aiDiff === 'hard' ? 0.32 : 0.50) * _worldAggro);
    let   missChance = Math.max(0, (this.aiDiff === 'easy' ? 0.18 : this.aiDiff === 'medium' ? 0.08 : this.aiDiff === 'hard' ? 0.03 : 0.00) / _worldAggro);
    // Personality execution tweaks
    if (this.personality === 'aggressive') { spd *= 1.20; atkFreq *= 1.45; missChance *= 0.60; }
    if (this.personality === 'defensive')  { spd *= 0.85; atkFreq *= 0.65; }
    if (this.personality === 'trickster')  { abiFreq *= 2.0; missChance *= 0.50; }
    if (this.personality === 'sniper' && this.weapon?.type === 'ranged') { spd *= 1.10; atkFreq *= 1.55; }

    // Raycast: check heat and cliff directly ahead
    const fwd      = this.raycastForward(dir);
    const pathSafe = fwd.heat < 0.55 && !fwd.cliff;

    // Screen-edge guard (50px — reduced from 120px to avoid huge dead zones)
    const nearLeftEdge  = this.x < 50 && !this.isBoss;
    const nearRightEdge = this.x + this.w > GAME_W - 50 && !this.isBoss;
    const towardEdge    = (nearLeftEdge && dir < 0) || (nearRightEdge && dir > 0);

    switch (best) {

      // ---- AVOID_HAZARD: flee the most dangerous nearby direction ----
      case 'avoid_hazard': {
        const selfHeat = heatAt(this.cx(), this.cy());
        // Compare danger 60px left vs right; flee toward the safer side
        const heatL  = heatAt(this.cx() - 60, this.cy());
        const heatR  = heatAt(this.cx() + 60, this.cy());
        const fleeDir = heatL < heatR ? -1 : 1;
        if (!this.isEdgeDanger(fleeDir)) {
          this.vx = fleeDir * spd * 1.6;
        } else {
          this.vx = 0; // can't run — jump up instead
        }
        // Jump if heat is high enough — only if not at an edge
        const fleeAhead = heatL < heatR ? -1 : 1;
        if (selfHeat > 0.65 && this.onGround && !this.isEdgeDanger(fleeAhead)) {
          this.vy = -20;
        } else if (selfHeat > 0.50 && this.canDoubleJump && this.vy > 0) {
          this.vy = -16; this.canDoubleJump = false;
        }
        break;
      }

      // ---- RETREAT: back away; weak counter-attack when cornered ----
      case 'retreat': {
        const retDir  = -dir;
        const retEdge = this.isEdgeDanger(retDir);
        if (!retEdge && !towardEdge) {
          this.vx = retDir * spd * 0.55;
        } else {
          // Cornered — fight back rather than stepping off edge
          if (this.cooldown <= 0 && Math.random() < atkFreq) this.attack(t);
          this.vx = 0;
        }
        if (this.onGround && !retEdge && Math.random() < 0.04) this.vy = -16;
        // Chip damage while retreating (reduced freq)
        if (d < this.weapon.range + 10 && this.cooldown === 0 && Math.random() < atkFreq * 0.45)
          this.attack(t);
        break;
      }

      // ---- RECOVER: steer toward nearest platform when falling ----
      case 'recover': {
        let nearX = GAME_W / 2, nearDist = Infinity;
        for (const pl of currentArena.platforms) {
          if (pl.isFloorDisabled) continue;
          const pdx = Math.abs(pl.x + pl.w / 2 - this.cx());
          if (pdx < nearDist) { nearDist = pdx; nearX = pl.x + pl.w / 2; }
        }
        this.vx = nearX > this.cx() ? spd * 1.8 : -spd * 1.8;
        // Use double jump to reach safety if still falling
        if (this.canDoubleJump && this.vy > 1) { this.vy = -15; this.canDoubleJump = false; }
        break;
      }

      // ---- USE_SUPER: unleash super move ----
      case 'use_super':
        this.useSuper(t);
        break;

      // ---- USE_ABILITY: activate weapon ability; close range if needed ----
      case 'use_ability':
        this.ability(t);
        if (d > this.weapon.range + 5 && pathSafe && !towardEdge)
          this.vx = dir * spd;
        break;

      // ---- ATTACK: press the target, always fire when cooldown ready ----
      case 'attack':
        if (this.weapon && this.weapon.type === 'ranged') {
          // Ranged attack case is handled above in the ranged AI block;
          // utility AI reaching here means keep optimal distance, already handled.
          this.facing = dir;
          if (this.cooldown <= 0 && Math.random() < atkFreq) this.attack(t);
        } else {
          // Melee: slide in slightly so hits land — don't just stand still
          if (d > this.weapon.range * 0.6 && !towardEdge) {
            this.vx = dir * spd * 0.85;
          } else {
            this.vx *= 0.80;
          }
          // Miss chance simulates human imperfection on easy
          if (Math.random() < missChance) this.facing = -this.facing;
          if (this.cooldown <= 0) {
            if (Math.random() < atkFreq) this.attack(t);
          }
        }
        if (this.abilityCooldown <= 0 && Math.random() < abiFreq) this.ability(t);
        if (this.superReady && Math.random() < 0.25) this.useSuper(t);
        // Hop to reach target on a higher platform
        if (this.onGround && t && t.y + t.h < this.y - 30 && !fwd.cliff && !nearLeftEdge && !nearRightEdge && Math.random() < 0.05)
          this.vy = -16;
        break;

      // ---- REPOSITION: move toward map center to avoid corner traps ----
      case 'reposition': {
        const toCenter = GAME_W / 2 - this.cx();
        if (Math.abs(toCenter) > 30) {
          const rDir = Math.sign(toCenter);
          if (!this.isEdgeDanger(rDir)) this.vx = rDir * spd;
        }
        if (this.onGround && Math.abs(toCenter) > 80 && Math.random() < 0.03) this.vy = -16;
        // Still attack if target walks into range while repositioning
        if (t && Math.abs(t.cx() - this.cx()) < this.weapon.range + 15 && this.cooldown === 0 && Math.random() < atkFreq * 0.6)
          this.attack(t);
        break;
      }

      // ---- CHASE: close the distance using platform pathfinding ----
      case 'chase':
      default: {
        // ── 0. Airborne arc correction (highest priority) ──────────
        // pfAirborneCorrect predicts landing via full arc simulation.
        // Only fires when falling (vy > 0); upward arcs are intentional.
        if (!this.onGround && !this.isBoss &&
            typeof pfAirborneCorrect === 'function' && pfAirborneCorrect(this, spd)) {
          // Correction applied — skip all other movement this tick
          break;
        }

        // ── 1. Stuck detection & kick ──────────────────────────────
        if (typeof pfCheckStuck === 'function' && !this.isBoss && pfCheckStuck(this)) {
          forceRecalculatePath(this);
          const kickDir = this.isEdgeDanger(dir) ? -dir : dir;
          if (this.onGround && !this.isEdgeDanger(kickDir)) this.vy = -18;
          this.vx = kickDir * spd * 1.4;
          break;
        }

        // ── 2. Pathfinding waypoint ────────────────────────────────
        const wp = (typeof pfGetNextWaypoint === 'function' && !this.isBoss)
          ? pfGetNextWaypoint(this, t.cx(), t.y + t.h * 0.5)
          : null;

        if (wp) {
          const wpDir = wp.x > this.cx() ? 1 : -1;

          // ── jump: single jump verified by arc simulation ──────────
          if (wp.action === 'jump') {
            this.vx = wpDir * spd * 1.05;
            if (this.onGround) {
              this.vy = -20;
            }
            // If airborne and predicted landing is bad, pfAirborneCorrect handles it above

          // ── doubleJump: fire ground jump, then double near apex ───
          } else if (wp.action === 'doubleJump') {
            this.vx = wpDir * spd * 1.1;
            if (this.onGround) {
              this.vy = -20;
              this._pfDoubleJumpPending = true;
            } else if (this._pfDoubleJumpPending && this.canDoubleJump && this.vy >= -2) {
              // Near apex of first jump — fire double jump proactively
              this.vy = -17; this.canDoubleJump = false;
              this._pfDoubleJumpPending = false;
            }

          // ── drop: verify at runtime then walk off ─────────────────
          } else if (wp.action === 'drop') {
            const dropSafe = typeof pfDropSafe === 'function'
              ? pfDropSafe(this, wpDir) : !currentArena.hasLava;
            if (dropSafe) {
              this.vx = wpDir * spd;
            } else {
              // Destination is no longer safe — reroute
              if (typeof _pfLogUnsafe === 'function') _pfLogUnsafe(this, 'drop', 'runtime-unsafe');
              forceRecalculatePath(this);
              this.vx = 0;
            }

          // ── walk: edge-aware aggressive positioning ───────────────
          } else {
            const voidFwd  = typeof pfVoidAhead === 'function' && pfVoidAhead(this, wpDir);
            const voidBack = typeof pfVoidAhead === 'function' && pfVoidAhead(this, -wpDir);

            if (voidFwd && !voidBack) {
              // Void ahead, safe behind:
              // If player is toward the void, maintain light pressure (keep player on the edge).
              // If player is away, hold position.
              this.vx = (dir === wpDir) ? wpDir * spd * 0.38 : 0;
            } else if (voidFwd && voidBack) {
              // Void both ways (narrow platform) — hold center, don't move
              this.vx = 0;
            } else {
              this.vx = wpDir * (pathSafe ? spd * 1.12 : spd * 0.88);
            }

            // Hop to clear terrain or reach airborne targets
            if (this.onGround && t && t.y + t.h < this.y - 50 && !voidFwd && !nearLeftEdge && !nearRightEdge && Math.random() < 0.08)
              this.vy = -18;
          }

        } else {
          // ── 3. Heuristic fallback (no graph / no path found) ──────
          const voidFwd = !storyModeActive && typeof pfVoidAhead === 'function' && pfVoidAhead(this, dir);
          if (towardEdge || voidFwd) {
            this.vx = 0;
            if (this.onGround && this.platformAbove() && Math.random() < 0.08) this.vy = -18;
          } else if (fwd.cliff && currentArena.hasLava) {
            this.vx = 0;
            if (this.onGround && Math.random() < 0.15) this.vy = -18;
          } else {
            this.vx = dir * (pathSafe ? spd * 1.10 : spd * 0.86);
          }
          if (this.onGround && t && t.y + t.h < this.y - 50 && !fwd.cliff && !voidFwd &&
              Math.random() < 0.06 && (!currentArena.hasLava || this.platformAbove()))
            this.vy = -18;
          if (this.onGround && t && !t.onGround && !voidFwd && Math.random() < 0.06 && !fwd.cliff && !this.isEdgeDanger(dir))
            this.vy = -18;
          if (t && this.onGround && !voidFwd) {
            const _vGap  = this.cy() - t.cy();
            const _lDist = Math.abs(t.cx() - this.cx());
            if (_vGap > 80 && _lDist < 280) {
              const _jProb = this.aiDiff === 'easy' ? 0.04 : this.aiDiff === 'medium' ? 0.10 :
                             this.aiDiff === 'hard' ? 0.20 : 0.30;
              if (Math.random() < _jProb) { this.vy = -17; this.vx = dir * spd * 1.1; }
            }
          }
        }

        // Trickster: erratic jumps/fakes, but never toward a void
        if (this.personality === 'trickster' && this.onGround) {
          const noVoid = !this.isEdgeDanger(dir);
          if (noVoid && Math.random() < 0.025) { this.vy = -18; }
          if (noVoid && Math.random() < 0.012) { this.vx = -this.vx; this.facing *= -1; }
        }
        break;
      }
    }

    // Input buffer: queue an attack when opponent steps into range (executes on drain, not immediately)
    if (t && t.health > 0 && this.aiState !== 'retreat' && this.aiState !== 'recover') {
      const bufferRange = this.weapon.range * 0.9 + 20;
      if (d < bufferRange && this.inputBuffer.length === 0) {
        this.inputBuffer.push('attack');
      }
    }
    // Drain input buffer — process one queued input per frame when ready
    if (this.inputBuffer.length > 0 && this._actionLockFrames === 0 && !this._pendingAction) {
      const qi = this.inputBuffer.shift();
      if      (qi === 'attack'  && this.cooldown <= 0 && t && t.health > 0) this.attack(t);
      else if (qi === 'jump'    && this.onGround) this.vy = -18;
      else if (qi === 'ability' && this.abilityCooldown <= 0) this.ability(t);
    }
    // Cap buffer to prevent stale queues
    if (this.inputBuffer.length > 3) this.inputBuffer.length = 3;

    // --- Shield reaction (medium+): block incoming melee swing ---
    // Only shield when stacks are low (shield still effective); bots won't spam a depleted shield
    if (t && this.aiDiff !== 'easy' && t.attackTimer > 0 && d < 110 &&
        (this.shieldStacks || 0) <= 2 && Math.random() < 0.22) {
      if ((this.shieldHoldTimer || 0) === 0) {
        const _aiStacks = (this.shieldStacks || 0) + 1;
        this.shieldStacks        = _aiStacks;
        this.shieldRechargeTimer = 180;
        if (_aiStacks <= 3) {
          const _aiHPTable = [30, 15, 5];
          this.shieldHP = _aiHPTable[_aiStacks - 1] || 0;
        }
      }
      this.shielding = true;
      setTimeout(() => { this.shielding = false; this.shieldHoldTimer = 0; this.shieldBroken = false; }, 320);
    }

    // --- Dodge projectiles (medium+) ---
    if (this.aiDiff !== 'easy') {
      for (const pr of projectiles) {
        if (pr.owner === this) continue;
        const pd = Math.hypot(pr.x - this.cx(), pr.y - this.cy());
        if (pd < 130 && !this.isEdgeDanger(pr.vx > 0 ? -1 : 1) && Math.random() < 0.30) {
          if (this.onGround) this.vy = -17;
          else if (this.canDoubleJump) { this.vy = -13; this.canDoubleJump = false; }
        }
      }
    }

    // Reaction lag now handled by _pendingAction system (see above).
    // Rare stun pause for easy bots only (simulates brief confusion)
    if (this.aiDiff === 'easy' && Math.random() < 0.04) this.aiReact = 3 + Math.floor(Math.random() * 4);
  }

  // Returns true if moving in 'dir' (±1) would walk the AI off a platform
  // with no safe ground beneath within the next 40px.
  isEdgeDanger(dir) {
    // Story mode: portals handle out-of-bounds; never block movement
    if (storyModeActive) return false;
    if (currentArena && currentArena.earthPhysics) return false;

    // ── Grounded check: look ahead at foot level ──────────────
    if (this.onGround) {
      const lookX = dir > 0 ? this.x + this.w + 44 : this.x - 44;
      const footY = this.y + this.h;
      for (const pl of currentArena.platforms) {
        if (pl.isFloorDisabled) continue;
        if (lookX > pl.x && lookX < pl.x + pl.w &&
            footY <= pl.y + 22 && footY >= pl.y - 8) return false;
      }
      if (currentArena.hasLava) return true;
      // Boss arena void floor: floor is disabled — treat as instant death zone
      if (currentArena.isBossArena && bossFloorState === 'hazard' && bossFloorType === 'void') return true;
      // Safe landing below: stepping off an elevated platform is NOT danger when
      // another platform (e.g. the main floor) catches the fall at the look-ahead
      // point. Without this every direction on a raised platform read as an edge,
      // so AI stranded there stood frozen until knocked off.
      for (const pl of currentArena.platforms) {
        if (pl.isFloorDisabled) continue;
        if (lookX > pl.x && lookX < pl.x + pl.w && pl.y > footY - 8) return false;
      }
      return this.y + this.h < GAME_H + 40;
    }

    // ── Airborne check: would continuing in 'dir' lead to a void? ──
    if (!this.isBoss && typeof pfVoidAhead === 'function') {
      return pfVoidAhead(this, dir);
    }
    return false;
  }

  // Finds any reachable platform above (for jumping pathing).
  platformAbove() {
    for (const pl of currentArena.platforms) {
      if (pl.y < this.y - 20 &&
          pl.x < this.cx() + 130 && pl.x + pl.w > this.cx() - 130) return pl;
    }
    return null;
  }

  // ---- INTENT UPDATE: choose a high-level behavioral goal every ~0.6-1.2s ----
  _updateIntent(t, d) {
    if (this._intentTimer > 0) { this._intentTimer--; return; }
    this._intentTimer = 35 + Math.floor(Math.random() * 35); // 35-70 AI ticks

    const hpPct  = this.health / this.maxHealth;
    const tHpPct = t ? (t.health / t.maxHealth) : 1;

    if (hpPct < 0.14 && d > 220) {
      this.intent = 'retreat';
    } else if (hpPct < 0.35 && tHpPct > 0.75 && d < 260) {
      this.intent = Math.random() < 0.45 ? 'bait' : 'reposition';
    } else if (d > 360) {
      this.intent = 'pressure'; // always close the gap when far
    } else {
      const r = Math.random();
      this.intent = r < 0.60 ? 'pressure' : r < 0.80 ? 'reposition' : 'bait';
    }
  }

  updateAI() {
    // Trial controllers are purpose-built and fully replace the normal brain —
    // an invisible fighter running standard aggression simply deletes the
    // player. Each does its own target validation (see smb-trials.js).
    if (this._trialStalker && typeof trialStalkAI === 'function') { trialStalkAI(this); return; }
    // The mirror copy is driven per-frame from updateTrials(), not here — this
    // brain only runs every AI_TICK_INTERVAL (15) frames, which played the input
    // tape back at 1/15 speed. All this does is suppress the normal AI.
    if (this._trialMirror) return;
    if (this.aiReact > 0) { this.aiReact--; return; }
    if (this.ragdollTimer > 0 || this.stunTimer > 0) return;

    // ---- TARGET VALIDATION: reassign if current target is dead/invalid ----
    if (this._isInvalidAITarget(this.target)) this._acquireAITarget();

    // ---- DYNAMIC RETARGETING: re-evaluate closest enemy every 25 ticks ----
    // Prevents bots from tunnel-visioning a far target while a closer one is adjacent.
    this._targetRetargetCd = (this._targetRetargetCd || 0) - 1;
    if (this._targetRetargetCd <= 0) {
      this._acquireAITarget();
      this._targetRetargetCd = 25;
    }

    // ---- DANGER AVOIDANCE: boss beams ----
    if (bossBeams && bossBeams.length > 0 && !this.isBoss) {
      for (const beam of bossBeams) {
        if (beam.done) continue;
        const beamDx = Math.abs(beam.x - this.cx());
        if (beamDx < 50) {
          // Move away from beam
          const fleeDir = this.cx() < beam.x ? -1 : 1;
          if (!this.isEdgeDanger(fleeDir)) {
            const spd0 = this.aiDiff === 'easy' ? 2.6 : this.aiDiff === 'medium' ? 4.2 : 5.8;
            this.vx = fleeDir * spd0 * 2;
          }
          if (this.onGround) this.vy = -18;
          return; // beam avoidance takes priority
        }
      }
    }

    // ---- DANGER AVOIDANCE: floor hazard ----
    if (!this.isBoss && bossFloorState === 'hazard' && this.y + this.h > 430) {
      // Floor is lethal — jump or move to a platform
      if (this.onGround) {
        const above = this.platformAbove();
        if (above) {
          const toPlat = above.x + above.w/2 - this.cx();
          const spd0 = this.aiDiff === 'easy' ? 2.6 : this.aiDiff === 'medium' ? 4.2 : 5.8;
          this.vx = Math.sign(toPlat) * spd0 * 1.5;
          this.vy = -19;
          return;
        }
        this.vy = -19;
        return;
      }
    }

    // ---- DANGER AVOIDANCE: lava proximity ----
    if (!this.isBoss && currentArena && currentArena.hasLava && currentArena.lavaY) {
      const distToLava = currentArena.lavaY - (this.y + this.h);
      if (distToLava < 80 && this.y + this.h > 380) {
        if (this.onGround) {
          const spd0 = this.aiDiff === 'easy' ? 2.6 : this.aiDiff === 'medium' ? 4.2 : 5.8;
          this.vx = this.cx() < GAME_W/2 ? spd0 * 2 : -spd0 * 2;
          this.vy = -19;
          return;
        }
      }
    }

    // ---- DEADLOCK DETECTION: two bots mirroring each other ----
    if (!this.isBoss && this.target && this.target.isAI) {
      this._stuckFrames  = (this._stuckFrames  || 0);
      this._lastXForStuck = (this._lastXForStuck !== undefined ? this._lastXForStuck : this.x);
      if (Math.abs(this.x - this._lastXForStuck) < 5) {
        this._stuckFrames++;
        if (this._stuckFrames > 180) { // 3 seconds at AI tick rate
          this._stuckFrames = 0;
          this._wanderDir   = (Math.random() < 0.5 ? -1 : 1);
          this._wanderTimer = 40;
          if (this.onGround) this.vy = -18;
        }
      } else {
        this._stuckFrames = 0;
      }
      this._lastXForStuck = this.x;
    }

    // Combo follow-through: maintain forward pressure after landing a hit
    if (this._comboPressTimer > 0) {
      this._comboPressTimer--;
      if (this.target) {
        const _cDir = this.target.cx() > this.cx() ? 1 : -1;
        const _cSpd = this.aiDiff === 'expert' ? 5.8 : 5.2;
        this.vx = _cDir * _cSpd;
      }
    }

    // ---- RANDOM NUDGE: prevents long idle stretches ----
    // Biased toward the target: a bot stalled against a ledge would otherwise
    // wander off in a random direction and stay stalled.
    if (!this.isBoss && frameCount % 45 === 0 && Math.abs(this.vx) < 0.5 && this.target) {
      const spd0 = this.aiDiff === 'easy' ? 2.6 : this.aiDiff === 'medium' ? 4.2 : 5.8;
      const toT  = this.target.cx() > this.cx() ? 1 : -1;
      this._wanderDir   = this.isEdgeDanger(toT) ? -toT : toT;
      this._wanderTimer = 20;
      this.vx           = this._wanderDir * spd0;
    }

    // ---- STUCK DETECTION: if attacking with no hits for 1s, wander away ----
    if (this.isAI && this.state === 'attacking') {
      if (this.weaponHit) {
        this.aiNoHitTimer = 0;
        // Press forward after landing a hit (combo follow-through for hard/expert)
        if (!this._comboPressTimer && (this.aiDiff === 'hard' || this.aiDiff === 'expert')) {
          this._comboPressTimer = 16;
        }
      } else {
        this.aiNoHitTimer++;
        if (this.aiNoHitTimer > 60) {
          this.aiNoHitTimer = 0;
          this.aiState = 'chase';
          this._wanderDir = (Math.random() < 0.5 ? -1 : 1);
          this._wanderTimer = 45;
        }
      }
    } else {
      this.aiNoHitTimer = 0;
    }
    // ---- WANDER STATE: move in random direction briefly ----
    if (this._wanderTimer > 0) {
      this._wanderTimer--;
      const spd0 = this.aiDiff === 'easy' ? 3.0 : this.aiDiff === 'medium' ? 4.4 : 5.2;
      if (!this.isEdgeDanger(this._wanderDir)) {
        this.vx = this._wanderDir * spd0 * 1.2;
      } else {
        this._wanderDir = -this._wanderDir;
      }
      if (this.onGround && !this.isEdgeDanger(this._wanderDir) && Math.random() < 0.04) this.vy = -18;
      // Still attack if target walks into range during wander
      const _wt = this.target;
      if (_wt && _wt.health > 0 && this.cooldown <= 0) {
        const _wd = Math.abs(_wt.cx() - this.cx());
        if (_wd < this.weapon.range * 1.1 + 20) this.attack(_wt);
      }
      return;
    }

    // ---- KOTH: bots rush the zone; only fight if an enemy is also in the zone ----
    if (gameMode === 'minigames' && minigameType === 'koth' && !this.isBoss) {
      const kothSpd     = this.aiDiff === 'easy' ? 3.8 : this.aiDiff === 'medium' ? 4.8 : 5.8;
      const kothAtkFreq = this.aiDiff === 'easy' ? 0.04 : this.aiDiff === 'medium' ? 0.16 : 0.28;
      const kothAbiFreq = this.aiDiff === 'easy' ? 0.004 : this.aiDiff === 'medium' ? 0.022 : 0.04;
      const zoneLeft  = kothZoneX - 100;
      const zoneRight = kothZoneX + 100;
      const selfInZone = this.cx() > zoneLeft && this.cx() < zoneRight && this.onGround;
      const enemyInZone = players.some(p => p !== this && !p.isBoss && p.health > 0 &&
                                            p.cx() > zoneLeft && p.cx() < zoneRight && p.onGround);
      if (!selfInZone) {
        // Use pathfinding to reach the zone center
        const kothWp = (typeof pfGetNextWaypoint === 'function')
          ? pfGetNextWaypoint(this, kothZoneX, GAME_H - 80)
          : null;
        if (kothWp) {
          const kdir2 = kothWp.x > this.cx() ? 1 : -1;
          this.vx = kdir2 * kothSpd * 1.1;
          if (kothWp.action === 'jump' && this.onGround) { this.vy = -19; }
          else if (kothWp.action === 'jump' && this.canDoubleJump && this.vy > 0) { this.vy = -16; this.canDoubleJump = false; }
        } else {
          const kdir = kothZoneX > this.cx() ? 1 : -1;
          this.vx = kdir * kothSpd * 1.1;
          if (this.onGround && !this.isEdgeDanger(kdir) && Math.random() < 0.05) this.vy = -18;
          else if (this.canDoubleJump && this.vy > 1 && Math.random() < 0.08) { this.vy = -14; this.canDoubleJump = false; }
        }
        return; // never leave zone logic — skip all other AI this frame
      }
      // Inside zone: attack any enemy also in zone, otherwise hold ground
      if (enemyInZone && this.target && this.target.cx() > zoneLeft && this.target.cx() < zoneRight) {
        const zd = Math.abs(this.target.cx() - this.cx());
        if (zd < this.weapon.range + 20) {
          this.vx *= 0.72;
          if (Math.random() < kothAtkFreq) this.attack(this.target);
          if (Math.random() < kothAbiFreq) this.ability(this.target);
          if (this.superReady && Math.random() < 0.12) this.useSuper(this.target);
        } else {
          this.vx = (this.target.cx() > this.cx() ? 1 : -1) * kothSpd;
        }
      } else {
        // No enemy in zone — hold center, small idle drift
        const centerDiff = kothZoneX - this.cx();
        this.vx = Math.abs(centerDiff) > 20 ? Math.sign(centerDiff) * kothSpd * 0.5 : 0;
      }
      return; // KotH bots never leave the zone
    }

    // ---- Exploration guard: defend the relic position ----
    if (this.isExploreGuard && typeof exploreGoalX !== 'undefined') {
      const guardX  = this._guardX || exploreGoalX;
      const _guardAggro = Math.max(0.25, this._aggroBoost || 1);
      const guardSpd = (this.aiDiff === 'expert' ? 6.5 : this.aiDiff === 'hard' ? 5.5 : 4.5) * _guardAggro;
      const atkFreq  = Math.min(1, (this.aiDiff === 'expert' ? 0.35 : this.aiDiff === 'hard' ? 0.25 : 0.16) * _guardAggro);
      const t2 = this.target || players.find(p => !p.isBoss && p.health > 0);
      const playerNear = t2 && Math.abs(t2.cx() - guardX) < 300; // player within guard radius
      const selfNearPost = Math.abs(this.cx() - guardX) < 120;

      if (playerNear && t2) {
        // Player is near the relic — intercept and attack aggressively
        const dd2 = Math.abs(t2.cx() - this.cx());
        if (dd2 < this.weapon.range + 30) {
          this.vx *= 0.7;
          if (Math.random() < atkFreq)      this.attack(t2);
          if (Math.random() < atkFreq * 0.4) this.ability(t2);
          if (this.superReady && Math.random() < 0.18) this.useSuper(t2);
          // Shove the player away from the relic with extra knockback intent
          if (dd2 < 40 && Math.random() < 0.12) {
            const pushDir = t2.cx() > guardX ? 1 : -1; // push away from relic
            t2.vx += pushDir * 8;
          }
        } else {
          this.vx = (t2.cx() > this.cx() ? 1 : -1) * guardSpd * 1.2;
          if (this.onGround && Math.random() < 0.06) this.vy = -18;
        }
      } else if (!selfNearPost) {
        // Return to post — use pathfinding
        const guardWp = (typeof pfGetNextWaypoint === 'function')
          ? pfGetNextWaypoint(this, guardX, GAME_H - 80)
          : null;
        if (guardWp) {
          const dir2 = guardWp.x > this.cx() ? 1 : -1;
          this.vx = dir2 * guardSpd * 0.85;
          if (guardWp.action === 'jump' && this.onGround) this.vy = -18;
          else if (guardWp.action === 'jump' && this.canDoubleJump && this.vy > 0) { this.vy = -15; this.canDoubleJump = false; }
        } else {
          const dir2 = guardX > this.cx() ? 1 : -1;
          this.vx = dir2 * guardSpd * 0.8;
          if (this.onGround && Math.random() < 0.04) this.vy = -16;
        }
      } else {
        // Idle at post — small patrol drift
        const centerDiff = guardX - this.cx();
        this.vx = Math.abs(centerDiff) > 30 ? Math.sign(centerDiff) * guardSpd * 0.3 : 0;
      }
      return;
    }

    // Chaos mode: all entities attack nearest other entity
    if (trainingChaosMode && trainingMode) {
      const allEntities = [...players, ...trainingDummies, ...minions];
      let nearDist = Infinity, nearEnt = null;
      for (const e of allEntities) {
        if (e === this || e.health <= 0 || e.godmode) continue;
        const dd = dist(this, e);
        if (dd < nearDist) { nearDist = dd; nearEnt = e; }
      }
      if (nearEnt) this.target = nearEnt;
    }

    const t  = this.target;
    if (!t) return;
    const dx = t.cx() - this.cx();
    const d  = Math.abs(dx);
    const dir = dx > 0 ? 1 : -1;

    const _worldAggro = Math.max(0.25, this._aggroBoost || 1);
    const spd = (this.aiDiff === 'easy' ? 3.4 : this.aiDiff === 'medium' ? 4.4 : this.aiDiff === 'hard' ? 5.0 : 5.6) * _worldAggro;

    // ---- NO-IDLE: intent update + player idle detection ----
    if (!this.isBoss) {
      this._updateIntent(t, d);
      const _tMoving = Math.abs(t.vx) > 0.5 || !t.onGround || t.state === 'attacking';
      this._playerIdleTmr = _tMoving ? 0 : this._playerIdleTmr + 1;
    }

    // ---- RUINS: prioritize artifacts unless player is very close ----
    if (currentArenaKey === 'ruins' && mapItems && mapItems.length > 0 && !this.isBoss) {
      const uncollected = mapItems.filter(it => !it.collected);
      if (uncollected.length > 0) {
        const nearest = uncollected.reduce((best, it) => {
          const da = Math.hypot(it.x - this.cx(), it.y - this.cy());
          const db = Math.hypot(best.x - this.cx(), best.y - this.cy());
          return da < db ? it : best;
        });
        const da = Math.hypot(nearest.x - this.cx(), nearest.y - this.cy());
        if (d > 200 || da < 80) {
          const adir = nearest.x > this.cx() ? 1 : -1;
          if (!this.isEdgeDanger(adir)) this.vx = adir * spd;
          if (this.onGround && nearest.y < this.y - 30 && Math.random() < 0.05) this.vy = -18;
          return;
        }
      }
    }

    // ---- DANGER: lava / death zone ----
    if (currentArena.hasLava) {
      const distToLava = currentArena.lavaY - (this.y + this.h);
      if (distToLava < 130) {
        if (this.onGround && distToLava < 85) {
          this.vy = -20; // lava escape jump
          this.vx = this.cx() < GAME_W / 2 ? spd * 2.2 : -spd * 2.2;
        } else if (!this.onGround && distToLava < 110) {
          let nearestX = GAME_W / 2;
          let nearestDist = Infinity;
          for (const pl of currentArena.platforms) {
            if (pl.y < this.y) {
              const pdx2 = Math.abs(pl.x + pl.w / 2 - this.cx());
              if (pdx2 < nearestDist) { nearestDist = pdx2; nearestX = pl.x + pl.w / 2; }
            }
          }
          this.vx = nearestX > this.cx() ? spd * 2.2 : -spd * 2.2;
        }
        return;
      }
    }

    // ---- DANGER: boss void floor (when boss floor hazard is void) ----
    if (currentArena.isBossArena && bossFloorState === 'hazard' && bossFloorType === 'void') {
      const floorPl = currentArena.platforms.find(p => p.isFloor);
      if (floorPl && floorPl.isFloorDisabled && this.y + this.h > GAME_H - 140) {
        // Void floor active — flee upward toward nearest platform
        let nearestX = GAME_W / 2, nearestDist = Infinity;
        for (const pl of currentArena.platforms) {
          if (pl.isFloor) continue;
          const pdx3 = Math.abs(pl.x + pl.w / 2 - this.cx());
          if (pdx3 < nearestDist) { nearestDist = pdx3; nearestX = pl.x + pl.w / 2; }
        }
        this.vx = nearestX > this.cx() ? spd * 1.8 : -spd * 1.8;
        if (this.onGround && Math.random() < 0.25) this.vy = -20;
        else if (this.canDoubleJump && this.vy > 0 && Math.random() < 0.35) { this.vy = -17; this.canDoubleJump = false; }
        return;
      }
    }

    // ---- DANGER: map screen edges (avoid falling off) ----
    // Story mode uses wider margin so bots never drift near soft boundary
    const _edgeMargin = (storyModeActive && gameMode !== 'exploration') ? 110 : 50;
    const nearLeftEdge  = this.x < _edgeMargin && !this.isBoss;
    const nearRightEdge = this.x + this.w > GAME_W - _edgeMargin && !this.isBoss;
    if (this.onGround) {
      if (nearLeftEdge  && dir < 0) { this.vx = 0; }
      if (nearRightEdge && dir > 0) { this.vx = 0; }
    }
    if (!this.onGround && !this.isBoss) {
      if (nearLeftEdge  && this.vx < 0) this.vx = 0;
      if (nearRightEdge && this.vx > 0) this.vx = 0;
    }

    // ---- RANGED WEAPON AI: kite / strafe / aim behavior ----
    // Phases based on HP: low-HP kites far, dominant HP pushes close.
    if (this.weapon && this.weapon.type === 'ranged' && t && t.health > 0) {
      // HP-based phase switching
      const _hpPct       = this.health / this.maxHealth;
      const _advRatio    = t.health > 0 ? this.health / t.health : 2;
      const _targetIsRanged = !!(t.weapon && t.weapon.type === 'ranged');
      const _targetRetreating = _targetIsRanged && Math.sign(t.vx || 0) === Math.sign(t.cx() - this.cx()) && Math.abs(t.vx || 0) > 1.8;
      const _isLowHp     = _hpPct < 0.28;               // kite mode: stay far
      const _isDominating = _advRatio > 1.60 && _hpPct > 0.50; // push in for the kill
      const _optMin   = _targetIsRanged ? 95 : (_isDominating ? 90  : 160);
      const _optMax   = _targetIsRanged ? (_targetRetreating ? 150 : 175) : (_isLowHp ? 280 : (_isDominating ? 180 : 220));
      const _closeRange = _targetIsRanged ? 110 : 80; // panic distance — back away NOW

      // Tick strafe timer — flip direction more often when dominant
      this._rangedStrafeTimer = (this._rangedStrafeTimer || 0) - 1;
      if (this._rangedStrafeTimer <= 0) {
        this._rangedStrafeDir   = Math.random() < 0.5 ? 1 : -1;
        this._rangedStrafeTimer = _isDominating
          ? 10 + Math.floor(Math.random() * 15)  // fast repositioning when dominant
          : 18 + Math.floor(Math.random() * 22); // normal 0.3-0.67s
      }

      // Aim pause: slow-strafe instead of full stop so bot is never standing still
      if (this._rangedAimPause > 0) {
        this._rangedAimPause--;
        const _aimStrf = this.isEdgeDanger(this._rangedStrafeDir) ? -this._rangedStrafeDir : this._rangedStrafeDir;
        this.vx = _aimStrf * spd * 0.22; // very slow walk while aiming — not a statue
        this.facing = dir;
        if (this.cooldown <= 0) this.attack(t);
        if (this.abilityCooldown <= 0 && Math.random() < 0.18) this.ability(t);
        return;
      }
      // Schedule aim pause every 1.5-3s (skip when dominant — keep pushing)
      if (!_isDominating && Math.random() < 0.012) this._rangedAimPause = 8 + Math.floor(Math.random() * 12);

      if (d < _closeRange && _isLowHp) {
        // PANIC: enemy too close — back away and don't shoot (point-blank penalty)
        const escapeDir = -dir;
        if (!this.isEdgeDanger(escapeDir)) {
          this.vx = escapeDir * spd * 1.6;
        } else if (!this.isEdgeDanger(dir)) {
          this.vx = dir * spd * 1.2; // edge behind, try to pass through
        }
        if (this.onGround && Math.random() < 0.30) this.vy = -18; // jump away
      } else if (d > _optMax) {
        // PRESSURE: chase into range, shoot opportunistically. Routed through the
        // platform graph — walking straight at the target stalls forever against a
        // ledge when the target is standing above.
        const _rWp = (typeof pfGetNextWaypoint === 'function' && !this.isBoss)
          ? pfGetNextWaypoint(this, t.cx(), t.y + t.h * 0.5) : null;
        const _rDir = _rWp ? (_rWp.x > this.cx() ? 1 : -1) : dir;
        const _rSpd = spd * (_targetIsRanged ? 1.30 : (_isDominating ? 1.20 : 1.00));
        if (!this.isEdgeDanger(_rDir)) this.vx = _rDir * _rSpd;
        if (_rWp && (_rWp.action === 'jump' || _rWp.action === 'doubleJump')) {
          this.vx = _rDir * _rSpd;
          if (this.onGround) this.vy = -20;
          else if (_rWp.action === 'doubleJump' && this.canDoubleJump && this.vy >= -2) {
            this.vy = -17; this.canDoubleJump = false;
          }
        } else if (this.onGround && (this.isEdgeDanger(_rDir) || t.y + t.h < this.y - 60)) {
          this.vy = -19;
        }
        if (d < this.weapon.range * 1.1 + 20 && this.cooldown <= 0) this.attack(t);
      } else {
        // OPTIMAL RANGE: strafe continuously — never stand still
        const strafeDir = this.isEdgeDanger(this._rangedStrafeDir) ? -this._rangedStrafeDir : this._rangedStrafeDir;
        if (d < _optMin && _isLowHp && !this.isEdgeDanger(-dir)) {
          // Too close — back off
          this.vx = -dir * spd * 0.75;
        } else {
          // Dominant bots strafe faster to close in; low-HP bots strafe to maintain distance
          this.vx = strafeDir * spd * (_isDominating ? 0.95 : _isLowHp ? 0.68 : 0.78);
          if (!this.isEdgeDanger(dir) && d > this.weapon.range * 0.55) this.vx += dir * spd * (_targetIsRanged ? 0.58 : (_isLowHp ? 0.22 : 0.42));
        }
        this.facing = dir;
        if (this.cooldown <= 0 && Math.random() < (this.aiDiff === 'easy' ? 0.55 : this.aiDiff === 'medium' ? 0.75 : 0.90)) {
          this.attack(t);
        }
        if (this.abilityCooldown <= 0 && Math.random() < 0.15) this.ability(t);
      }
      if (this.superReady && Math.random() < 0.22) this.useSuper(t);
      return;
    }

    // ---- IMMEDIATE ATTACK OVERRIDE (melee only) ----
    // If in range and cooldown ready, always attack — bypass the utility state machine.
    if (t && t.health > 0 && this.cooldown <= 0) {
      const atkRange = this.weapon.range * 1.1 + 20;
      if (d < atkRange) {
        this.attack(t);
      }
    }
    const _abiFreqNow = Math.min(1, (this.aiDiff === 'easy' ? 0.10 : this.aiDiff === 'medium' ? 0.20 : this.aiDiff === 'hard' ? 0.35 : 0.55) * _worldAggro);
    if (t && this.abilityCooldown <= 0 && d < 280 && Math.random() < _abiFreqNow) {
      this.ability(t);
    }
    if (this.superReady && Math.random() < 0.22) { this.useSuper(t); }

    // Emergency super: if critically low health and super is ready, fire immediately
    if (this.health < 40 && this.superReady) { this.useSuper(t); }

    // ---- NO-IDLE SYSTEM: inactivity enforcement + micro-randomization + intent movement ----
    if (!this.isBoss) {
      const isMoving = Math.abs(this.vx) > 0.8 || !this.onGround;
      const isActing = this.state === 'attacking' || this.shielding;
      if (isMoving || isActing) {
        this._inactiveTime = 0;
      } else {
        this._inactiveTime++;
      }

      // Force engagement: if idle too long, immediately close and attack
      if (this._inactiveTime > 2) { // 2 AI ticks ~30 frames = ~0.5s
        this._inactiveTime = 0;
        if (typeof debugMode !== 'undefined' && debugMode) {
          console.warn('[AI no-idle]', { intent: this.intent, d, playerIdle: this._playerIdleTmr });
        }
        const forceDir = Math.sign(t.cx() - this.cx());
        if (!this.isEdgeDanger(forceDir)) this.vx = forceDir * spd * 1.5;
        if (this.onGround && !this.isEdgeDanger(dir) && (this.platformAbove() || Math.random() < 0.35)) this.vy = -17;
        if (this.cooldown <= 0 && d < this.weapon.range * 1.5 + 35) this.attack(t);
        return;
      }

      // Player is idle → increase aggression: attack more freely and close faster
      if (this._playerIdleTmr > 60) { // target idle for ~1s at AI tick rate
        if (this.cooldown <= 0 && d < this.weapon.range * 1.4 + 40) this.attack(t);
        if (!this.isEdgeDanger(dir) && Math.abs(this.vx) < spd * 0.6) this.vx = dir * spd * 0.9;
      }

      // Micro-randomization pulse every 0.5–1.5s: keeps AI feeling alive even in calm stretches
      this._microRandTimer--;
      if (this._microRandTimer <= 0) {
        this._microRandTimer = 30 + Math.floor(Math.random() * 60); // 30-90 AI ticks
        const roll = Math.random();
        if (roll < 0.30 && this.cooldown <= 0 && d < this.weapon.range * 1.5 + 45) {
          this.attack(t);                                              // 30% sudden attack
        } else if (roll < 0.50 && this.onGround && !this.isEdgeDanger(dir)) {
          this.vy = -17;                                              // 20% random jump
        } else if (roll < 0.70 && !this.isEdgeDanger(dir)) {
          this._wanderDir   = Math.random() < 0.70 ? dir : -dir;    // 20% reposition burst
          this._wanderTimer = 12 + Math.floor(Math.random() * 14);
        }
        // remaining 30%: no-op (natural pause keeps rhythm varied)
      }

      // Intent-based passive movement: always drift toward the current goal
      // Only kicks in when the bot is nearly stationary (utility AI will override if needed)
      if (Math.abs(this.vx) < 0.6) {
        switch (this.intent) {
          case 'pressure':
            if (!this.isEdgeDanger(dir)) this.vx = dir * spd * 0.90;
            break;
          case 'bait': {
            const baitGap = this.weapon.range + 50;
            if (d > baitGap + 30 && !this.isEdgeDanger(dir))  this.vx = dir  * spd * 0.50;
            if (d < baitGap - 30 && !this.isEdgeDanger(-dir)) this.vx = -dir * spd * 0.45;
            break;
          }
          case 'retreat':
            if (!this.isEdgeDanger(-dir)) this.vx = -dir * spd * 0.30;
            break;
          case 'reposition': {
            const toCenter = GAME_W / 2 - this.cx();
            const rDir2 = Math.sign(toCenter);
            if (Math.abs(toCenter) > 40 && !this.isEdgeDanger(rDir2)) this.vx = rDir2 * spd * 0.55;
            break;
          }
        }
      }
    }

    // ---- UTILITY AI: score-based action selection + raycast hazard detection ----
    // Replaces the old state machine; handles movement, combat, dodge, and reaction lag.
    this.executeUtilityAI(t);
  }

  // ---- DRAW ----
  draw() {
    if (this.backstageHiding) return;
    // Trial of Sense: the body is not rendered, but everything else about it —
    // hitbox, physics, AI — is untouched. Perception cues are drawn separately
    // by smb-trials.js so the fight still has feedback once engaged.
    if (this._trialInvisible && this.health > 0) return;
    if (this._cinPerf && typeof CinPerf !== 'undefined' && CinPerf.draw(this)) return;
    // A running DeathAnim owns the body for its authored beats; once it hands off
    // to the verlet corpse it sets _death.hidden and this guard resumes.
    const _dth = this._death;
    if (this.health <= 0 && !this.isBoss && !this.isDummy && !(_dth && !_dth.hidden)) return; // ragdolls handle dead fighter visuals; dummies always draw

    ctx.save();

    // Scale transform for oversized fighters — pivot at feet so players stay grounded
    if (this.drawScale && this.drawScale !== 1) {
      const pivX = this.cx();
      const pivY = this.y + this.h;   // feet = ground level
      ctx.translate(pivX, pivY);
      ctx.scale(this.drawScale, this.drawScale);
      ctx.translate(-pivX, -pivY);
    }

    // Invincibility blink — suppressed during a finisher, where both fighters carry
    // a huge invincible timer purely as a freeze-alive lock (blinking them looks broken).
    if (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 1 && !this._finNoBlink && !_dth) {
      ctx.globalAlpha = 0.35;
    }

    const cx = this.cx();
    const ty = this.y;
    const f  = this.facing;
    // Finisher pose override (render-only — never touches attackTimer, so no hitboxes fire).
    // _finPoseP = swing progress 0..1; _finPoseState = forced pose state ('hurt' etc).
    const s  = (this._finPoseP !== null && this._finPoseP !== undefined) ? 'attacking'
             : (this._finPoseState || this.state);
    const t  = this.animTimer;

    // ---- Scripted animation ----

    // Boss phase aura glow (phase 2+)
    if (this.isBoss && settings.bossAura) {
      const bPhase = this.getPhase ? this.getPhase() : 0;
      if (bPhase >= 2) {
        ctx.save();
        const pulse = 0.10 + Math.sin(t * 0.09) * 0.05;
        ctx.globalAlpha = pulse;
        ctx.fillStyle   = bPhase >= 3 ? '#ff2200' : '#9900cc';
        ctx.shadowColor = bPhase >= 3 ? '#ff6600' : '#cc00ff';
        ctx.shadowBlur  = 40;
        ctx.beginPath();
        ctx.ellipse(cx, ty + this.h * 0.5, this.w * 2.0, this.h * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Ragdoll body rotation — use accumulated angular momentum
    if (this.ragdollTimer > 0) {
      ctx.translate(cx, ty + this.h * 0.45);
      ctx.rotate(this.ragdollAngle);
      ctx.translate(-cx, -(ty + this.h * 0.45));
    }

    // Death fold: the torso scalar the ragdoll already computes is otherwise
    // unread by draw() — only the four limb angles are. Applying it as a body
    // rotation about the hips is what turns the death beats from "the figure
    // translates" into "the figure gives way". Gated to a running DeathAnim;
    // the general rig gains this in Phase 2 of the animation plan.
    if (_dth && !_dth.hidden && this._rd) {
      const _dTorso = this._rd.torso.angle;
      if (_dTorso) {
        const _hipY = ty + this.h * 0.62;
        ctx.translate(cx, _hipY);
        ctx.rotate(_dTorso);
        ctx.translate(-cx, -_hipY);
      }
    }

    // Squash / stretch / idle breath
    let animScaleX = 1, animScaleY = 1, animOffY = 0;
    if (!this.isBoss) {
      if (this.squashTimer > 0) {
        // Landing squash: compress vertically
        const sq = this.squashTimer / 4;
        animScaleX = 1 + sq * 0.15;
        animScaleY = 1 - sq * 0.15;
        this.squashTimer--;
      } else if (!this.onGround && this.vy < -8) {
        // Jump stretch: elongate vertically
        animScaleY = 1.12; animScaleX = 0.92;
      } else if (this.onGround && s === 'idle') {
        // Idle breath
        animOffY = Math.sin(t * 0.04) * 1;
      }
      // Impact squash from knockback, on top of the landing squash above.
      if (typeof animHitSquash === 'function') {
        const _hq = animHitSquash(this);
        if (_hq) { animScaleX *= _hq.x; animScaleY *= _hq.y; }
      }
      if (this._finSquash) { animScaleX *= this._finSquash.x; animScaleY *= this._finSquash.y; }
      if (animScaleX !== 1 || animScaleY !== 1) {
        ctx.translate(cx, ty + this.h);
        ctx.scale(animScaleX, animScaleY);
        ctx.translate(-cx, -(ty + this.h));
      }
    }

    const headR     = FIG_HEAD_R;
    // Head bob: discrete step phases (every 8 frames) so it dips once per stride like the prequel
    const _walkStepPhase = Math.floor(t / 8) % 4;
    // Sprint blend: 0 = walk, 1 = full run. Ramps in after sustained movement
    // (see updateFragmentManifest) so a stroll and a committed run read apart.
    // A jump is part of the run, not a break in it — the sprint blend carries
    // through the air so he launches and lands still running. Only a wall kills
    // it (see _wallHitT in updateFragmentManifest).
    const _inAir    = (s === 'jumping' || s === 'falling');
    const _spr      = ((s === 'walking' || _inAir) && this._sprintAmt) ? this._sprintAmt : 0;
    const headBob   = (s === 'walking') ? Math.abs(Math.sin(_walkStepPhase * Math.PI / 2)) * (2.2 + _spr * 1.6) : 0;
    const headCY    = ty + headR + 1 + animOffY + headBob + _spr * 2.5; // head drops as he commits
    const neckY     = headCY + headR + 1;
    const shoulderY = neckY + FIG_NECK;
    const hipY      = shoulderY + 30;
    // Torso pitch. The body line runs neck(cx) → hip(hipX), so a POSITIVE hipX
    // offset puts the hips ahead of the shoulders — that leans him backward.
    // Sprinting drives the hips behind the shoulders instead, pitching the chest
    // out over trailing legs (the anime dash silhouette).
    // Pelvis/shoulder counter-rotation: during a stride the hips swing one way
    // and the shoulders the other. One extra scalar, and the walk stops reading
    // as a rigid board sliding along.
    const _pelvis = ((typeof animHiQ === 'function') && animHiQ() && !this.isBoss && s === 'walking')
      ? Math.sin(t * (0.24 + _spr * 0.22)) * (2.0 + _spr * 2.2) : 0;
    const hipX      = cx + _pelvis + (s === 'walking' ? f * (2.5 - _spr * 22)
                          : (_inAir ? f * (-_spr * 22) : 0));
    const shoulderX = cx - _pelvis * 0.8;
    const armLen    = FIG_ARM_LEN;
    const legLen    = FIG_LEG_LEN;
    // Inline helper: 2-segment limb joint via midpoint offset (classic rig)
    const _lj = (ax, ay, bx, by, ox, oy) => [(ax+bx)*0.5 + ox, (ay+by)*0.5 + oy];
    // High-quality rig: the joint falls out of two-bone IK instead, so the bend
    // responds to the pose. See animIK() in js/smb-anim-fighter.js.
    const _hiQ = (typeof animHiQ === 'function') && animHiQ() && !this.isBoss;
    const _armBone = armLen * 0.60;   // each of the two arm bones
    const _legBone = legLen * 0.58;   // each of the two leg bones

    // Speed cached for motion trail and speed lines (used in two places below)
    const _spdAbs = Math.abs(this.vx);

    // ── MOTION AFTERIMAGE ───────────────────────────────────────────────────
    // Ghosted head+body copies trail behind the fighter when moving fast.
    if (_spdAbs > 3.0 && !this.isBoss && !this.squashTimer && this.ragdollTimer <= 0) {
      const _ghosts = _spdAbs > 5.5 ? 3 : 2;
      for (let _gi = _ghosts; _gi >= 1; _gi--) {
        const _gAlpha = (_ghosts - _gi + 1) * 0.055;
        const _gOff   = -Math.sign(this.vx) * _gi * 7;
        ctx.save();
        ctx.globalAlpha = _gAlpha;
        ctx.strokeStyle = this.color;
        ctx.fillStyle   = this.color;
        ctx.lineWidth   = 5;
        ctx.lineCap     = 'round';
        const _gcx = cx + _gOff;
        ctx.beginPath(); ctx.arc(_gcx, headCY, headR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(_gcx, neckY); ctx.lineTo(_gcx + (hipX - cx), hipY); ctx.stroke();
        ctx.restore();
      }
    }

    ctx.strokeStyle = this.color;
    ctx.lineWidth   = FIG_LINE_W;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    // HEAD — drags a few frames behind the torso's lean (overlap/follow-through).
    // Scoped to the head + face block; the torso line and limbs still use cx.
    const headCX = (typeof animHeadLag === 'function' && !this.isBoss)
      ? cx + animHeadLag(this, (hipX - cx) * -0.35, 4, 2) : cx;
    ctx.beginPath();
    ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    // Soft underside shading — gives the head volume instead of a flat disc
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    ctx.arc(headCX, headCY + 2.2, headR - 1.6, Math.PI * 0.12, Math.PI * 0.88);
    ctx.fill();
    // Top-light sheen on the facing side
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath();
    ctx.ellipse(headCX + f * 3.0, headCY - 5.2, 4.6, 2.6, f * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // ── FACE ──────────────────────────────────────────────────
    // 3/4-view face: large near eye toward facing + smaller far eye, brows
    // anchored just above each eye (the old single brow floated at the very
    // top of the head and read as detached marks).
    const _expr = this.expressionState || 'neutral';
    const _eyeX  = headCX + f * 4.2;   // near eye
    const _eyeY  = headCY - 3.2;
    const _eyeR  = 2.6;
    const _eye2X = headCX - f * 1.8;   // far eye (smaller — perspective)
    const _eye2R = 2.1;

    // Scleras
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(_eyeX,  _eyeY, _eyeR,  0, Math.PI * 2);
    ctx.arc(_eye2X, _eyeY, _eye2R, 0, Math.PI * 2);
    ctx.fill();

    // Half-lid: paint a sliver of head color back over the top of both eyes
    if (_expr === 'cool' || _expr === 'serene') {
      ctx.fillStyle = this.color;
      ctx.fillRect(_eyeX  - _eyeR  - 0.5, _eyeY - _eyeR,  _eyeR  * 2 + 1, _eyeR  * 0.65);
      ctx.fillRect(_eye2X - _eye2R - 0.5, _eyeY - _eye2R, _eye2R * 2 + 1, _eye2R * 0.65);
    }

    // Pupils — track the nearest opponent instead of staring straight ahead.
    // The look offset is tiny (the sclera is 2.6px) but it is what makes the
    // fighter read as watching the fight rather than facing a direction.
    const _look = (typeof animEyeTarget === 'function' && !this.isBoss)
      ? animEyeTarget(this) : { x: 0, y: 0 };
    const _lookX = f * 0.8 + _look.x * 1.15;
    const _lookY = 0.2 + _look.y * 0.9;
    ctx.fillStyle = s === 'hurt' ? '#ff0000' : '#111';
    ctx.beginPath();
    ctx.arc(_eyeX  + _lookX, _eyeY + _lookY, 1.25, 0, Math.PI * 2);
    ctx.arc(_eye2X + _lookX * 0.88, _eyeY + _lookY, 1.05, 0, Math.PI * 2);
    ctx.fill();
    // Catchlight on the near pupil
    if (s !== 'hurt') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(_eyeX + _lookX - 0.45, _eyeY - 0.3 + _lookY, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blink — a lid of head colour sweeps down over both eyes. Each fighter has
    // its own phase offset so a crowd never blinks in unison.
    const _blink = (typeof animBlink === 'function' && !this.isBoss && s !== 'hurt')
      ? animBlink(this) : 0;
    if (_blink > 0.01) {
      ctx.fillStyle = this.color;
      const _lid = (_eyeR + 0.6) * 2 * _blink;
      ctx.fillRect(_eyeX  - _eyeR  - 0.6, _eyeY - _eyeR  - 0.6, _eyeR  * 2 + 1.2, _lid);
      ctx.fillRect(_eye2X - _eye2R - 0.6, _eyeY - _eye2R - 0.6, _eye2R * 2 + 1.2, _lid);
    }

    // Eyebrows — short arcs hugging each eye; expression tilts the inner end
    let _browIn = 0, _browOut = 0, _browLift = 0;  // y-offsets: inner end, outer end, mid peak
    if (s === 'hurt') {
      _browIn = -1.5; _browOut = 0.5; _browLift = -0.5;  // worried ↗
    } else if (s === 'attacking' || _expr === 'focused' || _expr === 'intense') {
      _browIn = 1.5; _browOut = -0.5; _browLift = 0.8;   // determined ↘
    } else if (_expr === 'cool') {
      _browIn = 0.5; _browOut = -0.5; _browLift = 0.3;   // cool slight ↘
    }
    const _browY = _eyeY - 4.4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth   = 1.6;
    ctx.beginPath();
    ctx.moveTo(_eyeX + f * 2.9, _browY + _browOut);
    ctx.quadraticCurveTo(_eyeX, _browY - 1.6 + _browLift, _eyeX - f * 2.6, _browY + _browIn);
    ctx.stroke();
    // Far brow — shorter and fainter
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth   = 1.4;
    ctx.beginPath();
    ctx.moveTo(_eye2X + f * 2.2, _browY + _browOut * 0.7);
    ctx.quadraticCurveTo(_eye2X, _browY - 1.3 + _browLift * 0.7, _eye2X - f * 1.9, _browY + _browIn * 0.7);
    ctx.stroke();

    // Mouth — canvas y-down: arc(…,0,π,false)=∪=smile; arc(…,0,π,true)=∩=frown
    ctx.lineWidth = 1.5;
    if (s === 'hurt') {
      ctx.strokeStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(headCX + f * 3.5, headCY + 5, 2.5, 0, Math.PI, true); // ∩ frown
      ctx.stroke();
    } else if (_expr === 'cool' || _expr === 'serene') {
      // Smirk: rises toward the ear side
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.moveTo(headCX + f * 0.5, headCY + 5);
      ctx.quadraticCurveTo(headCX + f * 3.5, headCY + 5.5, headCX + f * 6.5, headCY + 3.5);
      ctx.stroke();
    } else if (_expr === 'intense') {
      // Grim tight line
      ctx.strokeStyle = '#ff3333';
      ctx.beginPath();
      ctx.moveTo(headCX + f * 1.0, headCY + 5.5);
      ctx.lineTo(headCX + f * 6.0, headCY + 5.5);
      ctx.stroke();
    } else if (s === 'attacking') {
      ctx.strokeStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(headCX + f * 3.5, headCY + 5, 2.5, 0, Math.PI, true); // ∩ grit/shout
      ctx.stroke();
    } else {
      // neutral — subtle smirk, ear side lifts slightly
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.moveTo(headCX - f * 0.5, headCY + 5.2);
      ctx.quadraticCurveTo(headCX + f * 2.0, headCY + 5.6, headCX + f * 4.5, headCY + 4.0);
      ctx.stroke();
    }

    // ACCESSORIES (hat, cape)
    drawAccessory(this, cx, headCY, shoulderY, hipY, f, headR);
    // STORY CHARACTER UNIQUE LOOK
    if (this.storyCharId && typeof drawStoryCharacterOverlay === 'function') {
      drawStoryCharacterOverlay(this, cx, headCY, shoulderY, hipY, f, headR);
    }

    // BODY (leans forward when walking)
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 6;
    ctx.beginPath();
    ctx.moveTo(cx, neckY);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    // ARM ANGLES
    const atkProgress = (this._finPoseP !== null && this._finPoseP !== undefined) ? this._finPoseP
                      : (this.attackDuration > 0 ? 1 - this.attackTimer / this.attackDuration : 0);
    let rAng, lAng;

    // Empty-handed sprint blend, shared by the ground and air poses. Arms only
    // stream back when the fragment weapon is actually gone — a runner holding a
    // hammer behind his back looks broken, so an armed sprint keeps the carry pose.
    const _armed = (this._fragArm === undefined) ? 1 : this._fragArm;
    const _blade = _spr * (1 - Math.min(1, _armed * 1.6));

    if (this._rd && this.spinning <= 0) {
      rAng = this._rd.rArm.angle;
      lAng = this._rd.lArm.angle;
    } else if (this.spinning > 0) {
      // (fall through to spinning block below)
      rAng = 0; lAng = Math.PI; // placeholder; overwritten below
    }

    if (this.spinning > 0) {
      const spinA = (this.spinning / 24) * Math.PI * 4;
      rAng = spinA;
      lAng = spinA + Math.PI;
    } else if (s === 'attacking') {
      // Swing grammar drives the weapon arm; balance arm keeps the legacy counter-pose.
      if (this.charClass === 'megaknight') {
        rAng = f > 0 ? lerp(1.2, -1.1, atkProgress) : lerp(Math.PI - 1.2, Math.PI + 1.1, atkProgress);
        this._swingArmStretch = 1;
      } else {
        const _sp = (typeof swingPose === 'function') ? swingPose(this.weaponKey, atkProgress, f, this._jabAlt) : null;
        rAng = _sp ? _sp.ang
                   : (f > 0 ? lerp(-0.45, 1.1, atkProgress) : lerp(Math.PI + 0.45, Math.PI - 1.1, atkProgress));
        // Thrust/jab weapons: arm visibly extends with the reach curve
        this._swingArmStretch = (_sp && _sp.reachFrac !== 1) ? 0.65 + 0.5 * _sp.reachFrac : 1;
      }
      lAng = f > 0 ? lerp(Math.PI*0.8, Math.PI*0.55, atkProgress) : lerp(Math.PI*0.2, Math.PI*0.45, atkProgress);
    } else if (s === 'walking') {
      // Arms swing in antiphase to the legs off the same distance-driven gait
      // phase (one frame stale, since the legs are solved below — which is free
      // overlap, not a bug). Falls back to the animTimer cycle in classic mode.
      const sw = (_hiQ && this._gaitPhase !== undefined)
        ? -Math.sin(this._gaitPhase) * (0.52 + _spr * 0.22)
        : Math.sin(t * (0.24 + _spr * 0.20)) * (0.52 + _spr * 0.22);
      // Carry pose: weapon arm holds its carry stance while the off arm keeps swinging
      const _cw = (!this.isBoss && typeof WEAPON_SWINGS !== 'undefined' && WEAPON_SWINGS[this.weaponKey]) ? WEAPON_SWINGS[this.weaponKey].carry : null;
      if (_blade > 0.05) {
        // Both arms straight back and a touch ABOVE horizontal, streaming behind
        // him. Canvas angles: 0 = +X, PI/2 = down. Facing right (f>0) the arms
        // must point past PI to sit above the horizontal, not below it.
        const back = f > 0 ? Math.PI * 1.04 : -Math.PI * 0.04;
        const rest = f > 0 ? Math.PI * 0.58 : Math.PI * 0.42;
        rAng = lerp(rest, back + sw * 0.06, _blade);
        lAng = lerp(Math.PI * 0.42 - sw, back + f * 0.10 - sw * 0.06, _blade);
      } else if (_cw) {
        rAng = (f > 0 ? _cw.arm : Math.PI - _cw.arm) + sw * 0.06; // tiny bob so the carry isn't frozen
        lAng = _cw.lArm !== undefined ? (f > 0 ? _cw.lArm : Math.PI - _cw.lArm) : Math.PI * 0.42 - sw;
      } else {
        rAng = Math.PI * 0.58 + sw;
        lAng = Math.PI * 0.42 - sw;
      }
    } else if (s === 'jumping' || s === 'falling') {
      // Drive the pose off vertical speed: arms sweep up on the launch and
      // settle out as he tops the arc and starts to drop.
      const _rise = Math.max(-1, Math.min(1, -this.vy / 9));
      rAng = -0.25 - _rise * 0.55;
      lAng = Math.PI + 0.25 + _rise * 0.55;
      if (_blade > 0.05) {
        // Running jump: keep the arms trailing so the sprint reads through the
        // whole arc instead of snapping to a neutral jump and back.
        const back = f > 0 ? Math.PI * 1.04 : -Math.PI * 0.04;
        rAng = lerp(rAng, back, _blade);
        lAng = lerp(lAng, back + f * 0.12, _blade);
      }
    } else if (s === 'shielding') {
      rAng = f > 0 ? -0.25 : Math.PI + 0.25;
      lAng = f > 0 ? -0.55 : Math.PI + 0.55;
    } else {
      const b = Math.sin(t * 0.045) * 0.045;
      const _ci = (!this.isBoss && typeof WEAPON_SWINGS !== 'undefined' && WEAPON_SWINGS[this.weaponKey]) ? WEAPON_SWINGS[this.weaponKey].carry : null;
      if (_ci) {
        rAng = (f > 0 ? _ci.arm : Math.PI - _ci.arm) + b;
        lAng = _ci.lArm !== undefined ? (f > 0 ? _ci.lArm : Math.PI - _ci.lArm) : Math.PI * 0.42 - b;
      } else {
        rAng = Math.PI * 0.58 + b;
        lAng = Math.PI * 0.42 - b;
      }
    }

    // Finisher wind-up: counter-motion applied on top of the swing pose, since
    // swingPose() clamps progress and cannot express angles before the swing.
    if (this._finAnticip) {
      rAng -= this._finAnticip * f;
      lAng += this._finAnticip * f * 0.35;
    }
    let _rArmLen = (s === 'attacking' && this._swingArmStretch) ? armLen * this._swingArmStretch : armLen;
    if (this._finStretch) _rArmLen *= this._finStretch;
    const rEx = shoulderX + Math.cos(rAng) * _rArmLen;
    const rEy = shoulderY + Math.sin(rAng) * _rArmLen;
    const lEx = shoulderX + Math.cos(lAng) * armLen;
    const lEy = shoulderY + Math.sin(lAng) * armLen;

    // 2-segment arms: elbows bend outward (in facing direction) and slightly up
    const elbowOut = f * 5;
    const [rElbX, rElbY] = _hiQ
      ? animIK(shoulderX, shoulderY, rEx, rEy, _armBone, -f)
      : _lj(shoulderX, shoulderY, rEx, rEy, elbowOut, -3);
    const [lElbX, lElbY] = _hiQ
      ? animIK(shoulderX, shoulderY, lEx, lEy, _armBone, -f)
      : _lj(shoulderX, shoulderY, lEx, lEy, elbowOut, -3);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 5;
    // ── LIMB SMEAR ──────────────────────────────────────────────────────────
    // A fast weapon arm draws as a few trailing ghosts along its own arc rather
    // than one crisp stick. Driven off the arm's angular velocity frame to
    // frame, so it costs nothing when the arm is not moving.
    // Only committed motion smears — a walk cycle's arm swing must not, or every
    // step trails ghosts.
    // _finSmear is set by the finisher engine across its swing windows. A
    // finisher never sets state 'attacking' (writing attackTimer would re-arm the
    // melee hit-scan), so without this the game's biggest swing was the only one
    // that never trailed.
    const _canSmear = (s === 'attacking' || s === 'ragdoll' || this.spinning > 0 ||
                       !!this._finSmear);
    if (_hiQ && _canSmear && typeof animSmear === 'function') {
      const _pv = this._smearPrev;
      this._smearPrev = { x: rEx, y: rEy, ex: rElbX, ey: rElbY };
      const _dsp = _pv ? Math.hypot(rEx - _pv.x, rEy - _pv.y) : 0;
      // The 11px gate exists so a walk cycle's arm swing does not ghost every
      // step. A finisher has no walk cycle — the pose is authored and the swing
      // IS the showcase — so it gets a lower bar, or only the two fastest frames
      // of the whole sequence trail.
      if (_dsp > (this._finSmear ? 6 : 11)) {
        // animSmear applies the offset via ctx.translate, so drawFn just draws
        // the arm where it is now; the path runs from last frame's hand back to
        // this one, which puts the ghosts along the swing.
        animSmear(() => {
          ctx.strokeStyle = this.color;
          ctx.lineWidth   = 5;
          ctx.beginPath();
          ctx.moveTo(shoulderX, shoulderY);
          ctx.lineTo(rElbX, rElbY);
          ctx.lineTo(rEx, rEy);
          ctx.stroke();
        }, _pv.x - rEx, _pv.y - rEy, 0, 0,
           this._finSmear ? this._finSmear.samples : 4,
           this._finSmear ? this._finSmear.alpha   : 0.34);
      }
    } else {
      this._smearPrev = { x: rEx, y: rEy, ex: rElbX, ey: rElbY };
    }
    ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(rElbX, rElbY); ctx.lineTo(rEx, rEy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(lElbX, lElbY); ctx.lineTo(lEx, lEy); ctx.stroke();

    // WEAPON in right hand (boss draws gauntlet on both hands for visual flair)
    const weapScale = this.isBoss ? 1.0 : 1.5;
    // Fragment bearers hold nothing until the pattern surfaces — _fragV is null
    // for everyone else, so their weapon draws exactly as before.
    const _fragV = (typeof fragmentWeaponVisual === 'function') ? fragmentWeaponVisual(this) : null;
    if (_fragV && typeof drawFragmentArmSurge === 'function') {
      // Light feeds up the arm first — the surge precedes the shape.
      drawFragmentArmSurge(this, cx, shoulderY, rElbX, rElbY, rEx, rEy);
    }
    if (!_fragV || _fragV.grow > 0.02) {
      ctx.save();
      if (_fragV) {
        ctx.globalAlpha *= _fragV.alpha;
        // Scale about the hand along the weapon's own axis so it extrudes out of
        // the fist rather than inflating uniformly.
        ctx.translate(rEx, rEy);
        ctx.rotate(rAng);
        ctx.scale(_fragV.grow, _fragV.taper);
        ctx.rotate(-rAng);
        ctx.translate(-rEx, -rEy);
      }
      if (!this._hideWeapon) this.drawWeapon(rEx, rEy, rAng, s === 'attacking', this._domainDisplayWeapon || null, weapScale);
      ctx.restore();
    }
    if (_fragV && typeof drawFragmentManifest === 'function') {
      drawFragmentManifest(this, rEx, rEy, rAng, weapScale);
    }
    if (this.isBoss && this.weaponKey === 'gauntlet') {
      this.drawWeapon(lEx, lEy, lAng + Math.PI, s === 'attacking', 'gauntlet', weapScale);
    }
    // Combat brawler fights bare-handed — give the off-hand a matching fist so the
    // guard stance reads as two fists instead of one hand and one bare arm stub.
    if (!this.isBoss && this.weaponKey === 'combat' && !this._domainDisplayWeapon) {
      ctx.save();
      ctx.fillStyle   = this.color;
      ctx.beginPath(); ctx.arc(lEx, lEy, 4.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.globalAlpha = 0.2; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(lEx - 1.2, lEy - 1.4, 2.0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // LEGS
    let rLeg, lLeg;
    if (this._rd && this.spinning <= 0) {
      rLeg = this._rd.rLeg.angle;
      lLeg = this._rd.lLeg.angle;
    } else if (s === 'stunned') {
      rLeg = Math.PI * 0.6; lLeg = Math.PI * 0.4;
    } else if (s === 'jumping' || s === 'falling') {
      // Tuck on the way up, extend to meet the ground on the way down.
      const _rise = Math.max(-1, Math.min(1, -this.vy / 9));
      const _tuck = Math.max(0, _rise);
      const _reach = Math.max(0, -_rise);
      rLeg = Math.PI * (0.62 - _tuck * 0.14 + _reach * 0.04);
      lLeg = Math.PI * (0.38 + _tuck * 0.10 - _reach * 0.03);
      if (_spr > 0.05) {
        // Running jump: legs split front-to-back mid-stride rather than tucking
        // symmetrically, and the whole cycle pitches out behind him.
        const split = _spr * f * 0.20;
        rLeg += split;
        lLeg -= split * 0.55;
      }
    }
    else if (s === 'walking') {
      // Sprint drives the stride faster and wider, and pitches the whole cycle
      // forward so the legs are driving behind him rather than stepping under.
      const _amp   = 0.44 + _spr * 0.30;
      // Stride phase from distance travelled, not from animTimer — see
      // animStridePhase(). This is what stops the feet skating.
      const _phase = (_hiQ && typeof animStridePhase === 'function')
        ? animStridePhase(this, legLen, _amp, t * (0.24 + _spr * 0.22))
        : t * (0.24 + _spr * 0.22);
      const sw = Math.sin(_phase) * _amp;
      const pitch = _spr * f * 0.24; // drives the whole leg cycle out behind him
      rLeg = Math.PI * 0.5 + sw + pitch;
      lLeg = Math.PI * 0.5 - sw + pitch;
      this._gaitPhase = _phase;   // arms read this so they swing with the legs
    } else { rLeg = Math.PI*0.62; lLeg = Math.PI*0.38; }

    // 2-segment legs: knees bend forward (in facing direction)
    let rFootX = hipX + Math.cos(rLeg)*legLen, rFootY = hipY + Math.sin(rLeg)*legLen;
    let lFootX = hipX + Math.cos(lLeg)*legLen, lFootY = hipY + Math.sin(lLeg)*legLen;
    const kneeOut = f * 5;
    const [rKneeX, rKneeY] = _hiQ
      ? animIK(hipX, hipY, rFootX, rFootY, _legBone, -f)
      : _lj(hipX, hipY, rFootX, rFootY, kneeOut, 0);
    const [lKneeX, lKneeY] = _hiQ
      ? animIK(hipX, hipY, lFootX, lFootY, _legBone, -f)
      : _lj(hipX, hipY, lFootX, lFootY, kneeOut, 0);
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(rKneeX, rKneeY); ctx.lineTo(rFootX, rFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lFootY); ctx.stroke();

    // ── SPEED LINES ─────────────────────────────────────────────────────────
    // Horizontal streaks on the trailing side of the fighter when running fast.
    if (_spdAbs > 3.5 && !this.isBoss && this.ragdollTimer <= 0) {
      const _slDir = -Math.sign(this.vx);
      ctx.save();
      ctx.lineCap = 'round';
      for (let _si = 0; _si < 5; _si++) {
        const _slY   = headCY + 8 + _si * 13;
        const _slLen = 6 + (4 - Math.abs(_si - 2)) * 3;
        const _slX   = cx + _slDir * 14;
        ctx.globalAlpha = 0.28 + Math.sin(t * 0.4 + _si * 0.9) * 0.08;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(_slX, _slY);
        ctx.lineTo(_slX + _slDir * _slLen, _slY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // SHIELD bubble (or raised kite shield for Paladin)
    if (this.shielding) {
      if (this.charClass === 'paladin' && this.weaponKey === 'shield') {
        // Draw a large raised kite shield in blocking position
        const shX = cx + f * 20;
        const shY = shoulderY + 2;
        ctx.save();
        ctx.translate(shX, shY);
        ctx.scale(1.8, 1.8);
        ctx.fillStyle = '#4466cc';
        ctx.beginPath();
        ctx.moveTo(-8, -14); ctx.lineTo(8, -14);
        ctx.lineTo(12, 4); ctx.lineTo(0, 16); ctx.lineTo(-12, 4);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aabbff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = '#ffee88'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.stroke();
        ctx.restore();
      } else {
        const _shStacks = this.shieldStacks || 1;
        // Color shifts from blue → yellow → orange → red as shield degrades
        let _shStroke, _shFill;
        if      (_shStacks <= 1) { _shStroke = 'rgba(100,210,255,0.88)'; _shFill = 'rgba(100,210,255,0.14)'; }
        else if (_shStacks === 2) { _shStroke = 'rgba(255,210,60,0.88)';  _shFill = 'rgba(255,210,60,0.14)'; }
        else if (_shStacks === 3) { _shStroke = 'rgba(255,140,50,0.88)';  _shFill = 'rgba(255,140,50,0.14)'; }
        else                      { _shStroke = 'rgba(255,70,40,0.88)';   _shFill = 'rgba(255,70,40,0.10)'; }
        ctx.beginPath();
        ctx.arc(cx + f * 15, shoulderY + 12, 23, 0, Math.PI * 2);
        ctx.strokeStyle = _shStroke;
        ctx.lineWidth   = 3;
        ctx.stroke();
        ctx.fillStyle   = _shFill;
        ctx.fill();
        // HP arc for stacks 1-3: shows remaining shield health as a partial ring
        if (_shStacks <= 3 && (this.shieldHP || 0) > 0) {
          const _hpMax  = [30, 15, 5][_shStacks - 1] || 1;
          const _hpFrac = Math.min(1, (this.shieldHP || 0) / _hpMax);
          ctx.beginPath();
          ctx.arc(cx + f * 15, shoulderY + 12, 27, -Math.PI / 2, -Math.PI / 2 + _hpFrac * Math.PI * 2);
          ctx.strokeStyle = _shStroke;
          ctx.lineWidth   = 2.5;
          ctx.stroke();
        }
      }
    }

    // ARMOR visuals (enemy story armor pieces)
    if (this.armorPieces && this.armorPieces.length > 0) {
      ctx.save();
      const isGodslayer = this.armorStyle === 'godslayer';
      const gsPulse    = isGodslayer ? (0.5 + 0.5 * Math.sin(t * 0.08)) : 0;
      const armorCol   = isGodslayer ? '#c09018' : '#9ab8e8';
      const armorEdge  = isGodslayer ? '#ffe060' : '#cde0ff';
      if (isGodslayer) {
        ctx.shadowColor = '#ffe840';
        ctx.shadowBlur  = 7 + gsPulse * 9;
      }
      ctx.strokeStyle = armorEdge;
      ctx.fillStyle   = armorCol;
      ctx.lineWidth   = 1.5;

      // Helmet
      if (this.armorPieces.includes('helmet')) {
        if (isGodslayer) {
          // Gold divine helmet with crown spikes
          const helmGr = ctx.createLinearGradient(cx - headR - 3, headCY - headR - 3, cx + headR + 3, headCY + 4);
          helmGr.addColorStop(0, '#d4a820');
          helmGr.addColorStop(0.45, '#ffe87a');
          helmGr.addColorStop(1, '#a07010');
          ctx.fillStyle = helmGr;
        } else {
          ctx.fillStyle = armorCol;
        }
        ctx.beginPath();
        ctx.arc(cx, headCY, headR + 3, Math.PI, 0);
        ctx.lineTo(cx + headR + 3, headCY + 4);
        ctx.lineTo(cx - headR - 3, headCY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = armorEdge; ctx.stroke();

        if (isGodslayer) {
          // Crown spikes (3 golden spikes)
          ctx.fillStyle   = '#ffd040';
          ctx.shadowColor = '#ffaa00';
          ctx.shadowBlur  = 8 + gsPulse * 6;
          for (const [sx, sh] of [[-8, 7], [0, 11], [8, 7]]) {
            ctx.beginPath();
            ctx.moveTo(cx + sx - 2.5, headCY - headR - 1);
            ctx.lineTo(cx + sx,       headCY - headR - 1 - sh);
            ctx.lineTo(cx + sx + 2.5, headCY - headR - 1);
            ctx.closePath();
            ctx.fill();
          }
          ctx.shadowColor = '#ffe840';
          ctx.shadowBlur  = 7 + gsPulse * 9;
          // Glowing visor slit
          ctx.strokeStyle = `rgba(255,235,80,${0.7 + gsPulse * 0.3})`;
          ctx.lineWidth   = 1.8;
          ctx.shadowBlur  = 6;
          ctx.beginPath(); ctx.moveTo(cx - 6, headCY); ctx.lineTo(cx + 6, headCY); ctx.stroke();
        } else {
          ctx.strokeStyle = '#7090c0'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx - 5, headCY); ctx.lineTo(cx + 5, headCY); ctx.stroke();
        }
      }

      // Chestplate
      if (this.armorPieces.includes('chestplate')) {
        ctx.lineWidth = 1.5;
        if (isGodslayer) {
          const cpGr = ctx.createLinearGradient(cx - 9, neckY + 2, cx + 9, neckY + 20);
          cpGr.addColorStop(0, '#d4a820');
          cpGr.addColorStop(0.45, '#ffe070');
          cpGr.addColorStop(1, '#9a6e10');
          ctx.fillStyle = cpGr;
        } else {
          ctx.fillStyle = armorCol;
        }
        ctx.strokeStyle = armorEdge;
        ctx.beginPath(); ctx.roundRect(cx - 9, neckY + 2, 18, 20, 3); ctx.fill(); ctx.stroke();

        if (isGodslayer) {
          // Divine rune cross on chest
          ctx.strokeStyle = `rgba(255,235,80,${0.65 + gsPulse * 0.30})`;
          ctx.lineWidth   = 1.1;
          ctx.shadowBlur  = 5;
          ctx.beginPath();
          ctx.moveTo(cx,     neckY + 6); ctx.lineTo(cx,     neckY + 19);
          ctx.moveTo(cx - 5, neckY + 12); ctx.lineTo(cx + 5, neckY + 12);
          ctx.stroke();
          // Small corner diamonds
          ctx.fillStyle = `rgba(255,240,120,${0.5 + gsPulse * 0.4})`;
          ctx.shadowBlur = 4;
          for (const [ox, oy] of [[-6, 4], [6, 4], [-6, 17], [6, 17]]) {
            ctx.save();
            ctx.translate(cx + ox, neckY + oy);
            ctx.rotate(Math.PI / 4);
            ctx.beginPath(); ctx.rect(-1.8, -1.8, 3.6, 3.6); ctx.fill();
            ctx.restore();
          }
        } else {
          ctx.strokeStyle = '#7090c0'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx, neckY + 4); ctx.lineTo(cx, neckY + 18); ctx.stroke();
        }
      }

      // Leggings
      if (this.armorPieces.includes('leggings')) {
        ctx.lineWidth = 1.5;
        if (isGodslayer) {
          const lgGr = ctx.createLinearGradient(0, hipY, 0, hipY + 13);
          lgGr.addColorStop(0, '#c89818');
          lgGr.addColorStop(1, '#8a6010');
          ctx.fillStyle = lgGr;
        } else {
          ctx.fillStyle = armorCol;
        }
        ctx.strokeStyle = armorEdge;
        ctx.beginPath(); ctx.roundRect(hipX - 9, hipY, 8, 13, 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(hipX + 1, hipY, 8, 13, 2); ctx.fill(); ctx.stroke();
        if (isGodslayer) {
          ctx.fillStyle   = `rgba(255,230,80,${0.55 + gsPulse * 0.40})`;
          ctx.shadowBlur  = 5;
          ctx.beginPath();
          ctx.arc(hipX - 5,  hipY + 7, 1.8, 0, Math.PI*2);
          ctx.arc(hipX + 5,  hipY + 7, 1.8, 0, Math.PI*2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // Stun stars orbiting head
    if (this.stunTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.stunTimer / 15);
      for (let i = 0; i < 3; i++) {
        const starA  = t * 0.14 + (i * Math.PI * 2 / 3);
        const starX  = cx  + Math.cos(starA) * 15;
        const starY  = ty  - 4 + Math.sin(starA * 2) * 5;
        ctx.fillStyle   = i % 2 === 0 ? '#ffdd00' : '#ffffff';
        ctx.font        = '10px Arial';
        ctx.textAlign   = 'center';
        ctx.fillText('★', starX, starY);
      }
      ctx.restore();
    }

    // SUPER READY flash
    if (this.superFlashTimer > 0) {
      const pulse = Math.abs(Math.sin(this.superFlashTimer * 0.18));
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.superFlashTimer / 20);
      ctx.font        = `bold ${12 + Math.floor(pulse * 4)}px Arial`;
      ctx.fillStyle   = '#ffd700';
      ctx.textAlign   = 'center';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur  = 10 + pulse * 8;
      ctx.fillText('SUPER!', cx, ty - 20);
      ctx.restore();
    }

    // Name tag
    ctx.globalAlpha  = 1;
    ctx.font         = 'bold 10px Arial';
    ctx.fillStyle    = this.color;
    ctx.textAlign    = 'center';
    ctx.shadowColor  = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur   = 4;
    // Legacy world-space name tag. drawEntityOverlays() draws the screen-space
    // label + health bar for every live entity and is called unconditionally
    // from gameLoop, so drawing here too rendered every name twice per frame.
    if (typeof drawEntityOverlays !== 'function') ctx.fillText(this.name, cx, ty - 5);
    ctx.shadowBlur   = 0;
    // AI state label — debug only; dmgNumbers is a player-facing setting
    if (this._debugState && typeof debugMode !== 'undefined' && debugMode) {
      ctx.font      = 'bold 8px monospace';
      ctx.fillStyle = '#ffee55';
      ctx.fillText(this._debugState, cx, ty - 16);
    }

    // Per-limb ragdoll debug overlay
    if (this._rd) PlayerRagdoll.debugDraw(this, cx, shoulderY, hipY);

    // ── DAMAGE DEGRADATION VISUALS ───────────────────────────────────────────────────
    // Tier 1 (>25): sweat. Tier 2 (>60): bruise + fine scratches. Tier 3 (>110): black eye + blood drip.
    // Uses the eased mirror, not the raw accumulator, so heals visibly close wounds.
    const _dAccum = this._degradeVisual || 0;
    if (_dAccum > 25 && !this.isBoss && !this.isDummy) {
      const _dTier = _dAccum < 60 ? 1 : _dAccum < 110 ? 2 : 3;
      const _dseed = (this.playerNum || 1);

      ctx.save();
      // Tier 1+: small sweat drop sliding down temple
      const _swSlide = (t * 0.45) % 14;
      ctx.fillStyle = 'rgba(140,210,255,0.7)';
      // Teardrop shape: round head + elongated tail pointing down
      ctx.beginPath();
      ctx.arc(cx + f * 8.5, headCY + 2 + _swSlide * 0.55, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + f * 8.5 - 0.8, headCY + 2 + _swSlide * 0.55);
      ctx.lineTo(cx + f * 8.5, headCY + 2 + _swSlide * 0.55 + 2.5);
      ctx.lineTo(cx + f * 8.5 + 0.8, headCY + 2 + _swSlide * 0.55);
      ctx.fill();
      ctx.restore();

      // Tier 2+: subtle cheek bruise + two fine parallel scratches on torso
      if (_dTier >= 2) {
        ctx.save();
        // Cheek bruise — small, low opacity, on cheekbone
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#4a0060';
        ctx.beginPath();
        ctx.ellipse(cx + f * 5.5, headCY + 4, 4, 2.5, 0.3, 0, Math.PI * 2); ctx.fill();
        // Fine scratches — thin (lineWidth 1) diagonal lines on torso
        const _scrX = cx + (_dseed % 2 === 0 ? -3 : 3);
        const _scrY = shoulderY + 8 + (_dseed % 3) * 2;
        ctx.globalAlpha = 0.60;
        ctx.strokeStyle = '#bb1010'; ctx.lineWidth = 1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(_scrX - 4, _scrY);     ctx.lineTo(_scrX + 3, _scrY + 7);   ctx.stroke();
        ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.moveTo(_scrX - 2, _scrY + 4); ctx.lineTo(_scrX + 4, _scrY + 10);  ctx.stroke();
        ctx.restore();
      }

      // Tier 3: black eye + realistic blood drip + extra scratch on torso
      if (_dTier >= 3) {
        ctx.save();
        // Black eye — small dark ellipse over the eye socket, not filling half the face
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#200030';
        ctx.beginPath();
        ctx.ellipse(cx - f * 2.5, headCY - 1.5, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Blood drip — genuine teardrop: round bead at top, thinning tail stretching down
        const _drip = (t * 0.6) % 20;
        const _dripX = cx + f * 1.8;
        const _dripY0 = headCY - headR + 2;
        ctx.globalAlpha = 0.80;
        ctx.fillStyle = '#cc0606';
        // Bead
        ctx.beginPath(); ctx.arc(_dripX, _dripY0 + _drip, 1.8, 0, Math.PI * 2); ctx.fill();
        // Tail — thin rectangle above the bead
        if (_drip > 1) {
          ctx.fillRect(_dripX - 0.8, _dripY0, 1.6, _drip);
        }
        // Extra fine scratch lower on torso
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#990000'; ctx.lineWidth = 1; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 5, shoulderY + 16 + (_dseed % 4));
        ctx.lineTo(cx + 3, shoulderY + 24 + (_dseed % 4)); ctx.stroke();
        ctx.restore();
      }
    }

    // ── Swing-arc trail ribbon (absolute coords; samples recorded in drawWeapon) ──
    // Purely visual: a tapered, fading streak behind the blade tip during swings.
    if (this._swingTrail && this._swingTrail.length > 0) {
      // Decay every frame so the ribbon vanishes cleanly once the swing ends
      for (let _ti = this._swingTrail.length - 1; _ti >= 0; _ti--) {
        if (--this._swingTrail[_ti].life <= 0) this._swingTrail.splice(_ti, 1);
      }
      if (typeof settings !== 'undefined' && settings.particles && this._swingTrail.length >= 2) {
        const _stPts   = this._swingTrail;
        const _stCol   = this._swingTrailColor || '#ffffff';
        const _stHeavy = !!this._swingTrailHeavy;
        const _stW     = this._swingTrailWidth || (_stHeavy ? 9 : 5);   // width at the newest sample
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = _stCol;
        ctx.shadowBlur  = _stHeavy ? 14 : 9;
        ctx.strokeStyle = _stCol;
        for (let _ti = 1; _ti < _stPts.length; _ti++) {
          const _sa = _stPts[_ti - 1], _sb = _stPts[_ti];
          const _frac = _ti / (_stPts.length - 1);     // 0 = oldest → 1 = newest
          const _fade = _sb.life / _sb.maxLife;
          ctx.globalAlpha = _fade * (0.10 + _frac * (_stHeavy ? 0.38 : 0.30));
          ctx.lineWidth   = Math.max(1, _stW * (0.25 + _frac * 0.75) * _fade);
          ctx.beginPath(); ctx.moveTo(_sa.x, _sa.y); ctx.lineTo(_sb.x, _sb.y); ctx.stroke();
        }
        // Bright core streak hugging the newest segments
        const _stN = _stPts.length;
        const _st0 = Math.max(0, _stN - 3);
        ctx.globalAlpha = (_stPts[_stN - 1].life / _stPts[_stN - 1].maxLife) * (_stHeavy ? 0.5 : 0.55);
        ctx.lineWidth   = _stHeavy ? 2.5 : 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(_stPts[_st0].x, _stPts[_st0].y);
        for (let _ti = _st0 + 1; _ti < _stN; _ti++) ctx.lineTo(_stPts[_ti].x, _stPts[_ti].y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Sword air-slash crescent arcs (absolute coords — must be outside drawWeapon) ──
    if (this._swordSlashes && this._swordSlashes.length > 0) {
      for (const sl of this._swordSlashes) {
        const alpha = (sl.life / sl.maxLife);
        const col   = sl.color || '#88ccff';
        ctx.save();
        ctx.translate(sl.x, sl.y);
        ctx.scale(sl.facing || 1, 1);
        ctx.rotate(sl.tilt || 0);
        ctx.globalAlpha = alpha * 0.88;
        ctx.strokeStyle = col;
        ctx.lineWidth   = 4.5;
        ctx.shadowColor = col;
        ctx.shadowBlur  = 12;
        ctx.beginPath();
        ctx.arc(0, 0, sl.size, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.45;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(0, 0, sl.size * 0.62, -Math.PI * 0.38, Math.PI * 0.38);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // ── Shield: Fortress Charge afterimage trail ──────────────────────────────────
    if (this._shieldCharge) {
      const _scFade = this._shieldCharge.timer / 22;
      ctx.save();
      ctx.globalAlpha = _scFade * 0.45;
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur  = 24;
      ctx.fillStyle   = '#2266cc';
      ctx.beginPath();
      ctx.roundRect(this.x - this.facing * 22, this.y + 4, this.w + 8, this.h - 8, 6);
      ctx.fill();
      ctx.globalAlpha = _scFade * 0.25;
      ctx.beginPath();
      ctx.roundRect(this.x - this.facing * 38, this.y + 8, this.w + 4, this.h - 16, 6);
      ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Flail: Chain Yank ball ────────────────────────────────────────────────────
    if (this._flailBall) {
      const fb = this._flailBall;
      ctx.save();
      ctx.strokeStyle = '#777777';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(this.cx(), this.y + this.h * 0.4);
      ctx.lineTo(fb.x, fb.y);
      ctx.stroke();
      ctx.shadowColor = fb.returning ? '#ffcc44' : '#ffffff';
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = '#aaaaaa';
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Whip crack snap burst ─────────────────────────────────────────────────────
    // A tip crack (wc.big) gets a sonic-boom ring and a wider star; a slack body hit
    // gets a small dull puff, so the sweet spot is readable without a damage number.
    if (this._whipCrack) {
      const wc = this._whipCrack;
      const _wcMax  = wc.big ? 16 : 8;
      const _wcFade = Math.max(0, wc.timer / _wcMax);
      const _wcBig  = !!wc.big;
      ctx.save();
      ctx.globalAlpha = _wcFade * (_wcBig ? 0.95 : 0.6);
      ctx.shadowColor = _wcBig ? '#ffdd44' : '#996633';
      ctx.shadowBlur  = _wcBig ? 18 : 6;
      ctx.strokeStyle = _wcBig ? '#ffee88' : '#bb9955';
      ctx.lineWidth   = _wcBig ? 3 : 1.8;
      const _wcN = _wcBig ? 10 : 6;
      for (let _wi = 0; _wi < _wcN; _wi++) {
        const _wAngle = (_wi / _wcN) * Math.PI * 2 + (_wcBig ? 0.2 : 0);
        const _wOuter = (_wcBig ? 16 : 8) + (1 - _wcFade) * (_wcBig ? 34 : 12);
        const _wInner = _wOuter * 0.3;
        ctx.beginPath();
        ctx.moveTo(wc.x + Math.cos(_wAngle) * _wInner, wc.y + Math.sin(_wAngle) * _wInner);
        ctx.lineTo(wc.x + Math.cos(_wAngle) * _wOuter, wc.y + Math.sin(_wAngle) * _wOuter);
        ctx.stroke();
      }
      if (_wcBig) {
        // expanding shock ring — the sound-barrier pop at the crack point
        ctx.globalAlpha = _wcFade * 0.5;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wc.x, wc.y, 8 + (1 - _wcFade) * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Whip: Hooked marker — a golden noose ring over a Lasso-marked target ──────
    if (this._whipHooked > 0) {
      const _hkFade = Math.min(1, this._whipHooked / 30);
      const _hkNow  = typeof frameCount !== 'undefined' ? frameCount : 0;
      ctx.save();
      ctx.globalAlpha = _hkFade * 0.8;
      ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]); ctx.lineDashOffset = -_hkNow * 0.6;
      ctx.beginPath();
      ctx.ellipse(this.cx(), this.y - 8, 15, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Whip super: Serpent's Coil — the extending lash ───────────────────────────
    if (this._whipCoil) {
      const co = this._whipCoil;
      const _coHx = this.cx() + co.dir * 10, _coHy = this.cy() - 2;
      const _coNow = typeof frameCount !== 'undefined' ? frameCount : 0;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffcc55'; ctx.shadowBlur = 12;
      const _coSeg = 20;
      for (let _ci = 0; _ci < _coSeg; _ci++) {
        const u0 = _ci / _coSeg, u1 = (_ci + 1) / _coSeg;
        // travelling sine so the cord reads as a snapping serpent, not a straight line
        const _cy0 = _coHy + (co.tipY - _coHy) * u0 + Math.sin(u0 * 7 - _coNow * 0.55) * 13 * u0;
        const _cy1 = _coHy + (co.tipY - _coHy) * u1 + Math.sin(u1 * 7 - _coNow * 0.55) * 13 * u1;
        const _cx0 = _coHx + (co.tipX - _coHx) * u0;
        const _cx1 = _coHx + (co.tipX - _coHx) * u1;
        ctx.strokeStyle = _ci % 2 ? '#ffdd77' : '#cc8833';
        ctx.lineWidth = 4.5 * (1 - u0 * 0.8);
        ctx.beginPath(); ctx.moveTo(_cx0, _cy0); ctx.lineTo(_cx1, _cy1); ctx.stroke();
      }
      // glowing tip
      ctx.fillStyle = '#ffffcc';
      ctx.beginPath(); ctx.arc(co.tipX, co.tipY, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Flail: Orbit Storm super ball ─────────────────────────────────────────────
    if (this._flailOrbit && this._flailOrbit.ballX !== undefined) {
      const fo = this._flailOrbit;
      const _foAlpha = Math.min(1, fo.timer / 10);
      ctx.save();
      ctx.globalAlpha = _foAlpha;
      ctx.strokeStyle = '#666666';
      ctx.lineWidth   = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.cx(), this.y + this.h * 0.4);
      ctx.lineTo(fo.ballX, fo.ballY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowColor = '#dddddd';
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = '#aaaaaa';
      ctx.beginPath();
      ctx.arc(fo.ballX, fo.ballY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Boomerangs in flight ───────────────────────────────────────────────────────
    if (this._boomerangs && this._boomerangs.length > 0) {
      for (const bm of this._boomerangs) {
        ctx.save();
        ctx.translate(bm.x, bm.y);
        ctx.rotate(Math.atan2(bm.vy, bm.vx));
        ctx.shadowColor = '#cc9944';
        ctx.shadowBlur  = 10;
        ctx.strokeStyle = '#cc9944';
        ctx.lineWidth   = 3;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 8, -Math.PI * 0.65, Math.PI * 0.65);
        ctx.stroke();
        ctx.strokeStyle = '#ffcc66';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8, -Math.PI * 0.65, Math.PI * 0.65);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // ── Boomerang Q: Orbit Guard — spinning boomerang ring ───────────────────────
    if (this._boomOrbit && this._boomOrbit.ballX !== undefined) {
      const bo = this._boomOrbit;
      ctx.save();
      ctx.translate(bo.ballX, bo.ballY);
      ctx.rotate(bo.angle * 3);
      ctx.shadowColor = '#ffcc44';
      ctx.shadowBlur  = 14;
      ctx.strokeStyle = '#cc9944';
      ctx.lineWidth   = 5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 13, -Math.PI * 0.65, Math.PI * 0.65);
      ctx.stroke();
      ctx.strokeStyle = '#ffe88a';
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 13, -Math.PI * 0.65, Math.PI * 0.65);
      ctx.stroke();
      // Faint orbit ring to show path
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#ffcc66';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.ellipse(this.cx(), this.cy(), bo.r, bo.r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      ctx.restore();
    }

    // ── Axe E: Thrown Axe — spinning axe head in flight ──────────────────────────
    if (this._thrownAxe) {
      const ta = this._thrownAxe;
      ctx.save();
      ctx.translate(ta.x, ta.y);
      ctx.rotate(ta.angle);
      ctx.shadowColor = '#ff8833';
      ctx.shadowBlur  = 16;
      // Axe head: a heavy wedge shape
      ctx.fillStyle   = '#cc5522';
      ctx.strokeStyle = '#ff9944';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18); ctx.lineTo(14, 6); ctx.lineTo(-14, 6); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Handle stub
      ctx.strokeStyle = '#886633';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.moveTo(0, 6); ctx.lineTo(0, 18);
      ctx.stroke();
      // Speed trail
      ctx.globalAlpha = 0.35;
      ctx.fillStyle   = '#ff8833';
      ctx.beginPath();
      ctx.moveTo(0, -18); ctx.lineTo(14, 6); ctx.lineTo(-14, 6); ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      ctx.restore();
    }

    // ── Electric Staff overcharge aura ────────────────────────────────────────────
    if (this._overcharged > 0) {
      const _ecPulse = 0.5 + 0.5 * Math.sin(frameCount * 0.4);
      ctx.save();
      ctx.globalAlpha = 0.22 + _ecPulse * 0.18;
      ctx.shadowColor = '#00eeff';
      ctx.shadowBlur  = 18;
      ctx.strokeStyle = '#00ddff';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(this.cx(), this.cy(), 30 + _ecPulse * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      ctx.restore();
    }

    // ── Electric Staff: Shock Bolt in flight ─────────────────────────────────────
    if (this._shockBolt) {
      const sb = this._shockBolt;
      const _sbNow = typeof frameCount !== 'undefined' ? frameCount : 0;
      ctx.save();
      ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 22;
      ctx.fillStyle = '#aaeeff';
      ctx.beginPath(); ctx.arc(sb.x, sb.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sb.x, sb.y, 4, 0, Math.PI * 2); ctx.fill();
      // Crackling arcs around the orb
      ctx.strokeStyle = '#00eeff'; ctx.lineWidth = 1.5;
      for (let _si = 0; _si < 4; _si++) {
        const _sAng = (_si / 4) * Math.PI * 2 + _sbNow * 0.22;
        ctx.beginPath();
        ctx.moveTo(sb.x + Math.cos(_sAng) * 9, sb.y + Math.sin(_sAng) * 9);
        ctx.lineTo(sb.x + Math.cos(_sAng + 0.5) * (16 + Math.sin(_sbNow * 0.3 + _si) * 5),
                   sb.y + Math.sin(_sAng + 0.5) * (16 + Math.sin(_sbNow * 0.3 + _si) * 5));
        ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.restore();
    }

    // ── Electric Staff: electric ground zones ────────────────────────────────────
    if (this._elecZones && this._elecZones.length) {
      const _ezNow = typeof frameCount !== 'undefined' ? frameCount : 0;
      for (const ez of this._elecZones) {
        const _ezFade = ez.timer / 95;
        ctx.save();
        ctx.globalAlpha = _ezFade * 0.55;
        ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 14;
        ctx.strokeStyle = '#00ddff'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ez.x, ez.y, ez.r, ez.r * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Crackling sparks across the zone
        ctx.globalAlpha = _ezFade * 0.7;
        ctx.strokeStyle = '#aaeeff'; ctx.lineWidth = 1;
        for (let _es = 0; _es < 4; _es++) {
          const _esX = ez.x + (Math.sin(_ezNow * 0.17 + _es * 1.57) * ez.r * 0.7);
          const _esY = ez.y + (Math.cos(_ezNow * 0.21 + _es * 1.57) * ez.r * 0.12);
          ctx.beginPath();
          ctx.moveTo(_esX, _esY - 5);
          ctx.lineTo(_esX + (Math.random() - 0.5) * 14, _esY + 5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
      }
    }

    // ── Electric Staff: chain arc between primary hit and chained target ──────────
    if (this._chainArcs && this._chainArcs.length) {
      for (const ca of this._chainArcs) {
        const _caAlpha = ca.timer / 14;
        const _camx = (ca.x1 + ca.x2) / 2;
        const _camy = (ca.y1 + ca.y2) / 2;
        ctx.save();
        ctx.globalAlpha = _caAlpha;
        ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 16;
        ctx.strokeStyle = '#00eeff'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ca.x1, ca.y1);
        ctx.lineTo(_camx + (Math.random() - 0.5) * 28, _camy + (Math.random() - 0.5) * 28);
        ctx.lineTo(ca.x2, ca.y2);
        ctx.stroke();
        ctx.globalAlpha = _caAlpha * 0.7;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ca.x1, ca.y1);
        ctx.lineTo(_camx + (Math.random() - 0.5) * 18, _camy + (Math.random() - 0.5) * 18);
        ctx.lineTo(ca.x2, ca.y2);
        ctx.stroke();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
      }
    }

    // ── Electric Staff E: Thunderstrike — warning flash before each bolt ──────────
    if (this._thunderStrikes) {
      for (const ts of this._thunderStrikes) {
        if (ts.fired) continue;
        // Warn player with a flickering target marker on the ground
        const _tsWarn = Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.55) * 0.5 + 0.5;
        ctx.save();
        ctx.globalAlpha = _tsWarn * 0.6;
        ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 10;
        ctx.strokeStyle = '#00ddff'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ts.x, ts.y, 28, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
      }
    }

    // ── Hammer Q: Ground Shockwave — rolling ground crack ────────────────────────
    if (this._hammerShock) {
      const hs = this._hammerShock;
      const _hsFade = hs.timer / 55;
      ctx.save();
      ctx.globalAlpha = _hsFade * 0.85;
      ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 18;
      ctx.strokeStyle = '#ffdd66'; ctx.lineWidth = 4;
      // Ground crack: semicircle rising from floor with inner burst lines
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, 28, -Math.PI, 0);
      ctx.stroke();
      ctx.globalAlpha = _hsFade * 0.5;
      ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, 42, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
    }

    // ── Broomstick Q: Broom Ride — sparkle aura while flying ────────────────────
    if (this._broomRide) {
      const br = this._broomRide;
      const _brFade = br.timer / 22;
      ctx.save();
      ctx.globalAlpha = _brFade * 0.55;
      ctx.shadowColor = '#ffdd88'; ctx.shadowBlur = 20;
      ctx.strokeStyle = '#cc9966'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.cx(), this.cy(), 28, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Motion streak behind the user
      ctx.globalAlpha = _brFade * 0.35;
      ctx.strokeStyle = '#ffdd88'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.cx() - this.facing * 12, this.cy());
      ctx.lineTo(this.cx() - this.facing * 44, this.cy() + 4);
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
    }

    // ── Scythe Q: Scythe Toss — spinning crescent in flight ─────────────────────
    if (this._scytheToss) {
      const st = this._scytheToss;
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(st.angle);
      ctx.shadowColor = '#aa44aa'; ctx.shadowBlur = 16;
      ctx.strokeStyle = '#cc44cc'; ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI * 0.75, Math.PI * 0.1);
      ctx.stroke();
      ctx.strokeStyle = '#ee88ee'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI * 0.75, Math.PI * 0.1);
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#cc44cc';
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI * 0.75, Math.PI * 0.1);
      ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
    }

    // ── Combat counter stance glow ────────────────────────────────────────────────
    if (this._counterStance > 0) {
      const _cf = this._counterStance;
      const _pulse = 0.6 + 0.4 * Math.sin(frameCount * 0.35);
      const _alpha = Math.min(1, _cf / 12) * _pulse;
      ctx.save();
      ctx.globalAlpha = _alpha * 0.55;
      ctx.shadowColor  = '#ff4444';
      ctx.shadowBlur   = 24;
      ctx.strokeStyle  = '#ff6644';
      ctx.lineWidth    = 3;
      ctx.beginPath();
      ctx.arc(this.cx(), this.cy(), 28 + _pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = _alpha * 0.18;
      ctx.fillStyle   = '#ff2200';
      ctx.beginPath();
      ctx.arc(this.cx(), this.cy(), 28 + _pulse * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.restore();
    }

    // ── Combat super: Combo Strike aim indicator ─────────────────────────────────
    // The aimed kick is only a decision if the player can see what they are
    // choosing. Drawn for the human only — a bot aiming needs no reticle.
    if (this._comboSuper && this._comboSuper.phase === 3 && !this.isAI) {
      const cs  = this._comboSuper;
      const _a  = cs.aim || 0;
      const ox  = this.cx() + Math.cos(_a) * 30;
      const oy  = this.cy() - 18 + Math.sin(_a) * 30;
      // Charge ring: how much of the aim window is left before it auto-fires.
      const _left = Math.max(0, 1 - cs.timer / COMBO_SUPER_AIM_FRAMES);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#ffcc44';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur  = 12;
      // Dashed trajectory out along the kick vector
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(_a) * 150, oy + Math.sin(_a) * 150);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead at the far end
      const hx = ox + Math.cos(_a) * 150, hy = oy + Math.sin(_a) * 150;
      ctx.fillStyle = '#ffee66';
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(_a) * 14, hy + Math.sin(_a) * 14);
      ctx.lineTo(hx + Math.cos(_a + 2.5) * 13, hy + Math.sin(_a + 2.5) * 13);
      ctx.lineTo(hx + Math.cos(_a - 2.5) * 13, hy + Math.sin(_a - 2.5) * 13);
      ctx.closePath();
      ctx.fill();
      // Timer ring around the pivot
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = _left < 0.3 ? '#ff4433' : '#ffcc44';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.cx(), this.cy() - 18, 26, -Math.PI / 2, -Math.PI / 2 + _left * Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Combat super: Combo Strike impact flash ──────────────────────────────────
    if (this._comboSuper && this._comboSuper.impactFlash > 0) {
      const cs = this._comboSuper;
      const _csAlpha = cs.impactFlash / 18;
      const _csPunch = cs.phase === 3;
      ctx.save();
      ctx.globalAlpha = _csAlpha * 0.9;
      ctx.shadowColor = _csPunch ? '#ffcc44' : '#ff4444';
      ctx.shadowBlur  = _csPunch ? 22 : 14;
      // Starburst impact ring
      ctx.strokeStyle = _csPunch ? '#ffee44' : '#ff5555';
      ctx.lineWidth   = _csPunch ? 4 : 3;
      ctx.beginPath();
      ctx.arc(cs.impactX, cs.impactY, (_csPunch ? 32 : 20) * (1 - _csAlpha * 0.3), 0, Math.PI * 2);
      ctx.stroke();
      // Inner filled core
      ctx.globalAlpha = _csAlpha * 0.5;
      ctx.fillStyle   = _csPunch ? '#ffdd44' : '#ff3333';
      ctx.beginPath();
      ctx.arc(cs.impactX, cs.impactY, _csPunch ? 16 : 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Pea Cluster projectile ────────────────────────────────────────────────────
    if (this._peaCluster) {
      const pc = this._peaCluster;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = '#44ff44';
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = '#00cc44';
      ctx.beginPath();
      ctx.arc(pc.x, pc.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Gravity Stone projectile ──────────────────────────────────────────────────
    if (this._gravityStone) {
      const gs = this._gravityStone;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur  = 18;
      ctx.fillStyle   = '#994400';
      ctx.beginPath();
      ctx.arc(gs.x, gs.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffaa44';
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Paper Swarm homing planes ─────────────────────────────────────────────────
    // ── Paper Airplane: basic-attack planes ─────────────────────────────────────
    if (this._paperPlanes && this._paperPlanes.length > 0) {
      for (const pp of this._paperPlanes) {
        const _ppA = Math.min(1, pp.life / 20);
        ctx.save();
        ctx.translate(pp.x, pp.y);
        ctx.rotate(Math.atan2(pp.vy, pp.vx));
        ctx.globalAlpha = _ppA;
        ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 7;
        ctx.fillStyle = '#ddeeff';
        ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(-5, -6); ctx.lineTo(-3, 0); ctx.lineTo(-5, 6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#7799bb'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(10, -1); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // ── Whip rope: brief taut-line flash on Lasso/hit ────────────────────────────
    if (this._whipRope) {
      const _wrA = Math.min(1, this._whipRope.timer / 6);
      ctx.save();
      ctx.globalAlpha = _wrA * 0.75;
      ctx.strokeStyle = this._whipRope.isLasso ? '#ffcc44' : '#cc8833';
      ctx.lineWidth   = this._whipRope.isLasso ? 2 : 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(this.cx() + this.facing * 10, this.cy());
      ctx.lineTo(this._whipRope.tx, this._whipRope.ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (this._paperSwarm && this._paperSwarm.length > 0) {
      for (const pl of this._paperSwarm) {
        const _pAlpha = Math.min(1, pl.life / 30);
        ctx.save();
        ctx.translate(pl.x, pl.y);
        ctx.rotate(Math.atan2(pl.vy, pl.vx));
        ctx.globalAlpha = _pAlpha * 0.9;
        ctx.shadowColor = '#aaccff';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = '#ddeeff';
        ctx.beginPath();
        ctx.moveTo(12,  0);
        ctx.lineTo(-6, -7);
        ctx.lineTo(-4,  0);
        ctx.lineTo(-6,  7);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    ctx.restore();
  }

  drawWeapon(hx, hy, angle, attacking, overrideKey = null, scale = 1) {
    ctx.save();
    ctx.translate(hx, hy);
    const k = overrideKey || this.weaponKey;
    // Per-weapon grip tilt while attacking (legacy weapons keep the 0.6 rad slash tilt)
    const _swgD = (typeof WEAPON_SWINGS !== 'undefined') ? WEAPON_SWINGS[k] : null;
    let _atkTilt;
    if (attacking) {
      _atkTilt = (_swgD && _swgD.tilt !== undefined) ? _swgD.tilt : 0.6;
    } else {
      // Carry tilt: how the weapon rests in the hand out of combat (facing-mirrored)
      const _cTilt = (_swgD && _swgD.carry && _swgD.carry.tilt) || 0;
      _atkTilt = this.facing < 0 ? -_cTilt : _cTilt;
    }
    ctx.rotate(angle + _atkTilt);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.lineCap   = 'round';

    // Store world-space weapon tip for clash detection
    const _tipAngle = angle + _atkTilt;
    const _tipRange = this.weapon ? (this.weapon.range || 30) : 30;
    this._weaponTip = { x: hx + Math.cos(_tipAngle) * _tipRange * 0.85,
                        y: hy + Math.sin(_tipAngle) * _tipRange * 0.85,
                        attacking };

    // --- Weapon glow: stronger when swinging (prevents clipping into background) ---
    const _glowColors = {
      sword: '#c8e8ff', hammer: '#ffaa44', gun: '#ff4444', axe: '#66dde8',
      spear: '#8888ff', bow: '#aadd88', shield: '#4488ff', scythe: '#ffcc33',
      fryingpan: '#ffcc44', broomstick: '#ddbb44', combat: '#ff3333',
      peashooter: '#44ff66', slingshot: '#cc8844', paperairplane: '#aaccff',
      flail: '#cccccc', whip: '#cc8833', boomerang: '#cc9944',
      katana: '#8888cc', flamethrower: '#ff5500', electricstaff: '#00ccff',
    };
    if (k !== 'gauntlet' && _glowColors[k]) {
      const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.12 + (this.playerNum || 0));
      ctx.shadowColor = _glowColors[k];
      ctx.shadowBlur  = attacking ? Math.max(15, 18 + pulse * 8) : 5 + pulse * 5;
    }

    // Weapon theme: override glow colour when a cosmetic theme is active
    if (!overrideKey && this.weaponTheme && typeof WEAPON_THEMES !== 'undefined' && WEAPON_THEMES[this.weaponTheme]) {
      const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.12 + (this.playerNum || 0));
      ctx.shadowColor = WEAPON_THEMES[this.weaponTheme];
      ctx.shadowBlur  = attacking ? Math.max(18, 22 + pulse * 10) : 7 + pulse * 7;
    }

    // ── Swing-arc trail: record blade-tip samples during the active swing ──────
    // Render-only. World-space samples (from this._weaponTip) are consumed by the
    // ribbon drawn in the body draw pass (near the sword air-slash crescents).
    // Gauntlet/off-hand and ranged weapons are excluded, so the boss's second
    // drawWeapon() call never records a duplicate or wrong-colored trail.
    const _swgTr = _swgD && _swgD.trail;
    if (typeof settings !== 'undefined' && settings.particles && attacking &&
        k !== 'gauntlet' && _glowColors[k] &&
        this.weapon && this.weapon.type === 'melee' &&
        (!_swgTr || _swgTr.cap > 0)) {
      if (!this._swingTrail) this._swingTrail = [];
      const _stHeavy = this.weapon.weaponType === 'heavy';
      let _stColor = _glowColors[k];
      if (!overrideKey && this.weaponTheme && typeof WEAPON_THEMES !== 'undefined' && WEAPON_THEMES[this.weaponTheme]) {
        _stColor = WEAPON_THEMES[this.weaponTheme];
      }
      const _stLife = _swgTr ? _swgTr.life : (_stHeavy ? 14 : 9);
      this._swingTrail.push({ x: this._weaponTip.x, y: this._weaponTip.y, life: _stLife, maxLife: _stLife });
      this._swingTrailColor = _stColor;
      this._swingTrailHeavy = _stHeavy;
      this._swingTrailWidth = _swgTr ? _swgTr.width : 0;
      const _stCap = _swgTr ? _swgTr.cap : (_stHeavy ? 8 : 6);
      while (this._swingTrail.length > _stCap) this._swingTrail.shift();
    }

    // ── Facing mirror ─────────────────────────────────────────────────────────
    // The arm angle mirrors ABOUT VERTICAL with facing (theta -> PI - theta) rather
    // than rotating through PI. Working through it: for the weapon to land correctly
    // mirrored in world space, the local frame also has to flip in y. Without that,
    // rotate(PI - theta) sends local +y (the grip/underside) to world UP — so a
    // left-facing fighter holds the art upside down. It's invisible on weapons whose
    // silhouette is symmetric about the shaft (sword, katana, spear, hammer...) and
    // obvious on ones that aren't (scythe blade, flail head, whip lash, gun grip).
    // Scoped to the art chain only: the ranged cooldown bar below uses world coords.
    ctx.save();
    if (this.facing < 0) ctx.scale(1, -1);

    // ── Hand-drawn sprite art (falls through to the vector version if unloaded) ──
    const _wSpr = (typeof WEAPON_SPRITES !== 'undefined') ? WEAPON_SPRITES[k] : null;
    if (_wSpr && _wSpr.ready && _wSpr.img) {
      const _wsW = _wSpr.len;
      const _wsH = _wSpr.img.height * (_wsW / _wSpr.img.width);
      // Facing is handled by the shared mirror above.
      ctx.drawImage(_wSpr.img, -_wsW * _wSpr.anchor, -_wsH * _wSpr.shaftY, _wsW, _wsH);

    } else if (k === 'sword') {
      // Pommel
      const _swPomGrd = ctx.createRadialGradient(-7,0,0,-7,0,4);
      _swPomGrd.addColorStop(0,'#e0e0e0'); _swPomGrd.addColorStop(1,'#888888');
      ctx.fillStyle = _swPomGrd;
      ctx.beginPath(); ctx.arc(-7,0,3.5,0,Math.PI*2); ctx.fill();
      // Grip
      const _swGrpGrd = ctx.createLinearGradient(0,-3,0,3);
      _swGrpGrd.addColorStop(0,'#7a4a20'); _swGrpGrd.addColorStop(0.5,'#4a2a10'); _swGrpGrd.addColorStop(1,'#7a4a20');
      ctx.fillStyle = _swGrpGrd;
      ctx.beginPath(); ctx.roundRect(-4,-2.5,14,5,1); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1;
      for(let _gi=0;_gi<4;_gi++){ctx.beginPath();ctx.moveTo(-3+_gi*3,-2.5);ctx.lineTo(-3+_gi*3,2.5);ctx.stroke();}
      // Crossguard
      const _swCgGrd = ctx.createLinearGradient(9,-8,9,8);
      _swCgGrd.addColorStop(0,'#cccccc'); _swCgGrd.addColorStop(0.45,'#aaaaaa'); _swCgGrd.addColorStop(1,'#777777');
      ctx.fillStyle = _swCgGrd;
      ctx.beginPath(); ctx.roundRect(9,-7.5,6,15,1.5); ctx.fill();
      ctx.strokeStyle='#dddddd'; ctx.lineWidth=0.7; ctx.stroke();
      // Blade — tapered leaf shape
      const _swBlGrd = ctx.createLinearGradient(0,-3,0,3);
      _swBlGrd.addColorStop(0,'#eaeaf2'); _swBlGrd.addColorStop(0.35,'#c8c8d8'); _swBlGrd.addColorStop(1,'#8888aa');
      ctx.fillStyle = _swBlGrd;
      ctx.beginPath(); ctx.moveTo(14,-2.8); ctx.lineTo(46,0); ctx.lineTo(14,2.8); ctx.closePath(); ctx.fill();
      // Fuller groove
      ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=0.9;
      ctx.beginPath(); ctx.moveTo(15,0.6); ctx.lineTo(38,0.4); ctx.stroke();
      // Edge highlight
      ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=0.9;
      ctx.beginPath(); ctx.moveTo(14,-2.8); ctx.lineTo(46,0); ctx.stroke();
      // Attack gleam
      if(attacking){
        ctx.globalAlpha=0.55+0.3*Math.sin(frameCount*0.3);
        ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.4;
        ctx.beginPath(); ctx.moveTo(22,-1.8); ctx.lineTo(46,0); ctx.stroke();
        ctx.fillStyle='#ffffff';
        ctx.beginPath(); ctx.arc(46,0,2.8,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      }

    } else if (k === 'hammer') {
      // Handle — dark wood with grain
      const _hmHndGrd = ctx.createLinearGradient(0,-2.5,0,2.5);
      _hmHndGrd.addColorStop(0,'#7a4a20'); _hmHndGrd.addColorStop(0.5,'#4a2a10'); _hmHndGrd.addColorStop(1,'#7a4a20');
      ctx.fillStyle = _hmHndGrd;
      ctx.beginPath(); ctx.roundRect(-4,-2.5,27,5,1.5); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.9;
      for(let _hi=0;_hi<5;_hi++){ctx.beginPath();ctx.moveTo(0+_hi*5,-2.5);ctx.lineTo(0+_hi*5,2.5);ctx.stroke();}
      // Metal collar
      ctx.fillStyle='#666677'; ctx.beginPath(); ctx.roundRect(20,-3.5,4,7,1); ctx.fill();
      ctx.strokeStyle='#9999aa'; ctx.lineWidth=0.8; ctx.stroke();
      // Head body
      const _hmHdGrd = ctx.createLinearGradient(22,-13,22,12);
      _hmHdGrd.addColorStop(0,'#aaaaaa'); _hmHdGrd.addColorStop(0.3,'#888888'); _hmHdGrd.addColorStop(1,'#555555');
      ctx.fillStyle = _hmHdGrd;
      ctx.beginPath(); ctx.roundRect(22,-13,16,24,2.5); ctx.fill();
      // Strike face highlight (front of hammer)
      const _hmFcGrd = ctx.createLinearGradient(35,-13,35,11);
      _hmFcGrd.addColorStop(0,'#cccccc'); _hmFcGrd.addColorStop(1,'#888888');
      ctx.fillStyle = _hmFcGrd;
      ctx.beginPath(); ctx.roundRect(35,-12,4,23,1.5); ctx.fill();
      // Head rim
      ctx.strokeStyle='#aaaaaa'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.roundRect(22,-13,16,24,2.5); ctx.stroke();
      if(attacking){
        const _hmAtk=0.35+0.2*Math.sin(frameCount*0.2);
        ctx.shadowColor='#ffcc44'; ctx.shadowBlur=20;
        ctx.globalAlpha=_hmAtk; ctx.fillStyle='#ffcc44';
        ctx.beginPath(); ctx.roundRect(22,-13,16,24,2.5); ctx.fill();
        ctx.globalAlpha=1; ctx.shadowBlur=0;
      }

    } else if (k === 'gun') {
      // Grip side is now handled by the shared facing mirror above — this used to be
      // `this.facing`, which would double-flip against it. Kept as a named constant so
      // the grip/trigger-guard geometry below reads unchanged.
      const _gSide = 1;
      // Slide / upper frame
      const _gnSldGrd = ctx.createLinearGradient(0,-5,0,4);
      _gnSldGrd.addColorStop(0,'#666666'); _gnSldGrd.addColorStop(1,'#333333');
      ctx.fillStyle=_gnSldGrd;
      ctx.beginPath();
      ctx.moveTo(0,-4); ctx.lineTo(22,-4); ctx.lineTo(24,-2); ctx.lineTo(24,3); ctx.lineTo(0,3); ctx.closePath(); ctx.fill();
      // Slide serrations
      ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=0.9;
      for(let _gsi=0;_gsi<3;_gsi++){ctx.beginPath();ctx.moveTo(4+_gsi*4,-4);ctx.lineTo(4+_gsi*4,3);ctx.stroke();}
      // Ejection port cut
      ctx.fillStyle='#222222'; ctx.fillRect(8,-4,8,2);
      // Barrel extending forward
      const _gnBrlGrd = ctx.createLinearGradient(0,-2,0,2);
      _gnBrlGrd.addColorStop(0,'#555555'); _gnBrlGrd.addColorStop(1,'#333333');
      ctx.fillStyle=_gnBrlGrd; ctx.beginPath(); ctx.roundRect(22,-2,9,4,1); ctx.fill();
      ctx.strokeStyle='#555555'; ctx.lineWidth=0.6; ctx.stroke();
      // Grip — direction flips with facing so the grip hangs the correct way after arm rotation
      const _gnGrpGrd = ctx.createLinearGradient(0, 3*_gSide, 0, 14*_gSide);
      _gnGrpGrd.addColorStop(0,'#444444'); _gnGrpGrd.addColorStop(1,'#2a2a2a');
      ctx.fillStyle=_gnGrpGrd;
      ctx.beginPath(); ctx.moveTo(1,3*_gSide); ctx.lineTo(8,3*_gSide); ctx.lineTo(6,14*_gSide); ctx.lineTo(-1,14*_gSide); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=0.7;
      for(let _ggi=0;_ggi<3;_ggi++){ctx.beginPath();ctx.moveTo(0+_ggi*2,5*_gSide);ctx.lineTo(0+_ggi*2,12*_gSide);ctx.stroke();}
      // Trigger guard — follows grip side
      ctx.strokeStyle='#555555'; ctx.lineWidth=1.2;
      ctx.save(); ctx.scale(1, _gSide);
      ctx.beginPath(); ctx.arc(4,8,5,-Math.PI*0.15,Math.PI*0.65); ctx.stroke();
      ctx.restore();
      // Rear sight
      ctx.fillStyle='#888888'; ctx.fillRect(2,-6,3,2);
      // Front sight post
      ctx.fillStyle='#888888'; ctx.fillRect(20,-6,2,2);
      // Muzzle flash when attacking
      if(attacking){
        ctx.shadowColor='#ffcc44'; ctx.shadowBlur=16;
        ctx.fillStyle='#ffee88'; ctx.beginPath(); ctx.arc(31,0,4.5,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=0.7; ctx.fillStyle='#ffffff';
        ctx.beginPath(); ctx.arc(31,0,2.2,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; ctx.shadowBlur=0;
      }

    } else if (k === 'axe') {
      // Handle
      const _axHndGrd = ctx.createLinearGradient(0,-2,0,2);
      _axHndGrd.addColorStop(0,'#6b3a1f'); _axHndGrd.addColorStop(0.5,'#4a2510'); _axHndGrd.addColorStop(1,'#6b3a1f');
      ctx.fillStyle=_axHndGrd; ctx.beginPath(); ctx.roundRect(-3,-2,24,4,1); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.8;
      for(let _axi=0;_axi<4;_axi++){ctx.beginPath();ctx.moveTo(0+_axi*5,-2);ctx.lineTo(0+_axi*5,2);ctx.stroke();}
      // Poll (flat back of head)
      ctx.fillStyle='#888888'; ctx.beginPath(); ctx.roundRect(16,-4,5,8,1); ctx.fill();
      ctx.strokeStyle='#aaaaaa'; ctx.lineWidth=0.7; ctx.stroke();
      // Axe head — curved single-bit blade
      const _axHdGrd = ctx.createLinearGradient(18,-14,18,9);
      _axHdGrd.addColorStop(0,'#cc5533'); _axHdGrd.addColorStop(0.4,'#aa3311'); _axHdGrd.addColorStop(1,'#772200');
      ctx.fillStyle=_axHdGrd;
      ctx.beginPath();
      ctx.moveTo(20,-14);
      ctx.bezierCurveTo(30,-12,34,-6,34,2);
      ctx.bezierCurveTo(34,8,28,11,22,8);
      ctx.lineTo(20,2); ctx.lineTo(20,-2);
      ctx.closePath(); ctx.fill();
      // Cutting edge highlight
      ctx.strokeStyle='#ff8866'; ctx.lineWidth=1.3;
      ctx.shadowColor=attacking?'#ff5522':'#cc4411'; ctx.shadowBlur=attacking?14:5;
      ctx.beginPath();
      ctx.moveTo(20,-14); ctx.bezierCurveTo(30,-12,34,-6,34,2); ctx.bezierCurveTo(34,8,28,11,22,8);
      ctx.stroke(); ctx.shadowBlur=0;

    } else if (k === 'stormbreaker') {
      // Long war-axe held in hand; lightning crackles from the blade tip
      const _sbNow = performance.now();
      // Handle pole
      ctx.strokeStyle = '#6b3a1f'; ctx.lineWidth = 4;
      ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(24, 0); ctx.stroke();
      // Blade
      ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#9999bb';
      ctx.beginPath();
      ctx.moveTo(18, -13); ctx.lineTo(34, 1); ctx.lineTo(18, 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ccccee';
      ctx.beginPath();
      ctx.moveTo(20, -11); ctx.lineTo(32, 1); ctx.lineTo(20, 5);
      ctx.closePath(); ctx.fill();
      // Bright cutting edge
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(34, 1); ctx.lineTo(18, -13); ctx.stroke();
      // Lightning discharge from blade tip
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(_sbNow / 55);
      ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(34, 0);
      ctx.lineTo(40 + Math.sin(_sbNow / 40) * 4, -5 + Math.sin(_sbNow / 50) * 5);
      ctx.stroke();
      ctx.globalAlpha = 1;

    } else if (k === 'spear') {
      // Shaft — hardwood pole
      const _spShGrd = ctx.createLinearGradient(0,-2.5,0,2.5);
      _spShGrd.addColorStop(0,'#5a3a1a'); _spShGrd.addColorStop(0.5,'#7a5a2a'); _spShGrd.addColorStop(1,'#5a3a1a');
      ctx.fillStyle=_spShGrd; ctx.beginPath(); ctx.roundRect(-4,-2,38,4,1); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=0.6;
      ctx.beginPath(); ctx.moveTo(0,-0.8); ctx.lineTo(32,-0.8); ctx.stroke();
      // Socket
      ctx.fillStyle='#778899'; ctx.beginPath(); ctx.roundRect(30,-3.5,6,7,1); ctx.fill();
      ctx.strokeStyle='#aabbcc'; ctx.lineWidth=0.8; ctx.stroke();
      // Spearhead — leaf shape with fuller
      const _spHdGrd = ctx.createLinearGradient(0,-7,0,7);
      _spHdGrd.addColorStop(0,'#aaaaff'); _spHdGrd.addColorStop(0.4,'#8888cc'); _spHdGrd.addColorStop(1,'#5555aa');
      ctx.fillStyle=_spHdGrd;
      ctx.beginPath(); ctx.moveTo(34,-7.5); ctx.lineTo(48,0); ctx.lineTo(34,7.5); ctx.lineTo(36,0); ctx.closePath(); ctx.fill();
      // Fuller groove
      ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(35,0); ctx.lineTo(45,0); ctx.stroke();
      // Edge highlight
      ctx.strokeStyle='#ccccff'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(34,-7.5); ctx.lineTo(48,0); ctx.stroke();
      if(attacking){
        ctx.shadowColor='#aaaaff'; ctx.shadowBlur=18;
        ctx.globalAlpha=0.55; ctx.fillStyle='#ccccff';
        ctx.beginPath(); ctx.arc(48,0,3,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; ctx.shadowBlur=0;
      }

    } else if (k === 'bow') {
      // Bow limbs — two curved arcs for upper and lower limb
      ctx.strokeStyle='#6b3a1a'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-5,-17); ctx.bezierCurveTo(2,-9,5,-3,5,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5,17);  ctx.bezierCurveTo(2,9,5,3,5,0);  ctx.stroke();
      // Grain highlight on limbs
      ctx.strokeStyle='#9b6a3a'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-4,-16); ctx.bezierCurveTo(3,-8,5,-2,5,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4,16);  ctx.bezierCurveTo(3,8,5,2,5,0);  ctx.stroke();
      // Recurve tips
      ctx.strokeStyle='#4a2010'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-5,-17); ctx.lineTo(-9,-20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5,17);  ctx.lineTo(-9,20);  ctx.stroke();
      // String — from tip to tip, pulled slightly forward at center
      ctx.strokeStyle='#e8e8e8'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-9,-20); ctx.lineTo(-7,0); ctx.lineTo(-9,20); ctx.stroke();
      // Arrow shaft
      ctx.strokeStyle='#c8a060'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.moveTo(-7,0); ctx.lineTo(22,0); ctx.stroke();
      // Arrowhead
      const _bwArGrd = ctx.createLinearGradient(20,-3,20,3);
      _bwArGrd.addColorStop(0,'#bbbbbb'); _bwArGrd.addColorStop(1,'#666666');
      ctx.fillStyle=_bwArGrd;
      ctx.beginPath(); ctx.moveTo(20,-3.5); ctx.lineTo(27,0); ctx.lineTo(20,3.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#dddddd'; ctx.lineWidth=0.7; ctx.stroke();
      // Fletching — two angled vanes at the tail
      ctx.strokeStyle='#cc3333'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(-10,-5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(-10,5);  ctx.stroke();
      ctx.strokeStyle='#ffffff'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(-9,0); ctx.stroke();
      if(attacking){
        ctx.shadowColor='#aadd88'; ctx.shadowBlur=14;
        ctx.globalAlpha=0.55; ctx.fillStyle='#ccff88';
        ctx.beginPath(); ctx.arc(27,0,2.5,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; ctx.shadowBlur=0;
      }

    } else if (k === 'shield') {
      // Kite shield body with gradient
      const _shFillGrd = ctx.createLinearGradient(-12,-14,12,16);
      _shFillGrd.addColorStop(0,'#5577dd'); _shFillGrd.addColorStop(0.5,'#3355bb'); _shFillGrd.addColorStop(1,'#223399');
      ctx.fillStyle=_shFillGrd;
      ctx.beginPath();
      ctx.moveTo(-9,-15); ctx.lineTo(9,-15); ctx.lineTo(13,4); ctx.lineTo(0,17); ctx.lineTo(-13,4);
      ctx.closePath(); ctx.fill();
      // Metal rim
      ctx.strokeStyle='#aabbff'; ctx.lineWidth=1.8; ctx.stroke();
      // Heraldic cross
      ctx.strokeStyle='rgba(255,238,120,0.85)'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(0,11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8,-1); ctx.lineTo(8,-1); ctx.stroke();
      // Central boss (round rivet)
      const _shBossGrd = ctx.createRadialGradient(0,-1,0,0,-1,5);
      _shBossGrd.addColorStop(0,'#ffee88'); _shBossGrd.addColorStop(1,'#cc9900');
      ctx.fillStyle=_shBossGrd; ctx.beginPath(); ctx.arc(0,-1,4.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#ffdd55'; ctx.lineWidth=0.8; ctx.stroke();
      // Corner rivets
      ctx.fillStyle='#ffdd55';
      [[-6,-10],[6,-10],[9,5],[0,14],[-9,5]].forEach(([rx,ry])=>{
        ctx.beginPath(); ctx.arc(rx,ry,1.5,0,Math.PI*2); ctx.fill();
      });
      // Sheen highlight
      ctx.globalAlpha=0.25;
      ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.moveTo(-7,-14); ctx.lineTo(2,-14); ctx.lineTo(5,2); ctx.lineTo(-9,2); ctx.closePath(); ctx.fill();
      ctx.globalAlpha=1;

    } else if (k === 'scythe') {
      // Shaft — long dark wood pole
      const _scShGrd = ctx.createLinearGradient(0,-2,0,2);
      _scShGrd.addColorStop(0,'#5a3a1a'); _scShGrd.addColorStop(0.5,'#7a5a2a'); _scShGrd.addColorStop(1,'#5a3a1a');
      ctx.fillStyle=_scShGrd; ctx.beginPath(); ctx.roundRect(-6,-2,36,4,1); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.7;
      ctx.beginPath(); ctx.moveTo(-4,-0.8); ctx.lineTo(28,-0.8); ctx.stroke();
      // Blade ferrule (socket where blade meets shaft)
      ctx.fillStyle='#667788'; ctx.beginPath(); ctx.roundRect(24,-3.5,5,7,1); ctx.fill();
      ctx.strokeStyle='#99aabb'; ctx.lineWidth=0.8; ctx.stroke();
      // Scythe blade — wide sweeping crescent
      const _scBlGrd = ctx.createLinearGradient(20,-28,28,-2);
      _scBlGrd.addColorStop(0,'#99aabb'); _scBlGrd.addColorStop(0.5,'#778899'); _scBlGrd.addColorStop(1,'#445566');
      ctx.fillStyle=_scBlGrd;
      ctx.beginPath();
      ctx.moveTo(22,-2);
      ctx.bezierCurveTo(36,-8,38,-22,28,-30);
      ctx.bezierCurveTo(18,-26,14,-16,22,-2);
      ctx.fill();
      // Inner edge (sharp inside of crescent)
      ctx.strokeStyle='#ccdde8'; ctx.lineWidth=1.4;
      ctx.beginPath();
      ctx.moveTo(22,-2); ctx.bezierCurveTo(36,-8,38,-22,28,-30); ctx.stroke();
      // Back edge (spine of blade — thicker)
      ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.moveTo(22,-2); ctx.bezierCurveTo(14,-16,18,-26,28,-30); ctx.stroke();
      // Tip gleam
      if(attacking){
        ctx.shadowColor='#99ccdd'; ctx.shadowBlur=14;
        ctx.globalAlpha=0.6; ctx.fillStyle='#cceeee';
        ctx.beginPath(); ctx.arc(28,-30,3,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; ctx.shadowBlur=0;
      }

    } else if (k === 'fryingpan') {
      // Handle — riveted metal with wood grip
      const _fpHndGrd = ctx.createLinearGradient(0,-3,0,3);
      _fpHndGrd.addColorStop(0,'#7a5a2a'); _fpHndGrd.addColorStop(0.5,'#4a3010'); _fpHndGrd.addColorStop(1,'#7a5a2a');
      ctx.fillStyle=_fpHndGrd; ctx.beginPath(); ctx.roundRect(-3,-2.5,20,5,1.5); ctx.fill();
      // Rivet on handle
      ctx.fillStyle='#888888'; ctx.beginPath(); ctx.arc(5,0,1.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(13,0,1.5,0,Math.PI*2); ctx.fill();
      // Pan body — dark seasoned steel
      const _fpPanGrd = ctx.createRadialGradient(23,0,2,23,-2,12);
      _fpPanGrd.addColorStop(0,'#444444'); _fpPanGrd.addColorStop(0.7,'#333333'); _fpPanGrd.addColorStop(1,'#222222');
      ctx.fillStyle=_fpPanGrd;
      ctx.beginPath(); ctx.arc(23,0,11,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#555555'; ctx.lineWidth=1.5; ctx.stroke();
      // Pan rim
      ctx.strokeStyle='#666666'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(23,0,11,0,Math.PI*2); ctx.stroke();
      // Specular highlight (big cookware shine)
      ctx.globalAlpha=0.35; ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.ellipse(19,-4,5,3,-0.4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.12; ctx.beginPath(); ctx.arc(26,2,3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
      if(attacking){
        ctx.shadowColor='#ffcc44'; ctx.shadowBlur=12;
        ctx.globalAlpha=0.3; ctx.fillStyle='#ffcc44';
        ctx.beginPath(); ctx.arc(23,0,11,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; ctx.shadowBlur=0;
      }

    } else if (k === 'broomstick') {
      // Shaft — smooth polished wood
      const _brShGrd = ctx.createLinearGradient(0,-2.5,0,2.5);
      _brShGrd.addColorStop(0,'#9b7920'); _brShGrd.addColorStop(0.5,'#6b5010'); _brShGrd.addColorStop(1,'#9b7920');
      ctx.fillStyle=_brShGrd; ctx.beginPath(); ctx.roundRect(-4,-2,36,4,1); ctx.fill();
      // Wood grain lines
      ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.6;
      ctx.beginPath(); ctx.moveTo(0,-0.8); ctx.lineTo(30,-0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5,0.8); ctx.lineTo(26,0.8); ctx.stroke();
      // Binding (twine wrap where bristles meet)
      ctx.fillStyle='#8b4040'; ctx.beginPath(); ctx.roundRect(27,-4,4,8,1); ctx.fill();
      ctx.strokeStyle='#aa6060'; ctx.lineWidth=0.8; ctx.stroke();
      // Bristle bundle — fanned out
      ctx.strokeStyle='#c8a040'; ctx.lineWidth=1.4; ctx.lineCap='round';
      for(let _bri=0;_bri<7;_bri++){
        const _brFrac=(_bri-3)/3;
        ctx.beginPath();
        ctx.moveTo(30,_brFrac*3);
        ctx.lineTo(38+_bri*0.5,_brFrac*8);
        ctx.stroke();
      }
      // Bristle tip line
      ctx.strokeStyle='#e8c060'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(37,-7); ctx.lineTo(42,7); ctx.stroke();

    } else if (k === 'combat') {
      // Bare hands — no weapon object at all. Draw a compact clenched fist that
      // sits ON the hand joint (small enough to read as part of the arm, not a
      // held item). Everything is in the fighter's own colour so it reads as skin.
      const _fistColor = this.color || '#cc4444';
      // No weapon halo on a bare hand (a cosmetic weapon theme still glows)
      if (!this.weaponTheme) ctx.shadowBlur = 0;
      // Wrist tape — two wraps just behind the hand
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-2.5, -2.6); ctx.lineTo(-2.5, 2.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.4, -3.0); ctx.lineTo(-0.4, 3.0); ctx.stroke();
      // Fist mass
      ctx.fillStyle = _fistColor;
      ctx.beginPath(); ctx.ellipse(3.2, 0, 5.0, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 0.9; ctx.stroke();
      // Thumb folded across the front-bottom
      ctx.fillStyle = _fistColor;
      ctx.beginPath(); ctx.ellipse(5.2, 2.0, 2.4, 1.5, -0.35, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.7; ctx.stroke();
      // Knuckle ridge — three short creases on the striking face
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
      for (let _ki = 0; _ki < 3; _ki++) {
        const _ky = -2.2 + _ki * 2.0;
        ctx.beginPath(); ctx.moveTo(5.4, _ky); ctx.lineTo(7.2, _ky); ctx.stroke();
      }
      // Top-light highlight
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(2.4, -1.9, 2.6, 1.3, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // Impact flare — only while the punch is actually swinging
      if (attacking) {
        ctx.globalAlpha = 0.45; ctx.shadowColor = '#ffddaa'; ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(3.2, 0, 6.6, -0.9, 0.9); ctx.stroke();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }

    } else if (k === 'peashooter') {
      // Stem / body — organic green tube
      const _psGrd = ctx.createLinearGradient(0,-5,0,5);
      _psGrd.addColorStop(0,'#33aa44'); _psGrd.addColorStop(0.5,'#227733'); _psGrd.addColorStop(1,'#1a5522');
      ctx.fillStyle=_psGrd; ctx.beginPath(); ctx.roundRect(0,-4.5,24,9,3); ctx.fill();
      ctx.strokeStyle='#44cc55'; ctx.lineWidth=1; ctx.stroke();
      // Ribbing (plant node lines)
      ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1;
      for(let _psi=0;_psi<3;_psi++){ctx.beginPath();ctx.moveTo(7+_psi*5,-4.5);ctx.lineTo(7+_psi*5,4.5);ctx.stroke();}
      // Barrel mouth — dark opening with inner glow
      ctx.fillStyle='#0a1a0a'; ctx.beginPath(); ctx.arc(24,0,4.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#33aa44'; ctx.lineWidth=1; ctx.stroke();
      ctx.globalAlpha=0.5; ctx.fillStyle='#55ff66';
      ctx.beginPath(); ctx.arc(24,0,2,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      // Leaf sprouting from top
      ctx.fillStyle='#44cc44';
      ctx.beginPath(); ctx.ellipse(8,-8,7,3.5,-0.4,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#66ee66'; ctx.lineWidth=0.7; ctx.stroke();
      // Leaf vein
      ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.6;
      ctx.beginPath(); ctx.moveTo(4,-8); ctx.lineTo(12,-8); ctx.stroke();
      // Soil pot at base
      ctx.fillStyle='#8b5e2a'; ctx.beginPath(); ctx.roundRect(-1,4,8,5,1); ctx.fill();

    } else if (k === 'slingshot') {
      // Handle grip
      const _ssHndGrd = ctx.createLinearGradient(0,-2,0,2);
      _ssHndGrd.addColorStop(0,'#7b4a1a'); _ssHndGrd.addColorStop(0.5,'#5a3010'); _ssHndGrd.addColorStop(1,'#7b4a1a');
      ctx.fillStyle=_ssHndGrd; ctx.beginPath(); ctx.roundRect(-2,-2,16,4,1.5); ctx.fill();
      // Y-fork arms — thicker, rounded
      ctx.strokeStyle='#6b3d0a'; ctx.lineWidth=3.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(13,0); ctx.lineTo(20,-11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(13,0); ctx.lineTo(20,11); ctx.stroke();
      // Fork tip caps
      ctx.fillStyle='#8b5520'; ctx.beginPath(); ctx.arc(20,-11,2.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(20,11,2.5,0,Math.PI*2); ctx.fill();
      // Elastic bands (two parallel strands)
      ctx.strokeStyle='#cc6622'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(19,-9); ctx.lineTo(8,-1); ctx.lineTo(19,9); ctx.stroke();
      ctx.strokeStyle='#ee8844'; ctx.lineWidth=0.7;
      ctx.beginPath(); ctx.moveTo(20,-10); ctx.lineTo(9,0); ctx.lineTo(20,10); ctx.stroke();
      // Stone / ammo in the pouch
      const _ssStGrd = ctx.createRadialGradient(8,0,0,8,0,3.5);
      _ssStGrd.addColorStop(0,'#aaaaaa'); _ssStGrd.addColorStop(1,'#555555');
      ctx.fillStyle=_ssStGrd; ctx.beginPath(); ctx.arc(8,0,3.2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#888888'; ctx.lineWidth=0.6; ctx.stroke();

    } else if (k === 'paperairplane') {
      // Hide plane while it's in the air (basic attack throw or swarm active)
      const _ppInAir = (this._paperPlanes && this._paperPlanes.length > 0) ||
                       (this._paperSwarm  && this._paperSwarm.length  > 0);
      if (!_ppInAir) {
        // Far wing — shaded, so the fold reads as two sheets meeting at a keel
        const _ppFarGrd = ctx.createLinearGradient(0, -10, 14, 0);
        _ppFarGrd.addColorStop(0, '#f2f8ff'); _ppFarGrd.addColorStop(1, '#c3d4ee');
        ctx.fillStyle = _ppFarGrd;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28, -2); ctx.lineTo(0, -10); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(110,140,180,0.7)'; ctx.lineWidth = 0.7; ctx.stroke();
        // Near wing — darker underside
        const _ppNearGrd = ctx.createLinearGradient(0, 8, 16, 0);
        _ppNearGrd.addColorStop(0, '#93a9cc'); _ppNearGrd.addColorStop(1, '#c9d8f0');
        ctx.fillStyle = _ppNearGrd;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28, -2); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(90,120,165,0.8)'; ctx.lineWidth = 0.8; ctx.stroke();
        // Centre keel — the sharp spine of the fold
        ctx.strokeStyle = 'rgba(70,100,150,0.9)'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(28, -2); ctx.stroke();
        // Secondary crease lines running back from the nose
        ctx.strokeStyle = 'rgba(140,170,210,0.65)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(26, -2); ctx.lineTo(2, -6.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(26, -2); ctx.lineTo(2, 5); ctx.stroke();
        // Nose highlight
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(27, -2, 1.1, 0, Math.PI * 2); ctx.fill();
      }

    } else if (k === 'flail') {
      // Haft — wrapped wood with a metal collar at the chain mount
      const _flHfGrd = ctx.createLinearGradient(0, -2.5, 0, 2.5);
      _flHfGrd.addColorStop(0, '#6b4526'); _flHfGrd.addColorStop(0.5, '#402612'); _flHfGrd.addColorStop(1, '#6b4526');
      ctx.fillStyle = _flHfGrd;
      ctx.beginPath(); ctx.roundRect(-4, -2.5, 18, 5, 1.5); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.8;
      for (let _fh = 0; _fh < 3; _fh++) { ctx.beginPath(); ctx.moveTo(0 + _fh * 4, -2.5); ctx.lineTo(0 + _fh * 4, 2.5); ctx.stroke(); }
      ctx.fillStyle = '#70707e'; ctx.beginPath(); ctx.roundRect(12, -3.2, 3.5, 6.4, 1); ctx.fill();
      ctx.strokeStyle = '#9a9aa8'; ctx.lineWidth = 0.7; ctx.stroke();
      // Chain — interlocking links, swung outward mid-strike
      const _flBallOff = attacking ? 10 : 0;
      const _flBallY   = attacking ? -12 : 0;
      for (let _fi = 0; _fi < 3; _fi++) {
        const _flFrac = (_fi + 1) / 3;
        const _lx = 17 + _fi * 4.6 + _flBallOff * _flFrac, _ly = _flBallY * _flFrac;
        ctx.save(); ctx.translate(_lx, _ly); ctx.rotate(_fi % 2 ? Math.PI / 2 : 0);
        ctx.strokeStyle = '#8e8e9c'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.ellipse(0, -0.5, 3.2, 2, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        ctx.restore();
      }
      // Spiked ball
      const _flR = attacking ? 9 : 7.5;
      const _flCx = 32 + _flBallOff, _flCy = _flBallY;
      ctx.shadowColor = attacking ? '#ffffff' : '#bbbbcc';
      ctx.shadowBlur  = attacking ? 16 : 6;
      // Spikes first so they sit behind the ball body
      ctx.fillStyle = '#8a8a99';
      for (let _fs = 0; _fs < 8; _fs++) {
        const _fa = (_fs / 8) * Math.PI * 2 + 0.2;
        ctx.beginPath();
        ctx.moveTo(_flCx + Math.cos(_fa) * (_flR + 5.5), _flCy + Math.sin(_fa) * (_flR + 5.5));
        ctx.lineTo(_flCx + Math.cos(_fa + 0.32) * _flR * 0.9, _flCy + Math.sin(_fa + 0.32) * _flR * 0.9);
        ctx.lineTo(_flCx + Math.cos(_fa - 0.32) * _flR * 0.9, _flCy + Math.sin(_fa - 0.32) * _flR * 0.9);
        ctx.closePath(); ctx.fill();
      }
      const _flBGrd = ctx.createRadialGradient(_flCx - _flR * 0.4, _flCy - _flR * 0.4, 1, _flCx, _flCy, _flR);
      _flBGrd.addColorStop(0, '#d8d8e4'); _flBGrd.addColorStop(0.55, '#9a9aa8'); _flBGrd.addColorStop(1, '#4e4e5c');
      ctx.fillStyle = _flBGrd;
      ctx.beginPath(); ctx.arc(_flCx, _flCy, _flR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.9; ctx.stroke();
      if (attacking) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(_flCx - _flBallOff * 0.5, _flCy - _flBallY * 0.5, _flR * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.shadowBlur = 0;

    } else if (k === 'whip') {
      // Grip — leather-bound handle with a pommel knot
      const _whGrd = ctx.createLinearGradient(0, -4, 0, 4);
      _whGrd.addColorStop(0, '#8a4a1c'); _whGrd.addColorStop(0.5, '#552a0c'); _whGrd.addColorStop(1, '#8a4a1c');
      ctx.fillStyle = _whGrd;
      ctx.beginPath(); ctx.roundRect(-4, -3.6, 11, 7.2, 2.5); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,150,0.28)'; ctx.lineWidth = 0.8;
      for (let _wg = 0; _wg < 3; _wg++) { ctx.beginPath(); ctx.moveTo(-2 + _wg * 3, -3.6); ctx.lineTo(-1 + _wg * 3, 3.6); ctx.stroke(); }
      ctx.fillStyle = '#4a2408';
      ctx.beginPath(); ctx.arc(-4.5, 0, 2.6, 0, Math.PI * 2); ctx.fill();
      // Lash — a braided thong that TAPERS: drawn as stacked segments of shrinking width
      const _whCp1y = attacking ? 14 : 10;
      const _whCp2y = attacking ? -18 : -14;
      const _whPt = (u) => {
        // two chained quadratics sampled at u in [0,1]
        if (u < 0.5) { const q = u / 0.5, m = 1 - q;
          return [m*m*7 + 2*m*q*18 + q*q*36, m*m*0 + 2*m*q*_whCp1y + q*q*(_whCp2y + 9)]; }
        const q = (u - 0.5) / 0.5, m = 1 - q;
        return [m*m*36 + 2*m*q*48 + q*q*56, m*m*(_whCp2y + 9) + 2*m*q*_whCp2y + q*q*2];
      };
      ctx.lineCap = 'round';
      const _whSeg = 14;
      for (let _wi = 0; _wi < _whSeg; _wi++) {
        const [x0, y0] = _whPt(_wi / _whSeg), [x1, y1] = _whPt((_wi + 1) / _whSeg);
        const _wt = 1 - _wi / _whSeg;                       // 1 at the grip, 0 at the tip
        ctx.strokeStyle = '#7a4a18'; ctx.lineWidth = 1.0 + _wt * 2.6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        // braid highlight, alternating so the cord reads as plaited
        ctx.strokeStyle = _wi % 2 ? 'rgba(220,170,80,0.75)' : 'rgba(150,100,40,0.7)';
        ctx.lineWidth = 0.6 + _wt * 1.1;
        ctx.beginPath(); ctx.moveTo(x0, y0 - 0.5); ctx.lineTo(x1, y1 - 0.5); ctx.stroke();
      }
      // Popper (the cracking tip)
      const [_wtx, _wty] = _whPt(1);
      ctx.strokeStyle = '#d8b070'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(_wtx - 3, _wty - 1); ctx.lineTo(_wtx + 3, _wty + 1.5); ctx.stroke();
      if (attacking) {
        ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 18;
        ctx.fillStyle = '#fff099';
        ctx.beginPath(); ctx.arc(_wtx, _wty, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

    } else if (k === 'boomerang') {
      // Hide while a thrown boomerang is in flight
      const _bmInAir = this._boomerangs && this._boomerangs.some(b => b.oneWay);
      if (!_bmInAir) {
        // The arc is centred on (0,0) — the HAND — so drawn raw it hovers a full
        // 19px radius away on every side and nothing is actually gripped. Shift it
        // so the lower arm's tip sits in the fist and the rest sweeps up and
        // forward, the way you'd hold one ready to throw.
        const _bmA    = Math.PI * 0.65;
        const _bmTipX = 19 * Math.cos(_bmA), _bmTipY = 19 * Math.sin(_bmA);
        ctx.save();
        ctx.translate(-_bmTipX, -_bmTipY);
        // Outer arm — layered for depth
        ctx.strokeStyle='#8b5e22'; ctx.lineWidth=6; ctx.lineCap='round';
        ctx.beginPath(); ctx.arc(0,0,19,-_bmA,_bmA); ctx.stroke();
        // Mid layer — warm wood tone
        ctx.strokeStyle='#cc9944'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.arc(0,0,19,-_bmA,_bmA); ctx.stroke();
        // Highlight stripe — leading edge
        ctx.strokeStyle='#eecc66'; ctx.lineWidth=1.8;
        ctx.beginPath(); ctx.arc(0,0,19,-Math.PI*0.55,Math.PI*0.55); ctx.stroke();
        // Inner dark edge — trailing edge shadow
        ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.arc(0,0,16,-Math.PI*0.6,Math.PI*0.6); ctx.stroke();
        // End caps — on the arc's real endpoints (x was pinned to 0, off by _bmTipX)
        ctx.fillStyle='#cc9944';
        ctx.beginPath(); ctx.arc(_bmTipX,-_bmTipY,3,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(_bmTipX, _bmTipY,3,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }

    } else if (k === 'katana') {
      // Kashira (pommel cap)
      ctx.fillStyle = '#3a3a44';
      ctx.beginPath(); ctx.roundRect(-9, -3.2, 3, 6.4, 1); ctx.fill();
      // Tsuka (handle) — dark ray-skin core
      const _ktTsGrd = ctx.createLinearGradient(0, -3, 0, 3);
      _ktTsGrd.addColorStop(0, '#4a4450'); _ktTsGrd.addColorStop(0.5, '#2a2630'); _ktTsGrd.addColorStop(1, '#4a4450');
      ctx.fillStyle = _ktTsGrd;
      ctx.beginPath(); ctx.roundRect(-6, -3, 14, 6, 1); ctx.fill();
      // Ito wrap — diamond cross-binding
      ctx.strokeStyle = 'rgba(200,190,180,0.5)'; ctx.lineWidth = 0.9;
      for (let _ki = 0; _ki < 4; _ki++) {
        const _kx = -5 + _ki * 3.4;
        ctx.beginPath(); ctx.moveTo(_kx, -3); ctx.lineTo(_kx + 2.4, 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(_kx + 2.4, -3); ctx.lineTo(_kx, 3); ctx.stroke();
      }
      // Tsuba (guard) — oval disc
      const _ktGdGrd = ctx.createLinearGradient(0, -7, 0, 7);
      _ktGdGrd.addColorStop(0, '#8a8270'); _ktGdGrd.addColorStop(0.5, '#5a5445'); _ktGdGrd.addColorStop(1, '#3a3628');
      ctx.fillStyle = _ktGdGrd;
      ctx.beginPath(); ctx.ellipse(9, 0, 2.6, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a8a08c'; ctx.lineWidth = 0.7; ctx.stroke();
      // Blade — long, slim, gently curved single edge
      const _ktBlGrd = ctx.createLinearGradient(0, -2.6, 0, 2.6);
      _ktBlGrd.addColorStop(0, '#f2f2fa'); _ktBlGrd.addColorStop(0.4, '#c6c6d8'); _ktBlGrd.addColorStop(1, '#6e6e88');
      ctx.fillStyle = _ktBlGrd;
      ctx.beginPath();
      ctx.moveTo(12, -2.4);
      ctx.quadraticCurveTo(30, -3.4, 44, -1.6);   // spine, curving up
      ctx.lineTo(47, 0);                          // kissaki (tip)
      ctx.quadraticCurveTo(30, 1.8, 12, 2.4);     // cutting edge
      ctx.closePath(); ctx.fill();
      // Hamon — wavy temper line along the edge
      ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(14, 1.1);
      for (let _kh = 0; _kh < 5; _kh++) {
        const _kx0 = 14 + _kh * 6.4;
        ctx.quadraticCurveTo(_kx0 + 3.2, _kh % 2 ? 1.9 : -0.3, _kx0 + 6.4, 0.8);
      }
      ctx.stroke();
      // Ha (cutting edge) highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(12, 2.4); ctx.quadraticCurveTo(30, 1.8, 47, 0); ctx.stroke();
      if (attacking) {
        ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 22;
        ctx.strokeStyle = '#ddddff'; ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.moveTo(14, 1.6); ctx.quadraticCurveTo(30, 1.2, 47, 0); ctx.stroke();
        ctx.globalAlpha = 1;
        // Kissaki flash
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(47, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

    } else if (k === 'flamethrower') {
      const _ftNow = typeof frameCount !== 'undefined' ? frameCount : 0;
      const _ftPulse = 0.5 + 0.5 * Math.sin(_ftNow * 0.25);
      // Receiver body — olive-drab casing with a lit top rib
      const _ftBdGrd = ctx.createLinearGradient(0, -6, 0, 6);
      _ftBdGrd.addColorStop(0, '#8a7a26'); _ftBdGrd.addColorStop(0.45, '#5c5014'); _ftBdGrd.addColorStop(1, '#332c08');
      ctx.fillStyle = _ftBdGrd;
      ctx.beginPath(); ctx.roundRect(-4, -6, 27, 12, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,180,0.2)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(20, -5); ctx.stroke();
      // Fuel tank — cylinder with band and a pressure gauge
      const _ftTkGrd = ctx.createLinearGradient(0, -7, 0, 7);
      _ftTkGrd.addColorStop(0, '#b09a30'); _ftTkGrd.addColorStop(0.5, '#7a6a1a'); _ftTkGrd.addColorStop(1, '#3f3608');
      ctx.fillStyle = _ftTkGrd;
      ctx.beginPath(); ctx.ellipse(3, 0, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#241d04'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(3, -7); ctx.lineTo(3, 7); ctx.stroke();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(-0.5, -3, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#cc9933'; ctx.lineWidth = 0.7; ctx.stroke();
      // Fuel line — hose looping under the barrel
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(9, 5); ctx.quadraticCurveTo(18, 11, 25, 4); ctx.stroke();
      // Barrel with heat shroud (vent slots)
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath(); ctx.roundRect(22, -4, 12, 8, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.1;
      for (let _fv = 0; _fv < 3; _fv++) { ctx.beginPath(); ctx.moveTo(24 + _fv * 3.4, -3.2); ctx.lineTo(24 + _fv * 3.4, 3.2); ctx.stroke(); }
      // Muzzle ring
      ctx.strokeStyle = '#7a7a7a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(34, 0, 1.6, 4, 0, 0, Math.PI * 2); ctx.stroke();
      // Pilot light — a live flame always burning at the nozzle
      ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 10 + _ftPulse * 10;
      const _ftFlGrd = ctx.createRadialGradient(36, 0, 0.5, 36, 0, 5 + _ftPulse * 2);
      _ftFlGrd.addColorStop(0, '#fff0b0'); _ftFlGrd.addColorStop(0.45, '#ff9922'); _ftFlGrd.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = _ftFlGrd;
      ctx.beginPath(); ctx.arc(36, 0, 5 + _ftPulse * 2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (k === 'electricstaff') {
      // Long staff + crackling crystal orb tip
      ctx.strokeStyle = '#446688'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(28, 0); ctx.stroke();
      const _esNow = typeof frameCount !== 'undefined' ? frameCount : 0;
      const _esPulse = 0.5 + 0.5 * Math.sin(_esNow * 0.18);
      const _esBlur = attacking ? (18 + _esPulse * 12) : (10 + _esPulse * 10);
      ctx.shadowColor = '#00ddff'; ctx.shadowBlur = _esBlur;
      ctx.fillStyle = attacking ? '#44eeff' : '#00aacc';
      ctx.beginPath(); ctx.arc(33, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#aaeeff'; ctx.lineWidth = 1.2; ctx.stroke();
      // Crackling arcs — more wild when attacking
      const _esArcs = attacking ? 3 : 1;
      for (let _ei = 0; _ei < _esArcs; _ei++) {
        ctx.globalAlpha = (0.5 + _esPulse * 0.4) / _esArcs * 1.8;
        ctx.strokeStyle = '#88eeff'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(33, 0);
        ctx.lineTo(33 + Math.sin(_esNow / (38 + _ei * 11)) * (attacking ? 9 : 6) + _ei * 2,
                   Math.sin(_esNow / (47 + _ei * 9)) * (attacking ? 8 : 5));
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    } else if (k === 'gauntlet') {
      // Large dark-energy fist/gauntlet around the hand
      ctx.save();
      ctx.shadowColor = '#bb00ff';
      ctx.shadowBlur  = 14;
      // Main gauntlet body
      ctx.fillStyle   = '#7700cc';
      ctx.beginPath();
      ctx.roundRect(-10, -10, 26, 20, 5);
      ctx.fill();
      // Bright outline
      ctx.strokeStyle = '#bb00ff';
      ctx.lineWidth   = 2;
      ctx.stroke();
      // Knuckle arcs
      ctx.fillStyle = '#9900ee';
      for (let ki = 0; ki < 3; ki++) {
        ctx.beginPath();
        ctx.arc(2 + ki * 6, -10, 4, Math.PI, 0);
        ctx.fill();
      }
      // Energy glow core
      ctx.globalAlpha = 0.5;
      ctx.fillStyle   = '#ee88ff';
      ctx.beginPath();
      ctx.arc(5, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

    } else if (k === 'mkgauntlet') {
      // Megaknight gauntlets — gold + purple, larger than boss gauntlet
      ctx.save();
      ctx.shadowColor = '#cc88ff';
      ctx.shadowBlur  = 18;
      // Main body — gold plate
      ctx.fillStyle = '#aa6600';
      ctx.beginPath();
      ctx.roundRect(-12, -12, 30, 22, 6);
      ctx.fill();
      // Purple energy overlay
      ctx.fillStyle   = 'rgba(136,68,255,0.45)';
      ctx.fillRect(-12, -12, 30, 22);
      // Gold outline
      ctx.strokeStyle = '#ffcc44';
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.roundRect(-12, -12, 30, 22, 6);
      ctx.stroke();
      // Knuckle spikes
      ctx.fillStyle = '#ffcc44';
      for (let ki = 0; ki < 4; ki++) {
        ctx.beginPath();
        ctx.arc(-6 + ki * 8, -12, 4, Math.PI, 0);
        ctx.fill();
      }
      // Inner glow
      ctx.globalAlpha = 0.6;
      ctx.fillStyle   = '#cc88ff';
      ctx.beginPath();
      ctx.arc(3, 1, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

    } else if (k === 'voidblade') {
      // Dark jagged blade with purple void energy
      ctx.save();
      ctx.shadowColor = '#9933ff'; ctx.shadowBlur = 16;
      // Blade body — dark purple
      ctx.fillStyle = '#440088';
      ctx.beginPath();
      ctx.moveTo(0, -3); ctx.lineTo(26, -1); ctx.lineTo(30, 1);
      ctx.lineTo(26, 3); ctx.lineTo(0, 2); ctx.closePath();
      ctx.fill();
      // Void cracks on blade
      ctx.strokeStyle = '#bb44ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(12, -2); ctx.lineTo(18, 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(24, -1); ctx.stroke();
      // Edge glow
      ctx.strokeStyle = '#9933ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(30, 0); ctx.lineTo(0, 2); ctx.stroke();
      ctx.restore();

    } else if (k === '_godslayer') {
      ctx.save();
      const gsPulse = 0.5 + 0.5 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.1);
      ctx.shadowColor = '#ffe888';
      ctx.shadowBlur  = 20 + gsPulse * 16;
      // Blade gradient — divine gold/white metal
      ctx.beginPath();
      ctx.moveTo(0, -2.8); ctx.lineTo(31, -0.9); ctx.lineTo(35, 0);
      ctx.lineTo(31,  0.9); ctx.lineTo(0,  2.8); ctx.closePath();
      const gsGr = ctx.createLinearGradient(0, 0, 35, 0);
      gsGr.addColorStop(0,   '#fffde8');
      gsGr.addColorStop(0.28, '#ffe866');
      gsGr.addColorStop(0.72, '#ffcc22');
      gsGr.addColorStop(1,   'rgba(255,200,60,0)');
      ctx.fillStyle = gsGr;
      ctx.fill();
      // Bright edge
      ctx.strokeStyle = 'rgba(255,255,210,0.8)';
      ctx.lineWidth   = 0.7;
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.moveTo(0, -2.8); ctx.lineTo(35, 0); ctx.lineTo(0, 2.8);
      ctx.stroke();
      // Crossguard
      ctx.shadowBlur  = 12;
      ctx.shadowColor = '#ffaa00';
      const gsGuard = ctx.createLinearGradient(-2, -10, 3, 10);
      gsGuard.addColorStop(0, '#ffd040');
      gsGuard.addColorStop(0.5, '#ffee99');
      gsGuard.addColorStop(1, '#cc8800');
      ctx.fillStyle = gsGuard;
      ctx.beginPath(); ctx.roundRect(-2, -9, 5, 18, 2); ctx.fill();
      ctx.strokeStyle = '#ffe8aa'; ctx.lineWidth = 1; ctx.stroke();
      // Rune inscriptions on blade
      ctx.globalAlpha = 0.55 + gsPulse * 0.35;
      ctx.strokeStyle = 'rgba(255,250,200,0.9)';
      ctx.lineWidth   = 0.65;
      ctx.shadowBlur  = 5;
      ctx.shadowColor = '#fffacc';
      ctx.beginPath();
      ctx.moveTo(8, -1.6); ctx.lineTo(11, 0); ctx.lineTo(8, 1.6);
      ctx.moveTo(16, -1.6); ctx.lineTo(19, 0); ctx.lineTo(16, 1.6);
      ctx.moveTo(23, -1.2); ctx.lineTo(26, 0); ctx.lineTo(23, 1.2);
      ctx.stroke();
      // Glowing tip
      ctx.globalAlpha = 0.8 + gsPulse * 0.2;
      ctx.shadowColor = '#ffee55';
      ctx.shadowBlur  = 18 + gsPulse * 12;
      ctx.fillStyle   = '#fffde0';
      ctx.beginPath(); ctx.arc(34, 0, 2.8, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

    } else if (k === 'shockrifle') {
      // Sci-fi electric rifle — cyan + dark
      ctx.save();
      ctx.shadowColor = '#00ddff'; ctx.shadowBlur = 14;
      // Barrel
      ctx.fillStyle = '#113344';
      ctx.beginPath(); ctx.roundRect(0, -3, 28, 6, 2); ctx.fill();
      // Energy coils
      ctx.strokeStyle = '#00aacc'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(4, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(10, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16, -3); ctx.lineTo(16, 3); ctx.stroke();
      // Muzzle glow
      ctx.fillStyle = '#00eeff';
      ctx.beginPath(); ctx.arc(28, 0, 3, 0, Math.PI * 2); ctx.fill();
      // Grip
      ctx.fillStyle = '#224455';
      ctx.beginPath(); ctx.roundRect(-3, 0, 6, 10, 2); ctx.fill();
      ctx.restore();

    } else if (k === 'nullblade') {
      // Sovereign's signature weapon — slim geometric blade, dark metal + deep-red edge glow
      ctx.save();
      const nbPulse = 0.5 + 0.5 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.14);
      ctx.shadowColor = '#cc2200';
      ctx.shadowBlur  = attacking ? 18 + nbPulse * 10 : 7 + nbPulse * 5;
      // Main blade body — near-black steel with slight dark-red tint
      ctx.beginPath();
      ctx.moveTo(0, -2.5);
      ctx.lineTo(28, -0.8);
      ctx.lineTo(32,  0);
      ctx.lineTo(28,  0.8);
      ctx.lineTo(0,   2.5);
      ctx.closePath();
      const nbGrad = ctx.createLinearGradient(0, 0, 32, 0);
      nbGrad.addColorStop(0,   '#1a0808');
      nbGrad.addColorStop(0.45, '#2d0d0d');
      nbGrad.addColorStop(1,   'rgba(80,10,10,0)');
      ctx.fillStyle = nbGrad;
      ctx.fill();
      // Edge line — single bright red stroke on the upper edge
      ctx.strokeStyle = `rgba(220,40,0,${(0.55 + nbPulse * 0.30).toFixed(2)})`;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(32, 0); ctx.stroke();
      // Thin fuller groove down the centre
      ctx.strokeStyle = `rgba(180,20,0,${(0.28 + nbPulse * 0.18).toFixed(2)})`;
      ctx.lineWidth   = 0.6;
      ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(26, 0); ctx.stroke();
      // Crossguard — two minimal prongs
      ctx.fillStyle = '#2a0808';
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.roundRect(-2, -7, 4, 14, 1); ctx.fill();
      ctx.strokeStyle = '#cc2200'; ctx.lineWidth = 0.8;
      ctx.strokeRect(-2, -7, 4, 14);
      // Glowing tip
      ctx.globalAlpha = 0.6 + nbPulse * 0.35;
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur  = 12 + nbPulse * 8;
      ctx.fillStyle   = '#ff4422';
      ctx.beginPath(); ctx.arc(32, 0, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.restore();   // ends the facing mirror opened before the art chain
    ctx.restore();   // ends the weapon transform (translate to hand + arm rotation)

    // Everything below is a fighter overlay in WORLD coordinates (this.cx(), this.y).
    // It used to sit inside the weapon transform above, which rotated and translated
    // it by the arm — e.g. the bow's ammo dots asked for (317, 288) and landed near
    // (132, 953), off the bottom of the canvas. That silently hid the ammo dots, the
    // ranged cooldown bar, the invincibility ring, the echo tint and the Damnation
    // scar trail. Keep these after the restore above.

    // ── Ranged cooldown bar (ranged weapons WITHOUT clipSize) ─────────────────
    if (this.weapon && this.weapon.type === 'ranged' && !this.weapon.clipSize &&
        this.state !== 'dead' && this.state !== 'ragdoll') {
      const barW = 36, barH = 4;
      const bx = this.cx() - barW / 2, by = this.y - 22;
      const cd = this.weapon.cooldown || 1;
      const pct = this.cooldown > 0 ? Math.max(0, 1 - this.cooldown / cd) : 1;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = pct >= 1 ? '#44ffaa' : '#ffcc44';
      ctx.fillRect(bx, by, barW * pct, barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, barW, barH);
      // Label "READY" when full
      if (pct >= 1) {
        ctx.font = 'bold 6.5px Arial';
        ctx.fillStyle = '#44ffaa';
        ctx.textAlign = 'center';
        ctx.fillText('READY', this.cx(), by - 1);
      }
      ctx.restore();
    }

    // ── Ammo indicator (ranged weapons with clipSize) ─────────────────────────
    // Always drawn just above the fighter's head, capped to 32px max spread.
    if (this.weapon && this.weapon.clipSize && this.state !== 'dead' && this.state !== 'ragdoll') {
      const clip  = this.weapon.clipSize;
      const ammo  = this._ammo;
      // Scale dot size down for large clips so the bar never exceeds 32px wide
      const maxW  = 32;
      const dotR  = Math.min(3.5, maxW / (clip * 2.6));
      const gap   = dotR * 2.6;
      const totalW = (clip - 1) * gap;
      const startX = this.cx() - totalW / 2;
      // Fixed position: just above the fighter's head, independent of clip width
      const dotY   = this.y - 12;
      if (this._reloadTimer > 0) {
        // Reloading: compact arc ring centred on the fighter
        const progress = 1 - this._reloadTimer / this.weapon.reloadFrames;
        const arcR = Math.min(10, totalW / 2 + dotR + 2);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.arc(this.cx(), dotY, arcR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.arc(this.cx(), dotY, arcR, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        // Show bullet dots: filled = loaded, hollow = spent
        for (let i = 0; i < clip; i++) {
          const dx = startX + i * gap;
          ctx.beginPath();
          ctx.arc(dx, dotY, dotR, 0, Math.PI * 2);
          if (i < ammo) {
            ctx.fillStyle = '#ffdd44';
            ctx.fill();
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth   = 1;
            ctx.stroke();
          }
        }
      }
    }

    // ── Invincibility / I-frame shield indicator ──────────────────────────────
    // Show a translucent pulsing shield when the fighter is invincible (spawn
    // grace, post-hit recovery, etc.) but NOT when they're in permanent godmode
    // (invincible === 9999 AND health is full — that's the training designer state).
    const _isPermInvincible = this.invincible >= 9999 && this.health >= this.maxHealth;
    if (this.invincible > 0 && !_isPermInvincible &&
        this.state !== 'dead' && this.state !== 'ragdoll') {
      const _pulse = 0.35 + 0.25 * Math.sin(frameCount * 0.28);
      ctx.save();
      // Outer glow ring
      ctx.globalAlpha = _pulse * 0.55;
      ctx.strokeStyle = '#88ddff';
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.ellipse(this.cx(), this.cy() - 4, this.w * 0.8, this.h * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Translucent fill
      ctx.globalAlpha = _pulse * 0.18;
      ctx.fillStyle   = '#aaddff';
      ctx.fill();
      // Small shield icon above head
      ctx.globalAlpha = _pulse * 0.75;
      ctx.fillStyle   = '#88ddff';
      ctx.font        = '9px Arial';
      ctx.textAlign   = 'center';
      ctx.fillText('🛡', this.cx(), this.y - 35);
      ctx.restore();
    }

    // ── Echo red tint (Damnation arc) ─────────────────────────────
    if (this.isEcho && damnationActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle   = '#ff2200';
      ctx.fillRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8);
      ctx.restore();
    }

    // ── Damnation scar ghost trail (player who survived the loop) ─
    if (this._hasDamnationScar && !this.isEcho) {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#cc2200';
      ctx.fillRect(this.x - 3, this.y - 3, this.w + 6, this.h + 6);
      ctx.restore();
    }
  }
}
