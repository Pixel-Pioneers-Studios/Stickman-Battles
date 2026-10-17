'use strict';
// Keyframed skeletal rig for story-scene stick figures.
//
// Poses are joint angles and clips time them (draw poses, then time them). This
// replaces the old per-state sine waves in _drawFigure, which had no holds or anticipation.
//
// Globals: FigureRig.hasClip(state), .sample(state, t, opts) -> pose,
//   .solve(pose, x, y, scale, facing) -> {joints, squash, ...} in canvas px,
//   .POSES / .CLIPS (extend freely).
// Depends on nothing. GSAP eases are used if present, with local fallbacks.
//
// Angles are ABSOLUTE, in facing-right space: radians from +X, +Y down.
// 0 = right, PI/2 = down, -PI/2 = up, PI = left. A limb angle is the bone's direction,
// not a joint bend. Mirroring for facing -1 happens in solve(), so author facing right.
// Proportions match the old inline figure. Changing them changes every story scene.
(function () {

  var L = {
    spine:    34,   // hip -> chest
    neck:     21,   // chest -> head centre
    upperArm: 13,
    foreArm:  13,
    thigh:    15,
    shin:     15,
    hipRise:  17,   // anchor y -> hip y
    shoulderDrop: 5 // chest y -> shoulder pivot
  };

  // GSAP is already loaded for cinematics. Fallbacks keep this file testable headless.
  var _fallback = {
    'none':        function (p) { return p; },
    'linear':      function (p) { return p; },
    'sine.inOut':  function (p) { return -(Math.cos(Math.PI * p) - 1) / 2; },
    'sine.out':    function (p) { return Math.sin(p * Math.PI / 2); },
    'sine.in':     function (p) { return 1 - Math.cos(p * Math.PI / 2); },
    'quad.out':    function (p) { return 1 - (1 - p) * (1 - p); },
    'cubic.in':    function (p) { return p * p * p; },
    'cubic.out':   function (p) { var u = 1 - p; return 1 - u * u * u; },
    'cubic.inOut': function (p) { return p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2; },
    'expo.out':    function (p) { return p === 1 ? 1 : 1 - Math.pow(2, -10 * p); },
    'expo.in':     function (p) { return p === 0 ? 0 : Math.pow(2, 10 * p - 10); },
    'back.in':     function (p) { return 2.70158*p*p*p - 1.70158*p*p; },
    'back.out':    function (p) { var c1=1.70158, c3=c1+1, u=p-1; return 1 + c3*u*u*u + c1*u*u; },
    'elastic.out': function (p) {
      if (p === 0 || p === 1) return p;
      return Math.pow(2, -10*p) * Math.sin((p*10 - 0.75) * (2*Math.PI/3)) + 1;
    }
  };
  var _easeCache = {};
  function ease(name, p) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    if (!name) name = 'sine.inOut';
    var fn = _easeCache[name];
    if (fn === undefined) {
      fn = null;
      if (typeof gsap !== 'undefined' && gsap.parseEase) {
        try { fn = gsap.parseEase(name) || null; } catch (e) { fn = null; }
      }
      if (!fn) fn = _fallback[name] || _fallback['sine.inOut'];
      _easeCache[name] = fn;
    }
    return fn(p);
  }

  // Each pose overrides BASE. Omitted channels inherit.
  var CH = ['spine','headTilt','upperArmF','foreArmF','upperArmB','foreArmB',
            'thighF','shinF','thighB','shinB','rootY','rootX','rootRot',
            'squash','lean'];

  var BASE = {
    spine:     -Math.PI/2,        // straight up
    headTilt:   0,                // extra head rotation, additive
    // Arm hang. Tighter angles merged the arms into the torso at scene scale.
    upperArmF:  Math.PI/2 - 0.30, // front arm hangs, slightly forward
    foreArmF:   Math.PI/2 - 0.15,
    upperArmB:  Math.PI/2 + 0.33, // back arm hangs, slightly behind
    foreArmB:   Math.PI/2 + 0.19,
    // Stance width. Legs close together read as one column.
    thighF:     Math.PI/2 - 0.14,
    shinF:      Math.PI/2 + 0.07,
    thighB:     Math.PI/2 + 0.15,
    shinB:      Math.PI/2 - 0.06,
    rootY:      0,                // + = lower on canvas
    rootX:      0,                // + = toward facing
    rootRot:    0,                // whole-body tilt
    squash:     0,                // + stretches vertically, - compresses
    lean:       0                 // hip offset along facing, px
  };

  function P(o) { return o; } // authoring sugar: keeps the tables scannable

  var POSES = {
    stand:     P({}),
    standSettle: P({ rootY: 1.1, lean: 1.2,
                     upperArmF: Math.PI/2 - 0.24, upperArmB: Math.PI/2 + 0.28,
                     thighF: Math.PI/2 - 0.10, thighB: Math.PI/2 + 0.19 }),
    breatheIn: P({ rootY: -1.1, spine: -Math.PI/2 - 0.012 }),

    talkA: P({ upperArmF: Math.PI/2 - 0.55, foreArmF: Math.PI/2 - 1.05, headTilt: -0.04, lean: 1 }),
    talkB: P({ upperArmF: Math.PI/2 - 0.30, foreArmF: Math.PI/2 - 0.62, headTilt:  0.03 }),
    talkC: P({ upperArmF: Math.PI/2 - 0.72, foreArmF: Math.PI/2 - 1.25, headTilt: -0.07, lean: 2 }),
    listenA: P({ headTilt: 0.06, rootY: 0.6,
                 upperArmF: Math.PI/2 - 0.26, foreArmF: Math.PI/2 - 0.34,
                 upperArmB: Math.PI/2 + 0.30, foreArmB: Math.PI/2 + 0.22 }),
    listenNod: P({ headTilt: 0.20, rootY: 1.8, spine: -Math.PI/2 + 0.03 }),

    // Real 4-key cycle: contact, passing, contact, passing.
    walkContactF: P({
      thighF: Math.PI/2 - 0.42, shinF: Math.PI/2 - 0.10,
      thighB: Math.PI/2 + 0.38, shinB: Math.PI/2 + 0.52,
      upperArmF: Math.PI/2 + 0.30, foreArmF: Math.PI/2 + 0.42,
      upperArmB: Math.PI/2 - 0.32, foreArmB: Math.PI/2 - 0.46,
      rootY: 1.4, spine: -Math.PI/2 + 0.05
    }),
    walkPassF: P({
      thighF: Math.PI/2 + 0.04, shinF: Math.PI/2 + 0.55,
      thighB: Math.PI/2 - 0.02, shinB: Math.PI/2 + 0.06,
      upperArmF: Math.PI/2 + 0.02, foreArmF: Math.PI/2 + 0.10,
      upperArmB: Math.PI/2 - 0.04, foreArmB: Math.PI/2 - 0.10,
      rootY: -1.9, spine: -Math.PI/2 + 0.02
    }),
    walkContactB: P({
      thighF: Math.PI/2 + 0.38, shinF: Math.PI/2 + 0.52,
      thighB: Math.PI/2 - 0.42, shinB: Math.PI/2 - 0.10,
      upperArmF: Math.PI/2 - 0.32, foreArmF: Math.PI/2 - 0.46,
      upperArmB: Math.PI/2 + 0.30, foreArmB: Math.PI/2 + 0.42,
      rootY: 1.4, spine: -Math.PI/2 + 0.05
    }),
    walkPassB: P({
      thighF: Math.PI/2 - 0.02, shinF: Math.PI/2 + 0.06,
      thighB: Math.PI/2 + 0.04, shinB: Math.PI/2 + 0.55,
      upperArmF: Math.PI/2 - 0.04, foreArmF: Math.PI/2 - 0.10,
      upperArmB: Math.PI/2 + 0.02, foreArmB: Math.PI/2 + 0.10,
      rootY: -1.9, spine: -Math.PI/2 + 0.02
    }),

    runContactF: P({
      thighF: Math.PI/2 - 0.85, shinF: Math.PI/2 - 0.30,
      thighB: Math.PI/2 + 0.70, shinB: Math.PI/2 + 1.35,
      upperArmF: Math.PI/2 + 0.85, foreArmF: Math.PI/2 + 1.55,
      upperArmB: Math.PI/2 - 0.95, foreArmB: Math.PI/2 - 1.75,
      rootY: 2.6, spine: -Math.PI/2 + 0.30, lean: 3
    }),
    runAirF: P({
      thighF: Math.PI/2 + 0.10, shinF: Math.PI/2 + 1.50,
      thighB: Math.PI/2 - 0.55, shinB: Math.PI/2 - 0.35,
      upperArmF: Math.PI/2 + 0.10, foreArmF: Math.PI/2 + 0.55,
      upperArmB: Math.PI/2 - 0.20, foreArmB: Math.PI/2 - 0.75,
      rootY: -4.0, spine: -Math.PI/2 + 0.26, lean: 3, squash: 0.05
    }),
    runContactB: P({
      thighF: Math.PI/2 + 0.70, shinF: Math.PI/2 + 1.35,
      thighB: Math.PI/2 - 0.85, shinB: Math.PI/2 - 0.30,
      upperArmF: Math.PI/2 - 0.95, foreArmF: Math.PI/2 - 1.75,
      upperArmB: Math.PI/2 + 0.85, foreArmB: Math.PI/2 + 1.55,
      rootY: 2.6, spine: -Math.PI/2 + 0.30, lean: 3
    }),
    runAirB: P({
      thighF: Math.PI/2 - 0.55, shinF: Math.PI/2 - 0.35,
      thighB: Math.PI/2 + 0.10, shinB: Math.PI/2 + 1.50,
      upperArmF: Math.PI/2 - 0.20, foreArmF: Math.PI/2 - 0.75,
      upperArmB: Math.PI/2 + 0.10, foreArmB: Math.PI/2 + 0.55,
      rootY: -4.0, spine: -Math.PI/2 + 0.26, lean: 3, squash: 0.05
    }),

    // Four poses: coil, throw, contact, recover. One lerp from A to B reads wrong.
    punchCoil: P({
      upperArmF: Math.PI/2 + 0.55, foreArmF: Math.PI + 0.35,
      upperArmB: Math.PI/2 - 0.25, foreArmB: Math.PI/2 - 0.55,
      spine: -Math.PI/2 - 0.16, lean: -4, rootY: 2.0,
      thighF: Math.PI/2 - 0.20, thighB: Math.PI/2 + 0.26, shinB: Math.PI/2 + 0.22,
      headTilt: -0.05, squash: -0.05
    }),
    punchThrow: P({
      upperArmF: -0.08, foreArmF: -0.02,
      upperArmB: Math.PI/2 + 0.75, foreArmB: Math.PI/2 + 1.15,
      spine: -Math.PI/2 + 0.26, lean: 7, rootY: 0.5,
      thighF: Math.PI/2 - 0.34, thighB: Math.PI/2 + 0.30, shinB: Math.PI/2 + 0.30,
      headTilt: 0.05, squash: 0.07
    }),
    punchContact: P({
      upperArmF: 0.02, foreArmF: 0.06,
      upperArmB: Math.PI/2 + 0.60, foreArmB: Math.PI/2 + 0.95,
      spine: -Math.PI/2 + 0.20, lean: 6, rootY: 1.4,
      thighF: Math.PI/2 - 0.30, thighB: Math.PI/2 + 0.28,
      squash: -0.06
    }),
    punchRecover: P({
      upperArmF: Math.PI/2 - 0.42, foreArmF: Math.PI/2 - 0.72,
      upperArmB: Math.PI/2 + 0.28, foreArmB: Math.PI/2 + 0.40,
      spine: -Math.PI/2 + 0.06, lean: 2, rootY: 0.8
    }),

    guard: P({
      upperArmF: Math.PI/2 - 1.15, foreArmF: -0.55,
      upperArmB: Math.PI/2 - 0.85, foreArmB: -0.30,
      spine: -Math.PI/2 + 0.10, rootY: 3.0, lean: -2,
      thighF: Math.PI/2 - 0.22, shinF: Math.PI/2 + 0.16,
      thighB: Math.PI/2 + 0.26, shinB: Math.PI/2 - 0.14, squash: -0.05
    }),

    hitSnap: P({
      upperArmF: Math.PI/2 - 1.45, foreArmF: Math.PI/2 - 1.95,
      upperArmB: Math.PI/2 + 1.05, foreArmB: Math.PI/2 + 1.55,
      spine: -Math.PI/2 - 0.40, lean: -8, rootY: 2.0, headTilt: -0.30,
      thighF: Math.PI/2 + 0.30, shinF: Math.PI/2 - 0.30,
      thighB: Math.PI/2 - 0.34, shinB: Math.PI/2 + 0.44,
      squash: -0.16, rootRot: -0.10
    }),
    hitRide: P({
      upperArmF: Math.PI/2 - 0.85, foreArmF: Math.PI/2 - 1.15,
      upperArmB: Math.PI/2 + 0.60, foreArmB: Math.PI/2 + 0.85,
      spine: -Math.PI/2 - 0.20, lean: -4, rootY: 1.0, headTilt: -0.14,
      squash: -0.05, rootRot: -0.04
    }),

    reach: P({
      upperArmF: -0.34, foreArmF: -0.50,
      upperArmB: Math.PI/2 + 0.40, foreArmB: Math.PI/2 + 0.30,
      spine: -Math.PI/2 + 0.34, lean: 6, headTilt: 0.10,
      thighF: Math.PI/2 - 0.28, thighB: Math.PI/2 + 0.20, squash: 0.05
    }),
    point: P({
      upperArmF: 0.06, foreArmF: 0.00,
      upperArmB: Math.PI/2 + 0.16, foreArmB: Math.PI/2 + 0.12,
      spine: -Math.PI/2 + 0.10, lean: 2, headTilt: 0.03
    }),
    look: P({
      upperArmF: Math.PI/2 - 0.95, foreArmF: Math.PI/2 - 1.60, // hand shading eyes
      upperArmB: Math.PI/2 + 0.14,
      headTilt: -0.10, spine: -Math.PI/2 - 0.04
    }),
    // Forearm across the face, weight in the front foot: bracing against a blast.
    brace: P({
      upperArmF: -0.20, foreArmF: -Math.PI/2 + 0.05,
      upperArmB: Math.PI/2 + 0.72, foreArmB: Math.PI/2 + 0.38,
      spine: -Math.PI/2 + 0.12, lean: 3, rootY: 4, headTilt: 0.10,
      thighF: Math.PI/2 - 0.50, shinF: Math.PI/2 + 0.28,
      thighB: Math.PI/2 + 0.52, shinB: Math.PI/2 + 0.12, squash: -0.05
    }),
    // Faceless figures can't aim their eyes, so looking up is the whole body.
    lookUp: P({
      spine: -Math.PI/2 - 0.16, headTilt: -0.42, rootY: 0.5, lean: -1,
      upperArmF: Math.PI/2 - 0.10, foreArmF: Math.PI/2 - 0.02,
      upperArmB: Math.PI/2 + 0.42, foreArmB: Math.PI/2 + 0.34,
      thighF: Math.PI/2 - 0.10, thighB: Math.PI/2 + 0.20
    }),
    // Looking at his own hands. `reach` can't play this inward beat.
    hands: P({
      upperArmF: Math.PI/2 - 0.50, foreArmF: -0.35,
      upperArmB: Math.PI/2 - 0.30, foreArmB: -0.20,
      spine: -Math.PI/2 + 0.10, headTilt: 0.40, rootY: 1
    }),
    // Fists up by the chin, knees soft.
    stance: P({
      upperArmF: Math.PI/2 - 0.75, foreArmF: -Math.PI/2 + 0.45,
      upperArmB: Math.PI/2 - 0.25, foreArmB: -Math.PI/2 + 0.25,
      spine: -Math.PI/2 + 0.12, rootY: 5, headTilt: 0.04,
      thighF: Math.PI/2 - 0.42, shinF: Math.PI/2 + 0.22,
      thighB: Math.PI/2 + 0.40, shinB: Math.PI/2 + 0.05, squash: -0.04
    }),
    crouch: P({
      thighF: Math.PI/2 - 0.72, shinF: Math.PI/2 + 0.62,
      thighB: Math.PI/2 + 0.55, shinB: Math.PI/2 - 0.48,
      spine: -Math.PI/2 + 0.30, rootY: 13, lean: 2,
      upperArmF: Math.PI/2 - 0.55, foreArmF: Math.PI/2 - 0.30,
      upperArmB: Math.PI/2 + 0.30, foreArmB: Math.PI/2 + 0.55, squash: -0.10
    }),
    kneel: P({
      thighF: Math.PI/2 - 0.62, shinF: Math.PI/2 + 0.90,
      thighB: Math.PI/2 + 0.95, shinB: 0.10,
      spine: -Math.PI/2 + 0.14, rootY: 15, headTilt: 0.12,
      upperArmF: Math.PI/2 - 0.30, foreArmF: Math.PI/2 - 0.10,
      upperArmB: Math.PI/2 + 0.18, foreArmB: Math.PI/2 + 0.30
    }),
    fall: P({
      upperArmF: Math.PI/2 - 1.75, foreArmF: Math.PI/2 - 2.25,
      upperArmB: Math.PI/2 + 1.35, foreArmB: Math.PI/2 + 1.85,
      thighF: Math.PI/2 - 0.75, shinF: Math.PI/2 - 0.20,
      thighB: Math.PI/2 + 0.30, shinB: Math.PI/2 + 0.95,
      spine: -Math.PI/2 - 0.55, rootRot: -0.22, rootY: -2, squash: 0.10
    }),
    floatA: P({
      upperArmF: Math.PI/2 - 0.62, foreArmF: Math.PI/2 - 0.85,
      upperArmB: Math.PI/2 + 0.55, foreArmB: Math.PI/2 + 0.80,
      thighF: Math.PI/2 - 0.16, shinF: Math.PI/2 + 0.30,
      thighB: Math.PI/2 + 0.20, shinB: Math.PI/2 + 0.42,
      spine: -Math.PI/2 - 0.06, rootY: -16, squash: 0.04
    }),
    floatB: P({
      upperArmF: Math.PI/2 - 0.48, foreArmF: Math.PI/2 - 0.70,
      upperArmB: Math.PI/2 + 0.44, foreArmB: Math.PI/2 + 0.66,
      thighF: Math.PI/2 - 0.10, shinF: Math.PI/2 + 0.22,
      thighB: Math.PI/2 + 0.26, shinB: Math.PI/2 + 0.50,
      spine: -Math.PI/2 + 0.04, rootY: -22, squash: -0.02
    })
  };

  // `t` is in frames at 60fps. `ease` applies to the segment ending at that key.
  // `hold` keeps the previous pose N frames before easing in. This is the snap control.
  var CLIPS = {
    idle: { loop: true, dur: 190, keys: [
      { t: 0,   pose: 'stand' },
      { t: 62,  pose: 'breatheIn',   ease: 'sine.inOut' },
      { t: 120, pose: 'standSettle', ease: 'sine.inOut' },
      { t: 190, pose: 'stand',       ease: 'sine.inOut' }
    ]},
    talk: { loop: true, dur: 96, keys: [
      { t: 0,  pose: 'talkB' },
      { t: 18, pose: 'talkA', ease: 'cubic.out' },
      { t: 34, pose: 'talkC', ease: 'back.out' },
      { t: 52, pose: 'talkB', ease: 'cubic.out' },
      { t: 70, pose: 'talkA', ease: 'sine.inOut' },
      { t: 96, pose: 'talkB', ease: 'sine.inOut' }
    ]},
    listen: { loop: true, dur: 220, keys: [
      { t: 0,   pose: 'listenA' },
      { t: 120, pose: 'listenA' },                          // long hold: stillness
      { t: 132, pose: 'listenNod', ease: 'cubic.out' },
      { t: 146, pose: 'listenA',   ease: 'back.out' },
      { t: 158, pose: 'listenNod', ease: 'cubic.out' },
      { t: 174, pose: 'listenA',   ease: 'back.out' },
      { t: 220, pose: 'listenA' }
    ]},
    walk: { loop: true, dur: 44, keys: [
      { t: 0,  pose: 'walkContactF' },
      { t: 11, pose: 'walkPassF',    ease: 'sine.inOut' },
      { t: 22, pose: 'walkContactB', ease: 'sine.inOut' },
      { t: 33, pose: 'walkPassB',    ease: 'sine.inOut' },
      { t: 44, pose: 'walkContactF', ease: 'sine.inOut' }
    ]},
    run: { loop: true, dur: 24, keys: [
      { t: 0,  pose: 'runContactF' },
      { t: 6,  pose: 'runAirF',     ease: 'quad.out' },
      { t: 12, pose: 'runContactB', ease: 'cubic.in' },
      { t: 18, pose: 'runAirB',     ease: 'quad.out' },
      { t: 24, pose: 'runContactF', ease: 'cubic.in' }
    ]},
    // One committed strike, then a ready stance. Looping it swung at air every 1.3s.
    // Coil slow, throw fast, contact hard: the asymmetry is the punch.
    attack: { loop: false, hold: true, dur: 78, keys: [
      { t: 0,  pose: 'stand' },
      { t: 14, pose: 'punchCoil',    ease: 'back.in' },     // anticipation
      { t: 20, pose: 'punchCoil' },                          // hold the coil
      { t: 23, pose: 'punchThrow',   ease: 'expo.out' },     // 3-frame throw
      { t: 27, pose: 'punchContact', ease: 'back.out' },     // overshoot + settle
      { t: 40, pose: 'punchRecover', ease: 'cubic.out' },
      { t: 78, pose: 'guard',        ease: 'sine.inOut' }
    ]},
    hit: { loop: false, dur: 70, keys: [
      { t: 0,  pose: 'stand' },
      { t: 3,  pose: 'hitSnap',  ease: 'expo.out' },         // impact is instant
      { t: 8,  pose: 'hitSnap' },                            // hold the snap
      { t: 22, pose: 'hitRide',  ease: 'cubic.out' },
      { t: 70, pose: 'stand',    ease: 'elastic.out' }       // ring out
    ]},
    guard: { loop: true, dur: 120, keys: [
      { t: 0,   pose: 'guard' },
      { t: 60,  pose: 'guard' },
      { t: 68,  pose: 'guard', ease: 'sine.inOut' },
      { t: 120, pose: 'guard' }
    ]},
    // Entered poses go in once, then HOLD (see `hold` in sample()). Looping them snapped
    // back to stand and knelt again every couple of seconds.
    reach: { loop: false, hold: true, dur: 130, keys: [
      { t: 0,   pose: 'stand' },
      { t: 26,  pose: 'reach', ease: 'back.out' },
      { t: 104, pose: 'reach' },
      { t: 130, pose: 'reach', ease: 'sine.inOut' }
    ]},
    point: { loop: false, hold: true, dur: 150, keys: [
      { t: 0,   pose: 'stand' },
      { t: 15,  pose: 'point', ease: 'back.out' },
      { t: 150, pose: 'point', ease: 'sine.inOut' }
    ]},
    look: { loop: true, dur: 200, keys: [
      { t: 0,   pose: 'look' },
      { t: 100, pose: 'look' },
      { t: 200, pose: 'look' }
    ]},
    brace: { loop: false, hold: true, dur: 120, keys: [
      { t: 0,   pose: 'stand' },
      { t: 7,   pose: 'brace', ease: 'expo.out' },
      { t: 120, pose: 'brace' }
    ]},
    lookUp: { loop: false, hold: true, dur: 150, keys: [
      { t: 0,   pose: 'stand' },
      { t: 30,  pose: 'lookUp', ease: 'cubic.out' },
      { t: 150, pose: 'lookUp' }
    ]},
    hands: { loop: false, hold: true, dur: 150, keys: [
      { t: 0,   pose: 'stand' },
      { t: 26,  pose: 'hands', ease: 'cubic.out' },
      { t: 150, pose: 'hands' }
    ]},
    stance: { loop: false, hold: true, dur: 120, keys: [
      { t: 0,   pose: 'stand' },
      { t: 12,  pose: 'stance', ease: 'back.out' },
      { t: 120, pose: 'stance' }
    ]},
    crouch: { loop: false, hold: true, dur: 150, keys: [
      { t: 0,   pose: 'stand' },
      { t: 18,  pose: 'crouch', ease: 'cubic.out' },
      { t: 150, pose: 'crouch' }
    ]},
    kneel: { loop: false, hold: true, dur: 160, keys: [
      { t: 0,   pose: 'stand' },
      { t: 24,  pose: 'kneel', ease: 'cubic.out' },
      { t: 160, pose: 'kneel' }
    ]},
    fall: { loop: false, hold: true, dur: 90, keys: [
      { t: 0,  pose: 'stand' },
      { t: 10, pose: 'fall', ease: 'cubic.in' },
      { t: 90, pose: 'fall', ease: 'sine.inOut' }
    ]},
    float: { loop: true, dur: 150, keys: [
      { t: 0,  pose: 'floatA' },
      { t: 75, pose: 'floatB', ease: 'sine.inOut' },
      { t: 150,pose: 'floatA', ease: 'sine.inOut' }
    ]}
  };

  function resolve(name) { return POSES[name] || POSES.stand; }

  function blend(a, b, p, out) {
    for (var i = 0; i < CH.length; i++) {
      var k = CH[i];
      var av = (a[k] !== undefined) ? a[k] : BASE[k];
      var bv = (b[k] !== undefined) ? b[k] : BASE[k];
      out[k] = av + (bv - av) * p;
    }
    return out;
  }

  function hasClip(state) { return !!CLIPS[state]; }
  // Held clips run from the moment the figure entered the state.
  function isHeld(state) { return !!(CLIPS[state] && CLIPS[state].hold); }

  // Sample a clip at time t (frames). opts.phase offsets the clip so two figures
  // in the same state don't move in lockstep. opts.speed scales playback.
  function sample(state, t, opts) {
    var clip = CLIPS[state];
    if (!clip) return null;
    opts = opts || {};
    var tt = (t + (opts.phase || 0)) * (opts.speed || 1);
    var d  = clip.dur;
    if (clip.loop) { tt = tt % d; if (tt < 0) tt += d; }
    else           { tt = tt < 0 ? 0 : (tt > d ? d : tt); }

    var keys = clip.keys, i = 0;
    for (var k = 0; k < keys.length; k++) if (tt >= keys[k].t) i = k;
    var cur = keys[i], nxt = keys[i + 1];
    if (!nxt) {
      var held = blend(resolve(cur.pose), resolve(cur.pose), 0, {});
      // A held pose still breathes; a frozen figure reads as a paused video.
      if (clip.hold) held.rootY += Math.sin((t + (opts.phase || 0)) * 0.035) * 0.9;
      return held;
    }
    var span = nxt.t - cur.t;
    var raw  = span > 0 ? (tt - cur.t) / span : 1;
    var p    = ease(nxt.ease, raw);
    return blend(resolve(cur.pose), resolve(nxt.pose), p, {});
  }

  // Returns absolute pixel points for bones, and for hanging face/cape/effects off joints.
  function solve(pose, x, y, scale, facing) {
    scale = scale || 1;
    var f = (facing < 0) ? -1 : 1;
    // Mirror by reflecting angles: theta -> PI - theta. Negating flips the figure upside down.
    function A(a) { return f > 0 ? a : Math.PI - a; }

    var sq   = pose.squash || 0;
    var vy   = 1 + sq;              // vertical scale
    var vx   = 1 - sq * 0.55;       // volume-ish compensation
    function seg(len) { return len * scale; }

    var rot = (pose.rootRot || 0) * f;
    var hipX = x + (pose.lean || 0) * f * scale + (pose.rootX || 0) * f * scale;
    var hipY = y - L.hipRise * scale * vy + (pose.rootY || 0) * scale;

    function step(px, py, ang, len, sy) {
      var a = A(ang) + rot;
      return { x: px + Math.cos(a) * seg(len) * vx,
               y: py + Math.sin(a) * seg(len) * (sy === undefined ? vy : sy) };
    }

    var chest = step(hipX, hipY, pose.spine, L.spine);
    var headC = step(chest.x, chest.y, pose.spine + (pose.headTilt || 0) * f, L.neck);
    // The neck is where the chest->head line meets the skull. Deriving it keeps the head
    // attached when the spine tilts (a tilted torso otherwise left a gap).
    var _hr = 13 * scale * (1 - sq * 0.42);
    var _ndx = headC.x - chest.x, _ndy = headC.y - chest.y;
    var _nlen = Math.sqrt(_ndx*_ndx + _ndy*_ndy) || 1;
    var neck = { x: headC.x - (_ndx / _nlen) * _hr * 0.80,
                 y: headC.y - (_ndy / _nlen) * _hr * 0.80 };
    // Shoulders sit along the spine, for the same reason.
    var _sdx = chest.x - hipX, _sdy = chest.y - hipY;
    var _slen = Math.sqrt(_sdx*_sdx + _sdy*_sdy) || 1;
    var shoulder = { x: chest.x - (_sdx/_slen) * L.shoulderDrop * scale,
                     y: chest.y - (_sdy/_slen) * L.shoulderDrop * scale };
    var shoY  = shoulder.y;

    var elbowF = step(shoulder.x, shoY, pose.upperArmF, L.upperArm, 1);
    var handF  = step(elbowF.x, elbowF.y, pose.foreArmF, L.foreArm, 1);
    var elbowB = step(shoulder.x, shoY, pose.upperArmB, L.upperArm, 1);
    var handB  = step(elbowB.x, elbowB.y, pose.foreArmB, L.foreArm, 1);

    var kneeF = step(hipX, hipY, pose.thighF, L.thigh, 1);
    var footF = step(kneeF.x, kneeF.y, pose.shinF, L.shin, 1);
    var kneeB = step(hipX, hipY, pose.thighB, L.thigh, 1);
    var footB = step(kneeB.x, kneeB.y, pose.shinB, L.shin, 1);

    return {
      facing: f, scale: scale, squash: sq, rot: rot,
      hip:   { x: hipX,  y: hipY },
      chest: chest,
      neck:  neck,
      shoulder: shoulder,
      head:  headC,
      headR: _hr,
      elbowF: elbowF, handF: handF,
      elbowB: elbowB, handB: handB,
      kneeF:  kneeF,  footF: footF,
      kneeB:  kneeB,  footB: footB
    };
  }

  window.FigureRig = {
    hasClip: hasClip, isHeld: isHeld, sample: sample, solve: solve, ease: ease, blend: blend,
    POSES: POSES, CLIPS: CLIPS, BASE: BASE, LENGTHS: L
  };
})();
