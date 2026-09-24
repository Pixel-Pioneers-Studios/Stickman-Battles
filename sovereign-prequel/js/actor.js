'use strict';

// ─── Walker ───────────────────────────────────────────────────────────────────
// The only entity type the skeleton needs: a figure that stands on platforms and
// either takes player input or holds a spot. Combat entities come later.

class Walker {
  constructor(x, y, opt) {
    const o = opt || {};
    this.x = x; this.y = y;
    this.w = 22; this.h = 84;
    this.vx = 0; this.vy = 0;
    this.facing    = o.facing ?? 1;
    this.grounded  = false;
    this.speed     = o.speed ?? 2.6;
    this.jumpPower = o.jumpPower ?? 11.5;
    this.name      = o.name ?? null;
    this.tone      = o.tone ?? '#1d1c1a';
    this.isPlayer  = o.isPlayer ?? false;
    this.gait      = 0;
    this.patrol    = o.patrol ?? null;   // [x0, x1] — walks it, forever
    this._patrolTo = 1;
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  update() {
    if (this.isPlayer && !paused) {
      if (held('left'))  { this.vx = -this.speed; this.facing = -1; }
      if (held('right')) { this.vx =  this.speed; this.facing =  1; }
      if (just('jump') && this.grounded && !revoked.has('jump')) {
        this.vy = -ledgerMod('jump', this.jumpPower);
        this.grounded = false;
      }
    }

    if (this.patrol && !this.isPlayer) {
      const goal = this.patrol[this._patrolTo];
      const dx   = goal - this.cx();
      if (Math.abs(dx) < 6) this._patrolTo = this._patrolTo ? 0 : 1;
      else {
        this.facing = dx < 0 ? -1 : 1;
        this.vx = clamp(this.vx + this.facing * 0.3, -this.speed * 0.6, this.speed * 0.6);
      }
    }

    // A re-asserted law runs on him, not on the room: the working copy is his
    // and he is the one running it.
    let grav = this.isPlayer ? ledgerMod('gravity', GRAVITY) : GRAVITY;
    // Something in the room is asserting the opposite law. The ledger contests
    // it rather than ignoring it — whoever is running a copy wins locally.
    if (this.isPlayer && contested.has('weight') && !(ledgerActive && ledgerActive.id === 'weight')) {
      grav *= 1.7;
    }
    this.vy = Math.min(this.vy + grav, MAX_FALL);
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.grounded ? FRICTION : AIR_FRIC;
    if (Math.abs(this.vx) < 0.05) this.vx = 0;

    this._collide();

    this.x = clamp(this.x, 0, levelWidth - this.w);

    const moving = this.grounded && Math.abs(this.vx) > 0.4;
    // Gait phase is driven by distance travelled, not by a fixed timer —
    // a fixed timer is what makes feet skate.
    if (moving) this.gait += Math.abs(this.vx) * 0.105;
  }

  _collide() {
    this.grounded = false;
    for (const p of platforms) {
      const overlapX = this.x + this.w > p.x && this.x < p.x + p.w;
      if (!overlapX) continue;
      const feet = this.y + this.h;
      if (this.vy >= 0 && feet >= p.y && feet - this.vy <= p.y + 4) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.grounded = true;
      }
    }
  }

  draw() {
    drawFigure(this.cx() - camX, this.y + this.h, {
      h: this.h,
      facing: this.facing,
      phase: this.gait,
      moving: this.grounded && Math.abs(this.vx) > 0.4,
      tone: this.tone,
      rim: this.isPlayer ? 'rgba(236,226,200,0.40)' : 'rgba(206,196,176,0.10)',
    });
  }
}
