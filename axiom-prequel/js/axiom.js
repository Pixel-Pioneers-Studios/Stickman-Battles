'use strict';

// ─── Axiom — Player character ─────────────────────────────────────────────────
// Combat feel: Kratos (GoW 2018). Heavy, deliberate, devastating.
// Primarily bare-handed. Occasionally carries a chain or a sword.
//
// Controls:
//   Move:   ← → (or A/D)
//   Jump:   ↑ / W / Space  (no double jump — he's human)
//   Light:  J/Z  (3-hit combo: jab → cross → hook)
//   Heavy:  K/X  (slow overhead slam — launches enemies)
//   Grab:   L/C  (grab → headbutt → throw)
//   Dodge:  Shift (direction-aware roll, 14 iframes)
//   Pickup: E/F  (pick up / discard weapon)
class Axiom {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 22;
    this.h = 52;

    this.vx = 0;
    this.vy = 0;
    this.facing   = 1;
    this.onGround = false;

    // Vitals
    this.health    = 100;
    this.maxHealth = 100;
    this.superMeter = 0;
    this.maxSuper   = 100;

    // State machine
    // States: idle | run | jump | fall | attack | heavy | grab | dodge | hurt | knockdown | getup | dead
    this.state      = 'idle';
    this.stateTimer = 0;

    // Invincibility
    this.invincibleFrames = 0;

    // ── Combat ───────────────────────────────────────────────────────────────
    this.comboStage  = 0;   // 0=jab 1=cross 2=hook
    this.comboTimer  = 0;   // frames until combo resets
    this._attackData = null;
    this._attackMaxTimer = 0;
    this.attackTimer = 0;
    this.attackHitSet = new Set();

    this.heavyTimer  = 0;
    this.heavyWindup = 0;   // 0=windup | 1=active | 2=endlag

    this.grabTarget  = null;
    this.grabTimer   = 0;

    this.dodgeFacing = 1;
    this.dodgeCooldown = 0;

    this.knockdownTimer = 0;
    this.footstepTimer  = 0;    // footstep cadence counter
    this.superBurstTimer = 0;   // visual glow after super activation

    // ── Weapon ───────────────────────────────────────────────────────────────
    // null = fists | 'chain' | 'sword'
    this.weapon            = null;
    this.weaponDurability  = 0;   // swings remaining
    this.chainSwingAngle   = 0;   // visual chain angle
    this.swordSwingProgress = 0;  // 0–1 during swing

    // Pickup prompt
    this.nearPickup = null;   // set by story.js when a weapon is nearby

    // ── Animation ─────────────────────────────────────────────────────────────
    this.legPhase  = 0;
    this.legTimer  = 0;
    this.armAngleR = Math.PI / 2 + 0.3;
    this.armAngleL = Math.PI / 2 - 0.3;
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  // ── State helper ─────────────────────────────────────────────────────────
  _setState(s) {
    this.state      = s;
    this.stateTimer = 0;
  }

  // ── Public damage entry (called by dealDamage()) ──────────────────────────
  enterHurt() {
    if (this.state === 'dead' || this.state === 'knockdown') return;
    this._setState('hurt');
    this.flashTimer = 10;
  }

  enterKnockdown() {
    if (this.state === 'dead') return;
    this._releaseGrab();
    this.knockdownTimer = 60;
    this._setState('knockdown');
  }

  // ── Main update ───────────────────────────────────────────────────────────
  update() {
    if (this.state === 'dead') return;

    this.stateTimer++;
    if (this.invincibleFrames > 0) this.invincibleFrames--;
    if (this.dodgeCooldown   > 0) this.dodgeCooldown--;
    if (this.comboTimer      > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) this.comboStage = 0;
    }

    // Weapon pickup
    if (just('pickup')) this._handlePickup();

    switch (this.state) {
      case 'idle':
      case 'run':
        this._handleGroundMovement();
        this._handleGroundCombat();
        this._handleDodge();
        this._handleJump();
        break;

      case 'jump':
      case 'fall':
        this._handleAirMovement();
        this._handleAirCombat();
        break;

      case 'attack':
        this._handleGroundMovement(true);   // restricted movement
        this._tickAttack();
        break;

      case 'heavy':
        this._tickHeavy();
        break;

      case 'grab':
        this._tickGrab();
        break;

      case 'dodge':
        this._tickDodge();
        break;

      case 'hurt':
        if (this.stateTimer >= 18) this._setState('idle');
        break;

      case 'knockdown':
        this.knockdownTimer--;
        if (this.knockdownTimer <= 0) {
          this._setState('getup');
          this.invincibleFrames = 35;
        }
        break;

      case 'getup':
        if (this.stateTimer >= 28) this._setState('idle');
        break;
    }

    // Chain weapon visual
    if (this.weapon === 'chain') {
      this.chainSwingAngle += 0.12;
    }

    this._applyPhysics();
    this._updateAnimAngles();

    if (this.health <= 0 && this.state !== 'dead') {
      this.health = 0;
      this._setState('dead');
    }
  }

  // ── Movement ──────────────────────────────────────────────────────────────
  _handleGroundMovement(restricted = false) {
    const spd     = restricted ? 1.8 : 4.0;
    const lerpAmt = restricted ? 0.10 : 0.22;

    if (held('left')) {
      this.vx = lerp(this.vx, -spd, lerpAmt);
      if (!restricted) this.facing = -1;
      if (this.onGround && !restricted) {
        this._setState('run');
        if (++this.footstepTimer % 14 === 0) spawnDustPuff(this.cx(), this.y + this.h);
      }
    } else if (held('right')) {
      this.vx = lerp(this.vx, spd, lerpAmt);
      if (!restricted) this.facing = 1;
      if (this.onGround && !restricted) {
        this._setState('run');
        if (++this.footstepTimer % 14 === 0) spawnDustPuff(this.cx(), this.y + this.h);
      }
    } else {
      this.footstepTimer = 0;
      this.vx *= FRICTION;
      if (Math.abs(this.vx) < 0.3) this.vx = 0;
      if (this.onGround && this.state === 'run') this._setState('idle');
    }
  }

  _handleAirMovement() {
    const spd = 3.2;
    if (held('left')) {
      this.vx = lerp(this.vx, -spd, 0.10);
      this.facing = -1;
    } else if (held('right')) {
      this.vx = lerp(this.vx, spd, 0.10);
      this.facing = 1;
    } else {
      this.vx *= AIR_FRIC;
    }
  }

  _handleJump() {
    if (just('jump') && this.onGround) {
      this.vy    = -13.0;
      this._setState('jump');
      spawnDustPuff(this.cx(), this.y + this.h);
    }
  }

  // ── Ground combat ─────────────────────────────────────────────────────────
  _handleGroundCombat() {
    if (just('light')) {
      this._startLight();
    } else if (just('heavy')) {
      this._startHeavy();
    } else if (just('grab')) {
      this._startGrab();
    } else if (just('super')) {
      this._handleSuper();
    }
  }

  _handleSuper() {
    if (this.superMeter < this.maxSuper) return;
    this._activateSuper();
  }

  _activateSuper() {
    this.superMeter   = 0;
    this.superBurstTimer = 22;
    superFlashTimer   = 28;
    shake(18);
    applyHitStop(14);

    spawnVoidBurst(this.cx(), this.cy());

    // Radial void pulse — damages all enemies within range
    for (const e of enemies) {
      if (e.health <= 0 || e.state === 'dead') continue;
      const d = dist(this.cx(), this.cy(), e.cx(), e.cy());
      if (d < 440) {
        const falloff = Math.max(0.4, 1 - d / 600);
        dealDamage(this, e, Math.ceil(38 * falloff), 20, true);
        spawnVoidFlicker(e.cx(), e.cy());
      }
    }
  }

  _handleAirCombat() {
    if (just('heavy')) {
      // Air slam — dive down
      this.vy = 10;
      this._attackData = { type: 'aerial_slam', damage: 20, kb: 12, launch: true, range: 78 };
      this._attackMaxTimer = 18;
      this.attackTimer     = 18;
      this.attackHitSet    = new Set();
      this._setState('attack');
    } else if (just('light')) {
      this._attackData = { type: 'aerial_punch', damage: 12, kb: 7, launch: false, range: 72 };
      this._attackMaxTimer = 14;
      this.attackTimer     = 14;
      this.attackHitSet    = new Set();
      this._setState('attack');
    }
  }

  // ── Light combo ───────────────────────────────────────────────────────────
  _startLight() {
    const stage = this.comboStage;

    // Chain weapon overrides combo stage 2 → chain finisher
    if (this.weapon === 'chain' && stage === 2) {
      this._startChainLash();
      return;
    }
    // Sword does a blade combo for all 3 stages
    if (this.weapon === 'sword') {
      this._startSwordSwing(stage);
      return;
    }

    const dmg   = [9,  12, 17][stage];
    const kb    = [5,   6, 10][stage];
    const dur   = [12, 14, 18][stage];
    const launch = stage === 2;

    this._attackData = {
      type: ['jab','cross','hook'][stage],
      stage, damage: dmg, kb, launch, range: 74,
    };
    this._attackMaxTimer = dur;
    this.attackTimer     = dur;
    this.attackHitSet    = new Set();

    this.comboStage = (stage + 1) % 3;
    this.comboTimer = 52;

    this._setState('attack');
  }

  // ── Heavy slam ────────────────────────────────────────────────────────────
  _startHeavy() {
    this.comboStage     = 0;
    this.comboTimer     = 0;
    this.heavyWindup    = 0;
    this.heavyTimer     = 0;
    this._attackData    = { type: 'heavy', damage: 26, kb: 14, launch: true, range: 85 };
    this._attackMaxTimer = 30;
    this.attackTimer    = 30;
    this.attackHitSet   = new Set();
    this._setState('heavy');
  }

  _tickHeavy() {
    this.heavyTimer++;
    this.vx *= 0.6;  // planted during heavy

    // Wind-up phase (frames 0–8): raise hands
    if (this.heavyTimer <= 8) {
      this.heavyWindup = 0;
      return;
    }
    // Active frame (9–13): slam down
    if (this.heavyTimer <= 13) {
      this.heavyWindup = 1;
      const d = this._attackData;
      for (const e of enemies) {
        if (e.health <= 0 || this.attackHitSet.has(e)) continue;
        const dx = (e.cx() - this.cx()) * this.facing;
        const dy = Math.abs(e.cy() - this.cy());
        if (dx > -15 && dx < d.range && dy < (this.h + e.h) * 0.6) {
          this.attackHitSet.add(e);
          dealDamage(this, e, d.damage, d.kb, d.launch);
          spawnHeavyImpact(e.cx(), e.cy());
          shake(12);
          applyHitStop(8);
          if (this.weapon === 'chain') this.weaponDurability--;
        }
      }
      return;
    }
    // End-lag (14–30)
    this.heavyWindup = 2;
    if (this.heavyTimer > 30) this._setState(this.onGround ? 'idle' : 'fall');
  }

  // ── Chain lash (combo finisher with chain) ────────────────────────────────
  _startChainLash() {
    this._attackData = { type: 'chain_lash', damage: 19, kb: 13, launch: true, range: 110 };
    this._attackMaxTimer = 20;
    this.attackTimer     = 20;
    this.attackHitSet    = new Set();
    this.comboStage      = 0;
    this.comboTimer      = 0;
    this._setState('attack');
    this.weaponDurability--;
  }

  // ── Sword swing ───────────────────────────────────────────────────────────
  _startSwordSwing(stage) {
    const dmg  = [13, 16, 21][stage];
    const dur  = [14, 14, 18][stage];
    this._attackData = { type: 'sword', stage, damage: dmg, kb: 8, launch: stage === 2, range: 95 };
    this._attackMaxTimer = dur;
    this.attackTimer     = dur;
    this.attackHitSet    = new Set();
    this.comboStage      = (stage + 1) % 3;
    this.comboTimer      = 50;
    this._setState('attack');
    this.weaponDurability--;
    if (this.weaponDurability <= 0) {
      this.weapon = null;
      spawnParticles(this.cx(), this.cy(), '#aaaacc', 6, { speed: 4 });
    }
  }

  // ── Attack tick (light/aerial/chain/sword) ────────────────────────────────
  _tickAttack() {
    this.attackTimer--;
    const progress = 1 - (this.attackTimer / this._attackMaxTimer);
    this.swordSwingProgress = progress;

    // Active window: first 55% of the attack
    const active = progress < 0.55;
    if (active) {
      const d = this._attackData;
      for (const e of enemies) {
        if (e.health <= 0 || this.attackHitSet.has(e)) continue;
        const dx   = (e.cx() - this.cx()) * this.facing;
        const dy   = Math.abs(e.cy() - this.cy());
        if (dx > -20 && dx < d.range && dy < (this.h + e.h) * 0.6) {
          this.attackHitSet.add(e);
          dealDamage(this, e, d.damage, d.kb, d.launch);
          spawnHitSpark(e.cx(), e.cy(), this.facing);
          if (d.launch) {
            spawnHeavyImpact(e.cx(), e.cy());
            shake(7);
            applyHitStop(5);
          } else {
            shake(3);
            applyHitStop(3);
          }
        }
      }
    }

    if (this.attackTimer <= 0) {
      this._setState(this.onGround ? 'idle' : 'fall');
    }
  }

  // ── Grab ──────────────────────────────────────────────────────────────────
  _startGrab() {
    let closest = null, closestDist = 80;
    for (const e of enemies) {
      if (e.health <= 0 || e.state === 'dead') continue;
      const d = dist(this.cx(), this.cy(), e.cx(), e.cy());
      if (d < closestDist) { closest = e; closestDist = d; }
    }
    if (!closest) return;
    this.grabTarget    = closest;
    closest.grabbed    = this;
    this.grabTimer     = 50;
    this._setState('grab');
  }

  _tickGrab() {
    const t = this.grabTarget;
    if (!t || t.health <= 0 || t.state === 'dead') { this._releaseGrab(); return; }

    // Pin enemy in front of Axiom
    t.x  = this.x + this.facing * (this.w + 2);
    t.y  = this.y + 2;
    t.vx = 0;
    t.vy = 0;

    this.grabTimer--;

    // Headbutt
    if (just('light') || just('heavy')) {
      dealDamage(this, t, 18, 0, false);
      spawnHitSpark(t.cx(), t.cy(), this.facing);
      shake(5);
      this.grabTimer = 24;
      return;
    }

    // Throw (jump or direction + no attack)
    if (just('jump') || this.grabTimer <= 0) {
      const throwDir = held('left') ? -1 : held('right') ? 1 : this.facing;
      t.vx = throwDir * 13;
      t.vy = -9;
      dealDamage(this, t, 14, 0, true);
      spawnBloodPuff(t.cx(), t.cy(), throwDir);
      shake(6);
      applyHitStop(4);
      this._releaseGrab();
    }
  }

  _releaseGrab() {
    if (this.grabTarget) {
      this.grabTarget.grabbed = null;
      this.grabTarget         = null;
    }
    if (this.state === 'grab') this._setState('idle');
  }

  // ── Dodge ─────────────────────────────────────────────────────────────────
  _handleDodge() {
    if (just('dodge') && this.dodgeCooldown <= 0 && this.onGround) {
      this.dodgeFacing    = held('left') ? -1 : held('right') ? 1 : this.facing;
      this.dodgeCooldown  = 52;
      this.invincibleFrames = 14;
      spawnDustPuff(this.cx(), this.y + this.h);
      this._setState('dodge');
    }
  }

  _tickDodge() {
    this.vx = lerp(this.vx, this.dodgeFacing * 8, 0.35);
    if (this.stateTimer >= 14) this._setState('idle');
  }

  // ── Weapon pickup ─────────────────────────────────────────────────────────
  _handlePickup() {
    if (this.nearPickup && !this.weapon) {
      this.weapon           = this.nearPickup.weaponType;
      this.weaponDurability = this.nearPickup.durability;
      this.nearPickup.collected = true;
      this.nearPickup       = null;
      spawnParticles(this.cx(), this.cy(), '#ffdd88', 8, { speed: 4 });
    } else if (this.weapon) {
      // Drop weapon
      this.weapon           = null;
      this.weaponDurability = 0;
      spawnParticles(this.cx(), this.cy(), '#888888', 5, { speed: 3 });
    }
  }

  // ── Physics ───────────────────────────────────────────────────────────────
  _applyPhysics() {
    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
    this.x += this.vx;
    this.y += this.vy;

    // Level horizontal bounds
    if (this.x < 0)                  { this.x = 0;                  this.vx = 0; }
    if (this.x + this.w > levelWidth) { this.x = levelWidth - this.w; this.vx = 0; }

    const wasGrounded = this.onGround;
    this.onGround = applyPlatformCollisions(this);

    if (this.onGround && !wasGrounded && this.vy === 0) {
      // Land
      if (this.state === 'jump' || this.state === 'fall') this._setState('idle');
      spawnDustPuff(this.cx(), this.y + this.h);
    }

    if (!this.onGround && this.vy > 0) {
      if (this.state !== 'attack' && this.state !== 'heavy' && this.state !== 'grab') {
        if (this.state !== 'fall' && this.state !== 'knockdown') this._setState('fall');
      }
    }

    // Fell off screen
    if (this.y > GAME_H + 80) this.health = 0;
  }

  // ── Arm animation ─────────────────────────────────────────────────────────
  _updateAnimAngles() {
    const stage = this.comboStage === 0 ? 2 : this.comboStage - 1;

    let targetR = Math.PI / 2 + 0.3;
    let targetL = Math.PI / 2 - 0.3;

    if (this.state === 'attack') {
      const progress = 1 - (this.attackTimer / Math.max(1, this._attackMaxTimer));
      const t        = this._attackData?.type;

      if (t === 'jab')   { targetR = lerp(-0.1, 0.4, progress) * this.facing; targetL = Math.PI - targetR * 0.5; }
      if (t === 'cross') { targetR = lerp(-0.2, 0.3, progress) * this.facing; targetL = Math.PI - targetR * 0.6; }
      if (t === 'hook')  {
        targetR = this.facing > 0
          ? lerp(-Math.PI / 3, 0.1, progress)
          : lerp(Math.PI + Math.PI / 3, Math.PI - 0.1, progress);
        targetL = targetR + Math.PI * 0.55;
      }
      if (t === 'chain_lash') { targetR = this.facing * -0.5 + this.facing * progress * 2.0; }
      if (t === 'sword')  { this.swordSwingProgress = progress; }
      if (t === 'aerial_slam' || t === 'aerial_punch') {
        targetR = -Math.PI / 3;
        targetL = -Math.PI * 2 / 3;
      }
    } else if (this.state === 'heavy') {
      if (this.heavyWindup === 0) { targetR = -Math.PI / 2.5; targetL = -Math.PI / 1.8; }  // raise
      if (this.heavyWindup === 1) { targetR =  Math.PI / 2;   targetL =  Math.PI / 2.5; }  // slam
      if (this.heavyWindup === 2) { targetR =  Math.PI / 2 + 0.4; targetL = Math.PI / 2 + 0.1; } // recover
    } else if (this.state === 'dodge') {
      targetR = Math.PI / 2 - 0.6 * this.dodgeFacing;
      targetL = Math.PI / 2 + 0.6 * this.dodgeFacing;
    } else if (this.state === 'run') {
      if (this.onGround && ++this.legTimer % 8 === 0) this.legPhase = (this.legPhase + 1) % 4;
      const swing = Math.sin(this.legPhase * Math.PI / 2) * 0.65;
      targetR = Math.PI / 2 + swing;
      targetL = Math.PI / 2 - swing;
    } else if (this.state === 'jump' || this.state === 'fall') {
      targetR = Math.PI / 4;
      targetL = Math.PI * 3 / 4;
    } else if (this.state === 'grab') {
      targetR = this.facing > 0 ? 0.1 : Math.PI - 0.1;
      targetL = this.facing > 0 ? 0.4 : Math.PI - 0.4;
    }

    this.armAngleR = lerp(this.armAngleR, targetR, 0.28);
    this.armAngleL = lerp(this.armAngleL, targetL, 0.28);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  draw() {
    if (this.state === 'dead') return;

    const sx = this.x - camX;
    const sy = this.y;

    ctx.save();

    // Invincibility flicker
    if (this.invincibleFrames > 0 && Math.floor(this.invincibleFrames / 3) % 2) {
      ctx.globalAlpha = 0.45;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(sx + this.w / 2, sy + this.h + 2, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    this._drawStickman(sx, sy);
    this._drawWeapon(sx, sy);

    ctx.restore();

    // Super burst radial glow (drawn after restore so it's always full alpha)
    if (this.superBurstTimer > 0) {
      this.superBurstTimer--;
      const gAlpha = (this.superBurstTimer / 22) * 0.55;
      const gr = ctx.createRadialGradient(sx + this.w / 2, this.cy(), 0, sx + this.w / 2, this.cy(), 100);
      gr.addColorStop(0, `rgba(200,160,255,${gAlpha})`);
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, this.cy(), 100, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pickup prompt
    if (this.nearPickup && !this.weapon) {
      ctx.fillStyle    = 'rgba(255,220,80,0.85)';
      ctx.font         = 'bold 11px Courier New';
      ctx.textAlign    = 'center';
      ctx.fillText('[E] PICK UP', sx + this.w / 2, sy - 16);
    }
  }

  _drawStickman(sx, sy) {
    const mx  = sx + this.w / 2;
    const HX  = sy + 10;   // head center y
    const NX  = sy + 19;   // neck y
    const SX  = sy + 21;   // shoulder y
    const HIX = sy + 37;   // hip y
    const FX  = sy + this.h; // foot y

    ctx.strokeStyle = '#111';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    // Knockdown — draw slumped
    if (this.state === 'knockdown' || this.state === 'getup') {
      ctx.save();
      const progress = this.state === 'getup' ? this.stateTimer / 28 : 0;
      ctx.translate(mx, sy + this.h);
      ctx.rotate(lerp(Math.PI / 2.2, 0, progress) * this.facing);
      ctx.translate(-mx, -(sy + this.h));
      this._drawBodyParts(mx, HX, NX, SX, HIX, FX);
      ctx.restore();
      return;
    }

    this._drawBodyParts(mx, HX, NX, SX, HIX, FX);
  }

  _drawBodyParts(mx, HX, NX, SX, HIX, FX) {
    // Head (slightly larger than enemies — Axiom is distinctive)
    ctx.fillStyle = '#d4a574';
    ctx.beginPath();
    ctx.arc(mx, HX, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye (follows facing)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(mx + this.facing * 4, HX, 2, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(mx, NX);
    ctx.lineTo(mx, HIX);
    ctx.stroke();

    // Arms (angle-driven)
    const ARM_LEN   = 14;
    const FORE_LEN  = 12;
    ctx.lineWidth   = 2.5;
    ctx.strokeStyle = '#1a1a1a';

    const rElbow = {
      x: mx + Math.cos(this.armAngleR) * ARM_LEN,
      y: SX  + Math.sin(this.armAngleR) * ARM_LEN,
    };
    const rHand = {
      x: rElbow.x + Math.cos(this.armAngleR - 0.35 * this.facing) * FORE_LEN,
      y: rElbow.y + Math.sin(this.armAngleR - 0.35 * this.facing) * FORE_LEN,
    };
    ctx.beginPath();
    ctx.moveTo(mx, SX);
    ctx.lineTo(rElbow.x, rElbow.y);
    ctx.lineTo(rHand.x,  rHand.y);
    ctx.stroke();

    const lElbow = {
      x: mx + Math.cos(this.armAngleL) * ARM_LEN,
      y: SX  + Math.sin(this.armAngleL) * ARM_LEN,
    };
    const lHand = {
      x: lElbow.x + Math.cos(this.armAngleL + 0.35 * this.facing) * FORE_LEN,
      y: lElbow.y + Math.sin(this.armAngleL + 0.35 * this.facing) * FORE_LEN,
    };
    ctx.beginPath();
    ctx.moveTo(mx, SX);
    ctx.lineTo(lElbow.x, lElbow.y);
    ctx.lineTo(lHand.x,  lHand.y);
    ctx.stroke();

    // Knuckle wraps on dominant hand (Axiom's signature look)
    ctx.fillStyle   = '#6b3320';
    ctx.strokeStyle = '#4a2010';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(rHand.x, rHand.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Legs
    const swing = this.state === 'run'
      ? Math.sin(this.legPhase * Math.PI / 2) * 12 : 0;
    const LEG_W = 8;
    ctx.lineWidth   = 2.5;
    ctx.strokeStyle = '#1a1a1a';

    ctx.beginPath();
    ctx.moveTo(mx, HIX);
    ctx.lineTo(mx + LEG_W + swing,  FX);
    ctx.moveTo(mx, HIX);
    ctx.lineTo(mx - LEG_W - swing, FX);
    ctx.stroke();
  }

  _drawWeapon(sx, sy) {
    const mx  = sx + this.w / 2;
    const SX  = sy + 21;

    if (this.weapon === 'chain') {
      // Chain trails from the right hand / swings outward
      const handX = mx + Math.cos(this.armAngleR) * 14 + Math.cos(this.armAngleR - 0.35 * this.facing) * 12;
      const handY = SX + Math.sin(this.armAngleR) * 14 + Math.sin(this.armAngleR - 0.35 * this.facing) * 12;
      const swingX = handX + this.facing * 36 + Math.sin(this.chainSwingAngle) * 12;
      const swingY = handY + 8 + Math.cos(this.chainSwingAngle * 0.7) * 8;

      ctx.save();
      ctx.strokeStyle = '#777';
      ctx.lineWidth   = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.quadraticCurveTo(
        (handX + swingX) / 2, handY + 14,
        swingX, swingY
      );
      ctx.stroke();
      ctx.setLineDash([]);
      // Chain weight
      ctx.fillStyle   = '#888';
      ctx.strokeStyle = '#555';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(swingX, swingY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (this.weapon === 'sword') {
      // Sword in right hand, blade angle follows swing progress
      const handX = mx + Math.cos(this.armAngleR) * 14 + Math.cos(this.armAngleR - 0.35 * this.facing) * 12;
      const handY = SX + Math.sin(this.armAngleR) * 14 + Math.sin(this.armAngleR - 0.35 * this.facing) * 12;
      const bladeAngle = this.armAngleR - 0.5;
      const len        = 30;

      ctx.save();
      ctx.strokeStyle = '#c8c8e8';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX + Math.cos(bladeAngle) * len * this.facing,
                 handY + Math.sin(bladeAngle) * len);
      ctx.stroke();
      // Guard
      ctx.strokeStyle = '#886644';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.moveTo(handX - 6 * this.facing, handY - 2);
      ctx.lineTo(handX + 6 * this.facing, handY + 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
