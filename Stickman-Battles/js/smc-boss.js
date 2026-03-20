'use strict';

// ============================================================
// BOSS  (special Fighter — 3× HP, gauntlet weapon, ½ cooldowns)
// ============================================================
class Boss extends Fighter {
  constructor() {
    const noCtrl = { left:null, right:null, jump:null, attack:null, ability:null, super:null };
    super(450, 200, '#cc00ee', 'gauntlet', noCtrl, true, 'hard');
    this.name           = 'CREATOR';
    this.health         = 3000;
    this.maxHealth      = 3000;
    this.w              = 33;   // double Fighter hitbox width
    this.h              = 90;  // double Fighter hitbox height
    this.drawScale      = 1.5;    // visual 2× scale in draw()
    this.isBoss         = true;
    this.lives          = 1;
    this.spawnX         = 450;
    this.spawnY         = 200;
    this.playerNum      = 2;
    // Boss combat modifiers
    this.kbResist       = 0.5;  // takes half knockback
    this.kbBonus        = 1.5;  // deals 1.5x knockback
    this.attackCooldownMult = 0.5;
    this.superChargeRate = 1.7;   // charges super 1.7× faster
    // Gauntlet weapon (single weapon only)
    this.weaponKey      = 'gauntlet';
    this.weapon         = WEAPONS['gauntlet'];
    // NOTE: all cooldowns below are in AI TICKS (updateAI runs every 15 frames).
    // 1 AI tick = 15 frames. To get seconds: ticks × 15 / 60.
    // Minion spawning
    this.minionCooldown = 20;   // 20 ticks = 300 frames = ~5 s initial
    // Beam attacks
    this.beamCooldown   = 28;   // 28 ticks = 420 frames = ~7 s initial
    // Teleport
    this.teleportCooldown = 0;
    this.teleportMaxCd    = 60; // 60 ticks = 900 frames = ~15 s
    this.postTeleportCrit = 0;
    this.forcedTeleportFlash = 0;
    // Spike attacks
    this.spikeCooldown  = 24;   // 24 ticks = 360 frames = ~6 s initial
    // Post-special pause (in AI ticks; 1 tick ≈ 0.25 s)
    this.postSpecialPause = 0;
    // Monologue tracking
    this.phaseDialogueFired = new Set();
    this._maxLives          = 1; // boss shows phase indicator, not hearts
    this._lastPhase         = 1; // track phase transitions for animation triggers
    // Aggression system + player intelligence
    this._idleTicks       = 0;   // forces a special after 12 ticks (3s)
    this._runAwayTicks    = 0;   // tracks player fleeing behaviour
    this._stillTimer      = 0;   // tracks player standing still
    this._lastTargetX     = -999;
    // New special cooldowns
    this._gravPulseCd     = 0;   // Gravity Pulse
    this._stormCd         = 0;   // Meteor Storm
    this._groundSlamCd    = 0;   // Ground Slam
    // Pending (deferred) attacks — set warning, delay damage by N frames
    this._pendingGroundSlam = null; // { timer, x, y }
    this._pendingGravPulse  = null; // { timer }
    this._prevHealth        = 3000; // for stagger accumulation tracking
    this._cinematicFired    = new Set(); // HP-threshold mid-fight cinematics already triggered
  }

  getPhase() {
    if (this.health > 2000) return 1;   // > 66% HP (>2000 of 3000)
    if (this.health > 1000) return 2;   // 33–66% HP (1000–2000)
    return 3;                            // < 33% HP (<1000)
  }

  // Override attack: gauntlet melee only, half cooldowns
  attack(target) {
    if (this.backstageHiding) return;
    if (this.postPortalAttackBlock > 0) return; // can't attack for 1s after portal exit
    if (this.cooldown > 0 || this.health <= 0 || this.stunTimer > 0 || this.ragdollTimer > 0) return;
    // Gauntlet is melee-only — start swing, damage delivered via weapon-tip hitbox
    if (dist(this, target) < this.weapon.range * 1.4) { this.weaponHit = false; this.swingHitTargets.clear(); }
    this.cooldown    = Math.max(1, Math.ceil(this.weapon.cooldown * (this.attackCooldownMult || 0.5)));
    this.attackTimer = this.attackDuration;
  }

  // Override ability: half cooldown + 1.5s post-special pause
  ability(target) {
    if (this.postPortalAttackBlock > 0) return; // can't use ability for 1s after portal exit
    if (this.abilityCooldown > 0 || this.health <= 0 || this.stunTimer > 0 || this.ragdollTimer > 0) return;
    this.weapon.ability(this, target);
    this.abilityCooldown  = Math.max(1, Math.ceil(this.weapon.abilityCooldown * (this.attackCooldownMult || 0.5)));
    this.attackTimer      = this.attackDuration * 2;
    this.postSpecialPause = 3; // 3 ticks = 45 frames = 0.75s pause after void slam ability
  }

  // Override AI: phase-based, more aggressive, respects shield cooldown
  updateAI() {
    if (activeCinematic) return; // freeze during cinematic moments
    if (this.aiReact > 0) { this.aiReact--; return; }
    if (this.ragdollTimer > 0 || this.stunTimer > 0) return;
    if (bossStaggerTimer > 0) return; // stunned — vulnerability window
    // Post-special pause: boss moves but doesn't attack for 1.5s after specials
    if (this.postSpecialPause > 0) this.postSpecialPause--;
    const canAct = this.postSpecialPause <= 0;

    if (this.target && !activeCinematic && typeof this._dominanceMoment === 'function') {
      this._dominanceMoment(this.target);
    }

    // In 2P boss mode, always target the nearest alive human player
    if (gameMode === 'boss' && bossPlayerCount === 2) {
      let nearDist = Infinity, nearP = null;
      for (const p of players) {
        if (p.isBoss || p.health <= 0) continue;
        const d2 = dist(this, p);
        if (d2 < nearDist) { nearDist = d2; nearP = p; }
      }
      if (nearP) this.target = nearP;
    }

    const phase   = this.getPhase();
    // Phase transition animations
    if (phase > this._lastPhase) {
      this._lastPhase = phase;
      if (settings.screenShake) screenShake = Math.max(screenShake, 20);
      if (settings.phaseFlash)  bossPhaseFlash = 50;
      this.postSpecialPause = Math.max(this.postSpecialPause, 8); // 8 ticks = 120 frames = 2s cinematic pause
      triggerPhaseTransition(this, phase);
    }

    // ── Mid-fight HP cinematics ───────────────────────────────
    const _hpPct = this.health / this.maxHealth;
    if (!this._cinematicFired.has('75') && _hpPct <= 0.75) {
      this._cinematicFired.add('75');
      this.postSpecialPause = Math.max(this.postSpecialPause, 14);
      startCinematic(_makeBossWarning75Cinematic(this));
      return;
    }
    if (!this._cinematicFired.has('40') && _hpPct <= 0.40) {
      this._cinematicFired.add('40');
      this.postSpecialPause = Math.max(this.postSpecialPause, 16);
      startCinematic(_makeBossRage40Cinematic(this));
      return;
    }
    if (!this._cinematicFired.has('10') && _hpPct <= 0.10) {
      this._cinematicFired.add('10');
      this.postSpecialPause = Math.max(this.postSpecialPause, 14);
      startCinematic(_makeBossDesp10Cinematic(this));
      return;
    }

    // Phase-based stats — hyper aggressive, always pressing attack
    const spd     = phase === 3 ? 6.8 : phase === 2 ? 5.8 : 5.0;
    const atkFreq = phase === 3 ? 0.95 : phase === 2 ? 0.80 : 0.60;
    const abiFreq = phase === 3 ? 0.18 : phase === 2 ? 0.10 : 0.05;

    // Count down post-teleport crit window and attack block
    if (this.postTeleportCrit > 0) this.postTeleportCrit--;
    if (this.postPortalAttackBlock > 0) this.postPortalAttackBlock--;
    if (this.forcedTeleportFlash > 0) this.forcedTeleportFlash--;

    const t  = this.target;
    if (!t || t.health <= 0) return;
    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = dx > 0 ? 1 : -1;

    // Lava / void floor — flee toward elevated platforms
    if (currentArena.hasLava) {
      const distToLava = currentArena.lavaY - (this.y + this.h);
      if (distToLava < 110) {
        if (this.onGround) {
          this.vy = -19; this.vx = this.cx() < GAME_W/2 ? spd*2.2 : -spd*2.2;
        } else {
          let nearX = GAME_W/2, nearDist = Infinity;
          for (const pl of currentArena.platforms) {
            if (pl.y < this.y && !pl.isFloorDisabled) {
              const pdx = Math.abs(pl.x + pl.w/2 - this.cx());
              if (pdx < nearDist) { nearDist = pdx; nearX = pl.x + pl.w/2; }
            }
          }
          this.vx = nearX > this.cx() ? spd*2 : -spd*2;
        }
        return;
      }
    }

    // Flee floor during void warning/hazard
    const floorDanger = currentArena.isBossArena &&
      (bossFloorState === 'hazard' || (bossFloorState === 'warning' && bossFloorTimer < 90)) &&
      this.y + this.h > 440;
    if (floorDanger && this.onGround) {
      const above = this.platformAbove();
      if (above) { this.vy = -18; this.vx = (above.x + above.w/2 - this.cx()) > 0 ? spd*1.5 : -spd*1.5; }
      return;
    }

    // ── Player intelligence ──────────────────────────────────
    const playerMoved = Math.abs(t.cx() - this._lastTargetX) > 8;
    this._stillTimer  = playerMoved ? 0 : this._stillTimer + 1;
    this._lastTargetX = t.cx();

    const playerFleeing = (dx > 0 && t.vx > 1) || (dx < 0 && t.vx < -1);
    const playerFar     = d > 280;
    this._runAwayTicks  = (playerFleeing && playerFar) ? this._runAwayTicks + 1
                                                        : Math.max(0, this._runAwayTicks - 2);

    // ── Tick new special cooldowns ────────────────────────────
    if (this._gravPulseCd  > 0) this._gravPulseCd--;
    if (this._stormCd      > 0) this._stormCd--;
    if (this._groundSlamCd > 0) this._groundSlamCd--;

    // ── Aggression timer — force a special every 3 s of idle ─
    this._idleTicks++;
    const cdScale      = phase === 3 ? 0.55 : phase === 2 ? 0.75 : 1.0;
    const specialFreq  = phase === 3 ? 0.10 : phase === 2 ? 0.055 : 0.025;
    const fullD_pre    = dist(this, t);
    if (canAct && (this._idleTicks >= 12 || Math.random() < specialFreq)) {
      const fired = this._bossFireSpecial(phase, t, d, fullD_pre, cdScale);
      if (fired) { this._idleTicks = 0; this.postSpecialPause = Math.max(this.postSpecialPause, 3); return; }
      if (this._idleTicks >= 12) this._idleTicks = 8; // nothing available yet — back off slightly
    }

    // State machine — use horizontal distance for attack range (boss should attack even when player jumps above)
    const fullD = fullD_pre;
    if (d < this.weapon.range * 3.5) this.aiState = 'attack'; // wide horizontal trigger
    else if (this.health < 120 && fullD > 160 && Math.random() < 0.008) this.aiState = 'evade';
    else this.aiState = 'chase';

    // Reactive shield (respects cooldown) — responds to both attacks AND incoming bullets
    if (this.shieldCooldown === 0) {
      const incomingBullet = projectiles.some(pr =>
        pr.owner !== this && Math.hypot(pr.x - this.cx(), pr.y - this.cy()) < 160 &&
        ((pr.vx > 0 && pr.x < this.cx()) || (pr.vx < 0 && pr.x > this.cx()))
      );
      if ((t.attackTimer > 0 && d < 150) || incomingBullet) {
        if (Math.random() < (phase === 3 ? 0.55 : 0.35)) {
          this.shielding = true;
          this.shieldCooldown = Math.ceil(SHIELD_CD * 0.5);
          setTimeout(() => { this.shielding = false; }, 350);
        }
      }
    }

    // Dodge bullets by jumping
    for (const pr of projectiles) {
      if (pr.owner === this) continue;
      const pd = Math.hypot(pr.x - this.cx(), pr.y - this.cy());
      if (pd < 130 && this.onGround && Math.random() < (phase >= 2 ? 0.35 : 0.20)) {
        this.vy = -18;
        break;
      }
    }

    const edgeDanger = this.isEdgeDanger(dir);

    // If player is significantly below boss, walk off platform edge to chase them down
    const playerBelow = t.y > this.y + this.h + 30;
    if (playerBelow && this.onGround && Math.abs(dx) < 120 && Math.random() < 0.08) {
      this.vx = dir * spd; // walk toward edge so we fall off
    }

    switch (this.aiState) {
      case 'chase':
        if (!edgeDanger || playerBelow) this.vx = dir * spd;
        else { this.vx = 0; if (this.onGround && this.platformAbove() && Math.random() < 0.10) this.vy = -18; }
        // Jump toward target on platforms above
        if (this.onGround && t.y + t.h < this.y - 40 && !edgeDanger && Math.random() < 0.10) this.vy = -19;
        // Double jump in air to reach elevated targets
        if (!this.onGround && this.canDoubleJump && t.y + t.h < this.y - 20 && this.vy > -4 && Math.random() < 0.35) {
          this.vy = -18; this.canDoubleJump = false;
        }
        break;
      case 'attack':
        // Keep pressure on — always creep toward target even while attacking
        if (d < 45) this.vx *= 0.78;
        else        this.vx = dir * spd * 0.7;
        if (canAct && Math.random() < atkFreq)       this.attack(t);
        if (canAct && Math.random() < abiFreq)       this.ability(t);
        if (canAct && this.superReady && Math.random() < (phase === 3 ? 0.22 : 0.14)) this.useSuper(t);
        if (this.onGround && t.y + t.h < this.y - 25 && !edgeDanger && Math.random() < 0.12) this.vy = -18;
        // Double jump during attack to stay on top of target
        if (!this.onGround && this.canDoubleJump && t.y + t.h < this.y - 15 && this.vy > -3 && Math.random() < 0.40) {
          this.vy = -17; this.canDoubleJump = false;
        }
        // Guaranteed attack burst when directly adjacent
        if (canAct && d < this.weapon.range + 10 && this.cooldown <= 0) this.attack(t);
        break;
      case 'evade': {
        const eDir  = -dir;
        const eEdge = this.isEdgeDanger(eDir);
        if (!eEdge) this.vx = eDir * spd * 1.2;
        else if (canAct && Math.random() < atkFreq)  this.attack(t);
        if (canAct && Math.random() < atkFreq * 0.5) this.attack(t);
        break;
      }
    }

    // Phase 2+ bonus: extra aggression
    if (phase >= 2) {
      if (this.onGround && !edgeDanger && Math.random() < 0.025) this.vy = -17;
      if (canAct && Math.random() < 0.055) this.attack(t);
    }
    // Phase 3 bonus: burst attacks every frame when adjacent
    if (phase === 3) {
      if (this.onGround && !edgeDanger && Math.random() < 0.030) this.vy = -18;
      if (canAct && this.cooldown <= 0 && d < this.weapon.range * 2) this.attack(t);
    }

    // Teleport (phase 2+) — NOT blocked by postSpecialPause
    if (phase >= 2) {
      if (this.teleportCooldown > 0) {
        this.teleportCooldown--;
      } else {
        if (!this.backstageHiding) bossTeleport(this);
        this.teleportCooldown = phase === 3 ? 28 : 60; // 28 ticks=7s, 60 ticks=15s
      }
    }

    // Ability more often when target is close
    if (canAct && t && dist(this, t) < 150 && Math.random() < 0.09) this.ability(t);

    // Boss leads attacks when player moves toward it
    if (canAct && t && t.vx !== 0) {
      const playerMovingToward = (t.cx() < this.cx() && t.vx > 0) || (t.cx() > this.cx() && t.vx < 0);
      if (playerMovingToward && dist(this, t) < this.weapon.range * 2 && Math.random() < 0.15) {
        this.attack(t);
      }
    }

    // Spike attacks — Phase 3 ONLY (ground spells)
    if (phase >= 3) {
      if (this.spikeCooldown > 0) {
        this.spikeCooldown--;
      } else if (canAct && t) {
        const numSpikes = 5;
        for (let i = 0; i < numSpikes; i++) {
          const sx = clamp(t.cx() + (i - Math.floor(numSpikes / 2)) * 40, 20, 880);
          bossSpikes.push({ x: sx, maxH: 90 + Math.random() * 50, h: 0, phase: 'rising', stayTimer: 0, done: false });
        }
        this.spikeCooldown = 24; // in AI ticks
        this.postSpecialPause = 4;
        showBossDialogue(randChoice(['Rise!', 'The ground betrays you!', 'Watch your feet!', 'From below!']));
      }
    }

    // Minion spawning — Phase 2+ ONLY
    if (phase >= 2) {
      if (this.minionCooldown > 0) {
        this.minionCooldown--;
      } else if (minions.filter(m => m.health > 0).length < (phase >= 3 ? 2 : 1)) {
        const spawnX = Math.random() < 0.5 ? 60 : 840;
        const spawnY = 200;
        const mn     = new Minion(spawnX, spawnY);
        mn.target    = players[0];
        minions.push(mn);
        spawnParticles(spawnX, spawnY, '#bb00ee', 24);
        if (settings.screenShake) screenShake = Math.max(screenShake, 12);
        this.minionCooldown = phase === 3 ? 20 : 36; // in AI ticks
        showBossDialogue(randChoice(['Deal with my guests!', 'MINIONS, arise!', 'Handle this!', 'You\'ll need backup...']));
      }
    }

    // Beam attacks — Phase 2+ ONLY
    if (phase >= 2) {
      if (this.beamCooldown > 0) {
        this.beamCooldown--;
      } else if (canAct && t) {
        const numBeams = phase === 3 ? 4 : 2;
        for (let i = 0; i < numBeams; i++) {
          const spread = (i - Math.floor(numBeams / 2)) * 95;
          const bx = clamp(t.cx() + spread + (Math.random() - 0.5) * 70, 40, 860);
          bossBeams.push({ x: bx, warningTimer: 300, activeTimer: 0, phase: 'warning', done: false });
        }
        this.beamCooldown = phase === 3 ? 16 : 28; // in AI ticks
        this.postSpecialPause = 4;
        showBossDialogue(randChoice(['Nowhere to hide!', 'Feel the void!', 'Dodge THIS!', 'From below!', 'The light will take you!']));
      }
    }

    // HP-threshold monologue (fires once per threshold crossing) — scaled for 3000 HP
    const hpLines = [
      { hp: 2999, text: 'I have taught you everything you know, but not everything I know — bring it on!' },
      { hp: 2600, text: 'Ha. You tickle.' },
      { hp: 2200, text: 'Interesting... you\'re persistent.' },
      { hp: 2000, text: 'Phase two begins. This is where it gets real.' },
      { hp: 1600, text: 'I\'m just warming up.' },
      { hp: 1200, text: 'Fine. No more holding back!' },
      { hp: 1000, text: 'PHASE THREE. Feel my full power!' },
      { hp: 600,  text: 'You\'re stronger than I thought...' },
      { hp: 300,  text: 'Impossible... HOW?!' },
      { hp: 100,  text: 'I... WILL NOT... FALL HERE!' },
    ];
    for (const { hp, text } of hpLines) {
      if (this.health <= hp && !this.phaseDialogueFired.has(hp)) {
        this.phaseDialogueFired.add(hp);
        showBossDialogue(text, 280);
        break; // one at a time
      }
    }

    if (Math.random() < 0.025) this.aiReact = 2; // tighter reaction window than base AI
  }

  // ── Distance-routed special selector ──────────────────────────────────────
  // Returns true if a special was fired.
  _bossFireSpecial(phase, t, d, fullD, cdScale) {
    const playerEdge  = t.x < 130 || t.x + t.w > GAME_W - 130;
    const playerAir   = !t.onGround;
    const playerStill = this._stillTimer > 8;
    const fleeing     = this._runAwayTicks > 5;

    // ── Close range (< 130 px): Ground Slam — DEFERRED with telegraph ────────
    if (d < 130 && this._groundSlamCd <= 0 && !this._pendingGroundSlam) {
      this._groundSlamCd = Math.ceil(18 * cdScale);
      // Telegraph: pulsing red AOE circle + spike floor markers (45 frames ≈ 0.75s)
      const slamX = this.cx(), slamY = this.y + this.h;
      bossWarnings.push({ type: 'circle', x: slamX, y: slamY, r: 160,
        color: '#ff2200', timer: 45, maxTimer: 45, label: 'SLAM!' });
      // Show spike warning dots on floor ahead of time
      for (let i = 0; i < 6; i++) {
        const sx = clamp(slamX + (i - 2.5) * 55, 20, 880);
        bossWarnings.push({ type: 'spike_warn', x: sx, y: 460, r: 12,
          color: '#ff6600', timer: 45, maxTimer: 45 });
      }
      this._pendingGroundSlam = { timer: 45, x: slamX, y: slamY };
      showBossDialogue(randChoice(['SHATTER!', 'The ground breaks!', 'SLAM!', 'Feel the impact!']), 150);
      if (typeof directorAddIntensity === 'function') directorAddIntensity(0.15);
      return true;
    }

    // ── Medium range (130–300 px): Gravity Pulse — DEFERRED with telegraph ───
    if (d >= 80 && d < 320 && this._gravPulseCd <= 0 && !this._pendingGravPulse) {
      this._gravPulseCd = Math.ceil(28 * cdScale);
      // Telegraph: expanding purple pull-radius ring (40 frames ≈ 0.67s)
      bossWarnings.push({ type: 'circle', x: this.cx(), y: this.cy(), r: 350,
        color: '#9900cc', timer: 40, maxTimer: 40, label: 'GRAVITY PULL!' });
      // Inner ring at boss to show pull origin
      bossWarnings.push({ type: 'circle', x: this.cx(), y: this.cy(), r: 60,
        color: '#cc66ff', timer: 40, maxTimer: 40 });
      this._pendingGravPulse = { timer: 40, edge: false };
      showBossDialogue(randChoice(['Come closer.', 'You cannot run.', 'GRAVITY PULSE!', 'The void calls.']), 180);
      if (typeof directorAddIntensity === 'function') directorAddIntensity(0.14);
      return true;
    }

    // ── Far range / player fleeing: Meteor Storm ─────────────
    if ((d >= 250 || fleeing) && phase >= 2 && this._stormCd <= 0) {
      this._stormCd = Math.ceil(32 * cdScale);
      const count = phase === 3 ? 8 : 5;
      const safeCount = phase === 3 ? 1 : 2;
      // Pick random safe zone positions that don't overlap beams
      const safePositions = [];
      for (let s = 0; s < safeCount; s++) {
        safePositions.push(120 + Math.random() * (GAME_W - 240));
      }
      for (let i = 0; i < count; i++) {
        let bx;
        // Avoid placing beams on safe zones
        do { bx = 60 + Math.random() * (GAME_W - 120); }
        while (safePositions.some(sx => Math.abs(bx - sx) < 80));
        bossBeams.push({ x: bx, warningTimer: 240, activeTimer: 0, phase: 'warning', done: false });
      }
      // Register safe zones so beam damage is skipped inside them
      for (const sx of safePositions) {
        bossMetSafeZones.push({ x: sx, y: 380, r: 70, timer: 240 + 110, maxTimer: 240 + 110 });
      }
      screenShake = Math.max(screenShake, 14);
      showBossDialogue(randChoice(['METEOR STORM!', 'Nowhere is safe.', 'Rain of destruction!', 'JUDGMENT FALLS!']), 220);
      if (typeof directorAddIntensity === 'function') directorAddIntensity(0.20);
      return true;
    }

    // ── Situational: player standing still → teleport behind ─
    if (playerStill && phase >= 2 && this.teleportCooldown <= 0 && !this.backstageHiding) {
      bossTeleport(this);
      this.teleportCooldown = phase === 3 ? 20 : 40;
      showBossDialogue('Too easy a target.', 160);
      return true;
    }

    // ── Situational: player at edge → Gravity Pulse (deferred) ──────────────
    if (playerEdge && this._gravPulseCd <= 0 && !this._pendingGravPulse) {
      this._gravPulseCd = Math.ceil(28 * cdScale);
      bossWarnings.push({ type: 'circle', x: this.cx(), y: this.cy(), r: 350,
        color: '#9900cc', timer: 40, maxTimer: 40, label: 'GRAVITY PULL!' });
      this._pendingGravPulse = { timer: 40, edge: true };
      spawnParticles(this.cx(), this.cy(), '#9900cc', 20);
      screenShake = Math.max(screenShake, 14);
      showBossDialogue('You cannot hide at the edges.', 180);
      if (typeof directorAddIntensity === 'function') directorAddIntensity(0.12);
      return true;
    }

    return false;
  }

  _dominanceMoment(target) {
    if (!target || target.health <= 0) return;
    if ((this._dominanceCd || 0) > 0) { this._dominanceCd--; return; }
    if (this._inDominance) return;

    const hpPct = this.health / this.maxHealth;
    const atPhase2 = hpPct < 0.67 && !this._dom2Fired;
    const atPhase3 = hpPct < 0.33 && !this._dom3Fired;
    const playerClose = Math.abs(target.cx() - this.cx()) < 130 && target.attackTimer > 0;

    if (!atPhase2 && !atPhase3 && !playerClose) return;
    if (atPhase2) this._dom2Fired = true;
    if (atPhase3) this._dom3Fired = true;

    this._inDominance = true;
    this._dominanceCd = 1200;

    const _self = this;
    if (typeof directorSchedule === 'function') {
      directorSchedule([
        {
          id: 'dom_freeze', delay: 0,
          condition: () => gameRunning,
          action: () => {
            _self.vx = 0; _self.vy = 0;
            if (typeof slowMotion !== 'undefined') slowMotion = 0.32;
            if (typeof hitStopFrames !== 'undefined') hitStopFrames = 6;
            if (typeof showBossDialogue === 'function') showBossDialogue(_self._domLine(), 110);
            if (typeof setCameraDrama === 'function') setCameraDrama('focus', 85, _self, 1.28);
            if (typeof SoundManager !== 'undefined' && SoundManager.phaseUp) SoundManager.phaseUp();
          }
        },
        {
          id: 'dom_teleport', delay: 50,
          condition: () => gameRunning && target.health > 0,
          action: () => {
            if (typeof slowMotion !== 'undefined') slowMotion = 1.0;
            const _behindX = target.cx() + target.facing * -80;
            _self.x = Math.max(20, Math.min(GAME_W - _self.w - 20, _behindX - _self.w / 2));
            if (typeof spawnParticles === 'function') spawnParticles(_self.cx(), _self.cy(), '#cc44ff', 18);
            _self.facing = target.cx() < _self.cx() ? -1 : 1;
          }
        },
        {
          id: 'dom_strike', delay: 8,
          condition: () => gameRunning && target.health > 0,
          action: () => {
            if (typeof setCameraDrama === 'function') setCameraDrama('impact', 22);
            _self.attack(target);
            if (typeof screenShakeIntensity !== 'undefined') screenShakeIntensity = 9;
          }
        },
        {
          id: 'dom_end', delay: 45,
          condition: () => true,
          action: () => { _self._inDominance = false; }
        }
      ]);
    } else {
      // Fallback if director not available
      setTimeout(() => { this._inDominance = false; }, 2000);
    }
  }

  _domLine() {
    const lines = [
      '"Did you think I wasn\'t watching?"',
      '"This is where it ends."',
      '"You\'ve barely scratched me."',
      '"Enough of this."',
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
}

// ============================================================
// BACKSTAGE PORTAL HELPERS
// ============================================================
function openBackstagePortal(cx, cy, type) {
  const words = ['if','for','let','const','function','return','true','false','null',
                 '&&','||','=>','{','}','()','0','1','new','this','class','extends',
                 'import','export','while','switch','break','typeof','void'];
  const chars = [];
  for (let _i = 0; _i < 35; _i++) {
    chars.push({
      x:     (Math.random() * 90) - 45,
      y:     (Math.random() * 160) - 80,
      char:  words[Math.floor(Math.random() * words.length)],
      speed: 0.6 + Math.random() * 1.8,
      alpha: 0.35 + Math.random() * 0.55,
      color: ['#00ff88','#00cc66','#88ffaa','#44ff00','#aaffaa','#ffffff'][Math.floor(Math.random()*6)]
    });
  }
  backstagePortals.push({ x: cx, y: cy, type, phase: 'opening', timer: 0, radius: 0, maxRadius: 58, codeChars: chars, done: false });
}

function drawBackstagePortals() {
  for (const bp of backstagePortals) {
    if (bp.done) continue;
    bp.timer++;
    if (bp.phase === 'opening') {
      bp.radius = bp.maxRadius * Math.min(1, (bp.timer / 35) * (bp.timer / 35) * 2);
      if (bp.timer >= 35) bp.phase = 'open';
    } else if (bp.phase === 'open') {
      bp.radius = bp.maxRadius;
      bp.openTimer = (bp.openTimer || 0) + 1;
      if (bp.openTimer >= 300) bp.phase = 'closing'; // auto-close after 5s
    } else if (bp.phase === 'closing') {
      bp.radius = Math.max(0, bp.radius - 2.8);
      if (bp.radius <= 0) { bp.done = true; continue; }
    }
    const rw = bp.radius * 0.55;
    const rh = bp.radius;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bp.x, bp.y, Math.max(0.1, rw), Math.max(0.1, rh), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000008';
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bp.x, bp.y, Math.max(0.1, rw - 2), Math.max(0.1, rh - 2), 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    for (const c of bp.codeChars) {
      c.y += c.speed;
      if (c.y > rh + 14) c.y = -rh - 14;
      ctx.globalAlpha = c.alpha * (bp.radius / bp.maxRadius);
      ctx.fillStyle   = c.color;
      ctx.fillText(c.char, bp.x + c.x - 28, bp.y + c.y);
    }
    ctx.restore();
    ctx.globalAlpha = bp.radius / bp.maxRadius;
    ctx.strokeStyle = '#cc00ff';
    ctx.lineWidth   = 3.5;
    ctx.shadowColor = '#9900ee';
    ctx.shadowBlur  = 22;
    ctx.beginPath();
    ctx.ellipse(bp.x, bp.y, Math.max(0.1, rw), Math.max(0.1, rh), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,0,255,0.4)';
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 8;
    for (let _i = 0; _i < 3; _i++) {
      const _sa = (frameCount * 0.04 + _i * 2.1) % (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, rw * (0.35 + _i * 0.18), _sa, _sa + Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.restore();
  }
  backstagePortals = backstagePortals.filter(bp => !bp.done);
}

// ============================================================
// BOSS TELEPORT
// ============================================================
function bossTeleport(boss, isForced = false) {
  if (!currentArena) return;
  const validPlatforms = currentArena.platforms.filter(pl => !pl.isFloor && !pl.isFloorDisabled);
  let target = validPlatforms.length > 0 ? randChoice(validPlatforms)
    : currentArena.platforms.find(pl => !pl.isFloorDisabled);

  let destX, destY;
  if (target) {
    destX = clamp(target.x + target.w / 2 - boss.w / 2, 0, GAME_W - boss.w);
    destY = target.y - boss.h - 2;
  } else {
    destX = GAME_W / 2 - boss.w / 2;
    destY = 200;
  }

  const oldX = boss.cx();
  const oldY = boss.cy();

  if (!isForced) {
    // === BACKSTAGE PORTAL TELEPORT (3-second animation) ===
    openBackstagePortal(oldX, oldY, 'entry');
    boss.backstageHiding = true;
    boss.invincible      = 9999;
    boss.teleportCooldown = 60; // 60 ticks = 900 frames = 15s (in AI ticks)
    boss.vx = 0;
    boss.vy = 0;
    // Move boss off-screen so it cannot hit players during the portal animation
    boss.x = -2000;
    boss.y = -2000;

    // t=1.5s: open exit portal at destination
    setTimeout(() => {
      if (!gameRunning) return;
      openBackstagePortal(destX + boss.w / 2, destY + boss.h / 2, 'exit');
    }, 1500);

    // t=2.5s: boss reappears
    setTimeout(() => {
      if (!gameRunning) return;
      boss.x = destX;
      boss.y = destY;
      boss.vx = 0;
      boss.vy = 0;
      boss.backstageHiding = false;
      boss.invincible      = 60;
      boss.postTeleportCrit = 120;        // 2s crit window
      boss.postPortalAttackBlock = 60;    // boss can't attack for 1s after portal exit
      showBossDialogue(randChoice(['Now you see me...', 'Try to follow me!', 'Blink!', 'You\'re too slow!']));
      // Close entry portal
      setTimeout(() => {
        for (const bp of backstagePortals) { if (bp.type === 'entry' && bp.phase === 'open') bp.phase = 'closing'; }
      }, 500);
      // Close exit portal
      setTimeout(() => {
        for (const bp of backstagePortals) { if (bp.type === 'exit'  && bp.phase === 'open') bp.phase = 'closing'; }
      }, 1200);
    }, 2500);

  } else {
    // Forced teleport: use portal animation (same as voluntary but faster — 1s total)
    openBackstagePortal(oldX, oldY, 'entry');
    boss.backstageHiding = true;
    boss.invincible      = 9999;
    boss.vx = 0; boss.vy = 0;
    boss.x = -2000; boss.y = -2000; // off-screen while animating
    spawnParticles(oldX, oldY, '#9900ee', 18);
    setTimeout(() => {
      if (!gameRunning) return;
      openBackstagePortal(destX + boss.w / 2, destY + boss.h / 2, 'exit');
    }, 600);
    setTimeout(() => {
      if (!gameRunning) return;
      boss.x = destX; boss.y = destY;
      boss.vx = 0; boss.vy = 0;
      boss.backstageHiding = false;
      boss.invincible = 60;
      boss.forcedTeleportFlash = 20;
      showBossDialogue('You really thought I would go down that easily?', 300);
    }, 1100);
  }
}

// ============================================================
// TRUE FORM  (secret final boss — player-sized, void arena only)
// ============================================================
class TrueForm extends Fighter {
  constructor() {
    const noCtrl = { left: null, right: null, jump: null, attack: null, ability: null, super: null };
    super(450, 350, '#000000', 'gauntlet', noCtrl, true, 'hard');
    // Override weapon to use a fist-style profile
    this.weapon = Object.assign({}, WEAPONS.gauntlet, {
      name: 'Fists', damage: 20, range: 48, cooldown: 16, kb: 7,
      contactDmgMult: 0,
      ability() {}
    });
    this.name          = 'TRUE FORM';
    this.health        = 5000;
    this.maxHealth     = 5000;
    this.w             = 18;
    this.h             = 50;
    this.isBoss        = true;
    this.isTrueForm    = true;
    this.lives         = 1;
    this.spawnX        = 450;
    this.spawnY        = 350;
    this.playerNum     = 2;
    this.color         = '#000000';
    this.kbResist      = 0.90;  // nearly no knockback — lowest in game
    this.kbBonus       = 0.55;  // deals low KB for tight combos
    this.attackCooldownMult = 0.45;
    this.superChargeRate    = 0; // no super meter
    this._tfSpeed      = 4.2;   // 1.3× normal fighter speed
    this._attackMode   = 'punch'; // alternates punch/kick
    // Combo tracking (max 4 hits, max 85% maxHP damage per combo)
    this._comboCount   = 0;
    this._comboDamage  = 0;
    this._comboTimer   = 0;
    // Special move cooldowns (in AI TICKS — updateAI runs every 15 frames)
    this._gravityCd    = 20;  // 20 ticks = 300 frames = 5s
    this._warpCd       = 40;  // 40 ticks = 600 frames = 10s
    this._holeCd       = 20;  // 5s
    this._floorCd      = 60;  // 60 ticks = 900 frames = 15s
    this._invertCd     = 24;  // 6s
    this._sizeCd       = 24;  // 6s
    this._portalCd     = 16;  // 4s
    // New attack cooldowns (AI ticks — 1 tick = 15 frames)
    this._graspCd      = 40;  // Void Grasp    — 10s
    this._slashCd      = 14;  // Reality Slash — 3.5s
    this._wellCd       = 30;  // Gravity Well  — 7.5s
    this._meteorCd     = 50;  // Meteor Crash  — 12.5s
    this._cloneCd      = 48;  // Shadow Clones — 12s
    this._chainCd      = 36;  // Chain Slam    — 9s
    this.postSpecialPause = 0;
    // Cosmic visual state
    this._floatT    = Math.random() * Math.PI * 2; // random phase so float doesn't start at apex
    this._trailPts  = []; // [{x, y, a}] — fading ghost silhouette trail
    this._lastPhase    = 1;
    this._maxLives     = 1;
    // Dodge mechanic
    this._justDodged   = false;
    this._dodgeTimer   = 0;
    // Anti-repeat and player intelligence
    this._lastSpecial     = null;
    this._lastLastSpecial = null;
    this._stillTimer      = 0;
    this._lastTargetX     = -999;
    // Aggression timer (forces a special after idle)
    this._idleTicks       = 0;
    // Running-away detection
    this._runAwayTicks    = 0;
    // Shockwave cooldown
    this._shockwaveCd     = 0;
    this._teleportComboCd = 0;  // Teleport Combo — 12s
    this._gravityCrushCd  = 0;  // Gravity Crush  — 15s
    // Pending (deferred) attacks — telegraph first, then execute
    this._pendingSlash        = null; // { timer, targetX, targetY, target }
    this._pendingShockwave    = null; // { timer } — ground variant only
    this._pendingTeleportCombo = null; // { hits, target }
    this._pendingGravityCrush = null;  // { timer }
    this._prevHealth       = 5000; // for stagger accumulation tracking
    this._cinematicFired   = new Set(); // HP-threshold mid-fight cinematics already triggered
    // Dimensional attack cooldowns (AI ticks)
    this._phaseShiftCd  = 30;  // Phase Shift     — 7.5s
    this._realityTearCd = 44;  // Reality Tear    — 11s
    this._calcStrikeCd  = 22;  // Calculated Strike — 5.5s
    // Chaining + pressure system
    this._pendingChainMove    = null; // { move, delay } — queued follow-up attack
    this._prevTargetVxArr     = [];   // rolling history of target vx for unpredictability detection
    this._aggressionBurstTimer = 0;  // AI ticks remaining in hyper-aggressive burst
    this._comboFinisherCd     = 0;   // cooldown preventing back-to-back mini finishers
    // Desperation + new high-impact moves
    this._desperationMode     = false; // activates at <20% HP
    this._realityOverrideCd   = 0;    // Reality Override — boss rewrites game state
    this._collapseStrikeCd    = 0;    // Collapse Strike  — slowmo + devastating hit
    this._grabCinCd           = 60;   // Grab Cinematic   — short scripted grab+throw
    this._dimensionCd         = 0;   // Dimension Shift  — toggle 2D/3D perspective
    this._pendingCollapseStrike = null; // { timer, target }
    // ── Cosmic attack cooldowns (AI ticks) ────────────────────
    this._gammaBeamCd    = 30;  // Gamma Ray Beam    — 7.5s
    this._neutronStarCd  = 40;  // Neutron Star      — 10s
    this._galaxySweepCd  = 35;  // Galaxy Sweep      — 8.75s
    this._multiverseCd   = 44;  // Multiverse Fracture — 11s
    this._supernovaCd    = 999; // Supernova — triggers once at low HP only
  }

  getPhase() {
    if (this.health > 3500) return 1;  // >70% HP
    if (this.health > 1500) return 2;  // 30–70% HP
    return 3;                           // <30% HP
  }

  attack(target) {
    if (this.cooldown > 0 || this.health <= 0 || this.stunTimer > 0 || this.ragdollTimer > 0) return;
    if (this.postSpecialPause > 0) return;
    // Combo cap: max 4 hits per combo burst
    if (this._comboCount >= 4) return;
    // Damage cap: combo cannot deal more than 85% of target's maxHP
    if (target && this._comboDamage >= target.maxHealth * 0.85) return;
    // Alternate punch / kick
    this._attackMode = this._attackMode === 'punch' ? 'kick' : 'punch';
    this.weaponHit   = false;
    this.swingHitTargets.clear();
    this.cooldown    = Math.max(1, Math.ceil(this.weapon.cooldown * this.attackCooldownMult));
    this.attackTimer = this.attackDuration;
    this._comboCount++;
    this._comboTimer = 0;
  }

  updateAI() {
    if (activeCinematic) return; // freeze during cinematic moments
    if (this.aiReact > 0) { this.aiReact--; return; }
    if (this.ragdollTimer > 0 || this.stunTimer > 0) return;
    if (bossStaggerTimer > 0) return; // stunned — vulnerability window
    if (this.postSpecialPause > 0) { this.postSpecialPause--; return; }

    const phase = this.getPhase();
    if (phase > this._lastPhase) {
      this._lastPhase = phase;
      if (settings.screenShake) screenShake = Math.max(screenShake, 22);
      this.postSpecialPause = Math.max(this.postSpecialPause, 7); // 7 ticks = 105 frames = 1.75s cinematic pause
      triggerPhaseTransition(this, phase);
    }

    // ── Mid-fight HP cinematics ───────────────────────────────
    if (!this._cinematicFired.has('entry')) {
      this._cinematicFired.add('entry');
      this.postSpecialPause = Math.max(this.postSpecialPause, 16);
      startCinematic(_makeTFEntryCinematic(this));
      return;
    }
    const _tfHpPct = this.health / this.maxHealth;
    if (!this._cinematicFired.has('50') && _tfHpPct <= 0.50) {
      this._cinematicFired.add('50');
      this.postSpecialPause = Math.max(this.postSpecialPause, 14);
      startCinematic(_makeTFReality50Cinematic(this));
      return;
    }
    if (!this._cinematicFired.has('15') && _tfHpPct <= 0.15) {
      this._cinematicFired.add('15');
      this.postSpecialPause = Math.max(this.postSpecialPause, 16);
      startCinematic(_makeTFDesp15Cinematic(this));
      return;
    }

    // Combo reset: if no new attack for 90 frames, reset combo window
    this._comboTimer++;
    if (this._comboTimer > 90) {
      this._comboCount  = 0;
      this._comboDamage = 0;
    }

    // ── Desperation mode activates at <20% HP ────────────────
    if (!this._desperationMode && this.health / this.maxHealth < 0.20) {
      this._desperationMode = true;
      showBossDialogue(randChoice(['You forced this.', '...Fine.', 'No more holding back.', 'ENOUGH.']), 260);
      screenShake = Math.max(screenShake, 28);
      spawnParticles(this.cx(), this.cy(), '#ffffff', 30);
      spawnParticles(this.cx(), this.cy(), '#000000', 20);
    }

    // Tick all special cooldowns
    if (this._gravityCd > 0) this._gravityCd--;
    if (this._warpCd    > 0) this._warpCd--;
    if (this._holeCd    > 0) this._holeCd--;
    if (this._floorCd   > 0) this._floorCd--;
    if (this._invertCd  > 0) this._invertCd--;
    if (this._sizeCd    > 0) this._sizeCd--;
    if (this._portalCd  > 0) this._portalCd--;
    if (this._graspCd     > 0) this._graspCd--;
    if (this._slashCd     > 0) this._slashCd--;
    if (this._wellCd      > 0) this._wellCd--;
    if (this._meteorCd    > 0) this._meteorCd--;
    if (this._cloneCd     > 0) this._cloneCd--;
    if (this._chainCd     > 0) this._chainCd--;
    if (this._shockwaveCd     > 0) this._shockwaveCd--;
    if (this._teleportComboCd > 0) this._teleportComboCd--;
    if (this._gravityCrushCd  > 0) this._gravityCrushCd--;
    if (this._phaseShiftCd  > 0) this._phaseShiftCd--;
    if (this._realityTearCd > 0) this._realityTearCd--;
    if (this._calcStrikeCd  > 0) this._calcStrikeCd--;
    if (this._realityOverrideCd > 0) this._realityOverrideCd--;
    if (this._collapseStrikeCd  > 0) this._collapseStrikeCd--;
    if (this._grabCinCd         > 0) this._grabCinCd--;
    if (this._dimensionCd       > 0) this._dimensionCd--;
    if (this._gammaBeamCd    > 0) this._gammaBeamCd--;
    if (this._neutronStarCd  > 0) this._neutronStarCd--;
    if (this._galaxySweepCd  > 0) this._galaxySweepCd--;
    if (this._multiverseCd   > 0) this._multiverseCd--;
    if (this._supernovaCd    > 0) this._supernovaCd--;
    // ── Desperation: extra cooldown burn ─────────────────────
    if (this._desperationMode) {
      if (this._slashCd      > 0) this._slashCd--;
      if (this._graspCd      > 0) this._graspCd--;
      if (this._chainCd      > 0) this._chainCd--;
      if (this._phaseShiftCd > 0) this._phaseShiftCd--;
    }
    // ── Pressure system: idle player → faster cooldowns ──────
    if (this._stillTimer > 10) {
      if (this._slashCd      > 0) this._slashCd--;
      if (this._calcStrikeCd > 0) this._calcStrikeCd--;
      if (this._phaseShiftCd > 0) this._phaseShiftCd--;
      if (this._shockwaveCd  > 0) this._shockwaveCd--;
    }
    // ── Aggression burst tick ─────────────────────────────────
    if (this._aggressionBurstTimer > 0) this._aggressionBurstTimer--;
    // ── Combo finisher cooldown ───────────────────────────────
    if (this._comboFinisherCd > 0) this._comboFinisherCd--;
    // ── Execute pending chain move ────────────────────────────
    if (this._pendingChainMove) {
      this._pendingChainMove.delay--;
      if (this._pendingChainMove.delay <= 0) {
        const cm = this._pendingChainMove;
        this._pendingChainMove = null;
        const freshTarget = players.find(p => !p.isBoss && p.health > 0);
        if (freshTarget) { this._doSpecial(cm.move, freshTarget); return; }
      }
    }

    // Floor-removal countdown
    if (tfFloorRemoved) {
      tfFloorTimer--;
      if (tfFloorTimer <= 0) {
        tfFloorRemoved = false;
        const floorPl = currentArena.platforms.find(p => p.isFloor);
        if (floorPl) floorPl.isFloorDisabled = false;
        showBossDialogue('Ground restored.', 150);
      }
    }

    const t = this.target;
    if (!t || t.health <= 0) return;

    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = dx > 0 ? 1 : -1;
    const spd = phase === 3 ? this._tfSpeed * 1.25 : phase === 2 ? this._tfSpeed * 1.12 : this._tfSpeed;

    this.facing = dir;

    // --- Player intelligence: detect still-standing / edge / airborne / fleeing ---
    const playerMoved = Math.abs(t.cx() - this._lastTargetX) > 8;
    this._stillTimer  = playerMoved ? 0 : this._stillTimer + 1;
    this._lastTargetX = t.cx();
    // Rolling vx history for calcStrike accuracy tier
    this._prevTargetVxArr.push(t.vx);
    if (this._prevTargetVxArr.length > 10) this._prevTargetVxArr.shift();

    const dx_  = t.cx() - this.cx();
    const playerFleeing = (dx_ < 0 && t.vx < -1) || (dx_ > 0 && t.vx > 1);
    const playerFar = Math.abs(dx_) > 280;
    this._runAwayTicks = (playerFleeing && playerFar) ? this._runAwayTicks + 1
                                                       : Math.max(0, this._runAwayTicks - 2);

    // --- Aggression timer + smart weighted special trigger ---
    // Higher special frequency than before; aggression timer forces action if idle ≥ 12 ticks (3s)
    this._idleTicks++;
    const burstActive  = this._aggressionBurstTimer > 0;
    const specialFreq  = burstActive
      ? (phase === 3 ? 0.22 : phase === 2 ? 0.14 : 0.09)
      : (phase === 3 ? 0.12 : phase === 2 ? 0.065 : 0.035);
    const forceSpecial = this._idleTicks >= (this._desperationMode ? 7 : 12);
    if (forceSpecial || Math.random() < specialFreq) {
      const move = this._selectWeightedSpecial(phase, t);
      if (move) {
        this._idleTicks = 0;
        this._doSpecial(move, t);
        return;
      }
      // Nothing available yet — at least reset idle so we don't spam every tick
      if (forceSpecial) {
        this._idleTicks = 8;
        // Trigger aggression burst if player has been standing still
        if (this._stillTimer > 15 && this._aggressionBurstTimer <= 0) {
          this._aggressionBurstTimer = 5;
          showBossDialogue(randChoice(['You think standing still will save you?', 'Come on.', 'Move.', 'I see you.']), 120);
        }
      }
    }

    // --- Movement: chase to melee range ---
    // Avoid floor when floor is removed
    if (tfFloorRemoved && !this.onGround) {
      const floorY = 460;
      if (this.y + this.h > floorY - 30 && this.vy > 0) {
        this.vy = -14;
      }
    }

    if (d > 55) {
      this.vx = dir * spd;
    } else if (d < 30) {
      this.vx = -dir * spd * 0.5;
    }

    // Jump to chase if target is above
    if (t.y < this.y - 50 && this.onGround) this.vy = -16;
    // Double jump in air to reach elevated targets
    if (!this.onGround && this.canDoubleJump && t.y < this.y - 25 && this.vy > -3 && Math.random() < 0.45) {
      this.vy = -15; this.canDoubleJump = false;
    }
    // Edge avoidance
    const nearLeft  = this.x < 90;
    const nearRight = this.x + this.w > GAME_W - 90;
    if (nearLeft && dir < 0) this.vx = spd * 0.6;
    if (nearRight && dir > 0) this.vx = -spd * 0.6;

    // --- Dodge incoming attacks (never 2 in a row) ---
    if (this._justDodged) {
      this._dodgeTimer++;
      if (this._dodgeTimer > 70) { this._justDodged = false; this._dodgeTimer = 0; }
    } else {
      const attacker = players.find(p => !p.isBoss && p.attackTimer > 0 && dist(this, p) < 85);
      if (attacker) {
        const dodgeChance = phase === 3 ? 0.60 : phase === 2 ? 0.42 : 0.28;
        if (Math.random() < dodgeChance) {
          const awayDir = this.cx() > attacker.cx() ? 1 : -1;
          this.vx = awayDir * spd * 3.8;
          if (this.onGround && Math.random() < 0.55) this.vy = -13;
          this.invincible = Math.max(this.invincible, 18);
          this._justDodged = true;
          this._dodgeTimer = 0;
          spawnParticles(this.cx(), this.cy(), '#000000', 10);
          spawnParticles(this.cx(), this.cy(), '#ffffff', 5);
        }
      }
    }

    // --- Attack (hyper aggressive) ---
    const atkFreq = phase === 3 ? 0.28 : phase === 2 ? 0.18 : 0.12;
    if (d < 70 && Math.random() < atkFreq && this.cooldown <= 0) {
      this.attack(t);
    }
    // Bonus burst attacks when very close
    if (d < 45 && Math.random() < (phase === 3 ? 0.12 : 0.07) && this.cooldown <= 0) {
      this.attack(t);
    }
  }

  _selectWeightedSpecial(phase, target) {
    const d          = dist(this, target);
    const playerEdge = target.x < 130 || target.x + target.w > GAME_W - 130;
    const playerAir  = !target.onGround;
    const hpPct      = target.health / target.maxHealth;
    const w          = {};

    // ── Phase 1+ attacks ──────────────────────────────────────
    if (this._slashCd     <= 0) w.slash     = 0.20;
    if (this._meteorCd    <= 0) w.meteor    = 0.16;
    if (this._portalCd    <= 0) w.portal    = 0.12;
    if (this._holeCd      <= 0) w.holes     = 0.09;
    if (this._shockwaveCd <= 0) w.shockwave = 0.14;
    if (this._sizeCd      <= 0) w.size      = 0.07;
    if (this._invertCd    <= 0) w.invert    = 0.07;
    if (this._warpCd      <= 0) w.warp      = 0.04;
    // ── Dimensional attacks (all phases) ────────────────────
    if (this._phaseShiftCd  <= 0 && !tfPhaseShift)  w.phaseShift  = 0.11;
    if (this._calcStrikeCd  <= 0 && !tfCalcStrike)  w.calcStrike  = 0.11;
    if (this._realityTearCd <= 0 && !tfRealityTear) w.realityTear = 0.10;

    // ── Phase 2+ attacks ─────────────────────────────────────
    if (phase >= 2) {
      if (this._wellCd    <= 0) w.well    = 0.14;
      if (this._cloneCd   <= 0) w.clones  = 0.14;
      if (this._gravityCd <= 0) w.gravity = 0.09;
      if (this._floorCd   <= 0 && !tfFloorRemoved) w.floor = 0.09;
    }

    // ── Phase 3+ attacks ─────────────────────────────────────
    if (phase >= 3) {
      if (this._graspCd         <= 0) w.grasp         = 0.22;
      if (this._chainCd         <= 0) w.chain         = 0.18;
      if (this._teleportComboCd <= 0) w.teleportCombo = 0.20;
      if (this._gravityCrushCd  <= 0) w.gravityCrush  = 0.16;
    }
    // Phase 2+ gravity crush (weaker version)
    if (phase === 2 && this._gravityCrushCd <= 0) w.gravityCrush = 0.08;

    // ── Distance zone modifiers ───────────────────────────────
    const closeDist = d < 100;
    const medDist   = d >= 100 && d < 260;
    const farDist   = d >= 260;

    if (closeDist) {
      if (w.chain)     w.chain     = (w.chain     || 0) * 2.2;
      if (w.grasp)     w.grasp     = (w.grasp     || 0) * 2.0;
      if (w.shockwave) w.shockwave = (w.shockwave || 0) * 1.6;
    }
    if (medDist) {
      if (w.well)      w.well      = (w.well      || 0) * 2.0;
      if (w.shockwave) w.shockwave = (w.shockwave || 0) * 2.2;
      if (w.holes)     w.holes     = (w.holes     || 0) * 1.5;
    }
    if (farDist) {
      if (w.meteor)    w.meteor    = (w.meteor    || 0) * 2.8;
      if (w.slash)     w.slash     = (w.slash     || 0) * 2.2;
      if (w.warp)      w.warp      = (w.warp      || 0) * 2.0;
    }

    // ── Situational boosts ────────────────────────────────────
    // Player standing still → teleport behind them
    if (this._stillTimer > 8) {
      if (w.slash)  w.slash  = (w.slash  || 0) * 2.2;
      if (w.portal) w.portal = (w.portal || 0) * 2.2;
      if (w.grasp)  w.grasp  = (w.grasp  || 0) * 1.6;
    }
    // Player running away → intercept with meteor or slash
    if (this._runAwayTicks > 5) {
      if (w.meteor) w.meteor = (w.meteor || 0) * 3.0;
      if (w.slash)  w.slash  = (w.slash  || 0) * 2.5;
    }
    // Player near arena edge → pull with gravity well / crush
    if (playerEdge) {
      if (w.well)          w.well          = (w.well          || 0) * 2.2;
      if (w.grasp)         w.grasp         = (w.grasp         || 0) * 1.6;
      if (w.shockwave)     w.shockwave     = (w.shockwave     || 0) * 1.4;
      if (w.gravityCrush)  w.gravityCrush  = (w.gravityCrush  || 0) * 2.2;
    }
    // Player standing still → teleport combo
    if (this._stillTimer > 6 && w.teleportCombo) {
      w.teleportCombo = (w.teleportCombo || 0) * 2.8;
    }
    // Player airborne → slam them down
    if (playerAir) {
      if (w.meteor)    w.meteor    = (w.meteor    || 0) * 1.8;
      if (w.well)      w.well      = (w.well      || 0) * 1.5;
      if (w.shockwave) w.shockwave = (w.shockwave || 0) * 1.3;
    }
    // Player nearly dead → finishing moves
    if (hpPct < 0.25) {
      if (w.grasp) w.grasp = (w.grasp || 0) * 1.8;
      if (w.chain) w.chain = (w.chain || 0) * 1.8;
    }
    // Dimensional attack situational boosts
    if (this._stillTimer > 6 && w.calcStrike)  w.calcStrike  *= 2.4; // standing still = easy to predict
    if (farDist  && w.realityTear) w.realityTear *= 2.0; // far away = tear pulls them in
    if (closeDist && w.phaseShift) w.phaseShift  *= 1.8; // close = phase shift to reposition
    // ── Phase 3 / desperation exclusive attacks ───────────────
    if ((phase === 3 || this._desperationMode) && this._realityOverrideCd <= 0 && !tfRealityOverride) {
      w.realityOverride = 0.16;
    }
    if ((phase === 3 || this._desperationMode) && this._collapseStrikeCd <= 0) {
      w.collapseStrike = 0.13;
    }
    if (phase >= 2 && this._grabCinCd <= 0 && !activeCinematic) {
      w.grabCinematic = 0.07;
    }
    // Dimension Shift — available from phase 2 onward, moderate weight
    if (phase >= 2 && this._dimensionCd <= 0) {
      w.dimension = 0.09;
    }
    // ── Cosmic attacks ────────────────────────────────────────
    if (this._gammaBeamCd   <= 0 && !tfGammaBeam)   w.gammaBeam    = 0.12;
    if (this._neutronStarCd <= 0 && !tfNeutronStar)  w.neutronStar  = 0.10;
    if (this._galaxySweepCd <= 0 && !tfGalaxySweep)  w.galaxySweep  = 0.10;
    if (this._multiverseCd  <= 0 && !tfMultiverse)   w.multiverseFracture = 0.09;
    if (this._supernovaCd   <= 0 && !tfSupernova && this.health / this.maxHealth < 0.25) {
      w.supernova = 0.28; // heavy weight when unlocked — dramatic payoff
    }
    // Situational boosts for cosmic attacks
    if (farDist  && w.gammaBeam)   w.gammaBeam    *= 2.2; // beam crosses full map
    if (playerAir && w.neutronStar) w.neutronStar  *= 1.8; // gravity hurts airborne players more
    if (medDist  && w.galaxySweep) w.galaxySweep  *= 1.6;
    if (this._stillTimer > 6 && w.multiverseFracture) w.multiverseFracture *= 2.0;
    // Desperation: boost all finishing moves
    if (this._desperationMode) {
      if (w.grasp)           w.grasp           *= 1.5;
      if (w.chain)           w.chain           *= 1.6;
      if (w.realityOverride) w.realityOverride *= 2.0;
      if (w.collapseStrike)  w.collapseStrike  *= 1.8;
      if (w.calcStrike)      w.calcStrike      *= 1.4;
      if (w.supernova)       w.supernova       *= 1.5;
    }

    // ── Anti-repeat ───────────────────────────────────────────
    delete w[this._lastSpecial];
    delete w[this._lastLastSpecial];

    const entries = Object.entries(w);
    if (!entries.length) return null;
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let r = Math.random() * total;
    for (const [key, v] of entries) { r -= v; if (r <= 0) return key; }
    return entries[entries.length - 1][0];
  }

  _doSpecial(move, target) {
    this.postSpecialPause = 4;
    this._comboCount  = 0;
    this._comboDamage = 0;
    this._idleTicks   = 0;
    // Anti-repeat tracking
    this._lastLastSpecial = this._lastSpecial;
    this._lastSpecial     = move;
    // Director: specials add intensity
    if (typeof directorAddIntensity === 'function') directorAddIntensity(0.18);
    // Phase-based cooldown multiplier — phase 3 recharges ~45% faster
    const phase  = this.getPhase();
    const cdMult = phase === 3 ? 0.55 : phase === 2 ? 0.75 : 1.0;
    // Burst mode: halve post-special pause so attacks chain faster
    const _burstActive = this._aggressionBurstTimer > 0;
    switch (move) {
      // ── NEW: Void Grasp ─────────────────────────────────────
      case 'grasp': {
        this._graspCd = Math.ceil(50 * cdMult);
        this.postSpecialPause = 6;
        showBossDialogue('You cannot escape.', 180);
        screenShake = Math.max(screenShake, 22);
        spawnParticles(this.cx(), this.cy(), '#440044', 22);
        spawnParticles(this.cx(), this.cy(), '#ffffff',  8);
        // Pull all non-boss players toward the boss
        for (const p of players) {
          if (p.isBoss || p.health <= 0) continue;
          const ddx = this.cx() - p.cx();
          const ddy = (this.y + this.h * 0.5) - (p.y + p.h * 0.5);
          const dd  = Math.hypot(ddx, ddy);
          if (dd < 280 && dd > 1) {
            const pull = 20 * (1 - dd / 280);
            p.vx = (ddx / dd) * pull;
            p.vy = (ddy / dd) * pull * 0.5 - 4;
          }
        }
        // Telegraph: show slam impact zone at boss position for the pull duration
        bossWarnings.push({ type: 'circle', x: this.cx(), y: this.cy(), r: 120,
          color: '#ff00ff', timer: 45, maxTimer: 45, label: 'SLAM INCOMING!' });
        // Schedule a slam hit after the pull lands (~45 frames)
        tfGraspSlam = { timer: 45 };
        break;
      }
      // ── NEW: Reality Slash — DEFERRED with telegraph ────────
      case 'slash': {
        this._slashCd = Math.ceil(16 * cdMult);
        this.postSpecialPause = 5;
        // Telegraph: show red X + slash cone at the target's current position (30 frames)
        const behindOff = (target.facing || 1) * 55;
        const warnX = clamp(target.cx() + behindOff, 20, GAME_W - 20);
        const warnY = clamp(target.y + target.h * 0.5, 20, 450);
        bossWarnings.push({ type: 'cross',  x: target.cx(), y: target.cy(),
          r: 30, color: '#ffffff', timer: 30, maxTimer: 30, label: 'TELEPORT!' });
        bossWarnings.push({ type: 'circle', x: warnX, y: warnY,
          r: 80, color: '#ff0044', timer: 30, maxTimer: 30, label: 'SLASH ZONE' });
        // Store pending slash; execute teleport+damage after telegraph
        this._pendingSlash = { timer: 30, target, behindOff };
        showBossDialogue('Too slow.', 100);
        break;
      }
      // ── NEW: Gravity Well ───────────────────────────────────
      case 'well': {
        this._wellCd = Math.ceil(36 * cdMult);
        this.postSpecialPause = 5;
        const wellX = GAME_W / 2 + (Math.random() - 0.5) * 200;
        const wellY = 320 + Math.random() * 60;
        tfGravityWells.push({ x: wellX, y: wellY, r: 200, timer: 270, maxTimer: 270, strength: 16 });
        // Telegraph: pulsing danger ring at well spawn location
        bossWarnings.push({ type: 'circle', x: wellX, y: wellY,
          r: 200, color: '#8800ff', timer: 40, maxTimer: 40, label: 'GRAVITY WELL!' });
        screenShake = Math.max(screenShake, 16);
        spawnParticles(wellX, wellY, '#440044', 28);
        spawnParticles(wellX, wellY, '#8800ff', 14);
        showBossDialogue('The void pulls.', 180);
        break;
      }
      // ── NEW: Meteor Crash ───────────────────────────────────
      case 'meteor': {
        this._meteorCd = Math.ceil(60 * cdMult);
        this.postSpecialPause = 10;
        this.vy  = -38;
        this.invincible = 170;
        tfMeteorCrash = {
          phase:   'rising',
          timer:   0,
          landX:   clamp(target.cx(), 80, GAME_W - 80),
          boss:    this,
          shadowR: 0,
        };
        spawnParticles(this.cx(), this.cy(), '#000000', 22);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 10);
        showBossDialogue('JUDGMENT.', 220);
        break;
      }
      // ── NEW: Shadow Clone Barrage ───────────────────────────
      case 'clones': {
        this._cloneCd = Math.ceil(60 * cdMult);
        this.postSpecialPause = 4;
        tfClones = [];
        const realIdx = Math.floor(Math.random() * 3);
        for (let ci = 0; ci < 3; ci++) {
          const cx = 120 + Math.random() * (GAME_W - 240);
          tfClones.push({
            x: cx, y: target.y || 300,
            w: this.w, h: this.h,
            health: 1,
            timer:  420, // 7 seconds
            facing: Math.random() < 0.5 ? 1 : -1,
            attackTimer: 0, animTimer: 0,
            isReal: ci === realIdx,
          });
          spawnParticles(cx, target.y || 300, '#333333', 16);
        }
        showBossDialogue('Which one is real?', 220);
        break;
      }
      // ── NEW: Chain Slam Combo ───────────────────────────────
      case 'chain': {
        this._chainCd = Math.ceil(42 * cdMult);
        this.postSpecialPause = 9;
        screenShake = Math.max(screenShake, 18);
        showBossDialogue('CHAIN.', 160);
        tfChainSlam = { stage: 0, timer: 0, target };
        break;
      }
      case 'gravity':
        tfGravityInverted = !tfGravityInverted;
        tfGravityTimer    = tfGravityInverted ? 600 : 0; // 10s limit when inverted
        this._gravityCd = Math.ceil(48 * cdMult);
        showBossDialogue(tfGravityInverted ? 'Down is up now.' : 'Gravity returns.', 180);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 22);
        break;
      case 'warp': {
        const warpPool = Object.keys(ARENAS).filter(k => !['creator','void','soccer'].includes(k));
        const newKey   = warpPool[Math.floor(Math.random() * warpPool.length)];
        tfWarpArena(newKey);
        this._warpCd = Math.ceil(80 * cdMult);
        showBossDialogue('A new stage.', 150);
        break;
      }
      case 'holes':
        spawnTFBlackHoles();
        this._holeCd = Math.ceil(36 * cdMult);
        showBossDialogue('Consume.', 110);
        break;
      case 'floor': {
        tfFloorRemoved = true;
        tfFloorTimer   = 1200; // 20 seconds at 60fps (tfFloorTimer is decremented every frame)
        this._floorCd  = Math.ceil(120 * cdMult);
        const floorPl = currentArena.platforms.find(p => p.isFloor);
        if (floorPl) floorPl.isFloorDisabled = true;
        showBossDialogue('There is no ground to stand on.', 240);
        spawnParticles(GAME_W / 2, 465, '#000000', 30);
        spawnParticles(GAME_W / 2, 465, '#ffffff', 15);
        break;
      }
      case 'invert':
        tfControlsInverted = !tfControlsInverted;
        this._invertCd = Math.ceil(36 * cdMult);
        showBossDialogue(tfControlsInverted ? 'Your body refuses you.' : 'Control returns.', 180);
        spawnParticles(this.cx(), this.cy(), '#aaaaaa', 16);
        break;
      case 'size': {
        const t = this.target;
        if (t) {
          const scales = [0.4, 0.55, 0.7, 1.0, 1.25, 1.5];
          tfSetSize(t, scales[Math.floor(Math.random() * scales.length)]);
        }
        if (Math.random() < 0.45) {
          tfSetSize(this, clamp(0.5 + Math.random() * 0.9, 0.4, 1.5));
        }
        this._sizeCd = Math.ceil(32 * cdMult);
        showBossDialogue('Size means nothing here.', 180);
        break;
      }
      case 'portal':
        tfPortalTeleport(this, target);
        this._portalCd = Math.ceil(24 * cdMult);
        break;
      // ── Teleport Combo — teleport to player 3× in quick succession, attack each time ──
      case 'teleportCombo': {
        this._teleportComboCd = Math.ceil(48 * cdMult);
        this.postSpecialPause = 8;
        showBossDialogue(randChoice(['Nowhere to run.', 'You cannot track me.', 'EVERYWHERE AT ONCE.']), 200);
        screenShake = Math.max(screenShake, 18);
        spawnParticles(this.cx(), this.cy(), '#000000', 18);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 10);
        // Schedule 3 rapid teleport-strikes (each 18 frames apart)
        this._pendingTeleportCombo = {
          hits:   3,
          gap:    18,  // frames between each strike
          timer:  6,   // frames until first strike
          target,
        };
        break;
      }
      // ── Gravity Crush — suck all players toward arena center, then explode outward ──
      case 'gravityCrush': {
        this._gravityCrushCd = Math.ceil(60 * cdMult);
        this.postSpecialPause = 10;
        showBossDialogue(randChoice(['CONVERGE.', 'Nowhere to go.', 'All roads lead to me.']), 220);
        screenShake = Math.max(screenShake, 22);
        spawnParticles(GAME_W / 2, GAME_H / 2, '#440044', 30);
        spawnParticles(GAME_W / 2, GAME_H / 2, '#ffffff', 15);
        // Telegraph warning circle at arena center
        bossWarnings.push({ type: 'circle', x: GAME_W / 2, y: GAME_H / 2,
          r: 200, color: '#8800ff', timer: 60, maxTimer: 60, label: 'CRUSH!' });
        // Schedule the detonation after 60 frames of pull
        this._pendingGravityCrush = { timer: 60, boss: this };
        break;
      }
      // ── NEW: Shockwave Pulse — ground variant deferred with telegraph ────────
      case 'shockwave': {
        this._shockwaveCd = Math.ceil(20 * cdMult);
        this.postSpecialPause = 5;
        if (this.onGround) {
          // Telegraph: expanding warning ring on ground (20 frames ≈ 0.33s)
          bossWarnings.push({ type: 'circle', x: this.cx(), y: this.y + this.h,
            r: 340, color: '#aa00ff', timer: 20, maxTimer: 20, label: 'SHOCKWAVE!' });
          this._pendingShockwave = { timer: 20, boss: this };
        } else {
          // Air slam: crash down fast, wave spawns when landing
          this.vy = Math.max(this.vy, 24);
          tfShockwaves.push({
            x: this.cx(), y: this.y + this.h,
            r: 0, maxR: 0,
            timer: 1, maxTimer: 1,
            boss: this, hit: new Set(), pendingLanding: true,
          });
        }
        showBossDialogue(randChoice(['IMPACT!', 'The world shakes.', 'SHOCKWAVE!', 'Feel it trembling.']), 140);
        break;
      }

      // ── PHASE SHIFT ─────────────────────────────────────────
      // Boss goes semi-transparent, spawns 3 position echoes.
      // After a delay one echo is real — boss snaps there and attacks.
      case 'phaseShift': {
        this._phaseShiftCd = Math.ceil(38 * cdMult);
        this.postSpecialPause = 8;
        this.invincible = 70;
        const realIdx = Math.floor(Math.random() * 3);
        const spread  = 180;
        const echoes  = [0, 1, 2].map(i => ({
          x: clamp(this.cx() + (i - 1) * spread + (Math.random() - 0.5) * 80, 60, GAME_W - 60),
          y: this.y + (Math.random() - 0.5) * 60,
          // Fake echoes drift slightly to confuse the player; real echo stays put
          driftVx: i !== realIdx ? (Math.random() - 0.5) * 1.4 : 0,
          driftVy: i !== realIdx ? (Math.random() - 0.5) * 0.6 : 0,
        }));
        tfPhaseShift = { timer: 0, maxTimer: 70, echoes, realIdx, revealed: false, bossRef: this };
        screenShake  = Math.max(screenShake, 10);
        // Chain: calcStrike immediately after reappearing
        if (!this._pendingChainMove) this._pendingChainMove = { move: 'calcStrike', delay: 80 };
        showBossDialogue(randChoice(['You cannot hit what you cannot see.', 'Which one is real?', 'Choose wisely.']), 160);
        break;
      }

      // ── REALITY TEAR ────────────────────────────────────────
      // A crack opens in space between boss and player.
      // It pulls the player toward it, then snaps shut cleanly — no residue.
      case 'realityTear': {
        this._realityTearCd = Math.ceil(44 * cdMult);
        this.postSpecialPause = 7;
        const midX = (this.cx() + target.cx()) / 2;
        const midY = (this.cy() + target.cy()) / 2;
        tfRealityTear = { x: midX, y: midY, timer: 0, maxTimer: 90, phase: 'warn',
                          bossRef: this, targetRef: target };
        bossWarnings.push({ type: 'circle', x: midX, y: midY, r: 60,
          color: '#cc00ff', timer: 20, maxTimer: 20, label: 'REALITY TEAR!' });
        screenShake = Math.max(screenShake, 8);
        showBossDialogue(randChoice(['Space itself obeys me.', 'Tear.', 'The fabric yields.']), 150);
        break;
      }

      // ── CALCULATED STRIKE ────────────────────────────────────
      // Shows a math thought bubble (boss "calculating"), then teleports
      // to the player's predicted future position and strikes.
      case 'calcStrike': {
        this._calcStrikeCd = Math.ceil(28 * cdMult);
        this.postSpecialPause = 6;
        const MATH_EXPRESSIONS = ['F = ma', 'Δx / Δt', '∫v dx', 'lim(t→0)', 'p = mv', '∇²φ = 0', 'E = mc²'];
        const bubbleText = MATH_EXPRESSIONS[Math.floor(Math.random() * MATH_EXPRESSIONS.length)];
        // ── Accuracy tier based on recent player movement ──────────
        const vxHist = this._prevTargetVxArr;
        let vxVar = 0;
        if (vxHist.length >= 4) {
          const _mean = vxHist.reduce((s, v) => s + v, 0) / vxHist.length;
          vxVar = vxHist.reduce((s, v) => s + (v - _mean) ** 2, 0) / vxHist.length;
        }
        const _isStill      = this._stillTimer > 5;       // standing still → guaranteed hit
        const _isPredictable = vxVar < 3 && !_isStill;    // consistent direction → high accuracy
        const _isErratic    = vxVar >= 8;                  // random movement → lower accuracy
        const _noiseRadius  = _isStill ? 0 : _isPredictable ? 22 : _isErratic ? 85 : 42;
        const predictX = clamp(target.cx() + target.vx * 45 + (Math.random() - 0.5) * _noiseRadius * 2, 40, GAME_W - 40);
        const predictY = clamp(target.cy() + target.vy * 20 + (Math.random() - 0.5) * _noiseRadius * 0.5, 40, GAME_H - 40);
        // ── 5D ghost paths: show 3 possible futures, boss picks one ─
        tfGhostPaths = {
          timer: 0, maxTimer: 40,
          paths: [
            { // player continues current direction
              pts: [{ x: target.cx(), y: target.cy() },
                    { x: clamp(target.cx() + target.vx * 65, 30, GAME_W - 30),
                      y: clamp(target.cy() + target.vy * 30, 30, GAME_H - 30) }],
              selected: false, alpha: 0.30,
            },
            { // player reverses
              pts: [{ x: target.cx(), y: target.cy() },
                    { x: clamp(target.cx() - target.vx * 30, 30, GAME_W - 30),
                      y: target.cy() }],
              selected: false, alpha: 0.22,
            },
            { // boss's chosen prediction (accurate)
              pts: [{ x: target.cx(), y: target.cy() },
                    { x: predictX, y: predictY }],
              selected: true, alpha: 0.85,
            },
          ],
        };
        // Varied delay: still player = faster strike; erratic = slower (harder to time)
        const strikeDelay = _isStill ? 35 : _isErratic ? 52 : 42;
        tfMathBubble = { text: bubbleText, timer: 0, maxTimer: 38, x: this.cx(), y: this.y - 18 };
        tfCalcStrike = { timer: 0, maxTimer: Math.max(strikeDelay + 14, 55), predictX, predictY,
                         fired: false, strikeDelay, targetRef: target };
        showBossDialogue(_isStill ? 'Too easy.' : _isErratic ? 'Chaos... still calculable.' : 'Calculating...', 140);
        break;
      }

      // ── REALITY OVERRIDE — boss rewrites game state ──────────────
      // Briefly freezes game, teleports player close, executes attack chain.
      // Player can dodge with jump/shield during the 20-frame execute window.
      case 'realityOverride': {
        this._realityOverrideCd = Math.ceil(65 * cdMult);
        this.postSpecialPause   = 12;
        hitStopFrames = Math.max(hitStopFrames, 14);
        showBossDialogue(randChoice(['I decide what happens next.', 'Override.', 'This is my arena.', 'Checkmate.']), 210);
        screenShake = Math.max(screenShake, 22);
        spawnParticles(this.cx(), this.cy(), '#000000', 28);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 14);
        tfRealityOverride = { timer: 0, maxTimer: 70, bossRef: this, targetRef: target, phase: 'freeze',
                              attacksFired: 0 };
        break;
      }

      // ── COLLAPSE STRIKE — slowmo + devastating teleport hit ─────
      case 'collapseStrike': {
        this._collapseStrikeCd = Math.ceil(55 * cdMult);
        this.postSpecialPause  = 8;
        showBossDialogue('COLLAPSE.', 160);
        slowMotion   = 0.08;
        hitSlowTimer = 25;
        screenShake  = Math.max(screenShake, 14);
        spawnParticles(this.cx(), this.cy(), '#000000', 22);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 10);
        // Crosshair telegraph at target's current position
        bossWarnings.push({ type: 'cross', x: target.cx(), y: target.cy(),
          r: 22, color: '#ffffff', timer: 22, maxTimer: 22, label: 'COLLAPSE!' });
        // Schedule the actual strike after 22 frames (during slowmo)
        this._pendingCollapseStrike = { timer: 22, target };
        break;
      }

      // ── GRAB CINEMATIC — short scripted grab + throw ─────────────
      case 'grabCinematic': {
        this._grabCinCd       = Math.ceil(80 * cdMult);
        this.postSpecialPause = 10;
        showBossDialogue(randChoice(['You cannot run.', 'Come here.', 'GOTCHA.', 'Stay.']), 170);
        startCinematic(_makeTFGrabCinematic(this, target));
        break;
      }

      // ── GAMMA RAY BEAM ─────────────────────────────────────────────────
      // 42-frame telegraph (thin glowing line across full arena), then 40-frame beam.
      // Beam fires at a fixed Y; player must jump above or duck below.
      case 'gammaBeam': {
        this._gammaBeamCd = Math.ceil(40 * cdMult);
        this.postSpecialPause = 14;
        // charge phase first — tracks player Y live, then locks
        tfGammaBeam = {
          phase: 'charge', timer: 0, maxTimer: 28,
          trackY: clamp(target.y + target.h * 0.45, 120, 440),
          y: 0, hit: new Set(),
          chargeX: this.cx(), chargeY: this.cy() + this.h * 0.45,
        };
        screenShake = Math.max(screenShake, 6);
        showBossDialogue(randChoice(['Charging...', 'GAMMA BURST.', 'Feel the radiation.', 'Nowhere to hide.']), 240);
        break;
      }

      // ── NEUTRON STAR ───────────────────────────────────────────────────
      // Pull phase (5s): gravity increased, jump height halved.
      // Slam phase: boss rises off-screen, warns with shadow, crashes down as AoE.
      case 'neutronStar': {
        this._neutronStarCd = Math.ceil(52 * cdMult);
        this.postSpecialPause = 16;
        tfNeutronStar = {
          phase: 'charge', timer: 0, maxTimer: 22, // charge first
          bossRef: this, startX: this.cx(),
        };
        screenShake = Math.max(screenShake, 10);
        spawnParticles(this.cx(), this.cy(), '#ffaa00', 16);
        showBossDialogue(randChoice(['Dense as a dying star.', 'NEUTRON STAR.', 'Gravity bends to me.', 'Feel the pull.']), 220);
        break;
      }

      // ── GALAXY SWEEP ───────────────────────────────────────────────────
      // Two rotating danger arms sweep the arena for 3s. Player must stay in gaps.
      case 'galaxySweep': {
        this._galaxySweepCd = Math.ceil(44 * cdMult);
        this.postSpecialPause = 14;
        tfGalaxySweep = {
          angle: 0, speed: 0.008, // starts slow, accelerates
          timer: 0, maxTimer: 260,
          hit: new Set(),
          cx: GAME_W / 2, cy: GAME_H / 2 - 30,
          phase: 'charge', chargeTimer: 0, chargeMax: 24,
        };
        screenShake = Math.max(screenShake, 10);
        spawnParticles(GAME_W / 2, GAME_H / 2 - 30, '#440066', 20);
        showBossDialogue(randChoice(['The galaxy sweeps clean.', 'SPIRAL.', 'Nowhere in this universe.', 'Rotation.']), 200);
        break;
      }

      // ── MULTIVERSE FRACTURE ────────────────────────────────────────────
      // True timeline-echo system:
      //   show    (0-70):   3 live player clones appear at spatial offsets, boss ghosts mirror
      //   select  (70-110): boss highlights ONE clone as the "real" timeline, locks its X
      //   collapse(110-140): all other timelines shatter with particles
      //   strike  (140-190): boss fires at the locked X — player must have dodged away
      case 'multiverseFracture': {
        this._multiverseCd = Math.ceil(50 * cdMult);
        this.postSpecialPause = 16;

        // 3 clone offsets (left / center / right). Player's REAL body is always at 0.
        // Boss will select one of these offsets as the "target" — strikes that absolute X.
        const CLONE_OFFSETS = [-200, 0, 200];          // spatial X offsets from player
        const realIdx = Math.floor(Math.random() * CLONE_OFFSETS.length);

        // Boss ghost mirrors: symmetric reflections so boss also looks "duplicated"
        const bossGhosts = [
          { offsetX: -(this.cx() - GAME_W * 0.25) },   // left mirror
          { offsetX:  (GAME_W * 0.75 - this.cx()) },   // right mirror
        ];

        tfMultiverse = {
          phase: 'show', timer: 0, maxTimer: 190,
          bossRef: this, targetRef: target,
          cloneOffsets: CLONE_OFFSETS,
          realIdx,             // which offset the boss will target
          strikeX: 0,          // locked absolute X (set at start of 'select')
          strikeY: 0,          // locked absolute Y
          bossGhosts,
          shards: [],          // lightweight shard particles spawned on collapse
          hit: false,
        };

        screenShake = Math.max(screenShake, 14);
        slowMotion   = 0.55;
        hitSlowTimer = 30;
        spawnParticles(target.cx(), target.cy(), '#00ccff', 18);
        spawnParticles(target.cx(), target.cy(), '#ffffff',  8);
        showBossDialogue(
          randChoice(['I see all timelines.', 'FRACTURE.', 'Which version of you survives?', 'Multiverse.']), 260
        );
        break;
      }

      // ── SUPERNOVA (rare — triggers once at <25% HP) ────────────────────
      // buildup → implosion → active shockwave (r=0→340)
      // Safe zone: stay within 45px of boss (inside the core)
      case 'supernova': {
        this._supernovaCd = 9999; // one-time use per fight
        this.postSpecialPause = 22;
        slowMotion   = 0.14;
        hitSlowTimer = 55;
        tfSupernova = {
          phase: 'buildup', timer: 0, maxTimer: 70,
          bossRef: this, hit: new Set(), r: 0,
        };
        bossWarnings.push({ type: 'circle', x: this.cx(), y: this.cy(),
          r: 340, color: '#ffdd00', timer: 65, maxTimer: 65, label: '⚠ SUPERNOVA — STAY CLOSE!' });
        screenShake = Math.max(screenShake, 20);
        spawnParticles(this.cx(), this.cy(), '#ffff88', 30);
        spawnParticles(this.cx(), this.cy(), '#ffffff', 16);
        showBossDialogue('SUPERNOVA.', 360);
        break;
      }

      // ── DIMENSION SHIFT — toggle game between 2D and 3D perspective ──
      case 'dimension': {
        this._dimensionCd = Math.ceil(90 * cdMult);
        this.postSpecialPause = 8;
        tfDimensionIs3D = !tfDimensionIs3D;
        set3DView(tfDimensionIs3D ? 'tf' : false);
        screenShake = Math.max(screenShake, 28);
        hitStopFrames = Math.max(hitStopFrames, 6);
        spawnParticles(GAME_W / 2, GAME_H / 2, '#cc88ff', 30);
        spawnParticles(GAME_W / 2, GAME_H / 2, '#ffffff', 18);
        spawnParticles(GAME_W / 2, GAME_H / 2, '#000000', 12);
        bossWarnings.push({ type: 'circle', x: GAME_W / 2, y: GAME_H / 2,
          r: 300, color: '#aa00ff', timer: 35, maxTimer: 35,
          label: tfDimensionIs3D ? 'DIMENSION SHIFT — 3D!' : 'DIMENSION SHIFT — 2D!' });
        showBossDialogue(
          tfDimensionIs3D ? randChoice(['Three dimensions now.', 'Depth has no meaning.', 'Welcome to my plane.'])
                          : randChoice(['Back to flatness.', 'You prefer this?', 'Too much for you?']),
          240
        );
        break;
      }
    }
    // Burst mode: halve post-special pause so specials chain faster
    if (_burstActive) this.postSpecialPause = Math.max(1, Math.floor(this.postSpecialPause * 0.5));
  }

  draw() {
    if (this.backstageHiding) return;
    if (this.health <= 0 && this.ragdollTimer <= 0) return;

    // ── Cosmic animation state ──────────────────────────────────────────────────
    this._floatT += 0.038;
    const floatOff = Math.sin(this._floatT) * 3.5; // -3.5 → +3.5 px vertical float

    // Glow color cycles: deep purple (#5500ff) ↔ electric blue (#0088ff)
    const gc       = (Math.sin(this._floatT * 0.42) + 1) * 0.5; // 0→1
    const glowR    = Math.round(gc * 80);
    const glowB    = Math.round(220 + gc * 35);
    const glowColor = `rgb(${glowR},0,${glowB})`;

    const cx = this.cx();
    const ty = this.y;
    const f  = this.facing;
    const s  = this.state;
    const t  = this.animTimer;

    // Visual center of body (used for aura / orbit / trail anchoring)
    const bx = cx;
    const by = ty + this.h * 0.5 + floatOff;

    // ── Energy trail ───────────────────────────────────────────────────────────
    // Push a ghost silhouette anchor point when moving
    if (s === 'walking' || s === 'jumping' || s === 'falling') {
      this._trailPts.push({ x: bx, y: by, a: 0.42 });
      if (this._trailPts.length > 10) this._trailPts.shift();
    }
    // Draw and fade existing trail points
    for (let i = this._trailPts.length - 1; i >= 0; i--) {
      const tp = this._trailPts[i];
      tp.a -= 0.047;
      if (tp.a <= 0) { this._trailPts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = tp.a;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur  = 6;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';
      // Ghost head
      ctx.beginPath();
      ctx.arc(tp.x, tp.y - 14, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      // Ghost body
      ctx.beginPath();
      ctx.moveTo(tp.x, tp.y - 8);
      ctx.lineTo(tp.x, tp.y + 10);
      ctx.stroke();
      ctx.restore();
    }

    // ── Aura field ─────────────────────────────────────────────────────────────
    ctx.save();
    const aR     = 38 + Math.sin(this._floatT * 1.15) * 5; // pulsing outer radius
    const aGrad  = ctx.createRadialGradient(bx, by, 5, bx, by, aR);
    aGrad.addColorStop(0,    'rgba(0,0,0,0)');
    aGrad.addColorStop(0.55, `rgba(${glowR},0,${glowB},0.06)`);
    aGrad.addColorStop(1,    `rgba(${glowR},0,${glowB},0.20)`);
    ctx.beginPath();
    ctx.ellipse(bx, by, aR, aR * 0.70, 0, 0, Math.PI * 2);
    ctx.fillStyle = aGrad;
    ctx.fill();
    // Bright edge ring
    ctx.globalAlpha = 0.30 + Math.sin(this._floatT * 2.2) * 0.12;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth   = 1;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.ellipse(bx, by, aR, aR * 0.70, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Inner bright ring (tighter, faster pulse, opposite phase)
    ctx.globalAlpha = 0.18 + Math.sin(this._floatT * 2.2 + Math.PI) * 0.10;
    const aRi = aR * 0.55;
    ctx.beginPath();
    ctx.ellipse(bx, by, aRi, aRi * 0.70, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // ── Orbiting particles ─────────────────────────────────────────────────────
    // 6 particles — computed purely from floatT, no array allocation each frame
    ctx.save();
    const orbitR = 28 + Math.sin(this._floatT * 0.62) * 4;
    for (let i = 0; i < 6; i++) {
      const ang  = this._floatT * 0.80 + (i / 6) * Math.PI * 2;
      const px   = bx + Math.cos(ang) * orbitR;
      const py   = by + Math.sin(ang) * orbitR * 0.52; // flattened ellipse orbit
      const ps   = 1.7 + Math.sin(this._floatT * 1.9 + i * 1.1) * 0.6;
      ctx.globalAlpha = 0.5 + Math.sin(this._floatT * 1.3 + i) * 0.28;
      ctx.shadowColor = (i % 2 === 0) ? '#ffffff' : glowColor;
      ctx.shadowBlur  = 7;
      ctx.fillStyle   = (i % 2 === 0) ? '#ffffff' : glowColor;
      ctx.beginPath();
      ctx.arc(px, py, ps, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ── Body ───────────────────────────────────────────────────────────────────
    ctx.save();

    // Invincibility blink
    if (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 1) {
      ctx.globalAlpha = 0.35;
    }

    // Size-manipulation scale (set by tfSizeTargets special)
    if (this.tfDrawScale && this.tfDrawScale !== 1) {
      const pivX = cx; const pivY = ty + this.h;
      ctx.translate(pivX, pivY);
      ctx.scale(this.tfDrawScale, this.tfDrawScale);
      ctx.translate(-pivX, -pivY);
    }

    // Ragdoll rotation
    if (this.ragdollTimer > 0) {
      ctx.translate(cx, ty + this.h * 0.45 + floatOff);
      ctx.rotate(this.ragdollAngle);
      ctx.translate(-cx, -(ty + this.h * 0.45 + floatOff));
    }

    // Apply float offset — all body drawing uses ty/cx which are hitbox coords;
    // the translate shifts the visual up/down without moving the hitbox
    ctx.translate(0, floatOff);

    const headR     = 9;
    const headCY    = ty + headR + 1;
    const neckY     = headCY + headR + 1;
    const shoulderY = neckY + 4;
    const hipY      = shoulderY + 24;
    const armLen    = 20;
    const legLen    = 22;

    // Pulsing glow intensity — slightly brighter on beat
    const glowIntensity = 9 + Math.sin(this._floatT * 2.5) * 3;

    // White outline with cycling shadow color
    ctx.shadowColor = glowColor;
    ctx.shadowBlur  = glowIntensity;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    // HEAD — solid black, white outline
    ctx.beginPath();
    ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.stroke();

    // Eyes — white dots with glow; second ghost-eye for depth
    ctx.shadowBlur = 0;
    ctx.fillStyle  = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + f * 3.5, headCY - 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Subtle colored iris ring
    ctx.shadowColor = glowColor;
    ctx.shadowBlur  = 5;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.arc(cx + f * 3.5, headCY - 1.5, 2.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur  = glowIntensity;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2.5;

    // BODY
    ctx.beginPath();
    ctx.moveTo(cx, neckY);
    ctx.lineTo(cx, hipY);
    ctx.stroke();

    // ARMS — same logic as before
    const atkP = this.attackDuration > 0 ? 1 - this.attackTimer / this.attackDuration : 0;
    let rAng, lAng;
    if (s === 'ragdoll') {
      const fl = Math.sin(t * 0.38) * 1.4;
      rAng = this.ragdollAngle * 1.2 + fl;
      lAng = this.ragdollAngle * 1.2 + Math.PI - fl;
    } else if (s === 'stunned') {
      rAng = Math.PI * 0.75; lAng = Math.PI * 0.25;
    } else if (s === 'attacking') {
      if (this._attackMode === 'punch') {
        if (f > 0) { rAng = lerp(-0.15, 0.05, atkP); lAng = lerp(Math.PI * 0.8, Math.PI * 0.62, atkP); }
        else       { rAng = lerp(Math.PI + 0.15, Math.PI - 0.05, atkP); lAng = lerp(Math.PI * 0.2, Math.PI * 0.38, atkP); }
      } else {
        rAng = f > 0 ? -0.55 : Math.PI + 0.55;
        lAng = f > 0 ?  Math.PI * 0.65 : Math.PI * 0.35;
      }
    } else if (s === 'walking') {
      const sw = Math.sin(t * 0.24) * 0.52;
      rAng = Math.PI * 0.58 + sw; lAng = Math.PI * 0.42 - sw;
    } else if (s === 'jumping' || s === 'falling') {
      rAng = -0.25; lAng = Math.PI + 0.25;
    } else {
      rAng = Math.PI * 0.58; lAng = Math.PI * 0.42;
    }

    const rEx = cx + Math.cos(rAng) * armLen;
    const rEy = shoulderY + Math.sin(rAng) * armLen;
    const lEx = cx + Math.cos(lAng) * armLen;
    const lEy = shoulderY + Math.sin(lAng) * armLen;
    ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(rEx, rEy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(lEx, lEy); ctx.stroke();

    // Fist indicator at punch impact
    if (s === 'attacking' && this._attackMode === 'punch' && atkP > 0.5) {
      ctx.beginPath();
      ctx.arc(rEx, rEy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#000000'; ctx.fill(); ctx.stroke();
    }

    // LEGS
    let rLeg, lLeg;
    if (s === 'ragdoll') {
      const lf = Math.sin(t * 0.35) * 1.1 + this.ragdollAngle * 0.8;
      rLeg = Math.PI * 0.5 + lf; lLeg = Math.PI * 0.5 - lf + 0.4;
    } else if (s === 'attacking' && this._attackMode === 'kick') {
      rLeg = f > 0 ? lerp(Math.PI * 0.52, Math.PI * 0.12, atkP) : lerp(Math.PI * 0.48, Math.PI * 0.88, atkP);
      lLeg = Math.PI * 0.52;
    } else if (s === 'walking') {
      const sw = Math.sin(t * 0.24) * 0.55;
      rLeg = Math.PI * 0.5 + sw; lLeg = Math.PI * 0.5 - sw;
    } else if (s === 'jumping') {
      rLeg = Math.PI * 0.35; lLeg = Math.PI * 0.65;
    } else {
      rLeg = Math.PI * 0.54; lLeg = Math.PI * 0.46;
    }

    const rLx = cx + Math.cos(rLeg) * legLen;
    const rLy = hipY + Math.sin(rLeg) * legLen;
    const lLx = cx + Math.cos(lLeg) * legLen;
    const lLy = hipY + Math.sin(lLeg) * legLen;
    ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(rLx, rLy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(lLx, lLy); ctx.stroke();

    // Kick foot indicator
    if (s === 'attacking' && this._attackMode === 'kick' && atkP > 0.5) {
      ctx.beginPath();
      ctx.arc(rLx, rLy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#000000'; ctx.fill(); ctx.stroke();
    }

    ctx.restore();

    // ── HP bar ─────────────────────────────────────────────────────────────────
    ctx.save();
    const barW = 64, barH = 5;
    const barX = cx - barW / 2;
    const barY = this.y - 16 + floatOff; // bar floats with body
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    const hpPct = this.health / this.maxHealth;
    ctx.fillStyle = hpPct > 0.5 ? '#ffffff' : hpPct > 0.25 ? '#aaaaaa' : '#666666';
    ctx.fillRect(barX, barY, barW * hpPct, barH);
    ctx.restore();
  }
}

// ---- True Form helper functions ----
function spawnTFBlackHoles() {
  // Spawn 2–3 black holes at random positions across the arena
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    tfBlackHoles.push({
      x:        100 + Math.random() * (GAME_W - 200),
      y:        120 + Math.random() * 200,
      r:        52,
      maxTimer: 360, // 6 seconds
      timer:    360,
      spin:     Math.random() * Math.PI * 2,
    });
  }
}

function updateTFBlackHoles() {
  if (!tfBlackHoles.length) return;
  const tf = players.find(p => p.isTrueForm);
  for (let i = tfBlackHoles.length - 1; i >= 0; i--) {
    const bh = tfBlackHoles[i];
    bh.timer--;

    if (bh.timer <= 0) {
      // Implosion on expiry — outward KB burst
      screenShake = Math.max(screenShake, 16);
      spawnParticles(bh.x, bh.y, '#ffffff', 18);
      spawnParticles(bh.x, bh.y, '#440066', 12);
      for (const p of players) {
        if (p.isTrueForm || p.health <= 0) continue;
        const dx = p.cx() - bh.x;
        const dy = (p.y + p.h / 2) - bh.y;
        const d  = Math.hypot(dx, dy);
        if (d < 140 && d > 0.5) {
          // Push outward violently
          p.vx += (dx / d) * 12;
          p.vy += (dy / d) * 8;
        }
      }
      tfBlackHoles.splice(i, 1);
      // After ALL black holes expire, chain into gamma beam (phase 2+ only)
      if (tfBlackHoles.length === 0 && tf && !tfGammaBeam && tf._chainCd <= 0 && tf.getPhase && tf.getPhase() >= 2) {
        const chainTgt = players.find(p => !p.isTrueForm && p.health > 0);
        if (chainTgt) {
          tf._chainCd = 36;
          setTimeout(() => {
            if (!gameRunning || !tf) return;
            tf._doSpecial('gammaBeam', chainTgt);
          }, 500);
        }
      }
      continue;
    }

    // Pull ramps: stronger at start of life (when bh is young = timer near maxTimer)
    const age = 1 - bh.timer / bh.maxTimer; // 0 = just spawned, 1 = about to expire
    // Pull is strongest mid-life; final 10% slows as implosion approaches
    const pullMult = age < 0.5 ? 0.5 + age * 1.4 : 1.2 - (age - 0.5) * 0.6;

    for (const p of players) {
      if (p.isTrueForm || p.health <= 0) continue;
      const dx = bh.x - p.cx();
      const dy = bh.y - (p.y + p.h / 2);
      const d  = Math.hypot(dx, dy);
      if (d < 180 && d > 0.5) {
        const pull = 0.65 * (1 - d / 180) * pullMult;
        p.vx += (dx / d) * pull;
        p.vy += (dy / d) * pull * 0.75;
      }
      // Event horizon damage
      if (d < bh.r + 8 && p.invincible <= 0) {
        dealDamage(tf || players[1], p, 36, 0);
        spawnParticles(p.cx(), p.cy(), '#000000', 10);
        spawnParticles(p.cx(), p.cy(), '#aa00ff',  6);
        hitStopFrames = Math.max(hitStopFrames, 8);
      }
    }
  }
}

function drawTFBlackHoles() {
  for (const bh of tfBlackHoles) {
    if (!isFinite(bh.x) || !isFinite(bh.y) || !isFinite(bh.r) || bh.r <= 0) continue;
    ctx.save();
    const alpha = bh.timer < 60 ? bh.timer / 60 : 1;
    bh.spin = (bh.spin || 0) + 0.025;

    // Gravitational lensing glow (outermost)
    const lensR = bh.r * 2.6;
    const gLens = ctx.createRadialGradient(bh.x, bh.y, bh.r * 1.1, bh.x, bh.y, lensR);
    gLens.addColorStop(0, `rgba(80,0,140,${0.22 * alpha})`);
    gLens.addColorStop(0.5, `rgba(30,0,60,${0.12 * alpha})`);
    gLens.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gLens;
    ctx.beginPath(); ctx.arc(bh.x, bh.y, lensR, 0, Math.PI * 2); ctx.fill();

    // Accretion disk (ellipse, rotates)
    ctx.save();
    ctx.translate(bh.x, bh.y);
    ctx.rotate(bh.spin);
    ctx.scale(1, 0.28);
    const diskInner = bh.r * 1.05, diskOuter = bh.r * 1.9;
    const gDisk = ctx.createRadialGradient(0, 0, diskInner, 0, 0, diskOuter);
    gDisk.addColorStop(0, `rgba(255,140,0,${0.85 * alpha})`);
    gDisk.addColorStop(0.4, `rgba(255,60,0,${0.55 * alpha})`);
    gDisk.addColorStop(0.75, `rgba(120,20,180,${0.3 * alpha})`);
    gDisk.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gDisk;
    ctx.beginPath(); ctx.arc(0, 0, diskOuter, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Photon ring (bright orange/white ring at event horizon)
    ctx.save();
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 14;
    ctx.strokeStyle = `rgba(255,180,60,${0.75 * alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.r * 1.08, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Gravitational distortion ripples — expanding rings at varying alpha
    const age = bh.maxTimer > 0 ? 1 - bh.timer / bh.maxTimer : 0;
    ctx.save();
    ctx.strokeStyle = `rgba(140,0,255,${0.14 * alpha})`;
    ctx.lineWidth = 1;
    for (let ri = 0; ri < 3; ri++) {
      const rr = bh.r * 1.5 + ri * 28 + Math.sin(bh.spin * 2 + ri * 1.2) * 8;
      ctx.beginPath(); ctx.arc(bh.x, bh.y, rr, 0, Math.PI * 2); ctx.stroke();
    }
    // Pulsing outer gravity field (intensifies as black hole ages)
    ctx.strokeStyle = `rgba(100,0,200,${(0.05 + age * 0.12) * alpha})`;
    ctx.lineWidth = 2 + age * 3;
    ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.r * 2.8 + Math.sin(bh.spin * 3) * 12, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Black hole core (perfectly dark)
    const g = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bh.r);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(0.85, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.r, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
}

function tfWarpArena(key) {
  if (!ARENAS[key]) return;
  currentArenaKey = key;
  currentArena    = ARENAS[key];
  // Randomize layout if safe
  if (key !== 'lava') randomizeArenaLayout(key);
  generateBgElements();
  initMapPerks(key);
  // Reset floor state
  const floorPl = currentArena.platforms.find(p => p.isFloor);
  if (floorPl) floorPl.isFloorDisabled = false;
  tfFloorRemoved = false;
  if (settings.screenShake) screenShake = Math.max(screenShake, 22);
  spawnParticles(GAME_W / 2, GAME_H / 2, '#ffffff', 40);
}

function tfPortalTeleport(tf, target) {
  if (!target || !tf) return;
  const destX = clamp(target.x + target.w / 2 - tf.w / 2, 10, GAME_W - tf.w - 10);
  const destY = target.y - tf.h - 4;
  // Black portal flash
  spawnParticles(tf.cx(), tf.cy(), '#000000', 20);
  spawnParticles(tf.cx(), tf.cy(), '#ffffff', 10);
  setTimeout(() => {
    if (!gameRunning) return;
    tf.x  = destX;
    tf.y  = destY;
    tf.vx = 0; tf.vy = 0;
    spawnParticles(tf.cx(), tf.cy(), '#000000', 20);
    spawnParticles(tf.cx(), tf.cy(), '#ffffff', 10);
    if (settings.screenShake) screenShake = Math.max(screenShake, 12);
  }, 350);
}

function tfSetSize(fighter, scale) {
  if (!fighter) return;
  // Restore original size first
  if (tfSizeTargets.has(fighter)) {
    const orig = tfSizeTargets.get(fighter);
    fighter.w = orig.w; fighter.h = orig.h;
  } else {
    tfSizeTargets.set(fighter, { w: fighter.w, h: fighter.h });
  }
  fighter.w        = Math.round(fighter.w * scale);
  fighter.h        = Math.round(fighter.h * scale);
  fighter.tfDrawScale = scale;
}

// ============================================================
// CINEMATIC MANAGER
// ============================================================
function startCinematic(seq) {
  if (onlineMode) return; // skip cinematics in online multiplayer (sync too complex)
  if (activeCinematic) endCinematic();
  activeCinematic = Object.assign({ timer: 0 }, seq);
}

function updateCinematic() {
  if (!activeCinematic) return;
  activeCinematic.timer++;
  const t = activeCinematic.timer / 60; // seconds
  activeCinematic.update(t);
  if (activeCinematic.timer >= activeCinematic.durationFrames) {
    endCinematic();
  }
}

function endCinematic() {
  if (!activeCinematic) return;
  if (activeCinematic.onEnd) activeCinematic.onEnd();
  activeCinematic = null;
  slowMotion = 1.0;
  cinematicCamOverride = false;
}

// ============================================================
// CINEMATIC SEQUENCES — one factory per boss × phase
// ============================================================
function _makeBossPhase2Cinematic(boss) {
  return {
    durationFrames: 150, // 2.5 s
    _slamFired: false, _roarFired: false,
    _phaseLabel: { text: '— PHASE II —', color: '#cc00ee' },
    update(t) {
      // Slow motion ramp: 0.15× during cinematic, fade out at end
      if (t < 0.4)      slowMotion = Math.max(0.15, 1 - t * 2.1);
      else if (t > 1.8) slowMotion = Math.min(1.0, (t - 1.8) / 0.7);
      else              slowMotion = 0.15;

      // Camera zoom in on boss
      cinematicCamOverride = t < 2.2;
      if (cinematicCamOverride && boss) {
        cinematicZoomTarget = 1 + Math.min(0.55, t * 0.4);
        cinematicFocusX = boss.cx();
        cinematicFocusY = boss.cy();
      }

      // 0.6 s: slam — rings + particles + player knockback
      if (t >= 0.6 && !this._slamFired) {
        this._slamFired = true;
        if (boss) {
          for (let i = 0; i < 5; i++) {
            phaseTransitionRings.push({ cx: boss.cx(), cy: boss.cy(),
              r: 5 + i*14, maxR: 240 + i*30, timer: 65+i*11, maxTimer: 65+i*11,
              color: i%2===0 ? '#cc00ee' : '#ff44ff', lineWidth: 4-i*0.5 });
          }
          spawnParticles(boss.cx(), boss.cy(), '#cc00ee', 40);
          spawnParticles(boss.cx(), boss.cy(), '#ffffff', 25);
          spawnParticles(boss.cx(), boss.cy(), '#ff44ff', 18);
          screenShake = Math.max(screenShake, 32);
          for (const p of players) {
            if (p.isBoss || p.health <= 0) continue;
            const dir = p.cx() >= boss.cx() ? 1 : -1;
            p.vx += dir * 13; p.vy = Math.min(p.vy, -9);
            p.hurtTimer = Math.max(p.hurtTimer, 16);
          }
        }
      }
      // 1.05 s: dialogue
      if (t >= 1.05 && !this._roarFired) {
        this._roarFired = true;
        showBossDialogue('Phase two begins. This is where it gets REAL.', 220);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

function _makeBossPhase3Cinematic(boss) {
  return {
    durationFrames: 180, // 3.0 s
    _slamFired: false, _roarFired: false,
    _phaseLabel: { text: '— PHASE III —', color: '#ff44aa' },
    update(t) {
      if (t < 0.3)      slowMotion = Math.max(0.05, 1 - t * 3.2);
      else if (t > 2.2) slowMotion = Math.min(1.0, (t - 2.2) / 0.8);
      else              slowMotion = 0.05;

      cinematicCamOverride = t < 2.6;
      if (cinematicCamOverride && boss) {
        cinematicZoomTarget = Math.min(1.8, 1 + t * 0.55);
        cinematicFocusX = boss.cx();
        cinematicFocusY = boss.cy();
      }

      if (t >= 0.55 && !this._slamFired) {
        this._slamFired = true;
        if (boss) {
          for (let i = 0; i < 6; i++) {
            phaseTransitionRings.push({ cx: boss.cx(), cy: boss.cy(),
              r: 5+i*12, maxR: 340+i*30, timer: 70+i*12, maxTimer: 70+i*12,
              color: i%2===0 ? '#cc00ee' : '#ff0077', lineWidth: 5-i*0.6 });
          }
          spawnParticles(boss.cx(), boss.cy(), '#cc00ee', 55);
          spawnParticles(boss.cx(), boss.cy(), '#ffffff', 35);
          spawnParticles(boss.cx(), boss.cy(), '#ff0000', 22);
          screenShake = Math.max(screenShake, 48);
          if (settings.phaseFlash) bossPhaseFlash = 70;
          for (const p of players) {
            if (p.isBoss || p.health <= 0) continue;
            const dir = p.cx() >= boss.cx() ? 1 : -1;
            p.vx += dir * 20; p.vy = Math.min(p.vy, -14);
            p.hurtTimer = Math.max(p.hurtTimer, 22);
          }
        }
      }
      if (t >= 1.2 && !this._roarFired) {
        this._roarFired = true;
        showBossDialogue('PHASE THREE. FEEL MY FULL POWER!', 250);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

function _makeTFPhase2Cinematic(tf) {
  return {
    durationFrames: 150, // 2.5 s
    _burstFired: false, _roarFired: false,
    _phaseLabel: { text: '— FORM II —', color: '#aaaaaa' },
    update(t) {
      if (t < 0.35)     slowMotion = Math.max(0.1, 1 - t * 2.6);
      else if (t > 1.8) slowMotion = Math.min(1.0, (t - 1.8) / 0.7);
      else              slowMotion = 0.1;

      cinematicCamOverride = t < 2.1;
      if (cinematicCamOverride && tf) {
        cinematicZoomTarget = Math.min(1.5, 1 + t * 0.4);
        cinematicFocusX = tf.cx(); cinematicFocusY = tf.cy();
      }

      if (t >= 0.65 && !this._burstFired) {
        this._burstFired = true;
        if (tf) {
          for (let i = 0; i < 5; i++) {
            phaseTransitionRings.push({ cx: tf.cx(), cy: tf.cy(),
              r: 5+i*13, maxR: 260+i*28, timer: 62+i*11, maxTimer: 62+i*11,
              color: i%2===0 ? '#ffffff' : '#888888', lineWidth: 4-i*0.5 });
          }
          spawnParticles(tf.cx(), tf.cy(), '#ffffff', 45);
          spawnParticles(tf.cx(), tf.cy(), '#000000', 30);
          spawnParticles(tf.cx(), tf.cy(), '#aaaaaa', 20);
          screenShake = Math.max(screenShake, 36);
          for (const p of players) {
            if (p.isBoss || p.health <= 0) continue;
            const dir = p.cx() >= tf.cx() ? 1 : -1;
            p.vx += dir * 14; p.vy = Math.min(p.vy, -10);
            p.hurtTimer = Math.max(p.hurtTimer, 18);
          }
        }
      }
      if (t >= 1.1 && !this._roarFired) {
        this._roarFired = true;
        showBossDialogue('You surprised me... now feel TRUE despair.', 250);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

function _makeTFPhase3Cinematic(tf) {
  return {
    durationFrames: 210, // 3.5 s
    _voidFired: false, _roarFired: false,
    _phaseLabel: { text: '— TRUE FORM —', color: '#ffffff' },
    update(t) {
      if (t < 0.25)     slowMotion = Math.max(0.02, 1 - t * 3.9);
      else if (t > 2.7) slowMotion = Math.min(1.0, (t - 2.7) / 0.8);
      else              slowMotion = 0.02;

      cinematicCamOverride = t < 3.1;
      if (cinematicCamOverride && tf) {
        cinematicZoomTarget = Math.min(2.0, 1 + t * 0.55);
        cinematicFocusX = tf.cx(); cinematicFocusY = tf.cy();
      }

      if (t >= 0.5 && !this._voidFired) {
        this._voidFired = true;
        if (tf) {
          for (let i = 0; i < 7; i++) {
            phaseTransitionRings.push({ cx: tf.cx(), cy: tf.cy(),
              r: 5+i*10, maxR: 400+i*22, timer: 72+i*13, maxTimer: 72+i*13,
              color: i%2===0 ? '#ffffff' : '#000000', lineWidth: 5-i*0.5 });
          }
          spawnParticles(tf.cx(), tf.cy(), '#ffffff', 65);
          spawnParticles(tf.cx(), tf.cy(), '#000000', 50);
          spawnParticles(tf.cx(), tf.cy(), '#555555', 28);
          screenShake = Math.max(screenShake, 55);
          if (settings.phaseFlash) bossPhaseFlash = 80;
          for (const p of players) {
            if (p.isBoss || p.health <= 0) continue;
            const dir = p.cx() >= tf.cx() ? 1 : -1;
            p.vx += dir * 24; p.vy = Math.min(p.vy, -18);
            p.hurtTimer = Math.max(p.hurtTimer, 25);
          }
        }
      }
      if (t >= 1.5 && !this._roarFired) {
        this._roarFired = true;
        showBossDialogue('FULL RELEASE. THE END IS NOW.', 280);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

// ============================================================
// CINEMATIC SEQUENCES — ForestBeast and Yeti
// ============================================================
function _makeBeastPhase2Cinematic(beast) {
  return {
    durationFrames: 150, // 2.5 s
    _rageFired: false, _roarFired: false,
    _phaseLabel: { text: '— BEAST UNLEASHED —', color: '#cc4400' },
    update(t) {
      // Slow motion: slam on slow-mo, fade back at end
      if (t < 0.3)      slowMotion = Math.max(0.15, 1 - t * 3.0);
      else if (t > 1.8) slowMotion = Math.min(1.0,  (t - 1.8) / 0.7);
      else              slowMotion = 0.15;

      // Camera zoom to beast
      cinematicCamOverride = t < 2.2;
      if (cinematicCamOverride && beast) {
        cinematicZoomTarget = Math.min(1.6, 1 + t * 0.45);
        cinematicFocusX = beast.cx();
        cinematicFocusY = beast.cy();
      }

      // 0.5 s: ground slam — rings + particles + knockback
      if (t >= 0.5 && !this._rageFired) {
        this._rageFired = true;
        if (beast) {
          for (let i = 0; i < 5; i++) {
            phaseTransitionRings.push({
              cx: beast.cx(), cy: beast.cy(),
              r: 5 + i * 12, maxR: 260 + i * 28,
              timer: 65 + i * 11, maxTimer: 65 + i * 11,
              color: i % 2 === 0 ? '#cc4400' : '#ff8800', lineWidth: 4 - i * 0.5
            });
          }
          spawnParticles(beast.cx(), beast.cy(), '#cc4400', 40);
          spawnParticles(beast.cx(), beast.cy(), '#ff8800', 25);
          spawnParticles(beast.cx(), beast.cy(), '#ffff00', 12);
          screenShake = Math.max(screenShake, 35);
          for (const p of players) {
            if (p.health <= 0) continue;
            const dir = p.cx() >= beast.cx() ? 1 : -1;
            p.vx += dir * 11;  p.vy = Math.min(p.vy, -8);
            p.hurtTimer = Math.max(p.hurtTimer, 14);
          }
        }
      }
      // 1.0 s: roar text
      if (t >= 1.0 && !this._roarFired) {
        this._roarFired = true;
        if (settings.dmgNumbers && beast)
          damageTexts.push(new DamageText(beast.cx(), beast.y - 30, 'RAAAWR!', '#ff6600'));
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

function _makeYetiPhase2Cinematic(yetiEnt) {
  return {
    durationFrames: 180, // 3.0 s
    _leapFired: false, _slamFired: false, _roarFired: false,
    _phaseLabel: { text: '— BLIZZARD RAGE —', color: '#88ccff' },
    update(t) {
      if (t < 0.3)      slowMotion = Math.max(0.10, 1 - t * 3.1);
      else if (t > 2.2) slowMotion = Math.min(1.0,  (t - 2.2) / 0.8);
      else              slowMotion = 0.10;

      // Camera zoom to yeti
      cinematicCamOverride = t < 2.6;
      if (cinematicCamOverride && yetiEnt) {
        cinematicZoomTarget = Math.min(1.7, 1 + t * 0.48);
        cinematicFocusX = yetiEnt.cx();
        cinematicFocusY = yetiEnt.cy();
      }

      // 0.5 s: yeti leaps upward
      if (t >= 0.5 && !this._leapFired) {
        this._leapFired = true;
        if (yetiEnt) yetiEnt.vy = Math.min(yetiEnt.vy, -22);
      }

      // 1.2 s: slam down + ice shockwave
      if (t >= 1.2 && !this._slamFired) {
        this._slamFired = true;
        if (yetiEnt) {
          yetiEnt.vy = Math.max(yetiEnt.vy, 18); // force downward
          for (let i = 0; i < 6; i++) {
            phaseTransitionRings.push({
              cx: yetiEnt.cx(), cy: yetiEnt.cy(),
              r: 5 + i * 12, maxR: 300 + i * 30,
              timer: 68 + i * 12, maxTimer: 68 + i * 12,
              color: i % 2 === 0 ? '#88ccff' : '#ffffff', lineWidth: 4.5 - i * 0.5
            });
          }
          spawnParticles(yetiEnt.cx(), yetiEnt.cy(), '#aaddff', 50);
          spawnParticles(yetiEnt.cx(), yetiEnt.cy(), '#ffffff', 30);
          spawnParticles(yetiEnt.cx(), yetiEnt.cy(), '#0066ff', 18);
          screenShake = Math.max(screenShake, 42);
          if (settings.phaseFlash) bossPhaseFlash = 55;
          for (const p of players) {
            if (p.health <= 0) continue;
            const dir = p.cx() >= yetiEnt.cx() ? 1 : -1;
            p.vx += dir * 16;  p.vy = Math.min(p.vy, -12);
            p.stunTimer  = Math.max(p.stunTimer  || 0, 40);
            p.hurtTimer  = Math.max(p.hurtTimer, 18);
          }
        }
      }
      // 1.8 s: roar text
      if (t >= 1.8 && !this._roarFired) {
        this._roarFired = true;
        if (settings.dmgNumbers && yetiEnt)
          damageTexts.push(new DamageText(yetiEnt.cx(), yetiEnt.y - 35, 'BLIZZARD!', '#aaddff'));
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

// ============================================================
// MID-FIGHT CINEMATICS — see js/smc-cinematics.js for all 6 factory fns
// ============================================================
// _makeBossWarning75Cinematic, _makeBossRage40Cinematic, _makeBossDesp10Cinematic,
// _makeTFEntryCinematic, _makeTFReality50Cinematic, _makeTFDesp15Cinematic
// are all defined in smc-cinematics.js using the cinScript() API.
/* DELETED OLD IMPLEMENTATIONS BELOW — kept as dead code marker only */
function _DELETED_makeBossWarning75Cinematic(boss) {
  return {
    durationFrames: 180, // 3 s
    _warnFired: false, _line1Fired: false, _line2Fired: false,
    _phaseLabel: { text: '— MY WORLD —', color: '#cc00ee' },
    update(t) {
      if (t < 0.3)      slowMotion = Math.max(0.18, 1 - t * 2.7);
      else if (t > 2.2) slowMotion = Math.min(1.0, (t - 2.2) / 0.8);
      else              slowMotion = 0.18;

      cinematicCamOverride = t < 2.6;
      if (cinematicCamOverride && boss) {
        cinematicZoomTarget = Math.min(1.4, 1 + t * 0.28);
        cinematicFocusX = boss.cx();
        cinematicFocusY = boss.cy() - 30 * Math.min(1, t * 1.2); // camera drifts upward
      }

      // 0.5 s: boss floats upward + rings + hazard warning begins
      if (t >= 0.5 && !this._warnFired) {
        this._warnFired = true;
        if (boss) {
          boss.vy = Math.min(boss.vy, -14); // float upward
          for (let i = 0; i < 4; i++) {
            phaseTransitionRings.push({ cx: boss.cx(), cy: boss.cy(),
              r: 8 + i * 18, maxR: 200 + i * 40, timer: 60 + i * 12, maxTimer: 60 + i * 12,
              color: i % 2 === 0 ? '#aa00cc' : '#ff88ff', lineWidth: 3.5 - i * 0.5 });
          }
          spawnParticles(boss.cx(), boss.cy(), '#cc00ee', 30);
          spawnParticles(boss.cx(), boss.cy(), '#ffffff', 18);
          screenShake = Math.max(screenShake, 22);
          // Trigger arena hazard warning early
          if (typeof bossFloorState !== 'undefined' && bossFloorState === 'normal') {
            bossFloorState = 'warning';
            bossFloorTimer = 300;
            bossFloorType  = Math.random() < 0.5 ? 'lava' : 'void';
          }
        }
      }
      if (t >= 0.9 && !this._line1Fired) {
        this._line1Fired = true;
        showBossDialogue('You fight... in a world I created.', 200);
      }
      if (t >= 1.8 && !this._line2Fired) {
        this._line2Fired = true;
        showBossDialogue('And I can break it.', 200);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

function _DELETED_makeBossRage40Cinematic(boss) {
  return {
    durationFrames: 240, // 4 s
    _grabFired: false, _slamFired: false, _line1Fired: false, _line2Fired: false,
    _throwTarget: null,
    _phaseLabel: { text: '— ENOUGH. —', color: '#ff0044' },
    update(t) {
      // Phase 1 (0–0.4s): freeze into the moment
      // Phase 2 (0.4–1.1s): speed up so the throw VISUALLY travels across the screen
      // Phase 3 (1.1–1.6s): freeze for impact / slam
      // Phase 4 (1.6–3.5s): slow crawl for dialogue, then ramp back
      if      (t < 0.4)  slowMotion = Math.max(0.05, 1 - t * 2.4);   // ramp down to near-freeze
      else if (t < 1.1)  slowMotion = Math.min(0.55, (t - 0.4) * 0.8); // ramp UP — throw is visible
      else if (t < 1.6)  slowMotion = Math.max(0.05, 0.55 - (t - 1.1) * 1.1); // freeze for slam impact
      else if (t > 3.7)  slowMotion = Math.min(1.0, (t - 3.7) / 0.3);
      else               slowMotion = 0.06;                              // crawl for dialogue

      cinematicCamOverride = t < 3.9;
      if (cinematicCamOverride && boss) {
        const trackTarget = this._throwTarget || players.find(p => !p.isBoss && p.health > 0);
        // During throw (0.4–1.1s) follow the flying player; otherwise focus between boss & player
        const focusX = (t >= 0.4 && t < 1.2 && trackTarget)
          ? trackTarget.cx()
          : trackTarget ? (boss.cx() + trackTarget.cx()) * 0.5 : boss.cx();
        cinematicZoomTarget = t < 0.4 ? Math.min(1.8, 1 + t * 2.0)  // zoom in fast
                            : t < 1.1 ? Math.max(0.9, 1.8 - (t - 0.4) * 1.3) // zoom out to follow throw
                            : Math.min(1.5, 0.9 + (t - 1.1) * 0.8);
        cinematicFocusX = focusX;
        cinematicFocusY = trackTarget ? trackTarget.cy() : boss.cy();
      }

      // 0.4 s: boss teleports directly behind player and hurls them
      if (t >= 0.4 && !this._grabFired) {
        this._grabFired = true;
        const target = players.find(p => !p.isBoss && p.health > 0);
        if (boss && target) {
          this._throwTarget = target;
          // Teleport boss right behind the player (same side as their back)
          const facingRight = target.vx >= 0;
          const behindX = facingRight ? target.cx() - 55 : target.cx() + 55;
          boss.x = behindX - boss.w / 2;
          boss.y = target.y;
          boss.vy = 0;
          spawnParticles(boss.cx(), boss.cy(), '#cc00ee', 35);
          spawnParticles(boss.cx(), boss.cy(), '#ff44ff', 20);
          spawnParticles(target.cx(), target.cy(), '#ff0044', 20);
          screenShake = Math.max(screenShake, 22);
          // Throw: opposite direction to behind offset, arc upward
          const throwDir = facingRight ? 1 : -1;
          target.vx = throwDir * 22;
          target.vy = -14;
          target.hurtTimer = Math.max(target.hurtTimer, 35);
          target.stunTimer  = Math.max(target.stunTimer || 0, 30); // brief stun so player can't air-dodge
        }
      }

      // 1.1 s: boss slam hits the ground as player lands — shockwave
      if (t >= 1.1 && !this._slamFired) {
        this._slamFired = true;
        if (boss) {
          boss.vy = 28;
          const slamX = this._throwTarget ? (boss.cx() + this._throwTarget.cx()) * 0.5 : boss.cx();
          for (let i = 0; i < 6; i++) {
            phaseTransitionRings.push({ cx: slamX, cy: GAME_H - 60,
              r: 5 + i * 18, maxR: 320 + i * 40, timer: 70 + i * 12, maxTimer: 70 + i * 12,
              color: i % 2 === 0 ? '#ff0044' : '#ff8800', lineWidth: 4.5 - i * 0.5 });
          }
          spawnParticles(slamX, GAME_H - 60, '#ff0044', 55);
          spawnParticles(slamX, GAME_H - 60, '#ffffff', 30);
          screenShake = Math.max(screenShake, 52);
          for (const p of players) {
            if (p.isBoss || p.health <= 0) continue;
            const dir = p.cx() >= slamX ? 1 : -1;
            p.vx += dir * 14; p.vy = Math.min(p.vy, -10);
            p.hurtTimer = Math.max(p.hurtTimer, 18);
          }
        }
      }

      if (t >= 1.5 && !this._line1Fired) {
        this._line1Fired = true;
        showBossDialogue('Enough.', 140);
      }
      if (t >= 2.2 && !this._line2Fired) {
        this._line2Fired = true;
        showBossDialogue('I will ERASE you.', 220);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

function _DELETED_makeBossDesp10Cinematic(boss) {
  return {
    durationFrames: 180, // 3 s
    _staggerFired: false, _despFired: false, _line1Fired: false, _line2Fired: false,
    _phaseLabel: { text: '— IMPOSSIBLE —', color: '#ffffff' },
    update(t) {
      if (t < 0.2)      slowMotion = Math.max(0.04, 1 - t * 4.8);
      else if (t > 2.2) slowMotion = Math.min(1.0, (t - 2.2) / 0.8);
      else              slowMotion = 0.04;

      cinematicCamOverride = t < 2.6;
      if (cinematicCamOverride && boss) {
        cinematicZoomTarget = Math.min(1.85, 1 + t * 0.55);
        cinematicFocusX = boss.cx();
        cinematicFocusY = boss.cy();
      }

      // 0.35 s: boss staggers visually — shake + rings
      if (t >= 0.35 && !this._staggerFired) {
        this._staggerFired = true;
        if (boss) {
          boss.hurtTimer = 30;
          boss.stunTimer = 18;
          boss.vx *= 0.1;
          for (let i = 0; i < 6; i++) {
            phaseTransitionRings.push({ cx: boss.cx(), cy: boss.cy(),
              r: 8 + i * 12, maxR: 180 + i * 25, timer: 55 + i * 10, maxTimer: 55 + i * 10,
              color: i % 2 === 0 ? '#ffffff' : '#ff4444', lineWidth: 3 - i * 0.35 });
          }
          spawnParticles(boss.cx(), boss.cy(), '#ffffff', 50);
          spawnParticles(boss.cx(), boss.cy(), '#ff0000', 32);
          spawnParticles(boss.cx(), boss.cy(), '#cc00ee', 20);
          screenShake = Math.max(screenShake, 40);
          if (settings.phaseFlash) bossPhaseFlash = 60;
        }
      }

      // 1.0 s: activate desperation mode
      if (t >= 1.0 && !this._despFired) {
        this._despFired = true;
        bossDesperationMode  = true;
        bossDesperationFlash = 90;
        if (boss) {
          bossStaggerTimer = 0; // end stagger so it can fight
        }
      }

      if (t >= 0.8 && !this._line1Fired) {
        this._line1Fired = true;
        showBossDialogue('Impossible...', 200);
      }
      if (t >= 1.5 && !this._line2Fired) {
        this._line2Fired = true;
        showBossDialogue('You refuse to break!', 220);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

// ============================================================
// MID-FIGHT CINEMATICS — True Form (entry, 50%, 15%)
// ============================================================
function _DELETED_makeTFEntryCinematic(tf) {
  return {
    durationFrames: 240, // 4 s
    _burstFired: false, _line1Fired: false, _line2Fired: false,
    _phaseLabel: { text: '— TRUE FORM —', color: '#ffffff' },
    update(t) {
      if (t < 0.3)      slowMotion = Math.max(0.08, 1 - t * 3.1);
      else if (t > 3.1) slowMotion = Math.min(1.0, (t - 3.1) / 0.9);
      else              slowMotion = 0.08;

      cinematicCamOverride = t < 3.6;
      if (cinematicCamOverride && tf) {
        cinematicZoomTarget = Math.min(1.65, 1 + t * 0.38);
        cinematicFocusX = tf.cx();
        cinematicFocusY = tf.cy();
      }

      // 0.6 s: energy burst pushes players, rings expand
      if (t >= 0.6 && !this._burstFired) {
        this._burstFired = true;
        if (tf) {
          for (let i = 0; i < 6; i++) {
            phaseTransitionRings.push({ cx: tf.cx(), cy: tf.cy(),
              r: 5 + i * 14, maxR: 320 + i * 30, timer: 68 + i * 12, maxTimer: 68 + i * 12,
              color: i % 2 === 0 ? '#ffffff' : '#333333', lineWidth: 4 - i * 0.5 });
          }
          spawnParticles(tf.cx(), tf.cy(), '#ffffff', 55);
          spawnParticles(tf.cx(), tf.cy(), '#000000', 40);
          spawnParticles(tf.cx(), tf.cy(), '#888888', 25);
          screenShake = Math.max(screenShake, 38);
          if (settings.phaseFlash) bossPhaseFlash = 55;
          for (const p of players) {
            if (p.isBoss || p.health <= 0) continue;
            const dir = p.cx() >= tf.cx() ? 1 : -1;
            p.vx += dir * 18; p.vy = Math.min(p.vy, -11);
            p.hurtTimer = Math.max(p.hurtTimer, 20);
          }
        }
      }
      if (t >= 1.2 && !this._line1Fired) {
        this._line1Fired = true;
        showBossDialogue('You forced my hand.', 220);
      }
      if (t >= 2.1 && !this._line2Fired) {
        this._line2Fired = true;
        showBossDialogue('Witness my TRUE POWER.', 240);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

function _DELETED_makeTFReality50Cinematic(tf) {
  return {
    durationFrames: 210, // 3.5 s
    _gravFired: false, _stormFired: false, _lineFired: false,
    _phaseLabel: { text: '— REALITY BENDS —', color: '#cccccc' },
    update(t) {
      if (t < 0.3)      slowMotion = Math.max(0.12, 1 - t * 2.9);
      else if (t > 2.4) slowMotion = Math.min(1.0, (t - 2.4) / 1.1);
      else              slowMotion = 0.12;

      cinematicCamOverride = t < 3.2;
      if (cinematicCamOverride && tf) {
        // Slowly zoom out to show whole arena
        cinematicZoomTarget = Math.max(0.7, 1.4 - t * 0.22);
        cinematicFocusX = GAME_W / 2;
        cinematicFocusY = GAME_H / 2;
      }

      // 0.5 s: gravity reverses briefly — players float
      if (t >= 0.5 && !this._gravFired) {
        this._gravFired = true;
        tfGravityInverted = true;
        tfGravityTimer    = 180; // 3 s of inverted gravity
        if (tf) {
          for (let i = 0; i < 5; i++) {
            phaseTransitionRings.push({ cx: tf.cx(), cy: tf.cy(),
              r: 6 + i * 15, maxR: 280 + i * 32, timer: 64 + i * 11, maxTimer: 64 + i * 11,
              color: i % 2 === 0 ? '#ffffff' : '#666666', lineWidth: 3.5 - i * 0.5 });
          }
          spawnParticles(tf.cx(), tf.cy(), '#ffffff', 40);
          spawnParticles(tf.cx(), tf.cy(), '#888888', 28);
          screenShake = Math.max(screenShake, 34);
        }
      }

      if (t >= 0.9 && !this._lineFired) {
        this._lineFired = true;
        showBossDialogue('Reality... bends to me.', 230);
      }

      // 2.0 s: trigger meteor storm special for TrueForm
      if (t >= 2.0 && !this._stormFired) {
        this._stormFired = true;
        if (tf && typeof tf._doSpecial === 'function') {
          const target = players.find(p => !p.isBoss && p.health > 0);
          if (target) tf._doSpecial('meteorCrash', target);
        }
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

function _DELETED_makeTFDesp15Cinematic(tf) {
  return {
    durationFrames: 180, // 3 s
    _crackFired: false, _despFired: false, _lineFired: false,
    _phaseLabel: { text: '— WE FALL TOGETHER —', color: '#ffffff' },
    update(t) {
      if (t < 0.2)      slowMotion = Math.max(0.03, 1 - t * 4.9);
      else if (t > 2.1) slowMotion = Math.min(1.0, (t - 2.1) / 0.9);
      else              slowMotion = 0.03;

      cinematicCamOverride = t < 2.7;
      if (cinematicCamOverride && tf) {
        cinematicZoomTarget = Math.min(2.0, 1 + t * 0.65);
        cinematicFocusX = tf.cx();
        cinematicFocusY = tf.cy();
      }

      // 0.3 s: massive rings, flash, arena destabilises
      if (t >= 0.3 && !this._crackFired) {
        this._crackFired = true;
        if (tf) {
          for (let i = 0; i < 7; i++) {
            phaseTransitionRings.push({ cx: tf.cx(), cy: tf.cy(),
              r: 5 + i * 11, maxR: 380 + i * 24, timer: 70 + i * 14, maxTimer: 70 + i * 14,
              color: i % 2 === 0 ? '#ffffff' : '#000000', lineWidth: 5 - i * 0.6 });
          }
          spawnParticles(tf.cx(), tf.cy(), '#ffffff', 70);
          spawnParticles(tf.cx(), tf.cy(), '#000000', 55);
          spawnParticles(tf.cx(), tf.cy(), '#555555', 30);
          screenShake = Math.max(screenShake, 55);
          if (settings.phaseFlash) bossPhaseFlash = 85;
          for (const p of players) {
            if (p.isBoss || p.health <= 0) continue;
            const dir = p.cx() >= tf.cx() ? 1 : -1;
            p.vx += dir * 22; p.vy = Math.min(p.vy, -16);
            p.hurtTimer = Math.max(p.hurtTimer, 24);
          }
        }
      }

      // 1.2 s: activate desperation + remove floor + trigger hazards
      if (t >= 1.2 && !this._despFired) {
        this._despFired = true;
        bossDesperationMode  = true;
        bossDesperationFlash = 90;
        // Remove floor for dramatic effect
        if (!tfFloorRemoved) {
          tfFloorRemoved = true;
          tfFloorTimer   = 600; // 10 s
          const floorPl  = currentArena && currentArena.platforms.find(p => p.isFloor);
          if (floorPl) floorPl.isFloorDisabled = true;
          showBossDialogue('The ground is GONE!', 160);
        }
        // Spawn black holes at both sides
        tfBlackHoles.push({ x: 120, y: 260, r: 110, timer: 480, maxTimer: 480, strength: 5 });
        tfBlackHoles.push({ x: 780, y: 260, r: 110, timer: 480, maxTimer: 480, strength: 5 });
      }

      if (t >= 0.7 && !this._lineFired) {
        this._lineFired = true;
        showBossDialogue('Then we fall TOGETHER!', 250);
      }
    },
    onEnd() { slowMotion = 1.0; cinematicCamOverride = false; }
  };
}

// ============================================================
// PHASE TRANSITION — triggers appropriate cinematic sequence
// ============================================================
function triggerPhaseTransition(entity, phase) {
  if (entity.isTrueForm) {
    startCinematic(phase === 2 ? _makeTFPhase2Cinematic(entity) : _makeTFPhase3Cinematic(entity));
  } else if (entity.isBeast) {
    startCinematic(_makeBeastPhase2Cinematic(entity));
  } else if (entity.isYeti) {
    startCinematic(_makeYetiPhase2Cinematic(entity));
  } else {
    startCinematic(phase === 2 ? _makeBossPhase2Cinematic(entity) : _makeBossPhase3Cinematic(entity));
  }
}

// ============================================================
// GRAVITY WELLS
// ============================================================
function updateTFGravityWells() {
  if (!tfGravityWells.length) return;
  const tf = players.find(p => p.isTrueForm);
  for (let i = tfGravityWells.length - 1; i >= 0; i--) {
    const gw = tfGravityWells[i];
    gw.timer--;
    if (gw.timer <= 0) { tfGravityWells.splice(i, 1); continue; }
    for (const p of players) {
      if (p.isBoss || p.health <= 0) continue;
      const dx = gw.x - p.cx();
      const dy = gw.y - (p.y + p.h * 0.5);
      const dd = Math.hypot(dx, dy);
      if (dd < gw.r && dd > 1) {
        const pull = gw.strength * 0.022 * (1 - dd / gw.r);
        p.vx += (dx / dd) * pull;
        p.vy += (dy / dd) * pull;
      }
      // Damage when very close to well centre
      if (dd < 32 && p.invincible <= 0) {
        dealDamage(tf || players[players.length - 1], p, 18, 3);
        spawnParticles(p.cx(), p.cy(), '#440044', 8);
      }
    }
  }
}

function drawTFGravityWells() {
  for (const gw of tfGravityWells) {
    ctx.save();
    const alpha = gw.timer < 60 ? gw.timer / 60 : 1;
    const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.006);
    // Outer pull haze
    const haze = ctx.createRadialGradient(gw.x, gw.y, gw.r * 0.3, gw.x, gw.y, gw.r);
    haze.addColorStop(0, `rgba(120,0,200,${0.35 * alpha * pulse})`);
    haze.addColorStop(0.5, `rgba(60,0,120,${0.18 * alpha})`);
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.beginPath(); ctx.arc(gw.x, gw.y, gw.r, 0, Math.PI * 2); ctx.fill();
    // Spinning vortex rings
    for (let ring = 0; ring < 3; ring++) {
      const rr = gw.r * (0.2 + ring * 0.22);
      const angle = (Date.now() * 0.002 * (ring % 2 === 0 ? 1 : -1)) + ring * Math.PI * 0.67;
      ctx.save();
      ctx.translate(gw.x, gw.y);
      ctx.rotate(angle);
      ctx.scale(1, 0.35);
      ctx.strokeStyle = `rgba(200,80,255,${(0.6 - ring * 0.12) * alpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Bright core
    ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255,100,255,${0.85 * alpha * pulse})`;
    ctx.beginPath(); ctx.arc(gw.x, gw.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// METEOR CRASH
// ============================================================
function updateTFMeteorCrash() {
  if (!tfMeteorCrash) return;
  const mc = tfMeteorCrash;
  mc.timer++;
  const tf = mc.boss;

  if (mc.phase === 'rising') {
    // Boss flies upward — when it leaves the screen switch to shadow phase
    if (tf.y < -80 || mc.timer > 50) {
      mc.phase = 'shadow';
      mc.timer = 0;
      tf.x = mc.landX - tf.w / 2;  // reposition off-screen
      tf.y = -200;
      tf.vx = 0; tf.vy = 0;
    }
  } else if (mc.phase === 'shadow') {
    // Shadow circle grows on the ground at landX
    mc.shadowR = Math.min(60, mc.shadowR + 2);
    if (mc.timer > 80) {  // after ~1.3s of warning, crash down
      mc.phase = 'crash';
      mc.timer = 0;
      tf.vy = 55;  // slam down hard
    }
  } else if (mc.phase === 'crash') {
    if (tf.onGround || mc.timer > 30) {
      // Impact
      screenShake = Math.max(screenShake, 30);
      spawnParticles(mc.landX, 460, '#000000', 40);
      spawnParticles(mc.landX, 460, '#ffffff', 20);
      spawnParticles(mc.landX, 460, '#8800ff', 16);
      // Shockwave: massive knockback to nearby players
      for (const p of players) {
        if (p.isBoss || p.health <= 0) continue;
        const sdx = p.cx() - mc.landX;
        const sdd = Math.abs(sdx);
        if (sdd < 280) {
          const force = 28 * (1 - sdd / 280);
          p.vx = (sdx > 0 ? 1 : -1) * force;
          p.vy = -force * 0.7;
          dealDamage(tf, p, Math.round(35 * (1 - sdd / 280) + 8), 0);
        }
      }
      if (typeof directorAddIntensity === 'function') directorAddIntensity(0.3);
      tfMeteorCrash = null;
    }
  }
}

function drawTFMeteorCrash() {
  if (!tfMeteorCrash) return;
  const mc = tfMeteorCrash;
  if (mc.phase !== 'shadow') return;
  // Warning shadow circle on the ground
  ctx.save();
  const pulse = 0.6 + 0.4 * Math.sin(mc.timer * 0.15);
  const urgency = Math.min(1, mc.timer / 80); // grows more intense over time
  const g = ctx.createRadialGradient(mc.landX, 465, 0, mc.landX, 465, mc.shadowR);
  g.addColorStop(0, `rgba(0,0,0,${0.75 * pulse})`);
  g.addColorStop(0.5, `rgba(80,0,140,${0.4 * urgency})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(mc.landX, 465, mc.shadowR, 0, Math.PI * 2); ctx.fill();
  // Warning ring
  ctx.strokeStyle = `rgba(200,0,255,${0.8 * pulse})`;
  ctx.lineWidth   = 2.5;
  ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(mc.landX, 465, mc.shadowR, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ============================================================
// SHADOW CLONES
// ============================================================
function updateTFClones() {
  if (!tfClones.length) return;
  const tf = players.find(p => p.isTrueForm);
  const humanPlayers = players.filter(p => !p.isBoss && p.health > 0);
  for (let i = tfClones.length - 1; i >= 0; i--) {
    const cl = tfClones[i];
    cl.timer--;
    cl.animTimer++;
    if (cl.timer <= 0 || cl.health <= 0) {
      spawnParticles(cl.x + cl.w / 2, cl.y + cl.h * 0.5, '#333333', 10);
      tfClones.splice(i, 1);
      continue;
    }
    // Chase nearest human
    if (humanPlayers.length > 0) {
      const target = humanPlayers.reduce((a, b) =>
        Math.abs(b.cx() - (cl.x + cl.w / 2)) < Math.abs(a.cx() - (cl.x + cl.w / 2)) ? b : a);
      const ddx = target.cx() - (cl.x + cl.w / 2);
      cl.facing = ddx > 0 ? 1 : -1;
      if (Math.abs(ddx) > 50) cl.x += cl.facing * 3.2;
      // Clone attack
      if (cl.attackTimer > 0) {
        cl.attackTimer--;
        if (cl.attackTimer === 0 && Math.abs(ddx) < 55) {
          dealDamage(tf || players[players.length - 1], target, 12, 6);
        }
      } else if (Math.abs(ddx) < 55 && Math.random() < 0.04) {
        cl.attackTimer = 14;
      }
    }
    // Clones die in one hit — check if any projectile or player attack hit them
    for (const p of players) {
      if (p.isBoss || p.health <= 0 || p.attackTimer <= 0) continue;
      const cx = cl.x + cl.w / 2;
      if (Math.abs(p.cx() - cx) < 55 && Math.abs((p.y + p.h / 2) - (cl.y + cl.h / 2)) < 50) {
        // If it's the real clone, deal damage back to the player
        if (cl.isReal) {
          dealDamage(tf || players[players.length - 1], p, 25, 12);
          spawnParticles(cx, cl.y + cl.h * 0.5, '#ffffff', 18);
          showBossDialogue('You found me.', 120);
        } else {
          spawnParticles(cx, cl.y + cl.h * 0.5, '#444444', 14);
        }
        cl.health = 0;
      }
    }
  }
}

function drawTFClones() {
  for (const cl of tfClones) {
    ctx.save();
    const alpha = cl.timer < 45 ? cl.timer / 45 : 0.72;
    ctx.globalAlpha = alpha;
    const cx = cl.x + cl.w / 2;
    const ty = cl.y;
    const sw = Math.sin(cl.animTimer * 0.22) * 0.45;
    ctx.shadowColor = '#333333'; ctx.shadowBlur = 6;
    ctx.strokeStyle = '#555555'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const headR = 9, headCY = ty + headR + 1, shoulderY = headCY + headR + 5, hipY = shoulderY + 24;
    // Head
    ctx.fillStyle = '#222222';
    ctx.beginPath(); ctx.arc(cx, headCY, headR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Body
    ctx.beginPath(); ctx.moveTo(cx, headCY + headR); ctx.lineTo(cx, hipY); ctx.stroke();
    // Arms
    ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx + Math.cos(Math.PI * 0.58 + sw) * 20, shoulderY + Math.sin(Math.PI * 0.58 + sw) * 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx + Math.cos(Math.PI * 0.42 - sw) * 20, shoulderY + Math.sin(Math.PI * 0.42 - sw) * 20); ctx.stroke();
    // Legs
    ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(cx + Math.cos(Math.PI * 0.5 + sw * 0.9) * 22, hipY + Math.sin(Math.PI * 0.5 + sw * 0.9) * 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(cx + Math.cos(Math.PI * 0.5 - sw * 0.9) * 22, hipY + Math.sin(Math.PI * 0.5 - sw * 0.9) * 22); ctx.stroke();
    ctx.restore();
  }
}

// ============================================================
// CHAIN SLAM COMBO
// ============================================================
function updateTFChainSlam() {
  if (!tfChainSlam) return;
  const cs = tfChainSlam;
  const tf = players.find(p => p.isTrueForm);
  if (!tf || !cs.target || cs.target.health <= 0) { tfChainSlam = null; return; }
  cs.timer++;
  // Stage timing: 0=grab(0-20f), 1=slam(20-40f), 2=kick(40-60f), 3=shockwave(60-80f)
  if (cs.stage === 0 && cs.timer >= 20) {
    // Grab: pull target to boss + damage
    cs.target.x = tf.cx() - cs.target.w / 2 + tf.facing * 30;
    cs.target.vy = -8;
    dealDamage(tf, cs.target, 18, 2);
    spawnParticles(tf.cx(), tf.cy(), '#ffffff', 12);
    cs.stage = 1; cs.timer = 0;
  } else if (cs.stage === 1 && cs.timer >= 20) {
    // Slam: drive target into ground
    cs.target.vy = 22;
    cs.target.vx = 0;
    dealDamage(tf, cs.target, 24, 1);
    screenShake = Math.max(screenShake, 14);
    spawnParticles(cs.target.cx(), cs.target.y + cs.target.h, '#ffffff', 16);
    cs.stage = 2; cs.timer = 0;
  } else if (cs.stage === 2 && cs.timer >= 20) {
    // Kick: launch target sideways
    const kickDir = tf.facing;
    cs.target.vx = kickDir * 22;
    cs.target.vy = -10;
    dealDamage(tf, cs.target, 20, 14);
    screenShake = Math.max(screenShake, 18);
    spawnParticles(cs.target.cx(), cs.target.cy(), '#8800ff', 18);
    cs.stage = 3; cs.timer = 0;
  } else if (cs.stage === 3 && cs.timer >= 20) {
    // Shockwave: radial blast
    screenShake = Math.max(screenShake, 22);
    spawnParticles(tf.cx(), 460, '#000000', 30);
    spawnParticles(tf.cx(), 460, '#8800ff', 16);
    for (const p of players) {
      if (p.isBoss || p.health <= 0) continue;
      const sdx = p.cx() - tf.cx();
      if (Math.abs(sdx) < 300) {
        p.vx = (sdx > 0 ? 1 : -1) * 20 * (1 - Math.abs(sdx) / 300);
        p.vy = -14;
        dealDamage(tf, p, 14, 0);
      }
    }
    if (typeof directorAddIntensity === 'function') directorAddIntensity(0.25);
    tfChainSlam = null;
  }
}

// ============================================================
// VOID GRASP SLAM (deferred hit after pull)
// ============================================================
function updateTFGraspSlam() {
  if (!tfGraspSlam) return;
  tfGraspSlam.timer--;
  if (tfGraspSlam.timer <= 0) {
    const tf = players.find(p => p.isTrueForm);
    // Slam everyone near the boss
    for (const p of players) {
      if (p.isBoss || p.health <= 0) continue;
      const dd = Math.hypot(p.cx() - (tf ? tf.cx() : GAME_W / 2), (p.y + p.h * 0.5) - (tf ? tf.cy() : 300));
      if (dd < 120) {
        p.vy = 22;  // drive into ground
        dealDamage(tf || players[players.length - 1], p, 30, 2);
        screenShake = Math.max(screenShake, 20);
        spawnParticles(p.cx(), p.cy(), '#440044', 12);
        spawnParticles(p.cx(), p.cy(), '#ffffff',  6);
      }
    }
    tfGraspSlam = null;
  }
}

// ── Shockwave Pulse ──────────────────────────────────────────────────────────
function updateTFShockwaves() {
  for (const sw of tfShockwaves) {
    if (sw.done) continue;
    // Air-slam sentinel: wait until boss lands, then spawn real waves
    if (sw.pendingLanding) {
      if (sw.boss && sw.boss.onGround) {
        sw.pendingLanding = false;
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 22);
        spawnParticles(sw.boss.cx(), sw.boss.y + sw.boss.h, '#ffffff', 26);
        spawnParticles(sw.boss.cx(), sw.boss.y + sw.boss.h, '#440044', 16);
        for (let ri = 0; ri < 3; ri++) {
          tfShockwaves.push({
            x: sw.boss.cx(), y: sw.boss.y + sw.boss.h,
            r: 12 + ri * 6, maxR: 260 + ri * 70,
            timer: 38 + ri * 9, maxTimer: 38 + ri * 9,
            boss: sw.boss, hit: new Set(),
          });
        }
      } else {
        sw.timer--;
        if (sw.timer <= 0) sw.done = true;
      }
      continue;
    }
    const speed = (sw.maxR - sw.r) / (sw.timer + 1) * 1.6;
    sw.r = Math.min(sw.r + speed, sw.maxR);
    sw.timer--;
    if (sw.timer <= 0 || sw.r >= sw.maxR) { sw.done = true; continue; }
    // Damage players inside the ring band
    for (const p of players) {
      if (p.isBoss || p.health <= 0 || sw.hit.has(p)) continue;
      const pd = Math.hypot(p.cx() - sw.x, (p.y + p.h * 0.5) - sw.y);
      if (pd < sw.r + 20 && pd > sw.r - 22) {
        sw.hit.add(p);
        dealDamage(sw.boss || null, p, 15, 9);
        const rDir = p.cx() > sw.x ? 1 : -1;
        p.vx += rDir * 13;
        p.vy  = Math.min(p.vy, -7);
      }
    }
  }
  tfShockwaves = tfShockwaves.filter(sw => !sw.done);
}

function drawTFShockwaves() {
  for (const sw of tfShockwaves) {
    if (sw.done || sw.pendingLanding || sw.r < 2) continue;
    const progress = 1 - sw.timer / sw.maxTimer;
    const alpha    = progress < 0.85 ? Math.min(1, progress / 0.25) * 0.75
                                      : (1 - (progress - 0.85) / 0.15) * 0.75;
    if (alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle  = '#cc00ff';
    ctx.lineWidth    = 3.5;
    ctx.shadowColor  = '#ff00ff';
    ctx.shadowBlur   = 14;
    ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle  = '#ffffff';
    ctx.lineWidth    = 1.5;
    ctx.shadowBlur   = 6;
    ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// ============================================================
// BOSS TELEGRAPH — update pending attacks, stagger, desperation
// ============================================================
function updateBossPendingAttacks() {
  if (!gameRunning) return;
  const boss = players.find(p => p.isBoss && !p.isTrueForm);

  // ── Tick bossWarnings (visual only) ───────────────────────
  for (let i = bossWarnings.length - 1; i >= 0; i--) {
    bossWarnings[i].timer--;
    if (bossWarnings[i].timer <= 0) bossWarnings.splice(i, 1);
  }
  // ── Tick safe zones ────────────────────────────────────────
  for (let i = bossMetSafeZones.length - 1; i >= 0; i--) {
    bossMetSafeZones[i].timer--;
    if (bossMetSafeZones[i].timer <= 0) bossMetSafeZones.splice(i, 1);
  }
  // ── Desperation flash decay ────────────────────────────────
  if (bossDesperationFlash > 0) bossDesperationFlash--;

  if (!boss || boss.health <= 0) return;

  // ── Stagger: accumulate damage taken, trigger stun ────────
  const dmgThisFrame = (boss._prevHealth || boss.health) - boss.health;
  if (dmgThisFrame > 0) {
    bossStaggerDmg   += dmgThisFrame;
    bossStaggerDecay  = 180; // 3s window
  }
  boss._prevHealth = boss.health;
  if (bossStaggerDecay > 0) {
    bossStaggerDecay--;
    if (bossStaggerDecay <= 0) bossStaggerDmg = 0;
  }
  if (bossStaggerDmg >= 120 && bossStaggerTimer <= 0) {
    bossStaggerTimer = 150; // 2.5s stagger
    bossStaggerDmg   = 0;
    bossStaggerDecay = 0;
    screenShake = Math.max(screenShake, 25);
    showBossDialogue(randChoice(['...impossible...', '*staggers*', 'You... hit hard.', 'Ngh!']), 120);
    spawnParticles(boss.cx(), boss.cy(), '#ffffff', 22);
    if (typeof directorAddIntensity === 'function') directorAddIntensity(0.4);
  }
  if (bossStaggerTimer > 0) {
    bossStaggerTimer--;
    boss.vx *= 0.85; // slow boss during stagger
    if (bossStaggerTimer === 0) {
      showBossDialogue(randChoice(['...that was nothing.', 'My turn.', 'Enough playing.']), 120);
    }
  }

  // ── Desperation mode: health < 25% ───────────────────────
  if (!bossDesperationMode && boss.health / boss.maxHealth < 0.25) {
    bossDesperationMode  = true;
    bossDesperationFlash = 90;
    screenShake = Math.max(screenShake, 30);
    showBossDialogue('YOU...WILL...DIE.', 300);
    spawnParticles(boss.cx(), boss.cy(), '#ff0000', 40);
    spawnParticles(boss.cx(), boss.cy(), '#cc00ee', 30);
    if (typeof directorAddIntensity === 'function') directorAddIntensity(0.8);
  }

  // ── Pending Ground Slam ───────────────────────────────────
  if (boss._pendingGroundSlam) {
    boss._pendingGroundSlam.timer--;
    if (boss._pendingGroundSlam.timer <= 0) {
      screenShake = Math.max(screenShake, 20);
      spawnParticles(boss.cx(), boss.y + boss.h, '#cc00ee', 30);
      spawnParticles(boss.cx(), boss.y + boss.h, '#ffffff', 14);
      for (const p of players) {
        if (p.isBoss || p.health <= 0) continue;
        if (dist(boss, p) < 160) {
          dealDamage(boss, p, 20, 14);
          const rDir = p.cx() > boss.cx() ? 1 : -1;
          p.vx += rDir * 16;
          p.vy  = Math.min(p.vy, -10);
        }
      }
      for (let i = 0; i < 6; i++) {
        const sx = clamp(boss.cx() + (i - 2.5) * 55, 20, 880);
        bossSpikes.push({ x: sx, maxH: 70 + Math.random() * 40, h: 0,
          phase: 'rising', stayTimer: 0, done: false });
      }
      if (typeof directorAddIntensity === 'function') directorAddIntensity(0.15);
      boss._pendingGroundSlam = null;
    }
  }

  // ── Pending Gravity Pulse ─────────────────────────────────
  if (boss._pendingGravPulse) {
    boss._pendingGravPulse.timer--;
    if (boss._pendingGravPulse.timer <= 0) {
      screenShake = Math.max(screenShake, 18);
      spawnParticles(boss.cx(), boss.cy(), '#9900cc', 28);
      spawnParticles(boss.cx(), boss.cy(), '#cc66ff', 14);
      for (const p of players) {
        if (p.isBoss || p.health <= 0) continue;
        const ddx = boss.cx() - p.cx();
        const ddy = (boss.y + boss.h * 0.5) - (p.y + p.h * 0.5);
        const dd  = Math.hypot(ddx, ddy);
        const isEdge = boss._pendingGravPulse.edge;
        const range  = isEdge ? 500 : 350;
        const force  = isEdge ? 18  : 22;
        if (dd < range && dd > 1) {
          const pull = force * (1 - dd / range);
          p.vx = (ddx / dd) * pull;
          p.vy = (ddy / dd) * pull * 0.5 - 5;
        }
      }
      if (typeof directorAddIntensity === 'function') directorAddIntensity(0.14);
      boss._pendingGravPulse = null;
    }
  }
}

// ── TrueForm pending attacks + stagger ───────────────────────────────────────
function updateTFPendingAttacks() {
  if (!gameRunning) return;
  const tf = players.find(p => p.isTrueForm);

  if (!tf || tf.health <= 0) return;

  // ── Stagger ────────────────────────────────────────────────
  const dmgThisFrame = (tf._prevHealth || tf.health) - tf.health;
  if (dmgThisFrame > 0) {
    bossStaggerDmg   += dmgThisFrame;
    bossStaggerDecay  = 180;
  }
  tf._prevHealth = tf.health;
  if (bossStaggerDecay > 0) {
    bossStaggerDecay--;
    if (bossStaggerDecay <= 0) bossStaggerDmg = 0;
  }
  if (bossStaggerDmg >= 150 && bossStaggerTimer <= 0) {
    bossStaggerTimer = 150;
    bossStaggerDmg   = 0;
    bossStaggerDecay = 0;
    screenShake = Math.max(screenShake, 25);
    showBossDialogue(randChoice(['...you dare?', '*staggers*', 'Impressive... for a mortal.']), 120);
    spawnParticles(tf.cx(), tf.cy(), '#ffffff', 22);
    if (typeof directorAddIntensity === 'function') directorAddIntensity(0.4);
  }
  if (bossStaggerTimer > 0) {
    bossStaggerTimer--;
    tf.vx *= 0.85;
    if (bossStaggerTimer === 0) {
      showBossDialogue(randChoice(['Playtime is over.', 'I will not fall.', 'Your doom approaches.']), 120);
    }
  }

  // ── Desperation mode ──────────────────────────────────────
  if (!bossDesperationMode && tf.health / tf.maxHealth < 0.25) {
    bossDesperationMode  = true;
    bossDesperationFlash = 90;
    screenShake = Math.max(screenShake, 30);
    showBossDialogue('I AM BEYOND YOUR COMPREHENSION.', 300);
    spawnParticles(tf.cx(), tf.cy(), '#ffffff', 50);
    spawnParticles(tf.cx(), tf.cy(), '#000000', 30);
    if (typeof directorAddIntensity === 'function') directorAddIntensity(0.8);
  }

  // ── Pending Reality Slash ─────────────────────────────────
  if (tf._pendingSlash) {
    tf._pendingSlash.timer--;
    if (tf._pendingSlash.timer <= 0) {
      const tgt = tf._pendingSlash.target;
      const behindOff = tf._pendingSlash.behindOff;
      const tpX = clamp(tgt.cx() + behindOff - tf.w / 2, 20, GAME_W - tf.w - 20);
      tf.x = tpX;
      tf.y = clamp(tgt.y, 20, 440);
      tf.facing = (tgt.cx() > tf.cx() ? 1 : -1);
      spawnParticles(tf.cx(), tf.cy(), '#ffffff', 20);
      spawnParticles(tf.cx(), tf.cy(), '#000000', 12);
      screenShake = Math.max(screenShake, 12);
      dealDamage(tf, tgt, 18, 10);
      for (const p of players) {
        if (p.isBoss || p.health <= 0) continue;
        const sdx = p.cx() - tf.cx();
        if (Math.abs(sdx) < 220) {
          p.vx += (sdx > 0 ? 1 : -1) * 9;
          if (p !== tgt) dealDamage(tf, p, 6, 5);
        }
      }
      tf._pendingSlash = null;
    }
  }

  // ── Pending Teleport Combo ─────────────────────────────────
  if (tf._pendingTeleportCombo) {
    const tc = tf._pendingTeleportCombo;
    tc.timer--;
    if (tc.timer <= 0 && tc.hits > 0) {
      const tgt = tc.target;
      if (tgt && tgt.health > 0) {
        // Teleport to alternating sides of the player
        const side   = tc.hits % 2 === 0 ? 1 : -1;
        const offset = side * (45 + Math.random() * 25);
        const tpX    = clamp(tgt.cx() + offset - tf.w / 2, 18, GAME_W - tf.w - 18);
        tf.x = tpX;
        tf.y = clamp(tgt.y, 10, 440);
        tf.facing = tgt.cx() > tf.cx() ? 1 : -1;
        // Portal burst at new position
        spawnParticles(tf.cx(), tf.cy(), '#000000', 18);
        spawnParticles(tf.cx(), tf.cy(), '#ffffff', 10);
        screenShake = Math.max(screenShake, 14);
        // Deal damage
        dealDamage(tf, tgt, 14, 8);
        // Brief invincibility so we don't get counter-hit during combo
        tf.invincible = Math.max(tf.invincible, 12);
      }
      tc.hits--;
      if (tc.hits > 0) {
        tc.timer = tc.gap;
      } else {
        tf._pendingTeleportCombo = null;
        // Final shockwave at landing position
        if (typeof tfShockwaves !== 'undefined') {
          tfShockwaves.push({
            x: tf.cx(), y: tf.y + tf.h,
            r: 8, maxR: 200,
            timer: 30, maxTimer: 30,
            boss: tf, hit: new Set(),
          });
        }
        screenShake = Math.max(screenShake, 22);
      }
    }
  }

  // ── Pending Gravity Crush ──────────────────────────────────
  if (tf._pendingGravityCrush) {
    const gc = tf._pendingGravityCrush;
    gc.timer--;
    // During pull phase, drag all players toward arena center each frame
    const pullStrength = 0.55 * (1 - gc.timer / 60); // increases as timer counts down
    for (const p of players) {
      if (p.isBoss || p.health <= 0) continue;
      const pdx = GAME_W / 2 - p.cx();
      const pdy = GAME_H / 2 - p.cy();
      p.vx += Math.sign(pdx) * pullStrength * Math.min(1, Math.abs(pdx) / 200);
      p.vy += Math.sign(pdy) * pullStrength * 0.5;
    }
    if (gc.timer <= 0) {
      // DETONATE — massive outward blast
      spawnParticles(GAME_W / 2, GAME_H / 2, '#8800ff', 55);
      spawnParticles(GAME_W / 2, GAME_H / 2, '#ffffff', 35);
      spawnParticles(GAME_W / 2, GAME_H / 2, '#ff00aa', 20);
      screenShake = Math.max(screenShake, 40);
      if (typeof cinScreenFlash !== 'undefined') {
        cinScreenFlash = { color: '#8800ff', alpha: 0.45, timer: 12, maxTimer: 12 };
      }
      // Blast rings
      if (typeof phaseTransitionRings !== 'undefined') {
        for (let ri = 0; ri < 5; ri++) {
          phaseTransitionRings.push({
            cx: GAME_W / 2, cy: GAME_H / 2,
            r: 10 + ri * 18, maxR: 380 + ri * 55,
            timer: 50 + ri * 10, maxTimer: 50 + ri * 10,
            color: ri % 2 === 0 ? '#8800ff' : '#ffffff',
            lineWidth: Math.max(0.8, 4 - ri * 0.5),
          });
        }
      }
      // Knockback and damage all nearby players
      for (const p of players) {
        if (p.isBoss || p.health <= 0) continue;
        const pdx2 = p.cx() - GAME_W / 2;
        const pdy2 = p.cy() - GAME_H / 2;
        const dist2 = Math.hypot(pdx2, pdy2) || 1;
        p.vx += (pdx2 / dist2) * 28;
        p.vy += (pdy2 / dist2) * 18 - 8;
        dealDamage(tf, p, 22, 16);
      }
      tf._pendingGravityCrush = null;
    }
  }

  // ── Pending Collapse Strike ────────────────────────────────
  if (tf._pendingCollapseStrike) {
    tf._pendingCollapseStrike.timer--;
    if (tf._pendingCollapseStrike.timer <= 0) {
      const csTgt = tf._pendingCollapseStrike.target;
      // Teleport boss behind target
      if (csTgt && csTgt.health > 0) {
        const csDir = (csTgt.facing || 1);
        tf.x  = clamp(csTgt.cx() - csDir * 55 - tf.w / 2, 20, GAME_W - tf.w - 20);
        tf.y  = clamp(csTgt.y, 20, GAME_H - tf.h - 20);
        tf.vx = 0; tf.vy = 0;
        // Restore slowmo
        if (hitSlowTimer <= 0) slowMotion = 1.0;
        screenShake = Math.max(screenShake, 26);
        spawnParticles(tf.cx(), tf.cy(), '#ffffff', 28);
        spawnParticles(tf.cx(), tf.cy(), '#aaddff', 18);
        spawnParticles(tf.cx(), tf.cy(), '#000000', 14);
        // Heavy strike — 55 damage + strong knockback
        const oldDmg = tf.weapon.damage;
        const oldKb  = tf.weapon.kb;
        tf.weapon.damage = 55;
        tf.weapon.kb     = 16;
        if (tf.cooldown <= 0) tf.attack(csTgt);
        tf.weapon.damage = oldDmg;
        tf.weapon.kb     = oldKb;
      }
      tf._pendingCollapseStrike = null;
    }
  }

  // ── Pending Shockwave (ground) ─────────────────────────────
  if (tf._pendingShockwave) {
    tf._pendingShockwave.timer--;
    if (tf._pendingShockwave.timer <= 0) {
      const bossRef = tf._pendingShockwave.boss || tf;
      screenShake = Math.max(screenShake, 22);
      spawnParticles(bossRef.cx(), bossRef.y + bossRef.h, '#ffffff', 30);
      spawnParticles(bossRef.cx(), bossRef.y + bossRef.h, '#440044', 22);
      spawnParticles(bossRef.cx(), bossRef.y + bossRef.h, '#8800ff', 14);
      for (let ri = 0; ri < 3; ri++) {
        tfShockwaves.push({
          x: bossRef.cx(), y: bossRef.y + bossRef.h,
          r: 12 + ri * 6, maxR: 260 + ri * 70,
          timer: 38 + ri * 9, maxTimer: 38 + ri * 9,
          boss: bossRef, hit: new Set(),
        });
      }
      tf._pendingShockwave = null;
    }
  }
}

// ============================================================
// DRAW: Boss warnings (telegraph zones) + safe zones + desperation
// ============================================================
function drawBossWarnings() {
  if (!bossWarnings.length && !bossMetSafeZones.length && !bossDesperationFlash) return;
  ctx.save();

  // ── Desperation screen pulse ───────────────────────────────
  if (bossDesperationFlash > 0) {
    const alpha = (bossDesperationFlash / 90) * 0.35;
    ctx.fillStyle = `rgba(255,0,0,${alpha})`;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }
  // Subtle desperation aura — red border pulse when active
  if (bossDesperationMode) {
    const pulse = 0.12 + Math.abs(Math.sin(frameCount * 0.07)) * 0.10;
    ctx.strokeStyle = `rgba(255,30,0,${pulse})`;
    ctx.lineWidth   = 8;
    ctx.strokeRect(4, 4, GAME_W - 8, GAME_H - 8);
  }
  // TrueForm desperation aura — dark void border when active
  const tfDesp = players.find(p => p.isTrueForm && p._desperationMode);
  if (tfDesp) {
    const pulse2 = 0.10 + Math.abs(Math.sin(frameCount * 0.09)) * 0.12;
    ctx.strokeStyle = `rgba(0,0,0,${pulse2 + 0.4})`;
    ctx.lineWidth   = 10;
    ctx.strokeRect(5, 5, GAME_W - 10, GAME_H - 10);
    ctx.strokeStyle = `rgba(160,0,255,${pulse2})`;
    ctx.lineWidth   = 4;
    ctx.strokeRect(5, 5, GAME_W - 10, GAME_H - 10);
  }

  // ── Safe zones ─────────────────────────────────────────────
  for (const sz of bossMetSafeZones) {
    const prog  = sz.timer / sz.maxTimer;
    const alpha = 0.18 + Math.sin(frameCount * 0.12) * 0.07;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#00ff88';
    ctx.beginPath(); ctx.arc(sz.x, sz.y, sz.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur  = 10;
    ctx.beginPath(); ctx.arc(sz.x, sz.y, sz.r, 0, Math.PI * 2); ctx.stroke();
    // Label
    ctx.globalAlpha = 0.85;
    ctx.fillStyle   = '#00ffcc';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('SAFE', sz.x, sz.y + 4);
    ctx.restore();
  }

  // ── Attack warning shapes ──────────────────────────────────
  for (const w of bossWarnings) {
    const prog  = w.timer / w.maxTimer;          // 1 → 0 as attack approaches
    const blink = Math.floor(w.timer / 4) % 2;  // fast blink when almost expired
    const alpha = (prog > 0.25 ? 0.25 + (1 - prog) * 0.35 : 0.55 + (blink ? 0.3 : 0)) * (prog < 0.15 ? prog / 0.15 : 1);

    ctx.save();
    ctx.globalAlpha = Math.min(0.85, Math.max(0.05, alpha));

    if (w.type === 'circle') {
      // Filled danger zone
      const hex = w.safeZone ? '#00ff88' : w.color;
      ctx.fillStyle   = hex + '33';
      ctx.strokeStyle = hex;
      ctx.lineWidth   = 2;
      ctx.shadowColor = hex;
      ctx.shadowBlur  = 12;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (w.type === 'cross') {
      // X marker at target location
      ctx.strokeStyle = w.color;
      ctx.lineWidth   = 3;
      ctx.shadowColor = w.color;
      ctx.shadowBlur  = 8;
      const s = w.r;
      ctx.beginPath();
      ctx.moveTo(w.x - s, w.y - s); ctx.lineTo(w.x + s, w.y + s);
      ctx.moveTo(w.x + s, w.y - s); ctx.lineTo(w.x - s, w.y + s);
      ctx.stroke();
    } else if (w.type === 'spike_warn') {
      // Glowing dot on floor before spike rises
      ctx.fillStyle   = w.color;
      ctx.shadowColor = w.color;
      ctx.shadowBlur  = 14;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r * (1 - prog * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // Label text
    if (w.label && prog < 0.7) {
      ctx.globalAlpha = Math.min(0.9, (0.7 - prog) / 0.7 * 0.9);
      ctx.fillStyle   = w.color;
      ctx.shadowColor = w.color;
      ctx.shadowBlur  = 6;
      ctx.font        = 'bold 12px monospace';
      ctx.textAlign   = 'center';
      ctx.fillText(w.label, w.x, w.y - w.r - 6);
    }

    ctx.restore();
  }

  ctx.restore();
}

function resetBossWarnings() {
  bossWarnings        = [];
  bossMetSafeZones    = [];
  bossStaggerTimer    = 0;
  bossStaggerDmg      = 0;
  bossStaggerDecay    = 0;
  bossDesperationMode  = false;
  bossDesperationFlash = 0;
  if (activeCinematic) endCinematic();
  slowMotion           = 1.0;
  cinematicCamOverride = false;
  cinGroundCracks      = [];
  cinScreenFlash       = null;
}

// ── PHASE SHIFT update + draw ────────────────────────────────────────────
function updateTFPhaseShift() {
  if (!tfPhaseShift) return;
  const ps = tfPhaseShift;
  ps.timer++;

  // Apply drift to fake echo positions each frame (real echo stays still)
  for (let i = 0; i < ps.echoes.length; i++) {
    if (i === ps.realIdx) continue;
    const e = ps.echoes[i];
    if (e.driftVx !== undefined) {
      e.x = clamp(e.x + e.driftVx, 60, GAME_W - 60);
      e.y = clamp(e.y + e.driftVy, 60, GAME_H - 60);
      // Slow down drift over time
      e.driftVx *= 0.97;
      e.driftVy *= 0.97;
    }
  }

  // At the reveal frame, snap boss to the real echo position and attack
  if (!ps.revealed && ps.timer === 45) {
    ps.revealed = true;
    const tf = players.find(p => p.isTrueForm);
    if (tf) {
      const echo = ps.echoes[ps.realIdx];
      tf.x   = echo.x - tf.w / 2;
      tf.y   = echo.y - tf.h / 2;
      tf.vx  = 0;
      tf.vy  = 0;
      screenShake = Math.max(screenShake, 16);
      spawnParticles(tf.cx(), tf.cy(), '#ffffff', 18);
      spawnParticles(tf.cx(), tf.cy(), '#9900ff', 14);
      // Immediately attack the nearest player
      const target = players.find(p => !p.isBoss && p.health > 0);
      if (target && tf.cooldown <= 0) tf.attack(target);
    }
  }

  if (ps.timer >= ps.maxTimer) tfPhaseShift = null;
}

function drawTFPhaseShift() {
  if (!tfPhaseShift) return;
  const ps = tfPhaseShift;
  const progress = ps.timer / ps.maxTimer;
  const tf = players.find(p => p.isTrueForm);

  // Draw echoes (false positions)
  for (let i = 0; i < ps.echoes.length; i++) {
    const e = ps.echoes[i];
    const isReal = i === ps.realIdx;
    // Fade echoes out after reveal; fake ones vanish faster
    let alpha;
    if (!ps.revealed) {
      alpha = Math.min(1, ps.timer / 12) * (isReal ? 0.55 : 0.40);
    } else {
      alpha = isReal ? 0 : Math.max(0, 1 - (ps.timer - 45) / 12) * 0.35;
    }
    if (alpha <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Draw a simple silhouette at echo position
    ctx.fillStyle    = '#000000';
    ctx.strokeStyle  = '#aa00ff';
    ctx.lineWidth    = 2;
    const ew = 18, eh = 50;
    ctx.beginPath();
    ctx.rect(e.x - ew / 2, e.y - eh / 2, ew, eh);
    ctx.fill(); ctx.stroke();
    // Small '?' label on fakes
    if (!isReal && !ps.revealed) {
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle   = '#cc88ff';
      ctx.font        = 'bold 11px monospace';
      ctx.textAlign   = 'center';
      ctx.fillText('?', e.x, e.y - eh / 2 - 6);
    }
    ctx.restore();
  }

  // Make the real boss semi-transparent while shifting
  if (tf && !ps.revealed) {
    // The boss draw() call handles normal rendering; we just overlay a ghosting effect
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(ps.timer * 0.4) * 0.1;
    ctx.strokeStyle = '#9900ff';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.rect(tf.x, tf.y, tf.w, tf.h);
    ctx.stroke();
    ctx.restore();
  }
}

// ── REALITY TEAR update + draw ────────────────────────────────────────────
function updateTFRealityTear() {
  if (!tfRealityTear) return;
  const rt = tfRealityTear;
  rt.timer++;

  // Phase transitions
  if (rt.phase === 'warn'   && rt.timer >= 20) rt.phase = 'active';
  if (rt.phase === 'active' && rt.timer >= 70) {
    rt.phase = 'close';
    // Chain follow-up: boss teleports behind player and combo-attacks
    if (rt.bossRef && !rt._followUpFired) {
      rt._followUpFired = true;
      const tf  = rt.bossRef;
      const tgt = (rt.targetRef && rt.targetRef.health > 0)
        ? rt.targetRef
        : players.find(p => !p.isBoss && p.health > 0);
      if (tf && tgt) {
        // Teleport behind the pulled player
        const behindDir = tgt.facing || (tgt.cx() > GAME_W / 2 ? 1 : -1);
        const behindX   = clamp(tgt.cx() - behindDir * 55, 30, GAME_W - tf.w - 30);
        tf.x  = behindX;
        tf.y  = clamp(tgt.y, 20, GAME_H - tf.h - 20);
        tf.vx = 0; tf.vy = 0;
        tf.invincible = Math.max(tf.invincible || 0, 12);
        screenShake   = Math.max(screenShake, 12);
        spawnParticles(tf.cx(), tf.cy(), '#cc00ff', 14);
        spawnParticles(tf.cx(), tf.cy(), '#ffffff', 8);
        // Immediate combo: two quick hits
        if (tf.cooldown <= 0) tf.attack(tgt);
        if (typeof tf._pendingChainMove !== 'undefined' && !tf._pendingChainMove) {
          tf._pendingChainMove = { move: 'slash', delay: 12 };
        }
      }
    }
  }
  if (rt.phase === 'close'  && rt.timer >= rt.maxTimer) { tfRealityTear = null; return; }

  // Active phase: pull all non-boss players toward the tear
  if (rt.phase === 'active') {
    const pullStr = 1.8;
    for (const p of players) {
      if (p.isBoss || p.health <= 0) continue;
      const dx = rt.x - p.cx();
      const dy = rt.y - p.cy();
      const dd = Math.hypot(dx, dy);
      if (dd < 320 && dd > 1) {
        const force = pullStr * (1 - dd / 320);
        p.vx += (dx / dd) * force;
        p.vy += (dy / dd) * force * 0.7;
      }
    }
  }
}

function drawTFRealityTear() {
  if (!tfRealityTear) return;
  const rt = tfRealityTear;
  const progress = rt.timer / rt.maxTimer;

  let alpha;
  if (rt.phase === 'warn')   alpha = Math.min(1, rt.timer / 20);
  else if (rt.phase === 'active') alpha = 1.0;
  else alpha = Math.max(0, 1 - (rt.timer - 70) / 20);
  if (alpha <= 0) return;

  const height = rt.phase === 'warn'
    ? 40 * (rt.timer / 20)
    : rt.phase === 'active'
      ? 40 + 60 * Math.min(1, (rt.timer - 20) / 15)
      : 100 * alpha;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(rt.x, rt.y);

  // Outer glow
  const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, 70);
  grd.addColorStop(0,   'rgba(180,0,255,0.35)');
  grd.addColorStop(1,   'rgba(80,0,180,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.ellipse(0, 0, 70, height * 0.6, 0, 0, Math.PI * 2); ctx.fill();

  // The crack itself — jagged vertical line
  ctx.strokeStyle  = '#ffffff';
  ctx.lineWidth    = 2.5;
  ctx.shadowColor  = '#cc00ff';
  ctx.shadowBlur   = 12;
  ctx.beginPath();
  const segs = 8;
  ctx.moveTo(0, -height / 2);
  for (let i = 1; i <= segs; i++) {
    const fy = -height / 2 + (height / segs) * i;
    const jag = rt.phase === 'active' ? (Math.random() - 0.5) * 14 : (Math.random() - 0.5) * 6;
    ctx.lineTo(jag, fy);
  }
  ctx.stroke();

  // Inner black void core
  ctx.fillStyle   = '#000000';
  ctx.shadowBlur  = 0;
  ctx.beginPath(); ctx.ellipse(0, 0, 6, height * 0.45, 0, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── MATH BUBBLE + CALCULATED STRIKE update + draw ─────────────────────────
function updateTFCalcStrike() {
  if (tfMathBubble) {
    tfMathBubble.timer++;
    if (tfMathBubble.timer >= tfMathBubble.maxTimer) tfMathBubble = null;
  }
  // Tick ghost paths
  if (tfGhostPaths) {
    tfGhostPaths.timer++;
    if (tfGhostPaths.timer >= tfGhostPaths.maxTimer) tfGhostPaths = null;
  }
  if (!tfCalcStrike) return;
  const cs = tfCalcStrike;
  cs.timer++;

  // Strike at variable delay (strikeDelay set per-accuracy-tier at spawn time)
  const strikeFrame = cs.strikeDelay || 42;
  if (!cs.fired && cs.timer >= strikeFrame) {
    cs.fired = true;
    tfGhostPaths = null; // clear path visualization on strike
    const tf = players.find(p => p.isTrueForm);
    if (tf) {
      tf.x  = clamp(cs.predictX - tf.w / 2, 20, GAME_W - tf.w - 20);
      tf.y  = clamp(cs.predictY - tf.h / 2, 20, GAME_H - tf.h - 20);
      tf.vx = 0; tf.vy = 0;
      screenShake = Math.max(screenShake, 14);
      spawnParticles(tf.cx(), tf.cy(), '#ffffff', 16);
      spawnParticles(tf.cx(), tf.cy(), '#aaddff', 10);
      const target = players.find(p => !p.isBoss && p.health > 0);
      if (target && tf.cooldown <= 0) tf.attack(target);
    }
  }
  // 10 frames after strike: second hit if boss is close enough (chain follow-up)
  if (cs.fired && !cs.chainFired && cs.timer >= strikeFrame + 10) {
    cs.chainFired = true;
    const tf     = players.find(p => p.isTrueForm);
    const target = players.find(p => !p.isBoss && p.health > 0);
    if (tf && target && dist(tf, target) < 85 && tf.cooldown <= 0) {
      tf.attack(target);
    }
  }
  if (cs.timer >= cs.maxTimer) tfCalcStrike = null;
}

function drawTFCalcStrike() {
  // Draw 5D ghost paths while calculating (before strike fires)
  if (tfGhostPaths) {
    const gp = tfGhostPaths;
    const gFade = gp.timer < 8 ? gp.timer / 8 : gp.timer > gp.maxTimer - 8 ? (gp.maxTimer - gp.timer) / 8 : 1.0;
    if (gFade > 0.01) {
      for (const path of gp.paths) {
        if (path.pts.length < 2) continue;
        ctx.save();
        ctx.globalAlpha = path.alpha * gFade;
        ctx.strokeStyle  = path.selected ? '#aaddff' : '#6633aa';
        ctx.lineWidth    = path.selected ? 2.0 : 1.0;
        ctx.setLineDash(path.selected ? [] : [4, 5]);
        ctx.shadowColor  = path.selected ? '#aaddff' : 'transparent';
        ctx.shadowBlur   = path.selected ? 8 : 0;
        ctx.beginPath();
        ctx.moveTo(path.pts[0].x, path.pts[0].y);
        ctx.lineTo(path.pts[1].x, path.pts[1].y);
        ctx.stroke();
        // Arrow head on selected path
        if (path.selected) {
          const dx = path.pts[1].x - path.pts[0].x;
          const dy = path.pts[1].y - path.pts[0].y;
          const len = Math.hypot(dx, dy) || 1;
          const angle = Math.atan2(dy, dx);
          ctx.beginPath();
          ctx.moveTo(path.pts[1].x, path.pts[1].y);
          ctx.lineTo(path.pts[1].x - 10 * Math.cos(angle - 0.45), path.pts[1].y - 10 * Math.sin(angle - 0.45));
          ctx.lineTo(path.pts[1].x - 10 * Math.cos(angle + 0.45), path.pts[1].y - 10 * Math.sin(angle + 0.45));
          ctx.closePath();
          ctx.fillStyle = '#aaddff';
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }
  // Brief crosshair flash at strike landing point (right after teleport fires)
  if (tfCalcStrike && tfCalcStrike.fired) {
    const cs = tfCalcStrike;
    const strikeFrame = cs.strikeDelay || 42;
    const postFire = cs.timer - strikeFrame;
    if (postFire < 12) {
      const flashAlpha = 1 - postFire / 12;
      ctx.save();
      ctx.globalAlpha  = flashAlpha * 0.8;
      ctx.strokeStyle  = '#aaddff';
      ctx.lineWidth    = 2;
      ctx.shadowColor  = '#ffffff';
      ctx.shadowBlur   = 10;
      const cx_ = cs.predictX, cy_ = cs.predictY;
      const sz  = 14;
      ctx.beginPath();
      ctx.moveTo(cx_ - sz, cy_); ctx.lineTo(cx_ + sz, cy_);
      ctx.moveTo(cx_, cy_ - sz); ctx.lineTo(cx_, cy_ + sz);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawTFMathBubble() {
  if (!tfMathBubble) return;
  const mb   = tfMathBubble;
  const fade = mb.timer < 8
    ? mb.timer / 8
    : mb.timer > mb.maxTimer - 10
      ? (mb.maxTimer - mb.timer) / 10
      : 1.0;
  if (fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;
  const bx = mb.x;
  const by = mb.y - 28;
  const pad = 8;
  ctx.font = 'bold 13px monospace';
  const tw  = ctx.measureText(mb.text).width;
  const bw  = tw + pad * 2;
  const bh  = 22;

  // Bubble background
  ctx.fillStyle   = 'rgba(240,240,255,0.92)';
  ctx.strokeStyle = '#9900cc';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 5);
  ctx.fill(); ctx.stroke();

  // Tail
  ctx.fillStyle = 'rgba(240,240,255,0.92)';
  ctx.beginPath();
  ctx.moveTo(bx - 5, by + bh / 2);
  ctx.lineTo(bx + 5, by + bh / 2);
  ctx.lineTo(bx,     by + bh / 2 + 8);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Text
  ctx.fillStyle   = '#220044';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mb.text, bx, by);

  ctx.restore();
}

// ── REALITY OVERRIDE update + draw ───────────────────────────────────────────
function updateTFRealityOverride() {
  if (!tfRealityOverride) return;
  const ro = tfRealityOverride;
  ro.timer++;

  // Phase: freeze (0-16f) — hitstop visual, player pulled toward boss
  if (ro.phase === 'freeze' && ro.timer === 16) {
    ro.phase = 'execute';
    const tf  = ro.bossRef;
    const tgt = (ro.targetRef && ro.targetRef.health > 0)
      ? ro.targetRef : players.find(p => !p.isBoss && p.health > 0);
    if (tf && tgt) {
      // Teleport player to 75px in front of boss
      const pullDir = tf.facing || 1;
      tgt.x  = clamp(tf.cx() + pullDir * 75 - tgt.w / 2, 20, GAME_W - tgt.w - 20);
      tgt.y  = tf.y;
      tgt.vx = 0; tgt.vy = 0;
      screenShake = Math.max(screenShake, 20);
      spawnParticles(tgt.cx(), tgt.cy(), '#ffffff', 20);
    }
  }

  // Phase: execute (16-60f) — boss attacks every 14 frames; player can still dodge
  if (ro.phase === 'execute') {
    const tf  = ro.bossRef;
    const tgt = (ro.targetRef && ro.targetRef.health > 0)
      ? ro.targetRef : players.find(p => !p.isBoss && p.health > 0);
    if (tf && tgt && ro.timer >= 16 && (ro.timer - 16) % 14 === 0 && ro.attacksFired < 3) {
      ro.attacksFired++;
      if (tf.cooldown <= 0) tf.attack(tgt);
    }
  }

  if (ro.timer >= ro.maxTimer) tfRealityOverride = null;
}

function drawTFRealityOverride() {
  if (!tfRealityOverride) return;
  const ro = tfRealityOverride;

  // Freeze phase: dark overlay + white vignette border
  if (ro.phase === 'freeze') {
    const p = Math.min(1, ro.timer / 16);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.55 * p})`;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * p})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, GAME_W - 6, GAME_H - 6);
    // "OVERRIDE" text
    ctx.globalAlpha = p;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 22px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('— OVERRIDE —', GAME_W / 2, GAME_H / 2);
    ctx.restore();
  }

  // Execute phase: subtle dark tint that fades out
  if (ro.phase === 'execute') {
    const fadeP = 1 - Math.min(1, (ro.timer - 16) / 44);
    if (fadeP > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${0.30 * fadeP})`;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.restore();
    }
  }
}

// ── GRAB CINEMATIC ────────────────────────────────────────────────────────────
function _makeTFGrabCinematic(tf, target) {
  let _phase1Done = false, _phase2Done = false, _phase3Done = false;
  return {
    durationFrames: 90,
    update(t) {
      // 0-0.25s: slowmo + zoom to both
      if (t < 0.5) {
        slowMotion = Math.max(0.15, 1 - t * 2.5);
        cinematicCamOverride = true;
        if (tf && target) {
          cinematicFocusX  = (tf.cx() + target.cx()) * 0.5;
          cinematicFocusY  = (tf.cy() + target.cy()) * 0.5;
          cinematicZoomTarget = Math.min(1.6, 1 + t * 1.2);
        }
      }
      // 0.25s: boss teleports adjacent + grab lock
      if (t >= 0.25 && !_phase1Done) {
        _phase1Done = true;
        if (tf && target && target.health > 0) {
          const gDir = target.cx() > tf.cx() ? 1 : -1;
          tf.x = clamp(target.cx() - gDir * 28 - tf.w / 2, 20, GAME_W - tf.w - 20);
          tf.y = target.y;
          tf.vx = 0; tf.vy = 0;
          target.vx = 0; target.vy = 0;
          target.stunTimer = 55; // player is grabbed — brief stun
          screenShake = Math.max(screenShake, 18);
          spawnParticles(tf.cx(), tf.cy(), '#000000', 22);
          spawnParticles(tf.cx(), tf.cy(), '#ffffff', 10);
        }
      }
      // 0.5-0.9s: lift player upward
      if (t >= 0.5 && t < 0.9 && target && target.health > 0 && target.stunTimer > 0) {
        target.vy = -6;
        target.x  = clamp(tf.cx() + 10 - target.w / 2, 20, GAME_W - target.w - 20);
      }
      // 0.9s: throw — release with strong horizontal velocity
      if (t >= 0.9 && !_phase2Done) {
        _phase2Done = true;
        if (target && target.health > 0) {
          const throwDir = tf.facing || 1;
          target.vx = throwDir * 22;
          target.vy = -10;
          target.stunTimer = 0;
          screenShake = Math.max(screenShake, 24);
          spawnParticles(target.cx(), target.cy(), '#ffffff', 18);
          dealDamage(tf, target, 28, 14);
        }
      }
      // 1.2s: restore camera + slowmo
      if (t >= 1.2 && !_phase3Done) {
        _phase3Done = true;
        cinematicCamOverride = false;
        slowMotion = 1.0;
      }
    },
    draw() {},
    done: false,
  };
}

// ── GAMMA RAY BEAM ─────────────────────────────────────────────────────────────
function updateTFGammaBeam() {
  if (!tfGammaBeam) return;
  const gb = tfGammaBeam;
  gb.timer++;
  const boss = players.find(p => p.isTrueForm);

  if (gb.phase === 'charge') {
    // Continuously track player Y during charge window (locks at end)
    const tgt = players.find(p => !p.isBoss && !p.isTrueForm && p.health > 0);
    if (tgt) gb.trackY = clamp(tgt.y + tgt.h * 0.45, 120, 440);
    if (gb.timer >= gb.maxTimer) {
      gb.y = gb.trackY || GAME_H / 2;
      gb.phase = 'telegraph';
      gb.timer = 0; gb.maxTimer = 34;
      bossWarnings.push({ type: 'circle', x: GAME_W / 2, y: gb.y, r: 14,
        color: '#ffff00', timer: 32, maxTimer: 32, label: 'GAMMA BEAM — JUMP!' });
      screenShake = Math.max(screenShake, 16);
    }

  } else if (gb.phase === 'telegraph') {
    if (gb.timer >= gb.maxTimer) {
      gb.phase = 'active';
      gb.timer = 0; gb.maxTimer = 45;
      hitStopFrames = Math.max(hitStopFrames, 10);
      screenShake   = Math.max(screenShake, 26);
    }

  } else if (gb.phase === 'active') {
    for (const p of players) {
      if (p.isBoss || p.isTrueForm || p.health <= 0) continue;
      const py = p.y + p.h * 0.5;
      if (Math.abs(py - gb.y) < 24 && p.invincible <= 0 && !gb.hit.has(p)) {
        gb.hit.add(p);
        dealDamage(boss || players[1], p, 24, 14);
        spawnParticles(p.cx(), p.cy(), '#ffff00', 14);
        spawnParticles(p.cx(), p.cy(), '#ffffff',  8);
        hitStopFrames = Math.max(hitStopFrames, 7); // per-hit hitstop
        p.invincible = Math.max(p.invincible, 20);
      }
    }
    if (gb.timer >= gb.maxTimer) {
      // Chain: 30% chance to immediately follow with neutron star
      if (boss && Math.random() < 0.30 && boss._chainCd <= 0) {
        const chainTgt = players.find(p => !p.isBoss && !p.isTrueForm && p.health > 0);
        if (chainTgt && !tfNeutronStar) {
          boss._chainCd = 36;
          setTimeout(() => {
            if (!gameRunning || !boss) return;
            boss._doSpecial('neutronStar', chainTgt);
          }, 700);
        }
      }
      tfGammaBeam = null;
    }
  }
}

function drawTFGammaBeam() {
  if (!tfGammaBeam) return;
  const gb = tfGammaBeam;
  ctx.save();

  if (gb.phase === 'charge') {
    const prog = gb.timer / gb.maxTimer;
    const trackY = gb.trackY || GAME_H / 2;
    // Screen dim — subtle, grows
    ctx.globalAlpha = prog * 0.20;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    // Tracking hairline follows player Y
    ctx.globalAlpha = 0.12 + prog * 0.38;
    ctx.strokeStyle = '#ffff88';
    ctx.lineWidth = 1 + prog * 2;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur  = 6 + prog * 14;
    ctx.setLineDash([4, 9]);
    ctx.beginPath(); ctx.moveTo(0, trackY); ctx.lineTo(GAME_W, trackY); ctx.stroke();
    ctx.setLineDash([]);
    // Boss charge orb
    const orbR = 8 + prog * 20;
    ctx.globalAlpha = 0.28 + prog * 0.55;
    const orbGrad = ctx.createRadialGradient(gb.chargeX, gb.chargeY, 0, gb.chargeX, gb.chargeY, orbR);
    orbGrad.addColorStop(0,   `rgba(255,255,200,${0.9})`);
    orbGrad.addColorStop(0.5, `rgba(255,220,0,${0.65})`);
    orbGrad.addColorStop(1,   'rgba(255,200,0,0)');
    ctx.fillStyle = orbGrad;
    ctx.shadowColor = '#ffff44'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(gb.chargeX, gb.chargeY, orbR, 0, Math.PI * 2); ctx.fill();

  } else if (gb.phase === 'telegraph') {
    const prog = gb.timer / gb.maxTimer;
    // Heavier screen dim — danger is near
    ctx.globalAlpha = 0.24 + prog * 0.10;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    // Locked beam — flashing
    const blink = Math.floor(gb.timer / 4) % 2 === 0;
    ctx.globalAlpha = blink ? 0.92 : 0.52;
    ctx.strokeStyle = '#ffff22';
    ctx.lineWidth   = 3 + prog * 5;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur  = 18 + prog * 20;
    ctx.beginPath(); ctx.moveTo(0, gb.y); ctx.lineTo(GAME_W, gb.y); ctx.stroke();
    // Pulsing edge arrows
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffff44';
    ctx.font = `bold ${12 + Math.floor(prog * 4)}px monospace`;
    ctx.fillText('▶ ▶ ▶', 8, gb.y - 6);
    ctx.fillText('◀ ◀ ◀', GAME_W - 72, gb.y - 6);

  } else if (gb.phase === 'active') {
    const fade = 1 - gb.timer / gb.maxTimer;
    // Full-screen white flash on fire
    if (gb.timer <= 4) {
      ctx.globalAlpha = (0.85 - gb.timer * 0.18);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }
    // Core beam — solid white bar
    ctx.globalAlpha = 0.96 * fade;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, gb.y - 14, GAME_W, 28);
    // Wide glow envelope
    const grad = ctx.createLinearGradient(0, gb.y - 45, 0, gb.y + 45);
    grad.addColorStop(0,   'rgba(255,255,0,0)');
    grad.addColorStop(0.30, `rgba(255,220,0,${0.55 * fade})`);
    grad.addColorStop(0.50, `rgba(255,255,255,${0.95 * fade})`);
    grad.addColorStop(0.70, `rgba(255,220,0,${0.55 * fade})`);
    grad.addColorStop(1,   'rgba(255,255,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.fillRect(0, gb.y - 45, GAME_W, 90);
    // Periodic flare pops along beam
    if (gb.timer % 7 === 0) {
      ctx.globalAlpha = fade * 0.65;
      ctx.fillStyle = '#ffffaa';
      ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(30 + Math.random() * (GAME_W - 60), gb.y, 10 + Math.random() * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ── NEUTRON STAR ───────────────────────────────────────────────────────────────
function updateTFNeutronStar() {
  if (!tfNeutronStar) return;
  const ns = tfNeutronStar;
  ns.timer++;
  const boss = ns.bossRef;

  if (ns.phase === 'charge') {
    // Charge animation before pull activates
    if (ns.timer % 6 === 0) spawnParticles(
      boss.cx() + (Math.random() - 0.5) * 120,
      boss.cy() + (Math.random() - 0.5) * 100,
      Math.random() < 0.5 ? '#ffaa00' : '#ffffff', 2
    );
    if (ns.timer >= ns.maxTimer) {
      ns.phase = 'pull';
      ns.timer = 0; ns.maxTimer = 240;
      bossWarnings.push({ type: 'circle', x: boss.cx(), y: boss.cy(), r: 220,
        color: '#ffaa00', timer: 50, maxTimer: 50, label: 'NEUTRON STAR!' });
      screenShake = Math.max(screenShake, 18);
    }

  } else if (ns.phase === 'pull') {
    // Gravity pull — force ramps up over duration (most intense at end)
    const pullIntensity = 0.4 + (ns.timer / ns.maxTimer) * 1.2; // 0.4 → 1.6
    if (ns.timer % 6 === 0) spawnParticles(
      boss.cx() + (Math.random() - 0.5) * 260,
      boss.cy() + (Math.random() - 0.5) * 220,
      '#ffaa00', 3
    );
    // Apply gravitational pull to players (heavier near end)
    for (const p of players) {
      if (p.isTrueForm || p.health <= 0 || p.invincible > 0) continue;
      const dx = boss.cx() - p.cx();
      const dy = boss.cy() - (p.y + p.h / 2);
      const d  = Math.hypot(dx, dy);
      if (d > 10) {
        p.vx += (dx / d) * pullIntensity * 0.30;
        p.vy += (dy / d) * pullIntensity * 0.18;
      }
    }
    if (ns.timer >= ns.maxTimer) {
      // Transition: implosion visual then launch
      ns.phase = 'implosion';
      ns.timer = 0; ns.maxTimer = 28;
      slowMotion   = 0.20;
      hitSlowTimer = 35;
      spawnParticles(boss.cx(), boss.cy(), '#ffaa00', 20);
      spawnParticles(boss.cx(), boss.cy(), '#ffffff', 12);
    }

  } else if (ns.phase === 'implosion') {
    // Brief pause — massive pull spike — then launch
    for (const p of players) {
      if (p.isTrueForm || p.health <= 0) continue;
      const dx = boss.cx() - p.cx();
      const dy = boss.cy() - (p.y + p.h / 2);
      const d  = Math.hypot(dx, dy);
      if (d > 8) { p.vx += (dx / d) * 3.5; p.vy += (dy / d) * 2.0; }
    }
    if (ns.timer >= ns.maxTimer) {
      ns.phase = 'warn';
      ns.timer = 0; ns.maxTimer = 52;
      boss.vy = -55; boss.invincible = 130;
      bossWarnings.push({ type: 'circle', x: boss.cx(), y: 470, r: 95,
        color: '#ffaa00', timer: 52, maxTimer: 52, label: 'SLAM!' });
      slowMotion = 1.0; // snap back
      showBossDialogue('IMPACT.', 140);
      screenShake = Math.max(screenShake, 20);
    }

  } else if (ns.phase === 'warn') {
    if (ns.timer >= ns.maxTimer) {
      ns.phase = 'slam'; ns.timer = 0; ns.maxTimer = 1;
      if (boss) {
        boss.x  = clamp(ns.startX - boss.w / 2, 40, GAME_W - boss.w - 40);
        boss.y  = -90;
        boss.vy = 42; boss.vx = 0;
      }
    }

  } else if (ns.phase === 'slam') {
    if (boss && boss.onGround) {
      screenShake = Math.max(screenShake, 36);
      hitStopFrames = Math.max(hitStopFrames, 12);
      spawnParticles(boss.cx(), boss.y + boss.h, '#ffaa00', 35);
      spawnParticles(boss.cx(), boss.y + boss.h, '#ffffff', 20);
      spawnParticles(boss.cx(), boss.y + boss.h, '#ff4400', 12);
      for (const p of players) {
        if (p.isTrueForm || p.health <= 0) continue;
        const dd = Math.abs(p.cx() - boss.cx());
        if (dd < 140) {
          dealDamage(boss, p, 32, 24);
          p.vy = -16;
          spawnParticles(p.cx(), p.cy(), '#ffaa00', 10);
        }
      }
      tfNeutronStar = null;
    } else if (ns.timer > 130) {
      tfNeutronStar = null; // safety timeout
    }
  }
}

function drawTFNeutronStar() {
  if (!tfNeutronStar) return;
  const ns = tfNeutronStar;
  ctx.save();

  if (ns.phase === 'charge') {
    const prog = ns.timer / ns.maxTimer;
    const pulseR = 30 + prog * 40;
    const aura = ctx.createRadialGradient(ns.bossRef.cx(), ns.bossRef.cy(), 0, ns.bossRef.cx(), ns.bossRef.cy(), pulseR);
    aura.addColorStop(0,   `rgba(255,220,80,${prog * 0.8})`);
    aura.addColorStop(0.6, `rgba(255,120,0,${prog * 0.4})`);
    aura.addColorStop(1,   'rgba(255,80,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(ns.bossRef.cx(), ns.bossRef.cy(), pulseR, 0, Math.PI * 2); ctx.fill();

  } else if (ns.phase === 'pull') {
    const prog = ns.timer / ns.maxTimer;
    const pulseR = 55 + Math.sin(ns.timer * 0.14) * 20 + prog * 40;
    const auraA = 0.15 + prog * 0.18;
    const aura = ctx.createRadialGradient(ns.bossRef.cx(), ns.bossRef.cy(), 10, ns.bossRef.cx(), ns.bossRef.cy(), pulseR);
    aura.addColorStop(0,   `rgba(255,200,0,${auraA * 2.5})`);
    aura.addColorStop(0.5, `rgba(255,100,0,${auraA * 1.4})`);
    aura.addColorStop(1,   'rgba(255,80,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(ns.bossRef.cx(), ns.bossRef.cy(), pulseR, 0, Math.PI * 2); ctx.fill();
    // Concentric gravity rings — grow in opacity as pull ramps
    ctx.globalAlpha = (0.08 + prog * 0.14);
    ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 1.2;
    for (let rr = 55; rr <= 230; rr += 58) {
      ctx.beginPath(); ctx.arc(ns.bossRef.cx(), ns.bossRef.cy(), rr + Math.sin(ns.timer * 0.08 + rr * 0.02) * 6, 0, Math.PI * 2); ctx.stroke();
    }
    // Directional pull streaks toward boss
    if (ns.timer % 5 === 0) {
      ctx.globalAlpha = 0.18 + prog * 0.18;
      ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 1;
      const ang = Math.random() * Math.PI * 2;
      const dist = 140 + Math.random() * 120;
      ctx.beginPath();
      ctx.moveTo(ns.bossRef.cx() + Math.cos(ang) * dist, ns.bossRef.cy() + Math.sin(ang) * dist);
      ctx.lineTo(ns.bossRef.cx() + Math.cos(ang) * 18, ns.bossRef.cy() + Math.sin(ang) * 18);
      ctx.stroke();
    }

  } else if (ns.phase === 'implosion') {
    const prog = ns.timer / ns.maxTimer;
    // Everything flashes inward — bright burst of light
    ctx.globalAlpha = prog * 0.70;
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath(); ctx.arc(ns.bossRef.cx(), ns.bossRef.cy(), 10 + (1 - prog) * 80, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = (1 - prog) * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

  } else if (ns.phase === 'warn') {
    const prog = ns.timer / ns.maxTimer;
    const shR  = 12 + prog * 88;
    ctx.globalAlpha = 0.35 + prog * 0.45;
    ctx.fillStyle = '#ff8800';
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.ellipse(ns.startX, 480, shR, shR * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    // Rings converging on shadow
    ctx.globalAlpha = prog * 0.40;
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(ns.startX, 480, shR * 1.5, shR * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ── GALAXY SWEEP ───────────────────────────────────────────────────────────────
function updateTFGalaxySweep() {
  if (!tfGalaxySweep) return;
  const gs = tfGalaxySweep;
  gs.timer++;
  const boss = players.find(p => p.isTrueForm);

  if (gs.phase === 'charge') {
    gs.chargeTimer++;
    if (gs.chargeTimer >= gs.chargeMax) {
      gs.phase = 'active';
      bossWarnings.push({ type: 'circle', x: GAME_W / 2, y: GAME_H / 2 - 30,
        r: 280, color: '#8800ff', timer: 38, maxTimer: 38, label: 'GALAXY SWEEP!' });
      screenShake = Math.max(screenShake, 14);
      spawnParticles(GAME_W / 2, GAME_H / 2 - 30, '#cc66ff', 22);
    }
    return;
  }

  // Arm speed accelerates over duration: slow → fast
  const sweepProg = gs.timer / gs.maxTimer;
  gs.speed = 0.008 + sweepProg * 0.048; // 0.008 → 0.056 rad/frame
  gs.angle += gs.speed;

  const ARM_HALF = 0.42 + sweepProg * 0.06; // arms widen slightly at speed
  const ARM_LEN  = 290;
  const armAngles = [gs.angle, gs.angle + Math.PI];

  for (const p of players) {
    if (p.isTrueForm || p.health <= 0) continue;
    const dx = p.cx() - gs.cx;
    const dy = p.cy() - gs.cy;
    const d  = Math.hypot(dx, dy);
    if (d > ARM_LEN) continue;
    const playerAngle = Math.atan2(dy, dx);
    for (const armA of armAngles) {
      let diff = playerAngle - armA;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const hitKey = `${p.playerNum || p.name}_${Math.floor(gs.timer / 9)}`;
      if (Math.abs(diff) < ARM_HALF && p.invincible <= 0 && !gs.hit.has(hitKey)) {
        gs.hit.add(hitKey);
        const dmg = 12 + Math.floor(sweepProg * 8); // scales 12→20 as arms speed up
        dealDamage(boss || players[1], p, dmg, 12 + Math.floor(sweepProg * 6));
        spawnParticles(p.cx(), p.cy(), '#8800ff', 10);
        spawnParticles(p.cx(), p.cy(), '#cc44ff',  5);
        hitStopFrames = Math.max(hitStopFrames, 5);
        p.invincible = Math.max(p.invincible, 14);
      }
    }
  }
  if (gs.timer >= gs.maxTimer) {
    screenShake = Math.max(screenShake, 10);
    tfGalaxySweep = null;
  }
}

function drawTFGalaxySweep() {
  if (!tfGalaxySweep) return;
  const gs = tfGalaxySweep;
  ctx.save();

  if (gs.phase === 'charge') {
    const prog = gs.chargeTimer / gs.chargeMax;
    // Center swirl growing
    const cr = 12 + prog * 28;
    ctx.globalAlpha = prog * 0.65;
    const cGrad = ctx.createRadialGradient(gs.cx, gs.cy, 0, gs.cx, gs.cy, cr);
    cGrad.addColorStop(0,   `rgba(255,255,255,${prog})`);
    cGrad.addColorStop(0.5, `rgba(180,0,255,${prog * 0.7})`);
    cGrad.addColorStop(1,   'rgba(100,0,180,0)');
    ctx.fillStyle = cGrad;
    ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(gs.cx, gs.cy, cr, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); return;
  }

  const sweepProg = gs.timer / gs.maxTimer;
  const fade = gs.timer < 15 ? gs.timer / 15 : gs.timer > gs.maxTimer - 18 ? (gs.maxTimer - gs.timer) / 18 : 1;
  const ARM_HALF_RAD = 0.42 + sweepProg * 0.06;
  const ARM_LEN = 290;
  const armAngles = [gs.angle, gs.angle + Math.PI];
  const armColors = [['#6600cc', '#dd44ff'], ['#330066', '#aa22ee']];

  for (let ai = 0; ai < armAngles.length; ai++) {
    const a = armAngles[ai];
    const [fillCol, edgeCol] = armColors[ai];
    // Arm wedge — brighter as speed increases
    ctx.globalAlpha = (0.30 + sweepProg * 0.22) * fade;
    ctx.fillStyle = fillCol;
    ctx.shadowColor = edgeCol; ctx.shadowBlur = 8 + sweepProg * 14;
    ctx.beginPath();
    ctx.moveTo(gs.cx, gs.cy);
    ctx.arc(gs.cx, gs.cy, ARM_LEN, a - ARM_HALF_RAD, a + ARM_HALF_RAD);
    ctx.closePath(); ctx.fill();
    // Leading edge — sharp bright line
    ctx.globalAlpha = (0.75 + sweepProg * 0.20) * fade;
    ctx.strokeStyle = edgeCol;
    ctx.lineWidth = 2.5 + sweepProg * 2;
    ctx.shadowBlur = 16 + sweepProg * 18;
    ctx.beginPath();
    ctx.moveTo(gs.cx, gs.cy);
    ctx.lineTo(gs.cx + Math.cos(a) * ARM_LEN, gs.cy + Math.sin(a) * ARM_LEN);
    ctx.stroke();
    // Trailing particles at arm tip
    if (gs.timer % 5 === 0) {
      ctx.globalAlpha = 0.55 * fade;
      ctx.fillStyle = edgeCol;
      ctx.beginPath();
      const tipX = gs.cx + Math.cos(a) * (ARM_LEN * 0.8);
      const tipY = gs.cy + Math.sin(a) * (ARM_LEN * 0.8);
      ctx.arc(tipX, tipY, 4 + sweepProg * 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Center — pulsing star, gets hotter as arms accelerate
  ctx.globalAlpha = (0.55 + sweepProg * 0.30) * fade;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#cc44ff';
  ctx.shadowBlur  = 22 + sweepProg * 22;
  const starR = 10 + sweepProg * 8;
  ctx.beginPath(); ctx.arc(gs.cx, gs.cy, starR, 0, Math.PI * 2); ctx.fill();
  // Outer distortion ring
  ctx.globalAlpha = (0.10 + sweepProg * 0.15) * fade;
  ctx.strokeStyle = '#8800ff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(gs.cx, gs.cy, ARM_LEN, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ── MULTIVERSE FRACTURE ────────────────────────────────────────────────────────
// True timeline-echo system.
// Clones are purely visual — they track the real player's live position + a fixed X offset,
// so they mirror all movement identically without running extra physics.

function updateTFMultiverse() {
  if (!tfMultiverse) return;
  const mv = tfMultiverse;
  mv.timer++;
  const boss = mv.bossRef;
  const target = mv.targetRef;

  // ── show (0-70): slow-motion, clones appear ──────────────────────────────
  if (mv.phase === 'show' && mv.timer >= 70) {
    mv.phase = 'select';
    // Lock the strike position to where the real clone IS right now (absolute arena X)
    if (target) {
      mv.strikeX = clamp(target.cx() + mv.cloneOffsets[mv.realIdx], 30, GAME_W - 30);
      mv.strikeY = target.cy();
    }
    // Boss warning at the locked position
    bossWarnings.push({
      type: 'cross', x: mv.strikeX, y: mv.strikeY,
      r: 30, color: '#ff0044', timer: 40, maxTimer: 40, label: 'THIS TIMELINE!',
    });
    screenShake = Math.max(screenShake, 14);
    spawnParticles(mv.strikeX, mv.strikeY, '#ff0044', 14);
    spawnParticles(mv.strikeX, mv.strikeY, '#ffffff',  8);
    // Sound cue: reuse phaseUp
    if (typeof SoundManager !== 'undefined') SoundManager.phaseUp();
  }

  // ── select (70-115): warning shown, player has time to dodge ─────────────
  if (mv.phase === 'select' && mv.timer >= 115) {
    mv.phase = 'collapse';
    slowMotion   = 1.0; // snap back — urgency
    // Spawn shard particles for each non-real clone
    if (target) {
      for (let i = 0; i < mv.cloneOffsets.length; i++) {
        if (i === mv.realIdx) continue;
        const cx = clamp(target.cx() + mv.cloneOffsets[i], 30, GAME_W - 30);
        const cy = target.cy();
        // Shard burst: lightweight objects stored in mv.shards
        for (let s = 0; s < 10; s++) {
          const ang = (s / 10) * Math.PI * 2;
          mv.shards.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * (2 + Math.random() * 5),
            vy: Math.sin(ang) * (2 + Math.random() * 5) - 2,
            life: 22, maxLife: 22,
            col: ['#00ccff', '#44ffaa', '#aa44ff'][i % 3],
          });
        }
        spawnParticles(cx, cy, '#00ccff', 8);
        spawnParticles(cx, cy, '#ffffff', 5);
      }
      // Boss ghosts also shatter
      spawnParticles(boss ? (GAME_W - boss.cx()) : GAME_W * 0.25, boss ? boss.cy() : 220, '#cc44ff', 10);
    }
    screenShake = Math.max(screenShake, 18);
    hitStopFrames = Math.max(hitStopFrames, 8);
  }

  // ── collapse (115-148): shards fly, selected clone glows ─────────────────
  // Tick shard particles
  for (let s = mv.shards.length - 1; s >= 0; s--) {
    const sh = mv.shards[s];
    sh.x += sh.vx; sh.y += sh.vy; sh.vy += 0.3; // gravity
    sh.life--;
    if (sh.life <= 0) { mv.shards.splice(s, 1); }
  }

  if (mv.phase === 'collapse' && mv.timer >= 148) {
    mv.phase = 'strike';
    // Screen flash
    hitStopFrames = Math.max(hitStopFrames, 10);
    screenShake   = Math.max(screenShake, 24);
    spawnParticles(mv.strikeX, mv.strikeY, '#ff0044', 24);
    spawnParticles(mv.strikeX, mv.strikeY, '#00ccff', 16);
    spawnParticles(mv.strikeX, mv.strikeY, '#ffffff', 12);
    // Damage: player must have dodged away from mv.strikeX
    if (boss && target && target.health > 0) {
      const distFromStrike = Math.abs(target.cx() - mv.strikeX);
      if (distFromStrike < 68 && !mv.hit) {
        mv.hit = true;
        dealDamage(boss, target, 32, 22);
        spawnParticles(target.cx(), target.cy(), '#00ccff', 16);
        spawnParticles(target.cx(), target.cy(), '#ffffff',  8);
        hitStopFrames = Math.max(hitStopFrames, 8);
        screenShake   = Math.max(screenShake, 20);
      }
    }
  }

  if (mv.timer >= mv.maxTimer) { mv.shards.length = 0; tfMultiverse = null; }
}

// ── helper: draw a lightweight stickman silhouette ──────────────────────────
function _drawTimelineStickman(x, y, facing, strokeCol, lw, shadowB, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = strokeCol;
  ctx.fillStyle   = strokeCol;
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.shadowColor = strokeCol;
  ctx.shadowBlur  = shadowB;
  const headR = 9, neckY = y + headR * 2 + 1, shoulderY = neckY + 4, hipY = shoulderY + 24;
  // Head
  ctx.beginPath(); ctx.arc(x, y + headR, headR, 0, Math.PI * 2); ctx.stroke();
  // Body
  ctx.beginPath(); ctx.moveTo(x, neckY); ctx.lineTo(x, hipY); ctx.stroke();
  // Arms
  ctx.beginPath(); ctx.moveTo(x - 14, shoulderY + 4); ctx.lineTo(x + 14, shoulderY + 4); ctx.stroke();
  // Legs
  ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + facing * 10, hipY + 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x - facing * 10, hipY + 22); ctx.stroke();
  ctx.restore();
}

function drawTFMultiverse() {
  if (!tfMultiverse) return;
  const mv = tfMultiverse;
  const target = mv.targetRef;
  const boss   = mv.bossRef;
  ctx.save();

  const showProg    = Math.min(1, mv.timer / 24); // fade-in during first 24 frames
  const isCollapsed = mv.phase === 'collapse' || mv.phase === 'strike';
  const isStrike    = mv.phase === 'strike';

  // ── Otherworldly screen tint during show / select ──────────────────────────
  if (!isCollapsed) {
    const tintA = showProg * 0.16;
    ctx.globalAlpha = tintA;
    ctx.fillStyle = '#001122';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.globalAlpha = 1;
  }

  // ── Boss ghost mirrors ──────────────────────────────────────────────────────
  if (boss && !isCollapsed) {
    for (const bg of mv.bossGhosts) {
      const ghostX = clamp(boss.cx() + bg.offsetX, 40, GAME_W - 40);
      const ghostY = boss.cy();
      // Semi-transparent boss silhouette (just a dark figure with purple tint)
      ctx.save();
      ctx.globalAlpha = showProg * 0.28;
      ctx.strokeStyle = '#cc44ff'; ctx.fillStyle = '#330055';
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 14;
      const bH = boss.h || 50, bW = boss.w || 18;
      // Head
      ctx.beginPath(); ctx.arc(ghostX, ghostY + 9, 9, 0, Math.PI * 2); ctx.stroke();
      // Body
      ctx.beginPath(); ctx.moveTo(ghostX, ghostY + 18); ctx.lineTo(ghostX, ghostY + bH * 0.8); ctx.stroke();
      // Arms
      ctx.beginPath(); ctx.moveTo(ghostX - 14, ghostY + 22); ctx.lineTo(ghostX + 14, ghostY + 22); ctx.stroke();
      // Legs
      ctx.beginPath(); ctx.moveTo(ghostX, ghostY + bH * 0.8); ctx.lineTo(ghostX - 10, ghostY + bH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ghostX, ghostY + bH * 0.8); ctx.lineTo(ghostX + 10, ghostY + bH); ctx.stroke();
      ctx.restore();
    }
  }

  // ── Player clones ──────────────────────────────────────────────────────────
  if (target) {
    const f = target.facing || 1;
    // Root position: all clones mirror real player's Y and movement in real-time.
    // X = player.cx() + offset — so they track the player as they move.
    // Lag offsets: clone 0 = current, clone 1 = 8 frames ago, clone 2 = 16 frames ago
    const _lagSteps = [0, 8, 16];
    const _clonePos = mv.cloneOffsets.map((offset, i) => {
      const _hist = _tfCloneHistory[Math.max(0, _tfCloneHistory.length - 1 - (_lagSteps[i] || 0))];
      return _hist
        ? { x: _hist.x + offset, y: _hist.y, facing: _hist.facing }
        : { x: target.cx() + offset, y: target.cy(), facing: target.facing };
    });
    for (let i = 0; i < mv.cloneOffsets.length; i++) {
      const isReal = i === mv.realIdx;
      const rawX   = _clonePos[i].x;
      const cloneX = clamp(rawX, 30, GAME_W - 30);
      const cloneY = (_clonePos[i].y || target.y) + target.h * 0.25; // stickman reference Y

      // After collapse: only the selected clone remains visible
      if (isCollapsed && !isReal) continue;
      // After strike: hide everything
      if (isStrike) continue;

      // Alpha: clones are dim; real candidate brightens during select
      let cloneAlpha;
      if (isReal) {
        cloneAlpha = showProg * (mv.phase === 'select' || mv.phase === 'collapse' ? 0.90 : 0.50);
      } else {
        cloneAlpha = showProg * 0.28;
      }

      // Visual differentiation
      const cloneColors = ['#00ccff', '#44ffaa', '#aa44ff'];
      const col = isReal && mv.phase !== 'show' ? '#ff2244' : cloneColors[i % 3];
      const lw  = isReal && mv.phase !== 'show' ? 2.2 : 1.5;
      const shB = isReal && mv.phase !== 'show' ? 22 : 6;

      _drawTimelineStickman(cloneX, cloneY, f, col, lw, shB, cloneAlpha);

      // Timeline label (only during show phase, non-real clones)
      if (!isReal && mv.phase === 'show') {
        ctx.save();
        ctx.globalAlpha = showProg * 0.50;
        ctx.fillStyle = col; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.shadowColor = col; ctx.shadowBlur = 5;
        ctx.fillText(`T-${i + 1}`, cloneX, cloneY - 42);
        ctx.restore();
      }

      // Selection highlight ring on real clone during 'select'
      if (isReal && mv.phase === 'select') {
        const pulseProg = (mv.timer - 70) / 45;
        const pulseR = 22 + Math.sin(mv.timer * 0.35) * 5;
        ctx.save();
        ctx.globalAlpha = 0.50 + pulseProg * 0.35;
        ctx.strokeStyle = '#ff0044'; ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(cloneX, cloneY + 15, pulseR, 0, Math.PI * 2); ctx.stroke();
        // Crosshair
        ctx.globalAlpha = 0.70 + pulseProg * 0.20;
        ctx.beginPath(); ctx.moveTo(cloneX - 26, cloneY + 15); ctx.lineTo(cloneX + 26, cloneY + 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cloneX, cloneY - 14); ctx.lineTo(cloneX, cloneY + 44); ctx.stroke();
        ctx.restore();
      }

      // Collapse: selected clone gets a bright shockwave ring
      if (isReal && mv.phase === 'collapse') {
        const cProg = (mv.timer - 115) / 33;
        ctx.save();
        ctx.globalAlpha = (1 - cProg) * 0.70;
        ctx.strokeStyle = '#ff2244'; ctx.lineWidth = 3;
        ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.arc(cloneX, cloneY + 15, 24 + cProg * 40, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // ── Strike marker: locked X beam column ──────────────────────────────────
    if (mv.phase === 'strike') {
      const sf = mv.timer - 148;
      const fade = Math.max(0, 1 - sf / 42);
      ctx.save();
      // Vertical impact column
      const iGrad = ctx.createLinearGradient(mv.strikeX - 22, 0, mv.strikeX + 22, 0);
      iGrad.addColorStop(0,   'rgba(255,0,68,0)');
      iGrad.addColorStop(0.4, `rgba(255,0,68,${0.55 * fade})`);
      iGrad.addColorStop(0.5, `rgba(255,255,255,${0.80 * fade})`);
      iGrad.addColorStop(0.6, `rgba(255,0,68,${0.55 * fade})`);
      iGrad.addColorStop(1,   'rgba(255,0,68,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = iGrad;
      ctx.fillRect(mv.strikeX - 22, 0, 44, GAME_H);
      // Full flash on first 5 frames
      if (sf <= 5) {
        ctx.globalAlpha = 0.70 - sf * 0.12;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, GAME_W, GAME_H);
      }
      ctx.restore();
    }
  }

  // ── Shard particles ────────────────────────────────────────────────────────
  for (const sh of mv.shards) {
    const sf = sh.life / sh.maxLife;
    ctx.save();
    ctx.globalAlpha = sf * 0.80;
    ctx.fillStyle = sh.col;
    ctx.shadowColor = sh.col; ctx.shadowBlur = 8;
    const sz = 2 + sf * 3;
    ctx.fillRect(sh.x - sz / 2, sh.y - sz / 2, sz, sz);
    ctx.restore();
  }

  // ── Dodge hint text ────────────────────────────────────────────────────────
  if (mv.phase === 'select') {
    const ht = (mv.timer - 70) / 45;
    ctx.save();
    ctx.globalAlpha = Math.min(ht * 1.5, 0.85);
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 10;
    ctx.fillText('← DODGE AWAY →', mv.strikeX, (mv.targetRef ? mv.targetRef.y - 28 : 80));
    ctx.restore();
  }

  ctx.restore();
}

// ── SUPERNOVA ─────────────────────────────────────────────────────────────────
function updateTFSupernova() {
  if (!tfSupernova) return;
  const sn = tfSupernova;
  sn.timer++;
  const boss = sn.bossRef;

  if (sn.phase === 'buildup') {
    // Particles converge on boss from all directions
    if (sn.timer % 3 === 0) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 180 + Math.random() * 220;
      spawnParticles(
        boss.cx() + Math.cos(ang) * dist,
        boss.cy() + Math.sin(ang) * dist,
        Math.random() < 0.5 ? '#ffff88' : '#ff8800', 3
      );
    }
    if (sn.timer >= sn.maxTimer) {
      sn.phase = 'implosion';
      sn.timer = 0; sn.maxTimer = 36;
      // Heavy pull + deeper slow-mo during implosion
      slowMotion   = 0.08;
      hitSlowTimer = 50;
      screenShake  = Math.max(screenShake, 24);
    }

  } else if (sn.phase === 'implosion') {
    // Everything gets sucked toward boss center — massive pull spike
    for (const p of players) {
      if (p.isTrueForm || p.health <= 0) continue;
      const dx = boss.cx() - p.cx();
      const dy = boss.cy() - (p.y + p.h / 2);
      const d  = Math.hypot(dx, dy);
      if (d > 6) { p.vx += (dx / d) * 4.5; p.vy += (dy / d) * 3.0; }
    }
    if (sn.timer >= sn.maxTimer) {
      sn.phase = 'active';
      sn.timer = 0; sn.maxTimer = 60;
      slowMotion   = 1.0; // snap to normal on detonation
      screenShake  = Math.max(screenShake, 44);
      hitStopFrames = Math.max(hitStopFrames, 14);
      spawnParticles(boss.cx(), boss.cy(), '#ffffff', 40);
      spawnParticles(boss.cx(), boss.cy(), '#ffff88', 25);
      spawnParticles(boss.cx(), boss.cy(), '#ff8800', 20);
    }

  } else if (sn.phase === 'active') {
    sn.r = (sn.timer / sn.maxTimer) * 350;
    for (const p of players) {
      if (p.isTrueForm || p.health <= 0) continue;
      const dd = Math.hypot(p.cx() - boss.cx(), p.cy() - boss.cy());
      const inWave = dd >= 32 && dd <= sn.r + 26 && dd >= sn.r - 44;
      const hitKey = `${p.playerNum || p.name}_${Math.floor(sn.timer / 7)}`;
      if (inWave && p.invincible <= 0 && !sn.hit.has(hitKey)) {
        sn.hit.add(hitKey);
        dealDamage(boss, p, 36, 24);
        p.vy = -12;
        spawnParticles(p.cx(), p.cy(), '#ffff88', 14);
        hitStopFrames = Math.max(hitStopFrames, 8);
        p.invincible = Math.max(p.invincible, 22);
      }
    }
    if (sn.timer >= sn.maxTimer) tfSupernova = null;
  }
}

function drawTFSupernova() {
  if (!tfSupernova) return;
  const sn = tfSupernova;
  const boss = sn.bossRef;
  ctx.save();

  if (sn.phase === 'buildup') {
    const prog = sn.timer / sn.maxTimer;
    // Screen darkens — anticipation
    ctx.globalAlpha = prog * 0.28;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    // Growing radiant halo
    const haloR = 18 + prog * 90;
    const halo = ctx.createRadialGradient(boss.cx(), boss.cy(), 0, boss.cx(), boss.cy(), haloR);
    halo.addColorStop(0,   `rgba(255,255,255,${prog * 0.88})`);
    halo.addColorStop(0.4, `rgba(255,220,80,${prog * 0.55})`);
    halo.addColorStop(1,   'rgba(255,120,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = halo;
    ctx.shadowColor = '#ffff44'; ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.arc(boss.cx(), boss.cy(), haloR, 0, Math.PI * 2); ctx.fill();
    // Converging streaks
    ctx.globalAlpha = prog * 0.20;
    ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 1;
    for (let si = 0; si < 8; si++) {
      const ang = (si / 8) * Math.PI * 2 + sn.timer * 0.04;
      const len = 80 + prog * 100;
      ctx.beginPath();
      ctx.moveTo(boss.cx() + Math.cos(ang) * (haloR + len), boss.cy() + Math.sin(ang) * (haloR + len));
      ctx.lineTo(boss.cx() + Math.cos(ang) * haloR * 1.1, boss.cy() + Math.sin(ang) * haloR * 1.1);
      ctx.stroke();
    }

  } else if (sn.phase === 'implosion') {
    const prog = sn.timer / sn.maxTimer;
    // Screen goes almost dark
    ctx.globalAlpha = 0.35 + prog * 0.40;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    // Collapsing sphere
    const colR = (1 - prog) * 120 + 10;
    const colGrad = ctx.createRadialGradient(boss.cx(), boss.cy(), 0, boss.cx(), boss.cy(), colR);
    colGrad.addColorStop(0,   `rgba(255,255,255,${0.9 + prog * 0.1})`);
    colGrad.addColorStop(0.4, `rgba(255,200,50,${0.7})`);
    colGrad.addColorStop(1,   'rgba(255,60,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = colGrad;
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(boss.cx(), boss.cy(), colR, 0, Math.PI * 2); ctx.fill();

  } else if (sn.phase === 'active') {
    const prog = sn.timer / sn.maxTimer;
    const r = sn.r;
    // White screen flash on detonation
    if (sn.timer <= 5) {
      ctx.globalAlpha = 0.88 - sn.timer * 0.14;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }
    if (r > 0) {
      const ringFade = Math.max(0, 0.90 - prog * 0.75);
      // Outer shockwave ring
      ctx.globalAlpha = ringFade;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 20 - prog * 14;
      ctx.shadowColor = '#ffff88'; ctx.shadowBlur = 35;
      ctx.beginPath(); ctx.arc(boss.cx(), boss.cy(), r, 0, Math.PI * 2); ctx.stroke();
      // Inner orange ring
      ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 7;
      ctx.shadowBlur  = 14;
      ctx.beginPath(); ctx.arc(boss.cx(), boss.cy(), Math.max(1, r - 24), 0, Math.PI * 2); ctx.stroke();
      // Second trailing ring
      if (r > 40) {
        ctx.globalAlpha = ringFade * 0.50;
        ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(boss.cx(), boss.cy(), Math.max(1, r - 50), 0, Math.PI * 2); ctx.stroke();
      }
      // Safe zone indicator — green ring around boss core
      ctx.globalAlpha = ringFade * 0.55;
      ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(boss.cx(), boss.cy(), 45, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

function resetTFState() {
  tfGravityInverted  = false;
  tfGravityTimer     = 0;
  tfControlsInverted = false;
  tfFloorRemoved     = false;
  tfFloorTimer       = 0;
  tfBlackHoles       = [];
  tfSizeTargets.clear();
  tfGravityWells     = [];
  tfMeteorCrash      = null;
  tfClones           = [];
  tfChainSlam        = null;
  tfGraspSlam        = null;
  tfShockwaves       = [];
  tfPhaseShift       = null;
  tfRealityTear      = null;
  tfMathBubble       = null;
  tfCalcStrike       = null;
  tfGhostPaths       = null;
  tfRealityOverride  = null;
  tfGammaBeam        = null;
  tfNeutronStar      = null;
  tfGalaxySweep      = null;
  if (tfMultiverse) { tfMultiverse.shards && (tfMultiverse.shards.length = 0); tfMultiverse = null; }
  tfSupernova        = null;
  // Restore slow-motion if any attack left it in a reduced state
  if (slowMotion < 1.0) { slowMotion = 1.0; hitSlowTimer = 0; }
  // Reset dimension shift — always restore 2D on fight end
  if (tfDimensionIs3D) {
    tfDimensionIs3D = false;
    set3DView(settings.view3D ? 'settings' : false);
  }
  // Reset telegraph / warning system
  resetBossWarnings();
  // Restore void arena floor
  if (ARENAS.void) {
    const floorPl = ARENAS.void.platforms.find(p => p.isFloor);
    if (floorPl) floorPl.isFloorDisabled = false;
  }
}

// ── 3D View helper ────────────────────────────────────────────────────────────
// mode: false = 2D, 'tf' = TrueForm dramatic 3D, 'settings' = gentle persistent 3D
function set3DView(mode) {
  const c = document.getElementById('gameCanvas');
  if (!c) return;
  c.classList.remove('view-3d', 'view-3d-tf');
  if (mode === 'tf')  c.classList.add('view-3d-tf');
  else if (mode)      c.classList.add('view-3d');
}

