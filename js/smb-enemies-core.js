'use strict';
// smb-enemies-core.js — Minion class (wave AI) + ForestBeast class (roaming melee AI)
// Depends on: smb-globals.js, smb-fighter.js, smb-data-weapons.js

// ============================================================
// MINION  (lightweight boss-spawned enemy)
// ============================================================
class Minion extends Fighter {
  constructor(x, y) {
    const wKey = Math.random() < 0.5 ? 'axe' : 'sword';
    super(x, y, '#bb00ee', wKey,
      { left:null, right:null, jump:null, attack:null, ability:null, super:null },
      true, 'hard');
    this.name      = 'MINION';
    this.isMinion  = true;
    this.w         = 32;
    // h must match the fixed-size stickman Fighter.draw() renders (~84px from this.y),
    // or grounded minions stand with their feet inside the floor
    this.h         = 84;
    this.health    = 150;
    this.maxHealth = 150;
    this.lives     = 1;
    this.dmgMult   = 0.10; // deals 10% damage
    this.spawnX    = x;
    this.spawnY    = y;
    this.playerNum = 2;
  }

  // Minions never super
  useSuper() {}
  activateSuper() {}

  // Flat respawn override — minions just die, no countdown
  respawn() { this.health = 0; }
}

// Everyone a wild creature can hurt. Battle Royale bots live in minions[], not
// players[], so a players-only loop let every bot walk through a beast slam.
// Other minions (boss summons, story allies) stay out, as they always were.
function creatureFoes(self) {
  const out = players.slice();
  if (typeof minions !== 'undefined') {
    for (const m of minions) if (m && m !== self && m._brBot) out.push(m);
  }
  return out;
}

// ============================================================
// FOREST BEAST  (rare random encounter in forest arena)
// ============================================================
class ForestBeast extends Fighter {
  constructor(x, y) {
    super(x, y, '#1a8a2e', 'axe',
      { left:null, right:null, jump:null, attack:null, ability:null, super:null },
      true, 'hard');
    this.name       = 'BEAST';
    this.isBeast    = true;
    this.isMinion   = true;   // shares minion hit-detection code
    this.w          = 32;
    this.h          = 62;
    this.health     = 300;
    this.maxHealth  = 300;
    this.lives      = 1;
    this.dmgMult    = 1.5;    // deals 150% damage
    this.kbResist   = 0.4;    // absorbs 60% of knockback
    this.kbBonus    = 1.4;    // deals 40% extra knockback
    this.spawnX     = x;
    this.spawnY     = y;
    this.playerNum  = 2;
    this.dashCooldown = 120;  // initial delay before first dash
    this._lastPhase   = 1;    // for phase-transition cinematic
    this._slamCd      = 60;
    this._slamPhase   = 'none';
    this._slamTimer   = 0;
    this._leapCd      = 80;
    this._leapPhase   = 'none';
    this._leapAirborne = false;
    this._burstCd     = 0;
  }

  // Vertical gap between this beast's feet and a target's feet.
  // The slam and leap shockwaves travel along the ground, so they must only reach
  // targets standing on (roughly) the same surface — without this, a beast on the
  // floor hits a player on the top platform 400px above it.
  _feetGap(p) {
    return Math.abs((p.y + (p.h || 0)) - (this.y + this.h));
  }

  update() {
    super.update();

    if (this.health <= 0) return;

    // Phase transition: at 50% HP enter rage mode with cinematic
    const fbPhase = this.health <= this.maxHealth * 0.5 ? 2 : 1;
    if (fbPhase !== this._lastPhase) {
      this._lastPhase = fbPhase;
      this.isRaged = true;
      triggerPhaseTransition(this, fbPhase);
    }

    // Block AI behavior during cinematic
    if (activeCinematic) return;

    // ── Cooldown ticks ──────────────────────────────────────────
    if (this.dashCooldown   > 0) this.dashCooldown--;
    if (this._slamCd   > 0) this._slamCd--;
    if (this._leapCd   > 0) this._leapCd--;
    if (this._burstCd  > 0) this._burstCd--;

    // ── Slam wind-up / release ──────────────────────────────────
    if (this._slamPhase === 'windup') {
      this._slamTimer--;
      this.vx = 0; // plant feet during windup
      if (this._slamTimer <= 0) {
        this._slamPhase = 'impact';
        screenShake = Math.max(screenShake, 10);
        spawnParticles(this.cx(), this.y + this.h, '#553300', 20);
        spawnParticles(this.cx(), this.y + this.h, '#aa6600', 10);
        // Damage any target standing close on the ground.
        // dmgMult is applied centrally by dealDamage() — do NOT pre-multiply here.
        for (const p of creatureFoes(this)) {
          if (p === this || p.health <= 0) continue;
          const dist = Math.abs(p.cx() - this.cx());
          if (dist < 90 && p.onGround && this._feetGap(p) < 40) {
            dealDamage(this, p, 24, 8);
            p.vy = -10; // launch up
          }
        }
        this._slamCd = this.isRaged ? 280 : 400;
        setTimeout(() => { this._slamPhase = 'none'; }, 300);
      }
      return;
    }

    // ── Leap wind-up / airborne ─────────────────────────────────
    if (this._leapPhase === 'launch') {
      // Already launched via vy; wait until we land
      if (this.onGround && this._leapAirborne) {
        this._leapAirborne = false;
        this._leapPhase    = 'none';
        // Land impact shockwave
        screenShake = Math.max(screenShake, 8);
        spawnParticles(this.cx(), this.y + this.h, '#553300', 16);
        for (const p of creatureFoes(this)) {
          if (p === this || p.health <= 0) continue;
          const dist = Math.abs(p.cx() - this.cx());
          if (dist < 70 && this._feetGap(p) < 50) dealDamage(this, p, 16, 12);
        }
        this._leapCd = this.isRaged ? 220 : 340;
      }
      if (!this.onGround) this._leapAirborne = true;
      return;
    }

    // Dynamic retargeting: immediately retarget if current target is dead/missing
    if (!this.target || this.target.health <= 0) this._fbRetargetCd = 0;
    this._fbRetargetCd = (this._fbRetargetCd || 0) - 1;
    if (this._fbRetargetCd <= 0) {
      const _pool = creatureFoes(this).filter(p => p !== this && p.health > 0 && !p.godmode && !areAlliedEntities(this, p));
      // True 2D distance — a horizontal-only comparison makes a player parked directly
      // overhead read as "nearest" and locks the beast onto a target it cannot reach.
      if (_pool.length > 0) {
        const _d2 = (p) => Math.hypot(p.cx() - this.cx(), p.cy() - this.cy());
        this.target = _pool.reduce((a, b) => _d2(b) < _d2(a) ? b : a);
      }
      this._fbRetargetCd = 30;
    }

    const tgt = this.target;
    if (!tgt || tgt.health <= 0) return;
    const dx  = tgt.cx() - this.cx();
    const dist = Math.abs(dx);

    // ── Ground slam: use when target is close AND on our level ──
    // The vertical gate keeps the beast from burning its slam on an unreachable target
    // overhead — it leaps instead, which is the move that actually closes that gap.
    if (this._slamCd <= 0 && dist < 100 && this._feetGap(tgt) < 60 &&
        this.onGround && this._slamPhase === 'none') {
      this._slamPhase = 'windup';
      this._slamTimer = this.isRaged ? 18 : 26;
      // Warning circle on ground
      if (typeof bossWarnings !== 'undefined') {
        bossWarnings.push({ type: 'circle', x: this.cx(), y: this.y + this.h, r: 90,
          color: '#cc5500', timer: this._slamTimer + 4, maxTimer: this._slamTimer + 4, label: '' });
      }
      return;
    }

    // ── Leap attack: use at medium range ───────────────────────
    if (this._leapCd <= 0 && dist > 120 && dist < 340 && this.onGround && this._leapPhase === 'none') {
      this._leapPhase    = 'launch';
      this._leapAirborne = false;
      this.vy = -18;
      this.vx = Math.sign(dx) * 14;
      spawnParticles(this.cx(), this.y + this.h, '#1a8a2e', 12);
      return;
    }

    // ── Dash attack: charge when far away ──────────────────────
    if (this.dashCooldown <= 0 && dist > 180) {
      this.vx = Math.sign(dx) * (this.isRaged ? 20 : 16);
      spawnParticles(this.cx(), this.cy(), '#1a8a2e', 8);
      this.dashCooldown = this.isRaged ? 130 : 180 + Math.floor(Math.random() * 120);
    }

    // ── Fast burst combo in rage mode ──────────────────────────
    if (this.isRaged && this._burstCd <= 0 && dist < 80) {
      this.attack();
      this._burstCd = 22;
    }
  }

  // Disable inherited bot AI — beast has its own complete AI in update().
  // The base updateAI() fires ability/super/attack independently and conflicts with
  // the beast's slam/leap/burst system, causing erratic damage and unexpected arc hits.
  updateAI() { return; }
  ability()   { return; }
  useSuper()  {}
  activateSuper() {}
  respawn() { this.health = 0; }

  // ── Shaggy silhouette helper ──────────────────────────────────────────────
  // A blob built from an ellipse with deterministic radial noise, so the beast
  // has a fur outline instead of the smooth vector egg it used to be. The noise
  // is keyed on the point index (never on Math.random) so it cannot crawl
  // between frames; `wob` is the only animated term.
  _furPath(cx, cy, rx, ry, seed, n, spike, wob) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a  = (i / n) * Math.PI * 2;
      const h  = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
      const r  = 1 + (h - Math.floor(h)) * spike + Math.sin(a * 3 + wob) * 0.035;
      const px = cx + Math.cos(a) * rx * r;
      const py = cy + Math.sin(a) * ry * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // One tapered limb: hip -> knee -> paw, with claws at the paw.
  _drawLimb(hx, hy, kx, ky, px, py, f, thick, dark, clr, claws) {
    ctx.strokeStyle = dark;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.lineWidth   = thick;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(px, py); ctx.stroke();
    ctx.lineWidth   = thick * 0.62;
    ctx.strokeStyle = clr;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(px, py); ctx.stroke();
    // Paw
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(px, py, thick * 0.55, thick * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    if (claws) {
      ctx.strokeStyle = '#ffeecc';
      ctx.lineWidth   = 1.6;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(px + f * thick * 0.3, py);
        ctx.lineTo(px + f * (thick * 0.3 + 6), py + 3 + i * 3.5);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  }

  draw() {
    if (this.health <= 0) return;
    ctx.save();
    // Blink when invincible
    if (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 1) ctx.globalAlpha = 0.35;

    const cx = this.cx(), ty = this.y, f = this.facing;
    const gy = ty + this.h;                       // ground line under the paws
    const t  = this.animTimer || 0;
    const raged = this.isRaged;

    const clr   = raged ? '#c0180c' : '#256b28';
    const mid   = raged ? '#8e1006' : '#1a5220';
    const dark  = raged ? '#4d0602' : '#0d3316';
    const belly = raged ? '#e0603c' : '#4f9a49';

    // Stride phase from distance travelled, not from a free-running timer, so
    // the paws track the ground instead of skating under a moving body.
    this._gait = (this._gait || 0) + Math.abs(this.vx) * 0.085;
    const moving = Math.abs(this.vx) > 0.4 && this.onGround;
    const stride = this._gait;
    const breathe = Math.sin(t * 0.05) * 0.9;

    // Pose: crouch on the slam wind-up, stretch out in the air on a leap
    const windup = this._slamPhase === 'windup';
    const impact = this._slamPhase === 'impact';
    const air    = !this.onGround;
    const crouch = windup ? 7 : (impact ? -3 : 0);
    const lunge  = air ? f * 5 : 0;

    const bodyY = ty + this.h * 0.56 + crouch + breathe * 0.4;
    const bodyX = cx + lunge;
    const rx    = this.w * 0.98, ry = this.h * 0.27;

    // Shadow — tightens as the beast leaves the ground
    const lift = Math.max(0, Math.min(1, (gy - (this.onGround ? gy : this.y + this.h)) / 60));
    ctx.fillStyle = `rgba(0,0,0,${air ? 0.12 : 0.28})`;
    ctx.beginPath();
    ctx.ellipse(cx, gy + 3, this.w * (air ? 0.5 : 0.78), 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Rear legs (behind the body) ───────────────────────────────────────────
    const swing = moving ? Math.sin(stride) * 11 : (air ? -7 : Math.sin(t * 0.04) * 1.4);
    const swing2 = moving ? Math.sin(stride + Math.PI) * 11 : (air ? -4 : -Math.sin(t * 0.04) * 1.4);
    const rearX  = bodyX - f * this.w * 0.62;
    const frontX = bodyX + f * this.w * 0.52;
    const hipY   = bodyY + ry * 0.42;
    this._drawLimb(rearX, hipY, rearX - f * 8 + swing2 * 0.4, hipY + 16,
                   rearX - f * 4 + swing2, gy - Math.max(0, swing2) * 0.35, f, 10, dark, mid, false);
    this._drawLimb(frontX, hipY - 2, frontX + f * 4 + swing2 * 0.3, hipY + 15,
                   frontX + f * 7 + swing2 * 0.8, gy - Math.max(0, swing2) * 0.3, f, 9, dark, mid, true);

    // ── Tail ──────────────────────────────────────────────────────────────────
    const tailBase = bodyX - f * rx * 0.92;
    const tSway = Math.sin(t * 0.06) * 8 + (moving ? Math.sin(stride) * 4 : 0);
    ctx.strokeStyle = mid;
    ctx.lineCap     = 'round';
    ctx.lineWidth   = 7;
    ctx.beginPath();
    ctx.moveTo(tailBase, bodyY - 2);
    ctx.quadraticCurveTo(tailBase - f * 20, bodyY - 12 + tSway * 0.5, tailBase - f * 30, bodyY + 4 + tSway);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tailBase - f * 26, bodyY + tSway * 0.8);
    ctx.lineTo(tailBase - f * 38, bodyY + 2 + tSway * 1.2);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Torso ─────────────────────────────────────────────────────────────────
    const seed = (this._furSeed || (this._furSeed = ((this.spawnX | 0) % 97) + 3));
    const bodyGrad = ctx.createLinearGradient(0, bodyY - ry, 0, bodyY + ry);
    bodyGrad.addColorStop(0,    clr);
    bodyGrad.addColorStop(0.55, mid);
    bodyGrad.addColorStop(1,    dark);
    ctx.fillStyle   = bodyGrad;
    ctx.strokeStyle = dark;
    ctx.lineWidth   = 2;
    this._furPath(bodyX, bodyY, rx, ry, seed, 30, 0.14, t * 0.05);
    ctx.fill(); ctx.stroke();

    // Shoulder hump — the mass that makes it read as a predator, not a barrel
    ctx.fillStyle = clr;
    this._furPath(bodyX + f * rx * 0.30, bodyY - ry * 0.62, rx * 0.42, ry * 0.72, seed + 11, 20, 0.18, t * 0.05 + 1);
    ctx.fill(); ctx.stroke();

    // Belly highlight
    ctx.fillStyle = belly;
    ctx.globalAlpha = (ctx.globalAlpha) * 0.35;
    ctx.beginPath();
    ctx.ellipse(bodyX - f * rx * 0.1, bodyY + ry * 0.45, rx * 0.55, ry * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 1) ? 0.35 : 1;

    // Dorsal spines, tallest over the hump
    ctx.fillStyle = dark;
    for (let i = 0; i < 7; i++) {
      const p  = i / 6;
      const sx = bodyX - f * rx * 0.85 + f * p * rx * 1.7;
      const sy = bodyY - ry * (0.72 + Math.sin(p * Math.PI) * 0.42);
      const sh = 7 + Math.sin(p * Math.PI) * 11;
      ctx.beginPath();
      ctx.moveTo(sx - f * 4, sy + 4);
      ctx.lineTo(sx + f * 3, sy - sh);
      ctx.lineTo(sx + f * 6, sy + 3);
      ctx.closePath();
      ctx.fill();
    }

    // ── Neck + head ───────────────────────────────────────────────────────────
    const headX = bodyX + f * (rx * 0.92);
    const headY = bodyY - ry * (windup ? 0.28 : 0.55) + (air ? -4 : 0);
    ctx.strokeStyle = mid;
    ctx.lineWidth   = 19;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(bodyX + f * rx * 0.42, bodyY - ry * 0.5);
    ctx.lineTo(headX - f * 6, headY + 4);
    ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.fillStyle   = clr;
    ctx.strokeStyle = dark;
    ctx.lineWidth   = 2;
    this._furPath(headX, headY, this.w * 0.52, this.w * 0.40, seed + 5, 18, 0.12, t * 0.05);
    ctx.fill(); ctx.stroke();

    // Muzzle + jaw. The jaw drops on the wind-up and on a leap — this is the
    // whole reason the head is a separate piece from the skull.
    const gape = windup ? 11 : (air ? 8 : 2 + Math.sin(t * 0.07) * 0.8);
    const snoutX = headX + f * this.w * 0.34;
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.ellipse(snoutX, headY + 2, this.w * 0.24, this.w * 0.15, f > 0 ? 0.12 : -0.12, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Open maw
    ctx.fillStyle = '#3a0808';
    ctx.beginPath();
    ctx.moveTo(headX + f * this.w * 0.12, headY + 4);
    ctx.quadraticCurveTo(snoutX + f * 6, headY + 4 + gape * 0.2, snoutX + f * this.w * 0.2, headY + 3 + gape * 0.5);
    ctx.quadraticCurveTo(snoutX, headY + 6 + gape, headX + f * this.w * 0.14, headY + 5 + gape * 0.8);
    ctx.closePath();
    ctx.fill();
    // Fangs, upper and lower
    ctx.fillStyle = '#fffbe0';
    for (const fg of [[0.16, 1], [0.30, 1], [0.22, -1]]) {
      const fx = headX + f * this.w * fg[0] + (fg[1] < 0 ? f * 4 : 0);
      const fy = fg[1] > 0 ? headY + 4 : headY + 4 + gape * 0.8;
      ctx.beginPath();
      ctx.moveTo(fx - 2.4, fy);
      ctx.lineTo(fx + 1.2, fy + fg[1] * 8);
      ctx.lineTo(fx + 3.2, fy);
      ctx.closePath();
      ctx.fill();
    }
    // Nostril
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(snoutX + f * this.w * 0.16, headY - 2, 1.8, 0, Math.PI * 2); ctx.fill();

    // Ears pinned back
    ctx.fillStyle = mid;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(headX - f * 4, headY - this.w * 0.2 + s * 3);
      ctx.lineTo(headX - f * 16, headY - this.w * 0.44 + s * 5);
      ctx.lineTo(headX - f * 4, headY - this.w * 0.08 + s * 3);
      ctx.closePath();
      ctx.fill();
    }

    // Brow + eye. The brow ridge is what makes it read as angry rather than cute.
    const eyeX = headX + f * 7, eyeY = headY - 5;
    ctx.fillStyle = raged ? '#ffe14a' : '#ff3a10';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(eyeX, eyeY, 4.6, 3.4, f > 0 ? -0.3 : 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#150000';
    ctx.beginPath(); ctx.ellipse(eyeX + f * 1.2, eyeY, 1.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(eyeX - f * 8, eyeY - 7);
    ctx.lineTo(eyeX + f * 6, eyeY - 4);
    ctx.stroke();

    // ── Near-side legs (in front of the body) ────────────────────────────────
    this._drawLimb(rearX + f * 5, hipY, rearX - f * 3 + swing * 0.4, hipY + 17,
                   rearX + f * 1 + swing, gy - Math.max(0, swing) * 0.35, f, 11, dark, clr, false);
    this._drawLimb(frontX + f * 4, hipY - 3,
                   frontX + f * 6 + swing * 0.3, hipY + 16 - (windup ? 8 : 0),
                   frontX + f * 10 + swing, gy - Math.max(0, swing) * 0.3 - (windup ? 16 : 0), f, 10, dark, clr, true);

    // Raged: embers rolling off the back
    if (raged && settings.particles && t % 3 === 0) {
      spawnParticles(bodyX, bodyY - ry * 0.6, '#ff4400', 2);
    }

    // Name tag + HP bar — a fighter wearing this body (BR creature form) has
    // the shared overhead nameplate already.
    if (!this._brForm) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = raged ? '#ff6600' : '#aaffaa';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, cx, ty - 10);

      const hpPct = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(cx - 24, ty - 22, 48, 5);
      ctx.fillStyle = `hsl(${hpPct * 120},100%,44%)`;
      ctx.fillRect(cx - 24, ty - 22, 48 * hpPct, 5);
    }

    ctx.restore();
  }
}

// ============================================================
