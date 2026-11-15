'use strict';

// ─── Base enemy class ─────────────────────────────────────────────────────────
class Enemy {
  constructor(x, y, cfg) {
    this.x      = x;
    this.y      = y;
    this.w      = cfg.w      ?? 22;
    this.h      = cfg.h      ?? 50;
    this.health = cfg.health ?? 40;
    this.maxHealth = this.health;
    this.type   = cfg.type   ?? 'thug';
    this.color  = cfg.color  ?? '#444';
    this.skinColor = cfg.skinColor ?? '#c8a07a';

    this.vx = 0;
    this.vy = 0;
    this.facing       = -1;   // faces Axiom initially
    this.onGround     = false;
    this.state        = 'idle';   // idle|patrol|chase|attack|hurt|knockdown|getup|dead
    this.stateTimer   = 0;
    this.invincibleFrames = 0;
    this.grabbed      = null;     // set to Axiom if grabbed by him

    // AI
    this.aiTimer      = rndInt(30, 80);
    this.aiTarget     = null;                  // resolved by vanguardPickTarget()
    this._retargetIn  = rndInt(1, 24);         // staggered so a wave doesn't turn in lockstep
    this.attackCooldown = 0;
    this.attackRange  = cfg.attackRange ?? 55;
    this.damage       = cfg.damage      ?? 8;
    this.kbForce      = cfg.kbForce     ?? 6;
    this.speed        = cfg.speed       ?? 2.2;
    this.aggression   = cfg.aggression  ?? 0.6;  // 0–1 chance to chase vs. idle
    this.canBlock     = cfg.canBlock    ?? false;
    this.blocking     = false;
    this.blockTimer   = 0;

    // Knockdown
    this.knockdownTimer = 0;
    this.getupTimer     = 0;

    // Visual
    this.legPhase    = 0;
    this.legTimer    = 0;
    this.flashTimer  = 0;

    // Dimensional scout trail
    this.trail       = [];
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  // ── State transitions ──────────────────────────────────────────────────────
  enterHurt() {
    if (this.state === 'knockdown' || this.state === 'dead') return;
    this.state      = 'hurt';
    this.stateTimer = 0;
    this.flashTimer = 10;
  }

  enterKnockdown() {
    if (this.state === 'dead') return;
    this.state          = 'knockdown';
    this.stateTimer     = 0;
    this.knockdownTimer = 55;
    this.blocking       = false;
  }

  // ── Main update ───────────────────────────────────────────────────────────
  update() {
    if (this.state === 'dead') return;
    if (this.grabbed) { this._applyGrabbedPhysics(); return; }

    this.stateTimer++;
    if (this.invincibleFrames > 0) this.invincibleFrames--;
    if (this.attackCooldown  > 0) this.attackCooldown--;
    if (this.flashTimer      > 0) this.flashTimer--;

    switch (this.state) {
      case 'idle':
      case 'patrol':
      case 'chase':
        this._runAI();
        break;
      case 'attack':
        this._updateAttack();
        break;
      case 'hurt':
        if (this.stateTimer > 18) this.state = 'idle';
        break;
      case 'knockdown':
        this.knockdownTimer--;
        if (this.knockdownTimer <= 0) {
          this.state      = 'getup';
          this.stateTimer = 0;
          this.invincibleFrames = 30;
        }
        break;
      case 'getup':
        if (this.stateTimer > 28) this.state = 'idle';
        break;
    }

    this._applyPhysics();

    if (this.health <= 0 && this.state !== 'dead') {
      this.state = 'dead';
      this._onDeath();
    }
  }

  _onDeath() {
    spawnBloodPuff(this.cx(), this.cy(), -this.facing);
    shake(5);
  }

  _runAI() {
    if (!axiomPlayer || axiomPlayer.health <= 0) return;

    // Outside a vanguard chapter this always resolves to Axiom, so the old
    // behaviour is unchanged. Re-evaluated on a timer to stop target flicker.
    if (--this._retargetIn <= 0
        || !this.aiTarget
        || this.aiTarget.health <= 0
        || this.aiTarget.state === 'dead'
        || this.aiTarget.state === 'knockdown') {
      this.aiTarget    = vanguardPickTarget(this);
      this._retargetIn = VG_RETARGET_EVERY;
    }
    if (!this.aiTarget) return;

    const ax  = this.aiTarget.cx();
    const my  = this.cx();
    const dx  = ax - my;
    const adx = Math.abs(dx);

    this.facing = dx > 0 ? 1 : -1;

    // Block logic (Enforcers only, occasionally)
    if (this.canBlock && !this.blocking && rnd(0, 1) < 0.003) {
      this.blocking  = true;
      this.blockTimer = rndInt(20, 50);
    }
    if (this.blocking) {
      this.blockTimer--;
      if (this.blockTimer <= 0) this.blocking = false;
      this.vx *= 0.6;
    }
    else if (adx < this.attackRange && this.attackCooldown <= 0) {
      this._startAttack();
    }
    else if (adx < 350 && rnd(0, 1) < this.aggression * 0.05) {
      // Chase
      this.vx = lerp(this.vx, this.facing * this.speed, 0.15);
      this.state = 'chase';
      if (this.onGround && ++this.legTimer % 8 === 0) this.legPhase = (this.legPhase + 1) % 4;
    }
    else {
      this.vx *= 0.7;
      this.state = 'idle';
    }
  }

  _startAttack() {
    this.state          = 'attack';
    this.stateTimer     = 0;
    this.attackCooldown = rndInt(50, 90);
    this.blocking       = false;
  }

  _updateAttack() {
    // Active window: frames 8–16. The swing lands on whoever it was aimed at when
    // it started — a late re-target must not teleport the hit onto someone else.
    const t = this.aiTarget ?? axiomPlayer;
    if (this.stateTimer >= 8 && this.stateTimer <= 16) {
      if (t && t.health > 0) {
        const d = dist(this.cx(), this.cy(), t.cx(), t.cy());
        if (d < this.attackRange + 10) {
          dealDamage(this, t, this.damage, this.kbForce, false);
          spawnHitSpark(t.cx(), t.cy(), this.facing);
        }
      }
    }
    if (this.stateTimer > 28) this.state = 'idle';
  }

  _applyPhysics() {
    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
    this.x += this.vx;
    this.y += this.vy;

    if (this.state !== 'chase') this.vx *= FRICTION;

    // Level bounds
    this.x = clamp(this.x, 0, levelWidth - this.w);

    const grounded = applyPlatformCollisions(this);
    if (grounded && !this.onGround) {
      if (this.state === 'knockdown') {
        spawnDustPuff(this.cx(), this.y + this.h);
        shake(3);
      }
    }
    this.onGround = grounded;
  }

  _applyGrabbedPhysics() {
    // Held by Axiom — just sink passively
    this.vx = 0;
    this.vy = 0;
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  draw() {
    if (this.state === 'dead') return;
    const sx = this.x - camX;
    const sy = this.y;

    // Compute white-flash state for this frame (used inside _drawBody)
    this._flashWhite = this.flashTimer > 0 && Math.floor(this.flashTimer / 2) % 2;

    ctx.save();

    // Shadow
    ctx.fillStyle   = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(sx + this.w / 2, sy + this.h + 2, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Knockdown tips the whole body over at the feet
    if (this.state === 'knockdown' || this.state === 'getup') {
      const fx = sx + this.w / 2, fy = sy + this.h;
      const progress = this.state === 'getup' ? this.stateTimer / 28 : 0;
      ctx.translate(fx, fy);
      ctx.rotate(lerp(Math.PI / 2.2, 0, progress) * -this.facing);
      ctx.translate(-fx, -fy);
    }
    this._drawBody(sx, sy);
    ctx.restore();

    this._drawHealthBar(sx, sy);
  }

  _figureState(scale) {
    const st = this.stateTimer;
    if (this.blocking) return ['guard', st];
    switch (this.state) {
      case 'chase':     return Math.abs(this.vx) > 0.3 ? ['run', rigRunTime(this, scale)] : ['idle', frameCount];
      case 'attack':    return ['attack', st < 8 ? 14 + st * 0.75 : 20 + (st - 8)];
      case 'hurt':      return ['hit', st * 2];
      case 'knockdown': return ['idle', 0];
      case 'getup':     return ['idle', 0];
      default:          return ['idle', frameCount];
    }
  }

  _drawBody(sx, sy) {
    const headR = 7;
    const scale = (this.h - headR * 1.9) / RIG_NECK_HEIGHT;
    const [state, t] = this._figureState(scale);
    this._seed = this._seed ?? Math.random() * 400;
    const j = rigPose(state, t, sx + this.w / 2, sy + this.h, this.h, headR, this.facing, this._seed);
    drawRigFigure(j, { headR, skin: this.skinColor, body: this.color, limbs: '#111',
                       limbW: 2.8, torsoW: 3.4, white: this._flashWhite });
    return j;
  }

  _drawHealthBar(sx, sy) {
    if (this.health >= this.maxHealth) return;
    const bw = 40, bh = 4;
    const bx = sx + this.w / 2 - bw / 2;
    const by = sy - 10;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = this.type === 'scout' ? '#5533ff' : '#cc3333';
    ctx.fillRect(bx, by, bw * (this.health / this.maxHealth), bh);
  }
}

// ─── Enemy subtypes ───────────────────────────────────────────────────────────

class Mugger extends Enemy {
  constructor(x, y) {
    super(x, y, {
      type: 'mugger', health: 28, damage: 6, kbForce: 5,
      speed: 1.8, aggression: 0.5, color: '#3a3a3a', attackRange: 50,
    });
  }
}

class Thug extends Enemy {
  constructor(x, y) {
    super(x, y, {
      type: 'thug', health: 48, damage: 9, kbForce: 7,
      speed: 2.4, aggression: 0.65, color: '#2d4a2d', attackRange: 55,
    });
  }
}

class Enforcer extends Enemy {
  constructor(x, y) {
    super(x, y, {
      type: 'enforcer', health: 80, damage: 13, kbForce: 9,
      speed: 1.7, aggression: 0.55, color: '#3a3a5a', attackRange: 58,
      canBlock: true, h: 54,
    });
    this.skinColor = '#b89070';
  }

  _drawBody(sx, sy) {
    const j = super._drawBody(sx, sy);
    // Armour plate on torso, tilted with the spine
    ctx.save();
    ctx.translate((j.shoulder.x + j.hip.x) / 2, (j.shoulder.y + j.hip.y) / 2);
    ctx.rotate(Math.atan2(j.shoulder.y - j.hip.y, j.shoulder.x - j.hip.x) + Math.PI / 2);
    ctx.fillStyle   = '#555577';
    ctx.strokeStyle = '#333355';
    ctx.lineWidth   = 1;
    ctx.fillRect(-8, -7, 16, 14);
    ctx.strokeRect(-8, -7, 16, 14);
    ctx.restore();
    return j;
  }
}

class Lieutenant extends Enemy {
  constructor(x, y) {
    super(x, y, {
      type: 'lieutenant', health: 160, damage: 16, kbForce: 11,
      speed: 2.1, aggression: 0.8, color: '#1a1a2a', attackRange: 65,
      canBlock: true, h: 56, w: 24,
    });
    this.skinColor  = '#a07050';
    this.isLieutenant = true;
    this.attackCooldown = 30;
  }

  _drawBody(sx, sy) {
    const j = super._drawBody(sx, sy);
    // Distinctive coat, hung from the shoulders and flaring past the hips
    const lift = (j.hip.y - j.shoulder.y) * 0.25;
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath();
    ctx.moveTo(j.shoulder.x - 9, j.shoulder.y);
    ctx.lineTo(j.hip.x - 13, j.hip.y + lift);
    ctx.lineTo(j.hip.x + 13, j.hip.y + lift);
    ctx.lineTo(j.shoulder.x + 9, j.shoulder.y);
    ctx.closePath();
    ctx.fill();
    return j;
  }
}

class DimensionalScout extends Enemy {
  constructor(x, y) {
    super(x, y, {
      type: 'scout', health: 36, damage: 11, kbForce: 8,
      speed: 3.4, aggression: 0.9, color: '#2233aa', attackRange: 52,
    });
    this.skinColor  = '#8899ee';
    this.trailTimer = 0;
  }

  _onDeath() {
    spawnVoidBurst(this.cx(), this.cy());
    spawnVoidFlicker(this.cx(), this.cy());
    shake(9);
  }

  update() {
    // Leave trail
    this.trailTimer++;
    if (this.trailTimer % 4 === 0) {
      this.trail.push({ x: this.cx(), y: this.cy(), life: 12 });
      if (this.trail.length > 8) this.trail.shift();
    }
    for (const t of this.trail) t.life--;
    super.update();
  }

  draw() {
    // Draw void trail
    for (const t of this.trail) {
      ctx.globalAlpha = (t.life / 12) * 0.35;
      ctx.fillStyle   = '#4455ff';
      ctx.beginPath();
      ctx.arc(t.x - camX, t.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    super.draw();
    // Glow ring
    if (this.state !== 'dead') {
      ctx.globalAlpha = 0.18 + Math.sin(frameCount * 0.12) * 0.08;
      ctx.strokeStyle = '#4466ff';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.arc(this.x - camX + this.w / 2, this.y + this.h / 2, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
function createEnemy(type, x, y) {
  switch (type) {
    case 'mugger':     return new Mugger(x, y);
    case 'thug':       return new Thug(x, y);
    case 'enforcer':   return new Enforcer(x, y);
    case 'lieutenant': return new Lieutenant(x, y);
    case 'scout':      return new DimensionalScout(x, y);
    default:           return createAct4Enemy(type, x, y) ?? new Thug(x, y);
  }
}
