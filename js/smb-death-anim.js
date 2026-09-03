'use strict';
// smb-death-anim.js — authored death & knockout (Phase 1 of docs/animation-quality-plan.md)
//
// Replaces "spawn a collapsed pose AND a verlet skeleton on top of it" with a
// three-beat authored performance that only THEN hands off to physics:
//
//   impact  → hard hold on the hit pose, flash, camera punch
//   stagger → a step in the knockback direction, torso folds, head lags
//   fall    → arc about the pelvis, limbs trail, squash + dust on contact
//   settle  → hand off to the angle-constrained verlet corpse, from where the
//             animation left it rather than teleporting into a curl
//
// Depends on: smb-anim-core.js (animEase, animHold, animDust, animArc),
//             smb-verlet.js (VerletRagdoll, PlayerRagdoll), smb-globals.js.
// Every external call is guarded — this file must never be able to break a death.
// ============================================================

const DEATH_BEATS = { impact: 6, stagger: 20, fall: 22 }; // frames per beat

const DeathAnim = {

  /** Active records, one per dying fighter. */
  _active: [],
  /** Dropped weapons / props left behind by deaths. */
  _props: [],

  // ── Entry point ───────────────────────────────────────────────────────────
  /**
   * Begin an authored death for `f`. Safe to call more than once — a fighter
   * already dying is ignored. `opts.verlet` false suppresses the corpse handoff
   * (used where the caller keeps the body around, e.g. Fracture branch rulers).
   */
  begin(f, opts = {}) {
    if (!f || f._death) return null;

    const hit  = f._lastHitCtx || null;
    const kb   = hit ? Math.abs(hit.kb || 0) : Math.abs(f.vx || 0);
    const dir  = hit ? (hit.dir || (f.facing > 0 ? -1 : 1)) : (f.vx >= 0 ? 1 : -1);
    const kind = DeathAnim._pickKind(f, hit, kb);

    const rec = {
      f, kind, dir,
      kb,
      beat:   'impact',
      t:      0,
      floorY: DeathAnim._floorY(f),
      landed: false,
      hidden: false,
      pose:   null,
      dropped: false,
      verlet: opts.verlet !== false && typeof VerletRagdoll !== 'undefined',
      startPose: DeathAnim._snapshotPose(f),
    };
    f._death = rec;
    DeathAnim._active.push(rec);

    // Keep the spring stiff through the authored beats so the fighter actually
    // holds the poses we give it. PlayerRagdoll.collapse() would go limp here.
    if (typeof PlayerRagdoll !== 'undefined') {
      const rd = PlayerRagdoll.createRagdoll(f);
      rd.collapsed  = false;
      rd.recovering = false;
      rd.stiffness  = 0.30;
      rd.damping    = 0.74;
    }

    DeathAnim._enterBeat(rec, 'impact');
    return rec;
  },

  /** True while `f`'s body is being drawn by an authored beat. */
  isAnimating(f) { return !!(f && f._death && !f._death.hidden); },

  /** Clear a fighter's death state — called from respawn paths. */
  clear(f) {
    if (!f) return;
    if (f._death) {
      const i = DeathAnim._active.indexOf(f._death);
      if (i >= 0) DeathAnim._active.splice(i, 1);
      f._death = null;
    }
    f._hideWeapon = false;
  },

  // ── Per-frame ─────────────────────────────────────────────────────────────
  update() {
    for (let i = DeathAnim._active.length - 1; i >= 0; i--) {
      const rec = DeathAnim._active[i];
      const f   = rec.f;
      if (!f || f._death !== rec) { DeathAnim._active.splice(i, 1); continue; }
      // A respawn (health restored) cancels the performance outright.
      if (f.health > 0) { DeathAnim.clear(f); continue; }
      DeathAnim._step(rec);
      if (rec.beat === 'done') { DeathAnim._active.splice(i, 1); }
    }
    // Props: simple ballistic tumble, then rest.
    for (let i = DeathAnim._props.length - 1; i >= 0; i--) {
      const w = DeathAnim._props[i];
      w.life--;
      if (w.life <= 0) { DeathAnim._props.splice(i, 1); continue; }
      if (!w.rest) {
        w.vy += 0.55;
        w.x  += w.vx;
        w.y  += w.vy;
        w.ang += w.spin;
        w.spin *= 0.985;
        w.vx  *= 0.995;
        if (w.y >= w.floorY) {
          w.y   = w.floorY;
          w.vy *= -0.28;
          w.vx *= 0.55;
          w.spin *= 0.4;
          if (Math.abs(w.vy) < 1.2) {
            w.rest = true;
            w.ang  = Math.round(w.ang / Math.PI) * Math.PI + Math.PI * 0.5; // lie flat
            if (typeof animDust === 'function') animDust(w.x, w.y, 0, 4);
          }
        }
      }
    }
  },

  /** Dropped weapons, drawn behind the living fighters. */
  drawProps() {
    if (typeof ctx === 'undefined') return;
    for (const w of DeathAnim._props) {
      const owner = w.owner;
      ctx.save();
      ctx.globalAlpha = w.life < 45 ? Math.max(0, w.life / 45) : 1;
      if (owner && typeof owner.drawWeapon === 'function') {
        const _hw = owner._hideWeapon;
        owner._hideWeapon = false;
        try { owner.drawWeapon(w.x, w.y, w.ang, false, w.key, 1); } catch (e) { /* never break a death */ }
        owner._hideWeapon = _hw;
      } else {
        ctx.strokeStyle = '#bbbbbb';
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.moveTo(w.x - Math.cos(w.ang) * 14, w.y - Math.sin(w.ang) * 14);
        ctx.lineTo(w.x + Math.cos(w.ang) * 14, w.y + Math.sin(w.ang) * 14);
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Pick the death from context so no two read the same.
   *   executeDeath — finisher kill; the finisher owns the presentation
   *   voidDeath    — killed by the Boss / TrueForm; dissolve rather than fall
   *   blastDeath   — splash / explosive; arms up, backwards arc
   *   launchDeath  — heavy knockback; spin and travel
   *   crumple      — chip damage; knees first, slow fold
   */
  _pickKind(f, hit, kb) {
    if (hit && hit.finisher) return 'executeDeath';
    if (typeof activeFinisher !== 'undefined' && activeFinisher) return 'executeDeath';
    if (hit && hit.fromBoss && kb >= 10) return 'voidDeath';
    if (hit && hit.splash) return 'blastDeath';
    if (kb >= 13) return 'launchDeath';
    return 'crumple';
  },

  _floorY(f) {
    let y = 460;
    if (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) {
      const floor = currentArena.platforms.find(pl => pl.isFloor && !pl.isFloorDisabled);
      if (floor) y = floor.y;
    }
    return y;
  },

  _snapshotPose(f) {
    const rd = f._rd;
    const g  = k => (rd && rd[k] ? rd[k].angle : 0);
    return { rArm: g('rArm'), lArm: g('lArm'), rLeg: g('rLeg'), lLeg: g('lLeg'),
             head: g('head'), torso: g('torso') };
  },

  _enterBeat(rec, beat) {
    rec.beat = beat;
    rec.t    = 0;
    const f  = rec.f;

    if (beat === 'impact') {
      // Hard hold on the pose the blow left, plus a white flash and a camera punch.
      if (typeof animHold === 'function') animHold(rec.kind === 'crumple' ? 3 : 6);
      f._hitFlashTimer = Math.max(f._hitFlashTimer || 0, 5);
      if (typeof screenShake !== 'undefined' && typeof settings !== 'undefined' && settings.screenShake) {
        screenShake = Math.max(screenShake, rec.kind === 'crumple' ? 5 : 12);
      }
      if (typeof spawnParticles === 'function') {
        spawnParticles(f.cx(), f.cy(), f.color || '#ffffff', rec.kind === 'crumple' ? 10 : 20);
      }
      // Freeze the body on the impact frame — the hold has to be visible.
      f.vx = 0; f.vy = 0;
      rec.pose = DeathAnim._impactPose(rec);
      f._death.pose = rec.pose;

    } else if (beat === 'stagger') {
      // The body finally accepts the hit: it takes a step, then gives way.
      const k = rec.kind;
      f.ragdollTimer = 0;             // the authored beat owns rotation, not the spin
      f.ragdollAngle = 0;
      if (k === 'launchDeath') {
        f.vx = rec.dir * Math.min(14, 5 + rec.kb * 0.55);
        f.vy = -Math.min(12, 4 + rec.kb * 0.4);
      } else if (k === 'blastDeath') {
        f.vx = rec.dir * Math.min(10, 3 + rec.kb * 0.4);
        f.vy = -9;
      } else if (k === 'crumple') {
        f.vx = rec.dir * 1.2;         // barely a stumble
        f.vy = 0;
      } else if (k === 'voidDeath') {
        f.vx = 0; f.vy = -1.5;
      } else {                         // executeDeath
        f.vx = 0; f.vy = 0;
      }

    } else if (beat === 'fall') {
      // Free rotation about the pelvis, limbs trailing on drag.
      const spinBase = rec.kind === 'launchDeath' ? 0.13
                     : rec.kind === 'blastDeath'  ? 0.09
                     : rec.kind === 'crumple'     ? 0.035 : 0.05;
      f.ragdollTimer = 90;
      f.ragdollSpin  = rec.dir * spinBase * (0.75 + Math.random() * 0.5);
      DeathAnim._dropWeapon(rec);

    } else if (beat === 'settle') {
      DeathAnim._handoff(rec);
    }
  },

  _step(rec) {
    const f = rec.f;
    rec.t++;

    if (rec.beat === 'impact') {
      // Nothing moves. That is the point of the beat.
      f.vx = 0; f.vy = 0;
      rec.pose = DeathAnim._impactPose(rec);
      f._death.pose = rec.pose;
      if (rec.t >= DEATH_BEATS.impact) {
        DeathAnim._enterBeat(rec, rec.kind === 'executeDeath' ? 'settle' : 'stagger');
      }
      return;
    }

    if (rec.beat === 'stagger') {
      const u = Math.min(1, rec.t / DEATH_BEATS.stagger);
      const e = (typeof animEase !== 'undefined') ? animEase.outQuad(u) : u;
      rec.pose = DeathAnim._blendPose(DeathAnim._impactPose(rec),
                                      DeathAnim._staggerPose(rec), e, rec, u);
      f._death.pose = rec.pose;
      if (rec.kind === 'voidDeath') DeathAnim._voidMotes(rec, 2);
      // Scuff at the feet while the step is being taken
      if (f.onGround && rec.t % 4 === 0 && typeof animScuff === 'function') {
        animScuff(f.cx(), f.y + f.h, rec.dir, 3);
      }
      if (rec.t >= DEATH_BEATS.stagger) DeathAnim._enterBeat(rec, 'fall');
      return;
    }

    if (rec.beat === 'fall') {
      const u = Math.min(1, rec.t / DEATH_BEATS.fall);
      const e = (typeof animEase !== 'undefined') ? animEase.inQuad(u) : u;
      rec.pose = DeathAnim._blendPose(DeathAnim._staggerPose(rec),
                                      DeathAnim._fallPose(rec), e, rec, u);
      f._death.pose = rec.pose;
      if (rec.kind === 'voidDeath') DeathAnim._voidMotes(rec, 3);

      // Ground contact: squash, dust, and a small bounce for fast arrivals.
      if (!rec.landed && (f.onGround || f.y + f.h >= rec.floorY - 1)) {
        rec.landed = true;
        const impact = Math.min(1, Math.abs(f.vy) / 14);
        f.squashTimer = 4;                       // reuses the existing draw squash
        if (typeof animDust === 'function') {
          animDust(f.cx(), Math.min(rec.floorY, f.y + f.h), rec.dir, 6 + Math.round(impact * 10));
        }
        if (typeof screenShake !== 'undefined' && typeof settings !== 'undefined' && settings.screenShake) {
          screenShake = Math.max(screenShake, 4 + impact * 6);
        }
        if (impact > 0.45) { f.vy = -impact * 4.5; f.vx *= 0.5; rec.landed = false; } // one bounce
        if (typeof SoundManager !== 'undefined' && SoundManager.thud) SoundManager.thud();
      }
      if (rec.t >= DEATH_BEATS.fall) DeathAnim._enterBeat(rec, 'settle');
      return;
    }

    if (rec.beat === 'settle') { rec.beat = 'done'; }
  },

  // ── Poses ─────────────────────────────────────────────────────────────────
  // All angles are the six scalars PlayerRagdoll drives: rArm/lArm/rLeg/lLeg
  // (absolute limb angles) plus head and torso lean.

  /** Beat 1 — the body has not caught up with the hit yet. Directional. */
  _impactPose(rec) {
    const P = Math.PI, d = rec.dir, s = rec.startPose;
    const k = rec.kind;
    if (k === 'blastDeath') {
      // Blown back: arms thrown up and out, chest opened to the blast
      return { rArm: P * 1.18, lArm: -P * 0.18, rLeg: P * 0.66, lLeg: P * 0.34,
               head: -0.30 * d, torso: -0.28 * d };
    }
    if (k === 'crumple') {
      // Nothing dramatic — the body just stops answering
      return { rArm: s.rArm * 0.6 + P * 0.62 * 0.4, lArm: s.lArm * 0.6 + P * 0.38 * 0.4,
               rLeg: P * 0.56, lLeg: P * 0.44, head: 0.16, torso: 0.10 };
    }
    if (k === 'voidDeath') {
      // Held up by something that isn't gravity
      return { rArm: P * 0.96, lArm: P * 0.04, rLeg: P * 0.58, lLeg: P * 0.42,
               head: -0.22, torso: -0.05 };
    }
    // launchDeath / executeDeath — folded over the hit point, head snapped back
    return { rArm: P * 0.86 + 0.25 * d, lArm: P * 0.14 + 0.25 * d,
             rLeg: P * 0.62, lLeg: P * 0.38,
             head: -0.42 * d, torso: -0.22 * d };
  },

  /** Beat 2 — a step is taken, the torso folds, the head lags behind (overlap). */
  _staggerPose(rec) {
    const P = Math.PI, d = rec.dir;
    const k = rec.kind;
    if (k === 'crumple') {
      // Knees first, slow fold — the legs give out before the arms do
      return { rArm: P * 0.70, lArm: P * 0.30, rLeg: P * 0.34, lLeg: P * 0.66,
               head: 0.34, torso: 0.58 };
    }
    if (k === 'blastDeath') {
      return { rArm: P * 1.32, lArm: -P * 0.32, rLeg: P * 0.84, lLeg: P * 0.16,
               head: -0.52 * d, torso: -0.66 * d };
    }
    if (k === 'voidDeath') {
      return { rArm: P * 1.10, lArm: -P * 0.10, rLeg: P * 0.52, lLeg: P * 0.48,
               head: -0.40, torso: -0.14 };
    }
    // Reaching — not curling. The arm trails the direction of travel.
    return { rArm: P * 1.02 + 0.30 * d, lArm: P * 0.06 + 0.30 * d,
             rLeg: P * 0.40, lLeg: P * 0.72,
             head: -0.55 * d, torso: -0.62 * d };
  },

  /** Beat 3 — everything trails on drag as the body rotates about the pelvis. */
  _fallPose(rec) {
    const P = Math.PI, d = rec.dir;
    if (rec.kind === 'crumple') {
      return { rArm: P * 0.80, lArm: P * 0.20, rLeg: P * 0.22, lLeg: P * 0.78,
               head: 0.46, torso: 1.32 };
    }
    if (rec.kind === 'voidDeath') {
      return { rArm: P * 1.24, lArm: -P * 0.24, rLeg: P * 0.50, lLeg: P * 0.50,
               head: -0.55, torso: -0.20 };
    }
    if (rec.kind === 'blastDeath') {
      // Blown off the feet — flat on the back, arms still thrown out
      return { rArm: P * 1.40, lArm: -P * 0.40, rLeg: P * 0.92, lLeg: P * 0.08,
               head: -0.70 * d, torso: -1.45 * d };
    }
    return { rArm: P * 1.16 + 0.30 * d, lArm: -P * 0.02 + 0.30 * d,
             rLeg: P * 0.28, lLeg: P * 0.86,
             head: -0.62 * d, torso: -1.38 * d };
  },

  /**
   * Blend two poses. The head and off-hand lag the torso by a fraction of the
   * beat (overlap / drag) — free follow-through for one extra lerp each.
   */
  _blendPose(a, b, e, rec, u) {
    const lag = Math.max(0, e - 0.22);   // ~3 frames of drag on the trailing parts
    const L = (x, y, t) => x + (y - x) * t;
    return {
      rArm:  L(a.rArm,  b.rArm,  e),
      lArm:  L(a.lArm,  b.lArm,  lag),
      rLeg:  L(a.rLeg,  b.rLeg,  e),
      lLeg:  L(a.lLeg,  b.lLeg,  e),
      head:  L(a.head,  b.head,  lag),
      torso: L(a.torso, b.torso, e),
    };
  },

  /** Void deaths dissolve upward instead of falling. */
  _voidMotes(rec, n) {
    if (typeof spawnParticles !== 'function') return;
    const f = rec.f;
    spawnParticles(f.cx() + (Math.random() - 0.5) * f.w,
                   f.cy() + (Math.random() - 0.5) * f.h, '#aa66ff', n);
  },

  /** The weapon leaves the hand and lands with the body. */
  _dropWeapon(rec) {
    if (rec.dropped) return;
    rec.dropped = true;
    const f = rec.f;
    const k = f.weaponKey;
    if (!k || k === 'gauntlet' || k === 'combat') return;
    f._hideWeapon = true;
    if (DeathAnim._props.length > 12) DeathAnim._props.shift();
    DeathAnim._props.push({
      owner: f, key: k,
      x: f.cx() + rec.dir * 10,
      y: f.cy() - 6,
      vx: rec.dir * (2 + Math.random() * 3) + (f.vx || 0) * 0.4,
      vy: -4 - Math.random() * 3,
      ang: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.5,
      floorY: rec.floorY,
      rest: false,
      life: 300,
    });
  },

  /**
   * Beat 4 — hand off to the angle-constrained verlet corpse. The ragdoll is
   * built from the fighter's CURRENT position and velocity, so the body settles
   * from where the animation left it instead of teleporting to a curl.
   */
  _handoff(rec) {
    const f = rec.f;
    rec.hidden = true;
    if (!rec.verlet || typeof VerletRagdoll === 'undefined') {
      // No corpse requested (or unavailable): fall back to the old collapsed pose
      // so the body still reads as dead rather than disappearing.
      rec.hidden = false;
      if (typeof PlayerRagdoll !== 'undefined') PlayerRagdoll.collapse(f);
      f._death.pose = null;
      return;
    }
    try {
      const vr = new VerletRagdoll(f);
      vr.floorY = rec.floorY;
      // The constructor lays the rig out standing. Left alone the corpse lands on
      // its feet in a crouch — the animation's fold would be thrown away at the
      // exact moment physics takes over. Rotate the whole rig by the angle the
      // body actually reached, about the pelvis, and give the upper body a shove
      // so it topples instead of balancing.
      const fold = (f._rd ? f._rd.torso.angle : 0) + (f.ragdollAngle || 0);
      if (fold && typeof VerletAngleConstraint !== 'undefined') {
        const pivot = { x: (vr.lHip.x + vr.rHip.x) / 2, y: (vr.lHip.y + vr.rHip.y) / 2 };
        for (const pt of vr.points) VerletAngleConstraint._rotate(pt, pivot, fold);
      }
      const topple = (fold >= 0 ? 1 : -1) * (1.2 + Math.min(2.5, rec.kb * 0.12));
      for (const pt of [vr.head, vr.neck, vr.lShoulder, vr.rShoulder]) pt.impulse(-topple, 0);
      if (typeof verletRagdolls !== 'undefined') verletRagdolls.push(vr);
    } catch (e) {
      rec.hidden = false;   // never leave an invisible body behind
      if (typeof PlayerRagdoll !== 'undefined') PlayerRagdoll.collapse(f);
    }
    // Leave the spring state limp for whenever the fighter is drawn again.
    if (typeof PlayerRagdoll !== 'undefined') PlayerRagdoll.collapse(f);
  },
};
