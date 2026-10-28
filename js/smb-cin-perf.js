'use strict';
// Authored figure performances for cinematic set-pieces.
// Depends on smb-cin-figure.js (CinRig, CinTrack) and smb-anim-core.js (animEase).

const CIN_PERF_GESTURES = ['cross', 'raise', 'draw', 'low'];

// Domains without an entry style fall back to 'cross'.
const CIN_PERF_DOMAIN_GESTURE = {
  thor: 'raise', paladin: 'raise', megaknight: 'raise', warrior: 'raise',
  ronin: 'draw', ninja: 'draw',
  reaper: 'low', summoner: 'low', sovereign: 'low', archer: 'low',
};


// Named poses for cutscene beats.
// Angles are CinRig absolute radians in facing-right space (0 forward, PI/2 down).
// The rig mirrors for facing. Partial poses merge onto 'stand'. Keep silhouettes
// bold, since cutscene figures are seen at 0.5x to 2x.
const CIN_PERF_POSES = (function () {
  const P = Math.PI;
  const stand = {
    rArm: P * 0.58, rFore: P * 0.58, lArm: P * 0.42, lFore: P * 0.42,
    rLeg: P * 0.56, rShin: P * 0.56, lLeg: P * 0.44, lShin: P * 0.44,
  };
  const L = {};
  L.stand = stand;
  L.guard = { ...stand, rArm: P * 0.30, rFore: -P * 0.12, lArm: P * 0.40, lFore: -P * 0.22,
    rLeg: P * 0.62, rShin: P * 0.60, lLeg: P * 0.38, lShin: P * 0.42, torso: 0.10, sy: 0.97, sx: 1.03 };
  L.menace = { ...stand, rArm: P * 0.66, rFore: P * 0.62, lArm: P * 0.34, lFore: P * 0.38,
    rLeg: P * 0.64, rShin: P * 0.66, lLeg: P * 0.36, lShin: P * 0.34,
    torso: 0.14, headOff: 3, headTilt: 0.10, sx: 1.06, sy: 0.98, rArmW: 1.15, lArmW: 1.15 };
  L.coil = { ...stand, rArm: P * 0.86, rFore: P * 1.20, lArm: P * 0.75, lFore: P * 1.0,
    rLeg: P * 0.12, rShin: P * 0.52, lLeg: P * 0.16, lShin: P * 0.52,
    torso: 0.45, hipDrop: 10, headOff: 2 };
  L.roar = { ...stand, rArm: P * 0.88, rFore: P * 1.0, lArm: P * 0.12, lFore: 0,
    rArmLen: 1.15, lArmLen: 1.15, rArmW: 1.1, lArmW: 1.1,
    rLeg: P * 0.66, rShin: P * 0.70, lLeg: P * 0.34, lShin: P * 0.30,
    torso: -0.14, headTilt: -0.30, sy: 1.08, sx: 0.96 };
  L.raise = { ...stand, rArm: -P * 0.28, rFore: -P * 0.36, lArm: P * 1.28, lFore: P * 1.36,
    rArmLen: 1.2, lArmLen: 1.2, rLeg: P * 0.60, rShin: P * 0.62, lLeg: P * 0.40, lShin: P * 0.38,
    torso: -0.18, headTilt: -0.20, sy: 1.10, sx: 0.94 };
  L.slam = { ...stand, rArm: P * 0.30, rFore: P * 0.38, lArm: P * 0.22, lFore: P * 0.30,
    rArmLen: 1.15, lArmLen: 1.15, rLeg: P * 0.25, rShin: P * 0.50, lLeg: P * 0.75, lShin: P * 0.62,
    torso: 0.50, hipDrop: 6, sx: 1.04 };
  L.thrust = { ...stand, rArm: P * 0.02, rFore: 0, rArmLen: 1.3, lArm: P * 0.75, lFore: P * 0.90,
    rLeg: P * 0.22, rShin: P * 0.50, lLeg: P * 0.70, lShin: P * 0.52, torso: 0.30, hipDrop: 5, sx: 1.06 };
  L.windup = { ...stand, rArm: P * 0.85, rFore: P * 1.05, lArm: P * 0.05, lFore: P * 0.02,
    rLeg: P * 0.66, rShin: P * 0.66, lLeg: P * 0.34, lShin: P * 0.38, torso: -0.35, hipDrop: 6, sy: 0.94 };
  L.uppercut = { ...stand, rArm: -P * 0.35, rFore: -P * 0.45, rArmLen: 1.25, lArm: P * 0.70, lFore: P * 0.85,
    rLeg: P * 0.60, rShin: P * 0.62, lLeg: P * 0.42, lShin: P * 0.40, torso: -0.15, headTilt: -0.15, sy: 1.12, hipDrop: -6 };
  L.stagger = { ...stand, rArm: P * 1.0, rFore: P * 1.15, lArm: P * 0.78, lFore: P * 0.95,
    rLeg: P * 0.66, rShin: P * 0.75, lLeg: P * 0.30, lShin: P * 0.22,
    torso: -0.30, headTilt: -0.25, hipDrop: 3, sx: 0.96, sy: 1.04 };
  L.brace = { ...stand, rArm: P * 0.12, rFore: -P * 0.40, lArm: P * 0.20, lFore: -P * 0.46,
    rLeg: P * 0.64, rShin: P * 0.52, lLeg: P * 0.34, lShin: P * 0.46, torso: 0.22, hipDrop: 3, sy: 0.97, headOff: 2 };
  L.flail = { ...stand, rArm: P * 1.25, rFore: P * 1.50, lArm: P * 1.05, lFore: P * 1.30,
    rLeg: P * 0.70, rShin: P * 0.85, lLeg: P * 0.60, lShin: P * 0.95, torso: -0.35, rot: -0.30, headTilt: -0.20, hipDrop: -4 };
  L.hunch = { ...stand, rArm: P * 0.42, rFore: P * 0.50, lArm: P * 0.40, lFore: P * 0.50,
    rLeg: P * 0.62, rShin: P * 0.55, lLeg: P * 0.38, lShin: P * 0.46, torso: 0.55, headOff: 6, headTilt: 0.20, hipDrop: 3, sy: 0.97 };
  L.kneel = { ...stand, rArm: P * 0.46, rFore: P * 0.50, lArm: P * 0.52, lFore: P * 0.55,
    rLeg: P * 0.02, rShin: P * 0.50, lLeg: P * 0.50, lShin: P * 0.98, torso: 0.12, hipDrop: 17 };
  L.slump = { ...L.kneel, torso: 0.75, headTilt: 0.50, headOff: 8, rArm: P * 0.52, rFore: P * 0.50, lArm: P * 0.50, lFore: P * 0.55 };
  L.float = { ...stand, rArm: P * 0.15, rFore: -P * 0.05, lArm: P * 0.85, lFore: P * 0.95,
    rLeg: P * 0.56, rShin: P * 0.70, lLeg: P * 0.45, lShin: P * 0.60, torso: -0.05, hipDrop: -14 };
  L.spread = { ...stand, rArm: P * 1.12, rFore: P * 1.20, lArm: -P * 0.12, lFore: -P * 0.20,
    rLeg: P * 0.62, rShin: P * 0.64, lLeg: P * 0.38, lShin: P * 0.36, torso: -0.10, headTilt: -0.20, sy: 1.08, hipDrop: -4 };
  L.gesture = { ...stand, rArm: -P * 0.25, rFore: -P * 0.30, torso: -0.05, headTilt: -0.08 };
  L.charge = { ...stand, rArm: P * 0.55, rFore: -P * 0.05, lArm: P * 0.45, lFore: -P * 0.15,
    rLeg: P * 0.62, rShin: P * 0.60, lLeg: P * 0.38, lShin: P * 0.40, torso: 0.15, hipDrop: 3, sx: 1.06, sy: 0.97, headTilt: 0.10 };
  L.lookUp = { ...stand, headTilt: -0.35, torso: -0.10 };
  return L;
})();

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
      glow: o.glow !== undefined ? o.glow : true,   // domain entry glows; cutscene beats do not
      exprs: o.exprs || null,                       // [{at(frames), expr}] authored faces
      bound: !!o.bound,                             // dies with the running cinematic
      noWeapon: !!o.noWeapon,                       // draw the figure bare-handed
      t0: o.t0 || 0,
    };
    rec.track = o.track || CinPerf._buildTrack(rec);
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
    // A cinematic-bound performance must never outlive its cinematic.
    if (rec.bound && typeof activeCinematic !== 'undefined' && !activeCinematic) { CinPerf.end(f); return false; }
    const scale = Math.max(0.4, (f.h || 84) / 94);
    const pose = rec.track.sample(rec.frame);
    pose.x = f.cx();
    pose.y = f.y + f.h;
    pose.facing = f.facing || 1;
    if (rec.kind === 'cutscene') {
      // Match the gameplay body size (FIG_* constants) so cutting in and out does not pop.
      pose.scale = (pose.scale || 1) * 0.9 * (f.drawScale || 1);
      pose.headScale = (pose.headScale || 1) * 0.77;
    } else {
      pose.scale = (pose.scale || 1) * scale;
    }

    const inSmear = rec.frame >= rec.smearFrom && rec.frame <= rec.smearTo;
    if (inSmear && rec.prevPose) {
      CinRig.smear(ctx, rec.prevPose, pose, 'rArm', rec.color, 8, 0.45);
      CinRig.smear(ctx, rec.prevPose, pose, 'lArm', rec.color, 8, 0.45);
    }
    // Keep accessories (cape, hat) so a boss keeps its look.
    const _acc = rec.kind === 'cutscene' && typeof drawAccessory === 'function';
    let J;
    const _jj = CinRig.joints(pose);
    if (_acc && (f.cape && f.cape !== 'none')) {
      const _hat = f.hat; f.hat = 'none';
      try { drawAccessory(f, _jj.head.x, _jj.head.y, _jj.shoulder.y, _jj.hip.y, pose.facing, _jj.headR); }
      catch (e) { /* cosmetic only */ }
      f.hat = _hat;
    }
    J = CinRig.draw(ctx, pose, f.color || rec.color, {
      width: 5.2,
      glow: rec.glow ? rec.color : false,
      glowBlur: 7,
      expr: CinPerf._expr(rec),
      blink: false,
      outline: rec.kind === 'cutscene' ? (f.drawScale || 1) : 1,
    });
    if (_acc && (f.hat && f.hat !== 'none')) {
      const _cape = f.cape; f.cape = 'none';
      try { drawAccessory(f, J.head.x, J.head.y, J.shoulder.y, J.hip.y, pose.facing, J.headR); }
      catch (e) { /* cosmetic only */ }
      f.cape = _cape;
    }
    if (!rec.noWeapon && f.weaponKey && f.weaponKey !== 'gauntlet' && typeof f.drawWeapon === 'function') {
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

  /** Posed ghost in SCREEN space (AniFX.afterimage), replacing the legacy silhouette. */
  drawGhostScreen(f, rctx, sx, sy, sc, color, alpha) {
    const rec = CinPerf._active.get(f);
    if (!rec || typeof CinRig === 'undefined') return false;
    const pose = rec.track.sample(rec.frame);
    pose.x = sx; pose.y = sy; pose.facing = f.facing || 1;
    pose.scale = 0.9 * (f.drawScale || 1) * sc;
    pose.headScale = (pose.headScale || 1) * 0.77;
    rctx.save();
    CinRig.draw(rctx, pose, color || rec.color, { width: 5.2, alpha, face: false, outline: sc });
    rctx.restore();
    return true;
  },

  _expr(rec) {
    if (rec.exprs) {
      let e = 'neutral';
      for (const x of rec.exprs) if (rec.frame >= x.at) e = x.expr;
      return e;
    }
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


  // Cutscene performances.
  // Beats are in seconds, the unit cinScript uses: { at, pose, hold, ease, expr }.
  // pose is a CIN_PERF_POSES name, { from, ...overrides }, or a raw partial pose.
  // hold sits on the pose before moving on. expr switches the face from that beat on.

  /** Resolve a beat's pose spec into a partial pose object. */
  _resolve(spec) {
    if (typeof spec === 'string') return { ...(CIN_PERF_POSES[spec] || CIN_PERF_POSES.stand) };
    if (spec && spec.from) return { ...(CIN_PERF_POSES[spec.from] || CIN_PERF_POSES.stand), ...spec, from: undefined };
    return { ...CIN_PERF_POSES.stand, ...(spec || {}) };
  },

  /** Build a CinTrack (frames) from second-based beats. */
  _trackFromBeats(beats) {
    const keys = beats.map(b => ({
      at: Math.round(b.at * 60),
      hold: Math.round((b.hold || 0) * 60),
      ease: b.ease || 'inOutQuad',
      pose: CinPerf._resolve(b.pose),
    }));
    return new CinTrack(keys);
  },

  /**
   * Start a cinematic-bound performance on `f`. Only fighters that render
   * through Fighter.draw() can take it (TrueForm, God, Yeti and ForestBeast
   * have bespoke bodies and keep them).
   */
  play(f, beats, opts) {
    if (!f || !beats || !beats.length || typeof CinTrack === 'undefined') return null;
    if (typeof Fighter !== 'undefined' && f.draw !== Fighter.prototype.draw) return null;
    const o = opts || {};
    const exprs = beats.filter(b => b.expr).map(b => ({ at: Math.round(b.at * 60), expr: b.expr }));
    const last = beats[beats.length - 1];
    return CinPerf.begin(f, 'cutscene', {
      track: CinPerf._trackFromBeats(beats),
      frames: Math.round((last.at + (last.hold || 0)) * 60) + 1,
      color: f.color,
      glow: false,
      bound: true,
      t0: o.t0 || 0,
      exprs: exprs.length ? exprs : null,
    });
  },

  /** Who a spec addresses. */
  _who(w) {
    if (typeof players === 'undefined') return [];
    if (typeof w === 'function') { const r = w(); return Array.isArray(r) ? r : (r ? [r] : []); }
    if (w === 'boss')    return players.filter(p => p.isBoss && !p.isTrueForm && p.health > 0);
    if (w === 'players') return players.filter(p => !p.isBoss && !p.isRemote && p.health > 0);
    if (w === 'hero')    return players.filter(p => !p.isBoss && !p.isRemote && p.health > 0).slice(0, 1);
    return [];
  },

  /**
   * Drive a list of specs from a cinematic's update(t). `owner` carries the
   * started-flags (pass `this`). Each spec: { who, at, beats }. Safe to call
   * every frame; throws are swallowed so a performance can never freeze a
   * cinematic (activeCinematic/isCinematic/slowMotion stay owned by the caller).
   */
  run(owner, t, specs) {
    if (!owner || !specs) return;
    try {
      const done = owner._perfStarted || (owner._perfStarted = []);
      for (let i = 0; i < specs.length; i++) {
        const sp = specs[i];
        if (done[i] || t < (sp.at || 0)) continue;
        done[i] = true;
        for (const f of CinPerf._who(sp.who)) {
          const rec = CinPerf.play(f, sp.beats, { t0: sp.at || 0 });
          if (rec && sp.facing) f.facing = typeof sp.facing === 'function' ? sp.facing(f) : sp.facing;
        }
      }
      CinPerf.drive(t);
    } catch (e) { /* never take the cinematic down */ }
  },

  /** Seek every bound performance to cinematic time `t` (seconds). */
  drive(t) {
    for (const rec of CinPerf._active.values()) {
      if (rec.bound) rec.frame = Math.max(0, (t - rec.t0) * 60);
    }
  },

  /** Drop every cinematic-bound performance (call from the cinematic's onEnd). */
  endBound() {
    for (const f of Array.from(CinPerf._active.keys())) {
      const rec = CinPerf._active.get(f);
      if (rec && rec.bound) CinPerf.end(f);
    }
  },

  /** Gesture style for a domain key. */
  domainGesture(key) {
    return CIN_PERF_DOMAIN_GESTURE[key] || 'cross';
  },
};

// Specs are { who, at, beats[, facing] }, run from a cinematic's update(t) via CinPerf.run.
// Times are seconds on the cinematic's own clock.
// who: 'boss' skips the bodies of TrueForm, God, Yeti and ForestBeast.
// 'players' is every non-boss, non-remote fighter.
CinPerf.faceBoss = function (f) {
  const b = (typeof players !== 'undefined') ? players.find(p => p.isBoss && p.health > 0) : null;
  return b ? (b.cx() >= f.cx() ? 1 : -1) : (f.facing || 1);
};

CinPerf.SCENES = (function () {
  const FB = CinPerf.faceBoss;
  const S = {};

    // Phase transitions (smb-boss-phase-cin.js)
  S.bossP2 = [
    { who: 'boss', at: 0, beats: [
      { at: 0,    pose: 'menace', expr: 'intense' },
      { at: 0.2,  pose: 'coil',   hold: 0.25, ease: 'inQuad' },
      { at: 0.6,  pose: 'roar',   hold: 0.55, ease: 'outExpo', expr: 'angry' },
      { at: 1.5,  pose: 'menace', ease: 'inOutQuad' },
      { at: 2.3,  pose: 'menace' } ] },
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.6,  pose: 'stagger', hold: 0.6, ease: 'outExpo', expr: 'hurt' },
      { at: 1.6,  pose: 'guard',   ease: 'inOutQuad', expr: 'neutral' },
      { at: 2.3,  pose: 'guard' } ] },
  ];
  S.bossP3 = [
    { who: 'boss', at: 0, beats: [
      { at: 0,    pose: 'menace', expr: 'intense' },
      { at: 0.15, pose: 'coil',   hold: 0.3,  ease: 'inQuad' },
      { at: 0.55, pose: 'raise',  hold: 0.9,  ease: 'outExpo', expr: 'angry' },
      { at: 1.8,  pose: 'roar',   hold: 0.4,  ease: 'inOutQuad' },
      { at: 2.7,  pose: 'menace', ease: 'inOutQuad' },
      { at: 3.0,  pose: 'menace' } ] },
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.55, pose: 'flail',   hold: 0.2, ease: 'outExpo', expr: 'hurt' },
      { at: 0.95, pose: 'stagger', hold: 0.6, ease: 'inOutQuad' },
      { at: 1.9,  pose: 'brace',   hold: 0.3, ease: 'inOutQuad', expr: 'afraid' },
      { at: 2.7,  pose: 'guard',   expr: 'neutral' } ] },
  ];
  S.tfP2 = [
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.65, pose: 'stagger', hold: 0.6, ease: 'outExpo', expr: 'hurt' },
      { at: 1.6,  pose: 'guard',   ease: 'inOutQuad', expr: 'neutral' },
      { at: 2.3,  pose: 'guard' } ] },
  ];
  S.tfP3 = [
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.25, pose: 'brace',   hold: 0.15, ease: 'inQuad', expr: 'afraid' },
      { at: 0.5,  pose: 'flail',   hold: 0.25, ease: 'outExpo', expr: 'hurt' },
      { at: 1.0,  pose: 'stagger', hold: 0.8,  ease: 'inOutQuad' },
      { at: 2.2,  pose: 'brace',   hold: 0.5,  ease: 'inOutQuad', expr: 'afraid' },
      { at: 3.2,  pose: 'guard',   expr: 'neutral' } ] },
  ];
  S.beastP2 = [
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.5,  pose: 'stagger', hold: 0.5, ease: 'outExpo', expr: 'hurt' },
      { at: 1.5,  pose: 'guard',   ease: 'inOutQuad', expr: 'neutral' },
      { at: 2.2,  pose: 'guard' } ] },
  ];
  S.yetiP2 = [
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 1.2,  pose: 'flail', hold: 0.15, ease: 'outExpo', expr: 'hurt' },
      { at: 1.55, pose: 'kneel', hold: 0.9,  ease: 'outQuad' },
      { at: 2.65, pose: 'hunch', hold: 0.1,  ease: 'inOutQuad', expr: 'neutral' },
      { at: 2.95, pose: 'guard' } ] },
  ];

    // Creator boss HP-threshold cinematics (smb-cinematics-boss-thresh.js)
  S.boss75 = [
    { who: 'boss', at: 0, beats: [
      { at: 0,    pose: 'menace', expr: 'intense' },
      { at: 0.15, pose: 'coil',    hold: 0.1, ease: 'inQuad' },
      { at: 0.3,  pose: 'roar',    hold: 0.7, ease: 'outExpo', expr: 'angry' },
      { at: 1.5,  pose: 'gesture', hold: 0.4, ease: 'inOutQuad' },
      { at: 2.0,  pose: 'charge',  hold: 0.6, ease: 'inQuad' },
      { at: 3.0,  pose: 'menace',  ease: 'inOutQuad' },
      { at: 3.2,  pose: 'menace' } ] },
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.5,  pose: 'brace', hold: 0.6, ease: 'outQuad', expr: 'afraid' },
      { at: 1.6,  pose: 'guard', ease: 'inOutQuad', expr: 'neutral' },
      { at: 2.0,  pose: 'guard' } ] },
  ];
  S.boss40 = [
    { who: 'boss', at: 0, beats: [
      { at: 0,    pose: 'menace', expr: 'angry' },
      { at: 0.2,  pose: 'coil',   hold: 0.2,  ease: 'inQuad' },
      { at: 0.42, pose: 'thrust', hold: 0.35, ease: 'outExpo' },
      { at: 0.95, pose: 'raise',  hold: 0.1,  ease: 'inQuad' },
      { at: 1.1,  pose: 'slam',   hold: 0.6,  ease: 'outQuad' },
      { at: 1.8,  pose: 'hunch',  hold: 0.4,  ease: 'inOutQuad' },
      { at: 2.3,  pose: 'gesture', hold: 0.7, ease: 'inOutQuad' },
      { at: 3.3,  pose: 'menace', ease: 'inOutQuad' },
      { at: 4.2,  pose: 'menace' } ] },
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.42, pose: 'flail',   hold: 0.65, ease: 'outQuad', expr: 'hurt' },
      { at: 1.15, pose: 'stagger', hold: 0.3,  ease: 'outExpo' },
      { at: 1.6,  pose: 'kneel',   hold: 0.9,  ease: 'outQuad' },
      { at: 2.9,  pose: 'hunch',   hold: 0.3,  ease: 'inOutQuad', expr: 'neutral' },
      { at: 3.6,  pose: 'guard' } ] },
  ];
  S.boss10 = [
    { who: 'boss', at: 0, beats: [
      { at: 0,    pose: 'menace', expr: 'angry' },
      { at: 0.3,  pose: 'stagger', hold: 0.25, ease: 'outExpo', expr: 'hurt' },
      { at: 0.75, pose: 'hunch',   hold: 1.0,  ease: 'inOutQuad' },
      { at: 1.85, pose: 'gesture', hold: 0.5,  ease: 'inOutQuad', expr: 'angry' },
      { at: 2.5,  pose: 'charge',  hold: 0.5,  ease: 'inQuad' },
      { at: 3.1,  pose: 'menace',  ease: 'inOutQuad' },
      { at: 3.5,  pose: 'menace' } ] },
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.3,  pose: 'brace', hold: 1.5, ease: 'outQuad', expr: 'afraid' },
      { at: 2.2,  pose: 'guard', ease: 'inOutQuad', expr: 'neutral' },
      { at: 2.8,  pose: 'guard' } ] },
  ];

    // True Form HP thresholds (smb-cinematics-tf-thresh.js). TF keeps its fragmented
    // body. Fighters facing it get the performance.
  S.tfEntry = [
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.18, pose: 'brace',   hold: 0.2,  ease: 'inQuad', expr: 'afraid' },
      { at: 0.56, pose: 'flail',   hold: 0.2,  ease: 'outExpo', expr: 'hurt' },
      { at: 1.0,  pose: 'stagger', hold: 0.3,  ease: 'inOutQuad' },
      { at: 1.6,  pose: 'brace',   hold: 1.0,  ease: 'inOutQuad', expr: 'afraid' },
      { at: 3.4,  pose: 'guard',   ease: 'inOutQuad', expr: 'neutral' },
      { at: 4.2,  pose: 'guard' } ] },
  ];
  S.tfReality = [
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.28, pose: 'brace', hold: 0.7,  ease: 'outQuad', expr: 'afraid' },
      { at: 1.18, pose: 'flail', hold: 1.3,  ease: 'outExpo', expr: 'hurt' },
      { at: 2.8,  pose: 'brace', hold: 0.6,  ease: 'inOutQuad', expr: 'afraid' },
      { at: 3.9,  pose: 'guard', ease: 'inOutQuad', expr: 'neutral' },
      { at: 4.5,  pose: 'guard' } ] },
  ];
  S.tfDesp = [
    { who: 'players', facing: FB, beats: [
      { at: 0,    pose: 'guard' },
      { at: 0.32, pose: 'brace', hold: 1.3,  ease: 'outQuad', expr: 'afraid' },
      { at: 1.9,  pose: 'hunch', hold: 1.2,  ease: 'inOutQuad', expr: 'hurt' },
      { at: 3.5,  pose: 'guard', ease: 'inOutQuad', expr: 'neutral' },
      { at: 4.4,  pose: 'guard' } ] },
  ];

    // Boss backstory (smb-cinematics-backstory.js). Beat times follow the scene map there.
    // The hero stands in for the opponent he fights.
  S.backstory = [
    { who: 'boss', at: 0, beats: [
      { at: 0,    pose: 'stand',   expr: 'neutral' },
      { at: 3.0,  pose: 'lookUp',  hold: 0.6, ease: 'inOutQuad' },          // scene 1: a man, no one
      { at: 4.6,  pose: 'guard',   hold: 0.3, ease: 'outQuad' },
      { at: 6.6,  pose: 'stagger', hold: 0.3, ease: 'outExpo', expr: 'hurt' }, // hit 1
      { at: 7.6,  pose: 'windup',  hold: 0.1, ease: 'inQuad',  expr: 'angry' },
      { at: 8.0,  pose: 'thrust',  hold: 0.4, ease: 'outExpo' },            // hit 2
      { at: 9.0,  pose: 'windup',  hold: 0.1, ease: 'inQuad' },
      { at: 9.4,  pose: 'thrust',  hold: 0.9, ease: 'outExpo' },            // hit 3 surge
      { at: 10.8, pose: 'menace',  ease: 'inOutQuad' },
      { at: 11.4, pose: 'windup',  hold: 0.1, ease: 'inQuad' },              // scene 3: uppercuts
      { at: 11.6, pose: 'uppercut', hold: 0.4, ease: 'outExpo' },
      { at: 12.6, pose: 'windup',  hold: 0.1, ease: 'inQuad' },
      { at: 12.8, pose: 'uppercut', hold: 0.5, ease: 'outExpo' },
      { at: 14.0, pose: 'windup',  hold: 0.1, ease: 'inQuad' },
      { at: 14.2, pose: 'uppercut', hold: 1.2, ease: 'outExpo' },
      { at: 16.0, pose: 'float',   hold: 3.5, ease: 'inOutQuad', expr: 'intense' }, // scene 4: the void
      { at: 21.6, pose: 'windup',  hold: 0.8, ease: 'inOutQuad' },            // scene 5: reality punch
      { at: 23.0, pose: 'thrust',  hold: 1.6, ease: 'outExpo', expr: 'angry' },
      { at: 25.2, pose: 'float',   hold: 0.5, ease: 'inOutQuad', expr: 'neutral' },
      { at: 27.0, pose: 'slump',   hold: 0.0, ease: 'inOutQuad' },            // scene 6: corruption
      { at: 28.0, pose: 'raise',   hold: 1.8, ease: 'outBack', expr: 'intense' },
      { at: 31.0, pose: 'spread',  hold: 4.0, ease: 'inOutQuad', expr: 'angry' }, // scene 7: he builds it all
      { at: 36.0, pose: 'gesture', hold: 1.0, ease: 'inOutQuad' },
      { at: 37.8, pose: 'menace' } ] },
    { who: 'hero', at: 0, facing: FB, beats: [
      { at: 0,    pose: 'stand' },
      { at: 3.0,  pose: 'guard',   hold: 1.8, ease: 'outQuad' },             // steps forward, picks the fight
      { at: 6.6,  pose: 'thrust',  hold: 0.3, ease: 'outExpo' },             // lands the first blow
      { at: 7.4,  pose: 'stagger', hold: 0.3, ease: 'outExpo', expr: 'hurt' },
      { at: 8.2,  pose: 'guard',   ease: 'inOutQuad', expr: 'neutral' },
      { at: 9.4,  pose: 'flail',   hold: 0.8, ease: 'outExpo', expr: 'hurt' },  // blown back by the surge
      { at: 11.0, pose: 'hunch',   hold: 1.0, ease: 'outQuad' },
      { at: 13.0, pose: 'brace',   hold: 3.0, ease: 'inOutQuad', expr: 'afraid' },
      { at: 22.8, pose: 'brace',   hold: 1.8, ease: 'inOutQuad' },
      { at: 27.0, pose: 'kneel',   hold: 4.0, ease: 'outQuad', expr: 'hurt' },
      { at: 33.0, pose: 'lookUp',  hold: 3.5, ease: 'inOutQuad', expr: 'neutral' },
      { at: 37.6, pose: 'guard' } ] },
  ];
  return S;
})();
