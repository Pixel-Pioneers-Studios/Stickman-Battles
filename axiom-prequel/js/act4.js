'use strict';

// ─── Act IV: "What He Built" ──────────────────────────────────────────────────
// After the void. Axiom plays as what he became: the cosmos under a man's will,
// then the Creator shell over it. Five chapters appended to CHAPTERS; inside
// Stickman Evolution they open only once The 95th is finished.
//
// Chapter fields used only here:
//   cosmic:      0-3, which Cosmic moves Axiom has (see cosmicLevel())
//   look:        'cosmic' | 'creator' — how Axiom is drawn
//   act4Hints:   [{ t, text, dur }] — teach lines, t in frames from chapter start;
//                {light} {heavy} {super} {jump} {brace} become key labels
//   dialogues[].event — an interlude beat fired when that line comes up
//   watcher:     { x, follow } — the quiet figure at his shoulder
//   vessel:      { x } — the vessel Paradox comes out of
//   bearerCount: true — the BEARERS RECORDED counter
//   vgText:      { hint, fail, failLine } — Vanguard wording for this chapter
//
// The figure at his shoulder is Sovereign in the mask of a made thing. He is
// never named here and never speaks; Axiom believes he built him.

const ACT4_PLATFORM_COLORS = {
  void_wake:  ['#1c1626', '#0e0b16'],
  void_forge: ['#2a1030', '#150818'],
  network:    ['#1a1430', '#0c0a1a'],
};

const ACT4_COLORS = {
  null:   '#8a2be2',
  seraph: '#00aacc',
  vael:   '#2266ff',
};

let act4Fx      = [];     // hands, rings, the collapse
let act4Watcher = null;
let act4Vessel  = null;
let _a4Frame    = 0;
let _a4Look     = null;   // overrides ch.look after the shell is made mid-chapter
let _a4Total    = 0;      // enemies at chapter start, for the bearer counter
let _a4Shown    = 1;      // bearer count on screen
let _a4Shell    = 0;      // frames left on the shell-forming effect

function _a4Ch() { return CHAPTERS[currentChapter]; }

function cosmicLevel() { return _a4Ch()?.cosmic ?? 0; }

// Draw options for Axiom, or null before the void.
function act4AxiomLook() {
  const look = _a4Look ?? _a4Ch()?.look;
  if (look === 'cosmic') {
    return { skin: '#0a0a0c', body: '#0a0a0c', limbs: '#0a0a0c', edge: '#d8d4f0', line: '#ffffff',
             glow: 'rgba(220,215,255,0.55)', eye: '#ffffff' };
  }
  if (look === 'creator') {
    return { skin: '#1a0818', body: '#1a0818', limbs: '#1a0818', edge: '#ff40e0', line: '#ff9cf0',
             glow: 'rgba(255,64,224,0.6)', eye: '#ffe0fa' };
  }
  return null;
}

function _a4Keys(text) {
  return text.replace(/\{(\w+)\}/g, (m, a) => BINDINGS[a] ? keyLabel(a) : m);
}

function _a4FloorY() {
  let best = null;
  for (const p of platforms) if (!best || p.w > best.w) best = p;
  return best ? best.y : 440;
}

// ─── Chapter setup (called from loadChapter) ──────────────────────────────────
function initAct4(ch) {
  act4Fx      = [];
  act4Watcher = null;
  act4Vessel  = null;
  _a4Frame    = 0;
  _a4Look     = null;
  _a4Shell    = 0;
  _a4Total    = enemies.length;
  _a4Shown    = 1;
  if (!ch || !ch.cosmic) return;

  // What came out of the void is not a man who can be put down by a thug
  axiomPlayer.maxHealth = 160;
  axiomPlayer.health    = 160;

  if (ch.watcher) {
    act4Watcher = {
      x: ch.watcher.x, y: _a4FloorY() - 52, w: 22, h: 52, vx: 0, facing: 1,
      follow: !!ch.watcher.follow, alpha: ch.watcher.hidden ? 0 : 1, mode: 'stand',
      _rigDist: 0, seed: 97,
    };
  }
  if (ch.vessel) {
    act4Vessel = { x: ch.vessel.x, y: _a4FloorY(), fill: 0, state: 'empty', t: 0,
                   px: ch.vessel.x, pvx: 0, pAlpha: 0 };
  }
}

// ─── Per-frame update (playing and interlude) ─────────────────────────────────
function act4Update() {
  const ch = _a4Ch();
  if (!ch || !ch.cosmic) return;
  _a4Frame++;

  if (_a4Shell > 0) _a4Shell--;
  _a4UpdateWatcher();
  _a4UpdateVessel();
  _a4UpdateFx();

  if (ch.bearerCount) {
    const gone   = enemies.filter(e => e.health <= 0 || e.state === 'dead').length;
    const target = _a4Total ? 1 + Math.floor(93 * gone / _a4Total) : 1;
    if (_a4Shown < target && _a4Frame % 3 === 0) {
      _a4Shown = Math.min(target, _a4Shown + Math.ceil((target - _a4Shown) / 8));
      if (axiomPlayer) spawnParticles(axiomPlayer.cx(), axiomPlayer.cy() - 10, '#e8f4ff', 3,
                                      { speed: 2, life: 22, maxLife: 22, size: 2, gravity: false });
    }
  }
}

// Interlude beats, fired by interlude.js as their line comes up.
function act4Fire(event) {
  const ax = axiomPlayer;
  switch (event) {
    case 'shell':
      // The Creator body closes over the cosmic one
      _a4Look  = 'creator';
      _a4Shell = 50;
      if (ax) spawnVoidBurst(ax.cx(), ax.cy());
      shake(10);
      applyHitStop(10);
      break;
    case 'watcher_in':
      // Not walking up: already there, the way it always was
      if (act4Watcher && ax) {
        act4Watcher.x = clamp(ax.cx() - ax.facing * 46 - act4Watcher.w / 2, 0, levelWidth - act4Watcher.w);
        act4Watcher.mode = 'fadein';
        act4Watcher.follow = true;
      }
      break;
    case 'stream':
      if (act4Vessel) act4Vessel.state = 'filling';
      break;
    case 'intercept':
      if (act4Vessel) { act4Vessel.state = 'intercepted'; act4Vessel.t = 0; }
      shake(4);
      break;
    case 'touch':
      if (act4Watcher && act4Vessel) { act4Watcher.mode = 'to_vessel'; act4Watcher.follow = false; }
      break;
    case 'break':
      if (act4Vessel) { act4Vessel.state = 'broken'; act4Vessel.t = 0; act4Vessel.pAlpha = 1; }
      if (act4Vessel) spawnParticles(act4Vessel.x, act4Vessel.y - 40, '#00ffff', 22, { speed: 7, life: 30, maxLife: 30, size: 3 });
      shake(14);
      applyHitStop(12);
      break;
  }
}

function _a4UpdateWatcher() {
  const w = act4Watcher;
  if (!w || !axiomPlayer) return;
  if (w.mode === 'fadein') { w.alpha = Math.min(1, w.alpha + 0.012); if (w.alpha >= 1) w.mode = 'stand'; }

  let goal = null;
  if (w.mode === 'to_vessel' && act4Vessel) {
    // Round to the far side of it from Axiom, out of his line of sight
    if (w.side === undefined) w.side = axiomPlayer.cx() < act4Vessel.x ? 1 : -1;
    goal = act4Vessel.x + w.side * 20;
    if (Math.abs(w.x + w.w / 2 - goal) < 6) {
      w.mode = 'touching'; w.t = 0;
    }
  } else if (w.mode === 'touching') {
    w.t++;
    w.facing = -w.side;
    if (w.t === 20 && act4Vessel) {
      act4Vessel.touched = 1;
      spawnParticles(act4Vessel.x, act4Vessel.y - 40, '#ff4466', 10, { speed: 3, life: 26, maxLife: 26, size: 2, gravity: false });
    }
    if (w.t > 70) { w.mode = 'stand'; w.follow = true; }
  } else if (w.follow) {
    // A step behind his shoulder, never in front of him
    goal = axiomPlayer.cx() - axiomPlayer.facing * 46;
  }

  if (goal !== null) {
    const dx = goal - (w.x + w.w / 2);
    if (Math.abs(dx) > 8) {
      w.facing = dx > 0 ? 1 : -1;
      w.vx = lerp(w.vx, w.facing * Math.min(3.6, Math.abs(dx) * 0.08 + 1.2), 0.15);
    } else {
      w.vx *= 0.6;
      w.facing = axiomPlayer.cx() > w.x ? 1 : -1;
    }
  } else {
    w.vx *= 0.6;
  }
  w.x += w.vx;
  w.x  = clamp(w.x, 0, levelWidth - w.w);
}

function _a4UpdateVessel() {
  const v = act4Vessel;
  if (!v) return;
  v.t++;
  if (v.state === 'filling' || v.state === 'intercepted') {
    v.fill = Math.min(1, v.fill + 0.004);
    if (axiomPlayer && frameCount % 3 === 0) {
      spawnParticles(lerp(axiomPlayer.cx(), v.x, Math.random()), axiomPlayer.cy() - 6 + rnd(-6, 6),
                     '#d8ccff', 1, { speed: 0.5, life: 20, maxLife: 20, size: 2, gravity: false });
    }
  }
  if (v.touched) v.touched = Math.min(1, v.touched + 0.02);
  if (v.state === 'broken') {
    // Paradox gets its feet, looks at nobody, and goes
    if (v.t > 70) {
      v.pvx = lerp(v.pvx, 9, 0.08);
      v.px += v.pvx;
      if (v.t > 100) v.pAlpha = Math.max(0, v.pAlpha - 0.04);
    }
  }
}

// ─── Cosmic moves ─────────────────────────────────────────────────────────────
// Gravity flip: in the cosmos "down" belongs to the strongest mass. Jump again
// in the air and everything near him falls the other way, then comes back down.
function cosmicGravityFlip(ax) {
  ax.vy = -8;
  act4Fx.push({ kind: 'flip', x: ax.cx(), y: ax.cy(), t: 0 });
  shake(8);
  applyHitStop(5);
  for (const e of enemies) {
    if (e.health <= 0 || e.state === 'dead') continue;
    if (Math.abs(e.cx() - ax.cx()) > 240 || Math.abs(e.cy() - ax.cy()) > 170) continue;
    dealDamage(ax, e, 12, 0, true);
    e.vy = -15;
    spawnVoidFlicker(e.cx(), e.cy());
  }
}

// Command: the Creator shell builds a hand, and the hand comes down.
function cosmicCommand(ax) {
  if ((ax._cmdCd ?? 0) > 0) return;
  ax._cmdCd = 70;
  let target = null, best = 340;
  for (const e of enemies) {
    if (e.health <= 0 || e.state === 'dead') continue;
    const d = Math.abs(e.cx() - ax.cx());
    if (d < best && Math.abs(e.cy() - ax.cy()) < 160) { best = d; target = e; }
  }
  const x = target ? target.cx() : ax.cx() + ax.facing * 120;
  act4Fx.push({ kind: 'hand', x, y: target ? target.y + target.h : ax.y + ax.h, target, t: 0 });
}

// Collapse: with the meter full, a point in front of him falls in on itself and
// takes everything nearby with it.
function cosmicCollapse(ax) {
  ax.superMeter = 0;
  ax.superBurstTimer = 22;
  act4Fx.push({ kind: 'hole', x: ax.cx() + ax.facing * 150, y: ax.cy() - 20, t: 0 });
  shake(10);
}

function _a4UpdateFx() {
  const ax = axiomPlayer;
  if (ax && ax._cmdCd > 0) ax._cmdCd--;
  for (let i = act4Fx.length - 1; i >= 0; i--) {
    const f = act4Fx[i];
    f.t++;
    if (f.kind === 'flip' && f.t > 30) { act4Fx.splice(i, 1); continue; }
    if (f.kind === 'hand') {
      if (f.target && f.target.health > 0) f.x = lerp(f.x, f.target.cx(), 0.25);
      if (f.t === 16) {
        shake(9);
        applyHitStop(6);
        spawnHeavyImpact(f.x, f.y - 10);
        spawnParticles(f.x, f.y - 6, '#ff66ff', 10, { speed: 6, life: 18, maxLife: 18, size: 3 });
        for (const e of enemies) {
          if (e.health <= 0 || e.state === 'dead') continue;
          if (Math.abs(e.cx() - f.x) < 46 && Math.abs(e.y + e.h - f.y) < 70) dealDamage(ax, e, 22, 8, true);
        }
      }
      if (f.t > 34) act4Fx.splice(i, 1);
      continue;
    }
    if (f.kind === 'hole') {
      if (f.t < 70) {
        for (const e of enemies) {
          if (e.health <= 0 || e.state === 'dead' || e.grabbed) continue;
          const dx = f.x - e.cx();
          if (Math.abs(dx) > 420 || Math.abs(f.y - e.cy()) > 220) continue;
          e.vx = lerp(e.vx, Math.sign(dx) * Math.min(9, Math.abs(dx) * 0.06 + 2), 0.2);
        }
        if (f.t % 3 === 0) spawnParticles(f.x + rnd(-140, 140), f.y + rnd(-90, 90), '#8866ff', 1,
                                          { speed: 0.3, life: 18, maxLife: 18, size: 2, gravity: false });
      }
      if (f.t === 70) {
        shake(20);
        applyHitStop(12);
        spawnVoidBurst(f.x, f.y);
        for (const e of enemies) {
          if (e.health <= 0 || e.state === 'dead') continue;
          if (dist(e.cx(), e.cy(), f.x, f.y) < 150) dealDamage(ax, e, 44, 16, true);
        }
      }
      if (f.t > 96) act4Fx.splice(i, 1);
    }
  }
}

// ─── Enemies ──────────────────────────────────────────────────────────────────
// The erased: the rest of the people who stepped through. Nothing in them was
// left to keep, not even a name. They move because they were moving.
class ErasedOne extends Enemy {
  constructor(x, y) {
    super(x, y, { type: 'erased', health: 34, damage: 8, kbForce: 6, speed: 1.6,
                  aggression: 0.5, color: '#26262e', attackRange: 52 });
    this.skinColor = '#2c2c34';
  }
  _onDeath() {
    spawnParticles(this.cx(), this.cy(), '#55556a', 12, { speed: 2.5, life: 34, maxLife: 34, size: 3, gravity: false });
  }
  draw() {
    if (this.state === 'dead') return;
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(frameCount * 0.21 + this.x * 0.01) * 0.2;
    super.draw();
    ctx.restore();
  }
}

// What Anders, Seraph and VAEL became. They kept their names; nothing else.
// `ffa` ones are the three themselves: they fight Axiom and each other, and at
// zero health they withdraw rather than die. Lesser ones are their domains'
// reach, sent into his network.
class VoidMonster extends Enemy {
  constructor(x, y, kind, lesser) {
    const base = {
      null:   { health: 230, damage: 14, speed: 2.2, attackRange: 62 },
      seraph: { health: 250, damage: 11, speed: 1.5, attackRange: 66 },
      vael:   { health: 200, damage: 13, speed: 3.0, attackRange: 58 },
    }[kind];
    super(x, y, {
      type: kind + (lesser ? '_lesser' : ''),
      health: lesser ? Math.round(base.health * 0.28) : base.health,
      damage: lesser ? Math.round(base.damage * 0.75) : base.damage,
      kbForce: lesser ? 7 : 10, speed: base.speed, aggression: 0.85,
      attackRange: base.attackRange, color: '#0b0b10',
      h: lesser ? 50 : 64, w: lesser ? 22 : 26,
    });
    this.kind     = kind;
    this.glow     = ACT4_COLORS[kind];
    this.isMonster = !lesser;
    this.lesser   = !!lesser;
    this._ffaIn   = 0;
    this._special = rndInt(60, 140);
    this._dash    = 0;
    this._dashHit = false;
    this.attackCooldown = 40;
  }

  _pickTarget() {
    let best = null, bd = Infinity;
    const opts = [axiomPlayer, ...enemies.filter(e => e !== this && e.isMonster)];
    for (const o of opts) {
      if (!o || o.health <= 0 || o.state === 'dead') continue;
      let d = Math.abs(o.cx() - this.cx());
      if (o === axiomPlayer) d -= 90;
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  _runAI() {
    if (this.isMonster) {
      if (--this._ffaIn <= 0 || !this.aiTarget || this.aiTarget.health <= 0 || this.aiTarget.state === 'dead') {
        this.aiTarget = this._pickTarget();
        this._ffaIn   = 50;
      }
      this._retargetIn = 999;
    }
    if (this._dash > 0) { this._tickDash(); return; }
    if (--this._special <= 0 && this.aiTarget && this.aiTarget.health > 0) {
      this._special = this.lesser ? rndInt(170, 240) : rndInt(110, 170);
      if (this._useSpecial()) return;
    }
    super._runAI();
  }

  _useSpecial() {
    const t  = this.aiTarget;
    const dx = t.cx() - this.cx();
    if (this.kind === 'null' && Math.abs(dx) > 130 && Math.abs(dx) < 520) {
      // Gone, and then behind you
      spawnParticles(this.cx(), this.cy(), this.glow, 12, { speed: 4, life: 20, maxLife: 20, size: 3, gravity: false });
      const side = t.facing ? -t.facing : -Math.sign(dx);
      this.x = clamp(t.cx() + side * 44 - this.w / 2, 0, levelWidth - this.w);
      this.y = Math.min(this.y, t.y + t.h - this.h);
      this.facing = t.cx() > this.cx() ? 1 : -1;
      spawnParticles(this.cx(), this.cy(), this.glow, 12, { speed: 4, life: 20, maxLife: 20, size: 3, gravity: false });
      this._startAttack();
      return true;
    }
    if (this.kind === 'vael' && Math.abs(dx) < 460) {
      // First through every door
      this.facing   = Math.sign(dx) || 1;
      this._dash    = 16;
      this._dashHit = false;
      return true;
    }
    if (this.kind === 'seraph') {
      this._pulse = 40;
      return false;
    }
    return false;
  }

  _tickDash() {
    this._dash--;
    this.vx    = this.facing * (this.lesser ? 9 : 12);
    this.state = 'chase';
    if (frameCount % 2 === 0) this.trail.push({ x: this.cx(), y: this.cy(), life: 14 });
    if (this.trail.length > 10) this.trail.shift();
    if (this._dashHit) return;
    const hitList = [axiomPlayer, ...companions, ...(this.isMonster ? enemies.filter(e => e !== this && e.isMonster) : [])];
    for (const o of hitList) {
      if (!o || o.health <= 0 || o.state === 'dead') continue;
      if (Math.abs(o.cx() - this.cx()) < 30 && Math.abs(o.cy() - this.cy()) < 40) {
        dealDamage(this, o, o.isMonster ? 6 : this.damage, 9, false);
        spawnHitSpark(o.cx(), o.cy(), this.facing);
        this._dashHit = true;
        break;
      }
    }
  }

  update() {
    for (const t of this.trail) t.life--;
    super.update();
    if (this.state === 'dead') return;
    // Seraph was made to give. The void turned it around: everything near her is taken from.
    if (this.kind === 'seraph' && this._pulse > 0 && this.state !== 'knockdown') {
      this._pulse--;
      if (this._pulse === 1) {
        const r = this.lesser ? 100 : 140;
        const near = [axiomPlayer, ...companions, ...(this.isMonster ? enemies.filter(e => e !== this && e.isMonster) : [])];
        for (const o of near) {
          if (!o || o.health <= 0 || o.state === 'dead') continue;
          if (dist(o.cx(), o.cy(), this.cx(), this.cy()) > r) continue;
          dealDamage(this, o, this.lesser ? 4 : 7, 0, false);
          o.vx += Math.sign(this.cx() - o.cx()) * 4;
          spawnParticles(o.cx(), o.cy(), this.glow, 4, { speed: 2, life: 16, maxLife: 16, size: 2, gravity: false });
        }
      }
    }
  }

  _updateAttack() {
    const t = this.aiTarget ?? axiomPlayer;
    if (this.stateTimer >= 8 && this.stateTimer <= 16 && t && t.health > 0) {
      if (dist(this.cx(), this.cy(), t.cx(), t.cy()) < this.attackRange + 10) {
        dealDamage(this, t, t.isMonster ? Math.ceil(this.damage * 0.5) : this.damage, this.kbForce, false);
        spawnHitSpark(t.cx(), t.cy(), this.facing);
      }
    }
    if (this.stateTimer > 28) this.state = 'idle';
  }

  _onDeath() {
    // They do not die. They leave.
    spawnParticles(this.cx(), this.cy(), this.glow, this.lesser ? 12 : 26,
                   { speed: this.lesser ? 4 : 7, life: 30, maxLife: 30, size: 3, gravity: false });
    if (!this.lesser) { spawnVoidBurst(this.cx(), this.cy()); shake(10); }
  }

  draw() {
    if (this.state === 'dead') return;
    for (const t of this.trail) {
      if (t.life <= 0) continue;
      ctx.globalAlpha = (t.life / 14) * 0.3;
      ctx.fillStyle   = this.glow;
      ctx.beginPath();
      ctx.arc(t.x - camX, t.y, this.lesser ? 5 : 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.kind === 'seraph') {
      const r = this.lesser ? 100 : 140;
      const charge = this._pulse > 0 ? 1 - this._pulse / 40 : 0;
      ctx.save();
      ctx.globalAlpha = 0.07 + charge * 0.2;
      ctx.strokeStyle = this.glow;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(this.cx() - camX, this.cy(), r * (1 - charge * 0.25), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    super.draw();
  }

  _drawBody(sx, sy) {
    const headR = this.lesser ? 7 : 8.5;
    const scale = (this.h - headR * 1.9) / RIG_NECK_HEIGHT;
    const [state, t] = this._figureState(scale);
    this._seed = this._seed ?? Math.random() * 400;
    const j = rigPose(state, t, sx + this.w / 2, sy + this.h, this.h, headR, this.facing, this._seed);
    ctx.save();
    ctx.shadowColor = this.glow;
    ctx.shadowBlur  = this.lesser ? 6 : 12;
    const head = drawRigFigure(j, { headR, skin: '#0b0b10', body: '#0b0b10', limbs: '#0b0b10',
                                    line: this.glow, edge: this.glow, eye: false,
                                    limbW: this.lesser ? 2.8 : 3.4, torsoW: this.lesser ? 3.4 : 4.2,
                                    white: this._flashWhite });
    ctx.fillStyle = this.glow;
    ctx.beginPath();
    ctx.arc(head.x + j.facing * head.r * 0.42, head.y, Math.max(1.6, head.r * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return j;
  }

  _drawHealthBar(sx, sy) {
    if (this.health >= this.maxHealth) return;
    const bw = this.lesser ? 40 : 56, bh = 4;
    const bx = sx + this.w / 2 - bw / 2;
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, sy - 12, bw, bh);
    ctx.fillStyle = this.glow;
    ctx.fillRect(bx, sy - 12, bw * (this.health / this.maxHealth), bh);
  }
}

function createAct4Enemy(type, x, y) {
  switch (type) {
    case 'erased':        return new ErasedOne(x, y);
    case 'null_m':        return new VoidMonster(x, y, 'null', false);
    case 'seraph_m':      return new VoidMonster(x, y, 'seraph', false);
    case 'vael_m':        return new VoidMonster(x, y, 'vael', false);
    case 'null_shade':    return new VoidMonster(x, y, 'null', true);
    case 'seraph_drain':  return new VoidMonster(x, y, 'seraph', true);
    case 'vael_echo':     return new VoidMonster(x, y, 'vael', true);
  }
  return null;
}

// ─── Collectors (the network chapter's "companions") ──────────────────────────
// Vanguard rules hold: enemies go for them, and every hit drains RESOLVE.
class Collector extends Companion {
  constructor(x, y, name) {
    super(x, y, { name, color: '#1a1430', w: 26, h: 92 });
    this.health = this.maxHealth = 120;
    this.y = _a4FloorY() - this.h;
  }
  enterHurt()      { this.flashTimer = 8; }
  enterKnockdown() { this.flashTimer = 12; }
  update() {
    if (this.invincibleFrames > 0) this.invincibleFrames--;
    if (this.flashTimer > 0) this.flashTimer--;
    this.vx = 0;
    this.vy = 0;
  }
  draw() {
    const sx = this.x - camX, sy = this.y;
    const life = this.health / this.maxHealth;
    const pulse = 0.5 + Math.sin(frameCount * 0.07 + this.x) * 0.2;
    ctx.save();
    if (this.flashTimer > 0 && Math.floor(this.flashTimer / 2) % 2) ctx.globalAlpha = 0.5;
    // Housing
    ctx.fillStyle = '#120e22';
    ctx.strokeStyle = '#3a2c66';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + 2, sy + this.h);
    ctx.lineTo(sx + 6, sy + 10);
    ctx.lineTo(sx + this.w / 2, sy);
    ctx.lineTo(sx + this.w - 6, sy + 10);
    ctx.lineTo(sx + this.w - 2, sy + this.h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // The fracture it holds open
    ctx.strokeStyle = `rgba(160,110,255,${(0.35 + pulse * 0.5) * (0.3 + life * 0.7)})`;
    ctx.shadowColor = '#8866ff';
    ctx.shadowBlur  = 10 * life;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(sx + this.w / 2, sy + 12);
    ctx.lineTo(sx + this.w / 2 - 4, sy + 34);
    ctx.lineTo(sx + this.w / 2 + 3, sy + 52);
    ctx.lineTo(sx + this.w / 2 - 2, sy + 74);
    ctx.lineTo(sx + this.w / 2 + 1, sy + this.h - 6);
    ctx.stroke();
    ctx.restore();
  }
}

function createAct4Companion(name, x, y) {
  if (name.startsWith('collector')) {
    return new Collector(x, y, 'COLLECTOR ' + name.split(' ')[1]);
  }
  return null;
}

// ─── World draw (inside the zoomed layer) ─────────────────────────────────────
function act4DrawWorld() {
  if (!_a4Ch()?.cosmic) return;
  _a4DrawVessel();
  _a4DrawWatcher();
  for (const f of act4Fx) {
    const sx = f.x - camX;
    if (f.kind === 'flip') {
      const p = f.t / 30;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.7;
      ctx.strokeStyle = '#d8d4ff';
      ctx.lineWidth   = 3 * (1 - p) + 1;
      ctx.beginPath();
      ctx.ellipse(sx, f.y, 40 + p * 220, 14 + p * 60, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Arrows pointing the wrong way
      ctx.fillStyle = '#d8d4ff';
      for (let k = -2; k <= 2; k++) {
        const ax = sx + k * 70, ay = f.y + 30 - p * 80;
        ctx.beginPath();
        ctx.moveTo(ax, ay - 8); ctx.lineTo(ax - 6, ay + 4); ctx.lineTo(ax + 6, ay + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    if (f.kind === 'hand') {
      // A constructed hand assembling above, then falling
      const fall = clamp((f.t - 6) / 10, 0, 1);
      const top  = f.y - 190 + fall * 166;
      const a    = f.t < 6 ? f.t / 6 : f.t > 26 ? Math.max(0, 1 - (f.t - 26) / 8) : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowColor = '#cc00ee';
      ctx.shadowBlur  = 14;
      ctx.strokeStyle = '#ff66ff';
      ctx.fillStyle   = 'rgba(40,6,50,0.85)';
      ctx.lineWidth   = 2;
      roundedRect(sx - 22, top - 30, 44, 34, 6);
      ctx.fill();
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(sx - 16 + k * 10.5, top + 4);
        ctx.lineTo(sx - 16 + k * 10.5, top + 18);
        ctx.stroke();
      }
      // Construction lines the hand is drawn down along
      ctx.globalAlpha = a * 0.35;
      ctx.beginPath();
      ctx.moveTo(sx - 22, top - 30); ctx.lineTo(sx - 22, top - 120);
      ctx.moveTo(sx + 22, top - 30); ctx.lineTo(sx + 22, top - 120);
      ctx.stroke();
      ctx.restore();
    }
    if (f.kind === 'hole') {
      const grow = Math.min(1, f.t / 20);
      const r    = f.t < 70 ? 26 * grow : Math.max(0, 26 + (f.t - 70) * 6);
      const a    = f.t < 70 ? 1 : Math.max(0, 1 - (f.t - 70) / 26);
      ctx.save();
      ctx.globalAlpha = a;
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k === 1 ? '#c8b8ff' : '#7755dd';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.ellipse(sx, f.y, r * (2.2 + k * 0.6), r * (0.55 + k * 0.12), f.t * 0.05 * (k % 2 ? -1 : 1), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(sx, f.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function _a4DrawWatcher() {
  const w = act4Watcher;
  if (!w || w.alpha <= 0) return;
  const sx = w.x - camX;
  const headR = 7.5;
  const scale = (w.h - headR * 1.9) / RIG_NECK_HEIGHT;
  if (hitStopFrames <= 0) w._rigDist += Math.abs(w.vx);
  const moving = Math.abs(w.vx) > 0.3;
  const state  = w.mode === 'touching' ? 'reach' : moving ? 'run' : 'idle';
  const t      = w.mode === 'touching' ? Math.min(w.t, 18)
               : moving ? w._rigDist / (RIG_RUN_STRIDE * scale) * FigureRig.CLIPS.run.dur : frameCount;
  const j = rigPose(state, t, sx + w.w / 2, w.y + w.h, w.h, headR, w.facing, w.seed);
  ctx.save();
  ctx.globalAlpha = w.alpha;
  const head = drawRigFigure(j, { headR, skin: '#140a0e', body: '#140a0e', limbs: '#140a0e',
                                  line: '#3a1420', edge: '#3a1420', eye: false, limbW: 3, torsoW: 3.6 });
  // Two embers, unblinking
  ctx.shadowColor = 'rgba(255,60,80,0.9)';
  ctx.shadowBlur  = 6;
  ctx.fillStyle   = 'rgba(255,80,95,0.85)';
  ctx.beginPath(); ctx.arc(head.x + w.facing * 1.5 - 2.4, head.y - 1, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(head.x + w.facing * 1.5 + 2.4, head.y - 1, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function _a4DrawVessel() {
  const v = act4Vessel;
  if (!v) return;
  const sx = v.x - camX;
  const fy = v.y;
  // Plinth
  ctx.fillStyle = '#1e0a24';
  ctx.strokeStyle = '#661177';
  ctx.lineWidth = 1.5;
  ctx.fillRect(sx - 34, fy - 14, 68, 14);
  ctx.strokeRect(sx - 34, fy - 14, 68, 14);

  if (v.state !== 'broken') {
    // The vessel: a body standing empty, filling with what he gives it
    const j = rigPose('idle', 0, sx, fy - 14, 58, 8, -1, 11);
    const jitter = v.state === 'intercepted' ? 1.5 + (v.touched || 0) * 3 : 0;
    ctx.save();
    if (jitter) ctx.translate(rnd(-jitter, jitter), rnd(-jitter * 0.5, jitter * 0.5));
    ctx.shadowColor = v.touched ? '#ff3355' : '#c8b8ff';
    ctx.shadowBlur  = 4 + v.fill * 16;
    const fillCol = v.touched
      ? `rgba(${Math.round(lerp(200, 255, v.touched))},${Math.round(lerp(190, 70, v.touched))},${Math.round(lerp(255, 100, v.touched))},${0.2 + v.fill * 0.7})`
      : `rgba(200,190,255,${0.15 + v.fill * 0.75})`;
    drawRigFigure(j, { headR: 8, skin: fillCol, body: fillCol, limbs: fillCol, line: '#d8ccff',
                       edge: 'rgba(120,100,180,0.5)', eye: false, limbW: 3, torsoW: 3.8 });
    ctx.restore();
    // Something reaching into the stream from the far side
    if (v.state === 'intercepted') {
      const a = Math.min(1, v.t / 60);
      ctx.save();
      ctx.globalAlpha = a * (0.5 + Math.sin(frameCount * 0.3) * 0.2);
      ctx.strokeStyle = '#05030a';
      ctx.shadowColor = '#4a2a88';
      ctx.shadowBlur  = 10;
      ctx.lineWidth   = 3;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(sx + (k - 1) * 60, fy - 300);
        ctx.quadraticCurveTo(sx + (k - 1) * 30 + Math.sin(frameCount * 0.05 + k) * 20, fy - 160,
                             sx + (k - 1) * 4, fy - 52);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    // Shards of the vessel, and what came out of it
    ctx.fillStyle = 'rgba(200,190,255,0.4)';
    for (let k = 0; k < 7; k++) {
      ctx.fillRect(sx - 30 + k * 9, fy - 18 - (k % 3) * 2, 5, 3);
    }
    if (v.pAlpha > 0) {
      const psx = v.px - camX;
      const crouch = v.t < 40;
      const j = rigPose(crouch ? 'crouch' : 'run', crouch ? 10 : v.t * 1.6, psx, fy - 14, 56, 8, 1, 31);
      ctx.save();
      ctx.globalAlpha = v.pAlpha;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur  = 14;
      const head = drawRigFigure(j, { headR: 8, skin: '#000000', body: '#000000', limbs: '#000000',
                                      line: '#00ffff', edge: '#00ffff', eye: false, limbW: 3, torsoW: 3.8 });
      ctx.fillStyle = '#e0ffff';
      ctx.beginPath(); ctx.arc(head.x + 3.4, head.y, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// Called inside Axiom.draw while his body is drawn: the shell closing over him.
function act4DrawShellForming(cx, cy) {
  if (_a4Shell <= 0) return;
  const p = 1 - _a4Shell / 50;
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.9;
  ctx.strokeStyle = '#ff66ff';
  ctx.shadowColor = '#cc00ee';
  ctx.shadowBlur  = 12;
  ctx.lineWidth   = 1.5;
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + p * 2;
    const r = 120 * (1 - p) + 14;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r - 30 * (1 - p)), cy + Math.sin(a) * (r - 30 * (1 - p)));
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Overlays (screen space) ──────────────────────────────────────────────────
function act4DrawOverlay() {
  const ch = _a4Ch();
  if (!ch?.cosmic) return;

  // The collapse dims everything around it
  for (const f of act4Fx) {
    if (f.kind !== 'hole' || f.t >= 70) continue;
    ctx.fillStyle = `rgba(0,0,6,${Math.min(0.35, f.t / 70 * 0.35)})`;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }

  // Teach lines
  for (const h of ch.act4Hints ?? []) {
    const dur = h.dur ?? 300;
    const age = _a4Frame - h.t;
    if (age < 0 || age > dur) continue;
    const a = Math.min(1, age / 25) * Math.min(1, (dur - age) / 30);
    ctx.save();
    ctx.globalAlpha = a * 0.92;
    ctx.fillStyle   = 'rgba(0,0,0,0.6)';
    ctx.font        = 'bold 15px Courier New';
    const text      = _a4Keys(h.text);
    const tw        = ctx.measureText(text).width;
    ctx.fillRect(GAME_W / 2 - tw / 2 - 14, GAME_H * 0.27 - 20, tw + 28, 30);
    ctx.fillStyle   = '#e8dcff';
    ctx.textAlign   = 'center';
    ctx.fillText(text, GAME_W / 2, GAME_H * 0.27);
    ctx.restore();
  }

  if (ch.bearerCount) {
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = '#8a84a8';
    ctx.font        = 'bold 10px Courier New';
    ctx.fillText('B E A R E R S   R E C O R D E D', GAME_W / 2, 48);
    ctx.fillStyle   = '#ece8ff';
    ctx.font        = 'bold 26px Courier New';
    const cleared = enemies.every(e => e.health <= 0 || e.state === 'dead');
    ctx.fillText(String(cleared ? 94 : _a4Shown), GAME_W / 2, 76);
    ctx.restore();
  }
}

// ─── Backgrounds (unzoomed, parallax) ─────────────────────────────────────────
function drawAct4Background(key) {
  if (key === 'void_wake')  _a4BgVoidWake();
  if (key === 'void_forge') _a4BgForge();
  if (key === 'network')    _a4BgNetwork();
}

// Where he woke: no sky, no horizon, pieces of the world they left drifting past
function _a4BgVoidWake() {
  ctx.fillStyle = '#030208';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  const glows = [[0.18, 0.32, ACT4_COLORS.null], [0.55, 0.22, ACT4_COLORS.seraph], [0.86, 0.36, ACT4_COLORS.vael]];
  for (const [gx, gy, col] of glows) {
    const x = GAME_W * gx - camX * 0.04;
    const g = ctx.createRadialGradient(x, GAME_H * gy, 0, x, GAME_H * gy, 260);
    g.addColorStop(0, col + '30');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }
  // Drifting fragments of street: a kerb, a window, a lamp post
  for (let i = 0; i < 14; i++) {
    const par = 0.15 + (i % 3) * 0.12;
    const x = ((i * 271 - camX * par) % (GAME_W + 200) + GAME_W + 200) % (GAME_W + 200) - 100;
    const y = 60 + (i * 97) % 260 + Math.sin(frameCount * 0.01 + i) * 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(frameCount * 0.004 + i) * 0.6 + i);
    ctx.globalAlpha = 0.25 + (i % 3) * 0.12;
    ctx.fillStyle   = i % 4 === 0 ? '#2a2630' : '#1a1720';
    ctx.fillRect(-14 - (i % 3) * 6, -4, 28 + (i % 3) * 12, 8 + (i % 2) * 6);
    if (i % 5 === 0) { ctx.fillStyle = 'rgba(220,200,140,0.18)'; ctx.fillRect(-4, -2, 8, 6); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  const fog = ctx.createLinearGradient(0, GAME_H - 140, 0, GAME_H);
  fog.addColorStop(0, 'transparent');
  fog.addColorStop(1, 'rgba(40,20,70,0.5)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
}

// The workshop: half-built geometry, magenta construction lines
function _a4BgForge() {
  ctx.fillStyle = '#07030a';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.save();
  ctx.strokeStyle = 'rgba(204,0,238,0.10)';
  ctx.lineWidth   = 1;
  const off = -(camX * 0.2) % 60;
  for (let x = off; x < GAME_W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_H); ctx.stroke(); }
  for (let y = 20; y < GAME_H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke(); }
  // Frames of things not finished yet
  for (let i = 0; i < 6; i++) {
    const x = ((i * 330 - camX * 0.35) % (GAME_W + 400) + GAME_W + 400) % (GAME_W + 400) - 200;
    const h = 120 + (i % 3) * 60;
    ctx.strokeStyle = `rgba(255,102,255,${0.12 + (i % 2) * 0.08})`;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(x, GAME_H - 110 - h, 70 + (i % 2) * 50, h);
    ctx.beginPath();
    ctx.moveTo(x, GAME_H - 110 - h);
    ctx.lineTo(x + 70 + (i % 2) * 50, GAME_H - 110);
    ctx.stroke();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(GAME_W / 2, GAME_H * 0.3, 0, GAME_W / 2, GAME_H * 0.3, 420);
  g.addColorStop(0, 'rgba(120,0,140,0.16)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
}

// The network: fractures threaded across a dark sky, collectors in the distance
function _a4BgNetwork() {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_H);
  sky.addColorStop(0, '#06040e');
  sky.addColorStop(1, '#120a22');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.save();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const x0 = ((i * 260 - camX * 0.08) % (GAME_W + 300) + GAME_W + 300) % (GAME_W + 300) - 150;
    ctx.strokeStyle = `rgba(150,110,255,${0.18 + Math.sin(frameCount * 0.03 + i) * 0.08})`;
    ctx.shadowColor = '#7755dd';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    let x = x0, y = 0;
    ctx.moveTo(x, y);
    for (let s = 0; s < 7; s++) {
      x += ((i * 7 + s * 13) % 11 - 5) * 6;
      y += 34 + (s * i) % 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // Distant collectors
  for (let i = 0; i < 9; i++) {
    const x = ((i * 180 - camX * 0.3) % (GAME_W + 200) + GAME_W + 200) % (GAME_W + 200) - 100;
    const h = 50 + (i % 3) * 24;
    const y = GAME_H - 100;
    ctx.fillStyle = '#0e0a1c';
    ctx.beginPath();
    ctx.moveTo(x - 8, y); ctx.lineTo(x, y - h); ctx.lineTo(x + 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(170,130,255,${0.4 + Math.sin(frameCount * 0.05 + i) * 0.2})`;
    ctx.fillRect(x - 1, y - h + 6, 2, 4);
  }
  ctx.restore();
}

// ─── Chapters ─────────────────────────────────────────────────────────────────
CHAPTERS.push(

  // ══════════════════════════════════════════════════════════════════════════
  // 12 — PLAY: "Names"
  // He wakes changed. Three things he can't recognise. The war starts.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 12, type: 'play',
    title: 'ACT IV', subtitle: 'Names',
    width: 2500, background: 'void_wake',
    cosmic: 1, look: 'cosmic',
    axiomStart: { x: 120, y: 386 },
    platforms: [
      { x: 0,    y: 440, w: 2500, h: 80 },
      { x: 420,  y: 360, w: 120, h: 16 },
      { x: 900,  y: 340, w: 140, h: 16 },
      { x: 1500, y: 350, w: 130, h: 16 },
      { x: 2000, y: 340, w: 150, h: 16 },
    ],
    enemies: [
      { type: 'erased',   x: 520,  y: 388 },
      { type: 'erased',   x: 700,  y: 388 },
      { type: 'erased',   x: 860,  y: 388 },
      { type: 'erased',   x: 1040, y: 388 },
      { type: 'vael_m',   x: 1500, y: 374 },
      { type: 'null_m',   x: 1850, y: 374 },
      { type: 'seraph_m', x: 2200, y: 374 },
    ],
    companionNames: [], companionStarts: [], weaponPickups: [],
    act4Hints: [
      { t: 200, text: '{heavy}: you are larger than you were', dur: 320 },
      { t: 560, text: '{jump} again in the air: down belongs to you now', dur: 340 },
    ],
    preText: [
      { text: 'He woke.' },
      { text: 'There was no ground. Then there was, because he expected it.', pause: 3000 },
      { text: 'Something in him was enormous now.', pause: 2600 },
      { text: 'He did not ask what it was. He never had.', pause: 3000 },
    ],
    postText: [
      { text: 'They did not fall. They left.' },
      { text: 'Three of them. He had no names for them.', pause: 2800 },
      { text: 'They had kept their names. Nothing else.', pause: 3000 },
      { text: 'One of them had said "I trust you" the night before.', pause: 3000 },
      { text: 'Nobody there remembered it.', pause: 3000 },
      { text: 'The war began that day. Nobody declared it.', pause: 3200 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 13 — INTERLUDE: "A Shell That Runs"
  // The cosmos only breaks things. He builds a body that can make them.
  // Someone is standing at his shoulder.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 13, type: 'interlude',
    title: 'ACT IV', subtitle: 'A Shell That Runs',
    width: 2000, background: 'void_forge',
    cosmic: 1, look: 'cosmic',
    watcher: { x: 1230, hidden: true },
    axiomStart: { x: 80, y: 386 },
    platforms: [{ x: 0, y: 440, w: 2000, h: 80 }],
    enemies: [], companionNames: [], companionStarts: [], weaponPickups: [],
    endTriggerX: 1880,
    dialogues: [
      { x: 140,  text: 'What the void gave him could only break things.',          duration: 240 },
      { x: 340,  text: 'Stars, if he wanted. Gravity, if he wanted.',              duration: 220 },
      { x: 500,  text: 'Nothing that stayed.',                                     duration: 190 },
      { x: 640,  speaker: 'axiom', text: 'I need hands that can make something.',  duration: 240 },
      { x: 800,  text: 'So he made a body that could.',                            duration: 220, event: 'shell' },
      { x: 960,  text: 'A shell that ran the ordinary laws, over the thing that didn\'t.', duration: 280 },
      { x: 1180, text: 'Someone was standing at his shoulder.',                    duration: 240, event: 'watcher_in' },
      { x: 1380, speaker: 'axiom', text: 'You. I made you, didn\'t I?',            duration: 240 },
      { x: 1500, text: 'His registry checked. It came back: controlled.',          duration: 250 },
      { x: 1620, text: 'It came back with what it was shown.',                     duration: 240 },
      { x: 1740, text: 'It had been here long before he broke in.',                duration: 250 },
      { x: 1840, text: 'It let him think he had made it.',                         duration: 260 },
    ],
    preText: null, postText: null,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 14 — VANGUARD: "The Network"
  // He can't reach them, so he builds a way to reach everything. Their domains
  // come for it.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 14, type: 'vanguard',
    resolve: 130, braceHint: true,
    vgText: {
      hint: 'Their reach goes for the collectors unless you are in the way.',
      fail: 'THE NETWORK FELL',
      failLine: 'He built it again. It took a thousand years.',
    },
    title: 'ACT IV', subtitle: 'The Network',
    width: 2200, background: 'network',
    cosmic: 2, look: 'creator',
    watcher: { x: 150 },
    axiomStart: { x: 520, y: 386 },
    platforms: [
      { x: 0,    y: 440, w: 2200, h: 80 },
      { x: 700,  y: 360, w: 130, h: 16 },
      { x: 1100, y: 340, w: 150, h: 16 },
      { x: 1550, y: 355, w: 130, h: 16 },
      { x: 1900, y: 345, w: 140, h: 16 },
    ],
    enemies: [
      { type: 'null_shade',   x: 900,  y: 388 },
      { type: 'vael_echo',    x: 1050, y: 388 },
      { type: 'seraph_drain', x: 1250, y: 388 },
      { type: 'null_shade',   x: 1400, y: 388 },
      { type: 'vael_echo',    x: 1550, y: 388 },
      { type: 'null_shade',   x: 1700, y: 388 },
      { type: 'seraph_drain', x: 1850, y: 388 },
      { type: 'vael_echo',    x: 1950, y: 388 },
      { type: 'null_shade',   x: 2050, y: 388 },
      { type: 'seraph_drain', x: 2120, y: 388 },
    ],
    companionNames:  ['collector I', 'collector II', 'collector III'],
    companionStarts: [
      { name: 'collector I',   x: 260, y: 348 },
      { name: 'collector II',  x: 360, y: 348 },
      { name: 'collector III', x: 460, y: 348 },
    ],
    weaponPickups: [],
    act4Hints: [
      { t: 460, text: '{super}: the shell builds a hand, and the hand comes down', dur: 340 },
    ],
    preText: [
      { text: 'He could not reach them. He could not even name them.' },
      { text: 'So he built a way to reach everything.', pause: 3000 },
    ],
    postText: [
      { text: 'Fractures, threaded through every world that would hold one.' },
      { text: 'Collectors, to carry back whatever the fractures found.', pause: 3000 },
      { text: 'He called it a weapon.', pause: 2400 },
      { text: 'It was also a wall.', sub: 'He meant to turn it on the dark one day. The war came first.', pause: 4200 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 15 — INTERLUDE: "The Vessel"
  // He builds an ally. Something reaches into it. The figure at his shoulder
  // touches it once. What comes out belongs to no one.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 15, type: 'interlude',
    title: 'ACT IV', subtitle: 'The Vessel',
    width: 2000, background: 'void_forge',
    cosmic: 2, look: 'creator',
    watcher: { x: 40, follow: true },
    vessel: { x: 1180 },
    axiomStart: { x: 80, y: 386 },
    platforms: [{ x: 0, y: 440, w: 2000, h: 80 }],
    enemies: [], companionNames: [], companionStarts: [], weaponPickups: [],
    endTriggerX: 1880,
    dialogues: [
      { x: 200,  text: 'He wanted an ally. Someone who would not forget him.',     duration: 260 },
      { x: 420,  speaker: 'axiom', text: 'Stand with me. That\'s all I\'ll ask.',  duration: 240 },
      { x: 620,  text: 'He poured the cosmos into it.',                            duration: 220, event: 'stream' },
      { x: 860,  text: 'Something reached into the stream from the far side.',     duration: 260, event: 'intercept' },
      { x: 1040, text: 'The figure at his shoulder touched it once.',              duration: 250, event: 'touch' },
      { x: 1220, text: 'Axiom was watching the vessel. He saw nothing.',           duration: 260 },
      { x: 1400, text: 'What came out belonged to no one.',                        duration: 250, event: 'break' },
      { x: 1580, speaker: 'axiom', text: '...Wait.',                               duration: 200 },
      { x: 1740, text: 'It didn\'t.',                                              duration: 240 },
    ],
    preText: null, postText: null,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 16 — PLAY: "Ninety-Four"
  // Crystals start turning up in ordinary people. He keeps every one. Five
  // thousand years, and then the count moves again.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 16, type: 'play',
    title: 'ACT IV', subtitle: 'Ninety-Four',
    width: 2800, background: 'network',
    cosmic: 3, look: 'creator',
    bearerCount: true,
    watcher: { x: 60, follow: true },
    axiomStart: { x: 140, y: 386 },
    platforms: [
      { x: 0,    y: 440, w: 2800, h: 80 },
      { x: 400,  y: 360, w: 130, h: 16 },
      { x: 850,  y: 345, w: 140, h: 16 },
      { x: 1300, y: 355, w: 130, h: 16 },
      { x: 1750, y: 340, w: 150, h: 16 },
      { x: 2250, y: 350, w: 140, h: 16 },
    ],
    enemies: [
      { type: 'null_shade',   x: 600,  y: 388 },
      { type: 'vael_echo',    x: 760,  y: 388 },
      { type: 'seraph_drain', x: 950,  y: 388 },
      { type: 'null_shade',   x: 1150, y: 388 },
      { type: 'vael_echo',    x: 1300, y: 388 },
      { type: 'seraph_drain', x: 1500, y: 388 },
      { type: 'vael_m',       x: 1900, y: 374 },
      { type: 'null_m',       x: 2250, y: 374 },
      { type: 'seraph_m',     x: 2600, y: 374 },
    ],
    companionNames: [], companionStarts: [], weaponPickups: [],
    act4Hints: [
      { t: 240, text: '{super} with the meter full: everything near falls inward', dur: 340 },
    ],
    preText: [
      { text: 'Crystals began turning up in people. Ordinary people.' },
      { text: 'Each one won fights it had no right to win.', pause: 2800 },
      { text: 'Then the crystal killed it.', pause: 2600 },
      { text: 'He could not unmake them. So he collected them.', pause: 3000 },
      { text: 'He never once thought of a torn bag.', pause: 3400 },
    ],
    postText: [
      { text: 'Five thousand years.' },
      { text: 'He kept every crystal.', sub: 'He thought he was keeping them.', pause: 3800 },
      { text: 'Ninety-four.', pause: 3000 },
      { text: 'Then the count moved again.', pause: 3000 },
      { text: 'Every universe has a seam.', pause: 2800 },
      { text: 'This one opened on a Tuesday.', pause: 3400 },
      { text: 'He sent scouts that same week.', pause: 3000 },
      { text: 'The 95th.', pause: 4600 },
    ],
  },
);
