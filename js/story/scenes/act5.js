'use strict';
// Cinematic scene specs for act5. Merges into window.STORY_SCENE_SPECS, which
// smb-story-narrative-scene.js reads, so these load before it.
// 9 specs. Chapter ids: 70, 72, 148, 149, 150, 151, 152, 153, 154
// One staged beat per text beat (tools/scene-strip/align.js). The voice can hold a
// beat past its frame budget, so every beat lands its action early and ends on a pose
// that can sit.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  var KAEL = '#4488ff';
  var AXIOM = '#cc44ff';       // Axiom at full power
  var AXIOM_MAN = '#bb99cc';   // Axiom freed and diminished, from ch151 on
  var PARADOX = '#00ffff';
  var THIRD = '#88aacc';     // pale steel, so he doesn't read as a second Kael
  var NO_NPC = [{ at: 0, x: 0.5, state: 'idle', facing: 1, alpha: 0, show: false }];

  // Keyframe shorthand: k(at, x, state, facing, extra).
  function k(at, x, state, facing, o) {
    var r = { at: at, x: x, state: state, facing: facing };
    if (o) for (var p in o) r[p] = o[p];
    return r;
  }
  function walk(at, x, facing, o) { return k(at, x, 'walk', facing, Object.assign({ ease: 'linear' }, o || {})); }
  function run(at, x, facing, o) { return k(at, x, 'run', facing, Object.assign({ ease: 'linear' }, o || {})); }
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

  // ── The Threshold ──────────────────────────────────────────────────────────────

  // Chapter 70: The Weight of What's Coming. Axiom stands with its back turned
  // until it says his name.
  var AX70 = { scale: 1.45 };
  function ax70(state, facing, extra) { return [k(0, 0.72, state, facing, Object.assign({}, AX70, extra || {}))]; }
  S[70] = {
    bg: 'fracture',
    npcColor: AXIOM,
    beats: [
      L({
        // Through the dimension wall.
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.06, cy: 0.73 }, { at: 80, zoom: 1.60, cx: 0.14, cy: 0.73, ease: 'linear' }],
        playerPos: [walk(0, 0.12, 1), k(68, 0.27, 'look', 1)],
        npcPos: ax70('idle', 1),
      }),
      cont({
        // And stop.
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.14, cy: 0.73 }, { at: 80, zoom: 1.65, cx: 0.16, cy: 0.73 }],
        playerPos: [k(0, 0.27, 'look', 1), k(6, 0.27, 'brace', 1)],
        npcPos: ax70('idle', 1),
      }),
      cont({
        // It's already there.
        camAnim: [{ at: 0, zoom: 1.65, cx: 0.16, cy: 0.73 }, { at: 40, zoom: 1.10, cx: 0.50, cy: 0.64 }],
        playerPos: [k(0, 0.27, 'brace', 1), k(40, 0.27, 'look', 1)],
        npcPos: ax70('idle', 1),
      }),
      cont({
        // Present the way a mountain is present.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.64 }, { at: 180, zoom: 1.35, cx: 0.62, cy: 0.72, ease: 'linear' }],
        playerPos: [k(0, 0.27, 'look', 1)],
        npcPos: ax70('idle', 1),
        effectsBehind: [{ type: 'fragment_pulse', color: AXIOM, alpha: 0.30, fadeIn: 40 }],
      }),
      cont({
        // Every scout was looking for you. Their shapes, between Kael and it.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.62, cy: 0.72 }, { at: 40, zoom: 1.15, cx: 0.48, cy: 0.68 }],
        playerPos: [k(0, 0.27, 'look', 1), k(110, 0.27, 'stance', 1)],
        npcPos: ax70('idle', 1),
        extraFigures: [0.40, 0.48, 0.56].map(function (x, i) {
          return fig('#7755aa', [k(0, x, 'look', -1, { alpha: 0 }), k(20 + i * 18, x, 'look', -1, { alpha: 0.22 }),
                                 k(120, x, 'look', -1, { alpha: 0.22 }), k(160, x, 'look', -1, { alpha: 0 })]);
        }),
      }),
      cont({
        // Axiom turns.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.48, cy: 0.68 }, { at: 30, zoom: 1.35, cx: 0.62, cy: 0.72 }],
        playerPos: [k(0, 0.27, 'stance', 1)],
        npcPos: [k(0, 0.72, 'idle', 1, AX70), k(14, 0.72, 'look', -1, AX70)],
        effects: [{ type: 'shockwave', cx: 0.72, cy: 0.56, color: AXIOM, startFrame: 14, duration: 40 }],
      }),
      cont({
        // "Kael."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.62, cy: 0.72 }, { at: 30, zoom: 1.30, cx: 0.36, cy: 0.71 }],
        playerPos: [k(0, 0.27, 'stance', 1), k(10, 0.27, 'brace', 1), k(50, 0.27, 'stance', 1)],
        npcPos: [k(0, 0.72, 'look', -1, AX70), k(4, 0.72, 'talk', -1, AX70), k(40, 0.72, 'idle', -1, AX70)],
        bubbleX: 0.62,
      }),
      cont({
        // A pause.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.36, cy: 0.71 }, { at: 80, zoom: 1.15, cx: 0.48, cy: 0.68 }],
        playerPos: [k(0, 0.27, 'stance', 1)],
        npcPos: ax70('idle', -1),
      }),
      cont({
        // "You finally made it to the threshold."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.48, cy: 0.68 }, { at: 240, zoom: 1.30, cx: 0.62, cy: 0.71 }],
        playerPos: [k(0, 0.27, 'stance', 1), k(40, 0.27, 'listen', 1)],
        npcPos: [k(0, 0.72, 'talk', -1, AX70), walk(30, 0.72, -1, AX70), k(80, 0.66, 'talk', -1, AX70), k(200, 0.66, 'idle', -1, AX70)],
      }),
      cont({
        // You raise your weapon.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.62, cy: 0.71 }, { at: 16, zoom: 1.45, cx: 0.30, cy: 0.72 }],
        camShake: [{ at: 8, strength: 5, dur: 12 }],
        playerPos: [k(0, 0.27, 'listen', 1), k(8, 0.27, 'stance', 1)],
        npcPos: ax70('idle', -1, { x: 0.66 }),
        effects: [{ type: 'impact_sparks', cx: 0.29, cy: 0.62, count: 8, color: '#88bbff', startFrame: 8, duration: 20 }],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.30, startFrame: 8, fadeIn: 14 }],
      }),
      cont({
        // "Go ahead." It doesn't even guard.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.30, cy: 0.72 }, { at: 40, zoom: 1.12, cx: 0.47, cy: 0.66 }],
        playerPos: [k(0, 0.27, 'stance', 1)],
        npcPos: [k(0, 0.66, 'talk', -1, AX70), k(130, 0.66, 'idle', -1, AX70)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.25 }, { type: 'fragment_pulse', color: AXIOM, alpha: 0.25 }],
      }),
    ],
  };

  // ── The Loop ───────────────────────────────────────────────────────────────────

  // Chapter 72: What Axiom Wants. Axiom is a voice filling the loop; the mirror is
  // the only other figure.
  function loopEchoes(t0) {
    // Earlier Kaels, still running the same lap.
    return [0.52, 0.64, 0.76].map(function (x, i) {
      return fig(KAEL, [run(0, x - 0.06, 1, { alpha: 0 }), run(t0 + i * 24, x, 1, { alpha: 0.20 }),
                        run(t0 + 90 + i * 24, x + 0.06, 1, { alpha: 0.20 }), k(t0 + 130 + i * 24, x + 0.08, 'brace', 1, { alpha: 0 })]);
    });
  }
  S[72] = {
    bg: 'level', level: { ch: 73, x: 620 },
    npcColor: AXIOM,
    beats: [
      L({
        // "Stop." Mid-run for the exit.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.24, cy: 0.70 }, { at: 40, zoom: 1.30, cx: 0.36, cy: 0.71 }],
        camShake: [{ at: 24, strength: 6, dur: 14 }],
        playerPos: [run(0, 0.16, 1), k(24, 0.34, 'brace', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.55 }],
        bubbleX: 0.55,
      }),
      cont({
        // You stop. Look for where it came from.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.36, cy: 0.71 }, { at: 80, zoom: 1.15, cx: 0.42, cy: 0.68 }],
        playerPos: [k(0, 0.34, 'brace', 1), k(12, 0.34, 'look', -1), k(44, 0.34, 'lookUp', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.55 }],
      }),
      cont({
        // "You've been treating this as punishment. It isn't."
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.42, cy: 0.68 }, { at: 120, zoom: 1.35, cx: 0.36, cy: 0.72 }],
        playerPos: [k(0, 0.34, 'lookUp', 1), k(50, 0.34, 'listen', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.55 }],
        bubbleX: 0.55,
      }),
      cont({
        // "I put you here because you needed to understand." The loop, running.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.36, cy: 0.72 }, { at: 60, zoom: 1.10, cx: 0.54, cy: 0.64 }],
        playerPos: [k(0, 0.34, 'listen', 1), k(60, 0.34, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.50, alpha: 0.55 }],
        extraFigures: loopEchoes(30),
        bubbleX: 0.50,
      }),
      cont({
        // "It grants honesty." The fragment, under his hands.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.54, cy: 0.64 }, { at: 60, zoom: 1.50, cx: 0.34, cy: 0.72 }],
        playerPos: [k(0, 0.34, 'look', 1), k(20, 0.34, 'hands', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.40, alpha: 0.45 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.35, startFrame: 20, fadeIn: 30 }],
        bubbleX: 0.55,
      }),
      cont({
        // "The loop is not a prison. It is a mirror." His reflection, facing him.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.34, cy: 0.72 }, { at: 50, zoom: 1.30, cx: 0.44, cy: 0.71 }],
        playerPos: [k(0, 0.34, 'hands', 1), k(30, 0.34, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.40, alpha: 0.45 }],
        extraFigures: [fig(KAEL, [k(0, 0.50, 'hands', -1, { alpha: 0 }), k(16, 0.50, 'hands', -1, { alpha: 0 }), k(50, 0.50, 'look', -1, { alpha: 0.35 })])],
        bubbleX: 0.44,
      }),
      cont({
        // "Do you understand yet?"
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.71 }, { at: 70, zoom: 1.55, cx: 0.36, cy: 0.73 }],
        playerPos: [k(0, 0.34, 'look', 1), k(30, 0.34, 'lookUp', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fire_glow', intensity: 0.40, alpha: 0.45 }],
        extraFigures: [fadeOut(KAEL, 0.50, 'look', -1, 10, 50, 0.35)],
        bubbleX: 0.55,
      }),
    ],
  };

  // ── Before the End ─────────────────────────────────────────────────────────────

  // Chapter 148: Before the End. A voice with no origin, among the lights of the
  // ninety-four.
  function bearersKneel(t0, a) {
    return [0.46, 0.54, 0.62, 0.70, 0.78].map(function (x, i) {
      return fadeIn(['#665577', '#556677', '#776655', '#557766', '#665566'][i], x, i % 2 ? 'crouch' : 'kneel', -1, t0 + i * 24, t0 + 40 + i * 24, a);
    });
  }
  S[148] = {
    bg: 'level', level: { ch: 146, x: 3400 },
    npcColor: AXIOM,
    beats: [
      L({
        // "You are the ninety-fifth."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.24, cy: 0.70 }, { at: 90, zoom: 1.20, cx: 0.32, cy: 0.69 }],
        playerPos: [walk(0, 0.16, 1), k(36, 0.24, 'brace', 1), k(70, 0.24, 'lookUp', 1)],
        npcPos: NO_NPC,
        bubbleX: 0.55,
      }),
      cont({
        // No origin point. He looks for one and finds none.
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.32, cy: 0.69 }, { at: 200, zoom: 1.05, cx: 0.50, cy: 0.54, ease: 'linear' }],
        playerPos: [k(0, 0.24, 'lookUp', 1), k(40, 0.24, 'look', -1), k(110, 0.24, 'look', 1)],
        npcPos: NO_NPC,
      }),
      cont({
        // "Ninety-four... All of them ended here."
        camAnim: [{ at: 0, zoom: 1.05, cx: 0.50, cy: 0.54 }, { at: 380, zoom: 1.15, cx: 0.58, cy: 0.68, ease: 'linear' }],
        playerPos: [k(0, 0.24, 'look', 1), k(100, 0.24, 'listen', 1)],
        npcPos: NO_NPC,
        extraFigures: bearersKneel(40, 0.22),
        bubbleX: 0.40,
      }),
      cont({
        // "I do not know how to be inaccurate." He squares up anyway.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.58, cy: 0.68 }, { at: 80, zoom: 1.35, cx: 0.30, cy: 0.72 }],
        playerPos: [k(0, 0.24, 'listen', 1), k(110, 0.24, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [0.46, 0.54, 0.62, 0.70, 0.78].map(function (x, i) {
          return fadeOut(['#665577', '#556677', '#776655', '#557766', '#665566'][i], x, i % 2 ? 'crouch' : 'kneel', -1, 10 + i * 12, 60 + i * 12, 0.22);
        }),
        bubbleX: 0.55,
      }),
      cont({
        // "The fragment you carry... the only thing I am afraid of."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.30, cy: 0.72 }, { at: 60, zoom: 1.45, cx: 0.26, cy: 0.72 }, { at: 400, zoom: 1.15, cx: 0.42, cy: 0.68, ease: 'linear' }, { at: 800, zoom: 1.25, cx: 0.46, cy: 0.70 }],
        playerPos: [k(0, 0.24, 'stance', 1), k(30, 0.24, 'hands', 1), k(380, 0.24, 'lookUp', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.35, startFrame: 30, fadeIn: 30 }],
        bubbleX: 0.55,
      }),
      cont({
        // "Walk in with the truth." He walks toward the ring.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.46, cy: 0.70 }, { at: 120, zoom: 1.20, cx: 0.46, cy: 0.69 }],
        playerPos: [k(0, 0.24, 'lookUp', 1), walk(20, 0.24, 1), k(90, 0.38, 'stance', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.30 }],
        bubbleX: 0.62,
      }),
    ],
  };

  // Chapter 149: Same Frequency. Paradox comes through the fragment, no body.
  // The mechanics play as a faint replay of the fight to come.
  S[149] = {
    bg: 'level', level: { ch: 146, x: 3400 },
    npcColor: PARADOX,
    beats: [
      L({
        // A hand placed on a surface to stop it vibrating.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.30, cy: 0.72 }, { at: 200, zoom: 1.50, cx: 0.30, cy: 0.72 }],
        camShake: [{ at: 0, strength: 3, dur: 24 }],
        playerPos: [k(0, 0.30, 'brace', 1), k(30, 0.30, 'hands', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.30, startFrame: 20, fadeIn: 30 }],
      }),
      cont({
        // "You want to understand why you can do this."
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.30, cy: 0.72 }, { at: 160, zoom: 1.30, cx: 0.36, cy: 0.71 }],
        playerPos: [k(0, 0.30, 'hands', 1), k(40, 0.30, 'listen', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.30 }],
        bubbleX: 0.50,
      }),
      cont({
        // Not a question.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.36, cy: 0.71 }, { at: 80, zoom: 1.45, cx: 0.32, cy: 0.72 }],
        playerPos: [k(0, 0.30, 'listen', 1), k(20, 0.30, 'look', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.30 }],
      }),
      cont({
        // The jamming, shown: its attacks fire and land wrong.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.32, cy: 0.72 }, { at: 50, zoom: 1.15, cx: 0.52, cy: 0.68 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [
          fig(AXIOM, [k(0, 0.70, 'stance', -1, { alpha: 0, scale: 1.3 }), k(30, 0.70, 'stance', -1, { alpha: 0.30, scale: 1.3 }),
                      k(120, 0.70, 'attack', -1, { alpha: 0.30, scale: 1.3 }), k(220, 0.70, 'stance', -1, { alpha: 0.30, scale: 1.3 }),
                      k(380, 0.70, 'attack', -1, { alpha: 0.30, scale: 1.3 }), k(480, 0.70, 'stance', -1, { alpha: 0.30, scale: 1.3 })]),
          fig(KAEL, [k(0, 0.55, 'stance', 1, { alpha: 0 }), k(30, 0.55, 'stance', 1, { alpha: 0.30 }),
                     k(126, 0.55, 'brace', 1, { alpha: 0.30 }), k(220, 0.55, 'stance', 1, { alpha: 0.30 }),
                     k(386, 0.55, 'brace', 1, { alpha: 0.30 }), k(480, 0.55, 'stance', 1, { alpha: 0.30 })]),
        ],
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.25 }],
        effects: [
          { type: 'shockwave', cx: 0.62, cy: 0.58, color: PARADOX, startFrame: 124, duration: 40 },
          { type: 'static_noise', alpha: 0.12, startFrame: 124, duration: 20 },
          { type: 'shockwave', cx: 0.62, cy: 0.58, color: PARADOX, startFrame: 384, duration: 40 },
          { type: 'static_noise', alpha: 0.12, startFrame: 384, duration: 20 },
        ],
        bubbleX: 0.36,
      }),
      cont({
        // "You have." The replay goes; he stands.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.52, cy: 0.68 }, { at: 120, zoom: 1.35, cx: 0.34, cy: 0.72 }],
        playerPos: [k(0, 0.30, 'look', 1), k(100, 0.30, 'stance', 1)],
        npcPos: NO_NPC,
        extraFigures: [fadeOut(AXIOM, 0.70, 'stance', -1, 0, 40, 0.30, { scale: 1.3 }), fadeOut(KAEL, 0.55, 'stance', 1, 0, 40, 0.30)],
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.25 }],
        bubbleX: 0.52,
      }),
      cont({
        // "The resonance fires because you cleared enough."
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.34, cy: 0.72 }, { at: 300, zoom: 1.20, cx: 0.40, cy: 0.69 }],
        playerPos: [k(0, 0.30, 'stance', 1), k(60, 0.30, 'hands', 1), k(300, 0.30, 'stance', 1)],
        npcPos: NO_NPC,
        effectsBehind: [{ type: 'fragment_pulse', color: PARADOX, alpha: 0.25 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.35, startFrame: 280, fadeIn: 30 }],
        effects: [{ type: 'energy_burst', cx: 0.30, cy: 0.60, color: '#88eeff', startFrame: 300, duration: 34 }],
        bubbleX: 0.52,
      }),
    ],
  };

  // Chapter 150: Cosmic Axiom. A law arrives.
  var COSMIC = { scale: 1.6 };
  S[150] = {
    bg: 'fracture',
    npcColor: AXIOM,
    beats: [
      L({
        // Arrived without announcement.
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.50, cy: 0.68 }, { at: 100, zoom: 1.10, cx: 0.52, cy: 0.64 }],
        camShake: [{ at: 12, strength: 8, dur: 20 }],
        playerPos: [k(0, 0.28, 'look', 1), k(12, 0.28, 'brace', 1)],
        npcPos: [k(0, 0.64, 'idle', -1, Object.assign({ alpha: 0 }, COSMIC)), k(10, 0.64, 'idle', -1, Object.assign({ alpha: 0 }, COSMIC)), k(26, 0.64, 'idle', -1, Object.assign({ alpha: 1 }, COSMIC))],
        effects: [
          { type: 'energy_burst', cx: 0.64, cy: 0.52, color: AXIOM, startFrame: 10, duration: 34 },
          { type: 'screen_flash', color: AXIOM, startFrame: 10, duration: 14, alpha: 0.25 },
        ],
      }),
      cont({
        // Not a creature. Not a person. A law.
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.52, cy: 0.64 }, { at: 100, zoom: 1.40, cx: 0.62, cy: 0.72, ease: 'linear' }],
        playerPos: [k(0, 0.28, 'brace', 1), k(30, 0.28, 'look', 1)],
        npcPos: [k(0, 0.64, 'idle', -1, COSMIC)],
        effectsBehind: [{ type: 'sky_cracks', alpha: 0.45, fadeIn: 20 }],
      }),
      cont({
        // "I do not lose. I do not negotiate. I simply am."
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.62, cy: 0.72 }, { at: 40, zoom: 1.15, cx: 0.48, cy: 0.68 }],
        playerPos: [k(0, 0.28, 'look', 1), k(80, 0.28, 'stance', 1)],
        npcPos: [k(0, 0.64, 'talk', -1, COSMIC), k(300, 0.64, 'idle', -1, COSMIC)],
        effectsBehind: [{ type: 'sky_cracks', alpha: 0.45 }, { type: 'fragment_pulse', color: AXIOM, alpha: 0.28 }],
      }),
      cont({
        // ...
        camAnim: [{ at: 0, zoom: 1.15, cx: 0.48, cy: 0.68 }, { at: 70, zoom: 1.40, cx: 0.28, cy: 0.72 }],
        playerPos: [k(0, 0.28, 'stance', 1)],
        npcPos: [k(0, 0.64, 'idle', -1, COSMIC)],
        effectsBehind: [{ type: 'sky_cracks', alpha: 0.45 }],
      }),
      cont({
        // You carry its scar.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.28, cy: 0.72 }, { at: 100, zoom: 1.45, cx: 0.28, cy: 0.72 }],
        playerPos: [k(0, 0.28, 'stance', 1), k(10, 0.28, 'hands', 1), k(80, 0.28, 'stance', 1)],
        npcPos: [k(0, 0.64, 'idle', -1, COSMIC)],
        effectsBehind: [{ type: 'sky_cracks', alpha: 0.45 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.32, startFrame: 10, fadeIn: 20 }],
      }),
      cont({
        // Prove it wrong anyway.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.28, cy: 0.72 }, { at: 30, zoom: 1.15, cx: 0.48, cy: 0.68 }],
        camShake: [{ at: 26, strength: 8, dur: 16 }],
        playerPos: [k(0, 0.28, 'stance', 1), run(6, 0.28, 1), k(26, 0.38, 'stance', 1)],
        npcPos: [k(0, 0.64, 'idle', -1, COSMIC), k(30, 0.64, 'stance', -1, COSMIC)],
        effectsBehind: [{ type: 'sky_cracks', alpha: 0.45 }, { type: 'fragment_pulse', color: KAEL, alpha: 0.32 }],
        effects: [{ type: 'speedlines', cx: 0.38, cy: 0.58, count: 18, color: '#88bbff', alpha: 0.35, startFrame: 6, duration: 30 }],
      }),
    ],
  };

  // ── The Bridge: after the void ─────────────────────────────────────────────────

  // Chapter 151: The Silence After. Tight on Kael until the last line pulls back to
  // the man standing next to him.
  var AXM_HIDDEN = [k(0, 0.60, 'look', 1, { alpha: 0, show: false })];
  S[151] = {
    bg: 'level', level: { ch: 156, x: 300 },
    npcColor: AXIOM_MAN,
    beats: [
      L({
        // It was quiet.
        camAnim: [{ at: 0, zoom: 1.70, cx: 0.32, cy: 1.00 }, { at: 90, zoom: 1.65, cx: 0.32, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'look', 1)],
        npcPos: AXM_HIDDEN,
      }),
      cont({
        // The network's hum, five thousand years of it, still there for now.
        camAnim: [{ at: 0, zoom: 1.65, cx: 0.32, cy: 1.00 }, { at: 280, zoom: 1.50, cx: 0.34, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'look', 1), k(60, 0.36, 'listen', 1)],
        npcPos: AXM_HIDDEN,
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      }),
      cont({
        // Now it wasn't humming.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.34, cy: 1.00 }, { at: 90, zoom: 1.55, cx: 0.34, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'listen', 1), k(16, 0.36, 'lookUp', 1)],
        npcPos: AXM_HIDDEN,
        effectsBehind: [{ type: 'static_noise', alpha: 0.10, duration: 14 }],
      }),
      cont({
        // Seventeen dimensions, each signal clean and separate.
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.34, cy: 1.00 }, { at: 120, zoom: 1.30, cx: 0.40, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'lookUp', 1), k(120, 0.36, 'look', 1)],
        npcPos: AXM_HIDDEN,
        effectsBehind: [{ type: 'multi_portals', color: '#6677bb', alpha: 0.12, count: 17, fadeIn: 60 }],
      }),
      cont({
        // And next to you stood the man who had built all of it.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.40, cy: 1.00 }, { at: 120, zoom: 1.25, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'look', 1), k(80, 0.36, 'look', 1)],
        npcPos: [k(0, 0.60, 'look', 1)],
        effectsBehind: [{ type: 'multi_portals', color: '#6677bb', alpha: 0.12, count: 17 }],
      }),
      // afterNarrative (plays after the branch beat, offset by the 5 beats above)
      L({
        // Not the Creator. Not Cosmic Axiom. A man.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.52, cy: 1.00 }, { at: 160, zoom: 1.55, cx: 0.58, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'look', 1)],
        npcPos: [k(0, 0.60, 'look', 1), k(140, 0.60, 'hands', 1), k(330, 0.60, 'idle', 1)],
      }),
      cont({
        // The Third Architect's voice came through, very carefully.
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.58, cy: 1.00 }, { at: 60, zoom: 1.30, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'look', 1), k(20, 0.36, 'listen', 1)],
        npcPos: [k(0, 0.60, 'idle', 1), k(30, 0.60, 'look', -1)],
        effectsBehind: [{ type: 'static_noise', alpha: 0.08, startFrame: 10, duration: 30 }],
      }),
      cont({
        // "Your signal reads two people." "...Confirm?"
        npcColor: THIRD,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.48, cy: 1.00 }, { at: 100, zoom: 1.35, cx: 0.46, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'listen', 1), k(60, 0.36, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(AXIOM_MAN, 0.60, 'look', -1)],
        bubbleX: 0.40,
      }),
      cont({
        // Axiom looked up at the void he built, from inside it.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.46, cy: 1.00 }, { at: 260, zoom: 1.25, cx: 0.54, cy: 1.00, ease: 'linear' }],
        playerPos: [k(0, 0.36, 'look', 1)],
        npcPos: [k(0, 0.60, 'look', -1), k(24, 0.60, 'lookUp', 1)],
        effectsBehind: [{ type: 'multi_portals', color: '#6677bb', alpha: 0.10, count: 17, fadeIn: 40 }],
      }),
      cont({
        // "Five thousand years," he said.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.54, cy: 1.00 }, { at: 60, zoom: 1.45, cx: 0.58, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'look', 1)],
        npcPos: [k(0, 0.60, 'lookUp', 1), k(70, 0.60, 'look', 1)],
        effectsBehind: [{ type: 'multi_portals', color: '#6677bb', alpha: 0.10, count: 17 }],
      }),
      cont({
        // It wasn't an apology. It was a measurement.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.58, cy: 1.00 }, { at: 100, zoom: 1.30, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, 0.36, 'look', 1)],
        npcPos: [k(0, 0.60, 'look', 1)],
        effectsBehind: [{ type: 'multi_portals', color: '#6677bb', alpha: 0.10, count: 17, duration: 60 }],
      }),
    ],
  };

  // Chapter 152: The Cost. The Third Architect counts over comms; Axiom is the
  // cost nobody can count.
  var K152 = 0.56, A152 = 0.42;
  function ax152(pos) { return [fig(AXIOM_MAN, pos)]; }
  S[152] = {
    bg: 'level', level: { ch: 156, x: 900 },
    npcColor: THIRD,
    beats: [
      L({
        // The Third Architect ran inventory.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.54, cy: 1.00 }, { at: 100, zoom: 1.30, cx: 0.50, cy: 1.00 }],
        playerPos: [k(0, K152, 'look', 1), k(20, K152, 'listen', 1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'idle', 1)]),
        effectsBehind: [{ type: 'static_noise', alpha: 0.06, duration: 30 }],
      }),
      cont({
        // Twenty-two alive. Forty-three quiet.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.50, cy: 1.00 }, { at: 380, zoom: 1.25, cx: 0.50, cy: 1.00, ease: 'linear' }],
        playerPos: [k(0, K152, 'listen', 1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'idle', 1), k(120, A152, 'look', -1)]),
        effectsBehind: [{ type: 'multi_portals', color: '#6677bb', alpha: 0.12, count: 22, fadeIn: 60 }],
      }),
      cont({
        // "That's going to take a long time to account for."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.50, cy: 1.00 }, { at: 60, zoom: 1.35, cx: 0.54, cy: 1.00 }],
        playerPos: [k(0, K152, 'listen', 1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'look', -1)]),
        bubbleX: 0.62,
      }),
      cont({
        // But the account Kael couldn't stop running was standing next to him.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.54, cy: 1.00 }, { at: 60, zoom: 1.45, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, K152, 'listen', 1), k(20, K152, 'look', -1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'look', -1), k(40, A152, 'idle', 1)]),
      }),
      cont({
        // The excavation cut both ways. Axiom buckles; Kael catches him.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.48, cy: 1.00 }, { at: 260, zoom: 1.55, cx: 0.46, cy: 1.00 }],
        camShake: [{ at: 60, strength: 3, dur: 16 }],
        playerPos: [k(0, K152, 'look', -1), k(190, K152, 'reach', -1), k(250, 0.53, 'crouch', -1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'idle', 1), k(60, A152, 'brace', 1), k(200, A152, 'kneel', 1)]),
        effectsBehind: [{ type: 'fragment_pulse', color: '#553377', alpha: 0.26, startFrame: 60, fadeIn: 40 }],
        effects: [{ type: 'static_noise', alpha: 0.12, startFrame: 60, duration: 24 }],
      }),
      // afterNarrative (offset by the 5 beats above)
      L({
        // The energy sat exposed inside him with nothing holding its shape.
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.46, cy: 1.00 }, { at: 200, zoom: 1.65, cx: 0.45, cy: 1.00 }],
        playerPos: [k(0, 0.53, 'crouch', -1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'kneel', 1)]),
        effectsBehind: [{ type: 'fragment_pulse', color: '#553377', alpha: 0.30, fadeIn: 20 }],
        effects: [{ type: 'static_noise', alpha: 0.10, startFrame: 80, duration: 16 }],
      }),
      cont({
        // Ninety-four times, secondhand, in the dead the fragment carried.
        camAnim: [{ at: 0, zoom: 1.65, cx: 0.45, cy: 1.00 }, { at: 80, zoom: 1.30, cx: 0.52, cy: 1.00 }],
        playerPos: [k(0, 0.53, 'crouch', -1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'kneel', 1)]).concat([0.60, 0.66, 0.72].map(function (x, i) {
          return fadeIn(['#665577', '#556677', '#776655'][i], x, i % 2 ? 'crouch' : 'kneel', -1, 20 + i * 24, 60 + i * 24, 0.20);
        })),
        effectsBehind: [{ type: 'fragment_pulse', color: '#553377', alpha: 0.24 }],
      }),
      cont({
        // So had he. From the other side.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.52, cy: 1.00 }, { at: 60, zoom: 1.55, cx: 0.45, cy: 1.00 }],
        playerPos: [k(0, 0.53, 'crouch', -1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'kneel', 1)]).concat([0.60, 0.66, 0.72].map(function (x, i) {
          return fadeOut(['#665577', '#556677', '#776655'][i], x, i % 2 ? 'crouch' : 'kneel', -1, 0, 40, 0.20);
        })),
        effectsBehind: [{ type: 'fragment_pulse', color: '#553377', alpha: 0.24 }],
      }),
      cont({
        // "I watched every one of them die of this," Axiom said.
        npcColor: AXIOM_MAN,
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.45, cy: 1.00 }, { at: 100, zoom: 1.60, cx: 0.44, cy: 1.00 }],
        playerPos: [k(0, 0.53, 'crouch', -1)],
        npcPos: [k(0, A152, 'kneel', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: '#553377', alpha: 0.24 }],
      }),
      cont({
        // Looking at his own hand, at the light moving wrong beneath the skin.
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.44, cy: 1.00 }, { at: 60, zoom: 1.45, cx: 0.46, cy: 1.00 }],
        playerPos: [k(0, 0.53, 'crouch', -1), k(30, 0.53, 'idle', -1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'kneel', 1), k(20, A152, 'hands', 1)]),
        effectsBehind: [{ type: 'fragment_pulse', color: '#7744aa', alpha: 0.30, startFrame: 20, fadeIn: 20 }],
        effects: [{ type: 'static_noise', alpha: 0.10, startFrame: 30, duration: 14 }],
      }),
      cont({
        // "I always thought it looked slow."
        npcColor: AXIOM_MAN,
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.46, cy: 1.00 }, { at: 200, zoom: 1.40, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, 0.53, 'idle', -1), k(40, 0.53, 'listen', -1)],
        npcPos: [k(0, A152, 'hands', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: '#7744aa', alpha: 0.30 }],
      }),
      cont({
        // He closed the hand.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.48, cy: 1.00 }, { at: 60, zoom: 1.60, cx: 0.43, cy: 1.00 }],
        playerPos: [k(0, 0.53, 'listen', -1)],
        npcPos: NO_NPC,
        extraFigures: ax152([k(0, A152, 'hands', 1), k(12, A152, 'idle', 1)]),
        effectsBehind: [{ type: 'fragment_pulse', color: '#7744aa', alpha: 0.30, duration: 24 }],
      }),
      cont({
        // "It does not feel slow."
        npcColor: AXIOM_MAN,
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.43, cy: 1.00 }, { at: 60, zoom: 1.40, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, 0.53, 'listen', -1)],
        npcPos: [k(0, A152, 'idle', 1), k(14, A152, 'look', 1)],
      }),
    ],
  };

  // Chapter 153: The Bond. Teaching what was never learned.
  S[153] = {
    bg: 'level', level: { ch: 156, x: 1800 },
    npcColor: AXIOM_MAN,
    beats: [
      L({
        // How do you teach something you never learned?
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.44, cy: 1.00 }, { at: 110, zoom: 1.35, cx: 0.46, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'hands', 1)],
        npcPos: [k(0, 0.56, 'look', -1)],
      }),
      cont({
        // It happened to you, across a hundred fights.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.46, cy: 1.00 }, { at: 60, zoom: 1.25, cx: 0.50, cy: 1.00 }, { at: 400, zoom: 1.25, cx: 0.46, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'hands', 1)],
        npcPos: [k(0, 0.56, 'look', -1)],
        extraFigures: [[0.22, 'attack', 1], [0.72, 'guard', -1], [0.30, 'stance', 1], [0.80, 'attack', -1]].map(function (g, i) {
          return fig(KAEL, [k(0, g[0], g[1], g[2], { alpha: 0 }), k(30 + i * 60, g[0], g[1], g[2], { alpha: 0.20 }),
                            k(150 + i * 60, g[0], g[1], g[2], { alpha: 0.20 }), k(200 + i * 60, g[0], g[1], g[2], { alpha: 0 })]);
        }),
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.32, fadeIn: 30 }],
      }),
      cont({
        // So you started with what it wasn't.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.46, cy: 1.00 }, { at: 50, zoom: 1.35, cx: 0.48, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'hands', 1), k(10, 0.38, 'talk', 1), k(70, 0.38, 'point', 1)],
        npcPos: [k(0, 0.56, 'look', -1), k(20, 0.56, 'listen', -1)],
      }),
      cont({
        // Not containment, not control, not architecture. His grip on it breaks.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.48, cy: 1.00 }, { at: 60, zoom: 1.30, cx: 0.54, cy: 1.00 }, { at: 460, zoom: 1.40, cx: 0.48, cy: 1.00 }],
        camShake: [{ at: 300, strength: 4, dur: 14 }],
        playerPos: [k(0, 0.38, 'point', 1), k(40, 0.38, 'listen', 1), k(290, 0.44, 'reach', 1), k(360, 0.44, 'listen', 1)],
        npcPos: [k(0, 0.56, 'listen', -1), k(30, 0.56, 'guard', -1), k(300, 0.56, 'brace', -1), k(360, 0.56, 'hands', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: '#aa88cc', alpha: 0.30, startFrame: 30, fadeIn: 40, duration: 270 }],
        effects: [{ type: 'shockwave', cx: 0.53, cy: 0.70, color: '#ccaaee', startFrame: 300, duration: 40 }],
      }),
      // afterNarrative (offset by the 4 beats above)
      L({
        // Walls, then channels, then containment. The energy answers each one.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.50, cy: 1.00 }, { at: 600, zoom: 1.40, cx: 0.52, cy: 1.00 }],
        camShake: [{ at: 150, strength: 4, dur: 12 }, { at: 350, strength: 5, dur: 12 }, { at: 550, strength: 6, dur: 14 }],
        playerPos: [k(0, 0.38, 'listen', 1)],
        npcPos: [k(0, 0.56, 'hands', -1), k(20, 0.56, 'guard', -1), k(150, 0.56, 'brace', -1), k(230, 0.56, 'reach', -1), k(350, 0.56, 'brace', -1),
                 k(430, 0.56, 'guard', -1), k(550, 0.56, 'brace', -1)],
        effects: [150, 350, 550].map(function (t) { return { type: 'shockwave', cx: 0.56, cy: 0.62, color: '#aa66cc', startFrame: t, duration: 36 }; })
          .concat([150, 350, 550].map(function (t) { return { type: 'static_noise', alpha: 0.10, startFrame: t, duration: 14 }; })),
      }),
      cont({
        // "Stop building," you said.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.52, cy: 1.00 }, { at: 40, zoom: 1.50, cx: 0.42, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'listen', 1), k(4, 0.38, 'talk', 1), k(60, 0.38, 'idle', 1)],
        npcPos: [k(0, 0.56, 'brace', -1)],
      }),
      cont({
        // He looked at you like you'd asked him to stop breathing.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.42, cy: 1.00 }, { at: 40, zoom: 1.55, cx: 0.56, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'idle', 1)],
        npcPos: [k(0, 0.56, 'brace', -1), k(16, 0.56, 'look', -1)],
      }),
      cont({
        // "It isn't a thing you hold. It's a thing you are."
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.56, cy: 1.00 }, { at: 60, zoom: 1.35, cx: 0.47, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'idle', 1), k(10, 0.38, 'talk', 1), k(200, 0.38, 'hands', 1), k(380, 0.38, 'stance', 1)],
        npcPos: [k(0, 0.56, 'look', -1), k(60, 0.56, 'listen', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: KAEL, alpha: 0.32, startFrame: 200, fadeIn: 30 }],
      }),
      cont({
        // Five thousand years of engineering, set down slowly.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.47, cy: 1.00 }, { at: 240, zoom: 1.55, cx: 0.55, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'stance', 1), k(60, 0.38, 'idle', 1)],
        npcPos: [k(0, 0.56, 'listen', -1), k(20, 0.56, 'guard', -1), k(150, 0.56, 'idle', -1, { ease: 'smooth' })],
      }),
      cont({
        // Underneath it: the man from before, who fought back on an ordinary street.
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.55, cy: 1.00 }, { at: 300, zoom: 1.40, cx: 0.54, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'idle', 1)],
        npcPos: [k(0, 0.56, 'idle', -1), k(60, 0.56, 'hands', -1)],
        extraFigures: [fig(AXIOM_MAN, [k(0, 0.66, 'stance', -1, { alpha: 0 }), k(40, 0.66, 'stance', -1, { alpha: 0.20 }), k(150, 0.66, 'attack', -1, { alpha: 0.20 }),
                                       k(220, 0.66, 'stance', -1, { alpha: 0.20 }), k(300, 0.66, 'stance', -1, { alpha: 0 })])],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffcc88', alpha: 0.16, startFrame: 40, fadeIn: 40 }],
      }),
      cont({
        // The light under his skin steadied.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.54, cy: 1.00 }, { at: 90, zoom: 1.30, cx: 0.47, cy: 1.00 }],
        playerPos: [k(0, 0.38, 'idle', 1)],
        npcPos: [k(0, 0.56, 'hands', -1), k(40, 0.56, 'idle', -1)],
        effectsBehind: [{ type: 'fragment_pulse', color: AXIOM_MAN, alpha: 0.24, fadeIn: 30 }],
      }),
    ],
  };

  // Chapter 154: The Compass Points. A torn strap and a laugh.
  S[154] = {
    bg: 'level', level: { ch: 156, x: 2700 },
    npcColor: AXIOM_MAN,
    beats: [
      L({
        // Walking a long time.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.16, cy: 1.00 }, { at: 100, zoom: 1.30, cx: 0.28, cy: 1.00, ease: 'linear' }],
        playerPos: [walk(0, 0.18, 1), k(90, 0.34, 'idle', 1)],
        npcPos: [walk(0, 0.06, 1), k(90, 0.22, 'idle', 1)],
      }),
      cont({
        // He carries the pack; the strap splits; he shifts it over.
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.28, cy: 1.00 }, { at: 120, zoom: 1.50, cx: 0.26, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'idle', 1), k(30, 0.34, 'crouch', -1)],
        npcPos: [k(0, 0.22, 'idle', 1), k(160, 0.22, 'brace', 1), k(200, 0.22, 'hands', 1), k(320, 0.22, 'idle', 1)],
      }),
      cont({
        // Cosmic Axiom collapsing a star, over the man hitching a strap.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.26, cy: 1.00 }, { at: 60, zoom: 1.25, cx: 0.30, cy: 1.00 }, { at: 400, zoom: 1.40, cx: 0.24, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'crouch', -1)],
        npcPos: [k(0, 0.22, 'idle', 1), k(250, 0.22, 'hands', 1), k(310, 0.22, 'idle', 1)],
        extraFigures: [fig(AXIOM, [k(0, 0.22, 'reach', 1, { alpha: 0, scale: 1.45 }), k(30, 0.22, 'reach', 1, { alpha: 0.22, scale: 1.45 }),
                                   k(180, 0.22, 'reach', 1, { alpha: 0.22, scale: 1.45 }), k(240, 0.22, 'idle', 1, { alpha: 0, scale: 1.45 })])],
        effects: [{ type: 'energy_burst', cx: 0.14, cy: 0.30, color: '#cc88ff', startFrame: 60, duration: 40 }],
      }),
      cont({
        // He looked at you.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.24, cy: 1.00 }, { at: 60, zoom: 1.35, cx: 0.30, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'crouch', -1)],
        npcPos: [k(0, 0.22, 'idle', 1), k(20, 0.22, 'look', 1)],
      }),
      cont({
        // "What," he said.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.30, cy: 1.00 }, { at: 60, zoom: 1.45, cx: 0.24, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'crouch', -1)],
        npcPos: [k(0, 0.22, 'look', 1), k(4, 0.22, 'talk', 1), k(40, 0.22, 'look', 1)],
      }),
      cont({
        // You told him. The strap.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.24, cy: 1.00 }, { at: 60, zoom: 1.35, cx: 0.32, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'crouch', -1), k(14, 0.34, 'idle', -1), k(30, 0.34, 'talk', -1), k(80, 0.34, 'point', -1)],
        npcPos: [k(0, 0.22, 'look', 1)],
      }),
      cont({
        // And Axiom laughed.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.32, cy: 1.00 }, { at: 40, zoom: 1.55, cx: 0.24, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'point', -1), k(30, 0.34, 'idle', -1)],
        npcPos: [k(0, 0.22, 'look', 1), k(8, 0.22, 'lookUp', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffcc88', alpha: 0.18, startFrame: 8, fadeIn: 20 }],
      }),
      cont({
        // Entirely a man's laugh.
        camAnim: [{ at: 0, zoom: 1.55, cx: 0.24, cy: 1.00 }, { at: 400, zoom: 1.35, cx: 0.30, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'idle', -1)],
        npcPos: [k(0, 0.22, 'lookUp', 1), k(140, 0.22, 'idle', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffcc88', alpha: 0.18 }],
      }),
      cont({
        // It did not last. But it happened.
        camAnim: [{ at: 0, zoom: 1.35, cx: 0.30, cy: 1.00 }, { at: 360, zoom: 1.25, cx: 0.34, cy: 1.00, ease: 'linear' }],
        playerPos: [k(0, 0.34, 'idle', -1), k(200, 0.34, 'look', -1)],
        npcPos: [k(0, 0.22, 'idle', 1), k(180, 0.22, 'look', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffcc88', alpha: 0.18, duration: 200 }],
      }),
      // afterNarrative (offset by the 9 beats above)
      L({
        // Then the compass moved, and he went still.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.26, cy: 1.00 }, { at: 80, zoom: 1.50, cx: 0.24, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'look', -1)],
        npcPos: [k(0, 0.22, 'look', 1), k(10, 0.22, 'hands', 1)],
        effects: [{ type: 'energy_burst', cx: 0.23, cy: 0.62, color: '#ccbbee', startFrame: 10, duration: 24 }],
      }),
      cont({
        // The compass was pointing.
        camAnim: [{ at: 0, zoom: 1.50, cx: 0.24, cy: 1.00 }, { at: 80, zoom: 1.45, cx: 0.27, cy: 1.00 }],
        playerPos: [k(0, 0.34, 'look', -1), walk(10, 0.34, -1), k(36, 0.30, 'look', -1)],
        npcPos: [k(0, 0.22, 'hands', 1)],
      }),
      cont({
        // Not at fractures. Not at Axiom's network.
        camAnim: [{ at: 0, zoom: 1.45, cx: 0.27, cy: 1.00 }, { at: 160, zoom: 1.25, cx: 0.44, cy: 1.00 }],
        playerPos: [k(0, 0.30, 'look', -1), k(20, 0.30, 'look', 1)],
        npcPos: [k(0, 0.22, 'hands', 1), k(30, 0.22, 'look', 1)],
        effectsBehind: [{ type: 'multi_portals', color: '#6677bb', alpha: 0.12, count: 9, duration: 90 }],
      }),
      cont({
        // "There's something underneath everything." It's coming from God's domain.
        npcColor: THIRD,
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.44, cy: 1.00 }, { at: 500, zoom: 1.25, cx: 0.56, cy: 1.00, ease: 'linear' }],
        playerPos: [k(0, 0.30, 'look', 1), k(30, 0.30, 'listen', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(AXIOM_MAN, 0.22, 'look', 1)],
        effectsBehind: [{ type: 'static_noise', alpha: 0.06, duration: 30 }, { type: 'fragment_pulse', color: '#ffe8bb', alpha: 0.16, startFrame: 300, fadeIn: 60 }],
        bubbleX: 0.40,
      }),
      cont({
        // "Something else. Small. Dense. Fast. Leaving a trail."
        npcColor: THIRD,
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.56, cy: 1.00 }, { at: 300, zoom: 1.25, cx: 0.44, cy: 1.00 }],
        playerPos: [k(0, 0.30, 'listen', 1), k(100, 0.30, 'look', 1)],
        npcPos: NO_NPC,
        extraFigures: [stand(AXIOM_MAN, 0.22, 'look', 1)],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffe8bb', alpha: 0.14 }],
        effects: [{ type: 'motion_blur', fromX: 0.95, toX: 0.70, color: '#ff4455', steps: 6, startFrame: 60, duration: 40 }],
        bubbleX: 0.40,
      }),
      cont({
        // Axiom took one look at the trail data and went still.
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.44, cy: 1.00 }, { at: 50, zoom: 1.60, cx: 0.24, cy: 1.00 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: [k(0, 0.22, 'look', 1), k(10, 0.22, 'hands', 1), k(50, 0.22, 'idle', 1)],
      }),
      cont({
        // "Sovereign."
        camAnim: [{ at: 0, zoom: 1.60, cx: 0.24, cy: 1.00 }, { at: 80, zoom: 1.65, cx: 0.23, cy: 1.00 }],
        playerPos: [k(0, 0.30, 'look', 1)],
        npcPos: [k(0, 0.22, 'idle', 1), k(6, 0.22, 'talk', 1), k(40, 0.22, 'look', 1)],
      }),
      cont({
        // "I built it to defeat fragment bearers. It has better files on me."
        camAnim: [{ at: 0, zoom: 1.65, cx: 0.23, cy: 1.00 }, { at: 60, zoom: 1.40, cx: 0.30, cy: 1.00 }],
        playerPos: [k(0, 0.30, 'look', 1), k(20, 0.30, 'look', -1), k(60, 0.30, 'listen', -1)],
        npcPos: [k(0, 0.22, 'look', 1), k(10, 0.22, 'talk', 1), k(200, 0.22, 'point', 1), k(380, 0.22, 'idle', 1)],
      }),
      cont({
        // He looked at the trail again.
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.30, cy: 1.00 }, { at: 80, zoom: 1.25, cx: 0.44, cy: 1.00 }],
        playerPos: [k(0, 0.30, 'listen', -1), k(30, 0.30, 'look', 1)],
        npcPos: [k(0, 0.22, 'idle', 1), k(10, 0.22, 'look', 1)],
      }),
      cont({
        // "It does not leave trails, Kael. It leaves invitations."
        camAnim: [{ at: 0, zoom: 1.25, cx: 0.44, cy: 1.00 }, { at: 60, zoom: 1.35, cx: 0.30, cy: 1.00 }],
        playerPos: [k(0, 0.30, 'look', 1), k(110, 0.30, 'stance', 1)],
        npcPos: [k(0, 0.22, 'look', 1), k(8, 0.22, 'talk', 1), k(100, 0.22, 'stance', 1)],
      }),
    ],
  };

})(window.STORY_SCENE_SPECS);
