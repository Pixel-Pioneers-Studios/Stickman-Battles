'use strict';
// smb-trials.js — The Trials: gauntlet mechanics.
// Depends on: smb-globals.js, smb-data-weapons.js, smb-particles-core.js,
//             smb-combat.js, smb-fighter.js
//
// Spec: docs/TRIALS_DESIGN.md. Each trial takes away something the player relies
// on and asks whether they still function without it. Order is
// sense -> control -> self-knowledge.
//
//   Trial 1 (sense)          — invisible opponent + the lantern's reveal sweep.
//   Trial 2 (control)        — gravity/controls invert on a readable tell.
//   Trial 3 (self-knowledge) — a copy of the player mirroring their inputs.
//
// Everything here is opt-in per chapter and inert otherwise: with no trial armed
// every update/draw entry point returns on its first line.

// ============================================================
// STATE
// ============================================================
var trialActive     = null;   // 'sense' | 'control' | 'selfknowledge' | null
var trialSweeps     = [];     // active reveal sweeps
var trialEchoes     = [];     // time-stamped residue left where the band crossed something
var trialCues       = [];     // transient perception cues (swing arc, footfall, hit)
var trialInvert     = null;   // Trial 2 tell/inversion state

// Sweep tuning. Anchored to arena width, not to the clock — see the design doc's
// "the one genuinely hard number". 900px arena: a 3s ring gap makes the band
// wider than the map and stops being a sweep at all.
const TRIAL_SWEEP_SPEED = 6.7;   // px/frame on the leading edge (~400px/s)
const TRIAL_SWEEP_GAP   = 45;    // frames between leading and trailing edge (0.75s)
const TRIAL_SWEEP_BAND  = TRIAL_SWEEP_SPEED * TRIAL_SWEEP_GAP;  // ~300px
const TRIAL_SWEEP_LIFE  = 150;   // frames — crosses a 900px arena with margin
const TRIAL_ECHO_LIFE   = 180;   // frames a crossing residue lingers (3s dwell)

function resetTrialState() {
  trialActive = null;
  trialSweeps.length = 0;
  trialEchoes.length = 0;
  trialCues.length   = 0;
  trialInvert = null;
  if (typeof tfGravityInverted !== 'undefined') tfGravityInverted = false;
  if (typeof tfControlsInverted !== 'undefined') tfControlsInverted = false;
}

// ============================================================
// TRIAL 1 — SENSE
// ============================================================

// The lantern's ability. Deals no damage: it fires a reveal sweep instead.
// Called from WEAPONS.lantern.ability, which is why this is a global function
// rather than a closure — the weapon table loads before this file.
function trialLanternSweep(user) {
  if (!user || user.health <= 0) return;
  trialSweeps.push({ x: user.cx(), y: user.cy(), r: 0, life: TRIAL_SWEEP_LIFE, seen: new Set() });
  if (typeof spawnRing === 'function') spawnRing(user.cx(), user.cy());
  if (typeof SoundManager !== 'undefined' && SoundManager.ability) SoundManager.ability();
}

// Every fighter the sweep is meant to find. Kept as a helper so the invisible
// flag is read in exactly one place.
function _trialHiddenFighters() {
  if (typeof players === 'undefined') return [];
  const out = [];
  for (const p of players) if (p && p._trialInvisible && p.health > 0) out.push(p);
  if (typeof minions !== 'undefined' && Array.isArray(minions)) {
    for (const m of minions) if (m && m._trialInvisible && m.health > 0) out.push(m);
  }
  return out;
}

function updateTrialSweeps() {
  const hidden = _trialHiddenFighters();

  for (let i = trialSweeps.length - 1; i >= 0; i--) {
    const s = trialSweeps[i];
    s.r += TRIAL_SWEEP_SPEED;
    s.life--;

    // The band is the annulus between the leading and trailing edge. When it
    // crosses a hidden body, stamp an echo AT THAT MOMENT'S POSITION — the
    // player learns where they were, and it is stale the instant they have it.
    const inner = s.r - TRIAL_SWEEP_BAND;
    for (const h of hidden) {
      if (s.seen.has(h)) continue;
      const d = Math.hypot(h.cx() - s.x, h.cy() - s.y);
      if (d <= s.r && d >= inner) {
        s.seen.add(h);
        // One echo per body, always the most recent: what the player knows is
        // where they were LAST, not a trail. Also stops additive residue from
        // stacking into an opaque blob if sweeps ever overlap.
        for (let e = trialEchoes.length - 1; e >= 0; e--) if (trialEchoes[e].src === h) trialEchoes.splice(e, 1);
        trialEchoes.push({ src: h, x: h.cx(), y: h.cy(), w: h.w, h: h.h, life: TRIAL_ECHO_LIFE, max: TRIAL_ECHO_LIFE });
      }
    }
    if (s.life <= 0 || inner > (typeof GAME_W !== 'undefined' ? GAME_W : 900) * 1.6) trialSweeps.splice(i, 1);
  }

  for (let i = trialEchoes.length - 1; i >= 0; i--) {
    if (--trialEchoes[i].life <= 0) trialEchoes.splice(i, 1);
  }
}

// Secondary cues. 70% blind is a coin flip at this game's combat cadence, so
// three things stay visible even while the body does not: the weapon arc when
// the opponent swings, footfall dust on landing, and the hit reaction when the
// player connects. The lantern is for FINDING; once engaged, the fight has
// feedback.
function updateTrialCues() {
  for (const h of _trialHiddenFighters()) {
    // 1. Weapon arc — fires on the rising edge of an attack.
    const atk = h.attackTimer > 0;
    if (atk && !h._trialWasAttacking) {
      trialCues.push({ kind: 'swing', x: h.cx(), y: h.cy(), facing: h.facing || 1, life: 14, max: 14 });
    }
    h._trialWasAttacking = atk;

    // 2. Footfall dust — fires on the rising edge of ground contact.
    if (h.onGround && !h._trialWasGrounded) {
      trialCues.push({ kind: 'land', x: h.cx(), y: h.y + h.h, life: 20, max: 20 });
      if (typeof spawnParticles === 'function') spawnParticles(h.cx(), h.y + h.h, '#b8b0a0', 5);
    }
    h._trialWasGrounded = h.onGround;

    // 3. Hit reaction — fires when the body loses health.
    if (h._trialLastHp === undefined) h._trialLastHp = h.health;
    if (h.health < h._trialLastHp) {
      trialCues.push({ kind: 'hit', x: h.cx(), y: h.cy(), w: h.w, h: h.h, life: 16, max: 16 });
    }
    h._trialLastHp = h.health;
  }

  for (let i = trialCues.length - 1; i >= 0; i--) {
    if (--trialCues[i].life <= 0) trialCues.splice(i, 1);
  }
}

// ── Rendering ───────────────────────────────────────────────────────────────
// The band does NOT show the opponent. It shows distortions in space, and the
// invisible opponent distorts space. The reveal being indirect is the whole
// mechanic — the player infers a body from a disturbance rather than reading a
// marker. That is the difference between a skill and a wallhack.
function drawTrialSweeps() {
  if (!trialSweeps.length && !trialEchoes.length && !trialCues.length) return;
  const t = (typeof frameCount !== 'undefined' ? frameCount : 0);

  for (const s of trialSweeps) {
    const inner = Math.max(0, s.r - TRIAL_SWEEP_BAND);
    const fade  = Math.min(1, s.life / 30);

    ctx.save();
    // The band itself — a lens of visible reality, brightest at the leading edge
    // and falling off toward the trailing one. Drawn additively so it reads on a
    // near-black arena (Null space, the void) as well as a bright one.
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(s.x, s.y, inner, s.x, s.y, Math.max(inner + 1, s.r));
    g.addColorStop(0,    'rgba(90,150,190,0)');
    g.addColorStop(0.45, `rgba(90,160,200,${0.10 * fade})`);
    g.addColorStop(0.90, `rgba(140,215,255,${0.30 * fade})`);
    g.addColorStop(1,    `rgba(200,240,255,${0.16 * fade})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(inner + 1, s.r), 0, Math.PI * 2);
    if (inner > 0) { ctx.arc(s.x, s.y, inner, 0, Math.PI * 2, true); }
    ctx.fill();

    // Leading edge — the bright front of the sweep
    ctx.strokeStyle = `rgba(190,240,255,${0.35 * fade})`;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(235,252,255,${0.95 * fade})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
    // Trailing edge, fainter — the band closing behind
    if (inner > 0) {
      ctx.strokeStyle = `rgba(140,210,255,${0.45 * fade})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, inner, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Space distortion inside the band, wherever a hidden body sits. Concentric
    // warped arcs around the body — a refraction, not a silhouette.
    for (const h of _trialHiddenFighters()) {
      const dx = h.cx() - s.x, dy = h.cy() - s.y;
      const d = Math.hypot(dx, dy);
      if (d > s.r || d < inner) continue;
      const near = 1 - Math.abs(d - (s.r - TRIAL_SWEEP_BAND * 0.5)) / (TRIAL_SWEEP_BAND * 0.5);
      const a = Math.max(0, Math.min(1, near)) * fade;
      _drawTrialDistortion(h.cx(), h.cy(), h.w, h.h, a, t);
    }
    ctx.restore();
  }

  // Time-stamped residue: where a body WAS when the band crossed it.
  for (const e of trialEchoes) {
    const a = (e.life / e.max) * 0.5;
    ctx.save();
    _drawTrialDistortion(e.x, e.y, e.w, e.h, a, t);
    ctx.restore();
  }

  drawTrialCues();
}

// A pocket of bent space. Deliberately reads as "something is wrong here",
// not as an outline of a fighter — concentric arcs that wobble, with a
// chromatic split at the rim.
function _drawTrialDistortion(cx, cy, w, h, alpha, t) {
  if (alpha <= 0.01) return;
  const rad = Math.max(w, h) * 0.8;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  // Core smear first — the pull toward the centre of the disturbance
  const cg = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad * 1.5);
  cg.addColorStop(0,   'rgba(150,215,255,0.55)');
  cg.addColorStop(0.5, 'rgba(120,180,255,0.20)');
  cg.addColorStop(1,   'rgba(120,180,255,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(cx, cy, rad * 1.5, 0, Math.PI * 2); ctx.fill();
  // Concentric warped rings — a refraction, never a silhouette
  for (let ring = 0; ring < 5; ring++) {
    const rr = rad * (0.35 + ring * 0.21);
    ctx.beginPath();
    for (let k = 0; k <= 26; k++) {
      const ang = (k / 26) * Math.PI * 2;
      const wob = Math.sin(ang * 3 + t * 0.09 + ring) * (3.0 + ring * 1.3);
      const px = cx + Math.cos(ang) * (rr + wob);
      const py = cy + Math.sin(ang) * (rr + wob) * 1.15;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = ring % 2 ? 'rgba(120,255,235,0.95)' : 'rgba(190,160,255,0.85)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrialCues() {
  for (const c of trialCues) {
    const a = c.life / c.max;
    ctx.save();
    if (c.kind === 'swing') {
      // The arc of a weapon moving through air — visible even when the arm is not.
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = 'rgba(255,245,205,0.9)';
      ctx.lineWidth = 3;
      const dir = c.facing >= 0 ? 1 : -1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 52, dir > 0 ? -0.9 : Math.PI + 0.9, dir > 0 ? 0.9 : Math.PI - 0.9, dir < 0);
      ctx.stroke();
      ctx.globalAlpha = a * 0.35;
      ctx.lineWidth = 8;
      ctx.stroke();
    } else if (c.kind === 'land') {
      ctx.globalAlpha = a * 0.6;
      ctx.strokeStyle = 'rgba(210,205,190,0.9)';
      ctx.lineWidth = 2;
      const spread = (1 - a) * 26;
      ctx.beginPath(); ctx.ellipse(c.x, c.y - 2, 16 + spread, 5 + spread * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (c.kind === 'hit') {
      // Connecting reveals the body for a beat — the fight has feedback.
      ctx.globalAlpha = a * 0.8;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
      ctx.strokeStyle = 'rgba(255,120,120,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
    }
    ctx.restore();
  }
}

// ── The stalking AI ─────────────────────────────────────────────────────────
// Purpose-built, NOT an expert bot with the draw call removed — an invisible
// fighter running normal aggression simply deletes the player. It stalks:
// approach, one strike, retreat, reposition elsewhere. The retreat is also what
// makes stale sweep information meaningful.
// Navigation. The stalk state machine decides WHERE to stand and WHEN to strike;
// getting there is delegated to the engine's own platform graph. Hand-rolling it
// produced a stalker that could not cross the ruins floor gaps or climb to a
// target two decks up, and walked itself under the world trying.
// Returns true if a waypoint was followed.
function _trialNavigateTo(f, tx, ty, spd) {
  if (typeof pfGetNextWaypoint !== 'function') return false;
  const wp = pfGetNextWaypoint(f, tx, ty);
  if (!wp) return false;
  const wpDir = wp.x > f.cx() ? 1 : -1;

  if (wp.action === 'jump') {
    f.vx = wpDir * spd * 1.05;
    if (f.onGround) f.vy = -20;
  } else if (wp.action === 'doubleJump') {
    f.vx = wpDir * spd * 1.1;
    if (f.onGround) { f.vy = -20; f._pfDoubleJumpPending = true; }
    else if (f._pfDoubleJumpPending && f.canDoubleJump && f.vy >= -2) {
      f.vy = -17; f.canDoubleJump = false; f._pfDoubleJumpPending = false;
    }
  } else if (wp.action === 'drop') {
    const safe = (typeof pfDropSafe === 'function') ? pfDropSafe(f, wpDir)
               : !(currentArena && currentArena.hasLava);
    if (safe) f.vx = wpDir * spd;
    else { if (typeof forceRecalculatePath === 'function') forceRecalculatePath(f); f.vx = 0; }
  } else {
    const voidFwd  = typeof pfVoidAhead === 'function' && pfVoidAhead(f, wpDir);
    const voidBack = typeof pfVoidAhead === 'function' && pfVoidAhead(f, -wpDir);
    if (voidFwd && voidBack) f.vx = 0;
    else if (voidFwd)        f.vx = wpDir * spd * 0.38;
    else                     f.vx = wpDir * spd;
  }
  return true;
}

const TRIAL_STALK = { APPROACH: 0, STRIKE: 1, RETREAT: 2, CIRCLE: 3 };

function trialStalkAI(f) {
  if (!f || f.health <= 0) return;
  if (f.ragdollTimer > 0 || f.stunTimer > 0) return;

  // Target validation is not optional here: this replaces Fighter.updateAI
  // wholesale, so losing it would leave a statue on target death.
  if (f._isInvalidAITarget(f.target)) f._acquireAITarget();
  f._trialRetargetCd = (f._trialRetargetCd || 0) - 1;
  if (f._trialRetargetCd <= 0) { f._acquireAITarget(); f._trialRetargetCd = 4; }
  const tgt = f.target;
  if (!tgt || tgt.health <= 0) { f.vx *= 0.85; return; }

  // updateAI is called once every AI_TICK_INTERVAL frames (15), NOT every
  // frame. Authoring timers in ticks silently makes every phase 15x longer than
  // it reads — so durations are written in frames and converted here.
  const tick = f.aiTickInterval || (typeof AI_TICK_INTERVAL !== 'undefined' ? AI_TICK_INTERVAL : 15);
  // Durations below are in FRAMES (60/s): strike windup ~0.25s, retreat ~1s,
  // reposition ~1.5-2.5s. A 15-frame tick floors every phase at 0.25s.
  const T = frames => Math.max(1, Math.round(frames / tick));

  if (f._stalkPhase === undefined) { f._stalkPhase = TRIAL_STALK.APPROACH; f._stalkTimer = 0; f._stalkSide = 1; }
  f._stalkTimer--;

  const dx    = tgt.cx() - f.cx();
  const adx   = Math.abs(dx);
  const dy    = tgt.cy() - f.cy();       // positive => target is BELOW
  const dir   = dx >= 0 ? 1 : -1;
  const reach = (f.weapon && f.weapon.range) ? Math.min(f.weapon.range, 90) : 70;
  // vx is set once per AI tick (15 frames) and friction eats most of it before
  // the next one, so the authored speed has to overshoot to produce a real
  // closing rate. Approach commits harder than the standoff phases.
  const speed = 7.6;

  switch (f._stalkPhase) {
    case TRIAL_STALK.APPROACH: {
      // Close in on the chosen side so the player cannot simply hold one
      // direction. Getting there is the pathfinder's job.
      const wantX = tgt.cx() - f._stalkSide * (reach * 0.8);
      if (!_trialNavigateTo(f, wantX, tgt.y + tgt.h * 0.5, speed)) {
        const mvDir = (wantX - f.cx()) > 0 ? 1 : -1;
        if (Math.abs(wantX - f.cx()) > 8 && !f.isEdgeDanger(mvDir)) f.vx = mvDir * speed;
        else f.vx *= 0.8;
      }
      f.facing = dir;
      if (adx <= reach && Math.abs(dy) < 70) { f._stalkPhase = TRIAL_STALK.STRIKE; f._stalkTimer = T(14); }
      // Never stall in the approach. Switching flank keeps the pressure on;
      // dropping to the standoff phase here made the stalker spend a third of
      // the fight walking back out to 250px and it never closed at all.
      if (f._stalkTimer < -T(190)) { f._stalkSide = -f._stalkSide; f._stalkTimer = 0; }
      break;
    }
    case TRIAL_STALK.STRIKE: {
      f.vx *= 0.7;
      f.facing = dir;
      if (f._stalkTimer <= 0) {
        if (adx <= reach + 20 && Math.abs(dy) < 80) f.attack();
        // One strike, then break contact regardless of whether it landed.
        f._stalkPhase = TRIAL_STALK.RETREAT;
        f._stalkTimer = T(60 + Math.random() * 45);
      }
      break;
    }
    case TRIAL_STALK.RETREAT: {
      const away = -dir;
      if (!f.isEdgeDanger(away)) f.vx = away * speed * 1.15;
      else { f.vx = dir * speed * 0.5; f._stalkTimer = Math.min(f._stalkTimer, 1); }
      if (f._stalkTimer <= 0) {
        f._stalkPhase = TRIAL_STALK.CIRCLE;
        f._stalkTimer = T(95 + Math.random() * 70);
        f._stalkSide  = Math.random() < 0.5 ? -1 : 1;   // reposition elsewhere
      }
      break;
    }
    case TRIAL_STALK.CIRCLE: {
      // Hold at a distance and reposition, so the player's sweep information is
      // genuinely stale by the time they act on it.
      const wantX = tgt.cx() + f._stalkSide * 190;
      if (!_trialNavigateTo(f, wantX, tgt.y + tgt.h * 0.5, speed * 0.6)) {
        const mvDir = (wantX - f.cx()) > 0 ? 1 : -1;
        if (Math.abs(wantX - f.cx()) > 14 && !f.isEdgeDanger(mvDir)) f.vx = mvDir * speed * 0.6;
        else f.vx *= 0.85;
      }
      f.facing = dir;
      if (f._stalkTimer <= 0) { f._stalkPhase = TRIAL_STALK.APPROACH; f._stalkTimer = 0; }
      break;
    }
  }

  // Never idle, never freeze: a dead-end state machine leaves the fighter
  // standing still, which is the one thing AI work in this codebase must not do.
  if (f._stalkTimer < -T(600)) { f._stalkPhase = TRIAL_STALK.APPROACH; f._stalkTimer = 0; }
  // Anti-freeze nudge — edge-guarded. Unguarded it walked the stalker straight
  // into a floor gap, which is how it kept ending up under the world.
  if (f.onGround && Math.abs(f.vx) < 0.2 && adx > reach && !f.isEdgeDanger(dir)) f.vx = dir * speed * 0.6;
}

// ============================================================
// TRIAL 2 — CONTROL
// ============================================================
// The arena inverts gravity and/or the player's controls on a tell the player
// has to learn to read. Tests adaptation under a changing rule rather than
// perception. tfGravityInverted / tfControlsInverted already exist as live
// globals, so the work here is the tell and the scheduling.
const TRIAL_INVERT_TELL = 90;    // frames of warning before the flip lands

function startTrialControl() {
  trialInvert = { timer: 240, tell: 0, mode: 'none', next: 'gravity' };
}

function updateTrialControl() {
  if (!trialInvert) return;
  const s = trialInvert;

  if (s.tell > 0) {
    s.tell--;
    if (s.tell === 0) {
      // The flip lands.
      s.mode = s.next;
      if (s.mode === 'gravity')  { if (typeof tfGravityInverted  !== 'undefined') tfGravityInverted  = !tfGravityInverted; }
      if (s.mode === 'controls') { if (typeof tfControlsInverted !== 'undefined') tfControlsInverted = !tfControlsInverted; }
      if (typeof screenShake !== 'undefined') screenShake = 12;
      s.timer = 420 + Math.floor(Math.random() * 240);
    }
    return;
  }

  if (--s.timer <= 0) {
    s.tell = TRIAL_INVERT_TELL;
    s.next = Math.random() < 0.55 ? 'gravity' : 'controls';
  }
}

// The tell. Readable, and different per axis so the player can learn WHICH rule
// is about to change rather than only THAT one is.
function drawTrialControlTell() {
  if (!trialInvert || trialInvert.tell <= 0) return;
  const p = 1 - trialInvert.tell / TRIAL_INVERT_TELL;
  const pulse = 0.35 + Math.abs(Math.sin(trialInvert.tell * 0.22)) * 0.45;
  const grav = trialInvert.next === 'gravity';
  const col  = grav ? '160,120,255' : '255,190,90';
  const W = (typeof GAME_W !== 'undefined' ? GAME_W : 900);
  const H = (typeof GAME_H !== 'undefined' ? GAME_H : 520);

  ctx.save();
  // Gravity: bands sweep vertically. Controls: bands sweep horizontally.
  ctx.globalAlpha = pulse * 0.5;
  ctx.strokeStyle = `rgba(${col},0.9)`;
  ctx.lineWidth = 2;
  if (grav) {
    for (let i = 0; i < 6; i++) {
      const y = ((p * H * 1.4) + i * (H / 6)) % H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const x = ((p * W * 1.4) + i * (W / 6)) % W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  }
  ctx.restore();

  // The wording is screen-space: drawTrials runs inside the world transform, so
  // a world-space label sat off-camera and was never actually read.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = `rgba(${col},1)`;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth   = 4;
  ctx.font        = 'bold 22px monospace';
  ctx.textAlign   = 'center';
  const label = grav ? 'DOWN IS CHANGING' : 'LEFT IS CHANGING';
  ctx.strokeText(label, canvas.width / 2, canvas.height * 0.22);
  ctx.fillText(label,   canvas.width / 2, canvas.height * 0.22);
  ctx.restore();
}

// ============================================================
// TRIAL 3 — SELF-KNOWLEDGE
// ============================================================
// A copy of the player that mirrors their inputs on a short delay. It cannot be
// beaten by reflex, only by breaking your own pattern. Thematically this quietly
// foreshadows Sovereign, whose whole design is reading the player's habits.
const TRIAL_MIRROR_DELAY = 34;   // frames

function trialMirrorRecord(p1) {
  if (!p1 || trialActive !== 'selfknowledge') return;
  if (!p1._trialTape) p1._trialTape = [];
  p1._trialTape.push({ vx: p1.vx, jump: !p1.onGround && p1.vy < 0, atk: p1.attackTimer > 0, face: p1.facing });
  if (p1._trialTape.length > TRIAL_MIRROR_DELAY + 4) p1._trialTape.shift();
}

function trialMirrorAI(f) {
  if (!f || f.health <= 0) return;
  if (f.ragdollTimer > 0 || f.stunTimer > 0) return;
  const src = f._mirrorSource;
  if (!src || !src._trialTape || src._trialTape.length <= TRIAL_MIRROR_DELAY) {
    // No tape yet — hold position rather than idling into a wall.
    f.vx *= 0.85;
    return;
  }
  const frame = src._trialTape[0];
  // Mirrored about the arena, so the copy moves as the player's reflection.
  f.vx = -frame.vx;
  f.facing = -frame.face;
  if (frame.jump && f.onGround) f.vy = -17;
  if (frame.atk) f.attack();
}

// ============================================================
// PER-FRAME ENTRY POINTS (called from gameLoop)
// ============================================================
function updateTrials() {
  if (!trialActive) return;
  if (trialActive === 'sense') { updateTrialSweeps(); updateTrialCues(); }
  if (trialActive === 'control') updateTrialControl();
  if (trialActive === 'selfknowledge' && typeof players !== 'undefined') trialMirrorRecord(players[0]);
}

function drawTrials() {
  if (!trialActive) return;
  if (trialActive === 'sense')   drawTrialSweeps();
  if (trialActive === 'control') drawTrialControlTell();
}
