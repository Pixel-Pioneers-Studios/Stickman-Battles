'use strict';
// smb-verlet.js — VerletPoint, VerletStick, VerletRagdoll, PlayerRagdoll classes
// Depends on: smb-globals.js
// VERLET RAGDOLL — position-based dynamics for death animation
// ============================================================

class VerletPoint {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.ox = x; this.oy = y; // old position for Verlet
    this.pinned = false;
  }
  // Verlet integration step
  integrate(gravity = 0.55) {
    if (this.pinned) return;
    const vx = (this.x - this.ox) * 0.98; // friction
    const vy = (this.y - this.oy) * 0.98;
    this.ox = this.x; this.oy = this.y;
    this.x += vx;
    this.y += vy + gravity;
  }
  // Apply impulse
  impulse(ix, iy) { this.ox -= ix; this.oy -= iy; }
}

class VerletStick {
  constructor(a, b, len) {
    this.a = a; this.b = b;
    this.len = len ?? Math.hypot(b.x - a.x, b.y - a.y);
  }
  constrain() {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const diff = (dist - this.len) / dist * 0.5;
    if (!this.a.pinned) { this.a.x += dx * diff; this.a.y += dy * diff; }
    if (!this.b.pinned) { this.b.x -= dx * diff; this.b.y -= dy * diff; }
  }
}

// Joint angle limit. VerletStick only enforces distance, so a 17-stick rig with
// no angle limits has nothing stopping a knee bending backwards through the hip —
// seven solver iterations then compress it into a tangle. That is the "flops into
// a ball" failure mode, and it is structural, not a tuning issue.
//
// The limit is on the MAGNITUDE of the bend at `pivot` (|angle(a) - angle(b)|),
// which is handedness-agnostic: a corpse that tumbles over and mirrors itself is
// still constrained. Straight = PI, folded = 0.
class VerletAngleConstraint {
  constructor(a, pivot, b, minAng, maxAng, strength = 0.35) {
    this.a = a; this.pivot = pivot; this.b = b;
    this.min = minAng; this.max = maxAng;
    this.strength = strength;
  }
  constrain() {
    const p = this.pivot;
    const a1 = Math.atan2(this.a.y - p.y, this.a.x - p.x);
    const a2 = Math.atan2(this.b.y - p.y, this.b.x - p.x);
    let d = a2 - a1;
    while (d >  Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const sign = d < 0 ? -1 : 1;
    const mag  = Math.abs(d);
    let want;
    if (mag < this.min) want = this.min;
    else if (mag > this.max) want = this.max;
    else return;                       // inside the allowed cone — nothing to do
    // Rotate the far point around the pivot by half the correction, and the near
    // point by the other half, so the joint doesn't drag the whole rig one way.
    const corr = (want - mag) * sign * this.strength;
    VerletAngleConstraint._rotate(this.b, p,  corr * 0.5);
    VerletAngleConstraint._rotate(this.a, p, -corr * 0.5);
  }
  static _rotate(pt, pivot, ang) {
    if (pt.pinned || !ang) return;
    const c = Math.cos(ang), s = Math.sin(ang);
    const dx = pt.x - pivot.x, dy = pt.y - pivot.y;
    const nx = pivot.x + dx * c - dy * s;
    const ny = pivot.y + dx * s + dy * c;
    // Move the old position with it so the rotation adds no spurious velocity
    pt.ox += nx - pt.x; pt.oy += ny - pt.y;
    pt.x = nx; pt.y = ny;
  }
}

class VerletRagdoll {
  constructor(fighter) {
    const f = fighter;
    const cx = f.cx(), cy = f.cy();
    const h = f.h;

    // Joint positions relative to fighter center
    this.head     = new VerletPoint(cx, cy - h * 0.38);
    this.neck     = new VerletPoint(cx, cy - h * 0.25);
    this.lShoulder= new VerletPoint(cx - 12, cy - h * 0.18);
    this.rShoulder= new VerletPoint(cx + 12, cy - h * 0.18);
    this.lElbow   = new VerletPoint(cx - 22, cy - h * 0.04);
    this.rElbow   = new VerletPoint(cx + 22, cy - h * 0.04);
    this.lHand    = new VerletPoint(cx - 26, cy + h * 0.10);
    this.rHand    = new VerletPoint(cx + 26, cy + h * 0.10);
    this.lHip     = new VerletPoint(cx - 8,  cy + h * 0.06);
    this.rHip     = new VerletPoint(cx + 8,  cy + h * 0.06);
    this.lKnee    = new VerletPoint(cx - 10, cy + h * 0.25);
    this.rKnee    = new VerletPoint(cx + 10, cy + h * 0.25);
    this.lFoot    = new VerletPoint(cx - 10, cy + h * 0.42);
    this.rFoot    = new VerletPoint(cx + 10, cy + h * 0.42);

    this.points = [
      this.head, this.neck,
      this.lShoulder, this.rShoulder,
      this.lElbow, this.rElbow, this.lHand, this.rHand,
      this.lHip, this.rHip,
      this.lKnee, this.rKnee, this.lFoot, this.rFoot,
    ];

    // Sticks (bones) — each enforces a constant distance
    this.sticks = [
      new VerletStick(this.head,     this.neck),       // spine-neck
      new VerletStick(this.neck,     this.lShoulder),
      new VerletStick(this.neck,     this.rShoulder),
      new VerletStick(this.lShoulder,this.lElbow),
      new VerletStick(this.lElbow,   this.lHand),
      new VerletStick(this.rShoulder,this.rElbow),
      new VerletStick(this.rElbow,   this.rHand),
      new VerletStick(this.lShoulder,this.lHip),       // torso left
      new VerletStick(this.rShoulder,this.rHip),       // torso right
      new VerletStick(this.lHip,     this.rHip),       // pelvis
      new VerletStick(this.lHip,     this.lKnee),
      new VerletStick(this.lKnee,    this.lFoot),
      new VerletStick(this.rHip,     this.rKnee),
      new VerletStick(this.rKnee,    this.rFoot),
      new VerletStick(this.lShoulder,this.rShoulder),  // shoulder girdle
      new VerletStick(this.neck,     this.lHip),       // diagonal stabilizer
      new VerletStick(this.neck,     this.rHip),       // diagonal stabilizer
    ];

    // Joint angle limits — without these the rig tangles (see VerletAngleConstraint).
    // PI = fully straight, 0 = folded shut.
    const P = Math.PI;
    this.angles = [
      new VerletAngleConstraint(this.lHip,  this.lKnee, this.lFoot, P * 0.45, P),  // knee: no back-bend
      new VerletAngleConstraint(this.rHip,  this.rKnee, this.rFoot, P * 0.45, P),
      new VerletAngleConstraint(this.lShoulder, this.lElbow, this.lHand, P * 0.35, P), // elbow
      new VerletAngleConstraint(this.rShoulder, this.rElbow, this.rHand, P * 0.35, P),
      new VerletAngleConstraint(this.head,  this.neck,  this.lHip,  P * 0.61, P),  // neck ~±70deg
      new VerletAngleConstraint(this.head,  this.neck,  this.rHip,  P * 0.61, P),
      new VerletAngleConstraint(this.neck,  this.lHip,  this.lKnee, P * 0.39, P),  // hip ~110deg
      new VerletAngleConstraint(this.neck,  this.rHip,  this.rKnee, P * 0.39, P),
      new VerletAngleConstraint(this.neck,  this.lHip,  this.rHip,  P * 0.28, P),  // spine ~±50deg
    ];

    // Apply initial death impulse from the fighter's current velocity
    const ivx = (f.vx || 0) * 0.6;
    const ivy = (f.vy || 0) * 0.5 - 2;
    const spin = (f.ragdollSpin || 0) * 14;
    this.points.forEach(p => {
      p.impulse(-ivx + (Math.random() - 0.5) * 2, -ivy + (Math.random() - 0.5) * 2);
      // Apply spin: offset from center causes rotation
      const rx = p.x - cx, ry = p.y - cy;
      p.impulse(-spin * ry * 0.012, spin * rx * 0.012);
    });

    this.color  = f.color || '#aaaaaa';
    // Corpse fidelity: match the fighter's own line weight and head size so the
    // body on the ground reads as the character that just died, not a grey twig.
    this.headR  = f.headR || FIG_HEAD_R;
    this.limbW  = f.isBoss ? 7 : 5;
    const RAGDOLL_LIFETIME_FRAMES = 240; // despawn after ~4s to prevent accumulation
    this.timer  = RAGDOLL_LIFETIME_FRAMES;
    this.alpha  = 1;
    this.floorY = 460;   // default floor Y; updated from arena
  }

  update() {
    this.timer--;
    if (this.timer < 60) this.alpha = this.timer / 60;

    // Integrate all points
    this.points.forEach(p => p.integrate(0.55));

    // Constraint iterations (7 per frame prevents collapse)
    for (let iter = 0; iter < 7; iter++) {
      this.sticks.forEach(s => s.constrain());
      if (this.angles) this.angles.forEach(a => a.constrain());
      this._groundCollide();
    }
  }

  _groundCollide() {
    // Use arena platforms for collision
    const plats = currentArena?.platforms || [];
    this.points.forEach(p => {
      // Arena floor fallback
      if (p.y > this.floorY) {
        p.y = this.floorY;
        p.oy = p.y + (p.y - p.oy) * 0.35; // bounce damp
        p.ox = p.ox + (p.x - p.ox) * 0.25; // floor friction
      }
      // Screen sides
      if (p.x < 0)       { p.x = 0;       p.ox = p.x + (p.x - p.ox) * 0.4; }
      if (p.x > GAME_W)  { p.x = GAME_W;  p.ox = p.x + (p.x - p.ox) * 0.4; }
      // Platform surfaces (only top collision)
      for (const pl of plats) {
        if (pl.isFloorDisabled) continue;
        if (p.x > pl.x && p.x < pl.x + pl.w && p.y > pl.y && p.y < pl.y + pl.h + 12) {
          p.y = pl.y;
          p.oy = p.y + (p.y - p.oy) * 0.35;
          p.ox = p.ox + (p.x - p.ox) * 0.25;
        }
      }
    });
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';

    ctx.lineJoin = 'round';

    // Draw bones (sticks). The three diagonal stabilizers and the shoulder
    // girdle are internal structure, not silhouette — skip them.
    const hidden = this.sticks.slice(-3);
    for (const s of this.sticks) {
      if (hidden.includes(s)) continue;
      ctx.lineWidth = s === this.sticks[0] ? this.limbW + 1 : this.limbW;
      ctx.beginPath();
      ctx.moveTo(s.a.x, s.a.y);
      ctx.lineTo(s.b.x, s.b.y);
      ctx.stroke();
    }
    // Torso slab between the shoulder girdle and the pelvis, so the corpse has
    // a body rather than a gap where the chest should be.
    ctx.beginPath();
    ctx.moveTo(this.lShoulder.x, this.lShoulder.y);
    ctx.lineTo(this.rShoulder.x, this.rShoulder.y);
    ctx.lineTo(this.rHip.x, this.rHip.y);
    ctx.lineTo(this.lHip.x, this.lHip.y);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha * 0.9;
    ctx.fill();
    ctx.globalAlpha = this.alpha;

    // Head circle at the fighter's real head radius
    ctx.beginPath();
    ctx.arc(this.head.x, this.head.y, this.headR, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    // X eyes — reads as dead at a glance, and costs four lines
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth   = 2;
    const _hr = this.headR * 0.34;
    for (const ex of [-this.headR * 0.36, this.headR * 0.36]) {
      ctx.beginPath();
      ctx.moveTo(this.head.x + ex - _hr * 0.5, this.head.y - _hr * 0.5);
      ctx.lineTo(this.head.x + ex + _hr * 0.5, this.head.y + _hr * 0.5);
      ctx.moveTo(this.head.x + ex + _hr * 0.5, this.head.y - _hr * 0.5);
      ctx.lineTo(this.head.x + ex - _hr * 0.5, this.head.y + _hr * 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  isDone() { return this.timer <= 0; }
}

// ============================================================
// PLAYER RAGDOLL — per-limb spring-damper physics
//
// Each limb (rArm, lArm, rLeg, lLeg, head, torso) carries:
//   angle (radians) — current draw angle
//   vel   (rad/frame) — angular velocity
//
// Every frame: spring pulls angle toward naturalPose(state),
// damping bleeds energy. Hit reactions apply impulses directly
// to the affected limb + sympathetic limbs.
//
// API:
//   PlayerRagdoll.createRagdoll(f)       — attach ragdoll to fighter
//   PlayerRagdoll.updateLimbs(f)         — spring-step each frame
//   PlayerRagdoll.applyHit(f, fx, fy, ix, iy) — directional hit impulse
//   PlayerRagdoll.applyJump(f)           — jump kick impulse
//   PlayerRagdoll.applyMovement(f)       — lean into movement
//   PlayerRagdoll.collapse(f)            — knockout (max floppiness)
//   PlayerRagdoll.standUp(f)             — respawn recovery ramp
//   PlayerRagdoll.debugDraw(f, cx, sy, hy) — joint overlay (window.rdDebug=true)
// ============================================================
class PlayerRagdoll {

  /** Attach ragdoll state to a fighter (idempotent). */
  static createRagdoll(f) {
    if (f._rd) return f._rd;
    f._rd = {
      rArm:  { angle: Math.PI * 0.58, vel: 0 },
      lArm:  { angle: Math.PI * 0.42, vel: 0 },
      rLeg:  { angle: Math.PI * 0.62, vel: 0 },
      lLeg:  { angle: Math.PI * 0.38, vel: 0 },
      head:  { angle: 0,              vel: 0 },
      torso: { angle: 0,              vel: 0 },
      // State flags
      collapsed:     false,   // knockout — near-zero stiffness
      recovering:    false,   // slowly ramping stiffness back up
      recoveryTimer: 0,       // 0-90 frames
      // Physics constants (overridden by collapse/standUp)
      stiffness: 0.18,        // spring strength toward natural pose
      damping:   0.82,        // velocity decay per frame
    };
    return f._rd;
  }

  // ---- Frame update ----

  /**
   * Advance the spring-damper simulation one frame.
   * Computes the natural pose for the fighter's current state,
   * then pulls each limb angle toward it with spring + damping.
   */
  static updateLimbs(f) {
    const rd = f._rd;
    if (!rd) return;

    // Recovery: ramp stiffness from near-zero back to normal over 90 frames
    if (rd.recovering) {
      rd.recoveryTimer++;
      if (rd.recoveryTimer >= 90) {
        rd.collapsed     = false;
        rd.recovering    = false;
        rd.recoveryTimer = 0;
        rd.stiffness     = 0.18;
        rd.damping       = 0.82;
      }
    }

    // Effective spring constant: collapsed → very loose; recovering → ramping
    const k = rd.collapsed
      ? 0.004
      : rd.recovering
        ? 0.004 + (rd.stiffness - 0.004) * (rd.recoveryTimer / 90)
        : rd.stiffness;
    const d = rd.collapsed ? 0.89 : rd.damping;

    const pose = PlayerRagdoll._naturalPose(f);
    for (const limb of ['rArm', 'lArm', 'rLeg', 'lLeg', 'head', 'torso']) {
      const jt  = rd[limb];
      jt.vel   += (pose[limb] - jt.angle) * k;   // spring force
      jt.vel   *= d;                               // damping
      jt.angle += jt.vel;                          // integrate
    }
  }

  // ---- Natural pose by animation state ----

  /**
   * Returns target { rArm, lArm, rLeg, lLeg, head, torso } angles (radians)
   * for the fighter's current state.  The spring system pulls limbs here.
   */
  static _naturalPose(f) {
    const s    = f.state;
    const t    = f.animTimer;
    const face = f.facing;
    const rd   = f._rd;

    // Authored death beats own the pose outright (smb-death-anim.js). Without
    // this the collapsed branch below drags every death back to one silhouette.
    if (f._death && f._death.pose) return f._death.pose;

    // Collapsed (dead / knocked out): fully limp on the ground
    if (rd && rd.collapsed) {
      return {
        rArm:  Math.PI * 0.88,
        lArm:  Math.PI * 0.12,
        rLeg:  Math.PI * 0.74,
        lLeg:  Math.PI * 0.26,
        head:  0.36 * (face > 0 ? 1 : -1),
        torso: 0.14,
      };
    }

    // Ragdoll hit-flung: limbs trail loosely
    if (s === 'ragdoll') {
      return {
        rArm:  Math.PI * 0.92,
        lArm:  Math.PI * 0.08,
        rLeg:  Math.PI * 0.76,
        lLeg:  Math.PI * 0.24,
        head:  0,
        torso: 0,
      };
    }

    // Stunned: limp arms, slightly open stance
    if (s === 'stunned') {
      const sw = Math.sin(t * 0.06) * 0.05;
      return {
        rArm:  Math.PI * 0.76 + sw,
        lArm:  Math.PI * 0.24 - sw,
        rLeg:  Math.PI * 0.60,
        lLeg:  Math.PI * 0.40,
        head:  Math.sin(t * 0.07) * 0.10,
        torso: 0,
      };
    }

    // Hurt: arms pulled back, cringe
    if (s === 'hurt') {
      return {
        rArm:  Math.PI * 0.72,
        lArm:  Math.PI * 0.28,
        rLeg:  Math.PI * 0.58,
        lLeg:  Math.PI * 0.42,
        head:  -0.12,
        torso: 0,
      };
    }

    // Attacking: forward swing (direction-aware; per-weapon grammar when available)
    if (s === 'attacking') {
      const p = f.attackDuration > 0 ? 1 - f.attackTimer / f.attackDuration : 0;
      const _sp = (typeof swingPose === 'function' && f.charClass !== 'megaknight')
        ? swingPose(f.weaponKey, p, face, f._jabAlt) : null;
      return face > 0
        ? { rArm: _sp ? _sp.ang : lerp(-0.45, 1.1, p), lArm: lerp(Math.PI * 0.80, Math.PI * 0.55, p),
            rLeg: Math.PI * 0.55,      lLeg: Math.PI * 0.45,
            head: -0.08, torso: -0.06 * p }
        : { rArm: _sp ? _sp.ang : lerp(Math.PI + 0.45, Math.PI - 1.1, p), lArm: lerp(Math.PI * 0.20, Math.PI * 0.45, p),
            rLeg: Math.PI * 0.55, lLeg: Math.PI * 0.45,
            head: -0.08, torso: 0.06 * p };
    }

    // Walking: discrete step phases (every 8 frames) — snappier, more deliberate stride
    if (s === 'walking') {
      const _stepPhase = Math.floor(t / 8) % 4;
      const sw = Math.sin(_stepPhase * Math.PI / 2) * 0.62;
      return {
        rArm:  Math.PI * 0.58 + sw,
        lArm:  Math.PI * 0.42 - sw,
        rLeg:  Math.PI * 0.50 + sw,
        lLeg:  Math.PI * 0.50 - sw,
        head:  sw * 0.06,
        torso: (face > 0 ? 0.05 : -0.05),
      };
    }

    if (s === 'jumping') {
      return { rArm: -0.25, lArm: Math.PI + 0.25, rLeg: Math.PI * 0.65, lLeg: Math.PI * 0.35, head: -0.10, torso: -0.04 };
    }

    if (s === 'falling') {
      return { rArm: -0.10, lArm: Math.PI + 0.10, rLeg: Math.PI * 0.56, lLeg: Math.PI * 0.44, head: 0.06, torso: 0.03 };
    }

    if (s === 'shielding') {
      return {
        rArm: face > 0 ? -0.25 : Math.PI + 0.25,
        lArm: face > 0 ? -0.55 : Math.PI + 0.55,
        rLeg: Math.PI * 0.60, lLeg: Math.PI * 0.40,
        head: 0, torso: 0,
      };
    }

    // Idle (default): gentle breath oscillation
    const b = Math.sin(t * 0.045) * 0.045;
    return {
      rArm:  Math.PI * 0.58 + b,
      lArm:  Math.PI * 0.42 - b,
      rLeg:  Math.PI * 0.62,
      lLeg:  Math.PI * 0.38,
      head:  Math.sin(t * 0.025) * 0.03,
      torso: 0,
    };
  }

  // ---- Hit reactions ----

  /**
   * Apply a directional impulse to the limb at the impact position.
   * Nearby limbs receive smaller sympathetic impulses.
   * @param {Fighter} f
   * @param {number}  forceX  world-space horizontal force (± = direction)
   * @param {number}  forceY  world-space vertical force
   * @param {number}  impactX world-space X of impact
   * @param {number}  impactY world-space Y of impact
   */
  static applyHit(f, forceX, forceY, impactX, impactY) {
    const rd    = PlayerRagdoll.createRagdoll(f);
    const mag   = Math.hypot(forceX, forceY);
    const scale = Math.min(mag * 0.012, 0.55);   // cap: prevents spinning forever
    const sign  = forceX >= 0 ? 1 : -1;

    // Classify impact region (0 = top of fighter, f.h = bottom)
    const relY       = impactY - f.y;
    const headZone   = relY < f.h * 0.22;
    const torsoZone  = relY < f.h * 0.55;
    const rightSide  = impactX > f.cx();

    if (headZone) {
      // Head struck: large head flick, arms snap sympathetically
      rd.head.vel  += sign * scale * 1.55;
      rd.torso.vel += sign * scale * 0.48;
      rd.rArm.vel  += sign * scale * 0.38;
      rd.lArm.vel  -= sign * scale * 0.22;
    } else if (torsoZone) {
      // Torso struck: body rotates, near-side arm flung out
      rd.torso.vel += sign * scale * 0.88;
      if (rightSide) { rd.rArm.vel += scale * 1.30; rd.lArm.vel -= scale * 0.28; }
      else            { rd.lArm.vel += scale * 1.30; rd.rArm.vel -= scale * 0.28; }
      rd.rLeg.vel  += sign * scale * 0.22;
    } else {
      // Leg struck: near-side leg kicked, torso wobbles upward
      if (rightSide) { rd.rLeg.vel += scale * 1.45; rd.lLeg.vel -= scale * 0.18; }
      else            { rd.lLeg.vel += scale * 1.45; rd.rLeg.vel -= scale * 0.18; }
      rd.torso.vel += sign * scale * 0.32;
      rd.head.vel  += sign * scale * 0.16;
    }
  }

  // ---- State transitions ----

  /** Knockout: all joint springs near-zero — fighter flops freely. */
  static collapse(f) {
    const rd = PlayerRagdoll.createRagdoll(f);
    rd.collapsed     = true;
    rd.recovering    = false;
    rd.recoveryTimer = 0;
    rd.stiffness     = 0.003;
    rd.damping       = 0.88;
    // Random tumble impulse to each limb
    for (const limb of ['rArm', 'lArm', 'rLeg', 'lLeg', 'head', 'torso']) {
      rd[limb].vel += (Math.random() - 0.5) * 0.50;
    }
  }

  /** Recovery: ramp stiffness back up over 90 frames — fighter stands up. */
  static standUp(f) {
    const rd = PlayerRagdoll.createRagdoll(f);
    rd.collapsed     = false;
    rd.recovering    = true;
    rd.recoveryTimer = 0;
    rd.stiffness     = 0.20;
    rd.damping       = 0.84;
  }

  /** Lean torso + arms into movement direction (more pronounced when moving fast). */
  static applyMovement(f) {
    if (!f._rd) return;
    const speed = Math.abs(f.vx);
    const leanAmt = speed > 0.5 ? 0.04 + Math.min(0.03, speed * 0.005) : 0;
    const lean = f.vx > 0.5 ? leanAmt : f.vx < -0.5 ? -leanAmt : 0;
    f._rd.torso.vel += lean;
  }

  /** Jump impulse: arms sweep upward, legs kick out. */
  static applyJump(f) {
    const rd = PlayerRagdoll.createRagdoll(f);
    rd.rArm.vel  -= 0.28;
    rd.lArm.vel  -= 0.28;
    rd.rLeg.vel  -= 0.16;
    rd.lLeg.vel  += 0.16;
    rd.torso.vel -= 0.09;
    rd.head.vel  -= 0.06;
  }

  // ---- Debug ----

  /**
   * Draw joint angle vectors + state info over the fighter.
   * Enable: window.rdDebug = true
   */
  static debugDraw(f, cx, shoulderY, hipY) {
    if (!f._rd || !window.rdDebug) return;
    const rd = f._rd;
    ctx.save();
    ctx.globalAlpha = 0.65;
    const R = 11;
    const joints = [
      { j: rd.rArm,  x: cx, y: shoulderY, color: '#ff4488', label: 'rA' },
      { j: rd.lArm,  x: cx, y: shoulderY, color: '#44aaff', label: 'lA' },
      { j: rd.rLeg,  x: cx, y: hipY,      color: '#ff8800', label: 'rL' },
      { j: rd.lLeg,  x: cx, y: hipY,      color: '#88ff00', label: 'lL' },
      { j: rd.torso, x: cx, y: (shoulderY + hipY) / 2, color: '#ffff00', label: 'T' },
      { j: rd.head,  x: cx, y: shoulderY - 14,         color: '#ffffff', label: 'H' },
    ];
    for (const jt of joints) {
      // Arc showing angle range
      ctx.strokeStyle = jt.color;
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.arc(jt.x, jt.y, R, jt.j.angle - 0.38, jt.j.angle + 0.38);
      ctx.stroke();
      // Velocity vector
      const vLen = Math.min(Math.abs(jt.j.vel) * 75, 15);
      ctx.beginPath();
      ctx.moveTo(jt.x, jt.y);
      ctx.lineTo(jt.x + Math.cos(jt.j.angle) * vLen, jt.y + Math.sin(jt.j.angle) * vLen);
      ctx.stroke();
      // Label + angle value
      ctx.fillStyle = jt.color;
      ctx.font      = '7px monospace';
      ctx.fillText(`${jt.label}:${jt.j.angle.toFixed(1)}`, jt.x + 14, jt.y + 4);
    }
    // State summary
    ctx.fillStyle = '#cccccc';
    ctx.font      = '8px monospace';
    ctx.fillText(
      `k=${rd.stiffness.toFixed(3)} col=${rd.collapsed ? 'Y' : 'N'} rec=${rd.recovering ? rd.recoveryTimer : 'N'}`,
      cx - 22, shoulderY - 25
    );
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
