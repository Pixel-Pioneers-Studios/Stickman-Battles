'use strict';
// Cinematic scene specs for act4mv. Merges into window.STORY_SCENE_SPECS, which
// smb-story-narrative-scene.js reads, so these load before it.
// 22 specs. Chapter ids: 86, 87, 89, 90, 91, 93, 94, 95, 97, 99, 101, 105, 106, 107, 110, 112, 116, 117, 118, 122, 125, 126
// One staged beat per text beat (tools/scene-strip/align.js). The voice can hold a
// beat past its frame budget, so every beat lands its action early and ends on a pose
// that can sit.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  var KAEL = '#4488ff', VERAN = '#3ddc84';
  // The Fallen God guides this act as a voice only: no body, gold bubble near Kael.
  var FALLEN = '#e8b84a';
  var NO_NPC = [{ at: 0, x: 0.5, state: 'idle', facing: 1, alpha: 0, show: false }];

  // Keyframe shorthand: k(at, x, state, facing, extra).
  function k(at, x, state, facing, o) {
    var r = { at: at, x: x, state: state, facing: facing };
    if (o) for (var p in o) r[p] = o[p];
    return r;
  }
  function walk(at, x, facing, o) { return k(at, x, 'walk', facing, Object.assign({ ease: 'linear' }, o || {})); }
  function run(at, x, facing, o) { return k(at, x, 'run', facing, Object.assign({ ease: 'linear' }, o || {})); }
  function fig(color, pos) { return { color: color, pos: pos }; }
  // A fixed figure that holds one pose for the whole beat.
  function stand(color, x, state, facing, o) { return fig(color, [k(0, x, state, facing, o)]); }
  // Fade a figure in (or out) at a fixed spot.
  function fadeIn(color, x, state, facing, t0, t1, a, o) {
    return fig(color, [k(0, x, state, facing, Object.assign({ alpha: 0 }, o || {})),
                       k(t0, x, state, facing, Object.assign({ alpha: 0 }, o || {})),
                       k(t1, x, state, facing, Object.assign({ alpha: a === undefined ? 1 : a }, o || {}))]);
  }
  function L(base) { base.letterbox = true; return base; }
  function cont(base) { base.letterbox = true; base.transition = 'none'; return base; }

  // ── War-Torn Dimension ─────────────────────────────────────────────────────────

  // Chapter 86: A World at War
  var CONSCRIPT = '#aa3311';
  function conscripts(phase) {
    // Two conscripts fighting each other in the background, then turning on Kael.
    if (phase === 0) return [
      fig(CONSCRIPT, [run(0, 1.05, -1), run(90, 0.80, -1), k(120, 0.78, 'attack', -1), k(160, 0.78, 'guard', -1)]),
      fig('#883311', [run(0, 0.55, 1, { alpha: 0 }), run(40, 0.62, 1), k(110, 0.70, 'guard', 1), k(150, 0.70, 'attack', 1)]),
    ];
    if (phase === 1) return [
      fig(CONSCRIPT, [k(0, 0.78, 'guard', -1), k(60, 0.78, 'attack', -1), k(110, 0.78, 'guard', -1), k(200, 0.78, 'brace', -1)]),
      fig('#883311', [k(0, 0.70, 'attack', 1), k(60, 0.70, 'brace', 1), k(110, 0.70, 'attack', 1), k(200, 0.70, 'guard', 1)]),
    ];
    return [
      fig(CONSCRIPT, [k(0, 0.78, 'brace', -1), k(210, 0.78, 'look', -1), k(240, 0.78, 'stance', -1)]),
      fig('#883311', [k(0, 0.70, 'guard', 1), k(220, 0.70, 'look', -1), k(250, 0.70, 'stance', -1)]),
    ];
  }
  S[86] = {
    bg: 'city',
    npcColor: FALLEN,
    beats: [
      L({
        // The fracture opened onto a sky already burning.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.40, cy: 0.40 }, { at: 40, zoom: 1.25, cx: 0.30, cy: 0.58 }, { at: 120, zoom: 1.10, cx: 0.45, cy: 0.52 }],
        camShake: [{ at: 34, strength: 10, dur: 18 }],
        playerPos: [k(0, 0.30, 'fall', 1, { y: -0.50, ease: 'linear' }), k(34, 0.30, 'crouch', 1, { y: 0 }), k(70, 0.30, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.80, alpha: 0.80, fadeIn: 30 }, { type: 'smoke', alpha: 0.55 }],
        effects: [{ type: 'impact_sparks', cx: 0.30, cy: 0.74, count: 10, color: '#ffbb66', startFrame: 34, duration: 24 }],
        extraFigures: conscripts(0),
      }),
      cont({
        // "Every soul here has fought since birth."
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.45, cy: 0.52 }, { at: 200, zoom: 1.20, cx: 0.62, cy: 0.54 }],
        playerPos: [k(0, 0.30, 'look', 1), k(150, 0.30, 'listen', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.80, alpha: 0.80 }, { type: 'smoke', alpha: 0.55 }],
        extraFigures: conscripts(1),
        bubbleX: 0.36,
      }),
      cont({
        // The ground shook. Something very large, collapsing.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.62, cy: 0.54 }, { at: 20, zoom: 1.05, cx: 0.55, cy: 0.42 }, { at: 160, zoom: 1.08, cx: 0.60, cy: 0.44 }],
        camShake: [{ at: 14, strength: 16, dur: 40 }],
        playerPos: [k(0, 0.30, 'listen', 1), k(16, 0.30, 'brace', 1), k(90, 0.30, 'lookUp', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 1.0, alpha: 0.90, startFrame: 14, fadeIn: 16 }, { type: 'smoke', alpha: 0.80 }],
        effects: [{ type: 'ground_crack', cx: 0.64, color: '#ff6622', startFrame: 14, duration: 60 }],
        extraFigures: conscripts(1),
      }),
      cont({
        // "Watch how they waste it." The two stop fighting and turn on Kael.
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.60, cy: 0.44 }, { at: 50, zoom: 1.25, cx: 0.40, cy: 0.58 }, { at: 260, zoom: 1.15, cx: 0.52, cy: 0.52 }],
        playerPos: [k(0, 0.30, 'lookUp', 1), k(30, 0.30, 'look', 1), k(240, 0.30, 'stance', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.90, alpha: 0.85 }, { type: 'smoke', alpha: 0.60 }],
        extraFigures: conscripts(2),
        bubbleX: 0.36,
      }),
    ],
  };

  // Chapter 87: The War Camp
  var VET = '#cc3311';
  S[87] = {
    bg: 'city',
    npcColor: VET,
    beats: [
      L({
        // The command post had never fallen.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.18, cy: 0.58 }, { at: 100, zoom: 1.05, cx: 0.48, cy: 0.46 }],
        playerPos: [walk(0, 0.10, 1), k(80, 0.25, 'lookUp', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.60 }],
      }),
      cont({
        // Three hundred years. Up the walls to the flags.
        camAnim: [{ at: 0, zoom: 1.05, cx: 0.48, cy: 0.46 }, { at: 160, zoom: 1.20, cx: 0.86, cy: 0.30, ease: 'linear' }, { at: 240, zoom: 1.10, cx: 0.55, cy: 0.48 }],
        playerPos: [k(0, 0.25, 'lookUp', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.60 }],
        // The bearers who came before, faint at the gate.
        extraFigures: [0.50, 0.58, 0.66].map(function (x, i) { return fadeIn('#776655', x, 'kneel', -1, 30 + i * 30, 70 + i * 30, 0.18); }),
      }),
      cont({
        // Two veterans in the gateway. They didn't look tired.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.55, cy: 0.48 }, { at: 60, zoom: 1.35, cx: 0.62, cy: 0.60 }, { at: 330, zoom: 1.30, cx: 0.60, cy: 0.58 }],
        playerPos: [k(0, 0.25, 'lookUp', 1), k(40, 0.25, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.60 }],
        extraFigures: [fadeIn(VET, 0.56, 'stance', -1, 10, 40), fadeIn('#aa2a10', 0.68, 'stance', -1, 20, 50)],
      }),
      cont({
        // Waiting for someone specific. They step out together.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.58 }, { at: 90, zoom: 1.15, cx: 0.46, cy: 0.52 }],
        playerPos: [k(0, 0.25, 'look', 1), k(60, 0.25, 'stance', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.60 }],
        extraFigures: [
          fig(VET, [k(0, 0.56, 'stance', -1), walk(20, 0.56, -1), k(70, 0.49, 'stance', -1)]),
          fig('#aa2a10', [k(0, 0.68, 'stance', -1), walk(28, 0.68, -1), k(78, 0.61, 'stance', -1)]),
        ],
      }),
    ],
  };

  // Chapter 89: War Champion
  var CHAMP = '#ff2200';
  var CHAMP_GUARDS = function () { return [stand('#aa2a10', 0.80, 'stance', -1), stand('#cc3311', 0.88, 'stance', -1)]; };
  S[89] = {
    bg: 'city',
    npcColor: CHAMP,
    beats: [
      L({
        // They had never lost.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.66, cy: 0.62 }, { at: 100, zoom: 1.15, cx: 0.56, cy: 0.52 }],
        playerPos: [k(0, 0.28, 'look', 1)],
        npcPos: [k(0, 0.66, 'stance', -1, { scale: 1.2 })],
        effectsBehind: [{ type: 'fire_glow', intensity: 0.60, alpha: 0.70 }],
        extraFigures: CHAMP_GUARDS(),
      }),
      cont({
        // Every bearer the dimension had seen, ended here.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.56, cy: 0.52 }, { at: 200, zoom: 1.30, cx: 0.62, cy: 0.62 }],
        playerPos: [k(0, 0.28, 'look', 1)],
        npcPos: [k(0, 0.66, 'stance', -1, { scale: 1.2 })],
        effectsBehind: [{ type: 'fire_glow', intensity: 0.60, alpha: 0.70 }],
        extraFigures: CHAMP_GUARDS().concat([0.48, 0.54, 0.60, 0.72].map(function (x, i) {
          return fadeIn(['#665566', '#556677', '#776655', '#556655'][i], x, i % 2 ? 'crouch' : 'kneel', i < 3 ? 1 : -1, 20 + i * 30, 60 + i * 30, 0.20);
        })),
      }),
      cont({
        // "But you will be mine."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.62, cy: 0.62 }, { at: 40, zoom: 1.35, cx: 0.62, cy: 0.60 }, { at: 300, zoom: 1.20, cx: 0.50, cy: 0.54 }],
        playerPos: [k(0, 0.28, 'look', 1), k(60, 0.28, 'stance', 1)],
        npcPos: [k(0, 0.66, 'stance', -1, { scale: 1.2 }), walk(12, 0.66, -1, { scale: 1.2 }), k(50, 0.60, 'talk', -1, { scale: 1.2 }), k(210, 0.60, 'point', -1, { scale: 1.2 })],
        effectsBehind: [{ type: 'fire_glow', intensity: 0.60, alpha: 0.70 }],
        extraFigures: CHAMP_GUARDS(),
      }),
      cont({
        // Behind you, the Fallen God's voice, barely a whisper.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.50, cy: 0.54 }, { at: 50, zoom: 1.60, cx: 0.28, cy: 0.66 }],
        playerPos: [k(0, 0.28, 'stance', 1), k(30, 0.28, 'listen', 1)],
        npcPos: [k(0, 0.60, 'point', -1, { scale: 1.2 }), k(40, 0.60, 'stance', -1, { scale: 1.2 })],
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.60 }],
        extraFigures: CHAMP_GUARDS(),
      }),
      cont({
        // "You did not become violent. You became decisive."
        npcColor: FALLEN,
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.28, cy: 0.66 }, { at: 140, zoom: 1.50, cx: 0.29, cy: 0.64 }, { at: 170, zoom: 1.15, cx: 0.48, cy: 0.52 }],
        playerPos: [k(0, 0.28, 'listen', 1), k(150, 0.28, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(CHAMP, 0.60, 'stance', -1, { scale: 1.2 })].concat(CHAMP_GUARDS()),
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.60 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.55, startFrame: 150, fadeIn: 16 }],
        bubbleX: 0.34,
      }),
    ],
  };

  // ── Gravity Flux World ─────────────────────────────────────────────────────────

  // Chapter 90: Into the Flux
  var DRIFTER = '#2255aa';
  S[90] = {
    bg: 'space',
    npcColor: FALLEN,
    beats: [
      L({
        // The fracture opened sideways. Kael comes through horizontal.
        warp: 0.30,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.20, cy: 0.46 }, { at: 90, zoom: 1.10, cx: 0.40, cy: 0.50 }],
        playerPos: [k(0, 0.04, 'fall', 1, { y: -0.18, ease: 'linear' }), k(60, 0.24, 'fall', 1, { y: -0.12 }), k(90, 0.28, 'float', 1, { y: -0.08 })],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'portal', xf: 0.04, yf: 0.40, height: 0.40, color: '#5588ff', alpha: 0.70, duration: 80 }],
        effects: [{ type: 'speedlines', cx: 0.10, cy: 0.42, count: 18, color: '#88aaff', alpha: 0.45, duration: 60, fadeIn: 4 }],
      }),
      cont({
        // Only unusual for a moment. He rights himself and lands.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.40, cy: 0.50 }, { at: 80, zoom: 1.20, cx: 0.32, cy: 0.56 }],
        playerPos: [k(0, 0.28, 'float', 1, { y: -0.08 }), k(36, 0.28, 'crouch', 1, { y: 0 }), k(70, 0.28, 'look', 1)],
        npcPos: NO_NPC,
      }),
      cont({
        // "Gravity inverts every twelve seconds." Drifters overhead, upside-down calm.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.32, cy: 0.56 }, { at: 120, zoom: 1.10, cx: 0.60, cy: 0.42 }, { at: 300, zoom: 1.15, cx: 0.50, cy: 0.48 }],
        playerPos: [k(0, 0.28, 'look', 1), k(80, 0.28, 'lookUp', 1)],
        npcPos: NO_NPC,
        extraFigures: [
          fadeIn(DRIFTER, 0.62, 'float', -1, 30, 70, 1, { y: -0.30 }),
          fadeIn('#3366cc', 0.78, 'float', 1, 60, 100, 1, { y: -0.22 }),
        ],
        bubbleX: 0.34,
      }),
      cont({
        // The ground shifted. Then wasn't the ground anymore.
        warp: 0.50,
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.48 }, { at: 30, zoom: 1.05, cx: 0.50, cy: 0.40 }, { at: 120, zoom: 1.12, cx: 0.45, cy: 0.42 }],
        camShake: [{ at: 20, strength: 12, dur: 26 }],
        playerPos: [k(0, 0.28, 'lookUp', 1), k(20, 0.28, 'brace', 1), k(40, 0.28, 'float', -1, { y: -0.20 }), k(90, 0.29, 'stance', 1, { y: -0.26 })],
        npcPos: NO_NPC,
        extraFigures: [
          fig(DRIFTER, [k(0, 0.62, 'float', -1, { y: -0.30 }), k(40, 0.62, 'stance', -1, { y: -0.30 })]),
          fig('#3366cc', [k(0, 0.78, 'float', 1, { y: -0.22 }), k(46, 0.78, 'stance', -1, { y: -0.24 })]),
        ],
        effects: [{ type: 'static_noise', alpha: 0.18, startFrame: 20, duration: 24 }],
      }),
    ],
  };

  // Chapter 91: Drifters in the Flux
  var FVET = '#3366cc';
  function fluxVets(flip) {
    var spots = [[0.58, -0.28], [0.72, 0], [0.86, -0.16]];
    return spots.map(function (s, i) {
      var c = ['#3366cc', '#2a58b0', '#4477dd'][i];
      if (!flip) return stand(c, s[0], s[1] < 0 ? 'float' : 'stance', -1, { y: s[1] });
      // On the flip they redirect into it: drop, roll, and land already set.
      return fig(c, [k(0, s[0], s[1] < 0 ? 'float' : 'stance', -1, { y: s[1] }),
                     k(30 + i * 8, s[0], 'fall', -1, { y: s[1] * 0.5 }),
                     k(60 + i * 8, s[0] - 0.04, 'stance', -1, { y: s[1] < 0 ? 0 : -0.24 })]);
    });
  }
  S[91] = {
    bg: 'space',
    npcColor: FALLEN,
    beats: [
      L({
        // They never fought a gravity inversion. They redirected into it.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.48 }, { at: 200, zoom: 1.25, cx: 0.72, cy: 0.50 }],
        camShake: [{ at: 26, strength: 8, dur: 20 }],
        playerPos: [k(0, 0.26, 'look', 1), k(28, 0.26, 'brace', 1), k(80, 0.26, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: fluxVets(true),
        effects: [{ type: 'static_noise', alpha: 0.15, startFrame: 24, duration: 20 }],
      }),
      cont({
        // Three of them, spaced so two are always on top.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.72, cy: 0.50 }, { at: 180, zoom: 1.10, cx: 0.56, cy: 0.46 }],
        playerPos: [k(0, 0.26, 'look', 1), k(100, 0.26, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand('#3366cc', 0.54, 'stance', -1), stand('#2a58b0', 0.68, 'stance', -1, { y: -0.24 }), stand('#4477dd', 0.82, 'stance', -1)],
      }),
      cont({
        // "Interesting gap to close."
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.56, cy: 0.46 }, { at: 60, zoom: 1.40, cx: 0.30, cy: 0.62 }, { at: 300, zoom: 1.30, cx: 0.34, cy: 0.58 }],
        playerPos: [k(0, 0.26, 'stance', 1), k(40, 0.26, 'listen', 1), k(280, 0.26, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand('#3366cc', 0.54, 'stance', -1), stand('#2a58b0', 0.68, 'stance', -1, { y: -0.24 }), stand('#4477dd', 0.82, 'stance', -1)],
        bubbleX: 0.34,
      }),
    ],
  };

  // Chapter 93: Flux Guardian
  // The level's orbit rings mark the axis. The Guardian floats at its centre.
  var FGUARD = '#00aaff', AXIS = 0.48;
  S[93] = {
    bg: 'space',
    npcColor: FGUARD,
    beats: [
      L({
        // It existed at the exact point where gravity reversed.
        camAnim: [{ at: 0, zoom: 1.20, cx: AXIS, cy: 0.34 }, { at: 120, zoom: 1.08, cx: 0.48, cy: 0.48 }],
        playerPos: [walk(0, 0.10, 1), k(90, 0.24, 'lookUp', 1)],
        npcPos: [k(0, AXIS + 0.20, 'float', -1, { y: -0.26 })],
      }),
      cont({
        // Everything shifts around it. It doesn't notice.
        warp: 0.45,
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.48, cy: 0.48 }, { at: 220, zoom: 1.15, cx: 0.52, cy: 0.46 }],
        camShake: [{ at: 60, strength: 10, dur: 22 }, { at: 190, strength: 8, dur: 18 }],
        playerPos: [k(0, 0.24, 'lookUp', 1), k(60, 0.24, 'brace', 1), k(100, 0.24, 'float', 1, { y: -0.10 }), k(190, 0.24, 'crouch', 1, { y: 0 }), k(230, 0.24, 'stance', 1)],
        npcPos: [k(0, AXIS + 0.20, 'float', -1, { y: -0.26 })],
      }),
      cont({
        // "The others found the inversion... disorienting."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.52, cy: 0.46 }, { at: 60, zoom: 1.35, cx: 0.66, cy: 0.46 }, { at: 300, zoom: 1.25, cx: 0.56, cy: 0.48 }],
        playerPos: [k(0, 0.24, 'stance', 1)],
        npcPos: [k(0, AXIS + 0.20, 'float', -1, { y: -0.26 }), k(20, AXIS + 0.20, 'talk', -1, { y: -0.18 }), k(200, AXIS + 0.20, 'hands', -1, { y: -0.12 })],
        // The thirteen before him, as a faint row.
        extraFigures: [0.40, 0.46, 0.52].map(function (x, i) { return fadeIn('#557799', x, 'kneel', -1, 100 + i * 20, 140 + i * 20, 0.18); }),
      }),
      cont({
        // The world flipped.
        warp: 0.60,
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.56, cy: 0.48 }, { at: 10, zoom: 1.05, cx: 0.48, cy: 0.40 }, { at: 90, zoom: 1.15, cx: 0.44, cy: 0.46 }],
        camShake: [{ at: 6, strength: 18, dur: 30 }],
        playerPos: [k(0, 0.24, 'stance', 1), k(8, 0.24, 'fall', -1, { y: -0.10 }), k(40, 0.25, 'crouch', 1, { y: -0.30 }), k(70, 0.25, 'stance', 1, { y: -0.30 })],
        npcPos: [k(0, AXIS + 0.20, 'hands', -1, { y: -0.12 }), k(20, AXIS + 0.20, 'stance', -1, { y: -0.20 })],
        effects: [{ type: 'screen_flash', color: FGUARD, startFrame: 6, duration: 10, alpha: 0.25 }, { type: 'static_noise', alpha: 0.25, startFrame: 6, duration: 24 }],
      }),
    ],
  };

  // ── Shadow Realm ───────────────────────────────────────────────────────────────

  // Chapter 94: Into the Dark
  var PROWL = '#7a2aa8';
  S[94] = {
    bg: 'city',
    npcColor: FALLEN,
    beats: [
      L({
        // The realm began before you entered it.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.18, cy: 0.58 }, { at: 100, zoom: 1.15, cx: 0.36, cy: 0.54 }],
        playerPos: [walk(0, 0.10, 1), k(84, 0.24, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'smoke', alpha: 0.40, fadeIn: 60 }],
      }),
      cont({
        // The light left first. Then the sound. Then the ground.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.36, cy: 0.54 }, { at: 200, zoom: 1.40, cx: 0.26, cy: 0.62 }],
        playerPos: [k(0, 0.24, 'look', 1), k(60, 0.24, 'look', -1), k(130, 0.24, 'guard', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'smoke', alpha: 0.75 }],
        effects: [{ type: 'static_noise', alpha: 0.20, startFrame: 70, duration: 30 }],
      }),
      cont({
        // "The fragment can feel them before you can see them."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.26, cy: 0.62 }, { at: 300, zoom: 1.25, cx: 0.36, cy: 0.56 }],
        playerPos: [k(0, 0.24, 'guard', 1), k(60, 0.24, 'hands', 1), k(200, 0.24, 'stance', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'smoke', alpha: 0.75 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.55, startFrame: 60, fadeIn: 30 }],
        // The prowlers only show when the fragment pulses.
        extraFigures: [fadeIn(PROWL, 0.44, 'stance', -1, 80, 120, 0.30), fadeIn('#5a1a88', 0.60, 'crouch', -1, 110, 150, 0.25)],
        bubbleX: 0.30,
      }),
      cont({
        // "Or don't. The shadows do not care." One lunges out of the dark.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.36, cy: 0.56 }, { at: 70, zoom: 1.25, cx: 0.36, cy: 0.56 }, { at: 86, zoom: 1.10, cx: 0.40, cy: 0.52 }],
        camShake: [{ at: 84, strength: 12, dur: 18 }],
        playerPos: [k(0, 0.24, 'stance', 1), k(80, 0.24, 'guard', 1), k(86, 0.23, 'brace', 1), k(110, 0.23, 'stance', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'smoke', alpha: 0.75 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.50 }],
        extraFigures: [
          fig(PROWL, [k(0, 0.44, 'stance', -1, { alpha: 0.30 }), k(70, 0.44, 'stance', -1, { alpha: 0.30 }), run(72, 0.44, -1, { alpha: 1 }), k(84, 0.31, 'attack', -1, { alpha: 1 }), k(110, 0.34, 'stance', -1, { alpha: 1 })]),
          stand('#5a1a88', 0.60, 'crouch', -1, { alpha: 0.25 }),
        ],
        effects: [{ type: 'impact_sparks', cx: 0.28, cy: 0.56, count: 12, color: '#cc88ff', startFrame: 84, duration: 22 }],
        bubbleX: 0.30,
      }),
    ],
  };

  // Chapter 95: The Unseen Court
  var PHASE = '#9a3ae0';
  // Phase Hunters blink between spots; t is the frame they finally hold.
  function phaser(c, spots, t, hold) {
    var pos = [], at = 0;
    spots.forEach(function (x, i) {
      pos.push(k(at, x, 'stance', -1, { alpha: 0 }));
      pos.push(k(at + 6, x, 'stance', -1, { alpha: 0.7 }));
      pos.push(k(at + 30, x, 'stance', -1, { alpha: 0.7 }));
      pos.push(k(at + 36, x, 'stance', -1, { alpha: 0 }));
      at += 40;
    });
    if (hold) pos.push(k(t, hold, 'stance', -1, { alpha: 0 }), k(t + 4, hold, 'stance', -1, { alpha: 1 }));
    return fig(c, pos);
  }
  S[95] = {
    bg: 'city',
    npcColor: FALLEN,
    beats: [
      L({
        // If you could be found, you lost.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.50 }, { at: 200, zoom: 1.15, cx: 0.56, cy: 0.52 }],
        playerPos: [k(0, 0.24, 'look', 1), k(80, 0.24, 'look', -1), k(140, 0.24, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [phaser(PHASE, [0.62, 0.84, 0.48, 0.74], 0), phaser('#7a22c0', [0.80, 0.52, 0.70, 0.90], 0)],
      }),
      cont({
        // Phase Hunters had never lost. Because they could not be found.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.56, cy: 0.52 }, { at: 160, zoom: 1.25, cx: 0.40, cy: 0.56 }],
        playerPos: [k(0, 0.24, 'look', 1), k(60, 0.24, 'guard', 1)],
        npcPos: NO_NPC,
        extraFigures: [phaser(PHASE, [0.40, 0.70, 0.56], 0), phaser('#7a22c0', [0.76, 0.46, 0.86], 0)],
      }),
      cont({
        // Until now. The fragment pulses; one is caught solid.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.40, cy: 0.56 }, { at: 20, zoom: 1.40, cx: 0.52, cy: 0.60 }],
        camShake: [{ at: 18, strength: 10, dur: 18 }],
        playerPos: [k(0, 0.24, 'guard', 1), k(14, 0.24, 'point', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.70, startFrame: 10, fadeIn: 8 }],
        extraFigures: [fig(PHASE, [k(0, 0.58, 'stance', -1, { alpha: 0 }), k(16, 0.58, 'brace', -1, { alpha: 0 }), k(18, 0.58, 'brace', -1, { alpha: 1 }), k(50, 0.58, 'stance', -1, { alpha: 1 })])],
        effects: [{ type: 'energy_burst', cx: 0.58, cy: 0.54, color: '#cc88ff', startFrame: 18, duration: 26 }],
      }),
      cont({
        // "It tracks intent. The difference is important."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.52, cy: 0.60 }, { at: 80, zoom: 1.20, cx: 0.44, cy: 0.54 }],
        playerPos: [k(0, 0.24, 'point', 1), k(40, 0.24, 'stance', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.55 }],
        extraFigures: [stand(PHASE, 0.58, 'stance', -1), fadeIn('#7a22c0', 0.74, 'stance', -1, 120, 124)],
        bubbleX: 0.32,
      }),
    ],
  };

  // Chapter 97: Shadow Warden
  var WARDEN = '#9900ff', WARDEN_X = 0.70;
  S[97] = {
    bg: 'city',
    npcColor: WARDEN,
    beats: [
      L({
        // The Shadow Warden had never been found. An empty court.
        camAnim: [{ at: 0, zoom: 1.05, cx: 0.50, cy: 0.48 }, { at: 120, zoom: 1.15, cx: 0.44, cy: 0.52 }],
        playerPos: [walk(0, 0.18, 1), k(90, 0.32, 'look', 1)],
        npcPos: [k(0, WARDEN_X, 'idle', -1, { alpha: 0 })],
      }),
      cont({
        // Not strength. Not speed. No one had ever located it.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.44, cy: 0.52 }, { at: 200, zoom: 1.10, cx: 0.56, cy: 0.50 }],
        playerPos: [k(0, 0.32, 'look', 1), k(60, 0.32, 'look', -1), k(120, 0.32, 'look', 1), k(170, 0.32, 'hands', 1)],
        npcPos: [k(0, WARDEN_X, 'idle', -1, { alpha: 0 })],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.40, startFrame: 170, fadeIn: 20 }],
      }),
      cont({
        // You had.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.56, cy: 0.50 }, { at: 16, zoom: 1.45, cx: WARDEN_X, cy: 0.62 }],
        camShake: [{ at: 12, strength: 10, dur: 18 }],
        playerPos: [k(0, 0.32, 'hands', 1), k(8, 0.32, 'point', 1)],
        npcPos: [k(0, WARDEN_X, 'idle', -1, { alpha: 0 }), k(10, WARDEN_X, 'brace', -1, { alpha: 0 }), k(12, WARDEN_X, 'brace', -1, { alpha: 1 }), k(40, WARDEN_X, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.75, fadeIn: 6 }],
        effects: [{ type: 'energy_burst', cx: WARDEN_X, cy: 0.54, color: '#cc66ff', startFrame: 12, duration: 26 }],
      }),
      cont({
        // "That is new."
        camAnim: [{ at: 0, zoom: 1.45, cx: WARDEN_X, cy: 0.62 }, { at: 60, zoom: 1.50, cx: WARDEN_X, cy: 0.63 }],
        playerPos: [k(0, 0.32, 'point', 1), k(30, 0.32, 'stance', 1)],
        npcPos: [k(0, WARDEN_X, 'idle', -1), k(10, WARDEN_X, 'talk', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.45 }],
      }),
      cont({
        // It sounded almost interested. It steps closer to look.
        camAnim: [{ at: 0, zoom: 1.50, cx: WARDEN_X, cy: 0.63 }, { at: 100, zoom: 1.20, cx: 0.48, cy: 0.54 }],
        playerPos: [k(0, 0.32, 'stance', 1)],
        npcPos: [k(0, WARDEN_X, 'talk', -1), walk(20, WARDEN_X, -1), k(60, 0.62, 'look', -1), k(110, 0.62, 'stance', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.40 }],
      }),
    ],
  };

  // ── Titan World ────────────────────────────────────────────────────────────────

  // Chapter 99: The Outer Throne
  var TITAN = '#cc7700';
  function titans(o) {
    return [0.58, 0.72, 0.86].map(function (x, i) {
      return stand(['#cc7700', '#b06600', '#dd8811'][i], x, 'stance', -1, Object.assign({ scale: 1.65 }, o || {}));
    });
  }
  S[99] = {
    bg: 'city',
    npcColor: FALLEN,
    beats: [
      L({
        // Three of them between the Outer Plain and the Throne.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.86, cy: 0.42 }, { at: 160, zoom: 1.20, cx: 0.56, cy: 0.42, ease: 'linear' }, { at: 230, zoom: 1.00, cx: 0.50, cy: 0.46 }],
        playerPos: [walk(0, 0.08, 1), k(120, 0.24, 'lookUp', 1)],
        npcPos: NO_NPC,
        extraFigures: titans(),
      }),
      cont({
        // The largest things you've faced. Low camera, Kael small.
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.46 }, { at: 120, zoom: 1.30, cx: 0.34, cy: 0.66 }],
        playerPos: [k(0, 0.24, 'lookUp', 1), k(150, 0.24, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: titans(),
      }),
      cont({
        // "They will try to move you first." The first one steps in.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.34, cy: 0.66 }, { at: 220, zoom: 1.10, cx: 0.48, cy: 0.50 }],
        camShake: [{ at: 250, strength: 10, dur: 16 }, { at: 290, strength: 10, dur: 16 }],
        playerPos: [k(0, 0.24, 'stance', 1), k(260, 0.24, 'brace', 1), k(300, 0.24, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig('#cc7700', [k(0, 0.58, 'stance', -1, { scale: 1.65 }), walk(230, 0.58, -1, { scale: 1.65 }), k(300, 0.50, 'stance', -1, { scale: 1.65 })]),
                       stand('#b06600', 0.72, 'stance', -1, { scale: 1.65 }), stand('#dd8811', 0.86, 'stance', -1, { scale: 1.65 })],
        bubbleX: 0.32,
      }),
    ],
  };

  // Chapter 101: Titan King
  var KING = '#ffaa00', KING_X = 0.68;
  S[101] = {
    bg: 'city',
    npcColor: KING,
    beats: [
      L({
        // It had never acknowledged a threat smaller than itself.
        camAnim: [{ at: 0, zoom: 1.30, cx: KING_X, cy: 0.56 }, { at: 140, zoom: 1.10, cx: 0.54, cy: 0.50 }],
        playerPos: [k(0, 0.06, 'walk', 1, { alpha: 0 })],
        npcPos: [k(0, KING_X, 'kneel', -1, { scale: 1.9 })],
      }),
      cont({
        // He walks onto the plateau. It doesn't move. It watches.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.54, cy: 0.50 }, { at: 160, zoom: 1.15, cx: 0.48, cy: 0.52 }],
        playerPos: [walk(0, 0.08, 1, { alpha: 1 }), k(120, 0.30, 'lookUp', 1)],
        npcPos: [k(0, KING_X, 'kneel', -1, { scale: 1.9 }), k(90, KING_X, 'look', -1, { scale: 1.9 }), k(110, KING_X, 'kneel', -1, { scale: 1.9 })],
      }),
      cont({
        // "I do not fight tools."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.48, cy: 0.52 }, { at: 60, zoom: 1.35, cx: KING_X, cy: 0.56 }],
        playerPos: [k(0, 0.30, 'lookUp', 1)],
        npcPos: [k(0, KING_X, 'kneel', -1, { scale: 1.9 }), k(160, KING_X, 'kneel', 1, { scale: 1.9 })],
      }),
      cont({
        // "I'm not a tool," you said.
        camAnim: [{ at: 0, zoom: 1.35, cx: KING_X, cy: 0.56 }, { at: 30, zoom: 1.50, cx: 0.32, cy: 0.64 }],
        playerPos: [k(0, 0.30, 'lookUp', 1), k(10, 0.30, 'stance', 1)],
        npcPos: [k(0, KING_X, 'kneel', 1, { scale: 1.9 })],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.55, startFrame: 10, fadeIn: 16 }],
      }),
      cont({
        // It stood up.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.32, cy: 0.64 }, { at: 20, zoom: 1.00, cx: 0.52, cy: 0.46 }, { at: 120, zoom: 1.05, cx: 0.52, cy: 0.48 }],
        camShake: [{ at: 30, strength: 16, dur: 30 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(32, 0.30, 'brace', 1), k(70, 0.30, 'stance', 1)],
        npcPos: [k(0, KING_X, 'kneel', 1, { scale: 1.9 }), k(14, KING_X, 'kneel', -1, { scale: 1.9 }), k(40, KING_X, 'stance', -1, { scale: 2.1 })],
        effects: [{ type: 'shockwave', cx: KING_X, cy: 0.66, color: KING, startFrame: 32, duration: 34 }, { type: 'ground_crack', cx: KING_X, color: '#ffbb44', startFrame: 32, duration: 40 }],
      }),
    ],
  };

  // ── Null Space ─────────────────────────────────────────────────────────────────

  // Chapter 105: The Pattern Gap
  var NULL = '#9900cc', NULL_X = 0.66;
  // Faint catalogued beings flickering around Null.
  function catalogue(t0, n) {
    var out = [];
    for (var i = 0; i < (n || 6); i++) {
      var x = 0.48 + (i * 0.083) % 0.46, t = t0 + i * 16;
      out.push(fig(['#557799', '#776655', '#665577', '#556655'][i % 4], [
        k(0, x, ['stance', 'guard', 'idle', 'look'][i % 4], i % 2 ? 1 : -1, { alpha: 0 }),
        k(t, x, ['stance', 'guard', 'idle', 'look'][i % 4], i % 2 ? 1 : -1, { alpha: 0 }),
        k(t + 8, x, ['stance', 'guard', 'idle', 'look'][i % 4], i % 2 ? 1 : -1, { alpha: 0.22 }),
        k(t + 40, x, ['stance', 'guard', 'idle', 'look'][i % 4], i % 2 ? 1 : -1, { alpha: 0 }),
      ]));
    }
    return out;
  }
  S[105] = {
    bg: 'level', level: { ch: 104, x: 4150 },
    npcColor: NULL,
    beats: [
      L({
        // Null materialised in a space that had briefly stopped shifting.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.50 }, { at: 120, zoom: 1.20, cx: 0.58, cy: 0.54 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: [k(0, NULL_X, 'idle', -1, { alpha: 0 }), k(30, NULL_X, 'idle', -1, { alpha: 0 }), k(80, NULL_X, 'idle', -1, { alpha: 1 })],
        effects: [{ type: 'static_noise', alpha: 0.30, startFrame: 30, duration: 50 }],
      }),
      cont({
        // No face. Exactly as large as it needed to be.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.58, cy: 0.54 }, { at: 60, zoom: 1.60, cx: NULL_X, cy: 0.66 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: [k(0, NULL_X, 'idle', -1)],
      }),
      cont({
        // "847 beings." They flicker past.
        camAnim: [{ at: 0, zoom: 1.60, cx: NULL_X, cy: 0.66 }, { at: 40, zoom: 1.15, cx: 0.60, cy: 0.52 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1)],
        extraFigures: catalogue(30, 8),
      }),
      cont({
        // "My model began producing errors."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.60, cy: 0.52 }, { at: 60, zoom: 1.30, cx: 0.50, cy: 0.56 }],
        playerPos: [k(0, 0.30, 'look', 1), k(100, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1), k(120, NULL_X, 'look', -1)],
        effects: [{ type: 'static_noise', alpha: 0.30, startFrame: 60, duration: 20 }, { type: 'static_noise', alpha: 0.30, startFrame: 140, duration: 20 }],
      }),
      cont({
        // "Not in 4,200 years."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.50, cy: 0.56 }, { at: 60, zoom: 1.45, cx: NULL_X, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'look', -1), k(20, NULL_X, 'hands', -1)],
      }),
      cont({
        // "The fragment you carry is the source."
        camAnim: [{ at: 0, zoom: 1.45, cx: NULL_X, cy: 0.62 }, { at: 60, zoom: 1.40, cx: 0.34, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(70, 0.30, 'hands', 1)],
        npcPos: [k(0, NULL_X, 'hands', -1), k(14, NULL_X, 'point', -1), k(150, NULL_X, 'talk', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.60, startFrame: 50, fadeIn: 20 }],
      }),
      cont({
        // "That is not a situation I have ever been in." It steps back.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.34, cy: 0.62 }, { at: 80, zoom: 1.15, cx: 0.50, cy: 0.52 }],
        playerPos: [k(0, 0.30, 'hands', 1), k(50, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1), walk(30, NULL_X, 1), k(60, NULL_X + 0.05, 'idle', 1), k(76, NULL_X + 0.05, 'look', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.45 }],
      }),
    ],
  };

  // Chapter 106: The Unseen Pattern
  // Null speaks; the Pattern Construct is the fight's opponent and appears last.
  var CONSTRUCT = '#6600aa';
  S[106] = {
    bg: 'space',
    npcColor: NULL,
    beats: [
      L({
        // "Every being I have catalogued fought with their eyes."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.52 }, { at: 300, zoom: 1.30, cx: 0.60, cy: 0.58 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1), k(150, NULL_X, 'point', -1), k(220, NULL_X, 'talk', -1)],
        extraFigures: catalogue(60, 5),
      }),
      cont({
        // "I am going to take it from you." The light drains.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.58 }, { at: 40, zoom: 1.45, cx: 0.34, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(40, 0.30, 'guard', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1), k(30, NULL_X, 'reach', -1)],
        effectsBehind: [{ type: 'smoke', alpha: 0.70, startFrame: 20, fadeIn: 40 }],
      }),
      cont({
        // "Not as cruelty. As method."
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.34, cy: 0.62 }, { at: 60, zoom: 1.20, cx: 0.50, cy: 0.54 }],
        playerPos: [k(0, 0.30, 'guard', 1)],
        npcPos: [k(0, NULL_X, 'reach', -1), k(30, NULL_X, 'talk', -1), k(240, NULL_X, 'hands', -1)],
        effectsBehind: [{ type: 'smoke', alpha: 0.75 }],
      }),
      cont({
        // Null set a lantern on the ground between them.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.50, cy: 0.54 }, { at: 70, zoom: 1.50, cx: 0.50, cy: 0.66 }],
        playerPos: [k(0, 0.30, 'guard', 1), k(90, 0.30, 'look', 1)],
        npcPos: [k(0, NULL_X, 'hands', -1), walk(10, NULL_X, -1), k(50, 0.56, 'crouch', -1), k(110, 0.56, 'idle', -1)],
        effectsBehind: [{ type: 'smoke', alpha: 0.75 }, { type: 'objective_marker', xf: 0.50, yf: 0.70, color: '#ffdd88', alpha: 0.90, startFrame: 60, fadeIn: 20 }],
      }),
      cont({
        // "It shows you where the space is wrong." The sweep.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.50, cy: 0.66 }, { at: 60, zoom: 1.15, cx: 0.50, cy: 0.52 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: [k(0, 0.56, 'idle', -1), k(40, 0.56, 'talk', -1)],
        effectsBehind: [{ type: 'smoke', alpha: 0.75 }, { type: 'objective_marker', xf: 0.50, yf: 0.70, color: '#ffdd88', alpha: 0.90 }],
        effects: [40, 140, 240].map(function (t) { return { type: 'shockwave', cx: 0.50, cy: 0.70, color: '#ffdd88', startFrame: t, duration: 60, alpha: 0.6 }; }),
        extraFigures: [fig(CONSTRUCT, [k(0, 0.78, 'stance', -1, { alpha: 0 }), k(70, 0.78, 'stance', -1, { alpha: 0 }), k(78, 0.78, 'stance', -1, { alpha: 0.45 }), k(110, 0.78, 'stance', -1, { alpha: 0 }),
                                        k(170, 0.72, 'stance', -1, { alpha: 0 }), k(178, 0.72, 'stance', -1, { alpha: 0.45 }), k(210, 0.72, 'stance', -1, { alpha: 0 })])],
      }),
      cont({
        // "The information will be old the moment you have it."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.52 }, { at: 60, zoom: 1.35, cx: 0.56, cy: 0.60 }],
        playerPos: [k(0, 0.30, 'look', 1), k(100, 0.30, 'stance', 1)],
        npcPos: [k(0, 0.56, 'talk', -1)],
        effectsBehind: [{ type: 'smoke', alpha: 0.75 }, { type: 'objective_marker', xf: 0.50, yf: 0.70, color: '#ffdd88', alpha: 0.90 }],
      }),
      cont({
        // "Show me what you treat it as." Null withdraws; the construct waits.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.56, cy: 0.60 }, { at: 80, zoom: 1.15, cx: 0.52, cy: 0.52 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, 0.56, 'talk', -1), k(30, 0.56, 'idle', -1, { alpha: 1 }), k(70, 0.56, 'idle', -1, { alpha: 0 })],
        effectsBehind: [{ type: 'smoke', alpha: 0.75 }, { type: 'objective_marker', xf: 0.50, yf: 0.70, color: '#ffdd88', alpha: 0.90 }],
        extraFigures: [fig(CONSTRUCT, [k(0, 0.74, 'stance', -1, { alpha: 0 }), k(60, 0.74, 'stance', -1, { alpha: 0 }), k(70, 0.74, 'stance', -1, { alpha: 0.35 })])],
      }),
    ],
  };

  // Chapter 107: Null
  S[107] = {
    bg: 'space',
    npcColor: NULL,
    beats: [
      L({
        // "You are not following established behavior."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.52 }, { at: 400, zoom: 1.30, cx: 0.60, cy: 0.58 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1), k(180, NULL_X, 'hands', -1), k(300, NULL_X, 'point', -1)],
        effects: [{ type: 'static_noise', alpha: 0.22, startFrame: 300, duration: 24 }],
      }),
      cont({
        // "A signature. Habits they return to under pressure."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.58 }, { at: 200, zoom: 1.15, cx: 0.56, cy: 0.50 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1)],
        extraFigures: catalogue(40, 6),
      }),
      cont({
        // "You do not return to anything."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.56, cy: 0.50 }, { at: 30, zoom: 1.55, cx: 0.32, cy: 0.66 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.55, startFrame: 20, fadeIn: 20 }],
      }),
      cont({
        // "All 847 entries. All 4,200 years. Against you." They stand up behind it.
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.32, cy: 0.66 }, { at: 50, zoom: 1.05, cx: 0.58, cy: 0.48 }],
        camShake: [{ at: 260, strength: 10, dur: 20 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'talk', -1), k(230, NULL_X, 'stance', -1)],
        extraFigures: [0.74, 0.80, 0.86, 0.92, 0.98].map(function (x, i) {
          return fadeIn(['#557799', '#776655', '#665577', '#556655', '#665566'][i], x, 'stance', -1, 120 + i * 20, 160 + i * 20, 0.28);
        }),
      }),
      cont({
        // "Show me what a pattern gap looks like when it fights."
        camAnim: [{ at: 0, zoom: 1.05, cx: 0.58, cy: 0.48 }, { at: 60, zoom: 1.25, cx: 0.50, cy: 0.56 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, NULL_X, 'stance', -1), walk(20, NULL_X, -1), k(60, 0.60, 'stance', -1)],
        extraFigures: [0.74, 0.80, 0.86, 0.92, 0.98].map(function (x, i) {
          return fig(['#557799', '#776655', '#665577', '#556655', '#665566'][i], [k(0, x, 'stance', -1, { alpha: 0.28 }), k(60, x, 'stance', -1, { alpha: 0 })]);
        }),
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.55 }],
      }),
    ],
  };

  // ── Quiet Expanse ──────────────────────────────────────────────────────────────

  // Chapter 110: The Pull
  var SERAPH = '#00aacc', SER_X = 0.66;
  S[110] = {
    bg: 'level', level: { ch: 112, x: 2800 },
    npcColor: SERAPH,
    beats: [
      L({
        // The fragment was pulling. He staggers.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.30, cy: 0.62 }, { at: 100, zoom: 1.25, cx: 0.34, cy: 0.58 }],
        camShake: [{ at: 20, strength: 6, dur: 16 }],
        playerPos: [k(0, 0.28, 'look', 1), k(20, 0.29, 'brace', 1), k(60, 0.29, 'hands', 1)],
        npcPos: [k(0, SER_X, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.65, startFrame: 18, fadeIn: 12 }],
      }),
      cont({
        // Toward Seraph — like water toward a drain.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.34, cy: 0.58 }, { at: 140, zoom: 1.15, cx: 0.50, cy: 0.52 }],
        playerPos: [k(0, 0.29, 'hands', 1), walk(20, 0.29, 1), k(110, 0.40, 'brace', 1)],
        npcPos: [k(0, SER_X, 'idle', -1), k(90, SER_X, 'look', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.65 }],
        effects: [{ type: 'speedlines', cx: SER_X, cy: 0.52, count: 20, color: '#66ddee', alpha: 0.40, startFrame: 20, duration: 100, fadeIn: 16 }],
      }),
      cont({
        // "It has been a long time since anything responded to me."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.52 }, { at: 60, zoom: 1.35, cx: 0.60, cy: 0.60 }],
        playerPos: [k(0, 0.40, 'brace', 1), k(60, 0.40, 'stance', 1)],
        npcPos: [k(0, SER_X, 'look', -1), k(10, SER_X, 'talk', -1), k(120, SER_X, 'hands', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: SERAPH, alpha: 0.40, fadeIn: 30 }],
      }),
      cont({
        // "Close enough to respond."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.60, cy: 0.60 }, { at: 400, zoom: 1.25, cx: 0.54, cy: 0.56 }],
        playerPos: [k(0, 0.40, 'stance', 1), k(200, 0.40, 'listen', 1)],
        npcPos: [k(0, SER_X, 'hands', -1), k(60, SER_X, 'talk', -1), k(300, SER_X, 'reach', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: SERAPH, alpha: 0.40 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.40, startFrame: 300, fadeIn: 20 }],
      }),
      cont({
        // "I am not doing that again." Seraph steps away.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.54, cy: 0.56 }, { at: 200, zoom: 1.20, cx: 0.56, cy: 0.54 }],
        playerPos: [k(0, 0.40, 'listen', 1)],
        npcPos: [k(0, SER_X, 'reach', -1), k(20, SER_X, 'talk', -1), walk(80, SER_X, 1), k(130, SER_X + 0.08, 'talk', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: SERAPH, alpha: 0.30 }],
      }),
      cont({
        // "And what it feels like from outside."
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.56, cy: 0.54 }, { at: 120, zoom: 1.35, cx: 0.44, cy: 0.60 }],
        playerPos: [k(0, 0.40, 'listen', 1), k(80, 0.40, 'hands', 1)],
        npcPos: [k(0, SER_X + 0.08, 'talk', -1), k(140, SER_X + 0.08, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.50, startFrame: 80, fadeIn: 20 }],
      }),
    ],
  };

  // Chapter 112: Seraph
  S[112] = {
    bg: 'level', level: { ch: 112, x: 2800 },
    npcColor: SERAPH,
    beats: [
      L({
        // "I keep taking things. I don't mean to."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.52 }, { at: 280, zoom: 1.35, cx: 0.62, cy: 0.60 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, SER_X, 'hands', -1), k(60, SER_X, 'talk', -1), k(220, SER_X, 'look', 1)],
      }),
      cont({
        // "For exactly as long as this fight lasts."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.62, cy: 0.60 }, { at: 440, zoom: 1.25, cx: 0.54, cy: 0.56 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(250, 0.30, 'listen', 1)],
        npcPos: [k(0, SER_X, 'look', 1), k(20, SER_X, 'talk', -1), k(260, SER_X, 'hands', -1), k(380, SER_X, 'stance', -1)],
      }),
      cont({
        // "You held still while everything pulled inward."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.54, cy: 0.56 }, { at: 60, zoom: 1.45, cx: 0.34, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'listen', 1), k(70, 0.30, 'stance', 1)],
        npcPos: [k(0, SER_X, 'stance', -1), k(10, SER_X, 'talk', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.55, startFrame: 70, fadeIn: 20 }],
      }),
      cont({
        // "One more time. Before you go."
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.34, cy: 0.62 }, { at: 60, zoom: 1.15, cx: 0.50, cy: 0.52 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, SER_X, 'talk', -1), walk(30, SER_X, -1), k(70, 0.60, 'stance', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.45 }, { type: 'fragment_pulse', color: SERAPH, alpha: 0.35, startFrame: 70, fadeIn: 16 }],
      }),
    ],
  };

  // ── Fracture Coast ─────────────────────────────────────────────────────────────

  // Chapter 116: The Blind Spot
  // VAEL stands where three temporal layers cross: two faint copies sit slightly
  // ahead of and behind them in time.
  var VAEL = '#0055ff', VAEL_X = 0.66;
  function layers(a, o) {
    return [stand(VAEL, VAEL_X - 0.065, 'stance', -1, Object.assign({ alpha: a }, o || {})),
            stand(VAEL, VAEL_X + 0.065, 'idle', -1, Object.assign({ alpha: a }, o || {}))];
  }
  S[116] = {
    bg: 'level', level: { ch: 118, x: 3000 },
    npcColor: VAEL,
    beats: [
      L({
        // VAEL stood where three temporal layers intersected.
        camAnim: [{ at: 0, zoom: 1.40, cx: VAEL_X, cy: 0.60 }, { at: 120, zoom: 1.15, cx: 0.52, cy: 0.52 }],
        playerPos: [walk(0, 0.12, 1), k(100, 0.30, 'look', 1)],
        npcPos: [k(0, VAEL_X, 'idle', -1)],
        extraFigures: layers(0.22),
      }),
      cont({
        // Waiting in the same spot a very long time.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.52, cy: 0.52 }, { at: 260, zoom: 1.30, cx: 0.60, cy: 0.58 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: [k(0, VAEL_X, 'idle', -1), k(150, VAEL_X, 'look', -1)],
        extraFigures: layers(0.22),
      }),
      cont({
        // "I see how the conversation ends before it begins." The layers run ahead.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.58 }, { at: 360, zoom: 1.25, cx: 0.56, cy: 0.56 }],
        playerPos: [k(0, 0.30, 'look', 1), k(200, 0.30, 'listen', 1)],
        npcPos: [k(0, VAEL_X, 'look', -1), k(14, VAEL_X, 'talk', -1)],
        extraFigures: [
          fig(VAEL, [k(0, VAEL_X - 0.065, 'stance', -1, { alpha: 0.22 }), k(100, VAEL_X - 0.065, 'talk', -1, { alpha: 0.30 }), k(220, VAEL_X - 0.065, 'point', -1, { alpha: 0.30 })]),
          fig(VAEL, [k(0, VAEL_X + 0.065, 'idle', -1, { alpha: 0.22 }), k(140, VAEL_X + 0.065, 'hands', -1, { alpha: 0.30 })]),
        ],
      }),
      cont({
        // "I ran yours. I got nothing." The layers go blank.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.56, cy: 0.56 }, { at: 80, zoom: 1.40, cx: 0.62, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'listen', 1)],
        npcPos: [k(0, VAEL_X, 'talk', -1), k(160, VAEL_X, 'look', -1)],
        extraFigures: [
          fig(VAEL, [k(0, VAEL_X - 0.065, 'point', -1, { alpha: 0.30 }), k(70, VAEL_X - 0.065, 'point', -1, { alpha: 0.30 }), k(76, VAEL_X - 0.065, 'point', -1, { alpha: 0 })]),
          fig(VAEL, [k(0, VAEL_X + 0.065, 'hands', -1, { alpha: 0.30 }), k(70, VAEL_X + 0.065, 'hands', -1, { alpha: 0.30 }), k(76, VAEL_X + 0.065, 'hands', -1, { alpha: 0 })]),
        ],
        effects: [{ type: 'static_noise', alpha: 0.35, startFrame: 70, duration: 30 }],
      }),
      cont({
        // "It carries something my sight cannot penetrate."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.62, cy: 0.62 }, { at: 60, zoom: 1.40, cx: 0.34, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'listen', 1), k(60, 0.30, 'hands', 1)],
        npcPos: [k(0, VAEL_X, 'look', -1), k(10, VAEL_X, 'point', -1), k(110, VAEL_X, 'talk', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.60, startFrame: 50, fadeIn: 20 }],
      }),
      cont({
        // "I don't know what to do with that."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.34, cy: 0.62 }, { at: 80, zoom: 1.40, cx: 0.62, cy: 0.62 }, { at: 400, zoom: 1.30, cx: 0.56, cy: 0.58 }],
        playerPos: [k(0, 0.30, 'hands', 1), k(80, 0.30, 'stance', 1)],
        npcPos: [k(0, VAEL_X, 'talk', -1), k(200, VAEL_X, 'lookUp', -1), k(330, VAEL_X, 'hands', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.40 }],
      }),
    ],
  };

  // Chapter 117: Thirty-Four Frames
  // The Standing Tide is a water copy of Kael that repeats him a half-second late.
  var TIDE = '#2266cc', TIDE_X = 0.50;
  S[117] = {
    bg: 'ice',
    npcColor: VAEL,
    beats: [
      L({
        // "So I stopped looking forward."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.52, cy: 0.52 }, { at: 220, zoom: 1.30, cx: 0.66, cy: 0.58 }],
        playerPos: [k(0, 0.28, 'stance', 1)],
        npcPos: [k(0, 0.78, 'talk', -1), k(140, 0.78, 'look', 1)],
      }),
      cont({
        // "Your future is blank. Your past is not."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.66, cy: 0.58 }, { at: 240, zoom: 1.25, cx: 0.56, cy: 0.56 }],
        playerPos: [k(0, 0.28, 'stance', 1)],
        npcPos: [k(0, 0.78, 'look', 1), k(14, 0.78, 'talk', -1), k(140, 0.78, 'point', -1)],
      }),
      cont({
        // The water stood up and took your shape.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.56, cy: 0.56 }, { at: 30, zoom: 1.40, cx: 0.42, cy: 0.62 }],
        camShake: [{ at: 40, strength: 8, dur: 22 }],
        playerPos: [k(0, 0.28, 'stance', 1), k(44, 0.28, 'brace', 1), k(80, 0.28, 'guard', 1)],
        npcPos: [k(0, 0.78, 'point', -1), k(40, 0.78, 'idle', -1)],
        extraFigures: [fig(TIDE, [k(0, TIDE_X, 'crouch', -1, { alpha: 0 }), k(30, TIDE_X, 'crouch', -1, { alpha: 0.4 }), k(70, TIDE_X, 'stance', -1, { alpha: 0.75 })])],
        effects: [{ type: 'shockwave', cx: TIDE_X, cy: 0.66, color: '#66aaff', startFrame: 36, duration: 30 }],
      }),
      cont({
        // "Everything you do, it will do, a heartbeat later, reversed."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.42, cy: 0.62 }, { at: 240, zoom: 1.30, cx: 0.40, cy: 0.58 }],
        playerPos: [k(0, 0.28, 'guard', 1), k(60, 0.28, 'stance', 1), k(120, 0.28, 'point', 1), k(180, 0.28, 'guard', 1)],
        npcPos: [k(0, 0.78, 'talk', -1)],
        extraFigures: [fig(TIDE, [k(0, TIDE_X, 'stance', -1, { alpha: 0.75 }), k(30, TIDE_X, 'guard', -1, { alpha: 0.75 }), k(90, TIDE_X, 'stance', -1, { alpha: 0.75 }), k(150, TIDE_X, 'point', -1, { alpha: 0.75 }), k(210, TIDE_X, 'guard', -1, { alpha: 0.75 })])],
      }),
      cont({
        // "You can only be someone you were not, half a second ago."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.40, cy: 0.58 }, { at: 400, zoom: 1.20, cx: 0.52, cy: 0.54 }],
        playerPos: [k(0, 0.28, 'guard', 1), k(200, 0.28, 'hands', 1), k(320, 0.28, 'stance', 1)],
        npcPos: [k(0, 0.78, 'talk', -1)],
        extraFigures: [fig(TIDE, [k(0, TIDE_X, 'guard', -1, { alpha: 0.75 }), k(230, TIDE_X, 'hands', -1, { alpha: 0.75 }), k(350, TIDE_X, 'stance', -1, { alpha: 0.75 })])],
      }),
      cont({
        // "I have never watched anyone try."
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.52, cy: 0.54 }, { at: 60, zoom: 1.40, cx: 0.74, cy: 0.62 }, { at: 120, zoom: 1.15, cx: 0.50, cy: 0.52 }],
        playerPos: [k(0, 0.28, 'stance', 1)],
        npcPos: [k(0, 0.78, 'talk', -1), k(60, 0.78, 'look', -1)],
        extraFigures: [stand(TIDE, TIDE_X, 'stance', -1, { alpha: 0.75 })],
      }),
    ],
  };

  // Chapter 118: VAEL
  S[118] = {
    bg: 'level', level: { ch: 118, x: 3000 },
    npcColor: VAEL,
    beats: [
      L({
        // "I know the swing before the arm moves." Their future-self moves first.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.52 }, { at: 360, zoom: 1.30, cx: 0.60, cy: 0.58 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, VAEL_X, 'talk', -1), k(130, VAEL_X, 'guard', -1), k(200, VAEL_X, 'talk', -1)],
        extraFigures: [fig(VAEL, [k(0, VAEL_X - 0.065, 'talk', -1, { alpha: 0.25 }), k(100, VAEL_X - 0.065, 'guard', -1, { alpha: 0.25 }), k(170, VAEL_X - 0.065, 'talk', -1, { alpha: 0.25 })])],
      }),
      cont({
        // "Against you — I see nothing. Blank."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.58 }, { at: 60, zoom: 1.45, cx: 0.64, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, VAEL_X, 'talk', -1), k(120, VAEL_X, 'look', -1)],
        extraFigures: [fig(VAEL, [k(0, VAEL_X - 0.065, 'talk', -1, { alpha: 0.25 }), k(30, VAEL_X - 0.065, 'talk', -1, { alpha: 0.25 }), k(38, VAEL_X - 0.065, 'talk', -1, { alpha: 0 })])],
        effects: [{ type: 'static_noise', alpha: 0.30, startFrame: 30, duration: 26 }],
      }),
      cont({
        // "I am fighting you entirely in the present."
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.64, cy: 0.62 }, { at: 240, zoom: 1.25, cx: 0.54, cy: 0.56 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, VAEL_X, 'look', -1), k(14, VAEL_X, 'talk', -1), k(130, VAEL_X, 'hands', -1)],
      }),
      cont({
        // "Show me what it is like."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.54, cy: 0.56 }, { at: 60, zoom: 1.15, cx: 0.50, cy: 0.52 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, VAEL_X, 'hands', -1), k(14, VAEL_X, 'talk', -1), walk(80, VAEL_X, -1), k(120, 0.60, 'stance', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.50, startFrame: 120, fadeIn: 16 }],
      }),
    ],
  };

  // ── Collision Realm ────────────────────────────────────────────────────────────

  // Chapter 122: Thresh
  var THRESH = '#ff4400', TH_X = 0.66;
  S[122] = {
    bg: 'fracture',
    npcColor: THRESH,
    beats: [
      L({
        // "I remember being strong. Before the void."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.52 }, { at: 200, zoom: 1.30, cx: 0.60, cy: 0.58 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, TH_X, 'hands', -1, { scale: 1.3 }), k(80, TH_X, 'talk', -1, { scale: 1.3 })],
      }),
      cont({
        // "Exactly the amount of force required."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.58 }, { at: 280, zoom: 1.30, cx: 0.62, cy: 0.58 }],
        playerPos: [k(0, 0.30, 'stance', 1)],
        npcPos: [k(0, TH_X, 'talk', -1, { scale: 1.3 }), k(120, TH_X, 'attack', -1, { scale: 1.3 }), k(160, TH_X, 'talk', -1, { scale: 1.3 })],
      }),
      cont({
        // "It broke the dial." He clenches; the floor cracks under him.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.62, cy: 0.58 }, { at: 40, zoom: 1.45, cx: TH_X, cy: 0.64 }],
        camShake: [{ at: 60, strength: 12, dur: 22 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(62, 0.30, 'brace', 1), k(100, 0.30, 'stance', 1)],
        npcPos: [k(0, TH_X, 'talk', -1, { scale: 1.3 }), k(50, TH_X, 'hands', -1, { scale: 1.3 })],
        effects: [{ type: 'ground_crack', cx: TH_X, color: '#ff6622', startFrame: 58, duration: 60 }],
      }),
      cont({
        // "Everything I tried to protect." The others, faint, broken.
        camAnim: [{ at: 0, zoom: 1.45, cx: TH_X, cy: 0.64 }, { at: 80, zoom: 1.10, cx: 0.60, cy: 0.50 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(200, 0.30, 'listen', 1)],
        npcPos: [k(0, TH_X, 'hands', -1, { scale: 1.3 }), k(40, TH_X, 'talk', -1, { scale: 1.3 }), k(200, TH_X, 'look', 1, { scale: 1.3 })],
        extraFigures: [0.80, 0.88].map(function (x, i) { return fadeIn(['#00aacc', '#9900cc'][i], x, 'kneel', -1, 140 + i * 40, 180 + i * 40, 0.22); }),
        effects: [{ type: 'ground_crack', cx: TH_X, color: '#ff6622', startFrame: -60, duration: 60 }],
      }),
      cont({
        // "What my grief looks like when it has nowhere to go."
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.60, cy: 0.50 }, { at: 240, zoom: 1.30, cx: 0.48, cy: 0.58 }],
        playerPos: [k(0, 0.30, 'listen', 1), k(130, 0.30, 'look', 1)],
        npcPos: [k(0, TH_X, 'look', 1, { scale: 1.3 }), k(30, TH_X, 'talk', -1, { scale: 1.3 })],
        effectsBehind: [{ type: 'fire_glow', intensity: 0.45, alpha: 0.50, fadeIn: 60 }],
      }),
      cont({
        // "I need to know if you're something that holds."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.48, cy: 0.58 }, { at: 60, zoom: 1.15, cx: 0.50, cy: 0.52 }],
        camShake: [{ at: 100, strength: 10, dur: 18 }],
        playerPos: [k(0, 0.30, 'look', 1), k(30, 0.30, 'stance', 1)],
        npcPos: [k(0, TH_X, 'talk', -1, { scale: 1.3 }), k(90, TH_X, 'stance', -1, { scale: 1.3 })],
        effectsBehind: [{ type: 'fire_glow', intensity: 0.55, alpha: 0.55 }],
        effects: [{ type: 'shockwave', cx: TH_X, cy: 0.66, color: THRESH, startFrame: 96, duration: 30 }],
      }),
    ],
  };

  // ── The figure, and Veran ─────────────────────────────────────────────────────

  // Chapter 125: The Architecture of the Lie
  var FIGURE = '#8855aa', FIG_X = 0.64;
  S[125] = {
    // The fracture boundary, by the figure's traces (ch123)
    bg: 'level', level: { ch: 123, x: 3000 },
    npcColor: FIGURE,
    beats: [
      L({
        // The figure came a third time.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.56, cy: 0.50 }, { at: 120, zoom: 1.25, cx: 0.50, cy: 0.56 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: [walk(0, 0.92, -1, { alpha: 0 }), walk(20, 0.89, -1, { alpha: 1 }), k(110, FIG_X, 'idle', -1)],
      }),
      cont({
        // "What I'm about to offer you is real."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.50, cy: 0.56 }, { at: 160, zoom: 1.35, cx: 0.58, cy: 0.60 }],
        playerPos: [k(0, 0.30, 'look', 1), k(40, 0.30, 'stance', 1)],
        npcPos: [k(0, FIG_X, 'idle', -1), k(10, FIG_X, 'talk', -1), k(100, FIG_X, 'hands', -1)],
      }),
      cont({
        // "It never did."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.58, cy: 0.60 }, { at: 140, zoom: 1.45, cx: 0.34, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(150, 0.30, 'look', 1)],
        npcPos: [k(0, FIG_X, 'hands', -1), k(14, FIG_X, 'talk', -1)],
      }),
      cont({
        // "Two anchors instead of one. You survive. The rift closes."
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.34, cy: 0.62 }, { at: 60, zoom: 1.20, cx: 0.48, cy: 0.54 }],
        playerPos: [k(0, 0.30, 'look', 1), k(400, 0.30, 'listen', 1)],
        npcPos: [k(0, FIG_X, 'talk', -1), k(110, FIG_X, 'point', -1), k(170, FIG_X, 'hands', 1), k(260, FIG_X, 'talk', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.35, startFrame: 110, fadeIn: 30 }, { type: 'fragment_pulse', color: FIGURE, alpha: 0.35, startFrame: 170, fadeIn: 30 }],
      }),
      cont({
        // "Veran knows. She has always known." She appears, faint, in the figure's telling.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.48, cy: 0.54 }, { at: 300, zoom: 1.25, cx: 0.50, cy: 0.56 }],
        playerPos: [k(0, 0.30, 'listen', 1), k(60, 0.30, 'look', 1)],
        npcPos: [k(0, FIG_X, 'talk', -1)],
        extraFigures: [fig(VERAN, [k(0, 0.46, 'idle', -1, { alpha: 0 }), k(30, 0.46, 'idle', -1, { alpha: 0 }), k(80, 0.46, 'idle', -1, { alpha: 0.30 }), k(250, 0.46, 'look', 1, { alpha: 0.30 })])],
      }),
      cont({
        // "It redirects the closure energy. Toward the bearer."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.50, cy: 0.56 }, { at: 200, zoom: 1.40, cx: 0.36, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'look', 1), k(150, 0.30, 'brace', 1)],
        npcPos: [k(0, FIG_X, 'talk', -1), k(140, FIG_X, 'point', -1)],
        extraFigures: [fig(VERAN, [k(0, 0.46, 'look', 1, { alpha: 0.30 }), k(150, 0.46, 'look', 1, { alpha: 0.30 }), k(210, 0.46, 'idle', 1, { alpha: 0 })])],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ff4466', alpha: 0.45, startFrame: 140, fadeIn: 20 }],
        effects: [{ type: 'speedlines', cx: 0.30, cy: 0.52, count: 16, color: '#ff6688', alpha: 0.40, startFrame: 140, duration: 50, fadeIn: 8 }],
      }),
      cont({
        // "You survive, or she does."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.36, cy: 0.62 }, { at: 40, zoom: 1.40, cx: 0.60, cy: 0.62 }],
        playerPos: [k(0, 0.30, 'brace', 1), k(30, 0.30, 'stance', 1)],
        npcPos: [k(0, FIG_X, 'point', -1), k(20, FIG_X, 'talk', -1), k(160, FIG_X, 'idle', -1)],
      }),
      cont({
        // Warning or grief.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.60, cy: 0.62 }, { at: 60, zoom: 1.55, cx: 0.32, cy: 0.66 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(30, 0.30, 'hands', 1)],
        npcPos: [k(0, FIG_X, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.65, startFrame: 30, fadeIn: 20 }],
      }),
    ],
  };

  // Chapter 126: The Weight of a Choice
  // Kael and Veran on the hill; the figure watches from the ridge, high and faint.
  var RIDGE = { x: 0.90, y: -0.22 };
  function ridge(a, state) { return stand(FIGURE, RIDGE.x, state || 'idle', -1, { y: RIDGE.y, alpha: a, scale: 0.8 }); }
  var V_X = 0.58;
  S[126] = {
    bg: 'ruins',
    npcColor: VERAN,
    beats: [
      L({
        // You went back anyway.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.26, cy: 0.54 }, { at: 120, zoom: 1.15, cx: 0.44, cy: 0.52 }],
        playerPos: [walk(0, 0.10, 1), k(110, 0.32, 'idle', 1)],
        npcPos: [k(0, V_X, 'idle', 1), k(70, V_X, 'look', -1)],
        extraFigures: [ridge(0.45)],
      }),
      cont({
        // "Something's wrong. Talk to me."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.44, cy: 0.52 }, { at: 60, zoom: 1.35, cx: 0.50, cy: 0.60 }],
        playerPos: [k(0, 0.32, 'idle', 1)],
        npcPos: [k(0, V_X, 'look', -1), walk(10, V_X, -1), k(40, 0.53, 'talk', -1), k(110, 0.53, 'reach', -1)],
        extraFigures: [ridge(0.45)],
      }),
      cont({
        // He says what the figure said. The final step. The protocol.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.50, cy: 0.60 }, { at: 60, zoom: 1.45, cx: 0.36, cy: 0.62 }],
        playerPos: [k(0, 0.32, 'idle', 1), k(30, 0.32, 'look', -1), k(140, 0.32, 'talk', 1)],
        npcPos: [k(0, 0.53, 'reach', -1), k(40, 0.53, 'listen', -1)],
        extraFigures: [ridge(0.45)],
      }),
      cont({
        // "You gave it to the Creator. Not the Third Architect. You."
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.36, cy: 0.62 }, { at: 40, zoom: 1.40, cx: 0.42, cy: 0.62 }],
        playerPos: [k(0, 0.32, 'talk', 1), k(60, 0.32, 'point', 1), k(140, 0.32, 'stance', 1)],
        npcPos: [k(0, 0.53, 'listen', -1), k(70, 0.53, 'brace', -1)],
        extraFigures: [ridge(0.45)],
        bubbleX: 0.36,
      }),
      cont({
        // A silence unlike any before.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.42, cy: 0.62 }, { at: 120, zoom: 1.05, cx: 0.50, cy: 0.50 }],
        playerPos: [k(0, 0.32, 'stance', 1)],
        npcPos: [k(0, 0.53, 'brace', -1), k(60, 0.53, 'idle', -1)],
        extraFigures: [ridge(0.45)],
      }),
      cont({
        // "That's not what happened. Who told you that?"
        camAnim: [{ at: 0, zoom: 1.05, cx: 0.50, cy: 0.50 }, { at: 40, zoom: 1.45, cx: 0.52, cy: 0.62 }],
        playerPos: [k(0, 0.32, 'stance', 1)],
        npcPos: [k(0, 0.53, 'idle', -1), k(10, 0.53, 'talk', -1), k(90, 0.53, 'reach', -1)],
        extraFigures: [ridge(0.45)],
      }),
      cont({
        // "It doesn't matter," you said.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.52, cy: 0.62 }, { at: 30, zoom: 1.45, cx: 0.36, cy: 0.62 }],
        playerPos: [k(0, 0.32, 'stance', 1), k(10, 0.32, 'look', -1)],
        npcPos: [k(0, 0.53, 'reach', -1)],
        extraFigures: [ridge(0.45)],
      }),
      cont({
        // "It does." She steps forward. "Just stop and listen to me."
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.36, cy: 0.62 }, { at: 40, zoom: 1.35, cx: 0.44, cy: 0.60 }],
        playerPos: [k(0, 0.32, 'look', -1), k(60, 0.32, 'look', 1)],
        npcPos: [k(0, 0.53, 'reach', -1), walk(4, 0.53, -1), k(30, 0.47, 'talk', -1), k(240, 0.47, 'reach', -1)],
        extraFigures: [ridge(0.45)],
      }),
      cont({
        // The figure was watching from the ridge.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.44, cy: 0.60 }, { at: 60, zoom: 1.40, cx: 0.86, cy: 0.42 }],
        playerPos: [k(0, 0.32, 'look', 1), k(30, 0.32, 'lookUp', 1)],
        npcPos: [k(0, 0.47, 'reach', -1)],
        extraFigures: [ridge(0.65, 'look')],
      }),
      cont({
        // "There's a variant," you said.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.86, cy: 0.42 }, { at: 40, zoom: 1.40, cx: 0.38, cy: 0.62 }],
        playerPos: [k(0, 0.32, 'lookUp', 1), k(20, 0.32, 'talk', 1)],
        npcPos: [k(0, 0.47, 'reach', -1), k(40, 0.47, 'listen', -1)],
        extraFigures: [ridge(0.65, 'look')],
      }),
      cont({
        // Veran went very still.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.38, cy: 0.62 }, { at: 30, zoom: 1.60, cx: 0.47, cy: 0.66 }],
        playerPos: [k(0, 0.32, 'talk', 1), k(20, 0.32, 'stance', 1)],
        npcPos: [k(0, 0.47, 'listen', -1), k(10, 0.47, 'idle', -1)],
        extraFigures: [ridge(0.65, 'look')],
      }),
      cont({
        // "There is no variant," she said quietly.
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.47, cy: 0.66 }, { at: 200, zoom: 1.45, cx: 0.45, cy: 0.62 }],
        playerPos: [k(0, 0.32, 'stance', 1)],
        npcPos: [k(0, 0.47, 'idle', -1), k(20, 0.47, 'talk', -1), k(160, 0.47, 'hands', -1)],
        extraFigures: [ridge(0.65, 'look')],
      }),
      cont({
        // "Someone who's watched this happen before," you said. He looks to the ridge.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.45, cy: 0.62 }, { at: 40, zoom: 1.40, cx: 0.38, cy: 0.60 }],
        playerPos: [k(0, 0.32, 'stance', 1), k(14, 0.32, 'talk', 1), k(60, 0.32, 'point', 1)],
        npcPos: [k(0, 0.47, 'hands', -1), k(70, 0.47, 'look', 1)],
        extraFigures: [ridge(0.65, 'look')],
      }),
      cont({
        // "That's not a variant. That is a lie."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.38, cy: 0.60 }, { at: 60, zoom: 1.40, cx: 0.48, cy: 0.62 }, { at: 500, zoom: 1.30, cx: 0.44, cy: 0.58 }],
        playerPos: [k(0, 0.32, 'point', 1), k(40, 0.32, 'stance', 1), k(400, 0.32, 'listen', 1)],
        npcPos: [k(0, 0.47, 'look', 1), k(14, 0.47, 'talk', -1), k(200, 0.47, 'hands', -1), k(380, 0.47, 'point', 1)],
        extraFigures: [ridge(0.65, 'look')],
      }),
      cont({
        // The fragment burned. The figure on the ridge hadn't moved.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.58 }, { at: 40, zoom: 1.40, cx: 0.86, cy: 0.42 }, { at: 100, zoom: 1.40, cx: 0.86, cy: 0.42 }, { at: 130, zoom: 1.45, cx: 0.34, cy: 0.62 }],
        playerPos: [k(0, 0.32, 'listen', 1), k(110, 0.32, 'hands', 1)],
        npcPos: [k(0, 0.47, 'point', 1)],
        extraFigures: [ridge(0.65, 'idle')],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.65, startFrame: 110, fadeIn: 16 }],
      }),
      cont({
        // You raised your weapon.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.34, cy: 0.62 }, { at: 30, zoom: 1.20, cx: 0.42, cy: 0.54 }],
        camShake: [{ at: 20, strength: 8, dur: 18 }],
        playerPos: [k(0, 0.32, 'hands', 1), k(18, 0.32, 'stance', 1)],
        npcPos: [k(0, 0.47, 'point', 1), k(24, 0.47, 'brace', -1), k(60, 0.47, 'stance', -1)],
        extraFigures: [ridge(0.65, 'idle')],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.75 }],
      }),
    ],
  };

  // Extra figures default to half opacity when a keyframe gives no alpha. Fill in
  // full opacity for figures that are physically present.
  [86, 87, 89, 90, 91, 93, 94, 95, 97, 99, 101, 105, 106, 107, 110, 112, 116, 117, 118, 122, 125, 126].forEach(function (id) {
    S[id].beats.forEach(function (b) {
      (b.extraFigures || []).forEach(function (ef) {
        (ef.pos || []).forEach(function (kf) { if (kf.alpha === undefined) kf.alpha = 1; });
      });
    });
  });

})(window.STORY_SCENE_SPECS);
