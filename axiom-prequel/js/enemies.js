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
    const ax  = axiomPlayer.cx();
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
    // Active window: frames 8–16
    if (this.stateTimer >= 8 && this.stateTimer <= 16) {
      if (axiomPlayer && axiomPlayer.health > 0) {
        const d = dist(this.cx(), this.cy(), axiomPlayer.cx(), axiomPlayer.cy());
        if (d < this.attackRange + 10) {
          dealDamage(this, axiomPlayer, this.damage, this.kbForce, false);
          spawnHitSpark(axiomPlayer.cx(), axiomPlayer.cy(), this.facing);
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

    this._drawBody(sx, sy);
    ctx.restore();

    this._drawHealthBar(sx, sy);
  }

  _drawBody(sx, sy) {
    const mx  = sx + this.w / 2;
    const HEAD_Y     = sy + 10;
    const NECK_Y     = sy + 19;
    const SHOULDER_Y = sy + 21;
    const HIP_Y      = sy + 36;
    const FOOT_Y     = sy + this.h;
    const fw = this._flashWhite;

    ctx.strokeStyle = fw ? '#ffffff' : '#111';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    // Head
    ctx.fillStyle = fw ? '#ffffff' : this.skinColor;
    ctx.beginPath();
    ctx.arc(mx, HEAD_Y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = fw ? '#aaaaaa' : '#111';
    ctx.beginPath();
    ctx.arc(mx + this.facing * 3.5, HEAD_Y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.strokeStyle = fw ? '#ffffff' : this.color;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(mx, NECK_Y);
    ctx.lineTo(mx, HIP_Y);
    ctx.stroke();

    // Arms
    ctx.strokeStyle = fw ? '#ffffff' : this.color;
    ctx.lineWidth   = 2;
    let armOffset = 0;
    if (this.state === 'attack' && this.stateTimer >= 8 && this.stateTimer <= 16) {
      armOffset = this.facing * 14;
    }
    if (this.blocking) {
      // Arms crossed in front
      ctx.beginPath();
      ctx.moveTo(mx, SHOULDER_Y);
      ctx.lineTo(mx + this.facing * 14, SHOULDER_Y + 8);
      ctx.moveTo(mx, SHOULDER_Y);
      ctx.lineTo(mx + this.facing * 14, SHOULDER_Y + 14);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(mx, SHOULDER_Y);
      ctx.lineTo(mx - 12, SHOULDER_Y + 12);
      ctx.moveTo(mx, SHOULDER_Y);
      ctx.lineTo(mx + armOffset + 12, SHOULDER_Y + 12 - (armOffset !== 0 ? 8 : 0));
      ctx.stroke();
    }

    // Legs
    const swing = (this.state === 'chase') ? Math.sin(this.legPhase * Math.PI / 2) * 10 : 0;
    ctx.lineWidth   = 2;
    ctx.strokeStyle = fw ? '#ffffff' : '#111';
    ctx.beginPath();
    ctx.moveTo(mx, HIP_Y);
    ctx.lineTo(mx + 8 + swing, FOOT_Y);
    ctx.moveTo(mx, HIP_Y);
    ctx.lineTo(mx - 8 - swing, FOOT_Y);
    ctx.stroke();
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
    super._drawBody(sx, sy);
    // Armour plate on torso
    const mx = sx + this.w / 2;
    ctx.fillStyle   = '#555577';
    ctx.strokeStyle = '#333355';
    ctx.lineWidth   = 1;
    ctx.fillRect(mx - 8, sy + 21, 16, 14);
    ctx.strokeRect(mx - 8, sy + 21, 16, 14);
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
    super._drawBody(sx, sy);
    // Distinctive coat
    const mx = sx + this.w / 2;
    ctx.fillStyle   = '#1a1a2a';
    ctx.beginPath();
    ctx.moveTo(mx - 10, sy + 20);
    ctx.lineTo(mx - 13, sy + 40);
    ctx.lineTo(mx + 13, sy + 40);
    ctx.lineTo(mx + 10, sy + 20);
    ctx.closePath();
    ctx.fill();
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
    default:           return new Thug(x, y);
  }
}
