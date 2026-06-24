'use strict';

// ─── Base companion class ─────────────────────────────────────────────────────
// Companions fight alongside Axiom with simple but effective AI.
// They cannot be hurt by Axiom's attacks. Enemies target them occasionally.
class Companion {
  constructor(x, y, cfg) {
    this.x      = x;
    this.y      = y;
    this.w      = cfg.w      ?? 20;
    this.h      = cfg.h      ?? 48;
    this.name   = cfg.name;
    this.color  = cfg.color;
    this.skinColor = cfg.skinColor ?? '#c8a07a';

    this.health    = 100;
    this.maxHealth = 100;

    this.vx = 0;
    this.vy = 0;
    this.facing   = 1;
    this.onGround = false;
    this.state    = 'idle';   // idle|follow|chase|attack|hurt|knockdown
    this.stateTimer = 0;
    this.invincibleFrames = 0;

    this.attackCooldown = rndInt(40, 80);
    this.damage         = cfg.damage    ?? 10;
    this.attackRange    = cfg.attackRange ?? 60;
    this.speed          = cfg.speed     ?? 2.8;

    this.knockdownTimer = 0;
    this.legPhase       = 0;
    this.legTimer       = 0;
    this.flashTimer     = 0;
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  enterHurt() {
    this.state      = 'hurt';
    this.stateTimer = 0;
    this.flashTimer = 8;
  }

  enterKnockdown() {
    this.state          = 'knockdown';
    this.stateTimer     = 0;
    this.knockdownTimer = 50;
  }

  update() {
    this.stateTimer++;
    if (this.invincibleFrames > 0) this.invincibleFrames--;
    if (this.attackCooldown  > 0) this.attackCooldown--;
    if (this.flashTimer      > 0) this.flashTimer--;

    switch (this.state) {
      case 'idle':
      case 'follow':
      case 'chase':
        this._runAI();
        break;
      case 'attack':
        this._updateAttack();
        break;
      case 'hurt':
        if (this.stateTimer > 14) this.state = 'idle';
        break;
      case 'knockdown':
        this.knockdownTimer--;
        if (this.knockdownTimer <= 0) {
          this.state = 'idle';
          this.invincibleFrames = 30;
          this.health = Math.min(this.maxHealth, this.health + 15);
        }
        break;
    }

    this._applyPhysics();
  }

  _runAI() {
    if (!axiomPlayer) return;

    // Pick closest living enemy
    let target    = null;
    let targetDx  = Infinity;
    for (const e of enemies) {
      if (e.health <= 0 || e.state === 'dead') continue;
      const d = Math.abs(e.cx() - this.cx());
      if (d < targetDx) { target = e; targetDx = d; }
    }

    if (target && targetDx < 300) {
      // Engage enemy
      this.facing = target.cx() > this.cx() ? 1 : -1;
      if (targetDx < this.attackRange && this.attackCooldown <= 0) {
        this._startAttack(target);
      } else if (targetDx > this.attackRange - 10) {
        this.vx   = lerp(this.vx, this.facing * this.speed, 0.14);
        this.state = 'chase';
        if (this.onGround && ++this.legTimer % 8 === 0) this.legPhase = (this.legPhase + 1) % 4;
      }
    } else {
      // Follow Axiom, keep formation distance
      const formDist = 70 + companions.indexOf(this) * 40;
      const axiomCX  = axiomPlayer.cx();
      const myDx     = axiomCX - this.cx();
      if (Math.abs(myDx) > formDist) {
        this.facing = myDx > 0 ? 1 : -1;
        this.vx     = lerp(this.vx, this.facing * this.speed * 0.7, 0.12);
        this.state  = 'follow';
        if (this.onGround && ++this.legTimer % 9 === 0) this.legPhase = (this.legPhase + 1) % 4;
      } else {
        this.vx    *= 0.7;
        this.state  = 'idle';
      }
    }
  }

  _startAttack(target) {
    this._attackTarget    = target;
    this.state            = 'attack';
    this.stateTimer       = 0;
    this.attackCooldown   = rndInt(55, 95);
  }

  _updateAttack() {
    if (this.stateTimer >= 8 && this.stateTimer <= 14) {
      const t = this._attackTarget;
      if (t && t.health > 0) {
        const d = dist(this.cx(), this.cy(), t.cx(), t.cy());
        if (d < this.attackRange + 8) {
          dealDamage(this, t, this.damage, 6, false);
          spawnHitSpark(t.cx(), t.cy(), this.facing);
        }
      }
    }
    if (this.stateTimer > 24) this.state = 'idle';
  }

  _applyPhysics() {
    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
    this.x += this.vx;
    this.y += this.vy;
    if (this.state !== 'chase' && this.state !== 'follow') this.vx *= FRICTION;
    this.x    = clamp(this.x, 0, levelWidth - this.w);
    this.onGround = applyPlatformCollisions(this);
  }

  draw() {
    const sx = this.x - camX;
    const sy = this.y;
    ctx.save();
    if (this.flashTimer > 0 && Math.floor(this.flashTimer / 2) % 2) ctx.globalAlpha = 0.4;
    this._drawBody(sx, sy);
    ctx.restore();
  }

  _drawBody(sx, sy) {
    const mx         = sx + this.w / 2;
    const HEAD_Y     = sy + 9;
    const NECK_Y     = sy + 18;
    const SHOULDER_Y = sy + 20;
    const HIP_Y      = sy + 34;
    const FOOT_Y     = sy + this.h;

    ctx.strokeStyle = '#111';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';

    // Head
    ctx.fillStyle = this.skinColor;
    ctx.beginPath();
    ctx.arc(mx, HEAD_Y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(mx + this.facing * 3, HEAD_Y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(mx, NECK_Y);
    ctx.lineTo(mx, HIP_Y);
    ctx.stroke();

    // Arms
    ctx.lineWidth = 2;
    const armSwing = this.state === 'attack' && this.stateTimer >= 8 && this.stateTimer <= 14
      ? this.facing * 16 : 0;
    ctx.beginPath();
    ctx.moveTo(mx, SHOULDER_Y);
    ctx.lineTo(mx - 11, SHOULDER_Y + 11);
    ctx.moveTo(mx, SHOULDER_Y);
    ctx.lineTo(mx + armSwing + 11, SHOULDER_Y + 11 - Math.abs(armSwing) * 0.4);
    ctx.stroke();

    // Legs
    const swing = (this.state === 'chase' || this.state === 'follow')
      ? Math.sin(this.legPhase * Math.PI / 2) * 9 : 0;
    ctx.beginPath();
    ctx.moveTo(mx, HIP_Y);
    ctx.lineTo(mx + 7 + swing, FOOT_Y);
    ctx.moveTo(mx, HIP_Y);
    ctx.lineTo(mx - 7 - swing, FOOT_Y);
    ctx.stroke();
  }
}

// ─── Named companions ─────────────────────────────────────────────────────────

class Anders extends Companion {
  constructor(x, y) {
    super(x, y, {
      name: 'ANDERS', color: '#334433', skinColor: '#c09070',
      damage: 11, speed: 2.6, attackRange: 58,
    });
    // Anders is calm and deliberate — slightly longer attack cooldown, but reliable
    this.attackCooldown = 60;
  }
}

class Seraph extends Companion {
  constructor(x, y) {
    super(x, y, {
      name: 'SERAPH', color: '#334444', skinColor: '#d4b090',
      damage: 8, speed: 2.4, attackRange: 54,
    });
    this.healTimer = 0;
    this.healAura  = 0;  // visual pulse for healing
  }

  update() {
    super.update();
    // Seraph periodically heals nearby allies between waves
    this.healTimer++;
    if (this.healAura > 0) this.healAura--;
    if (this.healTimer >= 300 && enemies.filter(e => e.health > 0).length === 0) {
      this.healTimer = 0;
      this.healAura  = 40;
      if (axiomPlayer && axiomPlayer.health < axiomPlayer.maxHealth) {
        axiomPlayer.health = Math.min(axiomPlayer.maxHealth, axiomPlayer.health + 12);
      }
      for (const c of companions) {
        if (c !== this && c.health < c.maxHealth) {
          c.health = Math.min(c.maxHealth, c.health + 8);
        }
      }
    }
  }

  _drawBody(sx, sy) {
    // Gentle glow when healing aura active
    if (this.healAura > 0) {
      ctx.save();
      ctx.globalAlpha = (this.healAura / 40) * 0.25;
      ctx.fillStyle   = '#44ffaa';
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    super._drawBody(sx, sy);
  }
}

class VAEL extends Companion {
  constructor(x, y) {
    super(x, y, {
      name: 'VAEL', color: '#442222', skinColor: '#bb9060',
      damage: 12, speed: 3.6, attackRange: 52,
    });
    // VAEL is aggressive — always pushes forward, lowest cooldown
    this.attackCooldown = 35;
    this.dashTimer      = 0;
  }

  update() {
    super.update();
    // VAEL dashes toward the furthest-away enemy occasionally
    this.dashTimer++;
    if (this.dashTimer >= 180 && enemies.filter(e => e.health > 0).length > 0) {
      this.dashTimer = 0;
      let farthest = null, maxDx = 0;
      for (const e of enemies) {
        if (e.health <= 0) continue;
        const d = Math.abs(e.cx() - this.cx());
        if (d > maxDx) { farthest = e; maxDx = d; }
      }
      if (farthest) {
        this.facing = farthest.cx() > this.cx() ? 1 : -1;
        this.vx     = this.facing * 10;
        this.vy     = -4;
        spawnDustPuff(this.cx(), this.y + this.h);
      }
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
function createCompanion(name, x, y) {
  switch (name) {
    case 'anders': return new Anders(x, y);
    case 'seraph': return new Seraph(x, y);
    case 'vael':   return new VAEL(x, y);
    default:       return new Anders(x, y);
  }
}
