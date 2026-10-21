'use strict';
// smb-fallen-god.js: FallenGod, the boss of story ch80 and its Simulator refight.
// Depends on smb-boss.js (Boss), smb-combat.js (dealDamage, clamp, randChoice), smb-particles-core.js.
//
// He built the walls between dimensions and lost to Axiom, so he is weaker than the Creator and
// fights like an examiner: every special is telegraphed long enough to read, and his stance
// punishes a player who swings on reflex. Only the Boss chassis (HUD, phases, death routing) is
// shared; the AI and move set below replace the Creator's entirely.

// True when the match being set up or played is a Fallen God fight (story or refight).
function _isFallenGodFight() {
  if (gameMode !== 'boss') return false;
  return storyModeActive ? storyBossType === 'fallen_god' : simBossType === 'fallen_god';
}

const FG_GOLD  = '#ffcc44';
const FG_LIGHT = '#fff2c0';

class FallenGod extends Boss {
  constructor() {
    super();
    this.isFallenGod  = true;
    this.name         = 'FALLEN GOD';
    this.color        = '#ffaa00';
    // 0.7x the Creator's 3000 HP: he lost to Axiom. Applied in _startGameCore.
    this._healthMult  = 0.7;
    this.weaponKey    = 'spear';
    this.weapon       = WEAPONS.spear || this.weapon;
    this.kbResist     = 0.6;
    this.kbBonus      = 1.3;
    this.attackCooldownMult = 0.8;
    // Golden silhouette
    this._fallenGodTint = true;

    this._fgMove     = null;  // the special in progress; the AI waits while it runs
    this._fgRecover  = 0;     // AI ticks of melee-only play after a special
    this._fgIdle     = 0;     // AI ticks since the last special
    this._fgCd       = { verdict: 6, wall: 10, closing: 0, fall: 14, stance: 0 };
    this._fgVerdicts = [];    // { x, track, lock, strike, hit:Set }
    this._fgWalls    = [];    // { x, h, rise, life, sink, vx, hit:Set, closing }
    this._fgWaves    = [];    // { x, dir, life, hit:Set }
    this._fgLines    = new Set();
  }

  _fgFloorY() {
    const fl = currentArena && currentArena.platforms && currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
    return fl ? fl.y : 460;
  }

  _fgFloor() {
    return currentArena && currentArena.platforms && currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
  }

  _fgTargets() {
    return players.filter(p => p && !p.isBoss && p.health > 0 && !p.godmode);
  }

  // AI tick (every AI_TICK_INTERVAL frames). Specials resolve per frame in update().
  updateAI() {
    if (activeCinematic || gameFrozen) return;
    if (this.aiReact > 0) { this.aiReact--; return; }
    if (this.ragdollTimer > 0 || this.stunTimer > 0) return;
    if (bossStaggerTimer > 0) return;
    if (!this.target || this.target.health <= 0) this._acquireAITarget();
    const t = this.target;
    if (!t || t.health <= 0) return;

    const phase = this.getPhase();
    if (phase > this._lastPhase) {
      this._lastPhase = phase;
      if (settings.screenShake) screenShake = Math.max(screenShake, 16);
      spawnParticles(this.cx(), this.cy(), FG_GOLD, 30);
      showBossDialogue(phase === 2 ? 'Now I stop teaching gently.'
        : 'This is all I had left when he came for the walls. Survive it.', 260);
      this._fgRecover = Math.max(this._fgRecover, 4);
    }
    this._fgHpLines();

    if (this._fgMove) return;
    for (const k in this._fgCd) if (this._fgCd[k] > 0) this._fgCd[k]--;

    const dx  = t.cx() - this.cx();
    const d   = Math.abs(dx);
    const dir = dx > 0 ? 1 : -1;

    if (this._fgRecover > 0) {
      this._fgRecover--;
    } else {
      this._fgIdle++;
      const freq = phase === 3 ? 0.16 : phase === 2 ? 0.11 : 0.07;
      if (this._fgIdle >= 14 || Math.random() < freq) {
        if (this._fgStartSpecial(phase, t, d)) {
          this._fgIdle = 0;
          this._fgRecover = phase === 3 ? 4 : phase === 2 ? 6 : 8;
          return;
        }
      }
    }

    // Melee: a measured advance, slower and less relentless than the Creator.
    const spd     = phase === 3 ? 5.2 : phase === 2 ? 4.6 : 4.0;
    const atkFreq = phase === 3 ? 0.70 : phase === 2 ? 0.55 : 0.42;
    const edge    = this.isEdgeDanger(dir);
    if (d < this.weapon.range * 2.2) {
      this.vx = d < 40 ? this.vx * 0.7 : dir * spd * 0.6;
      if (Math.random() < atkFreq) this.attack(t);
      if (Math.random() < 0.04) this.ability(t);
    } else if (!edge) {
      this.vx = dir * spd;
    } else {
      this.vx = 0;
    }
    if (this.onGround && t.y + t.h < this.y - 40 && !edge && Math.random() < 0.10) this.vy = -18;
    if (!this.onGround && this.canDoubleJump && t.y + t.h < this.y - 20 && this.vy > -4 && Math.random() < 0.3) {
      this.vy = -17; this.canDoubleJump = false;
    }
    if (Math.random() < 0.04) this.aiReact = 2;
  }

  _fgStartSpecial(phase, t, d) {
    const cd = this._fgCd;
    const scale = phase === 3 ? 0.6 : phase === 2 ? 0.8 : 1;
    const opts = [];
    if (cd.verdict <= 0) opts.push('verdict');
    if (cd.wall <= 0 && this._fgWalls.length < 2) opts.push('wall');
    if (phase >= 2 && cd.closing <= 0 && this._fgWalls.length === 0) opts.push('closing');
    if (cd.fall <= 0 && this._fgFloor() && (d > 220 || Math.random() < 0.4)) opts.push('fall');
    if (phase >= 2 && cd.stance <= 0 && d < 260) opts.push('stance');
    if (!opts.length) return false;
    const pick = randChoice(opts);
    if (pick === 'verdict') {
      cd.verdict = Math.ceil(22 * scale);
      const n = phase;
      for (let i = 0; i < n; i++) {
        this._fgVerdicts.push({ x: t.cx(), delay: i * 24, track: 40, lock: 30, strike: 14, hit: new Set() });
      }
      this._fgMove = { type: 'cast', t: 34 };
      showBossDialogue(randChoice(['Judgement.', 'Stand there and be measured.', 'Move.']), 150);
    } else if (pick === 'wall') {
      cd.wall = Math.ceil(26 * scale);
      const away = t.cx() >= this.cx() ? 1 : -1;
      this._fgAddWall(t.cx() + away * 95, 0, false);
      this._fgMove = { type: 'cast', t: 26 };
      showBossDialogue(randChoice(['A wall is a question.', 'Walls hold.', 'Find the way over.']), 150);
    } else if (pick === 'closing') {
      cd.closing = Math.ceil(44 * scale);
      cd.wall = Math.max(cd.wall, 12);
      const fl = this._fgFloor();
      const lo = fl ? fl.x + 30 : 30, hi = fl ? fl.x + fl.w - 30 : GAME_W - 30;
      const speed = phase === 3 ? 2.6 : 2.0;
      this._fgAddWall(clamp(t.cx() - 300, lo, hi), speed, true);
      this._fgAddWall(clamp(t.cx() + 300, lo, hi), -speed, true);
      this._fgMove = { type: 'cast', t: 40 };
      showBossDialogue(randChoice(['The walls close on the rigid.', 'Adapt, or be held.']), 190);
    } else if (pick === 'fall') {
      cd.fall = Math.ceil(36 * scale);
      this.vy = -24; this.vx = 0;
      this._fgMove = { type: 'fall', stage: 'rise', t: 22 };
      showBossDialogue(randChoice(['I fell once. Watch how.', 'From above.']), 160);
    } else if (pick === 'stance') {
      cd.stance = Math.ceil(40 * scale);
      this.vx = 0;
      this._fgMove = { type: 'stance', t: 80, hp: this.health, target: t };
      showBossDialogue('Show me.', 120);
    }
    return true;
  }

  _fgAddWall(x, vx, closing) {
    this._fgWalls.push({ x, h: closing ? 105 : 120, warn: closing ? 50 : 45, rise: 0, life: closing ? 600 : 240,
      sink: 0, sinking: false, dead: false, vx, closing, hit: new Set() });
  }

  _fgHpLines() {
    const pct = this.health / this.maxHealth;
    const lines = [
      [0.999, 'Show me what you carry.'],
      [0.75,  'Good. Again.'],
      [0.50,  'You are reading me. Keep reading.'],
      [0.25,  'I lost to the one you are going to face. Do better than I did.'],
      [0.10,  'Enough. You hold.'],
    ];
    for (const [at, text] of lines) {
      if (pct <= at && !this._fgLines.has(at)) {
        this._fgLines.add(at);
        showBossDialogue(text, 260);
        break;
      }
    }
  }

  // Per-frame: run Fighter physics, then resolve his moves and hazards.
  update() {
    super.update();
    if (this.isRemote || this.health <= 0 || activeCinematic || !gameRunning) return;
    this._fgTickMove();
    this._fgTickVerdicts();
    this._fgTickWalls();
    this._fgTickWaves();
  }

  _fgTickMove() {
    const m = this._fgMove;
    if (!m) return;
    if (m.type === 'cast') {
      this.vx *= 0.6;
      if (--m.t <= 0) this._fgMove = null;
    } else if (m.type === 'stance') {
      this.vx = 0;
      if (settings.particles && frameCount % 5 === 0) spawnParticles(this.cx(), this.cy(), FG_GOLD, 2);
      const t = m.target;
      if (this.health < m.hp && t && t.health > 0) {
        // Struck during the stance: answer from behind.
        const behind = t.cx() - (t.facing || 1) * 55;
        this.x = clamp(behind - this.w / 2, 10, GAME_W - this.w - 10);
        this.facing = t.cx() < this.cx() ? -1 : 1;
        spawnParticles(this.cx(), this.cy(), FG_LIGHT, 22);
        dealDamage(this, t, 15, 12);
        if (settings.screenShake) screenShake = Math.max(screenShake, 10);
        showBossDialogue('Predictable.', 120);
        this._fgMove = null;
      } else if (--m.t <= 0) {
        // Waited out: he is left open.
        this.stunTimer = Math.max(this.stunTimer || 0, 55);
        showBossDialogue('Patience. Good.', 140);
        this._fgMove = null;
      }
    } else if (m.type === 'fall') {
      const t = this.target;
      const fl = this._fgFloor();
      if (!fl) { this._fgMove = null; return; }
      if (m.stage === 'rise') {
        if (--m.t <= 0 || this.y < 40) { m.stage = 'hold'; m.t = 55; m.holdY = Math.max(20, Math.min(this.y, 60)); }
      } else if (m.stage === 'hold') {
        this.vy = 0;
        this.y = m.holdY;
        const lo = fl.x + 20, hi = fl.x + fl.w - this.w - 20;
        if (t) this.x = clamp(this.x + (t.cx() - this.w / 2 - this.x) * 0.08, lo, hi);
        m.markX = this.cx();
        if (--m.t <= 0) { m.stage = 'drop'; }
      } else if (m.stage === 'drop') {
        this.vx = 0;
        this.vy = 26;
        if (this.onGround || this.y + this.h >= fl.y - 2) this._fgLand();
      }
    }
  }

  // The Fall passes through every platform but the floor, so he lands where the marker showed.
  checkPlatform(pl) {
    if (this._fgMove && this._fgMove.type === 'fall' && !pl.isFloor) return;
    super.checkPlatform(pl);
  }

  _fgLand() {
    this._fgMove = null;
    const x = this.cx(), y = this.y + this.h;
    if (settings.screenShake) screenShake = Math.max(screenShake, 18);
    spawnParticles(x, y, FG_GOLD, 30);
    spawnParticles(x, y, FG_LIGHT, 14);
    for (const p of this._fgTargets()) {
      if (Math.abs(p.cx() - x) < 75 && Math.abs((p.y + p.h) - y) < 60) dealDamage(this, p, 18, 10);
    }
    this._fgWaves.push({ x, dir: 1, life: 70, hit: new Set() });
    this._fgWaves.push({ x, dir: -1, life: 70, hit: new Set() });
  }

  _fgTickVerdicts() {
    const floorY = this._fgFloorY();
    for (const v of this._fgVerdicts) {
      if (v.delay > 0) { v.delay--; continue; }
      if (v.track > 0) {
        v.track--;
        const t = this.target;
        if (t) v.x += (t.cx() - v.x) * 0.12;
      } else if (v.lock > 0) {
        v.lock--;
      } else if (v.strike > 0) {
        if (v.strike === 14) {
          spawnParticles(v.x, floorY, FG_LIGHT, 16);
          if (settings.screenShake) screenShake = Math.max(screenShake, 8);
        }
        v.strike--;
        for (const p of this._fgTargets()) {
          if (!v.hit.has(p) && Math.abs(p.cx() - v.x) < 26) { v.hit.add(p); dealDamage(this, p, 16, 7); }
        }
      }
    }
    this._fgVerdicts = this._fgVerdicts.filter(v => v.delay > 0 || v.track > 0 || v.lock > 0 || v.strike > 0);
  }

  _fgTickWalls() {
    const floorY = this._fgFloorY();
    for (const w of this._fgWalls) {
      if (w.warn > 0) { w.warn--; continue; }
      if (w.rise < 1) {
        w.rise = Math.min(1, w.rise + 0.1);
        for (const p of this._fgTargets()) {
          if (!w.hit.has(p) && Math.abs(p.cx() - w.x) < 18 + p.w / 2 && p.y + p.h > floorY - w.h) {
            w.hit.add(p); dealDamage(this, p, 12, 8);
          }
        }
        if (w.rise >= 1) spawnParticles(w.x, floorY - w.h, FG_GOLD, 10);
        continue;
      }
      if (w.sinking) { if (--w.sink <= 0) w.dead = true; continue; }
      if (w.closing) w.x += w.vx;
      if (--w.life <= 0) { w.sinking = true; w.sink = 15; continue; }
      // Solid: push fighters back out the side they came from. Clearing the top is the way past.
      const top = floorY - w.h;
      for (const p of this._fgTargets()) {
        const half = 12 + p.w / 2;
        if (Math.abs(p.cx() - w.x) < half && p.y + p.h > top + 4) {
          const side = p.cx() < w.x ? -1 : 1;
          p.x = w.x + side * half - p.w / 2;
          // A closing wall shoves and hurts; a standing one only blocks.
          if (w.closing && Math.sign(w.vx) === side) {
            if (!w.hit.has(p)) { w.hit.add(p); dealDamage(this, p, 10, 6); }
            p.vx = w.vx * 3;
          } else {
            p.vx = 0;
          }
        }
      }
    }
    // Closing walls that meet shatter together.
    const cl = this._fgWalls.filter(w => w.closing && w.rise >= 1 && !w.sinking);
    if (cl.length === 2 && Math.abs(cl[0].x - cl[1].x) < 36) {
      for (const w of cl) { w.sinking = true; w.sink = 15; spawnParticles(w.x, floorY - w.h / 2, FG_GOLD, 18); }
      if (settings.screenShake) screenShake = Math.max(screenShake, 10);
    }
    this._fgWalls = this._fgWalls.filter(w => !w.dead);
  }

  _fgTickWaves() {
    const floorY = this._fgFloorY();
    for (const wv of this._fgWaves) {
      wv.x += wv.dir * 7;
      wv.life--;
      for (const p of this._fgTargets()) {
        if (!wv.hit.has(p) && Math.abs(p.cx() - wv.x) < 16 && p.y + p.h > floorY - 22) {
          wv.hit.add(p); dealDamage(this, p, 10, 7);
        }
      }
    }
    this._fgWaves = this._fgWaves.filter(wv => wv.life > 0);
  }

  // Golden rim on top of the base Boss draw. Called as p.draw(), so no ctx parameter (it would shadow the canvas global).
  draw() {
    this._fgDrawHazards();
    super.draw();
    if (!this._fallenGodTint) return;
    ctx.save();
    const stance = this._fgMove && this._fgMove.type === 'stance';
    ctx.globalAlpha = stance ? 0.35 + 0.15 * Math.sin(frameCount * 0.3) : 0.18 + 0.08 * Math.sin(Date.now() / 400);
    ctx.fillStyle   = '#ffcc44';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur  = stance ? 36 : 24;
    ctx.fillRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8);
    if (stance) {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = FG_LIGHT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.cx(), this.cy(), 46 + Math.sin(frameCount * 0.2) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _fgDrawHazards() {
    const floorY = this._fgFloorY();
    ctx.save();
    // Fall: shadow marker under the hovering god.
    const m = this._fgMove;
    if (m && m.type === 'fall' && m.stage !== 'rise' && m.markX !== undefined) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.ellipse(m.markX, floorY - 2, 60, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const v of this._fgVerdicts) {
      if (v.delay > 0) continue;
      if (v.strike > 0) {
        const a = v.strike / 14;
        ctx.globalAlpha = 0.85 * a;
        ctx.fillStyle = FG_LIGHT;
        ctx.shadowColor = FG_GOLD; ctx.shadowBlur = 30;
        ctx.fillRect(v.x - 24, -200, 48, floorY + 200);
        ctx.shadowBlur = 0;
      } else {
        const locked = v.track <= 0;
        ctx.globalAlpha = locked ? 0.35 + 0.25 * Math.sin(frameCount * 0.5) : 0.22;
        ctx.strokeStyle = FG_GOLD;
        ctx.lineWidth = locked ? 3 : 1.5;
        ctx.strokeRect(v.x - 24, -200, 48, floorY + 200);
        if (locked) { ctx.globalAlpha *= 0.4; ctx.fillStyle = FG_GOLD; ctx.fillRect(v.x - 24, -200, 48, floorY + 200); }
      }
    }
    for (const w of this._fgWalls) {
      if (w.warn > 0) {
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(frameCount * 0.4);
        ctx.strokeStyle = FG_GOLD;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(w.x - 12, floorY - w.h, 24, w.h);
        ctx.setLineDash([]);
        continue;
      }
      const h = w.h * (w.sinking ? w.sink / 15 : w.rise);
      ctx.globalAlpha = 0.9;
      const g = ctx.createLinearGradient(w.x - 12, 0, w.x + 12, 0);
      g.addColorStop(0, '#8a5a00'); g.addColorStop(0.5, FG_GOLD); g.addColorStop(1, '#8a5a00');
      ctx.fillStyle = g;
      ctx.shadowColor = FG_GOLD; ctx.shadowBlur = 16;
      ctx.fillRect(w.x - 12, floorY - h, 24, h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = FG_LIGHT;
      ctx.fillRect(w.x - 12, floorY - h, 24, 3);
    }
    for (const wv of this._fgWaves) {
      ctx.globalAlpha = Math.min(1, wv.life / 20);
      ctx.fillStyle = FG_GOLD;
      ctx.beginPath();
      ctx.moveTo(wv.x - wv.dir * 18, floorY);
      ctx.lineTo(wv.x, floorY - 20);
      ctx.lineTo(wv.x + wv.dir * 8, floorY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
