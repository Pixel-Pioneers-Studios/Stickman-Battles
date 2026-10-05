'use strict';
// js/story/scenes/act4mv.js — cinematic scene specs for act4mv.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 22 specs — chapter ids: 86, 87, 89, 90, 91, 93, 94, 95, 97, 99, 101, 105, 106, 107, 110, 112, 116, 117, 118, 122, 125, 126

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ─── Chapter 86 — A World at War ─────────────────────────────────────────
  S[86] = {
    bg: 'ruins',
    npcColor: '#aa3311',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.82, cx: 0.50, cy: 0.48 },
          { at: 55,  zoom: 1.00, cx: 0.48, cy: 0.50 },
          { at: 110, zoom: 1.12, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.15, state: 'run',  facing: 1 },
          { at: 30, x: 0.26, state: 'idle', facing: 1 },
          { at: 65, x: 0.26, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'portal', cx: 0.08, cy: 0.50, alpha: 0.85, fadeIn: 8 },
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.45, fadeIn: 30 },
          { type: 'smoke', alpha: 0.55, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ff6600', startFrame: 8, duration: 20, alpha: 0.40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.45, cy: 0.50 },
          { at: 50, zoom: 1.25, cx: 0.43, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.50, fadeIn: 20 },
          { type: 'smoke', alpha: 0.50, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.40, fadeIn: 25 },
        ],
        bubbleX: 0.82,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.18, cx: 0.52, cy: 0.50 },
          { at: 75, zoom: 1.28, cx: 0.55, cy: 0.50 },
        ],
        camShake: [{ at: 15, strength: 7, dur: 30 }, { at: 55, strength: 5, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 12, x: 0.26, state: 'hit',   facing: 1 },
          { at: 35, x: 0.26, state: 'guard', facing: 1 },
        ],
        effectsBehind: [
          { type: 'smoke', alpha: 0.65, fadeIn: 12 },
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.55, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff6600', startFrame: 15, duration: 22, alpha: 0.45 },
          { type: 'shockwave',     cx: 0.50, cy: 0.65, color: '#cc3300', startFrame: 15, duration: 50 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#882200', startFrame: 15, duration: 55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.68, count: 18, color: '#ff6633', startFrame: 15, duration: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.25, cx: 0.43, cy: 0.50 },
          { at: 50,  zoom: 1.38, cx: 0.42, cy: 0.48 },
          { at: 100, zoom: 1.22, cx: 0.44, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'guard', facing: 1 },
          { at: 50, x: 0.26, state: 'idle',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 0.0, scale: 1.10, show: false },
          { at: 20, x: 0.68, state: 'walk', facing: -1, alpha: 0.5, scale: 1.10, show: true },
          { at: 50, x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.68, cy: 0.50, count: 22, color: '#cc3300', alpha: 0.55, startFrame: 20, fadeIn: 8 },
          { type: 'smoke', alpha: 0.45, fadeIn: 18 },
          { type: 'fragment_pulse', color: '#ff4400', alpha: 0.55, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc3300', startFrame: 20, duration: 16, alpha: 0.40 },
          { type: 'shockwave',     cx: 0.68, cy: 0.58, color: '#aa3311', startFrame: 20, duration: 42 },
          { type: 'impact_sparks', cx: 0.68, cy: 0.50, count: 16, color: '#ff6644', startFrame: 20, duration: 28 },
        ],
        bubbleX: 0.82,
      },
    ],
  };

  // ─── Chapter 87 — The War Camp ────────────────────────────────────────────
  S[87] = {
    bg: 'city',
    npcColor: '#cc3311',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.88, cx: 0.60, cy: 0.50 },
          { at: 60,  zoom: 1.08, cx: 0.55, cy: 0.50 },
          { at: 120, zoom: 1.20, cx: 0.52, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.20, state: 'walk', facing: 1 },
          { at: 55,  x: 0.30, state: 'idle', facing: 1 },
          { at: 100, x: 0.30, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'smoke', alpha: 0.40, fadeIn: 20 },
          { type: 'fragment_pulse', color: '#cc3311', alpha: 0.30, fadeIn: 35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.52, cy: 0.50 },
          { at: 50, zoom: 1.35, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look', facing: 1 },
          { at: 40, x: 0.30, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'smoke', alpha: 0.45, fadeIn: 18 },
          { type: 'sky_cracks', alpha: 0.35, fadeIn: 28 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.58, cy: 0.50 },
          { at: 40, zoom: 0.88, cx: 0.60, cy: 0.50 },
          { at: 90, zoom: 0.82, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle',  facing: 1 },
          { at: 60, x: 0.30, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.75, state: 'idle', facing: -1, alpha: 1.0, scale: 1.12 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc3311', alpha: 0.50, fadeIn: 22 },
          { type: 'smoke', alpha: 0.40, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc3311', startFrame: 25, duration: 16, alpha: 0.35 },
        ],
        bubbleX: 0.75,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.62, cy: 0.48 },
          { at: 40, zoom: 1.48, cx: 0.65, cy: 0.48 },
          { at: 80, zoom: 1.38, cx: 0.62, cy: 0.50 },
        ],
        camShake: [{ at: 50, strength: 5, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.12 },
          { at: 35, x: 0.68, state: 'attack', facing: -1, alpha: 1.0, scale: 1.12 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.68, cy: 0.50, count: 24, color: '#cc3311', alpha: 0.60, startFrame: 35, fadeIn: 6 },
          { type: 'fragment_pulse', color: '#cc3311', alpha: 0.65, fadeIn: 12 },
          { type: 'smoke', alpha: 0.50, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc3311', startFrame: 50, duration: 18, alpha: 0.48 },
          { type: 'shockwave',     cx: 0.68, cy: 0.58, color: '#aa2200', startFrame: 50, duration: 45 },
          { type: 'impact_sparks', cx: 0.68, cy: 0.50, count: 20, color: '#ff6644', startFrame: 50, duration: 30 },
          { type: 'ground_crack',  cx: 0.68, cy: 0.68, color: '#882200', startFrame: 50, duration: 50 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // ─── Chapter 89 — War Champion ────────────────────────────────────────────
  S[89] = {
    bg: 'city',
    npcColor: '#ff2200',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.85, cx: 0.62, cy: 0.50 },
          { at: 55,  zoom: 1.05, cx: 0.60, cy: 0.50 },
          { at: 110, zoom: 1.18, cx: 0.58, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.24, state: 'walk', facing: 1 },
          { at: 50, x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.18 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff2200', alpha: 0.40, fadeIn: 28 },
          { type: 'smoke', alpha: 0.35, fadeIn: 18 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.18, cx: 0.58, cy: 0.48 },
          { at: 50,  zoom: 0.90, cx: 0.60, cy: 0.50 },
          { at: 100, zoom: 0.82, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.18 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff2200', alpha: 0.50, fadeIn: 22 },
          { type: 'sky_cracks', alpha: 0.40, fadeIn: 28 },
          { type: 'smoke', alpha: 0.40, fadeIn: 15 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.68, cy: 0.48 },
          { at: 45, zoom: 1.45, cx: 0.70, cy: 0.48 },
          { at: 90, zoom: 1.32, cx: 0.68, cy: 0.50 },
        ],
        camShake: [{ at: 42, strength: 5, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle',  facing: 1 },
          { at: 38, x: 0.32, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.18 },
          { at: 28, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.18 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.72, cy: 0.48, count: 26, color: '#ff2200', alpha: 0.65, startFrame: 28, fadeIn: 7 },
          { type: 'fragment_pulse', color: '#ff2200', alpha: 0.70, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff2200', startFrame: 42, duration: 18, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.72, cy: 0.58, color: '#cc1100', startFrame: 42, duration: 48 },
          { type: 'impact_sparks', cx: 0.72, cy: 0.50, count: 22, color: '#ff6633', startFrame: 42, duration: 32 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.35, cy: 0.48 },
          { at: 50,  zoom: 1.50, cx: 0.34, cy: 0.48 },
          { at: 100, zoom: 1.38, cx: 0.36, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 25, x: 0.28, state: 'attack', facing: 1 },
          { at: 55, x: 0.30, state: 'idle',   facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.18 },
          { at: 28, x: 0.72, state: 'hit',   facing: -1, alpha: 1.0, scale: 1.18 },
          { at: 55, x: 0.72, state: 'kneel', facing: -1, alpha: 1.0, scale: 1.18 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff2200', alpha: 0.75, fadeIn: 12 },
          { type: 'speedlines', cx: 0.40, cy: 0.50, count: 28, color: '#ff2200', alpha: 0.70, startFrame: 25, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.65, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff4400', startFrame: 28, duration: 20, alpha: 0.60 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#ff2200', startFrame: 28, duration: 52 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 26, color: '#ff8866', startFrame: 28, duration: 38 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#cc1100', startFrame: 28, duration: 55 },
        ],
        bubbleX: 0.82,
      },
    ],
  };

  // ─── Chapter 90 — Into the Flux ──────────────────────────────────────────
  S[90] = {
    bg: 'space',
    npcColor: '#2255aa',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.90, cx: 0.30, cy: 0.50 },
          { at: 40, zoom: 1.05, cx: 0.40, cy: 0.48 },
          { at: 90, zoom: 1.18, cx: 0.42, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.14, state: 'run',  facing: 1 },
          { at: 30, x: 0.26, state: 'idle', facing: 1 },
          { at: 65, x: 0.26, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'portal', cx: 0.08, cy: 0.50, alpha: 0.80, fadeIn: 8 },
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.35, fadeIn: 28 },
        ],
        effects: [
          { type: 'screen_flash', color: '#4488ff', startFrame: 8, duration: 18, alpha: 0.35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.42, cy: 0.50 },
          { at: 50, zoom: 1.28, cx: 0.42, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.45, fadeIn: 20 },
          { type: 'static_noise', alpha: 0.20, fadeIn: 25 },
        ],
        bubbleX: 0.82,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 30, zoom: 1.30, cx: 0.50, cy: 0.40 },
          { at: 65, zoom: 1.42, cx: 0.50, cy: 0.30 },
          { at: 95, zoom: 1.25, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 25, strength: 8, dur: 35 }, { at: 60, strength: 6, dur: 25 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 22, x: 0.26, state: 'fall',  facing: 1 },
          { at: 55, x: 0.26, state: 'float', facing: 1 },
          { at: 80, x: 0.26, state: 'idle',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle',  facing: -1, alpha: 0.0, scale: 1.05, show: false },
          { at: 35, x: 0.70, state: 'float', facing: -1, alpha: 0.6, scale: 1.05, show: true },
          { at: 65, x: 0.68, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.70, fadeIn: 14 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 26, color: '#4488ff', alpha: 0.65, startFrame: 20, fadeIn: 8 },
          { type: 'energy_burst', cx: 0.50, cy: 0.35, color: '#88aaff', alpha: 0.55, fadeIn: 20 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#4488ff', startFrame: 25, duration: 22, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.50, cy: 0.40, color: '#2255aa', startFrame: 25, duration: 50 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.40, count: 22, color: '#aaccff', startFrame: 25, duration: 32 },
        ],
      },
    ],
  };

  // ─── Chapter 91 — Drifters in the Flux ───────────────────────────────────
  S[91] = {
    bg: 'space',
    npcColor: '#3366cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.05, cx: 0.55, cy: 0.50 },
          { at: 60,  zoom: 0.88, cx: 0.58, cy: 0.50 },
          { at: 120, zoom: 0.80, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.25, state: 'idle', facing: 1 },
          { at: 55, x: 0.25, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.08 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.40, fadeIn: 28 },
          { type: 'energy_burst', cx: 0.68, cy: 0.38, color: '#4488ff', alpha: 0.35, fadeIn: 35 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.80, cx: 0.58, cy: 0.50 },
          { at: 40, zoom: 0.72, cx: 0.60, cy: 0.50 },
          { at: 90, zoom: 0.80, cx: 0.58, cy: 0.50 },
        ],
        camShake: [{ at: 40, strength: 5, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.25, state: 'look',  facing: 1 },
          { at: 38, x: 0.25, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.08 },
          { at: 35, x: 0.68, state: 'float', facing: -1, alpha: 1.0, scale: 1.08 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.55, fadeIn: 18 },
          { type: 'speedlines', cx: 0.60, cy: 0.45, count: 20, color: '#4488ff', alpha: 0.50, startFrame: 35, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash', color: '#4488ff', startFrame: 40, duration: 18, alpha: 0.40 },
          { type: 'shockwave',    cx: 0.60, cy: 0.50, color: '#3366cc', startFrame: 40, duration: 42 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.38, cy: 0.50 },
          { at: 45, zoom: 1.32, cx: 0.36, cy: 0.48 },
          { at: 90, zoom: 1.22, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.25, state: 'guard',  facing: 1 },
          { at: 38, x: 0.28, state: 'attack', facing: 1 },
          { at: 60, x: 0.28, state: 'idle',   facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'float',  facing: -1, alpha: 1.0, scale: 1.08 },
          { at: 35, x: 0.65, state: 'attack', facing: -1, alpha: 1.0, scale: 1.08 },
          { at: 60, x: 0.65, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.08 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.65, fadeIn: 14 },
          { type: 'speedlines', cx: 0.50, cy: 0.48, count: 24, color: '#3366cc', alpha: 0.60, startFrame: 30, fadeIn: 8 },
          { type: 'energy_burst', cx: 0.50, cy: 0.35, color: '#88aaff', alpha: 0.50, fadeIn: 22 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#4488ff', startFrame: 35, duration: 18, alpha: 0.45 },
          { type: 'shockwave',     cx: 0.50, cy: 0.55, color: '#3366cc', startFrame: 35, duration: 48 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 20, color: '#aaccff', startFrame: 35, duration: 30 },
        ],
        bubbleX: 0.82,
      },
    ],
  };

  // ── Chapter 93 — Flux Guardian (4 beats) ────────────────────────────────────
  // "You are the fourteenth fragment bearer to reach this axis." Then gravity flips.
  S[93] = {
    bg: 'space',
    npcColor: '#00aaff',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.14, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'walk', facing: 1 }, { at: 60, x: 0.36, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'float', facing: -1, scale: 1.08 }],
        effectsBehind: [{ type: 'speedlines', cx: 0.68, cy: 0.50, count: 16, color: '#00aaff', alpha: 0.28 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'look',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'float', facing: -1, scale: 1.08 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        // "the fourteenth" — he is a number to it, the way he was to the lab.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.60, cy: 0.50 }, { at: 70, zoom: 1.30, cx: 0.52, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.08 }],
        effectsBehind: [{ type: 'echo_text', color: '#00aaff', alpha: 0.30 }],
      },
      {
        // "The world flipped." — the camera inverts with it.
        letterbox: true,
        warp: 3,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.52, cy: 0.49 },
          { at: 18, zoom: 1.04, cx: 0.50, cy: 0.62 },
          { at: 50, zoom: 1.10, cx: 0.50, cy: 0.38 },
        ],
        camShake: [{ at: 16, strength: 15, dur: 32 }],
        playerPos: [
          { at: 0,  x: 0.36, state: 'idle',  facing: 1 },
          { at: 18, x: 0.36, state: 'fall',  facing: 1 },
          { at: 55, x: 0.36, state: 'float', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.68, state: 'float', facing: -1, scale: 1.08 }],
        effects: [
          { type: 'screen_flash', color: '#00aaff', startFrame: 16, duration: 16, alpha: 0.45 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 26, color: '#00aaff', alpha: 0.55, startFrame: 16 },
        ],
      },
    ],
  };

  // ─── Chapter 94 — Into the Dark ──────────────────────────────────────────
  S[94] = {
    bg: 'space',
    npcColor: '#550077',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.82, cx: 0.50, cy: 0.50 },
          { at: 60,  zoom: 1.00, cx: 0.48, cy: 0.50 },
          { at: 130, zoom: 1.15, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.18, state: 'walk', facing: 1 },
          { at: 50,  x: 0.28, state: 'idle', facing: 1 },
          { at: 90,  x: 0.28, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'portal', cx: 0.08, cy: 0.50, alpha: 0.80, fadeIn: 10 },
          { type: 'fragment_pulse', color: '#550077', alpha: 0.35, fadeIn: 30 },
        ],
        effects: [
          { type: 'screen_flash', color: '#220033', startFrame: 10, duration: 30, alpha: 0.50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.42, cy: 0.50 },
          { at: 55, zoom: 1.32, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1 },
          { at: 40, x: 0.28, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#550077', alpha: 0.55, fadeIn: 18 },
          { type: 'static_noise', alpha: 0.35, fadeIn: 15 },
        ],
        bubbleX: 0.82,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.32, cx: 0.40, cy: 0.50 },
          { at: 40, zoom: 1.48, cx: 0.38, cy: 0.50 },
          { at: 90, zoom: 1.35, cx: 0.40, cy: 0.50 },
        ],
        camShake: [{ at: 40, strength: 4, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',  facing: 1 },
          { at: 35, x: 0.28, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 0.0, scale: 1.05, show: false },
          { at: 20, x: 0.72, state: 'idle', facing: -1, alpha: 0.3, scale: 1.05, show: true },
          { at: 45, x: 0.72, state: 'idle', facing: -1, alpha: 0.0, scale: 1.05 },
          { at: 60, x: 0.60, state: 'idle', facing: -1, alpha: 0.0, scale: 1.05 },
          { at: 80, x: 0.60, state: 'idle', facing: -1, alpha: 0.7, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#550077', alpha: 0.70, fadeIn: 12 },
          { type: 'speedlines', cx: 0.60, cy: 0.50, count: 20, color: '#550077', alpha: 0.55, startFrame: 40, fadeIn: 8 },
          { type: 'static_noise', alpha: 0.45, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#330044', startFrame: 40, duration: 18, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.60, cy: 0.58, color: '#550077', startFrame: 40, duration: 40 },
          { type: 'impact_sparks', cx: 0.60, cy: 0.50, count: 14, color: '#aa44cc', startFrame: 40, duration: 26 },
        ],
        bubbleX: 0.82,
      },
    ],
  };

  // ─── Chapter 95 — The Unseen Court ───────────────────────────────────────
  S[95] = {
    bg: 'space',
    npcColor: '#7700cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.08, cx: 0.55, cy: 0.50 },
          { at: 60,  zoom: 1.22, cx: 0.52, cy: 0.50 },
          { at: 120, zoom: 1.35, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 60, x: 0.26, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.40, fadeIn: 25 },
          { type: 'static_noise', alpha: 0.25, fadeIn: 18 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.20, cx: 0.52, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 0.0, scale: 1.08, show: false },
          { at: 18, x: 0.70, state: 'idle', facing: -1, alpha: 0.6, scale: 1.08, show: true },
          { at: 35, x: 0.70, state: 'idle', facing: -1, alpha: 0.0, scale: 1.08 },
          { at: 55, x: 0.58, state: 'idle', facing: -1, alpha: 0.8, scale: 1.08 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.60, fadeIn: 15 },
          { type: 'speedlines', cx: 0.70, cy: 0.48, count: 18, color: '#7700cc', alpha: 0.50, startFrame: 18, fadeIn: 8 },
          { type: 'static_noise', alpha: 0.35, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash', color: '#330055', startFrame: 18, duration: 16, alpha: 0.45 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.42, cy: 0.50 },
          { at: 50, zoom: 1.42, cx: 0.40, cy: 0.48 },
          { at: 100, zoom: 1.28, cx: 0.42, cy: 0.50 },
        ],
        camShake: [{ at: 45, strength: 4, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 40, x: 0.26, state: 'guard', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.72, fadeIn: 12 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 22, color: '#aa44ff', alpha: 0.58, startFrame: 22, fadeIn: 8 },
          { type: 'sky_cracks', alpha: 0.50, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#550088', startFrame: 45, duration: 16, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#7700cc', startFrame: 45, duration: 42 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 16, color: '#cc66ff', startFrame: 45, duration: 28 },
        ],
        bubbleX: 0.82,
      },
    ],
  };

  // ─── Chapter 97 — Shadow Warden ───────────────────────────────────────────
  S[97] = {
    bg: 'space',
    npcColor: '#9900ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.85, cx: 0.60, cy: 0.50 },
          { at: 60,  zoom: 1.05, cx: 0.58, cy: 0.50 },
          { at: 120, zoom: 1.18, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.24, state: 'walk', facing: 1 },
          { at: 55, x: 0.30, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9900ff', alpha: 0.35, fadeIn: 28 },
          { type: 'static_noise', alpha: 0.30, fadeIn: 18 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.38, cy: 0.48 },
          { at: 50, zoom: 1.50, cx: 0.36, cy: 0.48 },
          { at: 90, zoom: 1.38, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9900ff', alpha: 0.65, fadeIn: 15 },
          { type: 'speedlines', cx: 0.30, cy: 0.50, count: 22, color: '#9900ff', alpha: 0.55, startFrame: 20, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash', color: '#440077', startFrame: 25, duration: 18, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.30, cy: 0.55, color: '#9900ff', startFrame: 25, duration: 42 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.58, cy: 0.50 },
          { at: 35, zoom: 1.40, cx: 0.62, cy: 0.48 },
          { at: 80, zoom: 1.28, cx: 0.60, cy: 0.50 },
        ],
        camShake: [{ at: 30, strength: 5, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle',  facing: 1 },
          { at: 25, x: 0.30, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 0.0, scale: 1.12, show: false },
          { at: 22, x: 0.68, state: 'idle', facing: -1, alpha: 0.5, scale: 1.12, show: true },
          { at: 45, x: 0.68, state: 'talk', facing: -1, alpha: 1.0, scale: 1.12 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9900ff', alpha: 0.80, fadeIn: 10 },
          { type: 'speedlines', cx: 0.68, cy: 0.48, count: 26, color: '#9900ff', alpha: 0.65, startFrame: 22, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.60, fadeIn: 14 },
          { type: 'static_noise', alpha: 0.40, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#6600aa', startFrame: 30, duration: 20, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.68, cy: 0.58, color: '#9900ff', startFrame: 30, duration: 50 },
          { type: 'impact_sparks', cx: 0.68, cy: 0.50, count: 20, color: '#cc66ff', startFrame: 30, duration: 32 },
          { type: 'ground_crack',  cx: 0.68, cy: 0.68, color: '#660088', startFrame: 30, duration: 55 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // ─── Chapter 99 — The Outer Throne ───────────────────────────────────────
  S[99] = {
    bg: 'lava',
    npcColor: '#cc7700',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.78, cx: 0.60, cy: 0.50 },
          { at: 60,  zoom: 0.92, cx: 0.58, cy: 0.50 },
          { at: 130, zoom: 1.05, cx: 0.55, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'walk', facing: 1 },
          { at: 60, x: 0.30, state: 'idle', facing: 1 },
          { at: 95, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.25 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc7700', alpha: 0.40, fadeIn: 28 },
          { type: 'smoke', alpha: 0.50, fadeIn: 18 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.55, cy: 0.50 },
          { at: 50, zoom: 1.20, cx: 0.52, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look',  facing: 1 },
          { at: 40, x: 0.30, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.25 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc7700', alpha: 0.55, fadeIn: 20 },
          { type: 'smoke', alpha: 0.45, fadeIn: 15 },
        ],
        bubbleX: 0.82,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.52, cy: 0.50 },
          { at: 40, zoom: 1.00, cx: 0.58, cy: 0.50 },
          { at: 85, zoom: 0.88, cx: 0.60, cy: 0.50 },
        ],
        camShake: [{ at: 55, strength: 8, dur: 35 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.25 },
          { at: 45, x: 0.68, state: 'attack', facing: -1, alpha: 1.0, scale: 1.25 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 28, color: '#cc7700', alpha: 0.65, startFrame: 45, fadeIn: 6 },
          { type: 'fragment_pulse', color: '#cc7700', alpha: 0.70, fadeIn: 12 },
          { type: 'smoke', alpha: 0.55, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc6600', startFrame: 55, duration: 22, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.65, color: '#aa5500', startFrame: 55, duration: 55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.65, count: 24, color: '#ffaa44', startFrame: 55, duration: 35 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#882200', startFrame: 55, duration: 60 },
        ],
        bubbleX: 0.72,
      },
    ],
  };

  // ─── Chapter 101 — Titan King ──────────────────────────────────────────────
  S[101] = {
    bg: 'lava',
    npcColor: '#ffaa00',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.70, cx: 0.65, cy: 0.50 },
          { at: 65,  zoom: 0.82, cx: 0.62, cy: 0.50 },
          { at: 130, zoom: 0.90, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'walk', facing: 1 },
          { at: 60, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.50 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ffaa00', alpha: 0.35, fadeIn: 35 },
          { type: 'smoke', alpha: 0.55, fadeIn: 15 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.90, cx: 0.60, cy: 0.50 },
          { at: 55, zoom: 1.08, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 40, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.50 },
          { at: 30, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.50 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ffaa00', alpha: 0.50, fadeIn: 22 },
          { type: 'smoke', alpha: 0.50, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.40, fadeIn: 28 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.38, cy: 0.48 },
          { at: 45, zoom: 1.48, cx: 0.36, cy: 0.48 },
          { at: 90, zoom: 1.32, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 30, x: 0.28, state: 'attack', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.50 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ffaa00', alpha: 0.65, fadeIn: 15 },
          { type: 'speedlines', cx: 0.28, cy: 0.50, count: 24, color: '#ff8800', alpha: 0.60, startFrame: 25, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc7700', startFrame: 30, duration: 16, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.35, cy: 0.55, color: '#ffaa00', startFrame: 30, duration: 45 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 30, zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 65, zoom: 1.48, cx: 0.50, cy: 0.48 },
          { at: 100, zoom: 1.32, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 28, strength: 10, dur: 40 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'attack', facing: 1 },
          { at: 28, x: 0.28, state: 'idle',   facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.50 },
          { at: 28, x: 0.72, state: 'hit',   facing: -1, alpha: 1.0, scale: 1.50 },
          { at: 65, x: 0.72, state: 'kneel', facing: -1, alpha: 1.0, scale: 1.50 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ffaa00', alpha: 0.90, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 34, color: '#ffcc44', alpha: 0.80, startFrame: 22, fadeIn: 5 },
          { type: 'sky_cracks', alpha: 0.80, fadeIn: 10 },
          { type: 'smoke', alpha: 0.60, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ffaa00', startFrame: 28, duration: 24, alpha: 0.65 },
          { type: 'shockwave',     cx: 0.50, cy: 0.62, color: '#cc8800', startFrame: 28, duration: 60 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.62, count: 30, color: '#ffcc66', startFrame: 28, duration: 45 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#884400', startFrame: 28, duration: 65 },
        ],
      },
    ],
  };

  // ── Chapter 105 — The Pattern Gap (7 beats) ─────────────────────────────────
  // Null: 847 catalogued beings, 4,200 years, and Kael is the first structural
  // error. Staged flat and symmetrical — it is a machine describing a fault.
  S[105] = {
    // Where the Erasure Protocol stopped, by the Dimensional Anchor (ch104)
    bg: 'level', level: { ch: 104, x: 4150 },
    npcColor: '#9900cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.08, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, alpha: 0, fadeIn: 40 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.14 }],
      },
      {
        // No face, no features.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.62, cy: 0.50 }, { at: 60, zoom: 1.30, cx: 0.66, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'look',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.20 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.66, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'echo_text', color: '#9900cc', alpha: 0.28 }],
      },
      {
        // "my model began producing errors"
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.66, cy: 0.49 }, { at: 70, zoom: 1.12, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 30, strength: 3, dur: 30 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1 }],
      },
      {
        // "The fragment you carry is the source."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.42, cy: 0.50 }, { at: 60, zoom: 1.34, cx: 0.36, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'point', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.50, fadeIn: 20 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.36, cy: 0.49 }, { at: 70, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
    ],
  };

  // ── Chapter 106 — The Unseen Pattern (7 beats) — TRIAL OF SENSE ─────────────
  // Null takes sight and hands over the lantern. The lantern beat is the one
  // that has to read, because the whole trial is about what it does.
  S[106] = {
    bg: 'space',
    npcColor: '#6600aa',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1 }],
      },
      {
        // "I am going to take it from you."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.56, cy: 0.50 }, { at: 40, zoom: 1.32, cx: 0.62, cy: 0.49 }],
        camShake: [{ at: 34, strength: 6, dur: 20 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effects: [{ type: 'screen_flash', color: '#220033', startFrame: 34, duration: 20, alpha: 0.55 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.62, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.24 }],
      },
      {
        // The lantern is set down between them.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.50, cy: 0.52 }, { at: 60, zoom: 1.46, cx: 0.50, cy: 0.58 }],
        playerPos: [{ at: 0, x: 0.34, state: 'look',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'reach', facing: -1 }, { at: 40, x: 0.64, state: 'idle', facing: -1 }],
        effects: [
          { type: 'objective_marker', cx: 0.50, cy: 0.62, color: '#ffcc66', startFrame: 30, duration: 90 },
          { type: 'fire_glow', alpha: 0.26, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.46, cx: 0.50, cy: 0.58 }, { at: 60, zoom: 1.20, cx: 0.52, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.34, state: 'reach', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'talk',  facing: -1 }],
        effectsBehind: [{ type: 'fire_glow', alpha: 0.22 }],
      },
      {
        // "The information will be old the moment you have it."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.52, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'talk', facing: -1 }],
        effectsBehind: [{ type: 'echo_text', color: '#6600aa', alpha: 0.26 }],
      },
      {
        // "Show me what you treat it as." Null goes out.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.52, cy: 0.52 }, { at: 70, zoom: 1.02, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, alpha: 1.0 }, { at: 60, x: 0.64, state: 'float', facing: -1, alpha: 0.0 }],
        effects: [{ type: 'screen_flash', color: '#220033', startFrame: 58, duration: 22, alpha: 0.42 }],
      },
    ],
  };

  // ── Chapter 107 — Null (5 beats) ────────────────────────────────────────────
  S[107] = {
    bg: 'space',
    npcColor: '#9900cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.54, cy: 0.50 }, { at: 60, zoom: 1.18, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',  facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        // "You do not return to anything." The one thing it cannot model.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.42, cy: 0.50 }, { at: 70, zoom: 1.36, cx: 0.36, cy: 0.49 }],
        camShake: [{ at: 34, strength: 4, dur: 30 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.36, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 1.14, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.56, cy: 0.50 }, { at: 50, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'guard', facing: -1 }],
        effects: [{ type: 'impact_sparks', cx: 0.50, cy: 0.52, count: 12, color: '#9900cc', startFrame: 45, duration: 24 }],
      },
    ],
  };

  // ── Chapter 110 — The Pull (6 beats) ────────────────────────────────────────
  // The fragment leans toward Seraph like water toward a drain.
  S[110] = {
    // The centre of the expanse, at the rim of Seraph's bowl (ch112)
    bg: 'level', level: { ch: 112, x: 2800 },
    npcColor: '#00aacc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.40, cy: 0.50 }, { at: 70, zoom: 1.28, cx: 0.36, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }, { at: 50, x: 0.34, state: 'reach', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1, alpha: 0.9 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.50 }],
      },
      {
        // Not toward danger — toward Seraph.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.36, cy: 0.49 }, { at: 70, zoom: 1.02, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#00aacc', alpha: 0.40 },
          { type: 'speedlines', cx: 0.68, cy: 0.52, count: 14, color: '#00aacc', alpha: 0.30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.60, cy: 0.50 }, { at: 55, zoom: 1.22, cx: 0.66, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.66, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'echo_text', color: '#00aacc', alpha: 0.24 }],
      },
      {
        // "I am not going to take it from you."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.66, cy: 0.50 }, { at: 60, zoom: 1.36, cx: 0.68, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#00aacc', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.36, cx: 0.68, cy: 0.48 }, { at: 80, zoom: 0.98, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
    ],
  };

  // ── Chapter 112 — Seraph (4 beats) ──────────────────────────────────────────
  // "I keep taking things." The duel offered as the only thanks they know.
  S[112] = {
    bg: 'ice',
    npcColor: '#00aacc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.60, cy: 0.50 }, { at: 60, zoom: 1.28, cx: 0.66, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.66, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 1.10, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.34 }],
      },
      {
        // "I want to see that up close." Both take guard.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.46, cy: 0.50 }, { at: 55, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 48, strength: 5, dur: 18 }],
        playerPos: [{ at: 0, x: 0.32, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'guard', facing: -1 }],
        effects: [{ type: 'shockwave', cx: 0.50, cy: 0.60, color: '#00aacc', startFrame: 48, duration: 32 }],
      },
    ],
  };

  // ── Chapter 116 — The Blind Spot (6 beats) ──────────────────────────────────
  // VAEL has been first through every door — and cannot see Kael at all.
  S[116] = {
    // Where the three temporal layers meet (ch118)
    bg: 'level', level: { ch: 118, x: 3000 },
    npcColor: '#0055ff',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.12, cx: 0.62, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'walk', facing: 1 }, { at: 60, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'multi_portals', color: '#0055ff', alpha: 0.22, count: 3 }],
      },
      {
        // Someone who had been waiting.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.62, cy: 0.50 }, { at: 60, zoom: 1.32, cx: 0.68, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.12 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.68, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'echo_text', color: '#0055ff', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.68, cy: 0.49 }, { at: 70, zoom: 1.10, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
      },
      {
        // "The fragment is why."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.42, cy: 0.50 }, { at: 60, zoom: 1.34, cx: 0.36, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'point', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.48 }],
      },
      {
        // First through every door — until now.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.56, cy: 0.50 }, { at: 80, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [{ type: 'multi_portals', color: '#0055ff', alpha: 0.26, count: 4 }],
      },
    ],
  };

  // ── Chapter 117 — Thirty-Four Frames (6 beats) — TRIAL OF SELF-KNOWLEDGE ────
  // The water stands up and takes his shape. The mirror beat has to sell it.
  S[117] = {
    bg: 'ice',
    npcColor: '#2266cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1 }],
      },
      {
        // "I looked back instead. Half a second."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.60, cy: 0.50 }, { at: 60, zoom: 1.24, cx: 0.64, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'echo_text', color: '#2266cc', alpha: 0.28 }],
      },
      {
        // The copy rises out of the water in his own shape.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.24, cx: 0.64, cy: 0.50 },
          { at: 20, zoom: 1.10, cx: 0.44, cy: 0.52 },
          { at: 70, zoom: 1.30, cx: 0.46, cy: 0.50 },
        ],
        camShake: [{ at: 22, strength: 8, dur: 24 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }, { at: 30, x: 0.30, state: 'hit', facing: 1 }, { at: 60, x: 0.31, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1, alpha: 0.7 }],
        extraFigures: [{ xf: 0.52, color: '#2266cc', facing: -1, state: 'idle', alpha: 0.55 }],
        effects: [
          { type: 'shockwave',   cx: 0.52, cy: 0.62, color: '#2266cc', startFrame: 20, duration: 40 },
          { type: 'screen_flash', color: '#88bbff', startFrame: 20, duration: 14, alpha: 0.34 },
        ],
      },
      {
        // "It does not predict you. It repeats you."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.31, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1 }],
        extraFigures: [{ xf: 0.52, color: '#2266cc', facing: -1, state: 'guard', alpha: 0.62 }],
      },
      {
        // "If you have a pattern, it will find you with it."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.46, cy: 0.50 }, { at: 70, zoom: 1.12, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.31, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        extraFigures: [{ xf: 0.52, color: '#2266cc', facing: -1, state: 'idle', alpha: 0.62 }],
      },
      {
        // "I have never watched anyone try."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.31, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle',  facing: -1, alpha: 0.6 }],
        extraFigures: [{ xf: 0.52, color: '#2266cc', facing: -1, state: 'guard', alpha: 0.70 }],
      },
    ],
  };

  // ── Chapter 118 — VAEL (4 beats) ────────────────────────────────────────────
  // Three seconds of foresight against the one person who returns nothing.
  S[118] = {
    bg: 'ice',
    npcColor: '#0055ff',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.60, cy: 0.50 }, { at: 60, zoom: 1.22, cx: 0.66, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'multi_portals', color: '#0055ff', alpha: 0.20, count: 3 }],
      },
      {
        // "Against you — I see nothing."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.66, cy: 0.50 }, { at: 40, zoom: 1.40, cx: 0.68, cy: 0.48 }],
        camShake: [{ at: 34, strength: 4, dur: 24 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effects: [{ type: 'static_noise', alpha: 0.24, startFrame: 30, duration: 60 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.68, cy: 0.48 }, { at: 70, zoom: 1.12, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.52, cy: 0.50 }, { at: 55, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 48, strength: 5, dur: 18 }],
        playerPos: [{ at: 0, x: 0.32, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'guard', facing: -1 }],
        effects: [{ type: 'impact_sparks', cx: 0.50, cy: 0.52, count: 14, color: '#0055ff', startFrame: 46, duration: 26 }],
      },
    ],
  };

  // ── Chapter 122 — Thresh (6 beats) ──────────────────────────────────────────
  // Grief that fractures everything it touches. Ground cracks carry this one.
  S[122] = {
    bg: 'lava',
    npcColor: '#ff4400',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.58, cy: 0.50 }, { at: 60, zoom: 1.22, cx: 0.64, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.10 }],
        effectsBehind: [{ type: 'fire_glow', alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.64, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.32, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',   facing: -1, scale: 1.10 }],
      },
      {
        // "The void didn't give me more strength."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.64, cy: 0.50 }, { at: 70, zoom: 1.38, cx: 0.68, cy: 0.49 }],
        camShake: [{ at: 30, strength: 5, dur: 34 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1, scale: 1.10 }],
        effectsBehind: [{ type: 'ground_crack', color: '#ff4400', alpha: 0.40, fadeIn: 24 }],
      },
      {
        // Everything he has touched since has fractured.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.38, cx: 0.68, cy: 0.49 }, { at: 60, zoom: 1.00, cx: 0.50, cy: 0.52 }],
        camShake: [{ at: 20, strength: 8, dur: 40 }],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1, scale: 1.10 }],
        effectsBehind: [{ type: 'ground_crack', color: '#ff4400', alpha: 0.60 }],
        effects: [{ type: 'shockwave', cx: 0.68, cy: 0.62, color: '#ff4400', startFrame: 18, duration: 46 }],
      },
      {
        // "You're standing in the middle of what my grief looks like."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.52 }, { at: 80, zoom: 0.92, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.32, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1, scale: 1.10 }],
        effectsBehind: [
          { type: 'ground_crack', color: '#ff4400', alpha: 0.55 },
          { type: 'fire_glow', alpha: 0.30 },
        ],
      },
      {
        // "I don't want to break you." He guards anyway.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.48 }, { at: 60, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 52, strength: 6, dur: 20 }],
        playerPos: [{ at: 0, x: 0.32, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'guard', facing: -1, scale: 1.10 }],
        effects: [{ type: 'impact_sparks', cx: 0.50, cy: 0.54, count: 16, color: '#ff6622', startFrame: 50, duration: 28 }],
      },
    ],
  };

  // ── Chapter 125: The Architecture of the Lie ─────────────────────────────────
  S[125] = {
    // The fracture boundary, by the figure's traces (ch123)
    bg: 'level', level: { ch: 123, x: 3000 },
    npcColor: '#8855aa',
    beats: [
      {
        // The figure lays out the variant protocol — anchor chain, Veran's compromise
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.18, cx: 0.60, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',   facing: -1, alpha: 0.55, scale: 1.10 },
          { at: 30, x: 0.72, state: 'talk',   facing: -1, alpha: 0.75, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#7733aa', alpha: 0.35, fadeIn: 30 },
          { type: 'smoke', cx: 0.72, cy: 0.55, color: '#330055', alpha: 0.30, fadeIn: 25 },
        ],
        bubbleX: 0.72,
      },
      {
        // "The fracture closure doesn't require the bearer to be consumed. It never did."
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.62, cy: 0.50 },
          { at: 50, zoom: 1.32, cx: 0.68, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk', facing: -1, alpha: 0.80, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#aa44ff', alpha: 0.45, fadeIn: 20 },
          { type: 'speedlines', cx: 0.70, cy: 0.45, count: 14, color: '#7733aa', alpha: 0.35, startFrame: 20, fadeIn: 10 },
        ],
        bubbleX: 0.72,
      },
      {
        // "Veran knows about the variant. She has always known."
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.30, cy: 0.50 },
          { at: 70, zoom: 1.42, cx: 0.28, cy: 0.46 },
        ],
        camShake: [{ at: 55, strength: 2.5, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing:  1 },
          { at: 40, x: 0.26, state: 'hit',  facing:  1 },
          { at: 58, x: 0.26, state: 'idle', facing:  1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk', facing: -1, alpha: 0.70, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.15, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash', color: '#330055', startFrame: 40, duration: 20, alpha: 0.40 },
        ],
        bubbleX: 0.72,
      },
      {
        // "You survive, or she does." — the fragment burning
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.22, cx: 0.50, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',  facing: 1 },
          { at: 50, x: 0.28, state: 'reach', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',  facing: -1, alpha: 0.60, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff6600', alpha: 0.55, fadeIn: 25 },
        ],
      },
    ],
  };

  // ── Chapter 126: The Weight of a Choice ──────────────────────────────────────
  S[126] = {
    bg: 'ruins',
    npcColor: '#4488dd',
    beats: [
      {
        // Player returns. Veran senses something is wrong.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.52 },
          { at: 70, zoom: 1.20, cx: 0.42, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'walk', facing: 1 },
          { at: 40, x: 0.34, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.05 },
          { at: 35, x: 0.68, state: 'talk', facing: -1, alpha: 1.0, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'smoke', cx: 0.50, cy: 0.60, color: '#111122', alpha: 0.25, fadeIn: 30 },
        ],
        bubbleX: 0.68,
      },
      {
        // "That's not what happened." Veran steps forward.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.60, cy: 0.50 },
          { at: 60, zoom: 1.35, cx: 0.66, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'talk', facing: -1, alpha: 1.0, scale: 1.05 },
          { at: 45, x: 0.60, state: 'walk', facing: -1, alpha: 1.0, scale: 1.05 },
          { at: 60, x: 0.58, state: 'talk', facing: -1, alpha: 1.0, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#224488', alpha: 0.30, fadeIn: 30 },
        ],
        bubbleX: 0.66,
      },
      {
        // "There is no variant." — Veran denying it plainly.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.65, cy: 0.48 },
          { at: 80, zoom: 1.48, cx: 0.62, cy: 0.46 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',  facing: 1 },
          { at: 55, x: 0.30, state: 'look',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.58, state: 'talk', facing: -1, alpha: 1.0, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.10, fadeIn: 20 },
        ],
        bubbleX: 0.62,
      },
      {
        // "You raised your weapon." — the figure watching from the ridge.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.38, cy: 0.50 },
          { at: 80, zoom: 1.40, cx: 0.32, cy: 0.48 },
        ],
        camShake: [{ at: 65, strength: 3.5, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle',   facing: 1 },
          { at: 50, x: 0.30, state: 'attack', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.56, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.05 },
          { at: 50, x: 0.56, state: 'guard', facing: -1, alpha: 1.0, scale: 1.05 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc4400', alpha: 0.60, fadeIn: 15 },
          { type: 'speedlines', cx: 0.40, cy: 0.50, count: 22, color: '#cc4400', alpha: 0.50, startFrame: 50, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff4400', startFrame: 65, duration: 22, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.42, cy: 0.58, color: '#cc4400', startFrame: 65, duration: 45 },
          { type: 'impact_sparks', cx: 0.42, cy: 0.52, count: 18, color: '#ffaa44', startFrame: 65, duration: 32 },
        ],
      },
    ],
  };


  // ══════════════════════════════════════════════════════════════════════════
  // COVERAGE PASS — chapters that carried a `narrative` but no staging.
  // These fell back to generic act style, which renders correctly but stages
  // nothing. Beat counts below are the runtime's own parse of each chapter's
  // narrative (blank-line groups, split on narrator-vs-quote); where a chapter
  // has more beats than spec entries the LAST entry holds, so these are sized
  // to the chapter's shape rather than padded out one-to-one.
  // ══════════════════════════════════════════════════════════════════════════

})(window.STORY_SCENE_SPECS);
