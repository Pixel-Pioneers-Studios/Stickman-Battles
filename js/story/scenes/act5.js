'use strict';
// js/story/scenes/act5.js: cinematic scene specs for act5.
// Merges into window.STORY_SCENE_SPECS. Must load before smb-story-narrative-scene.js.
// Chapters 70, 72, 148-154.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // Chapter 70: The Weight of What's Coming
  S[70] = {
    bg: 'fracture',
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.85, cx: 0.50, cy: 0.50 },
          { at: 50,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 120, zoom: 1.15, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'run',  facing: 1 },
          { at: 35, x: 0.28, state: 'idle', facing: 1 },
          { at: 70, x: 0.28, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'portal', cx: 0.10, cy: 0.50, alpha: 0.80, fadeIn: 10 },
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.30, fadeIn: 35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.65, cy: 0.48 },
          { at: 50,  zoom: 0.92, cx: 0.60, cy: 0.50 },
          { at: 110, zoom: 0.85, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1 },
          { at: 50, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 0.0, scale: 1.45, show: false },
          { at: 15, x: 0.72, state: 'idle', facing: -1, alpha: 0.4, scale: 1.45, show: true },
          { at: 60, x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.65, fadeIn: 20 },
          { type: 'sky_cracks', alpha: 0.50, fadeIn: 30 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 24, color: '#cc44ff', alpha: 0.45, startFrame: 15, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc44ff', startFrame: 15, duration: 22, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.72, cy: 0.50, color: '#cc44ff', startFrame: 15, duration: 55 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.36, cy: 0.48 },
          { at: 60, zoom: 1.35, cx: 0.32, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1 },
          { at: 40, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.55, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.60, fadeIn: 12 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.90, cx: 0.58, cy: 0.50 },
          { at: 40, zoom: 1.05, cx: 0.62, cy: 0.50 },
          { at: 90, zoom: 1.18, cx: 0.65, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.45 },
          { at: 30, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 18 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 20, color: '#cc44ff', alpha: 0.40, startFrame: 25, fadeIn: 10 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 25, zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 55, zoom: 1.45, cx: 0.50, cy: 0.50 },
          { at: 85, zoom: 1.30, cx: 0.54, cy: 0.50 },
        ],
        camShake: [{ at: 20, strength: 5, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 18, x: 0.32, state: 'attack', facing: 1 },
          { at: 40, x: 0.30, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.45 },
          { at: 25, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.80, fadeIn: 12 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 30, color: '#cc44ff', alpha: 0.65, startFrame: 18, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.75, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc44ff', startFrame: 20, duration: 18, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#cc44ff', startFrame: 20, duration: 50 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 24, color: '#ffaaff', startFrame: 20, duration: 35 },
        ],
        bubbleX: 0.72,
      },
    ],
  };

  // Chapter 72: What Axiom Wants
  S[72] = {
    // The loop's repeated corridor, at chapter 73's first arch
    bg: 'level', level: { ch: 73, x: 620 },
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.30, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'walk', facing: 1 },
          { at: 18, x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.50, fadeIn: 20 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.68, cy: 0.48 },
          { at: 50, zoom: 1.40, cx: 0.70, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.40 },
          { at: 20, x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.55, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.40, fadeIn: 25 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.70, cy: 0.48 },
          { at: 40, zoom: 1.50, cx: 0.68, cy: 0.48 },
          { at: 90, zoom: 1.35, cx: 0.68, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.70, fadeIn: 12 },
          { type: 'speedlines', cx: 0.70, cy: 0.45, count: 20, color: '#cc44ff', alpha: 0.45, startFrame: 20, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc44ff', startFrame: 25, duration: 16, alpha: 0.40 },
          { type: 'shockwave',    cx: 0.70, cy: 0.55, color: '#cc44ff', startFrame: 25, duration: 45 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 45,  zoom: 1.20, cx: 0.52, cy: 0.50 },
          { at: 100, zoom: 1.35, cx: 0.54, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle', facing: 1 },
          { at: 50, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.40 },
          { at: 60, x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 15 },
          { type: 'static_noise', alpha: 0.30, fadeIn: 20 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.55, cx: 0.50, cy: 0.48 },
          { at: 80, zoom: 1.42, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 30, strength: 4, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.40 },
          { at: 22, x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.80, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 26, color: '#cc44ff', alpha: 0.60, startFrame: 22, fadeIn: 8 },
          { type: 'sky_cracks', alpha: 0.65, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc44ff', startFrame: 30, duration: 18, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.50, cy: 0.55, color: '#cc44ff', startFrame: 30, duration: 48 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 20, color: '#ffaaff', startFrame: 30, duration: 30 },
        ],
        bubbleX: 0.70,
      },
    ],
  };

  // Chapter 148: Before the End
  S[148] = {
    // Cosmic Axiom's threshold, past the ninety-four lights (ch146)
    bg: 'level', level: { ch: 146, x: 3400 },
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.88, cx: 0.50, cy: 0.50 },
          { at: 60,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 130, zoom: 1.18, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 60, x: 0.28, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.45, fadeIn: 28 },
          { type: 'static_noise', alpha: 0.25, fadeIn: 20 },
          { type: 'sky_cracks', alpha: 0.40, fadeIn: 35 },
        ],
        bubbleX: 0.82,
      },
      {
        // The stillness is the statement.
        letterbox: true,
        playerExpr: 'cool',
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.40, cx: 0.30, cy: 0.48 }, // drift to player
          { at: 80, zoom: 1.32, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1, expr: 'cool' },
          { at: 40, x: 0.28, state: 'idle', facing: 1, expr: 'cool' }, // settles
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 20 },
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 22 },
          { type: 'static_noise', alpha: 0.30, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash', color: '#550088', startFrame: 20, duration: 20, alpha: 0.35 },
        ],
        bubbleX: 0.82,
      },
      {
        letterbox: true,
        playerExpr: 'serene',
        camAnim: [
          { at: 0,   zoom: 1.32, cx: 0.50, cy: 0.50 },
          { at: 35,  zoom: 1.55, cx: 0.28, cy: 0.46 }, // tight on player
          { at: 100, zoom: 1.45, cx: 0.30, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1, expr: 'serene' },
          { at: 40, x: 0.28, state: 'look', facing: 1, expr: 'serene' },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.75, fadeIn: 14 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 22, color: '#cc44ff', alpha: 0.58, startFrame: 22, fadeIn: 10 },
          { type: 'sky_cracks', alpha: 0.65, fadeIn: 16 },
        ],
        effects: [
          { type: 'screen_flash', color: '#660099', startFrame: 25, duration: 18, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.50, cy: 0.55, color: '#cc44ff', startFrame: 25, duration: 50 },
        ],
        bubbleX: 0.82,
      },
      {
        letterbox: true,
        playerExpr: 'serene',
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.62, cx: 0.28, cy: 0.46 }, // final close
          { at: 90, zoom: 1.48, cx: 0.30, cy: 0.48 },
        ],
        camShake: [{ at: 38, strength: 5, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1, expr: 'serene' },
          { at: 35, x: 0.28, state: 'idle', facing: 1, expr: 'serene' }, // still
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.85, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 28, color: '#cc44ff', alpha: 0.70, startFrame: 18, fadeIn: 7 },
          { type: 'sky_cracks', alpha: 0.80, fadeIn: 12 },
          { type: 'static_noise', alpha: 0.45, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#aa00cc', startFrame: 38, duration: 22, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.55, color: '#cc44ff', startFrame: 38, duration: 55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 22, color: '#ffaaff', startFrame: 38, duration: 35 },
        ],
        bubbleX: 0.82,
      },
    ],
  };

  // Chapter 149: Same Frequency. Paradox has no body here, it comes through the fragment.
  S[149] = {
    // Cosmic Axiom's threshold, past the ninety-four lights (ch146)
    bg: 'level', level: { ch: 146, x: 3400 },
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.24, cx: 0.42, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }, { at: 50, x: 0.40, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#cc44ff', alpha: 0.40, fadeIn: 26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.42, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#cc44ff', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.42, cy: 0.49 }, { at: 50, zoom: 1.12, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#cc44ff', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.46, cy: 0.50 }, { at: 80, zoom: 1.30, cx: 0.44, cy: 0.48 }],
        camShake: [{ at: 40, strength: 3, dur: 40 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#66ccff', alpha: 0.50 },
          { type: 'static_noise', alpha: 0.16 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.48 }, { at: 90, zoom: 1.02, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        extraFigures: [
          { xf: 0.62, color: '#443355', facing: -1, state: 'float', alpha: 0.16 },
          { xf: 0.72, color: '#3d2d4a', facing: -1, state: 'float', alpha: 0.12 },
          { xf: 0.82, color: '#352640', facing: -1, state: 'float', alpha: 0.09 },
        ],
        effectsBehind: [{ type: 'echo_text', color: '#8866aa', alpha: 0.22 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.18, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.45, fadeIn: 30 }],
      },
    ],
  };

  // Chapter 150: True Form
  S[150] = {
    bg: 'fracture',
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.78, cx: 0.50, cy: 0.50 },
          { at: 65,  zoom: 0.95, cx: 0.52, cy: 0.50 },
          { at: 140, zoom: 1.10, cx: 0.54, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 65, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.72, state: 'idle', facing: -1, alpha: 0.0, scale: 1.52, show: false },
          { at: 25,  x: 0.72, state: 'idle', facing: -1, alpha: 0.3, scale: 1.52, show: true },
          { at: 80,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.52 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 25 },
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 30 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 22, color: '#cc44ff', alpha: 0.45, startFrame: 25, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash', color: '#660099', startFrame: 25, duration: 28, alpha: 0.50 },
          { type: 'shockwave',    cx: 0.72, cy: 0.55, color: '#cc44ff', startFrame: 25, duration: 60 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.66, cy: 0.48 },
          { at: 50,  zoom: 0.88, cx: 0.62, cy: 0.50 },
          { at: 110, zoom: 0.78, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1 },
          { at: 55, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.52 },
          { at: 30, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.52 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.75, fadeIn: 18 },
          { type: 'sky_cracks', alpha: 0.65, fadeIn: 20 },
          { type: 'energy_burst', cx: 0.72, cy: 0.38, color: '#ff88ff', alpha: 0.60, fadeIn: 22 },
        ],
        effects: [
          { type: 'screen_flash', color: '#880099', startFrame: 22, duration: 22, alpha: 0.50 },
          { type: 'shockwave',    cx: 0.72, cy: 0.55, color: '#cc44ff', startFrame: 22, duration: 60 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.36, cy: 0.50 },
          { at: 35, zoom: 1.30, cx: 0.35, cy: 0.50 },
          { at: 80, zoom: 1.45, cx: 0.34, cy: 0.48 },
          { at: 120, zoom: 1.30, cx: 0.35, cy: 0.50 },
        ],
        camShake: [{ at: 32, strength: 8, dur: 35 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 25, x: 0.28, state: 'attack', facing: 1 },
          { at: 55, x: 0.28, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.52 },
          { at: 28, x: 0.72, state: 'attack', facing: -1, alpha: 1.0, scale: 1.52 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.95, fadeIn: 8 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 36, color: '#cc44ff', alpha: 0.90, startFrame: 15, fadeIn: 4 },
          { type: 'sky_cracks', alpha: 0.90, fadeIn: 8 },
          { type: 'energy_burst', cx: 0.72, cy: 0.38, color: '#ff44ff', alpha: 0.80, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc00ff', startFrame: 32, duration: 28, alpha: 0.75 },
          { type: 'shockwave',     cx: 0.50, cy: 0.60, color: '#aa00cc', startFrame: 32, duration: 65 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.55, count: 34, color: '#ff88ff', startFrame: 32, duration: 50 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#660099', startFrame: 32, duration: 70 },
        ],
      },
    ],
  };

  // Chapter 151: The Silence After. Saga III opens with the network gone quiet.
  S[151] = {
    // Void after the network went quiet, on the substrate beam (ch156)
    bg: 'level', level: { ch: 156, x: 300 },
    npcColor: '#bb99cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.96, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.56, state: 'idle', facing: 1, alpha: 0, show: false }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.56, state: 'idle', facing: 1, alpha: 0, show: false }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.06 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 1.04, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.56, state: 'idle', facing: 1, alpha: 0, show: false }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#332244', alpha: 0.16 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.50, cy: 0.48 }, { at: 90, zoom: 0.88, cx: 0.50, cy: 0.44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.56, state: 'idle', facing: 1, alpha: 0, show: false }],
        effectsBehind: [{ type: 'multi_portals', color: '#5566aa', alpha: 0.20, count: 6 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.44 }, { at: 70, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.0 }, { at: 40, x: 0.58, state: 'idle', facing: 1, alpha: 1.0 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.54, cy: 0.50 }, { at: 80, zoom: 1.30, cx: 0.58, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.58, cy: 0.49 }, { at: 60, zoom: 1.10, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle',   facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#7788aa', alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.58, cy: 0.50 }, { at: 90, zoom: 0.92, cx: 0.58, cy: 0.40 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'look', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.58, cy: 0.40 }, { at: 80, zoom: 1.24, cx: 0.58, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.58, cy: 0.49 }, { at: 90, zoom: 0.90, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
      },
    ],
  };

  // Chapter 152: The Cost. Axiom is dying of the corruption he watched ninety-four people die of.
  S[152] = {
    // Still in the void's aftermath, on the substrate beam (ch156)
    bg: 'level', level: { ch: 156, x: 900 },
    npcColor: '#bb99cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.08 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle',   facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 1.16, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.54, cy: 0.50 }, { at: 80, zoom: 1.34, cx: 0.58, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#aa66cc', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.58, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.58, cy: 0.49 }, { at: 70, zoom: 1.12, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.44, cy: 0.50 }, { at: 70, zoom: 1.28, cx: 0.40, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.34 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.52, cy: 0.50 }, { at: 60, zoom: 1.18, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.58, cy: 0.50 }, { at: 90, zoom: 1.36, cx: 0.58, cy: 0.48 }],
        camShake: [{ at: 44, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#8866aa', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.36, cx: 0.58, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'look', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.36, cx: 0.58, cy: 0.48 }, { at: 70, zoom: 1.20, cx: 0.54, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.14 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.58, cy: 0.52 }, { at: 60, zoom: 1.42, cx: 0.60, cy: 0.54 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'reach', facing: 1 }, { at: 40, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#aa66cc', alpha: 0.36 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.42, cx: 0.60, cy: 0.54 }, { at: 90, zoom: 0.94, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk', facing: 1 }],
      },
    ],
  };

  // Chapter 153: The Bond. Kael teaches the man who built the fracture system to stop building.
  S[153] = {
    // The teaching, on the substrate beam (ch156)
    bg: 'level', level: { ch: 156, x: 1800 },
    npcColor: '#bb99cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 1.10, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'talk',   facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'listen', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 1.20, cx: 0.54, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'talk',   facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'listen', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.58, cy: 0.50 }, { at: 70, zoom: 1.32, cx: 0.62, cy: 0.49 }],
        camShake: [{ at: 40, strength: 5, dur: 22 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'reach', facing: -1 }, { at: 46, x: 0.60, state: 'hit', facing: -1 }],
        effects: [
          { type: 'energy_burst', cx: 0.62, cy: 0.52, color: '#aa66cc', startFrame: 38, duration: 30 },
          { type: 'screen_flash', color: '#cc99ee', startFrame: 40, duration: 12, alpha: 0.28 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.46, cy: 0.50 }, { at: 50, zoom: 1.22, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'talk',   facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'listen', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.56, cy: 0.50 }, { at: 70, zoom: 1.38, cx: 0.60, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'look', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.38, cx: 0.48, cy: 0.50 }, { at: 60, zoom: 1.18, cx: 0.48, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'talk',   facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'listen', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.48, cy: 0.50 }, { at: 80, zoom: 1.04, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.58, cy: 0.50 }, { at: 90, zoom: 1.24, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'kneel', facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.60, cy: 0.50 }, { at: 70, zoom: 1.36, cx: 0.60, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.36, cx: 0.60, cy: 0.48 }, { at: 90, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#bb99cc', alpha: 0.46, fadeIn: 40 }],
      },
    ],
  };

  // Chapter 154: The Compass Points. A chapter of decision, not action.
  S[154] = {
    // The trail through the void-between: Sovereign's footprints (ch156)
    bg: 'level', level: { ch: 156, x: 2700 },
    npcColor: '#bb99cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk',   facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 0.90, cx: 0.50, cy: 0.66 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'point', facing: -1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.24, fadeIn: 40 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.50, cy: 0.66 }, { at: 90, zoom: 1.10, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.28 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.96, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.28 }],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
