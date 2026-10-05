'use strict';
// js/story/scenes/act6.js — cinematic scene specs for act6.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 5 specs — chapter ids: 76, 80, 82, 84, 85

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ─── Chapter 76 — The First Gate ─────────────────────────────────────────
  S[76] = {
    bg: 'space',
    npcColor: '#ccaa44',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.90, cx: 0.35, cy: 0.50 },
          { at: 60, zoom: 1.08, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'walk', facing: 1 },
          { at: 45, x: 0.30, state: 'idle', facing: 1 },
          { at: 80, x: 0.30, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.30, fadeIn: 30 },
          { type: 'static_noise', alpha: 0.20, fadeIn: 20 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.55, cy: 0.50 },
          { at: 55,  zoom: 0.88, cx: 0.60, cy: 0.50 },
          { at: 110, zoom: 0.82, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'energy_burst', cx: 0.80, cy: 0.40, color: '#ccaa44', alpha: 0.60, fadeIn: 20 },
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.45, fadeIn: 25 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ffdd88', startFrame: 20, duration: 20, alpha: 0.30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.70, cy: 0.48 },
          { at: 50, zoom: 1.38, cx: 0.72, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.60, fadeIn: 18 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 18, color: '#ccaa44', alpha: 0.40, startFrame: 20, fadeIn: 10 },
        ],
        bubbleX: 0.80,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.22, cx: 0.52, cy: 0.50 },
          { at: 90, zoom: 1.35, cx: 0.54, cy: 0.48 },
        ],
        camShake: [{ at: 55, strength: 4, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',  facing: 1 },
          { at: 45, x: 0.28, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 0.0, scale: 1.10, show: false },
          { at: 25, x: 0.68, state: 'idle', facing: -1, alpha: 0.5, scale: 1.10, show: true },
          { at: 55, x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.70, fadeIn: 14 },
          { type: 'speedlines', cx: 0.68, cy: 0.50, count: 22, color: '#ccaa44', alpha: 0.55, startFrame: 25, fadeIn: 8 },
          { type: 'energy_burst', cx: 0.80, cy: 0.40, color: '#ccaa44', alpha: 0.50, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ffdd88', startFrame: 55, duration: 16, alpha: 0.40 },
          { type: 'shockwave',     cx: 0.68, cy: 0.58, color: '#ccaa44', startFrame: 55, duration: 45 },
          { type: 'impact_sparks', cx: 0.68, cy: 0.50, count: 18, color: '#ffeeaa', startFrame: 55, duration: 28 },
        ],
        bubbleX: 0.80,
      },
    ],
  };

  // ─── Chapter 80 — Proof of Understanding ─────────────────────────────────
  S[80] = {
    bg: 'space',
    npcColor: '#ccaa44',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.88, cx: 0.55, cy: 0.50 },
          { at: 50,  zoom: 1.05, cx: 0.60, cy: 0.50 },
          { at: 110, zoom: 1.20, cx: 0.62, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 40, x: 0.28, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.38 },
          { at: 35, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.38 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.65, fadeIn: 20 },
          { type: 'energy_burst', cx: 0.72, cy: 0.40, color: '#ccaa44', alpha: 0.55, fadeIn: 22 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ffdd88', startFrame: 25, duration: 18, alpha: 0.35 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.22, cx: 0.50, cy: 0.50 },
          { at: 50,  zoom: 1.38, cx: 0.50, cy: 0.48 },
          { at: 100, zoom: 1.25, cx: 0.52, cy: 0.50 },
        ],
        camShake: [{ at: 40, strength: 3, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 35, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.38 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.75, fadeIn: 14 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 22, color: '#ffdd88', alpha: 0.50, startFrame: 20, fadeIn: 10 },
          { type: 'sky_cracks', alpha: 0.45, fadeIn: 22 },
        ],
        effects: [
          { type: 'shockwave',     cx: 0.72, cy: 0.55, color: '#ccaa44', startFrame: 40, duration: 50 },
          { type: 'impact_sparks', cx: 0.72, cy: 0.50, count: 20, color: '#ffeeaa', startFrame: 40, duration: 32 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 30,  zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 65,  zoom: 1.45, cx: 0.50, cy: 0.48 },
          { at: 100, zoom: 1.30, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 28, strength: 6, dur: 25 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 22, x: 0.32, state: 'attack', facing: 1 },
          { at: 50, x: 0.30, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.38 },
          { at: 22, x: 0.72, state: 'attack', facing: -1, alpha: 1.0, scale: 1.38 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.85, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 30, color: '#ffdd88', alpha: 0.70, startFrame: 22, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.75, fadeIn: 12 },
          { type: 'energy_burst', cx: 0.72, cy: 0.40, color: '#ffcc44', alpha: 0.65, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ffdd88', startFrame: 28, duration: 20, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#ccaa44', startFrame: 28, duration: 55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 26, color: '#ffeeaa', startFrame: 28, duration: 38 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#aa8822', startFrame: 28, duration: 55 },
        ],
        bubbleX: 0.72,
      },
    ],
  };

  // ── Chapter 82 — The First Heroes (21 beats) ────────────────────────────────
  // The Fallen God tells Axiom's origin: an ordinary man who won once too often.
  // Long monologue — staged as a slow, near-static push so the words carry it,
  // with the register changing only where the story turns.
  S[82] = {
    // The origin vault's relief of the tall figure and the smaller one (ch79)
    bg: 'level', level: { ch: 79, x: 2000 },
    npcColor: '#ddaa44',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.98, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 1.10, cx: 0.54, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ddaa44', alpha: 0.22 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        // "He was ordinary once." — the memory takes over the frame.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.60, cy: 0.50 }, { at: 90, zoom: 1.02, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15, alpha: 0.85 }],
        effectsBehind: [{ type: 'echo_text', color: '#ddaa44', alpha: 0.26 }],
      },
      {
        // Robbed on a street. No power, no significance.
        letterbox: true,
        bg: 'city',
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.44, cy: 0.50 }, { at: 70, zoom: 1.18, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle',  facing: 1, alpha: 0.5 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'idle',  facing: -1, alpha: 0.4 }],
        extraFigures: [{ xf: 0.50, color: '#775544', facing: 1, state: 'walk', alpha: 0.45 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        // "He won."
        letterbox: true,
        bg: 'city',
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.50, cy: 0.50 }, { at: 20, zoom: 1.34, cx: 0.50, cy: 0.48 }],
        camShake: [{ at: 16, strength: 8, dur: 18 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle',   facing: 1, alpha: 0.5 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'attack', facing: -1, alpha: 0.7 }],
        effects: [{ type: 'impact_sparks', cx: 0.56, cy: 0.52, count: 14, color: '#ffcc66', startFrame: 16, duration: 26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.56, cy: 0.50 }, { at: 70, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        // He found others. The company of heroes.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
        extraFigures: [
          { xf: 0.44, color: '#997744', facing: 1, state: 'idle', alpha: 0.30 },
          { xf: 0.52, color: '#886644', facing: 1, state: 'idle', alpha: 0.26 },
          { xf: 0.58, color: '#aa8855', facing: 1, state: 'idle', alpha: 0.22 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 1.16, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
        extraFigures: [
          { xf: 0.44, color: '#997744', facing: 1, state: 'idle', alpha: 0.30 },
          { xf: 0.54, color: '#886644', facing: 1, state: 'idle', alpha: 0.26 },
        ],
      },
      {
        // The thing the world could not handle.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.52, cy: 0.50 }, { at: 60, zoom: 0.94, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 30, strength: 6, dur: 40 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#ffaa44', alpha: 0.30, fadeIn: 30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.44 }, { at: 50, zoom: 1.10, cx: 0.56, cy: 0.48 }],
        camShake: [{ at: 20, strength: 9, dur: 26 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
        effects: [{ type: 'shockwave', cx: 0.50, cy: 0.50, color: '#ffbb55', startFrame: 18, duration: 44 }],
      },
      {
        // "They all stepped through."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.56, cy: 0.48 }, { at: 70, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'portal', xf: 0.50, yf: 0.46, height: 0.42, color: '#ffbb55', alpha: 0.5, fadeIn: 24 }],
      },
      {
        // The tear closes. Nothing to look at any more.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.18 }],
      },
      {
        // "I watched from outside."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.62, cy: 0.50 }, { at: 70, zoom: 1.22, cx: 0.68, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.68, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#8844aa', alpha: 0.30 }],
      },
      {
        // "What came back was not what went in."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.68, cy: 0.49 }, { at: 80, zoom: 1.04, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 30, strength: 4, dur: 44 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#aa44cc', alpha: 0.45 },
          { type: 'static_noise', alpha: 0.14 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        // The others did not keep even their names.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 0.96, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.15 }],
        extraFigures: [
          { xf: 0.42, color: '#553366', facing: 1, state: 'float', alpha: 0.20 },
          { xf: 0.52, color: '#4a2d5c', facing: 1, state: 'float', alpha: 0.16 },
          { xf: 0.60, color: '#5c3a70', facing: 1, state: 'float', alpha: 0.12 },
        ],
        effectsBehind: [{ type: 'echo_text', color: '#8866aa', alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'multi_portals', color: '#8866aa', alpha: 0.28, count: 5 }],
      },
      {
        // Some of the worlds he has already walked through.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.14, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'multi_portals', color: '#8866aa', alpha: 0.34, count: 5 }],
      },
      {
        // "That is the being you are walking toward."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.44, cy: 0.50 }, { at: 80, zoom: 1.36, cx: 0.36, cy: 0.48 }],
        camShake: [{ at: 40, strength: 5, dur: 40 }],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1, scale: 1.15, alpha: 0.8 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#cc44ff', alpha: 0.50, fadeIn: 26 }],
        effects: [{ type: 'screen_flash', color: '#cc44ff', startFrame: 70, duration: 18, alpha: 0.30 }],
      },
    ],
  };

  // ── Chapter 84 — Unregistered (8 beats) ─────────────────────────────────────
  // Why Axiom needed ninety-four collection attempts: delete was never available.
  S[84] = {
    // Still in the Fragment Core, under the fragment (ch83)
    bg: 'level', level: { ch: 83, x: 450 },
    npcColor: '#ddaa44',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.12, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'idle', facing: -1, scale: 1.15 }],
      },
      {
        // The domain — near-omnipotent inside it.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.58, cy: 0.50 }, { at: 80, zoom: 0.96, cx: 0.50, cy: 0.46 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#cc44ff', alpha: 0.22, fadeIn: 30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.46 }, { at: 60, zoom: 1.10, cx: 0.54, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        // Ninety-four attempts. The number lands here.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.44, cy: 0.50 }, { at: 90, zoom: 1.34, cx: 0.36, cy: 0.48 }],
        camShake: [{ at: 40, strength: 4, dur: 44 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1, scale: 1.15 }],
        effectsBehind: [
          { type: 'echo_text', color: '#ddaa44', alpha: 0.30 },
          { type: 'fragment_pulse', color: '#8899aa', alpha: 0.40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.36, cy: 0.48 }, { at: 60, zoom: 1.14, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        // Full integration removed even extraction — he is unregistered.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.44, cy: 0.50 }, { at: 70, zoom: 1.28, cx: 0.36, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'idle', facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.55, fadeIn: 24 }],
        effects: [{ type: 'screen_flash', color: '#88ddff', startFrame: 60, duration: 16, alpha: 0.26 }],
      },
    ],
  };

  // ── Chapter 85 — The Shape Beyond (8 beats) ─────────────────────────────────
  // The first mention of the thing under everything — and that it is not an enemy.
  S[85] = {
    // The Final Threshold: in front of the Separation Seal (ch81)
    bg: 'level', level: { ch: 81, x: 2760 },
    npcColor: '#ddaa44',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 1.14, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        // "Beyond the Creator — there is something older."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.58, cy: 0.50 }, { at: 90, zoom: 0.90, cx: 0.50, cy: 0.40 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.30, fadeIn: 40 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.50, cy: 0.40 }, { at: 70, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.34 }],
      },
      {
        // The core, the walls, the foundations.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'idle', facing: -1, scale: 1.15 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.12 },
        ],
      },
      {
        // "It knows the Void Mind exists."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 1.24, cx: 0.62, cy: 0.49 }],
        camShake: [{ at: 30, strength: 5, dur: 34 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#220033', alpha: 0.45 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.62, cy: 0.49 }, { at: 70, zoom: 1.10, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.15 }],
      },
      {
        // "and you will find it —"
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.44, cy: 0.50 }, { at: 60, zoom: 1.26, cx: 0.38, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'idle', facing: -1, scale: 1.15 }],
      },
      {
        // "It is not your enemy."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.26, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1, scale: 1.15 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#664488', alpha: 0.26 }],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
