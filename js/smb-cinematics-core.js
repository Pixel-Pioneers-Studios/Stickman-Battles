// smb-cinematics-core.js — CinematicManager engine: CinFX, CinCam, cinScript(), CinTimeline, world effects
// Depends on: smb-globals.js (ctx, GAME_W, GAME_H, activeCinematic, isCinematic, slowMotion)
'use strict';

// ============================================================
// CINEMATIC SCRIPTING SYSTEM v2
// ============================================================
// Replaces hand-written update(t) monoliths with a declarative
// step-based API. Fully compatible with existing startCinematic().
//
// QUICK USAGE:
//   startCinematic(cinScript({
//     duration: 4.0,
//     label:    { text: '— TITLE —', color: '#ff0044' },
//     slowMo:   [[0, 1.0], [0.3, 0.05], [3.7, 0.05], [4.0, 1.0]],
//     cam: [
//       [0,   { zoomTo: 1.7, focusOn: () => boss }],
//       [0.5, { zoomTo: 1.1, focusOn: () => target }],
//     ],
//     steps: [
//       { at: 0.3, run: ({ boss, target }) => { /* scripted action */ } },
//       { at: 0.8, dialogue: 'Enough.' },
//       { at: 0.8, fx: { screenShake: 40, shockwave: { color: '#ff0044' } } },
//     ]
//   }));
// ============================================================


// ── World-space cinematic effects ─────────────────────────────────────────
// cinGroundCracks and cinScreenFlash are declared in smc-globals.js

// Called from smc-loop.js in world-space draw pass (after platforms, before fighters)
function drawCinematicWorldEffects() {
  for (let i = cinGroundCracks.length - 1; i >= 0; i--) {
    const c = cinGroundCracks[i];
    c.timer--;
    if (c.timer <= 0) { cinGroundCracks.splice(i, 1); continue; }
    const fadeAlpha = c.timer < 60 ? (c.timer / 60) * c.alpha : c.alpha;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fadeAlpha);
    ctx.strokeStyle = c.color || '#cc3300';
    ctx.lineWidth   = c.width || 2.5;
    ctx.shadowColor = c.color || '#cc3300';
    ctx.shadowBlur  = 10;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(c.length, 0);
    ctx.stroke();
    // Branch cracks
    if (c.branches) {
      for (const b of c.branches) {
        ctx.globalAlpha = Math.max(0, fadeAlpha * 0.55);
        ctx.lineWidth   = (c.width || 2.5) * 0.55;
        ctx.beginPath();
        ctx.moveTo(b.ox, 0);
        ctx.lineTo(b.ox + b.len * Math.cos(b.ang), b.len * Math.sin(b.ang));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ── CinFX — effect helper (call from step run() callbacks) ────────────────
const CinFX = {

  // Expanding ring shockwave (world-space)
  shockwave(x, y, color, opts = {}) {
    const count = opts.count  || 4;
    const maxR  = opts.maxR   || 290;
    const lw    = opts.lw     || 4.5;
    const dur   = opts.dur    || 72;
    for (let i = 0; i < count; i++) {
      phaseTransitionRings.push({
        cx: x, cy: y,
        r:       4 + i * 16,
        maxR:    maxR + i * 32,
        timer:   dur + i * 13,
        maxTimer: dur + i * 13,
        color,
        lineWidth: Math.max(0.5, lw - i * 0.6),
      });
    }
  },

  // Particle burst (world-space)
  particles(x, y, color, count = 30) {
    spawnParticles(x, y, color, count);
  },

  // Set screen shake (takes the max of current vs new value)
  shake(intensity) {
    if (settings && settings.screenShake !== false) {
      screenShake = Math.max(screenShake, intensity);
    }
  },

  // Brief screen flash (drawn by drawCinematicOverlay in screen-space)
  flash(color = '#ffffff', alpha = 0.65, durationFrames = 14) {
    cinScreenFlash = { color, alpha, timer: durationFrames, maxTimer: durationFrames };
  },

  // Ground crack fan radiating from a point (world-space, floor-level)
  groundCrack(x, groundY, opts = {}) {
    const count = opts.count || 6;
    const color = opts.color || '#cc3300';
    for (let i = 0; i < count; i++) {
      const angle  = (Math.random() - 0.5) * Math.PI * 0.7; // fan spread
      const length = 22 + Math.random() * 65;
      const dur    = 200 + Math.random() * 130;
      const branches = [];
      for (let b = 0; b < Math.floor(Math.random() * 3) + 1; b++) {
        branches.push({
          ox:  Math.random() * length * 0.8,
          len: 8 + Math.random() * 22,
          ang: (Math.random() - 0.5) * 1.3,
        });
      }
      cinGroundCracks.push({
        x:       x + (Math.random() - 0.5) * 28,
        y:       groundY,
        angle,
        length,
        alpha:   0.9,
        timer:   dur,
        maxTimer: dur,
        width:   1.5 + Math.random() * 2.2,
        color,
        branches,
      });
    }
  },

  // Force the nearest arena hazard to trigger soon
  arenaHazardNow() {
    if (typeof directorSpawnHazard === 'function') directorSpawnHazard();
  },
};

// ── CinCam — per-frame camera setter ──────────────────────────────────────
// Call from within step run() callbacks or the cinScript update loop.
const CinCam = {

  // Point camera at a world-space coordinate with a zoom level.
  // The existing smc-loop.js lerp (0.09 zoom, 0.07 pos) handles smoothing automatically.
  setFocus(x, y, zoom) {
    cinematicCamOverride = true;
    if (x    !== undefined) cinematicFocusX    = x;
    if (y    !== undefined) cinematicFocusY    = y;
    if (zoom !== undefined) cinematicZoomTarget = zoom;
  },

  // Hard-cut camera to a new focal point for one frame before normal smoothing resumes.
  snap(x, y, zoom) {
    this.setFocus(x, y, zoom);
    cinematicCamSnapFrames = Math.max(cinematicCamSnapFrames || 0, 1);
    _camPrevFocusX = cinematicFocusX;
    _camPrevFocusY = cinematicFocusY;
    _camOvershootX = 0;
    _camOvershootY = 0;
  },

  // Orbit camera around a center point (for dramatic circular reveal)
  // angle in radians; call each frame with an incrementing angle value
  orbit(cx, cy, radius, angle, zoom) {
    this.setFocus(
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius,
      zoom
    );
  },

  // Convenience: focus midpoint between two entities
  midpoint(a, b, zoom) {
    if (!a || !b) return;
    this.setFocus((a.cx() + b.cx()) * 0.5, (a.cy() + b.cy()) * 0.5, zoom);
  },

  // ── Finisher-friendly aliases ──────────────────────────────────────────
  // These match the CinCam API used by weapon/class finishers.

  // Set zoom only (keep current focus position)
  zoomTo(zoom) {
    cinematicCamOverride = true;
    cinematicZoomTarget = zoom;
  },

  // Focus on midpoint of two entities (optionally with zoom)
  focusMidpoint(a, b, zoom) {
    if (!a || !b) return;
    this.setFocus((a.cx() + b.cx()) * 0.5, (a.cy() + b.cy()) * 0.5, zoom);
  },

  // Focus on a single entity center
  focusOn(entity, zoom) {
    if (!entity) return;
    this.setFocus(entity.cx(), entity.cy(), zoom);
  },

  // Focus on an explicit world-space point
  focusPoint(x, y, zoom) {
    this.setFocus(x, y, zoom);
  },

  // Trigger screen shake (intensity in pixels)
  shake(intensity) {
    if (settings.screenShake) screenShake = Math.max(screenShake, intensity);
  },

  // Set slow-motion scale (1.0 = normal, 0.07 = near-freeze)
  slowMo(scale) {
    slowMotion = scale;
  },

  // Restore camera to normal gameplay control
  restore() {
    cinematicCamOverride = false;
    cinematicCamSnapFrames = 0;
    _camPrevFocusX = camXCur;
    _camPrevFocusY = camYCur;
    _camOvershootX = 0;
    _camOvershootY = 0;
    slowMotion = 1.0;
  },
};


// ── Keyframe interpolation helpers ────────────────────────────────────────

// Smooth-step easing (s-curve between 0 and 1)
function _cinEase(t) { return t * t * (3 - 2 * t); }

const _CIN_EASINGS = {
  linear: t => t,
  smooth: _cinEase,
  smoothstep: _cinEase,
  cubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  expo: t => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  back: t => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2;
  },
  elastic: t => {
    if (t === 0 || t === 1) return t;
    const c5 = (2 * Math.PI) / 4.5;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  bounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

function _cinGetEaseName(k0, k1) {
  const v0 = k0 && k0[1];
  const v1 = k1 && k1[1];
  const ease0 = Array.isArray(k0) ? k0[2] : null;
  const ease1 = Array.isArray(k1) ? k1[2] : null;
  const objEase0 = v0 && typeof v0 === 'object' && !Array.isArray(v0) ? v0._ease : null;
  const objEase1 = v1 && typeof v1 === 'object' && !Array.isArray(v1) ? v1._ease : null;
  return ease0 || objEase0 || ease1 || objEase1 || 'smooth';
}

function _cinGetEaseFn(k0, k1) {
  return _CIN_EASINGS[_cinGetEaseName(k0, k1)] || _cinEase;
}

// Linear interpolation along sorted [[t, value], ...] keyframe array
function _cinSampleKeyframes(kf, t) {
  if (!kf || kf.length === 0) return 1.0;
  if (t <= kf[0][0])                  return kf[0][1];
  if (t >= kf[kf.length - 1][0])     return kf[kf.length - 1][1];
  for (let i = 0; i < kf.length - 1; i++) {
    const k0 = kf[i];
    const k1 = kf[i + 1];
    const [t0, v0] = k0;
    const [t1, v1] = k1;
    if (t >= t0 && t <= t1) {
      if (t1 <= t0) return v1;
      const ease = _cinGetEaseFn(k0, k1);
      return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
    }
  }
  return kf[kf.length - 1][1];
}

// Camera keyframes: [[t, { zoomTo, focusOn, focusX, focusY }], ...]
// focusOn: () => entity    — live entity tracking (re-evaluated each frame)
// focusX/Y: number         — static world-space coordinate
function _cinSampleCam(kf, t) {
  if (!kf || kf.length === 0) return null;
  if (t <= kf[0][0])              return kf[0][1];
  if (t >= kf[kf.length - 1][0]) return kf[kf.length - 1][1];
  for (let i = 0; i < kf.length - 1; i++) {
    const seg0 = kf[i];
    const seg1 = kf[i + 1];
    const [t0, k0] = seg0;
    const [t1, k1] = seg1;
    if (t >= t0 && t <= t1) {
      if (t1 <= t0) return k1;
      const ease = _cinGetEaseFn(seg0, seg1);
      const a    = ease((t - t0) / (t1 - t0));
      const zoom = (k0.zoomTo !== undefined && k1.zoomTo !== undefined)
        ? k0.zoomTo + (k1.zoomTo - k0.zoomTo) * a
        : (k0.zoomTo ?? k1.zoomTo ?? 1.0);
      // focusOn: use the earlier keyframe's tracker (it "owns" this segment)
      const focusOn = k0.focusOn || null;
      const focusX  = k0.focusX !== undefined && k1.focusX !== undefined
        ? k0.focusX + (k1.focusX - k0.focusX) * a : (k0.focusX ?? k1.focusX);
      const focusY  = k0.focusY !== undefined && k1.focusY !== undefined
        ? k0.focusY + (k1.focusY - k0.focusY) * a : (k0.focusY ?? k1.focusY);
      return { zoomTo: zoom, focusOn, focusX, focusY };
    }
  }
  return kf[kf.length - 1][1];
}

function _cinUpsertKey(keys, time, value, ease) {
  const key = ease ? [time, value, ease] : [time, value];
  const last = keys[keys.length - 1];
  if (last && Math.abs(last[0] - time) < 1e-6) keys[keys.length - 1] = key;
  else keys.push(key);
}

function _cinCloneCamState(state) {
  return state ? Object.assign({}, state) : {};
}

function _cinApplyCamState(base, opts) {
  const next = _cinCloneCamState(base);
  if (!opts) return next;
  if (opts.zoom !== undefined) next.zoomTo = opts.zoom;
  if (opts.focusOn !== undefined) {
    if (opts.focusOn) {
      next.focusOn = opts.focusOn;
      delete next.focusX;
      delete next.focusY;
    } else {
      delete next.focusOn;
    }
  }
  if (opts.focusX !== undefined || opts.focusY !== undefined) {
    delete next.focusOn;
    if (opts.focusX !== undefined) next.focusX = opts.focusX;
    if (opts.focusY !== undefined) next.focusY = opts.focusY;
  }
  return next;
}


// ── cinScript — main factory ───────────────────────────────────────────────
//
// def = {
//   duration:  Number,                                    // total seconds
//   label:     { text, color } | null,                   // phase label shown mid-cinematic
//   slowMo:    [[t0, v0], [t1, v1], ...],                // slowMotion keyframes
//   cam:       [[t0, camKey], [t1, camKey], ...],        // camera keyframes
//   orbit:     { cx, cy, radius, speed, zoom } | null,  // optional constant orbit override
//   steps:     [{ at, run, dialogue, dialogueDur, fx }] // one-time timed steps
// }
//
// step.run receives: { t, boss, target, CinCam, CinFX }
// step.fx: { screenShake, flash:{color,alpha,dur}, particles:{x,y,color,count},
//            shockwave:{x,y,color,...}, groundCrack:{x,y,color,count} }
//
// ── Finisher timeline helpers ─────────────────────────────────────────────
// Used by smc-finishers.js weapon/class finishers.

function _makeTimeline(events) {
  // events: [{frame, fn}, ...]  sorted ascending by frame
  return events.slice().sort((a, b) => a.frame - b.frame);
}

function _tickTimeline(timeline, frame) {
  for (const ev of timeline) {
    if (ev.frame === frame) ev.fn();
  }
}

function _makeFinisherSentinel() {
  // Minimal activeCinematic stub that blocks processInput/AI during finisher.
  return {
    _isFinisherSentinel: true,
    durationFrames: 9999,
    tick() {},
    update() {},
    draw() {},
    done: false,
  };
}

// ── cinScript ─────────────────────────────────────────────────────────────

function cinScript(def) {
  const stepsFired = new Array((def.steps || []).length).fill(false);

  return {
    durationFrames: Math.round((def.duration || 3) * 60),
    _phaseLabel:    def.label || null,

    update(t) {
      // ── 1. Slow motion ──────────────────────────────────────
      if (def.slowMo) {
        slowMotion = _cinSampleKeyframes(def.slowMo, t);
      }

      // ── 2. Camera ───────────────────────────────────────────
      if (def.orbit && t >= (def.orbit.start || 0)) {
        const o     = def.orbit;
        const angle = (t - (o.start || 0)) * (o.speed || 0.8);
        CinCam.orbit(o.cx, o.cy, o.radius || 120, angle, o.zoom || 1.4);
      } else if (def.cam) {
        const k = _cinSampleCam(def.cam, t);
        if (k) {
          let fx = k.focusX, fy = k.focusY;
          if (k.focusOn) {
            const ent = typeof k.focusOn === 'function' ? k.focusOn() : k.focusOn;
            if (ent) { fx = ent.cx(); fy = ent.cy(); }
          }
          CinCam.setFocus(fx ?? GAME_W / 2, fy ?? GAME_H / 2, k.zoomTo);
        }
      }

      // ── 3. One-time steps ───────────────────────────────────
      const steps = def.steps || [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (stepsFired[i] || t < step.at) continue;
        stepsFired[i] = true;

        // Live entity lookup at execution time
        const boss   = players ? players.find(p => p.isBoss && p.health > 0) : null;
        const target = players ? players.find(p => !p.isBoss && p.health > 0) : null;

        // run callback
        if (step.run) step.run({ t, boss, target, CinCam, CinFX });

        // dialogue shorthand
        if (step.dialogue) showBossDialogue(step.dialogue, step.dialogueDur || 180);

        // inline fx shorthand
        if (step.fx) {
          const fx = step.fx;
          if (fx.screenShake)  CinFX.shake(fx.screenShake);
          if (fx.flash)        CinFX.flash(fx.flash.color, fx.flash.alpha, fx.flash.dur || 14);
          if (fx.particles)    CinFX.particles(fx.particles.x, fx.particles.y, fx.particles.color, fx.particles.count || 30);
          if (fx.shockwave) {
            // x/y can be a function (deferred evaluation) or a number
            const sw = fx.shockwave;
            const sx = typeof sw.x === 'function' ? sw.x() : (sw.x ?? GAME_W / 2);
            const sy = typeof sw.y === 'function' ? sw.y() : (sw.y ?? GAME_H / 2);
            CinFX.shockwave(sx, sy, sw.color || '#ffffff', sw);
          }
          if (fx.groundCrack) {
            const gc = fx.groundCrack;
            const gx = typeof gc.x === 'function' ? gc.x() : gc.x;
            const gy = typeof gc.y === 'function' ? gc.y() : gc.y;
            CinFX.groundCrack(gx, gy, gc);
          }
        }
      }
    },

    // Called every frame from drawCinematicOverlay() in screen-space.
    // def.onDraw(ctx, t) — t in seconds, ctx is identity-transform canvas context.
    draw(rctx, t) {
      if (typeof def.onDraw === 'function') def.onDraw(rctx, t);
    },

    onEnd() {
      slowMotion           = 1.0;
      cinematicCamOverride = false;
      cinematicCamSnapFrames = 0;
      _camPrevFocusX = camXCur;
      _camPrevFocusY = camYCur;
      _camOvershootX = 0;
      _camOvershootY = 0;
    },
  };
}

const CinTimeline = (function() {
  function create(labelDef) {
    let cursor = 0;
    let dur = 0;
    const slowMoKeys = [];
    const camKeys = [];
    const steps = [];
    let orbitDef = null;
    let slowMoState = typeof slowMotion === 'number' ? slowMotion : 1.0;
    let camState = {
      zoomTo: cinematicCamOverride ? cinematicZoomTarget : (typeof camZoomCur === 'number' ? camZoomCur : 1.0),
      focusX: cinematicCamOverride ? cinematicFocusX : (typeof camXCur === 'number' ? camXCur : GAME_W / 2),
      focusY: cinematicCamOverride ? cinematicFocusY : (typeof camYCur === 'number' ? camYCur : GAME_H / 2),
    };

    function touch(time) {
      dur = Math.max(dur, time);
    }

    function pushStep(step) {
      steps.push(step);
      touch(step.at);
    }

    const api = {
      to(opts = {}) {
        const startState = _cinApplyCamState(camState, {
          zoom: opts.zoomStart,
          focusX: opts.fromX,
          focusY: opts.fromY,
          focusOn: opts.focusOnStart,
        });
        const duration = Math.max(0, opts.duration || 0);
        _cinUpsertKey(camKeys, cursor, startState);

        const endState = _cinApplyCamState(startState, {
          zoom: opts.zoom,
          focusX: opts.focusX,
          focusY: opts.focusY,
          focusOn: opts.focusOn,
        });

        cursor += duration;
        touch(cursor);
        _cinUpsertKey(camKeys, cursor, endState, opts.ease);
        camState = _cinCloneCamState(endState);
        return api;
      },

      wait(secs) {
        cursor += Math.max(0, secs || 0);
        touch(cursor);
        return api;
      },

      fx(opts = {}) {
        const fx = Object.assign({}, opts);
        if (fx.shake !== undefined && fx.screenShake === undefined) {
          fx.screenShake = fx.shake;
        }
        pushStep({ at: cursor, fx });
        return api;
      },

      dialogue(text, durationFrames) {
        pushStep({ at: cursor, dialogue: text, dialogueDur: durationFrames });
        return api;
      },

      run(fn) {
        pushStep({ at: cursor, run: fn });
        return api;
      },

      slowMo(scale, rampDur, ease) {
        _cinUpsertKey(slowMoKeys, cursor, slowMoState);
        cursor += Math.max(0, rampDur || 0);
        touch(cursor);
        _cinUpsertKey(slowMoKeys, cursor, scale, ease);
        slowMoState = scale;
        return api;
      },

      orbit(opts) {
        orbitDef = Object.assign({}, opts || {}, { start: cursor });
        touch(cursor);
        return api;
      },

      at(t) {
        cursor = Math.max(0, t || 0);
        touch(cursor);
        return api;
      },

      build() {
        const sortedSteps = steps.slice().sort((a, b) => a.at - b.at);
        const duration = Math.max(
          dur,
          camKeys.length ? camKeys[camKeys.length - 1][0] : 0,
          slowMoKeys.length ? slowMoKeys[slowMoKeys.length - 1][0] : 0
        );

        return cinScript({
          duration,
          label: labelDef,
          slowMo: slowMoKeys.length ? slowMoKeys : undefined,
          cam: camKeys.length ? camKeys : undefined,
          orbit: orbitDef,
          steps: sortedSteps,
        });
      },
    };

    return api;
  }

  return { create };
})();

// ============================================================
// CINEMATIC ENHANCEMENTS v1
// Speed lines, motion trails, impact frames, name cards,
// Dutch angle, directional shake, background contrast shifts.
// All draw functions are called from smb-loop-core.js at the
// appropriate world-space or screen-space insertion points.
// ============================================================

// ── Dutch angle: apply game world transform with optional tilt ────────────
// Replaces raw ctx.setTransform() calls so a rotation can be baked in.
// Called from smb-loop-core.js wherever the game matrix is set.
function _applyGameTransform(scX, scY, tx, ty) {
  const tilt = (typeof cinematicTiltAngle !== 'undefined') ? cinematicTiltAngle : 0;
  if (Math.abs(tilt) < 0.0001) {
    ctx.setTransform(scX, 0, 0, scY, tx, ty);
    return;
  }
  const cw2 = canvas.width / 2;
  const ch2 = canvas.height / 2;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const ex = tx - cw2;
  const ey = ty - ch2;
  ctx.setTransform(
    cos * scX,  sin * scX,
    -sin * scY, cos * scY,
    ex * cos - ey * sin + cw2,
    ex * sin + ey * cos + ch2
  );
}

// ── CinFX additions ───────────────────────────────────────────────────────

// Radial or directional speed line burst (world-space).
// opts: { count, maxLen, dur, spread, dir, cone }
// dir = angle in radians for cone center; spread = cone width (default 2π = full circle)
CinFX.speedLines = function(x, y, color, opts) {
  opts = opts || {};
  const count  = opts.count  || 26;
  const maxLen = opts.maxLen || 260;
  const dur    = opts.dur    || 14;
  const spread = (opts.spread !== undefined) ? opts.spread : Math.PI * 2;
  const dir    = opts.dir    || 0;
  const lines  = [];
  for (let i = 0; i < count; i++) {
    // Even angular distribution with light jitter — random angles made full-circle
    // bursts read as scribble crossing through the subject
    const angle = dir + ((i + 0.5) / count - 0.5) * spread + (Math.random() - 0.5) * 0.12;
    lines.push({
      angle,
      // Inner gap: lines start well away from the origin so they form a halo
      startFrac: 0.30 + Math.random() * 0.15,
      endFrac:   0.60 + Math.random() * 0.40,
      width:     0.7 + Math.random() * 1.8,
    });
  }
  cinSpeedLines.push({ x, y, color: color || '#ffffff', lines, maxLen, timer: dur, maxTimer: dur });
};

// Hard-cut impact frame: white (or custom) bg + entity silhouettes for N frames.
// entities: a single entity or array of entities to silhouette.
CinFX.impactFrame = function(entities, opts) {
  opts = opts || {};
  const ents = Array.isArray(entities) ? entities : (entities ? [entities] : []);
  cinImpactFrame = {
    timer:    opts.dur   || 4,
    maxTimer: opts.dur   || 4,
    color:    opts.color || '#ffffff',
    entities: ents,
  };
};

// Named move card that slams onto screen for ~1.5 s.
// accentColor defaults to color.
CinFX.nameCard = function(text, color, opts) {
  opts = opts || {};
  cinNameCard = {
    text,
    color:       color       || '#ffffff',
    accentColor: opts.accent || color || '#ffffff',
    timer:       0,
    maxTimer:    opts.dur    || 92,
  };
};

// Full-bg contrast shift (drawn over background, under platforms).
// color = fill color, alpha = max opacity, duration = frames
CinFX.bgContrast = function(color, alpha, duration) {
  cinBgContrast = {
    color:    color    || '#000000',
    alpha:    (alpha   !== undefined) ? alpha    : 0.82,
    timer:    0,
    maxTimer: (duration !== undefined) ? duration : 28,
  };
};

// Enable motion trail on an entity (uses entity reference as key).
CinFX.motionTrailOn = function(entity, color) {
  if (!entity) return;
  for (const t of cinMotionTrails) {
    if (t.entity === entity) { t.enabled = true; t.color = color || entity.color; return; }
  }
  cinMotionTrails.push({ entity, positions: [], color: color || entity.color || '#ffffff', enabled: true });
};

// Disable and clear trail for an entity.
CinFX.motionTrailOff = function(entity) {
  for (let i = cinMotionTrails.length - 1; i >= 0; i--) {
    if (cinMotionTrails[i].entity === entity) { cinMotionTrails.splice(i, 1); return; }
  }
};

// ── CinCam additions ──────────────────────────────────────────────────────

// Dutch angle: degrees (positive = clockwise tilt, negative = counter-clockwise).
// The angle lerps smoothly via updateCinematicEnhancements().
CinCam.tilt = function(degrees) {
  cinematicTiltTarget = (degrees || 0) * (Math.PI / 180);
};

// Directional shake: intensity = screen shake amount, dx/dy = bias direction (-1..1).
// The shake is biased in that direction for the first ~6 frames.
CinCam.directionalShake = function(intensity, dx, dy) {
  if (settings && settings.screenShake !== false) {
    screenShake = Math.max(screenShake, intensity || 0);
  }
  cinShakeDir = { x: dx || 0, y: dy || 0, timer: 6 };
};

// Extend restore() to clean up enhancement state.
const _origCinCamRestore = CinCam.restore.bind(CinCam);
CinCam.restore = function() {
  _origCinCamRestore();
  cinematicTiltTarget = 0;
  cinShakeDir = null;
};

// ── Per-frame update ──────────────────────────────────────────────────────
// Called once per frame from smb-loop-core.js (after updateCinematicSystem).

function updateCinematicEnhancements() {
  // Lerp Dutch angle toward its target
  if (Math.abs(cinematicTiltTarget - cinematicTiltAngle) > 0.0001) {
    cinematicTiltAngle += (cinematicTiltTarget - cinematicTiltAngle) * 0.14;
  } else {
    cinematicTiltAngle = cinematicTiltTarget;
  }

  // Directional shake timer: tick unconditionally so it clears even if shake decays to 0
  if (cinShakeDir && cinShakeDir.timer > 0) {
    cinShakeDir.timer--;
    if (cinShakeDir.timer <= 0) cinShakeDir = null;
  }

  // Collect motion trail positions for all active trail entities
  for (let i = cinMotionTrails.length - 1; i >= 0; i--) {
    const t = cinMotionTrails[i];
    if (!t.enabled || !t.entity || t.entity.health <= 0) continue;
    // A near-stationary entity would otherwise stack nine ghosts on one spot
    const last = t.positions[t.positions.length - 1];
    if (last && Math.hypot(t.entity.x - last.x, t.entity.y - last.y) < 4) continue;
    t.positions.push({ x: t.entity.x, y: t.entity.y });
    if (t.positions.length > 9) t.positions.shift();
  }
}

// ── World-space draw: speed lines ────────────────────────────────────────
// Called from smb-loop-core.js after drawCinematicWorldEffects().

function drawCinSpeedLines() {
  if (!cinSpeedLines || !cinSpeedLines.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = cinSpeedLines.length - 1; i >= 0; i--) {
    const sl = cinSpeedLines[i];
    sl.timer--;
    if (sl.timer <= 0) { cinSpeedLines.splice(i, 1); continue; }
    const progress = 1 - sl.timer / sl.maxTimer;
    // Fade: full opacity at start, gone at end
    const alpha = Math.max(0, (1 - progress) * 0.9);
    ctx.strokeStyle = sl.color;
    ctx.shadowColor = sl.color;
    ctx.shadowBlur  = 5;
    ctx.globalAlpha = alpha;
    for (const line of sl.lines) {
      const startD = line.startFrac * sl.maxLen * (0.1 + progress * 0.9);
      const endD   = line.endFrac   * sl.maxLen * (0.15 + progress * 0.85);
      ctx.lineWidth = line.width;
      ctx.beginPath();
      ctx.moveTo(sl.x + Math.cos(line.angle) * startD, sl.y + Math.sin(line.angle) * startD);
      ctx.lineTo(sl.x + Math.cos(line.angle) * endD,   sl.y + Math.sin(line.angle) * endD);
      ctx.stroke();
    }
  }
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── World-space draw: motion trails ──────────────────────────────────────
// Called from smb-loop-core.js before the players draw loop.

function drawCinMotionTrails() {
  if (!cinMotionTrails || !cinMotionTrails.length) return;
  ctx.save();
  ctx.shadowBlur = 10;
  for (const t of cinMotionTrails) {
    if (!t.positions || t.positions.length < 2) continue;
    const ent = t.entity;
    if (!ent) continue;
    const count = t.positions.length;
    for (let i = 0; i < count - 1; i++) {
      const pos   = t.positions[i];
      const frac  = (i + 1) / count;         // 0 = oldest, 1 = newest
      const alpha = frac * frac * 0.42;      // quadratic: newest ghost most visible
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle   = t.color || '#ffffff';
      ctx.shadowColor = t.color || '#ffffff';
      if (ent._cinPerf && typeof CinPerf !== 'undefined' && typeof CinRig !== 'undefined') {
        CinPerf.drawGhost(ent, pos, t.color, alpha);
      } else {
        ctx.fillRect(pos.x + 4, pos.y + 4, ent.w - 8, ent.h - 8);
      }
    }
  }
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── World-space draw: background contrast shift ───────────────────────────
// Called from smb-loop-core.js immediately after drawBackground().

function drawCinBgContrast() {
  if (!cinBgContrast) return;
  cinBgContrast.timer++;
  if (cinBgContrast.timer >= cinBgContrast.maxTimer) { cinBgContrast = null; return; }
  const t = cinBgContrast.timer / cinBgContrast.maxTimer;
  // Fade in fast (first 20%), hold, fade out (last 25%)
  let fade;
  if (t < 0.20)      fade = t / 0.20;
  else if (t < 0.75) fade = 1.0;
  else               fade = (1.0 - t) / 0.25;
  ctx.save();
  // Screen-space fill — Dutch angle tilt would leave uncovered corners if drawn in world space
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = cinBgContrast.alpha * Math.max(0, fade);
  ctx.fillStyle   = cinBgContrast.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ── World-space draw: impact frame (hard-cut white + silhouettes) ─────────
// Called from smb-loop-core.js in the world-space pass (after bg, before platforms).
// The hard-cut must happen before platforms so silhouettes show cleanly.

function drawCinImpactFrame() {
  if (!cinImpactFrame) return;
  cinImpactFrame.timer--;
  if (cinImpactFrame.timer <= 0) { cinImpactFrame = null; return; }
  // First half: fully opaque. Second half: fade out.
  const progress = cinImpactFrame.timer / cinImpactFrame.maxTimer;
  const alpha    = progress > 0.5 ? 1.0 : (progress / 0.5);
  ctx.save();
  // Screen-space fill — Dutch angle tilt would leave uncovered corners if drawn in world space.
  // Silhouettes are re-mapped from world→canvas coords manually below.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // White (or custom) wash
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle   = cinImpactFrame.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Silhouettes: use the current game transform to convert world coords → canvas pixels
  // (we read the matrix from the saved state via a temp canvas trick is complex;
  //  instead we store the last-computed transform values as globals in smb-loop-core.js)
  ctx.fillStyle  = '#0a0a0a';
  ctx.shadowBlur = 0;
  if (typeof camXCur !== 'undefined' && typeof camZoomCur !== 'undefined') {
    const _bSc = Math.min(canvas.width / GAME_W, canvas.height / GAME_H);
    const _fSc = _bSc * camZoomCur;
    const _tx  = canvas.width  / 2 - camXCur * _fSc;
    const _ty  = canvas.height / 2 - camYCur * _fSc;
    for (const ent of cinImpactFrame.entities) {
      if (!ent || ent.health <= 0) continue;
      const sx = (ent.x - 3) * _fSc + _tx;
      const sy = (ent.y - 3) * _fSc + _ty;
      ctx.fillRect(sx, sy, (ent.w + 6) * _fSc, (ent.h + 6) * _fSc);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Screen-space draw: move name card ────────────────────────────────────
// Called from smb-loop-core.js in screen-space (after setTransform identity).

function drawCinNameCard(cw, ch) {
  if (!cinNameCard) return;
  cinNameCard.timer++;
  if (cinNameCard.timer >= cinNameCard.maxTimer) { cinNameCard = null; return; }

  const t = cinNameCard.timer / cinNameCard.maxTimer;
  // Alpha envelope: slam in (0–12%), hold (12–78%), fade out (78–100%)
  let alpha;
  if (t < 0.12)      alpha = t / 0.12;
  else if (t < 0.78) alpha = 1.0;
  else               alpha = (1.0 - t) / 0.22;

  // Scale: starts punchy (1.55→1.0 over first 10%)
  const scale = t < 0.10 ? (1.55 - (t / 0.10) * 0.55) : 1.0;

  const text   = cinNameCard.text        || '';
  const color  = cinNameCard.color       || '#ffffff';
  const accent = cinNameCard.accentColor || color;

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(cw * 0.5, ch * 0.775);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';

  // Measure text so plate width is dynamic
  ctx.font = 'bold 20px Arial';
  const textW = ctx.measureText(text).width;
  const pw = Math.max(260, textW + 80);
  const ph = 42;

  // Dark semi-transparent backing plate with sharp edges
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(-pw / 2, -ph / 2 + 2, pw, ph);

  // Accent bar — top
  ctx.fillStyle   = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur  = 14;
  ctx.fillRect(-pw / 2 + 10, -ph / 2 + 2, pw - 20, 2);

  // Move name text
  ctx.font        = 'bold 20px Arial';
  ctx.fillStyle   = '#ffffff';
  ctx.shadowColor = accent;
  ctx.shadowBlur  = 20;
  ctx.fillText(text, 0, 6);

  // Accent bar — bottom
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = accent;
  ctx.fillRect(-pw / 2 + 10, ph / 2 - 2, pw - 20, 2);

  ctx.restore();
}

