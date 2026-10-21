'use strict';
// Cinematic scene specs for act7. Merges into window.STORY_SCENE_SPECS, which
// smb-story-narrative-scene.js reads, so these load before it.
// 9 specs. Chapter ids: 155, 157, 159, 161, 163, 165, 166, 170, 171
// One staged beat per text beat (tools/scene-strip/align.js), counting afterNarrative:
// it plays after the branch beat from the same spec, offset by the narrative's beat count.
// The voice can hold a beat past its frame budget, so every beat lands its action early
// and ends on a pose that can sit.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  var KAEL = '#4488ff';
  var AXM = '#bb99cc';        // Axiom, freed and diminished
  var GOD = '#ffe8bb';        // God has no form; it shows as light and load
  var ABS = '#ffe8ff';        // Absolute Axiom: God's form with Axiom's kernel
  var AB = { scale: 1.5 };
  var PARADOX = '#00ffff', CALIX = '#66ccaa', SOV = '#ff4455';
  var NO_NPC = [{ at: 0, x: 0.5, state: 'idle', facing: 1, alpha: 0, show: false }];

  function k(at, x, state, facing, o) {
    var r = { at: at, x: x, state: state, facing: facing };
    if (o) for (var p in o) r[p] = o[p];
    return r;
  }
  function walk(at, x, facing, o) { return k(at, x, 'walk', facing, Object.assign({ ease: 'linear' }, o || {})); }
  function run(at, x, facing, o) { return k(at, x, 'run', facing, Object.assign({ ease: 'linear' }, o || {})); }
  function ab(at, x, state, facing, o) { return k(at, x, state, facing, Object.assign({}, AB, o || {})); }
  // Extra figures default to alpha 0.55 in the renderer; anyone physically present is 1.
  function fig(color, pos) {
    pos.forEach(function (p) { if (p.alpha === undefined) p.alpha = 1; });
    return { color: color, pos: pos };
  }
  function stand(color, x, state, facing, o) { return fig(color, [k(0, x, state, facing, o)]); }
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
  function L(base) { base.letterbox = true; return base; }
  function cont(base) { base.letterbox = true; base.transition = 'none'; return base; }

  // ── The Descent ────────────────────────────────────────────────────────────────

  // Chapter 155: The Figure on the Ridge. Eleven losses, a round taken, and the
  // admission at night.
  var K155 = 0.40, A155 = 0.60;
  S[155] = {
    bg: 'level', level: { ch: 156, x: 3600 },
    npcColor: AXM,
    beats: [
      L({
        // Sparring on the second day of the descent.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.50, cy: 1.00 }, { at: 100, zoom: 1.30, cx: 0.50, cy: 1.00 }],
        camShake: [{ at: 32, strength: 4, dur: 10 }],
        playerPos: [k(0, K155, 'stance', 1), k(30, K155, 'guard', 1), k(60, K155, 'stance', 1)],
        npcPos: [k(0, A155, 'stance', -1), k(28, A155, 'attack', -1), k(60, A155, 'stance', -1)],
        effects: [{ type: 'impact_sparks', cx: 0.50, cy: 0.62, count: 8, color: '#ddccee', startFrame: 32, duration: 16 }],
      }),
      cont({
        // His idea. "You fight like the fragment is a reserve."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.50, cy: 1.00 }, { at: 120, zoom: 1.40, cx: 0.56, cy: 1.00 }],
        playerPos: [k(0, K155, 'stance', 1), k(30, K155, 'listen', 1)],
        npcPos: [k(0, A155, 'stance', -1), k(20, A155, 'talk', -1), k(120, A155, 'idle', -1)],
      }),
      cont({
        // "It is a second nervous system."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.56, cy: 1.00 }, { at: 60, zoom: 1.45, cx: 0.46, cy: 1.00 }],
        playerPos: [k(0, K155, 'listen', 1), k(40, K155, 'hands', 1)],
        npcPos: [k(0, A155, 'idle', -1), k(8, A155, 'point', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.28, startFrame: 40, fadeIn: 20 }],
      }),
      cont({
        // He beat you eleven times in a row. Not with power. With time.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.46, cy: 1.00 }, { at: 40, zoom: 1.30, cx: 0.52, cy: 1.00 }],
        camShake: [{ at: 54, strength: 6, dur: 12 }, { at: 264, strength: 6, dur: 12 }],
        playerPos: [k(0, K155, 'hands', 1), k(16, K155, 'stance', 1), run(30, K155, 1), k(50, 0.50, 'attack', 1), k(62, 0.50, 'hit', 1), k(80, 0.47, 'fall', 1),
                    k(120, 0.46, 'kneel', 1), k(190, 0.46, 'stance', 1), run(230, 0.46, 1), k(250, 0.52, 'attack', 1), k(266, 0.52, 'hit', 1), k(284, 0.49, 'fall', 1), k(330, 0.48, 'kneel', 1)],
        npcPos: [k(0, A155, 'point', -1), k(16, A155, 'stance', -1), k(52, 0.62, 'attack', -1), k(90, 0.62, 'stance', -1), k(262, 0.63, 'attack', -1), k(300, 0.63, 'stance', -1), k(420, 0.63, 'idle', -1)],
        effects: [
          { type: 'impact_sparks', cx: 0.56, cy: 0.60, count: 10, color: '#ddccee', startFrame: 54, duration: 18 },
          { type: 'impact_sparks', cx: 0.57, cy: 0.60, count: 10, color: '#ddccee', startFrame: 264, duration: 18 },
        ],
      }),
      cont({
        // "Perception first," he said, pulling you up off the ground.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.52, cy: 1.00 }, { at: 120, zoom: 1.45, cx: 0.54, cy: 1.00 }],
        playerPos: [k(0, 0.48, 'kneel', 1), k(60, 0.48, 'idle', 1), k(110, 0.48, 'listen', 1), k(380, 0.48, 'stance', 1)],
        npcPos: [k(0, 0.63, 'idle', -1), walk(10, 0.63, -1), k(44, 0.57, 'reach', -1), k(100, 0.57, 'talk', -1), k(400, 0.57, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.24, startFrame: 300, fadeIn: 40 }],
      }),
      // afterNarrative (offset by the 5 beats above)
      L({
        // By the fourth day you took a round off him. He seemed genuinely pleased.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.52, cy: 1.00 }, { at: 120, zoom: 1.35, cx: 0.52, cy: 1.00 }],
        camShake: [{ at: 24, strength: 7, dur: 12 }],
        playerPos: [k(0, 0.46, 'stance', 1), run(8, 0.46, 1), k(22, 0.52, 'attack', 1), k(60, 0.52, 'stance', 1), k(110, 0.52, 'idle', 1)],
        npcPos: [k(0, 0.60, 'stance', -1), k(24, 0.62, 'hit', -1), k(50, 0.62, 'stance', -1), k(90, 0.62, 'idle', -1)],
        effects: [{ type: 'impact_sparks', cx: 0.58, cy: 0.60, count: 12, color: '#88bbff', startFrame: 24, duration: 18 }],
      }),
      cont({
        // That night, looking down the descent route.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.52, cy: 1.00 }, { at: 120, zoom: 1.30, cx: 0.54, cy: 1.00 }],
        playerPos: [k(0, K155, 'idle', 1)],
        npcPos: [k(0, 0.64, 'look', 1)],
        effectsBehind: [{ type: 'sky_bleed', color: '#110022', alpha: 0.30, fadeIn: 40 }],
      }),
      cont({
        // "I was the figure on the ridge." Without turning around.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.54, cy: 1.00 }, { at: 30, zoom: 1.50, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, K155, 'idle', 1), k(30, K155, 'brace', 1), k(90, K155, 'look', 1)],
        npcPos: [k(0, 0.64, 'look', 1), k(6, 0.64, 'talk', 1), k(110, 0.64, 'look', 1)],
        effectsBehind: [{ type: 'sky_bleed', color: '#110022', alpha: 0.30 }],
      }),
      cont({
        // No apology. A fact, set down like a weapon on a table.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.48, cy: 1.00 }, { at: 80, zoom: 1.40, cx: 0.54, cy: 1.00 }],
        playerPos: [k(0, K155, 'look', 1)],
        npcPos: [k(0, 0.64, 'look', 1), k(30, 0.64, 'idle', -1)],
        effectsBehind: [{ type: 'sky_bleed', color: '#110022', alpha: 0.30 }],
      }),
      cont({
        // Veran. The lie built out of true things.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.54, cy: 1.00 }, { at: 400, zoom: 1.50, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, K155, 'look', 1), k(150, K155, 'hands', 1)],
        npcPos: [k(0, 0.64, 'idle', -1)],
        extraFigures: [fig('#3ddc84', [k(0, 0.52, 'idle', -1, { alpha: 0 }), k(40, 0.52, 'idle', -1, { alpha: 0.24 }), k(260, 0.52, 'idle', -1, { alpha: 0.24 }), k(340, 0.52, 'kneel', -1, { alpha: 0 })])],
        effectsBehind: [{ type: 'sky_bleed', color: '#110022', alpha: 0.30 }],
      }),
      cont({
        // The man teaching you. The man you saved. The same man.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.48, cy: 1.00 }, { at: 120, zoom: 1.30, cx: 0.52, cy: 1.00 }],
        playerPos: [k(0, K155, 'hands', 1), k(20, K155, 'look', 1)],
        npcPos: [k(0, 0.64, 'idle', -1)],
        effectsBehind: [{ type: 'sky_bleed', color: '#110022', alpha: 0.30 }],
      }),
    ],
  };

  // ── God's Domain ───────────────────────────────────────────────────────────────

  // Chapter 157: God's Threshold. The domain acknowledges Kael and braces around Axiom.
  var K157 = 0.48, A157 = 0.36;
  function braceRing(t, x) { return { type: 'shockwave', cx: x, cy: 0.62, color: GOD, startFrame: t, duration: 40 }; }
  S[157] = {
    bg: 'level', level: { ch: 158, x: 450 },
    npcColor: AXM,
    beats: [
      L({
        // God's domain was not what you expected.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.36, cy: 0.71 }, { at: 100, zoom: 1.25, cx: 0.44, cy: 0.70 }],
        playerPos: [walk(0, 0.34, 1), k(60, K157, 'lookUp', 1)],
        npcPos: [walk(0, 0.22, 1), k(60, A157, 'look', 1)],
      }),
      cont({
        // Not void. Not fracture. Not wreckage.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.44, cy: 0.70 }, { at: 200, zoom: 1.10, cx: 0.62, cy: 0.64, ease: 'linear' }],
        playerPos: [k(0, K157, 'lookUp', 1), k(40, K157, 'look', 1)],
        npcPos: [k(0, A157, 'look', 1)],
      }),
      cont({
        // It was built, by someone who understood load.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.62, cy: 0.64 }, { at: 380, zoom: 1.20, cx: 0.50, cy: 0.69, ease: 'linear' }],
        playerPos: [k(0, K157, 'look', 1), k(60, K157, 'lookUp', 1)],
        npcPos: [k(0, A157, 'look', 1), k(120, A157, 'lookUp', 1)],
      }),
      // afterNarrative (offset by the 3 beats above)
      L({
        // Something noticed you had arrived.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.50, cy: 0.69 }, { at: 80, zoom: 1.30, cx: 0.46, cy: 0.71 }],
        camShake: [{ at: 10, strength: 3, dur: 20 }],
        playerPos: [k(0, K157, 'lookUp', 1), k(10, K157, 'brace', 1)],
        npcPos: [k(0, A157, 'lookUp', 1), k(14, A157, 'stance', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.24, startFrame: 10, fadeIn: 30 }],
      }),
      cont({
        // You, it acknowledged. The one it had opened doors for.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.46, cy: 0.71 }, { at: 80, zoom: 1.50, cx: 0.48, cy: 0.72 }],
        playerPos: [k(0, K157, 'brace', 1), k(30, K157, 'lookUp', 1), k(150, K157, 'idle', 1)],
        npcPos: [k(0, A157, 'stance', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.24 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.26, startFrame: 20, fadeIn: 30 }],
        effects: [braceRing(20, K157)],
      }),
      cont({
        // Axiom, it did not acknowledge.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.48, cy: 0.72 }, { at: 50, zoom: 1.55, cx: 0.36, cy: 0.73 }],
        playerPos: [k(0, K157, 'idle', 1)],
        npcPos: [k(0, A157, 'stance', 1), k(20, A157, 'lookUp', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.20 }],
      }),
      cont({
        // It turned toward him.
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.36, cy: 0.73 }, { at: 40, zoom: 1.40, cx: 0.40, cy: 0.72 }],
        camShake: [{ at: 8, strength: 8, dur: 16 }],
        playerPos: [k(0, K157, 'idle', 1), k(20, K157, 'look', -1)],
        npcPos: [k(0, A157, 'lookUp', 1), k(8, A157, 'brace', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.30 }],
        effects: [braceRing(8, A157)],
      }),
      cont({
        // The architecture braced around him like a body around a splinter.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.40, cy: 0.72 }, { at: 120, zoom: 1.12, cx: 0.58, cy: 0.66 }],
        camShake: [{ at: 40, strength: 3, dur: 14 }, { at: 160, strength: 3, dur: 14 }, { at: 280, strength: 3, dur: 14 }],
        playerPos: [k(0, K157, 'look', -1), k(80, K157, 'look', 1), k(200, K157, 'lookUp', 1)],
        npcPos: [k(0, A157, 'brace', 1), k(60, A157, 'idle', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.30 }],
        effects: [braceRing(40, A157), braceRing(160, A157), braceRing(280, A157)],
      }),
      cont({
        // "It knows me. I built my war on its roof."
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.58, cy: 0.66 }, { at: 80, zoom: 1.40, cx: 0.42, cy: 0.72 }],
        playerPos: [k(0, K157, 'lookUp', 1), k(40, K157, 'look', -1)],
        npcPos: [k(0, A157, 'idle', 1), k(10, A157, 'talk', 1), k(300, A157, 'lookUp', 1), k(500, A157, 'idle', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.26 }],
      }),
      cont({
        // Down the interior, where Sovereign's trail ran bright and unhidden.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.42, cy: 0.72 }, { at: 200, zoom: 1.12, cx: 0.62, cy: 0.66, ease: 'linear' }],
        playerPos: [k(0, K157, 'look', -1), k(30, K157, 'look', 1)],
        npcPos: [k(0, A157, 'idle', 1), k(14, A157, 'look', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.22 }],
        effects: [{ type: 'motion_blur', fromX: 0.50, toX: 0.98, color: SOV, steps: 8, startFrame: 40, duration: 240 }],
      }),
      cont({
        // "And the trail leads exactly where I am least welcome."
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.62, cy: 0.66 }, { at: 60, zoom: 1.30, cx: 0.44, cy: 0.71 }],
        playerPos: [k(0, K157, 'look', 1)],
        npcPos: [k(0, A157, 'look', 1), k(8, A157, 'talk', 1), k(90, A157, 'stance', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.22 }],
      }),
    ],
  };

  // Chapter 159: What You Are. God speaks in structure. It opened its door for Kael,
  // never for him.
  var K159 = 0.36, A159 = 0.52;
  S[159] = {
    bg: 'level', level: { ch: 158, x: 3000 },
    npcColor: AXM,
    beats: [
      L({
        // God did not speak in words.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.44, cy: 0.70 }, { at: 100, zoom: 1.30, cx: 0.44, cy: 0.71 }],
        playerPos: [k(0, K159, 'look', 1), k(30, K159, 'lookUp', 1)],
        npcPos: [k(0, A159, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.22, fadeIn: 30 }],
      }),
      cont({
        // Structural: felt in the foundation rather than heard.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.71 }, { at: 200, zoom: 1.10, cx: 0.50, cy: 0.64 }],
        camShake: [{ at: 20, strength: 3, dur: 90 }],
        playerPos: [k(0, K159, 'lookUp', 1), k(20, K159, 'brace', 1), k(160, K159, 'look', 1)],
        npcPos: [k(0, A159, 'idle', -1), k(24, A159, 'brace', -1), k(160, A159, 'look', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
        effects: [{ type: 'shockwave', cx: 0.44, cy: 0.70, color: GOD, startFrame: 20, duration: 60 }, { type: 'shockwave', cx: 0.44, cy: 0.70, color: GOD, startFrame: 110, duration: 60 }],
      }),
      cont({
        // It had watched the fractures, the ninety-four, the void, the man beside you.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.64 }, { at: 600, zoom: 1.20, cx: 0.52, cy: 0.69, ease: 'linear' }],
        playerPos: [k(0, K159, 'look', 1), k(80, K159, 'listen', 1), k(500, K159, 'hands', 1)],
        npcPos: [k(0, A159, 'look', 1)],
        effectsBehind: [
          { type: 'fragment_pulse', color: GOD, alpha: 0.22 },
          { type: 'portal', xf: 0.70, yf: 0.56, height: 0.30, color: '#aa66ff', alpha: 0.40, startFrame: 30, duration: 140 },
        ],
        extraFigures: [0.62, 0.68, 0.74].map(function (x, i) {
          return fig(['#665577', '#556677', '#776655'][i], [k(0, x, 'kneel', -1, { alpha: 0 }), k(170 + i * 20, x, 'kneel', -1, { alpha: 0 }), k(210 + i * 20, x, 'kneel', -1, { alpha: 0.20 }), k(330, x, 'kneel', -1, { alpha: 0.20 }), k(370, x, 'kneel', -1, { alpha: 0 })]);
        }).concat([fig('#cc44ff', [k(0, 0.70, 'idle', -1, { alpha: 0, scale: 1.45 }), k(380, 0.70, 'idle', -1, { alpha: 0, scale: 1.45 }), k(420, 0.70, 'idle', -1, { alpha: 0.22, scale: 1.45 }), k(520, 0.70, 'idle', -1, { alpha: 0.22, scale: 1.45 }), k(570, 0.70, 'idle', -1, { alpha: 0, scale: 1.45 })])]),
      }),
      cont({
        // The variable nothing had accounted for. It had opened its door for you.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.52, cy: 0.69 }, { at: 60, zoom: 1.45, cx: 0.38, cy: 0.72 }],
        playerPos: [k(0, K159, 'hands', 1), k(20, K159, 'lookUp', 1)],
        npcPos: [k(0, A159, 'look', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.24 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.28, startFrame: 20, fadeIn: 24 }],
      }),
      cont({
        // It had not opened its door for him.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.38, cy: 0.72 }, { at: 40, zoom: 1.55, cx: 0.54, cy: 0.73 }],
        playerPos: [k(0, K159, 'lookUp', 1)],
        npcPos: [k(0, A159, 'look', 1), k(20, A159, 'idle', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.16 }],
      }),
      // afterNarrative (offset by the 5 beats above)
      L({
        // Him, it had carried. Five thousand years of war on its foundations.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.46, cy: 0.70 }, { at: 600, zoom: 1.20, cx: 0.54, cy: 0.69, ease: 'linear' }],
        camShake: [{ at: 120, strength: 2, dur: 12 }, { at: 300, strength: 2, dur: 12 }, { at: 480, strength: 2, dur: 12 }],
        playerPos: [k(0, K159, 'idle', 1), walk(40, K159, 1), k(170, 0.44, 'look', 1)],
        npcPos: [k(0, A159, 'idle', 1), walk(20, A159, 1), k(150, 0.60, 'idle', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.22 }],
        effects: [120, 300, 480].map(function (t) { return { type: 'shockwave', cx: 0.60, cy: 0.62, color: GOD, startFrame: t, duration: 40 }; }),
      }),
      cont({
        // Distance was the tolerance. The roof was the tolerance.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.54, cy: 0.69 }, { at: 60, zoom: 1.40, cx: 0.58, cy: 0.72 }],
        playerPos: [k(0, 0.44, 'look', 1)],
        npcPos: [k(0, 0.60, 'idle', 1), k(14, 0.60, 'lookUp', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.22 }],
      }),
      cont({
        // He was not on the roof anymore.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.58, cy: 0.72 }, { at: 30, zoom: 1.25, cx: 0.52, cy: 0.70 }],
        camShake: [{ at: 6, strength: 8, dur: 16 }],
        playerPos: [k(0, 0.44, 'look', 1), k(8, 0.44, 'brace', 1)],
        npcPos: [k(0, 0.60, 'lookUp', 1), k(6, 0.60, 'brace', 1), k(50, 0.60, 'stance', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
        effects: [{ type: 'shockwave', cx: 0.60, cy: 0.62, color: GOD, startFrame: 6, duration: 40 }],
      }),
      cont({
        // Something enormous and very old arriving at a decision.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.52, cy: 0.70 }, { at: 400, zoom: 1.10, cx: 0.56, cy: 0.64, ease: 'linear' }],
        playerPos: [k(0, 0.44, 'brace', 1), k(40, 0.44, 'stance', 1)],
        npcPos: [k(0, 0.60, 'stance', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.24, fadeIn: 200 }, { type: 'fragment_pulse', color: GOD, alpha: 0.20, startFrame: 200, fadeIn: 160 }],
      }),
    ],
  };

  // Chapter 161: God. A pillar of light at the center; it steps between Axiom and
  // everything beyond.
  var K161 = 0.34, A161 = 0.48;
  function godAt(x, t0, t1, a) {
    var e = { type: 'portal', xf: x, yf: 0.48, height: 0.56, color: GOD, alpha: a || 0.60 };
    if (t0) e.startFrame = t0;
    if (t1) e.duration = t1;
    return e;
  }
  S[161] = {
    bg: 'level', level: { ch: 160, x: 3300 },
    npcColor: AXM,
    beats: [
      L({
        // God was at the center of everything it built.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.36, cy: 0.71 }, { at: 100, zoom: 1.10, cx: 0.52, cy: 0.64 }],
        playerPos: [walk(0, 0.24, 1), k(60, K161, 'lookUp', 1)],
        npcPos: [walk(0, 0.38, 1), k(50, A161, 'look', 1)],
        effectsBehind: [godAt(0.68), { type: 'fragment_pulse', color: GOD, alpha: 0.22, fadeIn: 40 }],
      }),
      cont({
        // Not a throne. Not a form designed to be seen from outside.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.52, cy: 0.64 }, { at: 360, zoom: 1.30, cx: 0.62, cy: 0.71, ease: 'linear' }],
        playerPos: [k(0, K161, 'lookUp', 1)],
        npcPos: [k(0, A161, 'look', 1), k(80, A161, 'lookUp', 1)],
        effectsBehind: [godAt(0.68), { type: 'fragment_pulse', color: GOD, alpha: 0.22 }],
      }),
      cont({
        // Sovereign's trail ran past it, through the center, out the far side.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.62, cy: 0.71 }, { at: 80, zoom: 1.10, cx: 0.52, cy: 0.64 }],
        playerPos: [k(0, K161, 'lookUp', 1), k(40, K161, 'look', 1)],
        npcPos: [k(0, A161, 'lookUp', 1), k(30, A161, 'point', 1), k(300, A161, 'look', 1)],
        effectsBehind: [godAt(0.68), { type: 'fragment_pulse', color: GOD, alpha: 0.22 }],
        effects: [{ type: 'motion_blur', fromX: 0.40, toX: 0.98, color: SOV, steps: 9, startFrame: 30, duration: 300 }],
      }),
      // afterNarrative (offset by the 3 beats above)
      L({
        // God moved.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.52, cy: 0.64 }, { at: 20, zoom: 1.25, cx: 0.52, cy: 0.70 }],
        camShake: [{ at: 6, strength: 12, dur: 22 }],
        playerPos: [k(0, K161, 'look', 1), k(8, K161, 'brace', 1)],
        npcPos: [k(0, A161, 'look', 1), k(8, A161, 'brace', 1)],
        effectsBehind: [godAt(0.68, 0, 6), godAt(0.57, 6, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
        effects: [
          { type: 'shockwave', cx: 0.57, cy: 0.56, color: GOD, startFrame: 6, duration: 40 },
          { type: 'screen_flash', color: GOD, startFrame: 6, duration: 12, alpha: 0.25 },
        ],
      }),
      cont({
        // Between Axiom and everything beyond: a single structural statement.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.52, cy: 0.70 }, { at: 400, zoom: 1.35, cx: 0.50, cy: 0.72, ease: 'linear' }],
        playerPos: [k(0, K161, 'brace', 1), k(60, K161, 'look', 1)],
        npcPos: [k(0, A161, 'brace', 1), k(80, A161, 'stance', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
      }),
      cont({
        // No further.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.50, cy: 0.72 }, { at: 20, zoom: 1.45, cx: 0.52, cy: 0.72 }],
        camShake: [{ at: 4, strength: 8, dur: 14 }],
        playerPos: [k(0, K161, 'look', 1)],
        npcPos: [k(0, A161, 'stance', 1), k(4, A161, 'brace', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.80), { type: 'fragment_pulse', color: GOD, alpha: 0.32 }],
        effects: [{ type: 'shockwave', cx: 0.57, cy: 0.56, color: GOD, startFrame: 4, duration: 36 }],
      }),
      cont({
        // "I am not what I was," Axiom said.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.52, cy: 0.72 }, { at: 60, zoom: 1.50, cx: 0.50, cy: 0.72 }],
        playerPos: [k(0, K161, 'look', 1)],
        npcPos: [k(0, A161, 'brace', 1), k(10, A161, 'talk', 1), k(80, A161, 'idle', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
      }),
      cont({
        // Not a plea. A correction.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.50, cy: 0.72 }, { at: 80, zoom: 1.40, cx: 0.50, cy: 0.72 }],
        playerPos: [k(0, K161, 'look', 1)],
        npcPos: [k(0, A161, 'idle', 1), k(20, A161, 'stance', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
      }),
      cont({
        // The domain did not process corrections. It processed load.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.50, cy: 0.72 }, { at: 100, zoom: 1.25, cx: 0.50, cy: 0.70 }],
        camShake: [{ at: 30, strength: 5, dur: 16 }],
        playerPos: [k(0, K161, 'look', 1)],
        npcPos: [k(0, A161, 'stance', 1), k(30, A161, 'brace', 1), k(90, A161, 'stance', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.85), { type: 'fragment_pulse', color: GOD, alpha: 0.34 }],
        effects: [{ type: 'shockwave', cx: 0.57, cy: 0.56, color: GOD, startFrame: 30, duration: 36 }],
      }),
      cont({
        // An unconstrained Sovereign, loose, with a god-form waiting to be claimed.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.50, cy: 0.70 }, { at: 300, zoom: 1.10, cx: 0.56, cy: 0.64, ease: 'linear' }],
        playerPos: [k(0, K161, 'look', 1)],
        npcPos: [k(0, A161, 'stance', 1)],
        extraFigures: [fig(SOV, [run(0, 0.70, 1, { alpha: 0 }), run(40, 0.72, 1, { alpha: 0.24 }), run(200, 0.84, 1, { alpha: 0.24 }), k(240, 0.86, 'run', 1, { alpha: 0 })])],
        effectsBehind: [godAt(0.57, 0, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
      }),
      cont({
        // "I cannot turn around," he said quietly.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.56, cy: 0.64 }, { at: 60, zoom: 1.45, cx: 0.48, cy: 0.72 }],
        playerPos: [k(0, K161, 'look', 1)],
        npcPos: [k(0, A161, 'stance', 1), k(10, A161, 'talk', 1), k(80, A161, 'stance', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
      }),
      cont({
        // To God. To you. To no one.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.48, cy: 0.72 }, { at: 80, zoom: 1.40, cx: 0.44, cy: 0.72 }],
        playerPos: [k(0, K161, 'look', 1)],
        npcPos: [k(0, A161, 'stance', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
      }),
      cont({
        // Neutrality and trespass, facing each other in the oldest room.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.44, cy: 0.72 }, { at: 300, zoom: 1.12, cx: 0.50, cy: 0.66, ease: 'linear' }],
        playerPos: [k(0, K161, 'look', 1)],
        npcPos: [k(0, A161, 'stance', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }],
      }),
      cont({
        // You stepped forward, and stood with him.
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.50, cy: 0.66 }, { at: 90, zoom: 1.30, cx: 0.48, cy: 0.71 }],
        playerPos: [k(0, K161, 'look', 1), walk(10, K161, 1), k(60, 0.42, 'stance', 1)],
        npcPos: [k(0, A161, 'stance', 1)],
        effectsBehind: [godAt(0.57, 0, 0, 0.75), { type: 'fragment_pulse', color: GOD, alpha: 0.28 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.26, startFrame: 60, fadeIn: 20 }],
      }),
    ],
  };

  // ── The Lab ────────────────────────────────────────────────────────────────────

  // Chapter 163: The Lab. Three minutes too late: the fusion completes as Kael
  // comes through the door. Absolute Axiom leaves; Sovereign stays.
  var K163 = 0.30;
  function sov(pos) { return fig(SOV, pos); }
  S[163] = {
    bg: 'level', level: { ch: 67, x: 1500 },
    npcColor: PARADOX,
    beats: [
      L({
        // The trail did not lead deeper.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.24, cy: 0.72 }, { at: 100, zoom: 1.30, cx: 0.30, cy: 0.71 }],
        playerPos: [walk(0, 0.20, 1), k(50, K163, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'portal', xf: 0.18, yf: 0.56, height: 0.32, color: SOV, alpha: 0.50, duration: 60 }],
      }),
      cont({
        // Up and out, to a place you had been before.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.30, cy: 0.71 }, { at: 200, zoom: 1.15, cx: 0.42, cy: 0.68 }],
        playerPos: [k(0, K163, 'look', 1), k(30, K163, 'lookUp', 1), k(120, K163, 'look', 1)],
        npcPos: NO_NPC,
      }),
      cont({
        // The lab. Where Sovereign was built. Where Calix slept in a sealed column.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.42, cy: 0.68 }, { at: 300, zoom: 1.25, cx: 0.50, cy: 0.70, ease: 'linear' }],
        playerPos: [k(0, K163, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(CALIX, [k(0, 0.56, 'idle', 1, { alpha: 0 }), k(200, 0.56, 'idle', 1, { alpha: 0 }), k(260, 0.56, 'idle', 1, { alpha: 0.20 })])],
      }),
      // afterNarrative (offset by the 3 beats above)
      L({
        // You were three minutes too late.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.34, cy: 0.71 }, { at: 60, zoom: 1.20, cx: 0.48, cy: 0.69 }],
        playerPos: [run(0, K163, 1), k(30, 0.38, 'brace', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(ABS, 0.62, 'kneel', -1, AB), stand(SOV, 0.78, 'stance', -1)],
      }),
      cont({
        // God's form, and threaded into its core, the kernel. The man. Your friend.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.48, cy: 0.69 }, { at: 120, zoom: 1.45, cx: 0.62, cy: 0.72 }, { at: 500, zoom: 1.30, cx: 0.56, cy: 0.71 }],
        playerPos: [k(0, 0.38, 'brace', 1), k(60, 0.38, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(ABS, 0.62, 'kneel', -1, AB), stand(SOV, 0.78, 'stance', -1),
                       fig(AXM, [k(0, 0.62, 'kneel', -1, { alpha: 0 }), k(260, 0.62, 'kneel', -1, { alpha: 0.30 }), k(420, 0.62, 'kneel', -1, { alpha: 0.30 }), k(480, 0.62, 'kneel', -1, { alpha: 0 })])],
        effectsBehind: [{ type: 'fragment_pulse', color: ABS, alpha: 0.26, fadeIn: 60 }],
      }),
      cont({
        // The fusion completed as you came through the door.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.56, cy: 0.71 }, { at: 20, zoom: 1.15, cx: 0.52, cy: 0.68 }],
        camShake: [{ at: 8, strength: 14, dur: 22 }],
        playerPos: [k(0, 0.38, 'look', 1), k(8, 0.38, 'brace', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(ABS, 0.62, 'kneel', -1, AB), fig(SOV, [k(0, 0.78, 'stance', -1), k(10, 0.78, 'brace', -1), k(40, 0.78, 'stance', -1)])],
        effects: [
          { type: 'energy_burst', cx: 0.62, cy: 0.60, color: ABS, startFrame: 8, duration: 36 },
          { type: 'screen_flash', color: '#ffffff', startFrame: 8, duration: 12, alpha: 0.25 },
        ],
      }),
      cont({
        // Paradox's voice, far beneath everything.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.52, cy: 0.68 }, { at: 60, zoom: 1.65, cx: 0.34, cy: 0.73 }],
        playerPos: [k(0, 0.38, 'brace', 1), k(20, 0.38, 'hands', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(ABS, 0.62, 'kneel', -1, AB), stand(SOV, 0.78, 'stance', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.22, startFrame: 20, fadeIn: 30 }],
      }),
      cont({
        // "What do you see?"
        camAnim: [{ at: 0, zoom: 1.65, cx: 0.34, cy: 0.73 }, { at: 70, zoom: 1.65, cx: 0.34, cy: 0.73 }],
        playerPos: [k(0, 0.38, 'hands', 1), k(40, 0.38, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(ABS, 0.62, 'kneel', -1, AB), stand(SOV, 0.78, 'stance', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.22 }],
        bubbleX: 0.42,
      }),
      cont({
        // You had a name.
        camAnim: [{ at: 0, zoom: 1.65, cx: 0.34, cy: 0.73 }, { at: 40, zoom: 1.30, cx: 0.52, cy: 0.71 }],
        playerPos: [k(0, 0.38, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(ABS, 0.62, 'kneel', -1, AB), stand(SOV, 0.78, 'stance', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.16, duration: 40 }],
      }),
      cont({
        // Absolute Axiom.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.52, cy: 0.71 }, { at: 30, zoom: 1.40, cx: 0.60, cy: 0.72 }],
        camShake: [{ at: 10, strength: 8, dur: 18 }],
        playerPos: [k(0, 0.38, 'look', 1), k(12, 0.38, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(ABS, [ab(0, 0.62, 'kneel', -1), ab(10, 0.62, 'stance', -1)]), stand(SOV, 0.78, 'stance', -1)],
        effects: [{ type: 'shockwave', cx: 0.62, cy: 0.58, color: ABS, startFrame: 10, duration: 40 }],
      }),
      cont({
        // Something that knew your name tried to surface. Reached. Failed.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.60, cy: 0.72 }, { at: 120, zoom: 1.25, cx: 0.50, cy: 0.70 }],
        playerPos: [k(0, 0.38, 'stance', 1), k(150, 0.38, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(ABS, [ab(0, 0.62, 'stance', -1), ab(30, 0.62, 'look', -1), ab(150, 0.60, 'reach', -1), ab(240, 0.62, 'brace', -1), ab(320, 0.62, 'idle', -1)]),
                       stand(SOV, 0.78, 'stance', -1),
                       fig(AXM, [k(0, 0.60, 'reach', -1, { alpha: 0 }), k(150, 0.60, 'reach', -1, { alpha: 0 }), k(180, 0.60, 'reach', -1, { alpha: 0.30 }), k(240, 0.60, 'reach', -1, { alpha: 0 })])],
        effects: [{ type: 'static_noise', alpha: 0.14, startFrame: 236, duration: 16 }],
      }),
      cont({
        // Then it turned, and left. God's creative force going home.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.50, cy: 0.70 }, { at: 220, zoom: 1.15, cx: 0.56, cy: 0.68 }],
        playerPos: [k(0, 0.38, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(ABS, [ab(0, 0.62, 'idle', -1), ab(30, 0.62, 'idle', 1), ab(50, 0.62, 'walk', 1, { ease: 'linear' }), ab(150, 0.80, 'walk', 1, { alpha: 1 }), ab(200, 0.84, 'walk', 1, { alpha: 0 })]),
                       fig(SOV, [k(0, 0.78, 'stance', -1), walk(40, 0.78, -1), k(80, 0.70, 'stance', -1)])],
        effectsBehind: [{ type: 'portal', xf: 0.84, yf: 0.54, height: 0.40, color: ABS, alpha: 0.55, startFrame: 40, duration: 180 }],
      }),
      cont({
        // Sovereign did not leave.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.56, cy: 0.68 }, { at: 40, zoom: 1.45, cx: 0.66, cy: 0.72 }],
        playerPos: [k(0, 0.38, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [sov([k(0, 0.70, 'stance', -1), k(20, 0.70, 'look', -1)])],
      }),
      cont({
        // Between you and the door, one file left to close.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.66, cy: 0.72 }, { at: 60, zoom: 1.20, cx: 0.54, cy: 0.69 }],
        playerPos: [k(0, 0.38, 'look', 1), k(60, 0.38, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [sov([k(0, 0.70, 'look', -1), walk(30, 0.70, -1), k(80, 0.62, 'stance', -1), k(170, 0.62, 'point', -1), k(280, 0.62, 'stance', -1)])],
      }),
      cont({
        // Yours.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.54, cy: 0.69 }, { at: 40, zoom: 1.55, cx: 0.42, cy: 0.73 }],
        camShake: [{ at: 4, strength: 4, dur: 10 }],
        playerPos: [k(0, 0.38, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [sov([k(0, 0.62, 'stance', -1)])],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.26, fadeIn: 14 }],
      }),
    ],
  };

  // Chapter 165: The Seam. Calix through the compass; the plan plays as a faint
  // diagram of the fused figure coming apart at its join.
  var K165 = 0.36, SEAM = 0.64;
  function seamPair(t, splitAt, a) {
    a = a === undefined ? 0.24 : a;
    var god = [k(0, SEAM + 0.01, 'idle', -1, { alpha: 0, scale: 1.5 }), k(t, SEAM + 0.01, 'idle', -1, { alpha: a, scale: 1.5 })];
    var axm = [k(0, SEAM - 0.01, 'idle', -1, { alpha: 0 }), k(t, SEAM - 0.01, 'idle', -1, { alpha: a + 0.06 })];
    if (splitAt) {
      god.push(k(splitAt, SEAM + 0.01, 'brace', -1, { alpha: a, scale: 1.5 }), k(splitAt + 60, SEAM + 0.10, 'float', -1, { alpha: a, scale: 1.5, y: -0.12 }));
      axm.push(k(splitAt, SEAM - 0.01, 'brace', -1, { alpha: a + 0.06 }), k(splitAt + 60, SEAM - 0.08, 'kneel', -1, { alpha: a + 0.06 }));
    }
    return [fig(GOD, god), fig(AXM, axm)];
  }
  S[165] = {
    bg: 'level', level: { ch: 67, x: 2100 },
    npcColor: CALIX,
    beats: [
      L({
        // Calix's voice, through the compass, from very far away.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.38, cy: 0.72 }, { at: 120, zoom: 1.50, cx: 0.38, cy: 0.72 }],
        playerPos: [k(0, K165, 'crouch', 1), k(40, K165, 'hands', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'static_noise', alpha: 0.06, startFrame: 30, duration: 30 }],
      }),
      cont({
        // "Any engineered bond between incompatible architectures has a seam."
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.38, cy: 0.72 }, { at: 80, zoom: 1.15, cx: 0.50, cy: 0.68 }],
        playerPos: [k(0, K165, 'hands', 1), k(60, K165, 'listen', 1)],
        npcPos: NO_NPC,
        extraFigures: seamPair(80),
        bubbleX: 0.40,
      }),
      cont({
        // "You cannot beat God's form. You cannot beat Axiom's kernel. You do not need to."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.68 }, { at: 340, zoom: 1.25, cx: 0.50, cy: 0.70, ease: 'linear' }],
        playerPos: [k(0, K165, 'listen', 1), k(300, K165, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: seamPair(0),
        bubbleX: 0.40,
      }),
      cont({
        // "Find the seam. Apply fragment radiation to it. The fusion breaks."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.50, cy: 0.70 }, { at: 380, zoom: 1.20, cx: 0.56, cy: 0.69 }],
        camShake: [{ at: 420, strength: 6, dur: 14 }],
        playerPos: [k(0, K165, 'stance', 1), k(40, K165, 'hands', 1), k(360, K165, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: seamPair(0, 420),
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.28, startFrame: 40, fadeIn: 30 }],
        effects: [{ type: 'energy_burst', cx: SEAM, cy: 0.60, color: KAEL, startFrame: 414, duration: 30 }],
        bubbleX: 0.40,
      }),
      cont({
        // "Fight, and you are finding the seam."
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.56, cy: 0.69 }, { at: 60, zoom: 1.40, cx: 0.40, cy: 0.72 }],
        playerPos: [k(0, K165, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [fadeOut(GOD, SEAM + 0.10, 'float', -1, 0, 40, 0.24, { scale: 1.5, y: -0.12 }), fadeOut(AXM, SEAM - 0.08, 'kneel', -1, 0, 40, 0.30)],
        bubbleX: 0.42,
      }),
      cont({
        // A pause. Then, more carefully.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.40, cy: 0.72 }, { at: 80, zoom: 1.50, cx: 0.38, cy: 0.72 }],
        playerPos: [k(0, K165, 'stance', 1), k(30, K165, 'listen', 1)],
        npcPos: NO_NPC,
      }),
      cont({
        // "The energy Paradox left in you still holds a shape."
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.38, cy: 0.72 }, { at: 160, zoom: 1.25, cx: 0.44, cy: 0.70 }],
        playerPos: [k(0, K165, 'listen', 1), k(200, K165, 'hands', 1)],
        npcPos: NO_NPC,
        extraFigures: [fadeIn(PARADOX, 0.52, 'idle', -1, 200, 280, 0.30)],
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.20, startFrame: 200, fadeIn: 60 }],
        bubbleX: 0.40,
      }),
      cont({
        // "Holding it will cost you. And what Paradox spends, it will not get back."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.44, cy: 0.70 }, { at: 280, zoom: 1.35, cx: 0.46, cy: 0.72 }],
        playerPos: [k(0, K165, 'hands', 1), k(60, K165, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(PARADOX, [k(0, 0.52, 'idle', -1, { alpha: 0.30 }), k(120, 0.52, 'idle', -1, { alpha: 0.14 }), k(160, 0.52, 'idle', -1, { alpha: 0.28 }), k(240, 0.52, 'idle', -1, { alpha: 0.16 })])],
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.18 }],
        bubbleX: 0.40,
      }),
      cont({
        // "I think it has been waiting for you to ask."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.46, cy: 0.72 }, { at: 120, zoom: 1.30, cx: 0.44, cy: 0.71 }],
        playerPos: [k(0, K165, 'look', 1), k(100, K165, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(PARADOX, [k(0, 0.52, 'idle', -1, { alpha: 0.18 }), k(30, 0.52, 'look', -1, { alpha: 0.28 })])],
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.18 }],
        bubbleX: 0.40,
      }),
    ],
  };

  // ── Absolute Axiom ─────────────────────────────────────────────────────────────

  // Chapter 166: The Voice Inside. The domain rewritten; his voice breaks through
  // the flat one for a moment.
  var K166 = 0.32, X166 = 0.72;
  function abs166(state, extra) { return [ab(0, X166, state, -1, extra)]; }
  S[166] = {
    bg: 'level', level: { ch: 168, x: 600 },
    npcColor: ABS,
    beats: [
      L({
        // The domain had been rewritten.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.28, cy: 0.72 }, { at: 100, zoom: 1.30, cx: 0.32, cy: 0.71 }],
        playerPos: [walk(0, 0.20, 1), k(56, K166, 'lookUp', 1)],
        npcPos: NO_NPC,
      }),
      cont({
        // Not collapsed: improved.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.32, cy: 0.71 }, { at: 240, zoom: 1.10, cx: 0.52, cy: 0.64, ease: 'linear' }],
        playerPos: [k(0, K166, 'lookUp', 1), k(80, K166, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: ABS, alpha: 0.18, fadeIn: 60 }],
      }),
      cont({
        // And it was building.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.52, cy: 0.64 }, { at: 60, zoom: 1.20, cx: 0.50, cy: 0.69 }],
        camShake: [{ at: 8, strength: 5, dur: 16 }],
        playerPos: [k(0, K166, 'look', 1), k(8, K166, 'brace', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: ABS, alpha: 0.18 }],
        effects: [{ type: 'shockwave', cx: 0.62, cy: 0.56, color: ABS, startFrame: 8, duration: 36 }],
      }),
      cont({
        // This thing built stars. A wall assembled itself out of nothing.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.50, cy: 0.69 }, { at: 400, zoom: 1.15, cx: 0.52, cy: 0.68, ease: 'linear' }],
        camShake: [{ at: 200, strength: 6, dur: 14 }],
        playerPos: [k(0, K166, 'brace', 1), k(60, K166, 'look', 1), k(220, K166, 'stance', 1)],
        npcPos: [ab(0, X166, 'reach', -1, { alpha: 0 }), ab(40, X166, 'reach', -1, { alpha: 0 }), ab(100, X166, 'reach', -1, { alpha: 1 }), ab(300, X166, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: ABS, alpha: 0.20 }],
        effects: [
          { type: 'energy_burst', cx: 0.60, cy: 0.30, color: ABS, startFrame: 60, duration: 30 },
          { type: 'energy_burst', cx: 0.52, cy: 0.52, color: ABS, startFrame: 196, duration: 30 },
          { type: 'shockwave', cx: 0.52, cy: 0.56, color: ABS, startFrame: 200, duration: 40 },
        ],
      }),
      cont({
        // It spoke, and the voice was wrong.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.52, cy: 0.68 }, { at: 60, zoom: 1.40, cx: 0.62, cy: 0.72 }],
        playerPos: [k(0, K166, 'stance', 1)],
        npcPos: [ab(0, X166, 'idle', -1), ab(16, X166, 'look', -1)],
      }),
      cont({
        // "You should not have followed."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.62, cy: 0.72 }, { at: 70, zoom: 1.45, cx: 0.63, cy: 0.72 }],
        playerPos: [k(0, K166, 'stance', 1)],
        npcPos: [ab(0, X166, 'look', -1), ab(4, X166, 'talk', -1), ab(60, X166, 'idle', -1)],
      }),
      cont({
        // Flat. Even. His cadence with everything alive pressed out of it.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.63, cy: 0.72 }, { at: 100, zoom: 1.15, cx: 0.50, cy: 0.68 }],
        playerPos: [k(0, K166, 'stance', 1)],
        npcPos: abs166('idle'),
      }),
      cont({
        // Underneath, in fragments, breaking through.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.68 }, { at: 40, zoom: 1.40, cx: 0.62, cy: 0.72 }],
        playerPos: [k(0, K166, 'stance', 1), k(30, K166, 'look', 1)],
        npcPos: [ab(0, X166, 'idle', -1), ab(20, X166, 'brace', -1)],
        effects: [{ type: 'static_noise', alpha: 0.14, startFrame: 20, duration: 18 }],
      }),
      cont({
        // "—Kael—" "—the bond. The bond hol—" "—stand clear. Stand cl—"
        npcColor: AXM,
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.62, cy: 0.72 }, { at: 120, zoom: 1.45, cx: 0.60, cy: 0.72 }],
        camShake: [{ at: 10, strength: 4, dur: 10 }, { at: 60, strength: 4, dur: 10 }, { at: 110, strength: 4, dur: 10 }],
        playerPos: [k(0, K166, 'look', 1), k(20, K166, 'brace', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(ABS, [ab(0, X166, 'brace', -1), ab(50, X166, 'hands', -1), ab(100, X166, 'brace', -1)]),
                       fig(AXM, [k(0, X166 - 0.02, 'reach', -1, { alpha: 0.35 }), k(40, X166 - 0.02, 'reach', -1, { alpha: 0.10 }), k(60, X166 - 0.02, 'reach', -1, { alpha: 0.35 }),
                                 k(100, X166 - 0.02, 'reach', -1, { alpha: 0.10 }), k(110, X166 - 0.02, 'reach', -1, { alpha: 0.35 }), k(150, X166 - 0.02, 'reach', -1, { alpha: 0.15 })])],
        effects: [10, 60, 110].map(function (t) { return { type: 'static_noise', alpha: 0.16, startFrame: t, duration: 12 }; }),
        bubbleX: 0.58,
      }),
      cont({
        // Then gone. Sealed back under.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.60, cy: 0.72 }, { at: 60, zoom: 1.30, cx: 0.58, cy: 0.71 }],
        playerPos: [k(0, K166, 'brace', 1), k(30, K166, 'look', 1)],
        npcPos: [ab(0, X166, 'brace', -1), ab(14, X166, 'idle', -1)],
        extraFigures: [fadeOut(AXM, X166 - 0.02, 'reach', -1, 0, 14, 0.15)],
      }),
      cont({
        // "The component is stable. It will not surface again."
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.58, cy: 0.71 }, { at: 80, zoom: 1.40, cx: 0.62, cy: 0.72 }],
        playerPos: [k(0, K166, 'look', 1)],
        npcPos: [ab(0, X166, 'idle', -1), ab(6, X166, 'talk', -1), ab(140, X166, 'idle', -1)],
      }),
      cont({
        // The component. The man who corrected your footwork.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.62, cy: 0.72 }, { at: 60, zoom: 1.40, cx: 0.38, cy: 0.72 }],
        playerPos: [k(0, K166, 'look', 1), k(40, K166, 'brace', 1), k(120, K166, 'stance', 1)],
        npcPos: abs166('idle'),
        extraFigures: [fig(AXM, [k(0, 0.44, 'point', -1, { alpha: 0 }), k(40, 0.44, 'point', -1, { alpha: 0.22 }), k(160, 0.44, 'point', -1, { alpha: 0.22 }), k(200, 0.44, 'idle', -1, { alpha: 0 })])],
      }),
      cont({
        // You had excavated him out from under five thousand years once.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.38, cy: 0.72 }, { at: 200, zoom: 1.20, cx: 0.48, cy: 0.69 }],
        playerPos: [k(0, K166, 'stance', 1), k(30, K166, 'hands', 1), k(150, K166, 'stance', 1)],
        npcPos: abs166('idle'),
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.32, startFrame: 30, fadeIn: 30 }],
      }),
      cont({
        // This was just one more layer.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.48, cy: 0.69 }, { at: 40, zoom: 1.30, cx: 0.44, cy: 0.71 }],
        camShake: [{ at: 30, strength: 6, dur: 12 }],
        playerPos: [k(0, K166, 'stance', 1), walk(6, K166, 1), k(30, 0.38, 'stance', 1)],
        npcPos: [ab(0, X166, 'idle', -1), ab(34, X166, 'stance', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.32 }],
        effects: [{ type: 'speedlines', cx: 0.40, cy: 0.58, count: 14, color: '#88bbff', alpha: 0.30, startFrame: 6, duration: 30 }],
      }),
    ],
  };

  // Chapter 170: Peak Form. A blade of his own; four words of the old cadence.
  var K170 = 0.40, X170 = 0.68;
  S[170] = {
    bg: 'level', level: { ch: 168, x: 3900 },
    npcColor: ABS,
    beats: [
      L({
        // Absolute Axiom had no response. No pattern. No catalogue entry.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.68 }, { at: 300, zoom: 1.30, cx: 0.60, cy: 0.71, ease: 'linear' }],
        playerPos: [k(0, K170, 'stance', 1)],
        npcPos: [ab(0, X170, 'stance', -1), ab(60, X170, 'look', -1), ab(200, X170, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.34, fadeIn: 30 }],
      }),
      cont({
        // The fragment was completely clear. Not burning: present.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.71 }, { at: 80, zoom: 1.50, cx: 0.36, cy: 0.72 }],
        playerPos: [k(0, K170, 'stance', 1), k(40, K170, 'hands', 1), k(300, K170, 'stance', 1)],
        npcPos: [ab(0, X170, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.40 }],
      }),
      cont({
        // A phantom blade, executed alone.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.36, cy: 0.72 }, { at: 60, zoom: 1.35, cx: 0.40, cy: 0.72 }],
        camShake: [{ at: 20, strength: 6, dur: 12 }],
        playerPos: [k(0, K170, 'stance', 1), k(16, K170, 'guard', 1), k(120, K170, 'stance', 1)],
        npcPos: [ab(0, X170, 'idle', -1)],
        extraFigures: [fadeOut(PARADOX, 0.32, 'stance', 1, 20, 100, 0.18)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.40 }],
        effects: [
          { type: 'energy_burst', cx: 0.36, cy: 0.60, color: '#88eeff', startFrame: 18, duration: 30 },
          { type: 'speedlines', cx: 0.36, cy: 0.60, count: 16, color: '#88eeff', alpha: 0.30, startFrame: 18, duration: 30 },
        ],
      }),
      cont({
        // Yours.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.40, cy: 0.72 }, { at: 40, zoom: 1.60, cx: 0.36, cy: 0.73 }],
        playerPos: [k(0, K170, 'stance', 1)],
        npcPos: [ab(0, X170, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.40 }],
      }),
      cont({
        // The flat voice said nothing. Underneath, one fragment surfaced.
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.36, cy: 0.73 }, { at: 60, zoom: 1.40, cx: 0.62, cy: 0.72 }],
        playerPos: [k(0, K170, 'stance', 1)],
        npcPos: [ab(0, X170, 'idle', -1), ab(60, X170, 'brace', -1)],
        extraFigures: [fadeIn(AXM, X170 - 0.02, 'look', -1, 120, 180, 0.32)],
        effects: [{ type: 'static_noise', alpha: 0.12, startFrame: 60, duration: 16 }],
      }),
      cont({
        // "—perception first, Kael—"
        npcColor: AXM,
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.62, cy: 0.72 }, { at: 80, zoom: 1.45, cx: 0.60, cy: 0.72 }],
        playerPos: [k(0, K170, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(ABS, [ab(0, X170, 'brace', -1)]), fig(AXM, [k(0, X170 - 0.02, 'look', -1, { alpha: 0.32 }), k(80, X170 - 0.02, 'look', -1, { alpha: 0.32 })])],
        bubbleX: 0.58,
      }),
      cont({
        // You did.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.60, cy: 0.72 }, { at: 24, zoom: 1.20, cx: 0.52, cy: 0.69 }],
        camShake: [{ at: 22, strength: 12, dur: 18 }],
        playerPos: [k(0, K170, 'stance', 1), run(6, K170, 1), k(22, 0.58, 'attack', 1), k(70, 0.58, 'stance', 1)],
        npcPos: [ab(0, X170, 'brace', -1), ab(24, X170, 'hit', -1), ab(60, X170, 'brace', -1)],
        extraFigures: [fadeOut(AXM, X170 - 0.02, 'look', -1, 0, 16, 0.32)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.40 }],
        effects: [
          { type: 'speedlines', cx: 0.50, cy: 0.58, count: 18, color: '#88eeff', alpha: 0.35, startFrame: 6, duration: 24 },
          { type: 'impact_sparks', cx: 0.61, cy: 0.58, count: 14, color: '#ffffff', startFrame: 22, duration: 20 },
          { type: 'screen_flash', color: '#ffffff', startFrame: 22, duration: 10, alpha: 0.25 },
        ],
      }),
    ],
  };

  // Chapter 171: After Everything. The seam breaks; what was carried arrives.
  var K171 = 0.40, X171 = 0.62;
  S[171] = {
    bg: 'level', level: { ch: 168, x: 3700 },
    npcColor: AXM,
    beats: [
      L({
        // The seam broke.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.52, cy: 0.70 }, { at: 30, zoom: 1.15, cx: 0.52, cy: 0.68 }],
        camShake: [{ at: 6, strength: 14, dur: 24 }],
        playerPos: [k(0, K171, 'stance', 1), k(8, K171, 'brace', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(ABS, [ab(0, X171, 'brace', -1), ab(6, X171, 'hit', -1)])],
        effects: [
          { type: 'energy_burst', cx: X171, cy: 0.58, color: ABS, startFrame: 6, duration: 40 },
          { type: 'screen_flash', color: '#ffffff', startFrame: 6, duration: 12, alpha: 0.28 },
        ],
      }),
      cont({
        // A release. Two architectures let go of each other like a held breath.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.52, cy: 0.68 }, { at: 380, zoom: 1.10, cx: 0.54, cy: 0.64, ease: 'linear' }],
        playerPos: [k(0, K171, 'brace', 1), k(60, K171, 'look', 1), k(160, K171, 'lookUp', 1)],
        npcPos: NO_NPC,
        extraFigures: [
          fig(ABS, [ab(0, X171, 'hit', -1), ab(40, X171, 'brace', -1, { alpha: 1 }), ab(120, X171, 'brace', -1, { alpha: 0 })]),
          fig(GOD, [k(0, X171 + 0.01, 'float', -1, { alpha: 0, scale: 1.5 }), k(40, X171 + 0.01, 'float', -1, { alpha: 0.35, scale: 1.5 }),
                    k(260, X171 + 0.06, 'float', -1, { alpha: 0.20, scale: 1.5, y: -0.30 }), k(360, X171 + 0.08, 'float', -1, { alpha: 0, scale: 1.5, y: -0.40 })]),
          fig(AXM, [k(0, X171 - 0.01, 'brace', -1, { alpha: 0 }), k(40, X171 - 0.01, 'brace', -1, { alpha: 0.50 }), k(160, X171 - 0.01, 'kneel', -1, { alpha: 0.50 })]),
        ],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.20, fadeIn: 40 }],
      }),
      cont({
        // Something settled into you. The man from a Tuesday, arriving.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.54, cy: 0.64 }, { at: 120, zoom: 1.30, cx: 0.46, cy: 0.71 }, { at: 600, zoom: 1.45, cx: 0.42, cy: 0.72 }],
        playerPos: [k(0, K171, 'lookUp', 1), k(40, K171, 'look', 1), k(330, K171, 'hands', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(AXM, [k(0, X171 - 0.01, 'kneel', -1, { alpha: 0.50 }), k(120, X171 - 0.01, 'idle', -1, { alpha: 0.50 }), walk(160, X171 - 0.01, -1, { alpha: 0.50 }),
                                 k(320, 0.46, 'idle', -1, { alpha: 0.40 }), k(380, 0.43, 'idle', -1, { alpha: 0 })])],
        effectsBehind: [{ type: 'fragment_pulse', color: GOD, alpha: 0.24 }, { type: 'fragment_pulse', color: AXM, alpha: 0.24, startFrame: 340, fadeIn: 40 }],
      }),
      cont({
        // For one clear second, you saw him whole. He saw you.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.42, cy: 0.72 }, { at: 80, zoom: 1.35, cx: 0.46, cy: 0.72 }],
        playerPos: [k(0, K171, 'hands', 1), k(30, K171, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [fig(AXM, [k(0, 0.52, 'look', -1, { alpha: 0 }), k(30, 0.52, 'look', -1, { alpha: 0.45 }), k(240, 0.52, 'look', -1, { alpha: 0.45 }), k(320, 0.52, 'look', -1, { alpha: 0 })])],
        effectsBehind: [{ type: 'fragment_pulse', color: AXM, alpha: 0.24 }],
      }),
      cont({
        // You asked the silence: "What do you see?"
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.46, cy: 0.72 }, { at: 80, zoom: 1.55, cx: 0.42, cy: 0.73 }],
        playerPos: [k(0, K171, 'look', 1), k(20, K171, 'lookUp', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.12, duration: 60 }],
      }),
      cont({
        // Paradox did not answer. That was what the answer cost.
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.42, cy: 0.73 }, { at: 220, zoom: 1.35, cx: 0.44, cy: 0.72 }],
        playerPos: [k(0, K171, 'lookUp', 1), k(80, K171, 'look', 1), k(160, K171, 'idle', 1)],
        npcPos: NO_NPC,
      }),
      cont({
        // The oldest room in existence was empty.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.44, cy: 0.72 }, { at: 180, zoom: 1.08, cx: 0.50, cy: 0.62, ease: 'linear' }],
        playerPos: [k(0, K171, 'idle', 1)],
        npcPos: NO_NPC,
      }),
      cont({
        // Nothing to carry toward.
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.50, cy: 0.62 }, { at: 160, zoom: 1.12, cx: 0.48, cy: 0.66 }],
        playerPos: [k(0, K171, 'idle', 1), k(90, K171, 'lookUp', 1)],
        npcPos: NO_NPC,
      }),
    ],
  };

})(window.STORY_SCENE_SPECS);
