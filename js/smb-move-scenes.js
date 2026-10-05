'use strict';
// smb-move-scenes.js — every ability (Q) and super (E) runs as a short scripted
// scene: the performer's body, weapon and anything it grabs are posed and moved
// by the scene, frame by frame, instead of by physics.
//
// THE CONTRACT
//  - Nobody outside the scene can interrupt it. The performer has armor every
//    frame (damage lands, nothing moves or stuns them), cannot be grabbed by
//    another scene, and their input and AI are locked out. A grabbed victim is
//    held by the scene; outside hits still damage them but cannot move them.
//  - The way out is from the inside: a held victim with a full super meter
//    presses super and breaks the hold (MoveScene.breakOut). The performer is
//    thrown back and staggered, and the break has its own look so both players
//    can tell what happened.
//  - A shield raised before the opener connects stops a grab move, and a parry
//    stops it cold. Locks only start on a clean hit.
//
// RING-OUTS
// A scene only ever moves bodies across ground. The stage span under the
// performer is measured when the scene starts and every scripted position is
// kept inside it, so a dash, a carry or a juggle can never walk anyone off a
// ledge. Only the final launch leaves the scene's hands: an ability's (Q)
// launch is softened when the victim is close to the ledge it points at, a
// super's (E) is not — a super is a kill move. Everyone the scene let go of in
// the air gets their air jump back.
//
// Depends on: smb-combat.js (dealDamage, isHostileTarget, worldLeftBound),
//   smb-particles-core.js (spawnParticles, spawnRing), smb-fighter.js (Fighter,
//   CLASH_TIER_*). Choreography lives in smb-move-scenes-defs.js.
// Ticked from smb-loop-core.js after fighter physics; drawn after the fighters.
// ============================================================

const MS_DEFS = {};                 // 'axe:q' -> scene definition
const MS_BREAK_IFRAMES  = 40;       // victim's invulnerability after a break
const MS_BREAK_STAGGER  = 28;       // performer's stun after being broken out of
const MS_LEDGE_SOFTEN   = 280;      // an ability launch this close to a ledge is softened
const MS_SPAN_MARGIN    = 14;       // bodies stay this far inside the stage span
const MS_BLEND_OUT      = 8;        // frames to ease from a scene's last pose into the normal one
const MS_KILL_TAIL      = 90;       // a kill this long after a scene ends is still the move's (its projectiles)

// Pose fields, all facing-right canonical (mirrored at draw time). Angles are
// absolute bone directions in canvas space: 0 forward, PI/2 down, -PI/2 up.
//  r / l    weapon arm / off arm (shoulder -> hand), rl / ll reach multipliers
//  w        weapon direction (absolute), wl weapon length (foreshortening)
//  lean     px the shoulders lead the hips, drop px the hips sink
//  fr / fl  planted feet x offsets from the hip (ground stays where it is)
//  lg / lgl leg angles when `air`, ls / lsl leg reach
//  rot      whole-body pitch about the hips (+ = forward)
const MS_POSE_KEYS = ['r', 'l', 'rl', 'll', 'w', 'wl', 'lean', 'drop', 'fr', 'fl', 'lg', 'lgl', 'ls', 'lsl', 'rot'];
const MS_POSE_DEF  = { r: 1.82, l: 1.32, rl: 1, ll: 1, w: 1.82, wl: 1, lean: 0, drop: 0,
                       fr: 7, fl: -7, lg: 1.95, lgl: 1.19, ls: 1, lsl: 1, rot: 0 };

function msDefine(key, def) { MS_DEFS[key] = def; }

function msEase(e, u) {
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  switch (e) {
    case 'lin':  return u;
    case 'in':   return u * u;
    case 'in3':  return u * u * u;
    case 'out':  return 1 - (1 - u) * (1 - u);
    case 'snap': return 1 - Math.pow(1 - u, 4);
    case 'back': { const c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
    case 'hold': return 0;
    case 'step': return u < 1 ? 0 : 1;
    default:     return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }
}

// A track is [{ t, e, ...pose }]. The ease on a key shapes the segment that
// ARRIVES at it; flags (trail, air, hide) are read from the key a segment leaves.
function msSample(track, t) {
  if (!track || !track.length) return null;
  let i = 0;
  while (i < track.length - 1 && track[i + 1].t <= t) i++;
  const a = track[i], b = track[i + 1];
  const out = { trail: !!a.trail, air: !!a.air, hide: !!a.hide, smear: !!a.smear };
  if (!b || t <= a.t) {
    for (const k of MS_POSE_KEYS) out[k] = a[k] !== undefined ? a[k] : (k === 'w' ? (a.r !== undefined ? a.r : MS_POSE_DEF.r) : MS_POSE_DEF[k]);
    return out;
  }
  const u = msEase(b.e || 'io', (t - a.t) / (b.t - a.t));
  for (const k of MS_POSE_KEYS) {
    const dv = k === 'w' ? null : MS_POSE_DEF[k];
    const va = a[k] !== undefined ? a[k] : (k === 'w' ? (a.r !== undefined ? a.r : MS_POSE_DEF.r) : dv);
    const vb = b[k] !== undefined ? b[k] : (k === 'w' ? (b.r !== undefined ? b.r : MS_POSE_DEF.r) : dv);
    out[k] = va + (vb - va) * u;
  }
  if (u >= 0.5) out.air = !!b.air;
  return out;
}

// What Fighter.draw() passes drawWeapon() so the art points along pose.w.
// drawWeapon adds its own grip tilt; this subtracts exactly that tilt back out.
function msWeaponAngle(f, mp) {
  const fc  = f.facing < 0 ? -1 : 1;
  const W   = fc > 0 ? mp.w : Math.PI - mp.w;
  const atk = !!mp.trail;
  const g   = (typeof WEAPON_SWINGS !== 'undefined') ? WEAPON_SWINGS[f.weaponKey] : null;
  let tilt;
  if (atk) tilt = (g && g.tilt !== undefined) ? g.tilt : 0.6;
  else { const c = (g && g.carry && g.carry.tilt) || 0; tilt = fc < 0 ? -c : c; }
  return { a: W - tilt, atk, W };
}

// Blend-out weight for a fighter whose scene just ended (1 = all scene pose).
function msBlendOut(f) {
  const o = f && f._msOut;
  return o && o.t > 0 ? msEase('in', o.t / MS_BLEND_OUT) : 0;
}

// Angle a moved toward b by k along the shorter way round.
function msLerpAngle(a, b, k) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

// ── Ground ──────────────────────────────────────────────────────────────────
function _msPlatforms() {
  return (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
}

// Top of the highest platform at x whose surface is at or below footY.
function _msGroundTop(x, footY, depth) {
  let best = null;
  for (const pl of _msPlatforms()) {
    if (pl.isFloorDisabled || pl.isHidden) continue;
    if (x < pl.x || x > pl.x + pl.w) continue;
    if (pl.y < footY - 14 || pl.y > footY + (depth || 900)) continue;
    if (best === null || pl.y < best) best = pl.y;
  }
  return best;
}

// Horizontal stretch around x that has ground somewhere below footY.
function _msSpan(x, footY) {
  const STEP = 8, MAX = 3200;
  const has = (px) => _msGroundTop(px, footY, 900) !== null;
  let L = x, R = x;
  if (has(x)) {
    while (L - STEP > x - MAX && has(L - STEP)) L -= STEP;
    while (R + STEP < x + MAX && has(R + STEP)) R += STEP;
  } else {
    // Starting over the void (recovering): the span is the nearest ground, so
    // the scene can only carry them back toward the stage.
    let found = null;
    for (let d = STEP; d < 1600 && found === null; d += STEP) {
      if (has(x - d)) found = x - d; else if (has(x + d)) found = x + d;
    }
    if (found === null) return { L: -1e9, R: 1e9, open: true };
    const s = _msSpan(found, footY);
    return { L: Math.min(s.L, x), R: Math.max(s.R, x), open: false };
  }
  if (typeof worldLeftBound === 'function')  L = Math.max(L, worldLeftBound());
  if (typeof worldRightBound === 'function') R = Math.min(R, worldRightBound());
  return { L, R, open: false };
}

function _msAllFighters() {
  const out = [];
  if (typeof players !== 'undefined') for (const p of players) out.push(p);
  if (typeof minions !== 'undefined') for (const m of minions) out.push(m);
  if (typeof trainingDummies !== 'undefined') for (const d of trainingDummies) out.push(d);
  return out;
}

// ── Victim poses (relative to the victim's own facing, which points at the performer)
const MS_VPOSE = {
  reel:    { r: -2.45, l: -2.05, lean: -7, drop: 2, fr: 5, fl: -13 },
  fold:    { r: 1.05, l: 0.75, rl: 0.8, ll: 0.8, lean: 9, drop: 7, fr: 6, fl: -9 },
  lift:    { r: -2.3, l: -1.85, lean: -4, air: true, lg: 2.05, lgl: 1.55, ls: 0.82, lsl: 0.9, rot: -0.45 },
  tumble:  { r: -2.6, l: 2.6, air: true, lg: 2.3, lgl: 0.9, ls: 0.9, lsl: 0.85, rot: 0 },
  skewer:  { r: 2.4, l: 2.1, lean: 6, air: true, lg: 2.1, lgl: 1.7, ls: 0.85, lsl: 0.8, rot: 0.35 },
  frozen:  { r: 1.95, l: 1.1, lean: 3, drop: 1, fr: 9, fl: -9 },
  crumple: { r: 1.6, l: 1.3, rl: 0.7, ll: 0.7, lean: 12, drop: 16, fr: 11, fl: -4 },
};

// ── Scene object ────────────────────────────────────────────────────────────
const MS_PROTO = {
  // Branch-local time: play() restarts it, every event check reads it.
  at(n)       { return this.lprev < n && this.lt >= n; },
  in(a, b)    { return this.lt >= a && this.lt < b; },
  u(a, b, e)  { return msEase(e || 'lin', (this.lt - a) / (b - a)); },
  play(name)  {
    this.track = name; this.t0 = this.t; this.lt = 0; this.lprev = -1e-6;
    const tr = this.def.tracks[name];
    this.len = tr ? tr.len : 0;
  },
  end()       { this.done = true; },

  body(f) {
    let b = this.bodies.get(f);
    if (!b) {
      b = { f, x: f.x, y: f.y, vx: 0, vy: 0, g: 0, kin: false, rot: 0, spin: 0, pose: null };
      this.bodies.set(f, b);
    }
    return b;
  },
  get ub() { return this.body(this.user); },
  ucx() { const b = this.ub; return b.x + this.user.w / 2; },
  ucy() { const b = this.ub; return b.y + this.user.h / 2; },

  // Clamp a body centre into the stage span (and onto the floor beneath it).
  _clampBody(b) {
    const f = b.f, w = f.w || 30, h = f.h || 60;
    let cx = b.x + w / 2;
    const L = this.span.L + MS_SPAN_MARGIN, R = this.span.R - MS_SPAN_MARGIN;
    if (!this.span.open) {
      if (cx < L) { cx = L; if (b.vx < 0) b.vx = 0; }
      if (cx > R) { cx = R; if (b.vx > 0) b.vx = 0; }
    }
    b.x = cx - w / 2;
    const top = _msGroundTop(cx, b.y + h - Math.max(0, b.vy) - 2, 900);
    if (top !== null && b.y + h > top) {
      b.y = top - h;
      if (b.vy > 0) { b.vy = 0; b.landed = true; }
    }
  },

  // Performer: forward motion along facing, never past the span.
  dash(spd) {
    const b = this.ub;
    b.kin = false;
    const before = b.x;
    b.x += this.f * spd * this.dt;
    this._clampBody(b);
    this.user.vx = this.f * spd;                 // afterimage + speed lines read off vx
    this.vars._dashing = true;
    return Math.abs(b.x - before) > Math.abs(spd * this.dt) * 0.5;
  },
  // Set a body moving under its own little ballistic (vx in facing space).
  fling(f, vx, vy, g) {
    const b = this.body(f);
    b.kin = true; b.vx = this.f * vx; b.vy = vy; b.g = g || 0; b.landed = false;
  },
  stop(f) { const b = this.body(f); b.kin = false; b.vx = 0; b.vy = 0; },
  // Victim's centre at (dx, dy) from the performer's centre, in facing space.
  place(f, dx, dy, k) {
    const b = this.body(f);
    const tx = this.ucx() + this.f * dx - f.w / 2, ty = this.ucy() + dy - f.h / 2;
    const kk = k === undefined ? 1 : k;
    b.x += (tx - b.x) * kk; b.y += (ty - b.y) * kk;
    b.kin = false; b.vx = 0; b.vy = 0;
  },
  // Performer jumps (vy < 0 up) under gravity g; lands on the floor it left.
  hop(vy, g) { const b = this.ub; b.kin = true; b.vx = 0; b.vy = vy; b.g = g || 0.6; b.landed = false; },

  // Nearest hostile in front of the performer.
  findFront(reach, vreach, back) {
    const ux = this.ucx(), uy = this.ucy();
    let best = null, bd = 1e9;
    for (const t of _msAllFighters()) {
      if (!this._targetable(t)) continue;
      const rel = (t.cx() - ux) * this.f;
      if (rel < -(back || 12) || rel > reach) continue;
      if (Math.abs(t.cy() - uy) > (vreach || 60)) continue;
      if (rel < bd) { bd = rel; best = t; }
    }
    return best;
  },
  findNear(radius) {
    const ux = this.ucx(), uy = this.ucy();
    let best = null, bd = radius;
    for (const t of _msAllFighters()) {
      if (!this._targetable(t)) continue;
      const d = Math.hypot(t.cx() - ux, t.cy() - uy);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  },
  allNear(radius, front) {
    const ux = this.ucx(), uy = this.ucy(), out = [];
    for (const t of _msAllFighters()) {
      if (!this._targetable(t)) continue;
      const dx = t.cx() - ux;
      if (front && dx * this.f < -16) continue;
      if (Math.hypot(dx, t.cy() - uy) < radius) out.push(t);
    }
    return out;
  },
  _targetable(t) {
    if (!t || t === this.user || t.health <= 0 || t.backstageHiding) return false;
    if (t._msScene && t._msScene !== this) return false;
    if (t._msLock && t._msLock !== this) return false;
    if (typeof isHostileTarget === 'function' && !isHostileTarget(this.user, t)) return false;
    return true;
  },
  // Heavy targets take the hits but are never held: bosses keep their own AI.
  canLock(t) {
    return !!t && !t.isBoss && !t.isTrueForm && !t._isGod && !t.isGod && !t.isRemote &&
           !(t.drawScale && t.drawScale > 1.45) && !(t.kbResist !== undefined && t.kbResist < 0.45);
  },
  lock(t) {
    if (!this.canLock(t) || t.health <= 0) return false;
    t._msLock = this;
    if (!this.victims.includes(t)) this.victims.push(t);
    const b = this.body(t);
    b.x = t.x; b.y = t.y; b.kin = false; b.vx = 0; b.vy = 0;
    t.shielding = false;
    t.attackTimer = 0;
    return true;
  },

  // The opener reaching a victim. A raised guard takes it as a hit (chip, and a
  // fresh guard may parry); otherwise it is a clean catch that deals nothing yet.
  contact(t, chip) {
    if (!t || t.health <= 0 || t.godmode) return 'miss';
    const u = this.user;
    if (t.invincible > 0 && !(typeof _hitIframesLetThrough === 'function' && _hitIframesLetThrough(u, t))) return 'miss';
    if (t.shielding) return this.hit(t, chip || 6, 0, { fx: false });
    return 'hit';
  },
  near(t, reach, vreach) {
    return !!t && t.health > 0 && Math.abs(t.cx() - this.ucx()) < reach && Math.abs(t.cy() - this.ucy()) < (vreach || 70);
  },

  // Deal one scene hit. Returns 'hit', 'blocked', 'parried' or 'miss'.
  hit(t, dmg, kb, opts) {
    if (!t || t.health <= 0 || t.godmode) return 'miss';
    const o = opts || {};
    const u = this.user;
    const fc = typeof frameCount !== 'undefined' ? frameCount : 0;
    u._attackStartFrame = fc;
    if (t.invincible > 0 && !(typeof _hitIframesLetThrough === 'function' && _hitIframesLetThrough(u, t))) return 'miss';
    u._attackStartFrame = fc;                // a new action: passes this scene's own hit i-frames
    u._attackKindTier = this.kind === 'e' ? CLASH_TIER_SUPER : CLASH_TIER_ABILITY;
    u._comboHitCount = this.comboBase;       // the whole scene is one combo hit
    u._comboLastFrame = fc;
    const guard = !!t.shielding;
    const hp0 = t.health, uStun0 = u.stunTimer || 0;
    dealDamage(u, t, dmg, kb || 0, o.stunMult || 1, false, o.iframes === undefined ? 16 : o.iframes);
    u._comboHitCount = this.comboBase + 1;
    if (kb > 0 && t._msLock !== this) this._softenNearLedge(t);
    if (guard && (u.stunTimer || 0) > uStun0) return 'parried';
    if (guard && t.shielding) return 'blocked';
    if (t.health < hp0 || (t.health === hp0 && !guard)) {
      if (o.fx !== false) this.impact(t, o.color, o.big);
      return 'hit';
    }
    return 'miss';
  },

  // An ability's knockback toward a nearby ledge is cut back so the ability
  // alone never rings anyone out; supers keep their full launch.
  _softenNearLedge(t) {
    if (this.kind !== 'q' || this.span.open || !t.vx) return;
    const edge = t.vx > 0 ? this.span.R - t.cx() : t.cx() - this.span.L;
    if (edge >= MS_LEDGE_SOFTEN) return;
    const k = Math.max(0.3, edge / MS_LEDGE_SOFTEN);
    t.vx *= k;
    t.vy = Math.min(t.vy || 0, -4 - (1 - k) * 6);
  },

  // Let a victim go with an authored launch (vx in facing space).
  release(t, vx, vy, opts) {
    const o = opts || {};
    if (!t) return;
    const i = this.victims.indexOf(t);
    if (i >= 0) this.victims.splice(i, 1);
    if (t._msLock === this) t._msLock = null;
    t._movePose = null;
    this.bodies.delete(t);
    if (t.health <= 0) return;
    let lvx = this.f * (vx || 0);
    let lvy = vy || 0;
    if (this.kind === 'q' && lvx !== 0 && !this.span.open) {
      const edge = lvx > 0 ? this.span.R - t.cx() : t.cx() - this.span.L;
      if (edge < MS_LEDGE_SOFTEN) {
        const k = Math.max(0.3, edge / MS_LEDGE_SOFTEN);
        lvx *= k;
        lvy = Math.min(lvy, -4 - (1 - k) * 6);
      }
    }
    t.vx = lvx;
    if (lvy < 0 && typeof applyLaunch === 'function' && !o.raw) {
      t.vy = 0;
      applyLaunch(this.user, t, lvy, { ignoreAirGuard: true });
    } else {
      t.vy = lvy;
    }
    t.stunTimer = Math.max(t.stunTimer || 0, o.stun === undefined ? 18 : o.stun);
    if (o.tumble) {
      t.ragdollTimer = Math.max(t.ragdollTimer || 0, o.tumble);
      t.ragdollSpin = this.f * 0.2;
    }
    t.canDoubleJump = true;
    t.onGround = false;
  },

  // ── Presentation ──────────────────────────────────────────────────────────
  impact(t, color, big) {
    const c = color || this.color;
    spawnParticles(t.cx(), t.cy(), c, big ? 18 : 10);
    spawnParticles(t.cx(), t.cy(), '#ffffff', big ? 10 : 5);
    MoveScene.fx.push({ kind: 'star', x: t.cx(), y: t.cy(), r: big ? 46 : 30, color: c, life: big ? 12 : 9, max: big ? 12 : 9, a: Math.random() * Math.PI });
  },
  // Crescent slash streak, facing-space angles, ry squashes it into a flat sweep.
  slash(dx, dy, r, a0, a1, opts) {
    const o = opts || {};
    MoveScene.fx.push({
      kind: 'arc', x: this.ucx() + this.f * dx, y: this.ucy() + dy, r, ry: o.ry || r,
      a0, a1, f: this.f, tilt: o.tilt || 0, color: o.color || this.color, w: o.w || 10,
      life: o.life || 10, max: o.life || 10,
    });
  },
  ring(x, y, r, color, life) {
    MoveScene.fx.push({ kind: 'ring', x, y, r0: 8, r: r || 70, color: color || this.color, life: life || 16, max: life || 16 });
  },
  streak(x0, y0, x1, y1, color, life, w) {
    MoveScene.fx.push({ kind: 'line', x0, y0, x1, y1, color: color || this.color, life: life || 12, max: life || 12, w: w || 6 });
  },
  // Faint on purpose: a hit-stop freezes the frame the flash was drawn on, so
  // it sits on screen for the whole freeze.
  flash(color, alpha, life) {
    MoveScene.screen.push({ kind: 'flash', color: color || '#ffffff', a: Math.min(0.14, alpha || 0.1), life: life || 6, max: life || 6 });
  },
  freeze(n)  { if (typeof hitStopFrames !== 'undefined') hitStopFrames = Math.max(hitStopFrames, n); },
  shake(n)   { if (typeof screenShake !== 'undefined' && (!settings || settings.screenShake !== false)) screenShake = Math.max(screenShake, n); },
  zoom(z, frames) {
    if (typeof setCameraDrama === 'function') setCameraDrama('focus', frames || 30, this.user, z || 1.12);
  },
  sfx(name) { if (typeof SoundManager !== 'undefined' && typeof SoundManager[name] === 'function') SoundManager[name](); },
  fire() {
    if (this.fired || typeof this.legacy !== 'function') return;
    this.fired = true;
    try { this.legacy(); } catch (e) { console.warn('[MoveScene] legacy fire failed', e); }
    // Fighter.ability() applied its cooldown before this deferred fire, so an
    // override set here (Drop Anchor's quick re-press) would otherwise be lost.
    const u = this.user;
    if (this.kind === 'q' && u && u._abilityCdOverride != null) {
      u.abilityCooldown = u._abilityCdOverride;
      u._abilityCdOverride = null;
    }
  },
  vpose(t, name, extra) {
    const b = this.body(t);
    b.pose = Object.assign({}, MS_VPOSE[name] || MS_VPOSE.reel, extra || null);
  },
};

const MoveScene = {
  scenes: [],
  fx: [],
  screen: [],
  outs: [],

  // Called from Fighter.ability()/activateSuper(). `legacy` fires the move's
  // original effect (projectiles, AoE) at the scene's release frame.
  begin(user, kind, target, legacy) {
    if (!user || user.isBoss || user.isTrueForm || user.isRemote) return false;
    if (typeof onlineMode !== 'undefined' && onlineMode) return false;
    if (typeof PubHub !== 'undefined' && PubHub.active) return false;
    if (user._msScene || user._msLock) return false;
    // Admin attack kits and custom weapons replace the ability with their own;
    // the choreography belongs to the stock weapon.
    if (user._adminKit || (user.weapon && user.weapon._isCustom)) return false;
    if (typeof WEAPONS !== 'undefined' && user.weapon && WEAPONS[user.weaponKey] && user.weapon !== WEAPONS[user.weaponKey] &&
        user.weapon.ability !== WEAPONS[user.weaponKey].ability) return false;
    const key = (user.weaponKey || '') + ':' + kind;
    const def = MS_DEFS[key];
    if (!def) return false;
    if (def.when && !def.when(user)) return false;
    const fc = typeof frameCount !== 'undefined' ? frameCount : 0;
    const sc = Object.create(MS_PROTO);
    Object.assign(sc, {
      key, def, kind, user, target, legacy,
      f: user.facing < 0 ? -1 : 1,
      t: 0, t0: 0, lt: 0, lprev: -1e-6, dt: 1, len: 0, track: 'main',
      bodies: new Map(), victims: [], vars: {}, done: false, fired: false,
      color: def.color || (user.weapon && user.weapon.color) || user.color || '#ffffff',
      comboBase: (fc - (user._comboLastFrame || 0) > 45) ? 0 : (user._comboHitCount || 0),
      start: fc, fresh: true,
    });
    sc.span = _msSpan(user.cx(), user.y + user.h);
    sc.body(user);
    sc.play('main');
    user._msScene = sc;
    user.invincible = Math.max(user.invincible || 0, 2);
    // Which move a kill belongs to, for its finisher (smb-finisher-moves.js).
    user._msKill = { key, end: 0 };
    user.attackTimer = 0;
    user.shielding = false;
    user._msHideWas = user._hideWeapon;
    this.scenes.push(sc);
    if (def.start) def.start(sc);
    this._pose(sc);
    return true;
  },

  isBusy(f) { return !!(f && (f._msScene || f._msLock)); },

  update() {
    if (this._freezeNext) {
      if (typeof hitStopFrames !== 'undefined') hitStopFrames = Math.max(hitStopFrames, this._freezeNext);
      this._freezeNext = 0;
    }
    for (let i = this.outs.length - 1; i >= 0; i--) {
      const f = this.outs[i];
      if (f._msOut && (--f._msOut.t <= 0 || f._msScene)) f._msOut = null;
      if (f._msHideWhile && (f._msScene || f.health <= 0 || !f._msHideWhile(f))) {
        f._msHideWhile = null;
        if (!f._msScene) f._hideWeapon = f._msHideWas;
      }
      if (!f._msOut && !f._msHideWhile) this.outs.splice(i, 1);
    }
    this._holdKillClaims();
    if (!this.scenes.length) { this._tickFx(); return; }
    const fc = typeof frameCount !== 'undefined' ? frameCount : 0;
    const halt = (typeof activeFinisher !== 'undefined' && activeFinisher) ||
                 (typeof activeCinematic !== 'undefined' && activeCinematic) ||
                 (typeof isCinematic !== 'undefined' && isCinematic) ||
                 (typeof gameRunning !== 'undefined' && !gameRunning);
    const live = _msAllFighters();
    for (const sc of this.scenes.slice()) {
      const u = sc.user;
      if (halt || !u || u.health <= 0 || u._msScene !== sc || !live.includes(u)) { this.abort(sc); continue; }
      const dt = (typeof slowMotion === 'number' && slowMotion > 0) ? Math.min(1, slowMotion) : 1;
      sc.dt = dt;
      // Undo whatever physics did to the bodies the scene owns. A `free` scene
      // leaves the performer to its weapon's own movement code (still tethered).
      for (const b of sc.bodies.values()) {
        if (sc.def.free && b.f === u) { b.x = u.x; b.y = u.y; continue; }
        b.f.x = b.x; b.f.y = b.y;
      }
      // The first tick of a scene also covers frame 0, so `at(0)` fires.
      sc.lprev = sc.fresh ? -1e-6 : sc.lt;
      sc.fresh = false;
      sc.t += dt;
      sc.lt = sc.t - sc.t0;
      for (const v of sc.victims.slice()) {
        if (v.health <= 0 || v._msLock !== sc) { sc.release(v, 0, 0, { stun: 0 }); continue; }
        this._aiBreakRoll(sc, v);
        if (v._msLock !== sc) continue;
      }
      if (sc.done || u._msScene !== sc) { if (u._msScene === sc) this.abort(sc); continue; }
      try { sc.def.tick(sc); }
      catch (e) { console.warn('[MoveScene] ' + sc.key + ' tick failed', e); this.abort(sc); continue; }
      if (u._msScene !== sc) continue;          // broken out of, or aborted, inside tick
      for (const b of sc.bodies.values()) {
        if (b.kin) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += b.g * dt; }
        sc._clampBody(b);
        b.f.x = b.x; b.f.y = b.y;
      }
      // Performer: invulnerable for the scene only, facing locked, no guard, no stray swing.
      u._superArmorUntil = Math.max(u._superArmorUntil || 0, fc + 2);
      u.invincible = Math.max(u.invincible || 0, 2);
      u.facing = sc.f;
      u.shielding = false;
      u.attackTimer = 0;
      u.stunTimer = 0; u.hurtTimer = 0; u.ragdollTimer = 0;
      if (sc.kind === 'e') u.superActive = true;
      const ub = sc.ub;
      if (sc.def.free) { /* its own code drives the velocity */ }
      else if (!ub.kin) { u.vy = 0; if (Math.abs(u.vx) > 0 && !sc.vars._dashing) u.vx *= 0.5; }
      else { u.vx = ub.vx; u.vy = ub.vy; }
      sc.vars._dashing = false;
      // Victims: held, facing the performer, hurt.
      for (const v of sc.victims) {
        const vb = sc.body(v);
        v.facing = (u.cx() > v.cx()) ? 1 : -1;
        v.vx = vb.kin ? vb.vx : 0;
        v.vy = vb.kin ? vb.vy : 0;
        v.stunTimer = Math.max(v.stunTimer || 0, 3);
        v.hurtTimer = Math.max(v.hurtTimer || 0, 2);
        v.ragdollTimer = 0;
        v.shielding = false;
        v.attackTimer = 0;
        if (vb.spin) vb.rot += vb.spin * dt;
        const vp = vb.pose || MS_VPOSE.reel;
        v._movePose = this._vposeOut(vp, vb.rot);
      }
      this._pose(sc);
      if (sc.len && sc.lt >= sc.len) {
        if (sc.def.onEnd && sc.def.onEnd(sc, sc.track)) continue;
        this.finish(sc);
      } else if (sc.done) {
        this.finish(sc);
      }
    }
    this._tickFx();
  },

  _vposeOut(vp, extraRot) {
    const o = {};
    for (const k of MS_POSE_KEYS) o[k] = vp[k] !== undefined ? vp[k] : MS_POSE_DEF[k];
    o.w = undefined;
    o.air = !!vp.air;
    o.rot = (vp.rot || 0) + (extraRot || 0);
    o.keepState = true;
    return o;
  },

  _pose(sc) {
    const u = sc.user;
    const tr = sc.def.tracks[sc.track];
    let p = tr ? msSample(tr.keys, sc.lt) : null;
    if (p && sc.def.poseMod) p = sc.def.poseMod(sc, p) || p;
    u._movePose = p;
    if (p) u._hideWeapon = p.hide ? true : u._msHideWas;
  },

  // Normal end: anyone still held drops where they are.
  finish(sc) {
    for (const v of sc.victims.slice()) sc.release(v, 0, 0, { stun: 12 });
    this._clear(sc);
    const u = sc.user;
    const b = sc.ub;
    if (b && b.kin) { u.vx = b.vx; u.vy = b.vy; }
    if (!u.onGround) u.canDoubleJump = true;
    if (sc.def.endlag) u.attackEndlag = Math.max(u.attackEndlag || 0, sc.def.endlag);
  },

  abort(sc) {
    for (const v of sc.victims.slice()) sc.release(v, 0, 0, { stun: 8 });
    this._clear(sc);
  },

  // A move whose effect outlives its scene (a fused bomb, a standing mirror, a
  // timed buff) declares killWhile(u); while it holds, the kill claim's tail is
  // re-stamped every frame so a kill it lands late is still the move's.
  _holdKillClaims() {
    const fc = typeof frameCount !== 'undefined' ? frameCount : 0;
    for (const f of (typeof players !== 'undefined' ? players : [])) {
      const k = f && f._msKill;
      if (!k || !k.end || f._msScene) continue;
      const def = MS_DEFS[k.key];
      if (!def || !def.killWhile) continue;
      let on = false;
      try { on = !!def.killWhile(f); } catch (e) {}
      if (on) k.end = fc || 1;
    }
  },

  _clear(sc) {
    const u = sc.user;
    const i = this.scenes.indexOf(sc);
    if (i >= 0) this.scenes.splice(i, 1);
    if (u && u._msScene === sc) {
      u._msScene = null;
      // The scene's own i-frames end with it; longer ones came from elsewhere.
      if (u.invincible <= 2) u.invincible = 0;
      if (u._msKill && u._msKill.key === sc.key) u._msKill.end = typeof frameCount !== 'undefined' ? frameCount : 1;
      // Ease from the scene's last pose back into the weapon's own carry.
      if (u._movePose) { u._msOut = { p: u._movePose, t: MS_BLEND_OUT }; if (!this.outs.includes(u)) this.outs.push(u); }
      u._movePose = null;
      u._hideWeapon = u._msHideWas;
      // A thrown weapon stays out of the hand until it comes back.
      if (sc.def.hideWhile) { u._msHideWhile = sc.def.hideWhile; u._hideWeapon = true; if (!this.outs.includes(u)) this.outs.push(u); }
      if (sc.kind === 'e') u.superActive = false;
    }
    for (const b of sc.bodies.values()) {
      if (b.f !== u && b.f._msLock === sc) { b.f._msLock = null; b.f._movePose = null; }
    }
    sc.bodies.clear();
    sc.done = true;
  },

  // Bots spend a full meter to break out the way a human would: once per hold,
  // after a reaction delay, more often the harder they are.
  _aiBreakRoll(sc, v) {
    if (!v.isAI || !v.superReady || v._storyNoSuper || v.isBoss) return;
    const key = '_br' + sc.start;
    if (v[key] === undefined) {
      const ch = v.aiDiff === 'easy' ? 0.15 : v.aiDiff === 'medium' ? 0.35 : v.aiDiff === 'hard' ? 0.6 : 0.8;
      v[key] = Math.random() < ch ? 10 + Math.floor(Math.random() * 18) : -1;
    }
    if (v[key] >= 0 && sc.t >= v[key]) { v[key] = -1; this.breakOut(v); }
  },

  // The victim spends a full super meter to break the hold from inside.
  breakOut(v) {
    const sc = v && v._msLock;
    if (!sc || !v.superReady || v.health <= 0) return false;
    const u = sc.user;
    v.superMeter = 0;
    v.superReady = false;
    const dir = u.cx() >= v.cx() ? 1 : -1;
    const vx = v.cx(), vy = v.cy();
    this.abort(sc);
    // The performer is thrown off and left open; the push is shortened near a
    // ledge so a break can never itself be a ring-out.
    let push = 11;
    if (!sc.span.open) {
      const edge = dir > 0 ? sc.span.R - u.cx() : u.cx() - sc.span.L;
      if (edge < 200) push *= Math.max(0.2, edge / 200);
    }
    u._superArmorUntil = 0;
    u.vx = dir * push;
    u.vy = -6;
    u.stunTimer = Math.max(u.stunTimer || 0, MS_BREAK_STAGGER);
    u.attackEndlag = Math.max(u.attackEndlag || 0, 10);
    u._hitFlashTimer = 6;
    v.stunTimer = 0; v.hurtTimer = 0; v.ragdollTimer = 0;
    v._hitIframeBy = null;
    v.invincible = Math.max(v.invincible || 0, MS_BREAK_IFRAMES);
    v.vx = -dir * 2; v.vy = -5;
    v.canDoubleJump = true;
    v._comboHitCount = 0;
    u._comboHitCount = 0;
    const shards = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const s = 6 + Math.random() * 7;
      shards.push({ x: vx, y: vy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, rot: a, vr: (Math.random() - 0.5) * 0.5, sz: 5 + Math.random() * 7 });
    }
    this.fx.push({ kind: 'break', x: vx, y: vy, color: v.color || '#ffffff', life: 34, max: 34, shards, dir });
    this.screen.push({ kind: 'flash', color: '#ffffff', a: 0.55, life: 10, max: 10 });
    this.screen.push({ kind: 'invert', life: 5, max: 5 });
    // Frozen from the next update, so the frame that shows the break is the one held.
    this._freezeNext = 8;
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 18);
    if (typeof damageTexts !== 'undefined' && typeof DamageText !== 'undefined') {
      damageTexts.push(new DamageText(vx, v.y - 36, 'BREAK!', '#ffffff'));
    }
    spawnParticles(vx, vy, '#ffffff', 22);
    spawnParticles(vx, vy, v.color || '#88ddff', 18);
    if (typeof SoundManager !== 'undefined') {
      if (SoundManager.clang) SoundManager.clang();
      if (SoundManager.superActivate) SoundManager.superActivate();
    }
    if (!v.isAI && typeof _achStats !== 'undefined') _achStats.superCount = (_achStats.superCount || 0) + 1;
    return true;
  },

  // ── FX ────────────────────────────────────────────────────────────────────
  _tickFx() {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const fx = this.fx[i];
      if (--fx.life <= 0) { this.fx.splice(i, 1); continue; }
      if (fx.kind === 'break') {
        for (const s of fx.shards) { s.x += s.vx; s.y += s.vy; s.vy += 0.35; s.vx *= 0.97; s.rot += s.vr; }
      }
    }
    if (this.fx.length > 160) this.fx.splice(0, this.fx.length - 160);
  },

  draw() {
    if (typeof ctx === 'undefined') return;
    for (const sc of this.scenes) {
      if (sc.def.draw) { ctx.save(); try { sc.def.draw(sc); } catch (e) { /* never take the frame down */ } ctx.restore(); }
    }
    if (!this.fx.length) return;
    ctx.save();
    for (const fx of this.fx) {
      const k = fx.life / fx.max;
      if (fx.kind === 'arc') {
        // A swept crescent: thick at the leading edge, thinning toward the tail.
        const N = 14;
        ctx.save();
        ctx.translate(fx.x, fx.y);
        ctx.scale(fx.f, 1);
        ctx.rotate(fx.tilt);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let i = 0; i < N; i++) {
          const ua = i / N, ub = (i + 1) / N;
          const a0 = fx.a0 + (fx.a1 - fx.a0) * ua, a1 = fx.a0 + (fx.a1 - fx.a0) * ub;
          ctx.globalAlpha = k * (0.15 + 0.85 * ub);
          ctx.strokeStyle = fx.color;
          ctx.lineWidth = Math.max(1, fx.w * (0.2 + 0.8 * ub) * (0.4 + 0.6 * k));
          ctx.beginPath();
          ctx.moveTo(Math.cos(a0) * fx.r, Math.sin(a0) * fx.ry);
          ctx.lineTo(Math.cos(a1) * fx.r, Math.sin(a1) * fx.ry);
          ctx.stroke();
        }
        ctx.globalAlpha = k * 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, fx.w * 0.28 * k);
        ctx.beginPath();
        for (let i = Math.floor(N * 0.45); i <= N; i++) {
          const a = fx.a0 + (fx.a1 - fx.a0) * (i / N);
          const px = Math.cos(a) * fx.r, py = Math.sin(a) * fx.ry;
          if (i === Math.floor(N * 0.45)) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      } else if (fx.kind === 'ring') {
        const r = fx.r0 + (fx.r - fx.r0) * (1 - k * k);
        ctx.globalAlpha = k * 0.85;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 1 + 5 * k;
        ctx.beginPath(); ctx.ellipse(fx.x, fx.y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (fx.kind === 'line') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k;
        ctx.strokeStyle = fx.color;
        ctx.lineCap = 'round';
        ctx.lineWidth = fx.w * k;
        ctx.beginPath(); ctx.moveTo(fx.x0, fx.y0); ctx.lineTo(fx.x1, fx.y1); ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, fx.w * 0.3 * k);
        ctx.beginPath(); ctx.moveTo(fx.x0, fx.y0); ctx.lineTo(fx.x1, fx.y1); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (fx.kind === 'star') {
        // Impact star: a few long spikes, not a disc.
        ctx.save();
        ctx.translate(fx.x, fx.y);
        ctx.rotate(fx.a);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k;
        const r = fx.r * (1.15 - k * 0.4);
        ctx.fillStyle = fx.color;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const rr = i % 2 === 0 ? r : r * 0.22;
          if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = k * 0.9;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (fx.kind === 'break') {
        // Shattered hold: a white shock ring, a coloured one inside it, and
        // glass shards thrown out of the victim.
        const u = 1 - k;
        ctx.globalAlpha = k;
        ctx.lineWidth = 6 * k + 1;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 20 + u * 150, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3 * k + 1;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 12 + u * 95, 0, Math.PI * 2); ctx.stroke();
        for (const s of fx.shards) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.globalAlpha = k;
          ctx.fillStyle = 'rgba(235,248,255,0.92)';
          ctx.strokeStyle = fx.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-s.sz * 0.5, -s.sz * 0.3); ctx.lineTo(s.sz * 0.6, 0); ctx.lineTo(-s.sz * 0.3, s.sz * 0.45);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        // Radial cracks for the first few frames.
        if (k > 0.6) {
          ctx.globalAlpha = (k - 0.6) / 0.4;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + 0.2;
            ctx.beginPath();
            ctx.moveTo(fx.x + Math.cos(a) * 14, fx.y + Math.sin(a) * 14);
            ctx.lineTo(fx.x + Math.cos(a + 0.12) * 46, fx.y + Math.sin(a + 0.12) * 46);
            ctx.lineTo(fx.x + Math.cos(a - 0.05) * 72, fx.y + Math.sin(a - 0.05) * 72);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  // Screen space, after the world transform is reset.
  drawScreen() {
    if (!this.screen.length || typeof ctx === 'undefined' || typeof canvas === 'undefined') return;
    ctx.save();
    for (let i = this.screen.length - 1; i >= 0; i--) {
      const s = this.screen[i];
      const k = s.life / s.max;
      if (s.kind === 'flash') {
        ctx.globalAlpha = s.a * k;
        ctx.fillStyle = s.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (s.kind === 'invert') {
        ctx.globalAlpha = 0.85 * k;
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (--s.life <= 0) this.screen.splice(i, 1);
    }
    ctx.restore();
  },

  reset() {
    this._freezeNext = 0;
    for (const f of this.outs) { f._msOut = null; if (f._msHideWhile) { f._msHideWhile = null; f._hideWeapon = f._msHideWas; } }
    this.outs.length = 0;
    for (const sc of this.scenes.slice()) this.abort(sc);
    this.scenes.length = 0;
    this.fx.length = 0;
    this.screen.length = 0;
  },
};

// ── Fighter hooks ───────────────────────────────────────────────────────────
// Inside a scene the performer acts only through the scene, and a held victim's
// only action is the super press that breaks the hold.
(function _msInstallFighterHooks() {
  if (typeof Fighter === 'undefined' || Fighter.prototype._msHooked) return;
  const P = Fighter.prototype;
  const _attack = P.attack, _ability = P.ability, _useSuper = P.useSuper, _respawn = P.respawn;
  P.attack = function (t) {
    if (this._msScene || this._msLock) return;
    const cd0 = this.cooldown || 0, at0 = this.attackTimer || 0;
    const r = _attack.call(this, t);
    // A normal swing after the move: kills from here on are not the move's —
    // unless the move is a buff whose kills ARE its swings (keepOnSwing).
    const kd = this._msKill && MS_DEFS[this._msKill.key];
    const keep = kd && kd.keepOnSwing && kd.killWhile && kd.killWhile(this);
    if (this._msKill && !keep && ((this.cooldown || 0) > cd0 || (this.attackTimer || 0) > at0)) this._msKill = null;
    return r;
  };
  // An ability or super that ran without a scene (Bomb Q, Knight) ends the
  // previous move's claim on kills, the same as a swing.
  P.ability = function (t) {
    if (this._msScene || this._msLock) return;
    const k0 = this._msKill, cd0 = this.abilityCooldown || 0;
    const r = _ability.call(this, t);
    if (k0 && this._msKill === k0 && !this._msScene && (this.abilityCooldown || 0) > cd0) this._msKill = null;
    return r;
  };
  P.useSuper = function (t) {
    if (this._msLock) { MoveScene.breakOut(this); return; }
    if (this._msScene) return;
    const k0 = this._msKill, m0 = this.superMeter || 0;
    const r = _useSuper.call(this, t);
    if (k0 && this._msKill === k0 && !this._msScene && (this.superMeter || 0) < m0) this._msKill = null;
    return r;
  };
  P.respawn = function () {
    if (this._msScene) MoveScene.abort(this._msScene);
    if (this._msLock) this._msLock.release(this, 0, 0, { stun: 0 });
    this._movePose = null;
    this._msKill = null;
    return _respawn.apply(this, arguments);
  };
  P._msHooked = true;
})();
