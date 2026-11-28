'use strict';
// smb-clash-bind.js: the weapon clash as a short authored beat.
// Both blades lock in an X and grind (CLASH_BIND_LOCK frames, bodies held), then both
// fighters are thrown back CLASH_BIND_DIST px with a skid. No damage, no vertical impulse.
// Poses go through _movePose, the same channel the move scenes use, and blend out
// through MoveScene.outs.
// Started by Fighter._resolveClash(); ticked from the top of Fighter.update().
// Depends on: smb-fighter.js, smb-move-scenes.js (msSample, MS_BLEND_OUT, MoveScene).

const CLASH_BIND_LOCK  = 14;   // frames the blades stay locked
const CLASH_BIND_SLIDE = 12;   // frames of the throw-back skid
const CLASH_BIND_DIST  = 51;   // px each fighter is thrown back (1.5 body widths)
const CLASH_BIND_GAP   = 100;   // centre-to-centre distance the bind pulls the pair to
const CLASH_BIND_GAP_MIN = 86;
const CLASH_BIND_PULL  = 4;    // frames to close or open to the bind gap
const CLASH_BIND_RECOVER = 6;  // swing lockout after the skid ends

// Facing-right canonical (see MS_POSE_KEYS). Lock, grind, strain, thrown back, skid.
const CLASH_BIND_TRACK = [
  { t: 0,  r: -0.55, w: -1.05, l: -0.40, ll: 0.95, lean: 7,  drop: 5, fr: 13, fl: -11 },
  { t: 5,  e: 'io',  r: -0.50, w: -1.00, l: -0.36, ll: 0.95, lean: 10, drop: 7, fr: 14, fl: -13 },
  { t: 10, e: 'io',  r: -0.46, w: -0.96, l: -0.34, ll: 0.95, lean: 12, drop: 8, fr: 15, fl: -14 },
  { t: 14, e: 'in',  r: -0.52, w: -1.02, l: -0.38, ll: 0.95, lean: 13, drop: 8, fr: 15, fl: -14 },
  { t: 17, e: 'snap', r: -1.75, w: -2.35, l: 2.55, lean: -11, drop: 3, fr: 5, fl: -15 },
  { t: 26, e: 'out', r: -0.60, w: -0.95, l: 2.30, lean: -4, drop: 7, fr: 11, fl: -12 },
];

/** Both fighters enter the bind. Called once per clash by Fighter._resolveClash(). */
function clashBindStart(a, b) {
  if (!a || !b || a.health <= 0 || b.health <= 0) return false;
  if (typeof msSample !== 'function') return false;
  const mx = (a.cx() + b.cx()) / 2;
  const my = Math.min(a.y, b.y) + 22;
  const gap = Math.abs(a.cx() - b.cx());
  const want = Math.max(CLASH_BIND_GAP_MIN, Math.min(CLASH_BIND_GAP, gap));
  for (const [f, o] of [[a, b], [b, a]]) {
    const dir = Math.sign(f.cx() - o.cx()) || (f.facing ? -f.facing : 1);   // away from the other
    f.facing = -dir;
    f._clashAnim = { t: 0, other: o, dir, mx, my, lead: f === a, pull: (want - gap) / 2 * dir / CLASH_BIND_PULL };
    f.vx = 0;
    f._movePose = msSample(CLASH_BIND_TRACK, 0);
    f._movePose.keepState = false;
    f._msOut = null;
  }
  return true;
}

function _clashBindEnd(f, blend) {
  const pose = f._movePose;
  f._clashAnim = null;
  f._movePose = null;
  if (blend && pose && typeof MoveScene !== 'undefined' && typeof MS_BLEND_OUT !== 'undefined') {
    f._msOut = { p: pose, t: MS_BLEND_OUT };
    if (!MoveScene.outs.includes(f)) MoveScene.outs.push(f);
  }
}

/**
 * Advance f's bind by one frame. Returns true while the body is locked, so update()
 * skips physics, input and AI. During the skid it returns false and update() runs,
 * but input and AI stay off (they check f._clashAnim).
 */
function clashBindTick(f) {
  const c = f._clashAnim;
  if (!c) return false;
  // Anything else touching the body ends the beat at once, with no skid.
  if (f.health <= 0 || f._finWorldLock || f._msScene || f._msLock ||
      f.hurtTimer > 0 || f.stunTimer > 0 || f.ragdollTimer > 0 ||
      (typeof activeCinematic !== 'undefined' && activeCinematic)) {
    _clashBindEnd(f, false);
    return false;
  }
  const o = c.other;
  // Partner was knocked out of the lock: skip straight to the throw-back.
  if (c.t < CLASH_BIND_LOCK && (!o || o._clashAnim == null || o._clashAnim.other !== f)) c.t = CLASH_BIND_LOCK;

  c.t++;
  const t = c.t;
  if (f._movePose) Object.assign(f._movePose, msSample(CLASH_BIND_TRACK, Math.min(t, 26)), { keepState: false });

  if (t <= CLASH_BIND_LOCK) {
    // Close or open to the bind gap, then hold. The grind shudders the bodies a pixel.
    if (t <= CLASH_BIND_PULL) f.x += c.pull;
    f.vx = 0;
    if (f.onGround) f.vy = 0;
    if (c.lead) _clashBindGrindFX(c, t);
    if (t === CLASH_BIND_LOCK) {
      f.attackTimer = 0; f.weaponHit = false;
      if (c.lead) _clashBindReleaseFX(f, o, c);
    }
    return true;
  }

  const s = t - CLASH_BIND_LOCK;
  if (s <= CLASH_BIND_SLIDE) {
    // Ease-out skid, moved directly so the distance is exact; physics still clamps walls.
    const e = u => 1 - (1 - u) * (1 - u) * (1 - u);
    f.x += c.dir * CLASH_BIND_DIST * (e(s / CLASH_BIND_SLIDE) - e((s - 1) / CLASH_BIND_SLIDE));
    f.vx = 0;
    if (f.onGround && (s % 3 === 1) && typeof settings !== 'undefined' && settings.particles && typeof spawnParticles === 'function') {
      spawnParticles(f.cx() - c.dir * 6, f.y + f.h - 2, '#cbbfa8', 2);
    }
    return false;
  }

  f.attackEndlag = Math.max(f.attackEndlag || 0, CLASH_BIND_RECOVER);
  _clashBindEnd(f, true);
  return false;
}

function _clashBindGrindFX(c, t) {
  if (typeof settings === 'undefined') return;
  if (settings.particles && typeof spawnParticles === 'function' && t % 3 === 0) {
    spawnParticles(c.mx, c.my, t % 6 === 0 ? '#ffffff' : '#ffe27a', 3);
  }
  if (settings.screenShake && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 2);
}

function _clashBindReleaseFX(f, o, c) {
  if (typeof settings !== 'undefined' && settings.particles && typeof spawnParticles === 'function') {
    spawnParticles(c.mx, c.my, '#ffffff', 12);
    spawnParticles(c.mx, c.my, '#ffee88', 10);
    if (typeof spawnRing === 'function') spawnRing(c.mx, c.my);
  }
  if (typeof animeClashFX === 'function') animeClashFX(c.mx, c.my, f, o);
  if (typeof settings !== 'undefined' && settings.screenShake && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 9);
  if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit();
}
