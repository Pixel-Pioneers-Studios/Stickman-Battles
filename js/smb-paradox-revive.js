'use strict';
// smb-paradox-revive.js — spawnParadox, removeParadox, triggerParadoxRevive, drawParadoxRevive, damage lock, empowerment, foreshadow
// Depends on: smb-globals.js, smb-paradox-class.js (and preceding splits in chain)

// ============================================================
// SPAWN / REMOVE helpers
// ============================================================
function spawnParadox(x, y) {
  paradoxEntity = new Paradox(x, y);
}

function removeParadox() {
  if (paradoxEntity) paradoxEntity.done = true;
}

// ============================================================
// PARADOX REVIVE  — replaces triggerFakeDeath visually
// ============================================================
function triggerParadoxRevive(player) {
  if (fakeDeath.triggered) return;
  fakeDeath.triggered = true; // block re-trigger (shared flag with old system)

  paradoxReviveActive = true;
  paradoxReviveTimer  = 0;
  paradoxRevivePlayer = player;

  // Standard tumble physics so player reacts visually
  player.invincible   = 9999;
  player.ragdollTimer = 80;
  player.ragdollSpin  = (Math.random() > 0.5 ? 1 : -1) * (0.18 + Math.random() * 0.14);
  player.vy           = -12;
  player.vx           = (Math.random() - 0.5) * 14;
  screenShake         = Math.max(screenShake, 20);
}

function updateParadoxRevive() {
  if (!paradoxReviveActive) return;
  paradoxReviveTimer++;
  const t = paradoxReviveTimer;
  const p = paradoxRevivePlayer;

  // t=60: spawn Paradox near fallen player's spawn, show first dialogue
  if (t === 60) {
    const spx = p ? p.spawnX : GAME_W / 2;
    const spy = p ? p.spawnY : GAME_H / 2;
    spawnParadox(spx - 45, spy - 20);
    bossDialogue = { text: randChoice(_PARADOX_REVIVE_LINES), timer: 280 };
    screenShake  = Math.max(screenShake, 10);
  }

  // t=100: energy surge burst
  if (t === 100 && p && settings.particles) {
    for (let i = 0; i < 50 && particles.length < MAX_PARTICLES; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
      const spd   = 4 + Math.random() * 12;
      const _p2   = _getParticle();
      _p2.x       = p.spawnX; _p2.y = p.spawnY;
      _p2.vx      = Math.cos(angle) * spd;
      _p2.vy      = Math.sin(angle) * spd;
      _p2.color   = Math.random() < 0.5 ? '#00ffff' : '#ffffff';
      _p2.size    = 2 + Math.random() * 5;
      _p2.life    = 50 + Math.random() * 40;
      _p2.maxLife = 90;
      particles.push(_p2);
    }
    screenShake = Math.max(screenShake, 28);
  }

  // t=150: secondary Paradox particle burst
  if (t === 150 && settings.particles) {
    const ex = paradoxEntity ? paradoxEntity.cx() : (p ? p.spawnX : GAME_W / 2);
    const ey = paradoxEntity ? paradoxEntity.cy() : (p ? p.spawnY : GAME_H / 2);
    for (let i = 0; i < 35 && particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 3 + Math.random() * 9;
      const _p2   = _getParticle();
      _p2.x       = ex + (Math.random() - 0.5) * 20;
      _p2.y       = ey + (Math.random() - 0.5) * 20;
      _p2.vx      = Math.cos(angle) * spd;
      _p2.vy      = Math.sin(angle) * spd;
      _p2.color   = Math.random() < 0.6 ? '#00ffff' : '#aa88ff';
      _p2.size    = 1.5 + Math.random() * 3.5;
      _p2.life    = 40 + Math.random() * 35;
      _p2.maxLife = 75;
      particles.push(_p2);
    }
  }

  // t=220: revive player with 2 lives, remove Paradox
  if (t === 220 && p) {
    p.lives        = 2;
    p.invincible   = 150;
    p.ragdollTimer = 0;
    p.ragdollSpin  = 0;
    p.ragdollAngle = 0;
    p.respawn();
    removeParadox();
    paradoxReviveActive = false;
  }

  // Keep Paradox entity alive and updated
  if (paradoxEntity) paradoxEntity.update();
}

function drawParadoxRevive() {
  if (!paradoxReviveActive) return;
  const t = paradoxReviveTimer;

  // Dark overlay builds over first 80 frames
  const overlayAlpha = Math.min(0.70, t / 80 * 0.70);
  ctx.save();
  ctx.globalAlpha = overlayAlpha;
  ctx.fillStyle   = '#000000';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.restore();

  // "DEFEATED" text
  if (t > 40) {
    const a = Math.min(1, (t - 40) / 30);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#ff3355';
    ctx.font        = 'bold 32px monospace';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur  = 18;
    ctx.fillText('DEFEATED', GAME_W / 2, 82);
    ctx.restore();
  }

  // Paradox entity (draws in world space, over dark overlay)
  if (paradoxEntity && t >= 60) paradoxEntity.draw();

  // "PARADOX" label above entity
  if (t >= 70 && t < 205 && paradoxEntity) {
    const la = Math.min(1, (t - 70) / 20) * (t > 185 ? Math.max(0, (205 - t) / 20) : 1);
    ctx.save();
    ctx.globalAlpha = la;
    ctx.fillStyle   = '#00ffff';
    ctx.font        = 'bold 12px monospace';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur  = 10;
    ctx.fillText('PARADOX', paradoxEntity.cx(), paradoxEntity.y - 13);
    ctx.restore();
  }

  // Horizontal CRT scan-line distortion
  if (t >= 80 && t < 220) {
    const da = 0.05 + Math.abs(Math.sin(t * 0.15)) * 0.04;
    ctx.save();
    ctx.globalAlpha = da;
    ctx.fillStyle   = '#00ffff';
    for (let ry = 0; ry < GAME_H; ry += 7) ctx.fillRect(0, ry, GAME_W, 1);
    ctx.restore();
  }
}

// ============================================================
// UPDATE / DRAW — standalone (called each frame when no revive)
// ============================================================
function updateParadox() {
  if (paradoxEntity) {
    paradoxEntity.update();
    if (paradoxEntity.done && paradoxEntity.alpha <= 0) paradoxEntity = null;
  }
}

function drawParadox() {
  if (paradoxEntity) paradoxEntity.draw();
}

// ============================================================
// TRUEFORM DAMAGE LOCK + PARADOX EMPOWERMENT
// ============================================================
function startTFDamageLock() {
  tfDamageLocked    = true;
  tfDamageLockTimer = 480; // 8 seconds then auto-empower
}

function activateParadoxEmpowerment(hero) {
  tfDamageLocked    = false;
  tfDamageLockTimer = 0;
  tfParadoxEmpowered = true;
  tfEmpowerTimer     = TF_EMPOWER_DURATION;

  if (hero) {
    // Speed boost
    if (!hero._preEmpowerSpeed) hero._preEmpowerSpeed = hero.speed;
    hero.speed = (hero._preEmpowerSpeed || 3.2) * 1.4;
    // Damage boost
    if (hero._preEmpowerDmgMult === undefined) hero._preEmpowerDmgMult = hero.dmgMult !== undefined ? hero.dmgMult : 1.0;
    hero.dmgMult = hero._preEmpowerDmgMult * 1.6;
  }

  if (typeof showBossDialogue === 'function') showBossDialogue('PARADOX EMPOWERMENT', 320);
  screenShake = Math.max(screenShake, 30);

  if (hero && settings.particles) {
    for (let i = 0; i < 60 && particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 5 + Math.random() * 12;
      const _p    = _getParticle();
      _p.x = hero.cx(); _p.y = hero.cy();
      _p.vx = Math.cos(angle) * spd; _p.vy = Math.sin(angle) * spd;
      _p.color = Math.random() < 0.5 ? '#00ffff' : '#ffffff';
      _p.size  = 2 + Math.random() * 5;
      _p.life  = 60 + Math.random() * 40; _p.maxLife = 100;
      particles.push(_p);
    }
  }
}

function updateParadoxEmpowerment() {
  // Count down damage lock → auto-activate empowerment
  if (tfDamageLocked && tfDamageLockTimer > 0) {
    tfDamageLockTimer--;
    if (tfDamageLockTimer <= 0) {
      const hero = players.find(p => !p.isBoss && p.health > 0);
      activateParadoxEmpowerment(hero || null);
    }
  }

  // Count down empowerment duration
  if (tfParadoxEmpowered && tfEmpowerTimer > 0) {
    tfEmpowerTimer--;
    if (tfEmpowerTimer <= 0) {
      const hero = players.find(p => !p.isBoss && p.health > 0);
      if (hero) {
        if (hero._preEmpowerSpeed    !== undefined) { hero.speed   = hero._preEmpowerSpeed;    delete hero._preEmpowerSpeed; }
        if (hero._preEmpowerDmgMult  !== undefined) { hero.dmgMult = hero._preEmpowerDmgMult;  delete hero._preEmpowerDmgMult; }
      }
      tfParadoxEmpowered = false;
    }
  }
}

function drawParadoxEmpowerment() {
  if (!tfParadoxEmpowered || tfEmpowerTimer <= 0) return;
  const hero = players.find(p => !p.isBoss && p.health > 0);
  if (!hero) return;

  const fadeA = Math.min(1, tfEmpowerTimer / 120);
  const pulse = 0.4 + Math.sin(frameCount * 0.12) * 0.3;

  // Aura ring
  ctx.save();
  ctx.globalAlpha = fadeA * pulse * 0.55;
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth   = 3;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur  = 22;
  ctx.beginPath();
  ctx.arc(hero.cx(), hero.cy(), 32 + Math.sin(frameCount * 0.1) * 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Floating "EMPOWERED" label that fades at end
  if (tfEmpowerTimer < 120) {
    const la = Math.min(1, tfEmpowerTimer / 60) * 0.88;
    ctx.save();
    ctx.globalAlpha = la;
    ctx.fillStyle   = '#00ffff';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur  = 8;
    ctx.fillText('EMPOWERED', hero.cx(), hero.y - 20);
    ctx.restore();
  }
}

// ============================================================
// BOSS FIGHT FORESHADOWING
// ============================================================
function updateBossParadoxForeshadow() {
  if (gameMode !== 'boss' || !gameRunning || gameFrozen) return;
  const fs = bossParadoxForeshadow;

  if (fs.cooldown > 0) { fs.cooldown--; return; }

  if (fs.active) {
    fs.timer++;
    if (fs.timer >= 52) {
      fs.active   = false;
      fs.timer    = 0;
      fs.cooldown = 660 + Math.floor(Math.random() * 540); // 11–20 s
    }
    return;
  }

  // Random chance to trigger (~0.25% per frame after cooldown)
  if (frameCount > 600 && Math.random() < 0.0025) {
    fs.active = true;
    fs.timer  = 0;
  }
}

function drawBossParadoxForeshadow() {
  if (!bossParadoxForeshadow.active) return;
  const t = bossParadoxForeshadow.timer;
  const alpha = t < 10 ? (t / 10) * 0.32 : t < 40 ? 0.32 : ((52 - t) / 12) * 0.32;
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  // Subtle dark overlay to sell the vision
  ctx.fillStyle = '#000d1a';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.globalAlpha = alpha * 1.0;

  // TrueForm silhouette — left background
  _drawForeshadowSilhouette(195, GAME_H - 155, '#111111', '#ffffff', 1.25, true);
  // Paradox silhouette — right background
  _drawForeshadowSilhouette(610, GAME_H - 148, '#000000', '#00ffff', 1.0, false);

  // Energy clash line between them
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth   = 1.8;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur  = 16;
  ctx.globalAlpha = alpha * 0.65;
  ctx.beginPath();
  ctx.moveTo(215, GAME_H - 185);
  ctx.lineTo(600, GAME_H - 178);
  ctx.stroke();

  ctx.restore();
}

// Internal helper: small stickman silhouette for foreshadow
function _drawForeshadowSilhouette(x, y, fill, stroke, scale, faceRight) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle   = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth   = 1.6 / scale;
  ctx.shadowColor = stroke;
  ctx.shadowBlur  = 9;
  const d = faceRight ? 1 : -1;
  ctx.beginPath(); ctx.arc(0, -44, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -37); ctx.lineTo(0, -15);
  ctx.moveTo(0, -32); ctx.lineTo(d * 13, -23);
  ctx.moveTo(0, -32); ctx.lineTo(-d * 10, -25);
  ctx.moveTo(0, -15); ctx.lineTo(d * 9, 0);
  ctx.moveTo(0, -15); ctx.lineTo(-d * 7, 0);
  ctx.stroke();
  ctx.restore();
}

// One-time scripted moment: Boss punches Paradox out of arena (fires at 50% boss HP)
function triggerBossParadoxPunch() {
  if (bossParadoxForeshadow.punchFired) return;
  bossParadoxForeshadow.punchFired = true;

  screenShake = Math.max(screenShake, 18);
  if (settings.particles) {
    for (let i = 0; i < 32 && particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 4 + Math.random() * 9;
      const _p    = _getParticle();
      _p.x = 600; _p.y = GAME_H - 185;
      _p.vx = Math.cos(angle) * spd; _p.vy = Math.sin(angle) * spd;
      _p.color = Math.random() < 0.5 ? '#00ffff' : '#ffffff';
      _p.size  = 2 + Math.random() * 4; _p.life  = 28 + Math.random() * 28; _p.maxLife = 56;
      particles.push(_p);
    }
  }
  if (typeof showBossDialogue === 'function') showBossDialogue('Nothing can save you.', 280);
}


// ============================================================
// PARADOX MANIFESTATION — Absolute Axiom fight ally (story)
// Projected by Kael's fragment; fueled by Paradox's remaining energy.
// The fragment is the projector, Paradox's energy is the fuel:
//  - every action burns energy; damage taken burns energy instead of form
//  - holding the projection occupies a slice of the player's output
//    (attacker._pdxManifestHold → ×0.85 in dealDamage)
//  - at zero energy the manifestation collapses; it never respawns
// Spawned from _startGameCore when the story chapter sets paradoxManifest.
// ============================================================
class ParadoxManifestation extends Fighter {
  constructor(x, y, energyMax) {
    super(x, y, '#aa66ff', 'sword',
      { left: null, right: null, jump: null, attack: null, shield: null, ability: null, super: null },
      true, 'hard');
    this.name      = 'PARADOX';
    this.isMinion  = true;
    this.isAlly    = true;
    this.isParadoxManifest = true;
    this.w = 32; this.h = 62;
    this.health = 20000; this.maxHealth = 20000; // damage is converted to energy drain, never death
    this.lives = 1;
    this.kbResist = 0.6;
    this.playerNum = 97;
    this._teamId   = 1;
    this.energyMax = energyMax || 100;
    this.energy    = this.energyMax;
    this._attackCd   = 40;
    this._specialCd  = 260;
    this._wingAngle  = 0;
    this._auraPhase  = 0;
    this._hoverTime  = 0;
    this._flyVy      = 0;
    this._trailPts   = [];
    this._trailTimer = 0;
    this._aaTarget   = null;
    this._lastHealth = this.health;
    this._collapsed  = false;
    this._blastRings = [];
    // Occupy a slice of the player's fragment output while the projection holds
    const p1 = (typeof players !== 'undefined' && Array.isArray(players)) ? players[0] : null;
    if (p1) p1._pdxManifestHold = true;
  }

  respawn()       { this.health = 0; }
  useSuper()      {}
  activateSuper() {}
  checkPlatform() {} // the manifestation flies — phases through surfaces

  _frac() { return Math.max(0, this.energy / this.energyMax); }

  collapse() {
    if (this._collapsed) return;
    this._collapsed = true;
    this.health = 0;
    const p1 = (typeof players !== 'undefined' && Array.isArray(players)) ? players[0] : null;
    if (p1) p1._pdxManifestHold = false;
    if (typeof spawnParticles === 'function') {
      spawnParticles(this.cx(), this.y + this.h / 2, '#cc88ff', 26);
      spawnParticles(this.cx(), this.y + this.h / 2, '#ffffff', 12);
    }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 8);
    if (typeof storyFightSubtitle !== 'undefined' && typeof storyModeActive !== 'undefined' && storyModeActive) {
      storyFightSubtitle = { text: 'The manifestation collapsed. Your full output returns. Alone — but whole.', timer: 300, maxTimer: 300, color: '#ffffff' };
    }
  }

  update() {
    if (this._collapsed) return;
    if (this.health <= 0) { this.collapse(); return; }
    if (typeof activeCinematic !== 'undefined' && activeCinematic) return;

    // Damage taken burns energy instead of form
    if (this.health < this._lastHealth) {
      this.energy -= (this._lastHealth - this.health) * 0.003;
      this.health = this.maxHealth;
    }
    this._lastHealth = this.health;

    // Passive projection cost — spending something just by standing there
    this.energy -= 0.002;
    if (this.energy <= 0) { this.collapse(); return; }

    this._wingAngle += 0.09;
    this._auraPhase += 0.04;
    this._hoverTime += 0.03;
    if (this._attackCd  > 0) this._attackCd--;
    if (this._specialCd > 0) this._specialCd--;

    // Trail
    this._trailTimer++;
    if (this._trailTimer >= 5) {
      this._trailTimer = 0;
      this._trailPts.unshift({ x: this.cx(), y: this.y + this.h * 0.4 });
      if (this._trailPts.length > 12) this._trailPts.pop();
    }

    // Interference rings (special)
    for (let i = this._blastRings.length - 1; i >= 0; i--) {
      const ring = this._blastRings[i];
      ring.r    += 8;
      ring.alpha = Math.max(0, ring.alpha - 0.03);
      if (!ring._hit && ring.r > 40 && typeof dealDamage === 'function') {
        ring._hit = true;
        if (this._aaTarget && this._aaTarget.health > 0 &&
            Math.hypot(this._aaTarget.cx() - this.cx(), (this._aaTarget.y + this._aaTarget.h / 2) - (this.y + this.h / 2)) < ring.maxR * 0.9) {
          dealDamage(this, this._aaTarget, 30, 10);
        }
      }
      if (ring.alpha <= 0) this._blastRings.splice(i, 1);
    }

    // Acquire Absolute Axiom
    if (!this._aaTarget || this._aaTarget.health <= 0) {
      this._aaTarget = (typeof minions !== 'undefined' && Array.isArray(minions))
        ? minions.find(m => m.isAbsoluteAxiom && m.health > 0) || null : null;
    }
    if (!this._aaTarget) return;

    this.target = this._aaTarget;
    this.facing = Math.sign(this._aaTarget.cx() - this.cx()) || 1;

    const dx     = this._aaTarget.cx() - this.cx();
    const dy     = (this._aaTarget.y + this._aaTarget.h / 2) - (this.y + this.h / 2);
    const toDist = Math.hypot(dx, dy) || 1;
    const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
    const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;

    // Hover orbit around the boss
    const orbitM = Math.min(1, toDist / 140);
    const hoverX = this._aaTarget.cx() + Math.sin(this._hoverTime * 0.52) * 66 * orbitM;
    const hoverY = (this._aaTarget.y + this._aaTarget.h / 2) - 85 + Math.sin(this._hoverTime * 0.76) * 16 * orbitM;
    const clampX = Math.max(22 + this.w / 2, Math.min(GW - this.w / 2 - 22, hoverX));
    const clampY = Math.max(8 + this.h / 2, Math.min(GH * 0.88 - this.h / 2, hoverY));
    const errX   = clampX - this.cx();
    const errY   = clampY - (this.y + this.h / 2);
    const eDist  = Math.hypot(errX, errY) || 1;
    const spd    = Math.min(18, eDist);
    this.vx     = (errX / eDist) * spd;
    this._flyVy = (errY / eDist) * spd;

    this.vy = this._flyVy - 0.65;
    super.update();

    this.y = Math.max(8, Math.min(GH * 0.88 - this.h, this.y));
    this.x = Math.max(18, Math.min(GW - this.w - 18, this.x));

    // Melee strike — costs energy (the fuel is Paradox's own)
    if (toDist < 130 && this._attackCd <= 0 && typeof dealDamage === 'function') {
      dealDamage(this, this._aaTarget, 12, 6);
      this.energy   -= 0.3;
      this._attackCd = 46;
      if (typeof spawnParticles === 'function') spawnParticles(this.cx(), this.y + this.h / 2, '#bb77ff', 8);
    }

    // Special: interference burst — expensive, big radiation deposit
    if (this._specialCd <= 0 && this.energy > 15) {
      this._blastRings.push({ r: 0, maxR: 190, alpha: 1.0, _hit: false });
      this.energy    -= 2;
      this._specialCd = 300;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 5);
      if (typeof spawnParticles === 'function') spawnParticles(this.cx(), this.y + this.h / 2, '#9944ff', 16);
    }
  }

  draw() {
    if (this._collapsed || this.health <= 0) return;
    if (typeof ctx === 'undefined') return;

    const frac  = this._frac();
    const vis   = 0.30 + 0.70 * frac; // the manifestation thins as it spends itself
    const cx    = this.cx();
    const headY = this.y + 11;
    const cy    = this.y + this.h * 0.44;
    const t     = this._wingAngle;

    ctx.save();
    ctx.globalAlpha = vis;

    // Interference rings
    for (const ring of this._blastRings) {
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(170,100,255,${ring.alpha * 0.6})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Movement trail
    for (let i = 0; i < this._trailPts.length; i++) {
      const tp = this._trailPts[i];
      const a  = ((this._trailPts.length - i) / this._trailPts.length) * 0.24 * vis;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 6 - i * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150,70,255,${a})`;
      ctx.fill();
    }

    // Outer aura
    const farR = 70 + Math.sin(this._auraPhase * 0.4) * 9;
    const aG = ctx.createRadialGradient(cx, cy, 0, cx, cy, farR);
    aG.addColorStop(0, `rgba(150,60,255,${0.13 * vis})`);
    aG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aG;
    ctx.beginPath(); ctx.arc(cx, cy, farR, 0, Math.PI * 2); ctx.fill();

    // Wings — a single translucent pair; less substantial than Paradox in life
    ctx.fillStyle   = `rgba(140,70,240,${0.5 * vis})`;
    ctx.strokeStyle = `rgba(190,130,255,${0.45 * vis})`;
    ctx.lineWidth   = 0.8;
    ctx.shadowColor = 'rgba(160,80,255,0.6)';
    ctx.shadowBlur  = 10;
    const wave = Math.sin(t * 0.9) * 11;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * 26, cy - wave * 0.5, 30, 12, side * 0.22, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }

    // Body — glowing purple stickman, translucent at the edges
    ctx.strokeStyle = '#aa66ff';
    ctx.lineWidth   = 4.5;
    ctx.shadowColor = 'rgba(160,80,255,0.9)';
    ctx.shadowBlur  = 20;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    ctx.beginPath(); ctx.arc(cx, headY, 10, 0, Math.PI * 2); ctx.stroke();
    const torsoY = headY + 10;
    ctx.beginPath(); ctx.moveTo(cx, torsoY); ctx.lineTo(cx, torsoY + 24); ctx.stroke();
    const armY  = torsoY + 9;
    const aWave = Math.sin(t * 0.55) * 5;
    ctx.beginPath();
    ctx.moveTo(cx - 20, armY + 5 + aWave); ctx.lineTo(cx, armY); ctx.lineTo(cx + 20, armY + 5 - aWave);
    ctx.stroke();
    const legY  = torsoY + 24;
    const lWave = Math.sin(t * 0.42) * 4;
    ctx.beginPath();
    ctx.moveTo(cx - 12, legY + 22 + lWave); ctx.lineTo(cx, legY); ctx.lineTo(cx + 12, legY + 22 - lWave);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Energy bar — what remains of the fuel
    const bw = 36, bh = 3;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx - bw / 2, this.y - 10, bw, bh);
    ctx.fillStyle = '#bb77ff';
    ctx.fillRect(cx - bw / 2, this.y - 10, bw * frac, bh);
    ctx.restore();
  }
}
