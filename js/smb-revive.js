'use strict';
// smb-revive.js: a fighter with a life left comes back as the body the player watched fall.
//  rise  the body on the floor gets up where it lies, then flares in its accent colour.
//        A slam finisher (def.slam / _reviveFlat) leaves it flat: it peels up and pops back to size.
//  leap  a fighter knocked out of the arena (_koFell: fell past the kill plane, or a finisher ended
//        with them off the stage) jumps back in from off camera
//        and lands on a safe platform.
// The dropped weapon flies back into the hand on a rise. The flare shoves nearby enemies
// back (velocity only, no damage) so a body lying beside its killer is not camped.
// Fighter.respawn() calls reviveCapture() first (while the corpse still exists) and
// reviveBegin() last; Fighter.update() calls reviveTick() each frame.
// Depends on: smb-fighter.js, smb-death-anim.js, smb-verlet.js, smb-move-scenes.js, smb-menu-spawn.js.

const REVIVE_RISE_LEN  = 44;
const REVIVE_FLARE_AT  = 30;   // rise frame the power-up flare and shove fire
const REVIVE_LEAP_AIR  = 30;   // frames in flight
const REVIVE_LEAP_LEN  = 52;
const REVIVE_SHOVE_R   = 120;  // px around the riser
const REVIVE_SHOVE_V   = 9;
const REVIVE_LIE_Y     = 36;   // px the lying body sits below standing (draw pivot down to the floor)
// Crouch depth stays under ~20: FIG_LEG_LEN is 31, so a deeper drop folds the feet up past the hips.

// Facing-right canonical poses (MS_POSE_KEYS). `y` is the extra body offset in px.
const REVIVE_RISE_TRACK = [
  { t: 0,  air: true, rot: 1.52, r: 1.75, l: 1.35, w: 1.9, lg: 1.62, lgl: 1.50, ls: 1, lsl: 1 },
  { t: 7,  air: true, e: 'io', rot: 1.50, r: 1.70, l: 1.10, w: 1.9, lg: 1.62, lgl: 1.48, ls: 1, lsl: 1 },
  { t: 15, e: 'out', rot: 0.30, r: 1.45, l: 1.25, ll: 1.15, w: 1.6, lean: 10, drop: 19, fr: 15, fl: -8 },
  { t: 24, e: 'io',  rot: 0.08, r: 1.30, l: 1.45, w: 1.4, lean: 8, drop: 14, fr: 13, fl: -10 },
  { t: 30, e: 'snap', rot: -0.06, r: -0.35, l: -2.75, w: -0.9, lean: -7, drop: 2, fr: 11, fl: -11 },
  { t: 36, e: 'out', rot: -0.04, r: -0.25, l: -2.6, w: -0.8, lean: -5, drop: 3, fr: 11, fl: -11 },
  { t: 44, e: 'io',  r: 0.95, w: 0.75, l: 1.40, lean: 0, drop: 0, fr: 7, fl: -7 },
];
const REVIVE_RISE_Y = [[0, REVIVE_LIE_Y], [7, REVIVE_LIE_Y], [15, 4], [24, 0]];

// Flattened: peel up still flat, crouch, POP back to size with an overshoot.
const REVIVE_FLAT_SQUASH = [[0, 1.45, 0.30], [12, 1.40, 0.34], [20, 1.42, 0.40], [25, 1.55, 0.32], [29, 0.82, 1.28], [34, 1.10, 0.90], [39, 0.97, 1.04], [44, 1, 1]];

const REVIVE_LEAP_TRACK = [
  { t: 0,  air: true, rot: 0, r: 0.6, l: 1.0, w: 0.2, lg: 0.95, lgl: 1.25, ls: 0.62, lsl: 0.62, lean: 4 },
  { t: 26, air: true, e: 'lin', rot: Math.PI * 2, r: 0.6, l: 1.0, w: 0.2, lg: 0.95, lgl: 1.25, ls: 0.62, lsl: 0.62, lean: 4 },
  { t: 30, air: true, e: 'out', rot: Math.PI * 2, r: -0.4, l: 2.6, w: -0.6, lg: 1.3, lgl: 1.7, ls: 0.95, lsl: 0.9 },
  { t: 33, e: 'snap', rot: Math.PI * 2 + 0.22, r: -0.25, rl: 1.05, w: -0.15, l: 1.42, ll: 1.3, lean: 15, drop: 19, fr: 17, fl: -13 },
  { t: 42, e: 'hold', rot: Math.PI * 2 + 0.22, r: -0.25, rl: 1.05, w: -0.15, l: 1.42, ll: 1.3, lean: 15, drop: 19, fr: 17, fl: -13 },
  { t: 52, e: 'io',  rot: Math.PI * 2, r: 0.95, w: 0.75, l: 1.40, lean: 0, drop: 0, fr: 7, fl: -7 },
];

function _revLerpTable(tab, t, i) {
  if (t <= tab[0][0]) return tab[0][i];
  for (let k = 1; k < tab.length; k++) {
    if (t <= tab[k][0]) {
      const a = tab[k - 1], b = tab[k], u = (t - a[0]) / (b[0] - a[0]);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      return a[i] + (b[i] - a[i]) * e;
    }
  }
  return tab[tab.length - 1][i];
}

function _revFoes(f) {
  const out = [];
  const lists = [typeof players !== 'undefined' ? players : null, typeof minions !== 'undefined' ? minions : null];
  for (const L of lists) {
    if (!L) continue;
    for (const o of L) {
      if (!o || o === f || o.health <= 0) continue;
      if (typeof isHostileTarget === 'function' && !isHostileTarget(f, o)) continue;
      out.push(o);
    }
  }
  return out;
}

function _revNearestFoe(f, x) {
  let best = null, bd = Infinity;
  for (const o of _revFoes(f)) { const d = Math.abs(o.cx() - x); if (d < bd) { bd = d; best = o; } }
  return best;
}

// Platform whose top the point rests on (within tol px above it).
function _revPlatformUnder(x, y, tol) {
  if (!currentArena || !currentArena.platforms) return null;
  let best = null;
  for (const pl of currentArena.platforms) {
    if (!pl || pl.isFloorDisabled || pl.isRockFill || pl.isBedrock) continue;
    if (x <= pl.x + 10 || x >= pl.x + pl.w - 10) continue;
    if (y < pl.y - tol || y > pl.y + 8) continue;
    if (!best || pl.y < best.y) best = pl;
  }
  return best;
}

/**
 * Read the death before respawn() wipes it. Returns a plan, or null to keep the plain
 * respawn (online, exploration checkpoints, arena switched, boss, no death on record).
 */
function reviveCapture(f) {
  if (!f || f.isBoss || f.isRemote) return null;
  if (typeof gameRunning === 'undefined' || !gameRunning) return null;
  if (typeof onlineMode !== 'undefined' && onlineMode) return null;
  if (typeof exploreActive !== 'undefined' && exploreActive) return null;
  if (f.charClass === 'megaknight') return null;   // keeps its fall from the sky
  if (!currentArena || typeof msSample !== 'function') return null;
  const rec = f._death;
  if (!rec && !f._koFell) return null;
  if (rec && rec.arena && rec.arena !== currentArenaKey) return null;

  const flat = !!f._reviveFlat;
  const plan = { mode: 'leap', flat: false, x: 0, y: 0, pl: null, prop: null, head: 1, corpse: null };
  // One body either way: whichever mode runs, the corpse goes (reviveBegin).
  const vr = rec && rec.corpse;
  const live = !!(vr && vr.lHip && typeof verletRagdolls !== 'undefined' && verletRagdolls.includes(vr));
  if (live) plan.corpse = vr;
  if (f._koFell) return plan;

  // Where the body lies: the corpse's pelvis, else the fighter's own feet.
  let px, py, head = 1;
  if (live) {
    px = (vr.lHip.x + vr.rHip.x) / 2;
    py = Math.max(vr.lHip.y, vr.rHip.y, vr.lFoot.y, vr.rFoot.y);
    head = Math.sign(vr.head.x - px) || 1;
  } else {
    px = f.cx(); py = f.y + f.h;
  }
  const b = typeof _arenaSpawnBounds === 'function' ? _arenaSpawnBounds() : { left: 20, right: GAME_W - 20 };
  const hazY = typeof _spawnHazardFloorY === 'function' ? _spawnHazardFloorY() : Infinity;
  const pl = _revPlatformUnder(px, py, 34);
  const offStage = px < b.left - 10 || px > b.right + 10 || f.y > GAME_H + 40 || f.y + f.h < -60;
  const bossFloor = pl && pl.isFloor && currentArena.isBossArena && typeof bossFloorState !== 'undefined' && bossFloorState !== 'normal';
  const hazard = pl && (pl.y >= hazY - 18 || (typeof isHazard === 'function' && isHazard(px, pl.y - 4)));
  if (!pl || offStage || bossFloor || hazard) return plan;

  plan.mode = 'rise';
  plan.flat = flat;
  plan.pl = pl;
  plan.x = Math.max(pl.x + 16, Math.min(pl.x + pl.w - 16, px));
  plan.y = pl.y;
  plan.head = head;
  if (typeof DeathAnim !== 'undefined') plan.prop = DeathAnim._props.find(w => w.owner === f) || null;
  return plan;
}

/** Start the revive. respawn() has already restored health, timers and the spawn point. */
function reviveBegin(f, plan) {
  if (!f || !plan) return;
  f._koFell = false; f._reviveFlat = false;
  const c = { mode: plan.mode, t: 0, flat: plan.flat, pl: plan.pl, prop: plan.prop, flared: false };
  // The body becomes the fighter: take the corpse away so there is never a second one.
  if (plan.corpse && typeof verletRagdolls !== 'undefined') {
    const i = verletRagdolls.indexOf(plan.corpse);
    if (i >= 0) verletRagdolls.splice(i, 1);
  }
  if (plan.mode === 'rise') {
    const foe = _revNearestFoe(f, plan.x);
    f.facing = foe ? (Math.sign(foe.cx() - plan.x) || 1) : (f.facing || 1);
    // rot pitches toward facing, so the head lands on the corpse's head side.
    c.rotSign = plan.head === f.facing ? 1 : -1;
    c.x = plan.x - f.w / 2;
    c.floor = plan.y;
    if (c.prop) { f._hideWeapon = true; c.prop.rest = true; c.prop.life = 9999; c.px0 = c.prop.x; c.py0 = c.prop.y; c.pa0 = c.prop.ang; }
  } else {
    // The weapon comes back in hand, so the one left lying where they went down goes.
    if (typeof DeathAnim !== 'undefined') DeathAnim._props = DeathAnim._props.filter(w => w.owner !== f);
    // Land where respawn() put us; come in from just past the camera edge on the near side.
    c.lx = f.x; c.ly = f.y;
    // Visible half-width in world px, the same scale _cinWorldToScreen uses.
    const zoom = (typeof camZoomCur === 'number' && camZoomCur > 0) ? camZoomCur : 1;
    const camCX = (typeof camXCur === 'number') ? camXCur : GAME_W / 2;
    const cv = typeof canvas !== 'undefined' && canvas ? canvas : null;
    const sc = cv ? Math.min(cv.width / GAME_W, cv.height / GAME_H) * zoom : zoom;
    const halfW = cv ? cv.width / 2 / sc : GAME_W / 2 / zoom;
    const side = (f.cx() >= camCX) ? 1 : -1;
    const edge = camCX + side * (halfW + 60);
    c.sx = (side > 0 ? Math.max(edge, f.cx() + 140) : Math.min(edge, f.cx() - 140)) - f.w / 2;
    c.sy = f.y - 150;
    f.facing = -side;
    f.backstageHiding = true;
  }
  f._reviveAnim = c;
  f.vx = 0; f.vy = 0;
  f.invincible = Math.max(f.invincible || 0, 180);
  f._movePose = msSample(c.mode === 'rise' ? REVIVE_RISE_TRACK : REVIVE_LEAP_TRACK, 0);
  _reviveApply(f, c);
}

function _reviveEnd(f, blend) {
  const c = f._reviveAnim;
  const pose = f._movePose;
  f._reviveAnim = null;
  f._movePose = null;
  f._finSquash = null;
  f.backstageHiding = false;
  if (c && c.prop) {
    const i = typeof DeathAnim !== 'undefined' ? DeathAnim._props.indexOf(c.prop) : -1;
    if (i >= 0) DeathAnim._props.splice(i, 1);
    f._hideWeapon = false;
  }
  if (blend && pose && typeof MoveScene !== 'undefined' && typeof MS_BLEND_OUT !== 'undefined') {
    f._msOut = { p: pose, t: MS_BLEND_OUT };
    if (!MoveScene.outs.includes(f)) MoveScene.outs.push(f);
  }
}

// Pose and place the body for frame c.t.
function _reviveApply(f, c) {
  const t = c.t;
  if (c.mode === 'rise') {
    const p = msSample(REVIVE_RISE_TRACK, t);
    p.rot = (p.rot || 0) * c.rotSign;
    p.keepState = false;
    f._movePose = p;
    const pl = c.pl;
    const floor = pl && !pl.isFloorDisabled ? pl.y : c.floor;
    f.x = c.x;
    f.y = floor - f.h + _revLerpTable(REVIVE_RISE_Y, t, 1);
    f.onGround = true;
    if (c.flat) {
      // The squash is applied inside the body's pitch, so on a lying body its axes are swapped:
      // blend them by how far over it is, so "flat" always means thin against the floor.
      const sx = _revLerpTable(REVIVE_FLAT_SQUASH, t, 1), sy = _revLerpTable(REVIVE_FLAT_SQUASH, t, 2);
      const w = Math.sin(p.rot || 0) ** 2;
      f._finSquash = { x: sx + (sy - sx) * w, y: sy + (sx - sy) * w };
    } else f._finSquash = null;
  } else {
    const p = msSample(REVIVE_LEAP_TRACK, t);
    p.keepState = false;
    f._movePose = p;
    if (t <= REVIVE_LEAP_AIR) {
      const u = t / REVIVE_LEAP_AIR;
      const ex = 1 - (1 - u) * (1 - u);   // fast in, eases at the landing
      f.x = c.sx + (c.lx - c.sx) * ex;
      f.y = c.sy + (c.ly - c.sy) * u - 110 * 4 * u * (1 - u);
      f.onGround = false;
      if (u > 0.45) f.backstageHiding = false;
    } else {
      f.x = c.lx; f.y = c.ly; f.onGround = true;
    }
  }
}

/** One frame. Returns true while the body is held (update() skips physics, input and AI). */
function reviveTick(f) {
  const c = f._reviveAnim;
  if (!c) return false;
  if (f.health <= 0 || f._finWorldLock || f._msScene || f._msLock ||
      (typeof activeCinematic !== 'undefined' && activeCinematic)) {
    _reviveEnd(f, false);
    return false;
  }
  c.t++;
  const len = c.mode === 'rise' ? REVIVE_RISE_LEN : REVIVE_LEAP_LEN;
  if (c.t >= len) { _reviveEnd(f, true); return false; }
  _reviveApply(f, c);
  f.vx = 0; f.vy = 0;
  if (f.invincible < 30) f.invincible = 30;

  if (c.mode === 'rise') {
    if (c.t === 9 && typeof animDust === 'function') animDust(f.cx(), c.floor, f.facing, 5);
    if (c.flat && c.t === 27) _revPop(f);
    if (c.prop) _revCatchTick(f, c);
    if (c.t === REVIVE_FLARE_AT) _revFlare(f, c);
  } else {
    if (c.t === REVIVE_LEAP_AIR + 1) _revLand(f);
    if (c.t === 42) _revFlare(f, c);
  }
  return true;
}

// The dropped weapon lifts off the floor, spins, and snaps into the hand at the flare.
function _revCatchTick(f, c) {
  const w = c.prop;
  const a = 12, b = REVIVE_FLARE_AT - 1;
  if (c.t < a) return;
  const hx = f.cx() + f.facing * 16, hy = f.y + 18;
  if (c.t >= b) {
    _reviveDropProp(c);
    f._hideWeapon = false;
    if (typeof settings !== 'undefined' && settings.particles && typeof spawnParticles === 'function') spawnParticles(hx, hy, '#ffffff', 6);
    if (typeof SoundManager !== 'undefined' && SoundManager.clang) SoundManager.clang();
    return;
  }
  const u = (c.t - a) / (b - a);
  const e = u * u * (3 - 2 * u);
  w.x = c.px0 + (hx - c.px0) * e;
  w.y = c.py0 + (hy - c.py0) * e - Math.sin(u * Math.PI) * 46;
  w.ang = c.pa0 + u * Math.PI * 3 * f.facing;
}

function _reviveDropProp(c) {
  if (!c.prop) return;
  const i = typeof DeathAnim !== 'undefined' ? DeathAnim._props.indexOf(c.prop) : -1;
  if (i >= 0) DeathAnim._props.splice(i, 1);
  c.prop = null;
}

function _revPop(f) {
  if (typeof settings !== 'undefined' && settings.particles && typeof spawnParticles === 'function') {
    spawnParticles(f.cx(), f.y + f.h * 0.5, '#ffffff', 10);
  }
  if (typeof SoundManager !== 'undefined' && SoundManager.jump) SoundManager.jump();
}

function _revLand(f) {
  if (typeof animDust === 'function') { animDust(f.cx(), f.y + f.h, 1, 8); animDust(f.cx(), f.y + f.h, -1, 8); }
  if (typeof settings !== 'undefined' && settings.screenShake && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 7);
  if (typeof SoundManager !== 'undefined') {
    if (SoundManager.landHard) SoundManager.landHard();
    else if (SoundManager.thud) SoundManager.thud();
  }
}

// Power-up: accent ring and sparks, then shove every nearby enemy back. No damage.
function _revFlare(f, c) {
  if (c.flared) return;
  c.flared = true;
  const x = f.cx(), y = f.y + f.h * 0.45;
  if (typeof settings !== 'undefined' && settings.particles) {
    if (typeof spawnParticles === 'function') { spawnParticles(x, y, f.color || '#ffffff', 18); spawnParticles(x, y, '#ffffff', 8); }
    if (typeof spawnRing === 'function') spawnRing(x, y);
  }
  if (typeof settings !== 'undefined' && settings.screenShake && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 5);
  if (typeof SoundManager !== 'undefined' && SoundManager.respawn) SoundManager.respawn();
  for (const o of _revFoes(f)) {
    if (o.isBoss || o._finWorldLock || o._msScene) continue;
    const dx = o.cx() - x;
    if (Math.abs(dx) > REVIVE_SHOVE_R || Math.abs(o.cy() - f.cy()) > 90) continue;
    o.vx = (Math.sign(dx) || -f.facing) * REVIVE_SHOVE_V;
  }
}
