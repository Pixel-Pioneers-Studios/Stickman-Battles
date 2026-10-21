'use strict';
// js/story/scenes/act2.js: cinematic scene specs for act 2 (chapters 32-48, 12 specs).
// Merges into window.STORY_SCENE_SPECS. Must load before js/smb-story-narrative-scene.js.
// One staged beat per text beat (tools/scene-strip/align.js). The voice can hold a
// beat past its frame budget, so every beat lands its action early and ends on a pose
// that can sit.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  var KAEL = '#4488ff', VERAN = '#3ddc84', ENTITY = '#8844ff';

  // Chapter 32: Gravity Anomaly
  S[32] = {
    bg: 'fracture',
    npcColor: '#ff8800',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.16, cy: 0.60 },
          { at: 90, zoom: 1.10, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.10, state: 'walk', facing: 1, ease: 'linear' },
          { at: 78, x: 0.24, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.70, state: 'float', facing: -1, alpha: 0, show: false }],
      },
      {
        // The floor lets go of him, then takes him back.
        letterbox: true,
        transition: 'none',
        warp: 0.30,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.40, cy: 0.50 },
          { at: 60,  zoom: 1.10, cx: 0.36, cy: 0.40 },
          { at: 170, zoom: 1.15, cx: 0.30, cy: 0.50 },
        ],
        camShake: [{ at: 172, strength: 10, dur: 18 }],
        playerPos: [
          { at: 0,   x: 0.24, y: 0,     state: 'look',   facing: 1 },
          { at: 20,  x: 0.24, y: -0.04, state: 'float',  facing: 1 },
          { at: 70,  x: 0.25, y: -0.30, state: 'float',  facing: -1 },
          { at: 140, x: 0.25, y: -0.30, state: 'fall',   facing: 1, ease: 'linear' },
          { at: 172, x: 0.25, y: 0,     state: 'crouch', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.70, state: 'float', facing: -1, alpha: 0, show: false }],
        effects: [
          { type: 'impact_sparks', cx: 0.25, cy: 0.74, count: 8, color: '#ffbb66', startFrame: 172, duration: 22 },
        ],
      },
      {
        // The ones who stopped caring which way was down.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.30, cy: 0.50 },
          { at: 80,  zoom: 1.15, cx: 0.66, cy: 0.45 },
          { at: 300, zoom: 1.20, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.25, state: 'crouch', facing: 1 },
          { at: 30, x: 0.25, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.70, y: -0.20, state: 'float',  facing: -1, alpha: 0 },
          { at: 40,  x: 0.70, y: -0.22, state: 'float',  facing: -1, alpha: 1 },
          { at: 170, x: 0.70, y: -0.18, state: 'fall',   facing: -1, ease: 'linear' },
          { at: 200, x: 0.70, y: 0,     state: 'crouch', facing: -1 },
          { at: 220, x: 0.70, y: 0,     state: 'stance', facing: -1 },
        ],
        extraFigures: [
          { x: 0.60, y: -0.30, c: '#cc6600', d: 0.04 },
          { x: 0.80, y: -0.12, c: '#aa5500', d: -0.03 },
          { x: 0.90, y: -0.34, c: '#dd7722', d: 0.05 },
        ].map(function (g, i) {
          return { color: g.c, pos: [
            { at: 0,   x: g.x, y: g.y,       state: 'float', facing: -1, alpha: 0 },
            { at: 30 + i * 20,  x: g.x, y: g.y,       state: 'float', facing: i % 2 ? 1 : -1, alpha: 0.85 },
            { at: 180 + i * 20, x: g.x, y: g.y + g.d, state: 'float', facing: -1, alpha: 0.85 },
          ] };
        }),
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.55, cy: 0.50 },
          { at: 40,  zoom: 1.30, cx: 0.60, cy: 0.58 },
          { at: 110, zoom: 1.20, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.25, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.70, state: 'stance', facing: -1 },
          { at: 4,  x: 0.70, state: 'walk',   facing: -1, ease: 'linear' },
          { at: 38, x: 0.64, state: 'talk',   facing: -1 },
          { at: 70, x: 0.64, state: 'point',  facing: -1 }, // "Everyone does."
          { at: 120, x: 0.64, state: 'stance', facing: -1 },
        ],
        extraFigures: [
          { x: 0.60, y: -0.34, c: '#cc6600' },
          { x: 0.80, y: -0.09, c: '#aa5500' },
          { x: 0.90, y: -0.29, c: '#dd7722' },
        ].map(function (g) {
          return { color: g.c, pos: [{ at: 0, x: g.x, y: g.y, state: 'float', facing: -1, alpha: 0.85 }] };
        }),
      },
    ],
  };

  // Chapter 33: The Orbital Duel
  var CHAMP2 = '#7733aa';
  S[33] = {
    bg: 'space',
    npcColor: '#9944cc',
    beats: [
      {
        // Kael arrives; the camera finds the two who were waiting.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.20, cx: 0.30, cy: 0.52 },
          { at: 200, zoom: 1.25, cx: 0.74, cy: 0.56 },
          { at: 300, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.08, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 100, x: 0.26, state: 'look',   facing: 1 },
          { at: 200, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.70, state: 'stance', facing: -1 }],
        extraFigures: [
          { color: CHAMP2, pos: [{ at: 0, x: 0.80, state: 'stance', facing: -1, alpha: 1 }] },
        ],
      },
      {
        // "Not by choice. But it's what we are."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 40,  zoom: 1.35, cx: 0.70, cy: 0.60 },
          { at: 300, zoom: 1.30, cx: 0.66, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.70, state: 'talk',  facing: -1 },
          { at: 170, x: 0.70, state: 'hands', facing: -1 },
          { at: 240, x: 0.70, state: 'talk',  facing: -1 },
        ],
        extraFigures: [
          { color: CHAMP2, pos: [
            { at: 0,   x: 0.80, state: 'stance', facing: -1, alpha: 1 },
            { at: 140, x: 0.80, state: 'look',   facing: 1,  alpha: 1 },
          ] },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9944cc', alpha: 0.45, fadeIn: 40 },
        ],
      },
      {
        // The stolen energy in their eyes, then the standoff.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.66, cy: 0.58 },
          { at: 20,  zoom: 1.60, cx: 0.76, cy: 0.66 },
          { at: 90,  zoom: 1.60, cx: 0.76, cy: 0.66 },
          { at: 120, zoom: 1.12, cx: 0.52, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk',   facing: -1 },
          { at: 30, x: 0.70, state: 'stance', facing: -1 },
        ],
        extraFigures: [
          { color: CHAMP2, pos: [
            { at: 0,  x: 0.80, state: 'look',   facing: 1,  alpha: 1 },
            { at: 30, x: 0.80, state: 'stance', facing: -1, alpha: 1 },
          ] },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9944cc', alpha: 0.65, fadeIn: 20 },
        ],
        effects: [
          { type: 'energy_burst', cx: 0.70, cy: 0.50, color: '#cc66ff', startFrame: 24, duration: 26 },
          { type: 'energy_burst', cx: 0.80, cy: 0.50, color: '#cc66ff', startFrame: 34, duration: 26 },
        ],
      },
    ],
  };

  // Chapter 34: Echo Storm
  // Veran is on comms; the speaking npc is her bodiless voice.
  var STORM = '#ff66ff';
  function stormEchoes(beat) {
    return [0.62, 0.70, 0.78, 0.86, 0.94].map(function (x, i) {
      var pos;
      if (beat === 1) {
        var t = 20 + i * 22;
        pos = [
          { at: 0,      x: 0.52, state: 'idle',   facing: 1,  alpha: 0 },
          { at: t,      x: 0.52, state: 'run',    facing: 1,  alpha: 0, ease: 'linear' },
          { at: t + 8,  x: 0.54, state: 'run',    facing: 1,  alpha: 0.5, ease: 'linear' },
          { at: t + 40, x: x,    state: 'stance', facing: -1, alpha: 0.5 },
        ];
      } else {
        pos = [{ at: 0, x: x, state: 'stance', facing: -1, alpha: 0.5 }];
      }
      return { color: STORM, pos: pos };
    });
  }
  S[34] = {
    bg: 'fracture',
    npcColor: VERAN,
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.16, cy: 0.60 },
          { at: 90, zoom: 1.10, cx: 0.40, cy: 0.50 },
        ],
        camShake: [{ at: 50, strength: 10, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.10, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 50, x: 0.19, state: 'brace', facing: 1 },
          { at: 80, x: 0.19, state: 'look',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: STORM, alpha: 0.50, startFrame: 50, fadeIn: 16 },
        ],
      },
      {
        // The generator spits out echoes, one after another.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.40, cy: 0.50 },
          { at: 120, zoom: 1.15, cx: 0.62, cy: 0.50 },
          { at: 300, zoom: 1.10, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.19, state: 'look',   facing: 1 },
          { at: 40, x: 0.19, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1, alpha: 0, show: false }],
        extraFigures: stormEchoes(1),
        effectsBehind: [
          { type: 'fragment_pulse', color: STORM, alpha: 0.55 },
        ],
      },
      {
        // Veran on comms.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.55, cy: 0.50 },
          { at: 40, zoom: 1.40, cx: 0.22, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,  x: 0.19, state: 'stance', facing: 1 },
          { at: 14, x: 0.19, state: 'listen', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1, alpha: 0, show: false }],
        extraFigures: stormEchoes(2),
        effects: [
          { type: 'static_noise', alpha: 0.35, duration: 60 },
          { type: 'phone', xf: 0.25, yf: 0.54, alpha: 0.85 },
        ],
      },
      {
        // The storm's eye, and the one fighter guarding it.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.22, cy: 0.62 },
          { at: 50,  zoom: 1.15, cx: 0.50, cy: 0.45 }, // the generator
          { at: 130, zoom: 1.15, cx: 0.50, cy: 0.45 },
          { at: 170, zoom: 1.30, cx: 0.45, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,   x: 0.19, state: 'listen', facing: 1 },
          { at: 150, x: 0.19, state: 'brace',  facing: 1 },
          { at: 190, x: 0.19, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1, alpha: 0, show: false }],
        extraFigures: stormEchoes(2).concat([
          { color: '#99bbff', pos: [
            { at: 0,   x: 0.52, state: 'idle',   facing: -1, alpha: 0 },
            { at: 100, x: 0.52, state: 'idle',   facing: -1, alpha: 0 },
            { at: 130, x: 0.52, state: 'walk',   facing: -1, alpha: 0.9, ease: 'linear' },
            { at: 160, x: 0.47, state: 'stance', facing: -1, alpha: 0.9 },
          ] },
        ]),
        effects: [
          { type: 'static_noise', alpha: 0.25, duration: 40 },
          { type: 'phone', xf: 0.25, yf: 0.54, alpha: 0.85, duration: 140 },
          { type: 'energy_burst', cx: 0.52, cy: 0.55, color: '#99bbff', startFrame: 100, duration: 30 },
        ],
        bubbleX: 0.26,
      },
    ],
  };

  // Chapter 35: The Core's Eye
  S[35] = {
    bg: 'space',
    npcColor: ENTITY,
    beats: [
      {
        // Something stands in the light. Not a monster.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.16, cy: 0.60 },
          { at: 110, zoom: 1.08, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.10, state: 'walk', facing: 1, ease: 'linear' },
          { at: 100, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.64, state: 'kneel', facing: -1, alpha: 0 },
          { at: 80, x: 0.64, state: 'kneel', facing: -1, alpha: 0.4 },
        ],
      },
      {
        // A person. Or what remained of one.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.08, cx: 0.45, cy: 0.50 },
          { at: 50,  zoom: 1.40, cx: 0.64, cy: 0.62 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.64, state: 'kneel', facing: -1, alpha: 0.4 },
          { at: 40, x: 0.64, state: 'kneel', facing: -1, alpha: 1 },
          { at: 80, x: 0.64, state: 'idle',  facing: -1, alpha: 1 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.64, cy: 0.62 },
          { at: 120, zoom: 1.30, cx: 0.60, cy: 0.58 },
          { at: 140, zoom: 1.45, cx: 0.32, cy: 0.63 }, // on Kael as it confesses
          { at: 260, zoom: 1.45, cx: 0.32, cy: 0.63 },
          { at: 300, zoom: 1.20, cx: 0.50, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.28, state: 'look',   facing: 1 },
          { at: 100, x: 0.28, state: 'listen', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.64, state: 'idle',  facing: -1 },
          { at: 20,  x: 0.64, state: 'walk',  facing: -1, ease: 'linear' },
          { at: 52,  x: 0.58, state: 'talk',  facing: -1 },
          { at: 90,  x: 0.58, state: 'look',  facing: 1 },  // "left me here"
          { at: 150, x: 0.58, state: 'hands', facing: -1 }, // "Every fragment I've consumed"
          { at: 260, x: 0.58, state: 'talk',  facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: ENTITY, alpha: 0.40, fadeIn: 60 },
        ],
      },
      {
        // "Give me yours."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.54 },
          { at: 30, zoom: 1.35, cx: 0.44, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'listen', facing: 1 },
          { at: 30, x: 0.28, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.58, state: 'talk',  facing: -1 },
          { at: 8,  x: 0.58, state: 'walk',  facing: -1, ease: 'linear' },
          { at: 30, x: 0.54, state: 'reach', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: ENTITY, alpha: 0.50 },
          { type: 'fragment_pulse', color: KAEL, alpha: 0.35, startFrame: 30, fadeIn: 20 },
        ],
      },
      {
        // You still said no.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.44, cy: 0.60 },
          { at: 180, zoom: 1.20, cx: 0.44, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'guard',  facing: 1 },
          { at: 64, x: 0.28, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.54, state: 'reach',  facing: -1 },
          { at: 90,  x: 0.54, state: 'idle',   facing: -1 },
          { at: 110, x: 0.54, state: 'walk',   facing: 1, ease: 'linear' },  // turns, steps back
          { at: 140, x: 0.59, state: 'idle',   facing: 1 },
          { at: 170, x: 0.59, state: 'stance', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: ENTITY, alpha: 0.45 },
          { type: 'fragment_pulse', color: KAEL, alpha: 0.70, startFrame: 64, fadeIn: 12 },
        ],
      },
    ],
  };

  // Chapter 37: Resonance Spike
  // The rift entity watches from the edge and does the talking; the resonance
  // fighter is an extra figure that walks in late.
  var RES = '#cc44ff';
  S[37] = {
    bg: 'fracture',
    npcColor: ENTITY,
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.16, cy: 0.60 },
          { at: 100, zoom: 1.10, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.10, state: 'walk', facing: 1, ease: 'linear' },
          { at: 88, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.74, state: 'idle', facing: -1, alpha: 0 },
          { at: 70, x: 0.74, state: 'idle', facing: -1, alpha: 0.8 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.45, cy: 0.50 },
          { at: 60,  zoom: 1.30, cx: 0.60, cy: 0.58 },
          { at: 200, zoom: 1.35, cx: 0.30, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,   x: 0.26, state: 'look',  facing: 1 },
          { at: 160, x: 0.26, state: 'hands', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.74, state: 'talk', facing: -1, alpha: 0.8 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.40, startFrame: 160, fadeIn: 30 },
        ],
      },
      {
        // White vision, bending air. On "afraid of" the fragment answers.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.30, cy: 0.60 },
          { at: 160, zoom: 1.50, cx: 0.28, cy: 0.64 },
          { at: 200, zoom: 1.60, cx: 0.26, cy: 0.66 },
        ],
        camShake: [{ at: 168, strength: 8, dur: 24 }],
        playerPos: [
          { at: 0,   x: 0.26, state: 'hands',  facing: 1 },
          { at: 60,  x: 0.26, state: 'listen', facing: 1 },
          { at: 120, x: 0.26, state: 'hands',  facing: 1 },
          { at: 168, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.74, state: 'talk', facing: -1, alpha: 0.8 },
          { at: 170, x: 0.74, state: 'idle', facing: -1, alpha: 0.8 },
        ],
        warp: 0.30,
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.55 },
          { type: 'fragment_pulse', color: KAEL, alpha: 0.45, startFrame: 168, fadeIn: 10 },
        ],
        effects: [
          { type: 'static_noise', alpha: 0.18, startFrame: 60, duration: 40 },
          { type: 'energy_burst', cx: 0.26, cy: 0.58, color: KAEL, startFrame: 168, duration: 28 },
          { type: 'speedlines', cx: 0.26, cy: 0.55, count: 18, color: '#88aaff', alpha: 0.45, startFrame: 168, duration: 30, fadeIn: 4 },
        ],
        bubbleX: 0.50,
      },
      {
        // The resonance fighter walks in, calibrated for him.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.60, cx: 0.26, cy: 0.66 },
          { at: 30,  zoom: 1.15, cx: 0.55, cy: 0.50 },
          { at: 240, zoom: 1.20, cx: 0.52, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.74, state: 'idle', facing: -1, alpha: 0.8 },
          { at: 60,  x: 0.74, state: 'walk', facing: 1,  alpha: 0.8, ease: 'linear' },
          { at: 110, x: 0.84, state: 'idle', facing: -1, alpha: 0.8 },
        ],
        extraFigures: [
          { color: RES, pos: [
            { at: 0,   x: 1.04, state: 'walk',   facing: -1, alpha: 1, ease: 'linear' },
            { at: 200, x: 0.62, state: 'stance', facing: -1, alpha: 1 },
          ] },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.50 },
        ],
      },
      {
        // "Try not to lose control. But — try."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.52, cy: 0.52 },
          { at: 40,  zoom: 1.30, cx: 0.66, cy: 0.58 },
          { at: 120, zoom: 1.15, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.84, state: 'talk', facing: -1, alpha: 0.8 },
          { at: 110, x: 0.84, state: 'idle', facing: -1, alpha: 0.8 },
        ],
        extraFigures: [
          { color: RES, pos: [{ at: 0, x: 0.62, state: 'stance', facing: -1, alpha: 1 }] },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.65, startFrame: 70, fadeIn: 20 },
        ],
      },
    ],
  };

  // Chapter 39: Into the Green
  S[39] = {
    bg: 'forest',
    npcColor: VERAN,
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.20, cy: 0.54 },
          { at: 100, zoom: 1.05, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.10, state: 'walk', facing: 1, ease: 'linear' },
          { at: 88, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.02, state: 'walk', facing: 1, ease: 'linear' },
          { at: 84, x: 0.17, state: 'look', facing: 1 },
        ],
      },
      {
        // The first thing she warned him.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.45, cy: 0.50 },
          { at: 60, zoom: 1.35, cx: 0.22, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look', facing: 1 },
          { at: 20, x: 0.26, state: 'look', facing: -1 },
        ],
        npcPos: [{ at: 0, x: 0.17, state: 'look', facing: 1 }],
      },
      {
        // She points into the trees: the forest pushes you to the middle.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.22, cy: 0.60 },
          { at: 90,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 300, zoom: 1.20, cx: 0.32, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look', facing: -1 },
          { at: 70, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.17, state: 'talk',  facing: 1 },
          { at: 60,  x: 0.17, state: 'point', facing: 1 },
          { at: 200, x: 0.17, state: 'talk',  facing: 1 },
        ],
      },
      {
        // Something moves in the trees ahead.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.32, cy: 0.54 },
          { at: 80,  zoom: 1.25, cx: 0.78, cy: 0.56 },
          { at: 150, zoom: 1.25, cx: 0.78, cy: 0.56 },
          { at: 200, zoom: 1.15, cx: 0.40, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.26, state: 'look',  facing: 1 },
          { at: 110, x: 0.26, state: 'brace', facing: 1 },
          { at: 150, x: 0.26, state: 'look',  facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.17, state: 'idle',  facing: 1 },
          { at: 114, x: 0.17, state: 'brace', facing: 1 },
          { at: 160, x: 0.17, state: 'look',  facing: 1 },
        ],
        extraFigures: [
          { color: '#4a8a4a', pos: [
            { at: 0,   x: 0.72, state: 'run', facing: 1, alpha: 0, ease: 'linear' },
            { at: 90,  x: 0.72, state: 'run', facing: 1, alpha: 0, ease: 'linear' },
            { at: 100, x: 0.765, state: 'run', facing: 1, alpha: 0.65, ease: 'linear' },
            { at: 130, x: 0.90, state: 'run', facing: 1, alpha: 0.65, ease: 'linear' },
            { at: 140, x: 0.945, state: 'run', facing: 1, alpha: 0 },
          ] },
        ],
        effectsBehind: [
          { type: 'smoke', alpha: 0.25 },
        ],
      },
      {
        // You started walking.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.40, cy: 0.52 },
          { at: 100, zoom: 1.10, cx: 0.52, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look', facing: 1 },
          { at: 10, x: 0.26, state: 'walk', facing: 1, ease: 'linear' },
          { at: 90, x: 0.40, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.17, state: 'look', facing: 1 },
          { at: 24,  x: 0.17, state: 'walk', facing: 1, ease: 'linear' },
          { at: 100, x: 0.307, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'smoke', alpha: 0.25 },
        ],
      },
    ],
  };

  // Chapter 40: The Second Architect
  var ARCH2 = '#33aa44';
  S[40] = {
    bg: 'forest',
    npcColor: ARCH2,
    beats: [
      {
        // The Architect rises in the light as Kael arrives.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.66, cy: 0.62 },
          { at: 60,  zoom: 1.40, cx: 0.66, cy: 0.62 },
          { at: 130, zoom: 1.10, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.12, state: 'walk', facing: 1, ease: 'linear' },
          { at: 100, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.66, state: 'kneel', facing: -1 },
          { at: 40, x: 0.66, state: 'idle',  facing: -1 },
          { at: 64, x: 0.66, state: 'talk',  facing: -1 },
        ],
      },
      {
        // "Something got out. And now it's in you."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.48, cy: 0.50 },
          { at: 50,  zoom: 1.15, cx: 0.62, cy: 0.42 }, // up to the sigil
          { at: 100, zoom: 1.15, cx: 0.62, cy: 0.42 },
          { at: 130, zoom: 1.45, cx: 0.34, cy: 0.63 },
        ],
        playerPos: [
          { at: 0,   x: 0.30, state: 'look',  facing: 1 },
          { at: 130, x: 0.30, state: 'hands', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'talk',   facing: -1 },
          { at: 40,  x: 0.66, state: 'lookUp', facing: -1 },
          { at: 110, x: 0.66, state: 'point',  facing: -1 },
          { at: 200, x: 0.66, state: 'talk',   facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.55, startFrame: 120, fadeIn: 20 },
        ],
      },
      {
        // "Prove it."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.34, cy: 0.63 },
          { at: 40,  zoom: 1.15, cx: 0.48, cy: 0.52 },
          { at: 200, zoom: 1.22, cx: 0.48, cy: 0.55 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'hands',  facing: 1 },
          { at: 30, x: 0.30, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.66, state: 'talk',   facing: -1 },
          { at: 20, x: 0.66, state: 'walk',   facing: -1, ease: 'linear' },
          { at: 52, x: 0.60, state: 'talk',   facing: -1 },
          { at: 110, x: 0.60, state: 'stance', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.45 },
        ],
      },
    ],
  };

  // Chapter 42: The Ice Dimension
  // Beat 2 is something the third Architect "reportedly" said: a faint figure on
  // the ice, not really there.
  var ARCH3 = '#2266bb', ELITE = '#4488cc';
  S[42] = {
    bg: 'ice',
    npcColor: ARCH3,
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.70, cy: 0.42 },
          { at: 150, zoom: 1.15, cx: 0.30, cy: 0.48 },
          { at: 260, zoom: 1.10, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.08, state: 'walk', facing: 1, ease: 'linear' },
          { at: 90,  x: 0.24, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.66, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
      {
        // Withdrawn up there, decades ago.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.40, cy: 0.50 },
          { at: 70, zoom: 1.20, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.24, state: 'look',   facing: 1 },
          { at: 20, x: 0.24, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.66, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.60, cy: 0.50 },
          { at: 60,  zoom: 1.30, cx: 0.62, cy: 0.58 },
          { at: 380, zoom: 1.20, cx: 0.48, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.24, state: 'lookUp', facing: 1 },
          { at: 40, x: 0.24, state: 'look',   facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'idle', facing: -1, alpha: 0 },
          { at: 30,  x: 0.66, state: 'talk', facing: -1, alpha: 0.30 },
          { at: 250, x: 0.66, state: 'hands', facing: -1, alpha: 0.30 }, // "build something that survives"
        ],
      },
      {
        // Their fighters walk out of the ice.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.48, cy: 0.52 },
          { at: 120, zoom: 1.15, cx: 0.56, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.24, state: 'look',   facing: 1 },
          { at: 50, x: 0.24, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.66, state: 'hands', facing: -1, alpha: 0.30 },
          { at: 40, x: 0.66, state: 'hands', facing: -1, alpha: 0 },
        ],
        extraFigures: [0.62, 0.72, 0.82].map(function (x, i) {
          return { color: ELITE, pos: [
            { at: 0,           x: x + 0.20, state: 'walk',   facing: -1, alpha: 0, ease: 'linear' },
            { at: 20 + i * 12, x: x + 0.17, state: 'walk',   facing: -1, alpha: 1, ease: 'linear' },
            { at: 110 + i * 12, x: x,       state: 'stance', facing: -1, alpha: 1 },
          ] };
        }),
      },
    ],
  };

  // Chapter 43: The Pessimist
  // The level's board reads "812 outcomes computed, none end with me losing".
  S[43] = {
    bg: 'ice',
    npcColor: ARCH3,
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.50, cy: 0.42 }, // the board
          { at: 90,  zoom: 1.15, cx: 0.50, cy: 0.42 },
          { at: 140, zoom: 1.10, cx: 0.48, cy: 0.50 },
          { at: 380, zoom: 1.25, cx: 0.60, cy: 0.56 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.70, state: 'talk',  facing: -1 },
          { at: 200, x: 0.70, state: 'point', facing: -1 }, // "They don't contain it."
          { at: 280, x: 0.70, state: 'talk',  facing: -1 },
        ],
      },
      {
        // "Unless..."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.60, cy: 0.56 },
          { at: 20, zoom: 1.45, cx: 0.70, cy: 0.63 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0, x: 0.70, state: 'talk', facing: -1 },
          { at: 8, x: 0.70, state: 'idle', facing: -1 },
        ],
      },
      {
        // They look up at their own board and recalculate.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.70, cy: 0.63 },
          { at: 30, zoom: 1.15, cx: 0.55, cy: 0.44 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle',   facing: -1 },
          { at: 10, x: 0.70, state: 'lookUp', facing: -1 },
        ],
        effects: [
          { type: 'static_noise', alpha: 0.30, startFrame: 30, duration: 36 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.55, cy: 0.44 },
          { at: 40,  zoom: 1.30, cx: 0.64, cy: 0.58 },
          { at: 170, zoom: 1.20, cx: 0.48, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.26, state: 'stance', facing: 1 },
          { at: 172, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.70, state: 'lookUp', facing: -1 },
          { at: 20,  x: 0.70, state: 'talk',   facing: -1 },
          { at: 120, x: 0.70, state: 'point',  facing: -1 }, // "anchor a closure"
          { at: 172, x: 0.70, state: 'stance', facing: -1 }, // "Beat me."
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.60, startFrame: 172, fadeIn: 14 },
        ],
      },
    ],
  };

  // Chapter 46: What the Ancients Left
  // The rift entity speaks from nowhere; its bubble sits over Kael.
  S[46] = {
    bg: 'ruins',
    npcColor: ENTITY,
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.55, cy: 0.42 }, // cracked sky first
          { at: 110, zoom: 1.10, cx: 0.35, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.10, state: 'walk', facing: 1, ease: 'linear' },
          { at: 78, x: 0.24, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1, alpha: 0, show: false }],
      },
      {
        // Broken towers, a planet frozen mid-collapse.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.35, cy: 0.50 },
          { at: 160, zoom: 1.20, cx: 0.72, cy: 0.50 },
          { at: 240, zoom: 1.15, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.24, state: 'look',   facing: 1 },
          { at: 60, x: 0.24, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1, alpha: 0, show: false }],
      },
      {
        // Something is hidden under the rubble.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.55, cy: 0.50 },
          { at: 120, zoom: 1.40, cx: 0.40, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,   x: 0.24, state: 'lookUp', facing: 1 },
          { at: 20,  x: 0.24, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 110, x: 0.40, state: 'look',   facing: 1 },
          { at: 140, x: 0.40, state: 'crouch', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1, alpha: 0, show: false }],
      },
      {
        // "The fragment will guide you." It does.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.40, cy: 0.62 },
          { at: 90,  zoom: 1.15, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.40, state: 'crouch', facing: 1 },
          { at: 30, x: 0.40, state: 'look',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.55, startFrame: 30, fadeIn: 20 },
          { type: 'objective_marker', xf: 0.86, yf: 0.50, color: '#88aaff', alpha: 0.85, startFrame: 50, fadeIn: 30 },
        ],
        bubbleX: 0.40,
      },
      {
        // Something ancient waits in the rubble.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.58, cy: 0.50 },
          { at: 120, zoom: 1.30, cx: 0.74, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.40, state: 'look', facing: 1 },
          { at: 10, x: 0.40, state: 'walk', facing: 1, ease: 'linear' },
          { at: 90, x: 0.54, state: 'look', facing: 1 },
          { at: 130, x: 0.54, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1, alpha: 0, show: false }],
        extraFigures: [
          { color: '#c0ae92', pos: [
            { at: 0,   x: 0.84, state: 'kneel', facing: -1, alpha: 0 },
            { at: 90,  x: 0.84, state: 'kneel', facing: -1, alpha: 0 },
            { at: 120, x: 0.84, state: 'kneel', facing: -1, alpha: 0.6 },
            { at: 160, x: 0.84, state: 'idle',  facing: -1, alpha: 0.6 },
          ] },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.45 },
          { type: 'objective_marker', xf: 0.86, yf: 0.50, color: '#88aaff', alpha: 0.85 },
        ],
      },
    ],
  };

  // Chapter 47: The Last Army
  // The level's backdrop is ranks of silhouettes. The echoes step out of them.
  var ALPHA = '#aa00ff';
  S[47] = {
    bg: 'ruins',
    npcColor: ENTITY,
    beats: [
      {
        // Quiet, then it arrives.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.16, cy: 0.60 },
          { at: 110, zoom: 1.10, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.10, state: 'walk', facing: 1, ease: 'linear' },
          { at: 88, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, y: -0.14, state: 'float', facing: -1, alpha: 0 },
          { at: 50,  x: 0.66, y: -0.14, state: 'float', facing: -1, alpha: 0 },
          { at: 90,  x: 0.66, y: -0.06, state: 'float', facing: -1, alpha: 1 },
          { at: 110, x: 0.66, y: 0,     state: 'idle',  facing: -1, alpha: 1 },
        ],
        effects: [
          { type: 'energy_burst', cx: 0.66, cy: 0.55, color: ENTITY, startFrame: 60, duration: 30 },
        ],
      },
      {
        // "I never wanted that."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.45, cy: 0.50 },
          { at: 50,  zoom: 1.30, cx: 0.50, cy: 0.58 },
          { at: 300, zoom: 1.35, cx: 0.56, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look',   facing: 1 },
          { at: 40, x: 0.26, state: 'listen', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'talk', facing: -1 },
          { at: 100, x: 0.66, state: 'look', facing: 1 },  // looks away
          { at: 180, x: 0.66, state: 'talk', facing: -1 },
        ],
      },
      {
        // The rift's hunger: echoes step out of the ranks behind it.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.56, cy: 0.60 },
          { at: 60,  zoom: 1.10, cx: 0.66, cy: 0.48 },
          { at: 260, zoom: 1.10, cx: 0.60, cy: 0.48 },
          { at: 320, zoom: 1.20, cx: 0.48, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.26, state: 'listen', facing: 1 },
          { at: 150, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'talk',  facing: -1 },
          { at: 50,  x: 0.66, state: 'point', facing: 1 },   // "It generates fighters."
          { at: 150, x: 0.66, state: 'talk',  facing: -1 },
          { at: 260, x: 0.66, state: 'idle',  facing: -1 }, // "Survive them. Then we talk." 
        ],
        extraFigures: [0.82, 0.88, 0.94, 0.99].map(function (x, i) {
          return { color: '#7a1fb0', pos: [
            { at: 0,            x: x, y: -0.10, state: 'idle',   facing: -1, alpha: 0 },
            { at: 60 + i * 18,  x: x, y: -0.10, state: 'idle',   facing: -1, alpha: 0 },
            { at: 90 + i * 18,  x: x, y: 0,     state: 'stance', facing: -1, alpha: 0.8 },
          ] };
        }).concat([
          { color: ALPHA, pos: [
            { at: 0,   x: 0.86, state: 'stance', facing: -1, alpha: 0,   scale: 1.2 },
            { at: 200, x: 0.86, state: 'walk',   facing: -1, alpha: 1,   scale: 1.2, ease: 'linear' },
            { at: 256, x: 0.76, state: 'stance', facing: -1, alpha: 1,   scale: 1.2 },
          ] },
        ]),
        effectsBehind: [
          { type: 'fragment_pulse', color: ALPHA, alpha: 0.45, startFrame: 60, fadeIn: 40 },
        ],
      },
    ],
  };

  // Chapter 48: The Herald of Nothing
  // The Herald is the speaking npc. The rift entity is an extra figure; for its
  // one quoted line the bubble moves to it and takes its colour.
  var ENT_X = 0.88;
  function entityFig(a0, a1, t0, t1) {
    return { color: ENTITY, pos: [
      { at: 0,  x: ENT_X, state: 'idle', facing: -1, alpha: a0 },
      { at: t0, x: ENT_X, state: 'idle', facing: -1, alpha: a0 },
      { at: t1, x: ENT_X, state: 'idle', facing: -1, alpha: a1 },
    ] };
  }
  S[48] = {
    bg: 'ruins',
    npcColor: '#ffffff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.26, cy: 0.54 },
          { at: 100, zoom: 1.10, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.10, state: 'walk', facing: 1, ease: 'linear' },
          { at: 89, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.66, state: 'idle', facing: 1 }], // back turned, facing the wall
      },
      {
        // A person, reading the tally marks on the wall.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.45, cy: 0.50 },
          { at: 50, zoom: 1.45, cx: 0.68, cy: 0.63 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'look', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.66, state: 'idle',   facing: 1 },
          { at: 30, x: 0.66, state: 'lookUp', facing: 1 },
        ],
      },
      {
        // It turns around.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.68, cy: 0.63 },
          { at: 60, zoom: 1.55, cx: 0.66, cy: 0.66 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'look', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.66, state: 'lookUp', facing: 1 },
          { at: 24, x: 0.66, state: 'idle',   facing: 1 },
          { at: 40, x: 0.66, state: 'idle',   facing: -1 },
        ],
      },
      {
        // The rift entity spoke first.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.55, cx: 0.66, cy: 0.66 },
          { at: 40, zoom: 1.30, cx: 0.80, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'look', facing: 1 }],
        npcPos: [{ at: 0, x: 0.66, state: 'idle', facing: -1 }],
        extraFigures: [entityFig(0, 0.6, 0, 40)],
      },
      {
        // The entity speaks. For its line it is the speaking npc; the Herald stands
        // in as an extra figure so its body keeps its own colour. On "Discarded.
        // Fragment extracted." the Herald looks at its empty hands.
        letterbox: true,
        transition: 'none',
        npcColor: ENTITY,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.80, cy: 0.58 },
          { at: 60,  zoom: 1.25, cx: 0.74, cy: 0.56 },
          { at: 100, zoom: 1.40, cx: 0.70, cy: 0.62 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'look', facing: 1 }],
        npcPos: [
          { at: 0,   x: ENT_X, state: 'talk', facing: -1, alpha: 0.6 },
          { at: 130, x: ENT_X, state: 'idle', facing: -1, alpha: 0.6 },
        ],
        extraFigures: [{ color: '#ffffff', pos: [
          { at: 0,  x: 0.66, state: 'idle',  facing: -1, alpha: 1 },
          { at: 50, x: 0.66, state: 'look',  facing: 1,  alpha: 1 },
          { at: 85, x: 0.66, state: 'hands', facing: -1, alpha: 1 },
        ] }],
      },
      {
        // It sees the fragment burning in Kael's chest.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.66, cy: 0.63 },
          { at: 30,  zoom: 1.50, cx: 0.28, cy: 0.65 },
          { at: 150, zoom: 1.50, cx: 0.28, cy: 0.65 },
          { at: 180, zoom: 1.50, cx: 0.64, cy: 0.65 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look',   facing: 1 },
          { at: 40, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'hands', facing: -1 },
          { at: 20,  x: 0.66, state: 'look',  facing: -1 },
          { at: 190, x: 0.66, state: 'idle',  facing: -1 },
        ],
        extraFigures: [entityFig(0.6, 0.6, 0, 1)],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.70, startFrame: 30, fadeIn: 20 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.50, cx: 0.64, cy: 0.65 },
          { at: 120, zoom: 1.30, cx: 0.52, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.66, state: 'idle', facing: -1 },
          { at: 10, x: 0.66, state: 'walk', facing: -1, ease: 'linear' },
          { at: 44, x: 0.60, state: 'talk', facing: -1 },
        ],
        extraFigures: [entityFig(0.6, 0.6, 0, 1)],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.55 },
        ],
      },
      {
        // "I'd rather choose the second time. Make it a real fight."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.52, cy: 0.58 },
          { at: 160, zoom: 1.40, cx: 0.58, cy: 0.62 },
          { at: 190, zoom: 1.15, cx: 0.45, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.26, state: 'stance', facing: 1 },
          { at: 180, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.60, state: 'talk',   facing: -1 },
          { at: 100, x: 0.60, state: 'hands',  facing: -1 }, // "I've dissolved once already."
          { at: 140, x: 0.60, state: 'talk',   facing: -1 },
          { at: 172, x: 0.60, state: 'stance', facing: -1 }, // "Make it a real fight."
        ],
        extraFigures: [entityFig(0.6, 0, 40, 90)],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.55 },
          { type: 'fragment_pulse', color: '#ffffff', alpha: 0.30, startFrame: 172, fadeIn: 16 },
        ],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
