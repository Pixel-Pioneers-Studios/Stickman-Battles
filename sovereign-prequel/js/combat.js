'use strict';

// ─── Minimal combat ───────────────────────────────────────────────────────────
// Deliberately small. In this game the fight is not where the skill lives — the
// read is (see docs/sovereign-prequel-structure.md). Combat exists to make the
// consequences of a read legible, so it needs to be readable and fair, not deep.
//
// One damage entry point, same discipline as the main game: never touch
// `target.health` anywhere else.

function dealDamage(attacker, target, dmg, kb) {
  if (!target || target.health <= 0 || target.invuln > 0) return false;

  if (target.isPlayer) dmg = ledgerMod('incoming', dmg);
  target.health = Math.max(0, target.health - dmg);
  target.invuln = 14;
  target.hurtTimer = 12;

  const dir = target.cx() < attacker.cx() ? -1 : 1;
  target.vx += dir * (kb ?? 4);
  target.vy -= 2.4;

  for (let i = 0; i < 7; i++) {
    spawnMote(target.cx(), target.cy(), {
      vx: dir * rnd(0.4, 2.2), vy: rnd(-1.6, 0.4),
      life: 26, size: rnd(1, 2.4), color: 'rgba(196,120,70,',
    });
  }
  shake(target.health <= 0 ? 7 : 3);
  return true;
}

// ─── Brawler ──────────────────────────────────────────────────────────────────
class Brawler extends Walker {
  constructor(x, y, opt) {
    super(x, y, opt);
    const o = opt || {};
    this.maxHealth  = o.health ?? 40;
    this.health     = this.maxHealth;
    this.invuln     = 0;
    this.hurtTimer  = 0;
    this.attackCd   = 0;
    this.swingTimer = 0;     // >0 while the arc is live
    this.swingHits  = null;
    this.reach      = o.reach ?? 42;
    this.damage     = o.damage ?? 8;
    this.aggression = o.aggression ?? 1;   // scales approach speed + attack rate
    this.delay      = o.delay ?? 0;        // frames before this one joins the fight
    this.dead       = false;
    this.frozen     = false;
    this.asserts    = o.asserts ?? null;   // a law this one holds in force while alive
  }

  get alive() { return this.health > 0; }

  attack() {
    if (this.attackCd > 0 || this.swingTimer > 0 || !this.alive) return;
    this.swingTimer = 12;
    this.swingHits  = new Set();
    this.attackCd   = Math.round(38 / this.aggression);
  }

  update() {
    if (this.invuln    > 0) this.invuln--;
    if (this.hurtTimer > 0) this.hurtTimer--;
    if (this.attackCd  > 0) this.attackCd--;
    if (this.delay     > 0) { this.delay--; super.update(); return; }

    if (!this.alive) {
      if (!this.dead) { this.dead = true; this.deathTimer = 0; }
      this.deathTimer++;
      super.update();
      return;
    }

    if (this.frozen) {
      // Read phases freeze him: no input, no AI, no swing. J is both "commit"
      // and "swing", so without this he lashes out at nothing on the frame the
      // player commits an edit.
    } else if (this.isPlayer) {
      if (just('light') && !revoked.has('attack')) this.attack();
    } else {
      this._ai();
    }

    if (this.swingTimer > 0) { this.swingTimer--; this._resolveSwing(); }

    super.update();
  }

  _ai() {
    const t = sov;
    if (!t || !t.alive) return;
    const dx = t.cx() - this.cx();
    const ad = Math.abs(dx);

    this.facing = dx < 0 ? -1 : 1;

    if (ad > this.reach - 8) {
      this.vx += this.facing * 0.42 * this.aggression;
      this.vx = clamp(this.vx, -this.speed, this.speed);
    } else {
      // Brake on arrival. Without this they carry their approach momentum
      // straight past the target and spend the fight oscillating through him.
      this.vx *= 0.62;
      if (Math.abs(t.cy() - this.cy()) < 50) this.attack();
    }
  }

  _resolveSwing() {
    const targets = this.isPlayer
      ? actors.filter(v => v instanceof Brawler)
      : [sov];
    let reach = this.isPlayer ? ledgerMod('reach', this.reach) : this.reach;
    if (this.isPlayer && contested.has('reach') && !(ledgerActive && ledgerActive.id === 'reach')) {
      reach *= 0.6;
    }
    const ax = this.cx() + this.facing * reach * 0.6;
    for (const t of targets) {
      if (!t || t === this || !t.alive) continue;
      if (this.swingHits.has(t)) continue;
      if (Math.abs(t.cx() - ax) > reach * 0.75) continue;
      if (Math.abs(t.cy() - this.cy()) > 52) continue;
      this.swingHits.add(t);
      dealDamage(this, t, this.damage, this.isPlayer ? 5 : 3.5);
    }
  }

  draw() {
    const swinging = this.swingTimer > 0;
    const tone = this.hurtTimer > 6 ? '#7d3b28'
               : !this.alive       ? '#2e2a24'
               : this.tone;

    drawFigure(this.cx() - camX, this.y + this.h, {
      h: this.h,
      facing: this.facing,
      phase: this.gait,
      moving: this.grounded && Math.abs(this.vx) > 0.4,
      tone,
      // He is the same black shape as everyone else — the only thing that
      // separates him at this size is how much light he catches.
      rim: this.isPlayer ? 'rgba(236,226,200,0.40)' : 'rgba(206,196,176,0.10)',
      alpha: this.alive ? 1 : Math.max(0.15, 1 - (this.deathTimer ?? 0) / 90),
    });

    if (swinging) this._drawSwing();
    if (this.alive && !this.isPlayer) this._drawHealth();
  }

  _drawSwing() {
    const p = 1 - this.swingTimer / 12;
    // Draw in facing-right space and mirror with the transform. Computing
    // mirrored angles by hand gave a start angle past the end angle, and
    // ctx.arc then took the long way round — the swing rendered as a full
    // circle every time he faced left.
    ctx.save();
    ctx.translate(this.cx() - camX, this.y + this.h * 0.42);
    ctx.scale(this.facing, 1);
    ctx.globalAlpha = 0.55 * (1 - p);
    ctx.strokeStyle = '#d8c49a';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    const reach = this.isPlayer ? ledgerMod('reach', this.reach) : this.reach;
    ctx.arc(0, 0, reach * 0.8, -0.9 + p * 1.5, -0.4 + p * 1.5);
    ctx.stroke();
    ctx.restore();
  }

  _drawHealth() {
    const sx = this.cx() - camX;
    const w  = 30;
    const y  = this.y - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(sx - w / 2, y, w, 3);
    ctx.fillStyle = '#9a6a42';
    ctx.fillRect(sx - w / 2, y, w * (this.health / this.maxHealth), 3);
  }
}
