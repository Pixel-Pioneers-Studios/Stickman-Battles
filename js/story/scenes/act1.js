'use strict';
// Cinematic scene specs for act 1. Merged into window.STORY_SCENE_SPECS.
// Loads before js/smb-story-narrative-scene.js, which reads the table.
// 8 specs. Chapter ids 17, 19, 22, 24, 26, 29, 30, 31.
// One staged beat per text beat (tools/scene-strip/align.js). The voice can hold a
// beat past its frame budget, so every beat lands its action early and ends on a pose
// that can sit.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // Chapter 17: Between Worlds
  S[17] = {
    bg: 'fracture',
    npcColor: '#3ddc84',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 30,  zoom: 1.25, cx: 0.46, cy: 0.58 }, // meet the landing
          { at: 110, zoom: 1.15, cx: 0.48, cy: 0.54 },
        ],
        camShake: [{ at: 28, strength: 12, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.46, y: -0.50, state: 'fall',   facing: 1, alpha: 0.9, ease: 'linear' },
          { at: 28, x: 0.46, y: 0,     state: 'crouch', facing: 1, alpha: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.55, fadeIn: 10, portals: [
            { xf: 0.46, yf: 0.10, height: 0.30, color: '#9944ff', a: 0.80 },
            { xf: 0.16, yf: 0.24, height: 0.20, color: '#7722ee', a: 0.45 },
            { xf: 0.80, yf: 0.20, height: 0.24, color: '#aa66ff', a: 0.45 },
          ]},
        ],
        effects: [
          { type: 'screen_flash', color: '#7722ee', startFrame: 0, duration: 16, alpha: 0.30 },
          { type: 'speedlines', cx: 0.46, cy: 0.30, count: 22, color: '#9944ff', alpha: 0.50, startFrame: 0, duration: 30, fadeIn: 4 },
          { type: 'shockwave', cx: 0.46, cy: 0.72, color: '#aa66ff', startFrame: 28, duration: 28 },
          { type: 'impact_sparks', cx: 0.46, cy: 0.74, count: 10, color: '#cc99ff', startFrame: 28, duration: 24 },
        ],
      },
      {
        // No up, no down: he lifts off the floor and turns in the air.
        letterbox: true,
        transition: 'none',
        warp: 0.50,
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.48, cy: 0.54 },
          { at: 130, zoom: 1.05, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.46, state: 'crouch', facing: 1 },
          { at: 16,  x: 0.46, y: -0.06, state: 'float', facing: 1 },
          { at: 60,  x: 0.46, y: -0.12, state: 'float', facing: -1 },
          { at: 100, x: 0.46, y: -0.08, state: 'float', facing: 1 },
          { at: 130, x: 0.46, y: 0,     state: 'brace', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.45, portals: [
            { xf: 0.22, yf: 0.28, height: 0.24, color: '#8833dd', a: 0.60 },
            { xf: 0.70, yf: 0.22, height: 0.32, color: '#9944ee', a: 0.55 },
            { xf: 0.50, yf: 0.12, height: 0.20, color: '#aa55ff', a: 0.50 },
          ]},
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.45, fadeIn: 40 },
        ],
      },
      {
        // A remembered Veran, faint, beside him.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.30, cx: 0.55, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,  x: 0.46, state: 'brace',  facing: 1 },
          { at: 20, x: 0.46, state: 'look',   facing: 1 },
          { at: 90, x: 0.46, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.64, state: 'idle', facing: -1, alpha: 0 },
          { at: 30, x: 0.64, state: 'talk', facing: -1, alpha: 0.30 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.40 },
        ],
      },
      {
        // "Because it can." The Wanderer drops out of the sky.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.55, cy: 0.60 },
          { at: 70, zoom: 1.30, cx: 0.58, cy: 0.60 },
          { at: 90, zoom: 1.12, cx: 0.62, cy: 0.52 },
        ],
        camShake: [{ at: 80, strength: 12, dur: 20 }],
        playerPos: [
          { at: 0,   x: 0.46, state: 'stance', facing: 1 },
          { at: 82,  x: 0.46, state: 'brace',  facing: 1 },
          { at: 100, x: 0.46, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.64, state: 'talk',  facing: -1, alpha: 0.30 },
          { at: 90,  x: 0.64, state: 'point', facing: -1, alpha: 0.30 },
          { at: 130, x: 0.64, state: 'idle',  facing: -1, alpha: 0.12 },
        ],
        extraFigures: [
          { color: '#7744cc', pos: [
            { at: 0,   x: 0.80, y: -0.55, state: 'fall',   facing: -1, alpha: 0 },
            { at: 55,  x: 0.80, y: -0.55, state: 'fall',   facing: -1, alpha: 0 },
            { at: 56,  x: 0.80, y: -0.50, state: 'fall',   facing: -1, alpha: 0.95, ease: 'linear' },
            { at: 80,  x: 0.80, y: 0,     state: 'crouch', facing: -1, alpha: 0.95 },
            { at: 104, x: 0.80, y: 0,     state: 'stance', facing: -1, alpha: 0.95 },
          ] },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.50 },
        ],
        effects: [
          { type: 'shockwave', cx: 0.80, cy: 0.72, color: '#9966ff', startFrame: 80, duration: 28 },
          { type: 'impact_sparks', cx: 0.80, cy: 0.74, count: 12, color: '#aa88ff', startFrame: 80, duration: 26 },
        ],
      },
    ],
  };

  // Chapter 19: Mirror Fracture
  S[19] = {
    bg: 'city',
    npcColor: '#cc66cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.14, cy: 0.60 },
          { at: 100, zoom: 1.15, cx: 0.30, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.06,  state: 'walk', facing: 1, alpha: 0, ease: 'linear' },
          { at: 12,  x: 0.082, state: 'walk', facing: 1, alpha: 1, ease: 'linear' },
          { at: 100, x: 0.24,  state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'portal', xf: 0.06, yf: 0.52, height: 0.42, color: '#9944ff', alpha: 0.70, duration: 70 },
        ],
      },
      {
        // Everything inverted: a reflection walks toward him, step for step.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.30, cy: 0.54 },
          { at: 110, zoom: 1.05, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.24, state: 'look',  facing: 1 },
          { at: 30,  x: 0.24, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 100, x: 0.37, state: 'look',  facing: 1 },
          { at: 150, x: 0.37, state: 'hands', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: [
          { color: '#4488ff', pos: [
            { at: 0,   x: 0.76, state: 'look',  facing: -1, alpha: 0 },
            { at: 30,  x: 0.76, state: 'walk',  facing: -1, alpha: 0.40, ease: 'linear' },
            { at: 100, x: 0.63, state: 'look',  facing: -1, alpha: 0.40 },
            { at: 150, x: 0.63, state: 'hands', facing: -1, alpha: 0.40 },
          ] },
        ],
      },
      {
        // The reflection takes its own colour and steps out of the mirror.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 40,  zoom: 1.25, cx: 0.58, cy: 0.56 },
          { at: 150, zoom: 1.20, cx: 0.48, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.37, state: 'hands',  facing: 1 },
          { at: 40, x: 0.37, state: 'brace',  facing: 1 },
          { at: 90, x: 0.37, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.63, state: 'hands',  facing: -1, alpha: 0 },
          { at: 40,  x: 0.63, state: 'idle',   facing: -1, alpha: 1 },
          { at: 80,  x: 0.63, state: 'walk',   facing: -1, ease: 'linear' },
          { at: 120, x: 0.56, state: 'stance', facing: -1 },
        ],
        extraFigures: [
          { color: '#4488ff', pos: [
            { at: 0,  x: 0.63, state: 'hands', facing: -1, alpha: 0.40 },
            { at: 40, x: 0.63, state: 'hands', facing: -1, alpha: 0 },
          ] },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc66cc', startFrame: 40, duration: 14, alpha: 0.30 },
          { type: 'speedlines', cx: 0.63, cy: 0.52, count: 16, color: '#cc66cc', alpha: 0.50, startFrame: 40, duration: 24, fadeIn: 4 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.48, cy: 0.54 },
          { at: 60,  zoom: 1.35, cx: 0.54, cy: 0.60 },
          { at: 200, zoom: 1.25, cx: 0.46, cy: 0.56 },
        ],
        playerPos: [{ at: 0, x: 0.37, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.56, state: 'talk',   facing: -1 },
          { at: 150, x: 0.56, state: 'point',  facing: -1 }, // "back to yourself"
          { at: 210, x: 0.56, state: 'stance', facing: -1 },
        ],
      },
    ],
  };

  // Chapter 22: The Void Arena
  S[22] = {
    bg: 'fracture',
    npcColor: '#7700cc',
    beats: [
      {
        // Pan across dead space, then he drops onto a platform.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.70, cy: 0.50 },
          { at: 90,  zoom: 1.20, cx: 0.40, cy: 0.52 },
          { at: 240, zoom: 1.08, cx: 0.45, cy: 0.50 },
        ],
        camShake: [{ at: 84, strength: 6, dur: 14 }],
        playerPos: [
          { at: 0,   x: 0.30, y: -0.50, state: 'fall',   facing: 1, alpha: 0 },
          { at: 52,  x: 0.30, y: -0.50, state: 'fall',   facing: 1, alpha: 0 },
          { at: 54,  x: 0.30, y: -0.47, state: 'fall',   facing: 1, alpha: 1, ease: 'linear' },
          { at: 84,  x: 0.30, y: 0,     state: 'crouch', facing: 1 },
          { at: 120, x: 0.30, y: 0,     state: 'look',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.30, portals: [
            { xf: 0.62, yf: 0.30, height: 0.18, color: '#6600aa', a: 0.50 },
            { xf: 0.86, yf: 0.22, height: 0.22, color: '#440088', a: 0.45 },
          ]},
        ],
        effects: [
          { type: 'impact_sparks', cx: 0.30, cy: 0.74, count: 8, color: '#aa88ff', startFrame: 84, duration: 22 },
        ],
      },
      {
        // Something set up camp: the Collector rises from a crouch.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.08, cx: 0.45, cy: 0.50 },
          { at: 90,  zoom: 1.15, cx: 0.62, cy: 0.52 },
          { at: 180, zoom: 1.12, cx: 0.60, cy: 0.52 },
        ],
        camShake: [{ at: 110, strength: 8, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look', facing: 1 },
          { at: 20, x: 0.30, state: 'walk', facing: 1, ease: 'linear' },
          { at: 80, x: 0.41, state: 'look', facing: 1 },
          { at: 112, x: 0.41, state: 'brace', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.76, state: 'kneel', facing: -1, alpha: 0,   scale: 1.6 },
          { at: 70,  x: 0.76, state: 'kneel', facing: -1, alpha: 1,   scale: 1.6 },
          { at: 110, x: 0.76, state: 'idle',  facing: -1, alpha: 1,   scale: 1.6 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.50, startFrame: 100, fadeIn: 30 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.12, cx: 0.60, cy: 0.52 },
          { at: 60,  zoom: 1.30, cx: 0.66, cy: 0.58 },
          { at: 230, zoom: 1.30, cx: 0.66, cy: 0.58 },
          { at: 250, zoom: 1.35, cx: 0.42, cy: 0.60 }, // cut to him on "Refuse"
          { at: 330, zoom: 1.15, cx: 0.55, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.41, state: 'brace',  facing: 1 },
          { at: 30,  x: 0.41, state: 'stance', facing: 1 },
          { at: 250, x: 0.41, state: 'brace',  facing: 1 },
          { at: 300, x: 0.41, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.76, state: 'idle',   facing: -1, scale: 1.6 },
          { at: 20,  x: 0.76, state: 'walk',   facing: -1, scale: 1.6, ease: 'linear' },
          { at: 60,  x: 0.70, state: 'talk',   facing: -1, scale: 1.6 },
          { at: 240, x: 0.70, state: 'point',  facing: -1, scale: 1.6 },
          { at: 330, x: 0.70, state: 'stance', facing: -1, scale: 1.6 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.55 },
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.35, startFrame: 240, fadeIn: 20 },
        ],
      },
      {
        // He doesn't negotiate.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.55, cy: 0.52 },
          { at: 46,  zoom: 1.30, cx: 0.60, cy: 0.58 },
          { at: 120, zoom: 1.15, cx: 0.56, cy: 0.52 },
        ],
        camShake: [{ at: 46, strength: 14, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.41, state: 'stance', facing: 1 },
          { at: 10, x: 0.41, state: 'run',    facing: 1, ease: 'linear' },
          { at: 46, x: 0.58, state: 'attack', facing: 1 },
          { at: 80, x: 0.56, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'stance', facing: -1, scale: 1.6 },
          { at: 34, x: 0.70, state: 'guard',  facing: -1, scale: 1.6 },
          { at: 48, x: 0.72, state: 'brace',  facing: -1, scale: 1.6 },
          { at: 84, x: 0.72, state: 'stance', facing: -1, scale: 1.6 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.70, fadeIn: 12 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.45, cy: 0.52, count: 18, color: '#4488ff', alpha: 0.55, startFrame: 10, duration: 36, fadeIn: 4 },
          { type: 'screen_flash', color: '#4488ff', startFrame: 46, duration: 8, alpha: 0.28 },
          { type: 'shockwave', cx: 0.64, cy: 0.62, color: '#4488ff', startFrame: 46, duration: 28 },
          { type: 'impact_sparks', cx: 0.64, cy: 0.55, count: 14, color: '#88aaff', startFrame: 46, duration: 24 },
        ],
      },
    ],
  };

  // Chapter 24: Army of Echoes
  // The crowd: some look like people from his world (dull, ordinary colours), some
  // like nothing he'd imagine (fracture purples, wrong sizes).
  var ECHOES = [
    { x: 0.63, color: '#9a7a5a', scale: 1.00, state: 'idle',   facing: 1  },
    { x: 0.69, color: '#9955cc', scale: 1.25, state: 'look',   facing: -1 },
    { x: 0.75, color: '#7a8aa0', scale: 1.00, state: 'listen', facing: 1  },
    { x: 0.80, color: '#6622aa', scale: 0.80, state: 'idle',   facing: -1 },
    { x: 0.85, color: '#8a8070', scale: 1.00, state: 'look',   facing: 1  },
    { x: 0.91, color: '#cc66cc', scale: 1.30, state: 'idle',   facing: 1  },
    { x: 0.97, color: '#7733aa', scale: 0.85, state: 'look',   facing: -1 },
  ];
  function echoCrowd(beat) {
    return ECHOES.map(function (e, i) {
      var k = { x: e.x, state: e.state, facing: e.facing, scale: e.scale };
      function key(at, o) { return Object.assign({ at: at }, k, o); }
      var pos;
      if (beat === 0) {
        pos = [key(0, { alpha: 0 }), key(40, { alpha: 0 }), key(70 + i * 3, { alpha: 0.55 })];
      } else if (beat === 1) {
        // Every one of them turns to him as the line finishes.
        var turn = 168 + i * 5;
        pos = [key(0, { alpha: 0.55 }), key(turn, { alpha: 0.55 }),
               key(turn + 1, { state: 'stance', facing: -1, alpha: 0.80 })];
      } else {
        var front = i < 3;
        pos = [key(0, { state: 'stance', facing: -1, alpha: 0.80 })];
        if (front) pos.push(key(40 + i * 4, { state: 'walk', facing: -1, alpha: 0.80, ease: 'linear' }),
                            key(80 + i * 4, { x: e.x - 0.05, state: 'stance', facing: -1, alpha: 0.80 }));
      }
      return { color: e.color, pos: pos };
    });
  }

  S[24] = {
    bg: 'fracture',
    npcColor: '#9955cc',
    beats: [
      {
        // He skids in, the camera pulls back on what's waiting.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.14, cy: 0.60 },
          { at: 34, zoom: 1.35, cx: 0.20, cy: 0.60 },
          { at: 80, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.04, state: 'run',   facing: 1, ease: 'linear' },
          { at: 36, x: 0.20, state: 'brace', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.56, state: 'idle', facing: -1, alpha: 0 },
          { at: 40, x: 0.56, state: 'idle', facing: -1, alpha: 0 },
          { at: 70, x: 0.56, state: 'idle', facing: -1, alpha: 0.80 },
        ],
        extraFigures: echoCrowd(0),
      },
      {
        // Track along the crowd; snap back to him as they all turn.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 30,  zoom: 1.30, cx: 0.50, cy: 0.60 },
          { at: 166, zoom: 1.30, cx: 0.85, cy: 0.60, ease: 'linear' },
          { at: 186, zoom: 1.20, cx: 0.30, cy: 0.55 },
          { at: 500, zoom: 1.28, cx: 0.28, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,   x: 0.20, state: 'brace',  facing: 1 },
          { at: 40,  x: 0.20, state: 'look',   facing: 1 },
          { at: 186, x: 0.20, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.56, state: 'idle',   facing: 1,  alpha: 0.80 },
          { at: 172, x: 0.56, state: 'idle',   facing: 1,  alpha: 0.80 },
          { at: 173, x: 0.56, state: 'stance', facing: -1, alpha: 0.90 },
        ],
        extraFigures: echoCrowd(1),
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9955cc', alpha: 0.40, startFrame: 168, fadeIn: 16 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.30, cy: 0.55 },
          { at: 40,  zoom: 1.30, cx: 0.45, cy: 0.60 },
          { at: 100, zoom: 1.10, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.56, state: 'stance', facing: -1, alpha: 0.90 },
          { at: 6,  x: 0.56, state: 'walk',   facing: -1, alpha: 1, ease: 'linear' },
          { at: 40, x: 0.50, state: 'talk',   facing: -1 },
          { at: 80, x: 0.50, state: 'stance', facing: -1 },
        ],
        extraFigures: echoCrowd(2),
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9955cc', alpha: 0.50 },
        ],
      },
    ],
  };

  // Chapter 26: The Gate
  // Veran walks in with him as an extra figure; the Guardian is the speaking npc.
  var VERAN = '#3ddc84';
  S[26] = {
    bg: 'fracture',
    npcColor: '#6600aa',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.14, cy: 0.60 },
          { at: 90, zoom: 1.15, cx: 0.30, cy: 0.54 },
        ],
        camShake: [{ at: 60, strength: 8, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.10,  state: 'walk',   facing: 1, ease: 'linear' },
          { at: 80, x: 0.245, state: 'look',   facing: 1 },
          { at: 84, x: 0.245, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: [
          { color: VERAN, pos: [
            { at: 0,  x: 0.02,  state: 'walk',   facing: 1, alpha: 1, ease: 'linear' },
            { at: 80, x: 0.165, state: 'look',   facing: 1, alpha: 1 },
            { at: 88, x: 0.165, state: 'lookUp', facing: 1, alpha: 1 },
          ] },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.45, startFrame: 60, fadeIn: 20 },
        ],
      },
      {
        // It sent its best: the gate tears open.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.30, cy: 0.54 },
          { at: 40, zoom: 1.10, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.245, state: 'lookUp', facing: 1 },
          { at: 12, x: 0.245, state: 'brace',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: [
          { color: VERAN, pos: [
            { at: 0,  x: 0.165, state: 'lookUp', facing: 1, alpha: 1 },
            { at: 16, x: 0.165, state: 'brace',  facing: 1, alpha: 1 },
          ] },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.50 },
          { type: 'portal', xf: 0.76, yf: 0.48, height: 0.50, color: '#6600aa', alpha: 0.80, startFrame: 6, fadeIn: 20 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.76, cy: 0.48, count: 20, color: '#8833dd', alpha: 0.50, startFrame: 10, duration: 40, fadeIn: 6 },
        ],
      },
      {
        // The Guardian walks out wearing the faint shapes of the bearers it ate.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.58, cy: 0.50 },
          { at: 90,  zoom: 1.30, cx: 0.68, cy: 0.60 },
          { at: 290, zoom: 1.25, cx: 0.62, cy: 0.57 },
        ],
        playerPos: [
          { at: 0,  x: 0.245, state: 'brace',  facing: 1 },
          { at: 60, x: 0.245, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.80, state: 'walk',   facing: -1, alpha: 0,   scale: 1.5, ease: 'linear' },
          { at: 20,  x: 0.78, state: 'walk',   facing: -1, alpha: 0.6, scale: 1.5, ease: 'linear' },
          { at: 80,  x: 0.69, state: 'idle',   facing: -1, alpha: 1,   scale: 1.5 },
          { at: 110, x: 0.69, state: 'stance', facing: -1, alpha: 1,   scale: 1.5 },
        ],
        extraFigures: [
          { color: VERAN, pos: [{ at: 0, x: 0.165, state: 'stance', facing: 1, alpha: 1 }] },
          { color: '#aa66ff', pos: [
            { at: 0,   x: 0.72, state: 'look',  facing: -1, alpha: 0,    scale: 1.4 },
            { at: 110, x: 0.72, state: 'look',  facing: -1, alpha: 0.22, scale: 1.4 },
            { at: 200, x: 0.72, state: 'look',  facing: -1, alpha: 0.10, scale: 1.4 },
          ] },
          { color: '#66aaff', pos: [
            { at: 0,   x: 0.66, state: 'reach', facing: -1, alpha: 0,    scale: 1.4 },
            { at: 130, x: 0.66, state: 'reach', facing: -1, alpha: 0.20, scale: 1.4 },
            { at: 230, x: 0.66, state: 'reach', facing: -1, alpha: 0.08, scale: 1.4 },
          ] },
          { color: '#ff66aa', pos: [
            { at: 0,   x: 0.70, state: 'kneel', facing: -1, alpha: 0,    scale: 1.4 },
            { at: 150, x: 0.70, state: 'kneel', facing: -1, alpha: 0.20, scale: 1.4 },
            { at: 260, x: 0.70, state: 'kneel', facing: -1, alpha: 0.08, scale: 1.4 },
          ] },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.76, yf: 0.48, height: 0.50, color: '#6600aa', alpha: 0.80 },
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.60 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.25, cx: 0.62, cy: 0.57 },
          { at: 40,  zoom: 1.15, cx: 0.45, cy: 0.52 }, // widen to take in Veran
          { at: 200, zoom: 1.20, cx: 0.50, cy: 0.54 },
        ],
        playerPos: [{ at: 0, x: 0.245, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.69, state: 'talk',   facing: -1, scale: 1.5 },
          { at: 40,  x: 0.69, state: 'point',  facing: -1, scale: 1.5 }, // "She stays behind."
          { at: 140, x: 0.69, state: 'talk',   facing: -1, scale: 1.5 },
          { at: 230, x: 0.69, state: 'stance', facing: -1, scale: 1.5 },
        ],
        extraFigures: [
          { color: VERAN, pos: [
            { at: 0,  x: 0.165, state: 'stance', facing: 1, alpha: 1 },
            { at: 60, x: 0.165, state: 'listen', facing: 1, alpha: 1 },
          ] },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.76, yf: 0.48, height: 0.50, color: '#6600aa', alpha: 0.65 },
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.50 },
        ],
      },
      {
        // He looks back at her. She nods.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.54 },
          { at: 30, zoom: 1.45, cx: 0.22, cy: 0.64 },
        ],
        playerPos: [
          { at: 0, x: 0.245, state: 'stance', facing: 1 },
          { at: 8, x: 0.245, state: 'look',   facing: -1 },
        ],
        npcPos: [{ at: 0, x: 0.69, state: 'stance', facing: -1, scale: 1.5 }],
        extraFigures: [
          { color: VERAN, pos: [
            { at: 0,  x: 0.165, state: 'listen', facing: 1, alpha: 1 },
            { at: 30, x: 0.165, state: 'look',   facing: 1, alpha: 1 },
            { at: 50, x: 0.165, state: 'listen', facing: 1, alpha: 1 },
          ] },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.76, yf: 0.48, height: 0.50, color: '#6600aa', alpha: 0.65 },
        ],
      },
      {
        // "Already walking."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.22, cy: 0.64 },
          { at: 40,  zoom: 1.25, cx: 0.32, cy: 0.56 },
          { at: 100, zoom: 1.15, cx: 0.50, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.245, state: 'look',   facing: -1 },
          { at: 20, x: 0.245, state: 'stance', facing: 1 },
          { at: 30, x: 0.245, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 90, x: 0.355, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.69, state: 'stance', facing: -1, scale: 1.5 }],
        extraFigures: [
          { color: VERAN, pos: [
            { at: 0,  x: 0.165, state: 'listen', facing: 1, alpha: 1 },
            { at: 50, x: 0.165, state: 'idle',   facing: 1, alpha: 1 },
          ] },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.76, yf: 0.48, height: 0.50, color: '#6600aa', alpha: 0.65 },
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.45 },
        ],
      },
    ],
  };

  // Chapter 29: Deep Fragment
  // The forty-seven who failed, shown as six faint fallen bearers.
  var FALLEN = [
    { x: 0.36, color: '#665566', state: 'kneel'  },
    { x: 0.42, color: '#556677', state: 'crouch' },
    { x: 0.54, color: '#776655', state: 'kneel'  },
    { x: 0.60, color: '#556655', state: 'crouch' },
    { x: 0.66, color: '#665577', state: 'kneel'  },
    { x: 0.72, color: '#776666', state: 'crouch' },
  ];
  S[29] = {
    bg: 'volcano',
    npcColor: '#880044',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.16, cy: 0.60 },
          { at: 90, zoom: 1.10, cx: 0.35, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.10,  state: 'walk',   facing: 1, ease: 'linear' },
          { at: 80, x: 0.245, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.50, alpha: 0.60, fadeIn: 30 },
        ],
        effects: [
          { type: 'screen_flash', color: '#000000', startFrame: 0, duration: 40, alpha: 0.80 },
        ],
      },
      {
        // He walks among the ones who failed here.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.35, cy: 0.50 },
          { at: 160, zoom: 1.20, cx: 0.55, cy: 0.54 },
          { at: 280, zoom: 1.20, cx: 0.58, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.245, state: 'lookUp', facing: 1 },
          { at: 20,  x: 0.245, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 140, x: 0.46,  state: 'look',   facing: 1 },
          { at: 200, x: 0.46,  state: 'look',   facing: -1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: FALLEN.map(function (g, i) {
          return { color: g.color, pos: [
            { at: 0,            x: g.x, state: g.state, facing: i % 2 ? -1 : 1, alpha: 0 },
            { at: 20 + i * 12,  x: g.x, state: g.state, facing: i % 2 ? -1 : 1, alpha: 0 },
            { at: 60 + i * 12,  x: g.x, state: g.state, facing: i % 2 ? -1 : 1, alpha: 0.22 },
          ] };
        }),
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.50, alpha: 0.60 },
        ],
      },
      {
        // The champion draws them in. Each ghost drifts to it and is gone.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.58, cy: 0.54 },
          { at: 160, zoom: 1.30, cx: 0.70, cy: 0.60 },
          { at: 380, zoom: 1.30, cx: 0.68, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,  x: 0.46, state: 'look',   facing: -1 },
          { at: 30, x: 0.46, state: 'look',   facing: 1 },
          { at: 60, x: 0.46, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.78, state: 'kneel', facing: 1, alpha: 0,   scale: 1.35 },
          { at: 60,  x: 0.78, state: 'kneel', facing: 1, alpha: 0.5, scale: 1.35 },
          { at: 170, x: 0.78, state: 'kneel', facing: 1, alpha: 1,   scale: 1.35 },
          { at: 200, x: 0.78, state: 'idle',  facing: 1, alpha: 1,   scale: 1.35 },
        ],
        extraFigures: FALLEN.map(function (g, i) {
          var f = i % 2 ? -1 : 1;
          return { color: g.color, pos: [
            { at: 0,            x: g.x,  state: g.state, facing: f, alpha: 0.22 },
            { at: 40 + i * 10,  x: g.x,  state: 'float', facing: 1, alpha: 0.22, ease: 'linear' },
            { at: 110 + i * 10, x: 0.78, state: 'float', facing: 1, alpha: 0 },
          ] };
        }),
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.60, alpha: 0.65 },
          { type: 'fragment_pulse', color: '#880044', alpha: 0.55, startFrame: 40, fadeIn: 60 },
        ],
        effects: [
          { type: 'energy_burst', cx: 0.78, cy: 0.55, color: '#aa0055', startFrame: 170, duration: 30 },
        ],
      },
      {
        // It looked at you.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.68, cy: 0.60 },
          { at: 20, zoom: 1.60, cx: 0.78, cy: 0.68 },
        ],
        playerPos: [{ at: 0, x: 0.46, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.78, state: 'idle', facing: 1,  scale: 1.35 },
          { at: 14, x: 0.78, state: 'look', facing: -1, scale: 1.35 },
        ],
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.60, alpha: 0.65 },
          { type: 'fragment_pulse', color: '#880044', alpha: 0.55 },
        ],
      },
      {
        // "Forty-eight."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.60, cx: 0.78, cy: 0.68 },
          { at: 10, zoom: 1.15, cx: 0.62, cy: 0.52 },
          { at: 90, zoom: 1.22, cx: 0.62, cy: 0.55 },
        ],
        camShake: [{ at: 8, strength: 10, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.46, state: 'stance', facing: 1 },
          { at: 10, x: 0.46, state: 'brace',  facing: 1 },
          { at: 40, x: 0.46, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.78, state: 'look',   facing: -1, scale: 1.35 },
          { at: 8,  x: 0.78, state: 'point',  facing: -1, scale: 1.35 },
          { at: 70, x: 0.78, state: 'stance', facing: -1, scale: 1.35 },
        ],
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.70, alpha: 0.70 },
          { type: 'fragment_pulse', color: '#880044', alpha: 0.65 },
        ],
        effects: [
          { type: 'screen_flash', color: '#880044', startFrame: 8, duration: 12, alpha: 0.30 },
          { type: 'energy_burst', cx: 0.78, cy: 0.55, color: '#aa0055', startFrame: 8, duration: 28 },
          { type: 'speedlines', cx: 0.78, cy: 0.52, count: 20, color: '#880044', alpha: 0.50, startFrame: 8, duration: 26, fadeIn: 4 },
        ],
      },
    ],
  };

  // Chapter 30: The Weight of It
  // A quiet two-hander in the chamber before the Core's Eye.
  S[30] = {
    bg: 'level', level: { ch: 31, x: 480 },
    npcColor: '#3ddc84',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.26, cy: 0.54 },
          { at: 110, zoom: 1.08, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.12, state: 'walk', facing: 1, ease: 'linear' },
          { at: 100, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.06, state: 'idle', facing: 1, alpha: 0, show: false }],
      },
      {
        // Just you and Veran. He steps into the light; she follows to its edge.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.08, cx: 0.48, cy: 0.50 },
          { at: 90, zoom: 1.12, cx: 0.40, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.30, state: 'look', facing: 1 },
          { at: 6,   x: 0.30, state: 'walk', facing: 1, ease: 'linear' },
          { at: 106, x: 0.48, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.06, state: 'walk', facing: 1, ease: 'linear' },
          { at: 110, x: 0.26, state: 'idle', facing: 1 },
        ],
      },
      {
        // She turns away to say it.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.40, cy: 0.52 },
          { at: 60, zoom: 1.35, cx: 0.40, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,  x: 0.48, state: 'idle', facing: 1 },
          { at: 30, x: 0.48, state: 'look', facing: -1 },
        ],
        npcPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 10, x: 0.26, state: 'walk', facing: 1, ease: 'linear' },
          { at: 50, x: 0.33, state: 'look', facing: -1 },
          { at: 60, x: 0.33, state: 'talk', facing: -1 },
        ],
      },
      {
        // The anchor is the fragment inside him. He looks at his hands.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.40, cy: 0.60 },
          { at: 120, zoom: 1.35, cx: 0.38, cy: 0.60 },
          { at: 140, zoom: 1.50, cx: 0.48, cy: 0.65 },
          { at: 400, zoom: 1.40, cx: 0.44, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,   x: 0.48, state: 'look',   facing: -1 },
          { at: 60,  x: 0.48, state: 'listen', facing: -1 },
          { at: 130, x: 0.48, state: 'hands',  facing: -1 },
        ],
        npcPos: [
          { at: 0,   x: 0.33, state: 'talk',  facing: -1 },
          { at: 20,  x: 0.33, state: 'talk',  facing: 1 },
          { at: 120, x: 0.33, state: 'point', facing: 1 },
          { at: 190, x: 0.33, state: 'talk',  facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.60, startFrame: 120, fadeIn: 20 },
        ],
      },
      {
        // No bearer has survived: the dead show faintly behind them.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.44, cy: 0.62 },
          { at: 100, zoom: 1.15, cx: 0.58, cy: 0.52 },
          { at: 210, zoom: 1.35, cx: 0.42, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,   x: 0.48, state: 'hands',  facing: -1 },
          { at: 200, x: 0.48, state: 'listen', facing: -1 },
        ],
        npcPos: [
          { at: 0,   x: 0.33, state: 'talk', facing: 1 },
          { at: 20,  x: 0.33, state: 'walk', facing: 1, ease: 'linear' },
          { at: 50,  x: 0.38, state: 'talk', facing: 1 },
          { at: 120, x: 0.38, state: 'look', facing: -1 },
          { at: 200, x: 0.38, state: 'talk', facing: 1 },
        ],
        extraFigures: [0.70, 0.80, 0.90].map(function (x) {
          return { color: '#556677', pos: [
            { at: 0,   x: x, state: 'kneel', facing: -1, alpha: 0 },
            { at: 110, x: x, state: 'kneel', facing: -1, alpha: 0.18 },
            { at: 200, x: x, state: 'kneel', facing: -1, alpha: 0 },
          ] };
        }),
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.60 },
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.35, startFrame: 190, fadeIn: 30 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.42, cy: 0.60 },
          { at: 200, zoom: 1.45, cx: 0.45, cy: 0.63 },
        ],
        playerPos: [{ at: 0, x: 0.48, state: 'listen', facing: -1 }],
        npcPos: [
          { at: 0,  x: 0.38,  state: 'talk', facing: 1 },
          { at: 60, x: 0.38,  state: 'walk', facing: 1, ease: 'linear' },
          { at: 80, x: 0.415, state: 'talk', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.70 },
        ],
      },
      {
        // A long silence. He turns to the door.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.45, cy: 0.63 },
          { at: 90, zoom: 1.08, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.48, state: 'listen', facing: -1 },
          { at: 40, x: 0.48, state: 'look',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.415, state: 'idle', facing: 1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.50 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.08, cx: 0.55, cy: 0.50 },
          { at: 20,  zoom: 1.30, cx: 0.50, cy: 0.58 },
          { at: 140, zoom: 1.20, cx: 0.55, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.48, state: 'look',   facing: 1 },
          { at: 14, x: 0.48, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.415, state: 'idle',   facing: 1 },
          { at: 30, x: 0.415, state: 'look',   facing: 1 },
          { at: 60, x: 0.415, state: 'stance', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.85, fadeIn: 12 },
        ],
        effects: [
          { type: 'energy_burst', cx: 0.48, cy: 0.58, color: '#4488ff', startFrame: 14, duration: 28 },
          { type: 'screen_flash', color: '#4488ff', startFrame: 14, duration: 10, alpha: 0.25 },
        ],
      },
    ],
  };

  // Chapter 31: Core Entry
  S[31] = {
    bg: 'fracture',
    npcColor: '#6633cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.14, cy: 0.60 },
          { at: 90, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.08,  state: 'walk',   facing: 1, ease: 'linear' },
          { at: 80, x: 0.225, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.68, state: 'float', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
        ],
      },
      {
        // Fracture energy condenses into the shape of a fighter.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 140, zoom: 1.20, cx: 0.62, cy: 0.50 },
          { at: 160, zoom: 1.10, cx: 0.55, cy: 0.50 },
          { at: 380, zoom: 1.15, cx: 0.50, cy: 0.52 },
        ],
        camShake: [{ at: 150, strength: 10, dur: 20 }],
        playerPos: [
          { at: 0,   x: 0.225, state: 'lookUp', facing: 1 },
          { at: 150, x: 0.225, state: 'brace',  facing: 1 },
          { at: 200, x: 0.225, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.68, y: -0.25, state: 'float',  facing: -1, alpha: 0,   scale: 1.2 },
          { at: 40,  x: 0.68, y: -0.22, state: 'float',  facing: -1, alpha: 0.3, scale: 1.2 },
          { at: 120, x: 0.68, y: -0.10, state: 'float',  facing: -1, alpha: 0.7, scale: 1.2 },
          { at: 150, x: 0.68, y: 0,     state: 'crouch', facing: -1, alpha: 1,   scale: 1.2 },
          { at: 180, x: 0.68, y: 0,     state: 'stance', facing: -1, alpha: 1,   scale: 1.2 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.55, fadeIn: 40 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.68, cy: 0.45, count: 24, color: '#8855ee', alpha: 0.45, startFrame: 0, duration: 150, fadeIn: 30 },
          { type: 'energy_burst', cx: 0.68, cy: 0.58, color: '#8855ee', startFrame: 150, duration: 30 },
          { type: 'screen_flash', color: '#6633cc', startFrame: 150, duration: 12, alpha: 0.30 },
        ],
      },
      {
        // Power. Safety. Revenge. The bearers who wanted them flicker behind it.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.50, cy: 0.52 },
          { at: 60,  zoom: 1.30, cx: 0.62, cy: 0.58 },
          { at: 150, zoom: 1.15, cx: 0.72, cy: 0.52 },
          { at: 300, zoom: 1.20, cx: 0.55, cy: 0.54 },
        ],
        playerPos: [{ at: 0, x: 0.225, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.68, state: 'stance', facing: -1, scale: 1.2 },
          { at: 10, x: 0.68, state: 'walk',   facing: -1, scale: 1.2, ease: 'linear' },
          { at: 50, x: 0.61, state: 'talk',   facing: -1, scale: 1.2 },
        ],
        extraFigures: [
          { x: 0.76, color: '#ffcc44', state: 'stance', at: 118 },
          { x: 0.84, color: '#44ccff', state: 'guard',  at: 128 },
          { x: 0.92, color: '#ff4444', state: 'attack', at: 138 },
        ].map(function (g) {
          return { color: g.color, pos: [
            { at: 0,         x: g.x, state: g.state, facing: -1, alpha: 0 },
            { at: g.at,      x: g.x, state: g.state, facing: -1, alpha: 0 },
            { at: g.at + 8,  x: g.x, state: g.state, facing: -1, alpha: 0.30 },
            { at: 260,       x: g.x, state: g.state, facing: -1, alpha: 0 },
          ] };
        }),
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.50 },
        ],
      },
      {
        // "What do you want?" On it, then on him. He says nothing.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.55, cy: 0.54 },
          { at: 20, zoom: 1.45, cx: 0.60, cy: 0.63 },
          { at: 55, zoom: 1.45, cx: 0.60, cy: 0.63 },
          { at: 65, zoom: 1.70, cx: 0.20, cy: 0.68 },
        ],
        playerPos: [{ at: 0, x: 0.225, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.61, state: 'talk', facing: -1, scale: 1.2 },
          { at: 30, x: 0.61, state: 'idle', facing: -1, scale: 1.2 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.45 },
        ],
      },
      {
        // You didn't answer. You fought.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.70, cx: 0.20, cy: 0.68 },
          { at: 12,  zoom: 1.10, cx: 0.40, cy: 0.50 },
          { at: 68,  zoom: 1.25, cx: 0.54, cy: 0.56 },
          { at: 140, zoom: 1.12, cx: 0.50, cy: 0.52 },
        ],
        camShake: [{ at: 68, strength: 14, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.225, state: 'stance', facing: 1 },
          { at: 8,  x: 0.225, state: 'run',    facing: 1, ease: 'linear' },
          { at: 68, x: 0.49,  state: 'attack', facing: 1 },
          { at: 100, x: 0.47, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.61, state: 'idle',   facing: -1, scale: 1.2 },
          { at: 56,  x: 0.61, state: 'guard',  facing: -1, scale: 1.2 },
          { at: 70,  x: 0.63, state: 'brace',  facing: -1, scale: 1.2 },
          { at: 104, x: 0.63, state: 'stance', facing: -1, scale: 1.2 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.85, fadeIn: 8 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.38, cy: 0.52, count: 24, color: '#4488ff', alpha: 0.65, startFrame: 8, duration: 60, fadeIn: 5 },
          { type: 'screen_flash', color: '#4488ff', startFrame: 68, duration: 10, alpha: 0.30 },
          { type: 'shockwave', cx: 0.55, cy: 0.64, color: '#4488ff', startFrame: 68, duration: 28 },
          { type: 'impact_sparks', cx: 0.55, cy: 0.55, count: 16, color: '#88aaff', startFrame: 68, duration: 25 },
          { type: 'ground_crack', cx: 0.55, cy: 0.70, color: '#4466ff', startFrame: 68, duration: 30 },
        ],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
