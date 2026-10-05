'use strict';
// smb-enemies-creatures.js — Yeti class (ice arena encounter) + Dummy class (training mode target)
// Depends on: smb-globals.js, smb-fighter.js, smb-data-weapons.js

// YETI  (rare random encounter in ice arena)
// ============================================================
class Yeti extends Fighter {
  constructor(x, y) {
    super(x, y, '#e8f4ff', 'hammer',
      { left:null, right:null, jump:null, attack:null, ability:null, super:null },
      true, 'hard');
    this.name         = 'YETI';
    this.isYeti       = true;
    this.isMinion     = true;
    this.w            = 40;
    this.h            = 76;
    this.health       = 200;  // reduced — mini-boss tier, not ultra-boss
    this.maxHealth    = 200;
    this.lives        = 1;
    this.dmgMult      = 1.1;  // deals ~10% bonus damage (was 2.25×)
    this.kbResist     = 0.30; // moderate KB resistance (was 0.55)
    this.kbBonus      = 1.3;  // mild extra KB (was 2.1)
    this.classSpeedMult = 0.3; // 0.3x speed
    this.spawnX       = x;
    this.spawnY       = y;
    this.playerNum    = 2;
    this.roarCooldown  = 300;  // frames before first roar
    this.spikeCooldown = 200;  // frames before first ice spike
    this.breathCooldown = 400;
    this.iceSpikes     = [];   // {x, y, timer, h} visual ice spikes
    this._lastPhase    = 1;    // for phase-transition cinematic
    this._heavyCd      = 160;  // charged heavy smash
    this._heavyPhase   = 'none'; // 'windup' | 'release' | 'none'
    this._heavyTimer   = 0;
    this._freezeZones  = [];   // {x, y, r, timer, maxTimer} — freeze patches on ground
  }

  update() {
    // Slow movement — override speed
    this.classSpeedMult = 0.3;
    super.update();
    // Extra friction to keep it slow
    this.vx *= 0.88;

    if (this.health <= 0) return;

    // Phase transition: at 50% HP trigger blizzard rage cinematic
    const yetiPhase = this.health <= this.maxHealth * 0.5 ? 2 : 1;
    if (yetiPhase !== this._lastPhase) {
      this._lastPhase = yetiPhase;
      triggerPhaseTransition(this, yetiPhase);
    }

    // Block AI behavior during cinematic
    if (activeCinematic) return;

    // ── Heavy smash wind-up / release ──────────────────────────
    if (this._heavyPhase === 'windup') {
      this._heavyTimer--;
      this.vx = 0;
      if (this._heavyTimer <= 0) {
        this._heavyPhase = 'release';
        screenShake = Math.max(screenShake, 20);
        // Seismic ground shake particles
        for (let i = 0; i < 5; i++)
          spawnParticles(this.cx() + (Math.random()-0.5)*160, this.y + this.h, '#aaddff', 4);
        // Freeze zone on ground
        this._freezeZones.push({ x: this.cx(), y: this.y + this.h, r: 110, timer: 240, maxTimer: 240 });
        // Damage + freeze players in range
        for (const p of creatureFoes(this)) {
          if (p === this || p.health <= 0) continue;
          const dd = Math.abs(p.cx() - this.cx());
          if (dd < 130) {
            dealDamage(this, p, Math.round(40 * this.dmgMult), 10);
            p.vy = -14;
            p.stunTimer = Math.max(p.stunTimer || 0, 60); // freeze stun
            spawnParticles(p.cx(), p.cy(), '#88ccff', 16);
          }
        }
        if (typeof SoundManager !== 'undefined') SoundManager.heavyHit();
        this._heavyCd = this.health < this.maxHealth * 0.5 ? 280 : 420;
        setTimeout(() => { this._heavyPhase = 'none'; }, 400);
      }
      return;
    }

    if (this._heavyCd > 0) this._heavyCd--;

    // Tick freeze zones
    this._freezeZones = this._freezeZones.filter(z => z.timer > 0);
    for (const z of this._freezeZones) {
      z.timer--;
      // Damage players standing in zone each ~30 frames
      if (z.timer % 30 === 0) {
        for (const p of creatureFoes(this)) {
          if (p === this || p.health <= 0) continue;
          if (Math.hypot(p.cx() - z.x, (p.y + p.h) - z.y) < z.r && p.onGround) {
            dealDamage(this, p, 4, 0);
            p.vx *= 0.4; // slow in freeze zone
          }
        }
      }
    }

    // Roar stun: stuns all nearby players
    if (this.roarCooldown > 0) this.roarCooldown--;
    else if (this.target && this.target.health > 0 && dist(this, this.target) < 220) {
      this.doRoar();
      this.roarCooldown = 420;
    }

    // Ice spikes: erupt from ground under players
    if (this.spikeCooldown > 0) this.spikeCooldown--;
    else if (this.target && this.target.health > 0) {
      this.doIceSpikes();
      this.spikeCooldown = 280;
    }

    // Ice breath: fan of slow projectiles
    if (this.breathCooldown > 0) this.breathCooldown--;
    else if (this.target && this.target.health > 0 && dist(this, this.target) < 300) {
      this.doIceBreath();
      this.breathCooldown = 360;
    }

    // Charged heavy smash: use when target is close
    if (this._heavyCd <= 0 && this.target && this.target.health > 0 &&
        dist(this, this.target) < 140 && this.onGround && this._heavyPhase === 'none') {
      this._heavyPhase = 'windup';
      this._heavyTimer = this.health < this.maxHealth * 0.5 ? 30 : 45;
      if (typeof bossWarnings !== 'undefined') {
        bossWarnings.push({ type: 'circle', x: this.cx(), y: this.y + this.h, r: 130,
          color: '#88ccff', timer: this._heavyTimer + 5, maxTimer: this._heavyTimer + 5, label: '❄ FREEZE SLAM' });
      }
      spawnParticles(this.cx(), this.cy(), '#aaddff', 12);
    }

    // Update visual spikes
    this.iceSpikes = this.iceSpikes.filter(sp => sp.timer > 0);
    for (const sp of this.iceSpikes) sp.timer--;
  }

  doRoar() {
    screenShake = Math.max(screenShake, 18);
    spawnParticles(this.cx(), this.cy(), '#aaddff', 20);
    if (settings.dmgNumbers) damageTexts.push(new DamageText(this.cx(), this.y - 20, 'ROAR!', '#aaddff'));
    for (const p of creatureFoes(this)) {
      if (p.isBoss || p.health <= 0) continue;
      if (dist(this, p) < 220) {
        p.stunTimer = Math.max(p.stunTimer || 0, 50);
        dealDamage(this, p, 4, 4);
        spawnParticles(p.cx(), p.cy(), '#88bbff', 10);
      }
    }
  }

  doIceSpikes() {
    const target = this.target;
    if (!target) return;
    // Spawn 3 spikes: one under target, two offset
    const offsets = [-60, 0, 60];
    for (const off of offsets) {
      const sx = clamp(target.cx() + off, 30, GAME_W - 30);
      this.iceSpikes.push({ x: sx, y: currentArena.deathY || 520, timer: 60, h: 80 });
      // Delayed damage
      setTimeout(() => {
        if (!gameRunning) return;
        for (const p of creatureFoes(this)) {
          if (p.isBoss || p.health <= 0) continue;
          if (Math.abs(p.cx() - sx) < 28 && p.y + p.h > (currentArena.deathY || 520) - 90) {
            dealDamage(this, p, 8, 7);
            p.vy = -9;
            spawnParticles(p.cx(), p.cy(), '#aaddff', 10);
          }
        }
      }, 400);
    }
    spawnParticles(target.cx(), target.cy() + 60, '#aaddff', 12);
  }

  doIceBreath() {
    const target = this.target;
    if (!target) return;
    const dx = target.cx() - this.cx();
    const baseAngle = Math.atan2(target.cy() - this.cy(), dx);
    for (let i = -2; i <= 2; i++) {
      const angle = baseAngle + i * 0.18;
      const spd = 5 + Math.random() * 2;
      const proj = new Projectile(
        this.cx() + Math.cos(angle) * 24,
        this.cy(),
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        this, 5, '#88ccff'
      );
      proj.isIce = true;
      proj.life  = 70;
      projectiles.push(proj);
    }
    spawnParticles(this.cx() + this.facing * 24, this.cy(), '#aaddff', 10);
  }

  // Shaggy silhouette: an ellipse with deterministic radial noise so the yeti
  // has a fur outline rather than the smooth vector egg it used to be. The
  // noise is keyed on the point index (never Math.random), so it cannot crawl
  // between frames; `wob` is the only animated term.
  _fur(cx, cy, rx, ry, seed, n, spike, wob) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const h = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
      const r = 1 + (h - Math.floor(h)) * spike + Math.sin(a * 3 + wob) * 0.03;
      const px = cx + Math.cos(a) * rx * r;
      const py = cy + Math.sin(a) * ry * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  draw() {
    if (this.health <= 0) return;
    ctx.save();
    if (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 1) ctx.globalAlpha = 0.35;

    const cx = this.cx(), ty = this.y, f = this.facing;
    const gy = ty + this.h;
    const t  = this.animTimer || 0;
    // Pale-on-pale vanished into the ice arena and read as a snowman; this
    // palette keeps the fur a shade or two below the snow with white highlights.
    const clr = '#cfe2f0', mid = '#8fb3cf', dark = '#2f5b7c', deep = '#1d3f5c';

    // Draw freeze zones on ground
    for (const z of this._freezeZones) {
      const zAlpha = (z.timer / z.maxTimer) * 0.45;
      ctx.save();
      ctx.globalAlpha = zAlpha;
      const zg = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      zg.addColorStop(0, 'rgba(180,230,255,0.9)');
      zg.addColorStop(0.7, 'rgba(100,180,255,0.5)');
      zg.addColorStop(1, 'rgba(80,150,255,0)');
      ctx.fillStyle = zg;
      ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      // Crystal crack lines
      ctx.strokeStyle = 'rgba(200,240,255,0.6)'; ctx.lineWidth = 1;
      for (let ci = 0; ci < 6; ci++) {
        const ang = ci * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(z.x, z.y);
        ctx.lineTo(z.x + Math.cos(ang) * z.r * 0.8, z.y + Math.sin(ang) * z.r * 0.28);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Charged heavy smash wind-up indicator
    const windup = this._heavyPhase === 'windup';
    if (windup) {
      const chargeP = 1 - this._heavyTimer / (this.health < this.maxHealth * 0.5 ? 30 : 45);
      ctx.save();
      ctx.globalAlpha = 0.7 * chargeP;
      ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 3;
      ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 16 * chargeP;
      ctx.beginPath(); ctx.arc(this.cx(), this.cy() - 10, 18 + chargeP * 22, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Draw visual ice spikes first (below yeti)
    for (const sp of this.iceSpikes) {
      const prog = Math.min(1, (60 - sp.timer) / 20);
      const hh = sp.h * prog;
      ctx.fillStyle = 'rgba(136,200,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(sp.x - 10, sp.y);
      ctx.lineTo(sp.x, sp.y - hh);
      ctx.lineTo(sp.x + 10, sp.y);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,240,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(sp.x - 5, sp.y);
      ctx.lineTo(sp.x, sp.y - hh * 0.6);
      ctx.lineTo(sp.x + 5, sp.y);
      ctx.fill();
    }

    // ── Pose ──────────────────────────────────────────────────────────────────
    // Stride phase from distance travelled, not a free-running timer, or the
    // feet skate under a body that moves at a different rate.
    this._gait = (this._gait || 0) + Math.abs(this.vx) * 0.10;
    const moving  = Math.abs(this.vx) > 0.4 && this.onGround;
    const swing   = moving ? Math.sin(this._gait) * 8 : Math.sin(t * 0.035) * 1.0;
    const breathe = Math.sin(t * 0.045) * 1.2;
    const attacking = this.state === 'attacking' || windup;
    const crouch  = windup ? 6 : 0;
    const seed    = (this._furSeed || (this._furSeed = ((this.spawnX | 0) % 89) + 7));

    // Ape proportions: a tall shaggy trunk, a small head sunk into the shoulders,
    // short bowed legs and very long arms that reach the floor on the knuckles.
    // The previous build was a wide noisy ellipse under a ball head, which read
    // as a snowman in a poncho.
    const shY   = ty + this.h * 0.24 + crouch;
    const hipY  = ty + this.h * 0.70 + crouch;
    const shHW  = this.w * 0.80;
    const hipHW = this.w * 0.56;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath(); ctx.ellipse(cx, gy + 4, this.w * 0.85, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Shaggy trunk outline: a rounded trapezoid walked point-by-point with
    // triangular tufts hung off it. Tuft size is index-hashed so the coat is
    // ragged but never crawls between frames.
    const trunkPath = () => {
      const pts = [];
      const push = (x, y) => pts.push([x, y]);
      for (let i = 0; i <= 8; i++) {                    // right flank, down
        const p = i / 8;
        push(cx + shHW + (hipHW - shHW) * p + Math.sin(p * 3.1) * 2,
             shY + (hipY - shY) * p);
      }
      for (let i = 0; i <= 5; i++) {                    // hips, across
        const p = i / 5;
        push(cx + hipHW - hipHW * 2 * p, hipY + Math.sin(p * Math.PI) * 5);
      }
      for (let i = 0; i <= 8; i++) {                    // left flank, up
        const p = i / 8;
        push(cx - hipHW + (shHW - hipHW) * p - Math.sin((1 - p) * 3.1) * 2,
             hipY + (shY - hipY) * p);
      }
      for (let i = 0; i <= 6; i++) {                    // shoulders, across
        const p = i / 6;
        push(cx - shHW + shHW * 2 * p, shY - Math.sin(p * Math.PI) * 7);
      }
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        const [nx, ny] = pts[(i + 1) % pts.length];
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        // Tuft: a spike pushed out along the edge normal
        const hsh = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
        const amt = 2 + (hsh - Math.floor(hsh)) * 6;
        const ex = nx - x, ey = ny - y, el = Math.hypot(ex, ey) || 1;
        ctx.lineTo((x + nx) * 0.5 + (ey / el) * amt, (y + ny) * 0.5 - (ex / el) * amt);
      }
      ctx.closePath();
    };

    // ── Far arm (behind the trunk) ────────────────────────────────────────────
    const farShX  = cx - f * shHW * 0.82;
    const farHndX = farShX - f * 8 - swing * 0.6;
    const farHndY = attacking ? shY + this.h * 0.30 : gy - 8 - Math.abs(swing) * 0.4;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = dark; ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(farShX, shY + 6);
    ctx.quadraticCurveTo(farShX - f * 16, shY + this.h * 0.32, farHndX, farHndY);
    ctx.stroke();
    ctx.strokeStyle = mid; ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(farShX, shY + 6);
    ctx.quadraticCurveTo(farShX - f * 16, shY + this.h * 0.32, farHndX, farHndY);
    ctx.stroke();
    ctx.fillStyle = mid; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(farHndX, farHndY, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // ── Legs — short, thick, bowed, planted wide ─────────────────────────────
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      const off = s === 1 ? swing : -swing;
      const hx  = cx + s * hipHW * 0.62;
      const kx  = cx + s * (hipHW * 0.95) + off * 0.3;
      const fx  = cx + s * (hipHW * 0.82) + off;
      const fy  = gy - 5 - Math.max(0, off) * 0.3;
      ctx.strokeStyle = deep; ctx.lineWidth = 21;
      ctx.beginPath(); ctx.moveTo(hx, hipY - 4); ctx.lineTo(kx, hipY + this.h * 0.13); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = mid;  ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(hx, hipY - 4); ctx.lineTo(kx, hipY + this.h * 0.13); ctx.lineTo(fx, fy); ctx.stroke();
      // Broad flat foot with toes
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(fx + f * 4, fy + 3, 14, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eef7ff';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.arc(fx + f * 12, fy + 2 + i * 3.2, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.lineCap = 'butt';

    // ── Trunk ─────────────────────────────────────────────────────────────────
    const bodyGrad = ctx.createLinearGradient(cx - shHW, 0, cx + shHW, 0);
    bodyGrad.addColorStop(0,    mid);
    bodyGrad.addColorStop(0.40, clr);
    bodyGrad.addColorStop(1,    dark);
    ctx.fillStyle   = bodyGrad;
    ctx.strokeStyle = deep;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    trunkPath(); ctx.fill(); ctx.stroke();

    // Chest plate — lighter, narrow, so the trunk reads as a torso not a barrel
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.ellipse(cx + f * 3, (shY + hipY) * 0.5 + breathe * 0.5, shHW * 0.40, (hipY - shY) * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fur lay — short strokes fanning down and out from the spine
    ctx.strokeStyle = 'rgba(60,110,155,0.30)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      const p  = i / 9;
      const lx = cx - shHW * 0.7 + p * shHW * 1.4;
      const ly = shY + 10 + Math.sin(p * Math.PI) * 5;
      const dir = lx < cx ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + dir * 3, ly + 12, lx + dir * 7, ly + 24);
      ctx.stroke();
    }

    // Frost crusting the shoulders — this is a yeti, the arena should be on it
    ctx.fillStyle = 'rgba(224,244,255,0.75)';
    for (const s of [-1, 1]) {
      const sx = cx + s * shHW * 0.68;
      ctx.beginPath();
      ctx.moveTo(sx - 9, shY + 4);
      ctx.lineTo(sx - 3, shY - 8);
      ctx.lineTo(sx + 2, shY - 1);
      ctx.lineTo(sx + 8, shY - 9);
      ctx.lineTo(sx + 10, shY + 5);
      ctx.closePath();
      ctx.fill();
    }

    // ── Head — small, sunk between the shoulders ─────────────────────────────
    const headY = ty + this.h * 0.155 + crouch + breathe * 0.4;
    const headR = this.w * 0.29;
    ctx.fillStyle   = clr;
    ctx.strokeStyle = deep;
    ctx.lineWidth   = 2.5;
    this._fur(cx + f * 2, headY, headR, headR * 0.98, seed + 9, 22, 0.22, t * 0.045);
    ctx.fill(); ctx.stroke();
    // Face — a muzzle patch low on the skull, under the brow
    ctx.fillStyle = '#eef7ff';
    ctx.beginPath();
    ctx.ellipse(cx + f * 3, headY + headR * 0.46, headR * 0.46, headR * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    // Heavy brow ridge
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(cx + f * 2 - headR * 0.62, headY - headR * 0.02);
    ctx.quadraticCurveTo(cx + f * 2, headY - headR * 0.40, cx + f * 2 + headR * 0.62, headY - headR * 0.02);
    ctx.quadraticCurveTo(cx + f * 2, headY + headR * 0.12, cx + f * 2 - headR * 0.62, headY - headR * 0.02);
    ctx.closePath();
    ctx.fill();
    // Small eyes glowing out from under it
    ctx.fillStyle = '#2aa8ff'; ctx.shadowColor = '#66ccff'; ctx.shadowBlur = 10;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + f * 2 + s * headR * 0.33, headY + headR * 0.02, 2.2, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    // Snarl + tusks
    const gape = attacking ? 6 : 1.5;
    ctx.strokeStyle = deep; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + f * 3 - headR * 0.34, headY + headR * 0.44);
    ctx.quadraticCurveTo(cx + f * 3, headY + headR * 0.44 + gape, cx + f * 3 + headR * 0.34, headY + headR * 0.44);
    ctx.stroke();
    ctx.fillStyle = '#fffdf0';
    for (const s of [-1, 1]) {
      const tx = cx + f * 3 + s * headR * 0.30;
      ctx.beginPath();
      ctx.moveTo(tx - 2.2, headY + headR * 0.46);
      ctx.lineTo(tx, headY + headR * 0.46 - 7 - gape * 0.4);
      ctx.lineTo(tx + 2.2, headY + headR * 0.46);
      ctx.closePath();
      ctx.fill();
    }
    // Frost breath on the exhale
    if ((t % 150) < 34) {
      const bp = ((t % 150) / 34);
      const inv = (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 1) ? 0.35 : 1;
      ctx.globalAlpha = inv * (1 - bp) * 0.5;
      ctx.fillStyle = '#dff2ff';
      ctx.beginPath();
      ctx.ellipse(cx + f * (headR + 6 + bp * 22), headY + headR * 0.5 + bp * 4,
                  6 + bp * 13, 4 + bp * 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = inv;
    }

    // ── Near arm (over the trunk) — long enough to knuckle the floor ─────────
    const shX   = cx + f * shHW * 0.86;
    const hndX  = attacking ? shX + f * 4  : shX + f * 10 + swing * 0.6;
    const hndY  = attacking ? headY - headR - 14 : gy - 8 - Math.abs(swing) * 0.4;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = deep; ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(shX, shY + 6);
    ctx.quadraticCurveTo(shX + f * 20, attacking ? shY + this.h * 0.10 : shY + this.h * 0.40, hndX, hndY);
    ctx.stroke();
    ctx.strokeStyle = clr; ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(shX, shY + 6);
    ctx.quadraticCurveTo(shX + f * 20, attacking ? shY + this.h * 0.10 : shY + this.h * 0.40, hndX, hndY);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Fist
    ctx.fillStyle = clr; ctx.strokeStyle = deep; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(hndX, hndY, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Knuckles
    ctx.fillStyle = deep;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(hndX + f * 6, hndY + i * 4.5, 2, 0, Math.PI * 2); ctx.fill();
    }
    // Frost gathering on the raised fist while charging
    if (windup) {
      ctx.fillStyle = 'rgba(170,221,255,0.7)';
      for (let i = 0; i < 4; i++) {
        const a = t * 0.15 + i * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(hndX + Math.cos(a) * 17, hndY + Math.sin(a) * 17, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Name tag + HP bar (skipped for a fighter wearing this body — BR creature form)
    if (!this._brForm) {
      ctx.globalAlpha = 1; ctx.fillStyle = '#88ccff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillText('YETI', cx, ty - 12);
      const hpPct = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 26, ty - 24, 52, 5);
      ctx.fillStyle = `hsl(${hpPct * 120},100%,44%)`; ctx.fillRect(cx - 26, ty - 24, 52 * hpPct, 5);
    }

    ctx.restore();
  }

  useSuper() {}
  activateSuper() {}
  respawn() { this.health = 0; }
}

