'use strict';
// Cinematic scene specs for act4. Split out of the old js/smb-story-scenes.js.
// Each file merges into window.STORY_SCENE_SPECS, so load all of them before js/smb-story-narrative-scene.js.
// Chapter ids: 128, 129, 131, 135, 138, 141, 143, 144.
// One staged beat per text beat (tools/scene-strip/align.js). The voice can hold a
// beat past its frame budget, so every beat lands its action early and ends on a pose
// that can sit.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  var KAEL = '#4488ff', VERAN = '#3ddc84', ENTITY = '#8844ff';
  var SECOND = '#9ccc3c', FOURTH = '#d8a050';
  var CREATOR = '#ff8822', CREATOR2 = '#ff4400', SOLDIER = '#3f6fb0', ENF = '#cc2244', SOV = '#cc44ff';

  // Each beat makes its speaker the npc (bubble + body colour); everyone else keeps
  // a fixed extraFigures slot, hidden while they speak. See act3.js.
  function cast(people, who) {
    var out = { extraFigures: [] };
    for (var i = 0; i < people.length; i++) {
      var p = people[i];
      if (i === who) {
        out.npcPos = p.pos;
        out.npcColor = p.c;
        out.extraFigures.push({ color: p.c, pos: [{ at: 0, x: p.pos[0].x, state: 'idle', facing: 1, alpha: 0 }] });
      } else {
        out.extraFigures.push({ color: p.c, pos: p.pos });
      }
    }
    if (who < 0) out.npcPos = [{ at: 0, x: 0.5, state: 'idle', facing: 1, alpha: 0, show: false }];
    return out;
  }
  function beat(base, people, who) {
    var c = cast(people, who);
    var extra = base.extraFigures || [];
    for (var k in c) base[k] = c[k];
    base.extraFigures = base.extraFigures.concat(extra);
    return base;
  }
  function still(c, x, state, facing, alpha) {
    return { c: c, pos: [{ at: 0, x: x, state: state, facing: facing, alpha: alpha === undefined ? 1 : alpha }] };
  }
  // A bodiless voice: the npc is hidden and the bubble is placed by bubbleX.
  var NO_NPC = [{ at: 0, x: 0.5, state: 'idle', facing: 1, alpha: 0, show: false }];

  // Chapter 128: The Architecture
  // The Architects stop at the threshold. Veran's absence is a faint figure that
  // isn't there.
  var VERAN_GHOST = function (t0, t1, t2) {
    return { color: VERAN, pos: [
      { at: 0,  x: 0.42, state: 'idle', facing: -1, alpha: 0 },
      { at: t0, x: 0.42, state: 'idle', facing: -1, alpha: 0 },
      { at: t1, x: 0.42, state: 'idle', facing: -1, alpha: 0.18 },
      { at: t2, x: 0.42, state: 'idle', facing: -1, alpha: 0 },
    ] };
  };
  S[128] = {
    bg: 'city',
    npcColor: SECOND,
    beats: [
      beat({
        // The Architects waited at the threshold.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.60, cy: 0.48 },
          { at: 110, zoom: 1.15, cx: 0.32, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.36, state: 'look', facing: 1 },
          { at: 80, x: 0.36, state: 'look', facing: -1 },
        ],
      }, [still(SECOND, 0.14, 'idle', 1), still(FOURTH, 0.24, 'idle', 1)], -1),
      beat({
        // "We're made of the same material it's trying to dissolve."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.32, cy: 0.52 },
          { at: 60,  zoom: 1.35, cx: 0.26, cy: 0.60 },
        ],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: -1 }],
      }, [
        { c: SECOND, pos: [
          { at: 0,   x: 0.14, state: 'talk',  facing: 1 },
          { at: 200, x: 0.14, state: 'hands', facing: 1 },
          { at: 300, x: 0.14, state: 'talk',  facing: 1 },
        ] },
        still(FOURTH, 0.24, 'listen', 1),
      ], 0),
      beat({
        // "The fragment bearer goes alone."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.26, cy: 0.60 },
          { at: 60,  zoom: 1.35, cx: 0.30, cy: 0.60 },
        ],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: -1 }],
      }, [
        still(SECOND, 0.14, 'look', 1),
        { c: FOURTH, pos: [
          { at: 0,  x: 0.24, state: 'talk',  facing: 1 },
          { at: 60, x: 0.24, state: 'point', facing: 1 },
          { at: 150, x: 0.24, state: 'talk', facing: 1 },
        ] },
      ], 1),
      beat({
        // She was gone. The Second Architect started to say it. Then didn't.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.30, cy: 0.60 },
          { at: 110, zoom: 1.45, cx: 0.22, cy: 0.63 },
        ],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: -1 }],
        extraFigures: [VERAN_GHOST(0, 30, 100)],
      }, [
        { c: SECOND, pos: [
          { at: 0,   x: 0.14, state: 'look',  facing: 1 },
          { at: 110, x: 0.14, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 130, x: 0.17, state: 'reach', facing: 1 },
          { at: 180, x: 0.17, state: 'look',  facing: 1 },
          { at: 230, x: 0.17, state: 'idle',  facing: -1 },
        ] },
        still(FOURTH, 0.24, 'look', 1),
      ], -1),
      beat({
        // A hand on your shoulder.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.22, cy: 0.63 },
          { at: 60, zoom: 1.50, cx: 0.32, cy: 0.64 },
        ],
        playerPos: [
          { at: 0,  x: 0.36, state: 'idle',   facing: -1 },
          { at: 44, x: 0.36, state: 'listen', facing: -1 },
        ],
      }, [
        still(SECOND, 0.17, 'idle', -1),
        { c: FOURTH, pos: [
          { at: 0,  x: 0.24, state: 'look',  facing: 1 },
          { at: 6,  x: 0.24, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 38, x: 0.31, state: 'reach', facing: 1 },
        ] },
      ], -1),
      beat({
        // "Come back."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.50, cx: 0.32, cy: 0.64 },
          { at: 60, zoom: 1.60, cx: 0.33, cy: 0.66 },
        ],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: -1 }],
      }, [
        still(SECOND, 0.17, 'idle', -1),
        { c: FOURTH, pos: [
          { at: 0,  x: 0.31, state: 'reach', facing: 1 },
          { at: 70, x: 0.31, state: 'idle',  facing: 1 },
        ] },
      ], 1),
      beat({
        // Those words, in a different voice. He turns away before the thought ends.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.60, cx: 0.33, cy: 0.66 },
          { at: 150, zoom: 1.40, cx: 0.38, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,   x: 0.36, state: 'listen', facing: -1 },
          { at: 40,  x: 0.36, state: 'hands',  facing: -1 },
          { at: 120, x: 0.36, state: 'look',   facing: 1 },
        ],
        extraFigures: [VERAN_GHOST(20, 50, 110)],
      }, [still(SECOND, 0.17, 'idle', -1), still(FOURTH, 0.31, 'idle', 1)], -1),
      beat({
        // Into the architecture. Not built for living things.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.38, cy: 0.62 },
          { at: 160, zoom: 1.10, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.36, state: 'look', facing: 1 },
          { at: 12,  x: 0.36, state: 'walk', facing: 1, ease: 'linear' },
          { at: 110, x: 0.54, state: 'look', facing: 1 },
          { at: 150, x: 0.54, state: 'lookUp', facing: 1 },
        ],
      }, [still(SECOND, 0.17, 'look', 1), still(FOURTH, 0.31, 'look', 1)], -1),
    ],
  };

  // Chapter 129: Architecture Soldiers
  // The corridor screens replay Kael's fights. The two soldiers copy his stance.
  function soldiers(phase) {
    return [0.66, 0.80].map(function (x, i) {
      if (phase === 'copy') {
        return { color: SOLDIER, pos: [
          { at: 0,   x: x, state: 'stance', facing: -1 },
          { at: 156, x: x, state: 'guard',  facing: -1 },
          { at: 216, x: x, state: 'stance', facing: -1 },
        ] };
      }
      return { color: SOLDIER, pos: [{ at: 0, x: x, state: 'stance', facing: -1 }] };
    });
  }
  S[129] = {
    bg: 'city',
    npcColor: SOLDIER,
    beats: [
      {
        // Two of them.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.20, cy: 0.58 },
          { at: 80, zoom: 1.10, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.14, state: 'walk', facing: 1, ease: 'linear' },
          { at: 72, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: soldiers(),
      },
      {
        // They didn't speak. Didn't posture.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.45, cy: 0.50 },
          { at: 40, zoom: 1.55, cx: 0.74, cy: 0.66 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos: NO_NPC,
        extraFigures: soldiers(),
      },
      {
        // Already in position. As if they'd known.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.55, cx: 0.74, cy: 0.66 },
          { at: 50,  zoom: 1.40, cx: 0.30, cy: 0.62 },
          { at: 220, zoom: 1.30, cx: 0.32, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',  facing: 1 },
          { at: 50, x: 0.28, state: 'brace', facing: 1 },
          { at: 90, x: 0.28, state: 'look',  facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: soldiers(),
      },
      {
        // The screens: every fight he'd won, used against him. They copy his guard.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.32, cy: 0.58 },
          { at: 60,  zoom: 1.15, cx: 0.50, cy: 0.30 },
          { at: 130, zoom: 1.15, cx: 0.50, cy: 0.30 },
          { at: 170, zoom: 1.15, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.28, state: 'look',   facing: 1 },
          { at: 150, x: 0.28, state: 'guard',  facing: 1 },
          { at: 210, x: 0.28, state: 'stance', facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: soldiers('copy'),
      },
    ],
  };

  // Chapter 131: Twin Enforcers
  // The twins walk out of the far arch and move in sync.
  function twins(phase) {
    return [0.58, 0.74].map(function (x, i) {
      if (phase === 'arrive') {
        return { color: ENF, pos: [
          { at: 0,           x: 0.66, state: 'walk',   facing: i ? 1 : -1, alpha: 0, ease: 'linear' },
          { at: 20,          x: 0.66, state: 'walk',   facing: i ? 1 : -1, alpha: 1, ease: 'linear' },
          { at: 70,          x: x,    state: 'stance', facing: -1, alpha: 1 },
        ] };
      }
      if (phase === 'sync') {
        return { color: ENF, pos: [
          { at: 0,   x: x, state: 'stance', facing: -1 },
          { at: 90,  x: x, state: 'look',   facing: 1 },
          { at: 130, x: x, state: 'stance', facing: -1 },
        ] };
      }
      return { color: ENF, pos: [{ at: 0, x: x, state: 'stance', facing: -1 }] };
    });
  }
  S[131] = {
    bg: 'city',
    npcColor: ENTITY,
    beats: [
      {
        // The Enforcers arrived as the architecture shifted.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 110, zoom: 1.20, cx: 0.56, cy: 0.54 },
        ],
        camShake: [{ at: 10, strength: 10, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',  facing: 1 },
          { at: 12, x: 0.28, state: 'brace', facing: 1 },
          { at: 60, x: 0.28, state: 'look',  facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: twins('arrive'),
        effects: [
          { type: 'static_noise', alpha: 0.25, startFrame: 8, duration: 30 },
        ],
      },
      {
        // Upgraded. The Creator had processed the first fight.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.56, cy: 0.54 },
          { at: 60,  zoom: 1.45, cx: 0.66, cy: 0.63 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos: NO_NPC,
        extraFigures: twins('stand'),
      },
      {
        // "Hit one, the other already knows." They turn as one.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.66, cy: 0.63 },
          { at: 60,  zoom: 1.20, cx: 0.50, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',   facing: 1 },
          { at: 40, x: 0.28, state: 'listen', facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: twins('sync'),
        effects: [{ type: 'static_noise', alpha: 0.20, duration: 30 }],
        bubbleX: 0.32,
      },
      {
        // "How?" you asked.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.54 },
          { at: 30, zoom: 1.40, cx: 0.30, cy: 0.62 },
        ],
        playerPos: [
          { at: 0, x: 0.28, state: 'listen', facing: 1 },
          { at: 6, x: 0.28, state: 'talk',   facing: 1 },
          { at: 60, x: 0.28, state: 'look',  facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: twins('stand'),
      },
      {
        // "Hit both at the same time."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.30, cy: 0.62 },
          { at: 60, zoom: 1.35, cx: 0.32, cy: 0.60 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos: NO_NPC,
        extraFigures: twins('stand'),
        effects: [{ type: 'static_noise', alpha: 0.18, duration: 24 }],
        bubbleX: 0.32,
      },
      {
        // Not helpful. You went in anyway.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.32, cy: 0.60 },
          { at: 16, zoom: 1.10, cx: 0.45, cy: 0.50 },
          { at: 80, zoom: 1.20, cx: 0.48, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',   facing: 1 },
          { at: 30, x: 0.28, state: 'run',    facing: 1, ease: 'linear' },
          { at: 66, x: 0.44, state: 'stance', facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: twins('stand'),
        effects: [
          { type: 'speedlines', cx: 0.30, cy: 0.52, count: 16, color: '#88aaff', alpha: 0.45, startFrame: 30, duration: 36, fadeIn: 4 },
        ],
      },
    ],
  };

  // Chapter 135: Purge Sequence
  // The level's countdown reads 00:29. Soldiers materialise one at a time.
  function purge(spawn) {
    return [0.60, 0.70, 0.80, 0.90].map(function (x, i) {
      if (!spawn) return { color: SOLDIER, pos: [{ at: 0, x: x, state: 'stance', facing: -1 }] };
      var t = 40 + i * 50;
      return { color: SOLDIER, pos: [
        { at: 0,      x: x, state: 'crouch', facing: -1, alpha: 0 },
        { at: t,      x: x, state: 'crouch', facing: -1, alpha: 0 },
        { at: t + 10, x: x, state: 'crouch', facing: -1, alpha: 1 },
        { at: t + 30, x: x, state: 'stance', facing: -1, alpha: 1 },
      ] };
    });
  }
  S[135] = {
    bg: 'city',
    npcColor: ENTITY,
    beats: [
      {
        // The architecture shook.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.28, cy: 0.58 },
          { at: 90, zoom: 1.15, cx: 0.40, cy: 0.52 },
        ],
        camShake: [{ at: 8, strength: 14, dur: 30 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',  facing: 1 },
          { at: 10, x: 0.28, state: 'brace', facing: 1 },
        ],
        npcPos: NO_NPC,
        effects: [{ type: 'static_noise', alpha: 0.30, startFrame: 8, duration: 36 }],
      },
      {
        // "Purge protocol." The timer starts; soldiers keep materialising.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.40, cy: 0.52 },
          { at: 30,  zoom: 1.20, cx: 0.50, cy: 0.30 },  // the countdown
          { at: 80,  zoom: 1.20, cx: 0.50, cy: 0.30 },
          { at: 130, zoom: 1.10, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'brace',  facing: 1 },
          { at: 60, x: 0.28, state: 'stance', facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: purge(true),
        effects: [0, 1, 2, 3].map(function (i) {
          return { type: 'energy_burst', cx: 0.60 + i * 0.10, cy: 0.58, color: '#6699cc', startFrame: 40 + i * 50, duration: 24 };
        }),
        bubbleX: 0.32,
      },
      {
        // "How long?" you asked. He looks up at the countdown.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.55, cy: 0.50 },
          { at: 30, zoom: 1.35, cx: 0.30, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'stance', facing: 1 },
          { at: 10, x: 0.28, state: 'lookUp', facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: purge(false),
      },
      {
        // "Thirty seconds. It always feels longer than it is."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.30, cy: 0.60 },
          { at: 30,  zoom: 1.20, cx: 0.50, cy: 0.30 },
          { at: 80,  zoom: 1.20, cx: 0.50, cy: 0.30 },
          { at: 120, zoom: 1.15, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'lookUp', facing: 1 },
          { at: 90, x: 0.28, state: 'stance', facing: 1 },
        ],
        npcPos: NO_NPC,
        extraFigures: purge(false),
        effects: [{ type: 'static_noise', alpha: 0.16, duration: 24 }],
        bubbleX: 0.32,
      },
    ],
  };

  // Chapter 138: First Form
  S[138] = {
    bg: 'city',
    npcColor: CREATOR,
    beats: [
      {
        // "If you can beat what I become — you can survive what I'm afraid of."
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 80,  zoom: 1.30, cx: 0.64, cy: 0.58 },
          { at: 480, zoom: 1.25, cx: 0.56, cy: 0.56 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.78, state: 'walk',  facing: -1, ease: 'linear' },
          { at: 50,  x: 0.70, state: 'talk',  facing: -1 },
          { at: 120, x: 0.70, state: 'hands', facing: -1 }, // "Not because I want to destroy you."
          { at: 190, x: 0.70, state: 'talk',  facing: -1 },
          { at: 270, x: 0.70, state: 'point', facing: -1 }, // "If you can beat what I become"
          { at: 360, x: 0.70, state: 'talk',  facing: -1 },
        ],
      },
      {
        // "I am your final exam."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.56, cy: 0.56 },
          { at: 40, zoom: 1.55, cx: 0.70, cy: 0.65 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk',   facing: -1 },
          { at: 50, x: 0.70, state: 'stance', facing: -1 },
        ],
      },
      {
        // The air compressed. The architecture rearranged. The Creator stepped forward.
        letterbox: true,
        transition: 'none',
        warp: 0.35,
        camAnim: [
          { at: 0,  zoom: 1.55, cx: 0.70, cy: 0.65 },
          { at: 20, zoom: 1.05, cx: 0.48, cy: 0.50 },
          { at: 160, zoom: 1.20, cx: 0.48, cy: 0.54 },
        ],
        camShake: [{ at: 14, strength: 12, dur: 30 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'stance', facing: 1 },
          { at: 16, x: 0.26, state: 'brace',  facing: 1 },
          { at: 60, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.70, state: 'stance', facing: -1 },
          { at: 80,  x: 0.70, state: 'walk',   facing: -1, ease: 'linear' },
          { at: 120, x: 0.63, state: 'stance', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: CREATOR, alpha: 0.45, startFrame: 14, fadeIn: 20 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.48, cy: 0.50, count: 24, color: '#ffbb77', alpha: 0.45, startFrame: 14, duration: 40, fadeIn: 4 },
          { type: 'shockwave', cx: 0.48, cy: 0.60, color: CREATOR, startFrame: 14, duration: 30 },
        ],
      },
    ],
  };

  // Chapter 141: Second Form
  // The level carries a huge stick-figure blueprint behind the Creator.
  S[141] = {
    bg: 'city',
    npcColor: CREATOR2,
    beats: [
      {
        // Everything the first one had learned.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.48 },
          { at: 120, zoom: 1.30, cx: 0.66, cy: 0.58 },
        ],
        camShake: [{ at: 30, strength: 10, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'stance', facing: 1 },
          { at: 32, x: 0.26, state: 'brace',  facing: 1 },
          { at: 80, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'crouch', facing: -1, scale: 1.0 },
          { at: 30, x: 0.70, state: 'crouch', facing: -1, scale: 1.0 },
          { at: 60, x: 0.70, state: 'stance', facing: -1, scale: 1.25 },
        ],
        effects: [
          { type: 'energy_burst', cx: 0.70, cy: 0.56, color: CREATOR2, startFrame: 30, duration: 30 },
          { type: 'screen_flash', color: CREATOR2, startFrame: 30, duration: 10, alpha: 0.25 },
        ],
      },
      {
        // And then more.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.66, cy: 0.58 },
          { at: 20, zoom: 1.15, cx: 0.55, cy: 0.50 },
        ],
        camShake: [{ at: 14, strength: 14, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'stance', facing: 1 },
          { at: 16, x: 0.25, state: 'brace',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'stance', facing: -1, scale: 1.25 },
          { at: 16, x: 0.70, state: 'stance', facing: -1, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: CREATOR2, alpha: 0.60, startFrame: 14, fadeIn: 10 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.70, cy: 0.50, count: 24, color: '#ff8855', alpha: 0.50, startFrame: 14, duration: 30, fadeIn: 4 },
        ],
      },
      {
        // "I am sorry it has to be this."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.55, cy: 0.50 },
          { at: 60,  zoom: 1.40, cx: 0.68, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,  x: 0.25, state: 'brace',  facing: 1 },
          { at: 30, x: 0.25, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.70, state: 'talk',  facing: -1, scale: 1.45 },
          { at: 70,  x: 0.70, state: 'hands', facing: -1, scale: 1.45 },
          { at: 160, x: 0.70, state: 'look',  facing: 1,  scale: 1.45 }, // looks away on "sorry"
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: CREATOR2, alpha: 0.45 },
        ],
      },
      {
        // "After this — the final guardian."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.68, cy: 0.62 },
          { at: 120, zoom: 1.20, cx: 0.50, cy: 0.54 },
        ],
        playerPos: [{ at: 0, x: 0.25, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.70, state: 'look',   facing: 1,  scale: 1.45 },
          { at: 14,  x: 0.70, state: 'talk',   facing: -1, scale: 1.45 },
          { at: 110, x: 0.70, state: 'stance', facing: -1, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: CREATOR2, alpha: 0.50 },
          { type: 'fragment_pulse', color: KAEL, alpha: 0.40, startFrame: 110, fadeIn: 16 },
        ],
      },
    ],
  };

  // Chapter 143: SOVEREIGN
  // A guardian built from observation. It mirrors Kael, and once moves before he does.
  var WATCHED = ['#ff8800', '#9955cc', '#33aa44', '#cc2244', '#88aacc'];
  function watched() {
    return WATCHED.map(function (c, i) {
      var t = 110 + i * 34, x = 0.84 + (i % 2) * 0.06 - (i > 2 ? 0.03 : 0);
      return { color: c, pos: [
        { at: 0,      x: x, state: ['stance', 'guard', 'attack', 'brace', 'run'][i], facing: -1, alpha: 0 },
        { at: t,      x: x, state: ['stance', 'guard', 'attack', 'brace', 'run'][i], facing: -1, alpha: 0 },
        { at: t + 10, x: x, state: ['stance', 'guard', 'attack', 'brace', 'run'][i], facing: -1, alpha: 0.25 },
        { at: t + 50, x: x, state: ['stance', 'guard', 'attack', 'brace', 'run'][i], facing: -1, alpha: 0 },
      ] };
    });
  }
  S[143] = {
    bg: 'city',
    npcColor: FOURTH,
    beats: [
      beat({
        // The gate demanded a proof.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.22, cy: 0.58 },
          { at: 100, zoom: 1.10, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.16, state: 'walk', facing: 1, ease: 'linear' },
          { at: 80, x: 0.31, state: 'look', facing: 1 },
        ],
      }, [
        { c: FOURTH, pos: [
          { at: 0,  x: 0.08, state: 'walk', facing: 1, ease: 'linear' },
          { at: 70, x: 0.215, state: 'look', facing: 1 },
        ] },
        still(SOV, 0.74, 'idle', -1, 0),
      ], -1),
      beat({
        // Not of power. Of pattern.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.40, cy: 0.50 },
          { at: 50, zoom: 1.45, cx: 0.32, cy: 0.63 },
        ],
        playerPos: [{ at: 0, x: 0.31, state: 'look', facing: 1 }],
      }, [still(FOURTH, 0.215, 'look', 1), still(SOV, 0.74, 'idle', -1, 0)], -1),
      beat({
        // It had watched every fighter. Their ghosts flicker behind it.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.32, cy: 0.63 },
          { at: 40,  zoom: 1.20, cx: 0.70, cy: 0.54 },
          { at: 300, zoom: 1.25, cx: 0.72, cy: 0.56 },
          { at: 340, zoom: 1.15, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.31, state: 'look',   facing: 1 },
          { at: 360, x: 0.31, state: 'stance', facing: 1 },
        ],
        extraFigures: watched(),
      }, [
        still(FOURTH, 0.215, 'look', 1),
        { c: SOV, pos: [
          { at: 0,   x: 0.74, state: 'idle',   facing: -1, alpha: 0 },
          { at: 20,  x: 0.74, state: 'idle',   facing: -1, alpha: 0 },
          { at: 90,  x: 0.74, state: 'look',   facing: -1, alpha: 1 },
          { at: 364, x: 0.74, state: 'stance', facing: -1, alpha: 1 }, // copies him, a beat late
        ] },
      ], -1),
      beat({
        // "It knows what you will do before you do it." It raises its guard first.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.50, cy: 0.52 },
          { at: 40,  zoom: 1.35, cx: 0.27, cy: 0.60 },
          { at: 150, zoom: 1.35, cx: 0.27, cy: 0.60 },
          { at: 180, zoom: 1.15, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.31, state: 'stance', facing: 1 },
          { at: 196, x: 0.31, state: 'guard',  facing: 1 },
        ],
      }, [
        { c: FOURTH, pos: [
          { at: 0,  x: 0.215, state: 'look', facing: 1 },
          { at: 10, x: 0.215, state: 'talk', facing: 1 },
        ] },
        { c: SOV, pos: [
          { at: 0,   x: 0.74, state: 'stance', facing: -1 },
          { at: 184, x: 0.74, state: 'guard',  facing: -1 },
        ] },
      ], 0),
      beat({
        // "Then I'll have to surprise it," you said.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.50, cy: 0.52 },
          { at: 30, zoom: 1.40, cx: 0.32, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,  x: 0.31, state: 'guard',  facing: 1 },
          { at: 10, x: 0.31, state: 'stance', facing: 1 },
        ],
      }, [still(FOURTH, 0.215, 'look', 1), still(SOV, 0.74, 'guard', -1)], -1),
      beat({
        // "It's already accounted for that."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.32, cy: 0.62 },
          { at: 40, zoom: 1.40, cx: 0.25, cy: 0.62 },
        ],
        playerPos: [{ at: 0, x: 0.31, state: 'stance', facing: 1 }],
      }, [
        { c: FOURTH, pos: [
          { at: 0,  x: 0.215, state: 'talk', facing: 1 },
          { at: 90, x: 0.215, state: 'look', facing: 1 },
        ] },
        { c: SOV, pos: [
          { at: 0,  x: 0.74, state: 'guard',  facing: -1 },
          { at: 30, x: 0.74, state: 'stance', facing: -1 },
        ] },
      ], 0),
      beat({
        // It stepped forward. No face. Only readiness.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.25, cy: 0.62 },
          { at: 20,  zoom: 1.60, cx: 0.68, cy: 0.66 },
          { at: 80,  zoom: 1.60, cx: 0.68, cy: 0.66 },
          { at: 120, zoom: 1.15, cx: 0.48, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.31, state: 'stance', facing: 1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: SOV, alpha: 0.45, startFrame: 20, fadeIn: 30 },
        ],
      }, [
        still(FOURTH, 0.215, 'look', 1),
        { c: SOV, pos: [
          { at: 0,  x: 0.74, state: 'stance', facing: -1 },
          { at: 14, x: 0.74, state: 'walk',   facing: -1, ease: 'linear' },
          { at: 50, x: 0.675, state: 'stance', facing: -1 },
        ] },
      ], -1),
    ],
  };

  // Chapter 144: The Creator's Gate
  // The gate is the shaft of light at centre. A voice answers through it.
  var GATE_X = 0.50;
  S[144] = {
    bg: 'city',
    npcColor: FOURTH,
    beats: [
      beat({
        // The rift was open.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.50, cy: 0.40 },
          { at: 110, zoom: 1.10, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.14, state: 'walk', facing: 1, ease: 'linear' },
          { at: 88, x: 0.31, state: 'look', facing: 1 },
        ],
      }, [
        { c: FOURTH, pos: [
          { at: 0,  x: 0.07, state: 'walk', facing: 1, ease: 'linear' },
          { at: 80, x: 0.215, state: 'look', facing: 1 },
        ] },
      ], -1),
      beat({
        // Not as a tear — as a door.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.38, cy: 0.50 },
          { at: 120, zoom: 1.20, cx: 0.48, cy: 0.42 },
        ],
        playerPos: [
          { at: 0,  x: 0.31, state: 'look',   facing: 1 },
          { at: 40, x: 0.31, state: 'lookUp', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccccff', alpha: 0.40, startFrame: 20, fadeIn: 40 },
        ],
      }, [still(FOURTH, 0.215, 'lookUp', 1)], -1),
      beat({
        // "This is what we've been building toward."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.48, cy: 0.42 },
          { at: 40,  zoom: 1.35, cx: 0.27, cy: 0.60 },
        ],
        playerPos: [{ at: 0, x: 0.31, state: 'lookUp', facing: 1 }],
      }, [
        { c: FOURTH, pos: [
          { at: 0,  x: 0.215, state: 'lookUp', facing: 1 },
          { at: 14, x: 0.215, state: 'talk',   facing: 1 },
          { at: 80, x: 0.215, state: 'point',  facing: 1 },
        ] },
      ], 0),
      beat({
        // A voice through the fracture resonance. Something stands in the light.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.27, cy: 0.60 },
          { at: 50, zoom: 1.30, cx: 0.44, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.31, state: 'lookUp', facing: 1 },
          { at: 20, x: 0.31, state: 'listen', facing: 1 },
        ],
        extraFigures: [{ color: ENTITY, pos: [
          { at: 0,  x: GATE_X, state: 'idle', facing: -1, alpha: 0 },
          { at: 30, x: GATE_X, state: 'idle', facing: -1, alpha: 0 },
          { at: 80, x: GATE_X, state: 'idle', facing: -1, alpha: 0.35 },
        ] }],
        effects: [{ type: 'static_noise', alpha: 0.25, startFrame: 10, duration: 36 }],
      }, [still(FOURTH, 0.215, 'point', 1)], -1),
      beat({
        // "I know."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.44, cy: 0.58 },
          { at: 40, zoom: 1.40, cx: 0.48, cy: 0.62 },
        ],
        playerPos: [{ at: 0, x: 0.31, state: 'listen', facing: 1 }],
      }, [
        still(FOURTH, 0.215, 'look', 1),
        { c: ENTITY, pos: [{ at: 0, x: GATE_X, state: 'talk', facing: -1, alpha: 0.35 }] },
      ], 1),
      beat({
        // "You are the key. You always were."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.48, cy: 0.62 },
          { at: 100, zoom: 1.40, cx: 0.40, cy: 0.62 },
          { at: 130, zoom: 1.50, cx: 0.32, cy: 0.64 },
        ],
        playerPos: [
          { at: 0,   x: 0.31, state: 'listen', facing: 1 },
          { at: 110, x: 0.31, state: 'hands',  facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.65, startFrame: 110, fadeIn: 20 },
        ],
      }, [
        still(FOURTH, 0.215, 'look', 1),
        { c: ENTITY, pos: [
          { at: 0,   x: GATE_X, state: 'talk', facing: -1, alpha: 0.35 },
          { at: 160, x: GATE_X, state: 'idle', facing: -1, alpha: 0.35 },
        ] },
      ], 1),
      beat({
        // "The construct won't hold back." "Neither will you." The lock takes shape.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.50, cx: 0.32, cy: 0.64 },
          { at: 30,  zoom: 1.15, cx: 0.48, cy: 0.52 },
        ],
        camShake: [{ at: 70, strength: 8, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.31, state: 'hands',  facing: 1 },
          { at: 30, x: 0.31, state: 'stance', facing: 1 },
        ],
        extraFigures: [{ color: '#ddddee', pos: [
          { at: 0,  x: 0.66, state: 'stance', facing: -1, alpha: 0, scale: 1.5 },
          { at: 60, x: 0.66, state: 'stance', facing: -1, alpha: 0, scale: 1.5 },
          { at: 90, x: 0.66, state: 'stance', facing: -1, alpha: 1, scale: 1.5 },
        ] }],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.65 },
        ],
        effects: [
          { type: 'energy_burst', cx: 0.66, cy: 0.52, color: '#ddddee', startFrame: 64, duration: 30 },
        ],
      }, [
        still(FOURTH, 0.215, 'stance', 1),
        { c: ENTITY, pos: [
          { at: 0,  x: GATE_X, state: 'talk', facing: -1, alpha: 0.35 },
          { at: 50, x: GATE_X, state: 'idle', facing: -1, alpha: 0 },
        ] },
      ], 1),
    ],
  };

  // Extra figures default to half opacity when a keyframe gives no alpha. Everyone
  // here is physically present unless a key says otherwise.
  [128, 129, 131, 135, 138, 141, 143, 144].forEach(function (id) {
    S[id].beats.forEach(function (b) {
      (b.extraFigures || []).forEach(function (ef) {
        (ef.pos || []).forEach(function (k) { if (k.alpha === undefined) k.alpha = 1; });
      });
    });
  });

})(window.STORY_SCENE_SPECS);
