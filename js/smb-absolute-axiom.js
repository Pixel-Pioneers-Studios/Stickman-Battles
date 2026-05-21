'use strict';
// smb-absolute-axiom.js — Absolute Axiom: God + Kernel merged. Final secret boss.
// Extends God (defined in smb-god.js). Load after smb-smk2-class.js.

// ── Death tracking ──────────────────────────────────────────────────────────
function _checkAbsoluteAxiomDeathHook() {
  if (!window._absoluteAxiomWasAlive) return;
  const alive = Array.isArray(minions) && minions.some(m => m.isAbsoluteAxiom && m.health > 0);
  if (!alive) {
    window._absoluteAxiomWasAlive = false;
    _onAbsoluteAxiomDefeated();
  }
}

function _onAbsoluteAxiomDefeated() {
  if (typeof unlockAchievement === 'function') unlockAchievement('absolute_axiom_slayer');
  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 60);
  if (typeof CinFX !== 'undefined') {
    CinFX.flash('#ff6600', 0.9, 30);
    CinFX.flash('#ffffff', 0.7, 45);
  }
  const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
  const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
  if (typeof spawnParticles === 'function') {
    for (let i = 0; i < 8; i++) {
      spawnParticles(GW * 0.1 + Math.random() * GW * 0.8, GH * 0.1 + Math.random() * GH * 0.8, '#ff6600', 18);
      spawnParticles(GW * 0.1 + Math.random() * GW * 0.8, GH * 0.1 + Math.random() * GH * 0.8, '#ffcc00', 12);
    }
  }
  if (typeof _showAbsoluteAxiomDefeatCard === 'function') _showAbsoluteAxiomDefeatCard();
}

function _showAbsoluteAxiomDefeatCard() {
  setTimeout(() => {
    if (document.getElementById('_aaDefeatedCard')) return;
    const div = document.createElement('div');
    div.id = '_aaDefeatedCard';
    div.style.cssText = 'position:fixed;inset:0;z-index:99997;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;animation:_aafadeIn 0.5s ease;';
    div.innerHTML = `<style>@keyframes _aafadeIn{from{opacity:0}to{opacity:1}}</style>
      <div style="text-align:center;color:#fff;font-family:serif;padding:40px;">
        <div style="font-size:0.9rem;letter-spacing:4px;color:#ff6600;margin-bottom:12px;">YOU HAVE DEFEATED</div>
        <div style="font-size:3.2rem;font-weight:900;color:#ff4400;text-shadow:0 0 40px #ff2200,0 0 80px #ff1100;letter-spacing:2px;">ABSOLUTE AXIOM</div>
        <div style="font-size:0.85rem;color:#aaa;margin-top:16px;line-height:1.8;">God. Architect. The Kernel.<br>Everything it was — and you stood in its way.</div>
        <div style="margin-top:30px;font-size:0.8rem;color:#666;">[ Click to continue ]</div>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', () => { div.remove(); });
    setTimeout(() => { if (div.parentNode) div.remove(); }, 12000);
  }, 800);
}

// ── Absolute Axiom ──────────────────────────────────────────────────────────
class AbsoluteAxiom extends God {
  constructor(x, y) {
    super(x, y);

    this.name            = 'ABSOLUTE AXIOM';
    this.isAbsoluteAxiom = true;
    this.isGod           = false; // prevent normal God death handler
    this.w               = 34;
    this.h               = 66;

    // Override stats
    this._phase      = 2; // always use God's phase-2 movement system
    this.health      = 1000000;
    this.maxHealth   = 1000000;
    this.dmgMult     = 4.5;
    this.kbBonus     = 1.3;
    this.kbResist    = 0.88;
    this._attackCd   = 50;
    this._specialCd  = 180;
    this._dashCd     = 45;

    // Internal phase tracking
    this._aaPhase        = 1; // 1→2 at 70%, 2→3 at 35%
    this._phase2Fired    = false;
    this._phase3Fired    = false;
    this._phase3SpeedMod = 1;

    // Checkpoint system (every 200K dmg = 800/600/400/200/0K HP remaining)
    this._checkpointThresholds = [800000, 600000, 400000, 200000, 100000];
    this._checkpointsFired     = new Set();
    this._checkpointQtePending = false;

    // Portal invincibility: immune once below 100K until 5 portal allies are active
    this._portalInvincible = false;
    this._portalPhaseAnnounced = false;

    // Dimension punch state
    this._dimPunchCd = 0;

    // Pattern detection
    this._playerActions  = [];   // ring buffer, last 12 tagged actions
    this._counterStrat   = 'normal';
    this._stratTimer     = 0;

    // Active effect state
    this._kernelPulseRings = [];
    this._voidSpears       = [];
    this._kernelBeam       = null;  // { timer, maxTimer, y }
    this._singularity      = null;  // { x, y, timer, maxTimer, pullPhase }
    this._temporalActive   = false;
    this._temporalTimer    = 0;
    this._absoluteStrike   = null;  // { timer, passCount, vx }
    this._columnBarrage    = [];
    this._aaNova           = [];    // dark nova projectiles
    this._shatterTimer     = 0;

    // Visual
    this._aaAuraPhase = 0;
    this._kernelPulse = 0;
    this._crackPulse  = 0;
    this._wingEmbers  = [];
    this._trailColor  = '#330000'; // override God's trail color

    // Re-init animation timers (override God's white values)
    this._haloAngles = [0, Math.PI / 3, Math.PI * 2 / 3];
  }

  // Block damage while portal-invincible
  receiveDamage(dmg) {
    if (this._portalInvincible) {
      if (typeof spawnParticles === 'function') spawnParticles(this.cx(), this.cy(), '#8800ff', 5);
      return;
    }
    this.health = Math.max(0, this.health - dmg);
  }

  respawn()       { this.health = 0; }
  useSuper()      {}
  activateSuper() {}
  checkPlatform() {}

  // ── Per-frame update ──────────────────────────────────────────────────────
  update() {
    if (this.health <= 0) return;
    if (typeof activeCinematic !== 'undefined' && activeCinematic) return;

    this._aaAuraPhase += 0.042;
    this._wingAngle   += 0.07;
    this._hoverTime   += 0.030 * this._phase3SpeedMod;
    this._crossAngle  += 0.008;
    this._kernelPulse += 0.14;
    this._crackPulse  += 0.06;
    this._stratTimer++;

    // Phase transitions
    const hpFrac = this.health / this.maxHealth;
    if (!this._phase2Fired && hpFrac <= 0.70) {
      this._phase2Fired = true;
      this._aaPhase = 2;
      this._specialCd = 140;
      this._dashCd    = 38;
      if (typeof showBossDialogue === 'function') showBossDialogue('You\'re stronger than I expected. Let me adjust.', 180);
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 20);
      if (typeof CinFX !== 'undefined') CinFX.flash('#ff4400', 0.35, 14);
    }
    if (!this._phase3Fired && hpFrac <= 0.35) {
      this._phase3Fired = true;
      this._aaPhase = 3;
      this._specialCd     = 90;
      this._dashCd        = 28;
      this._phase3SpeedMod = 1.35;
      if (typeof showBossDialogue === 'function') showBossDialogue('ABSOLUTE POWER. NOW.', 220);
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 35);
      if (typeof CinFX !== 'undefined') {
        CinFX.flash('#ffffff', 0.8, 20);
        CinFX.flash('#ff2200', 0.5, 35);
      }
      if (typeof spawnParticles === 'function') spawnParticles(this.cx(), this.cy(), '#ff4400', 40);
    }

    // Checkpoint triggers
    for (const threshold of this._checkpointThresholds) {
      if (!this._checkpointsFired.has(threshold) && this.health <= threshold) {
        this._checkpointsFired.add(threshold);
        this._fireCheckpoint(threshold);
      }
    }

    // Portal invincibility once below 100K HP
    if (!this._portalPhaseAnnounced && this.health <= 100000) {
      this._portalPhaseAnnounced = true;
      this._portalInvincible = true;
      if (typeof showBossDialogue === 'function') showBossDialogue('You cannot kill me alone. Summon your forces… or perish.', 300);
      if (typeof CinFX !== 'undefined') { CinFX.flash('#8800ff', 0.6, 20); CinFX.flash('#000000', 0.5, 35); }
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 40);
    }
    // Remove portal invincibility when enough allies are active
    if (this._portalInvincible) {
      const allyCount = (typeof minions !== 'undefined' ? minions : []).filter(m => m.isAAPortalAlly && m.health > 0).length;
      if (allyCount >= 3) this._portalInvincible = false;
    }

    if (this._dimPunchCd > 0) this._dimPunchCd--;

    // Update active effects
    this._updateKernelPulse();
    this._updateVoidSpears();
    this._updateKernelBeam();
    this._updateSingularity();
    this._updateAbsoluteStrike();
    this._updateColumnBarrage();
    this._updateAANova();
    if (this._shatterTimer > 0) {
      this._shatterTimer--;
      if (this._shatterTimer === 0 && typeof tfGravityInverted !== 'undefined') tfGravityInverted = false;
    }
    if (this._temporalActive) {
      this._temporalTimer--;
      if (this._temporalTimer <= 0) {
        this._temporalActive = false;
        if (typeof slowMotion !== 'undefined') slowMotion = 1.0;
      }
    }

    // Pattern analysis every 80 frames
    if (this._stratTimer >= 80) {
      this._stratTimer = 0;
      this._analyzePattern();
    }

    // Standard God movement + dash + attack
    this._wingAngle  += 0;
    this._auraPhase   = this._aaAuraPhase;
    if (this._attackCd > 0) this._attackCd--;
    if (this._specialCd > 0) this._specialCd--;
    if (this._angelCooldown > 0) this._angelCooldown--;

    this._trailTimer++;
    if (this._trailTimer >= 3) {
      this._trailTimer = 0;
      this._trailPoints.unshift({ x: this.cx(), y: this.y + this.h * 0.38 });
      if (this._trailPoints.length > 22) this._trailPoints.pop();
    }

    // Wing ember particles
    if (Math.random() < 0.3) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this._wingEmbers.push({
        x: this.cx() + side * (30 + Math.random() * 50),
        y: this.y + this.h * 0.35 + (Math.random() - 0.5) * 20,
        vx: side * (0.5 + Math.random() * 1.5),
        vy: -(0.5 + Math.random() * 1.2),
        life: 20 + Math.floor(Math.random() * 15),
        r: 2 + Math.random() * 2.5,
      });
    }
    for (let i = this._wingEmbers.length - 1; i >= 0; i--) {
      const e = this._wingEmbers[i];
      e.x += e.vx; e.y += e.vy; e.life--;
      if (e.life <= 0) this._wingEmbers.splice(i, 1);
    }

    this._updateColumns();
    this._updateNova();
    this._updateSmiteRings();
    if (this._smiteTimer > 0) this._smiteTimer--;

    // Find target
    let target = null, minDist = Infinity;
    for (const p of this._godTargetPool()) {
      if (p === this || p.health <= 0 || p.godmode === true) continue;
      if (p._teamId !== undefined && this._teamId !== undefined && p._teamId === this._teamId) continue;
      const d = Math.hypot(p.cx() - this.cx(), (p.y + p.h / 2) - (this.y + this.h / 2));
      if (d < minDist) { minDist = d; target = p; }
    }
    if (!target) return;
    this.target = target;
    this.facing = Math.sign(target.cx() - this.cx()) || 1;

    // Track player action for pattern detection
    this._logPlayerAction(target);

    // Flight movement (God-style, phase3 faster)
    const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
    const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
    const flySpd = 30 * this._phase3SpeedMod;

    if (this._smiteTimer > 0) {
      this.vx *= 0.85; this._flyVy = 14;
    } else if (this._absoluteStrike) {
      // Absolute strike overrides movement
    } else {
      const rawHoverX = target.cx() + Math.sin(this._hoverTime * 0.45) * 48;
      const rawHoverY = (target.y + target.h / 2) - 95 + Math.sin(this._hoverTime * 0.7) * 16;
      const hoverX = Math.max(20, Math.min(GW - 20, rawHoverX));
      const hoverY = Math.max(10, Math.min(GH * 0.85, rawHoverY));
      const errX = hoverX - this.cx();
      const errY = hoverY - (this.y + this.h / 2);
      const d    = Math.hypot(errX, errY) || 1;
      const spd  = Math.min(flySpd, d);

      if (this._dashCd <= 0 && d > 80) {
        const dashSpd    = 85 * this._phase3SpeedMod;
        this._dashVx     = (errX / d) * dashSpd;
        this._dashVy     = (errY / d) * dashSpd;
        this._dashFrames = 5;
        this._dashCd     = Math.ceil(45 / this._phase3SpeedMod);
      }
      if (this._dashCd > 0) this._dashCd--;
      if (this._dashFrames > 0) {
        this._dashFrames--;
        this.vx = this._dashVx; this._flyVy = this._dashVy;
      } else {
        this.vx = (errX / d) * spd; this._flyVy = (errY / d) * spd;
      }
    }

    this.vy = this._flyVy - 0.65;
    super.update(); // Fighter.update() for physics

    this.y = Math.max(8, Math.min(GH * 0.88 - this.h, this.y));
    this.x = Math.max(18, Math.min(GW - this.w - 18, this.x));

    // Melee strike
    if (minDist < 155 && this._attackCd <= 0 && typeof dealDamage === 'function') {
      dealDamage(this, target, 220, 10);
      this._attackCd = Math.ceil(38 / this._phase3SpeedMod);
    }

    // Special attacks
    if (this._specialCd <= 0) this._pickSpecial(target);
  }

  // ── Pattern analysis ───────────────────────────────────────────────────────
  _logPlayerAction(target) {
    if (!target) return;
    let action = 'idle';
    if (target.attackTimer > 0)  action = 'attack';
    else if (target.shielding)   action = 'shield';
    else if (target.vy < -3)     action = 'jump';
    else if (Math.abs(target.vx) > 8) action = 'run';
    this._playerActions.push(action);
    if (this._playerActions.length > 12) this._playerActions.shift();
  }

  _analyzePattern() {
    const acts = this._playerActions;
    const count = a => acts.filter(x => x === a).length;
    const atk = count('attack'), shld = count('shield'), jmp = count('jump'), run = count('run');
    if (atk >= 5)        this._counterStrat = 'punish_attacker';
    else if (shld >= 4)  this._counterStrat = 'pierce_shield';
    else if (jmp >= 5)   this._counterStrat = 'punish_jumper';
    else if (run >= 5)   this._counterStrat = 'chase_runner';
    else                 this._counterStrat = 'normal';
  }

  // ── Special attack selection ───────────────────────────────────────────────
  _pickSpecial(target) {
    const phase = this._aaPhase;
    const strat = this._counterStrat;
    const roll  = Math.random();

    // Strat-override first
    if (strat === 'punish_attacker' && roll < 0.55) {
      this._doKernelBeam(target); this._setCd(); return;
    }
    if (strat === 'pierce_shield' && roll < 0.55) {
      this._doAbsoluteStrike(target); this._setCd(); return;
    }
    if (strat === 'punish_jumper' && roll < 0.55) {
      this._doVoidRain(target); this._setCd(); return;
    }
    if (strat === 'chase_runner' && roll < 0.55) {
      this._doSingularity(target); this._setCd(); return;
    }

    // Phase-weighted random pool
    const r = Math.random();
    if (phase === 1) {
      if (r < 0.22)      this._doDivineColumn(target);
      else if (r < 0.42) this._doKernelPulse();
      else if (r < 0.60) this._doRadiantNova();
      else if (r < 0.76) this._doHolySmite();
      else if (r < 0.88) this._doVoidRain(target);
      else               this._doAngelFleet(target);
    } else if (phase === 2) {
      if (r < 0.16)      this._doDivineColumn(target);
      else if (r < 0.30) this._doKernelPulse();
      else if (r < 0.42) this._doKernelBeam(target);
      else if (r < 0.54) this._doVoidRain(target);
      else if (r < 0.64) this._doAbsoluteStrike(target);
      else if (r < 0.74) this._doTemporalCrush();
      else if (r < 0.84) this._doSingularity(target);
      else if (r < 0.92) this._doHolySmite();
      else               this._doColumnBarrage(target);
    } else { // phase 3
      if (r < 0.10)      this._doDimensionPunch(target);
      else if (r < 0.20) this._doDimShattering();
      else if (r < 0.30) this._doColumnBarrage(target);
      else if (r < 0.34) this._doAbsoluteStrike(target);
      else if (r < 0.44) this._doKernelBeam(target);
      else if (r < 0.54) this._doSingularity(target);
      else if (r < 0.63) this._doTemporalCrush();
      else if (r < 0.72) this._doVoidRain(target);
      else if (r < 0.80) this._doKernelPulse();
      else if (r < 0.88) this._doRadiantNova();
      else               this._doAngelFleet(target);
    }
    this._setCd();
  }

  _setCd() {
    this._specialCd = Math.ceil((this._aaPhase === 3 ? 80 : this._aaPhase === 2 ? 130 : 170) / this._phase3SpeedMod);
  }

  // ── Attacks ───────────────────────────────────────────────────────────────

  // Kernel Pulse — 4 expanding damage rings from chest
  _doKernelPulse() {
    for (let i = 0; i < 4; i++) {
      this._kernelPulseRings.push({
        r: 0, maxR: 60 + i * 70, delay: i * 12,
        alpha: 0.9, hitSet: new Set(),
      });
    }
    if (typeof spawnParticles === 'function') spawnParticles(this.cx(), this.cy(), '#ffcc00', 18);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
  }

  _updateKernelPulse() {
    const cx = this.cx(), cy = this.y + this.h * 0.38;
    for (let i = this._kernelPulseRings.length - 1; i >= 0; i--) {
      const ring = this._kernelPulseRings[i];
      if (ring.delay > 0) { ring.delay--; continue; }
      ring.r     += (ring.maxR - ring.r) * 0.09;
      ring.alpha  = Math.max(0, ring.alpha - 0.018);
      if (typeof dealDamage === 'function') {
        for (const p of this._godTargetPool()) {
          if (p === this || p.health <= 0 || ring.hitSet.has(p)) continue;
          if (p._teamId !== undefined && this._teamId !== undefined && p._teamId === this._teamId) continue;
          const d = Math.hypot(p.cx() - cx, (p.y + p.h / 2) - cy);
          if (d >= ring.r - 18 && d <= ring.r + 18) {
            dealDamage(this, p, 140, 12);
            ring.hitSet.add(p);
          }
        }
      }
      if (ring.alpha <= 0) this._kernelPulseRings.splice(i, 1);
    }
  }

  // Void Rain — 8 spears fall from above in staggered pattern
  _doVoidRain(target) {
    if (!target) return;
    const base = target.cx();
    const GH   = typeof GAME_H !== 'undefined' ? GAME_H : 520;
    for (let i = 0; i < 8; i++) {
      const offset = (i - 3.5) * 55 + (Math.random() - 0.5) * 20;
      this._voidSpears.push({
        x: base + offset, y: -20, vy: 8 + Math.random() * 3,
        delay: i * 8 + Math.floor(Math.random() * 6),
        hit: false, impactY: GH,
      });
    }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 6);
  }

  _updateVoidSpears() {
    const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
    for (let i = this._voidSpears.length - 1; i >= 0; i--) {
      const sp = this._voidSpears[i];
      if (sp.delay > 0) { sp.delay--; continue; }
      sp.y += sp.vy;
      if (!sp.hit && typeof dealDamage === 'function') {
        for (const p of this._godTargetPool()) {
          if (p === this || p.health <= 0) continue;
          if (p._teamId !== undefined && this._teamId !== undefined && p._teamId === this._teamId) continue;
          if (Math.abs(p.cx() - sp.x) < 22 && Math.abs((p.y + p.h / 2) - sp.y) < 28) {
            dealDamage(this, p, 160, 16);
            sp.hit = true;
          }
        }
      }
      if (sp.y > GH + 20 || sp.hit) this._voidSpears.splice(i, 1);
    }
  }

  // Temporal Crush — slow everything except AA for 5 seconds
  _doTemporalCrush() {
    if (this._temporalActive) return;
    this._temporalActive = true;
    this._temporalTimer  = 300;
    if (typeof slowMotion !== 'undefined') slowMotion = 0.12;
    if (typeof showBossDialogue === 'function') showBossDialogue('Time bends. You do not.', 200);
    if (typeof CinFX !== 'undefined') CinFX.flash('#4488ff', 0.4, 16);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
    // AA itself continues at normal speed — override slowMotion for self
    // (slowMotion affects physics globally, but we override it each frame)
  }

  // Kernel Beam — horizontal laser from chest
  _doKernelBeam(target) {
    if (this._kernelBeam) return;
    this._kernelBeam = { timer: 0, maxTimer: 80, targetY: target ? (target.y + target.h / 2) : this.cy() };
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
    if (typeof showBossDialogue === 'function') showBossDialogue('Burn.', 120);
  }

  _updateKernelBeam() {
    if (!this._kernelBeam) return;
    const beam = this._kernelBeam;
    beam.timer++;
    const GW  = typeof GAME_W !== 'undefined' ? GAME_W : 900;
    const beamY = this.y + this.h * 0.38;

    if (beam.timer % 3 === 0 && typeof dealDamage === 'function') {
      for (const p of this._godTargetPool()) {
        if (p === this || p.health <= 0) continue;
        if (p._teamId !== undefined && this._teamId !== undefined && p._teamId === this._teamId) continue;
        // Beam travels in facing direction
        const bx = this.cx();
        if (this.facing > 0 ? p.cx() > bx : p.cx() < bx) {
          if (Math.abs((p.y + p.h / 2) - beamY) < 28) {
            dealDamage(this, p, 28, 4); // continuous burn: lower per-hit, high frequency
          }
        }
      }
    }
    if (typeof spawnParticles === 'function' && beam.timer % 5 === 0) {
      const tx = this.facing > 0 ? this.cx() + 200 : this.cx() - 200;
      spawnParticles(tx, beamY, '#ffaa00', 4);
    }
    if (beam.timer >= beam.maxTimer) this._kernelBeam = null;
  }

  // Singularity — pull all targets to center, then detonate
  _doSingularity(target) {
    if (this._singularity) return;
    const sx = target ? target.cx() : this.cx();
    const sy = target ? target.y + target.h / 2 : this.cy();
    this._singularity = { x: sx, y: sy, timer: 0, maxTimer: 180, r: 0, detonated: false };
    if (typeof showBossDialogue === 'function') showBossDialogue('Collapse.', 180);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 8);
  }

  _updateSingularity() {
    if (!this._singularity) return;
    const sing = this._singularity;
    sing.timer++;
    sing.r = Math.min(80, sing.timer * 0.6);

    if (sing.timer < 140 && typeof dealDamage === 'function') {
      // Pull phase
      for (const p of this._godTargetPool()) {
        if (p === this || p.health <= 0) continue;
        if (p._teamId !== undefined && this._teamId !== undefined && p._teamId === this._teamId) continue;
        const dx = sing.x - p.cx(), dy = sing.y - (p.y + p.h / 2);
        const d  = Math.hypot(dx, dy) || 1;
        if (d < 300) {
          const pull = (1 - d / 300) * 4.5;
          p.vx += (dx / d) * pull;
          p.vy += (dy / d) * pull;
        }
      }
    }

    if (sing.timer === 140 && !sing.detonated) {
      sing.detonated = true;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 30);
      if (typeof CinFX !== 'undefined') CinFX.flash('#ffffff', 0.65, 14);
      if (typeof dealDamage === 'function') {
        for (const p of this._godTargetPool()) {
          if (p === this || p.health <= 0) continue;
          if (p._teamId !== undefined && this._teamId !== undefined && p._teamId === this._teamId) continue;
          if (Math.hypot(p.cx() - sing.x, (p.y + p.h / 2) - sing.y) < 200) {
            dealDamage(this, p, 280, 30);
          }
        }
      }
      if (typeof spawnParticles === 'function') {
        for (let i = 0; i < 5; i++) spawnParticles(sing.x + (Math.random()-0.5)*60, sing.y + (Math.random()-0.5)*60, '#ff6600', 20);
      }
    }

    if (sing.timer >= sing.maxTimer) this._singularity = null;
  }

  // Absolute Strike — 3-pass gap-close combo, each pass unique
  _doAbsoluteStrike(target) {
    if (this._absoluteStrike || !target) return;
    this._absoluteStrike = { timer: 0, pass: 0, maxPasses: 3, target, pausing: 0 };
    if (typeof showBossDialogue === 'function') showBossDialogue('Absolute.', 100);
  }

  _updateAbsoluteStrike() {
    if (!this._absoluteStrike) return;
    const st = this._absoluteStrike;
    st.timer++;

    if (st.pausing > 0) { st.pausing--; return; }

    const target = st.target;
    if (!target || target.health <= 0) { this._absoluteStrike = null; return; }

    const dx = target.cx() - this.cx();
    const dy = (target.y + target.h / 2) - (this.y + this.h / 2);
    const d  = Math.hypot(dx, dy) || 1;

    if (d > 60) {
      // Rush toward target
      this.vx = (dx / d) * (32 * this._phase3SpeedMod);
      this._flyVy = (dy / d) * (32 * this._phase3SpeedMod);
    } else {
      // Impact
      if (typeof dealDamage === 'function') {
        const dmg  = [280, 220, 320][st.pass] || 260;
        const kb   = [20,  14,  28][st.pass]  || 18;
        dealDamage(this, target, dmg, kb);
      }
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 22 + st.pass * 6);
      if (typeof CinFX !== 'undefined') CinFX.flash(['#ff8800','#ff4400','#ffffff'][st.pass] || '#ff8800', 0.38, 10);
      if (typeof spawnParticles === 'function') spawnParticles(target.cx(), target.cy(), '#ff6600', 20);
      st.pass++;
      if (st.pass >= st.maxPasses) {
        this._absoluteStrike = null;
      } else {
        // Bounce back before next pass
        this.vx = -this.facing * 20;
        this._flyVy = -8;
        st.pausing = 22;
      }
    }
  }

  // Column Barrage — 6 simultaneous columns
  _doColumnBarrage(target) {
    if (!target) return;
    const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
    const positions = [
      target.cx() - 200, target.cx() - 100, target.cx(),
      target.cx() + 100, target.cx() + 200,
      Math.random() * GW,
    ];
    for (const x of positions) {
      this._columnBarrage.push({ x, timer: 0, maxTimer: 80, hitDealt: false });
    }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
  }

  _updateColumnBarrage() {
    for (let i = this._columnBarrage.length - 1; i >= 0; i--) {
      const col = this._columnBarrage[i];
      col.timer++;
      if (!col.hitDealt && col.timer >= col.maxTimer - 8) {
        col.hitDealt = true;
        if (typeof dealDamage === 'function') {
          for (const p of this._godTargetPool()) {
            if (p === this || p.health <= 0) continue;
            if (p._teamId !== undefined && this._teamId !== undefined && p._teamId === this._teamId) continue;
            if (Math.abs(p.cx() - col.x) < 44) dealDamage(this, p, 200, 16);
          }
        }
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
        if (typeof spawnParticles === 'function') {
          const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
          spawnParticles(col.x, GH * 0.5, '#ff4400', 18);
        }
      }
      if (col.timer >= col.maxTimer + 30) this._columnBarrage.splice(i, 1);
    }
  }

  // AA Nova — dark void projectile burst
  _updateAANova() {
    const cx = this.cx(), cy = this.y + this.h / 2;
    for (let i = this._aaNova.length - 1; i >= 0; i--) {
      const b = this._aaNova[i];
      b.x += b.vx; b.y += b.vy; b.timer++;
      if (!b.hitDealt && typeof dealDamage === 'function') {
        for (const p of this._godTargetPool()) {
          if (p === this || p.health <= 0) continue;
          if (p._teamId !== undefined && this._teamId !== undefined && p._teamId === this._teamId) continue;
          if (Math.hypot(p.cx() - b.x, (p.y + p.h / 2) - b.y) < 24) {
            dealDamage(this, p, 120, 10);
            b.hitDealt = true;
          }
        }
      }
      if (b.timer >= b.maxTimer || b.hitDealt) this._aaNova.splice(i, 1);
    }
  }

  // Override radiant nova to use dark version
  _doRadiantNova() {
    const cx = this.cx(), cy = this.y + this.h / 2;
    const COUNT = this._aaPhase === 3 ? 18 : 12;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      this._aaNova.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * 6.5,
        vy: Math.sin(angle) * 6.5,
        timer: 0, maxTimer: 65, hitDealt: false,
      });
    }
    if (typeof spawnParticles === 'function') spawnParticles(cx, cy, '#ff4400', 18);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
  }

  // Dimension Shattering — brief gravity flip + screen crack + chaos
  _doDimShattering() {
    if (this._shatterTimer > 0) return;
    this._shatterTimer = 180;
    if (typeof tfGravityInverted !== 'undefined') tfGravityInverted = true;
    setTimeout(() => { if (typeof tfGravityInverted !== 'undefined') tfGravityInverted = false; }, 3000);
    if (typeof showBossDialogue === 'function') showBossDialogue('Reality is mine to rewrite.', 220);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 28);
    if (typeof CinFX !== 'undefined') {
      CinFX.flash('#8800ff', 0.5, 16);
      CinFX.flash('#000000', 0.4, 25);
    }
  }

  // ── Checkpoint ────────────────────────────────────────────────────────────
  _fireCheckpoint(threshold) {
    const label = Math.round((1000000 - threshold) / 1000) + 'K';
    if (typeof showBossDialogue === 'function') showBossDialogue(`You\'ve dealt ${label}K damage. The fracture deepens…`, 220);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 24);
    if (typeof CinFX !== 'undefined') CinFX.flash('#ffffff', 0.55, 18);
    if (typeof spawnParticles === 'function') {
      const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
      const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
      for (let i = 0; i < 6; i++) spawnParticles(GW * 0.1 + Math.random() * GW * 0.8, GH * 0.3 + Math.random() * GH * 0.4, '#cc00ff', 14);
    }
    // Trigger QTE if available
    if (typeof _startQTE === 'function') {
      const qteKey = `aa_checkpoint_${threshold}`;
      if (typeof activeCinematic === 'undefined' || !activeCinematic) {
        try {
          _startQTE({ id: qteKey, stages: 4, windowMs: 1800, successDmg: 60000, source: this });
        } catch(e) {}
      }
    }
  }

  // ── Dimension Punch ────────────────────────────────────────────────────────
  _doDimensionPunch(target) {
    if (!target || this._dimPunchCd > 0) return;
    if (window._aaDimPunchState && window._aaDimPunchState.active) return;
    this._dimPunchCd = 900; // 15s cooldown

    // Deal the launch hit
    if (typeof dealDamage === 'function') dealDamage(this, target, 350, 0);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 35);
    if (typeof CinFX !== 'undefined') { CinFX.flash('#8800ff', 0.7, 20); CinFX.flash('#000000', 0.6, 30); }
    if (typeof showBossDialogue === 'function') showBossDialogue('Feel the void between dimensions.', 200);

    // Activate the full-screen space travel overlay
    window._aaDimPunchState = {
      active: true,
      timer: 0,
      duration: 340,    // frames total
      returnAt: 280,    // when player "arrives back"
      targetRef: target,
      stars: Array.from({ length: 200 }, () => ({
        x: Math.random(), y: Math.random(),
        r: 0.5 + Math.random() * 2.5,
        speed: 0.2 + Math.random() * 1.4,
        col: ['#ffffff','#aaddff','#ffd4a8','#c8a8ff','#ffccaa'][Math.floor(Math.random() * 5)],
      })),
      planets: [
        { relX: 0.18, relY: 0.55, r: 38, col: '#2a4080', ringCol: '#8899bb', hasRing: true,  passFrame: 60  },
        { relX: 0.72, relY: 0.35, r: 26, col: '#803020', ringCol: null,      hasRing: false, passFrame: 110 },
        { relX: 0.42, relY: 0.70, r: 52, col: '#305040', ringCol: '#55aa66', hasRing: true,  passFrame: 160 },
        { relX: 0.85, relY: 0.60, r: 18, col: '#5530a0', ringCol: null,      hasRing: false, passFrame: 200 },
        { relX: 0.30, relY: 0.28, r: 44, col: '#604010', ringCol: '#aa8844', hasRing: true,  passFrame: 240 },
      ],
      stickmenFights: [
        { relX: 0.25, relY: 0.65, frame: 80  },
        { relX: 0.60, relY: 0.45, frame: 140 },
        { relX: 0.80, relY: 0.75, frame: 190 },
      ],
      ships: [
        { relX: 0.55, relY: 0.30, vx: 0.0012, vy: 0.0004, frame: 50  },
        { relX: 0.15, relY: 0.50, vx:-0.0008, vy: 0.0002, frame: 130 },
        { relX: 0.70, relY: 0.65, vx: 0.0006, vy:-0.0005, frame: 220 },
      ],
      asteroids: Array.from({ length: 18 }, (_, i) => ({
        relX: Math.random(), relY: Math.random(),
        r: 4 + Math.random() * 10,
        rot: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.0014,
        vy: (Math.random() - 0.5) * 0.0008,
        frame: 30 + Math.floor(Math.random() * 220),
      })),
      galaxies: [
        { relX: 0.08, relY: 0.15, rot: 0.4, frame: 20  },
        { relX: 0.90, relY: 0.80, rot: 1.2, frame: 170 },
      ],
    };
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  draw() {
    if (this.health <= 0) return;
    if (typeof ctx === 'undefined') return;

    const cx    = this.cx();
    const headY = this.y + 11;
    const cy    = this.y + this.h * 0.44;
    const t     = this._wingAngle;
    const hpFrac = this.health / this.maxHealth;
    const ph3   = this._aaPhase === 3;

    ctx.save();

    // ── Trail (dark ember) ────────────────────────────────────────────────
    for (let i = 0; i < this._trailPoints.length; i++) {
      const tp = this._trailPoints[i];
      const a  = ((this._trailPoints.length - i) / this._trailPoints.length) * 0.25;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 7 - i * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,40,0,${a})`;
      ctx.fill();
    }

    // ── Wing embers ────────────────────────────────────────────────────────
    for (const e of this._wingEmbers) {
      const ea = e.life / (20 + 15);
      ctx.globalAlpha = ea * 0.7;
      ctx.fillStyle   = Math.random() < 0.4 ? '#ff6600' : '#ffaa00';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Outer dark void aura ───────────────────────────────────────────────
    const farR    = (ph3 ? 130 : 100) + Math.sin(this._aaAuraPhase * 0.35) * 12;
    const farGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, farR);
    farGrad.addColorStop(0, ph3 ? 'rgba(200,30,0,0.14)' : 'rgba(150,20,0,0.10)');
    farGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, farR, 0, Math.PI * 2);
    ctx.fillStyle = farGrad; ctx.fill();

    // ── Void cross geometry (dark rays with ember tips) ───────────────────
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(this._crossAngle);
    const RAYS = 8;
    for (let r = 0; r < RAYS; r++) {
      const ang   = (r / RAYS) * Math.PI * 2;
      const rLen  = r % 2 === 0 ? 96 : 60;
      const pulse = rLen * (1 + Math.sin(t * 0.55 + r * 0.65) * 0.08);
      ctx.save(); ctx.rotate(ang);
      const rGrad = ctx.createLinearGradient(0, -6, 0, -pulse);
      rGrad.addColorStop(0,   'rgba(200,40,0,0.4)');
      rGrad.addColorStop(0.7, 'rgba(255,80,0,0.15)');
      rGrad.addColorStop(1,   'rgba(255,140,0,0)');
      ctx.fillStyle = rGrad;
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.lineTo(0, -pulse); ctx.lineTo(5, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // ── Fracture halo rings (broken ellipses) ─────────────────────────────
    ctx.save();
    for (let h = 0; h < 3; h++) {
      this._haloAngles[h] += 0.013 + h * 0.008;
      const ha    = this._haloAngles[h];
      const rx    = 32 + h * 8;
      const ry    = 8  + h * 2.5;
      const alpha = 0.65 - h * 0.12 + Math.sin(t * 1.1 + h * 1.4) * 0.1;
      ctx.save();
      ctx.translate(cx, headY - 5); ctx.rotate(ha);
      ctx.strokeStyle = h === 0 ? `rgba(255,80,0,${alpha})` : `rgba(200,40,0,${alpha * 0.8})`;
      ctx.lineWidth   = 2.5 - h * 0.4;
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 10;
      // Draw broken ellipse (3 arcs with gaps)
      for (let seg = 0; seg < 3; seg++) {
        const segStart = (seg / 3) * Math.PI * 2 + 0.25;
        const segEnd   = segStart + Math.PI * 2 / 3 - 0.5;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, segStart, segEnd); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // ── Obsidian wings (4 pairs, ember-edged) ─────────────────────────────
    const wScale = ph3 ? 1.35 : 1.0;
    for (let pair = 0; pair < 4; pair++) {
      const yOff      = (pair - 1.5) * 20;
      const spread    = (60 - pair * 7) * wScale;
      const thickness = (18 - pair * 2) * wScale;
      const flapSpd   = 0.72 + pair * 0.22;
      const wave      = Math.sin(t * flapSpd + pair * 0.95) * 14;
      const tilt      = 0.18 + pair * 0.1;

      for (const side of [-1, 1]) {
        // Wing body — dark void fill
        const wGrad = ctx.createRadialGradient(
          cx + side * spread * 0.35, cy + yOff - wave * 0.6, 0,
          cx + side * spread * 0.55, cy + yOff - wave, spread * 0.7
        );
        wGrad.addColorStop(0, `rgba(60,5,0,0.85)`);
        wGrad.addColorStop(0.6, `rgba(30,2,0,0.5)`);
        wGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle   = wGrad;
        ctx.strokeStyle = `rgba(220,60,0,0.5)`;
        ctx.lineWidth   = 1.2;
        ctx.shadowColor = '#cc2200'; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(cx + side * spread * 0.52, cy + yOff - wave, spread * 0.62, thickness, side * tilt, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Ember edge glow
        if (pair < 2) {
          ctx.fillStyle   = `rgba(255,80,0,0.22)`;
          ctx.shadowBlur  = 16;
          ctx.beginPath();
          ctx.ellipse(cx + side * (spread * 0.82), cy + yOff - wave - 7, spread * 0.22, thickness * 0.55, side * (tilt + 0.28), 0, Math.PI * 2);
          ctx.fill();
          // Crack lines on wing surface
          ctx.strokeStyle = `rgba(255,120,0,0.35)`;
          ctx.lineWidth   = 0.8;
          ctx.shadowBlur  = 6;
          for (let q = 0; q < 4; q++) {
            const qx1 = cx + side * (spread * 0.2 + q * spread * 0.14);
            const qy1 = cy + yOff - wave * 0.7;
            ctx.beginPath();
            ctx.moveTo(qx1, qy1);
            ctx.lineTo(qx1 + side * 8, qy1 + 12);
            ctx.stroke();
          }
        }
      }
    }

    // ── Void mantle ────────────────────────────────────────────────────────
    const mFlow = Math.sin(t * 0.38) * 16;
    const mDir  = -this.facing * 28;
    ctx.save();
    for (let m = 0; m < 3; m++) {
      const mA   = 0.22 - m * 0.06;
      const mOff = m * 9;
      ctx.fillStyle   = `rgba(80,10,0,${mA})`;
      ctx.shadowColor = 'rgba(180,30,0,0.5)'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 2);
      ctx.quadraticCurveTo(cx + mDir - mOff, cy + 22 + mFlow, cx + mDir * 1.6 - mOff, cy + 58 + mFlow * 0.7);
      ctx.quadraticCurveTo(cx + mDir * 0.6 - mOff, cy + 50 + mFlow, cx, cy + 34);
      ctx.quadraticCurveTo(cx + mDir * 0.6 + mOff, cy + 50 + mFlow, cx + mDir * 1.6 + mOff, cy + 58 + mFlow * 0.7);
      ctx.quadraticCurveTo(cx + mDir + mOff, cy + 22 + mFlow, cx + 16, cy - 2);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // ── Inner void radiance ────────────────────────────────────────────────
    const iR    = (ph3 ? 44 : 32) + Math.sin(this._aaAuraPhase * 1.1) * 5;
    const iGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, iR);
    iGrad.addColorStop(0, 'rgba(200,30,0,0.22)');
    iGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, iR, 0, Math.PI * 2);
    ctx.fillStyle = iGrad; ctx.fill();

    // ── Stickman body (obsidian with orange-crack limbs) ──────────────────
    ctx.strokeStyle = '#1a0800';
    ctx.lineWidth   = 6;
    ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 20;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Head
    ctx.beginPath(); ctx.arc(cx, headY, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0800'; ctx.fill(); ctx.stroke();

    // Torso
    const torsoY = headY + 12;
    ctx.beginPath(); ctx.moveTo(cx, torsoY); ctx.lineTo(cx, torsoY + 28); ctx.stroke();

    // Arms
    const armY    = torsoY + 10;
    const armWave = Math.sin(t * 0.48) * 6;
    ctx.beginPath();
    ctx.moveTo(cx - 24, armY + 6 + armWave);
    ctx.lineTo(cx, armY);
    ctx.lineTo(cx + 24, armY + 6 - armWave);
    ctx.stroke();

    // Legs
    const legY = torsoY + 28;
    const legW = Math.sin(t * 0.38) * 4;
    ctx.beginPath();
    ctx.moveTo(cx, legY); ctx.lineTo(cx - 15, legY + 24 + legW);
    ctx.moveTo(cx, legY); ctx.lineTo(cx + 15, legY + 24 - legW);
    ctx.stroke();

    // Crack overlay on limbs (orange glow lines)
    ctx.strokeStyle = 'rgba(255,90,0,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
    const crackT = this._crackPulse;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(crackT) * 3, torsoY + 4);
    ctx.lineTo(cx - 4, torsoY + 14);
    ctx.lineTo(cx + 3, torsoY + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 20, armY + 4);
    ctx.lineTo(cx - 10, armY + 10);
    ctx.lineTo(cx - 6, armY + 3);
    ctx.stroke();

    // ── The Kernel — blazing orb in chest ─────────────────────────────────
    const kx = cx;
    const ky = torsoY + 14;
    const kPulse = (ph3 ? 9 : 6) + Math.sin(this._kernelPulse * 2.2) * 2.5;
    const kCorona = kPulse * (ph3 ? 5 : 3.5);
    const kGrd = ctx.createRadialGradient(kx, ky, 0, kx, ky, kCorona);
    kGrd.addColorStop(0,   'rgba(255,230,60,0.95)');
    kGrd.addColorStop(0.4, 'rgba(255,140,0,0.6)');
    kGrd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = kGrd;
    ctx.beginPath(); ctx.arc(kx, ky, kCorona, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 24;
    ctx.fillStyle   = '#fff8c0';
    ctx.beginPath(); ctx.arc(kx, ky, kPulse, 0, Math.PI * 2); ctx.fill();
    // 6 orbiting fragments (faster in phase 3)
    const orbSpd = ph3 ? 4.2 : 3.0;
    for (let fi = 0; fi < 6; fi++) {
      const fa = this._kernelPulse * orbSpd / 14 + (fi / 6) * Math.PI * 2;
      const fr = kPulse * 2.1;
      ctx.fillStyle   = 'rgba(255,210,50,0.8)';
      ctx.shadowBlur  = 6;
      ctx.beginPath(); ctx.arc(kx + Math.cos(fa) * fr, ky + Math.sin(fa) * fr, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // ── Void crown (jagged dark spikes) ───────────────────────────────────
    ctx.save();
    ctx.translate(cx, headY); ctx.rotate(this._crossAngle * 0.5);
    const SPIKES = 10;
    ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 12;
    for (let s = 0; s < SPIKES; s++) {
      const sa   = (s / SPIKES) * Math.PI * 2;
      const sLen = s % 2 === 0 ? 24 : 14;
      const sAl  = 0.6 + Math.sin(t * 0.8 + s * 0.55) * 0.25;
      ctx.strokeStyle = `rgba(180,20,0,${sAl})`;
      ctx.lineWidth   = s % 2 === 0 ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa) * 13, Math.sin(sa) * 13);
      ctx.lineTo(Math.cos(sa) * (13 + sLen), Math.sin(sa) * (13 + sLen));
      ctx.stroke();
    }
    ctx.restore();

    // ── Eyes: burning orange-red diamonds ─────────────────────────────────
    ctx.shadowColor = 'rgba(255,100,0,1)'; ctx.shadowBlur = 24;
    ctx.fillStyle   = '#ff4400';
    for (const ox of [-3.5, 3.5]) {
      ctx.save();
      ctx.translate(cx + this.facing * 1.5 + ox, headY - 1);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath(); ctx.rect(-3.5, -3.5, 7, 7);
      ctx.fill();
      ctx.restore();
    }

    // ── Fracture shards orbiting body ──────────────────────────────────────
    ctx.save();
    const SHARDS = ph3 ? 16 : 10;
    ctx.shadowBlur = 8;
    for (let i = 0; i < SHARDS; i++) {
      const base  = this._crossAngle * 2.2 + (i / SHARDS) * Math.PI * 2;
      const dist  = 62 + (i % 3) * 12;
      const sx    = cx + Math.cos(base) * dist + Math.cos(base * 2.1 + i) * 10;
      const sy    = cy + Math.sin(base) * 30 + Math.sin(base * 1.8 + i) * 8;
      const sa    = 0.35 + Math.sin(t * 1.05 + i * 0.85) * 0.3;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(base * 3);
      ctx.strokeStyle = `rgba(220,60,0,${sa})`;
      ctx.lineWidth   = 1.4;
      ctx.shadowColor = '#ff2200';
      // Triangle shard
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(4, 3); ctx.lineTo(-4, 3); ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.restore(); // end main save

    // ── Attack effect overlays ─────────────────────────────────────────────
    this._drawEffects(cx, cy);

    // ── Health bar ────────────────────────────────────────────────────────
    this._drawHealthBar(cx, hpFrac);
  }

  _drawHealthBar(cx, hpFrac) {
    const barW = 100, barH = 8;
    const bx   = cx - barW / 2;
    const by   = this.y - 30;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

    const bGrad = ctx.createLinearGradient(bx, by, bx + barW * hpFrac, by + barH);
    bGrad.addColorStop(0, '#ff2200');
    bGrad.addColorStop(0.5, '#ff6600');
    bGrad.addColorStop(1, '#ff4400');
    ctx.fillStyle = bGrad;
    ctx.fillRect(bx, by, barW * hpFrac, barH);

    ctx.save();
    ctx.shadowColor = 'rgba(255,60,0,0.9)'; ctx.shadowBlur = 10;
    ctx.fillStyle   = '#ff8860';
    ctx.font        = 'bold 11px Arial';
    ctx.textAlign   = 'center';
    const phaseTag  = ['', ' — PHASE II', ' — PHASE III'][this._aaPhase - 1] || '';
    ctx.fillText(`✦ ABSOLUTE AXIOM${phaseTag} ✦`, cx, by - 4);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  _drawEffects(cx, cy) {
    if (typeof ctx === 'undefined') return;
    const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
    const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;

    // Kernel pulse rings
    for (const ring of this._kernelPulseRings) {
      if (ring.delay > 0 || ring.alpha <= 0) continue;
      const ky = this.y + this.h * 0.38;
      ctx.save();
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ring.r < ring.maxR * 0.4 ? '#ffcc00' : '#ff6600';
      ctx.lineWidth   = 3.5;
      ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(cx, ky, ring.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Void spears
    for (const sp of this._voidSpears) {
      if (sp.delay > 0 || sp.hit) continue;
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = '#8800cc';
      ctx.fillStyle   = '#ff4400';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 14;
      // Spear shape
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - 24);
      ctx.lineTo(sp.x + 6, sp.y);
      ctx.lineTo(sp.x, sp.y + 8);
      ctx.lineTo(sp.x - 6, sp.y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Warning line from top
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#cc00ff';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(sp.x, 0); ctx.lineTo(sp.x, sp.y - 24); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Kernel beam
    if (this._kernelBeam) {
      const beamY = this.y + this.h * 0.38;
      const startX = this.cx();
      const endX   = this.facing > 0 ? GW + 50 : -50;
      ctx.save();
      ctx.globalAlpha = 0.88;
      const bGrd = ctx.createLinearGradient(startX, beamY, endX, beamY);
      bGrd.addColorStop(0, 'rgba(255,220,50,0.95)');
      bGrd.addColorStop(0.3, 'rgba(255,140,0,0.85)');
      bGrd.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.strokeStyle = bGrd;
      ctx.lineWidth   = 9;
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.moveTo(startX, beamY); ctx.lineTo(endX, beamY); ctx.stroke();
      ctx.lineWidth   = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur  = 12;
      ctx.beginPath(); ctx.moveTo(startX, beamY); ctx.lineTo(endX, beamY); ctx.stroke();
      // Beam flicker
      const flickA = 0.4 + Math.sin(this._aaAuraPhase * 8) * 0.3;
      ctx.globalAlpha = flickA;
      ctx.lineWidth   = 18;
      ctx.strokeStyle = 'rgba(255,180,0,0.2)';
      ctx.shadowBlur  = 0;
      ctx.beginPath(); ctx.moveTo(startX, beamY); ctx.lineTo(endX, beamY); ctx.stroke();
      ctx.restore();
    }

    // Singularity
    if (this._singularity) {
      const sing = this._singularity;
      const progress = sing.timer / sing.maxTimer;
      ctx.save();
      // Void sphere
      ctx.globalAlpha = 0.85;
      const sGrd = ctx.createRadialGradient(sing.x, sing.y, 0, sing.x, sing.y, sing.r + 20);
      sGrd.addColorStop(0, 'rgba(0,0,0,0.95)');
      sGrd.addColorStop(0.6, 'rgba(80,0,80,0.5)');
      sGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sGrd;
      ctx.beginPath(); ctx.arc(sing.x, sing.y, sing.r + 20, 0, Math.PI * 2); ctx.fill();
      // Spinning ring
      ctx.strokeStyle = `rgba(180,0,200,${0.6 + Math.sin(sing.timer * 0.1) * 0.2})`;
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = '#aa00cc'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(sing.x, sing.y, sing.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Column barrage warnings
    for (const col of this._columnBarrage) {
      if (col.hitDealt) continue;
      const frac   = col.timer / col.maxTimer;
      const beamW  = 50 * (1 - frac * 0.8);
      const wA     = 0.2 + Math.sin(col.timer * 0.3) * 0.12;
      ctx.save();
      ctx.globalAlpha = wA;
      const cGrad = ctx.createLinearGradient(col.x, 0, col.x, GH);
      cGrad.addColorStop(0, 'rgba(255,80,0,0.4)');
      cGrad.addColorStop(0.5, 'rgba(255,40,0,0.7)');
      cGrad.addColorStop(1, 'rgba(255,80,0,0.4)');
      ctx.fillStyle = cGrad;
      ctx.fillRect(col.x - beamW / 2, 0, beamW, GH);
      ctx.restore();
    }

    // AA nova projectiles
    for (const b of this._aaNova) {
      ctx.save();
      ctx.globalAlpha = 0.82;
      const nGrd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 14);
      nGrd.addColorStop(0, 'rgba(60,0,0,0.95)');
      nGrd.addColorStop(0.5,'rgba(180,20,0,0.6)');
      nGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nGrd;
      ctx.beginPath(); ctx.arc(b.x, b.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 8;
      ctx.fillStyle   = '#ff6600';
      ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.restore();
    }

    // Absolute strike trail
    if (this._absoluteStrike) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 14;
      if (this._trailPoints.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this._trailPoints[0].x, this._trailPoints[0].y);
        for (let i = 1; i < Math.min(6, this._trailPoints.length); i++) {
          ctx.lineTo(this._trailPoints[i].x, this._trailPoints[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // God-style divine column effects (inherited) — redrawn here with fire palette
    for (const col of this._columns) {
      const frac   = col.timer / col.maxTimer;
      const beamW  = 50 * (1 - frac * 0.78);
      const wA     = 0.22 + Math.sin(col.timer * 0.26) * 0.14;
      ctx.save();
      const cGrad = ctx.createLinearGradient(col.x, 0, col.x, GH);
      cGrad.addColorStop(0,   `rgba(255,120,0,${wA * 0.45})`);
      cGrad.addColorStop(0.5, `rgba(255,60,0,${wA})`);
      cGrad.addColorStop(1,   `rgba(255,120,0,${wA * 0.45})`);
      ctx.fillStyle = cGrad;
      ctx.globalAlpha = wA;
      ctx.fillRect(col.x - beamW / 2, 0, beamW, GH);
      ctx.restore();
    }

    // Nova rings (dark version)
    for (const b of this._novaRings) {
      ctx.save();
      const pFrac = b.timer / b.maxTimer;
      ctx.globalAlpha = (1 - pFrac) * 0.75;
      ctx.fillStyle   = '#cc1100';
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Smite rings (dark fire version)
    for (const ring of this._smiteRings) {
      ctx.save();
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = '#cc2200';
      ctx.lineWidth   = 3.5;
      ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RGS — Reinforced God Slayer loadout system
// ══════════════════════════════════════════════════════════════════════════════
const RGS_LOADOUTS = [
  {
    name: 'Sovereign Blade',
    color: '#ffe066',
    desc: 'Lightning sword — projectile slashes, thunder smash',
    attackDesc: 'Volt Slash (projectile)',
    qDesc: 'Thunder Cascade (AoE)',
    superDesc: 'Sky Judgment (column storm)',
  },
  {
    name: 'Void Lancer',
    color: '#cc88ff',
    desc: 'Draupnir spears — homing duplicates, void barrage',
    attackDesc: 'Spear Clone Volley',
    qDesc: 'Void Rupture (AoE pull)',
    superDesc: 'Draupnir Storm (16 homing)',
  },
  {
    name: 'Reality Breaker',
    color: '#00ffcc',
    desc: 'Time bubble + fracture rift, rewind damage',
    attackDesc: 'Fracture Bolt',
    qDesc: 'Time Bubble (slow field)',
    superDesc: 'Reality Collapse (DoT zone)',
  },
];

// RGS runtime state (attached to player object on activation)
function _initRGS(player) {
  if (player._rgsActive) return;
  player._rgsActive      = true;
  player._rgsLoadout     = 0;     // 0/1/2
  player._rgsJumpsLeft   = 4;     // extra air jumps (total 5 with base)
  player._rgsOnGround    = false;
  player._rgsHpRegen     = 0;     // regen accumulator
  player._rgsAbilityCd   = 0;
  player._rgsSuperCd     = 0;
  player._rgsPortalCd    = 0;
  player._rgsSpears      = [];    // active void lancer spears
  player._rgsTimeBubbles = [];    // active time bubbles
  player._rgsRiftZones   = [];    // reality breaker DoT zones
  player._rgsLightning   = [];    // sovereign lightning strikes
  // Global perks
  player.kbResist = Math.max(player.kbResist || 0, 0.55);
  if (typeof showBossDialogue === 'function') showBossDialogue('Reinforced God Slayer activated.', 180);
  if (typeof CinFX !== 'undefined') CinFX.flash('#ffe066', 0.5, 16);
}

function _updateRGS(aa, player) {
  if (!player || player.health <= 0) return;
  if (!aa || !aa.isAbsoluteAxiom) return;
  _initRGS(player);

  const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
  const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
  const load = player._rgsLoadout;

  // ── HP Regen (2 HP/frame = ~120/s, very slow for 1M fight) ───────────────
  player._rgsHpRegen++;
  if (player._rgsHpRegen >= 30) {
    player._rgsHpRegen = 0;
    if (player.health < player.maxHealth) player.health = Math.min(player.maxHealth, player.health + 2);
  }

  // ── Quintuple jump: restore canDoubleJump if extra jumps remain ───────────
  const onGround = player.onGround || player.grounded || (player.vy === 0 && player.y + player.h >= GH - 70);
  if (onGround) {
    player._rgsJumpsLeft = 4;
    player._rgsOnGround  = true;
  } else if (player._rgsOnGround) {
    player._rgsOnGround = false;
  }
  // Intercept double-jump exhaustion
  if (!onGround && !player.canDoubleJump && player._rgsJumpsLeft > 0) {
    player.canDoubleJump = true;
    player._rgsJumpsLeft--;
  }

  // ── Cooldowns ─────────────────────────────────────────────────────────────
  if (player._rgsAbilityCd  > 0) player._rgsAbilityCd--;
  if (player._rgsSuperCd    > 0) player._rgsSuperCd--;
  if (player._rgsPortalCd   > 0) player._rgsPortalCd--;

  // ── Damage resistance — halve all incoming knockback ─────────────────────
  // (enforced by kbResist set in _initRGS; also cap received damage)

  // ── T key — portal summon ─────────────────────────────────────────────────
  const keys = typeof keysDown !== 'undefined' ? keysDown : {};
  if ((keys['t'] || keys['T']) && !player._rgsTHeld && player._rgsPortalCd <= 0) {
    player._rgsTHeld = true;
    player._rgsPortalCd = 600;
    _rgsPortalSummon(player, aa);
  }
  if (!keys['t'] && !keys['T']) player._rgsTHeld = false;

  // ── X key — loadout switch ────────────────────────────────────────────────
  if ((keys['x'] || keys['X']) && !player._rgsXHeld) {
    player._rgsXHeld = true;
    player._rgsLoadout = (player._rgsLoadout + 1) % 3;
    player._rgsAbilityCd = 30; // brief switch delay
    if (typeof CinFX !== 'undefined') CinFX.flash(RGS_LOADOUTS[player._rgsLoadout].color, 0.3, 8);
  }
  if (!keys['x'] && !keys['X']) player._rgsXHeld = false;

  // ── Q key — loadout ability ───────────────────────────────────────────────
  if ((keys['q'] || keys['Q']) && !player._rgsQHeld && player._rgsAbilityCd <= 0) {
    player._rgsQHeld = true;
    _rgsUseAbility(player, aa, load);
    player._rgsAbilityCd = 240;
  }
  if (!keys['q'] && !keys['Q']) player._rgsQHeld = false;

  // ── Update active effects ─────────────────────────────────────────────────
  _rgsUpdateEffects(player, aa);
}

function _rgsUseAbility(player, aa, load) {
  const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
  const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
  if (load === 0) {
    // Thunder Cascade — lightning strikes in 5 columns around aa
    if (typeof showBossDialogue === 'function') showBossDialogue('Thunder Cascade!', 80);
    for (let i = -2; i <= 2; i++) {
      const lx = aa.cx() + i * 55;
      player._rgsLightning.push({ x: lx, timer: 0, maxTimer: 40, hitDealt: false });
    }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 18);
  } else if (load === 1) {
    // Void Rupture — pull aa toward player then burst
    const dx = player.cx() - aa.cx(), dy = (player.y + player.h / 2) - (aa.y + aa.h / 2);
    const d = Math.hypot(dx, dy) || 1;
    aa.vx += (dx / d) * 22;
    if (typeof dealDamage === 'function') dealDamage(player, aa, 4800, 12);
    if (typeof spawnParticles === 'function') spawnParticles(aa.cx(), aa.cy(), '#cc88ff', 22);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
  } else {
    // Time Bubble — slow field around player
    player._rgsTimeBubbles.push({ x: player.cx(), y: player.y + player.h / 2, r: 0, maxR: 120, timer: 0, maxTimer: 200 });
    if (typeof showBossDialogue === 'function') showBossDialogue('Time Bubble!', 80);
  }
}

function _rgsUpdateEffects(player, aa) {
  const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
  const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;

  // Lightning strikes
  for (let i = player._rgsLightning.length - 1; i >= 0; i--) {
    const l = player._rgsLightning[i];
    l.timer++;
    if (!l.hitDealt && l.timer >= l.maxTimer - 5) {
      l.hitDealt = true;
      if (typeof dealDamage === 'function' && Math.abs(aa.cx() - l.x) < 60) dealDamage(player, aa, 3600, 8);
      if (typeof spawnParticles === 'function') spawnParticles(l.x, GH * 0.5, '#ffe066', 16);
    }
    if (l.timer >= l.maxTimer + 20) player._rgsLightning.splice(i, 1);
  }

  // Homing spears (Void Lancer attack)
  for (let i = player._rgsSpears.length - 1; i >= 0; i--) {
    const sp = player._rgsSpears[i];
    sp.timer++;
    // Home toward aa
    const tx = aa.cx() - sp.x, ty = aa.cy() - sp.y;
    const d = Math.hypot(tx, ty) || 1;
    sp.vx += (tx / d) * 0.9;
    sp.vy += (ty / d) * 0.9;
    const spd = Math.hypot(sp.vx, sp.vy);
    if (spd > 14) { sp.vx = sp.vx / spd * 14; sp.vy = sp.vy / spd * 14; }
    sp.x += sp.vx; sp.y += sp.vy;
    if (!sp.hit && Math.hypot(aa.cx() - sp.x, aa.cy() - sp.y) < 30) {
      sp.hit = true;
      if (typeof dealDamage === 'function') dealDamage(player, aa, 5500, 10);
      if (typeof spawnParticles === 'function') spawnParticles(sp.x, sp.y, '#cc88ff', 14);
    }
    if (sp.timer > 180 || sp.hit) player._rgsSpears.splice(i, 1);
  }

  // Time bubbles — slow aa if inside
  for (let i = player._rgsTimeBubbles.length - 1; i >= 0; i--) {
    const tb = player._rgsTimeBubbles[i];
    tb.timer++;
    tb.r = Math.min(tb.maxR, tb.r + 4);
    if (typeof aa !== 'undefined' && Math.hypot(aa.cx() - tb.x, aa.cy() - tb.y) < tb.r) {
      // Slow aa movement
      aa.vx *= 0.6;
    }
    if (tb.timer >= tb.maxTimer) player._rgsTimeBubbles.splice(i, 1);
  }

  // Rift zones (Reality Breaker super)
  for (let i = player._rgsRiftZones.length - 1; i >= 0; i--) {
    const rz = player._rgsRiftZones[i];
    rz.timer++;
    if (rz.timer % 20 === 0 && typeof dealDamage === 'function') {
      if (Math.hypot(aa.cx() - rz.x, aa.cy() - rz.y) < rz.r) dealDamage(player, aa, 2800, 2);
    }
    if (rz.timer >= rz.maxTimer) player._rgsRiftZones.splice(i, 1);
  }
}

// ── Portal summon ─────────────────────────────────────────────────────────────
function _rgsPortalSummon(player, aa) {
  if (typeof minions === 'undefined') return;
  const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
  const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
  const spawnX = player.cx() + (Math.random() - 0.5) * 200;
  const spawnY = GH - 120;
  const ally = new AAPortalAlly(spawnX, spawnY, aa);
  minions.push(ally);
  if (typeof spawnParticles === 'function') spawnParticles(spawnX, spawnY, '#cc00ff', 22);
  if (typeof CinFX !== 'undefined') CinFX.flash('#cc00ff', 0.3, 10);
  if (typeof showBossDialogue === 'function') showBossDialogue('Portal opened — an ally enters the fray!', 140);
}

// ── Portal Ally class ─────────────────────────────────────────────────────────
class AAPortalAlly extends Fighter {
  constructor(x, y, aaRef) {
    super(x, y);
    this.isAAPortalAlly = true;
    this.name           = 'PORTAL ALLY';
    this.health         = 8000;
    this.maxHealth      = 8000;
    this._teamId        = 10;   // same side as players (different from AA's 50)
    this._aaRef         = aaRef;
    this._attackCd      = 0;
    this._moveCd        = 0;
    this.w              = 20;
    this.h              = 40;
    this._auraPhase     = Math.random() * Math.PI * 2;
    this.kbResist       = 0.5;
  }

  update() {
    if (this.health <= 0) return;
    const aa = this._aaRef;
    if (!aa || aa.health <= 0) return;

    this._auraPhase += 0.08;
    if (this._attackCd > 0) this._attackCd--;

    const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
    const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;
    const dx = aa.cx() - this.cx();
    const dy = (aa.y + aa.h / 2) - (this.y + this.h / 2);
    const d  = Math.hypot(dx, dy) || 1;

    // Move toward aa
    if (d > 50) {
      this.vx = (dx / d) * 4.5;
      if (d > 120 && this.onGround) this.vy = -10; // jump toward
    } else {
      this.vx *= 0.8;
    }

    // Melee
    if (d < 65 && this._attackCd <= 0 && typeof dealDamage === 'function') {
      dealDamage(this, aa, 1200, 5);
      this._attackCd = 45;
      if (typeof spawnParticles === 'function') spawnParticles(aa.cx(), aa.cy(), '#cc00ff', 8);
    }

    this.vy += 0.65; // gravity
    this.x += this.vx;
    this.y += this.vy;
    // Simple floor collision
    if (this.y + this.h >= GH - 60) { this.y = GH - 60 - this.h; this.vy = 0; this.onGround = true; }
    else { this.onGround = false; }
    this.x = Math.max(0, Math.min(GW - this.w, this.x));
    this.facing = Math.sign(dx) || 1;
  }

  draw() {
    if (this.health <= 0 || typeof ctx === 'undefined') return;
    const cx = this.cx(), cy = this.y + this.h * 0.5;
    const headY = this.y + 8;
    const t = this._auraPhase;

    ctx.save();
    // Portal aura
    const aGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 36);
    aGrad.addColorStop(0, 'rgba(180,0,255,0.18)');
    aGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aGrad;
    ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.fill();

    // Body
    ctx.strokeStyle = '#cc44ff';
    ctx.lineWidth   = 3.5;
    ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 14;
    ctx.lineCap     = 'round';
    ctx.beginPath(); ctx.arc(cx, headY, 8, 0, Math.PI * 2); ctx.fillStyle = '#440066'; ctx.fill(); ctx.stroke();
    const torsoY = headY + 8;
    ctx.beginPath(); ctx.moveTo(cx, torsoY); ctx.lineTo(cx, torsoY + 18); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 14, torsoY + 7 + Math.sin(t) * 3);
    ctx.lineTo(cx, torsoY + 4);
    ctx.lineTo(cx + 14, torsoY + 7 - Math.sin(t) * 3);
    ctx.stroke();
    const legY = torsoY + 18;
    ctx.beginPath();
    ctx.moveTo(cx, legY); ctx.lineTo(cx - 9, legY + 16 + Math.sin(t * 0.8) * 2);
    ctx.moveTo(cx, legY); ctx.lineTo(cx + 9, legY + 16 - Math.sin(t * 0.8) * 2);
    ctx.stroke();

    // HP bar
    const hp = this.health / this.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - 20, this.y - 14, 40, 5);
    ctx.fillStyle = '#cc00ff';
    ctx.fillRect(cx - 20, this.y - 14, 40 * hp, 5);
    ctx.restore();
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }
}

// ══════════════════════════════════════════════════════════════════════════════
// RGS HUD — drawn in screen space from smb-loop-core hook
// ══════════════════════════════════════════════════════════════════════════════
function _drawRGSHud(W, H) {
  const player = (typeof players !== 'undefined' && players[0]) ? players[0] : null;
  if (!player || !player._rgsActive) return;

  const aa = (typeof minions !== 'undefined') ? minions.find(m => m.isAbsoluteAxiom && m.health > 0) : null;

  if (typeof ctx === 'undefined') return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const load   = player._rgsLoadout;
  const ldata  = RGS_LOADOUTS[load];
  const panX   = 10, panY = H - 120;
  const panW   = 240, panH = 110;

  // Panel BG
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  _roundRect(ctx, panX, panY, panW, panH, 8);
  ctx.fill();

  // Loadout name + color bar
  ctx.fillStyle = ldata.color;
  _roundRect(ctx, panX, panY, panW, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`[X] ${ldata.name}`, panX + panW / 2, panY + 15);

  // Move descriptions
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ddd';
  ctx.font = '9px monospace';
  ctx.fillText(`SPACE: ${ldata.attackDesc}`, panX + 8, panY + 36);
  ctx.fillText(`Q (${player._rgsAbilityCd > 0 ? Math.ceil(player._rgsAbilityCd/60)+'s' : 'READY'}): ${ldata.qDesc}`, panX + 8, panY + 48);
  ctx.fillText(`SUPER: ${ldata.superDesc}`, panX + 8, panY + 60);

  // Jumps remaining
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`JUMPS: `, panX + 8, panY + 74);
  for (let j = 0; j < 4; j++) {
    ctx.fillStyle = j < player._rgsJumpsLeft ? '#ffe066' : 'rgba(255,224,102,0.25)';
    ctx.fillRect(panX + 56 + j * 14, panY + 64, 10, 8);
  }

  // Portal cooldown bar
  const pcdFrac = player._rgsPortalCd > 0 ? 1 - player._rgsPortalCd / 600 : 1;
  ctx.fillStyle = '#333';
  ctx.fillRect(panX + 8, panY + 82, panW - 16, 7);
  ctx.fillStyle = pcdFrac >= 1 ? '#cc00ff' : '#660099';
  ctx.fillRect(panX + 8, panY + 82, (panW - 16) * pcdFrac, 7);
  ctx.fillStyle = '#aaa';
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(pcdFrac >= 1 ? '[T] PORTAL READY' : `[T] ${Math.ceil(player._rgsPortalCd / 60)}s`, panX + 8, panY + 96);

  // Ally count
  const allyCount = (typeof minions !== 'undefined') ? minions.filter(m => m.isAAPortalAlly && m.health > 0).length : 0;
  ctx.fillStyle = allyCount >= 3 ? '#00ffcc' : '#888';
  ctx.textAlign = 'right';
  ctx.fillText(`ALLIES: ${allyCount}/3`, panX + panW - 8, panY + 96);

  // AA HP bar (top center)
  if (aa) {
    const barW = 360, barH = 18;
    const bx   = (W - barW) / 2, by = 8;
    const hpFrac = aa.health / aa.maxHealth;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    _roundRect(ctx, bx - 2, by - 2, barW + 4, barH + 4, 4);
    ctx.fill();

    const barGrad = ctx.createLinearGradient(bx, by, bx + barW, by + barH);
    barGrad.addColorStop(0,   '#ff2200');
    barGrad.addColorStop(0.5, '#ff6600');
    barGrad.addColorStop(1,   '#ff4400');
    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, barW * hpFrac, barH);

    // Checkpoint tick marks
    const ticks = [0.8, 0.6, 0.4, 0.2, 0.1];
    for (const tick of ticks) {
      const tx = bx + barW * tick;
      ctx.fillStyle = aa._checkpointsFired.has(Math.round(tick * 1000000)) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)';
      ctx.fillRect(tx - 1, by, 2, barH);
    }

    ctx.fillStyle = aa._portalInvincible ? '#cc00ff' : '#fff';
    ctx.font      = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      aa._portalInvincible ? '⚡ ABSOLUTE AXIOM — PORTAL INVINCIBLE ⚡' : '✦ ABSOLUTE AXIOM ✦',
      W / 2, by - 3
    );

    // Portal invincible warning pulse
    if (aa._portalInvincible) {
      const pulse = 0.4 + 0.4 * Math.sin(Date.now() * 0.005);
      ctx.strokeStyle = `rgba(200,0,255,${pulse})`;
      ctx.lineWidth   = 2.5;
      _roundRect(ctx, bx - 2, by - 2, barW + 4, barH + 4, 4);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ══════════════════════════════════════════════════════════════════════════════
// Dimension Punch overlay — full-screen space travel sequence
// ══════════════════════════════════════════════════════════════════════════════
function _drawDimPunchOverlay(W, H) {
  const state = window._aaDimPunchState;
  if (!state || !state.active) return;

  state.timer++;
  const t   = state.timer;
  const dur = state.duration;

  // Fade in / fade out
  let alpha = 1;
  if (t < 20)        alpha = t / 20;
  if (t > dur - 30)  alpha = Math.max(0, (dur - t) / 30);

  if (typeof ctx === 'undefined') return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;

  // ── Deep space background ────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#000005');
  bgGrad.addColorStop(0.5, '#04000e');
  bgGrad.addColorStop(1, '#000810');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Warp-speed star streaks ───────────────────────────────────────────────
  const warpProgress = Math.min(t / 60, 1);
  for (const star of state.stars) {
    const streakLen = warpProgress * star.speed * 40;
    const sx = star.x * W;
    const sy = star.y * H;
    const a  = 0.4 + star.speed * 0.4;
    ctx.globalAlpha = alpha * a;
    ctx.strokeStyle = star.col;
    ctx.lineWidth   = star.r * 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + streakLen * (sx / W - 0.5) * 0.5, sy + streakLen * (sy / H - 0.5) * 0.3);
    ctx.stroke();
    // Star dot
    ctx.fillStyle = star.col;
    ctx.beginPath(); ctx.arc(sx + streakLen * (sx / W - 0.5) * 0.5, sy, star.r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = alpha;

  // ── Galaxy spirals ────────────────────────────────────────────────────────
  for (const gal of state.galaxies) {
    if (t < gal.frame) continue;
    const gx = gal.relX * W, gy = gal.relY * H;
    const galT = (t - gal.frame) / 120;
    const galAlpha = Math.min(galT, 1) * 0.6;
    ctx.globalAlpha = alpha * galAlpha;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(gal.rot + galT * 0.3);
    for (let arm = 0; arm < 3; arm++) {
      const armRot = (arm / 3) * Math.PI * 2;
      for (let s = 0; s < 40; s++) {
        const ang = armRot + s * 0.18;
        const dist = s * 2.2;
        const gsx  = Math.cos(ang) * dist, gsy = Math.sin(ang) * dist;
        const col  = s < 10 ? '#ffffff' : (s < 25 ? '#aaddff' : '#8866aa');
        ctx.fillStyle = col;
        ctx.globalAlpha = alpha * galAlpha * (1 - s / 40);
        ctx.beginPath(); ctx.arc(gsx, gsy, 1.5 - s * 0.02, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = alpha;
  }

  // ── Planets ───────────────────────────────────────────────────────────────
  for (const planet of state.planets) {
    if (t < planet.passFrame) continue;
    const passT  = Math.min((t - planet.passFrame) / 80, 1);
    const pAlpha = passT < 0.5 ? passT * 2 : (1 - (passT - 0.5) * 2);
    const px     = planet.relX * W + (t - planet.passFrame) * 0.3;
    const py     = planet.relY * H;
    ctx.globalAlpha = alpha * pAlpha * 0.9;

    // Planet body
    const pGrad = ctx.createRadialGradient(px - planet.r * 0.3, py - planet.r * 0.3, 0, px, py, planet.r);
    pGrad.addColorStop(0, _lightenHex(planet.col, 60));
    pGrad.addColorStop(0.6, planet.col);
    pGrad.addColorStop(1, _darkenHex(planet.col, 40));
    ctx.fillStyle = pGrad;
    ctx.beginPath(); ctx.arc(px, py, planet.r, 0, Math.PI * 2); ctx.fill();

    // Ring
    if (planet.hasRing && planet.ringCol) {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, 0.28);
      ctx.strokeStyle = planet.ringCol;
      ctx.lineWidth   = 4;
      ctx.globalAlpha = alpha * pAlpha * 0.55;
      ctx.beginPath(); ctx.arc(0, 0, planet.r * 1.7, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Surface detail lines
    ctx.save();
    ctx.globalAlpha = alpha * pAlpha * 0.25;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    for (let li = 0; li < 3; li++) {
      const ly = py - planet.r * 0.4 + li * planet.r * 0.4;
      const lw = Math.sqrt(Math.max(0, planet.r * planet.r - (ly - py) * (ly - py)));
      ctx.beginPath(); ctx.moveTo(px - lw, ly); ctx.lineTo(px + lw, ly); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = alpha;
  }

  // ── Asteroids ─────────────────────────────────────────────────────────────
  for (const ast of state.asteroids) {
    if (t < ast.frame) continue;
    ast.relX += ast.vx; ast.relY += ast.vy; ast.rot += 0.03;
    const ax = ast.relX * W, ay = ast.relY * H;
    const passT = Math.min((t - ast.frame) / 40, 1);
    ctx.globalAlpha = alpha * passT * 0.75;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ast.rot);
    ctx.fillStyle = '#887766';
    ctx.shadowColor = '#554433'; ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, ast.r, ast.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = alpha;
  }

  // ── Ships ─────────────────────────────────────────────────────────────────
  for (const ship of state.ships) {
    if (t < ship.frame) continue;
    ship.relX += ship.vx; ship.relY += ship.vy;
    const sx   = ship.relX * W, sy = ship.relY * H;
    const passT = Math.min((t - ship.frame) / 50, 1);
    ctx.globalAlpha = alpha * passT * 0.8;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(ship.vy, ship.vx));
    // Simple angular ship shape
    ctx.fillStyle = '#aabbcc';
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-10, 8); ctx.lineTo(-6, 0); ctx.lineTo(-10, -8); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(100,200,255,0.7)';
    ctx.beginPath(); ctx.arc(-5, 0, 3, 0, Math.PI * 2); ctx.fill();
    // Engine glow
    ctx.fillStyle = 'rgba(255,180,50,0.8)';
    ctx.beginPath(); ctx.arc(-10, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = alpha;
  }

  // ── Stickmen fighting in space ─────────────────────────────────────────────
  for (const sf of state.stickmenFights) {
    if (t < sf.frame) continue;
    const sfx = sf.relX * W, sfy = sf.relY * H;
    const sfT = Math.min((t - sf.frame) / 60, 1);
    ctx.globalAlpha = alpha * sfT * 0.7;
    _drawSpaceStickFight(ctx, sfx, sfy, t - sf.frame);
    ctx.globalAlpha = alpha;
  }

  // ── Return flash when player arrives back ──────────────────────────────────
  if (t === state.returnAt) {
    if (typeof CinFX !== 'undefined') { CinFX.flash('#ffffff', 0.9, 12); CinFX.flash('#8800ff', 0.5, 20); }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 30);
  }

  // ── "DIMENSION PUNCH" title ────────────────────────────────────────────────
  if (t < 90) {
    const titleAlpha = t < 30 ? t / 30 : t > 70 ? (90 - t) / 20 : 1;
    ctx.globalAlpha = alpha * titleAlpha;
    ctx.save();
    ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 30;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 36px serif';
    ctx.textAlign   = 'center';
    ctx.fillText('DIMENSION PUNCH', W / 2, H * 0.45);
    ctx.font        = '14px monospace';
    ctx.fillStyle   = '#cc88ff';
    ctx.fillText('ABSOLUTE AXIOM', W / 2, H * 0.45 + 28);
    ctx.restore();
    ctx.globalAlpha = alpha;
  }

  ctx.restore();

  // End sequence
  if (t >= dur) window._aaDimPunchState = null;
}

function _drawSpaceStickFight(ctx, x, y, ft) {
  const bob = Math.sin(ft * 0.15) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  // Stickman A
  ctx.globalAlpha *= 0.9;
  ctx.beginPath(); ctx.arc(-18, -30 + bob, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-18, -24 + bob); ctx.lineTo(-18, -8 + bob);
  ctx.moveTo(-18, -18 + bob); ctx.lineTo(-28, -12 + bob); // left arm
  ctx.moveTo(-18, -18 + bob); ctx.lineTo(-9, -10 + bob + Math.sin(ft * 0.4) * 6); // right arm (attacking)
  ctx.moveTo(-18, -8 + bob); ctx.lineTo(-24, 6 + bob);
  ctx.moveTo(-18, -8 + bob); ctx.lineTo(-13, 6 + bob);
  ctx.stroke();
  // Sword
  ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -10 + bob + Math.sin(ft * 0.4) * 6); ctx.lineTo(2, -20 + bob + Math.sin(ft * 0.4) * 8); ctx.stroke();
  // Stickman B
  ctx.strokeStyle = '#ff6644'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(18, -30 - bob, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, -24 - bob); ctx.lineTo(18, -8 - bob);
  ctx.moveTo(18, -18 - bob); ctx.lineTo(28, -12 - bob);
  ctx.moveTo(18, -18 - bob); ctx.lineTo(8, -10 - bob - Math.sin(ft * 0.4) * 4);
  ctx.moveTo(18, -8 - bob); ctx.lineTo(24, 6 - bob);
  ctx.moveTo(18, -8 - bob); ctx.lineTo(12, 6 - bob);
  ctx.stroke();
  ctx.restore();
}

function _lightenHex(hex, amt) {
  let n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

function _darkenHex(hex, amt) {
  let n = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `rgb(${r},${g},${b})`;
}

// ── Activate RGS for player on arena start ────────────────────────────────────
function _activateRGSForMatch() {
  const aa = (typeof minions !== 'undefined') ? minions.find(m => m.isAbsoluteAxiom) : null;
  if (!aa) return;
  const player = (typeof players !== 'undefined' && players[0]) ? players[0] : null;
  if (player) _initRGS(player);
  window._absoluteAxiomWasAlive = true;
}
