'use strict';
// js/story/scenes/act3.js: cinematic scene specs.
// Merge into window.STORY_SCENE_SPECS. These must load before js/smb-story-narrative-scene.js.
// Chapters 50, 51, 52, 53, 54, 56, 58, 61, 64.
// One staged beat per text beat (tools/scene-strip/align.js). The voice can hold a
// beat past its frame budget, so every beat lands its action early and ends on a pose
// that can sit.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  var KAEL = '#4488ff', VERAN = '#3ddc84', ENTITY = '#8844ff';
  // Architect colours follow the Assembly Hall pillars.
  var SECOND = '#9ccc3c', THIRD = '#2266bb', FOURTH = '#d8a050';

  // Several characters share a scene but only the npc gets a speech bubble, and a
  // beat's npcColor also colours that npc's body. So each beat makes its speaker
  // the npc. Everyone keeps a fixed extraFigures slot (hidden while they are the
  // npc) so pose memory stays with the right figure.
  //   people: [{ c: colour, pos: [keyframes] }], who: speaking index or -1
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
    for (var k in c) base[k] = c[k];
    return base;
  }
  function still(c, x, state, facing, alpha) {
    return { c: c, pos: [{ at: 0, x: x, state: state, facing: facing, alpha: alpha === undefined ? 1 : alpha }] };
  }

  // Chapter 50: The Probe
  // The Architects stand behind Kael; the faceless probe measures from across the lab.
  var PROBE = '#bbbbdd';
  S[50] = {
    bg: 'fracture',
    npcColor: THIRD,
    beats: [
      beat({
        // "Don't engage it."
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.18, cy: 0.60 },
          { at: 200, zoom: 1.25, cx: 0.22, cy: 0.56 },
        ],
        playerPos: [{ at: 0, x: 0.34, state: 'look', facing: 1 }],
      }, [
        { c: THIRD, pos: [
          { at: 0,  x: 0.10, state: 'talk',  facing: 1 },
          { at: 40, x: 0.10, state: 'reach', facing: 1 },
          { at: 90, x: 0.10, state: 'talk',  facing: 1 },
        ] },
        still(SECOND, 0.17, 'look', 1),
        still(FOURTH, 0.24, 'listen', 1),
        still(PROBE, 0.78, 'idle', 1, 0),
      ], 0),
      beat({
        // The probe materialises at the perimeter.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.25, cx: 0.22, cy: 0.56 },
          { at: 60,  zoom: 1.40, cx: 0.78, cy: 0.62 },
          { at: 200, zoom: 1.35, cx: 0.76, cy: 0.60 },
        ],
        playerPos: [{ at: 0, x: 0.34, state: 'look', facing: 1 }],
        effects: [
          { type: 'static_noise', alpha: 0.30, startFrame: 20, duration: 40 },
        ],
      }, [
        still(THIRD, 0.10, 'look', 1),
        still(SECOND, 0.17, 'look', 1),
        still(FOURTH, 0.24, 'look', 1),
        { c: PROBE, pos: [
          { at: 0,   x: 0.78, state: 'idle', facing: 1, alpha: 0 },
          { at: 20,  x: 0.78, state: 'idle', facing: 1, alpha: 0 },
          { at: 70,  x: 0.78, state: 'look', facing: 1, alpha: 1 },
          { at: 150, x: 0.78, state: 'look', facing: 1, alpha: 1 },
        ] },
      ], -1),
      beat({
        // "One of us fights it. Alone."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.76, cy: 0.60 },
          { at: 40,  zoom: 1.30, cx: 0.22, cy: 0.58 },
          { at: 280, zoom: 1.25, cx: 0.24, cy: 0.56 },
        ],
        playerPos: [{ at: 0, x: 0.34, state: 'look', facing: 1 }],
      }, [
        still(THIRD, 0.10, 'look', 1),
        still(SECOND, 0.17, 'listen', 1),
        { c: FOURTH, pos: [
          { at: 0,  x: 0.24, state: 'look', facing: 1 },
          { at: 20, x: 0.24, state: 'talk', facing: 1 },
          { at: 160, x: 0.24, state: 'point', facing: 1 },
        ] },
        still(PROBE, 0.78, 'look', 1),
      ], 2),
      beat({
        // They all looked at you.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.24, cy: 0.56 },
          { at: 40, zoom: 1.45, cx: 0.24, cy: 0.63 },
        ],
        playerPos: [
          { at: 0,  x: 0.34, state: 'look', facing: 1 },
          { at: 30, x: 0.34, state: 'look', facing: -1 },
        ],
      }, [
        still(THIRD, 0.10, 'look', 1),
        still(SECOND, 0.17, 'look', 1),
        still(FOURTH, 0.24, 'look', 1),
        still(PROBE, 0.78, 'look', 1),
      ], -1),
      beat({
        // "Show it what you've learned." Kael turns to face the probe.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.24, cy: 0.63 },
          { at: 120, zoom: 1.40, cx: 0.24, cy: 0.62 },
          { at: 160, zoom: 1.15, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.34, state: 'look',   facing: -1 },
          { at: 110, x: 0.34, state: 'look',   facing: 1 },
          { at: 140, x: 0.34, state: 'stance', facing: 1 },
        ],
      }, [
        still(THIRD, 0.10, 'look', 1),
        { c: SECOND, pos: [
          { at: 0,  x: 0.17, state: 'talk',  facing: 1 },
          { at: 80, x: 0.17, state: 'point', facing: 1 },
        ] },
        still(FOURTH, 0.24, 'look', 1),
        still(PROBE, 0.78, 'look', 1),
      ], 1),
      beat({
        // The probe turned toward you. And waited.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.50, cy: 0.52 },
          { at: 20,  zoom: 1.50, cx: 0.78, cy: 0.64 },
          { at: 90,  zoom: 1.50, cx: 0.78, cy: 0.64 },
          { at: 120, zoom: 1.15, cx: 0.55, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.34, state: 'stance', facing: 1 }],
      }, [
        still(THIRD, 0.10, 'look', 1),
        still(SECOND, 0.17, 'look', 1),
        still(FOURTH, 0.24, 'look', 1),
        { c: PROBE, pos: [
          { at: 0,  x: 0.78, state: 'look', facing: 1 },
          { at: 24, x: 0.78, state: 'idle', facing: -1 },
        ] },
      ], -1),
    ],
  };

  // Chapter 51: The Split
  // The Assembly Hall. Kael watches from the spotlight; the Architects argue.
  var HALL = function (third, second, fourth) {
    return [
      { c: THIRD,  pos: third  || [{ at: 0, x: 0.72, state: 'idle', facing: -1 }] },
      { c: SECOND, pos: second || [{ at: 0, x: 0.50, state: 'idle', facing: 1 }] },
      { c: FOURTH, pos: fourth || [{ at: 0, x: 0.88, state: 'idle', facing: 1 }] },
    ];
  };
  S[51] = {
    bg: 'level', level: { ch: 49, x: 3500 },
    npcColor: THIRD,
    beats: [
      beat({
        // The Third Architect had run the numbers.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.72, cy: 0.62 },
          { at: 110, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'idle', facing: 1 }],
      }, HALL([
        { at: 0,  x: 0.72, state: 'hands', facing: -1 },
        { at: 80, x: 0.72, state: 'idle',  facing: -1 },
      ]), -1),
      beat({
        // "We are planning an execution."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 50,  zoom: 1.30, cx: 0.66, cy: 0.58 },
          { at: 300, zoom: 1.30, cx: 0.64, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'look', facing: 1 }],
      }, HALL([
        { at: 0,   x: 0.72, state: 'talk',  facing: -1 },
        { at: 100, x: 0.72, state: 'point', facing: -1 },
        { at: 160, x: 0.72, state: 'talk',  facing: -1 },
      ], [
        { at: 0,  x: 0.50, state: 'idle',   facing: 1 },
        { at: 90, x: 0.50, state: 'listen', facing: 1 },
      ]), 0),
      beat({
        // "What would you call that?"
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.64, cy: 0.58 },
          { at: 40,  zoom: 1.30, cx: 0.52, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'look', facing: 1 }],
      }, HALL(null, [
        { at: 0,   x: 0.50, state: 'talk',  facing: 1 },
        { at: 20,  x: 0.50, state: 'walk',  facing: 1, ease: 'linear' },
        { at: 52,  x: 0.556, state: 'talk', facing: 1 },
        { at: 120, x: 0.556, state: 'point', facing: 1 },
        { at: 200, x: 0.556, state: 'talk', facing: 1 },
      ]), 1),
      beat({
        // "Architecture." Brutal. But functional.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.52, cy: 0.58 },
          { at: 40,  zoom: 1.40, cx: 0.70, cy: 0.62 },
          { at: 400, zoom: 1.30, cx: 0.66, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'look', facing: 1 }],
      }, HALL([
        { at: 0,   x: 0.72, state: 'idle',  facing: -1 },
        { at: 12,  x: 0.72, state: 'talk',  facing: -1 },
        { at: 110, x: 0.72, state: 'hands', facing: -1 },
        { at: 200, x: 0.72, state: 'talk',  facing: -1 },
      ], [{ at: 0, x: 0.556, state: 'stance', facing: 1 }]), 0),
      beat({
        // The Fourth Architect finally turns around.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.66, cy: 0.58 },
          { at: 40, zoom: 1.45, cx: 0.86, cy: 0.63 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'look', facing: 1 }],
      }, HALL([{ at: 0, x: 0.72, state: 'idle', facing: -1 }],
              [{ at: 0, x: 0.556, state: 'idle', facing: 1 }],
              [
                { at: 0,  x: 0.88, state: 'idle', facing: 1 },
                { at: 30, x: 0.88, state: 'idle', facing: -1 },
              ]), -1),
      beat({
        // "Something already did. Us."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.86, cy: 0.63 },
          { at: 100, zoom: 1.30, cx: 0.74, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'look', facing: 1 }],
      }, HALL([
        { at: 0,  x: 0.72, state: 'idle', facing: -1 },
        { at: 30, x: 0.72, state: 'look', facing: 1 },
      ], [
        { at: 0,  x: 0.556, state: 'idle', facing: 1 },
        { at: 30, x: 0.556, state: 'look', facing: 1 },
      ], [
        { at: 0,  x: 0.88, state: 'talk', facing: -1 },
        { at: 60, x: 0.88, state: 'idle', facing: -1 },
      ]), 2),
      beat({
        // The fragment reacts to the Third Architect's voice. They had already decided.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.74, cy: 0.58 },
          { at: 40,  zoom: 1.45, cx: 0.20, cy: 0.63 },
          { at: 130, zoom: 1.45, cx: 0.20, cy: 0.63 },
          { at: 170, zoom: 1.55, cx: 0.72, cy: 0.66 },
        ],
        playerPos: [
          { at: 0,   x: 0.20, state: 'look',  facing: 1 },
          { at: 30,  x: 0.20, state: 'hands', facing: 1 },
          { at: 110, x: 0.20, state: 'look',  facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.65, startFrame: 30, fadeIn: 16 },
        ],
      }, HALL([
        { at: 0,   x: 0.72, state: 'look', facing: 1 },
        { at: 200, x: 0.72, state: 'idle', facing: 1 },
      ], [{ at: 0, x: 0.556, state: 'look', facing: 1 }],
         [{ at: 0, x: 0.88, state: 'idle', facing: -1 }]), -1),
    ],
  };

  // Chapter 52: Rogue Faction
  // The Preserved stand under their banner. Two Architects behind Kael.
  var PRES = '#cc8833';
  function preserved(t) {
    return [0.74, 0.82, 0.90].map(function (x, i) {
      var c = ['#aa7733', '#bb8844', '#996622'][i];
      if (t === 'attack') {
        return { color: c, pos: [
          { at: 0,          x: x,        state: 'stance', facing: -1 },
          { at: 4 + i * 6,  x: x,        state: 'run',    facing: -1, ease: 'linear' },
          { at: 44 + i * 6, x: x - 0.16, state: 'stance', facing: -1 },
        ] };
      }
      var st = t === 'life' ? ['idle', 'kneel', 'listen'][i] : 'stance';
      return { color: c, pos: [{ at: 0, x: x, state: st, facing: -1 }] };
    });
  }
  S[52] = {
    bg: 'fracture',
    npcColor: PRES,
    beats: [
      {
        // They called themselves the Preserved.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.50, cy: 0.40 }, // WE EXIST
          { at: 70,  zoom: 1.20, cx: 0.52, cy: 0.42 },
          { at: 110, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.27, state: 'look', facing: 1 }],
        npcPos: [{ at: 0, x: 0.66, state: 'idle', facing: -1 }],
        extraFigures: preserved('life').concat([
          { color: SECOND, pos: [{ at: 0, x: 0.18, state: 'look', facing: 1 }] },
          { color: THIRD,  pos: [{ at: 0, x: 0.10, state: 'look', facing: 1 }] },
        ]),
      },
      {
        // Integrated, not destroyed. They had built a life in there.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 300, zoom: 1.30, cx: 0.80, cy: 0.58, ease: 'linear' },
        ],
        playerPos: [{ at: 0, x: 0.27, state: 'look', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.66, state: 'idle', facing: -1 },
          { at: 150, x: 0.66, state: 'look', facing: 1 },
        ],
        extraFigures: preserved('life').concat([
          { color: SECOND, pos: [{ at: 0, x: 0.18, state: 'look', facing: 1 }] },
          { color: THIRD,  pos: [{ at: 0, x: 0.10, state: 'look', facing: 1 }] },
        ]),
      },
      {
        // "We are not a cost you get to decide."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.80, cy: 0.58 },
          { at: 40,  zoom: 1.30, cx: 0.60, cy: 0.58 },
          { at: 330, zoom: 1.20, cx: 0.50, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.27, state: 'look',   facing: 1 },
          { at: 200, x: 0.27, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'look',  facing: 1 },
          { at: 10,  x: 0.66, state: 'talk',  facing: -1 },
          { at: 40,  x: 0.66, state: 'walk',  facing: -1, ease: 'linear' },
          { at: 74,  x: 0.60, state: 'talk',  facing: -1 },
          { at: 190, x: 0.60, state: 'point', facing: -1 },
        ],
        extraFigures: preserved('stand').concat([
          { color: SECOND, pos: [{ at: 0, x: 0.18, state: 'look', facing: 1 }] },
          { color: THIRD,  pos: [{ at: 0, x: 0.10, state: 'look', facing: 1 }] },
        ]),
      },
      {
        // The Second Architect, quietly. The Third, immediately.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.50, cy: 0.54 },
          { at: 40,  zoom: 1.40, cx: 0.16, cy: 0.62 },
        ],
        playerPos: [{ at: 0, x: 0.27, state: 'stance', facing: 1 }],
        npcPos: [{ at: 0, x: 0.60, state: 'point', facing: -1 }],
        extraFigures: preserved('stand').concat([
          { color: SECOND, pos: [
            { at: 0,  x: 0.18, state: 'look',   facing: 1 },
            { at: 20, x: 0.18, state: 'listen', facing: 1 },
          ] },
          { color: THIRD, pos: [
            { at: 0,   x: 0.10, state: 'look',  facing: 1 },
            { at: 120, x: 0.10, state: 'point', facing: 1 },
            { at: 200, x: 0.10, state: 'stance', facing: 1 },
          ] },
        ]),
      },
      {
        // The Preserved attacked.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.16, cy: 0.62 },
          { at: 12, zoom: 1.10, cx: 0.45, cy: 0.50 },
          { at: 60, zoom: 1.20, cx: 0.40, cy: 0.54 },
        ],
        camShake: [{ at: 44, strength: 12, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.27, state: 'stance', facing: 1 },
          { at: 34, x: 0.27, state: 'guard',  facing: 1 },
          { at: 46, x: 0.26, state: 'brace',  facing: 1 },
          { at: 70, x: 0.26, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.60, state: 'stance', facing: -1 },
          { at: 4,  x: 0.60, state: 'run',    facing: -1, ease: 'linear' },
          { at: 44, x: 0.41, state: 'attack', facing: -1 },
          { at: 70, x: 0.43, state: 'stance', facing: -1 },
        ],
        extraFigures: preserved('attack').concat([
          { color: SECOND, pos: [{ at: 0, x: 0.18, state: 'stance', facing: 1 }] },
          { color: THIRD,  pos: [{ at: 0, x: 0.10, state: 'stance', facing: 1 }] },
        ]),
        effects: [
          { type: 'speedlines', cx: 0.50, cy: 0.52, count: 18, color: PRES, alpha: 0.45, startFrame: 4, duration: 40, fadeIn: 4 },
          { type: 'shockwave', cx: 0.34, cy: 0.62, color: '#ffbb66', startFrame: 44, duration: 26 },
          { type: 'impact_sparks', cx: 0.34, cy: 0.55, count: 12, color: '#ffcc88', startFrame: 44, duration: 22 },
        ],
      },
    ],
  };

  // Chapter 53: What Veran Didn't Say
  // Two conversations in the Assembly Hall: the Fourth Architect, then Veran.
  S[53] = {
    bg: 'level', level: { ch: 49, x: 3500 },
    npcColor: FOURTH,
    beats: [
      {
        // The Fourth Architect found you afterward.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.20, cy: 0.58 },
          { at: 110, zoom: 1.20, cx: 0.32, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.20, state: 'hands', facing: 1 },
          { at: 90, x: 0.20, state: 'look',  facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.62, state: 'walk', facing: -1, ease: 'linear' },
          { at: 110, x: 0.42, state: 'idle', facing: -1 },
        ],
      },
      {
        // "She's been to the Creator's domain. Recently."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.32, cy: 0.54 },
          { at: 60,  zoom: 1.40, cx: 0.34, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,   x: 0.20, state: 'look',   facing: 1 },
          { at: 130, x: 0.20, state: 'listen', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.42, state: 'talk', facing: -1 },
          { at: 120, x: 0.42, state: 'look', facing: 1 },  // glances toward the door
          { at: 170, x: 0.42, state: 'talk', facing: -1 },
        ],
      },
      {
        // Later. You asked Veran directly.
        letterbox: true,
        npcColor: VERAN,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.32, cy: 0.54 },
          { at: 90, zoom: 1.30, cx: 0.32, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.20, state: 'stance', facing: 1 },
          { at: 20, x: 0.20, state: 'talk',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.42, state: 'listen', facing: -1 }],
      },
      {
        // She didn't lie.
        letterbox: true,
        transition: 'none',
        npcColor: VERAN,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.32, cy: 0.58 },
          { at: 40, zoom: 1.50, cx: 0.40, cy: 0.65 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'look', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.42, state: 'listen', facing: -1 },
          { at: 20, x: 0.42, state: 'look',   facing: 1 },
        ],
      },
      {
        // "The Creator showed it to me — in exchange for something."
        letterbox: true,
        transition: 'none',
        npcColor: VERAN,
        camAnim: [
          { at: 0,   zoom: 1.50, cx: 0.40, cy: 0.65 },
          { at: 200, zoom: 1.40, cx: 0.38, cy: 0.62 },
          { at: 220, zoom: 1.45, cx: 0.22, cy: 0.63 }, // on Kael for the confession
          { at: 420, zoom: 1.35, cx: 0.30, cy: 0.60 },
        ],
        playerPos: [
          { at: 0,   x: 0.20, state: 'look',   facing: 1 },
          { at: 220, x: 0.20, state: 'listen', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.42, state: 'talk',  facing: 1 },
          { at: 40,  x: 0.42, state: 'talk',  facing: -1 },
          { at: 160, x: 0.42, state: 'hands', facing: -1 },
          { at: 240, x: 0.42, state: 'talk',  facing: -1 },
        ],
      },
      {
        // The room was quiet for a long time.
        letterbox: true,
        transition: 'none',
        npcColor: VERAN,
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.30, cy: 0.60 },
          { at: 110, zoom: 1.05, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.42, state: 'idle', facing: -1 }],
      },
      {
        // "I thought I was protecting you."
        letterbox: true,
        transition: 'none',
        npcColor: VERAN,
        camAnim: [
          { at: 0,   zoom: 1.05, cx: 0.45, cy: 0.50 },
          { at: 60,  zoom: 1.40, cx: 0.32, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,  x: 0.20, state: 'idle',   facing: 1 },
          { at: 40, x: 0.20, state: 'listen', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.42, state: 'idle', facing: -1 },
          { at: 10, x: 0.42, state: 'walk', facing: -1, ease: 'linear' },
          { at: 40, x: 0.37, state: 'talk', facing: -1 },
        ],
      },
      {
        // Maybe she was. Maybe it didn't matter.
        letterbox: true,
        transition: 'none',
        npcColor: VERAN,
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.32, cy: 0.62 },
          { at: 110, zoom: 1.20, cx: 0.30, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,  x: 0.20, state: 'listen', facing: 1 },
          { at: 34, x: 0.20, state: 'look',   facing: -1 },
        ],
        npcPos: [
          { at: 0,  x: 0.37, state: 'talk', facing: -1 },
          { at: 30, x: 0.37, state: 'idle', facing: -1 },
        ],
      },
    ],
  };

  // Chapter 54: The Upload
  // Veran works the relay console; Kael takes a position between her and the probes.
  var PROBE2 = '#9999cc';
  function probeWave(arrive) {
    return [0.82, 0.88, 0.94, 0.99].map(function (x, i) {
      if (!arrive) return { color: PROBE2, pos: [{ at: 0, x: x, state: 'stance', facing: -1, alpha: 1 }] };
      return { color: PROBE2, pos: [
        { at: 0,            x: x + 0.10, state: 'walk',   facing: -1, alpha: 0, ease: 'linear' },
        { at: 20 + i * 14,  x: x + 0.07, state: 'walk',   facing: -1, alpha: 1, ease: 'linear' },
        { at: 80 + i * 14,  x: x,        state: 'stance', facing: -1, alpha: 1 },
      ] };
    });
  }
  S[54] = {
    bg: 'fracture',
    npcColor: VERAN,
    beats: [
      beat({
        // "I'll be completely exposed." She turns to the console.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.36, cy: 0.54 },
          { at: 300, zoom: 1.30, cx: 0.42, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'listen', facing: 1 },
        ],
      }, [
        { c: VERAN, pos: [
          { at: 0,   x: 0.52, state: 'talk',  facing: -1 },
          { at: 250, x: 0.52, state: 'reach', facing: 1 },
          { at: 330, x: 0.52, state: 'talk',  facing: -1 },
        ] },
        still(SECOND, 0.14, 'listen', 1),
      ], 0),
      beat({
        // "Protect me."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.42, cy: 0.58 },
          { at: 20, zoom: 1.50, cx: 0.48, cy: 0.65 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'listen', facing: 1 },
          { at: 30, x: 0.26, state: 'stance', facing: 1 },
        ],
      }, [
        { c: VERAN, pos: [
          { at: 0,  x: 0.52, state: 'talk',  facing: -1 },
          { at: 60, x: 0.52, state: 'reach', facing: 1 },
        ] },
        still(SECOND, 0.14, 'look', 1),
      ], 0),
      beat({
        // Two waves of probes inbound. Kael runs to stand between them and Veran.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.50, cx: 0.48, cy: 0.65 },
          { at: 30,  zoom: 1.15, cx: 0.66, cy: 0.52 },
          { at: 120, zoom: 1.15, cx: 0.62, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'stance', facing: 1 },
          { at: 10, x: 0.26, state: 'run',    facing: 1, ease: 'linear' },
          { at: 94, x: 0.66, state: 'stance', facing: 1 },
        ],
      }, [
        still(VERAN, 0.52, 'reach', 1),
        still(SECOND, 0.14, 'look', 1),
      ], -1),
      beat({
        // "The Creator is not testing anymore."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.62, cy: 0.52 },
          { at: 40,  zoom: 1.35, cx: 0.16, cy: 0.60 },
          { at: 170, zoom: 1.35, cx: 0.16, cy: 0.60 },
          { at: 200, zoom: 1.10, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.66, state: 'stance', facing: 1 }],
      }, [
        still(VERAN, 0.52, 'reach', 1),
        { c: SECOND, pos: [
          { at: 0,  x: 0.14, state: 'talk',   facing: 1 },
          { at: 150, x: 0.14, state: 'stance', facing: 1 },
        ] },
      ], 1),
    ],
  };
  // The probe wave sits behind the cast in beats 2 and 3.
  S[54].beats[2].extraFigures = S[54].beats[2].extraFigures.concat(probeWave(true));
  S[54].beats[3].extraFigures = S[54].beats[3].extraFigures.concat(probeWave(false));

  // Chapter 56: Signal Maze
  S[56] = {
    bg: 'fracture',
    npcColor: FOURTH,
    beats: [
      {
        // The Creator began unmaking the pathways.
        letterbox: true,
        warp: 0.35,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.18, cy: 0.58 },
          { at: 100, zoom: 1.15, cx: 0.40, cy: 0.52 },
        ],
        camShake: [{ at: 30, strength: 10, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.20, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 30, x: 0.254, state: 'brace', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.10, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 30, x: 0.154, state: 'brace', facing: 1 },
        ],
        effects: [
          { type: 'static_noise', alpha: 0.35, startFrame: 30, duration: 40 },
        ],
      },
      {
        // Streets that looped back. Kael turns one way, then the other.
        letterbox: true,
        transition: 'none',
        warp: 0.45,
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.40, cy: 0.52 },
          { at: 260, zoom: 1.10, cx: 0.56, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,   x: 0.254, state: 'brace',  facing: 1 },
          { at: 30,  x: 0.254, state: 'look',   facing: -1 },
          { at: 90,  x: 0.254, state: 'look',   facing: 1 },
          { at: 150, x: 0.254, state: 'lookUp', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.154, state: 'brace',  facing: 1 },
          { at: 50, x: 0.154, state: 'lookUp', facing: 1 },
        ],
      },
      {
        // "It's trying to isolate us from the fallback point."
        letterbox: true,
        transition: 'none',
        warp: 0.20,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.56, cy: 0.48 },
          { at: 50,  zoom: 1.40, cx: 0.20, cy: 0.62 },
          { at: 330, zoom: 1.30, cx: 0.24, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.254, state: 'lookUp', facing: 1 },
          { at: 40, x: 0.254, state: 'look',   facing: -1 },
        ],
        npcPos: [
          { at: 0,   x: 0.154, state: 'talk',  facing: 1 },
          { at: 160, x: 0.154, state: 'point', facing: 1 },
          { at: 240, x: 0.154, state: 'talk',  facing: 1 },
        ],
      },
      {
        // The rift entity, from nowhere: "Let it guide you."
        letterbox: true,
        transition: 'none',
        npcColor: ENTITY,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.24, cy: 0.58 },
          { at: 120, zoom: 1.15, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.254, state: 'look',  facing: -1 },
          { at: 20, x: 0.254, state: 'hands', facing: 1 },
          { at: 90, x: 0.254, state: 'look',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1, alpha: 0, show: false }],
        extraFigures: [{ color: FOURTH, pos: [{ at: 0, x: 0.154, state: 'look', facing: 1 }] }],
        effectsBehind: [
          { type: 'fragment_pulse', color: KAEL, alpha: 0.55, startFrame: 20, fadeIn: 20 },
          { type: 'objective_marker', xf: 0.86, yf: 0.45, color: '#88aaff', alpha: 0.85, startFrame: 70, fadeIn: 30 },
        ],
        bubbleX: 0.30,
      },
      {
        // Into the maze. Something was already moving inside it.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.50, cy: 0.52 },
          { at: 90,  zoom: 1.20, cx: 0.62, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.254, state: 'look',  facing: 1 },
          { at: 10,  x: 0.254, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 90,  x: 0.40,  state: 'walk',  facing: 1, ease: 'linear' },
          { at: 96,  x: 0.41,  state: 'brace', facing: 1 },
          { at: 130, x: 0.41,  state: 'look',  facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.154, state: 'look',  facing: 1 },
          { at: 20,  x: 0.154, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 96,  x: 0.29,  state: 'brace', facing: 1 },
          { at: 130, x: 0.29,  state: 'look',  facing: 1 },
        ],
        extraFigures: [
          { color: '#9a6aa8', pos: [
            { at: 0,   x: 0.72, state: 'run', facing: 1, alpha: 0, ease: 'linear' },
            { at: 80,  x: 0.72, state: 'run', facing: 1, alpha: 0, ease: 'linear' },
            { at: 90,  x: 0.765, state: 'run', facing: 1, alpha: 0.7, ease: 'linear' },
            { at: 120, x: 0.90, state: 'run', facing: 1, alpha: 0.7, ease: 'linear' },
            { at: 130, x: 0.945, state: 'run', facing: 1, alpha: 0 },
          ] },
        ],
        effectsBehind: [
          { type: 'objective_marker', xf: 0.86, yf: 0.45, color: '#88aaff', alpha: 0.85 },
        ],
      },
    ],
  };

  // Chapter 58: Converted
  // Guards in the Third Architect's colours step out of the doorway.
  var GUARD = '#4a86d0'; // the Third Architect's blue, a shade lighter
  function guards(phase) {
    return [0.62, 0.72].map(function (x, i) {
      if (phase === 0) {
        return { color: GUARD, pos: [
          { at: 0,           x: 0.50, state: 'walk',   facing: 1,  alpha: 0, ease: 'linear' },
          { at: 10 + i * 20, x: 0.51, state: 'walk',   facing: 1,  alpha: 1, ease: 'linear' },
          { at: 70 + i * 26, x: x,    state: 'stance', facing: -1, alpha: 1 },
        ] };
      }
      if (phase === 1) {
        return { color: GUARD, pos: [
          { at: 0,            x: x, state: 'stance', facing: -1 },
          { at: 120 + i * 30, x: x, state: 'hands',  facing: -1 },
          { at: 190 + i * 30, x: x, state: 'stance', facing: -1 },
        ] };
      }
      return { color: GUARD, pos: [{ at: 0, x: x, state: 'stance', facing: -1 }] };
    });
  }
  S[58] = {
    bg: 'fracture',
    npcColor: FOURTH,
    beats: [
      {
        // They wore the Third Architect's colours.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.52, cy: 0.58 },
          { at: 110, zoom: 1.15, cx: 0.48, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.27, state: 'look', facing: 1 }],
        npcPos: [{ at: 0, x: 0.17, state: 'look', facing: 1 }],
        extraFigures: guards(0),
      },
      {
        // Converted. They remembered nothing. Or they did.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.48, cy: 0.52 },
          { at: 80,  zoom: 1.40, cx: 0.66, cy: 0.62 },
          { at: 340, zoom: 1.35, cx: 0.66, cy: 0.60 },
        ],
        playerPos: [{ at: 0, x: 0.27, state: 'look', facing: 1 }],
        npcPos: [{ at: 0, x: 0.17, state: 'look', facing: 1 }],
        extraFigures: guards(1),
        effects: [
          { type: 'static_noise', alpha: 0.22, startFrame: 110, duration: 30 },
          { type: 'static_noise', alpha: 0.22, startFrame: 180, duration: 24 },
        ],
      },
      {
        // Kael reaches toward them. "Don't talk to them. They can't hear you."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.66, cy: 0.60 },
          { at: 30,  zoom: 1.30, cx: 0.26, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,   x: 0.27, state: 'look',   facing: 1 },
          { at: 10,  x: 0.27, state: 'reach',  facing: 1 },
          { at: 110, x: 0.27, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.17, state: 'look', facing: 1 },
          { at: 20,  x: 0.17, state: 'talk', facing: 1 },
          { at: 130, x: 0.17, state: 'idle', facing: 1 },
        ],
        extraFigures: guards(2),
      },
      {
        // The fragment burned. Not in warning. In grief.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.26, cy: 0.58 },
          { at: 60,  zoom: 1.50, cx: 0.26, cy: 0.64 },
          { at: 120, zoom: 1.15, cx: 0.46, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.27, state: 'stance', facing: 1 },
          { at: 14, x: 0.27, state: 'hands',  facing: 1 },
          { at: 96, x: 0.27, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.17, state: 'stance', facing: 1 }],
        extraFigures: guards(2),
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6688cc', alpha: 0.50, fadeIn: 40 },
        ],
      },
    ],
  };

  // Chapter 61: Against the Architect
  // The Third Architect walks out of the portal; the Creator's construct joins them.
  var CONSTRUCT = '#ccccee';
  function construct(a0, a1, t0, t1) {
    return { color: CONSTRUCT, pos: [
      { at: 0,  x: 0.80, state: 'stance', facing: -1, alpha: a0, scale: 1.35 },
      { at: t0, x: 0.80, state: 'stance', facing: -1, alpha: a0, scale: 1.35 },
      { at: t1, x: 0.80, state: 'stance', facing: -1, alpha: a1, scale: 1.35 },
    ] };
  }
  S[61] = {
    bg: 'fracture',
    npcColor: THIRD,
    beats: [
      {
        // The Third Architect came themselves.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.48, cy: 0.48 },
          { at: 120, zoom: 1.15, cx: 0.48, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'look', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.46, state: 'walk', facing: 1, alpha: 0, ease: 'linear' },
          { at: 20,  x: 0.48, state: 'walk', facing: 1, alpha: 1, ease: 'linear' },
          { at: 100, x: 0.64, state: 'walk', facing: 1, ease: 'linear' },
          { at: 104, x: 0.645, state: 'idle', facing: -1 },
        ],
      },
      {
        // "I don't regret it."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.48, cy: 0.52 },
          { at: 50,  zoom: 1.35, cx: 0.62, cy: 0.60 },
          { at: 380, zoom: 1.30, cx: 0.58, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'look',   facing: 1 },
          { at: 60, x: 0.22, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.645, state: 'talk', facing: -1 },
          { at: 130, x: 0.645, state: 'idle', facing: -1 },
        ],
      },
      {
        // "The Preserved are free."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.58, cy: 0.58 },
          { at: 280, zoom: 1.30, cx: 0.54, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.645, state: 'talk',   facing: -1 },
          { at: 30,  x: 0.645, state: 'lookUp', facing: -1 },
          { at: 90,  x: 0.645, state: 'talk',   facing: -1 },
        ],
      },
      {
        // The construct steps out beside them.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.54, cy: 0.58 },
          { at: 40,  zoom: 1.30, cx: 0.74, cy: 0.58 },
          { at: 110, zoom: 1.15, cx: 0.56, cy: 0.52 },
        ],
        camShake: [{ at: 30, strength: 10, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.22, state: 'stance', facing: 1 },
          { at: 32, x: 0.22, state: 'brace',  facing: 1 },
          { at: 60, x: 0.22, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.645, state: 'idle', facing: -1 }],
        extraFigures: [construct(0, 1, 10, 30)],
        effects: [
          { type: 'energy_burst', cx: 0.80, cy: 0.52, color: CONSTRUCT, startFrame: 24, duration: 30 },
        ],
      },
      {
        // "Just long enough for the trade to finalize."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.56, cy: 0.52 },
          { at: 60,  zoom: 1.35, cx: 0.62, cy: 0.60 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.645, state: 'talk', facing: -1 },
          { at: 160, x: 0.645, state: 'idle', facing: -1 },
        ],
        extraFigures: [construct(1, 1, 0, 1)],
      },
      {
        // "I hope you succeed. I mean that."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.62, cy: 0.60 },
          { at: 60,  zoom: 1.40, cx: 0.62, cy: 0.62 },
          { at: 110, zoom: 1.15, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.645, state: 'talk',   facing: -1 },
          { at: 70, x: 0.645, state: 'stance', facing: -1 },
        ],
        extraFigures: [construct(1, 1, 0, 1)],
      },
    ],
  };

  // Chapter 64: The Enforcer
  // The gate floor is marked with chalk outlines. The enforcer stands with its back
  // turned until the last beat.
  var ENF = '#cc0044';
  S[64] = {
    bg: 'fracture',
    npcColor: FOURTH,
    beats: [
      beat({
        // It arrived without announcement.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.20, cy: 0.58 },
          { at: 110, zoom: 1.10, cx: 0.45, cy: 0.50 },
        ],
        camShake: [{ at: 60, strength: 6, dur: 14 }],
        playerPos: [
          { at: 0,  x: 0.15, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 60, x: 0.26, state: 'brace', facing: 1 },
          { at: 90, x: 0.26, state: 'look',  facing: 1 },
        ],
      }, [
        { c: FOURTH, pos: [
          { at: 0,  x: 0.07, state: 'walk', facing: 1, ease: 'linear' },
          { at: 60, x: 0.16, state: 'look', facing: 1 },
        ] },
        { c: ENF, pos: [
          { at: 0,  x: 0.78, state: 'idle', facing: 1, alpha: 0 },
          { at: 59, x: 0.78, state: 'idle', facing: 1, alpha: 0 },
          { at: 61, x: 0.78, state: 'idle', facing: 1, alpha: 1 },
        ] },
      ], -1),
      beat({
        // No face. No voice. Then the floor: what it leaves behind.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.45, cy: 0.50 },
          { at: 90,  zoom: 1.60, cx: 0.78, cy: 0.66 },
          { at: 130, zoom: 1.60, cx: 0.78, cy: 0.66 },
          { at: 200, zoom: 1.40, cx: 0.40, cy: 0.68 },
        ],
        playerPos: [
          { at: 0,   x: 0.26, state: 'look', facing: 1 },
          { at: 150, x: 0.26, state: 'look', facing: 1 },
        ],
      }, [
        still(FOURTH, 0.16, 'look', 1),
        still(ENF, 0.78, 'idle', 1),
      ], -1),
      beat({
        // "Don't let it land a clean hit."
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.40, cy: 0.68 },
          { at: 40,  zoom: 1.35, cx: 0.20, cy: 0.60 },
          { at: 300, zoom: 1.25, cx: 0.30, cy: 0.56 },
        ],
        playerPos: [
          { at: 0,   x: 0.26, state: 'look',   facing: 1 },
          { at: 220, x: 0.26, state: 'stance', facing: 1 },
        ],
      }, [
        { c: FOURTH, pos: [
          { at: 0,   x: 0.16, state: 'look', facing: 1 },
          { at: 20,  x: 0.16, state: 'talk', facing: 1 },
        ] },
        still(ENF, 0.78, 'idle', 1),
      ], 0),
      beat({
        // It turned to you. And charged.
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.30, cy: 0.56 },
          { at: 14, zoom: 1.45, cx: 0.78, cy: 0.63 },
          { at: 30, zoom: 1.10, cx: 0.45, cy: 0.50 },
          { at: 80, zoom: 1.20, cx: 0.36, cy: 0.54 },
        ],
        camShake: [{ at: 66, strength: 16, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'stance', facing: 1 },
          { at: 52, x: 0.26, state: 'guard',  facing: 1 },
          { at: 68, x: 0.24, state: 'brace',  facing: 1 },
          { at: 96, x: 0.24, state: 'stance', facing: 1 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.55, cy: 0.52, count: 22, color: ENF, alpha: 0.55, startFrame: 24, duration: 44, fadeIn: 4 },
          { type: 'screen_flash', color: ENF, startFrame: 66, duration: 10, alpha: 0.28 },
          { type: 'shockwave', cx: 0.32, cy: 0.62, color: '#ff4466', startFrame: 66, duration: 28 },
          { type: 'impact_sparks', cx: 0.32, cy: 0.55, count: 14, color: '#ff6688', startFrame: 66, duration: 24 },
        ],
      }, [
        still(FOURTH, 0.16, 'brace', 1),
        { c: ENF, pos: [
          { at: 0,  x: 0.78, state: 'idle',   facing: 1 },
          { at: 12, x: 0.78, state: 'idle',   facing: -1 },
          { at: 22, x: 0.78, state: 'run',    facing: -1, ease: 'linear' },
          { at: 66, x: 0.38, state: 'attack', facing: -1 },
          { at: 96, x: 0.41, state: 'stance', facing: -1 },
        ] },
      ], -1),
    ],
  };

  // Extra figures default to half opacity when a keyframe gives no alpha. Everyone
  // in these scenes is physically present, so fill in full opacity.
  [50, 51, 52, 53, 54, 56, 58, 61, 64].forEach(function (id) {
    S[id].beats.forEach(function (b) {
      (b.extraFigures || []).forEach(function (ef) {
        (ef.pos || []).forEach(function (k) { if (k.alpha === undefined) k.alpha = 1; });
      });
    });
  });

})(window.STORY_SCENE_SPECS);
