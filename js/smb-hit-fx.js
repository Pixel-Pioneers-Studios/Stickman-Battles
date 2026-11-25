'use strict';
// smb-hit-fx.js: tiered hit effects (visual overhaul Phase 3). Render-only; dealDamage() picks the tier and calls hitFX().
//   normal: a short slash mark across the contact point, in the weapon's colour.
//   heavy:  a local impact frame (ink-edged burst in the fighter's accent, then a ring) on 22+ damage, smash weapons and the string launcher.
//   crit:   a counter-hit (the victim was mid-swing). Heavy, plus a disc in the attacker's colour behind both fighters
//           so they read as silhouettes, and short speed lines. Local: never full-screen, never white (style guide: white is a budget).
// Finishers and kills keep their own staging. Effects freeze with hit-stop, since the loop skips drawing then.
// Depends at call time on swingPose (smb-data-weapons.js), CinFX (smb-cinematics-core.js), STRING_LEN and CLASH_TIER_ATTACK.

const HITFX_INK = '#07060c';
const HITFX_MAX = 12;          // a crowd can't stack more marks than this
const _hitFx = [];

// The attacker's basic swing entry while that swing is what landed, else null.
function _hfxSwing(a) {
  if (!a || !a.weapon || a.weapon.type !== 'melee' || !(a.attackTimer > 0) || !(a.attackDuration > 0)) return null;
  return (typeof a._swingG === 'function') ? a._swingG() : null;
}

/** Which tier this landed hit gets, or null for none. Called once per hit from dealDamage(). */
function hitFxTier(attacker, target, dmg, isSplash, isDot, counterHit) {
  if (!attacker || !target || attacker === target || !(dmg > 0) || isDot) return null;
  if (isSplash) return 'normal';
  if (counterHit) return 'crit';
  const g = _hfxSwing(attacker);
  const launcher = !!g && typeof STRING_LEN !== 'undefined' && attacker._comboHitCount === STRING_LEN &&
                   (typeof CLASH_TIER_ATTACK === 'undefined' || attacker._attackKindTier === CLASH_TIER_ATTACK);
  if (dmg >= 22 || (g && g.archetype === 'smash') || launcher) return 'heavy';
  return 'normal';
}

// Direction of the blade at contact: the tangent of the swing arc, or along the thrust, or attacker to target.
function _hfxAngle(a, t) {
  const g = _hfxSwing(a);
  if (g && typeof swingPose === 'function') {
    const p = 1 - a.attackTimer / a.attackDuration;
    const lead = typeof a._swingLead === 'function' ? a._swingLead() : 0;
    const now = swingPose(g, p, a.facing, a._jabAlt, lead).ang;
    const prev = swingPose(g, Math.max(0, p - 0.08), a.facing, a._jabAlt, lead).ang;
    const d = now - prev;
    if (Math.abs(d) > 0.01) return now + Math.sign(d) * Math.PI / 2;
    return now;
  }
  return Math.atan2(t.cy() - a.cy(), t.cx() - a.cx());
}

/** Queue the effect for a landed hit. tier from hitFxTier(). */
function hitFX(attacker, target, dmg, tier) {
  if (!tier || !attacker || !target) return;
  const dir = target.cx() >= attacker.cx() ? 1 : -1;
  const ranged = !!(attacker.weapon && attacker.weapon.type === 'ranged') && !_hfxSwing(attacker);
  const col = attacker._swingTrailColor || attacker.color || '#ffffff';
  if (_hitFx.length >= HITFX_MAX) _hitFx.shift();
  _hitFx.push({
    tier, ranged, age: 0,
    x: target.cx() - dir * 6, y: target.cy() - 6,
    ang: _hfxAngle(attacker, target),
    spin: Math.random() * Math.PI,
    col, acol: attacker.color || col,
    life: tier === 'normal' ? 5 : 10,
  });
  if (tier === 'crit' && typeof CinFX !== 'undefined' && CinFX.speedLines) {
    CinFX.speedLines(target.cx() - dir * 6, target.cy() - 6, attacker.color || col, { count: 18, maxLen: 170, dur: 10 });
  }
}

// Back pass (after platforms, before fighters): the counter-hit disc, so the fighters read as silhouettes on it.
// The back pass runs before fighters update, so a hit queued this frame is first seen here at age 1,
// the frame after hit-stop releases. The schedule starts there.
function drawHitFXBack() {
  if (!_hitFx.length) return;
  for (const e of _hitFx) {
    if (e.tier !== 'crit' || e.age > 3) continue;
    ctx.save();
    ctx.globalAlpha = e.age <= 1 ? 0.75 : e.age === 2 ? 0.4 : 0.15;
    ctx.fillStyle = e.acol;
    ctx.beginPath(); ctx.arc(e.x, e.y, 80, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Front pass (after fighters): slash marks and impact bursts. Ages one step per drawn frame.
function drawHitFXFront() {
  if (!_hitFx.length) return;
  for (let i = _hitFx.length - 1; i >= 0; i--) {
    const e = _hitFx[i];
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.tier !== 'normal') _hfxBurst(e);
    _hfxSlash(e);
    ctx.restore();
    if (++e.age >= e.life) _hitFx.splice(i, 1);
  }
}

// A thin lens across the contact point: opens on the impact frame and closes over a few frames.
// Ranged hits get a small four-point puncture instead.
function _hfxSlash(e) {
  const big = e.tier !== 'normal';
  const u = Math.min(1, e.age / 5);
  if (u >= 1) return;
  const k = e.age === 0 ? 1 : 1 - u;
  ctx.rotate(e.ang);
  if (e.ranged) {
    const r = (big ? 16 : 10) * (0.8 + 0.4 * u);
    ctx.globalAlpha = k;
    ctx.fillStyle = e.col;
    _hfxStar(4, r, r * 0.22);
    ctx.fillStyle = '#ffffff';
    _hfxStar(4, r * 0.55, r * 0.12);
    return;
  }
  const L = (big ? 50 : 32) * (0.9 + 0.3 * u);
  const w = (big ? 6 : 4.5) * k;
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = e.col;
  _hfxLens(L, w);
  ctx.fillStyle = '#ffffff';
  _hfxLens(L * 0.8, w * 0.42);
}

function _hfxLens(L, w) {
  ctx.beginPath();
  ctx.moveTo(-L / 2, 0);
  ctx.quadraticCurveTo(0, -w, L / 2, 0);
  ctx.quadraticCurveTo(0, w, -L / 2, 0);
  ctx.fill();
}

function _hfxStar(n, r1, r2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = (i / (n * 2)) * Math.PI * 2;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

// Heavy and crit: an ink-edged burst on the impact frame (held through hit-stop), a thinner one next frame,
// then a ring that opens and fades. Hollow in the middle so the contact itself stays visible.
function _hfxBurst(e) {
  ctx.save();
  ctx.rotate(e.spin);
  const R = e.tier === 'crit' ? 38 : 31;
  if (e.age <= 1) {
    const s = e.age === 0 ? 1 : 1.15;
    ctx.globalAlpha = e.age === 0 ? 0.9 : 0.5;
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const r = (i % 2 ? R * 0.58 : R * (i % 4 ? 0.85 : 1)) * s, a = (i / 20) * Math.PI * 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.moveTo(R * 0.45 * s, 0);
    ctx.arc(0, 0, R * 0.45 * s, 0, Math.PI * 2, true);
    // Fighter accent, not the weapon colour: some weapon glows are near-white (sword), and white is a budget.
    ctx.fillStyle = e.acol;
    ctx.fill('evenodd');
    ctx.lineWidth = 2;
    ctx.strokeStyle = HITFX_INK;
    ctx.stroke();
  } else if (typeof settings === 'undefined' || settings.particles !== false) {
    const u = (e.age - 2) / (e.life - 2);
    ctx.globalAlpha = 0.7 * (1 - u);
    ctx.lineWidth = 3 * (1 - u) + 0.5;
    ctx.strokeStyle = e.acol;
    ctx.beginPath(); ctx.arc(0, 0, 20 + u * (R + 24), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Drop every mark (match end, scene change). */
function hitFXClear() { _hitFx.length = 0; }
