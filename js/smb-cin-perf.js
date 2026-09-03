'use strict';
// smb-cin-perf.js — authored figure performances for cinematic set-pieces.
//
// Depends on: smb-cin-figure.js (CinRig, CinTrack), smb-anim-core.js (animEase).
// ============================================================

const CIN_PERF_GESTURES = ['cross', 'raise', 'draw', 'low'];

// Domains without an entry style fall back to 'cross'.
const CIN_PERF_DOMAIN_GESTURE = {
  thor: 'raise', paladin: 'raise', megaknight: 'raise', warrior: 'raise',
  ronin: 'draw', ninja: 'draw',
  reaper: 'low', summoner: 'low', sovereign: 'low', archer: 'low',
};

const CinPerf = {

  _active: new Map(),

  /**
   * Attach a performance to a fighter. `frames` is the total length; callers
   * advance it with tick(). Setting f._cinPerf makes Fighter.draw() delegate
   * here instead of drawing the gameplay rig.
   */
  begin(f, kind, opts) {
    if (!f) return null;
    const o = opts || {};
    const rec = {
      f, kind,
      frame: 0,
      frames: o.frames || 300,
      color: o.color || f.color || '#ffffff',
      gesture: o.gesture || 'cross',
      track: null,
      prevPose: null,
      smearFrom: o.smearFrom !== undefined ? o.smearFrom : -1,
      smearTo: o.smearTo !== undefined ? o.smearTo : -1,
    };
    rec.track = CinPerf._buildTrack(rec);
    CinPerf._active.set(f, rec);
    f._cinPerf = rec;
    return rec;
  },

  end(f) {
    if (!f) return;
    CinPerf._active.delete(f);
    f._cinPerf = null;
  },

  /** Advance one frame. Returns false once the performance is over. */
  tick(f, frame) {
    const rec = CinPerf._active.get(f);
    if (!rec) return false;
    rec.frame = (frame !== undefined) ? frame : rec.frame + 1;
    return rec.frame < rec.frames;
  },

  /** Called from Fighter.draw(). Returns true when it took over the draw. */
  draw(f) {
    const rec = CinPerf._active.get(f);
    if (!rec || typeof CinRig === 'undefined' || typeof ctx === 'undefined') return false;
    const scale = Math.max(0.4, (f.h || 84) / 94);
    const pose = rec.track.sample(rec.frame);
    pose.x = f.cx();
    pose.y = f.y + f.h;
    pose.facing = f.facing || 1;
    pose.scale = (pose.scale || 1) * scale;

    const inSmear = rec.frame >= rec.smearFrom && rec.frame <= rec.smearTo;
    if (inSmear && rec.prevPose) {
      CinRig.smear(ctx, rec.prevPose, pose, 'rArm', rec.color, 8, 0.45);
      CinRig.smear(ctx, rec.prevPose, pose, 'lArm', rec.color, 8, 0.45);
    }
    const J = CinRig.draw(ctx, pose, f.color || rec.color, {
      width: 5.2,
      glow: rec.color,
      glowBlur: 7,
      expr: CinPerf._expr(rec),
      blink: false,
    });
    if (f.weaponKey && f.weaponKey !== 'gauntlet' && typeof f.drawWeapon === 'function') {
      ctx.save();
      try { f.drawWeapon(J.rHand.x, J.rHand.y, pose.rFore, false, null, 1.5 * pose.scale); }
      catch (e) { /* a cinematic must never take the frame down */ }
      ctx.restore();
    }
    rec.prevPose = pose;
    return true;
  },

  /** Trail ghost at a past position, posed as the figure rather than a box. */
  drawGhost(f, pos, color, alpha) {
    const rec = CinPerf._active.get(f);
    if (!rec || typeof CinRig === 'undefined') return;
    const pose = rec.track.sample(rec.frame);
    pose.x = pos.x + f.w / 2;
    pose.y = pos.y + f.h;
    pose.facing = f.facing || 1;
    pose.scale = (pose.scale || 1) * Math.max(0.4, (f.h || 84) / 94);
    CinRig.draw(ctx, pose, color || rec.color, { width: 5.2, alpha, face: false });
  },

  _expr(rec) {
    const u = rec.frame / rec.frames;
    if (u < 0.18) return 'neutral';
    if (u < 0.52) return 'intense';
    return 'angry';
  },

  /**
   * Domain entry, authored against the 300-frame rise. The two holds are the
   * point of the sequence: the gather at 45 frames and the gesture at 20. An
   * interpolated version of these same poses reads as drifting.
   */
  _buildTrack(rec) {
    const P = Math.PI;
    const g = rec.gesture;
    const rest = {
      rArm: P * 0.58, rFore: P * 0.58, lArm: P * 0.42, lFore: P * 0.42,
      rLeg: P * 0.56, rShin: P * 0.56, lLeg: P * 0.44, lShin: P * 0.44,
    };

    const gathered = {
      rArm: P * 0.86, rFore: P * 1.32, lArm: P * 0.14, lFore: -P * 0.32,
      rLeg: P * 0.72, rShin: P * 0.34, lLeg: P * 0.28, lShin: P * 0.66,
      torso: 0.30, sy: 0.86, sx: 1.13, headOff: -2,
    };

    const open = {
      cross: { rArm: P * 1.16, rFore: P * 1.32, lArm: -P * 0.16, lFore: -P * 0.32,
               rArmLen: 1.30, lArmLen: 1.30, rArmW: 0.78, lArmW: 0.78,
               rLeg: P * 0.66, rShin: P * 0.70, lLeg: P * 0.34, lShin: P * 0.30,
               torso: -0.16, sy: 1.16, sx: 0.90 },
      raise: { rArm: -P * 0.42, rFore: -P * 0.48, lArm: P * 0.60, lFore: P * 0.78,
               rArmLen: 1.42, rArmW: 0.74,
               rLeg: P * 0.60, rShin: P * 0.62, lLeg: P * 0.40, lShin: P * 0.38,
               torso: -0.22, sy: 1.22, sx: 0.88, headTilt: -0.18 },
      draw:  { rArm: -P * 0.06, rFore: 0.10, lArm: P * 1.02, lFore: P * 1.18,
               rArmLen: 1.55, rArmW: 0.66,
               rLeg: P * 0.44, rShin: P * 0.36, lLeg: P * 0.70, lShin: P * 0.80,
               torso: 0.28, sx: 1.16, sy: 0.90 },
      low:   { rArm: P * 0.82, rFore: P * 0.62, lArm: P * 0.18, lFore: P * 0.38,
               rArmLen: 1.34, lArmLen: 1.34, rArmW: 0.80, lArmW: 0.80,
               rLeg: P * 0.62, rShin: P * 0.64, lLeg: P * 0.38, lShin: P * 0.36,
               torso: 0.10, sy: 0.94, sx: 1.08 },
    }[CIN_PERF_GESTURES.indexOf(g) === -1 ? 'cross' : g];

    const sustain = {
      rArm: P * 1.02, rFore: P * 1.14, lArm: -P * 0.02, lFore: -P * 0.14,
      rLeg: P * 0.60, rShin: P * 0.58, lLeg: P * 0.40, lShin: P * 0.42,
      torso: -0.06,
    };

    return new CinTrack([
      { at: 0,   hold: 0,  ease: 'outQuad',  pose: rest },
      { at: 18,  hold: 0,  ease: 'inOutQuad',
        pose: { ...rest, rLeg: P * 0.64, rShin: P * 0.50, lLeg: P * 0.36, lShin: P * 0.50, sy: 1.06 } },
      { at: 50,  hold: 45, ease: 'inQuad',   pose: gathered },
      { at: 108, hold: 20, ease: 'outExpo',  pose: { ...gathered, ...open } },
      { at: 150, hold: 0,  ease: 'outBack',  pose: { ...sustain } },
      { at: 240, hold: 0,  ease: 'inOutQuad', pose: { ...sustain, torso: -0.02, headOff: 1 } },
      { at: 300, hold: 0,  ease: 'outQuad',  pose: rest },
    ]);
  },

  /** Gesture style for a domain key. */
  domainGesture(key) {
    return CIN_PERF_DOMAIN_GESTURE[key] || 'cross';
  },
};
