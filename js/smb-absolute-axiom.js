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
    this.health      = 250000;
    this.maxHealth   = 250000;
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
      if (r < 0.12)      this._doDimShattering();
      else if (r < 0.24) this._doColumnBarrage(target);
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
