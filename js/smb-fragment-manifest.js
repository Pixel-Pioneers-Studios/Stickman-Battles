'use strict';
// smb-fragment-manifest.js — Fragment weapon manifestation + sprint escalation.
//
// LORE (docs/canon.md, "THE MANIFESTED ARM"):
// A bearer does not carry a weapon. Classes are the preserved fighting styles of
// the 94 bearers the fragment killed before Kael, and the weapon is part of that
// pattern — it crystallizes out of the fragment when a dead bearer's muscle
// memory surfaces, and disperses when nothing needs killing. This is the literal
// mechanic behind the Act 0 line: "Something in your hands knows what to do.
// You don't." The hands are empty until they aren't.
//
// Kael is not the only bearer. Calix carries two (the lab anomaly), and Axiom
// carried one before the void contact dissolved it into his Creator form. What
// makes Kael distinct is integration — the fragment merged with him instead of
// hollowing him, so the pattern answers instantly.
//
// The default below is Kael only, because he is who you control and the effect
// should read as his signature rather than a global art style. Other bearers
// opt in per-entity with `_forceFragmentBearer = true` when their scenes need it.
//
// Depends on: smb-combat.js (isHostileTarget). Loaded before smb-fighter.js.

// ── Tunables ────────────────────────────────────────────────────────────────
var FRAG_THREAT_RANGE = 300;  // px — a hostile this close arms the fragment
var FRAG_HOLD_FRAMES  = 100;  // frames of no combat intent before it disperses
var FRAG_IN_RATE      = 0.14; // manifest speed (~7 frames to full)
var FRAG_OUT_RATE     = 0.045;// disperse speed (~22 frames — slower, reluctant)
var FRAG_ATTACK_RATE  = 0.30; // swinging from empty hands — grows out mid-swing (~4 frames)

var SPRINT_MIN_SPEED  = 2.2;  // |vx| that counts as running, not strolling
var SPRINT_AFTER      = 38;   // frames of sustained running before the shift
var SPRINT_RATE       = 0.055;// blend speed into/out of the sprint pose

// Only living bearers manifest. Bosses, minions and summoned entities never do.
function isFragmentBearer(p) {
  if (!p || p.isBoss || p.isMinion || p.isDummy) return false;
  if (p._forceFragmentBearer === true)  return true;   // story opt-in (Calix, Herald)
  if (p._forceFragmentBearer === false) return false;
  // Default: the human-held fighter(s). The AI flag is `isAI` (set from the
  // constructor's isAI param) — there is no `isBot` on Fighter.
  return !p.isAI && !p.isRemote;
}

// True when the fighter has any reason to be holding a weapon this frame.
function _fragCombatIntent(p) {
  if (p.attackTimer > 0 || p.cooldown > 0 || p.attackEndlag > 0) return true;
  if (p.shielding || p.hurtTimer > 0 || p.stunTimer > 0)         return true;
  if (p.spinning > 0 || p.superActive)                           return true;
  if (p.abilityCooldown > 0)                                     return true;
  // A hostile inside threat range — this is what makes the weapon appear
  // *before* the fight rather than as a consequence of it.
  var lists = [];
  try { if (typeof players  !== 'undefined' && players)  lists.push(players);  } catch (e) {}
  try { if (typeof minions  !== 'undefined' && minions)  lists.push(minions);  } catch (e) {}
  var hostile = (typeof isHostileTarget === 'function');
  for (var li = 0; li < lists.length; li++) {
    var arr = lists[li];
    for (var i = 0; i < arr.length; i++) {
      var o = arr[i];
      if (!o || o === p || o.health <= 0) continue;
      if (hostile && !isHostileTarget(p, o)) continue;
      var dx = o.cx() - p.cx(), dy = o.cy() - p.cy();
      if (dx * dx + dy * dy <= FRAG_THREAT_RANGE * FRAG_THREAT_RANGE) return true;
    }
  }
  return false;
}

// Per-frame state advance. Called from Fighter.updateState().
function updateFragmentManifest(p) {
  if (!p) return;

  // ── Sprint escalation (everyone, not just bearers) ────────────────────────
  if (p._runT === undefined)      p._runT = 0;
  if (p._sprintAmt === undefined) p._sprintAmt = 0;
  if (p._wallHitT > 0) p._wallHitT--;

  var fast = Math.abs(p.vx) >= SPRINT_MIN_SPEED;
  if (p._wallHitT > 0) {
    // Running into a wall is the one thing that kills the stride outright.
    p._runT = 0;
  } else if (p.onGround && p.state === 'walking' && fast) {
    p._runT++;
  } else if (!p.onGround && fast) {
    // Airborne with speed maintained: a jump is part of the run, not a break in
    // it. Hold the charge (and keep building slowly) so he lands still running.
    p._runT += 0.5;
  } else {
    p._runT = Math.max(0, p._runT - 4); // actually stopping drops you out fast
  }
  var sprintTarget = (p._runT >= SPRINT_AFTER) ? 1 : 0;
  p._sprintAmt += (sprintTarget - p._sprintAmt) * SPRINT_RATE * (sprintTarget ? 1.6 : 1);
  if (p._sprintAmt < 0.001) p._sprintAmt = 0;
  if (p._sprintAmt > 0.999) p._sprintAmt = 1;

  // ── Fragment arm ──────────────────────────────────────────────────────────
  if (!isFragmentBearer(p)) { p._fragArm = 1; p._fragIdle = 0; return; }
  if (p._fragArm === undefined)  p._fragArm = 0;
  if (p._fragIdle === undefined) p._fragIdle = FRAG_HOLD_FRAMES;

  var prev = p._fragArm;
  if (_fragCombatIntent(p)) p._fragIdle = 0;
  else                      p._fragIdle++;

  // Swinging from empty hands accelerates the growth instead of snapping to a
  // value — the weapon visibly extrudes during the first frames of the swing.
  var rate = (p.attackTimer > 0) ? FRAG_ATTACK_RATE : FRAG_IN_RATE;
  // Q and E run as MoveScenes with attackTimer zeroed, so they used to fall back
  // to the slow idle rate: 5% of the weapon on frame 1, full only on frame 6,
  // while scenes strike from frame 1 — the move landed from an empty fist. An
  // ability or super start (ability()/activateSuper() stamp _attackStartFrame
  // with their tier) arms the weapon in full on the press; the swing extrusion
  // above stays for basic attacks.
  var _tAb = (typeof CLASH_TIER_ABILITY !== 'undefined') ? CLASH_TIER_ABILITY : 1;
  var _tSu = (typeof CLASH_TIER_SUPER   !== 'undefined') ? CLASH_TIER_SUPER   : 2;
  var _special = p._attackKindTier === _tAb || p._attackKindTier === _tSu;
  if (p._attackStartFrame !== p._fragSeenStart) {
    p._fragSeenStart = p._attackStartFrame;
    if (_special) { p._fragIdle = 0; rate = 1; }
  }
  if (p._msScene || p.superActive) { p._fragIdle = 0; rate = 1; }
  if (p._fragIdle < FRAG_HOLD_FRAMES) p._fragArm = Math.min(1, p._fragArm + rate);
  else                                p._fragArm = Math.max(0, p._fragArm - FRAG_OUT_RATE);

  // One-shot crystallize flash on the frame it starts forming.
  if (prev <= 0.001 && p._fragArm > 0.001) p._fragFlash = 1;
  if (p._fragFlash > 0) p._fragFlash = Math.max(0, p._fragFlash - 0.06);
}

// Render info for the weapon this frame, or null when the fighter isn't a bearer.
// The weapon does not fade in as a whole — it EXTRUDES from the grip, so `grow`
// scales along the weapon's own long axis and `taper` across it. A blade at
// grow=0.3 is a stub of itself sticking out of the fist, not a ghost.
function fragmentWeaponVisual(p) {
  if (!p || !isFragmentBearer(p)) return null;
  var a = (p._fragArm === undefined) ? 1 : p._fragArm;
  var eased = a * a * (3 - 2 * a);
  // All three must reach exactly 0 at a=0 — a floor here leaves a permanent
  // stub of weapon in the fist of a fighter who is supposed to be empty-handed.
  return {
    alpha:   Math.min(1, eased * 1.9),   // opaque early, but gone when gone
    grow:    eased,                      // length out of the fist
    taper:   0.45 * eased + 0.55 * eased * eased, // thickness trails length
    forming: 1 - eased
  };
}

// Light running up the arm as the fragment feeds the shape into his hand.
// Peaks early (the surge precedes the weapon) and is gone once it is solid.
function drawFragmentArmSurge(p, sx, sy, ex, ey, hx, hy) {
  if (!p || !isFragmentBearer(p)) return;
  var a = (p._fragArm === undefined) ? 1 : p._fragArm;
  if (a <= 0.001 || a >= 0.995) return;
  var forming = (p._fragIdle !== undefined && p._fragIdle < FRAG_HOLD_FRAMES);
  var tint = p._fragTint || '#8fd8ff';
  // Surge position travels shoulder→hand while forming, and retreats while dispersing.
  var head = forming ? Math.min(1, a * 1.45) : Math.max(0, 1 - (1 - a) * 1.45);
  var glow = Math.sin(Math.min(1, a * 1.6) * Math.PI); // brightest mid-transit

  // Two-segment path: shoulder→elbow→hand. Walk it to find the surge point.
  var d1 = Math.hypot(ex - sx, ey - sy), d2 = Math.hypot(hx - ex, hy - ey);
  var total = d1 + d2, at = head * total, px, py;
  if (at <= d1 && d1 > 0) { var u = at / d1;        px = sx + (ex - sx) * u; py = sy + (ey - sy) * u; }
  else                    { var v = d2 > 0 ? (at - d1) / d2 : 1; px = ex + (hx - ex) * v; py = ey + (hy - ey) * v; }

  ctx.save();
  ctx.lineCap = 'round';
  // Charged length of the arm behind the surge. Drawn white-cored with a
  // coloured bloom: the tint alone vanishes against a cyan fighter on a pale
  // sky, and this has to read on every arena and every player colour.
  ctx.shadowColor = tint;
  ctx.shadowBlur  = 16;
  ctx.globalAlpha = glow * 0.5;
  ctx.strokeStyle = tint;
  ctx.lineWidth   = 7.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  if (at > d1) { ctx.lineTo(ex, ey); ctx.lineTo(px, py); }
  else         { ctx.lineTo(px, py); }
  ctx.stroke();
  ctx.globalAlpha = glow * 0.95;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 3.0;
  ctx.stroke();
  // Bright node at the surge front
  ctx.globalAlpha = Math.min(1, glow * 1.2);
  ctx.fillStyle   = '#ffffff';
  ctx.shadowBlur  = 20;
  ctx.beginPath();
  ctx.arc(px, py, 2.8 + 2.6 * glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Crystallization VFX at the grip: shards converging inward as it forms,
// scattering outward as it disperses. Drawn in the same space as the weapon.
function drawFragmentManifest(p, hx, hy, ang, scale) {
  if (!p || !isFragmentBearer(p)) return;
  var a = (p._fragArm === undefined) ? 1 : p._fragArm;
  if (a <= 0.001 || a >= 0.999) return; // nothing to show when settled either way

  var sc    = scale || 1;
  var tint  = p._fragTint || '#8fd8ff';
  var forming = (p._fragIdle !== undefined && p._fragIdle < FRAG_HOLD_FRAMES);
  var t = (typeof p.animTimer === 'number') ? p.animTimer : 0;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang || 0);
  // Local space: +X runs out along the weapon, away from the fist.

  // Growth front — the edge where solid becomes unformed, running outward.
  var front = a * 30 * sc;
  var flare = Math.sin(a * Math.PI);

  // Motes streaming outward along the blade axis, drawn ahead of the front.
  var n = 8;
  for (var i = 0; i < n; i++) {
    var seed = i * 2.7;
    var phase = ((t * 0.055 + i / n) % 1);
    var along = front + phase * 22 * sc * (forming ? 1 : -0.6);
    var off   = Math.sin(seed + t * 0.09) * 5.0 * sc * (1 - phase * 0.6);
    var len   = (3.0 + 3.0 * (1 - phase)) * sc;
    ctx.globalAlpha = (1 - phase) * (forming ? 0.8 : 0.45) * Math.min(1, a * 2.2);
    ctx.strokeStyle = tint;
    ctx.lineWidth   = 1.3 * sc;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(along, off);
    ctx.lineTo(along - len, off * 0.75);
    ctx.stroke();
  }

  // The growth front itself — a bright wedge sitting at the tip of the formed part.
  ctx.globalAlpha = flare * 0.9;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = tint;
  ctx.shadowBlur  = 12 * sc;
  ctx.lineWidth   = 2.0 * sc;
  ctx.beginPath();
  ctx.moveTo(front, -3.4 * sc * flare);
  ctx.lineTo(front,  3.4 * sc * flare);
  ctx.stroke();

  // Grip core — where it leaves the fist
  ctx.globalAlpha = flare * 0.8;
  ctx.fillStyle   = '#ffffff';
  ctx.shadowBlur  = 15 * sc * flare;
  ctx.beginPath();
  ctx.arc(0, 0, (1.8 + 2.4 * flare) * sc, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
