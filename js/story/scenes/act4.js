'use strict';
// js/story/scenes/act4.js — cinematic scene specs for act4.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 8 specs — chapter ids: 128, 129, 131, 135, 138, 141, 143, 144

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ─── Chapter 128 — The Architecture ───────────────────────────────────────
  S[128] = {
    bg: 'city',
    npcColor: '#334455',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.88, cx: 0.30, cy: 0.50 },
          { at: 60,  zoom: 1.05, cx: 0.38, cy: 0.50 },
          { at: 130, zoom: 1.18, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.25, state: 'idle', facing: 1 },
          { at: 50,  x: 0.25, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#334455', alpha: 0.30, fadeIn: 30 },
          { type: 'static_noise', alpha: 0.20, fadeIn: 22 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.40, cy: 0.50 },
          { at: 50, zoom: 1.32, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.25, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.05 },
          { at: 28, x: 0.68, state: 'talk', facing: -1, alpha: 1.0, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4466aa', alpha: 0.45, fadeIn: 20 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.32, cx: 0.35, cy: 0.48 },
          { at: 45, zoom: 1.48, cx: 0.33, cy: 0.48 },
          { at: 90, zoom: 1.35, cx: 0.35, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.25, state: 'idle', facing: 1 },
          { at: 30, x: 0.25, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.05 },
          { at: 25, x: 0.68, state: 'talk', facing: -1, alpha: 1.0, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4466aa', alpha: 0.60, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash', color: '#223344', startFrame: 30, duration: 16, alpha: 0.35 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.90, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.10, cx: 0.52, cy: 0.50 },
          { at: 90, zoom: 1.25, cx: 0.54, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.25, state: 'walk', facing: 1 },
          { at: 35, x: 0.35, state: 'idle', facing: 1 },
          { at: 70, x: 0.35, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#334455', alpha: 0.50, fadeIn: 18 },
          { type: 'static_noise', alpha: 0.30, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.35, fadeIn: 25 },
        ],
      },
    ],
  };

  // ─── Chapter 129 — Architecture Soldiers ──────────────────────────────────
  S[129] = {
    bg: 'city',
    npcColor: '#336688',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.90, cx: 0.58, cy: 0.50 },
          { at: 60,  zoom: 1.08, cx: 0.55, cy: 0.50 },
          { at: 120, zoom: 1.20, cx: 0.52, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'walk', facing: 1 },
          { at: 55, x: 0.30, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.08 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#336688', alpha: 0.35, fadeIn: 28 },
          { type: 'static_noise', alpha: 0.20, fadeIn: 20 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.52, cy: 0.50 },
          { at: 50, zoom: 1.35, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle', facing: 1 },
          { at: 40, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.08 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#336688', alpha: 0.50, fadeIn: 20 },
          { type: 'sky_cracks', alpha: 0.35, fadeIn: 28 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.50, cx: 0.50, cy: 0.48 },
          { at: 90, zoom: 1.35, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 38, strength: 5, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle',  facing: 1 },
          { at: 32, x: 0.30, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.08 },
          { at: 30, x: 0.70, state: 'attack', facing: -1, alpha: 1.0, scale: 1.08 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 26, color: '#336688', alpha: 0.65, startFrame: 28, fadeIn: 7 },
          { type: 'fragment_pulse', color: '#336688', alpha: 0.70, fadeIn: 14 },
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#224455', startFrame: 38, duration: 18, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#336688', startFrame: 38, duration: 48 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 20, color: '#88bbdd', startFrame: 38, duration: 30 },
        ],
      },
    ],
  };

  // ─── Chapter 131 — Twin Enforcers ──────────────────────────────────────────
  S[131] = {
    bg: 'city',
    npcColor: '#cc2244',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.58, cy: 0.50 },
          { at: 50, zoom: 0.88, cx: 0.60, cy: 0.50 },
          { at: 100, zoom: 0.80, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.15 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc2244', alpha: 0.40, fadeIn: 25 },
          { type: 'sky_cracks', alpha: 0.35, fadeIn: 28 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.42, cy: 0.50 },
          { at: 50, zoom: 1.38, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 35, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.15 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc2244', alpha: 0.55, fadeIn: 18 },
        ],
        bubbleX: 0.42,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.45, cx: 0.50, cy: 0.48 },
          { at: 120, zoom: 1.28, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 32, strength: 6, dur: 26 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 25, x: 0.28, state: 'attack', facing: 1 },
          { at: 55, x: 0.28, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.15 },
          { at: 28, x: 0.70, state: 'attack', facing: -1, alpha: 1.0, scale: 1.15 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc2244', alpha: 0.80, fadeIn: 12 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 28, color: '#ff4466', alpha: 0.70, startFrame: 25, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.65, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc0033', startFrame: 32, duration: 20, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#cc2244', startFrame: 32, duration: 52 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 24, color: '#ff6688', startFrame: 32, duration: 36 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#880022', startFrame: 32, duration: 55 },
        ],
      },
    ],
  };

  // ─── Chapter 135 — Purge Sequence ─────────────────────────────────────────
  S[135] = {
    bg: 'city',
    npcColor: '#336688',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.18, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.30, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 15, strength: 6, dur: 28 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle',  facing: 1 },
          { at: 12, x: 0.30, state: 'hit',   facing: 1 },
          { at: 35, x: 0.30, state: 'guard', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.60, fadeIn: 12 },
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 15 },
          { type: 'static_noise', alpha: 0.40, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff4400', startFrame: 15, duration: 22, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.50, cy: 0.60, color: '#cc3300', startFrame: 15, duration: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.38, cy: 0.50 },
          { at: 50, zoom: 1.45, cx: 0.36, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'guard', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.55, fadeIn: 18 },
          { type: 'static_noise', alpha: 0.35, fadeIn: 15 },
        ],
        bubbleX: 0.42,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.42, cx: 0.36, cy: 0.48 },
          { at: 40, zoom: 1.58, cx: 0.35, cy: 0.48 },
          { at: 90, zoom: 1.42, cx: 0.36, cy: 0.50 },
        ],
        camShake: [{ at: 35, strength: 5, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'guard',  facing: 1 },
          { at: 28, x: 0.30, state: 'attack', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.08 },
          { at: 28, x: 0.68, state: 'attack', facing: -1, alpha: 1.0, scale: 1.08 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.80, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 28, color: '#ff4400', alpha: 0.70, startFrame: 25, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.70, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff4400', startFrame: 35, duration: 20, alpha: 0.60 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#cc3300', startFrame: 35, duration: 52 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 24, color: '#ff8866', startFrame: 35, duration: 35 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#882200', startFrame: 35, duration: 55 },
        ],
        bubbleX: 0.42,
      },
    ],
  };

  // ─── Chapter 138 — First Form ─────────────────────────────────────────────
  S[138] = {
    bg: 'city',
    npcColor: '#ff8822',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.62, cy: 0.50 },
          { at: 50, zoom: 1.25, cx: 0.65, cy: 0.48 },
          { at: 100, zoom: 1.15, cx: 0.63, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.20 },
          { at: 30, x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.20 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8822', alpha: 0.50, fadeIn: 22 },
          { type: 'energy_burst', cx: 0.70, cy: 0.40, color: '#ff8822', alpha: 0.45, fadeIn: 25 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.65, cy: 0.48 },
          { at: 50, zoom: 1.52, cx: 0.67, cy: 0.48 },
          { at: 100, zoom: 1.40, cx: 0.65, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.20 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8822', alpha: 0.65, fadeIn: 18 },
          { type: 'speedlines', cx: 0.70, cy: 0.45, count: 22, color: '#ff8822', alpha: 0.50, startFrame: 20, fadeIn: 10 },
          { type: 'sky_cracks', alpha: 0.45, fadeIn: 22 },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc6600', startFrame: 25, duration: 18, alpha: 0.40 },
          { type: 'shockwave',    cx: 0.70, cy: 0.55, color: '#ff8822', startFrame: 25, duration: 48 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.88, cx: 0.55, cy: 0.50 },
          { at: 30, zoom: 1.05, cx: 0.55, cy: 0.50 },
          { at: 65, zoom: 1.20, cx: 0.55, cy: 0.50 },
        ],
        camShake: [{ at: 30, strength: 7, dur: 30 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',  facing: 1 },
          { at: 25, x: 0.28, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.20 },
          { at: 28, x: 0.66, state: 'attack', facing: -1, alpha: 1.0, scale: 1.20 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8822', alpha: 0.85, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 30, color: '#ff8822', alpha: 0.75, startFrame: 20, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.70, fadeIn: 12 },
          { type: 'energy_burst', cx: 0.65, cy: 0.40, color: '#ffaa44', alpha: 0.65, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff6600', startFrame: 30, duration: 22, alpha: 0.60 },
          { type: 'shockwave',     cx: 0.50, cy: 0.60, color: '#ff8822', startFrame: 30, duration: 55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.55, count: 26, color: '#ffcc88', startFrame: 30, duration: 38 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#cc5500', startFrame: 30, duration: 60 },
        ],
      },
    ],
  };

  // ─── Chapter 141 — Second Form ────────────────────────────────────────────
  S[141] = {
    bg: 'city',
    npcColor: '#ff4400',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.82, cx: 0.60, cy: 0.50 },
          { at: 55,  zoom: 1.00, cx: 0.58, cy: 0.50 },
          { at: 120, zoom: 1.15, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 55, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 0.0, scale: 1.28, show: false },
          { at: 20, x: 0.72, state: 'idle', facing: -1, alpha: 0.5, scale: 1.28, show: true },
          { at: 55, x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.28 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.55, fadeIn: 22 },
          { type: 'energy_burst', cx: 0.72, cy: 0.38, color: '#ff6600', alpha: 0.60, fadeIn: 20 },
          { type: 'sky_cracks', alpha: 0.50, fadeIn: 25 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ff4400', startFrame: 20, duration: 24, alpha: 0.48 },
          { type: 'shockwave',    cx: 0.72, cy: 0.55, color: '#cc3300', startFrame: 20, duration: 55 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.68, cy: 0.48 },
          { at: 50, zoom: 1.45, cx: 0.70, cy: 0.48 },
          { at: 100, zoom: 1.32, cx: 0.68, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 40, x: 0.26, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.28 },
          { at: 28, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.28 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.70, fadeIn: 16 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 24, color: '#ff6600', alpha: 0.58, startFrame: 22, fadeIn: 9 },
          { type: 'sky_cracks', alpha: 0.60, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc3300', startFrame: 28, duration: 18, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.72, cy: 0.55, color: '#ff4400', startFrame: 28, duration: 50 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 28, zoom: 1.32, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.50, cx: 0.50, cy: 0.48 },
          { at: 100, zoom: 1.35, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 25, strength: 8, dur: 35 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',   facing: 1 },
          { at: 20, x: 0.26, state: 'attack', facing: 1 },
          { at: 55, x: 0.26, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.28 },
          { at: 22, x: 0.68, state: 'attack', facing: -1, alpha: 1.0, scale: 1.28 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.90, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 32, color: '#ff6600', alpha: 0.80, startFrame: 18, fadeIn: 5 },
          { type: 'sky_cracks', alpha: 0.80, fadeIn: 10 },
          { type: 'energy_burst', cx: 0.50, cy: 0.40, color: '#ffaa44', alpha: 0.70, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff4400', startFrame: 25, duration: 24, alpha: 0.68 },
          { type: 'shockwave',     cx: 0.50, cy: 0.60, color: '#cc3300', startFrame: 25, duration: 60 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.55, count: 30, color: '#ff9966', startFrame: 25, duration: 42 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#881100', startFrame: 25, duration: 65 },
        ],
        bubbleX: 0.72,
      },
    ],
  };

  // ─── Chapter 143 — SOVEREIGN ─────────────────────────────────────────────
  S[143] = {
    bg: 'city',
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 60,  zoom: 1.18, cx: 0.52, cy: 0.50 },
          { at: 130, zoom: 1.30, cx: 0.54, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 60, x: 0.26, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.40, fadeIn: 28 },
          { type: 'static_noise', alpha: 0.25, fadeIn: 20 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.65, cy: 0.50 },
          { at: 55,  zoom: 0.90, cx: 0.60, cy: 0.50 },
          { at: 120, zoom: 0.80, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.22 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 20 },
          { type: 'energy_burst', cx: 0.72, cy: 0.40, color: '#cc44ff', alpha: 0.55, fadeIn: 22 },
        ],
        effects: [
          { type: 'screen_flash', color: '#882299', startFrame: 20, duration: 20, alpha: 0.40 },
          { type: 'shockwave',    cx: 0.72, cy: 0.55, color: '#cc44ff', startFrame: 20, duration: 52 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.42, cy: 0.50 },
          { at: 50, zoom: 1.38, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 35, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.22 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.70, fadeIn: 15 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 20, color: '#cc44ff', alpha: 0.50, startFrame: 20, fadeIn: 10 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.88, cx: 0.55, cy: 0.50 },
          { at: 30, zoom: 1.08, cx: 0.55, cy: 0.50 },
          { at: 70, zoom: 1.25, cx: 0.55, cy: 0.50 },
        ],
        camShake: [{ at: 28, strength: 7, dur: 30 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'guard',  facing: 1 },
          { at: 22, x: 0.26, state: 'attack', facing: 1 },
          { at: 50, x: 0.26, state: 'idle',   facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.22 },
          { at: 22, x: 0.68, state: 'attack', facing: -1, alpha: 1.0, scale: 1.22 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.90, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 30, color: '#cc44ff', alpha: 0.80, startFrame: 18, fadeIn: 5 },
          { type: 'sky_cracks', alpha: 0.70, fadeIn: 12 },
          { type: 'energy_burst', cx: 0.65, cy: 0.40, color: '#ee88ff', alpha: 0.65, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc44ff', startFrame: 28, duration: 22, alpha: 0.60 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#aa22dd', startFrame: 28, duration: 55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 26, color: '#ee88ff', startFrame: 28, duration: 38 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#660099', startFrame: 28, duration: 60 },
        ],
      },
    ],
  };

  // ─── Chapter 144 — The Creator's Gate ────────────────────────────────────
  S[144] = {
    bg: 'city',
    npcColor: '#ff8822',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.85, cx: 0.50, cy: 0.50 },
          { at: 55, zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 120, zoom: 1.18, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 60, x: 0.26, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'portal', cx: 0.85, cy: 0.50, alpha: 0.90, fadeIn: 12 },
          { type: 'fragment_pulse', color: '#ff8822', alpha: 0.45, fadeIn: 25 },
          { type: 'energy_burst', cx: 0.85, cy: 0.45, color: '#ffaa44', alpha: 0.60, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ff6600', startFrame: 12, duration: 22, alpha: 0.42 },
          { type: 'shockwave',    cx: 0.85, cy: 0.55, color: '#ff8822', startFrame: 12, duration: 55 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.38, cy: 0.50 },
          { at: 50, zoom: 1.35, cx: 0.36, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8822', alpha: 0.60, fadeIn: 18 },
          { type: 'energy_burst', cx: 0.85, cy: 0.45, color: '#ffaa44', alpha: 0.50, fadeIn: 20 },
        ],
        bubbleX: 0.82,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.36, cy: 0.50 },
          { at: 45, zoom: 1.50, cx: 0.35, cy: 0.48 },
          { at: 90, zoom: 1.38, cx: 0.36, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 35, x: 0.26, state: 'guard', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8822', alpha: 0.70, fadeIn: 15 },
          { type: 'speedlines', cx: 0.85, cy: 0.48, count: 24, color: '#ffaa44', alpha: 0.60, startFrame: 20, fadeIn: 8 },
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ff6600', startFrame: 25, duration: 18, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.85, cy: 0.55, color: '#ff8822', startFrame: 25, duration: 50 },
        ],
        bubbleX: 0.82,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 30, zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 65, zoom: 1.48, cx: 0.50, cy: 0.48 },
          { at: 100, zoom: 1.32, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 28, strength: 8, dur: 35 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',   facing: 1 },
          { at: 22, x: 0.26, state: 'attack', facing: 1 },
          { at: 55, x: 0.26, state: 'guard',  facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8822', alpha: 0.90, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 32, color: '#ffaa44', alpha: 0.80, startFrame: 18, fadeIn: 5 },
          { type: 'sky_cracks', alpha: 0.80, fadeIn: 10 },
          { type: 'energy_burst', cx: 0.85, cy: 0.45, color: '#ffcc66', alpha: 0.70, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff6600', startFrame: 28, duration: 24, alpha: 0.65 },
          { type: 'shockwave',     cx: 0.50, cy: 0.60, color: '#cc5500', startFrame: 28, duration: 60 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.55, count: 30, color: '#ffcc88', startFrame: 28, duration: 42 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#882200', startFrame: 28, duration: 65 },
        ],
        bubbleX: 0.82,
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
