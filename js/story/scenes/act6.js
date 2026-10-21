'use strict';
// Cinematic scene specs for act6. Merges into window.STORY_SCENE_SPECS, which
// smb-story-narrative-scene.js reads, so these load before it.
// 5 specs. Chapter ids: 76, 80, 82, 84, 85
// One staged beat per text beat (tools/scene-strip/align.js). The voice can hold a
// beat past its frame budget, so every beat lands its action early and ends on a pose
// that can sit.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  var KAEL = '#4488ff';
  // Same gold as the Fallen God's voice in act4mv; here it finally has a body.
  var FALLEN = '#e8b84a';
  var FG = { scale: 1.3 };
  var GUARD = '#ccaa44';
  var NO_NPC = [{ at: 0, x: 0.5, state: 'idle', facing: 1, alpha: 0, show: false }];

  function k(at, x, state, facing, o) {
    var r = { at: at, x: x, state: state, facing: facing };
    if (o) for (var p in o) r[p] = o[p];
    return r;
  }
  function walk(at, x, facing, o) { return k(at, x, 'walk', facing, Object.assign({ ease: 'linear' }, o || {})); }
  // The Fallen God's keyframes always carry its scale.
  function g(at, x, state, facing, o) { return k(at, x, state, facing, Object.assign({}, FG, o || {})); }
  function gwalk(at, x, facing) { return g(at, x, 'walk', facing, { ease: 'linear' }); }
  // Extra figures default to alpha 0.55 in the renderer; anyone physically present is 1.
  function fig(color, pos) {
    pos.forEach(function (p) { if (p.alpha === undefined) p.alpha = 1; });
    return { color: color, pos: pos };
  }
  function fadeIn(color, x, state, facing, t0, t1, a, o) {
    return fig(color, [k(0, x, state, facing, Object.assign({ alpha: 0 }, o || {})),
                       k(t0, x, state, facing, Object.assign({ alpha: 0 }, o || {})),
                       k(t1, x, state, facing, Object.assign({ alpha: a === undefined ? 1 : a }, o || {}))]);
  }
  function fadeOut(color, x, state, facing, t0, t1, a, o) {
    return fig(color, [k(0, x, state, facing, Object.assign({ alpha: a }, o || {})),
                       k(t0, x, state, facing, Object.assign({ alpha: a }, o || {})),
                       k(t1, x, state, facing, Object.assign({ alpha: 0 }, o || {}))]);
  }
  // A memory figure: faint, at one spot, pose changes over time. poses = [[at, state, facing], ...]
  function ghost(color, x, poses, a, o) {
    a = a === undefined ? 0.28 : a;
    return fig(color, poses.map(function (p) { return k(p[0], p[3] === undefined ? x : p[3], p[1], p[2], Object.assign({ alpha: p[4] === undefined ? a : p[4] }, o || {})); }));
  }
  function L(base) { base.letterbox = true; return base; }
  function cont(base) { base.letterbox = true; base.transition = 'none'; return base; }

  // ── The Void Between ───────────────────────────────────────────────────────────

  // Chapter 76: The First Gate. A voice behind the gate; its observers step out.
  var GATE_X = 0.53;
  S[76] = {
    bg: 'space',
    npcColor: FALLEN,
    beats: [
      L({
        // The scar from the loop, still settling.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.22, cy: 0.71 }, { at: 100, zoom: 1.35, cx: 0.28, cy: 0.72 }],
        playerPos: [walk(0, 0.16, 1), k(60, 0.30, 'hands', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: '#cc44ff', alpha: 0.22, startFrame: 60, fadeIn: 30 }],
      }),
      cont({
        // A weight in the space ahead. Old. Deliberate.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.28, cy: 0.72 }, { at: 120, zoom: 1.15, cx: 0.46, cy: 0.68 }],
        camShake: [{ at: 10, strength: 4, dur: 16 }],
        playerPos: [k(0, 0.30, 'hands', 1), k(10, 0.30, 'brace', 1), k(70, 0.30, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'portal', xf: GATE_X, yf: 0.56, height: 0.30, color: FALLEN, alpha: 0.35, startFrame: 30, fadeIn: 40 }],
      }),
      cont({
        // "You carry the fragment bearer's mark," the voice said.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.46, cy: 0.68 }, { at: 240, zoom: 1.25, cx: 0.42, cy: 0.70 }],
        playerPos: [k(0, 0.30, 'look', 1), k(40, 0.30, 'listen', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'portal', xf: GATE_X, yf: 0.56, height: 0.30, color: FALLEN, alpha: 0.45 }],
        bubbleX: GATE_X,
      }),
      cont({
        // "I need to know what you are."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.42, cy: 0.70 }, { at: 80, zoom: 1.45, cx: 0.32, cy: 0.72 }],
        playerPos: [k(0, 0.30, 'listen', 1), k(60, 0.30, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'portal', xf: GATE_X, yf: 0.56, height: 0.30, color: FALLEN, alpha: 0.45 }],
        bubbleX: GATE_X,
      }),
      cont({
        // "My observers will test that." They step out of the gate.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.32, cy: 0.72 }, { at: 50, zoom: 1.15, cx: 0.48, cy: 0.68 }],
        playerPos: [k(0, 0.30, 'look', 1), k(80, 0.30, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [
          fig(GUARD, [k(0, GATE_X, 'idle', -1, { alpha: 0 }), k(10, GATE_X, 'idle', -1, { alpha: 0 }), walk(30, GATE_X, -1, { alpha: 1 }), k(80, 0.46, 'stance', -1)]),
          fig('#aa8833', [k(0, GATE_X, 'idle', -1, { alpha: 0 }), k(30, GATE_X, 'idle', -1, { alpha: 0 }), walk(50, GATE_X, 1, { alpha: 1 }), k(110, 0.64, 'stance', -1)]),
        ],
        effectsBehind: [{ type: 'portal', xf: GATE_X, yf: 0.56, height: 0.30, color: FALLEN, alpha: 0.45, duration: 120 }],
        bubbleX: 0.60,
      }),
    ],
  };

  // Chapter 80: Proof of Understanding. The Fallen God comes down to test him.
  S[80] = {
    bg: 'space',
    npcColor: FALLEN,
    beats: [
      L({
        // "I will not destroy you. I am testing what you carry."
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.55, cy: 0.64 }, { at: 50, zoom: 1.20, cx: 0.50, cy: 0.69 }],
        camShake: [{ at: 36, strength: 10, dur: 18 }],
        playerPos: [k(0, 0.32, 'lookUp', 1), k(36, 0.32, 'brace', 1), k(70, 0.32, 'stance', 1)],
        npcPos: [g(0, 0.66, 'float', -1, { y: -0.40, ease: 'linear' }), g(36, 0.66, 'crouch', -1, { y: 0 }), g(66, 0.66, 'talk', -1), g(120, 0.66, 'idle', -1)],
        effects: [
          { type: 'impact_sparks', cx: 0.66, cy: 0.74, count: 14, color: '#ffdd88', startFrame: 36, duration: 24 },
          { type: 'shockwave', cx: 0.66, cy: 0.70, color: FALLEN, startFrame: 36, duration: 36 },
        ],
      }),
      cont({
        // "You carry the piece it carved from itself."
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.50, cy: 0.69 }, { at: 160, zoom: 1.40, cx: 0.40, cy: 0.72 }],
        playerPos: [k(0, 0.32, 'stance', 1), k(90, 0.32, 'hands', 1)],
        npcPos: [g(0, 0.66, 'talk', -1), g(70, 0.66, 'point', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.32, startFrame: 90, fadeIn: 24 }],
      }),
      cont({
        // "Prove it was you." Both set.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.40, cy: 0.72 }, { at: 40, zoom: 1.15, cx: 0.49, cy: 0.68 }],
        camShake: [{ at: 120, strength: 5, dur: 14 }],
        playerPos: [k(0, 0.32, 'hands', 1), k(16, 0.32, 'stance', 1)],
        npcPos: [g(0, 0.66, 'point', -1), g(10, 0.66, 'talk', -1), g(110, 0.66, 'stance', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.28 }, { type: 'fragment_pulse', color: FALLEN, alpha: 0.28, startFrame: 110, fadeIn: 14 }],
        effects: [{ type: 'speedlines', cx: 0.49, cy: 0.60, count: 16, color: '#ffdd88', alpha: 0.30, startFrame: 110, duration: 40 }],
      }),
    ],
  };

  // Chapter 82: The First Heroes. The Fallen God tells it in the memory archive;
  // the history plays as faint figures between them, under the mural.
  var MAN = '#bb99cc';                 // the man who became Axiom
  var NULL = '#664477', SERAPH = '#ddccaa', VAEL = '#55aa99', THUG = '#776655';
  var K82 = 0.26, G82 = 0.76;
  function fg82(poses) { return poses.map(function (p) { return g(p[0], p[3] || G82, p[1], p[2] === undefined ? -1 : p[2]); }); }
  function base82() { return [k(0, K82, 'listen', 1)]; }
  S[82] = {
    bg: 'level', level: { ch: 79, x: 2000 },
    npcColor: FALLEN,
    beats: [
      L({
        // "...you should understand what you are carrying it toward."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.66, cy: 0.70 }, { at: 200, zoom: 1.10, cx: 0.52, cy: 0.64 }],
        playerPos: [k(0, K82, 'look', 1), k(60, K82, 'listen', 1)],
        npcPos: fg82([[0, 'talk'], [200, 'idle']]),
      }),
      cont({
        // "He was not always this." The mural above them.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.52, cy: 0.64 }, { at: 80, zoom: 1.05, cx: 0.52, cy: 0.46 }],
        playerPos: [k(0, K82, 'listen', 1), k(30, K82, 'lookUp', 1)],
        npcPos: fg82([[0, 'idle'], [10, 'point']]),
      }),
      cont({
        // "He was ordinary once. Robbed on a street."
        camAnim: [{ at: 0, zoom: 1.05, cx: 0.52, cy: 0.46 }, { at: 60, zoom: 1.20, cx: 0.52, cy: 0.69 }],
        playerPos: [k(0, K82, 'lookUp', 1), k(40, K82, 'look', 1)],
        npcPos: fg82([[0, 'point'], [40, 'talk'], [300, 'idle']]),
        extraFigures: [
          ghost(MAN, 0.46, [[0, 'walk', 1, 0.40, 0], [30, 'walk', 1, 0.43], [70, 'idle', 1, 0.48], [150, 'brace', 1, 0.48], [250, 'stance', 1, 0.48]]),
          ghost(THUG, 0.60, [[0, 'stance', -1, 0.64, 0], [60, 'walk', -1, 0.64], [110, 'stance', -1, 0.58]]),
          ghost(THUG, 0.66, [[0, 'stance', -1, 0.70, 0], [80, 'walk', -1, 0.70], [130, 'stance', -1, 0.64]]),
        ],
      }),
      cont({
        // "He won."
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.52, cy: 0.69 }, { at: 30, zoom: 1.35, cx: 0.54, cy: 0.72 }],
        camShake: [{ at: 6, strength: 6, dur: 12 }],
        playerPos: base82(),
        npcPos: fg82([[0, 'idle']]),
        extraFigures: [
          ghost(MAN, 0.48, [[0, 'stance', 1], [4, 'attack', 1], [40, 'stance', 1]]),
          ghost(THUG, 0.58, [[0, 'stance', -1], [8, 'fall', -1], [30, 'kneel', -1]]),
          ghost(THUG, 0.64, [[0, 'stance', -1], [12, 'hit', -1], [34, 'crouch', -1]]),
        ],
        effects: [{ type: 'impact_sparks', cx: 0.55, cy: 0.62, count: 10, color: '#ddccee', startFrame: 6, duration: 18 }],
      }),
      cont({
        // "...that he could keep winning."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.54, cy: 0.72 }, { at: 200, zoom: 1.25, cx: 0.50, cy: 0.70 }],
        playerPos: base82(),
        npcPos: fg82([[0, 'talk'], [180, 'idle']]),
        extraFigures: [
          ghost(MAN, 0.48, [[0, 'stance', 1], [80, 'look', 1], [140, 'stance', 1]]),
          fadeOut(THUG, 0.58, 'kneel', -1, 10, 50, 0.28), fadeOut(THUG, 0.64, 'crouch', -1, 10, 50, 0.28),
        ],
      }),
      cont({
        // "He found others like him. They refused to stop."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.50, cy: 0.70 }, { at: 360, zoom: 1.12, cx: 0.51, cy: 0.66 }],
        playerPos: base82(),
        npcPos: fg82([[0, 'talk'], [340, 'idle']]),
        extraFigures: [
          ghost(MAN, 0.48, [[0, 'stance', 1]]),
          fadeIn(NULL, 0.40, 'stance', 1, 30, 70, 0.28), fadeIn(SERAPH, 0.44, 'stance', 1, 90, 130, 0.28), fadeIn(VAEL, 0.36, 'stance', 1, 150, 190, 0.28),
        ],
      }),
      cont({
        // Something the world couldn't handle. The punch tore through reality.
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.51, cy: 0.66 }, { at: 120, zoom: 1.20, cx: 0.54, cy: 0.69 }],
        camShake: [{ at: 124, strength: 14, dur: 24 }],
        playerPos: [k(0, K82, 'listen', 1), k(124, K82, 'brace', 1), k(170, K82, 'look', 1)],
        npcPos: fg82([[0, 'talk'], [280, 'idle']]),
        extraFigures: [
          ghost('#331122', 0.61, [[0, 'stance', -1, 0.61, 0], [20, 'stance', -1, 0.61, 0.32], [124, 'hit', -1, 0.62, 0.32], [180, 'fall', -1, 0.63, 0]], 0.32, { scale: 1.8 }),
          ghost(MAN, 0.48, [[0, 'stance', 1], [100, 'run', 1, 0.48], [120, 'attack', 1, 0.52], [170, 'stance', 1, 0.52]]),
          ghost(NULL, 0.40, [[0, 'stance', 1], [124, 'brace', 1]]),
          ghost(SERAPH, 0.44, [[0, 'stance', 1], [124, 'brace', 1]]),
          ghost(VAEL, 0.36, [[0, 'stance', 1], [124, 'brace', 1]]),
        ],
        effects: [
          { type: 'energy_burst', cx: 0.60, cy: 0.58, color: '#ddccee', startFrame: 122, duration: 34 },
          { type: 'screen_flash', color: '#ffffff', startFrame: 122, duration: 10, alpha: 0.25 },
          { type: 'sky_cracks', alpha: 0.40, startFrame: 124, spreadFrames: 40 },
        ],
      }),
      cont({
        // "They all stepped through. The tear closed behind them."
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.54, cy: 0.69 }, { at: 120, zoom: 1.25, cx: 0.56, cy: 0.70 }],
        playerPos: base82(),
        npcPos: fg82([[0, 'talk'], [100, 'idle']]),
        extraFigures: [[MAN, 0.52, 0], [NULL, 0.40, 10], [SERAPH, 0.44, 20], [VAEL, 0.36, 30]].map(function (c) {
          return ghost(c[0], c[1], [[0, 'stance', 1], [c[2], 'walk', 1, c[1]], [c[2] + 60, 'walk', 1, 0.62, 0.20], [c[2] + 80, 'idle', 1, 0.63, 0]]);
        }),
        effectsBehind: [{ type: 'portal', xf: 0.63, yf: 0.58, height: 0.30, color: '#ddccee', alpha: 0.55, duration: 110 }],
      }),
      cont({
        // "I watched the outer void do what it does to soul energy."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.56, cy: 0.70 }, { at: 60, zoom: 1.60, cx: 0.74, cy: 0.73 }],
        playerPos: [k(0, K82, 'listen', 1), k(30, K82, 'look', 1)],
        npcPos: fg82([[0, 'idle'], [20, 'look', -1]]),
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.24, fadeIn: 30 }, { type: 'static_noise', alpha: 0.08 }],
      }),
      cont({
        // "What came back was not what went in. He kept his name."
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.74, cy: 0.73 }, { at: 50, zoom: 1.20, cx: 0.54, cy: 0.69 }],
        playerPos: base82(),
        npcPos: fg82([[0, 'look'], [30, 'talk'], [220, 'idle']]),
        extraFigures: [fadeIn('#cc44ff', 0.54, 'idle', -1, 20, 80, 0.30, { scale: 1.45 })],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.20 }],
      }),
      cont({
        // "The others did not keep even that. That war has not ended."
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.54, cy: 0.69 }, { at: 280, zoom: 1.12, cx: 0.51, cy: 0.66 }],
        camShake: [{ at: 120, strength: 3, dur: 12 }, { at: 200, strength: 3, dur: 12 }],
        playerPos: base82(),
        npcPos: fg82([[0, 'talk'], [280, 'idle']]),
        extraFigures: [
          fadeOut('#cc44ff', 0.54, 'idle', -1, 0, 40, 0.30, { scale: 1.45 }),
          ghost(NULL, 0.42, [[0, 'stance', 1, 0.42, 0], [50, 'stance', 1, 0.42, 0.28], [120, 'attack', 1], [160, 'guard', 1], [200, 'attack', 1], [240, 'stance', 1]]),
          ghost(SERAPH, 0.50, [[0, 'stance', -1, 0.50, 0], [60, 'stance', -1, 0.50, 0.28], [124, 'brace', -1], [160, 'attack', -1], [204, 'brace', -1], [240, 'stance', -1]]),
          ghost(VAEL, 0.62, [[0, 'stance', -1, 0.62, 0], [70, 'stance', 1, 0.62, 0.28], [150, 'attack', 1], [200, 'stance', -1]]),
        ],
      }),
      cont({
        // "The champions at their centers — those were some of them."
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.51, cy: 0.66 }, { at: 160, zoom: 1.40, cx: 0.32, cy: 0.72 }, { at: 440, zoom: 1.20, cx: 0.40, cy: 0.69 }],
        playerPos: [k(0, K82, 'listen', 1), k(150, K82, 'brace', 1), k(220, K82, 'hands', 1)],
        npcPos: fg82([[0, 'talk'], [400, 'idle']]),
        extraFigures: [['#ff2200', 0.42, 'attack', 1], ['#3366cc', 0.50, 'guard', -1], [NULL, 0.58, 'attack', -1], [SERAPH, 0.64, 'stance', -1]].map(function (c, i) {
          return fadeIn(c[0], c[1], c[2], c[3], 30 + i * 40, 70 + i * 40, 0.24);
        }),
      }),
      cont({
        // "A person who became something the universe was not designed to contain."
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.40, cy: 0.69 }, { at: 80, zoom: 1.15, cx: 0.51, cy: 0.68 }],
        playerPos: [k(0, K82, 'hands', 1), k(60, K82, 'look', 1), k(240, K82, 'stance', 1)],
        npcPos: fg82([[0, 'talk'], [200, 'point', 1], [320, 'idle', -1]]),
        extraFigures: [['#ff2200', 0.42, 'attack', 1], ['#3366cc', 0.50, 'guard', -1], [NULL, 0.58, 'attack', -1], [SERAPH, 0.64, 'stance', -1]].map(function (c) {
          return fadeOut(c[0], c[1], c[2], c[3], 0, 50, 0.24);
        }),
      }),
    ],
  };

  // Chapter 84: Unregistered. In the fragment core, under the crystal.
  var K84 = 0.30, G84 = 0.66;
  S[84] = {
    bg: 'level', level: { ch: 83, x: 450 },
    npcColor: FALLEN,
    beats: [
      L({
        // "One thing you may have wondered. Why not simply delete it?"
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.64 }, { at: 300, zoom: 1.20, cx: 0.48, cy: 0.69 }],
        playerPos: [k(0, K84, 'look', 1), k(60, K84, 'listen', 1)],
        npcPos: [g(0, 0.72, 'talk', -1), gwalk(30, 0.72, -1), g(80, G84, 'talk', -1), g(280, G84, 'idle', -1)],
      }),
      cont({
        // It paused, the way it always paused before something precise.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.48, cy: 0.69 }, { at: 140, zoom: 1.10, cx: 0.52, cy: 0.64 }],
        playerPos: [k(0, K84, 'listen', 1), k(60, K84, 'look', 1)],
        npcPos: [g(0, G84, 'idle', -1), g(16, G84, 'lookUp', 1)],
      }),
      cont({
        // "The fragment predates his system entirely."
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.52, cy: 0.64 }, { at: 60, zoom: 1.20, cx: 0.48, cy: 0.69 }, { at: 360, zoom: 1.40, cx: 0.36, cy: 0.72 }],
        playerPos: [k(0, K84, 'look', 1), k(40, K84, 'listen', 1), k(340, K84, 'hands', 1)],
        npcPos: [g(0, G84, 'lookUp', 1), g(20, G84, 'talk', -1), g(300, G84, 'point', -1), g(560, G84, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.32, startFrame: 340, fadeIn: 30 }],
      }),
      cont({
        // "Ninety-four collection attempts." The ones who were collected.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.36, cy: 0.72 }, { at: 60, zoom: 1.12, cx: 0.49, cy: 0.66 }],
        playerPos: [k(0, K84, 'hands', 1), k(50, K84, 'look', 1)],
        npcPos: [g(0, G84, 'idle', -1), g(20, G84, 'talk', -1), g(260, G84, 'idle', -1)],
        extraFigures: [0.40, 0.46, 0.52, 0.58].map(function (x, i) {
          return fadeIn(['#665577', '#556677', '#776655', '#557766'][i], x, i % 2 ? 'crouch' : 'kneel', i < 2 ? 1 : -1, 30 + i * 24, 70 + i * 24, 0.22);
        }),
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.24, duration: 60 }],
      }),
      cont({
        // "An unresolvable process. There is no command for that."
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.49, cy: 0.66 }, { at: 160, zoom: 1.30, cx: 0.40, cy: 0.71 }, { at: 500, zoom: 1.20, cx: 0.46, cy: 0.69 }],
        playerPos: [k(0, K84, 'look', 1), k(110, K84, 'stance', 1)],
        npcPos: [g(0, G84, 'talk', -1), g(460, G84, 'idle', -1)],
        extraFigures: [0.40, 0.46, 0.52, 0.58].map(function (x, i) {
          return fadeOut(['#665577', '#556677', '#776655', '#557766'][i], x, i % 2 ? 'crouch' : 'kneel', i < 2 ? 1 : -1, 10 + i * 16, 60 + i * 16, 0.22);
        }),
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.40, startFrame: 110, fadeIn: 30 }],
      }),
    ],
  };

  // Chapter 85: The Shape Beyond. The Fallen God against the gold disc at the
  // final threshold.
  var K85 = 0.32, G85 = 0.64;
  S[85] = {
    bg: 'level', level: { ch: 81, x: 2760 },
    npcColor: FALLEN,
    beats: [
      L({
        // "One more thing. Before you go." Kael had already turned to leave.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.44, cy: 0.69 }, { at: 120, zoom: 1.15, cx: 0.48, cy: 0.68 }],
        playerPos: [walk(0, 0.42, -1), k(40, K85, 'idle', -1), k(56, K85, 'look', 1)],
        npcPos: [g(0, G85, 'idle', -1), g(30, G85, 'talk', -1), g(120, G85, 'idle', -1)],
      }),
      cont({
        // "Beyond the Creator — there is something older."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.48, cy: 0.68 }, { at: 80, zoom: 1.35, cx: 0.60, cy: 0.72 }],
        playerPos: [k(0, K85, 'look', 1), k(30, K85, 'listen', 1)],
        npcPos: [g(0, G85, 'talk', -1), g(70, G85, 'lookUp', 1)],
      }),
      cont({
        // "It built the world your Architects live in. The core. The walls."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.60, cy: 0.72 }, { at: 70, zoom: 1.10, cx: 0.50, cy: 0.64 }],
        playerPos: [k(0, K85, 'listen', 1), k(80, K85, 'look', -1), k(170, K85, 'lookUp', 1)],
        npcPos: [g(0, G85, 'lookUp', 1), g(20, G85, 'talk', -1), g(120, G85, 'reach', -1), g(320, G85, 'idle', -1)],
      }),
      cont({
        // "It chose, deliberately and permanently, never to engage with it."
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.64 }, { at: 440, zoom: 1.25, cx: 0.50, cy: 0.70, ease: 'linear' }],
        playerPos: [k(0, K85, 'lookUp', 1), k(50, K85, 'listen', 1)],
        npcPos: [g(0, G85, 'idle', -1), g(20, G85, 'talk', -1), g(420, G85, 'idle', -1)],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.22, startFrame: 30, fadeIn: 60 }],
      }),
      cont({
        // "...and you will find it — you are not surprised."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.50, cy: 0.70 }, { at: 100, zoom: 1.40, cx: 0.42, cy: 0.72 }],
        playerPos: [k(0, K85, 'listen', 1)],
        npcPos: [g(0, G85, 'idle', -1), gwalk(10, G85, -1), g(70, 0.52, 'talk', -1), g(220, 0.52, 'idle', -1)],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.18 }],
      }),
      cont({
        // "It has been watching you for longer than you know."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.42, cy: 0.72 }, { at: 280, zoom: 1.12, cx: 0.44, cy: 0.66 }],
        playerPos: [k(0, K85, 'listen', 1), k(180, K85, 'lookUp', 1)],
        npcPos: [g(0, 0.52, 'talk', -1), g(150, 0.52, 'lookUp', -1)],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.18 }, { type: 'fragment_pulse', color: '#fff2c0', alpha: 0.16, startFrame: 180, fadeIn: 40 }],
      }),
    ],
  };

})(window.STORY_SCENE_SPECS);
