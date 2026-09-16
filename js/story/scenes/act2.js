'use strict';
// js/story/scenes/act2.js — cinematic scene specs for act2.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 12 specs — chapter ids: 32, 33, 34, 35, 37, 39, 40, 42, 43, 46, 47, 48

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ── Chapter 32 — Gravity Anomaly ────────────────────────────────────────────
  S[32] = {
    bg: 'fracture',
    npcColor: '#ff8800',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.90, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.05, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.20, state: 'walk', facing: 1 },
          { at: 70, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.75, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8800', alpha: 0.30, fadeIn: 50 },
          { type: 'speedlines', cx: 0.50, cy: 0.30, count: 16, color: '#ff8800', alpha: 0.20, fadeIn: 60 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.15, cx: 0.50, cy: 0.38 },
          { at: 90, zoom: 1.10, cx: 0.50, cy: 0.52 },
        ],
        camShake: [{ at: 45, strength: 8, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 45, x: 0.26, state: 'fall', facing: 1 },
          { at: 70, x: 0.28, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8800', alpha: 0.45, fadeIn: 20 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 20, color: '#ff8800', alpha: 0.30, startFrame: 40, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ff8800', startFrame: 44, duration: 10, alpha: 0.25 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.52 },
          { at: 80, zoom: 1.25, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle', facing: -1, alpha: 0.0 },
          { at: 25, x: 0.72, state: 'walk', facing: -1, alpha: 0.8 },
          { at: 60, x: 0.68, state: 'idle', facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.73, yf: 0.42, height: 0.42, color: '#ff8800', alpha: 0.65, fadeIn: 20 },
          { type: 'fragment_pulse', color: '#ff8800', alpha: 0.40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.62, cy: 0.50 },
          { at: 40, zoom: 1.40, cx: 0.68, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff8800', alpha: 0.55 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // ── Chapter 33 — The Orbital Duel ────────────────────────────────────────────
  S[33] = {
    bg: 'space',
    npcColor: '#9944cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.85, cx: 0.50, cy: 0.50 },
          { at: 110, zoom: 1.00, cx: 0.52, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.16, state: 'walk', facing: 1 },
          { at: 80, x: 0.24, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.78, state: 'idle', facing: -1, alpha: 0.3 },
          { at: 80, x: 0.76, state: 'idle', facing: -1, alpha: 0.9 },
        ],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.50, fadeIn: 50, portals: [
            { xf: 0.78, yf: 0.22, height: 0.55, color: '#9944cc', a: 0.70 },
            { xf: 0.64, yf: 0.35, height: 0.32, color: '#6622aa', a: 0.45 },
          ]},
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.52, cy: 0.50 },
          { at: 90, zoom: 1.30, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.24, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.76, state: 'walk', facing: -1 },
          { at: 55, x: 0.68, state: 'idle', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9944cc', alpha: 0.55, fadeIn: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.62, cy: 0.50 },
          { at: 50, zoom: 1.45, cx: 0.66, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.24, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9944cc', alpha: 0.65 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.66, cy: 0.48 },
          { at: 45, zoom: 1.38, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.24, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9944cc', alpha: 0.50 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.58, cy: 0.50 },
          { at: 35, zoom: 1.60, cx: 0.68, cy: 0.45 },
          { at: 80, zoom: 1.35, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 80, strength: 10, dur: 16 }],
        playerPos: [
          { at: 0,  x: 0.24, state: 'idle',  facing: 1 },
          { at: 80, x: 0.26, state: 'reach', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',  facing: -1 },
          { at: 80, x: 0.66, state: 'guard', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9944cc', alpha: 0.80, fadeIn: 15 },
          { type: 'energy_burst', cx: 0.48, cy: 0.50, color: '#9944cc', startFrame: 75, duration: 22 },
        ],
        effects: [
          { type: 'screen_flash', color: '#9944cc', startFrame: 79, duration: 12, alpha: 0.45 },
        ],
      },
    ],
  };

  // ── Chapter 34 — Echo Storm ──────────────────────────────────────────────────
  S[34] = {
    bg: 'fracture',
    npcColor: '#ff66ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.35, cx: 0.50, cy: 0.44 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.50, fadeIn: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.50, cy: 0.44 },
          { at: 20, zoom: 0.90, cx: 0.50, cy: 0.50 },
          { at: 90, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        camShake: [
          { at: 20, strength: 18, dur: 30 },
          { at: 60, strength: 10, dur: 18 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 20, x: 0.22, state: 'fall', facing: 1 },
          { at: 55, x: 0.26, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.75, fadeIn: 15, portals: [
            { xf: 0.60, yf: 0.20, height: 0.55, color: '#ff66ff', a: 0.80 },
            { xf: 0.78, yf: 0.40, height: 0.38, color: '#cc44ff', a: 0.60 },
            { xf: 0.42, yf: 0.30, height: 0.28, color: '#ff44cc', a: 0.55 },
            { xf: 0.88, yf: 0.25, height: 0.22, color: '#ee55ee', a: 0.45 },
          ]},
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 28, color: '#ff66ff', alpha: 0.65, startFrame: 18, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ff66ff', startFrame: 20, duration: 14, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.60, color: '#ff66ff', startFrame: 20, duration: 40 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 20, color: '#ffaaff', startFrame: 20, duration: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.30, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 20, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ff66ff', alpha: 0.60, fadeIn: 25 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 14, color: '#ff66ff', alpha: 0.30, fadeIn: 30 },
        ],
        bubbleX: 0.26,
      },
    ],
  };

  // ── Chapter 35 — The Core's Eye ──────────────────────────────────────────────
  S[35] = {
    bg: 'space',
    npcColor: '#8844ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.88, cx: 0.50, cy: 0.50 },
          { at: 110, zoom: 1.05, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'walk', facing: 1 },
          { at: 80, x: 0.26, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.45, fadeIn: 50, portals: [
            { xf: 0.58, yf: 0.15, height: 0.70, color: '#8844ff', a: 0.70 },
            { xf: 0.74, yf: 0.38, height: 0.30, color: '#5522cc', a: 0.45 },
          ]},
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.28, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',  facing: -1, alpha: 0.0, scale: 1.15 },
          { at: 22, x: 0.68, state: 'float', facing: -1, alpha: 0.5, scale: 1.15 },
          { at: 55, x: 0.66, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.15 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.68, yf: 0.25, height: 0.65, color: '#8844ff', alpha: 0.80, fadeIn: 18 },
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.55, fadeIn: 40 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.68, cy: 0.48, count: 18, color: '#8844ff', alpha: 0.40, startFrame: 20, fadeIn: 18 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.58, cy: 0.50 },
          { at: 45, zoom: 1.42, cx: 0.64, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1, scale: 1.10 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.60 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.42, cx: 0.64, cy: 0.48 },
          { at: 50, zoom: 1.38, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 30, x: 0.25, state: 'look', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1, scale: 1.10 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.65 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.58, cy: 0.50 },
          { at: 30, zoom: 1.55, cx: 0.66, cy: 0.46 },
          { at: 70, zoom: 1.55, cx: 0.66, cy: 0.46 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1, scale: 1.10 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.80 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.55, cx: 0.66, cy: 0.46 },
          { at: 15, zoom: 1.20, cx: 0.46, cy: 0.50 },
          { at: 55, zoom: 1.30, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 15, strength: 9, dur: 15 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',   facing: 1 },
          { at: 18, x: 0.32, state: 'reach',  facing: 1 },
          { at: 45, x: 0.35, state: 'attack', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.66, state: 'idle',  facing: -1, scale: 1.10 },
          { at: 20, x: 0.64, state: 'guard', facing: -1, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.85, fadeIn: 12 },
          { type: 'energy_burst', cx: 0.35, cy: 0.50, color: '#4488ff', startFrame: 42, duration: 28 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#8844ff', startFrame: 15, duration: 10, alpha: 0.40 },
          { type: 'shockwave',     cx: 0.40, cy: 0.62, color: '#4488ff', startFrame: 42, duration: 32 },
          { type: 'impact_sparks', cx: 0.40, cy: 0.52, count: 14, color: '#aa88ff', startFrame: 42, duration: 28 },
        ],
      },
    ],
  };

  // ── Chapter 37 — Resonance Spike ────────────────────────────────────────────
  S[37] = {
    bg: 'fracture',
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.22, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.40, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.30, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',  facing: -1, alpha: 0.0 },
          { at: 20, x: 0.68, state: 'float', facing: -1, alpha: 0.7 },
          { at: 50, x: 0.66, state: 'idle',  facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.68, yf: 0.30, height: 0.55, color: '#cc44ff', alpha: 0.65, fadeIn: 18 },
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.50, fadeIn: 30 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.62, cy: 0.50 },
          { at: 30, zoom: 1.40, cx: 0.38, cy: 0.50 },
          { at: 70, zoom: 1.32, cx: 0.44, cy: 0.50 },
        ],
        camShake: [{ at: 30, strength: 12, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 30, x: 0.24, state: 'hit',  facing: 1 },
          { at: 55, x: 0.26, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.90, fadeIn: 10 },
          { type: 'speedlines', cx: 0.26, cy: 0.50, count: 24, color: '#cc44ff', alpha: 0.70, startFrame: 28, fadeIn: 6 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ffffff', startFrame: 30, duration: 18, alpha: 0.70 },
          { type: 'energy_burst', cx: 0.26, cy: 0.50, color: '#cc44ff', startFrame: 30, duration: 30 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.32, cx: 0.44, cy: 0.50 },
          { at: 70, zoom: 1.20, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle', facing: -1, alpha: 0.0 },
          { at: 25, x: 0.72, state: 'walk', facing: -1, alpha: 0.7 },
          { at: 55, x: 0.66, state: 'idle', facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.73, yf: 0.38, height: 0.44, color: '#cc44ff', alpha: 0.70, fadeIn: 20 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.32, cx: 0.56, cy: 0.50 },
          { at: 70, zoom: 1.20, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'guard', facing: 1 },
          { at: 65, x: 0.30, state: 'reach', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.66, state: 'idle',  facing: -1 },
          { at: 65, x: 0.64, state: 'guard', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.75, fadeIn: 20 },
          { type: 'speedlines', cx: 0.50, cy: 0.48, count: 16, color: '#cc44ff', alpha: 0.45, startFrame: 60, fadeIn: 10 },
        ],
        bubbleX: 0.72,
      },
    ],
  };

  // ── Chapter 39 — Into the Green (exploration with narrative) ─────────────────
  S[39] = {
    bg: 'forest',
    npcColor: '#88aaff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.88, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.05, cx: 0.44, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'walk', facing: 1 },
          { at: 80, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'smoke', cx: 0.50, cy: 0.30, color: '#334422', alpha: 0.35, fadeIn: 40 },
          { type: 'speedlines', cx: 0.50, cy: 0.35, count: 12, color: '#446633', alpha: 0.20, fadeIn: 60 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.44, cy: 0.50 },
          { at: 55, zoom: 1.20, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 30, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'smoke', cx: 0.62, cy: 0.35, color: '#334422', alpha: 0.45, fadeIn: 25 },
        ],
        bubbleX: 0.28,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.38, cy: 0.50 },
          { at: 50, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'smoke', cx: 0.50, cy: 0.30, color: '#446633', alpha: 0.55, fadeIn: 20 },
          { type: 'fragment_pulse', color: '#33aa44', alpha: 0.25, fadeIn: 35 },
        ],
        bubbleX: 0.28,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.22, cx: 0.64, cy: 0.44 },
          { at: 90, zoom: 1.15, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 45, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'smoke', cx: 0.60, cy: 0.28, color: '#887766', alpha: 0.40, fadeIn: 30 },
          { type: 'smoke', cx: 0.34, cy: 0.40, color: '#776655', alpha: 0.30, fadeIn: 45 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.58, cy: 0.50 },
          { at: 70, zoom: 1.05, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 20, x: 0.32, state: 'walk', facing: 1 },
          { at: 70, x: 0.40, state: 'run',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'speedlines', cx: 0.44, cy: 0.52, count: 14, color: '#446633', alpha: 0.40, startFrame: 65, fadeIn: 8 },
        ],
      },
    ],
  };

  // ── Chapter 40 — The Second Architect ────────────────────────────────────────
  S[40] = {
    bg: 'forest',
    npcColor: '#33aa44',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.22, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.20, state: 'walk', facing: 1 },
          { at: 65, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0.8 }],
        effectsBehind: [
          { type: 'smoke', cx: 0.60, cy: 0.32, color: '#224411', alpha: 0.45, fadeIn: 35 },
          { type: 'fragment_pulse', color: '#33aa44', alpha: 0.30, fadeIn: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.60, cy: 0.50 },
          { at: 45, zoom: 1.38, cx: 0.64, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#33aa44', alpha: 0.45 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.64, cy: 0.48 },
          { at: 40, zoom: 1.30, cx: 0.56, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.56, cy: 0.50 },
          { at: 35, zoom: 1.42, cx: 0.62, cy: 0.50 },
          { at: 80, zoom: 1.35, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 45, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#33aa44', alpha: 0.40 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.58, cy: 0.50 },
          { at: 15, zoom: 1.55, cx: 0.32, cy: 0.52 },
          { at: 60, zoom: 1.35, cx: 0.48, cy: 0.50 },
        ],
        camShake: [{ at: 15, strength: 7, dur: 14 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 15, x: 0.28, state: 'hit',  facing: 1 },
          { at: 40, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.75, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash', color: '#4488ff', startFrame: 15, duration: 10, alpha: 0.35 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.48, cy: 0.50 },
          { at: 20, zoom: 1.15, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.22, cx: 0.54, cy: 0.50 },
        ],
        camShake: [{ at: 20, strength: 9, dur: 15 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',  facing: 1 },
          { at: 22, x: 0.30, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',   facing: -1 },
          { at: 18, x: 0.64, state: 'attack', facing: -1 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.54, cy: 0.50, count: 18, color: '#33aa44', alpha: 0.55, startFrame: 18, fadeIn: 8 },
          { type: 'fragment_pulse', color: '#33aa44', alpha: 0.60, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash', color: '#33aa44', startFrame: 18, duration: 10, alpha: 0.35 },
          { type: 'shockwave',    cx: 0.54, cy: 0.65, color: '#33aa44', startFrame: 20, duration: 28 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // ── Chapter 42 — The Ice Dimension ──────────────────────────────────────────
  S[42] = {
    bg: 'ice',
    npcColor: '#4488cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.90, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.08, cx: 0.46, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'walk', facing: 1 },
          { at: 75, x: 0.26, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.35, count: 10, color: '#88ccff', alpha: 0.25, fadeIn: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.08, cx: 0.46, cy: 0.50 },
          { at: 70,  zoom: 1.20, cx: 0.66, cy: 0.50 },
          { at: 110, zoom: 1.15, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.38, count: 8, color: '#88ccff', alpha: 0.20, fadeIn: 60 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.58, cy: 0.50 },
          { at: 65, zoom: 1.25, cx: 0.68, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488cc', alpha: 0.30, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.68, cy: 0.50 },
          { at: 45, zoom: 1.35, cx: 0.62, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',  facing: -1, alpha: 0.0 },
          { at: 22, x: 0.68, state: 'float', facing: -1, alpha: 0.5 },
          { at: 50, x: 0.66, state: 'idle',  facing: -1, alpha: 0.7 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488cc', alpha: 0.45, fadeIn: 20 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.62, cy: 0.48 },
          { at: 50, zoom: 1.42, cx: 0.66, cy: 0.46 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1, alpha: 0.80 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488cc', alpha: 0.50 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.42, cx: 0.66, cy: 0.46 },
          { at: 25, zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.18, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 25, strength: 11, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 28, x: 0.24, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.66, state: 'idle', facing: -1, alpha: 0.80 },
          { at: 28, x: 0.68, state: 'walk', facing: -1, alpha: 0.0 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 20, color: '#4488cc', alpha: 0.50, startFrame: 22, fadeIn: 8 },
          { type: 'fragment_pulse', color: '#4488cc', alpha: 0.55, fadeIn: 20 },
        ],
        effects: [
          { type: 'screen_flash', color: '#4488cc', startFrame: 24, duration: 12, alpha: 0.40 },
          { type: 'shockwave',    cx: 0.50, cy: 0.65, color: '#88ccff', startFrame: 24, duration: 32 },
        ],
      },
    ],
  };

  // ── Chapter 43 — The Pessimist ──────────────────────────────────────────────
  S[43] = {
    bg: 'ice',
    npcColor: '#2266bb',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.92, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.12, cx: 0.54, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.20, state: 'walk', facing: 1 },
          { at: 80, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.74, state: 'idle', facing: -1, alpha: 0.9 }],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.32, count: 10, color: '#88ccff', alpha: 0.22, fadeIn: 60 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.54, cy: 0.50 },
          { at: 50, zoom: 1.32, cx: 0.66, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.35, fadeIn: 35 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.32, cx: 0.66, cy: 0.48 },
          { at: 40, zoom: 1.40, cx: 0.64, cy: 0.46 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'talk', facing: -1 }],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.64, cy: 0.46 },
          { at: 20, zoom: 1.50, cx: 0.66, cy: 0.44 },
          { at: 60, zoom: 1.40, cx: 0.64, cy: 0.46 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk', facing: -1 },
          { at: 20, x: 0.70, state: 'idle', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.45, fadeIn: 18 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.50, cx: 0.66, cy: 0.44 },
          { at: 55, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.40, count: 8, color: '#2266bb', alpha: 0.20, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.30, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1 },
          { at: 25, x: 0.68, state: 'talk', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.55, fadeIn: 22 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.62, cy: 0.50 },
          { at: 40, zoom: 1.20, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 30, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.60, fadeIn: 25 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 20, zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.18, cx: 0.52, cy: 0.50 },
        ],
        camShake: [{ at: 20, strength: 10, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 22, x: 0.30, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',   facing: -1 },
          { at: 18, x: 0.62, state: 'attack', facing: -1 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 20, color: '#2266bb', alpha: 0.55, startFrame: 18, fadeIn: 8 },
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.65, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#2266bb', startFrame: 20, duration: 12, alpha: 0.40 },
          { type: 'shockwave',     cx: 0.50, cy: 0.62, color: '#88ccff', startFrame: 20, duration: 30 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.52, count: 12, color: '#aaddff', startFrame: 20, duration: 24 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // ── Chapter 46 — What the Ancients Left (exploration with narrative) ──────────
  S[46] = {
    bg: 'ruins',
    npcColor: '#887766',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.85, cx: 0.50, cy: 0.50 },
          { at: 110, zoom: 1.02, cx: 0.44, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'walk', facing: 1 },
          { at: 85, x: 0.26, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_cracks', alpha: 0.60, fadeIn: 40 },
          { type: 'smoke', cx: 0.60, cy: 0.28, color: '#443322', alpha: 0.55, fadeIn: 30 },
          { type: 'smoke', cx: 0.32, cy: 0.40, color: '#554433', alpha: 0.40, fadeIn: 45 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.02, cx: 0.44, cy: 0.50 },
          { at: 55,  zoom: 1.15, cx: 0.50, cy: 0.35 },
          { at: 100, zoom: 1.08, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 35, x: 0.26, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_cracks', alpha: 0.75, fadeIn: 20 },
          { type: 'smoke', cx: 0.50, cy: 0.25, color: '#554433', alpha: 0.50, fadeIn: 25 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.08, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.22, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_cracks', alpha: 0.55 },
          { type: 'smoke', cx: 0.65, cy: 0.32, color: '#443322', alpha: 0.45, fadeIn: 35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.62, cy: 0.50 },
          { at: 40, zoom: 1.32, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 25, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.65, fadeIn: 20 },
          { type: 'speedlines', cx: 0.28, cy: 0.50, count: 12, color: '#8844ff', alpha: 0.35, startFrame: 22, fadeIn: 12 },
        ],
        bubbleX: 0.28,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.32, cx: 0.38, cy: 0.50 },
          { at: 65, zoom: 1.05, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 22, x: 0.32, state: 'walk', facing: 1 },
          { at: 65, x: 0.42, state: 'run',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'smoke', cx: 0.55, cy: 0.35, color: '#443322', alpha: 0.50, fadeIn: 25 },
          { type: 'speedlines', cx: 0.45, cy: 0.52, count: 14, color: '#776655', alpha: 0.35, startFrame: 60, fadeIn: 8 },
        ],
      },
    ],
  };

  // ── Chapter 47 — The Last Army ──────────────────────────────────────────────
  S[47] = {
    bg: 'ruins',
    npcColor: '#aa00ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.28, cx: 0.50, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_cracks', alpha: 0.50, fadeIn: 40 },
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.35, fadeIn: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.50, cy: 0.48 },
          { at: 45, zoom: 1.40, cx: 0.36, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 30, x: 0.25, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.55, fadeIn: 25 },
        ],
        bubbleX: 0.26,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.36, cy: 0.50 },
          { at: 55, zoom: 1.30, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.78, state: 'idle',  facing: -1, alpha: 0.0 },
          { at: 18, x: 0.70, state: 'float', facing: -1, alpha: 0.6, scale: 1.10 },
          { at: 45, x: 0.68, state: 'idle',  facing: -1, alpha: 0.9, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.70, yf: 0.25, height: 0.60, color: '#8844ff', alpha: 0.65, fadeIn: 15 },
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.60, fadeIn: 20 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.40, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1, scale: 1.10 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#aa00ff', alpha: 0.70 },
          { type: 'sky_cracks', alpha: 0.60, fadeIn: 25 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.62, cy: 0.50 },
          { at: 20, zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.15, cx: 0.50, cy: 0.50 },
        ],
        camShake: [
          { at: 20, strength: 16, dur: 28 },
          { at: 55, strength:  8, dur: 14 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 22, x: 0.24, state: 'fall',  facing: 1 },
          { at: 50, x: 0.26, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, scale: 1.10 },
          { at: 22, x: 0.68, state: 'idle', facing: -1, alpha: 0.0 },
        ],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.80, fadeIn: 15, portals: [
            { xf: 0.72, yf: 0.22, height: 0.55, color: '#aa00ff', a: 0.85 },
            { xf: 0.58, yf: 0.38, height: 0.38, color: '#8800cc', a: 0.60 },
            { xf: 0.84, yf: 0.32, height: 0.28, color: '#cc00ff', a: 0.50 },
          ]},
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 26, color: '#aa00ff', alpha: 0.60, startFrame: 18, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#aa00ff', startFrame: 20, duration: 14, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.50, cy: 0.60, color: '#aa00ff', startFrame: 20, duration: 38 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 18, color: '#cc88ff', startFrame: 20, duration: 30 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // ── Chapter 48 — The Herald of Nothing ──────────────────────────────────────
  S[48] = {
    bg: 'ruins',
    npcColor: '#ffffff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.92, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'walk', facing: 1 },
          { at: 80, x: 0.26, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.74, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 40 },
          { type: 'smoke', cx: 0.60, cy: 0.30, color: '#332222', alpha: 0.45, fadeIn: 35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.28, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle', facing: -1, alpha: 0.0 },
          { at: 20, x: 0.72, state: 'walk', facing: -1, alpha: 0.8 },
          { at: 55, x: 0.68, state: 'idle', facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'smoke', cx: 0.68, cy: 0.30, color: '#332222', alpha: 0.40, fadeIn: 18 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.60, cy: 0.50 },
          { at: 45, zoom: 1.42, cx: 0.66, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ffffff', alpha: 0.35, fadeIn: 30 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.42, cx: 0.66, cy: 0.48 },
          { at: 25, zoom: 1.60, cx: 0.68, cy: 0.44 },
          { at: 70, zoom: 1.42, cx: 0.64, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 30, x: 0.25, state: 'look', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ffffff', alpha: 0.50, fadeIn: 20 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.42, cx: 0.64, cy: 0.48 },
          { at: 18, zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 65, zoom: 1.18, cx: 0.52, cy: 0.50 },
        ],
        camShake: [{ at: 18, strength: 12, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',   facing: 1 },
          { at: 20, x: 0.28, state: 'guard',  facing: 1 },
          { at: 50, x: 0.32, state: 'attack', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',   facing: -1 },
          { at: 18, x: 0.62, state: 'attack', facing: -1 },
          { at: 50, x: 0.60, state: 'guard',  facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.80, fadeIn: 12 },
          { type: 'speedlines', cx: 0.46, cy: 0.50, count: 22, color: '#ffffff', alpha: 0.55, startFrame: 16, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ffffff', startFrame: 18, duration: 14, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.46, cy: 0.62, color: '#ffffff', startFrame: 18, duration: 35 },
          { type: 'impact_sparks', cx: 0.46, cy: 0.52, count: 16, color: '#ffeeee', startFrame: 18, duration: 28 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
